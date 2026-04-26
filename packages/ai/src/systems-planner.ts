import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
import { generateValidated, applyNormalizers, type RepairPolicy } from "./structured-output.js";
import { withKnowledgeContext } from "./prompt-context.js";
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
      purpose: z.string().default(""),
      channels: z
        .object({
          listens: z.array(z.string()).default([]),
          transmits: z.array(z.string()).default([]),
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

const EconomyAndRules = z.object({
  currencies: SystemsDesign.shape.economy.shape.currencies,
  generators: SystemsDesign.shape.economy.shape.generators,
  sinks: SystemsDesign.shape.economy.shape.sinks,
  gameRules: SystemsDesign.shape.gameRules,
});

const ECONOMY_REPAIR_POLICY: RepairPolicy = {
  enumAliases: {
    "generators.*.rateUnit": {
      per_log: "per_action", per_item: "per_action", per_hit: "per_action",
      per_kill: "per_action", per_harvest: "per_action", per_click: "per_action",
      per_second_per_level: "per_second", per_tick: "per_second",
      per_prestige: "per_action",
    },
    "sinks.*.type": {
      item_purchase: "purchase", buy: "purchase",
      zone_unlock: "unlock", area_unlock: "unlock",
      prestige_upgrade: "prestige", rebirth: "prestige",
    },
  },
  numberFields: ["generators.*.baseRate", "sinks.*.cost"],
  maxRepairPasses: 3,
};

const ECONOMY_PROMPT = `You are a UEFN economy designer. Design ONLY the economy and game rules.

Return ONLY valid JSON:
{
  "currencies": [{ "currencyId": "gold", "name": "Gold", "icon": "🪙", "persistent": true }],
  "generators": [{
    "sourceId": "gen_1", "name": "Tree Chopping", "currencyId": "gold",
    "baseRate": 10, "rateUnit": "per_action", "zoneId": "zone_1"
  }],
  "sinks": [{
    "sinkId": "sink_1", "name": "Sawmill Upgrade", "currencyId": "gold",
    "cost": 100, "type": "upgrade", "repeatable": false
  }],
  "gameRules": [{
    "ruleId": "rule_1", "description": "When player sells logs, grant gold",
    "trigger": "SellTrigger.Activated", "action": "GrantCurrency(gold, amount)"
  }]
}

rateUnit MUST be exactly one of: per_action, per_second, per_minute
sink type MUST be exactly one of: purchase, upgrade, unlock, prestige
sink cost MUST be a single number (e.g. 100), NEVER an array

Rules:
- Upgrade costs should escalate (1.5x-2.5x multiplier per tier)
- For tycoon: first purchase achievable in 45-90 seconds`;

const DEVICES_PROMPT = `You are a UEFN device planner. Given zones and an economy, list the devices needed.

Return ONLY a valid JSON array:
[{
  "id": "dev_1", "type": "trigger", "label": "Sell Trigger",
  "zoneId": "zone_1", "purpose": "sells items for gold"
}]

Each zone should have at least 1 device. Use types like: trigger, button, item_granter, item_spawner, barrier, tracker, score_manager, hud_message, timer, spawn_pad, teleporter.`;

export class SystemsPlanner {
  constructor(private llm: LLMAdapter, private knowledgeContext = "") {}

  async plan(
    brief: NormalizedBrief,
    worldDesign: WorldDesign,
    template: TemplateDefinition,
  ): Promise<SystemsDesign> {
    const zoneInfo = worldDesign.zones
      .map((z) => `- ${z.zoneId}: "${z.name}" (${z.purpose}, tier ${z.tier})`)
      .join("\n");

    const sharedContext = `Genre: ${brief.genre}
Core Loop: ${brief.coreLoop.join(" → ")}
Session: ${brief.sessionLengthMin} min
Key Features: ${brief.keyFeatures.join(", ")}
Zones:\n${zoneInfo}`;

    // Call 1: Economy + Rules (with repair loop)
    const econResult = await generateValidated({
      llm: this.llm,
      stage: "SystemsPlanner:Economy",
      schema: EconomyAndRules,
      messages: [
        { role: "system", content: withKnowledgeContext(ECONOMY_PROMPT, this.knowledgeContext) },
        { role: "user", content: `Design economy and rules for:\n\n${sharedContext}\n\nTemplate systems: ${template.systemModules.required.join(", ")}` },
      ],
      temperature: 0.3,
      repairPolicy: ECONOMY_REPAIR_POLICY,
    });

    // Call 2: Devices (manual handling for array unwrapping)
    const currencyNames = econResult.currencies.map((c) => c.name).join(", ");
    const devResponse = await this.llm.chat(
      [
        { role: "system", content: withKnowledgeContext(DEVICES_PROMPT, this.knowledgeContext) },
        { role: "user", content: `Place devices for:\n\n${sharedContext}\nCurrencies: ${currencyNames}\nAllowed types: ${template.devicePolicies.allowedDeviceTypes.join(", ")}\nRequired types: ${template.devicePolicies.requiredDeviceTypes.join(", ")}` },
      ],
      { temperature: 0.3, jsonMode: true },
    );

    let devices = parseJsonResponse(devResponse.content, "SystemsPlanner:Devices");
    if (devices && typeof devices === "object" && !Array.isArray(devices)) {
      const obj = devices as Record<string, unknown>;
      if (Array.isArray(obj.devices)) {
        devices = obj.devices;
      } else {
        const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
        if (arrayKey) {
          const arr = obj[arrayKey] as unknown[];
          const nested = arr.flatMap((item) => {
            if (item && typeof item === "object" && "devices" in item && Array.isArray((item as Record<string, unknown>).devices)) {
              return (item as Record<string, unknown>).devices as unknown[];
            }
            return [item];
          });
          devices = nested;
        }
      }
    }
    devices = applyNormalizers(devices);

    return SystemsDesign.parse({
      economy: {
        currencies: econResult.currencies,
        generators: econResult.generators,
        sinks: econResult.sinks,
      },
      devices,
      gameRules: econResult.gameRules,
    });
  }
}
