import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

/** Cost ledger lives in its own file to avoid colliding with TierGuard's usage.json (different schema). */
function defaultLedgerPath(): string {
  return join(homedir(), ".forgeai", "usage-ledger.json");
}

export interface StageUsage {
  stage: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  estimated: boolean;
  cacheHit: boolean;
  retries: number;
  durationMs: number;
  timestamp: string;
}

export interface DayLedger {
  /** ISO date `YYYY-MM-DD` (UTC). */
  date: string;
  jobs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number }>;
}

export interface UsageLedgerData {
  days: Record<string, DayLedger>;
}

export interface UsageLedgerOptions {
  persist?: boolean;
  path?: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export class UsageLedger {
  private persist: boolean;
  private path: string;
  private data: UsageLedgerData;

  constructor(options: UsageLedgerOptions = {}) {
    this.persist = options.persist ?? true;
    this.path = options.path ?? defaultLedgerPath();
    this.data = this.read();
  }

  private read(): UsageLedgerData {
    if (!this.persist || !existsSync(this.path)) return { days: {} };
    try {
      const parsed = JSON.parse(readFileSync(this.path, "utf-8")) as Partial<UsageLedgerData>;
      return { days: parsed.days ?? {} };
    } catch {
      return { days: {} };
    }
  }

  private write(): void {
    if (!this.persist) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), "utf-8");
  }

  private day(): DayLedger {
    const date = todayUtc();
    let day = this.data.days[date];
    if (!day) {
      day = { date, jobs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, byProvider: {} };
      this.data.days[date] = day;
    }
    return day;
  }

  recordCall(provider: string, inputTokens: number, outputTokens: number, costUsd: number): void {
    const day = this.day();
    day.inputTokens += inputTokens;
    day.outputTokens += outputTokens;
    day.costUsd += costUsd;
    const p = day.byProvider[provider] ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    p.calls += 1;
    p.inputTokens += inputTokens;
    p.outputTokens += outputTokens;
    p.costUsd += costUsd;
    day.byProvider[provider] = p;
    this.write();
  }

  recordJob(): void {
    this.day().jobs += 1;
    this.write();
  }

  spentToday(): number {
    return this.data.days[todayUtc()]?.costUsd ?? 0;
  }

  snapshot(): UsageLedgerData {
    return JSON.parse(JSON.stringify(this.data)) as UsageLedgerData;
  }
}
