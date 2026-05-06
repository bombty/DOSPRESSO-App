/**
 * Mr. Dobody Hammadde Eksiklik Raporu
 *
 * Aslan 7 May 2026 talebi:
 *   "AI eksikleri uyarmıyor"
 *
 * raw_materials tablosundaki TGK uyumluluk için kritik alanların
 * eksik olup olmadığını severity'e göre rapor eder.
 *
 * SEVERITY:
 *   - critical: TGK için zorunlu (allergenDetail, contentInfo)
 *   - high:     Üretim için kritik (energyKcal, allergenPresent flag)
 *   - medium:   Tam uyum için (storageConditions, brand, supplier)
 *   - low:      İsteğe bağlı (notes, materialGroup)
 *
 * Endpoint:
 *   GET /api/mr-dobody/hammadde-eksiklik-raporu
 *
 * Yetki: admin, ceo, cgo, satinalma, gida_muhendisi, kalite_kontrol,
 *        kalite_yoneticisi, fabrika_mudur
 */

import { Router } from 'express';
import { db } from '../db';
import { rawMaterials } from '@shared/schema/schema-10';
import { eq, and, isNull, sql, or } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ROLES_CAN_VIEW = [
  'admin', 'ceo', 'cgo',
  'satinalma',
  'gida_muhendisi', 'kalite_kontrol', 'kalite_yoneticisi',
  'fabrika_mudur', 'fabrika_sorumlu',
];

interface MissingField {
  field: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface HammaddeIssue {
  id: number;
  code: string;
  name: string;
  category: string | null;
  brand: string | null;
  unit: string;
  isActive: boolean;
  missingFields: MissingField[];
  highestSeverity: 'critical' | 'high' | 'medium' | 'low';
  totalMissing: number;
}

router.get('/api/mr-dobody/hammadde-eksiklik-raporu', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const allMaterials = await db
      .select()
      .from(rawMaterials)
      .where(eq(rawMaterials.isActive, true));

    const issues: HammaddeIssue[] = [];

    for (const m of allMaterials) {
      const missing: MissingField[] = [];

      // CRITICAL — TGK zorunlu
      if (!m.contentInfo || m.contentInfo.trim() === '') {
        missing.push({
          field: 'contentInfo',
          label: 'İçerik Bilgisi',
          severity: 'critical',
          reason: 'TGK Madde 9 — içindekiler listesi zorunlu',
        });
      }

      if (m.allergenPresent && (!m.allergenDetail || m.allergenDetail.trim() === '')) {
        missing.push({
          field: 'allergenDetail',
          label: 'Alerjen Detayı',
          severity: 'critical',
          reason: 'Alerjen var ama hangi alerjen belirtilmemiş (TGK EK-1)',
        });
      }

      // HIGH — Üretim için kritik
      if (m.energyKcal === null || m.energyKcal === undefined) {
        missing.push({
          field: 'energyKcal',
          label: 'Enerji (kcal)',
          severity: 'high',
          reason: 'Reçete besin hesabı için gerekli',
        });
      }

      if (m.allergenPresent === null) {
        missing.push({
          field: 'allergenPresent',
          label: 'Alerjen Var Mı?',
          severity: 'high',
          reason: 'Alerjen bilgisi belirtilmemiş — true/false ayarlanmalı',
        });
      }

      if (m.fat === null) {
        missing.push({
          field: 'fat',
          label: 'Yağ (g)',
          severity: 'high',
          reason: 'Etiket için zorunlu',
        });
      }

      if (m.carbohydrate === null) {
        missing.push({
          field: 'carbohydrate',
          label: 'Karbonhidrat (g)',
          severity: 'high',
          reason: 'Etiket için zorunlu',
        });
      }

      if (m.protein === null) {
        missing.push({
          field: 'protein',
          label: 'Protein (g)',
          severity: 'high',
          reason: 'Etiket için zorunlu',
        });
      }

      // MEDIUM — Tam uyum
      if (!m.storageConditions || m.storageConditions.trim() === '') {
        missing.push({
          field: 'storageConditions',
          label: 'Saklama Koşulları',
          severity: 'medium',
          reason: 'Spesifikasyon dökümanı için',
        });
      }

      if (!m.brand || m.brand.trim() === '') {
        missing.push({
          field: 'brand',
          label: 'Marka',
          severity: 'medium',
          reason: 'Tedarikçi izlenebilirliği için',
        });
      }

      if (m.supplierId === null) {
        missing.push({
          field: 'supplierId',
          label: 'Tedarikçi',
          severity: 'medium',
          reason: 'Tedarikçi atanmamış',
        });
      }

      if (m.crossContamination === null || m.crossContamination === '') {
        missing.push({
          field: 'crossContamination',
          label: 'Çapraz Bulaşma',
          severity: 'medium',
          reason: 'Alerjen yönetimi için (hat içi)',
        });
      }

      // LOW — Tamamlayıcı
      if (!m.materialGroup) {
        missing.push({
          field: 'materialGroup',
          label: 'Malzeme Grubu',
          severity: 'low',
          reason: 'Filtre ve raporlama için',
        });
      }

      if (m.tgkCompliant !== true) {
        missing.push({
          field: 'tgkCompliant',
          label: 'TGK Uyum Onayı',
          severity: 'low',
          reason: 'TGK uyum onayı verilmemiş',
        });
      }

      if (missing.length > 0) {
        const severities = missing.map(x => x.severity);
        const highestSeverity: 'critical' | 'high' | 'medium' | 'low' = 
          severities.includes('critical') ? 'critical' :
          severities.includes('high') ? 'high' :
          severities.includes('medium') ? 'medium' : 'low';

        issues.push({
          id: m.id,
          code: m.code,
          name: m.name,
          category: m.category,
          brand: m.brand,
          unit: m.unit,
          isActive: m.isActive ?? true,
          missingFields: missing,
          highestSeverity,
          totalMissing: missing.length,
        });
      }
    }

    // Severity'ye göre sırala (critical önce)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => {
      const sevDiff = severityOrder[a.highestSeverity] - severityOrder[b.highestSeverity];
      if (sevDiff !== 0) return sevDiff;
      return b.totalMissing - a.totalMissing; // Daha çok eksiği olan önce
    });

    // KPI hesapla
    const totalMaterials = allMaterials.length;
    const critical = issues.filter(i => i.highestSeverity === 'critical').length;
    const high = issues.filter(i => i.highestSeverity === 'high').length;
    const medium = issues.filter(i => i.highestSeverity === 'medium').length;
    const low = issues.filter(i => i.highestSeverity === 'low').length;
    const complete = totalMaterials - issues.length;
    const completionRate = totalMaterials > 0 ? Math.round((complete / totalMaterials) * 100) : 0;

    return res.json({
      kpis: {
        totalRawMaterials: totalMaterials,
        completeCount: complete,
        completionRate,
        criticalCount: critical,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
      },
      issues,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Mr. Dobody hammadde eksiklik raporu hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
