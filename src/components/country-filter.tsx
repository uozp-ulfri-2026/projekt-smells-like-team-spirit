import { Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCountryDisplayName } from "@/lib/country-display-names";
import type { CountryFilterMode } from "@/lib/country-filter";

interface CountryFilterProps {
  countries: string[];
  mode: CountryFilterMode;
  onModeChange: (mode: CountryFilterMode) => void;
  onSelectedCountriesChange: (countries: string[]) => void;
  selectedCountries: string[];
}

function getSummary(mode: CountryFilterMode, selectedCount: number): string {
  if (selectedCount === 0) {
    return mode === "include" ? "Ni izbranih držav" : "Vse države";
  }

  return mode === "include"
    ? `Izbrane: ${selectedCount}`
    : `Izključene: ${selectedCount}`;
}

function sortCountries(countries: readonly string[]): string[] {
  return [...countries].sort((left, right) =>
    getCountryDisplayName(left).localeCompare(
      getCountryDisplayName(right),
      "sl"
    )
  );
}

export function CountryFilter({
  countries,
  mode,
  onModeChange,
  onSelectedCountriesChange,
  selectedCountries,
}: CountryFilterProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => new Set(selectedCountries),
    [selectedCountries]
  );
  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortCountries(countries);
    }

    return sortCountries(
      countries.filter((country) =>
        getCountryDisplayName(country).toLowerCase().includes(normalizedQuery)
      )
    );
  }, [countries, query]);

  const handleCountryChange = (country: string) => {
    const nextCountries = new Set(selected);
    if (nextCountries.has(country)) {
      nextCountries.delete(country);
    } else {
      nextCountries.add(country);
    }
    onSelectedCountriesChange(Array.from(nextCountries));
  };

  return (
    <details className="group border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-xs [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">Filter držav</span>
        </span>
        <span className="truncate text-muted-foreground">
          {getSummary(mode, selectedCountries.length)}
        </span>
      </summary>

      <div className="space-y-2 border-t p-2">
        <div className="grid grid-cols-2 gap-1">
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={() => onModeChange("exclude")}
            size="sm"
            type="button"
            variant={mode === "exclude" ? "default" : "outline"}
          >
            Izključi
          </Button>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={() => onModeChange("include")}
            size="sm"
            type="button"
            variant={mode === "include" ? "default" : "outline"}
          >
            Prikaži le izbrane
          </Button>
        </div>

        <Input
          className="h-7 text-xs"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Poišči države ..."
          value={query}
        />

        <ScrollArea className="h-40 border">
          <div className="space-y-0.5 p-1">
            {visibleCountries.map((country) => (
              <label
                className="flex cursor-pointer items-center gap-2 px-1.5 py-1 text-xs hover:bg-muted"
                key={country}
              >
                <input
                  checked={selected.has(country)}
                  className="size-3.5 accent-primary"
                  onChange={() => handleCountryChange(country)}
                  type="checkbox"
                />
                <span className="truncate">
                  {getCountryDisplayName(country)}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {mode === "exclude"
              ? "Označene države so skrite."
              : "Prikazane so le označene države."}
          </span>
          {selectedCountries.length > 0 && (
            <Button
              className="h-auto shrink-0 gap-1 p-0 text-[11px]"
              onClick={() => onSelectedCountriesChange([])}
              size="sm"
              type="button"
              variant="link"
            >
              <RotateCcw className="size-3" />
              Počisti
            </Button>
          )}
        </div>
      </div>
    </details>
  );
}
