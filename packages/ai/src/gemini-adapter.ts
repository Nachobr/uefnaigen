import { GoogleGenAI } from "@google/genai";
import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";

export class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    const userContent = nonSystem.map((m) => m.content).join("\n\n");

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: userContent,
      config: {
        ...(systemMsg ? { systemInstruction: systemMsg.content } : {}),
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 16384,
        ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    });

    return {
      content: response.text ?? "",
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
