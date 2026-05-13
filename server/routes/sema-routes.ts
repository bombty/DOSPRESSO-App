// ═══════════════════════════════════════════════════════════════════
// Sprint 53 (Aslan 13 May 2026) — Sema (gida_muhendisi) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 görev:
//   1. Besin değer doldurma (eksik raw_materials)
//   2. Reçete onay (factory_recipes pending)
//   3. Alerjen analiz (cross-contamination)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, isNull, or, sql, desc } from "drizzle-orm";
import { rawMaterials } from "@shared/schema";
import { factoryRecipes, factoryProducts } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { aiChatCall } from "../ai";

const router = Router();

const requireSema = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "ceo", "cgo", "gida_muhendisi", "kalite_kontrol"].includes(role)) {
    return res.status(403).json({ message: "Bu işlem için yetki yok (gida_muhendisi gerekli)" });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════
// 1. BESİN DEĞER PANELİ
// ═══════════════════════════════════════════════════════════════════

// GET /api/sema/missing-nutrition
// Besin değeri eksik raw_materials listesi
router.get("/api/sema/missing-nutrition", isAuthenticated, requireSema, async (req, res) => {
  try {
    const items = await db.select({
      id: rawMaterials.id,
      code: rawMaterials.code,
      name: rawMaterials.name,
      brand: rawMaterials.brand,
      unit: rawMaterials.unit,
      mainCategory: rawMaterials.mainCategory,
      energyKcal: rawMaterials.energyKcal,
      fat: rawMaterials.fat,
      saturatedFat: rawMaterials.saturatedFat,
      carbohydrate: rawMaterials.carbohydrate,
      sugar: rawMaterials.sugar,
      protein: rawMaterials.protein,
      salt: rawMaterials.salt,
      fiber: rawMaterials.fiber,
      tgkCompliant: rawMaterials.tgkCompliant,
      tgkVerifiedAt: rawMaterials.tgkVerifiedAt,
      allergenPresent: rawMaterials.allergenPresent,
      allergenDetail: rawMaterials.allergenDetail,
    })
    .from(rawMaterials)
    .where(and(
      eq(rawMaterials.isActive, true),
      or(
        isNull(rawMaterials.energyKcal),
        isNull(rawMaterials.protein),
        isNull(rawMaterials.tgkVerifiedAt),
      )!,
    ))
    .orderBy(rawMaterials.name)
    .limit(200);

    res.json({ items, count: items.length });
  } catch (err: any) {
    console.error("[Sema/missing-nutrition]", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/sema/raw-materials/:id/nutrition
// Besin değerlerini güncelle + TGK uyumla
router.patch("/api/sema/raw-materials/:id/nutrition", isAuthenticated, requireSema, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const userId = req.user.id;

    const updateData: any = { updatedAt: new Date() };
    const fields = [
      "energyKcal", "energyKj", "fat", "saturatedFat", "carbohydrate",
      "sugar", "protein", "salt", "fiber", "allergenPresent", "allergenDetail",
      "crossContamination", "contentInfo", "storageConditions", "tgkNotes",
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }

    if (data.markTgkCompliant) {
      updateData.tgkCompliant = true;
      updateData.tgkVerifiedAt = new Date();
      updateData.tgkVerifiedById = userId;
    }

    const [updated] = await db.update(rawMaterials)
      .set(updateData)
      .where(eq(rawMaterials.id, id))
      .returning();

    console.log(`[Sema] ${userId} updated nutrition for ${updated?.code}`);
    res.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("[Sema/update-nutrition]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sema/raw-materials/:id/ai-suggest-nutrition
// AI ile besin değer tahmin
router.post("/api/sema/raw-materials/:id/ai-suggest-nutrition", isAuthenticated, requireSema, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
    if (!item) return res.status(404).json({ message: "Bulunamadı" });

    const systemPrompt = `Sen Mr. Dobody, DOSPRESSO gıda mühendisliği AI asistanısın.
Türk Gıda Kodeksi (TGK Madde 9 + Ek-13) uyumlu besin değer tahmini yap.

GIRDI: hammadde adı + birim
ÇIKTI: 100g/100ml başına besin değerleri (JSON)

KURALLAR:
- Bilinmiyen kalemlerde DÜŞÜK güven ile tahmin yap, confidence: "low"
- Bilinen yaygın gıdalar için TÜRKOMP/USDA referans, confidence: "high"
- Tüm değerler 100g (veya 100ml sıvılar) başına
- Alerjen 14 majör (gluten, sütproteini, yumurta, balık, kabuklu, süt, fındık, fıstık, soya, susam, sülfit, lupin, yumuşakça, hardal)

JSON FORMAT:
{
  "energyKcal": sayı,
  "energyKj": sayı,
  "fat": sayı (g),
  "saturatedFat": sayı (g),
  "carbohydrate": sayı (g),
  "sugar": sayı (g),
  "protein": sayı (g),
  "salt": sayı (g),
  "fiber": sayı (g),
  "allergenPresent": true/false,
  "allergenDetail": "Gluten, Süt proteini" gibi virgülle,
  "crossContamination": "Fındık, fıstık ile aynı tesiste",
  "confidence": "high|medium|low",
  "reasoning": "TÜRKOMP referansı XYZ" gibi kısa sebep
}`;

    const userPrompt = `HAMMADDE: ${item.name}
${item.brand ? `MARKA: ${item.brand}` : ""}
BIRIM: ${item.unit}
${item.mainCategory ? `KATEGORI: ${item.mainCategory}` : ""}

Besin değerlerini 100g (veya 100ml) başına tahmin et.`;

    const response = await aiChatCall({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const suggestion = JSON.parse(raw);

    res.json({ success: true, suggestion, tokens: response.usage?.total_tokens || 0 });
  } catch (err: any) {
    console.error("[Sema/ai-suggest]", err);
    res.status(500).json({ message: "AI tahmin başarısız, manuel girebilirsiniz" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. REÇETE ONAY PANELİ
// ═══════════════════════════════════════════════════════════════════

// GET /api/sema/pending-recipes
router.get("/api/sema/pending-recipes", isAuthenticated, requireSema, async (req, res) => {
  try {
    const recipes = await db.select({
      id: factoryRecipes.id,
      productId: factoryRecipes.productId,
      version: factoryRecipes.version,
      approvalStatus: factoryRecipes.approvalStatus,
      createdAt: factoryRecipes.createdAt,
      notes: factoryRecipes.notes,
    })
    .from(factoryRecipes)
    .where(eq(factoryRecipes.approvalStatus, "pending"))
    .orderBy(desc(factoryRecipes.createdAt))
    .limit(50);

    // Ürün adlarını çek
    const productIds = recipes.map(r => r.productId).filter(Boolean) as number[];
    let productMap: Record<number, any> = {};
    if (productIds.length > 0) {
      const products = await db.select({
        id: factoryProducts.id,
        name: factoryProducts.name,
        sku: factoryProducts.sku,
        category: factoryProducts.category,
      })
      .from(factoryProducts)
      .where(sql`${factoryProducts.id} = ANY(${productIds})`);
      productMap = Object.fromEntries(products.map(p => [p.id, p]));
    }

    const enriched = recipes.map(r => ({
      ...r,
      product: r.productId ? productMap[r.productId] : null,
    }));

    res.json({ recipes: enriched, count: enriched.length });
  } catch (err: any) {
    console.error("[Sema/pending-recipes]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sema/recipes/:id/approve
router.post("/api/sema/recipes/:id/approve", isAuthenticated, requireSema, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const { feedback } = req.body;

    const [updated] = await db.update(factoryRecipes)
      .set({
        approvalStatus: "approved",
        approvedById: userId,
        approvedAt: new Date(),
        feedback: feedback || null,
        updatedAt: new Date(),
      })
      .where(eq(factoryRecipes.id, id))
      .returning();

    console.log(`[Sema] ${userId} APPROVED recipe ${id}`);
    res.json({ success: true, recipe: updated });
  } catch (err: any) {
    console.error("[Sema/approve]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sema/recipes/:id/reject
router.post("/api/sema/recipes/:id/reject", isAuthenticated, requireSema, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const { feedback } = req.body;
    if (!feedback || feedback.trim().length < 5) {
      return res.status(400).json({ message: "Red sebebi gerekli (min 5 karakter)" });
    }

    const [updated] = await db.update(factoryRecipes)
      .set({
        approvalStatus: "rejected",
        approvedById: userId,
        approvedAt: new Date(),
        feedback,
        updatedAt: new Date(),
      })
      .where(eq(factoryRecipes.id, id))
      .returning();

    console.log(`[Sema] ${userId} REJECTED recipe ${id}: ${feedback}`);
    res.json({ success: true, recipe: updated });
  } catch (err: any) {
    console.error("[Sema/reject]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. ALERJEN ANALİZ
// ═══════════════════════════════════════════════════════════════════

// GET /api/sema/allergen-overview
router.get("/api/sema/allergen-overview", isAuthenticated, requireSema, async (req, res) => {
  try {
    const items = await db.select({
      id: rawMaterials.id,
      code: rawMaterials.code,
      name: rawMaterials.name,
      mainCategory: rawMaterials.mainCategory,
      allergenPresent: rawMaterials.allergenPresent,
      allergenDetail: rawMaterials.allergenDetail,
      crossContamination: rawMaterials.crossContamination,
    })
    .from(rawMaterials)
    .where(eq(rawMaterials.isActive, true))
    .orderBy(rawMaterials.allergenPresent, rawMaterials.name)
    .limit(500);

    // Özet sayım
    const summary = {
      total: items.length,
      withAllergen: items.filter(i => i.allergenPresent).length,
      withCrossContamination: items.filter(i => i.crossContamination && i.crossContamination.trim().length > 0).length,
      undocumented: items.filter(i => !i.allergenPresent && !i.allergenDetail).length,
    };

    res.json({ items, summary });
  } catch (err: any) {
    console.error("[Sema/allergen]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
