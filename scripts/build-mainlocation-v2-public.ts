import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

type SourceArticle = {
	_id?: unknown;
	url?: unknown;
	date?: unknown;
	title?: unknown;
	lead?: unknown;
	llm?: {
		topic?: unknown;
		country?: unknown;
		city?: unknown;
	};
	location_model?: {
		country?: unknown;
		city?: unknown;
	};
	theme_model?: {
		theme?: unknown;
	};
};

type LeanArticle = {
	_id: string;
	url?: string;
	date?: string;
	"llm-topic"?: string;
	title?: string;
	lead?: string;
};

type GeoJsonPointFeature = {
	type: "Feature";
	geometry: {
		type: "Point";
		coordinates: [number, number];
	};
	properties: {
		city?: unknown;
		country?: unknown;
		ids?: unknown;
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

type CountMap = Map<string, number>;

const scriptDir = import.meta.dir;

const DEFAULT_SOURCE_INPUT =
	"assets/mmc.mainlocation.v2.lean.themed.predicted.json";
const DEFAULT_LEAN_OUTPUT = "public/mmc-lean.json";
const DEFAULT_GEOJSON_OUTPUT = "public/output.geojson";
const DEFAULT_COORDINATE_INDEX = "assets/mmc-coordinate-index.geojson";
const DEFAULT_LEGACY_INPUT = "assets/mmc-llm.json";

const TOPIC_SL_MAP: Record<string, string> = {
	DRUGO: "DRUGO",
	GASTRONOMIJA: "GASTRONOMIJA",
	GOSPODARSTVO: "GOSPODARSTVO",
	KRIMINAL: "KRIMINAL",
	KULTURA: "KULTURA",
	NARAVNE_NESRECE: "NARAVNE NESREČE",
	OKOLJE: "OKOLJE",
	POLITIKA: "POLITIKA",
	PROMETNE_NESRECE: "PROMETNE NESREČE",
	SPORT: "ŠPORT",
	TEHNOLOGIJA: "TEHNOLOGIJA",
	TURIZEM: "TURIZEM",
	VOJNA_IN_KONFLIKTI: "VOJNA IN KONFLIKTI",
	ZABAVA: "ZABAVA",
	ZDRAVJE: "ZDRAVJE",
};

const MANUAL_COUNTRY_MAP: Record<string, string> = {
	"Ivory Coast": "Côte d'Ivoire",
	"Republic of the Congo": "Congo-Brazzaville",
	Vatikan: "Vatican City",
	Nikaragva: "Nicaragua",
	Sejšeli: "Seychelles",
};

const MANUAL_CITY_MAP: Record<string, string> = {
	"denmark|kopenhagen": "Copenhagen",
	"vatican city|vatikan": "Vatican City",
};

function resolvePath(inputPath: string): string {
	if (isAbsolute(inputPath)) return inputPath;
	return join(scriptDir, "..", inputPath);
}

function asOptionalString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTopicKey(value: string): string {
	return value
		.trim()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, "_")
		.toUpperCase();
}

function mapTopicToSlovenian(topic: unknown): string | undefined {
	const str = asOptionalString(topic);
	if (!str) return undefined;

	const normalized = normalizeTopicKey(str);
	const mapped = TOPIC_SL_MAP[normalized];
	if (mapped) return mapped;

	return str
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()
		.replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function normalizePlaceName(value: unknown): string | null {
	const str = asOptionalString(value);
	if (!str) return null;

	const normalized = str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

	return normalized.length > 0 ? normalized : null;
}

function getPairKey(country: unknown, city: unknown): string | null {
	const normalizedCountry = normalizePlaceName(country);
	const normalizedCity = normalizePlaceName(city);
	if (!normalizedCountry || !normalizedCity) return null;
	return `${normalizedCountry}|${normalizedCity}`;
}

function increment(map: CountMap, key: string): void {
	map.set(key, (map.get(key) ?? 0) + 1);
}

function mostCommon(counts: CountMap): string | undefined {
	return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

async function readJson<T>(filePath: string): Promise<T> {
	return (await Bun.file(filePath).json()) as T;
}

function buildLeanArticles(rows: SourceArticle[]): LeanArticle[] {
	const lean: LeanArticle[] = [];

	for (const row of rows) {
		const _id = asOptionalString(row._id);
		if (!_id) continue;

		lean.push({
			_id,
			url: asOptionalString(row.url),
			date: asOptionalString(row.date),
			"llm-topic": mapTopicToSlovenian(row.theme_model?.theme ?? row.llm?.topic),
			title: asOptionalString(row.title),
			lead: asOptionalString(row.lead),
		});
	}

	return lean;
}

function getFeatureIds(feature: GeoJsonPointFeature): string[] {
	const ids = feature.properties.ids;
	if (!Array.isArray(ids)) return [];
	return ids.map(String);
}

function buildIdFeatureLookup(
	coordinateFeatures: GeoJsonPointFeature[],
): Map<string, GeoJsonPointFeature> {
	const lookup = new Map<string, GeoJsonPointFeature>();

	for (const feature of coordinateFeatures) {
		for (const id of getFeatureIds(feature)) {
			lookup.set(id, feature);
		}
	}

	return lookup;
}

function buildCountryMap(
	legacyRows: SourceArticle[],
	idToCoordinateFeature: Map<string, GeoJsonPointFeature>,
): Map<string, string> {
	const countsByLegacyCountry = new Map<string, CountMap>();

	for (const row of legacyRows) {
		const id = asOptionalString(row._id);
		const legacyCountry = asOptionalString(row.llm?.country);
		if (!id || !legacyCountry) continue;

		const featureCountry = asOptionalString(
			idToCoordinateFeature.get(id)?.properties.country,
		);
		if (!featureCountry) continue;

		const counts = countsByLegacyCountry.get(legacyCountry) ?? new Map();
		increment(counts, featureCountry);
		countsByLegacyCountry.set(legacyCountry, counts);
	}

	const countryMap = new Map<string, string>();

	for (const [legacyCountry, counts] of countsByLegacyCountry) {
		const country = mostCommon(counts);
		if (country) countryMap.set(legacyCountry, country);
	}

	for (const [legacyCountry, country] of Object.entries(MANUAL_COUNTRY_MAP)) {
		countryMap.set(legacyCountry, country);
	}

	return countryMap;
}

function buildCityMap(
	legacyRows: SourceArticle[],
	idToCoordinateFeature: Map<string, GeoJsonPointFeature>,
): Map<string, string> {
	const countsByCityKey = new Map<string, CountMap>();

	for (const row of legacyRows) {
		const id = asOptionalString(row._id);
		const legacyCity = asOptionalString(row.llm?.city);
		if (!id || !legacyCity) continue;

		const feature = idToCoordinateFeature.get(id);
		const featureCountry = asOptionalString(feature?.properties.country);
		const featureCity = asOptionalString(feature?.properties.city);
		if (!featureCountry || !featureCity) continue;

		const key = getPairKey(featureCountry, legacyCity);
		if (!key) continue;

		const counts = countsByCityKey.get(key) ?? new Map();
		increment(counts, featureCity);
		countsByCityKey.set(key, counts);
	}

	const cityMap = new Map<string, string>();

	for (const [cityKey, counts] of countsByCityKey) {
		const city = mostCommon(counts);
		if (city) cityMap.set(cityKey, city);
	}

	for (const [cityKey, city] of Object.entries(MANUAL_CITY_MAP)) {
		cityMap.set(cityKey, city);
	}

	return cityMap;
}

function buildCoordinateLookup(
	coordinateFeatures: GeoJsonPointFeature[],
): Map<string, GeoJsonPointFeature> {
	const lookup = new Map<string, GeoJsonPointFeature>();

	for (const feature of coordinateFeatures) {
		const country = asOptionalString(feature.properties.country);
		const city = asOptionalString(feature.properties.city);
		const key = getPairKey(country, city);
		if (!key) continue;

		lookup.set(key, feature);
	}

	return lookup;
}

function resolveOutputCountry(
	sourceCountry: string,
	outputCountries: Set<string>,
	countryMap: Map<string, string>,
): string | null {
	if (outputCountries.has(sourceCountry)) return sourceCountry;
	return countryMap.get(sourceCountry) ?? null;
}

function resolveCoordinateFeature(params: {
	country: string;
	city: string;
	coordinateByPair: Map<string, GeoJsonPointFeature>;
	cityMap: Map<string, string>;
}): GeoJsonPointFeature | null {
	const directKey = getPairKey(params.country, params.city);
	if (!directKey) return null;

	const directFeature = params.coordinateByPair.get(directKey);
	if (directFeature) return directFeature;

	const mappedCity = params.cityMap.get(directKey);
	if (!mappedCity) return null;

	const mappedKey = getPairKey(params.country, mappedCity);
	if (!mappedKey) return null;

	return params.coordinateByPair.get(mappedKey) ?? null;
}

function asCoordinatePair(value: unknown): [number, number] | null {
	if (!Array.isArray(value) || value.length < 2) return null;

	const lon = Number(value[0]);
	const lat = Number(value[1]);

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
	return [lon, lat];
}

function buildGeoJson(
	sourceRows: SourceArticle[],
	coordinateFeatures: GeoJsonPointFeature[],
	legacyRows: SourceArticle[],
): { geojson: GeoJsonFeatureCollection; stats: Record<string, number> } {
	const idToCoordinateFeature = buildIdFeatureLookup(coordinateFeatures);
	const countryMap = buildCountryMap(legacyRows, idToCoordinateFeature);
	const cityMap = buildCityMap(legacyRows, idToCoordinateFeature);
	const coordinateByPair = buildCoordinateLookup(coordinateFeatures);
	const outputCountries = new Set(
		coordinateFeatures
			.map((feature) => asOptionalString(feature.properties.country))
			.filter((country): country is string => Boolean(country)),
	);

	const aggregate = new Map<
		string,
		{
			city: string;
			country: string;
			coordinates: [number, number];
			ids: string[];
		}
	>();
	const seenIdsByAggregate = new Map<string, Set<string>>();

	const stats = {
		sourceRows: sourceRows.length,
		rowsWithLocation: 0,
		rowsWithoutLocation: 0,
		rowsWithoutId: 0,
		rowsWithoutCountryMap: 0,
		rowsWithoutCoordinate: 0,
		includedArticleIds: 0,
	};

	for (const row of sourceRows) {
		const id = asOptionalString(row._id);
		if (!id) {
			stats.rowsWithoutId += 1;
			continue;
		}

		const sourceCountry = asOptionalString(
			row.location_model?.country ?? row.llm?.country,
		);
		const sourceCity = asOptionalString(row.location_model?.city ?? row.llm?.city);

		if (!sourceCountry || !sourceCity) {
			stats.rowsWithoutLocation += 1;
			continue;
		}
		stats.rowsWithLocation += 1;

		const outputCountry = resolveOutputCountry(
			sourceCountry,
			outputCountries,
			countryMap,
		);
		if (!outputCountry) {
			stats.rowsWithoutCountryMap += 1;
			continue;
		}

		const coordinateFeature = resolveCoordinateFeature({
			country: outputCountry,
			city: sourceCity,
			coordinateByPair,
			cityMap,
		});
		if (!coordinateFeature) {
			stats.rowsWithoutCoordinate += 1;
			continue;
		}

		const city = asOptionalString(coordinateFeature.properties.city);
		const country = asOptionalString(coordinateFeature.properties.country);
		const coordinates = asCoordinatePair(coordinateFeature.geometry.coordinates);
		if (!city || !country || !coordinates) {
			stats.rowsWithoutCoordinate += 1;
			continue;
		}

		const aggregateKey = `${country}\u0000${city}\u0000${coordinates.join(",")}`;
		let entry = aggregate.get(aggregateKey);
		if (!entry) {
			entry = { city, country, coordinates, ids: [] };
			aggregate.set(aggregateKey, entry);
			seenIdsByAggregate.set(aggregateKey, new Set());
		}

		const seenIds = seenIdsByAggregate.get(aggregateKey);
		if (!seenIds?.has(id)) {
			entry.ids.push(id);
			seenIds?.add(id);
			stats.includedArticleIds += 1;
		}
	}

	const geojson: GeoJsonFeatureCollection = {
		type: "FeatureCollection",
		features: [...aggregate.values()].map((entry) => ({
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: entry.coordinates,
			},
			properties: {
				city: entry.city,
				country: entry.country,
				ids: entry.ids,
			},
		})),
	};

	return { geojson, stats };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	mkdirSync(dirname(filePath), { recursive: true });
	await Bun.write(filePath, JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
	const [
		sourceArg = DEFAULT_SOURCE_INPUT,
		leanOutputArg = DEFAULT_LEAN_OUTPUT,
		geojsonOutputArg = DEFAULT_GEOJSON_OUTPUT,
		coordinateIndexArg = DEFAULT_COORDINATE_INDEX,
		legacyInputArg = DEFAULT_LEGACY_INPUT,
	] = process.argv.slice(2);

	const sourcePath = resolvePath(sourceArg);
	const leanOutputPath = resolvePath(leanOutputArg);
	const geojsonOutputPath = resolvePath(geojsonOutputArg);
	const coordinateIndexPath = resolvePath(coordinateIndexArg);
	const legacyPath = resolvePath(legacyInputArg);

	console.log(`Loading source articles from ${sourcePath}`);
	const sourceRows = await readJson<SourceArticle[]>(sourcePath);

	console.log(`Loading coordinate index from ${coordinateIndexPath}`);
	const coordinateIndex =
		await readJson<GeoJsonFeatureCollection>(coordinateIndexPath);

	console.log(`Loading legacy locations from ${legacyPath}`);
	const legacyRows = await readJson<SourceArticle[]>(legacyPath);

	const lean = buildLeanArticles(sourceRows);
	await writeJson(leanOutputPath, lean);
	console.log(`Wrote ${lean.length} lean articles to ${leanOutputPath}`);

	const { geojson, stats } = buildGeoJson(
		sourceRows,
		coordinateIndex.features,
		legacyRows,
	);
	await writeJson(geojsonOutputPath, geojson);
	console.log(
		`Wrote ${geojson.features.length} GeoJSON features to ${geojsonOutputPath}`,
	);
	console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
	console.error(
		"Failed to build mainlocation v2 public files:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
