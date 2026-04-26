import type { JobRecord, ForgeAIConfig, LayoutSpec, EconomySpec, DeviceInstance } from "@forgeai/schemas";
import {
  createAdapter,
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
import type { Logger } from "pino";
import { JobManager } from "./job-manager.js";
import { TierGuard } from "./tier-guard.js";
import { StageCache } from "./stage-cache.js";
import { createLogger } from "./logger.js";

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
  outputPath: string;
}

export class Pipeline {
  private llm: LLMAdapter;
  private jobManager: JobManager;
  private logger: Logger;

  constructor(private options: PipelineOptions) {
    this.jobManager = new JobManager({ persist: !options.dryRun });
    this.logger = options.logger ?? createLogger({ enabled: options.config.verbose });
    let adapter: LLMAdapter = options.llm ?? createAdapter(options.config);
    adapter = new RetryAdapter(adapter);
    if (options.config.budgetUsd) {
      adapter = new BudgetAdapter(adapter, options.config.budgetUsd);
    }
    this.llm = adapter;
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

    // ── Stage 3: World Planning ──
    this.emit(3, "Planning world", "Generating zones, progression, pacing...");

    const worldDesign = await cache.getOrCompute<WorldDesign>("3-world", () => {
      const worldPlanner = new WorldPlanner(this.llm);
      return worldPlanner.plan(brief, templateResult.resolvedTemplate);
    });
    this.emit(3, "Planning world", `Zones: ${worldDesign.zones.length} (${worldDesign.zones.map((z) => z.name).join(" → ")})`);

    // ── Stage 4a: Layout Planning ──
    this.emit(4, "Planning layout", "Generating spatial coordinates...");

    const layout = await cache.getOrCompute<LayoutSpec>("4a-layout", () => {
      const layoutPlanner = new LayoutPlanner(this.llm);
      return layoutPlanner.plan(
        worldDesign,
        templateResult.resolvedTemplate.layoutRules.layoutStyle,
      );
    });
    this.emit(4, "Planning layout", `${layout.zones.length} zones placed, ${layout.spawnPoints.length} spawn points`);

    // ── Stage 4b: Systems Planning ──
    this.emit(5, "Planning systems", "Designing economy, devices, rules...");

    const systemsDesign = await cache.getOrCompute<SystemsDesign>("4b-systems", () => {
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

    const economy = await cache.getOrCompute<EconomySpec>("4c-economy", () => {
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

    const devices = await cache.getOrCompute<DeviceInstance[]>("6-devices", () => {
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

    const modulePlan = await cache.getOrCompute<ModulePlan>("7-modulePlan", () => {
      const versePlanner = new VersePlanner(
        this.llm,
        this.buildKnowledgeContext(knowledgeStore, brief.genre, {
          tags: ["verse", "device"],
        }),
      );
      return versePlanner.plan(systemsDesign, devices, templateResult.resolvedTemplate);
    });
    this.emit(8, "Planning Verse", `${modulePlan.modules.length} modules planned`);

    const lootTables = await cache.getOrCompute<LootTable[]>("7-lootTables", () => {
      const lootGenerator = new LootGenerator(this.llm);
      return lootGenerator.generate(brief, worldDesign);
    });

    // ── Stage 8: Verse Code Generation ──
    this.emit(8, "Planning Verse", "Generating Verse source files...");
    const verseGenerator = new VerseGenerator(
      this.llm,
      this.buildKnowledgeContext(knowledgeStore, brief.genre, {
        tags: ["verse", "pattern", "editable", "failable"],
        type: "verse_pattern",
      }),
    );
    const emitter = new VerseEmitter();
    const verseFiles = new Map<string, string>();

    const cachedVerse = cache.load<Record<string, string>>("8-verseFiles");
    if (cachedVerse) {
      for (const [k, v] of Object.entries(cachedVerse)) {
        verseFiles.set(k, v);
      }
      this.emit(8, "Planning Verse", `${verseFiles.size}/${modulePlan.modules.length} Verse files (cached)`);
    } else {
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
            this.emit(8, "Planning Verse", `⚠ ${mod.className}: ${memCheck.issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ")}`);
          }
          verseFiles.set(`${mod.className}.verse`, code);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          verseFailures.push(`${mod.className}: ${msg}`);
          this.emit(8, "Planning Verse", `✗ ${mod.className} failed: ${msg}`);
        }
      }
      if (verseFailures.length > 0) {
        throw new Error(`Verse generation failed for ${verseFailures.join(", ")}`);
      }
      cache.save("8-verseFiles", Object.fromEntries(verseFiles));
      this.emit(8, "Planning Verse", `${verseFiles.size}/${modulePlan.modules.length} Verse files generated${memoryWarnings > 0 ? ` (${memoryWarnings} memory warnings)` : ""}`);
    }

    this.jobManager.transition(job.jobId, "generated", 8);
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
      outputPath: this.options.outputDir,
    };
  }
}
