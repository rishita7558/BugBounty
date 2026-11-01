// client/src/core/services/StreakManager.ts

export interface StreakRecord {
  currentStreak: number;
  highestStreak: number;
  totalSolved: number;
  lastSolvedTimestamp: number | null; // Unix epoch ms
}

export class StreakManager {
  private static MS_PER_DAY = 1000 * 60 * 60 * 24;

  /**
   * Factory method to create a clean initial streak record.
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
   * Updates streak and solved problem counts on a verified solve.
   * Uses local calendar-day boundary normalization (midnight to 23:59:59).
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
      // Solved another problem on the same calendar day: streak unchanged
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
      // Day gap > 1: streak broken, reset to 1
      return {
        currentStreak: 1,
        highestStreak: currentRecord.highestStreak,
        totalSolved,
        lastSolvedTimestamp: solveDate.getTime(),
      };
    } else {
      // Negative day difference (clock skew/re-ordered solve date)
      // Keep streak unchanged, update totalSolved and latest timestamp
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
   * Checks if the streak is still alive today or eligible to continue.
   * True if solved today (dayDiff=0) or yesterday (dayDiff=1).
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
   * Returns current active streak count. If more than 1 day has passed without
   * solving, the active streak has lapsed and reports 0 until resumed.
   */
  public static getEffectiveStreak(
    record: StreakRecord,
    checkDate: Date = new Date()
  ): number {
    if (!record.lastSolvedTimestamp || record.currentStreak <= 0) return 0;
    return this.isStreakActive(record, checkDate) ? record.currentStreak : 0;
  }
}

