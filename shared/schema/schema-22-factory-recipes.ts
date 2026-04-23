// ========================================
// FABRİKA REÇETE YÖNETİM SİSTEMİ
// 8+1 tablo: Keyblend gizli formül, mamül/yarı mamül,
// adım adım üretim, besin değer, kategori erişim
// Şubelerden tamamen bağımsız (ayrı API, ayrı tablolar)
// ========================================

import { pgTable, serial, varchar, text, integer, boolean, numeric, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";
import { factoryProducts, factoryStations } from "./schema-08";
import { factoryShiftSessions } from "./schema-08";
import { inventory } from "./schema-09";
import { sql } from "drizzle-orm";

// ────────────────────────────────────────
// 1. KEYBLEND — Gizli Formül Tanımları
//    Sadece admin + recete_gm erişir
// ────────────────────────────────────────

export const factoryKeyblends = pgTable("factory_keyblends", {
  id: serial("id").primaryKey(),

  code: varchar("code", { length: 20 }).notNull().unique(),   // "KB-D01", "KB-C01"
  name: varchar("name", { length: 255 }).notNull(),            // "Donut Premix"
  description: text("description"),

  totalWeight: numeric("total_weight", { precision: 12, scale: 4 }), // Toplam ağırlık (hesaplanan)

  // Gıda mühendisi erişimi (per-keyblend)
  showToGm: boolean("show_to_gm").default(false),              // GM bileşen isimlerini görebilir mi?

  // Hazırlık talimatı (sadece admin+recete_gm)
  preparationNotes: text("preparation_notes"),

  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFactoryKeyblendSchema = createInsertSchema(factoryKeyblends).omit({ id: true, createdAt: true, updatedAt: true });
export type FactoryKeyblend = typeof factoryKeyblends.$inferSelect;
export type InsertFactoryKeyblend = z.infer<typeof insertFactoryKeyblendSchema>;

// ────────────────────────────────────────
// 2. KEYBLEND BİLEŞENLERİ — Gizli iç içerik
// ────────────────────────────────────────

export const factoryKeyblendIngredients = pgTable("factory_keyblend_ingredients", {
  id: serial("id").primaryKey(),
  keyblendId: integer("keyblend_id").notNull().references(() => factoryKeyblends.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),          // "DATEM (E472e)"
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),            // "gr", "ml"

  // Alerjen (yasal zorunluluk — keyblend gizli olsa bile alerjen açık)
  isAllergen: boolean("is_allergen").default(false),
  allergenType: varchar("allergen_type", { length: 50 }),     // "gluten", "soya", "süt"

  // GM'e gösterme kontrolü (recete_gm belirler)
  showNameToGm: boolean("show_name_to_gm").default(false),    // İsim gösterilsin mi?
  // Oran ASLA gösterilmez GM'e — sadece admin+recete_gm görür

  rawMaterialId: integer("raw_material_id").references(() => inventory.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("fkbi_keyblend_idx").on(table.keyblendId),
]);

export const insertFactoryKeyblendIngredientSchema = createInsertSchema(factoryKeyblendIngredients).omit({ id: true, createdAt: true });
export type FactoryKeyblendIngredient = typeof factoryKeyblendIngredients.$inferSelect;

// ────────────────────────────────────────
// 3. FABRİKA REÇETELERİ — Ana Tablo
// ────────────────────────────────────────

export const factoryRecipes = pgTable("factory_recipes", {
  id: serial("id").primaryKey(),

  // Temel bilgiler
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),   // "CIN-001", "DON-001"
  description: text("description"),
  category: varchar("category", { length: 50 }),              // "cookie", "donut", "cinnamon_roll"
  coverPhotoUrl: text("cover_photo_url"),

  // Ürün bağlantısı (Replit önerisi — factory_products ile ilişki)
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),

  // Üretim sınıflandırma
  outputType: varchar("output_type", { length: 20 }).notNull().default("mamul"), // "mamul" | "yari_mamul"
  parentRecipeId: integer("parent_recipe_id"),                // Yarı mamülden türeyen mamül

  // Batch bilgileri
  baseBatchOutput: integer("base_batch_output").notNull().default(1), // Baz batch çıktı (ör: 65 adet)
  outputUnit: varchar("output_unit", { length: 20 }).default("adet"),
  totalWeightGrams: integer("total_weight_grams"),            // Toplam hamur ağırlığı (gr)
  expectedUnitWeight: numeric("expected_unit_weight", { precision: 10, scale: 3 }), // gr/adet

  // Batch çarpan şablonları (JSONB — Replit önerisi)
  batchPresets: jsonb("batch_presets").$type<Array<{
    name: string;
    multiplier: number;
    type: "standard" | "arge";
  }>>().default(sql`'[
    {"name":"×1","multiplier":1,"type":"standard"},
    {"name":"×1.25","multiplier":1.25,"type":"standard"},
    {"name":"×1.5","multiplier":1.5,"type":"standard"},
    {"name":"×1.75","multiplier":1.75,"type":"standard"},
    {"name":"×2","multiplier":2,"type":"standard"},
    {"name":"AR-GE %5","multiplier":0.05,"type":"arge"},
    {"name":"AR-GE %10","multiplier":0.10,"type":"arge"},
    {"name":"AR-GE %25","multiplier":0.25,"type":"arge"}
  ]'::jsonb`),

  // Üretim süresi
  prepTimeMinutes: integer("prep_time_minutes").default(0),
  productionTimeMinutes: integer("production_time_minutes").default(0),
  cleaningTimeMinutes: integer("cleaning_time_minutes").default(0),

  // İstasyon/Makina
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  equipmentDescription: text("equipment_description"),
  equipmentKwh: numeric("equipment_kwh", { precision: 10, scale: 3 }).default("0"),
  waterConsumptionLt: numeric("water_consumption_lt", { precision: 10, scale: 2 }).default("0"),

  // Personel
  requiredWorkers: integer("required_workers").default(1),

  // Verim & Kayıp
  expectedOutputCount: integer("expected_output_count"),
  expectedWasteKg: numeric("expected_waste_kg", { precision: 10, scale: 3 }).default("0"),
  expectedLossGrams: numeric("expected_loss_grams", { precision: 10, scale: 2 }).default("0"),
  wasteTolerancePct: numeric("waste_tolerance_pct", { precision: 5, scale: 2 }).default("5"),

  // Maliyet (hesaplanan)
  rawMaterialCost: numeric("raw_material_cost", { precision: 12, scale: 4 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 12, scale: 4 }).default("0"),
  energyCost: numeric("energy_cost", { precision: 12, scale: 4 }).default("0"),
  totalBatchCost: numeric("total_batch_cost", { precision: 12, scale: 4 }).default("0"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).default("0"),
  costLastCalculated: timestamp("cost_last_calculated", { withTimezone: true }),

  // Gizlilik & Kilit
  recipeType: varchar("recipe_type", { length: 20 }).default("OPEN"), // "OPEN" | "KEYBLEND"
  isVisible: boolean("is_visible").default(true),              // Admin geçici gizleme
  editLocked: boolean("edit_locked").default(false),           // Reçete GM kilitledi mi?
  lockedBy: varchar("locked_by").references(() => users.id, { onDelete: "set null" }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockReason: text("lock_reason"),

  // Besin değerleri (AI otomatik hesaplanan)
  nutritionFacts: jsonb("nutrition_facts"),                    // 100gr besin tablosu
  nutritionPerPortion: jsonb("nutrition_per_portion"),         // Porsiyon başına
  allergens: text("allergens").array(),                        // ["gluten","süt","yumurta"]
  nutritionCalculatedAt: timestamp("nutrition_calculated_at", { withTimezone: true }),
  nutritionConfidence: integer("nutrition_confidence"),        // AI güven 0-100

  // Versiyonlama
  version: integer("version").default(1),

  // Teknik notlar (markdown)
  bakersPercentage: text("bakers_percentage"),
  technicalNotes: text("technical_notes"),
  changeLog: text("change_log"),

  // Yönetim
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("fr_product_idx").on(table.productId),
  index("fr_category_idx").on(table.category),
  index("fr_output_type_idx").on(table.outputType),
  index("fr_parent_idx").on(table.parentRecipeId),
  index("fr_active_idx").on(table.isActive),
]);

export const insertFactoryRecipeSchema = createInsertSchema(factoryRecipes).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
  nutritionFacts: true, nutritionPerPortion: true, nutritionCalculatedAt: true, nutritionConfidence: true,
  costLastCalculated: true,
});
export type FactoryRecipe = typeof factoryRecipes.$inferSelect;
export type InsertFactoryRecipe = z.infer<typeof insertFactoryRecipeSchema>;

// ────────────────────────────────────────
// 4. REÇETE MALZEMELERİ
// ────────────────────────────────────────

export const factoryRecipeIngredients = pgTable("factory_recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),

  refId: varchar("ref_id", { length: 10 }).notNull(),         // "0001" (adım içi referans)
  name: varchar("name", { length: 255 }).notNull(),

  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(), // Baz batch miktarı
  unit: varchar("unit", { length: 20 }).notNull(),

  // Sınıflandırma
  ingredientType: varchar("ingredient_type", { length: 20 }).default("normal"), // "normal" | "keyblend"
  ingredientCategory: varchar("ingredient_category", { length: 50 }).default("ana"), // "ana","katki","lezzet","dolgu","susleme"

  // Keyblend bağlantısı (ingredient_type='keyblend' ise)
  keyblendId: integer("keyblend_id").references(() => factoryKeyblends.id, { onDelete: "set null" }),

  rawMaterialId: integer("raw_material_id").references(() => inventory.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("fri_recipe_idx").on(table.recipeId),
  unique("fri_recipe_ref_unique").on(table.recipeId, table.refId),
]);

export const insertFactoryRecipeIngredientSchema = createInsertSchema(factoryRecipeIngredients).omit({ id: true, createdAt: true });
export type FactoryRecipeIngredient = typeof factoryRecipeIngredients.$inferSelect;

// ────────────────────────────────────────
// 4b. REÇETE MALZEME SNAPSHOT (Task #182)
//     Toplu içe aktarım öncesi mevcut malzemeler JSON olarak yedeklenir.
//     Yanlış yapıştırma sonrası "Geri Al" ile son snapshot geri yüklenir.
// ────────────────────────────────────────

export const factoryRecipeIngredientSnapshots = pgTable("factory_recipe_ingredient_snapshots", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").$type<Array<Record<string, any>>>().notNull(),
  ingredientCount: integer("ingredient_count").notNull().default(0),
  reason: varchar("reason", { length: 50 }).default("bulk_import"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  restoredAt: timestamp("restored_at", { withTimezone: true }),
}, (table) => [
  index("fris_recipe_idx").on(table.recipeId, table.createdAt),
]);

export type FactoryRecipeIngredientSnapshot = typeof factoryRecipeIngredientSnapshots.$inferSelect;

// ────────────────────────────────────────
// 5. REÇETE ADIMLARI (fotoğraf JSONB içinde)
// ────────────────────────────────────────

export const factoryRecipeSteps = pgTable("factory_recipe_steps", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),

  stepNumber: integer("step_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),                          // "{0011} mayayı suda eritin..."

  // Fotoğraflar (JSONB array — Replit önerisi, ayrı tablo yerine)
  photoUrls: jsonb("photo_urls").$type<Array<{
    url: string;
    caption?: string;
  }>>().default(sql`'[]'::jsonb`),

  // Zamanlayıcı
  timerSeconds: integer("timer_seconds"),                      // null = timer yok

  // Üretim detayları
  temperatureCelsius: integer("temperature_celsius"),
  equipmentNeeded: text("equipment_needed"),

  // HACCP
  isCriticalControl: boolean("is_critical_control").default(false),
  ccpNotes: text("ccp_notes"),

  // İpucu
  tips: text("tips"),

  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("frs_recipe_idx").on(table.recipeId),
  index("frs_step_num_idx").on(table.recipeId, table.stepNumber),
]);

export const insertFactoryRecipeStepSchema = createInsertSchema(factoryRecipeSteps).omit({ id: true, createdAt: true, updatedAt: true });
export type FactoryRecipeStep = typeof factoryRecipeSteps.$inferSelect;

// ────────────────────────────────────────
// 6. ÜRETİM KAYIT LOGU
// ────────────────────────────────────────

export const factoryProductionLogs = pgTable("factory_production_logs", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id),

  // Reçete versiyonu — üretim başlarken aktif versiyonu yakalar
  recipeVersionId: integer("recipe_version_id").references(() => factoryRecipeVersions.id, { onDelete: "set null" }),
  recipeVersionNumber: integer("recipe_version_number"),

  // Vardiya bağlantısı (Replit önerisi — kim üretim yaptı)
  sessionId: integer("session_id").references(() => factoryShiftSessions.id, { onDelete: "set null" }),

  batchMultiplier: numeric("batch_multiplier", { precision: 5, scale: 2 }).notNull().default("1"),
  expectedOutput: integer("expected_output"),
  actualOutput: integer("actual_output"),

  // Zaman
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  // Kim
  startedBy: varchar("started_by").references(() => users.id, { onDelete: "set null" }),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),

  // Durum
  status: varchar("status", { length: 20 }).default("in_progress"), // in_progress|completed|aborted
  stepProgress: jsonb("step_progress").$type<Record<string, boolean>>().default(sql`'{}'::jsonb`),

  // Fire & Zayi
  actualWasteKg: numeric("actual_waste_kg", { precision: 10, scale: 3 }),
  actualLossGrams: numeric("actual_loss_grams", { precision: 10, scale: 2 }),

  // AR-GE
  isArge: boolean("is_arge").default(false),
  argeNotes: text("arge_notes"),

  // QC
  qualityScore: integer("quality_score"),
  qcNotes: text("qc_notes"),

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("fpl_recipe_idx").on(table.recipeId),
  index("fpl_recipe_version_idx").on(table.recipeVersionId),
  index("fpl_session_idx").on(table.sessionId),
  index("fpl_status_idx").on(table.status),
]);

export const insertFactoryProductionLogSchema = createInsertSchema(factoryProductionLogs).omit({ id: true, createdAt: true });
export type FactoryProductionLog = typeof factoryProductionLogs.$inferSelect;

// ────────────────────────────────────────
// 7. REÇETE VERSİYON GEÇMİŞİ
// ────────────────────────────────────────

export const factoryRecipeVersions = pgTable("factory_recipe_versions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),

  // Snapshot
  ingredientsSnapshot: jsonb("ingredients_snapshot"),
  stepsSnapshot: jsonb("steps_snapshot"),
  costSnapshot: jsonb("cost_snapshot").$type<{
    rawMaterialCost: number;
    laborCost: number;
    energyCost: number;
    totalBatchCost: number;
    unitCost: number;
  }>(),

  // Kim, ne zaman, neden
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changeDescription: text("change_description").notNull(),
  changeDiff: jsonb("change_diff"),

  // Onay
  status: varchar("status", { length: 20 }).default("pending"), // pending|approved|rejected
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("frv_recipe_idx").on(table.recipeId),
  unique("frv_recipe_version_unique").on(table.recipeId, table.versionNumber),
]);

export const insertFactoryRecipeVersionSchema = createInsertSchema(factoryRecipeVersions).omit({ id: true, createdAt: true });
export type FactoryRecipeVersion = typeof factoryRecipeVersions.$inferSelect;

// ────────────────────────────────────────
// 8. ŞEF KATEGORİ ERİŞİM KONTROLÜ
// ────────────────────────────────────────

export const factoryRecipeCategoryAccess = pgTable("factory_recipe_category_access", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 30 }).notNull(),            // "sef"
  category: varchar("category", { length: 50 }).notNull(),    // "cookie", "donut"

  canView: boolean("can_view").default(true),
  canEdit: boolean("can_edit").default(true),
  canCreate: boolean("can_create").default(true),

  setBy: varchar("set_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("frca_role_category_unique").on(table.role, table.category),
  index("frca_role_idx").on(table.role),
]);

export const insertFactoryRecipeCategoryAccessSchema = createInsertSchema(factoryRecipeCategoryAccess).omit({ id: true, updatedAt: true });
export type FactoryRecipeCategoryAccess = typeof factoryRecipeCategoryAccess.$inferSelect;

// ────────────────────────────────────────
// +1. HAMMADDE BESİN REFERANS TABLOSU
// ────────────────────────────────────────

export const factoryIngredientNutrition = pgTable("factory_ingredient_nutrition", {
  id: serial("id").primaryKey(),

  ingredientName: varchar("ingredient_name", { length: 255 }).notNull().unique(),

  // 100gr başına besin değerleri
  energyKcal: numeric("energy_kcal", { precision: 8, scale: 2 }),
  fatG: numeric("fat_g", { precision: 8, scale: 2 }),
  saturatedFatG: numeric("saturated_fat_g", { precision: 8, scale: 2 }),
  transFatG: numeric("trans_fat_g", { precision: 8, scale: 2 }),
  carbohydrateG: numeric("carbohydrate_g", { precision: 8, scale: 2 }),
  sugarG: numeric("sugar_g", { precision: 8, scale: 2 }),
  fiberG: numeric("fiber_g", { precision: 8, scale: 2 }),
  proteinG: numeric("protein_g", { precision: 8, scale: 2 }),
  saltG: numeric("salt_g", { precision: 8, scale: 2 }),
  sodiumMg: numeric("sodium_mg", { precision: 8, scale: 2 }),

  // Alerjenler
  allergens: text("allergens").array(),                        // ["gluten","soya"]

  // Kaynak
  source: varchar("source", { length: 20 }).default("manual"), // "manual"|"ai"|"usda"|"turkomp"
  confidence: integer("confidence"),                           // 0-100

  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFactoryIngredientNutritionSchema = createInsertSchema(factoryIngredientNutrition).omit({ id: true, createdAt: true, updatedAt: true });
export type FactoryIngredientNutrition = typeof factoryIngredientNutrition.$inferSelect;

// ────────────────────────────────────────
// +1b. HAMMADDE BESİN DEĞER GEÇMİŞİ (Audit / version history)
//      Task #183 — Her insert/update sonrası eski + yeni değerler,
//      kullanıcı, zaman ve değişiklik kaynağı kaydedilir. ISO/HACCP
//      açısından "kim, ne zaman, neyi değiştirdi" sorusunu cevaplar.
// ────────────────────────────────────────

export const factoryIngredientNutritionHistory = pgTable("factory_ingredient_nutrition_history", {
  id: serial("id").primaryKey(),

  // Kaynak satırı (silinirse cascade) + isim (rename/sil sonrası raporlama için)
  nutritionId: integer("nutrition_id").references(() => factoryIngredientNutrition.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name", { length: 255 }).notNull(),

  // Eylem türü: create | update | approve | bulk_approve
  action: varchar("action", { length: 20 }).notNull(),

  // Çağrı kaynağı: ingredient_post | nutrition_put | approve | bulk_approve | seed
  source: varchar("source", { length: 30 }).notNull(),

  // Eski / yeni değerlerin tam fotoğrafı (besin + alerjen + meta)
  before: jsonb("before"),
  after: jsonb("after").notNull(),

  // Kim, ne zaman
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedByRole: varchar("changed_by_role", { length: 30 }),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),

  // Opsiyonel açıklama / not
  note: text("note"),
}, (table) => [
  index("finh_nutrition_idx").on(table.nutritionId),
  index("finh_name_idx").on(table.ingredientName),
  index("finh_changed_at_idx").on(table.changedAt),
]);

export type FactoryIngredientNutritionHistory = typeof factoryIngredientNutritionHistory.$inferSelect;

// ────────────────────────────────────────
// 9. REÇETE FİYAT DEĞİŞİKLİK GEÇMİŞİ (Audit)
//    Recalc script ve manuel fiyat güncellemeleri için kalıcı denetim kaydı.
//    Task #98'de geçici olarak kaldırılmıştı, Task #106 ile yeniden açıldı.
// ────────────────────────────────────────

export const factoryRecipePriceHistory = pgTable("factory_recipe_price_history", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),

  // Maliyet (per batch) — eski/yeni
  oldRawMaterialCost: numeric("old_raw_material_cost", { precision: 12, scale: 4 }),
  newRawMaterialCost: numeric("new_raw_material_cost", { precision: 12, scale: 4 }),
  oldUnitCost: numeric("old_unit_cost", { precision: 12, scale: 4 }),
  newUnitCost: numeric("new_unit_cost", { precision: 12, scale: 4 }),

  // Ürün fiyatı (varsa) — eski/yeni
  oldBasePrice: numeric("old_base_price", { precision: 12, scale: 2 }),
  newBasePrice: numeric("new_base_price", { precision: 12, scale: 2 }),
  oldSuggestedPrice: numeric("old_suggested_price", { precision: 12, scale: 2 }),
  newSuggestedPrice: numeric("new_suggested_price", { precision: 12, scale: 2 }),

  changePercent: numeric("change_percent", { precision: 8, scale: 2 }),

  // Çalıştırma bağlamı
  status: varchar("status", { length: 30 }).notNull(),       // applied | applied_partial | skipped_empty | manual
  reason: text("reason"),
  ingredientCount: integer("ingredient_count").default(0),
  resolvedIngredientCount: integer("resolved_ingredient_count").default(0),
  coveragePercent: numeric("coverage_percent", { precision: 5, scale: 2 }),
  missingIngredients: jsonb("missing_ingredients").$type<Array<{
    code: string | null;
    name: string;
    reason: string;
    detail?: string;
  }>>().default(sql`'[]'::jsonb`),

  source: varchar("source", { length: 30 }).notNull(),       // recalc_script | manual | api
  runId: varchar("run_id", { length: 100 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("frph_recipe_idx").on(table.recipeId),
  index("frph_product_idx").on(table.productId),
  index("frph_run_idx").on(table.runId),
  index("frph_created_idx").on(table.createdAt),
]);

export const insertFactoryRecipePriceHistorySchema = createInsertSchema(factoryRecipePriceHistory).omit({ id: true, createdAt: true });
export type FactoryRecipePriceHistory = typeof factoryRecipePriceHistory.$inferSelect;
export type InsertFactoryRecipePriceHistory = z.infer<typeof insertFactoryRecipePriceHistorySchema>;

// ────────────────────────────────────────
// 10. REÇETE ONAYLARI (Task #164)
//    change_log text yerine yapılandırılmış onay kaydı.
//    scope: 'gramaj' | 'besin' | 'alerjen'
//    Bir reçetenin "onaylı" sayılması için scope='gramaj' satırı bulunmalı.
// ────────────────────────────────────────

export const factoryRecipeApprovals = pgTable("factory_recipe_approvals", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),

  // Onay kapsamı: gramaj (üretim formülü), besin (nutrition), alerjen (allergen)
  scope: varchar("scope", { length: 20 }).notNull(),

  approvedBy: varchar("approved_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),

  note: text("note"),

  // Hangi reçete versiyonunda onaylandı (varsa)
  recipeVersionId: integer("recipe_version_id").references(() => factoryRecipeVersions.id, { onDelete: "set null" }),
  recipeVersionNumber: integer("recipe_version_number"),

  // Backfill / kaynak referansı (örn: "Task #159", "Task #139", "manual")
  sourceRef: varchar("source_ref", { length: 50 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("fra_recipe_idx").on(table.recipeId),
  index("fra_recipe_scope_idx").on(table.recipeId, table.scope),
  index("fra_scope_idx").on(table.scope),
  index("fra_approved_at_idx").on(table.approvedAt),
]);

export const insertFactoryRecipeApprovalSchema = createInsertSchema(factoryRecipeApprovals).omit({
  id: true,
  approvedAt: true,
  createdAt: true,
}).extend({
  scope: z.enum(["gramaj", "besin", "alerjen"]),
  note: z.string().min(3).max(2000).optional().nullable(),
});
export type FactoryRecipeApproval = typeof factoryRecipeApprovals.$inferSelect;
export type InsertFactoryRecipeApproval = z.infer<typeof insertFactoryRecipeApprovalSchema>;

// ────────────────────────────────────────
// 11. ETIKET BASIM LOGU — Task #187
//     Müşteri etiketi PDF basım denetim izi
//     (Gıda güvenliği denetimleri için kayıt)
// ────────────────────────────────────────

export const factoryRecipeLabelPrintLogs = pgTable("factory_recipe_label_print_logs", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull().references(() => factoryRecipes.id, { onDelete: "cascade" }),
  recipeCode: varchar("recipe_code", { length: 50 }),
  recipeName: varchar("recipe_name", { length: 255 }),

  printedBy: varchar("printed_by").references(() => users.id, { onDelete: "set null" }),

  // taslak / onaylı ayrımı
  isDraft: boolean("is_draft").notNull().default(false),
  // basım anında reçete gıda mühendisi tarafından onaylı mıydı?
  grammageApproved: boolean("grammage_approved").notNull().default(false),

  // istemci tarafından yazılan kısa neden (ör. "Gramaj onayi bekliyor")
  draftReason: varchar("draft_reason", { length: 255 }),

  printedAt: timestamp("printed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("frlpl_recipe_idx").on(table.recipeId),
  index("frlpl_printed_at_idx").on(table.printedAt),
  index("frlpl_printed_by_idx").on(table.printedBy),
]);

export const insertFactoryRecipeLabelPrintLogSchema = createInsertSchema(factoryRecipeLabelPrintLogs).omit({
  id: true,
  printedAt: true,
});
export type FactoryRecipeLabelPrintLog = typeof factoryRecipeLabelPrintLogs.$inferSelect;
export type InsertFactoryRecipeLabelPrintLog = z.infer<typeof insertFactoryRecipeLabelPrintLogSchema>;
