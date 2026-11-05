/**
 * @file Scoreboard.tsx
 * @description Header statistics bar for BugBounty — ICE MATRIX edition.
 * Displays cumulative player score, active cryogenic combo multiplier, solved challenge totals,
 * and current versus all-time high calendar-day streak metrics.
 */

import { useGameStore } from '@/store/useGameStore';
import { formatScore } from '@/lib/utils';
import { Zap, CheckCircle2, ShieldCheck, Trophy } from 'lucide-react';

/**
 * Scoreboard component presenting vital player performance metrics in Ice Matrix styling.
 *
 * @returns Rendered scoreboard statistics bar.
 */
export function Scoreboard() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const totalSolved = useGameStore((s) => s.totalSolved);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const highestStreak = useGameStore((s) => s.highestStreak);

  const multiplier = 1 + (combo - 1) * 0.25;

  return (
    <div
      className="pixel-box"
      style={{
        padding: '14px 22px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'rgba(8, 20, 38, 0.85)',
        border: '1px solid rgba(0, 217, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(5, 11, 24, 0.7)',
      }}
    >
      {/* Score Metric Cluster */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              background: '#00D9FF',
              boxShadow: '0 0 6px #00D9FF',
            }}
          />
          <span
            style={{
              fontSize: '0.65rem',
              color: '#8199B5',
              letterSpacing: '2px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            SCORE TELEMETRY
          </span>
        </div>
        <span
          className="arcade-text"
          style={{
            fontSize: '1.25rem',
            color: '#EAF8FF',
            textShadow: '0 0 12px rgba(0, 217, 255, 0.5)',
            marginTop: '2px',
          }}
        >
          {formatScore(score)}
        </span>
      </div>

      {/* Cryo-Combo Multiplier Display */}
      {combo > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '2px 14px',
            borderLeft: '1px solid rgba(0, 217, 255, 0.2)',
            borderRight: '1px solid rgba(0, 217, 255, 0.2)',
          }}
          className="animate-score-pop"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={12} color="#00D9FF" />
            <span
              style={{
                fontSize: '0.6rem',
                color: '#65CFFF',
                letterSpacing: '1.5px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              CRYO-COMBO
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              className="arcade-text"
              style={{
                fontSize: '1.1rem',
                color: '#00D9FF',
                textShadow: '0 0 10px rgba(0, 217, 255, 0.7)',
              }}
            >
              x{combo}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#B8D8EA',
                fontFamily: 'var(--font-mono)',
              }}
            >
              (×{multiplier.toFixed(2)})
            </span>
          </div>
        </div>
      )}

      {/* Statistics Cluster: Solved vs Streaks vs Records */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: '#8199B5',
          fontFamily: 'var(--font-mono)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Total Solved */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} color="#00D9FF" />
            <span style={{ color: '#EAF8FF', fontSize: '1rem', fontWeight: 700 }}>
              {totalSolved}
            </span>
          </div>
          <span style={{ fontSize: '0.6rem', color: '#8199B5', letterSpacing: '1px' }}>
            SOLVED
          </span>
        </div>

        {/* Current Calendar Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#65CFFF" />
            <span style={{ color: '#65CFFF', fontSize: '1rem', fontWeight: 700 }}>
              {currentStreak} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>DAYS</span>
            </span>
          </div>
          <span style={{ fontSize: '0.6rem', color: '#8199B5', letterSpacing: '1px' }}>
            DAILY STREAK
          </span>
        </div>

        {/* All-time Record Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={14} color="#B8D8EA" />
            <span style={{ color: '#B8D8EA', fontSize: '1rem', fontWeight: 700 }}>
              {highestStreak} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>DAYS</span>
            </span>
          </div>
          <span style={{ fontSize: '0.6rem', color: '#8199B5', letterSpacing: '1px' }}>
            BEST STREAK
          </span>
        </div>
      </div>
    </div>
  );
}
