/**
 * @file EvaluationFailureModal.tsx
 * @description Modal dialog presented when a player's submission fails evaluation — ICE MATRIX edition.
 * Displays accurate test failure statistics, diagnostic feedback, remediation hints,
 * and immediate retry options without awarding false bounty points or streaks.
 */

import { useGameStore } from '@/store/useGameStore';
import { AlertOctagon, RefreshCw, Flag, ChevronRight, AlertTriangle } from 'lucide-react';

export interface EvaluationFailureModalProps {
  open: boolean;
  onClose: () => void;
  onNextChallenge?: () => void;
  onSurrender?: () => void;
}

export function EvaluationFailureModal({
  open,
  onClose,
  onNextChallenge,
  onSurrender,
}: EvaluationFailureModalProps) {
  const review = useGameStore((s) => s.review);
  const challenge = useGameStore((s) => s.challenge);

  if (!open || !review || review.correct) return null;

  const passedTests = review.passedTests ?? 0;
  const totalTests = review.totalTests ?? 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-box hud-corner-brackets animate-screen-shake"
        style={{
          padding: '36px',
          maxWidth: '560px',
          width: '92%',
          textAlign: 'center',
          background: 'rgba(8, 20, 38, 0.96)',
          border: '2px solid rgba(255, 59, 105, 0.55)',
          boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(255, 59, 105, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alert Icon */}
        <div
          style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'rgba(255, 59, 105, 0.12)',
            border: '1px solid rgba(255, 59, 105, 0.4)',
            marginBottom: '14px',
            color: '#FF3B69',
          }}
          className="pixel-box"
        >
          <AlertOctagon size={32} />
        </div>

        {/* Status Badge */}
        <div
          className="pixel-status-badge"
          style={{
            marginBottom: '10px',
            color: '#FF3B69',
            borderColor: 'rgba(255, 59, 105, 0.5)',
          }}
        >
          EVALUATION STATUS: REJECTED
        </div>

        {/* Title */}
        <div
          className="arcade-text"
          style={{ fontSize: '1.15rem', color: '#FF3B69', marginBottom: '8px' }}
        >
          VULNERABILITY PERSISTS
        </div>

        <div
          style={{
            color: '#8199B5',
            marginBottom: '18px',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          TARGET: {challenge?.title}
        </div>

        {/* Test Summary Pill Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div
            className="pixel-box"
            style={{
              padding: '12px',
              background: 'rgba(5, 11, 24, 0.75)',
              border: '1px solid rgba(255, 59, 105, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                color: '#8199B5',
                marginBottom: '4px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              TEST ASSERTIONS
            </div>
            <div
              className="arcade-text"
              style={{
                fontSize: '1.1rem',
                color: passedTests === totalTests ? '#00D9FF' : '#FF3B69',
              }}
            >
              {passedTests} / {totalTests}
            </div>
          </div>

          <div
            className="pixel-box"
            style={{
              padding: '12px',
              background: 'rgba(5, 11, 24, 0.75)',
              border: '1px solid rgba(255, 59, 105, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                color: '#8199B5',
                marginBottom: '4px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              BOUNTY AWARDED
            </div>
            <div
              className="arcade-text"
              style={{ fontSize: '1.1rem', color: '#8199B5' }}
            >
              +0 PTS
            </div>
          </div>
        </div>

        {/* Failure Message Box */}
        <div
          style={{
            background: '#050B18',
            border: '1px solid rgba(255, 59, 105, 0.35)',
            padding: '14px',
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: '#FF3B69',
              marginBottom: '6px',
              fontWeight: 700,
              letterSpacing: '1px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} color="#FF3B69" /> DIAGNOSTIC FEEDBACK:
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#EAF8FF',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {review.message || review.feedback || 'The submitted solution did not pass evaluation.'}
          </div>
        </div>

        {/* Remediation Advice */}
        {review.explanation && review.explanation !== review.message && (
          <div
            style={{
              background: 'rgba(8, 20, 38, 0.8)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '0.78rem',
              color: '#8199B5',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: '#00D9FF', fontWeight: 700 }}>CLUE: </span>
            {review.explanation}
          </div>
        )}

        {/* Action Triggers */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn-pixel-primary"
            onClick={onClose}
            style={{ padding: '10px 20px' }}
          >
            <RefreshCw size={14} /> Return to Code & Fix
          </button>

          {onSurrender && (
            <button
              className="btn-pixel-cyber"
              onClick={onSurrender}
              style={{
                borderColor: 'rgba(255, 59, 105, 0.45)',
                color: '#FF3B69',
              }}
            >
              <Flag size={14} color="#FF3B69" /> Surrender
            </button>
          )}

          {onNextChallenge && (
            <button
              className="btn-pixel-cyber"
              onClick={onNextChallenge}
            >
              Skip Challenge <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
