/**
 * @file challengeTaxonomy.ts
 * @description Comprehensive language and vulnerability domain taxonomy for CodeDuel: BugBounty Arena.
 * Organizes code debugging challenges across JavaScript, TypeScript, and Python with metadata,
 * common bug archetypes, difficulty tiers, and Monaco editor mappings.
 */

export type SupportedLanguage = 'javascript' | 'typescript' | 'python';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Definition of a targeted challenge topic within the vulnerability taxonomy.
 */
export interface ChallengeTopic {
  /** Unique topic slug identifier. */
  id: string;
  /** Human-readable display title. */
  name: string;
  /** Primary programming language domain. */
  language: SupportedLanguage;
  /** Default or target difficulty rating. */
  difficulty: ChallengeDifficulty;
  /** High-level category grouping (e.g., 'async', 'logic', 'security', 'types'). */
  category: 'async' | 'logic' | 'security' | 'types' | 'memory' | 'syntax';
  /** Concise pedagogical description of what this topic tests. */
  description: string;
  /** Visual theme icon identifier or badge token. */
  badge: string;
  /** Search and filtering tags. */
  tags: string[];
  /** Representative real-world bug archetypes included under this topic. */
  commonBugs: string[];
}

/**
 * Metadata configuration for supported programming languages.
 */
export interface LanguageMeta {
  id: SupportedLanguage;
  label: string;
  badgeLabel: string;
  monacoLanguage: string;
  version: string;
  color: string;
  borderColor: string;
  iconName: string;
  description: string;
}

export const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMeta> = {
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    badgeLabel: 'JS // ES2024',
    monacoLanguage: 'javascript',
    version: 'ES2024 / Node 20',
    color: '#FFE600',
    borderColor: '#FFE600',
    iconName: 'FileCode',
    description: 'Modern asynchronous runtime, prototype mechanics, closures, and dynamic type quirks.',
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    badgeLabel: 'TS // v5.x STRICT',
    monacoLanguage: 'typescript',
    version: 'v5.4 Strict',
    color: '#00E5FF',
    borderColor: '#00E5FF',
    iconName: 'Shield',
    description: 'Compile-time type narrowing, generic constraints, discriminated unions, and soundness traps.',
  },
  python: {
    id: 'python',
    label: 'Python',
    badgeLabel: 'PY // 3.12',
    monacoLanguage: 'python',
    version: 'v3.12 CPython',
    color: '#00FFA3',
    borderColor: '#00FFA3',
    iconName: 'Terminal',
    description: 'LEGB scoping, mutable defaults, generator exhaustion, GIL constraints, and asyncio in Python 3.',
  },
};

/**
 * Complete catalog of challenge topics indexed by language.
 */
export const CHALLENGE_TAXONOMY: Record<SupportedLanguage, ChallengeTopic[]> = {
  javascript: [
    {
      id: 'js-async-event-loop',
      name: 'Event Loop & Promises',
      language: 'javascript',
      difficulty: 'medium',
      category: 'async',
      description: 'Microtask vs macrotask execution order, unhandled promise rejections, and async/await starvation.',
      badge: 'ASYNC',
      tags: ['promises', 'async-await', 'event-loop', 'microtasks'],
      commonBugs: [
        'Missing await in critical validation flows',
        'Unhandled promise rejections inside forEach callbacks',
        'Race conditions between microtasks and setTimeout macrotasks',
      ],
    },
    {
      id: 'js-closures-scope',
      name: 'Closures & Lexical Scope',
      language: 'javascript',
      difficulty: 'easy',
      category: 'logic',
      description: 'Var hoisting traps, accidental global leakage, stale closure captures, and shadowing bugs.',
      badge: 'SCOPE',
      tags: ['closures', 'scope', 'hoisting', 'variables'],
      commonBugs: [
        'Loop counter variable capture with var instead of let',
        'Shadowing outer configuration variables inside nested functions',
        'Stale closure holding obsolete state values across renders/invocations',
      ],
    },
    {
      id: 'js-prototype-pollution',
      name: 'Prototypes & Object Mutation',
      language: 'javascript',
      difficulty: 'hard',
      category: 'security',
      description: 'Deep merge object manipulation, prototype inheritance chaining, and unexpected property overwrites.',
      badge: 'PROTO',
      tags: ['prototype', 'objects', 'security', 'inheritance'],
      commonBugs: [
        'Unsanitized __proto__ or constructor modification in recursive deep merge',
        'Altering Object.prototype causing false truthy checks throughout runtime',
        'Accidental property deletion on shared prototype instances',
      ],
    },
    {
      id: 'js-type-coercion',
      name: 'Type Coercion & Truthiness',
      language: 'javascript',
      difficulty: 'easy',
      category: 'logic',
      description: 'Implicit type coercion, loose equality (==) edge cases, NaN comparisons, and falsy traps.',
      badge: 'TYPES',
      tags: ['coercion', 'equality', 'falsy', 'truthiness'],
      commonBugs: [
        'Using == with 0, empty string, or null leading to bypasses',
        'Treating NaN === NaN as true instead of Number.isNaN()',
        'Accidental string concatenation when performing math operations',
      ],
    },
    {
      id: 'js-array-algorithms',
      name: 'Array Mutations & Slicing',
      language: 'javascript',
      difficulty: 'medium',
      category: 'logic',
      description: 'In-place sorting gotchas, splice vs slice index drift, and filter/reduce mutation anti-patterns.',
      badge: 'ARRAYS',
      tags: ['arrays', 'mutation', 'algorithms', 'iteration'],
      commonBugs: [
        'Default Array.prototype.sort() converting numbers to lexicographical strings',
        'Mutating original array during iteration causing skipped elements',
        'Off-by-one errors in splice start index and deleteCount',
      ],
    },
    {
      id: 'js-dom-memory',
      name: 'DOM Leaks & Event Handlers',
      language: 'javascript',
      difficulty: 'medium',
      category: 'memory',
      description: 'Dangling event listeners, circular DOM references, and detached subtree memory leaks.',
      badge: 'DOM',
      tags: ['dom', 'memory-leaks', 'events', 'cleanup'],
      commonBugs: [
        'Forgetting removeEventListener with anonymous function references',
        'Holding references to detached DOM elements in persistent caches',
        'Event bubbling triggers on unintended parent elements',
      ],
    },
  ],

  typescript: [
    {
      id: 'ts-type-narrowing',
      name: 'Type Narrowing & Discriminated Unions',
      language: 'typescript',
      difficulty: 'medium',
      category: 'types',
      description: 'Exhaustiveness checking, in operator narrowing, custom type guards, and union tag collisions.',
      badge: 'UNIONS',
      tags: ['narrowing', 'discriminated-unions', 'type-guards'],
      commonBugs: [
        'Incomplete switch exhaustiveness missing newly added union variants',
        'Incorrect type predicate in custom isType guard leading to runtime crashes',
        'Type assertion (as) masking missing required properties',
      ],
    },
    {
      id: 'ts-generics-constraints',
      name: 'Generic Constraints & Inference',
      language: 'typescript',
      difficulty: 'hard',
      category: 'types',
      description: 'Higher-order generics, extends keyof constraints, conditional return types, and variance.',
      badge: 'GENERICS',
      tags: ['generics', 'constraints', 'inference', 'utility-types'],
      commonBugs: [
        'Overly broad generic type parameters losing argument literal types',
        'Misconfigured conditional type distributing over union unexpectedly',
        'Unconstrained generic causing property access errors',
      ],
    },
    {
      id: 'ts-any-unknown',
      name: 'Any vs Unknown Soundness',
      language: 'typescript',
      difficulty: 'easy',
      category: 'types',
      description: 'Eliminating any escapes, safe parsing of unknown API payloads, and type assertion hazards.',
      badge: 'SAFETY',
      tags: ['any', 'unknown', 'soundness', 'validation'],
      commonBugs: [
        'Casting external API response directly with as Type without validation',
        'Propagating any throughout utility chain disabling IntelliSense protection',
        'Bypassing private property access through as any casts',
      ],
    },
    {
      id: 'ts-strict-null',
      name: 'Strict Null & Optional Invariants',
      language: 'typescript',
      difficulty: 'easy',
      category: 'logic',
      description: 'Non-null assertion operator (!) pitfalls, optional chaining, and nullish coalescing invariants.',
      badge: 'NULL',
      tags: ['strict-null', 'optional-chaining', 'assertions'],
      commonBugs: [
        'Over-confident non-null assertion (!) on uninitialized object fields',
        'Confusing logical OR (||) with nullish coalescing (??) on 0 or empty string',
        'Optional method calls silently failing without notifying the caller',
      ],
    },
    {
      id: 'ts-enums-const',
      name: 'Const Assertions & Enums',
      language: 'typescript',
      difficulty: 'medium',
      category: 'types',
      description: 'Numeric enum reverse mapping bugs, as const object immutability, and string literal unions.',
      badge: 'CONST',
      tags: ['enums', 'as-const', 'literal-types'],
      commonBugs: [
        'Numeric enum passing arbitrary out-of-range integer values',
        'Missing as const on configuration dictionary widening keys to string',
        'Comparing enum values across distinct enum definitions',
      ],
    },
  ],

  python: [
    {
      id: 'py-mutable-defaults',
      name: 'Mutable Default Arguments',
      language: 'python',
      difficulty: 'easy',
      category: 'logic',
      description: 'Def binding time of default parameters, shared list/dict accumulator bugs across calls.',
      badge: 'DEFAULTS',
      tags: ['functions', 'mutable-defaults', 'arguments', 'references'],
      commonBugs: [
        'def add_item(item, basket=[]) accumulating state across every caller',
        'Default dictionary modified in-place altering future invocations',
        'Failure to initialize with None and basket = [] inside function body',
      ],
    },
    {
      id: 'py-scope-legb',
      name: 'LEGB Variable Scope & Nonlocal',
      language: 'python',
      difficulty: 'medium',
      category: 'logic',
      description: 'Local, Enclosing, Global, Built-in scope resolution, UnboundLocalError, and global collisions.',
      badge: 'LEGB',
      tags: ['scope', 'legb', 'closures', 'nonlocal', 'global'],
      commonBugs: [
        'UnboundLocalError when referencing variable before local assignment',
        'Modifying enclosing scope counter without nonlocal keyword',
        'Accidental shadowing of built-in functions like list, min, max, id',
      ],
    },
    {
      id: 'py-generator-exhaustion',
      name: 'Generators & Iteration Traps',
      language: 'python',
      difficulty: 'medium',
      category: 'logic',
      description: 'Single-use iterator exhaustion, lazy comprehension side-effects, and zip truncation.',
      badge: 'ITERS',
      tags: ['generators', 'iterators', 'comprehensions', 'itertools'],
      commonBugs: [
        'Iterating over a generator object a second time yielding empty results',
        'Modifying collection while iterating through it causing skipped items',
        'Silent truncation of differing sequence lengths in standard zip()',
      ],
    },
    {
      id: 'py-asyncio-gil',
      name: 'Asyncio Coroutines & Blocking',
      language: 'python',
      difficulty: 'hard',
      category: 'async',
      description: 'Synchronous blocking calls inside async def, unawaited coroutines, and task exception loss.',
      badge: 'ASYNCIO',
      tags: ['asyncio', 'coroutines', 'concurrency', 'tasks'],
      commonBugs: [
        'Calling time.sleep() or synchronous requests inside asyncio event loop',
        'Calling coroutine without await returning coroutine object instead of result',
        'Unhandled task exceptions silenced without asyncio.gather return_exceptions',
      ],
    },
    {
      id: 'py-exception-traps',
      name: 'Exception Masking & Contexts',
      language: 'python',
      difficulty: 'easy',
      category: 'logic',
      description: 'Bare except clauses catching KeyboardInterrupt/SystemExit, reraising from None, and context managers.',
      badge: 'EXCEPT',
      tags: ['exceptions', 'try-except', 'context-managers'],
      commonBugs: [
        'Bare except: catching and masking system exits and memory errors',
        'Catching Exception but silently passing, hiding critical syntax/type faults',
        'Exception chaining losing original traceback context with wrong raise syntax',
      ],
    },
    {
      id: 'py-memory-references',
      name: 'Shallow Copies & Object References',
      language: 'python',
      difficulty: 'medium',
      category: 'memory',
      description: 'is vs == identity comparison, nested list multiplication ([[0]*3]*3), and shallow copy mutations.',
      badge: 'REFS',
      tags: ['references', 'copy', 'mutability', 'identity'],
      commonBugs: [
        'Matrix initialization matrix = [[0] * 3] * 3 duplicating rows as identical references',
        'Using is for integer/string comparison outside small integer cache',
        'Shallow copy.copy() modifying nested dictionaries in both copies',
      ],
    },
  ],
};

/**
 * Returns list of all supported programming languages.
 *
 * @returns Array of supported language identifiers.
 */
export function getAllLanguages(): SupportedLanguage[] {
  return ['javascript', 'typescript', 'python'];
}

/**
 * Retrieves all challenge topics defined for a given language.
 *
 * @param language Target language identifier.
 * @returns Array of challenge topics.
 */
export function getTopicsByLanguage(language: SupportedLanguage): ChallengeTopic[] {
  return CHALLENGE_TAXONOMY[language] || [];
}

/**
 * Looks up a challenge topic by its unique slug identifier across all languages.
 *
 * @param topicId Unique topic slug identifier.
 * @returns Matching topic definition or undefined if not found.
 */
export function getTopicById(topicId: string): ChallengeTopic | undefined {
  for (const lang of getAllLanguages()) {
    const found = CHALLENGE_TAXONOMY[lang].find((t) => t.id === topicId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Validates whether a topic ID exists in the taxonomy.
 *
 * @param topicId Topic identifier string to test.
 * @returns True if valid.
 */
export function isValidTopic(topicId: string): boolean {
  return getTopicById(topicId) !== undefined;
}

/**
 * Resolves the programming language associated with a topic.
 *
 * @param topicId Topic identifier.
 * @returns Language identifier or 'javascript' fallback.
 */
export function getLanguageForTopic(topicId: string): SupportedLanguage {
  const topic = getTopicById(topicId);
  return topic ? topic.language : 'javascript';
}

/**
 * Selects a random topic from the taxonomy, optionally filtered by language and difficulty.
 *
 * @param language Optional target language filter.
 * @param difficulty Optional target difficulty filter.
 * @returns Randomly selected challenge topic.
 */
export function getRandomTopic(
  language?: SupportedLanguage,
  difficulty?: ChallengeDifficulty
): ChallengeTopic {
  let pool: ChallengeTopic[] = [];

  if (language) {
    pool = [...getTopicsByLanguage(language)];
  } else {
    for (const lang of getAllLanguages()) {
      pool.push(...CHALLENGE_TAXONOMY[lang]);
    }
  }

  if (difficulty) {
    const filtered = pool.filter((t) => t.difficulty === difficulty);
    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Returns display and syntax configuration for a language.
 *
 * @param language Target language.
 * @returns Language metadata specification.
 */
export function getLanguageMeta(language: SupportedLanguage): LanguageMeta {
  return LANGUAGE_METADATA[language] || LANGUAGE_METADATA.javascript;
}
