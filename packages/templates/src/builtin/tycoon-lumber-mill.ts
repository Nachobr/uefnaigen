import type { TemplateDefinition } from "@forgeai/schemas";

export const tycoonLumberMill: TemplateDefinition = {
  templateId: "tycoon/lumber-mill",
  version: "1.0.0",
  genre: "tycoon",
  extends: "tycoon/base",
  summary:
    "Lumber tycoon — chop trees, process logs at sawmills, sell planks, unlock biome islands, hire NPC workers, prestige into new biomes.",
  layoutRules: {
    minZones: 7,
    maxZones: 10,
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
    optional: ["loot", "pets", "npc_workers", "biome_progression"],
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
    ],
  },
  prefabTags: ["tycoon", "lumber", "forest", "sawmill", "tree", "plank"],
  validationProfiles: ["tycoon-economy-v1", "tycoon-progression-v1"],
};
