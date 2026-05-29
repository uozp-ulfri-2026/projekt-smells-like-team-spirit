import {
  type ExpressionSpecification,
  type GeoJSONSource,
  LngLatBounds,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "@/components/map";
import { buildCountryArticleColorExpression } from "@/lib/country-article-scale";
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
  onCountryClick?: (country: CountryData) => void;
  selectedCountry?: CountryData | null;
  showChoropleth?: boolean;
}

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

const choropleth_fill_color = [
  ...buildCountryArticleColorExpression(),
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

function geometryBounds(
  geometry: GeoJSON.Geometry | null | undefined
): LngLatBounds | null {
  let bounds: LngLatBounds | null = null;

  const visit = (current: GeoJSON.Geometry | null | undefined) => {
    if (!current) {
      return;
    }

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
  showChoropleth = true,
}: ClickableCountriesProps) {
  const { map, isLoaded } = useMap();
  const selectedCountryName = selectedCountry?.name ?? null;
  const selectedCountryNameRef = useRef<string | null>(selectedCountryName);
  const onCountryClickRef = useRef<typeof onCountryClick>(onCountryClick);
  const previousSelectedCountryName = useRef<string | null>(null);
  const [countriesGeoJson, setCountriesGeoJson] =
    useState<CountriesFeatureCollection>(empty_countries_geojson);

  const countriesWithArticleCounts = useMemo<CountriesFeatureCollection>(
    () => ({
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
    }),
    [countriesGeoJson, countryArticleCounts]
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
          "fill-color": choropleth_fill_color,
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

    type MapEventWithFeatures = MapMouseEvent & {
      features?: MapGeoJSONFeature[];
    };

    const get_clickable_country_name = (feature: MapGeoJSONFeature) =>
      typeof feature.properties?.articleCountryName === "string"
        ? feature.properties.articleCountryName
        : getArticleCountryName(feature.properties);

    const handle_mouse_move = (e: MapEventWithFeatures) => {
      if (e.features && e.features.length > 0) {
        if (get_clickable_country_name(e.features[0]) === "Unknown") {
          if (hovered_id !== null) {
            map.setFeatureState(
              { source: source_id, id: hovered_id },
              { hover: false }
            );
          }
          hovered_id = null;
          map.getCanvas().style.cursor = "";
          return;
        }

        if (hovered_id !== null) {
          map.setFeatureState(
            { source: source_id, id: hovered_id },
            { hover: false }
          );
        }
        hovered_id = e.features[0].id ?? null;
        if (hovered_id !== null) {
          map.setFeatureState(
            { source: source_id, id: hovered_id },
            { hover: true }
          );
        }
        map.getCanvas().style.cursor = "pointer";
      }
    };

    const handle_mouse_leave = () => {
      if (hovered_id !== null) {
        map.setFeatureState(
          { source: source_id, id: hovered_id },
          { hover: false }
        );
      }
      hovered_id = null;
      map.getCanvas().style.cursor = "";
    };

    const handle_click = (e: MapEventWithFeatures) => {
      const currentOnCountryClick = onCountryClickRef.current;

      if (e.defaultPrevented || !currentOnCountryClick) {
        return;
      }

      if (e.features && e.features.length > 0) {
        const properties = e.features[0].properties;

        // Extract Natural Earth specific properties
        if (properties) {
          const name =
            typeof properties.articleCountryName === "string"
              ? properties.articleCountryName
              : getArticleCountryName(properties);
          if (name === "Unknown") {
            return;
          }
          if (name === selectedCountryNameRef.current) {
            return;
          }

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

          currentOnCountryClick({
            name,
            isoA3:
              typeof properties.ISO_A3 === "string" ? properties.ISO_A3 : "",
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
      fillColor = choropleth_fill_color;
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

    map.setPaintProperty(
      outline_layer_id,
      "line-color",
      outlineColor
    );
    map.setPaintProperty(
      outline_layer_id,
      "line-width",
      outlineWidth
    );
  }, [isLoaded, map, selectedCountryName, showChoropleth]);

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

    previousSelectedCountryName.current = selectedCountryName;
  }, [isLoaded, map, selectedCountryName]);

  return null;
}
