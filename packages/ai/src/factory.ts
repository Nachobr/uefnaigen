import type { LLMAdapter } from "./adapter.js";
import type { ForgeAIConfig } from "@forgeai/schemas";
import { AnthropicAdapter } from "./anthropic-adapter.js";
import { OpenAIAdapter } from "./openai-adapter.js";
import { GroqAdapter } from "./groq-adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";
import { FallbackAdapter, type FallbackLogger } from "./fallback-adapter.js";

export function createAdapter(config: ForgeAIConfig): LLMAdapter {
  switch (config.provider) {
    case "anthropic": {
      const key = config.apiKeys.anthropic;
      if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
      return new AnthropicAdapter(key, config.model);
    }
    case "openai": {
      const key = config.apiKeys.openai;
      if (!key) throw new Error("OPENAI_API_KEY not configured");
      return new OpenAIAdapter(key, config.model);
    }
    case "groq": {
      const key = config.apiKeys.groq;
      if (!key) throw new Error("GROQ_API_KEY not configured");
      return new GroqAdapter(key, config.model);
    }
    case "google": {
      const key = config.apiKeys.google;
      if (!key) throw new Error("GOOGLE_API_KEY not configured");
      return new GeminiAdapter(key, config.model);
    }
    case "ollama": {
      return new OllamaAdapter(config.model, config.ollamaBaseUrl);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export interface FallbackFactoryOptions {
  /** Allow auto-pulling the local fallback model on last-resort path. Default false. */
  autoPullLocalModel?: boolean;
  logger?: FallbackLogger;
}

/**
 * Create an adapter with automatic fallback chain.
 * Leads with the configured provider/model, then appends every other provider
 * with a configured key, and finally the local Ollama qwen3.5:9b as last resort.
 */
export function createAdapterWithFallback(
  config: ForgeAIConfig,
  options: FallbackFactoryOptions = {},
): LLMAdapter {
  const adapters: Array<{ name: string; adapter: LLMAdapter }> = [];
  const seen = new Set<string>();

  const pushIf = (name: string, factory: () => LLMAdapter | undefined) => {
    if (seen.has(name)) return;
    const adapter = factory();
    if (!adapter) return;
    adapters.push({ name, adapter });
    seen.add(name);
  };

  // Lead with the user-configured provider so --provider/--model is honored.
  try {
    const lead = createAdapter(config);
    adapters.push({ name: config.provider, adapter: lead });
    seen.add(config.provider);
  } catch {
    // Configured provider missing key — silently skip; cascade will try others.
  }

  pushIf("groq", () =>
    config.apiKeys.groq ? new GroqAdapter(config.apiKeys.groq, "llama-3.3-70b-versatile") : undefined,
  );
  pushIf("google", () =>
    config.apiKeys.google ? new GeminiAdapter(config.apiKeys.google, "gemini-2.5-flash") : undefined,
  );
  pushIf("anthropic", () =>
    config.apiKeys.anthropic ? new AnthropicAdapter(config.apiKeys.anthropic, config.model) : undefined,
  );
  pushIf("openai", () =>
    config.apiKeys.openai ? new OpenAIAdapter(config.apiKeys.openai, config.model) : undefined,
  );

  if (adapters.length === 0) {
    return new OllamaAdapter("qwen3.5:9b", config.ollamaBaseUrl);
  }

  return new FallbackAdapter(adapters, {
    ollamaBaseUrl: config.ollamaBaseUrl,
    autoPullLocalModel: options.autoPullLocalModel,
    logger: options.logger,
  });
}
