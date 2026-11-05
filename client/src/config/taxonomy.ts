/**
 * @file taxonomy.ts
 * @description Dynamic taxonomy config for BugBounty Arena.
 * Expands supported languages to core stacks and provides comprehensive DSA and Practical topic matrices.
 */

export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node)', monacoId: 'javascript' },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
  { id: 'python', label: 'Python 3', monacoId: 'python' },
  { id: 'cpp', label: 'C++ (Clang)', monacoId: 'cpp' },
  { id: 'c', label: 'C (GCC)', monacoId: 'c' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'go', label: 'Go', monacoId: 'go' },
  { id: 'rust', label: 'Rust', monacoId: 'rust' },
  { id: 'sql', label: 'SQL (PostgreSQL)', monacoId: 'sql' },
] as const;

export type SupportedLanguageId = (typeof SUPPORTED_LANGUAGES)[number]['id'];

export const DSA_TOPICS_BY_LANGUAGE: Record<string, string[]> = {
  cpp: [
    "Arrays, Vectors & Pointer Arithmetic",
    "String Manipulation & C-Strings",
    "Two Pointers & Sliding Window",
    "Linked Lists & Memory Management",
    "Stack, Queue & Monotonic Structures",
    "Trees, BST & DFS/BFS Traversals",
    "Heaps & Priority Queues (std::priority_queue)",
    "Graphs: Adjacency Lists, Dijkstra & Bellman-Ford",
    "Dynamic Programming: 1D & 2D Memoization/Tabulation",
    "Backtracking & Bit Manipulation",
    "Divide and Conquer & Binary Search Variations",
    "Custom Comparators & STL Algorithm Edge Cases"
  ],
  c: [
    "Pointer Indirection & Memory Allocation (malloc/free)",
    "Array Bounds & Buffer Overflow Vulnerabilities",
    "Singly/Doubly Linked Lists",
    "Stack and Queue Implementations with Structs",
    "Recursion & Stack Frame Limits",
    "Binary Search & In-Place Sorting",
    "Bitwise Operations & Masking",
    "Graph Representation via Matrix/Pointers"
  ],
  python: [
    "List Slicing, Arrays & Dictionary Hash Collisions",
    "Two Pointers & Sliding Window",
    "Linked Lists & Fast/Slow Pointer Cycles",
    "Recursion Depth & Backtracking",
    "Binary Trees, Traversal & Tree Inversion",
    "Heapq & Priority Queue Management",
    "Graph Traversal (BFS, DFS, Topological Sort)",
    "Dynamic Programming & LRU Cache Memoization",
    "Binary Search & Interval Partitioning",
    "Bit Manipulation & Generator Edge Cases"
  ],
  javascript: [
    "Array Methods (map/reduce/filter) & Off-by-One Indices",
    "Object Hashing & Key Coercion in Lookup Tables",
    "Two Pointers & String Sliding Window",
    "Linked Lists with ES6 Classes",
    "Call Stack Overflow in Deep Recursion",
    "Binary Trees & Level-Order BFS",
    "Graphs & Adjacency Map Traversals",
    "Dynamic Programming with 2D Arrays",
    "Sorting Algorithms & Custom Array.prototype.sort",
    "Bitwise Tricks & Fast Bit Checking"
  ],
  typescript: [
    "Generic Array & Tuple State Transformations",
    "Two Pointers & In-Place Array Manipulations",
    "Linked Lists with Strict Nullable Pointer Checks",
    "Trees, BST & Readonly Node Trees",
    "Trie Implementations with Index Signatures",
    "Graphs & Strongly Connected Components",
    "Dynamic Programming with Recursive Discriminated Unions",
    "Binary Search with Exact Type Narrowing",
    "Priority Queues with Custom Type Comparators"
  ],
  java: [
    "Arrays & ArrayList Indexing Edge Cases",
    "Two Pointers & Sliding Window",
    "LinkedList & Node Pointer NullPointerExceptions",
    "Stack, Deque & ArrayDeque Operations",
    "Binary Trees, BST & Recursive Traversal",
    "PriorityQueue & Comparable/Comparator Bugs",
    "Graphs: Dijkstra, BFS/DFS & Cycle Detection",
    "Dynamic Programming: Knapsack & Grid Paths",
    "Backtracking (Subsets, Permutations, N-Queens)",
    "Bit Manipulation & Math Edge Cases"
  ],
  sql: [
    "Window Functions (ROW_NUMBER, RANK, DENSE_RANK)",
    "Recursive Common Table Expressions (CTEs)",
    "Correlated Subqueries & NULL Handling Edge Cases",
    "Complex Multi-Way INNER vs. LEFT OUTER JOINs",
    "GROUP BY, HAVING & Aggregation Filter Traps",
    "Self-Joins for Hierarchical & Tree Data",
    "PIVOT, UNPIVOT & Conditional CASE Statements",
    "Query Optimization & Index-Aware Filtering"
  ],
  go: [
    "Slices, Arrays & Memory Leak Pitfalls",
    "Goroutines, Channels & Deadlocks in Algorithms",
    "Hash Maps & Non-Deterministic Iteration",
    "Linked Lists, Queues & Custom Ring Buffers",
    "Binary Search & Sort Package Custom Slices",
    "Binary Trees & Recursive Tree Walks",
    "Heaps with container/heap Interface",
    "Dynamic Programming & Matrix Memoization"
  ],
  rust: [
    "Vec, Slices & Borrow Checker Boundary Invariants",
    "String vs &str UTF-8 Indexing Edge Cases",
    "Two Pointers with Split-At-Mut",
    "Linked Lists with Box, Rc & RefCell",
    "Binary Trees with Option<Box<Node>>",
    "BinaryHeap & Ord / PartialOrd Trait Bugs",
    "Graph Representation with Adjacency Vectors & Indices",
    "Dynamic Programming & Iterative Vector Tables"
  ]
};

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
