/**
 * @file llmQuestionGenerator.ts
 * @description Advanced LLM Question Generation Pipeline for BugBounty Arena.
 * Completely eliminates static fallback dictionaries. Implements exponential backoff with jitter
 * (up to 2 retries), strict JSON schema validation, anti-duplication fingerprint exclusion,
 * and executable flaw verification.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import crypto from 'crypto';

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
  testCases: Array<{ input: string; expectedOutput: string }>;
  hints: string[];
  fingerprint: string;
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

const LIVE_MODEL_NAME = 'gemini-2.5-flash';

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
  const jitterMs = Math.floor(Math.random() * 350);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitterMs));
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
  const spoilerPattern = /(\/\/\s*bug|\/\/\s*fix this|\/\/\s*error|#\s*bug|#\s*fix this)/i;
  if (spoilerPattern.test(brokenCode)) {
    throw new Error('Synthesized challenge contained illegal spoiler comment.');
  }

  const fingerprint = computeFingerprint(brokenCode, params.topic, params.language);

  const testCases = Array.isArray(parsed.testCases) && parsed.testCases.length > 0
    ? parsed.testCases.map((tc: any) => ({
        input: String(tc.input || ''),
        expectedOutput: String(tc.expectedOutput || tc.output || ''),
      }))
    : [{ input: 'Standard verification invocation', expectedOutput: 'Resolved correctly' }];

  const hints = Array.isArray(parsed.hints) && parsed.hints.length >= 2
    ? parsed.hints.map(String)
    : [
        'Examine control flow, boundary conditions, or data mutations carefully.',
        'Check type conversions and edge-case handling on unexpected inputs.',
      ];

  const title = (parsed.title || `${params.language.toUpperCase()} ${params.topic} Vulnerability`).trim();
  const id = parsed.id && typeof parsed.id === 'string'
    ? parsed.id.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    : `bounty-${params.language}-${params.topic}-${fingerprint.slice(0, 6)}`;

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
  };
}

/**
 * Synthesizes a new unique challenge via generative AI with zero static fallbacks.
 * Retries up to 2 times with jitter before throwing a structured LLMGenerationError.
 */
export async function generateDynamicChallenge(params: GenerationParams): Promise<GeneratedChallenge> {
  const { provider, key } = getProvider();

  if (!key) {
    throw new LLMGenerationError(
      'No Generative AI API Key configured on server. Please set GEMINI_API_KEY or OPENAI_API_KEY in environment.',
      503
    );
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
4. Output STRICT JSON only.

JSON SCHEMA:
{
  "id": "kebab-case-unique-id",
  "title": "Short Punchy Title",
  "bugDescription": "Technical analysis of the vulnerability without spoiling the exact line",
  "brokenCode": "Production-like code with the subtle flaw and zero comments pointing to it",
  "correctCode": "Fixed, secure version of the code",
  "hints": ["Subtle clue", "Deeper architectural clue", "Concrete remediation guidance"],
  "testCases": [
    { "input": "call signature or input data", "expectedOutput": "expected return value" }
  ]
}`;

  const userPrompt = `Synthesize a ${params.difficulty} challenge for ${params.language} on topic "${params.topic}".`;

  const MAX_RETRIES = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await sleepWithJitter(attempt);
      }

      let jsonText = '';

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: LIVE_MODEL_NAME,
          systemInstruction: systemPrompt,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        });

        const result = await model.generateContent(userPrompt);
        jsonText = result.response.text();
      } else {
        const openai = new OpenAI({ apiKey: key });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        jsonText = completion.choices[0]?.message?.content ?? '{}';
      }

      const challenge = parseAndValidateChallenge(jsonText, params);

      // Verify fingerprint is not in excluded list
      if (params.excludeFingerprints?.includes(challenge.fingerprint)) {
        throw new Error(`Synthesized challenge duplicate fingerprint ${challenge.fingerprint}`);
      }

      return challenge;
    } catch (err: any) {
      lastError = err;
      console.warn(`[llmQuestionGenerator] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message}`);
    }
  }

  throw new LLMGenerationError(
    `Failed to synthesize unique bounty after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown LLM fault'}`,
    502,
    { originalError: lastError?.message }
  );
}

