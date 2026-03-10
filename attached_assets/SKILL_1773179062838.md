---
name: dospresso-sprint-planner
description: Guidelines for planning and executing DOSPRESSO sprint tasks. Covers task structure, prompt writing rules, priority ordering, acceptance criteria, and common pitfalls. Use when creating sprint plans or writing task prompts.
---

# DOSPRESSO Sprint Planner

## Sprint Prompt Rules

1. **ALWAYS write prompts in English** — Replit Agent performs significantly better with English instructions
2. **Max 10 tasks per sprint** — beyond this, Agent loses focus and skips tasks
3. **Each task needs these sections:**
   - Problem statement (what's wrong, with evidence)
   - Find commands (grep/bash to locate relevant code)
   - Fix approach (specific, not vague)
   - Verification steps
4. **ALWAYS include "DO NOT BREAK" section** — list all systems that must continue working
5. **ALWAYS include acceptance criteria** as checkboxes

## Task Sizing

| Size | Description | Time | Example |
|------|------------|------|---------|
| S | Single file fix | 15-30 min | Fix ASCII Turkish in one file |
| M | Multi-file change | 1-2 hours | Add new API endpoint + frontend |
| L | New feature | 2-4 hours | Agent skill + routing + UI |
| XL | Architecture change | 4+ hours | Data lock system (tables + middleware + UI) |

Sprint should contain: 2-3 L tasks + 3-4 M tasks + 2-3 S tasks = ~10 tasks total.

## Priority Ordering

1. **CRASH fixes** (app broken) — always first
2. **Security fixes** (auth, injection) — second
3. **Data integrity** (lock, soft-delete) — third
4. **Business logic** (wrong calculation) — fourth
5. **UX improvements** (UI polish) — last

## Sprint Prompt Template

```markdown
## TASK: Sprint [N] — [Theme]

[1-2 sentence overview]

### T001 — [Title] (~[time])

**Problem:** [What's wrong with evidence]

```bash
# Find relevant code
grep -rn "[pattern]" [path] | head -N
```

**Fix:** [Specific approach]

### VERIFICATION
[How to confirm it works]

### DO NOT BREAK:
- [System 1]
- [System 2]

### ACCEPTANCE CRITERIA:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

## Post-Sprint Checklist

After every sprint build:
1. Run quality gate skill checks
2. Run build safety script: `bash scripts/check-build-safety.sh`
3. Bump Service Worker if frontend changed
4. Test login as: admin, barista, supervisor, ceo
5. Check server logs for errors

## Common Pitfalls (from 27 sprints of experience)

1. **Radix UI packages** — NEVER install with `^` caret. Always pin exact version.
2. **Duplicate variable names** — When adding useQuery, alias isLoading (e.g., `isLoading: itemsLoading`)
3. **HQ users have no branchId** — Query must handle branchId=null for HQ roles
4. **Service Worker cache** — Frontend changes invisible if SW not bumped
5. **ASCII Turkish in AI-generated text** — Agent skills generate text too, not just UI strings
6. **Transaction safety** — Shipment/stock/payroll changes MUST use db.transaction()
7. **Big sprints get partially done** — Agent skips tasks when prompt is too long. Split into A/B.
8. **Sidebar changes need cache clear** — Users must clear browser cache after sidebar updates

## Module Reference (for Pre-Sprint Audit)

| Module | Key Files | Tables | Endpoints |
|--------|----------|--------|-----------|
| Auth | auth.ts, local-auth.ts | users, sessions | /api/login, /api/me |
| Branches | branches.ts | branches, branch_inventory | /api/branches/* |
| Tasks | tasks.ts | tasks | /api/tasks/* |
| Checklists | checklists.ts | checklist_templates, assignments, completions | /api/checklists/* |
| HR/IK | ik.tsx, hr.ts | users, leave_requests, shifts | /api/hr/*, /api/shifts/* |
| PDKS | pdks.ts | pdks_records, shift_attendance | /api/pdks/* |
| Payroll | payroll.ts | monthly_payroll, position_salaries | /api/pdks-payroll/* |
| Academy | academy.ts | training_modules, quiz_questions | /api/academy/* |
| Factory | factory.ts (5702 lines!) | 30+ factory_* tables | /api/factory/* |
| CRM | crm.ts | customer_feedback, crm_contacts | /api/feedback/*, /api/crm/* |
| Agent | agent.ts, skills/ | agent_pending_actions, routing_rules | /api/agent/* |
| Admin | admin.ts | all management tables | /api/admin/* |
