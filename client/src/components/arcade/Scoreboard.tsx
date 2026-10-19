import { useGameStore } from '@/store/useGameStore';
import { formatScore } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Scoreboard — Displays score, combo multiplier, and stats
// ---------------------------------------------------------------------------

export function Scoreboard() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const totalSolved = useGameStore((s) => s.totalSolved);

  const multiplier = 1 + (combo - 1) * 0.25;

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 20px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {/* Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span
          className="arcade-text"
          style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', letterSpacing: '2px' }}
        >
          SCORE
        </span>
        <span
          className="neon-text arcade-text"
          style={{ fontSize: '1.2rem' }}
        >
          {formatScore(score)}
        </span>
      </div>

      {/* Combo */}
      {combo > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          className="animate-score-pop"
        >
          <span
            className="arcade-text"
            style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', letterSpacing: '2px' }}
          >
            COMBO
          </span>
          <span className="combo-display">
            x{combo}
          </span>
          <span
            style={{
              fontSize: '0.6rem',
              color: 'var(--neon-magenta)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ×{multiplier.toFixed(2)}
          </span>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: 'var(--neon-green)', fontSize: '1rem', fontWeight: 700 }}>
            {totalSolved}
          </span>
          <span style={{ fontSize: '0.6rem' }}>SOLVED</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: 'var(--neon-yellow)', fontSize: '1rem', fontWeight: 700 }}>
            {maxCombo}
          </span>
          <span style={{ fontSize: '0.6rem' }}>BEST</span>
        </div>
      </div>
    </div>
  );
}
