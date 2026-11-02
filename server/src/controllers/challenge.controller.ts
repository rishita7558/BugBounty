/**
 * @file challenge.controller.ts
 * @description Controller handling challenge generation and submission evaluation requests.
 * Formulates system prompts, handles question rotation with excludeIds, and routes payloads to the LLM service.
 */

import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';

/**
 * System prompt defining the strict JSON schema required for code debugging challenges.
 */
const CHALLENGE_SYSTEM_PROMPT = `You are a code challenge generator for "CodeDuel: BugBounty Arena", an arcade-style debugging game.

Generate a realistic code debugging challenge in the requested programming language (JavaScript, TypeScript, or Python) containing ONE intentional bug the player must find and fix.

Return ONLY valid JSON with this exact schema:
{
  "id": "unique-slug-id",
  "title": "Challenge Title",
  "description": "Brief description of what the code should do and what is failing",
  "difficulty": "easy" | "medium" | "hard",
  "category": "logic" | "async" | "security" | "types" | "memory" | "syntax",
  "language": "javascript" | "typescript" | "python",
  "topic": "topic-slug-or-domain",
  "buggyCode": "// The code with the intentional bug",
  "correctCode": "// The fixed version of the code",
  "bugLine": <number>,
  "bugDescription": "Explanation of the bug",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "testCases": [
    { "input": "description of input or invocation", "expectedOutput": "expected result" }
  ],
  "timeLimit": <seconds>,
  "points": <number>
}`;

/**
 * Express handler to generate a new debugging challenge with topic selection and question rotation.
 *
 * @param req Request containing difficulty, category, topic, excludeIds, and language.
 * @param res Response delivering the normalized challenge object.
 * @param next Express error forwarding function.
 */
export async function generateChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      difficulty = 'medium',
      category,
      topic,
      excludeIds = [],
      language = 'javascript',
    } = req.body as {
      difficulty?: string;
      category?: string;
      topic?: string;
      excludeIds?: string[];
      language?: string;
    };

    const targetLang = (language || 'javascript').toLowerCase();

    // Construct prompt with language specialization, topic targeting, and question rotation
    const promptSegments = [
      `Generate a ${difficulty} difficulty code debugging challenge in ${targetLang.toUpperCase()}.`,
      topic ? `Target Topic/Vulnerability Archetype: "${topic}". Focus directly on bugs in this domain.` : '',
      category && !topic ? `Vulnerability Category: ${category}.` : '',
      excludeIds.length > 0
        ? `QUESTION ROTATION ENFORCEMENT: Do NOT generate any of the following challenge IDs or repeat their scenarios: [${excludeIds.slice(0, 30).join(', ')}]. You MUST generate a completely new, distinct challenge with a fresh unique slug id.`
        : '',
      `The code should be 10-40 lines long, realistic, educational, and fun. Include exactly one bug.`,
    ].filter(Boolean);

    const userPrompt = promptSegments.join('\n');

    const challenge: any = await queryLLM(CHALLENGE_SYSTEM_PROMPT, userPrompt);

    // Normalize time limits and arcade points so players have balanced gameplay
    const defaultTimeLimits: Record<string, number> = { easy: 120, medium: 150, hard: 180 };
    if (!challenge.timeLimit || challenge.timeLimit < 60) {
      challenge.timeLimit = defaultTimeLimits[difficulty.toLowerCase()] || 120;
    }
    if (!challenge.points) {
      challenge.points = difficulty === 'hard' ? 500 : difficulty === 'medium' ? 250 : 100;
    }
    challenge.difficulty = difficulty.toLowerCase();
    challenge.language = challenge.language || targetLang;
    challenge.topic = challenge.topic || topic || challenge.category || 'general';

    // Prevent ID collisions with excluded challenges
    if (excludeIds.includes(challenge.id)) {
      challenge.id = `${challenge.id}-${Math.random().toString(36).substring(2, 6)}`;
    }

    res.json({ success: true, challenge });
  } catch (err) {
    next(err);
  }
}

/**
 * Express handler to evaluate a submitted player solution against the original buggy code.
 *
 * @param req Request containing originalCode, fixedCode, and challengeId in the body.
 * @param res Response delivering the evaluation review result.
 * @param next Express error forwarding function.
 */
export async function reviewCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { originalCode, fixedCode, challengeId } = req.body as {
      originalCode: string;
      fixedCode: string;
      challengeId: string;
    };

    const reviewPrompt = `You are a code review engine for an arcade debugging arena. Compare the buggy code with the player's fix.

Return ONLY valid JSON:
{
  "correct": <boolean>,
  "score": <0-100>,
  "feedback": "Explanation of what the player did right/wrong",
  "suggestions": ["improvement suggestions"],
  "comboBonus": <boolean — true if fix is elegant>
}`;

    const userPrompt = `Challenge ID: ${challengeId}
    
Original buggy code:
\`\`\`
${originalCode}
\`\`\`

Player's submitted fix:
\`\`\`
${fixedCode}
\`\`\`

Evaluate the fix.`;

    const review = await queryLLM(reviewPrompt, userPrompt);
    res.json({ success: true, review });
  } catch (err) {
    next(err);
  }
}
