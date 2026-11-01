/**
 * @file server.ts
 * @description HTTP server bootstrap entry point for CodeDuel: BugBounty Arena.
 * Loads environment configurations, binds to designated port, and starts listening for incoming proxy traffic.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  🎮  CodeDuel: BugBounty Arena — API Gateway Server  ║
  ║  🌐  http://localhost:${PORT}                         ║
  ║  📡  Health: http://localhost:${PORT}/api/health       ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
