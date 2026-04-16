import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import type { NormalizedBrief } from "./intent-extractor.js";
import type { WorldDesign } from "./world-planner.js";
import type { TemplateDefinition } from "@forgeai/schemas";

export const SystemsDesign = z.object({
  economy: z.object({
    currencies: z.array(
      z.object({
        currencyId: z.string(),
        name: z.string(),
        icon: z.string().optional(),
        persistent: z.boolean(),
      }),
    ),
    generators: z.array(
      z.object({
        sourceId: z.string(),
        name: z.string(),
        currencyId: z.string(),
        baseRate: z.number(),
        rateUnit: z.enum(["per_action", "per_second", "per_minute"]),
        zoneId: z.string().optional(),
      }),
    ),
    sinks: z.array(
      z.object({
        sinkId: z.string(),
        name: z.string(),
        currencyId: z.string(),
        cost: z.number(),
        type: z.enum(["purchase", "upgrade", "unlock", "prestige"]),
        repeatable: z.boolean(),
      }),
    ),
  }),
  devices: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      zoneId: z.string(),
      purpose: z.string(),
      channels: z
        .object({
          listens: z.array(z.string()),
          transmits: z.array(z.string()),
        })
        .optional(),
    }),
  ),
  gameRules: z.array(
    z.object({
      ruleId: z.string(),
      description: z.string(),
      trigger: z.string(),
      action: z.string(),
    }),
  ),
});
export type SystemsDesign = z.infer<typeof SystemsDesign>;

const SYSTEM_PROMPT = `You are a UEFN systems designer. Given a world design and template, design the game systems: economy, devices, and rules.

Return ONLY valid JSON matching this schema:
{
  "economy": {
    "currencies": [{ "currencyId": "gold", "name": "Gold", "icon": "🪙", "persistent": true }],
    "generators": [{
      "sourceId": "gen_1", "name": "Tree Chopping", "currencyId": "gold",
      "baseRate": 10, "rateUnit": "per_action", "zoneId": "zone_1"
    }],
    "sinks": [{
      "sinkId": "sink_1", "name": "Sawmill Upgrade", "currencyId": "gold",
      "cost": 100, "type": "upgrade", "repeatable": false
    }]
  },
  "devices": [{
    "id": "dev_1", "type": "trigger|button|tracker|barrier|...",
    "label": "Sell Trigger", "zoneId": "zone_1", "purpose": "what this device does",
    "channels": { "listens": ["ch_1"], "transmits": ["ch_2"] }
  }],
  "gameRules": [{
    "ruleId": "rule_1", "description": "When player sells logs, grant gold",
    "trigger": "SellTrigger.Activated", "action": "GrantCurrency(gold, amount)"
  }]
}

Rules:
- Each zone should have at least 1 device
- Economy should have clear income sources and sinks
- Upgrade costs should escalate (1.5x-2.5x multiplier per tier)
- Include devices for: selling, purchasing upgrades, zone unlocks, barriers
- For tycoon: first purchase achievable in 45-90 seconds of gathering`;

export class SystemsPlanner {
  constructor(private llm: LLMAdapter) {}

  async plan(
    brief: NormalizedBrief,
    worldDesign: WorldDesign,
    template: TemplateDefinition,
  ): Promise<SystemsDesign> {
    const userMsg = `Design game systems for:

Genre: ${brief.genre}
Core Loop: ${brief.coreLoop.join(" → ")}
Session: ${brief.sessionLengthMin} min
Key Features: ${brief.keyFeatures.join(", ")}

World Design:
${worldDesign.zones.map((z) => `- ${z.zoneId}: "${z.name}" (${z.purpose}, tier ${z.tier})`).join("\n")}

Template required systems: ${template.systemModules.required.join(", ")}
Allowed device types: ${template.devicePolicies.allowedDeviceTypes.join(", ")}
Required device types: ${template.devicePolicies.requiredDeviceTypes.join(", ")}`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.3, jsonMode: true },
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse SystemsPlanner response as JSON");
      }
    }

    return SystemsDesign.parse(parsed);
  }
}
