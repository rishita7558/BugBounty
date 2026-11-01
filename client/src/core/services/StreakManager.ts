/**
 * @file StreakManager.ts
 * @description Calendar-day streak calculation service.
 * Normalizes timestamps to midnight boundaries to deterministically distinguish between
 * multiple same-day solves, consecutive-day progressions, and lapsed streaks across timezones.
 */

/**
 * State record storing player streak progression.
 */
export interface StreakRecord {
  /** Current active consecutive calendar-day streak. */
  currentStreak: number;
  /** All-time highest calendar-day streak achieved. */
  highestStreak: number;
  /** Cumulative total of all challenges solved. */
  totalSolved: number;
  /** Unix epoch timestamp (ms) of the most recently verified solve. */
  lastSolvedTimestamp: number | null;
}

/**
 * Manager handling deterministic calendar-day streak transitions.
 */
export class StreakManager {
  private static readonly MS_PER_DAY = 1000 * 60 * 60 * 24;

  /**
   * Factory method creating a clean initial streak record.
   *
   * @returns Initialized streak record.
   */
  public static createInitialRecord(): StreakRecord {
    return {
      currentStreak: 0,
      highestStreak: 0,
      totalSolved: 0,
      lastSolvedTimestamp: null,
    };
  }

  /**
   * Updates streak and solved challenge metrics upon completing a challenge.
   * Uses local midnight normalization to evaluate the calendar-day delta.
   *
   * @param currentRecord The existing streak record.
   * @param solveDate Timestamp of the verified solve (defaults to current time).
   * @returns Updated streak record.
   */
  public static updateStreakOnSolve(
    currentRecord: StreakRecord,
    solveDate: Date = new Date()
  ): StreakRecord {
    const totalSolved = currentRecord.totalSolved + 1;

    if (!currentRecord.lastSolvedTimestamp) {
      return {
        currentStreak: 1,
        highestStreak: Math.max(1, currentRecord.highestStreak),
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    }

    const lastDate = new Date(currentRecord.lastSolvedTimestamp);

    // Normalize dates to local midnight for zero-hour day delta
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

    const dayDifference = Math.round(
      (currentDayStart - lastDayStart) / this.MS_PER_DAY
    );

    if (dayDifference === 0) {
      // Solved another challenge on the same calendar day: streak count remains unchanged
      return {
        ...currentRecord,
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else if (dayDifference === 1) {
      // Consecutive calendar day: streak increments
      const nextStreak = currentRecord.currentStreak + 1;
      return {
        currentStreak: nextStreak,
        highestStreak: Math.max(nextStreak, currentRecord.highestStreak),
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else if (dayDifference > 1) {
      // Missed day boundary: streak broken and resets to 1
      return {
        currentStreak: 1,
        highestStreak: currentRecord.highestStreak,
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else {
      // Clock skew or out-of-order solve timestamp: preserve streak and update latest timestamp
      return {
        ...currentRecord,
        totalSolved,
        lastSolvedTimestamp: Math.max(
          currentRecord.lastSolvedTimestamp,
          solveDate.getTime()
        ),
      };
    }
  }

  /**
   * Verifies whether the streak is currently alive or eligible for continuation.
   *
   * @param record The player streak record.
   * @param checkDate Comparison date (defaults to current time).
   * @returns True if solved today or yesterday.
   */
  public static isStreakActive(
    record: StreakRecord,
    checkDate: Date = new Date()
  ): boolean {
    if (!record.lastSolvedTimestamp || record.currentStreak <= 0) return false;

    const lastDate = new Date(record.lastSolvedTimestamp);
    const lastDayStart = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate()
    ).getTime();
    const currentDayStart = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate()
    ).getTime();

    const dayDiff = Math.round(
      (currentDayStart - lastDayStart) / this.MS_PER_DAY
    );
    return dayDiff <= 1;
  }

  /**
   * Computes the effective streak count accounting for elapsed inactive days.
   *
   * @param record The player streak record.
   * @param checkDate Comparison date (defaults to current time).
   * @returns Effective streak number (returns 0 if streak has lapsed).
   */
  public static getEffectiveStreak(
    record: StreakRecord,
    checkDate: Date = new Date()
  ): number {
    if (!record.lastSolvedTimestamp || record.currentStreak <= 0) return 0;
    return this.isStreakActive(record, checkDate) ? record.currentStreak : 0;
  }
}
