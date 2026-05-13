-- ═══════════════════════════════════════════════════════════════════
-- Sprint 50.1 HOTFIX (Aslan 13 May 2026) — Bugünün yanlış URL'li briefs'lerini temizle
-- ═══════════════════════════════════════════════════════════════════
-- /anomaly-action-plan, /teknik-arizalar gibi var olmayan URL'ler içeren
-- AI brief'leri sil. Sonraki istek otomatik yeni brief üretecek (artık
-- AI sistem prompt'unda sadece var olan route'lar tanımlı).
-- ═══════════════════════════════════════════════════════════════════

-- Sadece bugün üretilen (yanlış URL'li olabilir) brief'leri sil
DELETE FROM daily_briefs 
WHERE brief_date = CURRENT_DATE;

-- AI alerts içinde de eski yanlış URL'leri kontrol et (Sprint 49)
-- Sadece eğer action_url 404 veriyorsa
-- (Sprint 49 alert'lerinde URL'ler sabit, OK olmalı, ama yine de kontrol)
SELECT id, alert_type, action_url 
FROM ai_alerts 
WHERE status = 'pending' 
  AND action_url IS NOT NULL
ORDER BY id;
