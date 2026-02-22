# DOSPRESSO Academy V2 - Tanımlar & Yapısal Kurallar

> Source of Truth: Bu dosya Academy V2 sisteminin temel tanımlarını içerir.
> Son güncelleme: 2026-02-22

---

## 1. Onboarding vs Training

### Onboarding (Kritik Oryantasyon)
- **Süre:** Gün 1 – Gün 14 (sabit, uzatılamaz)
- **Hedef:** Yeni personelin "denetim altında vardiyada çalışabilir" seviyesine gelmesi
- **Yönetici:** Şube Supervisor'ı veya atanmış Mentor (Bar Buddy/Barista)
- **Çıkış kriteri:** Gate-0 sınavını geçmek
- **İçerik:** Günlük zorunlu adımlar (quiz + pratik checklist + gözlem)
- **Başarısızlık:** Gate-0'ı geçemezse → 7 gün ek süre → tekrar Gate-0 → geçemezse Coach bildirilir

### Training (Rol Bazlı Yetkinlik Gelişimi)
- **Başlangıç:** Gate-0 sonrası (onboarding tamamlandığında)
- **Süre:** Süresiz, kariyer seviyeleri boyunca devam eder
- **Hedef:** Mevcut rol yetkinliklerini geliştirmek + bir üst seviyeye terfi hazırlığı
- **Yönetici:** Coach (içerik tasarımı) + Trainer (içerik düzenleme) + Supervisor (pratik onay)
- **İçerik:** Rol bazlı modüller + quizler + pratik değerlendirmeler + KPI sinyallerine bağlı öneriler

### Fark Tablosu

| Özellik | Onboarding | Training |
|---------|-----------|----------|
| Süre | 14 gün sabit | Süresiz |
| Zorunluluk | Tamamı zorunlu | Zorunlu + isteğe bağlı |
| İçerik kaynağı | Sabit paket (Coach ayarlar) | Rol bazlı + KPI önerisi |
| Değerlendirme | Gate-0 | Gate-1 ~ Gate-4 |
| Kim yönetir | Mentor + Supervisor | Coach + Trainer |
| Başarısızlık | Ek süre + Coach bildirimi | Modül tekrar + uyarı |

---

## 2. Kariyer Seviyeleri (Career Levels)

Mevcut `career_levels` tablosu 5 seviye tanımlar:

| Seviye | roleId | levelNumber | Açıklama | Gate |
|--------|--------|-------------|----------|------|
| **Stajyer** | stajyer | 1 | Yeni başlayan, onboarding sürecinde | Gate-0 → Bar Buddy |
| **Bar Buddy** | bar_buddy | 2 | Denetim altında çalışabilir, temel beceriler | Gate-1 → Barista |
| **Barista** | barista | 3 | Bağımsız çalışabilir, tüm içecekler | Gate-2 → Supervisor Buddy |
| **Supervisor Buddy** | supervisor_buddy | 4 | Yönetim becerilerine hazırlık | Gate-3 → Supervisor |
| **Supervisor** | supervisor | 5 | Vardiya yönetimi, personel denetimi | Gate-4 → Müdür adaylığı |

### Seviye Geçiş Kuralı
Bir üst seviyeye geçmek için:
1. Mevcut seviyenin tüm **zorunlu modüllerini** tamamlamış olmak (`requiredModuleIds`)
2. İlgili **Gate sınavını** geçmek (`successRateThreshold`, varsayılan %80)
3. **Supervisor/Coach pratik onayı** almak
4. **Minimum süre** şartını karşılamak (seviyeye göre değişir)

---

## 3. Gate Sistemi (Seviye Kapıları)

Gate = Bir kariyer seviyesinden diğerine geçişi kontrol eden değerlendirme noktası.

### Gate-0: Onboarding Çıkışı (Stajyer → Bar Buddy)
- **Tetiklenme:** Gün 14 sonunda otomatik veya Supervisor talebiyle
- **Bileşenler:**
  - Bilgi quizi: 20 soru, minimum %80 doğru (HACCP, hijyen, temel bar bilgisi)
  - Pratik checklist: Supervisor tarafından 10 maddelik gözlem listesi onayı
  - Devam kaydı: 14 günde minimum %90 katılım (en fazla 1 devamsızlık)
- **Sonuç:** Pass → Bar Buddy'ye terfi | Fail → 7 gün ek süre + tekrar

### Gate-1: Bar Buddy → Barista
- **Tetiklenme:** Supervisor talebi + Coach onayı
- **Minimum süre:** Bar Buddy olarak en az 30 gün
- **Bileşenler:**
  - Bilgi quizi: 30 soru, minimum %80 (içecek reçeteleri, POS, müşteri hizmeti)
  - Pratik değerlendirme: 5 farklı içeceği hatasız hazırlama (Trainer gözlemi)
  - KPI kontrolü: Son 30 günde fire/zayi oranı < %5
  - Devam: %95 katılım
- **Sonuç:** Pass → Barista'ya terfi | Fail → 2 hafta bekleme + tekrar

### Gate-2: Barista → Supervisor Buddy
- **Tetiklenme:** Supervisor talebi + Coach onayı
- **Minimum süre:** Barista olarak en az 90 gün
- **Bileşenler:**
  - Bilgi quizi: 40 soru, minimum %85 (liderlik, stok yönetimi, vardiya planlama)
  - Pratik değerlendirme: 1 hafta asistan vardiya yönetimi (Supervisor gözlemi)
  - KPI kontrolü: Son 90 günde performans skoru > 75
  - Manager değerlendirmesi: Müdür/Supervisor notu >= 4/5

### Gate-3: Supervisor Buddy → Supervisor
- **Tetiklenme:** Coach talebi + CGO onayı
- **Minimum süre:** Supervisor Buddy olarak en az 60 gün
- **Bileşenler:**
  - Kapsamlı sınav: 50 soru, minimum %85
  - 2 haftalık bağımsız vardiya yönetimi (Coach gözlemi)
  - KPI kontrolü: Yönettiği vardiyada fire < %3, müşteri şikayeti < 2
  - Panel değerlendirme: Coach + Trainer + Müdür ortak onay

### Gate-4: Supervisor → Müdür Adayı
- **Tetiklenme:** Coach + CGO ortak talebi
- **Minimum süre:** Supervisor olarak en az 180 gün
- **Bileşenler:**
  - Kapsamlı sınav: 60 soru, minimum %90 (operasyon yönetimi, finans temelleri, insan kaynakları)
  - 1 aylık bağımsız şube yönetimi (CGO gözlemi)
  - KPI kontrolü: Son 90 günde şube performans skoru > 80, çalışan memnuniyeti > 4/5
  - Panel değerlendirme: Coach + CGO + CEO ortak onay
- **HQ onayı gerektirir**
- **Not:** Gate-4 sonrası terfi, HQ yönetim kurulu kararına tabidir. Sistem sadece adaylık sürecini yönetir.

---

## 4. Değerlendirme Katmanları (3 Katmanlı Model)

Her kariyer seviyesindeki ilerleme 3 katmanlı değerlendirme ile ölçülür:

### Katman 1: Bilgi (Knowledge) — Quiz Bazlı
- Micro quizler: 5-10 soru, modül sonunda otomatik
- Gate sınavları: 20-50 soru, seviye geçişinde
- Cooldown: Başarısız quiz tekrarı için 24 saat bekleme
- Geçme notu: Modül bazlı ayarlanabilir (varsayılan %70, Gate için %80+)
- **Mevcut tablo:** `quizzes`, `quiz_questions`, `quiz_results`, `user_quiz_attempts`

### Katman 2: Pratik (Practical) — Gözlem Bazlı
- Supervisor checklist: Modül bazlı pratik gözlem listesi
- Trainer değerlendirme: Reçete uygulaması, müşteri hizmeti senaryosu
- Fotoğraf doğrulama: AI destekli görsel onay (mevcut checklist sistemi)
- **Mevcut tablo:** `checklist_completions`, `staff_evaluations`, `manager_evaluations`

### Katman 3: Performans (KPI Signals) — Otomatik
- Devam/dakiklik: `shift_attendance` verisi → katılım oranı
- Fire/zayi: `production_batches` verisi → rejected oranı
- Müşteri şikayeti: `product_complaints` sayısı
- Checklist tamamlama: `checklist_completions` zamanında tamamlama oranı
- Task performansı: `tasks` zamanında tamamlama oranı
- **Mevcut tablo:** `employee_performance_scores`, `user_career_progress` (compositeScore)

### Kompozit Skor Formülü (Mevcut)
```
compositeScore = (trainingScore * 0.25) + (practicalScore * 0.25) + (attendanceScore * 0.25) + (managerScore * 0.25)
```
- `trainingScore`: Quiz ortalaması
- `practicalScore`: Checklist + Task tamamlama oranı
- `attendanceScore`: Vardiya katılım + dakiklik
- `managerScore`: Supervisor/Manager değerlendirme notu

---

## 5. Bilgi Mimarisi (Information Architecture)

### Kullanıcı (Staff) Görünümü — 3 Ana Tab

| Tab | İçerik | Öncelik |
|-----|--------|---------|
| **Benim Yolum** (My Path) | Bugünkü adımlar, ilerleme, sonraki gate, Next Best Action önerileri | Varsayılan tab, her girişte burası açılır |
| **Kütüphane** (Library) | Tüm eğitim modülleri kataloğu, reçeteler, arama/filtreleme | İkincil, keşif amaçlı |
| **Başarılarım** (Achievements) | Rozetler, sertifikalar, sıralama, streak | Gamification, arka plan motivasyonu |

### Coach/Trainer Görünümü — Ek Tablar

| Tab | İçerik |
|-----|--------|
| **Ekip İlerlemesi** | Tüm personelin seviye/ilerleme durumu, uyarılar |
| **İçerik Yönetimi** | Modül düzenleme, paket oluşturma, quiz yönetimi |
| **Onay Bekleyenler** | Gate talepleri, pratik değerlendirme onayları |

### Navigasyon Kuralı
- Staff giriş yaptığında → "Benim Yolum" açılır
- Coach/Trainer giriş yaptığında → "Ekip İlerlemesi" açılır
- "Ne yapmalıyım?" sorusu hiçbir zaman sorulmamalı — My Path her zaman cevap verir

---

## 6. İçerik Tipleri (Content Types)

Tüm eğitim içerikleri tek bir yapıda sınıflandırılır:

| Tip | Kod | Açıklama | Örnek |
|-----|-----|----------|-------|
| Eğitim Modülü | `module` | Teorik bilgi, adım adım rehber | "HACCP Temelleri", "Espresso Hazırlama" |
| Quiz | `quiz` | Bilgi testi, çoktan seçmeli | "Hijyen Quiz", "Reçete Quiz" |
| Pratik Checklist | `practical` | Supervisor/Trainer gözlem listesi | "Latte Art Gözlem", "Bar Açılış Kontrolü" |
| Reçete | `recipe` | Ürün hazırlama talimatı | "Caramel Macchiato", "Flat White" |
| Gate Sınavı | `gate_exam` | Seviye geçiş sınavı | "Gate-0 Sınavı", "Barista Gate Sınavı" |
| KPI Eğitimi | `kpi_training` | KPI sinyaline bağlı önerilen modül | "Fire Azaltma Eğitimi", "Soğuk Zincir" |

### İçerik Metadata Kuralları
- Her içeriğin `requiredForRole` alanı: Hangi rol(ler) için zorunlu
- Her içeriğin `prerequisiteModuleIds` alanı: Önce tamamlanması gereken modüller
- Her içeriğin `level` alanı: beginner / intermediate / advanced
- Her içeriğin `moduleType` alanı: skill / recipe / onboarding / general
- Her içeriğin `examPassingScore` alanı: Geçme notu (varsayılan %70)
- Her içeriğin `maxRetries` alanı: Maksimum tekrar hakkı (varsayılan 3)

---

## 7. Sözlük

| Terim | Tanım |
|-------|--------|
| **Gate** | Kariyer seviyesi geçiş noktası (sınav + pratik + KPI kontrolü) |
| **Gate-0** | Onboarding çıkış kapısı (14. gün) |
| **NBA (Next Best Action)** | Kullanıcıya "şimdi ne yapmalısın" önerisi sunan rule-based motor |
| **KPI Sinyali** | Performans verisinden otomatik tetiklenen eğitim önerisi |
| **Content Pack** | Belirli bir rol/seviye için gruplanmış içerik seti |
| **Mentor** | Onboarding sürecinde yeni personele atanan deneyimli çalışan |
| **Cooldown** | Başarısız deneme sonrası bekleme süresi |
| **Composite Score** | 4 bileşenli kariyer ilerleme puanı (0-100) |
