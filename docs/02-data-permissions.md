# DOSPRESSO Academy V2 - Veri Modeli, Yetkiler & KPI Eşleştirme

> Source of Truth: Bu dosya teknik veri yapısını, yetki matrisini ve KPI kural setini tanımlar.
> Son güncelleme: 2026-02-22

---

## 1. Mevcut Tablo Haritası (Kullanılacak Tablolar)

Academy V2, mevcut tabloları mümkün olduğunca yeniden kullanır. Yeni tablo ihtiyacı minimumdur.

### Doğrudan Kullanılacak Mevcut Tablolar

| Tablo | Amaç | V2'deki Rolü |
|-------|------|-------------|
| `users` | Personel bilgileri | Rol, şube, durum |
| `career_levels` | Kariyer seviyeleri (5 seviye) | Gate tanımları, zorunlu modüller |
| `user_career_progress` | Kullanıcı ilerleme durumu | Composite score, tamamlanan modüller |
| `training_modules` | Eğitim modülleri | İçerik kataloğu (Library) |
| `training_materials` | Modül materyalleri | İçerik detayları |
| `training_assignments` | Modül atamaları | Coach/Trainer atamaları |
| `training_completions` | Modül tamamlama | İlerleme takibi |
| `quizzes` | Quiz tanımları | Bilgi değerlendirmesi |
| `quiz_questions` | Quiz soruları | Gate sınavları + modül quizleri |
| `quiz_results` | Quiz sonuçları | Skor takibi |
| `user_quiz_attempts` | Quiz denemeleri | Cooldown + tekrar hakkı |
| `exam_requests` | Terfi talepleri | Gate tetikleme |
| `onboarding_templates` | Onboarding şablonları | 14 günlük paket tanımı |
| `onboarding_template_steps` | Şablon adımları | Günlük adım tanımları |
| `employee_onboarding_assignments` | Onboarding atamaları | Kişi-şablon eşleştirme |
| `employee_onboarding_progress` | Onboarding ilerleme | Gün bazlı tamamlama |
| `checklist_completions` | Checklist tamamlama | Pratik değerlendirme verisi |
| `staff_evaluations` | Personel değerlendirmeleri | Manager/supervisor notları |
| `manager_evaluations` | Yönetici değerlendirmeleri | Gate bileşeni |
| `badges` | Rozetler | Gamification |
| `user_badges` | Kullanıcı rozetleri | Başarı takibi |
| `learning_streaks` | Öğrenme serisi | Gamification |
| `daily_missions` | Günlük görevler | Gamification |
| `notifications` | Bildirimler | Uyarı/hatırlatma |
| `shift_attendance` | Vardiya katılım | KPI: devam oranı |
| `production_batches` | Üretim partileri | KPI: fire oranı |
| `product_complaints` | Ürün şikayetleri | KPI: kalite sinyali |
| `employee_performance_scores` | Performans puanları | Composite score bileşeni |

### YENİ Tablolar (Minimal Eklentiler)

#### 1. `career_gates` — Gate Tanımları
```sql
career_gates (
  id                    SERIAL PRIMARY KEY,
  gate_number           INTEGER NOT NULL,          -- 0, 1, 2, 3, 4
  from_level_id         INTEGER REFERENCES career_levels(id),
  to_level_id           INTEGER REFERENCES career_levels(id),
  title_tr              VARCHAR(200) NOT NULL,     -- "Gate-0: Onboarding Çıkışı"
  description_tr        TEXT,
  
  -- Quiz bileşeni
  quiz_id               INTEGER REFERENCES quizzes(id),
  quiz_passing_score    INTEGER DEFAULT 80,        -- Minimum %
  
  -- Pratik bileşeni
  practical_checklist   JSONB DEFAULT '[]',        -- [{item: "Latte hazırlama", weight: 10}]
  practical_approver    VARCHAR(50) DEFAULT 'supervisor', -- Kim onaylar
  
  -- KPI bileşeni
  kpi_rules             JSONB DEFAULT '[]',        -- [{metric: "waste_rate", max: 5, period_days: 30}]
  
  -- Devam bileşeni
  min_attendance_rate   INTEGER DEFAULT 90,        -- Minimum katılım %
  attendance_period_days INTEGER DEFAULT 30,       -- Kontrol periyodu
  
  -- Süre kuralları
  min_days_in_level     INTEGER DEFAULT 30,        -- Minimum bekleme süresi
  retry_cooldown_days   INTEGER DEFAULT 7,         -- Başarısızlık sonrası bekleme
  max_retries           INTEGER DEFAULT 3,         -- Maksimum deneme hakkı
  
  -- Onay zinciri
  requires_supervisor   BOOLEAN DEFAULT true,
  requires_coach        BOOLEAN DEFAULT true,
  requires_cgo          BOOLEAN DEFAULT false,     -- Gate-3+ için
  
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
)
```

#### 2. `gate_attempts` — Gate Deneme Kayıtları
```sql
gate_attempts (
  id                    SERIAL PRIMARY KEY,
  gate_id               INTEGER NOT NULL REFERENCES career_gates(id),
  user_id               VARCHAR NOT NULL REFERENCES users(id),
  attempt_number        INTEGER NOT NULL DEFAULT 1,
  
  -- Bileşen sonuçları
  quiz_score            INTEGER,                   -- Quiz puanı (0-100)
  quiz_passed           BOOLEAN,
  practical_score       INTEGER,                   -- Pratik puanı (0-100)
  practical_passed      BOOLEAN,
  practical_approved_by VARCHAR REFERENCES users(id),
  kpi_score             INTEGER,                   -- KPI puanı (0-100)
  kpi_passed            BOOLEAN,
  kpi_details           JSONB,                     -- {waste_rate: 3.2, attendance: 95}
  attendance_rate       INTEGER,                   -- Katılım oranı
  attendance_passed     BOOLEAN,
  
  -- Genel sonuç
  overall_passed        BOOLEAN NOT NULL DEFAULT false,
  overall_score         INTEGER,                   -- Ağırlıklı ortalama
  
  status                VARCHAR(20) DEFAULT 'in_progress', -- in_progress, passed, failed, expired
  started_at            TIMESTAMP DEFAULT NOW(),
  completed_at          TIMESTAMP,
  
  -- Başarısızlık detayı
  failure_reason        TEXT,                      -- Hangi bileşen(ler) başarısız
  next_retry_at         TIMESTAMP,                 -- Tekrar deneme tarihi
  
  -- Onaylar
  supervisor_approved   BOOLEAN DEFAULT false,
  coach_approved        BOOLEAN DEFAULT false,
  cgo_approved          BOOLEAN DEFAULT false,
  
  created_at            TIMESTAMP DEFAULT NOW()
)
```

#### 3. `kpi_signal_rules` — KPI Sinyal Kuralları
```sql
kpi_signal_rules (
  id                    SERIAL PRIMARY KEY,
  signal_key            VARCHAR(50) NOT NULL UNIQUE, -- "high_waste", "cold_chain_violation"
  title_tr              VARCHAR(200) NOT NULL,       -- "Yüksek Fire Oranı"
  description_tr        TEXT,
  
  -- Tetiklenme kuralı
  metric_source         VARCHAR(50) NOT NULL,        -- "waste_rate", "attendance", "quiz_score"
  metric_table          VARCHAR(100),                -- "production_batches", "shift_attendance"
  threshold_type        VARCHAR(20) DEFAULT 'above', -- "above", "below", "equals"
  threshold_value       REAL NOT NULL,               -- 5.0 (%, adet, oran)
  evaluation_period_days INTEGER DEFAULT 30,         -- Son kaç gün kontrol edilecek
  
  -- Önerilen içerik
  recommended_module_id INTEGER REFERENCES training_modules(id),
  recommended_action    VARCHAR(100),                -- "retake_module", "assign_training", "notify_coach"
  
  -- Hedef roller
  target_roles          TEXT[] DEFAULT ARRAY['barista', 'bar_buddy', 'stajyer'],
  
  -- Bildirim
  notify_roles          TEXT[] DEFAULT ARRAY['coach'],  -- Kim bilgilendirilir
  severity              VARCHAR(20) DEFAULT 'warning',  -- "info", "warning", "critical"
  
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW()
)
```

#### 4. `content_packs` — İçerik Paketleri
```sql
content_packs (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,       -- "14 Günlük Stajyer Onboarding"
  description_tr        TEXT,
  target_role           VARCHAR(50) NOT NULL,        -- "stajyer", "bar_buddy", "barista"
  pack_type             VARCHAR(30) DEFAULT 'onboarding', -- "onboarding", "role_training", "remedial"
  duration_days         INTEGER,                     -- Paket toplam süresi
  is_mandatory          BOOLEAN DEFAULT true,
  
  created_by            VARCHAR REFERENCES users(id),
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
)
```

#### 5. `content_pack_items` — Paket İçeriği
```sql
content_pack_items (
  id                    SERIAL PRIMARY KEY,
  pack_id               INTEGER NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  day_number            INTEGER,                     -- Kaçıncı gün (onboarding paketleri için)
  sort_order            INTEGER NOT NULL DEFAULT 1,
  
  -- İçerik referansı
  content_type          VARCHAR(30) NOT NULL,        -- "module", "quiz", "practical", "recipe", "gate_exam"
  training_module_id    INTEGER REFERENCES training_modules(id),
  quiz_id               INTEGER REFERENCES quizzes(id),
  recipe_id             INTEGER,                     -- recipes tablosuna referans
  
  -- Ayarlar
  title_override        VARCHAR(200),                -- Özel başlık (opsiyonel)
  is_required           BOOLEAN DEFAULT true,
  estimated_minutes     INTEGER DEFAULT 15,
  passing_score         INTEGER DEFAULT 70,          -- Quiz için geçme notu
  
  -- Onay gereksimi
  requires_approval     BOOLEAN DEFAULT false,
  approver_role         VARCHAR(50),                 -- "mentor", "supervisor", "trainer"
  
  created_at            TIMESTAMP DEFAULT NOW()
)
```

#### 6. `user_pack_progress` — Kullanıcı Paket İlerlemesi
```sql
user_pack_progress (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR NOT NULL REFERENCES users(id),
  pack_id               INTEGER NOT NULL REFERENCES content_packs(id),
  pack_item_id          INTEGER NOT NULL REFERENCES content_pack_items(id),
  
  status                VARCHAR(20) DEFAULT 'pending', -- "pending", "in_progress", "completed", "skipped", "failed"
  started_at            TIMESTAMP,
  completed_at          TIMESTAMP,
  score                 INTEGER,                     -- Quiz puanı (varsa)
  
  -- Onay
  approved_by           VARCHAR REFERENCES users(id),
  approved_at           TIMESTAMP,
  approval_notes        TEXT,
  
  created_at            TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, pack_item_id)                     -- Aynı adım tekrarı olmaz
)
```

---

## 2. Mevcut Tablolar ile Entegrasyon Haritası

### training_modules Tablosu — Zenginleştirme (Mevcut Alanlar Yeterli)

`training_modules` tablosu zaten V2 için gereken metadata alanlarına sahip:

| Alan | Tip | V2 Kullanımı |
|------|-----|-------------|
| `module_type` | skill, recipe, onboarding, general | İçerik sınıflandırma |
| `required_for_role` | text[] | Hangi roller için zorunlu |
| `prerequisite_module_ids` | integer[] | Önkoşul zincirleme |
| `level` | beginner, intermediate, advanced | Zorluk sıralama |
| `is_required` | boolean | Zorunlu mu |
| `is_published` | boolean | Yayında mı |
| `estimated_duration` | integer (dakika) | My Path süre gösterimi |
| `exam_passing_score` | integer | Quiz geçme notu |
| `max_retries` | integer | Tekrar hakkı |
| `supervisor_checklist` | jsonb | Pratik gözlem maddeleleri |
| `xp_reward` | integer | Gamification XP |
| `tags` | text[] | Arama/filtreleme |

### career_levels Tablosu — Mevcut Gate Desteği

| Alan | V2 Kullanımı |
|------|-------------|
| `required_module_ids` | Gate ön koşulu: Tüm modüller tamamlanmalı |
| `success_rate_threshold` | Gate quiz geçme notu (varsayılan %80) |
| `prerequisite_roles` | Önceki seviye şartı |

### user_career_progress Tablosu — Composite Score

| Alan | V2 Kullanımı |
|------|-------------|
| `current_career_level_id` | Mevcut seviye |
| `completed_module_ids` | Tamamlanan modüller (NBA hesaplaması) |
| `composite_score` | Gate ön koşul kontrolü |
| `training_score`, `practical_score`, `attendance_score`, `manager_score` | 4 bileşenli skor |

---

## 3. Yetki Matrisi (Permission Matrix)

### Rol Tanımları (V2 Kapsamı)

Academy V2 aşağıdaki 10 rolü doğrudan kapsar. Sistemde tanımlı diğer roller (CEO, Muhasebe/IK, Marketing, Kalite Kontrol, Gıda Güvenliği, Fabrika rolleri, Yatırımcı vb.) Academy modülüne erişmez veya sadece salt-okunur analitik erişimine sahiptir.

| Rol | Kod | Tip | Academy Erişimi |
|-----|-----|-----|-----------------|
| Stajyer | `stajyer` | Branch | My Path + Library + Achievements (kendi verisi) |
| Bar Buddy | `bar_buddy` | Branch | My Path + Library + Achievements (kendi verisi) |
| Barista | `barista` | Branch | My Path + Library + Achievements (kendi verisi) |
| Supervisor Buddy | `supervisor_buddy` | Branch | My Path + Library + Achievements (kendi verisi) |
| Supervisor | `supervisor` | Branch | Kendi + ekip My Path, onay yetkisi, onboarding yönetimi |
| Müdür | `mudur` | Branch | Kendi + ekip, onboarding yönetimi, terfi talebi |
| Trainer | `trainer` | HQ | İçerik CRUD, quiz yönetimi, pratik onay |
| Coach | `coach` | HQ | Tüm şubeler, içerik + paket + gate yönetimi, onay |
| CGO | `cgo` | HQ | Gate-3+ onay, strateji, analitik |
| Admin | `admin` | System | Tam yetki, gate kuralı düzenleme |

**Kapsam dışı roller:** `ceo`, `muhasebe_ik`, `marketing`, `kalite_kontrol`, `gida_guvenligi`, `fabrika_muduru`, `fabrika_operasyon`, `fabrika_formen`, `fabrika_isci`, `yatirimci` — Bu roller Academy V2 modülüne erişmez. İhtiyaç halinde salt-okunur analitik endpoint'i ile veri sağlanabilir.

### İşlem Yetkileri

#### My Path (Benim Yolum)

| İşlem | Stajyer | Bar Buddy | Barista | Sup Buddy | Supervisor | Mudur | Trainer | Coach | CGO |
|-------|---------|-----------|---------|-----------|------------|-------|---------|-------|-----|
| Kendi yolunu gör | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | - |
| Adım tamamla | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | - | - |
| Quiz çöz | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | - | - |
| Ekip yollarını gör | - | - | - | - | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Content (İçerik Yönetimi)

| İşlem | Stajyer | Bar Buddy | Barista | Supervisor | Mudur | Trainer | Coach | CGO |
|-------|---------|-----------|---------|------------|-------|---------|-------|-----|
| Modül görüntüle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modül oluştur | - | - | - | - | - | ✅ | ✅ | - |
| Modül düzenle | - | - | - | - | - | ✅ | ✅ | - |
| Modül sil | - | - | - | - | - | - | ✅ | - |
| Modül yayınla | - | - | - | - | - | - | ✅ | ✅ |
| İçerik paketi oluştur | - | - | - | - | - | ✅ | ✅ | - |
| İçerik paketi düzenle | - | - | - | - | - | ✅ | ✅ | - |
| Quiz oluştur/düzenle | - | - | - | - | - | ✅ | ✅ | - |

#### Gate (Seviye Kapısı)

| İşlem | Stajyer | Bar Buddy | Barista | Supervisor | Mudur | Trainer | Coach | CGO |
|-------|---------|-----------|---------|------------|-------|---------|-------|-----|
| Gate sınavı çöz | ✅ | ✅ | ✅ | ✅ | - | - | - | - |
| Terfi talebi oluştur | - | - | - | ✅ | ✅ | - | ✅ | - |
| Pratik değerlendirme onayla | - | - | - | ✅ | ✅ | ✅ | ✅ | - |
| Gate talebi onayla | - | - | - | - | - | - | ✅ | ✅ |
| Gate sonucu gör | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gate kurallarını düzenle | - | - | - | - | - | - | ✅ | ✅ |

#### KPI & Analitik

| İşlem | Stajyer | Bar Buddy | Barista | Supervisor | Mudur | Trainer | Coach | CGO |
|-------|---------|-----------|---------|------------|-------|---------|-------|-----|
| Kendi KPI'larını gör | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | - |
| Ekip KPI'larını gör | - | - | - | ✅ | ✅ | - | ✅ | ✅ |
| KPI kuralı oluştur/düzenle | - | - | - | - | - | - | ✅ | ✅ |
| Analitik dashboard | - | - | - | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Onboarding Yönetimi

| İşlem | Supervisor | Mudur | Trainer | Coach | CGO |
|-------|------------|-------|---------|-------|-----|
| Onboarding başlat (personel ata) | ✅ | ✅ | - | ✅ | - |
| Mentor ata | ✅ | ✅ | - | ✅ | - |
| Günlük adım onayla | ✅ | ✅ | ✅ | ✅ | - |
| Onboarding şablonu oluştur | - | - | ✅ | ✅ | - |
| Onboarding şablonu düzenle | - | - | ✅ | ✅ | - |
| Onboarding raporunu gör | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. KPI Sinyal → İçerik Eşleştirme (Detaylı)

### Sinyal Tanımları

#### 1. Yüksek Fire/Zayi Oranı
```yaml
signal_key: high_waste
metric_source: waste_rate
metric_table: production_batches
threshold_type: above
threshold_value: 5.0  # %5'ten fazla
evaluation_period_days: 30
target_roles: [barista, bar_buddy]
recommended_action: assign_training
recommended_module: "Kayıp Önleme & Stok Yönetimi"
notify_roles: [coach, supervisor]
severity: warning
```

#### 2. Soğuk Zincir İhlali
```yaml
signal_key: cold_chain_violation
metric_source: checklist_violation
metric_table: checklist_completions
threshold_type: equals
threshold_value: 1  # Herhangi bir ihlal
evaluation_period_days: 7
target_roles: [barista, bar_buddy, stajyer]
recommended_action: assign_training
recommended_module: "Soğuk Zincir Protokolü & HACCP"
notify_roles: [coach, supervisor, mudur]
severity: critical
```

#### 3. Düşük Quiz Performansı
```yaml
signal_key: low_quiz_score
metric_source: quiz_average
metric_table: quiz_results
threshold_type: below
threshold_value: 60  # %60'ın altında
evaluation_period_days: 14
target_roles: [stajyer, bar_buddy, barista]
recommended_action: retake_module
recommended_module: null  # İlgili modülün kendisi tekrar atanır
notify_roles: [trainer]
severity: info
```

#### 4. Yüksek Devamsızlık
```yaml
signal_key: high_absence
metric_source: attendance_rate
metric_table: shift_attendance
threshold_type: below
threshold_value: 90  # %90'ın altında
evaluation_period_days: 30
target_roles: [stajyer, bar_buddy, barista, supervisor_buddy]
recommended_action: notify_coach
recommended_module: null  # Eğitim değil, HR bildirimi
notify_roles: [coach, mudur]
severity: warning
```

#### 5. Geç Checklist Tamamlama
```yaml
signal_key: late_checklist
metric_source: late_completion_rate
metric_table: checklist_completions
threshold_type: above
threshold_value: 20  # %20'den fazla geç
evaluation_period_days: 14
target_roles: [barista, bar_buddy]
recommended_action: assign_training
recommended_module: "Zaman Yönetimi & Prosedürler"
notify_roles: [supervisor]
severity: info
```

#### 6. Müşteri Şikayeti (Ürün Bazlı)
```yaml
signal_key: product_complaint
metric_source: complaint_count
metric_table: product_complaints
threshold_type: above
threshold_value: 1  # 1'den fazla
evaluation_period_days: 30
target_roles: [barista, bar_buddy]
recommended_action: assign_training
recommended_module: null  # İlgili ürün reçetesi tekrar atanır
notify_roles: [trainer, coach]
severity: warning
```

#### 7. Gate Başarısızlığı
```yaml
signal_key: gate_failure
metric_source: gate_result
metric_table: gate_attempts
threshold_type: equals
threshold_value: 0  # Başarısız
evaluation_period_days: 1
target_roles: [stajyer, bar_buddy, barista, supervisor_buddy]
recommended_action: assign_training
recommended_module: null  # Başarısız bileşenlerin ilgili modülleri
notify_roles: [coach, supervisor]
severity: critical
```

### Sinyal Değerlendirme Döngüsü

```
Her gün 08:00'da (veya background job olarak 6 saatte bir):
1. Tüm aktif kpi_signal_rules kurallarını al
2. Her kural için:
   a. target_roles'deki tüm kullanıcıları bul
   b. İlgili metric_table'dan evaluation_period_days içindeki veriyi sorgula
   c. threshold_value ile karşılaştır
   d. Eşik aşıldıysa:
      - Kullanıcının My Path'ine recommended_module ekle (Öncelik 3)
      - notify_roles'deki kişilere bildirim gönder
      - Aynı sinyal için 7 gün içinde tekrar bildirim gönderme (debounce)
```

---

## 5. İçerik Yaşam Döngüsü

### Modül Durumları
```
draft → review → published → archived
  │        │         │
  │        └─ reject → draft
  │
  └─ Coach/Trainer oluşturur
```

### Sertifika Geçerliliği
- Her modül tamamlama kaydının geçerlilik süresi: 365 gün (varsayılan)
- Kritik modüller (HACCP, Hijyen): 180 gün
- Süresi dolan modüller → NBA'da "Tazelendirme" olarak önerilir (Öncelik 6)
- Sertifika yenileme: Modülü tekrar tamamlama + quiz geçme

### Quiz Kuralları
- Cooldown: Quiz başarısız → 24 saat bekleme (modül quizleri)
- Gate sınavı cooldown: Kural başına ayarlanabilir (varsayılan 7 gün)
- Maksimum deneme: Modül quizi 3 kez, gate sınavı gate_attempts.max_retries kadar
- Soru havuzu: Her quiz için N soruluk havuzdan M soru rastgele seçilir

---

## 6. API Endpoint Planı (MVP)

### My Path Endpoints
```
GET  /api/academy/my-path                    → Kullanıcının mevcut yolu + NBA listesi
GET  /api/academy/my-path/progress           → İlerleme özeti (%, seviye, gate durumu)
POST /api/academy/my-path/complete-item      → Adım tamamlama
```

### Gate Endpoints
```
GET  /api/academy/gates                      → Tüm gate tanımları
GET  /api/academy/gates/:id                  → Gate detayı
POST /api/academy/gates/:id/attempt          → Gate denemesi başlat
PATCH /api/academy/gates/:id/attempt/:aId    → Gate denemesi güncelle
POST /api/academy/gates/:id/approve          → Gate onaylama (Coach)
```

### Content Pack Endpoints
```
GET  /api/academy/packs                      → İçerik paketleri listesi
GET  /api/academy/packs/:id                  → Paket detayı + items
POST /api/academy/packs                      → Paket oluştur (Coach/Trainer)
PUT  /api/academy/packs/:id                  → Paket güncelle
POST /api/academy/packs/:id/assign           → Paketi kullanıcıya ata
```

### KPI Signal Endpoints
```
GET  /api/academy/kpi-signals                → Aktif sinyaller (Coach görünümü)
GET  /api/academy/kpi-signals/user/:id       → Kullanıcının tetiklenen sinyalleri
POST /api/academy/kpi-signals/evaluate       → Manuel sinyal değerlendirmesi tetikle
```

### Team Progress Endpoints (Coach/Trainer)
```
GET  /api/academy/team-progress              → Tüm ekip ilerleme özeti
GET  /api/academy/team-progress/:userId      → Kullanıcı detaylı ilerleme
GET  /api/academy/team-progress/alerts       → Uyarılar (gecikme, sinyal, gate başarısızlık)
```
