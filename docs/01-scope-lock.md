# Scope Lock

## Rules

1. **Max 3–5 items per week.** Each item must have a one-line description and an acceptance criterion before work begins.
2. **P0 hotfix exception.** Only production-breaking bugs may be added mid-week. Tag them `P0` and document the reason.
3. **Everything else goes to backlog.** No "quick adds." If it's not in the weekly scope, it waits.

## Weekly Scope Template

| # | Item | Acceptance Criterion | Status |
|---|------|----------------------|--------|
| 1 | _short description_ | _what "done" looks like_ | pending / in-progress / done |
| 2 | | | |
| 3 | | | |
| 4 | _(optional)_ | | |
| 5 | _(optional)_ | | |

## Backlog Rule
- New ideas go to a `BACKLOG.md` file (or project board) with a priority tag (P1 / P2 / P3).
- Backlog is reviewed at the start of each week to pick the next 3–5 items.
- Items sitting in backlog for 4+ weeks without being picked are candidates for removal.

## Anti-Patterns to Avoid
- "While I'm here, let me also fix…" — No. Log it, scope it next week.
- Scope changes after work has started — Only allowed for P0 hotfixes.
- Vague items like "improve performance" — Must specify which module, which metric, what target.
