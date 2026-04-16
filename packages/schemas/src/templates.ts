import { z } from "zod";
import { WorldType } from "./layout.js";

export const Genre = z.enum(["tycoon", "battle_arena", "adventure", "roleplay"]);
export type Genre = z.infer<typeof Genre>;

export const TemplateDefinition = z.object({
  templateId: z.string(),
  version: z.string(),
  genre: Genre,
  extends: z.string().optional(),
  summary: z.string(),
  layoutRules: z.object({
    minZones: z.number().int(),
    maxZones: z.number().int(),
    requiredZonePurposes: z.array(z.string()),
    layoutStyle: WorldType,
  }),
  systemModules: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()),
  }),
  devicePolicies: z.object({
    allowedDeviceTypes: z.array(z.string()),
    requiredDeviceTypes: z.array(z.string()),
  }),
  verseModules: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()),
  }),
  prefabTags: z.array(z.string()),
  validationProfiles: z.array(z.string()),
});
export type TemplateDefinition = z.infer<typeof TemplateDefinition>;
