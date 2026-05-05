import type { WorldProject, TemplateDefinition } from "@forgeai/schemas";
import type { Validator, ValidationResult } from "./types.js";

/**
 * Verifies the WorldProject has the data the packager needs to emit a complete
 * scaffold (manifests, docs, Verse files, template metadata). Runs before
 * packaging so we catch missing fields here instead of producing a half-empty
 * project on disk.
 */
export class PackageReadinessValidator implements Validator {
  name = "package-readiness";

  constructor(private resolvedTemplate?: TemplateDefinition) {}

  validate(project: WorldProject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Manifests rely on these arrays being present and non-empty.
    if (!project.layout.zones.length) errors.push("Cannot package: layout has no zones (layout.grid.json would be empty).");
    if (!project.devices.length) errors.push("Cannot package: no devices (device_manifest.json would be empty).");
    if (!project.economy.currencies.length) errors.push("Cannot package: economy has no currencies (economy.json would be unusable).");
    if (!project.scripts.length) warnings.push("No Verse scripts: Verse/ directory will be empty.");

    // Docs rely on these design fields being non-empty.
    if (!project.design.fantasy?.trim()) warnings.push("design.fantasy is empty: DESIGN-SUMMARY.md will be sparse.");
    if (!project.design.coreLoop?.length) warnings.push("design.coreLoop is empty: DESIGN-SUMMARY.md will be sparse.");
    if (!project.name?.trim()) errors.push("Project name is empty: README cannot be generated.");

    // Template metadata must be persisted.
    if (!this.resolvedTemplate) {
      warnings.push(
        "No resolvedTemplate provided to PackageReadinessValidator: templates/resolved-template.json will not be written.",
      );
    } else if (!this.resolvedTemplate.templateId) {
      errors.push("resolvedTemplate.templateId is missing: packager cannot persist template metadata.");
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
