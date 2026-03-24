import { pgTable, serial, integer, numeric, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { branches } from "./schema-02";

export const branchMonthlySnapshots = pgTable("branch_monthly_snapshots", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  snapshotMonth: integer("snapshot_month").notNull(),
  snapshotYear: integer("snapshot_year").notNull(),
  staffCount: integer("staff_count").default(0),
  newHires: integer("new_hires").default(0),
  terminations: integer("terminations").default(0),
  turnoverRate: numeric("turnover_rate", { precision: 5, scale: 2 }).default("0"),
  attendanceRate: numeric("attendance_rate", { precision: 5, scale: 2 }).default("0"),
  lateCount: integer("late_count").default(0),
  leaveDaysUsed: integer("leave_days_used").default(0),
  taskTotal: integer("task_total").default(0),
  taskCompleted: integer("task_completed").default(0),
  taskCompletionRate: numeric("task_completion_rate", { precision: 5, scale: 2 }).default("0"),
  checklistCompletionRate: numeric("checklist_completion_rate", { precision: 5, scale: 2 }).default("0"),
  customerComplaints: integer("customer_complaints").default(0),
  customerAvgRating: numeric("customer_avg_rating", { precision: 3, scale: 2 }).default("0"),
  slaBreaches: integer("sla_breaches").default(0),
  ticketsTotal: integer("tickets_total").default(0),
  ticketsResolved: integer("tickets_resolved").default(0),
  avgResolutionHours: numeric("avg_resolution_hours", { precision: 8, scale: 2 }).default("0"),
  equipmentFaults: integer("equipment_faults").default(0),
  repeatFaults: integer("repeat_faults").default(0),
  avgRepairHours: numeric("avg_repair_hours", { precision: 8, scale: 2 }).default("0"),
  trainingCompletions: integer("training_completions").default(0),
  avgQuizScore: numeric("avg_quiz_score", { precision: 5, scale: 2 }).default("0"),
  certificatesIssued: integer("certificates_issued").default(0),
  costPayroll: numeric("cost_payroll", { precision: 12, scale: 2 }).default("0"),
  costSupplies: numeric("cost_supplies", { precision: 12, scale: 2 }).default("0"),
  costTotal: numeric("cost_total", { precision: 12, scale: 2 }).default("0"),
  revenueTotal: numeric("revenue_total", { precision: 12, scale: 2 }).default("0"),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }).default("0"),
  overallHealthScore: numeric("overall_health_score", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.branchId, table.snapshotMonth, table.snapshotYear),
  index("idx_branch_snapshot").on(table.branchId, table.snapshotYear, table.snapshotMonth),
]);

export const factoryMonthlySnapshots = pgTable("factory_monthly_snapshots", {
  id: serial("id").primaryKey(),
  snapshotMonth: integer("snapshot_month").notNull(),
  snapshotYear: integer("snapshot_year").notNull(),
  productionTotal: integer("production_total").default(0),
  productionTarget: integer("production_target").default(0),
  productionRate: numeric("production_rate", { precision: 5, scale: 2 }).default("0"),
  wasteRate: numeric("waste_rate", { precision: 5, scale: 2 }).default("0"),
  qcPassRate: numeric("qc_pass_rate", { precision: 5, scale: 2 }).default("0"),
  activeStations: integer("active_stations").default(0),
  shipmentsCount: integer("shipments_count").default(0),
  staffCount: integer("staff_count").default(0),
  avgWorkerScore: numeric("avg_worker_score", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.snapshotMonth, table.snapshotYear),
]);

export const insertBranchSnapshotSchema = createInsertSchema(branchMonthlySnapshots).omit({ id: true, createdAt: true });
export type InsertBranchSnapshot = z.infer<typeof insertBranchSnapshotSchema>;
export type BranchSnapshot = typeof branchMonthlySnapshots.$inferSelect;

export const insertFactorySnapshotSchema = createInsertSchema(factoryMonthlySnapshots).omit({ id: true, createdAt: true });
export type InsertFactorySnapshot = z.infer<typeof insertFactorySnapshotSchema>;
export type FactorySnapshot = typeof factoryMonthlySnapshots.$inferSelect;
