/**
 * Fabrika Reçete Yönetim Sistemi API
 * Şubelerden tamamen bağımsız — fabrika rolleri kontrol eder
 * Keyblend: admin + recete_gm only
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  factoryRecipes, factoryRecipeIngredients, factoryRecipeIngredientSnapshots,
  factoryRecipeSteps, factoryRecipeStepSnapshots,
  factoryKeyblends, factoryKeyblendIngredients,
  factoryProductionLogs, factoryRecipeVersions,
  factoryRecipeCategoryAccess, factoryIngredientNutrition, factoryIngredientNutritionHistory,
  factoryRecipeApprovals, insertFactoryRecipeApprovalSchema,
  inventory, users,
} from "@shared/schema";
import { eq, and, desc, sql, isNull, asc, inArray } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { canonicalIngredientName, INGREDIENT_ALIASES } from "@shared/lib/ingredient-canonical";

const router = Router();

// Task #131: Reçete malzeme insert/update'lerinde isim alanını
// kanonik forma normalize et (yazım/kasa duplicate'ları engellenir)
function normalizeIngredientPayload<T extends { name?: string | null }>(payload: T): T {
  if (payload && typeof payload.name === "string") {
    return { ...payload, name: canonicalIngredientName(payload.name) };
  }
  return payload;
}

// ── Role Guards ──
const RECIPE_ADMIN_ROLES = ["admin", "recete_gm"];
const RECIPE_EDIT_ROLES = ["admin", "recete_gm", "sef"];
// Task #184: Besin değer / alerjen düzenleme yalnızca gıda mühendisi + reçete
// yönetimi (recete_gm) + admin yetkisindedir. Şef reçete değiştirebilir ama
// besin değer tablosunu (factory_ingredient_nutrition) güncelleyemez.
const NUTRITION_EDIT_ROLES = ["admin", "gida_muhendisi", "recete_gm"];
const RECIPE_VIEW_ROLES = ["admin", "recete_gm", "gida_muhendisi", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "uretim_sefi"];
const KEYBLEND_ROLES = ["admin", "recete_gm"]; // Keyblend içerik = en gizli
const PRODUCTION_ROLES = ["admin", "recete_gm", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "uretim_sefi"];
const GRAMMAGE_APPROVE_ROLES = ["admin", "recete_gm", "gida_muhendisi"];

function isFactoryRole(role: string): boolean {
  return RECIPE_VIEW_ROLES.includes(role);
}

// Task #163: change_log'tan Sema gramaj onayını parse et
// Pattern: "[YYYY-MM-DD ... Sema/{userId}] Üretim formülü ile karşılaştırma: ONAYLANDI"
export function parseGrammageApproval(changeLog: string | null | undefined):
  { approved: boolean; date: string | null; userId: string | null; note: string | null } {
  if (!changeLog) return { approved: false, date: null, userId: null, note: null };
  const re = /\[(\d{4}-\d{2}-\d{2})[^\]]*?Sema\/([^\]\s]+)\][^\n]*?Üretim formülü ile karşılaştırma:\s*ONAYLANDI\.?\s*([^\n]*)/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(changeLog)) !== null) last = m;
  if (!last) return { approved: false, date: null, userId: null, note: null };
  return { approved: true, date: last[1], userId: last[2], note: (last[3] || "").trim() || null };
}

// Task #173: Reçete onayında değişiklik öncesi/sonrası gramaj farkı
// Son grammage_approval snapshot'ını bul (factory_recipe_versions üzerinden)
const GRAMMAGE_APPROVAL_PREFIX = "[grammage_approval]";

async function getLastApprovalSnapshot(recipeId: number) {
  const [row] = await db.select()
    .from(factoryRecipeVersions)
    .where(and(
      eq(factoryRecipeVersions.recipeId, recipeId),
      sql`${factoryRecipeVersions.changeDescription} LIKE ${GRAMMAGE_APPROVAL_PREFIX + "%"}`,
    ))
    .orderBy(desc(factoryRecipeVersions.versionNumber))
    .limit(1);
  return row || null;
}

type IngredientSnapshotRow = {
  refId?: string | null;
  name?: string | null;
  amount?: string | number | null;
  unit?: string | null;
};
type StepSnapshotRow = {
  stepNumber?: number | null;
  title?: string | null;
  content?: string | null;
};

function parseSnapshotArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

type DiffIngredient = {
  refId: string | null;
  name: string;
  oldName?: string | null;
  oldAmount: number | null;
  newAmount: number | null;
  oldUnit: string | null;
  newUnit: string | null;
  deltaPct: number | null;
  kind: "changed" | "added" | "removed";
};

export function computeIngredientDiff(
  baseline: any[] | null | undefined,
  current: any[] | null | undefined,
): { changed: DiffIngredient[]; added: DiffIngredient[]; removed: DiffIngredient[] } {
  const keyOf = (x: any) => String(x?.refId ?? x?.name ?? "");
  const baseMap = new Map<string, any>();
  for (const b of baseline || []) baseMap.set(keyOf(b), b);
  const curMap = new Map<string, any>();
  for (const c of current || []) curMap.set(keyOf(c), c);

  const changed: DiffIngredient[] = [];
  const added: DiffIngredient[] = [];
  const removed: DiffIngredient[] = [];

  for (const [k, c] of curMap) {
    const b = baseMap.get(k);
    const newAmt = Number(c.amount);
    if (!b) {
      added.push({
        refId: c.refId ?? null, name: c.name,
        oldAmount: null, newAmount: Number.isFinite(newAmt) ? newAmt : null,
        oldUnit: null, newUnit: c.unit ?? null,
        deltaPct: null, kind: "added",
      });
    } else {
      const oldAmt = Number(b.amount);
      const unitChanged = (b.unit ?? null) !== (c.unit ?? null);
      const nameChanged = (b.name ?? "") !== (c.name ?? "");
      const amountChanged = Number.isFinite(oldAmt) && Number.isFinite(newAmt) && oldAmt !== newAmt;
      if (amountChanged || unitChanged || nameChanged) {
        const deltaPct = oldAmt > 0 && Number.isFinite(newAmt)
          ? Math.round(((newAmt - oldAmt) / oldAmt) * 1000) / 10
          : null;
        changed.push({
          refId: c.refId ?? null, name: c.name, oldName: nameChanged ? b.name : null,
          oldAmount: Number.isFinite(oldAmt) ? oldAmt : null,
          newAmount: Number.isFinite(newAmt) ? newAmt : null,
          oldUnit: b.unit ?? null, newUnit: c.unit ?? null,
          deltaPct, kind: "changed",
        });
      }
    }
  }
  for (const [k, b] of baseMap) {
    if (!curMap.has(k)) {
      const oldAmt = Number(b.amount);
      removed.push({
        refId: b.refId ?? null, name: b.name,
        oldAmount: Number.isFinite(oldAmt) ? oldAmt : null, newAmount: null,
        oldUnit: b.unit ?? null, newUnit: null,
        deltaPct: null, kind: "removed",
      });
    }
  }
  return { changed, added, removed };
}

function stepsAreEqual(baseline: any[] | null | undefined, current: any[] | null | undefined): boolean {
  const norm = (arr: any[] | null | undefined) => (arr || []).map(s => ({
    n: s.stepNumber, t: s.title || "", c: s.content || "",
  })).sort((a, b) => a.n - b.n);
  return JSON.stringify(norm(baseline)) === JSON.stringify(norm(current));
}

// ═══════════════════════════════════════
// REÇETELER — CRUD
// ═══════════════════════════════════════

// GET /api/factory/recipes — Reçete listesi
router.get("/api/factory/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    const { category, outputType, approvalStatus } = req.query;
    const conditions: any[] = [eq(factoryRecipes.isActive, true)];

    // Task #164: Onaylı/Onaysız filtresi (gramaj scope üzerinden)
    // Task #180: invalidated_at IS NULL → onay hâlâ geçerli sayılır
    if (approvalStatus === "unapproved") {
      conditions.push(sql`NOT EXISTS (
        SELECT 1 FROM factory_recipe_approvals fra
        WHERE fra.recipe_id = ${factoryRecipes.id}
          AND fra.scope = 'gramaj'
          AND fra.invalidated_at IS NULL
      )`);
    } else if (approvalStatus === "approved") {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM factory_recipe_approvals fra
        WHERE fra.recipe_id = ${factoryRecipes.id}
          AND fra.scope = 'gramaj'
          AND fra.invalidated_at IS NULL
      )`);
    }

    // Şef kategori kısıtlaması
    if (req.user.role === "sef") {
      const access = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(eq(factoryRecipeCategoryAccess.role, "sef"), eq(factoryRecipeCategoryAccess.canView, true)));
      const allowedCategories = access.map(a => a.category);
      if (allowedCategories.length > 0) {
        conditions.push(sql`${factoryRecipes.category} IN (${sql.join(allowedCategories.map(c => sql`${c}`), sql`, `)})`);
      } else {
        return res.json([]); // Hiçbir kategoriye erişimi yok
      }
    }

    // Gizli reçeteler sadece admin + recete_gm görür
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      conditions.push(eq(factoryRecipes.isVisible, true));
    }

    if (category) conditions.push(eq(factoryRecipes.category, String(category)));
    if (outputType) conditions.push(eq(factoryRecipes.outputType, String(outputType)));

    const recipes = await db.select()
      .from(factoryRecipes)
      .where(and(...conditions))
      .orderBy(asc(factoryRecipes.category), asc(factoryRecipes.name));

    // Task #164: gramaj onay durumunu liste yanıtına ekle
    let approvedIds = new Set<number>();
    if (recipes.length > 0) {
      const ids = recipes.map(r => r.id);
      const approvals = await db.select({ recipeId: factoryRecipeApprovals.recipeId })
        .from(factoryRecipeApprovals)
        .where(and(
          inArray(factoryRecipeApprovals.recipeId, ids),
          eq(factoryRecipeApprovals.scope, "gramaj"),
          // Task #180: invalidatedAt set olan onaylar artık geçerli sayılmaz
          isNull(factoryRecipeApprovals.invalidatedAt),
        ));
      approvedIds = new Set(approvals.map(a => a.recipeId));
    }

    res.json(recipes.map(r => ({ ...r, gramajApproved: approvedIds.has(r.id) })));
  } catch (error) {
    console.error("Factory recipes list error:", error);
    res.status(500).json({ error: "Reçeteler yüklenemedi" });
  }
});

// GET /api/factory/recipes/:id — Reçete detay (malzeme + adım)
router.get("/api/factory/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    const id = Number(req.params.id);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Şef kategori kontrolü
    if (req.user.role === "sef" && recipe.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, recipe.category),
          eq(factoryRecipeCategoryAccess.canView, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoriye erişiminiz yok" });
    }

    // Malzemeler — inventory bilgisi ile birlikte
    const ingredientRows = await db.select({
      ing: factoryRecipeIngredients,
      invCode: inventory.code,
      invName: inventory.name,
      invUnit: inventory.unit,
      invMarketPrice: inventory.marketPrice,
      invConversionFactor: inventory.conversionFactor,
    }).from(factoryRecipeIngredients)
      .leftJoin(inventory, eq(factoryRecipeIngredients.rawMaterialId, inventory.id))
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const COST_VIEW_ROLES = ["admin", "ceo", "recete_gm", "gida_muhendisi", "satinalma"];
    const canViewCost = COST_VIEW_ROLES.includes(req.user.role);

    const safeIngredients = ingredientRows.map(row => {
      const ing = row.ing;
      const base: any = {
        ...ing,
        inventoryCode: row.invCode || null,
        inventoryName: row.invName || null,
        linked: !!row.invCode,
      };
      if (canViewCost) {
        const price = Number(row.invMarketPrice || 0);
        const conv = Number(row.invConversionFactor || 1000);
        const amount = Number(ing.amount || 0);
        const pricePerUnit = conv > 0 ? price / conv : 0;
        base.unitPrice = pricePerUnit;
        base.lineCost = amount * pricePerUnit;
        base.hasPrice = price > 0;
      }
      if (ing.ingredientType === "keyblend" && !KEYBLEND_ROLES.includes(req.user.role)) {
        base.notes = null;
      }
      return base;
    });

    // Adımlar
    const steps = await db.select().from(factoryRecipeSteps)
      .where(eq(factoryRecipeSteps.recipeId, id))
      .orderBy(asc(factoryRecipeSteps.stepNumber));

    // Türev reçeteler (yarı mamül ise)
    let childRecipes: any[] = [];
    if (recipe.outputType === "yari_mamul") {
      childRecipes = await db.select({
        id: factoryRecipes.id,
        name: factoryRecipes.name,
        code: factoryRecipes.code,
        coverPhotoUrl: factoryRecipes.coverPhotoUrl,
      }).from(factoryRecipes)
        .where(and(eq(factoryRecipes.parentRecipeId, id), eq(factoryRecipes.isActive, true)));
    }

    const INGREDIENT_EDIT_ROLES = ["admin", "ceo", "gida_muhendisi"];
    const PRICE_EDIT_ROLES = ["admin", "ceo", "satinalma"];

    // Task #163: Sema gramaj onay durumu
    const approval = parseGrammageApproval(recipe.changeLog);
    let approvedByName: string | null = null;
    if (approval.userId) {
      const [u] = await db.select({
        firstName: users.firstName, lastName: users.lastName, username: users.username, id: users.id,
      }).from(users).where(eq(users.id, approval.userId)).limit(1);
      if (u) approvedByName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.id;
    }

    // Task #173: Son onaydan beri değişen malzemeler
    const lastApprovalSnap = await getLastApprovalSnapshot(id);
    const baselineIngredients = parseSnapshotArray<IngredientSnapshotRow>(lastApprovalSnap?.ingredientsSnapshot);
    const baselineSteps = parseSnapshotArray<StepSnapshotRow>(lastApprovalSnap?.stepsSnapshot);
    const diff = computeIngredientDiff(baselineIngredients, ingredientRows.map(r => r.ing));
    const totalChanges = diff.changed.length + diff.added.length + diff.removed.length;
    const stepsChanged = lastApprovalSnap ? !stepsAreEqual(baselineSteps, steps) : false;
    const hasChangesAfterApproval = !!lastApprovalSnap && (totalChanges > 0 || stepsChanged);

    res.json({
      ...recipe,
      ingredients: safeIngredients,
      steps,
      childRecipes,
      canViewCost,
      canEditIngredients: INGREDIENT_EDIT_ROLES.includes(req.user.role),
      canEditPrices: PRICE_EDIT_ROLES.includes(req.user.role),
      grammageApproval: {
        approved: approval.approved,
        date: approval.date,
        userId: approval.userId,
        userName: approvedByName,
        note: approval.note,
        canApprove: GRAMMAGE_APPROVE_ROLES.includes(req.user.role),
      },
      ingredientChangesSinceApproval: {
        hasBaseline: !!lastApprovalSnap,
        baselineDate: lastApprovalSnap?.createdAt ?? null,
        baselineVersionNumber: lastApprovalSnap?.versionNumber ?? null,
        changed: diff.changed,
        added: diff.added,
        removed: diff.removed,
        totalChanges,
        stepsChanged,
        hasChangesAfterApproval,
      },
    });
  } catch (error) {
    console.error("Factory recipe detail error:", error);
    res.status(500).json({ error: "Reçete detayı yüklenemedi" });
  }
});

// POST /api/factory/recipes — Yeni reçete oluştur
router.post("/api/factory/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Reçete oluşturma yetkiniz yok" });
    }

    // Şef kategori kontrolü
    if (req.user.role === "sef" && req.body.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, req.body.category),
          eq(factoryRecipeCategoryAccess.canCreate, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoride reçete oluşturma yetkiniz yok" });
    }

    const [created] = await db.insert(factoryRecipes).values({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }).returning();

    res.json(created);
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Bu kodla reçete zaten var" });
    console.error("Create factory recipe error:", error);
    res.status(500).json({ error: "Reçete oluşturulamadı" });
  }
});

// PATCH /api/factory/recipes/:id — Reçete güncelle
router.patch("/api/factory/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok" });
    }

    const id = Number(req.params.id);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Kilitli reçete kontrolü
    if (recipe.editLocked && !RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu reçete kilitli. Sadece Reçete GM veya Admin düzenleyebilir." });
    }

    // Şef kategori kontrolü
    if (req.user.role === "sef" && recipe.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, recipe.category),
          eq(factoryRecipeCategoryAccess.canEdit, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoride düzenleme yetkiniz yok" });
    }

    // ── Otomatik versiyon snapshot (düzenlemeden ÖNCE) ──
    const { changeDescription, skipVersion, ...updateFields } = req.body;
    let newVersionNumber: number | null = null;

    if (!skipVersion) {
      // Mevcut malzeme + adımları snapshot al
      const currentIngredients = await db.select().from(factoryRecipeIngredients)
        .where(eq(factoryRecipeIngredients.recipeId, id))
        .orderBy(asc(factoryRecipeIngredients.sortOrder));
      const currentSteps = await db.select().from(factoryRecipeSteps)
        .where(eq(factoryRecipeSteps.recipeId, id))
        .orderBy(asc(factoryRecipeSteps.stepNumber));

      // Son versiyon numarasını bul
      const [lastVersion] = await db.select({ vn: factoryRecipeVersions.versionNumber })
        .from(factoryRecipeVersions)
        .where(eq(factoryRecipeVersions.recipeId, id))
        .orderBy(desc(factoryRecipeVersions.versionNumber))
        .limit(1);

      newVersionNumber = (lastVersion?.vn || recipe.version || 0) + 1;

      // Maliyet snapshot
      const costSnapshot = {
        rawMaterialCost: Number(recipe.rawMaterialCost || 0),
        laborCost: Number(recipe.laborCost || 0),
        energyCost: Number(recipe.energyCost || 0),
        totalBatchCost: Number(recipe.totalBatchCost || 0),
        unitCost: Number(recipe.unitCost || 0),
      };

      // Versiyon oluştur
      await db.insert(factoryRecipeVersions).values({
        recipeId: id,
        versionNumber: newVersionNumber,
        ingredientsSnapshot: currentIngredients,
        stepsSnapshot: currentSteps,
        costSnapshot,
        changedBy: req.user.id,
        changeDescription: changeDescription || `v${newVersionNumber} — ${req.user.role} tarafından güncellendi`,
        status: RECIPE_ADMIN_ROLES.includes(req.user.role) ? "approved" : "pending",
        ...(RECIPE_ADMIN_ROLES.includes(req.user.role) ? { approvedBy: req.user.id, approvedAt: new Date() } : {}),
      });
    }

    // ── Güncellemeyi uygula ──
    const setData: Record<string, any> = {
      ...updateFields,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    };
    if (newVersionNumber) setData.version = newVersionNumber;

    const [updated] = await db.update(factoryRecipes)
      .set(setData)
      .where(eq(factoryRecipes.id, id))
      .returning();

    res.json({ ...updated, versionCreated: newVersionNumber });
  } catch (error) {
    console.error("Update factory recipe error:", error);
    res.status(500).json({ error: "Reçete güncellenemedi" });
  }
});

// POST /api/factory/recipes/:id/approve-grammage — Sema gramaj onayı (Task #163)
// Tek tıkla change_log'a "[YYYY-MM-DD - Sema/{userId}] ... ONAYLANDI" satırı ekler.
// İdempotent — aynı kullanıcı aynı gün tekrar onaylasa da yeni satır eklenmez.
router.post("/api/factory/recipes/:id/approve-grammage", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!GRAMMAGE_APPROVE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Gramaj onay yetkisi sadece Gıda Mühendisi, Reçete GM ve Admin için" });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Geçersiz reçete id" });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    const note: string = (req.body?.note || "").toString().trim().slice(0, 500);
    const today = new Date().toISOString().slice(0, 10);
    const userId = req.user.id;

    // Task #173: Onay anında "son onaydan beri" diff sayısını hesapla
    const currentIngredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));
    const currentSteps = await db.select().from(factoryRecipeSteps)
      .where(eq(factoryRecipeSteps.recipeId, id))
      .orderBy(asc(factoryRecipeSteps.stepNumber));
    const lastSnap = await getLastApprovalSnapshot(id);
    const baselineIngs = parseSnapshotArray<IngredientSnapshotRow>(lastSnap?.ingredientsSnapshot);
    const baselineStepsSnap = parseSnapshotArray<StepSnapshotRow>(lastSnap?.stepsSnapshot);
    // İlk onayda baseline yoktur → değişiklik sayısı 0 (ilk onay olarak işaretlenir)
    const diff = lastSnap
      ? computeIngredientDiff(baselineIngs, currentIngredients)
      : { changed: [], added: [], removed: [] };
    const reviewedCount = diff.changed.length + diff.added.length + diff.removed.length;
    const stepsChangedSinceApproval = lastSnap ? !stepsAreEqual(baselineStepsSnap, currentSteps) : false;
    const reviewedSuffix = lastSnap
      ? ` ${reviewedCount} malzeme değişikliği gözden geçirildi.` +
        (stepsChangedSinceApproval ? " Üretim adımları güncellendi." : "")
      : " İlk onay (baseline oluşturuldu).";

    const newLine = `[${today} - Sema/${userId}] Üretim formülü ile karşılaştırma: ONAYLANDI.${reviewedSuffix}${note ? " " + note : ""}`;

    // İdempotency: aynı gün/aynı user için onay satırı varsa VE son onaydan
    // beri ne malzeme ne de adım değişikliği yoksa tekrar ekleme. Aksi halde
    // Sema bilinçli olarak tekrar onaylıyor → yeni onay satırı + snapshot.
    const existing = recipe.changeLog || "";
    const dupRe = new RegExp(`\\[${today}[^\\]]*?Sema\\/${userId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\][^\\n]*?ONAYLANDI`);
    if (dupRe.test(existing) && reviewedCount === 0 && !stepsChangedSinceApproval) {
      const approval = parseGrammageApproval(existing);
      return res.json({ ok: true, alreadyApproved: true, grammageApproval: approval, reviewedCount: 0 });
    }

    const newLog = existing ? `${existing}\n${newLine}` : newLine;

    // Task #173: Onaylanan durumu factory_recipe_versions'a snapshot olarak yaz
    const [lastVersion] = await db.select({ vn: factoryRecipeVersions.versionNumber })
      .from(factoryRecipeVersions)
      .where(eq(factoryRecipeVersions.recipeId, id))
      .orderBy(desc(factoryRecipeVersions.versionNumber))
      .limit(1);
    const newVersionNumber = (lastVersion?.vn || recipe.version || 0) + 1;
    const costSnapshot = {
      rawMaterialCost: Number(recipe.rawMaterialCost || 0),
      laborCost: Number(recipe.laborCost || 0),
      energyCost: Number(recipe.energyCost || 0),
      totalBatchCost: Number(recipe.totalBatchCost || 0),
      unitCost: Number(recipe.unitCost || 0),
    };
    await db.insert(factoryRecipeVersions).values({
      recipeId: id,
      versionNumber: newVersionNumber,
      ingredientsSnapshot: currentIngredients,
      stepsSnapshot: currentSteps,
      costSnapshot,
      changedBy: userId,
      changeDescription: `${GRAMMAGE_APPROVAL_PREFIX} ${reviewedCount} malzeme değişikliği gözden geçirildi (Sema onayı)`,
      changeDiff: { changed: diff.changed, added: diff.added, removed: diff.removed },
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    });

    const [updated] = await db.update(factoryRecipes)
      .set({ changeLog: newLog, version: newVersionNumber, updatedBy: userId, updatedAt: new Date() })
      .where(eq(factoryRecipes.id, id))
      .returning();

    const approval = parseGrammageApproval(updated.changeLog);
    res.json({ ok: true, grammageApproval: approval, reviewedCount, baselineExisted: !!lastSnap });
  } catch (error) {
    console.error("Grammage approve error:", error);
    res.status(500).json({ error: "Gramaj onayı kaydedilemedi" });
  }
});

// POST /api/factory/recipes/:id/lock — Reçete kilitle/aç (sadece admin+recete_gm)
router.post("/api/factory/recipes/:id/lock", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Sadece Reçete GM veya Admin reçete kilitleyebilir" });
    }

    const id = Number(req.params.id);
    const { lock, reason } = req.body; // lock: true/false

    const [updated] = await db.update(factoryRecipes)
      .set({
        editLocked: lock,
        lockedBy: lock ? req.user.id : null,
        lockedAt: lock ? new Date() : null,
        lockReason: lock ? (reason || null) : null,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      })
      .where(eq(factoryRecipes.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Lock recipe error:", error);
    res.status(500).json({ error: "Kilit işlemi başarısız" });
  }
});

// ═══════════════════════════════════════
// KANONİK MALZEME İSİM LİSTESİ (auto-complete)
// ═══════════════════════════════════════

// GET /api/factory/ingredient-names — Sıralı kanonik malzeme isim listesi
// Frontend reçete editöründeki Combobox'ı besler. Kullanıcı yeni isim
// girerse uyarı gösterilebilir; nutrition tablosunda karşılığı yok demektir.
router.get("/api/factory/ingredient-names", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    // 1) Kanonik kaynak: factory_ingredient_nutrition.ingredient_name
    const nutritionRows = await db.select({ name: factoryIngredientNutrition.ingredientName })
      .from(factoryIngredientNutrition)
      .orderBy(asc(factoryIngredientNutrition.ingredientName));

    // 2) Reçetelerde kullanılmış ama nutrition'da olmayan isimler de listeye
    //    eklensin (yine de seçilebilsin), ama "hasNutrition: false" işaretiyle.
    const ingredientRows = await db.selectDistinct({ name: factoryRecipeIngredients.name })
      .from(factoryRecipeIngredients);

    const nutritionSet = new Set(
      nutritionRows.map(r => canonicalIngredientName(r.name || "")).filter(Boolean)
    );

    const merged = new Map<string, { name: string; hasNutrition: boolean }>();
    for (const r of nutritionRows) {
      const n = canonicalIngredientName(r.name || "");
      if (!n) continue;
      merged.set(n, { name: n, hasNutrition: true });
    }
    for (const r of ingredientRows) {
      const n = canonicalIngredientName(r.name || "");
      if (!n) continue;
      if (!merged.has(n)) {
        merged.set(n, { name: n, hasNutrition: nutritionSet.has(n) });
      }
    }

    const list = Array.from(merged.values())
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    res.json(list);
  } catch (error) {
    console.error("Ingredient names list error:", error);
    res.status(500).json({ error: "Malzeme isim listesi yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// MALZEME BESİN DEĞERLERİ (Task #165)
// ═══════════════════════════════════════

// GET /api/factory/ingredient-nutrition/:name — İsim bazlı besin/alerjen kaydı
// Reçete editöründe onay diyalogu açıldığında mevcut kaydı önyüklemek için.
router.get("/api/factory/ingredient-nutrition/:name", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });
    // Express params zaten URL-decode edilmiş halde gelir; ekstra decode
    // "%" içeren isimlerde URIError'a yol açabilir.
    const canonical = canonicalIngredientName(req.params.name || "");
    if (!canonical) return res.json(null);
    const [row] = await db.select().from(factoryIngredientNutrition)
      .where(eq(factoryIngredientNutrition.ingredientName, canonical))
      .limit(1);
    res.json(row || null);
  } catch (error) {
    console.error("Get ingredient nutrition error:", error);
    res.status(500).json({ error: "Besin değer kaydı yüklenemedi" });
  }
});

// PUT /api/factory/ingredient-nutrition/:name — Sadece besin/alerjen güncelle
// Recete malzemesi eklemeden mevcut bir kaydı düzenlemek için (yazım hatası
// vb. düzeltmeler). Upsert davranışı: kayıt yoksa oluşturur.
router.put("/api/factory/ingredient-nutrition/:name", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!NUTRITION_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Besin değer düzenleme yetkiniz yok (gıda mühendisi gerekli)" });
    }
    const canonical = canonicalIngredientName(req.params.name || "");
    if (!canonical) return res.status(400).json({ error: "Geçersiz isim" });

    const body = (req.body || {}) as {
      energyKcal?: string | number | null; fatG?: string | number | null;
      saturatedFatG?: string | number | null; carbohydrateG?: string | number | null;
      sugarG?: string | number | null; proteinG?: string | number | null;
      saltG?: string | number | null; allergens?: string[];
    };
    const toNum = (v: string | number | null | undefined): string | null =>
      v === "" || v == null || isNaN(Number(v)) ? null : String(Number(v));
    const nutValues = {
      energyKcal: toNum(body.energyKcal),
      fatG: toNum(body.fatG),
      saturatedFatG: toNum(body.saturatedFatG),
      carbohydrateG: toNum(body.carbohydrateG),
      sugarG: toNum(body.sugarG),
      proteinG: toNum(body.proteinG),
      saltG: toNum(body.saltG),
      allergens: Array.isArray(body.allergens) ? body.allergens : [],
    };
    const row = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(factoryIngredientNutrition)
        .where(eq(factoryIngredientNutrition.ingredientName, canonical)).limit(1);
      const [upserted] = await tx.insert(factoryIngredientNutrition).values({
        ingredientName: canonical,
        ...nutValues,
        source: "manual",
        verifiedBy: req.user.id,
      }).onConflictDoUpdate({
        target: factoryIngredientNutrition.ingredientName,
        set: {
          ...nutValues,
          source: "manual",
          verifiedBy: req.user.id,
          updatedAt: new Date(),
        },
      }).returning();

      // Task #183 — denetim defterine kayıt
      await tx.insert(factoryIngredientNutritionHistory).values({
        nutritionId: upserted.id,
        ingredientName: canonical,
        action: existing ? "update" : "create",
        source: "nutrition_put",
        before: existing ? {
          energyKcal: existing.energyKcal, fatG: existing.fatG,
          saturatedFatG: existing.saturatedFatG, transFatG: existing.transFatG,
          carbohydrateG: existing.carbohydrateG, sugarG: existing.sugarG,
          fiberG: existing.fiberG, proteinG: existing.proteinG,
          saltG: existing.saltG, sodiumMg: existing.sodiumMg,
          allergens: existing.allergens, source: existing.source,
          confidence: existing.confidence, verifiedBy: existing.verifiedBy,
        } : null,
        after: {
          energyKcal: upserted.energyKcal, fatG: upserted.fatG,
          saturatedFatG: upserted.saturatedFatG, transFatG: upserted.transFatG,
          carbohydrateG: upserted.carbohydrateG, sugarG: upserted.sugarG,
          fiberG: upserted.fiberG, proteinG: upserted.proteinG,
          saltG: upserted.saltG, sodiumMg: upserted.sodiumMg,
          allergens: upserted.allergens, source: upserted.source,
          confidence: upserted.confidence, verifiedBy: upserted.verifiedBy,
        },
        changedBy: req.user.id,
        changedByRole: req.user.role ?? null,
      });

      return upserted;
    });
    res.json(row);
  } catch (error) {
    console.error("Upsert ingredient nutrition error:", error);
    res.status(500).json({ error: "Besin değer kaydı güncellenemedi" });
  }
});

// GET /api/factory/ingredient-nutrition/:name/history — Besin değer değişim geçmişi
// Task #185: Audit log — kim, ne zaman, neyi değiştirdi izlenebilsin.
router.get("/api/factory/ingredient-nutrition/:name/history", isAuthenticated, async (req: any, res: Response) => {
  try {
    const VIEW_HISTORY_ROLES = [...NUTRITION_EDIT_ROLES, ...RECIPE_VIEW_ROLES];
    if (!VIEW_HISTORY_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }
    const canonical = canonicalIngredientName(req.params.name || "");
    if (!canonical) return res.status(400).json({ error: "Geçersiz isim" });

    const rows = await db.select({
      id: factoryIngredientNutritionHistory.id,
      action: factoryIngredientNutritionHistory.action,
      source: factoryIngredientNutritionHistory.source,
      before: factoryIngredientNutritionHistory.before,
      after: factoryIngredientNutritionHistory.after,
      changedBy: factoryIngredientNutritionHistory.changedBy,
      changedByRole: factoryIngredientNutritionHistory.changedByRole,
      changedAt: factoryIngredientNutritionHistory.changedAt,
      note: factoryIngredientNutritionHistory.note,
      changedByName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`,
    })
      .from(factoryIngredientNutritionHistory)
      .leftJoin(users, eq(users.id, factoryIngredientNutritionHistory.changedBy))
      .where(eq(factoryIngredientNutritionHistory.ingredientName, canonical))
      .orderBy(desc(factoryIngredientNutritionHistory.changedAt))
      .limit(100);

    res.json(rows);
  } catch (error) {
    console.error("Get nutrition history error:", error);
    res.status(500).json({ error: "Geçmiş kayıtları yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// MALZEMELER — CRUD
// ═══════════════════════════════════════

// Task #180: Reçete malzemesi/gramajı değiştiğinde gramaj onaylarını geçersiz say.
// Halihazırda invalidated_at NULL olan satırları toplu işaretler. Tarihsel kayıt
// için satırlar silinmez; yalnızca invalidated_at + invalidated_reason atanır.
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function invalidateGrammageApprovals(
  recipeId: number,
  reason: string,
  tx?: DbOrTx,
): Promise<void> {
  const exec = tx ?? db;
  await exec.update(factoryRecipeApprovals)
    .set({ invalidatedAt: new Date(), invalidatedReason: reason })
    .where(and(
      eq(factoryRecipeApprovals.recipeId, recipeId),
      eq(factoryRecipeApprovals.scope, "gramaj"),
      isNull(factoryRecipeApprovals.invalidatedAt),
    ));
}

// PATCH /api/factory/recipes/:recipeId/ingredients/:id — Malzeme düzenle
router.patch("/api/factory/recipes/:recipeId/ingredients/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const INGREDIENT_EDIT_ROLES = ["admin", "ceo", "gida_muhendisi"];
    if (!INGREDIENT_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const ingredientId = Number(req.params.id);
    const recipeId = Number(req.params.recipeId);
    if (!Number.isFinite(ingredientId) || !Number.isFinite(recipeId)) {
      return res.status(400).json({ error: "Geçersiz id" });
    }
    const { name, amount, unit, rawMaterialId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = canonicalIngredientName(name);
    if (amount !== undefined) updateData.amount = String(amount);
    if (unit !== undefined) updateData.unit = unit;
    if (rawMaterialId !== undefined) updateData.rawMaterialId = rawMaterialId;

    // Task #180: gramaj/malzeme değişikliği → mevcut gramaj onayları geçersiz
    const grammageAffected =
      amount !== undefined ||
      unit !== undefined ||
      name !== undefined ||
      rawMaterialId !== undefined;

    const updated = await db.transaction(async (tx) => {
      // PATCH yalnızca path'teki recipeId'ye ait satırı günceller — başka
      // bir reçetenin malzemesi yanlışlıkla burada düzenlenip onayı
      // geçersizleştirilemesin.
      const [row] = await tx.update(factoryRecipeIngredients)
        .set(updateData)
        .where(and(
          eq(factoryRecipeIngredients.id, ingredientId),
          eq(factoryRecipeIngredients.recipeId, recipeId),
        ))
        .returning();
      if (!row) return null;
      if (grammageAffected) {
        await invalidateGrammageApprovals(row.recipeId, "ingredient_patch", tx);
      }
      return row;
    });

    if (!updated) return res.status(404).json({ error: "Malzeme bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Update ingredient error:", error);
    res.status(500).json({ error: "Malzeme güncellenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients — Malzeme ekle
// Task #152: Body'de opsiyonel `nutrition` alanı varsa, aynı transaksiyon
// içinde factory_ingredient_nutrition tablosuna da kayıt eklenir
// (ingredient_name unique olduğu için onConflictDoNothing — mevcut veriyi ezmeyiz).
router.post("/api/factory/recipes/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    type NutritionPayload = {
      energyKcal?: string | number | null;
      fatG?: string | number | null;
      saturatedFatG?: string | number | null;
      carbohydrateG?: string | number | null;
      sugarG?: string | number | null;
      proteinG?: string | number | null;
      saltG?: string | number | null;
      allergens?: string[];
    };

    const recipeId = Number(req.params.id);
    const body = (req.body || {}) as { nutrition?: NutritionPayload } & Record<string, unknown> & { name?: string | null };
    const { nutrition, ...ingredientPayload } = body;
    const normalized = normalizeIngredientPayload(ingredientPayload);

    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(factoryRecipeIngredients)
        .values({ ...normalized, recipeId })
        .returning();

      // Task #180: yeni malzeme eklenmesi gramaj formülünü değiştirir →
      // mevcut gramaj onayları geçersiz sayılır.
      await invalidateGrammageApprovals(recipeId, "ingredient_post", tx);

      // Opsiyonel besin değer + alerjen kaydı (yeni kanonik dışı malzemeler için)
      // Task #184: Sadece NUTRITION_EDIT_ROLES (admin/gida_muhendisi/recete_gm)
      // bu bloğu çalıştırabilir; sef rolü malzemeyi ekler ama nutrition payload'u
      // sessizce yok sayılır (mevcut besin değer kaydı korunur).
      if (
        nutrition &&
        typeof nutrition === "object" &&
        NUTRITION_EDIT_ROLES.includes(req.user.role)
      ) {
        const ingredientName = normalized.name?.trim();
        const hasAnyValue =
          nutrition.energyKcal != null ||
          nutrition.fatG != null ||
          nutrition.saturatedFatG != null ||
          nutrition.carbohydrateG != null ||
          nutrition.sugarG != null ||
          nutrition.proteinG != null ||
          nutrition.saltG != null ||
          (Array.isArray(nutrition.allergens) && nutrition.allergens.length > 0);

        if (ingredientName && hasAnyValue) {
          const toNum = (v: string | number | null | undefined): string | null =>
            v === "" || v == null || isNaN(Number(v)) ? null : String(Number(v));
          // Task #165: mevcut kayıt varsa üstüne yaz (audit alanları güncellenir)
          const allergensArr = Array.isArray(nutrition.allergens) ? nutrition.allergens : [];
          const nutValues = {
            energyKcal: toNum(nutrition.energyKcal),
            fatG: toNum(nutrition.fatG),
            saturatedFatG: toNum(nutrition.saturatedFatG),
            carbohydrateG: toNum(nutrition.carbohydrateG),
            sugarG: toNum(nutrition.sugarG),
            proteinG: toNum(nutrition.proteinG),
            saltG: toNum(nutrition.saltG),
            allergens: allergensArr,
          };
          const canonicalName = canonicalIngredientName(ingredientName);
          const [existingNut] = await tx.select().from(factoryIngredientNutrition)
            .where(eq(factoryIngredientNutrition.ingredientName, canonicalName)).limit(1);
          const [upsertedNut] = await tx.insert(factoryIngredientNutrition).values({
            ingredientName: canonicalName,
            ...nutValues,
            source: "manual",
            verifiedBy: req.user.id,
          }).onConflictDoUpdate({
            target: factoryIngredientNutrition.ingredientName,
            set: {
              ...nutValues,
              source: "manual",
              verifiedBy: req.user.id,
              updatedAt: new Date(),
            },
          }).returning();

          // Task #183 — denetim defterine kayıt
          await tx.insert(factoryIngredientNutritionHistory).values({
            nutritionId: upsertedNut.id,
            ingredientName: canonicalName,
            action: existingNut ? "update" : "create",
            source: "ingredient_post",
            before: existingNut ? {
              energyKcal: existingNut.energyKcal, fatG: existingNut.fatG,
              saturatedFatG: existingNut.saturatedFatG, transFatG: existingNut.transFatG,
              carbohydrateG: existingNut.carbohydrateG, sugarG: existingNut.sugarG,
              fiberG: existingNut.fiberG, proteinG: existingNut.proteinG,
              saltG: existingNut.saltG, sodiumMg: existingNut.sodiumMg,
              allergens: existingNut.allergens, source: existingNut.source,
              confidence: existingNut.confidence, verifiedBy: existingNut.verifiedBy,
            } : null,
            after: {
              energyKcal: upsertedNut.energyKcal, fatG: upsertedNut.fatG,
              saturatedFatG: upsertedNut.saturatedFatG, transFatG: upsertedNut.transFatG,
              carbohydrateG: upsertedNut.carbohydrateG, sugarG: upsertedNut.sugarG,
              fiberG: upsertedNut.fiberG, proteinG: upsertedNut.proteinG,
              saltG: upsertedNut.saltG, sodiumMg: upsertedNut.sodiumMg,
              allergens: upsertedNut.allergens, source: upsertedNut.source,
              confidence: upsertedNut.confidence, verifiedBy: upsertedNut.verifiedBy,
            },
            changedBy: req.user.id,
            changedByRole: req.user.role ?? null,
            note: `Reçete malzemesi eklenirken (recipe ${recipeId})`,
          });
        }
      }

      return row;
    });

    res.json(created);
  } catch (error) {
    console.error("Add ingredient error:", error);
    res.status(500).json({ error: "Malzeme eklenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients/bulk — Toplu malzeme kaydet
// Task #153: Kanonik-dışı (sözlükte ve nutrition tablosunda olmayan) isimler
// için server tarafında uyarı. `?force=true` veya body'de `allowUnknown: true`
// olmadan kanonik-dışı isim varsa 400 + `unknownIngredients: string[]` döner.
// Task #166: Her bir malzeme için opsiyonel `nutrition` payload'ı kabul edilir
// (energyKcal, fatG, saturatedFatG, carbohydrateG, sugarG, proteinG, saltG,
// allergens[]). Tüm insert'ler tek transaksiyon içinde yapılır; nutrition
// tablosuna `onConflictDoNothing` ile yazılır (mevcut veriyi ezmez).
// Cevapta ayrıca `missingNutrition: string[]` döner — kanonikleştirilmiş
// isimleri olan ama nutrition tablosunda hâlâ kayıt olmayan malzemeler.
router.post("/api/factory/recipes/:id/ingredients/bulk", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    type NutritionPayload = {
      energyKcal?: string | number | null;
      fatG?: string | number | null;
      saturatedFatG?: string | number | null;
      carbohydrateG?: string | number | null;
      sugarG?: string | number | null;
      proteinG?: string | number | null;
      saltG?: string | number | null;
      allergens?: string[];
    };

    const recipeId = Number(req.params.id);
    const { ingredients, allowUnknown } = req.body as {
      ingredients: Array<Record<string, unknown> & { name?: string; nutrition?: NutritionPayload }>;
      allowUnknown?: boolean;
    };
    if (!Array.isArray(ingredients)) return res.status(400).json({ error: "ingredients array gerekli" });

    const force = req.query.force === "true" || allowUnknown === true;

    // Bilinen isimler kümesi: kanonik sözlük (INGREDIENT_ALIASES anahtarları) +
    // factory_ingredient_nutrition tablosundaki kanonikleştirilmiş isimler.
    // Mevcut reçete malzemeleri kasten hariç — tarihi typo'lar bypass aracı
    // olmasın (Task #153).
    const nutritionRows = await db.select({ name: factoryIngredientNutrition.ingredientName })
      .from(factoryIngredientNutrition);

    const knownSet = new Set<string>();
    const nutritionSet = new Set<string>();
    for (const canonical of Object.keys(INGREDIENT_ALIASES)) {
      knownSet.add(canonical);
    }
    for (const r of nutritionRows) {
      const n = canonicalIngredientName(r.name || "");
      if (n) {
        knownSet.add(n);
        nutritionSet.add(n);
      }
    }

    const unknownIngredients: string[] = [];
    for (const ing of ingredients) {
      const raw = typeof ing?.name === "string" ? ing.name.trim() : "";
      if (!raw) continue;
      const canonical = canonicalIngredientName(raw);
      if (!knownSet.has(canonical) && !unknownIngredients.includes(raw)) {
        unknownIngredients.push(raw);
      }
    }

    if (unknownIngredients.length > 0 && !force) {
      return res.status(400).json({
        error: "Kanonik olmayan malzeme isimleri",
        message: "Bazı malzemeler kanonik isim listesinde değil. Devam etmek için onay gerekli.",
        unknownIngredients,
      });
    }

    const toNum = (v: string | number | null | undefined): string | null =>
      v === "" || v == null || isNaN(Number(v)) ? null : String(Number(v));

    const hasNumericValue = (v: string | number | null | undefined): boolean => {
      if (v == null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      return !isNaN(Number(v));
    };
    const hasAnyNutritionValue = (n: NutritionPayload): boolean =>
      hasNumericValue(n.energyKcal) ||
      hasNumericValue(n.fatG) ||
      hasNumericValue(n.saturatedFatG) ||
      hasNumericValue(n.carbohydrateG) ||
      hasNumericValue(n.sugarG) ||
      hasNumericValue(n.proteinG) ||
      hasNumericValue(n.saltG) ||
      (Array.isArray(n.allergens) && n.allergens.length > 0);

    type IngredientInsert = typeof factoryRecipeIngredients.$inferInsert;
    type IngredientRow = typeof factoryRecipeIngredients.$inferSelect;

    // Tek transaksiyon içinde: mevcut malzemeleri sil, yenilerini ekle ve
    // (varsa) opsiyonel nutrition kayıtlarını yaz. Hata olursa hepsi geri alınır.
    const result = await db.transaction(async (tx) => {
      // Task #182: Mevcut malzemeleri JSON snapshot'a al (geri al desteği)
      const existing = await tx.select().from(factoryRecipeIngredients)
        .where(eq(factoryRecipeIngredients.recipeId, recipeId));
      if (existing.length > 0) {
        await tx.insert(factoryRecipeIngredientSnapshots).values({
          recipeId,
          snapshot: existing as any,
          ingredientCount: existing.length,
          reason: "bulk_import",
          createdBy: req.user.id,
        });
      }

      await tx.delete(factoryRecipeIngredients).where(eq(factoryRecipeIngredients.recipeId, recipeId));

      const created: IngredientRow[] = [];
      const writtenNutrition = new Set<string>();
      for (const ing of ingredients) {
        const { nutrition, ...ingredientPayload } = ing;
        const normalized = normalizeIngredientPayload(ingredientPayload as { name?: string | null });
        const insertValues: IngredientInsert = {
          ...(normalized as unknown as IngredientInsert),
          recipeId,
        };
        const [row] = await tx.insert(factoryRecipeIngredients)
          .values(insertValues)
          .returning();
        created.push(row);

        const rawName = typeof (normalized as { name?: unknown }).name === "string"
          ? ((normalized as { name: string }).name).trim()
          : "";
        const ingredientName = rawName ? canonicalIngredientName(rawName) : "";
        if (
          ingredientName &&
          nutrition &&
          typeof nutrition === "object" &&
          hasAnyNutritionValue(nutrition)
        ) {
          await tx.insert(factoryIngredientNutrition).values({
            ingredientName,
            energyKcal: toNum(nutrition.energyKcal),
            fatG: toNum(nutrition.fatG),
            saturatedFatG: toNum(nutrition.saturatedFatG),
            carbohydrateG: toNum(nutrition.carbohydrateG),
            sugarG: toNum(nutrition.sugarG),
            proteinG: toNum(nutrition.proteinG),
            saltG: toNum(nutrition.saltG),
            allergens: Array.isArray(nutrition.allergens) ? nutrition.allergens : [],
            source: "manual",
            verifiedBy: req.user.id,
          }).onConflictDoNothing({ target: factoryIngredientNutrition.ingredientName });
          writtenNutrition.add(ingredientName);
        }
      }

      // Task #180: toplu malzeme yenileme gramaj formülünü değiştirir →
      // mevcut gramaj onayları geçersiz sayılır.
      await invalidateGrammageApprovals(recipeId, "ingredient_bulk", tx);

      return { created, writtenNutrition, snapshotTaken: existing.length };
    });

    // Eksik nutrition raporu: kanonikleştirilmiş isim, nutrition tablosunda
    // hâlâ yoksa (ve bu istekte de yazılmadıysa) listeye ekle.
    const missingNutrition: string[] = [];
    for (const ing of ingredients) {
      const raw = typeof ing?.name === "string" ? ing.name.trim() : "";
      if (!raw) continue;
      const canonical = canonicalIngredientName(raw);
      if (!nutritionSet.has(canonical) && !result.writtenNutrition.has(canonical) && !missingNutrition.includes(canonical)) {
        missingNutrition.push(canonical);
      }
    }

    res.json({
      ingredients: result.created,
      unknownIngredients,
      missingNutrition,
      snapshotTaken: result.snapshotTaken,
    });
  } catch (error) {
    console.error("Bulk ingredients error:", error);
    res.status(500).json({ error: "Malzemeler kaydedilemedi" });
  }
});

// GET /api/factory/recipes/:id/ingredients/snapshots/latest — Son içe aktarma snapshot bilgisi
// Task #182: Frontend "Geri Al" butonunun görünürlüğü için kullanılır.
router.get("/api/factory/recipes/:id/ingredients/snapshots/latest", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const recipeId = Number(req.params.id);

    const [latest] = await db.select({
      id: factoryRecipeIngredientSnapshots.id,
      ingredientCount: factoryRecipeIngredientSnapshots.ingredientCount,
      reason: factoryRecipeIngredientSnapshots.reason,
      createdBy: factoryRecipeIngredientSnapshots.createdBy,
      createdAt: factoryRecipeIngredientSnapshots.createdAt,
      restoredAt: factoryRecipeIngredientSnapshots.restoredAt,
    })
      .from(factoryRecipeIngredientSnapshots)
      .where(and(
        eq(factoryRecipeIngredientSnapshots.recipeId, recipeId),
        isNull(factoryRecipeIngredientSnapshots.restoredAt),
      ))
      .orderBy(desc(factoryRecipeIngredientSnapshots.createdAt))
      .limit(1);

    res.json(latest || null);
  } catch (error) {
    console.error("Get latest snapshot error:", error);
    res.status(500).json({ error: "Snapshot bilgisi yüklenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients/snapshots/:snapshotId/restore — Geri al
// Task #182: Belirtilen snapshot'ı geri yükler. Restore öncesi mevcut hali
// yine snapshot'lanır (geri al'ı geri alabilmek için).
router.post("/api/factory/recipes/:id/ingredients/snapshots/:snapshotId/restore", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const recipeId = Number(req.params.id);
    const snapshotId = Number(req.params.snapshotId);

    const [snap] = await db.select().from(factoryRecipeIngredientSnapshots)
      .where(and(
        eq(factoryRecipeIngredientSnapshots.id, snapshotId),
        eq(factoryRecipeIngredientSnapshots.recipeId, recipeId),
      ))
      .limit(1);
    if (!snap) return res.status(404).json({ error: "Snapshot bulunamadı" });
    if (snap.restoredAt) return res.status(400).json({ error: "Bu snapshot zaten geri yüklenmiş" });

    const items = Array.isArray(snap.snapshot) ? snap.snapshot : [];

    // Restore öncesi mevcut hali de snapshot'la (geri al'ı geri al)
    const current = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, recipeId));
    if (current.length > 0) {
      await db.insert(factoryRecipeIngredientSnapshots).values({
        recipeId,
        snapshot: current as any,
        ingredientCount: current.length,
        reason: "pre_restore",
        createdBy: req.user.id,
      });
    }

    await db.delete(factoryRecipeIngredients).where(eq(factoryRecipeIngredients.recipeId, recipeId));

    const restored = [];
    for (const ing of items) {
      const payload: any = { ...ing };
      delete payload.id;
      delete payload.createdAt;
      payload.recipeId = recipeId;
      const [row] = await db.insert(factoryRecipeIngredients)
        .values(normalizeIngredientPayload(payload))
        .returning();
      restored.push(row);
    }

    await db.update(factoryRecipeIngredientSnapshots)
      .set({ restoredAt: new Date() })
      .where(eq(factoryRecipeIngredientSnapshots.id, snapshotId));

    res.json({ ingredients: restored, restoredCount: restored.length });
  } catch (error) {
    console.error("Restore snapshot error:", error);
    res.status(500).json({ error: "Snapshot geri yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// ADIMLAR — CRUD
// ═══════════════════════════════════════

// GET /api/factory/recipes/:id/steps
router.get("/api/factory/recipes/:id/steps", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const steps = await db.select().from(factoryRecipeSteps)
      .where(eq(factoryRecipeSteps.recipeId, Number(req.params.id)))
      .orderBy(asc(factoryRecipeSteps.stepNumber));

    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: "Adımlar yüklenemedi" });
  }
});

// POST /api/factory/recipes/:id/steps/bulk — Toplu adım kaydet
// Task #193: Mevcut adımlar replace edilmeden önce JSON snapshot'a alınır
// (geri al desteği). Snapshot + delete + insert tek transaksiyondadır.
router.post("/api/factory/recipes/:id/steps/bulk", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const recipeId = Number(req.params.id);
    const { steps } = req.body;
    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: "steps dizisi gerekli" });
    }

    type StepRow = typeof factoryRecipeSteps.$inferSelect;
    type StepInsert = typeof factoryRecipeSteps.$inferInsert;

    const result = await db.transaction(async (tx) => {
      const existing: StepRow[] = await tx.select().from(factoryRecipeSteps)
        .where(eq(factoryRecipeSteps.recipeId, recipeId));

      // Boş state'i de snapshot'lıyoruz — geri al'ı geri al boş duruma
      // dönüş için de çalışsın.
      await tx.insert(factoryRecipeStepSnapshots).values({
        recipeId,
        snapshot: existing as unknown as Array<Record<string, unknown>>,
        stepCount: existing.length,
        reason: "bulk_import",
        createdBy: req.user.id,
      });

      await tx.delete(factoryRecipeSteps).where(eq(factoryRecipeSteps.recipeId, recipeId));

      const created: StepRow[] = [];
      for (const step of steps as StepInsert[]) {
        const [row] = await tx.insert(factoryRecipeSteps)
          .values({ ...step, recipeId })
          .returning();
        created.push(row);
      }

      return { created, snapshotTaken: existing.length };
    });

    res.json({ steps: result.created, snapshotTaken: result.snapshotTaken });
  } catch (error) {
    console.error("Bulk steps error:", error);
    res.status(500).json({ error: "Adımlar kaydedilemedi" });
  }
});

// GET /api/factory/recipes/:id/steps/snapshots/latest — Son adım snapshot bilgisi
// Task #193: Frontend "Geri Al" butonunun görünürlüğü için kullanılır.
router.get("/api/factory/recipes/:id/steps/snapshots/latest", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const recipeId = Number(req.params.id);

    const [latest] = await db.select({
      id: factoryRecipeStepSnapshots.id,
      stepCount: factoryRecipeStepSnapshots.stepCount,
      reason: factoryRecipeStepSnapshots.reason,
      createdBy: factoryRecipeStepSnapshots.createdBy,
      createdAt: factoryRecipeStepSnapshots.createdAt,
      restoredAt: factoryRecipeStepSnapshots.restoredAt,
    })
      .from(factoryRecipeStepSnapshots)
      .where(and(
        eq(factoryRecipeStepSnapshots.recipeId, recipeId),
        isNull(factoryRecipeStepSnapshots.restoredAt),
      ))
      .orderBy(desc(factoryRecipeStepSnapshots.createdAt))
      .limit(1);

    res.json(latest || null);
  } catch (error) {
    console.error("Get latest step snapshot error:", error);
    res.status(500).json({ error: "Snapshot bilgisi yüklenemedi" });
  }
});

// POST /api/factory/recipes/:id/steps/snapshots/:snapshotId/restore — Geri al
// Task #193: Belirtilen snapshot'ı geri yükler. Restore öncesi mevcut hal de
// snapshot'lanır (geri al'ı geri alabilmek için).
router.post("/api/factory/recipes/:id/steps/snapshots/:snapshotId/restore", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const recipeId = Number(req.params.id);
    const snapshotId = Number(req.params.snapshotId);

    type StepRow = typeof factoryRecipeSteps.$inferSelect;
    type StepInsert = typeof factoryRecipeSteps.$inferInsert;
    type StepSnapshotItem = Partial<StepRow> & Record<string, unknown>;

    const result = await db.transaction(async (tx) => {
      const [snap] = await tx.select().from(factoryRecipeStepSnapshots)
        .where(and(
          eq(factoryRecipeStepSnapshots.id, snapshotId),
          eq(factoryRecipeStepSnapshots.recipeId, recipeId),
        ))
        .limit(1);
      if (!snap) return { error: "notfound" as const };
      if (snap.restoredAt) return { error: "already" as const };

      const items: StepSnapshotItem[] = Array.isArray(snap.snapshot)
        ? (snap.snapshot as StepSnapshotItem[])
        : [];

      const current: StepRow[] = await tx.select().from(factoryRecipeSteps)
        .where(eq(factoryRecipeSteps.recipeId, recipeId));
      // Boş state'i de snapshot'lıyoruz — restore'dan sonra "geri al'ı
      // geri al" boş duruma dönüş için de çalışsın.
      await tx.insert(factoryRecipeStepSnapshots).values({
        recipeId,
        snapshot: current as unknown as Array<Record<string, unknown>>,
        stepCount: current.length,
        reason: "pre_restore",
        createdBy: req.user.id,
      });

      await tx.delete(factoryRecipeSteps).where(eq(factoryRecipeSteps.recipeId, recipeId));

      const restored: StepRow[] = [];
      for (const step of items) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = step;
        const payload: StepInsert = { ...(rest as StepInsert), recipeId };
        const [row] = await tx.insert(factoryRecipeSteps).values(payload).returning();
        restored.push(row);
      }

      await tx.update(factoryRecipeStepSnapshots)
        .set({ restoredAt: new Date() })
        .where(eq(factoryRecipeStepSnapshots.id, snapshotId));

      return { restored };
    });

    if ("error" in result) {
      if (result.error === "notfound") return res.status(404).json({ error: "Snapshot bulunamadı" });
      if (result.error === "already") return res.status(400).json({ error: "Bu snapshot zaten geri yüklenmiş" });
    }

    res.json({ steps: result.restored, restoredCount: result.restored!.length });
  } catch (error) {
    console.error("Restore step snapshot error:", error);
    res.status(500).json({ error: "Snapshot geri yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// KEYBLEND — CRUD (EN GİZLİ!)
// ═══════════════════════════════════════

// GET /api/factory/keyblends — Keyblend listesi
router.get("/api/factory/keyblends", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!KEYBLEND_ROLES.includes(req.user.role)) {
      // Gıda mühendisi: sadece kod+ağırlık+isim (bileşen yok)
      if (req.user.role === "gida_muhendisi") {
        const keyblends = await db.select({
          id: factoryKeyblends.id,
          code: factoryKeyblends.code,
          name: factoryKeyblends.name,
          totalWeight: factoryKeyblends.totalWeight,
        }).from(factoryKeyblends).where(eq(factoryKeyblends.isActive, true));
        return res.json(keyblends);
      }
      return res.status(403).json({ error: "Keyblend erişimi sadece Admin ve Reçete GM" });
    }

    const keyblends = await db.select().from(factoryKeyblends)
      .where(eq(factoryKeyblends.isActive, true))
      .orderBy(asc(factoryKeyblends.code));

    // Bileşenlerle birlikte
    const result = [];
    for (const kb of keyblends) {
      const ingredients = await db.select().from(factoryKeyblendIngredients)
        .where(eq(factoryKeyblendIngredients.keyblendId, kb.id))
        .orderBy(asc(factoryKeyblendIngredients.sortOrder));
      result.push({ ...kb, ingredients });
    }

    res.json(result);
  } catch (error) {
    console.error("Keyblends list error:", error);
    res.status(500).json({ error: "Keyblend'ler yüklenemedi" });
  }
});

// GET /api/factory/keyblends/:id/ingredients — Keyblend bileşenleri (EN GİZLİ!)
router.get("/api/factory/keyblends/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (KEYBLEND_ROLES.includes(req.user.role)) {
      // Admin + Reçete GM: TAM erişim
      const ingredients = await db.select().from(factoryKeyblendIngredients)
        .where(eq(factoryKeyblendIngredients.keyblendId, id))
        .orderBy(asc(factoryKeyblendIngredients.sortOrder));
      return res.json(ingredients);
    }

    if (req.user.role === "gida_muhendisi") {
      // Gıda müh: sadece show_name_to_gm=true olanların ismi (oran YOK)
      const [kb] = await db.select().from(factoryKeyblends).where(eq(factoryKeyblends.id, id));
      if (!kb?.showToGm) return res.status(403).json({ error: "Bu keyblend bileşenleri size açık değil" });

      const ingredients = await db.select({
        id: factoryKeyblendIngredients.id,
        name: factoryKeyblendIngredients.name,
        isAllergen: factoryKeyblendIngredients.isAllergen,
        allergenType: factoryKeyblendIngredients.allergenType,
      }).from(factoryKeyblendIngredients)
        .where(and(
          eq(factoryKeyblendIngredients.keyblendId, id),
          eq(factoryKeyblendIngredients.showNameToGm, true)
        ));
      return res.json(ingredients); // ORAN YOK — sadece isim + alerjen
    }

    return res.status(403).json({ error: "Keyblend bileşen erişimi yok" });
  } catch (error) {
    console.error("Keyblend ingredients error:", error);
    res.status(500).json({ error: "Bileşenler yüklenemedi" });
  }
});

// POST /api/factory/keyblends — Keyblend oluştur
router.post("/api/factory/keyblends", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!KEYBLEND_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { ingredients, ...keyblendData } = req.body;

    const [kb] = await db.insert(factoryKeyblends)
      .values({ ...keyblendData, createdBy: req.user.id })
      .returning();

    // Bileşenleri ekle
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        await db.insert(factoryKeyblendIngredients).values({ ...ing, keyblendId: kb.id });
      }
      // Toplam ağırlık hesapla
      const total = ingredients.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
      await db.update(factoryKeyblends).set({ totalWeight: String(total) }).where(eq(factoryKeyblends.id, kb.id));
    }

    res.json(kb);
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Bu kodla keyblend zaten var" });
    console.error("Create keyblend error:", error);
    res.status(500).json({ error: "Keyblend oluşturulamadı" });
  }
});

// ═══════════════════════════════════════
// ÜRETİM LOG
// ═══════════════════════════════════════

// POST /api/factory/recipes/:id/start-production
router.post("/api/factory/recipes/:id/start-production", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!PRODUCTION_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Üretim başlatma yetkiniz yok" });

    const recipeId = Number(req.params.id);
    const { batchMultiplier, sessionId, isArge, argeNotes } = req.body;

    if (isArge && !argeNotes?.trim()) {
      return res.status(400).json({ error: "AR-GE üretiminde not zorunludur" });
    }

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Aktif reçete versiyonunu yakala (onaylanmış en son versiyon)
    const [latestVersion] = await db.select({
      id: factoryRecipeVersions.id,
      versionNumber: factoryRecipeVersions.versionNumber,
    })
    .from(factoryRecipeVersions)
    .where(and(
      eq(factoryRecipeVersions.recipeId, recipeId),
      eq(factoryRecipeVersions.status, "approved")
    ))
    .orderBy(desc(factoryRecipeVersions.versionNumber))
    .limit(1);

    const expectedOutput = Math.round((recipe.baseBatchOutput || 1) * Number(batchMultiplier || 1));

    const [log] = await db.insert(factoryProductionLogs).values({
      recipeId,
      recipeVersionId: latestVersion?.id || null,
      recipeVersionNumber: latestVersion?.versionNumber || recipe.version || 1,
      sessionId: sessionId || null,
      batchMultiplier: String(batchMultiplier || 1),
      expectedOutput,
      startedAt: new Date(),
      startedBy: req.user.id,
      status: "in_progress",
      isArge: isArge || false,
      argeNotes: argeNotes || null,
    }).returning();

    res.json(log);
  } catch (error) {
    console.error("Start production error:", error);
    res.status(500).json({ error: "Üretim başlatılamadı" });
  }
});

// POST /api/factory/production-logs/:id/complete
router.post("/api/factory/production-logs/:id/complete", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { actualOutput, actualWasteKg, actualLossGrams, qualityScore, qcNotes, notes } = req.body;

    const [updated] = await db.update(factoryProductionLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy: req.user.id,
        actualOutput,
        actualWasteKg: actualWasteKg ? String(actualWasteKg) : null,
        actualLossGrams: actualLossGrams ? String(actualLossGrams) : null,
        qualityScore,
        qcNotes,
        notes,
      })
      .where(eq(factoryProductionLogs.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Complete production error:", error);
    res.status(500).json({ error: "Üretim tamamlanamadı" });
  }
});

// GET /api/factory/production-logs — Üretim geçmişi
router.get("/api/factory/production-logs", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const logs = await db.select({
      log: factoryProductionLogs,
      recipeName: factoryRecipes.name,
      recipeCode: factoryRecipes.code,
    })
    .from(factoryProductionLogs)
    .leftJoin(factoryRecipes, eq(factoryProductionLogs.recipeId, factoryRecipes.id))
    .orderBy(desc(factoryProductionLogs.createdAt))
    .limit(100);

    res.json(logs.map(l => ({ ...l.log, recipeName: l.recipeName, recipeCode: l.recipeCode })));
  } catch (error) {
    console.error("Production logs error:", error);
    res.status(500).json({ error: "Üretim logları yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// BATCH HESAPLAMA
// ═══════════════════════════════════════

// GET /api/factory/recipes/:id/calculate?multiplier=1.5
router.get("/api/factory/recipes/:id/calculate", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const id = Number(req.params.id);
    const multiplier = Number(req.query.multiplier || 1);

    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const scaled = ingredients.map(ing => ({
      ...ing,
      scaledAmount: Math.round(Number(ing.amount) * multiplier * 100) / 100,
      // Keyblend bilgisi gizleme
      ...(ing.ingredientType === "keyblend" && !KEYBLEND_ROLES.includes(req.user.role)
        ? { notes: null } : {}),
    }));

    res.json({ multiplier, ingredients: scaled });
  } catch (error) {
    res.status(500).json({ error: "Hesaplama başarısız" });
  }
});

// ═══════════════════════════════════════
// KATEGORİ ERİŞİM YÖNETİMİ (Admin)
// ═══════════════════════════════════════

// GET /api/factory/recipe-access
router.get("/api/factory/recipe-access", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const access = await db.select().from(factoryRecipeCategoryAccess)
      .orderBy(asc(factoryRecipeCategoryAccess.role), asc(factoryRecipeCategoryAccess.category));

    res.json(access);
  } catch (error) {
    res.status(500).json({ error: "Erişim listesi yüklenemedi" });
  }
});

// POST /api/factory/recipe-access — Erişim kuralı ekle/güncelle
router.post("/api/factory/recipe-access", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { role, category, canView, canEdit, canCreate } = req.body;

    const [existing] = await db.select().from(factoryRecipeCategoryAccess)
      .where(and(
        eq(factoryRecipeCategoryAccess.role, role),
        eq(factoryRecipeCategoryAccess.category, category)
      ));

    if (existing) {
      const [updated] = await db.update(factoryRecipeCategoryAccess)
        .set({ canView, canEdit, canCreate, setBy: req.user.id, updatedAt: new Date() })
        .where(eq(factoryRecipeCategoryAccess.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db.insert(factoryRecipeCategoryAccess)
      .values({ role, category, canView, canEdit, canCreate, setBy: req.user.id })
      .returning();

    res.json(created);
  } catch (error) {
    console.error("Recipe access error:", error);
    res.status(500).json({ error: "Erişim kuralı kaydedilemedi" });
  }
});

// ═══════════════════════════════════════
// REÇETE ONAYLARI (Task #164)
// ═══════════════════════════════════════

const APPROVAL_ROLES = ["admin", "recete_gm", "gida_muhendisi"];

// GET /api/factory/recipes/:id/approvals — Reçete onay listesi
router.get("/api/factory/recipes/:id/approvals", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ error: "Geçersiz reçete id" });

    const rows = await db.select({
      approval: factoryRecipeApprovals,
      approvedByName: users.firstName,
      approvedByLastName: users.lastName,
      approvedByEmail: users.email,
    })
      .from(factoryRecipeApprovals)
      .leftJoin(users, eq(factoryRecipeApprovals.approvedBy, users.id))
      .where(eq(factoryRecipeApprovals.recipeId, recipeId))
      .orderBy(desc(factoryRecipeApprovals.approvedAt));

    res.json(rows.map(r => ({
      ...r.approval,
      approvedByName: [r.approvedByName, r.approvedByLastName].filter(Boolean).join(" ") || r.approvedByEmail || r.approval.approvedBy,
    })));
  } catch (error) {
    console.error("List recipe approvals error:", error);
    res.status(500).json({ error: "Onay listesi yüklenemedi" });
  }
});

// POST /api/factory/recipes/:id/approvals — Yeni onay ekle
router.post("/api/factory/recipes/:id/approvals", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!APPROVAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Onay verme yetkiniz yok" });
    }

    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ error: "Geçersiz reçete id" });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    const parsed = insertFactoryRecipeApprovalSchema.safeParse({
      recipeId,
      scope: req.body?.scope,
      approvedBy: req.user.id,
      note: req.body?.note ?? null,
      recipeVersionId: req.body?.recipeVersionId ?? null,
      recipeVersionNumber: req.body?.recipeVersionNumber ?? recipe.version ?? null,
      sourceRef: req.body?.sourceRef ?? "manual",
    });
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz onay verisi", details: parsed.error.flatten() });
    }

    const [created] = await db.insert(factoryRecipeApprovals).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (error) {
    console.error("Create recipe approval error:", error);
    res.status(500).json({ error: "Onay kaydedilemedi" });
  }
});

export default router;
