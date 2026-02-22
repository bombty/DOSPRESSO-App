# AI Surface Rules

## Core Pattern: Transparent AI
Every AI-powered feature in DOSPRESSO must follow the same visibility and safety patterns, regardless of the specific AI surface.

## AI Surfaces in DOSPRESSO

| Surface | Type | Example |
|---------|------|---------|
| NBA (Next Best Action) | Recommendation | "Complete Gate 2 quiz to advance" |
| Quiz Analysis | Assessment | Difficulty scoring, performance analysis |
| Photo Verification | Vision | Checklist photo AI comparison |
| RAG / Knowledge Base | Search | Semantic search over documents |
| Academy Chat | Conversational | AI learning assistant |
| AI Kanıt Panel | Evidence | Role-specific signals and agent logs |

## Pattern 1: Show the Reasoning
Every AI recommendation or decision must display:
- **What** — The action or result
- **Why** — The rationale (e.g., "Your quiz score dropped below 60%")
- **Data used** — Which inputs drove the decision (e.g., "Based on last 5 quiz attempts")
- **Confidence** — When applicable, show a severity or confidence indicator (high / medium / low)

Example for NBA card:
```
Action: "Gate 2 Quizini Tekrarla"
Reason: "Son 3 quiz denemesinde ortalama %55 — geçiş eşiği %70"
Signal: quiz_low (severity: high)
```

## Pattern 2: Human Approval for Critical Actions
Any AI output that **writes data** or **changes state** requires human confirmation:
- AI suggests a task assignment → supervisor must approve
- AI flags an employee as at-risk → coach reviews before any action
- AI generates content (recipe, training material) → author must publish manually

**Rule:** AI can read and recommend freely. AI cannot write without a human in the loop.

## Pattern 3: Deterministic First
- Use deterministic logic (thresholds, rules, scores) as the primary decision layer.
- AI (LLM calls) is used for enrichment, summarization, and natural language — not for core business logic.
- Example: Employee risk detection uses composite score < 40 threshold (deterministic), then AI generates the intervention text (enrichment).

## Pattern 4: Audit Every AI Run
All AI executions that produce user-facing output must be logged:
- **Table:** `ai_agent_logs`
- **Fields:** `runType`, `triggeredBy`, `targetRoleScope`, `inputSummary`, `outputSummary`, `actionCount`, `executionTimeMs`, `status`
- Coach role can review all logs via the AI Kanıt panel.

## Anti-Patterns
- AI making a decision without showing why → Users lose trust.
- AI writing to the database without human confirmation → Data integrity risk.
- Using LLM calls for yes/no business logic that could be a simple threshold → Unnecessary cost and latency.
- AI features without logging → No way to debug or audit when things go wrong.
