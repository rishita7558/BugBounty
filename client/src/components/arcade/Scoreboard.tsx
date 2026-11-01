import { useGameStore } from '@/store/useGameStore';
import { formatScore } from '@/lib/utils';
import { Flame, CheckCircle, Trophy } from 'lucide-react';

// ---------------------------------------------------------------------------
// Scoreboard — Displays score, combo multiplier, calendar streak, and solved count
// Strict differentiation between total problems solved and daily calendar streak.
// ---------------------------------------------------------------------------

export function Scoreboard() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const totalSolved = useGameStore((s) => s.totalSolved);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const highestStreak = useGameStore((s) => s.highestStreak);

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

      {/* Stats Cluster: Solved vs Calendar Streak vs Best */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Total Solved Problems */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={13} color="var(--neon-green)" />
            <span style={{ color: 'var(--neon-green)', fontSize: '1.1rem', fontWeight: 700 }}>
              {totalSolved}
            </span>
          </div>
          <span style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>SOLVED</span>
        </div>

        {/* Daily Calendar Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Flame size={14} color="var(--neon-yellow)" />
            <span style={{ color: 'var(--neon-yellow)', fontSize: '1.1rem', fontWeight: 700 }}>
              {currentStreak}d
            </span>
          </div>
          <span style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>STREAK</span>
        </div>

        {/* Best Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Trophy size={13} color="var(--neon-cyan)" />
            <span style={{ color: 'var(--neon-cyan)', fontSize: '1.1rem', fontWeight: 700 }}>
              {highestStreak}d
            </span>
          </div>
          <span style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>RECORD</span>
        </div>
      </div>
    </div>
  );
}
