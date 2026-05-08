import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import YAML from "yaml";
import { z } from "zod";

const lm_studio = createOpenAI({
	baseURL: "http://localhost:1234/v1",
	apiKey: "not-needed-for-local",
});

const extraction_schema = z.object({
	topic: z.enum([
		"politika",
		"vojna_in_konflikti",
		"naravne_nesrece",
		"nesrece_in_kriminal",
		"sport",
		"kultura",
		"zabava",
		"tehnologija",
		"gospodarstvo",
		"zdravje",
		"okolje",
		"turizem",
		"drugo",
	]),
	country: z.string().nullable(),
	city: z.string().nullable(),
});

type ArticleCleaned = {
	_id?: string;
	title?: string;
	lead?: string;
	paragraphs?: Array<string>;
	keywords?: Array<string>;
	gpt_keywords?: Array<string>;
};

type LoadedArticle = {
	_id: string;
	text: string;
};

type ArticleLoadResult = {
	total_articles: number;
	articles: LoadedArticle[];
};

type ExtractionOutput = z.infer<typeof extraction_schema>;

type SavedExtraction = {
	_id: string;
	uid: string;
	topic: ExtractionOutput["topic"];
	country: string | null;
	city: string | null;
};

async function load_articles(
	file_path: string | URL,
	offset: number = 0,
	size?: number,
): Promise<ArticleLoadResult> {
	const raw_text = await readFile(file_path, "utf8");
	const parsed_yaml = YAML.parse(raw_text) as unknown;

	const article_list = Array.isArray(parsed_yaml)
		? (parsed_yaml as ArticleCleaned[])
		: [parsed_yaml as ArticleCleaned];

	const total_articles = article_list.length;
	const sliced_articles =
		typeof size === "number"
			? article_list.slice(offset, offset + size)
			: article_list.slice(offset);

	const mapped_articles = sliced_articles.map((article, index) => {
		const id = String(article._id ?? offset + index + 1);

		const parts = [
			article.title ? `title:\n${article.title}` : "",
			article.lead ? `lead:\n${article.lead}` : "",
			article.paragraphs && article.paragraphs.length > 0
				? `paragraphs:\n${article.paragraphs.slice(0, 6).join("\n\n")}`
				: "",
			article.keywords && article.keywords.length > 0
				? `keywords:\n${article.keywords.join(", ")}`
				: "",
			article.gpt_keywords && article.gpt_keywords.length > 0
				? `gpt_keywords:\n${article.gpt_keywords.join(", ")}`
				: "",
		].filter((part) => part.trim().length > 0);

		return {
			_id: id,
			text: parts.length > 0 ? parts.join("\n\n").slice(0, 7000) : "",
		};
	});

	return {
		total_articles,
		articles: mapped_articles,
	};
}

function getNextOutputPath(): string {
	const outDir = new URL("../assets/ai/", import.meta.url);
	let index = 0;
	while (
		existsSync(
			new URL(`output${String(index).padStart(2, "0")}.json`, outDir),
		)
	) {
		index += 1;
	}
	return fileURLToPath(
		new URL(`output${String(index).padStart(2, "0")}.json`, outDir),
	);
}

async function appendSavedResult(
	outputPath: string,
	entry: SavedExtraction,
): Promise<void> {
	await mkdir(new URL("../assets/ai/", import.meta.url), { recursive: true });

	let results: SavedExtraction[] = [];
	if (existsSync(outputPath)) {
		const existing = await readFile(outputPath, "utf8");
		results = JSON.parse(existing) as SavedExtraction[];
	}

	results.push(entry);
	await writeFile(outputPath, JSON.stringify(results, null, 2), "utf8");
}

async function appendErrorId(_id: string): Promise<void> {
	const errorPath = fileURLToPath(
		new URL("../assets/ai/error-responses.json", import.meta.url),
	);
	await mkdir(new URL("../assets/ai/", import.meta.url), { recursive: true });

	let ids: string[] = [];
	if (existsSync(errorPath)) {
		const existing = await readFile(errorPath, "utf8");
		ids = JSON.parse(existing) as string[];
	}

	if (!ids.includes(_id)) {
		ids.push(_id);
		await writeFile(errorPath, JSON.stringify(ids, null, 2), "utf8");
	}
}

async function extract_article_data(article: LoadedArticle) {
	const result = await generateText({
		model: lm_studio("gemma-4"),
		system: `You are an information extraction system for Slovenian MMC news articles.

Your task is to extract only:
1. the main topic of the article,
2. the country where the main event happened,
3. the city/place where the main event happened.

The articles are written in Slovenian.

Do not extract all mentioned countries or places.
Extract only the location of the main event described in the article.

Allowed topics are only:
politika, vojna_in_konflikti, naravne_nesrece, prometne_nesrece, kriminal, sport, kultura, zabava, tehnologija, gospodarstvo, zdravje, okolje, turizem, gastronomija,drugo.

Topic rules:
- Choose the topic based on the main event of the article, not based on random mentioned words.
- If the article is mainly about government, elections, laws, parliament, diplomacy, presidents or ministers, use politika.
- If it is about war, military attacks, armed conflict, occupation, weapons or soldiers, use vojna_in_konflikti.
- If it is about earthquakes, floods, storms, wildfires or weather disasters, use naravne_nesrece.
- If it is about murders, police, crime, trials or courts, use kriminal.
- If it is about traffic accidents, car crashes, road incidents or transportation disasters, use prometne_nesrece.
- If it is about food, restaurants, cooking or culinary arts, use gastronomija.
- If it is about sports competitions, teams, athletes or matches, use sport.
- If it is about art, books, theatre, museums, exhibitions, festivals or film as art, use kultura.
- If it is about celebrities, show business, TV shows, popular music or entertainment, use zabava.
- If it is about science, AI, computers, space, software, devices or inventions, use tehnologija.
- If it is about companies, prices, markets, inflation, finance, business or jobs, use gospodarstvo.
- If it is about diseases, hospitals, medicine, treatment or public health, use zdravje.
- If it is about climate, pollution, ecology, environmental protection or nature conservation, use okolje.
- If it is about travel, destinations, holidays, tourists or tourism, use turizem.
- If none of the topics fit, use drugo. 
- I repeat. Do not under any circumstances invent a topic that is not supported. If you are not sure, use drugo.

Location rules:
- Extract the country and place where the main event happened.
- Ignore countries and places that are only mentioned as background or context.
- The title and lead are more important than later paragraphs.
- If the exact place is clearly mentioned, return it.
- If only the country is known, return the country and set "kraj" to null.
- Do not invent a place.
- If the country cannot be determined, set "drzava" to null.
- If the place cannot be determined, set "kraj" to null.
- Return country and place names in Slovenian when possible, for example "Nemčija", "Avstrija", "Združene države Amerike", "Ukrajina".
- Be careful about typos in your output. The country and place names should be correct and properly spelled.
- Make sure that the city is actually in the mentioned country. Do not mismatch them.
- If you have infered the city, make sure to also return the country. Try not to return a city without a country. If you are not sure about the city, it is better to return only the country.

Return only a valid JSON object.
Do not return a JSON array.
Do not add explanations.
Do not add confidence.
Do not add sentiment.
Do not add extra fields.

Output format:
{
	"topic": "...",
	"country": "...",
	"city": "..."
}

Examples:

Input:
_id: 1
title:
Močno neurje povzročilo poplave v Avstriji
lead:
Zaradi obilnega deževja so morali evakuirati več krajev na severu Avstrije.
paragraphs:
Najhuje je bilo v okolici Linza, kjer so reke prestopile bregove.
Output:
{
	"topic": "naravne_nesrece",
	"country": "Avstrija",
	"city": "Linz"
}

Input:
_id: 2
title:
Rusija ponoči napadla Kijev
lead:
Ukrajinske oblasti poročajo o več eksplozijah v prestolnici.
paragraphs:
O napadu so razpravljali tudi predstavniki Evropske unije in ZDA.
Output:
{
	"topic": "vojna_in_konflikti",
	"country": "Ukrajina",
	"city": "Kijev"
}

Input:
_id: 3
title:
Inflacija v evrskem območju se umirja
lead:
Podjetja in potrošniki pričakujejo stabilnejše cene.
paragraphs:
Analitiki opozarjajo, da razmere še niso povsem stabilne.
Output:
{
	"topic": "gospodarstvo",
	"country": null,
	"city": null
}`,
		prompt: `Extract the main topic, country and place from this Slovenian MMC article. Return only the required JSON object.\n\n${article.text}`,
		output: Output.object({ schema: extraction_schema }),
		temperature: 0.1,
	});

	return result.output;
}

async function run_extraction() {
	const file_path = process.argv[2]
		? process.argv[2]
		: new URL("../assets/cleaned/mmc-10.json", import.meta.url);
	const current_offset = 0;

	try {
		console.log(`📂 Loading articles...`);

		const { total_articles, articles } = await load_articles(
			file_path,
			current_offset,
		);

		console.log(`📊 Found a total of ${total_articles} articles in dataset.`);
		console.log(
			`Processing all articles (Offset: ${current_offset}, Count: ${articles.length})...\n`,
		);

		const outputPath = getNextOutputPath();
		console.log(`📝 Output file: ${outputPath}`);

		const batch_start_time = performance.now();
		let processed_articles = 0;

		for (const [index, article] of articles.entries()) {
			const global_index = current_offset + index + 1;

			if (!article.text) {
				console.log(`⚠️  Article ${global_index} is empty, skipping...`);
				continue;
			}

			console.log(`--- Article ${global_index} ---`);
			console.log(`${article.text.slice(0, 150)}...\n`);
			console.log("🤖 AI is analyzing text...");

			try {
				const start_time = performance.now();
				const extracted = await extract_article_data(article);
				const end_time = performance.now();
				processed_articles += 1;

				const saved: SavedExtraction = {
					_id: article._id,
					uid: article._id,
					topic: extracted.topic,
					country: extracted.country,
					city: extracted.city,
				};

				await appendSavedResult(outputPath, saved);

				console.log("✅ Extraction Complete!");
				console.log(
					`⏱️  Time taken: ${((end_time - start_time) / 1000).toFixed(2)} seconds`,
				);
				console.log(`🆔 ID: "${article._id}"`);
				console.log(`🏷️  Extracted Topic: "${extracted.topic}"`);
				console.log(
					`🌍 Extracted Country: "${extracted.country || "(none)"}"`,
				);
				console.log(`🏙️  Extracted City: "${extracted.city || "(none)"}"\n`);
			} catch (extractError) {
				console.error(`❌ Error on _id ${article._id}:`, extractError);
				await appendErrorId(article._id);
			}
		}

		const batch_end_time = performance.now();
		console.log(
			`Total time for ${processed_articles} articles: ${((batch_end_time - batch_start_time) / 1000).toFixed(2)} seconds`,
		);
	} catch (error) {
		console.error(
			"❌ Extraction failed. Ensure LM Studio is running on port 1234.",
			error,
		);
	}
}

run_extraction();
