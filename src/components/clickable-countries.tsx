import { useEffect } from "react";
import { useMap } from "@/components//map";

export function ClickableCountries({ onCountryClick }: { onCountryClick?: (name: string) => void }) {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        // Wait until the base map style is fully loaded
        if (!isLoaded || !map) return;

        const sourceId = "countries-source";
        const layerId = "countries-fill";

        // 1. Add a super lightweight (~250kb) generalized map, NOT a heavy dataset
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: "geojson",
                data: "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
                generateId: true, // Crucial: lets us use MapLibre's blazing fast feature-state hover
            });

            // 2. Add a fill layer. It is invisible until hovered.
            map.addLayer({
                id: layerId,
                type: "fill",
                source: sourceId,
                paint: {
                    "fill-color": "hsl(var(--primary))", // Seamlessly uses your Shadcn primary color
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.3, // Opacity when hovered
                        0.0, // Invisible when not hovered
                    ],
                },
            });
        }

        let hoveredId: string | number | null = null;

        // 3. WebGL event listeners (No React state updates here = max performance)
        const handleMouseMove = (e: any) => {
            if (e.features.length > 0) {
                if (hoveredId !== null) {
                    map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
                }
                hoveredId = e.features[0].id;
                map.setFeatureState({ source: sourceId, id: hoveredId ?? undefined }, { hover: true });
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

        const handleClick = (e: any) => {
            if (e.features.length > 0 && onCountryClick) {
                onCountryClick(e.features[0].properties.name);
            }
        };

        map.on("mousemove", layerId, handleMouseMove);
        map.on("mouseleave", layerId, handleMouseLeave);
        map.on("click", layerId, handleClick);

        // Cleanup on unmount
        return () => {
            map.off("mousemove", layerId, handleMouseMove);
            map.off("mouseleave", layerId, handleMouseLeave);
            map.off("click", layerId, handleClick);

            try {
                if (map.getLayer(layerId)) map.removeLayer(layerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            } catch (err) { /* ignore */ }
        };
    }, [map, isLoaded, onCountryClick]);

    return null; // This component doesn't render HTML, it controls WebGL
}