import { loadProject } from "@forgeai/core";
import { loadDeviceCatalog } from "./catalog.js";
import { planApply, type ApplyPlan } from "./plan.js";

export interface LoadApplyPlanOptions {
  catalogPath?: string;
}

export function loadApplyPlan(projectDir: string, options: LoadApplyPlanOptions = {}): ApplyPlan {
  const loaded = loadProject(projectDir);
  return planApply({
    devices: loaded.project.devices,
    layout: loaded.project.layout,
    verseFiles: loaded.verseFiles,
    catalog: loadDeviceCatalog(options.catalogPath),
  });
}
