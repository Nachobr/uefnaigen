import { describe, expect, it } from "vitest";
import { executeApplyPlan } from "../executor.js";
import type { ApplyPlan } from "../plan.js";
import { UefnListenerError, type UefnHttpClient } from "../client.js";

describe("executeApplyPlan", () => {
  it("executes spawn, properties, and save commands while skipping unsupported commands", async () => {
    const calls: string[] = [];
    const client = {
      async spawnActor() {
        calls.push("spawnActor");
        return { path: "Actor_1" };
      },
      async getAllActors() {
        calls.push("getAllActors");
        return [{ label: "ForgeAI Spawn spawn_1", tags: ["forgeai"] }];
      },
      async setActorProperties() {
        calls.push("setActorProperties");
        return {};
      },
      async createSpawnPoint() {
        calls.push("createSpawnPoint");
        return {};
      },
      async executePython() {
        calls.push("executePython");
        return {};
      },
      async capabilities() {
        calls.push("capabilities");
        return undefined;
      },
      async saveCurrentLevel() {
        calls.push("saveCurrentLevel");
        return {};
      },
    } as unknown as UefnHttpClient;

    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 1, spawnPointCount: 0, verseFileCount: 1, unmappedDeviceCount: 0 },
      commands: [
        {
          kind: "spawn_device",
          id: "dev_1",
          label: "Device 1",
          deviceType: "trigger",
          assetPath: "/Fortnite/Devices/Trigger.Trigger",
          transform: {
            location: { x: 1, y: 2, z: 3 },
            rotation: { pitch: 4, yaw: 5, roll: 6 },
          },
        },
        { kind: "set_properties", id: "dev_1", properties: { enabled: true } },
        { kind: "create_spawn_point", id: "spawn_1", location: { x: 10, y: 20, z: 30 }, zoneId: "zone_1" },
        { kind: "write_verse", fileName: "game.verse", content: "module {}" },
        { kind: "save_current_level" },
      ],
    };

    const result = await executeApplyPlan(plan, client, { projectInfo: { project_dir: "/tmp/uefn-project" } });

    expect(calls).toEqual(["getAllActors", "spawnActor", "executePython", "setActorProperties", "createSpawnPoint", "capabilities", "executePython", "saveCurrentLevel", "getAllActors"]);
    expect(result.executed).toBe(5);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.reconciliation).toEqual({ expectedActorCount: 2, taggedActorCount: 1, missingActorCount: 1 });
  });

  it("skips Verse writes when project info does not include a project path", async () => {
    const client = { async getAllActors() { return []; }, async capabilities() { return undefined; } } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 0, spawnPointCount: 0, verseFileCount: 1, unmappedDeviceCount: 0 },
      commands: [{ kind: "write_verse", fileName: "game.verse", content: "module {}" }],
    };

    const result = await executeApplyPlan(plan, client);

    expect(result.executed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.warnings[0]).toContain("project dir was unavailable");
    expect(result.reconciliation).toEqual({ expectedActorCount: 0, taggedActorCount: 0, missingActorCount: 0 });
  });

  it("warns for per-property failures without aborting the apply", async () => {
    const client = {
      async getAllActors() { return []; },
      async spawnActor() { return { path: "Actor_1" }; },
      async executePython() { return {}; },
      async setActorProperties() { return { enabled: "ok", score: "error: read-only" }; },
    } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 1, spawnPointCount: 0, verseFileCount: 0, unmappedDeviceCount: 0 },
      commands: [
        {
          kind: "spawn_device",
          id: "dev_1",
          label: "Device 1",
          deviceType: "trigger",
          assetPath: "/Fortnite/Devices/Trigger.Trigger",
          transform: {
            location: { x: 1, y: 2, z: 3 },
            rotation: { pitch: 4, yaw: 5, roll: 6 },
          },
        },
        { kind: "set_properties", id: "dev_1", properties: { enabled: true, score: 10 } },
      ],
    };

    const result = await executeApplyPlan(plan, client);

    expect(result.executed).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toContain("Property \"score\" not applied to dev_1: error: read-only");
  });

  it("writes Verse through write_project_file when the ForgeAI fork is available", async () => {
    const calls: string[] = [];
    const client = {
      async getAllActors() { return []; },
      async capabilities() {
        calls.push("capabilities");
        return { status: "ok", forgeai_fork: "0.1.0" };
      },
      async writeProjectFile(relativePath: string, content: string) {
        calls.push(`${relativePath}:${content}`);
        return { path: `/Project/${relativePath}` };
      },
    } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 0, spawnPointCount: 0, verseFileCount: 1, unmappedDeviceCount: 0 },
      commands: [{ kind: "write_verse", fileName: "game.verse", content: "module {}" }],
    };

    const result = await executeApplyPlan(plan, client);

    expect(calls).toEqual(["capabilities", "Verse/game.verse:module {}"]);
    expect(result.executed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("falls back to execute_python for Verse writes without the ForgeAI fork", async () => {
    const calls: string[] = [];
    const client = {
      async getAllActors() { return []; },
      async capabilities() {
        calls.push("capabilities");
        return { status: "ok" };
      },
      async executePython() {
        calls.push("executePython");
        return {};
      },
    } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 0, spawnPointCount: 0, verseFileCount: 1, unmappedDeviceCount: 0 },
      commands: [{ kind: "write_verse", fileName: "game.verse", content: "module {}" }],
    };

    const result = await executeApplyPlan(plan, client, { projectInfo: { project_dir: "/tmp/uefn-project" } });

    expect(calls).toEqual(["capabilities", "executePython"]);
    expect(result.executed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("retries one 504 listener timeout and continues after success", async () => {
    const calls: string[] = [];
    const client = {
      async getAllActors() { return []; },
      async spawnActor() {
        calls.push("spawnActor");
        if (calls.length === 1) throw new UefnListenerError("spawn_actor", "Command timed out", 504);
        return { path: "Actor_1" };
      },
      async executePython() { return {}; },
    } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 1, spawnPointCount: 0, verseFileCount: 0, unmappedDeviceCount: 0 },
      commands: [
        {
          kind: "spawn_device",
          id: "dev_1",
          label: "Device 1",
          deviceType: "trigger",
          assetPath: "/Fortnite/Devices/Trigger.Trigger",
          transform: {
            location: { x: 1, y: 2, z: 3 },
            rotation: { pitch: 4, yaw: 5, roll: 6 },
          },
        },
      ],
    };

    const result = await executeApplyPlan(plan, client);

    expect(calls).toEqual(["spawnActor", "spawnActor"]);
    expect(result.executed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it("skips unmapped device spawns", async () => {
    const client = { async getAllActors() { return []; } } as unknown as UefnHttpClient;
    const plan: ApplyPlan = {
      warnings: ["missing mapping"],
      stats: { deviceCount: 1, spawnPointCount: 0, verseFileCount: 0, unmappedDeviceCount: 1 },
      commands: [
        {
          kind: "spawn_device",
          id: "dev_1",
          label: "Device 1",
          deviceType: "trigger",
          transform: {
            location: { x: 1, y: 2, z: 3 },
            rotation: { pitch: 4, yaw: 5, roll: 6 },
          },
        },
      ],
    };

    const result = await executeApplyPlan(plan, client);

    expect(result.executed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.warnings).toEqual(["missing mapping"]);
  });

  it("does not spawn actors that already have matching ForgeAI tags", async () => {
    const calls: string[] = [];
    const client = {
      async getAllActors() {
        calls.push("getAllActors");
        return [
          { name: "ExistingDevice", tags: ["forgeai", "forgeai:dev_1"] },
          { name: "ExistingSpawn", tags: ["forgeai", "forgeai:spawn_1"] },
        ];
      },
      async setActorProperties() {
        calls.push("setActorProperties");
        return {};
      },
      async setActorTransform() {
        calls.push("setActorTransform");
        return {};
      },
      async saveCurrentLevel() {
        calls.push("saveCurrentLevel");
        return {};
      },
    } as unknown as UefnHttpClient;

    const plan: ApplyPlan = {
      warnings: [],
      stats: { deviceCount: 1, spawnPointCount: 1, verseFileCount: 0, unmappedDeviceCount: 0 },
      commands: [
        {
          kind: "spawn_device",
          id: "dev_1",
          label: "Device 1",
          deviceType: "trigger",
          assetPath: "/Fortnite/Devices/Trigger.Trigger",
          transform: {
            location: { x: 1, y: 2, z: 3 },
            rotation: { pitch: 4, yaw: 5, roll: 6 },
          },
        },
        { kind: "set_properties", id: "dev_1", properties: { enabled: true } },
        { kind: "create_spawn_point", id: "spawn_1", location: { x: 10, y: 20, z: 30 }, zoneId: "zone_1" },
        { kind: "save_current_level" },
      ],
    };

    const result = await executeApplyPlan(plan, client);

    expect(calls).toEqual(["getAllActors", "setActorTransform", "setActorProperties", "setActorTransform", "saveCurrentLevel", "getAllActors"]);
    expect(result.executed).toBe(4);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.reconciliation).toEqual({ expectedActorCount: 2, taggedActorCount: 2, missingActorCount: 0 });
  });
});
