// client/src/core/engine/ScoreCalculator.ts

export interface ScoreFactors {
  basePoints: number;
  timeRemainingSeconds: number;
  totalTimeSeconds: number;
  hintsUsedCount: number;
  hintPenaltyWeight: number; // e.g., 0.15 (15% deduction per hint)
  consecutiveStreak: number;
  isFirstAttemptSuccess: boolean;
}

export interface IScoreStrategy {
  calculate(factors: ScoreFactors): number;
}

export interface ScoreBreakdown {
  basePoints: number;
  timeBonus: number;
  timeRatio: number;
  hintPenaltyRatio: number;
  hintPenaltyAmount: number;
  subtotal: number;
  streakMultiplier: number;
  firstAttemptBonus: number;
  finalScore: number;
}

export class ArcadeScoringStrategy implements IScoreStrategy {
  calculate(factors: ScoreFactors): number {
    const {
      basePoints,
      timeRemainingSeconds,
      totalTimeSeconds,
      hintsUsedCount,
      hintPenaltyWeight,
      consecutiveStreak,
      isFirstAttemptSuccess,
    } = factors;

    // Time bonus: up to 50% extra for rapid solves
    const timeRatio = totalTimeSeconds > 0
      ? Math.max(0, Math.min(1, timeRemainingSeconds / totalTimeSeconds))
      : 0;
    const timeBonus = Math.floor(basePoints * 0.5 * timeRatio);

    // Hint penalty: compound deduction capped at 80% loss
    const totalPenaltyRatio = Math.min(0.80, hintsUsedCount * hintPenaltyWeight);
    // Round to avoid IEEE 754 precision issues (e.g. 1 - 0.8 = 0.19999999999999996)
    const retentionRatio = Math.round((1 - totalPenaltyRatio) * 1e6) / 1e6;
    const subtotal = Math.floor((basePoints + timeBonus) * retentionRatio);

    // Multipliers
    const streakMultiplier = consecutiveStreak > 1
      ? Math.min(2.5, 1 + consecutiveStreak * 0.1)
      : 1.0;
    const firstAttemptBonus = isFirstAttemptSuccess ? 100 : 0;

    return Math.max(10, Math.floor(subtotal * streakMultiplier) + firstAttemptBonus);
  }
}

/**
 * Extensible ScoreCalculator Context Class
 * Implements the Strategy Pattern and Single Responsibility Principle (SRP).
 */
export class ScoreCalculator {
  private strategy: IScoreStrategy;

  constructor(strategy: IScoreStrategy = new ArcadeScoringStrategy()) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: IScoreStrategy): void {
    this.strategy = strategy;
  }

  public getStrategy(): IScoreStrategy {
    return this.strategy;
  }

  public calculate(factors: ScoreFactors): number {
    return this.strategy.calculate(factors);
  }

  public calculateBreakdown(factors: ScoreFactors): ScoreBreakdown {
    const {
      basePoints,
      timeRemainingSeconds,
      totalTimeSeconds,
      hintsUsedCount,
      hintPenaltyWeight,
      consecutiveStreak,
      isFirstAttemptSuccess,
    } = factors;

    const timeRatio = totalTimeSeconds > 0
      ? Math.max(0, Math.min(1, timeRemainingSeconds / totalTimeSeconds))
      : 0;
    const timeBonus = Math.floor(basePoints * 0.5 * timeRatio);
    const totalPenaltyRatio = Math.min(0.80, hintsUsedCount * hintPenaltyWeight);
    const retentionRatio = Math.round((1 - totalPenaltyRatio) * 1e6) / 1e6;
    const hintPenaltyAmount = Math.floor((basePoints + timeBonus) * totalPenaltyRatio);
    const subtotal = Math.floor((basePoints + timeBonus) * retentionRatio);
    const streakMultiplier = consecutiveStreak > 1
      ? Math.min(2.5, 1 + consecutiveStreak * 0.1)
      : 1.0;
    const firstAttemptBonus = isFirstAttemptSuccess ? 100 : 0;
    const finalScore = this.strategy.calculate(factors);

    return {
      basePoints,
      timeBonus,
      timeRatio,
      hintPenaltyRatio: totalPenaltyRatio,
      hintPenaltyAmount,
      subtotal,
      streakMultiplier,
      firstAttemptBonus,
      finalScore,
    };
  }
}
