# shift_attendance check-out backfill — 2 Mayıs 2026

**Task:** #273 — DECISIONS madde 15
**Script:** `scripts/backfill-shift-attendance-checkout.ts`

## Dry-run çıktısı (2 May 2026)

```
=== shift_attendance check-out backfill ===
Mode: DRY-RUN
Pilot notu 'PILOT_PRE_DAY1_TEST_2026_04_29' olan kayıtlar HARİÇ tutulur.

Aday kayıt sayısı: 0
Backfill gerekmiyor — tüm kayıtlar tutarlı.
```

## Yorum

- `branch_shift_sessions.shift_attendance_id` üzerinden bağlı olup
  `shift_attendance.check_out_time IS NULL` durumda olan **gerçek operasyon**
  kaydı bulunmadı.
- DB sayımları (snapshot):
  - `branch_shift_sessions WHERE check_out_time IS NOT NULL AND shift_attendance_id IS NOT NULL` → 173
  - Bunlardan `shift_attendance.check_out_time IS NULL` olan → 0
  - `shift_attendance WHERE check_out_time IS NULL` toplam → 7 (pilot test +
    bağlı session'ı olmayan eski kayıtlar; backfill kapsamı dışı)
- Pilot test kayıtları (`notes='PILOT_PRE_DAY1_TEST_2026_04_29'`) script
  tarafından otomatik filtreleniyor.

## Sonuç

Endpoint düzeltmesi (`server/routes/branches.ts` 4 yer + `server/routes/factory.ts`
2 yer) artık `db.transaction` içinde atomik çalışır — session UPDATE'i ve
`shift_attendance` UPDATE'i ya birlikte commit olur ya birlikte rollback olur.
HQ ve Factory için (FK olmayan akışlar) shift_attendance lookup'ı
`session.checkInTime ± 5 dk` penceresi + pilot test notu (`PILOT_PRE_DAY1_TEST_2026_04_29`)
filtresi ile daraltıldı; yanlış satır kapatma riski yok.

Geçmiş veride backfill edilecek satır yok. `--commit` çalıştırması GEREKMEDİ.
