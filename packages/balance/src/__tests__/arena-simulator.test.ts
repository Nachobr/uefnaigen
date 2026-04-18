import { describe, it, expect } from "vitest";
import { ArenaSimulator } from "../arena-simulator.js";
import type { EconomySpec } from "@forgeai/schemas";

function makeArenaEconomy(): EconomySpec {
  return {
    currencies: [{ currencyId: "score", name: "Score", persistent: false }],
    generators: [
      { sourceId: "gen_kill", name: "Kill Score", currencyId: "score", baseRate: 100, rateUnit: "per_action" },
    ],
    sinks: [
      { sinkId: "sink_win", name: "Round Win Bonus", currencyId: "score", cost: 500, type: "purchase", repeatable: true },
    ],
    targetCurves: { timeToFirstUpgradeSec: 0 },
  };
}

describe("ArenaSimulator", () => {
  const sim = new ArenaSimulator();

  it("calculates total match time", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.totalMatchTimeSec).toBe(900); // 180 * 5
  });

  it("calculates power-ups per round", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.powerUpsPerRound).toBe(6); // 180 / 30
  });

  it("estimates kills per round", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.estimatedKillsPerRound).toBeGreaterThan(0);
  });

  it("reports no violations for default bands", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.violations).toHaveLength(0);
  });

  it("flags missing score generators", () => {
    const economy = makeArenaEconomy();
    economy.generators = [{ sourceId: "g", name: "Passive", currencyId: "score", baseRate: 1, rateUnit: "per_minute" }];
    const result = sim.simulate(economy, 8);
    expect(result.violations.some((v) => v.includes("No kill/score-based"))).toBe(true);
  });

  it("flags round too short", () => {
    const result = sim.simulate(makeArenaEconomy(), 8, {
      roundDurationSec: 30, respawnDelaySec: 5, maxRounds: 5, targetKillsPerRound: 8, powerUpSpawnIntervalSec: 30,
    });
    expect(result.violations.some((v) => v.includes("Round too short"))).toBe(true);
  });

  it("generates visualization data", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.visualization.rounds.length).toBe(5);
    expect(result.visualization.timeline.length).toBeGreaterThan(5);
    expect(result.visualization.timeline[0].type).toBe("round_start");
  });

  it("calculates balance score", () => {
    const result = sim.simulate(makeArenaEconomy(), 8);
    expect(result.balanceScore).toBe(100);
  });
});
