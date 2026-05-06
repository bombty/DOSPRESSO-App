// ═══════════════════════════════════════════════════════════════════
// Sprint 7 (5 May 2026) - Girdi Yönetimi / TGK 2017/2284 Uyumu
// ═══════════════════════════════════════════════════════════════════
// 
// Endpoints:
//   GET    /api/girdi/list              — Tüm girdiler (filter/search)
//   GET    /api/girdi/:id               — Tek girdi detay
//   POST   /api/girdi                   — Yeni girdi ekle
//   PUT    /api/girdi/:id               — Girdi güncelle
//   DELETE /api/girdi/:id               — Girdi sil (soft)
//   POST   /api/girdi/import            — Numbers/Excel import
//   GET    /api/girdi/stats             — Dashboard özet
//   GET    /api/girdi/allergen-matrix   — Alerjen matrisi
//   GET    /api/girdi/tgk-non-compliant — TGK uyumsuz girdiler
//
//   GET    /api/tedarikci-kalite/list           — Tedarikçi kalite kayıtları
//   POST   /api/tedarikci-kalite                — Yeni QC kaydı
//   GET    /api/tedarikci-kalite/performance/:supplierId — Tedarikçi performans
//
//   POST   /api/tgk-label/calculate     — Reçeteden besin değeri hesapla
//   GET    /api/tgk-label/:id           — Etiket detay
//   POST   /api/tgk-label               — Yeni etiket oluştur
//   PUT    /api/tgk-label/:id/approve   — Gıda mühendisi onayı
//
// Yetki:
//   READ:  admin, ceo, cgo, satinalma, gida_muhendisi, kalite_kontrol, fabrika_mudur
//   WRITE: admin, ceo, satinalma, gida_muhendisi
//   APPROVE TGK LABEL: admin, gida_muhendisi
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import {
  rawMaterials,
  suppliers,
  supplierQualityRecords,
  tgkLabels,
  productRecipeIngredients,
  branchProducts,
} from '@shared/schema';
import { and, eq, ilike, or, desc, sql, isNull, gte, lte } from 'drizzle-orm';

const router = Router();

// Yetki rolleri
const READ_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'fabrika_mudur', 'fabrika_sorumlu', 'kalite'];
const WRITE_ROLES = ['admin', 'ceo', 'satinalma', 'gida_muhendisi'];
const APPROVE_LABEL_ROLES = ['admin', 'gida_muhendisi'];

function canRead(role: string): boolean {
  return READ_ROLES.includes(role);
}

function canWrite(role: string): boolean {
  return WRITE_ROLES.includes(role);
}

function canApproveLabel(role: string): boolean {
  return APPROVE_LABEL_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// 1) GET /api/girdi/list — Tüm girdiler (filter/search)
// ═══════════════════════════════════════════════════════════════════

router.get('/api/girdi/list', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Girdi yönetimi görüntüleme yetkiniz yok' });
    }

    const search = (req.query.search as string) || '';
    const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : null;
    const materialGroup = (req.query.materialGroup as string) || null;
    const tgkOnly = req.query.tgkOnly === 'true';
    const allergenOnly = req.query.allergenOnly === 'true';

    const conditions: any[] = [eq(rawMaterials.isActive, true)];
    
    if (search) {
      conditions.push(or(
        ilike(rawMaterials.name, `%${search}%`),
        ilike(rawMaterials.code, `%${search}%`),
        ilike(rawMaterials.brand, `%${search}%`),
      ));
    }
    if (supplierId) conditions.push(eq(rawMaterials.supplierId, supplierId));
    if (materialGroup) conditions.push(eq(rawMaterials.materialGroup, materialGroup));
    if (tgkOnly) conditions.push(eq(rawMaterials.tgkCompliant, true));
    if (allergenOnly) conditions.push(eq(rawMaterials.allergenPresent, true));

    const items = await db.select({
      id: rawMaterials.id,
      code: rawMaterials.code,
      name: rawMaterials.name,
      brand: rawMaterials.brand,
      materialGroup: rawMaterials.materialGroup,
      category: rawMaterials.category,
      unit: rawMaterials.unit,
      currentUnitPrice: rawMaterials.currentUnitPrice,
      supplierId: rawMaterials.supplierId,
      supplierName: suppliers.name,
      contentInfo: rawMaterials.contentInfo,
      allergenPresent: rawMaterials.allergenPresent,
      allergenDetail: rawMaterials.allergenDetail,
      crossContamination: rawMaterials.crossContamination,
      energyKcal: rawMaterials.energyKcal,
      fat: rawMaterials.fat,
      carbohydrate: rawMaterials.carbohydrate,
      sugar: rawMaterials.sugar,
      protein: rawMaterials.protein,
      salt: rawMaterials.salt,
      tgkCompliant: rawMaterials.tgkCompliant,
      isKeyblend: rawMaterials.isKeyblend,
      countryOfOrigin: rawMaterials.countryOfOrigin,
    })
      .from(rawMaterials)
      .leftJoin(suppliers, eq(rawMaterials.supplierId, suppliers.id))
      .where(and(...conditions))
      .orderBy(rawMaterials.name);

    res.json(items);
  } catch (error: unknown) {
    console.error('/api/girdi/list error:', error);
    res.status(500).json({ message: 'Girdi listesi alınamadı', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) GET /api/girdi/:id — Tek girdi detay
// ═══════════════════════════════════════════════════════════════════

router.get('/api/girdi/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const id = parseInt(req.params.id);
    const [item] = await db.select()
      .from(rawMaterials)
      .leftJoin(suppliers, eq(rawMaterials.supplierId, suppliers.id))
      .where(eq(rawMaterials.id, id))
      .limit(1);

    if (!item) return res.status(404).json({ message: 'Girdi bulunamadı' });

    res.json(item);
  } catch (error: unknown) {
    console.error('/api/girdi/:id error:', error);
    res.status(500).json({ message: 'Girdi alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3) POST /api/girdi — Yeni girdi ekle
// ═══════════════════════════════════════════════════════════════════

router.post('/api/girdi', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'Girdi ekleme yetkiniz yok' });
    }

    const body = req.body;
    
    // Otomatik enerji_kj hesapla
    if (body.energyKcal && !body.energyKj) {
      body.energyKj = (parseFloat(body.energyKcal) * 4.184).toFixed(2);
    }

    // Code yoksa otomatik üret (HAM + 3 digit)
    if (!body.code) {
      const lastCode = await db.select({ code: rawMaterials.code })
        .from(rawMaterials)
        .where(ilike(rawMaterials.code, 'HAM%'))
        .orderBy(desc(rawMaterials.code))
        .limit(1);
      const lastNum = lastCode[0]?.code ? parseInt(lastCode[0].code.replace('HAM', '')) : 0;
      body.code = `HAM${String(lastNum + 1).padStart(3, '0')}`;
    }

    if (!body.unit) body.unit = 'kg';

    const [created] = await db.insert(rawMaterials).values(body).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('/api/girdi POST error:', error);
    res.status(500).json({ message: 'Girdi eklenemedi', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4) PUT /api/girdi/:id — Girdi güncelle
// ═══════════════════════════════════════════════════════════════════

router.put('/api/girdi/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'Girdi güncelleme yetkiniz yok' });
    }

    const id = parseInt(req.params.id);
    const body = req.body;
    body.updatedAt = new Date();

    // Otomatik enerji_kj hesapla
    if (body.energyKcal && !body.energyKj) {
      body.energyKj = (parseFloat(body.energyKcal) * 4.184).toFixed(2);
    }

    const [updated] = await db.update(rawMaterials)
      .set(body)
      .where(eq(rawMaterials.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Girdi bulunamadı' });
    res.json(updated);
  } catch (error: unknown) {
    console.error('/api/girdi PUT error:', error);
    res.status(500).json({ message: 'Girdi güncellenemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5) DELETE /api/girdi/:id — Soft delete (isActive=false)
// ═══════════════════════════════════════════════════════════════════

router.delete('/api/girdi/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const id = parseInt(req.params.id);
    const [updated] = await db.update(rawMaterials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rawMaterials.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Girdi bulunamadı' });
    res.json({ message: 'Girdi pasif duruma alındı', id });
  } catch (error: unknown) {
    console.error('/api/girdi DELETE error:', error);
    res.status(500).json({ message: 'Girdi silinemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6) GET /api/girdi/stats — Dashboard özet
// ═══════════════════════════════════════════════════════════════════

router.get('/api/girdi-stats/overview', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const allItems = await db.select({
      id: rawMaterials.id,
      tgkCompliant: rawMaterials.tgkCompliant,
      allergenPresent: rawMaterials.allergenPresent,
      materialGroup: rawMaterials.materialGroup,
      supplierId: rawMaterials.supplierId,
    }).from(rawMaterials).where(eq(rawMaterials.isActive, true));

    const totalSuppliers = await db.select({ count: sql<number>`COUNT(DISTINCT id)` })
      .from(suppliers)
      .where(eq(suppliers.status, 'aktif'));

    const groupCounts: Record<string, number> = {};
    allItems.forEach(item => {
      const g = item.materialGroup || 'Belirtilmemiş';
      groupCounts[g] = (groupCounts[g] || 0) + 1;
    });

    res.json({
      totalGirdi: allItems.length,
      tgkCompliant: allItems.filter(i => i.tgkCompliant).length,
      tgkNonCompliant: allItems.filter(i => !i.tgkCompliant).length,
      withAllergen: allItems.filter(i => i.allergenPresent).length,
      totalSuppliers: totalSuppliers[0]?.count || 0,
      uniqueGroups: Object.keys(groupCounts).length,
      groupBreakdown: groupCounts,
    });
  } catch (error: unknown) {
    console.error('/api/girdi-stats/overview error:', error);
    res.status(500).json({ message: 'İstatistikler alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6b) GET /api/tedarikci-kalite/list — QC kayıtlarını listele
// Aslan 7 May 2026 fix: Frontend bunu çağırıyordu ama endpoint yoktu
// ═══════════════════════════════════════════════════════════════════

router.get('/api/tedarikci-kalite/list', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'QC kaydı görüntüleme yetkiniz yok' });
    }

    const { supplierId, status, limit } = req.query;
    
    const conditions: any[] = [];
    if (supplierId) conditions.push(eq(supplierQualityRecords.supplierId, Number(supplierId)));
    
    // status mapping: yesil/sari/kirmizi → kabul/şartlı_kabul/red
    if (status) {
      const statusMap: Record<string, string> = {
        yesil: 'kabul',
        sari: 'şartlı_kabul',
        kirmizi: 'red',
      };
      const dbStatus = statusMap[String(status)] || String(status);
      conditions.push(eq(supplierQualityRecords.inspectionStatus, dbStatus));
    }

    const records = await db
      .select({
        id: supplierQualityRecords.id,
        supplierId: supplierQualityRecords.supplierId,
        supplierName: suppliers.name,
        rawMaterialId: supplierQualityRecords.rawMaterialId,
        rawMaterialName: rawMaterials.name,
        inspectionDate: supplierQualityRecords.deliveryDate,
        inspectionStatus: supplierQualityRecords.inspectionStatus,
        invoiceNumber: supplierQualityRecords.invoiceNumber,
        deliveredQuantity: supplierQualityRecords.deliveredQuantity,
        unit: supplierQualityRecords.unit,
        nonConformity: supplierQualityRecords.nonConformity,
        rejectionReason: supplierQualityRecords.rejectionReason,
        correctiveAction: supplierQualityRecords.correctiveAction,
        notes: supplierQualityRecords.notes,
        createdAt: supplierQualityRecords.createdAt,
      })
      .from(supplierQualityRecords)
      .leftJoin(suppliers, eq(supplierQualityRecords.supplierId, suppliers.id))
      .leftJoin(rawMaterials, eq(supplierQualityRecords.rawMaterialId, rawMaterials.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supplierQualityRecords.deliveryDate))
      .limit(limit ? Number(limit) : 100);

    // Frontend'e map: status field
    const reverseStatusMap: Record<string, string> = {
      'kabul': 'yesil',
      'şartlı_kabul': 'sari',
      'red': 'kirmizi',
    };

    const mapped = records.map(r => ({
      ...r,
      status: reverseStatusMap[r.inspectionStatus] || r.inspectionStatus,
      defectType: r.nonConformity, // legacy field naming
    }));

    return res.json(mapped);
  } catch (error: unknown) {
    console.error('/api/tedarikci-kalite/list error:', error);
    res.status(500).json({ message: 'QC kayıtları alınamadı', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 7) POST /api/tedarikci-kalite — Yeni QC kaydı
// ═══════════════════════════════════════════════════════════════════

router.post('/api/tedarikci-kalite', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'QC kaydı oluşturma yetkiniz yok' });
    }

    const body = req.body;
    body.inspectedById = user.id;

    const [created] = await db.insert(supplierQualityRecords).values(body).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('/api/tedarikci-kalite POST error:', error);
    res.status(500).json({ message: 'QC kaydı oluşturulamadı', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8) GET /api/tedarikci-kalite/performance/:supplierId — Tedarikçi performans
// ═══════════════════════════════════════════════════════════════════

router.get('/api/tedarikci-kalite/performance/:supplierId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const supplierId = parseInt(req.params.supplierId);
    
    const records = await db.select()
      .from(supplierQualityRecords)
      .where(eq(supplierQualityRecords.supplierId, supplierId))
      .orderBy(desc(supplierQualityRecords.deliveryDate));

    const totalDeliveries = records.length;
    const accepted = records.filter(r => r.inspectionStatus === 'kabul').length;
    const conditional = records.filter(r => r.inspectionStatus === 'şartlı_kabul').length;
    const rejected = records.filter(r => r.inspectionStatus === 'red').length;
    const performance = totalDeliveries > 0 
      ? ((accepted + conditional * 0.5) / totalDeliveries * 100).toFixed(1)
      : '0';

    res.json({
      supplierId,
      totalDeliveries,
      accepted,
      conditional,
      rejected,
      performancePercent: parseFloat(performance),
      records: records.slice(0, 50),
    });
  } catch (error: unknown) {
    console.error('/api/tedarikci-kalite/performance error:', error);
    res.status(500).json({ message: 'Performans verileri alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8b) GET /api/tedarikci-kalite/summary-all — Tüm tedarikçi özet (Sprint 7 v3)
// ═══════════════════════════════════════════════════════════════════

router.get('/api/tedarikci-kalite/summary-all', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    // Tüm aktif tedarikçileri getir + her birinin ürün sayısı + QC istatistik
    const allSuppliers = await db.select({
      id: suppliers.id,
      code: suppliers.code,
      name: suppliers.name,
      foodAuthorizationNumber: suppliers.foodAuthorizationNumber,
      iso22000Certified: suppliers.iso22000Certified,
      haccpCertified: suppliers.haccpCertified,
      halalCertified: suppliers.halalCertified,
      auditScore: suppliers.auditScore,
    }).from(suppliers).where(eq(suppliers.status, 'aktif'));

    const results = await Promise.all(allSuppliers.map(async (s) => {
      // Bu tedarikçinin ürün sayısı
      const products = await db.select({ id: rawMaterials.id })
        .from(rawMaterials)
        .where(and(eq(rawMaterials.supplierId, s.id), eq(rawMaterials.isActive, true)));
      
      // Bu tedarikçinin QC kayıtları
      const qcRecords = await db.select({ 
        status: supplierQualityRecords.inspectionStatus,
      })
        .from(supplierQualityRecords)
        .where(eq(supplierQualityRecords.supplierId, s.id));
      
      const accepted = qcRecords.filter((r: any) => r.status === 'kabul').length;
      const conditional = qcRecords.filter((r: any) => r.status === 'şartlı_kabul').length;
      const rejected = qcRecords.filter((r: any) => r.status === 'red').length;
      const total = qcRecords.length;
      const performance = total > 0 
        ? ((accepted + conditional * 0.5) / total * 100).toFixed(1)
        : null;
      
      return {
        ...s,
        productCount: products.length,
        totalDeliveries: total,
        accepted,
        conditional,
        rejected,
        performancePercent: performance ? parseFloat(performance) : null,
      };
    }));

    // Performansa göre sırala (en iyi en üstte, veri olmayanlar en altta)
    results.sort((a, b) => {
      if (a.performancePercent === null && b.performancePercent === null) return b.productCount - a.productCount;
      if (a.performancePercent === null) return 1;
      if (b.performancePercent === null) return -1;
      return b.performancePercent - a.performancePercent;
    });

    res.json({
      totalSuppliers: results.length,
      withQC: results.filter(r => r.totalDeliveries > 0).length,
      withoutQC: results.filter(r => r.totalDeliveries === 0).length,
      suppliers: results,
    });
  } catch (error: unknown) {
    console.error('/api/tedarikci-kalite/summary-all error:', error);
    res.status(500).json({ message: 'Tedarikçi özet alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 9) POST /api/tgk-label/calculate — Reçeteden besin değeri hesapla
// ═══════════════════════════════════════════════════════════════════

router.post('/api/tgk-label/calculate', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const { productId, productType } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId gerekli' });

    // Reçete getir (basitleştirilmiş — ürünün ingredient listesi)
    const ingredients = await db.select({
      ingredientId: productRecipeIngredients.ingredientId,
      quantity: productRecipeIngredients.quantity,
      unit: productRecipeIngredients.unit,
      ingredientName: rawMaterials.name,
      energyKcal: rawMaterials.energyKcal,
      fat: rawMaterials.fat,
      saturatedFat: rawMaterials.saturatedFat,
      carbohydrate: rawMaterials.carbohydrate,
      sugar: rawMaterials.sugar,
      protein: rawMaterials.protein,
      salt: rawMaterials.salt,
      allergenPresent: rawMaterials.allergenPresent,
      allergenDetail: rawMaterials.allergenDetail,
      crossContamination: rawMaterials.crossContamination,
    })
      .from(productRecipeIngredients)
      .innerJoin(rawMaterials, eq(productRecipeIngredients.ingredientId, rawMaterials.id))
      .where(eq(productRecipeIngredients.productId, productId));

    if (!ingredients.length) {
      return res.json({ 
        message: 'Bu ürün için reçete bulunamadı veya hammadde besin değerleri eksik',
        ingredients: [],
        nutrition: null,
      });
    }

    // Toplam ağırlık (g)
    const totalWeight = ingredients.reduce((sum, ing) => {
      const qty = parseFloat(ing.quantity || '0');
      // Birim normalize: kg→g, g→g, lt→1000g (varsayım)
      let grams = qty;
      if (ing.unit === 'kg') grams = qty * 1000;
      else if (ing.unit === 'lt' || ing.unit === 'l') grams = qty * 1000;
      return sum + grams;
    }, 0);

    if (totalWeight === 0) {
      return res.json({ message: 'Toplam ağırlık 0', ingredients, nutrition: null });
    }

    // 100g başına besin değerleri
    let totalEnergy = 0, totalFat = 0, totalSatFat = 0, totalCarb = 0, totalSugar = 0, totalProtein = 0, totalSalt = 0;
    const allergens = new Set<string>();
    const crossContams = new Set<string>();

    for (const ing of ingredients) {
      const qty = parseFloat(ing.quantity || '0');
      let grams = qty;
      if (ing.unit === 'kg') grams = qty * 1000;
      else if (ing.unit === 'lt' || ing.unit === 'l') grams = qty * 1000;
      
      const ratio = grams / 100; // hammadde 100g başına verildiği için

      if (ing.energyKcal) totalEnergy += parseFloat(ing.energyKcal) * ratio;
      if (ing.fat) totalFat += parseFloat(ing.fat) * ratio;
      if (ing.saturatedFat) totalSatFat += parseFloat(ing.saturatedFat) * ratio;
      if (ing.carbohydrate) totalCarb += parseFloat(ing.carbohydrate) * ratio;
      if (ing.sugar) totalSugar += parseFloat(ing.sugar) * ratio;
      if (ing.protein) totalProtein += parseFloat(ing.protein) * ratio;
      if (ing.salt) totalSalt += parseFloat(ing.salt) * ratio;

      if (ing.allergenPresent && ing.allergenDetail) allergens.add(ing.allergenDetail);
      if (ing.crossContamination) crossContams.add(ing.crossContamination);
    }

    // Per 100g normalize
    const per100Multiplier = 100 / totalWeight;
    const nutrition = {
      energyKcal: (totalEnergy * per100Multiplier).toFixed(1),
      energyKj: (totalEnergy * per100Multiplier * 4.184).toFixed(1),
      fat: (totalFat * per100Multiplier).toFixed(2),
      saturatedFat: (totalSatFat * per100Multiplier).toFixed(2),
      carbohydrate: (totalCarb * per100Multiplier).toFixed(2),
      sugar: (totalSugar * per100Multiplier).toFixed(2),
      protein: (totalProtein * per100Multiplier).toFixed(2),
      salt: (totalSalt * per100Multiplier).toFixed(3),
    };

    const ingredientsText = ingredients
      .map(i => `${i.ingredientName} (${parseFloat(i.quantity || '0')} ${i.unit})`)
      .join(', ');

    res.json({
      productId,
      productType,
      totalWeightG: totalWeight,
      ingredientsCount: ingredients.length,
      ingredientsText,
      allergenWarning: Array.from(allergens).join(' '),
      crossContaminationWarning: Array.from(crossContams).join(' '),
      nutrition,
      ingredients,
    });
  } catch (error: unknown) {
    console.error('/api/tgk-label/calculate error:', error);
    res.status(500).json({ message: 'Etiket hesaplanamadı', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 10) POST /api/tgk-label — Yeni etiket oluştur (taslak)
// ═══════════════════════════════════════════════════════════════════

router.post('/api/tgk-label', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'Etiket oluşturma yetkiniz yok' });
    }

    const body = req.body;
    body.createdById = user.id;
    body.status = 'taslak';

    const [created] = await db.insert(tgkLabels).values(body).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('/api/tgk-label POST error:', error);
    res.status(500).json({ message: 'Etiket oluşturulamadı', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 11) PUT /api/tgk-label/:id/approve — Gıda mühendisi onayı (TGK Madde 18)
// ═══════════════════════════════════════════════════════════════════

router.put('/api/tgk-label/:id/approve', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canApproveLabel(user.role)) {
      return res.status(403).json({ message: 'Etiket onaylama yetkiniz yok (sadece gıda mühendisi/admin)' });
    }

    const id = parseInt(req.params.id);
    const [updated] = await db.update(tgkLabels)
      .set({
        status: 'onaylandi',
        approvedById: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tgkLabels.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Etiket bulunamadı' });
    res.json(updated);
  } catch (error: unknown) {
    console.error('/api/tgk-label/:id/approve error:', error);
    res.status(500).json({ message: 'Etiket onaylanamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 11b) PUT /api/tgk-label/:id/reject — Etiket red (Sprint 8 #350)
// ═══════════════════════════════════════════════════════════════════
// Aslan talebi (5 May 21:00):
//   "Pilot gün için gıda mühendisinin etiketi onaylayabilmesi gerekli"
//   #350: Reddet butonu + red notu textarea
// ═══════════════════════════════════════════════════════════════════

router.put('/api/tgk-label/:id/reject', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canApproveLabel(user.role)) {
      return res.status(403).json({ message: 'Etiket reddetme yetkiniz yok (sadece gıda mühendisi/admin)' });
    }

    const id = parseInt(req.params.id);
    const { reason } = req.body || {};
    
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ message: 'Red sebebi en az 5 karakter olmalıdır' });
    }

    const [updated] = await db.update(tgkLabels)
      .set({
        status: 'reddedildi',
        approvedById: user.id, // Reddeden kişi (audit)
        approvedAt: new Date(),
        rejectedReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(tgkLabels.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Etiket bulunamadı' });
    res.json(updated);
  } catch (error: unknown) {
    console.error('/api/tgk-label/:id/reject error:', error);
    res.status(500).json({ message: 'Etiket reddedilemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 11c) PUT /api/tgk-label/:id/submit — Taslak → Onay Bekliyor (Sprint 8)
// ═══════════════════════════════════════════════════════════════════

router.put('/api/tgk-label/:id/submit', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    
    const [updated] = await db.update(tgkLabels)
      .set({
        status: 'onay_bekliyor',
        updatedAt: new Date(),
      })
      .where(eq(tgkLabels.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Etiket bulunamadı' });
    res.json(updated);
  } catch (error: unknown) {
    console.error('/api/tgk-label/:id/submit error:', error);
    res.status(500).json({ message: 'Etiket onaya gönderilemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 12) GET /api/tgk-label/list — Tüm etiketler (filter)
// ═══════════════════════════════════════════════════════════════════

router.get('/api/tgk-label/list', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const status = req.query.status as string | undefined;
    const conditions: any[] = [eq(tgkLabels.isActive, true)];
    if (status) conditions.push(eq(tgkLabels.status, status));

    const labels = await db.select()
      .from(tgkLabels)
      .where(and(...conditions))
      .orderBy(desc(tgkLabels.createdAt));

    res.json(labels);
  } catch (error: unknown) {
    console.error('/api/tgk-label/list error:', error);
    res.status(500).json({ message: 'Etiketler alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 13) GET /api/girdi/allergen-matrix — Alerjen matrisi
// ═══════════════════════════════════════════════════════════════════

router.get('/api/girdi-stats/allergen-matrix', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const items = await db.select({
      id: rawMaterials.id,
      name: rawMaterials.name,
      allergenPresent: rawMaterials.allergenPresent,
      allergenDetail: rawMaterials.allergenDetail,
      crossContamination: rawMaterials.crossContamination,
    })
      .from(rawMaterials)
      .where(and(eq(rawMaterials.isActive, true), eq(rawMaterials.allergenPresent, true)))
      .orderBy(rawMaterials.name);

    res.json(items);
  } catch (error: unknown) {
    console.error('allergen-matrix error:', error);
    res.status(500).json({ message: 'Alerjen matrisi alınamadı' });
  }
});

export default router;
