/**
 * @file errorHandler.ts
 * @description Global Express error handling middleware.
 * Sanitizes application exceptions and formats standardized JSON error payloads.
 */

import type { ErrorRequestHandler } from 'express';

/**
 * Global error handler middleware.
 * Intercepts uncaught exceptions in the pipeline, logs relevant diagnostics,
 * and responds with sanitized error details, suppressing stack traces in production environments.
 *
 * @param err Caught application error or HTTP exception.
 * @param _req Express request object.
 * @param res Express response object.
 * @param _next Express next middleware function.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';

  console.error(`[ERROR] ${statusCode} — ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
