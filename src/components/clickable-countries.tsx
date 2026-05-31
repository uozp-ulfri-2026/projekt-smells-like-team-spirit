import {
  type ExpressionSpecification,
  type GeoJSONSource,
  LngLatBounds,
  type MapGeoJSONFeature,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "@/components/map";
import { buildCountryArticleColorExpression } from "@/lib/country-article-scale";
import {
  buildNormalizedCountrySet,
  type CountryFilterMode,
  matchesCountryFilter,
} from "@/lib/country-filter";
import { getArticleCountryName } from "@/lib/country-names";

export interface CountryData {
  isoA3: string;
  name: string;
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
  countryFilterMode?: CountryFilterMode;
  maxCountryArticleCount?: number;
  onCountryClick?: (country: CountryData) => void;
  selectedCountry?: CountryData | null;
  selectedCountryFilters?: string[];
  showChoropleth?: boolean;
}

type MapEventWithFeatures = MapMouseEvent & {
  features?: MapGeoJSONFeature[];
};

const source_id = "countries-source";
const layer_id = "countries-fill";
const selected_halo_layer_id = "countries-selected-halo";
const outline_layer_id = "countries-outline";
const overview_center: [number, number] = [14.5058, 46.0569];
const overview_zoom = 4;
const countries_geojson_url =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/refs/heads/master/geojson/ne_50m_admin_0_countries.geojson";

const empty_countries_geojson: CountriesFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const default_choropleth_fill_color = [
  ...buildCountryArticleColorExpression(0),
] as ExpressionSpecification;

const choropleth_fill_opacity = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  0.85,
  ["==", ["coalesce", ["get", "articleCount"], 0], 0],
  0.22,
  0.58,
] as ExpressionSpecification;

const neutral_fill_color = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  "#64748b",
  "#0f172a",
] as ExpressionSpecification;

const neutral_fill_opacity = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  0.2,
  0.03,
] as ExpressionSpecification;

const overview_outline_color = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  "#facc15",
  "rgba(0, 0, 0, 0)",
] as ExpressionSpecification;

const neutral_outline_color = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  "#94a3b8",
  "rgba(0, 0, 0, 0)",
] as ExpressionSpecification;

const overview_outline_width = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  1.5,
  0,
] as ExpressionSpecification;

const neutral_outline_width = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  1.25,
  0,
] as ExpressionSpecification;

function selectedFillColor(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    "#facc15",
    ["boolean", ["feature-state", "hover"], false],
    "#64748b",
    "#0f172a",
  ] as ExpressionSpecification;
}

function selectedFillOpacity(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    0.24,
    ["boolean", ["feature-state", "hover"], false],
    0.2,
    0.08,
  ] as ExpressionSpecification;
}

function selectedHaloColor(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    "#facc15",
    "rgba(0, 0, 0, 0)",
  ] as ExpressionSpecification;
}

function selectedHaloWidth(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    7,
    0,
  ] as ExpressionSpecification;
}

function selectedHaloOpacity(
  selectedCountryName: string | null
): ExpressionSpecification | number {
  if (!selectedCountryName) {
    return 0;
  }

  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    0.32,
    0,
  ] as ExpressionSpecification;
}

function selectedOutlineColor(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    "#facc15",
    ["boolean", ["feature-state", "hover"], false],
    "#94a3b8",
    "rgba(0, 0, 0, 0)",
  ] as ExpressionSpecification;
}

function selectedOutlineWidth(
  selectedCountryName: string
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "articleCountryName"], selectedCountryName],
    3,
    ["boolean", ["feature-state", "hover"], false],
    1.25,
    0,
  ] as ExpressionSpecification;
}

function extendBoundsWithPosition(
  bounds: LngLatBounds | null,
  position: GeoJSON.Position
): LngLatBounds | null {
  const [lng, lat] = position;
  if (!(Number.isFinite(lng) && Number.isFinite(lat))) {
    return bounds;
  }

  if (!bounds) {
    return new LngLatBounds([lng, lat], [lng, lat]);
  }

  bounds.extend([lng, lat]);
  return bounds;
}

function extendBoundsWithCoordinates(
  bounds: LngLatBounds | null,
  coordinates: unknown
): LngLatBounds | null {
  if (!Array.isArray(coordinates)) {
    return bounds;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return extendBoundsWithPosition(bounds, coordinates as GeoJSON.Position);
  }

  let nextBounds = bounds;
  for (const child of coordinates) {
    nextBounds = extendBoundsWithCoordinates(nextBounds, child);
  }

  return nextBounds;
}

function geometryBounds(
  geometry: GeoJSON.Geometry | null | undefined
): LngLatBounds | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "GeometryCollection") {
    let bounds: LngLatBounds | null = null;
    for (const child of geometry.geometries) {
      bounds = extendBoundsWithGeometry(bounds, child);
    }
    return bounds;
  }

  return extendBoundsWithCoordinates(null, geometry.coordinates);
}

function extendBoundsWithGeometry(
  bounds: LngLatBounds | null,
  geometry: GeoJSON.Geometry
): LngLatBounds | null {
  const nextBounds = geometryBounds(geometry);
  if (!nextBounds) {
    return bounds;
  }

  if (!bounds) {
    return nextBounds;
  }

  bounds.extend(nextBounds);
  return bounds;
}

function focusCountry(map: MapLibreMap, geometry: GeoJSON.Geometry) {
  const bounds = geometryBounds(geometry);
  if (!bounds) {
    return;
  }

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

function getClickableCountryName(feature: MapGeoJSONFeature): string {
  return typeof feature.properties?.articleCountryName === "string"
    ? feature.properties.articleCountryName
    : getArticleCountryName(feature.properties);
}

function getCountryData(feature: MapGeoJSONFeature): CountryData | null {
  const name = getClickableCountryName(feature);
  if (name === "Unknown") {
    return null;
  }

  return {
    name,
    isoA3:
      typeof feature.properties?.ISO_A3 === "string"
        ? feature.properties.ISO_A3
        : "",
  };
}

export function ClickableCountries({
  countryArticleCounts = {},
  countryFilterMode = "exclude",
  maxCountryArticleCount = 0,
  selectedCountry,
  selectedCountryFilters = [],
  onCountryClick,
  showChoropleth = true,
}: ClickableCountriesProps) {
  const { map, isLoaded } = useMap();
  const selectedCountryName = selectedCountry?.name ?? null;
  const selectedCountryNameRef = useRef<string | null>(selectedCountryName);
  const onCountryClickRef = useRef<typeof onCountryClick>(onCountryClick);
  const previousSelectedCountryName = useRef<string | null>(null);
  const [countriesGeoJson, setCountriesGeoJson] =
    useState<CountriesFeatureCollection>(empty_countries_geojson);
  const normalizedCountryFilters = useMemo(
    () => buildNormalizedCountrySet(selectedCountryFilters),
    [selectedCountryFilters]
  );
  const choroplethFillColor = useMemo(
    () =>
      [
        ...buildCountryArticleColorExpression(maxCountryArticleCount),
      ] as ExpressionSpecification,
    [maxCountryArticleCount]
  );

  const countriesWithArticleCounts = useMemo<CountriesFeatureCollection>(
    () => ({
      ...countriesGeoJson,
      features: countriesGeoJson.features.flatMap((feature) => {
        const properties = feature.properties ?? {};
        const articleCountryName = getArticleCountryName(properties);
        if (
          !matchesCountryFilter(
            articleCountryName,
            countryFilterMode,
            normalizedCountryFilters
          )
        ) {
          return [];
        }

        return [
          {
            ...feature,
            properties: {
              ...properties,
              articleCountryName,
              articleCount: countryArticleCounts[articleCountryName] ?? 0,
            },
          },
        ];
      }),
    }),
    [
      countriesGeoJson,
      countryArticleCounts,
      countryFilterMode,
      normalizedCountryFilters,
    ]
  );

  useEffect(() => {
    selectedCountryNameRef.current = selectedCountryName;
  }, [selectedCountryName]);

  useEffect(() => {
    onCountryClickRef.current = onCountryClick;
  }, [onCountryClick]);

  useEffect(() => {
    let cancelled = false;

    fetch(countries_geojson_url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch countries GeoJSON`
          );
        }
        return response.json() as Promise<CountriesFeatureCollection>;
      })
      .then((geoJson) => {
        if (!cancelled) {
          setCountriesGeoJson(geoJson);
        }
      })
      .catch((error) => {
        console.error("Failed to load countries GeoJSON:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!(isLoaded && map)) {
      return;
    }

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
          "fill-color": default_choropleth_fill_color,
          "fill-color-transition": { duration: 350 },
          "fill-opacity": choropleth_fill_opacity,
        },
      });
    }

    if (!map.getLayer(selected_halo_layer_id)) {
      map.addLayer({
        id: selected_halo_layer_id,
        type: "line",
        source: source_id,
        paint: {
          "line-color": "rgba(0, 0, 0, 0)",
          "line-width": 0,
          "line-opacity": 0,
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

    const clear_hovered_country = () => {
      if (hovered_id === null) {
        return;
      }

      map.setFeatureState(
        { source: source_id, id: hovered_id },
        { hover: false }
      );
      hovered_id = null;
    };

    const handle_mouse_move = (e: MapEventWithFeatures) => {
      const feature = e.features?.[0];
      if (!feature || getClickableCountryName(feature) === "Unknown") {
        clear_hovered_country();
        map.getCanvas().style.cursor = "";
        return;
      }

      clear_hovered_country();
      hovered_id = feature.id ?? null;
      if (hovered_id !== null) {
        map.setFeatureState(
          { source: source_id, id: hovered_id },
          { hover: true }
        );
      }
      map.getCanvas().style.cursor = "pointer";
    };

    const handle_mouse_leave = () => {
      clear_hovered_country();
      map.getCanvas().style.cursor = "";
    };

    const handle_click = (e: MapEventWithFeatures) => {
      const currentOnCountryClick = onCountryClickRef.current;

      const feature = e.features?.[0];
      if (e.defaultPrevented || !currentOnCountryClick || !feature) {
        return;
      }

      const country = getCountryData(feature);
      if (!country || country.name === selectedCountryNameRef.current) {
        return;
      }

      currentOnCountryClick(country);
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
        if (map.getLayer(outline_layer_id)) {
          map.removeLayer(outline_layer_id);
        }
        if (map.getLayer(selected_halo_layer_id)) {
          map.removeLayer(selected_halo_layer_id);
        }
        if (map.getLayer(layer_id)) {
          map.removeLayer(layer_id);
        }
        if (map.getSource(source_id)) {
          map.removeSource(source_id);
        }
      }
    };
  }, [map, isLoaded]);

  useEffect(() => {
    if (!(isLoaded && map)) {
      return;
    }

    const source = map.getSource(source_id) as GeoJSONSource | undefined;
    source?.setData(countriesWithArticleCounts);
  }, [countriesWithArticleCounts, isLoaded, map]);

  useEffect(() => {
    if (!(isLoaded && map?.getLayer(layer_id))) {
      return;
    }

    const shouldShowChoropleth = showChoropleth && !selectedCountryName;
    let fillColor = neutral_fill_color;
    let fillOpacity = neutral_fill_opacity;
    let outlineColor = neutral_outline_color;
    let outlineWidth = neutral_outline_width;

    if (shouldShowChoropleth) {
      fillColor = choroplethFillColor;
      fillOpacity = choropleth_fill_opacity;
      outlineColor = overview_outline_color;
      outlineWidth = overview_outline_width;
    } else if (selectedCountryName) {
      fillColor = selectedFillColor(selectedCountryName);
      fillOpacity = selectedFillOpacity(selectedCountryName);
      outlineColor = selectedOutlineColor(selectedCountryName);
      outlineWidth = selectedOutlineWidth(selectedCountryName);
    }

    map.setPaintProperty(layer_id, "fill-color", fillColor);
    map.setPaintProperty(layer_id, "fill-opacity", fillOpacity);

    if (!map.getLayer(outline_layer_id)) {
      return;
    }

    if (map.getLayer(selected_halo_layer_id)) {
      map.setPaintProperty(
        selected_halo_layer_id,
        "line-color",
        selectedCountryName
          ? selectedHaloColor(selectedCountryName)
          : "rgba(0, 0, 0, 0)"
      );
      map.setPaintProperty(
        selected_halo_layer_id,
        "line-width",
        selectedCountryName ? selectedHaloWidth(selectedCountryName) : 0
      );
      map.setPaintProperty(
        selected_halo_layer_id,
        "line-opacity",
        selectedHaloOpacity(selectedCountryName)
      );
    }

    map.setPaintProperty(outline_layer_id, "line-color", outlineColor);
    map.setPaintProperty(outline_layer_id, "line-width", outlineWidth);
  }, [choroplethFillColor, isLoaded, map, selectedCountryName, showChoropleth]);

  useEffect(() => {
    if (!(isLoaded && map)) {
      return;
    }

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

    if (
      selectedCountryName &&
      previousSelectedCountryName.current !== selectedCountryName
    ) {
      const feature = countriesWithArticleCounts.features.find(
        ({ properties }) =>
          properties?.articleCountryName === selectedCountryName
      );

      if (!feature) {
        return;
      }

      focusCountry(map, feature.geometry);
    }

    previousSelectedCountryName.current = selectedCountryName;
  }, [countriesWithArticleCounts.features, isLoaded, map, selectedCountryName]);

  return null;
}
