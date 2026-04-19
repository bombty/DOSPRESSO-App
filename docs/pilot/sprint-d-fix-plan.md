# Sprint D — Pazartesi 28.04.2026 Sabah Fix Planı

**Bağlam:** B.1 consistency-check `missing_pdks_record=4` → 3/3 pilot kaydı GERÇEK BUG (timezone false positive değil). Kök neden: `server/routes/branches.ts:2910-2922` silent try/catch swallow.

**Hedef:** Pilot 28.04.2026 saat 10:00'a kadar `missing_pdks_record_in_pilot_branches = 0` ve kiosk dual-write atomic.

---

## ⏱ Saatlik Plan

| Saat | Sorumlu | İş | Süre | Çıktı |
|------|---------|----|------|-------|
| 09:00 | Replit (sen) | **STEP 1** — `08-pdks-backfill-3-kayit.sql` çalıştır | 5 dk | 3 satır insert, missing_pdks_record(pilot) = 0 |
| 09:05 | Claude | **STEP 2** — Transaction guard + TR timezone fix | 30 dk | branches.ts (3 yer), factory.ts (2 yer), shifts.ts (2 yer), index.ts (3 yer) |
| 09:35 | Claude | Push to origin | 2 dk | commit hash → Replit |
| 09:40 | Replit | Pull + workflow restart + B.1 re-test | 10 dk | endpoint 200, missing_pdks_record = 1 (yalnız Test Branch 1, yoksay) |
| 09:55 | Replit | **STEP 4** — Kiosk regresyon: 3 test check-in | 5 dk | dual-write atomic doğrulama |
| 10:00 | Aslan | **GO/NO-GO** kararı | — | Pilot başlar |

---

## STEP 1 — Backfill SQL ✅ HAZIR

**Dosya:** `scripts/pilot/08-pdks-backfill-3-kayit.sql`

**Çalıştırma:**
```bash
psql "$DATABASE_URL" -f scripts/pilot/08-pdks-backfill-3-kayit.sql
```

**Doğrulama (dry-run yapıldı 19.04.2026 23:30):**
- ✅ 3 satır insert (Basri Şen 29.03 + 02.04, Büşra Doğmuş 21.03)
- ✅ Pilot şubelerde kalan eksik = 0
- ✅ Idempotent (NOT EXISTS guard)
- ✅ Audit izi: `source = 'kiosk_backfill_d1'`, `device_info = 'pilot_backfill_28042026'`

**Rollback (gerekirse):**
```sql
DELETE FROM pdks_records WHERE source = 'kiosk_backfill_d1';
```

---

## STEP 2 — Kod Fix (Claude)

### Fix 2.A: TR Timezone Helper

`now.toISOString().split('T')[0]` UTC date veriyor. Bu nedenle:
- Basri Şen 29.03 21:13 **UTC** check-in → `recordDate = '2026-03-30'` (TR'de)
- shift_date = '2026-03-29' → JOIN eşleşmiyor → "missing" görünüyor (kısmen doğru)

**Çözüm:** Tek bir helper, tüm kiosk handler'larda kullan.

```typescript
// server/lib/datetime.ts (yeni)
export function trDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date); // → '2026-03-30'
}

export function trTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date); // → '00:13:10'
}
```

### Fix 2.B: Transaction Guard (Silent Failure Kapatma)

**Pattern (her kiosk handler için):**
```typescript
// ESKİ (silent swallow):
try {
  await db.insert(pdksRecords).values({...});
} catch (pdksErr) {
  console.error("PDKS hook error (non-blocking):", pdksErr); // ← YUTUYOR
}
// shift_attendance insert ayrı try'da → atomic değil

// YENİ (atomic):
await db.transaction(async (tx) => {
  await tx.insert(pdksRecords).values({...});
  await tx.insert(shiftAttendance).values({...});
});
// Hata olursa transaction rollback + error caller'a fırlar
```

---

## STEP 3 — Silent Failure Audit (Tamamlandı 19.04.2026)

**Komut:**
```bash
grep -rn "insert.*pdksRecords\|insert(pdksRecords)" server/
```

**Bulgular (8 silent try/catch + 5 doğrudan insert = 13 yer):**

| # | Dosya:Satır | Tip | Silent try/catch? | Pilot Etki | Fix Önceliği |
|---|-------------|-----|-------------------|------------|--------------|
| 1 | branches.ts:2913 | branch kiosk **giris** | 🔴 Evet | **YÜKSEK** (3 bug bu kaynaklı) | P0 |
| 2 | branches.ts:3366 | branch kiosk **cikis** | 🔴 Evet | YÜKSEK (simetrik risk) | P0 |
| 3 | branches.ts:4127 | HQ kiosk giris | 🔴 Evet | YÜKSEK (HQ pilot) | P0 |
| 4 | branches.ts:4252 | HQ kiosk cikis | 🔴 Evet | YÜKSEK | P0 |
| 5 | factory.ts:1126 | factory kiosk giris | 🔴 Evet | YÜKSEK (Fabrika pilot) | P0 |
| 6 | factory.ts:1759 | factory kiosk cikis | 🔴 Evet | YÜKSEK | P0 |
| 7 | shifts.ts:788 | mobile_qr giris | 🔴 Evet | ORTA (kuryeler pilot dışı) | P1 |
| 8 | shifts.ts:901 | mobile_qr cikis | 🔴 Evet | ORTA | P1 |
| 9 | index.ts:665 | auto_checkout 20:30 | ⚠ Dış try | DÜŞÜK (background job) | P2 |
| 10 | index.ts:767 | auto_close branch | ⚠ Dış try | DÜŞÜK | P2 |
| 11 | index.ts:849 | auto_close HQ | ⚠ Dış try | DÜŞÜK | P2 |
| 12 | pdks.ts:46 | manuel/admin endpoint | ✅ Doğrudan (try yok) | YOK (admin manuel) | — |
| 13 | pdks.ts:76 | manuel form endpoint | ✅ Doğrudan (try yok) | YOK | — |

**P0 (6 yer)** — Pazartesi sabah Sprint D fix kapsamında.
**P1 (2 yer)** — Sprint D'ye dahil edilebilir (mobile_qr de PDKS senkron sorununa yatkın).
**P2 (3 yer)** — Pilot sonrası Sprint I (background job'lar ölçek olarak az).

---

## STEP 4 — Regresyon Test

**09:55 — Kiosk Check-in Simülasyonu:**
1. Test kullanıcı (`pilot_test_user`) ile Işıklar (5) kioskta giriş
2. Aynı user ile Fabrika (24) kioskta giriş
3. Aynı user ile HQ (23) kioskta giriş

**10:00 — B.1 Re-test:**
```bash
curl -sS -b /tmp/admin-cookie.txt \
  "http://localhost:5000/api/pdks/consistency-check?days=30" | \
  jq '{
    pilot_branches_missing: (.inconsistencies.missing_pdks_record.samples
      | map(select(.branch_id as $b | [5,8,23,24] | index($b))) | length),
    total_missing: .inconsistencies.missing_pdks_record.count
  }'
```
**Beklenen:**
```json
{ "pilot_branches_missing": 0, "total_missing": 1 }
```
(1 = Test Branch 1 / Admin DOSPRESSO 03.04, yoksayılır)

---

## Risk & Mitigation

| Risk | Olasılık | Etki | Mitigation |
|------|----------|------|------------|
| Backfill SQL hata verir | Düşük | Düşük | Dry-run yapıldı ✅, BEGIN/COMMIT atomic |
| Claude transaction guard bug | Orta | Orta | Replit pull sonrası 5 dk smoke test |
| Yeni timezone helper başka yer kırar | Orta | Orta | Sadece 6 P0 yerde değiştir, helper yeni dosya |
| Pazartesi 09:00 Claude geç kalır | Düşük | Yüksek | Backfill tek başına %75 fixliyor — pilot 09:30 GO mümkün |

---

**Hazırlayan:** Replit Agent + Claude (IT danışman) ortak analizi
**Tarih:** 19.04.2026 23:35 (Europe/Istanbul)
**Pilot başlangıç:** 28.04.2026 saat 08:00 (fix sonrası 10:00 GO)
