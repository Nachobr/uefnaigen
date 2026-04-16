import type { TemplateDefinition } from "@forgeai/schemas";

export const tycoonBase: TemplateDefinition = {
  templateId: "tycoon/base",
  version: "1.0.0",
  genre: "tycoon",
  summary:
    "Base tycoon template — resource gathering, selling, upgrading, automation, and prestige loops.",
  layoutRules: {
    minZones: 6,
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
    optional: ["loot", "pets", "leaderboard", "daily_rewards"],
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
    ],
    requiredDeviceTypes: ["trigger", "button", "tracker", "barrier"],
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
    ],
    optional: [
      "LootRoller",
      "VariantZoneRandomizer",
      "ResourceNodeController",
    ],
  },
  prefabTags: ["tycoon", "currency", "upgrade_station"],
  validationProfiles: ["tycoon-economy-v1", "tycoon-progression-v1"],
};
