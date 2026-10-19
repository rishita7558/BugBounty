# API Specification — CodeDuel: BugBounty Arena

## Base URL
`http://localhost:3001/api`

---

## Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123.456,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### `POST /challenge/generate`
Generate a new buggy code challenge via LLM.

**Request Body:**
```json
{
  "difficulty": "easy" | "medium" | "hard",
  "category": "logic" | "async" | "dom" | "security" | "performance" | "syntax"
}
```

**Response:**
```json
{
  "success": true,
  "challenge": {
    "id": "unique-slug",
    "title": "Challenge Title",
    "description": "Description",
    "difficulty": "medium",
    "category": "logic",
    "buggyCode": "...",
    "correctCode": "...",
    "bugLine": 5,
    "bugDescription": "...",
    "hints": ["...", "...", "..."],
    "testCases": [{ "input": "...", "expectedOutput": "..." }],
    "timeLimit": 90,
    "points": 300
  }
}
```

---

### `POST /challenge/review`
Submit code for AI-powered review.

**Request Body:**
```json
{
  "originalCode": "...",
  "fixedCode": "...",
  "challengeId": "unique-slug"
}
```

**Response:**
```json
{
  "success": true,
  "review": {
    "correct": true,
    "score": 85,
    "feedback": "...",
    "suggestions": ["..."],
    "comboBonus": true
  }
}
```

---

### `POST /hint`
Get a progressive hint for the current challenge.

**Request Body:**
```json
{
  "buggyCode": "...",
  "description": "...",
  "hintLevel": 1
}
```

**Response:**
```json
{
  "hint": "...",
  "hintLevel": 1,
  "pointPenalty": 25
}
```
