/**
 * @file useGameStore.ts
 * @description Centralized Zustand state management store for CodeDuel: BugBounty Arena.
 * Coordinates reactive game phases, Monaco editor state, arcade countdown timers,
 * progressive hint state machines, daily calendar streaks, and scoring strategy breakdowns.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  ScoreCalculator,
  ArcadeScoringStrategy,
  type ScoreFactors,
  type ScoreBreakdown,
} from '@/core/engine/ScoreCalculator';
import {
  StreakManager,
  type StreakRecord,
} from '@/core/services/StreakManager';
import {
  HintStateMachine,
  type HintMachineContext,
  type HintAuditRecord,
} from '@/core/state/HintStateMachine';
import { GameActionMachine } from '@/core/state/GameActionMachine';

/**
 * Challenge specification schema.
 */
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

/**
 * Code evaluation review result delivered from automated review services.
 */
export interface GameReview {
  correct: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
  comboBonus: boolean;
  scoreBreakdown?: ScoreBreakdown;
}

/**
 * Valid phases of the arena game lifecycle.
 */
export type GamePhase =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'reviewing'
  | 'victory'
  | 'defeat';

/**
 * Global game state model and action dispatcher signatures.
 */
export interface GameState {
  // Current game phase
  phase: GamePhase;

  // Active challenge state
  challenge: Challenge | null;
  playerCode: string;

  // Scoring and progression
  score: number;
  combo: number;
  maxCombo: number;
  totalSolved: number;
  totalAttempts: number;
  challengeAttempts: number;
  lastScoreBreakdown: ScoreBreakdown | null;

  // Daily calendar streak metrics
  streakRecord: StreakRecord;
  currentStreak: number;
  highestStreak: number;

  // Countdown timer state
  timeRemaining: number;
  timerActive: boolean;

  // Progressive hint state machine
  hintsUsed: number;
  currentHintLevel: number;
  hintContext: HintMachineContext;

  // Review result
  review: GameReview | null;

  // Error messaging state
  actionError: string | null;

  // User preferences and visual flags
  difficulty: 'easy' | 'medium' | 'hard';
  soundEnabled: boolean;
  showDiff: boolean;
  crtEnabled: boolean;
  screenShake: boolean;

  // Store actions
  setPhase: (phase: GamePhase) => void;
  setChallenge: (challenge: Challenge) => void;
  setPlayerCode: (code: string) => void;
  setTimeRemaining: (time: number) => void;
  setTimerActive: (active: boolean) => void;
  tickTimer: () => void;
  useHint: () => void;
  requestHint: () => { success: boolean; error?: string };
  cancelHint: () => void;
  confirmHint: (
    hintText: string,
    penalty?: number
  ) => { success: boolean; auditRecord?: HintAuditRecord };
  dismissHint: () => void;
  submitReview: (review: GameReview) => void;
  surrender: () => { success: boolean; error?: string };
  clearActionError: () => void;
  addScore: (points: number) => void;
  resetCombo: () => void;
  incrementCombo: () => void;
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  toggleSound: () => void;
  toggleDiff: () => void;
  toggleCRT: () => void;
  triggerScreenShake: () => void;
  resetGame: () => void;
}

const STREAK_STORAGE_KEY = 'codeduel_bugbounty_streak_v1';

/**
 * Loads serialized streak record from browser localStorage.
 *
 * @returns Parsed StreakRecord or clean initial record.
 */
function loadStoredStreak(): StreakRecord {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(STREAK_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as StreakRecord;
        if (
          typeof parsed.currentStreak === 'number' &&
          typeof parsed.totalSolved === 'number'
        ) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load streak from localStorage:', err);
  }
  return StreakManager.createInitialRecord();
}

/**
 * Persists serialized streak record to browser localStorage.
 *
 * @param record Active streak record to save.
 */
function saveStoredStreak(record: StreakRecord): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(record));
    }
  } catch (err) {
    console.warn('Failed to save streak to localStorage:', err);
  }
}

const initialStreak = loadStoredStreak();
const scoreCalculator = new ScoreCalculator(new ArcadeScoringStrategy());

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    phase: 'idle',
    challenge: null,
    playerCode: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    totalSolved: initialStreak.totalSolved,
    totalAttempts: 0,
    challengeAttempts: 0,
    lastScoreBreakdown: null,

    streakRecord: initialStreak,
    currentStreak: initialStreak.currentStreak,
    highestStreak: initialStreak.highestStreak,

    timeRemaining: 0,
    timerActive: false,

    hintsUsed: 0,
    currentHintLevel: 0,
    hintContext: HintStateMachine.createInitialContext(),

    review: null,
    actionError: null,
    difficulty: 'medium',
    soundEnabled: true,
    showDiff: false,
    crtEnabled: true,
    screenShake: false,

    // Actions
    setPhase: (phase) => set({ phase, actionError: null }),

    clearActionError: () => set({ actionError: null }),

    setChallenge: (challenge) =>
      set({
        challenge,
        playerCode: challenge.buggyCode,
        timeRemaining: challenge.timeLimit,
        phase: 'playing',
        timerActive: true,
        hintsUsed: 0,
        currentHintLevel: 0,
        hintContext: HintStateMachine.createInitialContext(),
        review: null,
        showDiff: false,
        challengeAttempts: 0,
        actionError: null,
      }),

    setPlayerCode: (code) => set({ playerCode: code }),

    setTimeRemaining: (time) => set({ timeRemaining: time }),

    setTimerActive: (active) => set({ timerActive: active }),

    tickTimer: () => {
      const { timeRemaining, timerActive, hintContext } = get();
      if (!timerActive || timeRemaining <= 0) return;
      const next = timeRemaining - 1;
      if (next <= 0) {
        const expiredHintCtx = HintStateMachine.onTimerExpire(hintContext);
        set({
          timeRemaining: 0,
          timerActive: false,
          phase: 'defeat',
          hintContext: expiredHintCtx,
        });
      } else {
        set({ timeRemaining: next });
      }
    },

    useHint: () => {
      const { hintsUsed, currentHintLevel, hintContext } = get();
      const nextLevel = Math.min(currentHintLevel + 1, 3);
      set({
        hintsUsed: hintsUsed + 1,
        currentHintLevel: nextLevel,
        hintContext: {
          ...hintContext,
          hintsUsed: hintsUsed + 1,
          status: nextLevel >= 3 ? 'EXHAUSTED' : 'REVEALED',
        },
      });
    },

    requestHint: () => {
      const { hintContext, timeRemaining, phase } = get();
      const result = HintStateMachine.requestHint(
        hintContext,
        timeRemaining,
        phase
      );
      if (!result.success) {
        set({ actionError: result.error ?? 'Hint request blocked' });
        return { success: false, error: result.error };
      }
      set({ hintContext: result.nextContext, actionError: null });
      return { success: true };
    },

    cancelHint: () => {
      const { hintContext } = get();
      const nextContext = HintStateMachine.cancel(hintContext);
      set({ hintContext: nextContext, actionError: null });
    },

    confirmHint: (hintText: string, penalty: number = 15) => {
      const { hintContext, timeRemaining, phase } = get();
      if (phase !== 'playing' || timeRemaining <= 0) {
        return { success: false };
      }
      const { nextContext, auditRecord } = HintStateMachine.confirm(
        hintContext,
        hintText,
        penalty
      );
      set({
        hintContext: nextContext,
        hintsUsed: nextContext.hintsUsed,
        currentHintLevel: nextContext.hintsUsed,
        actionError: null,
      });
      return { success: true, auditRecord };
    },

    dismissHint: () => {
      const { hintContext } = get();
      const nextContext = HintStateMachine.dismiss(hintContext);
      set({ hintContext: nextContext, actionError: null });
    },

    surrender: () => {
      const { phase } = get();
      const guard = GameActionMachine.canSurrender(phase);
      if (!guard.allowed) {
        set({ actionError: guard.error ?? 'Cannot surrender' });
        return { success: false, error: guard.error };
      }
      set({
        phase: 'defeat',
        timerActive: false,
        combo: 0,
        actionError: null,
      });
      return { success: true };
    },

    submitReview: (review) => {
      const {
        totalAttempts,
        challengeAttempts,
        challenge,
        timeRemaining,
        hintsUsed,
        streakRecord,
        combo,
        maxCombo,
        score,
      } = get();

      set({
        totalAttempts: totalAttempts + 1,
        timerActive: false,
        actionError: null,
      });

      if (review.correct) {
        // 1. Update streak via calendar-day math
        const updatedStreak = StreakManager.updateStreakOnSolve(
          streakRecord,
          new Date()
        );
        saveStoredStreak(updatedStreak);

        // 2. Calculate score using OOP ScoreCalculator (Strategy Pattern)
        const factors: ScoreFactors = {
          basePoints: challenge?.points ?? review.score ?? 100,
          timeRemainingSeconds: Math.max(0, timeRemaining),
          totalTimeSeconds: challenge?.timeLimit ?? 120,
          hintsUsedCount: hintsUsed,
          hintPenaltyWeight: 0.15,
          consecutiveStreak: updatedStreak.currentStreak,
          isFirstAttemptSuccess: challengeAttempts === 0,
        };

        const breakdown = scoreCalculator.calculateBreakdown(factors);
        const earnedPoints = breakdown.finalScore;

        const newCombo = combo + 1;
        const enrichedReview: GameReview = {
          ...review,
          score: earnedPoints,
          scoreBreakdown: breakdown,
        };

        set({
          phase: 'victory',
          combo: newCombo,
          maxCombo: Math.max(maxCombo, newCombo),
          totalSolved: updatedStreak.totalSolved,
          streakRecord: updatedStreak,
          currentStreak: updatedStreak.currentStreak,
          highestStreak: updatedStreak.highestStreak,
          score: score + earnedPoints,
          review: enrichedReview,
          lastScoreBreakdown: breakdown,
          challengeAttempts: challengeAttempts + 1,
        });
      } else {
        set({
          phase: 'reviewing',
          combo: 0,
          review,
          challengeAttempts: challengeAttempts + 1,
        });
      }
    },

    addScore: (points) => set((s) => ({ score: s.score + points })),

    resetCombo: () => set({ combo: 0 }),

    incrementCombo: () =>
      set((s) => ({
        combo: s.combo + 1,
        maxCombo: Math.max(s.maxCombo, s.combo + 1),
      })),

    setDifficulty: (difficulty) => set({ difficulty }),

    toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

    toggleDiff: () => set((s) => ({ showDiff: !s.showDiff })),

    toggleCRT: () => set((s) => ({ crtEnabled: !s.crtEnabled })),

    triggerScreenShake: () => {
      set({ screenShake: true });
      setTimeout(() => set({ screenShake: false }), 500);
    },

    resetGame: () =>
      set({
        phase: 'idle',
        challenge: null,
        playerCode: '',
        timeRemaining: 0,
        timerActive: false,
        hintsUsed: 0,
        currentHintLevel: 0,
        hintContext: HintStateMachine.createInitialContext(),
        review: null,
        showDiff: false,
        screenShake: false,
        challengeAttempts: 0,
        lastScoreBreakdown: null,
        actionError: null,
      }),
  }))
);
