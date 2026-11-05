/**
 * @file BountySynthesisLabModal.tsx
 * @description Unified Bounty Synthesis Lab & Vulnerability Taxonomy modal dialog — ICE MATRIX edition.
 * Merges procedural AI challenge configuration with rich vulnerability archetype discovery:
 * - Domain Mode Switcher: DSA (Algorithms) vs Practical (Production Bugs)
 * - Multi-Language Matrix: Full support for 8 programming stacks
 * - Difficulty Clearance Tiers: Novice (120s), Veteran (90s), Master (60s)
 * - Live Search, Category Domain, and Difficulty filtering
 * - Rich Topic Archetype Cards with bug previews
 * - Dual Action Footer: [EQUIP TOPIC & CLOSE] vs [INITIATE AI SYNTHESIS]
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getAllLanguages,
  getTopicsByLanguage,
  getLanguageMeta,
  getRandomTopic,
  type SupportedLanguage,
  type ChallengeDifficulty,
} from '@/core/taxonomy/challengeTaxonomy';
import { useAudioSFX } from '@/hooks/useAudioSFX';
import { PixelCloseButton } from '@/components/common/PixelCloseButton';
import {
  Cpu,
  Shield,
  Zap,
  Sparkles,
  Search,
  CheckCircle2,
  FileCode,
  Terminal,
  Database,
  Box,
  X,
} from 'lucide-react';

export type MatrixMode = 'dsa' | 'practical';
export type ClearanceDifficulty = 'easy' | 'medium' | 'hard';

export interface BountySynthesisLabModalProps {
  /** Whether the modal is currently open. */
  open: boolean;
  /** Callback to close the modal without modifying or starting. */
  onClose: () => void;
  /** Initial language from the lobby state. */
  initialLanguage?: SupportedLanguage;
  /** Initial topic slug from the lobby state. */
  initialTopicId?: string | null;
  /** Initial difficulty from the lobby state ('easy' | 'medium' | 'hard'). */
  initialDifficulty?: ClearanceDifficulty;
  /** Initial mode ('dsa' | 'practical'). */
  initialMode?: MatrixMode;
  /** Action 1: Equip the selected configuration to lobby state and close. */
  onEquip: (selection: {
    language: SupportedLanguage;
    topicId: string;
    difficulty: ClearanceDifficulty;
    mode: MatrixMode;
  }) => void;
  /** Action 2: Immediately trigger AI synthesis and drop player into the arena. */
  onInitiateSynthesis: (selection: {
    language: SupportedLanguage;
    topicId: string;
    difficulty: ClearanceDifficulty;
    mode: MatrixMode;
  }) => void;
  /** Whether challenge generation is actively in progress. */
  isLoading?: boolean;
}

export function BountySynthesisLabModal({
  open,
  onClose,
  initialLanguage = 'typescript',
  initialTopicId,
  initialDifficulty = 'medium',
  initialMode = 'practical',
  onEquip,
  onInitiateSynthesis,
  isLoading = false,
}: BountySynthesisLabModalProps) {
  const { play } = useAudioSFX();

  // Internal configuration states
  const [mode, setMode] = useState<MatrixMode>(initialMode);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(initialLanguage);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ClearanceDifficulty>(initialDifficulty);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId ?? null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'dsa' | 'logic' | 'security' | 'async' | 'memory' | 'types'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | ChallengeDifficulty>('all');

  const languages = useMemo(() => getAllLanguages(), []);
  const allLangTopics = useMemo(() => getTopicsByLanguage(selectedLang), [selectedLang]);

  // Derive effective topic ID for active selection
  const effectiveTopicId = useMemo(() => {
    if (selectedTopicId && allLangTopics.some((t) => t.id === selectedTopicId)) {
      return selectedTopicId;
    }
    const modeMatch = allLangTopics.find((t) => (mode === 'dsa' ? t.category === 'dsa' : t.category !== 'dsa'));
    return modeMatch ? modeMatch.id : (allLangTopics[0]?.id ?? 'arrays-strings');
  }, [selectedTopicId, allLangTopics, mode]);

  // Sync internal state when opened
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSelectedLang(initialLanguage);
      setSelectedDifficulty(initialDifficulty);
      setMode(initialMode);
      setSelectedTopicId(initialTopicId ?? null);
      setSearchQuery('');
      setCategoryFilter('all');
      setDifficultyFilter('all');
    }
    wasOpenRef.current = open;
  }, [open, initialLanguage, initialDifficulty, initialMode, initialTopicId]);

  // Keyboard Escape listener
  const handleExit = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleExit]);

  // Filter topics by mode, category, difficulty, and query
  const filteredTopics = useMemo(() => {
    let list = allLangTopics;

    // Filter by mode
    if (mode === 'dsa') {
      list = list.filter((t) => t.category === 'dsa');
    } else {
      list = list.filter((t) => t.category !== 'dsa');
    }

    // Filter by category chip
    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    // Filter by difficulty chip
    if (difficultyFilter !== 'all') {
      list = list.filter((t) => t.difficulty === difficultyFilter);
    }

    // Filter by search query
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
  }, [allLangTopics, mode, categoryFilter, difficultyFilter, searchQuery]);

  if (!open) return null;

  const currentMeta = getLanguageMeta(selectedLang);

  // Mode change handler
  const handleModeChange = (newMode: MatrixMode) => {
    play('click');
    setMode(newMode);
    setCategoryFilter('all');
    const matching = allLangTopics.filter((t) => (newMode === 'dsa' ? t.category === 'dsa' : t.category !== 'dsa'));
    if (matching.length > 0 && (!selectedTopicId || !matching.some((m) => m.id === selectedTopicId))) {
      setSelectedTopicId(matching[0].id);
    }
  };

  // Language switch handler
  const handleLangChange = (lang: SupportedLanguage) => {
    play('click');
    setSelectedLang(lang);
    const topicsForNewLang = getTopicsByLanguage(lang);
    const matching = topicsForNewLang.filter((t) => (mode === 'dsa' ? t.category === 'dsa' : t.category !== 'dsa'));
    if (matching.length > 0) {
      setSelectedTopicId(matching[0].id);
    } else if (topicsForNewLang.length > 0) {
      setSelectedTopicId(topicsForNewLang[0].id);
    }
  };

  // Random topic generator
  const handleRandomSelect = () => {
    play('start');
    const pool = filteredTopics.length > 0 ? filteredTopics : allLangTopics;
    if (pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIndex];
      setSelectedTopicId(chosen.id);
      if (chosen.category === 'dsa' && mode !== 'dsa') {
        setMode('dsa');
      } else if (chosen.category !== 'dsa' && mode !== 'practical') {
        setMode('practical');
      }
    } else {
      const random = getRandomTopic(selectedLang);
      if (random) {
        setSelectedTopicId(random.id);
      }
    }
  };

  // Submit Equip Action
  const handleEquipAndClose = () => {
    play('click');
    onEquip({
      language: selectedLang,
      topicId: effectiveTopicId,
      difficulty: selectedDifficulty,
      mode,
    });
    onClose();
  };

  // Submit Synthesis Action
  const handleInitiate = () => {
    play('start');
    onInitiateSynthesis({
      language: selectedLang,
      topicId: effectiveTopicId,
      difficulty: selectedDifficulty,
      mode,
    });
  };

  const getDiffBadgeStyle = (diff: ChallengeDifficulty) => {
    switch (diff) {
      case 'easy':
        return { color: '#00D9FF', border: '1px solid rgba(0, 217, 255, 0.4)', background: 'rgba(0, 217, 255, 0.12)' };
      case 'hard':
        return { color: '#ff0055', border: '1px solid rgba(255, 0, 85, 0.4)', background: 'rgba(255, 0, 85, 0.15)' };
      case 'medium':
      default:
        return { color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.4)', background: 'rgba(255, 204, 0, 0.12)' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 11, 24, 0.92)',
        backdropFilter: 'blur(12px)',
        padding: '16px',
      }}
      onClick={handleExit}
    >
      <div
        className="pixel-box hud-corner-brackets"
        style={{
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          background: '#081426',
          border: '2px solid #00f0ff',
          boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(0, 217, 255, 0.25)',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono, monospace)',
          color: '#eaf8ff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(0, 240, 255, 0.3)',
            padding: '20px 24px',
            background: 'rgba(5, 11, 24, 0.85)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={22} color="#00f0ff" />
              <h2
                style={{
                  fontFamily: 'var(--font-arcade, monospace)',
                  fontSize: '0.9rem',
                  margin: 0,
                  color: '#00f0ff',
                  letterSpacing: '1px',
                }}
              >
                BOUNTY SYNTHESIS LAB // VULNERABILITY ARCHETYPES
              </h2>
            </div>
            <p
              style={{
                marginTop: '4px',
                margin: 0,
                fontSize: '0.7rem',
                color: '#8199B5',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Configure runtime language, bug domain, and difficulty clearance for arena challenges.
            </p>
          </div>

          <PixelCloseButton
            onClick={handleExit}
            disabled={isLoading}
            title="Close (Esc)"
          />
        </div>

        {/* ── Scrollable Body Content ─────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* ── STEP 1: Mode / Domain Switcher ──────────────────────────── */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                color: '#8199b5',
                fontFamily: 'var(--font-arcade, monospace)',
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}
            >
              STEP 1: SELECT MATRIX DOMAIN (MODE)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleModeChange('dsa')}
                style={{
                  background: mode === 'dsa' ? '#00f0ff' : '#0a1128',
                  color: mode === 'dsa' ? '#0a1128' : '#65cfff',
                  border: '2px solid #00f0ff',
                  boxShadow: mode === 'dsa' ? 'inset 0 0 8px rgba(0,0,0,0.4)' : '2px 2px 0px #003366',
                  borderRadius: '0px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <Zap size={16} /> DSA / ALGORITHMIC BUGS
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '4px', fontWeight: 400 }}>
                  Complex pointer math, DP recurrences, search & array mutations.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('practical')}
                style={{
                  background: mode === 'practical' ? '#00f0ff' : '#0a1128',
                  color: mode === 'practical' ? '#0a1128' : '#65cfff',
                  border: '2px solid #00f0ff',
                  boxShadow: mode === 'practical' ? 'inset 0 0 8px rgba(0,0,0,0.4)' : '2px 2px 0px #003366',
                  borderRadius: '0px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <Shield size={16} /> PRACTICAL / SYSTEM BUGS
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '4px', fontWeight: 400 }}>
                  Concurrency leaks, async event loops, SQL safety, memory & types.
                </div>
              </button>
            </div>
          </div>

          {/* ── STEP 2: Multi-Language Matrix ──────────────────────────── */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                color: '#8199b5',
                fontFamily: 'var(--font-arcade, monospace)',
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}
            >
              STEP 2: SELECT PROGRAMMING STACK ({languages.length} AVAILABLE)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '8px',
              }}
            >
              {languages.map((lang) => {
                const meta = getLanguageMeta(lang);
                const isSelected = selectedLang === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLangChange(lang)}
                    className="btn-pixel-cyber"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      borderColor: isSelected ? '#00D9FF' : 'rgba(129, 153, 181, 0.25)',
                      background: isSelected ? 'rgba(0, 217, 255, 0.2)' : 'rgba(5, 11, 24, 0.7)',
                      color: isSelected ? '#00D9FF' : '#8199B5',
                      boxShadow: isSelected ? '2px 2px 0px #003366, 0 0 10px rgba(0, 217, 255, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center',
                      borderRadius: '0px',
                      cursor: 'pointer',
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 3: Difficulty Clearance Tiers ─────────────────────── */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                color: '#8199b5',
                fontFamily: 'var(--font-arcade, monospace)',
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}
            >
              STEP 3: DIFFICULTY CLEARANCE TIERS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {(
                [
                  { id: 'easy' as const, label: 'NOVICE [120S]', color: '#00f0ff', desc: 'Pedagogical bugs & clear syntax' },
                  { id: 'medium' as const, label: 'VETERAN [90S]', color: '#ffcc00', desc: 'Standard production edge cases' },
                  { id: 'hard' as const, label: 'MASTER [60S]', color: '#ff0055', desc: 'Obscure race conditions & pointers' },
                ] as const
              ).map((tier) => {
                const selected = selectedDifficulty === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      play('click');
                      setSelectedDifficulty(tier.id);
                    }}
                    style={{
                      background: selected ? tier.color : '#0a1128',
                      color: selected ? '#0a1128' : tier.color,
                      border: `2px solid ${tier.color}`,
                      boxShadow: selected ? '2px 2px 0px #003366, 0 0 10px rgba(0,0,0,0.5)' : 'none',
                      borderRadius: '0px',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-arcade, monospace)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {tier.label}
                    </div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.85, marginTop: '3px' }}>
                      {tier.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 4: Target Vulnerability Archetype (Search & Grid) ── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#8199b5',
                  fontFamily: 'var(--font-arcade, monospace)',
                  letterSpacing: '0.5px',
                }}
              >
                STEP 4: TARGET VULNERABILITY ARCHETYPE
              </div>
              <button
                type="button"
                onClick={handleRandomSelect}
                className="btn-pixel-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.68rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Randomly select a vulnerability archetype"
              >
                <Sparkles size={13} /> RANDOM ARCHETYPE
              </button>
            </div>

            {/* Search & Difficulty Filter Chips */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              {/* Search input */}
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
                  placeholder={`Search ${currentMeta.label} vulnerabilities by archetype, tag...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    background: '#050B18',
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    color: '#EAF8FF',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    borderRadius: '0px',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
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
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
                  const active = difficultyFilter === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        play('click');
                        setDifficultyFilter(diff);
                      }}
                      className="btn-pixel-cyber"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.65rem',
                        borderColor: active ? '#00D9FF' : 'rgba(129, 153, 181, 0.25)',
                        background: active ? 'rgba(0, 217, 255, 0.2)' : 'rgba(5, 11, 24, 0.7)',
                        color: active ? '#00D9FF' : '#8199B5',
                        borderRadius: '0px',
                      }}
                    >
                      {diff.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Domain Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.62rem', color: '#8199B5', fontFamily: 'var(--font-mono)', marginRight: '2px' }}>
                DOMAIN:
              </span>
              {(mode === 'dsa'
                ? (['all', 'dsa'] as const)
                : (['all', 'logic', 'security', 'async', 'memory', 'types'] as const)
              ).map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      play('click');
                      setCategoryFilter(cat);
                    }}
                    className="btn-pixel-cyber"
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.65rem',
                      borderColor: active ? (cat === 'dsa' ? '#00D9FF' : '#65CFFF') : 'rgba(129, 153, 181, 0.25)',
                      background: active
                        ? cat === 'dsa'
                          ? 'rgba(0, 217, 255, 0.25)'
                          : 'rgba(101, 207, 255, 0.2)'
                        : 'rgba(5, 11, 24, 0.7)',
                      color: active ? (cat === 'dsa' ? '#00D9FF' : '#EAF8FF') : '#8199B5',
                      fontWeight: active ? 700 : 500,
                      borderRadius: '0px',
                    }}
                  >
                    {cat === 'dsa' ? '⚡ DSA (ALGORITHMS)' : cat.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Topic Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '10px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {filteredTopics.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '28px',
                    color: '#8199B5',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    background: 'rgba(5, 11, 24, 0.5)',
                    border: '1px dashed rgba(0, 217, 255, 0.2)',
                  }}
                >
                  No vulnerability domains match your search query for {mode.toUpperCase()} mode.
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const isActive = effectiveTopicId === topic.id;
                  const badgeStyle = getDiffBadgeStyle(topic.difficulty);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => {
                        play('click');
                        setSelectedTopicId(topic.id);
                      }}
                      className="pixel-box"
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(0, 217, 255, 0.16)' : 'rgba(5, 11, 24, 0.75)',
                        border: isActive ? '2px solid #00D9FF' : '1px solid rgba(0, 217, 255, 0.2)',
                        boxShadow: isActive ? '2px 2px 0px #003366, 0 0 10px rgba(0, 217, 255, 0.2)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                        borderRadius: '0px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '0px',
                                ...badgeStyle,
                              }}
                            >
                              {topic.difficulty.toUpperCase()}
                            </span>
                            <span
                              style={{
                                fontSize: '0.58rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '0px',
                                color: topic.category === 'dsa' ? '#00D9FF' : '#8199B5',
                                background: topic.category === 'dsa' ? 'rgba(0, 217, 255, 0.15)' : 'rgba(129, 153, 181, 0.1)',
                                border: `1px solid ${topic.category === 'dsa' ? 'rgba(0, 217, 255, 0.35)' : 'rgba(129, 153, 181, 0.2)'}`,
                              }}
                            >
                              {topic.category === 'dsa' ? '⚡ DSA' : topic.category.toUpperCase()}
                            </span>
                          </div>

                          {isActive && (
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: '#00D9FF',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                              }}
                            >
                              <CheckCircle2 size={12} /> ACTIVE
                            </span>
                          )}
                        </div>

                        <h3
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#EAF8FF',
                            margin: 0,
                            fontFamily: 'var(--font-heading)',
                            lineHeight: 1.3,
                          }}
                        >
                          {topic.name}
                        </h3>
                        <p
                          style={{
                            fontSize: '0.68rem',
                            color: '#8199B5',
                            marginTop: '4px',
                            lineHeight: 1.35,
                          }}
                        >
                          {topic.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {topic.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.58rem',
                              color: '#65CFFF',
                              background: 'rgba(0, 217, 255, 0.08)',
                              border: '1px solid rgba(0, 217, 255, 0.2)',
                              padding: '1px 4px',
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

        {/* ── Dual Action Footer ───────────────────────────────────────── */}
        <div
          style={{
            borderTop: '2px solid rgba(0, 240, 255, 0.3)',
            padding: '16px 24px',
            background: 'rgba(5, 11, 24, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          {/* Active selection summary info */}
          <div style={{ fontSize: '0.68rem', color: '#8199B5', lineHeight: 1.4 }}>
            <div>
              EQUIPPED:{' '}
              <span style={{ color: '#00f0ff', fontWeight: 800 }}>
                {currentMeta.label.toUpperCase()}
              </span>{' '}
              • <span style={{ color: '#65cfff' }}>{mode.toUpperCase()}</span> •{' '}
              <span
                style={{
                  color:
                    selectedDifficulty === 'easy'
                      ? '#00f0ff'
                      : selectedDifficulty === 'medium'
                        ? '#ffcc00'
                        : '#ff0055',
                  fontWeight: 800,
                }}
              >
                {selectedDifficulty.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.62rem', color: '#516682', marginTop: '2px' }}>
              TARGET ARCHETYPE: {allLangTopics.find((t) => t.id === effectiveTopicId)?.name || effectiveTopicId}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Button 1: Equip & Close */}
            <button
              type="button"
              onClick={handleEquipAndClose}
              disabled={isLoading}
              className="btn-pixel-cyber"
              style={{
                border: '2px solid #00D9FF',
                boxShadow: '2px 2px 0px #003366',
                background: '#0a1128',
                color: '#00D9FF',
                padding: '12px 18px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-arcade, monospace)',
                fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '0px',
              }}
              title="Save selection to lobby without starting challenge"
            >
              <CheckCircle2 size={16} /> [EQUIP TOPIC & CLOSE]
            </button>

            {/* Button 2: Initiate AI Synthesis */}
            <button
              type="button"
              onClick={handleInitiate}
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(0, 240, 255, 0.4)' : '#00f0ff',
                color: '#0a1128',
                border: '2px solid #00f0ff',
                boxShadow: '3px 3px 0px #003366',
                borderRadius: '0px',
                padding: '12px 20px',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-arcade, monospace)',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
              title="Immediately generate a challenge via AI with seed rotation and fingerprint exclusions"
            >
              <Terminal size={18} />
              {isLoading ? '> SYNTHESIZING UNIQUE BOUNTY...' : '[>> INITIATE AI SYNTHESIS <<]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
