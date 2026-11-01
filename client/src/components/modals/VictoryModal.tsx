import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { formatScore } from '@/lib/utils';
import { Zap, Clock, Lightbulb, Flame, Award, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Victory Modal — Shows OOP Strategy Score Breakdown & Calendar Streak
// ---------------------------------------------------------------------------

interface VictoryModalProps {
  onNextChallenge?: () => void;
}

export function VictoryModal({ onNextChallenge }: VictoryModalProps) {
  const phase = useGameStore((s) => s.phase);
  const review = useGameStore((s) => s.review);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const challenge = useGameStore((s) => s.challenge);
  const resetGame = useGameStore((s) => s.resetGame);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const lastScoreBreakdown = useGameStore((s) => s.lastScoreBreakdown);
  const [hasConfetti, setHasConfetti] = useState(false);

  if (phase !== 'victory' || !review) return null;

  // Trigger confetti once per victory screen
  if (!hasConfetti) {
    setHasConfetti(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#ff00e5', '#39ff14', '#ffe600'],
    });
  }

  const breakdown = review.scoreBreakdown ?? lastScoreBreakdown;

  const handleNext = () => {
    setHasConfetti(false);
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
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-score-pop"
        style={{
          padding: '36px',
          maxWidth: '520px',
          width: '92%',
          textAlign: 'center',
          border: '1px solid rgba(57, 255, 20, 0.4)',
          boxShadow: 'var(--glow-green)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Title */}
        <div
          className="arcade-text neon-text-green"
          style={{ fontSize: '1.25rem', marginBottom: '6px' }}
        >
          🎯 BUG SQUASHED!
        </div>
        <div
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '20px',
            fontSize: '0.85rem',
          }}
        >
          {challenge?.title}
        </div>

        {/* Top Badges: Score & Streak */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              POINTS WON
            </div>
            <div className="neon-text" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              +{review.score}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              COMBO
            </div>
            <div className="combo-display" style={{ fontSize: '1.35rem' }}>
              x{combo}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              DAILY STREAK
            </div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--neon-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              🔥 {currentStreak}
            </div>
          </div>
        </div>

        {/* Itemized OOP Score Engine Breakdown */}
        {breakdown && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
            }}
          >
            <div
              className="arcade-text"
              style={{
                fontSize: '0.6rem',
                color: 'var(--neon-cyan)',
                marginBottom: '10px',
                letterSpacing: '1px',
              }}
            >
              📊 SCORING ENGINE BREAKDOWN (SRP STRATEGY)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={13} color="var(--neon-cyan)" /> Base Points:
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  +{breakdown.basePoints}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} color="var(--neon-green)" /> Time Bonus ({Math.round(breakdown.timeRatio * 50)}%):
                </span>
                <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>
                  +{breakdown.timeBonus}
                </span>
              </div>

              {breakdown.hintPenaltyRatio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={13} color="var(--neon-red)" /> Hint Penalty (-{Math.round(breakdown.hintPenaltyRatio * 100)}%):
                  </span>
                  <span style={{ color: 'var(--neon-red)', fontWeight: 600 }}>
                    -{breakdown.hintPenaltyAmount}
                  </span>
                </div>
              )}

              {breakdown.streakMultiplier > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={13} color="var(--neon-yellow)" /> Streak Multiplier:
                  </span>
                  <span style={{ color: 'var(--neon-yellow)', fontWeight: 600 }}>
                    ×{breakdown.streakMultiplier.toFixed(1)}
                  </span>
                </div>
              )}

              {breakdown.firstAttemptBonus > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={13} color="var(--neon-magenta)" /> First Attempt Bonus:
                  </span>
                  <span style={{ color: 'var(--neon-magenta)', fontWeight: 600 }}>
                    +{breakdown.firstAttemptBonus}
                  </span>
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '6px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--neon-green)' }}>Final Round Score:</span>
                <span style={{ color: 'var(--neon-green)' }}>+{breakdown.finalScore} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Feedback from LLM/Engine */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.5,
          }}
        >
          {review.feedback}
        </div>

        {/* Overall Total */}
        <div style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Career Score: <span className="neon-text" style={{ fontWeight: 700 }}>{formatScore(score)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn-neon btn-neon-green"
            onClick={handleNext}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎮 Next Challenge</span>
              <ChevronRight size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
