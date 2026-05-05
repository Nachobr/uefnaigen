import type { WorldProject } from "@forgeai/schemas";
import { VerseEmitter, lintVerseCode, checkVerseMemory } from "@forgeai/verse";
import type { Validator, ValidationResult } from "./types.js";

export class VerseMemoryValidator implements Validator {
  name = "verse-memory";

  validate(project: WorldProject): ValidationResult {
    const emitter = new VerseEmitter();
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalWeakMaps = 0;

    for (const mod of project.scripts) {
      let code: string;
      try {
        code = emitter.emit(mod);
      } catch (err) {
        errors.push(`${mod.name}: failed to emit Verse: ${(err as Error).message}`);
        continue;
      }
      // Apply lint first so memory checker sees the same source the packager writes.
      code = lintVerseCode(code).code;
      const result = checkVerseMemory(code);
      totalWeakMaps += result.weakMapCount;

      for (const issue of result.issues) {
        const msg = `${mod.name}:${issue.line} [${issue.rule}] ${issue.message}`;
        if (issue.severity === "error") errors.push(msg);
        else warnings.push(msg);
      }
    }

    if (totalWeakMaps > 4) {
      errors.push(
        `Project declares ${totalWeakMaps} weak_map variables across all modules; UEFN allows a maximum of 4 per island.`,
      );
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}
