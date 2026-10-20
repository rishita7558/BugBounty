import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getHint } from '@/services/api';

// ---------------------------------------------------------------------------
// Hint Modal — Progressive AI hints with point penalties
// ---------------------------------------------------------------------------

export function HintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const challenge = useGameStore((s) => s.challenge);
  const currentHintLevel = useGameStore((s) => s.currentHintLevel);
  const triggerUseHint = useGameStore((s) => s.useHint);
  const [hint, setHint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [penalty, setPenalty] = useState(0);

  if (!open || !challenge) return null;

  const handleGetHint = async () => {
    setLoading(true);
    try {
      const nextLevel = currentHintLevel + 1;
      const result = await getHint(challenge.buggyCode, challenge.description, nextLevel);
      setHint(result.hint);
      setPenalty(result.pointPenalty);
      triggerUseHint();
    } catch {
      setHint('Failed to get hint. Check your connection.');
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
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-score-pop"
        style={{
          padding: '32px',
          maxWidth: '440px',
          width: '90%',
          border: '1px solid rgba(255, 230, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="arcade-text" style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', marginBottom: '16px' }}>
          💡 AI HINT — LEVEL {currentHintLevel}/{3}
        </div>

        {hint ? (
          <div
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}
          >
            {hint}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.85rem' }}>
            Using a hint will deduct points from your score. Higher-level hints cost more but are more helpful.
          </div>
        )}

        {penalty > 0 && (
          <div style={{ color: 'var(--neon-red)', fontSize: '0.75rem', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
            Point penalty: -{penalty}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn-neon" onClick={onClose}>
            <span>Close</span>
          </button>
          {currentHintLevel < 3 && (
            <button
              className="btn-neon btn-neon-magenta"
              onClick={handleGetHint}
              disabled={loading}
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              <span>{loading ? '⏳ Loading...' : `🔍 Get Level ${currentHintLevel + 1} Hint`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
