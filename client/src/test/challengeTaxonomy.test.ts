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
  it('defines all supported languages including javascript, typescript, python, rust, go, cpp, java, and sql', () => {
    const languages = getAllLanguages();
    expect(languages).toContain('javascript');
    expect(languages).toContain('typescript');
    expect(languages).toContain('python');
    expect(languages).toContain('rust');
    expect(languages).toContain('go');
    expect(languages).toContain('cpp');
    expect(languages).toContain('java');
    expect(languages).toContain('sql');
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

  it('picks a random topic conforming to constraints', () => {
    const randomAny = getRandomTopic();
    expect(randomAny).toBeDefined();
    expect(randomAny.id).toBeTruthy();

    const randomJs = getRandomTopic('javascript');
    expect(randomJs.language).toBe('javascript');

    const randomHard = getRandomTopic(undefined, 'hard');
    expect(randomHard.difficulty).toBe('hard');
  });

  it('fetches metadata for each supported language', () => {
    const jsMeta = getLanguageMeta('javascript');
    expect(jsMeta.id).toBe('javascript');
    expect(jsMeta.monacoLanguage).toBe('javascript');

    const tsMeta = getLanguageMeta('typescript');
    expect(tsMeta.id).toBe('typescript');
    expect(tsMeta.monacoLanguage).toBe('typescript');

    const pyMeta = getLanguageMeta('python');
    expect(pyMeta.id).toBe('python');
    expect(pyMeta.monacoLanguage).toBe('python');
  });

  it('includes Data Structures & Algorithms (DSA) topics across languages', () => {
    const jsTopics = getTopicsByLanguage('javascript');
    const dsaTopics = jsTopics.filter((t) => t.category === 'dsa');
    expect(dsaTopics.length).toBeGreaterThanOrEqual(3);

    const binarySearchTopic = getTopicById('js-dsa-binary-search');
    expect(binarySearchTopic).toBeDefined();
    expect(binarySearchTopic?.category).toBe('dsa');
    expect(binarySearchTopic?.tags).toContain('dsa');
  });
});
