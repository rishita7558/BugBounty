/**
 * @file HintStateMachine.ts
 * @description Finite State Machine (FSM) governing progressive hint access.
 * Enforces transition guards, confirmation workflows, point deduction audit logging,
 * and automatic exhaustion upon reaching maximum limits or timer expiration.
 */

/**
 * Status phases for the hint machine.
 */
export type HintStatus = 'HIDDEN' | 'CONFIRMATION' | 'REVEALED' | 'EXHAUSTED';

/**
 * Structured audit entry recorded whenever a hint is confirmed and revealed.
 */
export interface HintAuditRecord {
  /** 1-based index of the revealed hint tier. */
  hintIndex: number;
  /** Percentage penalty deducted from round score potential (e.g. 15 for 15%). */
  penaltyDeducted: number;
  /** Unix epoch timestamp (ms) when the hint was confirmed. */
  revealedAt: number;
  /** Clue text delivered to the player. */
  hintText: string;
}

/**
 * Context state for the progressive hint state machine.
 */
export interface HintMachineContext {
  status: HintStatus;
  hintsUsed: number;
  maxHints: number;
  auditLog: HintAuditRecord[];
  currentHint: string | null;
  lastPenalty: number;
  error: string | null;
}

/**
 * Finite state machine enforcing rules and audit logging for hint consumption.
 */
export class HintStateMachine {
  public static readonly DEFAULT_MAX_HINTS = 3;
  public static readonly PENALTY_PER_HINT = 15;

  /**
   * Factory method initializing a clean hint state context.
   *
   * @param maxHints Maximum hints allowed for the challenge.
   * @returns Clean initial context.
   */
  public static createInitialContext(maxHints = HintStateMachine.DEFAULT_MAX_HINTS): HintMachineContext {
    return {
      status: 'HIDDEN',
      hintsUsed: 0,
      maxHints,
      auditLog: [],
      currentHint: null,
      lastPenalty: 0,
      error: null,
    };
  }

  /**
   * Evaluates whether a hint request can be initiated.
   *
   * @param ctx The active hint machine context.
   * @param timeRemaining Countdown seconds remaining on the active timer.
   * @param gamePhase The current game phase.
   * @returns Approval status and optional explanatory reason.
   */
  public static canRequestHint(
    ctx: HintMachineContext,
    timeRemaining: number,
    gamePhase: string
  ): { allowed: boolean; reason?: string } {
    if (gamePhase !== 'playing') {
      return { allowed: false, reason: 'Hints can only be requested while in active gameplay.' };
    }
    if (timeRemaining <= 0) {
      return { allowed: false, reason: 'Timer expired: hints are disabled when time runs out.' };
    }
    if (ctx.hintsUsed >= ctx.maxHints || ctx.status === 'EXHAUSTED') {
      return { allowed: false, reason: `Maximum hints (${ctx.maxHints}) reached.` };
    }
    if (ctx.status === 'CONFIRMATION') {
      return { allowed: false, reason: 'A hint confirmation dialog is already open.' };
    }
    return { allowed: true };
  }

  /**
   * Transitions state from HIDDEN to CONFIRMATION to request player approval for penalties.
   *
   * @param ctx Current hint context.
   * @param timeRemaining Remaining challenge time.
   * @param gamePhase Current gameplay phase.
   * @returns Transition result containing next context and status.
   */
  public static requestHint(
    ctx: HintMachineContext,
    timeRemaining: number,
    gamePhase: string
  ): { nextContext: HintMachineContext; success: boolean; error?: string } {
    const check = this.canRequestHint(ctx, timeRemaining, gamePhase);
    if (!check.allowed) {
      return { nextContext: { ...ctx, error: check.reason ?? 'Hint request blocked' }, success: false, error: check.reason };
    }

    return {
      nextContext: {
        ...ctx,
        status: 'CONFIRMATION',
        error: null,
      },
      success: true,
    };
  }

  /**
   * Cancels the confirmation dialog and returns status to HIDDEN.
   *
   * @param ctx Current hint context.
   * @returns Updated context.
   */
  public static cancel(ctx: HintMachineContext): HintMachineContext {
    if (ctx.status !== 'CONFIRMATION') {
      return ctx;
    }
    return {
      ...ctx,
      status: ctx.hintsUsed >= ctx.maxHints ? 'EXHAUSTED' : 'HIDDEN',
      error: null,
    };
  }

  /**
   * Confirms hint penalty deduction and reveals the hint clue text with an audit record.
   *
   * @param ctx Current hint context.
   * @param hintText Retrieved hint text.
   * @param penaltyDeducted Percentage penalty applied.
   * @param revealedAt Epoch timestamp of the reveal.
   * @returns Next context and generated audit record.
   */
  public static confirm(
    ctx: HintMachineContext,
    hintText: string,
    penaltyDeducted: number = HintStateMachine.PENALTY_PER_HINT,
    revealedAt: number = Date.now()
  ): { nextContext: HintMachineContext; auditRecord: HintAuditRecord } {
    const nextHintIndex = ctx.hintsUsed + 1;
    const auditRecord: HintAuditRecord = {
      hintIndex: nextHintIndex,
      penaltyDeducted,
      revealedAt,
      hintText,
    };

    const nextHintsUsed = nextHintIndex;
    const isExhausted = nextHintsUsed >= ctx.maxHints;

    const nextContext: HintMachineContext = {
      ...ctx,
      status: isExhausted ? 'EXHAUSTED' : 'REVEALED',
      hintsUsed: nextHintsUsed,
      currentHint: hintText,
      lastPenalty: penaltyDeducted,
      auditLog: [...ctx.auditLog, auditRecord],
      error: null,
    };

    return { nextContext, auditRecord };
  }

  /**
   * Dismisses the active hint display card, returning state to HIDDEN or EXHAUSTED.
   *
   * @param ctx Current hint context.
   * @returns Updated context.
   */
  public static dismiss(ctx: HintMachineContext): HintMachineContext {
    return {
      ...ctx,
      status: ctx.hintsUsed >= ctx.maxHints ? 'EXHAUSTED' : 'HIDDEN',
      error: null,
    };
  }

  /**
   * Timer expiration handler: automatically marks confirmation as exhausted if clock expires.
   *
   * @param ctx Current hint context.
   * @returns Updated context.
   */
  public static onTimerExpire(ctx: HintMachineContext): HintMachineContext {
    if (ctx.status === 'CONFIRMATION') {
      return {
        ...ctx,
        status: 'EXHAUSTED',
        error: 'Time expired while waiting for hint confirmation.',
      };
    }
    return ctx;
  }
}
