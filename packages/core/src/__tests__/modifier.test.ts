import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ForgeAIConfig, WorldProject } from "@forgeai/schemas";
import type { LLMAdapter, LLMMessage, LLMResponse } from "@forgeai/ai";
import { Modifier } from "../modifier.js";
import { hashFile } from "../project-loader.js";

class QueueLLM implements LLMAdapter {
  calls: LLMMessage[][] = [];

  constructor(private responses: unknown[]) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    this.calls.push(messages);
    const response = this.responses.shift();
    if (response === undefined) throw new Error("No mock response queued");
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

describe("Modifier", () => {
  it("loads a project, applies a mock-LLM patch, and validates the final state", async () => {
    const dir = writeScaffold();
    const llm = new QueueLLM([
      {
        summary: "make first upgrade cheaper",
        operations: [{ op: "replace", path: "economy.sinks[sinkId=sink_upgrade].cost", value: 25 }],
      },
    ]);

    const result = await new Modifier({
      projectDir: dir,
      request: "make the first upgrade cheaper",
      config,
      dryRun: true,
      repair: false,
      llm,
    }).run();

    expect(result.patch.summary).toBe("make first upgrade cheaper");
    expect(result.project.economy.sinks[0].cost).toBe(25);
    expect(result.validation.every((v) => v.passed)).toBe(true);
    expect(result.changedFiles).toContain("manifests/economy.json");
    expect(result.changedFiles).toContain("manifests/world.project.json");
    expect(llm.calls).toHaveLength(1);
  });

  it("blocks human-edited files without force before calling the LLM", async () => {
    const dir = writeScaffold();
    writeFileSync(join(dir, "Verse", "game_manager.verse"), "edited := class(creative_device){}", "utf-8");
    const llm = new QueueLLM([]);

    await expect(new Modifier({
      projectDir: dir,
      request: "add a worker tier",
      config,
      dryRun: true,
      llm,
    }).run()).rejects.toThrow(/human-edited files/i);
    expect(llm.calls).toHaveLength(0);
  });

  it("writes manifest-only modifications to --out without changing the source scaffold", async () => {
    const dir = writeScaffold();
    const outDir = mkdtempSync(join(tmpdir(), "forgeai-modifier-out-"));
    const llm = new QueueLLM([
      {
        summary: "make first upgrade cheaper",
        operations: [{ op: "replace", path: "economy.sinks[sinkId=sink_upgrade].cost", value: 30 }],
      },
    ]);

    const result = await new Modifier({
      projectDir: dir,
      request: "make the first upgrade cheaper",
      config,
      outputDir: outDir,
      repair: false,
      llm,
    }).run();

    const sourceEconomy = JSON.parse(readFileSync(join(dir, "manifests", "economy.json"), "utf-8")) as WorldProject["economy"];
    const outputEconomy = JSON.parse(readFileSync(join(outDir, "manifests", "economy.json"), "utf-8")) as WorldProject["economy"];
    const lock = JSON.parse(readFileSync(join(outDir, "worldgen.lock.json"), "utf-8")) as { fileHashes: Record<string, string> };

    expect(result.outputPath).toBe(outDir);
    expect(sourceEconomy.sinks[0].cost).toBe(75);
    expect(outputEconomy.sinks[0].cost).toBe(30);
    expect(existsSync(join(outDir, "docs", "MODIFICATION-SUMMARY.md"))).toBe(true);
    expect(readFileSync(join(outDir, "docs", "MODIFICATION-SUMMARY.md"), "utf-8")).toContain("make first upgrade cheaper");
    expect(lock.fileHashes["docs/MODIFICATION-SUMMARY.md"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("writes per-modify lineage records locally and in the job record", async () => {
    const tmpHome = mkdtempSync(join(tmpdir(), "forgeai-modifier-lineage-home-"));
    const prevHome = process.env.HOME;
    process.env.HOME = tmpHome;
    try {
      const dir = writeScaffold();
      const outDir = mkdtempSync(join(tmpdir(), "forgeai-modifier-lineage-"));
      const llm = new QueueLLM([
        {
          summary: "make first upgrade cheaper",
          operations: [{ op: "replace", path: "economy.sinks[sinkId=sink_upgrade].cost", value: 35 }],
        },
      ]);

      const result = await new Modifier({
        projectDir: dir,
        request: "make the first upgrade cheaper",
        config,
        outputDir: outDir,
        repair: false,
        llm,
      }).run();

      const localRecord = JSON.parse(readFileSync(join(outDir, ".ai", "modifications", `${result.jobId}.json`), "utf-8")) as {
        jobId: string;
        parentProjectHash: string;
        request: string;
        changedFiles: string[];
      };
      const jobRecord = JSON.parse(readFileSync(join(tmpHome, ".forgeai", "jobs", `${result.jobId}.json`), "utf-8")) as {
        status: string;
        stageResults?: { modify?: typeof localRecord };
      };

      expect(localRecord.jobId).toBe(result.jobId);
      expect(localRecord.parentProjectHash).toMatch(/^[a-f0-9]{64}$/);
      expect(localRecord.request).toBe("make the first upgrade cheaper");
      expect(localRecord.changedFiles).toContain("docs/MODIFICATION-SUMMARY.md");
      expect(localRecord.changedFiles).toContain(`.ai/modifications/${result.jobId}.json`);
      expect(jobRecord.status).toBe("complete");
      expect(jobRecord.stageResults?.modify?.jobId).toBe(result.jobId);
    } finally {
      if (prevHome === undefined) delete process.env.HOME;
      else process.env.HOME = prevHome;
    }
  });

  it("runs the repair loop after a patch creates validation failures", async () => {
    const dir = writeScaffold();
    const llm = new QueueLLM([
      {
        summary: "move trigger to a new zone before layout is updated",
        operations: [{ op: "replace", path: "devices[id=dev_trigger].zoneId", value: "zone_missing" }],
      },
    ]);

    const result = await new Modifier({
      projectDir: dir,
      request: "move the coin trigger into a later zone",
      config,
      dryRun: true,
      repair: true,
      llm,
    }).run();

    expect(result.repairResult?.repairs).toContain('[pass 1][deterministic] Remapped device "dev_trigger" to zone "zone_start"');
    expect(result.project.devices[0].zoneId).toBe("zone_start");
    expect(result.validation.every((v) => v.passed)).toBe(true);
    expect(llm.calls).toHaveLength(1);
  });

  it("regenerates only requested Verse modules through the existing VerseGenerator path", async () => {
    const dir = writeScaffold();
    const outDir = mkdtempSync(join(tmpdir(), "forgeai-modifier-verse-"));
    const llm = new QueueLLM([
      {
        summary: "add worker automation logic",
        operations: [{ op: "regenerate_verse_module", moduleName: "GameManager", reason: "add worker tier" }],
      },
      {
        kind: "module",
        name: "GameManager",
        imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
        declarations: [
          {
            kind: "class",
            name: "game_manager",
            extends: "creative_device",
            fields: [],
            methods: [
              {
                kind: "function",
                name: "OnBegin",
                params: [],
                returnType: "void",
                attributes: ["override", "suspends"],
                body: [{ kind: "statement", code: "Print(\"Workers ready\")" }],
              },
            ],
          },
        ],
      },
    ]);

    const result = await new Modifier({
      projectDir: dir,
      request: "add another worker automation tier",
      config,
      outputDir: outDir,
      repair: false,
      llm,
    }).run();

    expect(llm.calls).toHaveLength(2);
    expect(result.changedFiles).toContain("Verse/game_manager.verse");
    expect(result.project.scripts[0].declarations[0]?.kind).toBe("class");
    expect(readFileSync(join(outDir, "Verse", "game_manager.verse"), "utf-8")).toContain("Workers ready");
    expect(readFileSync(join(dir, "Verse", "game_manager.verse"), "utf-8")).not.toContain("Workers ready");
  });

  it("memoizes identical modifier patch prompts by parent project hash", async () => {
    const tmpHome = mkdtempSync(join(tmpdir(), "forgeai-modifier-memo-"));
    const prevHome = process.env.HOME;
    process.env.HOME = tmpHome;
    try {
      const dir = writeScaffold();
      const firstLlm = new QueueLLM([
        {
          summary: "make first upgrade cheaper",
          operations: [{ op: "replace", path: "economy.sinks[sinkId=sink_upgrade].cost", value: 20 }],
        },
      ]);
      const secondLlm = new QueueLLM([]);

      await new Modifier({
        projectDir: dir,
        request: "make the first upgrade cheaper",
        config,
        outputDir: mkdtempSync(join(tmpdir(), "forgeai-modifier-memo-a-")),
        repair: false,
        llm: firstLlm,
      }).run();
      const second = await new Modifier({
        projectDir: dir,
        request: "make the first upgrade cheaper",
        config,
        outputDir: mkdtempSync(join(tmpdir(), "forgeai-modifier-memo-b-")),
        repair: false,
        llm: secondLlm,
      }).run();

      expect(firstLlm.calls).toHaveLength(1);
      expect(secondLlm.calls).toHaveLength(0);
      expect(second.project.economy.sinks[0].cost).toBe(20);
    } finally {
      if (prevHome === undefined) delete process.env.HOME;
      else process.env.HOME = prevHome;
    }
  });
});

function writeScaffold(): string {
  const dir = mkdtempSync(join(tmpdir(), "forgeai-modifier-"));
  for (const subdir of ["manifests", "Verse", ".ai/planner"]) {
    mkdirSync(join(dir, subdir), { recursive: true });
  }
  const p = project();
  writeJson(dir, "manifests/world.project.json", p);
  writeJson(dir, "manifests/layout.grid.json", p.layout);
  writeJson(dir, "manifests/economy.json", p.economy);
  writeJson(dir, "manifests/device_manifest.json", p.devices);
  writeJson(dir, "manifests/prefab_manifest.json", p.prefabs);
  writeJson(dir, "manifests/variant_zones.json", p.variantZones ?? []);
  writeJson(dir, ".ai/planner/module-plan.json", {
    modules: [
      {
        moduleName: "GameManager",
        className: "game_manager",
        extends: "creative_device",
        purpose: "Coordinates the test tycoon",
        editableFields: [],
        methods: [{ name: "OnBegin", purpose: "Initialize", params: [], returnType: "void", attributes: ["override", "suspends"] }],
        imports: ["/Fortnite.com/Devices"],
        dependsOn: [],
      },
    ],
  });
  writeFileSync(join(dir, "Verse", "game_manager.verse"), "game_manager := class(creative_device){}", "utf-8");
  writeJson(dir, "worldgen.lock.json", {
    specVersion: "wg/1.0",
    projectId: p.projectId,
    fileHashes: { "Verse/game_manager.verse": hashFile(join(dir, "Verse", "game_manager.verse")) },
  });
  return dir;
}

function writeJson(base: string, path: string, data: unknown): void {
  writeFileSync(join(base, path), JSON.stringify(data, null, 2), "utf-8");
}

function project(): WorldProject {
  const now = "2026-05-08T00:00:00.000Z";
  return {
    specVersion: "wg/1.0",
    projectId: "project-modifier",
    name: "Modifier Tycoon",
    slug: "modifier-tycoon",
    createdAt: now,
    updatedAt: now,
    source: { mode: "map-studio", prompt: "A modifier test tycoon", seed: 101 },
    target: { genre: "tycoon", uefnVersion: "32.00", outputMode: "scaffold" },
    design: { fantasy: "Collect coins and upgrade.", coreLoop: ["collect", "upgrade"], sessionLengthMin: 20, progressionStyle: "linear" },
    layout: {
      worldType: "grid2d",
      bounds: { width: 1000, depth: 1000 },
      zones: [{ zoneId: "zone_start", name: "Start", purpose: "starter_area", footprint: { x: 0, y: 0, w: 100, h: 100 } }],
      spawnPoints: [{ id: "spawn_1", location: { x: 0, y: 0, z: 0 }, zoneId: "zone_start" }],
    },
    economy: {
      currencies: [{ currencyId: "coins", name: "Coins", persistent: true }],
      generators: [{ sourceId: "gen_coin", name: "Coin Button", currencyId: "coins", baseRate: 5, rateUnit: "per_action", zoneId: "zone_start" }],
      sinks: [{ sinkId: "sink_upgrade", name: "Upgrade", currencyId: "coins", cost: 75, type: "upgrade", repeatable: false }],
      targetCurves: { timeToFirstUpgradeSec: 60 },
    },
    devices: [
      {
        id: "dev_trigger",
        type: "trigger",
        label: "Coin Trigger",
        transform: { location: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
        properties: {},
        zoneId: "zone_start",
      },
    ],
    prefabs: [],
    variantZones: [],
    scripts: [{ kind: "module", name: "GameManager", imports: [], declarations: [] }],
    validation: [],
  };
}
