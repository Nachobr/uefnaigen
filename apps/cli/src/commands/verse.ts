import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig, type CLIFlags } from "@forgeai/schemas";
import { createAdapter, VerseCopilot } from "@forgeai/ai";

function getAdapter(options: CLIFlags) {
  const config = loadConfig(options);
  return createAdapter(config);
}

export const verseCommand = new Command("verse")
  .description("Verse Copilot — generate, fix, and explain Verse scripts");

verseCommand
  .command("generate")
  .description("Generate a Verse script from a plain English description")
  .argument("<description>", "What the script should do")
  .option("--context <dir>", "Project context directory")
  .option("--out <file>", "Output file path")
  .option("--provider <id>", "AI provider")
  .option("--model <id>", "Model override")
  .action(async (description, options) => {
    const adapter = getAdapter(options);
    const copilot = new VerseCopilot(adapter);

    console.log("Generating Verse...");
    const context = options.context
      ? readFileSync(options.context, "utf-8")
      : undefined;

    const code = await copilot.generate(description, context);

    if (options.out) {
      writeFileSync(options.out, code, "utf-8");
      console.log(`✓ Wrote ${options.out}`);
    } else {
      console.log("\n" + code);
    }
  });

verseCommand
  .command("fix")
  .description("Repair a Verse script using compiler errors")
  .argument("<file>", "Path to Verse file")
  .option("--errors <file>", "Path to error log")
  .option("--provider <id>", "AI provider")
  .option("--model <id>", "Model override")
  .action(async (file, options) => {
    const adapter = getAdapter(options);
    const copilot = new VerseCopilot(adapter);

    const verseCode = readFileSync(file, "utf-8");
    const errors = options.errors
      ? readFileSync(options.errors, "utf-8")
      : "Unknown compilation errors";

    console.log(`Fixing ${file}...`);
    const fixed = await copilot.fix(verseCode, errors);
    writeFileSync(file, fixed, "utf-8");
    console.log(`✓ Patched ${file}`);
  });

verseCommand
  .command("explain")
  .description("Explain a Verse script in plain English")
  .argument("<file>", "Path to Verse file")
  .option("--provider <id>", "AI provider")
  .option("--model <id>", "Model override")
  .action(async (file, options) => {
    const adapter = getAdapter(options);
    const copilot = new VerseCopilot(adapter);

    const verseCode = readFileSync(file, "utf-8");
    console.log(`Explaining ${file}...\n`);
    const explanation = await copilot.explain(verseCode);
    console.log(explanation);
  });
