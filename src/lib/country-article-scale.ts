export const COUNTRY_ARTICLE_COLOR_STOPS = [
  { count: 0, color: "#334155", label: "0" },
  { count: 1, color: "#164e63", label: "1" },
  { count: 5, color: "#0e7490", label: "5" },
  { count: 20, color: "#14b8a6", label: "20" },
  { count: 75, color: "#22c55e", label: "75" },
  { count: 150, color: "#eab308", label: "150" },
  { count: 300, color: "#f97316", label: "300" },
  { count: 600, color: "#ef4444", label: "600" },
  { count: 1500, color: "#991b1b", label: "1500+" },
];

export function buildCountryArticleColorExpression(): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "articleCount"], 0],
    ...COUNTRY_ARTICLE_COLOR_STOPS.flatMap(({ count, color }) => [
      count,
      color,
    ]),
  ];
}
