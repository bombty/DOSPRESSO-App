-- DB DRIFT FIX SCRIPT
-- Üretildi: 2026-05-03T18:33:58.827Z
-- Bu dosya scripts/db-drift-check.ts tarafından otomatik üretilir.
-- Çalıştırmadan önce gözden geçirin (özellikle veri çakışmalarına dikkat).

BEGIN;

-- 3 UNIQUE, 23 index ve 19 FK, DB'de olmayan tablolar için atlandı.
-- Önce eksik tabloları yaratmak için: npm run db:push (veya scripts/pilot/* script'leri)

COMMIT;
