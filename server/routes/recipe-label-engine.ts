// ═══════════════════════════════════════════════════════════════════
// Sprint 7 v3 (5 May 2026) - Reçete → TGK Etiket Hesaplama
// ═══════════════════════════════════════════════════════════════════
// 
// Problem: 
//   - branchRecipeIngredients FREE-TEXT kullanıyor (ingredientName: "süt")
//   - factoryRecipeIngredients.rawMaterialId aslında inventory.id (rawMaterials değil)
//   - Etiket hesaplama için rawMaterials'tan besin değeri ÇEKMEMİZ GEREK
// 
// Çözüm:
//   1. Smart matching: ingredient_name → rawMaterials.name (fuzzy)
//   2. Inventory üzerinden çapraz arama (factory için)
//   3. Eşleşmeyen ingredient'leri rapor (kullanıcı manuel bağlasın)
//   4. Eşleşenlerin besin değerleri toplamı → etiket
// 
// ⚠️ Uyumsuzluk uyarısı: kullanıcıya açıkça "X ingredient'i rawMaterials
// listesinde yok, etiket eksik bilgi içerebilir" denir.
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import {
  rawMaterials,
  branchRecipes,
  branchRecipeIngredients,
  branchProducts,
  factoryRecipes,
  factoryRecipeIngredients,
  productRecipes,
  productRecipeIngredients,
  tgkLabels,
  inventory,
} from '@shared/schema';
import { and, eq, ilike, or, sql, inArray } from 'drizzle-orm';

const router = Router();

const READ_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'fabrika_mudur', 'fabrika_sorumlu', 'kalite', 'sef', 'recete_gm'];
const WRITE_ROLES = ['admin', 'ceo', 'satinalma', 'gida_muhendisi', 'sef', 'recete_gm'];

function canRead(role: string): boolean { return READ_ROLES.includes(role); }
function canWrite(role: string): boolean { return WRITE_ROLES.includes(role); }

// ═══════════════════════════════════════════════════════════════════
// SMART MATCHING - ingredient adı → rawMaterials eşleştirme
// ═══════════════════════════════════════════════════════════════════
async function smartMatchIngredient(ingredientName: string): Promise<any | null> {
  if (!ingredientName) return null;
  const cleaned = ingredientName.trim().toLowerCase();
  
  // 1) Tam eşleşme (lowercase)
  const exact = await db.select()
    .from(rawMaterials)
    .where(and(
      sql`LOWER(${rawMaterials.name}) = ${cleaned}`,
      eq(rawMaterials.isActive, true),
    ))
    .limit(1);
  if (exact.length > 0) return { ...exact[0], matchType: 'exact', matchScore: 1.0 };
  
  // 2) İçeren (CONTAINS)
  const contains = await db.select()
    .from(rawMaterials)
    .where(and(
      ilike(rawMaterials.name, `%${cleaned}%`),
      eq(rawMaterials.isActive, true),
    ))
    .limit(3);
  if (contains.length === 1) return { ...contains[0], matchType: 'contains', matchScore: 0.85 };
  if (contains.length > 1) {
    // En kısa eşleşmeyi seç (genelde daha spesifik)
    const sorted = contains.sort((a, b) => a.name.length - b.name.length);
    return { ...sorted[0], matchType: 'contains_multiple', matchScore: 0.7, alternatives: sorted.slice(1, 3) };
  }
  
  // 3) İlk kelime eşleşmesi (örn. "Beyaz çikolata para" → "Beyaz çikolata")
  const firstWord = cleaned.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    const wordMatch = await db.select()
      .from(rawMaterials)
      .where(and(
        ilike(rawMaterials.name, `%${firstWord}%`),
        eq(rawMaterials.isActive, true),
      ))
      .limit(2);
    if (wordMatch.length > 0) {
      return { ...wordMatch[0], matchType: 'first_word', matchScore: 0.5 };
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// 1) POST /api/recipe-label/calculate-branch — Branch reçetesi → etiket
// ═══════════════════════════════════════════════════════════════════
// Body: { branchProductId: number }
// ═══════════════════════════════════════════════════════════════════

router.post('/api/recipe-label/calculate-branch', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const { branchProductId } = req.body;
    if (!branchProductId) return res.status(400).json({ message: 'branchProductId gerekli' });

    // Branch product
    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, branchProductId)).limit(1);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı' });

    // Reçeteyi bul
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.productId, branchProductId)).limit(1);
    if (!recipe) {
      return res.json({
        productId: branchProductId,
        productName: product.name,
        message: 'Bu ürün için reçete bulunamadı',
        ingredients: [],
        nutrition: null,
      });
    }

    // Ingredient'leri çek
    const ingredients = await db.select().from(branchRecipeIngredients)
      .where(eq(branchRecipeIngredients.recipeId, recipe.id))
      .orderBy(branchRecipeIngredients.stepOrder);

    if (!ingredients.length) {
      return res.json({
        productId: branchProductId,
        productName: product.name,
        message: 'Reçetede ingredient yok',
        ingredients: [],
        nutrition: null,
      });
    }

    // Smart matching ile her ingredient'i rawMaterials'a bağla
    const matched: any[] = [];
    const unmatched: any[] = [];
    const allergens = new Set<string>();
    const crossContams = new Set<string>();
    
    let totalEnergy = 0, totalFat = 0, totalSatFat = 0, totalCarb = 0;
    let totalSugar = 0, totalProtein = 0, totalSalt = 0, totalFiber = 0;
    let totalGramsKnown = 0;

    for (const ing of ingredients) {
      const match = await smartMatchIngredient(ing.ingredientName);
      
      if (!match) {
        unmatched.push({
          ingredientName: ing.ingredientName,
          quantityText: ing.quantityText,
          reason: 'rawMaterials\'da bulunamadı',
        });
        continue;
      }

      // Miktarı gram'a çevir
      let grams = 0;
      const qty = parseFloat(ing.quantityNumeric || '0');
      if (qty > 0 && ing.unit) {
        if (ing.unit === 'g' || ing.unit === 'gr') grams = qty;
        else if (ing.unit === 'kg') grams = qty * 1000;
        else if (ing.unit === 'ml') grams = qty; // su yoğunluğu varsayım
        else if (ing.unit === 'lt' || ing.unit === 'l') grams = qty * 1000;
        else if (ing.unit === 'pump') grams = qty * 8; // 1 pump ≈ 8g varsayım
        else if (ing.unit === 'ölçek') grams = qty * 7; // 1 ölçek (kahve) ≈ 7g
      }

      const matchedItem: any = {
        ingredientName: ing.ingredientName,
        matchedTo: match.name,
        rawMaterialId: match.id,
        matchType: match.matchType,
        matchScore: match.matchScore,
        quantityText: ing.quantityText,
        quantityGrams: grams,
        nutritionUsable: grams > 0 && match.energyKcal !== null,
        alternatives: match.alternatives,
      };

      // Besin değeri toplama (yalnızca grams ve kcal varsa)
      if (matchedItem.nutritionUsable) {
        totalGramsKnown += grams;
        const ratio = grams / 100; // hammadde 100g başına
        if (match.energyKcal) totalEnergy += parseFloat(match.energyKcal) * ratio;
        if (match.fat) totalFat += parseFloat(match.fat) * ratio;
        if (match.saturatedFat) totalSatFat += parseFloat(match.saturatedFat) * ratio;
        if (match.carbohydrate) totalCarb += parseFloat(match.carbohydrate) * ratio;
        if (match.sugar) totalSugar += parseFloat(match.sugar) * ratio;
        if (match.protein) totalProtein += parseFloat(match.protein) * ratio;
        if (match.salt) totalSalt += parseFloat(match.salt) * ratio;
        if (match.fiber) totalFiber += parseFloat(match.fiber) * ratio;
      }

      // Alerjenler
      if (match.allergenPresent && match.allergenDetail) allergens.add(match.allergenDetail);
      if (match.crossContamination) crossContams.add(match.crossContamination);

      matched.push(matchedItem);
    }

    // Per 100g normalize
    let nutrition: any = null;
    if (totalGramsKnown > 0) {
      const mult = 100 / totalGramsKnown;
      nutrition = {
        energyKcal: parseFloat((totalEnergy * mult).toFixed(1)),
        energyKj: parseFloat((totalEnergy * mult * 4.184).toFixed(1)),
        fat: parseFloat((totalFat * mult).toFixed(2)),
        saturatedFat: parseFloat((totalSatFat * mult).toFixed(2)),
        carbohydrate: parseFloat((totalCarb * mult).toFixed(2)),
        sugar: parseFloat((totalSugar * mult).toFixed(2)),
        protein: parseFloat((totalProtein * mult).toFixed(2)),
        salt: parseFloat((totalSalt * mult).toFixed(3)),
        fiber: parseFloat((totalFiber * mult).toFixed(2)),
      };
    }

    // İçindekiler text
    const ingredientsText = matched
      .map(m => m.matchedTo)
      .filter(Boolean)
      .join(', ');

    res.json({
      productId: branchProductId,
      productName: product.name,
      productCategory: product.category,
      recipeId: recipe.id,
      totalIngredients: ingredients.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      matchQuality: matched.length / ingredients.length,
      totalGramsKnown,
      nutrition,
      ingredientsText,
      allergenWarning: Array.from(allergens).join(' '),
      crossContaminationWarning: Array.from(crossContams).join(' '),
      matched,
      unmatched,
      warnings: unmatched.length > 0 
        ? [`${unmatched.length} ingredient eşleşmedi — etiket eksik olabilir`]
        : [],
    });
  } catch (error: unknown) {
    console.error('/api/recipe-label/calculate-branch error:', error);
    res.status(500).json({ message: 'Etiket hesaplama başarısız', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) POST /api/recipe-label/calculate-factory — Fabrika reçetesi → etiket
// ═══════════════════════════════════════════════════════════════════

router.post('/api/recipe-label/calculate-factory', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const { factoryRecipeId } = req.body;
    if (!factoryRecipeId) return res.status(400).json({ message: 'factoryRecipeId gerekli' });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, factoryRecipeId)).limit(1);
    if (!recipe) return res.status(404).json({ message: 'Reçete bulunamadı' });

    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, factoryRecipeId));

    const matched: any[] = [];
    const unmatched: any[] = [];
    const allergens = new Set<string>();
    const crossContams = new Set<string>();
    
    let totalEnergy = 0, totalFat = 0, totalSatFat = 0, totalCarb = 0;
    let totalSugar = 0, totalProtein = 0, totalSalt = 0, totalFiber = 0;
    let totalGramsKnown = 0;

    for (const ing of ingredients) {
      const match = await smartMatchIngredient(ing.name);
      
      if (!match) {
        unmatched.push({
          ingredientName: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        });
        continue;
      }

      // Miktar → gram
      let grams = 0;
      const qty = parseFloat(ing.amount || '0');
      if (qty > 0) {
        if (ing.unit === 'g' || ing.unit === 'gr') grams = qty;
        else if (ing.unit === 'kg') grams = qty * 1000;
        else if (ing.unit === 'ml') grams = qty;
        else if (ing.unit === 'lt' || ing.unit === 'l') grams = qty * 1000;
      }

      if (grams > 0 && match.energyKcal !== null) {
        totalGramsKnown += grams;
        const ratio = grams / 100;
        if (match.energyKcal) totalEnergy += parseFloat(match.energyKcal) * ratio;
        if (match.fat) totalFat += parseFloat(match.fat) * ratio;
        if (match.saturatedFat) totalSatFat += parseFloat(match.saturatedFat) * ratio;
        if (match.carbohydrate) totalCarb += parseFloat(match.carbohydrate) * ratio;
        if (match.sugar) totalSugar += parseFloat(match.sugar) * ratio;
        if (match.protein) totalProtein += parseFloat(match.protein) * ratio;
        if (match.salt) totalSalt += parseFloat(match.salt) * ratio;
        if (match.fiber) totalFiber += parseFloat(match.fiber) * ratio;
      }

      if (match.allergenPresent && match.allergenDetail) allergens.add(match.allergenDetail);
      if (match.crossContamination) crossContams.add(match.crossContamination);

      matched.push({
        ingredientName: ing.name,
        matchedTo: match.name,
        rawMaterialId: match.id,
        matchType: match.matchType,
        amount: ing.amount,
        unit: ing.unit,
        quantityGrams: grams,
        ingredientType: ing.ingredientType,
      });
    }

    let nutrition: any = null;
    if (totalGramsKnown > 0) {
      const mult = 100 / totalGramsKnown;
      nutrition = {
        energyKcal: parseFloat((totalEnergy * mult).toFixed(1)),
        energyKj: parseFloat((totalEnergy * mult * 4.184).toFixed(1)),
        fat: parseFloat((totalFat * mult).toFixed(2)),
        saturatedFat: parseFloat((totalSatFat * mult).toFixed(2)),
        carbohydrate: parseFloat((totalCarb * mult).toFixed(2)),
        sugar: parseFloat((totalSugar * mult).toFixed(2)),
        protein: parseFloat((totalProtein * mult).toFixed(2)),
        salt: parseFloat((totalSalt * mult).toFixed(3)),
        fiber: parseFloat((totalFiber * mult).toFixed(2)),
      };
    }

    res.json({
      factoryRecipeId,
      recipeName: recipe.name,
      totalIngredients: ingredients.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      totalGramsKnown,
      nutrition,
      ingredientsText: matched.map(m => m.matchedTo).join(', '),
      allergenWarning: Array.from(allergens).join(' '),
      crossContaminationWarning: Array.from(crossContams).join(' '),
      matched,
      unmatched,
    });
  } catch (error: unknown) {
    console.error('/api/recipe-label/calculate-factory error:', error);
    res.status(500).json({ message: 'Etiket hesaplama başarısız' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3) POST /api/recipe-label/save — Hesaplanmış etiketi tgk_labels'a kaydet
// ═══════════════════════════════════════════════════════════════════

router.post('/api/recipe-label/save', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canWrite(user.role)) {
      return res.status(403).json({ message: 'Etiket kaydetme yetkiniz yok' });
    }

    const body = req.body;
    body.createdById = user.id;
    body.status = 'taslak';
    body.version = 1;

    // Mevcut versiyonu kontrol et
    if (body.productId && body.productType) {
      const existing = await db.select()
        .from(tgkLabels)
        .where(and(
          eq(tgkLabels.productId, body.productId),
          eq(tgkLabels.productType, body.productType),
          eq(tgkLabels.isActive, true),
        ))
        .orderBy(sql`${tgkLabels.version} DESC`)
        .limit(1);
      
      if (existing.length > 0) {
        body.version = (existing[0].version || 1) + 1;
        // Eski versiyonu pasif yap
        await db.update(tgkLabels)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(tgkLabels.id, existing[0].id));
      }
    }

    const [created] = await db.insert(tgkLabels).values(body).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('/api/recipe-label/save error:', error);
    res.status(500).json({ message: 'Etiket kaydedilemedi', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4) GET /api/recipe-label/gap-analysis — Üretim ↔ Hammadde gap raporu
// ═══════════════════════════════════════════════════════════════════
// Hangi ürünlerin etiketi tam çıkıyor, hangileri eksik?
// ═══════════════════════════════════════════════════════════════════

router.get('/api/recipe-label/gap-analysis', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canRead(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    // Tüm aktif branch ürünleri
    const products = await db.select({
      id: branchProducts.id,
      name: branchProducts.name,
      category: branchProducts.category,
    })
      .from(branchProducts)
      .where(eq(branchProducts.isActive, true))
      .limit(100);

    const results: any[] = [];
    let fullyMatched = 0, partial = 0, noRecipe = 0, missingMaterials = 0;

    for (const p of products) {
      const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.productId, p.id)).limit(1);
      if (!recipe) {
        results.push({
          productId: p.id,
          productName: p.name,
          status: 'no_recipe',
          missingIngredients: [],
        });
        noRecipe++;
        continue;
      }

      const ings = await db.select().from(branchRecipeIngredients)
        .where(eq(branchRecipeIngredients.recipeId, recipe.id));
      
      const missing: string[] = [];
      let matchCount = 0;
      
      for (const ing of ings) {
        const match = await smartMatchIngredient(ing.ingredientName);
        if (match && match.matchScore >= 0.7) matchCount++;
        else missing.push(ing.ingredientName);
      }

      const status = ings.length === 0 ? 'no_ingredients' :
                     matchCount === ings.length ? 'fully_matched' :
                     matchCount === 0 ? 'no_match' : 'partial';
      
      if (status === 'fully_matched') fullyMatched++;
      else if (status === 'partial') partial++;
      else if (status === 'no_match') missingMaterials++;

      results.push({
        productId: p.id,
        productName: p.name,
        category: p.category,
        status,
        totalIngredients: ings.length,
        matchedCount: matchCount,
        missingIngredients: missing,
      });
    }

    res.json({
      summary: {
        totalProducts: products.length,
        fullyMatched,
        partial,
        noRecipe,
        missingMaterials,
        readinessPercent: products.length > 0 ? ((fullyMatched / products.length) * 100).toFixed(1) : '0',
      },
      products: results,
    });
  } catch (error: unknown) {
    console.error('/api/recipe-label/gap-analysis error:', error);
    res.status(500).json({ message: 'Gap analizi başarısız' });
  }
});

export default router;
