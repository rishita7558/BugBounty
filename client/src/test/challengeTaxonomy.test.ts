import { describe, it, expect } from 'vitest';
import {
  getAllLanguages,
  getTopicsByLanguage,
  getTopicById,
  isValidTopic,
  getLanguageForTopic,
  getRandomTopic,
  getLanguageMeta,
  CHALLENGE_TAXONOMY,
} from '@/core/taxonomy/challengeTaxonomy';

describe('Challenge Taxonomy System', () => {
  it('defines all three core languages: javascript, typescript, and python', () => {
    const languages = getAllLanguages();
    expect(languages).toEqual(['javascript', 'typescript', 'python']);
    expect(Object.keys(CHALLENGE_TAXONOMY)).toEqual(languages);
  });

  it('provides topics for every supported language', () => {
    for (const lang of getAllLanguages()) {
      const topics = getTopicsByLanguage(lang);
      expect(topics.length).toBeGreaterThanOrEqual(4);
      topics.forEach((t) => {
        expect(t.language).toBe(lang);
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.commonBugs.length).toBeGreaterThan(0);
      });
    }
  });

  it('correctly retrieves topics by ID', () => {
    const jsTopic = getTopicById('js-async-event-loop');
    expect(jsTopic).toBeDefined();
    expect(jsTopic?.language).toBe('javascript');
    expect(jsTopic?.category).toBe('async');

    const tsTopic = getTopicById('ts-type-narrowing');
    expect(tsTopic).toBeDefined();
    expect(tsTopic?.language).toBe('typescript');

    const pyTopic = getTopicById('py-mutable-defaults');
    expect(pyTopic).toBeDefined();
    expect(pyTopic?.language).toBe('python');

    expect(getTopicById('unknown-topic-slug')).toBeUndefined();
  });

  it('validates whether a topic exists', () => {
    expect(isValidTopic('js-closures-scope')).toBe(true);
    expect(isValidTopic('py-scope-legb')).toBe(true);
    expect(isValidTopic('nonexistent-topic')).toBe(false);
  });

  it('determines the language for a given topic', () => {
    expect(getLanguageForTopic('js-prototype-pollution')).toBe('javascript');
    expect(getLanguageForTopic('ts-generics-constraints')).toBe('typescript');
    expect(getLanguageForTopic('py-generator-exhaustion')).toBe('python');
    expect(getLanguageForTopic('invalid-id')).toBe('javascript');
  });

  it('picks random topics properly with or without filters', () => {
    const randomAny = getRandomTopic();
    expect(randomAny).toBeDefined();
    expect(isValidTopic(randomAny.id)).toBe(true);

    const randomPy = getRandomTopic('python');
    expect(randomPy.language).toBe('python');

    const randomEasyTs = getRandomTopic('typescript', 'easy');
    expect(randomEasyTs.language).toBe('typescript');
    expect(randomEasyTs.difficulty).toBe('easy');
  });

  it('provides accurate language metadata for editor and badges', () => {
    const jsMeta = getLanguageMeta('javascript');
    expect(jsMeta.monacoLanguage).toBe('javascript');
    expect(jsMeta.color).toBe('#FFE600');

    const tsMeta = getLanguageMeta('typescript');
    expect(tsMeta.monacoLanguage).toBe('typescript');

    const pyMeta = getLanguageMeta('python');
    expect(pyMeta.monacoLanguage).toBe('python');
  });
});
