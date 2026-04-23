-- Task #199 — Üretim partilerini sistemde kayıt altına al
-- Etiket basım logu tablosuna lot/üretim/SKT alanları eklenir.
-- Mevcut kayıtlar bozulmadan ALTER TABLE ile genişletilir.

ALTER TABLE factory_recipe_label_print_logs
  ADD COLUMN IF NOT EXISTS lot_number       varchar(60),
  ADD COLUMN IF NOT EXISTS production_date  varchar(10),
  ADD COLUMN IF NOT EXISTS expiry_date      varchar(10);

CREATE INDEX IF NOT EXISTS frlpl_lot_idx
  ON factory_recipe_label_print_logs (recipe_id, lot_number);
