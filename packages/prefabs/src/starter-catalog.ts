import type { PrefabDefinition } from "@forgeai/schemas";
import { PrefabCatalog } from "./catalog.js";

const STARTER_PREFABS: PrefabDefinition[] = [
  // Foliage
  { prefabId: "pfb_pine_tree_01", name: "Pine Tree", category: "foliage", tags: ["tree", "forest", "lumber"], footprint: { w: 3, d: 3, h: 8 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["starter_area", "resource_area"] },
  { prefabId: "pfb_oak_tree_01", name: "Oak Tree", category: "foliage", tags: ["tree", "forest", "lumber"], footprint: { w: 4, d: 4, h: 10 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area"] },
  { prefabId: "pfb_bush_01", name: "Bush Cluster", category: "foliage", tags: ["bush", "decoration"], footprint: { w: 2, d: 2, h: 1 }, style: "natural", supportedGenres: ["tycoon", "adventure", "roleplay"], compatibleZones: ["starter_area", "resource_area", "social_hub"] },
  { prefabId: "pfb_flower_bed_01", name: "Flower Bed", category: "foliage", tags: ["flowers", "decoration", "cozy"], footprint: { w: 3, d: 1, h: 1 }, style: "cozy", supportedGenres: ["tycoon", "roleplay"], compatibleZones: ["starter_area", "social_hub", "shop"] },
  { prefabId: "pfb_rock_cluster_01", name: "Rock Cluster", category: "foliage", tags: ["rocks", "mining", "terrain"], footprint: { w: 3, d: 3, h: 2 }, style: "natural", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "combat_area"] },

  // Building
  { prefabId: "pfb_sawmill_01", name: "Small Sawmill", category: "building", tags: ["sawmill", "lumber", "processor"], footprint: { w: 8, d: 6, h: 5 }, style: "rustic", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane"] },
  { prefabId: "pfb_cabin_01", name: "Log Cabin", category: "building", tags: ["cabin", "shelter", "cozy"], footprint: { w: 6, d: 6, h: 4 }, style: "rustic", supportedGenres: ["tycoon", "roleplay"], compatibleZones: ["starter_area", "social_hub"] },
  { prefabId: "pfb_shop_stall_01", name: "Market Stall", category: "building", tags: ["shop", "market", "vendor"], footprint: { w: 4, d: 3, h: 3 }, style: "rustic", supportedGenres: ["tycoon", "roleplay"], compatibleZones: ["shop"] },
  { prefabId: "pfb_warehouse_01", name: "Warehouse", category: "building", tags: ["storage", "industrial"], footprint: { w: 10, d: 8, h: 6 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane", "resource_area"] },
  { prefabId: "pfb_watchtower_01", name: "Watchtower", category: "building", tags: ["tower", "lookout", "defense"], footprint: { w: 3, d: 3, h: 12 }, style: "medieval", supportedGenres: ["adventure", "battle_arena"], compatibleZones: ["combat_area", "unlock_gate"] },

  // Industrial
  { prefabId: "pfb_conveyor_01", name: "Conveyor Belt", category: "industrial", tags: ["conveyor", "automation", "factory"], footprint: { w: 8, d: 2, h: 2 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane", "resource_area"] },
  { prefabId: "pfb_furnace_01", name: "Smelting Furnace", category: "industrial", tags: ["furnace", "smelter", "mining", "processor"], footprint: { w: 4, d: 4, h: 5 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane"] },
  { prefabId: "pfb_mine_entrance_01", name: "Mine Entrance", category: "industrial", tags: ["mine", "mining", "cave"], footprint: { w: 5, d: 4, h: 4 }, style: "industrial", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "unlock_gate"] },
  { prefabId: "pfb_crane_01", name: "Construction Crane", category: "industrial", tags: ["crane", "construction", "factory"], footprint: { w: 4, d: 4, h: 15 }, style: "industrial", supportedGenres: ["tycoon"], compatibleZones: ["upgrade_lane"] },

  // Decor
  { prefabId: "pfb_lamp_post_01", name: "Lamp Post", category: "decor", tags: ["light", "decoration", "street"], footprint: { w: 1, d: 1, h: 4 }, style: "rustic", supportedGenres: ["tycoon", "roleplay", "adventure"], compatibleZones: ["starter_area", "shop", "social_hub"] },
  { prefabId: "pfb_fence_section_01", name: "Wooden Fence", category: "decor", tags: ["fence", "boundary", "decoration"], footprint: { w: 4, d: 1, h: 2 }, style: "rustic", supportedGenres: ["tycoon", "roleplay"], compatibleZones: ["starter_area", "resource_area", "shop"] },
  { prefabId: "pfb_sign_post_01", name: "Sign Post", category: "decor", tags: ["sign", "direction", "decoration"], footprint: { w: 1, d: 1, h: 3 }, style: "rustic", supportedGenres: ["tycoon", "adventure", "roleplay"], compatibleZones: ["starter_area", "unlock_gate"] },
  { prefabId: "pfb_barrel_stack_01", name: "Barrel Stack", category: "decor", tags: ["barrel", "storage", "decoration"], footprint: { w: 2, d: 2, h: 2 }, style: "rustic", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "shop"] },
  { prefabId: "pfb_crate_pile_01", name: "Crate Pile", category: "decor", tags: ["crate", "storage", "decoration"], footprint: { w: 2, d: 2, h: 2 }, style: "industrial", supportedGenres: ["tycoon", "adventure"], compatibleZones: ["resource_area", "upgrade_lane"] },

  // Combat
  { prefabId: "pfb_barrier_wall_01", name: "Barrier Wall", category: "combat", tags: ["barrier", "wall", "defense"], footprint: { w: 6, d: 1, h: 3 }, style: "military", supportedGenres: ["battle_arena", "adventure"], compatibleZones: ["combat_area", "unlock_gate"] },
  { prefabId: "pfb_ammo_crate_01", name: "Ammo Crate", category: "combat", tags: ["ammo", "weapons", "supply"], footprint: { w: 1, d: 1, h: 1 }, style: "military", supportedGenres: ["battle_arena", "adventure"], compatibleZones: ["combat_area", "starter_area"] },
  { prefabId: "pfb_spawn_pad_01", name: "Spawn Pad", category: "combat", tags: ["spawn", "respawn"], footprint: { w: 3, d: 3, h: 1 }, style: "sci-fi", supportedGenres: ["battle_arena"], compatibleZones: ["starter_area", "combat_area"] },

  // NPC
  { prefabId: "pfb_npc_worker_01", name: "NPC Worker Station", category: "npc_set", tags: ["npc", "worker", "automation"], footprint: { w: 2, d: 2, h: 3 }, style: "rustic", supportedGenres: ["tycoon"], compatibleZones: ["resource_area", "upgrade_lane"] },
  { prefabId: "pfb_npc_vendor_01", name: "NPC Vendor Booth", category: "npc_set", tags: ["npc", "vendor", "shop"], footprint: { w: 3, d: 2, h: 3 }, style: "rustic", supportedGenres: ["tycoon", "roleplay"], compatibleZones: ["shop"] },
];

export function createStarterCatalog(): PrefabCatalog {
  const catalog = new PrefabCatalog();
  for (const prefab of STARTER_PREFABS) {
    catalog.add(prefab);
  }
  return catalog;
}
