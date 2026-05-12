import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

interface ErrorRecord {
  _id?: string;
}

interface CleanedArticle {
  _id?: string;
  [key: string]: unknown;
}

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

function collectIds(records: ErrorRecord[]): Set<string> {
  const ids = new Set<string>();

  for (const record of records) {
    if (typeof record._id === "string" && record._id.length > 0) {
      ids.add(record._id);
    }
  }

  return ids;
}

async function readJson<T>(filePath: string): Promise<T> {
  return (await Bun.file(filePath).json()) as T;
}

async function main(): Promise<void> {
  const [cleanedInputPathArg, outputPathArg, ...errorPathArgs] =
    process.argv.slice(2);

  if (!(cleanedInputPathArg && outputPathArg) || errorPathArgs.length === 0) {
    console.error(
      "Usage: bun scripts/build-mmc-errors.ts <cleaned.json> <output.json> <error1.json> [error2.json ...]"
    );
    process.exit(1);
  }

  const cleanedPath = resolvePath(cleanedInputPathArg);
  const outputPath = resolvePath(outputPathArg);
  const errorPaths = errorPathArgs.map(resolvePath);

  console.log("📥 Loading error ids...");

  const errorFiles = await Promise.all(
    errorPaths.map(async (errorPath) => ({
      path: errorPath,
      records: await readJson<ErrorRecord[]>(errorPath),
    }))
  );

  const erroredIds = new Set<string>();
  for (const errorFile of errorFiles) {
    for (const id of collectIds(errorFile.records)) {
      erroredIds.add(id);
    }
  }

  console.log(`🔎 Found ${erroredIds.size} unique errored ids.`);
  console.log("📚 Loading cleaned mmc dataset...");

  const cleanedArticles = (
    await readJson<CleanedArticle[]>(cleanedPath)
  ).filter(
    (article): article is CleanedArticle & { _id: string } =>
      typeof article._id === "string" && article._id.length > 0
  );

  const matchedArticles = cleanedArticles.filter((article) =>
    erroredIds.has(article._id)
  );

  mkdirSync(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, JSON.stringify(matchedArticles, null, 2));

  console.log(`✅ Wrote ${matchedArticles.length} articles to ${outputPath}`);
}

main().catch((error) => {
  console.error(
    "❌ Failed to build mmc-errors.json:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
