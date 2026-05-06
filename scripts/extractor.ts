import { readFile } from "node:fs/promises";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import YAML from "yaml";
import { z } from "zod";

// 1. Configure Vercel AI SDK to point to LM Studio
const lm_studio = createOpenAI({
	baseURL: "http://localhost:1234/v1",
	apiKey: "not-needed-for-local",
});

// 2. Define the Structured Output Schema using Zod
const city_schema = z.object({
	city: z
		.string()
		.describe(
			"Exactly one extracted city or town in Slovenian nominative form (e.g. 'Ljubljana'). Use an empty string if no city is present.",
		),
});

// Type definitions matching your YAML/JSON structure
type ArticleYaml = {
	title?: string;
	lead?: string;
	paragraphs?: Array<string>;
};

type ArticleLoadResult = {
	total_articles: number;
	articles: string[];
};

/**
 * 3. Improved Loading Function
 * Reads the dataset, parses it, extracts the total article count,
 * and slices the data based on `offset` and `size`.
 */
async function load_articles(
	file_path: string | URL,
	offset: number = 0,
	size: number = 10,
): Promise<ArticleLoadResult> {
	const raw_text = await readFile(file_path, "utf8");
	const parsed_yaml = YAML.parse(raw_text) as unknown;

	// Support both a single article object or an array of articles
	const article_list = Array.isArray(parsed_yaml)
		? (parsed_yaml as ArticleYaml[])
		: [parsed_yaml as ArticleYaml];

	const total_articles = article_list.length;

	// Apply pagination parameters
	const sliced_articles = article_list.slice(offset, offset + size);

	const mapped_articles = sliced_articles.map((article) => {
		const parts = [
			article.title,
			article.lead,
			...(article.paragraphs ?? []),
		].filter(
			(part): part is string =>
				typeof part === "string" && part.trim().length > 0,
		);

		// Return combined text or empty string
		return parts.length > 0 ? parts.join("\n\n") : "";
	});

	return {
		total_articles,
		articles: mapped_articles,
	};
}

/**
 * 4. The Extraction Function (Updated for AI SDK v6)
 */
async function extract_city(text: string) {
	// Note: generateObject is deprecated! We now use generateText with `output: Output.object()`
	const result = await generateText({
		model: lm_studio("gemma-4"),
		system: `You are an advanced NLP assistant specialized in Named Entity Recognition for the Slovenian language.
Your task is to extract exactly ONE CITY OR TOWN name from the provided text.

CRITICAL RULES:
1. ONLY extract a city or town (e.g., Ljubljana, Kijev, Moskva).
2. DO NOT extract countries (e.g., Slovenija, Ukrajina, ZDA, Rusija).
3. DO NOT extract continents, rivers, regions, or organizations (e.g., Evropa, Sava, Sumska oblast, Kremlj).
4. LEMMATIZATION: Return the city in Slovenian NOMINATIVE (base) case.
   - If text says "v Kijevu", return "Kijev".
   - If text says "iz Moskve", return "Moskva".
   - If text says "nad Brusljem", return "Bruselj".
5. If multiple cities appear, return the single most relevant city for the article.
6. If a city name is ambiguous across countries, prefer the city in Slovenia.
7. EDGE CASE: If there are absolutely no cities in the text, return an empty string.

EXAMPLES:

Input:
"Včeraj so v Kijevu in Moskvi potekali protesti. Evropska unija in ZDA so opazovale. Predsednik se je vrnil v Slovenijo preko reke Dneper."
Output:
{ "city": "Kijev" }

Input:
"Gospodarska rast se je umirila. Inflacija pada, kar je dobra novica za podjetja in državljane."
Output:
{ "city": "" }
`,
		prompt: `Extract one city from the following article text. If multiple cities are mentioned, choose the single most relevant one. If the city name is ambiguous, prefer the city in Slovenia. Return only a single city name or an empty string if none applies.\n\n${text}`,
		output: Output.object({ schema: city_schema }), // <-- The new v6 standard
		temperature: 0.1,
	});

	// Vercel AI natively parses the response and maps it to `result.output`
	return result.output.city;
}

/**
 * 5. Main Execution Script
 */
async function run_extraction() {
	const file_path = new URL("../assets/mmc-100.yaml", import.meta.url);
	const current_offset = 0;
	const batch_size = 10; // Process just the first article for testing

	try {
		console.log(`📂 Loading articles...`);

		const { total_articles, articles } = await load_articles(
			file_path,
			current_offset,
			batch_size,
		);

		console.log(`📊 Found a total of ${total_articles} articles in dataset.`);
		console.log(
			`🚀 Processing batch (Offset: ${current_offset}, Size: ${batch_size})...\n`,
		);

		for (const [index, article_text] of articles.entries()) {
			const global_index = current_offset + index + 1;

			if (!article_text) {
				console.log(`⚠️  Article ${global_index} is empty, skipping...`);
				continue;
			}

			console.log(`--- Article ${global_index} ---`);
			console.log(`${article_text.slice(0, 150)}...\n`);
			console.log("🤖 AI is analyzing text...");

			const start_time = performance.now();
			const city = await extract_city(article_text);
			const end_time = performance.now();

			console.log("✅ Extraction Complete!");
			console.log(
				`⏱️  Time taken: ${((end_time - start_time) / 1000).toFixed(2)} seconds`,
			);
			console.log(`🏙️  Extracted City: "${city || "(none)"}"\n`);
		}
	} catch (error) {
		console.error(
			"❌ Extraction failed. Ensure LM Studio is running on port 1234.",
			error,
		);
	}
}

run_extraction();
