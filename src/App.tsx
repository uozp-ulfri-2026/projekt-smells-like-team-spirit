import { useCallback, useEffect, useMemo, useState } from "react";
import ArticleCard from "@/components/article-card";
import type { CountryData } from "@/components/clickable-countries";
import { ClickableCountries } from "@/components/clickable-countries";
import { CountryDots } from "@/components/country-dots";
import Explorator from "@/components/explorator";
import { TimelineSlider } from "@/components/timeline-slider";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { COUNTRY_ARTICLE_COLOR_STOPS } from "@/lib/country-article-scale";
import { Map as MapComponent, MapControls } from "./components/map";
import { Card } from "./components/ui/card";
import { LineShadowText } from "./components/ui/line-shadow-text";

interface LeanArticle {
  _id: string;
  date?: string;
  lead?: string;
  "llm-topic"?: string;
  title?: string;
  url?: string;
}

interface CityProperties {
  city?: string;
  country?: string;
  ids?: string[];
  [key: string]: unknown;
}

type CityFeature = GeoJSON.Feature<GeoJSON.Point, CityProperties>;
type CityFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CityProperties
>;

interface TimelineArticle {
  id: string;
  time: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY_GEOJSON: CityFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function parseArticleTime(article: LeanArticle): number | null {
  if (!article.date) {
    return null;
  }
  const time = Date.parse(article.date);
  return Number.isFinite(time) ? time : null;
}

function formatTimelineDate(time: number | undefined): string {
  if (time === undefined) {
    return "";
  }
  return dateFormatter.format(new Date(time));
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function CountryColorLegend({ selectedTopic }: { selectedTopic: string }) {
  const gradient = `linear-gradient(90deg, ${COUNTRY_ARTICLE_COLOR_STOPS.map(
    (stop) => stop.color
  ).join(", ")})`;
  const ticks = COUNTRY_ARTICLE_COLOR_STOPS.filter((_, index) =>
    [0, 2, 4, 6, COUNTRY_ARTICLE_COLOR_STOPS.length - 1].includes(index)
  );

  return (
    <div className="absolute bottom-4 left-4 z-10 w-72 border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Articles by country</span>
        {selectedTopic !== "all" && (
          <span className="truncate text-muted-foreground">
            {selectedTopic}
          </span>
        )}
      </div>
      <div className="h-2" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {ticks.map((stop) => (
          <span key={stop.label}>{stop.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <main className="flex h-svh flex-col gap-8 overflow-hidden p-8 pb-28">
      {/* <h1 className="text-4xl font-bold text-center shrink-0">Slovenski svet</h1> */}
      <div className="prose flex shrink-0 items-center justify-center">
        <h1 className="text-balance font-semibold text-4xl leading-none tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          Slovenski
          <LineShadowText className="italic" shadowColor="white">
            Svet
          </LineShadowText>
        </h1>
      </div>
      <MyMap />
    </main>
  );
}

function MyMap() {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(
    null
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null
  );
  const [selectedDotArticleIds, setSelectedDotArticleIds] = useState<string[]>(
    []
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [baseGeoJson, setBaseGeoJson] = useState<CityFeatureCollection | null>(
    null
  );
  const [articlesById, setArticlesById] = useState<Record<string, LeanArticle>>(
    {}
  );
  const [timeline, setTimeline] = useState<TimelineArticle[]>([]);
  const [timelineRange, setTimelineRange] = useState<[number, number] | null>(
    null
  );
  const [timelineLoadError, setTimelineLoadError] = useState<string | null>(
    null
  );
  const [selectedTopic, setSelectedTopic] = useState("all");
  const debouncedTimelineRange = useDebouncedValue(timelineRange, 250);

  useEffect(() => {
    Promise.all([
      fetch("/output.geojson").then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch /output.geojson`
          );
        }
        return response.json() as Promise<CityFeatureCollection>;
      }),
      fetch("/mmc-lean.json").then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch /mmc-lean.json`
          );
        }
        return response.json() as Promise<LeanArticle[]>;
      }),
    ])
      .then(([geoJson, leanRows]) => {
        const byId: Record<string, LeanArticle> = {};
        const sortedTimeline: TimelineArticle[] = [];

        for (const article of leanRows) {
          if (!article || typeof article._id !== "string") {
            continue;
          }

          byId[article._id] = article;

          const time = parseArticleTime(article);
          if (time !== null) {
            sortedTimeline.push({ id: article._id, time });
          }
        }

        sortedTimeline.sort((a, b) => a.time - b.time);

        setBaseGeoJson(geoJson);
        setArticlesById(byId);
        setTimeline(sortedTimeline);
        setTimelineLoadError(null);
        setTimelineRange(
          sortedTimeline.length > 0
            ? [sortedTimeline[0].time, sortedTimeline.at(-1).time]
            : null
        );
      })
      .catch((error) => {
        console.error("Failed to initialize timeline data:", error);
        setBaseGeoJson(EMPTY_GEOJSON);
        setArticlesById({});
        setTimeline([]);
        setTimelineRange(null);
        setTimelineLoadError("Časovnice ni bilo mogoče naložiti.");
      });
  }, []);

  const articleTimeById = useMemo(() => {
    const byId = new Map<string, number>();

    for (const article of timeline) {
      byId.set(article.id, article.time);
    }

    return byId;
  }, [timeline]);

  const timelineBounds = useMemo(() => {
    if (timeline.length === 0) {
      return null;
    }

    return {
      min: timeline[0].time,
      max: timeline.at(-1).time,
    };
  }, [timeline]);

  const normalizedTimelineRange = useMemo<[number, number] | null>(() => {
    if (!(debouncedTimelineRange && timelineBounds)) {
      return null;
    }

    const [rawStart, rawEnd] = debouncedTimelineRange;
    const start = Math.max(
      timelineBounds.min,
      Math.min(rawStart, rawEnd, timelineBounds.max)
    );
    const end = Math.min(
      timelineBounds.max,
      Math.max(rawStart, rawEnd, timelineBounds.min)
    );

    return [start, end];
  }, [debouncedTimelineRange, timelineBounds]);

  const articleMatchesSelectedTopic = useCallback(
    (id: string) => {
      if (selectedTopic === "all") {
        return true;
      }

      const topic = articlesById[id]?.["llm-topic"] || "Brez teme";
      return topic === selectedTopic;
    },
    [articlesById, selectedTopic]
  );

  const filteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (!(baseGeoJson && normalizedTimelineRange)) {
      return EMPTY_GEOJSON;
    }

    const [start, end] = normalizedTimelineRange;
    const features: CityFeature[] = [];

    for (const feature of baseGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids)
        ? feature.properties.ids
        : [];
      const filteredIds = ids.filter((id) => {
        const time = articleTimeById.get(id);
        return time !== undefined && time >= start && time <= end;
      });

      if (filteredIds.length === 0) {
        continue;
      }

      features.push({
        ...feature,
        properties: {
          ...feature.properties,
          ids: filteredIds,
        },
      });
    }

    return {
      ...baseGeoJson,
      features,
    };
  }, [articleTimeById, baseGeoJson, normalizedTimelineRange]);

  const topicFilteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (selectedTopic === "all") {
      return filteredGeoJson;
    }

    const features: CityFeature[] = [];

    for (const feature of filteredGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids)
        ? feature.properties.ids
        : [];
      const filteredIds = ids.filter(articleMatchesSelectedTopic);

      if (filteredIds.length === 0) {
        continue;
      }

      features.push({
        ...feature,
        properties: {
          ...feature.properties,
          ids: filteredIds,
        },
      });
    }

    return {
      ...filteredGeoJson,
      features,
    };
  }, [articleMatchesSelectedTopic, filteredGeoJson, selectedTopic]);

  const timelineArticleCount = useMemo(() => {
    if (!(baseGeoJson && timelineRange && timelineBounds)) {
      return 0;
    }

    const [rawStart, rawEnd] = timelineRange;
    const start = Math.max(
      timelineBounds.min,
      Math.min(rawStart, rawEnd, timelineBounds.max)
    );
    const end = Math.min(
      timelineBounds.max,
      Math.max(rawStart, rawEnd, timelineBounds.min)
    );
    const visibleIds = new Set<string>();

    for (const feature of baseGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids)
        ? feature.properties.ids
        : [];

      for (const id of ids) {
        const time = articleTimeById.get(id);
        if (
          time !== undefined &&
          time >= start &&
          time <= end &&
          articleMatchesSelectedTopic(id)
        ) {
          visibleIds.add(id);
        }
      }
    }

    return visibleIds.size;
  }, [
    articleMatchesSelectedTopic,
    articleTimeById,
    baseGeoJson,
    timelineBounds,
    timelineRange,
  ]);

  const visibleArticleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const feature of topicFilteredGeoJson.features) {
      for (const id of feature.properties?.ids ?? []) {
        ids.add(id);
      }
    }
    return ids;
  }, [topicFilteredGeoJson]);

  const countryArticleCounts = useMemo(() => {
    const idsByCountry = new Map<string, Set<string>>();

    for (const feature of topicFilteredGeoJson.features) {
      const country = feature.properties?.country;
      if (typeof country !== "string") {
        continue;
      }

      let ids = idsByCountry.get(country);
      if (!ids) {
        ids = new Set<string>();
        idsByCountry.set(country, ids);
      }

      for (const id of feature.properties?.ids ?? []) {
        ids.add(id);
      }
    }

    return Object.fromEntries(
      Array.from(idsByCountry, ([country, ids]) => [country, ids.size])
    );
  }, [topicFilteredGeoJson]);

  useEffect(() => {
    if (selectedArticleId && !visibleArticleIds.has(selectedArticleId)) {
      setSelectedArticleId(null);
    }

    setSelectedDotArticleIds((ids) => {
      const nextIds = ids.filter((id) => visibleArticleIds.has(id));
      return nextIds.length === ids.length ? ids : nextIds;
    });
  }, [selectedArticleId, visibleArticleIds]);

  const handleCountryClick = useCallback((country: CountryData) => {
    setSelectedCountry(country);
    setSelectedArticleId(null);
    setSelectedDotArticleIds([]);
    setSidebarOpen(true);
  }, []);

  const handleDotClick = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    setSelectedDotArticleIds(ids);
    setSelectedArticleId(ids[0]);
    setSidebarOpen(true);
  }, []);

  const handleArticleSelect = useCallback((id: string) => {
    setSelectedArticleId(id);
    setSelectedDotArticleIds((ids) =>
      ids.length > 0 && ids.includes(id) ? ids : []
    );
  }, []);

  const handleClearSelectedDot = useCallback(() => {
    setSelectedDotArticleIds([]);
  }, []);

  const handleClearCountry = useCallback(() => {
    setSelectedCountry(null);
    setSelectedArticleId(null);
    setSelectedDotArticleIds([]);
  }, []);

  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      onOpenChange={setSidebarOpen}
      open={sidebarOpen}
    >
      {/* Explorator Sidebar */}
      <Explorator
        articlesById={articlesById}
        country={selectedCountry}
        geoJson={filteredGeoJson}
        onClearSelectedDot={handleClearSelectedDot}
        onSelectArticle={handleArticleSelect}
        onSelectedTopicChange={setSelectedTopic}
        selectedArticleId={selectedArticleId}
        selectedDotArticleIds={selectedDotArticleIds}
        selectedTopic={selectedTopic}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Card className="relative min-h-0 flex-1 overflow-hidden p-0">
          {selectedCountry && (
            <div className="absolute top-4 left-4 z-10 flex items-center justify-between gap-4 border bg-background px-4 py-2 font-semibold text-foreground shadow-md">
              <span>Selected: {selectedCountry.name}</span>
              <Button
                className="h-auto text-sm"
                onClick={handleClearCountry}
                size="sm"
                variant="link"
              >
                Clear
              </Button>
            </div>
          )}
          {!selectedCountry && (
            <CountryColorLegend selectedTopic={selectedTopic} />
          )}

          <MapComponent center={[14.5058, 46.0569]} zoom={4}>
            <MapControls position="top-right" />
            <ClickableCountries
              countryArticleCounts={countryArticleCounts}
              onCountryClick={handleCountryClick}
              selectedCountry={selectedCountry}
            />
            <CountryDots
              articlesById={articlesById}
              country={selectedCountry}
              data={topicFilteredGeoJson}
              onDotClick={handleDotClick}
              selectedArticleId={selectedArticleId}
            />
          </MapComponent>

          <ArticleCard
            id={selectedArticleId}
            onClose={() => setSelectedArticleId(null)}
          />
        </Card>

        {timelineRange && timelineBounds ? (
          <TimelineSlider
            articleCount={timelineArticleCount}
            endLabel={formatTimelineDate(
              Math.max(timelineRange[0], timelineRange[1])
            )}
            max={timelineBounds.max}
            min={timelineBounds.min}
            onValueChange={setTimelineRange}
            startLabel={formatTimelineDate(
              Math.min(timelineRange[0], timelineRange[1])
            )}
            step={DAY_MS}
            value={timelineRange}
          />
        ) : (
          <div className="fixed right-8 bottom-8 left-8 z-1000 border bg-background/95 px-4 py-3 text-muted-foreground text-xs shadow-md backdrop-blur">
            {timelineLoadError ?? "Nalaganje časovnice ..."}
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
