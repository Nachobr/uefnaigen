import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CACHE_DIR = join(homedir(), ".forgeai", "stage-cache");

/**
 * Canonical pipeline stage keys, grouped by logical pipeline stage number (1-based).
 * The position of each group defines what `lastCompletedStage` reports, and the
 * string keys are the source of truth used by `pipeline.ts` for cache load/save.
 */
export const STAGE_KEYS = [
  ["1-brief"],
  ["2-template"],
  ["3-world"],
  ["4a-layout"],
  ["4b-systems", "4c-economy", "5-balance"],
  ["6-devices"],
  ["7-modulePlan", "7-lootTables"],
  ["8-verseFiles"],
] as const;

export type StageKey = (typeof STAGE_KEYS)[number][number];

export interface StageCacheOptions {
  persist?: boolean;
}

export class StageCache {
  private dir: string;
  private persist: boolean;
  private memory = new Map<string, unknown>();

  constructor(jobId: string, options: StageCacheOptions = {}) {
    this.persist = options.persist ?? true;
    this.dir = join(CACHE_DIR, jobId);
    if (this.persist) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  save(stage: string, data: unknown): void {
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

  load<T>(stage: string): T | undefined {
    if (!this.persist) return this.memory.get(stage) as T | undefined;
    const path = join(this.dir, `${stage}.json`);
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as T;
    } catch {
      return undefined;
    }
  }

  has(stage: string): boolean {
    if (!this.persist) return this.memory.has(stage);
    return existsSync(join(this.dir, `${stage}.json`));
  }

  /**
   * Load the cached value for `stage`, or compute it via `fn`, persist it, and return it.
   * Centralizes the load/save pairing so the stage key cannot drift between reads and writes.
   */
  async getOrCompute<T>(stage: StageKey, fn: () => T | Promise<T>): Promise<T> {
    const cached = this.load<T>(stage);
    if (cached !== undefined) return cached;
    const value = await fn();
    this.save(stage, value);
    return value;
  }

  get lastCompletedStage(): number {
    let last = 0;
    for (let i = 0; i < STAGE_KEYS.length; i++) {
      if (STAGE_KEYS[i].every((stage) => this.has(stage))) last = i + 1;
      else break;
    }
    return last;
  }
}
