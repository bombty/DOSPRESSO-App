# HOTFIX: Notification Spam Triage — Replit Prompt

**Created:** 18 Apr 2026 Saturday night (Aslan + Claude session)
**Mode:** READ-ONLY analysis → propose fix → (Build mode) apply fix
**Priority:** 🔴 P0 Hotfix (before Monday Sprint B)
**Estimated time:** 2 hours (1h analysis + 1h fix)

---

## Context

Sprint A6 cleaned up 15,748 notification spam on 15 April. After 7 days: **21,482 unread notifications again** (5.5x regression). The deletion worked but the **source was not fixed**.

Weekly production (from Replit audit 18 Apr):
- `escalation_info`: 3,180 — **top producer**
- `franchise_escalation`: 2,421 — **second producer**
- `task_overdue`: 738
- `agent_escalation_info`: 593
- `task_overdue_assigner`: 552
- `maintenance_reminder`: 180
- `agent_suggestion`: 173
- `sla_breach`: 90
- `stale_quote_reminder`: 30
- **Total new last 7d: 7,975** (~1,140/day)

Root cause hypothesis: **Frequency cooldown / aggregation logic missing or bypassed** in Mr. Dobody agent or background schedulers.

Pilot impact: Users opening the app will see 21K unread → "system is broken" perception. Must fix before pilot start.

---

## TASK: Notification Spam Triage

### T001 — Production Source Mapping (~30 min, READ-ONLY)

**Problem:** We know WHAT categories spam (escalation_info + franchise_escalation = 5,601/week). We don't know WHO produces them (which scheduler / endpoint / agent skill).

**Find commands:**

```bash
# Find all notification INSERT locations
grep -rn "insert.*notifications\|INSERT INTO notifications\|createNotification" server/ --include="*.ts" | head -40

# Find escalation_info producers specifically
grep -rn "escalation_info\|'escalation_info'" server/ --include="*.ts" | head -20

# Find franchise_escalation producers
grep -rn "franchise_escalation\|'franchise_escalation'" server/ --include="*.ts" | head -20

# Find cooldown / frequency logic
grep -rn "cooldown\|last_sent\|throttle\|dedupe\|rate_limit" server/lib/ server/services/ server/agent/ --include="*.ts" | head -15
```

**Database query:**

```sql
-- Top 15 notification types of last 7 days with producer hint
SELECT 
  notification_category,
  COUNT(*) as count_7d,
  COUNT(DISTINCT user_id) as unique_recipients,
  COUNT(DISTINCT related_entity_id) as unique_entities,
  MIN(created_at) as first,
  MAX(created_at) as last
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_category
ORDER BY count_7d DESC
LIMIT 15;

-- Is the SAME user getting duplicate notifications?
-- Top 10 (user_id, notification_category) pairs by count
SELECT 
  user_id, 
  notification_category, 
  COUNT(*) as dupes_7d
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND notification_category IN ('escalation_info', 'franchise_escalation')
GROUP BY user_id, notification_category
HAVING COUNT(*) > 5
ORDER BY dupes_7d DESC
LIMIT 10;

-- Scheduler tick pattern: are notifications created in bursts?
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  notification_category,
  COUNT(*)
FROM notifications
WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND notification_category IN ('escalation_info', 'franchise_escalation')
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
LIMIT 30;
```

**Expected output format:**
```
escalation_info producer: server/agent/skills/XXX.ts:LINE (scheduler tick: every Y minutes, condition: Z)
franchise_escalation producer: server/routes/XXX.ts:LINE (triggered by: USER_ACTION or SCHEDULER)
Cooldown logic status: MISSING / PRESENT_BUT_BYPASSED / PRESENT_BUT_BROKEN
```

### T002 — Root Cause Analysis (~30 min, READ-ONLY)

**Once T001 identifies producers, answer:**

1. **Is there a cooldown mechanism at all?** (e.g., "don't send same type to same user within 24h")
2. **If yes: where is it and why is it being bypassed?**
3. **If no: what would the minimum-invasive fix look like?**
4. **Is the same underlying event producing multiple notification rows?** (if yes → aggregation bug, not cooldown)
5. **Are there recursive/cascading triggers?** (e.g., notification_created → agent_tick → another notification_created)

**Output a 5-sentence diagnosis.**

### T003 — Fix Proposal (~30 min, DOC ONLY)

Write `docs/NOTIFICATION-SPAM-FIX-PROPOSAL.md` with:

- Specific file + line changes (minimum-invasive)
- Cooldown / aggregation pattern chosen + why
- Backward data cleanup strategy (safe, idempotent — like Sprint A6)
- Estimated reduction: 7,975/week → ?
- Risk: what could this break?

### T004 — Apply Fix (Build mode only — ~30 min)

**DO ONLY IF ASLAN APPROVES T003.**

1. Implement cooldown / aggregation code
2. Run backward cleanup (soft delete duplicates, keep newest per user+type+entity+day)
3. Build check: `npx vite build && npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/test.js`
4. Commit: `fix(notifications): cooldown + aggregation for escalation_info/franchise_escalation spam`
5. Verify: Run SQL — last hour should show <10 new notifications of these two categories combined

---

## DO NOT BREAK

- ✅ `task_overdue` real overdue notifications (738/week — actual useful signal)
- ✅ `sla_breach` SLA business logic (90/week — critical operational)
- ✅ `agent_suggestion` Mr. Dobody proposals (173/week — user-facing AI suggestions)
- ✅ `maintenance_reminder` equipment maintenance (180/week — operational)
- ✅ Agent routing rules (`agent_routing_rules` table — do not touch logic)
- ✅ Mr. Dobody proposals workflow (`dobody_proposals` — do not touch)
- ✅ Notification delivery preferences (user can still receive legitimate alerts)
- ✅ Historical notifications already delivered (do not delete read or actioned ones)

---

## ACCEPTANCE CRITERIA

- [ ] T001: 10+ notification categories' producer code location identified
- [ ] T001: SQL output showing per-user duplicates + hourly burst pattern
- [ ] T002: 5-sentence root cause diagnosis in report
- [ ] T002: Cooldown logic status clearly answered (MISSING/BYPASSED/BROKEN)
- [ ] T003: `docs/NOTIFICATION-SPAM-FIX-PROPOSAL.md` committed (not the fix itself)
- [ ] T003: Risk section lists what legitimate notifications could be affected
- [ ] T004 (if approved): Fix applied, build clean, backward cleanup run
- [ ] T004 (if approved): SQL verification — escalation_info + franchise_escalation last hour < 5
- [ ] Report to Aslan with: before/after counts, files changed, estimated weekly reduction

---

## Report Format (After Completion)

```
🤖 REPLIT — Notification Spam Triage Report

T001 Production Mapping:
- escalation_info: [file:line] via [mechanism]
- franchise_escalation: [file:line] via [mechanism]
- Cooldown: [status]

T002 Root Cause (5 sentences):
[diagnosis]

T003 Fix Proposal:
- Doc: docs/NOTIFICATION-SPAM-FIX-PROPOSAL.md
- Change summary: [X lines in Y files]
- Backward cleanup: [approach]
- Est. reduction: 7,975 → [N]/week

T004 Fix Applied (if approved):
- Commit: [hash]
- Build: clean
- SQL verify: last hour [X] notifications (was [Y])
- Files changed: [count]
```

---

## Timeline

- **T001 + T002:** Ship within 1 hour as a REPORT — Aslan reviews
- **T003:** Propose doc — Aslan approves/modifies
- **T004:** Only after explicit approval — do not auto-apply

**No commits on origin/main without Aslan approval for T004.** T001-T003 are read-only + doc-only.
