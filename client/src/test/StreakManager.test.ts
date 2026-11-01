import { describe, it, expect } from 'vitest';
import {
  StreakManager,
  type StreakRecord,
} from '../core/services/StreakManager';

describe('StreakManager (Calendar-Day Math)', () => {
  it('initializes streak on the first solve ever', () => {
    const initial = StreakManager.createInitialRecord();
    const solveDate = new Date('2026-11-01T10:00:00');

    const result = StreakManager.updateStreakOnSolve(initial, solveDate);

    expect(result.currentStreak).toBe(1);
    expect(result.highestStreak).toBe(1);
    expect(result.totalSolved).toBe(1);
    expect(result.lastSolvedTimestamp).toBe(solveDate.getTime());
  });

  it('increments totalSolved but keeps currentStreak unchanged on same-day solves', () => {
    // First solve at 09:00 on Nov 1
    const record: StreakRecord = {
      currentStreak: 1,
      highestStreak: 1,
      totalSolved: 1,
      lastSolvedTimestamp: new Date('2026-11-01T09:00:00').getTime(),
    };

    // Second solve on same day at 14:30
    const solveDate1 = new Date('2026-11-01T14:30:00');
    const result1 = StreakManager.updateStreakOnSolve(record, solveDate1);

    expect(result1.currentStreak).toBe(1);
    expect(result1.totalSolved).toBe(2);
    expect(result1.lastSolvedTimestamp).toBe(solveDate1.getTime());

    // Third solve on same day at 23:55
    const solveDate2 = new Date('2026-11-01T23:55:00');
    const result2 = StreakManager.updateStreakOnSolve(result1, solveDate2);

    expect(result2.currentStreak).toBe(1);
    expect(result2.totalSolved).toBe(3);
    expect(result2.lastSolvedTimestamp).toBe(solveDate2.getTime());
  });

  it('increments streak on consecutive calendar day (midnight rollover)', () => {
    // Solve at 23:59:59 on Day 1
    const day1Solve = new Date(2026, 10, 1, 23, 59, 59);
    const initialRecord: StreakRecord = {
      currentStreak: 2,
      highestStreak: 2,
      totalSolved: 5,
      lastSolvedTimestamp: day1Solve.getTime(),
    };

    // Solve at 00:00:05 on Day 2 (consecutive calendar day)
    const day2Solve = new Date(2026, 10, 2, 0, 0, 5);
    const result = StreakManager.updateStreakOnSolve(initialRecord, day2Solve);

    expect(result.currentStreak).toBe(3);
    expect(result.highestStreak).toBe(3);
    expect(result.totalSolved).toBe(6);
    expect(result.lastSolvedTimestamp).toBe(day2Solve.getTime());
  });

  it('resets streak to 1 after a 3-day lapse, but preserves highestStreak', () => {
    // Solve on Nov 1
    const day1 = new Date(2026, 10, 1, 12, 0, 0);
    const record: StreakRecord = {
      currentStreak: 5,
      highestStreak: 7,
      totalSolved: 15,
      lastSolvedTimestamp: day1.getTime(),
    };

    // Next solve on Nov 4 (gap of 3 days > 1)
    const day4 = new Date(2026, 10, 4, 12, 0, 0);
    const result = StreakManager.updateStreakOnSolve(record, day4);

    expect(result.currentStreak).toBe(1);
    expect(result.highestStreak).toBe(7); // Preserved!
    expect(result.totalSolved).toBe(16);
    expect(result.lastSolvedTimestamp).toBe(day4.getTime());
  });

  it('correctly tracks a multi-day consecutive streak progression', () => {
    let record = StreakManager.createInitialRecord();

    const dates = [
      new Date(2026, 9, 28, 10, 0),
      new Date(2026, 9, 29, 14, 0),
      new Date(2026, 9, 30, 18, 0),
      new Date(2026, 9, 31, 22, 0),
      new Date(2026, 10, 1, 8, 0),
    ];

    for (let i = 0; i < dates.length; i++) {
      record = StreakManager.updateStreakOnSolve(record, dates[i]);
      expect(record.currentStreak).toBe(i + 1);
      expect(record.totalSolved).toBe(i + 1);
    }

    expect(record.currentStreak).toBe(5);
    expect(record.highestStreak).toBe(5);
  });

  it('handles month and year rollover boundaries smoothly', () => {
    // Dec 31, 2026 to Jan 1, 2027
    const dec31 = new Date(2026, 11, 31, 23, 45, 0);
    const jan1 = new Date(2027, 0, 1, 0, 15, 0);

    const record: StreakRecord = {
      currentStreak: 10,
      highestStreak: 10,
      totalSolved: 30,
      lastSolvedTimestamp: dec31.getTime(),
    };

    const result = StreakManager.updateStreakOnSolve(record, jan1);

    expect(result.currentStreak).toBe(11);
    expect(result.highestStreak).toBe(11);
    expect(result.totalSolved).toBe(31);
  });

  it('proves daylight saving boundaries do not break consecutive day math', () => {
    // Simulated 23-hour day delta
    const startOfDst = new Date(2026, 2, 28, 12, 0);
    const nextDayDst = new Date(2026, 2, 29, 12, 0);

    const record: StreakRecord = {
      currentStreak: 3,
      highestStreak: 5,
      totalSolved: 10,
      lastSolvedTimestamp: startOfDst.getTime(),
    };

    const result = StreakManager.updateStreakOnSolve(record, nextDayDst);
    expect(result.currentStreak).toBe(4);
  });

  it('verifies streak active status and effective streak calculation', () => {
    const today = new Date(2026, 10, 2, 12, 0);
    const yesterday = new Date(2026, 10, 1, 12, 0);
    const threeDaysAgo = new Date(2026, 9, 29, 12, 0);

    const recordToday: StreakRecord = {
      currentStreak: 4,
      highestStreak: 4,
      totalSolved: 10,
      lastSolvedTimestamp: today.getTime(),
    };
    expect(StreakManager.isStreakActive(recordToday, today)).toBe(true);
    expect(StreakManager.getEffectiveStreak(recordToday, today)).toBe(4);

    const recordYesterday: StreakRecord = {
      ...recordToday,
      lastSolvedTimestamp: yesterday.getTime(),
    };
    expect(StreakManager.isStreakActive(recordYesterday, today)).toBe(true);
    expect(StreakManager.getEffectiveStreak(recordYesterday, today)).toBe(4);

    const recordLapsed: StreakRecord = {
      ...recordToday,
      lastSolvedTimestamp: threeDaysAgo.getTime(),
    };
    expect(StreakManager.isStreakActive(recordLapsed, today)).toBe(false);
    expect(StreakManager.getEffectiveStreak(recordLapsed, today)).toBe(0);
  });
});

