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
  LootGenerator,
  BudgetAdapter,
  type LLMAdapter,
  type NormalizedBrief,
  type WorldDesign,
  type SystemsDesign,
  type TemplateRouterResult,
  type ModulePlan,
  type LootTable,
} from "@forgeai/ai";
import { createDefaultRegistry } from "@forgeai/templates";
import { TycoonSimulator, type SimulationResult } from "@forgeai/balance";
import { JobManager } from "./job-manager.js";

export interface PipelineOptions {
  prompt: string;
  seed: number;
  genre?: string;
  templateId?: string;
  outputDir: string;
  config: ForgeAIConfig;
  dryRun?: boolean;
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
  outputPath: string;
}

export class Pipeline {
  private llm: LLMAdapter;
  private jobManager = new JobManager();

  constructor(private options: PipelineOptions) {
    const baseAdapter = createAdapter(options.config);
    this.llm = options.config.budgetUsd
      ? new BudgetAdapter(baseAdapter, options.config.budgetUsd)
      : baseAdapter;
  }

  private emit(stage: number, name: string, detail: string): void {
    this.options.onStage?.(stage, name, detail);
  }

  async run(): Promise<PipelineResult> {
    const job = this.jobManager.create(this.options.prompt, this.options.seed);

    // ── Stage 1: Intent Extraction ──
    this.emit(1, "Parsing prompt", "Extracting genre, constraints, style...");
    this.jobManager.transition(job.jobId, "planning", 1);

    const extractor = new IntentExtractor(this.llm);
    const brief = await extractor.extract(
      this.options.prompt,
      this.options.genre as NormalizedBrief["genre"] | undefined,
    );
    this.emit(1, "Parsing prompt", `Genre: ${brief.genre} | Session: ${brief.sessionLengthMin} min`);

    // ── Stage 2: Template Routing ──
    this.emit(2, "Selecting template", "Matching genre to template...");

    const registry = createDefaultRegistry();
    const router = new TemplateRouter(registry);
    const templateResult = router.route(brief, this.options.templateId);
    this.emit(2, "Selecting template", `Using: ${templateResult.templateId}`);

    // ── Stage 3: World Planning ──
    this.emit(3, "Planning world", "Generating zones, progression, pacing...");

    const worldPlanner = new WorldPlanner(this.llm);
    const worldDesign = await worldPlanner.plan(brief, templateResult.resolvedTemplate);
    this.emit(3, "Planning world", `Zones: ${worldDesign.zones.length} (${worldDesign.zones.map((z) => z.name).join(" → ")})`);

    // ── Stage 4a: Layout Planning ──
    this.emit(4, "Planning layout", "Generating spatial coordinates...");

    const layoutPlanner = new LayoutPlanner(this.llm);
    const layout = await layoutPlanner.plan(
      worldDesign,
      templateResult.resolvedTemplate.layoutRules.layoutStyle,
    );
    this.emit(4, "Planning layout", `${layout.zones.length} zones placed, ${layout.spawnPoints.length} spawn points`);

    // ── Stage 4b: Systems Planning ──
    this.emit(5, "Planning systems", "Designing economy, devices, rules...");

    const systemsPlanner = new SystemsPlanner(this.llm);
    const systemsDesign = await systemsPlanner.plan(
      brief,
      worldDesign,
      templateResult.resolvedTemplate,
    );
    this.emit(5, "Planning systems", `${systemsDesign.devices.length} devices | ${systemsDesign.economy.currencies.length} currencies`);

    // ── Stage 4c: Balance Planning ──
    this.emit(6, "Balancing economy", "Tuning income/sink curves...");

    const balancePlanner = new BalancePlanner(this.llm);
    const economy = await balancePlanner.plan(brief, systemsDesign);

    // ── Stage 5: Validate balance with simulator ──
    const simulator = new TycoonSimulator();
    const simResult = simulator.simulate(economy, brief.sessionLengthMin);

    let finalEconomy = economy;
    let balanceReport = simResult;

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

    // ── Stage 6: Device Mapping ──
    this.emit(7, "Building devices", "Mapping devices to concrete instances...");

    const deviceMapper = new DeviceMapper(this.llm);
    const devices = await deviceMapper.map(layout, systemsDesign);
    this.emit(7, "Building devices", `${devices.length} devices placed`);

    // ── Stage 7: Verse Planning + Loot Tables ──
    this.emit(8, "Planning Verse", "Designing module structure...");

    const versePlanner = new VersePlanner(this.llm);
    const modulePlan = await versePlanner.plan(
      systemsDesign,
      devices,
      templateResult.resolvedTemplate,
    );
    this.emit(8, "Planning Verse", `${modulePlan.modules.length} modules planned`);

    // Loot tables (parallel-safe, independent)
    const lootGenerator = new LootGenerator(this.llm);
    const lootTables = await lootGenerator.generate(brief, worldDesign);

    this.jobManager.transition(job.jobId, "generated", 7);

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
      outputPath: this.options.outputDir,
    };
  }
}
