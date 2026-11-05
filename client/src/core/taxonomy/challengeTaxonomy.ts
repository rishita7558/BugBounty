import { DSA_TOPICS_BY_LANGUAGE } from '@/config/taxonomy';
/**
 * @file challengeTaxonomy.ts
 * @description Comprehensive language and vulnerability domain taxonomy for BugBounty.
 * Organizes code debugging challenges across JavaScript, TypeScript, Python, Rust, Go, C++, Java, and SQL
 * with metadata, common bug archetypes, difficulty tiers, and Monaco editor mappings.
 */

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'rust'
  | 'go'
  | 'cpp'
  | 'java'
  | 'sql';

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
  /** High-level category grouping (e.g., 'dsa', 'async', 'logic', 'security', 'types', 'memory', 'syntax'). */
  category: 'async' | 'logic' | 'security' | 'types' | 'memory' | 'syntax' | 'dsa';
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
    badgeLabel: 'JS • ES2024',
    monacoLanguage: 'javascript',
    version: 'ES2024 / Node 20',
    color: '#00D9FF',
    borderColor: '#00D9FF',
    iconName: 'FileCode',
    description: 'Modern asynchronous runtime, prototype mechanics, closures, and dynamic type quirks.',
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    badgeLabel: 'TS • v5.x Strict',
    monacoLanguage: 'typescript',
    version: 'v5.4 Strict',
    color: '#65CFFF',
    borderColor: '#65CFFF',
    iconName: 'Shield',
    description: 'Compile-time type narrowing, generic constraints, discriminated unions, and soundness traps.',
  },
  python: {
    id: 'python',
    label: 'Python',
    badgeLabel: 'PY • 3.12',
    monacoLanguage: 'python',
    version: 'v3.12 CPython',
    color: '#287BFF',
    borderColor: '#287BFF',
    iconName: 'Terminal',
    description: 'LEGB scoping, mutable defaults, generator exhaustion, GIL constraints, and asyncio in Python 3.',
  },
  rust: {
    id: 'rust',
    label: 'Rust',
    badgeLabel: 'RUST • 2021',
    monacoLanguage: 'rust',
    version: 'Edition 2021',
    color: '#EAF8FF',
    borderColor: '#EAF8FF',
    iconName: 'Shield',
    description: 'Borrow checker invariants, lifetime annotations, thread safety, and unsafe memory boundaries.',
  },
  go: {
    id: 'go',
    label: 'Go',
    badgeLabel: 'GO • 1.22',
    monacoLanguage: 'go',
    version: 'v1.22',
    color: '#00D9FF',
    borderColor: '#00D9FF',
    iconName: 'Terminal',
    description: 'Goroutine leaks, channel deadlocks, nil interface traps, and slice memory reallocations.',
  },
  cpp: {
    id: 'cpp',
    label: 'C / C++',
    badgeLabel: 'C++ • C++20',
    monacoLanguage: 'cpp',
    version: 'C++20 / GCC',
    color: '#8199B5',
    borderColor: '#8199B5',
    iconName: 'Cpu',
    description: 'Stack buffer overflows, use-after-free, undefined behavior, and RAII pointer leaks.',
  },
  java: {
    id: 'java',
    label: 'Java',
    badgeLabel: 'JAVA • 21 LTS',
    monacoLanguage: 'java',
    version: 'JDK 21 LTS',
    color: '#B8D8EA',
    borderColor: '#B8D8EA',
    iconName: 'Layers',
    description: 'NullPointerException traps, synchronized thread deadlocks, static memory leaks, and serialization flaws.',
  },
  sql: {
    id: 'sql',
    label: 'SQL',
    badgeLabel: 'SQL • ANSI',
    monacoLanguage: 'sql',
    version: 'PostgreSQL / ANSI',
    color: '#65CFFF',
    borderColor: '#65CFFF',
    iconName: 'Database',
    description: 'SQL injection vectors, three-valued NULL logic, accidental cross joins, and transaction deadlocks.',
  },
};

/**
 * Complete catalog of challenge topics indexed by language.
 */
const BASE_TAXONOMY: Record<SupportedLanguage, ChallengeTopic[]> = {
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
        'Stale closure holding obsolete state values across invocations',
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
      id: 'js-dsa-binary-search',
      name: 'DSA: Binary Search & Divide-Conquer',
      language: 'javascript',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Boundary condition invariants (low <= high), integer midpoint calculation, and search range partitioning.',
      badge: 'DSA-BS',
      tags: ['dsa', 'binary-search', 'algorithms', 'divide-conquer'],
      commonBugs: [
        'Terminating while (low < high) prematurely skipping boundary element',
        'Setting low = mid instead of mid + 1 causing infinite loop',
        'Off-by-one errors in array length bounds',
      ],
    },
    {
      id: 'js-dsa-sliding-window',
      name: 'DSA: Sliding Window & Two Pointers',
      language: 'javascript',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Dynamic window expansion/contraction, substring uniqueness sets, and contiguous subarray calculations.',
      badge: 'DSA-WIN',
      tags: ['dsa', 'sliding-window', 'two-pointers', 'substrings'],
      commonBugs: [
        'Calculating window length as right - left instead of right - left + 1',
        'Failing to contract left pointer when duplicate characters are encountered',
        'Re-using stale character indices when updating window borders',
      ],
    },
    {
      id: 'js-dsa-trees-bst',
      name: 'DSA: Binary Search Trees & Traversal',
      language: 'javascript',
      difficulty: 'hard',
      category: 'dsa',
      description: 'BST property validation, lowest common ancestor, tree serialization, and in-order traversal states.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'bst', 'recursion', 'dfs'],
      commonBugs: [
        'Checking BST validity only against immediate parent rather than global min/max range',
        'Infinite recursion in tree traversals due to unhandled null child nodes',
        'Incorrect return values in node lookup base cases',
      ],
    },
    {
      id: 'js-dsa-dynamic-programming',
      name: 'DSA: Dynamic Programming & Memoization',
      language: 'javascript',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Subproblem overlapping caching, base case initialization, 1D/2D state transitions, and knapsack variants.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'memoization', 'optimization'],
      commonBugs: [
        'Omitting dp[0] or dp[1] base cases leading to all zero or NaN results',
        'State overwrite ordering in bottom-up 1D space optimizations',
        'Off-by-one index mismatch between target amount and table length',
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
      id: 'ts-strict-null',
      name: 'Strict Null Checking & Optional Chaining',
      language: 'typescript',
      difficulty: 'easy',
      category: 'logic',
      description: 'Non-null assertion (!) operator dangers, nullish coalescing (??) vs OR (||) evaluation.',
      badge: 'STRICT',
      tags: ['strict-null', 'optional-chaining', 'assertions'],
      commonBugs: [
        'Non-null assertion operator (!) silencing real runtime null scenarios',
        'Using || instead of ?? discarding valid 0 or empty string values',
        'Incomplete optional chaining on deeply nested API payloads',
      ],
    },
    {
      id: 'ts-generics-constraints',
      name: 'Generics & Type Constraints',
      language: 'typescript',
      difficulty: 'hard',
      category: 'types',
      description: 'Keyof lookup types, generic constraint bounds (extends), conditional type distribution.',
      badge: 'GENERICS',
      tags: ['generics', 'constraints', 'keyof', 'conditional-types'],
      commonBugs: [
        'Over-broad generic type parameter inferring any or unknown',
        'Unconstrained generic property access causing compiler/runtime errors',
        'Unexpected union distribution in distributive conditional types',
      ],
    },
    {
      id: 'ts-utility-types',
      name: 'Utility Types & Immutability',
      language: 'typescript',
      difficulty: 'medium',
      category: 'types',
      description: 'Readonly, Record, Pick, Omit gotchas and shallow immutability vs deep freezing.',
      badge: 'UTILITY',
      tags: ['readonly', 'record', 'pick-omit', 'immutability'],
      commonBugs: [
        'Assuming Readonly<T> deeply freezes nested object properties',
        'Omit removing expected properties when combined with generic intersections',
        'Record types with string keys allowing undefined lookups unsafely',
      ],
    },
    {
      id: 'ts-dsa-binary-search',
      name: 'DSA: Generic Binary Search & Bounds',
      language: 'typescript',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Generic comparator arrays, integer midpoint overflow, and lower/upper bound index calculations.',
      badge: 'DSA-BIN',
      tags: ['dsa', 'binary-search', 'generics', 'algorithms'],
      commonBugs: [
        'Midpoint calculation (left + right) / 2 resulting in floating point numbers in JS/TS',
        'Comparing elements with < on generic items without custom comparator callback',
        'Off-by-one boundary failure returning index after target insertion point',
      ],
    },
    {
      id: 'ts-dsa-trees-graphs',
      name: 'DSA: Trees & Graph Depth Traversal',
      language: 'typescript',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Recursive BST search, tree depth calculation, and cycle detection in adjacency lists.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'graphs', 'recursion'],
      commonBugs: [
        'Failing to record visited node references leading to infinite cycle recursion',
        'Reading left/right properties on null without strict optional chaining',
        'Missing base case for leaf nodes returning undefined instead of height 0',
      ],
    },
    {
      id: 'ts-dsa-dynamic-programming',
      name: 'DSA: Memoized DP & Recurrence Relations',
      language: 'typescript',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Top-down memoization Maps, state serialization, and multidimensional recurrence grids.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'memoization', 'algorithms'],
      commonBugs: [
        'Map key string serialization joining indices causing collision (e.g. "1" + "23" vs "12" + "3")',
        'Not checking memo.has() before performing exponential recursion calls',
        'Modifying shared memo table between distinct invocation runs',
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
      description: 'Function definition time evaluation, shared list/dict accumulator state between callers.',
      badge: 'MUTABLE',
      tags: ['functions', 'defaults', 'mutation', 'parameters'],
      commonBugs: [
        'def add_item(item, list=[]) retaining state across distinct function calls',
        'Dict default parameter modified in place causing cross-user data leakage',
        'Failing to use None sentinel with conditional initialization',
      ],
    },
    {
      id: 'py-scope-legb',
      name: 'LEGB Variable Scoping',
      language: 'python',
      difficulty: 'easy',
      category: 'logic',
      description: 'Local, Enclosing, Global, Built-in resolution order, UnboundLocalError traps, and global keyword.',
      badge: 'SCOPE',
      tags: ['scope', 'legb', 'unbound-local', 'closures'],
      commonBugs: [
        'Modifying global counter without global keyword raising UnboundLocalError',
        'Rebinding built-in names (list, id, dict) causing subtle downstream crashes',
        'Late binding in closure loops returning final iteration values',
      ],
    },
    {
      id: 'py-generator-exhaustion',
      name: 'Generators & Iterators',
      language: 'python',
      difficulty: 'medium',
      category: 'logic',
      description: 'Single-pass iteration exhaustion, StopIteration gotchas, and generator expression traps.',
      badge: 'GEN',
      tags: ['generators', 'iterators', 'yield', 'exhaustion'],
      commonBugs: [
        'Reusing an exhausted generator in a second loop or aggregation call',
        'Calling len() or indexed lookup on a generator expression',
        'Unhandled StopIteration terminating generator pipelines unexpectedly',
      ],
    },
    {
      id: 'py-asyncio-gil',
      name: 'Asyncio & Concurrency',
      language: 'python',
      difficulty: 'hard',
      category: 'async',
      description: 'Blocking OS calls in event loop, task cancellation handling, and un-awaited coroutine warnings.',
      badge: 'ASYNCIO',
      tags: ['asyncio', 'tasks', 'event-loop', 'coroutines'],
      commonBugs: [
        'Calling time.sleep() instead of asyncio.sleep() freezing the event loop',
        'Creating coroutines without awaiting them',
        'Swallowing asyncio.CancelledError during cooperative cancellation',
      ],
    },
    {
      id: 'py-dsa-binary-search',
      name: 'DSA: Binary Search & Bisect',
      language: 'python',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Bisect search bounds, integer division midpoint calculations, and peak finding algorithms.',
      badge: 'DSA-BS',
      tags: ['dsa', 'binary-search', 'bisect', 'algorithms'],
      commonBugs: [
        'while low < high terminating before checking boundary element',
        'Integer division // 2 truncation edge cases',
        'Incorrect insertion index returned for missing elements',
      ],
    },
    {
      id: 'py-dsa-sliding-window',
      name: 'DSA: Sliding Window & Two Pointers',
      language: 'python',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Substring length bounds, hash map index tracking, and maximum subarray sums.',
      badge: 'DSA-WIN',
      tags: ['dsa', 'sliding-window', 'two-pointers', 'substrings'],
      commonBugs: [
        'Window length right - left off-by-one undercount',
        'Not advancing left pointer past previous character index in dictionary',
        'KeyError when querying uninitialized character frequencies',
      ],
    },
    {
      id: 'py-dsa-dynamic-programming',
      name: 'DSA: Dynamic Programming & Knapsack',
      language: 'python',
      difficulty: 'hard',
      category: 'dsa',
      description: '0/1 knapsack, coin change, longest common subsequence, and memoization decorator gotchas.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'knapsack', 'memoization'],
      commonBugs: [
        'Returning 0 instead of -1 when target sum is impossible',
        '1D DP array updating forward instead of backward for 0/1 knapsack',
        'Missing base case leading to maximum recursion depth exceeded',
      ],
    },
    {
      id: 'py-dsa-heapq',
      name: 'DSA: Heaps & Priority Queues',
      language: 'python',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Min-heap vs max-heap inversions with heapq, k-th largest element extraction, and heapify invariants.',
      badge: 'DSA-HEAP',
      tags: ['dsa', 'heaps', 'heapq', 'priority-queue'],
      commonBugs: [
        'Assuming heapq implements a max-heap instead of standard min-heap',
        'Pushing un-negated values when extracting kth largest values',
        'Index out of range when traversing 2*i + 1 child pointers manually',
      ],
    },
  ],

  rust: [
    {
      id: 'rust-borrow-lifetimes',
      name: 'Borrow Checker & Lifetimes',
      language: 'rust',
      difficulty: 'medium',
      category: 'memory',
      description: 'Move semantics, simultaneous mutable and immutable borrows, and lifetime duration bounds.',
      badge: 'BORROW',
      tags: ['borrow-checker', 'ownership', 'lifetimes', 'memory'],
      commonBugs: [
        'Reading from values that have transferred ownership via move',
        'Holding an immutable reference while attempting a mutable slice borrow',
        'Returning a reference to a stack-allocated local variable',
      ],
    },
    {
      id: 'rust-option-result-unwrap',
      name: 'Error Handling & Unwrap Panics',
      language: 'rust',
      difficulty: 'easy',
      category: 'types',
      description: 'Careless .unwrap() and .expect() calls triggering process panics on None or Err values.',
      badge: 'PANIC',
      tags: ['unwrap', 'option', 'result', 'error-handling'],
      commonBugs: [
        'Calling .unwrap() on None variant when key lookup fails',
        'Failing to propagate errors using the ? try operator',
        'Ignoring Err results from critical file/socket write operations',
      ],
    },
    {
      id: 'rust-concurrency-threads',
      name: 'Thread Safety & Mutex Locks',
      language: 'rust',
      difficulty: 'hard',
      category: 'async',
      description: 'Mutex deadlocks, poisoned locks, Arc sharing cycles, and channel receiver drops.',
      badge: 'THREADS',
      tags: ['concurrency', 'mutex', 'arc', 'threads'],
      commonBugs: [
        'Acquiring two Mutex locks in opposing order causing deadlocks',
        'Holding a MutexGuard across an await yield point in asynchronous tasks',
        'Dropping channel sender before worker threads consume all messages',
      ],
    },
    {
      id: 'rust-unsafe-bounds',
      name: 'Unsafe Pointer Boundaries',
      language: 'rust',
      difficulty: 'hard',
      category: 'security',
      description: 'Raw pointer dereferences, unaligned memory access, and violating Rust safety invariants.',
      badge: 'UNSAFE',
      tags: ['unsafe', 'pointers', 'memory-safety', 'aliasing'],
      commonBugs: [
        'Dereferencing null or dangling raw pointers inside unsafe blocks',
        'Violating aliasing rules by creating multiple mutable references to raw slices',
        'Unsound transmute between incompatible memory layouts',
      ],
    },
    {
      id: 'rust-dsa-binary-search',
      name: 'DSA: Binary Search & Slice Windows',
      language: 'rust',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Binary search on slice ranges, partition point math, and index usize casting overflow.',
      badge: 'DSA-BIN',
      tags: ['dsa', 'binary-search', 'slices', 'algorithms'],
      commonBugs: [
        'usize underflow when calculating mid - 1 when mid is 0',
        'Returning index on unsorted slice causing false negatives',
        'Slice range index out of bounds on empty array',
      ],
    },
    {
      id: 'rust-dsa-trees',
      name: 'DSA: Binary Trees & Rc/RefCell Box Nodes',
      language: 'rust',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Tree node ownership, Option<Box<Node>> traversals, and borrow state invariants.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'box', 'recursion'],
      commonBugs: [
        'AlreadyBorrowed panic when modifying parent and child nodes simultaneously with RefCell',
        'Stack overflow on unbalanced recursive tree depth drops',
        'Missing leaf check resulting in infinite descent',
      ],
    },
    {
      id: 'rust-dsa-dynamic-programming',
      name: 'DSA: Dynamic Programming & Vec Caching',
      language: 'rust',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Tabulation vectors, state indexing, and subproblem recurrence bounds in Rust.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'vec', 'algorithms'],
      commonBugs: [
        'Vec index out of bounds when initializing DP table with size n instead of n + 1',
        'Integer overflow when summing large cost values with u32/usize',
        'Failure to initialize base cases with sentinel max values',
      ],
    },
  ],

  go: [
    {
      id: 'go-nil-interface-traps',
      name: 'Nil Interface & Pointer Dereferences',
      language: 'go',
      difficulty: 'easy',
      category: 'types',
      description: 'A non-nil interface holding a nil concrete pointer evaluates to non-nil, causing panic.',
      badge: 'NIL',
      tags: ['nil', 'pointers', 'interfaces', 'panic'],
      commonBugs: [
        'Returning a typed nil pointer into an error interface',
        'Unchecked pointer dereference on optional struct fields',
        'Calling methods on nil struct pointer without internal receiver guard',
      ],
    },
    {
      id: 'go-goroutine-context-leaks',
      name: 'Goroutine Leaks & Context Lifecycle',
      language: 'go',
      difficulty: 'medium',
      category: 'async',
      description: 'Unbuffered channel sends blocking abandoned goroutines and missing context cancel calls.',
      badge: 'LEAKS',
      tags: ['goroutines', 'context', 'concurrency', 'leaks'],
      commonBugs: [
        'Sending on unbuffered channel with no active receiver leaking goroutines',
        'Forgetting to call defer cancel() on derived context.WithCancel',
        'Ignoring ctx.Done() in long-running worker loops',
      ],
    },
    {
      id: 'go-channel-deadlocks',
      name: 'Channel Synchronization & Deadlocks',
      language: 'go',
      difficulty: 'hard',
      category: 'async',
      description: 'Circular channel dependencies, closing already-closed channels, and select starvation.',
      badge: 'CHANNELS',
      tags: ['channels', 'deadlock', 'select', 'sync'],
      commonBugs: [
        'Panic from closing an already closed channel',
        'All goroutines asleep on channel reads producing fatal runtime deadlock',
        'Default branch in select spinning at 100% CPU starvation',
      ],
    },
    {
      id: 'go-slice-reallocation',
      name: 'Slice Allocation & Reslicing Drift',
      language: 'go',
      difficulty: 'medium',
      category: 'memory',
      description: 'Append reallocating underlying backing array, leading to silent lost mutations in sub-slices.',
      badge: 'SLICES',
      tags: ['slices', 'memory', 'append', 'arrays'],
      commonBugs: [
        'Passing slices by value expecting caller mutations after append reallocates',
        'Multiple sub-slices overwriting the same shared backing array memory',
        'Sub-slicing a huge array preventing garbage collection of unused memory',
      ],
    },
    {
      id: 'go-dsa-binary-search',
      name: 'DSA: Binary Search & Slice Pointers',
      language: 'go',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Binary search index math, sort.Search gotchas, and half-open slice bounds.',
      badge: 'DSA-BIN',
      tags: ['dsa', 'binary-search', 'slices', 'algorithms'],
      commonBugs: [
        'Integer overflow in (low + high) / 2 on large slice indices',
        'Using sort.Search with condition not partitioned over range',
        'Off-by-one error when high is len(arr) vs len(arr)-1',
      ],
    },
    {
      id: 'go-dsa-trees-graphs',
      name: 'DSA: Binary Trees & BFS/DFS Traversal',
      language: 'go',
      difficulty: 'medium',
      category: 'dsa',
      description: 'TreeNode structs, pointer nil checks, queue slices, and graph level-order traversal.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'bfs', 'recursion'],
      commonBugs: [
        'Nil pointer dereference when accessing node.Left without guard',
        'Queue slice append causing memory leak by retaining root references',
        'Missing cycle detection map in undirected graph DFS',
      ],
    },
    {
      id: 'go-dsa-dynamic-programming',
      name: 'DSA: Dynamic Programming & Matrix Memoization',
      language: 'go',
      difficulty: 'hard',
      category: 'dsa',
      description: '2D matrix slices, 1D space optimization, and state recurrence transitions.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'matrix', 'memoization'],
      commonBugs: [
        'Shallow copying 2D slice rows causing row mutations to pollute whole grid',
        'Wrong loop direction in space-optimized knapsack DP',
        'Index out of bounds on boundary coordinate lookups',
      ],
    },

  ],

  cpp: [
    {
      id: 'cpp-buffer-overflow',
      name: 'Buffer Overflow & Bounds Checking',
      language: 'cpp',
      difficulty: 'medium',
      category: 'security',
      description: 'Unchecked array indexing, off-by-one string manipulation, and stack frame overwrite attacks.',
      badge: 'OVERFLOW',
      tags: ['buffer-overflow', 'security', 'c-strings', 'bounds'],
      commonBugs: [
        'Using strcpy/sprintf without destination length boundaries',
        'Off-by-one error when indexing array or writing null terminator',
        'Integer overflow in allocation size leading to undersized buffer malloc',
      ],
    },
    {
      id: 'cpp-use-after-free',
      name: 'Use-After-Free & Dangling Pointers',
      language: 'cpp',
      difficulty: 'hard',
      category: 'memory',
      description: 'Accessing heap objects post delete/free, stale raw pointers, and double-free exceptions.',
      badge: 'UAF',
      tags: ['use-after-free', 'memory', 'pointers', 'heap'],
      commonBugs: [
        'Dereferencing a pointer after calling delete on its address',
        'Double free on shared resource without unique ownership semantics',
        'Returning reference to local variable destroyed at stack frame exit',
      ],
    },
    {
      id: 'cpp-raii-leaks',
      name: 'RAII Violations & Smart Pointer Leaks',
      language: 'cpp',
      difficulty: 'easy',
      category: 'memory',
      description: 'Circular std::shared_ptr references, manual resource management, and exception cleanup bypass.',
      badge: 'RAII',
      tags: ['raii', 'smart-pointers', 'memory-leaks', 'exceptions'],
      commonBugs: [
        'Circular shared_ptr references without std::weak_ptr preventing cleanup',
        'Raw resource allocation before exception throwing call causing resource leak',
        'Using delete[] instead of delete on scalar new pointers',
      ],
    },
    {
      id: 'cpp-undefined-behavior',
      name: 'Undefined Behavior & Type Slicing',
      language: 'cpp',
      difficulty: 'hard',
      category: 'logic',
      description: 'Signed integer overflow, reading uninitialized variables, and virtual method call slicing.',
      badge: 'UB',
      tags: ['undefined-behavior', 'virtual', 'casting', 'initialization'],
      commonBugs: [
        'Calling pure virtual methods from base class constructor',
        'Reading uninitialized primitive variables in member initialization lists',
        'Type slicing when passing polymorphic classes by value instead of reference',
      ],
    },
    {
      id: 'cpp-dsa-binary-search',
      name: 'DSA: Binary Search & Midpoint Overflow',
      language: 'cpp',
      difficulty: 'medium',
      category: 'dsa',
      description: '32-bit signed integer overflow in (low + high) / 2 and vector iterator indexing bounds.',
      badge: 'DSA-BS',
      tags: ['dsa', 'binary-search', 'overflow', 'vectors'],
      commonBugs: [
        'Integer overflow when adding low + high for large vectors',
        'Off-by-one errors in static_cast<int>(nums.size()) - 1 bounds',
        'Infinite loops when low and high converge',
      ],
    },
    {
      id: 'cpp-dsa-trees',
      name: 'DSA: Binary Trees & Pointer Traversal',
      language: 'cpp',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Binary search tree invariants, lowest common ancestor, and recursive pointer traversal.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'bst', 'pointers'],
      commonBugs: [
        'Dereferencing null left or right child pointers without checking',
        'BST boundary checks failing on global min/max subtrees',
        'Memory leaks when deleting nodes in recursive tree destructors',
      ],
    },
  ],

  java: [
    {
      id: 'java-equals-hashcode',
      name: 'Equals & HashCode Contract',
      language: 'java',
      difficulty: 'medium',
      category: 'logic',
      description: 'Inconsistent hash values breaking HashMap, HashSet lookups and collection equality.',
      badge: 'EQUALS',
      tags: ['equals', 'hashcode', 'collections', 'hashmap'],
      commonBugs: [
        'Overriding equals() without overriding hashCode() causing missing set elements',
        'Using mutable fields in hashCode() leading to unfindable HashMap entries',
        'Comparing object references with == instead of .equals()',
      ],
    },
    {
      id: 'java-npe-optionals',
      name: 'NullPointerException & Optional Flaws',
      language: 'java',
      difficulty: 'easy',
      category: 'types',
      description: 'Calling .get() directly on empty Optionals and auto-unboxing null wrapper objects.',
      badge: 'NPE',
      tags: ['npe', 'optional', 'null', 'unboxing'],
      commonBugs: [
        'Calling Optional.get() without isPresent() or using orElseThrow',
        'Auto-unboxing null Boolean/Integer to primitive boolean/int throwing NPE',
        'Null pointer dereference on unverified method parameter inputs',
      ],
    },
    {
      id: 'java-thread-synchronization',
      name: 'Concurrency & Deadlocks',
      language: 'java',
      difficulty: 'hard',
      category: 'async',
      description: 'Nested synchronized locks, lack of volatile visibility, and thread race conditions.',
      badge: 'SYNC',
      tags: ['concurrency', 'synchronized', 'deadlock', 'threads'],
      commonBugs: [
        'Nested synchronized blocks acquiring locks in differing order causing deadlocks',
        'Non-volatile shared boolean flag never seeing updates across threads',
        'Calling wait() outside of synchronized loop predicate',
      ],
    },
    {
      id: 'java-static-memory-leaks',
      name: 'Static Collection Memory Leaks',
      language: 'java',
      difficulty: 'medium',
      category: 'memory',
      description: 'Static Maps holding strong object references preventing garbage collection indefinitely.',
      badge: 'GC-LEAK',
      tags: ['memory-leak', 'static', 'garbage-collection', 'heap'],
      commonBugs: [
        'Static cache Map accumulating session objects without eviction or WeakReference',
        'ThreadLocal variables not cleaned up in thread pool worker threads',
        'Unclosed InputStream/OutputStream resources missing try-with-resources',
      ],
    },
    {
      id: 'java-dsa-binary-search',
      name: 'DSA: Binary Search & Index Math',
      language: 'java',
      difficulty: 'easy',
      category: 'dsa',
      description: 'Binary search, Arrays.binarySearch negative return values, and index calculation.',
      badge: 'DSA-BIN',
      tags: ['dsa', 'binary-search', 'arrays', 'algorithms'],
      commonBugs: [
        'Integer overflow in (low + high) / 2 without >>> 1 bitwise shift',
        'Misinterpreting Arrays.binarySearch return value when key is absent',
        'Infinite while (low <= high) loop when mid pointer is not adjusted',
      ],
    },
    {
      id: 'java-dsa-trees-graphs',
      name: 'DSA: Binary Trees & Level Order Traversal',
      language: 'java',
      difficulty: 'medium',
      category: 'dsa',
      description: 'TreeNode classes, Queue<TreeNode> LinkedList, recursion depth, and tree height.',
      badge: 'DSA-TREE',
      tags: ['dsa', 'trees', 'bfs', 'recursion'],
      commonBugs: [
        'NullPointerException when calling queue.poll() on empty queue or adding null children',
        'Failing to take queue.size() snapshot before for-loop in level-order traversal',
        'StackOverflowError on skewed degenerate binary trees',
      ],
    },
    {
      id: 'java-dsa-dynamic-programming',
      name: 'DSA: Dynamic Programming & Memoization',
      language: 'java',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Integer[][] memo arrays, bottom-up tabulation, and recurrence relations.',
      badge: 'DSA-DP',
      tags: ['dsa', 'dp', 'memoization', 'arrays'],
      commonBugs: [
        'Using primitive int[][] with 0 default value confusing valid 0 results with uncomputed state',
        'Incorrect array dimensions (n vs n + 1) causing ArrayIndexOutOfBoundsException',
        'Top-down recursion omitting memo check at method entrance',
      ],
    },

  ],

  sql: [
    {
      id: 'sql-three-valued-logic',
      name: 'Three-Valued NULL Logic',
      language: 'sql',
      difficulty: 'easy',
      category: 'logic',
      description: 'Comparing NULL with equality (=) instead of IS NULL, and NOT IN with subquery nulls.',
      badge: 'NULL',
      tags: ['null', 'logic', 'boolean', 'queries'],
      commonBugs: [
        'WHERE column = NULL returning zero rows instead of using IS NULL',
        'NOT IN (subquery) returning zero records when subquery contains a single NULL',
        'Aggregation functions ignoring NULLs leading to distorted averages',
      ],
    },
    {
      id: 'sql-injection-sanitization',
      name: 'SQL Injection & Parameterization',
      language: 'sql',
      difficulty: 'hard',
      category: 'security',
      description: 'String concatenation in dynamic SQL statements permitting auth bypass and data extraction.',
      badge: 'SQLI',
      tags: ['sqli', 'security', 'injection', 'parameterization'],
      commonBugs: [
        'Dynamic EXECUTE statement concatenating unsanitized user strings',
        'Second-order SQL injection from persisted unvalidated table columns',
        'Improper escaping in LIKE clause wildcard filters',
      ],
    },
    {
      id: 'sql-cartesian-join',
      name: 'Cartesian Product & Join Anomalies',
      language: 'sql',
      difficulty: 'medium',
      category: 'logic',
      description: 'Missing join predicate producing accidental CROSS JOIN explosions and inflated sums.',
      badge: 'JOINS',
      tags: ['joins', 'cross-join', 'cartesian', 'performance'],
      commonBugs: [
        'Omitted ON condition producing quadratic row Cartesian multiplication',
        'LEFT JOIN on right table condition in WHERE clause converting it to INNER JOIN',
        'SUM() across 1-to-many joined tables producing inflated duplicate totals',
      ],
    },
    {
      id: 'sql-transaction-locks',
      name: 'Transaction Locks & Isolation Levels',
      language: 'sql',
      difficulty: 'hard',
      category: 'async',
      description: 'Dirty reads, non-repeatable reads, phantom reads, and conflicting row lock escalation.',
      badge: 'LOCKS',
      tags: ['transactions', 'locks', 'deadlocks', 'acid'],
      commonBugs: [
        'Two concurrent transactions updating same rows in opposing sequence causing deadlocks',
        'Read Committed isolation permitting phantom rows in financial audits',
        'Long-running uncommitted transactions holding exclusive table locks',
      ],
    },
    {
      id: 'sql-dsa-recursive-cte',
      name: 'DSA: Recursive CTE Hierarchy & Graph Traversal',
      language: 'sql',
      difficulty: 'hard',
      category: 'dsa',
      description: 'Hierarchical employee/folder graphs, cycle detection prevention, and UNION vs UNION ALL recursion.',
      badge: 'DSA-CTE',
      tags: ['dsa', 'sql', 'cte', 'recursion', 'graphs'],
      commonBugs: [
        'Missing cycle check condition causing infinite loop in cyclic graph data',
        'Using UNION instead of UNION ALL causing deduplication performance degradation',
        'Incorrect anchor member join conditions truncating child leaves',
      ],
    },
    {
      id: 'sql-dsa-window-functions',
      name: 'DSA: Window Functions & Sliding Frame Bounds',
      language: 'sql',
      difficulty: 'medium',
      category: 'dsa',
      description: 'Running totals, sliding average frames (ROWS BETWEEN), and DENSE_RANK vs RANK ties.',
      badge: 'DSA-WIN',
      tags: ['dsa', 'sql', 'window-functions', 'sliding-window'],
      commonBugs: [
        'Default RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW treating duplicate timestamps identically',
        'RANK() skipping rank numbers instead of DENSE_RANK()',
        'Incorrect PARTITION BY column producing global aggregations instead of grouped metrics',
      ],
    },
  ],
};

export { DSA_TOPICS_BY_LANGUAGE };

function slugifyTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateDsaTopicsForLanguage(lang: SupportedLanguage): ChallengeTopic[] {
  const titles = DSA_TOPICS_BY_LANGUAGE[lang] || [];
  const diffs: ChallengeDifficulty[] = ['easy', 'medium', 'hard'];

  return titles.map((title, i) => ({
    id: `${lang}-dsa-${slugifyTopic(title)}`,
    name: title,
    language: lang,
    difficulty: diffs[i % diffs.length],
    category: 'dsa' as const,
    description: `Algorithmic analysis, boundary conditions, and invariant enforcement for ${title}.`,
    badge: 'DSA',
    tags: ['dsa', 'algorithm', lang, ...slugifyTopic(title).split('-').slice(0, 3)],
    commonBugs: [
      `Off-by-one boundary index in ${title}`,
      `Unchecked edge cases or pointer exceptions in ${title}`,
      `Inefficient time/space complexity under high-volume test vectors`,
    ],
  }));
}

function mergeWithDsa(baseTopics: ChallengeTopic[], dsaTopics: ChallengeTopic[]): ChallengeTopic[] {
  const map = new Map<string, ChallengeTopic>();
  for (const t of baseTopics) {
    map.set(t.id, t);
  }
  for (const t of dsaTopics) {
    if (!map.has(t.id)) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}

export const CHALLENGE_TAXONOMY: Record<SupportedLanguage, ChallengeTopic[]> = {
  javascript: mergeWithDsa(BASE_TAXONOMY.javascript || [], generateDsaTopicsForLanguage('javascript')),
  typescript: mergeWithDsa(BASE_TAXONOMY.typescript || [], generateDsaTopicsForLanguage('typescript')),
  python: mergeWithDsa(BASE_TAXONOMY.python || [], generateDsaTopicsForLanguage('python')),
  rust: mergeWithDsa(BASE_TAXONOMY.rust || [], generateDsaTopicsForLanguage('rust')),
  go: mergeWithDsa(BASE_TAXONOMY.go || [], generateDsaTopicsForLanguage('go')),
  cpp: mergeWithDsa(BASE_TAXONOMY.cpp || [], generateDsaTopicsForLanguage('cpp')),
  java: mergeWithDsa(BASE_TAXONOMY.java || [], generateDsaTopicsForLanguage('java')),
  sql: mergeWithDsa(BASE_TAXONOMY.sql || [], generateDsaTopicsForLanguage('sql')),
};

/**
 * Returns list of all supported programming languages.
 *
 * @returns Array of supported language identifiers.
 */
export function getAllLanguages(): SupportedLanguage[] {
  return [
    'javascript',
    'typescript',
    'python',
    'rust',
    'go',
    'cpp',
    'java',
    'sql',
  ];
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
    const found = CHALLENGE_TAXONOMY[lang]?.find((t) => t.id === topicId);
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

  if (language && CHALLENGE_TAXONOMY[language]) {
    pool = [...CHALLENGE_TAXONOMY[language]];
  } else {
    for (const lang of getAllLanguages()) {
      if (CHALLENGE_TAXONOMY[lang]) {
        pool.push(...CHALLENGE_TAXONOMY[lang]);
      }
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
