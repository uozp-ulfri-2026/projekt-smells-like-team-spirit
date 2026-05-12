// bunx quicktype -s json .\assets\mmc-llm.json -o types.ts --just-types

export interface Article {
  _id: string;
  authors?: string[];
  category?: ArticleCategory;
  date?: Date;
  figures?: ArticleFigure[];
  gpt_keywords?: string[];
  id?: string;
  keywords?: string[];
  lead?: string;
  llm?: ArticleLlm;
  mention?: string[];
  n_comments?: number;
  paragraphs?: string[];
  title?: string;
  topics?: ArticleCategory;
  url: string;
}

export enum ArticleCategory {
  CrnaKronika = "crna-kronika",
  Gospodarstvo = "gospodarstvo",
  Kolumne = "kolumne",
  Kultura = "kultura",
  Okolje = "okolje",
  Slovenija = "slovenija",
  Sport = "sport",
  Stevilke = "stevilke",
  Svet = "svet",
  ZabavaInSlog = "zabava-in-slog",
  ZnanostInTehnologija = "znanost-in-tehnologija",
}

export interface ArticleFigure {
  caption?: string;
  "caption.en"?: string;
  img: string;
  source: string;
}

export interface ArticleLlm {
  _id?: string;
  city?: null | string;
  country?: null | string;
  topic?: ArticleTopic;
}

export enum ArticleTopic {
  Drugo = "drugo",
  Gastronomija = "gastronomija",
  Gospodarstvo = "gospodarstvo",
  Kriminal = "kriminal",
  Kultura = "kultura",
  NaravneNesrece = "naravne_nesrece",
  Okolje = "okolje",
  Politika = "politika",
  PrometneNesrece = "prometne_nesrece",
  Sport = "sport",
  Tehnologija = "tehnologija",
  Turizem = "turizem",
  VojnaInKonflikti = "vojna_in_konflikti",
  Zabava = "zabava",
  Zdravje = "zdravje",
}
