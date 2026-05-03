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

## 3. F12 — `shift_id` FK gap fallback — DOĞRULAMA ✅ (kod yeterli)

**Bulgu:** `shift_attendance.shift_id` zorunlu FK; kiosk yoluyla swipe gelen ama planlanmış shift'i olmayan kullanıcılarda eskiden NULL/skip riski vardı.

**Mevcut güvenlik:**
- Real-time kiosk yolu (`branchShiftSessions`) `shift_attendance`'a doğrudan yazmıyor; önce `branch_shift_sessions`'a düşüyor.
- `server/routes/pdks.ts` L740-758 backfill endpoint'i `plannedShiftId` yoksa **adhoc shift insert** ediyor (08:00-17:00 morning, status=confirmed) ve sonra `shift_attendance` insert + session'ı bağlıyor.
- Backfill'de `failed` sayacı + `console.error` per-session hata loglaması mevcut.

**Karar:** F12 fiilen kapalı. Yeni kod gereksiz; sadece bu raporda doğrulama notu.

**Kalan risk (düşük):** Eğer `branchShiftSessions.checkInTime` UTC vs TR-yerel arasında sınır ışığında olursa adhoc shift'in `shiftDate`'i bir gün kayabilir. Bu Bundle 1'de F11 ile temelde çözüldü; production'da gözle.

---

## 4. F28 — Atomic stok mutasyonu — DONE ✅ (3 endpoint sarıldı)

**Bulgu:** `server/satinalma-routes.ts`'te 3 farklı endpoint klasik read-modify-write race'ine sahipti:
1. `POST /api/inventory/:id/movements` (L150-214) — manuel stok hareketi
2. `POST /api/goods-receipts` (L700-744) — mal kabul stok artışı
3. `PATCH /api/goods-receipts/:id/status` (L795-842) — kabul onayında stok artışı

**Çözüm:** Tek bir helper:

```ts
applyAtomicInventoryMovement(opts) =>
  db.transaction(async tx => {
    SELECT inventory WHERE id = ? FOR UPDATE;
    compute newStock per movementType;
    INSERT inventoryMovements (...);
    UPDATE inventory SET current_stock = newStock;
  });
```

3 site bu helper'a delege edildi. Helper `InventoryMutationError` (`NOT_FOUND` / `INSUFFICIENT_STOCK`) fırlatıyor; çağıran HTTP 404/400'a çeviriyor. Loop içindekiler `NOT_FOUND` durumunda `console.warn` ile devam ediyor.

**Atomicity garantisi:** PostgreSQL `SELECT ... FOR UPDATE` row-level lock; ikinci paralel işlem birinci tx commit'leninceye kadar bekler, sonra güncel `current_stock`'u okur.

**Pattern referansı:** `server/routes/branch-inventory.ts` L182/266 (zaten kullanılan `.for("update")` pattern'i).

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

- TypeScript: helper + 3 patch'in dokunduğu satırlar tip uyumlu.
- Build: `npm run dev` (workflow) up; helper tx pattern repo'da kanıtlı (`branch-inventory.ts`).
- Live race testi YAPILMADI (yukarı bkz. 5b).
- 1 aylık re-sync YAPILMADI (yukarı bkz. 5a).

---

## 7. Commit prefix uyumu

Pilot freeze 18 Nis-15 Haz, izin verilen prefix: `fix/chore/docs/refactor/test`.
- Bu task'ın commit'i: `fix(inventory)` — race-condition kapatması.
- F10/F11/F12 yorum/dokümantasyon: `docs`.
