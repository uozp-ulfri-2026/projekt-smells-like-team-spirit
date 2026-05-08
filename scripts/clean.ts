import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import * as yaml from "js-yaml";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "cleaned_data.json";

if (!inputPath) {
  console.error("❌ Usage: bun run clean.ts <input_file> [output_file]");
  process.exit(1);
}

async function cleanData() {
  console.log(`🧹 Cleaning: ${inputPath} -> ${outputPath}`);
  console.time("Cleaning Time");

  try {
    const fileContent = readFileSync(inputPath, "utf8");
    const data = yaml.load(fileContent) as any[];

    const cleaned = data.map((entry) => ({
      _id: entry._id,
      title: entry.title || "",
      paragraphs: Array.isArray(entry.paragraphs) ? entry.paragraphs : [],
      lead: entry.lead || "",
      keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
      gpt_keywords: Array.isArray(entry.gpt_keywords) ? entry.gpt_keywords : []
    }));

    mkdirSync(dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, JSON.stringify(cleaned, null, 2));
    
    console.timeEnd("Cleaning Time");
    console.log(`✅ Success! ${cleaned.length.toLocaleString()} entries processed.`);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
  }
}

cleanData();