import { useEffect, useId, useMemo, useRef } from "react";
import { useMap } from "@/components/map";
import type { CountryData } from "@/components/clickable-countries";
import type { GeoJSONSource, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { getTopicStyle } from "@/lib/topic-colors";
import { getCityCoordinateOverride } from "@/lib/city-coordinate-overrides";

type LeanArticle = {
	_id: string;
	"llm-topic"?: string;
};

type DotProperties = {
	city?: string;
	country?: string;
	ids?: string[];
	articleCount?: number;
	cityTopicCount?: number;
	primaryArticleId?: string;
	primaryTopic?: string;
	topicColor?: string;
	isSelected?: boolean;
	[key: string]: unknown;
};

type CountryDotsProps = {
	country: CountryData | null;
	data: GeoJSON.FeatureCollection<GeoJSON.Point, DotProperties>;
	articlesById: Record<string, LeanArticle>;
	selectedArticleId: string | null;
	onDotClick?: (ids: string[]) => void;
};

function parseIds(idsRaw: unknown): string[] {
	if (Array.isArray(idsRaw)) return idsRaw.map(String);

	if (typeof idsRaw === "string") {
		try {
			const parsed = JSON.parse(idsRaw);
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			// MapLibre can expose a single string when the property was serialized.
		}

		return [idsRaw];
	}

	return idsRaw == null ? [] : [String(idsRaw)];
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const KM_PER_LATITUDE_DEGREE = 110.574;
const KM_PER_LONGITUDE_DEGREE = 111.32;

function getFeatureCoordinates(
	feature: GeoJSON.Feature<GeoJSON.Point, DotProperties>,
): [number, number] {
	const override = getCityCoordinateOverride(
		feature.properties?.country,
		feature.properties?.city,
	);
	if (override) return override;

	const [lng, lat] = feature.geometry.coordinates;
	return [lng, lat];
}

function offsetTopicCoordinates(
	coordinates: GeoJSON.Position,
	index: number,
	total: number,
): [number, number] {
	const [lng, lat] = coordinates;
	if (total <= 1 || !Number.isFinite(lng) || !Number.isFinite(lat)) {
		return [lng, lat];
	}

	const angle = index * GOLDEN_ANGLE - Math.PI / 2;
	const radiusKm = Math.min(0.9, 0.18 + total * 0.045);
	const latitudeRadians = lat * Math.PI / 180;
	const lngScale = KM_PER_LONGITUDE_DEGREE * Math.max(0.2, Math.cos(latitudeRadians));

	return [
		lng + Math.cos(angle) * radiusKm / lngScale,
		lat + Math.sin(angle) * radiusKm / KM_PER_LATITUDE_DEGREE,
	];
}

export function CountryDots({
	country,
	data,
	articlesById,
	selectedArticleId,
	onDotClick,
}: CountryDotsProps) {
	const { map, isLoaded } = useMap();
	const id = useId();
	const source_id = `country-dots-source-${id}`;
	const layer_id = `country-dots-layer-${id}`;
	const pulse_layer_id = `country-dots-pulse-layer-${id}`;
	const hovered_id_ref = useRef<string | number | null>(null);

	const country_name = useMemo(
		() => country?.name ?? null,
		[country],
	);

	const enrichedData = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, DotProperties>>(() => {
		if (!country_name) {
			return {
				...data,
				features: [],
			};
		}

		const features: GeoJSON.Feature<GeoJSON.Point, DotProperties>[] = [];

		for (const feature of data.features) {
			if (feature.properties?.country !== country_name) continue;

			const ids = Array.from(new Set(parseIds(feature.properties?.ids)));
			const groupedIdsByTopic = new Map<string, string[]>();

			for (const articleId of ids) {
				const primaryTopic = articlesById[articleId]?.["llm-topic"] || "Brez teme";
				const topicIds = groupedIdsByTopic.get(primaryTopic);
				if (topicIds) {
					topicIds.push(articleId);
				} else {
					groupedIdsByTopic.set(primaryTopic, [articleId]);
				}
			}

			const topicGroups = Array.from(groupedIdsByTopic.entries()).sort(
				([leftTopic, leftIds], [rightTopic, rightIds]) =>
					rightIds.length - leftIds.length || leftTopic.localeCompare(rightTopic, "sl"),
			);
			const cityTopicCount = topicGroups.length;

			topicGroups.forEach(([primaryTopic, topicIds], index) => {
				const primaryArticleId =
					selectedArticleId && topicIds.includes(selectedArticleId)
						? selectedArticleId
						: topicIds[0];
				const topicColor = getTopicStyle(primaryTopic).color;
				const baseCoordinates = getFeatureCoordinates(feature);
				const coordinates = offsetTopicCoordinates(
					baseCoordinates,
					index,
					cityTopicCount,
				);

				features.push({
					...feature,
					id: [
						feature.properties?.country ?? "",
						feature.properties?.city ?? "",
						primaryTopic,
						baseCoordinates.join(","),
					].join(":"),
					geometry: {
						...feature.geometry,
						coordinates,
					},
					properties: {
						...feature.properties,
						ids: topicIds,
						articleCount: topicIds.length,
						cityTopicCount,
						primaryArticleId,
						primaryTopic,
						topicColor,
						isSelected: selectedArticleId ? topicIds.includes(selectedArticleId) : false,
					},
				});
			});
		}

		return {
			...data,
			features,
		};
	}, [articlesById, country_name, data, selectedArticleId]);

	useEffect(() => {
		if (!isLoaded || !map) return;

		if (!map.getSource(source_id)) {
			map.addSource(source_id, {
				type: "geojson",
				data: enrichedData,
				generateId: true,
			});

			map.addLayer({
				id: pulse_layer_id,
				type: "circle",
				source: source_id,
				filter: ["==", ["get", "isSelected"], true],
				paint: {
					"circle-color": ["coalesce", ["get", "topicColor"], "#f97316"],
					"circle-radius": 9,
					"circle-opacity": 0.16,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 1,
				},
			});

			map.addLayer({
				id: layer_id,
				type: "circle",
				source: source_id,
				paint: {
					"circle-color": ["coalesce", ["get", "topicColor"], "#f97316"],
					"circle-radius": [
						"case",
						["boolean", ["get", "isSelected"], false],
						[
							"interpolate",
							["linear"],
							["coalesce", ["get", "articleCount"], 1],
							1,
							7,
							5,
							7.8,
							25,
							9,
							100,
							10,
						],
						["boolean", ["feature-state", "hover"], false],
						[
							"interpolate",
							["linear"],
							["coalesce", ["get", "articleCount"], 1],
							1,
							5.6,
							5,
							6.4,
							25,
							7.6,
							100,
							8.6,
						],
						[
							"interpolate",
							["linear"],
							["coalesce", ["get", "articleCount"], 1],
							1,
							4.2,
							5,
							5,
							25,
							6.2,
							100,
							7.2,
						],
					],
					"circle-opacity": [
						"case",
						["boolean", ["get", "isSelected"], false],
						1,
						["boolean", ["feature-state", "hover"], false],
						1,
						0.88,
					],
					"circle-stroke-width": [
						"case",
						["boolean", ["get", "isSelected"], false],
						2.5,
						["boolean", ["feature-state", "hover"], false],
						2,
						1.2,
					],
					"circle-stroke-color": [
						"case",
						["boolean", ["get", "isSelected"], false],
						"#ffffff",
						["boolean", ["feature-state", "hover"], false],
						"#ffffff",
						"rgba(255, 255, 255, 0.85)",
					],
				},
			});
		}

		return () => {
			try {
				if (map.getLayer(layer_id)) map.removeLayer(layer_id);
				if (map.getLayer(pulse_layer_id)) map.removeLayer(pulse_layer_id);
				if (map.getSource(source_id)) map.removeSource(source_id);
			} catch {
				// ignore cleanup races during style swaps
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded, map, source_id, layer_id, pulse_layer_id]);

	useEffect(() => {
		if (!isLoaded || !map) return;

		const source = map.getSource(source_id) as GeoJSONSource | undefined;
		source?.setData(enrichedData);

		if (hovered_id_ref.current !== null) {
			map.setFeatureState(
				{ source: source_id, id: hovered_id_ref.current },
				{ hover: false },
			);
			hovered_id_ref.current = null;
		}
	}, [isLoaded, map, source_id, enrichedData]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(layer_id)) return;

		type MapEventWithFeatures = MapMouseEvent & { features?: MapGeoJSONFeature[] };

		const handleClick = (e: MapEventWithFeatures) => {
			try {
				e.preventDefault();
				e.originalEvent.stopPropagation();

				const features = e.features;
				if (!features || features.length === 0) return;
				const props = features[0].properties as Record<string, any>;
				const ids = parseIds(props?.ids);
				const primaryArticleId = props?.primaryArticleId;

				if (typeof primaryArticleId === "string" && ids.includes(primaryArticleId)) {
					ids.sort((left, right) => {
						if (left === primaryArticleId) return -1;
						if (right === primaryArticleId) return 1;
						return 0;
					});
				}

				if (onDotClick) onDotClick(ids);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("country-dots click handler error:", err);
			}
		};

		map.on("click", layer_id, handleClick);

		return () => {
			map.off("click", layer_id, handleClick);
		};
	}, [isLoaded, map, layer_id, onDotClick]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(layer_id) || !map.getLayer(pulse_layer_id)) return;

		if (!country_name) {
			map.setLayoutProperty(layer_id, "visibility", "none");
			map.setLayoutProperty(pulse_layer_id, "visibility", "none");
			return;
		}

		map.setLayoutProperty(layer_id, "visibility", "visible");
		map.setLayoutProperty(pulse_layer_id, "visibility", "visible");
		map.setFilter(layer_id, ["==", ["get", "country"], country_name]);
		map.setFilter(pulse_layer_id, [
			"all",
			["==", ["get", "country"], country_name],
			["==", ["get", "isSelected"], true],
		]);
	}, [isLoaded, map, layer_id, pulse_layer_id, country_name]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(layer_id)) return;

		type MapEventWithFeatures = MapMouseEvent & { features?: MapGeoJSONFeature[] };

		const setHover = (nextId: string | number | null) => {
			if (nextId === hovered_id_ref.current) return;

			if (hovered_id_ref.current !== null) {
				map.setFeatureState(
					{ source: source_id, id: hovered_id_ref.current },
					{ hover: false },
				);
			}

			hovered_id_ref.current = nextId;

			if (nextId !== null) {
				map.setFeatureState({ source: source_id, id: nextId }, { hover: true });
			}
		};

		const onMouseMove = (e: MapEventWithFeatures) => {
			setHover(e.features?.[0]?.id ?? null);
			map.getCanvas().style.cursor = "pointer";
		};

		const onMouseLeave = () => {
			setHover(null);
			map.getCanvas().style.cursor = "";
		};

		map.on("mousemove", layer_id, onMouseMove);
		map.on("mouseleave", layer_id, onMouseLeave);

		return () => {
			map.off("mousemove", layer_id, onMouseMove);
			map.off("mouseleave", layer_id, onMouseLeave);
			setHover(null);
		};
	}, [isLoaded, map, source_id, layer_id]);

	useEffect(() => {
		if (!isLoaded || !map?.getLayer(pulse_layer_id) || !selectedArticleId) return;

		let frame = 0;

		const animate = (time: number) => {
			if (!map.getLayer(pulse_layer_id)) return;

			const wave = (Math.sin(time / 260) + 1) / 2;
			map.setPaintProperty(pulse_layer_id, "circle-radius", 8 + wave * 5);
			map.setPaintProperty(pulse_layer_id, "circle-opacity", 0.24 - wave * 0.16);
			frame = window.requestAnimationFrame(animate);
		};

		frame = window.requestAnimationFrame(animate);

		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, [isLoaded, map, pulse_layer_id, selectedArticleId]);

	return null;
}
