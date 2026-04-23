-- ═══════════════════════════════════════════════════════════════════
-- MR. DOBODY ROUTING RULES SEED (Pilot Kritik)
-- 23 Nis 2026 - Replit E4 bulgusu
-- ═══════════════════════════════════════════════════════════════════
--
-- SORUN:
--   agent_routing_rules tablosunda sadece 1 kural var (cgo→strategic)
--   Barista/mudur/supervisor için eskalasyon kuralı YOK
--   → Mr. Dobody otomatik yönlendirme pilot sırasında çalışmaz
--
-- ÇÖZÜM:
--   Pilot için minimum 15 kritik kural seed
--   Kategoriler: performance, training, operations, quality, factory, hr, strategic
--
-- NOT:
--   Sistemde seed endpoint var (/api/admin/seed-agent-routing) ama tabloyu
--   boş bulursa çalışır. Mevcut 1 kayıt (cgo) yüzünden endpoint atlar.
--   Bu SQL onu dikkate almaz - eksik kuralları ekler.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Yeni Kurallar (ON CONFLICT kontrollü) ─────────────────────

-- Mevcut kural kontrolü
DO $$
DECLARE
  existing_count INT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM agent_routing_rules WHERE is_active = true;
  RAISE NOTICE 'Başlangıç: % aktif kural', existing_count;
END $$;

-- INSERT: 15 pilot kritik kural
-- (INSERT ON CONFLICT category+subcategory uniq index yok, manuel kontrol)

INSERT INTO agent_routing_rules
  (category, subcategory, description, primary_role, secondary_role, escalation_role, escalation_days, notify_branch_supervisor, send_hq_summary, is_active, created_by)
SELECT * FROM (VALUES
  -- PERFORMANCE (skor, devamsızlık, terfi)
  ('performance'::varchar, 'low_score'::varchar, 'Düşük performans skoru', 'coach'::varchar, 'supervisor'::varchar, 'cgo'::varchar, 3, true, true, true, 'pilot-seed'::varchar),
  ('performance', 'absence', 'Devamsızlık', 'supervisor', 'coach', 'cgo', 3, true, true, true, 'pilot-seed'),
  ('performance', 'promotion_ready', 'Terfi hazırlığı', 'coach', 'trainer', 'cgo', 7, true, true, true, 'pilot-seed'),

  -- TRAINING (eğitim, quiz)
  ('training', 'overdue', 'Geciken eğitim', 'trainer', 'supervisor', 'coach', 5, true, true, true, 'pilot-seed'),
  ('training', 'low_quiz_score', 'Düşük quiz puanı', 'trainer', NULL, 'coach', 5, false, true, true, 'pilot-seed'),

  -- OPERATIONS (checklist, stok)
  ('operations', 'checklist_missed', 'Checklist yapılmadı', 'supervisor', 'mudur', 'cgo', 2, true, true, true, 'pilot-seed'),
  ('operations', 'stock_low', 'Düşük stok', 'mudur', 'satinalma', 'cgo', 1, true, true, true, 'pilot-seed'),

  -- QUALITY (kalite, müşteri)
  ('quality', 'customer_complaint', 'Müşteri şikayeti', 'kalite_kontrol', 'supervisor', 'cgo', 1, true, true, true, 'pilot-seed'),
  ('quality', 'low_satisfaction', 'Düşük memnuniyet', 'kalite_kontrol', 'mudur', 'cgo', 3, true, true, true, 'pilot-seed'),

  -- FACTORY (üretim, HACCP)
  ('factory', 'production_miss', 'Üretim hedefi tutmadı', 'fabrika_mudur', NULL, 'cgo', 2, false, true, true, 'pilot-seed'),
  ('factory', 'haccp_fail', 'HACCP uyumsuzluk', 'gida_muhendisi', 'fabrika_mudur', 'ceo', 1, false, true, true, 'pilot-seed'),
  ('factory', 'high_waste', 'Yüksek fire oranı', 'fabrika_mudur', 'gida_muhendisi', 'cgo', 2, false, true, true, 'pilot-seed'),

  -- HR (izin, bordro)
  ('hr', 'leave_request', 'İzin talebi', 'mudur', 'supervisor', 'coach', 2, true, false, true, 'pilot-seed'),
  ('hr', 'payroll_issue', 'Bordro sorunu', 'muhasebe_ik', NULL, 'cgo', 2, false, true, true, 'pilot-seed'),

  -- STRATEGIC (sadece HQ)
  ('strategic', 'branch_risk', 'Şube kapanma riski', 'cgo', 'ceo', NULL, NULL, false, true, true, 'pilot-seed')
) AS new_rules (category, subcategory, description, primary_role, secondary_role, escalation_role, escalation_days, notify_branch_supervisor, send_hq_summary, is_active, created_by)
WHERE NOT EXISTS (
  SELECT 1 FROM agent_routing_rules ar
  WHERE ar.category = new_rules.category
    AND (ar.subcategory IS NOT DISTINCT FROM new_rules.subcategory)
);

-- ─── Sonuç Raporu ────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  total_count INT;
  pilot_roles_covered INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM agent_routing_rules WHERE is_active = true;

  SELECT COUNT(DISTINCT primary_role) INTO pilot_roles_covered
  FROM agent_routing_rules
  WHERE is_active = true
    AND primary_role IN ('supervisor', 'mudur', 'coach', 'trainer',
                         'kalite_kontrol', 'muhasebe_ik', 'satinalma',
                         'fabrika_mudur', 'gida_muhendisi', 'cgo', 'ceo');

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Mr. Dobody Routing Rules Seed';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Toplam aktif kural:  %', total_count;
  RAISE NOTICE 'Pilot rolleri kapsama: % / 11 rol', pilot_roles_covered;
  RAISE NOTICE '';
  RAISE NOTICE 'Kategori dağılımı:';

  FOR r IN
    SELECT category, COUNT(*) as c
    FROM agent_routing_rules WHERE is_active = true
    GROUP BY category ORDER BY category
  LOOP
    RAISE NOTICE '  %: % kural', r.category, r.c;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
