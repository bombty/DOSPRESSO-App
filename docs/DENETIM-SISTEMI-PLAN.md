# DOSPRESSO Denetim Sistemi v2 — Kapsamlı Tasarım Planı
**Tarih:** 4 Nisan 2026 | **Durum:** Tasarım aşaması
**İlgili modüller:** Denetim, Operasyon, Şube Sağlık, Skor Sistemi, Control Centrum

---

## 1. VİZYON

Şube denetimlerinin baştan sona dijital yönetildiği, sonuçların otomatik skora 
yansıdığı, aksiyon takibinin SLA bazlı yapıldığı, ve tüm geçmişin analiz 
edilebilir olduğu kapsamlı bir kalite kontrol sistemi.

**Mevcut sorunlar:**
- Denetim formu sadece checkbox (evet/hayır) — puanlama, yıldız, açıklama yok
- Form şablonları sabit kodlanmış — admin düzenleyemiyor
- Denetim sonuçları → skor bağlantısı yok
- Aksiyon takibi/deadline yok — denetçi bulguları verip gidiyor
- Personel bazlı denetim yok (dress code, hijyen, güleryüz)
- Şube denetim geçmişi/trend yok
- Denetim raporu Supervisor/Yatırımcıya gitmiyor

---

## 2. MİMARİ TASARIM

### 2a. Denetim Akışı (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│  1. ŞABLON YÖNETİMİ (Admin/Operasyon)                      │
│     Denetim kategorileri, sorular, soru tipleri, ağırlıklar │
│     → Operasyon bölümünde yönetilir                         │
├─────────────────────────────────────────────────────────────┤
│  2. DENETİM BAŞLATMA (Coach/Trainer/Kalite Kontrol)         │
│     Şube seç → Şablon seç → Vardiya personelini seç        │
│     → O andaki vardiya otomatik çekilir                     │
├─────────────────────────────────────────────────────────────┤
│  3. DENETİM YAPMA (Yerinde)                                 │
│     Şube kategorileri: checkbox, puan, yıldız, fotoğraf     │
│     Personel denetimi: dress code, hijyen, güleryüz, hız   │
│     Not/fotoğraf ekleme her soru için                       │
├─────────────────────────────────────────────────────────────┤
│  4. RAPOR & AKSİYON (Otomatik)                              │
│     Toplam skor hesaplama → Şube skoru güncelleme           │
│     Başarısız maddeler → Otomatik aksiyon oluştur           │
│     Deadline ata → SLA takibi başlat                        │
│     Rapor gönder: Supervisor + SuperBuddy + Yatırımcı       │
├─────────────────────────────────────────────────────────────┤
│  5. TAKİP & KAPANIŞ (HQ)                                    │
│     Aksiyon durumu izle → Fotoğraf/kanıt iste               │
│     Deadline kontrolü → Otomatik uyarı (Mr. Dobody)        │
│     Tüm aksiyonlar kapanınca → Denetim tamamlandı           │
├─────────────────────────────────────────────────────────────┤
│  6. ANALİZ & RAPORLAMA                                       │
│     Şube trend grafikleri → Önceki denetimlere kıyas        │
│     En çok başarısız olan kategoriler                        │
│     İyileşme/kötüleşme tespiti                              │
│     Personel performans trendi                              │
└─────────────────────────────────────────────────────────────┘
```

### 2b. Soru Tipleri (Yeni)

```
Mevcut:
  ☑ Checkbox (Evet/Hayır) — tamamlandı mı?

Yeni eklenecek:
  ⭐ Yıldız (1-5) — kalite değerlendirmesi
  🔢 Puan (0-100 slider) — detaylı puanlama
  ✅ Evet/Hayır/Kısmen — 3 seçenek (tam puan, yarım puan, sıfır)
  📝 Açık metin — not/açıklama
  📸 Fotoğraf — kanıt (zorunlu/opsiyonel)
  📋 Çoklu seçim — birden fazla seçenek
```

### 2c. Skor Hesaplama Mantığı

```
Şube Denetim Skoru = Σ (kategori_ağırlık × kategori_skor) / Σ kategori_ağırlık

Örnek:
  Dış Mekan (%10): 80/100
  Bina Görünüş (%10): 90/100
  Bar Düzeni (%15): 70/100
  Depo (%10): 100/100
  Ürün Sunumu (%15): 85/100
  Personel Davranış (%15): 75/100
  Hijyen (%15): 95/100
  Genel Düzen (%10): 80/100
  
  Toplam = (10×80 + 10×90 + 15×70 + 10×100 + 15×85 + 15×75 + 15×95 + 10×80) / 100
         = 83.25/100
```

### 2d. Skor Etki Zinciri

```
Denetim Skoru → KİM ETKİLENİR?

┌──────────────────────────────────────────────┐
│ Şube Skoru:                                  │
│   Denetim ortalaması (son 3-6 denetim)       │
│   → Şube kartında gösterilir                 │
│   → Şube sağlık skoruna %30 katkı           │
├──────────────────────────────────────────────┤
│ Supervisor Skoru:  ← ETKİLENİR              │
│   Şube denetim ortalamasının %40'ı           │
│   + Aksiyon kapama hızı %30                  │
│   + SLA uyumu %30                            │
├──────────────────────────────────────────────┤
│ Supervisor Buddy:  ← ETKİLENİR              │
│   Supervisor skorunun %70'i                  │
│   (ortak sorumluluk prensibi)                │
├──────────────────────────────────────────────┤
│ Barista / Bar Buddy / Stajyer: ETKİLENMEZ   │
│   Şube denetimi bunların bireysel skorunu    │
│   ETKİLEMEZ — sadece personel denetimi etkiler│
├──────────────────────────────────────────────┤
│ Personel Denetimi → BİREYSEL SKOR           │
│   dress_code: ±5 puan                        │
│   hijyen: ±5 puan                            │
│   müşteri_memnuniyet: ±10 puan               │
│   güleryüz: ±10 puan                         │
│   → Kişinin composite score'una yansır       │
└──────────────────────────────────────────────┘
```

---

## 3. VERİTABANI TASARIMI

### Yeni/Güncellenecek Tablolar

```sql
-- 1. Denetim Şablonları (Admin yönetir)
audit_templates (
  id, name, description, 
  category TEXT, -- 'branch_audit', 'personnel_audit', 'hygiene_audit'
  version INT DEFAULT 1,
  isActive BOOL, createdBy, createdAt, updatedAt
)

-- 2. Şablon Kategorileri (Dış Mekan, Bar Düzeni vb.)
audit_template_categories (
  id, templateId → audit_templates,
  name, description,
  weight INT, -- ağırlık yüzdesi (10, 15, 20...)
  orderIndex, isActive
)

-- 3. Şablon Soruları (her kategorideki sorular)
audit_template_questions (
  id, categoryId → audit_template_categories,
  questionText TEXT,
  questionType VARCHAR, -- 'checkbox','star','score','yesno_partial','text','photo','multi'
  isRequired BOOL DEFAULT true,
  photoRequired BOOL DEFAULT false, -- fotoğraf zorunlu mu
  maxScore INT DEFAULT 100, -- checkbox: 100/0, star: 20/40/60/80/100
  orderIndex, isActive
)

-- 4. Denetim Kayıtları (ana tablo)
audit_records (
  id, templateId → audit_templates,
  branchId → branches,
  auditorId → users, -- denetimi yapan kişi
  auditDate DATE,
  status VARCHAR, -- 'in_progress','completed','pending_actions','closed'
  totalScore NUMERIC,
  maxPossibleScore INT,
  scorePercentage NUMERIC,
  notes TEXT,
  completedAt TIMESTAMP,
  closedAt TIMESTAMP, -- tüm aksiyonlar kapanınca
  createdAt
)

-- 5. Denetim Cevapları (her soru için)
audit_answers (
  id, auditRecordId → audit_records,
  questionId → audit_template_questions,
  categoryId → audit_template_categories,
  -- Cevap alanları (soru tipine göre biri dolar):
  checkboxValue BOOL,
  starValue INT, -- 1-5
  scoreValue NUMERIC, -- 0-100
  yesNoPartialValue VARCHAR, -- 'yes','no','partial'
  textValue TEXT,
  multiSelectValues TEXT[], -- çoklu seçim
  photoUrl TEXT, -- fotoğraf URL
  -- Hesaplanan:
  earnedScore NUMERIC,
  maxScore INT,
  notes TEXT,
  createdAt
)

-- 6. Personel Denetimi (denetim sırasında vardiyada olan kişiler)
audit_personnel_checks (
  id, auditRecordId → audit_records,
  userId → users, -- denetlenen personel
  dressCodeScore INT, -- 0-100
  dressCodeNotes TEXT,
  hygieneScore INT, -- 0-100
  hygieneNotes TEXT,
  customerSatisfactionScore INT, -- 0-100
  friendlinessScore INT, -- 0-100 (güleryüz)
  speedScore INT, -- 0-100 (hız)
  photoUrl TEXT, -- personel fotoğrafı (opsiyonel)
  overallScore NUMERIC, -- otomatik hesaplanan
  notes TEXT,
  createdAt
)

-- 7. Denetim Aksiyonları (bulgudan çıkan görevler)
audit_actions (
  id, auditRecordId → audit_records,
  questionId → audit_template_questions, -- hangi sorudan çıktı
  branchId → branches,
  title TEXT,
  description TEXT,
  priority VARCHAR, -- 'critical','high','medium','low'
  assignedToId → users, -- supervisor veya ilgili kişi
  deadline DATE,
  status VARCHAR, -- 'open','in_progress','resolved','overdue','escalated'
  resolution TEXT, -- çözüm açıklaması
  resolvedPhotoUrl TEXT, -- çözüm kanıtı fotoğraf
  resolvedAt TIMESTAMP,
  resolvedById → users,
  slaHours INT, -- kaç saat içinde çözülmeli
  isOverdue BOOL DEFAULT false,
  escalatedAt TIMESTAMP,
  escalatedToId → users, -- CGO veya üst yönetici
  createdAt
)

-- 8. Denetim Bildirimleri
audit_notifications (
  id, auditRecordId → audit_records,
  userId → users, -- alıcı
  type VARCHAR, -- 'audit_completed','action_assigned','deadline_warning','overdue'
  message TEXT,
  isRead BOOL DEFAULT false,
  createdAt
)
```

---

## 4. UI/UX TASARIMI

### 4a. Operasyon Bölümü — Şablon Yönetimi (Admin)

```
Operasyon > Şube Denetim Yönetimi
├── 📋 Şablonlar (CRUD)
│   ├── Yeni Şablon Oluştur
│   ├── Mevcut Şablonları Düzenle
│   ├── Kategori Ekle/Sil/Sırala
│   ├── Soru Ekle (tip seç: checkbox/yıldız/puan/evet-hayır...)
│   └── Ağırlık Ayarla (kategoriler toplamı %100 olmalı)
├── 📊 Denetim Analitik
│   ├── Tüm şubelerin denetim özeti
│   ├── En düşük/yüksek skorlu şubeler
│   ├── Trend grafikleri (son 6-12 ay)
│   └── Kategori bazlı zayıf noktalar
└── ⚙️ Denetim Ayarları
    ├── SLA süreleri (kritik: 24s, yüksek: 48s, orta: 72s, düşük: 1 hafta)
    ├── Otomatik bildirim kuralları
    ├── Skor etki katsayıları
    └── Proje kategorileri yönetimi (bonus: proje sistemi için de)
```

### 4b. Coach/Trainer — Denetim Yapma

```
Şube Denetim > Yeni Denetim
┌──────────────────────────────────────────────┐
│ 1. Şube Seç: [Dropdown]                     │
│ 2. Şablon Seç: [Operasyon Denetimi ▼]       │
│ 3. Vardiya Personeli: (otomatik çekilir)     │
│    ☑ Ahmet Barista  ☑ Mehmet Supervisor      │
│    ☑ Ayşe Bar Buddy ☐ Ali (izinli)           │
├──────────────────────────────────────────────┤
│ 📍 Dış Mekan (Ağırlık: %10)                 │
│ ┌────────────────────────────────────────┐   │
│ │ Tabelalar temiz?     ⭐⭐⭐⭐☆ (4/5) │   │
│ │ Dış oturma düzenli?  ✅ Evet          │   │
│ │ Vitrin uygun mu?     ⭐⭐⭐☆☆ (3/5)  │   │
│ │ 📸 Fotoğraf ekle     [+]              │   │
│ │ 📝 Not: "Tabela lambası yanmıyor"     │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ 🧑‍🍳 Personel Denetimi                       │
│ ┌────────────────────────────────────────┐   │
│ │ Ahmet (Barista)                        │   │
│ │  Dress code:    ⭐⭐⭐⭐⭐ (5/5)      │   │
│ │  Hijyen:        ⭐⭐⭐⭐☆ (4/5)       │   │
│ │  Güleryüz:      ⭐⭐⭐☆☆ (3/5)       │   │
│ │  Müşteri ilgi:  ⭐⭐⭐⭐☆ (4/5)       │   │
│ │  Not: "Tırnak uzun, uyarıldı"         │   │
│ └────────────────────────────────────────┘   │
├──────────────────────────────────────────────┤
│ [Denetimi Tamamla]                           │
│ → Skor otomatik hesaplanır                   │
│ → Başarısız maddeler aksiyon olarak açılır   │
│ → Rapor Supervisor + Yatırımcıya gönderilir  │
└──────────────────────────────────────────────┘
```

### 4c. HQ Şube Kartı — Denetim Geçmişi

```
Şubeler > Lara Şubesi > Denetim Sekmesi
┌──────────────────────────────────────────────┐
│ 📊 Denetim Özeti                             │
│ Son skor: 78/100 (▼5 öncekine göre)         │
│ Ortalama (son 6): 82/100                     │
│ Toplam denetim: 8 (bu yıl)                  │
│ Açık aksiyon: 3 (1 gecikmiş!)               │
├──────────────────────────────────────────────┤
│ 📈 Trend Grafiği                             │
│ 100│          ●                              │
│  90│    ●  ●     ●                           │
│  80│ ●              ●  ●                     │
│  70│                      ●                  │
│    └──────────────────────────                │
│     Oca  Şub  Mar  Nis  May  Haz             │
├──────────────────────────────────────────────┤
│ 📋 Denetim Geçmişi                           │
│ ┌─────────────────────────────────────┐      │
│ │ 4 Nis 2026 — Yavuz Coach  78/100   │      │
│ │ ⚠ 3 açık aksiyon (2 gün kaldı)     │      │
│ │ [Detay] [Aksiyonlar]                │      │
│ ├─────────────────────────────────────┤      │
│ │ 15 Mar 2026 — Yavuz Coach  83/100  │      │
│ │ ✅ Tüm aksiyonlar kapandı           │      │
│ │ [Detay]                             │      │
│ ├─────────────────────────────────────┤      │
│ │ 1 Mar 2026 — Trainer Ali  90/100   │      │
│ │ ✅ Tamamlandı                       │      │
│ └─────────────────────────────────────┘      │
├──────────────────────────────────────────────┤
│ 🔴 Sürekli Zayıf Kategoriler                 │
│   Depo Tamamlığı: ort. 65/100 (3 denetimde) │
│   Personel Davranış: ort. 72/100             │
└──────────────────────────────────────────────┘
```

### 4d. Aksiyon Takip Paneli (SLA Bazlı)

```
Denetim Aksiyonları
┌─────────────────────────────────────────────────┐
│ 🔴 Gecikmiş (2)  🟡 Devam Eden (5)  🟢 Kapanan (12) │
├─────────────────────────────────────────────────┤
│ 🔴 Tabela lambası değişimi — Lara Şubesi       │
│    Deadline: 2 Nis (2 gün gecikmiş!)           │
│    Sorumlu: Mehmet Supervisor                    │
│    [Hatırlat] [Eskale Et]                       │
├─────────────────────────────────────────────────┤
│ 🟡 Depo FIFO düzenlemesi — Konyaaltı Şubesi    │
│    Deadline: 7 Nis (3 gün kaldı)               │
│    Sorumlu: Ayşe Supervisor                      │
│    [Takip Et]                                    │
└─────────────────────────────────────────────────┘
```

---

## 5. ENTEGRASYONLAR

### 5a. Dashboard'da Görünüm

```
Coach Ana Sayfa:
  → "Aktif Denetimlerim" kartı (açık aksiyon sayısı)
  → "Gecikmiş Aksiyonlar" uyarısı (kırmızı badge)

Supervisor Ana Sayfa:
  → "Şubem için bekleyen aksiyonlar" 
  → "Son denetim sonucu: 78/100"

CEO/CGO Control Centrum:
  → "Denetim Özeti" widget (ortalama skor, trend, kırmızı şubeler)
```

### 5b. Mr. Dobody Entegrasyonu

```
Otomatik aksiyonlar:
  → Aksiyon deadline yaklaşınca (24s kala): bildirim at
  → Deadline geçince: Supervisor'a uyarı + CGO'ya eskale
  → 3 ardışık düşük skor: "Acil müdahale gerekli" bildirimi
  → Personel 3 kez düşük güleryüz skoru: eğitim öner
```

### 5c. Skor Sistemi Entegrasyonu

```
Composite Score güncelleme:
  Her denetim sonrası:
    → Şube sağlık skoru güncelle (denetim ağırlığı: %30)
    → Supervisor composite score güncelle (denetim: %40)
    → Supervisor Buddy score güncelle (Supervisor × 0.7)
    → Personel bireysel denetim → kişisel composite score
```

---

## 6. UYGULAMA PLANI

### Sprint A (3-4 gün): Temel Altyapı
- [ ] DB tabloları oluştur (8 tablo)
- [ ] Şablon CRUD API'leri (templates, categories, questions)
- [ ] Operasyon > Şablon Yönetimi sayfası (admin)
- [ ] Mevcut denetim verilerini yeni yapıya migrate et

### Sprint B (3-4 gün): Denetim Yapma
- [ ] Yeni denetim başlatma (şube + şablon + personel seçimi)
- [ ] Denetim formu (yeni soru tipleri: yıldız, puan, evet/hayır/kısmen)
- [ ] Personel denetimi (vardiya personeli + dress code + hijyen)
- [ ] Fotoğraf ekleme
- [ ] Otomatik skor hesaplama

### Sprint C (2-3 gün): Aksiyon & Takip
- [ ] Başarısız maddeler → otomatik aksiyon oluşturma
- [ ] Deadline atama + SLA kuralları
- [ ] Aksiyon durumu güncelleme (Supervisor tarafı)
- [ ] Fotoğraflı çözüm kanıtı
- [ ] Denetim raporu bildirimi (Supervisor + Yatırımcı)

### Sprint D (2-3 gün): Analitik & Entegrasyon
- [ ] Şube kartında denetim geçmişi + trend grafiği
- [ ] Skor sistemi entegrasyonu (Supervisor + şube)
- [ ] Dashboard widget'ları (Coach + Supervisor + CEO)
- [ ] Mr. Dobody deadline uyarıları
- [ ] Kategori bazlı zayıf nokta analizi

### Sprint E (1-2 gün): Proje Sistemi Ek
- [ ] Proje kategorileri admin yönetimi (project_categories tablosu)
- [ ] Duyuru düzenleme sorunları fix
- [ ] Dashboard'a duyuru + görev widget'ı

---

## 7. PROJE KATEGORİ YÖNETİMİ (Bonus)

Denetim şablon yönetimi ile aynı mantıkta:

```sql
project_categories (
  id, name, icon, color, 
  isDefault BOOL, -- varsayılan kategoriler silinemez
  isActive BOOL, 
  orderIndex INT,
  createdAt
)
```

Admin → Proje Ayarları'nda CRUD. Proje oluştururken bu tablodan çekilir.
Sabit kodlanmış liste kaldırılır.

---

## 8. ÖNCELİK ÖNERİSİ

```
🔴 P0 (Hemen): Bug fix'ler (kullanıcı seçimi, duyuru sorunları)
🟡 P1 (Bu hafta): Denetim Sistemi Sprint A + B (temel + form)
🟢 P2 (Sonraki hafta): Sprint C + D (aksiyon + analitik)
🔵 P3 (Sonra): Sprint E + Dashboard entegrasyonları
```
