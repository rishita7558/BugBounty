/**
 * @file ErrorBoundary.tsx
 * @description Production-grade React Error Boundary component designed for the CodeDuel arcade interface.
 * Isolates runtime UI failures to specific component trees, preventing cascading crashes across the arena.
 * Styled in Ice Matrix cyber aesthetics.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Properties accepted by the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** The child component tree protected by this boundary. */
  children: ReactNode;
  /** Optional custom fallback render function or ReactNode. */
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  /** Optional callback invoked whenever an unhandled exception is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional callback executed when the user resets the boundary. */
  onReset?: () => void;
  /** Human-readable identifier for the protected subtree (e.g., 'Scoreboard', 'CodeEditor'). */
  componentName?: string;
  /** Custom heading title displayed in the fallback arcade card. */
  title?: string;
}

/**
 * State shape for the ErrorBoundary component.
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Class component implementing React's Error Boundary lifecycle methods.
 * Renders a stylized cyberpunk alert card when a subtree crashes.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  /**
   * Updates state so the next render will show the fallback UI.
   *
   * @param error The caught runtime exception.
   * @returns Updated boundary state.
   */
  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Catches errors in descendant components and triggers diagnostic callbacks.
   *
   * @param error The error thrown during rendering or lifecycle execution.
   * @param errorInfo Component stack traces and metadata.
   */
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary] Fault caught in component <${this.props.componentName || 'Subtree'}>:`,
      error,
      errorInfo
    );

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Resets the boundary state, attempting to re-render the child component tree.
   */
  public resetErrorBoundary = (): void => {
    Object.assign(this.state, {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    try {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    } catch {
      // Ignored when unmounted
    }
    this.props.onReset?.();
  };

  /**
   * Toggles the visibility of technical stack trace diagnostics.
   */
  public toggleDetails = (): void => {
    const nextShow = !this.state.showDetails;
    Object.assign(this.state, { showDetails: nextShow });
    try {
      this.setState({ showDetails: nextShow });
    } catch {
      // Ignored when unmounted
    }
  };

  public override render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, componentName, title } = this.props;

    if (!hasError) {
      return children;
    }

    // Render custom fallback if supplied
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({
          error: error || new Error('Unknown rendering fault'),
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }
      return fallback;
    }

    const componentLabel = componentName ? `<${componentName} />` : 'Component Tree';
    const errorHeading = title || 'Subtree Glitch Detected';
    const errorMessage = error?.message || 'An unexpected rendering fault occurred.';

    return (
      <div
        className="pixel-box animate-screen-shake"
        role="alert"
        aria-live="assertive"
        style={{
          padding: '24px',
          border: '1px solid rgba(255, 59, 105, 0.5)',
          background: 'rgba(8, 20, 38, 0.95)',
          boxShadow: '0 0 30px rgba(255, 59, 105, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          margin: '12px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header with status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="#FF3B69" />
            <h3
              className="arcade-text"
              style={{
                fontSize: '0.8rem',
                color: '#FF3B69',
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              {errorHeading}
            </h3>
          </div>

          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '2px',
              background: 'rgba(255, 59, 105, 0.15)',
              color: '#FF3B69',
              border: '1px solid rgba(255, 59, 105, 0.3)',
            }}
          >
            FAULT: {componentLabel}
          </span>
        </div>

        {/* Diagnostic explanation */}
        <p
          style={{
            color: '#8199B5',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          A component exception was isolated to this subtree. The remainder of the BugBounty Arena continues
          operating normally. You may attempt to recover this component or inspect technical diagnostics below.
        </p>

        {/* Action button & technical toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn-pixel-cyber"
            onClick={this.resetErrorBoundary}
            style={{ borderColor: '#00D9FF', color: '#00D9FF' }}
          >
            <RotateCcw size={14} color="#00D9FF" /> Recover Subtree
          </button>

          <button
            onClick={this.toggleDetails}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8199B5',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{showDetails ? 'Hide Diagnostics' : 'Show Technical Stack Trace'}</span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Stack trace panel */}
        {showDetails && (
          <div
            style={{
              background: '#050B18',
              border: '1px solid rgba(255, 59, 105, 0.3)',
              padding: '12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: '#FF3B69',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>{errorMessage}</div>
            {errorInfo?.componentStack && (
              <div style={{ color: '#8199B5', fontSize: '0.7rem' }}>
                {errorInfo.componentStack}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
