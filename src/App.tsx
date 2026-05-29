import { CircleDot, Map as MapIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArticleCard from "@/components/article-card";
import type { CountryData } from "@/components/clickable-countries";
import { ClickableCountries } from "@/components/clickable-countries";
import { CountryDots } from "@/components/country-dots";
import Explorator from "@/components/explorator";
import { TimelineSlider } from "@/components/timeline-slider";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { COUNTRY_ARTICLE_COLOR_STOPS } from "@/lib/country-article-scale";
import {
  type CityFeature,
  type CityFeatureCollection,
  EMPTY_GEOJSON,
  useMmcArticles,
  useMmcGeoJson,
} from "@/lib/mmc-data";
import { Map as MapComponent, MapControls } from "./components/map";
import { Card } from "./components/ui/card";
import { LineShadowText } from "./components/ui/line-shadow-text";

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTOPLAY_INTERVAL_MS = 450;
const AUTOPLAY_TARGET_STEPS = 140;
const AUTOPLAY_DEFAULT_WINDOW_MS = 180 * DAY_MS;
const AUTOPLAY_MIN_WINDOW_MS = 30 * DAY_MS;

type DatasetId = "v2" | "old";
type MapDisplayMode = "dots" | "heatmap";

const DATASETS: Record<
  DatasetId,
  { articlePath: string; geoJsonPath: string }
> = {
  v2: {
    articlePath: "/mmc-lean.v6.json",
    geoJsonPath: "/output.v6.geojson",
  },
  old: {
    articlePath: "/mmc-lean.old.json",
    geoJsonPath: "/output.old.geojson",
  },
};

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatTimelineDate(time: number | undefined): string {
  if (time === undefined) {
    return "";
  }
  return dateFormatter.format(new Date(time));
}

function getSelectedDataset(): {
  id: DatasetId;
  articlePath: string;
  geoJsonPath: string;
} {
  const params = new URLSearchParams(window.location.search);
  const requestedDataset = params.get("dataset");
  const id: DatasetId = requestedDataset === "old" ? "old" : "v2";

  return {
    id,
    ...DATASETS[id],
  };
}

function normalizeTimelineRange(
  range: [number, number],
  bounds: { min: number; max: number }
): [number, number] {
  const [rawStart, rawEnd] = range;
  const start = Math.max(bounds.min, Math.min(rawStart, rawEnd, bounds.max));
  const end = Math.min(bounds.max, Math.max(rawStart, rawEnd, bounds.min));

  return [start, end];
}

function getPlaybackWindowMs(
  range: [number, number],
  bounds: { min: number; max: number }
): number {
  const total = Math.max(DAY_MS, bounds.max - bounds.min);
  const [start, end] = normalizeTimelineRange(range, bounds);
  const currentWindow = Math.max(DAY_MS, end - start);

  if (currentWindow < total * 0.95) {
    return Math.min(currentWindow, total);
  }

  return Math.min(
    total,
    AUTOPLAY_DEFAULT_WINDOW_MS,
    Math.max(AUTOPLAY_MIN_WINDOW_MS, total / 8)
  );
}

function getPlaybackStepMs(bounds: { min: number; max: number }): number {
  const total = Math.max(DAY_MS, bounds.max - bounds.min);
  const rawStep = total / AUTOPLAY_TARGET_STEPS;
  return Math.max(DAY_MS, Math.round(rawStep / DAY_MS) * DAY_MS);
}

function buildPlaybackStartRange(
  range: [number, number],
  bounds: { min: number; max: number }
): [number, number] {
  const [start, end] = normalizeTimelineRange(range, bounds);
  const total = Math.max(DAY_MS, bounds.max - bounds.min);
  const windowMs = getPlaybackWindowMs(range, bounds);
  const coversWholeTimeline = end - start >= total * 0.95;
  const isAtEnd = end >= bounds.max - DAY_MS;

  if (coversWholeTimeline || isAtEnd) {
    return [bounds.min, Math.min(bounds.max, bounds.min + windowMs)];
  }

  return [start, Math.min(bounds.max, start + windowMs)];
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

function MapDisplayToggle({
  mode,
  onModeChange,
}: {
  mode: MapDisplayMode;
  onModeChange: (mode: MapDisplayMode) => void;
}) {
  return (
    <fieldset className="absolute top-2 right-12 z-20 flex overflow-hidden border border-border bg-background shadow-sm">
      <legend className="sr-only">Map display mode</legend>
      <Button
        aria-pressed={mode === "dots"}
        className="h-8 border-0 px-2"
        onClick={() => onModeChange("dots")}
        title="Dots"
        type="button"
        variant={mode === "dots" ? "default" : "ghost"}
      >
        <CircleDot className="size-4" />
        <span className="hidden sm:inline">Dots</span>
      </Button>
      <Button
        aria-pressed={mode === "heatmap"}
        className="h-8 border-0 px-2"
        onClick={() => onModeChange("heatmap")}
        title="Heatmap"
        type="button"
        variant={mode === "heatmap" ? "default" : "ghost"}
      >
        <MapIcon className="size-4" />
        <span className="hidden sm:inline">Heatmap</span>
      </Button>
    </fieldset>
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

export function MyMap() {
  const dataset = useMemo(() => getSelectedDataset(), []);
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
  const [timelineRange, setTimelineRange] = useState<[number, number] | null>(
    null
  );
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [mapDisplayMode, setMapDisplayMode] =
    useState<MapDisplayMode>("heatmap");
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const timelineRangeRef = useRef<[number, number] | null>(timelineRange);
  const debouncedTimelineRange = useDebouncedValue(timelineRange, 250);
  const { data: geoJsonData, error: geoJsonError } = useMmcGeoJson(
    dataset.geoJsonPath
  );
  const { data: articlesData, error: articlesError } = useMmcArticles(
    dataset.articlePath
  );
  const baseGeoJson = geoJsonData ?? EMPTY_GEOJSON;
  const articlesById = articlesData?.byId ?? {};
  const timeline = articlesData?.timeline ?? [];
  const timelineLoadError =
    geoJsonError || articlesError ? "Casovnice ni bilo mogoce naloziti." : null;

  useEffect(() => {
    timelineRangeRef.current = timelineRange;
  }, [timelineRange]);

  useEffect(() => {
    if (timeline.length === 0) {
      setTimelineRange(null);
      return;
    }

    setTimelineRange((currentRange) => {
      if (currentRange !== null) {
        return currentRange;
      }

      return [timeline[0].time, timeline.at(-1)?.time ?? 0];
    });
  }, [timeline]);

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
      max: timeline?.at(-1)?.time ?? 0,
    };
  }, [timeline]);

  useEffect(() => {
    if (!(timelineBounds && timelineRange)) {
      setIsTimelinePlaying(false);
    }
  }, [timelineBounds, timelineRange]);

  useEffect(() => {
    if (!(isTimelinePlaying && timelineBounds)) {
      return;
    }

    const interval = window.setInterval(() => {
      const currentRange = timelineRangeRef.current;
      if (!currentRange) {
        setIsTimelinePlaying(false);
        return;
      }

      const windowMs = getPlaybackWindowMs(currentRange, timelineBounds);
      const stepMs = getPlaybackStepMs(timelineBounds);
      const [start] = normalizeTimelineRange(currentRange, timelineBounds);
      const nextStart = Math.min(
        timelineBounds.max - windowMs,
        Math.max(timelineBounds.min, start + stepMs)
      );
      const nextEnd = Math.min(timelineBounds.max, nextStart + windowMs);
      const nextRange: [number, number] = [nextStart, nextEnd];

      timelineRangeRef.current = nextRange;
      setTimelineRange(nextRange);

      if (nextEnd >= timelineBounds.max) {
        setIsTimelinePlaying(false);
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isTimelinePlaying, timelineBounds]);

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

  const handleTimelineRangeChange = useCallback((value: [number, number]) => {
    setIsTimelinePlaying(false);
    setTimelineRange(value);
  }, []);

  const handleTimelinePlayPause = useCallback(() => {
    if (!(timelineBounds && timelineRange)) {
      return;
    }

    setIsTimelinePlaying((playing) => {
      if (playing) {
        return false;
      }

      const nextRange = buildPlaybackStartRange(timelineRange, timelineBounds);
      timelineRangeRef.current = nextRange;
      setTimelineRange(nextRange);
      return true;
    });
  }, [timelineBounds, timelineRange]);

  const handleTimelineRestart = useCallback(() => {
    if (!(timelineBounds && timelineRange)) {
      return;
    }

    const windowMs = getPlaybackWindowMs(timelineRange, timelineBounds);
    const nextRange: [number, number] = [
      timelineBounds.min,
      Math.min(timelineBounds.max, timelineBounds.min + windowMs),
    ];

    timelineRangeRef.current = nextRange;
    setTimelineRange(nextRange);
    setIsTimelinePlaying(false);
  }, [timelineBounds, timelineRange]);

  const handleClearCountry = useCallback(() => {
    setSelectedCountry(null);
    setSelectedArticleId(null);
    setSelectedDotArticleIds([]);
  }, []);

  const handleMapDisplayModeChange = useCallback((mode: MapDisplayMode) => {
    setMapDisplayMode(mode);

    if (mode === "dots") {
      setSelectedCountry(null);
      setSelectedDotArticleIds([]);
    }
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
          {selectedCountry && mapDisplayMode === "heatmap" && (
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
          {!selectedCountry && mapDisplayMode === "heatmap" && (
            <CountryColorLegend selectedTopic={selectedTopic} />
          )}

          <MapComponent center={[14.5058, 46.0569]} zoom={4}>
            <MapDisplayToggle
              mode={mapDisplayMode}
              onModeChange={handleMapDisplayModeChange}
            />
            <MapControls position="top-right" />
            <ClickableCountries
              countryArticleCounts={countryArticleCounts}
              onCountryClick={
                mapDisplayMode === "heatmap" ? handleCountryClick : undefined
              }
              selectedCountry={
                mapDisplayMode === "heatmap" ? selectedCountry : null
              }
              showChoropleth={mapDisplayMode === "heatmap"}
            />
            <CountryDots
              articlesById={articlesById}
              country={selectedCountry}
              data={topicFilteredGeoJson}
              onDotClick={handleDotClick}
              selectedArticleId={selectedArticleId}
              showAllCountries={mapDisplayMode === "dots"}
            />
          </MapComponent>

          <ArticleCard
            articlePath={dataset.articlePath}
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
            isPlaying={isTimelinePlaying}
            max={timelineBounds.max}
            min={timelineBounds.min}
            onPlayPause={handleTimelinePlayPause}
            onRestart={handleTimelineRestart}
            onValueChange={handleTimelineRangeChange}
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
