import { describe, it, expect } from "vitest";
import { ModulePlan } from "../verse-planner.js";
import { LootTable, LootTablesResult } from "../loot-generator.js";

describe("ModulePlan schema", () => {
  it("parses a valid module plan", () => {
    const plan = ModulePlan.parse({
      modules: [
        {
          moduleName: "EconomyManager",
          className: "tycoon_economy_manager",
          extends: "creative_device",
          purpose: "Tracks player currencies",
          editableFields: [
            { name: "SellTrigger", type: "trigger_device", deviceId: "dev_sell" },
          ],
          methods: [
            {
              name: "OnBegin",
              purpose: "Subscribe to events",
              params: [],
              returnType: "void",
              attributes: ["override", "suspends"],
            },
            {
              name: "HandleSell",
              purpose: "Grant currency on sell",
              params: ["Agent:agent"],
              returnType: "void",
            },
          ],
          imports: ["/Fortnite.com/Devices", "/Verse.org/Simulation"],
          dependsOn: ["GameManager"],
        },
      ],
    });
    expect(plan.modules).toHaveLength(1);
    expect(plan.modules[0].className).toBe("tycoon_economy_manager");
    expect(plan.modules[0].editableFields).toHaveLength(1);
    expect(plan.modules[0].methods).toHaveLength(2);
  });

  it("defaults extends to creative_device", () => {
    const plan = ModulePlan.parse({
      modules: [
        {
          moduleName: "Test",
          className: "test_class",
          purpose: "test",
          editableFields: [],
          methods: [],
          imports: [],
        },
      ],
    });
    expect(plan.modules[0].extends).toBe("creative_device");
  });

  it("validates multiple modules with dependencies", () => {
    const plan = ModulePlan.parse({
      modules: [
        {
          moduleName: "GameManager",
          className: "game_manager",
          purpose: "Lifecycle",
          editableFields: [],
          methods: [{ name: "OnBegin", purpose: "Start", attributes: ["override", "suspends"] }],
          imports: ["/Verse.org/Simulation"],
        },
        {
          moduleName: "EconomyManager",
          className: "economy_manager",
          purpose: "Currency",
          editableFields: [{ name: "Tracker", type: "tracker_device" }],
          methods: [{ name: "OnBegin", purpose: "Start", attributes: ["override", "suspends"] }],
          imports: ["/Fortnite.com/Devices"],
          dependsOn: ["GameManager"],
        },
      ],
    });
    expect(plan.modules).toHaveLength(2);
    expect(plan.modules[1].dependsOn).toContain("GameManager");
  });
});

describe("LootTable schema", () => {
  it("parses a valid loot table", () => {
    const table = LootTable.parse({
      tableId: "loot_zone_1",
      name: "Forest Drops",
      zoneId: "zone_1",
      entries: [
        { itemId: "log_small", name: "Small Log", weight: 60, rarity: "common", effect: "+5 gold" },
        { itemId: "log_golden", name: "Golden Log", weight: 5, rarity: "rare", effect: "+50 gold" },
      ],
    });
    expect(table.entries).toHaveLength(2);
    expect(table.entries[0].rarity).toBe("common");
  });

  it("parses a LootTablesResult", () => {
    const result = LootTablesResult.parse({
      tables: [
        {
          tableId: "loot_1",
          name: "Zone 1",
          entries: [
            { itemId: "i1", name: "Item", weight: 100, rarity: "common" },
          ],
        },
      ],
    });
    expect(result.tables).toHaveLength(1);
  });

  it("rejects invalid rarity", () => {
    expect(() =>
      LootTable.parse({
        tableId: "x",
        name: "x",
        entries: [{ itemId: "x", name: "x", weight: 1, rarity: "mythic" }],
      }),
    ).toThrow();
  });
});
