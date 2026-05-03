import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UsageLedger } from "../usage-ledger.js";

describe("UsageLedger", () => {
  it("records calls and aggregates per-day per-provider in memory", () => {
    const ledger = new UsageLedger({ persist: false });
    ledger.recordCall("anthropic", 100, 50, 0.001);
    ledger.recordCall("anthropic", 200, 100, 0.003);
    ledger.recordCall("groq", 1000, 500, 0.002);

    const today = new Date().toISOString().slice(0, 10);
    const snap = ledger.snapshot();
    const day = snap.days[today];

    expect(day.inputTokens).toBe(1300);
    expect(day.outputTokens).toBe(650);
    expect(day.costUsd).toBeCloseTo(0.006, 4);
    expect(day.byProvider.anthropic.calls).toBe(2);
    expect(day.byProvider.groq.calls).toBe(1);
    expect(ledger.spentToday()).toBeCloseTo(0.006, 4);
  });

  it("recordJob increments today's job counter", () => {
    const ledger = new UsageLedger({ persist: false });
    ledger.recordJob();
    ledger.recordJob();
    const today = new Date().toISOString().slice(0, 10);
    expect(ledger.snapshot().days[today].jobs).toBe(2);
  });

  it("persists across instances when given the same path", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeai-ledger-"));
    const path = join(dir, "ledger.json");

    const a = new UsageLedger({ persist: true, path });
    a.recordCall("anthropic", 10, 20, 0.5);

    const b = new UsageLedger({ persist: true, path });
    expect(b.spentToday()).toBeCloseTo(0.5, 4);
  });

  it("returns empty data when file has unrecognized shape (e.g. TierGuard's usage.json)", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeai-ledger-shape-"));
    const path = join(dir, "ledger.json");
    // Pre-write a TierGuard-style file at the same path.
    writeFileSync(path, JSON.stringify({ generations: { "2026-05": 1 } }));

    const ledger = new UsageLedger({ persist: true, path });
    expect(ledger.spentToday()).toBe(0);
  });
});
