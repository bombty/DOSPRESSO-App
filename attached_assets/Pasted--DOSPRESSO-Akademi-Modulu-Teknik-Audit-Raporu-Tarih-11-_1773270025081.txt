# DOSPRESSO Akademi Modulu - Teknik Audit Raporu

**Tarih:** 11 Mart 2026  
**Hazırlayan:** DOSPRESSO Geliştirme Ekibi  
**Konu:** Akademi (LMS) Modülü Mevcut Durum Analizi ve Yeniden Yapılandırma Önerisi

---

## 1. YÖNETİCİ ÖZETİ

DOSPRESSO Akademi modülü, franchıse personelinin eğitim, kariyer gelişimi ve sertifikasyon süreçlerini yöneten kapsamlı bir Öğrenme Yönetim Sistemi (LMS) olarak tasarlanmıştır. Mevcut durumda zengin bir altyapıya sahip olmakla birlikte, organik büyüme nedeniyle **yapısal dağınıklık**, **navigasyon karmaşıklığı** ve **eksik modüller** (webinar takvimi, zorunlu/isteğe bağlı ayrımı) konularında iyileştirme ihtiyacı bulunmaktadır.

### Hedef
Tüm eğitim, onboarding, webinar ve kariyer gelişimi süreçlerini tek bir **"Akademi"** çatısı altında birleştirmek. Personelin karşılaşacağı temiz, modern ve kategorilendirilmiş bir öğrenme deneyimi sunmak.

---

## 2. MEVCUT YAPI - SAYISAL ÖZET

| Metrik | Değer |
|--------|-------|
| Toplam Veritabanı Tablosu (Akademi İlgili) | 60 tablo |
| Toplam Frontend Sayfası (Akademi İlgili) | 42 dosya |
| Toplam Frontend Kod Boyutu (Akademi) | ~968 KB |
| Backend API Endpoint Sayısı | 77 endpoint |
| Frontend Route Sayısı | 43 route |
| Backend Route Dosyası | 2.846 satır (server/routes/academy.ts) |
| Mega Modül Dosyası | 630 satır (akademi-mega.tsx) |
| En Büyük Dosya | module-detail.tsx (115 KB) |
| Sistemdeki Toplam DB Tablosu | 351 tablo |
| Sistemdeki Toplam Kullanıcı | 245 kişi (22 şube) |

---

## 3. VERİTABANI MİMARİSİ

### 3.1 Eğitim İçerik Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `training_modules` | 51 modül | Ana eğitim modülleri |
| `module_lessons` | 4 ders | Modül içi dersler |
| `module_videos` | 0 video | Video içerikler (boş) |
| `module_media` | - | Medya ekleri |
| `training_materials` | - | Genel eğitim materyalleri |
| `professional_training_lessons` | - | Mesleki eğitim dersleri |
| `food_safety_trainings` | 6 kayıt | Gıda güvenliği eğitimleri |

### 3.2 Değerlendirme Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `quizzes` | 1 quiz | Quiz tanımları |
| `quiz_questions` | 205 soru | Quiz soruları |
| `module_quizzes` | - | Modül-quiz eşleştirmesi |
| `quiz_results` | - | Quiz sonuçları |
| `user_quiz_attempts` | - | Kullanıcı quiz denemeleri |
| `flashcards` | - | Öğrenme kartları |
| `exam_requests` | 0 kayıt | Sınav talepleri |

### 3.3 İlerleme ve Takip Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `user_training_progress` | 27 kayıt | Modül ilerleme takibi |
| `training_assignments` | 15 atama | Eğitim atamaları |
| `training_completions` | 0 tamamlama | Tamamlanan eğitimler |
| `learning_streaks` | 7 seri | Öğrenme serileri |

### 3.4 Kariyer Sistemi Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `career_levels` | 5 seviye | Kariyer seviyeleri |
| `user_career_progress` | 6 kayıt | Kullanıcı kariyer ilerlemesi |
| `career_score_history` | - | Kariyer puan geçmişi |
| `career_gates` | - | Kariyer kapıları (gate sistemi) |
| `gate_attempts` | - | Gate deneme kayıtları |

**Kariyer Seviyeleri:**
1. Stajyer → 2. Bar Buddy → 3. Barista → 4. Supervisor Buddy → 5. Supervisor

### 3.5 Gamification Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `badges` | 12 rozet | Başarı rozetleri |
| `user_badges` | 2 kazanım | Kullanıcı rozetleri |
| `daily_missions` | 5 görev | Günlük görevler |
| `user_mission_progress` | - | Görev ilerlemesi |
| `leaderboard_snapshots` | 0 snapshot | Sıralama verileri |

### 3.6 Onboarding Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `employee_onboarding` | 2 kayıt | Çalışan onboarding kayıtları |
| `employee_onboarding_tasks` | - | Onboarding görevleri |
| `onboarding_templates` | 1 şablon | Onboarding şablonları |
| `onboarding_template_steps` | - | Şablon adımları |
| `employee_onboarding_assignments` | - | Onboarding atamaları |
| `employee_onboarding_progress` | - | Onboarding ilerlemesi |
| `onboarding_programs` | 2 program | Haftalık onboarding programları |
| `onboarding_weeks` | - | Program haftalık planları |
| `onboarding_instances` | - | Program örnekleri |
| `onboarding_checkins` | - | Mentor check-in kayıtları |
| `franchise_onboarding` | - | Franchise onboarding |
| `onboarding_documents` | - | Onboarding belgeleri |

### 3.7 Reçete Tabloları
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `recipes` | 145 reçete | Ürün reçeteleri |
| `recipe_categories` | 10 kategori | Reçete kategorileri |
| `recipe_versions` | - | Reçete versiyonları |
| `recipe_notifications` | - | Reçete bildirimleri |
| `recipe_ingredients` | - | Reçete malzemeleri |

### 3.8 Kategorizasyon
| Tablo Adı | Mevcut Kayıt | Açıklama |
|-----------|-------------|----------|
| `academy_hub_categories` | 4 kategori | Akademi ana kategorileri |

**Mevcut Akademi Kategorileri:**
1. Kariyer Yolculuğum (career)
2. Reçete Akademisi (recipes)
3. Genel Eğitimler (general)
4. Sürekli Pratik (practice)

**Eğitim Modüllerinin Kategori Dağılımı (training_modules.category):**
| Kategori | Modül Sayısı |
|----------|-------------|
| barista | 7 |
| supervisor | 6 |
| bar buddy | 6 |
| stajyer | 6 |
| supervisor buddy | 5 |
| barista_basics | 3 |
| (kategorisiz) | 4 |
| mesleki_gelisim | 2 |
| management, soft-skills, hygiene, acil_durum, uretim_hijyen, gida_guvenligi, is_guvenligi, depo, onboarding, ekipman_kullanim, customer_service | 1'er |

**Sorun:** Kategorizasyon tutarsız — hem Türkçe hem İngilizce, hem snake_case hem boşluklu isimler kullanılmış. 21 farklı kategori değeri mevcut.

---

## 4. FRONTEND MİMARİSİ

### 4.1 Akademi Mega Modül Yapısı (akademi-mega.tsx)
Mevcut tab yapısı role göre filtreleniyor:

**Personel (Barista/Stajyer) Göreceği Tablar:**
| Grup | Tab İçeriği |
|------|------------|
| Kariyer Yolu | Benim Yolum |
| Eğitimlerim | Modüllerim, Keşfet, Bilgi Bankası |
| Başarılarım | Rozetlerim, Sertifikalarım, Sıralama, Başarılarım, Seri Takibi |

**Supervisor Ek Tabları:**
| Grup | Tab İçeriği |
|------|------------|
| Ekip Takibi | Ekip Takibi, Onboarding Onayları |

**Coach/HQ Ek Tabları:**
| Grup | Tab İçeriği |
|------|------------|
| Yönetim | Gate Yönetimi, KPI Sinyalleri |
| İçerik & Atama | İçerik Kütüphanesi, Onboarding Studio, İçerik Yönetimi |
| Takip & Analitik | Takım İlerlemesi, Analitik & Raporlar, İlerleme Özeti, Kohort Analitik, Şube Analitik |

**Ortak Tablar:**
| Grup | Tab İçeriği |
|------|------------|
| AI Kanıt | AI Kanıt |
| Gelişmiş | Öğrenme Yolları, Uyarlanabilir Motor, Takım Yarışmaları, Sosyal Gruplar |

### 4.2 Tüm Akademi Frontend Sayfaları (42 dosya)

| Dosya | Boyut | Açıklama |
|-------|-------|----------|
| module-detail.tsx | 115 KB | Modül detay sayfası |
| academy-hq.tsx | 109 KB | HQ yönetim paneli |
| academy-module-editor.tsx | 92 KB | Modül düzenleyici |
| receteler.tsx | 88 KB | Reçete listesi |
| academy-quiz.tsx | 39 KB | Quiz sayfası |
| academy-my-path.tsx | 34 KB | Kariyer yolum |
| personel-onboarding.tsx | 34 KB | Personel onboarding (DIŞARIDA) |
| coach-onboarding-studio.tsx | 34 KB | Onboarding studio |
| recete-detay.tsx | 29 KB | Reçete detayı |
| academy-ai-panel.tsx | 27 KB | AI paneli |
| onboarding-programlar.tsx | 23 KB | Onboarding programları (DIŞARIDA) |
| coach-sube-denetim.tsx | 21 KB | Şube denetim |
| egitim-programi.tsx | 19 KB | Eğitim programı |
| academy-content-management.tsx | 18 KB | İçerik yönetimi |
| academy.tsx | 17 KB | Ana akademi sayfası |
| academy-explore.tsx | 14 KB | Keşfet |
| academy-supervisor.tsx | 14 KB | Supervisor paneli |
| supervisor-onboarding.tsx | 13 KB | Supervisor onboarding |
| academy-cohort-analytics.tsx | 13 KB | Kohort analitik |
| coach-team-progress.tsx | 12 KB | Takım ilerlemesi |
| academy-team-competitions.tsx | 12 KB | Takım yarışmaları |
| academy-certificates.tsx | 12 KB | Sertifikalar |
| academy-learning-path-detail.tsx | 10 KB | Öğrenme yolu detayı |
| academy-analytics.tsx | 10 KB | Analitik |
| academy-branch-analytics.tsx | 10 KB | Şube analitik |
| academy-leaderboard.tsx | 10 KB | Sıralama |
| academy-streak-tracker.tsx | 10 KB | Seri takibi |
| academy-badges.tsx | 9 KB | Rozetler |
| academy-suite.tsx | 8 KB | Suite (eski) |
| academy-achievements.tsx | 8 KB | Başarılar |
| academy-ai-assistant.tsx | 7 KB | AI asistanı |
| academy-learning-paths.tsx | 7 KB | Öğrenme yolları |
| academy-adaptive-engine.tsx | 7 KB | Uyarlanabilir motor |
| academy-progress-overview.tsx | 6 KB | İlerleme özeti |
| coach-content-library.tsx | 6 KB | İçerik kütüphanesi |
| academy-advanced-analytics.tsx | 6 KB | Gelişmiş analitik |
| coach-gate-management.tsx | 5 KB | Gate yönetimi |
| coach-kpi-signals.tsx | 5 KB | KPI sinyalleri |
| academy-social-groups.tsx | 4 KB | Sosyal gruplar |
| modul.tsx | 18 KB | Modül genel sayfası |
| akademi-mega.tsx | 21 KB | Ana mega modül |
| yonetim/akademi.tsx | - | Yönetim akademi |

### 4.3 Navigasyon Akışı
```
Sidebar "Akademi" tıklanır
  → /egitim URL'ine yönlendirilir
    → App.tsx'de /egitim → /akademi-hq redirect'i yapılır (client-side)
      → Mega modül /akademi/*? altında çalışır
```

**Sorun:** Redirect zinciri karmaşık. `/egitim` → `/akademi-hq` hard redirect var.

---

## 5. BACKEND API ENDPOINTLERİ

### server/routes/academy.ts (2.846 satır, 77 endpoint)

**Temel Endpointler:**
- `GET /api/academy/modules` — Modül listesi
- `GET /api/academy/module-content/:materialId` — Modül içeriği
- `POST /api/academy/quiz-result` — Quiz sonucu kaydetme
- `GET /api/academy/learning-paths` — Öğrenme yolları

**Kariyer & Sınav:**
- `GET /api/academy/career-levels` — Kariyer seviyeleri
- `GET /api/academy/career-progress/:userId` — Kullanıcı kariyer ilerlemesi
- `POST /api/academy/exam-request` — Sınav talebi oluşturma
- `POST /api/academy/exam-request/:id/approve` — Sınav onaylama
- `POST /api/academy/exam-request/:id/reject` — Sınav reddetme

**Gamification:**
- `GET /api/academy/badges` — Rozetler
- `GET /api/academy/user-badges` — Kullanıcı rozetleri
- `GET /api/academy/streak-tracker/:userId` — Seri takibi
- `GET /api/academy/leaderboard` — Sıralama

**Analitik:**
- `GET /api/academy/stats` — Genel istatistikler
- `GET /api/academy/branch-analytics` — Şube analitik
- `GET /api/academy/cohort-analytics` — Kohort analitik

**AI Entegrasyonu:**
- `POST /api/academy/ai-generate-onboarding` — AI onboarding planı oluşturma
- `POST /api/academy/ai-generate-program` — AI eğitim programı oluşturma
- `POST /api/academy/ai-assistant` — AI sohbet asistanı
- `POST /api/academy/ai-generate-quiz/:moduleId` — AI quiz oluşturma

**Reçeteler:**
- `GET /api/academy/recipes` — Reçete listesi
- `GET /api/academy/recipe-categories` — Reçete kategorileri

---

## 6. ROL BAZLI ERİŞİM MATRİSİ

| Özellik | Stajyer | Bar Buddy | Barista | Supervisor | Coach | Admin |
|---------|---------|-----------|---------|------------|-------|-------|
| Modüllerim | + | + | + | + | + | + |
| Benim Yolum (Kariyer) | + | + | + | + | + | + |
| Rozetler/Sertifikalar | + | + | + | + | + | + |
| Sıralama/Seri | + | + | + | + | + | + |
| Keşfet | + | + | + | + | + | + |
| Bilgi Bankası | + | + | + | + | + | + |
| Ekip Takibi | - | - | - | + | + | + |
| Onboarding Onayları | - | - | - | + | + | + |
| Gate Yönetimi | - | - | - | - | + | + |
| İçerik Kütüphanesi | - | - | - | - | + | + |
| Onboarding Studio | - | - | - | - | + | + |
| İçerik Yönetimi | - | - | - | - | + | + |
| Analitik & Raporlar | - | - | - | - | + | + |
| AI Paneli | + | + | + | + | + | + |

---

## 7. TESPİT EDİLEN SORUNLAR VE EKSİKLİKLER

### 7.1 Kritik Eksiklikler

| # | Sorun | Öncelik | Açıklama |
|---|-------|---------|----------|
| 1 | **Webinar sistemi yok** | YÜKSEK | HQ tarafından düzenlenen canlı etkinlik/webinar takvimi bulunmuyor. Yeni ürün tanıtımı, sistem eğitimi gibi canlı etkinlikler planlanamıyor. |
| 2 | **Zorunlu/İsteğe bağlı ayrımı yok** | YÜKSEK | Eğitim modüllerinde "zorunlu" ve "isteğe bağlı" ayrımı yapılmıyor. Personel hangi eğitimleri mutlaka tamamlaması gerektiğini bilemiyor. |
| 3 | **Dağınık onboarding** | YÜKSEK | 4 farklı onboarding sayfası var, 2'si akademi içinde, 2'si dışarıda bağımsız route'larda. Birleştirilmeli. |
| 4 | **Karmaşık navigasyon** | ORTA | `/egitim` → `/akademi-hq` redirect zinciri. Mega modül 25+ tab içeriyor. Personel için bunaltıcı. |

### 7.2 Yapısal Sorunlar

| # | Sorun | Etki |
|---|-------|------|
| 5 | **Tutarsız kategorizasyon** | 21 farklı kategori değeri, karışık dil (TR/EN), tutarsız naming convention |
| 6 | **Büyük dosya boyutları** | module-detail.tsx (115 KB), academy-hq.tsx (109 KB) — bakım zorluğu |
| 7 | **Video içerik boş** | module_videos tablosu tamamen boş |
| 8 | **Tamamlama verisi 0** | training_completions tablosu boş — eğitim tamamlama akışı çalışmıyor olabilir |
| 9 | **Leaderboard boş** | leaderboard_snapshots tablosu boş — gamification snapshot'ı alınmıyor |
| 10 | **Exam request boş** | Sınav talebi sistemi hiç kullanılmamış |

### 7.3 UX/UI Sorunları

| # | Sorun | Açıklama |
|---|-------|----------|
| 11 | **Temiz landing page yok** | Personel akademiye girdiğinde doğrudan karmaşık tab yapısıyla karşılaşıyor |
| 12 | **Mobil uyumsuzluk** | 25+ tab mobil ekranda kullanılabilir değil |
| 13 | **İlerleme görselleştirmesi yetersiz** | Kariyer yolculuğu kartları var ama genel ilerleme dashboard'u eksik |
| 14 | **Etkinlik takvimi yok** | Eğitim etkinlikleri için takvim görünümü bulunmuyor |

---

## 8. ÖNERİLEN YENİDEN YAPILANDIRMA PLANI

### Faz 1: Akademi Ana Sayfa (Öncelik: YÜKSEK)
**Hedef:** Personel tıkladığında temiz, modern bir karşılama sayfası

- Kişiselleştirilmiş hoş geldin ekranı (kullanıcı adı, kariyer seviyesi, ilerleme yüzdesi)
- Zorunlu eğitimler kartı (kalan modül sayısı, deadline)
- Günün önerisi / devam eden modül
- Kategori kartları (görsel, ikonlu)
- Haftalık/aylık ilerleme grafiği
- Hızlı erişim butonları (Reçeteler, Bilgi Bankası, Sınavlar)

**Tahmini Efor:** L (3-5 gün)

### Faz 2: Webinar Takvimi Modülü (Öncelik: YÜKSEK)
**Hedef:** HQ tarafından canlı etkinlik planlaması ve personel tarafından takvim görünümü

- Yeni `webinars` veritabanı tablosu (başlık, açıklama, tarih, süre, hedef roller, link, kayıt durumu)
- HQ webinar oluşturma/düzenleme arayüzü
- Personel takvim görünümü (aylık/haftalık)
- Role göre hedefleme (örn: sadece baristalar için, tüm personel için)
- Bildirim entegrasyonu (yaklaşan webinar hatırlatması)
- Katılım takibi

**Tahmini Efor:** L (3-5 gün)

### Faz 3: Eğitim Kategorizasyonu ve Zorunlu/İsteğe Bağlı Ayrımı (Öncelik: YÜKSEK)
**Hedef:** Modüllerin düzgün kategorilenmesi ve zorunluluk sistemi

- `training_modules` tablosuna `is_mandatory` boolean alanı eklenmesi
- Kategori standardizasyonu (21 tutarsız değer → 8-10 temiz kategori)
- Zorunlu eğitimler için deadline sistemi
- Role göre zorunlu eğitim ataması
- İsteğe bağlı modüller için "Keşfet" deneyimi

**Tahmini Efor:** M (2-3 gün)

### Faz 4: Onboarding Birleştirme (Öncelik: ORTA)
**Hedef:** Dağınık onboarding sayfalarının akademi çatısı altına taşınması

- `/personel-onboarding` → Akademi mega modül altına taşınma
- `/onboarding-programlar` → Akademi mega modül altına taşınma
- Redirect'lerin güncellenmesi
- Sidebar menü düzenlemesi

**Tahmini Efor:** M (2-3 gün)

### Faz 5: Navigasyon Sadeleştirme (Öncelik: ORTA)
**Hedef:** 25+ tab → 6-8 ana bölüm

Önerilen yeni yapı:
1. **Ana Sayfa** — İlerleme, öneriler, zorunlu eğitimler
2. **Eğitimler** — Zorunlu + isteğe bağlı modüller (kategorili)
3. **Webinarlar** — Canlı etkinlik takvimi
4. **Onboarding** — Yeni personel eğitim programları
5. **Başarılarım** — Rozetler, sertifikalar, sıralama
6. **Kariyer Yolum** — Seviye ilerlemesi, gate sistemi
7. **(HQ) Yönetim** — İçerik oluşturma, atama, analitik

**Tahmini Efor:** L (3-5 gün)

---

## 9. TEKNOLOJİ ALTYAPISI

### Mevcut Kullanılan Teknolojiler
| Katman | Teknoloji | Versiyon |
|--------|-----------|---------|
| Frontend | React + TypeScript | 18.x |
| Build Tool | Vite | 5.x |
| State Management | TanStack Query | v5 |
| Routing | Wouter | - |
| UI Kit | Shadcn/ui (Radix UI) | - |
| Styling | Tailwind CSS | 3.x |
| Backend | Node.js + Express | - |
| ORM | Drizzle ORM | - |
| Database | PostgreSQL (Neon) | 16 |
| AI | OpenAI API (GPT-4o-mini) | - |
| i18n | i18next | - |
| Auth | Replit Auth + Local Auth | - |

### AI Entegrasyon Detayları
- **Onboarding Plan Oluşturma:** GPT-4o-mini ile otomatik onboarding planı
- **Quiz Oluşturma:** Modül içeriğinden otomatik quiz sorusu üretimi
- **Sohbet Asistanı:** RAG tabanlı bilgi bankası sorgulama
- **İçerik Özetleme:** Modül özetleri ve öneriler

---

## 10. VERİ DURUMU DEĞERLENDİRMESİ

### Aktif Kullanılan Tablolar
| Tablo | Durum | Yorum |
|-------|-------|-------|
| training_modules (51) | AKTIF | Yeterli içerik var |
| quiz_questions (205) | AKTIF | İyi soru havuzu |
| recipes (145) | AKTIF | Zengin reçete kütüphanesi |
| badges (12) | AKTIF | Rozet sistemi hazır |
| career_levels (5) | AKTIF | Kariyer yapısı tanımlı |
| training_assignments (15) | AKTIF | Bazı atamalar yapılmış |
| user_training_progress (27) | AKTIF | Kullanıcı ilerlemesi var |

### Boş veya Kullanılmayan Tablolar
| Tablo | Durum | Yorum |
|-------|-------|-------|
| module_videos (0) | BOŞ | Video içerik yüklenmemiş |
| training_completions (0) | BOŞ | Tamamlama kaydı yok |
| exam_requests (0) | BOŞ | Sınav sistemi kullanılmamış |
| leaderboard_snapshots (0) | BOŞ | Sıralama snapshot'ı yok |
| user_badges (2) | MİNİMAL | Çok az rozet kazanılmış |

---

## 11. RİSKLER VE DİKKAT EDİLMESİ GEREKENLER

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Dosya boyutları | ORTA | 100KB+ dosyalar bakım ve performans riski |
| Radix UI paket çakışması | YÜKSEK | Geçmişte 3 kez `dispatcher.useState` crash'i yaşandı. Paket güncellemelerinde dikkat gerekli |
| Veri tutarsızlığı | ORTA | Kategori değerlerinde TR/EN karışımı, naming convention tutarsızlığı |
| Migration riski | DÜŞÜK | Schema değişiklikleri `drizzle-kit push` ile yapılıyor, interactive prompt sorunu var |
| Performans | ORTA | 42 lazy-loaded sayfa, 77 API endpoint — bundle size kontrolü gerekli |

---

## 12. SONUÇ VE TAVSİYELER

### Kısa Vadeli (1-2 Sprint)
1. Akademi ana sayfa yeniden tasarımı (temiz landing page)
2. Webinar takvimi modülünün oluşturulması
3. Zorunlu/isteğe bağlı eğitim ayrımı

### Orta Vadeli (3-4 Sprint)
4. Onboarding sayfalarının akademi altına taşınması
5. Navigasyon sadeleştirme (25+ tab → 6-8 bölüm)
6. Kategori standardizasyonu
7. Video içerik altyapısının aktifleştirilmesi

### Uzun Vadeli
8. Mobil uygulama için API optimizasyonu
9. Offline öğrenme desteği (Service Worker)
10. Gelişmiş analitik dashboard'lar
11. AI destekli kişiselleştirilmiş öğrenme yolları

---

**Not:** Bu rapor, DOSPRESSO Akademi modülünün 11 Mart 2026 tarihindeki durumunu yansıtmaktadır. Mevcut altyapı son derece zengindir (60 tablo, 77 API, 42 sayfa). Temel ihtiyaç yeni altyapı oluşturmak değil, mevcut yapıyı **kullanıcı deneyimi odaklı** yeniden organize etmek ve eksik modülleri (webinar, zorunlu eğitim ayrımı) eklemektir.
