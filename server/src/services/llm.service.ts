/**
 * @file llm.service.ts
 * @description Generative AI and automated code analysis service gateway.
 * Implements provider abstraction (Google Gemini and OpenAI), strict JSON schema extraction,
 * question rotation filtering, and deterministic offline fallbacks for all supported languages
 * (JavaScript, TypeScript, Python, Rust, Go, C++, Java, SQL) with zero bug spoiler comments.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { generateProceduralChallenge } from './proceduralChallengeGenerator.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ].filter(Boolean) as string[]
  )
);

type LLMProvider = 'gemini' | 'openai';

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

export async function queryLLM(systemPrompt: string, userPrompt: string): Promise<any> {
  const { provider, key } = getProvider();

  if (provider === 'gemini' && key) {
    for (const modelCandidate of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelCandidate,
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
        console.warn(`[LLM Service] Gemini candidate ${modelCandidate} failed: ${err.message}. Cascading...`);
      }
    }
  }

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

  if (
    systemPrompt.includes('code review') ||
    userPrompt.includes('Evaluate the fix') ||
    systemPrompt.includes('code evaluation engine')
  ) {
    // When LLM is offline or unconfigured, return null to trigger deterministic offline evaluation
    return null;
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

  const difficultyMatch = (userPrompt.match(/easy|medium|hard/i) || ['medium'])[0].toLowerCase();

  let targetLang = 'javascript';
  const langMatch = userPrompt.match(/typescript|python|rust|go|cpp|c\+\+|java|sql|javascript/i);
  if (langMatch) {
    const raw = langMatch[0].toLowerCase();
    targetLang = raw === 'c++' ? 'cpp' : raw;
  }

  const excludeMatch = userPrompt.match(/\[([a-zA-Z0-9_,\s-]+)\]/);
  const excludeList = excludeMatch ? excludeMatch[1].split(',').map((s) => s.trim()) : [];

  const topicMatch = userPrompt.match(/Target Topic\/Vulnerability Archetype: "([^"]+)"/i);
  const targetTopic = topicMatch ? topicMatch[1] : undefined;

  const categoryMatch = userPrompt.match(/Vulnerability Category: ([a-zA-Z0-9_-]+)/i);
  const targetCategory = categoryMatch ? categoryMatch[1] : undefined;

  return generateProceduralChallenge({
    difficulty: difficultyMatch,
    language: targetLang,
    topic: targetTopic,
    category: targetCategory,
    excludeIds: excludeList,
  });
}
