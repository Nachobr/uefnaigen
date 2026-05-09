import { z } from "zod";
import type { WorldProject } from "@forgeai/schemas";
import type { LLMAdapter } from "./adapter.js";
import { generateValidated } from "./structured-output.js";
import { withKnowledgeContext } from "./prompt-context.js";

export const ModifierPatchOperation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), path: z.string().min(1), value: z.unknown() }),
  z.object({ op: z.literal("replace"), path: z.string().min(1), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string().min(1) }),
  z.object({
    op: z.literal("regenerate_verse_module"),
    moduleName: z.string().min(1),
    reason: z.string().min(1),
    modulePlanPatch: z.unknown().optional(),
  }),
]);

export const ModifierPatch = z.object({
  summary: z.string().min(1),
  operations: z.array(ModifierPatchOperation),
});
export type ModifierPatch = z.infer<typeof ModifierPatch>;

const SYSTEM_PROMPT = `You are a ForgeAI project modifier. Convert a user's natural-language request into a constrained patch over an existing WorldProject.

Return ONLY valid JSON matching this schema:
{
  "summary": "short explanation of the change",
  "operations": [
    { "op": "add", "path": "layout.zones[]", "value": { } },
    { "op": "replace", "path": "economy.sinks[sinkId=sink_first_upgrade].cost", "value": 50 },
    { "op": "remove", "path": "devices[id=dev_old]" },
    { "op": "regenerate_verse_module", "moduleName": "automation_manager", "reason": "add worker tier" }
  ]
}

Rules:
- Use only these operation names: add, replace, remove, regenerate_verse_module.
- Do not emit Verse source code or textual diffs.
- For Verse-affecting changes, emit regenerate_verse_module for the specific touched module only.
- Prefer small changes to the existing project over broad rewrites.
- If the request requires changing genre or replacing the template, return an empty operations list and say it requires regeneration in summary.
- Paths use dot notation and array selectors: layout.zones[], devices[id=...], economy.sinks[sinkId=...], economy.generators[sourceId=...].baseRate.`;

export class ModifierAgent {
  constructor(private llm: LLMAdapter, private knowledgeContext = "") {}

  async proposePatch(project: WorldProject, request: string): Promise<ModifierPatch> {
    const userMsg = `Existing project summary:
Project: ${project.name}
Genre: ${project.target.genre}
Fantasy: ${project.design.fantasy}
Core loop: ${project.design.coreLoop.join(" → ")}

Zones:
${project.layout.zones.map((z) => `- ${z.zoneId}: ${z.name} (${z.purpose})`).join("\n")}

Currencies:
${project.economy.currencies.map((c) => `- ${c.currencyId}: ${c.name}`).join("\n")}

Generators:
${project.economy.generators.map((g) => `- ${g.sourceId}: ${g.name}, ${g.baseRate}/${g.rateUnit}, currency=${g.currencyId}, zone=${g.zoneId ?? "global"}`).join("\n")}

Sinks:
${project.economy.sinks.map((s) => `- ${s.sinkId}: ${s.name}, cost=${s.cost} ${s.currencyId}, type=${s.type}`).join("\n")}

Devices:
${project.devices.map((d) => `- ${d.id}: ${d.type}, ${d.label}, zone=${d.zoneId ?? "global"}`).join("\n")}

Verse modules:
${project.scripts.map((s) => `- ${s.name}`).join("\n")}

User request:
${request}`;

    return generateValidated({
      llm: this.llm,
      stage: "ModifierAgent",
      schema: ModifierPatch,
      messages: [
        { role: "system", content: withKnowledgeContext(SYSTEM_PROMPT, this.knowledgeContext) },
        { role: "user", content: userMsg },
      ],
      temperature: 0.2,
      maxTokens: 4096,
    });
  }
}
