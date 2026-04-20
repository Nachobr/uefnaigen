import { z } from "zod";
import type { Genre } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";

export const NormalizedBrief = z.object({
  genre: z.enum(["tycoon", "battle_arena", "adventure", "roleplay"]),
  subGenre: z.string().optional(),
  fantasy: z.string(),
  coreLoop: z.array(z.string()),
  sessionLengthMin: z.number(),
  playerCount: z.number().int().default(1),
  progressionStyle: z.enum(["linear", "branching", "round-based", "sandbox"]),
  constraints: z.array(z.string()).optional(),
  style: z.string().optional(),
  keyFeatures: z.array(z.string()),
});
export type NormalizedBrief = z.infer<typeof NormalizedBrief>;

/** Keyword-based genre detection as fallback / pre-filter. */
const GENRE_KEYWORDS: Record<string, Genre> = {};
const TYCOON_KW = ["upgrade", "automation", "automate", "rebirth", "prestige", "sell", "unlock", "tycoon", "idle", "factory", "sawmill", "mining", "lumber"];
const ARENA_KW = ["rounds", "weapons", "ffa", "teams", "arena", "pvp", "deathmatch", "loadout", "respawn"];
const ADVENTURE_KW = ["quests", "quest", "boss", "explore", "collect relics", "dungeon", "adventure", "checkpoint", "story"];
const ROLEPLAY_KW = ["jobs", "city", "hangout", "social", "roleplay", "rp", "housing", "town"];

for (const kw of TYCOON_KW) GENRE_KEYWORDS[kw] = "tycoon";
for (const kw of ARENA_KW) GENRE_KEYWORDS[kw] = "battle_arena";
for (const kw of ADVENTURE_KW) GENRE_KEYWORDS[kw] = "adventure";
for (const kw of ROLEPLAY_KW) GENRE_KEYWORDS[kw] = "roleplay";

export function detectGenreFromKeywords(prompt: string): Genre | null {
  const lower = prompt.toLowerCase();
  const scores: Record<Genre, number> = {
    tycoon: 0,
    battle_arena: 0,
    adventure: 0,
    roleplay: 0,
  };

  for (const [keyword, genre] of Object.entries(GENRE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      scores[genre]++;
    }
  }

  let best: Genre | null = null;
  let bestScore = 0;
  for (const [genre, score] of Object.entries(scores) as [Genre, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = genre;
    }
  }

  return bestScore > 0 ? best : null;
}

const SYSTEM_PROMPT = `You are a UEFN game design intent extractor. Given a user's natural language game idea, extract a structured brief.

Return ONLY valid JSON matching this schema:
{
  "genre": "tycoon" | "battle_arena" | "adventure" | "roleplay",
  "subGenre": "optional string (e.g. lumber-mill, mining-empire)",
  "fantasy": "one-sentence player fantasy",
  "coreLoop": ["verb1", "verb2", ...],  // 3-6 core actions
  "sessionLengthMin": number,  // estimated ideal session in minutes
  "playerCount": number,  // max simultaneous players
  "progressionStyle": "linear" | "branching" | "round-based" | "sandbox",
  "constraints": ["any explicit constraints mentioned"],
  "style": "visual/thematic style if mentioned",
  "keyFeatures": ["notable features extracted from prompt"]
}

Genre rules:
- "upgrade", "automation", "rebirth", "sell", "unlock plots" → tycoon
- "rounds", "weapons", "FFA", "teams", "arena" → battle_arena
- "quests", "boss", "explore", "collect relics" → adventure
- "jobs", "city", "hangout", "social" → roleplay

If session length isn't mentioned, estimate based on genre:
- tycoon: 15-30 min
- battle_arena: 5-15 min
- adventure: 20-45 min
- roleplay: 15-60 min`;

export class IntentExtractor {
  constructor(private llm: LLMAdapter) {}

  async extract(prompt: string, genreOverride?: Genre): Promise<NormalizedBrief> {
    const keywordGenre = detectGenreFromKeywords(prompt);

    const userMsg = genreOverride
      ? `Genre is pre-selected as "${genreOverride}". Extract the brief from:\n\n${prompt}`
      : `Extract the brief from:\n\n${prompt}`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, jsonMode: true },
    );

    const parsed = parseJsonResponse(response.content, "IntentExtractor");

    const brief = NormalizedBrief.parse(parsed);

    // If LLM genre disagrees with keyword detection and no override, prefer LLM but log
    if (!genreOverride && keywordGenre && brief.genre !== keywordGenre) {
      // LLM has more context, keep its choice
    }

    // Apply override if set
    if (genreOverride) {
      brief.genre = genreOverride;
    }

    return brief;
  }
}
