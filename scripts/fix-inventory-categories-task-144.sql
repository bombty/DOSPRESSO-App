-- Task #144: Reçete malzemesi olarak kullanılan envanter kayıtlarının
-- kategorisi yanlış (ticari_mal/bitimis_urun) → doğru kategoriye taşı.
-- Idempotent: code+id eşleşmesiyle çalışır, defalarca güvenle koşturulabilir.

UPDATE inventory SET category = 'hammadde', updated_at = NOW()
 WHERE id = 280 AND code = 'M-1130'  AND category <> 'hammadde';

UPDATE inventory SET category = 'hammadde', updated_at = NOW()
 WHERE id = 345 AND code = 'T-0005'  AND category <> 'hammadde';

UPDATE inventory SET category = 'hammadde', updated_at = NOW()
 WHERE id = 437 AND code = 'T-0098'  AND category <> 'hammadde';

UPDATE inventory SET category = 'hammadde', updated_at = NOW()
 WHERE id = 837 AND code = 'M-1194'  AND category <> 'hammadde';

UPDATE inventory SET category = 'yari_mamul', updated_at = NOW()
 WHERE id = 64  AND code = 'CHEE-003' AND category <> 'yari_mamul';

-- Doğrulama
SELECT id, code, name, category
  FROM inventory
 WHERE id IN (280, 437, 345, 837, 64)
 ORDER BY id;
