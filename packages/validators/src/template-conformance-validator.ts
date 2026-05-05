import type { WorldProject, TemplateDefinition } from "@forgeai/schemas";
import type { Validator, ValidationResult } from "./types.js";

/**
 * Surfaces deviations from the resolved template's contract: required zone
 * purposes, zone count bounds, required/allowed device types, and required
 * Verse modules. Reports as warnings (not errors) — templates are guidelines
 * and the project can still be packaged. Strict mode promotes warnings to
 * pipeline failures.
 */
export class TemplateConformanceValidator implements Validator {
  name = "template-conformance";

  constructor(private resolvedTemplate: TemplateDefinition) {}

  validate(project: WorldProject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const t = this.resolvedTemplate;

    const presentPurposes = new Set<string>(project.layout.zones.map((z) => z.purpose));
    for (const required of t.layoutRules.requiredZonePurposes) {
      if (!presentPurposes.has(required)) {
        warnings.push(`Template "${t.templateId}" requires a zone with purpose "${required}".`);
      }
    }

    const zoneCount = project.layout.zones.length;
    if (zoneCount < t.layoutRules.minZones) {
      warnings.push(
        `Template "${t.templateId}" requires at least ${t.layoutRules.minZones} zones (found ${zoneCount}).`,
      );
    }
    if (zoneCount > t.layoutRules.maxZones) {
      warnings.push(
        `Template "${t.templateId}" expects at most ${t.layoutRules.maxZones} zones (found ${zoneCount}).`,
      );
    }

    const presentDeviceTypes = new Set<string>(project.devices.map((d) => d.type));
    for (const required of t.devicePolicies.requiredDeviceTypes) {
      if (!presentDeviceTypes.has(required)) {
        warnings.push(`Template "${t.templateId}" requires at least one device of type "${required}".`);
      }
    }

    if (t.devicePolicies.allowedDeviceTypes.length > 0) {
      const allowed = new Set(t.devicePolicies.allowedDeviceTypes);
      for (const dev of project.devices) {
        if (!allowed.has(dev.type)) {
          warnings.push(
            `Device "${dev.id}" uses type "${dev.type}" which is not in template "${t.templateId}" allowedDeviceTypes.`,
          );
        }
      }
    }

    const presentModules = new Set(project.scripts.map((s) => s.name));
    for (const required of t.verseModules.required) {
      if (!presentModules.has(required)) {
        warnings.push(`Template "${t.templateId}" requires Verse module "${required}".`);
      }
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
