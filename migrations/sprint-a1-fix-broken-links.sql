-- ═══════════════════════════════════════════════════════════════════════
-- DOSPRESSO — Sprint A1: Kırık Sidebar Link Düzeltme
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tarih: 21 Nisan 2026 (Cumartesi gecesi uygulandı)
-- Hazırlayan: Claude (IT Danışman)
-- Aslan kararları: Tüm Claude önerileri kabul edildi
--
-- KAPSAM:
--   Kategori B — 2 link PATH UPDATE
--   Kategori C — 8 link is_active=false (Karar 6: soft-delete)
--
-- KATEGORİ A (14 link) ayrı bir işlem: client/src/App.tsx'e Route eklendi.
-- Bu dosya sadece DB tarafı.
--
-- Replit çalıştırma:
--   psql "$DATABASE_URL" < migrations/sprint-a1-fix-broken-links.sql
--
-- ROLLBACK:
--   Her bloğun altındaki ROLLBACK satırlarını yorumu kaldırıp çalıştır.
--
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── ÖN KONTROL — Kırık link durumu ───
\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'Sprint A1 Migration — BAŞLANGIÇ DURUMU'
\echo '══════════════════════════════════════════════════════════════'

SELECT 'Etkilenecek kayıtlar:' as info;
SELECT path, label, is_active
FROM menu_items
WHERE path IN (
  -- Kategori B — 2 link (UPDATE)
  '/yonetim/rol-yetkileri',
  '/ekipman',
  -- Kategori C — 8 link (is_active=false) — Aslan kararları
  '/admin/kalite-denetim-sablonlari',   -- sayfa yok → kapat
  '/ai-asistan',                         -- Karar 3: Dobody zaten her yerde, sil
  '/disiplin-yonetimi',                  -- sayfa yok → kapat
  '/ekipman-arizalari',                  -- sayfa yok → kapat
  '/ekipman-troubleshooting',            -- sayfa yok → kapat
  '/ik',                                 -- sayfa yok → kapat (HR ana sayfa farklı path'te)
  '/personel-yonetimi',                  -- sayfa yok → kapat
  '/vardiya-sablonlari'                  -- sayfa yok → kapat
)
ORDER BY path;

-- ─── KATEGORİ B — Path UPDATE (2 link) ───
\echo ''
\echo '── Kategori B: Path UPDATE (2 link)'

-- Karar: /yonetim/rol-yetkileri → /admin/rol-yetkileri (zaten mevcut sayfaya)
UPDATE menu_items
SET path = '/admin/rol-yetkileri',
    updated_at = NOW()
WHERE path = '/yonetim/rol-yetkileri';

-- Karar 1: /ekipman → /ekipman-mega (Aslan'ın Nisan başında yaptırdığı mega dashboard)
UPDATE menu_items
SET path = '/ekipman-mega',
    updated_at = NOW()
WHERE path = '/ekipman';

-- Doğrulama
SELECT 'Kategori B sonuç:' as info, path, label
FROM menu_items
WHERE path IN ('/admin/rol-yetkileri', '/ekipman-mega');

-- ─── KATEGORİ C — Soft-delete / is_active=false (8 link) ───
-- Karar 6: is_active=false (schema değişikliği yok, geri döndürülebilir)
\echo ''
\echo '── Kategori C: is_active=false (8 link, sayfa yok veya karar ile kapatıldı)'

UPDATE menu_items
SET is_active = false,
    updated_at = NOW()
WHERE path IN (
  '/admin/kalite-denetim-sablonlari',
  '/ai-asistan',                         -- Karar 3
  '/disiplin-yonetimi',
  '/ekipman-arizalari',
  '/ekipman-troubleshooting',
  '/ik',
  '/personel-yonetimi',
  '/vardiya-sablonlari'
);

-- Doğrulama
SELECT 'Kategori C sonuç (is_active=false):' as info, path, label, is_active
FROM menu_items
WHERE path IN (
  '/admin/kalite-denetim-sablonlari',
  '/ai-asistan',
  '/disiplin-yonetimi',
  '/ekipman-arizalari',
  '/ekipman-troubleshooting',
  '/ik',
  '/personel-yonetimi',
  '/vardiya-sablonlari'
);

-- ─── NOT: /musteri-geribildirimi ve /training SILINMEDİ ───
-- Karar 4 ve 5: Redirect kullanılacak (App.tsx'te redirect component eklendi)
-- Sidebar kayıtları aktif kalır, tıklanınca /crm ve /akademi'ye gider.
\echo ''
\echo '── Redirect kayıtları aktif kalıyor:'
SELECT path, label, is_active
FROM menu_items
WHERE path IN ('/musteri-geribildirimi', '/training');

-- ─── ACCEPTANCE KONTROL ───
\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'ACCEPTANCE — Kalan kırık link sayısı'
\echo '══════════════════════════════════════════════════════════════'
-- Not: Bu sorgu app_routes tablosu varsa çalışır, yoksa alternatif manuel kontrol gerek.
-- Şu an manuel olarak: 26 - 14 (App.tsx Route eklendi) - 2 (UPDATE) - 8 (is_active=false) - 2 (redirect) = 0 hedef

SELECT 'Aktif menu_items toplam:' as metric, COUNT(*) as value FROM menu_items WHERE is_active = true
UNION ALL
SELECT 'Arşivlenmiş (is_active=false):' as metric, COUNT(*) FROM menu_items WHERE is_active = false;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (gerekirse yorumu kaldır ve çalıştır)
-- ═══════════════════════════════════════════════════════════════════════
-- BEGIN;
-- UPDATE menu_items SET path='/yonetim/rol-yetkileri', updated_at=NOW() WHERE path='/admin/rol-yetkileri' AND label ILIKE '%rol%';
-- UPDATE menu_items SET path='/ekipman', updated_at=NOW() WHERE path='/ekipman-mega';
-- UPDATE menu_items SET is_active=true, updated_at=NOW() WHERE path IN (
--   '/admin/kalite-denetim-sablonlari','/ai-asistan','/disiplin-yonetimi',
--   '/ekipman-arizalari','/ekipman-troubleshooting','/ik',
--   '/personel-yonetimi','/vardiya-sablonlari'
-- );
-- COMMIT;

\echo ''
\echo '✅ Sprint A1 migration tamamlandı'
\echo '   Kategori A: 14 Route App.tsx'\''e eklendi (ayrı commit)'
\echo '   Kategori B: 2 link path güncellendi'
\echo '   Kategori C: 8 link is_active=false yapıldı'
\echo '   Redirect: 2 link App.tsx redirect component ile yönlendirildi'
\echo ''
\echo '   Toplam: 26 kırık link → 0 hedef'
