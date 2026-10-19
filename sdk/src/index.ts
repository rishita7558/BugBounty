// ---------------------------------------------------------------------------
// @codeduel/client-checker — Embeddable Bug Checker SDK
// ---------------------------------------------------------------------------

export interface BugCheckResult {
  hasBug: boolean;
  line?: number;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

export interface CheckerOptions {
  timeout?: number;
  strict?: boolean;
}

/**
 * Run a basic static analysis on the provided JavaScript code
 * to detect common bug patterns.
 */
export function checkCode(code: string, _options: CheckerOptions = {}): BugCheckResult[] {
  const results: BugCheckResult[] = [];
  const lines = code.split('\n');

  lines.forEach((line, i) => {
    // Check for common equality mistakes
    if (/[^!=]==[^=]/.test(line) && /if\s*\(/.test(line)) {
      // This is fine — strict equality
    } else if (/[^!=]=[^=]/.test(line) && /if\s*\(/.test(line)) {
      results.push({
        hasBug: true,
        line: i + 1,
        description: 'Assignment in conditional — did you mean ===?',
        severity: 'high',
        suggestion: 'Replace = with === for comparison',
      });
    }

    // Check for potential infinite loops
    if (/while\s*\(\s*true\s*\)/.test(line)) {
      results.push({
        hasBug: true,
        line: i + 1,
        description: 'Potential infinite loop detected',
        severity: 'critical',
        suggestion: 'Add a break condition inside the loop',
      });
    }

    // Check for console.log left in code
    if (/console\.log/.test(line)) {
      results.push({
        hasBug: false,
        line: i + 1,
        description: 'console.log statement found',
        severity: 'low',
        suggestion: 'Consider removing debug statements',
      });
    }
  });

  return results;
}

export default { checkCode };
