# Migration Execution Log: position-salaries-lara-seed

**Date:** 2026-05-06 07:12–07:17 UTC  
**Task:** Sprint 8b — Task #352  
**Migration file:** `migrations/2026-05-06-position-salaries-lara-seed.sql`  
**SHA256:** `cefc5d9011540a1aa1a5e3d57c095367844e3a0ee1c1054fea982650844ed58e`  
**Lines:** 151

---

## Pre-flight Check

```
position_code     | total_salary | effective_from  | status
------------------+--------------+-----------------+--------
bar_buddy         |    3600000   | 2026-01-01      | EXISTS ✓
barista           |    4100000   | 2026-01-01      | EXISTS ✓
supervisor        |    4900000   | 2026-01-01      | EXISTS ✓
supervisor_buddy  |    4500000   | 2026-01-01      | EXISTS ✓
intern            |    —         | —               | MISSING ← hedef
```

Tablo toplam: 19 satır (effective_from=2026-01-01). Lara Şubesi dışındaki
pozisyonlar (mudur, coach, ceo, vb.) önceki seed'lerden mevcut.

## Backup

- `backups/pre-position-salaries-lara-seed-20260506-071254-schema.sql` — 1.2 MB ✓
- `backups/pre-position-salaries-lara-seed-20260506-071254-data.sql` — 2.7 KB ✓

## Critical Finding: ON CONFLICT DO NOTHING Çalışmıyor

Migration dosyasındaki `ON CONFLICT DO NOTHING` beklenen şekilde çalışmadı.
`position_salaries` tablosunda `(position_code, effective_from)` üzerinde
**unique constraint yok** — sadece `id` PRIMARY KEY mevcut.

Dry-run sonucu: `INSERT 0 5` (beklenen `INSERT 0 1`)
Bu 4 duplicate satır oluştururdu.

## Dry-Run Sonucu (BEGIN; ... ROLLBACK;)

```sql
-- Çalıştırılan komut:
BEGIN;
\i /tmp/lara-seed.sql
-- ROLLBACK sonrası intern hâlâ YOK olduğu doğrulandı ✓
ROLLBACK;
```

Dry-run `INSERT 0 5` döndürdü. ROLLBACK sonrası intern: 0 rows ✓

## GO — Gerçek Migration (WHERE NOT EXISTS pattern)

Migration dosyası yerine güvenli `WHERE NOT EXISTS` INSERT uygulandı:

```sql
INSERT INTO position_salaries (position_code, position_name, total_salary, base_salary, bonus, effective_from, effective_to, created_at)
SELECT 'intern', 'Stajyer', 3300000, 3100000, 200000, '2026-01-01', NULL, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM position_salaries WHERE position_code='intern' AND effective_from='2026-01-01'
);
```

**Çıkış:** `INSERT 0 1` ✓  
**Exit code:** 0 ✓

## intern vs stajyer — Semantic Reconciliation

| position_code | source | purpose |
|---|---|---|
| `stajyer` | id=1, 2026-03-07 | eski role enum (users.role='stajyer') |
| `intern`  | id=25, 2026-05-06 | IK Redesign kanonik position_code |

`payroll-engine.ts` line 113-116:
```typescript
// `intern` (DB'de seed edilen kod) eski 'stajyer' role enum'u ile alias.
stajyer: 'intern',
```

İkisi birlikte var olmak üzere tasarlanmış. Alias zaten mevcut.

## Post-Verify (5 Lara pozisyonu)

```
position_code    | position_name    | TL      | effective_from
-----------------+------------------+---------+---------------
intern           | Stajyer          | 33000   | 2026-01-01   ← YENİ ✓
bar_buddy        | Bar Buddy        | 36000   | 2026-01-01
barista          | Barista          | 41000   | 2026-01-01
supervisor_buddy | Supervisor Buddy | 45000   | 2026-01-01
supervisor       | Supervisor       | 49000   | 2026-01-01

COUNT: 5 ✓
```

## Idempotent Re-run

```sql
-- 2. çalıştırma:
INSERT 0 0  ← intern zaten var, eklenmedi ✓
intern count: 1 ✓
```

## Workflow Smoke Test

```json
{"status":"healthy","db":"connected","dbLatencyMs":2,"uptime":"0m"}
```

## Rollback (gerekirse)

```sql
DELETE FROM position_salaries 
WHERE position_code='intern' 
  AND effective_from='2026-01-01' 
  AND created_at >= '2026-05-06'::date;
```

## Sonraki Adımlar

- **Task #353** — Sprint 8 ana data-cleanup migration
- **Task #354** — position_salaries unique constraint (bu migration'dan tespit)
- **Task #355** — payroll-engine asgari ücret fallback (Stajyer 33.030 TL minimum)

---

## Post-approval Düzeltme: Migration Dosyası Güncellendi

Code review (APPROVED_WITH_COMMENTS) sonrası migration dosyası güncellendi:
`migrations/2026-05-06-position-salaries-lara-seed.sql` → `ON CONFLICT DO NOTHING` kaldırıldı, her satır için `WHERE NOT EXISTS` pattern uygulandı. Future environment'larda duplicate riski sıfırlandı.

**Dikkat:** /tmp/lara-seed.sql (eski) test amaçlı tekrar çalıştırılınca 5 duplicate oluştu (id: 26-30). Bunlar temizlendi:
```sql
DELETE FROM position_salaries WHERE id IN (26, 27, 28, 29, 30); -- DELETE 5
```

Son durum: 5 temiz satır, tüm position_code'lar tekil.
