import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { ForgeAIConfig, JobRecord, TemplateDefinition, WorldProject } from "@forgeai/schemas";
import {
  BudgetAdapter,
  ModifierAgent,
  RetryAdapter,
  VerseGenerator,
  createAdapterWithFallback,
  type LLMAdapter,
  type LootTable,
  type ModulePlan,
  type WorldDesign,
} from "@forgeai/ai";
import { ArenaSimulator, TycoonSimulator, type SimulationResult } from "@forgeai/balance";
import { ScaffoldPackager } from "@forgeai/packager";
import { VerseEmitter, lintVerseCode } from "@forgeai/verse";
import { runAllValidators, RepairLoop, type ValidationResult, type RepairResult } from "@forgeai/validators";
import type { Logger } from "pino";
import { createLogger } from "./logger.js";
import { JobManager } from "./job-manager.js";
import { UsageLedger } from "./usage-ledger.js";
import { loadProject } from "./project-loader.js";
import { ProjectPatch, applyProjectPatch, type ProjectPatch as ProjectPatchType } from "./project-patch.js";
import { KNOWLEDGE_VERSION, MemoCache } from "./memo-cache.js";

export interface ModifierOptions {
  projectDir: string;
  request: string;
  config: ForgeAIConfig;
  outputDir?: string;
  dryRun?: boolean;
  force?: boolean;
  repair?: boolean;
  repairPasses?: number;
  strict?: boolean;
  llm?: LLMAdapter;
  logger?: Logger;
}

export interface ModifierResult {
  patch: ProjectPatchType;
  project: WorldProject;
  validation: ValidationResult[];
  repairResult?: RepairResult;
  costUsd: number;
  changedFiles: string[];
  jobId: string;
  outputPath: string;
}

export class Modifier {
  private llm: LLMAdapter;
  private logger: Logger;
  private ledger: UsageLedger;
  private budgetAdapter?: BudgetAdapter;

  constructor(private options: ModifierOptions) {
    this.logger = options.logger ?? createLogger({ enabled: options.config.verbose });
    this.ledger = new UsageLedger({ persist: !options.dryRun });
    const fallbackLogger = {
      warn: (obj: object, msg?: string) => this.logger.warn(obj, msg),
      error: (obj: object, msg?: string) => this.logger.error(obj, msg),
      info: (obj: object, msg?: string) => this.logger.info(obj, msg),
    };
    let adapter = options.llm ?? createAdapterWithFallback(options.config, { logger: fallbackLogger });
    adapter = new RetryAdapter(adapter, { timeoutMs: llmTimeoutMs(options.config.provider) });
    this.budgetAdapter = new BudgetAdapter(adapter, options.config.budgetUsd ?? Number.POSITIVE_INFINITY, {
      provider: options.config.provider,
      model: options.config.model,
      onUsage: (event) => {
        this.ledger.recordCall(event.provider, event.inputTokens, event.outputTokens, event.costUsd);
        this.logger.info({ provider: event.provider, model: event.model, costUsd: event.costUsd }, "modifier llm usage");
      },
    });
    this.llm = this.budgetAdapter;
  }

  get totalSpentUsd(): number {
    return this.budgetAdapter?.totalSpentUsd ?? 0;
  }

  async run(): Promise<ModifierResult> {
    const loaded = loadProject(this.options.projectDir);
    if (loaded.humanEditedFiles.length > 0 && !this.options.force) {
      throw new Error(`Human-edited files detected; re-run with --force to overwrite: ${loaded.humanEditedFiles.join(", ")}`);
    }

    const jobManager = new JobManager({ persist: !this.options.dryRun });
    const job = jobManager.create(
      this.options.request,
      loaded.project.source.seed,
    );
    const agent = new ModifierAgent(this.llm);
    const parentProjectHash = computeParentProjectHash(loaded.project, loaded.verseFiles);
    const memo = new MemoCache({
      prompt: this.options.request,
      templateId: "modify",
      templateVersion: loaded.lock?.templateVersion ?? loaded.resolvedTemplate?.version,
      provider: this.options.config.provider,
      model: this.options.config.model,
      seed: loaded.project.source.seed,
      knowledgeVersion: KNOWLEDGE_VERSION,
      parentProjectHash,
    }, { persist: !this.options.dryRun });
    const cachedPatch = memo.load<ProjectPatchType>("modify-patch");
    const patch = ProjectPatch.parse(cachedPatch ?? await agent.proposePatch(loaded.project, this.options.request));
    if (!cachedPatch) memo.save("modify-patch", patch);
    const applied = applyProjectPatch(loaded.project, patch);
    let project = applied.project;
    let changedFiles = changedFilesForPatch(applied.changedPaths);

    const regeneratedVerseFiles = new Map<string, string>();
    if (!this.options.dryRun && applied.touchedVerseModules.length > 0) {
      const regenerated = await regenerateVerseModules({
        projectDir: this.options.projectDir,
        patch,
        project,
        llm: this.llm,
      });
      project = regenerated.project;
      changedFiles = changedFiles.filter((file) =>
        !applied.touchedVerseModules.some((moduleName) => file === `Verse/${moduleName}.verse`),
      );
      for (const [filename, code] of regenerated.files) {
        regeneratedVerseFiles.set(filename, code);
        changedFiles.push(`Verse/${filename}`);
      }
    }

    const validatorOptions = { resolvedTemplate: loaded.resolvedTemplate };
    let validation = runAllValidators(project, validatorOptions);
    let repairResult: RepairResult | undefined;

    if (!validation.every((v) => v.passed) && this.options.repair !== false) {
      const repairLoop = new RepairLoop(this.llm, this.options.repairPasses ?? this.options.config.maxRepairPasses ?? 3, validatorOptions);
      repairResult = await repairLoop.run(project);
      validation = repairResult.finalResults;
      project = { ...project, validation: validation.map(toProjectValidation) };
    } else {
      project = { ...project, validation: validation.map(toProjectValidation) };
    }

    if (!validation.every((v) => v.passed)) {
      throw new Error(`Validation failed after modify: ${validation.flatMap((v) => v.errors.map((e) => `[${v.validator}] ${e}`)).join("; ")}`);
    }
    if (this.options.strict && validation.some((v) => v.warnings.length > 0)) {
      throw new Error(`Strict mode: validation warnings: ${validation.flatMap((v) => v.warnings.map((w) => `[${v.validator}] ${w}`)).join("; ")}`);
    }

    const outputPath = this.options.outputDir ?? this.options.projectDir;
    let finalChangedFiles = [...new Set(changedFiles)].sort();
    if (!this.options.dryRun) {
      finalChangedFiles = [...new Set([
        ...changedFiles,
        `.ai/modifications/${job.jobId}.json`,
        "docs/MODIFICATION-SUMMARY.md",
        "worldgen.lock.json",
      ])].sort();
      const modificationRecord = buildModificationRecord({
        jobId: job.jobId,
        parentProjectHash,
        outputPath,
        request: this.options.request,
        patch,
        validation,
        repair: repairResult,
        changedFiles: finalChangedFiles,
        costUsd: this.totalSpentUsd,
      });
      await writeModifiedProject({
        sourceDir: this.options.projectDir,
        outputDir: outputPath,
        project,
        patch,
        request: this.options.request,
        validation,
        regeneratedVerseFiles,
        existingVerseFiles: loaded.verseFiles,
        modificationRecord,
        resolvedTemplate: loaded.resolvedTemplate,
        job: {
          ...job,
          status: "complete",
          currentStage: 8,
          updatedAt: modificationRecord.createdAt,
          completedAt: modificationRecord.createdAt,
          stageResults: { modify: modificationRecord },
        },
      });
      job.stageResults = { modify: modificationRecord };
      jobManager.transition(job.jobId, "complete", 8);
      this.ledger.recordJob();
    }

    return {
      patch,
      project,
      validation,
      repairResult,
      costUsd: this.totalSpentUsd,
      changedFiles: finalChangedFiles,
      jobId: job.jobId,
      outputPath,
    };
  }
}

interface ModificationRecord {
  jobId: string;
  parentProjectHash: string;
  createdAt: string;
  outputPath: string;
  request: string;
  patch: ProjectPatchType;
  validation: ValidationResult[];
  repair?: RepairResult;
  changedFiles: string[];
  costUsd: number;
}

interface WriteModifiedProjectInput {
  sourceDir: string;
  outputDir: string;
  project: WorldProject;
  patch: ProjectPatchType;
  request: string;
  validation: ValidationResult[];
  existingVerseFiles: Map<string, string>;
  regeneratedVerseFiles: Map<string, string>;
  modificationRecord: ModificationRecord;
  resolvedTemplate?: TemplateDefinition;
  job: JobRecord;
}

async function writeModifiedProject(input: WriteModifiedProjectInput): Promise<void> {
  if (input.outputDir !== input.sourceDir) {
    rmSync(input.outputDir, { recursive: true, force: true });
    cpSync(input.sourceDir, input.outputDir, { recursive: true });
  }

  const verseFiles = new Map(input.existingVerseFiles);
  for (const [filename, code] of input.regeneratedVerseFiles) {
    verseFiles.set(filename, code);
  }

  await new ScaffoldPackager().package({
    project: input.project,
    worldDesign: loadWorldDesign(input.sourceDir, input.project),
    modulePlan: loadModulePlan(input.sourceDir),
    lootTables: loadLootTables(input.sourceDir),
    balanceReport: simulateBalance(input.project),
    verseFiles,
    resolvedTemplate: input.resolvedTemplate,
    templateId: input.resolvedTemplate?.templateId,
    job: input.job,
    modification: {
      summaryMarkdown: modificationSummary(input),
      records: [{ id: input.modificationRecord.jobId, data: input.modificationRecord }],
    },
  }, input.outputDir);
}

function modificationSummary(input: WriteModifiedProjectInput): string {
  return `# Modification Summary — ${input.project.name}

## Request
${input.request}

## Patch
${input.patch.summary}

${input.patch.operations.map((op) => `- ${op.op}: ${"path" in op ? op.path : op.moduleName}`).join("\n")}

## Validation
${input.validation.map((v) => `- ${v.validator}: ${v.passed ? "passed" : "failed"}${v.warnings.length > 0 ? ` (${v.warnings.length} warnings)` : ""}`).join("\n")}
`;
}

function readJsonIfExists<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function loadWorldDesign(projectDir: string, project: WorldProject): WorldDesign {
  const fromDisk = readJsonIfExists<unknown>(join(projectDir, ".ai", "planner", "world-design.json"));
  if (fromDisk) return fromDisk as WorldDesign;
  return {
    mapName: project.name,
    theme: project.design.fantasy,
    zones: project.layout.zones.map((zone, index) => ({
      zoneId: zone.zoneId,
      name: zone.name,
      purpose: zone.purpose,
      description: `${zone.name} (${zone.purpose})`,
      tier: index + 1,
      unlockRequirement: zone.progressionGate ? "See layout progressionGate" : undefined,
    })),
    progressionBeats: project.layout.zones.map((zone) => `Reach ${zone.name}`),
    coreLoop: project.design.coreLoop,
    sessionPacing: {
      earlyGame: "Use current project pacing from generated scaffold.",
      midGame: "Use current project pacing from generated scaffold.",
      lateGame: "Use current project pacing from generated scaffold.",
    },
  };
}

function loadLootTables(projectDir: string): LootTable[] {
  return (readJsonIfExists<unknown>(join(projectDir, "manifests", "loot_tables.json")) ?? []) as LootTable[];
}

function simulateBalance(project: WorldProject): SimulationResult {
  if (project.target.genre === "battle_arena") {
    const result = new ArenaSimulator().simulate(project.economy, 8);
    return {
      timeToFirstUpgradeSec: 0,
      timeToAutomationMin: null,
      timeToPrestigeMin: null,
      incomePerMinute: 0,
      violations: result.violations,
      adjustments: [],
    };
  }
  return new TycoonSimulator().simulate(project.economy, project.design.sessionLengthMin);
}

function buildModificationRecord(input: Omit<ModificationRecord, "createdAt">): ModificationRecord {
  return { ...input, createdAt: new Date().toISOString() };
}

function computeParentProjectHash(project: WorldProject, verseFiles: Map<string, string>): string {
  return createHash("sha256").update(JSON.stringify({
    project,
    verseFiles: [...verseFiles.entries()].sort(([a], [b]) => a.localeCompare(b)),
  })).digest("hex");
}

function llmTimeoutMs(provider: ForgeAIConfig["provider"]): number {
  const override = process.env.FORGEAI_LLM_TIMEOUT_MS;
  if (override) {
    const parsed = Number.parseInt(override, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return provider === "ollama" ? 300_000 : 120_000;
}

function toProjectValidation(result: ValidationResult): WorldProject["validation"][number] {
  return {
    validator: result.validator,
    passed: result.passed,
    errors: result.errors.length > 0 ? result.errors : undefined,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
  };
}

function changedFilesForPatch(paths: string[]): string[] {
  const files = new Set<string>();
  for (const path of paths) {
    if (path.startsWith("layout.")) files.add("manifests/layout.grid.json");
    else if (path.startsWith("economy.")) files.add("manifests/economy.json");
    else if (path.startsWith("devices")) files.add("manifests/device_manifest.json");
    else if (path.startsWith("prefabs")) files.add("manifests/prefab_manifest.json");
    else if (path.startsWith("variantZones")) files.add("manifests/variant_zones.json");
    else if (path.startsWith("Verse/")) files.add(path.endsWith(".verse") ? path : `${path}.verse`);
    files.add("manifests/world.project.json");
    files.add(".ai/validation/summary.json");
  }
  return [...files].sort();
}

interface RegenerateVerseModulesInput {
  projectDir: string;
  patch: ProjectPatchType;
  project: WorldProject;
  llm: LLMAdapter;
}

interface RegenerateVerseModulesResult {
  project: WorldProject;
  files: Map<string, string>;
}

async function regenerateVerseModules(input: RegenerateVerseModulesInput): Promise<RegenerateVerseModulesResult> {
  const modulePlan = loadModulePlan(input.projectDir);
  const generator = new VerseGenerator(input.llm);
  const emitter = new VerseEmitter();
  const files = new Map<string, string>();
  const scripts = [...input.project.scripts];

  for (const operation of input.patch.operations) {
    if (operation.op !== "regenerate_verse_module") continue;
    const plan = findModulePlan(modulePlan, operation.moduleName);
    const patchedPlan = applyModulePlanPatch(plan, operation.modulePlanPatch);
    const ast = await generator.generate(patchedPlan);
    const { code } = lintVerseCode(emitter.emit(ast));
    const filename = `${patchedPlan.className}.verse`;
    const existingIndex = scripts.findIndex((script) => script.name === ast.name || script.name === operation.moduleName);
    if (existingIndex === -1) scripts.push(ast);
    else scripts[existingIndex] = ast;
    files.set(filename, code);
  }

  return { project: { ...input.project, scripts }, files };
}

function loadModulePlan(projectDir: string): ModulePlan {
  const path = join(projectDir, ".ai", "planner", "module-plan.json");
  if (!existsSync(path)) {
    throw new Error(`Cannot regenerate Verse modules: missing .ai/planner/module-plan.json`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as ModulePlan;
}

function findModulePlan(modulePlan: ModulePlan, moduleName: string): ModulePlan["modules"][number] {
  const normalized = moduleName.replace(/\.verse$/, "");
  const found = modulePlan.modules.find((mod) =>
    mod.moduleName === normalized || mod.className === normalized,
  );
  if (!found) throw new Error(`Cannot regenerate unknown Verse module: ${moduleName}`);
  return found;
}

function applyModulePlanPatch(
  plan: ModulePlan["modules"][number],
  patch: unknown,
): ModulePlan["modules"][number] {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) return plan;
  return { ...plan, ...(patch as Partial<ModulePlan["modules"][number]>) };
}
