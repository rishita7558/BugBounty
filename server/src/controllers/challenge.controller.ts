/**
 * @file challenge.controller.ts
 * @description Controller handling challenge generation and submission evaluation requests.
 * Formulates system prompts, handles question rotation with excludeIds, and routes payloads
 * to the rigorous evaluator service for zero-false-positive validation.
 */

import type { Request, Response, NextFunction } from 'express';
import {
  recordQuestion,
  getRecentExclusionContext,
} from '../services/questionHistoryService.js';
import { generateDynamicChallenge } from '../services/llmQuestionGenerator.js';
import { evaluateSubmission, type EvaluationPayload } from '../services/evaluatorService.js';

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
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: 'Request body must be a valid JSON object.' });
    }

    if (req.body.language !== undefined && typeof req.body.language !== 'string') {
      return res.status(400).json({ success: false, error: 'Field "language" must be a string.' });
    }

    if (req.body.topic !== undefined && typeof req.body.topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Field "topic" must be a string.' });
    }

    if (req.body.mode !== undefined && !['dsa', 'practical'].includes(req.body.mode)) {
      return res.status(400).json({ success: false, error: 'Field "mode" must be "dsa" or "practical".' });
    }

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

    const challenge: any = {
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
      source: dynamicChallenge.source || 'llm',
    };

    // If challengeStyle is multiple-choice, build options
    if (challengeStyle === 'multiple-choice') {
      const correctText = dynamicChallenge.bugDescription;
      const distractors = [
        'Variable scope is leaked across asynchronous macro-task queues',
        'Missing mutual exclusion lock causing concurrent mutation hazard',
        'Null pointer dereference under edge boundary conditions',
        'Implicit type coercion producing NaN during arithmetic operations',
        'Off-by-one boundary traversal causing out-of-bounds slice indexing',
      ].filter((d) => d !== correctText);

      const allOptions = [
        { text: correctText, isCorrect: true },
        { text: distractors[0], isCorrect: false },
        { text: distractors[1], isCorrect: false },
        { text: distractors[2], isCorrect: false },
      ].sort(() => Math.random() - 0.5);

      const letters = ['A', 'B', 'C', 'D'];
      challenge.options = allOptions.map((opt, i) => ({
        id: letters[i],
        text: opt.text,
      }));
      const correctIdx = allOptions.findIndex((o) => o.isCorrect);
      challenge.correctOptionId = letters[correctIdx];
    } else if (challengeStyle === 'predict-the-output' || challengeStyle === 'predict-output') {
      challenge.expectedOutput = dynamicChallenge.testCases[0]?.expectedOutput || 'undefined';
    }

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
 * Express handler to evaluate a submitted player solution with zero false positives.
 * Evaluates code in an isolated node:vm sandbox, handles syntax/runtime/timeout errors,
 * verifies test assertions, and deterministically evaluates MCQ/prediction answers.
 *
 * @param req Request containing submission payload in the body.
 * @param res Response delivering the evaluation review result.
 * @param next Express error forwarding function.
 */
export async function reviewCode(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: 'Request body must be a valid JSON object.' });
    }

    const body = req.body as EvaluationPayload & {
      buggyCode?: string;
      playerCode?: string;
    };

    const evaluationPayload: EvaluationPayload = {
      challengeId: body.challengeId,
      originalCode: body.originalCode || body.buggyCode || '',
      fixedCode: body.fixedCode || body.playerCode || '',
      language: body.language,
      challengeStyle: body.challengeStyle,
      selectedOptionId: body.selectedOptionId,
      userAnswer: body.userAnswer,
      testCases: body.testCases,
      correctCode: body.correctCode,
      correctOptionId: body.correctOptionId,
      expectedOutput: body.expectedOutput,
      bugDescription: body.bugDescription,
    };

    const review = await evaluateSubmission(evaluationPayload);

    res.json({
      success: true,
      review,
      isCorrect: review.isCorrect,
      correct: review.correct,
      status: review.status,
      message: review.message,
      passedTests: review.passedTests,
      totalTests: review.totalTests,
      testDetails: review.testDetails,
      correctAnswer: review.correctAnswer,
      explanation: review.explanation,
    });
  } catch (err) {
    next(err);
  }
}
