# Sprint C — Akademi v1/v2/v3 Kod Analizi

**Tarih:** 18 Nisan 2026 (Cumartesi öğleden sonra)
**Hazırlayan:** Claude (IT Danışman)
**Durum:** Kod tarafı analiz tamam — DB doğrulaması Replit'te olacak

---

## 🎯 Amaç

Raporumda "Akademi v1/v2/v3 paralel, konsolide et" demiştim. Sprint C'nin içeriğini belirlemek için önce **gerçek durumu** anlamalıyım.

---

## 🔍 Kod Analizi Sonuçları

### Route Dosyaları (Toplam 4)

| Dosya | Boyut | Satır | Endpoint | Prefix |
|-------|:--:|:--:|:--:|:--|
| `academy.ts` (v1) | 105 KB | 2,875 | **77** | Hiçbiri (global) |
| `academy-v2.ts` | 83 KB | 2,260 | **45** | Hiçbiri (global) |
| `academy-v3.ts` | 29 KB | 850 | **14** | `/api/v3/academy` |
| `training-program-routes.ts` | 12 KB | 273 | **0** | (handler export, direkt endpoint yok) |

**TOPLAM:** 136 unique endpoint, 6,258 satır kod

### ❗ Kritik Bulgu: **ÇAKIŞMA YOK**

**Beklentim:** v1/v2/v3 aynı URL'leri farklı implementasyonlarla tanımlıyor  
**Gerçek:** **0 çakışma** — her endpoint tek bir dosyada

v1, v2, v3 **aynı modülün versiyonları DEĞİL**. Farklı özellik setleri:

### v1 (academy.ts) — "Klasik Akademi Modülü"

**77 endpoint, 48'i frontend'de kullanılıyor** (20 kullanılmayan)

**Kapsam:**
- Modüller ve reçeteler (8 + 6 endpoint)
- Quiz sistemi (3+3+2 endpoint — quiz, quizzes, quiz-stats)
- Sınav talepleri (exam-request × 3)
- Analytics (branch-analytics, cohort-analytics, advanced-analytics)
- Gamification (badges, leaderboard, daily-missions, team-competitions)
- AI (ai-generate-quiz, ai-generate-program, adaptive-recommendations)
- Career (career-levels, career-progress)

**Özetle:** "Her şeyin reçetesi" modülü — eğitim içeriği + ölçme + oyunlaştırma

### v2 (academy-v2.ts) — "Onboarding + Gate Kariyer Sistemi"

**45 endpoint, 19'u frontend'de kullanılıyor** (16 kullanılmayan — dormant/gelecek)

**Kapsam:**
- **Onboarding (18 endpoint)** — 14 günlük Stajyer programı + şablonlar
- **Gates (7 endpoint)** — Gate-0, Gate-1, Gate-2, Gate-3 sınav sistemi
- **Gate-Attempts (3 endpoint)** — sınav denemeleri
- **My-Path (4 endpoint)** — kişisel kariyer yolu görünümü
- **Content Packs (6+1 endpoint)** — eğitim paketleri
- **AI Logs + AI Panel (2+1)** — AI asistan panel
- **Team Progress + KPI Signals** — takım ilerlemesi

**Özetle:** "Aslan'ın hibrit terfi modeli" için yazılmış modül (Sprint C/D aktif edilecek)

### v3 (academy-v3.ts) — "Akademi Ana Sayfa + Webinar"

**14 endpoint, 6'sı frontend'de kullanılıyor** (6 kullanılmayan — webinar yönetim)

**Kapsam:**
- `/home-data` — Akademi ana sayfa agregasyonu
- `/modules` — Modül listesi (frontend ana kullanım noktası)
- `/category-counts` — Kategori sayımı
- **Webinar (11 endpoint)** — Canlı ders sistemi
  - webinar oluştur/güncelle/iptal
  - katılımcı yönetimi
  - attendance takibi
  - seed-webinars (dev/test için)

**Özetle:** UI agregasyon + webinar modülü (yeni özellik)

### training-program-routes.ts — "Handler Export"

**0 router endpoint** — direkt handler functions export ediyor, `/api/training-programs/*` pattern. Muhtemelen v1 veya v2 tarafından `router.use` ile mount ediliyor.

---

## 🎯 Gerçek Durum Değerlendirmesi

### Önceki "Akademi Konsolidasyonu" İddiası YANLIŞTI

**Raporumda:** "v1/v2/v3 paralel, karışık, konsolide edilmeli"  
**Gerçek:** Birbirini tamamlayan 3 modül — her biri **farklı amaç için**

Hiçbirini silmek mümkün değil çünkü:
- v1 silinirse → klasik akademi modülleri+quiz+reçete hepsi gider (48 kullanılan endpoint)
- v2 silinirse → **hibrit terfi modeli (gate sistemi) gider** (Aslan'ın pilot sonrası aktif edeceği sistem)
- v3 silinirse → akademi ana sayfa boş kalır + webinar sistemi gider

### Ama 3 GERÇEK sorun var

**Sorun 1: Dosyalar çok büyük**
- `academy.ts` 2,875 satır, `academy-v2.ts` 2,260 satır
- Refactor/bakım zor, IDE yavaşlıyor
- **Çözüm:** Domain bazlı dosya bölünmesi (Sprint F işi)

**Sorun 2: 42 kullanılmayan endpoint**
- v1'de 20, v2'de 16, v3'te 6
- Toplam **42 ölü endpoint** (Sprint A5 deneyimi: frontend kullanımı olmayan stub'lar)
- **Ama:** v2'dekiler gate sistemi (pilot sonrası aktif), silinemezler

**Sorun 3: v2'nin gate sistemi boşta (DB'de 0 attempt)**
- Kod hazır, tablolar hazır, frontend kısmen hazır
- Pilot'ta aktif edilmesi lazım
- Bu konsolidasyon DEĞİL, **aktivasyon işi**

---

## 🎯 Sprint C — Gerçek Kapsam (Revize)

### Önceki Plan:
> "Akademi v1/v2/v3 → v3, CRM tablolarını düzgün oluştur"

### Revize Plan:

**Sprint C.1: Akademi Temizlik (3 gün)**
- ❌ v1/v2/v3 birleştir → YANLIŞ iş
- ✅ v1'deki 20 kullanılmayan endpoint'i analiz et, frontend kullanımı olmayan ve dormant olmayanları sil (Sprint A5 deneyimi)
- ✅ v2 gate sistemini aktif et (Aslan'ın pilot planı — hibrit terfi)
- ✅ v3 webinar sistemini aktif et (frontend bağlantıları tamamla)
- ✅ Büyük dosyaları domain'lere böl (**öncelik: academy.ts 2,875 → 5-6 dosya**)

**Sprint C.2: CRM Modülü (2 gün)**
- ❌ "crm_* tablolarını düzgün oluştur" → araştırılmalı
- ✅ Frontend `/crm` sayfasının backend'ini incele
- ✅ Hangi tablolar gerçekten kullanılıyor (support_tickets, guest_complaints, customer_feedback?)
- ✅ **İsim standardizasyonu** — crm_* prefix ekle veya açıkça başka modül olduğunu belirt
- ✅ Frontend route'ları gerçek endpoint'lere yönlendir

**Sprint C.3: Audit v1/v2 Konsolidasyonu (1 gün)**
- ✅ `audit_templates` (v1) vs `audit_templates_v2` — hangisi kullanılıyor?
- ✅ v2'ye tam geçiş (v1 deprecated)

---

## 📋 Replit'ten İstenecek DB Doğrulaması

Sprint C için de Sprint B gibi DB kontrolü lazım:

```sql
-- 1. Akademi tablolarında kayıt sayısı (gerçek kullanım)
SELECT 'training_modules' as tbl, COUNT(*) FROM training_modules
UNION ALL SELECT 'user_training_progress', COUNT(*) FROM user_training_progress
UNION ALL SELECT 'quizzes', COUNT(*) FROM quizzes
UNION ALL SELECT 'quiz_results', COUNT(*) FROM quiz_results
UNION ALL SELECT 'user_quiz_attempts', COUNT(*) FROM user_quiz_attempts
UNION ALL SELECT 'career_levels', COUNT(*) FROM career_levels
UNION ALL SELECT 'user_career_progress', COUNT(*) FROM user_career_progress
UNION ALL SELECT 'career_gates', COUNT(*) FROM career_gates
UNION ALL SELECT 'gate_attempts', COUNT(*) FROM gate_attempts
UNION ALL SELECT 'exam_requests', COUNT(*) FROM exam_requests
UNION ALL SELECT 'webinars', COUNT(*) FROM webinars
UNION ALL SELECT 'webinar_registrations', COUNT(*) FROM webinar_registrations
UNION ALL SELECT 'employee_onboarding', COUNT(*) FROM employee_onboarding
UNION ALL SELECT 'onboarding_templates', COUNT(*) FROM onboarding_templates
UNION ALL SELECT 'content_packs', COUNT(*) FROM content_packs  -- varsa
UNION ALL SELECT 'academy_hub_categories', COUNT(*) FROM academy_hub_categories;

-- 2. CRM tablolarını ara (crm_ prefix)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'crm_%';

-- 3. CRM'e benzer tablolar (ticket, complaint, customer)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%ticket%' OR table_name LIKE '%complaint%' OR table_name LIKE '%customer%')
ORDER BY table_name;

-- 4. Audit v1 vs v2 kullanım karşılaştırma
SELECT 'audit_templates (v1)' as tbl, COUNT(*) FROM audit_templates
UNION ALL SELECT 'audit_templates_v2', COUNT(*) FROM audit_templates_v2
UNION ALL SELECT 'audits (v1)', COUNT(*) FROM audits
UNION ALL SELECT 'audits_v2', COUNT(*) FROM audits_v2
UNION ALL SELECT 'audit_actions (v1)', COUNT(*) FROM audit_actions
UNION ALL SELECT 'audit_actions_v2', COUNT(*) FROM audit_actions_v2;
```

---

## 📦 Son Söz

**Sprint A'da ders aldık:** Kod analizi + DB doğrulaması birlikte yapılmalı. Tek başına "3 dosya var, birleştir" yanlış sonuç verir.

Bu analiz gösterdi ki **3 akademi dosyası doğru tasarım** — birbirini tamamlıyor. Sorun **boyut + aktivasyon**, konsolidasyon değil.

Sprint C'nin **gerçek işi** DB doğrulamasından sonra netleşecek.
