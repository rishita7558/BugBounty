/**
 * @file evaluatorService.test.ts
 * @description Comprehensive unit test suite verifying zero false negatives
 * and zero false positives across all languages, styles, and data structures.
 */

import {
  deepEqual,
  valuesMatch,
  parseTestInputs,
  stripTypeScript,
  stripComments,
  normalizeCode,
  evaluateInVm,
  evaluateSubmission,
} from '../dist/services/evaluatorService.js';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE EVALUATOR SERVICE AUDIT TESTS ---');
  let failures = 0;

  function assert(condition: boolean, testName: string, extra?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`, extra ?? '');
      failures++;
    }
  }

  // 1. Output Comparison: Numbers & Floats
  assert(deepEqual(5, '5'), 'deepEqual: 5 === "5"');
  assert(deepEqual('5.0', 5), 'deepEqual: "5.0" === 5');
  assert(deepEqual(0.1 + 0.2, 0.3), 'deepEqual float tolerance: 0.1 + 0.2 === 0.3');
  assert(deepEqual('0.3', 0.1 + 0.2), 'deepEqual float string tolerance: "0.3" === 0.1 + 0.2');
  assert(valuesMatch(5, '5'), 'valuesMatch: 5 matches "5"');
  assert(valuesMatch(0.1 + 0.2, '0.3'), 'valuesMatch: 0.1 + 0.2 matches "0.3"');

  // 2. Output Comparison: Booleans
  assert(deepEqual(true, 'true'), 'deepEqual: true === "true"');
  assert(deepEqual(false, 'False'), 'deepEqual: false === "False"');
  assert(valuesMatch(true, 'true'), 'valuesMatch: true matches "true"');
  assert(valuesMatch(false, 'false'), 'valuesMatch: false matches "false"');
  assert(!valuesMatch(true, 'false'), 'valuesMatch: true does NOT match "false"');

  // 3. Output Comparison: Arrays and Objects
  assert(deepEqual([1, 2, 3], '[1, 2, 3]'), 'deepEqual: array === JSON string array');
  assert(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), 'deepEqual: object with different key orders');
  assert(valuesMatch({ a: 1, b: 2 }, '{"b":2,"a":1}'), 'valuesMatch: object matches unsorted JSON');
  assert(valuesMatch([1, 2, 3], '[1, 2, 3]'), 'valuesMatch: array matches string');

  // 4. Test Runner Input Parsing: Single-Array vs Multi-Arg
  // fn(nums): input "[1, 2, 3]" with expectedParamCount=1 MUST return [ [1, 2, 3] ]
  const singleArrInputs = parseTestInputs('[1, 2, 3]', 1);
  assert(
    Array.isArray(singleArrInputs) &&
      singleArrInputs.length === 1 &&
      Array.isArray(singleArrInputs[0]) &&
      singleArrInputs[0].length === 3,
    'parseTestInputs: single array fn(nums) wrapped as [ [1, 2, 3] ]',
    singleArrInputs
  );

  // fn(matrix): input "[[1, 2], [3, 4]]" with expectedParamCount=1 MUST return [ [[1, 2], [3, 4]] ]
  const matrixInputs = parseTestInputs('[[1, 2], [3, 4]]', 1);
  assert(
    matrixInputs.length === 1 &&
      Array.isArray(matrixInputs[0]) &&
      matrixInputs[0].length === 2 &&
      Array.isArray(matrixInputs[0][0]),
    'parseTestInputs: matrix parameter preserved as single argument',
    matrixInputs
  );

  // fn(nums, target): input "[2, 7, 11, 15], 9" with expectedParamCount=2 MUST return [ [2, 7, 11, 15], 9 ]
  const twoArgInputs = parseTestInputs('[2, 7, 11, 15], 9', 2);
  assert(
    twoArgInputs.length === 2 &&
      Array.isArray(twoArgInputs[0]) &&
      twoArgInputs[1] === 9,
    'parseTestInputs: 2-arg function returns [ [2, 7, 11, 15], 9 ]',
    twoArgInputs
  );

  // Named parameters: input "nums = [1, 2, 3], target = 4"
  const namedInputs = parseTestInputs('nums = [1, 2, 3], target = 4', 2);
  assert(
    namedInputs.length === 2 &&
      Array.isArray(namedInputs[0]) &&
      namedInputs[1] === 4,
    'parseTestInputs: named parameters stripped cleanly',
    namedInputs
  );

  // 5. TypeScript in VM Execution: containsDuplicate(nums: number[]): boolean
  const tsCode = `
function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
`;
  const tsVmResult = evaluateInVm(
    tsCode,
    [
      { input: '[1, 2, 3, 1]', expectedOutput: 'true' },
      { input: '[1, 2, 3, 4]', expectedOutput: 'false' },
    ],
    2000
  );
  assert(
    tsVmResult.isCorrect && tsVmResult.passedTests === 2,
    'evaluateInVm: TypeScript containsDuplicate passes with array inputs',
    tsVmResult
  );

  // TypeScript with Map generics and arrow function
  const tsArrowCode = `
const twoSum = (nums: number[], target: number): number[] => {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
};
`;
  const tsArrowResult = evaluateInVm(
    tsArrowCode,
    [{ input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' }],
    2000
  );
  assert(
    tsArrowResult.isCorrect && tsArrowResult.passedTests === 1,
    'evaluateInVm: TypeScript arrow function with Map generics passes',
    tsArrowResult
  );

  // 6. Multiple-Choice: Case-insensitive, option extraction
  const mcUpper = await evaluateSubmission({
    challengeStyle: 'multiple-choice',
    selectedOptionId: 'A',
    correctOptionId: 'a',
    bugDescription: 'SQL Injection flaw',
  });
  assert(mcUpper.isCorrect && mcUpper.status === 'correct', 'Multiple choice: "A" matches "a"');

  const mcFormatted = await evaluateSubmission({
    challengeStyle: 'multiple-choice',
    selectedOptionId: '(B)',
    correctOptionId: 'B',
  });
  assert(mcFormatted.isCorrect && mcFormatted.status === 'correct', 'Multiple choice: "(B)" matches "B"');

  const mcWrong = await evaluateSubmission({
    challengeStyle: 'multiple-choice',
    selectedOptionId: 'C',
    correctOptionId: 'A',
  });
  assert(!mcWrong.isCorrect && mcWrong.status === 'incorrect', 'Multiple choice: wrong option rejected');

  // 7. Predict-the-Output: Whitespace, newlines, quotes normalization
  const predNewline = await evaluateSubmission({
    challengeStyle: 'predict-the-output',
    userAnswer: '  hello\r\n  ',
    expectedOutput: 'hello',
  });
  assert(predNewline.isCorrect && predNewline.status === 'correct', 'Predict output: "  hello\\r\\n  " matches "hello"');

  const predQuotes = await evaluateSubmission({
    challengeStyle: 'predict-the-output',
    userAnswer: '"42"',
    expectedOutput: '42',
  });
  assert(predQuotes.isCorrect && predQuotes.status === 'correct', 'Predict output: \'"42"\' matches "42"');

  const predWrong = await evaluateSubmission({
    challengeStyle: 'predict-the-output',
    userAnswer: '99',
    expectedOutput: '100',
  });
  assert(!predWrong.isCorrect && predWrong.status === 'incorrect', 'Predict output: wrong answer rejected');

  // 8. Offline Non-JS: Python Binary Search
  const pyBuggy = `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low < high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`;

  const pyCorrect = `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    # Check bounds inclusively
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`;

  const pyReview = await evaluateSubmission({
    language: 'python',
    originalCode: pyBuggy,
    fixedCode: pyCorrect,
    correctCode: pyCorrect,
    bugDescription: 'Loop condition terminates prematurely',
    testCases: [{ input: '[1, 2, 3], 2', expectedOutput: '1' }],
  });
  assert(
    pyReview.isCorrect && pyReview.status === 'correct',
    'Offline Python: fixed code passes verification',
    pyReview
  );

  // 9. Offline Non-JS: C++ Binary Search Overflow
  const cppBuggy = `int search(const std::vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`;

  const cppCorrect = `int search(const std::vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`;

  const cppReview = await evaluateSubmission({
    language: 'cpp',
    originalCode: cppBuggy,
    fixedCode: cppCorrect,
    correctCode: cppCorrect,
    bugDescription: 'Signed integer overflow in midpoint calculation',
  });
  assert(
    cppReview.isCorrect && cppReview.status === 'correct',
    'Offline C++: fixed midpoint overflow passes',
    cppReview
  );

  // 10. Guard: Unchanged buggy code must fail
  const unchangedReview = await evaluateSubmission({
    language: 'python',
    originalCode: pyBuggy,
    fixedCode: pyBuggy,
    correctCode: pyCorrect,
  });
  assert(
    !unchangedReview.isCorrect && unchangedReview.status === 'incorrect',
    'Unchanged code is rejected'
  );

  // 11. Guard: Empty code must fail
  const emptyReview = await evaluateSubmission({
    language: 'javascript',
    originalCode: 'function foo() {}',
    fixedCode: '',
  });
  assert(
    !emptyReview.isCorrect && emptyReview.status === 'incorrect',
    'Empty code is rejected'
  );

  console.log(`\n--- AUDIT COMPLETE: ${failures === 0 ? 'ALL TESTS PASSED (0 FAILURES)' : `${failures} FAILURES`} ---`);
  if (failures > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
