-- =====================================================================
-- Aslan 11 May 2026 — Otomatik vardiya kapatma alanları
-- =====================================================================
-- Personel "Vardiya Bitir" basmadan ayrılırsa 12 saat sonra
-- sistem otomatik kapatır. Kanıt için bu alanlar:
-- =====================================================================

ALTER TABLE branch_shift_sessions
  ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN DEFAULT FALSE;

ALTER TABLE branch_shift_sessions
  ADD COLUMN IF NOT EXISTS auto_closed_reason VARCHAR(50);

ALTER TABLE branch_shift_sessions
  ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS branch_shift_sessions_auto_closed_idx 
  ON branch_shift_sessions(auto_closed) WHERE auto_closed = TRUE;

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'branch_shift_sessions'
      AND column_name IN ('auto_closed', 'auto_closed_reason', 'auto_closed_at');

  IF col_count != 3 THEN
    RAISE EXCEPTION 'Beklenen 3 yeni kolon eklenemedi (% bulundu)', col_count;
  END IF;

  RAISE NOTICE '✅ branch_shift_sessions: auto_closed alanları eklendi (3 kolon + 1 index)';
END $$;
