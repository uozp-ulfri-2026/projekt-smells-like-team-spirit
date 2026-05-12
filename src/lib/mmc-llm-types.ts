export interface LlmLocation {
  city?: string | null;
  country?: string | null;
}

export interface Article {
  _id?: string;
  llm?: LlmLocation;
  [key: string]: unknown;
}
