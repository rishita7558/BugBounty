import { describe, it, expect } from 'vitest';
import { StreakEngine } from '../services/StreakEngine';

describe('StreakEngine Calendar Day Math', () => {
  const refDate = new Date('2026-11-02T14:30:00');

  it('returns zeros when completion dates list is empty', () => {
    const result = StreakEngine.calculateStreak([], refDate);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.isActiveToday).toBe(false);
  });

  it('multiple solves on the same calendar day count as a single active day', () => {
    const dates = [
      '2026-11-02T08:00:00Z',
      '2026-11-02T12:00:00Z',
      '2026-11-02T14:00:00Z',
    ];
    const result = StreakEngine.calculateStreak(dates, refDate);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isActiveToday).toBe(true);
  });

  it('increments streak across consecutive calendar days', () => {
    const dates = [
      '2026-10-31T10:00:00Z',
      '2026-11-01T15:00:00Z',
      '2026-11-02T09:00:00Z',
    ];
    const result = StreakEngine.calculateStreak(dates, refDate);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.isActiveToday).toBe(true);
  });

  it('preserves current streak when solved yesterday but not yet today', () => {
    const dates = [
      '2026-10-31T10:00:00Z',
      '2026-11-01T15:00:00Z',
    ];
    const result = StreakEngine.calculateStreak(dates, refDate);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.isActiveToday).toBe(false);
  });

  it('resets current streak to 0 when last solve was >1 day ago while preserving longest streak', () => {
    const dates = [
      '2026-10-25T10:00:00Z',
      '2026-10-26T10:00:00Z',
      '2026-10-27T10:00:00Z',
      '2026-10-28T10:00:00Z', // gap between Oct 28 and Nov 2
    ];
    const result = StreakEngine.calculateStreak(dates, refDate);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(4);
    expect(result.isActiveToday).toBe(false);
  });

  it('handles Date objects as well as ISO strings', () => {
    const dates = [
      new Date('2026-11-01T12:00:00'),
      new Date('2026-11-02T08:00:00'),
    ];
    const result = StreakEngine.calculateStreak(dates, refDate);
    expect(result.currentStreak).toBe(2);
    expect(result.isActiveToday).toBe(true);
  });
});

