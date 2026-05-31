import { readFile, writeFile } from "node:fs/promises";

interface FullArticle {
  _id?: unknown;
  date?: unknown;
  lead?: unknown;
  llm?: {
    topic?: unknown;
  };
  title?: unknown;
  url?: unknown;
}

interface LeanArticle {
  _id: string;
  date?: string;
  lead?: string;
  "llm-topic"?: string;
  title?: string;
  url?: string;
}

const TOPIC_SL_MAP: Record<string, string> = {
  DRUGO: "DRUGO",
  GASTRONOMIJA: "GASTRONOMIJA",
  GOSPODARSTVO: "GOSPODARSTVO",
  KRIMINAL: "KRIMINAL",
  KULTURA: "KULTURA",
  NARAVNE_NESRECE: "NARAVNE NESREČE",
  OKOLJE: "OKOLJE",
  POLITIKA: "POLITIKA",
  NESRECE_IN_INCIDENTI: "NESREČE IN INCIDENTI",
  PROMETNE_NESRECE: "NESREČE IN INCIDENTI",
  SPORT: "ŠPORT",
  TEHNOLOGIJA: "TEHNOLOGIJA",
  TURIZEM: "TURIZEM",
  VOJNA_IN_KONFLIKTI: "VOJNA IN KONFLIKTI",
  ZABAVA: "ZABAVA",
  ZDRAVJE: "ZDRAVJE",
};

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
  if (!str) {
    return;
  }
  const mapped = TOPIC_SL_MAP[normalizeTopicKey(str)];
  if (mapped) {
    return mapped;
  }

  // Fallback keeps readability for unseen topics.
  return str
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return;
}

async function main() {
  const [
    inputPath = "assets/mmc-llm.json",
    outputPath = "public/mmc-lean.json",
  ] = process.argv.slice(2);

  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Input file must contain a JSON array.");
  }

  const lean: LeanArticle[] = [];

  for (const row of parsed as FullArticle[]) {
    const _id = asOptionalString(row?._id);
    if (!_id) {
      continue;
    }

    lean.push({
      _id,
      url: asOptionalString(row?.url),
      date: asOptionalString(row?.date),
      "llm-topic": mapTopicToSlovenian(row?.llm?.topic),
      title: asOptionalString(row?.title),
      lead: asOptionalString(row?.lead),
    });
  }

  await writeFile(outputPath, JSON.stringify(lean, null, 2), "utf8");
  console.log(`Wrote ${lean.length} lean articles to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
