# REPLIT PROMPT — attached_assets/ Cleanup Analysis Request

**Created:** 18 Apr 2026 Saturday night (Aslan + Claude session, Madde 37 ders)
**Mode:** READ-ONLY analysis → categorize → propose → (Build mode only with Aslan approval) delete
**Priority:** 🟡 P1 (repo hygiene, not pilot blocker)
**Estimated time:** 30-45 min analysis + proposal doc

---

## Context

The `attached_assets/` folder contains **1,760 files totaling 1.1 GB**. Static analysis (Claude) found:
- Only **17 files are actively imported** via `@assets` Vite alias in frontend
- Remaining **~1,743 files** appear to be Replit Agent interaction artifacts (paste dumps, screenshots)
- Tonight Claude tried to clean this up disciplinelessly (committed git rm --cached, then reverted per Aslan's Madde 37 correction)

**Aslan's concern:** "Is 1.1 GB really needed before system is even in production?"

**Answer so far:** No — most of it is not runtime data, it's Replit Agent's attached file history. But we need proper cleanup with 3-way approval (Madde 38).

**Your task:** Analyze, categorize, propose cleanup — **DO NOT DELETE** unless Aslan approves.

---

## File Composition (static scan)

```
1092 PNG files
 560 TXT files (mostly "Pasted-*.txt" — Replit paste content)
  54 JPG/JPEG files
  14 PDF files
   4 DOCX files
  13 MD files
   1 HTML file
```

**Active @assets imports (verified, 17 files):**
```
client/src/App.tsx, login.tsx, register.tsx, reset-password.tsx, forgot-password.tsx, 
merkez-dashboard.tsx, raporlar.tsx, sube/dashboard.tsx, sube/employee-dashboard.tsx,
fabrika/dashboard.tsx, misafir-geri-bildirim.tsx, academy-landing.tsx, academy-certificates.tsx,
app-header.tsx, certificate-renderer.tsx, yonetim/servis-talepleri.tsx

Imported paths:
  IMG_6637_1765138781125.png (main logo, 10+ pages)
  IMG_5044_1765665383658.jpeg (navy logo)
  IMG_7142_1773875710595.png (certificate logo)
  image_1764796739092.png (certification seal)
  old_board2_1767131525410.png (guest feedback)
  academy/*.png (8 files: barista_temelleri, hijyen_guvenlik, receteler, musteri_iliskileri, 
                 ekipman, yonetim, onboarding, genel_gelisim)
  stock_images/*.jpg (4 coffee machine photos for servis-talepleri)
```

---

## TASK REQUEST

### T001 — Full Categorization (~20 min, READ-ONLY)

Please scan `attached_assets/` and produce a categorization report. Categories:

**CATEGORY A: Definitely Keep (active runtime dependencies)**
- The 17 files listed above
- Any file imported via `@assets` that I missed
- Any file referenced by server-side code (server/routes/*.ts, server/*.ts)
- Any file referenced by database records (e.g., notification.icon_url, user.avatar_url)

**CATEGORY B: Operational documents (probably keep)**
- PDF: Check-List kopyaları (ops documentation)
- DOCX: Rapor dokümanları (audit reports from team)
- MD: Prompt references for Replit (CRM-Sprint-*, FAB-0A-prompt)
- HTML: subat2026_v2_guncel_kural.html (what is this?)

**CATEGORY C: Likely removable (Replit paste artifacts)**
- TXT files named "Pasted-*.txt" (560 files)
- PNG/JPG named "IMG_0XXX_*.png" (screenshots from iPhone/Mac)
- Any file that doesn't fit A or B

**CATEGORY D: Uncertain (needs human judgment)**
- Files that might be referenced in docs/ markdown (not code)
- Historical reports that team might want to preserve
- Anything you're not sure about

### T002 — Size Analysis

Produce a table:
```
Category | File count | Total size | % of 1.1 GB
A        | ~17        | ~13 MB     | ~1%
B        | ~31        | ? MB       | ?%
C        | ~1600+     | ? MB       | ?%
D        | ?          | ? MB       | ?%
```

### T003 — Safety Check

For each file you'd mark as Category C (removable), please verify:
1. `grep -rn "FILENAME" client/ server/ docs/` returns **no matches**
2. `grep -rn "FILENAME" shared/` returns **no matches**
3. Not referenced in any `<img src=>` HTML attribute
4. Not in `server/data/*.json` config files
5. Not a schema.ts reference

If ANY match → move to Category D (uncertain).

### T004 — Cleanup Proposal Document

Write `docs/ATTACHED-ASSETS-CLEANUP-PROPOSAL.md` with:

- Summary: How many files in each category, total removable size
- List of Category A files (to keep)
- List of Category B files (to keep as documentation)
- Sample of Category C files (first 20 per type) for sanity check
- Concerning Category D files that need Aslan decision
- Recommended cleanup approach (one of):
  - **Option 1:** Remove all Category C via `git rm` + commit
  - **Option 2:** Selective — remove TXT paste files only (safest), keep PNGs for now
  - **Option 3:** Move Category C to external storage (Object Storage), keep git repo clean
  - **Option 4:** Do nothing — 1.1 GB is acceptable overhead
- Risk analysis for each option
- Your recommendation with reasoning

### T005 — DO NOT DO

🔴 **DO NOT DELETE ANYTHING IN THIS TASK.** This is analysis-only.

🔴 **DO NOT commit file removals** without explicit Aslan approval.

🔴 **DO NOT modify .gitignore** — that's the last commit's job.

🔴 **DO NOT move files on disk** — only categorize in the doc.

🔴 **DO NOT delete Category A or B** even if Aslan later approves — we three (Claude + Replit + Aslan) must all agree.

---

## DO NOT BREAK

- ✅ All 17 `@assets` imports must continue to work after any future cleanup
- ✅ Any file that server-side code depends on (config, static assets, etc.)
- ✅ Any file referenced in database records (user uploads, audit log attachments)
- ✅ docs/ folder and .agents/skills/ folder — these are NOT in attached_assets
- ✅ server/data/ files except the `*recalc*.json` debug files already ignored

---

## ACCEPTANCE CRITERIA

- [ ] T001: Every file in `attached_assets/` categorized (A/B/C/D)
- [ ] T002: Size analysis table complete
- [ ] T003: Every Category C file passes 5-point safety check
- [ ] T004: `docs/ATTACHED-ASSETS-CLEANUP-PROPOSAL.md` committed
- [ ] T005: Nothing deleted, nothing committed except the proposal doc
- [ ] Report includes your **recommendation** (Option 1/2/3/4) with reasoning

---

## Report Format (After Completion)

```
🤖 REPLIT — Attached Assets Cleanup Analysis

Category Summary:
A (Keep - active): N files, X MB
B (Keep - docs): N files, X MB  
C (Removable): N files, X MB ← THIS IS THE CANDIDATE FOR CLEANUP
D (Uncertain): N files, X MB ← NEEDS ASLAN DECISION

Proposal doc: docs/ATTACHED-ASSETS-CLEANUP-PROPOSAL.md (commit hash)

My Recommendation: Option [1/2/3/4]
Reasoning: [2-3 sentences]

Concerning items (Category D):
- [list items that aren't clearly keepable or removable]

Aslan decision needed for:
- Option selection (1-4)
- Category D items individually
```

---

## Next Steps

1. You complete T001-T004 (~30-45 min, READ-ONLY)
2. Report back to Aslan
3. Claude + Aslan + you discuss the proposal Monday morning
4. If approved, you execute cleanup in Build mode (separate task)
5. If not approved or uncertain → we leave it as-is (Option 4)

**This is a 3-way approval process per Madde 38 (newly drafted):**
> "Mass repo changes (git rm, bulk delete, file reorganization) require 3-way approval: Claude analyzes, Replit verifies runtime impact, Aslan makes business call."

**Timeline:** No rush. Do the analysis carefully. Pilot is April 28, this doesn't block that.

---

*Prepared by Claude, 18 Apr 2026 Saturday night — after Madde 37 violation + Aslan correction.*
*This is the right way: analyze first, ask approval, then act.*
