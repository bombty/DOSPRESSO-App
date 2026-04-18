-- ═══════════════════════════════════════════════════════════════════════
-- DOSPRESSO — Sprint A3: Equipment Fault Enum TR→EN Migration
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tarih: 18 Nisan 2026
-- Kaynak: Replit audit raporu — equipment_faults.status ve priority
--         kolonlarında TR+EN karışık enum değerleri.
--
-- MEVCUT DURUM (audit'ten):
--   status:    acik=8, open=9, devam_ediyor=5, in_progress=19, cozuldu=8, resolved=26
--   priority:  dusuk=?, düşük=2, low=11, orta=?, medium=19, yüksek=6, yuksek=1, high=9, kritik=1, critical=15
--
-- HEDEF (Sprint A3 sonrası):
--   status:    open, in_progress, resolved (3 değer, tüm varyantlar merge)
--   priority:  low, medium, high, critical (4 değer, tüm varyantlar merge)
--
-- BONUS: priority_level (green/yellow/red) zaten normalize, dokunulmuyor.
--
-- Bu migration IDEMPOTENT — tekrar çalıştırılabilir, sadece TR varyantları
-- değiştirir, EN olanlar etkilenmez.
--
-- Çalıştırma:
--   psql "$DATABASE_URL" < migrations/sprint-a3-equipment-enum.sql
--
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'Sprint A3 — Equipment Fault Enum TR→EN Migration'
\echo '══════════════════════════════════════════════════════════════'

-- ─── ÖN DURUM ───
\echo ''
\echo '── Öncesi: status dağılımı'
SELECT status, COUNT(*) as n FROM equipment_faults GROUP BY status ORDER BY n DESC;

\echo ''
\echo '── Öncesi: priority dağılımı'
SELECT priority, COUNT(*) as n FROM equipment_faults GROUP BY priority ORDER BY n DESC;

-- ─── STATUS MIGRATION ───
\echo ''
\echo '── STATUS migration (acik/devam_ediyor/cozuldu → open/in_progress/resolved)'

UPDATE equipment_faults SET status = 'open'        WHERE status = 'acik';
UPDATE equipment_faults SET status = 'in_progress' WHERE status = 'devam_ediyor';
UPDATE equipment_faults SET status = 'resolved'    WHERE status = 'cozuldu';
-- Varsa başka TR varyantları
UPDATE equipment_faults SET status = 'open'        WHERE status IN ('açık', 'açik');
UPDATE equipment_faults SET status = 'resolved'    WHERE status IN ('çözüldü', 'cozuldu_');

-- ─── PRIORITY MIGRATION ───
\echo ''
\echo '── PRIORITY migration (dusuk/orta/yuksek/kritik → low/medium/high/critical)'

UPDATE equipment_faults SET priority = 'low'      WHERE priority IN ('dusuk', 'düşük', 'dusuk_');
UPDATE equipment_faults SET priority = 'medium'   WHERE priority IN ('orta', 'orta_');
UPDATE equipment_faults SET priority = 'high'     WHERE priority IN ('yuksek', 'yüksek', 'yuksek_');
UPDATE equipment_faults SET priority = 'critical' WHERE priority IN ('kritik', 'kritik_');

-- ─── DEFAULT DEĞER GÜNCELLEMESİ ───
-- Önemli: schema'daki default "acik" ve "orta" TR kalıyor, bunları da EN yapalım.
-- Bu ALTER TABLE schema'yı da güncellemek için gerekli.
\echo ''
\echo '── Column default değerlerini EN yap'

ALTER TABLE equipment_faults ALTER COLUMN status   SET DEFAULT 'open';
ALTER TABLE equipment_faults ALTER COLUMN priority SET DEFAULT 'medium';

-- ─── SONRA DURUM ───
\echo ''
\echo '── Sonrası: status dağılımı'
SELECT status, COUNT(*) as n FROM equipment_faults GROUP BY status ORDER BY n DESC;

\echo ''
\echo '── Sonrası: priority dağılımı'
SELECT priority, COUNT(*) as n FROM equipment_faults GROUP BY priority ORDER BY n DESC;

-- ─── ACCEPTANCE KONTROL ───
\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'ACCEPTANCE — Hiç TR varyant kalmamalı'
\echo '══════════════════════════════════════════════════════════════'

SELECT 'TR status varyantı (0 olmalı)' as check_name, COUNT(*) as value
FROM equipment_faults
WHERE status IN ('acik', 'devam_ediyor', 'cozuldu', 'açık', 'çözüldü')
UNION ALL
SELECT 'TR priority varyantı (0 olmalı)', COUNT(*)
FROM equipment_faults
WHERE priority IN ('dusuk', 'düşük', 'orta', 'yuksek', 'yüksek', 'kritik')
UNION ALL
SELECT 'Unique status değerleri', COUNT(DISTINCT status) FROM equipment_faults
UNION ALL
SELECT 'Unique priority değerleri', COUNT(DISTINCT priority) FROM equipment_faults;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (gerekirse yorumu kaldır — tercih edilmez, veri kaybı olmaz ama
-- enum tutarlılığı bozulur)
-- ═══════════════════════════════════════════════════════════════════════
-- BEGIN;
-- UPDATE equipment_faults SET status='acik' WHERE status='open';
-- UPDATE equipment_faults SET status='devam_ediyor' WHERE status='in_progress';
-- UPDATE equipment_faults SET status='cozuldu' WHERE status='resolved';
-- UPDATE equipment_faults SET priority='dusuk' WHERE priority='low';
-- UPDATE equipment_faults SET priority='orta' WHERE priority='medium';
-- UPDATE equipment_faults SET priority='yuksek' WHERE priority='high';
-- UPDATE equipment_faults SET priority='kritik' WHERE priority='critical';
-- ALTER TABLE equipment_faults ALTER COLUMN status SET DEFAULT 'acik';
-- ALTER TABLE equipment_faults ALTER COLUMN priority SET DEFAULT 'orta';
-- COMMIT;

\echo ''
\echo '✅ Sprint A3 migration tamamlandı'
\echo '   status:   3 EN değer (open, in_progress, resolved)'
\echo '   priority: 4 EN değer (low, medium, high, critical)'
\echo '   Schema default\'ları EN olarak güncellendi'
