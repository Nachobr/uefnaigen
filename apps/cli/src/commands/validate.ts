import { Command } from "commander";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WorldProject } from "@forgeai/schemas";
import { runAllValidators } from "@forgeai/validators";

export const validateCommand = new Command("validate")
  .description("Run all validators on a generated project")
  .argument("<project-dir>", "Path to project directory")
  .option("--json", "Machine-readable output")
  .action(async (projectDir, options) => {
    const manifestPath = join(projectDir, "manifests", "world.project.json");
    let raw: string;
    try {
      raw = readFileSync(manifestPath, "utf-8");
    } catch {
      console.error(`✗ Could not read ${manifestPath}`);
      process.exit(1);
    }

    const project = WorldProject.parse(JSON.parse(raw));
    const results = runAllValidators(project);

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
