import { z } from "zod";

export const PrefabCategory = z.enum([
  "building",
  "foliage",
  "industrial",
  "decor",
  "combat",
  "npc_set",
]);
export type PrefabCategory = z.infer<typeof PrefabCategory>;

export const PrefabDefinition = z.object({
  prefabId: z.string(),
  name: z.string(),
  category: PrefabCategory,
  tags: z.array(z.string()),
  footprint: z.object({ w: z.number(), d: z.number(), h: z.number() }),
  style: z.string(),
  supportedGenres: z.array(z.string()),
  compatibleZones: z.array(z.string()),
});
export type PrefabDefinition = z.infer<typeof PrefabDefinition>;

export const SelectionMode = z.enum(["one_of_n", "weighted_pool", "daily_rotation"]);
export type SelectionMode = z.infer<typeof SelectionMode>;

export const SeedSource = z.enum(["project_seed", "session_seed", "round_seed"]);
export type SeedSource = z.infer<typeof SeedSource>;

export const VariantChoice = z.object({
  variantId: z.string(),
  prefabIds: z.array(z.string()),
  weight: z.number(),
  deviceOverrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});
export type VariantChoice = z.infer<typeof VariantChoice>;

export const VariantZone = z.object({
  zoneId: z.string(),
  selectionMode: SelectionMode,
  variants: z.array(VariantChoice),
  runtimeSeedSource: SeedSource,
});
export type VariantZone = z.infer<typeof VariantZone>;
