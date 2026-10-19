# Product Requirements Document — CodeDuel: BugBounty Arena

## Overview
CodeDuel: BugBounty Arena is an arcade-style code debugging playground where developers find and fix bugs in AI-generated code challenges.

## Core Features
1. **Dynamic Challenge Generation** — LLM-powered bug creation across categories (logic, async, DOM, security, performance, syntax)
2. **Monaco Code Editor** — Full-featured code editing with syntax highlighting and IntelliSense
3. **Sandboxed Execution** — Web Worker-based code runner with timeout protection
4. **Combo Scoring System** — Consecutive correct fixes build score multipliers
5. **Progressive AI Hints** — 3-level hint system with point penalties
6. **Offline Persistence** — IndexedDB via Dexie.js for scores, history, and badges
7. **URL State Sharing** — LZ-string compressed shareable URLs

## Non-Functional Requirements
- 100% client-side evaluation
- Zero database architecture
- Sub-100ms UI interactions
- Mobile-responsive design
- Offline-first capability
