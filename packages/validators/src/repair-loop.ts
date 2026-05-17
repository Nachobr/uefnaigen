import type { VerseModule, WorldProject } from "@forgeai/schemas";
import type { LLMAdapter, ModulePlan, VerseGenerator } from "@forgeai/ai";
import { VerseEmitter, lintVerseCode } from "@forgeai/verse";
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

interface VerseRepairContext {
  generator: VerseGenerator;
  emitter: VerseEmitter;
  modulePlan: ModulePlan;
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
    private verseRepairContext?: VerseRepairContext,
  ) {}

  async run(project: WorldProject): Promise<RepairResult> {
    const repairs: string[] = [];
    let passesUsed = 0;
    const verseRegenAttempts = new Map<string, number>();

    for (let i = 0; i < this.maxPasses; i++) {
      passesUsed++;
      let results = runAllValidators(project, this.validatorOptions);
      const allPassed = results.every((r) => r.passed);

      if (allPassed) {
        return { passed: true, passesUsed, finalResults: results, repairs };
      }

      const verseRepairs = await this.regenerateVerseModules(project, results, verseRegenAttempts);
      if (verseRepairs.length > 0) {
        repairs.push(...verseRepairs.map((r) => `[pass ${passesUsed}][verse-regen] ${r}`));
        const postVerseResults = runAllValidators(project, this.validatorOptions);
        if (postVerseResults.every((r) => r.passed)) {
          return { passed: true, passesUsed, finalResults: postVerseResults, repairs };
        }
        results = postVerseResults;
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
        results = postFixResults;
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

  private async regenerateVerseModules(
    project: WorldProject,
    results: ValidationResult[],
    attempts: Map<string, number>,
  ): Promise<string[]> {
    if (!this.verseRepairContext) return [];

    const verseLintFailures = results.filter((r) => r.validator === "verse-lint" && !r.passed);
    if (verseLintFailures.length === 0) return [];

    const moduleNames = new Set<string>();
    for (const result of verseLintFailures) {
      for (const error of result.errors) {
        const moduleName = error.split(":", 1)[0]?.trim();
        if (moduleName) moduleNames.add(moduleName);
      }
    }

    const repairs: string[] = [];
    for (const moduleName of moduleNames) {
      const used = attempts.get(moduleName) ?? 0;
      if (used >= 2) continue;

      const planEntry = this.verseRepairContext.modulePlan.modules.find(
        (m) => m.className === moduleName || m.moduleName === moduleName,
      );
      if (!planEntry) continue;

      attempts.set(moduleName, used + 1);
      try {
        const regenerated = await this.verseRepairContext.generator.generate(planEntry);
        this.verseRepairContext.emitter.emit(regenerated);
        lintVerseCode(this.verseRepairContext.emitter.emit(regenerated));
        replaceScript(project.scripts, moduleName, regenerated);
        repairs.push(`${moduleName} (attempt ${used + 1}/2)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        repairs.push(`${moduleName} failed (attempt ${used + 1}/2): ${message}`);
      }
    }

    return repairs;
  }

  private applyDeterministicFixes(project: WorldProject, errors: string[]): string[] {
    const repairs: string[] = this.applyDeterministicVerseFixes(project, errors);

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

  private applyDeterministicVerseFixes(project: WorldProject, errors: string[]): string[] {
    if (!errors.some((e) => e.includes("[verse-lint]"))) return [];

    const repairs: string[] = [];
    for (const mod of project.scripts) {
      for (const decl of mod.declarations) {
        if (decl.kind !== "class") continue;
        for (const method of decl.methods) {
          let removedAgentBlock = false;
          const body = [];
          for (const stmt of method.body) {
            if (isPromptPlaceholder(stmt.code)) {
              body.push({ ...stmt, code: 'Print("ForgeAI removed placeholder event subscription")' });
              repairs.push(`Replaced placeholder Verse statement in ${mod.name}.${method.name}`);
              removedAgentBlock = false;
              continue;
            }

            if (/\[\s*Agent\s*\]/.test(stmt.code) && !hasAgentParam(method.params)) {
              if (method.name === "OnBegin") {
                body.push({ ...stmt, code: 'Print("ForgeAI skipped agent-scoped startup logic without Agent context")' });
                repairs.push(`Removed unbound Agent usage from ${mod.name}.${method.name}`);
                removedAgentBlock = true;
                continue;
              }
              method.params = [...method.params, { name: "Agent", type: "agent" }];
              repairs.push(`Added Agent parameter to ${mod.name}.${method.name}`);
            }

            if (removedAgentBlock && /^\s+/.test(stmt.code)) {
              repairs.push(`Removed orphaned indented statement from ${mod.name}.${method.name}`);
              continue;
            }
            removedAgentBlock = false;
            body.push(stmt);
          }
          method.body = body;
        }
      }
    }

    return [...new Set(repairs)];
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

function isPromptPlaceholder(code: string): boolean {
  return (
    /\bSomeDevice\.SomeEvent\b|\bSomeEvent\.Subscribe\b|Subscribe\s*\(\s*Handler\s*\)/.test(code) ||
    /\bPlayer\.(Currency|Score|PrestigeLevel|ApplyReward|Coins|Gold|XP|Level|Inventory)\b/.test(code) ||
    /\b(PrestigeSystem|EconomyManager|Economy|InventorySystem|ScoreManager|QuestSystem|ShopSystem)\.[A-Za-z_]/.test(code)
  );
}

function hasAgentParam(params: Array<{ name: string; type: string }>): boolean {
  return params.some((p) => p.name === "Agent");
}

function replaceScript(scripts: VerseModule[], moduleName: string, regenerated: VerseModule): void {
  const index = scripts.findIndex((s) => s.name === moduleName || s.name === regenerated.name);
  if (index === -1) return;
  scripts[index] = regenerated;
}
