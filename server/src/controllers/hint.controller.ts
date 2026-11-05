/**
 * @file hint.controller.ts
 * @description Controller handling progressive hint requests for active challenges.
 * Enforces tiered disclosure schemas to assist players without prematurely revealing full solutions.
 */

import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';

/**
 * System prompt defining the strict JSON structure for tiered hints.
 */
const HINT_SYSTEM_PROMPT = `You are a hint provider for "BugBounty".
The player is stuck on a debugging challenge. Provide a helpful hint WITHOUT giving away the answer.

Return ONLY valid JSON:
{
  "hint": "The hint text — be helpful but don't reveal the exact fix",
  "hintLevel": <1-3 — how revealing this hint is>,
  "pointPenalty": <points deducted for using this hint>
}`;

/**
 * Express handler providing progressive hint assistance for a challenge.
 *
 * @param req Request containing buggyCode, description, and hintLevel in the body.
 * @param res Response delivering hint text, level index, and applied point deduction.
 * @param next Express error forwarding function.
 */
export async function getHint(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: 'Request body must be a valid JSON object.' });
    }

    if (typeof req.body.buggyCode !== 'string' || typeof req.body.description !== 'string') {
      return res.status(400).json({ success: false, error: 'Fields "buggyCode" and "description" are required strings.' });
    }

    const { buggyCode, description, hintLevel = 1 } = req.body as {
      buggyCode: string;
      description: string;
      hintLevel?: number;
    };

    const userPrompt = `The player needs a level ${hintLevel} hint (1=vague, 2=moderate, 3=almost-answer) for this challenge:

Description: ${description}

Buggy code:
\`\`\`
${buggyCode}
\`\`\`

Provide a hint at level ${hintLevel}.`;

    const hint = await queryLLM(HINT_SYSTEM_PROMPT, userPrompt);
    res.json({ success: true, ...(hint as object) });
  } catch (err) {
    next(err);
  }
}
