import { Command } from "commander";
import { initConfig } from "@forgeai/schemas";

export const initCommand = new Command("init")
  .description("Create a default ForgeAI config file")
  .option("--json", "Machine-readable output")
  .action((options: { json?: boolean }) => {
    const configPath = initConfig();

    if (options.json) {
      console.log(JSON.stringify({ configPath }, null, 2));
      return;
    }

    console.log(`✓ ForgeAI config ready: ${configPath}`);
  });
