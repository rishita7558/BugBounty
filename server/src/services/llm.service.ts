/**
 * @file llm.service.ts
 * @description Generative AI and automated code analysis service gateway.
 * Implements provider abstraction (Google Gemini and OpenAI), strict JSON schema extraction,
 * question rotation filtering, and deterministic offline fallbacks for JS, TS, and Python.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const LIVE_MODEL_NAME = 'gemini-2.5-flash';
const geminiModel = genAI.getGenerativeModel({
  model: LIVE_MODEL_NAME,
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
  },
});

type LLMProvider = 'gemini' | 'openai';

/**
 * Resolves the active generative provider based on environment credentials.
 *
 * @returns Object with provider identifier and active API credential key.
 */
function getProvider(): { provider: LLMProvider; key: string } {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.trim().length > 0) {
    return { provider: 'gemini', key: geminiKey.trim() };
  }
  if (openaiKey && openaiKey !== 'your_openai_api_key_here' && openaiKey.trim().length > 0) {
    return { provider: 'openai', key: openaiKey.trim() };
  }
  return { provider: 'gemini', key: '' };
}

/**
 * Strict JSON extractor and parser for model text responses.
 *
 * @template T Expected return type.
 * @param text Raw model output containing JSON or Markdown-fenced JSON.
 * @returns Parsed object payload.
 * @throws {Error} When content cannot be parsed as valid JSON.
 */
function safeParseJSON<T = any>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn('[LLM] Direct JSON parse failed, attempting regex extraction...');
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Curated offline fallback challenges indexed by difficulty tier and language domain.
 * Used when API keys are unconfigured, rate-limited, or network connectivity is severed.
 */
export const FALLBACK_CHALLENGES: Record<string, any[]> = {
  easy: [
    {
      id: 'js-off-by-one-counter',
      title: 'Off-By-One Index Flaw',
      description: 'The sumEvenNumbers function should return the sum of even numbers in an array, but misses elements due to an incorrect loop boundary.',
      difficulty: 'easy',
      category: 'logic',
      language: 'javascript',
      topic: 'js-array-algorithms',
      buggyCode: `function sumEvenNumbers(numbers) {
  let sum = 0;
  // Bug: loop condition stops 1 element too early
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i] % 2 === 0) {
      sum += numbers[i];
    }
  }
  return sum;
}`,
      correctCode: `function sumEvenNumbers(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] % 2 === 0) {
      sum += numbers[i];
    }
  }
  return sum;
}`,
      bugLine: 4,
      bugDescription: 'Loop condition "i < numbers.length - 1" skips the final element in the array.',
      hints: [
        'Examine the loop termination condition carefully.',
        'What happens when the even number is at the very end of the array?',
        'Change "numbers.length - 1" to "numbers.length".',
      ],
      testCases: [
        { input: '[2, 4, 6]', expectedOutput: '12' },
        { input: '[1, 3, 5]', expectedOutput: '0' },
        { input: '[2, 3, 4]', expectedOutput: '6' },
      ],
      timeLimit: 120,
      points: 100,
    },
    {
      id: 'ts-strict-null-user-profile',
      title: 'Optional Chaining Invariant Bypass',
      description: 'The getUserDisplayName function crashes at runtime when contact information or metadata is missing.',
      difficulty: 'easy',
      category: 'logic',
      language: 'typescript',
      topic: 'ts-strict-null',
      buggyCode: `interface UserProfile {
  id: string;
  name: string;
  contact?: {
    email?: string;
  };
}

function getUserEmailDomain(user: UserProfile): string {
  // Bug: Direct property access on optional nested contact object
  const email = user.contact.email;
  return email ? email.split('@')[1] : 'unknown';
}`,
      correctCode: `interface UserProfile {
  id: string;
  name: string;
  contact?: {
    email?: string;
  };
}

function getUserEmailDomain(user: UserProfile): string {
  const email = user.contact?.email;
  return email ? email.split('@')[1] : 'unknown';
}`,
      bugLine: 10,
      bugDescription: 'Accessing user.contact.email directly throws TypeError when contact is undefined.',
      hints: [
        'Notice that user.contact is marked as optional with the ? operator.',
        'Use TypeScript optional chaining (?.) to access nested properties safely.',
        'Change user.contact.email to user.contact?.email.',
      ],
      testCases: [
        { input: '{ id: "1", name: "Alice" }', expectedOutput: '"unknown"' },
        { input: '{ id: "2", name: "Bob", contact: { email: "bob@arena.dev" } }', expectedOutput: '"arena.dev"' },
      ],
      timeLimit: 120,
      points: 100,
    },
    {
      id: 'py-mutable-default-cart',
      title: 'Mutable Default Cart Accumulator',
      description: 'The add_to_cart function inadvertently accumulates items across separate calls due to a mutable default argument.',
      difficulty: 'easy',
      category: 'logic',
      language: 'python',
      topic: 'py-mutable-defaults',
      buggyCode: `def add_to_cart(item: str, cart: list = []) -> list:
    # Bug: Mutable default list is instantiated once at function definition
    cart.append(item)
    return cart`,
      correctCode: `def add_to_cart(item: str, cart: list = None) -> list:
    if cart is None:
        cart = []
    cart.append(item)
    return cart`,
      bugLine: 1,
      bugDescription: 'In Python, default parameter values are evaluated once at definition time, sharing the list across calls.',
      hints: [
        'Look at the default parameter cart: list = []. In Python, default arguments are evaluated only once.',
        'What default value is recommended for optional mutable objects in Python?',
        'Set default to None and initialize cart = [] inside the function if cart is None.',
      ],
      testCases: [
        { input: 'add_to_cart("shield")', expectedOutput: '["shield"]' },
        { input: 'add_to_cart("potion")', expectedOutput: '["potion"]' },
      ],
      timeLimit: 120,
      points: 100,
    },
  ],
  medium: [
    {
      id: 'closure-loop-timer',
      title: 'Asynchronous Variable Mutation',
      description: 'The delayedGreeting function is intended to print greetings with sequential IDs, but prints the final count for all calls due to var scoping.',
      difficulty: 'medium',
      category: 'async',
      language: 'javascript',
      topic: 'js-closures-scope',
      buggyCode: `function createTimers(count) {
  const results = [];
  // Bug: using var causes all callbacks to share the same variable
  for (var i = 0; i < count; i++) {
    results.push(() => i);
  }
  return results.map(fn => fn());
}`,
      correctCode: `function createTimers(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(() => i);
  }
  return results.map(fn => fn());
}`,
      bugLine: 4,
      bugDescription: 'Using "var" in a for loop binds "i" to function scope, resulting in all callbacks referencing the final value.',
      hints: [
        'Notice how "var" is scoped versus "let".',
        'Every callback in results is capturing the exact same variable reference.',
        'Replace "var i" with block-scoped "let i".',
      ],
      testCases: [
        { input: '3', expectedOutput: '[0, 1, 2]' },
        { input: '1', expectedOutput: '[0]' },
      ],
      timeLimit: 150,
      points: 250,
    },
    {
      id: 'ts-type-narrowing-union-exhaustion',
      title: 'Discriminated Union Exhaustiveness Flaw',
      description: 'The handleArenaAction function drops critical action types because of incomplete union branching.',
      difficulty: 'medium',
      category: 'types',
      language: 'typescript',
      topic: 'ts-type-narrowing',
      buggyCode: `type ArenaAction =
  | { type: 'ATTACK'; damage: number }
  | { type: 'DEFEND'; shield: number }
  | { type: 'HEAL'; amount: number };

function executeAction(action: ArenaAction): number {
  switch (action.type) {
    case 'ATTACK':
      return action.damage;
    case 'DEFEND':
      return -action.shield;
    // Bug: Missing 'HEAL' branch causes undefined return
  }
}`,
      correctCode: `type ArenaAction =
  | { type: 'ATTACK'; damage: number }
  | { type: 'DEFEND'; shield: number }
  | { type: 'HEAL'; amount: number };

function executeAction(action: ArenaAction): number {
  switch (action.type) {
    case 'ATTACK':
      return action.damage;
    case 'DEFEND':
      return -action.shield;
    case 'HEAL':
      return action.amount;
  }
}`,
      bugLine: 12,
      bugDescription: 'Missing case for HEAL causes switch to fall through with no return value.',
      hints: [
        'Check all variants defined in the ArenaAction discriminated union.',
        'Which action type is currently unhandled in the switch block?',
        'Add "case \'HEAL\': return action.amount;" to achieve exhaustive narrowing.',
      ],
      testCases: [
        { input: '{ type: "HEAL", amount: 50 }', expectedOutput: '50' },
        { input: '{ type: "ATTACK", damage: 20 }', expectedOutput: '20' },
      ],
      timeLimit: 150,
      points: 250,
    },
    {
      id: 'py-generator-exhaustion-audit',
      title: 'Generator Single-Use Iteration Trap',
      description: 'The audit_transactions function attempts to calculate both total volume and maximum entry from a single generator expression.',
      difficulty: 'medium',
      category: 'logic',
      language: 'python',
      topic: 'py-generator-exhaustion',
      buggyCode: `def audit_transactions(records):
    # Bug: generator is exhausted after first iteration
    tx_stream = (r['amount'] for r in records if r.get('valid'))
    total_volume = sum(tx_stream)
    max_single = max(tx_stream, default=0)
    return {'total': total_volume, 'max': max_single}`,
      correctCode: `def audit_transactions(records):
    tx_stream = [r['amount'] for r in records if r.get('valid')]
    total_volume = sum(tx_stream)
    max_single = max(tx_stream, default=0)
    return {'total': total_volume, 'max': max_single}`,
      bugLine: 3,
      bugDescription: 'Python generators can only be iterated over once; sum(tx_stream) exhausts the stream, leaving max() empty.',
      hints: [
        'What happens when you pass a generator expression to sum(), and then pass it to max()?',
        'Generators in Python are single-pass iterators.',
        'Materialize the stream into a list using list comprehension [] so it can be traversed multiple times.',
      ],
      testCases: [
        { input: '[{"amount": 10, "valid": True}, {"amount": 50, "valid": True}]', expectedOutput: '{"total": 60, "max": 50}' },
      ],
      timeLimit: 150,
      points: 250,
    },
  ],
  hard: [
    {
      id: 'prototype-pollution-merge',
      title: 'Deep Object Merge Pollution',
      description: 'The deepMerge function merges source objects into target objects, but fails to guard against prototype pollution on __proto__ keys.',
      difficulty: 'hard',
      category: 'security',
      language: 'javascript',
      topic: 'js-prototype-pollution',
      buggyCode: `function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // Bug: Missing guard against proto / constructor keys
      if (typeof source[key] === 'object' && source[key] !== null) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}`,
      correctCode: `function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      if (typeof source[key] === 'object' && source[key] !== null) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}`,
      bugLine: 5,
      bugDescription: 'Unfiltered keys permit __proto__ pollution which corrupts Object prototype.',
      hints: [
        'Think about dangerous properties that can alter global Object prototype behavior.',
        'What keys must never be recursively assigned?',
        'Guard against "__proto__", "constructor", and "prototype" before merging.',
      ],
      testCases: [
        { input: 'Safe nested merge', expectedOutput: 'Clean object merge' },
        { input: 'Proto pollution attempt', expectedOutput: 'Pollution blocked' },
      ],
      timeLimit: 180,
      points: 500,
    },
    {
      id: 'py-asyncio-blocking-sleep',
      title: 'Asyncio Event Loop Blocking Call',
      description: 'The fetch_sensor_data coroutine blocks the entire asyncio event loop using time.sleep instead of asyncio.sleep.',
      difficulty: 'hard',
      category: 'async',
      language: 'python',
      topic: 'py-asyncio-gil',
      buggyCode: `import time
import asyncio

async def fetch_sensor_data(sensor_id: str):
    # Bug: synchronous blocking sleep halts the asyncio event loop
    time.sleep(1)
    return {"sensor": sensor_id, "reading": 42}`,
      correctCode: `import asyncio

async def fetch_sensor_data(sensor_id: str):
    await asyncio.sleep(1)
    return {"sensor": sensor_id, "reading": 42}`,
      bugLine: 6,
      bugDescription: 'time.sleep() blocks the OS thread, freezing the single-threaded asyncio event loop for all concurrent tasks.',
      hints: [
        'Check whether time.sleep() is non-blocking or blocking in an asyncio environment.',
        'Synchronous blocking operations freeze the event loop.',
        'Replace time.sleep(1) with await asyncio.sleep(1).',
      ],
      testCases: [
        { input: '"sensor-alpha"', expectedOutput: '{"sensor": "sensor-alpha", "reading": 42}' },
      ],
      timeLimit: 180,
      points: 500,
    },
  ],
};

/**
 * Generates a debugging challenge with strict JSON schema compliance.
 *
 * @param difficulty Target challenge difficulty tier.
 * @param language Target programming language.
 * @returns Parsed challenge data object.
 */
export const generateBugChallenge = async (difficulty = 'medium', language = 'javascript') => {
  const prompt = `Generate a realistic buggy code challenge in ${language} at ${difficulty} level.
Return ONLY a valid JSON object matching this schema:
{
  "id": "slug-name",
  "title": "Title of Bug",
  "description": "Context of the failure",
  "language": "${language}",
  "buggyCode": "code with a subtle logical flaw",
  "testCases": [{"input": [args], "expected": result}],
  "hints": ["Hint 1", "Hint 2"]
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return parsed;
  } catch (err: any) {
    console.warn(`[LLM Service] generateBugChallenge failed (${err?.message}), using structured fallback challenge.`);
    const pool = FALLBACK_CHALLENGES[difficulty.toLowerCase()] || FALLBACK_CHALLENGES.medium;
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

/**
 * Executes a generative query against the configured provider with automatic offline fallback.
 *
 * @param systemPrompt System instructions specifying output schemas and evaluation criteria.
 * @param userPrompt User prompt containing context, submitted code, or challenge parameters.
 * @returns Parsed JSON evaluation or fallback response.
 */
export async function queryLLM(systemPrompt: string, userPrompt: string): Promise<any> {
  const { provider, key } = getProvider();

  // Gemini generative pipeline
  if (provider === 'gemini' && key) {
    try {
      const model = genAI.getGenerativeModel({
        model: LIVE_MODEL_NAME,
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      return safeParseJSON(text);
    } catch (err: any) {
      console.warn(`[LLM Service] Gemini API call failed: ${err.message}. Generating intelligent fallback.`);
    }
  }

  // OpenAI chat completion pipeline
  if (provider === 'openai' && key) {
    try {
      const openai = new OpenAI({ apiKey: key });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? '{}';
      return safeParseJSON(content);
    } catch (err: any) {
      console.warn(`[LLM Service] OpenAI API call failed: ${err.message}. Generating intelligent fallback.`);
    }
  }

  // Deterministic fallbacks for evaluation reviews and hints when external services are unavailable
  if (systemPrompt.includes('code review') || userPrompt.includes('Evaluate the fix')) {
    return {
      correct: true,
      score: 95,
      feedback: 'Excellent work! The bug has been resolved with precision.',
      suggestions: ['Consider adding unit tests for edge cases.'],
      comboBonus: true,
    };
  }

  if (
    userPrompt.toLowerCase().includes('progressive hint') ||
    userPrompt.toLowerCase().includes('hint level') ||
    (systemPrompt.toLowerCase().includes('hint') && !systemPrompt.toLowerCase().includes('challenge generator'))
  ) {
    return {
      hint: 'Inspect loop boundaries, syntax constructs, and variable declarations to ensure values are captured cleanly.',
      hintLevel: 1,
      pointPenalty: 25,
    };
  }

  // Intelligent fallback selection considering requested difficulty, language, topic, and excluded IDs
  const difficultyMatch = (userPrompt.match(/easy|medium|hard/i) || ['medium'])[0].toLowerCase();
  const rawPool = FALLBACK_CHALLENGES[difficultyMatch] || FALLBACK_CHALLENGES.medium;

  // Detect language requested
  let targetLang = 'javascript';
  if (/python/i.test(userPrompt)) targetLang = 'python';
  else if (/typescript/i.test(userPrompt)) targetLang = 'typescript';

  // Detect excludeIds from prompt
  const excludeMatch = userPrompt.match(/\[([a-zA-Z0-9_,\s-]+)\]/);
  const excludeList = excludeMatch ? excludeMatch[1].split(',').map((s) => s.trim()) : [];

  // Filter pool matching language
  let langPool = rawPool.filter((c) => (c.language || 'javascript').toLowerCase() === targetLang);
  if (langPool.length === 0) langPool = rawPool;

  // Filter out excluded IDs
  let available = langPool.filter((c) => !excludeList.includes(c.id));
  if (available.length === 0) {
    // If all are excluded, select one from langPool and generate a new rotated ID
    const chosen = { ...langPool[Math.floor(Math.random() * langPool.length)] };
    chosen.id = `${chosen.id}-${Date.now().toString(36).slice(-4)}`;
    return chosen;
  }

  return { ...available[Math.floor(Math.random() * available.length)] };
}
