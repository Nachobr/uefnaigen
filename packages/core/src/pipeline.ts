import type { JobRecord, ForgeAIConfig, LayoutSpec, EconomySpec, DeviceInstance, VerseModule, WorldProject } from "@forgeai/schemas";
import {
  createAdapterForStage,
  createAdapterWithFallback,
  IntentExtractor,
  TemplateRouter,
  WorldPlanner,
  LayoutPlanner,
  SystemsPlanner,
  BalancePlanner,
  DeviceMapper,
  VersePlanner,
  VerseGenerator,
  LootGenerator,
  BudgetAdapter,
  RetryAdapter,
  type LLMAdapter,
  type SharedBudget,
  type NormalizedBrief,
  type WorldDesign,
  type SystemsDesign,
  type TemplateRouterResult,
  type ModulePlan,
  type LootTable,
} from "@forgeai/ai";
import { createDefaultRegistry } from "@forgeai/templates";
import { KnowledgeStore, seedDefaultKnowledge, type KnowledgeEntry } from "@forgeai/knowledge";
import { TycoonSimulator, ArenaSimulator, type SimulationResult } from "@forgeai/balance";
import { VerseEmitter, lintVerseCode, checkVerseMemory } from "@forgeai/verse";
import { runAllValidators, RepairLoop, type ValidationResult, type RepairResult } from "@forgeai/validators";
import { ScaffoldPackager } from "@forgeai/packager";
import type { Logger } from "pino";
import { JobManager } from "./job-manager.js";
import { TierGuard } from "./tier-guard.js";
import { StageCache, type StageKey } from "./stage-cache.js";
import { MemoCache, KNOWLEDGE_VERSION, type MemoizedStage } from "./memo-cache.js";
import { createLogger } from "./logger.js";
import { assembleProject } from "./project-assembler.js";
import { UsageLedger } from "./usage-ledger.js";

export interface PipelineOptions {
  prompt: string;
  seed: number;
  genre?: string;
  templateId?: string;
  outputDir: string;
  config: ForgeAIConfig;
  dryRun?: boolean;
  resumeJobId?: string;
  llm?: LLMAdapter;
  logger?: Logger;
  /** Emit a .zip archive instead of an unpacked directory. */
  archive?: boolean;
  /** Run the LLM-based RepairLoop when validation fails. Off by default to avoid surprise cost. */
  repair?: boolean;
  /** Treat validation warnings as errors (fail the run). */
  strict?: boolean;
  onStage?: (stage: number, name: string, detail: string) => void;
}

export interface PipelineResult {
  job: JobRecord;
  brief: NormalizedBrief;
  templateResult: TemplateRouterResult;
  worldDesign: WorldDesign;
  layout: LayoutSpec;
  systemsDesign: SystemsDesign;
  economy: EconomySpec;
  balanceReport: SimulationResult;
  devices: DeviceInstance[];
  modulePlan: ModulePlan;
  lootTables: LootTable[];
  verseFiles: Map<string, string>;
  verseModules: VerseModule[];
  project: WorldProject;
  validation: ValidationResult[];
  /** Validation results from the very first run, before the repair loop (if any). Useful for measuring repair effectiveness. */
  firstPassValidation?: ValidationResult[];
  repairResult?: RepairResult;
  outputPath: string;
  archivePath?: string;
}

export class Pipeline {
  private llm: LLMAdapter;
  private jobManager: JobManager;
  private logger: Logger;
  private ledger: UsageLedger;
  private budgetAdapter?: BudgetAdapter;
  private sharedBudget: SharedBudget = { spentUsd: 0 };
  private stageAdapters = new Map<string, LLMAdapter>();
  private fallbackLogger: { warn: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void; info: (obj: object, msg?: string) => void };

  constructor(private options: PipelineOptions) {
    this.jobManager = new JobManager({ persist: !options.dryRun });
    this.logger = options.logger ?? createLogger({ enabled: options.config.verbose });
    this.ledger = new UsageLedger({ persist: !options.dryRun });
    this.fallbackLogger = {
      warn: (obj: object, msg?: string) => this.logger.warn(obj, msg),
      error: (obj: object, msg?: string) => this.logger.error(obj, msg),
      info: (obj: object, msg?: string) => this.logger.info(obj, msg),
    };
    let adapter: LLMAdapter =
      options.llm ?? createAdapterWithFallback(options.config, { logger: this.fallbackLogger });
    adapter = new RetryAdapter(adapter, { timeoutMs: llmTimeoutMs(options.config.provider) });
    // Always wrap with BudgetAdapter so we capture per-call usage events even when no budget is set.
    this.budgetAdapter = this.wrapWithBudget(adapter, options.config.provider, options.config.model);
    this.llm = this.budgetAdapter;
  }

  /** Total USD spent during this pipeline run (best-effort estimate from BudgetAdapter). */
  get totalSpentUsd(): number {
    return this.sharedBudget.spentUsd;
  }

  private wrapWithBudget(adapter: LLMAdapter, provider: ForgeAIConfig["provider"], model: string): BudgetAdapter {
    const budget = this.options.config.budgetUsd ?? Number.POSITIVE_INFINITY;
    return new BudgetAdapter(adapter, budget, {
      provider,
      model,
      sharedBudget: this.sharedBudget,
      onUsage: (event) => {
        this.ledger.recordCall(event.provider, event.inputTokens, event.outputTokens, event.costUsd);
        this.logger.info(
          {
            provider: event.provider,
            model: event.model,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            costUsd: event.costUsd,
            estimated: event.estimated,
          },
          "llm usage",
        );
      },
    });
  }

  private getAdapterForStage(stage: string): LLMAdapter {
    const override = this.options.config.stageOverrides?.[stage];
    if (!override) return this.llm;
    const cached = this.stageAdapters.get(stage);
    if (cached) return cached;

    let adapter = createAdapterForStage(this.options.config, stage, { logger: this.fallbackLogger });
    if (!adapter) return this.llm;
    const provider = override.provider ?? this.options.config.provider;
    const model = override.model ?? this.options.config.model;
    adapter = new RetryAdapter(adapter, { timeoutMs: llmTimeoutMs(provider) });
    adapter = this.wrapWithBudget(adapter, provider, model);
    this.stageAdapters.set(stage, adapter);
    return adapter;
  }

  private emit(stage: number, name: string, detail: string): void {
    this.logger.info({ stage, name, detail }, "pipeline stage");
    this.options.onStage?.(stage, name, detail);
  }

  private createKnowledgeStore(): KnowledgeStore {
    const store = new KnowledgeStore({ persist: !this.options.dryRun });
    seedDefaultKnowledge(store);
    return store;
  }

  private buildKnowledgeContext(
    store: KnowledgeStore,
    genre: NormalizedBrief["genre"],
    query: { tags: string[]; type?: KnowledgeEntry["type"]; maxTokens?: number },
  ): string {
    return store.buildContext({
      tags: query.tags,
      type: query.type,
      genre,
      maxTokens: query.maxTokens ?? 1200,
    });
  }

  async run(): Promise<PipelineResult> {
    const isLocal = this.options.config.provider === "ollama";
    const tierGuard = new TierGuard(this.options.config.tier ?? "free", { persist: !this.options.dryRun });
    if (!isLocal) {
      tierGuard.checkGenerationAllowed();
    }

    const job = this.options.resumeJobId
      ? this.jobManager.get(this.options.resumeJobId)
      : this.jobManager.create(this.options.prompt, this.options.seed);
    if (!job) {
      throw new Error(`Job not found: ${this.options.resumeJobId}`);
    }

    const cache = new StageCache(job.jobId, { persist: !this.options.dryRun });

    // ── Stage 1: Intent Extraction ──
    this.emit(1, "Parsing prompt", "Extracting genre, constraints, style...");
    this.jobManager.transition(job.jobId, "planning", 1);

    const brief = await cache.getOrCompute<NormalizedBrief>("1-brief", async () => {
      const extractor = new IntentExtractor(this.llm);
      return extractor.extract(
        this.options.prompt,
        this.options.genre as NormalizedBrief["genre"] | undefined,
      );
    });
    this.emit(1, "Parsing prompt", `Genre: ${brief.genre} | Session: ${brief.sessionLengthMin} min`);

    const knowledgeStore = this.createKnowledgeStore();

    // ── Stage 2: Template Routing ──
    this.emit(2, "Selecting template", "Matching genre to template...");

    const templateResult = await cache.getOrCompute<TemplateRouterResult>("2-template", () => {
      const registry = createDefaultRegistry();
      const router = new TemplateRouter(registry);
      return router.route(brief, this.options.templateId);
    });
    this.emit(2, "Selecting template", `Using: ${templateResult.templateId}`);

    // Now that we know the resolved template, build the content-addressed memo cache.
    // Cheap/deterministic stages (1-brief, 2-template, 5-balance) are intentionally not memoized.
    const memo = new MemoCache(
      {
        prompt: this.options.prompt,
        templateId: templateResult.templateId,
        templateVersion: templateResult.resolvedTemplate.version,
        provider: this.options.config.provider,
        model: this.options.config.model,
        seed: this.options.seed,
        knowledgeVersion: KNOWLEDGE_VERSION,
        genreOverride: this.options.genre,
        templateOverride: this.options.templateId,
        stageOverrides: this.options.config.stageOverrides,
      },
      { persist: !this.options.dryRun },
    );

    const memoOrCompute = async <T>(
      stage: MemoizedStage & StageKey,
      fn: () => T | Promise<T>,
    ): Promise<T> => {
      const fromStage = cache.load<T>(stage);
      if (fromStage !== undefined) return fromStage;
      const fromMemo = memo.load<T>(stage);
      if (fromMemo !== undefined) {
        this.logger.info({ stage, key: memo.key }, "memo cache hit");
        cache.save(stage, fromMemo);
        return fromMemo;
      }
      const value = await fn();
      cache.save(stage, value);
      memo.save(stage, value);
      return value;
    };

    // ── Stage 3: World Planning ──
    this.emit(3, "Planning world", "Generating zones, progression, pacing...");

    const worldDesign = await memoOrCompute<WorldDesign>("3-world", () => {
      const worldPlanner = new WorldPlanner(this.llm);
      return worldPlanner.plan(brief, templateResult.resolvedTemplate);
    });
    this.emit(3, "Planning world", `Zones: ${worldDesign.zones.length} (${worldDesign.zones.map((z) => z.name).join(" → ")})`);

    // ── Stage 4a: Layout Planning ──
    this.emit(4, "Planning layout", "Generating spatial coordinates...");

    const layout = await memoOrCompute<LayoutSpec>("4a-layout", () => {
      const layoutPlanner = new LayoutPlanner(this.llm);
      return layoutPlanner.plan(
        worldDesign,
        templateResult.resolvedTemplate.layoutRules.layoutStyle,
      );
    });
    this.emit(4, "Planning layout", `${layout.zones.length} zones placed, ${layout.spawnPoints.length} spawn points`);

    // ── Stage 4b: Systems Planning ──
    this.emit(5, "Planning systems", "Designing economy, devices, rules...");

    const systemsDesign = await memoOrCompute<SystemsDesign>("4b-systems", () => {
      const systemsPlanner = new SystemsPlanner(
        this.llm,
        this.buildKnowledgeContext(knowledgeStore, brief.genre, {
          tags: ["economy", "device", brief.genre],
        }),
      );
      return systemsPlanner.plan(brief, worldDesign, templateResult.resolvedTemplate);
    });
    this.emit(5, "Planning systems", `${systemsDesign.devices.length} devices | ${systemsDesign.economy.currencies.length} currencies`);

    // ── Stage 4c: Balance Planning ──
    this.emit(6, "Balancing economy", "Tuning income/sink curves...");

    const economy = await memoOrCompute<EconomySpec>("4c-economy", () => {
      const balancePlanner = new BalancePlanner(
        this.llm,
        this.buildKnowledgeContext(knowledgeStore, brief.genre, {
          tags: ["economy", brief.genre],
          type: "economy_template",
        }),
      );
      return balancePlanner.plan(brief, systemsDesign);
    });

    // ── Stage 5: Validate balance with simulator ──
    const balanceStage = await cache.getOrCompute<{ economy: EconomySpec; balanceReport: SimulationResult }>("5-balance", () => {
      let finalEconomy = economy;
      let balanceReport: SimulationResult;

      if (brief.genre === "battle_arena") {
        const arenaSimulator = new ArenaSimulator();
        const arenaResult = arenaSimulator.simulate(economy, brief.playerCount);
        balanceReport = {
          timeToFirstUpgradeSec: 0,
          timeToAutomationMin: null,
          timeToPrestigeMin: null,
          incomePerMinute: 0,
          violations: arenaResult.violations,
          adjustments: [],
        };
        this.emit(6, "Balancing economy",
          `Rounds: ${arenaResult.visualization.rounds.length} | ` +
          `Match: ${(arenaResult.totalMatchTimeSec / 60).toFixed(1)}m | ` +
          `Score: ${arenaResult.balanceScore}/100`,
        );
      } else {
        const simulator = new TycoonSimulator();
        const simResult = simulator.simulate(economy, brief.sessionLengthMin);
        balanceReport = simResult;

        if (simResult.violations.length > 0) {
          this.emit(6, "Balancing economy", `⚠ ${simResult.violations.length} violations, auto-adjusting...`);
          const adjusted = simulator.autoAdjust(economy, brief.sessionLengthMin);
          finalEconomy = adjusted.economy;
          balanceReport = adjusted.result;
        }

        this.emit(6, "Balancing economy",
          `First upgrade: ${balanceReport.timeToFirstUpgradeSec.toFixed(0)}s | ` +
          `Automation: ${balanceReport.timeToAutomationMin?.toFixed(1) ?? "N/A"}m | ` +
          `Prestige: ${balanceReport.timeToPrestigeMin?.toFixed(1) ?? "N/A"}m`,
        );
      }

      return { economy: finalEconomy, balanceReport };
    });
    const { economy: finalEconomy, balanceReport } = balanceStage;

    // ── Stage 6: Device Mapping ──
    this.emit(7, "Building devices", "Mapping devices to concrete instances...");

    const devices = await memoOrCompute<DeviceInstance[]>("6-devices", () => {
      const deviceMapper = new DeviceMapper(
        this.llm,
        this.buildKnowledgeContext(knowledgeStore, brief.genre, {
          tags: ["device", brief.genre],
          type: "device_schema",
        }),
      );
      return deviceMapper.map(layout, systemsDesign);
    });
    this.emit(7, "Building devices", `${devices.length} devices placed`);

    // ── Stage 7: Verse Planning + Loot Tables ──
    this.emit(8, "Planning Verse", "Designing module structure...");

    const modulePlan = await memoOrCompute<ModulePlan>("7-modulePlan", () => {
      const versePlanner = new VersePlanner(
        this.llm,
        this.buildKnowledgeContext(knowledgeStore, brief.genre, {
          tags: ["verse", "device"],
        }),
      );
      return versePlanner.plan(systemsDesign, devices, templateResult.resolvedTemplate);
    });
    this.emit(8, "Planning Verse", `${modulePlan.modules.length} modules planned`);

    const lootTables = await memoOrCompute<LootTable[]>("7-lootTables", () => {
      const lootGenerator = new LootGenerator(this.llm);
      return lootGenerator.generate(brief, worldDesign);
    });

    // ── Stage 8: Verse Code Generation ──
    this.emit(8, "Planning Verse", "Generating Verse source files...");
    const verseLlm = this.getAdapterForStage("8-verseFiles");
    const verseGenerator = new VerseGenerator(
      verseLlm,
      this.buildKnowledgeContext(knowledgeStore, brief.genre, {
        tags: ["verse", "pattern", "editable", "failable"],
        type: "verse_pattern",
      }),
    );
    const emitter = new VerseEmitter();

    const verseOutput = await memoOrCompute<{ files: Record<string, string>; modules: VerseModule[] }>(
      "8-verseFiles",
      async () => {
        const files: Record<string, string> = {};
        const modules: VerseModule[] = [];
        let memoryWarnings = 0;
        const verseFailures: string[] = [];

        for (const mod of modulePlan.modules) {
          try {
            const ast = await verseGenerator.generate(mod);
            const rawCode = emitter.emit(ast);
            const { code } = lintVerseCode(rawCode);
            const memCheck = checkVerseMemory(code);
            memoryWarnings += memCheck.issues.length;
            if (memCheck.issues.some((i) => i.severity === "error")) {
              this.emit(
                8,
                "Planning Verse",
                `⚠ ${mod.className}: ${memCheck.issues
                  .filter((i) => i.severity === "error")
                  .map((i) => i.message)
                  .join("; ")}`,
              );
            }
            files[`${mod.className}.verse`] = code;
            modules.push(ast);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            verseFailures.push(`${mod.className}: ${msg}`);
            this.emit(8, "Planning Verse", `✗ ${mod.className} failed: ${msg}`);
          }
        }

        if (verseFailures.length > 0) {
          throw new Error(`Verse generation failed for ${verseFailures.join(", ")}`);
        }

        this.emit(
          8,
          "Planning Verse",
          `${modules.length}/${modulePlan.modules.length} Verse files generated${memoryWarnings > 0 ? ` (${memoryWarnings} memory warnings)` : ""}`,
        );

        return { files, modules };
      },
    );

    const verseFiles = new Map<string, string>(Object.entries(verseOutput.files));
    const verseModules = verseOutput.modules;

    this.jobManager.transition(job.jobId, "generated", 8);

    // ── Assemble canonical WorldProject ──
    let project = assembleProject({
      job,
      prompt: this.options.prompt,
      seed: this.options.seed,
      brief,
      layout,
      economy: finalEconomy,
      devices,
      scripts: verseModules,
      mapName: worldDesign.mapName,
    });

    // Dry-run: skip validation, repair, packaging.
    if (this.options.dryRun) {
      tierGuard.recordGeneration();
      return {
        job,
        brief,
        templateResult,
        worldDesign,
        layout,
        systemsDesign,
        economy: finalEconomy,
        balanceReport,
        devices,
        modulePlan,
        lootTables,
        verseFiles,
        verseModules,
        project,
        validation: [],
        outputPath: this.options.outputDir,
      };
    }

    // ── Validation ──
    this.jobManager.transition(job.jobId, "validating", 8);
    const validatorOptions = { resolvedTemplate: templateResult.resolvedTemplate };
    let validation = runAllValidators(project, validatorOptions);
    const firstPassValidation: ValidationResult[] = validation.map((v) => ({ ...v }));
    let repairResult: RepairResult | undefined;

    const allPassed = () => validation.every((v) => v.passed);
    const hasWarnings = () => validation.some((v) => v.warnings.length > 0);

    if (!allPassed() && this.options.repair) {
      const passes = this.options.config.maxRepairPasses ?? 3;
      this.emit(8, "Validating", `⚠ Validation failed; running repair loop (max ${passes} passes)...`);
      const repairLoop = new RepairLoop(this.llm, passes, validatorOptions, {
        generator: verseGenerator,
        emitter,
        modulePlan,
      });
      repairResult = await repairLoop.run(project);
      validation = repairResult.finalResults;
      verseFiles.clear();
      for (const script of project.scripts) {
        const rawCode = emitter.emit(script);
        const { code } = lintVerseCode(rawCode);
        verseFiles.set(`${verseFileStem(script)}.verse`, code);
      }
      project = assembleProject({
        job,
        prompt: this.options.prompt,
        seed: this.options.seed,
        brief,
        layout: project.layout,
        economy: project.economy,
        devices: project.devices,
        scripts: project.scripts,
        prefabs: project.prefabs,
        variantZones: project.variantZones,
        validation,
        mapName: worldDesign.mapName,
      });
    } else {
      project = { ...project, validation: validation.map((v) => ({
        validator: v.validator,
        passed: v.passed,
        errors: v.errors.length > 0 ? v.errors : undefined,
        warnings: v.warnings.length > 0 ? v.warnings : undefined,
      })) };
    }

    if (!allPassed()) {
      this.jobManager.transition(job.jobId, "failed_validation", 8);
      const errs = validation
        .filter((v) => !v.passed)
        .flatMap((v) => v.errors.map((e) => `[${v.validator}] ${e}`))
        .join("; ");
      throw new Error(`Validation failed: ${errs}`);
    }

    if (this.options.strict && hasWarnings()) {
      this.jobManager.transition(job.jobId, "failed_validation", 8);
      const warns = validation
        .flatMap((v) => v.warnings.map((w) => `[${v.validator}] ${w}`))
        .join("; ");
      throw new Error(`Strict mode: validation warnings: ${warns}`);
    }

    this.emit(8, "Validating", `✓ ${validation.length} validators passed${hasWarnings() ? ` (${validation.reduce((n, v) => n + v.warnings.length, 0)} warnings)` : ""}`);

    // ── Packaging ──
    this.emit(8, "Packaging", `Writing scaffold to ${this.options.outputDir}...`);
    const packager = new ScaffoldPackager();
    const packagedAt = new Date().toISOString();
    const packagedJob: JobRecord = {
      ...job,
      status: "complete",
      currentStage: 8,
      templateId: templateResult.templateId,
      updatedAt: packagedAt,
      completedAt: packagedAt,
    };
    const packagerInput = {
      job: packagedJob,
      project,
      worldDesign,
      modulePlan,
      lootTables,
      balanceReport,
      verseFiles,
      resolvedTemplate: templateResult.resolvedTemplate,
      templateId: templateResult.templateId,
    };

    let archivePath: string | undefined;
    if (this.options.archive) {
      archivePath = await packager.packageZip(packagerInput, this.options.outputDir);
      this.emit(8, "Packaging", `✓ Archive: ${archivePath}`);
    } else {
      await packager.package(packagerInput, this.options.outputDir);
      this.emit(8, "Packaging", `✓ Output: ${this.options.outputDir}`);
    }

    this.jobManager.transition(job.jobId, "packaged", 8);
    this.jobManager.transition(job.jobId, "complete", 8);
    tierGuard.recordGeneration();
    this.ledger.recordJob();
    this.logger.info(
      { jobId: job.jobId, costUsd: this.totalSpentUsd, spentTodayUsd: this.ledger.spentToday() },
      "pipeline complete",
    );

    return {
      job,
      brief,
      templateResult,
      worldDesign,
      layout,
      systemsDesign,
      economy: finalEconomy,
      balanceReport,
      devices,
      modulePlan,
      lootTables,
      verseFiles,
      verseModules,
      project,
      validation,
      firstPassValidation,
      repairResult,
      outputPath: this.options.outputDir,
      archivePath,
    };
  }
}

function llmTimeoutMs(provider: ForgeAIConfig["provider"]): number {
  const override = process.env.FORGEAI_LLM_TIMEOUT_MS;
  if (override) {
    const parsed = Number.parseInt(override, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return provider === "ollama" ? 300_000 : 120_000;
}

function verseFileStem(module: VerseModule): string {
  const classDecl = module.declarations.find((d) => d.kind === "class");
  return classDecl?.name ?? module.name;
}
