/**
 * Checks emitted Verse code for UEFN memory anti-patterns.
 *
 * Rules derived from:
 * - https://dev.epicgames.com/documentation/fortnite/memory-management-in-unreal-editor-for-fortnite
 * - https://dev.epicgames.com/documentation/fortnite/using-persistable-data-in-verse
 * - https://dev.epicgames.com/documentation/fortnite/verse-persistence-best-practices
 */

export type Severity = "error" | "warning";

export interface MemoryIssue {
  line: number;
  severity: Severity;
  rule: string;
  message: string;
  fix?: string;
}

export interface MemoryCheckResult {
  issues: MemoryIssue[];
  weakMapCount: number;
}

const PERSISTABLE_KEY_TYPES = new Set([
  "player",
]);

const LIGHTWEIGHT_VALUE_TYPES = new Set([
  "int", "float", "logic", "string", "char8", "char32",
  "color", "vector2", "vector2i", "vector3",
]);

interface Rule {
  id: string;
  check: (lines: string[], issues: MemoryIssue[]) => void;
}

const rules: Rule[] = [
  {
    id: "weak-map-non-player-key",
    check(lines, issues) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/weak_map\s*\(\s*(\w+)\s*,/);
        if (match && !PERSISTABLE_KEY_TYPES.has(match[1])) {
          issues.push({
            line: i + 1,
            severity: "error",
            rule: "weak-map-non-player-key",
            message: `weak_map key type "${match[1]}" is not allowed. Only "player" is a valid key type for module-scoped weak_map.`,
            fix: `Use weak_map(player, ...) with player as the key type.`,
          });
        }
      }
    },
  },
  {
    id: "weak-map-heavy-value",
    check(lines, issues) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/weak_map\s*\(\s*\w+\s*,\s*(\w+)\s*\)/);
        if (!match) continue;
        const valueType = match[1];
        if (LIGHTWEIGHT_VALUE_TYPES.has(valueType)) continue;
        if (valueType === "player" || valueType === "agent") {
          issues.push({
            line: i + 1,
            severity: "error",
            rule: "weak-map-heavy-value",
            message: `weak_map value type "${valueType}" stores a runtime reference that is not persistable and wastes memory. Use an enum or int identifier instead.`,
            fix: `Replace with a lightweight persistable type (int, enum, or a <persistable> class).`,
          });
        }
      }
    },
  },
  {
    id: "weak-map-limit",
    check(lines, issues) {
      let count = 0;
      const mapLines: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (/var\s+\w+\s*:\s*weak_map\s*\(/.test(lines[i])) {
          count++;
          mapLines.push(i + 1);
        }
      }
      if (count > 4) {
        issues.push({
          line: mapLines[4],
          severity: "error",
          rule: "weak-map-limit",
          message: `Module declares ${count} weak_map variables but UEFN allows a maximum of 4 per island.`,
          fix: `Consolidate player data into fewer weak_map variables using a <persistable> class.`,
        });
      }
    },
  },
  {
    id: "persistable-class-missing-specifiers",
    check(lines, issues) {
      for (let i = 0; i < lines.length; i++) {
        const classMatch = lines[i].match(/^(\w+)\s*:=\s*class\s*(<[^>]*>)?\s*:/);
        if (!classMatch) continue;
        const className = classMatch[1];
        const specifiers = classMatch[2] ?? "";

        let usedInWeakMap = false;
        for (const line of lines) {
          if (line.includes(`weak_map`) && line.includes(className)) {
            usedInWeakMap = true;
            break;
          }
        }
        if (!usedInWeakMap) continue;

        if (!specifiers.includes("persistable")) {
          issues.push({
            line: i + 1,
            severity: "error",
            rule: "persistable-class-missing-specifiers",
            message: `Class "${className}" is used as a weak_map value but lacks the <persistable> specifier.`,
            fix: `Add <final><persistable> specifiers to the class definition.`,
          });
        }
        if (!specifiers.includes("final")) {
          issues.push({
            line: i + 1,
            severity: "warning",
            rule: "persistable-class-missing-specifiers",
            message: `Persistable class "${className}" should have the <final> specifier (persistable classes cannot have subclasses).`,
            fix: `Add <final> to the class specifiers.`,
          });
        }
      }
    },
  },
  {
    id: "persistable-class-has-var",
    check(lines, issues) {
      let inPersistableClass = false;
      let className = "";
      for (let i = 0; i < lines.length; i++) {
        const classMatch = lines[i].match(/^(\w+)\s*:=\s*class\s*<[^>]*persistable[^>]*>\s*:/);
        if (classMatch) {
          inPersistableClass = true;
          className = classMatch[1];
          continue;
        }
        if (inPersistableClass && /^\S/.test(lines[i]) && lines[i].trim() !== "") {
          inPersistableClass = false;
        }
        if (inPersistableClass && /^\s+var\s+/.test(lines[i])) {
          issues.push({
            line: i + 1,
            severity: "error",
            rule: "persistable-class-has-var",
            message: `Persistable class "${className}" contains a "var" member. Persistable classes cannot have variable members.`,
            fix: `Remove "var" keyword. Persistable class fields must be immutable; update by creating a new instance.`,
          });
        }
      }
    },
  },
  {
    id: "missing-fits-check",
    check(lines, issues) {
      let hasWeakMap = false;
      let hasDynamicAdd = false;
      let hasFitsCheck = false;
      let setLine = 0;

      for (let i = 0; i < lines.length; i++) {
        if (/weak_map\s*\(/.test(lines[i])) hasWeakMap = true;
        if (/set\s+\w+\s*\[\s*\w+\s*\]\s*=/.test(lines[i]) && !setLine) {
          hasDynamicAdd = true;
          setLine = i + 1;
        }
        if (/FitsInPlayerMap/i.test(lines[i])) hasFitsCheck = true;
      }

      if (hasWeakMap && hasDynamicAdd && !hasFitsCheck) {
        issues.push({
          line: setLine,
          severity: "warning",
          rule: "missing-fits-check",
          message: `weak_map data is updated without checking FitsInPlayerMap. Records exceeding 256KB will cause runtime errors.`,
          fix: `Call FitsInPlayerMap() before saving to verify the data fits within the 256KB limit.`,
        });
      }
    },
  },
  {
    id: "large-array-in-persistable",
    check(lines, issues) {
      let inPersistableClass = false;
      for (let i = 0; i < lines.length; i++) {
        if (/class\s*<[^>]*persistable[^>]*>\s*:/.test(lines[i])) {
          inPersistableClass = true;
          continue;
        }
        if (inPersistableClass && /^\S/.test(lines[i]) && lines[i].trim() !== "") {
          inPersistableClass = false;
        }
        if (inPersistableClass && /\[\]\s*\w+/.test(lines[i])) {
          issues.push({
            line: i + 1,
            severity: "warning",
            rule: "large-array-in-persistable",
            message: `Unbounded array in persistable class. Large arrays can approach the 256KB per-player limit.`,
            fix: `Consider capping the array size or using FitsInPlayerMap() before saving.`,
          });
        }
      }
    },
  },
];

export function checkVerseMemory(code: string): MemoryCheckResult {
  const lines = code.split("\n");
  const issues: MemoryIssue[] = [];

  for (const rule of rules) {
    rule.check(lines, issues);
  }

  let weakMapCount = 0;
  for (const line of lines) {
    if (/var\s+\w+\s*:\s*weak_map\s*\(/.test(line)) {
      weakMapCount++;
    }
  }

  issues.sort((a, b) => a.line - b.line);
  return { issues, weakMapCount };
}
