# DOSPRESSO — Eğitim ve Akademi Sistemi
**Eğitim modülleri, quiz, sertifika, rozet, onboarding, profesyonel gelişim**

---

## Eğitim Yapısı
```
Akademi Hub (kategoriler)
├── Eğitim Modülleri (training_modules)
│   ├── Eğitim Materyalleri (video, PDF, metin)
│   ├── Quiz'ler (modül sonu test)
│   └── Tamamlama + Sertifika
├── Profesyonel Eğitim (professional_training)
│   ├── Dersler (lessons)
│   └── İlerleme takibi
├── Gıda Güvenliği Eğitimi (food_safety_trainings)
└── Onboarding (yeni personel)
    ├── Şablonlar + adımlar
    ├── Haftalık program
    └── Check-in'ler
```

## DB Tabloları
```
Eğitim:
  training_modules         — eğitim modülleri (başlık, kategori, süre, zorunluluk)
  training_materials       — materyaller (video URL, PDF, metin)
  training_assignments     — eğitim atamaları (kime, ne zaman)
  training_completions     — tamamlama kayıtları
  user_training_progress   — bireysel ilerleme

Quiz:
  quizzes                  — quiz tanımları
  quiz_questions           — sorular (çoktan seçmeli, doğru/yanlış)
  quiz_results             — sonuçlar
  user_quiz_attempts       — deneme geçmişi
  module_quizzes           — modül-quiz bağlantısı

Sertifika & Rozet:
  badges                   — rozet tanımları (koşullar, ikon)
  user_badges              — kazanılan rozetler
  certificate_settings     — sertifika ayarları
  certificate_design_settings — tasarım ayarları
  issued_certificates      — verilen sertifikalar

Onboarding:
  onboarding_templates     — şablonlar
  onboarding_template_steps — adımlar
  onboarding_instances     — aktif onboarding süreçleri
  onboarding_programs      — programlar
  onboarding_weeks         — haftalık plan
  onboarding_checkins      — check-in'ler
  onboarding_documents     — belgeler
  employee_onboarding      — personel onboarding
  employee_onboarding_tasks — görevler
  employee_onboarding_assignments — atamalar
  employee_onboarding_progress — ilerleme

Profesyonel:
  professional_training_lessons  — dersler
  professional_training_progress — ilerleme
```

## Skor Etkisi
- Eğitim tamamlama → composite score'un bir boyutu
- Quiz sonuçları → personel gelişim skoru
- Denetimde düşük skor → ilgili eğitim modülü önerilir (Dobody WF-4)
- Sertifika süresi dolma → yenileme eğitimi tetiklenir

## Rozet Sistemi
```
Eğitim tamamla → rozet kazan
Quiz'den yüksek puan → özel rozet
Ardışık 30 gün devam → rozet
Denetimde 90+ skor → rozet
```

## Dosya Konumları
```
shared/schema/schema-03.ts, 05, 06, 10 — eğitim tabloları
server/routes/academy-v3.ts — Akademi API
client/src/pages/akademi.tsx — Akademi ana sayfa
client/src/pages/egitim-modul.tsx — Modül detay
```
