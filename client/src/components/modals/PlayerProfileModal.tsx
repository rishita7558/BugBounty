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
import { User, Award, Flame, Trophy, Ticket, X, Clock, ShieldCheck } from 'lucide-react';

interface PlayerProfileModalProps {
  open: boolean;
  onClose: () => void;
}

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
          background: 'rgba(5, 5, 12, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
        }}
      >
        <div
          className="glass-card"
          style={{
            maxWidth: '650px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '24px',
            border: '1px solid var(--border-neon)',
            boxShadow: '0 0 35px rgba(0, 240, 255, 0.25)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={24} color="var(--neon-cyan)" />
              <h2 className="arcade-text neon-text" style={{ fontSize: '0.9rem', margin: 0 }}>
                HACKER PROFILE & PERSISTENCE
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Callsign Editor & Overview */}
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(0, 240, 255, 0.04)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Hacker Callsign
              </div>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={editCallsign}
                    onChange={(e) => setEditCallsign(e.target.value)}
                    maxLength={18}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--neon-cyan)',
                      color: 'var(--neon-cyan)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    className="btn-neon btn-neon-green"
                    onClick={handleSaveCallsign}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    <span>Save</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                    {profile?.callsign || 'CYBER_HUNTER'}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
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

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--neon-yellow)' }}>
                  <Trophy size={14} />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{profile?.totalScore || 0}</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TOTAL BOUNTY</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--neon-magenta)' }}>
                  <Flame size={14} />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{profile?.currentStreak || 0}</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CURRENT STREAK</div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Award size={16} color="var(--neon-yellow)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Unlocked Hacker Badges
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile?.unlockedBadges.map((badge) => (
                <span
                  key={badge}
                  className="badge"
                  style={{
                    background: 'rgba(255, 230, 0, 0.1)',
                    border: '1px solid rgba(255, 230, 0, 0.4)',
                    color: 'var(--neon-yellow)',
                    fontSize: '0.7rem',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={12} /> {badge.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Solved Challenges History (IndexedDB) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ticket size={16} color="var(--neon-green)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Dexie.js Solved Bounties ({solvedList.length})
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
                ● Local IndexedDB Zero-DB
              </span>
            </div>

            {solvedList.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '8px',
                }}
              >
                No solved challenges yet. Squash your first bug in the arena!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {solvedList.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge badge-${item.difficulty.toLowerCase()}`}>
                          {item.difficulty}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px' }}>
                        <span>+{item.bountyPointsEarned} pts</span>
                        <span><Clock size={10} style={{ display: 'inline', marginRight: '2px' }} />{item.timeSpentSeconds}s</span>
                        <span>{new Date(item.solvedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      className="btn-neon"
                      onClick={() => handleOpenTicket(item)}
                      style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Ticket size={12} /> Voucher
                      </span>
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
