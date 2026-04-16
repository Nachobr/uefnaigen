import OpenAI from "openai";
import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? "",
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }
}
