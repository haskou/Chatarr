export interface Dictionary<T = any> {
  [key: string]: T;
}

export interface Cookies extends Dictionary<string> {}

export interface Headers extends Dictionary<string> {}

export interface YouRequest {
  q: string;
  domain: string;
  selectedChatMode: string;
  selectedAIModel: string;
  safeSearch: string;
}
