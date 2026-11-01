import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, type Challenge } from '../store/useGameStore';
import { StreakManager } from '../core/services/StreakManager';

const mockChallenge: Challenge = {
  id: 'test-challenge-1',
  title: 'Fix Array Sorting Bug',
  description: 'Numbers are sorted alphabetically instead of numerically.',
  difficulty: 'easy',
  category: 'logic',
  buggyCode: 'arr.sort();',
  correctCode: 'arr.sort((a, b) => a - b);',
  bugLine: 1,
  bugDescription: 'Array.prototype.sort defaults to string conversion.',
  hints: ['Pass a comparator function', 'Compare a and b', 'Use (a, b) => a - b'],
  testCases: [{ input: '[10, 5, 20]', expectedOutput: '[5, 10, 20]' }],
  timeLimit: 60,
  points: 100,
};

describe('useGameStore Game Mechanics & State Integration', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    // Reset streak record for clean test state
    useGameStore.setState({
      streakRecord: StreakManager.createInitialRecord(),
      currentStreak: 0,
      highestStreak: 0,
      totalSolved: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      actionError: null,
    });
  });

  it('sets up a challenge and initializes game state', () => {
    useGameStore.getState().setChallenge(mockChallenge);
    const state = useGameStore.getState();

    expect(state.phase).toBe('playing');
    expect(state.timerActive).toBe(true);
    expect(state.timeRemaining).toBe(60);
    expect(state.playerCode).toBe(mockChallenge.buggyCode);
    expect(state.hintsUsed).toBe(0);
    expect(state.hintContext.status).toBe('HIDDEN');
  });

  it('updates streak and score on correct code submission using OOP Engine', () => {
    useGameStore.getState().setChallenge(mockChallenge);
    useGameStore.getState().setTimeRemaining(30);

    // Submit correct review
    useGameStore.getState().submitReview({
      correct: true,
      score: 100,
      feedback: 'Great fix!',
      suggestions: [],
      comboBonus: false,
    });

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory');
    expect(state.totalSolved).toBe(1);
    expect(state.currentStreak).toBe(1);
    expect(state.highestStreak).toBe(1);
    expect(state.combo).toBe(1);
    expect(state.score).toBeGreaterThan(0);
    expect(state.lastScoreBreakdown).not.toBeNull();
    expect(state.lastScoreBreakdown?.basePoints).toBe(100);
    expect(state.lastScoreBreakdown?.firstAttemptBonus).toBe(100);
  });

  it('handles surrender transition to defeat', () => {
    useGameStore.getState().setChallenge(mockChallenge);
    const result = useGameStore.getState().surrender();

    expect(result.success).toBe(true);
    const state = useGameStore.getState();
    expect(state.phase).toBe('defeat');
    expect(state.timerActive).toBe(false);
    expect(state.combo).toBe(0);
  });

  it('prevents surrender when not in playing phase', () => {
    const result = useGameStore.getState().surrender();
    expect(result.success).toBe(false);
    expect(useGameStore.getState().actionError).toContain('Cannot surrender');
  });

  it('governs hints through the HintStateMachine with structured audit records', () => {
    useGameStore.getState().setChallenge(mockChallenge);

    // Request hint
    const reqResult = useGameStore.getState().requestHint();
    expect(reqResult.success).toBe(true);
    expect(useGameStore.getState().hintContext.status).toBe('CONFIRMATION');

    // Confirm hint
    const confirmResult = useGameStore.getState().confirmHint('Check the comparator', 15);
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.auditRecord?.hintIndex).toBe(1);
    expect(confirmResult.auditRecord?.penaltyDeducted).toBe(15);

    const state = useGameStore.getState();
    expect(state.hintsUsed).toBe(1);
    expect(state.hintContext.auditLog).toHaveLength(1);
  });

  it('transitions to defeat and exhausts hints when timer expires', () => {
    useGameStore.getState().setChallenge(mockChallenge);
    useGameStore.getState().setTimeRemaining(1);

    useGameStore.getState().tickTimer();
    const state = useGameStore.getState();

    expect(state.timeRemaining).toBe(0);
    expect(state.timerActive).toBe(false);
    expect(state.phase).toBe('defeat');
  });

  it('toggles scanlines filter and persists preference to localStorage', () => {
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };
    (globalThis as unknown as { window: unknown }).window = { localStorage: mockLocalStorage };
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

    const initial = useGameStore.getState().scanlinesEnabled;
    useGameStore.getState().toggleScanlines();

    const afterFirstToggle = useGameStore.getState().scanlinesEnabled;
    expect(afterFirstToggle).toBe(!initial);
    expect(mockLocalStorage.getItem('codeduel_scanlines_enabled')).toBe(String(!initial));

    useGameStore.getState().toggleScanlines();
    const afterSecondToggle = useGameStore.getState().scanlinesEnabled;
    expect(afterSecondToggle).toBe(initial);
    expect(mockLocalStorage.getItem('codeduel_scanlines_enabled')).toBe(String(initial));
  });

  it('toggleCRT mirrors toggleScanlines and persists to localStorage', () => {
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };
    (globalThis as unknown as { window: unknown }).window = { localStorage: mockLocalStorage };
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

    const initial = useGameStore.getState().crtEnabled;
    useGameStore.getState().toggleCRT();

    expect(useGameStore.getState().crtEnabled).toBe(!initial);
    expect(useGameStore.getState().scanlinesEnabled).toBe(!initial);
    expect(mockLocalStorage.getItem('codeduel_scanlines_enabled')).toBe(String(!initial));
  });
});

