import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrefabDefinition } from "@forgeai/schemas";
import { PrefabCatalog } from "./catalog.js";

export function loadUserCatalog(dir: string): PrefabCatalog {
  const catalog = new PrefabCatalog();

  if (!existsSync(dir)) return catalog;

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const prefab = PrefabDefinition.parse(item);
          catalog.add(prefab);
        }
      } else {
        const prefab = PrefabDefinition.parse(parsed);
        catalog.add(prefab);
      }
    } catch {
      // Skip invalid files silently
    }
  }

  return catalog;
}
