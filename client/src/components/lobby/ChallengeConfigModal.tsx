/**
 * @file ChallengeConfigModal.tsx
 * @description Dynamic Challenge Configuration Modal in retro Icy Matrix / Pixel Arcade styling.
 * Allows hackers to select Mode (DSA vs Practical), Language, Topic, and Difficulty Tier.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TOPICS_BY_CATEGORY,
  type SupportedLanguageId,
  type ChallengeCategoryKey,
  type DifficultyTier,
  type ChallengeConfigSelection,
} from '@/config/taxonomy';
import { Terminal, Cpu, Shield, Zap } from 'lucide-react';

export interface ChallengeConfigModalProps {
  open: boolean;
  onClose: () => void;
  onInitiate: (config: ChallengeConfigSelection) => void;
  isLoading?: boolean;
}

export function ChallengeConfigModal({
  open,
  onClose,
  onInitiate,
  isLoading = false,
}: ChallengeConfigModalProps) {
  const [mode, setMode] = useState<ChallengeCategoryKey>('practical');
  const [language, setLanguage] = useState<SupportedLanguageId>('typescript');
  const [topic, setTopic] = useState<string>(TOPICS_BY_CATEGORY.practical[0].id);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('VETERAN');

  // Sync topic when mode changes
  const handleModeChange = (newMode: ChallengeCategoryKey) => {
    setMode(newMode);
    setTopic(TOPICS_BY_CATEGORY[newMode][0].id);
  };

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

  if (!open) return null;

  const currentTopics = TOPICS_BY_CATEGORY[mode];

  const handleSubmit = () => {
    onInitiate({
      mode,
      language,
      topic,
      difficulty,
    });
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
        backdropFilter: 'blur(10px)',
        padding: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          background: '#081426',
          border: '2px solid #00f0ff',
          boxShadow: '4px 4px 0px #003366',
          borderRadius: '0px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono, monospace)',
          color: '#eaf8ff',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(0, 240, 255, 0.3)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={22} color="#00f0ff" />
            <h2
              style={{
                fontFamily: 'var(--font-arcade, monospace)',
                fontSize: '0.95rem',
                margin: 0,
                color: '#00f0ff',
                letterSpacing: '1px',
              }}
            >
              BOUNTY SYNTHESIS LAB // MATRIX CONFIG
            </h2>
          </div>

          <button
            onClick={handleExit}
            disabled={isLoading}
            style={{
              background: '#0a1128',
              color: '#00f0ff',
              border: '2px solid #00f0ff',
              boxShadow: '2px 2px 0px #003366',
              borderRadius: '0px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-arcade, monospace)',
            }}
          >
            [ESC / EXIT]
          </button>
        </div>

        {/* 1. Mode Selector */}
        <div>
          <div
            style={{
              fontSize: '0.7rem',
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
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <Zap size={16} /> DSA / ALGORITHMIC BUGS
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '4px', fontWeight: 400 }}>
                Complex pointer math, DP recurrences, and edge cases.
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
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <Shield size={16} /> PRACTICAL / SYSTEM BUGS
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '4px', fontWeight: 400 }}>
                Concurrency leaks, async event loops, SQL safety, state mutation.
              </div>
            </button>
          </div>
        </div>

        {/* 2. Language Selector Grid */}
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#8199b5',
              fontFamily: 'var(--font-arcade, monospace)',
              marginBottom: '8px',
              letterSpacing: '0.5px',
            }}
          >
            STEP 2: SELECT PROGRAMMING STACK ({SUPPORTED_LANGUAGES.length} AVAILABLE)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = language === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  style={{
                    background: selected ? '#00f0ff' : '#0a1128',
                    color: selected ? '#0a1128' : '#eaf8ff',
                    border: selected ? '2px solid #00f0ff' : '1px solid rgba(0, 240, 255, 0.4)',
                    boxShadow: selected ? '2px 2px 0px #003366' : 'none',
                    borderRadius: '0px',
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: selected ? 800 : 500,
                    textAlign: 'center',
                  }}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Topic Selector Grid (Filtered by Mode) */}
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#8199b5',
              fontFamily: 'var(--font-arcade, monospace)',
              marginBottom: '8px',
              letterSpacing: '0.5px',
            }}
          >
            STEP 3: TARGET VULNERABILITY ARCHETYPE
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
            }}
          >
            {currentTopics.map((top) => {
              const selected = topic === top.id;
              return (
                <button
                  key={top.id}
                  type="button"
                  onClick={() => setTopic(top.id)}
                  style={{
                    background: selected ? 'rgba(0, 240, 255, 0.2)' : '#0a1128',
                    color: selected ? '#00f0ff' : '#8199b5',
                    border: selected ? '2px solid #00f0ff' : '1px solid rgba(0, 240, 255, 0.2)',
                    boxShadow: selected ? '2px 2px 0px #003366' : 'none',
                    borderRadius: '0px',
                    padding: '10px 12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: selected ? 700 : 400,
                    textAlign: 'left',
                  }}
                >
                  {top.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Difficulty Tier */}
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#8199b5',
              fontFamily: 'var(--font-arcade, monospace)',
              marginBottom: '8px',
              letterSpacing: '0.5px',
            }}
          >
            STEP 4: DIFFICULTY CLEARANCE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {(['NOVICE', 'VETERAN', 'CYBER_PUNK'] as DifficultyTier[]).map((tier) => {
              const selected = difficulty === tier;
              const color =
                tier === 'NOVICE' ? '#00f0ff' : tier === 'VETERAN' ? '#ffcc00' : '#ff0055';
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setDifficulty(tier)}
                  style={{
                    background: selected ? color : '#0a1128',
                    color: selected ? '#0a1128' : color,
                    border: `2px solid ${color}`,
                    boxShadow: selected ? '2px 2px 0px #003366' : 'none',
                    borderRadius: '0px',
                    padding: '10px 6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-arcade, monospace)',
                    textAlign: 'center',
                    letterSpacing: '0.5px',
                  }}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Button */}
        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              width: '100%',
              background: '#00f0ff',
              color: '#0a1128',
              border: '2px solid #00f0ff',
              boxShadow: '3px 3px 0px #003366',
              borderRadius: '0px',
              padding: '14px',
              fontSize: '0.9rem',
              fontWeight: 900,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-arcade, monospace)',
              letterSpacing: '1.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Terminal size={18} />
            {isLoading ? '> SYNTHESIZING UNIQUE BOUNTY...' : '[>> INITIATE SYNTHESIS <<]'}
          </button>
        </div>
      </div>
    </div>
  );
}

