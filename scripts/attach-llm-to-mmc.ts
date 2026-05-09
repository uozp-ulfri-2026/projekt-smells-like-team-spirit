import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

type JsonObject = Record<string, unknown>;

function usage(): never {
	console.log(
		[
			"Usage:",
			"  bun scripts/attach-llm-to-mmc.ts <original-mmc.json> <output.json> <llm-output-1.json> [llm-output-2.json ...] [--unavailable unavailable-ids.json]",
			"",
			"Example:",
			"  bun scripts/attach-llm-to-mmc.ts assets/cleaned/mmc.json assets/final/mmc-with-llm.json assets/ai/outputs/output00.json --unavailable assets/final/responses/unavailable-ids.json",
			"",
			"Optional:",
			"  --allow-missing      Write output even if some MMC rows do not have an LLM object.",
			"  --unavailable <ids>  JSON file with array of IDs to mark as unavailable. Rows with these IDs will get llm: {}.",
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

function isErrorEntry(value: JsonObject): boolean {
	return "error" in value;
}

async function readIdList(path: string): Promise<Set<string>> {
	const raw = await readFile(path, "utf8");
	const parsed = JSON.parse(raw) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(`${path} must contain a JSON array of IDs.`);
	}

	const ids = new Set<string>();

	for (const [index, id] of parsed.entries()) {
		if (typeof id !== "string") {
			throw new Error(`${path} contains a non-string entry at index ${index}.`);
		}
		ids.add(id);
	}

	return ids;
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

function indexById(
	entries: JsonObject[],
	label: string,
): Map<string, JsonObject> {
	const byId = new Map<string, JsonObject>();

	for (const [index, entry] of entries.entries()) {
		const id = getId(entry);

		if (!id) {
			throw new Error(
				`${label} entry at index ${index} is missing a string _id.`,
			);
		}

		if (byId.has(id)) {
			const existing = byId.get(id);
			if (!existing) {
				throw new Error(`${label} contains duplicate _id: ${id}.`);
			}

			const existingIsError = isErrorEntry(existing);
			const currentIsError = isErrorEntry(entry);

			if (existingIsError && !currentIsError) {
				byId.set(id, entry);
			}

			if (!existingIsError && currentIsError) {
				continue;
			}

			if (existingIsError && currentIsError) {
				continue;
			}

			throw new Error(`${label} contains duplicate processed _id: ${id}.`);
		}

		byId.set(id, entry);
	}

	return byId;
}

async function main() {
	const args = process.argv.slice(2);
	const allowMissing = args.includes("--allow-missing");

	// Extract unavailable IDs file path after --unavailable flag
	const unavailableIndex = args.indexOf("--unavailable");
	let unavailableFile: string | undefined;
	let otherArgs = args.filter((arg) => arg !== "--allow-missing");

	if (unavailableIndex !== -1) {
		unavailableFile = args[unavailableIndex + 1];
		otherArgs = args
			.slice(0, unavailableIndex)
			.filter((arg) => arg !== "--allow-missing");
	}

	const [mmcPath, outputPath, ...llmPaths] = otherArgs;

	if (!mmcPath || !outputPath || llmPaths.length === 0) {
		usage();
	}

	const mmcRows = await readJsonArray(mmcPath);
	const llmRows = (
		await Promise.all(llmPaths.map((llmPath) => readJsonArray(llmPath)))
	).flat();

	// Read unavailable IDs if --unavailable flag was provided
	const unavailableIds = unavailableFile
		? await readIdList(unavailableFile)
		: new Set<string>();

	const llmById = indexById(llmRows, "LLM output");
	const mmcIds = new Set<string>();
	const missingIds: string[] = [];
	let unavailableCount = 0;

	const merged = mmcRows.map((mmcRow, index) => {
		const id = getId(mmcRow);

		if (!id) {
			throw new Error(`MMC entry at index ${index} is missing a string _id.`);
		}

		mmcIds.add(id);

		// If this ID is in the unavailable set, attach empty llm object
		if (unavailableIds.has(id)) {
			const { llm: _existingLlm, ...mmcWithoutOldLlm } = mmcRow;
			unavailableCount += 1;
			return {
				...mmcWithoutOldLlm,
				llm: {},
			};
		}

		const llm = llmById.get(id);

		if (!llm) {
			missingIds.push(id);
			return mmcRow;
		}

		const attachedLlm = isErrorEntry(llm) ? {} : llm;
		if (isErrorEntry(llm)) {
			unavailableCount += 1;
		}

		const { llm: _existingLlm, ...mmcWithoutOldLlm } = mmcRow;
		return {
			...mmcWithoutOldLlm,
			llm: attachedLlm,
		};
	});

	const extraLlmIds = llmRows
		.map((entry) => getId(entry))
		.filter((id): id is string => typeof id === "string" && !mmcIds.has(id));

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
	console.log(`LLM output rows: ${llmRows.length}`);
	console.log(`Unavailable IDs: ${unavailableIds.size}`);
	console.log(
		`Rows with actual llm data: ${mmcRows.length - missingIds.length - unavailableCount}`,
	);
	console.log(`Rows with llm: {} (unavailable): ${unavailableCount}`);
	console.log(`Rows missing llm: ${missingIds.length}`);
	console.log(`Extra LLM ids not found in MMC: ${extraLlmIds.length}`);
	console.log(`Wrote: ${outputPath}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
