import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Article } from "../src/lib/mmc-llm-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CityCountryPair = {
	city: string;
	country: string;
};

function normalize_text(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	/* if (trimmed.length === 0) return null;
	if (/^[.·•…-]+$/.test(trimmed)) return null;
	return trimmed; */
	return trimmed.length > 0 ? trimmed : null;
}

function get_articles(raw: unknown): Article[] {
	return Array.isArray(raw) ? (raw as Article[]) : [raw as Article];
}

function get_pairs(articles: Article[]): CityCountryPair[] {
	const seen = new Map<string, CityCountryPair>();

	for (const article of articles) {
		const city = normalize_text(article.llm?.city);
		const country = normalize_text(article.llm?.country);

		if (!city || !country) {
			continue;
		}

		const key = `${city}\u0000${country}`;
		if (!seen.has(key)) {
			seen.set(key, { city, country });
		}
	}

	return [...seen.values()].sort((left, right) => {
		const country_compare = left.country.localeCompare(right.country, "sl");
		if (country_compare !== 0) {
			return country_compare;
		}

		return left.city.localeCompare(right.city, "sl");
	});
}

async function run(): Promise<void> {
	const input_file =
		process.argv[2] ?? join(__dirname, "..", "assets", "mmc-llm.json");
	const output_file =
		process.argv[3] ??
		join(__dirname, "..", "assets", "mmc-city-country-pairs.json");

	const raw_text = await readFile(input_file, "utf8");
	const parsed = JSON.parse(raw_text) as unknown;
	const articles = get_articles(parsed);
	const pairs = get_pairs(articles);

	await writeFile(output_file, JSON.stringify(pairs, null, 2), "utf8");

	console.log(
		`Saved ${pairs.length} unique city/country pairs to ${output_file}`,
	);
}

run().catch((error) => {
	console.error("Failed to extract city/country pairs:", error);
	process.exit(1);
});
