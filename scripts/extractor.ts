import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// 1. Configure Vercel AI SDK to point to LM Studio
const lmstudio = createOpenAI({
	baseURL: "http://localhost:1234/v1",
	apiKey: "not-needed-for-local", // LM Studio doesn't require an API key
});

// 2. Define the Structured Output Schema using Zod
const CitySchema = z.object({
	cities: z
		.array(z.string())
		.describe(
			"List of extracted cities in their base nominative form (e.g. 'Ljubljana'). Empty array if none.",
		),
});

// 3. The Extraction Function
async function extractCities(text: string) {
	console.log("Robots are thinking...");

	const { object } = await generateObject({
		// Replace 'gemma-4' with the exact model identifier if your LM Studio requires it,
		// or just leave it (LM Studio usually routes to the currently loaded model).
		model: lmstudio("gemma-4"),
		schema: CitySchema,
		system: `You are an advanced NLP assistant specialized in Named Entity Recognition for the Slovenian language.
Your task is to extract ONLY CITY AND TOWN names from the provided text.

CRITICAL RULES:
1. ONLY extract cities or towns (e.g., Ljubljana, Kijev, Moskva).
2. DO NOT extract countries (e.g., Slovenija, Ukrajina, ZDA, Rusija).
3. DO NOT extract continents, rivers, or regions (e.g., Evropa, Sava, Sumska oblast).
4. LEMMATIZATION: Return all extracted cities in their Slovenian NOMINATIVE (base) case. 
   - If text says "v Kijevu", return "Kijev". 
   - If text says "iz Moskve", return "Moskva".
   - If text says "nad Brusljem", return "Bruselj".
5. EDGE CASE: If there are absolutely no cities in the text, return an empty array[].

EXAMPLES:

Input:
"Včeraj so v Kijevu in Moskvi potekali protesti. Evropska unija in ZDA so opazovale. Predsednik se je vrnil v Slovenijo preko reke Dneper."
Output:
{ "cities": ["Kijev", "Moskva"] }

Input:
"Gospodarska rast se je umirila. Inflacija pada, kar je dobra novica za podjetja in državljane."
Output:
{ "cities":[] }
`,
		prompt: `Extract the cities from the following article text:\n\n${text}`,
		// LM Studio handles structured outputs best when temperatures are low
		temperature: 0.1,
	});

	return object.cities;
}

// 4. Test it with the data you provided
async function main() {
	// Using a snippet from your mmc-1.txt file
	const articleText = `
    "Vojaška operacija proti Kijevu se nadaljuje," je novinarjem povedal tiskovni predstavnik Kremlja Dmitrij Peskov. 
    Ukrajinski predsednik Volodimir Zelenski je na izrednem zasedanju Evropskega parlamenta v Bruslju poudaril, da je treba pritisniti na Moskvo.
    Sodelovanje med Evropo in ZDA je ključno za čezatlantsko varnost, je v Varšavi dejal poljski zunanji minister.
    Tudi v Londonu so napovedali novo vojaško pomoč Kijevu.
    V napadu je bil uničen študentski dom v mestu Gluhiv, je sporočil Zelenski.
    Nov napad se je zgodil, potem ko je bilo v ponedeljek v ruskem raketnem napadu na pristaniško mesto Odesa ubitih deset ljudi.
    V ruskem napadu z brezpilotnimi letalniki na Sumsko oblast na severovzhodu Ukrajine je bilo ubitih najmanj osem ljudi.
  `;

	try {
		const start = performance.now();
		const cities = await extractCities(articleText);
		const end = performance.now();

		console.log("\n✅ Extraction Complete!");
		console.log(`⏱️  Time taken: ${((end - start) / 1000).toFixed(2)} seconds`);
		console.log("🏙️  Extracted Cities:", cities);

		/* 
      EXPECTED OUTPUT:[ 'Kijev', 'Bruselj', 'Moskva', 'Varšava', 'London', 'Gluhiv', 'Odesa' ]
      
      Notice what it should IGNORE based on our prompt rules:
      - 'Evropa' (Continent)
      - 'ZDA' (Country)
      - 'Kremlja' (Building/Government)
      - 'Sumska oblast' (Region)
      - 'Ukrajine' (Country)
    */
	} catch (error) {
		console.error(
			"Extraction failed. Check if LM Studio is running on port 1234.",
			error,
		);
	}
}

main();
