export interface SubtopicArticle {
  lead?: string;
  "llm-subtopic"?: string;
  "llm-topic"?: string;
  title?: string;
}

interface SubtopicStyle {
  color: string;
  label: string;
  textColor: string;
}

interface SubtopicRule {
  keywords: readonly string[];
  subtopic: string;
}

const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Z0-9]+/g;
const EDGE_UNDERSCORE_PATTERN = /^_+|_+$/g;
const LOWERCASE_ALPHANUMERIC_PATTERN = /[a-z0-9]/;

export const DEFAULT_SUBTOPIC = "DRUGO";

const FALLBACK_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#fbbf24",
  "#c084fc",
  "#4ade80",
  "#f97316",
] as const;

const SUBTOPIC_STYLES: Record<string, SubtopicStyle> = {
  DRUGO: {
    label: "Ostalo",
    color: "#94a3b8",
    textColor: "#cbd5e1",
  },
  POPLAVE: {
    label: "Poplave",
    color: "#0ea5e9",
    textColor: "#38bdf8",
  },
  POZARI: {
    label: "Po\u017eari",
    color: "#f97316",
    textColor: "#fb923c",
  },
  POTRESI: {
    label: "Potresi",
    color: "#a16207",
    textColor: "#ca8a04",
  },
  NEURJA: {
    label: "Neurja",
    color: "#6366f1",
    textColor: "#818cf8",
  },
  SUSE: {
    label: "Su\u0161e",
    color: "#d97706",
    textColor: "#f59e0b",
  },
  PLAZOVI: {
    label: "Plazovi",
    color: "#78716c",
    textColor: "#a8a29e",
  },
  PROMETNE_NESRECE: {
    label: "Prometne nesre\u010de",
    color: "#eab308",
    textColor: "#facc15",
  },
  EKSPLOZIJE: {
    label: "Eksplozije",
    color: "#ef4444",
    textColor: "#f87171",
  },
  TEHNICNE_OKVARE: {
    label: "Tehni\u010dne okvare",
    color: "#64748b",
    textColor: "#94a3b8",
  },
  DELOVNE_NESRECE: {
    label: "Delovne nesre\u010de",
    color: "#f59e0b",
    textColor: "#fbbf24",
  },
  RESEVANJE: {
    label: "Re\u0161evanje",
    color: "#14b8a6",
    textColor: "#2dd4bf",
  },
  VOLITVE: {
    label: "Volitve",
    color: "#2563eb",
    textColor: "#60a5fa",
  },
  VLADA: {
    label: "Vlada",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  DIPLOMACIJA: {
    label: "Diplomacija",
    color: "#0891b2",
    textColor: "#22d3ee",
  },
  ZAKONODAJA: {
    label: "Zakonodaja",
    color: "#4f46e5",
    textColor: "#818cf8",
  },
  PROTESTI: {
    label: "Protesti",
    color: "#e11d48",
    textColor: "#fb7185",
  },
  NAPADI: {
    label: "Napadi",
    color: "#dc2626",
    textColor: "#f87171",
  },
  VOJASKE_OPERACIJE: {
    label: "Voja\u0161ke operacije",
    color: "#991b1b",
    textColor: "#ef4444",
  },
  MIROVNA_POGAJANJA: {
    label: "Mirovna pogajanja",
    color: "#16a34a",
    textColor: "#4ade80",
  },
  BEGUNCI: {
    label: "Begunci",
    color: "#0284c7",
    textColor: "#38bdf8",
  },
  NASILNA_DEJANJA: {
    label: "Nasilna dejanja",
    color: "#be123c",
    textColor: "#fb7185",
  },
  FINANCNI_KRIMINAL: {
    label: "Finan\u010dni kriminal",
    color: "#ca8a04",
    textColor: "#facc15",
  },
  PREISKAVE: {
    label: "Preiskave",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  SODNI_POSTOPKI: {
    label: "Sodni postopki",
    color: "#4f46e5",
    textColor: "#818cf8",
  },
  KIBERNETSKI_KRIMINAL: {
    label: "Kibernetski kriminal",
    color: "#0891b2",
    textColor: "#22d3ee",
  },
  NOGOMET: {
    label: "Nogomet",
    color: "#16a34a",
    textColor: "#4ade80",
  },
  KOSARKA: {
    label: "Ko\u0161arka",
    color: "#ea580c",
    textColor: "#fb923c",
  },
  ZIMSKI_SPORTI: {
    label: "Zimski \u0161porti",
    color: "#0284c7",
    textColor: "#38bdf8",
  },
  AVTOMOTO_SPORT: {
    label: "Avtomoto \u0161port",
    color: "#dc2626",
    textColor: "#f87171",
  },
  TENIS: {
    label: "Tenis",
    color: "#65a30d",
    textColor: "#a3e635",
  },
  UMETNA_INTELIGENCA: {
    label: "Umetna inteligenca",
    color: "#0891b2",
    textColor: "#22d3ee",
  },
  VESOLJE: {
    label: "Vesolje",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  KIBERNETSKA_VARNOST: {
    label: "Kibernetska varnost",
    color: "#0369a1",
    textColor: "#38bdf8",
  },
  PODJETJA: {
    label: "Podjetja",
    color: "#ca8a04",
    textColor: "#facc15",
  },
  CENE_IN_INFLACIJA: {
    label: "Cene in inflacija",
    color: "#ea580c",
    textColor: "#fb923c",
  },
  ENERGETIKA: {
    label: "Energetika",
    color: "#16a34a",
    textColor: "#4ade80",
  },
  JAVNO_ZDRAVJE: {
    label: "Javno zdravje",
    color: "#059669",
    textColor: "#34d399",
  },
  BOLEZNI: {
    label: "Bolezni",
    color: "#dc2626",
    textColor: "#f87171",
  },
  ZDRAVSTVO: {
    label: "Zdravstvo",
    color: "#0284c7",
    textColor: "#38bdf8",
  },
  PODNEBNE_SPREMEMBE: {
    label: "Podnebne spremembe",
    color: "#16a34a",
    textColor: "#4ade80",
  },
  ONESNAZEVANJE: {
    label: "Onesna\u017eevanje",
    color: "#78716c",
    textColor: "#a8a29e",
  },
  NESRECE_V_NARAVI: {
    label: "Nesre\u010de v naravi",
    color: "#0f766e",
    textColor: "#2dd4bf",
  },
  KOLESARSTVO: {
    label: "Kolesarstvo",
    color: "#16a34a",
    textColor: "#4ade80",
  },
  ROKOMET: {
    label: "Rokomet",
    color: "#c2410c",
    textColor: "#fb923c",
  },
  ODBOJKA: {
    label: "Odbojka",
    color: "#ca8a04",
    textColor: "#facc15",
  },
  PROGRAMSKA_OPREMA: {
    label: "Programska oprema in storitve",
    color: "#2563eb",
    textColor: "#60a5fa",
  },
  NAPRAVE: {
    label: "Naprave",
    color: "#0891b2",
    textColor: "#22d3ee",
  },
  ZNANOST_IN_RAZISKAVE: {
    label: "Znanost in raziskave",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  TRGI_IN_FINANCE: {
    label: "Trgi in finance",
    color: "#ca8a04",
    textColor: "#facc15",
  },
  ZAPOSLOVANJE: {
    label: "Zaposlovanje",
    color: "#0f766e",
    textColor: "#2dd4bf",
  },
  ZDRAVLJENJE_IN_RAZISKAVE: {
    label: "Zdravljenje in raziskave",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  VAROVANJE_NARAVE: {
    label: "Varovanje narave",
    color: "#15803d",
    textColor: "#4ade80",
  },
  ENERGETSKI_PREHOD: {
    label: "Energetski prehod",
    color: "#0d9488",
    textColor: "#2dd4bf",
  },
  FILM: {
    label: "Film",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  GLASBA: {
    label: "Glasba",
    color: "#db2777",
    textColor: "#f472b6",
  },
  KNJIZEVNOST: {
    label: "Knji\u017eevnost",
    color: "#9333ea",
    textColor: "#c084fc",
  },
  GLEDALISCE: {
    label: "Gledali\u0161\u010de",
    color: "#c026d3",
    textColor: "#e879f9",
  },
  VIZUALNA_UMETNOST: {
    label: "Vizualna umetnost",
    color: "#be185d",
    textColor: "#f472b6",
  },
  KULTURNA_DEDISCINA: {
    label: "Kulturna dedi\u0161\u010dina",
    color: "#a16207",
    textColor: "#facc15",
  },
  ZNANI: {
    label: "Znani",
    color: "#db2777",
    textColor: "#f472b6",
  },
  TELEVIZIJA: {
    label: "Televizija",
    color: "#7c3aed",
    textColor: "#a78bfa",
  },
  KONCERTI_IN_PRIREDITVE: {
    label: "Glasba in prireditve",
    color: "#c026d3",
    textColor: "#e879f9",
  },
  DESTINACIJE: {
    label: "Destinacije",
    color: "#0284c7",
    textColor: "#38bdf8",
  },
  NASTANITVE: {
    label: "Nastanitve",
    color: "#0d9488",
    textColor: "#2dd4bf",
  },
  POTOVANJA: {
    label: "Potovanja",
    color: "#2563eb",
    textColor: "#60a5fa",
  },
  RECEPTI: {
    label: "Recepti",
    color: "#ea580c",
    textColor: "#fb923c",
  },
  RESTAVRACIJE: {
    label: "Restavracije",
    color: "#ca8a04",
    textColor: "#facc15",
  },
  HRANA_IN_PIJACA: {
    label: "Hrana in pija\u010da",
    color: "#16a34a",
    textColor: "#4ade80",
  },
};

const RULES_BY_TOPIC: Record<string, readonly SubtopicRule[]> = {
  NARAVNE_NESRECE: [
    {
      subtopic: "POPLAVE",
      keywords: ["poplav", "prestopil breg", "narasla reka", "vodostaj"],
    },
    {
      subtopic: "POZARI",
      keywords: ["gozdni pozar", "pozar", "zagorel", "gorel", "ognjeni zublji"],
    },
    { subtopic: "POTRESI", keywords: ["potres", "seizmic"] },
    {
      subtopic: "NEURJA",
      keywords: ["neurj", "orkan", "tornado", "vihar", "toc", "ciklon"],
    },
    { subtopic: "SUSE", keywords: ["susa", "susn"] },
    {
      subtopic: "PLAZOVI",
      keywords: [
        "plazov",
        "zemeljski plaz",
        "snezni plaz",
        "plaz se je",
        "plaz je",
        "plaz zasul",
        "plaz ogroz",
        "zemeljski udor",
      ],
    },
  ],
  NESRECE_IN_INCIDENTI: [
    {
      subtopic: "DELOVNE_NESRECE",
      keywords: [
        "delovna nesrec",
        "pri delu",
        "na delovnem mestu",
        "gradbisc",
        "v rudniku",
        "secnj",
        "delavec",
      ],
    },
    { subtopic: "EKSPLOZIJE", keywords: ["eksploz", "razneslo"] },
    {
      subtopic: "TEHNICNE_OKVARE",
      keywords: ["okvar", "odpoved", "pokvar", "izpad", "tehnicn"],
    },
    {
      subtopic: "PROMETNE_NESRECE",
      keywords: [
        "prometn",
        "trcenj",
        "trcil",
        "zbil",
        "povozil",
        "iztiril",
        "vlak",
        "avtobus",
        "avtomobil",
        "avtocest",
        "cestisc",
        "motorist",
        "voznik",
        "vozil",
        "zaletel",
        "strmoglav",
        "letalska nesrec",
      ],
    },
    {
      subtopic: "POZARI",
      keywords: ["pozar", "zagorel", "gorel", "ogenj"],
    },
    {
      subtopic: "RESEVANJE",
      keywords: [
        "resevalci",
        "resevalne ekipe",
        "iskalna akcija",
        "pogresan",
        "evakuacij",
      ],
    },
    {
      subtopic: "NESRECE_V_NARAVI",
      keywords: ["planin", "padal", "pohod", "utop", "plaval", "smuc"],
    },
  ],
  POLITIKA: [
    { subtopic: "VOLITVE", keywords: ["volit", "referendum", "glasovanj"] },
    { subtopic: "VLADA", keywords: ["vlad", "minister", "premier"] },
    {
      subtopic: "DIPLOMACIJA",
      keywords: ["diplomat", "veleposlan", "zunanjepolit", "mednarodni odnosi"],
    },
    {
      subtopic: "ZAKONODAJA",
      keywords: ["zakon", "parlament", "ustavn", "predpis", "uredba"],
    },
    { subtopic: "PROTESTI", keywords: ["protest", "stavk", "demonstracij"] },
  ],
  VOJNA_IN_KONFLIKTI: [
    {
      subtopic: "NAPADI",
      keywords: ["napad", "raket", "bombard", "eksploz", "dron"],
    },
    {
      subtopic: "VOJASKE_OPERACIJE",
      keywords: ["vojak", "vojska", "front", "ofenziv", "obramb"],
    },
    {
      subtopic: "MIROVNA_POGAJANJA",
      keywords: ["premir", "pogajanj", "mirovn", "sporazum"],
    },
    { subtopic: "BEGUNCI", keywords: ["begunc", "razseljen", "evakuacij"] },
  ],
  KRIMINAL: [
    {
      subtopic: "NASILNA_DEJANJA",
      keywords: ["umor", "ubil", "ustrel", "napadel", "nasil"],
    },
    {
      subtopic: "FINANCNI_KRIMINAL",
      keywords: ["goljuf", "korupc", "pranje denarja", "podkup"],
    },
    {
      subtopic: "KIBERNETSKI_KRIMINAL",
      keywords: ["kibernet", "heker", "ransomware", "spletna prevar"],
    },
    { subtopic: "SODNI_POSTOPKI", keywords: ["sodisc", "sojenj", "obsod"] },
    { subtopic: "PREISKAVE", keywords: ["preiskav", "policij", "aretir"] },
  ],
  SPORT: [
    { subtopic: "NOGOMET", keywords: ["nogomet", "liga prvakov", "fifa"] },
    { subtopic: "KOSARKA", keywords: ["kosark", "nba", "evroliga"] },
    {
      subtopic: "KOLESARSTVO",
      keywords: ["kolesar", "giro", "tour de france", "vuelta"],
    },
    { subtopic: "ROKOMET", keywords: ["rokomet"] },
    { subtopic: "ODBOJKA", keywords: ["odbojk"] },
    {
      subtopic: "ZIMSKI_SPORTI",
      keywords: [
        "smuc",
        "biatlon",
        "smucarski skok",
        "skakal",
        "planic",
        "slalom",
        "tek na smuceh",
      ],
    },
    {
      subtopic: "AVTOMOTO_SPORT",
      keywords: [
        "formula 1",
        "motogp",
        "moto gp",
        "reli",
        "rally",
        "le mans",
        "dirkalis",
        "motocikl",
        "velika nagrada",
      ],
    },
    { subtopic: "TENIS", keywords: ["tenis", "wimbledon", "roland garros"] },
  ],
  TEHNOLOGIJA: [
    {
      subtopic: "UMETNA_INTELIGENCA",
      keywords: ["umetna inteligenca", "chatgpt", "openai", " ai "],
    },
    { subtopic: "VESOLJE", keywords: ["vesolj", "nasa", "raketa", "satelit"] },
    {
      subtopic: "KIBERNETSKA_VARNOST",
      keywords: [
        "kibernet",
        "heker",
        "ranljivost",
        "spletna varnost",
        "informacijska varnost",
      ],
    },
    {
      subtopic: "PROGRAMSKA_OPREMA",
      keywords: ["programsk", "aplikacij", "operacijski sistem", "software"],
    },
    {
      subtopic: "NAPRAVE",
      keywords: [
        "pametni telefon",
        "telefon",
        "naprav",
        "procesor",
        "racunalnik",
      ],
    },
    {
      subtopic: "ZNANOST_IN_RAZISKAVE",
      keywords: ["znanstv", "raziskav", "odkrit", "laborator"],
    },
  ],
  GOSPODARSTVO: [
    {
      subtopic: "CENE_IN_INFLACIJA",
      keywords: ["inflacij", "podraz", "cena", "cene", "cenah", "cenov"],
    },
    { subtopic: "ENERGETIKA", keywords: ["energ", "elektrik", "naft", "plin"] },
    {
      subtopic: "TRGI_IN_FINANCE",
      keywords: ["banka", "borz", "obrest", "financ", "delnic"],
    },
    {
      subtopic: "ZAPOSLOVANJE",
      keywords: ["zaposl", "brezposel", "plac", "stavk"],
    },
    {
      subtopic: "PODJETJA",
      keywords: ["podjet", "prevzem", "stecaj", "poslovanj", "dobicek"],
    },
  ],
  ZDRAVJE: [
    {
      subtopic: "JAVNO_ZDRAVJE",
      keywords: ["epidem", "cepljen", "javno zdrav"],
    },
    { subtopic: "BOLEZNI", keywords: ["bolezen", "virus", "rak", "okuzb"] },
    { subtopic: "ZDRAVSTVO", keywords: ["bolnis", "zdravnik", "zdravstv"] },
    {
      subtopic: "ZDRAVLJENJE_IN_RAZISKAVE",
      keywords: ["zdravljen", "terapij", "zdravil", "raziskav"],
    },
  ],
  OKOLJE: [
    {
      subtopic: "PODNEBNE_SPREMEMBE",
      keywords: ["podnebn", "segrevanj", "emisij", "ogljic"],
    },
    {
      subtopic: "ONESNAZEVANJE",
      keywords: ["onesnaz", "odpad", "plastik", "izpust"],
    },
    {
      subtopic: "ENERGETSKI_PREHOD",
      keywords: ["obnovljiv", "soncna elektr", "vetrn", "razogljic"],
    },
    {
      subtopic: "VAROVANJE_NARAVE",
      keywords: ["zascita narave", "biots", "zavarovan", "naravni park"],
    },
  ],
  KULTURA: [
    {
      subtopic: "KNJIZEVNOST",
      keywords: ["knjig", "knjizev", "roman", "pesnik", "pisatel", "booker"],
    },
    {
      subtopic: "FILM",
      keywords: ["film", "kino", "reziser", "filmski festival", "cannes"],
    },
    {
      subtopic: "GLASBA",
      keywords: ["glasb", "koncert", "orkester", "opera", "album"],
    },
    {
      subtopic: "GLEDALISCE",
      keywords: ["gledalisc", "odrska predstav", "drama"],
    },
    {
      subtopic: "VIZUALNA_UMETNOST",
      keywords: ["razstav", "muzej", "slikar", "kipar", "galerij"],
    },
    {
      subtopic: "KULTURNA_DEDISCINA",
      keywords: ["dedisc", "arheolog", "spomenik"],
    },
  ],
  ZABAVA: [
    {
      subtopic: "ZNANI",
      keywords: ["zvezd", "slavn", "estrad", "influenc", "kraljeva druzina"],
    },
    {
      subtopic: "TELEVIZIJA",
      keywords: ["televiz", "oddaj", "serij", "resnicnostn"],
    },
    {
      subtopic: "KONCERTI_IN_PRIREDITVE",
      keywords: ["koncert", "pev", "glasb", "festival", "prireditev"],
    },
  ],
  TURIZEM: [
    {
      subtopic: "DESTINACIJE",
      keywords: [
        "destinacij",
        "turist",
        "obiskoval",
        "izlet",
        "dopust",
        "pocitnic",
      ],
    },
    {
      subtopic: "NASTANITVE",
      keywords: ["hotel", "nastanit", "apartma", "kamp"],
    },
    {
      subtopic: "POTOVANJA",
      keywords: ["potovanj", "letalis", "letalsk", "krizark"],
    },
  ],
  GASTRONOMIJA: [
    {
      subtopic: "RECEPTI",
      keywords: [
        "recept za pripravo",
        "recept za jed",
        "kuhanj",
        "priprava jedi",
        "sestavin",
      ],
    },
    {
      subtopic: "RESTAVRACIJE",
      keywords: ["restavr", "gostiln", "chef", "kuhar"],
    },
    {
      subtopic: "HRANA_IN_PIJACA",
      keywords: ["hrana", "jed", "vino", "pivo", "kava", "olje", "kruh"],
    },
  ],
};

function normalizeKey(value: string | null | undefined): string {
  return (value?.trim() || DEFAULT_SUBTOPIC)
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
    .toUpperCase()
    .replace(NON_ALPHANUMERIC_PATTERN, "_")
    .replace(EDGE_UNDERSCORE_PATTERN, "");
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(DIACRITIC_PATTERN, "").toLowerCase();
}

function includesKeywordAtWordStart(text: string, keyword: string): boolean {
  let index = text.indexOf(keyword);

  while (index >= 0) {
    const previousCharacter = text[index - 1];
    if (
      previousCharacter === undefined ||
      !LOWERCASE_ALPHANUMERIC_PATTERN.test(previousCharacter)
    ) {
      return true;
    }
    index = text.indexOf(keyword, index + 1);
  }

  return false;
}

function getMatchingSubtopic(
  rules: readonly SubtopicRule[],
  text: string
): string | null {
  for (const rule of rules) {
    if (
      rule.keywords.some((keyword) => includesKeywordAtWordStart(text, keyword))
    ) {
      return rule.subtopic;
    }
  }

  return null;
}

function fallbackColor(subtopic: string): string {
  let hash = 0;
  for (let index = 0; index < subtopic.length; index += 1) {
    hash = (hash * 31 + subtopic.charCodeAt(index)) % 2_147_483_647;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function humanizeSubtopic(subtopic: string): string {
  const lower = subtopic.replace(/_/g, " ").toLowerCase();
  return lower.replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function normalizeSubtopic(subtopic: string | null | undefined): string {
  return normalizeKey(subtopic) || DEFAULT_SUBTOPIC;
}

export function getArticleSubtopic(article: SubtopicArticle): string {
  if (article["llm-subtopic"]?.trim()) {
    return normalizeSubtopic(article["llm-subtopic"]);
  }

  const topic = normalizeKey(article["llm-topic"]);
  const rules = RULES_BY_TOPIC[topic] ?? [];
  const title = normalizeSearchText(article.title ?? "");
  const titleAndLead = normalizeSearchText(
    `${article.title ?? ""} ${article.lead ?? ""}`
  );

  return (
    getMatchingSubtopic(rules, title) ??
    getMatchingSubtopic(rules, titleAndLead) ??
    DEFAULT_SUBTOPIC
  );
}

export function getSubtopicStyle(
  subtopic: string | null | undefined
): SubtopicStyle {
  const normalizedSubtopic = normalizeSubtopic(subtopic);
  const knownStyle = SUBTOPIC_STYLES[normalizedSubtopic];
  if (knownStyle) {
    return knownStyle;
  }

  const color = fallbackColor(normalizedSubtopic);
  return {
    label: humanizeSubtopic(normalizedSubtopic),
    color,
    textColor: color,
  };
}
