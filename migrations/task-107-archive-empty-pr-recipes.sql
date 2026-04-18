-- Task #107 — Boş PR-* legacy reçetelerini arşivle
--
-- 12 adet legacy "powder/cookie/cheesecake/donut" reçetesi (PR-003..PR-014)
-- factory_recipe_ingredients tablosunda hiç satır içermiyordu. Bu reçeteler
-- modern reçetelerin (BRW-*, CHE-*, CIN-*, COK-*, DON-*, EKM-*) duplicate'i
-- olduğundan recalculate-recipe-prices.ts script'i bunları "skipped_empty"
-- olarak işaretliyor ve placeholder fiyatları koruyordu.
--
-- Done-criteria:
--   - PR-003..PR-014 reçeteleri arşivlenmiş (is_active=false)
--   - Recalc özetinde skippedEmpty = 0
--   - Tüm aktif reçeteler "applied" durumunda
--
-- İlişkili kayıtlar (silinmedi, yalnızca pasife alındı — audit/history için):
--   PR-003 → factory_products id=40  (DONUT-BASE)        — duplicate of DON-001
--   PR-004 → factory_products id=41  (CINNA-CLASSIC)     — duplicate of CIN-001/002
--   PR-005 → factory_products id=42  (CINNA-BROWNIE)     — duplicate of CIN-003
--   PR-006 → factory_products id=43  (COOKIE-NY)         — duplicate of COK-001
--   PR-007 → factory_products id=44  (COOKIE-CRUMBLE)    — duplicate of COK-002
--   PR-008 → factory_products id=45  (CHEESE-BASE)       — duplicate of CHE-*
--   PR-009 → factory_products id=46  (CHEESE-OREO)       — duplicate of CHE-004
--   PR-010 → factory_products id=47  (CHEESE-SANSEB)     — duplicate of CHE-005
--   PR-011 → factory_products id=61  (POWDER-BOMBTY)     — legacy powder
--   PR-012 → factory_products id=62  (POWDER-CHOCO)      — legacy powder
--   PR-013 → factory_products id=63  (POWDER-CREAM)      — legacy powder
--   PR-014 → factory_products id=1   (DONUT-001)         — duplicate of DON-001
--
-- Legacy factory_products kayıtlarının temizliği follow-up #108'de ele alınacak.

UPDATE factory_recipes
SET is_active = false,
    updated_at = NOW()
WHERE code IN (
  'PR-003','PR-004','PR-005','PR-006',
  'PR-007','PR-008','PR-009','PR-010',
  'PR-011','PR-012','PR-013','PR-014'
)
  AND is_active = true;

-- Doğrulama sorgusu (manuel kontrol için):
-- SELECT code, name, is_active,
--        (SELECT COUNT(*) FROM factory_recipe_ingredients fri WHERE fri.recipe_id = fr.id) AS ing_count
-- FROM factory_recipes fr
-- WHERE code LIKE 'PR-%'
-- ORDER BY code;
