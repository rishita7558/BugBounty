import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { llmRateLimiter, generalRateLimiter } from './middleware/rateLimiter.js';
import { generateChallenge, reviewCode } from './controllers/challenge.controller.js';
import { getHint } from './controllers/hint.controller.js';

// ---------------------------------------------------------------------------
// Express App — Minimal LLM security proxy & CORS gateway.
// Zero database. Zero session storage. ~100 LOC.
// ---------------------------------------------------------------------------

const app = express();

// ── Global Middleware ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
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
