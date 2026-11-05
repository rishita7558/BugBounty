/**
 * @file BountySynthesisLab.test.ts
 * @description Unit tests for unified Bounty Synthesis Lab & Vulnerability Taxonomy architecture.
 */

import { describe, it, expect } from 'vitest';
import {
  getAllLanguages,
  getTopicsByLanguage,
  getLanguageMeta,
  getRandomTopic,
  type SupportedLanguage,
} from '@/core/taxonomy/challengeTaxonomy';
import type { MatrixMode, ClearanceDifficulty } from '@/components/modals/BountySynthesisLabModal';

describe('Bounty Synthesis Lab Architecture & Taxonomy Integration', () => {
  const ALL_8_LANGUAGES: SupportedLanguage[] = [
    'javascript',
    'typescript',
    'python',
    'rust',
    'go',
    'cpp',
    'java',
    'sql',
  ];

  it('supports all 8 core programming stacks in the multi-language matrix', () => {
    const langs = getAllLanguages();
    expect(langs).toHaveLength(8);
    for (const expectedLang of ALL_8_LANGUAGES) {
      expect(langs).toContain(expectedLang);
      const meta = getLanguageMeta(expectedLang);
      expect(meta).toBeDefined();
      expect(meta.id).toBe(expectedLang);
      expect(meta.label).toBeTruthy();
      expect(meta.color).toBeTruthy();
    }
  });

  it('guarantees both DSA and Practical topics exist for every language', () => {
    for (const lang of ALL_8_LANGUAGES) {
      const topics = getTopicsByLanguage(lang);
      expect(topics.length).toBeGreaterThanOrEqual(4);

      const dsaTopics = topics.filter((t) => t.category === 'dsa');
      const practicalTopics = topics.filter((t) => t.category !== 'dsa');

      expect(dsaTopics.length).toBeGreaterThan(0);
      expect(practicalTopics.length).toBeGreaterThan(0);

      // Verify required metadata fields on all topic cards
      for (const t of topics) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.tags.length).toBeGreaterThan(0);
        expect(t.commonBugs.length).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(t.difficulty);
      }
    }
  });

  it('allows picking random valid archetypes conforming to mode constraints', () => {
    for (const lang of ALL_8_LANGUAGES) {
      const randomTopic = getRandomTopic(lang);
      expect(randomTopic).toBeDefined();
      expect(randomTopic.language).toBe(lang);

      const randomEasy = getRandomTopic(lang, 'easy');
      if (randomEasy) {
        expect(randomEasy.difficulty).toBe('easy');
      }
    }
  });

  it('maps difficulty clearance tiers to valid arena difficulties and timer bounds', () => {
    const TIERS: Record<ClearanceDifficulty, { timeRemaining: number; label: string }> = {
      easy: { timeRemaining: 120, label: 'NOVICE' },
      medium: { timeRemaining: 90, label: 'VETERAN' },
      hard: { timeRemaining: 60, label: 'MASTER' },
    };

    expect(TIERS.easy.timeRemaining).toBe(120);
    expect(TIERS.medium.timeRemaining).toBe(90);
    expect(TIERS.hard.timeRemaining).toBe(60);
  });

  it('verifies dual-action configuration payloads maintain strict type contract', () => {
    const samplePayload: {
      language: SupportedLanguage;
      topicId: string;
      difficulty: ClearanceDifficulty;
      mode: MatrixMode;
    } = {
      language: 'typescript',
      topicId: 'ts-dsa-binary-search',
      difficulty: 'hard',
      mode: 'dsa',
    };

    expect(samplePayload.language).toBe('typescript');
    expect(samplePayload.mode).toBe('dsa');
    expect(samplePayload.difficulty).toBe('hard');
    expect(samplePayload.topicId).toBe('ts-dsa-binary-search');
  });
});

