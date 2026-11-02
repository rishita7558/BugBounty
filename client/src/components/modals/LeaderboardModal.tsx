/**
 * @file LeaderboardModal.tsx
 * @description Serverless arcade leaderboard modal dialog for CodeDuel: BugBounty Arena.
 * Displays global and local rankings using GitHub Gist synchronization with seamless
 * fallback to client-side IndexedDB persistence, rendered in authentic retro pixel-art styling.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchLeaderboard,
  getConfiguredGistId,
  setConfiguredGistId,
  getConfiguredGistToken,
  setConfiguredGistToken,
  type LeaderboardEntry,
} from '@/services/leaderboardService';
import { useAudioSFX } from '@/hooks/useAudioSFX';
import { formatScore } from '@/lib/utils';
import {
  Trophy,
  X,
  RefreshCw,
  Globe,
  Database,
  Settings,
  ChevronDown,
  ChevronUp,
  Crown,
  Medal,
} from 'lucide-react';

export interface LeaderboardModalProps {
  /** Whether the leaderboard modal is open. */
  open: boolean;
  /** Callback fired when closing the modal. */
  onClose: () => void;
}

export function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
  const { play } = useAudioSFX();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [source, setSource] = useState<'gist' | 'indexeddb'>('indexeddb');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedDiff, setSelectedDiff] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Settings form state
  const [gistIdInput, setGistIdInput] = useState(() => getConfiguredGistId());
  const [gistTokenInput, setGistTokenInput] = useState(() => getConfiguredGistToken());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const loadScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLeaderboard();
      setEntries(res.entries);
      setSource(res.source);
    } catch (err) {
      console.warn('[Leaderboard Modal] Failed to load scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadScores();
  }, [open, loadScores]);

  const handleSaveSettings = () => {
    play('click');
    setConfiguredGistId(gistIdInput);
    setConfiguredGistToken(gistTokenInput);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
    loadScores();
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (selectedLang !== 'all' && (item.language || 'javascript').toLowerCase() !== selectedLang) {
        return false;
      }
      if (selectedDiff !== 'all' && item.difficulty.toLowerCase() !== selectedDiff) {
        return false;
      }
      return true;
    });
  }, [entries, selectedLang, selectedDiff]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-box pixel-box-cyan animate-in fade-in zoom-in-95"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#090A0F',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '2px solid rgba(0, 229, 255, 0.25)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="var(--neon-yellow)" />
              <h2 className="pixel-title" style={{ fontSize: '1rem', margin: 0, color: 'var(--neon-yellow)' }}>
                SERVERLESS LEADERBOARD
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {source === 'gist' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--neon-green)',
                    background: 'rgba(0, 255, 163, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    border: '1px solid rgba(0, 255, 163, 0.3)',
                  }}
                >
                  <Globe size={11} /> LIVE GIST SYNC
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--neon-yellow)',
                    background: 'rgba(255, 230, 0, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    border: '1px solid rgba(255, 230, 0, 0.3)',
                  }}
                >
                  <Database size={11} /> LOCAL INDEXEDDB ARCHIVE
                </span>
              )}
              <span className="pixel-subtext" style={{ fontSize: '0.55rem' }}>
                Zero Server Database Architecture
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                play('click');
                loadScores();
              }}
              disabled={loading}
              className="pixel-btn"
              style={{
                padding: '6px 10px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--neon-cyan)',
              }}
              title="Refresh Leaderboard"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              SYNC
            </button>

            <button
              onClick={() => {
                play('click');
                onClose();
              }}
              className="pixel-btn"
              style={{
                padding: '6px 10px',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Filters & View Controls ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Language filter buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'all', label: 'ALL LANGS' },
              { id: 'javascript', label: 'JS' },
              { id: 'typescript', label: 'TS' },
              { id: 'python', label: 'PYTHON' },
            ].map((lang) => {
              const active = selectedLang === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => {
                    play('click');
                    setSelectedLang(lang.id);
                  }}
                  className="pixel-btn"
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-pixel)',
                    cursor: 'pointer',
                    background: active ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    border: active ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
                    color: active ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>

          {/* Difficulty filter buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
              const active = selectedDiff === diff;
              return (
                <button
                  key={diff}
                  onClick={() => {
                    play('click');
                    setSelectedDiff(diff);
                  }}
                  className="pixel-btn"
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-pixel)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: active ? 'rgba(255, 0, 229, 0.2)' : 'transparent',
                    border: active ? '1px solid var(--neon-magenta)' : '1px solid rgba(255,255,255,0.1)',
                    color: active ? 'var(--neon-magenta)' : 'var(--text-secondary)',
                  }}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── High Score List Table ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginTop: '12px',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            background: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          {filteredEntries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)',
              }}
            >
              <Trophy size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p className="pixel-text" style={{ fontSize: '0.7rem' }}>
                No leaderboard records matching selected filters.
              </p>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#121526',
                    borderBottom: '2px solid rgba(0, 229, 255, 0.25)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.55rem',
                    letterSpacing: '1px',
                    fontFamily: 'var(--font-pixel)',
                  }}
                >
                  <th style={{ padding: '8px 12px', width: '50px' }}>RANK</th>
                  <th style={{ padding: '8px 12px' }}>CALLSIGN</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>SCORE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>SOLVED</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>COMBO</th>
                  <th style={{ padding: '8px 12px' }}>DOMAIN</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((item, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const rankColor =
                    rank === 1 ? '#FFE600' : rank === 2 ? '#E0E0E0' : rank === 3 ? '#CD7F32' : 'var(--text-secondary)';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background:
                          rank === 1
                            ? 'rgba(255, 230, 0, 0.06)'
                            : rank % 2 === 0
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'transparent',
                      }}
                    >
                      {/* Rank badge */}
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: rankColor }}>
                          {rank === 1 && <Crown size={13} color="#FFE600" />}
                          {rank === 2 && <Medal size={13} color="#E0E0E0" />}
                          {rank === 3 && <Medal size={13} color="#CD7F32" />}
                          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem' }}>
                            #{rank}
                          </span>
                        </div>
                      </td>

                      {/* Callsign */}
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        <span
                          className="arcade-text"
                          style={{
                            fontSize: '0.6rem',
                            color: isTop3 ? 'var(--neon-cyan)' : '#FFFFFF',
                            letterSpacing: '1px',
                          }}
                        >
                          {item.callsign}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-pixel)',
                            fontSize: '0.7rem',
                            color: isTop3 ? 'var(--neon-yellow)' : '#FFF',
                            textShadow: isTop3 ? '0 0 8px rgba(255, 230, 0, 0.4)' : 'none',
                          }}
                        >
                          {formatScore(item.score)}
                        </span>
                      </td>

                      {/* Solved Count */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>
                          {item.totalSolved}
                        </span>
                      </td>

                      {/* Combo */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ color: 'var(--neon-magenta)', fontWeight: 700 }}>
                          x{item.maxCombo}
                        </span>
                      </td>

                      {/* Language & Topic */}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.55rem',
                              padding: '1px 5px',
                              borderRadius: '2px',
                              textTransform: 'uppercase',
                              fontWeight: 700,
                              background: 'rgba(0, 229, 255, 0.1)',
                              color: 'var(--neon-cyan)',
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                            }}
                          >
                            {item.language}
                          </span>
                          <span
                            style={{
                              fontSize: '0.55rem',
                              padding: '1px 5px',
                              borderRadius: '2px',
                              textTransform: 'uppercase',
                              color: item.difficulty === 'hard' ? '#FF0055' : item.difficulty === 'easy' ? '#00FFA3' : '#FFE600',
                            }}
                          >
                            {item.difficulty}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Gist Settings Drawer ────────────────────────────────────── */}
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => {
              play('click');
              setShowSettings(!showSettings);
            }}
            className="pixel-btn"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              fontSize: '0.55rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              background: '#121526',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={12} color="var(--neon-cyan)" />
              <span>SERVERLESS GIST SYNCHRONIZATION SETTINGS</span>
            </div>
            {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showSettings && (
            <div
              className="pixel-box"
              style={{
                marginTop: '6px',
                background: '#121526',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                padding: '12px',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                CodeDuel operates with zero backend databases. Link a public or secret GitHub Gist containing{' '}
                <code>codeduel-leaderboard.json</code> to share scores globally across all devices.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: '#FFF', marginBottom: '4px' }}>
                    GITHUB GIST ID:
                  </label>
                  <input
                    type="text"
                    value={gistIdInput}
                    onChange={(e) => setGistIdInput(e.target.value)}
                    placeholder="e.g. 7f8a9b0c1d2e3f4a5b6c"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: '#090A0F',
                      border: '1px solid rgba(0, 229, 255, 0.25)',
                      color: '#FFF',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: '#FFF', marginBottom: '4px' }}>
                    PERSONAL ACCESS TOKEN (OPTIONAL):
                  </label>
                  <input
                    type="password"
                    value={gistTokenInput}
                    onChange={(e) => setGistTokenInput(e.target.value)}
                    placeholder="ghp_xxxx (for publishing scores to Gist)"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: '#090A0F',
                      border: '1px solid rgba(0, 229, 255, 0.25)',
                      color: '#FFF',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>
                  {settingsSavedToast && '✓ Gist configuration saved successfully!'}
                </span>

                <button
                  onClick={handleSaveSettings}
                  className="pixel-btn pixel-btn-cyan"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  SAVE GIST CONFIG
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '2px solid rgba(0, 229, 255, 0.25)',
          }}
        >
          <span className="pixel-subtext" style={{ fontSize: '0.6rem' }}>
            Showing {filteredEntries.length} player{filteredEntries.length === 1 ? '' : 's'} on record
          </span>

          <button
            onClick={() => {
              play('click');
              onClose();
            }}
            className="pixel-btn"
            style={{
              padding: '6px 16px',
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
