/**
 * @file ErrorBoundary.tsx
 * @description Production-grade React Error Boundary component designed for the CodeDuel arcade interface.
 * Isolates runtime UI failures to specific component trees, preventing cascading crashes across the arena.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Bug, ChevronDown, ChevronUp } from 'lucide-react';

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
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  /**
   * Toggles the visibility of technical stack trace diagnostics.
   */
  public toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
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
        className="glass-card animate-shake"
        role="alert"
        aria-live="assertive"
        style={{
          padding: '24px',
          border: '1px solid var(--neon-red)',
          background: 'rgba(255, 0, 85, 0.08)',
          boxShadow: '0 0 20px rgba(255, 0, 85, 0.2)',
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
            <AlertTriangle size={24} color="var(--neon-red)" />
            <h3
              className="arcade-text"
              style={{
                fontSize: '0.8rem',
                color: 'var(--neon-red)',
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
              borderRadius: '4px',
              background: 'rgba(255, 0, 85, 0.15)',
              color: 'var(--neon-red)',
              border: '1px solid rgba(255, 0, 85, 0.3)',
            }}
          >
            FAULT: {componentLabel}
          </span>
        </div>

        {/* Diagnostic explanation */}
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          A component exception was isolated to this subtree. The remainder of the BugBounty Arena continues
          operating normally. You may attempt to recover this component or inspect technical diagnostics below.
        </p>

        {/* Error message snippet */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(9, 10, 15, 0.85)',
            border: '1px solid rgba(255, 0, 85, 0.2)',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--neon-red)',
            wordBreak: 'break-word',
          }}
        >
          <code>{errorMessage}</code>
        </div>

        {/* Expandable technical details */}
        <div>
          <button
            type="button"
            onClick={this.toggleDetails}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              padding: '4px 0',
            }}
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetails ? 'Hide Diagnostics' : 'Show Stack Diagnostics'}
          </button>

          {showDetails && (
            <div
              style={{
                marginTop: '10px',
                padding: '12px',
                background: '#090A0F',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {error?.stack || 'No JavaScript call stack available.'}
                {errorInfo?.componentStack && `\n\nComponent Hierarchy:${errorInfo.componentStack}`}
              </pre>
            </div>
          )}
        </div>

        {/* Action button controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn-neon btn-neon-red"
            onClick={this.resetErrorBoundary}
            style={{ fontSize: '0.75rem', padding: '8px 16px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} /> Retry Subtree
            </span>
          </button>
        </div>
      </div>
    );
  }
}

/**
 * Higher-order component to wrap any functional or class component in an ErrorBoundary.
 *
 * @param WrappedComponent The React component to wrap.
 * @param boundaryProps Configuration properties passed to the boundary instance.
 * @returns Wrapped component protected by the ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const componentName =
    boundaryProps?.componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component';

  const WithErrorBoundary: React.FC<P> = (props: P) => (
    <ErrorBoundary {...boundaryProps} componentName={componentName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${componentName})`;
  return WithErrorBoundary;
}

export default ErrorBoundary;
