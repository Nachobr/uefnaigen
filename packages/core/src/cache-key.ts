import { createHash } from "node:crypto";

export interface CacheKeyInput {
  prompt: string;
  templateId: string;
  model: string;
  seed: number;
  schemaVersion?: string;
  /** LLM provider id (anthropic, openai, groq, google, ollama) — keys outputs by provider so model-specific quirks don't cross over. */
  provider?: string;
  /** Resolved template version. Bumping a template's version invalidates downstream stage memoization. */
  templateVersion?: string;
  /** Version tag for the knowledge-context bundle injected into agent prompts. Bump when seed knowledge changes meaningfully. */
  knowledgeVersion?: string;
  /** Optional genre override (CLI flag) — affects intent extraction output. */
  genreOverride?: string;
  /** Optional template id override (CLI flag) — affects routing output. */
  templateOverride?: string;
  /** Per-stage LLM overrides — affects stage outputs, especially Verse generation. */
  stageOverrides?: Record<string, unknown>;
  /** Hash of an existing generated project when memoizing modification patches. */
  parentProjectHash?: string;
}

export function computeCacheKey(input: CacheKeyInput): string {
  const payload = JSON.stringify({
    prompt: input.prompt,
    templateId: input.templateId,
    model: input.model,
    seed: input.seed,
    schemaVersion: input.schemaVersion ?? "wg/1.0",
    provider: input.provider ?? "",
    templateVersion: input.templateVersion ?? "",
    knowledgeVersion: input.knowledgeVersion ?? "",
    genreOverride: input.genreOverride ?? "",
    templateOverride: input.templateOverride ?? "",
    stageOverrides: input.stageOverrides ?? {},
    parentProjectHash: input.parentProjectHash ?? "",
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
