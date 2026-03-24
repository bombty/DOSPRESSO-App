import { pgTable, serial, varchar, integer, text, boolean, timestamp, date, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { factoryProducts } from "./schema-08";

export const productionResponsibilities = pgTable("production_responsibilities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("uretim_sefi"),
  isPrimary: boolean("is_primary").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_prod_resp_user").on(table.userId),
  index("idx_prod_resp_product").on(table.productId),
]);

export const insertProductionResponsibilitySchema = createInsertSchema(productionResponsibilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductionResponsibility = z.infer<typeof insertProductionResponsibilitySchema>;
export type ProductionResponsibility = typeof productionResponsibilities.$inferSelect;

export const weeklyProductionPlans = pgTable("weekly_production_plans", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  createdBy: varchar("created_by").notNull(),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  copiedFromId: integer("copied_from_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_weekly_plan_week").on(table.weekStart),
]);

export const insertWeeklyProductionPlanSchema = createInsertSchema(weeklyProductionPlans).omit({
  id: true,
  approvedBy: true,
  approvedAt: true,
  copiedFromId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWeeklyProductionPlan = z.infer<typeof insertWeeklyProductionPlanSchema>;
export type WeeklyProductionPlan = typeof weeklyProductionPlans.$inferSelect;

export const productionPlanItems = pgTable("production_plan_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => weeklyProductionPlans.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  unit: varchar("unit", { length: 20 }).notNull().default("adet"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_plan_items_plan").on(table.planId),
  index("idx_plan_items_product").on(table.productId),
]);

export const insertProductionPlanItemSchema = createInsertSchema(productionPlanItems).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionPlanItem = z.infer<typeof insertProductionPlanItemSchema>;
export type ProductionPlanItem = typeof productionPlanItems.$inferSelect;

export const dailyProductionRecords = pgTable("daily_production_records", {
  id: serial("id").primaryKey(),
  planItemId: integer("plan_item_id").references(() => productionPlanItems.id, { onDelete: "set null" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  recordDate: date("record_date").notNull(),
  producedQuantity: numeric("produced_quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  wasteQuantity: numeric("waste_quantity", { precision: 12, scale: 2 }).default("0"),
  wasteReason: text("waste_reason"),
  unit: varchar("unit", { length: 20 }).notNull().default("adet"),
  recordedBy: varchar("recorded_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_daily_records_date").on(table.recordDate),
  index("idx_daily_records_product").on(table.productId),
]);

export const insertDailyProductionRecordSchema = createInsertSchema(dailyProductionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDailyProductionRecord = z.infer<typeof insertDailyProductionRecordSchema>;
export type DailyProductionRecord = typeof dailyProductionRecords.$inferSelect;
