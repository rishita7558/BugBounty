/**
 * @file questionHistoryService.ts
 * @description Persistent question history, canonical AST/token fingerprinting,
 * and semantic similarity duplicate detection system for BugBounty.
 * 
 * Enforces strict non-repetition across page refreshes, browser restarts, and server sessions.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface QuestionHistoryRecord {
  id: string;
  fingerprint: string;
  title: string;
  language: string;
  topic: string;
  difficulty: string;
  challengeStyle: string;
  problemTokens: string[];
  codeTokens: string[];
  timestamp: number;
}

const DATA_DIR = process.cwd().endsWith('server')
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'server', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'question_history.json');
const MAX_HISTORY_RECORDS = 5000;

// In-memory cache synced with persistent disk store
let historyCache: QuestionHistoryRecord[] = [];
let isLoaded = false;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Loads question history from disk on boot.
 */
export function loadHistory(): QuestionHistoryRecord[] {
  if (isLoaded) return historyCache;
  ensureDataDir();

  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      historyCache = JSON.parse(raw);
    } else {
      historyCache = [];
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[QuestionHistory] Error reading history from disk, initializing fresh:', err);
    historyCache = [];
  }

  isLoaded = true;
  return historyCache;
}

/**
 * Persists history cache to disk.
 */
function persistHistory(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[QuestionHistory] Failed to write history file:', err);
  }
}

/**
 * Extracts a normalized structural token list from source code.
 * Strips comments, replaces literal strings & numbers, and discards variable naming variance.
 */
export function extractCodeTokens(code: string): string[] {
  if (!code) return [];

  // Remove comments
  let cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/--.*$/gm, '');

  // Normalize string literals and numbers
  cleaned = cleaned
    .replace(/"(?:[^"\\]|\\.)*"/g, '_STR_')
    .replace(/'(?:[^'\\]|\\.)*'/g, '_STR_')
    .replace(/`(?:[^`\\]|\\.)*`/g, '_STR_')
    .replace(/\b\d+(\.\d+)?\b/g, '_NUM_');

  // Tokenize by word and punctuation boundaries
  const tokens = cleaned
    .match(/[a-zA-Z_]\w*|[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g) || [];

  return tokens.slice(0, 300);
}

/**
 * Extracts clean words and n-grams from problem description.
 */
export function extractProblemTokens(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Generate 2-grams for semantic pairing
  const ngrams: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    ngrams.push(`${words[i]}_${words[i + 1]}`);
  }
  return ngrams;
}

/**
 * Computes a normalized structural fingerprint hash for a candidate challenge.
 */
export function computeFingerprint(challenge: {
  language?: string;
  topic?: string;
  category?: string;
  challengeStyle?: string;
  buggyCode?: string;
  bugDescription?: string;
}): string {
  const lang = (challenge.language || 'javascript').toLowerCase();
  const topic = (challenge.topic || challenge.category || 'general').toLowerCase();
  const style = (challenge.challengeStyle || 'fix-the-code').toLowerCase();
  const codeTokens = extractCodeTokens(challenge.buggyCode || '');
  const tokenHash = crypto
    .createHash('sha256')
    .update(codeTokens.join(' '))
    .digest('hex')
    .slice(0, 16);

  const descTokens = extractProblemTokens(challenge.bugDescription || '').slice(0, 20);
  const descHash = crypto
    .createHash('md5')
    .update(descTokens.join(' '))
    .digest('hex')
    .slice(0, 8);

  return `${lang}:${topic}:${style}:${tokenHash}:${descHash}`;
}

/**
 * Computes Jaccard token overlap similarity between two token sets.
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Evaluates whether a candidate challenge is a duplicate of any existing question in history.
 */
export function checkForDuplicate(
  candidate: {
    id?: string;
    language?: string;
    topic?: string;
    challengeStyle?: string;
    description?: string;
    buggyCode?: string;
    bugDescription?: string;
  },
  clientExclusions: {
    excludeIds?: string[];
    recentFingerprints?: string[];
  } = {},
  threshold = 0.65
): { isDuplicate: boolean; reason?: string; matchedId?: string; similarityScore?: number } {
  const history = loadHistory();
  const candidateFingerprint = computeFingerprint(candidate);

  // 1. Direct ID collision check
  if (candidate.id) {
    if (clientExclusions.excludeIds?.includes(candidate.id)) {
      return { isDuplicate: true, reason: 'ID in client exclusion list', matchedId: candidate.id };
    }
    const idMatch = history.find((r) => r.id === candidate.id);
    if (idMatch) {
      return { isDuplicate: true, reason: 'Exact ID match in history', matchedId: idMatch.id };
    }
  }

  // 2. Direct fingerprint collision check
  if (clientExclusions.recentFingerprints?.includes(candidateFingerprint)) {
    return { isDuplicate: true, reason: 'Fingerprint in client recent fingerprints', matchedId: candidate.id };
  }
  const fpMatch = history.find((r) => r.fingerprint === candidateFingerprint);
  if (fpMatch) {
    return { isDuplicate: true, reason: 'Identical structural fingerprint match', matchedId: fpMatch.id };
  }

  // 3. Semantic similarity analysis against questions in the same language and topic
  const candidateProblemTokens = extractProblemTokens(
    `${candidate.description || ''} ${candidate.bugDescription || ''}`
  );
  const candidateCodeTokens = extractCodeTokens(candidate.buggyCode || '');
  const candidateLang = (candidate.language || '').toLowerCase();

  for (const record of history) {
    if (record.language.toLowerCase() !== candidateLang) continue;

    // Check code structural overlap
    const codeSim = calculateJaccardSimilarity(candidateCodeTokens, record.codeTokens);
    // Check problem statement semantic overlap
    const problemSim = calculateJaccardSimilarity(candidateProblemTokens, record.problemTokens);

    const aggregateSimilarity = codeSim * 0.6 + problemSim * 0.4;

    if (aggregateSimilarity > threshold) {
      return {
        isDuplicate: true,
        reason: `Semantic similarity (${(aggregateSimilarity * 100).toFixed(1)}%) exceeds threshold`,
        matchedId: record.id,
        similarityScore: aggregateSimilarity,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Registers an approved unique question in the persistent history.
 */
export function recordQuestion(challenge: {
  id: string;
  title: string;
  language: string;
  topic?: string;
  category?: string;
  difficulty?: string;
  challengeStyle?: string;
  description?: string;
  buggyCode?: string;
  bugDescription?: string;
}): QuestionHistoryRecord {
  loadHistory(); // ensure historyCache is populated
  const fingerprint = computeFingerprint(challenge);

  const newRecord: QuestionHistoryRecord = {
    id: challenge.id,
    fingerprint,
    title: challenge.title,
    language: challenge.language || 'javascript',
    topic: challenge.topic || challenge.category || 'general',
    difficulty: challenge.difficulty || 'medium',
    challengeStyle: challenge.challengeStyle || 'fix-the-code',
    problemTokens: extractProblemTokens(
      `${challenge.description || ''} ${challenge.bugDescription || ''}`
    ),
    codeTokens: extractCodeTokens(challenge.buggyCode || ''),
    timestamp: Date.now(),
  };

  historyCache.unshift(newRecord);
  if (historyCache.length > MAX_HISTORY_RECORDS) {
    historyCache = historyCache.slice(0, MAX_HISTORY_RECORDS);
  }

  persistHistory();
  return newRecord;
}

/**
 * Retrieves recent question problem summaries to instruct LLMs on exclusions.
 */
export function getRecentExclusionContext(language: string, limit = 15): string[] {
  const history = loadHistory();
  const langLower = language.toLowerCase();

  return history
    .filter((r) => r.language.toLowerCase() === langLower)
    .slice(0, limit)
    .map((r) => `[${r.title}: ${r.topic} (${r.challengeStyle})]`);
}
