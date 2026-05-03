# Bundle 4 — PDKS Sync Trio + Atomic Stok (Task #308)

Owner: Aslan | Tarih: 3 May 2026 | Mode: Build (kod-only) + Plan-mode follow-up önerileri
İlgili audit: `docs/audit/comprehensive-2026-05/findings-raw.md` (F10/F11/F12/F28)

---

## 1. F10 — Pilot tag exclusion (PDKS sync) — DONE ✅

**Durum:** Önceki sprintte uygulanmış, doğrulandı.

`server/services/pdks-daily-summary-sync.ts`:
- L33: `const PILOT_NOTE = "PILOT_PRE_DAY1_TEST_2026_04_29";`
- L94: `WHERE (sa.notes IS NULL OR sa.notes <> ${PILOT_NOTE})`

Pilot test verileri günlük özet hesabından hem dahil hem hariç tarafta filtreleniyor. Ek değişiklik yok.

---

## 2. F11 — Europe/Istanbul TZ tutarlılığı — DONE ✅

**Durum:** Önceki sprintte uygulanmış, doğrulandı.

`server/services/pdks-daily-summary-sync.ts`:
- L36: `const TR_TZ = "Europe/Istanbul";`
- L97/99: `(sa.check_in_time AT TIME ZONE ${TR_TZ})::date = ${workDate}::date`
- L50/55: TR-yerel `Date` dönüşümleri.

Gece-yarısı vardiyaları için TZ cast tüm sorgu yollarında uygulanıyor. Ek değişiklik yok.

---

## 3. F12 — `shift_id` FK gap fallback — IMPROVED ✅

**Bulgu:** `shift_attendance.shift_id` zorunlu FK; kiosk yoluyla swipe gelen ama planlanmış shift'i olmayan kullanıcılarda eskiden NULL/skip riski vardı. Önceden mevcut backfill yolu `plannedShiftId` yoksa doğrudan `08:00-17:00 morning` adhoc shift atıyordu — gerçek vardiya saatleri farklıysa raporlamada sapma.

**Yeni davranış (`server/routes/pdks.ts` backfill loop):**
3 katmanlı fallback ladder:
1. **planned** — `session.plannedShiftId` varsa olduğu gibi.
2. **nearest** — yoksa, aynı `user_id + branch_id` için TR-yerel session tarihi ±3 gün penceresinde en yakın `shifts` satırı (template/gerçek vardiya). Bulunursa `console.log` info ile belirtiliyor.
3. **adhoc** — yine bulunmazsa eski 08-17 morning insert + **`console.warn` ile açık uyarı** (`[BACKFILL][F12] Adhoc shift created…`) → izleme için.

**TR-tarih güvenliği:** UTC kayması engellemek için `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" })` ile session tarihi TR-yerel olarak hesaplanır; nearest aramada `::date - INTERVAL '3 days'` PG cast ile karşılaştırma yapılır. F11 ile aynı TZ stratejisi.

**Real-time path:** Kiosk doğrudan `shift_attendance` yazmaz; önce `branch_shift_sessions` (sırayla bu backfill ile bağlanır). Yani sessiz exclude yok — her session bu üç katmandan birine girer veya `failed` sayacında loglanır.

---

## 3b. PDKS sync sorgu kaydı (önemli not)

`server/services/pdks-daily-summary-sync.ts` L80+ sorgusu `shift_attendance` üzerinden çalışıyor (inner join `shifts`). Yani backfill loop'u bir session'ı `shift_attendance`'a yazdığı sürece sync de görür. F12 fix'i backfill katmanında olduğu için bu zincir sağlam: kiosk session → backfill (3 katmanlı fallback) → shift_attendance → sync görür. Sync'in kendi sorgusunu değiştirmek bu task'ın kapsamı dışında ve gerekli değil — sessiz exclude yolu kapatıldı.

---

## 4. F28 — Atomic stok mutasyonu — DONE ✅ (3 endpoint sarıldı + retry)

**Bulgu:** `server/satinalma-routes.ts`'te 3 farklı endpoint klasik read-modify-write race'ine sahipti:
1. `POST /api/inventory/:id/movements` (L150-214) — manuel stok hareketi
2. `POST /api/goods-receipts` (L700-744) — mal kabul stok artışı
3. `PATCH /api/goods-receipts/:id/status` (L795-842) — kabul onayında stok artışı

**Çözüm:** Tek bir helper:

```ts
applyAtomicInventoryMovement(opts) =>
  retryLoop(MAX=3, on SQLSTATE 40001/40P01) {
    db.transaction(async tx => {
      SELECT inventory WHERE id = ? FOR UPDATE;
      compute newStock per movementType;
      INSERT inventoryMovements (...);
      UPDATE inventory SET current_stock = newStock;
    });
  }
```

3 site bu helper'a delege edildi. Helper `InventoryMutationError` (`NOT_FOUND` / `INSUFFICIENT_STOCK`) fırlatıyor; çağıran HTTP 404/400'a çeviriyor. Loop içindekiler `NOT_FOUND` durumunda `console.warn` ile devam ediyor.

**Atomicity + dayanıklılık:**
- PostgreSQL `SELECT ... FOR UPDATE` row-level lock; ikinci paralel işlem birinci tx commit'leninceye kadar bekler, sonra güncel `current_stock`'u okur.
- Üst katmanda 3 deneme retry: `serialization_failure (40001)` ve `deadlock_detected (40P01)` SQLSTATE'lerinde 25/50/75 ms exponential backoff; domain hataları (yetersiz stok / not found) retry edilmez.

**Manuel endpoint regresyon koruması:** `POST /api/inventory/:id/movement`, `MANUAL_ALLOWED_MOVEMENT_TYPES` whitelist'i ile sadece kullanıcının manuel seçebileceği tipleri kabul eder; `mal_kabul` yalnızca mal kabul akışından gelir.

**Pattern referansı:** `server/routes/branch-inventory.ts` L182/266 (zaten kullanılan `.for("update")` pattern'i).

---

## 4b. Done looks like — formal scope amendment

Brief'in orijinal "Done looks like" listesinden **bu task'ın delivery scope'u** (owner "A modifiye" planı + bu rescope ile):

| Madde | Durum |
|---|---|
| F10 PILOT exclude | ✅ DONE (önceki sprintte, doğrulandı) |
| F11 Europe/Istanbul TZ | ✅ DONE (önceki sprintte, doğrulandı) |
| F12 shift_id FK gap fallback | ✅ DONE (3 katmanlı ladder + warning) |
| F28 atomic stok (3 endpoint) | ✅ DONE (FOR UPDATE + retry) |
| 1 ay PDKS re-sync (DB write) | ❌ OUT OF SCOPE — #320 follow-up (DB write, owner GO + isolated agent + backup) |
| Live concurrent race testi | ❌ OUT OF SCOPE — #321 follow-up (bağımsız Postgres + Playwright/k6) |
| 3 şube smoke validation | ❌ OUT OF SCOPE — pilot canlı kullanım sırasında ayrı plan |
| Diğer 4 dosyadaki stok yazma site'ları | ❌ OUT OF SCOPE — #319 follow-up |

DB write veya canlı pilot smoke gerektiren her iş açıkça follow-up task'a düşürüldü. Bu task'ın kapsamı: kod-only race fix + F12 ladder + investigation report.

---

## 5. Defer Edilenler — Plan-mode follow-up önerileri

### 5a. PDKS bir aylık re-sync / backfill (DB write)
- Owner GO + isolated agent + backup zorunlu (DB write disiplin kuralı).
- `server/services/pdks-daily-summary-sync.ts` `recomputeDailySummary` fonksiyonunu son 30 gün için dön.
- Pre-condition: backup `pdks_daily_summary_pre_bundle4` snapshot.
- Owner için ayrı task açılmalı (#308b veya yeni numara).

### 5b. Live race-condition test (POS + sayım paralel POST)
- 2 paralel `POST /api/inventory/:id/movements` ile race senaryosu — pilotta canlı veri yazar; isolated test DB'sinde sayım yapılmalı.
- Mock yerine gerçek concurrency test için Playwright API hook + bağımsız Postgres instance.
- Plan-mode'da ayrı task.

### 5c. Diğer read-modify-write stok yazma yerleri
Bu task **sadece satinalma-routes.ts** scope'undaydı. Aşağıdaki endpoint'ler de aynı pattern'e sahip ve **henüz race-safe değil**:

| Dosya | Satır | Endpoint/Bağlam | Mevcut Pattern |
|---|---|---|---|
| `server/maliyet-routes.ts` | 1980, 2047 | Üretim maliyet kayıt | read-modify-write |
| `server/daily-tasks-routes.ts` | 474, 682 | Günlük görev / sayım | read-modify-write |
| `server/routes/factory.ts` | 6078, 6089 | Fabrika stok güncelle | read-modify-write |
| `server/routes/inventory-count-routes.ts` | 244, 337 | Sayım uzlaştırma | direkt avgQty set |
| `server/factory-shift-routes.ts` | 749 | Vardiya stok düşüm | `sql GREATEST` ✅ atomic |
| `server/routes/mrp-routes.ts` | 508 | MRP stok düşüm | `sql GREATEST` ✅ atomic |

**Öneri:** `applyAtomicInventoryMovement` helper'ını `server/lib/inventory-mutations.ts`'e taşıyıp diğer 4 dosyada da kullan; ayrı task. Bu task'ta toplu refactor yapılmadı çünkü satinalma scope dışına çıkardı + 3 bağımsız endpoint regresyon yüzeyini yeterince genişletti.

---

## 6. Smoke test özeti (bu task)

- TypeScript: helper + tüm patch'lerin dokunduğu satırlar tip uyumlu (satinalma-routes.ts'de 0 yeni TS hatası; mevcut hata listesi pre-existing dosyalarda).
- Workflow: `npm run dev` restart sonrası app HEALTHY, 42 scheduler init OK, hata yok.
- Helper tx pattern repo'da kanıtlı (`branch-inventory.ts:182/266`).
- Live race testi YAPILMADI (#321 follow-up).
- 1 aylık re-sync YAPILMADI (#320 follow-up).

---

## 7. Commit prefix uyumu

Pilot freeze 18 Nis-15 Haz, izin verilen prefix: `fix/chore/docs/refactor/test`.
- Bu task'ın commit'i: `fix(inventory)` — race-condition kapatması.
- F10/F11/F12 yorum/dokümantasyon: `docs`.
