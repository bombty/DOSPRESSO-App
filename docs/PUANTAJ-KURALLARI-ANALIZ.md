# DOSPRESSO — Puantaj & Maaş Hesaplama Kuralları
## Çok Boyutlu Analiz Raporu
### 7 Nisan 2026

---

## BAKIŞ AÇISI 1: İŞ KANUNU & YASAL ÇERÇEVE

### 1.1 Günlük Ücret Hesabı (İş Kanunu Md.49)
```
Günlük Ücret = Aylık Toplam Maaş ÷ 30
```
Sabit bölen **30** — ayın kaç gün olduğu fark etmez (28/30/31).
Bu yasal standarttır ve Şubat 2026'dan itibaren DOSPRESSO da bunu kullanmakta.

> ⚠️ **Dikkat**: Ocak 2026'da DOSPRESSO farklı hesaplama kullanmış
> (÷27 yani aylık çalışma gününe bölmüş). Bu Şubat'tan itibaren
> düzeltilmiş. Sistem HER ZAMAN ÷30 kullanmalı.

### 1.2 Fazla Mesai (İş Kanunu Md.41)
```
Saatlik Ücret = Aylık Maaş ÷ (30 × 8) = Aylık Maaş ÷ 240
FM Ücreti = Saatlik Ücret × 1.5 × FM Saat
```
- Haftalık çalışma süresi: 45 saat (İş Kanunu)
- Günlük normal mesai: ~7.5 veya 8 saat (vardiya planına göre)
- 30 dk'ya kadar fazla çalışma → sayılmaz (DOSPRESSO iç kuralı)
- 30 dk üzeri → FM olarak hesaplanır

**Excel doğrulaması:**
```
EREN DEMİR (Mart 2026):
  FM = 550 dakika = 9.167 saat
  Saatlik = 41000 ÷ 240 = 170.833 TL
  FM tutarı = 170.833 × 1.5 × 9.167 = 2,348.96 TL ✓
```

### 1.3 Tatil/Bayram Mesaisi
```
Tatil Mesai Tutarı = Günlük Ücret × Tatil Çalışılan Gün
```
Excel verilerine göre mevcut hesaplama **×1** ile yapılıyor (ilave günlük ücret).
İş Kanunu'na göre resmi tatillerde çalışma ücreti **×2** olmalı ama
DOSPRESSO'nun uyguladığı formül ×1. Bu durumu netleştirmek gerekir.

**Excel doğrulaması:**
```
EREN DEMİR (Mart 2026):
  Mesai Gün = 3.5 gün
  Mesai Gün Tutarı = 1366.67 × 3.5 = 4,783.33 TL ✓
  (×1 uygulanmış, ×2 DEĞİL)
```

> ❓ **ASLAN'A SORU**: Tatil mesaisi ×1 mi ×2 mi olmalı?
> Excel'deki mevcut uygulama ×1 görünüyor. İş Kanunu ×2 diyor.
> Sistem hangisini kullanacak?

### 1.4 Devamsızlık Kesintisi
```
Kesinti = Eksik Gün × Günlük Ücret
```
⚠️ Şubat 2026'da **"+1 kuralı"** uygulanmış:
```
Kesinti = (Eksik Gün + 1) × Günlük Ücret
```
Bu Mart'ta kaldırılmış. Yani bu kural **aya/döneme özel konfigüre edilebilir** bir parametre.

**Excel doğrulaması (Şubat 2026 — +1 kuralı):**
```
BERKAN BOZDAĞ: 2 eksik → kesinti = 3 × 1200 = 3,600 ✓ (eksik+1)
GÜL DEMİR:    3 eksik → kesinti = 4 × 1200 = 4,800 ✓ (eksik+1)
```

**Excel doğrulaması (Mart 2026 — +1 yok):**
```
BERKAN BOZDAĞ: 1 eksik → kesinti = 1 × 1200 = 1,200 ✓ (eksik×1)
```

---

## BAKIŞ AÇISI 2: DOSPRESSO İÇ KURALLARI

### 2.1 Maaş Yapısı (Pozisyon Bazlı)
```
Toplam Maaş = Taban Maaş + Kasa Primi + Performans Primi
```

| Pozisyon | Toplam | Taban | Kasa Prim | Perf. Prim |
|----------|--------|-------|-----------|------------|
| Stajyer | 33,000 | 31,000 | 3,500 | 2,000* |
| Bar Buddy | 36,000 | 31,000 | 3,500 | 5,000* |
| Barista | 41,000 | 31,000 | 3,500 | 10,000* |
| Supervisor Buddy | 45,000** | 31,000 | 3,500 | 9,000* |
| Supervisor | 49,000 | 31,000 | 3,500 | 16,000* |

*Performans + Kasa Prim Toplamı = Toplam - Taban
**DENİZ'in Toplam Maaşı Mart'ta 40,000 (Ocak'ta 45,000 — düşürülmüş)

> ⚠️ **Prim yapısı Ocak→Şubat arasında değişmiş!**
> Ocak: Toplam + tek "Prim" kalemi
> Şubat/Mart: Taban + Kasa Prim + Performans ayrı

### 2.2 Devam Takip vs Ücret Böleni (İKİ FARKLI KAVRAM)

| Kavram | Ne? | Nerede kullanılır? | Örnek (Mart) |
|--------|-----|-------------------|--------------|
| **Devam Takip Günü** | Ayın fiili gün sayısı | Eksik gün hesabı | 30 |
| **Günlük Ücret Böleni** | Her zaman 30 (İş K.) | Günlük ücret hesabı | 30 |

```
Eksik Gün = Devam Takip Günü - Çalışılan Gün - Off Gün
```
Mart: 30 - 27(çalışılan) - 4(off) = -1 → 0 (negatif olamaz)
Bu durumda off günleri devam takip gününden düşürülüyor.

### 2.3 Off Günleri (Haftalık İzin)
- Max 4 off gün/ay (haftada 1)
- PDKS cihazında off günleri de okutma olabilir (kart basıyorlar)
- Off günü ≠ eksik gün
- Off planlama: `scheduled_offs` tablosu

### 2.4 Ücretsiz İzin
- Elle girilir (🟡 sarı etiketli)
- Ücretsiz izin günü → maaştan eksik gün kesintisi yapılır
- Ayrıca ücretsiz izin günleri primden de oransal kesinti yapılır:
```
Prim Kesintisi = (Ücretsiz İzin Günü ÷ 30) × Prim Tutarı
```

### 2.5 Yemek Bedeli (Sadece Stajyerler)
```
Yemek Bedeli = Çalışılan Gün × 330 TL/gün
```
Bu sadece **stajyer** pozisyonuna uygulanıyor.
Diğer pozisyonlar yemek bedeli almıyor.

**Doğrulama:**
```
AYBÜKE (Stajyer, 12 gün): 12 × 330 = 3,960 TL ✓
YAĞIZ (Stajyer, 2 gün): 2 × 330 = 660 TL ✓
```

### 2.6 İşten Ayrılan Personel
- çalıştığı gün × günlük ücret olarak hesaplanır
- Prim yok, FM yok
```
BUĞRA SAKIZ (Şubat, işten ayrıldı, 15 gün): 15 × 1100 = 16,500 TL ✓
DENİZ (Mart, 3 gün çalışmış): 3 × 1333.33 ≈ 4,000 TL ✓
```

### 2.7 Raporlu Gün (Sağlık Raporu)
- Elle girilir (🟡)
- Raporlu gün → SGK'dan ödenir
- Maaştan kesinti yapılmaz ama çalışılan gün olarak da sayılmaz
- Sistem: `sick_leave` olarak `leave_requests` tablosunda

### 2.8 "+1 Ceza Kuralı" (Konfigüre Edilebilir)
Bazı aylarda DOSPRESSO şu kuralı uyguluyor:
```
Eksik gün ≥ 1 ise → Kesinti günü = Eksik gün + 1
```
Bu bir "caydırıcı ceza" — devamsızlığı azaltmak için.
Aylık olarak açılıp kapatılabilir olmalı.

---

## BAKIŞ AÇISI 3: MEVCUT SİSTEM VS EXCEL FARKLARI

### 3.1 Mevcut Sistem (payroll-engine.ts + pdks-engine.ts)

| Özellik | Mevcut Sistem | Excel Gerçeği | Durum |
|---------|--------------|---------------|-------|
| Günlük ücret böleni | ÷30 ✅ | ÷30 (Şubat+) | ✅ Uyumlu |
| FM hesabı | saat × saatlik × 1.5 | dakika → saat × saatlik × 1.5 | ✅ Uyumlu |
| FM eşiği | Yok (tüm FM sayılıyor) | 30 dk altı sayılmaz | ❌ EKSİK |
| Tatil mesaisi | Yok | günlük ücret × tatil gün | ❌ EKSİK |
| Off gün sınırı | max 4 (effectiveOffDays) | max 4 | ✅ Uyumlu |
| "+1 ceza" kuralı | Yok | Aylık konfigüre edilebilir | ❌ EKSİK |
| Yemek bedeli | Yok | Stajyer: 330 TL/gün | ❌ EKSİK |
| Prim kesintisi (ücretsiz izin) | bonusDeduction ÷ 30 × bonus | Aynı | ✅ Uyumlu |
| İşten ayrılan hesabı | workedDays × dailyRate | Aynı | ✅ Uyumlu |
| Kasa prim ayrımı | Toplam = taban + bonus (tek) | Taban + Kasa + Performans (ayrı) | ⚠️ GELİŞTİRİLMELİ |
| Geç gelme dakikası | shiftAttendance'ta var | Excel'de "Saat Farkı" (Ocak) | ⚠️ Hesaba etkisi yok |
| Raporlu gün | sickLeaveDays var | var | ✅ Uyumlu |

### 3.2 Eksik Özellikler (Sisteme Eklenmesi Gereken)

**P0 — Kritik (puantaj doğruluğu için):**
1. FM 30 dk eşiği — ilk 30 dk sayılmamalı
2. Tatil/bayram mesai hesabı (publicHolidays tablosuyla)
3. "+1 ceza" kuralı konfigürasyonu

**P1 — Önemli (Excel uyumluluğu için):**
4. Yemek bedeli (stajyer özel)
5. Kasa prim / performans prim ayrımı
6. Aylık çalışma günü parametresi (devam takip günü)

**P2 — İyileştirme:**
7. Geç gelme analizi & raporlama
8. Maaş değişiklik geçmişi (DENİZ: 45K→40K)

---

## BAKIŞ AÇISI 4: NET MAAŞ HESAPLAMA FORMÜLÜ

### 4.1 Normal Personel (Aktif, Tam Ay)
```
NET ÖDEME = Toplam Maaş
          - (Eksik Gün × Günlük Ücret)      [veya (Eksik+1) × GÜ]
          - (Ücretsiz İzin ÷ 30 × Prim)     [prim kesintisi]
          + (Mesai Gün × Günlük Ücret)        [tatil çalışma]
          + (FM Dakika ÷ 60 × Saatlik × 1.5) [fazla mesai]
          + (Yemek Bedeli)                    [sadece stajyer]
```

### 4.2 Detaylı Hesaplama Adımları
```
ADIM 1: Sabit Parametreler
  günlük_ücret       = toplam_maaş ÷ 30
  saatlik_ücret       = toplam_maaş ÷ 240
  devam_takip_günü   = ayın_gün_sayısı (veya parametrik)

ADIM 2: Devam Hesabı (PDKS veya Excel'den)
  çalışılan_gün      = PDKS giriş olan günler - off_günler
  off_gün             = scheduled_offs (max 4)
  eksik_gün           = devam_takip_günü - çalışılan_gün - off_gün
                        (min 0, negatif olamaz)
  ücretsiz_izin_gün  = leave_requests(type='unpaid', approved)
  raporlu_gün         = leave_requests(type='sick', approved)

ADIM 3: Fazla Mesai (PDKS saatlerinden)
  her_gün_için:
    fiili_çalışma = çıkış_saati - giriş_saati - mola_süresi
    planlanan     = vardiya_bitiş - vardiya_başlangıç
    fark          = fiili_çalışma - planlanan
    eğer fark > 30dk:
      fm_dakika += fark
    (30 dk altı sayılmaz!)
  
  fm_toplam_saat = toplam_fm_dakika ÷ 60

ADIM 4: Tatil/Bayram Mesai
  tatil_günleri = public_holidays ile çakışan çalışılan günler
  mesai_gün_sayısı = tatil_günleri.count
  mesai_tutarı = mesai_gün_sayısı × günlük_ücret (×1 veya ×2?)

ADIM 5: Kesintiler
  gün_kesintisi = eksik_gün × günlük_ücret
  // veya "+1 aktifse":
  gün_kesintisi = (eksik_gün + 1) × günlük_ücret  (eksik>0 ise)
  
  prim_kesintisi = (ücretsiz_izin_gün ÷ 30) × prim_tutarı

ADIM 6: Eklemeler
  yemek_bedeli = (pozisyon == 'stajyer') ? çalışılan_gün × 330 : 0
  fm_tutarı = saatlik_ücret × 1.5 × fm_toplam_saat

ADIM 7: Net Hesap
  net = toplam_maaş
     - gün_kesintisi
     - prim_kesintisi
     + mesai_tutarı
     + fm_tutarı
     + yemek_bedeli
  
  eğer net < 0: net = 0
```

### 4.3 İşten Ayrılan Personel
```
NET ÖDEME = çalışılan_gün × günlük_ücret + yemek_bedeli
```
Prim, FM, mesai hesaplanmaz.

---

## BAKIŞ AÇISI 5: EXCEL IMPORT & GEÇMİŞ VERİ

### 5.1 İki Mod: Geçmiş vs Güncel

| | Geçmiş Ay Import | Güncel Ay Import |
|--|------------------|-----------------|
| **Amaç** | İstatistik, trend, uyumluluk skoru | Aktif puantaj hesaplaması |
| **PDKS → pdks_records** | ❌ Yazılmaz | ✅ Yazılır |
| **Puantaj hesabı** | ❌ Yapılmaz | ✅ Yapılır |
| **FM hesabı** | Sadece istatistik | ✅ Maaşa yansır |
| **Eksik gün** | Sadece istatistik | ✅ Kesinti hesaplanır |
| **Monthly_payroll** | ❌ Oluşturulmaz | ✅ Oluşturulur |
| **Uyumluluk skoru** | ✅ Hesaplanır | ✅ Hesaplanır |
| **Kullanıcıya görünüm** | "📊 Geçmiş Veri" badge | Normal veri |

### 5.2 Neden Geçmiş Veriler Puantajı Etkilememeli?

1. **Mutabakat tamamlanmış**: İK ve muhasebe eski ay sonuçlarını karşılıklı
   onaylamış, ödemeler yapılmış. Geriye dönük hesaplama tutarsızlık yaratır.

2. **Kural değişiklikleri**: Ocak'ta ÷27, Şubat'ta ÷30 kullanılmış.
   Sistemin ÷30 ile geriye dönük hesaplaması Ocak verilerini yanlış gösterir.

3. **Manuel düzeltmeler**: Bazı personelin eksik/fazla mesaisi elle
   düzeltilmiş olabilir. Otomatik hesaplama bu düzeltmeleri yok sayar.

4. **Prim yapısı değişmiş**: Ocak'ta tek prim, Şubat'ta kasa+performans
   ayrımı yapılmış. Geriye uyumluluk zor.

### 5.3 Geçmiş Veri Ne İçin Kullanılır?

```
Personel Trend Kartı:
┌────────────────────────────────────────────┐
│  EREN DEMİR — 3 Aylık Devam Trendi        │
│                                            │
│  Ay       Çalışma  Off  Eksik  FM(dk)  Skor│
│  Oca 26   27       0    0      0       100 │
│  Şub 26   24       4    0      485     98  │
│  Mar 26   27       4    0      550     100 │
│                                            │
│  Ortalama Uyumluluk: 99/100               │
│  Geç Gelme Trendi: 0 kez/ay              │
│  FM Trendi: ↑ artıyor                     │
│                                            │
│  ℹ️ Oca-Mar verisi geçmiş import          │
│     (puantaja etkisi yok)                 │
└────────────────────────────────────────────┘
```

---

## SONUÇ: SİSTEME EKLENMESİ GEREKEN PARAMETRİK YAPILAR

### Yeni Tablo: `payroll_month_config`
Her ay/şube için konfigüre edilebilir parametreler:

```sql
CREATE TABLE payroll_month_config (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),    -- null = tüm şubeler
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  -- Devam
  tracking_days INTEGER NOT NULL,                -- devam takip günü (28/30/31)
  daily_rate_divisor INTEGER DEFAULT 30,         -- günlük ücret böleni (her zaman 30)
  max_off_days INTEGER DEFAULT 4,                -- max haftalık izin
  -- Kesinti
  absence_penalty_plus_one BOOLEAN DEFAULT FALSE,-- "+1 ceza" kuralı
  -- Fazla mesai
  overtime_threshold_minutes INTEGER DEFAULT 30, -- FM eşiği (30 dk altı sayılmaz)
  overtime_multiplier NUMERIC DEFAULT 1.5,       -- FM çarpanı
  holiday_multiplier NUMERIC DEFAULT 1.0,        -- tatil mesai çarpanı (1.0 veya 2.0?)
  -- Stajyer
  meal_allowance_per_day INTEGER DEFAULT 330,    -- yemek bedeli TL/gün
  meal_allowance_roles TEXT[] DEFAULT '{"stajyer"}', -- hangi roller alır
  -- Durum
  is_finalized BOOLEAN DEFAULT FALSE,
  finalized_by INTEGER REFERENCES users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, year, month)
);
```

### Güncellenecek Tablolar

**position_salaries** → Kasa prim ve performans prim ayrımı:
```sql
ALTER TABLE position_salaries
  ADD COLUMN cash_bonus INTEGER DEFAULT 0,       -- kasa primi
  ADD COLUMN performance_bonus INTEGER DEFAULT 0; -- performans primi
-- bonus = cash_bonus + performance_bonus (geriye uyumlu)
```

**payroll-engine.ts** → Güncellenecek hesaplama mantığı:
1. FM 30 dk eşiği eklenmeli
2. Tatil mesai hesabı eklenmeli
3. "+1 ceza" `payroll_month_config`'den okunmalı
4. Yemek bedeli eklenmeli
5. Kasa/performans prim ayrımı

### Payroll Engine v2 Pseudocode
```typescript
async function calculatePayrollV2(userId, year, month) {
  // 1. Config yükle
  const config = await getMonthConfig(branchId, year, month);
  
  // 2. PDKS verisi
  const pdks = await getMonthClassification(userId, year, month);
  
  // 3. Tatil günleri
  const holidays = await getPublicHolidays(year, month);
  const workedHolidays = pdks.days.filter(d =>
    d.status === 'worked' && holidays.has(d.date)
  );
  
  // 4. FM hesabı (30 dk eşikli)
  let totalFM = 0;
  for (const day of pdks.days) {
    if (day.overtimeMinutes > config.overtime_threshold_minutes) {
      totalFM += day.overtimeMinutes;
    }
    // 30 dk altı → 0 (sayılmaz)
  }
  
  // 5. Kesinti
  let absenceDeduction = pdks.absentDays * dailyRate;
  if (config.absence_penalty_plus_one && pdks.absentDays > 0) {
    absenceDeduction = (pdks.absentDays + 1) * dailyRate;
  }
  
  // 6. Tatil mesai
  const holidayPay = workedHolidays.length * dailyRate * config.holiday_multiplier;
  
  // 7. Yemek bedeli
  const mealAllowance = config.meal_allowance_roles.includes(role)
    ? pdks.workedDays * config.meal_allowance_per_day
    : 0;
  
  // 8. FM tutarı
  const overtimePay = (totalFM / 60) * hourlyRate * config.overtime_multiplier;
  
  // 9. Net
  const net = totalSalary - absenceDeduction - bonusDeduction
            + holidayPay + overtimePay + mealAllowance;
  
  return { ...result, net: Math.max(0, net) };
}
```

---

## ASLAN'A SORULAR (Karar Gerektiren)

1. **Tatil mesai çarpanı**: ×1 mi ×2 mi? Excel'de ×1 uygulanmış ama
   İş Kanunu ×2 diyor. Sistem hangi varsayımla çalışsın?

2. **"+1 ceza" kuralı**: Her ay için ayrı ayrı mı konfigüre edilecek
   yoksa genel bir on/off switch mi olacak?

3. **Yemek bedeli 330 TL**: Bu sabit mi, değişecek mi?
   Hangi roller alacak? (Şu an sadece stajyer)

4. **Maaş değişiklikleri**: DENİZ'in maaşı 45K→40K düşmüş.
   position_salaries'te effectiveFrom/To ile mi yönetilsin,
   yoksa kişiye özel mi?

5. **FM eşiği**: 30 dk mı, 15 dk mı, yoksa konfigüre edilebilir mi?

6. **Prim ayrımı**: Kasa primi + performans primi ayrı ayrı
   takip edilmeli mi, yoksa tek "bonus" yeterli mi?

---

## SPRINT GÜNCELLEMESI

Bu analiz sonrası PDKS-EXCEL-IMPORT-PLAN.md güncellenmeli:

### Eklenmesi Gereken Sprint (PDKS Sprint'lerinden ÖNCE):

**Sprint PAYROLL-FIX (~3 saat) — Mevcut Motor Düzeltme:**
- [ ] `payroll_month_config` tablosu
- [ ] FM 30 dk eşiği (pdks-engine.ts)
- [ ] Tatil mesai hesabı (publicHolidays join)
- [ ] "+1 ceza" kuralı (config'den)
- [ ] Yemek bedeli (stajyer)
- [ ] position_salaries prim ayrımı
- [ ] payroll-engine.ts → v2 güncelleme

**Revize Sprint Sıralaması:**
```
1. DuyuruStudioV2 D-R2, D-R3     (mevcut)
2. Fabrika F2                      (mevcut)
3. ★ PAYROLL-FIX                   (YENİ - motor düzeltme)
4. PDKS-1 (Import altyapısı)      (mevcut)
5. PDKS-2 (Hesaplama)             (mevcut)
6. PDKS-3 (Raporlama)             (mevcut)
```

---

## EK ANALİZ: İKİ AYRI MAAŞ MOTORU (KRİTİK BULGU)

Kodda **iki ayrı** maaş hesaplama sistemi var. Bu daha önce fark edilmemişti.

### Motor 1: Basit Motor (`server/lib/payroll-engine.ts`)
```
Endpoint: POST /api/pdks-payroll/calculate
Çağıran: calculateBranchPayroll() → calculatePayroll()
Veri kaynağı: pdks-engine.ts → otomatik PDKS'ten okur
Tablo: monthly_payroll (schema-12.ts)
```

**Ne yapar:**
- PDKS'ten gün sınıflandırması alır (worked/off/absent/leave)
- Toplam maaş - devamsızlık kesintisi - prim kesintisi + FM = net
- **EKSİKLER**: SGK yok, vergi yok, tatil mesai yok, FM eşiği yok

### Motor 2: Detaylı Motor (`server/services/payroll-calculation-service.ts`)
```
Endpoint: POST /api/payroll/calculate-detailed
Çağıran: calculatePayroll(input: PayrollInput)
Veri kaynağı: MANUEL GİRDİ (PDKS'e bağlı DEĞİL)
Tablo: payroll_parameters (schema-07.ts) + monthly_payrolls
```

**Ne yapar:**
- SGK işçi/işveren payı hesaplar
- 5 kademeli gelir vergisi hesaplar
- Damga vergisi hesaplar
- AGI (asgari geçim indirimi) hesaplar
- Off gün: ×1.5, Tatil: ×2.0
- Kasa prim, performans prim, satış primi AYRI
- Kümülatif vergi matrahı takibi
- **EKSİK**: PDKS entegrasyonu yok — tüm veriler elle girilmeli

### Karşılaştırma Tablosu

| Özellik | Motor 1 (Basit) | Motor 2 (Detaylı) |
|---------|-----------------|-------------------|
| PDKS otomatik okuma | ✅ | ❌ |
| Gün sınıflandırma | ✅ | ❌ |
| Off gün takibi | ✅ | ❌ |
| İzin entegrasyonu | ✅ | ❌ |
| SGK hesabı | ❌ | ✅ |
| Gelir vergisi | ❌ | ✅ |
| Damga vergisi | ❌ | ✅ |
| AGI | ❌ | ✅ |
| Tatil mesai ×2 | ❌ | ✅ |
| Off gün mesai ×1.5 | ❌ | ✅ |
| FM eşik (30 dk) | ❌ | ❌ (her iki motorda da yok) |
| Kasa/perf prim ayrımı | ❌ | ✅ |
| Yemek bedeli | ❌ | ❌ |
| "+1 ceza" | ❌ | ❌ |
| Kümülatif vergi matrahı | ❌ | ✅ |

### SONUÇ: Motorlar BİRLEŞTİRİLMELİ

Doğru yaklaşım:
1. Motor 2'nin hesaplama kalitesini koru (SGK, vergi, AGI)
2. Motor 1'in PDKS otomatik okuma özelliğini ekle
3. Eksik özellikleri her ikisine de ekle (FM eşik, yemek, +1)

```
Hedef Mimari:
  PDKS Engine (gün sınıflandırma)
       ↓
  Payroll Bridge (PDKS → PayrollInput dönüşümü)
       ↓
  Payroll Calculation Service (SGK + vergi + net)
       ↓
  monthly_payrolls tablosu (sonuç)
```

### Yeni Sprint Eklenmeli: PAYROLL-MERGE

**Sprint PAYROLL-MERGE (~4-5 saat):**
1. Payroll Bridge fonksiyonu: PDKS özeti → PayrollInput dönüştürücü
2. FM 30 dk eşik ekleme (pdks-engine)
3. Tatil günü çapraz kontrol (publicHolidays 2026 seed)
4. payroll_month_config tablosu (aylık parametreler)
5. Yemek bedeli, "+1 ceza" parametreleri
6. UI: /maas sayfasını birleşik motora bağlama

**Revize Sprint Sıralaması:**
```
1. DuyuruStudioV2 D-R2, D-R3
2. Fabrika F2
3. ★ PAYROLL-MERGE (motorları birleştir + eksikleri ekle)
4. PDKS-1 (Excel import altyapısı)
5. PDKS-2 (PDKS→Payroll entegrasyonu)
6. PDKS-3 (Raporlama + trend)
```
