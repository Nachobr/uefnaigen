import { Command } from "commander";
import { discoverUefnListener, executeApplyPlan, loadApplyPlan, UefnHttpClient } from "@forgeai/uefn-bridge";

interface ApplyOptions {
  dryRun?: boolean;
  targetPort?: string;
  catalog?: string;
}

export const applyCommand = new Command("apply")
  .description("Plan or apply a ForgeAI scaffold to a live UEFN editor")
  .argument("<project-dir>", "Path to generated ForgeAI project directory")
  .option("--dry-run", "Print the apply plan without changing UEFN", false)
  .option("--target-port <port>", "UEFN listener port")
  .option("--catalog <path>", "Override UEFN device catalog JSON path")
  .action(async (projectDir: string, options: ApplyOptions) => {
    const plan = loadApplyPlan(projectDir, { catalogPath: options.catalog });
    console.log(`ForgeAI Live apply plan${options.dryRun ? " (dry run)" : ""}`);
    console.log(`Devices: ${plan.stats.deviceCount}`);
    console.log(`Spawn points: ${plan.stats.spawnPointCount}`);
    console.log(`Verse files: ${plan.stats.verseFileCount}`);
    console.log(`Commands: ${plan.commands.length}`);

    if (plan.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warning of plan.warnings) console.log(`- ${warning}`);
    }

    console.log("\nPlan:");
    console.table(plan.commands.map((command, index) => summarizeCommand(index + 1, command)));

    if (options.dryRun) return;

    const client = options.targetPort
      ? new UefnHttpClient(`http://127.0.0.1:${Number(options.targetPort)}`)
      : await discoverUefnListener();

    if (!client) {
      console.error("✗ Could not find a running UEFN listener on ports 8765-8770. Start UEFN or pass --target-port.");
      process.exit(1);
    }

    const projectInfo = await client.getProjectInfo();
    const result = await executeApplyPlan(plan, client, { projectInfo });
    console.log(`\n✓ Executed ${result.executed} command(s); skipped ${result.skipped}.`);
    if (result.reconciliation) {
      console.log(
        `Reconciled actors: ${result.reconciliation.taggedActorCount}/${result.reconciliation.expectedActorCount} ForgeAI-tagged found`,
      );
    }
    if (result.warnings.length > 0) {
      console.log("\nApply notes:");
      for (const warning of result.warnings) console.log(`- ${warning}`);
    }
  });

function summarizeCommand(index: number, command: ReturnType<typeof loadApplyPlan>["commands"][number]) {
  switch (command.kind) {
    case "spawn_device":
      return { "#": index, command: command.kind, target: command.id, detail: command.assetPath ?? `unmapped:${command.deviceType}` };
    case "create_spawn_point":
      return { "#": index, command: command.kind, target: command.id, detail: `${command.location.x},${command.location.y},${command.location.z}` };
    case "set_properties":
      return { "#": index, command: command.kind, target: command.id, detail: Object.keys(command.properties).join(",") };
    case "wire_channels":
      return { "#": index, command: command.kind, target: command.id, detail: [...command.listens, ...command.transmits].join(",") };
    case "write_verse":
      return { "#": index, command: command.kind, target: command.fileName, detail: `${command.content.length} bytes` };
    case "save_current_level":
      return { "#": index, command: command.kind, target: "level", detail: "" };
  }
}
