import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp,
  date,
  time,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
  real,
  customType,
  uniqueIndex,
  unique,
  check,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Session storage table (required for Replit Auth)

import { branches, users } from './schema-02';
import { Shift } from './schema-03';
import { roles } from './schema-04';
import { Recipe, recipes } from './schema-06';
import { factoryProducts, factoryWasteReasons } from './schema-08';
import { goodsReceipts, inventory, purchaseOrderItems, purchaseOrders, suppliers } from './schema-09';

// Mal Kabul Kalemleri
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  purchaseOrderItemId: integer("purchase_order_item_id").references(() => purchaseOrderItems.id, { onDelete: "set null" }),
  
  // Miktarlar
  orderedQuantity: numeric("ordered_quantity", { precision: 12, scale: 3 }),
  receivedQuantity: numeric("received_quantity", { precision: 12, scale: 3 }).notNull(),
  acceptedQuantity: numeric("accepted_quantity", { precision: 12, scale: 3 }),
  rejectedQuantity: numeric("rejected_quantity", { precision: 12, scale: 3 }).default("0"),
  
  unit: varchar("unit", { length: 20 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  
  // Lot/Batch bilgisi
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  productionDate: timestamp("production_date"),
  
  // Kalite kontrol
  qualityStatus: varchar("quality_status", { length: 30 }).default("beklemede"), // beklemede, gecti, kaldi
  qualityNotes: text("quality_notes"),
  
  // Red nedeni
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("gri_receipt_idx").on(table.goodsReceiptId),
  index("gri_inventory_idx").on(table.inventoryId),
  index("gri_batch_idx").on(table.batchNumber),
]);

export const insertGoodsReceiptItemSchema = createInsertSchema(goodsReceiptItems).omit({
  id: true,
  createdAt: true,
});

export type InsertGoodsReceiptItem = z.infer<typeof insertGoodsReceiptItemSchema>;
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;

// ========================================
// REÇETE-HAMMADDE İLİŞKİSİ - Recipe Ingredients
// ========================================

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  // Miktar bilgisi
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Boyut (küçük/büyük bardak için farklı miktarlar)
  cupSize: varchar("cup_size", { length: 20 }).default("all"), // small, large, all
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ri_recipe_idx").on(table.recipeId),
  index("ri_inventory_idx").on(table.inventoryId),
]);

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

// ========================================
// ÜRETİM KAYITLARI - Production Records
// ========================================

export const productionRecords = pgTable("production_records", {
  id: serial("id").primaryKey(),
  
  // Üretim bilgileri
  productionNumber: varchar("production_number", { length: 50 }).notNull().unique(),
  productionDate: timestamp("production_date").defaultNow().notNull(),
  
  // Üretilen ürün
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  
  // Miktarlar
  plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 3 }).notNull(),
  producedQuantity: numeric("produced_quantity", { precision: 12, scale: 3 }).notNull(),
  wasteQuantity: numeric("waste_quantity", { precision: 12, scale: 3 }).default("0"),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Lot/Batch
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  // Durum
  status: varchar("status", { length: 30 }).default("tamamlandi"), // planlandi, devam_ediyor, tamamlandi, iptal
  
  // Hammadde tüketimi işlendi mi?
  ingredientsDeducted: boolean("ingredients_deducted").default(false),
  productAddedToStock: boolean("product_added_to_stock").default(false),
  
  notes: text("notes"),
  
  producedById: varchar("produced_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pr_number_idx").on(table.productionNumber),
  index("pr_date_idx").on(table.productionDate),
  index("pr_inventory_idx").on(table.inventoryId),
  index("pr_recipe_idx").on(table.recipeId),
  index("pr_status_idx").on(table.status),
]);

export const insertProductionRecordSchema = createInsertSchema(productionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionRecord = z.infer<typeof insertProductionRecordSchema>;
export type ProductionRecord = typeof productionRecords.$inferSelect;

// Üretim Hammadde Kullanımı
export const productionIngredients = pgTable("production_ingredients", {
  id: serial("id").primaryKey(),
  
  productionRecordId: integer("production_record_id").references(() => productionRecords.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 3 }).notNull(),
  usedQuantity: numeric("used_quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Stoktan düşüldü mü?
  deductedFromStock: boolean("deducted_from_stock").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pi_production_idx").on(table.productionRecordId),
  index("pi_inventory_idx").on(table.inventoryId),
]);

export const insertProductionIngredientSchema = createInsertSchema(productionIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertProductionIngredient = z.infer<typeof insertProductionIngredientSchema>;
export type ProductionIngredient = typeof productionIngredients.$inferSelect;

// ========================================
// CARİ TAKİP - Receivables/Payables Tracking
// ========================================

export const cariAccounts = pgTable("cari_accounts", {
  id: serial("id").primaryKey(),
  
  // Hesap bilgileri
  accountCode: varchar("account_code", { length: 50 }).notNull().unique(),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(), // branch, supplier, customer, other
  
  // İlişkili kayıtlar (opsiyonel)
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  
  // İletişim bilgileri
  contactPerson: varchar("contact_person", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  
  // Bakiye bilgileri (cache olarak tutulur)
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).default("0"),
  lastTransactionDate: timestamp("last_transaction_date"),
  
  // Durum
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("cari_account_type_idx").on(table.accountType),
  index("cari_branch_idx").on(table.branchId),
]);

export const cariTransactions = pgTable("cari_transactions", {
  id: serial("id").primaryKey(),
  
  accountId: integer("account_id").references(() => cariAccounts.id, { onDelete: "cascade" }).notNull(),
  
  // İşlem bilgileri
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // borc (debit), alacak (credit)
  
  // Tutar
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  
  // Açıklama
  description: text("description"),
  documentNumber: varchar("document_number", { length: 100 }),
  documentType: varchar("document_type", { length: 50 }), // fatura, tahsilat, tediye, virman
  
  // Vade bilgisi
  dueDate: timestamp("due_date"),
  isPaid: boolean("is_paid").default(false),
  paidDate: timestamp("paid_date"),
  
  // İlişkili kayıtlar
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id, { onDelete: "set null" }),
  
  createdById: varchar("created_by_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("cari_tx_account_idx").on(table.accountId),
  index("cari_tx_date_idx").on(table.transactionDate),
  index("cari_tx_due_idx").on(table.dueDate),
]);

export const insertCariAccountSchema = createInsertSchema(cariAccounts).omit({
  id: true,
  currentBalance: true,
  lastTransactionDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCariTransactionSchema = createInsertSchema(cariTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCariAccount = z.infer<typeof insertCariAccountSchema>;
export type CariAccount = typeof cariAccounts.$inferSelect;
export type InsertCariTransaction = z.infer<typeof insertCariTransactionSchema>;
export type CariTransaction = typeof cariTransactions.$inferSelect;

// ========================================
// MALİYET HESAPLAMA SİSTEMİ - Cost Calculation System
// ========================================

// Ürün Kategorileri
export const productCategoryEnum = [
  "donut", "pastane", "konsantre", "topping", "kahve", "cay", 
  "kullan_at", "sarf_malzeme", "wasp", "porselen", "mamabon", "diger"
] as const;
export type ProductCategory = typeof productCategoryEnum[number];

// Hammadde Listesi - Raw Materials (Satınalma stoğundan çekilen)
export const rawMaterials = pgTable("raw_materials", {
  id: serial("id").primaryKey(),
  
  // Hammadde bilgileri
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  
  // Birim bilgileri
  unit: varchar("unit", { length: 20 }).notNull(), // kg, lt, adet vs.
  
  // Fiyat bilgileri (Satınalmadan güncel)
  currentUnitPrice: numeric("current_unit_price", { precision: 12, scale: 4 }).default("0"),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 12, scale: 4 }).default("0"),
  averagePrice: numeric("average_price", { precision: 12, scale: 4 }).default("0"),
  priceLastUpdated: timestamp("price_last_updated"),
  
  // Stok bağlantısı
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  
  // Durum
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  // Keyblend - Gizli formülasyon hammaddesi
  isKeyblend: boolean("is_keyblend").default(false),
  keyblendCost: numeric("keyblend_cost", { precision: 12, scale: 4 }).default("0"), // Admin tarafından girilen maliyet
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("rm_code_idx").on(table.code),
  index("rm_category_idx").on(table.category),
  index("rm_inventory_idx").on(table.inventoryId),
]);

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// Ürün Reçetesi - Product Recipe
export const productRecipes = pgTable("product_recipes", {
  id: serial("id").primaryKey(),
  
  // Ürün bağlantısı
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  
  // Reçete bilgileri
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  
  // Reçete tipi - OPEN (görünür) veya KEYBLEND (bazı içerikler gizli)
  recipeType: varchar("recipe_type", { length: 20 }).default("OPEN"), // OPEN, KEYBLEND
  
  // Üretim bilgileri
  outputQuantity: numeric("output_quantity", { precision: 12, scale: 3 }).default("1"),
  outputUnit: varchar("output_unit", { length: 20 }).default("adet"),
  productionTimeMinutes: integer("production_time_minutes").default(0),
  
  // İşçilik bilgileri
  laborWorkerCount: integer("labor_worker_count").default(1),
  laborBatchSize: integer("labor_batch_size").default(1),
  laborHourlyRate: numeric("labor_hourly_rate", { precision: 10, scale: 2 }).default("0"),
  
  // Enerji bilgileri - Activity-Based Costing
  energyKwhPerBatch: numeric("energy_kwh_per_batch", { precision: 10, scale: 3 }).default("0"),
  equipmentDescription: text("equipment_description"),
  machineId: integer("machine_id"),
  
  // Batch verim & fire hesaplama
  expectedUnitWeight: numeric("expected_unit_weight", { precision: 10, scale: 3 }),
  expectedUnitWeightUnit: varchar("expected_unit_weight_unit", { length: 10 }).default("g"),
  expectedOutputCount: integer("expected_output_count"),
  expectedWastePercent: numeric("expected_waste_percent", { precision: 5, scale: 2 }),
  wasteTolerancePercent: numeric("waste_tolerance_percent", { precision: 5, scale: 2 }).default("5"),

  // Hesaplanan maliyetler
  rawMaterialCost: numeric("raw_material_cost", { precision: 12, scale: 4 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 12, scale: 4 }).default("0"),
  energyCost: numeric("energy_cost", { precision: 12, scale: 4 }).default("0"),
  packagingCost: numeric("packaging_cost", { precision: 12, scale: 4 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 12, scale: 4 }).default("0"),
  totalUnitCost: numeric("total_unit_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Maliyet son güncelleme
  costLastCalculated: timestamp("cost_last_calculated"),
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pr_product_idx").on(table.productId),
  index("pr_active_idx").on(table.isActive),
]);

export const insertProductRecipeSchema = createInsertSchema(productRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductRecipe = z.infer<typeof insertProductRecipeSchema>;
export type ProductRecipe = typeof productRecipes.$inferSelect;

// Reçete Hammaddeleri - Recipe Ingredients
export const productRecipeIngredients = pgTable("product_recipe_ingredients", {
  id: serial("id").primaryKey(),
  
  recipeId: integer("recipe_id").references(() => productRecipes.id, { onDelete: "cascade" }).notNull(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "restrict" }).notNull(),
  
  // Miktar bilgileri
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Hesaplanan maliyet
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 4 }).default("0"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pri_recipe_idx").on(table.recipeId),
  index("pri_material_idx").on(table.rawMaterialId),
]);

export const insertProductRecipeIngredientSchema = createInsertSchema(productRecipeIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertProductRecipeIngredient = z.infer<typeof insertProductRecipeIngredientSchema>;
export type ProductRecipeIngredient = typeof productRecipeIngredients.$inferSelect;

// Ürün Ambalaj Malzemeleri - Product Packaging Items
export const productPackagingItems = pgTable("product_packaging_items", {
  id: serial("id").primaryKey(),
  
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "set null" }),
  
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("adet"),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).default("1"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 4 }).notNull(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ppi_product_idx").on(table.productId),
]);

export const insertProductPackagingItemSchema = createInsertSchema(productPackagingItems).omit({
  id: true,
  createdAt: true,
});

export type InsertProductPackagingItem = z.infer<typeof insertProductPackagingItemSchema>;
export type ProductPackagingItem = typeof productPackagingItems.$inferSelect;

// Fabrika Maliyet Ayarları - Factory Cost Settings
export const factoryCostSettings = pgTable("factory_cost_settings", {
  id: serial("id").primaryKey(),
  
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: numeric("setting_value", { precision: 14, scale: 4 }).notNull(),
  description: text("description"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFactoryCostSettingSchema = createInsertSchema(factoryCostSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertFactoryCostSetting = z.infer<typeof insertFactoryCostSettingSchema>;
export type FactoryCostSetting = typeof factoryCostSettings.$inferSelect;

// Fabrika Sabit Giderleri - Factory Fixed Costs
export const fixedCostCategoryEnum = [
  "personel", "elektrik", "dogalgaz", "su", "kira", "sigorta", 
  "amortisman", "bakim_onarim", "temizlik", "guvenlik", "iletisim",
  "vergi", "diger"
] as const;
export type FixedCostCategory = typeof fixedCostCategoryEnum[number];

export const factoryFixedCosts = pgTable("factory_fixed_costs", {
  id: serial("id").primaryKey(),
  
  // Gider bilgileri
  category: varchar("category", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Tutar bilgileri
  monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 }).notNull(),
  annualAmount: numeric("annual_amount", { precision: 14, scale: 2 }),
  
  // Dağıtım yöntemi
  allocationMethod: varchar("allocation_method", { length: 50 }).default("production_volume"), // production_volume, direct_labor, machine_hours
  allocationPercentage: numeric("allocation_percentage", { precision: 5, scale: 2 }).default("100"),
  
  // Dönem bilgisi
  effectiveMonth: integer("effective_month"), // 1-12
  effectiveYear: integer("effective_year"),
  
  // Durum
  isRecurring: boolean("is_recurring").default(true),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ffc_category_idx").on(table.category),
  index("ffc_period_idx").on(table.effectiveYear, table.effectiveMonth),
]);

export const insertFactoryFixedCostSchema = createInsertSchema(factoryFixedCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryFixedCost = z.infer<typeof insertFactoryFixedCostSchema>;
export type FactoryFixedCost = typeof factoryFixedCosts.$inferSelect;

// Kar Marjı Şablonları - Profit Margin Templates
export const profitMarginTemplates = pgTable("profit_margin_templates", {
  id: serial("id").primaryKey(),
  
  // Şablon bilgileri
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // Ürün kategorisi
  
  // Marj bilgileri
  defaultMargin: numeric("default_margin", { precision: 5, scale: 2 }).notNull(), // Örn: 1.20 = %20 kar
  minimumMargin: numeric("minimum_margin", { precision: 5, scale: 2 }).default("1.01"),
  maximumMargin: numeric("maximum_margin", { precision: 5, scale: 2 }).default("2.00"),
  
  // Ek bilgiler
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pmt_category_idx").on(table.category),
]);

export const insertProfitMarginTemplateSchema = createInsertSchema(profitMarginTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProfitMarginTemplate = z.infer<typeof insertProfitMarginTemplateSchema>;
export type ProfitMarginTemplate = typeof profitMarginTemplates.$inferSelect;

// Ürün Maliyet Hesaplamaları - Product Cost Calculations (Geçmiş kayıtları)
export const productCostCalculations = pgTable("product_cost_calculations", {
  id: serial("id").primaryKey(),
  
  // Ürün ve reçete bağlantısı
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  recipeId: integer("recipe_id").references(() => productRecipes.id, { onDelete: "set null" }),
  
  // Hesaplama dönemi
  calculationDate: timestamp("calculation_date").defaultNow().notNull(),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  
  // Maliyet bileşenleri
  rawMaterialCost: numeric("raw_material_cost", { precision: 12, scale: 4 }).default("0"),
  directLaborCost: numeric("direct_labor_cost", { precision: 12, scale: 4 }).default("0"),
  energyCost: numeric("energy_cost", { precision: 12, scale: 4 }).default("0"),
  packagingCost: numeric("packaging_cost", { precision: 12, scale: 4 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Toplam maliyet
  totalUnitCost: numeric("total_unit_cost", { precision: 12, scale: 4 }).notNull(),
  totalPackageCost: numeric("total_package_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Fiyatlandırma
  appliedMargin: numeric("applied_margin", { precision: 5, scale: 2 }).default("1.01"),
  suggestedSellingPrice: numeric("suggested_selling_price", { precision: 12, scale: 2 }).default("0"),
  actualSellingPrice: numeric("actual_selling_price", { precision: 12, scale: 2 }).default("0"),
  
  // Kar bilgileri
  profitPerUnit: numeric("profit_per_unit", { precision: 12, scale: 4 }).default("0"),
  profitMarginPercentage: numeric("profit_margin_percentage", { precision: 5, scale: 2 }).default("0"),
  
  // Üretim miktarı (bu dönemdeki)
  productionQuantity: integer("production_quantity").default(0),
  
  notes: text("notes"),
  calculatedById: varchar("calculated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pcc_product_idx").on(table.productId),
  index("pcc_period_idx").on(table.periodYear, table.periodMonth),
  index("pcc_date_idx").on(table.calculationDate),
]);

export const insertProductCostCalculationSchema = createInsertSchema(productCostCalculations).omit({
  id: true,
  createdAt: true,
});

export type InsertProductCostCalculation = z.infer<typeof insertProductCostCalculationSchema>;
export type ProductCostCalculation = typeof productCostCalculations.$inferSelect;

// Üretim Kayıtları için Maliyet Takibi - Production Cost Tracking
export const productionCostTracking = pgTable("production_cost_tracking", {
  id: serial("id").primaryKey(),
  
  // Üretim bağlantısı
  productionRecordId: integer("production_record_id").references(() => productionRecords.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  
  // Üretim bilgileri
  productionDate: timestamp("production_date").defaultNow().notNull(),
  quantity: integer("quantity").notNull(),
  
  // Maliyet bilgileri
  rawMaterialCostPerUnit: numeric("raw_material_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  laborCostPerUnit: numeric("labor_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  overheadCostPerUnit: numeric("overhead_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  totalCostPerUnit: numeric("total_cost_per_unit", { precision: 12, scale: 4 }).notNull(),
  
  // Toplam maliyet
  totalProductionCost: numeric("total_production_cost", { precision: 14, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pct_product_idx").on(table.productId),
  index("pct_date_idx").on(table.productionDate),
  index("pct_production_idx").on(table.productionRecordId),
]);

export const insertProductionCostTrackingSchema = createInsertSchema(productionCostTracking).omit({
  id: true,
  createdAt: true,
});

export type InsertProductionCostTracking = z.infer<typeof insertProductionCostTrackingSchema>;
export type ProductionCostTracking = typeof productionCostTracking.$inferSelect;

export const rawMaterialPriceHistory = pgTable("raw_material_price_history", {
  id: serial("id").primaryKey(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  previousPrice: numeric("previous_price", { precision: 12, scale: 4 }),
  newPrice: numeric("new_price", { precision: 12, scale: 4 }).notNull(),
  changePercent: numeric("change_percent", { precision: 8, scale: 2 }),
  source: varchar("source", { length: 50 }).default("manual"),
  notes: text("notes"),
  changedBy: varchar("changed_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("rmph_material_idx").on(table.rawMaterialId),
  index("rmph_date_idx").on(table.createdAt),
  index("rmph_supplier_idx").on(table.supplierId),
]);

export const insertRawMaterialPriceHistorySchema = createInsertSchema(rawMaterialPriceHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertRawMaterialPriceHistory = z.infer<typeof insertRawMaterialPriceHistorySchema>;
export type RawMaterialPriceHistory = typeof rawMaterialPriceHistory.$inferSelect;

// Fabrika Cihazlar / Makineler - Factory Machines
export const factoryMachines = pgTable("factory_machines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  kwhConsumption: numeric("kwh_consumption", { precision: 10, scale: 3 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFactoryMachineSchema = createInsertSchema(factoryMachines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryMachine = z.infer<typeof insertFactoryMachineSchema>;
export type FactoryMachine = typeof factoryMachines.$inferSelect;

// Cihaz - Ürün İlişkisi - Machine-Product Mapping
export const machineProducts = pgTable("machine_products", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("mp_machine_idx").on(table.machineId),
  index("mp_product_idx").on(table.productId),
]);

// ========================================
// FABRIKA VARDİYA & ÜRETİM PLANLAMA SİSTEMİ
// ========================================

// Fabrika Vardiyaları - Factory Shifts (sabah/akşam/gece)
export const factoryShifts = pgTable("factory_shifts", {
  id: serial("id").primaryKey(),
  shiftDate: date("shift_date").notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // sabah, aksam, gece
  startTime: varchar("start_time", { length: 5 }).notNull(), // "06:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "14:00"
  status: varchar("status", { length: 20 }).default("planned").notNull(), // planned, active, completed, cancelled
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fs_date_idx").on(table.shiftDate),
  index("fs_type_idx").on(table.shiftType),
  index("fs_status_idx").on(table.status),
]);

export const insertFactoryShiftSchema = createInsertSchema(factoryShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryShift = z.infer<typeof insertFactoryShiftSchema>;
export type FactoryShift = typeof factoryShifts.$inferSelect;

// Vardiya Çalışan Atamaları - Shift Worker Assignments
export const factoryShiftWorkers = pgTable("factory_shift_workers", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => factoryShifts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  role: varchar("role", { length: 30 }).default("operator"), // operator, supervisor, kalite_kontrol, destek
  selfSelected: boolean("self_selected").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fsw_shift_idx").on(table.shiftId),
  index("fsw_user_idx").on(table.userId),
  index("fsw_machine_idx").on(table.machineId),
]);

export const insertFactoryShiftWorkerSchema = createInsertSchema(factoryShiftWorkers).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryShiftWorker = z.infer<typeof insertFactoryShiftWorkerSchema>;
export type FactoryShiftWorker = typeof factoryShiftWorkers.$inferSelect;

// Batch Spesifikasyonları - Her ürün+makine için standart batch tanımı
export const factoryBatchSpecs = pgTable("factory_batch_specs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchWeightKg: numeric("batch_weight_kg", { precision: 10, scale: 2 }).notNull(),
  batchWeightUnit: varchar("batch_weight_unit", { length: 10 }).default("kg").notNull(),
  expectedPieces: integer("expected_pieces").notNull(),
  pieceWeightGrams: numeric("piece_weight_grams", { precision: 10, scale: 2 }),
  pieceWeightUnit: varchar("piece_weight_unit", { length: 10 }).default("g").notNull(),
  targetDurationMinutes: integer("target_duration_minutes").notNull(),
  recipeId: integer("recipe_id"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fbs_product_idx").on(table.productId),
  index("fbs_machine_idx").on(table.machineId),
]);

export const insertFactoryBatchSpecSchema = createInsertSchema(factoryBatchSpecs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryBatchSpec = z.infer<typeof insertFactoryBatchSpecSchema>;
export type FactoryBatchSpec = typeof factoryBatchSpecs.$inferSelect;

// Vardiya Üretim Planları - Her vardiyada hangi üründen kaç batch üretilecek
export const factoryShiftProductions = pgTable("factory_shift_productions", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => factoryShifts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchSpecId: integer("batch_spec_id").references(() => factoryBatchSpecs.id, { onDelete: "set null" }),
  plannedBatchCount: integer("planned_batch_count").notNull().default(1),
  completedBatchCount: integer("completed_batch_count").default(0),
  status: varchar("status", { length: 20 }).default("planned").notNull(), // planned, in_progress, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fsp_shift_idx").on(table.shiftId),
  index("fsp_product_idx").on(table.productId),
]);

export const insertFactoryShiftProductionSchema = createInsertSchema(factoryShiftProductions).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryShiftProduction = z.infer<typeof insertFactoryShiftProductionSchema>;
export type FactoryShiftProduction = typeof factoryShiftProductions.$inferSelect;

// Üretim Batch'leri - Her batch'in başlangıç/bitiş süresi ve sonuçları
export const factoryProductionBatches = pgTable("factory_production_batches", {
  id: serial("id").primaryKey(),
  shiftProductionId: integer("shift_production_id").references(() => factoryShiftProductions.id, { onDelete: "set null" }),
  shiftId: integer("shift_id").references(() => factoryShifts.id, { onDelete: "set null" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchSpecId: integer("batch_spec_id").references(() => factoryBatchSpecs.id, { onDelete: "set null" }),
  operatorUserId: varchar("operator_user_id").references(() => users.id, { onDelete: "set null" }),
  batchNumber: integer("batch_number").default(1),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  actualWeightKg: numeric("actual_weight_kg", { precision: 10, scale: 2 }),
  actualPieces: integer("actual_pieces"),
  targetWeightKg: numeric("target_weight_kg", { precision: 10, scale: 2 }),
  targetPieces: integer("target_pieces"),
  targetDurationMinutes: integer("target_duration_minutes"),
  actualDurationMinutes: integer("actual_duration_minutes"),
  wasteWeightKg: numeric("waste_weight_kg", { precision: 10, scale: 2 }).default("0"),
  wastePieces: integer("waste_pieces").default(0),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id, { onDelete: "set null" }),
  wasteNotes: text("waste_notes"),
  expectedWastePercent: numeric("expected_waste_percent", { precision: 5, scale: 2 }),
  actualWastePercent: numeric("actual_waste_percent", { precision: 5, scale: 2 }),
  wasteDeviationPercent: numeric("waste_deviation_percent", { precision: 5, scale: 2 }),
  totalInputWeightKg: numeric("total_input_weight_kg", { precision: 10, scale: 2 }),
  totalOutputWeightKg: numeric("total_output_weight_kg", { precision: 10, scale: 2 }),
  wasteCostTl: numeric("waste_cost_tl", { precision: 12, scale: 2 }),
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  yieldRate: numeric("yield_rate", { precision: 5, scale: 2 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, completed, verified, rejected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fpb_shift_prod_idx").on(table.shiftProductionId),
  index("fpb_shift_idx").on(table.shiftId),
  index("fpb_product_idx").on(table.productId),
  index("fpb_operator_idx").on(table.operatorUserId),
  index("fpb_machine_idx").on(table.machineId),
  index("fpb_start_idx").on(table.startTime),
]);

export const insertFactoryProductionBatchSchema = createInsertSchema(factoryProductionBatches).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryProductionBatch = z.infer<typeof insertFactoryProductionBatchSchema>;
export type FactoryProductionBatch = typeof factoryProductionBatches.$inferSelect;

// Batch Doğrulama - Supervisor/kalite kontrol onayı
export const factoryBatchVerifications = pgTable("factory_batch_verifications", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => factoryProductionBatches.id, { onDelete: "cascade" }),
  verifierUserId: varchar("verifier_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  verifiedWeightKg: numeric("verified_weight_kg", { precision: 10, scale: 2 }),
  verifiedPieces: integer("verified_pieces"),
  verifiedWasteKg: numeric("verified_waste_kg", { precision: 10, scale: 2 }),
  verifiedWastePieces: integer("verified_waste_pieces"),
  isApproved: boolean("is_approved").notNull(),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fbv_batch_idx").on(table.batchId),
  index("fbv_verifier_idx").on(table.verifierUserId),
]);

// ========================================
// ROLE TASK TEMPLATES & COMPLETIONS
// ========================================

export const roleTaskTemplates = pgTable("role_task_templates", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 20 }).notNull().default("daily"),
  priority: integer("priority").notNull().default(2),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: varchar("icon", { length: 50 }),
  targetUrl: varchar("target_url", { length: 200 }),
  moduleLink: varchar("module_link", { length: 100 }),
  detailSteps: jsonb("detail_steps").$type<Array<{step: string; tip?: string}>>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("rtt_role_idx").on(table.role),
  index("rtt_frequency_idx").on(table.frequency),
]);

export const roleTaskCompletions = pgTable("role_task_completions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  templateId: integer("template_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  periodDate: varchar("period_date", { length: 10 }).notNull(),
  notes: text("notes"),
}, (table) => [
  index("rtc_user_idx").on(table.userId),
  index("rtc_template_idx").on(table.templateId),
  index("rtc_period_idx").on(table.periodDate),
]);

// ========================================
// STOCK COUNTS (Stok Sayım)
// ========================================

export const stockCounts = pgTable("stock_counts", {
  id: serial("id").primaryKey(),
  countType: varchar("count_type", { length: 20 }).notNull().default("raw_material"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  startedBy: varchar("started_by", { length: 255 }).notNull(),
  approvedBy: varchar("approved_by", { length: 255 }),
  assignedTo: varchar("assigned_to", { length: 255 }),
  requestedBy: varchar("requested_by", { length: 255 }),
  requestedCategory: varchar("requested_category", { length: 50 }),
  scope: varchar("scope", { length: 30 }).notNull().default("full"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sc_status_idx").on(table.status),
  index("sc_type_idx").on(table.countType),
]);

export const insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
export type InsertStockCount = z.infer<typeof insertStockCountSchema>;
export type StockCount = typeof stockCounts.$inferSelect;

// ========================================
// EVENT-TRIGGERED DYNAMIC TASKS
// ========================================

export const eventTriggeredTasks = pgTable("event_triggered_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  priority: integer("priority").notNull().default(2),
  targetUrl: varchar("target_url", { length: 300 }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceId: integer("source_id"),
  sourceLabel: varchar("source_label", { length: 200 }),
  isCompleted: boolean("is_completed").notNull().default(false),
  isAutoResolved: boolean("is_auto_resolved").notNull().default(false),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ett_user_idx").on(table.userId),
  index("ett_source_idx").on(table.sourceType, table.sourceId),
  index("ett_completed_idx").on(table.isCompleted),
  index("ett_expires_idx").on(table.expiresAt),
]);

// ========================================
// PROFESSIONAL TRAINING SYSTEM
// ========================================

export const professionalTrainingLessons = pgTable("professional_training_lessons", {
  id: serial("id").primaryKey(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  lessonIndex: integer("lesson_index").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  duration: integer("duration").notNull().default(15),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfessionalTrainingLessonSchema = createInsertSchema(professionalTrainingLessons).omit({ id: true, createdAt: true });
export type InsertProfessionalTrainingLesson = z.infer<typeof insertProfessionalTrainingLessonSchema>;
export type ProfessionalTrainingLesson = typeof professionalTrainingLessons.$inferSelect;

export const professionalTrainingProgress = pgTable("professional_training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  lessonIndex: integer("lesson_index").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfessionalTrainingProgressSchema = createInsertSchema(professionalTrainingProgress).omit({ id: true, createdAt: true });
export type InsertProfessionalTrainingProgress = z.infer<typeof insertProfessionalTrainingProgressSchema>;
export type ProfessionalTrainingProgress = typeof professionalTrainingProgress.$inferSelect;

export const professionalTrainingQuizCache = pgTable("professional_training_quiz_cache", {
  id: serial("id").primaryKey(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: serial("id").primaryKey(),
  stockCountId: integer("stock_count_id").notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(),
  itemId: integer("item_id").notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  expectedQuantity: varchar("expected_quantity", { length: 50 }).notNull().default("0"),
  countedQuantity: varchar("counted_quantity", { length: 50 }),
  unit: varchar("unit", { length: 20 }),
  difference: varchar("difference", { length: 50 }),
  notes: text("notes"),
}, (table) => [
  index("sci_count_idx").on(table.stockCountId),
]);

export const insertStockCountItemSchema = createInsertSchema(stockCountItems).omit({ id: true });
export type InsertStockCountItem = z.infer<typeof insertStockCountItemSchema>;
export type StockCountItem = typeof stockCountItems.$inferSelect;

// ========================================
// DASHBOARD WIDGET CONFIGURATION
// ========================================

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  widgetKey: varchar("widget_key", { length: 100 }).unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  widgetType: varchar("widget_type", { length: 50 }).notNull(),
  size: varchar("size", { length: 20 }).notNull().default("medium"),
  dataSource: varchar("data_source", { length: 100 }).notNull(),
  config: text("config"),
  roles: text("roles").array(),
  requiredPermissions: text("required_permissions").array().default([]),
  defaultRoles: text("default_roles").array().default([]),
  category: varchar("category", { length: 50 }).default("genel"),
  componentKey: varchar("component_key", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;

export const dashboardRoleWidgets = pgTable("dashboard_role_widgets", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  widgetKey: varchar("widget_key", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  defaultOpen: boolean("default_open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("dashboard_role_widgets_role_widget_key").on(table.role, table.widgetKey),
]);

export const insertDashboardRoleWidgetSchema = createInsertSchema(dashboardRoleWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardRoleWidget = z.infer<typeof insertDashboardRoleWidgetSchema>;
export type DashboardRoleWidget = typeof dashboardRoleWidgets.$inferSelect;

export const dashboardModuleVisibility = pgTable("dashboard_module_visibility", {
  id: serial("id").primaryKey(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  displayLocation: varchar("display_location", { length: 50 }).notNull().default("menu"),
  roles: text("roles").array(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardModuleVisibilitySchema = createInsertSchema(dashboardModuleVisibility).omit({ id: true, updatedAt: true });
export type InsertDashboardModuleVisibility = z.infer<typeof insertDashboardModuleVisibilitySchema>;
export type DashboardModuleVisibility = typeof dashboardModuleVisibility.$inferSelect;

// Management Reports (Yönetim Raporları)
export const managementReports = pgTable("management_reports", {
  id: serial("id").primaryKey(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  revenue: numeric("revenue", { precision: 12, scale: 2 }),
  expenses: numeric("expenses", { precision: 12, scale: 2 }),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }),
  employeeCount: integer("employee_count"),
  customerCount: integer("customer_count"),
  averageTicket: numeric("average_ticket", { precision: 8, scale: 2 }),
  notes: text("notes"),
  aiAnalysis: text("ai_analysis"),
  status: varchar("status", { length: 20 }).default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManagementReportSchema = createInsertSchema(managementReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManagementReport = z.infer<typeof insertManagementReportSchema>;
export type ManagementReport = typeof managementReports.$inferSelect;

export const franchiseProjects = pgTable("franchise_projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  franchiseeName: varchar("franchisee_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  location: varchar("location", { length: 500 }),
  city: varchar("city", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("sozlesme"),
  currentPhase: integer("current_phase").default(1),
  totalPhases: integer("total_phases").default(7),
  completionPercentage: integer("completion_percentage").default(0),
  estimatedBudget: numeric("estimated_budget", { precision: 12, scale: 2 }),
  actualBudget: numeric("actual_budget", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  branchId: integer("branch_id").references(() => branches.id),
  managerId: varchar("manager_id").references(() => users.id),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_projects_status_idx").on(table.status),
]);

export const insertFranchiseProjectSchema = createInsertSchema(franchiseProjects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseProject = z.infer<typeof insertFranchiseProjectSchema>;
export type FranchiseProject = typeof franchiseProjects.$inferSelect;

export const franchiseProjectPhases = pgTable("franchise_project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  phaseNumber: integer("phase_number").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  completionPercentage: integer("completion_percentage").default(0),
  dependsOnPhaseId: integer("depends_on_phase_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("franchise_phases_project_idx").on(table.projectId),
]);

export const insertFranchiseProjectPhaseSchema = createInsertSchema(franchiseProjectPhases).omit({ id: true, createdAt: true });
export type InsertFranchiseProjectPhase = z.infer<typeof insertFranchiseProjectPhaseSchema>;
export type FranchiseProjectPhase = typeof franchiseProjectPhases.$inferSelect;

export const franchiseProjectTasks = pgTable("franchise_project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").notNull().references(() => franchiseProjectPhases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedToCollaboratorId: integer("assigned_to_collaborator_id"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  raciResponsible: varchar("raci_responsible", { length: 255 }),
  raciAccountable: varchar("raci_accountable", { length: 255 }),
  raciConsulted: varchar("raci_consulted", { length: 500 }),
  raciInformed: varchar("raci_informed", { length: 500 }),
  dependsOnTaskId: integer("depends_on_task_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_tasks_project_idx").on(table.projectId),
  index("franchise_tasks_phase_idx").on(table.phaseId),
]);

export const insertFranchiseProjectTaskSchema = createInsertSchema(franchiseProjectTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseProjectTask = z.infer<typeof insertFranchiseProjectTaskSchema>;
export type FranchiseProjectTask = typeof franchiseProjectTasks.$inferSelect;

export const franchiseCollaborators = pgTable("franchise_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  specialty: varchar("specialty", { length: 255 }),
  accessToken: varchar("access_token", { length: 255 }),
  isActive: boolean("is_active").default(true),
  invitedAt: timestamp("invited_at").defaultNow(),
  lastAccessAt: timestamp("last_access_at"),
  notes: text("notes"),
}, (table) => [
  index("franchise_collaborators_project_idx").on(table.projectId),
]);

export const insertFranchiseCollaboratorSchema = createInsertSchema(franchiseCollaborators).omit({ id: true, invitedAt: true, lastAccessAt: true });
export type InsertFranchiseCollaborator = z.infer<typeof insertFranchiseCollaboratorSchema>;
export type FranchiseCollaborator = typeof franchiseCollaborators.$inferSelect;

export const franchiseProjectComments = pgTable("franchise_project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => franchiseProjectTasks.id, { onDelete: "cascade" }),
  authorUserId: varchar("author_user_id").references(() => users.id),
  authorCollaboratorId: integer("author_collaborator_id").references(() => franchiseCollaborators.id),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("franchise_comments_project_idx").on(table.projectId),
]);

export const insertFranchiseProjectCommentSchema = createInsertSchema(franchiseProjectComments).omit({ id: true, createdAt: true });
export type InsertFranchiseProjectComment = z.infer<typeof insertFranchiseProjectCommentSchema>;
export type FranchiseProjectComment = typeof franchiseProjectComments.$inferSelect;
