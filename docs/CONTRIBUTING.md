# Contributing to BugBounty

Thank you for your interest in contributing to **BugBounty**! We are committed to maintaining an open, modular, robust, and accessible platform for interactive debugging and vulnerability remediation.

Please take a few moments to review these contribution guidelines before submitting code, filing issues, or opening pull requests.

---

## 1. Code of Conduct

We expect all contributors, maintainers, and community participants to adhere to the following principles:
- **Respectful Collaboration:** Communicate constructively, welcome newcomers, and focus on technical merits.
- **Documentation Integrity:** Preserve existing code comments and provide thorough JSDoc documentation for all new or modified symbols.
- **Security Awareness:** Never publish real production credentials, API secrets, or malicious payloads in public branches or pull requests.

---

## 2. Development Environment Setup

### 2.1 Prerequisites
- **Node.js:** Version `18.0.0` or higher (LTS recommended)
- **Package Manager:** `npm` version `9.0.0` or higher
- **Operating Systems:** Linux, macOS, or Windows

### 2.2 Repository Structure
The repository is organized as a multi-package workspace:

```
bugbounty/
├── client/          # Frontend application (React 18 + Vite + TypeScript)
├── server/          # API Gateway & Security Proxy (Express.js + TypeScript)
├── sdk/             # Standalone micro-SDK for external bug reporting
├── docs/            # Technical specifications and architectural documentation
└── .github/         # Continuous integration workflows
```

### 2.3 Installation & Bootstrapping
Clone the repository and install dependencies across all workspaces:

```bash
# 1. Clone repository
git clone https://github.com/your-org/bugbounty.git
cd bugbounty

# 2. Install workspace dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
cd sdk && npm install && cd ..

# 3. Configure backend environment credentials
cp server/.env.example server/.env
# Edit server/.env with your Gemini or OpenAI API key (optional; offline fallbacks are active)

# 4. Start concurrent development servers
npm run dev
```

- **Client Application:** `http://localhost:5173`
- **Gateway Server:** `http://localhost:3001`
- **Health Check Endpoint:** `http://localhost:3001/api/health`

---

## 3. Branching & Commit Conventions

### 3.1 Branch Naming
Create focused feature branches originating from `main`:
- `feature/<short-description>` (e.g., `feature/sound-synthesizer-presets`)
- `bugfix/<issue-id>-<description>` (e.g., `bugfix/streak-boundary-dst`)
- `refactor/<subsystem>` (e.g., `refactor/state-machine-guards`)
- `docs/<topic>` (e.g., `docs/api-spec-update`)

### 3.2 Commit Messages (Conventional Commits)
All commit messages must adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short imperative summary>

[optional detailed body]

[optional issue reference]
```

**Permitted Types:**
- `feat`: A new user-facing feature or gameplay capability
- `fix`: A bug fix in client, server, or SDK
- `docs`: Documentation updates or additions
- `refactor`: Code changes that neither fix a bug nor add a feature
- `test`: Adding or correcting unit and integration tests
- `perf`: Performance optimizations
- `chore`: Maintenance tasks, package upgrades, or CI updates

**Examples:**
- `feat(scoring): add streak retention bonus multiplier`
- `fix(timer): resolve requestAnimationFrame drift across tab switches`
- `docs(architecture): expand C4 sequence diagrams for challenge reviews`

---

## 4. Architectural Guidelines & Code Standards

### 4.1 TypeScript & Erasable Syntax
- **Strict Mode:** TypeScript strict mode is enabled across all workspaces (`"strict": true`).
- **Erasable Syntax:** The client configuration enforces `"erasableSyntaxOnly": true`.
  - Avoid TypeScript runtime `enum` constructs. Use `const` objects with `as const` and indexed union types instead:
    ```typescript
    export const AppErrorCode = {
      GAME_ACTION_INVALID: 'GAME_ACTION_INVALID',
      STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
    } as const;
    export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];
    ```
  - Declare class fields explicitly rather than relying on parameter properties.

### 4.2 JSDoc Documentation Standards
Every exported interface, type alias, class, method, and function must include comprehensive JSDoc comments:
- File-level `@file` and `@description` annotations.
- Function parameter definitions using `@param` with clear descriptions.
- Return value definitions using `@returns`.
- Exception declarations using `@throws`.

```typescript
/**
 * Evaluates whether a hint request can be initiated in the active state.
 *
 * @param ctx The active hint machine context.
 * @param timeRemaining Countdown seconds remaining on the timer.
 * @param gamePhase Current game phase.
 * @returns Approval status and optional explanatory reason.
 */
public static canRequestHint(
  ctx: HintMachineContext,
  timeRemaining: number,
  gamePhase: string
): { allowed: boolean; reason?: string } { ... }
```

### 4.3 Error Handling & Domain Exceptions
- **Domain Errors:** Throw or return typed error subclasses from `@/core/errors/AppErrors` (`GameActionError`, `CodeExecutionError`, `NetworkApiError`, `StorageError`, `HintExhaustedError`, `AudioPlaybackError`).
- **Type Guards:** Use `isAppError(err)` or normalize arbitrary caught values using `toAppError(err, fallbackMessage)`.
- **Fault Containment:** Wrap major component subtrees with `ErrorBoundary` (`@/components/common/ErrorBoundary`) to prevent unhandled rendering crashes from affecting the entire arena.

### 4.4 Architectural Invariants
- **Client Evaluation:** Never execute player code on the backend server. All test assertions and code executions must run inside sandboxed Web Workers (`useCodeRunner.ts`).
- **Zero Mandatory DB:** Do not introduce server database requirements for core gameplay. Persist career progress, hacker callsigns, and solve history via IndexedDB (`client/src/lib/db.ts`).

---

## 5. Testing & Quality Assurance

### 5.1 Running Tests
Unit tests are written using [Vitest](https://vitest.dev/):

```bash
# Run client unit test suite
cd client
npm test
```

### 5.2 Test Requirements
- Any modifications to state machines (`GameActionMachine`, `HintStateMachine`), scoring algorithms (`ScoreCalculator`), or streak logic (`StreakManager`) must include comprehensive unit test coverage.
- New `AppError` subclasses or serialization changes must have corresponding verification tests in `client/src/test/AppErrors.test.ts`.
- Ensure tests verify both successful pathways and edge cases (e.g., clock skew, timer expiration, zero-length inputs, rate-limit responses).

---

## 6. Pull Request & Review Process

1. **Verify Builds & Tests Locally:**
   ```bash
   # Verify client compiles cleanly
   cd client && npm run build
   # Run tests
   npm test
   # Lint workspace
   npm run lint
   ```
2. **Push to Your Fork / Branch:**
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Open Pull Request:**
   - Provide a concise title following Conventional Commits.
   - Describe the motivation, architectural changes, and testing performed.
   - Attach screenshots or recordings for UI modifications.
4. **Code Review:**
   - Maintainers will review your submission against the architectural standards.
   - Address feedback constructively and keep commits organized.
5. **Merge:** Once approved and CI checks pass, maintainers will squash-and-merge into `main`.

Thank you for contributing to BugBounty!
