import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

import { WorldProject } from "./world-project.js";
import { LayoutSpec, ZoneSpec, SpawnPoint } from "./layout.js";
import { EconomySpec, CurrencySpec, IncomeSource, CurrencySink } from "./economy.js";
import { DeviceInstance } from "./devices.js";
import { TemplateDefinition } from "./templates.js";
import { PrefabDefinition, VariantZone } from "./prefabs.js";
import { VerseModule } from "./verse-ast.js";
import { JobRecord } from "./job.js";
import { ForgeAIConfig } from "./config.js";

const schemas = {
  WorldProject,
  LayoutSpec,
  ZoneSpec,
  SpawnPoint,
  EconomySpec,
  CurrencySpec,
  IncomeSource,
  CurrencySink,
  DeviceInstance,
  TemplateDefinition,
  PrefabDefinition,
  VariantZone,
  VerseModule,
  JobRecord,
  ForgeAIConfig,
} as const;

export type SchemaName = keyof typeof schemas;

export function exportJsonSchema(name: SchemaName): Record<string, unknown> {
  return zodToJsonSchema(schemas[name], { name, target: "jsonSchema7" }) as Record<string, unknown>;
}

export function exportAllJsonSchemas(): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const name of Object.keys(schemas) as SchemaName[]) {
    result[name] = exportJsonSchema(name);
  }
  return result;
}
