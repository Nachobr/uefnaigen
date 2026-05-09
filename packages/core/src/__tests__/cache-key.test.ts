import { describe, it, expect } from "vitest";
import { computeCacheKey } from "../cache-key.js";

describe("computeCacheKey", () => {
  it("produces a 16-char hex string", () => {
    const key = computeCacheKey({
      prompt: "lumber tycoon",
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
      seed: 12345,
    });
    expect(key).toMatch(/^[a-f0-9]{16}$/);
  });

  it("same input produces same key", () => {
    const input = {
      prompt: "lumber tycoon",
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
      seed: 12345,
    };
    expect(computeCacheKey(input)).toBe(computeCacheKey(input));
  });

  it("different seed produces different key", () => {
    const base = {
      prompt: "lumber tycoon",
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
    };
    expect(computeCacheKey({ ...base, seed: 1 })).not.toBe(computeCacheKey({ ...base, seed: 2 }));
  });

  it("different prompt produces different key", () => {
    const base = {
      templateId: "tycoon/base",
      model: "claude-sonnet-4-20250514",
      seed: 1,
    };
    expect(computeCacheKey({ ...base, prompt: "a" })).not.toBe(computeCacheKey({ ...base, prompt: "b" }));
  });

  it("different modifier parent project hash produces different key", () => {
    const base = {
      prompt: "make first upgrade cheaper",
      templateId: "modify",
      model: "claude-sonnet-4-20250514",
      seed: 1,
    };
    expect(computeCacheKey({ ...base, parentProjectHash: "parent-a" })).not.toBe(
      computeCacheKey({ ...base, parentProjectHash: "parent-b" }),
    );
  });
});
