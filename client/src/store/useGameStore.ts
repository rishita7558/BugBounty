import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  buggyCode: string;
  correctCode: string;
  bugLine: number;
  bugDescription: string;
  hints: string[];
  testCases: { input: string; expectedOutput: string }[];
  timeLimit: number;
  points: number;
}

export interface GameReview {
  correct: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
  comboBonus: boolean;
}

export type GamePhase = 'idle' | 'loading' | 'playing' | 'reviewing' | 'victory' | 'defeat';

export interface GameState {
  // Current game phase
  phase: GamePhase;

  // Active challenge
  challenge: Challenge | null;
  playerCode: string;

  // Scoring
  score: number;
  combo: number;
  maxCombo: number;
  totalSolved: number;
  totalAttempts: number;

  // Timer
  timeRemaining: number;
  timerActive: boolean;

  // Hints
  hintsUsed: number;
  currentHintLevel: number;

  // Review result
  review: GameReview | null;

  // Settings
  difficulty: 'easy' | 'medium' | 'hard';
  soundEnabled: boolean;

  // Phase 2 — UI state
  /** Toggle diff view: compare buggy vs player code side-by-side */
  showDiff: boolean;
  /** CRT scanline + chromatic aberration overlay */
  crtEnabled: boolean;
  /** Momentary flag for screen-shake on wrong answer */
  screenShake: boolean;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setChallenge: (challenge: Challenge) => void;
  setPlayerCode: (code: string) => void;
  setTimeRemaining: (time: number) => void;
  setTimerActive: (active: boolean) => void;
  tickTimer: () => void;
  useHint: () => void;
  submitReview: (review: GameReview) => void;
  addScore: (points: number) => void;
  resetCombo: () => void;
  incrementCombo: () => void;
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  toggleSound: () => void;
  // Phase 2 actions
  toggleDiff: () => void;
  toggleCRT: () => void;
  triggerScreenShake: () => void;
  resetGame: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────
    phase:            'idle',
    challenge:        null,
    playerCode:       '',
    score:            0,
    combo:            0,
    maxCombo:         0,
    totalSolved:      0,
    totalAttempts:    0,
    timeRemaining:    0,
    timerActive:      false,
    hintsUsed:        0,
    currentHintLevel: 0,
    review:           null,
    difficulty:       'medium',
    soundEnabled:     true,
    showDiff:         false,
    crtEnabled:       true,
    screenShake:      false,

    // ── Actions ────────────────────────────────────────────────────────────
    setPhase: (phase) => set({ phase }),

    setChallenge: (challenge) =>
      set({
        challenge,
        playerCode:       challenge.buggyCode,
        timeRemaining:    challenge.timeLimit,
        phase:            'playing',
        timerActive:      true,
        hintsUsed:        0,
        currentHintLevel: 0,
        review:           null,
        showDiff:         false,
      }),

    setPlayerCode: (code) => set({ playerCode: code }),

    setTimeRemaining: (time) => set({ timeRemaining: time }),

    setTimerActive: (active) => set({ timerActive: active }),

    tickTimer: () => {
      const { timeRemaining, timerActive } = get();
      if (!timerActive || timeRemaining <= 0) return;
      const next = timeRemaining - 1;
      set({ timeRemaining: next });
      if (next <= 0) {
        set({ timerActive: false, phase: 'defeat' });
      }
    },

    useHint: () => {
      const { hintsUsed, currentHintLevel } = get();
      set({
        hintsUsed:        hintsUsed + 1,
        currentHintLevel: Math.min(currentHintLevel + 1, 3),
      });
    },

    submitReview: (review) => {
      const { totalAttempts } = get();
      set({ review, totalAttempts: totalAttempts + 1, timerActive: false });

      if (review.correct) {
        const { combo, maxCombo, totalSolved, score } = get();
        const newCombo   = combo + 1;
        const multiplier = 1 + (newCombo - 1) * 0.25;
        const points     = Math.round(review.score * multiplier);
        set({
          phase:       'victory',
          combo:       newCombo,
          maxCombo:    Math.max(maxCombo, newCombo),
          totalSolved: totalSolved + 1,
          score:       score + points,
        });
      } else {
        set({ phase: 'reviewing', combo: 0 });
      }
    },

    addScore: (points) => set((s) => ({ score: s.score + points })),

    resetCombo: () => set({ combo: 0 }),

    incrementCombo: () =>
      set((s) => ({
        combo:    s.combo + 1,
        maxCombo: Math.max(s.maxCombo, s.combo + 1),
      })),

    setDifficulty: (difficulty) => set({ difficulty }),

    toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

    toggleDiff: () => set((s) => ({ showDiff: !s.showDiff })),

    toggleCRT: () => set((s) => ({ crtEnabled: !s.crtEnabled })),

    /** Pulse screenShake true for 500 ms then reset — triggers CSS animation */
    triggerScreenShake: () => {
      set({ screenShake: true });
      setTimeout(() => set({ screenShake: false }), 500);
    },

    resetGame: () =>
      set({
        phase:            'idle',
        challenge:        null,
        playerCode:       '',
        timeRemaining:    0,
        timerActive:      false,
        hintsUsed:        0,
        currentHintLevel: 0,
        review:           null,
        showDiff:         false,
        screenShake:      false,
        // soundEnabled & crtEnabled are user prefs — intentionally preserved
      }),
  }))
);
