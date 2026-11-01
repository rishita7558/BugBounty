import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getHint } from '@/services/api';
import { Lightbulb, AlertTriangle, CheckCircle2, History, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Hint Modal — Governed by Strict HintStateMachine
// [HIDDEN] -> (Click "Use Hint (-15%)") -> [CONFIRMATION DIALOG]
//                                           |
//                   +-----------------------+-----------------------+
//                   | (Confirm)                                     | (Cancel)
//                   v                                               v
//          [REVEALED_HINT_N]                                    [HIDDEN]
// Deductions are logged as structured audit records: { hintIndex, penaltyDeducted: 15, revealedAt }
// Hints disabled when exhausted (3/3) or timer expired.
// ---------------------------------------------------------------------------

interface HintModalProps {
  open: boolean;
  onClose: () => void;
}

export function HintModal({ open, onClose }: HintModalProps) {
  const challenge = useGameStore((s) => s.challenge);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const phase = useGameStore((s) => s.phase);
  const hintContext = useGameStore((s) => s.hintContext);
  const cancelHint = useGameStore((s) => s.cancelHint);
  const confirmHint = useGameStore((s) => s.confirmHint);
  const requestHint = useGameStore((s) => s.requestHint);
  const dismissHint = useGameStore((s) => s.dismissHint);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  if (!open || !challenge) return null;

  const isTimerExpired = timeRemaining <= 0 || phase !== 'playing';
  const hintsUsed = hintContext.hintsUsed;
  const maxHints = hintContext.maxHints;
  const isExhausted = hintsUsed >= maxHints || hintContext.status === 'EXHAUSTED';
  const isConfirming = hintContext.status === 'CONFIRMATION';

  const nextHintLevel = Math.min(hintsUsed + 1, maxHints);

  const getHintLevelDescription = (level: number) => {
    switch (level) {
      case 1:
        return 'Gentle guidance pointing towards the general problem area.';
      case 2:
        return 'Targeted clue explaining the logic flaw or vulnerability.';
      case 3:
        return 'Detailed fix pointer indicating the exact logic replacement.';
      default:
        return 'Helpful debugging hint.';
    }
  };

  const handleStartRequestHint = () => {
    setFetchError(null);
    const result = requestHint();
    if (!result.success && result.error) {
      setFetchError(result.error);
    }
  };

  const handleCancelConfirmation = () => {
    setFetchError(null);
    cancelHint();
  };

  const handleConfirmAndFetch = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await getHint(
        challenge.buggyCode,
        challenge.description,
        nextHintLevel
      );

      const penaltyPercent = response.pointPenalty || 15;
      confirmHint(response.hint, penaltyPercent);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to retrieve hint. Check connection.';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    dismissHint();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={handleClose}
    >
      <div
        className="glass-card animate-score-pop"
        style={{
          padding: '28px',
          maxWidth: '500px',
          width: '92%',
          border: '1px solid rgba(255, 230, 0, 0.35)',
          boxShadow: '0 0 30px rgba(255, 230, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={20} color="var(--neon-yellow)" />
            <span
              className="arcade-text"
              style={{ fontSize: '0.75rem', color: 'var(--neon-yellow)' }}
            >
              HINT PROTOCOL — {hintsUsed}/{maxHints} USED
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notification if any */}
        {fetchError && (
          <div
            style={{
              background: 'rgba(255, 0, 85, 0.15)',
              border: '1px solid rgba(255, 0, 85, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: 'var(--neon-red)',
            }}
          >
            <AlertTriangle size={16} />
            <span>{fetchError}</span>
          </div>
        )}

        {/* ── STATE: CONFIRMATION DIALOG ──────────────────────────────────── */}
        {isConfirming ? (
          <div
            style={{
              background: 'rgba(255, 230, 0, 0.08)',
              border: '1px solid rgba(255, 230, 0, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                color: 'var(--neon-yellow)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <AlertTriangle size={18} />
              <span>Confirm Hint Request (-15% Score Penalty)</span>
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                margin: '0 0 12px 0',
              }}
            >
              Requesting <strong>Level {nextHintLevel} Hint</strong> will deduct{' '}
              <strong style={{ color: 'var(--neon-red)' }}>15%</strong> from this
              round&apos;s score potential.
            </p>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                margin: 0,
              }}
            >
              Level {nextHintLevel}: {getHintLevelDescription(nextHintLevel)}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '16px',
              }}
            >
              <button
                className="btn-neon"
                onClick={handleCancelConfirmation}
                disabled={loading}
              >
                <span>Cancel</span>
              </button>
              <button
                className="btn-neon btn-neon-magenta"
                onClick={handleConfirmAndFetch}
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <span>{loading ? '⏳ Deducting & Loading...' : 'Confirm (-15%)'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── STATE: REVEALED / SUMMARY / AUDIT LOG ──────────────────────── */
          <div>
            {hintContext.auditLog.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  marginBottom: '16px',
                }}
              >
                {hintContext.auditLog.map((record) => (
                  <div
                    key={record.hintIndex}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span style={{ color: 'var(--neon-yellow)', fontWeight: 700 }}>
                        💡 HINT {record.hintIndex}
                      </span>
                      <span style={{ color: 'var(--neon-red)' }}>
                        -{record.penaltyDeducted}% Penalty
                      </span>
                    </div>
                    <div
                      style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {record.hintText}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  marginBottom: '16px',
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Hints provide progressive clues for finding and fixing the intentional
                bug. Each hint incurs a compound 15% score deduction (capped at 80%).
              </div>
            )}

            {/* Audit Log Summary */}
            {hintContext.auditLog.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '16px',
                }}
              >
                <History size={13} />
                <span>
                  Audit: {hintContext.auditLog.length} hint(s) recorded • Total penalty:{' '}
                  {hintContext.auditLog.length * 15}%
                </span>
              </div>
            )}

            {/* Status notice when exhausted or timer expired */}
            {isTimerExpired && (
              <div
                style={{
                  color: 'var(--neon-red)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '14px',
                }}
              >
                ⚠️ Time expired: hint requests are disabled.
              </div>
            )}

            {isExhausted && !isTimerExpired && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--neon-yellow)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>All {maxHints} hints have been unlocked for this challenge.</span>
              </div>
            )}

            {/* Modal Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-neon" onClick={handleClose}>
                <span>Close</span>
              </button>

              {!isExhausted && !isTimerExpired && (
                <button
                  className="btn-neon btn-neon-yellow"
                  onClick={handleStartRequestHint}
                >
                  <span>
                    💡 Use Hint {nextHintLevel} (-15%)
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
