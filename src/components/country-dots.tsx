import { useEffect, useId, useMemo } from "react";
import { useMap } from "@/components/map";
import type { CountryData } from "@/components/clickable-countries";

type CountryDotsProps = {
	country: CountryData | null;
};

function getLocalizedCountryName(country: CountryData | null): string | null {
	if (!country) return null;

	try {
		const displayNames = new Intl.DisplayNames(["sl"], { type: "region" });
		return displayNames.of(country.isoA3) ?? country.name;
	} catch {
		return country.name;
	}
}

export function CountryDots({ country }: CountryDotsProps) {
	const { map, isLoaded } = useMap();
	const id = useId();
	const source_id = `country-dots-source-${id}`;
	const layer_id = `country-dots-layer-${id}`;

	const localized_country_name = useMemo(
		() => getLocalizedCountryName(country),
		[country],
	);

	useEffect(() => {
		if (!isLoaded || !map) return;

		if (!map.getSource(source_id)) {
			map.addSource(source_id, {
				type: "geojson",
				data: "/output.geojson",
			});

			map.addLayer({
				id: layer_id,
				type: "circle",
				source: source_id,
				paint: {
					"circle-color": "#f97316",
					"circle-radius": [
						"interpolate",
						["linear"],
						["get", "count"],
						1,
						4,
						5,
						6,
						25,
						10,
						100,
						16,
					],
					"circle-opacity": 0.85,
					"circle-stroke-width": 1.5,
					"circle-stroke-color": "#ffffff",
				},
			});
		}

		return () => {
			try {
				if (map.getLayer(layer_id)) map.removeLayer(layer_id);
				if (map.getSource(source_id)) map.removeSource(source_id);
			} catch {
				// ignore cleanup races during style swaps
			}
		};
	}, [isLoaded, map, source_id, layer_id]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(layer_id)) return;

		if (!localized_country_name) {
			map.setLayoutProperty(layer_id, "visibility", "none");
			return;
		}

		map.setLayoutProperty(layer_id, "visibility", "visible");
		map.setFilter(layer_id, ["==", ["get", "country"], localized_country_name]);
	}, [isLoaded, map, layer_id, localized_country_name]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(layer_id)) return;

		const onMouseEnter = () => {
			map.getCanvas().style.cursor = "pointer";
		};

		const onMouseLeave = () => {
			map.getCanvas().style.cursor = "";
		};

		map.on("mouseenter", layer_id, onMouseEnter);
		map.on("mouseleave", layer_id, onMouseLeave);

		return () => {
			map.off("mouseenter", layer_id, onMouseEnter);
			map.off("mouseleave", layer_id, onMouseLeave);
		};
	}, [isLoaded, map, layer_id]);

	return null;
}