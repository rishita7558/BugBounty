/**
 * @file HintModal.tsx
 * @description Progressive hint dialog governed by the HintStateMachine — ICE MATRIX edition.
 * Manages confirmation transitions, penalty disclosures (-15% per tier),
 * remote hint retrieval, and historical audit trail records for applied clues.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getHint } from '@/services/api';
import { Lightbulb, AlertTriangle, History, Pause } from 'lucide-react';
import { PixelCloseButton } from '@/components/common/PixelCloseButton';

/**
 * Properties accepted by the HintModal component.
 */
export interface HintModalProps {
  /** Whether the hint modal dialog is currently visible. */
  open: boolean;
  /** Callback fired when closing or dismissing the modal dialog. */
  onClose: () => void;
}

/**
 * HintModal component displaying progressive clues, confirmation barriers, and audit records.
 *
 * @param props Component properties.
 * @returns Rendered modal overlay or null if closed.
 */
export function HintModal({ open, onClose }: HintModalProps) {
  const challenge = useGameStore((s) => s.challenge);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const phase = useGameStore((s) => s.phase);
  const hintContext = useGameStore((s) => s.hintContext);
  const cancelHint = useGameStore((s) => s.cancelHint);
  const confirmHint = useGameStore((s) => s.confirmHint);
  const requestHint = useGameStore((s) => s.requestHint);
  const dismissHint = useGameStore((s) => s.dismissHint);
  const setTimerActive = useGameStore((s) => s.setTimerActive);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    dismissHint();
    onClose();
    const currentPhase = useGameStore.getState().phase;
    const currentTime = useGameStore.getState().timeRemaining;
    if (currentPhase === 'playing' && currentTime > 0) {
      setTimerActive(true);
    }
  }, [dismissHint, onClose, setTimerActive]);

  // Pause the countdown timer whenever the clue modal is open or clue is generating
  useEffect(() => {
    if (!open) return;
    setTimerActive(false);

    return () => {
      // Resume timer on unmount / modal close if challenge is still active
      const currentPhase = useGameStore.getState().phase;
      const currentTime = useGameStore.getState().timeRemaining;
      if (currentPhase === 'playing' && currentTime > 0) {
        setTimerActive(true);
      }
    };
  }, [open, setTimerActive]);

  // Global Escape keydown listener to close the modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

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
    setTimerActive(false); // Explicitly ensure timer is paused on request
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
    setTimerActive(false); // Strictly guarantee countdown is frozen during AI clue processing
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={handleClose}
    >
      <div
        className="pixel-box hud-corner-brackets animate-score-pop"
        style={{
          padding: '30px',
          maxWidth: '520px',
          width: '92%',
          background: 'rgba(8, 20, 38, 0.95)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          boxShadow: '0 20px 50px rgba(5, 11, 24, 0.9), 0 0 30px rgba(0, 217, 255, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={20} color="#00D9FF" />
            <span
              className="arcade-text"
              style={{ fontSize: '0.75rem', color: '#00D9FF' }}
            >
              HINT PROTOCOL — {hintsUsed}/{maxHints} USED
            </span>
          </div>
          <PixelCloseButton
            onClick={handleClose}
            title="Close hint protocol (Esc)"
          />
        </div>

        {/* Cryo-Timer Pause Notice */}
        <div
          style={{
            border: '1px solid rgba(0, 240, 255, 0.4)',
            background: 'rgba(0, 240, 255, 0.08)',
            padding: '8px 12px',
            marginBottom: '16px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-arcade, monospace)',
            color: '#00f0ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pause size={12} color="#00f0ff" />
            <span>CRYO-TIMER FROZEN</span>
          </div>
          <span style={{ fontSize: '0.62rem', color: '#8199b5', fontFamily: 'var(--font-mono)' }}>
            Processing time is not deducted
          </span>
        </div>

        {/* Error notification display */}
        {fetchError && (
          <div
            style={{
              background: 'rgba(255, 59, 105, 0.15)',
              border: '1px solid rgba(255, 59, 105, 0.4)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: '#FF3B69',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <AlertTriangle size={16} />
            <span>{fetchError}</span>
          </div>
        )}

        {/* ── State: Confirmation Dialog ──────────────────────────────────── */}
        {isConfirming ? (
          <div
            style={{
              background: 'rgba(5, 11, 24, 0.8)',
              border: '1px solid rgba(0, 217, 255, 0.35)',
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
                color: '#65CFFF',
              }}
            >
              <AlertTriangle size={18} color="#65CFFF" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                }}
              >
                CONFIRM DECRYPTION PENALTY
              </span>
            </div>

            <p
              style={{
                fontSize: '0.82rem',
                color: '#8199B5',
                lineHeight: 1.5,
                marginBottom: '12px',
              }}
            >
              Requesting Hint Tier #{nextHintLevel} applies a <strong>-15% point penalty</strong> to your final round score.
            </p>

            <div
              style={{
                fontSize: '0.75rem',
                color: '#EAF8FF',
                background: 'rgba(0, 217, 255, 0.08)',
                padding: '8px 12px',
                borderLeft: '2px solid #00D9FF',
                marginBottom: '16px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Tier {nextHintLevel}: {getHintLevelDescription(nextHintLevel)}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn-pixel-cyber"
                onClick={handleCancelConfirmation}
                disabled={loading}
              >
                Abort
              </button>
              <button
                className="btn-pixel-primary"
                onClick={handleConfirmAndFetch}
                disabled={loading}
              >
                {loading ? 'Decrypting Clue (Timer Paused)...' : 'Confirm (-15%)'}
              </button>
            </div>
          </div>
        ) : (
          /* ── State: Ready for Hint Request ───────────────────────────────── */
          !isExhausted &&
          !isTimerExpired && (
            <div
              style={{
                background: 'rgba(5, 11, 24, 0.7)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#EAF8FF',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Tier {nextHintLevel} Available
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#8199B5',
                  marginBottom: '14px',
                  lineHeight: 1.4,
                }}
              >
                {getHintLevelDescription(nextHintLevel)}
              </div>
              <button
                className="btn-pixel-primary"
                onClick={handleStartRequestHint}
                style={{ width: '100%', padding: '10px' }}
              >
                Request Clue Tier {nextHintLevel}
              </button>
            </div>
          )
        )}

        {/* ── State: Hint Audit Trail ──────────────────────────────────────── */}
        {hintContext.auditLog.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
                color: '#8199B5',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              <History size={14} color="#00D9FF" /> DECRYPTED CLUES LOG:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hintContext.auditLog.map((record, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#050B18',
                    border: '1px solid rgba(0, 217, 255, 0.25)',
                    padding: '12px',
                    fontSize: '0.8rem',
                    color: '#EAF8FF',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.5,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#00D9FF',
                      marginBottom: '4px',
                      fontWeight: 700,
                    }}
                  >
                    TIER {record.hintIndex} LOG (-{record.penaltyDeducted}%)
                  </div>
                  {record.hintText}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
