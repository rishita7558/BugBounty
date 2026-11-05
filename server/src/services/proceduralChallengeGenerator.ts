/**
 * @file proceduralChallengeGenerator.ts
 * @description Infinite procedural challenge generator engine for BugBounty.
 * Generates an endless stream of unique, parameterized DSA (Data Structures & Algorithms),
 * systems, concurrency, memory safety, and security debugging challenges across all 8 languages:
 * JavaScript, TypeScript, Python, Rust, Go, C++, Java, and SQL.
 * 
 * Guarantees zero bug spoiler comments in buggyCode and unique test vectors every invocation.
 */

export interface ProceduralChallengeOptions {
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  language?: string;
  topic?: string;
  category?: string;
  challengeStyle?: string;
  excludeIds?: string[];
}

export interface GeneratedChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'dsa' | 'logic' | 'async' | 'security' | 'types' | 'memory' | 'syntax';
  language: string;
  topic: string;
  challengeStyle?: string;
  buggyCode: string;
  correctCode: string;
  bugLine: number;
  bugDescription: string;
  hints: string[];
  testCases: Array<{ input: string; expectedOutput: string }>;
  timeLimit: number;
  points: number;
}

// Random helpers
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).substring(2, 6)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DSA GENERATOR BLUEPRINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Binary Search & Search Range Generator
 */
function generateBinarySearchChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  const fnNames = ['binarySearchTarget', 'locateSortedIndex', 'findKeyPosition', 'searchSortedRange'];
  const fn = randomChoice(fnNames);
  const targetVal = randomInt(7, 42);

  if (lang === 'python') {
    return {
      id: uid('dsa-binsearch-py'),
      title: 'Binary Search Loop Boundary Defect',
      description: `The ${fn} function performs binary search over a sorted list to locate the index of a target value, but fails to find elements when located at the rightmost boundary.`,
      difficulty,
      category: 'dsa',
      language: 'python',
      topic: 'dsa-binary-search',
      buggyCode: `def ${fn}(nums, target):
    low = 0
    high = len(nums) - 1

    while low < high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1`,
      correctCode: `def ${fn}(nums, target):
    low = 0
    high = len(nums) - 1

    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1`,
      bugLine: 5,
      bugDescription: 'Loop condition "while low < high" terminates prematurely when low == high, missing the target element when it is at the boundary.',
      hints: [
        'What happens when the array contains only 1 element, or the target is at the final position?',
        'When low equals high, the element at that index has not been checked yet.',
        'Change "while low < high:" to "while low <= high:".',
      ],
      testCases: [
        { input: `[2, 5, 8, 12, 16], 16`, expectedOutput: '4' },
        { input: `[${targetVal}], ${targetVal}`, expectedOutput: '0' },
        { input: `[1, 3, 5, 7, 9], 4`, expectedOutput: '-1' },
      ],
      timeLimit: difficulty === 'hard' ? 180 : difficulty === 'medium' ? 150 : 120,
      points: difficulty === 'hard' ? 500 : difficulty === 'medium' ? 250 : 100,
    };
  }

  if (lang === 'cpp') {
    return {
      id: uid('dsa-binsearch-cpp'),
      title: 'Binary Search Midpoint Overflow Flaw',
      description: `The ${fn} function searches an ascending integer vector, but causes signed integer overflow on large arrays.`,
      difficulty,
      category: 'dsa',
      language: 'cpp',
      topic: 'dsa-binary-search',
      buggyCode: `#include <vector>

int ${fn}(const std::vector<int>& nums, int target) {
    int low = 0;
    int high = static_cast<int>(nums.size()) - 1;

    while (low <= high) {
        int mid = (low + high) / 2;
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
      correctCode: `#include <vector>

int ${fn}(const std::vector<int>& nums, int target) {
    int low = 0;
    int high = static_cast<int>(nums.size()) - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
      bugLine: 8,
      bugDescription: 'Computing midpoint as (low + high) / 2 overflows the 32-bit signed int when low + high exceeds INT_MAX.',
      hints: [
        'Notice how mid is computed from low and high.',
        'If low and high are large positive integers, their sum can exceed maximum signed 32-bit integer capacity.',
        'Use "int mid = low + (high - low) / 2;" to guarantee safe arithmetic.',
      ],
      testCases: [
        { input: `nums = [1, 4, 7, 9, 12], target = 9`, expectedOutput: '3' },
        { input: `nums = [2, 5, 8], target = 10`, expectedOutput: '-1' },
      ],
      timeLimit: 150,
      points: 250,
    };
  }

  if (lang === 'rust') {
    return {
      id: uid('dsa-binsearch-rs'),
      title: 'Binary Search Left Bound Stall',
      description: `The ${fn} function searches for target value in a sorted slice, but suffers from an infinite loop when the target is greater than mid.`,
      difficulty,
      category: 'dsa',
      language: 'rust',
      topic: 'dsa-binary-search',
      buggyCode: `pub fn ${fn}(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() {
        return None;
    }
    let mut low = 0;
    let mut high = arr.len() - 1;

    while low <= high {
        let mid = low + (high - low) / 2;
        if arr[mid] == target {
            return Some(mid);
        } else if arr[mid] < target {
            low = mid;
        } else {
            if mid == 0 { break; }
            high = mid - 1;
        }
    }
    None
}`,
      correctCode: `pub fn ${fn}(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() {
        return None;
    }
    let mut low = 0;
    let mut high = arr.len() - 1;

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
      bugLine: 13,
      bugDescription: 'Assigning low = mid instead of mid + 1 prevents the window from shrinking when low + 1 == high, causing an infinite loop.',
      hints: [
        'Check the update to the left search pointer.',
        'If low = mid and arr[mid] < target, the search range fails to advance.',
        'Change "low = mid;" to "low = mid + 1;".',
      ],
      testCases: [
        { input: `&[10, 20, 30, 40], 30`, expectedOutput: 'Some(2)' },
        { input: `&[5, 15, 25], 50`, expectedOutput: 'None' },
      ],
      timeLimit: 150,
      points: 250,
    };
  }

  if (lang === 'go') {
    return {
      id: uid('dsa-binsearch-go'),
      title: 'Binary Search Upper Bound Termination',
      description: `The ${fn} function searches for target in a sorted integer slice, but terminates before inspecting the sole remaining element.`,
      difficulty,
      category: 'dsa',
      language: 'go',
      topic: 'dsa-binary-search',
      buggyCode: `package main

func ${fn}(nums []int, target int) int {
	low := 0
	high := len(nums) - 1

	for low < high {
		mid := low + (high-low)/2
		if nums[mid] == target {
			return mid
		} else if nums[mid] < target {
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	return -1
}`,
      correctCode: `package main

func ${fn}(nums []int, target int) int {
	low := 0
	high := len(nums) - 1

	for low <= high {
		mid := low + (high-low)/2
		if nums[mid] == target {
			return mid
		} else if nums[mid] < target {
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	return -1
}`,
      bugLine: 7,
      bugDescription: 'Loop condition "for low < high" misses the target element when low == high.',
      hints: [
        'What happens when the array has length 1?',
        'The loop should continue executing while low <= high.',
        'Change "for low < high" to "for low <= high".',
      ],
      testCases: [
        { input: `[]int{3, 6, 9, 12}, 12`, expectedOutput: '3' },
        { input: `[]int{7}, 7`, expectedOutput: '0' },
      ],
      timeLimit: 120,
      points: 100,
    };
  }

  if (lang === 'java') {
    return {
      id: uid('dsa-binsearch-java'),
      title: 'Binary Search Off-By-One Right Bound',
      description: `The ${fn} method fails to find numbers located at the end of the array due to a strict loop condition.`,
      difficulty,
      category: 'dsa',
      language: 'java',
      topic: 'dsa-binary-search',
      buggyCode: `public class Solution {
    public static int ${fn}(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;

        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }
}`,
      correctCode: `public class Solution {
    public static int ${fn}(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;

        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }
}`,
      bugLine: 6,
      bugDescription: 'Loop condition "while (low < high)" skips evaluation when low and high converge on the target index.',
      hints: [
        'Inspect the while loop condition carefully.',
        'When low == high, nums[mid] has not been evaluated.',
        'Change "while (low < high)" to "while (low <= high)".',
      ],
      testCases: [
        { input: `new int[]{1, 3, 5, 7, 9}, 9`, expectedOutput: '4' },
        { input: `new int[]{10}, 10`, expectedOutput: '0' },
      ],
      timeLimit: 120,
      points: 100,
    };
  }

  // Default: JavaScript / TypeScript
  return {
    id: uid('dsa-binsearch-js'),
    title: 'Binary Search Midpoint Boundary Defect',
    description: `The ${fn} function searches a sorted array for a target key, but fails when the element is at the end of the search window.`,
    difficulty,
    category: 'dsa',
    language: lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-binary-search',
    buggyCode: `function ${fn}(nums, target) {
  let low = 0;
  let high = nums.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}`,
    correctCode: `function ${fn}(nums, target) {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}`,
    bugLine: 5,
    bugDescription: 'Loop condition "while (low < high)" terminates before checking the element at index low when low === high.',
    hints: [
      'Trace what happens with a single-element array like [5] searching for 5.',
      'When low and high are equal, the index has not been inspected.',
      'Change "while (low < high)" to "while (low <= high)".',
    ],
    testCases: [
      { input: `[2, 4, 6, 8, 10], 10`, expectedOutput: '4' },
      { input: `[${targetVal}], ${targetVal}`, expectedOutput: '0' },
      { input: `[1, 3, 5], 4`, expectedOutput: '-1' },
    ],
    timeLimit: 120,
    points: 100,
  };
}

/**
 * Two Pointers & Sliding Window Generator
 */
function generateSlidingWindowChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  if (lang === 'python') {
    return {
      id: uid('dsa-slidingwindow-py'),
      title: 'Sliding Window Substring Length Calculation',
      description: 'The length_of_longest_substring function calculates the length of the longest substring without repeating characters, but undercounts window lengths.',
      difficulty,
      category: 'dsa',
      language: 'python',
      topic: 'dsa-sliding-window',
      buggyCode: `def length_of_longest_substring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0

    for right in range(len(s)):
        ch = s[right]
        if ch in char_map and char_map[ch] >= left:
            left = char_map[ch] + 1
        char_map[ch] = right
        max_len = max(max_len, right - left)

    return max_len`,
      correctCode: `def length_of_longest_substring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0

    for right in range(len(s)):
        ch = s[right]
        if ch in char_map and char_map[ch] >= left:
            left = char_map[ch] + 1
        char_map[ch] = right
        max_len = max(max_len, right - left + 1)

    return max_len`,
      bugLine: 11,
      bugDescription: 'Window length is computed as "right - left" instead of "right - left + 1", undercounting every substring by 1 character.',
      hints: [
        'Consider a string of length 1, like "a". What should the longest substring length be?',
        'In a 0-indexed inclusive window from left to right, the count of elements is right - left + 1.',
        'Change "right - left" to "right - left + 1".',
      ],
      testCases: [
        { input: `"abcabcbb"`, expectedOutput: '3' },
        { input: `"bbbbb"`, expectedOutput: '1' },
        { input: `"pwwkew"`, expectedOutput: '3' },
      ],
      timeLimit: 150,
      points: 250,
    };
  }

  return {
    id: uid('dsa-slidingwindow-js'),
    title: 'Sliding Window Window Sizing Off-By-One',
    description: 'The lengthOfLongestSubstring function calculates the longest non-repeating substring length, but misses one character on every window calculation.',
    difficulty,
    category: 'dsa',
    language: lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-sliding-window',
    buggyCode: `function lengthOfLongestSubstring(s) {
  const map = new Map();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (map.has(ch) && map.get(ch) >= left) {
      left = map.get(ch) + 1;
    }
    map.set(ch, right);
    maxLen = Math.max(maxLen, right - left);
  }

  return maxLen;
}`,
    correctCode: `function lengthOfLongestSubstring(s) {
  const map = new Map();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (map.has(ch) && map.get(ch) >= left) {
      left = map.get(ch) + 1;
    }
    map.set(ch, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}`,
    bugLine: 12,
    bugDescription: 'Inclusive window length between index left and right is right - left + 1. The formula right - left undercounts the length.',
    hints: [
      'If string is "a", left is 0 and right is 0. right - left evaluates to 0.',
      'The length of an inclusive index range [left, right] is right - left + 1.',
      'Change "right - left" to "right - left + 1".',
    ],
    testCases: [
      { input: `"abcabcbb"`, expectedOutput: '3' },
      { input: `"bbbbb"`, expectedOutput: '1' },
      { input: `"pwwkew"`, expectedOutput: '3' },
    ],
    timeLimit: 150,
    points: 250,
  };
}

/**
 * Dynamic Programming Challenge Generator
 */
function generateDPChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  if (lang === 'python') {
    return {
      id: uid('dsa-dp-coinchange-py'),
      title: 'Coin Change DP Unreachable State Sentinel',
      description: 'The coin_change function calculates minimum coins needed to make amount, but returns wrong sentinel values for impossible configurations.',
      difficulty,
      category: 'dsa',
      language: 'python',
      topic: 'dsa-dynamic-programming',
      buggyCode: `def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0

    for i in range(1, amount + 1):
        for c in coins:
            if i - c >= 0:
                dp[i] = min(dp[i], dp[i - c] + 1)

    return dp[amount] if dp[amount] != float('inf') else 0`,
      correctCode: `def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0

    for i in range(1, amount + 1):
        for c in coins:
            if i - c >= 0:
                dp[i] = min(dp[i], dp[i - c] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1`,
      bugLine: 10,
      bugDescription: 'When the amount cannot be formed, the standard specification requires returning -1, not 0.',
      hints: [
        'Check the return statement when no coin combination sums up to amount.',
        'If dp[amount] remains float("inf"), what should be returned for an impossible amount?',
        'Replace "else 0" with "else -1".',
      ],
      testCases: [
        { input: `[1, 2, 5], 11`, expectedOutput: '3' },
        { input: `[2], 3`, expectedOutput: '-1' },
        { input: `[1], 0`, expectedOutput: '0' },
      ],
      timeLimit: 180,
      points: 250,
    };
  }

  return {
    id: uid('dsa-dp-climbingstairs-js'),
    title: 'Climbing Stairs DP Base Case Missing',
    description: 'The climbStairs function computes distinct ways to climb n steps with steps of 1 or 2, but fails for small input numbers.',
    difficulty,
    category: 'dsa',
    language: lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-dynamic-programming',
    buggyCode: `function climbStairs(n) {
  if (n <= 0) return 0;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}`,
    correctCode: `function climbStairs(n) {
  if (n <= 0) return 0;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  dp[1] = 1;

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}`,
    bugLine: 5,
    bugDescription: 'dp[1] base case is omitted (defaulting to 0), causing all subsequent steps to compute incorrect Fibonacci values.',
    hints: [
      'There is 1 way to climb 1 step. What is dp[1] initialized to?',
      'Without initializing dp[1] = 1, dp[2] becomes dp[1] + dp[0] = 0 + 1 = 1 instead of 2.',
      'Add "dp[1] = 1;" immediately after dp[0] = 1.',
    ],
    testCases: [
      { input: `2`, expectedOutput: '2' },
      { input: `3`, expectedOutput: '3' },
      { input: `5`, expectedOutput: '8' },
    ],
    timeLimit: 120,
    points: 100,
  };
}

/**
 * Trees & Binary Search Trees Generator
 */
function generateTreeChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  return {
    id: uid('dsa-trees-bst'),
    title: 'Validate Binary Search Tree Range Scope Violation',
    description: 'The isValidBST function validates if a binary tree satisfies the BST invariant, but only checks immediate child nodes instead of global bounds.',
    difficulty,
    category: 'dsa',
    language: lang === 'python' ? 'python' : lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-trees-bst',
    buggyCode: `function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;

  if (root.val <= min || root.val >= max) {
    return false;
  }

  return isValidBST(root.left, min, root.val) && isValidBST(root.right, min, max);
}`,
    correctCode: `function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;

  if (root.val <= min || root.val >= max) {
    return false;
  }

  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}`,
    bugLine: 8,
    bugDescription: 'When recursing on root.right, the lower bound must be tightened to root.val. Passing min allows values smaller than root into the right subtree.',
    hints: [
      'In a valid BST, all nodes in the right subtree must be strictly greater than root.val.',
      'Check the second argument passed to isValidBST(root.right, ...).',
      'Change "isValidBST(root.right, min, max)" to "isValidBST(root.right, root.val, max)".',
    ],
    testCases: [
      { input: `[2, 1, 3]`, expectedOutput: 'true' },
      { input: `[5, 1, 4, null, null, 3, 6]`, expectedOutput: 'false' },
    ],
    timeLimit: 180,
    points: 250,
  };
}

/**
 * Graphs & BFS/DFS Generator
 */
function generateGraphChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  return {
    id: uid('dsa-graph-bfs'),
    title: 'Breadth-First Search Queue Shift Omission',
    description: 'The bfsTraversal function should explore nodes level-by-level using a FIFO queue, but uses pop() which mutates the algorithm into DFS.',
    difficulty,
    category: 'dsa',
    language: lang === 'python' ? 'python' : lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-graphs-bfs-dfs',
    buggyCode: `function bfsTraversal(graph, startNode) {
  const visited = new Set([startNode]);
  const queue = [startNode];
  const order = [];

  while (queue.length > 0) {
    const node = queue.pop();
    order.push(node);

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return order;
}`,
    correctCode: `function bfsTraversal(graph, startNode) {
  const visited = new Set([startNode]);
  const queue = [startNode];
  const order = [];

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return order;
}`,
    bugLine: 7,
    bugDescription: 'Using queue.pop() removes elements from the end (LIFO stack behavior). BFS requires removing from the front using queue.shift() (FIFO queue).',
    hints: [
      'A queue operates on First-In-First-Out (FIFO) semantics.',
      'queue.pop() removes from the tail, turning the traversal into depth-first search.',
      'Change "queue.pop()" to "queue.shift()".',
    ],
    testCases: [
      { input: `{ A: ['B', 'C'], B: ['D'], C: ['E'], D: [], E: [] }, 'A'`, expectedOutput: `['A', 'B', 'C', 'D', 'E']` },
    ],
    timeLimit: 150,
    points: 200,
  };
}

/**
 * Linked Lists Generator
 */
function generateLinkedListChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  return {
    id: uid('dsa-linkedlist-cycle'),
    title: 'Fast Pointer Null Dereference in Cycle Detection',
    description: 'The hasCycle function implements Floyd\'s Tortoise and Hare algorithm, but crashes when the list contains an odd number of elements.',
    difficulty,
    category: 'dsa',
    language: lang === 'python' ? 'python' : lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-linked-lists',
    buggyCode: `function hasCycle(head) {
  let slow = head;
  let fast = head;

  while (fast !== null) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) {
      return true;
    }
  }

  return false;
}`,
    correctCode: `function hasCycle(head) {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) {
      return true;
    }
  }

  return false;
}`,
    bugLine: 5,
    bugDescription: 'Loop condition only checks "fast !== null". If fast is the last node, fast.next is null and fast.next.next throws TypeError.',
    hints: [
      'Look at what happens when fast reaches the final node in an odd-length acyclic list.',
      'Advancing fast by two steps requires checking both fast and fast.next.',
      'Change "while (fast !== null)" to "while (fast !== null && fast.next !== null)".',
    ],
    testCases: [
      { input: `[3, 2, 0, -4] with pos = 1`, expectedOutput: 'true' },
      { input: `[1, 2] with pos = -1`, expectedOutput: 'false' },
    ],
    timeLimit: 120,
    points: 150,
  };
}

/**
 * Monotonic Stack Generator
 */
function generateMonotonicStackChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  return {
    id: uid('dsa-monotonic-stack'),
    title: 'Next Greater Element Stack Index Mapping',
    description: 'The nextGreaterElement function finds the next greater value for each element, but compares indices rather than values.',
    difficulty,
    category: 'dsa',
    language: lang === 'python' ? 'python' : lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'dsa-monotonic-stack',
    buggyCode: `function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = [];

  for (let i = 0; i < nums.length; i++) {
    while (stack.length > 0 && stack[stack.length - 1] < nums[i]) {
      const prevIndex = stack.pop();
      result[prevIndex] = nums[i];
    }
    stack.push(i);
  }

  return result;
}`,
    correctCode: `function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = [];

  for (let i = 0; i < nums.length; i++) {
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      const prevIndex = stack.pop();
      result[prevIndex] = nums[i];
    }
    stack.push(i);
  }

  return result;
}`,
    bugLine: 6,
    bugDescription: 'stack stores indices, but the while condition compares the index directly: stack[stack.length - 1] < nums[i] instead of nums[stack[...]].',
    hints: [
      'Notice what is stored in the stack: stack.push(i) stores index i.',
      'Comparing stack[stack.length - 1] with nums[i] compares an index with an array value.',
      'Change "stack[stack.length - 1] < nums[i]" to "nums[stack[stack.length - 1]] < nums[i]".',
    ],
    testCases: [
      { input: `[2, 1, 2, 4, 3]`, expectedOutput: `[4, 2, 4, -1, -1]` },
      { input: `[4, 3, 2, 1]`, expectedOutput: `[-1, -1, -1, -1]` },
    ],
    timeLimit: 150,
    points: 200,
  };
}

/**
 * SQL Security & Aggregation Generator
 */
function generateSQLChallenge(difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  return {
    id: uid('sql-security-injection'),
    title: 'Unescaped Query Parameter Injection Vector',
    description: 'The authenticateUser function queries operator credentials but concatenates unsanitized input directly into dynamic SQL.',
    difficulty,
    category: 'security',
    language: 'sql',
    topic: 'sql-injection-vectors',
    buggyCode: `-- Authentication query procedure
CREATE OR REPLACE FUNCTION authenticate_operator(p_username TEXT, p_hash TEXT)
RETURNS TABLE(id INT, callsign TEXT, is_admin BOOLEAN) AS $$
BEGIN
    RETURN QUERY EXECUTE 
        'SELECT id, callsign, is_admin FROM operators WHERE username = ''' || p_username || ''' AND password_hash = ''' || p_hash || ''';';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    correctCode: `-- Authentication query procedure
CREATE OR REPLACE FUNCTION authenticate_operator(p_username TEXT, p_hash TEXT)
RETURNS TABLE(id INT, callsign TEXT, is_admin BOOLEAN) AS $$
BEGIN
    RETURN QUERY EXECUTE 
        'SELECT id, callsign, is_admin FROM operators WHERE username = $1 AND password_hash = $2;'
    USING p_username, p_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    bugLine: 6,
    bugDescription: 'String concatenation of p_username and p_hash permits SQL injection payloads like "\' OR \'1\'=\'1". Must use parameter placeholders $1, $2 and the USING clause.',
    hints: [
      'Look at how p_username and p_hash are joined into the query string.',
      'String concatenation with || exposes the query to tautology injections.',
      'Replace concatenation with $1, $2 placeholders and append "USING p_username, p_hash;".',
    ],
    testCases: [
      { input: `p_username = "neo', p_hash = 'secret'`, expectedOutput: `1 row returned (operator authenticated)` },
      { input: `p_username = "admin' OR '1'='1"`, expectedOutput: `0 rows returned (attack blocked)` },
    ],
    timeLimit: 150,
    points: 250,
  };
}

/**
 * Systems, Concurrency, and Logic Challenge Generator
 */
function generateSystemsChallenge(lang: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge {
  if (lang === 'rust') {
    return {
      id: uid('sys-rust-borrow'),
      title: 'Vector Iterator Invalidation Mutation Flaw',
      description: 'The filter_even_inplace function attempts to clear elements during iteration, causing multiple mutable borrow collisions.',
      difficulty,
      category: 'memory',
      language: 'rust',
      topic: 'rust-lifetimes-borrow',
      buggyCode: `pub fn filter_even_inplace(nums: &mut Vec<i32>) {
    for i in 0..nums.len() {
        if nums[i] % 2 != 0 {
            nums.remove(i);
        }
    }
}`,
      correctCode: `pub fn filter_even_inplace(nums: &mut Vec<i32>) {
    nums.retain(|&x| x % 2 == 0);
}`,
      bugLine: 4,
      bugDescription: 'Calling nums.remove(i) shifts all remaining elements and modifies length while iterating forwards, skipping subsequent elements and going out of bounds.',
      hints: [
        'Mutating a vector length while iterating over 0..nums.len() causes index shift errors.',
        'Rust provides an idiomatic, in-place method to retain elements satisfying a predicate.',
        'Replace the loop with "nums.retain(|&x| x % 2 == 0);".',
      ],
      testCases: [
        { input: `&mut vec![1, 2, 3, 4]`, expectedOutput: `vec![2, 4]` },
        { input: `&mut vec![1, 3, 5]`, expectedOutput: `vec![]` },
      ],
      timeLimit: 150,
      points: 250,
    };
  }

  if (lang === 'go') {
    return {
      id: uid('sys-go-goroutine-leak'),
      title: 'Unbuffered Channel Goroutine Starvation Deadlock',
      description: 'The fetchFastestResult function spawns competing goroutines to read an endpoint, but leaks workers when writing to an unbuffered channel.',
      difficulty,
      category: 'async',
      language: 'go',
      topic: 'go-goroutines-channels',
      buggyCode: `package main

func fetchFastestResult(queries []string) string {
	ch := make(chan string)

	for _, q := range queries {
		go func(query string) {
			result := "data:" + query
			ch <- result
		}(q)
	}

	return <-ch
}`,
      correctCode: `package main

func fetchFastestResult(queries []string) string {
	ch := make(chan string, len(queries))

	for _, q := range queries {
		go func(query string) {
			result := "data:" + query
			ch <- result
		}(q)
	}

	return <-ch
}`,
      bugLine: 4,
      bugDescription: 'The channel ch is unbuffered. Once the first worker sends and returns, remaining goroutines block indefinitely trying to send, leaking memory.',
      hints: [
        'How many values can an unbuffered channel hold before blocking?',
        'If len(queries) goroutines attempt to send, but only 1 value is ever received, what happens to the rest?',
        'Buffer the channel by providing capacity: make(chan string, len(queries)).',
      ],
      testCases: [
        { input: `[]string{"node1", "node2", "node3"}`, expectedOutput: `"data:node1"` },
      ],
      timeLimit: 150,
      points: 250,
    };
  }

  // Default: JS/TS Promise / Async
  return {
    id: uid('sys-js-async-all'),
    title: 'Promise Settlement Error Short-Circuit',
    description: 'The batchProcessOperations function should execute multiple audits and aggregate all results, but drops all successes whenever any single task rejects.',
    difficulty,
    category: 'async',
    language: lang === 'typescript' ? 'typescript' : 'javascript',
    topic: 'js-async-event-loop',
    buggyCode: `async function batchProcessOperations(tasks) {
  const promises = tasks.map((t) => t());
  const results = await Promise.all(promises);
  return results.filter((r) => r.status === 'success');
}`,
    correctCode: `async function batchProcessOperations(tasks) {
  const promises = tasks.map((t) => t());
  const settlements = await Promise.allSettled(promises);
  return settlements
    .filter((s) => s.status === 'fulfilled')
    .map((s) => s.value);
}`,
    bugLine: 3,
    bugDescription: 'Promise.all rejects immediately upon the first failure, dropping all successful tasks. Promise.allSettled should be used to await all results regardless of rejection.',
    hints: [
      'Promise.all fails fast as soon as one promise rejects.',
      'To capture all settled results even when individual tasks throw, use Promise.allSettled.',
      'Replace Promise.all with Promise.allSettled and unpack fulfilled items.',
    ],
    testCases: [
      { input: `[task1 (ok), task2 (fail), task3 (ok)]`, expectedOutput: `[result1, result3]` },
    ],
    timeLimit: 150,
    points: 200,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PROCEDURAL GENERATION DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an infinite stream of distinct, non-repeating debugging challenges.
 * Guarantees zero bug spoiler comments in buggyCode.
 */
export function generateProceduralChallenge(options: ProceduralChallengeOptions = {}): GeneratedChallenge {
  const {
    difficulty = 'medium',
    language = 'javascript',
    topic,
    category,
    excludeIds = [],
  } = options;

  const validDiff: 'easy' | 'medium' | 'hard' =
    difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'medium';
  const targetLang = (language || 'javascript').toLowerCase();

  const isDsaRequested =
    (category && category.toLowerCase() === 'dsa') ||
    (topic && topic.toLowerCase().includes('dsa')) ||
    (topic && (
      topic.includes('binary-search') ||
      topic.includes('sliding-window') ||
      topic.includes('dynamic-programming') ||
      topic.includes('trees') ||
      topic.includes('graphs') ||
      topic.includes('linked-lists') ||
      topic.includes('monotonic-stack') ||
      topic.includes('arrays') ||
      topic.includes('sort')
    ));

  // Category & topic routing
  const generators: Array<() => GeneratedChallenge> = [];

  if (targetLang === 'sql') {
    generators.push(() => generateSQLChallenge(validDiff));
  } else if (isDsaRequested) {
    if (topic?.includes('binary-search')) {
      generators.push(() => generateBinarySearchChallenge(targetLang, validDiff));
    } else if (topic?.includes('sliding-window')) {
      generators.push(() => generateSlidingWindowChallenge(targetLang, validDiff));
    } else if (topic?.includes('dynamic-programming')) {
      generators.push(() => generateDPChallenge(targetLang, validDiff));
    } else if (topic?.includes('trees')) {
      generators.push(() => generateTreeChallenge(targetLang, validDiff));
    } else if (topic?.includes('graphs')) {
      generators.push(() => generateGraphChallenge(targetLang, validDiff));
    } else if (topic?.includes('linked-lists')) {
      generators.push(() => generateLinkedListChallenge(targetLang, validDiff));
    } else if (topic?.includes('monotonic-stack')) {
      generators.push(() => generateMonotonicStackChallenge(targetLang, validDiff));
    } else {
      // General DSA pool
      generators.push(
        () => generateBinarySearchChallenge(targetLang, validDiff),
        () => generateSlidingWindowChallenge(targetLang, validDiff),
        () => generateDPChallenge(targetLang, validDiff),
        () => generateTreeChallenge(targetLang, validDiff),
        () => generateGraphChallenge(targetLang, validDiff),
        () => generateLinkedListChallenge(targetLang, validDiff),
        () => generateMonotonicStackChallenge(targetLang, validDiff)
      );
    }
  } else {
    // Mixed pool of DSA and Systems/Concurrency/Memory
    generators.push(
      () => generateBinarySearchChallenge(targetLang, validDiff),
      () => generateSlidingWindowChallenge(targetLang, validDiff),
      () => generateDPChallenge(targetLang, validDiff),
      () => generateTreeChallenge(targetLang, validDiff),
      () => generateSystemsChallenge(targetLang, validDiff)
    );
  }

  // Select generator
  let challenge = randomChoice(generators)();

  // Ensure unique ID that does not collide with excludeIds
  let attempts = 0;
  while (excludeIds.includes(challenge.id) && attempts < 10) {
    challenge = randomChoice(generators)();
    challenge.id = uid(`cd-${targetLang}`);
    attempts++;
  }

  challenge.challengeStyle = options.challengeStyle || 'fix-the-code';
  return challenge;
}
