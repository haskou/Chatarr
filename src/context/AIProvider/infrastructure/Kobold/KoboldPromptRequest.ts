export interface KoboldPromptRequest {
  n?: number;
  max_context_length: number;
  max_length: number;
  rep_pen: number;
  temperature: number;
  top_p: number;
  top_k: number;
  top_a: number;
  typical: number;
  tfs: number;
  rep_pen_range: number;
  rep_pen_slope: number;
  sampler_order: number[];
  memory: string;
  min_p: number;
  presence_penalty: number;
  prompt: string;
  quiet: boolean;
  use_default_badwordsids: boolean;
  stop_sequence: string[];
}
