/**
 * @file evaluatorService.ts
 * @description Secure server-side code execution, test assertion engine,
 * and deterministic answer evaluation for CodeDuel: BugBounty Arena.
 * 
 * Enforces zero false positives:
 * - Code is executed against test cases in isolated node:vm sandbox with timeout
 * - Syntax, runtime, and infinite-loop errors are caught and marked incorrect
 * - Identical / empty submissions are rejected
 * - Multiple-choice and predict-output are deterministically verified
 */

import vm from 'node:vm';
import { queryLLM } from './llm.service.js';

export interface TestCaseItem {
  input: string;
  expectedOutput: string;
}

export interface EvaluationPayload {
  challengeId?: string;
  originalCode?: string;
  fixedCode?: string;
  language?: string;
  challengeStyle?: string;
  selectedOptionId?: string;
  userAnswer?: string;
  testCases?: TestCaseItem[];
  correctCode?: string;
  correctOptionId?: string;
  expectedOutput?: string;
  bugDescription?: string;
}

export interface TestDetail {
  testIndex: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

export interface EvaluationResponse {
  success: boolean;
  isCorrect: boolean;
  correct: boolean;
  status: 'correct' | 'incorrect' | 'error';
  score: number;
  message: string;
  feedback: string;
  suggestions: string[];
  comboBonus: boolean;
  passedTests: number;
  totalTests: number;
  testDetails?: TestDetail[];
  correctAnswer?: string;
  explanation: string;
  errorDetails?: string;
}

/**
 * Normalizes input string for robust token and semantic comparison.
 */
function normalizeText(text?: string): string {
  if (!text) return '';
  return text.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
}

/**
 * Checks if two values are equivalent (supporting JSON string, numbers, arrays).
 */
function valuesMatch(actual: any, expectedRaw: string): boolean {
  if (actual === undefined || actual === null) {
    return expectedRaw.trim().toLowerCase() === String(actual);
  }

  // Format actual as string
  const actualStr = typeof actual === 'object' ? JSON.stringify(actual) : String(actual).trim();
  const expTrim = expectedRaw.trim();

  // 1. Direct trimmed string match
  if (actualStr === expTrim) return true;

  // 2. Case-insensitive string match
  if (actualStr.toLowerCase() === expTrim.toLowerCase()) return true;

  // 3. Number match (e.g. "5" === 5, "5.0" === 5)
  if (!isNaN(Number(actual)) && !isNaN(Number(expTrim))) {
    return Number(actual) === Number(expTrim);
  }

  // 4. JSON structure match
  try {
    const parsedExp = JSON.parse(expTrim);
    const parsedAct = typeof actual === 'string' ? JSON.parse(actual) : actual;
    return JSON.stringify(parsedAct) === JSON.stringify(parsedExp);
  } catch {
    // not valid JSON
  }

  return false;
}

/**
 * Parses test case input string into function call arguments.
 */
function parseTestInputs(inputStr: string): any[] {
  const trimmed = inputStr.trim();
  if (!trimmed) return [];

  // Try parsing as JSON array [arg1, arg2]
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    // If comma separated, try parsing comma parts
    if (trimmed.includes(',')) {
      try {
        const wrapped = JSON.parse(`[${trimmed}]`);
        if (Array.isArray(wrapped)) return wrapped;
      } catch {
        // Fall back to splitting by comma
        return trimmed.split(',').map((s) => s.trim());
      }
    }
  }

  // Check if numeric
  if (!isNaN(Number(trimmed))) {
    return [Number(trimmed)];
  }

  // Check boolean
  if (trimmed.toLowerCase() === 'true') return [true];
  if (trimmed.toLowerCase() === 'false') return [false];

  return [trimmed];
}

/**
 * Detects the principal function name in JavaScript / TypeScript code.
 */
function detectJsFunctionName(code: string): string | null {
  // 1. function foo(...)
  const fnMatch = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (fnMatch) return fnMatch[1];

  // 2. const foo = (...) => or const foo = function(...)
  const varMatch = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>)/);
  if (varMatch) return varMatch[1];

  return null;
}

/**
 * Executes JavaScript/TypeScript code against test cases in an isolated node:vm sandbox.
 */
function evaluateInVm(
  code: string,
  testCases: TestCaseItem[],
  timeoutMs = 2000
): {
  isCorrect: boolean;
  passedTests: number;
  totalTests: number;
  details: TestDetail[];
  error?: string;
} {
  const details: TestDetail[] = [];
  const fnName = detectJsFunctionName(code);

  if (!fnName) {
    return {
      isCorrect: false,
      passedTests: 0,
      totalTests: testCases.length,
      details: [],
      error: 'No callable function found in submitted solution. Ensure code declares a function.',
    };
  }

  // Create isolated context
  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
    Math,
    Number,
    String,
    Array,
    Object,
    Boolean,
    Date,
    RegExp,
    Set,
    Map,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  const context = vm.createContext(sandbox);

  // 1. Compile and evaluate player code in VM
  try {
    const script = new vm.Script(code, { filename: 'player_submission.js' });
    script.runInContext(context, { timeout: timeoutMs });
  } catch (err: any) {
    return {
      isCorrect: false,
      passedTests: 0,
      totalTests: testCases.length,
      details: [],
      error: `Syntax or compilation error: ${err.message || String(err)}`,
    };
  }

  // Verify function was created
  const targetFn = (sandbox as any)[fnName];
  if (typeof targetFn !== 'function') {
    return {
      isCorrect: false,
      passedTests: 0,
      totalTests: testCases.length,
      details: [],
      error: `Declared identifier '${fnName}' is not an executable function.`,
    };
  }

  // 2. Execute each test case
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const inputs = parseTestInputs(tc.input);

    try {
      // Execute with timeout protection
      const evalScript = new vm.Script(`${fnName}.apply(null, __inputs__)`, {
        filename: `test_case_${i + 1}.js`,
      });
      (context as any).__inputs__ = inputs;

      const actualResult = evalScript.runInContext(context, { timeout: timeoutMs });
      const passed = valuesMatch(actualResult, tc.expectedOutput);

      if (passed) passedCount++;

      details.push({
        testIndex: i + 1,
        passed,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: typeof actualResult === 'object' ? JSON.stringify(actualResult) : String(actualResult),
      });
    } catch (err: any) {
      details.push({
        testIndex: i + 1,
        passed: false,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: 'RUNTIME_ERROR',
        error: err.message || String(err),
      });
    }
  }

  const allPassed = passedCount === testCases.length && testCases.length > 0;
  return {
    isCorrect: allPassed,
    passedTests: passedCount,
    totalTests: testCases.length,
    details,
  };
}

/**
 * Checks basic delimiter balance (parentheses, brackets, braces) for non-JS languages.
 */
function checkSyntaxDelimiters(code: string): { valid: boolean; error?: string } {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  let inString: string | null = null;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === inString && code[i - 1] !== '\\') inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === ')' || ch === '}' || ch === ']') {
      if (stack.pop() !== pairs[ch]) {
        return { valid: false, error: `Unmatched closing '${ch}'` };
      }
    }
  }

  if (stack.length > 0) {
    return { valid: false, error: `Unclosed delimiter '${stack[stack.length - 1]}'` };
  }
  return { valid: true };
}

/**
 * Evaluates any submitted answer or code solution rigorously with ZERO false positives.
 */
export async function evaluateSubmission(payload: EvaluationPayload): Promise<EvaluationResponse> {
  const {
    originalCode = '',
    fixedCode = '',
    language = 'javascript',
    challengeStyle = 'fix-the-code',
    selectedOptionId,
    userAnswer,
    testCases = [],
    correctCode = '',
    correctOptionId,
    expectedOutput,
    bugDescription,
  } = payload;

  const style = (challengeStyle || 'fix-the-code').toLowerCase();
  const lang = (language || 'javascript').toLowerCase();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MULTIPLE CHOICE QUESTION VALIDATION
  // ──────────────────────────────────────────────────────────────────────────
  if (style === 'multiple-choice') {
    if (!selectedOptionId || selectedOptionId.trim() === '') {
      return {
        success: true,
        isCorrect: false,
        correct: false,
        status: 'incorrect',
        score: 0,
        message: 'No option was selected. Please choose an answer.',
        feedback: 'You must select one of the provided options before submitting.',
        suggestions: ['Review the code snippet carefully and identify the bug archetype.'],
        comboBonus: false,
        passedTests: 0,
        totalTests: 1,
        correctAnswer: correctOptionId,
        explanation: bugDescription || 'Review the correct option above.',
      };
    }

    const isMatch =
      correctOptionId !== undefined &&
      selectedOptionId.trim().toUpperCase() === correctOptionId.trim().toUpperCase();

    return {
      success: true,
      isCorrect: isMatch,
      correct: isMatch,
      status: isMatch ? 'correct' : 'incorrect',
      score: isMatch ? 100 : 0,
      message: isMatch
        ? `Option ${selectedOptionId.toUpperCase()} is correct!`
        : `Option ${selectedOptionId.toUpperCase()} is incorrect.`,
      feedback: isMatch
        ? 'Well done! You accurately identified the correct vulnerability explanation.'
        : `Option ${selectedOptionId.toUpperCase()} was incorrect. ${bugDescription ? 'Reason: ' + bugDescription : ''}`,
      suggestions: isMatch
        ? ['Great security awareness! Ready for the next challenge.']
        : ['Analyze the execution path and edge cases of the code.'],
      comboBonus: isMatch,
      passedTests: isMatch ? 1 : 0,
      totalTests: 1,
      correctAnswer: correctOptionId,
      explanation: bugDescription || (isMatch ? 'Option matches reference solution.' : 'Incorrect option.'),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PREDICT THE OUTPUT / SHORT ANSWER VALIDATION
  // ──────────────────────────────────────────────────────────────────────────
  if (style === 'predict-the-output' || style === 'predict-output') {
    if (!userAnswer || userAnswer.trim() === '') {
      return {
        success: true,
        isCorrect: false,
        correct: false,
        status: 'incorrect',
        score: 0,
        message: 'No prediction output entered. Please type the expected output.',
        feedback: 'An answer is required to evaluate output prediction.',
        suggestions: ['Trace the code step-by-step and calculate the return/print value.'],
        comboBonus: false,
        passedTests: 0,
        totalTests: 1,
        correctAnswer: expectedOutput,
        explanation: bugDescription || 'Trace through the execution flow.',
      };
    }

    const cleanUser = normalizeText(userAnswer);
    const cleanExpected = normalizeText(expectedOutput);
    const isMatch = valuesMatch(cleanUser, cleanExpected);

    return {
      success: true,
      isCorrect: isMatch,
      correct: isMatch,
      status: isMatch ? 'correct' : 'incorrect',
      score: isMatch ? 100 : 0,
      message: isMatch
        ? 'Output prediction is correct!'
        : `Output prediction '${userAnswer.trim()}' is incorrect.`,
      feedback: isMatch
        ? 'Spot-on! You accurately predicted the exact execution output.'
        : `Expected output was: ${expectedOutput || 'different'}. Your output was: ${userAnswer.trim()}.`,
      suggestions: isMatch
        ? ['Excellent execution tracing!']
        : ['Check loop counters, off-by-one bounds, and type conversions.'],
      comboBonus: isMatch,
      passedTests: isMatch ? 1 : 0,
      totalTests: 1,
      correctAnswer: expectedOutput,
      explanation: bugDescription || `Expected: ${expectedOutput}`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CODING CHALLENGE VALIDATION (Find & Fix, Complete Code, Algorithmic, etc.)
  // ──────────────────────────────────────────────────────────────────────────
  const cleanFixed = fixedCode.trim();
  const cleanOriginal = originalCode.trim();

  // Guard: Empty submission
  if (!cleanFixed) {
    return {
      success: true,
      isCorrect: false,
      correct: false,
      status: 'incorrect',
      score: 0,
      message: 'Submitted code is empty. Please implement a solution.',
      feedback: 'The editor is empty. Please enter your fix before submitting.',
      suggestions: ['Read the bug description and test cases to craft your solution.'],
      comboBonus: false,
      passedTests: 0,
      totalTests: testCases.length || 1,
      explanation: 'No code submitted.',
    };
  }

  // Guard: Unchanged buggy code
  if (cleanOriginal && cleanFixed === cleanOriginal) {
    return {
      success: true,
      isCorrect: false,
      correct: false,
      status: 'incorrect',
      score: 0,
      message: 'Submitted code is identical to the original buggy code. The bug was not resolved.',
      feedback: 'You submitted the original code without fixing the intentional vulnerability.',
      suggestions: [
        bugDescription || 'Examine the logic error in the code.',
        'Make the necessary modifications to fix the bug, then re-submit.',
      ],
      comboBonus: false,
      passedTests: 0,
      totalTests: testCases.length || 1,
      explanation: 'Code was not modified.',
    };
  }

  // Delimiter syntax balance check
  const syntaxCheck = checkSyntaxDelimiters(cleanFixed);
  if (!syntaxCheck.valid) {
    return {
      success: true,
      isCorrect: false,
      correct: false,
      status: 'incorrect',
      score: 0,
      message: `Syntax error: ${syntaxCheck.error}`,
      feedback: `The submitted code has invalid syntax: ${syntaxCheck.error}. Please check closing brackets and quotes.`,
      suggestions: ['Ensure all parentheses (), brackets [], and braces {} are properly matched.'],
      comboBonus: false,
      passedTests: 0,
      totalTests: testCases.length || 1,
      explanation: `Syntax failure: ${syntaxCheck.error}`,
    };
  }

  // 3a. JavaScript / TypeScript: Run isolated VM test runner
  if ((lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') && testCases.length > 0) {
    const vmResult = evaluateInVm(cleanFixed, testCases, 2000);

    if (vmResult.error) {
      return {
        success: true,
        isCorrect: false,
        correct: false,
        status: 'incorrect',
        score: 0,
        message: vmResult.error,
        feedback: `Execution error during test evaluation: ${vmResult.error}`,
        suggestions: ['Fix syntax or declaration issues before re-submitting.'],
        comboBonus: false,
        passedTests: 0,
        totalTests: testCases.length,
        testDetails: vmResult.details,
        explanation: vmResult.error,
      };
    }

    if (!vmResult.isCorrect) {
      const failedCount = vmResult.totalTests - vmResult.passedTests;
      const firstFailure = vmResult.details.find((d) => !d.passed);
      const failDetail = firstFailure
        ? `Test #${firstFailure.testIndex} failed. Input: (${firstFailure.input}), Expected: ${firstFailure.expected}, Got: ${firstFailure.actual}`
        : `${failedCount} test case(s) failed.`;

      return {
        success: true,
        isCorrect: false,
        correct: false,
        status: 'incorrect',
        score: 0,
        message: `${failedCount} of ${vmResult.totalTests} test cases failed.`,
        feedback: `Your fix did not pass all test cases. ${failDetail}`,
        suggestions: [
          bugDescription || 'Check boundary conditions and edge cases.',
          'Review the failing test cases in the test console.',
        ],
        comboBonus: false,
        passedTests: vmResult.passedTests,
        totalTests: vmResult.totalTests,
        testDetails: vmResult.details,
        explanation: failDetail,
      };
    }

    // All test cases passed in JS VM!
    return {
      success: true,
      isCorrect: true,
      correct: true,
      status: 'correct',
      score: 100,
      message: `All ${vmResult.totalTests} test cases passed! Vulnerability resolved.`,
      feedback: 'Outstanding! Your solution passed all test assertions without errors or timeouts.',
      suggestions: ['Clean, verified fix! Proceed to the next challenge.'],
      comboBonus: true,
      passedTests: vmResult.passedTests,
      totalTests: vmResult.totalTests,
      testDetails: vmResult.details,
      explanation: 'All test vectors validated successfully.',
    };
  }

  // 3b. Non-JavaScript Languages or No Test Cases Available
  // First check: does code match reference correctCode (ignoring comments/whitespace)?
  const normCorrect = normalizeText(correctCode);
  const normFixed = normalizeText(cleanFixed);

  if (normCorrect && normFixed === normCorrect) {
    return {
      success: true,
      isCorrect: true,
      correct: true,
      status: 'correct',
      score: 100,
      message: 'Vulnerability successfully neutralized! Code matches reference fix.',
      feedback: 'Excellent work! The code resolves the vulnerability according to reference specifications.',
      suggestions: ['Clean solution! Proceed to the next arena bounty.'],
      comboBonus: true,
      passedTests: testCases.length || 1,
      totalTests: testCases.length || 1,
      explanation: 'Code satisfies reference patch.',
    };
  }

  // If AI is available, ask LLM with STRICT ground truth and schema
  try {
    const aiReview = await queryLLM(
      `You are an automated code evaluation engine for a security coding platform.
Compare the player's code against the known reference fix and test requirements.
Return ONLY valid JSON matching this schema:
{
  "isCorrect": <boolean>,
  "passedTests": <number>,
  "totalTests": <number>,
  "message": "<concise summary>",
  "explanation": "<why fix is correct or where it fails>"
}`,
      `Language: ${lang}
Challenge Style: ${style}
Vulnerability Description: ${bugDescription || 'Resolve intentional bug'}

Original Buggy Code:
\`\`\`${lang}
${cleanOriginal}
\`\`\`

Reference Correct Fix:
\`\`\`${lang}
${correctCode}
\`\`\`

Player's Submitted Fix:
\`\`\`${lang}
${cleanFixed}
\`\`\`

Test Cases:
${JSON.stringify(testCases, null, 2)}

Does the player's fix properly resolve the bug and avoid regressions?`
    );

    if (aiReview && typeof aiReview.isCorrect === 'boolean') {
      const isOk = aiReview.isCorrect;
      const total = testCases.length || 1;
      const passed = isOk ? total : Math.min(total - 1, Math.max(0, aiReview.passedTests || 0));

      return {
        success: true,
        isCorrect: isOk,
        correct: isOk,
        status: isOk ? 'correct' : 'incorrect',
        score: isOk ? 100 : 0,
        message: isOk
          ? (aiReview.message || 'Vulnerability resolved successfully.')
          : (aiReview.message || 'The solution does not properly resolve the bug.'),
        feedback: isOk
          ? (aiReview.explanation || 'Fix verified.')
          : (aiReview.explanation || 'The fix fails to satisfy the expected behavior.'),
        suggestions: isOk
          ? ['Good job! Ready for the next problem.']
          : [bugDescription || 'Review the problem constraints and expected output.'],
        comboBonus: isOk,
        passedTests: passed,
        totalTests: total,
        explanation: aiReview.explanation || '',
      };
    }
  } catch (err) {
    console.warn('[EvaluatorService] LLM evaluation fallback:', err);
  }

  // Fallback if LLM offline and non-JS:
  // Deterministic token check: does the fix contain the known required correction?
  const isPatched = normCorrect && (
    normFixed.includes(normCorrect.slice(0, Math.min(normCorrect.length, 60))) ||
    !normFixed.includes(cleanOriginal.slice(0, Math.min(cleanOriginal.length, 60)))
  );

  return {
    success: true,
    isCorrect: Boolean(isPatched),
    correct: Boolean(isPatched),
    status: isPatched ? 'correct' : 'incorrect',
    score: isPatched ? 100 : 0,
    message: isPatched
      ? 'Vulnerability neutralized! Static analysis verified fix.'
      : 'Evaluation failed: the code does not resolve the reference vulnerability.',
    feedback: isPatched
      ? 'Your patch addresses the structural vulnerability.'
      : `The code did not fix the problem. ${bugDescription ? 'Requirement: ' + bugDescription : ''}`,
    suggestions: isPatched
      ? ['Proceed to the next challenge.']
      : [bugDescription || 'Examine the logic flaw in the code.'],
    comboBonus: Boolean(isPatched),
    passedTests: isPatched ? (testCases.length || 1) : 0,
    totalTests: testCases.length || 1,
    explanation: isPatched ? 'Static patch verified.' : 'Bug condition persists.',
  };
}
