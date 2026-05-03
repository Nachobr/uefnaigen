import { describe, expect, it } from "vitest";
import { estimateCostUsd, getPricing } from "../pricing.js";
import { BudgetAdapter, BudgetExceededError, type UsageEvent } from "../budget-adapter.js";
import type { LLMAdapter, LLMResponse } from "../adapter.js";

class StubAdapter implements LLMAdapter {
  constructor(private response: LLMResponse) {}
  async chat(): Promise<LLMResponse> {
    return this.response;
  }
}

describe("pricing", () => {
  it("returns the right rate for known anthropic models", () => {
    const p = getPricing("anthropic", "claude-sonnet-4-20250514");
    expect(p.inputPerMTokens).toBe(3);
    expect(p.outputPerMTokens).toBe(15);
  });

  it("matches model prefixes (e.g. dated openai variants)", () => {
    const p = getPricing("openai", "gpt-4o-2024-08-06");
    expect(p.inputPerMTokens).toBe(2.5);
  });

  it("returns groq prices much lower than anthropic", () => {
    const groq = estimateCostUsd("groq", "llama-3.3-70b-versatile", 1_000_000, 1_000_000);
    const anthropic = estimateCostUsd("anthropic", "claude-sonnet-4-20250514", 1_000_000, 1_000_000);
    expect(groq).toBeLessThan(anthropic);
  });

  it("ollama is always free", () => {
    expect(estimateCostUsd("ollama", "qwen3.5:9b", 1_000_000, 1_000_000)).toBe(0);
  });
});

describe("BudgetAdapter", () => {
  it("emits usage events with provider-aware estimated cost when adapter doesn't report cost", async () => {
    const stub = new StubAdapter({ content: "ok", usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } });
    const events: UsageEvent[] = [];
    const adapter = new BudgetAdapter(stub, 100, {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      onUsage: (e) => events.push(e),
    });
    await adapter.chat([]);
    expect(events).toHaveLength(1);
    expect(events[0].estimated).toBe(true);
    expect(events[0].provider).toBe("groq");
    // groq is roughly $1.38/M total
    expect(events[0].costUsd).toBeCloseTo(1.38, 1);
  });

  it("uses provider-reported cost when present", async () => {
    const stub = new StubAdapter({ content: "ok", usage: { inputTokens: 100, outputTokens: 100, costUsd: 0.42 } });
    const events: UsageEvent[] = [];
    const adapter = new BudgetAdapter(stub, 100, { provider: "anthropic", onUsage: (e) => events.push(e) });
    await adapter.chat([]);
    expect(events[0].estimated).toBe(false);
    expect(events[0].costUsd).toBe(0.42);
  });

  it("throws BudgetExceededError when cumulative cost crosses the limit", async () => {
    const stub = new StubAdapter({ content: "ok", usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } });
    const adapter = new BudgetAdapter(stub, 1, { provider: "anthropic", model: "claude-sonnet-4-20250514" });
    await expect(adapter.chat([])).rejects.toBeInstanceOf(BudgetExceededError);
  });
});
