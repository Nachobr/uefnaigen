import { describe, it, expect } from "vitest";
import { PrefabCatalog } from "../catalog.js";
import { createStarterCatalog } from "../starter-catalog.js";
import { createForestPack, createIndustrialPack } from "../theme-packs.js";

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

describe("Theme packs", () => {
  it("forest pack has 10 prefabs", () => {
    const pack = createForestPack();
    expect(pack.list().length).toBe(10);
  });

  it("forest pack all tagged with forest", () => {
    const pack = createForestPack();
    expect(pack.list().every((p) => p.tags.includes("forest"))).toBe(true);
  });

  it("industrial pack has 10 prefabs", () => {
    const pack = createIndustrialPack();
    expect(pack.list().length).toBe(10);
  });

  it("industrial pack all support tycoon genre", () => {
    const pack = createIndustrialPack();
    expect(pack.list().every((p) => p.supportedGenres.includes("tycoon"))).toBe(true);
  });

  it("packs merge with starter catalog", () => {
    const catalog = createStarterCatalog();
    catalog.merge(createForestPack());
    catalog.merge(createIndustrialPack());
    expect(catalog.size).toBe(44);
  });
});

describe("PrefabCatalog extended methods", () => {
  it("finds prefabs by category", () => {
    const catalog = createStarterCatalog();
    const buildings = catalog.findByCategory("building");
    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings.every((p) => p.category === "building")).toBe(true);
  });

  it("finds prefabs by genre", () => {
    const catalog = createStarterCatalog();
    const arena = catalog.findByGenre("battle_arena");
    expect(arena.length).toBeGreaterThan(0);
    expect(arena.every((p) => p.supportedGenres.includes("battle_arena"))).toBe(true);
  });

  it("merges two catalogs", () => {
    const base = createStarterCatalog();
    const extra = new PrefabCatalog();
    extra.add({
      prefabId: "pfb_custom_01",
      name: "Custom Prefab",
      category: "building",
      tags: ["custom"],
      footprint: { w: 2, d: 2, h: 2 },
      style: "custom",
      supportedGenres: ["tycoon"],
      compatibleZones: ["starter_area"],
    });

    const originalSize = base.size;
    base.merge(extra);
    expect(base.size).toBe(originalSize + 1);
    expect(base.get("pfb_custom_01")).toBeDefined();
  });

  it("reports size correctly", () => {
    const catalog = createStarterCatalog();
    expect(catalog.size).toBe(24);
  });
});
