import type { WorldProject, TemplateDefinition } from "@forgeai/schemas";
import type { ValidationResult, Validator } from "./types.js";
import { SchemaValidator } from "./schema-validator.js";
import { CrossRefValidator } from "./crossref-validator.js";
import { StructuralValidator } from "./structural-validator.js";
import { VerseLintValidator } from "./verse-lint-validator.js";
import { VerseMemoryValidator } from "./verse-memory-validator.js";
import { TemplateConformanceValidator } from "./template-conformance-validator.js";
import { PackageReadinessValidator } from "./package-readiness-validator.js";

export interface RunValidatorsOptions {
  /** Resolved template; required to run TemplateConformanceValidator (skipped if absent). */
  resolvedTemplate?: TemplateDefinition;
}

export function runAllValidators(
  project: WorldProject,
  options: RunValidatorsOptions = {},
): ValidationResult[] {
  const validators: Validator[] = [
    new StructuralValidator(),
    new SchemaValidator(),
    new CrossRefValidator(),
    new VerseLintValidator(),
    new VerseMemoryValidator(),
    new PackageReadinessValidator(options.resolvedTemplate),
  ];

  if (options.resolvedTemplate) {
    validators.push(new TemplateConformanceValidator(options.resolvedTemplate));
  }

  return validators.map((v) => v.validate(project));
}
