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

export const branchRecurringTasks = pgTable("branch_recurring_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("genel"),
  branchId: integer("branch_id").references(() => branches.id),
  recurrenceType: varchar("recurrence_type", { length: 20 }).notNull(),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  specificDate: date("specific_date"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  createdByRole: varchar("created_by_role", { length: 50 }).notNull(),
  photoRequired: boolean("photo_required").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBranchRecurringTaskSchema = createInsertSchema(branchRecurringTasks).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type BranchRecurringTask = typeof branchRecurringTasks.$inferSelect;
export type InsertBranchRecurringTask = z.infer<typeof insertBranchRecurringTaskSchema>;

export const branchTaskInstances = pgTable("branch_task_instances", {
  id: serial("id").primaryKey(),
  recurringTaskId: integer("recurring_task_id").references(() => branchRecurringTasks.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  claimedByUserId: varchar("claimed_by_user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  completedByUserId: varchar("completed_by_user_id").references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionNote: text("completion_note"),
  photoUrl: text("photo_url"),
  isOverdue: boolean("is_overdue").default(false).notNull(),
  originalDueDate: date("original_due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBranchTaskInstanceSchema = createInsertSchema(branchTaskInstances).omit({ id: true, createdAt: true, updatedAt: true });
export type BranchTaskInstance = typeof branchTaskInstances.$inferSelect;
export type InsertBranchTaskInstance = z.infer<typeof insertBranchTaskInstanceSchema>;

export const branchRecurringTaskOverrides = pgTable("branch_recurring_task_overrides", {
  id: serial("id").primaryKey(),
  recurringTaskId: integer("recurring_task_id").references(() => branchRecurringTasks.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  isDisabled: boolean("is_disabled").notNull().default(true),
  disabledByUserId: varchar("disabled_by_user_id").references(() => users.id).notNull(),
  disabledByRole: varchar("disabled_by_role", { length: 50 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertBranchRecurringTaskOverrideSchema = createInsertSchema(branchRecurringTaskOverrides).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type BranchRecurringTaskOverride = typeof branchRecurringTaskOverrides.$inferSelect;
export type InsertBranchRecurringTaskOverride = z.infer<typeof insertBranchRecurringTaskOverrideSchema>;

export const kioskSessions = pgTable("kiosk_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stationId: integer("station_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_kiosk_sessions_token").on(table.token),
  index("idx_kiosk_sessions_user").on(table.userId),
  index("idx_kiosk_sessions_expires").on(table.expiresAt),
]);
export type KioskSession = typeof kioskSessions.$inferSelect;

export const guidanceDismissals = pgTable("guidance_dismissals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  guidanceId: varchar("guidance_id", { length: 100 }).notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_guidance_dismissals_unique").on(table.userId, table.guidanceId),
]);
