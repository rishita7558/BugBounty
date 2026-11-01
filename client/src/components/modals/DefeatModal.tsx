// client/src/components/modals/DefeatModal.tsx
import { useGameStore } from '@/store/useGameStore';
import { RotateCcw, AlertOctagon, ChevronRight } from 'lucide-react';

interface DefeatModalProps {
  onNextChallenge?: () => void;
}

export function DefeatModal({ onNextChallenge }: DefeatModalProps) {
  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const resetGame = useGameStore((s) => s.resetGame);

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
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-shake"
        style={{
          padding: '36px',
          maxWidth: '500px',
          width: '92%',
          textAlign: 'center',
          border: '1px solid rgba(255, 0, 60, 0.45)',
          boxShadow: '0 0 40px rgba(255, 0, 60, 0.25)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '50%',
            background: 'rgba(255, 0, 60, 0.1)',
            marginBottom: '14px',
            color: 'var(--neon-red)',
          }}
        >
          <AlertOctagon size={32} />
        </div>

        <div
          className="arcade-text"
          style={{ fontSize: '1.15rem', color: 'var(--neon-red)', marginBottom: '8px' }}
        >
          {isSurrendered ? '🏳️ FORFEITED' : "💥 TIME'S UP!"}
        </div>

        <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
          {challenge.title}
        </div>

        {/* Correct solution display */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--neon-yellow)',
              marginBottom: '8px',
              fontWeight: 700,
              letterSpacing: '1px',
            }}
          >
            THE INTENTIONAL BUG WAS:
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
            }}
          >
            {challenge.bugDescription}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn-neon" onClick={resetGame}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={16} /> Return to Menu
            </span>
          </button>
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
