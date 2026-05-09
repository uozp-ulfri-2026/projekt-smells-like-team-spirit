import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SAMPLE_SIZE = 1000;

async function getNextSampleIndex(): Promise<number> {
	const cleaned_dir = join(__dirname, "..", "assets", "cleaned", "sampled");

	if (!existsSync(cleaned_dir)) {
		return 0;
	}

	let maxIndex = -1;
	const fs = await import("node:fs");
	const files = fs.readdirSync(cleaned_dir);

	for (const file of files) {
		const match = file.match(/^mmc-sample-(\d+)\.json$/);
		if (match) {
			const index = parseInt(match[1], 10);
			if (index > maxIndex) {
				maxIndex = index;
			}
		}
	}

	return maxIndex + 1;
}

function getRandomElements<T>(array: T[], count: number): T[] {
	const shuffled = [...array].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, array.length));
}

async function run_sampling(): Promise<void> {
	const input_file =
		process.argv[2] || join(__dirname, "..", "assets", "cleaned", "mmc.json");

	try {
		console.log(`Reading ${input_file}...`);
		const raw_text = await readFile(input_file, "utf8");
		const parsed = JSON.parse(raw_text) as unknown;

		const articles = Array.isArray(parsed) ? parsed : [parsed];
		console.log(`Loaded ${articles.length} articles`);

		const sampled = getRandomElements(articles, SAMPLE_SIZE);
		console.log(`Sampled ${sampled.length} articles`);

		const nextIndex = await getNextSampleIndex();
		const indexStr = String(nextIndex).padStart(2, "0");
		const output_dir = join(__dirname, "..", "assets", "cleaned", "sampled");
		const output_file = join(output_dir, `mmc-sample-${indexStr}.json`);

		await mkdir(output_dir, { recursive: true });
		await writeFile(output_file, JSON.stringify(sampled, null, 2));

		console.log(`✓ Saved ${sampled.length} articles to ${output_file}`);
	} catch (error) {
		console.error("Error during sampling:", error);
		process.exit(1);
	}
}

await run_sampling();
