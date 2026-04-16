import { createHash } from "node:crypto";

export interface CacheKeyInput {
  prompt: string;
  templateId: string;
  model: string;
  seed: number;
  schemaVersion?: string;
}

export function computeCacheKey(input: CacheKeyInput): string {
  const payload = JSON.stringify({
    prompt: input.prompt,
    templateId: input.templateId,
    model: input.model,
    seed: input.seed,
    schemaVersion: input.schemaVersion ?? "wg/1.0",
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
