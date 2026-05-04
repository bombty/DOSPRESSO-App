# Sprint 1 — Plan Mode Prompt (Replit için)

## TASK-#343: leave_balances Tablosu + Initial Seed

### Bağlam
Sprint 1 / 4 — İK Schema Foundation. Mahmut Bey için izin bakiyesi takibi
gerçek tablodan gelmeli (şu an runtime hesaplanıyor, frontend
`LeaveManagementSection.tsx` boş array dönüyor).

### Pre-flight (Plan mode başlamadan önce)

```
1. git fetch origin
2. git log --oneline origin/main -3
   (en üstte sprint-1 branch commit'i olmalı)
3. git pull origin main
   (Aslan bu branch'i merge ederse main'de olur)
```

### Plan Mode Görev Tanımı

**Hedef:** `leave_balances` tablosunu DB'de oluştur, mevcut leave_requests
verisinden initial bakiyeleri seed et.

**Adımlar:**

#### 1. Backup (zorunlu)
```bash
pg_dump $DATABASE_URL > backup-pre-leave-balances-$(date +%Y%m%d-%H%M).dump
```

#### 2. Mevcut Durum Doğrulama
```sql
-- Tablo yok mu?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'leave_balances'
);
-- Beklenen: f (false)

-- leave_requests'te 2026 approved annual izin sayısı?
SELECT COUNT(*), SUM(total_days) 
FROM leave_requests 
WHERE status = 'approved' 
  AND leave_type IN ('annual', 'annual_leave', 'yillik')
  AND EXTRACT(YEAR FROM start_date) = 2026;

-- Aktif kullanıcı sayısı?
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL 
  AND role NOT IN ('admin', 'kiosk_user', 'tablet_kiosk');
```

#### 3. DRY-RUN
```bash
psql $DATABASE_URL -f migrations/2026-05-05-leave-balances-init.sql --echo-all -v ON_ERROR_STOP=1 --single-transaction
# Hata varsa rollback otomatik
```

#### 4. EXECUTE Onayı (Aslan'dan GO)
DRY-RUN sonucunda:
- Kaç kullanıcı için kayıt oluştu?
- Toplam entitlement/used/remaining sayısı mantıklı mı?
- Aslan: "GO" → migration commit edilir

#### 5. Schema Push (Drizzle ORM bilgilensin)
```bash
npx drizzle-kit push
# leaveBalances eklendi diyecek (zaten DB'de var, no-op olabilir)
```

#### 6. Smoke Test
```bash
# A) Frontend test
curl -s "$REPLIT_URL/api/personnel/USER_ID/leave-salary-summary" \
  -H "Cookie: connect.sid=..." | jq '.leaveBalance'
# Beklenen: { remaining: <number>, used: <number>, entitled: <number> }

# B) DB doğrulama
psql $DATABASE_URL -c "
  SELECT 
    COUNT(*) AS records,
    AVG(annual_entitlement_days)::INT AS avg_entitlement,
    SUM(used_days) AS total_used,
    SUM(remaining_days) AS total_remaining
  FROM leave_balances 
  WHERE period_year = 2026;
"
```

#### 7. Workflow Restart
Backend hot-reload yeterli olabilir, ama emin olmak için:
```bash
workflow restart
```

### Success Criteria

- [ ] `leave_balances` tablosu DB'de var (3 index dahil)
- [ ] 2026 yılı için tüm aktif kullanıcılar seed edildi (~245+ kayıt)
- [ ] `remaining_days` hesaplanan kolon doğru çalışıyor
- [ ] `/api/personnel/:id/leave-salary-summary` endpoint hatasız dönüyor
- [ ] Schema TypeScript ile DB uyumlu (drizzle-kit push no-op döndürüyor)
- [ ] Backup dosyası mevcut

### Out of Scope (Bu sprint'te DEĞİL)

- Frontend güncelleme (Sprint 4)
- leave_requests onay akışı değişikliği
- carried_over_days hesaplama (manuel veya Sprint 3'te)

### Rollback Plan (Eğer EXECUTE sonrası sorun varsa)

```sql
BEGIN;
DELETE FROM leave_balances WHERE notes LIKE 'Initial seed%';
DROP TABLE IF EXISTS leave_balances CASCADE;
COMMIT;
```

leave_requests etkilenmez (FK sadece users → leave_balances).

### Beklenen Süre

- Backup + DRY-RUN: 5 dk
- EXECUTE + verification: 5 dk
- Smoke test: 5 dk
- Toplam: **~15 dk**

---

**Aslan onayı bekleniyor → Plan'a GO dediğinde Replit Build mode'da execute eder.**
