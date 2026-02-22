# DOSPRESSO Academy V2 - Product Requirements Document (PRD)

> MVP Backlog, Acceptance Criteria, Phase Planı
> Son güncelleme: 2026-02-22

---

## 1. Vizyon

**Tek cümle:** Academy V2, her DOSPRESSO çalışanının "şimdi ne yapmalıyım?" sorusunu hiç sormadan, kendi kariyer yolunda ilerleyebileceği self-guiding bir öğrenme platformudur.

### Temel Prensipler
1. **Self-Guiding:** Kullanıcı asla ne yapacağını merak etmez — sistem her zaman sıralı bir eylem listesi sunar
2. **Gate-Based Progression:** Keyfi terfiler yerine, ölçülebilir kapı geçişleri ile kariyer ilerlemesi
3. **KPI-Driven Learning:** Performans verileri otomatik olarak eğitim önerilerine dönüşür
4. **Minimal New Tables:** Mevcut altyapı üzerine, az sayıda yeni tablo ile maksimum etki

---

## 2. Bilgi Mimarisi (Information Architecture)

### Staff Görünümü (3 Tab)

```
┌─────────────────────────────────────────────────┐
│  [Benim Yolum]  [Kütüphane]  [Başarılarım]     │
│  ═══════════                                     │
│                                                   │
│  Varsayılan: "Benim Yolum" her zaman açılır      │
└─────────────────────────────────────────────────┘
```

| Tab | Path | Amaç |
|-----|------|------|
| Benim Yolum | `/academy/my-path` | NBA listesi, ilerleme, gate durumu |
| Kütüphane | `/academy/library` | Tüm içerik kataloğu, arama, filtreleme |
| Başarılarım | `/academy/achievements` | Rozetler, sertifikalar, sıralama, streak |

### Coach/Trainer Ek Tabları

| Tab | Path | Amaç |
|-----|------|------|
| Ekip İlerlemesi | `/academy/team` | Personel ilerleme, uyarılar |
| İçerik Yönetimi | `/academy/content` | Modül/quiz/paket CRUD |
| Onay Bekleyenler | `/academy/approvals` | Gate talepleri, pratik onaylar |

---

## 3. Phase Planı & MVP Backlog

### Phase 1: Foundation (MVP) — Hafta 1-3

#### P1.1: My Path (Benim Yolum) Ekranı
**Öncelik:** P0 (Kritik)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P1.1.1 | Staff olarak, uygulamayı açtığımda "Benim Yolum" tab'ını görmek istiyorum | - Academy'ye giriş → "Benim Yolum" default tab olarak açılır |
| P1.1.2 | Staff olarak, bugünkü adımlarımı görmek istiyorum | - NBA motoru çalışır ve sıralı eylem listesi gösterir - Her adımda: başlık, tip ikonu, tahmini süre, durum (tamamlandı/bekliyor/kilitli) - Öncelik renklendirilmesi: kırmızı (gecikmiş), sarı (KPI), normal |
| P1.1.3 | Staff olarak, seviye ilerleme durumumu görmek istiyorum | - Üst banner: mevcut seviye, ilerleme %, sonraki gate bilgisi - Composite score gösterimi - "Gate-X'e N gün kaldı" veya "Gate-X'e M modül kaldı" |
| P1.1.4 | Staff olarak, bir adımı tamamlayabilmek istiyorum | - Modül adımına tıkla → modül sayfasına git → tamamlayınca geri dön - Quiz adımına tıkla → quiz başla → sonucu kaydet - Pratik adım → "Onay Bekliyor" durumuna geç → Supervisor/Mentor bildirim alır |
| P1.1.5 | Stajyer olarak, onboarding ilerleme banner'ımı görmek istiyorum | - "Onboarding — Gün X/14" + ilerleme çubuğu - Mentor bilgisi - Gate-0'a kalan gün |

#### P1.2: Gate Sistemi
**Öncelik:** P0 (Kritik)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P1.2.1 | Admin/Coach olarak, gate tanımları oluşturmak istiyorum | - `career_gates` tablosu ve CRUD endpoint'leri çalışır - Gate-0 ~ Gate-4 seed data eklenir |
| P1.2.2 | Supervisor olarak, personel için terfi talebi oluşturmak istiyorum | - Ön koşul kontrolü otomatik (süre, modüller, composite score) - Başarılı → Coach'a bildirim |
| P1.2.3 | Coach olarak, terfi talebini onaylayabilmek istiyorum | - Onay → Gate sınavı personelin My Path'inde aktifleşir - Red → Neden yazılır, Supervisor'a bildirim |
| P1.2.4 | Staff olarak, gate sınavını çözebilmek istiyorum | - Quiz bileşeni: N soru, süre limiti, min % geçme - Pratik bileşeni: Supervisor checklist doldurur - KPI bileşeni: Otomatik hesaplanır - Devam bileşeni: Otomatik hesaplanır |
| P1.2.5 | Sistem olarak, gate sonucunu otomatik hesaplamak istiyorum | - 4 bileşen sonucu → overall_passed belirlenir - Pass → kullanıcı role terfi, rozet verilir, bildirim - Fail → cooldown başlar, failure_reason kaydedilir |

#### P1.3: Content Pack Sistemi
**Öncelik:** P1 (Yüksek)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P1.3.1 | Coach/Trainer olarak, içerik paketi oluşturmak istiyorum | - Paket adı, hedef rol, süre, tip seçimi - Gün bazlı adım ekleme (modül, quiz, pratik) |
| P1.3.2 | Coach/Trainer olarak, onboarding paketi tasarlamak istiyorum | - 14 günlük program, gün gün adım düzenlemesi - Adım sıralaması sürükle-bırak (opsiyonel, MVP'de sort_order) |
| P1.3.3 | Supervisor olarak, yeni personele onboarding paketi atamak istiyorum | - Personel seç → paket seç → mentor ata → başlat - Otomatik: 14 günlük ilerleme kayıtları oluşturulur |

### Phase 2: Intelligence — Hafta 4-5

#### P2.1: NBA (Next Best Action) Motoru
**Öncelik:** P0 (Kritik)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P2.1.1 | Sistem olarak, 6 seviyeli önceliklendirme yapabilmek istiyorum | - Öncelik 1-6 kuralları implemente edilir (bkz. 01-user-flows.md) - Doğru sırada eylem listesi döner |
| P2.1.2 | Sistem olarak, KPI sinyallerini değerlendirebilmek istiyorum | - `kpi_signal_rules` tablosu ve background job çalışır - Eşik aşıldığında → modül önerisi + bildirim - 7 gün debounce (aynı sinyal tekrar tetiklenmez) |
| P2.1.3 | Staff olarak, KPI bazlı önerileri My Path'imde görmek istiyorum | - Sarı vurgu ile KPI önerisi gösterilir - "Fire oranınız %7 — hedef <%5" gibi açıklama |

#### P2.2: Ekip İlerlemesi Dashboard
**Öncelik:** P1 (Yüksek)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P2.2.1 | Coach/Supervisor olarak, ekip ilerleme özetini görmek istiyorum | - Personel listesi: ad, seviye, ilerleme %, son aktivite, uyarılar - Filtreleme: şube, seviye, durum |
| P2.2.2 | Coach olarak, uyarıları görmek istiyorum | - Kırmızı: Gate başarısızlığı, 5+ gün aktivite yok - Sarı: KPI sinyali tetiklendi - Turuncu: Gecikmiş modüller |
| P2.2.3 | Coach olarak, personele ek modül atayabilmek istiyorum | - Personel profilinden "Modül Ata" butonu - Modül seç → zorunlu/opsiyonel → ata |

### Phase 3: Gamification Enhancement — Hafta 6-7

#### P3.1: Achievements (Başarılarım) Ekranı
**Öncelik:** P2 (Normal)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P3.1.1 | Staff olarak, kazandığım rozetleri görmek istiyorum | - Rozet galerisi: kazanılan + kilitli - Her rozet: ikon, başlık, kazanma tarihi, açıklama |
| P3.1.2 | Staff olarak, sertifikalarımı görmek istiyorum | - Gate tamamlama sertifikaları - Son kullanma tarihi gösterimi - PDF indirme |
| P3.1.3 | Staff olarak, öğrenme serisimi (streak) görmek istiyorum | - Günlük streak sayacı - En uzun seri rekoru - Seri bozulma uyarısı |
| P3.1.4 | Staff olarak, sıralamadaki yerimi görmek istiyorum | - Şube bazlı sıralama (XP bazlı) - Anonim mod (opsiyonel, Coach ayarı) |

#### P3.2: Otomatik Rozet Sistemi
**Öncelik:** P2 (Normal)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P3.2.1 | Sistem olarak, gate tamamlamada otomatik rozet vermek istiyorum | - Gate-0 geçiş → "Onboarding Tamamlandı" rozeti - Gate-1 geçiş → "Barista Sertifikası" rozeti |
| P3.2.2 | Sistem olarak, streak bazlı rozet vermek istiyorum | - 7 gün seri → "Bir Haftalık Çalışkan" - 30 gün seri → "Aylık Öğrenci" |
| P3.2.3 | Sistem olarak, KPI başarı rozeti vermek istiyorum | - 90 gün sıfır fire → "Sıfır Kayıp" - %100 checklist tamamlama (30 gün) → "Mükemmel Prosedür" |

### Phase 4: Advanced — Hafta 8+

#### P4.1: İçerik Yönetimi (Coach/Trainer)
**Öncelik:** P2 (Normal)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P4.1.1 | Trainer olarak, yeni modül oluşturmak istiyorum | - Başlık, açıklama, tip, seviye, süre, ön koşullar - Materyal ekleme (metin, görsel, video link) - Taslak olarak kaydet |
| P4.1.2 | Coach olarak, modülü yayınlamak istiyorum | - Taslak → İnceleme → Yayın akışı - Yayınlanan modül Library'de görünür |
| P4.1.3 | Coach olarak, gate kurallarını düzenlemek istiyorum | - Quiz geçme notu, minimum süre, KPI eşikleri ayarlanabilir - Değişiklik logu tutulur |

#### P4.2: Sertifika Yenileme
**Öncelik:** P3 (Düşük)

| ID | User Story | Acceptance Criteria |
|----|-----------|-------------------|
| P4.2.1 | Sistem olarak, süresi dolan sertifikaları tespit etmek istiyorum | - 14 gün kala uyarı → My Path'e tazelendirme önerisi (Öncelik 6) - Süre dolduğunda → modül "expired" işaretlenir |
| P4.2.2 | Staff olarak, sertifika yenilemek istiyorum | - Modülü tekrar tamamla + quiz geç → sertifika yenilenir - Yeni son kullanma tarihi hesaplanır |

---

## 4. Ekran Bazlı Görev Listesi

### Ekran: My Path (Benim Yolum)
```
Bileşenler:
├── LevelProgressBanner
│   ├── Seviye adı + numara
│   ├── İlerleme çubuğu (%)
│   ├── Composite score
│   └── Sonraki gate bilgisi
├── OnboardingBanner (sadece stajyer, onboarding aktifken)
│   ├── "Gün X/14" göstergesi
│   ├── İlerleme çubuğu
│   └── Mentor bilgisi
├── ActionList
│   ├── ActionItem (her biri)
│   │   ├── Öncelik rengi (sol çizgi)
│   │   ├── İçerik tipi ikonu
│   │   ├── Başlık
│   │   ├── Tahmini süre
│   │   ├── Durum (tamamlandı / bekliyor / kilitli / onay bekliyor)
│   │   └── Neden metni ("KPI: Fire oranınız %7")
│   └── "Daha fazla göster" (5'ten fazlaysa)
└── GateReadyCard (gate ön koşulları tamamlandığında)
    ├── Gate adı
    ├── Tamamlanan ön koşullar listesi
    └── "Sınava Başla" butonu
```

### Ekran: Library (Kütüphane)
```
Bileşenler:
├── SearchBar
│   ├── Metin arama
│   └── Filtreler: tip, seviye, rol, durum
├── CategoryTabs (veya filtre)
│   ├── Tümü
│   ├── Eğitim Modülleri
│   ├── Reçeteler
│   ├── Quizler
│   └── Pratik Checklistler
├── ContentGrid / ContentList
│   ├── ContentCard
│   │   ├── Tip ikonu
│   │   ├── Başlık
│   │   ├── Seviye badge (beginner/intermediate/advanced)
│   │   ├── Süre
│   │   ├── Tamamlama durumu (varsa)
│   │   └── Zorunlu/opsiyonel badge
│   └── Pagination / Infinite scroll
└── EmptyState ("Kriterlere uygun içerik bulunamadı")
```

### Ekran: Achievements (Başarılarım)
```
Bileşenler:
├── StreakWidget
│   ├── Mevcut seri (gün sayısı)
│   ├── En uzun seri
│   └── Haftalık aktivite grid
├── BadgeGallery
│   ├── BadgeCard
│   │   ├── Rozet ikonu (renkli: kazanılmış, gri: kilitli)
│   │   ├── Rozet adı
│   │   ├── Kazanma tarihi (veya koşul)
│   │   └── Açıklama
│   └── Filtreleme: kazanılmış / kilitli / tümü
├── CertificateList
│   ├── CertificateCard
│   │   ├── Sertifika adı (Gate-0, Gate-1...)
│   │   ├── Kazanma tarihi
│   │   ├── Son kullanma tarihi
│   │   └── PDF indirme butonu
│   └── Durum: geçerli / süresi dolmak üzere / süresi dolmuş
└── LeaderboardWidget
    ├── Top 10 liste (XP bazlı)
    ├── Kullanıcının sırası
    └── Şube filtresi
```

### Ekran: Team Progress (Ekip İlerlemesi) — Coach/Trainer
```
Bileşenler:
├── TeamSummaryCards
│   ├── Toplam personel
│   ├── Aktif onboarding
│   ├── Gate bekleyen
│   └── Uyarı sayısı
├── AlertList
│   ├── AlertItem
│   │   ├── Severity ikonu (kırmızı/sarı/turuncu)
│   │   ├── Personel adı
│   │   ├── Uyarı metni
│   │   └── Aksiyon butonu
│   └── Filtre: severity, tip
├── TeamTable
│   ├── Personel adı
│   ├── Seviye badge
│   ├── İlerleme %
│   ├── Son aktivite tarihi
│   ├── Composite score
│   ├── Uyarı sayısı
│   └── Detay → personel profili
└── Filtreler
    ├── Şube
    ├── Seviye
    └── Durum (aktif/pasif)
```

---

## 5. Teknik Kabul Kriterleri (Cross-Cutting)

### Performans
- My Path API yanıt süresi: < 500ms (NBA hesaplaması dahil)
- Library arama: < 300ms
- Gate sonuç hesaplaması: < 2s

### Erişilebilirlik
- Tüm interaktif elemanlar keyboard-navigable
- ARIA etiketleri tüm durum göstergelerinde
- Renk kodları + ikon/metin (sadece renge dayanmama)

### Mobil
- Tüm ekranlar mobile-first responsive
- My Path: tek kolon, swipe-friendly kartlar
- Minimum touch target: 44x44px

### Veri Güvenliği
- Staff sadece kendi My Path'ini görür
- Supervisor sadece kendi şubesini görür
- Coach tüm şubeleri görür
- Trainer sadece içerik yönetimi yapabilir
- Gate verileri immutable (düzenlenemez, sadece yeni deneme)

### Test
- Her endpoint için integration test
- Gate hesaplama için unit test
- NBA motoru için unit test (6 öncelik seviyesi)
- E2E: Onboarding → Gate-0 → Terfi akışı

---

## 6. Bağımlılık Matrisi

```
Phase 1 (Foundation)
├── P1.1 My Path  ← P1.2 Gate Sistemi (gate durumu My Path'te gösterilir)
├── P1.2 Gate     ← career_gates tablosu (yeni)
├── P1.3 Packs    ← content_packs + content_pack_items tabloları (yeni)
│
Phase 2 (Intelligence)
├── P2.1 NBA      ← P1.1 My Path + kpi_signal_rules tablosu (yeni)
├── P2.2 Team     ← P1.2 Gate + user_career_progress (mevcut)
│
Phase 3 (Gamification)
├── P3.1 Achieve  ← badges + user_badges (mevcut)
├── P3.2 AutoBadge← P1.2 Gate + learning_streaks (mevcut)
│
Phase 4 (Advanced)
├── P4.1 Content  ← training_modules (mevcut)
└── P4.2 Renewal  ← training_completions (mevcut)
```

---

## 7. Başarı Metrikleri

| Metrik | Hedef | Ölçüm Yöntemi |
|--------|-------|---------------|
| Onboarding tamamlama oranı | %90+ | 14 günde Gate-0 geçen / toplam stajyer |
| Ortalama onboarding süresi | ≤ 14 gün | Başlangıç → Gate-0 geçiş günü |
| Gate-1 başarı oranı (ilk deneme) | %70+ | İlk denemede geçen / toplam deneyen |
| Günlük aktif öğrenen oranı | %60+ | Gün içinde en az 1 adım tamamlayan personel |
| KPI sinyal → modül tamamlama | %50+ | Sinyal sonrası 7 günde modül tamamlayan |
| My Path boş olanlar | %0 | My Path'te hiç eylem olmayan kullanıcılar (hedef: sıfır) |
| Ortalama composite score artışı | +10 puan / 90 gün | 90 günlük dönemsel skor farkı |

---

## 8. Referans Dosyalar

| Dosya | İçerik |
|-------|--------|
| `docs/00-definitions.md` | Tanımlar, Gate sistemi, kariyer seviyeleri, değerlendirme katmanları |
| `docs/01-user-flows.md` | Kullanıcı akışları, NBA motor kuralları, ekran durumları |
| `docs/02-data-permissions.md` | Veri modeli, yetki matrisi, KPI sinyal kuralları |
| `docs/prd-academy-v2.md` | Bu dosya — MVP backlog, acceptance criteria, phase planı |
| `docs/coach-console-spec.md` | Coach Console yönetim konsolu kuralları, menü yapısı |
| `docs/onboarding-studio-spec.md` | Onboarding Studio ekranları, template editor, preview |
| `docs/agent-visibility-spec.md` | Agent Center, Action Log, inline suggestions |
| `shared/schema.ts` | Mevcut DB şeması (career_levels, training_modules, quizzes vb.) |
