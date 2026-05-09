import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

type JsonObject = Record<string, unknown>;

function usage(): never {
	console.log(
		[
			"Usage:",
			"  bun scripts/extract_ids.ts <input.json> [output.json]",
			"",
			"Example:",
			"  bun scripts/extract_ids.ts assets/ai/errors/errors00.json error-ids.json",
			"  bun scripts/extract_ids.ts assets/cleaned/mmc.json  # outputs to stdout",
		].join("\n"),
	);
	process.exit(1);
}

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getId(value: JsonObject): string | undefined {
	return typeof value._id === "string" && value._id.length > 0
		? value._id
		: undefined;
}

async function extractIds(inputPath: string): Promise<string[]> {
	const raw = await readFile(inputPath, "utf8");
	const parsed = JSON.parse(raw) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(`${inputPath} must contain a JSON array.`);
	}

	const ids: string[] = [];

	for (const [index, entry] of parsed.entries()) {
		if (!isJsonObject(entry)) {
			throw new Error(`${inputPath} contains a non-object entry at index ${index}.`);
		}

		const id = getId(entry);
		if (id) {
			ids.push(id);
		}
	}

	return ids;
}

async function main() {
	const args = process.argv.slice(2);
	const [inputPath, outputPath] = args;

	if (!inputPath) {
		usage();
	}

	const ids = await extractIds(inputPath);

	if (outputPath) {
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(ids, null, 2)}\n`, "utf8");
		console.log(`Extracted ${ids.length} IDs to ${outputPath}`);
	} else {
		console.log(JSON.stringify(ids, null, 2));
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
