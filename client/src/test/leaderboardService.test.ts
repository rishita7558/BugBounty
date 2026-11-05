import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock in-memory storage for localStorage
const mockStorageMap = new Map<string, string>();
const mockLocalStorage: Storage = {
  getItem: (key: string) => mockStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorageMap.set(key, String(value)),
  removeItem: (key: string) => mockStorageMap.delete(key),
  clear: () => mockStorageMap.clear(),
  key: (index: number) => Array.from(mockStorageMap.keys())[index] ?? null,
  get length() {
    return mockStorageMap.size;
  },
};

(globalThis as any).localStorage = mockLocalStorage;

// In-memory local high scores store
let inMemoryHighScores: any[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    highScores: {
      count: vi.fn(async () => inMemoryHighScores.length),
      clear: vi.fn(async () => {
        inMemoryHighScores = [];
      }),
    },
  },
  getTopScores: vi.fn(async (limit = 10) => {
    return [...inMemoryHighScores].sort((a, b) => b.score - a.score).slice(0, limit);
  }),
  saveHighScore: vi.fn(async (entry: any) => {
    const id = inMemoryHighScores.length + 1;
    inMemoryHighScores.push({ ...entry, id });
    return id;
  }),
}));

import {
  fetchLeaderboard,
  submitLeaderboardScore,
  getConfiguredGistId,
  setConfiguredGistId,
  getConfiguredGistToken,
  setConfiguredGistToken,
  seedLocalLeaderboardIfEmpty,
  ARCADE_LEGENDS,
} from '@/services/leaderboardService';
import { db } from '@/lib/db';

describe('Serverless Leaderboard Service', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
    inMemoryHighScores = [];
  });

  it('manages Gist configuration keys in localStorage', () => {
    expect(getConfiguredGistId()).toBe('');
    setConfiguredGistId('test-gist-id-12345');
    expect(getConfiguredGistId()).toBe('test-gist-id-12345');

    expect(getConfiguredGistToken()).toBe('');
    setConfiguredGistToken('ghp_testtoken');
    expect(getConfiguredGistToken()).toBe('ghp_testtoken');

    setConfiguredGistId('');
    expect(getConfiguredGistId()).toBe('');
  });

  it('seeds default arcade legends when IndexedDB highScores table is empty', async () => {
    await seedLocalLeaderboardIfEmpty();
    const count = await db.highScores.count();
    expect(count).toBe(ARCADE_LEGENDS.length);
  });

  it('falls back seamlessly to IndexedDB when no Gist is configured', async () => {
    const result = await fetchLeaderboard();
    expect(result.source).toBe('indexeddb');
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries[0].score).toBeGreaterThanOrEqual(result.entries[1].score);
  });

  it('submits a score and persists it in local IndexedDB', async () => {
    const res = await submitLeaderboardScore({
      callsign: 'TEST_HACKER',
      score: 9999,
      totalSolved: 10,
      maxCombo: 5,
      difficulty: 'hard',
      language: 'typescript',
      topic: 'ts-type-narrowing',
      timestamp: Date.now(),
    });

    expect(res.success).toBe(true);
    expect(res.entry.callsign).toBe('TEST_HACKER');

    const leaderboard = await fetchLeaderboard();
    const top = leaderboard.entries[0];
    expect(top.callsign).toBe('TEST_HACKER');
    expect(top.score).toBe(9999);
  });

  it('handles simulated Gist fetch response gracefully', async () => {
    setConfiguredGistId('mock-gist-id');

    const mockGistData = {
      files: {
        'bugbounty-leaderboard.json': {
          content: JSON.stringify([
            {
              callsign: 'GIST_CHAMPION',
              score: 12000,
              totalSolved: 40,
              maxCombo: 12,
              difficulty: 'hard',
              language: 'python',
              timestamp: Date.now(),
            },
          ]),
        },
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGistData,
    } as any);

    try {
      const result = await fetchLeaderboard({ gistId: 'mock-gist-id' });
      expect(result.source).toBe('gist');
      expect(result.entries[0].callsign).toBe('GIST_CHAMPION');
      expect(result.entries[0].score).toBe(12000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
