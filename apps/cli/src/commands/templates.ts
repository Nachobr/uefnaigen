import { Command } from "commander";
import { createDefaultRegistry } from "@forgeai/templates";

export const templatesCommand = new Command("templates")
  .description("Browse and inspect genre templates");

templatesCommand
  .command("list")
  .description("List all available templates")
  .option("--json", "Machine-readable output")
  .action((options) => {
    const registry = createDefaultRegistry();
    const templates = registry.list();

    if (options.json) {
      console.log(JSON.stringify(templates.map((t) => ({
        id: t.templateId,
        genre: t.genre,
        summary: t.summary,
        extends: t.extends,
      })), null, 2));
      return;
    }

    console.log("Available templates:\n");
    for (const t of templates) {
      const ext = t.extends ? ` (extends ${t.extends})` : "";
      console.log(`  ${t.templateId.padEnd(25)} ${t.summary.slice(0, 60)}${ext}`);
    }
  });

templatesCommand
  .command("inspect")
  .description("Show details of a template")
  .argument("<id>", "Template ID")
  .option("--json", "Machine-readable output")
  .action((id, options) => {
    const registry = createDefaultRegistry();
    let template;
    try {
      template = registry.resolve(id);
    } catch {
      console.error(`✗ Template not found: ${id}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(template, null, 2));
      return;
    }

    console.log(`Template: ${template.templateId}`);
    console.log(`  Genre:       ${template.genre}`);
    console.log(`  Version:     ${template.version}`);
    console.log(`  Summary:     ${template.summary}`);
    console.log(`  Layout:      ${template.layoutRules.layoutStyle} (${template.layoutRules.minZones}-${template.layoutRules.maxZones} zones)`);
    console.log(`  Systems:     ${template.systemModules.required.join(", ")}`);
    console.log(`  Devices:     ${template.devicePolicies.requiredDeviceTypes.join(", ")}`);
    console.log(`  Verse:       ${template.verseModules.required.join(", ")}`);
    console.log(`  Tags:        ${template.prefabTags.join(", ")}`);
  });
