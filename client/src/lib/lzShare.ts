import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// ---------------------------------------------------------------------------
// URL State Encoding/Decoding — Share game state via compressed URL hashes
// ---------------------------------------------------------------------------

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
  return compressToEncodedURIComponent(json);
}

/**
 * Decode a compressed URL hash back into game state.
 */
export function decodeState(hash: string): ShareableState | null {
  try {
    const json = decompressFromEncodedURIComponent(hash);
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
  const match = hash.match(/#share=(.+)/);
  if (!match) return null;
  return decodeState(match[1]);
}
