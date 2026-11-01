/**
 * @file useCodeRunner.ts
 * @description Sandboxed code execution engine using Web Workers and watchdog timeout protection.
 * Executes untrusted player code in an isolated worker thread with console interception
 * and automatic 2000ms loop termination to safeguard the browser UI from locking.
 */

import { useCallback, useRef, useState } from 'react';

/**
 * Result returned from free code execution.
 */
export interface RunResult {
  mode: 'run';
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

/**
 * Result returned from evaluating a single test case assertion.
 */
export interface TestCaseResult {
  testIndex: number;
  passed: boolean;
  expected: any;
  actual: any;
  executionTime: string;
}

/**
 * Aggregate result returned from executing a test suite against player code.
 */
export interface TestResult {
  mode: 'test';
  success: boolean;
  results: TestCaseResult[];
  error?: string;
}

export type WorkerResult = RunResult | TestResult;

/**
 * Inline ES5 worker script capturing console output and handling assertions.
 */
const WORKER_SOURCE = `
self.onmessage = function(e) {
  var data = e.data;
  var logs = [];
  var origLog = console.log;

  console.log = function() {
    var args = Array.prototype.slice.call(arguments);
    logs.push(args.map(function(a) {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(_) { return String(a); }
    }).join(' '));
  };

  try {
    if (data.mode === 'run') {
      var start = performance.now();
      var result;
      try { result = new Function(data.code)(); }
      catch(err) {
        var end = performance.now();
        self.postMessage({ mode: 'run', success: false, output: logs.join('\\n'),
          error: err.message || String(err), executionTime: Math.round(end - start) });
        return;
      }
      var end = performance.now();
      if (result !== undefined)
        logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      self.postMessage({ mode: 'run', success: true, output: logs.join('\\n'),
        executionTime: Math.round(end - start) });

    } else {
      var fn;
      try { fn = new Function(data.code + '; return solution;')(); }
      catch(err) {
        self.postMessage({ mode: 'test', success: false, results: [],
          error: err.message || 'Syntax Error' });
        return;
      }
      if (typeof fn !== 'function') {
        self.postMessage({ mode: 'test', success: false, results: [],
          error: "Entry point 'solution' function not found." });
        return;
      }
      var results = [];
      var allPassed = true;
      for (var i = 0; i < data.testCases.length; i++) {
        var test = data.testCases[i];
        var t0 = performance.now();
        var actual, passed = false;
        try {
          actual = fn.apply(null, test.input);
          passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        } catch(err) {
          actual = 'ERROR: ' + (err.message || String(err));
        }
        var elapsed = performance.now() - t0;
        if (!passed) allPassed = false;
        results.push({ testIndex: i + 1, passed: passed, expected: test.expected,
          actual: actual, executionTime: elapsed.toFixed(2) + 'ms' });
      }
      self.postMessage({ mode: 'test', success: allPassed, results: results });
    }
  } catch(err) {
    if (data.mode === 'run')
      self.postMessage({ mode: 'run', success: false, output: logs.join('\\n'),
        error: err.message || String(err), executionTime: 0 });
    else
      self.postMessage({ mode: 'test', success: false, results: [],
        error: err.message || String(err) });
  } finally {
    console.log = origLog;
  }
};
`;

const WATCHDOG_MS = 2000;

/**
 * Spawns an ephemeral Web Worker blob instance to execute the supplied payload.
 *
 * @template T Expected return result type.
 * @param payload Instruction payload for the worker.
 * @param timeoutMs Maximum allowable execution time before worker termination.
 * @returns Promise resolving to execution results.
 */
function spawnWorker<T>(payload: object, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve) => {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if ((payload as any).mode === 'run') {
        resolve({
          mode: 'run',
          success: false,
          output: '',
          error: `Execution timed out (exceeded ${timeoutMs}ms). Possible infinite loop.`,
          executionTime: timeoutMs,
        } as unknown as T);
      } else {
        resolve({
          mode: 'test',
          success: false,
          results: [],
          error: `Test timed out (exceeded ${timeoutMs}ms). Possible infinite loop.`,
        } as unknown as T);
      }
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent<T>) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(e.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      if ((payload as any).mode === 'run') {
        resolve({
          mode: 'run',
          success: false,
          output: '',
          error: err.message || 'Worker error',
          executionTime: 0,
        } as unknown as T);
      } else {
        resolve({
          mode: 'test',
          success: false,
          results: [],
          error: err.message || 'Worker error',
        } as unknown as T);
      }
    };

    worker.postMessage(payload);
  });
}

/**
 * Custom React hook managing sandboxed code execution in Web Workers.
 *
 * @returns Code execution methods and running status.
 */
export function useCodeRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const activeWorkerRef = useRef<Promise<any> | null>(null);

  /**
   * Executes source code freely and captures standard console output.
   *
   * @param code The JavaScript code string to execute.
   * @param timeoutMs Timeout watchdog threshold (defaults to 2000ms).
   * @returns RunResult containing output and execution time.
   */
  const runCode = useCallback(
    async (code: string, timeoutMs = WATCHDOG_MS): Promise<RunResult> => {
      setIsRunning(true);
      try {
        const p = spawnWorker<RunResult>({ mode: 'run', code }, timeoutMs);
        activeWorkerRef.current = p;
        return await p;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  /**
   * Executes code against an array of input/output test cases.
   *
   * @param code The JavaScript code string defining a solution function.
   * @param testCases Array of test inputs and expected outputs.
   * @param timeoutMs Timeout watchdog threshold (defaults to 2000ms).
   * @returns TestResult containing per-test breakdown.
   */
  const runTests = useCallback(
    async (
      code: string,
      testCases: Array<{ input: any[]; expected: any }>,
      timeoutMs = WATCHDOG_MS
    ): Promise<TestResult> => {
      setIsRunning(true);
      try {
        const p = spawnWorker<TestResult>({ mode: 'test', code, testCases }, timeoutMs);
        activeWorkerRef.current = p;
        return await p;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return { runCode, runTests, isRunning };
}
