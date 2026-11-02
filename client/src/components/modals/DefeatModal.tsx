/**
 * @file DefeatModal.tsx
 * @description Modal dialog rendered upon defeat, timer expiration, or forfeit — ICE MATRIX edition.
 * Resets local daily calendar streak records in IndexedDB and reveals the reference bug description.
 */

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { RotateCcw, AlertOctagon, ChevronRight } from 'lucide-react';
import { resetPlayerStreak } from '@/lib/db';

/**
 * Properties accepted by the DefeatModal component.
 */
export interface DefeatModalProps {
  /** Optional callback to advance directly to generating the next challenge. */
  onNextChallenge?: () => void;
}

/**
 * DefeatModal component displaying forfeiture/timeout status and reference bug explanation.
 *
 * @param props Component properties.
 * @returns Rendered modal overlay or null if not in defeat phase.
 */
export function DefeatModal({ onNextChallenge }: DefeatModalProps) {
  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    if (phase === 'defeat') {
      resetPlayerStreak().catch((err) => console.error('Failed to reset streak in Dexie:', err));
    }
  }, [phase]);

  if (phase !== 'defeat' || !challenge) return null;

  const isSurrendered = timeRemaining > 0;

  const handleNext = () => {
    if (onNextChallenge) {
      onNextChallenge();
    } else {
      resetGame();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="pixel-box hud-corner-brackets animate-screen-shake"
        style={{
          padding: '36px',
          maxWidth: '520px',
          width: '92%',
          textAlign: 'center',
          background: 'rgba(8, 20, 38, 0.95)',
          border: '1px solid rgba(255, 59, 105, 0.5)',
          boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(255, 59, 105, 0.25)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'rgba(255, 59, 105, 0.12)',
            border: '1px solid rgba(255, 59, 105, 0.4)',
            marginBottom: '14px',
            color: '#FF3B69',
          }}
          className="pixel-box"
        >
          <AlertOctagon size={30} />
        </div>

        <div className="pixel-status-badge" style={{ marginBottom: '8px', color: '#FF3B69', borderColor: 'rgba(255, 59, 105, 0.4)' }}>
          {isSurrendered ? 'SESSION STATUS: FORFEITED' : 'SESSION STATUS: CRYO-TIMER DEPLETED'}
        </div>

        <div
          className="arcade-text"
          style={{ fontSize: '1.2rem', color: '#FF3B69', marginBottom: '8px' }}
        >
          {isSurrendered ? 'CHALLENGE SURRENDERED' : 'SYSTEM LOCKOUT • TIME EXPIRED'}
        </div>

        <div
          style={{
            color: '#8199B5',
            marginBottom: '20px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          TARGET: {challenge.title}
        </div>

        {/* Reference bug explanation container */}
        <div
          style={{
            background: '#050B18',
            border: '1px solid rgba(0, 217, 255, 0.25)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: '#00D9FF',
              marginBottom: '8px',
              fontWeight: 700,
              letterSpacing: '1px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            REFERENCE ANOMALY ANALYSIS:
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#EAF8FF',
              lineHeight: 1.55,
            }}
          >
            {challenge.bugDescription}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-pixel-cyber"
            onClick={() => resetGame()}
          >
            <RotateCcw size={14} color="#8199B5" /> Return to Lobby
          </button>

          <button
            className="btn-pixel-primary"
            onClick={handleNext}
          >
            Try Another Challenge <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
