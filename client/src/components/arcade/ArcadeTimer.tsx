import { useGameStore } from '@/store/useGameStore';
import { formatTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Arcade Timer — Ticking bomb countdown with CRT scanline overlay
// ---------------------------------------------------------------------------

export function ArcadeTimer() {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const timerActive = useGameStore((s) => s.timerActive);

  const isWarning = timeRemaining <= 15 && timeRemaining > 0;
  const isCritical = timeRemaining <= 5 && timeRemaining > 0;

  return (
    <div className="crt-overlay" style={{ position: 'relative' }}>
      <div
        className="glass-card"
        style={{
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          minWidth: '140px',
        }}
      >
        <span
          className="arcade-text"
          style={{
            fontSize: '0.55rem',
            color: 'var(--text-secondary)',
            letterSpacing: '3px',
          }}
        >
          ⏱ TIME
        </span>
        <span
          className={`arcade-text ${isCritical ? 'animate-timer-warning' : ''}`}
          style={{
            fontSize: '1.6rem',
            color: isCritical
              ? 'var(--neon-red)'
              : isWarning
              ? 'var(--neon-yellow)'
              : 'var(--neon-cyan)',
            textShadow: isCritical
              ? '0 0 20px rgba(255, 0, 60, 0.8)'
              : isWarning
              ? '0 0 15px rgba(255, 230, 0, 0.6)'
              : '0 0 15px rgba(0, 240, 255, 0.5)',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {formatTime(timeRemaining)}
        </span>
        {!timerActive && timeRemaining > 0 && (
          <span
            style={{
              fontSize: '0.6rem',
              color: 'var(--neon-yellow)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            PAUSED
          </span>
        )}
      </div>

      {/* Pulsing border when warning */}
      {isWarning && (
        <div
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: 'var(--radius-lg)',
            border: `2px solid ${isCritical ? 'var(--neon-red)' : 'var(--neon-yellow)'}`,
            opacity: 0.6,
            pointerEvents: 'none',
          }}
          className="animate-pulse-glow"
        />
      )}
    </div>
  );
}
