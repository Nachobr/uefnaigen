/**
 * Post-processor that fixes common LLM-generated Verse syntax errors.
 * Runs after the emitter, before writing to disk.
 */

interface LintFix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const FIXES: LintFix[] = [
  // Comments: // → #
  {
    pattern: /^(\s*)\/\/(.*)$/gm,
    replacement: "$1#$2",
    description: "Use # for line comments, not //",
  },
  // Negation: !expr → not expr
  {
    pattern: /!(\w)/g,
    replacement: "not $1",
    description: "Use 'not' instead of '!' for negation",
  },
  // Mutation: X += Y → set X += Y (only when 'set' not already present)
  {
    pattern: /^(\s+)(?!set\s)(\w[\w.]*)\s*(\+=|-=|\*=|\/=)\s*/gm,
    replacement: "$1set $2 $3 ",
    description: "Use 'set' before compound assignment operators",
  },
  // Mutation: X = Y → set X = Y (for var assignments, not declarations)
  // Only match lines where there's no := (declaration) and no var/let keyword
  {
    pattern: /^(\s+)(?!set\s|var\s|let\s|if\s|for\s|return|#)(\w[\w.]*)\s*=\s+(?!=)/gm,
    replacement: "$1set $2 = ",
    description: "Use 'set' before assignment to mutable variables",
  },
  // Boolean: true/false → true/false (Verse uses lowercase, but check for True/False)
  {
    pattern: /\bTrue\b/g,
    replacement: "true",
    description: "Use lowercase 'true'",
  },
  {
    pattern: /\bFalse\b/g,
    replacement: "false",
    description: "Use lowercase 'false'",
  },
  // Null: null → false (Verse has no null)
  {
    pattern: /\bnull\b/g,
    replacement: "false",
    description: "Verse has no null, use false or option type",
  },
  // != → <> (Verse uses <> for not-equal)
  {
    pattern: /\s!=\s/g,
    replacement: " <> ",
    description: "Use '<>' instead of '!=' for not-equal",
  },
  // && → and
  {
    pattern: /\s&&\s/g,
    replacement: " and ",
    description: "Use 'and' instead of '&&'",
  },
  // || → or
  {
    pattern: /\s\|\|\s/g,
    replacement: " or ",
    description: "Use 'or' instead of '||'",
  },
  // void → void (already correct, but catch Void)
  {
    pattern: /\bVoid\b/g,
    replacement: "void",
    description: "Use lowercase 'void'",
  },
  // Remove semicolons at end of statements
  {
    pattern: /;(\s*)$/gm,
    replacement: "$1",
    description: "Verse does not use semicolons",
  },
];

export interface LintResult {
  code: string;
  fixesApplied: string[];
}

export function lintVerseCode(code: string): LintResult {
  let result = code;
  const fixesApplied: string[] = [];

  for (const fix of FIXES) {
    const before = result;
    result = result.replace(fix.pattern, fix.replacement);
    if (result !== before) {
      fixesApplied.push(fix.description);
    }
  }

  return { code: result, fixesApplied };
}
