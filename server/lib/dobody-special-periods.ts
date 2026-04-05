// ========================================
// DOSPRESSO Mr. Dobody — Özel Dönemler & Veri Kalitesi
// Tatil, Ramazan, yeni şube gibi özel durumları yönetir
// ========================================

import { db } from "../db";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────
// ÖZEL DÖNEM TAKVİMİ
// ──────────────────────────────────────────

interface SpecialPeriod {
  name: string;
  startDate: string; // MM-DD
  endDate: string;   // MM-DD
  type: 'holiday' | 'ramadan' | 'season' | 'custom';
  rules: {
    suppressShiftWarnings?: boolean;   // Vardiya uyarılarını bastır
    suppressChecklistWarnings?: boolean;
    adjustStockThreshold?: number;     // Stok eşiğini çarpan (1.3 = %30 artır)
    adjustStaffingLevel?: number;      // Personel ihtiyacı çarpanı
    softerTone?: boolean;              // Dobody daha yumuşak ton
  };
}

// 2026 Türkiye takvimi
const SPECIAL_PERIODS: SpecialPeriod[] = [
  // Resmi tatiller
  { name: "Yılbaşı", startDate: "01-01", endDate: "01-01", type: "holiday", rules: { suppressShiftWarnings: true, suppressChecklistWarnings: true } },
  { name: "Ulusal Egemenlik", startDate: "04-23", endDate: "04-23", type: "holiday", rules: { suppressShiftWarnings: true } },
  { name: "İşçi Bayramı", startDate: "05-01", endDate: "05-01", type: "holiday", rules: { suppressShiftWarnings: true } },
  { name: "Gençlik Bayramı", startDate: "05-19", endDate: "05-19", type: "holiday", rules: { suppressShiftWarnings: true } },
  { name: "Zafer Bayramı", startDate: "08-30", endDate: "08-30", type: "holiday", rules: { suppressShiftWarnings: true } },
  { name: "Cumhuriyet Bayramı", startDate: "10-29", endDate: "10-29", type: "holiday", rules: { suppressShiftWarnings: true } },
  
  // Dini bayramlar (2026 tahminleri — her yıl güncellenmeli)
  { name: "Ramazan", startDate: "02-18", endDate: "03-19", type: "ramadan", rules: { adjustStaffingLevel: 0.8, softerTone: true } },
  { name: "Ramazan Bayramı", startDate: "03-20", endDate: "03-22", type: "holiday", rules: { suppressShiftWarnings: true, adjustStockThreshold: 1.5 } },
  { name: "Kurban Bayramı", startDate: "05-27", endDate: "05-30", type: "holiday", rules: { suppressShiftWarnings: true } },

  // Sezon
  { name: "Yaz Sezonu", startDate: "06-15", endDate: "09-15", type: "season", rules: { adjustStockThreshold: 1.3, adjustStaffingLevel: 1.2 } },
  { name: "Kış Sezonu", startDate: "12-01", endDate: "02-28", type: "season", rules: { adjustStockThreshold: 0.9 } },
];

/**
 * Bugün özel dönem mi kontrol et
 */
export function getActiveSpecialPeriods(date?: Date): SpecialPeriod[] {
  const d = date || new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  return SPECIAL_PERIODS.filter(p => {
    if (p.startDate <= p.endDate) {
      return mmdd >= p.startDate && mmdd <= p.endDate;
    }
    // Yıl geçişi (örn: 12-01 — 02-28)
    return mmdd >= p.startDate || mmdd <= p.endDate;
  });
}

/**
 * Vardiya uyarısı bastırılmalı mı?
 */
export function shouldSuppressShiftWarning(): boolean {
  return getActiveSpecialPeriods().some(p => p.rules.suppressShiftWarnings);
}

/**
 * Stok eşiği çarpanı (özel dönemde artır/azalt)
 */
export function getStockThresholdMultiplier(): number {
  const periods = getActiveSpecialPeriods();
  const multipliers = periods.map(p => p.rules.adjustStockThreshold || 1);
  return Math.max(...multipliers, 1); // En yüksek çarpanı kullan
}

/**
 * Dobody yumuşak ton mu kullanmalı?
 */
export function shouldUseSofterTone(): boolean {
  return getActiveSpecialPeriods().some(p => p.rules.softerTone);
}

// ──────────────────────────────────────────
// YENİ ŞUBE ONBOARDING MODU
// ──────────────────────────────────────────

/**
 * Şube ilk 30 gün mü? (onboarding modu)
 */
export async function isBranchInOnboarding(branchId: number): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT created_at FROM branches WHERE id = ${branchId}
    `);
    const createdAt = (result as any).rows?.[0]?.created_at;
    if (!createdAt) return false;
    
    const daysSinceCreation = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreation <= 30;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────
// GELİŞMİŞ VERİ KALİTESİ KONTROLLERİ
// ──────────────────────────────────────────

export interface DataQualityResult {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  count: number;
  suggestion: string;
}

export async function runDataQualityChecks(): Promise<DataQualityResult[]> {
  const issues: DataQualityResult[] = [];

  // 1. Çift kayıt tespiti (aynı isim + aynı şube)
  try {
    const dupes = await db.execute(sql`
      SELECT first_name, last_name, branch_id, count(*)::int as cnt 
      FROM users WHERE is_active = true AND branch_id IS NOT NULL
      GROUP BY first_name, last_name, branch_id HAVING count(*) > 1
    `);
    const dupCount = (dupes as any).rows?.length || 0;
    if (dupCount > 0) {
      issues.push({ category: 'Kullanıcı', severity: 'high', issue: `${dupCount} olası çift kullanıcı kaydı`, count: dupCount, suggestion: 'Aynı isim + şube kombinasyonlarını kontrol edin' });
    }
  } catch { /* skip */ }

  // 2. Boş/eksik zorunlu alanlar
  try {
    const noRole = await db.execute(sql`SELECT count(*)::int as cnt FROM users WHERE is_active = true AND (role IS NULL OR role = '')`);
    const cnt = Number((noRole as any).rows?.[0]?.cnt || 0);
    if (cnt > 0) {
      issues.push({ category: 'Kullanıcı', severity: 'critical', issue: `${cnt} kullanıcının rolü tanımlı değil`, count: cnt, suggestion: 'Bu kullanıcılara rol atayın' });
    }
  } catch { /* skip */ }

  // 3. Stok sayımı 30+ gündür yapılmamış şubeler
  try {
    const noCount = await db.execute(sql`
      SELECT b.id, b.name FROM branches b WHERE b.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM inventory_movements im 
        WHERE im.branch_id = b.id AND im.movement_type = 'count'
        AND im.created_at > current_date - interval '30 days'
      )
    `);
    const cnt = (noCount as any).rows?.length || 0;
    if (cnt > 0) {
      issues.push({ category: 'Stok', severity: 'medium', issue: `${cnt} şubede 30+ gündür stok sayımı yapılmamış`, count: cnt, suggestion: 'Stok sayımı hatırlatması gönderin' });
    }
  } catch { /* skip */ }

  // 4. Denetim yapılmamış şubeler (60+ gün)
  try {
    const noAudit = await db.execute(sql`
      SELECT b.id, b.name FROM branches b WHERE b.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM audits_v2 a 
        WHERE a.branch_id = b.id 
        AND a.created_at > current_date - interval '60 days'
      )
    `);
    const cnt = (noAudit as any).rows?.length || 0;
    if (cnt > 0) {
      issues.push({ category: 'Denetim', severity: 'high', issue: `${cnt} şubede 60+ gündür denetim yapılmamış`, count: cnt, suggestion: 'Denetim takvimini güncelleyin' });
    }
  } catch { /* skip */ }

  // 5. Sertifikası süresi dolmuş personel
  try {
    const expired = await db.execute(sql`
      SELECT count(*)::int as cnt FROM issued_certificates 
      WHERE expires_at IS NOT NULL AND expires_at < current_date
    `);
    const cnt = Number((expired as any).rows?.[0]?.cnt || 0);
    if (cnt > 0) {
      issues.push({ category: 'Eğitim', severity: 'medium', issue: `${cnt} sertifikanın süresi dolmuş`, count: cnt, suggestion: 'Yenileme eğitimi atayın' });
    }
  } catch { /* skip */ }

  return issues;
}
