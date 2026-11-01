/**
 * @file GameActionMachine.ts
 * @description State transition guards and phase validation for gameplay actions.
 * Enforces strict finite state machine boundaries across surrender, code execution,
 * challenge generation, and fix submissions.
 */

import type { GamePhase } from '@/store/useGameStore';

/**
 * Result returned by action transition guard methods.
 */
export interface ActionTransitionResult {
  /** Indicates whether the requested action is permitted in the current state. */
  allowed: boolean;
  /** The target phase to transition to if the action succeeds. */
  targetPhase?: GamePhase;
  /** Explanatory error message if the action is rejected. */
  error?: string;
}

/**
 * Guard state machine validating action dispatch requests against the active game phase.
 */
export class GameActionMachine {
  /**
   * Evaluates eligibility for the "Surrender" action.
   * Only permitted during active gameplay ('playing' or 'reviewing') when no submission is in flight.
   *
   * @param currentPhase The active game phase.
   * @param isSubmitting Whether a submission review is currently processing.
   * @returns Action transition approval or rejection.
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
   * Evaluates eligibility for the "Run Tests / Run Code" execution action.
   * Requires active gameplay phase, idle worker state, and non-empty code buffer.
   *
   * @param currentPhase The active game phase.
   * @param isRunning Whether code execution is already underway in the worker.
   * @param code Current source code from the editor.
   * @returns Action transition approval or rejection.
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
   * Evaluates eligibility for requesting the next challenge.
   * Permitted when idle, victorious, or defeated, and not already loading.
   *
   * @param currentPhase The active game phase.
   * @param isLoading Whether challenge generation is already in progress.
   * @returns Action transition approval or rejection.
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
   * Evaluates eligibility for submitting a code fix for evaluation.
   * Requires active gameplay, non-zero remaining time, and non-empty code buffer.
   *
   * @param currentPhase The active game phase.
   * @param isSubmitting Whether a review is already in progress.
   * @param timeRemaining Seconds remaining on the challenge countdown timer.
   * @param code The submitted source code.
   * @returns Action transition approval or rejection.
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
