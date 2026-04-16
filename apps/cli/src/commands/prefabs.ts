import { Command } from "commander";
import { createStarterCatalog } from "@forgeai/prefabs";

export const prefabsCommand = new Command("prefabs")
  .description("Browse and manage prefab catalogs");

prefabsCommand
  .command("list")
  .description("List all available prefabs")
  .option("--tag <tag>", "Filter by tag")
  .option("--category <cat>", "Filter by category")
  .option("--json", "Machine-readable output")
  .action((options) => {
    const catalog = createStarterCatalog();
    let prefabs = catalog.list();

    if (options.tag) {
      prefabs = prefabs.filter((p) => p.tags.includes(options.tag));
    }
    if (options.category) {
      prefabs = prefabs.filter((p) => p.category === options.category);
    }

    if (options.json) {
      console.log(JSON.stringify(prefabs, null, 2));
      return;
    }

    console.log(`Prefab Catalog (${prefabs.length} items)\n`);
    const grouped = new Map<string, typeof prefabs>();
    for (const p of prefabs) {
      const list = grouped.get(p.category) ?? [];
      list.push(p);
      grouped.set(p.category, list);
    }
    for (const [category, items] of grouped) {
      console.log(`  ${category.toUpperCase()} (${items.length})`);
      for (const p of items) {
        console.log(`    ${p.prefabId.padEnd(24)} ${p.name.padEnd(20)} [${p.tags.join(", ")}]`);
      }
    }
  });
