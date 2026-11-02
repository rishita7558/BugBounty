/**
 * @file challenge.controller.ts
 * @description Controller handling challenge generation and submission evaluation requests.
 * Formulates system prompts, handles question rotation with excludeIds, and routes payloads to the LLM service.
 */

import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';
import {
  recordQuestion,
  getRecentExclusionContext,
} from '../services/questionHistoryService.js';
import { generateDynamicChallenge } from '../services/llmQuestionGenerator.js';

/**
 * Express handler to generate a new debugging challenge with topic selection,
 * challenge style targeting, and multi-layered duplicate elimination.
 *
 * @param req Request containing difficulty, category, topic, challengeStyle, excludeIds, recentFingerprints, and language.
 * @param res Response delivering the normalized unique challenge object.
 * @param next Express error forwarding function.
 */
export async function generateChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      difficulty = 'medium',
      category,
      mode,
      topic,
      challengeStyle = 'fix-the-code',
      excludeIds = [],
      recentFingerprints = [],
      language = 'javascript',
    } = req.body as {
      difficulty?: string;
      category?: string;
      mode?: 'dsa' | 'practical';
      topic?: string;
      challengeStyle?: string;
      excludeIds?: string[];
      recentFingerprints?: string[];
      language?: string;
    };

    const targetLang = (language || 'javascript').toLowerCase();
    const historyExclusions = getRecentExclusionContext(targetLang, 15);
    const combinedExclusions = Array.from(new Set([...excludeIds, ...historyExclusions]));

    // Normalize difficulty tier
    let normalizedDifficulty: 'NOVICE' | 'VETERAN' | 'CYBER_PUNK' = 'VETERAN';
    const diffLower = difficulty.toLowerCase();
    if (diffLower === 'novice' || diffLower === 'easy') {
      normalizedDifficulty = 'NOVICE';
    } else if (diffLower === 'cyber_punk' || diffLower === 'cyberpunk' || diffLower === 'hard') {
      normalizedDifficulty = 'CYBER_PUNK';
    }

    // Determine category / mode
    const determinedMode: 'dsa' | 'practical' = mode === 'dsa' || category === 'dsa' ? 'dsa' : 'practical';
    const chosenTopic = topic || (determinedMode === 'dsa' ? 'arrays-strings' : 'async-event-loop');

    const dynamicChallenge = await generateDynamicChallenge({
      mode: determinedMode,
      language: targetLang,
      topic: chosenTopic,
      difficulty: normalizedDifficulty,
      excludeFingerprints: recentFingerprints,
      excludeIds: combinedExclusions,
    });

    const pointsMap = { NOVICE: 100, VETERAN: 250, CYBER_PUNK: 500 };
    const timeLimitMap = { NOVICE: 120, VETERAN: 150, CYBER_PUNK: 180 };

    const challenge = {
      id: dynamicChallenge.id,
      title: dynamicChallenge.title,
      description: dynamicChallenge.bugDescription,
      bugDescription: dynamicChallenge.bugDescription,
      difficulty: dynamicChallenge.difficulty === 'NOVICE' ? 'easy' : dynamicChallenge.difficulty === 'VETERAN' ? 'medium' : 'hard',
      difficultyTier: dynamicChallenge.difficulty,
      category: dynamicChallenge.mode,
      mode: dynamicChallenge.mode,
      challengeStyle,
      language: dynamicChallenge.language,
      topic: dynamicChallenge.topic,
      brokenCode: dynamicChallenge.brokenCode,
      buggyCode: dynamicChallenge.brokenCode,
      correctCode: dynamicChallenge.correctCode,
      hints: dynamicChallenge.hints,
      testCases: dynamicChallenge.testCases,
      timeLimit: timeLimitMap[dynamicChallenge.difficulty],
      points: pointsMap[dynamicChallenge.difficulty],
      fingerprint: dynamicChallenge.fingerprint,
    };

    // Prevent ID collisions with excluded challenges
    if (excludeIds.includes(challenge.id)) {
      challenge.id = `${challenge.id}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Register approved unique challenge in persistent disk history
    recordQuestion(challenge);

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
