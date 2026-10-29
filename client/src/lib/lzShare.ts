import LZString from 'lz-string';

// ---------------------------------------------------------------------------
// State Sharing Hack via URL Compression — 100% Serverless Challenge Link Sharing
// Zero database footprint: complete challenge payloads are encoded into URL hashes.
// ---------------------------------------------------------------------------

export interface ShareableChallengePayload {
  title: string;
  code: string;
  tests: Array<{ input: any[]; expected: any }>;
  author: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  description?: string;
  bugLine?: number;
  hints?: string[];
}

/**
 * Compress and encode a complete challenge payload into a URL hash link.
 */
export const encodeChallengeToUrl = (payload: ShareableChallengePayload): string => {
  const jsonStr = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `${window.location.origin}${window.location.pathname}#challenge=${compressed}`;
};

/**
 * Extract and decode a challenge payload from the current URL hash, if present.
 */
export const decodeChallengeFromUrl = (): ShareableChallengePayload | null => {
  const hash = window.location.hash;
  if (!hash.includes('challenge=')) return null;
  try {
    const compressed = hash.split('challenge=')[1]?.split('&')[0];
    if (!compressed) return null;
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    return decompressed ? JSON.parse(decompressed) : null;
  } catch (err) {
    console.warn('[lzShare] Failed to decode challenge from URL:', err);
    return null;
  }
};

// ── Backwards-Compatible Game State Sharing ────────────────────────────────

export interface ShareableState {
  challengeId?: string;
  playerCode?: string;
  score?: number;
  combo?: number;
}

/**
 * Compress game state into a URL-safe hash string.
 */
export function encodeState(state: ShareableState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decode a compressed URL hash back into game state.
 */
export function decodeState(hash: string): ShareableState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as ShareableState;
  } catch {
    return null;
  }
}

/**
 * Generate a full shareable URL for the current game state.
 */
export function generateShareUrl(state: ShareableState): string {
  const hash = encodeState(state);
  return `${window.location.origin}${window.location.pathname}#share=${hash}`;
}

/**
 * Extract shared state from the current URL hash, if present.
 */
export function extractShareFromUrl(): ShareableState | null {
  const hash = window.location.hash;
  const match = hash.match(/#share=([^&]+)/);
  if (!match) return null;
  return decodeState(match[1]);
}
