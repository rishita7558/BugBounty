// client/src/core/state/GameActionMachine.ts
import type { GamePhase } from '@/store/useGameStore';

export interface ActionTransitionResult {
  allowed: boolean;
  targetPhase?: GamePhase;
  error?: string;
}

export class GameActionMachine {
  /**
   * Guard for "Surrender" action.
   * Can only surrender during active challenge gameplay (playing or reviewing).
   */
  public static canSurrender(currentPhase: GamePhase, isSubmitting = false): ActionTransitionResult {
    if (isSubmitting) {
      return { allowed: false, error: 'Cannot surrender while submission review is in flight.' };
    }
    if (currentPhase !== 'playing' && currentPhase !== 'reviewing') {
      return {
        allowed: false,
        error: `Cannot surrender during '${currentPhase}' phase. Only valid in 'playing' or 'reviewing'.`,
      };
    }
    return { allowed: true, targetPhase: 'defeat' };
  }

  /**
   * Guard for "Run Tests / Run Code" action.
   * Player must be in 'playing' or 'reviewing', worker must not already be running,
   * and code must not be empty.
   */
  public static canRunCode(
    currentPhase: GamePhase,
    isRunning: boolean,
    code: string
  ): ActionTransitionResult {
    if (isRunning) {
      return { allowed: false, error: 'A test execution is already running. Please wait for completion.' };
    }
    if (currentPhase !== 'playing' && currentPhase !== 'reviewing') {
      return {
        allowed: false,
        error: `Cannot run code during '${currentPhase}' phase. Challenge must be active.`,
      };
    }
    if (!code || code.trim().length === 0) {
      return { allowed: false, error: 'Source code editor is empty.' };
    }
    return { allowed: true };
  }

  /**
   * Guard for "Next Challenge" action.
   * Can initiate when currently idle, victory, or defeat.
   */
  public static canRequestNextChallenge(
    currentPhase: GamePhase,
    isLoading: boolean
  ): ActionTransitionResult {
    if (isLoading) {
      return { allowed: false, error: 'A challenge is currently being generated. Please wait.' };
    }
    const validPhases: GamePhase[] = ['idle', 'victory', 'defeat'];
    if (!validPhases.includes(currentPhase)) {
      return {
        allowed: false,
        error: `Cannot load next challenge while in '${currentPhase}' phase. Finish or surrender active game first.`,
      };
    }
    return { allowed: true, targetPhase: 'loading' };
  }

  /**
   * Guard for "Submit Fix" action.
   */
  public static canSubmitFix(
    currentPhase: GamePhase,
    isSubmitting: boolean,
    timeRemaining: number,
    code: string
  ): ActionTransitionResult {
    if (isSubmitting) {
      return { allowed: false, error: 'Review submission already in progress.' };
    }
    if (currentPhase !== 'playing' && currentPhase !== 'reviewing') {
      return { allowed: false, error: `Cannot submit during '${currentPhase}' phase.` };
    }
    if (timeRemaining <= 0) {
      return { allowed: false, error: 'Time has expired. Submissions are closed for this challenge.' };
    }
    if (!code || code.trim().length === 0) {
      return { allowed: false, error: 'Cannot submit empty code.' };
    }
    return { allowed: true };
  }
}

