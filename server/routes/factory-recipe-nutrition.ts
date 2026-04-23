/**
 * Fabrika Reçete Seed & Besin Değer Hesaplama
 * Sprint R-4: Cinnabon örnek veri + AI besin tablosu + alerjen tespiti
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  factoryRecipes, factoryRecipeIngredients, factoryRecipeSteps,
  factoryKeyblends, factoryKeyblendIngredients,
  factoryIngredientNutrition,
  auditLogs,
  users,
} from "@shared/schema";
import { eq, sql, lt, asc, desc, and, ilike } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { z } from "zod";
import { canonicalIngredientName } from "@shared/lib/ingredient-canonical";

const router = Router();

// ═══════════════════════════════════════
// ALERJEN TESPİTİ (14 AB/TR alerjen)
// ═══════════════════════════════════════

const ALLERGEN_MAP: Record<string, string[]> = {
  "gluten": ["un", "buğday", "wheat", "flour", "gluten", "vital", "nişasta", "soya unu"],
  "süt": ["süt", "milk", "whey", "laktoz", "lactose", "peynir", "tereyağ", "krema", "cream"],
  "yumurta": ["yumurta", "egg"],
  "soya": ["soya", "soy", "lesitin", "lecithin"],
  "fındık": ["fındık", "badem", "ceviz", "hazelnut", "almond", "walnut", "pecan", "pistachio"],
  "yer fıstığı": ["yer fıstığı", "peanut"],
  "susam": ["susam", "sesame"],
  "kereviz": ["kereviz", "celery"],
  "hardal": ["hardal", "mustard"],
  "sülfitler": ["sülfür", "sulfit", "sulfite", "SO2"],
  "yumuşakçalar": ["midye", "ahtapot", "kalamar", "mürekkep balığı"],
  "kabuklular": ["karides", "ıstakoz", "yengeç"],
  "lupin": ["lupin", "baklagil"],
  "balık": ["balık", "fish", "ton balığı"],
};

function detectAllergens(ingredientName: string): string[] {
  const lower = ingredientName.toLowerCase();
  const detected: string[] = [];
  for (const [allergen, keywords] of Object.entries(ALLERGEN_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(allergen);
    }
  }
  return detected;
}

// ═══════════════════════════════════════
// BESİN DEĞER HESAPLAMA
// ═══════════════════════════════════════

// Basit besin değer veritabanı (100gr başına) — AI olmadan çalışır
const NUTRITION_DB: Record<string, { kcal: number; fat: number; sfat: number; carb: number; sugar: number; fiber: number; protein: number; salt: number }> = {
  "un": { kcal: 364, fat: 1, sfat: 0.2, carb: 76, sugar: 0.3, fiber: 2.7, protein: 10, salt: 0 },
  "şeker": { kcal: 400, fat: 0, sfat: 0, carb: 100, sugar: 100, fiber: 0, protein: 0, salt: 0 },
  "tuz": { kcal: 0, fat: 0, sfat: 0, carb: 0, sugar: 0, fiber: 0, protein: 0, salt: 100 },
  "su": { kcal: 0, fat: 0, sfat: 0, carb: 0, sugar: 0, fiber: 0, protein: 0, salt: 0 },
  "süt tozu": { kcal: 496, fat: 26.7, sfat: 16.7, carb: 38, sugar: 38, fiber: 0, protein: 26.3, salt: 1.1 },
  "whey": { kcal: 352, fat: 1.1, sfat: 0.6, carb: 74, sugar: 74, fiber: 0, protein: 12, salt: 1.8 },
  "margarin": { kcal: 720, fat: 80, sfat: 30, carb: 0, sugar: 0, fiber: 0, protein: 0, salt: 1.5 },
  "tereyağı": { kcal: 717, fat: 81, sfat: 51, carb: 0.1, sugar: 0.1, fiber: 0, protein: 0.9, salt: 0.6 },
  "yumurta": { kcal: 155, fat: 11, sfat: 3.3, carb: 1.1, sugar: 1.1, fiber: 0, protein: 13, salt: 0.4 },
  "maya": { kcal: 105, fat: 1.9, sfat: 0.2, carb: 18.3, sugar: 0, fiber: 8.1, protein: 8.4, salt: 0.05 },
  "vanilya": { kcal: 288, fat: 0.1, sfat: 0, carb: 13, sugar: 13, fiber: 0, protein: 0.1, salt: 0 },
  "nişasta": { kcal: 351, fat: 0.1, sfat: 0, carb: 87, sugar: 0, fiber: 0.6, protein: 0.3, salt: 0 },
  "gliserin": { kcal: 400, fat: 0, sfat: 0, carb: 100, sugar: 0, fiber: 0, protein: 0, salt: 0 },
};

function matchNutritionDB(ingredientName: string): typeof NUTRITION_DB[string] | null {
  const lower = ingredientName.toLowerCase();
  for (const [key, value] of Object.entries(NUTRITION_DB)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

// POST /api/factory/recipes/:id/calculate-nutrition
router.post("/api/factory/recipes/:id/calculate-nutrition", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!["admin", "recete_gm", "gida_muhendisi"].includes(req.user.role)) {
      return res.status(403).json({ error: "Besin değer hesaplama yetkiniz yok" });
    }

    const recipeId = Number(req.params.id);
    const recipe = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId)).limit(1);
    if (!recipe[0]) return res.status(404).json({ error: "Reçete bulunamadı" });

    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, recipeId));

    // Toplam ağırlık
    const totalGrams = ingredients.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    if (totalGrams === 0) return res.status(400).json({ error: "Malzeme bulunamadı" });

    // Besin değer hesapla (100gr başına)
    let totalKcal = 0, totalFat = 0, totalSfat = 0, totalCarb = 0;
    let totalSugar = 0, totalFiber = 0, totalProtein = 0, totalSalt = 0;
    let matchedCount = 0;
    const allAllergens = new Set<string>();

    for (const ing of ingredients) {
      const amount = Number(ing.amount || 0);
      const ratio = amount / totalGrams; // Bu malzemenin toplam içindeki oranı

      // Besin değer eşleştirme
      const nutrition = matchNutritionDB(ing.name);
      if (nutrition) {
        totalKcal += nutrition.kcal * ratio;
        totalFat += nutrition.fat * ratio;
        totalSfat += nutrition.sfat * ratio;
        totalCarb += nutrition.carb * ratio;
        totalSugar += nutrition.sugar * ratio;
        totalFiber += nutrition.fiber * ratio;
        totalProtein += nutrition.protein * ratio;
        totalSalt += nutrition.salt * ratio;
        matchedCount++;
      }

      // Alerjen tespiti
      const allergens = detectAllergens(ing.name);
      allergens.forEach(a => allAllergens.add(a));

      // Keyblend içindeki alerjenler
      if ((ing.ingredientType || "normal") === "keyblend" && ing.keyblendId) {
        const kbIngredients = await db.select().from(factoryKeyblendIngredients)
          .where(eq(factoryKeyblendIngredients.keyblendId, Number(ing.keyblendId)));
        for (const kbi of kbIngredients) {
          if (kbi.isAllergen) {
            const kbAllergens = detectAllergens(kbi.name);
            kbAllergens.forEach(a => allAllergens.add(a));
          }
        }
      }
    }

    const confidence = Math.round((matchedCount / ingredients.length) * 100);
    const portionSize = recipe[0].expectedUnitWeight ? Number(recipe[0].expectedUnitWeight) : null;
    const portionsPerBatch = recipe[0].baseBatchOutput || 1;

    const nutritionFacts = {
      energy_kcal: Math.round(totalKcal),
      fat_g: Math.round(totalFat * 10) / 10,
      saturated_fat_g: Math.round(totalSfat * 10) / 10,
      carbohydrate_g: Math.round(totalCarb * 10) / 10,
      sugar_g: Math.round(totalSugar * 10) / 10,
      fiber_g: Math.round(totalFiber * 10) / 10,
      protein_g: Math.round(totalProtein * 10) / 10,
      salt_g: Math.round(totalSalt * 10) / 10,
      per_unit: "100g",
      portion_size_g: portionSize,
      portions_per_batch: portionsPerBatch,
    };

    // Porsiyon başına
    const nutritionPerPortion = portionSize ? {
      energy_kcal: Math.round(totalKcal * portionSize / 100),
      fat_g: Math.round(totalFat * portionSize / 100 * 10) / 10,
      carbohydrate_g: Math.round(totalCarb * portionSize / 100 * 10) / 10,
      sugar_g: Math.round(totalSugar * portionSize / 100 * 10) / 10,
      protein_g: Math.round(totalProtein * portionSize / 100 * 10) / 10,
      salt_g: Math.round(totalSalt * portionSize / 100 * 10) / 10,
      portion_size_g: portionSize,
    } : null;

    // DB güncelle
    await db.update(factoryRecipes).set({
      nutritionFacts,
      nutritionPerPortion: nutritionPerPortion,
      allergens: Array.from(allAllergens),
      nutritionCalculatedAt: new Date(),
      nutritionConfidence: confidence,
      updatedAt: new Date(),
    }).where(eq(factoryRecipes.id, recipeId));

    res.json({
      nutritionFacts,
      nutritionPerPortion,
      allergens: Array.from(allAllergens),
      confidence,
      matchedIngredients: matchedCount,
      totalIngredients: ingredients.length,
    });
  } catch (error) {
    console.error("Nutrition calculation error:", error);
    res.status(500).json({ error: "Besin değer hesaplama başarısız" });
  }
});

// ═══════════════════════════════════════
// SEED: CİNNABON REÇETE
// ═══════════════════════════════════════

router.post("/api/factory/seed-cinnabon", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Sadece admin" });

    // Keyblend oluştur
    const [kb] = await db.insert(factoryKeyblends).values({
      code: "KB-CIN01",
      name: "Cinnabon Improver Premix",
      description: "Cinnamon roll hamur geliştirici karışım",
      totalWeight: "69.5",
      showToGm: false,
      createdBy: req.user.id,
    }).onConflictDoNothing().returning();

    const kbId = kb?.id;

    if (kbId) {
      const kbIngredients = [
        { name: "DATEM (E472e)", amount: "15", unit: "gr", isAllergen: false },
        { name: "SSL (E481)", amount: "15", unit: "gr", isAllergen: false },
        { name: "Soya unu", amount: "30", unit: "gr", isAllergen: true },
        { name: "Askorbik asit (E300)", amount: "3", unit: "gr", isAllergen: false },
        { name: "CMC (E466)", amount: "5", unit: "gr", isAllergen: false },
        { name: "Xanthan gam (E415)", amount: "1.5", unit: "gr", isAllergen: false },
      ];
      for (const [idx, ing] of kbIngredients.entries()) {
        await db.insert(factoryKeyblendIngredients).values({
          keyblendId: kbId, ...ing, sortOrder: idx,
        }).onConflictDoNothing();
      }
    }

    // Reçete oluştur
    const [recipe] = await db.insert(factoryRecipes).values({
      name: "Cinnabon Full Revizyon — Endüstriyel",
      code: "CIN-001",
      description: "5 kg un bazlı endüstriyel cinnamon roll. Pişir→şokla→çöz→ye. Raf ömrü: 48-72 saat.",
      category: "cinnamon_roll",
      outputType: "mamul",
      baseBatchOutput: 65,
      outputUnit: "adet",
      totalWeightGrams: 10000,
      prepTimeMinutes: 40,
      productionTimeMinutes: 120,
      cleaningTimeMinutes: 20,
      requiredWorkers: 2,
      equipmentKwh: "3.5",
      waterConsumptionLt: "15",
      expectedOutputCount: 65,
      expectedUnitWeight: "120",
      expectedWasteKg: "1",
      expectedLossGrams: "500",
      wasteTolerancePct: "5",
      recipeType: "KEYBLEND",
      bakersPercentage: "Un: %100 | Şeker: %12 | Tuz: %1.8 | Su: %43 | Süt tozu: %3.6 | Margarin: %18 | Maya: %5",
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }).onConflictDoNothing().returning();

    if (!recipe) return res.json({ message: "Cinnabon zaten mevcut" });

    // Malzemeler
    const ingredients = [
      { refId: "0001", name: "Orta-güçlü un (W250-280, %11.5-12.5 protein)", amount: "5000", unit: "gr", category: "ana" },
      { refId: "0002", name: "Modifiye nişasta (E1422)", amount: "150", unit: "gr", category: "ana" },
      { refId: "0003", name: "Vital wheat gluten", amount: "50", unit: "gr", category: "ana" },
      { refId: "0004", name: "Toz şeker", amount: "600", unit: "gr", category: "ana" },
      { refId: "0005", name: "İnce tuz", amount: "90", unit: "gr", category: "ana" },
      { refId: "0006", name: "Su (28-30°C)", amount: "2150", unit: "gr", category: "ana" },
      { refId: "0007", name: "Yağsız süt tozu", amount: "180", unit: "gr", category: "ana" },
      { refId: "0008", name: "Whey protein tozu", amount: "80", unit: "gr", category: "ana" },
      { refId: "0009", name: "AAK ALBA margarin", amount: "900", unit: "gr", category: "ana" },
      { refId: "0010", name: "Yumurta tozu (spray-dried)", amount: "275", unit: "gr", category: "ana" },
      { refId: "0011", name: "Yaş maya (taze)", amount: "250", unit: "gr", category: "ana" },
      { refId: "0012", name: "Vanilya özütü", amount: "35", unit: "ml", category: "lezzet" },
      { refId: "0013", name: "İnvert şeker", amount: "75", unit: "gr", category: "ana" },
      { refId: "0014", name: "Gliserin (E422)", amount: "75", unit: "gr", category: "ana" },
    ];

    for (const [idx, ing] of ingredients.entries()) {
      await db.insert(factoryRecipeIngredients).values({
        recipeId: recipe.id, refId: ing.refId, name: canonicalIngredientName(ing.name),
        amount: ing.amount, unit: ing.unit,
        ingredientCategory: ing.category, ingredientType: "normal",
        sortOrder: idx,
      });
    }

    // Keyblend malzemesini ekle
    if (kbId) {
      await db.insert(factoryRecipeIngredients).values({
        recipeId: recipe.id, refId: "KB01", name: "Keyblend KB-CIN01 (Improver Premix)",
        amount: "69.5", unit: "gr",
        ingredientCategory: "katki", ingredientType: "keyblend",
        keyblendId: kbId, sortOrder: 14,
      });
    }

    // Adımlar
    const stepsData = [
      { n: 1, title: "Yaş maya aktivasyonu", content: "{0011} yaş mayayı 200-250gr ılık suyun ({0006} miktarından ayır) içinde ufalayıp eritin. 5 dakika bekleyin — yüzeyde köpürme başlamalı.", timer: 300, tip: "Maya köpürmezse ölmüş olabilir — yeni maya kullanın." },
      { n: 2, title: "Kuru premix hazırlama", content: "Spiral mikser kazanına {0001}, {0002}, {0003} koyun. Üzerine {0004}, {0005}, {0007}, {0008} ekleyin. {KB01} improver premix'i ekleyin. 1. viteste 1 dakika kuru karıştırın.", timer: 60, tip: null },
      { n: 3, title: "Sıvı ekleme + hidrasyon", content: "Kalan {0006} suyu (~1900-1950gr) 28-30°C'de hazırlayın. {0010} yumurta tozunu suda iyice çözün (2 dk çırpın — topak kalmasın). {0013} invert şekeri ve {0014} gliserini ekleyin. Aktive edilmiş maya sıvısını ekleyin. Tüm sıvıyı kuru karışıma dökün. 1. viteste 4 dakika yoğurun.", timer: 240, tip: "Su sıcaklığı 30°C'yi geçmemeli!" },
      { n: 4, title: "Yağ ekleme + yoğurma", content: "{0009} margarini oda sıcaklığında yumuşatın. Hamur toparlandıktan sonra margarini 3 porsiyonda ekleyin. 2. viteste 8-10 dakika yoğurun. Hamur kazandan temiz ayrılmalı. Windowpane testi yapın.", timer: 600, tip: "Gluten gelişimi için windowpane testi kritik — hamur yırtılmadan gerilmeli." },
      { n: 5, title: "İlk mayalanma", content: "Hamuru kapaklı kapta 26-28°C'de 45-60 dakika dinlendirin. Hacim ~1.5 katına çıkmalı.", timer: 3600, tip: "Fabrika sıcaklığı yüksekse süreyi kısaltın. Parmak testiyle kontrol edin." },
      { n: 6, title: "Şekillendirme", content: "Hamuru 5mm kalınlığında açın. Tarçınlı şeker + tereyağı karışımını yayın. Rulo yapıp 3cm kalınlığında dilimleyin. Yağlanmış tepsiye dizin.", timer: null, tip: null },
      { n: 7, title: "İkinci mayalanma", content: "Şekillenmiş ürünleri 30-32°C'de 30-40 dakika dinlendirin. Hacim ~1.5 katına çıkmalı.", timer: 2400, tip: null },
      { n: 8, title: "Pişirme", content: "175°C'de 18-22 dakika pişirin. Üst kızarıklık altın sarısı olmalı, iç sıcaklık 92-95°C.", timer: 1200, tip: "İç sıcaklığı termometre ile kontrol edin — 92°C altında çiğ kalır." },
      { n: 9, title: "Şoklama", content: "Pişen ürünleri hemen şoklama dolabına alın. -30°C'de 2 saat şoklayın. İç sıcaklık -18°C'ye düşmeli.", timer: 7200, tip: "Şoklama gecikmesi kaliteyi düşürür — pişirme sonrası max 10 dk içinde şoklama başlamalı." },
      { n: 10, title: "Paketleme ve depolama", content: "Şoklanmış ürünleri -18°C depoda saklayın. Çözülme sonrası raf ömrü: 48-72 saat. Etiketleme: üretim tarihi, SKT, lot numarası.", timer: null, tip: "FIFO kuralı: en eski lot önce sevk edilir." },
    ];

    for (const s of stepsData) {
      await db.insert(factoryRecipeSteps).values({
        recipeId: recipe.id, stepNumber: s.n, title: s.title,
        content: s.content, timerSeconds: s.timer,
        tips: s.tip, isCriticalControl: [8, 9].includes(s.n),
        ccpNotes: s.n === 8 ? "İç sıcaklık kontrolü: 92-95°C" : s.n === 9 ? "Şoklama sıcaklığı: -30°C, iç sıcaklık: -18°C" : null,
        temperatureCelsius: s.n === 5 ? 27 : s.n === 7 ? 31 : s.n === 8 ? 175 : s.n === 9 ? -30 : null,
        equipmentNeeded: s.n <= 4 ? "Spiral mikser" : s.n === 8 ? "Konveksiyonlu fırın" : s.n === 9 ? "Şoklama dolabı" : null,
      });
    }

    res.json({
      message: "Cinnabon reçetesi seed edildi",
      recipeId: recipe.id,
      ingredientCount: ingredients.length + 1, // +1 keyblend
      stepCount: stepsData.length,
      keyblendId: kbId,
    });
  } catch (error) {
    console.error("Cinnabon seed error:", error);
    res.status(500).json({ error: "Seed başarısız" });
  }
});

// ═══════════════════════════════════════
// MÜHENDİS BESİN DEĞER ONAY PANELİ
// (Task #146)
// ═══════════════════════════════════════

const APPROVAL_ROLES = ["admin", "gida_muhendisi", "kalite_yoneticisi", "ust_yonetim"];

function canApproveNutrition(role?: string | null): boolean {
  return !!role && APPROVAL_ROLES.includes(role);
}

// GET /api/factory/ingredient-nutrition/pending
// Confidence < 100 olan tüm hammadde besin değer kayıtları
router.get("/api/factory/ingredient-nutrition/pending", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canApproveNutrition(req.user?.role)) {
      return res.status(403).json({ error: "Besin onay paneline erişim yetkiniz yok" });
    }

    const rows = await db.select().from(factoryIngredientNutrition)
      .where(lt(factoryIngredientNutrition.confidence, 100))
      .orderBy(asc(factoryIngredientNutrition.ingredientName));

    res.json({ items: rows, total: rows.length });
  } catch (error) {
    console.error("Pending nutrition list error:", error);
    res.status(500).json({ error: "Bekleyen kayıtlar getirilemedi" });
  }
});

const numericLike = z.union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Geçersiz sayısal değer" });
      return z.NEVER;
    }
    if (n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Negatif değer kabul edilmez" });
      return z.NEVER;
    }
    return String(n);
  });

const approveSchema = z.object({
  energyKcal: numericLike,
  fatG: numericLike,
  saturatedFatG: numericLike,
  transFatG: numericLike,
  carbohydrateG: numericLike,
  sugarG: numericLike,
  fiberG: numericLike,
  proteinG: numericLike,
  saltG: numericLike,
  sodiumMg: numericLike,
  allergens: z.array(z.string()).optional(),
  note: z.string().max(500).optional(),
});

// PATCH /api/factory/ingredient-nutrition/:id/onay
// Tek tıkla onay: confidence=100, source='manual_verified', verified_by=oturum
router.patch("/api/factory/ingredient-nutrition/:id/onay", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canApproveNutrition(req.user?.role)) {
      return res.status(403).json({ error: "Onay yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz id" });
    }

    const parsed = approveSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz veri", details: parsed.error.flatten() });
    }

    const [existing] = await db.select().from(factoryIngredientNutrition)
      .where(eq(factoryIngredientNutrition.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Kayıt bulunamadı" });

    const body = parsed.data;
    const next = {
      energyKcal: body.energyKcal ?? existing.energyKcal,
      fatG: body.fatG ?? existing.fatG,
      saturatedFatG: body.saturatedFatG ?? existing.saturatedFatG,
      transFatG: body.transFatG ?? existing.transFatG,
      carbohydrateG: body.carbohydrateG ?? existing.carbohydrateG,
      sugarG: body.sugarG ?? existing.sugarG,
      fiberG: body.fiberG ?? existing.fiberG,
      proteinG: body.proteinG ?? existing.proteinG,
      saltG: body.saltG ?? existing.saltG,
      sodiumMg: body.sodiumMg ?? existing.sodiumMg,
      allergens: body.allergens ?? existing.allergens ?? [],
      source: "manual_verified" as const,
      confidence: 100,
      verifiedBy: req.user.id as string,
      updatedAt: new Date(),
    };

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(factoryIngredientNutrition)
        .set(next)
        .where(eq(factoryIngredientNutrition.id, id))
        .returning();

      await tx.insert(auditLogs).values({
        eventType: "factory.ingredient_nutrition.approved",
        userId: req.user.id,
        actorRole: req.user.role,
        action: "approve",
        resource: "factory_ingredient_nutrition",
        resourceId: String(id),
        before: {
          energyKcal: existing.energyKcal,
          fatG: existing.fatG,
          saturatedFatG: existing.saturatedFatG,
          transFatG: existing.transFatG,
          carbohydrateG: existing.carbohydrateG,
          sugarG: existing.sugarG,
          fiberG: existing.fiberG,
          proteinG: existing.proteinG,
          saltG: existing.saltG,
          sodiumMg: existing.sodiumMg,
          allergens: existing.allergens,
          source: existing.source,
          confidence: existing.confidence,
          verifiedBy: existing.verifiedBy,
        },
        after: {
          energyKcal: next.energyKcal,
          fatG: next.fatG,
          saturatedFatG: next.saturatedFatG,
          transFatG: next.transFatG,
          carbohydrateG: next.carbohydrateG,
          sugarG: next.sugarG,
          fiberG: next.fiberG,
          proteinG: next.proteinG,
          saltG: next.saltG,
          sodiumMg: next.sodiumMg,
          allergens: next.allergens,
          source: next.source,
          confidence: next.confidence,
          verifiedBy: next.verifiedBy,
        },
        details: {
          ingredientName: existing.ingredientName,
          note: body.note ?? null,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });

      return row;
    });

    res.json({ ok: true, item: updated });
  } catch (error) {
    console.error("Nutrition approve error:", error);
    res.status(500).json({ error: "Onay başarısız" });
  }
});

// POST /api/factory/ingredient-nutrition/onay-toplu
// Toplu onay: ids[] kayıtlarını tek tıkla manual_verified/confidence=100 yapar
const bulkApproveSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  note: z.string().max(500).optional(),
});

router.post("/api/factory/ingredient-nutrition/onay-toplu", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canApproveNutrition(req.user?.role)) {
      return res.status(403).json({ error: "Onay yetkiniz yok" });
    }

    const parsed = bulkApproveSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz veri", details: parsed.error.flatten() });
    }

    const { ids, note } = parsed.data;
    const uniqueIds = Array.from(new Set(ids));

    const result = await db.transaction(async (tx) => {
      const approved: number[] = [];
      const skipped: number[] = [];
      const now = new Date();

      for (const id of uniqueIds) {
        const [existing] = await tx.select().from(factoryIngredientNutrition)
          .where(eq(factoryIngredientNutrition.id, id)).limit(1);

        if (!existing) {
          skipped.push(id);
          continue;
        }

        const next = {
          source: "manual_verified" as const,
          confidence: 100,
          verifiedBy: req.user.id as string,
          updatedAt: now,
        };

        const [row] = await tx.update(factoryIngredientNutrition)
          .set(next)
          .where(eq(factoryIngredientNutrition.id, id))
          .returning();

        await tx.insert(auditLogs).values({
          eventType: "factory.ingredient_nutrition.approved",
          userId: req.user.id,
          actorRole: req.user.role,
          action: "approve_bulk",
          resource: "factory_ingredient_nutrition",
          resourceId: String(id),
          before: {
            source: existing.source,
            confidence: existing.confidence,
            verifiedBy: existing.verifiedBy,
          },
          after: {
            source: next.source,
            confidence: next.confidence,
            verifiedBy: next.verifiedBy,
          },
          details: {
            ingredientName: existing.ingredientName,
            note: note ?? null,
            bulk: true,
            batchSize: uniqueIds.length,
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent") ?? null,
        });

        if (row) approved.push(id);
      }

      return { approved, skipped };
    });

    res.json({
      ok: true,
      approvedCount: result.approved.length,
      skippedCount: result.skipped.length,
      approved: result.approved,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("Bulk nutrition approve error:", error);
    res.status(500).json({ error: "Toplu onay başarısız" });
  }
});

// GET /api/factory/ingredient-nutrition/approved
// Confidence = 100 (onaylanmış) kayıtların listesi + verifier bilgisi
router.get("/api/factory/ingredient-nutrition/approved", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canApproveNutrition(req.user?.role)) {
      return res.status(403).json({ error: "Besin onay paneline erişim yetkiniz yok" });
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sourceFilter = typeof req.query.source === "string" ? req.query.source.trim() : "";
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const filters = [eq(factoryIngredientNutrition.confidence, 100)];
    if (search) {
      filters.push(ilike(factoryIngredientNutrition.ingredientName, `%${search}%`));
    }
    if (sourceFilter && sourceFilter !== "all") {
      filters.push(eq(factoryIngredientNutrition.source, sourceFilter));
    }

    const rows = await db
      .select({
        id: factoryIngredientNutrition.id,
        ingredientName: factoryIngredientNutrition.ingredientName,
        energyKcal: factoryIngredientNutrition.energyKcal,
        fatG: factoryIngredientNutrition.fatG,
        saturatedFatG: factoryIngredientNutrition.saturatedFatG,
        transFatG: factoryIngredientNutrition.transFatG,
        carbohydrateG: factoryIngredientNutrition.carbohydrateG,
        sugarG: factoryIngredientNutrition.sugarG,
        fiberG: factoryIngredientNutrition.fiberG,
        proteinG: factoryIngredientNutrition.proteinG,
        saltG: factoryIngredientNutrition.saltG,
        sodiumMg: factoryIngredientNutrition.sodiumMg,
        allergens: factoryIngredientNutrition.allergens,
        source: factoryIngredientNutrition.source,
        confidence: factoryIngredientNutrition.confidence,
        verifiedBy: factoryIngredientNutrition.verifiedBy,
        updatedAt: factoryIngredientNutrition.updatedAt,
        verifierFirstName: users.firstName,
        verifierLastName: users.lastName,
        verifierEmail: users.email,
      })
      .from(factoryIngredientNutrition)
      .leftJoin(users, eq(users.id, factoryIngredientNutrition.verifiedBy))
      .where(and(...filters))
      .orderBy(desc(factoryIngredientNutrition.updatedAt))
      .limit(limit);

    res.json({ items: rows, total: rows.length });
  } catch (error) {
    console.error("Approved nutrition list error:", error);
    res.status(500).json({ error: "Onaylanmış kayıtlar getirilemedi" });
  }
});

// GET /api/factory/ingredient-nutrition/:id/audit
// Bu kayda ait son N onay/audit kaydını döner (önceki/sonraki değer ile)
router.get("/api/factory/ingredient-nutrition/:id/audit", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canApproveNutrition(req.user?.role)) {
      return res.status(403).json({ error: "Audit görüntüleme yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz id" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const rows = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        action: auditLogs.action,
        actorRole: auditLogs.actorRole,
        userId: auditLogs.userId,
        before: auditLogs.before,
        after: auditLogs.after,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(
        eq(auditLogs.eventType, "factory.ingredient_nutrition.approved"),
        eq(auditLogs.resource, "factory_ingredient_nutrition"),
        eq(auditLogs.resourceId, String(id)),
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    res.json({ items: rows, total: rows.length });
  } catch (error) {
    console.error("Nutrition audit fetch error:", error);
    res.status(500).json({ error: "Audit kayıtları getirilemedi" });
  }
});

export default router;
