/**
 * Sprint 14 Phase 8 — Hammadde Fiyat Listesi
 *
 * Tüm aktif hammaddelerin güncel fiyat + son değişim + trend ortalaması
 *
 * Endpoint:
 *   GET /api/fiyat-listesi
 *     ?category=kuru_gida
 *     ?supplierId=12
 *     ?sortBy=name|currentPrice|lastChangePercent|priceLastUpdated
 *     ?sortOrder=asc|desc
 *
 * Roller: admin, ceo, cgo, gida_muhendisi, satinalma, fabrika_mudur,
 *         fabrika_sorumlu, kalite, kalite_kontrol
 */

import { Router } from 'express';
import { db } from '../db';
import { rawMaterials, rawMaterialPriceHistory } from '@shared/schema/schema-10';
import { suppliers } from '@shared/schema/schema-09';
import { sql, and, eq, desc, isNotNull } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ALLOWED_ROLES = [
  'admin', 'ceo', 'cgo',
  'gida_muhendisi', 'satinalma',
  'fabrika_mudur', 'fabrika_sorumlu',
  'kalite', 'kalite_kontrol', 'kalite_yoneticisi',
  'recete_gm',
];

router.get('/api/fiyat-listesi', isAuthenticated, async (req: any, res) => {
  try {
    if (!ALLOWED_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { category, supplierId } = req.query;

    // Tüm aktif hammaddeleri al + tedarikçi
    let query = db
      .select({
        id: rawMaterials.id,
        code: rawMaterials.code,
        name: rawMaterials.name,
        category: rawMaterials.category,
        unit: rawMaterials.unit,
        brand: rawMaterials.brand,
        currentUnitPrice: rawMaterials.currentUnitPrice,
        lastPurchasePrice: rawMaterials.lastPurchasePrice,
        averagePrice: rawMaterials.averagePrice,
        priceLastUpdated: rawMaterials.priceLastUpdated,
        supplierId: rawMaterials.supplierId,
        supplierName: suppliers.name,
        isActive: rawMaterials.isActive,
        isKeyblend: rawMaterials.isKeyblend,
      })
      .from(rawMaterials)
      .leftJoin(suppliers, eq(suppliers.id, rawMaterials.supplierId))
      .$dynamic();

    // Filtreler
    const conditions: any[] = [eq(rawMaterials.isActive, true)];
    if (category && typeof category === 'string') {
      conditions.push(eq(rawMaterials.category, category));
    }
    if (supplierId && !isNaN(parseInt(supplierId as string, 10))) {
      conditions.push(eq(rawMaterials.supplierId, parseInt(supplierId as string, 10)));
    }
    query = query.where(and(...conditions));

    const materials = await query;

    // Her hammadde için son fiyat değişimini al (last 30 days)
    const recentPriceChanges = await db
      .select({
        rawMaterialId: rawMaterialPriceHistory.rawMaterialId,
        previousPrice: rawMaterialPriceHistory.previousPrice,
        newPrice: rawMaterialPriceHistory.newPrice,
        changePercent: rawMaterialPriceHistory.changePercent,
        createdAt: rawMaterialPriceHistory.createdAt,
      })
      .from(rawMaterialPriceHistory)
      .orderBy(desc(rawMaterialPriceHistory.createdAt));

    // En son değişimi gruplayarak al
    const latestChangeByMaterial = new Map<number, any>();
    for (const change of recentPriceChanges) {
      if (!latestChangeByMaterial.has(change.rawMaterialId)) {
        latestChangeByMaterial.set(change.rawMaterialId, change);
      }
    }

    // Genişletilmiş veri
    const enriched = materials.map(m => {
      const latestChange = latestChangeByMaterial.get(m.id);
      const currentPrice = m.currentUnitPrice ? parseFloat(m.currentUnitPrice) : 0;
      const avgPrice = m.averagePrice ? parseFloat(m.averagePrice) : 0;
      const deviationFromAvg = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit,
        brand: m.brand,
        supplier: m.supplierName ? { id: m.supplierId, name: m.supplierName } : null,
        currentPrice: currentPrice,
        averagePrice: avgPrice,
        lastPurchasePrice: m.lastPurchasePrice ? parseFloat(m.lastPurchasePrice) : 0,
        deviationFromAvg: Math.round(deviationFromAvg * 10) / 10,
        priceLastUpdated: m.priceLastUpdated,
        lastChange: latestChange ? {
          previousPrice: latestChange.previousPrice ? parseFloat(latestChange.previousPrice) : null,
          newPrice: parseFloat(latestChange.newPrice),
          changePercent: latestChange.changePercent ? parseFloat(latestChange.changePercent) : null,
          changedAt: latestChange.createdAt,
        } : null,
        isKeyblend: m.isKeyblend,
      };
    });

    // İstatistikler
    const total = enriched.length;
    const avgPrice = total > 0 ? enriched.reduce((s, m) => s + m.currentPrice, 0) / total : 0;
    const recentlyChanged = enriched.filter(m => {
      if (!m.lastChange) return false;
      const ageMs = Date.now() - new Date(m.lastChange.changedAt).getTime();
      return ageMs < 30 * 24 * 60 * 60 * 1000; // Son 30 gün
    });
    const priceIncreased = recentlyChanged.filter(m => m.lastChange && m.lastChange.changePercent && m.lastChange.changePercent > 0).length;
    const priceDecreased = recentlyChanged.filter(m => m.lastChange && m.lastChange.changePercent && m.lastChange.changePercent < 0).length;

    return res.json({
      generatedAt: new Date().toISOString(),
      materials: enriched,
      summary: {
        total,
        avgPrice: Math.round(avgPrice * 100) / 100,
        recentlyChanged: recentlyChanged.length,
        priceIncreased,
        priceDecreased,
      },
    });
  } catch (error) {
    logger.error('Fiyat listesi fetch failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Hammadde fiyat geçmişi (girdi-detay sayfası için)
router.get('/api/girdi/:id/price-history', isAuthenticated, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz ID' });
    }

    const history = await db
      .select({
        id: rawMaterialPriceHistory.id,
        previousPrice: rawMaterialPriceHistory.previousPrice,
        newPrice: rawMaterialPriceHistory.newPrice,
        changePercent: rawMaterialPriceHistory.changePercent,
        source: rawMaterialPriceHistory.source,
        notes: rawMaterialPriceHistory.notes,
        changedBy: rawMaterialPriceHistory.changedBy,
        createdAt: rawMaterialPriceHistory.createdAt,
      })
      .from(rawMaterialPriceHistory)
      .where(eq(rawMaterialPriceHistory.rawMaterialId, id))
      .orderBy(desc(rawMaterialPriceHistory.createdAt))
      .limit(50);

    // Format response — frontend bekliyor: date, unitPrice
    const formatted = history.map(h => ({
      id: h.id,
      date: h.createdAt,
      unitPrice: h.newPrice ? parseFloat(h.newPrice) : 0,
      previousPrice: h.previousPrice ? parseFloat(h.previousPrice) : null,
      changePercent: h.changePercent ? parseFloat(h.changePercent) : null,
      source: h.source,
      notes: h.notes,
      changedBy: h.changedBy,
    }));

    return res.json(formatted);
  } catch (error) {
    logger.error('Fiyat geçmişi fetch failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
