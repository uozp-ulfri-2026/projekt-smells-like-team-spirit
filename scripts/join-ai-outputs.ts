import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type JsonObject = Record<string, unknown>;

interface ValidatedFile {
  invalidCount: number;
  valid: JsonObject[];
}

function usage(): never {
  console.log(
    [
      "Usage:",
      "  bun scripts/join-ai-outputs.ts <first.json> <second.json> <joined-output.json>",
      "",
      "Example:",
      "  bun scripts/join-ai-outputs.ts assets/cleaned/mmc-part-1.json assets/cleaned/mmc-part-2.json assets/cleaned/mmc-joined.json",
    ].join("\n")
  );
  process.exit(1);
}

async function readJsonArray(path: string): Promise<unknown[]> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON array.`);
  }

  return parsed;
}

function getObjectId(entry: JsonObject): string | undefined {
  return typeof entry._id === "string" && entry._id.length > 0
    ? entry._id
    : undefined;
}

function getShape(entry: JsonObject): string {
  return Object.keys(entry).sort().join("\n");
}

function isJsonObject(entry: unknown): entry is JsonObject {
  return typeof entry === "object" && entry !== null && !Array.isArray(entry);
}

async function readValidObjects(
  path: string,
  expectedShape?: string
): Promise<ValidatedFile & { shape?: string }> {
  const entries = await readJsonArray(path);
  const valid: JsonObject[] = [];
  let invalidCount = 0;
  let shape = expectedShape;

  for (const [index, entry] of entries.entries()) {
    if (!isJsonObject(entry)) {
      invalidCount += 1;
      console.warn(`Skipping non-object entry in ${path} (index ${index}).`);
      continue;
    }

    const entryShape = getShape(entry);
    if (!shape) {
      shape = entryShape;
    }

    if (entryShape === shape) {
      valid.push(entry);
      continue;
    }

    invalidCount += 1;
    const id = getObjectId(entry) ?? `index ${index}`;

    console.warn(`Skipping entry with different keys in ${path} (${id}).`);
  }

  return { valid, invalidCount, shape };
}

function joinWithoutDuplicateIds(files: JsonObject[][]): {
  joined: JsonObject[];
  duplicateCount: number;
} {
  const seenIds = new Set<string>();
  const joined: JsonObject[] = [];
  let duplicateCount = 0;

  for (const file of files) {
    for (const entry of file) {
      const id = getObjectId(entry);

      if (id && seenIds.has(id)) {
        duplicateCount += 1;
        console.warn(`Skipping duplicate _id ${id}.`);
        continue;
      }

      if (id) {
        seenIds.add(id);
      }
      joined.push(entry);
    }
  }

  return { joined, duplicateCount };
}

async function main() {
  const [firstPath, secondPath, outputPath] = process.argv.slice(2);

  if (!(firstPath && secondPath && outputPath)) {
    usage();
  }

  const first = await readValidObjects(firstPath);

  if (!first.shape) {
    throw new Error(`${firstPath} does not contain any valid objects.`);
  }

  const second = await readValidObjects(secondPath, first.shape);
  const { joined, duplicateCount } = joinWithoutDuplicateIds([
    first.valid,
    second.valid,
  ]);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(joined, null, 2)}\n`, "utf8");

  console.log(`First file valid: ${first.valid.length}`);
  console.log(`Second file valid: ${second.valid.length}`);
  console.log(`Invalid skipped: ${first.invalidCount + second.invalidCount}`);
  console.log(`Duplicates skipped: ${duplicateCount}`);
  console.log(`Joined total: ${joined.length}`);
  console.log(`Wrote: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
