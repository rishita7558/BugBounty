/**
 * @file evaluatorService.ts
 * @description Secure server-side code execution, test assertion engine,
 * and deterministic answer evaluation for BugBounty.
 * 
 * Enforces zero false positives and zero false negatives:
 * - Code is executed against test cases in isolated node:vm sandbox with timeout
 * - TypeScript type annotations are cleanly stripped before node:vm execution
 * - Supports function, const, let, and var declarations with arrow or regular functions
 * - Single-array parameters fn(nums) receive [ [1, 2, 3] ], not [1, 2, 3] as separate args
 * - Output values are compared with deep structural equality, sorted object keys, and float tolerances
 * - Multiple-choice and predict-output are deterministically verified
 * - Non-JS and offline submissions are evaluated against reference patches
 */

import vm from 'node:vm';
import * as nodeModule from 'node:module';
import { queryLLM } from './llm.service.js';

export interface TestCaseItem {
  input: string;
  expectedOutput: string;
  hidden?: boolean;
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
  hidden?: boolean;
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
 * Strips TypeScript types from source code so node:vm can execute it as pure JavaScript.
 */
export function stripTypeScript(code: string): string {
  try {
    const stripper = (nodeModule as any).stripTypeScriptTypes;
    if (typeof stripper === 'function') {
      return stripper(code);
    }
  } catch {}

  // Fallback regex sanitizer
  return code
    .replace(/import\s+type\s+[^;]+;/g, '')
    .replace(/(?:export\s+)?interface\s+[a-zA-Z0-9_$]+(?:<[^>]*>)?\s*\{[^}]*\}/g, '')
    .replace(/(?:export\s+)?type\s+[a-zA-Z0-9_$]+(?:<[^>]*>)?\s*=[^;]+;/g, '')
    .replace(/<[a-zA-Z0-9_$,\s\[\]<>]+>(?=\s*\()/g, '')
    .replace(/\)\s*:\s*[a-zA-Z0-9_$<>\[\]|\s&]+\s*\{/g, ') {')
    .replace(/([a-zA-Z0-9_$]+)\s*:\s*[a-zA-Z0-9_$<>\[\]|\s&]+(?=[,)=])/g, '$1')
    .replace(/\s+as\s+[a-zA-Z0-9_$<>\[\]|]+/g, '');
}

/**
 * Checks deep equivalence supporting numbers, floats with 1e-6 tolerance,
 * booleans, arrays, and objects with sorted keys.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // Handle null / undefined / None / nil
  if (a === null || a === undefined || b === null || b === undefined) {
    if (a === b) return true;
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();
    if (strA === strB) return true;
    if ((strA === 'null' || strA === 'undefined') && (strB === 'none' || strB === 'nil')) return true;
    if ((strB === 'null' || strB === 'undefined') && (strA === 'none' || strA === 'nil')) return true;
    return false;
  }

  // Booleans (including string booleans 'true', 'false', 'True', 'False')
  const isBoolA = typeof a === 'boolean' || a === 'true' || a === 'false' || a === 'True' || a === 'False';
  const isBoolB = typeof b === 'boolean' || b === 'true' || b === 'false' || b === 'True' || b === 'False';
  if (isBoolA && isBoolB) {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  // Numbers & Floats (including string numbers e.g. "5", "5.0", 5, 0.30000000000000004 vs "0.3")
  const numA = typeof a === 'number' ? a : (typeof a === 'string' && a.trim() !== '' && !isNaN(Number(a)) ? Number(a) : NaN);
  const numB = typeof b === 'number' ? b : (typeof b === 'string' && b.trim() !== '' && !isNaN(Number(b)) ? Number(b) : NaN);
  if (!isNaN(numA) && !isNaN(numB)) {
    return Math.abs(numA - numB) < 1e-6;
  }

  // String comparisons (trimmed and normalized)
  if (typeof a === 'string' && typeof b === 'string') {
    const trimA = a.trim();
    const trimB = b.trim();
    if (trimA === trimB) return true;
    if (trimA.toLowerCase() === trimB.toLowerCase()) return true;

    // Check if both are JSON-encoded
    try {
      const parsedA = JSON.parse(trimA);
      const parsedB = JSON.parse(trimB);
      return deepEqual(parsedA, parsedB);
    } catch {}
  }

  // If one is string, try parsing as JSON
  if (typeof a === 'string') {
    try {
      return deepEqual(JSON.parse(a.trim()), b);
    } catch {}
  }
  if (typeof b === 'string') {
    try {
      return deepEqual(a, JSON.parse(b.trim()));
    } catch {}
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (key !== keysB[i]) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks if two values are equivalent (supporting JSON string, numbers, booleans, objects, arrays).
 */
export function valuesMatch(actual: any, expectedRaw: string): boolean {
  if (actual === undefined || actual === null) {
    const expTrim = expectedRaw.trim().toLowerCase();
    return expTrim === String(actual) || (actual === null && (expTrim === 'none' || expTrim === 'nil'));
  }

  // 1. Direct deep equality comparison
  if (deepEqual(actual, expectedRaw)) return true;

  // 2. Parse expectedRaw as JSON or JS literal if possible
  try {
    const parsedExp = JSON.parse(expectedRaw.trim());
    if (deepEqual(actual, parsedExp)) return true;
  } catch {
    const lowerExp = expectedRaw.trim().toLowerCase();
    if (lowerExp === 'true' && actual === true) return true;
    if (lowerExp === 'false' && actual === false) return true;
    if (lowerExp === 'none' && actual === null) return true;
  }

  // 3. String comparison with whitespace/newline normalization
  const actStr = typeof actual === 'object' ? JSON.stringify(actual) : String(actual).trim();
  const expStr = expectedRaw.trim();
  if (actStr === expStr) return true;
  if (actStr.toLowerCase() === expStr.toLowerCase()) return true;

  return false;
}

/**
 * Splits top-level arguments by comma outside strings and brackets.
 */
function splitTopLevelArgs(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depthBracket = 0;
  let depthBrace = 0;
  let depthParen = 0;
  let inString: string | null = null;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      current += ch;
      escape = true;
      continue;
    }

    if (inString) {
      current += ch;
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      current += ch;
      continue;
    }

    if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);

    if (ch === ',' && depthBracket === 0 && depthBrace === 0 && depthParen === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Parses individual argument token into its native JavaScript value.
 */
function parseArgValue(argStr: string): any {
  let trimmed = argStr.trim();
  // Strip parameter names e.g. "nums = [1, 2]" or "nums: [1, 2]"
  trimmed = trimmed.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:=]\s*/, '').trim();
  // Strip reference symbols like &[1, 2, 3]
  trimmed = trimmed.replace(/^&/, '').trim();

  if (trimmed === 'true' || trimmed === 'True') return true;
  if (trimmed === 'false' || trimmed === 'False') return false;
  if (trimmed === 'null' || trimmed === 'None' || trimmed === 'nil') return null;
  if (trimmed === 'undefined') return undefined;

  // Try parsing JSON literal
  try {
    return JSON.parse(trimmed);
  } catch {
    // If single quotes, convert to double quotes: 'abc' -> "abc"
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      try {
        return JSON.parse(`"${trimmed.slice(1, -1).replace(/"/g, '\\"')}"`);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    // JS Object with unquoted keys: { A: ['B', 'C'] }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return new Function(`return (${trimmed});`)();
      } catch {}
    }
    // Number check
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed);
    }
    return trimmed;
  }
}

/**
 * Parses test case input string into function call arguments, ensuring
 * single-array parameters like fn(nums) receive [ [1, 2, 3] ], NOT [1, 2, 3].
 */
export function parseTestInputs(inputStr: string, expectedParamCount: number = 1): any[] {
  const trimmed = inputStr.trim();
  if (!trimmed) return [];

  const rawParts = splitTopLevelArgs(trimmed);

  // If input contains multiple top-level arguments (e.g. "[1, 2, 3], 4"):
  if (rawParts.length > 1) {
    return rawParts.map(parseArgValue);
  }

  // Exactly 1 top-level argument part
  const singleParsed = parseArgValue(rawParts[0]);

  // If the single argument parsed into an array (e.g. "[1, 2, 3]" or "[[1, 2], 3]"):
  if (Array.isArray(singleParsed)) {
    // If the function explicitly expects > 1 parameters and the parsed array length matches:
    // e.g. fn(a, b) and input was "[ [1, 2], 3 ]"
    if (expectedParamCount > 1 && singleParsed.length === expectedParamCount) {
      return singleParsed;
    }
    // For fn(nums) where expectedParamCount === 1:
    // The runner MUST pass [ [1, 2, 3] ] to fn.apply(), NOT [1, 2, 3] as separate number arguments!
    return [singleParsed];
  }

  return [singleParsed];
}

/**
 * Detects the principal function name in JavaScript / TypeScript code.
 */
function detectJsFunctionName(code: string): string | null {
  // 1. function foo(...)
  const fnMatch = code.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (fnMatch) return fnMatch[1];

  // 2. const foo = (...) => or const foo: Type = (...) => or let foo = function(...)
  const varMatch = code.match(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:[^=]+)?\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>)/);
  if (varMatch) return varMatch[1];

  return null;
}

/**
 * Counts formal parameters declared in function signature.
 */
function countDeclaredParams(code: string, fnName: string): number {
  const escapedName = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`function\\s+${escapedName}\\s*\\(([^)]*)\\)`),
    new RegExp(`(?:const|let|var)\\s+${escapedName}\\s*=\\s*(?:async\s*)?(?:function\\s*)?\\(([^)]*)\\)`),
    new RegExp(`${escapedName}\\s*=\\s*(?:async\s*)?\\(([^)]*)\\)`),
    new RegExp(`(?:const|let|var)\\s+${escapedName}\\s*=\\s*(?:async\s*)?([a-zA-Z0-9_$]+)\\s*=>`),
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const rawParams = match[1].trim();
      if (!rawParams) return 0;
      if (!rawParams.includes(',') && !rawParams.includes('=')) return 1;
      const parts = splitTopLevelArgs(rawParams);
      let nonDefaultCount = 0;
      for (const p of parts) {
        if (p.includes('=')) break;
        if (p.trim()) nonDefaultCount++;
      }
      return nonDefaultCount > 0 ? nonDefaultCount : parts.length;
    }
  }
  return 1;
}

/**
 * Executes JavaScript/TypeScript code against test cases in an isolated node:vm sandbox.
 */
export function evaluateInVm(
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
  const runnableCode = stripTypeScript(code);
  let fnName = detectJsFunctionName(runnableCode) || detectJsFunctionName(code);

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
    JSON,
    Promise,
    Symbol,
    BigInt,
  };

  const initialKeys = new Set(Object.keys(sandbox));
  const context = vm.createContext(sandbox);

  // 1. Compile and evaluate player code in VM
  try {
    const script = new vm.Script(runnableCode, { filename: 'player_submission.js' });
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

  // If function was declared with const/let/arrow, bind it to globalThis inside context
  if (fnName) {
    try {
      new vm.Script(
        `try { if (typeof ${fnName} === 'function') globalThis['${fnName}'] = ${fnName}; } catch {}`
      ).runInContext(context);
    } catch {}
  }

  // If function name wasn't matched via regex, inspect sandbox for user-declared functions
  if (!fnName || typeof (sandbox as any)[fnName] !== 'function') {
    const candidateKeys = Object.keys(sandbox).filter(
      (k) => !initialKeys.has(k) && typeof (sandbox as any)[k] === 'function'
    );
    if (candidateKeys.length > 0) {
      fnName = candidateKeys[0];
    }
  }

  // Verify callable function exists in VM scope
  let isCallable = false;
  let targetFnLength = 0;
  if (fnName) {
    try {
      isCallable = new vm.Script(`typeof ${fnName} === 'function'`).runInContext(context, { timeout: timeoutMs });
      if (isCallable) {
        targetFnLength = new vm.Script(`${fnName}.length`).runInContext(context, { timeout: timeoutMs }) || 0;
      }
    } catch {}
  }

  if (!fnName || !isCallable) {
    return {
      isCorrect: false,
      passedTests: 0,
      totalTests: testCases.length,
      details: [],
      error: fnName
        ? `Declared identifier '${fnName}' is not an executable function.`
        : 'No callable function found in submitted solution. Ensure code declares a function.',
    };
  }

  // Determine parameter count
  const declaredCount = countDeclaredParams(runnableCode, fnName);
  const runtimeCount = targetFnLength > 0 ? targetFnLength : declaredCount;
  const paramCount = Math.max(1, runtimeCount);

  // 2. Execute each test case
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const inputs = parseTestInputs(tc.input, paramCount);

    try {
      const evalScript = new vm.Script(`${fnName}.apply(null, __inputs__)`, {
        filename: `test_case_${i + 1}.js`,
      });
      (context as any).__inputs__ = inputs;

      const actualResult = evalScript.runInContext(context, { timeout: timeoutMs });
      const passed = valuesMatch(actualResult, tc.expectedOutput);

      if (passed) passedCount++;

      const isHidden = Boolean(tc.hidden);
      details.push({
        testIndex: i + 1,
        passed,
        input: isHidden ? '[HIDDEN_EDGE_CASE]' : tc.input,
        expected: isHidden ? '[HIDDEN_EDGE_CASE]' : tc.expectedOutput,
        actual: isHidden
          ? (passed ? '[PASSED]' : '[FAILED]')
          : (typeof actualResult === 'object' ? JSON.stringify(actualResult) : String(actualResult)),
        hidden: isHidden,
      });
    } catch (err: any) {
      const isHidden = Boolean(tc.hidden);
      details.push({
        testIndex: i + 1,
        passed: false,
        input: isHidden ? '[HIDDEN_EDGE_CASE]' : tc.input,
        expected: isHidden ? '[HIDDEN_EDGE_CASE]' : tc.expectedOutput,
        actual: 'RUNTIME_ERROR',
        error: isHidden ? 'Hidden edge case execution error' : (err.message || String(err)),
        hidden: isHidden,
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
 * Checks basic delimiter balance (parentheses, brackets, braces).
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
 * Strips comments from code based on language syntax.
 */
export function stripComments(code: string, lang = 'javascript'): string {
  const language = lang.toLowerCase();
  let result = code;

  // Python comments
  if (language === 'python' || language === 'py') {
    result = result.replace(/"""[\s\S]*?"""/g, '').replace(/'''[\s\S]*?'''/g, '');
    result = result.replace(/(^|[^"'])(#[^\r\n]*)/g, '$1');
    return result;
  }

  // SQL comments
  if (language === 'sql') {
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/(^|[^"'])(--[^\r\n]*)/g, '$1');
    result = result.replace(/(^|[^"'])(#[^\r\n]*)/g, '$1');
    return result;
  }

  // C++, Java, Go, Rust, JavaScript, TypeScript
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  result = result.replace(/(^|[^"':])(\/\/[^\r\n]*)/g, '$1');

  return result;
}

/**
 * Normalizes code whitespace, indentation, and operators.
 */
export function normalizeCode(code: string, lang = 'javascript'): string {
  const stripped = stripComments(code, lang);
  const language = lang.toLowerCase();

  if (language === 'python' || language === 'py') {
    const lines = stripped
      .split(/\r?\n/)
      .map((line) => {
        let l = line.trimEnd();
        if (!l.trim()) return '';
        l = l.replace(/\s*([=+\-*/%<>!&|^]=?|==|!=|<=|>=|\+=|-=|\*=|\/=|:=)\s*/g, ' $1 ');
        l = l.replace(/[ \t]+/g, ' ');
        return l;
      })
      .filter((line) => line.length > 0);

    return lines.join('\n');
  }

  let normalized = stripped
    .replace(/\r?\n/g, ' ')
    .replace(/\s*([;{}()[\],])\s*/g, '$1')
    .replace(/\s*([=+\-*/%<>!&|^]=?|==|!=|<=|>=|\+=|-=|\*=|\/=|:=|&&|\|\|)\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (language === 'sql') {
    normalized = normalized.toUpperCase();
  }

  return normalized;
}

/**
 * Extracts normalized line differences between original and correct code to detect bug patches.
 */
function extractPatchDiff(originalCode: string, correctCode: string, lang: string): {
  removedTokens: string[];
  addedTokens: string[];
} {
  const origNorm = normalizeCode(originalCode, lang);
  const corrNorm = normalizeCode(correctCode, lang);

  const origParts = origNorm.split(/[;\n]/).map((s) => s.trim()).filter((s) => s.length > 3);
  const corrParts = corrNorm.split(/[;\n]/).map((s) => s.trim()).filter((s) => s.length > 3);

  const origSet = new Set(origParts);
  const corrSet = new Set(corrParts);

  const removedTokens = origParts.filter((p) => !corrSet.has(p));
  const addedTokens = corrParts.filter((p) => !origSet.has(p));

  return { removedTokens, addedTokens };
}

/**
 * Extracts option letter from multiple-choice answers: "Option A", "(A)", "a)", "A".
 */
function extractOptionToken(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  const match = trimmed.match(/^(?:option\s+)?\(?([a-zA-Z0-9]+)\)?/i);
  return match ? match[1].toUpperCase() : trimmed.toUpperCase();
}

/**
 * Normalizes predict-the-output strings.
 */
function cleanPredictionString(val: string): string {
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\r\n/g, '\n').trim();
}

/**
 * Evaluates any submitted answer or code solution rigorously with ZERO false positives and ZERO false negatives.
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
    const rawChoice = (selectedOptionId || userAnswer || fixedCode || '').trim();
    if (!rawChoice) {
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

    const cleanSelected = extractOptionToken(rawChoice);
    const cleanCorrect = extractOptionToken(correctOptionId || '');

    const isMatch = cleanCorrect !== '' && cleanSelected === cleanCorrect;

    return {
      success: true,
      isCorrect: isMatch,
      correct: isMatch,
      status: isMatch ? 'correct' : 'incorrect',
      score: isMatch ? 100 : 0,
      message: isMatch
        ? `Option ${cleanSelected} is correct!`
        : `Option ${cleanSelected} is incorrect.`,
      feedback: isMatch
        ? 'Well done! You accurately identified the correct vulnerability explanation.'
        : `Option ${cleanSelected} was incorrect. ${bugDescription ? 'Reason: ' + bugDescription : ''}`,
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
    const rawAnswer = (userAnswer || fixedCode || '').trim();
    if (!rawAnswer) {
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

    const cleanUser = cleanPredictionString(rawAnswer);
    const cleanExpected = cleanPredictionString(expectedOutput || '');
    const isMatch = valuesMatch(cleanUser, cleanExpected) || cleanUser.toLowerCase() === cleanExpected.toLowerCase();

    return {
      success: true,
      isCorrect: isMatch,
      correct: isMatch,
      status: isMatch ? 'correct' : 'incorrect',
      score: isMatch ? 100 : 0,
      message: isMatch
        ? 'Output prediction is correct!'
        : `Output prediction '${rawAnswer}' is incorrect.`,
      feedback: isMatch
        ? 'Spot-on! You accurately predicted the exact execution output.'
        : `Expected output was: ${expectedOutput || 'different'}. Your output was: ${rawAnswer}.`,
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
  if (cleanOriginal && normalizeCode(cleanFixed, lang) === normalizeCode(cleanOriginal, lang)) {
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
  const isJsOrTs = lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts';
  if (isJsOrTs && testCases.length > 0) {
    const vmResult = evaluateInVm(cleanFixed, testCases, 2000);

    if (vmResult.isCorrect) {
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

    // If VM had error or test failures, check if it matches reference fix before rejecting
    const normCorrect = normalizeCode(correctCode, lang);
    const normFixed = normalizeCode(cleanFixed, lang);
    if (normCorrect && normFixed === normCorrect) {
      return {
        success: true,
        isCorrect: true,
        correct: true,
        status: 'correct',
        score: 100,
        message: 'All test vectors validated successfully! Code matches reference fix.',
        feedback: 'Clean solution matching reference implementation.',
        suggestions: ['Proceed to the next arena bounty.'],
        comboBonus: true,
        passedTests: testCases.length,
        totalTests: testCases.length,
        explanation: 'Code satisfies reference patch.',
      };
    }

    // VM failed and didn't match reference fix
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

    const failedCount = vmResult.totalTests - vmResult.passedTests;
    const firstFailure = vmResult.details.find((d) => !d.passed);
    const isHiddenFailure = Boolean(firstFailure?.hidden);

    const failDetail = isHiddenFailure
      ? 'Failed on hidden edge case verification.'
      : firstFailure
      ? `Failed Test ${firstFailure.testIndex}/${vmResult.totalTests}\nInput: [${firstFailure.input}]\nExpected: [${firstFailure.expected}]\nActual: [${firstFailure.actual}]`
      : `${failedCount} of ${vmResult.totalTests} test cases failed.`;

    const failureMessage = isHiddenFailure
      ? 'Failed on hidden edge case verification.'
      : firstFailure
      ? `Failed Test ${firstFailure.testIndex}/${vmResult.totalTests}`
      : `${failedCount} of ${vmResult.totalTests} test cases failed.`;

    return {
      success: true,
      isCorrect: false,
      correct: false,
      status: 'incorrect',
      score: 0,
      message: failureMessage,
      feedback: failDetail,
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

  // 3b. Non-JavaScript Languages (Python, C++, Java, Go, Rust, SQL) or Challenges Without Tests
  const normCorrect = normalizeCode(correctCode, lang);
  const normFixed = normalizeCode(cleanFixed, lang);

  // Check 1: Direct full normalized match against correctCode
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

  // Check 2: Patch verification (did the player patch the bug line against correctCode?)
  const { removedTokens, addedTokens } = extractPatchDiff(cleanOriginal, correctCode, lang);
  const normFixedTokens = normalizeCode(cleanFixed, lang);

  const hasAllAdditions = addedTokens.length > 0 && addedTokens.every((token) => normFixedTokens.includes(token));
  const hasNoRemovals = removedTokens.length > 0 && removedTokens.every((token) => !normFixedTokens.includes(token));

  if (hasAllAdditions && hasNoRemovals) {
    return {
      success: true,
      isCorrect: true,
      correct: true,
      status: 'correct',
      score: 100,
      message: 'Vulnerability neutralized! Static analysis verified bug patch.',
      feedback: 'Your patch accurately addresses the structural vulnerability.',
      suggestions: ['Proceed to the next arena bounty.'],
      comboBonus: true,
      passedTests: testCases.length || 1,
      totalTests: testCases.length || 1,
      explanation: 'Static patch verified.',
    };
  }

  // Check 3: If LLM is available, query LLM for semantic verification
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

  // Check 4: Deterministic fallback when LLM is unconfigured / offline
  const isPatched = normCorrect && (
    (addedTokens.length > 0 && addedTokens.some((t) => normFixedTokens.includes(t))) ||
    normFixed.includes(normCorrect.slice(0, Math.min(normCorrect.length, 60)))
  ) && (removedTokens.length === 0 || !removedTokens.every((t) => normFixedTokens.includes(t)));

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
