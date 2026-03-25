import { aiChatCall, aiEmbeddingCall, getAIConfig, getActiveProvider, clearAIConfigCache } from "../ai";

export interface AIChatParams {
  model?: string;
  messages: Array<{ role: string; content: any }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: string };
  [key: string]: any;
}

export interface AIChatResponse {
  choices: Array<{
    message: { role: string; content: string | null };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chat(params: AIChatParams): Promise<AIChatResponse> {
  const config = await getAIConfig();
  const provider = config.provider || "openai";

  let model = params.model;
  if (!model) {
    switch (provider) {
      case "gemini":
        model = config.geminiChatModel || "gemini-2.0-flash";
        break;
      case "anthropic":
        model = config.anthropicChatModel || "claude-sonnet-4-20250514";
        break;
      default:
        model = config.openaiChatModel || "gpt-4o-mini";
    }
  }

  return aiChatCall({ ...params, model }) as Promise<AIChatResponse>;
}

export async function embedding(text: string): Promise<number[]> {
  const config = await getAIConfig();
  const model = config.openaiEmbeddingModel || "text-embedding-3-small";

  const result = await aiEmbeddingCall({
    model,
    input: text,
  });

  return result.data[0].embedding;
}

export { getAIConfig, getActiveProvider, clearAIConfigCache };

export default { chat, embedding, getAIConfig, getActiveProvider, clearAIConfigCache };
