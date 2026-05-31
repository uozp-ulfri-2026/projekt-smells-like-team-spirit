import { useQuery } from "@tanstack/react-query";

export interface LeanArticle {
  _id: string;
  date?: string;
  lead?: string;
  "llm-topic"?: string;
  title?: string;
  url?: string;
}

export interface CityProperties {
  city?: string;
  country?: string;
  ids?: string[];
  [key: string]: unknown;
}

export type CityFeature = GeoJSON.Feature<GeoJSON.Point, CityProperties>;
export type CityFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CityProperties
>;

export interface TimelineArticle {
  id: string;
  time: number;
}

export interface ArticlesData {
  byId: Record<string, LeanArticle>;
  timeline: TimelineArticle[];
}

export const EMPTY_GEOJSON: CityFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const STATIC_QUERY_OPTIONS = {
  gcTime: Number.POSITIVE_INFINITY,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: 1,
  staleTime: Number.POSITIVE_INFINITY,
} as const;

function canonicalizeTopic(topic: string | undefined): string | undefined {
  if (!topic) {
    return topic;
  }

  const normalizedTopic = topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  return normalizedTopic === "PROMETNE NESRECE"
    ? "NESRE\u010cE IN INCIDENTI"
    : topic;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}

export function parseArticleTime(article: LeanArticle): number | null {
  if (!article.date) {
    return null;
  }

  const time = Date.parse(article.date);
  return Number.isFinite(time) ? time : null;
}

export function buildArticlesData(rows: LeanArticle[]): ArticlesData {
  const byId: Record<string, LeanArticle> = {};
  const timeline: TimelineArticle[] = [];

  for (const article of rows) {
    if (!article || typeof article._id !== "string") {
      continue;
    }

    byId[article._id] = {
      ...article,
      "llm-topic": canonicalizeTopic(article["llm-topic"]),
    };

    const time = parseArticleTime(article);
    if (time !== null) {
      timeline.push({ id: article._id, time });
    }
  }

  timeline.sort((a, b) => a.time - b.time);

  return { byId, timeline };
}

export function useMmcArticles(articlePath: string) {
  return useQuery({
    ...STATIC_QUERY_OPTIONS,
    queryFn: () => fetchJson<LeanArticle[]>(articlePath),
    queryKey: ["mmc-articles", articlePath],
    select: buildArticlesData,
  });
}

export function useMmcGeoJson(geoJsonPath: string) {
  return useQuery({
    ...STATIC_QUERY_OPTIONS,
    queryFn: () => fetchJson<CityFeatureCollection>(geoJsonPath),
    queryKey: ["mmc-geojson", geoJsonPath],
  });
}
