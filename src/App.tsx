import { CircleDot, Map as MapIcon, Moon, Settings, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArticleCard from "@/components/article-card";
import type { CountryData } from "@/components/clickable-countries";
import { ClickableCountries } from "@/components/clickable-countries";
import { CountryDots } from "@/components/country-dots";
import Explorator from "@/components/explorator";
import type { SubtopicOption } from "@/components/subtopic-filter";
import { TimelineSlider } from "@/components/timeline-slider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  buildCountryArticleLegendTicks,
  COUNTRY_ARTICLE_COLOR_STOPS,
} from "@/lib/country-article-scale";
import { getCountryDisplayName } from "@/lib/country-display-names";
import {
  buildNormalizedCountrySet,
  type CountryFilterMode,
  matchesCountryFilter,
} from "@/lib/country-filter";
import {
  type CityFeature,
  type CityFeatureCollection,
  EMPTY_GEOJSON,
  useMmcArticles,
  useMmcGeoJson,
} from "@/lib/mmc-data";
import { DEFAULT_SUBTOPIC } from "@/lib/subtopics";
import { getTopicStyle } from "@/lib/topic-colors";
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
type ColorMode = "dark" | "light";

const DATASETS: Record<
  DatasetId,
  { articlePath: string; geoJsonPath: string }
> = {
  v2: {
    articlePath:
      "https://f003.backblazeb2.com/file/slovenski-svet/mmc-lean.v6.json",
    geoJsonPath:
      "https://f003.backblazeb2.com/file/slovenski-svet/output.v6.geojson",
  },
  old: {
    articlePath:
      "https://f003.backblazeb2.com/file/slovenski-svet/mmc-lean.old.json",
    geoJsonPath:
      "https://f003.backblazeb2.com/file/slovenski-svet/output.old.geojson",
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

function CountryColorLegend({
  maxArticleCount,
  selectedTopic,
}: {
  maxArticleCount: number;
  selectedTopic: string;
}) {
  const gradient = `linear-gradient(90deg, ${COUNTRY_ARTICLE_COLOR_STOPS.map(
    (stop) => `${stop.color} ${stop.ratio * 100}%`
  ).join(", ")})`;
  const ticks = buildCountryArticleLegendTicks(maxArticleCount);

  return (
    <div className="absolute bottom-4 left-4 z-10 w-72 border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Novice po državah</span>
        {selectedTopic !== "all" && (
          <span className="truncate text-muted-foreground">
            {getTopicStyle(selectedTopic).label}
          </span>
        )}
      </div>
      <div className="h-2" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {ticks.map((stop) => (
          <span key={`${stop.count}-${stop.label}`}>{stop.label}</span>
        ))}
      </div>
    </div>
  );
}

function getInitialColorMode(): ColorMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function SettingSwitch({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t py-3">
      <span className="text-foreground text-sm">{label}</span>
      <button
        aria-checked={checked}
        aria-label={label}
        className="inline-flex h-6 w-11 items-center border bg-muted px-0.5 transition-colors aria-checked:bg-primary"
        onClick={() => onCheckedChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`size-4 bg-background shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function PageToolbar({
  mode,
  onModeChange,
  colorMode,
  onColorModeChange,
  showCountryThemeStats,
  onShowCountryThemeStatsChange,
  showSubtopics,
  onShowSubtopicsChange,
  showTimeSlider,
  onShowTimeSliderChange,
}: {
  mode: MapDisplayMode;
  onModeChange: (mode: MapDisplayMode) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  showCountryThemeStats: boolean;
  onShowCountryThemeStatsChange: (checked: boolean) => void;
  showSubtopics: boolean;
  onShowSubtopicsChange: (checked: boolean) => void;
  showTimeSlider: boolean;
  onShowTimeSliderChange: (checked: boolean) => void;
}) {
  const isHeatmap = mode === "heatmap";

  return (
    <div className="fixed top-8 right-8 z-40 flex gap-1.5">
      <button
        aria-checked={isHeatmap}
        aria-label="Preklopi prikaz pik ali toplotnega zemljevida"
        className="flex h-8 items-center gap-1.5 border bg-background px-2 text-foreground text-xs shadow-sm"
        onClick={() => onModeChange(isHeatmap ? "dots" : "heatmap")}
        role="switch"
        title={isHeatmap ? "Prikaži pike" : "Prikaži toplotni zemljevid"}
        type="button"
      >
        <CircleDot
          className={`size-3.5 ${
            isHeatmap ? "text-muted-foreground" : "text-foreground"
          }`}
        />
        <span className="relative h-4 w-7 bg-muted">
          <span
            className="absolute top-0.5 left-0.5 size-3 bg-primary transition-transform"
            style={{ transform: `translateX(${isHeatmap ? 12 : 0}px)` }}
          />
        </span>
        <MapIcon
          className={`size-3.5 ${
            isHeatmap ? "text-foreground" : "text-muted-foreground"
          }`}
        />
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            aria-label="Odpri nastavitve"
            size="icon"
            title="Nastavitve"
            variant="outline"
          >
            <Settings className="size-4 text-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nastavitve</DialogTitle>
            <DialogDescription>
              Prilagodi prikaz zemljevida in časovnice.
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="flex items-center justify-between gap-4 border-t py-3">
              <span className="text-foreground text-sm">Način</span>
              <div className="flex overflow-hidden border">
                <Button
                  aria-pressed={colorMode === "light"}
                  className="border-0"
                  onClick={() => onColorModeChange("light")}
                  size="sm"
                  variant={colorMode === "light" ? "default" : "ghost"}
                >
                  <Sun />
                  Svetli
                </Button>
                <Button
                  aria-pressed={colorMode === "dark"}
                  className="border-0"
                  onClick={() => onColorModeChange("dark")}
                  size="sm"
                  variant={colorMode === "dark" ? "default" : "ghost"}
                >
                  <Moon />
                  Temni
                </Button>
              </div>
            </div>
            <SettingSwitch
              checked={showCountryThemeStats}
              label="Prikaži statistiko tem"
              onCheckedChange={onShowCountryThemeStatsChange}
            />
            <SettingSwitch
              checked={showSubtopics}
              label="Prikaži podteme"
              onCheckedChange={onShowSubtopicsChange}
            />
            <SettingSwitch
              checked={showTimeSlider}
              label="Prikaži časovnico"
              onCheckedChange={onShowTimeSliderChange}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <main className="flex h-svh flex-col gap-8 overflow-hidden p-8">
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
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [countryFilterMode, setCountryFilterMode] =
    useState<CountryFilterMode>("exclude");
  const [selectedCountryFilters, setSelectedCountryFilters] = useState<
    string[]
  >([]);
  const [mapDisplayMode, setMapDisplayMode] =
    useState<MapDisplayMode>("heatmap");
  const [colorMode, setColorMode] = useState<ColorMode>(getInitialColorMode);
  const [showCountryThemeStats, setShowCountryThemeStats] = useState(true);
  const [showSubtopics, setShowSubtopics] = useState(true);
  const [showTimeSlider, setShowTimeSlider] = useState(true);
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
    geoJsonError || articlesError ? "Časovnice ni bilo mogoče naložiti." : null;
  const normalizedCountryFilters = useMemo(
    () => buildNormalizedCountrySet(selectedCountryFilters),
    [selectedCountryFilters]
  );
  const countryMatchesFilter = useCallback(
    (country: string) =>
      matchesCountryFilter(
        country,
        countryFilterMode,
        normalizedCountryFilters
      ),
    [countryFilterMode, normalizedCountryFilters]
  );
  const availableCountries = useMemo(
    () =>
      Array.from(
        new Set(
          baseGeoJson.features.flatMap((feature) => {
            const country = feature.properties?.country;
            return typeof country === "string" ? [country] : [];
          })
        )
      ).sort((a, b) => a.localeCompare(b, "en")),
    [baseGeoJson.features]
  );
  const filterOptionArticleIds = useMemo(() => {
    const ids = new Set<string>();

    for (const feature of baseGeoJson.features) {
      for (const id of feature.properties?.ids ?? []) {
        ids.add(id);
      }
    }

    return ids;
  }, [baseGeoJson.features]);
  const availableTopics = useMemo(
    () =>
      Array.from(
        new Set(
          Array.from(
            filterOptionArticleIds,
            (id) => articlesById[id]?.["llm-topic"] || "Brez teme"
          )
        )
      ).sort((a, b) => a.localeCompare(b, "sl")),
    [articlesById, filterOptionArticleIds]
  );

  useEffect(() => {
    timelineRangeRef.current = timelineRange;
  }, [timelineRange]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorMode === "dark");
    document.documentElement.classList.toggle("light", colorMode === "light");
  }, [colorMode]);

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

  const articleMatchesSelectedSubtopics = useCallback(
    (id: string) => {
      if (selectedSubtopics.length === 0) {
        return true;
      }

      const subtopic = articlesById[id]?.["llm-subtopic"] || DEFAULT_SUBTOPIC;
      return selectedSubtopics.includes(subtopic);
    },
    [articlesById, selectedSubtopics]
  );

  const filteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (!(baseGeoJson && normalizedTimelineRange)) {
      return EMPTY_GEOJSON;
    }

    const [start, end] = normalizedTimelineRange;
    const features: CityFeature[] = [];

    for (const feature of baseGeoJson.features) {
      const country = feature.properties?.country;
      if (typeof country === "string" && !countryMatchesFilter(country)) {
        continue;
      }
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
  }, [
    articleTimeById,
    baseGeoJson,
    countryMatchesFilter,
    normalizedTimelineRange,
  ]);

  const availableSubtopics = useMemo<SubtopicOption[]>(() => {
    if (selectedTopic === "all") {
      return [];
    }

    const counts = new Map<string, number>();

    for (const id of filterOptionArticleIds) {
      if (!articleMatchesSelectedTopic(id)) {
        continue;
      }

      const subtopic = articlesById[id]?.["llm-subtopic"] || DEFAULT_SUBTOPIC;
      counts.set(subtopic, (counts.get(subtopic) ?? 0) + 1);
    }

    return Array.from(counts, ([subtopic, count]) => ({
      subtopic,
      count,
    })).sort(
      (left, right) =>
        right.count - left.count ||
        left.subtopic.localeCompare(right.subtopic, "sl")
    );
  }, [
    articleMatchesSelectedTopic,
    articlesById,
    filterOptionArticleIds,
    selectedTopic,
  ]);

  useEffect(() => {
    const available = new Set(
      availableSubtopics.map(({ subtopic }) => subtopic)
    );
    setSelectedSubtopics((currentSubtopics) => {
      const nextSubtopics = currentSubtopics.filter((subtopic) =>
        available.has(subtopic)
      );
      return nextSubtopics.length === currentSubtopics.length
        ? currentSubtopics
        : nextSubtopics;
    });
  }, [availableSubtopics]);

  const topicFilteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (selectedTopic === "all" && selectedSubtopics.length === 0) {
      return filteredGeoJson;
    }

    const features: CityFeature[] = [];

    for (const feature of filteredGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids)
        ? feature.properties.ids
        : [];
      const filteredIds = ids.filter(
        (id) =>
          articleMatchesSelectedTopic(id) && articleMatchesSelectedSubtopics(id)
      );

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
  }, [
    articleMatchesSelectedSubtopics,
    articleMatchesSelectedTopic,
    filteredGeoJson,
    selectedSubtopics.length,
    selectedTopic,
  ]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it's slop anyway
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
      const country = feature.properties?.country;
      if (typeof country === "string" && !countryMatchesFilter(country)) {
        continue;
      }
      if (
        selectedCountry &&
        country?.toLowerCase() !== selectedCountry.name.toLowerCase()
      ) {
        continue;
      }

      const ids = Array.isArray(feature.properties?.ids)
        ? feature.properties.ids
        : [];

      for (const id of ids) {
        const time = articleTimeById.get(id);
        if (
          time !== undefined &&
          time >= start &&
          time <= end &&
          articleMatchesSelectedTopic(id) &&
          articleMatchesSelectedSubtopics(id)
        ) {
          visibleIds.add(id);
        }
      }
    }

    return visibleIds.size;
  }, [
    articleMatchesSelectedSubtopics,
    articleMatchesSelectedTopic,
    articleTimeById,
    baseGeoJson,
    countryMatchesFilter,
    selectedCountry,
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
  const maxCountryArticleCount = useMemo(
    () => Math.max(0, ...Object.values(countryArticleCounts)),
    [countryArticleCounts]
  );

  useEffect(() => {
    if (selectedArticleId && !visibleArticleIds.has(selectedArticleId)) {
      setSelectedArticleId(null);
    }

    setSelectedDotArticleIds((ids) => {
      const nextIds = ids.filter((id) => visibleArticleIds.has(id));
      return nextIds.length === ids.length ? ids : nextIds;
    });
  }, [selectedArticleId, visibleArticleIds]);

  useEffect(() => {
    if (selectedCountry && !countryMatchesFilter(selectedCountry.name)) {
      setSelectedCountry(null);
      setSelectedArticleId(null);
      setSelectedDotArticleIds([]);
    }
  }, [countryMatchesFilter, selectedCountry]);

  const handleCountryClick = useCallback((country: CountryData) => {
    setSelectedCountry(country);
    setSelectedArticleId(null);
    setSelectedDotArticleIds([]);
  }, []);

  const handleDotClick = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    setSelectedDotArticleIds(ids);
    setSelectedArticleId(ids[0]);
    setSidebarOpen(true);
  }, []);

  const handleArticleSelect = useCallback(
    ({ country, id }: { country: string; id: string }) => {
      setSelectedArticleId(id);
      setSelectedDotArticleIds((ids) =>
        ids.length > 0 && ids.includes(id) ? ids : []
      );

      if (mapDisplayMode !== "heatmap") {
        return;
      }

      if (selectedCountry?.name.toLowerCase() !== country.toLowerCase()) {
        setSelectedCountry({ isoA3: "", name: country });
      }
    },
    [mapDisplayMode, selectedCountry?.name]
  );

  const handleClearSelectedDot = useCallback(() => {
    setSelectedDotArticleIds([]);
  }, []);

  const handleSelectedTopicChange = useCallback((topic: string) => {
    setSelectedTopic(topic);
    setSelectedSubtopics([]);
  }, []);

  const handleShowSubtopicsChange = useCallback((checked: boolean) => {
    setShowSubtopics(checked);
    if (!checked) {
      setSelectedSubtopics([]);
    }
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

  const handleTimelineResetAll = useCallback(() => {
    if (!timelineBounds) {
      return;
    }

    const nextRange: [number, number] = [
      timelineBounds.min,
      timelineBounds.max,
    ];

    timelineRangeRef.current = nextRange;
    setTimelineRange(nextRange);
    setIsTimelinePlaying(false);
  }, [timelineBounds]);

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
      <PageToolbar
        colorMode={colorMode}
        mode={mapDisplayMode}
        onColorModeChange={setColorMode}
        onModeChange={handleMapDisplayModeChange}
        onShowCountryThemeStatsChange={setShowCountryThemeStats}
        onShowSubtopicsChange={handleShowSubtopicsChange}
        onShowTimeSliderChange={setShowTimeSlider}
        showCountryThemeStats={showCountryThemeStats}
        showSubtopics={showSubtopics}
        showTimeSlider={showTimeSlider}
      />

      <Explorator
        articlesById={articlesById}
        availableCountries={availableCountries}
        availableSubtopics={availableSubtopics}
        availableTopics={availableTopics}
        country={selectedCountry}
        countryFilterMode={countryFilterMode}
        geoJson={filteredGeoJson}
        onClearSelectedDot={handleClearSelectedDot}
        onCountryFilterModeChange={setCountryFilterMode}
        onSelectArticle={handleArticleSelect}
        onSelectedCountryFiltersChange={setSelectedCountryFilters}
        onSelectedSubtopicsChange={setSelectedSubtopics}
        onSelectedTopicChange={handleSelectedTopicChange}
        selectedArticleId={selectedArticleId}
        selectedCountryFilters={selectedCountryFilters}
        selectedDotArticleIds={selectedDotArticleIds}
        selectedSubtopics={selectedSubtopics}
        selectedTopic={selectedTopic}
        showCountryThemeStats={showCountryThemeStats}
        showSubtopics={showSubtopics}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Card className="relative min-h-0 flex-1 overflow-hidden p-0">
          {selectedCountry && mapDisplayMode === "heatmap" && (
            <div className="absolute top-4 left-4 z-10 flex items-center justify-between gap-4 border bg-background px-4 py-2 font-semibold text-foreground shadow-md">
              <span>
                Izbrana država: {getCountryDisplayName(selectedCountry.name)}
              </span>
              <Button
                className="h-auto text-sm"
                onClick={handleClearCountry}
                size="sm"
                variant="link"
              >
                Počisti
              </Button>
            </div>
          )}
          {!selectedCountry && mapDisplayMode === "heatmap" && (
            <CountryColorLegend
              maxArticleCount={maxCountryArticleCount}
              selectedTopic={selectedTopic}
            />
          )}

          <MapComponent center={[14.5058, 46.0569]} zoom={4}>
            <MapControls position="top-right" />
            <ClickableCountries
              countryArticleCounts={countryArticleCounts}
              countryFilterMode={countryFilterMode}
              maxCountryArticleCount={maxCountryArticleCount}
              onCountryClick={
                mapDisplayMode === "heatmap" ? handleCountryClick : undefined
              }
              selectedCountry={
                mapDisplayMode === "heatmap" ? selectedCountry : null
              }
              selectedCountryFilters={selectedCountryFilters}
              showChoropleth={mapDisplayMode === "heatmap"}
            />
            <CountryDots
              articlesById={articlesById}
              country={selectedCountry}
              data={topicFilteredGeoJson}
              groupBySubtopic={showSubtopics && selectedTopic !== "all"}
              onDotClick={handleDotClick}
              selectedArticleId={selectedArticleId}
              showAllCountries={mapDisplayMode === "dots"}
            />
          </MapComponent>

          <ArticleCard
            articlePath={dataset.articlePath}
            id={selectedArticleId}
            onClose={() => setSelectedArticleId(null)}
            showSubtopics={showSubtopics}
          />
        </Card>

        {showTimeSlider && timelineRange && timelineBounds && (
          <TimelineSlider
            articleCount={timelineArticleCount}
            endLabel={formatTimelineDate(
              Math.max(timelineRange[0], timelineRange[1])
            )}
            isPlaying={isTimelinePlaying}
            max={timelineBounds.max}
            min={timelineBounds.min}
            onPlayPause={handleTimelinePlayPause}
            onResetAll={handleTimelineResetAll}
            onRestart={handleTimelineRestart}
            onValueChange={handleTimelineRangeChange}
            startLabel={formatTimelineDate(
              Math.min(timelineRange[0], timelineRange[1])
            )}
            step={DAY_MS}
            value={timelineRange}
          />
        )}
        {showTimeSlider && !(timelineRange && timelineBounds) && (
          <div className="shrink-0 border bg-background/95 px-4 py-3 text-muted-foreground text-xs shadow-md backdrop-blur">
            {timelineLoadError ?? "Nalaganje časovnice ..."}
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
