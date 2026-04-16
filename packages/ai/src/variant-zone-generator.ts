import { z } from "zod";
import { VariantZone } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import type { WorldDesign } from "./world-planner.js";

const VariantZonesResult = z.object({
  variantZones: z.array(VariantZone),
});

const SYSTEM_PROMPT = `You are a UEFN variant zone designer. Generate variant zone configurations that create replayability by randomizing zone appearances each match.

Return ONLY valid JSON:
{
  "variantZones": [
    {
      "zoneId": "zone_2",
      "selectionMode": "one_of_n",
      "variants": [
        { "variantId": "forest_dense", "prefabIds": ["pfb_pine_tree_01"], "weight": 40 },
        { "variantId": "forest_sparse", "prefabIds": ["pfb_oak_tree_01"], "weight": 35 },
        { "variantId": "ruins", "prefabIds": ["pfb_rock_cluster_01"], "weight": 25 }
      ],
      "runtimeSeedSource": "session_seed"
    }
  ]
}

Rules:
- Only create variants for resource/combat zones (not starter or shop)
- 2-4 variants per zone
- Weights should sum to ~100
- selectionMode: "one_of_n" for most, "weighted_pool" for loot-heavy zones
- runtimeSeedSource: "session_seed" for per-match variety
- Each variant should feel thematically distinct`;

export class VariantZoneGenerator {
  constructor(private llm: LLMAdapter) {}

  async generate(worldDesign: WorldDesign): Promise<VariantZone[]> {
    const eligibleZones = worldDesign.zones.filter(
      (z) => z.purpose === "resource_area" || z.purpose === "combat_area",
    );

    if (eligibleZones.length === 0) return [];

    const userMsg = `Generate variant zones for these zones:

${eligibleZones.map((z) => `- ${z.zoneId}: "${z.name}" (${z.purpose}, tier ${z.tier}) — ${z.description}`).join("\n")}

Create 2-4 thematic variants per zone with appropriate prefab references.`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.4, jsonMode: true },
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse VariantZoneGenerator response");
      }
    }

    return VariantZonesResult.parse(parsed).variantZones;
  }
}
