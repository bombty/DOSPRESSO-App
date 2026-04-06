-- Sprint F2: factory_batch_specs enerji tüketim kolonları
-- Tarih: 2026-04-06
-- Uygulama: psql $DATABASE_URL -f migrations/sprint-f2-batch-spec-energy-columns.sql

ALTER TABLE factory_batch_specs ADD COLUMN IF NOT EXISTS energy_kwh_per_batch NUMERIC(10,2);
ALTER TABLE factory_batch_specs ADD COLUMN IF NOT EXISTS gas_m3_per_batch NUMERIC(10,3);
ALTER TABLE factory_batch_specs ADD COLUMN IF NOT EXISTS water_l_per_batch NUMERIC(10,1);
