# 🚀 Pilot Prep 10 May 2026 — Tek Mega PR

## İçerik

Pilot 12 May 10:00 başlamadan önce **6 kritik aksiyon**:

| # | Aksiyon | Süre | Bloker mi? |
|---|---|---|---|
| 1 | Fabrika kiosk PIN aktivasyon (3→13) | 1 dk | 🔴 EVET |
| 2 | HQ user PIN tespit (eren+hqkiosk) | 5 dk | 🟡 KISMEN |
| 3 | 4 lokasyon × 12 May vardiya planları | 1 dk | 🔴 EVET |
| 4 | Mahmut bordro durumu (P-1) | 30 dk | 🟡 KISMEN |
| 5 | KVKK: 28 silinmiş user bordro arşivle | 1 dk | KVKK riski |
| 6 | KVKK: 11 snapshot tablo backup+drop | 2 dk | KVKK riski |

---

## Çalıştırma (Replit Shell)

### Adım 1: Pull + DRY RUN

```bash
cd ~/workspace
git pull origin main

# 4 pilot bloker — sadece raporla, DB değişmez
tsx scripts/pilot-prep-2026-05-10/fix-pilot-blockers.ts --dry-run

# KVKK — sadece raporla
tsx scripts/pilot-prep-2026-05-10/kvkk-cleanup.ts --dry-run
```

**Sonucu inceleyin:**
- Kaç kayıt etkilenir?
- Beklenmedik bir şey var mı?
- Aslan'a göster

### Adım 2: CANLI Çalıştır

```bash
# Önce backup al (KVKK script kendi backup yapacak ama emniyet için)
pg_dump $DATABASE_URL -F c -f docs/audit/backups/pre-pilot-20260510.dump

# 4 pilot bloker
tsx scripts/pilot-prep-2026-05-10/fix-pilot-blockers.ts

# KVKK temizlik
tsx scripts/pilot-prep-2026-05-10/kvkk-cleanup.ts

# Audit + smoke test ile doğrulama
tsx scripts/audit-kiosk-pdks-payroll.ts
tsx scripts/smoke-test-pilot-prep.ts
```

### Adım 3: Manuel Aksiyonlar (Aslan)

#### 3.1 HQ User PIN (eren + hqkiosk)

Script otomatik PIN üretmez (güvenlik). Manuel:

```sql
-- bcrypt hash'i 'PIN1234' için (ya da kendi seçtiğin)
UPDATE users 
SET kiosk_pin = '$2b$10$YOUR_BCRYPT_HASH', 
    pin_set_at = NOW() 
WHERE username IN ('eren', 'hqkiosk');
```

Veya UI'dan: `/personel-yonetimi/{userId}` → "PIN Tanımla"

#### 3.2 Mahmut Bordro (P-1)

```bash
# Eğer PAYROLL_DRY_RUN=true ise — gerçek bordro hesaplanmıyor
# Aslan 5 BRÜT rakamı verince:
echo "PAYROLL_DRY_RUN=false" >> .env

# Restart workflow
# Sonra UI'dan Mahmut için bordro hesapla
```

---

## Doğrulama (Pilot Day-1, 12 May 09:00)

```bash
# Tüm kontroller
tsx scripts/audit-kiosk-pdks-payroll.ts
tsx scripts/smoke-test-pilot-prep.ts
```

**Beklenen sonuç:**
- ✅ 0 FAIL
- ⚠️ Sadece bilgi amaçlı warning'ler
- 🟢 Pilot için hazır

---

## Yasal Belgeler

- `docs/KVKK-VERI-IMHA-2026-05-10.md` — Bu işlem için yasal tutanak
- `docs/audit/backups/snapshot-20260510-archive.dump` — KVKK backup (10 yıl saklanır)
- `audit_logs` tablosu — Her aksiyon için DB kaydı

---

## Geri Alma (Emergency Rollback)

Eğer bir şey ters giderse:

```bash
# Snapshot tabloları geri yükle
pg_restore -d $DATABASE_URL docs/audit/backups/snapshot-20260510-archive.dump

# 28 bordro arşivlemeyi geri al
psql $DATABASE_URL -c "
  UPDATE monthly_payroll 
  SET status = 'active', 
      archived_at = NULL, 
      archived_reason = NULL
  WHERE archived_reason = 'user_deleted_kvkk_compliance_2026_05_10'
"

# Vardiya geri al
psql $DATABASE_URL -c "
  DELETE FROM shifts WHERE shift_date = '2026-05-12'
"
```
