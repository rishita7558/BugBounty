import { useGameStore } from '@/store/useGameStore';
import { formatTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ArcadeHUD — Ticking Bomb SVG Radial Ring + Combo Counter
// Spec: radial ring pulses red when < 30s remain; combos show x2/x3/x5 label
// ---------------------------------------------------------------------------

const RADIUS       = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 339.3

function getMultiplierLabel(combo: number): string | null {
  if (combo >= 7) return 'x5';
  if (combo >= 4) return 'x3';
  if (combo >= 2) return 'x2';
  return null;
}

export function ArcadeHUD() {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const timerActive   = useGameStore((s) => s.timerActive);
  const challenge     = useGameStore((s) => s.challenge);
  const combo         = useGameStore((s) => s.combo);

  const totalTime = challenge?.timeLimit ?? 120;
  const progress  = totalTime > 0 ? Math.max(0, timeRemaining / totalTime) : 0;

  const isWarning  = timeRemaining <= 30 && timeRemaining > 0;
  const isCritical = timeRemaining <= 10 && timeRemaining > 0;

  // SVG ring offset — shrinks clockwise as time drains
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Ring colour transitions: cyan → gold → red
  const ringColour = isCritical ? '#FF0055' : isWarning ? '#FFE600' : '#00E5FF';
  const ringGlow   = isCritical
    ? 'drop-shadow(0 0 8px rgba(255,0,85,0.95))'
    : isWarning
    ? 'drop-shadow(0 0 7px rgba(255,230,0,0.85))'
    : 'drop-shadow(0 0 6px rgba(0,229,255,0.65))';

  const multiplierLabel = getMultiplierLabel(combo);
  const multiplierFloat = combo > 1 ? (1 + (combo - 1) * 0.25).toFixed(2) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>

      {/* ── Bomb Countdown Ring ─────────────────────────────────────────── */}
      <div
        className="glass-card crt-overlay"
        style={{
          padding:        '16px',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '6px',
          minWidth:       '168px',
          position:       'relative',
        }}
      >
        <span
          className="arcade-text"
          style={{ fontSize: '0.45rem', color: 'var(--text-secondary)', letterSpacing: '3px' }}
        >
          ⏱ TIME
        </span>

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
              cx="64" cy="64" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
            />
            {/* Animated progress ring */}
            <circle
              cx="64" cy="64" r={RADIUS}
              fill="none"
              stroke={ringColour}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.95s linear, stroke 0.4s ease',
                filter:     ringGlow,
              }}
            />
          </svg>

          {/* Center time display */}
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '2px',
            }}
          >
            <span
              className={`arcade-text${isCritical ? ' animate-timer-warning' : ''}`}
              style={{
                fontSize:   '1.25rem',
                color:      ringColour,
                textShadow: isCritical
                  ? '0 0 20px rgba(255,0,85,0.95)'
                  : isWarning
                  ? '0 0 16px rgba(255,230,0,0.8)'
                  : '0 0 12px rgba(0,229,255,0.65)',
                lineHeight: 1,
              }}
            >
              {formatTime(timeRemaining)}
            </span>

            {!timerActive && timeRemaining > 0 && (
              <span
                style={{
                  fontSize:   '0.48rem',
                  color:      '#FFE600',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                PAUSED
              </span>
            )}
          </div>
        </div>

        {/* Pulsing danger border when warning */}
        {isWarning && (
          <div
            className="animate-pulse-glow"
            style={{
              position:     'absolute',
              inset:        '-2px',
              borderRadius: 'var(--radius-lg)',
              border:       `2px solid ${ringColour}`,
              opacity:      0.75,
              pointerEvents:'none',
            }}
          />
        )}
      </div>

      {/* ── Combo Counter ───────────────────────────────────────────────── */}
      {combo > 0 && (
        <div
          className="glass-card animate-score-pop"
          style={{
            padding:   '12px 20px',
            textAlign: 'center',
            minWidth:  '168px',
          }}
        >
          <span
            className="arcade-text"
            style={{
              fontSize:    '0.45rem',
              color:       'var(--text-secondary)',
              letterSpacing: '2px',
              display:     'block',
              marginBottom: '4px',
            }}
          >
            COMBO
          </span>

          {/* Big combo number */}
          <span className="combo-display" style={{ fontSize: '2rem', display: 'block' }}>
            x{combo}
          </span>

          {/* Tier label: x2 / x3 / x5 */}
          {multiplierLabel && (
            <span
              className="arcade-text"
              style={{
                fontSize:   '0.52rem',
                color:      '#FFE600',
                textShadow: '0 0 10px rgba(255,230,0,0.75)',
                display:    'block',
                marginTop:  '3px',
              }}
            >
              {multiplierLabel} MULTIPLIER
            </span>
          )}

          {/* Precise float multiplier */}
          {multiplierFloat && (
            <span
              style={{
                fontSize:   '0.65rem',
                color:      'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                display:    'block',
              }}
            >
              ×{multiplierFloat}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
