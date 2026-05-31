interface TopicStyle {
  color: string;
  label: string;
  textColor: string;
}

const FALLBACK_TOPIC_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#fbbf24",
  "#c084fc",
  "#4ade80",
  "#f97316",
];

const TOPIC_STYLES: Record<string, TopicStyle> = {
  "BREZ TEME": {
    label: "Brez teme",
    color: "#94a3b8",
    textColor: "#cbd5e1",
  },
  DRUGO: {
    label: "Drugo",
    color: "#94a3b8",
    textColor: "#cbd5e1",
  },
  GOSPODARSTVO: {
    label: "Gospodarstvo",
    color: "#f59e0b",
    textColor: "#fbbf24",
  },
  KULTURA: {
    label: "Kultura",
    color: "#d946ef",
    textColor: "#e879f9",
  },
  "NARAVNE NESRECE": {
    label: "Naravne nesre\u010de",
    color: "#ef4444",
    textColor: "#f87171",
  },
  OKOLJE: {
    label: "Okolje",
    color: "#22c55e",
    textColor: "#4ade80",
  },
  POLITIKA: {
    label: "Politika",
    color: "#3b82f6",
    textColor: "#60a5fa",
  },
  "PROMETNE NESRECE": {
    label: "Nesre\u010de in incidenti",
    color: "#fb923c",
    textColor: "#fdba74",
  },
  "NESRECE IN INCIDENTI": {
    label: "Nesre\u010de in incidenti",
    color: "#fb923c",
    textColor: "#fdba74",
  },
  SPORT: {
    label: "\u0160port",
    color: "#84cc16",
    textColor: "#a3e635",
  },
  TEHNOLOGIJA: {
    label: "Tehnologija",
    color: "#06b6d4",
    textColor: "#22d3ee",
  },
  TURIZEM: {
    label: "Turizem",
    color: "#14b8a6",
    textColor: "#2dd4bf",
  },
  "VOJNA IN KONFLIKTI": {
    label: "Vojna in konflikti",
    color: "#dc2626",
    textColor: "#f87171",
  },
  KRIMINAL: {
    label: "Kriminal",
    color: "#8b5cf6",
    textColor: "#a78bfa",
  },
  ZABAVA: {
    label: "Zabava",
    color: "#ec4899",
    textColor: "#f472b6",
  },
  ZDRAVJE: {
    label: "Zdravje",
    color: "#10b981",
    textColor: "#34d399",
  },
  GASTRONOMIJA: {
    label: "Gastronomija",
    color: "#f97316",
    textColor: "#fb923c",
  },
};

function normalizeTopic(topic: string | null | undefined): string {
  return (topic?.trim() || "Brez teme")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function fallbackColor(topic: string): string {
  let hash = 0;
  for (let index = 0; index < topic.length; index += 1) {
    hash = (hash * 31 + topic.charCodeAt(index)) >>> 0;
  }

  return FALLBACK_TOPIC_COLORS[hash % FALLBACK_TOPIC_COLORS.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalizedHex = hex.replace("#", "");
  const value = Number.parseInt(normalizedHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getTopicStyle(topic: string | null | undefined): TopicStyle {
  const normalizedTopic = normalizeTopic(topic);
  const knownStyle = TOPIC_STYLES[normalizedTopic];
  if (knownStyle) {
    return knownStyle;
  }

  const color = fallbackColor(normalizedTopic);
  return {
    label: topic?.trim() || "Brez teme",
    color,
    textColor: color,
  };
}
