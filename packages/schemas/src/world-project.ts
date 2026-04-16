import { z } from "zod";
import { LayoutSpec } from "./layout.js";
import { EconomySpec } from "./economy.js";
import { DeviceInstance } from "./devices.js";
import { VerseModule } from "./verse-ast.js";
import { Genre } from "./templates.js";
import { PrefabDefinition, VariantZone } from "./prefabs.js";

export const SourceMode = z.enum(["map-studio", "verse-copilot"]);
export type SourceMode = z.infer<typeof SourceMode>;

export const ProgressionStyle = z.enum(["linear", "branching", "round-based", "sandbox"]);
export type ProgressionStyle = z.infer<typeof ProgressionStyle>;

export const OutputMode = z.enum(["scaffold", "scaffold_plus_automation"]);
export type OutputMode = z.infer<typeof OutputMode>;

export const WorldProject = z.object({
  specVersion: z.literal("wg/1.0"),
  projectId: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  source: z.object({
    mode: SourceMode,
    prompt: z.string(),
    seed: z.number().int(),
    references: z.array(z.string()).optional(),
  }),

  target: z.object({
    genre: Genre,
    uefnVersion: z.string(),
    outputMode: OutputMode,
  }),

  design: z.object({
    fantasy: z.string(),
    coreLoop: z.array(z.string()),
    sessionLengthMin: z.number(),
    progressionStyle: ProgressionStyle,
  }),

  layout: LayoutSpec,
  economy: EconomySpec,
  devices: z.array(DeviceInstance),
  prefabs: z.array(PrefabDefinition),
  variantZones: z.array(VariantZone).optional(),
  scripts: z.array(VerseModule),
  validation: z.array(z.object({
    validator: z.string(),
    passed: z.boolean(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  })),
});
export type WorldProject = z.infer<typeof WorldProject>;
