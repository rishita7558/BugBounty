/**
 * @file ProfilePage.tsx
 * @description Dedicated Profile Page adhering to Single Responsibility and Icy Matrix design.
 * Features decoupled career metrics, StreakEngine calendar math, and retro streak retention alerts.
 */

import { useState, useEffect } from 'react';
import {
  getPlayerProfile,
  updatePlayerProfile,
  getSolvedChallenges,
  type PlayerProfile,
  type SolvedChallenge,
} from '@/lib/db';
import { StreakEngine } from '@/services/StreakEngine';
import { ArcadeTicketModal } from '@/components/arcade/ArcadeTicketModal';
import { type BountyTicketData } from '@/lib/ticketGenerator';
import { User, Award, Trophy, Ticket, Clock, ShieldCheck, Flame } from 'lucide-react';

export function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [solvedList, setSolvedList] = useState<SolvedChallenge[]>([]);
  const [editCallsign, setEditCallsign] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<BountyTicketData | null>(null);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([getPlayerProfile(), getSolvedChallenges(50)]).then(([p, s]) => {
      if (!isCancelled) {
        setProfile(p);
        setEditCallsign(p.callsign);
        setSolvedList(s);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const streakStats = StreakEngine.calculateStreak(
    solvedList.map((s) => s.solvedAt)
  );

  const handleSaveCallsign = async () => {
    if (!editCallsign.trim()) return;
    const updated = await updatePlayerProfile({ callsign: editCallsign.trim().toUpperCase() });
    setProfile(updated);
    setIsEditing(false);
  };

  const handleOpenTicket = (item: SolvedChallenge) => {
    const ticketData: BountyTicketData = {
      ticketId: item.id.slice(0, 8).toUpperCase(),
      callsign: profile?.callsign || 'CYBER_HUNTER',
      challengeTitle: item.title,
      difficulty: item.difficulty,
      bountyPoints: item.bountyPointsEarned,
      comboMultiplier: 1.0,
      timeSpentSeconds: item.timeSpentSeconds || 45,
      solvedAt: new Date(item.solvedAt).toLocaleString(),
    };
    setSelectedTicket(ticketData);
  };

  return (
    <div
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'var(--font-mono, monospace)',
        color: '#eaf8ff',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '2px solid rgba(0, 240, 255, 0.4)',
          paddingBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <User size={28} color="#00f0ff" />
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-arcade, monospace)',
                fontSize: '1.2rem',
                margin: 0,
                color: '#00f0ff',
                letterSpacing: '1px',
              }}
            >
              HACKER PROFILE & CAREER TELEMETRY
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#8199b5' }}>
              Persistent career records stored in Zero-DB IndexedDB.
            </p>
          </div>
        </div>
      </div>

      {/* Streak Alert Banner */}
      {!streakStats.isActiveToday && (
        <div
          style={{
            border: '2px solid #ffcc00',
            boxShadow: '2px 2px 0px #664400',
            background: 'rgba(255, 204, 0, 0.12)',
            color: '#ffcc00',
            padding: '12px 18px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-arcade, monospace)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>[!]</span>
          <span>Complete 1 bounty today to maintain your streak!</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            border: '2px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '2px 2px 0px #003366',
            background: 'rgba(8, 20, 38, 0.9)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#8199b5', textTransform: 'uppercase' }}>
            OPERATOR CALLSIGN
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                value={editCallsign}
                onChange={(e) => setEditCallsign(e.target.value)}
                maxLength={18}
                style={{
                  background: '#0a1128',
                  border: '1px solid #00f0ff',
                  color: '#00f0ff',
                  padding: '4px 8px',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={handleSaveCallsign}
                style={{
                  background: '#00f0ff',
                  color: '#0a1128',
                  border: 'none',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f0ff' }}>
                {profile?.callsign || 'CYBER_HUNTER'}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8199b5',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  textDecoration: 'underline',
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            border: '2px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '2px 2px 0px #003366',
            background: 'rgba(8, 20, 38, 0.9)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#8199b5', textTransform: 'uppercase' }}>
            TOTAL SOLVED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <Ticket size={18} color="#00f0ff" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#eaf8ff' }}>
              {solvedList.length} BOUNTIES
            </span>
          </div>
        </div>

        <div
          style={{
            border: '2px solid rgba(255, 102, 0, 0.4)',
            boxShadow: '2px 2px 0px #441a00',
            background: 'rgba(8, 20, 38, 0.9)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#8199b5', textTransform: 'uppercase' }}>
            CURRENT STREAK
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <Flame size={20} color="#ff6600" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ff6600' }}>
              {streakStats.currentStreak} DAYS
            </span>
          </div>
        </div>

        <div
          style={{
            border: '2px solid rgba(101, 207, 255, 0.3)',
            boxShadow: '2px 2px 0px #003366',
            background: 'rgba(8, 20, 38, 0.9)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#8199b5', textTransform: 'uppercase' }}>
            LONGEST STREAK
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <ShieldCheck size={20} color="#65cfff" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#65cfff' }}>
              {streakStats.longestStreak} DAYS
            </span>
          </div>
        </div>

        <div
          style={{
            border: '2px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '2px 2px 0px #003366',
            background: 'rgba(8, 20, 38, 0.9)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#8199b5', textTransform: 'uppercase' }}>
            LIFETIME SCORE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <Trophy size={18} color="#00f0ff" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00f0ff' }}>
              {profile?.totalScore || 0} PTS
            </span>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div
        style={{
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '2px 2px 0px #003366',
          background: 'rgba(8, 20, 38, 0.9)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Award size={18} color="#00f0ff" />
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#00f0ff', letterSpacing: '1px' }}>
            SECURITY CLEARANCE BADGES
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(profile?.unlockedBadges || []).map((badge) => (
            <span
              key={badge}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(0, 240, 255, 0.5)',
                background: 'rgba(0, 240, 255, 0.08)',
                color: '#eaf8ff',
                padding: '6px 12px',
                fontSize: '0.75rem',
              }}
            >
              <ShieldCheck size={14} color="#00f0ff" /> {badge.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Solved Challenges History */}
      <div
        style={{
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '2px 2px 0px #003366',
          background: 'rgba(8, 20, 38, 0.9)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={18} color="#65cfff" />
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#65cfff', letterSpacing: '1px' }}>
              SOLVED BOUNTY LEDGER ({solvedList.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#00f0ff' }}>● IndexedDB Active</span>
        </div>

        {solvedList.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#8199b5',
              fontSize: '0.8rem',
              border: '1px dashed rgba(129, 153, 181, 0.25)',
            }}
          >
            No bounties recorded yet. Enter the arena and claim your first bounty!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {solvedList.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'rgba(5, 11, 24, 0.8)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        border: '1px solid #00f0ff',
                        color: '#00f0ff',
                      }}
                    >
                      {item.difficulty}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#eaf8ff' }}>{item.title}</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#8199b5',
                      marginTop: '4px',
                      display: 'flex',
                      gap: '12px',
                    }}
                  >
                    <span style={{ color: '#00f0ff' }}>+{item.bountyPointsEarned} pts</span>
                    <span>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {item.timeSpentSeconds}s
                    </span>
                    <span>{new Date(item.solvedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenTicket(item)}
                  style={{
                    border: '1px solid #00f0ff',
                    boxShadow: '1px 1px 0px #003366',
                    background: '#0a1128',
                    color: '#00f0ff',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-arcade, monospace)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Ticket size={12} /> Voucher
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && (
        <ArcadeTicketModal
          open={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          data={selectedTicket}
        />
      )}
    </div>
  );
}

