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

        const sourceId = "countries-source";
        const layerId = "countries-fill";

        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: "geojson",
                data: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/refs/heads/master/geojson/ne_50m_admin_0_countries.geojson",
                generateId: true,
            });

            map.addLayer({
                id: layerId,
                type: "fill",
                source: sourceId,
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

        let hoveredId: string | number | null = null;

        type MapEventWithFeatures = MapMouseEvent & { features?: MapGeoJSONFeature[] };

        const handleMouseMove = (e: MapEventWithFeatures) => {
            if (e.features && e.features.length > 0) {
                if (hoveredId !== null) {
                    map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
                }
                hoveredId = e.features[0].id ?? null;
                if (hoveredId !== null) {
                    map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: true });
                }
                map.getCanvas().style.cursor = "pointer";
            }
        };

        const handleMouseLeave = () => {
            if (hoveredId !== null) {
                map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
            }
            hoveredId = null;
            map.getCanvas().style.cursor = "";
        };

        const handleClick = (e: MapEventWithFeatures) => {
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

        map.on("mousemove", layerId, handleMouseMove);
        map.on("mouseleave", layerId, handleMouseLeave);
        map.on("click", layerId, handleClick);

        return () => {
            map.off("mousemove", layerId, handleMouseMove);
            map.off("mouseleave", layerId, handleMouseLeave);
            map.off("click", layerId, handleClick);

            // Ensure the map style is still valid before removing layers/sources
            if (map.getStyle()) {
                if (map.getLayer(layerId)) map.removeLayer(layerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            }
        };
    }, [map, isLoaded, onCountryClick]);

    return null;
}