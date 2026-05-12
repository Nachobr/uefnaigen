import { Command } from "commander";
import { loadProject } from "@forgeai/core";
import { runAllValidators } from "@forgeai/validators";

export const validateCommand = new Command("validate")
  .description("Run all validators on a generated project")
  .argument("<project-dir>", "Path to project directory")
  .option("--json", "Machine-readable output")
  .action(async (projectDir, options) => {
    let loaded: ReturnType<typeof loadProject>;
    try {
      loaded = loadProject(projectDir);
    } catch (err) {
      console.error(`✗ Could not load ForgeAI scaffold: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    const results = runAllValidators(loaded.project, { resolvedTemplate: loaded.resolvedTemplate });

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    for (const r of results) {
      const icon = r.passed ? "✓" : "✗";
      console.log(`${icon} ${r.validator}`);
      for (const e of r.errors) console.log(`    ERROR: ${e}`);
      for (const w of r.warnings) console.log(`    WARN:  ${w}`);
    }

    const allPassed = results.every((r) => r.passed);
    console.log(`\n${allPassed ? "✓ All checks passed" : "✗ Validation failed"}`);
    if (!allPassed) process.exit(1);
  });
