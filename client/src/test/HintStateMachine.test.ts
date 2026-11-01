import { describe, it, expect } from 'vitest';
import {
  HintStateMachine,
} from '../core/state/HintStateMachine';

describe('HintStateMachine', () => {
  it('initializes in HIDDEN state with empty audit log', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    expect(ctx.status).toBe('HIDDEN');
    expect(ctx.hintsUsed).toBe(0);
    expect(ctx.maxHints).toBe(3);
    expect(ctx.auditLog).toEqual([]);
    expect(ctx.currentHint).toBeNull();
  });

  it('transitions from HIDDEN to CONFIRMATION on requestHint', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const { nextContext, success } = HintStateMachine.requestHint(ctx, 60, 'playing');

    expect(success).toBe(true);
    expect(nextContext.status).toBe('CONFIRMATION');
    expect(nextContext.error).toBeNull();
  });

  it('rejects hint request if timer is expired (timeRemaining <= 0)', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const { nextContext, success, error } = HintStateMachine.requestHint(ctx, 0, 'playing');

    expect(success).toBe(false);
    expect(nextContext.status).toBe('HIDDEN');
    expect(error).toContain('Timer expired');
  });

  it('rejects hint request if phase is not playing', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const { nextContext, success, error } = HintStateMachine.requestHint(ctx, 50, 'idle');

    expect(success).toBe(false);
    expect(nextContext.status).toBe('HIDDEN');
    expect(error).toContain('active gameplay');
  });

  it('returns to HIDDEN when user cancels confirmation', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const { nextContext: confirmingCtx } = HintStateMachine.requestHint(ctx, 60, 'playing');

    const cancelledCtx = HintStateMachine.cancel(confirmingCtx);
    expect(cancelledCtx.status).toBe('HIDDEN');
    expect(cancelledCtx.hintsUsed).toBe(0);
    expect(cancelledCtx.auditLog).toHaveLength(0);
  });

  it('confirms hint and records structured audit entry with 15% penalty', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const { nextContext: confirmingCtx } = HintStateMachine.requestHint(ctx, 60, 'playing');

    const timestamp = Date.now();
    const { nextContext: revealedCtx, auditRecord } = HintStateMachine.confirm(
      confirmingCtx,
      'Check loop boundary condition',
      15,
      timestamp
    );

    expect(revealedCtx.status).toBe('REVEALED');
    expect(revealedCtx.hintsUsed).toBe(1);
    expect(revealedCtx.currentHint).toBe('Check loop boundary condition');
    expect(revealedCtx.auditLog).toHaveLength(1);

    expect(auditRecord).toEqual({
      hintIndex: 1,
      penaltyDeducted: 15,
      revealedAt: timestamp,
      hintText: 'Check loop boundary condition',
    });
  });

  it('reaches EXHAUSTED state when max hints (3) are consumed', () => {
    let ctx = HintStateMachine.createInitialContext(3);

    // Hint 1
    ctx = HintStateMachine.requestHint(ctx, 60, 'playing').nextContext;
    ctx = HintStateMachine.confirm(ctx, 'Hint 1 text', 15).nextContext;
    expect(ctx.status).toBe('REVEALED');
    expect(ctx.hintsUsed).toBe(1);

    // Hint 2
    ctx = HintStateMachine.requestHint(ctx, 50, 'playing').nextContext;
    ctx = HintStateMachine.confirm(ctx, 'Hint 2 text', 15).nextContext;
    expect(ctx.status).toBe('REVEALED');
    expect(ctx.hintsUsed).toBe(2);

    // Hint 3 (Final hint)
    ctx = HintStateMachine.requestHint(ctx, 40, 'playing').nextContext;
    ctx = HintStateMachine.confirm(ctx, 'Hint 3 text', 15).nextContext;
    expect(ctx.status).toBe('EXHAUSTED');
    expect(ctx.hintsUsed).toBe(3);
    expect(ctx.auditLog).toHaveLength(3);

    // Attempting 4th hint must be strictly rejected
    const blockedResult = HintStateMachine.requestHint(ctx, 30, 'playing');
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.error).toContain('Maximum hints');
  });

  it('exhausts hint when timer expires during confirmation dialog', () => {
    const ctx = HintStateMachine.createInitialContext(3);
    const confirmingCtx = HintStateMachine.requestHint(ctx, 5, 'playing').nextContext;

    const expiredCtx = HintStateMachine.onTimerExpire(confirmingCtx);
    expect(expiredCtx.status).toBe('EXHAUSTED');
  });
});

