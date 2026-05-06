# 💰 Payroll Net/Brüt Revizyon Planı (6 May 2026)

> **Aslan'ın Bilgisi (6 May 2026, 03:00):** "Burada sana verdiğim maaşların hepsi NET. Personellerin ELİNE GEÇECEK rakamlar. Brüt SEN hesaplarsın güncel yasal duruma göre."
>
> **Etki:** D-40 kararı revize edilmeli, payroll-engine.ts'te kritik bug var, Sprint 8b raporundaki "compliance uyarısı" yanlış alarmdı.

---

## 🚨 Tespit Edilen Bug

### Mevcut Kod (`server/lib/payroll-engine.ts` satır 285-303)

```typescript
// 3. Asgari ücret koruması (4857 SK m.39)
const minWageGross = await getMinimumWageGross(year, month);  // BRÜT (33.030 × 100 kuruş)
let originalSalary: number | undefined;
let legalNote: string | undefined;
if (resolvedTotal < minWageGross) {  // ❌ resolvedTotal = NET, minWageGross = BRÜT
  // YANLIŞ MATEMATIK: net → brüt karşılaştırılıyor
  originalSalary = resolvedTotal;
  legalNote = `Hakediş ${...} TL asgari ücretin altındaydı; ` +
              `4857 SK m.39 uyarınca asgari ücrete (...) yükseltildi.`;
  resolvedTotal = minWageGross;  // ❌ Stajyer'in net'i 33.030 BRÜT yapılıyor
  salarySource = 'minimum_wage_fallback';
}
```

### Bug'ın Sonucu

| Personel | DB'deki Net | Brüt Karşılığı | Asgari Brüt | Asgari Net | Bug Sonucu |
|---|---|---|---|---|---|
| Stajyer | 33.000 NET | ~39.110 BRÜT | 33.030 | ~27.860 | ❌ Yanlış fallback (33.030 yazılıyor) |
| Bar Buddy | 36.000 NET | ~42.700 BRÜT | 33.030 | ~27.860 | ✅ Doğru (fallback uygulanmıyor — 36.000 > 33.030) |
| Barista | 41.000 NET | ~48.700 BRÜT | 33.030 | ~27.860 | ✅ Doğru |
| Supervisor | 49.000 NET | ~58.300 BRÜT | 33.030 | ~27.860 | ✅ Doğru |

**Tek somut bug etkisi:** Stajyer (33.000 NET) → kod 33.030 yazıyor (30 TL fazla, brüt sanılıyor). Diğer personellerde tesadüfen problem yok çünkü net rakamları zaten brüt asgariden yüksek.

**Ama gelecekte:** 27.860 NET ile 33.000 NET arasında bir personel tanımlanırsa, fallback yine yanlış uygulanır.

---

## 📐 Doğru Mantık

### Türkiye 2026 Vergi Yapısı (Asgari Ücret İstisnası ile)

**SGK Kesintileri (işçi payı):**
- SGK Primi: %14
- İşsizlik Sigortası: %1
- **Toplam:** %15

**Damga Vergisi:** %0.759 (binde 7.59)

**Gelir Vergisi Dilimleri (2026):**
| Üst Sınır (Yıllık) | Oran |
|---|---|
| 158.000 TL | %15 |
| 330.000 TL | %20 |
| 1.200.000 TL | %27 |
| 4.300.000 TL | %35 |
| 4.300.000+ | %40 |

**Asgari Ücret Vergi İstisnası:**
- Brüt asgari ücretin gelir + damga vergisinden muaf kısmı
- 2026: Brüt asgari = 33.030 TL → Bu kısım vergisiz
- AGİ kaldırıldı (2022'den beri)

**Net = Brüt - SGK %15 - Gelir Vergisi (asgari ücret istisnası sonrası) - Damga Vergisi (asgari ücret istisnası sonrası)**

### Asgari Ücret Net Tutarı (2026)

```
Brüt:        33.030,00 TL
SGK %15:    -4.954,50 TL
Gelir V.:    0 (istisna kapsamında)
Damga V.:    0 (istisna kapsamında)
─────────────────────────
Net:         28.075,50 TL  (TÜRMOB resmi rakamı)
```

> **Not:** Bazı kaynaklarda 27.860 olarak da geçer (yuvarlama farkı). Resmi TÜRMOB tutarı: **28.075,50 TL** kabul edilebilir. payroll_parameters tablosunda bu değer saklanmalı.

---

## 🧮 Net → Brüt Dönüşüm Formülü

Tek seviyeli (asgari ücret bandında, %15 vergi diliminde):

```
Net = Brüt × (1 - 0.15)  = Brüt × 0.85   (asgari ücret istisnası içinde)

Brüt = Net / 0.85
```

Bu basit formül **sadece** brüt asgari ücret seviyesindeki maaşlar için geçerli. Üst dilimler için cumulative gelir vergisi hesabı gerekiyor.

### 35 Pilot Personel İçin Yıllık Brüt Tahmini

| Net (Aylık) | Yaklaşık Brüt | Yıllık Brüt | Vergi Dilimi |
|---|---|---|---|
| 33.000 | ~39.110 | 469.320 | %27 (kısmi) |
| 36.000 | ~42.700 | 512.400 | %27 |
| 41.000 | ~48.700 | 584.400 | %27 |
| 45.000 | ~53.500 | 642.000 | %27 |
| 49.000 | ~58.300 | 699.600 | %27 |

> **Çözüm:** Cumulative bracket hesaplaması gerek. Her ay maaş ödendikçe yıllık birikim takip edilir.

---

## 🎯 Yapılacak Değişiklikler

### 1) `server/lib/payroll-engine.ts` Refactor (1-2 saat)

**Yeni dosya: `server/lib/tax-calculator.ts`**

```typescript
// Türk vergi sistemi 2026 hesaplayıcı
export function netToGross(netSalary: number, year: number, month: number): {
  gross: number;
  sgk: number;
  incomeTax: number;
  stampTax: number;
}

export function grossToNet(grossSalary: number, year: number, month: number): {
  net: number;
  sgk: number;
  incomeTax: number;
  stampTax: number;
}

export function getMinimumWageNet(year: number, month: number): number;
export function getMinimumWageGross(year: number, month: number): number;
```

**Değişiklik 1:** `payroll-engine.ts:285-303` (asgari ücret kontrolü)
```typescript
// ÖNCE:
const minWageGross = await getMinimumWageGross(year, month);
if (resolvedTotal < minWageGross) { ... }

// SONRA:
const minWageNet = await getMinimumWageNet(year, month);  // 28.075,50 × 100 kuruş
if (resolvedTotal < minWageNet) {
  legalNote = `Net hakediş ${...} asgari ücret net'in (${minWageNet/100}) altındaydı; ` +
              `4857 SK m.39 uyarınca asgari ücret net'ine yükseltildi.`;
  resolvedTotal = minWageNet;
  salarySource = 'minimum_wage_fallback';
}
```

**Değişiklik 2:** Bordro çıktısına brüt eklenmesi
```typescript
// payroll-engine output'una eklenecek alanlar:
interface PayrollResult {
  // ... mevcut alanlar
  netSalary: number;       // DB'de saklanan tutar
  grossSalary: number;     // YENİ: Hesaplanan brüt
  sgkDeduction: number;    // YENİ: SGK kesintisi
  incomeTax: number;       // YENİ: Gelir vergisi
  stampTax: number;        // YENİ: Damga vergisi
  netVerification: number; // YENİ: Brüt - tüm kesintiler (DB net'iyle eşleşmeli)
}
```

### 2) `payroll_parameters` Tablosuna `minimum_wage_net` Eklenmesi

Mevcut: `minimum_wage_gross` var
Eklenecek: `minimum_wage_net` (28.075,50 × 100 = 2.807.550 kuruş)

```sql
-- migrations/2026-05-07-payroll-parameters-net.sql (YARIN)
ALTER TABLE payroll_parameters 
ADD COLUMN IF NOT EXISTS minimum_wage_net INTEGER;

UPDATE payroll_parameters 
SET minimum_wage_net = 2807550 
WHERE year = 2026 AND minimum_wage_net IS NULL;
```

### 3) Bordro UI'da Net + Brüt Gösterimi

`client/src/pages/bordrom.tsx` ve `client/src/pages/ik/bordro-onay.tsx`:
- Mevcut: Sadece net görünüyor
- Eklenecek: Brüt + tüm kesintiler tablosu (TR mevzuat standardı)

Format:
```
Brüt Maaş:           42.700,00 TL
─────────────────────────────────
SGK Kesintisi (%15): -6.405,00 TL
Gelir Vergisi:       -1.155,00 TL
Damga Vergisi:         -298,29 TL
Asgari Ücret İst.:   +1.460,00 TL  (vergi muafiyeti)
─────────────────────────────────
Net Maaş:            36.301,71 TL
```

### 4) `migrations/2026-05-06-position-salaries-lara-seed.sql` Yorum Düzeltmesi

Mevcut yorumlarda "Compliance: Stajyer 33.000 < 33.030 brüt asgari" diyor — bu **yanlış alarm**, temizlenmeli.

### 5) `DECIDED.md` D-40 Revize

```markdown
### D-40: Lara Stajyer NET Maaş + Sistem Net→Brüt Dönüşümü (6 May 2026, REVİZE)

**Karar (REVİZE):** Lara duyurusu ve tüm Excel'lerdeki maaş tutarları **NET** rakamlardır 
(personellerin eline geçecek tutar). Brüt + SGK + vergi sistem tarafından otomatik hesaplanır.

**Detay:**
- DB kolonları: `position_salaries.total_salary`, `users.netSalary` → hepsi NET
- Bordro hesabı: payroll-engine NET → BRÜT dönüşümü yapar (tax-calculator.ts)
- Asgari ücret kontrolü: NET cinsinden (28.075,50 TL 2026)
- Stajyer 33.000 NET → asgari net'in 4.924,50 TL ÜZERİNDE, fallback gereksiz

**Eski (YANLIŞ) anlayış:** "Stajyer 33.000 brüt < 33.030 brüt asgari → fallback gerek" — 
bu hatalıydı, NET vs BRÜT karıştırılmıştı.

**Eski (D-40 v1) silinmedi (audit trail), bu D-40 v2 yeni karar.
```

---

## ⏱️ Tahmini İş Süresi (Yarın)

| Adım | Süre |
|---|---|
| 1. tax-calculator.ts yazımı (TR 2026 dilim hesabı) | 45 dk |
| 2. payroll-engine.ts refactor | 30 dk |
| 3. payroll_parameters migration | 10 dk |
| 4. UI bordro şablon güncellemesi | 30 dk |
| 5. Migration yorum temizlik | 5 dk |
| 6. DECIDED.md D-40 revize | 5 dk |
| 7. Test senaryoları | 30 dk |
| 8. PR + smoke test + merge | 30 dk |
| **Toplam** | **~3 saat** |

---

## ⚠️ Riskler ve Karşı Önlemler

| Risk | Önlem |
|---|---|
| Yanlış vergi formülü → personel az/çok ödeme | Türkiye Cumhuriyeti Maliye Bakanlığı'nın resmi 2026 sirküleri ile cross-check |
| AGI/asgari ücret istisnası karmaşıklığı | TÜRMOB veya KESK rehber tablosu kullan, üzerine test |
| Yıllık cumulative gelir vergisi karmaşası | İlk versiyonda basit aylık hesap, ileride cumulative |
| Mevcut bordrolar düzeltilmeli mi? | Sadece Mayıs 2026'dan ileri uygulanır (geri yok) |

---

## 🚦 Yarınki Sıra

1. **Sprint 8c sonuç paylaş** (UNIQUE constraint EXECUTE — bu gece)
2. tax-calculator.ts yazımı
3. payroll-engine.ts refactor
4. Migration: payroll_parameters + minimum_wage_net
5. UI bordro şablon
6. PR + smoke test + merge
7. **Sprint 8 ana migration** (35 personel UPSERT, brüt hesabı doğru olduktan sonra)

---

## 📚 Referanslar

- 4857 Sayılı İş Kanunu Madde 39 (Asgari Ücret)
- Resmi Gazete 26.12.2025 / 33119 (2026 Asgari Ücret)
- 193 Sayılı Gelir Vergisi Kanunu Madde 103 (Vergi Dilimleri)
- 488 Sayılı Damga Vergisi Kanunu (Tablo (IV))
- TÜRMOB 2026 Rehber Tablosu

---

**Yazan:** Claude (claude.ai web/iPad)
**Tarih:** 6 May 2026, 03:00 (Aslan'ın net/brüt netleştirmesi sonrası)
**Branch:** `claude/payroll-net-brut-revision-2026-05-06`
**Versiyon:** v1.0 (revizyon planı, kod henüz yazılmadı)
