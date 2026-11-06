/**
 * @file llmQuestionGenerator.ts
 * @description Advanced LLM Question Generation Pipeline for BugBounty Arena.
 * Implements exponential backoff with jitter (initial delay 500ms, max 2 retries per model),
 * multi-model cascade across stable model identifiers ["gemini-3.6-flash", "gemini-3.1-flash-lite",
 * "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemma-4"], 5-second timeout thresholds, and a deterministic
 * offline emergency fallback pool ({ source: "curated_fallback" }) ensuring zero 500/503 runtime crashes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import crypto from 'crypto';
import { getCuratedFallback } from '../fixtures/curatedChallenges.js';

export interface GeneratedChallenge {
  id: string;
  title: string;
  mode: 'dsa' | 'practical';
  language: string;
  topic: string;
  difficulty: 'NOVICE' | 'VETERAN' | 'CYBER_PUNK';
  bugDescription: string;
  brokenCode: string;
  correctCode?: string;
  testCases: Array<{ input: string; expectedOutput: string; hidden?: boolean }>;
  hints: string[];
  fingerprint: string;
  source?: 'curated_fallback' | 'llm' | 'procedural';
}

export interface GenerationParams {
  mode: 'dsa' | 'practical';
  language: string;
  topic: string;
  difficulty: 'NOVICE' | 'VETERAN' | 'CYBER_PUNK';
  excludeFingerprints?: string[];
  excludeIds?: string[];
}

export class LLMGenerationError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 502, details?: any) {
    super(message);
    this.name = 'LLMGenerationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Ordered list of candidate models for Gemini API.
 * Uses stable, high-throughput model identifiers to prevent 503 high-demand errors.
 */
const GEMINI_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemma-4',
    ].filter(Boolean) as string[]
  )
);

function getProvider(): { provider: 'gemini' | 'openai'; key: string } {
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

function computeFingerprint(code: string, topic: string, language: string): string {
  const normalized = code.replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(`${language}:${topic}:${normalized}`).digest('hex').slice(0, 16);
}

function sleepWithJitter(attempt: number): Promise<void> {
  const baseMs = 500 * Math.pow(2, attempt);
  const jitterMs = Math.floor(Math.random() * 250);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitterMs));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM generation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function parseAndValidateChallenge(raw: any, params: GenerationParams): GeneratedChallenge {
  let parsed = raw;
  if (typeof parsed === 'string') {
    let cleaned = parsed.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    parsed = JSON.parse(cleaned);
  }

  const brokenCode = parsed.brokenCode || parsed.buggyCode;
  const bugDescription = parsed.bugDescription || parsed.description;

  if (!brokenCode || typeof brokenCode !== 'string' || brokenCode.trim().length < 15) {
    throw new Error('Synthesized challenge brokenCode is missing or invalid.');
  }

  if (!bugDescription || typeof bugDescription !== 'string') {
    throw new Error('Synthesized challenge bugDescription is missing or invalid.');
  }

  // Ensure brokenCode does not have spoiler comments
  const spoilerPattern = /(\/\/\s*bug|\/\/\s*fix this|\/\/\s*error|#\s*bug|#\s*fix this|--\s*bug)/i;
  if (spoilerPattern.test(brokenCode)) {
    throw new Error('Synthesized challenge contained illegal spoiler comment.');
  }

  const fingerprint = computeFingerprint(brokenCode, params.topic, params.language);

  // Guarantee at least 2 visible test cases and at least 1 hidden edge case
  let testCases: Array<{ input: string; expectedOutput: string; hidden?: boolean }> = [];
  if (Array.isArray(parsed.testCases) && parsed.testCases.length > 0) {
    testCases = parsed.testCases.map((tc: any, idx: number) => ({
      input: String(tc.input || ''),
      expectedOutput: String(tc.expectedOutput || tc.output || ''),
      hidden: tc.hidden !== undefined ? Boolean(tc.hidden) : idx >= 2,
    }));
    // If none marked as hidden and we have more than 1 test case, designate the last one as hidden
    if (!testCases.some((tc) => tc.hidden) && testCases.length >= 2) {
      testCases[testCases.length - 1].hidden = true;
    }
  } else {
    testCases = [
      { input: 'Standard verification invocation', expectedOutput: 'Resolved correctly', hidden: false },
      { input: 'Boundary verification invocation', expectedOutput: 'Resolved correctly', hidden: false },
      { input: 'Hidden edge case invocation', expectedOutput: 'Resolved correctly', hidden: true },
    ];
  }

  const hints = Array.isArray(parsed.hints) && parsed.hints.length >= 2
    ? parsed.hints.map(String)
    : [
        'Examine control flow, boundary conditions, or data mutations carefully.',
        'Check type conversions and edge-case handling on unexpected inputs.',
      ];

  const title = (parsed.title || `${params.language.toUpperCase()} ${params.topic} Vulnerability`).trim();
  const id = parsed.id && typeof parsed.id === 'string'
    ? parsed.id.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    : `bounty-${params.language}-${params.topic.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${fingerprint.slice(0, 6)}`;

  return {
    id,
    title,
    mode: params.mode,
    language: params.language.toLowerCase(),
    topic: params.topic,
    difficulty: params.difficulty,
    bugDescription,
    brokenCode,
    correctCode: parsed.correctCode || undefined,
    testCases,
    hints,
    fingerprint,
    source: 'llm',
  };
}

/**
 * Synthesizes a new challenge via generative AI with resilient multi-model cascade,
 * exponential backoff with jitter, 5-second timeouts, and emergency curated fallback pool.
 */
export async function generateDynamicChallenge(params: GenerationParams): Promise<GeneratedChallenge> {
  const { provider, key } = getProvider();

  // If no API key configured, immediately serve vetted deterministic seed
  if (!key) {
    console.warn('[WARN] No AI Key configured. Serving vetted deterministic challenge seed.');
    const fallback = getCuratedFallback(params);
    return {
      ...fallback,
      difficulty: params.difficulty,
      mode: params.mode,
      source: 'curated_fallback',
    };
  }

  const exclusions = [
    ...(params.excludeFingerprints || []).map((f) => `FP:${f}`),
    ...(params.excludeIds || []),
  ];

  const systemPrompt = `You are the dynamic Bounty Synthesizer for "BugBounty Arena", an arcade debugging game.
You must generate ONE realistic code debugging challenge in ${params.language.toUpperCase()} under category [${params.mode.toUpperCase()}] and topic [${params.topic}].
Difficulty Clearance: ${params.difficulty}.

CRITICAL PROTOCOLS:
1. The brokenCode MUST contain exactly ONE legitimate, executable programming flaw (e.g., race condition, off-by-one, type coercion trap, memory leak, unhandled promise, SQL interpolation flaw, algorithmic time/space failure).
2. DO NOT include ANY comments pointing to or explaining the bug inside brokenCode (NO "// Bug:", NO "// Fix this", NO spoilers).
3. EXCLUDE_SIMILAR: [${exclusions.slice(0, 20).join(', ')}]. You must generate a novel, unique question that differs from these fingerprints.
4. Output STRICT JSON only. Include at least 2 visible test cases and 1 hidden edge case marked with "hidden": true.

JSON SCHEMA:
{
  "id": "kebab-case-unique-id",
  "title": "Short Punchy Title",
  "bugDescription": "Technical analysis of the vulnerability without spoiling the exact line",
  "brokenCode": "Production-like code with the subtle flaw and zero comments pointing to it",
  "correctCode": "Fixed, secure version of the code",
  "hints": ["Subtle clue", "Deeper architectural clue", "Concrete remediation guidance"],
  "testCases": [
    { "input": "call signature or input data", "expectedOutput": "expected return value", "hidden": false },
    { "input": "boundary test data", "expectedOutput": "expected return value", "hidden": false },
    { "input": "edge case data", "expectedOutput": "expected return value", "hidden": true }
  ]
}`;

  const userPrompt = `Synthesize a ${params.difficulty} challenge for ${params.language} on topic "${params.topic}".`;

  const RETRIES_PER_MODEL = 2; // Up to 2 retries per model candidate

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(key);

    for (const modelCandidate of GEMINI_MODELS) {
      for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
        try {
          if (attempt > 0) {
            await sleepWithJitter(attempt);
          }

          const model = genAI.getGenerativeModel({
            model: modelCandidate,
            systemInstruction: systemPrompt,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.8,
            },
          });

          // Enforce strict 5,000ms timeout threshold on external LLM call
          const result = await withTimeout(model.generateContent(userPrompt), 5000);
          const jsonText = result.response.text();
          const challenge = parseAndValidateChallenge(jsonText, params);

          // Verify fingerprint is not duplicate
          if (params.excludeFingerprints?.includes(challenge.fingerprint)) {
            throw new Error(`Synthesized challenge duplicate fingerprint ${challenge.fingerprint}`);
          }

          return challenge;
        } catch (modelErr: any) {
          const isLastAttemptForModel = attempt === RETRIES_PER_MODEL;
          if (isLastAttemptForModel) {
            console.warn(
              `[llmQuestionGenerator] Model candidate ${modelCandidate} exhausted after ${RETRIES_PER_MODEL + 1} attempts (${modelErr.message}). Cascading to next candidate...`
            );
          }
        }
      }
    }
  } else {
    // OpenAI provider path
    const openai = new OpenAI({ apiKey: key });
    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      try {
        if (attempt > 0) {
          await sleepWithJitter(attempt);
        }

        const completion = await withTimeout(
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.8,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          5000
        );

        const jsonText = completion.choices[0]?.message?.content ?? '{}';
        const challenge = parseAndValidateChallenge(jsonText, params);
        if (params.excludeFingerprints?.includes(challenge.fingerprint)) {
          throw new Error(`Synthesized challenge duplicate fingerprint ${challenge.fingerprint}`);
        }
        return challenge;
      } catch (err: any) {
        if (attempt === RETRIES_PER_MODEL) {
          console.warn(`[llmQuestionGenerator] OpenAI pipeline exhausted (${err.message}).`);
        }
      }
    }
  }

  // Deterministic Offline Emergency Fallback Pool (Demo Insurance)
  // If all external LLM calls fail or timeout, do not return 500 or throw unhandled exceptions.
  console.warn(
    '[WARN] Upstream API unavailable. Serving vetted deterministic challenge seed.'
  );

  const fallback = getCuratedFallback(params);
  return {
    ...fallback,
    difficulty: params.difficulty,
    mode: params.mode,
    source: 'curated_fallback',
  };
}
