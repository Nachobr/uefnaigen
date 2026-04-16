import { WorldProject, LayoutSpec, EconomySpec, DeviceInstance, VerseModule } from "@forgeai/schemas";
import type { Validator, ValidationResult } from "./types.js";

export class SchemaValidator implements Validator {
  name = "schema";

  validate(project: WorldProject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const check = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (e) {
        errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    check("layout", () => LayoutSpec.parse(project.layout));
    check("economy", () => EconomySpec.parse(project.economy));
    for (const dev of project.devices) {
      check(`device[${dev.id}]`, () => DeviceInstance.parse(dev));
    }
    for (const script of project.scripts) {
      check(`script[${script.name}]`, () => VerseModule.parse(script));
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
