/**
 * @file useScoreStore.ts
 * @description State store implementing the Dual-Score System.
 * Manages sessionScore (scoped to active tab/sessionStorage) and lifetimeScore (Dexie.js IndexedDB).
 */

import { create } from 'zustand';
import type { UserScoreState } from '@/types/scoring';
import { getPlayerProfile, updatePlayerProfile, db } from '@/lib/db';

const SESSION_SCORE_KEY = 'bugbounty_session_score';
const SESSION_BOUNTIES_KEY = 'bugbounty_session_bounties';

function getSessionStorageNumber(key: string, defaultVal = 0): number {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const val = sessionStorage.getItem(key);
    return val !== null ? parseInt(val, 10) || defaultVal : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setSessionStorageNumber(key: string, val: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, String(val));
  } catch {
    // Ignore quota or private-browsing restrictions
  }
}

export interface ScoreStoreState extends UserScoreState {
  isHydrated: boolean;
  hydrateScores: () => Promise<void>;
  recordBountyVictory: (netDelta: number) => Promise<void>;
  resetSessionScore: () => void;
}

export const useScoreStore = create<ScoreStoreState>()((set, get) => ({
  sessionScore: getSessionStorageNumber(SESSION_SCORE_KEY, 0),
  sessionBountiesSolved: getSessionStorageNumber(SESSION_BOUNTIES_KEY, 0),
  lifetimeScore: 0,
  lifetimeBountiesSolved: 0,
  isHydrated: false,

  hydrateScores: async () => {
    try {
      const profile = await getPlayerProfile();
      const solvedCount = await db.solvedChallenges.count();
      set({
        lifetimeScore: profile.totalScore || 0,
        lifetimeBountiesSolved: solvedCount,
        isHydrated: true,
      });
    } catch (err) {
      console.warn('[useScoreStore] Failed to hydrate lifetime scores from Dexie:', err);
      set({ isHydrated: true });
    }
  },

  recordBountyVictory: async (netDelta: number) => {
    const delta = Math.max(0, Math.round(netDelta));
    const current = get();

    const newSessionScore = current.sessionScore + delta;
    const newSessionBounties = current.sessionBountiesSolved + 1;
    const newLifetimeScore = current.lifetimeScore + delta;
    const newLifetimeBounties = current.lifetimeBountiesSolved + 1;

    // Update session storage immediately
    setSessionStorageNumber(SESSION_SCORE_KEY, newSessionScore);
    setSessionStorageNumber(SESSION_BOUNTIES_KEY, newSessionBounties);

    // Update in-memory state
    set({
      sessionScore: newSessionScore,
      sessionBountiesSolved: newSessionBounties,
      lifetimeScore: newLifetimeScore,
      lifetimeBountiesSolved: newLifetimeBounties,
    });

    // Transactional write to Dexie.js profile
    try {
      await updatePlayerProfile({
        totalScore: newLifetimeScore,
      });
    } catch (err) {
      console.error('[useScoreStore] Failed to update lifetime score in IndexedDB:', err);
    }
  },

  resetSessionScore: () => {
    setSessionStorageNumber(SESSION_SCORE_KEY, 0);
    setSessionStorageNumber(SESSION_BOUNTIES_KEY, 0);
    set({
      sessionScore: 0,
      sessionBountiesSolved: 0,
    });
  },
}));

