/**
 * @file main.tsx
 * @description Application bootstrap entry point for BugBounty.
 * Mounts the root React DOM tree inside StrictMode and wraps the application with a top-level ErrorBoundary.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './assets/styles/pixel-theme.css';
import App from './App.tsx';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Fatal: Unable to locate root DOM container element (#root).');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary componentName="RootApplication" title="Arena Fatal Exception">
      <App />
    </ErrorBoundary>
  </StrictMode>
);
