-- ═══════════════════════════════════════════════════════════════════════
-- DOSPRESSO — Sprint A1: Kırık Sidebar Link Düzeltme (v2 — BUG FIX)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tarih: 18 Nisan 2026 (v1 label/updated_at kolon adı hatası vardı)
-- Replit v1'i zaten manuel düzeltip çalıştırdı (2+8 UPDATE başarılı)
-- v2 idempotent — tekrar çalıştırılırsa zarar vermez
--
-- GERÇEK menu_items KOLONLARI (shared/schema/schema-04.ts):
--   id, section_id, title_tr, path, icon, module_key,
--   scope, sort_order, is_active
--   (updated_at YOK, label değil title_tr)
--
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'Sprint A1 Migration v2 — BAŞLANGIÇ'
\echo '══════════════════════════════════════════════════════════════'

-- ─── ÖN KONTROL ───
SELECT 'Etkilenecek kayıtlar:' as info;
SELECT path, title_tr, is_active
FROM menu_items
WHERE path IN (
  '/yonetim/rol-yetkileri', '/ekipman',
  '/admin/kalite-denetim-sablonlari', '/ai-asistan',
  '/disiplin-yonetimi', '/ekipman-arizalari',
  '/ekipman-troubleshooting', '/ik',
  '/personel-yonetimi', '/vardiya-sablonlari',
  '/admin/rol-yetkileri', '/ekipman-mega'
)
ORDER BY path;

-- ─── KATEGORİ B — Path UPDATE (2 link) ───
\echo ''
\echo '── Kategori B: Path UPDATE'

UPDATE menu_items SET path = '/admin/rol-yetkileri' WHERE path = '/yonetim/rol-yetkileri';
UPDATE menu_items SET path = '/ekipman-mega' WHERE path = '/ekipman';

SELECT 'Kategori B sonuç:' as info, path, title_tr
FROM menu_items
WHERE path IN ('/admin/rol-yetkileri', '/ekipman-mega')
ORDER BY path;

-- ─── KATEGORİ C — Soft-delete (8 link) ───
\echo ''
\echo '── Kategori C: is_active=false'

UPDATE menu_items SET is_active = false
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

SELECT 'Kategori C sonuç:' as info, path, title_tr, is_active
FROM menu_items
WHERE path IN (
  '/admin/kalite-denetim-sablonlari', '/ai-asistan',
  '/disiplin-yonetimi', '/ekipman-arizalari',
  '/ekipman-troubleshooting', '/ik',
  '/personel-yonetimi', '/vardiya-sablonlari'
)
ORDER BY path;

-- ─── Redirect kayıtları aktif kalıyor ───
SELECT 'Redirect kayıtları (App.tsx redirect aktif):' as info, path, title_tr, is_active
FROM menu_items
WHERE path IN ('/musteri-geribildirimi', '/training')
ORDER BY path;

-- ─── ACCEPTANCE ───
\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'ACCEPTANCE SONUÇ'
\echo '══════════════════════════════════════════════════════════════'

SELECT 'Aktif menu_items toplam' as metric, COUNT(*) as value
FROM menu_items WHERE is_active = true
UNION ALL
SELECT 'Soft-delete (is_active=false)', COUNT(*)
FROM menu_items WHERE is_active = false
UNION ALL
SELECT '/ekipman-mega aktif', COUNT(*)
FROM menu_items WHERE path = '/ekipman-mega' AND is_active = true
UNION ALL
SELECT '/admin/rol-yetkileri aktif', COUNT(*)
FROM menu_items WHERE path = '/admin/rol-yetkileri' AND is_active = true;

COMMIT;

\echo ''
\echo '✅ Sprint A1 migration v2 tamamlandı'
\echo '   Bug fix: label→title_tr, updated_at kolonu kaldırıldı'
\echo '   26 kırık link → 0 (14 Route + 2 path update + 8 soft-delete + 2 redirect)'
