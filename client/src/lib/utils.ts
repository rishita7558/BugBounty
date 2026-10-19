import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format seconds into MM:SS display.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format a large number with commas.
 */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Generate a retro-style tag based on difficulty.
 */
export function difficultyConfig(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return { label: 'EASY', class: 'badge-easy', points: '100-200', time: '120s' };
    case 'hard':
      return { label: 'HARD', class: 'badge-hard', points: '400-600', time: '60s' };
    default:
      return { label: 'MEDIUM', class: 'badge-medium', points: '200-400', time: '90s' };
  }
}
