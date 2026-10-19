import type { Request, Response, NextFunction } from 'express';
import { queryLLM } from '../services/llm.service.js';

// ---------------------------------------------------------------------------
// Hint Controller — Provides progressive hints for active challenges via LLM.
// ---------------------------------------------------------------------------

const HINT_SYSTEM_PROMPT = `You are a hint provider for "CodeDuel: BugBounty Arena".
The player is stuck on a debugging challenge. Provide a helpful hint WITHOUT giving away the answer.

Return ONLY valid JSON:
{
  "hint": "The hint text — be helpful but don't reveal the exact fix",
  "hintLevel": <1-3 — how revealing this hint is>,
  "pointPenalty": <points deducted for using this hint>
}`;

export async function getHint(req: Request, res: Response, next: NextFunction) {
  try {
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
    res.json({ success: true, ...hint as object });
  } catch (err) {
    next(err);
  }
}
