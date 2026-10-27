// ---------------------------------------------------------------------------
// Web Worker — Sandboxed Code Runner (dual-mode)
// MODE 1 — free run:   executes code and captures console output
// MODE 2 — test suite: extracts `solution` fn and asserts against test cases
//
// Infinite-loop protection: the HOST terminates this worker after 2000 ms.
// ---------------------------------------------------------------------------

interface TestCase {
  input: any[];
  expected: any;
}

interface TestResult {
  testIndex: number;
  passed: boolean;
  expected: any;
  actual: any;
  executionTime: string;
}

type WorkerInput =
  | { mode: 'run';  code: string }
  | { mode: 'test'; code: string; testCases: TestCase[] };

self.onmessage = function (e: MessageEvent<WorkerInput>) {
  const data = e.data;
  const logs: string[] = [];
  const origLog = console.log;

  console.log = (...args: unknown[]) => {
    logs.push(
      args
        .map((a) => {
          try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
          catch { return String(a); }
        })
        .join(' ')
    );
  };

  try {
    // ── MODE: free run ────────────────────────────────────────────────────
    if (data.mode === 'run') {
      const start = performance.now();
      let result: unknown;
      try {
        result = new Function(data.code)();
      } catch (err: unknown) {
        const end = performance.now();
        self.postMessage({
          mode: 'run',
          success: false,
          output: logs.join('\n'),
          error: err instanceof Error ? err.message : String(err),
          executionTime: Math.round(end - start),
        });
        return;
      }
      const end = performance.now();
      if (result !== undefined) {
        logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      }
      self.postMessage({
        mode: 'run',
        success: true,
        output: logs.join('\n'),
        executionTime: Math.round(end - start),
      });

    // ── MODE: test-case assertion ─────────────────────────────────────────
    } else {
      let fn: (...args: any[]) => any;

      try {
        fn = new Function(`${data.code}; return solution;`)() as (...args: any[]) => any;
      } catch (err: unknown) {
        self.postMessage({
          mode: 'test',
          success: false,
          results: [],
          error: err instanceof Error ? err.message : 'Syntax Error',
        });
        return;
      }

      if (typeof fn !== 'function') {
        self.postMessage({
          mode: 'test',
          success: false,
          results: [],
          error: "Entry point 'solution' function not found.",
        });
        return;
      }

      const results: TestResult[] = [];
      let allPassed = true;

      for (const [index, test] of data.testCases.entries()) {
        const start = performance.now();
        let actual: unknown;
        let passed = false;
        try {
          actual = fn(...test.input);
          passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        } catch (err: unknown) {
          actual = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
          passed = false;
        }
        const elapsed = performance.now() - start;
        if (!passed) allPassed = false;

        results.push({
          testIndex:     index + 1,
          passed,
          expected:      test.expected,
          actual,
          executionTime: `${elapsed.toFixed(2)}ms`,
        });
      }

      self.postMessage({ mode: 'test', success: allPassed, results });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (data.mode === 'run') {
      self.postMessage({ mode: 'run', success: false, output: logs.join('\n'), error: msg, executionTime: 0 });
    } else {
      self.postMessage({ mode: 'test', success: false, results: [], error: msg });
    }
  } finally {
    console.log = origLog;
  }
};
