/**
 * @file StreakEngine.ts
 * @description Domain service for calculating true calendar-day streaks.
 * Adheres strictly to Single Responsibility Principle (SRP) and neutralizes timestamp hours/minutes.
 */

export class StreakEngine {
  /**
   * Computes the current consecutive day streak.
   * @param completionDates Array of ISO timestamp strings or Date objects when bounties were cleared.
   * @param referenceDate Default is current date (for deterministic testing).
   */
  public static calculateStreak(completionDates: (string | Date)[], referenceDate: Date = new Date()): {
    currentStreak: number;
    longestStreak: number;
    isActiveToday: boolean;
  } {
    if (!completionDates || completionDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, isActiveToday: false };
    }

    // Normalize dates to unique YYYY-MM-DD local strings to neutralize timestamp hours/minutes
    const uniqueDays = Array.from(
      new Set(
        completionDates.map((d) => {
          const date = typeof d === 'string' ? new Date(d) : d;
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        })
      )
    ).sort().reverse(); // Descending order: today/yesterday first

    const toLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const todayStr = toLocalDateStr(referenceDate);
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    const isActiveToday = uniqueDays.includes(todayStr);

    // If solved neither today nor yesterday, active streak is 0
    if (!isActiveToday && !uniqueDays.includes(yesterdayStr)) {
      return {
        currentStreak: 0,
        longestStreak: this.calculateLongest(uniqueDays),
        isActiveToday: false,
      };
    }

    // Walk backward day-by-day from the latest active anchor (today or yesterday)
    let currentStreak = 0;
    const checkDate = new Date(isActiveToday ? referenceDate : yesterday);

    while (uniqueDays.includes(toLocalDateStr(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, this.calculateLongest(uniqueDays)),
      isActiveToday,
    };
  }

  private static calculateLongest(sortedDescDays: string[]): number {
    if (sortedDescDays.length === 0) return 0;
    // Ascending order for longest chain calculation
    const ascDays = [...sortedDescDays].reverse();
    let maxChain = 1;
    let currentChain = 1;

    for (let i = 1; i < ascDays.length; i++) {
      const prev = new Date(ascDays[i - 1]);
      const curr = new Date(ascDays[i]);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentChain++;
        maxChain = Math.max(maxChain, currentChain);
      } else if (diffDays > 1) {
        currentChain = 1;
      }
    }
    return maxChain;
  }
}

