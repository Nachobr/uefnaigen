import { EconomySpec } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { generateValidated, type RepairPolicy } from "./structured-output.js";
import { withKnowledgeContext } from "./prompt-context.js";
import type { NormalizedBrief } from "./intent-extractor.js";
import type { SystemsDesign } from "./systems-planner.js";

const SYSTEM_PROMPT = `You are a UEFN economy balancer. Given a systems design, produce balanced economy tables.

Return ONLY valid JSON matching this EconomySpec schema:
{
  "currencies": [{ "currencyId": "gold", "name": "Gold", "persistent": true }],
  "generators": [{
    "sourceId": "gen_1", "name": "Tree Chopping", "currencyId": "gold",
    "baseRate": 10, "rateUnit": "per_action"
  }],
  "sinks": [{
    "sinkId": "sink_1", "name": "Sawmill Upgrade", "currencyId": "gold",
    "cost": 100, "type": "upgrade", "repeatable": false
  }],
  "targetCurves": {
    "timeToFirstUpgradeSec": 60,
    "timeToAutomationMin": 6,
    "timeToPrestigeMin": 20
  }
}

Target pace bands for tycoon:
- First reward: < 30 seconds
- First purchase: 45-90 seconds
- Automation unlock: 5-8 minutes
- First prestige: 15-25 minutes
- Late-game stagnation: < 3 minutes

Rules:
- Costs should escalate exponentially (1.5x-2.5x per tier)
- Income rates should increase with upgrades but not outpace sinks
- Prestige cost should require ~15-25 min of optimal play
- Balance for the specified session length`;

const BALANCE_REPAIR_POLICY: RepairPolicy = {
  enumAliases: {
    "generators.*.rateUnit": {
      per_log: "per_action", per_item: "per_action", per_hit: "per_action",
      per_kill: "per_action", per_harvest: "per_action", per_click: "per_action",
      per_tick: "per_second",
    },
    "sinks.*.type": {
      item_purchase: "purchase", buy: "purchase",
      zone_unlock: "unlock", area_unlock: "unlock",
      rebirth: "prestige",
    },
  },
  numberFields: ["sinks.*.cost", "generators.*.baseRate"],
  maxRepairPasses: 3,
};

export class BalancePlanner {
  constructor(private llm: LLMAdapter, private knowledgeContext = "") {}

  async plan(
    brief: NormalizedBrief,
    systemsDesign: SystemsDesign,
  ): Promise<EconomySpec> {
    const userMsg = `Balance the economy for:

Genre: ${brief.genre}
Session: ${brief.sessionLengthMin} min
Core Loop: ${brief.coreLoop.join(" → ")}

Currencies: ${systemsDesign.economy.currencies.map((c) => c.name).join(", ")}
Generators: ${systemsDesign.economy.generators.map((g) => `${g.name} (${g.baseRate}/${g.rateUnit})`).join(", ")}
Sinks: ${systemsDesign.economy.sinks.map((s) => `${s.name} ($${s.cost}, ${s.type})`).join(", ")}

Produce a balanced EconomySpec with proper targetCurves.`;

    return generateValidated({
      llm: this.llm,
      stage: "BalancePlanner",
      schema: EconomySpec,
      messages: [
        { role: "system", content: withKnowledgeContext(SYSTEM_PROMPT, this.knowledgeContext) },
        { role: "user", content: userMsg },
      ],
      temperature: 0.2,
      repairPolicy: BALANCE_REPAIR_POLICY,
    });
  }
}
