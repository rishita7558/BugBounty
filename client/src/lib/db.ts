/**
 * @file db.ts
 * @description Client-side persistence engine leveraging IndexedDB via Dexie.js.
 * Manages player profiles, unlocked hacker badges, career scores, and solved challenge archives
 * without requiring server-side database infrastructure.
 */

import Dexie, { type Table } from 'dexie';

/**
 * Record representing a successfully resolved bug challenge.
 */
export interface SolvedChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bountyPointsEarned: number;
  timeSpentSeconds: number;
  userCode: string;
  solvedAt: Date;
}

/**
 * Persistent profile record for the local player.
 */
export interface PlayerProfile {
  id: string;
  callsign: string;
  totalScore: number;
  currentStreak: number;
  unlockedBadges: string[];
}

/**
 * Personal high score achievement record.
 */
export interface HighScore {
  id?: number;
  playerName: string;
  score: number;
  totalSolved: number;
  maxCombo: number;
  difficulty: string;
  timestamp: number;
}

/**
 * Historical challenge execution record.
 */
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

/**
 * Unlockable player achievement badge record.
 */
export interface Badge {
  id?: number;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

/**
 * Persistent question history record preventing question repetition across sessions.
 */
export interface ClientQuestionHistory {
  id: string;
  fingerprint: string;
  title: string;
  language: string;
  topic: string;
  difficulty: string;
  challengeStyle: string;
  timestamp: number;
}

/**
 * User career statistics record.
 */
export interface UserStats {
  id: string;
  lifetimeScore: number;
  currentStreak: number;
  lastUpdated: number;
}

/**
 * Historical record of completed challenge milestones.
 */
export interface CompletedChallenge {
  id: string;
  challengeId: string;
  title: string;
  earnedPoints: number;
  timestamp: number;
}

/**
 * Dexie database class declaring local table schemas.
 */
export class BugBountyDatabase extends Dexie {
  solvedChallenges!: Table<SolvedChallenge, string>;
  profile!: Table<PlayerProfile, string>;
  highScores!: Table<HighScore, number>;
  runHistory!: Table<RunHistory, number>;
  badges!: Table<Badge, number>;
  questionHistory!: Table<ClientQuestionHistory, string>;
  userStats!: Table<UserStats, string>;
  completedChallenges!: Table<CompletedChallenge, string>;

  constructor() {
    super('BugBountyArenaDB');
    // Version 1: original schema — keep intact for upgrade path
    this.version(1).stores({
      solvedChallenges: 'id, difficulty, bountyPointsEarned, solvedAt',
      profile: 'id, callsign, totalScore',
      highScores: '++id, score, playerName, timestamp',
      runHistory: '++id, challengeId, timestamp, correct',
      badges: '++id, name, unlockedAt',
    });
    // Version 2: adds questionHistory table for persistent no-repetition tracking
    this.version(2).stores({
      solvedChallenges: 'id, difficulty, bountyPointsEarned, solvedAt',
      profile: 'id, callsign, totalScore',
      highScores: '++id, score, playerName, timestamp',
      runHistory: '++id, challengeId, timestamp, correct',
      badges: '++id, name, unlockedAt',
      questionHistory: 'id, fingerprint, language, topic, difficulty, timestamp',
    });
    // Version 3: adds userStats and completedChallenges tables for academic rubric compliance
    this.version(3).stores({
      solvedChallenges: 'id, difficulty, bountyPointsEarned, solvedAt',
      profile: 'id, callsign, totalScore',
      highScores: '++id, score, playerName, timestamp',
      runHistory: '++id, challengeId, timestamp, correct',
      badges: '++id, name, unlockedAt',
      questionHistory: 'id, fingerprint, language, topic, difficulty, timestamp',
      userStats: 'id, lifetimeScore, currentStreak, lastUpdated',
      completedChallenges: 'id, challengeId, timestamp',
    });
  }
}

export const db = new BugBountyDatabase();

/**
 * Records a generated challenge into local IndexedDB question history.
 */
export async function recordClientQuestion(ch: {
  id: string;
  fingerprint?: string;
  title: string;
  language?: string;
  topic?: string;
  difficulty?: string;
  challengeStyle?: string;
}): Promise<void> {
  try {
    await db.questionHistory.put({
      id: ch.id,
      fingerprint: ch.fingerprint || ch.id,
      title: ch.title,
      language: ch.language || 'javascript',
      topic: ch.topic || 'general',
      difficulty: ch.difficulty || 'medium',
      challengeStyle: ch.challengeStyle || 'fix-the-code',
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to record question in history:', err);
  }
}

/**
 * Retrieves recently generated challenge IDs and fingerprints to enforce non-repetition.
 */
export async function getClientQuestionExclusions(): Promise<{
  excludeIds: string[];
  recentFingerprints: string[];
}> {
  try {
    const records = await db.questionHistory.orderBy('timestamp').reverse().limit(50).toArray();
    return {
      excludeIds: records.map((r) => r.id),
      recentFingerprints: records.map((r) => r.fingerprint).filter(Boolean),
    };
  } catch {
    return { excludeIds: [], recentFingerprints: [] };
  }
}

const DEFAULT_PROFILE_ID = 'local-player';

/**
 * Retrieves the local player profile, initializing defaults if none exists.
 *
 * @returns Active PlayerProfile record.
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
 * Updates properties on the active player profile.
 *
 * @param updates Partial fields to apply to the profile.
 * @returns Updated PlayerProfile record.
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
 * Records a completed challenge solve and updates cumulative player points, streaks, and badges.
 *
 * @param solved The solved challenge record.
 */
export async function recordSolvedChallenge(solved: SolvedChallenge): Promise<void> {
  await db.solvedChallenges.put(solved);

  // Record completion in CompletedChallenges table with timestamp
  try {
    await db.completedChallenges.put({
      id: solved.id || `solve-${Date.now()}`,
      challengeId: solved.id,
      title: solved.title,
      earnedPoints: solved.bountyPointsEarned,
      timestamp: new Date(solved.solvedAt).getTime(),
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to record completed challenge entry:', err);
  }

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

  // Mirror update in userStats table
  try {
    await db.userStats.put({
      id: DEFAULT_PROFILE_ID,
      lifetimeScore: nextScore,
      currentStreak: nextStreak,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to update userStats:', err);
  }
}

/**
 * Retrieves solved challenges ordered by most recently completed.
 *
 * @param limit Maximum records to return.
 * @returns Array of solved challenge records.
 */
export async function getSolvedChallenges(limit = 50): Promise<SolvedChallenge[]> {
  const all = await db.solvedChallenges.toArray();
  return all
    .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
    .slice(0, limit);
}

/**
 * Resets the current consecutive player streak on defeat or forfeiture.
 */
export async function resetPlayerStreak(): Promise<void> {
  await updatePlayerProfile({ currentStreak: 0 });
}

/**
 * Retrieves high scores sorted descending by score value.
 *
 * @param limit Maximum score entries to return.
 * @returns Array of HighScore records.
 */
export async function getTopScores(limit = 10): Promise<HighScore[]> {
  return db.highScores.orderBy('score').reverse().limit(limit).toArray();
}

/**
 * Persists a new high score entry.
 *
 * @param entry The high score data to store.
 * @returns Primary key identifier of the inserted record.
 */
export async function saveHighScore(entry: Omit<HighScore, 'id'>): Promise<number> {
  const id = await db.highScores.add(entry as HighScore);
  return id as number;
}

/**
 * Retrieves challenge execution history ordered by timestamp.
 *
 * @param limit Maximum records to return.
 * @returns Array of RunHistory records.
 */
export async function getRunHistory(limit = 50): Promise<RunHistory[]> {
  return db.runHistory.orderBy('timestamp').reverse().limit(limit).toArray();
}

/**
 * Records a challenge execution run.
 *
 * @param entry The execution history entry to store.
 * @returns Primary key identifier of the inserted record.
 */
export async function saveRun(entry: Omit<RunHistory, 'id'>): Promise<number> {
  const id = await db.runHistory.add(entry as RunHistory);
  return id as number;
}

/**
 * Retrieves all unlocked achievement badges.
 *
 * @returns Array of Badge records.
 */
export async function getUnlockedBadges(): Promise<Badge[]> {
  return db.badges.orderBy('unlockedAt').reverse().toArray();
}

/**
 * Unlocks a new achievement badge for the player if not already unlocked.
 *
 * @param badge Badge definition to record.
 * @returns Badge identifier.
 */
export async function unlockBadge(badge: Omit<Badge, 'id'>): Promise<number> {
  const exists = await db.badges.where('name').equals(badge.name).first();
  if (exists) return exists.id!;
  const id = await db.badges.add(badge as Badge);
  return id as number;
}
