import type { PrefabDefinition } from "@forgeai/schemas";
import { PrefabCatalog } from "./catalog.js";

const FOREST_PACK: PrefabDefinition[] = [
  { prefabId: "pfb_birch_tree_01", name: "Birch Tree", category: "foliage", tags: ["tree", "forest", "birch"], footprint: { w: 3, d: 3, h: 9 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "starter_area"] },
  { prefabId: "pfb_fallen_log_01", name: "Fallen Log", category: "foliage", tags: ["log", "forest", "obstacle"], footprint: { w: 6, d: 2, h: 2 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area"] },
  { prefabId: "pfb_mushroom_cluster_01", name: "Mushroom Cluster", category: "foliage", tags: ["mushroom", "forest", "decoration"], footprint: { w: 2, d: 2, h: 1 }, style: "natural", supportedGenres: ["tycoon", "adventure", "roleplay"], compatibleZones: ["resource_area", "starter_area"] },
  { prefabId: "pfb_tree_stump_01", name: "Tree Stump", category: "foliage", tags: ["stump", "forest", "lumber"], footprint: { w: 2, d: 2, h: 1 }, style: "natural", supportedGenres: ["tycoon"], compatibleZones: ["resource_area"] },
  { prefabId: "pfb_mossy_boulder_01", name: "Mossy Boulder", category: "foliage", tags: ["rock", "forest", "moss"], footprint: { w: 3, d: 3, h: 2 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "combat_area"] },
  { prefabId: "pfb_forest_bridge_01", name: "Wooden Bridge", category: "building", tags: ["bridge", "forest", "crossing"], footprint: { w: 8, d: 3, h: 3 }, style: "rustic", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "unlock_gate"] },
  { prefabId: "pfb_ranger_hut_01", name: "Ranger Hut", category: "building", tags: ["cabin", "forest", "outpost"], footprint: { w: 5, d: 5, h: 4 }, style: "rustic", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["starter_area", "resource_area"] },
  { prefabId: "pfb_log_pile_01", name: "Log Pile", category: "decor", tags: ["logs", "lumber", "forest", "storage"], footprint: { w: 3, d: 2, h: 2 }, style: "rustic", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane"] },
  { prefabId: "pfb_forest_torch_01", name: "Forest Torch", category: "decor", tags: ["light", "forest", "torch"], footprint: { w: 1, d: 1, h: 3 }, style: "rustic", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["starter_area", "resource_area", "unlock_gate"] },
  { prefabId: "pfb_vine_wall_01", name: "Vine-Covered Wall", category: "decor", tags: ["vine", "forest", "wall", "decoration"], footprint: { w: 4, d: 1, h: 4 }, style: "natural", supportedGenres: ["adventure"], compatibleZones: ["resource_area", "boss_area"] },
];

const INDUSTRIAL_PACK: PrefabDefinition[] = [
  { prefabId: "pfb_steel_beam_01", name: "Steel Beam Frame", category: "industrial", tags: ["steel", "frame", "factory"], footprint: { w: 6, d: 6, h: 8 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane", "resource_area"] },
  { prefabId: "pfb_smoke_stack_01", name: "Smoke Stack", category: "industrial", tags: ["chimney", "factory", "pollution"], footprint: { w: 3, d: 3, h: 15 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane"] },
  { prefabId: "pfb_tank_01", name: "Storage Tank", category: "industrial", tags: ["tank", "storage", "factory"], footprint: { w: 4, d: 4, h: 6 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane"] },
  { prefabId: "pfb_pipe_section_01", name: "Pipe Section", category: "industrial", tags: ["pipe", "plumbing", "factory"], footprint: { w: 6, d: 1, h: 2 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane", "resource_area"] },
  { prefabId: "pfb_control_panel_01", name: "Control Panel", category: "industrial", tags: ["control", "automation", "factory"], footprint: { w: 2, d: 1, h: 2 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane"] },
  { prefabId: "pfb_caution_sign_01", name: "Caution Sign", category: "decor", tags: ["sign", "warning", "industrial"], footprint: { w: 1, d: 1, h: 2 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane", "unlock_gate"] },
  { prefabId: "pfb_metal_walkway_01", name: "Metal Walkway", category: "building", tags: ["walkway", "bridge", "industrial"], footprint: { w: 8, d: 2, h: 4 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane"] },
  { prefabId: "pfb_loading_dock_01", name: "Loading Dock", category: "building", tags: ["dock", "shipping", "factory"], footprint: { w: 10, d: 6, h: 5 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["shop", "upgrade_lane"] },
  { prefabId: "pfb_forklift_01", name: "Forklift", category: "industrial", tags: ["vehicle", "forklift", "factory"], footprint: { w: 3, d: 2, h: 3 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane", "shop"] },
  { prefabId: "pfb_hazard_barrel_01", name: "Hazard Barrel", category: "decor", tags: ["barrel", "hazard", "industrial"], footprint: { w: 1, d: 1, h: 2 }, style: "industrial", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "combat_area"] },
];

export function createForestPack(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of FOREST_PACK) {
    catalog.add(prefab);
  }
  return catalog;
}

export function createIndustrialPack(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of INDUSTRIAL_PACK) {
    catalog.add(prefab);
  }
  return catalog;
}

const ADVENTURE_PACK: PrefabDefinition[] = [
  { prefabId: "pfb_treasure_chest_01", name: "Treasure Chest", category: "decor", tags: ["treasure", "loot", "adventure"], footprint: { w: 2, d: 1, h: 1 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["combat_area", "boss_area"] },
  { prefabId: "pfb_dungeon_gate_01", name: "Dungeon Gate", category: "building", tags: ["gate", "dungeon", "adventure"], footprint: { w: 5, d: 2, h: 6 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["unlock_gate", "boss_area"] },
  { prefabId: "pfb_campfire_01", name: "Campfire", category: "decor", tags: ["campfire", "checkpoint", "adventure"], footprint: { w: 2, d: 2, h: 2 }, style: "medieval", supportedGenres: ["adventure", "roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_quest_board_01", name: "Quest Board", category: "decor", tags: ["quest", "npc", "adventure"], footprint: { w: 2, d: 1, h: 3 }, style: "medieval", supportedGenres: ["adventure", "roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_healing_fountain_01", name: "Healing Fountain", category: "decor", tags: ["healing", "checkpoint", "adventure"], footprint: { w: 3, d: 3, h: 4 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_enemy_totem_01", name: "Enemy Totem", category: "combat", tags: ["enemy", "spawner", "adventure"], footprint: { w: 2, d: 2, h: 5 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_boss_altar_01", name: "Boss Altar", category: "combat", tags: ["boss", "altar", "adventure"], footprint: { w: 4, d: 4, h: 3 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["boss_area"] },
  { prefabId: "pfb_crystal_pillar_01", name: "Crystal Pillar", category: "decor", tags: ["crystal", "magic", "adventure"], footprint: { w: 1, d: 1, h: 6 }, style: "fantasy", supportedGenres: ["adventure"], compatibleZones: ["boss_area", "combat_area"] },
  { prefabId: "pfb_rope_bridge_01", name: "Rope Bridge", category: "building", tags: ["bridge", "crossing", "adventure"], footprint: { w: 10, d: 2, h: 3 }, style: "medieval", supportedGenres: ["adventure"], compatibleZones: ["resource_area", "combat_area"] },
  { prefabId: "pfb_npc_questgiver_01", name: "NPC Quest Giver", category: "npc_set", tags: ["npc", "quest", "adventure"], footprint: { w: 2, d: 2, h: 3 }, style: "medieval", supportedGenres: ["adventure", "roleplay"], compatibleZones: ["social_hub", "starter_area"] },
];

export function createAdventurePack(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of ADVENTURE_PACK) catalog.add(prefab);
  return catalog;
}

const ARENA_PACK: PrefabDefinition[] = [
  { prefabId: "pfb_cover_wall_01", name: "Cover Wall", category: "combat", tags: ["cover", "wall", "arena"], footprint: { w: 4, d: 1, h: 2 }, style: "military", supportedGenres: ["battle_arena"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_cover_crate_01", name: "Cover Crate", category: "combat", tags: ["cover", "crate", "arena"], footprint: { w: 2, d: 2, h: 2 }, style: "military", supportedGenres: ["battle_arena"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_weapon_rack_01", name: "Weapon Rack", category: "combat", tags: ["weapon", "rack", "loadout", "arena"], footprint: { w: 2, d: 1, h: 2 }, style: "military", supportedGenres: ["battle_arena"], compatibleZones: ["starter_area", "combat_area"] },
  { prefabId: "pfb_health_station_01", name: "Health Station", category: "combat", tags: ["health", "powerup", "arena"], footprint: { w: 2, d: 2, h: 3 }, style: "sci-fi", supportedGenres: ["battle_arena", "adventure"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_shield_bubble_01", name: "Shield Bubble", category: "combat", tags: ["shield", "powerup", "arena"], footprint: { w: 3, d: 3, h: 3 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_jump_pad_01", name: "Jump Pad", category: "combat", tags: ["jump", "movement", "arena"], footprint: { w: 2, d: 2, h: 1 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_scoreboard_01", name: "Scoreboard Display", category: "decor", tags: ["scoreboard", "hud", "arena"], footprint: { w: 3, d: 1, h: 4 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["starter_area"] },
  { prefabId: "pfb_team_banner_01", name: "Team Banner", category: "decor", tags: ["team", "banner", "arena"], footprint: { w: 1, d: 1, h: 4 }, style: "military", supportedGenres: ["battle_arena"], compatibleZones: ["starter_area", "combat_area"] },
  { prefabId: "pfb_loot_drop_01", name: "Loot Drop Pod", category: "combat", tags: ["loot", "drop", "arena"], footprint: { w: 2, d: 2, h: 3 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["combat_area"] },
  { prefabId: "pfb_respawn_beacon_01", name: "Respawn Beacon", category: "combat", tags: ["respawn", "spawn", "arena"], footprint: { w: 2, d: 2, h: 4 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["starter_area", "combat_area"] },
];

export function createArenaPack(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of ARENA_PACK) catalog.add(prefab);
  return catalog;
}

const ROLEPLAY_PACK: PrefabDefinition[] = [
  { prefabId: "pfb_town_hall_01", name: "Town Hall", category: "building", tags: ["town", "hall", "social", "roleplay"], footprint: { w: 8, d: 8, h: 6 }, style: "rustic", supportedGenres: ["roleplay"], compatibleZones: ["social_hub"] },
  { prefabId: "pfb_apartment_01", name: "Apartment Building", category: "building", tags: ["housing", "apartment", "home", "roleplay"], footprint: { w: 6, d: 6, h: 8 }, style: "modern", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_job_board_01", name: "Job Board", category: "decor", tags: ["job", "board", "social", "roleplay"], footprint: { w: 2, d: 1, h: 3 }, style: "rustic", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_park_bench_01", name: "Park Bench", category: "decor", tags: ["park", "bench", "social", "rest"], footprint: { w: 3, d: 1, h: 1 }, style: "rustic", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_street_lamp_01", name: "Street Lamp", category: "decor", tags: ["lamp", "street", "light", "town"], footprint: { w: 1, d: 1, h: 4 }, style: "modern", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area", "shop"] },
  { prefabId: "pfb_food_stall_01", name: "Food Stall", category: "building", tags: ["food", "vendor", "shop", "roleplay"], footprint: { w: 3, d: 3, h: 3 }, style: "rustic", supportedGenres: ["roleplay"], compatibleZones: ["shop"] },
  { prefabId: "pfb_garage_01", name: "Garage Workshop", category: "building", tags: ["garage", "vehicle", "job", "roleplay"], footprint: { w: 6, d: 5, h: 4 }, style: "industrial", supportedGenres: ["roleplay"], compatibleZones: ["resource_area"] },
  { prefabId: "pfb_mailbox_01", name: "Mailbox", category: "decor", tags: ["mail", "housing", "town", "roleplay"], footprint: { w: 1, d: 1, h: 2 }, style: "rustic", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area"] },
  { prefabId: "pfb_clothing_rack_01", name: "Clothing Rack", category: "decor", tags: ["clothing", "outfit", "fashion", "roleplay"], footprint: { w: 2, d: 1, h: 2 }, style: "modern", supportedGenres: ["roleplay"], compatibleZones: ["shop"] },
  { prefabId: "pfb_npc_citizen_01", name: "NPC Citizen", category: "npc_set", tags: ["npc", "citizen", "social", "roleplay"], footprint: { w: 2, d: 2, h: 3 }, style: "modern", supportedGenres: ["roleplay"], compatibleZones: ["social_hub", "starter_area"] },
];

export function createRoleplayPack(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of ROLEPLAY_PACK) catalog.add(prefab);
  return catalog;
}
