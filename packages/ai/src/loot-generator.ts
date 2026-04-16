import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import type { NormalizedBrief } from "./intent-extractor.js";
import type { WorldDesign } from "./world-planner.js";

export const LootTable = z.object({
  tableId: z.string(),
  name: z.string(),
  zoneId: z.string().optional(),
  entries: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      weight: z.number(),
      rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
      effect: z.string().optional(),
    }),
  ),
});
export type LootTable = z.infer<typeof LootTable>;

export const LootTablesResult = z.object({
  tables: z.array(LootTable),
});
export type LootTablesResult = z.infer<typeof LootTablesResult>;

const SYSTEM_PROMPT = `You are a UEFN loot table designer. Generate balanced loot tables for a game.

Return ONLY valid JSON:
{
  "tables": [
    {
      "tableId": "loot_zone_1",
      "name": "Pine Forest Drops",
      "zoneId": "zone_1",
      "entries": [
        { "itemId": "item_1", "name": "Small Log", "weight": 60, "rarity": "common", "effect": "+5 gold" },
        { "itemId": "item_2", "name": "Golden Log", "weight": 5, "rarity": "rare", "effect": "+50 gold" }
      ]
    }
  ]
}

Rules:
- Weights should sum to ~100 per table
- Higher-tier zones should have better loot
- Rarity distribution: ~60% common, ~25% uncommon, ~10% rare, ~4% epic, ~1% legendary
- Each zone with resources should have its own loot table`;

export class LootGenerator {
  constructor(private llm: LLMAdapter) {}

  async generate(
    brief: NormalizedBrief,
    worldDesign: WorldDesign,
  ): Promise<LootTable[]> {
    const userMsg = `Generate loot tables for:

Genre: ${brief.genre}
Zones:
${worldDesign.zones.map((z) => `- ${z.zoneId}: "${z.name}" (${z.purpose}, tier ${z.tier})`).join("\n")}

Key Features: ${brief.keyFeatures.join(", ")}
Create 1 loot table per resource zone, plus 1 global rare drops table.`;

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
        throw new Error("Failed to parse LootGenerator response as JSON");
      }
    }

    const result = LootTablesResult.parse(parsed);
    return result.tables;
  }
}
