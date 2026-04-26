import { Command } from "commander";
import { JobManager, Pipeline, StageCache } from "@forgeai/core";
import { loadConfig, type CLIFlags } from "@forgeai/schemas";
import { ScaffoldPackager } from "@forgeai/packager";

export const resumeCommand = new Command("resume")
  .description("Resume or inspect a previous job")
  .argument("<jobId>", "Job ID to resume or inspect")
  .option("--json", "Machine-readable output")
  .option("--out <path>", "Output directory", "./output")
  .option("--run", "Actually resume the pipeline from the last cached stage")
  .option("--provider <id>", "Choose AI provider")
  .option("--model <id>", "Override default model")
  .option("--budget <usd>", "Stop if inference cost exceeds threshold", parseFloat)
  .action(async (jobId, options) => {
    const jobManager = new JobManager();
    const job = jobManager.get(jobId);

    if (!job) {
      console.error(`✗ Job not found: ${jobId}`);
      process.exit(1);
    }

    const cache = new StageCache(jobId);
    const lastStage = cache.lastCompletedStage;

    if (options.json && !options.run) {
      console.log(JSON.stringify({ ...job, cachedStages: lastStage }, null, 2));
      return;
    }

    if (!options.run) {
      console.log(`Job: ${job.jobId}`);
      console.log(`  Status:   ${job.status}`);
      console.log(`  Stage:    ${job.currentStage}/8`);
      console.log(`  Cached:   ${lastStage} stage(s)`);
      console.log(`  Prompt:   ${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? "..." : ""}`);
      console.log(`  Seed:     ${job.seed}`);
      console.log(`  Started:  ${job.startedAt}`);
      console.log(`  Updated:  ${job.updatedAt}`);
      if (job.error) console.log(`  Error:    ${job.error}`);

      if (lastStage > 0) {
        console.log(`\nTo resume: uefn-ai resume ${jobId} --run`);
      } else if (job.status === "generated" || job.status === "packaged" || job.status === "complete") {
        console.log(`\n✓ Job completed successfully.`);
      } else {
        console.log(`\n✗ No cached stages. Re-run with: uefn-ai create "${job.prompt}" --seed ${job.seed}`);
      }
      return;
    }

    // Resume the pipeline
    console.log(`Resuming job ${jobId} from stage ${lastStage + 1}...`);
    const config = loadConfig(options as CLIFlags);

    const pipeline = new Pipeline({
      prompt: job.prompt,
      seed: job.seed,
      outputDir: options.out,
      config,
      resumeJobId: jobId,
      onStage: (stage, name, detail) => {
        if (options.json) return;
        console.log(`[${stage}/8] ${name}...`);
        console.log(`  ${detail}`);
      },
    });

    try {
      const result = await pipeline.run();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n✓ Resume complete`);
      console.log(`  Job ID:    ${result.job.jobId}`);
      console.log(`  Zones:     ${result.layout.zones.length}`);
      console.log(`  Devices:   ${result.devices.length}`);
      console.log(`  Modules:   ${result.modulePlan.modules.length}`);

      const now = new Date().toISOString();
      const project = {
        specVersion: "wg/1.0" as const,
        projectId: result.job.projectId,
        name: result.brief.fantasy.slice(0, 60),
        slug: result.job.jobId,
        createdAt: now,
        updatedAt: now,
        source: { mode: "map-studio" as const, prompt: job.prompt, seed: job.seed },
        target: { genre: result.brief.genre, uefnVersion: "32.00", outputMode: "scaffold" as const },
        design: {
          fantasy: result.brief.fantasy,
          coreLoop: result.brief.coreLoop,
          sessionLengthMin: result.brief.sessionLengthMin,
          progressionStyle: result.brief.progressionStyle,
        },
        layout: result.layout,
        economy: result.economy,
        devices: result.devices,
        prefabs: [],
        scripts: [],
        validation: [],
      };

      const packager = new ScaffoldPackager();
      await packager.package(
        {
          project,
          worldDesign: result.worldDesign,
          modulePlan: result.modulePlan,
          lootTables: result.lootTables,
          balanceReport: result.balanceReport,
          verseFiles: result.verseFiles,
        },
        result.outputPath,
      );
      console.log(`  Output:    ${result.outputPath}`);
    } catch (err) {
      console.error(`\n✗ Resume failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });
