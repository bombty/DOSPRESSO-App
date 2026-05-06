/**
 * Mr. Dobody — Hammadde Veri Eksikliği Raporu
 *
 * Aslan'ın 7 May 2026 geri bildirimi sonrası eklendi:
 * "eğer bir hammaddenin besin değeri içerik bilgisi yoksa, yapay zeka
 *  yani Mr.Dobody hangi hammaddelerde besin değeri içerik bilgi alerjenler
 *  olmadığının uyarısı verip bu eksiklerin gidermesini istemeli"
 *
 * Endpoint:
 *   GET /api/mr-dobody/hammadde-eksiklik-raporu
 *
 * Dönüş:
 *   {
 *     totalRawMaterials, completelyMissing, partiallyMissing,
 *     missingByField: {
 *       contentInfo: [...],
 *       allergenDetail: [...],
 *       energyKcal: [...],
 *       crossContamination: [...]
 *     },
 *     priority: [{ id, name, missingFields, severity }]
 *   }
 */

import { Router } from 'express';
import { db } from '../db';
import { rawMaterials } from '@shared/schema/schema-10';
import { sql, and, eq, isNull, isNotNull, or } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ALLOWED_ROLES = [
  'admin', 'ceo', 'cgo',
  'gida_muhendisi', 'kalite_kontrol', 'kalite_yoneticisi',
  'satinalma',
];

router.get('/api/mr-dobody/hammadde-eksiklik-raporu', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!ALLOWED_ROLES.includes(user?.role)) {
      return res.status(403).json({ message: 'Bu rapora erişim yetkiniz yok' });
    }

    // Tüm aktif hammaddeleri çek
    const all = await db
      .select({
        id: rawMaterials.id,
        code: rawMaterials.code,
        name: rawMaterials.name,
        category: rawMaterials.category,
        contentInfo: rawMaterials.contentInfo,
        allergenPresent: rawMaterials.allergenPresent,
        allergenDetail: rawMaterials.allergenDetail,
        crossContamination: rawMaterials.crossContamination,
        storageConditions: rawMaterials.storageConditions,
        energyKcal: rawMaterials.energyKcal,
        fat: rawMaterials.fat,
        carbohydrate: rawMaterials.carbohydrate,
        protein: rawMaterials.protein,
      })
      .from(rawMaterials)
      .where(eq(rawMaterials.isActive, true));

    const totalRawMaterials = all.length;

    // Her hammadde için eksiklik analizi
    const analysis = all.map((m) => {
      const missingFields: string[] = [];
      const missingLabels: string[] = [];

      if (!m.contentInfo) {
        missingFields.push('contentInfo');
        missingLabels.push('İçerik bilgisi');
      }
      if (m.allergenPresent === null || m.allergenPresent === undefined) {
        missingFields.push('allergenInfo');
        missingLabels.push('Alerjen bilgisi');
      }
      if (m.allergenPresent && !m.allergenDetail) {
        missingFields.push('allergenDetail');
        missingLabels.push('Alerjen detayı');
      }
      if (!m.crossContamination) {
        missingFields.push('crossContamination');
        missingLabels.push('Çapraz bulaşma');
      }
      if (!m.storageConditions) {
        missingFields.push('storageConditions');
        missingLabels.push('Saklama koşulları');
      }
      if (m.energyKcal === null || m.energyKcal === undefined) {
        missingFields.push('energyKcal');
        missingLabels.push('Enerji (kcal)');
      }
      if (m.fat === null || m.fat === undefined) {
        missingFields.push('fat');
        missingLabels.push('Yağ');
      }
      if (m.carbohydrate === null || m.carbohydrate === undefined) {
        missingFields.push('carbohydrate');
        missingLabels.push('Karbonhidrat');
      }
      if (m.protein === null || m.protein === undefined) {
        missingFields.push('protein');
        missingLabels.push('Protein');
      }

      // Severity: TGK m.9 zorunlu olanlar yüksek öncelik
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (missingFields.includes('contentInfo') || missingFields.includes('allergenInfo')) {
        severity = 'critical'; // TGK m.9'a göre etiket basılamaz
      } else if (missingFields.includes('energyKcal') || missingFields.includes('fat')) {
        severity = 'high'; // Besin değeri tablosu üretilemez
      } else if (missingFields.length >= 3) {
        severity = 'medium';
      } else if (missingFields.length > 0) {
        severity = 'low';
      }

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        missingFields,
        missingLabels,
        missingCount: missingFields.length,
        severity,
        actionLink: `/girdi-yonetimi`, // Detay sayfası açılınca düzenle
      };
    });

    const completelyMissing = analysis.filter((a) => a.missingCount >= 5).length;
    const partiallyMissing = analysis.filter((a) => a.missingCount > 0 && a.missingCount < 5).length;
    const complete = analysis.filter((a) => a.missingCount === 0).length;

    // Alana göre eksik liste (Mr. Dobody bunları gösterip "doldur" diyecek)
    const missingByField = {
      contentInfo: analysis.filter((a) => a.missingFields.includes('contentInfo')),
      allergenDetail: analysis.filter((a) => a.missingFields.includes('allergenDetail')),
      energyKcal: analysis.filter((a) => a.missingFields.includes('energyKcal')),
      crossContamination: analysis.filter((a) => a.missingFields.includes('crossContamination')),
      storageConditions: analysis.filter((a) => a.missingFields.includes('storageConditions')),
    };

    // Öncelikli (kritik + yüksek) hammaddeler
    const priority = analysis
      .filter((a) => a.severity === 'critical' || a.severity === 'high')
      .sort((a, b) => {
        const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return sevOrder[a.severity] - sevOrder[b.severity];
      })
      .slice(0, 30);

    // KPI'lar
    const kpis = {
      totalRawMaterials,
      complete,
      partiallyMissing,
      completelyMissing,
      completionRate: totalRawMaterials > 0 ? Math.round((complete / totalRawMaterials) * 100) : 0,
      criticalCount: analysis.filter((a) => a.severity === 'critical').length,
      highCount: analysis.filter((a) => a.severity === 'high').length,
    };

    return res.json({
      generatedAt: new Date().toISOString(),
      kpis,
      missingByField: {
        contentInfo: missingByField.contentInfo.map((m) => ({ id: m.id, name: m.name, code: m.code })),
        allergenDetail: missingByField.allergenDetail.map((m) => ({ id: m.id, name: m.name, code: m.code })),
        energyKcal: missingByField.energyKcal.map((m) => ({ id: m.id, name: m.name, code: m.code })),
        crossContamination: missingByField.crossContamination.map((m) => ({ id: m.id, name: m.name, code: m.code })),
        storageConditions: missingByField.storageConditions.map((m) => ({ id: m.id, name: m.name, code: m.code })),
      },
      priority,
    });
  } catch (error: any) {
    logger.error('Mr. Dobody hammadde eksiklik raporu hatası', error);
    return res.status(500).json({ message: 'Sunucu hatası: ' + (error.message || 'bilinmeyen') });
  }
});

export default router;
