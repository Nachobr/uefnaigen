import { Command } from "commander";
import { loadConfig, type CLIFlags } from "@forgeai/schemas";
import { Modifier, type ModifierResult } from "@forgeai/core";

export const modifyCommand = new Command("modify")
  .description("Modify an existing ForgeAI scaffold with a constrained AI patch")
  .argument("<project-dir>", "Generated ForgeAI scaffold directory")
  .argument("<request>", "Natural language change request")
  .option("--out <path>", "Write a modified copy to this directory instead of editing in place")
  .option("--dry-run", "Print patch + validation result without writing files")
  .option("--budget <usd>", "Stop if inference cost exceeds threshold", parseFloat)
  .option("--strict", "Fail on validation warnings")
  .option("--repair", "Run LLM repair loop on validation failures", true)
  .option("--no-repair", "Disable repair loop")
  .option("--repair-passes <number>", "Maximum repair passes", (v) => parseInt(v, 10))
  .option("--force", "Allow modifying projects with human-edited files")
  .option("--json", "Machine-readable output")
  .option("--model <id>", "Override default model")
  .option("--provider <id>", "Choose AI provider")
  .option("--verbose", "Detailed logs")
  .action(async (projectDir, request, options) => {
    const config = loadConfig(options as CLIFlags);
    const modifier = new Modifier({
      projectDir,
      request,
      config,
      outputDir: options.out,
      dryRun: options.dryRun,
      force: options.force,
      repair: options.repair,
      repairPasses: options.repairPasses,
      strict: options.strict,
    });

    try {
      const result = await modifier.run();

      if (options.json) {
        console.log(JSON.stringify(toSerializable(result), null, 2));
        return;
      }

      const passed = result.validation.filter((v) => v.passed).length;
      const warnings = result.validation.reduce((n, v) => n + v.warnings.length, 0);
      console.log(`\n✓ Modification ${options.dryRun ? "planned" : "complete"}`);
      console.log(`  Job ID:    ${result.jobId}`);
      console.log(`  Summary:   ${result.patch.summary}`);
      console.log(`  Ops:       ${result.patch.operations.length}`);
      console.log(`  Validate:  ${passed}/${result.validation.length} passed${warnings > 0 ? ` (${warnings} warnings)` : ""}`);
      console.log(`  Cost:      $${result.costUsd.toFixed(4)}`);
      console.log(`  Files:     ${result.changedFiles.length}`);
      for (const file of result.changedFiles) console.log(`    - ${file}`);

      if (options.dryRun) {
        console.log(`\n  --dry-run: No files written.`);
      } else {
        console.log(`\n  Output:    ${result.outputPath}`);
        console.log(`  Summary:   docs/MODIFICATION-SUMMARY.md`);
      }
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      } else {
        console.error(`\n✗ Modification failed: ${err instanceof Error ? err.message : err}`);
      }
      process.exit(1);
    }
  });

function toSerializable(result: ModifierResult): Record<string, unknown> {
  return {
    patch: result.patch,
    validation: result.validation,
    costUsd: result.costUsd,
    changedFiles: result.changedFiles,
    jobId: result.jobId,
    outputPath: result.outputPath,
  };
}
