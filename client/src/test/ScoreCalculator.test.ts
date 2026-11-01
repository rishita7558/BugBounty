import { describe, it, expect } from 'vitest';
import {
  ScoreCalculator,
  ArcadeScoringStrategy,
  type ScoreFactors,
  type IScoreStrategy,
} from '../core/engine/ScoreCalculator';

describe('ScoreCalculator & ArcadeScoringStrategy', () => {
  const strategy = new ArcadeScoringStrategy();
  const calculator = new ScoreCalculator(strategy);

  it('calculates score with full time bonus and no penalties', () => {
    const factors: ScoreFactors = {
      basePoints: 100,
      timeRemainingSeconds: 60,
      totalTimeSeconds: 60,
      hintsUsedCount: 0,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 1,
      isFirstAttemptSuccess: false,
    };

    // timeBonus = floor(100 * 0.5 * 1) = 50
    // subtotal = 150 * (1 - 0) = 150
    // streakMultiplier = 1.0 (streak <= 1)
    // bonus = 0
    // final = 150
    expect(calculator.calculate(factors)).toBe(150);
  });

  it('awards +100 first attempt bonus', () => {
    const factors: ScoreFactors = {
      basePoints: 100,
      timeRemainingSeconds: 0,
      totalTimeSeconds: 60,
      hintsUsedCount: 0,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 1,
      isFirstAttemptSuccess: true,
    };

    // timeBonus = 0
    // subtotal = 100
    // streakMultiplier = 1.0
    // firstAttemptBonus = 100
    // final = 200
    expect(calculator.calculate(factors)).toBe(200);
  });

  it('applies 15% hint deduction per hint used', () => {
    const factors1Hint: ScoreFactors = {
      basePoints: 100,
      timeRemainingSeconds: 0,
      totalTimeSeconds: 60,
      hintsUsedCount: 1,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 1,
      isFirstAttemptSuccess: false,
    };
    // subtotal = floor(100 * (1 - 0.15)) = 85
    expect(calculator.calculate(factors1Hint)).toBe(85);

    const factors2Hints: ScoreFactors = {
      ...factors1Hint,
      hintsUsedCount: 2,
    };
    // subtotal = floor(100 * (1 - 0.30)) = 70
    expect(calculator.calculate(factors2Hints)).toBe(70);
  });

  it('caps hint penalty at 80% maximum loss', () => {
    const factorsManyHints: ScoreFactors = {
      basePoints: 100,
      timeRemainingSeconds: 0,
      totalTimeSeconds: 60,
      hintsUsedCount: 6, // 6 * 0.15 = 0.90 -> capped at 0.80
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 1,
      isFirstAttemptSuccess: false,
    };

    // subtotal = floor(100 * (1 - 0.80)) = 20
    expect(calculator.calculate(factorsManyHints)).toBe(20);
  });

  it('applies consecutive streak multiplier up to 2.5x cap', () => {
    const streak5Factors: ScoreFactors = {
      basePoints: 100,
      timeRemainingSeconds: 0,
      totalTimeSeconds: 60,
      hintsUsedCount: 0,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 5, // 1 + 5 * 0.1 = 1.5x
      isFirstAttemptSuccess: false,
    };
    // subtotal = 100 * 1.5 = 150
    expect(calculator.calculate(streak5Factors)).toBe(150);

    const streak20Factors: ScoreFactors = {
      ...streak5Factors,
      consecutiveStreak: 20, // 1 + 2.0 = 3.0 -> capped at 2.5x
    };
    // subtotal = 100 * 2.5 = 250
    expect(calculator.calculate(streak20Factors)).toBe(250);
  });

  it('enforces a minimum score floor of 10 points', () => {
    const minFactors: ScoreFactors = {
      basePoints: 0,
      timeRemainingSeconds: 0,
      totalTimeSeconds: 60,
      hintsUsedCount: 5,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 0,
      isFirstAttemptSuccess: false,
    };

    expect(calculator.calculate(minFactors)).toBe(10);
  });

  it('provides an itemized score breakdown matching the final score', () => {
    const factors: ScoreFactors = {
      basePoints: 200,
      timeRemainingSeconds: 30,
      totalTimeSeconds: 60,
      hintsUsedCount: 1,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 3,
      isFirstAttemptSuccess: true,
    };

    const breakdown = calculator.calculateBreakdown(factors);
    expect(breakdown.basePoints).toBe(200);
    expect(breakdown.timeBonus).toBe(50); // 200 * 0.5 * 0.5 = 50
    expect(breakdown.hintPenaltyRatio).toBeCloseTo(0.15);
    expect(breakdown.streakMultiplier).toBeCloseTo(1.3);
    expect(breakdown.firstAttemptBonus).toBe(100);
    expect(breakdown.finalScore).toBe(calculator.calculate(factors));
  });

  it('supports runtime strategy swapping (Strategy Pattern)', () => {
    class FlatScoringStrategy implements IScoreStrategy {
      calculate(factors: ScoreFactors): number {
        return factors.basePoints;
      }
    }

    const customCalc = new ScoreCalculator(new FlatScoringStrategy());
    const factors: ScoreFactors = {
      basePoints: 50,
      timeRemainingSeconds: 10,
      totalTimeSeconds: 60,
      hintsUsedCount: 2,
      hintPenaltyWeight: 0.15,
      consecutiveStreak: 10,
      isFirstAttemptSuccess: true,
    };

    expect(customCalc.calculate(factors)).toBe(50);

    // Swap back to Arcade strategy
    customCalc.setStrategy(new ArcadeScoringStrategy());
    expect(customCalc.calculate(factors)).toBeGreaterThan(50);
  });
});

