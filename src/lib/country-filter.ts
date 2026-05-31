export type CountryFilterMode = "exclude" | "include";

export function normalizeCountryName(country: string): string {
  return country
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function buildNormalizedCountrySet(
  countries: readonly string[]
): ReadonlySet<string> {
  return new Set(countries.map(normalizeCountryName));
}

export function matchesCountryFilter(
  country: string,
  mode: CountryFilterMode,
  selectedCountries: ReadonlySet<string>
): boolean {
  const isSelected = selectedCountries.has(normalizeCountryName(country));
  return mode === "include" ? isSelected : !isSelected;
}
