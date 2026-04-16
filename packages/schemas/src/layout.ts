import { z } from "zod";

export const WorldType = z.enum(["grid2d", "hub_and_spoke", "lane", "open_world_zones"]);
export type WorldType = z.infer<typeof WorldType>;

export const ZonePurpose = z.enum([
  "starter_area",
  "resource_area",
  "combat_area",
  "shop",
  "upgrade_lane",
  "boss_area",
  "social_hub",
  "unlock_gate",
]);
export type ZonePurpose = z.infer<typeof ZonePurpose>;

export const ProgressionGate = z.object({
  currency: z.string().optional(),
  cost: z.number().optional(),
  minLevel: z.number().int().optional(),
  prerequisiteZoneIds: z.array(z.string()).optional(),
});
export type ProgressionGate = z.infer<typeof ProgressionGate>;

export const ZoneSpec = z.object({
  zoneId: z.string(),
  name: z.string(),
  purpose: ZonePurpose,
  footprint: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  elevation: z.number().optional(),
  requiredDevices: z.array(z.string()).optional(),
  allowedPrefabTags: z.array(z.string()).optional(),
  progressionGate: ProgressionGate.optional(),
});
export type ZoneSpec = z.infer<typeof ZoneSpec>;

export const SpawnPoint = z.object({
  id: z.string(),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  zoneId: z.string(),
});
export type SpawnPoint = z.infer<typeof SpawnPoint>;

export const LayoutSpec = z.object({
  worldType: WorldType,
  bounds: z.object({
    width: z.number(),
    depth: z.number(),
    height: z.number().optional(),
  }),
  zones: z.array(ZoneSpec),
  spawnPoints: z.array(SpawnPoint),
});
export type LayoutSpec = z.infer<typeof LayoutSpec>;
