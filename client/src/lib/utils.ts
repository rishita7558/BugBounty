/**
 * @file utils.ts
 * @description General-purpose formatting and styling helper utilities.
 * Provides CSS class resolution via clsx and tailwind-merge, stopwatch time formatting,
 * numeric score formatting, and difficulty configuration presets.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with conflict resolution.
 *
 * @param inputs Class values or expressions.
 * @returns Combined class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in seconds into a standard MM:SS string representation.
 *
 * @param seconds Elapsed or remaining duration in seconds.
 * @returns Formatted time string (e.g., '02:05').
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats a numeric score with locale-aware thousands comma separators.
 *
 * @param score Integer score value.
 * @returns Formatted score string.
 */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Returns preset UI attributes, CSS badges, points, and time limits for a difficulty tier.
 *
 * @param difficulty Difficulty level name ('easy', 'medium', 'hard').
 * @returns Configuration preset object.
 */
export function difficultyConfig(difficulty: string): {
  label: string;
  class: string;
  points: string;
  time: string;
} {
  switch (difficulty) {
    case 'easy':
      return { label: 'EASY', class: 'badge-easy', points: '100-200', time: '120s' };
    case 'hard':
      return { label: 'HARD', class: 'badge-hard', points: '400-600', time: '60s' };
    default:
      return { label: 'MEDIUM', class: 'badge-medium', points: '200-400', time: '90s' };
  }
}
