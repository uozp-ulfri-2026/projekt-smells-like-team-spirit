import { readFile } from "node:fs/promises";

async function main() {
  const [filePath] = process.argv.slice(2);

  if (!filePath) {
    console.log("Usage: bun scripts/count-objects.ts <file.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("File must contain a JSON array at top level.");
  }

  console.log(`${parsed.length} objects`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
