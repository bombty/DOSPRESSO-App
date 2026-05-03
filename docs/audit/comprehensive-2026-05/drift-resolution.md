# DB Drift Resolution Matrix — Task #305 Bundle 1A

**Tarih:** 3 May 2026
**Owner:** Aslan
**Sorumlu:** Main Agent (Build mode)
**Drift kaynağı:** `npx tsx scripts/db-drift-check.ts`

## Toplam Drift Envanteri (3 May 2026)

| Tip | Sayı | Bundle 1A scope | Defer (Bundle 1B / follow-up) |
|---|---:|:---:|:---:|
| Eksik tablo | 13 | – | ✓ |
| Eksik kolon (`ai_settings`) | 6 | ✓ | – |
| Kolon tipi/nullability drift | 42 | 41 | 1 (`tasks.target_branch_ids`) |
| Eksik UNIQUE | 4 | 1 (`module_flags`) | 3 (eksik tabloya bağlı) |
| Eksik index | 83 | 60 | 23 (eksik tabloya bağlı) |
| Eksik FK | 47 | 28 | 19 (eksik tabloya bağlı) |
| **TOPLAM** | **195** | **136** | **59** |

---

## Karar Felsefesi

**Schema otoriter.** Drift kapatma yönü: DB → schema'ya uyarla. Tek istisna: schema açık şekilde yanlışsa (kod kullanımıyla çelişiyorsa) → defer + kod refactor.

**Veri güvenliği:** SET NOT NULL eklenecek 22 kolon için NULL satır audit edildi → sadece **1 satır problemli** (`employee_terminations` id=4, processed_by_id NULL).

**Backfill stratejisi:** Tek problemli satır admin user_id ile doldurulur (veri korunur).

---

## Bundle 1A Migration Kategorileri (41 kolon + 6 ekleme + 1 unique + 60 index + 28 FK)

### Kategori 1 — text ↔ varchar (3 kolon, sıfır risk genişletme)
DB varchar → schema text. ALTER TYPE text güvenli (text = varchar superset).
- `employee_terminations.termination_reason` varchar(N) → text
- `equipment.image_url` varchar(N) → text
- `task_comments.user_id` varchar(N) → text

### Kategori 2 — integer → numeric (1 kolon, ondalık genişletme)
- `audit_template_items.weight` integer → numeric(5,2)

### Kategori 3 — date → timestamp (3 kolon, boş tablo, sıfır risk)
`employee_onboarding_assignments` (0 satır):
- `start_date` date → timestamp
- `expected_end_date` date → timestamp
- `actual_end_date` date → timestamp

### Kategori 4 — timestamp ↔ timestamptz (8 kolon, TZ uyumluluğu)
DB timestamptz → schema timestamp (without TZ): `ALTER TYPE timestamp` (TZ bilgisi UTC olarak kaydedilir, `Europe/Istanbul` AT TIME ZONE ile yorumlanır):
- `employee_onboarding_progress.updated_at`
- `employee_terminations.created_at`
- `employee_terminations.updated_at`
- `onboarding_template_steps.updated_at`
- `system_critical_logs.acknowledged_at`
- `system_critical_logs.created_at`
- `task_escalation_log.sent_at`

DB timestamp WITHOUT → schema timestamptz: `ALTER TYPE timestamptz USING (col AT TIME ZONE 'Europe/Istanbul')`:
- `task_comments.created_at`

### Kategori 5 — DROP NOT NULL (6 kolon, gevşetme)
DB NOT NULL → schema NULL allows. Sıfır risk:
- `branch_shift_sessions.gps_fallback_used`
- `employee_onboarding_progress.updated_at` (Kat. 4 sonrası)
- `employee_terminations.termination_reason` (Kat. 1 sonrası)
- `onboarding_template_steps.updated_at` (Kat. 4 sonrası)
- `task_comments.user_id` (Kat. 1 sonrası)
- `tasks.branch_id` ← HQ tasks için kritik (görev branch'siz HQ-only olabilir)

### Kategori 6 — BACKFILL (1 kolon, 1 satır)
- `employee_terminations.processed_by_id` id=4 → admin user_id ile doldur (`adminhq` = `18e0cb39-87aa-4862-8f08-f52df6ee01b1`)

### Kategori 7 — SET NOT NULL (22 kolon, hepsi 0 NULL audit ile doğrulandı)
| Kolon | Satır | NULL |
|---|---:|---:|
| ai_settings.provider | 1 | 0 |
| announcements.category | 18 | 0 |
| customer_feedback.source | 461 | 0 |
| customer_feedback.priority | 461 | 0 |
| customer_feedback.sla_breached | 461 | 0 |
| customer_feedback.feedback_type | 461 | 0 |
| customer_feedback.requires_contact | 461 | 0 |
| employee_onboarding_assignments.branch_id | 0 | 0 |
| employee_onboarding_assignments.start_date | 0 | 0 |
| employee_onboarding_assignments.status | 0 | 0 |
| employee_onboarding_assignments.overall_progress | 0 | 0 |
| employee_onboarding_assignments.manager_notified | 0 | 0 |
| employee_onboarding_progress.status | 0 | 0 |
| employee_terminations.processed_by_id | 1 | 0 (Kat. 6 backfill sonrası) |
| factory_recipe_category_access.updated_at | 10 | 0 |
| hq_support_tickets.priority | 4 | 0 |
| onboarding_template_steps.step_order | 0 | 0 |
| onboarding_templates.target_role | 1 | 0 |
| onboarding_templates.duration_days | 1 | 0 |
| onboarding_templates.is_active | 1 | 0 |
| onboarding_templates.created_by_id | 1 | 0 |
| overtime_requests.overtime_date | 2 | 0 |
| overtime_requests.start_time | 2 | 0 |
| overtime_requests.end_time | 2 | 0 |

### Kategori 8 — ai_settings 6 kolon ekle (otomatik üretildi)
`db-drift-fix.sql` zaten ürettü.

### Kategori 9 — module_flags UNIQUE (otomatik üretildi)
`uq_module_flags_key_scope_branch_role`

### Kategori 10 — 60 Index + 28 FK (otomatik üretildi, mevcut tablolar)
`db-drift-fix.sql` zaten ürettü. DB'de var olan tablolardaki eksik index/FK'lar.

---

## Defer Edilenler (Bundle 1B / Follow-up)

### Tek istisna: `tasks.target_branch_ids` (schema yanlış, kod refactor)
- **Drift:** schema `text("target_branch_ids")`, DB `integer[]`
- **Kanıt:** `SELECT pg_typeof(target_branch_ids) FROM tasks` → `integer[]`
- **Frontend:** `selectedBranches.map(b => b.id)` integer array gönderiyor
- **Kod kullanımı:** `branch-task-scheduler.ts:61` `task.branch_id ? [task.branch_id] : branchIds` int kullanır, `routes/branch-tasks.ts:936` `inArray(usersTable.branchId, targetBranchIds)` int kullanır
- **Karar:** DB doğru. Schema'yı `integer("target_branch_ids").array()` olarak düzelt + migration `crm-task-migration.ts` text→int[] dönüşüm + `task-atama.tsx` test
- **Etki:** Kod refactor (3-5 dosya), drizzle-zod tip değişikliği
- **Follow-up task:** T-330-A (öneri)

### 13 Eksik Tablo (Bundle 1B)
Audit'te Task #255 ile kapatıldığı söylenen ama hala eksik olan tablolar. Hangileri ve neden eksik kaldı sonraki adımda incelenecek. FK zinciri analizi gerekir.
- **Follow-up task:** T-330-B (öneri)

### Bunlara bağlı 3 UNIQUE + 23 index + 19 FK
Eksik tablolar yaratılınca otomatik kapatılır.

---

## Risk Değerlendirmesi

| Adım | Risk | Mitigasyon |
|---|---|---|
| Kat. 1-2 (genişletme) | Sıfır | – |
| Kat. 3 (date→timestamp boş tablo) | Sıfır | Tablo zaten boş |
| Kat. 4 (timestamp/timestamptz) | Düşük | UTC yorumla, Europe/Istanbul cast (1 yerde) |
| Kat. 5 (DROP NOT NULL) | Sıfır | Constraint gevşetme |
| Kat. 6 (1 satır backfill) | Düşük | Veri korunur, admin user_id |
| Kat. 7 (SET NOT NULL) | Düşük | Pre-flight audit 0 NULL doğrulandı |
| Kat. 8-10 (auto-üretildi) | Sıfır | IF NOT EXISTS |

---

## Uygulama Planı

1. **Migration dosyası:** `migrations/task-305-drift-close.sql` üretildi
2. **Dry-run:** `BEGIN; ...; ROLLBACK;` transaction içinde test (veriyi etkilemez)
3. **Owner GO:** Dry-run başarılıysa
4. **Apply:** `BEGIN; ...; COMMIT;` (asıl uygulama)
5. **Verify:** `npx tsx scripts/db-drift-check.ts` re-run
   - **Beklenen sonuç:** 41 kolon drift → 1 (sadece `tasks.target_branch_ids`); 4 unique → 3; 6 kolon → 0; 60 index/28 FK → 0
   - **Toplam:** 195 → 59 (defer edilenler)

---

## Quality Gate Etkisi
- Madde 9 (Endpoint↔Table): drift kapatma sonrası iyileşir
- Madde 21 (Payroll columns): değişmedi
- §17 Debug guide (Drizzle/DB kolon mismatch): bu task tam bu konudaki olgun süreç
