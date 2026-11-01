// client/src/core/state/HintStateMachine.ts

export type HintStatus = 'HIDDEN' | 'CONFIRMATION' | 'REVEALED' | 'EXHAUSTED';

export interface HintAuditRecord {
  hintIndex: number; // 1-based index (e.g. 1, 2, 3)
  penaltyDeducted: number; // 15 for 15%
  revealedAt: number; // Unix epoch ms
  hintText: string;
}

export interface HintMachineContext {
  status: HintStatus;
  hintsUsed: number;
  maxHints: number;
  auditLog: HintAuditRecord[];
  currentHint: string | null;
  lastPenalty: number;
  error: string | null;
}

export class HintStateMachine {
  public static readonly DEFAULT_MAX_HINTS = 3;
  public static readonly PENALTY_PER_HINT = 15; // 15% deduction

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
   * Guard: can the user initiate a hint request?
   * Requires:
   * - Phase is active 'playing'
   * - Countdown timer has remaining time (> 0)
   * - Available hints not yet exhausted (< maxHints)
   * - Not currently awaiting confirmation
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
   * Transition: [HIDDEN] -> [CONFIRMATION DIALOG]
   * Or from [REVEALED] -> [CONFIRMATION DIALOG] if requesting next hint.
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
   * Transition: [CONFIRMATION] -> (Cancel) -> [HIDDEN]
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
   * Transition: [CONFIRMATION] -> (Confirm) -> [REVEALED_HINT_N]
   * Strictly logs structured audit record: { hintIndex, penaltyDeducted, revealedAt, hintText }
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
   * Transition: [REVEALED] -> [HIDDEN] (Dismiss hint modal/card)
   */
  public static dismiss(ctx: HintMachineContext): HintMachineContext {
    return {
      ...ctx,
      status: ctx.hintsUsed >= ctx.maxHints ? 'EXHAUSTED' : 'HIDDEN',
      error: null,
    };
  }

  /**
   * Timer expiration handler: automatically exhausts hints if timer hits 0.
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

