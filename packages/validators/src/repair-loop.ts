import type { WorldProject } from "@forgeai/schemas";
import type { LLMAdapter } from "@forgeai/ai";
import { runAllValidators, type RunValidatorsOptions } from "./runner.js";
import type { ValidationResult } from "./types.js";

export interface RepairResult {
  passed: boolean;
  passesUsed: number;
  finalResults: ValidationResult[];
  repairs: string[];
}

type ErrorCategory = "DUPLICATE_ID" | "UNKNOWN_REF" | "MISSING_ENTITY" | "SCHEMA_MISMATCH" | "OTHER";

interface CategorizedError {
  category: ErrorCategory;
  validator: string;
  message: string;
}

const SYSTEM_PROMPT = `You are a UEFN project repair agent. Given validation errors on a WorldProject JSON, output a JSON patch to fix them.

Return ONLY valid JSON with this structure:
{
  "fixes": [
    { "path": "economy.generators[0].currencyId", "value": "gold", "reason": "Fixed unknown currency reference" }
  ]
}

Error categories and typical fixes:
- DUPLICATE_ID: Rename with unique suffix
- UNKNOWN_REF: Fix the reference to point to an existing entity
- MISSING_ENTITY: Add the missing entity (zone, currency, spawn point)
- SCHEMA_MISMATCH: Fix the field value to match the expected type/format

Rules:
- Only fix errors that are reported — don't change anything else
- Use JSON path notation for the fix location
- Keep fixes minimal and targeted
- For MISSING_ENTITY errors, add the simplest valid entity that satisfies the constraint`;

export class RepairLoop {
  constructor(
    private llm: LLMAdapter,
    private maxPasses: number = 3,
    private validatorOptions: RunValidatorsOptions = {},
  ) {}

  async run(project: WorldProject): Promise<RepairResult> {
    const repairs: string[] = [];
    let passesUsed = 0;

    for (let i = 0; i < this.maxPasses; i++) {
      passesUsed++;
      const results = runAllValidators(project, this.validatorOptions);
      const allPassed = results.every((r) => r.passed);

      if (allPassed) {
        return { passed: true, passesUsed, finalResults: results, repairs };
      }

      const errors = results
        .filter((r) => !r.passed)
        .flatMap((r) => r.errors.map((e) => `[${r.validator}] ${e}`));

      const deterministicRepairs = this.applyDeterministicFixes(project, errors);
      if (deterministicRepairs.length > 0) {
        repairs.push(...deterministicRepairs.map((r) => `[pass ${passesUsed}][deterministic] ${r}`));
        const postFixResults = runAllValidators(project, this.validatorOptions);
        if (postFixResults.every((r) => r.passed)) {
          return { passed: true, passesUsed, finalResults: postFixResults, repairs };
        }
        const remainingErrors = postFixResults
          .filter((r) => !r.passed)
          .flatMap((r) => r.errors.map((e) => `[${r.validator}] ${e}`));
        if (remainingErrors.length === 0) continue;
      }

      const categorized = this.categorizeErrors(results);
      const grouped = this.formatCategorizedErrors(categorized);

      const response = await this.llm.chat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Fix these validation errors:\n\n${grouped}\n\nProject summary:\n- Zones: ${project.layout.zones.map((z) => z.zoneId).join(", ")}\n- Devices: ${project.devices.map((d) => d.id).join(", ")}\n- Currencies: ${project.economy.currencies.map((c) => c.currencyId).join(", ")}\n- Spawn points: ${project.layout.spawnPoints.map((sp) => sp.id).join(", ") || "(none)"}\n- Scripts: ${project.scripts.map((s) => s.name).join(", ") || "(none)"}`,
          },
        ],
        { temperature: 0.1, jsonMode: true },
      );

      let parsed: { fixes?: Array<{ path: string; value: unknown; reason: string }> };
      try {
        parsed = JSON.parse(response.content);
      } catch {
        const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = match ? JSON.parse(match[1]) : { fixes: [] };
      }

      if (!parsed.fixes || parsed.fixes.length === 0) break;

      for (const fix of parsed.fixes) {
        applyFix(project, fix.path, fix.value);
        repairs.push(`[pass ${passesUsed}][llm] ${fix.path}: ${fix.reason}`);
      }
    }

    const finalResults = runAllValidators(project, this.validatorOptions);
    return {
      passed: finalResults.every((r) => r.passed),
      passesUsed,
      finalResults,
      repairs,
    };
  }

  private applyDeterministicFixes(project: WorldProject, errors: string[]): string[] {
    const repairs: string[] = [];

    for (const error of errors) {
      const dupDevice = error.match(/Duplicate device ID: "(.+?)"/);
      if (dupDevice) {
        const dupeId = dupDevice[1];
        const existing = new Set(project.devices.map((d) => d.id));
        let suffix = 2;
        for (const dev of project.devices) {
          if (dev.id === dupeId) {
            let newId: string;
            do { newId = `${dupeId}-${suffix++}`; } while (existing.has(newId));
            dev.id = newId;
            existing.add(newId);
            repairs.push(`Renamed duplicate device "${dupeId}" → "${newId}"`);
            break;
          }
        }
        continue;
      }

      const dupZone = error.match(/Duplicate zone ID: "(.+?)"/);
      if (dupZone) {
        const dupeId = dupZone[1];
        const existing = new Set(project.layout.zones.map((z) => z.zoneId));
        let suffix = 2;
        for (const zone of project.layout.zones) {
          if (zone.zoneId === dupeId) {
            let newId: string;
            do { newId = `${dupeId}-${suffix++}`; } while (existing.has(newId));
            zone.zoneId = newId;
            existing.add(newId);
            repairs.push(`Renamed duplicate zone "${dupeId}" → "${newId}"`);
            break;
          }
        }
        continue;
      }

      const dupModule = error.match(/Duplicate module name: "(.+?)"/);
      if (dupModule) {
        const dupeName = dupModule[1];
        const existing = new Set(project.scripts.map((s) => s.name));
        let suffix = 2;
        for (const script of project.scripts) {
          if (script.name === dupeName) {
            let newName: string;
            do { newName = `${dupeName}_${suffix++}`; } while (existing.has(newName));
            script.name = newName;
            existing.add(newName);
            repairs.push(`Renamed duplicate module "${dupeName}" → "${newName}"`);
            break;
          }
        }
        continue;
      }

      const spawnUnknownZone = error.match(/Spawn point "(.+?)" references unknown zone/);
      if (spawnUnknownZone && project.layout.zones.length > 0) {
        const spId = spawnUnknownZone[1];
        const firstZone = project.layout.zones[0].zoneId;
        const sp = project.layout.spawnPoints.find((s) => s.id === spId);
        if (sp) {
          sp.zoneId = firstZone;
          repairs.push(`Remapped spawn point "${spId}" to zone "${firstZone}"`);
        }
        continue;
      }

      const deviceUnknownZone = error.match(/Device "(.+?)" references unknown zone/);
      if (deviceUnknownZone && project.layout.zones.length > 0) {
        const devId = deviceUnknownZone[1];
        const firstZone = project.layout.zones[0].zoneId;
        const dev = project.devices.find((d) => d.id === devId);
        if (dev) {
          dev.zoneId = firstZone;
          repairs.push(`Remapped device "${devId}" to zone "${firstZone}"`);
        }
        continue;
      }
    }

    return repairs;
  }

  private categorizeErrors(results: ValidationResult[]): CategorizedError[] {
    return results
      .filter((r) => !r.passed)
      .flatMap((r) =>
        r.errors.map((e) => ({
          category: categorizeError(e),
          validator: r.validator,
          message: e,
        })),
      );
  }

  private formatCategorizedErrors(errors: CategorizedError[]): string {
    const byCategory = new Map<ErrorCategory, CategorizedError[]>();
    for (const err of errors) {
      const list = byCategory.get(err.category) ?? [];
      list.push(err);
      byCategory.set(err.category, list);
    }
    const sections: string[] = [];
    for (const [category, errs] of byCategory) {
      sections.push(`## ${category}\n${errs.map((e) => `- [${e.validator}] ${e.message}`).join("\n")}`);
    }
    return sections.join("\n\n");
  }
}

function categorizeError(message: string): ErrorCategory {
  if (/[Dd]uplicate/.test(message)) return "DUPLICATE_ID";
  if (/unknown|references.*unknown/i.test(message)) return "UNKNOWN_REF";
  if (/has no|no .*(zones|spawn|currencies|scripts)/i.test(message)) return "MISSING_ENTITY";
  if (/schema|type|format|invalid/i.test(message)) return "SCHEMA_MISMATCH";
  return "OTHER";
}

function applyFix(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null) return;
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
