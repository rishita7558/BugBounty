/**
 * @file app.ts
 * @description Express application setup, security middleware configuration, and routing definitions.
 * Provides rate-limiting, CORS whitelisting, and validation endpoints with zero stateful database requirements.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { llmRateLimiter, generalRateLimiter } from './middleware/rateLimiter.js';
import { generateChallenge, reviewCode } from './controllers/challenge.controller.js';
import { getHint } from './controllers/hint.controller.js';
import {
  validateScore,
  validateStreak,
  validateHintRequest,
} from './controllers/validation.controller.js';

const app = express();

// Security and request parsing middleware
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile clients, curl, or internal dev proxies)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

/**
 * Health check endpoint reporting service status, version, and server uptime.
 */
app.get('/api/health', generalRateLimiter, (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Generative challenge and review endpoints
app.post('/api/challenge/generate', llmRateLimiter, generateChallenge);
app.post('/api/challenge/review', llmRateLimiter, reviewCode);
app.post('/api/hint', llmRateLimiter, getHint);

// Game mechanics validation and integrity endpoints
app.post('/api/score/validate', generalRateLimiter, validateScore);
app.post('/api/streak/validate', generalRateLimiter, validateStreak);
app.post('/api/hint/validate', generalRateLimiter, validateHintRequest);

// Centralized error handler middleware (must remain final middleware in pipeline)
app.use(errorHandler);

export default app;
