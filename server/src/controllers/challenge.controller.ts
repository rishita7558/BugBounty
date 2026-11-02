/**
 * @file challenge.controller.ts
 * @description Controller handling challenge generation and submission evaluation requests.
 * Formulates system prompts, handles question rotation with excludeIds, and routes payloads to the LLM service.
 */

import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';
import {
  checkForDuplicate,
  recordQuestion,
  getRecentExclusionContext,
} from '../services/questionHistoryService.js';
import { generateProceduralChallenge } from '../services/proceduralChallengeGenerator.js';

/**
 * System prompt defining the strict JSON schema required for code debugging challenges.
 */
const CHALLENGE_SYSTEM_PROMPT = `You are a code challenge generator for "CodeDuel: BugBounty Arena", an arcade-style debugging game.

Generate a realistic code debugging challenge in the requested programming language (JavaScript, TypeScript, Python, Rust, Go, C++, Java, or SQL) containing ONE intentional bug the player must find and fix.
Support the requested challenge style:
- "find-the-bug": Player must locate and explain the exact bug.
- "fix-the-code": Player must rewrite the buggy logic into a working implementation.
- "predict-the-output": Focus on what wrong value is returned versus expected output.
- "logic-hunt": Subtle semantic or algorithmic flaw in control flow.
- "complete-the-code": Missing condition, base case, or parameterization.
- "code-review": Comprehensive vulnerability inspection with security/concurrency impacts.
- "edge-case-hunt": Code passes standard inputs but crashes on extreme/boundary inputs.

When a DSA (Data Structures & Algorithms) topic is requested or applicable, generate classic or advanced algorithmic challenges (Binary Search, Sliding Window, Two Pointers, Dynamic Programming, Trees/BST, Graphs/BFS/DFS, Linked Lists, Heaps/Priority Queues, Monotonic Stack, Backtracking, Sorting/QuickSelect) with authentic algorithmic logic flaws.

CRITICAL INSTRUCTIONS:
- Absolutely DO NOT include code comments in buggyCode that explain, hint at, or point out where the bug is (NO "// Bug:", NO "# Bug:", NO "// Fix this", NO spoiler comments).
- The code must look like authentic, clean production code.
- Provide clear testCases and hints in the JSON schema.

Return ONLY valid JSON with this exact schema:
{
  "id": "unique-slug-id",
  "title": "Challenge Title",
  "description": "Brief description of what the code should do and what is failing",
  "difficulty": "easy" | "medium" | "hard",
  "category": "dsa" | "logic" | "async" | "security" | "types" | "memory" | "syntax",
  "challengeStyle": "find-the-bug" | "fix-the-code" | "predict-the-output" | "logic-hunt" | "complete-the-code" | "code-review" | "edge-case-hunt",
  "language": "javascript" | "typescript" | "python" | "rust" | "go" | "cpp" | "java" | "sql",
  "topic": "topic-slug-or-domain",
  "buggyCode": "clean code with the intentional bug and zero spoiler comments",
  "correctCode": "the fixed version of the code",
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
      topic,
      challengeStyle = 'fix-the-code',
      excludeIds = [],
      recentFingerprints = [],
      language = 'javascript',
    } = req.body as {
      difficulty?: string;
      category?: string;
      topic?: string;
      challengeStyle?: string;
      excludeIds?: string[];
      recentFingerprints?: string[];
      language?: string;
    };

    const targetLang = (language || 'javascript').toLowerCase();
    const historyExclusions = getRecentExclusionContext(targetLang, 15);

    let challenge: any = null;
    let attempts = 0;
    const MAX_RETRIES = 3;

    while (attempts < MAX_RETRIES) {
      attempts++;

      // Construct prompt with language specialization, topic targeting, and duplicate exclusion
      const promptSegments = [
        `Generate a ${difficulty} difficulty code debugging challenge in ${targetLang.toUpperCase()}.`,
        `Challenge Style: ${challengeStyle.toUpperCase().replace(/-/g, ' ')}.`,
        topic ? `Target Topic/Vulnerability Archetype: "${topic}". Focus directly on bugs in this domain.` : '',
        category && !topic ? `Vulnerability Category: ${category}.` : '',
        `CRITICAL NO-REPETITION REQUIREMENT: You MUST generate a completely new, distinct scenario. Do NOT repeat or generate variations of previously generated questions: [${[...excludeIds.slice(0, 15), ...historyExclusions].join(', ')}].`,
        `The code should be 10-40 lines long, realistic, educational, and fun. Include exactly one bug. CRITICAL: Do NOT write comments explaining where the bug is.`,
      ].filter(Boolean);

      const userPrompt = promptSegments.join('\n');

      try {
        const candidate: any = await queryLLM(CHALLENGE_SYSTEM_PROMPT, userPrompt);
        candidate.challengeStyle = candidate.challengeStyle || challengeStyle;
        candidate.difficulty = difficulty.toLowerCase();
        candidate.language = candidate.language || targetLang;
        candidate.topic = candidate.topic || topic || candidate.category || 'general';

        const dupCheck = checkForDuplicate(candidate, { excludeIds, recentFingerprints });
        if (!dupCheck.isDuplicate) {
          challenge = candidate;
          break;
        }
        console.warn(`[ChallengeController] Attempt ${attempts} rejected duplicate (${dupCheck.reason}). Retrying...`);
      } catch (genErr) {
        console.warn(`[ChallengeController] Attempt ${attempts} generation fault:`, genErr);
      }
    }

    // If all LLM attempts produced duplicate or failed, use procedural generator with unique entropy
    if (!challenge) {
      challenge = generateProceduralChallenge({
        difficulty,
        language: targetLang,
        topic,
        category,
        challengeStyle,
        excludeIds,
      });
      challenge.challengeStyle = challengeStyle;
    }

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
    challenge.challengeStyle = challenge.challengeStyle || challengeStyle;

    // Prevent ID collisions with excluded challenges
    if (excludeIds.includes(challenge.id)) {
      challenge.id = `${challenge.id}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Register approved unique challenge in persistent disk history
    const record = recordQuestion(challenge);
    challenge.fingerprint = record.fingerprint;

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
