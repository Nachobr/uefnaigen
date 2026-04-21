import { Command } from "commander";
import { loadConfig, type CLIFlags } from "@forgeai/schemas";
import { Pipeline } from "@forgeai/core";
import { ScaffoldPackager } from "@forgeai/packager";

export const createCommand = new Command("create")
  .description("Generate a full UEFN project scaffold from a prompt")
  .argument("<prompt>", "Natural language game description")
  .option("--genre <genre>", "Override inferred genre (tycoon, battle_arena, adventure, roleplay)")
  .option("--template <id>", "Force a specific template")
  .option("--out <path>", "Output directory", "./output")
  .option("--seed <number>", "Deterministic seed", (v) => parseInt(v, 10))
  .option("--model <id>", "Override default model")
  .option("--provider <id>", "Choose AI provider")
  .option("--dry-run", "Plan only, no file writes")
  .option("--budget <usd>", "Stop if inference cost exceeds threshold", parseFloat)
  .option("--verbose", "Detailed logs")
  .option("--json", "Machine-readable output")
  .option("--strict", "Fail on warnings")
  .option("--zip", "Export output as a .tar.gz archive")
  .action(async (prompt, options) => {
    const config = loadConfig(options as CLIFlags);
    const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);

    const pipeline = new Pipeline({
      prompt,
      seed,
      genre: options.genre,
      templateId: options.template,
      outputDir: options.out,
      config,
      dryRun: options.dryRun,
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

      console.log(`\n✓ Generation complete`);
      console.log(`  Job ID:    ${result.job.jobId}`);
      console.log(`  Genre:     ${result.brief.genre}`);
      console.log(`  Template:  ${result.templateResult.templateId}`);
      console.log(`  Zones:     ${result.layout.zones.length}`);
      console.log(`  Devices:   ${result.devices.length}`);
      console.log(`  Modules:   ${result.modulePlan.modules.length}`);
      console.log(`  Loot:      ${result.lootTables.length} tables`);
      console.log(`  Seed:      ${seed}`);

      const now = new Date().toISOString();
      const project = {
        specVersion: "wg/1.0" as const,
        projectId: result.job.projectId,
        name: result.brief.fantasy.slice(0, 60),
        slug: result.job.jobId,
        createdAt: now,
        updatedAt: now,
        source: {
          mode: "map-studio" as const,
          prompt,
          seed,
        },
        target: {
          genre: result.brief.genre,
          uefnVersion: "32.00",
          outputMode: "scaffold" as const,
        },
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

      const packagerInput = {
        project,
        worldDesign: result.worldDesign,
        modulePlan: result.modulePlan,
        lootTables: result.lootTables,
        balanceReport: result.balanceReport,
        verseFiles: new Map<string, string>(),
      };

      if (options.dryRun) {
        console.log(`\n  --dry-run: No files written.`);
      } else if (options.zip) {
        const packager = new ScaffoldPackager();
        const archivePath = await packager.packageZip(
          packagerInput,
          result.outputPath,
        );
        console.log(`\n  Archive:   ${archivePath}`);
      } else {
        const packager = new ScaffoldPackager();
        await packager.package(
          packagerInput,
          result.outputPath,
        );
        console.log(`\n  Output:    ${result.outputPath}`);
        console.log(`\nNext steps:`);
        console.log(`  1. Open README-UEFN-IMPORT.md`);
        console.log(`  2. Import Verse files into your UEFN project`);
        console.log(`  3. Place devices using manifests/device_manifest.json`);
        console.log(`  4. Run validation checklist in docs/QA-CHECKLIST.md`);
      }
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ error: String(err) }));
      } else {
        console.error(`\n✗ Generation failed: ${err instanceof Error ? err.message : err}`);
      }
      process.exit(1);
    }
  });
