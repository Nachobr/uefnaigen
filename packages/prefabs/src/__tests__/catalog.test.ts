import { describe, it, expect } from "vitest";
import { PrefabCatalog } from "../catalog.js";
import { createStarterCatalog } from "../starter-catalog.js";

describe("PrefabCatalog", () => {
  it("adds and retrieves prefabs", () => {
    const catalog = new PrefabCatalog();
    catalog.add({
      prefabId: "pfb_test",
      name: "Test",
      category: "building",
      tags: ["test"],
      footprint: { w: 1, d: 1, h: 1 },
      style: "test",
      supportedGenres: ["tycoon"],
      compatibleZones: ["starter_area"],
    });
    expect(catalog.get("pfb_test")).toBeDefined();
    expect(catalog.get("pfb_test")!.name).toBe("Test");
  });

  it("returns undefined for missing prefab", () => {
    const catalog = new PrefabCatalog();
    expect(catalog.get("nonexistent")).toBeUndefined();
  });

  it("finds prefabs by tags", () => {
    const catalog = createStarterCatalog();
    const lumber = catalog.findByTags(["lumber"]);
    expect(lumber.length).toBeGreaterThan(0);
    expect(lumber.every((p) => p.tags.includes("lumber"))).toBe(true);
  });
});

describe("createStarterCatalog", () => {
  it("loads 24 starter prefabs", () => {
    const catalog = createStarterCatalog();
    expect(catalog.list().length).toBe(24);
  });

  it("has all categories represented", () => {
    const catalog = createStarterCatalog();
    const categories = new Set(catalog.list().map((p) => p.category));
    expect(categories).toContain("foliage");
    expect(categories).toContain("building");
    expect(categories).toContain("industrial");
    expect(categories).toContain("decor");
    expect(categories).toContain("combat");
    expect(categories).toContain("npc_set");
  });

  it("finds mining-related prefabs", () => {
    const catalog = createStarterCatalog();
    const mining = catalog.findByTags(["mining"]);
    expect(mining.length).toBeGreaterThanOrEqual(2);
  });

  it("finds tycoon-compatible prefabs", () => {
    const catalog = createStarterCatalog();
    const tycoon = catalog.list().filter((p) => p.supportedGenres.includes("tycoon"));
    expect(tycoon.length).toBeGreaterThan(15);
  });
});
