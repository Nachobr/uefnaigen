import type {
  WorldProject,
  LayoutSpec,
  EconomySpec,
  DeviceInstance,
  PrefabDefinition,
  VariantZone,
  JobRecord,
  VerseModule,
} from "@forgeai/schemas";
import type { NormalizedBrief } from "@forgeai/ai";
import type { ValidationResult } from "@forgeai/validators";

export interface AssembleProjectInput {
  job: JobRecord;
  prompt: string;
  seed: number;
  brief: NormalizedBrief;
  layout: LayoutSpec;
  economy: EconomySpec;
  devices: DeviceInstance[];
  scripts: VerseModule[];
  prefabs?: PrefabDefinition[];
  variantZones?: VariantZone[];
  validation?: ValidationResult[];
  /** Map name from the World Planner output. Preferred over the truncated brief.fantasy fallback. */
  mapName?: string;
}

function projectName(input: AssembleProjectInput): string {
  if (input.mapName && input.mapName.trim().length > 0) return input.mapName.trim().slice(0, 60);
  if (input.brief.fantasy && input.brief.fantasy.trim().length > 0) return input.brief.fantasy.trim().slice(0, 60);
  return "Untitled UEFN Project";
}

export function assembleProject(input: AssembleProjectInput): WorldProject {
  return {
    specVersion: "wg/1.0",
    projectId: input.job.projectId,
    name: projectName(input),
    slug: input.job.jobId,
    createdAt: input.job.startedAt,
    updatedAt: new Date().toISOString(),
    source: { mode: "map-studio", prompt: input.prompt, seed: input.seed },
    target: {
      genre: input.brief.genre,
      uefnVersion: "32.00",
      outputMode: "scaffold",
    },
    design: {
      fantasy: input.brief.fantasy,
      coreLoop: input.brief.coreLoop,
      sessionLengthMin: input.brief.sessionLengthMin,
      progressionStyle: input.brief.progressionStyle,
    },
    layout: input.layout,
    economy: input.economy,
    devices: input.devices,
    prefabs: input.prefabs ?? [],
    variantZones: input.variantZones,
    scripts: input.scripts,
    validation: (input.validation ?? []).map((v) => ({
      validator: v.validator,
      passed: v.passed,
      errors: v.errors.length > 0 ? v.errors : undefined,
      warnings: v.warnings.length > 0 ? v.warnings : undefined,
    })),
  };
}
