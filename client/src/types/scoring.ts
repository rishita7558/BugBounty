/**
 * @file scoring.ts
 * @description Types and models for the Dual-Score System.
 * Decouples session-scoped game points from career persistent lifetime scores.
 */

export interface UserScoreState {
  /** Points earned during the active browser session (in-memory / sessionStorage). */
  sessionScore: number;
  /** Cumulative points across all completed sessions persisted in IndexedDB. */
  lifetimeScore: number;
  /** Bounties squashed in the current session. */
  sessionBountiesSolved: number;
  /** Lifetime bounties squashed across all browser sessions. */
  lifetimeBountiesSolved: number;
}

export interface ScoreDeltaPayload {
  basePoints: number;
  hintDeductions: number;
  speedBonus: number;
  streakMultiplier?: number;
  netDelta: number;
}

