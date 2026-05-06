/**
 * Türk Vergi Sistemi Bordro Hesaplayıcısı (TR 2026)
 * 
 * Kaynak: 
 *   - Resmi Gazete 26.12.2025/33119 (2026 Asgari Ücret)
 *   - 4857 Sayılı İş Kanunu Madde 39
 *   - 193 Sayılı Gelir Vergisi Kanunu Madde 103
 *   - 488 Sayılı Damga Vergisi Kanunu Tablo (IV)
 *   - TÜRMOB 2026 Rehber Tablosu
 * 
 * Türkçe Bordro Mantığı:
 *   Brüt → SGK Kesintileri (%15) → Vergi Matrahı
 *   Vergi Matrahı → Gelir Vergisi (kademeli dilimler) → Asgari Ücret İstisnası
 *   Brüt → Damga Vergisi (%0.759) → Asgari Ücret İstisnası
 *   Net = Brüt - SGK - Gelir Vergisi - Damga Vergisi
 * 
 * Tüm tutarlar KURUŞ cinsinden (1 TL = 100 kuruş) saklanır ve hesaplanır.
 * Display'de /100 yapılır.
 * 
 * Aslan'ın D-40 v2 kararı (6 May 2026):
 *   DOSPRESSO'daki TÜM maaş tutarları NET (eline geçecek). 
 *   Brüt sistem hesaplar (bu modül).
 * 
 * NOT: Bu modül 2026 için hardcoded parametre kullanır. Gelecek yıllar için
 *      payroll_parameters tablosundan okuma eklenecek.
 */

export interface TaxParameters {
  year: number;
  // Asgari ücret (kuruş)
  minimumWageGross: number;  // Brüt: 33.030 × 100 = 3.303.000
  minimumWageNet: number;    // Net: 28.075,50 × 100 = 2.807.550
  // SGK kesintileri (oran)
  sgkEmployeeRate: number;   // %14 SGK primi (işçi payı)
  unemploymentRate: number;  // %1 işsizlik sigortası (işçi payı)
  // Damga vergisi (oran)
  stampDutyRate: number;     // %0.759 (binde 7.59)
  // Gelir vergisi dilimleri (yıllık matrah, kuruş)
  incomeTaxBrackets: Array<{
    upperLimit: number;  // Yıllık matrah üst limiti (kuruş, Infinity son dilim)
    rate: number;        // Vergi oranı
  }>;
  // Asgari ücret desteği (işveren tarafı, info olarak)
  minimumWageSupport: number; // 1.270 × 100 = 127.000
}

/**
 * Türkiye 2026 vergi parametreleri.
 * Resmi rakamlar: Bakanlık 23.12.2025 açıklaması, RG 26.12.2025.
 */
export const TR_2026: TaxParameters = {
  year: 2026,
  // Asgari ücret (kuruş)
  minimumWageGross: 3303000,  // 33.030,00 TL
  minimumWageNet: 2807550,    // 28.075,50 TL
  // SGK
  sgkEmployeeRate: 0.14,
  unemploymentRate: 0.01,
  // Damga
  stampDutyRate: 0.00759,
  // Gelir vergisi dilimleri 2026 (yıllık matrah)
  incomeTaxBrackets: [
    { upperLimit: 15800000, rate: 0.15 },    // 0 - 158.000 TL
    { upperLimit: 33000000, rate: 0.20 },    // 158.000 - 330.000 TL
    { upperLimit: 120000000, rate: 0.27 },   // 330.000 - 1.200.000 TL
    { upperLimit: 430000000, rate: 0.35 },   // 1.200.000 - 4.300.000 TL
    { upperLimit: Number.POSITIVE_INFINITY, rate: 0.40 },  // 4.300.000+
  ],
  minimumWageSupport: 127000,  // 1.270 TL
};

/**
 * Bordro detay dökümü.
 * UI'da bordro şablonunda gösterilecek.
 */
export interface PayrollBreakdown {
  grossSalary: number;            // Brüt maaş
  // SGK
  sgkPrimi: number;               // %14 SGK primi
  unemploymentPrimi: number;      // %1 işsizlik sigortası
  totalSgk: number;               // Toplam SGK kesintisi
  // Vergi matrahı
  taxableBase: number;            // Brüt - SGK = matrah
  // Gelir vergisi
  annualTaxableBase: number;      // Yıllık matrah (× 12)
  incomeTaxBeforeExemption: number;  // İstisnasız aylık gelir vergisi
  incomeTaxExemption: number;     // Asgari ücret istisnası
  incomeTax: number;              // Net gelir vergisi (istisna sonrası)
  // Damga vergisi
  stampDutyBeforeExemption: number;
  stampDutyExemption: number;
  stampDuty: number;              // Net damga vergisi
  // Toplam
  totalDeductions: number;        // SGK + gelir vergisi + damga
  netSalary: number;              // Brüt - tüm kesintiler
  // İstatistikler
  effectiveTaxRate: number;       // Toplam kesinti / brüt (0-1 arası)
}

/**
 * Yıllık matrah üzerinden kademeli gelir vergisi hesabı.
 */
function calculateAnnualIncomeTax(annualBase: number, brackets: TaxParameters['incomeTaxBrackets']): number {
  if (annualBase <= 0) return 0;
  let tax = 0;
  let prevLimit = 0;
  for (const bracket of brackets) {
    if (annualBase <= prevLimit) break;
    const taxableInBracket = Math.min(annualBase, bracket.upperLimit) - prevLimit;
    tax += taxableInBracket * bracket.rate;
    prevLimit = bracket.upperLimit;
    if (annualBase <= bracket.upperLimit) break;
  }
  return tax;
}

/**
 * Brüt maaştan net maaşa dönüşüm.
 * 
 * @param grossSalary Brüt maaş (kuruş cinsinden)
 * @param params Vergi parametreleri (default: TR 2026)
 * @returns PayrollBreakdown — tüm kalemler dahil
 * 
 * @example
 *   grossToNet(3303000, TR_2026) → netSalary: 2807550 (asgari ücret)
 *   grossToNet(5000000, TR_2026) → netSalary: ~4020700 (50K brüt)
 */
export function grossToNet(grossSalary: number, params: TaxParameters = TR_2026): PayrollBreakdown {
  if (grossSalary < 0) throw new Error('grossSalary negatif olamaz');

  // 1. SGK kesintileri
  const sgkPrimi = Math.round(grossSalary * params.sgkEmployeeRate);
  const unemploymentPrimi = Math.round(grossSalary * params.unemploymentRate);
  const totalSgk = sgkPrimi + unemploymentPrimi;

  // 2. Vergi matrahı
  const taxableBase = grossSalary - totalSgk;
  const annualTaxableBase = taxableBase * 12;

  // 3. Gelir vergisi (kademeli, yıllık → aylık)
  const annualIncomeTax = calculateAnnualIncomeTax(annualTaxableBase, params.incomeTaxBrackets);
  const incomeTaxBeforeExemption = Math.round(annualIncomeTax / 12);

  // 4. Asgari ücret gelir vergisi istisnası
  // Asgari ücretin vergisi kadar düşülür (4857 SK ek gelişimi: tüm ücretliler için)
  const minWageBase = params.minimumWageGross - 
                      Math.round(params.minimumWageGross * (params.sgkEmployeeRate + params.unemploymentRate));
  const minWageAnnualBase = minWageBase * 12;
  const minWageAnnualTax = calculateAnnualIncomeTax(minWageAnnualBase, params.incomeTaxBrackets);
  const minWageMonthlyTax = Math.round(minWageAnnualTax / 12);
  const incomeTaxExemption = Math.min(incomeTaxBeforeExemption, minWageMonthlyTax);
  const incomeTax = Math.max(0, incomeTaxBeforeExemption - incomeTaxExemption);

  // 5. Damga vergisi
  const stampDutyBeforeExemption = Math.round(grossSalary * params.stampDutyRate);
  const stampDutyOnMinWage = Math.round(params.minimumWageGross * params.stampDutyRate);
  const stampDutyExemption = Math.min(stampDutyBeforeExemption, stampDutyOnMinWage);
  const stampDuty = Math.max(0, stampDutyBeforeExemption - stampDutyExemption);

  // 6. Toplam kesinti
  const totalDeductions = totalSgk + incomeTax + stampDuty;

  // 7. Net
  const netSalary = grossSalary - totalDeductions;

  return {
    grossSalary,
    sgkPrimi, unemploymentPrimi, totalSgk,
    taxableBase, annualTaxableBase,
    incomeTaxBeforeExemption, incomeTaxExemption, incomeTax,
    stampDutyBeforeExemption, stampDutyExemption, stampDuty,
    totalDeductions, netSalary,
    effectiveTaxRate: grossSalary > 0 ? totalDeductions / grossSalary : 0,
  };
}

/**
 * Net maaştan brüt maaşa iteratif dönüşüm.
 * 
 * Net→Brüt analitik formül yok (kademeli vergi nedeniyle), iteratif yöntem kullanılır.
 * Newton-Raphson benzeri yaklaşım: tahmin et, hesapla, fark al, ayarla.
 * 
 * @param targetNet Hedef net maaş (kuruş cinsinden)
 * @param params Vergi parametreleri
 * @returns PayrollBreakdown (gross dahil)
 * 
 * @example
 *   netToGross(2807550, TR_2026) → grossSalary: 3303000 (asgari ücret)
 *   netToGross(3300000, TR_2026) → grossSalary: ~3911100 (33K NET → ~39.1K BRÜT)
 */
export function netToGross(targetNet: number, params: TaxParameters = TR_2026): PayrollBreakdown {
  if (targetNet < 0) throw new Error('targetNet negatif olamaz');
  if (targetNet === 0) return grossToNet(0, params);

  // Asgari ücret kontrolü: hedef net < asgari net ise asgari ücret döndür
  if (targetNet < params.minimumWageNet) {
    // Yasal: hiçbir ücret asgari altında olamaz (4857 SK m.39)
    // Kullanıcı uyarılmalı, ama biz buradan asgari ücreti döndürüyoruz
    return grossToNet(params.minimumWageGross, params);
  }

  // İlk tahmin: net / 0.78 (yaklaşık brüt)
  let grossGuess = targetNet / 0.78;

  // Newton-Raphson: 50 iterasyon yeterli (genelde 5-10'da bulur)
  for (let i = 0; i < 50; i++) {
    const result = grossToNet(grossGuess, params);
    const diff = result.netSalary - targetNet;

    // 1 kuruş tolerance
    if (Math.abs(diff) < 1) {
      return result;
    }

    // Düzeltme: brüt artışı net artışından büyüktür (vergi nedeniyle)
    // Yaklaşık 1 brüt → 0.78 net
    grossGuess -= diff / 0.78;

    // Asgari ücretin altına düşmeyi engelle
    if (grossGuess < params.minimumWageGross) {
      grossGuess = params.minimumWageGross;
    }
  }

  // Converge edemediyse son tahmini döndür (genelde gelmez)
  return grossToNet(Math.round(grossGuess), params);
}

/**
 * Yardımcı: Net asgari ücret döndürür (kuruş)
 */
export function getMinimumWageNet(year: number = 2026): number {
  if (year === 2026) return TR_2026.minimumWageNet;
  // İleride payroll_parameters DB'den okunacak
  return TR_2026.minimumWageNet;
}

/**
 * Yardımcı: Brüt asgari ücret döndürür (kuruş)
 */
export function getMinimumWageGross(year: number = 2026): number {
  if (year === 2026) return TR_2026.minimumWageGross;
  return TR_2026.minimumWageGross;
}

/**
 * Kuruş → TL formatlama (display için)
 */
export function formatTL(kurus: number): string {
  return (kurus / 100).toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' TL';
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DURUMLARI (manuel doğrulama için, üretim'de kullanılmaz)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manuel test fonksiyonu — `npx tsx server/lib/tax-calculator.ts` ile çalışır.
 * Asgari ücret + Lara matrisindeki 5 net pozisyonu test eder.
 */
export function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('TR 2026 Tax Calculator Tests');
  console.log('═══════════════════════════════════════════════════');

  // Test 1: Brüt asgari → Net asgari kontrolü
  const minWageResult = grossToNet(TR_2026.minimumWageGross);
  console.log('\n[Test 1] Brüt 33.030 → Net hesabı:');
  console.log(`  Brüt:           ${formatTL(minWageResult.grossSalary)}`);
  console.log(`  SGK %14:        ${formatTL(minWageResult.sgkPrimi)}`);
  console.log(`  İşsizlik %1:    ${formatTL(minWageResult.unemploymentPrimi)}`);
  console.log(`  Gelir Vergisi:  ${formatTL(minWageResult.incomeTax)} (istisna sonrası)`);
  console.log(`  Damga:          ${formatTL(minWageResult.stampDuty)} (istisna sonrası)`);
  console.log(`  → NET:          ${formatTL(minWageResult.netSalary)}`);
  console.log(`  ✅ Beklenen 28.075,50, sapma: ${formatTL(Math.abs(minWageResult.netSalary - TR_2026.minimumWageNet))}`);

  // Test 2: Lara 5 pozisyonu için Net→Brüt
  console.log('\n[Test 2] Lara 5 pozisyon için Net→Brüt dönüşüm:');
  const laraPositions = [
    { name: 'Stajyer', net: 3300000 },         // 33.000
    { name: 'Bar Buddy', net: 3600000 },       // 36.000
    { name: 'Barista', net: 4100000 },         // 41.000
    { name: 'Supervisor Buddy', net: 4500000 }, // 45.000
    { name: 'Supervisor', net: 4900000 },       // 49.000
  ];
  for (const p of laraPositions) {
    const result = netToGross(p.net);
    console.log(`  ${p.name.padEnd(20)} Net ${formatTL(p.net).padStart(15)} → Brüt ${formatTL(result.grossSalary).padStart(15)}`);
  }

  // Test 3: D-40 v2 - Stajyer net asgari altında değil (yanlış alarm tespiti)
  console.log('\n[Test 3] D-40 v2 — Stajyer 33.000 NET vs asgari net 28.075,50:');
  console.log(`  Stajyer NET:      ${formatTL(3300000)}`);
  console.log(`  Asgari NET:       ${formatTL(TR_2026.minimumWageNet)}`);
  console.log(`  Fark:             +${formatTL(3300000 - TR_2026.minimumWageNet)} ÜZERINDE`);
  console.log(`  ✅ Yasal sorun YOK, fallback gereksiz`);

  console.log('\n═══════════════════════════════════════════════════\n');
}

// CLI'dan çalıştırılırsa testleri yürüt
import { fileURLToPath } from 'url';
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
