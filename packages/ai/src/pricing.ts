/**
 * Per-provider/per-model pricing in USD per million tokens.
 * Numbers are list prices at the time of writing — provider-reported `costUsd`
 * always wins; this table is only used to estimate spend when the adapter
 * doesn't return a cost.
 */
export interface ModelPricing {
  inputPerMTokens: number;
  outputPerMTokens: number;
}

export type ProviderId = "anthropic" | "openai" | "groq" | "google" | "ollama";

const PRICING: Record<ProviderId, Record<string, ModelPricing>> = {
  anthropic: {
    "claude-sonnet-4-20250514": { inputPerMTokens: 3, outputPerMTokens: 15 },
    "claude-3-5-sonnet": { inputPerMTokens: 3, outputPerMTokens: 15 },
    "claude-3-5-haiku": { inputPerMTokens: 0.8, outputPerMTokens: 4 },
    "claude-opus-4": { inputPerMTokens: 15, outputPerMTokens: 75 },
  },
  openai: {
    "gpt-4o": { inputPerMTokens: 2.5, outputPerMTokens: 10 },
    "gpt-4o-mini": { inputPerMTokens: 0.15, outputPerMTokens: 0.6 },
    "gpt-4-turbo": { inputPerMTokens: 10, outputPerMTokens: 30 },
  },
  groq: {
    "llama-3.3-70b-versatile": { inputPerMTokens: 0.59, outputPerMTokens: 0.79 },
    "llama-3.1-70b-versatile": { inputPerMTokens: 0.59, outputPerMTokens: 0.79 },
    "llama-3.1-8b-instant": { inputPerMTokens: 0.05, outputPerMTokens: 0.08 },
  },
  google: {
    "gemini-2.5-flash": { inputPerMTokens: 0.3, outputPerMTokens: 2.5 },
    "gemini-2.5-pro": { inputPerMTokens: 1.25, outputPerMTokens: 10 },
    "gemini-1.5-flash": { inputPerMTokens: 0.075, outputPerMTokens: 0.3 },
  },
  ollama: {},
};

const PROVIDER_FALLBACK: Record<ProviderId, ModelPricing> = {
  anthropic: { inputPerMTokens: 3, outputPerMTokens: 15 },
  openai: { inputPerMTokens: 2.5, outputPerMTokens: 10 },
  groq: { inputPerMTokens: 0.59, outputPerMTokens: 0.79 },
  google: { inputPerMTokens: 0.3, outputPerMTokens: 2.5 },
  ollama: { inputPerMTokens: 0, outputPerMTokens: 0 },
};

export function getPricing(provider: ProviderId, model: string): ModelPricing {
  const exact = PRICING[provider]?.[model];
  if (exact) return exact;
  // Try a prefix match (e.g. "gpt-4o-2024-08-06" → "gpt-4o").
  const tableForProvider = PRICING[provider] ?? {};
  for (const [knownModel, price] of Object.entries(tableForProvider)) {
    if (model.startsWith(knownModel)) return price;
  }
  return PROVIDER_FALLBACK[provider];
}

export function estimateCostUsd(
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = getPricing(provider, model);
  return (inputTokens * p.inputPerMTokens + outputTokens * p.outputPerMTokens) / 1_000_000;
}
