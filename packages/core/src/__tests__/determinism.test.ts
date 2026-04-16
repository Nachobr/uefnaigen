import { describe, it, expect } from "vitest";
import { computeCacheKey } from "../cache-key.js";

describe("Determinism (AC7)", () => {
  it("same seed + prompt + model produces identical cache key across runs", () => {
    const input = {
      prompt: "A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills, buy pets, and prestige into a new biome every 20 min.",
      templateId: "tycoon/lumber-mill",
      model: "claude-sonnet-4-20250514",
      seed: 42,
    };

    const key1 = computeCacheKey(input);
    const key2 = computeCacheKey(input);
    const key3 = computeCacheKey(input);

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it("different seed produces different cache key", () => {
    const base = {
      prompt: "Mining tycoon",
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
    };

    const keys = new Set([
      computeCacheKey({ ...base, seed: 1 }),
      computeCacheKey({ ...base, seed: 2 }),
      computeCacheKey({ ...base, seed: 3 }),
    ]);

    expect(keys.size).toBe(3);
  });

  it("cache key is stable across schema versions", () => {
    const input = {
      prompt: "test",
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
      seed: 100,
    };

    const defaultKey = computeCacheKey(input);
    const explicitKey = computeCacheKey({ ...input, schemaVersion: "wg/1.0" });

    expect(defaultKey).toBe(explicitKey);
  });
});
