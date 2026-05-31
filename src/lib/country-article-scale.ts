export const COUNTRY_ARTICLE_COLOR_STOPS = [
  { ratio: 0, color: "#334155" },
  { ratio: 1 / 1500, color: "#0369a1" },
  { ratio: 5 / 1500, color: "#0891b2" },
  { ratio: 20 / 1500, color: "#2dd4bf" },
  { ratio: 75 / 1500, color: "#22c55e" },
  { ratio: 150 / 1500, color: "#eab308" },
  { ratio: 300 / 1500, color: "#f97316" },
  { ratio: 600 / 1500, color: "#ef4444" },
  { ratio: 1, color: "#991b1b" },
];

const LEGEND_STOP_INDEXES = [
  0,
  2,
  4,
  6,
  COUNTRY_ARTICLE_COLOR_STOPS.length - 1,
];

export function buildCountryArticleColorExpression(
  maxArticleCount: number
): unknown[] {
  return [
    "interpolate",
    ["linear"],
    [
      "/",
      ["coalesce", ["get", "articleCount"], 0],
      Math.max(1, maxArticleCount),
    ],
    ...COUNTRY_ARTICLE_COLOR_STOPS.flatMap(({ ratio, color }) => [
      ratio,
      color,
    ]),
  ];
}

export function buildCountryArticleLegendTicks(
  maxArticleCount: number
): Array<{ count: number; label: string }> {
  const ticks = COUNTRY_ARTICLE_COLOR_STOPS.filter((_, index) =>
    LEGEND_STOP_INDEXES.includes(index)
  ).map(({ ratio }) => {
    const count = Math.round(Math.max(0, maxArticleCount) * ratio);
    return { count, label: count.toLocaleString("sl-SI") };
  });

  return ticks.filter(
    ({ count }, index) => index === 0 || count !== ticks[index - 1]?.count
  );
}
