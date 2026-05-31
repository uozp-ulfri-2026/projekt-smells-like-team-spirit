import { useMemo } from "react";
import type { CountryData } from "@/components/clickable-countries";
import { getCountryDisplayName } from "@/lib/country-display-names";
import type { CityFeatureCollection, LeanArticle } from "@/lib/mmc-data";
import { DEFAULT_SUBTOPIC, getSubtopicStyle } from "@/lib/subtopics";
import { getTopicStyle } from "@/lib/topic-colors";

interface TopicShare {
  count: number;
  percentage: number;
  topic: string;
}

interface SubtopicShare {
  count: number;
  percentage: number;
  subtopic: string;
}

const percentageFormatter = new Intl.NumberFormat("sl-SI", {
  maximumFractionDigits: 1,
});

function getScopedArticles({
  articlesById,
  countryName,
  geoJson,
}: {
  articlesById: Record<string, LeanArticle>;
  countryName?: string;
  geoJson: CityFeatureCollection;
}): LeanArticle[] {
  const articleIds = new Set<string>();
  const articles: LeanArticle[] = [];

  for (const feature of geoJson.features) {
    if (
      countryName &&
      feature.properties?.country?.toLowerCase() !== countryName.toLowerCase()
    ) {
      continue;
    }

    for (const id of feature.properties.ids ?? []) {
      if (articleIds.has(id)) {
        continue;
      }

      const article = articlesById[id];
      if (!article) {
        continue;
      }

      articleIds.add(id);
      articles.push(article);
    }
  }

  return articles;
}

function buildTopicShares(articles: LeanArticle[]): TopicShare[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    const topic = article["llm-topic"] || "Brez teme";
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }

  return Array.from(counts, ([topic, count]) => ({
    topic,
    count,
    percentage: articles.length === 0 ? 0 : (count / articles.length) * 100,
  })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "sl"));
}

function buildSubtopicShares(
  articles: LeanArticle[],
  selectedTopic: string
): SubtopicShare[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    if (article["llm-topic"] !== selectedTopic) {
      continue;
    }

    const subtopic = article["llm-subtopic"] || DEFAULT_SUBTOPIC;
    counts.set(subtopic, (counts.get(subtopic) ?? 0) + 1);
  }

  const selectedTopicCount = Array.from(counts.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  return Array.from(counts, ([subtopic, count]) => ({
    subtopic,
    count,
    percentage:
      selectedTopicCount === 0 ? 0 : (count / selectedTopicCount) * 100,
  })).sort(
    (a, b) => b.count - a.count || a.subtopic.localeCompare(b.subtopic, "sl")
  );
}

export function CountryTopicBreakdown({
  articlesById,
  country,
  geoJson,
  selectedTopic,
  showSubtopics,
}: {
  articlesById: Record<string, LeanArticle>;
  country: CountryData | null;
  geoJson: CityFeatureCollection;
  selectedTopic: string;
  showSubtopics: boolean;
}) {
  const {
    scopeArticleCount,
    selectedTopicArticleCount,
    subtopicShares,
    topicShares,
  } = useMemo(() => {
    const articles = getScopedArticles({
      articlesById,
      countryName: country?.name,
      geoJson,
    });
    const nextSubtopicShares = buildSubtopicShares(articles, selectedTopic);

    return {
      scopeArticleCount: articles.length,
      selectedTopicArticleCount: nextSubtopicShares.reduce(
        (sum, share) => sum + share.count,
        0
      ),
      subtopicShares: nextSubtopicShares,
      topicShares: buildTopicShares(articles),
    };
  }, [articlesById, country?.name, geoJson, selectedTopic]);
  const showSubtopicStats = showSubtopics && selectedTopic !== "all";
  const articleCount = showSubtopicStats
    ? selectedTopicArticleCount
    : scopeArticleCount;

  return (
    <aside className="max-h-[42svh] overflow-y-auto border bg-muted/35 p-3 text-xs">
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground">
          {showSubtopicStats
            ? `Deleži podtem: ${getTopicStyle(selectedTopic).label}`
            : "Deleži tem"}
        </h3>
        <p className="mt-0.5 truncate text-muted-foreground">
          {country ? getCountryDisplayName(country.name) : "Cel svet"}
        </p>
      </div>

      <p className="mt-2 text-muted-foreground">{articleCount} novic</p>

      {showSubtopicStats && subtopicShares.length === 0 && (
        <p className="mt-3 text-muted-foreground">
          V izbranem časovnem obdobju ni novic.
        </p>
      )}

      {showSubtopicStats && subtopicShares.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {subtopicShares.map(({ subtopic, count, percentage }) => {
            const subtopicStyle = getSubtopicStyle(subtopic);

            return (
              <div key={subtopic}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: subtopicStyle.color }}
                    />
                    <span className="truncate text-foreground">
                      {subtopicStyle.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {percentageFormatter.format(percentage)}% ({count})
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden bg-muted">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: subtopicStyle.color,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showSubtopicStats && topicShares.length === 0 && (
        <p className="mt-3 text-muted-foreground">
          V izbranem časovnem obdobju ni novic.
        </p>
      )}

      {!showSubtopicStats && topicShares.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {topicShares.map(({ topic, count, percentage }) => {
            const topicStyle = getTopicStyle(topic);

            return (
              <div key={topic}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: topicStyle.color }}
                    />
                    <span className="truncate text-foreground">
                      {topicStyle.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {percentageFormatter.format(percentage)}% ({count})
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden bg-muted">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: topicStyle.color,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
