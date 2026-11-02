/**
 * @file VictoryModal.tsx
 * @description Celebratory modal dialog presented upon successfully resolving a bug challenge — ICE MATRIX edition.
 * Displays crystalline particle confetti, itemized OOP scoring breakdowns, daily streak updates,
 * automatically persists progress to IndexedDB (Dexie), and opens printable arcade ticket redemption.
 */

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { formatScore } from '@/lib/utils';
import { recordSolvedChallenge, getPlayerProfile } from '@/lib/db';
import { submitLeaderboardScore } from '@/services/leaderboardService';
import { ArcadeTicketModal } from '@/components/arcade/ArcadeTicketModal';
import { type BountyTicketData } from '@/lib/ticketGenerator';
import {
  Zap,
  Clock,
  Lightbulb,
  ShieldCheck,
  Award,
  ChevronRight,
  Ticket,
  Play,
  CheckCircle2,
} from 'lucide-react';

/**
 * Properties accepted by the VictoryModal component.
 */
export interface VictoryModalProps {
  /** Optional callback to advance directly to generating the next challenge. */
  onNextChallenge?: () => void;
}

/**
 * VictoryModal component displaying score breakdown and persistence confirmations.
 *
 * @param props Component properties.
 * @returns Rendered victory overlay or null if not in victory phase.
 */
export function VictoryModal({ onNextChallenge }: VictoryModalProps) {
  const phase = useGameStore((s) => s.phase);
  const review = useGameStore((s) => s.review);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const challenge = useGameStore((s) => s.challenge);
  const playerCode = useGameStore((s) => s.playerCode);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const resetGame = useGameStore((s) => s.resetGame);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const lastScoreBreakdown = useGameStore((s) => s.lastScoreBreakdown);

  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState<BountyTicketData | null>(null);
  const recordedRef = useRef<string | null>(null);
  const confettiFiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (phase === 'victory' && review && challenge) {
      // Trigger crystalline ice confetti celebration once per victory
      if (!confettiFiredRef.current) {
        confettiFiredRef.current = true;
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#00D9FF', '#65CFFF', '#287BFF', '#EAF8FF', '#B8D8EA'],
        });
      }

      // Persist to Dexie IndexedDB once per solved challenge
      if (recordedRef.current !== challenge.id) {
        recordedRef.current = challenge.id;
        const timeSpent = Math.max(1, (challenge.timeLimit || 120) - timeRemaining);
        const difficulty = (challenge.difficulty || 'medium').toUpperCase() as
          | 'EASY'
          | 'MEDIUM'
          | 'HARD';

        recordSolvedChallenge({
          id: challenge.id,
          title: challenge.title,
          difficulty,
          bountyPointsEarned: review.score,
          timeSpentSeconds: timeSpent,
          userCode: playerCode,
          solvedAt: new Date(),
        }).catch((err) => console.error('Failed to record solve to Dexie:', err));

        // Prepare printable ticket data & record to leaderboard
        submitLeaderboardScore({
          callsign: 'CYBER_HUNTER',
          score: score + (review.scoreBreakdown?.finalScore || review.score || 250),
          totalSolved: 1,
          maxCombo: Math.max(1, combo),
          difficulty: challenge.difficulty,
          language: (challenge.language as string) || 'javascript',
          topic: challenge.topic,
          timestamp: Date.now(),
        }).catch(() => {});
        getPlayerProfile().then((profile) => {
          setTicketData({
            ticketId: Math.random().toString(36).substring(2, 8).toUpperCase(),
            callsign: profile.callsign,
            challengeTitle: challenge.title,
            difficulty: challenge.difficulty,
            bountyPoints: review.score,
            comboMultiplier: 1 + Math.max(0, combo - 1) * 0.25,
            timeSpentSeconds: timeSpent,
            solvedAt: new Date().toLocaleString(),
          });
        });
      }
    }
  }, [phase, review, challenge, playerCode, timeRemaining, combo, score]);

  if (phase !== 'victory' || !review) return null;

  const breakdown = review.scoreBreakdown ?? lastScoreBreakdown;

  const handleNext = () => {
    confettiFiredRef.current = false;
    recordedRef.current = null;
    if (onNextChallenge) {
      onNextChallenge();
    } else {
      resetGame();
    }
  };

  return (
    <>
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
      >
        <div
          className="pixel-box hud-corner-brackets animate-score-pop"
          style={{
            padding: '36px',
            maxWidth: '540px',
            width: '92%',
            textAlign: 'center',
            background: 'rgba(8, 20, 38, 0.95)',
            border: '1px solid rgba(0, 217, 255, 0.45)',
            boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(0, 217, 255, 0.2)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Status Label */}
          <div className="pixel-status-badge" style={{ marginBottom: '12px' }}>
            REMEDIATION PROTOCOL: SUCCESS
          </div>

          {/* Title banner */}
          <div
            className="arcade-text neon-text"
            style={{ fontSize: '1.25rem', marginBottom: '6px' }}
          >
            VULNERABILITY NEUTRALIZED
          </div>
          <div
            style={{
              color: '#8199B5',
              marginBottom: '20px',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            TARGET: {challenge?.title}
          </div>

          {/* Performance badges summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              className="pixel-box"
              style={{
                padding: '12px',
                background: 'rgba(5, 11, 24, 0.75)',
                border: '1px solid rgba(0, 217, 255, 0.25)',
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
                BOUNTY WON
              </div>
              <div
                className="arcade-text"
                style={{ fontSize: '1.25rem', color: '#00D9FF' }}
              >
                +{review.score}
              </div>
            </div>

            <div
              className="pixel-box"
              style={{
                padding: '12px',
                background: 'rgba(5, 11, 24, 0.75)',
                border: '1px solid rgba(0, 217, 255, 0.25)',
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
                COMBO
              </div>
              <div className="combo-display" style={{ fontSize: '1.25rem' }}>
                x{combo}
              </div>
            </div>

            <div
              className="pixel-box"
              style={{
                padding: '12px',
                background: 'rgba(5, 11, 24, 0.75)',
                border: '1px solid rgba(0, 217, 255, 0.25)',
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
                DAILY STREAK
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#65CFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <ShieldCheck size={16} color="#65CFFF" /> {currentStreak}D
              </div>
            </div>
          </div>

          {/* Itemized scoring engine breakdown */}
          {breakdown && (
            <div
              style={{
                background: 'rgba(5, 11, 24, 0.8)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
              }}
            >
              <div
                className="arcade-text"
                style={{
                  fontSize: '0.6rem',
                  color: '#00D9FF',
                  marginBottom: '10px',
                  letterSpacing: '1px',
                }}
              >
                SCORING ENGINE BREAKDOWN
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      color: '#8199B5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Award size={13} color="#00D9FF" /> Base Points:
                  </span>
                  <span style={{ color: '#EAF8FF', fontWeight: 600 }}>
                    +{breakdown.basePoints}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      color: '#8199B5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Clock size={13} color="#65CFFF" /> Cryo-Time Bonus (
                    {Math.round(breakdown.timeRatio * 50)}%):
                  </span>
                  <span style={{ color: '#65CFFF', fontWeight: 600 }}>
                    +{breakdown.timeBonus}
                  </span>
                </div>

                {breakdown.hintPenaltyRatio > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        color: '#8199B5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Lightbulb size={13} color="#FF3B69" /> Hint Penalty (-
                      {Math.round(breakdown.hintPenaltyRatio * 100)}%):
                    </span>
                    <span style={{ color: '#FF3B69', fontWeight: 600 }}>
                      -{breakdown.hintPenaltyAmount}
                    </span>
                  </div>
                )}

                {breakdown.streakMultiplier > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        color: '#8199B5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldCheck size={13} color="#B8D8EA" /> Streak Multiplier:
                    </span>
                    <span style={{ color: '#B8D8EA', fontWeight: 600 }}>
                      ×{breakdown.streakMultiplier.toFixed(1)}
                    </span>
                  </div>
                )}

                {breakdown.firstAttemptBonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        color: '#8199B5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Zap size={13} color="#00D9FF" /> First Attempt Bonus:
                    </span>
                    <span style={{ color: '#00D9FF', fontWeight: 600 }}>
                      +{breakdown.firstAttemptBonus}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid rgba(0, 217, 255, 0.2)',
                    paddingTop: '6px',
                    marginTop: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: '#00D9FF' }}>
                    Final Round Score:
                  </span>
                  <span style={{ color: '#00D9FF' }}>
                    +{breakdown.finalScore} PTS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback summary */}
          <div
            style={{
              background: '#050B18',
              border: '1px solid rgba(129, 153, 181, 0.2)',
              padding: '14px',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '0.82rem',
              color: '#8199B5',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
            }}
          >
            {review.feedback}
          </div>

          {/* Persistence status notice */}
          <div
            style={{
              fontSize: '0.65rem',
              color: '#00D9FF',
              marginBottom: '16px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={12} color="#00D9FF" /> Persisted to Dexie.js IndexedDB • Streak incremented
          </div>

          {/* Overall career score */}
          <div
            style={{
              marginBottom: '20px',
              color: '#8199B5',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            CAREER SCORE:{' '}
            <span style={{ fontWeight: 700, color: '#00D9FF' }}>
              {formatScore(score)}
            </span>
          </div>

          {/* Action triggers */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {ticketData && (
              <button
                className="btn-pixel-cyber"
                onClick={() => setTicketModalOpen(true)}
              >
                <Ticket size={15} color="#00D9FF" /> Print Bounty Ticket
              </button>
            )}

            <button
              className="btn-pixel-primary"
              onClick={handleNext}
              style={{ padding: '12px 24px' }}
            >
              <Play size={15} /> Next Challenge <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {ticketModalOpen && ticketData && (
        <ArcadeTicketModal
          open={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          data={ticketData}
        />
      )}
    </>
  );
}
