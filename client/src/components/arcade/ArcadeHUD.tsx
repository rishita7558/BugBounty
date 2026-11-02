/**
 * @file ArcadeHUD.tsx
 * @description Radial countdown indicator and combo multiplier display — ICE MATRIX edition.
 * Renders an animated SVG progress ring with cryogenic indicators, segment tick marks,
 * dynamic warning thresholds, and tactical multipliers.
 */

import { useGameStore } from '@/store/useGameStore';
import { formatTime } from '@/lib/utils';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Computes the visual multiplier badge label for consecutive solve streaks.
 *
 * @param combo Consecutive correct solutions count.
 * @returns Multiplier badge text or null if no multiplier is active.
 */
function getMultiplierLabel(combo: number): string | null {
  if (combo >= 7) return 'x5';
  if (combo >= 4) return 'x3';
  if (combo >= 2) return 'x2';
  return null;
}

/**
 * ArcadeHUD component rendering countdown circle and combo bonuses.
 *
 * @returns Rendered HUD element.
 */
export function ArcadeHUD() {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const timerActive = useGameStore((s) => s.timerActive);
  const challenge = useGameStore((s) => s.challenge);
  const combo = useGameStore((s) => s.combo);

  const totalTime = challenge?.timeLimit ?? 120;
  const progress = totalTime > 0 ? Math.max(0, timeRemaining / totalTime) : 0;

  const isWarning = timeRemaining <= 30 && timeRemaining > 0;
  const isCritical = timeRemaining <= 10 && timeRemaining > 0;

  // SVG ring offset — shrinks clockwise as time drains
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Ring colour transitions: Electric Cyan -> Ice Blue -> Controlled Alert Ruby
  const ringColour = isCritical ? '#FF3B69' : isWarning ? '#65CFFF' : '#00D9FF';
  const ringGlow = isCritical
    ? 'drop-shadow(0 0 10px rgba(255, 59, 105, 0.85))'
    : isWarning
    ? 'drop-shadow(0 0 8px rgba(101, 207, 255, 0.75))'
    : 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.65))';

  const multiplierLabel = getMultiplierLabel(combo);
  const multiplierFloat = combo > 1 ? (1 + (combo - 1) * 0.25).toFixed(2) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {/* ── Cryogenic Countdown Gauge ─────────────────────────────────────── */}
      <div
        className="pixel-box hud-corner-brackets"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          minWidth: '175px',
          background: 'rgba(8, 20, 38, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          boxShadow: '0 8px 30px rgba(5, 11, 24, 0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '5px',
              height: '5px',
              background: ringColour,
              boxShadow: `0 0 6px ${ringColour}`,
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
            CRYO-TIMER
          </span>
        </div>

        {/* SVG radial ring */}
        <div style={{ position: 'relative', width: '128px', height: '128px' }}>
          <svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            style={{ transform: 'rotate(-90deg)', display: 'block' }}
          >
            {/* Background track */}
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke="rgba(129, 153, 181, 0.12)"
              strokeWidth="6"
            />
            {/* Inner secondary cyber tick track */}
            <circle
              cx="64"
              cy="64"
              r={RADIUS - 8}
              fill="none"
              stroke="rgba(0, 217, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            {/* Animated progress ring */}
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={ringColour}
              strokeWidth="6"
              strokeLinecap="square"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.95s linear, stroke 0.4s ease',
                filter: ringGlow,
              }}
            />
          </svg>

          {/* Center time display */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}
          >
            <span
              className="arcade-text"
              style={{
                fontSize: '1.25rem',
                color: ringColour,
                textShadow: isCritical
                  ? '0 0 18px rgba(255, 59, 105, 0.9)'
                  : isWarning
                  ? '0 0 14px rgba(101, 207, 255, 0.8)'
                  : '0 0 12px rgba(0, 217, 255, 0.7)',
                lineHeight: 1,
              }}
            >
              {formatTime(timeRemaining)}
            </span>

            {!timerActive && timeRemaining > 0 && (
              <span
                style={{
                  fontSize: '0.55rem',
                  color: '#B8D8EA',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '1px',
                }}
              >
                [PAUSED]
              </span>
            )}
          </div>
        </div>

        {/* Pulsing danger border when warning */}
        {isWarning && (
          <div
            className="animate-pulse-glow"
            style={{
              position: 'absolute',
              inset: '-1px',
              border: `1px solid ${ringColour}`,
              opacity: 0.65,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* ── Combo Counter ───────────────────────────────────────────────── */}
      {combo > 0 && (
        <div
          className="pixel-box animate-score-pop"
          style={{
            padding: '12px 20px',
            textAlign: 'center',
            minWidth: '175px',
            background: 'rgba(8, 20, 38, 0.9)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
          }}
        >
          <span
            style={{
              fontSize: '0.6rem',
              color: '#8199B5',
              letterSpacing: '2px',
              display: 'block',
              marginBottom: '2px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            MATRIX COMBO
          </span>

          {/* Big combo number */}
          <span
            className="arcade-text"
            style={{
              fontSize: '1.75rem',
              display: 'block',
              color: '#00D9FF',
              textShadow: '0 0 16px rgba(0, 217, 255, 0.7)',
            }}
          >
            x{combo}
          </span>

          {/* Tier label: x2 / x3 / x5 */}
          {multiplierLabel && (
            <span
              style={{
                fontSize: '0.65rem',
                color: '#65CFFF',
                fontFamily: 'var(--font-mono)',
                display: 'block',
                marginTop: '2px',
                fontWeight: 700,
              }}
            >
              {multiplierLabel} MULTIPLIER
            </span>
          )}

          {/* Precise float multiplier */}
          {multiplierFloat && (
            <span
              style={{
                fontSize: '0.65rem',
                color: '#8199B5',
                fontFamily: 'var(--font-mono)',
                display: 'block',
              }}
            >
              ×{multiplierFloat} BONUS
            </span>
          )}
        </div>
      )}
    </div>
  );
}
