// ---------------------------------------------------------------------------
// Web Worker — Sandboxed Code Runner
// This file exists for reference; the actual worker is created as an
// inline blob in useCodeRunner.ts for maximum sandbox isolation.
// ---------------------------------------------------------------------------

self.onmessage = function (e: MessageEvent<{ code: string }>) {
  const { code } = e.data;
  const start = performance.now();
  const logs: string[] = [];

  // Capture console output
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(
      args
        .map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
          } catch {
            return String(a);
          }
        })
        .join(' ')
    );
  };

  try {
    const result = new Function(code)();
    const end = performance.now();

    if (result !== undefined) {
      logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    }

    self.postMessage({
      success: true,
      output: logs.join('\n'),
      executionTime: Math.round(end - start),
    });
  } catch (err: unknown) {
    const end = performance.now();
    self.postMessage({
      success: false,
      output: logs.join('\n'),
      error: err instanceof Error ? err.message : String(err),
      executionTime: Math.round(end - start),
    });
  } finally {
    console.log = origLog;
  }
};
