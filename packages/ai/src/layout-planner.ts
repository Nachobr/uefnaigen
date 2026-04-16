import { z } from "zod";
import { LayoutSpec } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import type { WorldDesign } from "./world-planner.js";

const SYSTEM_PROMPT = `You are a UEFN layout planner. Given a world design, generate concrete spatial coordinates for each zone.

Return ONLY valid JSON matching this schema:
{
  "worldType": "grid2d" | "hub_and_spoke" | "lane" | "open_world_zones",
  "bounds": { "width": number, "depth": number, "height": number },
  "zones": [
    {
      "zoneId": "zone_1",
      "name": "Zone Name",
      "purpose": "starter_area|resource_area|combat_area|shop|upgrade_lane|boss_area|social_hub|unlock_gate",
      "footprint": { "x": number, "y": number, "w": number, "h": number },
      "elevation": 0
    }
  ],
  "spawnPoints": [
    { "id": "sp_1", "location": { "x": number, "y": number, "z": number }, "zoneId": "zone_1" }
  ]
}

Rules:
- Use UEFN-scale coordinates (1 unit = 1 cm, typical zones are 2000-5000 units wide)
- Zones must NOT overlap
- Starter area should be near spawn points
- Higher-tier zones should be further from spawn
- Hub-and-spoke: central hub with zones radiating outward
- Grid2d: zones arranged in a grid pattern
- Include at least 1 spawn point in the starter area
- Total bounds should encompass all zones with some margin`;

export class LayoutPlanner {
  constructor(private llm: LLMAdapter) {}

  async plan(design: WorldDesign, layoutStyle: string): Promise<LayoutSpec> {
    const userMsg = `Generate a spatial layout for this world design:

Map: ${design.mapName}
Theme: ${design.theme}
Layout Style: ${layoutStyle}

Zones (${design.zones.length} total):
${design.zones.map((z) => `- ${z.zoneId}: "${z.name}" (${z.purpose}, tier ${z.tier})`).join("\n")}

Core loop: ${design.coreLoop.join(" → ")}`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, jsonMode: true },
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error(`Failed to parse LayoutPlanner response as JSON`);
      }
    }

    return LayoutSpec.parse(parsed);
  }
}
