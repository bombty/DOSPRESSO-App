# Claude Sprint B.1 + B.3 + A.2 — Test Raporu

**Test tarihi:** 19.04.2026 22:54 (Europe/Istanbul)
**Test eden:** Replit Agent (Task #114)
**Test edilen commit:** `806793b0a` (Pull sonrası HEAD = `4ccae2580`)
**Pilot tarihi:** 28.04.2026 Pazartesi 08:00 (9 gün kaldı)

---

## 1. Özet Tablo

| # | Adım | Sonuç | Not |
|---|------|-------|-----|
| 1 | `git pull --rebase` (806793b0a çek) | ✅ | Conflict yok, 137c6f6 + 806793b uygulandı |
| 2 | Backend esbuild + workflow restart | ✅ | 5.9 MB bundle, hatasız (244 ms). Workflow 41.6 sn'de hazır, 38 scheduler aktif |
| 3 | A.2 `task_escalation_log` tablo + 2 index | ✅ | `task_level_sent_idx`, `sent_at_idx` oluştu. `[FranchiseEscalation] Tables ready` log'u görüldü |
| 4 | B.3 Monthly Summary catch-up (3 ay) | ✅ | `2026-01`, `2026-02`, `2026-03` × 141 user × 0 hata. `[PDKS-B3] Catch-up complete: 3 months processed` log'u görüldü |
| 5 | B.1 `/api/pdks/consistency-check?days=30` | 🔴 **BUG** | HTTP 500 — `column u.name does not exist` |
| 6 | A.2 Escalation runtime + dedup | ✅ | İlk tick'te 35 satır insert, 0 duplicate `(task_id, level)` çifti — dedup çalışıyor |

**Toplam:** 5 ✅ / 1 🔴 — pilot için **dikkat gerekiyor** (B.1 endpoint 28 Nis öncesi düzeltilmeli)

---

## 2. Kritik Metrikler

### B.1 — `missing_pdks_record` (Pilot #1 öncelik göstergesi)
- **Durum:** ÖLÇÜLEMEDİ ❌ — endpoint 500 döndüğü için JSON üretmedi.
- **Kök neden:** `server/routes/pdks.ts` satır **883** ve **904** SQL'de `u.name AS user_name` kullanılmış. `users` tablosunda `name` sütunu YOK; gerçek sütunlar `first_name` + `last_name`.
- **Fix önerisi (Claude / Sprint D):**
  ```sql
  -- Mevcut (BUG):
  u.name AS user_name
  -- Olmalı:
  COALESCE(u.first_name || ' ' || u.last_name, 'Bilinmiyor') AS user_name
  ```
  İki yerde de aynı düzeltme. `b.name` kısmı doğru çünkü `branches.name` mevcut.
- **Etki:** Pilot 28 Nis öncesi PDKS ⇄ shift_attendance senkronizasyon sağlığı **görünür değil**. Bug fix uygulanır uygulanmaz endpoint testi tekrar edilmeli.

### B.3 — Monthly Attendance Summaries
| period_month | user sayısı |
|--------------|-------------|
| 2026-01 | 141 |
| 2026-02 | 141 |
| 2026-03 | 141 |
| **Toplam** | **423 satır** |

- Catch-up 4.5 saniyede bitti (3 ay).
- 0 hata, generation_time aralığı: 19:53:55 → 19:54:00.
- Tablo şeması: `period_month VARCHAR(7)` formatında ("2026-03"), `period_year` ayrı sütun YOK — Claude şemayı doğru kullanmış.

### A.2 — Task Escalation Log
- **35 unique task × 3 seviye dağılımı:** L3=2, L4=2, L5=31
- **İlk tick zamanı:** 19:54:10 — restart'tan ~15 sn sonra (lazy init + ilk runWindow tetiklendi)
- **Dedup doğrulaması:** `GROUP BY task_id, escalation_level HAVING COUNT(*) > 1` → **0 satır** (dedup mantığı doğru)
- **DB-level UNIQUE constraint:** YOK. Sadece PRIMARY KEY (id) var. Dedup application-level yapılıyor — runtime'da çalışıyor ama operasyonda riskli (race condition durumunda duplicate insert mümkün). **Öneri:** `UNIQUE (task_id, escalation_level)` constraint eklenmesi (Sprint D).

---

## 3. Migration Log Doğrulamaları (workflow log alıntıları)

```
[FranchiseEscalation] Scheduler started (every 6 hours)
[CRMTaskMigration] ✅ Tables ready
[FranchiseEscalation] Tables ready
[PDKS-B3] Monthly attendance summary scheduler started (1st of month 01:00-01:10 Turkey time, startup catch-up: 3 months)
[PDKS-B3] Starting catch-up for last 3 completed months
[PDKS-B3] Monthly summary done: 2026-03 — 141/141 users, 0 errors
[PDKS-B3] Monthly summary done: 2026-02 — 141/141 users, 0 errors
[PDKS-B3] Monthly summary done: 2026-01 — 141/141 users, 0 errors
[PDKS-B3] Catch-up complete: 3 months processed
```

Tüm beklenen migration mesajları sırasıyla göründü.

---

## 4. Aslan için Karar Önerisi

| Konu | Öneri |
|------|-------|
| B.3 Monthly Summary | ✅ Pilot için **GO** — production-ready |
| A.2 Escalation Log + dedup | 🟡 Pilot için **GO**, Sprint D'de DB-level UNIQUE constraint eklensin |
| B.1 Consistency Check endpoint | 🔴 **BLOCKER (küçük)** — 2 satır SQL fix gerekli, Pazartesi 28 Nis sabahı önce çözülmeli (Claude'a 5 dk'lık iş). Aksi takdirde pilot süresince PDKS senkron sağlığı kör nokta. |
| Genel commit `806793b0a` | 🟡 **Conditional GO** — B.1 fix'i bekliyor, B.3 + A.2 üretimde |

---

## 5. Sonraki Adım

1. Aslan onaylar → Claude'a B.1 fix talimatı (`u.name` → `COALESCE(u.first_name || ' ' || u.last_name, 'Bilinmiyor')` × 2 yer).
2. Fix push edildikten sonra Replit Agent yeniden test eder ve `missing_pdks_record.count` değerini ölçer.
3. Bu değer > 0 ise pilot #1 öncelik bug; = 0 ise PDKS ⇄ shift_attendance tutarlı.
