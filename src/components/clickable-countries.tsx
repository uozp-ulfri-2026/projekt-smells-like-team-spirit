import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "@/components/map";
import {
    LngLatBounds,
    type ExpressionSpecification,
    type GeoJSONSource,
    type MapMouseEvent,
    type MapGeoJSONFeature,
} from "maplibre-gl";
import { getArticleCountryName } from "@/lib/country-names";

export interface CountryData {
    name: string;
    isoA3: string;
}

type CountryProperties = Record<string, unknown> & {
    articleCountryName?: string;
    articleCount?: number;
    ISO_A3?: string;
};

type CountriesFeatureCollection = GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    CountryProperties
>;

interface ClickableCountriesProps {
    countryArticleCounts?: Record<string, number>;
    selectedCountry?: CountryData | null;
    onCountryClick?: (country: CountryData) => void;
}

const source_id = "countries-source";
const layer_id = "countries-fill";
const outline_layer_id = "countries-outline";
const overview_center: [number, number] = [14.5058, 46.0569];
const overview_zoom = 4;
const countries_geojson_url =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/refs/heads/master/geojson/ne_50m_admin_0_countries.geojson";

const empty_countries_geojson: CountriesFeatureCollection = {
    type: "FeatureCollection",
    features: [],
};

const choropleth_fill_color = [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "articleCount"], 0],
    0,
    "#334155",
    1,
    "#164e63",
    5,
    "#0f766e",
    25,
    "#14b8a6",
    100,
    "#eab308",
    500,
    "#facc15",
] as ExpressionSpecification;

const choropleth_fill_opacity = [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.85,
    ["==", ["coalesce", ["get", "articleCount"], 0], 0],
    0.22,
    0.58,
] as ExpressionSpecification;

const overview_outline_color = [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    "#facc15",
    "rgba(0, 0, 0, 0)",
] as ExpressionSpecification;

const overview_outline_width = [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    1.5,
    0,
] as ExpressionSpecification;

function selectedFillColor(selectedCountryName: string): ExpressionSpecification {
    return [
        "case",
        ["==", ["get", "articleCountryName"], selectedCountryName],
        "#facc15",
        ["boolean", ["feature-state", "hover"], false],
        "#64748b",
        "#0f172a",
    ] as ExpressionSpecification;
}

function selectedFillOpacity(selectedCountryName: string): ExpressionSpecification {
    return [
        "case",
        ["==", ["get", "articleCountryName"], selectedCountryName],
        0.16,
        ["boolean", ["feature-state", "hover"], false],
        0.2,
        0.1,
    ] as ExpressionSpecification;
}

function selectedOutlineColor(selectedCountryName: string): ExpressionSpecification {
    return [
        "case",
        ["==", ["get", "articleCountryName"], selectedCountryName],
        "#facc15",
        ["boolean", ["feature-state", "hover"], false],
        "#94a3b8",
        "rgba(0, 0, 0, 0)",
    ] as ExpressionSpecification;
}

function selectedOutlineWidth(selectedCountryName: string): ExpressionSpecification {
    return [
        "case",
        ["==", ["get", "articleCountryName"], selectedCountryName],
        2.5,
        ["boolean", ["feature-state", "hover"], false],
        1.25,
        0,
    ] as ExpressionSpecification;
}

function extendBoundsWithPosition(
    bounds: LngLatBounds | null,
    position: GeoJSON.Position,
): LngLatBounds | null {
    const [lng, lat] = position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return bounds;

    if (!bounds) {
        return new LngLatBounds([lng, lat], [lng, lat]);
    }

    bounds.extend([lng, lat]);
    return bounds;
}

function geometryBounds(geometry: GeoJSON.Geometry | null | undefined): LngLatBounds | null {
    let bounds: LngLatBounds | null = null;

    const visit = (current: GeoJSON.Geometry | null | undefined) => {
        if (!current) return;

        switch (current.type) {
            case "Point":
                bounds = extendBoundsWithPosition(bounds, current.coordinates);
                break;
            case "MultiPoint":
            case "LineString":
                for (const position of current.coordinates) {
                    bounds = extendBoundsWithPosition(bounds, position);
                }
                break;
            case "MultiLineString":
            case "Polygon":
                for (const line of current.coordinates) {
                    for (const position of line) {
                        bounds = extendBoundsWithPosition(bounds, position);
                    }
                }
                break;
            case "MultiPolygon":
                for (const polygon of current.coordinates) {
                    for (const line of polygon) {
                        for (const position of line) {
                            bounds = extendBoundsWithPosition(bounds, position);
                        }
                    }
                }
                break;
            case "GeometryCollection":
                for (const child of current.geometries) {
                    visit(child);
                }
                break;
        }
    };

    visit(geometry);
    return bounds;
}

export function ClickableCountries({
    countryArticleCounts = {},
    selectedCountry,
    onCountryClick,
}: ClickableCountriesProps) {
    const { map, isLoaded } = useMap();
    const selectedCountryName = selectedCountry?.name ?? null;
    const previousSelectedCountryName = useRef<string | null>(null);
    const [countriesGeoJson, setCountriesGeoJson] =
        useState<CountriesFeatureCollection>(empty_countries_geojson);

    const countriesWithArticleCounts = useMemo<CountriesFeatureCollection>(() => {
        return {
            ...countriesGeoJson,
            features: countriesGeoJson.features.map((feature) => {
                const properties = feature.properties ?? {};
                const articleCountryName = getArticleCountryName(properties);

                return {
                    ...feature,
                    properties: {
                        ...properties,
                        articleCountryName,
                        articleCount: countryArticleCounts[articleCountryName] ?? 0,
                    },
                };
            }),
        };
    }, [countriesGeoJson, countryArticleCounts]);

    useEffect(() => {
        let cancelled = false;

        fetch(countries_geojson_url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to fetch countries GeoJSON`);
                }
                return response.json() as Promise<CountriesFeatureCollection>;
            })
            .then((geoJson) => {
                if (!cancelled) setCountriesGeoJson(geoJson);
            })
            .catch((error) => {
                console.error("Failed to load countries GeoJSON:", error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isLoaded || !map) return;

        if (!map.getSource(source_id)) {
            map.addSource(source_id, {
                type: "geojson",
                data: empty_countries_geojson,
                generateId: true,
            });
        }

        if (!map.getLayer(layer_id)) {
            map.addLayer({
                id: layer_id,
                type: "fill",
                source: source_id,
                paint: {
                    "fill-color": choropleth_fill_color,
                    "fill-opacity": choropleth_fill_opacity,
                },
            });
        }

        if (!map.getLayer(outline_layer_id)) {
            map.addLayer({
                id: outline_layer_id,
                type: "line",
                source: source_id,
                paint: {
                    "line-color": overview_outline_color,
                    "line-width": overview_outline_width,
                    "line-opacity": 1,
                },
            });
        }

        let hovered_id: string | number | null = null;

        type MapEventWithFeatures = MapMouseEvent & { features?: MapGeoJSONFeature[] };

        const get_clickable_country_name = (feature: MapGeoJSONFeature) => {
            return (
                typeof feature.properties?.articleCountryName === "string"
                    ? feature.properties.articleCountryName
                    : getArticleCountryName(feature.properties)
            );
        };

        const handle_mouse_move = (e: MapEventWithFeatures) => {
            if (e.features && e.features.length > 0) {
                if (get_clickable_country_name(e.features[0]) === "Unknown") {
                    if (hovered_id !== null) {
                        map.setFeatureState({ source: source_id, id: hovered_id }, { hover: false });
                    }
                    hovered_id = null;
                    map.getCanvas().style.cursor = "";
                    return;
                }

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
                    const name =
                        typeof properties.articleCountryName === "string"
                            ? properties.articleCountryName
                            : getArticleCountryName(properties);
                    if (name === "Unknown") return;

                    const bounds = geometryBounds(e.features[0].geometry);
                    if (bounds) {
                        const leftPadding = window.innerWidth >= 1024 ? 320 : 80;
                        map.fitBounds(bounds, {
                            padding: {
                                top: 96,
                                right: 96,
                                bottom: 128,
                                left: leftPadding,
                            },
                            maxZoom: 7.5,
                            duration: 900,
                            essential: true,
                        });
                    }

                    onCountryClick({
                        name,
                        isoA3: typeof properties.ISO_A3 === "string" ? properties.ISO_A3 : "",
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
                if (map.getLayer(outline_layer_id)) map.removeLayer(outline_layer_id);
                if (map.getLayer(layer_id)) map.removeLayer(layer_id);
                if (map.getSource(source_id)) map.removeSource(source_id);
            }
        };
    }, [map, isLoaded, onCountryClick]);

    useEffect(() => {
        if (!isLoaded || !map) return;

        const source = map.getSource(source_id) as GeoJSONSource | undefined;
        source?.setData(countriesWithArticleCounts);
    }, [countriesWithArticleCounts, isLoaded, map]);

    useEffect(() => {
        if (!isLoaded || !map?.getLayer(layer_id)) return;

        const showChoropleth = !selectedCountryName;
        map.setPaintProperty(
            layer_id,
            "fill-color",
            showChoropleth ? choropleth_fill_color : selectedFillColor(selectedCountryName)
        );
        map.setPaintProperty(
            layer_id,
            "fill-opacity",
            showChoropleth ? choropleth_fill_opacity : selectedFillOpacity(selectedCountryName)
        );

        if (!map.getLayer(outline_layer_id)) return;

        map.setPaintProperty(
            outline_layer_id,
            "line-color",
            showChoropleth ? overview_outline_color : selectedOutlineColor(selectedCountryName)
        );
        map.setPaintProperty(
            outline_layer_id,
            "line-width",
            showChoropleth ? overview_outline_width : selectedOutlineWidth(selectedCountryName)
        );
    }, [isLoaded, map, selectedCountryName]);

    useEffect(() => {
        if (!isLoaded || !map) return;

        if (previousSelectedCountryName.current && !selectedCountryName) {
            map.easeTo({
                center: overview_center,
                zoom: overview_zoom,
                bearing: 0,
                pitch: 0,
                duration: 900,
                essential: true,
            });
        }

        previousSelectedCountryName.current = selectedCountryName;
    }, [isLoaded, map, selectedCountryName]);

    return null;
}
