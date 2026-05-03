# F26 — AGI 2026 Smoke Evidence (Task #309 Bundle 5)

## Mevzuat (2022 sonrası)
2022'den itibaren AGI (Asgari Geçim İndirimi) kaldırıldı.
Yerine: **Asgari ücrete tekabül eden gelir vergisi + damga vergisi muafiyeti**.

Yani brüt maaşı asgari ücretin üstünde olan personel için:
- Hesaplanan gelir vergisinden, **asgari ücret üzerinden hesaplanmış gelir vergisi kadar** indirilir
- Hesaplanan damga vergisinden, **asgari ücret üzerinden hesaplanmış damga vergisi kadar** indirilir
- Muafiyet hiçbir zaman vergiyi negatife düşüremez (`Math.min` koruma)

## 2026 Live Parametreler (`payroll_parameters` tablosundan)
- `minWage`: 33030.00 TL/ay (brüt asgari ücret)
- `incomeTaxBracket1.rate`: %15
- `incomeTaxBracket1.threshold`: 158000 TL kümülatif
- `stampTaxRate`: 0.00759
- SGK işçi: %14, İşsizlik işçi: %1, toplam %15

## Asgari Ücret Üzerinden Muafiyet Hesabı
```
minWageGross       = 33030.00
minWageSgkEmp      = 33030 * 0.14   = 4624.20
minWageUnemploy    = 33030 * 0.01   = 330.30
minWageTaxable     = 33030 - 4624.20 - 330.30 = 28075.50
minWageIncomeTax   = bracket-aware (28075 < 158000 → tamamı %15)
                   = 28075.50 * 0.15 = 4211.33
minWageStampTax    = 33030 * 0.00759 = 250.70
```

## Eski Kod vs Yeni Kod
**ESKİ (yanlış):**
```ts
const agi = minWageTaxable * taxBrackets[0].rate;
// Damga vergisi muafiyeti yok!
// Cumulative bracket kayması yok!
```

**YENİ (doğru):**
```ts
const minWageIncomeTax = calculateIncomeTax(minWageTaxable, cumulativeTaxBase, taxBrackets);
const minWageStampTax  = minWageGross * stampTaxRate;
const incomeTaxExemption = Math.min(incomeTax, minWageIncomeTax);
const stampTaxExemption  = Math.min(stampTax, minWageStampTax);
const agi = incomeTaxExemption + stampTaxExemption; // legacy alan, geriye uyumlu
```

## Sample 5 Kişi Senaryosu

| # | Brüt    | İlk Ay/Sonraki | Beklenen GV Muafiyet | Beklenen DV Muafiyet | Toplam Muafiyet |
|---|---------|----------------|----------------------|----------------------|-----------------|
| 1 | 33030   | İlk ay         | 4211.33              | 250.70               | 4462.03         |
| 2 | 50000   | İlk ay         | 4211.33              | 250.70               | 4462.03         |
| 3 | 80000   | İlk ay         | 4211.33              | 250.70               | 4462.03         |
| 4 | 200000  | İlk ay         | 4211.33              | 250.70               | 4462.03         |
| 5 | 50000   | Cumulative > 158000 | 4211.33 (hâlâ %15 dilim) | 250.70           | 4462.03         |

**Davranış:** Tüm brütlerde aynı muafiyet — yasal beklenti budur (asgari ücret = sabit referans).
İlk ay için kümülatif henüz 158000'i geçmediğinden bracket1 = %15 sabit kalır.

## Doğrulama
- `payroll-calculation-service.ts` `agi` alanı geriye uyumlu (toplam muafiyet)
- Yeni alanlar: `incomeTaxExemption`, `stampTaxExemption` (response shape extension)
- Tüketiciler: `payroll-bridge.ts` (`calculateDetailed`), `routes/payroll.ts` (`calculateDetailedPayroll`)
- `lib/payroll-engine.ts` AGI içermez (basit cron tabanlı engine, pozisyon bazlı maaş)

## Notlar
- F26 fix `services/payroll-calculation-service.ts`'de — `lib/payroll-engine.ts` AGI hesaplamıyor
- Live test için: HQ user login → POST `/api/payroll/calculate-detailed` body `{ userId, year:2026, month, baseSalary, ... }` → response `incomeTaxExemption` + `stampTaxExemption` görülür
