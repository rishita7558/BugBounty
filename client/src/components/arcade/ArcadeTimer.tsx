/**
 * @file ArcadeTimer.tsx
 * @description Compact digital countdown timer widget with CRT overlay styling — ICE MATRIX edition.
 * Displays formatted remaining challenge time and visually alerts players when the clock expires.
 */

import { useGameStore } from '@/store/useGameStore';
import { formatTime } from '@/lib/utils';

/**
 * ArcadeTimer component rendering digital countdown with visual warning pulses.
 *
 * @returns Rendered countdown timer element.
 */
export function ArcadeTimer() {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const timerActive = useGameStore((s) => s.timerActive);

  const isWarning = timeRemaining <= 15 && timeRemaining > 0;
  const isCritical = timeRemaining <= 5 && timeRemaining > 0;

  const timerColor = isCritical ? '#FF3B69' : isWarning ? '#65CFFF' : '#00D9FF';

  return (
    <div className="crt-overlay" style={{ position: 'relative' }}>
      <div
        className="pixel-box"
        style={{
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          minWidth: '140px',
          background: 'rgba(8, 20, 38, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
        }}
      >
        <span
          className="arcade-text"
          style={{
            fontSize: '0.55rem',
            color: '#8199B5',
            letterSpacing: '3px',
          }}
        >
          ⏱ TIME
        </span>
        <span
          className="arcade-text"
          style={{
            fontSize: '1.6rem',
            color: timerColor,
            textShadow: isCritical
              ? '0 0 20px rgba(255, 59, 105, 0.9)'
              : isWarning
              ? '0 0 15px rgba(101, 207, 255, 0.7)'
              : '0 0 15px rgba(0, 217, 255, 0.6)',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {formatTime(timeRemaining)}
        </span>
        {!timerActive && timeRemaining > 0 && (
          <span
            style={{
              fontSize: '0.6rem',
              color: '#B8D8EA',
              fontFamily: 'var(--font-mono)',
            }}
          >
            PAUSED
          </span>
        )}
      </div>

      {/* Pulsing warning border */}
      {isWarning && (
        <div
          style={{
            position: 'absolute',
            inset: '-1px',
            border: `1px solid ${timerColor}`,
            opacity: 0.6,
            pointerEvents: 'none',
          }}
          className="animate-pulse-glow"
        />
      )}
    </div>
  );
}
