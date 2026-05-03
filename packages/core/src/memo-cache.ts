import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { computeCacheKey, type CacheKeyInput } from "./cache-key.js";

const MEMO_DIR = join(homedir(), ".forgeai", "memo-cache");

/**
 * Current bundled-knowledge fingerprint. Bump this when seed knowledge entries
 * change in a way that should invalidate downstream stage memoization.
 */
export const KNOWLEDGE_VERSION = "1.0";

/**
 * Stages that benefit from cross-job content-addressed reuse.
 * Cheap or fully deterministic stages (1-brief, 2-template, 5-balance) are intentionally excluded.
 */
export const MEMOIZED_STAGES = [
  "3-world",
  "4a-layout",
  "4b-systems",
  "4c-economy",
  "6-devices",
  "7-modulePlan",
  "7-lootTables",
  "8-verseFiles",
] as const;

export type MemoizedStage = (typeof MEMOIZED_STAGES)[number];

export interface MemoCacheOptions {
  persist?: boolean;
}

/**
 * Content-addressed cache for expensive pipeline stages. Keyed by a hash of:
 * prompt + templateId + templateVersion + provider + model + seed + schemaVersion + knowledgeVersion
 * (plus any CLI overrides). Two runs that produce the same key share outputs.
 *
 * Distinct from `StageCache`, which is keyed by `jobId` only and exists to support `resume`.
 */
export class MemoCache {
  private dir: string;
  private persist: boolean;
  private memory = new Map<string, unknown>();
  readonly key: string;

  constructor(input: CacheKeyInput, options: MemoCacheOptions = {}) {
    this.persist = options.persist ?? true;
    this.key = computeCacheKey(input);
    this.dir = join(MEMO_DIR, this.key);
    if (this.persist) mkdirSync(this.dir, { recursive: true });
  }

  has(stage: MemoizedStage): boolean {
    if (!this.persist) return this.memory.has(stage);
    return existsSync(join(this.dir, `${stage}.json`));
  }

  load<T>(stage: MemoizedStage): T | undefined {
    if (!this.persist) return this.memory.get(stage) as T | undefined;
    const path = join(this.dir, `${stage}.json`);
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as T;
    } catch {
      return undefined;
    }
  }

  save(stage: MemoizedStage, data: unknown): void {
    if (!this.persist) {
      this.memory.set(stage, data);
      return;
    }
    writeFileSync(
      join(this.dir, `${stage}.json`),
      JSON.stringify(data, null, 2),
      "utf-8",
    );
  }
}
