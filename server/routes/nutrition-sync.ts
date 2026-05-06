/**
 * Sprint 14 Phase 11 — Besin Akışı Senkronizasyon Servisi
 *
 * Hammadde (rawMaterials) ve factoryIngredientNutrition tablosu arasında
 * besin değeri senkronizasyonu yapar.
 *
 * AKIŞ:
 *   rawMaterials.energyKcal/fat/protein/carbohydrate
 *      ↓ (sync endpoint)
 *   factoryIngredientNutrition (canonical name eşleşmesi)
 *      ↓ (calculate-nutrition endpoint, mevcut)
 *   factoryRecipes.nutritionFacts (JSONB)
 *      ↓ (etiket üretimi)
 *   TGK 2017/2284 etiketi
 *
 * ENDPOINT:
 *   POST /api/nutrition-sync/raw-to-factory  — Tüm rawMaterials → factoryIngredientNutrition
 *   POST /api/nutrition-sync/raw-to-factory/:rawId  — Tek hammadde için
 *   GET  /api/nutrition-sync/coverage-report  — Hangi hammaddenin nutrition'ı eksik
 */

import { Router, Response } from 'express';
import { db } from '../db';
import { rawMaterials, factoryIngredientNutrition } from '@shared/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ALLOWED_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol'];

/**
 * Helper: rawMaterial → factoryIngredientNutrition mapping
 * rawMaterials.allergens (string array) → factoryIngredientNutrition.allergens (string array)
 */
function mapRawToNutrition(raw: any): any {
  return {
    ingredientName: raw.name.trim(),
    energyKcal: raw.energyKcal != null ? String(raw.energyKcal) : null,
    fatG: raw.fat != null ? String(raw.fat) : null,
    saturatedFatG: raw.saturatedFat != null ? String(raw.saturatedFat) : null,
    transFatG: raw.transFat != null ? String(raw.transFat) : null,
    carbohydrateG: raw.carbohydrate != null ? String(raw.carbohydrate) : null,
    sugarG: raw.sugar != null ? String(raw.sugar) : null,
    fiberG: raw.fiber != null ? String(raw.fiber) : null,
    proteinG: raw.protein != null ? String(raw.protein) : null,
    saltG: raw.salt != null ? String(raw.salt) : null,
    sodiumMg: raw.sodium != null ? String(raw.sodium) : null,
    allergens: Array.isArray(raw.allergens) ? raw.allergens : null,
    source: 'raw_materials',
    confidence: 100, // rawMaterials'tan gelen veri %100 güvenilir
  };
}

/**
 * 1) POST /api/nutrition-sync/raw-to-factory
 * Tüm aktif rawMaterials → factoryIngredientNutrition senkronizasyonu (UPSERT)
 *
 * Body: { dryRun?: boolean, onlyMissing?: boolean }
 *   - dryRun: true ise sadece preview, INSERT yapmaz
 *   - onlyMissing: true ise sadece factoryIngredientNutrition'da olmayan rawMaterials'ı ekler
 */
router.post('/api/nutrition-sync/raw-to-factory', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Senkronizasyon yetkiniz yok' });
    }

    const { dryRun = false, onlyMissing = false } = req.body || {};

    // Aktif rawMaterials çek (en az 1 nutrition alanı dolu olanlar)
    const allRaws = await db
      .select()
      .from(rawMaterials)
      .where(and(
        eq(rawMaterials.isActive, true),
        // En az birisi dolu olsun (tamamen boş hammaddeler için anlamsız)
        sql`(${rawMaterials.energyKcal} IS NOT NULL OR ${rawMaterials.protein} IS NOT NULL OR ${rawMaterials.fat} IS NOT NULL OR ${rawMaterials.carbohydrate} IS NOT NULL)`
      ));

    if (allRaws.length === 0) {
      return res.json({
        message: 'Senkronize edilecek hammadde yok (besin değeri olan aktif kayıt yok)',
        stats: { total: 0, synced: 0, skipped: 0, alreadyExists: 0 },
      });
    }

    // factoryIngredientNutrition'da mevcut isimleri çek
    const existingNutrition = await db
      .select({ name: factoryIngredientNutrition.ingredientName })
      .from(factoryIngredientNutrition);
    const existingSet = new Set(existingNutrition.map(n => n.name.toLowerCase().trim()));

    const toSync: any[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    let alreadyExistsCount = 0;

    for (const raw of allRaws) {
      const cleanName = raw.name.trim();

      if (existingSet.has(cleanName.toLowerCase())) {
        alreadyExistsCount++;
        if (onlyMissing) {
          skipped.push({ name: cleanName, reason: 'Zaten factoryIngredientNutrition\'da var' });
          continue;
        }
      }

      toSync.push(mapRawToNutrition(raw));
    }

    if (dryRun) {
      return res.json({
        mode: 'dry-run',
        stats: {
          total: allRaws.length,
          syncCandidates: toSync.length,
          alreadyExists: alreadyExistsCount,
          skipped: skipped.length,
        },
        preview: toSync.slice(0, 20).map(t => ({
          name: t.ingredientName,
          energy: t.energyKcal,
          protein: t.proteinG,
          allergens: t.allergens,
        })),
        skipped: skipped.slice(0, 10),
      });
    }

    // Gerçek UPSERT (INSERT ... ON CONFLICT DO UPDATE)
    let syncedCount = 0;
    if (toSync.length > 0) {
      // Drizzle ORM upsert with onConflictDoUpdate
      for (const item of toSync) {
        try {
          await db
            .insert(factoryIngredientNutrition)
            .values(item)
            .onConflictDoUpdate({
              target: factoryIngredientNutrition.ingredientName,
              set: {
                energyKcal: item.energyKcal,
                fatG: item.fatG,
                saturatedFatG: item.saturatedFatG,
                transFatG: item.transFatG,
                carbohydrateG: item.carbohydrateG,
                sugarG: item.sugarG,
                fiberG: item.fiberG,
                proteinG: item.proteinG,
                saltG: item.saltG,
                sodiumMg: item.sodiumMg,
                allergens: item.allergens,
                source: item.source,
                confidence: item.confidence,
                updatedAt: new Date(),
              },
            });
          syncedCount++;
        } catch (err) {
          logger.error(`Sync failed for ${item.ingredientName}`, err);
          skipped.push({ name: item.ingredientName, reason: String(err) });
        }
      }
    }

    logger.info(`Nutrition sync: ${syncedCount} synced, ${skipped.length} skipped (user: ${user.id})`);

    return res.json({
      mode: 'commit',
      stats: {
        total: allRaws.length,
        synced: syncedCount,
        alreadyExists: alreadyExistsCount,
        skipped: skipped.length,
      },
      skipped: skipped.slice(0, 10),
    });
  } catch (error) {
    logger.error('Nutrition sync error', error);
    return res.status(500).json({ message: 'Senkronizasyon başarısız', error: String(error) });
  }
});

/**
 * 2) POST /api/nutrition-sync/raw-to-factory/:rawId
 * Tek hammadde için sync (UPSERT)
 */
router.post('/api/nutrition-sync/raw-to-factory/:rawId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const rawId = parseInt(req.params.rawId, 10);
    if (!Number.isFinite(rawId)) {
      return res.status(400).json({ message: 'Geçersiz id' });
    }

    const [raw] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, rawId));
    if (!raw) return res.status(404).json({ message: 'Hammadde bulunamadı' });

    const item = mapRawToNutrition(raw);

    await db
      .insert(factoryIngredientNutrition)
      .values(item)
      .onConflictDoUpdate({
        target: factoryIngredientNutrition.ingredientName,
        set: {
          energyKcal: item.energyKcal,
          fatG: item.fatG,
          saturatedFatG: item.saturatedFatG,
          carbohydrateG: item.carbohydrateG,
          sugarG: item.sugarG,
          fiberG: item.fiberG,
          proteinG: item.proteinG,
          saltG: item.saltG,
          allergens: item.allergens,
          source: item.source,
          confidence: item.confidence,
          updatedAt: new Date(),
        },
      });

    return res.json({ message: 'Senkronize edildi', ingredientName: item.ingredientName });
  } catch (error) {
    logger.error('Single sync error', error);
    return res.status(500).json({ message: 'Senkronizasyon başarısız' });
  }
});

/**
 * 3) GET /api/nutrition-sync/coverage-report
 * Kapsama raporu: kaç hammaddenin besin verisi var, kaçında eksik
 */
router.get('/api/nutrition-sync/coverage-report', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const allRaws = await db.select().from(rawMaterials).where(eq(rawMaterials.isActive, true));

    const stats = {
      totalActive: allRaws.length,
      withEnergy: allRaws.filter(r => r.energyKcal != null).length,
      withFullMacros: allRaws.filter(r => r.energyKcal != null && r.protein != null && r.fat != null && r.carbohydrate != null).length,
      withAllergens: allRaws.filter(r => Array.isArray(r.allergens) && r.allergens.length > 0).length,
      missingEnergy: allRaws.filter(r => r.energyKcal == null).length,
      missingMacros: allRaws.filter(r => r.energyKcal == null || r.protein == null || r.fat == null || r.carbohydrate == null).length,
    };

    const missingDetails = allRaws
      .filter(r => r.energyKcal == null || r.protein == null || r.fat == null || r.carbohydrate == null)
      .slice(0, 30)
      .map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        missingFields: [
          r.energyKcal == null ? 'energyKcal' : null,
          r.protein == null ? 'protein' : null,
          r.fat == null ? 'fat' : null,
          r.carbohydrate == null ? 'carbohydrate' : null,
        ].filter(Boolean),
      }));

    const coverage = stats.totalActive > 0 ? Math.round((stats.withFullMacros / stats.totalActive) * 100) : 0;

    return res.json({
      stats,
      coveragePct: coverage,
      missingDetails,
      tip: stats.missingMacros > 0
        ? `${stats.missingMacros} hammaddenin besin verisi eksik. TÜRKOMP'tan tamamlayıp yeniden senkronize edin.`
        : 'Tüm hammaddelerin besin verisi tamam ✓',
    });
  } catch (error) {
    logger.error('Coverage report error', error);
    return res.status(500).json({ message: 'Rapor oluşturulamadı' });
  }
});

export default router;
