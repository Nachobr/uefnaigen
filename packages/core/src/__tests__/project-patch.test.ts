import { describe, expect, it } from "vitest";
import type { WorldProject } from "@forgeai/schemas";
import { ProjectPatch, applyProjectPatch } from "../project-patch.js";

describe("ProjectPatch", () => {
  it("rejects unknown operation types before application", () => {
    expect(() => ProjectPatch.parse({
      summary: "bad op",
      operations: [{ op: "rewrite_project", value: {} }],
    })).toThrow();
  });

  it("adds, replaces, and removes values through constrained paths", () => {
    const patch = ProjectPatch.parse({
      summary: "add premium forest and cheaper first upgrade",
      operations: [
        {
          op: "add",
          path: "layout.zones[]",
          value: {
            zoneId: "zone_snow_forest",
            name: "Snowy Premium Forest",
            purpose: "resource_area",
            footprint: { x: 100, y: 100, w: 200, h: 200 },
          },
        },
        { op: "replace", path: "economy.sinks[sinkId=sink_first_upgrade].cost", value: 50 },
        { op: "remove", path: "devices[id=dev_old_billboard]" },
      ],
    });

    const result = applyProjectPatch(project(), patch);

    expect(result.project.layout.zones.map((z) => z.zoneId)).toContain("zone_snow_forest");
    expect(result.project.economy.sinks.find((s) => s.sinkId === "sink_first_upgrade")?.cost).toBe(50);
    expect(result.project.devices.map((d) => d.id)).not.toContain("dev_old_billboard");
    expect(result.changedPaths).toEqual([
      "layout.zones[]",
      "economy.sinks[sinkId=sink_first_upgrade].cost",
      "devices[id=dev_old_billboard]",
    ]);
  });

  it("tracks Verse module regeneration requests without accepting textual diffs", () => {
    const patch = ProjectPatch.parse({
      summary: "worker automation changed",
      operations: [{ op: "regenerate_verse_module", moduleName: "automation_manager", reason: "add worker tier" }],
    });

    const result = applyProjectPatch(project(), patch);

    expect(result.touchedVerseModules).toEqual(["automation_manager"]);
    expect(result.project).toEqual(project());
  });

  it("fails when a selector does not match", () => {
    const patch = ProjectPatch.parse({
      summary: "bad selector",
      operations: [{ op: "replace", path: "economy.sinks[sinkId=missing].cost", value: 1 }],
    });

    expect(() => applyProjectPatch(project(), patch)).toThrow(/selector did not match/i);
  });
});

function project(): WorldProject {
  const now = "2026-05-08T00:00:00.000Z";
  return {
    specVersion: "wg/1.0",
    projectId: "project-test",
    name: "Patch Test Tycoon",
    slug: "patch-test-tycoon",
    createdAt: now,
    updatedAt: now,
    source: { mode: "map-studio", prompt: "A lumber tycoon", seed: 101 },
    target: { genre: "tycoon", uefnVersion: "32.00", outputMode: "scaffold" },
    design: {
      fantasy: "Chop trees and buy upgrades.",
      coreLoop: ["chop", "sell", "upgrade"],
      sessionLengthMin: 20,
      progressionStyle: "linear",
    },
    layout: {
      worldType: "grid2d",
      bounds: { width: 1000, depth: 1000 },
      zones: [{ zoneId: "zone_start", name: "Start", purpose: "starter_area", footprint: { x: 0, y: 0, w: 100, h: 100 } }],
      spawnPoints: [{ id: "spawn_1", location: { x: 0, y: 0, z: 0 }, zoneId: "zone_start" }],
    },
    economy: {
      currencies: [{ currencyId: "wood", name: "Wood", persistent: true }],
      generators: [{ sourceId: "gen_tree", name: "Tree", currencyId: "wood", baseRate: 10, rateUnit: "per_action", zoneId: "zone_start" }],
      sinks: [{ sinkId: "sink_first_upgrade", name: "First Upgrade", currencyId: "wood", cost: 100, type: "upgrade", repeatable: false }],
      targetCurves: { timeToFirstUpgradeSec: 60 },
    },
    devices: [
      {
        id: "dev_old_billboard",
        type: "hud_message",
        label: "Old Billboard",
        transform: { location: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
        properties: {},
        zoneId: "zone_start",
      },
    ],
    prefabs: [],
    scripts: [{ kind: "module", name: "automation_manager", imports: [], declarations: [] }],
    validation: [],
  };
}
