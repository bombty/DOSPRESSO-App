# Sprint 2 — Plan Mode Prompt (Replit için)

## TASK-#344: HQ Kiosk Aktivasyon + Şube Audit

### Bağlam
Sprint 2 / 4 — Kiosk Coverage. Mahmut Bey'in görmesi gereken **15 ofis çalışanı**
şu an kiosk takip sisteminde değil. HQ kiosk yazılımı tamamen hazır
(`/hq/kiosk` 29KB sayfa + 7 backend endpoint), sadece aktive edilmemiş.

### Pre-flight
```bash
git fetch origin
git log --oneline origin/main -3
# Sprint 2 branch'i merge edilmiş olmalı
git pull origin main
```

### Plan Mode Görev Tanımı

**Hedef 1:** HQ ofis (branch_id=23) için `branch_kiosk_settings` kaydı oluştur,
`is_kiosk_enabled = true` set et, kiosk parolası belirle.

**Hedef 2:** 4 pilot şube için `branch_kiosk_settings` audit (Işıklar #5,
Lara #8, HQ #23, Fabrika #24) — eksik olanı tamamla.

**Hedef 3:** Smoke test — `/api/hq/kiosk/staff` endpoint çalışıyor mu?

#### 1. Backup
```bash
pg_dump $DATABASE_URL > backup-pre-hq-kiosk-$(date +%Y%m%d-%H%M).dump
```

#### 2. Audit Sorgusu
```sql
-- 4 pilot şube için kiosk settings durumu
SELECT 
  b.id AS branch_id,
  b.name AS branch_name,
  b.is_franchise,
  bks.id AS settings_id,
  bks.kiosk_password IS NOT NULL AS has_password,
  bks.is_kiosk_enabled,
  bks.created_at
FROM branches b
LEFT JOIN branch_kiosk_settings bks ON b.id = bks.branch_id
WHERE b.id IN (5, 8, 23, 24)
ORDER BY b.id;

-- Beklenen sonuç:
-- 5 (Işıklar)   → settings var, has_password=true, enabled=true (ÇALIŞIYOR)
-- 8 (Lara)      → settings var, has_password=true, enabled=true (ÇALIŞIYOR)
-- 23 (HQ)       → settings YOK (boş row) ← SORUN
-- 24 (Fabrika)  → settings var (factory için ayrı sistem)
```

#### 3. HQ #23 için Settings Oluştur (Aslan onayı sonrası)

Aslan'a şu sorular sorulacak:
1. **HQ kiosk parolası ne olsun?** Önerim: `dospresso_hq_2026!` veya benzer
2. **HQ vardiya saatleri:** Varsayılan 09:00 - 18:00 OK mi?
3. **Mola süresi:** 60 dk varsayılan OK mi?

```sql
-- Aslan onayı sonrası execute et
INSERT INTO branch_kiosk_settings (
  branch_id,
  kiosk_password,
  default_shift_start_time,
  default_shift_end_time,
  default_break_minutes,
  max_break_minutes,
  is_kiosk_enabled,
  created_at,
  updated_at
) VALUES (
  23,                                    -- HQ
  'PARÖLA_BURAYA',                       -- Aslan onayladı
  '09:00',
  '18:00',
  60,
  90,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (branch_id) DO UPDATE SET
  is_kiosk_enabled = true,
  updated_at = NOW();
```

#### 4. HQ Personel PIN Audit
```sql
-- HQ personeli (branch_id=23) PIN'i olanlar
SELECT 
  COUNT(*) AS total_hq_users,
  COUNT(pin) AS users_with_pin,
  COUNT(*) - COUNT(pin) AS missing_pin
FROM users 
WHERE branch_id = 23 
  AND deleted_at IS NULL
  AND role NOT IN ('admin', 'kiosk_user');

-- Eksik PIN olanlar (manuel atama gerekecek)
SELECT id, first_name, last_name, role, pin
FROM users 
WHERE branch_id = 23 
  AND deleted_at IS NULL
  AND pin IS NULL
  AND role NOT IN ('admin', 'kiosk_user');
```

#### 5. Smoke Test
```bash
# A) Frontend test
# Tarayıcıda /hq/kiosk aç:
# - Sayfa yükleniyor mu?
# - Kiosk parolası girilebiliyor mu?
# - Personel listesi geliyor mu?

# B) Backend test (kiosk parolası ile)
curl -X POST $REPLIT_URL/api/hq/kiosk/staff \
  -H "Content-Type: application/json" \
  -d '{"kioskPassword": "PARÖLA"}' | jq

# Beklenen: HQ personel listesi (15 kişi civarı)
```

#### 6. Workflow Restart (gerekirse)
Frontend hot-reload yeterli, ama emin olmak için:
```bash
workflow restart
```

### Success Criteria

- [ ] HQ #23 için `branch_kiosk_settings` kaydı var
- [ ] `is_kiosk_enabled = true`
- [ ] Kiosk parolası set edilmiş
- [ ] `/hq/kiosk` sayfasından parola ile giriş çalışıyor
- [ ] HQ personeli (branch_id=23) listede görünüyor
- [ ] Tüm aktif HQ personelinin PIN'i var (eksikse uyarı)
- [ ] Nav-registry'de "Ofis Kiosk" linki muhasebe_ik rolüne görünüyor
- [ ] 4 pilot şubenin tamamı için settings doğrulandı

### Out of Scope

- 17 diğer şube için kiosk aktivasyonu (Phase 2, Haziran)
- Kiosk donanım/tablet konfigürasyonu (Aslan saha)
- Kiosk UI tasarım değişikliği

### Rollback Plan

```sql
-- HQ kiosk'u geri kapat
UPDATE branch_kiosk_settings 
SET is_kiosk_enabled = false 
WHERE branch_id = 23;

-- Tamamen kayıt sil
DELETE FROM branch_kiosk_settings WHERE branch_id = 23;
```

### Beklenen Süre

- Audit + onay: 5 dk
- Settings INSERT + smoke test: 5 dk
- HQ PIN audit: 5 dk
- Toplam: **~15 dakika**

---

**Aslan onayı bekleniyor:**
1. HQ kiosk parolası ne olsun?
2. PIN eksik personel için manuel atama yapacak mı yoksa otomatik 4 haneli random mı?
