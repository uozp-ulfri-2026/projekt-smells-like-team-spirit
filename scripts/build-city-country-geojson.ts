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
	lat?: string;
	lon?: string;
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
		count: number;
	};
};

type GeoJsonFeatureCollection = {
	type: "FeatureCollection";
	features: GeoJsonFeature[];
};

type LookupSource = "pair_query" | "just_city";

const scriptDir = import.meta.dir;

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

function getLookupResult(
	lookup: NominatimLookup,
): { source: LookupSource; result: NominatimResult } | null {
	const pairResult = lookup.pair_query?.results?.[0];
	if (pairResult) {
		return { source: "pair_query", result: pairResult };
	}

	const cityResult = lookup.just_city?.results?.[0];
	if (cityResult) {
		return { source: "just_city", result: cityResult };
	}

	return null;
}

function toCoordinatePair(
	result: NominatimResult,
	pairLabel: string,
): [number, number] {
	const lon = Number(result.lon);
	const lat = Number(result.lat);

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
		throw new Error(
			`Nominatim result for ${pairLabel} is missing valid lat/lon values.`,
		);
	}

	return [lon, lat];
}

async function readJson<T>(filePath: string): Promise<T> {
	return (await Bun.file(filePath).json()) as T;
}

async function main(): Promise<void> {
	const [mmcInputArg, nominatimInputArg, outputArg] = process.argv.slice(2);

	if (!mmcInputArg || !nominatimInputArg || !outputArg) {
		console.error(
			[
				"Usage:",
				"  bun scripts/build-city-country-geojson.ts <mmc-llm.json> <nominatim.json> <output.geojson>",
				"",
				"Example:",
				"  bun scripts/build-city-country-geojson.ts assets/mmc-llm.json assets/mmc-city-country-nominatim.json assets/mmc-city-country.geojson",
			].join("\n"),
		);
		process.exit(1);
	}

	const mmcPath = resolvePath(mmcInputArg);
	const nominatimPath = resolvePath(nominatimInputArg);
	const outputPath = resolvePath(outputArg);

	console.log("📥 Loading MMC articles...");
	const mmcRows = (await readJson<MmcArticle[]>(mmcPath)).filter(
		(article): article is MmcArticle & { llm: LlmLocation } =>
			typeof article.llm === "object" &&
			article.llm !== null &&
			typeof article.llm.city === "string" &&
			article.llm.city.trim().length > 0 &&
			typeof article.llm.country === "string" &&
			article.llm.country.trim().length > 0,
	);

	console.log("📥 Loading Nominatim lookups...");
	const nominatimRows =
		await readJson<
			Array<{ city?: string; country?: string } & NominatimLookup>
		>(nominatimPath);

	const lookupByPair = new Map<
		string,
		{ source: LookupSource; result: NominatimResult }
	>();
	for (const [index, row] of nominatimRows.entries()) {
		const city = normalizeText(row.city);
		const country = normalizeText(row.country);
		if (!city || !country) {
			throw new Error(
				`Nominatim entry at index ${index} is missing a city or country.`,
			);
		}

		const lookup = getLookupResult(row);
		if (!lookup) {
			// throw new Error(`Nominatim entry for ${city}, ${country} has no usable lookup results.`);
			console.warn(
				`⚠️ Nominatim entry for ${city}, ${country} has no usable lookup results. Skipping.`,
			);
			continue;
		}

		lookupByPair.set(getPairKey(city, country), lookup);
	}

	const aggregated = new Map<
		string,
		{
			city: string;
			country: string;
			count: number;
			lookup: { source: LookupSource; result: NominatimResult };
		}
	>();

	for (const [index, article] of mmcRows.entries()) {
		const city = normalizeText(article.llm.city);
		const country = normalizeText(article.llm.country);

		if (!city || !country) {
			throw new Error(
				`MMC entry at index ${index} is missing llm.city or llm.country.`,
			);
		}

		const key = getPairKey(city, country);
		const lookup = lookupByPair.get(key);
		if (!lookup) {
			// throw new Error(`No Nominatim lookup found for ${city}, ${country}.`);
			console.warn(
				`⚠️ No Nominatim lookup found for ${city}, ${country}. Skipping.`,
			);
			continue;
		}

		const existing = aggregated.get(key);
		if (existing) {
			existing.count += 1;
			continue;
		}

		aggregated.set(key, {
			city,
			country,
			count: 1,
			lookup,
		});
	}

	const features: GeoJsonFeature[] = [...aggregated.values()].map((entry) => {
		const coordinates = toCoordinatePair(
			entry.lookup.result,
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
				count: entry.count,
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
}

// bun run .\scripts\build-city-country-geojson.ts .\assets\mmc-llm.json .\assets\mmc-city-country-nominatim.json .\assets\output.geojson
main().catch((error) => {
	console.error(
		"❌ Failed to build GeoJSON:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
