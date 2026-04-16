import type { WorldProject } from "@forgeai/schemas";
import type { Validator, ValidationResult } from "./types.js";

export class CrossRefValidator implements Validator {
  name = "crossref";

  validate(project: WorldProject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const zoneIds = new Set(project.layout.zones.map((z) => z.zoneId));
    const deviceIds = new Set(project.devices.map((d) => d.id));
    const currencyIds = new Set(project.economy.currencies.map((c) => c.currencyId));

    // Devices reference valid zones
    for (const dev of project.devices) {
      if (dev.zoneId && !zoneIds.has(dev.zoneId)) {
        errors.push(`Device "${dev.id}" references unknown zone "${dev.zoneId}"`);
      }
    }

    // Spawn points reference valid zones
    for (const sp of project.layout.spawnPoints) {
      if (!zoneIds.has(sp.zoneId)) {
        errors.push(`Spawn point "${sp.id}" references unknown zone "${sp.zoneId}"`);
      }
    }

    // Economy generators reference valid currencies
    for (const gen of project.economy.generators) {
      if (!currencyIds.has(gen.currencyId)) {
        errors.push(`Generator "${gen.sourceId}" references unknown currency "${gen.currencyId}"`);
      }
    }

    // Economy sinks reference valid currencies
    for (const sink of project.economy.sinks) {
      if (!currencyIds.has(sink.currencyId)) {
        errors.push(`Sink "${sink.sinkId}" references unknown currency "${sink.currencyId}"`);
      }
    }

    // Zone progression gates reference valid zones
    for (const zone of project.layout.zones) {
      if (zone.progressionGate?.prerequisiteZoneIds) {
        for (const preReq of zone.progressionGate.prerequisiteZoneIds) {
          if (!zoneIds.has(preReq)) {
            errors.push(`Zone "${zone.zoneId}" gate references unknown prerequisite zone "${preReq}"`);
          }
        }
      }
    }

    // Warn if no devices in a zone
    const zonesWithDevices = new Set(project.devices.map((d) => d.zoneId).filter(Boolean));
    for (const zone of project.layout.zones) {
      if (!zonesWithDevices.has(zone.zoneId)) {
        warnings.push(`Zone "${zone.zoneId}" has no devices`);
      }
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
