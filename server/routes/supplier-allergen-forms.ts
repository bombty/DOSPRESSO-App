/**
 * Tedarikçi Alerjen Kontrol Formu (0011.A.FR.GG.36/Rev.1)
 *
 * Endpoints:
 *   GET    /api/supplier-allergen-forms              — Liste (filtre: status, supplierId)
 *   GET    /api/supplier-allergen-forms/:id          — Tek form detay
 *   POST   /api/supplier-allergen-forms              — Yeni form oluştur
 *   PUT    /api/supplier-allergen-forms/:id          — Güncelle
 *   POST   /api/supplier-allergen-forms/:id/submit   — Onaya gönder
 *   POST   /api/supplier-allergen-forms/:id/approve  — Onayla (admin/kalite)
 *   POST   /api/supplier-allergen-forms/:id/reject   — Reddet
 *   GET    /api/supplier-allergen-forms/template     — Boş form şablonu (14 alerjen + 15 faaliyet)
 *
 * Aslan 7 May 2026 — PDF formdan sisteme entegrasyon
 */

import { Router } from 'express';
import { db } from '../db';
import {
  supplierAllergenForms,
  TGK_ALLERGENS_14,
  PREVENTIVE_ACTIONS_15,
} from '@shared/schema';
import { sql, and, eq, desc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ROLES_CAN_VIEW = [
  'admin', 'ceo', 'cgo',
  'gida_muhendisi', 'kalite_kontrol', 'kalite_yoneticisi',
  'satinalma',
];

const ROLES_CAN_APPROVE = [
  'admin', 'ceo', 'cgo',
  'kalite_kontrol', 'kalite_yoneticisi',
];

// GET /api/supplier-allergen-forms/template — Boş şablon (statik)
router.get('/api/supplier-allergen-forms/template', isAuthenticated, async (req: any, res) => {
  if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Yetki yok' });
  }
  return res.json({
    formCode: '0011.A.FR.GG.36/Rev.1',
    revision: '1.4.2025',
    legalBasis: 'TGK 26.01.2017/29960 EK-1',
    allergens: TGK_ALLERGENS_14,
    preventiveActions: PREVENTIVE_ACTIONS_15,
    columns: [
      { key: 'col1', label: 'Ürün İçerisinde', description: 'Ürün içerisinde yer alan alerjen varlığı' },
      { key: 'col2', label: 'Aynı Üretim Hattında', description: 'Ürün içerisinde olmayan fakat aynı üretim hattında üretilen diğer ürünlerde yer alan alerjen' },
      { key: 'col3', label: 'Fabrika İçerisinde', description: 'Ürün içerisinde olmayan fakat ürünün üretildiği fabrikada yer alan alerjen' },
    ],
  });
});

// GET /api/supplier-allergen-forms — Liste
router.get('/api/supplier-allergen-forms', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const { status, supplierId, rawMaterialId } = req.query;
    
    const conditions = [];
    if (status) conditions.push(eq(supplierAllergenForms.status, status as string));
    if (supplierId) conditions.push(eq(supplierAllergenForms.supplierId, parseInt(supplierId as string, 10)));
    if (rawMaterialId) conditions.push(eq(supplierAllergenForms.rawMaterialId, parseInt(rawMaterialId as string, 10)));
    
    const forms = await db
      .select()
      .from(supplierAllergenForms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supplierAllergenForms.createdAt))
      .limit(100);
    
    return res.json(forms);
  } catch (error: any) {
    logger.error('SAF list hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/supplier-allergen-forms/:id — Tek form
router.get('/api/supplier-allergen-forms/:id', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const id = parseInt(req.params.id, 10);
    const [form] = await db.select().from(supplierAllergenForms).where(eq(supplierAllergenForms.id, id));
    if (!form) return res.status(404).json({ message: 'Form bulunamadı' });
    return res.json(form);
  } catch (error: any) {
    logger.error('SAF detail hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/supplier-allergen-forms — Yeni form
router.post('/api/supplier-allergen-forms', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const data = req.body;
    if (!data.supplierName || !data.productName) {
      return res.status(400).json({ message: 'Tedarikçi adı ve ürün adı zorunlu' });
    }
    
    const [created] = await db.insert(supplierAllergenForms).values({
      supplierId: data.supplierId || null,
      supplierName: data.supplierName,
      rawMaterialId: data.rawMaterialId || null,
      productName: data.productName,
      factoryName: data.factoryName || null,
      filledBy: data.filledBy || null,
      filledByTitle: data.filledByTitle || null,
      contactPhone: data.contactPhone || null,
      allergenMatrix: data.allergenMatrix || {},
      preventiveActionsRequired: data.preventiveActionsRequired || false,
      preventiveActions: data.preventiveActions || {},
      labelIncludesAllergens: data.labelIncludesAllergens ?? null,
      specIncludesAllergens: data.specIncludesAllergens ?? null,
      notes: data.notes || null,
      status: 'draft',
    }).returning();
    
    return res.json(created);
  } catch (error: any) {
    logger.error('SAF create hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/supplier-allergen-forms/:id — Güncelle
router.put('/api/supplier-allergen-forms/:id', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const id = parseInt(req.params.id, 10);
    const [existing] = await db.select().from(supplierAllergenForms).where(eq(supplierAllergenForms.id, id));
    if (!existing) return res.status(404).json({ message: 'Form bulunamadı' });
    if (existing.status === 'approved') {
      return res.status(400).json({ message: 'Onaylanmış form düzenlenemez' });
    }
    
    const data = req.body;
    const [updated] = await db.update(supplierAllergenForms)
      .set({
        supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
        supplierName: data.supplierName ?? existing.supplierName,
        rawMaterialId: data.rawMaterialId !== undefined ? data.rawMaterialId : existing.rawMaterialId,
        productName: data.productName ?? existing.productName,
        factoryName: data.factoryName ?? existing.factoryName,
        filledBy: data.filledBy ?? existing.filledBy,
        filledByTitle: data.filledByTitle ?? existing.filledByTitle,
        contactPhone: data.contactPhone ?? existing.contactPhone,
        allergenMatrix: data.allergenMatrix ?? existing.allergenMatrix,
        preventiveActionsRequired: data.preventiveActionsRequired ?? existing.preventiveActionsRequired,
        preventiveActions: data.preventiveActions ?? existing.preventiveActions,
        labelIncludesAllergens: data.labelIncludesAllergens !== undefined ? data.labelIncludesAllergens : existing.labelIncludesAllergens,
        specIncludesAllergens: data.specIncludesAllergens !== undefined ? data.specIncludesAllergens : existing.specIncludesAllergens,
        notes: data.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(supplierAllergenForms.id, id))
      .returning();
    
    return res.json(updated);
  } catch (error: any) {
    logger.error('SAF update hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/supplier-allergen-forms/:id/submit — Onaya gönder
router.post('/api/supplier-allergen-forms/:id/submit', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_VIEW.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const id = parseInt(req.params.id, 10);
    const [updated] = await db.update(supplierAllergenForms)
      .set({ status: 'submitted', submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(supplierAllergenForms.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: 'Form bulunamadı' });
    return res.json(updated);
  } catch (error: any) {
    logger.error('SAF submit hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/supplier-allergen-forms/:id/approve — Onayla
router.post('/api/supplier-allergen-forms/:id/approve', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_APPROVE.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Onay yetkiniz yok' });
    }
    const id = parseInt(req.params.id, 10);
    const [updated] = await db.update(supplierAllergenForms)
      .set({ status: 'approved', approvedAt: new Date(), approvedBy: req.user.id, updatedAt: new Date() })
      .where(eq(supplierAllergenForms.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: 'Form bulunamadı' });
    return res.json(updated);
  } catch (error: any) {
    logger.error('SAF approve hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/supplier-allergen-forms/:id/reject — Reddet
router.post('/api/supplier-allergen-forms/:id/reject', isAuthenticated, async (req: any, res) => {
  try {
    if (!ROLES_CAN_APPROVE.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }
    const id = parseInt(req.params.id, 10);
    const reason = req.body?.reason || 'Sebep belirtilmedi';
    const [updated] = await db.update(supplierAllergenForms)
      .set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() })
      .where(eq(supplierAllergenForms.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: 'Form bulunamadı' });
    return res.json(updated);
  } catch (error: any) {
    logger.error('SAF reject hatası', error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
