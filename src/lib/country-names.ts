const OUTPUT_COUNTRY_BY_ISO_A3: Record<string, string> = {
	COG: "Congo-Brazzaville",
	CZE: "Czechia",
	FLK: "Falkland Islands",
	FRO: "Faroe Islands",
	KOR: "South Korea",
	LAO: "Laos",
	PRK: "North Korea",
	PSE: "Palestinian Territories",
	RUS: "Russia",
	SGS: "South Georgia and the South Sandwich Islands",
	TLS: "East Timor",
	USA: "United States",
	VAT: "Vatican City",
};

const OUTPUT_COUNTRY_BY_NATURAL_EARTH_NAME: Record<string, string> = {
	"Dem. Rep. Korea": "North Korea",
	"Falkland Islands / Malvinas": "Falkland Islands",
	"Lao PDR": "Laos",
	Palestine: "Palestinian Territories",
	"Republic of Korea": "South Korea",
	"Republic of the Congo": "Congo-Brazzaville",
	"Russian Federation": "Russia",
	"South Georgia and the Islands": "South Georgia and the South Sandwich Islands",
	"Timor-Leste": "East Timor",
	"United States of America": "United States",
	Vatican: "Vatican City",
};

function asString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

export function getArticleCountryName(
	properties: Record<string, unknown> | null | undefined,
): string {
	const isoA3 =
		asString(properties?.ISO_A3) ??
		asString(properties?.ADM0_A3) ??
		asString(properties?.ADM0_A3_EH);

	if (isoA3 && OUTPUT_COUNTRY_BY_ISO_A3[isoA3]) {
		return OUTPUT_COUNTRY_BY_ISO_A3[isoA3];
	}

	const naturalEarthName =
		asString(properties?.NAME_LONG) ??
		asString(properties?.NAME) ??
		asString(properties?.ADMIN) ??
		asString(properties?.NAME_EN);

	if (!naturalEarthName) return "Unknown";

	return (
		OUTPUT_COUNTRY_BY_NATURAL_EARTH_NAME[naturalEarthName] ?? naturalEarthName
	);
}
