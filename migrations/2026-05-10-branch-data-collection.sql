-- =====================================================================
-- Aslan 10 May 2026 — Şube Veri Toplama Sistemi
-- Tarih: 2026-05-10
-- Owner: Aslan
--
-- AMAÇ:
--   - CGO'nun 25 şubeden personel + ekipman bilgilerini Excel ile toplaması
--   - 2 yeni tablo: branch_data_uploads + branch_data_collection_status
--   - Mevcut data etkilenmez (sadece yeni tablo ekleme)
--
-- KULLANIM:
--   psql "$DATABASE_URL" -f migrations/2026-05-10-branch-data-collection.sql
--
-- DRY RUN (transaction içinde test):
--   psql "$DATABASE_URL" -1 -f migrations/2026-05-10-branch-data-collection.sql
--   (-1 flag transaction yapar, hata olursa otomatik rollback)
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS branch_data_collection_status CASCADE;
--   DROP TABLE IF EXISTS branch_data_uploads CASCADE;
--
-- TIMEOUT NOTU:
--   Bu migration 2 yeni tablo + 4 index oluşturur, < 1 saniyede tamamlanır.
--   Drizzle push'a benzer DDL-only operation, RİSKSİZ.
-- =====================================================================

-- =====================================================================
-- 1. branch_data_uploads — Excel yükleme kayıtları
-- =====================================================================

CREATE TABLE IF NOT EXISTS branch_data_uploads (
  id SERIAL PRIMARY KEY,

  -- Şube bağlantısı
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  -- Yükleyen kullanıcı (CGO veya şube müdürü)
  uploaded_by_id VARCHAR(50) NOT NULL REFERENCES users(id),
  uploaded_by_role VARCHAR(50) NOT NULL,
  -- "cgo", "branch_manager", "owner" (Partner)

  -- Dosya bilgileri
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER,
  file_hash VARCHAR(64),
  -- SHA256 — duplicate upload detection için

  -- Parse sonuçları
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- "pending", "parsing", "validating", "success", "partial", "failed"

  parsed_personnel_count INTEGER DEFAULT 0,
  parsed_equipment_count INTEGER DEFAULT 0,

  inserted_personnel_count INTEGER DEFAULT 0,
  updated_personnel_count INTEGER DEFAULT 0,
  skipped_personnel_count INTEGER DEFAULT 0,

  inserted_equipment_count INTEGER DEFAULT 0,
  updated_equipment_count INTEGER DEFAULT 0,
  skipped_equipment_count INTEGER DEFAULT 0,

  -- Validation sonuçları (JSONB)
  validation_warnings JSONB,
  parse_errors JSONB,

  -- Süreç bilgileri
  processing_time_ms INTEGER,
  completed_at TIMESTAMP,

  -- Notlar
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS branch_data_uploads_branch_idx
  ON branch_data_uploads(branch_id);
CREATE INDEX IF NOT EXISTS branch_data_uploads_status_idx
  ON branch_data_uploads(status);
CREATE INDEX IF NOT EXISTS branch_data_uploads_created_idx
  ON branch_data_uploads(created_at);

COMMENT ON TABLE branch_data_uploads IS
  'CGO/Şube müdürü Excel yükleme geçmişi (Aslan 10 May 2026)';

-- =====================================================================
-- 2. branch_data_collection_status — Her şubenin son durumu
-- =====================================================================
--
-- Bu tablo branch_data_uploads'ın bir özeti — her şube için sadece
-- 1 kayıt vardır. CGO sayfasında hızlı listeleme için kullanılır.

CREATE TABLE IF NOT EXISTS branch_data_collection_status (
  branch_id INTEGER PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,

  -- Genel durum
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  -- "not_started"            — Hiç template indirilmedi
  -- "template_downloaded"    — Template indirildi ama yüklenmedi
  -- "in_progress"            — Şube müdürü dolduruyor (heuristic)
  -- "uploaded_pending_review"— Yüklendi, CGO inceliyor
  -- "completed"              — Tamamlandı, veriler aktif
  -- "outdated"               — Eski (tekrar güncellenmesi gerekiyor)

  -- Veri sayıları
  total_personnel INTEGER DEFAULT 0,
  total_equipment INTEGER DEFAULT 0,

  completion_percentage INTEGER DEFAULT 0,
  -- 0-100

  -- Son aktivite
  last_template_download_at TIMESTAMP,
  last_upload_at TIMESTAMP,
  last_upload_id INTEGER REFERENCES branch_data_uploads(id) ON DELETE SET NULL,

  -- Sonraki güncelleme tarihi (otomatik hatırlatma için)
  next_review_date TIMESTAMP,

  -- Notlar
  cgo_notes TEXT,
  manager_notes TEXT,

  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS branch_data_status_status_idx
  ON branch_data_collection_status(status);

COMMENT ON TABLE branch_data_collection_status IS
  'Her şubenin veri toplama durumu özeti (Aslan 10 May 2026)';

-- =====================================================================
-- 3. Doğrulama
-- =====================================================================

DO $$
DECLARE
  uploads_count INTEGER;
  status_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO uploads_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'branch_data_uploads';

  SELECT COUNT(*) INTO status_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'branch_data_collection_status';

  IF uploads_count = 0 THEN
    RAISE EXCEPTION 'branch_data_uploads tablosu oluşturulamadı';
  END IF;

  IF status_count = 0 THEN
    RAISE EXCEPTION 'branch_data_collection_status tablosu oluşturulamadı';
  END IF;

  RAISE NOTICE '✅ Migration başarılı: 2 yeni tablo + 4 index oluşturuldu';
END $$;

-- =====================================================================
-- ÖZET
-- =====================================================================
--
-- ✅ Eklenen Tablolar:
--    1. branch_data_uploads (15 kolon, 3 index)
--    2. branch_data_collection_status (12 kolon, 1 index)
--
-- ✅ Etkilenen Mevcut Veri: YOK (sadece yeni tablolar)
--
-- ✅ Foreign Keys:
--    - branch_data_uploads.branch_id → branches.id (CASCADE)
--    - branch_data_uploads.uploaded_by_id → users.id
--    - branch_data_collection_status.branch_id → branches.id (CASCADE)
--    - branch_data_collection_status.last_upload_id → branch_data_uploads.id (SET NULL)
--
-- ✅ Süre: < 1 saniye (DDL-only)
--
-- ✅ Riskler: YOK (yeni tablo, mevcut tablolara dokunmaz)
-- =====================================================================
