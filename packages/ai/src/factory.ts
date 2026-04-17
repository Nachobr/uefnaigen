import type { LLMAdapter } from "./adapter.js";
import type { ForgeAIConfig } from "@forgeai/schemas";
import { AnthropicAdapter } from "./anthropic-adapter.js";
import { OpenAIAdapter } from "./openai-adapter.js";
import { GroqAdapter } from "./groq-adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";
import { FallbackAdapter } from "./fallback-adapter.js";

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

/**
 * Create an adapter with automatic fallback chain.
 * Tries configured providers in order, falls back to local qwen3.5:9b via Ollama.
 */
export function createAdapterWithFallback(config: ForgeAIConfig): LLMAdapter {
  const adapters: Array<{ name: string; adapter: LLMAdapter }> = [];

  // Build chain from available keys
  if (config.apiKeys.groq) {
    adapters.push({ name: "groq", adapter: new GroqAdapter(config.apiKeys.groq, "llama-3.3-70b-versatile") });
  }
  if (config.apiKeys.google) {
    adapters.push({ name: "google", adapter: new GeminiAdapter(config.apiKeys.google, "gemini-2.5-flash") });
  }
  if (config.apiKeys.anthropic) {
    adapters.push({ name: "anthropic", adapter: new AnthropicAdapter(config.apiKeys.anthropic, config.model) });
  }
  if (config.apiKeys.openai) {
    adapters.push({ name: "openai", adapter: new OpenAIAdapter(config.apiKeys.openai, config.model) });
  }

  if (adapters.length === 0) {
    // No API keys — go straight to Ollama
    return new OllamaAdapter("qwen3.5:9b", config.ollamaBaseUrl);
  }

  return new FallbackAdapter(adapters, config.ollamaBaseUrl);
}
