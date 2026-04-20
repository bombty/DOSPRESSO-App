-- ═══════════════════════════════════════════════════════════════════
-- DOSPRESSO Pilot — Görev Şablonları Seed
-- Tarih: 21 Nis 2026 (Pilot 28 Nis öncesi)
-- Onay: Aslan + Claude
-- 
-- 63 şablon: 47 günlük + 7 haftalık + 10 aylık + 5 acil + 6 fabrika özel
-- Hepsi global (branch_id=NULL) → tüm aktif şubelerde görünür
-- Fabrika özel görevleri sadece Fabrika (branch_id=24) için
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Önce admin user_id'sini bul (createdByUserId için gerekli)
DO $$
DECLARE
  admin_id varchar;
BEGIN
  SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin kullanıcısı bulunamadı. Seed durduruldu.';
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- KATEGORİLER (gerekirse oluştur)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_task_categories (key, label, icon, color, sort_order, is_active)
  VALUES
    ('temizlik', 'Temizlik', 'sparkles', '#3b82f6', 1, true),
    ('bakim', 'Bakım', 'wrench', '#f59e0b', 2, true),
    ('stok', 'Stok & Sayım', 'package', '#10b981', 3, true),
    ('genel', 'Genel', 'check', '#6b7280', 4, true)
  ON CONFLICT (key) DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════
  -- 🌅 GÜNLÜK AÇILIŞ (10 görev) — Pazartesi-Pazar her gün
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Mağaza ışıklarını aç', 'Tüm aydınlatmaları aç ve kontrol et', 'genel', NULL, 'daily', admin_id, 'admin', false, true),
    ('Espresso makinesini ısıt ve kalibre et', 'Makineyi çalıştır, basınç ve sıcaklık kontrolü yap', 'bakim', NULL, 'daily', admin_id, 'admin', false, true),
    ('Kahve çekirdek stoğunu kontrol et', 'Hopper dolu mu, eksik varsa takviye et', 'stok', NULL, 'daily', admin_id, 'admin', false, true),
    ('Süt ve yan ürün stoklarını kontrol et', 'Buzdolabında yeterli süt, krema, alternatif sütler var mı', 'stok', NULL, 'daily', admin_id, 'admin', false, true),
    ('Kasa açılışını yap', 'Kasayı aç, bozuk para sayımı, açılış raporu', 'genel', NULL, 'daily', admin_id, 'admin', false, true),
    ('Müşteri alanını sil ve hazırla', 'Masa, sandalye, zemin ön kontrol', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Vitrin ürünlerini yerleştir', 'Donut/pasta ürünlerini düzgün şekilde dizin', 'genel', NULL, 'daily', admin_id, 'admin', true, true),
    ('Bardak ve malzeme stoklarını kontrol et', 'Tek kullanımlık bardak, kapak, peçete, karıştırıcı', 'stok', NULL, 'daily', admin_id, 'admin', false, true),
    ('POS sistemini başlat ve test et', 'Tablet açık, internet bağlı, test satış yap', 'genel', NULL, 'daily', admin_id, 'admin', false, true),
    ('Müzik sistemini aç', 'Playlist ayarla, ses seviyesi uygun mu', 'genel', NULL, 'daily', admin_id, 'admin', false, true);

  -- ═══════════════════════════════════════════════════════════════
  -- ☀️ GÜN İÇİ (9 görev) — Her gün 1-2 kere yapılır
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Tezgah ve bar üstü temizliği', 'Lekeli yerleri sil, dağınıklığı topla', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Müşteri masalarını sil', 'Boş masaları sil, sandalyeleri düzelt', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Çöp kontrol ve boşaltma', 'Müşteri ve mutfak çöplerini kontrol et', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Tuvalet kontrolü', 'Temizlik, kağıt havlu, sabun, koku kontrolü', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Vitrin düzenleme + ürün takviyesi', 'Vitrindeki ürünleri kontrol et, eksikleri tamamla', 'genel', NULL, 'daily', admin_id, 'admin', false, true),
    ('Espresso makinesi temizlik', 'Her 50 shot sonrası grup head fırçalama', 'bakim', NULL, 'daily', admin_id, 'admin', false, true),
    ('Süt sürahileri yıkama', 'Kullanılmış sürahileri yıka ve kurut', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Şeker, peçete, karıştırıcı stok takviyesi', 'Müşteri istasyonu malzemeleri', 'stok', NULL, 'daily', admin_id, 'admin', false, true),
    ('Buzdolabı ısı kontrolü', 'Buzdolabı sıcaklığı 4°C altında mı', 'bakim', NULL, 'daily', admin_id, 'admin', false, true);

  -- ═══════════════════════════════════════════════════════════════
  -- 🌙 GÜNLÜK KAPANIŞ (12 görev)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Espresso makinesi derin temizlik (backflush)', 'Kimyasal ile backflush işlemi', 'bakim', NULL, 'daily', admin_id, 'admin', true, true),
    ('Süt sürahileri detaylı temizlik', 'İçi dışı detaylı temizlik', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Tüm tezgahları sil ve dezenfekte et', 'Hijyen ürünü ile tüm yüzeyler', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Vitrin temizliği', 'İç ve dış cam temizliği', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Yer sil ve sıyır', 'Müşteri alanı ve mutfak zemini', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Çöpleri çıkar', 'Organik ve geri dönüşüm ayrı ayrı', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Tuvalet son temizlik', 'Detaylı dezenfeksiyon', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Bulaşıkları yıka ve yerleştir', 'Tüm kullanılmış malzemeler', 'temizlik', NULL, 'daily', admin_id, 'admin', false, true),
    ('Kasa kapanışı + Z raporu', 'Sayım, fark kontrolü, Z raporu al', 'genel', NULL, 'daily', admin_id, 'admin', true, true),
    ('Buzdolabı son kontrol', 'Kapı kapalı mı, ısı normal mi', 'bakim', NULL, 'daily', admin_id, 'admin', false, true),
    ('Tüm ekipmanları kapat', 'Makine, ışık, müzik, POS', 'genel', NULL, 'daily', admin_id, 'admin', false, true),
    ('Alarm kur ve kapıyı kilitle', 'Güvenlik prosedürü', 'genel', NULL, 'daily', admin_id, 'admin', false, true);

  -- ═══════════════════════════════════════════════════════════════
  -- 📅 HAFTALIK (7 görev) — day_of_week: 1=Pzt, 2=Salı, ... 7=Pzr
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, day_of_week, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Espresso makinesi grup head kimyasal temizlik', 'Cafiza veya benzeri kimyasal ile derin temizlik', 'bakim', NULL, 'weekly', 1, admin_id, 'admin', true, true),
    ('Buzdolabı içi detaylı temizlik', 'Tüm rafları çıkart, içini detaylı temizle', 'temizlik', NULL, 'weekly', 2, admin_id, 'admin', true, true),
    ('Vitrin camı + ayna kireç çözücü ile silme', 'Cam temizleyici ve mikrofiber bez', 'temizlik', NULL, 'weekly', 3, admin_id, 'admin', false, true),
    ('Haftalık stok sayımı', 'Kahve, süt, şurup, bardak detaylı sayım', 'stok', NULL, 'weekly', 4, admin_id, 'admin', true, true),
    ('Müşteri WC derin temizlik', 'Detaylı dezenfeksiyon, fayans, lavabo, ayna', 'temizlik', NULL, 'weekly', 5, admin_id, 'admin', true, true),
    ('Mutfak/back-of-house derin temizlik', 'Tüm depo, raflar, gizli köşeler', 'temizlik', NULL, 'weekly', 6, admin_id, 'admin', true, true),
    ('Filtreler + öğütücü temizlik', 'Su filtresi, kahve öğütücü iç temizlik', 'bakim', NULL, 'weekly', 7, admin_id, 'admin', false, true);

  -- ═══════════════════════════════════════════════════════════════
  -- 🗓️ AYLIK (10 görev) — day_of_month: ayın 1'i
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, day_of_month, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Aylık tam envanter sayımı', 'Tüm ürünler, raporlama, fire kontrolü', 'stok', NULL, 'monthly', 1, admin_id, 'admin', true, true),
    ('Ekipman bakım kontrolü', 'Makine, blender, ısıtıcı, buzdolabı genel kontrol', 'bakim', NULL, 'monthly', 5, admin_id, 'admin', true, true),
    ('Yangın söndürücü kontrolü', 'Tarih, basınç, etiketleme kontrolü', 'bakim', NULL, 'monthly', 10, admin_id, 'admin', true, true),
    ('İlk yardım dolabı kontrol', 'Eksikleri tamamla, son kullanım tarihleri', 'bakim', NULL, 'monthly', 10, admin_id, 'admin', false, true),
    ('Buzdolabı/dondurucu motor temizlik', 'Arka tarafı temizle, motor toz alma', 'bakim', NULL, 'monthly', 15, admin_id, 'admin', true, true),
    ('Aydınlatma ampul kontrol/değişim', 'Yanmış lambaları değiştir', 'bakim', NULL, 'monthly', 15, admin_id, 'admin', false, true),
    ('Mobilya ve dekor genel kontrol', 'Kırık sandalye, eksik dekor, yıpranma', 'bakim', NULL, 'monthly', 20, admin_id, 'admin', false, true),
    ('Mutfak hood/aspiratör temizlik', 'Yağ filtresi sökme, derin temizlik', 'temizlik', NULL, 'monthly', 25, admin_id, 'admin', true, true),
    ('Su filtresi değişimi', 'Espresso makinesi su filtresini değiştir', 'bakim', NULL, 'monthly', 25, admin_id, 'admin', true, true),
    ('Personel uniforma kontrol', 'Eksik veya yıpranmış uniforma envanteri', 'genel', NULL, 'monthly', 28, admin_id, 'admin', false, true);

  -- ═══════════════════════════════════════════════════════════════
  -- 🍩 FABRIKA ÖZEL (6 görev) — Sadece Fabrika (branch_id=24)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO branch_recurring_tasks 
    (title, description, category, branch_id, recurrence_type, created_by_user_id, created_by_role, photo_required, is_active)
  VALUES
    ('Üretim hattı pre-shift temizlik', 'Hat çalıştırılmadan önce sterilizasyon', 'temizlik', 24, 'daily', admin_id, 'admin', true, true),
    ('Hammadde sıcaklık kontrol', 'Un, süt, krema sıcaklık ölçümü', 'bakim', 24, 'daily', admin_id, 'admin', true, true),
    ('Üretim raporu yazma', 'Vardiya sonu üretim miktarı + fire kaydı', 'genel', 24, 'daily', admin_id, 'admin', false, true),
    ('Atık ayrıştırma', 'Organik / geri dönüşüm / tehlikeli atık', 'temizlik', 24, 'daily', admin_id, 'admin', false, true),
    ('Soğuk hava deposu sıcaklık log', 'Saatlik sıcaklık kaydı (HACCP)', 'bakim', 24, 'daily', admin_id, 'admin', true, true),
    ('Ürün dağıtım hazırlık', 'Şubelere göre paketleme + etiketleme', 'genel', 24, 'daily', admin_id, 'admin', true, true);

  RAISE NOTICE 'Görev şablonları başarıyla yüklendi (63 şablon)';
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- DOĞRULAMA SORGULARI (seed sonrası kontrol)
-- ═══════════════════════════════════════════════════════════════════

-- Toplam aktif şablon sayısı
SELECT 
  recurrence_type, 
  COUNT(*) as adet,
  COUNT(*) FILTER (WHERE photo_required = true) as fotograf_zorunlu
FROM branch_recurring_tasks 
WHERE is_active = true 
GROUP BY recurrence_type 
ORDER BY recurrence_type;

-- Kategori dağılımı
SELECT 
  category, 
  COUNT(*) as adet
FROM branch_recurring_tasks 
WHERE is_active = true 
GROUP BY category
ORDER BY adet DESC;

-- Fabrika özel
SELECT title, recurrence_type 
FROM branch_recurring_tasks 
WHERE branch_id = 24 AND is_active = true 
ORDER BY id;
