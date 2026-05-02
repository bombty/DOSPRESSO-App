# KIOSK + PDKS TEST RUNBOOK — DOSPRESSO

4 birim (Işıklar, Lara, Fabrika, HQ) için kiosk login → shift-start → shift-end test akışı ve PDKS doğrulama protokolü. Pilot Day-1 öncesi her birim için bu prosedür uygulanır.

Son güncelleme: 2 Mayıs 2026  
Kaynak kararlar: `docs/DECISIONS.md` md. 1-2, 11-13.  
İlgili: `docs/TEST-MATRIX.md` (rol smoke testleri).

---

## Önemli Hatırlatmalar

- **Kiosk insan personel değildir** (`DECISIONS.md` md. 1). Kiosk kullanıcıları İK/bordro/performans listelerinde **görünmemeli** (md. 2).
- **Test kayıtları gerçek operasyon değildir.** `notes` alanı ile `PILOT_PRE_DAY1_TEST_<tarih>` (örn. `PILOT_PRE_DAY1_TEST_2026_04_29`) işaretlenir.
- **Soft-deleted / inactive personel PIN bilse bile login OLAMAMALI** (negatif test — md. 8 ve auth politikası gereği).
- **Hassas veri (PIN değeri) test raporunda asla yazılmaz.** Sadece "PIN ile login OK" / "PIN ile login FAIL (beklenen)" şeklinde durum raporlanır.

---

## Test Kapsamı

| Birim | Şube/Tip | Test Personeli (referans) | Endpoint Tipi |
|---|---|---|---|
| **Işıklar** | branch | basrisen | `/api/branch-kiosk/...` |
| **Lara** | branch | berkanbozdag | `/api/branch-kiosk/...` |
| **Fabrika** | factory | busradogmus | `/api/factory-kiosk/...` |
| **HQ** | headquarters | mahmut | `/api/hq-kiosk/...` |

---

## Pre-Flight Kontrol

Test başlamadan önce şunlar doğrulanır:

```sql
-- 1. Test edilecek kullanıcı aktif ve PIN'i set edilmiş mi?
SELECT username, role, is_active, deleted_at,
       CASE WHEN pin_hash IS NOT NULL THEN 'PIN SET' ELSE 'NO PIN' END AS pin_status
FROM users
WHERE username IN ('basrisen', 'berkanbozdag', 'busradogmus', 'mahmut');

-- 2. Şube/birim setup tamamlanmış mı?
SELECT id, name, type, setup_complete, ownership_type
FROM branches
WHERE name ILIKE ANY (ARRAY['%işıklar%', '%lara%', '%fabrika%', '%hq%', '%headquarters%']);
```

Beklenen:
- 4 kullanıcı `is_active=true`, `deleted_at IS NULL`, `pin_status='PIN SET'`.
- Şube/birim `setup_complete=true`.

---

## Test Akışı (Her Birim İçin)

### Adım 1 — PIN ile Login

```
POST /api/<branch|factory|hq>-kiosk/login
Body: { "branch_id": <id>, "pin": "<6-digit>" }
```

**Beklenen:**
- HTTP 200
- Response: `{ "user_id": ..., "username": "...", "role": "...", "shift_session_id": null }`
- Hatalı PIN: HTTP 401 `{ "error": "Geçersiz PIN" }`

**Negatif test (zorunlu):**
- Soft-deleted/inactive kullanıcı PIN bilse bile login → HTTP 401.
  ```sql
  -- Test öncesi geçici: bir kullanıcıyı pasifleştir (RESTORE et test sonrası!)
  -- Bu test owner GO ile yapılır. DB write protokolü uygulanır.
  ```
- 5+ hatalı PIN denemesi → hesap kilidi (account lockout, `localAuth.ts`).

### Adım 2 — Shift Start

```
POST /api/<branch|factory|hq>-kiosk/shift-start
Body: { "shift_type": "morning|evening|...", "notes": "PILOT_PRE_DAY1_TEST_<tarih>" }
```

**Beklenen:**
- HTTP 201
- Response: `{ "shift_session_id": ..., "started_at": "...", "notes": "PILOT_PRE_DAY1_TEST_..." }`
- DB: `branch_shift_sessions` (veya `factory_shift_sessions` / `hq_shift_sessions`) tablosuna kayıt eklenir.
- Aynı zamanda `shift_attendance` kaydı oluşur (`check_in_time` set).

### Adım 3 — Shift End

```
POST /api/<branch|factory|hq>-kiosk/shift-end
Body: { "shift_session_id": <id> }
```

**Beklenen:**
- HTTP 200
- Response: `{ "ended_at": "...", "duration_minutes": ... }`
- DB: `branch_shift_sessions.ended_at` UPDATE.
- ⚠️ **Bilinen açık (md. 15):** `shift_attendance.check_out_time` UPDATE EKSİK; bordro `pdks_daily_summary` üzerinden okunduğu için maaş etkilenmez. Pilot sonrası düzeltilecek.

### Adım 4 — Logout / Yeni Personel

- Kiosk ekranı PIN giriş ekranına döner.
- Bir sonraki personel başka PIN ile login olur.

---

## PDKS Doğrulama (Test Sonrası SELECT)

Test kayıtlarını gerçek operasyondan ayrıştırmak için:

```sql
-- 1. Bugünün test shift session'ları (sadece pilot test):
SELECT bss.id, u.username, b.name AS branch, bss.shift_type, bss.started_at, bss.ended_at, bss.notes
FROM branch_shift_sessions bss
JOIN users u ON u.id = bss.user_id
JOIN branches b ON b.id = bss.branch_id
WHERE bss.notes LIKE 'PILOT_PRE_DAY1_TEST_%'
  AND bss.started_at::date = CURRENT_DATE
ORDER BY bss.started_at DESC;

-- 2. Factory ve HQ shift session'lar:
SELECT 'factory' AS scope, fss.id, u.username, fss.started_at, fss.ended_at, fss.notes
FROM factory_shift_sessions fss
JOIN users u ON u.id = fss.user_id
WHERE fss.notes LIKE 'PILOT_PRE_DAY1_TEST_%'
  AND fss.started_at::date = CURRENT_DATE
UNION ALL
SELECT 'hq', hss.id, u.username, hss.started_at, hss.ended_at, hss.notes
FROM hq_shift_sessions hss
JOIN users u ON u.id = hss.user_id
WHERE hss.notes LIKE 'PILOT_PRE_DAY1_TEST_%'
  AND hss.started_at::date = CURRENT_DATE;

-- 3. shift_attendance kayıt bütünlüğü:
SELECT sa.user_id, u.username, sa.check_in_time, sa.check_out_time, sa.notes
FROM shift_attendance sa
JOIN users u ON u.id = sa.user_id
WHERE sa.notes LIKE 'PILOT_PRE_DAY1_TEST_%'
  AND sa.check_in_time::date = CURRENT_DATE;
-- ⚠️ Beklenen: check_out_time NULL (md. 15 açık teknik borç).
```

---

## Aylık PDKS Etki Kontrolü

Pilot test kayıtlarının **maaş hesabını etkilememesi** zorunlu (md. 13). Doğrulama:

```sql
-- Aylık PDKS özeti pilot kayıtlardan etkilenmiyor mu?
SELECT user_id, work_date, scheduled_minutes, worked_minutes, late_minutes, source
FROM pdks_daily_summary
WHERE user_id IN (
  SELECT id FROM users WHERE username IN ('basrisen','berkanbozdag','busradogmus','mahmut')
)
AND work_date = CURRENT_DATE;
```

**Beklenen:** Excel kaynaklı `pdks_daily_summary` kayıtları pilot kiosk testinden etkilenmez (Excel import ayrı kanal). Boş dönerse → bugün için aylık özet henüz hesaplanmamış (normal).

---

## Kiosk Personel Listesi Görünmeme Doğrulaması

`DECISIONS.md` md. 2 kuralı:

```sql
-- Kiosk kullanıcıları İK personel listesinde görünmemeli:
SELECT u.id, u.username, u.role
FROM users u
WHERE u.role = 'sube_kiosk'
  AND u.is_active = true;
-- Bu kullanıcılar UI'da İK / Bordro / Performans listelerinde GÖRÜNMEMELİ.
-- API endpoint testleri ile doğrulanır:
--   GET /api/hr/employees → kiosk role'leri içermez
--   GET /api/payroll/list → kiosk role'leri içermez
```

---

## Test Sonrası Cleanup

Pilot test kayıtları **silinmez** (md. 8 hard delete yasak). Sadece raporlamalardan filtrelenir:

```sql
-- Test kayıtlarının sayımı (raporlama dışı tutmak için):
SELECT COUNT(*) FROM branch_shift_sessions WHERE notes LIKE 'PILOT_PRE_DAY1_TEST_%';
SELECT COUNT(*) FROM factory_shift_sessions WHERE notes LIKE 'PILOT_PRE_DAY1_TEST_%';
SELECT COUNT(*) FROM hq_shift_sessions WHERE notes LIKE 'PILOT_PRE_DAY1_TEST_%';
SELECT COUNT(*) FROM shift_attendance WHERE notes LIKE 'PILOT_PRE_DAY1_TEST_%';
```

Tüm raporlama / dashboard sorgularında `notes NOT LIKE 'PILOT_PRE_DAY1_TEST_%'` filtresi uygulanır.

---

## Hatalı Senaryolar (Bilinen)

| Senaryo | HTTP | Aksiyon |
|---|---|---|
| Yanlış PIN | 401 | Yeniden dene; 5+ deneme → hesap kilit |
| Inactive/soft-deleted user PIN doğru | 401 | Beklenen davranış (md. 8 + auth) |
| `branch_id` ile PIN eşleşmez | 401 | Yanlış kiosk URL'si |
| Shift session zaten açık | 409 | Önce `shift-end` |
| Backend route 404 (yanlış endpoint) | 404 JSON | `DECISIONS.md` md. 24 (Vite HTML fallback yok) |

---

> Test sonuçları `docs/SPRINT-LIVE.md` "Tamamlanan İşler" altına özet olarak yazılır. Detaylı log `docs/pilot/audit/<tarih>.json` (PII maskelenmiş).
