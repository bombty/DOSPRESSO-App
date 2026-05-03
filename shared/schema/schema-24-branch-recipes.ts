/**
 * ŞUBE REÇETE SİSTEMİ - Branch Recipe System
 *
 * KRİTİK İZOLASYON KURALI (DECISIONS#30, Aslan onayı):
 * Bu sistem fabrika reçete sisteminden TAMAMEN BAĞIMSIZDIR.
 * Hiçbir tablo factoryRecipes, factoryProducts, factoryRecipeIngredients vb.
 * fabrika tablolarına FK referans VERMEZ. Veri izolasyonu mutlaktır.
 *
 * Şube barista/supervisor/mudur SADECE bu tabloları görür.
 * Fabrika personeli bu tablolara erişmez.
 *
 * Kullanım:
 *   - Barista mobil/kiosk üzerinden ürün arar → reçete + adımlar
 *   - Onboarding (yeni başlayan) eğitim adımları
 *   - Otomatik quiz üretimi (eğitim + sınav)
 *   - Mr. Dobody (AI) reçete sorgu yetkisi
 *
 * 3 May 2026 — Aslan onayı: Pilot freeze esnek, fonksiyonel ihtiyaç önce.
 */

import {
  pgTable, serial, integer, varchar, text, boolean, numeric,
  timestamp, jsonb, index, unique
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";

// ────────────────────────────────────────
// 1. BRANCH PRODUCTS — Şube ürünleri
// ────────────────────────────────────────
// Latte, Mocha, Cinnabon vb. — şubede satılan ürünler.
// factoryProducts'tan TAMAMEN BAĞIMSIZ.
//
// Kategoriler: hot_coffee, iced_coffee, creamice, gourmet_shake,
//              freshess, hot_tea, cold_tea, frozen_yogurt,
//              creamshake_caffeine_free, creamice_caffeine_free,
//              creamice_fruit_milkshake, freddo, donut, pastry, other

export const branchProducts = pgTable("branch_products", {
  id: serial("id").primaryKey(),

  // Temel bilgi
  name: varchar("name", { length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 10 }), // L, FW, BL, CB, CN gibi
  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 50 }), // örn. "kahvesiz", "kahveli"

  // Açıklama (müşteri için)
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),

  // Sıralama (UI'da grup içinde sırası)
  displayOrder: integer("display_order").default(0),

  // Aktif mi? (menüden çıkarılabilir)
  isActive: boolean("is_active").default(true),

  // Fiyat (boy bazlı)
  massivoPrice: numeric("massivo_price", { precision: 10, scale: 2 }),
  longDivaPrice: numeric("long_diva_price", { precision: 10, scale: 2 }),

  // Pilot/test mi?
  isPilotOnly: boolean("is_pilot_only").default(false),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("bp_category_idx").on(table.category),
  index("bp_active_idx").on(table.isActive),
  index("bp_short_code_idx").on(table.shortCode),
]);

export const insertBranchProductSchema = createInsertSchema(branchProducts).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchProduct = z.infer<typeof insertBranchProductSchema>;
export type BranchProduct = typeof branchProducts.$inferSelect;

// ────────────────────────────────────────
// 2. BRANCH RECIPES — Reçeteler (boy bazlı)
// ────────────────────────────────────────
// Her ürünün her boyu (Massivo, Long Diva) AYRI reçetedir.
// Cortado, Espresso gibi tek boylu olanlar massivo'da olur.

export const branchRecipes = pgTable("branch_recipes", {
  id: serial("id").primaryKey(),

  productId: integer("product_id").notNull()
    .references(() => branchProducts.id, { onDelete: "cascade" }),

  size: varchar("size", { length: 20 }).notNull(), // 'massivo' | 'long_diva' | 'tek_boy'

  // Versiyonlama
  version: varchar("version", { length: 10 }).default("3.6"), // PDF'te "v.3.6"
  isActive: boolean("is_active").default(true),

  // ✅ YENİ: Template sistemi (3 May 2026, Aslan onayı)
  // Bazı reçeteler şablondur (Meyveli Mojito, Meyveli Yogurt, Matcha Creamice).
  // Şablon ise → branch_recipe_aroma_compatibility tablosundan aromaları al
  // Sabit reçete ise → her şey ingredients/steps'te yazılı
  isTemplate: boolean("is_template").default(false),
  templateType: varchar("template_type", { length: 50 }),
  // 'fruit_mojito', 'fruit_ice_tea', 'fruit_italian_soda', 'fruit_mojito_blend',
  // 'fruit_yogurt_single' (Tango Mango), 'fruit_yogurt_double' (Jimmy Jambo - 2 aroma),
  // 'fruit_matcha_creamice', 'fruit_milkshake'

  // Hazırlama detay
  preparationTimeSec: integer("preparation_time_sec"), // tahmini hazırlama süresi
  difficultyLevel: integer("difficulty_level").default(1), // 1=kolay, 2=orta, 3=zor

  // Sunum bilgisi
  servingCup: varchar("serving_cup", { length: 50 }), // örn. "200ml bardak"
  servingLid: varchar("serving_lid", { length: 50 }), // örn. "Sıcak kapak", "Bombe kapak", "Strawless"
  servingNotes: text("serving_notes"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("br_product_idx").on(table.productId),
  index("br_active_idx").on(table.isActive),
  index("br_template_idx").on(table.isTemplate),
  unique("br_product_size_unique").on(table.productId, table.size),
]);

export const insertBranchRecipeSchema = createInsertSchema(branchRecipes).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchRecipe = z.infer<typeof insertBranchRecipeSchema>;
export type BranchRecipe = typeof branchRecipes.$inferSelect;

// ────────────────────────────────────────
// 3. BRANCH RECIPE INGREDIENTS — Malzemeler
// ────────────────────────────────────────
// PDF'teki "1 pump beyaz çikolata", "Pitcher ilk çizgisine kadar süt" gibi.
// FREE-TEXT format — şubede stok takibi yok (HQ takip eder).

export const branchRecipeIngredients = pgTable("branch_recipe_ingredients", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull()
    .references(() => branchRecipes.id, { onDelete: "cascade" }),

  // Sıra (önemli - reçete adım sırası kritik)
  stepOrder: integer("step_order").notNull(),

  // Malzeme
  ingredientName: varchar("ingredient_name", { length: 255 }).notNull(), // "süt", "espresso", "beyaz çikolata"

  // Miktar (esnek format — "1 pump", "Pitcher ilk çizgisine kadar")
  quantityText: varchar("quantity_text", { length: 100 }).notNull(),
  quantityNumeric: numeric("quantity_numeric", { precision: 10, scale: 3 }), // varsa sayısal
  unit: varchar("unit", { length: 20 }), // "pump", "ml", "ölçek", "adet"

  // Notlar (örn. "Pitcher içerisine ilk çizgisine kadar")
  preparationNote: text("preparation_note"),

  // ✅ YENİ: Template aroma sistemi (3 May 2026, Aslan onayı)
  // Şablon reçetelerde değişken aroma slot'ları:
  // Meyveli Mojito: ingredient="Meyve şurup (değişken)", aromaSlot="primary_fruit"
  // Jimmy Jambo: ingredient="Şeftali" aromaSlot="primary", "Amber" aromaSlot="secondary"
  isVariableAroma: boolean("is_variable_aroma").default(false),
  aromaSlot: varchar("aroma_slot", { length: 30 }),
  // 'primary_fruit', 'secondary_fruit', 'primary' (tek aroma için)

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("bri_recipe_idx").on(table.recipeId),
  index("bri_recipe_step_idx").on(table.recipeId, table.stepOrder),
  index("bri_aroma_slot_idx").on(table.aromaSlot),
]);

export const insertBranchRecipeIngredientSchema = createInsertSchema(branchRecipeIngredients).omit({
  id: true, createdAt: true,
});
export type InsertBranchRecipeIngredient = z.infer<typeof insertBranchRecipeIngredientSchema>;
export type BranchRecipeIngredient = typeof branchRecipeIngredients.$inferSelect;

// ────────────────────────────────────────
// 4. BRANCH RECIPE STEPS — Adım adım hazırlama
// ────────────────────────────────────────
// PDF'teki "› Bardak içerisine logo başlangıç yerine kadar..." adımları.

export const branchRecipeSteps = pgTable("branch_recipe_steps", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull()
    .references(() => branchRecipes.id, { onDelete: "cascade" }),

  stepOrder: integer("step_order").notNull(),
  instruction: text("instruction").notNull(), // "Bardak içerisine sıcak su eklenir..."

  // Görsel ipucu (varsa)
  imageUrl: varchar("image_url", { length: 500 }),
  videoUrl: varchar("video_url", { length: 500 }),

  // Kritik adım mı? (yapılmadığında reçete bozulur)
  isCritical: boolean("is_critical").default(false),

  // Tahmini süre (sn)
  estimatedSec: integer("estimated_sec"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("brs_recipe_idx").on(table.recipeId),
  index("brs_recipe_step_idx").on(table.recipeId, table.stepOrder),
]);

export const insertBranchRecipeStepSchema = createInsertSchema(branchRecipeSteps).omit({
  id: true, createdAt: true,
});
export type InsertBranchRecipeStep = z.infer<typeof insertBranchRecipeStepSchema>;
export type BranchRecipeStep = typeof branchRecipeSteps.$inferSelect;

// ────────────────────────────────────────
// 5. BRANCH RECIPE QUIZZES — Otomatik üretilen quiz'ler
// ────────────────────────────────────────
// Her reçete için 3-5 quiz sorusu otomatik üretilir.
// Akademi sistemi + Mr. Dobody soruları kullanır.

export const branchRecipeQuizzes = pgTable("branch_recipe_quizzes", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull()
    .references(() => branchRecipes.id, { onDelete: "cascade" }),

  // Soru bilgisi
  question: text("question").notNull(),
  questionType: varchar("question_type", { length: 30 }).notNull(),
  // Tipler: 'multiple_choice', 'fill_blank', 'true_false', 'order_steps'

  // Çoktan seçmeli için
  options: jsonb("options").$type<string[]>(), // ["1 pump", "2 pump", "3 pump", "4 pump"]
  correctAnswer: text("correct_answer").notNull(), // "2 pump"

  // Açıklama (yanlış cevap sonrası gösterilir)
  explanation: text("explanation"),

  // Zorluk seviyesi
  difficulty: varchar("difficulty", { length: 10 }).default("easy"), // 'easy', 'medium', 'hard'

  // Hangi kategoriye odaklanır?
  focusArea: varchar("focus_area", { length: 50 }),
  // 'ingredient_amount', 'preparation_step', 'serving', 'cup_size', 'general'

  // Otomatik üretilmiş mi yoksa manuel mi?
  isAutoGenerated: boolean("is_auto_generated").default(true),

  // Kim eklemiş?
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("brq_recipe_idx").on(table.recipeId),
  index("brq_difficulty_idx").on(table.difficulty),
  index("brq_active_idx").on(table.isActive),
]);

export const insertBranchRecipeQuizSchema = createInsertSchema(branchRecipeQuizzes).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchRecipeQuiz = z.infer<typeof insertBranchRecipeQuizSchema>;
export type BranchRecipeQuiz = typeof branchRecipeQuizzes.$inferSelect;

// ────────────────────────────────────────
// 6. BRANCH ONBOARDING STEPS — Eğitim adımları
// ────────────────────────────────────────
// Yeni başlayan barista'nın hangi reçeteyi hangi sırada öğreneceği.
// Mevcut onboardingPrograms (schema-11) ile bağlantılı ama ayrı.

export const branchOnboardingSteps = pgTable("branch_onboarding_steps", {
  id: serial("id").primaryKey(),

  // Eğitim hedefi (rol bazlı)
  targetRole: varchar("target_role", { length: 50 }).notNull(), // 'barista', 'bar_buddy', 'supervisor'

  // Adım sırası
  stepNumber: integer("step_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  // Bu adımda öğrenilecek reçeteler (jsonb array)
  recipeIds: jsonb("recipe_ids").$type<number[]>().default([]),

  // Tahmini süre
  estimatedMinutes: integer("estimated_minutes").default(30),

  // Önkoşul (önce hangi adım tamamlanmalı?)
  prerequisiteStepIds: jsonb("prerequisite_step_ids").$type<number[]>().default([]),

  // Tamamlanma kriteri
  completionCriteria: jsonb("completion_criteria").$type<{
    minQuizScore?: number; // örn. 80
    requireSupervisorApproval?: boolean;
    requireRecipeDemo?: boolean;
  }>(),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("bos_role_idx").on(table.targetRole),
  index("bos_step_idx").on(table.targetRole, table.stepNumber),
  unique("bos_role_step_unique").on(table.targetRole, table.stepNumber),
]);

export const insertBranchOnboardingStepSchema = createInsertSchema(branchOnboardingSteps).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchOnboardingStep = z.infer<typeof insertBranchOnboardingStepSchema>;
export type BranchOnboardingStep = typeof branchOnboardingSteps.$inferSelect;

// ────────────────────────────────────────
// 7. BRANCH RECIPE LEARNING PROGRESS — Öğrenme takibi
// ────────────────────────────────────────
// Hangi kullanıcı hangi reçeteyi ne kadar öğrenmiş?

export const branchRecipeLearningProgress = pgTable("branch_recipe_learning_progress", {
  id: serial("id").primaryKey(),

  userId: varchar("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  recipeId: integer("recipe_id").notNull()
    .references(() => branchRecipes.id, { onDelete: "cascade" }),

  // Görüntüleme sayısı
  viewCount: integer("view_count").default(0),

  // Quiz başarısı
  quizAttempts: integer("quiz_attempts").default(0),
  quizCorrect: integer("quiz_correct").default(0),
  bestScore: numeric("best_score", { precision: 5, scale: 2 }), // 0-100

  // Demo (uygulama) tamamlandı mı? (supervisor onayı)
  demoCompleted: boolean("demo_completed").default(false),
  demoApprovedBy: varchar("demo_approved_by").references(() => users.id, { onDelete: "set null" }),
  demoApprovedAt: timestamp("demo_approved_at"),

  // Master oldu mu? (uzmanlaştı)
  masteredAt: timestamp("mastered_at"),

  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("brlp_user_idx").on(table.userId),
  index("brlp_recipe_idx").on(table.recipeId),
  unique("brlp_user_recipe_unique").on(table.userId, table.recipeId),
]);

export const insertBranchRecipeLearningProgressSchema = createInsertSchema(branchRecipeLearningProgress).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchRecipeLearningProgress = z.infer<typeof insertBranchRecipeLearningProgressSchema>;
export type BranchRecipeLearningProgress = typeof branchRecipeLearningProgress.$inferSelect;

// ────────────────────────────────────────
// 8. BRANCH AROMA OPTIONS — Aroma havuzu (template sistemi için)
// ────────────────────────────────────────
// Şablon reçetelerde kullanılabilen aromaların listesi.
// Yeni meyve eklendiğinde tek satır eklenir, tüm template'ler otomatik destekler.
//
// Örn: Mango, Şeftali, Pinkberry, Blueberry, Lime, Amber, Mint, ...

export const branchAromaOptions = pgTable("branch_aroma_options", {
  id: serial("id").primaryKey(),

  // Temel bilgi
  name: varchar("name", { length: 100 }).notNull().unique(), // "Mango", "Şeftali", ...
  shortCode: varchar("short_code", { length: 10 }), // "MNG", "SFT", "PNK", ...

  // Kategori (UI grup için)
  category: varchar("category", { length: 30 }).notNull(),
  // 'fruit' (Mango/Şeftali), 'herbal' (Mint/Tarçın), 'dairy' (Vanilya), 'sweet' (Karamel)

  // Türkçe açıklama (UI'da gösterilir)
  description: text("description"),

  // Görsel (UI'da renk/icon)
  colorHex: varchar("color_hex", { length: 7 }), // "#FF6B35"
  iconEmoji: varchar("icon_emoji", { length: 4 }), // "🥭"

  // Şurup tipi mi yoksa toz mu?
  formType: varchar("form_type", { length: 20 }).default("syrup"),
  // 'syrup' (pump ile ölçülür), 'powder' (ölçek ile), 'fresh' (taze - nane/limon),
  // 'physical_item' (yarım çikolata, oreo crash gibi fiziksel ürün),
  // 'topping' (üzerine süsleme: kakao, drizzle, hindistan cevizi)

  // Sıralama
  displayOrder: integer("display_order").default(0),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("bao_category_idx").on(table.category),
  index("bao_active_idx").on(table.isActive),
]);

export const insertBranchAromaOptionSchema = createInsertSchema(branchAromaOptions).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBranchAromaOption = z.infer<typeof insertBranchAromaOptionSchema>;
export type BranchAromaOption = typeof branchAromaOptions.$inferSelect;

// ────────────────────────────────────────
// 9. BRANCH RECIPE AROMA COMPATIBILITY — Şablon × Aroma uyumluluğu
// ────────────────────────────────────────
// Hangi şablon hangi aromayı kabul eder + her aroma için özel pump miktarı.
//
// Örn: Meyveli Mojito (template) × Mango (aroma) = 3 pump (Massivo) / 4 pump (Long Diva)
//      Meyveli Mojito × Pinkberry = aynı 3/4 pump
//      Jimmy Jambo (Şeftali+Amber) × Şeftali (primary) + Amber (secondary)

export const branchRecipeAromaCompatibility = pgTable("branch_recipe_aroma_compatibility", {
  id: serial("id").primaryKey(),

  recipeId: integer("recipe_id").notNull()
    .references(() => branchRecipes.id, { onDelete: "cascade" }),

  aromaId: integer("aroma_id").notNull()
    .references(() => branchAromaOptions.id, { onDelete: "cascade" }),

  // Hangi slot için? (primary_fruit / secondary_fruit / primary)
  slotName: varchar("slot_name", { length: 30 }).notNull(),

  // Override miktarları (boş ise reçete varsayılanı kullanılır)
  overridePumpsMassivo: numeric("override_pumps_massivo", { precision: 5, scale: 2 }),
  overridePumpsLongDiva: numeric("override_pumps_long_diva", { precision: 5, scale: 2 }),
  overrideUnit: varchar("override_unit", { length: 20 }), // "pump", "ölçek", ...

  // Varsayılan kombinasyon mu? (UI'da önce gösterilir)
  isDefault: boolean("is_default").default(false),

  // Görüntüleme adı override (özel ürün ismi varsa)
  // Örn: Pinkberry Mojito = "Moulin Rouge" gibi pazarlama adı
  displayNameOverride: varchar("display_name_override", { length: 100 }),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("brac_recipe_idx").on(table.recipeId),
  index("brac_aroma_idx").on(table.aromaId),
  unique("brac_recipe_aroma_slot_unique").on(table.recipeId, table.aromaId, table.slotName),
]);

export const insertBranchRecipeAromaCompatibilitySchema = createInsertSchema(branchRecipeAromaCompatibility).omit({
  id: true, createdAt: true,
});
export type InsertBranchRecipeAromaCompatibility = z.infer<typeof insertBranchRecipeAromaCompatibilitySchema>;
export type BranchRecipeAromaCompatibility = typeof branchRecipeAromaCompatibility.$inferSelect;

// ────────────────────────────────────────
// İZOLASYON BEYANI
// ────────────────────────────────────────
// Bu schema dosyası fabrika sistemi tablolarına SIFIR FK referans verir.
// Doğrulama:
//   - factoryProducts ❌
//   - factoryRecipes ❌
//   - factoryRecipeIngredients ❌
//   - factoryRecipeApprovals ❌
//   - factoryProductionLogs ❌
// Sadece global tablolar:
//   - users ✅ (createdBy, approvedBy, demoApprovedBy)
// Mutlak izolasyon ✅
//
// TOPLAM: 9 tablo
// 1-7: Temel reçete sistemi (ürün, reçete, malzeme, adım, quiz, onboarding, ilerleme)
// 8-9: Template sistemi (aroma havuzu + uyumluluk) — DRY prensibi için
//
// TEMPLATE PATTERN ÖRNEKLERİ:
//   - Meyveli Mojito (template) × {Mango, Şeftali, Pinkberry, Blueberry}
//   - Meyveli Ice Tea (template) × {aynı meyveler}
//   - Meyveli Italian Soda (template) × {aynı meyveler}
//   - Meyveli Mojito Blend (template) × {aynı meyveler}
//   - Meyveli Yogurt Tek (Tango Mango/Moulin Rouge/Captain Jack) × tek aroma
//   - Meyveli Yogurt Çift (Jimmy Jambo) × {primary + secondary aroma}
//   - Matcha Creamice (template) × {Mango, Şeftali, Pinkberry}
//   - Meyveli Milkshake (template) × {Şeftali+Amber, Mango, Blueberry, Aloe}
//
// Yeni meyve eklendiğinde: branch_aroma_options'a 1 satır + her template için
// 1 compatibility kaydı yeterli. Mevcut sistemde 5+ ürün × 4 template = 20+ kayıt.
