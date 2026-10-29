import LZString from 'lz-string';

// ---------------------------------------------------------------------------
// @codeduel/client-checker — Standalone Micro-SDK
// Injects a "Report Bug to CodeDuel" button into any web app and serializes
// current DOM state and console errors into a shareable 1-click debug link.
// ---------------------------------------------------------------------------

export interface CapturedError {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: number;
}

export interface BugBountyReporterOptions {
  endpoint?: string;
  appTitle?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  autoCaptureConsole?: boolean;
}

export interface ShareableChallengePayload {
  title: string;
  code: string;
  tests: Array<{ input: any[]; expected: any }>;
  author: string;
  description?: string;
  metadata?: {
    url?: string;
    userAgent?: string;
    timestamp?: number;
    errors?: CapturedError[];
  };
}

export class BugBountyReporter {
  private static attached = false;
  private static errors: CapturedError[] = [];
  private static cleanupFns: Array<() => void> = [];

  /**
   * Drop-in attachment for any existing web application.
   * Listens for runtime errors and injects the interactive Report Bug button.
   */
  static attach(options: { endpoint: string } & Partial<BugBountyReporterOptions>): {
    detach: () => void;
    getCapturedErrors: () => CapturedError[];
    serializeState: () => string;
  } {
    if (typeof window === 'undefined') {
      return {
        detach: () => {},
        getCapturedErrors: () => [],
        serializeState: () => '',
      };
    }

    const endpoint = options.endpoint || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
    const appTitle = options.appTitle || (typeof document !== 'undefined' ? document.title : 'External Web App');
    const position = options.position || 'bottom-right';
    const primaryColor = options.primaryColor || '#00f0ff';

    // Avoid duplicate attachments
    if (this.attached) {
      this.detach();
    }
    this.attached = true;
    this.errors = [];

    // 1. Error event listener
    const errorHandler = (event: ErrorEvent) => {
      const captured: CapturedError = {
        message: event.message || 'Unknown runtime error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
      };
      BugBountyReporter.errors.push(captured);
      console.warn('[CodeDuel Reporter Captured Error]', event.error || event.message);
      updateBadge();
    };
    window.addEventListener('error', errorHandler);
    this.cleanupFns.push(() => window.removeEventListener('error', errorHandler));

    // 2. Unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const captured: CapturedError = {
        message: typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection'),
        stack: reason?.stack,
        timestamp: Date.now(),
      };
      BugBountyReporter.errors.push(captured);
      console.warn('[CodeDuel Reporter Captured Rejection]', reason);
      updateBadge();
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
    this.cleanupFns.push(() => window.removeEventListener('unhandledrejection', rejectionHandler));

    // 3. Optional console.error interception
    if (options.autoCaptureConsole !== false) {
      const origConsoleError = console.error;
      console.error = (...args: any[]) => {
        try {
          const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          BugBountyReporter.errors.push({
            message: msg,
            timestamp: Date.now(),
          });
          updateBadge();
        } catch {
          // Ignore formatting issues
        }
        origConsoleError.apply(console, args);
      };
      this.cleanupFns.push(() => {
        console.error = origConsoleError;
      });
    }

    // 4. Inject "Report Bug to CodeDuel" button into the DOM
    const container = document.createElement('div');
    container.id = 'codeduel-reporter-widget';
    container.style.cssText = `
      position: fixed;
      ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      z-index: 999999;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(10, 10, 20, 0.95);
      color: ${primaryColor};
      border: 1px solid ${primaryColor};
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.35);
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    `;
    button.innerHTML = `
      <span style="font-size: 15px;">👾</span>
      <span>Report Bug to CodeDuel</span>
      <span id="codeduel-error-count" style="display:none; background: #ff0055; color: #fff; border-radius: 999px; padding: 2px 7px; font-size: 10px;">0</span>
    `;

    button.onmouseenter = () => {
      button.style.transform = 'translateY(-2px) scale(1.02)';
      button.style.boxShadow = '0 0 22px rgba(0, 240, 255, 0.6)';
    };
    button.onmouseleave = () => {
      button.style.transform = 'translateY(0) scale(1)';
      button.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.35)';
    };

    button.onclick = () => {
      const shareUrl = BugBountyReporter.buildShareUrl(endpoint, appTitle);
      // Copy to clipboard and offer to open in new tab
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Debug link copied to clipboard!');
        }).catch(() => {
          // Fallback
        });
      }
      window.open(shareUrl, '_blank');
    };

    container.appendChild(button);
    document.body.appendChild(container);
    this.cleanupFns.push(() => container.remove());

    const updateBadge = () => {
      const badge = document.getElementById('codeduel-error-count');
      if (badge) {
        const count = BugBountyReporter.errors.length;
        if (count > 0) {
          badge.style.display = 'inline-block';
          badge.textContent = String(count);
          button.style.borderColor = '#ff0055';
          button.style.color = '#ff0055';
          button.style.boxShadow = '0 0 18px rgba(255, 0, 85, 0.5)';
        }
      }
    };

    const showToast = (msg: string) => {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        background: #00f0ff;
        color: #05050d;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        z-index: 1000000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      `;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    };

    return {
      detach: () => this.detach(),
      getCapturedErrors: () => [...this.errors],
      serializeState: () => this.serializeCurrentState(appTitle),
    };
  }

  /**
   * Remove listeners and reporter button widget.
   */
  static detach() {
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore cleanup errors
      }
    });
    this.cleanupFns = [];
    this.attached = false;
  }

  /**
   * Serialize current DOM state and console errors into a compressed payload.
   */
  static serializeCurrentState(appTitle: string): string {
    const payload: ShareableChallengePayload = {
      title: `Bug Report: ${appTitle}`,
      author: 'BugBountyReporter',
      description: `Auto-captured bug report from ${typeof window !== 'undefined' ? window.location.href : 'browser'}. Errors captured: ${this.errors.length}`,
      code: this.generateReproductionCode(),
      tests: [
        {
          input: ['reproduce'],
          expected: 'No runtime exceptions thrown',
        },
      ],
      metadata: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: Date.now(),
        errors: this.errors,
      },
    };

    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  }

  /**
   * Build the complete 1-click debug URL pointing to CodeDuel Arena.
   */
  static buildShareUrl(endpoint: string, appTitle: string): string {
    const compressed = this.serializeCurrentState(appTitle);
    const base = endpoint.replace(/\/+$/, '');
    return `${base}/#challenge=${compressed}`;
  }

  /**
   * Generate executable JavaScript snippet reproducing the captured error.
   */
  private static generateReproductionCode(): string {
    const latestError = this.errors[this.errors.length - 1];
    const errorMsg = latestError?.message || 'Error occurred during execution';
    const errorStack = latestError?.stack ? `\n/* Stack trace:\n${latestError.stack}\n*/` : '';

    return `// CodeDuel Reproduction Sandbox
// Generated automatically by @codeduel/client-checker
function triggerCapturedBug() {
  console.log("Analyzing captured bug: ${errorMsg.replace(/"/g, '\\"')}");
  ${errorStack}
  // TODO: Fix the issue below
  throw new Error("${errorMsg.replace(/"/g, '\\"')}");
}

triggerCapturedBug();
`;
  }
}

// ── Static Code Checker Utility (Backwards-Compatible) ─────────────────────

export interface BugCheckResult {
  hasBug: boolean;
  line?: number;
  description?: string;
  severity: 'low' | 'medium' | 'hard' | 'critical';
  suggestion?: string;
}

export interface CheckerOptions {
  timeout?: number;
  strict?: boolean;
}

/**
 * Run static analysis on JavaScript code to detect common bug patterns.
 */
export function checkCode(code: string, _options: CheckerOptions = {}): BugCheckResult[] {
  const results: BugCheckResult[] = [];
  const lines = code.split('\n');

  lines.forEach((line, i) => {
    // Check for accidental assignment in conditional
    if (/[^!=]=[^=]/.test(line) && /if\s*\(/.test(line)) {
      results.push({
        hasBug: true,
        line: i + 1,
        description: 'Assignment in conditional — did you mean ===?',
        severity: 'hard',
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

export default {
  BugBountyReporter,
  checkCode,
};
