/**
 * @file PlayerProfileModal.tsx
 * @description Modal dialog managing player callsign identity and career progression — ICE MATRIX edition.
 * Reads and persists hacker profiles, unlocked achievement badges, and solved bounty vouchers
 * directly in client-side IndexedDB (Dexie).
 */

import { useState, useEffect } from 'react';
import {
  getPlayerProfile,
  updatePlayerProfile,
  getSolvedChallenges,
  type PlayerProfile,
  type SolvedChallenge,
} from '@/lib/db';
import { ArcadeTicketModal } from '@/components/arcade/ArcadeTicketModal';
import { type BountyTicketData } from '@/lib/ticketGenerator';
import { User, Award, Trophy, Ticket, X, Clock, ShieldCheck } from 'lucide-react';

/**
 * Properties accepted by the PlayerProfileModal component.
 */
export interface PlayerProfileModalProps {
  /** Whether the profile modal dialog is currently visible. */
  open: boolean;
  /** Callback fired when closing the profile dialog. */
  onClose: () => void;
}

/**
 * PlayerProfileModal component for inspecting career badges, callsigns, and local solve history.
 *
 * @param props Component properties.
 * @returns Rendered modal overlay or null if closed.
 */
export function PlayerProfileModal({ open, onClose }: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [solvedList, setSolvedList] = useState<SolvedChallenge[]>([]);
  const [editCallsign, setEditCallsign] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<BountyTicketData | null>(null);

  useEffect(() => {
    if (!open) return;
    let isCancelled = false;

    Promise.all([getPlayerProfile(), getSolvedChallenges(20)]).then(([p, s]) => {
      if (!isCancelled) {
        setProfile(p);
        setEditCallsign(p.callsign);
        setSolvedList(s);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [open]);

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

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 105,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5, 11, 24, 0.88)',
          backdropFilter: 'blur(12px)',
          padding: '20px',
        }}
      >
        <div
          className="pixel-box hud-corner-brackets"
          style={{
            maxWidth: '660px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '28px',
            background: 'rgba(8, 20, 38, 0.95)',
            border: '1px solid rgba(0, 217, 255, 0.4)',
            boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(0, 217, 255, 0.2)',
            overflowY: 'auto',
          }}
        >
          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={22} color="#00D9FF" />
              <h2 className="arcade-text neon-text" style={{ fontSize: '0.85rem', margin: 0 }}>
                HACKER IDENTITY & PERSISTENCE
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8199B5',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Callsign Editor & Overview */}
          <div
            className="pixel-box"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(5, 11, 24, 0.8)',
              border: '1px solid rgba(0, 217, 255, 0.25)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8199B5', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
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
                      background: '#081426',
                      border: '1px solid #00D9FF',
                      color: '#00D9FF',
                      padding: '4px 8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    className="btn-pixel-primary"
                    onClick={handleSaveCallsign}
                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00D9FF', fontFamily: 'var(--font-mono)' }}>
                    {profile?.callsign || 'CYBER_HUNTER'}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8199B5',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      textDecoration: 'underline',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00D9FF' }}>
                  <Trophy size={14} />
                  <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>{profile?.totalScore || 0}</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>TOTAL BOUNTY</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#65CFFF' }}>
                  <ShieldCheck size={14} />
                  <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>{profile?.currentStreak || 0}D</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>DAILY STREAK</div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Award size={15} color="#00D9FF" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>
                Unlocked Security Badges
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile?.unlockedBadges.map((badge) => (
                <span
                  key={badge}
                  className="pixel-status-badge"
                  style={{
                    fontSize: '0.7rem',
                    padding: '4px 10px',
                    borderColor: 'rgba(0, 217, 255, 0.35)',
                    color: '#EAF8FF',
                  }}
                >
                  <ShieldCheck size={12} color="#00D9FF" /> {badge.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Solved Challenges History (IndexedDB) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ticket size={15} color="#65CFFF" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>
                  Dexie.js Solved Bounties ({solvedList.length})
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#00D9FF', fontFamily: 'var(--font-mono)' }}>
                ● Local IndexedDB Zero-DB
              </span>
            </div>

            {solvedList.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#8199B5',
                  fontSize: '0.8rem',
                  border: '1px dashed rgba(129, 153, 181, 0.25)',
                  background: 'rgba(5, 11, 24, 0.6)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                No solved challenges recorded yet. Remediate your first vulnerability in the arena!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {solvedList.map((item) => (
                  <div
                    key={item.id}
                    className="pixel-box"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: 'rgba(5, 11, 24, 0.8)',
                      border: '1px solid rgba(0, 217, 255, 0.2)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge badge-${item.difficulty.toLowerCase()}`}>
                          {item.difficulty}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#EAF8FF' }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#8199B5', marginTop: '4px', display: 'flex', gap: '10px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: '#00D9FF' }}>+{item.bountyPointsEarned} pts</span>
                        <span><Clock size={10} style={{ display: 'inline', marginRight: '2px' }} />{item.timeSpentSeconds}s</span>
                        <span>{new Date(item.solvedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      className="btn-pixel-cyber"
                      onClick={() => handleOpenTicket(item)}
                      style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                    >
                      <Ticket size={12} color="#00D9FF" /> Voucher
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Retro Arcade Ticket Modal */}
      {selectedTicket && (
        <ArcadeTicketModal
          open={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          data={selectedTicket}
        />
      )}
    </>
  );
}
