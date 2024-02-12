export interface OpenRouterRequest {
  // Either "messages" or "prompt" is required
  messages?: OpenRouterMessage[];
  // prompt?: string;

  // If "model" is unspecified, uses the user's default
  model?: string; // See "Supported Models" section

  // Additional optional parameters
  frequency_penalty?: number;
  logit_bias?: { [key: number]: number }; // OpenAI only
  max_tokens?: number; // Required for some models, so defaults to 512
  presence_penalty?: number;
  response_format?: { type: 'text' | 'json_object' }; // OpenAI only
  seed?: number; // OpenAI only
  // stop?: string | string[]; # Original
  stop?: string[];
  stream?: boolean; // Enable streaming
  temperature?: number;
  top_p?: number;
  top_k?: number; // Not available for OpenAI models

  // Function-calling
  // Only natively suported by OpenAI models. For others, we submit
  // a YAML-formatted string with these tools at the end of the prompt.
  tools?: Tool[];
  tool_choice?: ToolChoice;

  // OpenRouter-only parameters
  transforms?: string[]; // See "Prompt Transforms" section
  models?: string[]; // See "Fallback Models" section
  route?: 'fallback'; // See "Fallback Models" section
}
// Subtypes:

type TextContent = {
  type: 'text';
  text: string;
};

type ImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string; // URL or base64 encoded image data
    detail?: string; // Optional, defaults to 'auto'
  };
};

type ContentPart = TextContent | ImageContentPart;

type OpenRouterMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[]; // Only for the 'user' role
  name?: string;
};

type FunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
};

type Tool = {
  type: 'function';
  function: FunctionDescription;
};

type ToolChoice =
  | 'none'
  | 'auto'
  | {
      type: 'function';
      function: {
        name: string;
      };
    };
