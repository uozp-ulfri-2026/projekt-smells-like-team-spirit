import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

type JsonObject = Record<string, unknown>;

function usage(): never {
	console.log(
		[
			"Usage:",
			"  bun scripts/attach-llm-to-mmc.ts <original-mmc.json> <output.json> <llm-output-1.json> [llm-output-2.json ...]",
			"",
			"Example:",
			"  bun scripts/attach-llm-to-mmc.ts assets/cleaned/mmc.json assets/processed/mmc-with-llm.json assets/processed/combined.json assets/processed/errors/combined-errors.json",
			"",
			"Optional:",
			"  --allow-missing   Write output even if some MMC rows do not have an LLM object.",
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

async function readJsonArray(path: string): Promise<JsonObject[]> {
	const raw = await readFile(path, "utf8");
	const parsed = JSON.parse(raw) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(`${path} must contain a JSON array.`);
	}

	const objects: JsonObject[] = [];

	for (const [index, entry] of parsed.entries()) {
		if (!isJsonObject(entry)) {
			throw new Error(`${path} contains a non-object entry at index ${index}.`);
		}

		objects.push(entry);
	}

	return objects;
}

function indexById(entries: JsonObject[], label: string): Map<string, JsonObject> {
	const byId = new Map<string, JsonObject>();

	for (const [index, entry] of entries.entries()) {
		const id = getId(entry);

		if (!id) {
			throw new Error(`${label} entry at index ${index} is missing a string _id.`);
		}

		if (byId.has(id)) {
			throw new Error(`${label} contains duplicate _id: ${id}.`);
		}

		byId.set(id, entry);
	}

	return byId;
}

async function main() {
	const args = process.argv.slice(2);
	const allowMissing = args.includes("--allow-missing");
	const paths = args.filter((arg) => arg !== "--allow-missing");
	const [mmcPath, outputPath, ...llmPaths] = paths;

	if (!mmcPath || !outputPath || llmPaths.length === 0) {
		usage();
	}

	const mmcRows = await readJsonArray(mmcPath);
	const llmRows = (
		await Promise.all(llmPaths.map((llmPath) => readJsonArray(llmPath)))
	).flat();
	const llmById = indexById(llmRows, "LLM output");
	const mmcIds = new Set<string>();
	const missingIds: string[] = [];

	const merged = mmcRows.map((mmcRow, index) => {
		const id = getId(mmcRow);

		if (!id) {
			throw new Error(`MMC entry at index ${index} is missing a string _id.`);
		}

		mmcIds.add(id);
		const llm = llmById.get(id);

		if (!llm) {
			missingIds.push(id);
			return mmcRow;
		}

		const { llm: _existingLlm, ...mmcWithoutOldLlm } = mmcRow;
		return {
			...mmcWithoutOldLlm,
			llm,
		};
	});

	const extraLlmIds = llmRows
		.map((entry) => getId(entry))
		.filter((id): id is string => Boolean(id) && !mmcIds.has(id));

	if (missingIds.length > 0 && !allowMissing) {
		throw new Error(
			[
				`Missing LLM objects for ${missingIds.length} MMC rows.`,
				`First missing _id values: ${missingIds.slice(0, 10).join(", ")}`,
				"Run again with --allow-missing if you still want to write the output.",
			].join("\n"),
		);
	}

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

	console.log(`MMC rows: ${mmcRows.length}`);
	console.log(`LLM rows: ${llmRows.length}`);
	console.log(`Rows with llm: ${mmcRows.length - missingIds.length}`);
	console.log(`Rows missing llm: ${missingIds.length}`);
	console.log(`Extra LLM ids not found in MMC: ${extraLlmIds.length}`);
	console.log(`Wrote: ${outputPath}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
