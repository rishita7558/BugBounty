import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { resetPlayerStreak } from '@/lib/db';

// ---------------------------------------------------------------------------
// Defeat Modal — Shown when the timer runs out
// Resets local player streak in Dexie.js persistence engine.
// ---------------------------------------------------------------------------

export function DefeatModal() {
  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    if (phase === 'defeat') {
      resetPlayerStreak().catch((err) => console.error('Failed to reset streak in Dexie:', err));
    }
  }, [phase]);

  if (phase !== 'defeat' || !challenge) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-shake"
        style={{
          padding: '40px',
          maxWidth: '480px',
          width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(255, 0, 60, 0.4)',
          boxShadow: '0 0 40px rgba(255, 0, 60, 0.2)',
        }}
      >
        <div className="arcade-text" style={{ fontSize: '1.2rem', color: 'var(--neon-red)', marginBottom: '8px' }}>
          💥 TIME'S UP!
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {challenge.title}
        </div>

        {/* Show the correct fix */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--neon-yellow)', marginBottom: '8px', fontWeight: 600 }}>
            THE BUG WAS:
          </div>
          <div
            style={{
              fontSize: '0.85rem',
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
            <span>🔄 Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
