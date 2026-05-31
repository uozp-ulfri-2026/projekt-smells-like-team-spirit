Now I have a comprehensive understanding. Here is my thorough summary:

---

## Comprehensive Project Summary: "Slovenski svet" (Slovenian World)

### 1. Project Overview

This is a university project for the **Knowledge Discovery from Data (UOZP)** course at the Faculty of Computer and Information Science, University of Ljubljana. The application analyzes ~73,000 news articles from the Slovenian MMC news portal (RTV Slovenia) using a locally-run LLM to extract structured metadata -- specifically **topic**, **country**, and **city** -- and presents the results as an **interactive geospatial visualization**.

**Tech stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, MapLibre GL, TanStack React Query, shadcn/ui (Radix-based), Bun runtime for build scripts.

The app is entirely client-side: it loads two static JSON files at runtime and performs all filtering, aggregation, and rendering in the browser.

---

### 2. Key Directories & Files

| Path                                         | Purpose                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.tsx`                               | App entry point -- mounts React with QueryClientProvider                                                                                                              |
| `src/App.tsx`                                | Main application (944 lines) -- all state management, data fetching, filtering logic, and layout                                                                      |
| `src/components/map.tsx`                     | Custom MapLibre GL React wrapper (~2000+ lines) -- Map, Marker, Popup, Arc, ClusterLayer, Route, Controls, etc.                                                       |
| `src/components/clickable-countries.tsx`     | Choropleth map layer -- loads Natural Earth GeoJSON, colors countries by article count, handles zoom-to-country                                                       |
| `src/components/country-dots.tsx`            | City dot layer -- places colored circles on the map per city, grouped by LLM topic, with hover/click and pulsing animation                                            |
| `src/components/explorator.tsx`              | Sidebar component -- search, topic filter, country filter, paginated article list                                                                                     |
| `src/components/timeline-slider.tsx`         | Dual-range time slider with play/pause/restart                                                                                                                        |
| `src/components/article-card.tsx`            | Article detail popup (title, topic badge, date, lead text, link)                                                                                                      |
| `src/components/country-filter.tsx`          | Include/exclude country filter with search                                                                                                                            |
| `src/components/country-topic-breakdown.tsx` | Per-country topic distribution bars                                                                                                                                   |
| `src/components/ui/`                         | 15 shadcn/ui components (button, card, dialog, input, pagination, scroll-area, select, separator, sheet, sidebar, skeleton, slider, tooltip, badge, line-shadow-text) |
| `src/lib/mmc-data.ts`                        | Data fetching via React Query -- fetches static JSON (articles + GeoJSON) from `/public/`                                                                             |
| `src/lib/mmc-llm-types.ts`                   | TypeScript interfaces for LLM output (`LlmLocation`)                                                                                                                  |
| `src/lib/topic-colors.ts`                    | 16 topic categories with fixed colors, labels, and fallback hash-based coloring                                                                                       |
| `src/lib/country-article-scale.ts`           | Choropleth color scale (9 stops from dark blue to dark red)                                                                                                           |
| `src/lib/country-filter.ts`                  | Normalized country name matching for include/exclude filtering                                                                                                        |
| `src/lib/country-display-names.ts`           | Maps English country names to Slovenian using `Intl.DisplayNames`                                                                                                     |
| `src/lib/country-names.ts`                   | Maps Natural Earth GEOJSON properties to article-consistent country names                                                                                             |
| `src/lib/city-coordinate-overrides.ts`       | Manual overrides for city coordinates where Nominatim fails                                                                                                           |
| `scripts/extractor.ts`                       | **Core LLM extraction script** -- sends articles to local LM Studio, parses JSON output, validates with Zod                                                           |
| `scripts/build-mmc-lean.ts`                  | Converts full MMC articles to lean format with Slovenian topic names                                                                                                  |
| `scripts/build-city-country-geojson.ts`      | Aggregates articles by city, builds GeoJSON from Nominatim coordinates                                                                                                |
| `scripts/build-mainlocation-v2-public.ts`    | Alternative v2 pipeline using a different model for location + topic                                                                                                  |
| `scripts/attach-llm-to-mmc.ts`               | Merges LLM outputs back into the original MMC article dataset                                                                                                         |
| `scripts/fetch-city-country-coordinates.ts`  | Calls Nominatim (OpenStreetMap geocoding) for city/country coordinates                                                                                                |
| `scripts/extract-city-country-pairs.ts`      | Extracts unique city/country pairs from LLM-output data                                                                                                               |
| `docs/task.md`                               | Course assignment description                                                                                                                                         |
| `docs/problem-statements.md`                 | 10 use cases the app can solve                                                                                                                                        |
| `public/mmc-lean.v6.json`                    | Lean article data (the v6 dataset)                                                                                                                                    |
| `public/output.v6.geojson`                   | GeoJSON with city points and article IDs                                                                                                                              |

---

### 3. What the App Does

The app helps answer: **"How are news topics distributed geographically and over time in the MMC archive?"**

Users can:

- Browse a **world map** colored by article count per country
- **Click a country** to zoom in and see city-level dots
- **Click a dot** to see all articles from that city
- **Filter by topic** (politics, economy, sports, culture, etc.)
- **Filter by country** (include/exclude specific countries)
- **Swipe a timeline** to see how coverage changes over time
- **Auto-play** the timeline to watch news evolve day by day
- **View individual articles** with title, topic, date, lead text, and link to original
- See **topic distribution** per country as percentage bars

---

### 4. Visualizations Implemented

#### A. Interactive World Map (MapLibre GL)

- **Basemap:** CartoDB dark/light styles (auto-detected from system preference)
- **Two display modes** (toggled via toolbar switch):
  - **Heatmap (Choropleth)** mode: Countries filled with a 9-stop gradient from `#334155` (0 articles) through blues, greens, yellow, orange to `#991b1b` (most articles). The color expression is dynamic -- normalized against `maxArticleCount` using MapLibre's `interpolate` expression. Hovering highlights countries in yellow.
  - **Dots mode**: Cities rendered as colored circles on the map. Each city's articles are **grouped by LLM topic** and rendered as separate, slightly offset dots (using golden-angle spiral offset). Dot radius scales with article count (4.2px for 1 article, up to 10px for 100+ articles). Hover enlarges the dot; selected dots have a white stroke and pulsating animation.

#### B. Clickable Countries (Choropleth)

- Fetches **Natural Earth** 50m admin-0 countries GeoJSON from GitHub
- Attaches `articleCount` and `articleCountryName` properties per feature
- On click: zooms/pans to fit the country bounds (with sidebar-aware padding)
- On deselect: eases back to overview center `[14.5058, 46.0569]` at zoom 4
- Selected country gets a yellow `#facc15` halo/outline

#### C. City Dots

- Rendered as MapLibre GeoJSON circle layers
- Articles per city are **grouped by topic** -- each topic gets its own dot
- Dots are offset using the **golden angle** formula for spiral layout
- An invisible "pulse" layer highlights selected article's dot with a sine-wave animation
- Coordinates are optionally anchored to CartoDB place label positions (within 80km)

#### D. Timeline Slider

- Dual-thumb range slider showing the full date range
- **Play/Pause**: Auto-advances at 450ms intervals, stepping at 1-day granularity, completing ~140 steps across the timeline
- **Restart**: Resets window to start of timeline
- **Reset All**: Shows entire timeline
- Displays start date, end date, and article count in Slovenian locale

#### E. Explorator Sidebar

- Search by city name
- Topic dropdown filter with color-coded dot indicators
- Country include/exclude filter with checkbox list
- Paginated article list (10 per page) with topic-colored left border and background tint
- Selected article highlighted with a pulsing dot indicator

#### F. Article Card

- Floating card at top-right of map
- Topic badge, title, date, lead text excerpt, link to original article
- Color-coded top accent bar and badge based on topic

#### G. Country Topic Breakdown

- Shows all topics for the selected country as percentage bars
- Each bar color-coded to topic, with count and percentage labels

#### H. Country Color Legend

- Gradient bar with tick labels showing article count thresholds
- Overlaid on the map when no country is selected

---

### 5. Topic & Location Extraction Pipeline

#### LLM Pipeline

The extraction is done **offline** via scripts, not at runtime:

1. **Script: `scripts/extractor.ts`**
   - Connects to a **local LM Studio** instance on `http://localhost:1234/v1` using `@ai-sdk/openai`
   - Model used: `gemma-4` (Google's Gemma)
   - **Temperature: 0.1** (very deterministic)
   - Each article's text (title + lead + first 6 paragraphs + keywords, capped at 7000 chars) is sent with a **detailed 300-line system prompt** that includes:
     - 15 allowed topics with precise definitions (e.g., "If it's about murders, police, crime, trials or courts, use kriminal")
     - Location extraction rules (extract main event location only, return in Slovenian)
     - Common error corrections (e.g., "Kitaja" -> "Kitajska", "gospodstvo" -> "gospodarstvo", "moda" -> "kultura")
     - 3 few-shot examples
     - Strict output format: `{ "topic": "...", "country": "...", "city": "..." }`
   - Output is **validated with Zod** against the schema
   - Errors are logged separately with raw responses for debugging

2. **Two versions evaluated** (see report.md):
   - **V1**: Topic exact-match **0.93**, City **0.94**, Country **0.84** -- but loses ~50% of articles due to nonsensical country-city pairs
   - **V6** (current): Topic **0.74**, City **0.70**, Country **0.76** -- but loses only ~15% of articles

3. **Data normalization pipeline**:
   - `scripts/build-mmc-lean.ts`: Maps LLM topic keys to Slovenian display names, strips unnecessary fields
   - `scripts/attach-llm-to-mmc.ts`: Merges LLM outputs back into full MMC dataset
   - `scripts/extract-city-country-pairs.ts`: Collects unique `(city, country)` pairs
   - `scripts/fetch-city-country-coordinates.ts`: Geocodes pairs via **Nominatim (OpenStreetMap)** with 1.5s rate limiting
   - `scripts/build-city-country-geojson.ts`: Builds GeoJSON by aggregating article IDs per city location
   - `scripts/build-mainlocation-v2-public.ts`: Alternative pipeline using a different model (`mainlocation.v2.lean.themed.predicted.json`)

#### Topics Extracted (16 categories):

Politics, War & Conflicts, Natural Disasters, Accidents & Incidents, Crime, Sports, Culture, Entertainment, Technology, Economy, Health, Environment, Tourism, Gastronomy, Other, No Topic -- each with a distinctive color.

#### Location Extraction:

- LLM extracts the **main event** location (not all mentioned places)
- Returns country and city in Slovenian (when possible)
- Coordinates sourced from OpenStreetMap Nominatim geocoding
- Manual overrides for problematic locations (e.g., Ilirska Bistrica coordinates)
- Anchor system aligns dots with CartoDB place labels when available

---

### 6. Architecture Summary

```
[MMC Articles (YAML)]
        |
        v
[Local LLM (gemma-4 via LM Studio)]  -- extractor.ts
        |
        v
[JSON: topic, country, city per article]
        |
        v
[Nominatim geocoding]  -- fetch-city-country-coordinates.ts
        |
        v
[GeoJSON + Lean Articles JSON]  -- build-*.ts scripts
        |
        v
[/public/ static files]
        |
        v
[React App] -- App.tsx
   ├─ MapLibre GL Map
   │   ├─ Choropleth (Natural Earth countries + article counts)
   │   └─ City Dots (GeoJSON circles, color-coded by topic)
   ├─ Timeline Slider (time-range filter)
   ├─ Explorator Sidebar (search/filter articles)
   ├─ Article Card (detail view)
   └─ Topic Breakdown (per-country stats)
```

The app is a single-page React application with no backend -- all data is loaded from static JSON files in `/public/`. All filtering, aggregation, and GeoJSON transformations happen client-side using React state and `useMemo`-driven computations. The map component is a fully custom React wrapper around MapLibre GL with support for controlled viewport, markers, popups, arcs, cluster layers, routes, compass, zoom controls, and light/dark theme switching.
