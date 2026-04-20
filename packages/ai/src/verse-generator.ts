import { VerseModule } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
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
          "body": [{ "kind": "statement", "code": "SomeDevice.SomeEvent.Subscribe(Handler)" }]
        }
      ]
    }
  ]
}

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
  constructor(private llm: LLMAdapter) {}

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

Generate complete method bodies with real Verse logic. Use proper failable patterns for player lookups and map access.`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, maxTokens: 4096, jsonMode: true },
    );

    const parsed = parseJsonResponse(response.content, "VerseGenerator");

    return VerseModule.parse(parsed);
  }
}
