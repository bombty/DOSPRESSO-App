// ═══════════════════════════════════════════════════════════════════
// Sprint 55 (Aslan 13 May 2026) — Aslan2 (recete_gm) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 görev:
//   1. Reçete listesi + version mgmt
//   2. KEYBLEND gizli formül (sadece admin + recete_gm)
//   3. Maliyet hesabı (reçete × hammadde fiyatı)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { factoryRecipes, factoryRecipeIngredients, factoryKeyblends, factoryRecipeVersions } from "@shared/schema";
import { rawMaterials, factoryProducts } from "@shared/schema";
import { isAuthenticated } from "../localAuth";

const router = Router();

const requireAslan2 = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "ceo", "cgo", "recete_gm"].includes(role)) {
    return res.status(403).json({ message: "Bu işlem için yetki yok (recete_gm gerekli)" });
  }
  next();
};

const requireSecretAccess = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "recete_gm"].includes(role)) {
    return res.status(403).json({ message: "KEYBLEND erişimi sadece admin + recete_gm'e açık" });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════
// 1. REÇETE YÖNETİMİ
// ═══════════════════════════════════════════════════════════════════

// GET /api/aslan2/recipes - Tüm reçeteler (mamul + yarı mamul)
router.get("/api/aslan2/recipes", isAuthenticated, requireAslan2, async (req, res) => {
  try {
    const outputType = req.query.outputType as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions: any[] = [];
    if (outputType) conditions.push(eq(factoryRecipes.outputType, outputType));
    if (status) conditions.push(eq(factoryRecipes.approvalStatus, status));

    const items = await db.select({
      id: factoryRecipes.id,
      code: factoryRecipes.code,
      name: factoryRecipes.name,
      category: factoryRecipes.category,
      description: factoryRecipes.description,
      outputType: factoryRecipes.outputType,
      version: factoryRecipes.version,
      baseBatchOutput: factoryRecipes.baseBatchOutput,
      outputUnit: factoryRecipes.outputUnit,
      approvalStatus: factoryRecipes.approvalStatus,
      isActive: factoryRecipes.isActive,
      productId: factoryRecipes.productId,
      createdAt: factoryRecipes.createdAt,
      updatedAt: factoryRecipes.updatedAt,
    })
    .from(factoryRecipes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(factoryRecipes.updatedAt))
    .limit(200);

    // Ürün adlarını çek
    const productIds = items.map(i => i.productId).filter(Boolean) as number[];
    let productMap: Record<number, string> = {};
    if (productIds.length > 0) {
      const products = await db.select({ id: factoryProducts.id, name: factoryProducts.name })
        .from(factoryProducts)
        .where(sql`${factoryProducts.id} = ANY(${productIds})`);
      productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
    }

    const enriched = items.map(i => ({
      ...i,
      productName: i.productId ? productMap[i.productId] : null,
    }));

    const summary = {
      total: items.length,
      mamul: items.filter(i => i.outputType === "mamul").length,
      yariMamul: items.filter(i => i.outputType === "yari_mamul").length,
      pending: items.filter(i => i.approvalStatus === "pending").length,
      approved: items.filter(i => i.approvalStatus === "approved").length,
    };

    res.json({ recipes: enriched, summary });
  } catch (err: any) {
    console.error("[Aslan2/recipes]", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/aslan2/recipes/:id - Reçete detayı + malzemeler
router.get("/api/aslan2/recipes/:id", isAuthenticated, requireAslan2, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id)).limit(1);
    if (!recipe) return res.status(404).json({ message: "Reçete bulunamadı" });

    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    res.json({ recipe, ingredients });
  } catch (err: any) {
    console.error("[Aslan2/recipe-detail]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/aslan2/recipes/:id/new-version - Yeni versiyon oluştur
router.post("/api/aslan2/recipes/:id/new-version", isAuthenticated, requireAslan2, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const { changeReason } = req.body;

    const [current] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id)).limit(1);
    if (!current) return res.status(404).json({ message: "Reçete bulunamadı" });

    const newVersion = (current.version || 1) + 1;

    // Snapshot eski hali factoryRecipeVersions'a
    const currentIngredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id));

    await db.insert(factoryRecipeVersions).values({
      recipeId: id,
      versionNumber: current.version || 1,
      ingredientsSnapshot: currentIngredients as any,
      changeReason: changeReason || `v${current.version || 1} → v${newVersion} (Aslan2)`,
      createdById: userId,
    } as any);

    // Yeni versiyon numarası → mevcut reçete (audit history korunmuş)
    const [updated] = await db.update(factoryRecipes)
      .set({
        version: newVersion,
        approvalStatus: "pending", // yeni versiyon onaya bekler
        updatedAt: new Date(),
      })
      .where(eq(factoryRecipes.id, id))
      .returning();

    console.log(`[Aslan2] Recipe ${current.code} → v${newVersion} (by ${userId})`);
    res.json({ success: true, recipe: updated, newVersion });
  } catch (err: any) {
    console.error("[Aslan2/new-version]", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/aslan2/recipes/:id/versions - Versiyon geçmişi
router.get("/api/aslan2/recipes/:id/versions", isAuthenticated, requireAslan2, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const versions = await db.select().from(factoryRecipeVersions)
      .where(eq(factoryRecipeVersions.recipeId, id))
      .orderBy(desc(factoryRecipeVersions.versionNumber));

    res.json({ versions });
  } catch (err: any) {
    console.error("[Aslan2/versions]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. KEYBLEND GİZLİ FORMÜL (admin + recete_gm)
// ═══════════════════════════════════════════════════════════════════

// GET /api/aslan2/keyblends - Tüm KEYBLEND'ler
router.get("/api/aslan2/keyblends", isAuthenticated, requireSecretAccess, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const items = await db.select().from(factoryKeyblends)
      .orderBy(asc(factoryKeyblends.code));

    // AUDIT LOG — kim ne zaman KEYBLEND'e baktı
    console.warn(`[KEYBLEND ACCESS] User ${userId} (${req.user.role}) listed ${items.length} keyblends @ ${new Date().toISOString()}`);

    res.json({ keyblends: items, count: items.length });
  } catch (err: any) {
    console.error("[Aslan2/keyblends]", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/aslan2/keyblends/:id - KEYBLEND detayı (full ingredients)
router.get("/api/aslan2/keyblends/:id", isAuthenticated, requireSecretAccess, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;

    const [keyblend] = await db.select().from(factoryKeyblends).where(eq(factoryKeyblends.id, id)).limit(1);
    if (!keyblend) return res.status(404).json({ message: "KEYBLEND bulunamadı" });

    // AUDIT LOG — kritik!
    console.warn(`[KEYBLEND DETAIL ACCESS] User ${userId} (${req.user.role}) viewed "${keyblend.code} - ${keyblend.name}" @ ${new Date().toISOString()}`);

    res.json({ keyblend });
  } catch (err: any) {
    console.error("[Aslan2/keyblend-detail]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. MALİYET HESABI
// ═══════════════════════════════════════════════════════════════════

// GET /api/aslan2/recipes/:id/cost - Reçetenin maliyet hesabı
router.get("/api/aslan2/recipes/:id/cost", isAuthenticated, requireAslan2, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id)).limit(1);
    if (!recipe) return res.status(404).json({ message: "Reçete bulunamadı" });

    const ingredients = await db.select({
      ingredientId: factoryRecipeIngredients.id,
      rawMaterialId: factoryRecipeIngredients.rawMaterialId,
      quantity: factoryRecipeIngredients.quantity,
      unit: factoryRecipeIngredients.unit,
      // Raw material fiyat bilgisi
      rmName: rawMaterials.name,
      rmUnit: rawMaterials.unit,
      rmUnitPrice: rawMaterials.unitPrice,
      isKeyblend: rawMaterials.isKeyblend,
      keyblendCost: rawMaterials.keyblendCost,
    })
    .from(factoryRecipeIngredients)
    .leftJoin(rawMaterials, eq(factoryRecipeIngredients.rawMaterialId, rawMaterials.id))
    .where(eq(factoryRecipeIngredients.recipeId, id));

    // Maliyet hesaplama
    let totalCost = 0;
    const breakdown = ingredients.map(ing => {
      const qty = parseFloat(ing.quantity?.toString() || "0");
      const unitPrice = ing.isKeyblend
        ? parseFloat(ing.keyblendCost?.toString() || "0")
        : parseFloat(ing.rmUnitPrice?.toString() || "0");
      const cost = qty * unitPrice;
      totalCost += cost;

      return {
        ingredientId: ing.ingredientId,
        materialName: ing.rmName,
        quantity: qty,
        unit: ing.unit,
        unitPrice,
        cost: Math.round(cost * 100) / 100,
        isKeyblend: ing.isKeyblend,
      };
    });

    const batchOutput = recipe.baseBatchOutput || 1;
    const unitCost = totalCost / batchOutput;

    res.json({
      recipe: {
        id: recipe.id,
        code: recipe.code,
        name: recipe.name,
        version: recipe.version,
        baseBatchOutput: batchOutput,
        outputUnit: recipe.outputUnit,
      },
      breakdown,
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        unitCost: Math.round(unitCost * 100) / 100,
        batchOutput,
        outputUnit: recipe.outputUnit,
      },
    });
  } catch (err: any) {
    console.error("[Aslan2/cost]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
