/**
 * @file api.ts
 * @description API client communication layer for BugBounty.
 * Encapsulates communication with backend services for challenge generation,
 * code review evaluations, and hint state machines.
 */

import { NetworkApiError } from '@/core/errors/AppErrors';
import type { Challenge, GameReview } from '@/store/useGameStore';

const BASE = '/api';

/**
 * Parameters for dynamic challenge generation.
 */
export interface GenerateChallengeParams {
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  category?: string;
  topic?: string;
  challengeStyle?: string;
  excludeIds?: string[];
  recentFingerprints?: string[];
  language?: string;
  mode?: string;
}

/**
 * Parameters for rigorous code review and answer evaluation.
 */
export interface ReviewCodeParams {
  originalCode: string;
  fixedCode: string;
  challengeId: string;
  language?: string;
  challengeStyle?: string;
  selectedOptionId?: string;
  userAnswer?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  correctCode?: string;
  correctOptionId?: string;
  expectedOutput?: string;
  bugDescription?: string;
}

/**
 * Performs a typed POST request against the backend gateway.
 *
 * @template T Expected response data type.
 * @param url Relative endpoint URL.
 * @param body JSON-serializable request payload.
 * @returns Parsed JSON response.
 * @throws {NetworkApiError} When HTTP response status is not OK (2xx).
 */
async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    throw new NetworkApiError(
      `Network connection failed while contacting ${url}: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      url,
      undefined,
      { cause: err }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network communication fault' }));
    throw new NetworkApiError(
      err.error ?? `Request failed with HTTP status ${res.status}`,
      res.status,
      url,
      err
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Requests the generation of a new buggy code challenge from the backend service.
 * Supports topic selection, language specification, and question rotation with excludeIds.
 *
 * @param paramsOrDifficulty Difficulty string or options object.
 * @param category Optional vulnerability category domain if first arg is string.
 * @returns Generated challenge payload.
 */
export async function generateChallenge(
  paramsOrDifficulty: string | GenerateChallengeParams = 'medium',
  category?: string
): Promise<Challenge> {
  const payload: GenerateChallengeParams =
    typeof paramsOrDifficulty === 'string'
      ? { difficulty: paramsOrDifficulty, category }
      : paramsOrDifficulty;

  const data = await post<{ success: boolean; challenge: Challenge }>(
    '/challenge/generate',
    payload
  );
  return data.challenge;
}

/**
 * Submits player solution or answer for rigorous automated analysis, evaluation, and scoring.
 *
 * @param paramsOrOriginalCode Parameter object or original buggy reference code.
 * @param fixedCode The modified code submitted by the player (if first arg is string).
 * @param challengeId Unique identifier of the active challenge (if first arg is string).
 * @param extraParams Additional context (language, testCases, selectedOptionId, etc.)
 * @returns Evaluation review results including correctness, score, passed tests, and feedback.
 */
export async function reviewCode(
  paramsOrOriginalCode: string | ReviewCodeParams,
  fixedCode?: string,
  challengeId?: string,
  extraParams?: Partial<ReviewCodeParams>
): Promise<GameReview> {
  const payload: ReviewCodeParams =
    typeof paramsOrOriginalCode === 'string'
      ? {
          originalCode: paramsOrOriginalCode,
          fixedCode: fixedCode || '',
          challengeId: challengeId || '',
          ...extraParams,
        }
      : paramsOrOriginalCode;

  const data = await post<{
    success: boolean;
    review: GameReview;
    isCorrect?: boolean;
    status?: 'correct' | 'incorrect' | 'error';
    message?: string;
    passedTests?: number;
    totalTests?: number;
    testDetails?: any[];
    correctAnswer?: string;
    explanation?: string;
  }>('/challenge/review', payload);

  const rawReview = data.review || ({} as GameReview);

  // Normalize response according to Master Prompt Section 4 specification
  const normalizedReview: GameReview = {
    ...rawReview,
    success: data.success ?? rawReview.success ?? true,
    correct: data.isCorrect ?? rawReview.correct ?? rawReview.isCorrect ?? false,
    isCorrect: data.isCorrect ?? rawReview.isCorrect ?? rawReview.correct ?? false,
    status: data.status ?? rawReview.status ?? (rawReview.correct ? 'correct' : 'incorrect'),
    score: rawReview.score ?? (rawReview.correct ? 100 : 0),
    message: data.message ?? rawReview.message ?? rawReview.feedback ?? '',
    feedback: rawReview.feedback ?? data.message ?? '',
    suggestions: rawReview.suggestions || [],
    comboBonus: rawReview.comboBonus ?? false,
    passedTests: data.passedTests ?? rawReview.passedTests ?? (rawReview.correct ? 1 : 0),
    totalTests: data.totalTests ?? rawReview.totalTests ?? 1,
    testDetails: data.testDetails ?? rawReview.testDetails,
    correctAnswer: data.correctAnswer ?? rawReview.correctAnswer,
    explanation: data.explanation ?? rawReview.explanation ?? rawReview.feedback ?? '',
  };

  return normalizedReview;
}

/**
 * Requests a progressive hint for an active challenge based on the requested reveal tier.
 *
 * @param buggyCode The original buggy code.
 * @param description Challenge objective description.
 * @param hintLevel The progressive hint level (1, 2, or 3).
 * @returns Progressive hint text with corresponding penalty calculation.
 */
export async function getHint(
  buggyCode: string,
  description: string,
  hintLevel: number = 1
): Promise<{ hint: string; hintLevel: number; pointPenalty: number }> {
  return post('/hint', { buggyCode, description, hintLevel });
}

/**
 * Queries server health and version telemetry.
 *
 * @returns Server health check metadata.
 */
export async function getHealth(): Promise<{ status: string; version: string; uptime: number }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) {
    throw new NetworkApiError(`Health check failed with status ${res.status}`, res.status, '/health');
  }
  return res.json();
}
