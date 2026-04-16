import type { EconomySpec } from "@forgeai/schemas";

export interface PaceBands {
  firstRewardSec: number;
  firstPurchaseSec: number;
  automationMin: number;
  prestigeMin: number;
  maxStagnationMin: number;
}

const DEFAULT_TYCOON_BANDS: PaceBands = {
  firstRewardSec: 30,
  firstPurchaseSec: 90,
  automationMin: 8,
  prestigeMin: 25,
  maxStagnationMin: 3,
};

export interface SimulationResult {
  timeToFirstUpgradeSec: number;
  timeToAutomationMin: number | null;
  timeToPrestigeMin: number | null;
  incomePerMinute: number;
  violations: string[];
  adjustments: string[];
}

export class TycoonSimulator {
  simulate(
    economy: EconomySpec,
    sessionLengthMin: number,
    bands: PaceBands = DEFAULT_TYCOON_BANDS,
  ): SimulationResult {
    const violations: string[] = [];
    const adjustments: string[] = [];

    // Calculate base income per minute from all generators
    let incomePerMin = 0;
    for (const gen of economy.generators) {
      switch (gen.rateUnit) {
        case "per_second":
          incomePerMin += gen.baseRate * 60;
          break;
        case "per_minute":
          incomePerMin += gen.baseRate;
          break;
        case "per_action":
          // Assume ~20 actions per minute for manual gathering
          incomePerMin += gen.baseRate * 20;
          break;
      }
    }

    if (incomePerMin <= 0) {
      violations.push("No income sources — incomePerMin is 0");
      return {
        timeToFirstUpgradeSec: Infinity,
        timeToAutomationMin: null,
        timeToPrestigeMin: null,
        incomePerMinute: 0,
        violations,
        adjustments,
      };
    }

    // Find cheapest sink (first upgrade)
    const upgradeSinks = economy.sinks
      .filter((s) => s.type === "upgrade" || s.type === "purchase")
      .sort((a, b) => a.cost - b.cost);

    const firstUpgradeCost = upgradeSinks[0]?.cost ?? 0;
    const timeToFirstUpgradeSec =
      firstUpgradeCost > 0 ? (firstUpgradeCost / incomePerMin) * 60 : 0;

    // Find automation sink
    const automationSinks = economy.sinks
      .filter(
        (s) =>
          s.name.toLowerCase().includes("automat") ||
          s.name.toLowerCase().includes("worker") ||
          s.name.toLowerCase().includes("processor"),
      )
      .sort((a, b) => a.cost - b.cost);

    const automationCost = automationSinks[0]?.cost;
    const timeToAutomationMin = automationCost
      ? automationCost / incomePerMin
      : null;

    // Find prestige sink
    const prestigeSinks = economy.sinks
      .filter((s) => s.type === "prestige")
      .sort((a, b) => a.cost - b.cost);

    const prestigeCost = prestigeSinks[0]?.cost;
    const timeToPrestigeMin = prestigeCost
      ? prestigeCost / incomePerMin
      : null;

    // Check pace band violations
    if (timeToFirstUpgradeSec > bands.firstPurchaseSec) {
      violations.push(
        `First upgrade too slow: ${timeToFirstUpgradeSec.toFixed(0)}s (target <${bands.firstPurchaseSec}s)`,
      );
    }

    if (timeToAutomationMin !== null && timeToAutomationMin > bands.automationMin) {
      violations.push(
        `Automation too slow: ${timeToAutomationMin.toFixed(1)}min (target <${bands.automationMin}min)`,
      );
    }

    if (timeToPrestigeMin !== null) {
      if (timeToPrestigeMin > bands.prestigeMin) {
        violations.push(
          `Prestige too slow: ${timeToPrestigeMin.toFixed(1)}min (target <${bands.prestigeMin}min)`,
        );
      }
      if (timeToPrestigeMin > sessionLengthMin) {
        violations.push(
          `Prestige unreachable in session: ${timeToPrestigeMin.toFixed(1)}min > ${sessionLengthMin}min session`,
        );
      }
    }

    // Check target curves if provided
    if (economy.targetCurves.timeToFirstUpgradeSec > 0) {
      const diff = Math.abs(timeToFirstUpgradeSec - economy.targetCurves.timeToFirstUpgradeSec);
      const tolerance = economy.targetCurves.timeToFirstUpgradeSec * 0.2;
      if (diff > tolerance) {
        violations.push(
          `First upgrade time off target: ${timeToFirstUpgradeSec.toFixed(0)}s vs ${economy.targetCurves.timeToFirstUpgradeSec}s (±20%)`,
        );
      }
    }

    return {
      timeToFirstUpgradeSec,
      timeToAutomationMin,
      timeToPrestigeMin,
      incomePerMinute: incomePerMin,
      violations,
      adjustments,
    };
  }

  /**
   * Auto-adjust economy to fit pace bands. Returns adjusted economy + report.
   */
  autoAdjust(
    economy: EconomySpec,
    sessionLengthMin: number,
    bands: PaceBands = DEFAULT_TYCOON_BANDS,
  ): { economy: EconomySpec; result: SimulationResult } {
    // Deep clone
    const adjusted: EconomySpec = JSON.parse(JSON.stringify(economy));
    const result = this.simulate(adjusted, sessionLengthMin, bands);

    if (result.violations.length === 0) {
      return { economy: adjusted, result };
    }

    // Auto-adjust: scale generator rates to hit first-purchase target
    if (result.timeToFirstUpgradeSec > bands.firstPurchaseSec) {
      const targetIncomePerSec =
        (adjusted.sinks[0]?.cost ?? 100) / bands.firstPurchaseSec;
      const currentIncomePerSec = result.incomePerMinute / 60;
      const scale = targetIncomePerSec / currentIncomePerSec;

      for (const gen of adjusted.generators) {
        gen.baseRate = Math.round(gen.baseRate * scale * 100) / 100;
      }
      result.adjustments.push(
        `Scaled generator rates by ${scale.toFixed(2)}x to hit first-purchase target`,
      );
    }

    // Re-simulate with adjustments
    const final = this.simulate(adjusted, sessionLengthMin, bands);
    final.adjustments = result.adjustments;
    return { economy: adjusted, result: final };
  }
}
