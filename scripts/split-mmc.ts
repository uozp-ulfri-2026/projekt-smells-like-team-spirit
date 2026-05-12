import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Article = Record<string, unknown>;

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const inputPath = resolve(
  projectRoot,
  process.argv[2] ?? "assets/cleaned/mmc.json"
);
const firstOutputPath = resolve(
  projectRoot,
  process.argv[3] ?? "assets/cleaned/mmc-part-1.json"
);
const secondOutputPath = resolve(
  projectRoot,
  process.argv[4] ?? "assets/cleaned/mmc-part-2.json"
);

async function splitMmcFile() {
  console.log(`Reading ${inputPath}...`);

  const raw = await readFile(inputPath, "utf8");
  const articles = JSON.parse(raw) as unknown;

  if (!Array.isArray(articles)) {
    throw new Error("Input file must contain a JSON array of articles.");
  }

  const midpoint = Math.ceil(articles.length / 2);
  const firstHalf = articles.slice(0, midpoint) as Article[];
  const secondHalf = articles.slice(midpoint) as Article[];

  await mkdir(dirname(firstOutputPath), { recursive: true });
  await mkdir(dirname(secondOutputPath), { recursive: true });

  await writeFile(firstOutputPath, JSON.stringify(firstHalf, null, 2), "utf8");
  await writeFile(
    secondOutputPath,
    JSON.stringify(secondHalf, null, 2),
    "utf8"
  );

  console.log(`Total articles: ${articles.length}`);
  console.log(`First half: ${firstHalf.length} -> ${firstOutputPath}`);
  console.log(`Second half: ${secondHalf.length} -> ${secondOutputPath}`);
}

splitMmcFile().catch((error) => {
  console.error("Failed to split MMC file.", error);
  process.exitCode = 1;
});
