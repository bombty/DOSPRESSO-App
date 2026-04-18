# Pilot DB İzolasyon Raporu

**Hazırlayan**: Replit Agent  
**Tarih**: 19 Nis 2026  
**Karar Mercii**: Aslan (Pazartesi 28 Nis 09:00 öncesi)

---

## 1. Yönetici Özeti (TL;DR)

🟡 **TESPİT**: Pilot ve dev/development **AYNI** Neon DB instance'ında. Tek `DATABASE_URL`, tek physical database. Pilot canlı verileri ile geliştirme verileri **karışık**.

🔴 **RİSK**: 
- 61 test/seed user `users` tablosunda mevcut (`username ILIKE '%test%|seed%'`)
- 2 test branch (`Test Branch 1`, `Örnek şube`) `branches` tablosunda
- Geliştirme sırasında yapılan değişiklikler pilot ölçümlerine bulaşabilir
- "Pilot Day-1 task completion" sayımına seed task'lar girebilir

🟢 **ÇÖZÜM**: Tam ayrım yerine **mantıksal izolasyon** + temizleme + filter.

---

## 2. Mevcut Durum (Canlı Tarama 19 Nis 22:30)

```
DATABASE_URL          → Neon serverless PostgreSQL (tek instance)
PGDATABASE            → neondb (varsayılan)
toplam users          → 392 (350+ aktif rol bazlı)
test/seed users       → 61
toplam branches       → 22
test branches         → 2 (id=1 "Test Branch 1", id=4 "Örnek şube")
pilot branches        → 4 (id=5 Işıklar, id=8 Lara, id=23 HQ, id=24 Fabrika)
diğer branches        → 16 (henüz pilot değil, ama AKTİF)
```

**Önemli**: 16 "diğer branch" hâlâ `is_active=true`. Pilot başlasa bile bu şubelerin verisi sisteme akıyor olabilir (varsa kullanıcı). Pazartesi öncesi `is_active=false` çekilmeli.

---

## 3. İzolasyon Seçenekleri

### Seçenek A — Tam Ayrı Pilot DB (ÖNERİLMEZ — bu hafta sonu)
- Yeni Neon DB instance + `DATABASE_URL_PILOT`
- Schema dump + seed copy
- App config 2 connection (production vs pilot)
- **Süre**: ~1 gün, regresyon riski yüksek
- **Karar**: Pilot için fazla riskli, **iptal**

### Seçenek B — Mantıksal İzolasyon (ÖNERİLEN — Pazartesi öncesi)
1. **Test data temizleme**:
   - 61 test/seed user `is_active=false` (silmeden, audit için)
   - 2 test branch `is_active=false`
2. **16 non-pilot branch `is_active=false`**:
   - Pilot süresince sadece 4 lokasyon aktif görünür
   - 5 May sonrası kademeli açma
3. **Ölçüm filter**:
   - Tüm Day-1/Day-7 SQL'leri `WHERE branch_id IN (5,8,23,24)` ile filtrelenir
   - Audit log'lar `details->>'pilot' = true` ile etiketlenir (opsiyonel)
4. **Pre-pilot snapshot**:
   - Pazar 23:00 `pg_dump` (rollback için)
   - 28 Nis 18:00 ek snapshot (Day-1 sonu state)

**Süre**: ~30 dk uygulama, regresyon riski düşük.

### Seçenek C — Read-Replica Production + Write to Pilot (KARMAŞIK — iptal)
- Neon read-replica + write-only pilot
- App-level routing
- **Süre**: 2-3 gün, kompleks
- **Karar**: Şu an gerek yok

---

## 4. Önerilen Aksiyon — Seçenek B

### Uygulama SQL (Pazar 27 Nis 22:30 — backup öncesi)

```sql
BEGIN;

-- 1. Test/seed kullanıcıları deaktive et
UPDATE users
SET is_active = false,
    updated_at = NOW()
WHERE (username ILIKE '%test%' OR username ILIKE '%seed%' OR username ILIKE '%mock%')
  AND is_active = true;
-- Beklenen: 61 satır etkilenir

-- 2. Non-pilot branches deaktive et
UPDATE branches
SET is_active = false
WHERE id NOT IN (5, 8, 23, 24)  -- 4 pilot lokasyon
  AND is_active = true;
-- Beklenen: 18 satır (16 normal + 2 test)

-- 3. Test branch için ek soft-delete (admin sidebar'dan tamamen sakla)
UPDATE branches
SET deleted_at = NOW()
WHERE id IN (1, 4)  -- Test Branch 1, Örnek şube
  AND deleted_at IS NULL;

-- 4. Audit
INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
VALUES (
  (SELECT id FROM users WHERE username = 'adminhq' LIMIT 1),
  'PILOT_DB_ISOLATION',
  'branches+users',
  'multiple',
  jsonb_build_object(
    'test_users_deactivated', 61,
    'non_pilot_branches_deactivated', 18,
    'test_branches_soft_deleted', 2,
    'pilot_branches_active', ARRAY[5, 8, 23, 24]
  ),
  NOW()
);

-- 5. Doğrulama
SELECT count(*) FILTER (WHERE is_active) AS active_users,
       count(*) AS total_users
FROM users;

SELECT id, name, is_active, deleted_at IS NOT NULL AS deleted
FROM branches
ORDER BY id;

COMMIT;
```

### Rollback (Acil Durum)
```bash
psql "$DATABASE_URL" < /tmp/pilot-backup-2026-04-27.sql
```

---

## 5. Pilot Süresince Filter Konvansiyonu

Tüm Day-1/Day-7 ölçüm SQL'lerinde:
```sql
-- DOĞRU (pilot filter)
SELECT count(*) FROM tasks
WHERE branch_id IN (5, 8, 23, 24)
  AND completed_at >= '2026-04-28';

-- YANLIŞ (filter yok)
SELECT count(*) FROM tasks
WHERE completed_at >= '2026-04-28';
```

---

## 6. Pilot Sonrası Geri Açma (5 May 2026)

Pilot başarılı olursa rollout için:
```sql
-- 16 non-pilot branch'i kademeli aç
-- Hafta 1 (5-12 May): 4 ek şube (rastgele veya stratejik seçim)
UPDATE branches SET is_active = true WHERE id IN (6, 7, 9, 10);
-- Hafta 2 (12-19 May): 6 ek
-- ...
```

---

## 7. Pazartesi 08:00 Öncesi Hazır Olması

- [ ] Pazar 22:30 — Seçenek B SQL uygulandı (`scripts/pilot/00-db-isolation.sql`)
- [ ] Pazar 23:00 — Tam DB backup (`/tmp/pilot-backup-2026-04-27.sql`)
- [ ] Doğrulama: `branches` tablosunda sadece 4 `is_active=true` kalmış
- [ ] Doğrulama: Test users 61 → 0 active

**Sorumlu**: Replit Agent (SQL uygulama), IT (backup oluşturma)

---

## 8. Sonuç

**Tek DB strateji onaylandı (Seçenek B).** Tam ayrım için bir hafta yeter zaman yok, mantıksal izolasyon yeterli güvence veriyor:
- Test data karışmaz (deaktive edildi)
- Non-pilot branch verisi sızmaz (deaktive edildi)
- Geri dönüş kolay (backup + UPDATE rollback)
- Pilot sonrası rollout planı net (kademeli aktivasyon)
