import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { ForgeAIConfig, WorldProject } from "@forgeai/schemas";
import {
  BudgetAdapter,
  ModifierAgent,
  RetryAdapter,
  VerseGenerator,
  createAdapterWithFallback,
  type LLMAdapter,
  type ModulePlan,
} from "@forgeai/ai";
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
    adapter = new RetryAdapter(adapter);
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
      writeModifiedProject({
        sourceDir: this.options.projectDir,
        outputDir: outputPath,
        project,
        patch,
        request: this.options.request,
        validation,
        regeneratedVerseFiles,
        modificationRecord,
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
  regeneratedVerseFiles: Map<string, string>;
  modificationRecord: ModificationRecord;
}

function writeModifiedProject(input: WriteModifiedProjectInput): void {
  if (input.outputDir !== input.sourceDir) {
    rmSync(input.outputDir, { recursive: true, force: true });
    cpSync(input.sourceDir, input.outputDir, { recursive: true });
  }

  mkdirSync(join(input.outputDir, "manifests"), { recursive: true });
  mkdirSync(join(input.outputDir, "docs"), { recursive: true });
  mkdirSync(join(input.outputDir, ".ai", "validation"), { recursive: true });

  writeJson(input.outputDir, "manifests/world.project.json", input.project);
  writeJson(input.outputDir, "manifests/layout.grid.json", input.project.layout);
  writeJson(input.outputDir, "manifests/economy.json", input.project.economy);
  writeJson(input.outputDir, "manifests/device_manifest.json", input.project.devices);
  writeJson(input.outputDir, "manifests/prefab_manifest.json", input.project.prefabs);
  writeJson(input.outputDir, "manifests/variant_zones.json", input.project.variantZones ?? []);
  writeJson(input.outputDir, ".ai/validation/summary.json", input.project.validation);
  for (const [filename, code] of input.regeneratedVerseFiles) {
    writeFileSync(join(input.outputDir, "Verse", filename), code, "utf-8");
  }
  mkdirSync(join(input.outputDir, ".ai", "modifications"), { recursive: true });
  writeJson(input.outputDir, `.ai/modifications/${input.modificationRecord.jobId}.json`, input.modificationRecord);
  writeFileSync(join(input.outputDir, "docs", "MODIFICATION-SUMMARY.md"), modificationSummary(input), "utf-8");
  writeJson(input.outputDir, "worldgen.lock.json", {
    specVersion: input.project.specVersion,
    projectId: input.project.projectId,
    projectName: input.project.name,
    seed: input.project.source.seed,
    genre: input.project.target.genre,
    fileHashes: collectFileHashes(input.outputDir),
  });
}

function writeJson(base: string, path: string, data: unknown): void {
  writeFileSync(join(base, path), JSON.stringify(data, null, 2), "utf-8");
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

function collectFileHashes(outputDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const file of collectFiles(outputDir).sort()) {
    const normalized = file.split(/[\\/]/).join("/");
    if (normalized === "worldgen.lock.json") continue;
    hashes[normalized] = createHash("sha256").update(readFileSync(join(outputDir, file))).digest("hex");
  }
  return hashes;
}

function collectFiles(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? join(prefix, entry.name) : entry.name;
    const fullPath = join(dir, rel);
    if (entry.isDirectory()) files.push(...collectFiles(dir, rel));
    else if (statSync(fullPath).isFile()) files.push(rel);
  }
  return files;
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
