import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ForgeAIConfig } from "@forgeai/schemas";
import type { LLMAdapter, LLMMessage, LLMResponse } from "@forgeai/ai";
import { Pipeline } from "../pipeline.js";
import { StageCache } from "../stage-cache.js";

class QueueLLM implements LLMAdapter {
  calls: Array<{ messages: LLMMessage[]; options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean } }> = [];

  constructor(private responses: unknown[]) {}

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    this.calls.push({ messages, options });
    const response = this.responses.shift();
    if (response === undefined) throw new Error("No mock LLM response queued");
    if (response instanceof Error) throw response;
    return { content: typeof response === "string" ? response : JSON.stringify(response) };
  }
}

const config: ForgeAIConfig = {
  provider: "ollama",
  model: "test-model",
  apiKeys: {},
  ollamaBaseUrl: "http://localhost:11434",
  outputDir: "./output",
  verbose: false,
  maxRepairPasses: 3,
  tier: "studio",
};

const economy = {
  currencies: [{ currencyId: "wood", name: "Wood", persistent: true }],
  generators: [{ sourceId: "gen_chop", name: "Tree Chopping", currencyId: "wood", baseRate: 10, rateUnit: "per_action" as const, zoneId: "zone_start" }],
  sinks: [
    { sinkId: "sink_axe", name: "Axe Upgrade", currencyId: "wood", cost: 200, type: "upgrade" as const, repeatable: false },
    { sinkId: "sink_worker", name: "Worker Automation", currencyId: "wood", cost: 1200, type: "unlock" as const, repeatable: false },
    { sinkId: "sink_prestige", name: "Prestige", currencyId: "wood", cost: 4000, type: "prestige" as const, repeatable: false },
  ],
  targetCurves: { timeToFirstUpgradeSec: 60, timeToAutomationMin: 6, timeToPrestigeMin: 20 },
};

function pipelineResponses(): unknown[] {
  return [
    {
      genre: "tycoon",
      subGenre: "lumber-mill",
      fantasy: "Build a compact lumber tycoon.",
      coreLoop: ["chop", "sell", "upgrade"],
      sessionLengthMin: 20,
      playerCount: 4,
      progressionStyle: "linear",
      keyFeatures: ["automation", "prestige"],
    },
    {
      mapName: "Mock Lumber Mill",
      theme: "cozy forest",
      zones: [
        { zoneId: "zone_start", name: "Starter Grove", purpose: "starter_area", description: "Start chopping trees.", tier: 1 },
      ],
      progressionBeats: ["First axe upgrade at one minute", "Worker automation at six minutes"],
      coreLoop: ["chop", "sell", "upgrade"],
      sessionPacing: { earlyGame: "Learn chopping", midGame: "Unlock worker", lateGame: "Prestige" },
    },
    {
      worldType: "grid2d",
      bounds: { width: 4000, depth: 4000, height: 1000 },
      zones: [
        { zoneId: "zone_start", name: "Starter Grove", purpose: "starter_area", footprint: { x: 0, y: 0, w: 2000, h: 2000 }, elevation: 0 },
      ],
      spawnPoints: [{ id: "spawn_1", location: { x: 100, y: 100, z: 0 }, zoneId: "zone_start" }],
    },
    {
      currencies: economy.currencies,
      generators: economy.generators,
      sinks: economy.sinks,
      gameRules: [{ ruleId: "rule_sell", description: "Sell logs for wood", trigger: "SellTrigger.Activated", action: "GrantCurrency" }],
    },
    [{ id: "dev_sell", type: "trigger", label: "Sell Trigger", zoneId: "zone_start", purpose: "sell logs" }],
    economy,
    [
      {
        id: "dev_sell",
        type: "trigger",
        label: "Sell Trigger",
        transform: { location: { x: 500, y: 500, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
        properties: { prompt: "Sell" },
        zoneId: "zone_start",
      },
    ],
    {
      modules: [
        {
          moduleName: "GameManager",
          className: "tycoon_game_manager",
          extends: "creative_device",
          purpose: "Coordinates the tycoon loop",
          editableFields: [{ name: "SellTrigger", type: "trigger_device", deviceId: "dev_sell" }],
          methods: [{ name: "OnBegin", purpose: "Initialize", params: [], returnType: "void", attributes: ["override", "suspends"] }],
          imports: ["/Fortnite.com/Devices", "/Verse.org/Simulation"],
          dependsOn: [],
        },
      ],
    },
    {
      tables: [
        {
          tableId: "loot_zone_start",
          name: "Starter Grove Drops",
          zoneId: "zone_start",
          entries: [{ itemId: "log", name: "Log", weight: 100, rarity: "common", effect: "+10 wood" }],
        },
      ],
    },
    {
      kind: "module",
      name: "GameManager",
      imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
      declarations: [
        {
          kind: "class",
          name: "tycoon_game_manager",
          extends: "creative_device",
          fields: [
            { kind: "field", name: "SellTrigger", type: "trigger_device", editable: true, defaultValue: { kind: "expression", code: "trigger_device{}" } },
          ],
          methods: [
            { kind: "function", name: "OnBegin", params: [], returnType: "void", attributes: ["override", "suspends"], body: [{ kind: "statement", code: "Print(\"Ready\")" }] },
          ],
        },
      ],
    },
  ];
}

describe("StageCache", () => {
  it("reports logical pipeline stages instead of raw artifact count", () => {
    const cache = new StageCache("memory-only", { persist: false });

    expect(cache.lastCompletedStage).toBe(0);
    cache.save("1-brief", {});
    cache.save("2-template", {});
    cache.save("3-world", {});
    cache.save("4a-layout", {});
    expect(cache.lastCompletedStage).toBe(4);

    cache.save("4b-systems", {});
    cache.save("4c-economy", {});
    expect(cache.lastCompletedStage).toBe(4);

    cache.save("5-balance", {});
    cache.save("6-devices", {});
    cache.save("7-modulePlan", {});
    expect(cache.lastCompletedStage).toBe(6);

    cache.save("7-lootTables", {});
    cache.save("8-verseFiles", {});
    expect(cache.lastCompletedStage).toBe(8);
  });

  it("getOrCompute computes once then returns cached value", async () => {
    const cache = new StageCache("memory-only-getorcompute", { persist: false });
    let calls = 0;
    const fn = async () => {
      calls++;
      return { value: calls };
    };

    const first = await cache.getOrCompute("1-brief", fn);
    const second = await cache.getOrCompute("1-brief", fn);

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(calls).toBe(1);
  });
});

describe("Pipeline", () => {
  it("runs all stages with an injected mock LLM", async () => {
    const llm = new QueueLLM(pipelineResponses());
    const result = await new Pipeline({
      prompt: "Make a tiny lumber tycoon",
      seed: 123,
      outputDir: "./output",
      config,
      dryRun: true,
      llm,
    }).run();

    expect(result.job.status).toBe("generated");
    expect(result.job.currentStage).toBe(8);
    expect(result.templateResult.templateId).toBe("tycoon/lumber-mill");
    expect(result.balanceReport.violations).toEqual([]);
    expect(result.devices).toHaveLength(1);
    expect(result.verseFiles.get("tycoon_game_manager.verse")).toContain("tycoon_game_manager := class(creative_device):");
    expect(llm.calls).toHaveLength(10);
    expect(llm.calls[3].messages[0].content).toContain("Tycoon Economy Template");
    expect(llm.calls[9].messages[0].content).toContain("Verse Failable Pattern");
  });

  it("memo cache reuses expensive stages across separate jobs with same inputs", async () => {
    // Redirect HOME so MemoCache persists into a clean temp dir.
    const tmpHome = mkdtempSync(join(tmpdir(), "forgeai-memo-"));
    const prevHome = process.env.HOME;
    process.env.HOME = tmpHome;
    try {
      const uniquePrompt = `MEMO TEST ${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const seed = 777;
      const baseOpts = {
        prompt: uniquePrompt,
        seed,
        outputDir: join(tmpHome, "out"),
        config,
        dryRun: false as const,
      };

      const llm1 = new QueueLLM(pipelineResponses());
      await new Pipeline({ ...baseOpts, llm: llm1 }).run();
      const firstCallCount = llm1.calls.length;
      expect(firstCallCount).toBeGreaterThan(1);

      // Same inputs, fresh job ⇒ all 8 memoized stages should be served from disk.
      // Only 1-brief (not memoized) hits the LLM.
      const llm2 = new QueueLLM(pipelineResponses());
      await new Pipeline({ ...baseOpts, llm: llm2 }).run();
      expect(llm2.calls).toHaveLength(1);
    } finally {
      if (prevHome === undefined) delete process.env.HOME;
      else process.env.HOME = prevHome;
    }
  });
});
