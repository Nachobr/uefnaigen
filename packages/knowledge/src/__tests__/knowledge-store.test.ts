import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeStore } from "../knowledge-store.js";
import { seedDefaultKnowledge } from "../seed-knowledge.js";

describe("KnowledgeStore", () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    store = new KnowledgeStore();
    store.clear();
  });

  it("adds and retrieves entries", () => {
    store.add({
      id: "test_1",
      type: "verse_pattern",
      title: "Test Pattern",
      content: "Some content",
      tags: ["test"],
    });
    expect(store.get("test_1")).toBeDefined();
    expect(store.get("test_1")!.title).toBe("Test Pattern");
  });

  it("searches by type", () => {
    store.add({ id: "a", type: "verse_pattern", title: "A", content: "a", tags: ["x"] });
    store.add({ id: "b", type: "device_schema", title: "B", content: "b", tags: ["x"] });
    const results = store.search({ type: "verse_pattern" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("a");
  });

  it("searches by tags", () => {
    store.add({ id: "a", type: "verse_pattern", title: "A", content: "a", tags: ["verse", "failable"] });
    store.add({ id: "b", type: "verse_pattern", title: "B", content: "b", tags: ["verse", "editable"] });
    const results = store.search({ tags: ["failable"] });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("a");
  });

  it("searches by genre", () => {
    store.add({ id: "a", type: "economy_template", title: "A", content: "a", tags: ["econ"], genre: "tycoon" });
    store.add({ id: "b", type: "economy_template", title: "B", content: "b", tags: ["econ"], genre: "adventure" });
    const results = store.search({ genre: "tycoon" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("a");
  });

  it("builds context string within token budget", () => {
    store.add({ id: "a", type: "verse_pattern", title: "Short", content: "x".repeat(100), tags: ["test"] });
    store.add({ id: "b", type: "verse_pattern", title: "Long", content: "x".repeat(5000), tags: ["test"] });
    const ctx = store.buildContext({ tags: ["test"], maxTokens: 200 });
    expect(ctx.length).toBeLessThanOrEqual(200);
    expect(ctx).toContain("Short");
  });

  it("tracks usage count", () => {
    store.add({ id: "a", type: "verse_pattern", title: "A", content: "a", tags: ["test"] });
    store.recordUsage("a");
    store.recordUsage("a");
    expect(store.get("a")!.usageCount).toBe(2);
  });

  it("sorts search results by usage count", () => {
    store.add({ id: "a", type: "verse_pattern", title: "A", content: "a", tags: ["test"] });
    store.add({ id: "b", type: "verse_pattern", title: "B", content: "b", tags: ["test"] });
    store.recordUsage("b");
    store.recordUsage("b");
    const results = store.search({ tags: ["test"] });
    expect(results[0].id).toBe("b");
  });
});

describe("seedDefaultKnowledge", () => {
  it("seeds 8 default entries", () => {
    const store = new KnowledgeStore();
    store.clear();
    seedDefaultKnowledge(store);
    expect(store.size).toBeGreaterThanOrEqual(8);
  });

  it("does not re-seed if store already has entries", () => {
    const store = new KnowledgeStore();
    store.clear();
    store.add({ id: "existing", type: "verse_pattern", title: "X", content: "x", tags: ["x"] });
    const sizeBefore = store.size;
    seedDefaultKnowledge(store);
    expect(store.size).toBe(sizeBefore);
  });
});
