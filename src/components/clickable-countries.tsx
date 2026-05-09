import { useEffect } from "react";
import { useMap } from "@/components/map";
import type { MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";

export interface CountryData {
    name: string;
    isoA3: string;
}

interface ClickableCountriesProps {
    onCountryClick?: (country: CountryData) => void;
}

export function ClickableCountries({ onCountryClick }: ClickableCountriesProps) {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!isLoaded || !map) return;

        const source_id = "countries-source";
        const layer_id = "countries-fill";

        if (!map.getSource(source_id)) {
            map.addSource(source_id, {
                type: "geojson",
                data: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/refs/heads/master/geojson/ne_50m_admin_0_countries.geojson",
                generateId: true,
            });

            map.addLayer({
                id: layer_id,
                type: "fill",
                source: source_id,
                paint: {
                    "fill-color": "#3b82f6", // A nice standard blue highlight
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.3,
                        0.0,
                    ],
                },
            });
        }

        let hovered_id: string | number | null = null;

        type MapEventWithFeatures = MapMouseEvent & { features?: MapGeoJSONFeature[] };

        const handle_mouse_move = (e: MapEventWithFeatures) => {
            if (e.features && e.features.length > 0) {
                if (hovered_id !== null) {
                    map.setFeatureState({ source: source_id, id: hovered_id }, { hover: false });
                }
                hovered_id = e.features[0].id ?? null;
                if (hovered_id !== null) {
                    map.setFeatureState({ source: source_id, id: hovered_id }, { hover: true });
                }
                map.getCanvas().style.cursor = "pointer";
            }
        };

        const handle_mouse_leave = () => {
            if (hovered_id !== null) {
                map.setFeatureState({ source: source_id, id: hovered_id }, { hover: false });
            }
            hovered_id = null;
            map.getCanvas().style.cursor = "";
        };

        const handle_click = (e: MapEventWithFeatures) => {
            if (e.features && e.features.length > 0 && onCountryClick) {
                const properties = e.features[0].properties;

                // Extract Natural Earth specific properties
                if (properties) {
                    onCountryClick({
                        name: properties.NAME,
                        isoA3: properties.ISO_A3,
                    });
                }
            }
        };

        map.on("mousemove", layer_id, handle_mouse_move);
        map.on("mouseleave", layer_id, handle_mouse_leave);
        map.on("click", layer_id, handle_click);

        return () => {
            map.off("mousemove", layer_id, handle_mouse_move);
            map.off("mouseleave", layer_id, handle_mouse_leave);
            map.off("click", layer_id, handle_click);

            // Ensure the map style is still valid before removing layers/sources
            if (map.getStyle()) {
                if (map.getLayer(layer_id)) map.removeLayer(layer_id);
                if (map.getSource(source_id)) map.removeSource(source_id);
            }
        };
    }, [map, isLoaded, onCountryClick]);

    return null;
}