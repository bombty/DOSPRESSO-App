/**
 * Sprint 14 Phase 12 — TGK 2017/2284 Lot/Parti Üretici ve Compliance Validator
 *
 * Etiket basımı öncesi TGK m.9 zorunlu alanları kontrol eder ve
 * otomatik lot numarası üretir.
 *
 * LOT FORMATI: L-{YYYY}-W{WW}-{NNN}
 *   Örnek: L-2026-W19-001 (2026 yılı, 19. hafta, 1 nolu lot)
 *
 * ALTERNATIF: L-{YYYY}{MM}{DD}-{HHMM}
 *   Örnek: L-20260507-0142 (7 May 2026, saat 01:42)
 */

import { db } from '../db';
import { tgkLabels } from '@shared/schema';
import { eq, like, sql, desc } from 'drizzle-orm';

/**
 * ISO 8601 hafta numarası (TGK ile uyumlu)
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Otomatik lot numarası üret (haftalık serileme)
 *
 * Bu hafta kaç lot üretilmiş, ona göre +1 ile yeni lot.
 */
export async function generateLotNumber(date: Date = new Date()): Promise<string> {
  const { year, week } = getISOWeek(date);
  const weekStr = String(week).padStart(2, '0');
  const prefix = `L-${year}-W${weekStr}-`;

  // Bu prefix ile başlayan en yüksek seri numarayı bul
  const existing = await db
    .select({ lotNumber: tgkLabels.lotNumber })
    .from(tgkLabels)
    .where(like(tgkLabels.lotNumber, `${prefix}%`))
    .orderBy(desc(tgkLabels.lotNumber))
    .limit(1);

  let nextSerial = 1;
  if (existing.length > 0 && existing[0].lotNumber) {
    const match = existing[0].lotNumber.match(new RegExp(`${prefix}(\\d+)`));
    if (match) {
      nextSerial = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(nextSerial).padStart(3, '0')}`;
}

/**
 * TGK Compliance Validator
 *
 * Etiket basıma gönderilmeden önce zorunlu alanları kontrol eder.
 * Sprint 12 P-19 audit'inde tespit edilen tüm gediği kapatır.
 */
export interface TgkComplianceCheck {
  isCompliant: boolean;
  score: number; // 0-100
  missingFields: Array<{
    field: string;
    articleRef: string;
    severity: 'blocker' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export function validateTgkCompliance(label: any): TgkComplianceCheck {
  const missing: TgkComplianceCheck['missingFields'] = [];
  const warnings: TgkComplianceCheck['warnings'] = [];

  // ZORUNLU ALANLAR (TGK Madde 9)

  // 9/a — Gıda adı
  if (!label.productName || label.productName.trim().length < 2) {
    missing.push({
      field: 'productName',
      articleRef: 'TGK m.9/a — Gıda adı',
      severity: 'blocker',
    });
  }

  // 9/b — İçindekiler listesi
  if (!label.ingredientsText || label.ingredientsText.trim().length < 5) {
    missing.push({
      field: 'ingredientsText',
      articleRef: 'TGK m.9/b — İçindekiler listesi',
      severity: 'blocker',
    });
  }

  // 9/c — Alerjen uyarısı (varsa)
  if (label.allergenWarning === undefined || label.allergenWarning === null) {
    warnings.push({
      field: 'allergenWarning',
      message: 'Alerjen uyarısı boş — eğer ürün hiçbir alerjen içermiyorsa "—" yazın',
    });
  }

  // 9/e — Net miktar
  if (!label.netQuantityG || Number(label.netQuantityG) <= 0) {
    missing.push({
      field: 'netQuantityG',
      articleRef: 'TGK m.9/e — Net miktar',
      severity: 'blocker',
    });
  }

  // 9/f — Saklama koşulları (gıda için zorunlu olabilir)
  if (!label.storageConditions || label.storageConditions.trim().length < 3) {
    warnings.push({
      field: 'storageConditions',
      message: 'Saklama koşulları boş — TGK m.9/f gereği belirtilmeli',
    });
  }

  // 9/g — Üretici bilgileri
  if (!label.manufacturerName || label.manufacturerName.trim().length < 3) {
    missing.push({
      field: 'manufacturerName',
      articleRef: 'TGK m.9/g — Üretici adı/unvanı',
      severity: 'blocker',
    });
  }
  if (!label.manufacturerAddress || label.manufacturerAddress.trim().length < 5) {
    missing.push({
      field: 'manufacturerAddress',
      articleRef: 'TGK m.9/g — Üretici adresi',
      severity: 'blocker',
    });
  }

  // 9/h — Üretim tarihi (ETKİN: tatlı/donmuş ürünler için zorunlu)
  if (!label.productionDate) {
    missing.push({
      field: 'productionDate',
      articleRef: 'TGK m.9/h — Üretim tarihi',
      severity: 'blocker',
    });
  }

  // 9/i — Son tüketim tarihi
  if (!label.expiryDate && !label.bestBeforeDate) {
    missing.push({
      field: 'expiryDate',
      articleRef: 'TGK m.9/i — Son tüketim tarihi',
      severity: 'blocker',
    });
  }

  // 9/k — LOT/PARTİ NUMARASI (P-19 audit kritik bulgu)
  if (!label.lotNumber || label.lotNumber.trim().length < 3) {
    missing.push({
      field: 'lotNumber',
      articleRef: 'TGK m.9/k — Lot/Parti numarası (KRİTİK)',
      severity: 'blocker',
    });
  }

  // BESİN DEĞERLERİ (TGK Ek-13)
  if (!label.energyKcal && !label.energyKj) {
    warnings.push({
      field: 'energyKcal',
      message: 'Besin değer tablosu eksik — TGK Ek-13 gereği zorunlu',
    });
  }

  // SCORE HESAPLA (basit ağırlıklı)
  const blockers = missing.filter(m => m.severity === 'blocker').length;
  const warningCount = warnings.length;
  const totalChecks = 11; // m.9/a..k = 11 madde
  const passed = totalChecks - blockers;
  const score = Math.max(0, Math.round((passed / totalChecks) * 100) - (warningCount * 3));

  return {
    isCompliant: blockers === 0,
    score,
    missingFields: missing,
    warnings,
  };
}

/**
 * QUID hesaplayıcı (TGK m.9/d — Quantitative Ingredient Declaration)
 *
 * "Çikolatalı Brownie" ise içinde %X çikolata olduğu belirtilmeli.
 * Reçeteden çıkarılır.
 */
export function calculateQUID(
  productName: string,
  ingredients: Array<{ name: string; weight: number }>
): Array<{ ingredient: string; percentage: number }> {
  const productNameLower = productName.toLowerCase();
  const totalWeight = ingredients.reduce((sum, i) => sum + (i.weight || 0), 0);
  if (totalWeight === 0) return [];

  // Ürün adında geçen malzemeleri bul
  const quidItems: Array<{ ingredient: string; percentage: number }> = [];
  for (const ing of ingredients) {
    const ingNameLower = ing.name.toLowerCase();
    // Ürün adında bu malzemenin adı geçiyor mu?
    if (productNameLower.includes(ingNameLower) || ingNameLower.includes(productNameLower.split(' ')[0])) {
      quidItems.push({
        ingredient: ing.name,
        percentage: Math.round((ing.weight / totalWeight) * 1000) / 10, // 1 ondalıklı
      });
    }
  }

  return quidItems;
}
