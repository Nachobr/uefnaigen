import { EconomySpec } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
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

export class BalancePlanner {
  constructor(private llm: LLMAdapter) {}

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

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, jsonMode: true },
    );

    const parsed = parseJsonResponse(response.content, "BalancePlanner");

    return EconomySpec.parse(parsed);
  }
}
