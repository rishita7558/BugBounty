import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// LLM Service — Routes requests to Gemini or OpenAI based on available keys.
// Zero business logic; purely a structured-JSON proxy layer.
// ---------------------------------------------------------------------------

type LLMProvider = 'gemini' | 'openai';

function getProvider(): { provider: LLMProvider; key: string } {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    return { provider: 'gemini', key: geminiKey };
  }
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    return { provider: 'openai', key: openaiKey };
  }
  throw new Error('No valid LLM API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env');
}

/**
 * Attempt to extract valid JSON from a potentially malformed LLM response.
 * Handles cases where the response is truncated or wrapped in markdown fences.
 */
function safeParseJSON(text: string): unknown {
  // Strip markdown code fences if present
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

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // If truncated, try to repair by closing open strings/brackets
    console.warn('[LLM] JSON parse failed, attempting repair...');
  }

  // Attempt repair: find the last valid closing point
  let repaired = cleaned;

  // Close any unterminated strings
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Close open arrays and objects
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;

  for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
  for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

  try {
    return JSON.parse(repaired);
  } catch {
    throw new Error('Failed to parse LLM response as JSON even after repair attempt');
  }
}

/**
 * Send a structured prompt to the configured LLM and return the parsed JSON.
 */
export async function queryLLM(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const { provider, key } = getProvider();

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 8192,
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    return safeParseJSON(text);
  }

  // OpenAI path
  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  return safeParseJSON(content);
}
