import type { WorldProject } from "@forgeai/schemas";
import type { ValidationResult, Validator } from "./types.js";
import { SchemaValidator } from "./schema-validator.js";
import { CrossRefValidator } from "./crossref-validator.js";
import { StructuralValidator } from "./structural-validator.js";

export function runAllValidators(project: WorldProject): ValidationResult[] {
  const validators: Validator[] = [
    new StructuralValidator(),
    new SchemaValidator(),
    new CrossRefValidator(),
  ];

  return validators.map((v) => v.validate(project));
}
