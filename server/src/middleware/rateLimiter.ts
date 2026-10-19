import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for LLM API endpoints.
 * Prevents abuse by limiting requests per IP window.
 */
export const llmRateLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 15,                    // 15 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait before generating another challenge.',
    retryAfterMs: 60_000,
  },
});

/**
 * General rate limiter for health/misc endpoints.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
