import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname } from "node:path";
import YAML from "yaml";

type Format = "json" | "yaml";

function usage(): never {
	console.log(
		[
			"Usage:",
			"  bun scripts/convert-json-yaml.ts <input.json|input.yaml> <output.yaml|output.json>",
			"",
			"Examples:",
			"  bun scripts/convert-json-yaml.ts assets/cleaned/mmc-10.json assets/cleaned/mmc-10.yaml",
			"  bun scripts/convert-json-yaml.ts assets/cleaned/mmc-10.yaml assets/cleaned/mmc-10.json",
		].join("\n"),
	);
	process.exit(1);
}

function getFormat(path: string): Format {
	const extension = extname(path).toLowerCase();

	if (extension === ".json") {
		return "json";
	}

	if (extension === ".yaml" || extension === ".yml") {
		return "yaml";
	}

	throw new Error(`Unsupported file extension for ${path}. Use .json, .yaml, or .yml.`);
}

function parseContent(raw: string, format: Format): unknown {
	if (format === "json") {
		return JSON.parse(raw) as unknown;
	}

	return YAML.parse(raw) as unknown;
}

function stringifyContent(value: unknown, format: Format): string {
	if (format === "json") {
		return `${JSON.stringify(value, null, 2)}\n`;
	}

	return YAML.stringify(value);
}

async function main() {
	const [inputPath, outputPath] = process.argv.slice(2);

	if (!inputPath || !outputPath) {
		usage();
	}

	const inputFormat = getFormat(inputPath);
	const outputFormat = getFormat(outputPath);

	if (inputFormat === outputFormat) {
		throw new Error("Input and output formats are the same. Use one JSON file and one YAML file.");
	}

	const raw = await readFile(inputPath, "utf8");
	const parsed = parseContent(raw, inputFormat);
	const converted = stringifyContent(parsed, outputFormat);

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, converted, "utf8");

	console.log(`Converted ${inputFormat.toUpperCase()} to ${outputFormat.toUpperCase()}.`);
	console.log(`Wrote: ${outputPath}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
