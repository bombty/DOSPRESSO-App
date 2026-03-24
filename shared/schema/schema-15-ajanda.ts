import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './schema-02';

export const userTodos = pgTable("user_todos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  dueTime: varchar("due_time", { length: 5 }),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  source: varchar("source", { length: 30 }).default("manual").notNull(),
  sourceId: varchar("source_id", { length: 50 }),
  sourceUrl: varchar("source_url", { length: 200 }),
  tags: text("tags").array(),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 30 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_user_todos_user").on(table.userId, table.status, table.dueDate),
  index("idx_user_todos_source").on(table.source, table.sourceId),
]);

export const insertUserTodoSchema = createInsertSchema(userTodos).omit({
  id: true, createdAt: true, updatedAt: true, completedAt: true, archivedAt: true,
});
export type UserTodo = typeof userTodos.$inferSelect;
export type InsertUserTodo = z.infer<typeof insertUserTodoSchema>;

export const userCalendarEvents = pgTable("user_calendar_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  allDay: boolean("all_day").default(false),
  eventType: varchar("event_type", { length: 30 }).default("meeting").notNull(),
  location: text("location"),
  color: varchar("color", { length: 20 }),
  relatedEntityType: varchar("related_entity_type", { length: 30 }),
  relatedEntityId: varchar("related_entity_id", { length: 50 }),
  relatedEntityUrl: varchar("related_entity_url", { length: 200 }),
  recurrence: varchar("recurrence", { length: 30 }).default("none"),
  reminderMinutes: integer("reminder_minutes").default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_user_calendar_user").on(table.userId, table.startTime),
]);

export const insertUserCalendarEventSchema = createInsertSchema(userCalendarEvents).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type UserCalendarEvent = typeof userCalendarEvents.$inferSelect;
export type InsertUserCalendarEvent = z.infer<typeof insertUserCalendarEventSchema>;

export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  title: varchar("title", { length: 300 }),
  content: text("content").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 30 }),
  relatedEntityId: varchar("related_entity_id", { length: 50 }),
  relatedEntityName: varchar("related_entity_name", { length: 200 }),
  tags: text("tags").array(),
  isPinned: boolean("is_pinned").default(false),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_user_notes_user").on(table.userId, table.isPinned, table.updatedAt),
]);

export const insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = z.infer<typeof insertUserNoteSchema>;

export const NOTIFICATION_CATEGORY_KEYS = [
  'tasks', 'crm', 'stock', 'dobody', 'faults', 'checklist', 'training', 'hr'
] as const;
export type NotificationCategoryKey = typeof NOTIFICATION_CATEGORY_KEYS[number];

export const NOTIFICATION_FREQUENCY_OPTIONS = ['instant', 'daily_digest', 'off'] as const;
export type NotificationFrequency = typeof NOTIFICATION_FREQUENCY_OPTIONS[number];

export const notificationPolicies = pgTable("notification_policies", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  defaultFrequency: varchar("default_frequency", { length: 20 }).notNull().default("instant"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_notif_policies_role").on(table.role, table.category),
]);

export const insertNotificationPolicySchema = createInsertSchema(notificationPolicies).omit({
  id: true, updatedAt: true,
});
export type NotificationPolicy = typeof notificationPolicies.$inferSelect;
export type InsertNotificationPolicy = z.infer<typeof insertNotificationPolicySchema>;

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull().default("instant"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_notif_prefs_user").on(table.userId, table.category),
]);

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true, updatedAt: true,
});
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

export const notificationDigestQueue = pgTable("notification_digest_queue", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  branchId: integer("branch_id"),
  category: varchar("category", { length: 50 }).notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_digest_queue_user").on(table.userId, table.processed),
]);

export const insertNotificationDigestQueueSchema = createInsertSchema(notificationDigestQueue).omit({
  id: true, createdAt: true,
});
export type NotificationDigestQueue = typeof notificationDigestQueue.$inferSelect;
export type InsertNotificationDigestQueue = z.infer<typeof insertNotificationDigestQueueSchema>;

export const dobodyActionTemplates = pgTable("dobody_action_templates", {
  id: serial("id").primaryKey(),
  templateKey: varchar("template_key", { length: 100 }).notNull().unique(),
  labelTr: varchar("label_tr", { length: 200 }).notNull(),
  messageTemplate: text("message_template").notNull(),
  defaultActionType: varchar("default_action_type", { length: 30 }).notNull().default("send_notification"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDobodyActionTemplateSchema = createInsertSchema(dobodyActionTemplates).omit({
  id: true, createdAt: true,
});
export type DobodyActionTemplate = typeof dobodyActionTemplates.$inferSelect;
export type InsertDobodyActionTemplate = z.infer<typeof insertDobodyActionTemplateSchema>;
