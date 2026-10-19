import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';

// ---------------------------------------------------------------------------
// Challenge Controller — Generates dynamic buggy-code challenges via LLM.
// ---------------------------------------------------------------------------

const CHALLENGE_SYSTEM_PROMPT = `You are a code challenge generator for "CodeDuel: BugBounty Arena", an arcade-style debugging game.

Generate a JavaScript/TypeScript code challenge that contains ONE intentional bug the player must find and fix.

Return ONLY valid JSON with this exact schema:
{
  "id": "unique-slug-id",
  "title": "Challenge Title",
  "description": "Brief description of what the code should do",
  "difficulty": "easy" | "medium" | "hard",
  "category": "logic" | "async" | "dom" | "security" | "performance" | "syntax",
  "buggyCode": "// The code with the intentional bug",
  "correctCode": "// The fixed version of the code",
  "bugLine": <number>,
  "bugDescription": "Explanation of the bug",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "testCases": [
    { "input": "description of input", "expectedOutput": "expected result" }
  ],
  "timeLimit": <seconds>,
  "points": <number>
}`;

export async function generateChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const { difficulty = 'medium', category } = req.body as {
      difficulty?: string;
      category?: string;
    };

    const userPrompt = `Generate a ${difficulty} difficulty${category ? ` ${category} category` : ''} code debugging challenge. 
Make the bug realistic but findable. The code should be 10-40 lines long.
The challenge should be fun and educational.`;

    const challenge = await queryLLM(CHALLENGE_SYSTEM_PROMPT, userPrompt);
    res.json({ success: true, challenge });
  } catch (err) {
    next(err);
  }
}

export async function reviewCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { originalCode, fixedCode, challengeId } = req.body as {
      originalCode: string;
      fixedCode: string;
      challengeId: string;
    };

    const reviewPrompt = `You are a code review engine. Compare the buggy code with the player's fix.

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
