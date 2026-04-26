-- Task #255 — server/index.ts startup'ından çıkarılan ham DDL bloklarının
-- versiyonlanmış migration karşılığı. Tarih: 2026-04-26
--
-- Önceden bu bloklar her process boot'ta `db.execute(sql\`...\`)` ile
-- çalışıyordu (server/index.ts içindeki ensureKioskSessionsTable,
-- migrateKioskPasswords ve onServerReady fonksiyonları). Artık şema
-- değişiklikleri burada versiyonlanır.
--
-- Tüm ifadeler idempotent yazılmıştır.

BEGIN;

-- 1) Kiosk oturum tablosu (ensureKioskSessionsTable'dan taşındı)
CREATE TABLE IF NOT EXISTS "kiosk_sessions" (
  "id" SERIAL PRIMARY KEY,
  "token" VARCHAR(64) NOT NULL UNIQUE,
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id"),
  "station_id" INTEGER,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_kiosk_sessions_token" ON "kiosk_sessions" ("token");
CREATE INDEX IF NOT EXISTS "idx_kiosk_sessions_user" ON "kiosk_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_kiosk_sessions_expires" ON "kiosk_sessions" ("expires_at");

-- 2) Branch kiosk şifre kolon tipi (varchar 255) ve auto_close_time + giriş
--    yöntemi toggle'ları (migrateKioskPasswords ve onServerReady'den taşındı)
ALTER TABLE "branch_kiosk_settings" ALTER COLUMN "kiosk_password" TYPE VARCHAR(255);
ALTER TABLE "branch_kiosk_settings" ALTER COLUMN "kiosk_password" DROP DEFAULT;
ALTER TABLE "branch_kiosk_settings" ADD COLUMN IF NOT EXISTS "auto_close_time" VARCHAR(5) DEFAULT '22:00';
ALTER TABLE "branch_kiosk_settings" ADD COLUMN IF NOT EXISTS "allow_pin" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "branch_kiosk_settings" ADD COLUMN IF NOT EXISTS "allow_qr" BOOLEAN NOT NULL DEFAULT TRUE;

-- 3) Setup/onboarding flag kolonları (onServerReady'den taşındı)
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "setup_complete" BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_complete" BOOLEAN DEFAULT FALSE;

COMMIT;
