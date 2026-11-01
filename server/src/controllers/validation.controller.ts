/**
 * @file validation.controller.ts
 * @description Controller providing server-side mathematical validation and integrity verification.
 * Implements deterministic verification for arcade scoring breakdowns, calendar-day streak boundaries,
 * and progressive hint state machine rules.
 */

import type { Request, Response, NextFunction } from 'express';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Score calculation factor parameters submitted for validation.
 */
export interface ServerScoreFactors {
  basePoints: number;
  timeRemainingSeconds: number;
  totalTimeSeconds: number;
  hintsUsedCount: number;
  hintPenaltyWeight?: number;
  consecutiveStreak: number;
  isFirstAttemptSuccess: boolean;
}

/**
 * Streak progression record submitted for calendar-day verification.
 */
export interface ServerStreakRecord {
  currentStreak: number;
  highestStreak: number;
  totalSolved: number;
  lastSolvedTimestamp: number | null;
}

/**
 * Validates and recalculates game score on the server according to the Arcade Scoring Engine formula.
 *
 * @param req Request containing score calculation factors in the body.
 * @param res Response delivering the recalculated score and detailed mathematical breakdown.
 * @param next Express error forwarding function.
 */
export function validateScore(req: Request, res: Response, next: NextFunction) {
  try {
    const factors = req.body as ServerScoreFactors;

    const basePoints = Math.max(0, factors.basePoints || 0);
    const timeRemainingSeconds = Math.max(0, factors.timeRemainingSeconds || 0);
    const totalTimeSeconds = Math.max(1, factors.totalTimeSeconds || 120);
    const hintsUsedCount = Math.max(0, factors.hintsUsedCount || 0);
    const hintPenaltyWeight = factors.hintPenaltyWeight ?? 0.15;
    const consecutiveStreak = Math.max(0, factors.consecutiveStreak || 0);
    const isFirstAttemptSuccess = Boolean(factors.isFirstAttemptSuccess);

    const timeRatio = Math.max(0, Math.min(1, timeRemainingSeconds / totalTimeSeconds));
    const timeBonus = Math.floor(basePoints * 0.5 * timeRatio);

    const totalPenaltyRatio = Math.min(0.80, hintsUsedCount * hintPenaltyWeight);
    const retentionRatio = Math.round((1 - totalPenaltyRatio) * 1e6) / 1e6;
    const subtotal = Math.floor((basePoints + timeBonus) * retentionRatio);

    const streakMultiplier = consecutiveStreak > 1
      ? Math.min(2.5, 1 + consecutiveStreak * 0.1)
      : 1.0;
    const firstAttemptBonus = isFirstAttemptSuccess ? 100 : 0;

    const finalScore = Math.max(10, Math.floor(subtotal * streakMultiplier) + firstAttemptBonus);

    res.json({
      valid: true,
      finalScore,
      breakdown: {
        basePoints,
        timeBonus,
        timeRatio,
        hintPenaltyRatio: totalPenaltyRatio,
        subtotal,
        streakMultiplier,
        firstAttemptBonus,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validates and computes streak progression using normalized calendar-day arithmetic.
 *
 * @param req Request containing current streak record and optional solve timestamp.
 * @param res Response delivering validated streak progression and day delta.
 * @param next Express error forwarding function.
 */
export function validateStreak(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentRecord, solveTimestamp } = req.body as {
      currentRecord: ServerStreakRecord;
      solveTimestamp?: number;
    };

    if (!currentRecord) {
      res.status(400).json({ error: 'currentRecord is required' });
      return;
    }

    const solveDate = solveTimestamp ? new Date(solveTimestamp) : new Date();
    const totalSolved = (currentRecord.totalSolved || 0) + 1;

    if (!currentRecord.lastSolvedTimestamp) {
      const updated: ServerStreakRecord = {
        currentStreak: 1,
        highestStreak: Math.max(1, currentRecord.highestStreak || 0),
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
      res.json({ valid: true, updatedRecord: updated, dayDifference: null });
      return;
    }

    const lastDate = new Date(currentRecord.lastSolvedTimestamp);
    const lastDayStart = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate()
    ).getTime();
    const currentDayStart = new Date(
      solveDate.getFullYear(),
      solveDate.getMonth(),
      solveDate.getDate()
    ).getTime();

    const dayDifference = Math.round((currentDayStart - lastDayStart) / MS_PER_DAY);

    let updatedRecord: ServerStreakRecord;

    if (dayDifference === 0) {
      updatedRecord = {
        ...currentRecord,
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else if (dayDifference === 1) {
      const nextStreak = (currentRecord.currentStreak || 0) + 1;
      updatedRecord = {
        currentStreak: nextStreak,
        highestStreak: Math.max(nextStreak, currentRecord.highestStreak || 0),
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else {
      updatedRecord = {
        currentStreak: 1,
        highestStreak: currentRecord.highestStreak || 0,
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    }

    res.json({
      valid: true,
      dayDifference,
      streakMaintained: dayDifference <= 1,
      updatedRecord,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validates whether an incoming hint request satisfies state machine prerequisites.
 *
 * @param req Request containing hintsUsed, maxHints, timeRemaining, and game phase.
 * @param res Response indicating validation approval, next hint level, and applied penalty.
 * @param next Express error forwarding function.
 */
export function validateHintRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { hintsUsed, maxHints = 3, timeRemaining, phase } = req.body as {
      hintsUsed: number;
      maxHints?: number;
      timeRemaining: number;
      phase: string;
    };

    if (phase !== 'playing') {
      res.status(400).json({ valid: false, reason: 'Gameplay is not in active playing phase.' });
      return;
    }

    if (timeRemaining <= 0) {
      res.status(400).json({ valid: false, reason: 'Countdown timer has expired.' });
      return;
    }

    if (hintsUsed >= maxHints) {
      res.status(400).json({ valid: false, reason: 'All available hints have been used.' });
      return;
    }

    const nextHintLevel = hintsUsed + 1;
    const penaltyPercent = 15;

    res.json({
      valid: true,
      allowed: true,
      nextHintLevel,
      penaltyPercent,
    });
  } catch (err) {
    next(err);
  }
}
