# REPLIT PROMPT — Lessons Extraction from attached_assets/

**Created:** 18 Apr 2026 Saturday night (Aslan's insight: "silmeden önce ders çıkar")
**Mode:** READ-ONLY analysis + skill updates (no file deletion)
**Priority:** 🟡 P1 — must complete BEFORE any Cat C deletion
**Estimated time:** 3-4 hours (large task — split across multiple sessions if needed)

---

## Context — Madde 39 Doğdu

Tonight Aslan asked: **"Silinecek olanlardan ders çıkardıklarımızı md skill dosyalarına yazıyor musun silmeden önce?"**

Answer was NO. This created **Madde 39 (Archive Before Delete):**

> "Silinecek her büyük dosya grubundan ders çıkarılmadan silme yapılamaz. Pattern'ler + kararlar + öğrenilmişler skill dosyalarına aktarılır. Silme, öğrenme SONRASI yapılır."

**attached_assets/** folder contains **~6 months of DOSPRESSO development history**:
- 560 `Pasted-*.txt` files — Aslan's prompts, decisions, strategies, code discussions
- ~1,080 `IMG_*.png/jpeg` — screenshots of bugs, UI issues, feature discussions
- 14 PDF docs, 4 DOCX, 13 MD files

Before we delete Cat C (~1,693 files), we must **mine the lessons** first.

---

## TASK: Lessons Extraction Protocol

### T001 — Categorization by Theme (~30 min)

Group all `Pasted-*.txt` and `IMG_*.*` files by **topic/sprint/module**:

**Expected categories (from filename patterns):**
- **Sprint lessons:** Pasted-*Sprint-A/B/C/D*, *Sprint-1-2-3*
- **Module lessons:** Pasted-*B-LD-R-M* (bildirim), *Academy-V3*, *CRM*, *PDKS*
- **Role lessons:** Pasted-*ADMIN-HQ*, *CEO-i-in*, *Agent-Sistemi*
- **Architecture lessons:** Pasted-*AI-CONTROL-TOWER*, *Mimarisi*, *Yapay-Zek*
- **Process lessons:** Pasted-*Prod-smoke-test*, *Quality-Gate*, *Audit*
- **Bug/fix lessons:** Pasted-*FIX*, *BUG*, *Error*, *Debug*
- **Migration lessons:** Pasted-*Migration*, *V2*, *V3*

For each category, list:
- File count
- Total size
- Date range (from filename timestamps)
- Sample 3 filenames

Output: `docs/ATTACHED-ASSETS-CATEGORIZATION.md`

### T002 — Pattern Extraction (~2 hours)

For each category, **read the top 5 files** (by size or chronological importance) and extract:

**For each relevant pattern:**
1. **Problem/Question** — what was Aslan asking?
2. **Discussion** — what options were considered?
3. **Decision** — what was chosen + why?
4. **Lesson** — what would we do differently next time?
5. **Applicable skill** — which skill file should this go into?

**Example output format:**
```
### Pattern: Prod Smoke Test 3-Minute Rule
Source: Pasted--2-Prod-smoke-test-3-dakika-Ama-al-yor-mu-RBAC-do-ru-mu_1771969214733.txt
Date: ~Feb 2025

Problem: After every prod deploy, how to verify system health in 3 min?
Decision: 3-step smoke: UI (30-60s) + RBAC (1min) + API fallback (1min)
Lesson: Define smoke test as **pre-deploy checklist**, not post-deploy firefighting
Skill: .agents/skills/dospresso-quality-gate/SKILL.md — add "Prod Smoke Test" section
```

### T003 — Skill Updates (~45 min)

Based on T002 patterns, **update existing skill files** with lessons:

- `.agents/skills/dospresso-architecture/SKILL.md` — architectural patterns
- `.agents/skills/dospresso-debug-guide/SKILL.md` — new bug patterns (§20, §21, ...)
- `.agents/skills/dospresso-quality-gate/SKILL.md` — new rules (Madde 39, Madde 40+)
- `.agents/skills/dospresso-sprint-planner/SKILL.md` — sprint patterns
- `.agents/skills/session-protocol/SKILL.md` — process rules

**Rules for skill updates:**
1. Don't duplicate existing content
2. Add with clear source reference (filename + date)
3. Keep each addition < 100 lines
4. Group related lessons together
5. Tag with sprint/module for future searchability

### T004 — Archive Summary Document (~30 min)

Write `docs/ATTACHED-ASSETS-LESSONS-ARCHIVE.md` containing:

- **Executive summary** — what was learned from 1693 files in 3 bullet points
- **Top 20 lessons** — highest-impact insights (with skill references)
- **Decision timeline** — key decisions chronologically (Feb 2025 → Apr 2026)
- **Category breakdown** — counts + dates + topics
- **What we're preserving** — which files/dirs will survive cleanup
- **What we're learning to delete** — what we're removing + what we kept from it

This document replaces the raw attached_assets/ files. Future developers read this instead of sifting through 560 paste dumps.

### T005 — Safe Deletion Preparation (DO NOT DELETE YET)

After T001-T004 are done:
- All patterns captured in skills ✅
- Archive summary written ✅
- Cat D files individually reviewed ✅
- Madde 39 protocol satisfied ✅

**Then** and **only then** is the codebase ready for Cat C deletion (still needs 3-way approval per Madde 38).

---

## DO NOT

🔴 **DO NOT delete any files** during T001-T005
🔴 **DO NOT commit file deletions** — only new skill updates + docs
🔴 **DO NOT rush through T002** — missing a pattern = losing a lesson forever
🔴 **DO NOT duplicate skill content** — check existing sections first
🔴 **DO NOT extract lessons from non-English/non-Turkish content** — skip if unclear

---

## Priority Extraction — Must Cover These Topics

Based on filename scan, these are the **highest-value lesson sources**:

1. **Quality Gate / Audit patterns** (~50+ files)
   - Sprint audit templates, CI/CD quality patterns
   - → Feed into `dospresso-quality-gate/SKILL.md`

2. **Bildirim (Notification) V2 / V3 evolution** (~30+ files)
   - Why 2 versions? What went wrong in V1?
   - → Feed into `dospresso-architecture/SKILL.md` + debug-guide

3. **Academy V2 vs V3 migration** (~20+ files)
   - Migration strategy patterns
   - → Feed into session-protocol (migration checklist)

4. **Agent system hierarchy decisions** (~15+ files)
   - Mr. Dobody, AI Control Tower mimarisi
   - → Feed into architecture/SKILL.md

5. **CEO / HQ / CGO role design** (~25+ files)
   - Role design principles, dashboard widget decisions
   - → Feed into architecture (role patterns)

6. **PDKS / Vardiya edge cases** (~30+ files)
   - Shift handover, weekend rules, catch-up logic
   - → Feed into debug-guide (PDKS patterns)

7. **Production smoke test / deploy patterns** (~10+ files)
   - 3-minute smoke, rollback rules, pre-deploy checks
   - → Feed into quality-gate (deploy ritual)

---

## ACCEPTANCE CRITERIA

- [ ] T001: `ATTACHED-ASSETS-CATEGORIZATION.md` committed
- [ ] T002: 50+ patterns extracted with source references
- [ ] T003: 5 skill files updated with clear attribution
- [ ] T004: `ATTACHED-ASSETS-LESSONS-ARCHIVE.md` committed (executive summary + top 20 lessons)
- [ ] T005: Zero file deletions, only additions (skills + docs)
- [ ] Report: "N patterns extracted, M skill files updated, X MB of lessons preserved"

---

## Timeline — 3 Sessions Spread Out

This is too large for one session. Suggested split:

**Session 1 (Pazartesi ~2 saat):** T001 + T002 sprint/quality-gate categories (highest value)
**Session 2 (Salı ~2 saat):** T002 module categories (notification, academy, CRM, PDKS)
**Session 3 (Çarşamba ~2 saat):** T002 architecture/role + T003 skill updates + T004 archive

**After pilot (28 Nis+):** Final cleanup — safe because all lessons are captured.

---

## Why This Matters

Aslan's insight: **Deletion without extraction = institutional memory loss.**

DOSPRESSO is unique because:
- 6 months of deep thinking is captured in those paste dumps
- Every Pasted-*.txt is a mini RFC or decision document
- Every IMG_*.png is a bug or feature decision visual
- Losing them = "rediscovering" the same problems 6 months from now

By capturing lessons BEFORE deletion:
- Skills get richer (more battle-tested patterns)
- Future Claude/Replit/Aslan avoid repeating mistakes
- DOSPRESSO's "culture" persists beyond files

This is what Madde 39 protects.

---

*Prepared by Claude, 18 Apr 2026 Saturday night — after Aslan's "silmeden önce ders çıkar" insight.*
*Madde 39 protocol: first extraction, then deletion.*
