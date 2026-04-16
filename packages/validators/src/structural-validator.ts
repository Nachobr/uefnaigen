import type { WorldProject } from "@forgeai/schemas";
import type { Validator, ValidationResult } from "./types.js";

export class StructuralValidator implements Validator {
  name = "structural";

  validate(project: WorldProject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Unique device IDs
    const deviceIds = new Set<string>();
    for (const dev of project.devices) {
      if (deviceIds.has(dev.id)) {
        errors.push(`Duplicate device ID: "${dev.id}"`);
      }
      deviceIds.add(dev.id);
    }

    // Unique zone IDs
    const zoneIds = new Set<string>();
    for (const zone of project.layout.zones) {
      if (zoneIds.has(zone.zoneId)) {
        errors.push(`Duplicate zone ID: "${zone.zoneId}"`);
      }
      zoneIds.add(zone.zoneId);
    }

    // Unique module names
    const moduleNames = new Set<string>();
    for (const script of project.scripts) {
      if (moduleNames.has(script.name)) {
        errors.push(`Duplicate module name: "${script.name}"`);
      }
      moduleNames.add(script.name);
    }

    // At least one zone
    if (project.layout.zones.length === 0) {
      errors.push("Layout has no zones");
    }

    // At least one spawn point
    if (project.layout.spawnPoints.length === 0) {
      errors.push("Layout has no spawn points");
    }

    // At least one currency
    if (project.economy.currencies.length === 0) {
      errors.push("Economy has no currencies");
    }

    // Warn on empty scripts
    if (project.scripts.length === 0) {
      warnings.push("No Verse scripts in project");
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
