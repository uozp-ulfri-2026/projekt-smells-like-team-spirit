import { readFile, writeFile } from "node:fs/promises";

type FullArticle = {
  _id?: unknown;
  url?: unknown;
  date?: unknown;
  title?: unknown;
  lead?: unknown;
  llm?: {
    topic?: unknown;
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

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

async function main() {
  const [inputPath = "assets/mmc-llm.json", outputPath = "public/mmc-lean.json"] = process.argv.slice(2);

  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Input file must contain a JSON array.");
  }

  const lean: LeanArticle[] = [];

  for (const row of parsed as FullArticle[]) {
    const _id = asOptionalString(row?._id);
    if (!_id) continue;

    lean.push({
      _id,
      url: asOptionalString(row?.url),
      date: asOptionalString(row?.date),
      "llm-topic": asOptionalString(row?.llm?.topic),
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
