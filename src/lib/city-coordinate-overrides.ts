type Coordinate = [number, number];

const CITY_COORDINATE_OVERRIDES: Record<string, Coordinate> = {
	"slovenia|ilirska bistrica": [14.24571, 45.56757],
};

function normalizePlaceName(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const normalized = value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

	return normalized.length > 0 ? normalized : null;
}

export function getCityCoordinateOverride(
	country: unknown,
	city: unknown,
): Coordinate | null {
	const normalizedCountry = normalizePlaceName(country);
	const normalizedCity = normalizePlaceName(city);

	if (!normalizedCountry || !normalizedCity) return null;

	return CITY_COORDINATE_OVERRIDES[
		`${normalizedCountry}|${normalizedCity}`
	] ?? null;
}
