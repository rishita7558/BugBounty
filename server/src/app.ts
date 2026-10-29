import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { llmRateLimiter, generalRateLimiter } from './middleware/rateLimiter.js';
import { generateChallenge, reviewCode } from './controllers/challenge.controller.js';
import { getHint } from './controllers/hint.controller.js';

// ---------------------------------------------------------------------------
// Express App — Minimal Node.js LLM Security Proxy & CORS Gateway.
// Zero database dependencies. Zero session storage. ~100 LOC.
// ---------------------------------------------------------------------------

const app = express();

// ── Security & Global Middleware ───────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or dev proxy)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', generalRateLimiter, (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── LLM Proxy Routes ─────────────────────────────────────────────────────
app.post('/api/challenge/generate', llmRateLimiter, generateChallenge);
app.post('/api/challenge/review', llmRateLimiter, reviewCode);
app.post('/api/hint', llmRateLimiter, getHint);

// ── Error Handler (must be last) ─────────────────────────────────────────
app.use(errorHandler);

export default app;
