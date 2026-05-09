import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type ErrorRecord = {
	_id?: string;
};

type CleanedArticle = {
	_id?: string;
	[key: string]: unknown;
};

const workspaceRoot = join(import.meta.dir, "..");
const cleanedPath = join(workspaceRoot, "assets", "cleaned", "mmc.json");
const tjasErrorsPath = join(workspaceRoot, "assets", "final", "errors", "tjas-errors.json");
const tristanErrorsPath = join(workspaceRoot, "assets", "final", "errors", "tristan-errors.json");
const outputPath = join(workspaceRoot, "assets", "final", "errors", "mmc-errors.json");

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
	console.log("📥 Loading error ids...");

	const [tjasErrors, tristanErrors] = await Promise.all([
		readJson<ErrorRecord[]>(tjasErrorsPath),
		readJson<ErrorRecord[]>(tristanErrorsPath),
	]);

	const erroredIds = new Set<string>([
		...collectIds(tjasErrors),
		...collectIds(tristanErrors),
	]);

	console.log(`🔎 Found ${erroredIds.size} unique errored ids.`);
	console.log("📚 Loading cleaned mmc dataset...");

	const cleanedArticles = (await readJson<CleanedArticle[]>(cleanedPath)).filter(
		(article): article is CleanedArticle & { _id: string } =>
			typeof article._id === "string" && article._id.length > 0,
	);

	const matchedArticles = cleanedArticles.filter((article) => erroredIds.has(article._id));

	mkdirSync(dirname(outputPath), { recursive: true });
	await Bun.write(outputPath, JSON.stringify(matchedArticles, null, 2));

	console.log(`✅ Wrote ${matchedArticles.length} articles to ${outputPath}`);
}

main().catch((error) => {
	console.error("❌ Failed to build mmc-errors.json:", error instanceof Error ? error.message : error);
	process.exit(1);
});
