import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface NominatimEntry {
  city?: unknown;
  country?: unknown;
  [key: string]: unknown;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILES = [
  "assets/mmc-city-country-nominatim.json",
  "assets/mmc-city-country-nominatim0-t.json",
  "assets/mmc-city-country-nominatim1-tjas.json",
  "assets/mmc-city-country-nominatim1-t.json",
  "assets/mmc-city-country-nominatim2.json",
  "assets/mmc-city-country-nominatim2-t.json",
  "assets/mmc-city-country-nominatim3.json",
  "assets/mmc-city-country-nominatim4.json",
  "assets/mmc-city-country-nominatim5.json",
];

const DEFAULT_OUTPUT_FILE = join(
  __dirname,
  "..",
  "assets",
  "mmc-city-country-nominatim-joined.json"
);

function asText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getEntries(raw: unknown): NominatimEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error("Each input file must contain a JSON array.");
  }

  return raw as NominatimEntry[];
}

function getKey(entry: NominatimEntry): string | null {
  const city = asText(entry.city);
  const country = asText(entry.country);

  if (!(city && country)) {
    return null;
  }

  return `${city}\u0000${country}`;
}

function sortEntries(left: NominatimEntry, right: NominatimEntry): number {
  const leftCountry = asText(left.country) ?? "";
  const rightCountry = asText(right.country) ?? "";
  const countryCompare = leftCountry.localeCompare(rightCountry, "sl");

  if (countryCompare !== 0) {
    return countryCompare;
  }

  const leftCity = asText(left.city) ?? "";
  const rightCity = asText(right.city) ?? "";
  return leftCity.localeCompare(rightCity, "sl");
}

async function main() {
  const args = process.argv.slice(2);
  const outputFile =
    args.length > 0 && args.at(-1)?.endsWith(".json")
      ? args.at(-1)
      : DEFAULT_OUTPUT_FILE;
  const inputFiles =
    args.length > 0 && outputFile === args.at(-1) ? args.slice(0, -1) : args;

  const resolvedInputFiles = inputFiles.length > 0 ? inputFiles : INPUT_FILES;

  const seen = new Map<string, NominatimEntry>();
  let skippedWithoutCityCountry = 0;
  let totalEntries = 0;

  for (const inputFile of resolvedInputFiles) {
    const resolvedInput = join(__dirname, "..", inputFile);
    const rawText = await readFile(resolvedInput, "utf8");
    const entries = getEntries(JSON.parse(rawText) as unknown);

    for (const entry of entries) {
      totalEntries += 1;
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        skippedWithoutCityCountry += 1;
        continue;
      }

      const key = getKey(entry);
      if (!key) {
        skippedWithoutCityCountry += 1;
        continue;
      }

      if (!seen.has(key)) {
        seen.set(key, entry);
      }
    }
  }

  const joined = [...seen.values()].sort(sortEntries);

  if (!outputFile) {
    throw new Error("Output file path is required.");
  }

  await writeFile(outputFile, `${JSON.stringify(joined, null, 2)}\n`, "utf8");

  console.log(`Read ${resolvedInputFiles.length} files.`);
  console.log(`Total city/country pairs before deduplication: ${totalEntries}`);
  console.log(`Unique city/country pairs: ${joined.length}`);
  console.log(
    `Skipped rows without both city and country: ${skippedWithoutCityCountry}`
  );
  console.log(`Wrote: ${outputFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
