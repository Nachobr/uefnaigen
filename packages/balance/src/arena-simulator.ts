import type { EconomySpec } from "@forgeai/schemas";

export interface ArenaPaceBands {
  roundDurationSec: number;
  respawnDelaySec: number;
  maxRounds: number;
  targetKillsPerRound: number;
  powerUpSpawnIntervalSec: number;
}

const DEFAULT_ARENA_BANDS: ArenaPaceBands = {
  roundDurationSec: 180,
  respawnDelaySec: 5,
  maxRounds: 5,
  targetKillsPerRound: 8,
  powerUpSpawnIntervalSec: 30,
};

export interface ArenaSimulationResult {
  roundDurationSec: number;
  totalMatchTimeSec: number;
  estimatedKillsPerRound: number;
  powerUpsPerRound: number;
  violations: string[];
  balanceScore: number;
  visualization: BalanceVisualization;
}

export interface BalanceVisualization {
  rounds: RoundSnapshot[];
  timeline: TimelineEvent[];
}

export interface RoundSnapshot {
  round: number;
  durationSec: number;
  estimatedKills: number;
  powerUps: number;
}

export interface TimelineEvent {
  timeSec: number;
  event: string;
  type: "round_start" | "round_end" | "powerup_spawn" | "match_end";
}

export class ArenaSimulator {
  simulate(
    economy: EconomySpec,
    playerCount: number,
    bands: ArenaPaceBands = DEFAULT_ARENA_BANDS,
  ): ArenaSimulationResult {
    const violations: string[] = [];

    const roundDuration = bands.roundDurationSec;
    const totalMatchTime = roundDuration * bands.maxRounds;
    const powerUpsPerRound = Math.floor(roundDuration / bands.powerUpSpawnIntervalSec);

    // Estimate kills: assume each player gets ~1 kill per 20 seconds on average
    const killRatePerSec = playerCount / 20;
    const estimatedKillsPerRound = Math.round(killRatePerSec * roundDuration);

    // Validate
    if (roundDuration < 60) {
      violations.push(`Round too short: ${roundDuration}s (min 60s)`);
    }
    if (roundDuration > 600) {
      violations.push(`Round too long: ${roundDuration}s (max 600s)`);
    }
    if (totalMatchTime > 1800) {
      violations.push(`Match too long: ${(totalMatchTime / 60).toFixed(0)}min (max 30min)`);
    }
    if (bands.respawnDelaySec > 15) {
      violations.push(`Respawn too slow: ${bands.respawnDelaySec}s (max 15s)`);
    }
    if (powerUpsPerRound < 1) {
      violations.push(`No power-ups spawned in round`);
    }

    // Check economy for scoring rewards
    const scoreGenerators = economy.generators.filter(
      (g) => g.name.toLowerCase().includes("kill") || g.name.toLowerCase().includes("score") || g.name.toLowerCase().includes("elim"),
    );
    if (scoreGenerators.length === 0) {
      violations.push("No kill/score-based income generators found");
    }

    // Balance score: 100 = perfect, deduct per violation
    const balanceScore = Math.max(0, 100 - violations.length * 15);

    // Build visualization data
    const rounds: RoundSnapshot[] = [];
    const timeline: TimelineEvent[] = [];

    for (let r = 1; r <= bands.maxRounds; r++) {
      const startTime = (r - 1) * roundDuration;
      rounds.push({
        round: r,
        durationSec: roundDuration,
        estimatedKills: estimatedKillsPerRound,
        powerUps: powerUpsPerRound,
      });
      timeline.push({ timeSec: startTime, event: `Round ${r} start`, type: "round_start" });
      for (let p = 1; p <= powerUpsPerRound; p++) {
        timeline.push({
          timeSec: startTime + p * bands.powerUpSpawnIntervalSec,
          event: `Power-up #${p}`,
          type: "powerup_spawn",
        });
      }
      timeline.push({ timeSec: startTime + roundDuration, event: `Round ${r} end`, type: "round_end" });
    }
    timeline.push({ timeSec: totalMatchTime, event: "Match complete", type: "match_end" });

    return {
      roundDurationSec: roundDuration,
      totalMatchTimeSec: totalMatchTime,
      estimatedKillsPerRound,
      powerUpsPerRound,
      violations,
      balanceScore,
      visualization: { rounds, timeline },
    };
  }
}
