# 🎮 CodeDuel: BugBounty Arena

> **The Arcade-Style Client-Side Code Debugging & Vulnerability Remediation Playground**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)

---

## 🚀 Overview

CodeDuel: BugBounty Arena is an interactive code debugging game where players find and fix bugs in AI-generated code challenges. Featuring a cyberpunk/retro-arcade aesthetic, combo scoring mechanics, ticking bomb timers, and procedural sound synthesis.

### Key Features

- 🧠 **AI-Powered Challenges** — Dynamic bug generation via Gemini / OpenAI
- 📝 **Monaco Code Editor** — Full IntelliSense, syntax highlighting, bracket colorization
- ⚡ **Sandboxed Execution** — Web Worker-based code runner with timeout protection
- 🔥 **Combo System** — Build score multipliers with consecutive correct fixes
- 💡 **Progressive Hints** — 3-level AI hint system with point penalties
- 💾 **Offline Persistence** — IndexedDB for scores, history, and badges
- 🔗 **Shareable URLs** — LZ-string compressed game state sharing
- 🎵 **Retro Sound FX** — Procedural Web Audio API synthesis
- 🎨 **Cyberpunk UI** — Neon glow effects, CRT scanlines, glassmorphism

---

## 🏗️ Architecture

```
Client (React + Vite)  ←→  Minimal Node.js Proxy (Express)  ←→  LLM APIs
   ↓                                                              
IndexedDB / Web Workers / Web Audio API
```

- **100% Client-Side Evaluation** — No code runs on the server
- **Zero Database** — All persistence via IndexedDB and localStorage
- **Minimal Backend** — Express proxy (~100 LOC) for LLM API key security

---

## 📁 Project Structure

```
codeduel-bugbounty/
├── client/          # React 18 + Vite + TypeScript frontend
├── server/          # Minimal Express.js LLM proxy
├── sdk/             # Embeddable bug checker SDK
├── docs/            # PRD, TRD, API Spec, User Guide
└── .github/         # CI/CD workflows
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Gemini or OpenAI API key

### Quick Start

```bash
# Install all dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Configure API key
cp server/.env.example server/.env
# Edit server/.env with your key

# Start everything
npm run dev
```

The client runs on `http://localhost:5173` and the server on `http://localhost:3001`.

---

## 👥 Team Workload Distribution

| Member | Responsibility |
|--------|---------------|
| **1** | UI/UX & Retro Game Engine (Monaco, Tailwind, Sound, Particles) |
| **2** | Client Execution & Storage (Web Workers, IndexedDB, URL Sharing) |
| **3** | Node.js Proxy & LLM (Express, Prompt Engineering, SDK) |
| **4** | QA, Testing & Documentation (PRD, TRD, Vitest, Cypress, CI/CD) |

---

## 📚 Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [Technical Requirements (TRD)](docs/TRD.md)
- [API Specification](docs/API_SPEC.md)
- [User Guide](docs/USER_GUIDE.md)

---

## 📄 License

MIT © CodeDuel Team
