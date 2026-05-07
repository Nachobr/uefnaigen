import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PackagerInput } from "../scaffold-packager.js";
import { ScaffoldPackager } from "../scaffold-packager.js";

describe("ScaffoldPackager", () => {
  it("adds tycoon-specific import guidance to generated UEFN instructions", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "forgeai-packager-"));
    try {
      await new ScaffoldPackager().package(tycoonInput(), outputDir);

      const guide = readFileSync(join(outputDir, "README-UEFN-IMPORT.md"), "utf-8");
      expect(guide).toContain("## Tycoon Import Pass");
      expect(guide).toContain("Forest (`zone_forest`)");
      expect(guide).toContain("Sawmill (`zone_sawmill`, upgrade_lane)");
      expect(guide).toContain("Logs (`logs`)");
      expect(guide).toContain("First upgrade purchase is reachable in the target 45–90 second band");
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

function tycoonInput(): PackagerInput {
  const now = "2026-05-07T00:00:00.000Z";
  return {
    project: {
      specVersion: "wg/1.0",
      projectId: "project-tycoon-reference",
      name: "Lumber Reference",
      slug: "lumber-reference",
      createdAt: now,
      updatedAt: now,
      source: {
        mode: "map-studio",
        prompt: "A lumber tycoon reference scaffold",
        seed: 101,
      },
      target: {
        genre: "tycoon",
        uefnVersion: "latest",
        outputMode: "scaffold",
      },
      design: {
        fantasy: "Chop trees, sell logs, upgrade sawmills, and unlock new zones.",
        coreLoop: ["chop", "sell", "upgrade", "unlock"],
        sessionLengthMin: 20,
        progressionStyle: "linear",
      },
      layout: {
        worldType: "hub_and_spoke",
        bounds: { width: 1000, depth: 1000 },
        zones: [
          {
            zoneId: "zone_spawn",
            name: "Spawn",
            purpose: "starter_area",
            footprint: { x: 0, y: 0, w: 200, h: 200 },
          },
          {
            zoneId: "zone_forest",
            name: "Forest",
            purpose: "resource_area",
            footprint: { x: 220, y: 0, w: 260, h: 240 },
          },
          {
            zoneId: "zone_sawmill",
            name: "Sawmill",
            purpose: "upgrade_lane",
            footprint: { x: 500, y: 0, w: 220, h: 200 },
          },
          {
            zoneId: "zone_gate",
            name: "River Gate",
            purpose: "unlock_gate",
            footprint: { x: 740, y: 0, w: 120, h: 160 },
          },
        ],
        spawnPoints: [{ id: "spawn_1", location: { x: 10, y: 10, z: 0 }, zoneId: "zone_spawn" }],
      },
      economy: {
        currencies: [{ currencyId: "logs", name: "Logs", persistent: true }],
        generators: [{ sourceId: "gen_tree", name: "Tree Chop", currencyId: "logs", baseRate: 5, rateUnit: "per_action", zoneId: "zone_forest" }],
        sinks: [{ sinkId: "sink_sawmill", name: "Sawmill Upgrade", currencyId: "logs", cost: 50, type: "upgrade", repeatable: false }],
        targetCurves: { timeToFirstUpgradeSec: 60, timeToAutomationMin: 6, timeToPrestigeMin: 20 },
      },
      devices: [
        {
          id: "dev_tree_trigger",
          type: "trigger",
          label: "Tree Chop Trigger",
          transform: { location: { x: 250, y: 50, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
          properties: {},
          zoneId: "zone_forest",
        },
      ],
      prefabs: [],
      scripts: [
        {
          kind: "module",
          name: "GameManager",
          imports: [],
          declarations: [],
        },
      ],
      validation: [{ validator: "test", passed: true }],
    },
    worldDesign: {
      mapName: "Lumber Reference",
      theme: "forest lumber tycoon",
      zones: [{ zoneId: "zone_forest", name: "Forest", purpose: "resource_area", description: "Chop trees", tier: 1 }],
      progressionBeats: ["First upgrade at 60 seconds"],
      coreLoop: ["chop", "sell", "upgrade", "unlock"],
      sessionPacing: { earlyGame: "first upgrade", midGame: "automation", lateGame: "prestige" },
    },
    modulePlan: { modules: [] },
    lootTables: [],
    balanceReport: {
      timeToFirstUpgradeSec: 60,
      timeToAutomationMin: 6,
      timeToPrestigeMin: 20,
      incomePerMinute: 300,
      violations: [],
      adjustments: [],
    },
    verseFiles: new Map([["GameManager.verse", "game_manager := class(creative_device){}"]]),
  };
}
