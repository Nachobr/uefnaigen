import { Command } from "commander";
import { JobManager } from "@forgeai/core";

export const resumeCommand = new Command("resume")
  .description("Show status of a previous job (resume not yet implemented)")
  .argument("<jobId>", "Job ID to inspect")
  .option("--json", "Machine-readable output")
  .action(async (jobId, options) => {
    const jobManager = new JobManager();
    const job = jobManager.get(jobId);

    if (!job) {
      console.error(`✗ Job not found: ${jobId}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    console.log(`Job: ${job.jobId}`);
    console.log(`  Status:   ${job.status}`);
    console.log(`  Stage:    ${job.currentStage}/8`);
    console.log(`  Prompt:   ${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? "..." : ""}`);
    console.log(`  Seed:     ${job.seed}`);
    console.log(`  Started:  ${job.startedAt}`);
    console.log(`  Updated:  ${job.updatedAt}`);
    if (job.error) console.log(`  Error:    ${job.error}`);

    if (job.status === "generated" || job.status === "packaged" || job.status === "complete") {
      console.log(`\n✓ Job completed successfully.`);
    } else if (job.status === "failed" || job.status === "failed_validation") {
      console.log(`\n✗ Job failed. Re-run with: uefn-ai create "${job.prompt}" --seed ${job.seed}`);
    } else {
      console.log(`\n⏳ Job in progress or incomplete.`);
    }
  });
