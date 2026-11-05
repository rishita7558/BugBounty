/**
 * @file useGameStore.ts
 * @description Centralized Zustand state management store for BugBounty.
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
import type { SupportedLanguage } from '@/core/taxonomy/challengeTaxonomy';

/**
 * Challenge specification schema.
 */
export interface ChallengeOption {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  language?: SupportedLanguage | string;
  topic?: string;
  challengeStyle?: string;
  fingerprint?: string;
  buggyCode: string;
  correctCode: string;
  bugLine?: number;
  bugDescription: string;
  hints: string[];
  testCases: { input: string; expectedOutput: string }[];
  options?: ChallengeOption[];
  correctOptionId?: string;
  expectedOutput?: string;
  timeLimit: number;
  points: number;
}

/**
 * Code evaluation review result delivered from automated review services.
 */
export interface GameReview {
  success?: boolean;
  correct: boolean;
  isCorrect?: boolean;
  status?: 'correct' | 'incorrect' | 'error';
  score: number;
  message?: string;
  feedback: string;
  suggestions: string[];
  comboBonus: boolean;
  passedTests?: number;
  totalTests?: number;
  correctAnswer?: string;
  explanation?: string;
  errorDetails?: string;
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

  // Language taxonomy & question rotation
  selectedLanguage: SupportedLanguage;
  selectedTopic: string | null;
  seenChallengeIds: string[];

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
  scanlinesEnabled: boolean;
  screenShake: boolean;

  // Store actions
  setPhase: (phase: GamePhase) => void;
  setChallenge: (challenge: Challenge) => void;
  setPlayerCode: (code: string) => void;
  setSelectedLanguage: (lang: SupportedLanguage) => void;
  setSelectedTopic: (topicId: string | null) => void;
  markChallengeSeen: (id: string) => void;
  clearSeenChallenges: () => void;
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
  toggleScanlines: () => void;
  triggerScreenShake: () => void;
  resetGame: () => void;
}

const STREAK_STORAGE_KEY = 'bugbounty_streak_v1';
const SCANLINES_STORAGE_KEY = 'bugbounty_scanlines_enabled';

/**
 * Loads scanlines / CRT filter preference from browser localStorage.
 *
 * @returns Boolean flag indicating whether the scanlines filter is active.
 */
function loadStoredScanlines(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(SCANLINES_STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    }
  } catch (err) {
    console.warn('Failed to load scanlines preference from localStorage:', err);
  }
  return true;
}

/**
 * Persists scanlines / CRT filter preference to browser localStorage.
 *
 * @param enabled Whether scanlines filter is active.
 */
function saveStoredScanlines(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SCANLINES_STORAGE_KEY, String(enabled));
    }
  } catch (err) {
    console.warn('Failed to save scanlines preference to localStorage:', err);
  }
}

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
const initialScanlines = loadStoredScanlines();
const scoreCalculator = new ScoreCalculator(new ArcadeScoringStrategy());

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    phase: 'idle',
    challenge: null,
    selectedLanguage: 'javascript',
    selectedTopic: null,
    seenChallengeIds: [],
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
    crtEnabled: initialScanlines,
    scanlinesEnabled: initialScanlines,
    screenShake: false,

    // Actions
    setPhase: (phase) => set({ phase, actionError: null }),

    clearActionError: () => set({ actionError: null }),

    setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),

    setSelectedTopic: (selectedTopic) => set({ selectedTopic }),

    markChallengeSeen: (id) =>
      set((state) => ({
        seenChallengeIds: state.seenChallengeIds.includes(id)
          ? state.seenChallengeIds
          : [...state.seenChallengeIds, id],
      })),

    clearSeenChallenges: () => set({ seenChallengeIds: [] }),

    setChallenge: (challenge) =>
      set({
        challenge,
        playerCode: challenge.buggyCode,
        seenChallengeIds: get().seenChallengeIds.includes(challenge.id)
          ? get().seenChallengeIds
          : [...get().seenChallengeIds, challenge.id],
        selectedLanguage: (challenge.language as SupportedLanguage) || get().selectedLanguage,
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
      set({ hintContext: result.nextContext, actionError: null, timerActive: false });
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
      const { hintContext, phase, timeRemaining } = get();
      const nextContext = HintStateMachine.dismiss(hintContext);
      set({
        hintContext: nextContext,
        actionError: null,
        timerActive: phase === 'playing' && timeRemaining > 0,
      });
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

      const resolvedCorrect = !!(review.isCorrect ?? review.correct);

      if (resolvedCorrect) {
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

    toggleCRT: () => {
      const next = !get().scanlinesEnabled;
      saveStoredScanlines(next);
      set({ scanlinesEnabled: next, crtEnabled: next });
    },

    toggleScanlines: () => {
      const next = !get().scanlinesEnabled;
      saveStoredScanlines(next);
      set({ scanlinesEnabled: next, crtEnabled: next });
    },

    triggerScreenShake: () => {
      set({ screenShake: true });
      setTimeout(() => set({ screenShake: false }), 500);
    },

    resetGame: () =>
      set({
        phase: 'idle',
        challenge: null,
    selectedLanguage: 'javascript',
    selectedTopic: null,
    seenChallengeIds: [],
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
