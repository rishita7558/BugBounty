import Dexie, { type EntityTable } from 'dexie';

// ---------------------------------------------------------------------------
// Dexie.js IndexedDB Schema — Zero-Database Persistence Layer
// ---------------------------------------------------------------------------

export interface HighScore {
  id?: number;
  playerName: string;
  score: number;
  totalSolved: number;
  maxCombo: number;
  difficulty: string;
  timestamp: number;
}

export interface RunHistory {
  id?: number;
  challengeId: string;
  challengeTitle: string;
  playerCode: string;
  correct: boolean;
  score: number;
  timeSpent: number;
  timestamp: number;
}

export interface Badge {
  id?: number;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

class CodeDuelDB extends Dexie {
  highScores!: EntityTable<HighScore, 'id'>;
  runHistory!: EntityTable<RunHistory, 'id'>;
  badges!: EntityTable<Badge, 'id'>;

  constructor() {
    super('CodeDuelBugBounty');
    this.version(1).stores({
      highScores: '++id, score, playerName, timestamp',
      runHistory: '++id, challengeId, timestamp, correct',
      badges: '++id, name, unlockedAt',
    });
  }
}

export const db = new CodeDuelDB();

// ── Repository Queries ─────────────────────────────────────────────────────

export async function getTopScores(limit = 10): Promise<HighScore[]> {
  return db.highScores.orderBy('score').reverse().limit(limit).toArray();
}

export async function saveHighScore(entry: Omit<HighScore, 'id'>): Promise<number> {
  return db.highScores.add(entry as HighScore);
}

export async function getRunHistory(limit = 50): Promise<RunHistory[]> {
  return db.runHistory.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function saveRun(entry: Omit<RunHistory, 'id'>): Promise<number> {
  return db.runHistory.add(entry as RunHistory);
}

export async function getUnlockedBadges(): Promise<Badge[]> {
  return db.badges.orderBy('unlockedAt').reverse().toArray();
}

export async function unlockBadge(badge: Omit<Badge, 'id'>): Promise<number> {
  const exists = await db.badges.where('name').equals(badge.name).first();
  if (exists) return exists.id!;
  return db.badges.add(badge as Badge);
}
