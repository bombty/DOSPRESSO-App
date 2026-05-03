-- DB DRIFT FIX SCRIPT
-- Üretildi: 2026-05-03T08:39:05.413Z
-- Bu dosya scripts/db-drift-check.ts tarafından otomatik üretilir.
-- Çalıştırmadan önce gözden geçirin (özellikle veri çakışmalarına dikkat).

BEGIN;

-- Eksik UNIQUE constraint'ler
-- NOT: Mevcut tabloda duplicate veri varsa ALTER fail eder; önce SELECT ile kontrol edin.
ALTER TABLE "module_flags" ADD CONSTRAINT "uq_module_flags_key_scope_branch_role" UNIQUE ("module_key", "scope", "branch_id", "target_role");

-- 3 UNIQUE, 23 index ve 19 FK, DB'de olmayan tablolar için atlandı.
-- Önce eksik tabloları yaratmak için: npm run db:push (veya scripts/pilot/* script'leri)

COMMIT;
