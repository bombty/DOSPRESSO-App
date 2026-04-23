-- ═══════════════════════════════════════════════════════════════════
-- POST-SEED VERIFICATION (Pilot 28 Nis 2026)
-- ═══════════════════════════════════════════════════════════════════
-- Çalıştırma:
--   psql "$DATABASE_URL" -f docs/pilot/post-seed-verification.sql
--
-- Beklenen sonuç: HER sorgu BAŞLIK + 0 satır VEYA "OK" mesajı.
-- Eğer herhangi bir sorgu > 0 satır dönerse, ilgili seed BAŞARISIZ.
-- ═══════════════════════════════════════════════════════════════════

\echo '════════ E1: branch_staff_pins duplicate hash kontrolü ════════'
\echo 'Beklenen: 0 satır (her aktif user benzersiz bcrypt hash)'
SELECT branch_id, hashed_pin, COUNT(DISTINCT user_id) AS dupe_users
FROM branch_staff_pins
WHERE branch_id IN (5, 8, 23, 24) AND is_active = true
GROUP BY branch_id, hashed_pin
HAVING COUNT(DISTINCT user_id) > 1;

\echo ''
\echo '════════ E1b: factory_staff_pins duplicate hash kontrolü ════════'
\echo 'Beklenen: 0 satır'
SELECT hashed_pin, COUNT(DISTINCT user_id) AS dupe_users
FROM factory_staff_pins
WHERE is_active = true
GROUP BY hashed_pin
HAVING COUNT(DISTINCT user_id) > 1;

\echo ''
\echo '════════ E2: Pilot 4 lokasyon aktif PIN sayıları (özet) ════════'
SELECT b.id, b.name, COUNT(DISTINCT bsp.user_id) AS aktif_pin
FROM branches b
LEFT JOIN branch_staff_pins bsp ON bsp.branch_id = b.id AND bsp.is_active = true
WHERE b.id IN (5, 8, 23, 24)
GROUP BY b.id, b.name
ORDER BY b.id;

\echo ''
\echo '════════ E3: factory_ingredient_nutrition UNIQUE constraint ════════'
\echo 'Beklenen: 1 satır (constraint mevcut)'
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'factory_ingredient_nutrition'::regclass
  AND conname = 'factory_ingredient_nutrition_name_unique';

\echo ''
\echo '════════ E4: factory_ingredient_nutrition kayıt sayısı ════════'
\echo 'Beklenen: total >= 111 (15-alerjen seed sonrası)'
SELECT COUNT(*) AS total_ingredients,
       COUNT(verified_by) AS sema_verified,
       COUNT(*) FILTER (WHERE confidence = 0) AS template_pending
FROM factory_ingredient_nutrition;

\echo ''
\echo '════════ E5: agent_routing_rules aktif kural sayısı ════════'
\echo 'Beklenen: >= 15 aktif kural (18-routing seed sonrası)'
SELECT primary_role, COUNT(*) AS rule_count
FROM agent_routing_rules
WHERE is_active = true
GROUP BY primary_role
ORDER BY primary_role;

\echo ''
\echo '════════ DOĞRULAMA TAMAMLANDI ════════'
\echo 'Her E1/E1b sıfır satır → PIN reseed başarılı'
\echo 'E3 → constraint var → 15-alerjen idempotent'
\echo 'E4 total >= 111, E5 >= 9 rol → seed çıktıları doğru'
