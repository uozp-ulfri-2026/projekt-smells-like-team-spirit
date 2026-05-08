import { readFileSync } from "node:fs";
import * as yaml from "js-yaml";

// Bun.argv[0] is bun, [1] is the script name, [2] is your file
const filePath = Bun.argv[2];

if (!filePath) {
  console.error("❌ Please provide a file path: bun run metrics.ts <file>");
  process.exit(1);
}

async function runMetrics() {
  console.log(`📊 Analyzing: ${filePath}`);
  console.time("Execution Time");

  try {
    let data: any[];

    if (filePath.endsWith(".json")) {
      data = await Bun.file(filePath).json();
    } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      const fileContent = readFileSync(filePath, "utf8");
      data = yaml.load(fileContent) as any[];
    } else {
      throw new Error("Unsupported format. Use .json or .yaml");
    }

    const total = data.length;
    const stats = {
      _id: 0,
      title: 0,
      paragraphs: 0,
      lead: 0,
      keywords: 0,
      gpt_keywords: 0,
    };

    for (const entry of data) {
      if (entry._id) stats._id++;
      if (entry.title) stats.title++;
      if (entry.paragraphs?.length > 0) stats.paragraphs++;
      if (entry.lead) stats.lead++;
      if (entry.keywords?.length > 0) stats.keywords++;
      if (entry.gpt_keywords?.length > 0) stats.gpt_keywords++;
    }

    console.log("-----------------------------------------");
    console.log(`Total Entries: ${total.toLocaleString()}`);
    console.log("-----------------------------------------");
    for (const [field, count] of Object.entries(stats)) {
      const percentage = ((count / total) * 100).toFixed(2);
      console.log(`${field.padEnd(15)}: ${count.toLocaleString()} (${percentage}%)`);
    }
    console.log("-----------------------------------------");
    console.timeEnd("Execution Time");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

runMetrics();