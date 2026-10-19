# Technical Requirements Document — CodeDuel: BugBounty Arena

## Architecture
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Minimal Express.js proxy (~100 LOC, zero business logic)
- **State:** Zustand with subscribeWithSelector middleware
- **Storage:** Dexie.js (IndexedDB), localStorage, lz-string URL hashes
- **LLM:** Gemini 1.5 Flash / OpenAI GPT-4o-mini via backend proxy

## Technology Stack
| Layer | Technology |
|-------|-----------|
| UI Framework | React 18.x |
| Build Tool | Vite 8.x |
| CSS | Tailwind CSS v4 |
| State Management | Zustand |
| Code Editor | Monaco Editor |
| Database | IndexedDB (Dexie.js) |
| Audio | Web Audio API |
| Code Execution | Web Workers |
| Backend | Express.js + TypeScript |
| LLM Integration | Gemini / OpenAI SDK |
