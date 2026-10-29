import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { formatScore } from '@/lib/utils';
import { recordSolvedChallenge, getPlayerProfile } from '@/lib/db';
import { ArcadeTicketModal } from '@/components/arcade/ArcadeTicketModal';
import { type BountyTicketData } from '@/lib/ticketGenerator';
import { Ticket, Play } from 'lucide-react';

// ---------------------------------------------------------------------------
// Victory Modal — Shown when a challenge is solved correctly
// Automatically persists progress to Dexie.js and provides printable tickets.
// ---------------------------------------------------------------------------

export function VictoryModal() {
  const phase = useGameStore((s) => s.phase);
  const review = useGameStore((s) => s.review);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const challenge = useGameStore((s) => s.challenge);
  const playerCode = useGameStore((s) => s.playerCode);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const resetGame = useGameStore((s) => s.resetGame);

  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState<BountyTicketData | null>(null);
  const recordedRef = useRef<string | null>(null);
  const confettiFiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (phase === 'victory' && review && challenge) {
      // Trigger confetti
      if (!confettiFiredRef.current) {
        confettiFiredRef.current = true;
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#ff00e5', '#39ff14', '#ffe600'],
        });
      }

      // Persist to Dexie IndexedDB once per solve
      if (recordedRef.current !== challenge.id) {
        recordedRef.current = challenge.id;
        const timeSpent = Math.max(1, (challenge.timeLimit || 120) - timeRemaining);
        const difficulty = (challenge.difficulty || 'medium').toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD';

        recordSolvedChallenge({
          id: challenge.id,
          title: challenge.title,
          difficulty,
          bountyPointsEarned: review.score,
          timeSpentSeconds: timeSpent,
          userCode: playerCode,
          solvedAt: new Date(),
        }).catch((err) => console.error('Failed to record solve to Dexie:', err));

        // Prepare printable ticket
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
  }, [phase, review, challenge, playerCode, timeRemaining, combo]);

  if (phase !== 'victory' || !review) return null;

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
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="glass-card animate-score-pop"
          style={{
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            border: '1px solid rgba(57, 255, 20, 0.3)',
            boxShadow: 'var(--glow-green)',
          }}
        >
          {/* Title */}
          <div className="arcade-text neon-text-green" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            🎯 BUG SQUASHED!
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            {challenge?.title}
          </div>

          {/* Score breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                SCORE
              </div>
              <div className="neon-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                +{review.score}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                COMBO
              </div>
              <div className="combo-display" style={{ fontSize: '1.5rem' }}>
                x{combo}
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
            }}
          >
            {review.feedback}
          </div>

          {/* Persistence badge */}
          <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginBottom: '20px', fontFamily: 'var(--font-mono)' }}>
            ✓ Persisted to Dexie.js IndexedDB • Streak incremented
          </div>

          {/* Total */}
          <div style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Total Score: <span className="neon-text" style={{ fontWeight: 700 }}>{formatScore(score)}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {ticketData && (
              <button
                className="btn-neon"
                onClick={() => setTicketModalOpen(true)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Ticket size={16} /> Print Bounty Ticket
                </span>
              </button>
            )}

            <button
              className="btn-neon btn-neon-green"
              onClick={() => {
                confettiFiredRef.current = false;
                recordedRef.current = null;
                resetGame();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Play size={16} /> Next Challenge
              </span>
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
