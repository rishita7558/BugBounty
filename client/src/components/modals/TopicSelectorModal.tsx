/**
 * @file TopicSelectorModal.tsx
 * @description Topic selection modal for CodeDuel: BugBounty Arena — ICE MATRIX edition.
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
  Cpu,
  Database,
  Box,
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'dsa' | 'logic' | 'security' | 'async' | 'memory' | 'types'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const languages = useMemo(() => getAllLanguages(), []);

  // Filter topics for the currently selected language
  const filteredTopics = useMemo(() => {
    let list = getTopicsByLanguage(selectedLang);

    if (difficultyFilter !== 'all') {
      list = list.filter((t) => t.difficulty === difficultyFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
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
  }, [selectedLang, difficultyFilter, categoryFilter, searchQuery]);

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
        return { color: '#00D9FF', border: '1px solid rgba(0, 217, 255, 0.4)', background: 'rgba(0, 217, 255, 0.12)' };
      case 'hard':
        return { color: '#B8D8EA', border: '1px solid rgba(40, 123, 255, 0.4)', background: 'rgba(40, 123, 255, 0.15)' };
      case 'medium':
      default:
        return { color: '#65CFFF', border: '1px solid rgba(101, 207, 255, 0.4)', background: 'rgba(101, 207, 255, 0.12)' };
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
          maxWidth: '840px',
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
              <Layers size={18} color="#00D9FF" />
              <h2 className="arcade-text neon-text" style={{ fontSize: '0.85rem', margin: 0 }}>
                SELECT VULNERABILITY ARCHETYPE
              </h2>
            </div>
            <p style={{ marginTop: '4px', margin: 0, fontSize: '0.7rem', color: '#8199B5', fontFamily: 'var(--font-mono)' }}>
              Configure runtime language & vulnerability taxonomy for procedural arena challenges.
            </p>
          </div>

          <button
            onClick={() => {
              play('click');
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8199B5',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Language Cartridge Tabs ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
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
                className="btn-pixel-cyber"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.75rem',
                  borderColor: isSelected ? '#00D9FF' : 'rgba(129, 153, 181, 0.25)',
                  background: isSelected ? 'rgba(0, 217, 255, 0.15)' : 'rgba(5, 11, 24, 0.7)',
                  color: isSelected ? '#00D9FF' : '#8199B5',
                  boxShadow: isSelected ? '0 0 12px rgba(0, 217, 255, 0.3)' : 'none',
                }}
              >
                {lang === 'javascript' && <FileCode size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'typescript' && <Shield size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'python' && <Terminal size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'rust' && <Shield size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'go' && <Terminal size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'cpp' && <Cpu size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'java' && <Box size={14} color={isSelected ? '#00D9FF' : undefined} />}
                {lang === 'sql' && <Database size={14} color={isSelected ? '#00D9FF' : undefined} />}
                <span>{meta.label}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    opacity: 0.8,
                    background: 'rgba(0, 217, 255, 0.12)',
                    padding: '1px 6px',
                    borderRadius: '2px',
                  }}
                >
                  {getTopicsByLanguage(lang).length}
                </span>
              </button>
            );
          })}

          <button
            onClick={handleRandomSelect}
            className="btn-pixel-primary"
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              fontSize: '0.75rem',
            }}
          >
            <Sparkles size={14} /> Random Topic
          </button>
        </div>

        {/* ── Search & Filter Controls ────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '14px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              flex: 1,
              minWidth: '220px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              color="#8199B5"
              style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder={`Search ${currentMeta.label} vulnerabilities...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                background: '#050B18',
                border: '1px solid rgba(0, 217, 255, 0.25)',
                color: '#EAF8FF',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#8199B5',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Difficulty Filter Chips */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
              const active = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  onClick={() => {
                    play('click');
                    setDifficultyFilter(diff);
                  }}
                  className="btn-pixel-cyber"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.7rem',
                    borderColor: active ? '#00D9FF' : 'rgba(129, 153, 181, 0.25)',
                    background: active ? 'rgba(0, 217, 255, 0.15)' : 'rgba(5, 11, 24, 0.7)',
                    color: active ? '#00D9FF' : '#8199B5',
                  }}
                >
                  {diff.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Category Domain Filter Chips ────────────────────────────── */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: '#8199B5', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>
            DOMAIN:
          </span>
          {(['all', 'dsa', 'logic', 'security', 'async', 'memory', 'types'] as const).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  play('click');
                  setCategoryFilter(cat);
                }}
                className="btn-pixel-cyber"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.68rem',
                  borderColor: active ? (cat === 'dsa' ? '#00D9FF' : '#65CFFF') : 'rgba(129, 153, 181, 0.25)',
                  background: active ? (cat === 'dsa' ? 'rgba(0, 217, 255, 0.25)' : 'rgba(101, 207, 255, 0.15)') : 'rgba(5, 11, 24, 0.7)',
                  color: active ? (cat === 'dsa' ? '#00D9FF' : '#EAF8FF') : '#8199B5',
                  fontWeight: cat === 'dsa' ? 800 : 600,
                }}
              >
                {cat === 'dsa' ? '⚡ DSA (ALGORITHMS)' : cat.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* ── Topic Cards Grid ────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '12px',
            paddingRight: '4px',
          }}
        >
          {filteredTopics.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '36px',
                color: '#8199B5',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
              }}
            >
              No vulnerability domains match your search query.
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isActive = activeTopicId === topic.id;
              const badgeStyle = getDiffBadgeStyle(topic.difficulty);
              return (
                <div
                  key={topic.id}
                  onClick={() => handleSelect(topic)}
                  className="pixel-box"
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(0, 217, 255, 0.12)' : 'rgba(5, 11, 24, 0.75)',
                    border: isActive ? '1px solid #00D9FF' : '1px solid rgba(0, 217, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            ...badgeStyle,
                          }}
                        >
                          {topic.difficulty.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            color: topic.category === 'dsa' ? '#00D9FF' : '#8199B5',
                            background: topic.category === 'dsa' ? 'rgba(0, 217, 255, 0.15)' : 'rgba(129, 153, 181, 0.1)',
                            border: `1px solid ${topic.category === 'dsa' ? 'rgba(0, 217, 255, 0.35)' : 'rgba(129, 153, 181, 0.2)'}`,
                          }}
                        >
                          {topic.category === 'dsa' ? '⚡ DSA' : topic.category.toUpperCase()}
                        </span>
                      </div>
                      {isActive && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#00D9FF', fontSize: '0.65rem' }}>
                          <CheckCircle2 size={12} /> ACTIVE
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EAF8FF', margin: 0, fontFamily: 'var(--font-heading)' }}>
                      {topic.name}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: '#8199B5', marginTop: '4px', lineHeight: 1.4 }}>
                      {topic.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {topic.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.6rem',
                          color: '#65CFFF',
                          background: 'rgba(0, 217, 255, 0.08)',
                          border: '1px solid rgba(0, 217, 255, 0.2)',
                          padding: '1px 5px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
