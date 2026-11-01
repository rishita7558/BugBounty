/**
 * @file rateLimiter.ts
 * @description IP-based rate limiting middleware configurations using express-rate-limit.
 * Protects generative challenge and review endpoints from quota exhaustion and denial-of-service attempts.
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware for intensive computational and generative proxy endpoints.
 * Restricts client IP addresses to 30 requests per 15-minute sliding window.
 */
export const llmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait before generating another challenge.',
    retryAfterMs: 15 * 60 * 1000,
  },
});

/**
 * General rate limiter middleware for health check and game validation endpoints.
 * Restricts client IP addresses to 150 requests per 15-minute sliding window.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
});
