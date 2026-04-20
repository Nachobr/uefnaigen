import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
import type { SystemsDesign } from "./systems-planner.js";
import type { DeviceInstance, TemplateDefinition } from "@forgeai/schemas";

export const ModulePlan = z.object({
  modules: z.array(
    z.object({
      moduleName: z.string(),
      className: z.string(),
      extends: z.string().default("creative_device"),
      purpose: z.string(),
      editableFields: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          deviceId: z.string().optional(),
        }),
      ),
      methods: z.array(
        z.object({
          name: z.string(),
          purpose: z.string(),
          params: z.array(z.string()).optional(),
          returnType: z.string().optional(),
          attributes: z.array(z.string()).optional(),
        }),
      ),
      imports: z.array(z.string()),
      dependsOn: z.array(z.string()).optional(),
    }),
  ),
});
export type ModulePlan = z.infer<typeof ModulePlan>;

const SYSTEM_PROMPT = `You are a UEFN Verse module planner. Given systems, devices, and a template, plan the Verse module structure.

Return ONLY valid JSON matching this schema:
{
  "modules": [
    {
      "moduleName": "EconomyManager",
      "className": "tycoon_economy_manager",
      "extends": "creative_device",
      "purpose": "Tracks player currencies and handles transactions",
      "editableFields": [
        { "name": "SellTrigger", "type": "trigger_device", "deviceId": "dev_sell_trigger" }
      ],
      "methods": [
        {
          "name": "OnBegin",
          "purpose": "Subscribe to device events on game start",
          "params": [],
          "returnType": "void",
          "attributes": ["override", "suspends"]
        },
        {
          "name": "HandleSell",
          "purpose": "Grant currency when player sells resources",
          "params": ["Agent:agent"],
          "returnType": "void"
        }
      ],
      "imports": ["/Fortnite.com/Devices", "/Verse.org/Simulation"],
      "dependsOn": ["GameManager"]
    }
  ]
}

Rules:
- Each module maps to one Verse file and one creative_device class
- Use @editable fields for device references
- OnBegin is the main entry point (override, suspends)
- Keep modules focused: one responsibility each
- Include all required modules from the template
- Class names use snake_case (Verse convention)
- Method names use PascalCase (Verse convention)`;

export class VersePlanner {
  constructor(private llm: LLMAdapter) {}

  async plan(
    systemsDesign: SystemsDesign,
    devices: DeviceInstance[],
    template: TemplateDefinition,
  ): Promise<ModulePlan> {
    const deviceSummary = devices
      .map((d) => `${d.id}: ${d.type} "${d.label}" in ${d.zoneId ?? "global"}`)
      .join("\n");

    const userMsg = `Plan Verse modules for this game:

Required modules: ${template.verseModules.required.join(", ")}
Optional modules: ${template.verseModules.optional.join(", ")}

Devices (${devices.length} total):
${deviceSummary}

Economy:
- Currencies: ${systemsDesign.economy.currencies.map((c) => c.name).join(", ")}
- Generators: ${systemsDesign.economy.generators.map((g) => g.name).join(", ")}
- Sinks: ${systemsDesign.economy.sinks.map((s) => `${s.name} (${s.type})`).join(", ")}

Game Rules:
${systemsDesign.gameRules.map((r) => `- ${r.description}`).join("\n")}

Plan ALL required modules and any relevant optional modules.`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, maxTokens: 8192, jsonMode: true },
    );

    const parsed = parseJsonResponse(response.content, "VersePlanner");

    return ModulePlan.parse(parsed);
  }
}
