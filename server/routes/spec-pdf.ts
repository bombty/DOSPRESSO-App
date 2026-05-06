/**
 * Ürün Spesifikasyon PDF Endpoint
 *
 * Aslan 7 May 2026: "tüm ürünler için sistem bu şekilde ürün spesifikasyonu
 *  üretmeli pdf olarak ve gıda mühendisi veya yetkili başka birisi varsa
 *  örneğin cgo, admin vs tıklayarak çıktı alabilmeli"
 *
 * Endpoint:
 *   GET /api/factory/recipes/:id/specification.pdf — PDF üret + indir
 *   GET /api/factory/recipes/:id/specification.json — Mapping önizleme (debug)
 */

import { Router } from 'express';
import { db } from '../db';
import { factoryRecipes } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';
import { generateSpecificationPDF, recipeToSpec } from '../utils/spec-pdf-generator';

const router = Router();

// Yetki: gıda mühendisi, kalite, CGO, admin (Aslan'ın istediği roller)
const ROLES_CAN_DOWNLOAD = [
  'admin', 'ceo', 'cgo',
  'gida_muhendisi', 'kalite_kontrol', 'kalite_yoneticisi',
  'recete_gm',
];

// JSON önizleme (debug)
router.get('/api/factory/recipes/:id/specification.json', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_DOWNLOAD.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Spesifikasyon yetkiniz yok' });
    }
    const recipeId = parseInt(req.params.id, 10);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
    if (!recipe) return res.status(404).json({ message: 'Reçete bulunamadı' });
    
    const spec = recipeToSpec(recipe);
    return res.json(spec);
  } catch (error: any) {
    logger.error('Spec preview hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// PDF üret
router.get('/api/factory/recipes/:id/specification-download', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_DOWNLOAD.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Spesifikasyon yetkiniz yok' });
    }
    const recipeId = parseInt(req.params.id, 10);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
    if (!recipe) return res.status(404).json({ message: 'Reçete bulunamadı' });
    
    // ETag cache: reçete değişmediyse 304 dön (Aslan review feedback - hata 6)
    const updatedAt = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : Date.now();
    const etag = `"spec-${recipe.id}-${updatedAt}-${recipe.gramajApproved ? 'a' : 'd'}"`;
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 dk cache
    
    // Reçete onaylanmamışsa uyar (ama yine de üret — taslak modunda)
    const isDraft = !recipe.gramajApproved;
    
    const spec = recipeToSpec(recipe);
    const pdfBytes = await generateSpecificationPDF(spec);
    
    // Audit log için
    logger.info('Spesifikasyon PDF üretildi', {
      recipeId, recipeCode: recipe.code, recipeName: recipe.name,
      userId: req.user.id, userRole: req.user.role,
      isDraft,
    });
    
    const filename = `${spec.documentNo}_${(recipe.name || 'urun').replace(/[^a-zA-Z0-9]/g, '_')}_Spesifikasyonu${isDraft ? '_TASLAK' : ''}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    logger.error('Spec PDF üretim hatası', error);
    return res.status(500).json({ message: 'PDF üretilemedi: ' + error.message });
  }
});

export default router;
