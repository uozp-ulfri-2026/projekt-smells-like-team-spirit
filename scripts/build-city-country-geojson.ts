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
	display_name?: string;
	lat?: string;
	lon?: string;
	addresstype?: string;
	city?: string;
	country?: string;
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

const COUNTRY_NAME_TO_ENGLISH: Record<string, string> = {
	Afganistan: "Afghanistan",
	Albanija: "Albania",
	Alžirija: "Algeria",
	Andora: "Andorra",
	Argentina: "Argentina",
	Armenija: "Armenia",
	Avstralija: "Australia",
	Avstrija: "Austria",
	Belgija: "Belgium",
	"Bosna in Hercegovina": "Bosnia and Herzegovina",
	Brazilija: "Brazil",
	Bolgarija: "Bulgaria",
	Kanada: "Canada",
	Češka: "Czechia",
	Danska: "Denmark",
	Egipt: "Egypt",
	Estonija: "Estonia",
	Finska: "Finland",
	Francija: "France",
	Nemčija: "Germany",
	Grčija: "Greece",
	Madžarska: "Hungary",
	Islandija: "Iceland",
	Indija: "India",
	Indonezija: "Indonesia",
	Iran: "Iran",
	Irak: "Iraq",
	Irska: "Ireland",
	Izrael: "Israel",
	Italija: "Italy",
	Japonska: "Japan",
	Jordanija: "Jordan",
	Kazahstan: "Kazakhstan",
	Kenija: "Kenya",
	Kosovo: "Kosovo",
	Katar: "Qatar",
	Kirgizistan: "Kyrgyzstan",
	Latvija: "Latvia",
	Litva: "Lithuania",
	Luksemburg: "Luxembourg",
	Malta: "Malta",
	Moldavija: "Moldova",
	Monako: "Monaco",
	"Črna gora": "Montenegro",
	Maroko: "Morocco",
	Nizozemska: "Netherlands",
	"Nova Zelandija": "New Zealand",
	Norveška: "Norway",
	Pakistan: "Pakistan",
	Palestina: "Palestine",
	Peru: "Peru",
	Poljska: "Poland",
	Portugalska: "Portugal",
	Romunija: "Romania",
	Ruanda: "Rwanda",
	Rusija: "Russia",
	"Saudova Arabija": "Saudi Arabia",
	Senegal: "Senegal",
	Srbija: "Serbia",
	Singapur: "Singapore",
	Slovaška: "Slovakia",
	Slovenija: "Slovenia",
	Somalija: "Somalia",
	Španija: "Spain",
	Švedska: "Sweden",
	Švica: "Switzerland",
	Sirija: "Syria",
	Tajska: "Thailand",
	Tunizija: "Tunisia",
	Turčija: "Turkey",
	Ukrajina: "Ukraine",
	"Združeni arabski emirati": "United Arab Emirates",
	"Združeno kraljestvo": "United Kingdom",
	"Združene države Amerike": "United States of America",
	Urugvaj: "Uruguay",
	Venezuela: "Venezuela",
	Vietnam: "Vietnam",
	Zimbabve: "Zimbabwe",
};

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

function getDisplayCountry(displayName: string | undefined): string | null {
	const normalized = normalizeText(displayName);
	if (!normalized) return null;

	const parts = normalized
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	return parts.at(-1) ?? null;
}

function toEnglishCountryName(country: string | null): string | null {
	if (!country) return null;
	return COUNTRY_NAME_TO_ENGLISH[country] ?? country;
}

function getFeatureLabels(result: NominatimResult): {
	city: string;
	country: string;
} {
	// If addresstype is "city", use result.city and result.country directly
	if (result.addresstype === "city") {
		const city = normalizeText(result.city) ?? "Unknown";
		const country = normalizeText(result.country) ?? "Unknown";
		return { city, country };
	}

	// Fallback to name and display_name
	const rawCity = normalizeText(result.name) ?? "Unknown";
	const city = COUNTRY_NAME_TO_ENGLISH[rawCity] ?? rawCity;
	const country =
		toEnglishCountryName(getDisplayCountry(result.display_name)) ?? "Unknown";

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
	const [mmcInputArg, nominatimInputArg, outputArg] = process.argv.slice(2);

	if (!mmcInputArg || !nominatimInputArg || !outputArg) {
		console.error(
			[
				"Usage:",
				"  bun scripts/build-city-country-geojson.ts <mmc-llm.json> <nominatim.json> <output.geojson>",
				"",
				"Example:",
				"  bun scripts/build-city-country-geojson.ts assets/mmc-llm.json assets/mmc-city-country-nominatim.json assets/output.geojson",
			].join("\n"),
		);
		process.exit(1);
	}

	const mmcPath = resolvePath(mmcInputArg);
	const nominatimPath = resolvePath(nominatimInputArg);
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
	const totalArticles = features.reduce((sum, f) => sum + f.properties.ids.length, 0);
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
