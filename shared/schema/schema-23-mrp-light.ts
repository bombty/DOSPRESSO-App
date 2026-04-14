// ========================================
// MRP-Light — Günlük Malzeme Çekme Sistemi
// 4 tablo: Plan, plan kalemleri, artan malzeme, çekme logu
// Akış: Üretim planı → malzeme ihtiyacı → depodan çekme → artan kayıt
// ========================================

import { pgTable, serial, varchar, text, integer, boolean, numeric, timestamp, date, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";
import { inventory } from "./schema-09";
import { factoryRecipes } from "./schema-22-factory-recipes";
import { sql } from "drizzle-orm";

// ────────────────────────────────────────
// 1. GÜNLÜK MALZEME PLANI (Ana kayıt)
// ────────────────────────────────────────

export const dailyMaterialPlans = pgTable("daily_material_plans", {
  id: serial("id").primaryKey(),
  planDate: date("plan_date").notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft | confirmed | in_progress | completed | cancelled

  // Onay
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  confirmedBy: varchar("confirmed_by").references(() => users.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

  // Özet (hesaplanır)
  totalItemCount: integer("total_item_count").default(0),
  totalPickedCount: integer("total_picked_count").default(0),
  totalCostEstimate: numeric("total_cost_estimate", { precision: 12, scale: 2 }),

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("dmp_date_unique").on(table.planDate),
  index("dmp_status_idx").on(table.status),
  index("dmp_date_idx").on(table.planDate),
]);

export const insertDailyMaterialPlanSchema = createInsertSchema(dailyMaterialPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type DailyMaterialPlan = typeof dailyMaterialPlans.$inferSelect;

// ────────────────────────────────────────
// 2. PLAN KALEMLERİ (Hangi malzeme ne kadar çekilecek)
// ────────────────────────────────────────

export const dailyMaterialPlanItems = pgTable("daily_material_plan_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => dailyMaterialPlans.id, { onDelete: "cascade" }),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),

  // Hangi reçete için (opsiyonel — toplu çekme de olabilir)
  recipeId: integer("recipe_id").references(() => factoryRecipes.id, { onDelete: "set null" }),
  batchCount: numeric("batch_count", { precision: 5, scale: 1 }), // kaç batch üretilecek

  // Miktar hesaplama
  requiredQuantity: numeric("required_quantity", { precision: 12, scale: 3 }).notNull(), // reçeteden hesaplanan toplam
  leftoverQuantity: numeric("leftover_quantity", { precision: 12, scale: 3 }).default("0"), // dünden kalan
  netPickQuantity: numeric("net_pick_quantity", { precision: 12, scale: 3 }).notNull(), // çekilmesi gereken = required - leftover
  actualPickedQuantity: numeric("actual_picked_quantity", { precision: 12, scale: 3 }), // gerçek çekilen
  unit: varchar("unit", { length: 20 }).notNull(),

  // Durum
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | picked | verified | short | cancelled

  // Kim çekti
  pickedBy: varchar("picked_by").references(() => users.id, { onDelete: "set null" }),
  pickedAt: timestamp("picked_at", { withTimezone: true }),

  // Kim doğruladı (operatör teslim alma)
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("dmpi_plan_idx").on(table.planId),
  index("dmpi_inventory_idx").on(table.inventoryId),
  index("dmpi_recipe_idx").on(table.recipeId),
  index("dmpi_status_idx").on(table.status),
]);

export const insertDailyMaterialPlanItemSchema = createInsertSchema(dailyMaterialPlanItems).omit({ id: true, createdAt: true });
export type DailyMaterialPlanItem = typeof dailyMaterialPlanItems.$inferSelect;

// ────────────────────────────────────────
// 3. ÜRETİM ALANI ARTAN MALZEME
// ────────────────────────────────────────

export const productionAreaLeftovers = pgTable("production_area_leftovers", {
  id: serial("id").primaryKey(),
  recordDate: date("record_date").notNull(),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),

  // Miktar
  remainingQuantity: numeric("remaining_quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),

  // Durum değerlendirmesi
  condition: varchar("condition", { length: 20 }).default("good").notNull(), // good | marginal | unusable
  storageTemp: numeric("storage_temp", { precision: 4, scale: 1 }), // °C kaydı — soğuk zincir kontrolü
  expiryRisk: boolean("expiry_risk").default(false), // raf ömrü yaklaşıyor mu

  // Sistem tarafından hesaplanan
  usableForRecipes: jsonb("usable_for_recipes").$type<Array<{
    recipeId: number;
    recipeName: string;
    requiredAmount: number;
    canCover: boolean; // artan yeterli mi
  }>>().default(sql`'[]'::jsonb`),

  // Ertesi gün kullanım takibi
  usedInNextDay: boolean("used_in_next_day").default(false),
  usedQuantity: numeric("used_quantity", { precision: 12, scale: 3 }),
  wastedQuantity: numeric("wasted_quantity", { precision: 12, scale: 3 }),
  wasteReason: text("waste_reason"),

  // Kim kaydetti, kim doğruladı
  recordedBy: varchar("recorded_by").references(() => users.id, { onDelete: "set null" }),
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }), // gıda mühendisi doğrulama
  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pal_date_idx").on(table.recordDate),
  index("pal_inventory_idx").on(table.inventoryId),
  index("pal_condition_idx").on(table.condition),
  unique("pal_date_inventory_unique").on(table.recordDate, table.inventoryId),
]);

export const insertProductionAreaLeftoverSchema = createInsertSchema(productionAreaLeftovers).omit({ id: true, createdAt: true });
export type ProductionAreaLeftover = typeof productionAreaLeftovers.$inferSelect;

// ────────────────────────────────────────
// 4. MALZEME ÇEKME LOGU (Audit trail)
// ────────────────────────────────────────

export const materialPickLogs = pgTable("material_pick_logs", {
  id: serial("id").primaryKey(),
  planItemId: integer("plan_item_id").references(() => dailyMaterialPlanItems.id, { onDelete: "set null" }),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),

  // Miktar
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),

  // Lokasyon
  fromLocation: varchar("from_location", { length: 50 }).notNull(), // depo_ana | depo_soguk | depo_kuru
  toLocation: varchar("to_location", { length: 50 }).default("uretim_alani").notNull(), // uretim_alani | hazirlik_masasi

  // LOT & FEFO
  lotNumber: varchar("lot_number", { length: 100 }),
  expiryDate: date("expiry_date"), // FEFO — en yakın SKT önce çekilir

  // Kim
  pickedBy: varchar("picked_by").references(() => users.id, { onDelete: "set null" }),
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),

  // Stok hareketi bağlantısı
  movementId: integer("movement_id"), // → inventory_movements.id (sonradan bağlanır)

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("mpl_plan_item_idx").on(table.planItemId),
  index("mpl_inventory_idx").on(table.inventoryId),
  index("mpl_date_idx").on(table.createdAt),
  index("mpl_from_loc_idx").on(table.fromLocation),
]);

export const insertMaterialPickLogSchema = createInsertSchema(materialPickLogs).omit({ id: true, createdAt: true });
export type MaterialPickLog = typeof materialPickLogs.$inferSelect;
