import type { PricingTier } from "@forgeai/schemas";
import { TIER_LIMITS } from "@forgeai/schemas";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export class TierGuard {
  private usagePath: string;

  constructor(private tier: PricingTier) {
    const dir = join(homedir(), ".forgeai");
    mkdirSync(dir, { recursive: true });
    this.usagePath = join(dir, "usage.json");
  }

  checkGenerationAllowed(): void {
    const limits = TIER_LIMITS[this.tier];
    const usage = this.loadUsage();
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthCount = usage.generations?.[monthKey] ?? 0;

    if (monthCount >= limits.maxGenerationsPerMonth) {
      throw new Error(
        `Generation limit reached for ${this.tier} tier (${limits.maxGenerationsPerMonth}/month). Upgrade to increase limits.`,
      );
    }
  }

  recordGeneration(): void {
    const usage = this.loadUsage();
    const monthKey = new Date().toISOString().slice(0, 7);
    if (!usage.generations) usage.generations = {};
    usage.generations[monthKey] = (usage.generations[monthKey] ?? 0) + 1;
    this.saveUsage(usage);
  }

  checkCopilotAllowed(): void {
    const limits = TIER_LIMITS[this.tier];
    const usage = this.loadUsage();
    const dayKey = new Date().toISOString().slice(0, 10);
    const dayCount = usage.copilot?.[dayKey] ?? 0;

    if (dayCount >= limits.maxCopilotCallsPerDay) {
      throw new Error(
        `Copilot limit reached for ${this.tier} tier (${limits.maxCopilotCallsPerDay}/day). Upgrade to increase limits.`,
      );
    }
  }

  recordCopilotCall(): void {
    const usage = this.loadUsage();
    const dayKey = new Date().toISOString().slice(0, 10);
    if (!usage.copilot) usage.copilot = {};
    usage.copilot[dayKey] = (usage.copilot[dayKey] ?? 0) + 1;
    this.saveUsage(usage);
  }

  private loadUsage(): Record<string, Record<string, number>> {
    if (!existsSync(this.usagePath)) return {};
    try {
      return JSON.parse(readFileSync(this.usagePath, "utf-8"));
    } catch {
      return {};
    }
  }

  private saveUsage(usage: Record<string, Record<string, number>>): void {
    writeFileSync(this.usagePath, JSON.stringify(usage, null, 2), "utf-8");
  }
}
