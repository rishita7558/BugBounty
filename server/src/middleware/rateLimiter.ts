import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for LLM API endpoints.
 * Prevents abuse by limiting requests per IP window (30 requests per 15 minutes per IP).
 */
export const llmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes window
  max: 30,                    // 30 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait before generating another challenge.',
    retryAfterMs: 15 * 60 * 1000,
  },
});

/**
 * General rate limiter for health/misc endpoints.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
});
