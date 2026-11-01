/**
 * @file ScoreCalculator.ts
 * @description Single Responsibility Principle (SRP) scoring engine implementing the Strategy Pattern.
 * Calculates granular score breakdowns factoring base points, elapsed solve speed,
 * compound hint penalty retention, consecutive combo multipliers, and first-attempt bonuses.
 */

/**
 * Parameters influencing challenge score calculations.
 */
export interface ScoreFactors {
  /** Base point bounty associated with the challenge difficulty. */
  basePoints: number;
  /** Countdown time remaining upon submission in seconds. */
  timeRemainingSeconds: number;
  /** Total challenge duration allowed in seconds. */
  totalTimeSeconds: number;
  /** Total count of hints consumed during the challenge. */
  hintsUsedCount: number;
  /** Percentage penalty weight applied per revealed hint (e.g., 0.15 for 15%). */
  hintPenaltyWeight: number;
  /** Current consecutive correct solution streak. */
  consecutiveStreak: number;
  /** Whether the challenge was resolved on the first review submission. */
  isFirstAttemptSuccess: boolean;
}

/**
 * Strategy interface defining custom scoring calculation algorithms.
 */
export interface IScoreStrategy {
  /**
   * Evaluates score factors to produce an integer score.
   *
   * @param factors Parameters for the active round.
   * @returns Computed final score.
   */
  calculate(factors: ScoreFactors): number;
}

/**
 * Detailed itemized breakdown of all scoring components.
 */
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

/**
 * Default arcade scoring strategy prioritizing speed, accuracy, and streak continuity.
 */
export class ArcadeScoringStrategy implements IScoreStrategy {
  /**
   * Evaluates arcade score factors using deterministic compound formulas.
   *
   * @param factors Score factors for the active solve.
   * @returns Calculated round score.
   */
  public calculate(factors: ScoreFactors): number {
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

    // Multipliers and bonuses
    const streakMultiplier = consecutiveStreak > 1
      ? Math.min(2.5, 1 + consecutiveStreak * 0.1)
      : 1.0;
    const firstAttemptBonus = isFirstAttemptSuccess ? 100 : 0;

    return Math.max(10, Math.floor(subtotal * streakMultiplier) + firstAttemptBonus);
  }
}

/**
 * ScoreCalculator context delegating evaluations to an interchangeable scoring strategy.
 */
export class ScoreCalculator {
  private strategy: IScoreStrategy;

  /**
   * Initializes the score calculator with an initial strategy.
   *
   * @param strategy The scoring strategy instance (defaults to ArcadeScoringStrategy).
   */
  constructor(strategy: IScoreStrategy = new ArcadeScoringStrategy()) {
    this.strategy = strategy;
  }

  /**
   * Swaps the active scoring strategy.
   *
   * @param strategy The new scoring strategy implementation.
   */
  public setStrategy(strategy: IScoreStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Retrieves the current scoring strategy instance.
   *
   * @returns Active scoring strategy.
   */
  public getStrategy(): IScoreStrategy {
    return this.strategy;
  }

  /**
   * Computes the final integer score using the active strategy.
   *
   * @param factors Score evaluation factors.
   * @returns Final score.
   */
  public calculate(factors: ScoreFactors): number {
    return this.strategy.calculate(factors);
  }

  /**
   * Computes an itemized mathematical breakdown of all score components.
   *
   * @param factors Score evaluation factors.
   * @returns Comprehensive breakdown object.
   */
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
