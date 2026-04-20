import { z } from "zod";
import type { TemplateDefinition } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
import type { NormalizedBrief } from "./intent-extractor.js";

export const WorldDesign = z.object({
  mapName: z.string(),
  theme: z.string(),
  zones: z.array(
    z.object({
      zoneId: z.string(),
      name: z.string(),
      purpose: z.string(),
      description: z.string(),
      tier: z.number().int().min(1),
      unlockRequirement: z.string().optional(),
    }),
  ),
  progressionBeats: z.array(z.string()),
  coreLoop: z.array(z.string()),
  sessionPacing: z.object({
    earlyGame: z.string(),
    midGame: z.string(),
    lateGame: z.string(),
  }),
});
export type WorldDesign = z.infer<typeof WorldDesign>;

const SYSTEM_PROMPT = `You are a UEFN world designer. Given a game brief and template constraints, design the world structure.

Return ONLY valid JSON matching this schema:
{
  "mapName": "Creative map name",
  "theme": "Overall visual/thematic style",
  "zones": [
    {
      "zoneId": "zone_1",
      "name": "Human-readable zone name",
      "purpose": "starter_area|resource_area|combat_area|shop|upgrade_lane|boss_area|social_hub|unlock_gate",
      "description": "What this zone contains and its role in gameplay",
      "tier": 1,  // progression tier (1 = earliest)
      "unlockRequirement": "optional - what player needs to access this zone"
    }
  ],
  "progressionBeats": ["First reward in 30s", "First upgrade at 60s", ...],
  "coreLoop": ["chop", "sell", "upgrade", "prestige"],
  "sessionPacing": {
    "earlyGame": "description of first 2-3 minutes",
    "midGame": "description of 5-10 minute mark",
    "lateGame": "description of final minutes before prestige/end"
  }
}

Rules:
- Respect the template's minZones/maxZones constraints
- Include all requiredZonePurposes from the template
- Zones should be ordered by progression tier
- Session pacing should match the target session length
- Each zone needs a clear gameplay purpose`;

export class WorldPlanner {
  constructor(private llm: LLMAdapter) {}

  async plan(brief: NormalizedBrief, template: TemplateDefinition): Promise<WorldDesign> {
    const userMsg = `Design a world for this game:

Genre: ${brief.genre}
Fantasy: ${brief.fantasy}
Core Loop: ${brief.coreLoop.join(" → ")}
Session Length: ${brief.sessionLengthMin} minutes
Player Count: ${brief.playerCount}
Progression: ${brief.progressionStyle}
Key Features: ${brief.keyFeatures.join(", ")}
${brief.style ? `Style: ${brief.style}` : ""}

Template constraints:
- Zones: ${template.layoutRules.minZones}–${template.layoutRules.maxZones}
- Required zone purposes: ${template.layoutRules.requiredZonePurposes.join(", ")}
- Layout style: ${template.layoutRules.layoutStyle}
- Required systems: ${template.systemModules.required.join(", ")}`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.5, jsonMode: true },
    );

    const parsed = parseJsonResponse(response.content, "WorldPlanner");

    return WorldDesign.parse(parsed);
  }
}
