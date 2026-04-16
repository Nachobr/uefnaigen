import type { WorldProject } from "@forgeai/schemas";

export interface ValidationResult {
  validator: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface Validator {
  name: string;
  validate(project: WorldProject): ValidationResult;
}
