import { useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Web Worker Code Runner Hook
// Executes player code in a sandboxed Web Worker thread with a timeout.
// ---------------------------------------------------------------------------

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export function useCodeRunner() {
  const workerRef = useRef<Worker | null>(null);

  const runCode = useCallback((code: string, timeoutMs = 5000): Promise<RunResult> => {
    return new Promise((resolve) => {
      // Terminate existing worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Create inline worker blob
      const workerCode = `
        self.onmessage = function(e) {
          const code = e.data.code;
          const start = performance.now();
          const logs = [];
          
          // Override console.log to capture output
          const originalLog = console.log;
          console.log = (...args) => {
            logs.push(args.map(a => {
              try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
              catch { return String(a); }
            }).join(' '));
          };
          
          try {
            const result = new Function(code)();
            const end = performance.now();
            
            if (result !== undefined) {
              logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
            }
            
            self.postMessage({
              success: true,
              output: logs.join('\\n'),
              executionTime: Math.round(end - start)
            });
          } catch (err) {
            const end = performance.now();
            self.postMessage({
              success: false,
              output: logs.join('\\n'),
              error: err.message || String(err),
              executionTime: Math.round(end - start)
            });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      workerRef.current = worker;

      const timer = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve({
          success: false,
          output: '',
          error: 'Execution timed out (exceeded ' + timeoutMs + 'ms)',
          executionTime: timeoutMs,
        });
      }, timeoutMs);

      worker.onmessage = (e: MessageEvent<RunResult>) => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(e.data);
      };

      worker.onerror = (e) => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve({
          success: false,
          output: '',
          error: e.message || 'Worker error',
          executionTime: 0,
        });
      };

      worker.postMessage({ code });
    });
  }, []);

  return { runCode };
}
