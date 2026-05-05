import type { WorldProject } from "@forgeai/schemas";
import { VerseEmitter, lintVerseCode } from "@forgeai/verse";
import type { Validator, ValidationResult } from "./types.js";

export class VerseLintValidator implements Validator {
  name = "verse-lint";

  validate(project: WorldProject): ValidationResult {
    const emitter = new VerseEmitter();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const mod of project.scripts) {
      let code: string;
      try {
        code = emitter.emit(mod);
      } catch (err) {
        errors.push(`${mod.name}: failed to emit Verse: ${(err as Error).message}`);
        continue;
      }
      const result = lintVerseCode(code);
      for (const fix of result.fixesApplied) {
        warnings.push(`${mod.name}: linter would apply fix — ${fix}`);
      }
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
