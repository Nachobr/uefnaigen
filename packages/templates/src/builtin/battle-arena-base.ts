import type { TemplateDefinition } from "@forgeai/schemas";

export const battleArenaBase: TemplateDefinition = {
  templateId: "battle_arena/base",
  version: "1.0.0",
  genre: "battle_arena",
  summary:
    "Battle arena base — round-based FFA or team combat with configurable spawn logic, weapon loadouts, scoring systems, kill streaks, power-up spawns, spectator mode, and leaderboards between rounds.",
  layoutRules: {
    minZones: 3,
    maxZones: 8,
    requiredZonePurposes: ["starter_area", "combat_area", "shop"],
    layoutStyle: "lane",
  },
  systemModules: {
    required: ["round_manager", "scoring", "spawn", "loadout"],
    optional: ["teams", "leaderboard", "spectator", "kill_streak", "power_ups", "match_history"],
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
      "elimination_manager",
      "weapon_rack",
      "health_powerup",
      "shield_powerup",
      "damage_zone",
    ],
    requiredDeviceTypes: [
      "trigger",
      "spawn_pad",
      "elimination_manager",
      "score_manager",
      "timer",
    ],
  },
  verseModules: {
    required: [
      "GameManager",
      "RoundManager",
      "SpawnController",
      "LoadoutManager",
      "ScoreManager",
      "HUDController",
    ],
    optional: [
      "TeamManager",
      "KillStreakManager",
      "SpectatorController",
      "LeaderboardManager",
    ],
  },
  prefabTags: ["arena", "combat", "weapon", "spawn", "cover", "powerup", "scoreboard", "respawn", "jump_pad"],
  validationProfiles: ["arena-rounds-v1", "arena-scoring-v1"],
};
