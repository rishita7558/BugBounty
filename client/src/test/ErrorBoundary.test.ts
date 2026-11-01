/**
 * @file ErrorBoundary.test.ts
 * @description Unit tests for ErrorBoundary lifecycle methods and fault state transitions.
 */

import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

describe('ErrorBoundary Component Lifecycle', () => {
  it('updates state via getDerivedStateFromError when exception occurs', () => {
    const error = new Error('Subtree rendering crash');
    const state = ErrorBoundary.getDerivedStateFromError(error);

    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('resets error state when resetErrorBoundary is triggered', () => {
    let resetCalled = false;
    const boundary = new ErrorBoundary({
      children: null,
      componentName: 'TestSubtree',
      onReset: () => {
        resetCalled = true;
      },
    });

    // Simulate caught error
    boundary.state = {
      hasError: true,
      error: new Error('Fault'),
      errorInfo: null,
      showDetails: true,
    };

    boundary.resetErrorBoundary();

    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);
    expect(boundary.state.errorInfo).toBe(null);
    expect(boundary.state.showDetails).toBe(false);
    expect(resetCalled).toBe(true);
  });

  it('toggles diagnostic details state', () => {
    const boundary = new ErrorBoundary({
      children: null,
    });

    expect(boundary.state.showDetails).toBe(false);
    boundary.toggleDetails();
    expect(boundary.state.showDetails).toBe(true);
    boundary.toggleDetails();
    expect(boundary.state.showDetails).toBe(false);
  });
});
