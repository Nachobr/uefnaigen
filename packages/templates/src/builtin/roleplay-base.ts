import type { TemplateDefinition } from "@forgeai/schemas";

export const roleplayBase: TemplateDefinition = {
  templateId: "roleplay/base",
  version: "1.0.0",
  genre: "roleplay",
  summary:
    "Roleplay base — town/city hub with job stations, housing plots, social gathering areas, currency/shop loops, NPC interactions, customizable outfits, and social event systems.",
  layoutRules: {
    minZones: 4,
    maxZones: 10,
    requiredZonePurposes: [
      "starter_area",
      "social_hub",
      "shop",
      "resource_area",
    ],
    layoutStyle: "hub_and_spoke",
  },
  systemModules: {
    required: ["jobs", "currency", "shop", "housing"],
    optional: ["outfit", "pets", "vehicles", "social_events", "leaderboard", "inventory", "dialogue"],
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
      "teleporter",
      "billboard",
    ],
    requiredDeviceTypes: [
      "trigger",
      "spawn_pad",
      "item_granter",
      "hud_message",
    ],
  },
  verseModules: {
    required: [
      "GameManager",
      "JobManager",
      "CurrencyManager",
      "ShopController",
      "HousingManager",
      "HUDController",
    ],
    optional: [
      "OutfitManager",
      "PetController",
      "VehicleManager",
      "SocialEventManager",
      "DialogueManager",
    ],
  },
  prefabTags: ["town", "housing", "shop", "job", "social", "park", "apartment", "vendor", "npc", "street"],
  validationProfiles: ["roleplay-jobs-v1", "roleplay-social-v1"],
};
