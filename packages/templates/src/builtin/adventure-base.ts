import type { TemplateDefinition } from "@forgeai/schemas";

export const adventureBase: TemplateDefinition = {
  templateId: "adventure/base",
  version: "1.0.0",
  genre: "adventure",
  summary:
    "Adventure base — hub world connecting quest zones via progression gates, multi-step quest chains with NPC dialogue, escalating enemy waves per zone, boss encounters with unique mechanics, checkpoint saves, and loot rewards with rarity tiers.",
  layoutRules: {
    minZones: 5,
    maxZones: 12,
    requiredZonePurposes: [
      "starter_area",
      "combat_area",
      "boss_area",
      "social_hub",
      "shop",
    ],
    layoutStyle: "hub_and_spoke",
  },
  systemModules: {
    required: ["quest", "combat", "checkpoint", "save"],
    optional: ["loot", "crafting", "pets", "boss_mechanics", "enemy_waves", "dialogue", "inventory"],
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
      "hud_message",
      "timer",
      "spawn_pad",
      "creature_spawner",
      "checkpoint_device",
      "teleporter",
      "health_powerup",
      "damage_zone",
    ],
    requiredDeviceTypes: [
      "trigger",
      "creature_spawner",
      "checkpoint_device",
      "item_granter",
      "spawn_pad",
    ],
  },
  verseModules: {
    required: [
      "GameManager",
      "QuestManager",
      "CombatManager",
      "CheckpointManager",
      "HUDController",
      "EnemyWaveController",
    ],
    optional: [
      "BossController",
      "LootRoller",
      "CraftingManager",
      "DialogueManager",
      "InventoryManager",
    ],
  },
  prefabTags: ["adventure", "quest", "enemy", "boss", "checkpoint", "treasure", "dungeon", "campfire", "crystal", "altar"],
  validationProfiles: ["adventure-quests-v1", "adventure-combat-v1"],
};
