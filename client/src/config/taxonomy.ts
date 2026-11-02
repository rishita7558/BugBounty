/**
 * @file taxonomy.ts
 * @description Dynamic taxonomy config for BugBounty Arena.
 * Expands supported languages to 8 core stacks and categorizes topics under DSA and Practical.
 */

export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node)', monacoId: 'javascript' },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
  { id: 'python', label: 'Python 3', monacoId: 'python' },
  { id: 'cpp', label: 'C++ (Clang)', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'go', label: 'Go', monacoId: 'go' },
  { id: 'rust', label: 'Rust', monacoId: 'rust' },
  { id: 'sql', label: 'SQL (PostgreSQL)', monacoId: 'sql' },
] as const;

export type SupportedLanguageId = (typeof SUPPORTED_LANGUAGES)[number]['id'];

export const TOPICS_BY_CATEGORY = {
  dsa: [
    { id: 'arrays-strings', label: 'Arrays & Strings' },
    { id: 'linked-lists', label: 'Linked Lists' },
    { id: 'trees-graphs', label: 'Trees & Graphs' },
    { id: 'dp', label: 'Dynamic Programming' },
    { id: 'binary-search', label: 'Binary Search & Two Pointers' },
    { id: 'sorting-greedy', label: 'Sorting & Greedy' },
  ],
  practical: [
    { id: 'concurrency', label: 'Concurrency & Race Conditions' },
    { id: 'async-event-loop', label: 'Async / Promises / Event Loop' },
    { id: 'api-parsing', label: 'JSON Parsing & Data Validation' },
    { id: 'memory-leaks', label: 'Memory Leaks & Resource Cleanup' },
    { id: 'sql-injection', label: 'SQL Injection & Query Hygiene' },
    { id: 'state-mutation', label: 'State Mutation & Idempotency' },
  ],
} as const;

export type ChallengeCategoryKey = keyof typeof TOPICS_BY_CATEGORY;

export type DifficultyTier = 'NOVICE' | 'VETERAN' | 'CYBER_PUNK';

export interface ChallengeConfigSelection {
  mode: ChallengeCategoryKey;
  language: SupportedLanguageId;
  topic: string;
  difficulty: DifficultyTier;
}

