/**
 * @file LeaderboardModal.tsx
 * @description Serverless arcade leaderboard modal dialog for CodeDuel: BugBounty Arena — ICE MATRIX edition.
 * Displays global and local rankings using GitHub Gist synchronization with seamless
 * fallback to client-side IndexedDB persistence, rendered in authentic Ice Matrix cyberpunk styling.
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
import { PixelCloseButton } from '@/components/common/PixelCloseButton';
import {
  Trophy,
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
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-box hud-corner-brackets"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8, 20, 38, 0.96)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(0, 217, 255, 0.2)',
          overflow: 'hidden',
          padding: '24px',
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
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#00D9FF" />
              <h2 className="arcade-text neon-text" style={{ fontSize: '0.85rem', margin: 0 }}>
                GLOBAL CYBERNETIC LEDGER
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {source === 'gist' ? (
                <span className="pixel-status-badge">
                  <Globe size={11} color="#00D9FF" /> LIVE GIST LEDGER
                </span>
              ) : (
                <span className="pixel-status-badge">
                  <Database size={11} color="#65CFFF" /> LOCAL INDEXEDDB LEDGER
                </span>
              )}
              <span style={{ fontSize: '0.65rem', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>
                ZERO-SERVER CRYPTOGRAPHIC RANKING
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
              className="btn-pixel-cyber"
              style={{
                padding: '6px 12px',
                fontSize: '0.7rem',
              }}
              title="Refresh Leaderboard"
            >
              <RefreshCw size={13} color="#00D9FF" className={loading ? 'animate-spin' : ''} />
              SYNC
            </button>

            <PixelCloseButton
              onClick={() => {
                play('click');
                onClose();
              }}
              title="Close (Esc)"
            />
          </div>
        </div>

        {/* ── Filters & View Controls ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '14px',
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
                  className="btn-pixel-cyber"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.65rem',
                    borderColor: active ? '#00D9FF' : 'rgba(129, 153, 181, 0.2)',
                    background: active ? 'rgba(0, 217, 255, 0.15)' : 'rgba(5, 11, 24, 0.7)',
                    color: active ? '#00D9FF' : '#8199B5',
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
                  className="btn-pixel-cyber"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    borderColor: active ? '#65CFFF' : 'rgba(129, 153, 181, 0.2)',
                    background: active ? 'rgba(101, 207, 255, 0.15)' : 'rgba(5, 11, 24, 0.7)',
                    color: active ? '#65CFFF' : '#8199B5',
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
            border: '1px solid rgba(0, 217, 255, 0.2)',
            background: '#050B18',
          }}
        >
          {filteredEntries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8199B5',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Trophy size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} color="#00D9FF" />
              <p style={{ fontSize: '0.8rem' }}>
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
                    background: '#081426',
                    borderBottom: '1px solid rgba(0, 217, 255, 0.25)',
                    color: '#8199B5',
                    fontSize: '0.65rem',
                    letterSpacing: '1px',
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
                  const rankColor =
                    rank === 1 ? '#EAF8FF' : rank === 2 ? '#B8D8EA' : rank === 3 ? '#65CFFF' : '#8199B5';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(129, 153, 181, 0.1)',
                        background: index % 2 === 0 ? 'rgba(8, 20, 38, 0.4)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: rankColor }}>
                        {rank === 1 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#00D9FF' }}>
                            <Crown size={12} /> #1
                          </span>
                        ) : rank <= 3 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: rankColor }}>
                            <Medal size={12} /> #{rank}
                          </span>
                        ) : (
                          `#${rank}`
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#EAF8FF' }}>
                        {item.callsign}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#00D9FF',
                        }}
                      >
                        {formatScore(item.score)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#65CFFF' }}>
                        {item.totalSolved}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#B8D8EA' }}>
                        x{item.maxCombo}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge badge-${item.difficulty.toLowerCase()}`}>
                          {item.difficulty}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#8199B5', fontSize: '0.7rem' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Settings Accordion ──────────────────────────────────────── */}
        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(129, 153, 181, 0.15)', paddingTop: '10px' }}>
          <button
            onClick={() => setShowSettings((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8199B5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 0',
            }}
          >
            <Settings size={13} color="#00D9FF" />
            <span>GitHub Gist Live Ledger Sync Settings</span>
            {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showSettings && (
            <div
              style={{
                marginTop: '10px',
                background: '#050B18',
                border: '1px solid rgba(0, 217, 255, 0.25)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#8199B5' }}>
                Optionally synchronize leaderboard scores across all devices by providing a GitHub Gist ID and personal access token (with `gist` permission).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', color: '#8199B5', display: 'block', marginBottom: '4px' }}>
                    GIST ID:
                  </label>
                  <input
                    type="text"
                    value={gistIdInput}
                    onChange={(e) => setGistIdInput(e.target.value)}
                    placeholder="e.g. 8f6b219a4..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: '#081426',
                      border: '1px solid rgba(0, 217, 255, 0.25)',
                      color: '#EAF8FF',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.65rem', color: '#8199B5', display: 'block', marginBottom: '4px' }}>
                    GITHUB TOKEN (PAT):
                  </label>
                  <input
                    type="password"
                    value={gistTokenInput}
                    onChange={(e) => setGistTokenInput(e.target.value)}
                    placeholder="ghp_..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: '#081426',
                      border: '1px solid rgba(0, 217, 255, 0.25)',
                      color: '#EAF8FF',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                {settingsSavedToast ? (
                  <span style={{ fontSize: '0.7rem', color: '#00D9FF' }}>
                    ✓ Settings updated! Reloading...
                  </span>
                ) : <span />}
                <button
                  className="btn-pixel-primary"
                  onClick={handleSaveSettings}
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  Save Sync Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
