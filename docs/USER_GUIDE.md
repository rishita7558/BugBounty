# User Guide — CodeDuel: BugBounty Arena

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- A Gemini or OpenAI API key

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd codeduel-bugbounty

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your API key
```

### Running
```bash
# Start both client and server concurrently
npm run dev

# Or run individually
npm run client   # Frontend on http://localhost:5173
npm run server   # Backend on http://localhost:3001
```

## How to Play

1. **Select Difficulty** — Choose Easy, Medium, or Hard
2. **Start Challenge** — Click "Start Challenge" to get a bug to fix
3. **Read the Description** — Understand what the code should do
4. **Find the Bug** — Examine the code in the Monaco editor
5. **Fix the Bug** — Edit the code to fix the issue
6. **Run Code** — Test your fix with the Run button
7. **Submit** — Click "Submit Fix" to have the AI review your solution

## Scoring
- **Base Points:** Determined by difficulty (100-600)
- **Combo Multiplier:** Consecutive correct fixes increase your multiplier
- **Hint Penalty:** Using hints deducts points
- **Time Bonus:** Faster fixes score higher
