import { describe, it, expect } from "vitest";
import { TemplateRouter } from "../template-router.js";
import { createDefaultRegistry } from "@forgeai/templates";
import type { NormalizedBrief } from "../intent-extractor.js";

function makeBrief(overrides: Partial<NormalizedBrief> = {}): NormalizedBrief {
  return {
    genre: "tycoon",
    fantasy: "Build a lumber empire",
    coreLoop: ["chop", "sell", "upgrade", "prestige"],
    sessionLengthMin: 20,
    playerCount: 8,
    progressionStyle: "linear",
    keyFeatures: ["pet system"],
    ...overrides,
  };
}

describe("TemplateRouter", () => {
  it("routes generic tycoon brief to tycoon/base", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(
      makeBrief({
        fantasy: "Build a fun business",
        coreLoop: ["earn", "spend", "grow"],
        keyFeatures: ["simple gameplay"],
      }),
    );
    expect(result.templateId).toBe("tycoon/base");
  });

  it("respects template override", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(makeBrief(), "tycoon/lumber-mill");
    expect(result.templateId).toBe("tycoon/lumber-mill");
  });

  it("matches lumber-mill via subGenre", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(makeBrief({ subGenre: "lumber-mill" }));
    expect(result.templateId).toBe("tycoon/lumber-mill");
  });

  it("matches lumber-mill via keyword matching on lumber/sawmill features", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(
      makeBrief({
        fantasy: "Chop lumber and run sawmills in a forest",
        coreLoop: ["chop", "lumber", "sawmill", "sell"],
        keyFeatures: ["lumber processing", "forest biomes", "tree planting"],
      }),
    );
    expect(result.templateId).toBe("tycoon/lumber-mill");
  });

  it("falls back to genre/base when no keyword match", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(
      makeBrief({
        fantasy: "Run a business",
        coreLoop: ["earn", "spend", "grow"],
        keyFeatures: ["simple mechanics"],
      }),
    );
    expect(result.templateId).toBe("tycoon/base");
  });

  it("resolved template has merged fields", () => {
    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const result = router.route(makeBrief(), "tycoon/lumber-mill");
    // Should have merged verse modules from base + child
    expect(result.resolvedTemplate.verseModules.required).toContain("GameManager");
    expect(result.resolvedTemplate.verseModules.required).toContain("ResourceNodeController");
  });
});
