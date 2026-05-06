import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";

const LOCAL_FALLBACK_MODEL = "qwen3.5:9b";

export interface FallbackLogger {
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
}

const NOOP_LOGGER: FallbackLogger = {
  warn: () => {},
  error: () => {},
  info: () => {},
};

export interface FallbackAdapterOptions {
  ollamaBaseUrl?: string;
  /** Allow auto-pulling the local fallback model (~6.6GB). Default false: error out instead. */
  autoPullLocalModel?: boolean;
  logger?: FallbackLogger;
}

export class FallbackAdapter implements LLMAdapter {
  private adapters: Array<{ name: string; adapter: LLMAdapter }>;
  private fallback: OllamaAdapter;
  private ollamaBaseUrl: string;
  private autoPull: boolean;
  private logger: FallbackLogger;

  constructor(
    adapters: Array<{ name: string; adapter: LLMAdapter }>,
    options: FallbackAdapterOptions = {},
  ) {
    this.adapters = adapters;
    this.ollamaBaseUrl = options.ollamaBaseUrl ?? "http://localhost:11434";
    this.fallback = new OllamaAdapter(LOCAL_FALLBACK_MODEL, this.ollamaBaseUrl);
    this.autoPull = options.autoPullLocalModel ?? false;
    this.logger = options.logger ?? NOOP_LOGGER;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    for (const { name, adapter } of this.adapters) {
      try {
        return await adapter.chat(messages, options);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn({ provider: name, error: msg }, "fallback: provider failed, trying next");
      }
    }

    this.logger.warn({ model: LOCAL_FALLBACK_MODEL }, "fallback: all remote providers failed, using local model");

    try {
      await ensureOllamaModel(LOCAL_FALLBACK_MODEL, this.ollamaBaseUrl, {
        autoPull: this.autoPull,
        logger: this.logger,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `All LLM providers failed and local fallback (${LOCAL_FALLBACK_MODEL}) is unavailable: ${detail}. ` +
          `Install Ollama and run: ollama pull ${LOCAL_FALLBACK_MODEL}`,
        { cause: err },
      );
    }

    return this.fallback.chat(messages, options);
  }
}

async function ensureOllamaModel(
  model: string,
  baseUrl: string,
  opts: { autoPull: boolean; logger: FallbackLogger },
): Promise<void> {
  const tagsRes = await fetch(`${baseUrl}/api/tags`);
  if (!tagsRes.ok) throw new Error(`Ollama not running at ${baseUrl}`);

  const data = (await tagsRes.json()) as { models?: Array<{ name: string }> };
  const installed = data.models?.map((m) => m.name) ?? [];
  if (installed.some((n) => n.startsWith(model.split(":")[0]))) return;

  if (!opts.autoPull) {
    throw new Error(
      `${model} not installed. Re-run with autoPullLocalModel=true (~6.6GB download) or run: ollama pull ${model}`,
    );
  }

  opts.logger.info({ model, baseUrl }, "fallback: pulling local model (~6.6GB, first time only)");
  const pullRes = await fetch(`${baseUrl}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: false }),
  });

  if (!pullRes.ok) {
    throw new Error(`Failed to pull ${model}: ${await pullRes.text()}`);
  }
}
