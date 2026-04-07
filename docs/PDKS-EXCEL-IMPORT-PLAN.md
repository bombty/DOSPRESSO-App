# DOSPRESSO — PDKS Excel İçe Aktarma Sistemi
## Mimari Plan & Sprint Takvimi
### 7 Nisan 2026

---

## 1. İŞ GEREKSİNİMİ

### Sorun
Pilot başlangıcında (Nisan 2026) personelin geçmiş devam kayıtları yok.
Mevcut PDKS cihazı Excel export veriyor. Sistem kiosk giriş/çıkışı henüz
aktif olmadığında, Excel'den veri alabilmeli.

### İki Kullanım Senaryosu

| # | Senaryo | Amaç | Puantaj Etkisi |
|---|---------|------|----------------|
| 1 | **Geçmiş ay import** (Ocak-Mart 2026) | İstatistik, uyumluluk skoru | ❌ Eksik/fazla mesai HESAPLANMAyacak |
| 2 | **Güncel ay import** (opsiyonel, devam eden) | Kiosk alternatifi, puantaj girişi | ✅ Normal puantaj hesaplaması AKTİF |

### Kritik İş Kuralı
> Geçmiş ayların eksik/fazla mesaileri İK-Muhasebe tarafından mutabık
> kalınarak ödenmiştir. İmport edilen eski veriler sadece **istatistiksel
> amaçlı** tutulacak — personelin genel vardiya uyumluluğu, devam trendi,
> ortalama çalışma saati gibi metrikler için. **Kesinlikle** eski aylara
> ait fazla mesai hesaplanarak güncel bordro hesabına eklenmeyecek.

---

## 2. MEVCUT VERİ ANALİZİ

### 2a. PDKS Excel Formatı (MART_GİRİŞ_ÇIKIŞ.xlsx)
```
Sütunlar: SIRA NO | KOD | İSİM | TARİH
Satır sayısı: 721
Personel: 15 kişi
Tarih aralığı: 2026-03-01 → 2026-04-01
```

**Okutma deseni (günlük):**
- 4 okutma/gün: %64 (giriş → mola çıkış → mola giriş → çıkış)
- 3 okutma/gün: %19 (tek mola veya eksik okutma)
- 1 okutma/gün: %13 (sadece giriş, çıkış eksik)
- 5-6 okutma/gün: %3 (çoklu mola)

**Giriş/çıkış çıkarım kuralı:**
- İlk okutma = GİRİŞ
- Son okutma = ÇIKIŞ
- Aradaki okutmalar = MOLA (çiftler halinde: çıkış/giriş)
- Tek okutma = Sadece giriş (çıkış eksik — uyarı üretilecek)

### 2b. Maaş Excel Formatı (Lara_Sube_Maas_2026_replit.xlsx)
```
Sheet'ler: Varsayımlar, Ocak 2026, Şubat 2026, Mart 2026
```

**Sütunlar (personel satırları):**
| Alan | Açıklama | PDKS'ten Hesaplanabilir? |
|------|----------|------------------------|
| Çalışılan Gün | Fiili çalışma günü | ✅ PDKS'ten |
| Off Gün | Haftalık izin | ✅ Off kalıbıyla |
| Eksik Gün | Devam takip günü - çalışılan - off | ✅ Hesaplanır |
| Ücretsiz İzin | Elle girilir | ❌ Manuel |
| Mesai Gün (Bayram/Tatil) | Bayram/resmi tatilde çalışma | ⚠️ Takvimle birlikte |
| FM Dakika (30dk↑ fazla mesai) | 30 dk üzeri fazla çalışma | ✅ PDKS saatlerinden |
| Raporlu Gün | Sağlık raporu | ❌ Manuel |

### 2c. Çapraz Doğrulama (PDKS vs Maaş — Mart 2026)
```
İsim            PDKS Gün  Maaş Gün  Fark  Açıklama
jennifer              31        27    +4  Off günleri PDKS'te sayılıyor
eren                  30        27    +3  Off günleri
efe                   28        25    +3  Off günleri
berkan                28        25    +3  Off günleri
veysel                29        27    +2  Off günleri
gul                   22        22     0  Tam eşleşme
tugba                  8         8     0  Tam eşleşme
```
**Sonuç:** PDKS'te off günleri de sayılıyor (kart okutma var).
Çalışılan gün = PDKS gün - off gün. Off tespiti için sistemdeki
`scheduled_offs` tablosuyla çapraz kontrol gerekli.

---

## 3. VERİTABANI TASARIMI

### 3a. Yeni Tablolar

```sql
-- Import batch kaydı
CREATE TABLE pdks_excel_imports (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  month INTEGER NOT NULL,          -- 1-12
  year INTEGER NOT NULL,           -- 2026
  file_name TEXT NOT NULL,
  import_type TEXT NOT NULL,       -- 'current' | 'historical'
  status TEXT DEFAULT 'processing', -- processing, completed, error
  total_records INTEGER DEFAULT 0,
  matched_records INTEGER DEFAULT 0,
  unmatched_records INTEGER DEFAULT 0,
  warnings JSONB DEFAULT '[]',
  imported_by INTEGER REFERENCES users(id),
  is_finalized BOOLEAN DEFAULT FALSE, -- kilitleme (geri alınamaz)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by INTEGER REFERENCES users(id)
);

-- Her bir okutma kaydı (ham veri)
CREATE TABLE pdks_excel_records (
  id SERIAL PRIMARY KEY,
  import_id INTEGER NOT NULL REFERENCES pdks_excel_imports(id),
  source_row_no INTEGER,           -- Excel SIRA NO
  source_code TEXT,                -- Excel KOD
  source_name TEXT,                -- Excel İSİM
  swipe_time TIMESTAMPTZ NOT NULL,
  matched_user_id INTEGER REFERENCES users(id), -- eşleşen personel
  match_method TEXT,               -- 'code' | 'name' | 'manual' | null
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Günlük özet (hesaplanmış)
CREATE TABLE pdks_daily_summary (
  id SERIAL PRIMARY KEY,
  import_id INTEGER NOT NULL REFERENCES pdks_excel_imports(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  work_date DATE NOT NULL,
  first_swipe TIMESTAMPTZ,         -- ilk okutma (giriş)
  last_swipe TIMESTAMPTZ,          -- son okutma (çıkış)
  total_swipes INTEGER DEFAULT 0,
  gross_minutes INTEGER DEFAULT 0,  -- giriş-çıkış arası dakika
  break_minutes INTEGER DEFAULT 0,  -- mola dakikaları
  net_minutes INTEGER DEFAULT 0,    -- fiili çalışma dakikası
  overtime_minutes INTEGER DEFAULT 0, -- fazla mesai (varsa)
  is_off_day BOOLEAN DEFAULT FALSE,
  is_holiday BOOLEAN DEFAULT FALSE,
  is_historical BOOLEAN DEFAULT FALSE, -- eski ay verisi (puantaja etki etmez)
  warnings JSONB DEFAULT '[]',     -- eksik çıkış, anormal saat vs.
  UNIQUE(import_id, user_id, work_date)
);

-- Aylık istatistik özeti (eski aylar için)
CREATE TABLE pdks_monthly_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_work_days INTEGER DEFAULT 0,
  total_off_days INTEGER DEFAULT 0,
  total_absent_days INTEGER DEFAULT 0,
  avg_daily_minutes REAL DEFAULT 0,
  total_overtime_minutes INTEGER DEFAULT 0,
  total_late_count INTEGER DEFAULT 0,   -- geç gelme
  total_early_leave_count INTEGER DEFAULT 0, -- erken çıkma
  compliance_score REAL DEFAULT 0,  -- 0-100 uyumluluk skoru
  is_historical BOOLEAN DEFAULT FALSE,
  source_import_id INTEGER REFERENCES pdks_excel_imports(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id, month, year)
);
```

### 3b. Personel Eşleştirme

PDKS cihazında personel `KOD` ve `İSİM` ile tanınıyor.
Sistemdeki `users` tablosunda bu alanlar doğrudan yok.

**Eşleştirme stratejisi (3 katman):**

```
1. pdks_employee_mappings tablosu (manuel eşleştirme)
   → KOD: 55, İSİM: "efe" → user_id: 234 (EFE YÜKSEL)

2. İsim benzerliği (fuzzy match)
   → "jennifer" → "DİLARA JENNEFER ELMAS" (Levenshtein < 3)

3. Manuel atama UI
   → Eşleşmeyen kayıtlar listesi → dropdown ile user seçimi
```

```sql
CREATE TABLE pdks_employee_mappings (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  pdks_code TEXT NOT NULL,          -- cihaz kodu
  pdks_name TEXT NOT NULL,          -- cihazdaki isim
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  UNIQUE(branch_id, pdks_code)
);
```

---

## 4. API TASARIMI

### 4a. Import Endpoints

```
POST   /api/pdks/import/upload
       Body: multipart/form-data { file, branchId, month, year, importType }
       Yetki: admin, muhasebe, muhasebe_ik, mudur
       → Excel parse → pdks_excel_records INSERT
       → Otomatik eşleştirme dene
       → Response: { importId, totalRecords, matched, unmatched, warnings }

GET    /api/pdks/import/:importId/preview
       → Eşleşme durumu, günlük özet preview (onay öncesi)

POST   /api/pdks/import/:importId/match
       Body: { mappings: [{ pdksCode, pdksName, userId }] }
       → Manuel eşleştirme kaydet

POST   /api/pdks/import/:importId/finalize
       → pdks_daily_summary hesapla
       → pdks_monthly_stats hesapla
       → importType='current' ise → pdks_records tablosuna da yaz (mevcut puantaj sistemiyle entegre)
       → importType='historical' ise → sadece istatistik (is_historical=true)

GET    /api/pdks/imports
       Query: branchId, year
       → Import geçmişi listesi

DELETE /api/pdks/import/:importId
       → Sadece is_finalized=false ise silinebilir
```

### 4b. İstatistik & Raporlama Endpoints

```
GET    /api/pdks/stats/monthly
       Query: userId, branchId, month, year
       → Aylık istatistik özeti

GET    /api/pdks/stats/yearly
       Query: userId, year
       → Yıllık trend (12 ay grafik verisi)

GET    /api/pdks/stats/compliance
       Query: branchId, month, year
       → Şube bazlı uyumluluk skoru

GET    /api/pdks/daily/:userId
       Query: month, year
       → Günlük detay (giriş/çıkış/mola/net çalışma)
```

---

## 5. FRONTEND TASARIMI

### 5a. PDKS Import Sayfası (/ik/pdks-import)
```
┌──────────────────────────────────────────────┐
│  PDKS Excel İçe Aktarma                       │
├──────────────────────────────────────────────┤
│                                              │
│  Şube: [Lara ▼]  Ay: [Mart ▼]  Yıl: [2026] │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 📎 Excel dosyasını sürükleyin veya  │    │
│  │    tıklayarak seçin (.xlsx)         │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  İçe Aktarma Tipi:                           │
│  ◉ Geçmiş Ay (Sadece İstatistik)            │
│     ⚠️ Eksik/fazla mesai hesaplanmayacak     │
│  ○ Güncel Ay (Puantaj Hesaplaması Aktif)     │
│     ✅ Normal PDKS kaydı olarak işlenir      │
│                                              │
│  [📤 Yükle ve Analiz Et]                    │
│                                              │
├──────────────────────────────────────────────┤
│  Eşleştirme Sonucu (15 personel)            │
│                                              │
│  ✅ 12 personel otomatik eşleşti             │
│  ⚠️  3 personel manuel eşleştirme bekliyor   │
│                                              │
│  PDKS Kodu  PDKS İsim     Sistem Eşleşmesi  │
│  ─────────────────────────────────────────── │
│  55         efe           [EFE YÜKSEL     ▼] │
│  22         eren          [EREN DEMİR     ▼] │
│  13         gul           [GÜL DEMİR     ▼]  │
│  ...                                         │
│  ⚠️ 32      deniz         [Seçiniz...     ▼] │
│  ⚠️ 17      goktug^       [Seçiniz...     ▼] │
│  ⚠️ 12      burcu         [Seçiniz...     ▼] │
│                                              │
│  [💾 Eşleştirmeleri Kaydet]                  │
│                                              │
├──────────────────────────────────────────────┤
│  Önizleme (721 kayıt → 15 kişi, 31 gün)    │
│                                              │
│  Ad Soyad           Aktif Gün  Ort.Saat  FM  │
│  ──────────────────────────────────────────  │
│  EREN DEMİR         30         8:42      5h  │
│  EFE YÜKSEL         28         9:15      3h  │
│  DİLARA J. ELMAS    31         8:30      2h  │
│  ...                                         │
│                                              │
│  [✅ Onayla ve İçe Aktar]                    │
│                                              │
└──────────────────────────────────────────────┘
```

### 5b. Personel PDKS Geçmişi (Mevcut profil sayfasına tab)
```
Personel Profili → "PDKS Geçmişi" Tab

┌──────────────────────────────────────────────┐
│  PDKS Geçmişi — EREN DEMİR                   │
│                                              │
│  📊 12 Aylık Trend (Ocak-Aralık 2026)       │
│  ┌──────────────────────────────────────┐    │
│  │  ██████████████████████              │    │
│  │  Oca  Şub  Mar  Nis  May  Haz ...   │    │
│  │  27g  26g  30g   -    -    -        │    │
│  │  8:15 8:30 8:42  -    -    -        │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Uyumluluk Skoru: 92/100                     │
│  Geç Gelme: 3 kez/ay ort.                   │
│  Erken Çıkma: 1 kez/ay ort.                 │
│                                              │
│  ⚠️ Ocak-Mart 2026: Geçmiş veri             │
│     (istatistiksel — puantaja etkisi yok)    │
│                                              │
│  📅 Mart 2026 Detay                          │
│  ┌──────────────────────────────────────┐    │
│  │ Gün    Giriş  Çıkış   Net    Durum  │    │
│  │ 01/03  17:06  20:30   3:24   ⚠️     │    │
│  │ 03/03  07:14  16:41   8:27   ✅     │    │
│  │ 04/03  07:26  17:00   8:34   ✅     │    │
│  │ 05/03  07:32  16:32   8:00   ✅     │    │
│  │ ...                                  │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 6. İŞ KURALLARI

### 6a. Geçmiş Ay Import (importType = 'historical')
1. Veriler `is_historical = true` olarak kaydedilir
2. `pdks_monthly_stats` hesaplanır ama **puantaj/bordro hesabına ETKİ ETMEZ**
3. Fazla mesai dakikaları hesaplanır ama sadece **istatistiksel amaçlı**
4. Personel profilinde "Geçmiş Veri" badge'i ile gösterilir
5. Uyumluluk skoru hesaplanır (zamanında gelme, düzenli çalışma)
6. Dobody bu verileri personel trend analizi için kullanabilir

### 6b. Güncel Ay Import (importType = 'current')
1. Veriler `is_historical = false` olarak kaydedilir
2. `pdks_records` tablosuna da yazılır (mevcut PDKS sistemiyle entegre)
3. Normal puantaj hesaplaması yapılır (eksik gün, fazla mesai, geç gelme)
4. Bordro hesabına dahil edilir
5. Kiosk giriş/çıkışının **alternatifi** — ikisi aynı anda kullanılmaz
6. Eğer hem kiosk hem Excel varsa → çakışma uyarısı

### 6c. Uyumluluk Skoru Hesaplama
```
Skor = (
  zamanında_gelme_oranı × 30 +     -- %30
  tam_mesai_tamamlama × 30 +        -- %30
  off_düzenine_uyum × 20 +          -- %20
  eksik_gün_azlığı × 20             -- %20
) / 100
```

### 6d. Fazla Mesai Tespiti (FM)
- Standart mesai: 8 saat (480 dk) veya vardiya planına göre
- FM = net çalışma - planlanan süre (sadece 30 dk üzeri sayılır)
- İlk 30 dk FM → sayılmaz (tolerans)
- 30 dk üzeri FM → 1.5 × günlük ücret / 8 saat

### 6e. Mola Hesaplama
- Gün içi çift okutmalar: (2. okutma = mola çıkış, 3. okutma = mola giriş)
- Mola süresi = mola çıkış - mola giriş
- Standart mola: 30-45 dk
- Uzun mola uyarısı: > 60 dk

---

## 7. SPRINT PLANI

### Sprint PDKS-1: Temel Import Altyapısı (~4 saat)
- [ ] Schema: 5 yeni tablo (pdks_excel_imports, records, daily_summary, monthly_stats, employee_mappings)
- [ ] API: Upload + parse endpoint
- [ ] Personel eşleştirme (otomatik + manuel)
- [ ] Frontend: Import sayfası (upload + eşleştirme UI)

### Sprint PDKS-2: Hesaplama Motoru (~3 saat)
- [ ] Günlük özet hesaplama (giriş/çıkış/mola/net/FM)
- [ ] Aylık istatistik hesaplama
- [ ] Uyumluluk skoru hesaplama
- [ ] Historical vs current ayrımı (puantaj entegrasyonu)
- [ ] Frontend: Önizleme + onay akışı

### Sprint PDKS-3: Raporlama & Entegrasyon (~3 saat)
- [ ] Personel profili PDKS tab'ı
- [ ] 12 aylık trend grafiği
- [ ] Şube bazlı uyumluluk raporu
- [ ] Dobody entegrasyonu (düşük uyumluluk → uyarı)
- [ ] İK dashboard'a PDKS KPI widget'ları

### Sprint PDKS-4: İleri Özellikler (~2 saat)
- [ ] Çoklu şube batch import
- [ ] PDKS cihazı format tespiti (farklı üreticiler)
- [ ] Export: Sistem PDKS → Excel (geriye uyumluluk)
- [ ] Maaş tablosu otomatik oluşturma (PDKS + maaş verisi)

---

## 8. YETKİ MATRİSİ

| Rol | Import | Eşleştirme | Onay | İstatistik Görüntüle |
|-----|--------|-----------|------|---------------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| muhasebe / muhasebe_ik | ✅ | ✅ | ✅ | ✅ |
| mudur | ✅ (kendi şubesi) | ✅ | ❌ | ✅ (kendi şubesi) |
| ceo / cgo | ❌ | ❌ | ❌ | ✅ (tüm şubeler) |
| supervisor | ❌ | ❌ | ❌ | ✅ (kendi şubesi) |

---

## 9. MANİFEST & PERMISSIONS GÜNCELLEMESİ

```typescript
// module-manifest.ts → yeni sub-module
{
  module: 'ik',
  subModule: 'pdks-import',
  allowedRoles: ['admin', 'muhasebe', 'muhasebe_ik', 'mudur'],
}

// schema-02.ts PERMISSIONS → yeni kayıt
pdks_import: {
  view: ['admin', 'muhasebe', 'muhasebe_ik', 'mudur', 'ceo', 'cgo', 'supervisor'],
  create: ['admin', 'muhasebe', 'muhasebe_ik', 'mudur'],
  approve: ['admin', 'muhasebe', 'muhasebe_ik'],
}
```

---

## 10. TEKNİK NOTLAR

### Excel Parse Yaklaşımı
```typescript
// Server-side: xlsx kütüphanesi (zaten projede var)
import * as XLSX from 'xlsx';

// Auto-detect format:
// Sütun 1: SIRA NO (number) → PDKS format
// Sütun 1: # veya Personel → Maaş tablosu format
```

### Tarih Parse
```typescript
// Excel tarih = serial number veya ISO string
// "2026-03-01 07:57:37" → new Date()
// 46082.33 → Excel serial → JS Date
```

### Performans
- 721 kayıt = küçük dosya, tek seferde parse
- 25 şube × 12 ay × 30 personel = max ~100k kayıt/yıl
- Batch insert: `db.insert(pdksExcelRecords).values(records)`

---

## 11. ÖNCELİK VE BAĞIMLILIKLAR

```
DuyuruStudioV2 D-R2, D-R3  →  Duyuru sistemi tamamlansın
Fabrika F2                  →  Üretim-vardiya bağlantısı
─── SONRA ───
PDKS-1 (Import altyapısı)  →  Schema + API + UI
PDKS-2 (Hesaplama)          →  Motor + Entegrasyon
PDKS-3 (Raporlama)          →  Trend + Dashboard
PDKS-4 (İleri)              →  Batch + Export
```

**Tahmini toplam:** ~12 saat (4 sprint)
**Bağımlılık:** Mevcut pdks_records, shift_sessions, payroll tabloları
