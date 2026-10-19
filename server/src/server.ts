import 'dotenv/config';
import app from './app.js';

// ---------------------------------------------------------------------------
// Server Entry — Boots the minimal Express proxy.
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  🎮  CodeDuel: BugBounty Arena — LLM Proxy Server   ║
  ║  🌐  http://localhost:${PORT}                         ║
  ║  📡  Health: http://localhost:${PORT}/api/health       ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
