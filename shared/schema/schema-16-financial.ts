import { pgTable, serial, integer, numeric, varchar, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { branches } from "./schema-02";

export const branchFinancialSummary = pgTable("branch_financial_summary", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  revenueTotal: numeric("revenue_total", { precision: 12, scale: 2 }).default("0"),
  revenueSource: varchar("revenue_source", { length: 20 }).default("manual"),
  costPayroll: numeric("cost_payroll", { precision: 12, scale: 2 }).default("0"),
  staffCount: integer("staff_count").default(0),
  costPerEmployee: numeric("cost_per_employee", { precision: 10, scale: 2 }).default("0"),
  costSupplies: numeric("cost_supplies", { precision: 12, scale: 2 }).default("0"),
  costRent: numeric("cost_rent", { precision: 12, scale: 2 }).default("0"),
  costUtilities: numeric("cost_utilities", { precision: 12, scale: 2 }).default("0"),
  costOther: numeric("cost_other", { precision: 12, scale: 2 }).default("0"),
  costMaintenance: numeric("cost_maintenance", { precision: 12, scale: 2 }).default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).default("0"),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).default("0"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  calculatedBy: varchar("calculated_by", { length: 36 }),
  notes: text("notes"),
}, (table) => ({
  branchPeriodUnique: unique().on(table.branchId, table.periodMonth, table.periodYear),
  branchFinancialIdx: index("idx_branch_financial").on(table.branchId, table.periodYear, table.periodMonth),
}));

export const insertBranchFinancialSummarySchema = createInsertSchema(branchFinancialSummary).omit({
  id: true,
  calculatedAt: true,
});

export type InsertBranchFinancialSummary = z.infer<typeof insertBranchFinancialSummarySchema>;
export type BranchFinancialSummary = typeof branchFinancialSummary.$inferSelect;
