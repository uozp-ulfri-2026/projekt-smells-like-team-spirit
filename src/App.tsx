import { Card } from "./components/ui/card";
import { ClickableCountries } from "@/components/clickable-countries";
import { CountryDots } from "@/components/country-dots";
import { Map as MapComponent, MapControls } from "./components/map";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CountryData } from "@/components/clickable-countries";
import Explorator from "@/components/explorator";
import ArticleCard from "@/components/article-card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TimelineSlider } from "@/components/timeline-slider";
import { COUNTRY_ARTICLE_COLOR_STOPS } from "@/lib/country-article-scale";

type LeanArticle = {
  _id: string
  date?: string
  "llm-topic"?: string
  title?: string
  lead?: string
  url?: string
}

type CityProperties = {
  city?: string
  country?: string
  ids?: string[]
  [key: string]: unknown
}

type CityFeature = GeoJSON.Feature<GeoJSON.Point, CityProperties>
type CityFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, CityProperties>

type TimelineArticle = {
  id: string
  time: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const AUTOPLAY_INTERVAL_MS = 450
const AUTOPLAY_TARGET_STEPS = 140
const AUTOPLAY_DEFAULT_WINDOW_MS = 180 * DAY_MS
const AUTOPLAY_MIN_WINDOW_MS = 30 * DAY_MS

type DatasetId = "v2" | "old"

const DATASETS: Record<DatasetId, { articlePath: string; geoJsonPath: string }> = {
  v2: {
    articlePath: "/mmc-lean.json",
    geoJsonPath: "/output.geojson",
  },
  old: {
    articlePath: "/mmc-lean.old.json",
    geoJsonPath: "/output.old.geojson",
  },
}

const EMPTY_GEOJSON: CityFeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function parseArticleTime(article: LeanArticle): number | null {
  if (!article.date) return null
  const time = Date.parse(article.date)
  return Number.isFinite(time) ? time : null
}

function formatTimelineDate(time: number | undefined): string {
  if (time === undefined) return ""
  return dateFormatter.format(new Date(time))
}

function getSelectedDataset(): { id: DatasetId; articlePath: string; geoJsonPath: string } {
  const params = new URLSearchParams(window.location.search)
  const requestedDataset = params.get("dataset")
  const id: DatasetId = requestedDataset === "old" ? "old" : "v2"

  return {
    id,
    ...DATASETS[id],
  }
}

function normalizeTimelineRange(
  range: [number, number],
  bounds: { min: number; max: number }
): [number, number] {
  const [rawStart, rawEnd] = range
  const start = Math.max(bounds.min, Math.min(rawStart, rawEnd, bounds.max))
  const end = Math.min(bounds.max, Math.max(rawStart, rawEnd, bounds.min))

  return [start, end]
}

function getPlaybackWindowMs(
  range: [number, number],
  bounds: { min: number; max: number }
): number {
  const total = Math.max(DAY_MS, bounds.max - bounds.min)
  const [start, end] = normalizeTimelineRange(range, bounds)
  const currentWindow = Math.max(DAY_MS, end - start)

  if (currentWindow < total * 0.95) {
    return Math.min(currentWindow, total)
  }

  return Math.min(
    total,
    AUTOPLAY_DEFAULT_WINDOW_MS,
    Math.max(AUTOPLAY_MIN_WINDOW_MS, total / 8)
  )
}

function getPlaybackStepMs(bounds: { min: number; max: number }): number {
  const total = Math.max(DAY_MS, bounds.max - bounds.min)
  const rawStep = total / AUTOPLAY_TARGET_STEPS
  return Math.max(DAY_MS, Math.round(rawStep / DAY_MS) * DAY_MS)
}

function buildPlaybackStartRange(
  range: [number, number],
  bounds: { min: number; max: number }
): [number, number] {
  const [start, end] = normalizeTimelineRange(range, bounds)
  const total = Math.max(DAY_MS, bounds.max - bounds.min)
  const windowMs = getPlaybackWindowMs(range, bounds)
  const coversWholeTimeline = end - start >= total * 0.95
  const isAtEnd = end >= bounds.max - DAY_MS

  if (coversWholeTimeline || isAtEnd) {
    return [bounds.min, Math.min(bounds.max, bounds.min + windowMs)]
  }

  return [start, Math.min(bounds.max, start + windowMs)]
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [value, delay])

  return debouncedValue
}

function CountryColorLegend({ selectedTopic }: { selectedTopic: string }) {
  const gradient = `linear-gradient(90deg, ${COUNTRY_ARTICLE_COLOR_STOPS.map(
    (stop) => stop.color
  ).join(", ")})`
  const ticks = COUNTRY_ARTICLE_COLOR_STOPS.filter((_, index) =>
    [0, 2, 4, 6, COUNTRY_ARTICLE_COLOR_STOPS.length - 1].includes(index)
  )

  return (
    <div className="absolute left-4 bottom-4 z-10 w-72 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Articles by country</span>
        {selectedTopic !== "all" && (
          <span className="truncate text-muted-foreground">{selectedTopic}</span>
        )}
      </div>
      <div className="h-2 rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {ticks.map((stop) => (
          <span key={stop.label}>{stop.label}</span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <main className="h-svh p-8 pb-28 flex flex-col gap-8 overflow-hidden">
      <h1 className="text-4xl font-bold text-center shrink-0">Slovenski svet</h1>
      <MyMap />
    </main>
  );
}

export function MyMap() {
  const dataset = useMemo(() => getSelectedDataset(), [])
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [selectedDotArticleIds, setSelectedDotArticleIds] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [baseGeoJson, setBaseGeoJson] = useState<CityFeatureCollection | null>(null)
  const [articlesById, setArticlesById] = useState<Record<string, LeanArticle>>({})
  const [timeline, setTimeline] = useState<TimelineArticle[]>([])
  const [timelineRange, setTimelineRange] = useState<[number, number] | null>(null)
  const [timelineLoadError, setTimelineLoadError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const timelineRangeRef = useRef<[number, number] | null>(timelineRange)
  const debouncedTimelineRange = useDebouncedValue(timelineRange, 250)

  useEffect(() => {
    timelineRangeRef.current = timelineRange
  }, [timelineRange])

  useEffect(() => {
    Promise.all([
      fetch(dataset.geoJsonPath).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch ${dataset.geoJsonPath}`)
        }
        return response.json() as Promise<CityFeatureCollection>
      }),
      fetch(dataset.articlePath).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch ${dataset.articlePath}`)
        }
        return response.json() as Promise<LeanArticle[]>
      }),
    ])
      .then(([geoJson, leanRows]) => {
        const byId: Record<string, LeanArticle> = {}
        const sortedTimeline: TimelineArticle[] = []

        for (const article of leanRows) {
          if (!article || typeof article._id !== "string") continue

          byId[article._id] = article

          const time = parseArticleTime(article)
          if (time !== null) {
            sortedTimeline.push({ id: article._id, time })
          }
        }

        sortedTimeline.sort((a, b) => a.time - b.time)

        setBaseGeoJson(geoJson)
        setArticlesById(byId)
        setTimeline(sortedTimeline)
        setTimelineLoadError(null)
        setTimelineRange(
          sortedTimeline.length > 0
            ? [sortedTimeline[0].time, sortedTimeline[sortedTimeline.length - 1].time]
            : null
        )
      })
      .catch((error) => {
        console.error("Failed to initialize timeline data:", error)
        setBaseGeoJson(EMPTY_GEOJSON)
        setArticlesById({})
        setTimeline([])
        setTimelineRange(null)
        setTimelineLoadError("Casovnice ni bilo mogoce naloziti.")
      })
  }, [dataset.articlePath, dataset.geoJsonPath])

  const articleTimeById = useMemo(() => {
    const byId = new Map<string, number>()

    for (const article of timeline) {
      byId.set(article.id, article.time)
    }

    return byId
  }, [timeline])

  const timelineBounds = useMemo(() => {
    if (timeline.length === 0) return null

    return {
      min: timeline[0].time,
      max: timeline[timeline.length - 1].time,
    }
  }, [timeline])

  useEffect(() => {
    if (!timelineBounds || !timelineRange) {
      setIsTimelinePlaying(false)
    }
  }, [timelineBounds, timelineRange])

  useEffect(() => {
    if (!isTimelinePlaying || !timelineBounds) return

    const interval = window.setInterval(() => {
      const currentRange = timelineRangeRef.current
      if (!currentRange) {
        setIsTimelinePlaying(false)
        return
      }

      const windowMs = getPlaybackWindowMs(currentRange, timelineBounds)
      const stepMs = getPlaybackStepMs(timelineBounds)
      const [start] = normalizeTimelineRange(currentRange, timelineBounds)
      const nextStart = Math.min(
        timelineBounds.max - windowMs,
        Math.max(timelineBounds.min, start + stepMs)
      )
      const nextEnd = Math.min(timelineBounds.max, nextStart + windowMs)
      const nextRange: [number, number] = [nextStart, nextEnd]

      timelineRangeRef.current = nextRange
      setTimelineRange(nextRange)

      if (nextEnd >= timelineBounds.max) {
        setIsTimelinePlaying(false)
      }
    }, AUTOPLAY_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isTimelinePlaying, timelineBounds])

  const normalizedTimelineRange = useMemo<[number, number] | null>(() => {
    if (!debouncedTimelineRange || !timelineBounds) return null

    const [rawStart, rawEnd] = debouncedTimelineRange
    const start = Math.max(
      timelineBounds.min,
      Math.min(rawStart, rawEnd, timelineBounds.max)
    )
    const end = Math.min(
      timelineBounds.max,
      Math.max(rawStart, rawEnd, timelineBounds.min)
    )

    return [start, end]
  }, [debouncedTimelineRange, timelineBounds])

  const articleMatchesSelectedTopic = useCallback((id: string) => {
    if (selectedTopic === "all") return true

    const topic = articlesById[id]?.["llm-topic"] || "Brez teme"
    return topic === selectedTopic
  }, [articlesById, selectedTopic])

  const filteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (!baseGeoJson || !normalizedTimelineRange) {
      return EMPTY_GEOJSON
    }

    const [start, end] = normalizedTimelineRange
    const features: CityFeature[] = []

    for (const feature of baseGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids) ? feature.properties.ids : []
      const filteredIds = ids.filter((id) => {
        const time = articleTimeById.get(id)
        return time !== undefined && time >= start && time <= end
      })

      if (filteredIds.length === 0) continue

      features.push({
        ...feature,
        properties: {
          ...feature.properties,
          ids: filteredIds,
        },
      })
    }

    return {
      ...baseGeoJson,
      features,
    }
  }, [articleTimeById, baseGeoJson, normalizedTimelineRange])

  const topicFilteredGeoJson = useMemo<CityFeatureCollection>(() => {
    if (selectedTopic === "all") return filteredGeoJson

    const features: CityFeature[] = []

    for (const feature of filteredGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids) ? feature.properties.ids : []
      const filteredIds = ids.filter(articleMatchesSelectedTopic)

      if (filteredIds.length === 0) continue

      features.push({
        ...feature,
        properties: {
          ...feature.properties,
          ids: filteredIds,
        },
      })
    }

    return {
      ...filteredGeoJson,
      features,
    }
  }, [articleMatchesSelectedTopic, filteredGeoJson, selectedTopic])

  const timelineArticleCount = useMemo(() => {
    if (!baseGeoJson || !timelineRange || !timelineBounds) return 0

    const [rawStart, rawEnd] = timelineRange
    const start = Math.max(
      timelineBounds.min,
      Math.min(rawStart, rawEnd, timelineBounds.max)
    )
    const end = Math.min(
      timelineBounds.max,
      Math.max(rawStart, rawEnd, timelineBounds.min)
    )
    const visibleIds = new Set<string>()

    for (const feature of baseGeoJson.features) {
      const ids = Array.isArray(feature.properties?.ids) ? feature.properties.ids : []

      for (const id of ids) {
        const time = articleTimeById.get(id)
        if (
          time !== undefined &&
          time >= start &&
          time <= end &&
          articleMatchesSelectedTopic(id)
        ) {
          visibleIds.add(id)
        }
      }
    }

    return visibleIds.size
  }, [
    articleMatchesSelectedTopic,
    articleTimeById,
    baseGeoJson,
    timelineBounds,
    timelineRange,
  ])

  const visibleArticleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const feature of topicFilteredGeoJson.features) {
      for (const id of feature.properties?.ids ?? []) {
        ids.add(id)
      }
    }
    return ids
  }, [topicFilteredGeoJson])

  const countryArticleCounts = useMemo(() => {
    const idsByCountry = new Map<string, Set<string>>()

    for (const feature of topicFilteredGeoJson.features) {
      const country = feature.properties?.country
      if (typeof country !== "string") continue

      let ids = idsByCountry.get(country)
      if (!ids) {
        ids = new Set<string>()
        idsByCountry.set(country, ids)
      }

      for (const id of feature.properties?.ids ?? []) {
        ids.add(id)
      }
    }

    return Object.fromEntries(
      Array.from(idsByCountry, ([country, ids]) => [country, ids.size])
    )
  }, [topicFilteredGeoJson])

  useEffect(() => {
    if (selectedArticleId && !visibleArticleIds.has(selectedArticleId)) {
      setSelectedArticleId(null)
    }

    setSelectedDotArticleIds((ids) => {
      const nextIds = ids.filter((id) => visibleArticleIds.has(id))
      return nextIds.length === ids.length ? ids : nextIds
    })
  }, [selectedArticleId, visibleArticleIds])

  const handleCountryClick = useCallback((country: CountryData) => {
    setSelectedCountry(country)
    setSelectedArticleId(null)
    setSelectedDotArticleIds([])
    setSidebarOpen(true)
  }, [])

  const handleDotClick = useCallback((ids: string[]) => {
    if (ids.length === 0) return

    setSelectedDotArticleIds(ids)
    setSelectedArticleId(ids[0])
    setSidebarOpen(true)
  }, [])

  const handleArticleSelect = useCallback((id: string) => {
    setSelectedArticleId(id)
    setSelectedDotArticleIds((ids) => (
      ids.length > 0 && ids.includes(id) ? ids : []
    ))
  }, [])

  const handleClearSelectedDot = useCallback(() => {
    setSelectedDotArticleIds([])
  }, [])

  const handleTimelineRangeChange = useCallback((value: [number, number]) => {
    setIsTimelinePlaying(false)
    setTimelineRange(value)
  }, [])

  const handleTimelinePlayPause = useCallback(() => {
    if (!timelineBounds || !timelineRange) return

    setIsTimelinePlaying((playing) => {
      if (playing) return false

      const nextRange = buildPlaybackStartRange(timelineRange, timelineBounds)
      timelineRangeRef.current = nextRange
      setTimelineRange(nextRange)
      return true
    })
  }, [timelineBounds, timelineRange])

  const handleTimelineRestart = useCallback(() => {
    if (!timelineBounds || !timelineRange) return

    const windowMs = getPlaybackWindowMs(timelineRange, timelineBounds)
    const nextRange: [number, number] = [
      timelineBounds.min,
      Math.min(timelineBounds.max, timelineBounds.min + windowMs),
    ]

    timelineRangeRef.current = nextRange
    setTimelineRange(nextRange)
    setIsTimelinePlaying(false)
  }, [timelineBounds, timelineRange])

  const handleClearCountry = useCallback(() => {
    setSelectedCountry(null)
    setSelectedArticleId(null)
    setSelectedDotArticleIds([])
  }, [])

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="min-h-0 flex-1"
    >
      {/* Explorator Sidebar */}
      <Explorator
        country={selectedCountry}
        geoJson={filteredGeoJson}
        articlesById={articlesById}
        selectedArticleId={selectedArticleId}
        selectedDotArticleIds={selectedDotArticleIds}
        selectedTopic={selectedTopic}
        onSelectedTopicChange={setSelectedTopic}
        onSelectArticle={handleArticleSelect}
        onClearSelectedDot={handleClearSelectedDot}
      />

      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <Card className="p-0 flex-1 min-h-0 overflow-hidden relative">
          {selectedCountry && (
            <div className="absolute top-4 left-4 z-10 bg-background text-foreground px-4 py-2 rounded-md shadow-md border font-semibold flex items-center justify-between gap-4">
              <span>Selected: {selectedCountry.name}</span>
              <button
                onClick={handleClearCountry}
                className="text-sm underline hover:no-underline"
              >
                Clear
              </button>
            </div>
          )}
          {!selectedCountry && <CountryColorLegend selectedTopic={selectedTopic} />}

          <MapComponent center={[14.5058, 46.0569]} zoom={4}>
            <MapControls position="top-right" />
            <ClickableCountries
              countryArticleCounts={countryArticleCounts}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
            />
            <CountryDots
              country={selectedCountry}
              data={topicFilteredGeoJson}
              articlesById={articlesById}
              selectedArticleId={selectedArticleId}
              onDotClick={handleDotClick}
            />
          </MapComponent>

          <ArticleCard
            id={selectedArticleId}
            articlePath={dataset.articlePath}
            onClose={() => setSelectedArticleId(null)}
          />
        </Card>

        {timelineRange && timelineBounds ? (
          <TimelineSlider
            value={timelineRange}
            min={timelineBounds.min}
            max={timelineBounds.max}
            step={DAY_MS}
            startLabel={formatTimelineDate(Math.min(timelineRange[0], timelineRange[1]))}
            endLabel={formatTimelineDate(Math.max(timelineRange[0], timelineRange[1]))}
            articleCount={timelineArticleCount}
            isPlaying={isTimelinePlaying}
            onPlayPause={handleTimelinePlayPause}
            onRestart={handleTimelineRestart}
            onValueChange={handleTimelineRangeChange}
          />
        ) : (
          <div className="fixed right-8 bottom-8 left-8 z-[1000] border bg-background/95 px-4 py-3 text-xs text-muted-foreground shadow-md backdrop-blur">
            {timelineLoadError ?? "Nalaganje casovnice ..."}
          </div>
        )}
      </div>
    </SidebarProvider>
  )
}
