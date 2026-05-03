import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrefabDefinition } from "@forgeai/schemas";
import { PrefabCatalog } from "./catalog.js";

export interface UserCatalogLoadReport {
  loaded: string[];
  skipped: Array<{ file: string; reason: string }>;
}

export interface UserCatalogLoadResult {
  catalog: PrefabCatalog;
  report: UserCatalogLoadReport;
}

/**
 * Backwards-compatible loader: returns just the catalog. Existing callers keep working.
 * Use {@link loadUserCatalogWithReport} when you need to surface skip reasons.
 */
export function loadUserCatalog(dir: string): PrefabCatalog {
  return loadUserCatalogWithReport(dir).catalog;
}

export function loadUserCatalogWithReport(dir: string): UserCatalogLoadResult {
  const catalog = new PrefabCatalog();
  const report: UserCatalogLoadReport = { loaded: [], skipped: [] };

  if (!existsSync(dir)) return { catalog, report };

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const path = join(dir, file);
    try {
      const raw = readFileSync(path, "utf-8");
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
      report.loaded.push(file);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      report.skipped.push({ file, reason });
    }
  }

  return { catalog, report };
}
