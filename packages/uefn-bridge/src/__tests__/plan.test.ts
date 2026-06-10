import { describe, expect, it } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceType, type DeviceInstance, type LayoutSpec } from "@forgeai/schemas";
import { loadDeviceCatalog } from "../catalog.js";
import { loadApplyPlan } from "../loader.js";
import { planApply } from "../plan.js";

const layout: LayoutSpec = {
  worldType: "grid2d",
  bounds: { width: 1000, depth: 1000 },
  zones: [],
  spawnPoints: [{ id: "spawn_1", location: { x: 0, y: 0, z: 0 }, zoneId: "zone_1" }],
};

const device: DeviceInstance = {
  id: "dev_trigger_1",
  type: "trigger",
  label: "Start Trigger",
  transform: {
    location: { x: 100, y: 200, z: 300 },
    rotation: { pitch: 0, yaw: 90, roll: 0 },
  },
  properties: { enabled: true },
  channels: { listens: ["ch_start"], transmits: ["ch_started"] },
};

describe("planApply", () => {
  it("creates a deterministic dry-run plan from manifests", () => {
    const plan = planApply({
      devices: [device],
      layout,
      verseFiles: new Map([["game.verse", "module {}"]]),
      catalog: { trigger: { assetPath: "/Fortnite/Devices/Trigger.Trigger" } },
    });

    expect(plan.stats).toEqual({
      deviceCount: 1,
      spawnPointCount: 1,
      verseFileCount: 1,
      unmappedDeviceCount: 0,
    });
    expect(plan.warnings).toEqual([]);
    expect(plan.commands.map((command) => command.kind)).toEqual([
      "spawn_device",
      "set_properties",
      "wire_channels",
      "create_spawn_point",
      "write_verse",
      "save_current_level",
    ]);
    expect(plan.commands[0]).toMatchObject({
      kind: "spawn_device",
      id: "dev_trigger_1",
      assetPath: "/Fortnite/Devices/Trigger.Trigger",
    });
  });

  it("warns when a device type has no catalog asset path", () => {
    const plan = planApply({ devices: [device], layout, catalog: { trigger: { assetPath: null } } });

    expect(plan.stats.unmappedDeviceCount).toBe(1);
    expect(plan.warnings[0]).toContain("No UEFN asset mapping");
  });

  it("loads the default catalog from JSON with all built-in device types", () => {
    const catalog = loadDeviceCatalog();

    expect(Object.keys(catalog).sort()).toEqual([...DeviceType.options].sort());
  });

  it("honors an override catalog path when loading an apply plan", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeai-catalog-"));
    const catalogPath = join(dir, "devices.catalog.json");
    writeFileSync(catalogPath, JSON.stringify({ trigger: { assetPath: "/Test/Trigger.Trigger" } }), "utf-8");

    const projectDir = fileURLToPath(new URL("../../../../references/tycoon-lumber-starter", import.meta.url));
    const plan = loadApplyPlan(projectDir, { catalogPath });

    expect(plan.commands).toContainEqual(expect.objectContaining({
      kind: "spawn_device",
      deviceType: "trigger",
      assetPath: "/Test/Trigger.Trigger",
    }));
  });
});
