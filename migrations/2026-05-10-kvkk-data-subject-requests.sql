-- =====================================================================
-- Aslan 10 May 2026 — KVKK m.11 Veri Sahibi Talep Sistemi
-- Tarih: 2026-05-10
--
-- AMAÇ:
--   Çalışan veya 3. kişi KVKK m.11'deki hakları talep edebilir:
--   - Bilgi (a-c), Düzeltme (d), Silme (e),
--   - 3. kişilere bildirim (f), İtiraz (g), Tazminat (h)
--
-- YASAL DAYANAK:
--   - KVKK m.11 (Veri sahibinin hakları)
--   - KVKK m.13 (Başvuruya yanıt — 30 gün içinde zorunlu)
--   - Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ
--     (RG 10.03.2018/30356)
--
-- KULLANIM:
--   psql "$DATABASE_URL" -f migrations/2026-05-10-kvkk-data-subject-requests.sql
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS kvkk_data_subject_requests CASCADE;
-- =====================================================================

CREATE TABLE IF NOT EXISTS kvkk_data_subject_requests (
  id SERIAL PRIMARY KEY,

  -- Talep eden
  requester_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  requester_name VARCHAR(200) NOT NULL,
  requester_email VARCHAR(255),
  requester_phone VARCHAR(50),
  requester_tc_no VARCHAR(11),

  -- Talep türü ve içerik
  request_type VARCHAR(30) NOT NULL,
  -- 'info', 'correction', 'deletion', 'notification', 'objection', 'compensation'
  request_description TEXT NOT NULL,
  data_category VARCHAR(100),

  -- Durum
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  -- 'received', 'in_review', 'additional_info', 'approved',
  -- 'completed', 'rejected', 'partial'

  -- Süreler (KVKK m.13: 30 gün)
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deadline TIMESTAMP NOT NULL,

  -- İnceleme
  assigned_to_user_id VARCHAR(50) REFERENCES users(id),
  review_started_at TIMESTAMP,
  review_notes TEXT,

  -- Yanıt
  responded_at TIMESTAMP,
  response_text TEXT,
  response_method VARCHAR(30),

  -- Karar
  decision_reason TEXT,
  actions_taken TEXT,

  -- Audit
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kvkk_requests_requester_idx
  ON kvkk_data_subject_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS kvkk_requests_status_idx
  ON kvkk_data_subject_requests(status);
CREATE INDEX IF NOT EXISTS kvkk_requests_deadline_idx
  ON kvkk_data_subject_requests(deadline);
CREATE INDEX IF NOT EXISTS kvkk_requests_type_idx
  ON kvkk_data_subject_requests(request_type);

COMMENT ON TABLE kvkk_data_subject_requests IS
  'KVKK m.11 veri sahibi talepleri (Aslan 10 May 2026)';

-- Doğrulama
DO $$
DECLARE
  table_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_exists
    FROM information_schema.tables
    WHERE table_name = 'kvkk_data_subject_requests';

  IF table_exists = 0 THEN
    RAISE EXCEPTION 'Tablo oluşturulamadı';
  END IF;

  RAISE NOTICE '✅ KVKK m.11 talep tablosu hazır (4 index)';
END $$;
