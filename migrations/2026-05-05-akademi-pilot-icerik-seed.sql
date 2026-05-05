-- ═══════════════════════════════════════════════════════════════════
-- Sprint 17 (5 May 2026) - Akademi Pilot İçerik Başlangıç Seed
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Aslan'ın talebi: Replit raporu PILOT RİSK #3
--   "Akademi içerik 0 — 11 tablo boş, pilot personeli eğitim göremez"
-- 
-- KÖK NEDEN:
--   training_modules, module_lessons, module_videos, module_quizzes
--   ve ilgili 7 tablo BOŞ. Akademi V3 sayfası açılır ama içerik yok.
-- 
-- ÇÖZÜM:
--   Pilot 4 lokasyon için MİNİMUM başlangıç eğitim içeriği:
--   - Hijyen ve Gıda Güvenliği (TÜM personel - zorunlu)
--   - Barista Temel Eğitim (barista + bar_buddy)
--   - Müşteri Hizmetleri Temel (tüm şube personeli)
--   - Süpervizör Yönetim Temelleri (supervisor + supervisor_buddy)
--   - DOSPRESSO Marka Kültürü (tüm personel - oryantasyon)
--   - Fabrika Üretim Güvenliği (fabrika personel)
-- 
-- ÖNEMLİ NOT:
--   Bu seed PLACEHOLDER içerik. Pilot süresince Coach (Coach rolü) detaylı
--   içerik girer. Buradaki amaç: Akademi sayfasının BOŞ görünmemesi,
--   pilot personelinin "eğitim alıyorum" deneyimi yaşaması.
-- 
-- Coach yapacak (pilot 12 May - 15 Haz arası):
--   - Quiz soruları gerçek içerikle güncelle
--   - Video URL'leri ekle (YouTube/S3)
--   - Adım adım talimatları detaylandır
--   - Görsel içerik ekle (heroImage, gallery)
-- 
-- VERIFY:
--   SELECT COUNT(*) FROM training_modules WHERE is_published=true;
--   Beklenen: 6 modül
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- ADIM 0: BASELINE
-- ───────────────────────────────────────────────────────────────────

SELECT 
  (SELECT COUNT(*) FROM training_modules) AS modules_total,
  (SELECT COUNT(*) FROM training_modules WHERE is_published = true) AS modules_published,
  (SELECT COUNT(*) FROM module_lessons) AS lessons_total,
  (SELECT COUNT(*) FROM module_videos) AS videos_total,
  (SELECT COUNT(*) FROM module_quizzes) AS quizzes_total;
-- Beklenen öncesi: 0, 0, 0, 0, 0

-- ───────────────────────────────────────────────────────────────────
-- ADIM 1: 6 Pilot Modül (training_modules)
-- ───────────────────────────────────────────────────────────────────

INSERT INTO training_modules (
  title, description, code, slug, category, module_type, scope, level,
  estimated_duration, is_published, is_required, required_for_role,
  learning_objectives, xp_reward, exam_passing_score, max_retries, is_active,
  steps, quiz, tags, ai_summary,
  created_at, updated_at
) VALUES
  -- Modül 1: Hijyen ve Gıda Güvenliği (HERKES - zorunlu)
  (
    'Hijyen ve Gıda Güvenliği',
    'DOSPRESSO çalışan hijyen kuralları, kişisel temizlik, gıda güvenliği TGK 2017/2284 uyumu',
    'HG1',
    'hijyen-gida-guvenligi',
    'hygiene',
    'skill',
    'both',
    'beginner',
    45,
    true,  -- yayında
    true,  -- zorunlu
    ARRAY['barista', 'bar_buddy', 'supervisor', 'supervisor_buddy', 'manager', 'fabrika_personel', 'fabrika_operator', 'sef'],
    '["El yıkama 6 adım protokolü", "Gıda saklama sıcaklık kontrolü", "Çapraz kontaminasyon önleme", "Personel kıyafet ve takı kuralları", "TGK 2017/2284 etiket okuma"]'::jsonb,
    100,  -- xp
    80,   -- geçer not %80
    3,    -- max 3 deneme
    true,
    '[
      {"stepNumber": 1, "title": "Kişisel Hijyen", "content": "DOSPRESSO''da çalışırken her gün temiz iş kıyafeti, takı yasağı (alyans hariç), saç bonesi, sakal/bıyık kontrolü zorunludur."},
      {"stepNumber": 2, "title": "El Yıkama Protokolü", "content": "İşe başlarken, tuvaletten sonra, ham et/sebze sonrası, telefon kullanımından sonra MUTLAKA el yıkama. Sıcak su + sabun + 20 saniye + tek kullanımlık havlu."},
      {"stepNumber": 3, "title": "Gıda Saklama", "content": "Soğuk zincir kurallar: 0-4°C buzdolabı, -18°C ve altı dondurucu. Termometre günlük kontrol. Etiket: ad+tarih+saat zorunlu."},
      {"stepNumber": 4, "title": "Çapraz Kontaminasyon", "content": "Ham ürünler ile pişmiş ürünler ASLA aynı tezgahta. Renkli kesim tahtası: kırmızı=et, yeşil=sebze, mavi=balık, beyaz=hamur işleri."},
      {"stepNumber": 5, "title": "Alerjen Yönetimi", "content": "Süt, yumurta, fındık, gluten alerjisi olan müşteriler için ÖZEL eldiven + temizlenmiş yüzey. TGK etiket okuma zorunlu."}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "El yıkama kaç saniye sürmelidir?", "options": ["5 saniye", "10 saniye", "20 saniye", "30 saniye"], "correctOptionIndex": 2},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "Buzdolabı sıcaklığı ne olmalıdır?", "options": ["0-4°C", "5-10°C", "10-15°C", "15-20°C"], "correctOptionIndex": 0},
      {"questionId": "q3", "questionType": "multiple_choice", "questionText": "Hangi kesim tahtası eti için kullanılır?", "options": ["Mavi", "Yeşil", "Kırmızı", "Beyaz"], "correctOptionIndex": 2},
      {"questionId": "q4", "questionType": "multiple_choice", "questionText": "TGK 2017/2284 hangi konuyu düzenler?", "options": ["Trafik", "Gıda etiketi", "Bina yangın", "İK"], "correctOptionIndex": 1}
    ]'::jsonb,
    ARRAY['hijyen', 'temel', 'zorunlu', 'TGK'],
    'Bu modül DOSPRESSO''da çalışan herkes için ZORUNLUDUR. Hijyen kuralları, gıda güvenliği ve TGK uyumu temel konuları kapsar. Sertifika için %80 sınav geçer notu gereklidir.',
    NOW(), NOW()
  ),
  
  -- Modül 2: Barista Temel Eğitim
  (
    'Barista Temel Eğitim',
    'Espresso temelleri, süt buharlama, kahve çekirdeği bilgisi, DOSPRESSO içecek menüsü',
    'BR1',
    'barista-temel',
    'barista',
    'skill',
    'branch',
    'beginner',
    90,
    true,
    true,
    ARRAY['barista', 'bar_buddy', 'stajyer'],
    '["Espresso ekstrasyon temelleri", "Süt buharlama tekniği", "Latte art temel desenler", "DOSPRESSO menü ezberi", "Müşteri sipariş alma"]'::jsonb,
    150,
    75,
    3,
    true,
    '[
      {"stepNumber": 1, "title": "Espresso Temelleri", "content": "9 bar basınç + 90-94°C su + 25-30 saniye ekstrasyon = mükemmel espresso. Crema rengi açık kahverengi olmalı. 18-20gr kahve, 36-40ml shot."},
      {"stepNumber": 2, "title": "Süt Buharlama", "content": "Soğuk süt + temiz pitcher + 60-65°C hedef sıcaklık. Köpük dokusu ipek gibi olmalı, büyük kabarcık yok. Latte için ince köpük, capuccino için kalın köpük."},
      {"stepNumber": 3, "title": "DOSPRESSO Menü", "content": "Bombty Latte (ev karışımı), Karamel Macchiato, Türk Kahvesi (geleneksel), 5 Donut çeşidi. Her ürünün hikayesi ve hedef müşteri kitlesi var."},
      {"stepNumber": 4, "title": "Müşteri Sipariş Alma", "content": "Göz teması + gülümseme + DOSPRESSO selamı. ''Hoş geldiniz, ben Barista [İsim]. Bugün size nasıl yardımcı olabilirim?'' Upselling: ''Yanına donut almak ister misiniz?''"}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "Espresso ekstrasyon süresi ne olmalı?", "options": ["10-15 sn", "15-20 sn", "25-30 sn", "40-45 sn"], "correctOptionIndex": 2},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "Süt buharlama hedef sıcaklık?", "options": ["40-45°C", "60-65°C", "80-85°C", "95-100°C"], "correctOptionIndex": 1},
      {"questionId": "q3", "questionType": "multiple_choice", "questionText": "Bir shot espresso kaç ml?", "options": ["10-15 ml", "18-22 ml", "36-40 ml", "60-75 ml"], "correctOptionIndex": 2}
    ]'::jsonb,
    ARRAY['barista', 'kahve', 'espresso', 'temel'],
    'Yeni başlayan barista personeli için kapsamlı temel eğitim. Espresso çekme, süt buharlama, menü bilgisi ve müşteri etkileşimi temel becerilerini öğretir.',
    NOW(), NOW()
  ),
  
  -- Modül 3: Müşteri Hizmetleri Temel
  (
    'Müşteri Hizmetleri Temel',
    'DOSPRESSO standardında müşteri karşılama, şikayet yönetimi, upselling, kasiyer kuralları',
    'CS1',
    'musteri-hizmetleri-temel',
    'service',
    'skill',
    'branch',
    'beginner',
    60,
    true,
    true,
    ARRAY['barista', 'bar_buddy', 'supervisor', 'supervisor_buddy', 'kasiyer', 'stajyer'],
    '["DOSPRESSO selamlaşma protokolü", "Şikayet karşısında 5 adım LAST (Listen-Acknowledge-Solve-Thank)", "Upselling teknikleri", "Müşteri tipolojileri ve yaklaşım"]'::jsonb,
    100,
    75,
    3,
    true,
    '[
      {"stepNumber": 1, "title": "Karşılama", "content": "Müşteri içeri girdiği anda göz teması + gülümseme + ''DOSPRESSO''ya hoş geldiniz!''. 30 saniye içinde mutlaka selamlama yapılmalı."},
      {"stepNumber": 2, "title": "Sipariş Alma", "content": "Açık uçlu sorularla başla: ''Bugün canınız ne çekiyor?'' Tavsiye iste: ''Bombty Latte deneyebilirsiniz, ev karışımı kahve.'' Her zaman bir donut/yan ürün öner."},
      {"stepNumber": 3, "title": "Şikayet Yönetimi (LAST)", "content": "L-Listen: Sözünü kesme, dinle. A-Acknowledge: ''Bu yaşadığınız için üzgünüm.'' S-Solve: Çözüm öner (yenisini yap, para iade et). T-Thank: ''Geri bildiriminiz için teşekkürler.''"},
      {"stepNumber": 4, "title": "Müşteri Tipleri", "content": "Aceleci: hızlı servis, az konuşma. Sosyal: sohbet, isim hatırlama. Kararsız: tavsiye ver. Düzenli: standart sipariş hatırla."}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "Müşteri girince kaç saniye içinde selamlanmalı?", "options": ["10 saniye", "30 saniye", "60 saniye", "fark etmez"], "correctOptionIndex": 1},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "LAST''taki ''S'' neyi temsil eder?", "options": ["Smile", "Solve", "Stop", "Sell"], "correctOptionIndex": 1}
    ]'::jsonb,
    ARRAY['müşteri', 'servis', 'temel', 'şikayet'],
    'DOSPRESSO standardında müşteri hizmetleri eğitimi. Karşılama, sipariş alma, şikayet yönetimi (LAST yöntemi) ve upselling teknikleri.',
    NOW(), NOW()
  ),
  
  -- Modül 4: Süpervizör Yönetim Temelleri
  (
    'Süpervizör Yönetim Temelleri',
    'Vardiya yönetimi, takım liderliği, performans takibi, çatışma çözümü, açılış-kapanış protokolleri',
    'SP1',
    'supervisor-yonetim-temel',
    'supervisor',
    'skill',
    'branch',
    'intermediate',
    120,
    true,
    true,
    ARRAY['supervisor', 'supervisor_buddy', 'manager'],
    '["Vardiya planlama", "Takım motivasyon", "Performans değerlendirme", "Açılış-kapanış checklist", "PDKS sorumlulukları"]'::jsonb,
    200,
    80,
    2,
    true,
    '[
      {"stepNumber": 1, "title": "Vardiya Açılış", "content": "30 dk önce gel, kasiyeri sorgula, malzeme stok kontrolü, gece kapanış raporu oku, açılış checklist (15 madde) tamamla, takım brifingi yap."},
      {"stepNumber": 2, "title": "Takım Yönetimi", "content": "Her vardiyada en az 1 olumlu geri bildirim ver. Performansı düşük olanı kenarda konuş, takım önünde eleştirme. Hedefler net ve ölçülebilir olsun."},
      {"stepNumber": 3, "title": "Çatışma Çözümü", "content": "Sorunu kişisel almama: ''Davranış vs kişilik'' ayrımı. Her iki tarafı dinle, ortak çözüm bul. Üst yönetime sadece çözülemeyenleri taşı."},
      {"stepNumber": 4, "title": "Vardiya Kapanış", "content": "Kasiyer sayım + günlük rapor + temizlik checklist (20 madde) + ekipman kapama + güvenlik kontrolü + ertesi gün için not."}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "Vardiya açılış kaç dakika önce başlar?", "options": ["15 dk", "30 dk", "45 dk", "60 dk"], "correctOptionIndex": 1},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "Olumsuz geri bildirim nerede verilir?", "options": ["Takım önünde", "Kenarda özel", "Whatsapp''ta", "Hiç verilmez"], "correctOptionIndex": 1}
    ]'::jsonb,
    ARRAY['supervisor', 'yönetim', 'liderlik'],
    'DOSPRESSO süpervizör pozisyonu için temel yönetim becerileri. Vardiya yönetimi, takım liderliği, çatışma çözümü ve operasyonel sorumluluklar.',
    NOW(), NOW()
  ),
  
  -- Modül 5: DOSPRESSO Marka Kültürü
  (
    'DOSPRESSO Marka Kültürü',
    'Marka hikayesi, vizyon-misyon, değerler, hedef müşteri kitlesi, franchise standartları',
    'DK1',
    'marka-kultur',
    'orientation',
    'general',
    'both',
    'beginner',
    30,
    true,
    true,
    ARRAY['barista', 'bar_buddy', 'supervisor', 'supervisor_buddy', 'manager', 'fabrika_personel', 'sef', 'kasiyer', 'stajyer'],
    '["DOSPRESSO marka hikayesi", "5 temel değer", "Hedef müşteri kitlesi", "Türk kahvesi geleneği + modern espresso felsefesi"]'::jsonb,
    50,
    70,
    3,
    true,
    '[
      {"stepNumber": 1, "title": "Marka Hikayesi", "content": "DOSPRESSO 2024''te Antalya''da kuruldu. Türk kahvesi geleneğini modern espresso ve donut kültürüyle harmanlayan, ev karışımı (Bombty Latte) ile özgün bir marka."},
      {"stepNumber": 2, "title": "5 Temel Değer", "content": "1) Misafir önce: müşteri her zaman özel hisseder. 2) Kalite ödün yok: malzemede en iyi. 3) Ekip ailedir: çalışan refahı önemli. 4) Sürekli öğrenme: her gün gelişme. 5) Toplum sorumluluğu: çevre ve toplum bilinci."},
      {"stepNumber": 3, "title": "Hedef Müşteri", "content": "25-45 yaş, üniversite mezunu, gelir orta-üst, kalite kahve ve özgün lezzet arayanlar. Sosyal medyada aktif, instagrammable mekan seven."},
      {"stepNumber": 4, "title": "Franchise Standartları", "content": "Tüm DOSPRESSO şubelerinde: aynı menü, aynı standart, aynı reçeteler, aynı eğitim. Bunu sağlamak HER personelin görevi."}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "DOSPRESSO''nun ev karışımı kahve adı?", "options": ["Türk Latte", "Bombty Latte", "Antalya Latte", "Crystal Latte"], "correctOptionIndex": 1},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "DOSPRESSO temel değer kaç tane?", "options": ["3", "5", "7", "10"], "correctOptionIndex": 1}
    ]'::jsonb,
    ARRAY['marka', 'kültür', 'oryantasyon'],
    'DOSPRESSO''ya yeni katılan herkes için zorunlu marka oryantasyon eğitimi. Marka hikayesi, değerler, hedef kitle ve franchise standartları.',
    NOW(), NOW()
  ),
  
  -- Modül 6: Fabrika Üretim Güvenliği
  (
    'Fabrika Üretim Güvenliği',
    'DOSPRESSO fabrika çalışanları için iş güvenliği, makine kullanımı, üretim hattı protokolleri',
    'FB1',
    'fabrika-uretim-guvenligi',
    'factory_safety',
    'skill',
    'factory',
    'beginner',
    75,
    true,
    true,
    ARRAY['fabrika_personel', 'fabrika_operator', 'sef', 'fabrika_mudur', 'fabrika_sorumlu'],
    '["KKD kullanımı (Kişisel Koruyucu Donanım)", "Makine güvenliği", "Yangın ve acil durum", "Kavurma/donut hattı protokolleri", "Lot izleme ve etiketleme"]'::jsonb,
    150,
    85,
    2,
    true,
    '[
      {"stepNumber": 1, "title": "KKD - Kişisel Koruyucu Donanım", "content": "Üretim alanında ZORUNLU: bone, eldiven, beyaz önlük, kapalı ayakkabı, gerektiğinde kulak tıkacı (kavurma alanı). Takı yasağı, kokulu krem yasağı."},
      {"stepNumber": 2, "title": "Makine Güvenliği", "content": "Hiçbir makineyi BAŞKASI ÇALIŞIYORSA açma. Kavurma fırını + pişirme tepsisi + hamur karıştırıcı + dondurucu için ayrı yetki belgesi gereklidir. Acil stop butonu nerede her zaman bil."},
      {"stepNumber": 3, "title": "Yangın ve Acil Durum", "content": "Yangın söndürücü konumları + kaçış güzergahı + toplanma noktası ezbere bil. Acil durumda ÖNCE makineyi kapat, SONRA kaç. Yangın sırasında asansör KULLANMA."},
      {"stepNumber": 4, "title": "Lot İzleme", "content": "Her ürünün lot numarası: tarih + saat + hat + parti. Etikette MUTLAKA: ad + lot + üretim tarihi + son kullanma + alerjen + TGK uyumu."}
    ]'::jsonb,
    '[
      {"questionId": "q1", "questionType": "multiple_choice", "questionText": "Üretim alanında zorunlu KKD nedir?", "options": ["Sadece eldiven", "Bone+eldiven+önlük+ayakkabı", "Sadece bone", "Hiçbiri"], "correctOptionIndex": 1},
      {"questionId": "q2", "questionType": "multiple_choice", "questionText": "Yangında ilk yapılacak?", "options": ["Hemen kaç", "Makineyi kapat", "Bağır", "Su dök"], "correctOptionIndex": 1}
    ]'::jsonb,
    ARRAY['fabrika', 'güvenlik', 'kkd', 'üretim'],
    'DOSPRESSO fabrika personeli için zorunlu güvenlik eğitimi. KKD kullanımı, makine güvenliği, yangın protokolleri ve lot izleme sistemleri.',
    NOW(), NOW()
  );

-- ───────────────────────────────────────────────────────────────────
-- ADIM 2: Doğrulama
-- ───────────────────────────────────────────────────────────────────

SELECT 
  id, code, title, category, level,
  estimated_duration AS dakika,
  exam_passing_score AS gecer_not,
  jsonb_array_length(steps) AS adim_sayisi,
  jsonb_array_length(quiz) AS soru_sayisi,
  cardinality(required_for_role) AS rol_sayisi
FROM training_modules
WHERE is_published = true
ORDER BY id;

-- Beklenen: 6 modül (HG1, BR1, CS1, SP1, DK1, FB1)

-- ───────────────────────────────────────────────────────────────────
-- ADIM 3: Toplam istatistik
-- ───────────────────────────────────────────────────────────────────

SELECT 
  COUNT(*) AS toplam_modul,
  COUNT(*) FILTER (WHERE is_published = true) AS yayinda,
  COUNT(*) FILTER (WHERE is_required = true) AS zorunlu,
  SUM(estimated_duration) AS toplam_dakika,
  SUM(xp_reward) AS toplam_xp_imkani
FROM training_modules;

-- Beklenen: 6 / 6 / 6 / 420 dk (7 saat) / 750 XP

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION ACTIONS:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- 1. ✅ Akademi sayfası (/akademi) artık 6 modül göstermeli
-- 2. ⏳ Coach (rol: coach) içerik genişletme:
--      - Quiz sorularını 4'er → 10'ar artır
--      - Adım açıklamalarını detaylandır
--      - Video URL'leri ekle (YouTube/S3 hostlanmış)
--      - heroImageUrl + galleryImages
--      - presentationGuide + marketingContent doldurmak
-- 3. ⏳ Pilot personel atamaları:
--      - INSERT INTO training_assignments: 35 personele 1-3 zorunlu modül
--      - HG1 + DK1: HERKES (35 kişi)
--      - BR1: barista/bar_buddy/stajyer (~12 kişi)
--      - CS1: tüm şube personeli (~30 kişi)
--      - SP1: supervisor/supervisor_buddy (~5 kişi)
--      - FB1: fabrika personeli (~10 kişi)
-- 
-- ROLLBACK:
--   DELETE FROM training_modules WHERE code IN ('HG1','BR1','CS1','SP1','DK1','FB1');
-- 
-- ═══════════════════════════════════════════════════════════════════
