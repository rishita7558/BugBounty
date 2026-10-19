import type { Challenge, GameReview } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// API Client — Communicates with the Node.js LLM proxy.
// All calls go through the Vite dev proxy (/api → localhost:3001).
// ---------------------------------------------------------------------------

const BASE = '/api';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generate a new buggy code challenge from the LLM.
 */
export async function generateChallenge(
  difficulty: string = 'medium',
  category?: string
): Promise<Challenge> {
  const data = await post<{ success: boolean; challenge: Challenge }>(
    '/challenge/generate',
    { difficulty, category }
  );
  return data.challenge;
}

/**
 * Submit code for LLM-powered review and scoring.
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
 * Request a progressive hint for the active challenge.
 */
export async function getHint(
  buggyCode: string,
  description: string,
  hintLevel: number
): Promise<{ hint: string; hintLevel: number; pointPenalty: number }> {
  return post('/hint', { buggyCode, description, hintLevel });
}

/**
 * Health check for the backend proxy.
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
