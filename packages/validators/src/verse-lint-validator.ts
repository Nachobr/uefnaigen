import type { VerseClass, VerseFunction, VerseModule, WorldProject } from "@forgeai/schemas";
import { VerseEmitter, lintVerseCode } from "@forgeai/verse";
import type { Validator, ValidationResult } from "./types.js";

const PROMPT_LEAK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bSomeDevice\.SomeEvent\b/, label: "literal example placeholder 'SomeDevice.SomeEvent'" },
  { pattern: /\bSomeEvent\.Subscribe\b/, label: "literal example placeholder 'SomeEvent.Subscribe'" },
  { pattern: /Subscribe\s*\(\s*Handler\s*\)/, label: "subscribes to undefined 'Handler' callback (likely prompt copy)" },
];

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

      for (const { pattern, label } of PROMPT_LEAK_PATTERNS) {
        if (pattern.test(code)) {
          errors.push(`${mod.name}: ${label}`);
        }
      }

      collectAstHallucinations(mod).forEach((msg) => errors.push(`${mod.name}: ${msg}`));
    }

    return { validator: this.name, passed: errors.length === 0, errors, warnings };
  }
}

function collectAstHallucinations(mod: VerseModule): string[] {
  const issues: string[] = [];
  const declaredNames = collectDeclaredNames(mod);

  for (const decl of mod.declarations) {
    if (decl.kind === "function") {
      issues.push(...checkFunction(decl, new Set([...decl.params.map((p) => p.name)]), declaredNames));
    } else if (decl.kind === "class") {
      const classMembers = new Set<string>([
        ...decl.fields.map((f) => f.name),
        ...decl.methods.map((m) => m.name),
      ]);
      for (const method of decl.methods) {
        const inScope = new Set<string>([...classMembers, ...method.params.map((p) => p.name)]);
        issues.push(...checkFunction(method, inScope, declaredNames));
      }
    }
  }

  return issues;
}

function checkFunction(
  fn: VerseFunction,
  inScope: Set<string>,
  declaredNames: Set<string>,
): string[] {
  const issues: string[] = [];

  for (const stmt of fn.body) {
    const code = stmt.code;

    // Unbound `Agent` use inside failable bind: `if (X := player[Agent])` or `[Agent]` access
    if (/\[\s*Agent\s*\]/.test(code) && !inScope.has("Agent")) {
      issues.push(`method '${fn.name}' references 'Agent' but has no 'Agent:agent' parameter in scope`);
    }

    // Subscribe to a callback identifier that is never declared in the module
    const subMatch = code.match(/\.Subscribe\s*\(\s*([A-Za-z_]\w*)\s*\)/);
    if (subMatch) {
      const handler = subMatch[1];
      if (handler !== "Handler" && !declaredNames.has(handler) && !inScope.has(handler)) {
        issues.push(`method '${fn.name}' subscribes to undeclared callback '${handler}'`);
      }
    }
  }

  return issues;
}

function collectDeclaredNames(mod: VerseModule): Set<string> {
  const names = new Set<string>();
  for (const decl of mod.declarations) {
    names.add(decl.name);
    if (decl.kind === "class") {
      for (const f of decl.fields) names.add(f.name);
      for (const m of decl.methods) names.add(m.name);
    }
  }
  return names;
}

export type { VerseClass };
