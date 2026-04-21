import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";

export class OllamaAdapter implements LLMAdapter {
  private baseUrl: string;
  private model: string;

  constructor(model = "qwen2.5:7b", baseUrl = "http://localhost:11434") {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    const body = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.maxTokens ?? 16384,
      },
      ...(options?.jsonMode ? { format: "json" } : {}),
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Ollama connection failed at ${this.baseUrl}. Is Ollama running? (${err instanceof Error ? err.message : err})`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      message?: { content: string };
      error?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    if (data.error) {
      throw new Error(`Ollama model error: ${data.error}`);
    }

    if (!data.message?.content) {
      if (process.env.FORGEAI_VERBOSE === "true") {
        console.error(`[Ollama/${this.model}] Empty response. Retrying without JSON mode...`);
      }
      // Retry without JSON format constraint — some models choke on complex JSON mode prompts
      if (options?.jsonMode) {
        const retryBody = { ...body, format: undefined };
        const retryRes = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retryBody),
        });
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as typeof data;
          if (retryData.message?.content) {
            return {
              content: retryData.message.content,
              usage: {
                inputTokens: retryData.prompt_eval_count ?? 0,
                outputTokens: retryData.eval_count ?? 0,
              },
            };
          }
        }
      }
      throw new Error(`Ollama returned empty response for model "${this.model}". The prompt may be too complex.`);
    }

    const content = data.message.content;
    if (process.env.FORGEAI_VERBOSE === "true") {
      console.error(`[Ollama/${this.model}] ${content.length} chars | in:${data.prompt_eval_count ?? "?"} out:${data.eval_count ?? "?"}`);
      console.error(`[Ollama/${this.model}] Response preview: ${content.slice(0, 300)}`);
    }

    return {
      content,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
    };
  }
}
