/**
 * @file leaderboardService.ts
 * @description Serverless leaderboard client service for BugBounty.
 * Employs GitHub Gist as an open, zero-database global leaderboard backend with
 * automatic, resilient fallback to client-side IndexedDB (Dexie) storage when offline or unconfigured.
 */

import { db, getTopScores, saveHighScore } from '@/lib/db';

export interface LeaderboardEntry {
  id: string;
  callsign: string;
  score: number;
  totalSolved: number;
  maxCombo: number;
  difficulty: string;
  language: string;
  topic?: string;
  timestamp: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  source: 'gist' | 'indexeddb';
  gistId?: string;
  error?: string;
}

const GIST_ID_KEY = 'bugbounty_leaderboard_gist_id';
const GIST_TOKEN_KEY = 'bugbounty_leaderboard_gist_token';
const GIST_FILENAME = 'bugbounty-leaderboard.json';

/**
 * Curated arcade legends seeded into local storage to provide authentic leaderboard competition.
 */
export const ARCADE_LEGENDS: Omit<LeaderboardEntry, 'id'>[] = [
  {
    callsign: 'ZERO_DAY_ZERO',
    score: 8450,
    totalSolved: 28,
    maxCombo: 9,
    difficulty: 'hard',
    language: 'typescript',
    topic: 'ts-generics-constraints',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    callsign: 'CYBER_VIPER',
    score: 6200,
    totalSolved: 19,
    maxCombo: 7,
    difficulty: 'hard',
    language: 'python',
    topic: 'py-asyncio-gil',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    callsign: 'SYNTAX_PHANTOM',
    score: 4850,
    totalSolved: 15,
    maxCombo: 6,
    difficulty: 'medium',
    language: 'javascript',
    topic: 'js-async-event-loop',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
  {
    callsign: 'BYTE_PUNKER',
    score: 3100,
    totalSolved: 11,
    maxCombo: 4,
    difficulty: 'medium',
    language: 'python',
    topic: 'py-mutable-defaults',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    callsign: 'NOVICE_REAPER',
    score: 1450,
    totalSolved: 5,
    maxCombo: 3,
    difficulty: 'easy',
    language: 'javascript',
    topic: 'js-closures-scope',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
];

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    // Storage access restricted or undefined
  }
  return null;
}

/**
 * Retrieves the configured GitHub Gist ID from browser localStorage.
 */
export function getConfiguredGistId(): string {
  const storage = getStorage();
  return storage ? storage.getItem(GIST_ID_KEY) || '' : '';
}

/**
 * Saves a custom GitHub Gist ID to browser localStorage.
 */
export function setConfiguredGistId(gistId: string): void {
  const storage = getStorage();
  if (!storage) return;
  if (!gistId.trim()) {
    storage.removeItem(GIST_ID_KEY);
  } else {
    storage.setItem(GIST_ID_KEY, gistId.trim());
  }
}

/**
 * Retrieves GitHub Personal Access Token from browser localStorage.
 */
export function getConfiguredGistToken(): string {
  const storage = getStorage();
  return storage ? storage.getItem(GIST_TOKEN_KEY) || '' : '';
}

/**
 * Saves GitHub Personal Access Token to browser localStorage.
 */
export function setConfiguredGistToken(token: string): void {
  const storage = getStorage();
  if (!storage) return;
  if (!token.trim()) {
    storage.removeItem(GIST_TOKEN_KEY);
  } else {
    storage.setItem(GIST_TOKEN_KEY, token.trim());
  }
}

/**
 * Seeds default arcade champions into IndexedDB if highScores table is empty.
 */
export async function seedLocalLeaderboardIfEmpty(): Promise<void> {
  try {
    const count = await db.highScores.count();
    if (count === 0) {
      for (const legend of ARCADE_LEGENDS) {
        await saveHighScore({
          playerName: legend.callsign,
          score: legend.score,
          totalSolved: legend.totalSolved,
          maxCombo: legend.maxCombo,
          difficulty: legend.difficulty,
          timestamp: legend.timestamp,
        });
      }
    }
  } catch (err) {
    console.warn('[Leaderboard] Failed to seed default arcade champions:', err);
  }
}

/**
 * Fetches the active leaderboard from a configured GitHub Gist, falling back
 * automatically to IndexedDB local persistence if offline, rate limited, or unconfigured.
 *
 * @param options Query and configuration parameters.
 * @returns Leaderboard results with provenance source flag ('gist' or 'indexeddb').
 */
export async function fetchLeaderboard(options: {
  gistId?: string;
  limit?: number;
} = {}): Promise<LeaderboardResult> {
  const limit = options.limit || 50;
  const activeGistId = options.gistId || getConfiguredGistId();

  // 1. Attempt Gist retrieval if an ID is present
  if (activeGistId) {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      const token = getConfiguredGistToken();
      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const res = await fetch(`https://api.github.com/gists/${activeGistId}`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        const file = data.files?.[GIST_FILENAME] || Object.values(data.files || {})[0] as any;
        if (file && file.content) {
          const parsed = JSON.parse(file.content);
          const rawEntries: any[] = Array.isArray(parsed) ? parsed : parsed.leaderboard || [];
          const entries: LeaderboardEntry[] = rawEntries
            .map((item, index) => ({
              id: item.id || `gist-${index}-${item.timestamp || Date.now()}`,
              callsign: item.callsign || item.playerName || 'ANON_HUNTER',
              score: Number(item.score) || 0,
              totalSolved: Number(item.totalSolved) || 1,
              maxCombo: Number(item.maxCombo) || 1,
              difficulty: item.difficulty || 'medium',
              language: item.language || 'javascript',
              topic: item.topic,
              timestamp: Number(item.timestamp) || Date.now(),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

          return {
            entries,
            source: 'gist',
            gistId: activeGistId,
          };
        }
      } else {
        console.warn(`[Leaderboard] Gist request returned HTTP ${res.status}. Falling back to IndexedDB.`);
      }
    } catch (err: any) {
      console.warn('[Leaderboard] Gist fetch error, switching to IndexedDB fallback:', err?.message);
    }
  }

  // 2. Seamless IndexedDB fallback
  await seedLocalLeaderboardIfEmpty();
  const localScores = await getTopScores(limit);

  const localEntries: LeaderboardEntry[] = localScores.map((h, i) => ({
    id: `local-${h.id ?? i}`,
    callsign: h.playerName,
    score: h.score,
    totalSolved: h.totalSolved,
    maxCombo: h.maxCombo,
    difficulty: h.difficulty,
    language: 'javascript',
    timestamp: h.timestamp,
  }));

  return {
    entries: localEntries,
    source: 'indexeddb',
    gistId: activeGistId || undefined,
  };
}

/**
 * Records a new score on the leaderboard.
 * Always persists locally to IndexedDB, and asynchronously synchronizes with the
 * configured GitHub Gist if authentication tokens are provided.
 *
 * @param entry The new score entry to record.
 * @returns Result object with persistence confirmation.
 */
export async function submitLeaderboardScore(
  entry: Omit<LeaderboardEntry, 'id'>
): Promise<{ success: boolean; syncedToGist: boolean; entry: LeaderboardEntry }> {
  // 1. Always persist to IndexedDB
  await saveHighScore({
    playerName: entry.callsign,
    score: entry.score,
    totalSolved: entry.totalSolved,
    maxCombo: entry.maxCombo,
    difficulty: entry.difficulty,
    timestamp: entry.timestamp,
  });

  const fullEntry: LeaderboardEntry = {
    ...entry,
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  let syncedToGist = false;
  const activeGistId = getConfiguredGistId();
  const token = getConfiguredGistToken();

  // 2. Sync to Gist if credentials exist
  if (activeGistId && token) {
    try {
      const getRes = await fetch(`https://api.github.com/gists/${activeGistId}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`,
        },
      });

      if (getRes.ok) {
        const gistData = await getRes.json();
        const file = gistData.files?.[GIST_FILENAME] || Object.values(gistData.files || {})[0] as any;
        let existingList: LeaderboardEntry[] = [];
        if (file?.content) {
          try {
            const parsed = JSON.parse(file.content);
            existingList = Array.isArray(parsed) ? parsed : parsed.leaderboard || [];
          } catch {
            existingList = [];
          }
        }

        const merged = [...existingList, fullEntry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);

        const patchRes = await fetch(`https://api.github.com/gists/${activeGistId}`, {
          method: 'PATCH',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: {
              [GIST_FILENAME]: {
                content: JSON.stringify(merged, null, 2),
              },
            },
          }),
        });

        if (patchRes.ok) {
          syncedToGist = true;
        }
      }
    } catch (err) {
      console.warn('[Leaderboard] Failed to sync score to GitHub Gist:', err);
    }
  }

  return {
    success: true,
    syncedToGist,
    entry: fullEntry,
  };
}
