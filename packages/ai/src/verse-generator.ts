import { VerseModule } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { generateValidated } from "./structured-output.js";
import { withKnowledgeContext } from "./prompt-context.js";
import type { ModulePlan } from "./verse-planner.js";

const SYSTEM_PROMPT = `You are a UEFN Verse code generator. Given a module plan, generate a Verse AST as JSON.

Return ONLY valid JSON matching this VerseModule schema:
{
  "kind": "module",
  "name": "ModuleName",
  "imports": [{ "kind": "import", "path": "/Fortnite.com/Devices" }],
  "declarations": [
    {
      "kind": "class",
      "name": "snake_case_class_name",
      "extends": "creative_device",
      "fields": [
        { "kind": "field", "name": "FieldName", "type": "device_type", "editable": true,
          "defaultValue": { "kind": "expression", "code": "device_type{}" } }
      ],
      "methods": [
        {
          "kind": "function",
          "name": "OnBegin",
          "params": [],
          "returnType": "void",
          "attributes": ["override", "suspends"],
          "body": [
            { "kind": "statement", "code": "SomeDevice.SomeEvent.Subscribe(Handler)" },
            { "kind": "statement", "code": "if (Player := player[Agent]):" },
            { "kind": "statement", "code": "    Print(\\"Hello\\")" }
          ]
        }
      ]
    }
  ]
}

CRITICAL body[] rules:
- Every item in a method "body" array MUST be exactly { "kind": "statement", "code": "<one line of raw Verse code as a string>" }.
- NEVER use other kinds inside body[] (no "if", "for", "while", "expression", "block", etc.).
- Encode control flow as raw Verse strings inside "code". Use indentation inside the string (Verse is indentation-sensitive).
- Each statement is one logical line. Multi-line constructs become multiple statement entries with proper Verse indentation in the "code" string.

Verse rules:
- Class names use snake_case
- Method/field names use PascalCase
- @editable fields need defaultValue with empty constructor e.g. "trigger_device{}"
- OnBegin is override+suspends, returns void
- Player lookups use failable: if (Player := player[Agent]):
- Map access is failable: if (Value := MyMap[Key]):
- Use "var" for mutable fields, omit for @editable
- Common imports: /Fortnite.com/Devices, /Verse.org/Simulation, /UnrealEngine.com/Temporary/SpatialMath`;

export class VerseGenerator {
  constructor(private llm: LLMAdapter, private knowledgeContext = "") { }

  async generate(modulePlan: ModulePlan["modules"][number]): Promise<VerseModule> {
    const userMsg = `Generate a Verse AST for this module:

Module: ${modulePlan.moduleName}
Class: ${modulePlan.className}
Extends: ${modulePlan.extends}
Purpose: ${modulePlan.purpose}

Editable fields:
${modulePlan.editableFields.map((f) => `- ${f.name}: ${f.type}${f.deviceId ? ` (ref: ${f.deviceId})` : ""}`).join("\n")}

Methods:
${modulePlan.methods.map((m) => `- ${m.name}(${m.params?.join(", ") ?? ""}): ${m.returnType ?? "void"} [${m.attributes?.join(", ") ?? ""}] — ${m.purpose}`).join("\n")}

Imports: ${modulePlan.imports.join(", ")}

Generate complete method bodies with real Verse logic. Use proper failable patterns for player lookups and map access. Remember: every body[] item must be { "kind": "statement", "code": "..." }.`;

    return generateValidated({
      llm: this.llm,
      stage: "VerseGenerator",
      schema: VerseModule,
      messages: [
        { role: "system", content: withKnowledgeContext(SYSTEM_PROMPT, this.knowledgeContext) },
        { role: "user", content: userMsg },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      normalize: normalizeVerseModule,
    });
  }
}

/**
 * Coerce common LLM mistakes in a VerseModule candidate before schema validation.
 *
 * Specifically, items inside method body[] arrays must be { kind: "statement", code: string }.
 * Models like qwen often emit { kind: "if", ... } or { kind: "expression", code: ... } inside
 * body[]; we collapse those into statement entries with the original code (or a serialized form).
 */
export function normalizeVerseModule(data: unknown): unknown {
  if (!isObject(data)) return data;

  const decls = (data as Record<string, unknown>).declarations;
  if (!Array.isArray(decls)) return data;

  for (const decl of decls) {
    if (!isObject(decl)) continue;
    const methods = (decl as Record<string, unknown>).methods;
    if (Array.isArray(methods)) {
      for (const method of methods) normalizeFunction(method);
    }
    // Top-level function declaration (kind === "function")
    if ((decl as Record<string, unknown>).kind === "function") {
      normalizeFunction(decl);
    }
  }
  return data;
}

function normalizeFunction(fn: unknown): void {
  if (!isObject(fn)) return;
  const body = (fn as Record<string, unknown>).body;
  if (!Array.isArray(body)) return;
  (fn as Record<string, unknown>).body = body
    .map(coerceStatement)
    .filter((s): s is { kind: "statement"; code: string } => s !== null);
}

function coerceStatement(item: unknown): { kind: "statement"; code: string } | null {
  if (typeof item === "string") {
    return { kind: "statement", code: item };
  }
  if (!isObject(item)) return null;
  const obj = item as Record<string, unknown>;
  const code = typeof obj.code === "string" ? obj.code : null;
  if (code !== null) {
    return { kind: "statement", code };
  }
  // Fallback: serialize unknown structures so we don't drop the model's intent silently
  const serialized = JSON.stringify(obj);
  if (serialized && serialized !== "{}") {
    return { kind: "statement", code: `// TODO: ${serialized}` };
  }
  return null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
