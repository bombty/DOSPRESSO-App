/**
 * Sprint 22 (Aslan 12 May 2026): Raw Materials API
 * 
 * MİMARİ KARAR (Model C — Minimal):
 *   Samet (HQ satinalma rolü) hammaddeleri görebilir.
 *   Sipariş akışı tasarımı Aslan kararından sonra (A/B/C model seçimi):
 *     A) Şubeler direkt tedarikçiden alır (decentralized)
 *     B) Fabrika hammadde alır, şubeler fabrikadan alır
 *     C) HQ Samet hammadde alır, üretip fabrika ürünü yapar
 *   
 *   Bu PR sadece READ-ONLY endpoint sağlar. WRITE/ORDER akışı post-pilot.
 *   
 *   Pilot Day-1 için: Samet hammadde listesini görür, raporlar yapabilir.
 */

import { Router } from "express";
import { db } from "../db";
import { rawMaterials, suppliers } from "@shared/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { isAuthenticated } from "../auth";
import { requireManifestAccess } from "../services/manifest-auth";

const router = Router();

/**
 * GET /api/raw-materials
 * Hammadde listesi (filtreli)
 * 
 * Query params:
 *   - category: kategori filtrele
 *   - search: code veya name içinde arama
 *   - isActive: aktif/pasif (default: true)
 *   - limit, offset: pagination
 * 
 * Yetki: satinalma, admin, ceo, cgo, sef, gida_muhendisi, recete_gm
 *        (raw_materials yönetimi yetkisi olan herkes)
 */
router.get(
  "/api/raw-materials",
  isAuthenticated,
  requireManifestAccess("stok", "view"),
  async (req: any, res) => {
    try {
      const { category, search, isActive = "true", limit = 100, offset = 0 } = req.query;

      const conditions = [];

      if (isActive === "true") {
        conditions.push(eq(rawMaterials.isActive, true));
      } else if (isActive === "false") {
        conditions.push(eq(rawMaterials.isActive, false));
      }

      if (category) {
        conditions.push(eq(rawMaterials.category, category as string));
      }

      if (search) {
        conditions.push(
          or(
            ilike(rawMaterials.name, `%${search}%`),
            ilike(rawMaterials.code, `%${search}%`)
          )!
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(rawMaterials)
        .where(where)
        .orderBy(rawMaterials.name)
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json({
        items,
        total: items.length,
        // Pagination hint: client total için ayrı COUNT query (post-pilot optimize)
      });
    } catch (error: unknown) {
      console.error("[Sprint 22] Hammadde listesi hatası:", error);
      res.status(500).json({ message: "Hammadde listesi alınamadı" });
    }
  }
);

/**
 * GET /api/raw-materials/:id
 * Hammadde detayı (tedarikçi bilgisi dahil)
 */
router.get(
  "/api/raw-materials/:id",
  isAuthenticated,
  requireManifestAccess("stok", "view"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const result = await db
        .select({
          // Raw material fields
          id: rawMaterials.id,
          code: rawMaterials.code,
          name: rawMaterials.name,
          category: rawMaterials.category,
          unit: rawMaterials.unit,
          currentUnitPrice: rawMaterials.currentUnitPrice,
          lastPurchasePrice: rawMaterials.lastPurchasePrice,
          averagePrice: rawMaterials.averagePrice,
          priceLastUpdated: rawMaterials.priceLastUpdated,
          isActive: rawMaterials.isActive,
          notes: rawMaterials.notes,
          // Supplier info (join)
          supplierId: rawMaterials.supplierId,
          supplierName: suppliers.name,
        })
        .from(rawMaterials)
        .leftJoin(suppliers, eq(rawMaterials.supplierId, suppliers.id))
        .where(eq(rawMaterials.id, id))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ message: "Hammadde bulunamadı" });
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("[Sprint 22] Hammadde detay hatası:", error);
      res.status(500).json({ message: "Hammadde detayı alınamadı" });
    }
  }
);

/**
 * GET /api/raw-materials/categories/list
 * Mevcut kategorileri listele (UI dropdown için)
 */
router.get(
  "/api/raw-materials/categories/list",
  isAuthenticated,
  requireManifestAccess("stok", "view"),
  async (_req, res) => {
    try {
      const rows = await db
        .selectDistinct({ category: rawMaterials.category })
        .from(rawMaterials)
        .where(eq(rawMaterials.isActive, true));

      const categories = rows
        .map((r) => r.category)
        .filter((c): c is string => !!c)
        .sort();

      res.json({ categories });
    } catch (error: unknown) {
      console.error("[Sprint 22] Kategori listesi hatası:", error);
      res.status(500).json({ message: "Kategori listesi alınamadı" });
    }
  }
);

export default router;
