import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { formatScore } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Victory Modal — Shown when a challenge is solved correctly
// ---------------------------------------------------------------------------

export function VictoryModal() {
  const phase = useGameStore((s) => s.phase);
  const review = useGameStore((s) => s.review);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const challenge = useGameStore((s) => s.challenge);
  const resetGame = useGameStore((s) => s.resetGame);
  const [hasConfetti, setHasConfetti] = useState(false);

  if (phase !== 'victory' || !review) return null;

  // Trigger confetti once
  if (!hasConfetti) {
    setHasConfetti(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#ff00e5', '#39ff14', '#ffe600'],
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-score-pop"
        style={{
          padding: '40px',
          maxWidth: '480px',
          width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(57, 255, 20, 0.3)',
          boxShadow: 'var(--glow-green)',
        }}
      >
        {/* Title */}
        <div className="arcade-text neon-text-green" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
          🎯 BUG SQUASHED!
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
          {challenge?.title}
        </div>

        {/* Score breakdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              SCORE
            </div>
            <div className="neon-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              +{review.score}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              COMBO
            </div>
            <div className="combo-display" style={{ fontSize: '1.5rem' }}>
              x{combo}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
          }}
        >
          {review.feedback}
        </div>

        {/* Total */}
        <div style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Total Score: <span className="neon-text" style={{ fontWeight: 700 }}>{formatScore(score)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn-neon btn-neon-green"
            onClick={() => {
              setHasConfetti(false);
              resetGame();
            }}
          >
            <span>🎮 Next Challenge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
