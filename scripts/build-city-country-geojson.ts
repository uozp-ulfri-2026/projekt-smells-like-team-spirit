import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

type LlmLocation = {
	city?: string | null;
	country?: string | null;
};

type MmcArticle = {
	_id?: string;
	llm?: LlmLocation;
};

type NominatimResult = {
	name?: string;
	lat?: string;
	lon?: string;
	addresstype?: string;
	address?: {
		city?: string;
		town?: string;
		village?: string;
		municipality?: string;
		country?: string;
	};
};

type NominatimLookup = {
	pair_query?: {
		results?: NominatimResult[];
	};
	just_city?: {
		results?: NominatimResult[];
	};
};

type GeoJsonFeature = {
	type: "Feature";
	geometry: {
		type: "Point";
		coordinates: [number, number];
	};
	properties: {
		city: string;
		country: string;
		ids: string[];
	};
};

type GeoJsonFeatureCollection = {
	type: "FeatureCollection";
	features: GeoJsonFeature[];
};

type LookupEntry = {
	result: NominatimResult;
};

type AggregateEntry = {
	city: string;
	country: string;
	ids: string[];
	result: NominatimResult;
};

const scriptDir = import.meta.dir;

const DEFAULT_MMC_INPUT = "assets/mmc-llm.json";
const DEFAULT_NOMINATIM_INPUT = "assets/mmc-city-country-nominatim-joined.json";
const DEFAULT_OUTPUT = "assets/output.geojson";

function resolvePath(inputPath: string): string {
	if (isAbsolute(inputPath)) {
		if (/^[\\/]/.test(inputPath) && !/^[a-zA-Z]:[\\/]/.test(inputPath)) {
			return join(scriptDir, "..", inputPath.slice(1));
		}

		return inputPath;
	}

	return join(scriptDir, "..", inputPath);
}

function normalizeText(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function getPairKey(city: string, country: string): string {
	return `${city}\u0000${country}`;
}

function getFirstResult(lookup: NominatimLookup): NominatimResult | null {
	return (
		lookup.pair_query?.results?.[0] ?? lookup.just_city?.results?.[0] ?? null
	);
}

function getFeatureLabels(result: NominatimResult): {
	city: string;
	country: string;
} {
	const address = result.address;
	const city =
		normalizeText(address?.city) ??
		normalizeText(address?.town) ??
		normalizeText(address?.village) ??
		normalizeText(address?.municipality) ??
		normalizeText(result.name) ??
		"Unknown";
	const country = normalizeText(address?.country) ?? "Unknown";

	return { city, country };
}

function toCoordinatePair(
	result: NominatimResult,
	label: string,
): [number, number] {
	const lon = Number(result.lon);
	const lat = Number(result.lat);

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
		throw new Error(
			`Nominatim result for ${label} is missing valid lat/lon values.`,
		);
	}

	return [lon, lat];
}

async function readJson<T>(filePath: string): Promise<T> {
	return (await Bun.file(filePath).json()) as T;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.includes("--help")) {
		console.error(
			[
				"Usage:",
				"  bun scripts/build-city-country-geojson.ts [mmc-llm.json] [output.geojson]",
				"",
				"Example:",
				`  bun scripts/build-city-country-geojson.ts ${DEFAULT_MMC_INPUT} ${DEFAULT_OUTPUT}`,
				"",
				`Nominatim lookups are always loaded from ${DEFAULT_NOMINATIM_INPUT}.`,
			].join("\n"),
		);
		process.exit(1);
	}

	let mmcInputArg = DEFAULT_MMC_INPUT;
	let outputArg = DEFAULT_OUTPUT;

	if (args.length === 1) {
		outputArg = args[0] ?? DEFAULT_OUTPUT;
	} else if (args.length === 2) {
		mmcInputArg = args[0] ?? DEFAULT_MMC_INPUT;
		outputArg = args[1] ?? DEFAULT_OUTPUT;
	} else if (args.length >= 3) {
		mmcInputArg = args[0] ?? DEFAULT_MMC_INPUT;
		outputArg = args[2] ?? DEFAULT_OUTPUT;
	}

	const mmcPath = resolvePath(mmcInputArg);
	const nominatimPath = resolvePath(DEFAULT_NOMINATIM_INPUT);
	const outputPath = resolvePath(outputArg);

	console.log("📥 Loading MMC articles...");
	const mmcRows = (await readJson<MmcArticle[]>(mmcPath)).filter(
		(article): article is MmcArticle & { llm: LlmLocation } => {
			return (
				typeof article.llm === "object" &&
				article.llm !== null &&
				typeof article.llm.city === "string" &&
				article.llm.city.trim().length > 0 &&
				typeof article.llm.country === "string" &&
				article.llm.country.trim().length > 0
			);
		},
	);

	console.log("📥 Loading Nominatim lookups...");
	const nominatimRows =
		await readJson<
			Array<{ city?: string; country?: string } & NominatimLookup>
		>(nominatimPath);

	const lookupByQueryPair = new Map<string, LookupEntry>();
	let missingLookupRows = 0;

	for (const [index, row] of nominatimRows.entries()) {
		const queryCity = normalizeText(row.city);
		const queryCountry = normalizeText(row.country);

		if (!queryCity || !queryCountry) {
			console.warn(
				`⚠️ Nominatim row ${index} is missing a city or country. Skipping.`,
			);
			missingLookupRows += 1;
			continue;
		}

		const result = getFirstResult(row);
		if (!result) {
			console.warn(
				`⚠️ Nominatim row for ${queryCity}, ${queryCountry} has no usable results. Skipping.`,
			);
			missingLookupRows += 1;
			continue;
		}

		lookupByQueryPair.set(getPairKey(queryCity, queryCountry), { result });
	}

	const aggregated = new Map<string, AggregateEntry>();
	let skippedMmcRows = 0;

	for (const [index, article] of mmcRows.entries()) {
		const queryCity = normalizeText(article.llm.city);
		const queryCountry = normalizeText(article.llm.country);

		if (!queryCity || !queryCountry) {
			console.warn(
				`⚠️ MMC row ${index} is missing llm.city or llm.country. Skipping.`,
			);
			skippedMmcRows += 1;
			continue;
		}

		const lookupEntry = lookupByQueryPair.get(
			getPairKey(queryCity, queryCountry),
		);
		if (!lookupEntry) {
			console.warn(
				`⚠️ No Nominatim result for ${queryCity}, ${queryCountry}. Skipping.`,
			);
			skippedMmcRows += 1;
			continue;
		}

		const labels = getFeatureLabels(lookupEntry.result);
		if (labels.country === "Unknown") {
			console.warn(
				`⚠️ Nominatim result for ${queryCity}, ${queryCountry} is missing address.country. Skipping.`,
			);
			skippedMmcRows += 1;
			continue;
		}

		const aggregateKey = getPairKey(labels.city, labels.country);
		const existing = aggregated.get(aggregateKey);

		if (existing) {
			if (article._id) {
				existing.ids.push(article._id);
			}
			continue;
		}

		aggregated.set(aggregateKey, {
			city: labels.city,
			country: labels.country,
			ids: article._id ? [article._id] : [],
			result: lookupEntry.result,
		});
	}

	const features: GeoJsonFeature[] = [...aggregated.values()].map((entry) => {
		const coordinates = toCoordinatePair(
			entry.result,
			`${entry.city}, ${entry.country}`,
		);

		return {
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates,
			},
			properties: {
				city: entry.city,
				country: entry.country,
				ids: entry.ids,
			},
		};
	});

	const geojson: GeoJsonFeatureCollection = {
		type: "FeatureCollection",
		features,
	};

	mkdirSync(dirname(outputPath), { recursive: true });
	await Bun.write(outputPath, `${JSON.stringify(geojson, null, 2)}\n`);

	console.log(`✅ Wrote ${features.length} GeoJSON features to ${outputPath}`);
	const totalArticles = features.reduce(
		(sum, f) => sum + f.properties.ids.length,
		0,
	);
	console.log(
		`ℹ️ Included ${totalArticles} articles total. Skipped ${skippedMmcRows} MMC rows and ${missingLookupRows} Nominatim rows.`,
	);
}

main().catch((error) => {
	console.error(
		"❌ Failed to build GeoJSON:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
