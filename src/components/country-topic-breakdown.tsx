import { useMemo } from "react";
import type { CountryData } from "@/components/clickable-countries";
import { getCountryDisplayName } from "@/lib/country-display-names";
import type { CityFeatureCollection, LeanArticle } from "@/lib/mmc-data";
import { getTopicStyle } from "@/lib/topic-colors";

interface TopicShare {
  count: number;
  percentage: number;
  topic: string;
}

const percentageFormatter = new Intl.NumberFormat("sl-SI", {
  maximumFractionDigits: 1,
});

export function CountryTopicBreakdown({
  articlesById,
  country,
  geoJson,
}: {
  articlesById: Record<string, LeanArticle>;
  country: CountryData;
  geoJson: CityFeatureCollection;
}) {
  const { articleCount, topicShares } = useMemo(() => {
    const articleIds = new Set<string>();
    const counts = new Map<string, number>();

    for (const feature of geoJson.features) {
      if (
        feature.properties?.country?.toLowerCase() !==
        country.name.toLowerCase()
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
        const topic = article["llm-topic"] || "Brez teme";
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }

    return {
      articleCount: articleIds.size,
      topicShares: Array.from(counts, ([topic, count]) => ({
        topic,
        count,
        percentage: articleIds.size === 0 ? 0 : (count / articleIds.size) * 100,
      })).sort(
        (a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "sl")
      ) satisfies TopicShare[],
    };
  }, [articlesById, country.name, geoJson.features]);

  return (
    <aside className="max-h-[42svh] overflow-y-auto border bg-muted/35 p-3 text-xs">
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground">Deleži tem</h3>
        <p className="mt-0.5 truncate text-muted-foreground">
          {getCountryDisplayName(country.name)}
        </p>
      </div>

      <p className="mt-2 text-muted-foreground">{articleCount} novic</p>

      {topicShares.length === 0 ? (
        <p className="mt-3 text-muted-foreground">
          V izbranem časovnem obdobju ni novic.
        </p>
      ) : (
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
