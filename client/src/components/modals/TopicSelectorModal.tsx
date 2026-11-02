/**
 * @file TopicSelectorModal.tsx
 * @description Retro pixel-art topic selection modal for CodeDuel: BugBounty Arena.
 * Allows players to choose their target programming language (JS, TS, Python) and vulnerability domain,
 * displaying pedagogical bug archetypes and difficulty tiers.
 */

import { useState, useMemo } from 'react';
import {
  getAllLanguages,
  getTopicsByLanguage,
  getLanguageMeta,
  getRandomTopic,
  type SupportedLanguage,
  type ChallengeTopic,
  type ChallengeDifficulty,
} from '@/core/taxonomy/challengeTaxonomy';
import { useAudioSFX } from '@/hooks/useAudioSFX';
import {
  X,
  Sparkles,
  Search,
  CheckCircle2,
  Terminal,
  FileCode,
  Shield,
  Layers,
  Bug,
} from 'lucide-react';

export interface TopicSelectorModalProps {
  /** Whether the modal is currently open. */
  open: boolean;
  /** Currently active topic slug, if any. */
  activeTopicId?: string | null;
  /** Currently selected language. */
  activeLanguage?: SupportedLanguage;
  /** Callback fired when user selects a topic. */
  onSelectTopic: (topic: ChallengeTopic) => void;
  /** Callback to close the modal. */
  onClose: () => void;
}

export function TopicSelectorModal({
  open,
  activeTopicId,
  activeLanguage = 'javascript',
  onSelectTopic,
  onClose,
}: TopicSelectorModalProps) {
  const { play } = useAudioSFX();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(activeLanguage);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | ChallengeDifficulty>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const languages = useMemo(() => getAllLanguages(), []);

  // Filter topics for the currently selected language
  const filteredTopics = useMemo(() => {
    let list = getTopicsByLanguage(selectedLang);

    if (difficultyFilter !== 'all') {
      list = list.filter((t) => t.difficulty === difficultyFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          t.commonBugs.some((b) => b.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedLang, difficultyFilter, searchQuery]);

  if (!open) return null;

  const currentMeta = getLanguageMeta(selectedLang);

  const handleLangTab = (lang: SupportedLanguage) => {
    play('click');
    setSelectedLang(lang);
  };

  const handleSelect = (topic: ChallengeTopic) => {
    play('click');
    onSelectTopic(topic);
    onClose();
  };

  const handleRandomSelect = () => {
    play('start');
    const random = getRandomTopic(selectedLang, difficultyFilter === 'all' ? undefined : difficultyFilter);
    if (random) {
      onSelectTopic(random);
      onClose();
    }
  };

  const getDiffBadgeStyle = (diff: ChallengeDifficulty) => {
    switch (diff) {
      case 'easy':
        return { color: '#00FFA3', border: '1px solid #00FFA3', background: 'rgba(0, 255, 163, 0.1)' };
      case 'hard':
        return { color: '#FF0055', border: '1px solid #FF0055', background: 'rgba(255, 0, 85, 0.1)' };
      case 'medium':
      default:
        return { color: '#FFE600', border: '1px solid #FFE600', background: 'rgba(255, 230, 0, 0.1)' };
    }
  };

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
              <Layers size={18} color="var(--neon-cyan)" />
              <h2 className="pixel-title" style={{ fontSize: '1rem', margin: 0 }}>
                SELECT CHALLENGE TOPIC
              </h2>
            </div>
            <p className="pixel-subtext" style={{ marginTop: '4px', margin: 0, fontSize: '0.6rem' }}>
              Pick a programming language & vulnerability domain for targeted AI generation.
            </p>
          </div>

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

        {/* ── Language Cartridge Tabs ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '14px',
            flexWrap: 'wrap',
          }}
        >
          {languages.map((lang) => {
            const meta = getLanguageMeta(lang);
            const isSelected = selectedLang === lang;
            return (
              <button
                key={lang}
                onClick={() => handleLangTab(lang)}
                className={`pixel-btn ${isSelected ? 'pixel-btn-cyan' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-pixel)',
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${meta.color}` : '2px solid rgba(255, 255, 255, 0.15)',
                  background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(18, 21, 38, 0.8)',
                  color: isSelected ? meta.color : 'var(--text-secondary)',
                  boxShadow: isSelected ? `0 0 12px ${meta.color}40` : 'none',
                }}
              >
                {lang === 'javascript' && <FileCode size={14} color={isSelected ? meta.color : undefined} />}
                {lang === 'typescript' && <Shield size={14} color={isSelected ? meta.color : undefined} />}
                {lang === 'python' && <Terminal size={14} color={isSelected ? meta.color : undefined} />}
                <span>{meta.label}</span>
                <span
                  style={{
                    fontSize: '0.5rem',
                    opacity: 0.7,
                    padding: '2px 4px',
                    borderRadius: '2px',
                    background: 'rgba(0,0,0,0.4)',
                  }}
                >
                  {meta.version}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search & Filter Controls ────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Keyword search input */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: '200px',
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics, keywords, tags..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: '#121526',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Difficulty filter buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
              const active = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  onClick={() => {
                    play('click');
                    setDifficultyFilter(diff);
                  }}
                  className="pixel-btn"
                  style={{
                    padding: '5px 8px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-pixel)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: active ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    border: active ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
                    color: active ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Topic Cards Grid ────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginTop: '14px',
            paddingRight: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '12px',
          }}
        >
          {filteredTopics.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)',
              }}
            >
              <Bug size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p className="pixel-text" style={{ fontSize: '0.7rem' }}>
                No topics matching "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDifficultyFilter('all');
                }}
                className="pixel-btn pixel-btn-cyan"
                style={{ marginTop: '12px', padding: '6px 12px', fontSize: '0.6rem' }}
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isActive = activeTopicId === topic.id;
              const diffStyle = getDiffBadgeStyle(topic.difficulty);

              return (
                <div
                  key={topic.id}
                  onClick={() => handleSelect(topic)}
                  className="pixel-box"
                  style={{
                    background: isActive ? 'rgba(0, 229, 255, 0.08)' : '#121526',
                    border: isActive ? '2px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? '0 0 14px rgba(0, 229, 255, 0.3)' : 'none',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (!isActive) e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (!isActive) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div>
                    {/* Header: Title + Badges */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <h3
                        className="pixel-text"
                        style={{
                          fontSize: '0.7rem',
                          color: isActive ? 'var(--neon-cyan)' : '#FFFFFF',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {topic.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '0.5rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            ...diffStyle,
                          }}
                        >
                          {topic.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        margin: '8px 0',
                        fontSize: '0.72rem',
                        lineHeight: 1.4,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {topic.description}
                    </p>

                    {/* Common Bug Traps list */}
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderLeft: '2px solid rgba(0, 229, 255, 0.4)',
                        padding: '6px 8px',
                        marginBottom: '8px',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        color: '#b0b0c8',
                      }}
                    >
                      <div style={{ color: 'var(--neon-yellow)', fontSize: '0.55rem', fontWeight: 700, marginBottom: '2px' }}>
                        TARGET BUGS:
                      </div>
                      <div style={{ fontStyle: 'italic' }}>
                        • {topic.commonBugs[0]}
                      </div>
                    </div>
                  </div>

                  {/* Footer tags & Select status */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {topic.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.55rem',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '1px 5px',
                            borderRadius: '2px',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(topic);
                      }}
                      className={`pixel-btn ${isActive ? 'pixel-btn-cyan' : ''}`}
                      style={{
                        fontSize: '0.55rem',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 size={12} color="var(--neon-cyan)" />
                          ACTIVE
                        </>
                      ) : (
                        'SELECT'
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '2px solid rgba(0, 229, 255, 0.25)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pixel-subtext" style={{ fontSize: '0.6rem' }}>
              Current: <strong style={{ color: currentMeta.color }}>{currentMeta.label}</strong> (
              {filteredTopics.length} topic{filteredTopics.length === 1 ? '' : 's'})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRandomSelect}
              className="pixel-btn pixel-btn-magenta"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.65rem',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={13} />
              RANDOM TOPIC
            </button>

            <button
              onClick={() => {
                play('click');
                onClose();
              }}
              className="pixel-btn"
              style={{
                padding: '6px 14px',
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
    </div>
  );
}
