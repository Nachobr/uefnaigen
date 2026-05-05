import { Command } from "commander";
import { JobManager, Pipeline, StageCache, type PipelineResult } from "@forgeai/core";
import { loadConfig, type CLIFlags } from "@forgeai/schemas";

export const resumeCommand = new Command("resume")
  .description("Resume or inspect a previous job")
  .argument("<jobId>", "Job ID to resume or inspect")
  .option("--json", "Machine-readable output")
  .option("--out <path>", "Output directory", "./output")
  .option("--run", "Actually resume the pipeline from the last cached stage")
  .option("--provider <id>", "Choose AI provider")
  .option("--model <id>", "Override default model")
  .option("--budget <usd>", "Stop if inference cost exceeds threshold", parseFloat)
  .option("--strict", "Fail on validation warnings")
  .option("--repair", "Run LLM repair loop on validation failures")
  .option("--zip", "Export output as a .zip archive")
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

    console.log(`Resuming job ${jobId} from stage ${lastStage + 1}...`);
    const config = loadConfig(options as CLIFlags);

    const pipeline = new Pipeline({
      prompt: job.prompt,
      seed: job.seed,
      outputDir: options.out,
      config,
      resumeJobId: jobId,
      archive: options.zip,
      strict: options.strict,
      repair: options.repair,
      onStage: (stage, name, detail) => {
        if (options.json) return;
        console.log(`[${stage}/8] ${name}...`);
        console.log(`  ${detail}`);
      },
    });

    try {
      const result = await pipeline.run();

      if (options.json) {
        console.log(JSON.stringify(toSerializable(result), null, 2));
        return;
      }

      console.log(`\n✓ Resume complete`);
      console.log(`  Job ID:    ${result.job.jobId}`);
      console.log(`  Status:    ${result.job.status}`);
      console.log(`  Zones:     ${result.layout.zones.length}`);
      console.log(`  Devices:   ${result.devices.length}`);
      console.log(`  Modules:   ${result.modulePlan.modules.length}`);
      if (result.archivePath) {
        console.log(`  Archive:   ${result.archivePath}`);
      } else {
        console.log(`  Output:    ${result.outputPath}`);
      }
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      } else {
        console.error(`\n✗ Resume failed: ${err instanceof Error ? err.message : err}`);
      }
      process.exit(1);
    }
  });

function toSerializable(result: PipelineResult): Record<string, unknown> {
  return {
    ...result,
    verseFiles: Object.fromEntries(result.verseFiles),
  };
}
