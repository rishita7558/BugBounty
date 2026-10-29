import Dexie, { type Table } from 'dexie';

// ---------------------------------------------------------------------------
// Dexie.js IndexedDB Schema — Zero-Database Client Persistence Engine
// All user progression, bug bounty points, custom code snippets,
// and unlockable hacker badges reside directly in the client browser.
// ---------------------------------------------------------------------------

export interface SolvedChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bountyPointsEarned: number;
  timeSpentSeconds: number;
  userCode: string;
  solvedAt: Date;
}

export interface PlayerProfile {
  id: string;
  callsign: string;
  totalScore: number;
  currentStreak: number;
  unlockedBadges: string[];
}

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

export class CodeDuelDatabase extends Dexie {
  solvedChallenges!: Table<SolvedChallenge, string>;
  profile!: Table<PlayerProfile, string>;
  highScores!: Table<HighScore, number>;
  runHistory!: Table<RunHistory, number>;
  badges!: Table<Badge, number>;

  constructor() {
    super('CodeDuelArenaDB');
    this.version(1).stores({
      solvedChallenges: 'id, difficulty, bountyPointsEarned, solvedAt',
      profile: 'id, callsign, totalScore',
      highScores: '++id, score, playerName, timestamp',
      runHistory: '++id, challengeId, timestamp, correct',
      badges: '++id, name, unlockedAt',
    });
  }
}

export const db = new CodeDuelDatabase();

// ── Profile CRUD Operations ───────────────────────────────────────────────

const DEFAULT_PROFILE_ID = 'local-player';

/**
 * Get or initialize the player's local profile.
 */
export async function getPlayerProfile(): Promise<PlayerProfile> {
  const existing = await db.profile.get(DEFAULT_PROFILE_ID);
  if (existing) return existing;

  const defaultProfile: PlayerProfile = {
    id: DEFAULT_PROFILE_ID,
    callsign: 'CYBER_HUNTER_99',
    totalScore: 0,
    currentStreak: 0,
    unlockedBadges: ['NOVICE_HUNTER'],
  };
  await db.profile.put(defaultProfile);
  return defaultProfile;
}

/**
 * Update player profile fields (callsign, score, streak, badges).
 */
export async function updatePlayerProfile(updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
  const current = await getPlayerProfile();
  const updated: PlayerProfile = {
    ...current,
    ...updates,
    id: DEFAULT_PROFILE_ID,
  };
  await db.profile.put(updated);
  return updated;
}

/**
 * Record a successfully squashed bug challenge and update profile points & streak.
 */
export async function recordSolvedChallenge(solved: SolvedChallenge): Promise<void> {
  await db.solvedChallenges.put(solved);
  const profile = await getPlayerProfile();
  const nextStreak = profile.currentStreak + 1;
  const nextScore = profile.totalScore + solved.bountyPointsEarned;

  // Check milestone badge unlocks
  const badges = new Set(profile.unlockedBadges);
  if (nextScore >= 1000) badges.add('BOUNTY_ADEPT');
  if (nextScore >= 5000) badges.add('CODE_LEGEND');
  if (nextStreak >= 3) badges.add('STREAK_WARRIOR');
  if (nextStreak >= 5) badges.add('UNSTOPPABLE_DEBUGGER');
  if (solved.difficulty === 'HARD') badges.add('ZERO_DAY_MASTER');

  await updatePlayerProfile({
    totalScore: nextScore,
    currentStreak: nextStreak,
    unlockedBadges: Array.from(badges),
  });
}

/**
 * Retrieve all solved challenges, sorted newest first.
 */
export async function getSolvedChallenges(limit = 50): Promise<SolvedChallenge[]> {
  const all = await db.solvedChallenges.toArray();
  return all
    .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
    .slice(0, limit);
}

/**
 * Reset current player streak on defeat.
 */
export async function resetPlayerStreak(): Promise<void> {
  await updatePlayerProfile({ currentStreak: 0 });
}

// ── Backwards Compatible Repository Queries ───────────────────────────────

export async function getTopScores(limit = 10): Promise<HighScore[]> {
  return db.highScores.orderBy('score').reverse().limit(limit).toArray();
}

export async function saveHighScore(entry: Omit<HighScore, 'id'>): Promise<number> {
  const id = await db.highScores.add(entry as HighScore);
  return id as number;
}

export async function getRunHistory(limit = 50): Promise<RunHistory[]> {
  return db.runHistory.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function saveRun(entry: Omit<RunHistory, 'id'>): Promise<number> {
  const id = await db.runHistory.add(entry as RunHistory);
  return id as number;
}

export async function getUnlockedBadges(): Promise<Badge[]> {
  return db.badges.orderBy('unlockedAt').reverse().toArray();
}

export async function unlockBadge(badge: Omit<Badge, 'id'>): Promise<number> {
  const exists = await db.badges.where('name').equals(badge.name).first();
  if (exists) return exists.id!;
  const id = await db.badges.add(badge as Badge);
  return id as number;
}
