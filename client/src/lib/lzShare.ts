/**
 * @file lzShare.ts
 * @description Serverless challenge state sharing via URI-encoded LZ-String compression.
 * Serializes complete challenge definitions, buggy code, assertions, and author callsigns
 * into portable URL hash fragments without relying on external database storage.
 */

import LZString from 'lz-string';

/**
 * Challenge payload schema encoded into compressed URL links.
 */
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
 * Compresses and serializes a challenge payload into a full browser URL with hash fragment.
 *
 * @param payload Challenge payload to serialize.
 * @returns Fully qualified URL containing compressed challenge parameters.
 */
export const encodeChallengeToUrl = (payload: ShareableChallengePayload): string => {
  const jsonStr = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `${window.location.origin}${window.location.pathname}#challenge=${compressed}`;
};

/**
 * Extracts and decompresses a challenge payload from the current window location hash.
 *
 * @returns Parsed ShareableChallengePayload or null if no valid hash is present.
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

/**
 * Historical game state structure for backwards-compatible link sharing.
 */
export interface ShareableState {
  challengeId?: string;
  playerCode?: string;
  score?: number;
  combo?: number;
}

/**
 * Compresses game state into a URL-safe hash string.
 *
 * @param state Game state object to encode.
 * @returns Compressed URI component string.
 */
export function encodeState(state: ShareableState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decodes a compressed URL hash component back into game state.
 *
 * @param hash Compressed URI component.
 * @returns Decoded state or null if decompression fails.
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
 * Generates a full shareable URL containing encoded game state.
 *
 * @param state Game state to package into URL.
 * @returns Full URL string.
 */
export function generateShareUrl(state: ShareableState): string {
  const hash = encodeState(state);
  return `${window.location.origin}${window.location.pathname}#share=${hash}`;
}

/**
 * Extracts shared state from the URL hash if present.
 *
 * @returns Decoded game state or null if not found.
 */
export function extractShareFromUrl(): ShareableState | null {
  const hash = window.location.hash;
  const match = hash.match(/#share=([^&]+)/);
  if (!match) return null;
  return decodeState(match[1]);
}
