import { describe, it, expect } from "vitest";
import { TycoonSimulator } from "../tycoon-simulator.js";
import type { EconomySpec } from "@forgeai/schemas";

function makeEconomy(overrides: Partial<EconomySpec> = {}): EconomySpec {
  return {
    currencies: [{ currencyId: "gold", name: "Gold", persistent: true }],
    generators: [
      {
        sourceId: "gen_chop",
        name: "Tree Chopping",
        currencyId: "gold",
        baseRate: 5,
        rateUnit: "per_action",
      },
    ],
    sinks: [
      {
        sinkId: "sink_axe",
        name: "Better Axe",
        currencyId: "gold",
        cost: 100,
        type: "upgrade",
        repeatable: false,
      },
      {
        sinkId: "sink_auto",
        name: "Auto Chopper Worker",
        currencyId: "gold",
        cost: 500,
        type: "upgrade",
        repeatable: false,
      },
      {
        sinkId: "sink_prestige",
        name: "Prestige Reset",
        currencyId: "gold",
        cost: 2000,
        type: "prestige",
        repeatable: true,
      },
    ],
    targetCurves: {
      timeToFirstUpgradeSec: 60,
    },
    ...overrides,
  };
}

describe("TycoonSimulator", () => {
  const sim = new TycoonSimulator();

  it("calculates time to first upgrade", () => {
    const result = sim.simulate(makeEconomy(), 20);
    // 5 per action * 20 actions/min = 100/min. Cost 100 → 1 min = 60s
    expect(result.timeToFirstUpgradeSec).toBe(60);
  });

  it("calculates time to automation", () => {
    const result = sim.simulate(makeEconomy(), 20);
    // 100/min income, 500 cost → 5 min
    expect(result.timeToAutomationMin).toBe(5);
  });

  it("calculates time to prestige", () => {
    const result = sim.simulate(makeEconomy(), 20);
    // 100/min income, 2000 cost → 20 min
    expect(result.timeToPrestigeMin).toBe(20);
  });

  it("reports no violations for well-balanced economy", () => {
    const result = sim.simulate(makeEconomy(), 20);
    expect(result.violations).toHaveLength(0);
  });

  it("flags prestige unreachable in session", () => {
    const result = sim.simulate(makeEconomy(), 10);
    // Prestige takes 20 min but session is 10 min
    expect(result.violations.some((v) => v.includes("unreachable"))).toBe(true);
  });

  it("flags first upgrade too slow", () => {
    const economy = makeEconomy({
      generators: [
        { sourceId: "g", name: "Slow", currencyId: "gold", baseRate: 1, rateUnit: "per_action" },
      ],
    });
    // 1 * 20 = 20/min. Cost 100 → 5 min = 300s > 90s band
    const result = sim.simulate(economy, 20);
    expect(result.violations.some((v) => v.includes("First upgrade too slow"))).toBe(true);
  });

  it("handles zero income gracefully", () => {
    const economy = makeEconomy({ generators: [] });
    const result = sim.simulate(economy, 20);
    expect(result.timeToFirstUpgradeSec).toBe(Infinity);
    expect(result.violations).toContain("No income sources — incomePerMin is 0");
  });

  it("handles per_second and per_minute rate units", () => {
    const economy = makeEconomy({
      generators: [
        { sourceId: "g1", name: "Passive", currencyId: "gold", baseRate: 2, rateUnit: "per_second" },
        { sourceId: "g2", name: "Bonus", currencyId: "gold", baseRate: 30, rateUnit: "per_minute" },
      ],
    });
    const result = sim.simulate(economy, 20);
    // 2*60 + 30 = 150/min. Cost 100 → 0.67 min = 40s
    expect(result.incomePerMinute).toBe(150);
    expect(result.timeToFirstUpgradeSec).toBe(40);
  });
});

describe("TycoonSimulator.autoAdjust", () => {
  const sim = new TycoonSimulator();

  it("auto-adjusts slow economy to hit pace bands", () => {
    const economy = makeEconomy({
      generators: [
        { sourceId: "g", name: "Slow", currencyId: "gold", baseRate: 1, rateUnit: "per_action" },
      ],
    });
    const { result } = sim.autoAdjust(economy, 20);
    // After adjustment, first upgrade should be within band (±5% tolerance for rounding)
    expect(result.timeToFirstUpgradeSec).toBeLessThanOrEqual(95);
    expect(result.adjustments.length).toBeGreaterThan(0);
  });

  it("does not adjust already-balanced economy", () => {
    const { economy, result } = sim.autoAdjust(makeEconomy(), 20);
    expect(result.adjustments).toHaveLength(0);
    expect(economy.generators[0].baseRate).toBe(5);
  });
});
