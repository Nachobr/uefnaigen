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
