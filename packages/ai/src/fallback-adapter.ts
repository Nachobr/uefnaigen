import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";

const LOCAL_FALLBACK_MODEL = "qwen3.5:9b";

export class FallbackAdapter implements LLMAdapter {
  private adapters: Array<{ name: string; adapter: LLMAdapter }>;
  private fallback: OllamaAdapter;

  constructor(
    adapters: Array<{ name: string; adapter: LLMAdapter }>,
    ollamaBaseUrl = "http://localhost:11434",
  ) {
    this.adapters = adapters;
    this.fallback = new OllamaAdapter(LOCAL_FALLBACK_MODEL, ollamaBaseUrl);
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    // Try each adapter in order
    for (const { name, adapter } of this.adapters) {
      try {
        return await adapter.chat(messages, options);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[fallback] ${name} failed: ${msg}, trying next...`);
      }
    }

    // Last resort: local Ollama with qwen3.5:9b
    console.error(`[fallback] All providers failed, using local ${LOCAL_FALLBACK_MODEL}...`);

    try {
      await ensureOllamaModel(LOCAL_FALLBACK_MODEL, this.fallback);
    } catch {
      throw new Error(
        `All LLM providers failed and local fallback (${LOCAL_FALLBACK_MODEL}) is unavailable. ` +
        `Install Ollama and run: ollama pull ${LOCAL_FALLBACK_MODEL}`,
      );
    }

    return this.fallback.chat(messages, options);
  }
}

async function ensureOllamaModel(
  model: string,
  _adapter: OllamaAdapter,
): Promise<void> {
  // Check if Ollama is running and model exists
  const res = await fetch("http://localhost:11434/api/tags");
  if (!res.ok) throw new Error("Ollama not running");

  const data = (await res.json()) as { models?: Array<{ name: string }> };
  const installed = data.models?.map((m) => m.name) ?? [];

  if (installed.some((n) => n.startsWith(model.split(":")[0]))) {
    return;
  }

  // Auto-pull the model
  console.error(`[fallback] Pulling ${model}... (6.6GB, first time only)`);
  const pullRes = await fetch("http://localhost:11434/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: false }),
  });

  if (!pullRes.ok) {
    throw new Error(`Failed to pull ${model}: ${await pullRes.text()}`);
  }
}
