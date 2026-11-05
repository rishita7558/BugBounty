/**
 * @file curatedChallenges.ts
 * @description Production-grade vetted challenge seed catalog for BugBounty Arena.
 * Provides deterministic offline emergency fallback when external LLM endpoints experience
 * downtime, rate limits, or 503 service unavailability.
 *
 * Guarantees zero bug spoiler comments in brokenCode, at least 2 visible test cases,
 * and at least 1 hidden edge test case per challenge.
 */

export interface CuratedChallenge {
  id: string;
  title: string;
  mode: 'dsa' | 'practical';
  language: string;
  topic: string;
  difficulty: 'NOVICE' | 'VETERAN' | 'CYBER_PUNK';
  bugDescription: string;
  brokenCode: string;
  correctCode: string;
  hints: string[];
  testCases: Array<{
    input: string;
    expectedOutput: string;
    hidden?: boolean;
  }>;
  fingerprint: string;
  source: 'curated_fallback';
}

export const CURATED_CHALLENGES: CuratedChallenge[] = [
  // ── JAVASCRIPT ─────────────────────────────────────────────────────────────
  {
    id: 'curated-js-dsa-two-pointers',
    title: 'Two Sum Sorted Array Pointer Overlap',
    mode: 'dsa',
    language: 'javascript',
    topic: 'Two Pointers & Sliding Window',
    difficulty: 'NOVICE',
    bugDescription: 'Pointer adjustment incorrectly increments the left index on excessive sums instead of decrementing the right index, resulting in missed target pairs or infinite loops.',
    brokenCode: `function twoSumSorted(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) {
      return [left + 1, right + 1];
    } else if (sum < target) {
      left++;
    } else {
      left++;
    }
  }

  return [-1, -1];
}`,
    correctCode: `function twoSumSorted(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) {
      return [left + 1, right + 1];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [-1, -1];
}`,
    hints: [
      'Analyze how the pointers react when sum exceeds target value.',
      'In a sorted array, to decrease the sum, you must move the upper bound downward.',
      'Change left++ in the else branch to right--.',
    ],
    testCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[1, 2]' },
      { input: '[2, 3, 4], 6', expectedOutput: '[1, 3]' },
      { input: '[-1, 0], -1', expectedOutput: '[1, 2]', hidden: true },
      { input: '[1, 2, 3, 4, 4, 9, 12], 8', expectedOutput: '[4, 5]', hidden: true },
    ],
    fingerprint: 'curated_js_two_pointers_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-js-practical-event-loop',
    title: 'Deferred Microtask Queue Re-entrancy Hazard',
    mode: 'practical',
    language: 'javascript',
    topic: 'Async Event Loop & Microtask Concurrency',
    difficulty: 'VETERAN',
    bugDescription: 'Batch processing flag is cleared synchronously before awaiting queued item execution, allowing re-entrant tasks to race and duplicate processing passes.',
    brokenCode: `class AsyncBatchScheduler {
  constructor(handler) {
    this.queue = [];
    this.isProcessing = false;
    this.handler = handler;
  }

  enqueue(item) {
    this.queue.push(item);
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.drain();
    }
  }

  async drain() {
    this.isProcessing = false;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 3);
      await this.handler(batch);
    }
  }
}`,
    correctCode: `class AsyncBatchScheduler {
  constructor(handler) {
    this.queue = [];
    this.isProcessing = false;
    this.handler = handler;
  }

  enqueue(item) {
    this.queue.push(item);
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.drain();
    }
  }

  async drain() {
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, 3);
        await this.handler(batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}`,
    hints: [
      'Examine the lifecycle state of this.isProcessing inside drain().',
      'If isProcessing is set to false before the asynchronous while loop resolves, incoming calls during await will invoke duplicate drain passes.',
      'Move this.isProcessing = false to a finally block executed only after the while loop finishes.',
    ],
    testCases: [
      { input: 'scheduler.enqueue("a"); isProcessingActive()', expectedOutput: 'true' },
      { input: 'scheduler.drainComplete()', expectedOutput: 'true' },
      { input: 'concurrentEnqueueBurst(10)', expectedOutput: 'single_drain_pass', hidden: true },
    ],
    fingerprint: 'curated_js_event_loop_02',
    source: 'curated_fallback',
  },

  // ── TYPESCRIPT ─────────────────────────────────────────────────────────────
  {
    id: 'curated-ts-dsa-binary-search',
    title: 'Binary Search Midpoint Integer Overflow & Convergence',
    mode: 'dsa',
    language: 'typescript',
    topic: 'Binary Search with Exact Type Narrowing',
    difficulty: 'NOVICE',
    bugDescription: 'Midpoint calculation does not advance low pointer past mid on lower bound branch, leading to infinite loop when two adjacent elements are evaluated.',
    brokenCode: `function binarySearch(arr: number[], target: number): number {
  let low: number = 0;
  let high: number = arr.length - 1;

  while (low <= high) {
    const mid: number = Math.floor(low + (high - low) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}`,
    correctCode: `function binarySearch(arr: number[], target: number): number {
  let low: number = 0;
  let high: number = arr.length - 1;

  while (low <= high) {
    const mid: number = Math.floor(low + (high - low) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}`,
    hints: [
      'Look at the reassignment of low when arr[mid] < target.',
      'If low is set to mid rather than mid + 1, low will never increase when high - low === 1.',
      'Change low = mid to low = mid + 1.',
    ],
    testCases: [
      { input: '[1, 3, 5, 7, 9], 5', expectedOutput: '2' },
      { input: '[1, 3, 5, 7, 9], 1', expectedOutput: '0' },
      { input: '[1, 3, 5, 7, 9], 9', expectedOutput: '4', hidden: true },
      { input: '[2, 4], 4', expectedOutput: '1', hidden: true },
    ],
    fingerprint: 'curated_ts_binsearch_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-ts-practical-ttl-cache',
    title: 'Expiring Cache Eviction Timestamp Inversion',
    mode: 'practical',
    language: 'typescript',
    topic: 'Generic Array & Tuple State Transformations',
    difficulty: 'VETERAN',
    bugDescription: 'Cache TTL validation tests whether entry expiration time is greater than now rather than less, causing active entries to be discarded and expired entries retained.',
    brokenCode: `interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key: string, now: number = Date.now()): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt > now) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }
}`,
    correctCode: `interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key: string, now: number = Date.now()): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }
}`,
    hints: [
      'Examine the inequality comparison inside get() that controls eviction.',
      'An entry is expired when expiresAt <= now, not when expiresAt > now.',
      'Invert entry.expiresAt > now to entry.expiresAt <= now.',
    ],
    testCases: [
      { input: 'cache.set("k", 42, 1000); cache.get("k", Date.now() + 500)', expectedOutput: '42' },
      { input: 'cache.set("k", 42, 1000); cache.get("k", Date.now() + 1500)', expectedOutput: 'null' },
      { input: 'cache.get("missing", Date.now())', expectedOutput: 'null', hidden: true },
    ],
    fingerprint: 'curated_ts_cache_02',
    source: 'curated_fallback',
  },

  // ── PYTHON ─────────────────────────────────────────────────────────────────
  {
    id: 'curated-py-dsa-sliding-window',
    title: 'Sliding Window Subarray Product Monotonic Trap',
    mode: 'dsa',
    language: 'python',
    topic: 'Two Pointers & Sliding Window',
    difficulty: 'NOVICE',
    bugDescription: 'Window shrink condition divides running product by incoming right-hand element instead of leftmost element exiting the window.',
    brokenCode: `def num_subarray_product_less_than_k(nums, k):
    if k <= 1:
        return 0

    prod = 1
    left = 0
    total = 0

    for right, val in enumerate(nums):
        prod *= val
        while prod >= k and left <= right:
            prod //= nums[right]
            left += 1
        total += right - left + 1

    return total`,
    correctCode: `def num_subarray_product_less_than_k(nums, k):
    if k <= 1:
        return 0

    prod = 1
    left = 0
    total = 0

    for right, val in enumerate(nums):
        prod *= val
        while prod >= k and left <= right:
            prod //= nums[left]
            left += 1
        total += right - left + 1

    return total`,
    hints: [
      'Inspect the division operation inside the while loop.',
      'When advancing left, you must remove the contribution of nums[left], not nums[right].',
      'Change prod //= nums[right] to prod //= nums[left].',
    ],
    testCases: [
      { input: '[10, 5, 2, 6], 100', expectedOutput: '8' },
      { input: '[1, 2, 3], 0', expectedOutput: '0' },
      { input: '[1, 1, 1], 1', expectedOutput: '0', hidden: true },
      { input: '[10, 9, 10, 4, 3, 8, 3, 3, 6, 2, 10, 10, 9, 3], 19', expectedOutput: '18', hidden: true },
    ],
    fingerprint: 'curated_py_sliding_window_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-py-practical-memo-default',
    title: 'Mutable Default Argument State Leak Between Invocations',
    mode: 'practical',
    language: 'python',
    topic: 'List Slicing, Arrays & Dictionary Hash Collisions',
    difficulty: 'VETERAN',
    bugDescription: 'Function uses a mutable default dictionary accumulator which persists mutated entries across independent function calls across different users.',
    brokenCode: `def collect_user_events(event_id, payload, event_log={}):
    event_log[event_id] = payload
    return len(event_log)`,
    correctCode: `def collect_user_events(event_id, payload, event_log=None):
    if event_log is None:
        event_log = {}
    event_log[event_id] = payload
    return len(event_log)`,
    hints: [
      'In Python, default parameter expressions evaluate once at function definition time.',
      'event_log={} creates a shared singleton dictionary across all function invocations.',
      'Default event_log to None and instantiate a fresh dict inside the function body.',
    ],
    testCases: [
      { input: '"ev1", {"type": "login"}', expectedOutput: '1' },
      { input: '"ev2", {"type": "logout"}', expectedOutput: '1' },
      { input: '"ev3", {"type": "heartbeat"}, {"custom": True}', expectedOutput: '2', hidden: true },
    ],
    fingerprint: 'curated_py_memo_default_02',
    source: 'curated_fallback',
  },

  // ── C++ ────────────────────────────────────────────────────────────────────
  {
    id: 'curated-cpp-dsa-two-pointers',
    title: 'Two Pointers Vector Upper Boundary Decrement Fault',
    mode: 'dsa',
    language: 'cpp',
    topic: 'Two Pointers & Sliding Window',
    difficulty: 'NOVICE',
    bugDescription: 'Upper index iterator is incremented instead of decremented on target overage, resulting in vector memory boundary violations.',
    brokenCode: `#include <vector>

std::pair<int, int> findSortedPair(const std::vector<int>& arr, int target) {
    int left = 0;
    int right = static_cast<int>(arr.size()) - 1;

    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            return {left, right};
        } else if (sum < target) {
            left++;
        } else {
            right++;
        }
    }
    return {-1, -1};
}`,
    correctCode: `#include <vector>

std::pair<int, int> findSortedPair(const std::vector<int>& arr, int target) {
    int left = 0;
    int right = static_cast<int>(arr.size()) - 1;

    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            return {left, right};
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    return {-1, -1};
}`,
    hints: [
      'Trace pointer adjustments when sum > target.',
      'Increasing right when the sum is already too high causes out-of-bounds indexing.',
      'Replace right++ with right--.',
    ],
    testCases: [
      { input: '[1, 2, 4, 7, 11, 15], 15', expectedOutput: '[2, 4]' },
      { input: '[1, 2, 3], 99', expectedOutput: '[-1, -1]' },
      { input: '[-5, -2, 0, 3], -2', expectedOutput: '[0, 3]', hidden: true },
    ],
    fingerprint: 'curated_cpp_two_pointers_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-cpp-practical-raii',
    title: 'Vector Iterator Invalidation Under Dynamic Push',
    mode: 'practical',
    language: 'cpp',
    topic: 'Linked Lists & Memory Management',
    difficulty: 'VETERAN',
    bugDescription: 'Loop continues dereferencing raw iterator after push_back reallocation, causing dangling pointer access.',
    brokenCode: `#include <vector>

void duplicateEvens(std::vector<int>& vec) {
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it % 2 == 0) {
            vec.push_back(*it);
        }
    }
}`,
    correctCode: `#include <vector>

void duplicateEvens(std::vector<int>& vec) {
    size_t originalSize = vec.size();
    for (size_t i = 0; i < originalSize; ++i) {
        if (vec[i] % 2 == 0) {
            vec.push_back(vec[i]);
        }
    }
}`,
    hints: [
      'push_back may reallocate the vector backing buffer, invalidating all existing iterators.',
      'Dereferencing it after push_back invokes undefined behavior.',
      'Use index-based iteration constrained to the original vector size.',
    ],
    testCases: [
      { input: '[1, 2, 3, 4]', expectedOutput: '[1, 2, 3, 4, 2, 4]' },
      { input: '[1, 3, 5]', expectedOutput: '[1, 3, 5]' },
      { input: '[2, 2]', expectedOutput: '[2, 2, 2, 2]', hidden: true },
    ],
    fingerprint: 'curated_cpp_iterator_02',
    source: 'curated_fallback',
  },

  // ── C ──────────────────────────────────────────────────────────────────────
  {
    id: 'curated-c-dsa-binary-search',
    title: 'C Array Pointer Arithmetic Boundary Fault',
    mode: 'dsa',
    language: 'c',
    topic: 'Pointer Indirection & Memory Allocation (malloc/free)',
    difficulty: 'NOVICE',
    bugDescription: 'Binary search termination condition omits equality check, failing to locate elements positioned at exact partition boundaries.',
    brokenCode: `int binary_search(const int* arr, int n, int target) {
    int low = 0;
    int high = n - 1;

    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
    correctCode: `int binary_search(const int* arr, int n, int target) {
    int low = 0;
    int high = n - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
    hints: [
      'Examine the loop condition when searching a single element array or matching the last remaining element.',
      'When low == high, the valid candidate element at that index is skipped.',
      'Change while (low < high) to while (low <= high).',
    ],
    testCases: [
      { input: '{1, 3, 5, 7}, 4, 7', expectedOutput: '3' },
      { input: '{42}, 1, 42', expectedOutput: '0' },
      { input: '{10, 20, 30}, 3, 15', expectedOutput: '-1', hidden: true },
    ],
    fingerprint: 'curated_c_binsearch_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-c-practical-buffer-bounds',
    title: 'String Null-Termination Buffer Allocation Off-by-One',
    mode: 'practical',
    language: 'c',
    topic: 'Array Bounds & Buffer Overflow Vulnerabilities',
    difficulty: 'VETERAN',
    bugDescription: 'Memory allocation for string duplication allocates exactly strlen bytes without reserving space for the null terminator, leading to buffer overwrite.',
    brokenCode: `#include <stdlib.h>
#include <string.h>

char* duplicate_string(const char* src) {
    if (!src) return NULL;
    size_t len = strlen(src);
    char* copy = (char*)malloc(len);
    if (!copy) return NULL;
    strcpy(copy, src);
    return copy;
}`,
    correctCode: `#include <stdlib.h>
#include <string.h>

char* duplicate_string(const char* src) {
    if (!src) return NULL;
    size_t len = strlen(src);
    char* copy = (char*)malloc(len + 1);
    if (!copy) return NULL;
    strcpy(copy, src);
    return copy;
}`,
    hints: [
      'strlen counts characters excluding the trailing null byte \0.',
      'strcpy writes len + 1 bytes into the destination buffer.',
      'Allocate malloc(len + 1) to accommodate the null terminator.',
    ],
    testCases: [
      { input: '"cyber"', expectedOutput: '"cyber"' },
      { input: '""', expectedOutput: '""' },
      { input: 'NULL', expectedOutput: 'NULL', hidden: true },
    ],
    fingerprint: 'curated_c_string_02',
    source: 'curated_fallback',
  },

  // ── JAVA ───────────────────────────────────────────────────────────────────
  {
    id: 'curated-java-dsa-bst-validation',
    title: 'BST Inorder Upper Bound Validation Oversight',
    mode: 'dsa',
    language: 'java',
    topic: 'Binary Trees, BST & Recursive Traversal',
    difficulty: 'NOVICE',
    bugDescription: 'BST node validation tests left child strictly against parent value but fails to propagate global min/max constraints, admitting invalid cross-subtree keys.',
    brokenCode: `class Solution {
    public boolean isValidBST(TreeNode root) {
        if (root == null) return true;
        if (root.left != null && root.left.val >= root.val) return false;
        if (root.right != null && root.right.val <= root.val) return false;
        return isValidBST(root.left) && isValidBST(root.right);
    }
}`,
    correctCode: `class Solution {
    public boolean isValidBST(TreeNode root) {
        return validate(root, null, null);
    }

    private boolean validate(TreeNode node, Integer min, Integer max) {
        if (node == null) return true;
        if (min != null && node.val <= min) return false;
        if (max != null && node.val >= max) return false;
        return validate(node.left, min, node.val) && validate(node.right, node.val, max);
    }
}`,
    hints: [
      'Local parent-child checks do not verify that all left descendants are strictly less than ancestral roots.',
      'Pass ancestral min and max bounds recursively through helper parameters.',
      'Use a helper validate(node, min, max) function.',
    ],
    testCases: [
      { input: '[2, 1, 3]', expectedOutput: 'true' },
      { input: '[5, 1, 4, null, null, 3, 6]', expectedOutput: 'false' },
      { input: '[10, 5, 15, null, null, 6, 20]', expectedOutput: 'false', hidden: true },
    ],
    fingerprint: 'curated_java_bst_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-java-practical-list-remove',
    title: 'ArrayList In-Loop Removal Index Skip',
    mode: 'practical',
    language: 'java',
    topic: 'Arrays & ArrayList Indexing Edge Cases',
    difficulty: 'VETERAN',
    bugDescription: 'Forward indexed for-loop removes elements from ArrayList without decrementing the loop index, causing immediately subsequent adjacent matches to be skipped.',
    brokenCode: `import java.util.List;

public class FilterService {
    public static void removeNegativeNumbers(List<Integer> list) {
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i) < 0) {
                list.remove(i);
            }
        }
    }
}`,
    correctCode: `import java.util.List;

public class FilterService {
    public static void removeNegativeNumbers(List<Integer> list) {
        for (int i = list.size() - 1; i >= 0; i--) {
            if (list.get(i) < 0) {
                list.remove(i);
            }
        }
    }
}`,
    hints: [
      'When an element is removed at index i, the subsequent elements shift left by one.',
      'Incrementing i on the next iteration skips inspecting the element that moved into index i.',
      'Iterate backwards from list.size() - 1 down to 0, or use an Iterator.',
    ],
    testCases: [
      { input: '[1, -2, -3, 4]', expectedOutput: '[1, 4]' },
      { input: '[-1, -2, -3]', expectedOutput: '[]' },
      { input: '[5, 10]', expectedOutput: '[5, 10]', hidden: true },
    ],
    fingerprint: 'curated_java_remove_02',
    source: 'curated_fallback',
  },

  // ── SQL ────────────────────────────────────────────────────────────────────
  {
    id: 'curated-sql-dsa-window-rank',
    title: 'Leaderboard Ranking Dense Rank Gap Defect',
    mode: 'dsa',
    language: 'sql',
    topic: 'Window Functions (ROW_NUMBER, RANK, DENSE_RANK)',
    difficulty: 'NOVICE',
    bugDescription: 'Query uses standard RANK() instead of DENSE_RANK() for consecutive badge qualification tiers, introducing gaps in ranking numbers after score ties.',
    brokenCode: `SELECT 
    player_id, 
    score, 
    RANK() OVER (ORDER BY score DESC) AS player_tier
FROM player_leaderboard;`,
    correctCode: `SELECT 
    player_id, 
    score, 
    DENSE_RANK() OVER (ORDER BY score DESC) AS player_tier
FROM player_leaderboard;`,
    hints: [
      'RANK() leaves gaps in sequence following duplicate score ranks (e.g., 1, 2, 2, 4).',
      'Continuous unbroken tier progression requires consecutive rank assignment for ties.',
      'Change RANK() OVER (...) to DENSE_RANK() OVER (...).',
    ],
    testCases: [
      { input: 'scores: [100, 90, 90, 80]', expectedOutput: 'tiers: [1, 2, 2, 3]' },
      { input: 'scores: [50, 40]', expectedOutput: 'tiers: [1, 2]' },
      { input: 'scores: [100, 100, 100, 50]', expectedOutput: 'tiers: [1, 1, 1, 2]', hidden: true },
    ],
    fingerprint: 'curated_sql_dense_rank_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-sql-practical-null-join',
    title: 'Outer Join Filter Placement Converting to Inner Join',
    mode: 'practical',
    language: 'sql',
    topic: 'Complex Multi-Way INNER vs. LEFT OUTER JOINs',
    difficulty: 'VETERAN',
    bugDescription: 'Filter condition for outer joined table placed in WHERE clause instead of ON clause, unintentionally filtering out left rows with NULL right values.',
    brokenCode: `SELECT 
    b.id AS bounty_id, 
    b.title, 
    s.status
FROM bounties b
LEFT JOIN submissions s ON b.id = s.bounty_id
WHERE s.is_active = 1;`,
    correctCode: `SELECT 
    b.id AS bounty_id, 
    b.title, 
    s.status
FROM bounties b
LEFT JOIN submissions s ON b.id = s.bounty_id AND s.is_active = 1;`,
    hints: [
      'Where clause evaluation occurs after the LEFT JOIN is formed.',
      'Filtering s.is_active = 1 in the WHERE clause excludes records where submissions is NULL.',
      'Relocate the filter condition into the JOIN ... ON clause.',
    ],
    testCases: [
      { input: 'bounties without submissions', expectedOutput: 'retained with NULL status' },
      { input: 'bounties with active submissions', expectedOutput: 'retained with active status' },
      { input: 'mixed bounty dataset', expectedOutput: 'all bounties present', hidden: true },
    ],
    fingerprint: 'curated_sql_outer_join_02',
    source: 'curated_fallback',
  },

  // ── GO ─────────────────────────────────────────────────────────────────────
  {
    id: 'curated-go-dsa-slice-capacity',
    title: 'Go Slice Backing Array Re-slice Mutation Bug',
    mode: 'dsa',
    language: 'go',
    topic: 'Arrays, Slices & Memory Allocation',
    difficulty: 'NOVICE',
    bugDescription: 'Appending to a sub-slice without full slice expressions overwrites elements in the parent backing array.',
    brokenCode: `package main

func AppendPrefix(arr []int, item int) []int {
    sub := arr[:2]
    sub = append(sub, item)
    return sub
}`,
    correctCode: `package main

func AppendPrefix(arr []int, item int) []int {
    sub := arr[:2:2]
    sub = append(sub, item)
    return sub
}`,
    hints: [
      'A sub-slice arr[:2] retains the capacity of the original backing array.',
      'Calling append mutates the underlying element at index 2 of arr.',
      'Use 3-index slice syntax arr[:2:2] to cap slice capacity and force reallocation on append.',
    ],
    testCases: [
      { input: '[1, 2, 3, 4], 99', expectedOutput: '[1, 2, 99], original intact' },
      { input: '[10, 20, 30], 5', expectedOutput: '[10, 20, 5], original intact' },
      { input: '[5, 6, 7, 8, 9], 42', expectedOutput: '[5, 6, 42], original intact', hidden: true },
    ],
    fingerprint: 'curated_go_slice_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-go-practical-nil-interface',
    title: 'Nil Concrete Pointer in Non-Nil Interface Evaluation',
    mode: 'practical',
    language: 'go',
    topic: 'Interfaces, Concurrency & Goroutines',
    difficulty: 'VETERAN',
    bugDescription: 'Function returns typed nil pointer assigned to interface type; in Go, an interface containing a nil pointer with non-nil type does not equal nil.',
    brokenCode: `package main

type CustomError struct{}

func (e *CustomError) Error() string { return "custom error" }

func validateInput(valid bool) error {
    var err *CustomError = nil
    if !valid {
        err = &CustomError{}
    }
    return err
}`,
    correctCode: `package main

type CustomError struct{}

func (e *CustomError) Error() string { return "custom error" }

func validateInput(valid bool) error {
    if !valid {
        return &CustomError{}
    }
    return nil
}`,
    hints: [
      'In Go, an interface value is nil only if both its type and value are nil.',
      'Returning a nil *CustomError assigned to an error interface yields a non-nil interface.',
      'Explicitly return nil when valid is true.',
    ],
    testCases: [
      { input: 'true', expectedOutput: 'nil' },
      { input: 'false', expectedOutput: 'non-nil error' },
      { input: 'validity edge check', expectedOutput: 'err == nil evaluated true', hidden: true },
    ],
    fingerprint: 'curated_go_nil_interface_02',
    source: 'curated_fallback',
  },

  // ── RUST ───────────────────────────────────────────────────────────────────
  {
    id: 'curated-rust-dsa-partition',
    title: 'Rust Binary Search Midpoint Saturation Bug',
    mode: 'dsa',
    language: 'rust',
    topic: 'Binary Search & Slices',
    difficulty: 'NOVICE',
    bugDescription: 'Unsigned usize subtraction high - 1 underflows on index 0, causing panic in debug builds and memory aborts.',
    brokenCode: `pub fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() { return None; }
    let mut low: usize = 0;
    let mut high: usize = arr.len() - 1;

    while low <= high {
        let mid = low + (high - low) / 2;
        if arr[mid] == target {
            return Some(mid);
        } else if arr[mid] < target {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    None
}`,
    correctCode: `pub fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() { return None; }
    let mut low: usize = 0;
    let mut high: usize = arr.len() - 1;

    while low <= high {
        let mid = low + (high - low) / 2;
        if arr[mid] == target {
            return Some(mid);
        } else if arr[mid] < target {
            low = mid + 1;
        } else {
            if mid == 0 { break; }
            high = mid - 1;
        }
    }
    None
}`,
    hints: [
      'Consider what happens when mid is 0 and target is smaller than arr[0].',
      'mid - 1 on an unsigned usize causes an arithmetic underflow panic.',
      'Check if mid == 0 before performing high = mid - 1, or use signed indices.',
    ],
    testCases: [
      { input: '[1, 3, 5, 7], 3', expectedOutput: 'Some(1)' },
      { input: '[2, 4, 6], 1', expectedOutput: 'None' },
      { input: '[10], 5', expectedOutput: 'None', hidden: true },
    ],
    fingerprint: 'curated_rust_binsearch_01',
    source: 'curated_fallback',
  },
  {
    id: 'curated-rust-practical-cell',
    title: 'Interior Mutability RefCell Borrow Flag Leak',
    mode: 'practical',
    language: 'rust',
    topic: 'Memory Safety, Lifetimes & Concurrency',
    difficulty: 'VETERAN',
    bugDescription: 'Holding RefCell borrow guard across recursive function calls causes panic due to concurrent mutable borrow conflict.',
    brokenCode: `use std::cell::RefCell;

pub struct Accumulator {
    val: RefCell<i32>,
}

impl Accumulator {
    pub fn new() -> Self {
        Self { val: RefCell::new(0) }
    }

    pub fn compute(&self, count: i32) {
        let mut borrowed = self.val.borrow_mut();
        if count > 0 {
            *borrowed += 1;
            self.compute(count - 1);
        }
    }
}`,
    correctCode: `use std::cell::RefCell;

pub struct Accumulator {
    val: RefCell<i32>,
}

impl Accumulator {
    pub fn new() -> Self {
        Self { val: RefCell::new(0) }
    }

    pub fn compute(&self, count: i32) {
        if count > 0 {
            *self.val.borrow_mut() += 1;
            self.compute(count - 1);
        }
    }
}`,
    hints: [
      'let mut borrowed keeps the borrow guard alive across the entire stack frame of compute().',
      'Recursive invocation attempts a second concurrent mutable borrow on the same RefCell, causing runtime panic.',
      'Scope the borrow_mut() to an ephemeral expression so it releases before recursing.',
    ],
    testCases: [
      { input: 'acc.compute(3)', expectedOutput: 'acc.val == 3 without panic' },
      { input: 'acc.compute(0)', expectedOutput: 'acc.val == 0' },
      { input: 'acc.compute(5)', expectedOutput: 'acc.val == 5', hidden: true },
    ],
    fingerprint: 'curated_rust_refcell_02',
    source: 'curated_fallback',
  },
];

/**
 * Finds the best matching curated challenge from the fallback pool.
 */
export function getCuratedFallback(params: {
  language: string;
  topic?: string;
  mode?: 'dsa' | 'practical';
  difficulty?: 'NOVICE' | 'VETERAN' | 'CYBER_PUNK';
  excludeIds?: string[];
}): CuratedChallenge {
  const targetLang = (params.language || 'javascript').toLowerCase();
  const targetMode = params.mode;
  const exclusions = new Set(params.excludeIds || []);

  // 1. Language + mode + topic match
  if (params.topic) {
    const topicLower = params.topic.toLowerCase();
    const exactTopicMatch = CURATED_CHALLENGES.find(
      (c) =>
        c.language.toLowerCase() === targetLang &&
        (!targetMode || c.mode === targetMode) &&
        c.topic.toLowerCase().includes(topicLower) &&
        !exclusions.has(c.id)
    );
    if (exactTopicMatch) return exactTopicMatch;
  }

  // 2. Language + mode match
  const modeMatches = CURATED_CHALLENGES.filter(
    (c) =>
      c.language.toLowerCase() === targetLang &&
      (!targetMode || c.mode === targetMode) &&
      !exclusions.has(c.id)
  );
  if (modeMatches.length > 0) {
    return modeMatches[Math.floor(Math.random() * modeMatches.length)];
  }

  // 3. Any match in target language
  const langMatches = CURATED_CHALLENGES.filter(
    (c) => c.language.toLowerCase() === targetLang
  );
  if (langMatches.length > 0) {
    return langMatches[Math.floor(Math.random() * langMatches.length)];
  }

  // 4. Default safe fallback
  return CURATED_CHALLENGES[0];
}

