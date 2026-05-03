import { describe, it, expect } from "vitest";
import { MemoCache } from "../memo-cache.js";

const baseInput = {
  prompt: "lumber tycoon",
  templateId: "tycoon/lumber-mill",
  templateVersion: "1.0.0",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  seed: 42,
};

describe("MemoCache", () => {
  it("save then load returns the same value (in-memory)", () => {
    const cache = new MemoCache(baseInput, { persist: false });
    cache.save("3-world", { mapName: "Test" });
    expect(cache.load("3-world")).toEqual({ mapName: "Test" });
    expect(cache.has("3-world")).toBe(true);
    expect(cache.has("4a-layout")).toBe(false);
  });

  it("identical inputs share the same key (and storage)", () => {
    const a = new MemoCache(baseInput, { persist: false });
    const b = new MemoCache(baseInput, { persist: false });
    expect(a.key).toBe(b.key);
  });

  it("different model ⇒ different key (no cross-model reuse)", () => {
    const a = new MemoCache(baseInput, { persist: false });
    const b = new MemoCache({ ...baseInput, model: "gpt-4o" }, { persist: false });
    expect(a.key).not.toBe(b.key);
  });

  it("different provider ⇒ different key", () => {
    const a = new MemoCache(baseInput, { persist: false });
    const b = new MemoCache({ ...baseInput, provider: "openai" }, { persist: false });
    expect(a.key).not.toBe(b.key);
  });

  it("different template version ⇒ different key", () => {
    const a = new MemoCache(baseInput, { persist: false });
    const b = new MemoCache({ ...baseInput, templateVersion: "2.0.0" }, { persist: false });
    expect(a.key).not.toBe(b.key);
  });

  it("different seed ⇒ different key", () => {
    const a = new MemoCache(baseInput, { persist: false });
    const b = new MemoCache({ ...baseInput, seed: 99 }, { persist: false });
    expect(a.key).not.toBe(b.key);
  });
});
