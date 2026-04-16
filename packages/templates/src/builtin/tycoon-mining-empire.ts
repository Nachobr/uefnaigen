import type { TemplateDefinition } from "@forgeai/schemas";

export const tycoonMiningEmpire: TemplateDefinition = {
  templateId: "tycoon/mining-empire",
  version: "1.0.0",
  genre: "tycoon",
  extends: "tycoon/base",
  summary:
    "Mining empire tycoon — dig ores, smelt bars at furnaces, sell metals, unlock deeper caves, hire NPC miners, prestige with depth multipliers.",
  layoutRules: {
    minZones: 7,
    maxZones: 12,
    requiredZonePurposes: [
      "starter_area",
      "resource_area",
      "shop",
      "upgrade_lane",
      "unlock_gate",
    ],
    layoutStyle: "hub_and_spoke",
  },
  systemModules: {
    required: ["economy", "progression", "save", "rebirth"],
    optional: ["loot", "pets", "npc_workers", "depth_progression"],
  },
  devicePolicies: {
    allowedDeviceTypes: [
      "trigger",
      "button",
      "item_granter",
      "item_spawner",
      "barrier",
      "tracker",
      "score_manager",
      "save_point",
      "teleporter",
      "hud_message",
      "prop_mover",
      "timer",
      "creature_spawner",
      "explosive_device",
    ],
    requiredDeviceTypes: ["trigger", "button", "tracker", "barrier", "item_spawner"],
  },
  verseModules: {
    required: [
      "GameManager",
      "EconomyManager",
      "UpgradeManager",
      "PurchaseButtonController",
      "SaveManager",
      "PrestigeManager",
      "HUDController",
      "ResourceNodeController",
    ],
    optional: [
      "LootRoller",
      "VariantZoneRandomizer",
      "NPCWorkerManager",
      "DepthManager",
    ],
  },
  prefabTags: ["tycoon", "mining", "cave", "ore", "furnace", "pickaxe"],
  validationProfiles: ["tycoon-economy-v1", "tycoon-progression-v1"],
};
