import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorldProject } from "@forgeai/schemas";
import { hashFile, loadProject } from "../project-loader.js";

describe("loadProject", () => {
  it("loads canonical manifests and detects human-edited files from worldgen.lock hashes", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeai-loader-"));
    writeScaffold(dir);

    const loaded = loadProject(dir);
    expect(loaded.project.name).toBe("Loaded Tycoon");
    expect(loaded.project.economy.sinks[0].cost).toBe(75);
    expect(loaded.verseFiles.get("game_manager.verse")).toContain("game_manager");
    expect(loaded.humanEditedFiles).toEqual([]);

    writeFileSync(join(dir, "Verse", "game_manager.verse"), "edited := class(creative_device){}", "utf-8");

    expect(loadProject(dir).humanEditedFiles).toEqual(["Verse/game_manager.verse"]);
  });

  it("refuses directories that are not ForgeAI scaffolds", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeai-loader-bad-"));

    expect(() => loadProject(dir)).toThrow(/not a forgeai scaffold/i);
  });
});

function writeScaffold(dir: string): void {
  for (const subdir of ["manifests", "Verse", ".ai/planner", "templates"]) {
    mkdirSync(join(dir, subdir), { recursive: true });
  }

  const base = project();
  writeJson(dir, "manifests/world.project.json", { ...base, economy: { ...base.economy, sinks: [] } });
  writeJson(dir, "manifests/economy.json", base.economy);
  writeJson(dir, "manifests/layout.grid.json", base.layout);
  writeJson(dir, "manifests/device_manifest.json", base.devices);
  writeJson(dir, "manifests/prefab_manifest.json", base.prefabs);
  writeJson(dir, "manifests/variant_zones.json", base.variantZones ?? []);
  writeJson(dir, "templates/resolved-template.json", {
    templateId: "tycoon/base",
    genre: "tycoon",
    version: "1.0.0",
    summary: "Test template",
    keywords: ["tycoon"],
    layoutRules: { layoutStyle: "grid2d", minZones: 1, maxZones: 4, requiredZonePurposes: ["starter_area"] },
    systemModules: { required: ["economy"], optional: [] },
    devicePolicies: { allowedDeviceTypes: ["trigger"], requiredDeviceTypes: ["trigger"] },
    verseModules: { required: ["game_manager"], optional: [] },
    prefabTags: ["forest"],
    validationProfiles: ["tycoon"],
  });
  writeFileSync(join(dir, "Verse", "game_manager.verse"), "game_manager := class(creative_device){}", "utf-8");
  writeJson(dir, "worldgen.lock.json", {
    specVersion: "wg/1.0",
    projectId: base.projectId,
    fileHashes: { "Verse/game_manager.verse": hashFile(join(dir, "Verse", "game_manager.verse")) },
  });
}

function writeJson(base: string, path: string, data: unknown): void {
  writeFileSync(join(base, path), JSON.stringify(data, null, 2), "utf-8");
}

function project(): WorldProject {
  const now = "2026-05-08T00:00:00.000Z";
  return {
    specVersion: "wg/1.0",
    projectId: "project-loaded",
    name: "Loaded Tycoon",
    slug: "loaded-tycoon",
    createdAt: now,
    updatedAt: now,
    source: { mode: "map-studio", prompt: "A loaded tycoon", seed: 123 },
    target: { genre: "tycoon", uefnVersion: "32.00", outputMode: "scaffold" },
    design: { fantasy: "Load from disk.", coreLoop: ["collect", "upgrade"], sessionLengthMin: 20, progressionStyle: "linear" },
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
