import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RATE_LIMIT_MS = 1500;
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_LANGUAGE = process.env.NOMINATIM_LANGUAGE?.trim() || "en";

type CityCountryPair = {
	city: string;
	country: string;
};

type NominatimResult = {
	place_id?: number;
	osm_type?: string;
	osm_id?: number;
	lat?: string;
	lon?: string;
	display_name?: string;
	importance?: number;
	boundingbox?: string[];
	name?: string;
	class?: string;
	type?: string;
	address?: Record<string, string>;
};

type SearchPayload = {
	query: string;
	url: string;
	results: NominatimResult[];
};

type OutputEntry = {
	city: string;
	country: string;
	pair_query: SearchPayload;
	just_city?: SearchPayload;
};

function normalize_text(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (trimmed.length === 0) return null;
	if (/^[.·•…-]+$/.test(trimmed)) return null;
	if (/^(country|city|unknown|n\/a|null|none)$/i.test(trimmed)) return null;
	return trimmed;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function build_search_url(query: string): URL {
	const url = new URL(NOMINATIM_BASE_URL);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "jsonv2");
	url.searchParams.set("limit", "1");
	url.searchParams.set("addressdetails", "1");
	url.searchParams.set("accept-language", NOMINATIM_LANGUAGE);
	const email = process.env.NOMINATIM_EMAIL?.trim();
	if (email) {
		url.searchParams.set("email", email);
	}
	return url;
}

async function fetch_search(query: string): Promise<SearchPayload> {
	const url = build_search_url(query);
	const response = await fetch(url, {
		headers: {
			"Accept-Language": "sl",
			"User-Agent": "projekt-smells-like-team-spirit/1.0",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Nominatim request failed for "${query}" (${response.status} ${response.statusText})`,
		);
	}

	const results = (await response.json()) as NominatimResult[];
	return {
		query,
		url: url.toString(),
		results: Array.isArray(results) ? results : [],
	};
}

function result_signature(result: NominatimResult | undefined): string {
	if (!result) return "";
	return JSON.stringify({
		place_id: result.place_id ?? null,
		osm_type: result.osm_type ?? null,
		osm_id: result.osm_id ?? null,
		lat: result.lat ?? null,
		lon: result.lon ?? null,
		display_name: result.display_name ?? null,
	});
}

function payload_differs(left: SearchPayload, right: SearchPayload): boolean {
	return (
		result_signature(left.results[0]) !== result_signature(right.results[0])
	);
}

async function run(): Promise<void> {
	const input_file =
		process.argv[2] ??
		join(__dirname, "..", "assets", "mmc-city-country-pairs.json");
	const output_file =
		process.argv[3] ??
		join(__dirname, "..", "assets", "mmc-city-country-nominatim.json");

	const raw_text = await readFile(input_file, "utf8");
	const parsed = JSON.parse(raw_text) as unknown;
	const pairs = Array.isArray(parsed) ? (parsed as CityCountryPair[]) : [];

	const entries: OutputEntry[] = [];
	const valid_pairs = pairs
		.map((pair) => ({
			city: normalize_text(pair.city),
			country: normalize_text(pair.country),
		}))
		.filter(
			(pair): pair is CityCountryPair =>
				pair.city !== null && pair.country !== null,
		);

	console.log(
		`Loaded ${valid_pairs.length} city/country pairs from ${input_file}`,
	);

	// const queries_length = 50;
	const queries_length = valid_pairs.length;

	for (let index = 0; index < queries_length; index += 1) {
		const pair = valid_pairs[index];
		const pair_query = `${pair.city}, ${pair.country}`;
		const just_city_query = pair.city;

		console.log(`[${index + 1}/${queries_length}] ${pair_query}`);
		const pair_payload = await fetch_search(pair_query);
		await delay(RATE_LIMIT_MS);

		const city_payload = await fetch_search(just_city_query);
		await delay(RATE_LIMIT_MS);

		const entry: OutputEntry = {
			city: pair.city,
			country: pair.country,
			pair_query: pair_payload,
		};

		if (payload_differs(pair_payload, city_payload)) {
			entry.just_city = city_payload;
		}

		entries.push(entry);

		if (index % 5 === 4 || index === queries_length - 1) {
			await writeFile(output_file, JSON.stringify(entries, null, 2), "utf8");
		}
	}

	console.log(`Saved ${entries.length} lookup entries to ${output_file}`);
}

run().catch((error) => {
	console.error("Failed to fetch Nominatim coordinates:", error);
	process.exit(1);
});
