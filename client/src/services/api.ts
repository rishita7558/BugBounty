/**
 * @file api.ts
 * @description HTTP client service for backend communication.
 * Communicates with the minimal Express proxy service via the Vite development proxy (/api).
 */

import type { Challenge, GameReview } from '@/store/useGameStore';
import { NetworkApiError } from '@/core/errors/AppErrors';

const BASE = '/api';

/**
 * Parameters for requesting dynamic challenge generation with language taxonomy and question rotation.
 */
export interface GenerateChallengeParams {
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  category?: string;
  topic?: string;
  challengeStyle?: string;
  excludeIds?: string[];
  recentFingerprints?: string[];
  language?: string;
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
 * Submits player source code for automated analysis, evaluation, and scoring.
 *
 * @param originalCode The original buggy reference code.
 * @param fixedCode The modified code submitted by the player.
 * @param challengeId Unique identifier of the active challenge.
 * @returns Evaluation review results including correctness, score, and feedback.
 */
export async function reviewCode(
  originalCode: string,
  fixedCode: string,
  challengeId: string
): Promise<GameReview> {
  const data = await post<{ success: boolean; review: GameReview }>(
    '/challenge/review',
    { originalCode, fixedCode, challengeId }
  );
  return data.review;
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
export async function checkHealth(): Promise<{
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
}> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/health`);
  } catch (err: unknown) {
    throw new NetworkApiError(
      `Health check request failed: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      '/health',
      undefined,
      { cause: err }
    );
  }

  if (!res.ok) {
    throw new NetworkApiError(`Health check failed with status ${res.status}`, res.status, '/health');
  }

  return res.json();
}
