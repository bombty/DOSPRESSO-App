import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const UserRole = {
  // HQ Roles
  MUHASEBE: "muhasebe",
  SATINALMA: "satinalma", 
  COACH: "coach",
  TEKNIK: "teknik",
  DESTEK: "destek",
  FABRIKA: "fabrika",
  YATIRIMCI: "yatirimci",
  // Branch Roles
  SUPERVISOR: "supervisor",
  BARISTA: "barista",
  STAJYER: "stajyer",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Branches table (declared first since users references it)
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table (Replit Auth compatible)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default(UserRole.BARISTA),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Checklists table
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // daily, weekly, monthly
  category: varchar("category", { length: 100 }), // opening, closing, cleaning, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

// Checklist Tasks (many-to-many between checklists and task templates)
export const checklistTasks = pgTable("checklist_tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  requiresPhoto: boolean("requires_photo").default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({
  id: true,
  createdAt: true,
});

export type InsertChecklistTask = z.infer<typeof insertChecklistTaskSchema>;
export type ChecklistTask = typeof checklistTasks.$inferSelect;

// Tasks table (actual task instances)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklistTaskId: integer("checklist_task_id").references(() => checklistTasks.id, { onDelete: "set null" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"), // beklemede, tamamlandi, gecikmiş
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiScore: integer("ai_score"), // 0-100
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Equipment Faults table
export const equipmentFaults = pgTable("equipment_faults", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  equipmentName: varchar("equipment_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiSeverity: varchar("ai_severity", { length: 50 }), // low, medium, high, critical
  aiRecommendations: text("ai_recommendations").array(),
  status: varchar("status", { length: 50 }).notNull().default("acik"), // acik, devam_ediyor, cozuldu
  priority: varchar("priority", { length: 50 }).default("orta"), // dusuk, orta, yuksek
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentFaultSchema = createInsertSchema(equipmentFaults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentFault = z.infer<typeof insertEquipmentFaultSchema>;
export type EquipmentFault = typeof equipmentFaults.$inferSelect;

// Knowledge Base Articles table
export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // sop, recipe, maintenance, training
  content: text("content").notNull(),
  tags: text("tags").array(),
  attachmentUrls: text("attachment_urls").array(),
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseArticle = z.infer<typeof insertKnowledgeBaseArticleSchema>;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Performance Metrics table
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksTotal: integer("tasks_total").default(0),
  completionRate: integer("completion_rate").default(0), // percentage
  averageAiScore: integer("average_ai_score").default(0),
  faultsReported: integer("faults_reported").default(0),
  faultsResolved: integer("faults_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;

// Relations (defined after all tables to avoid temporal dead zone)
export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  faults: many(equipmentFaults),
  metrics: many(performanceMetrics),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  tasksCreated: many(tasks),
  faultsReported: many(equipmentFaults),
}));

export const checklistsRelations = relations(checklists, ({ many }) => ({
  checklistTasks: many(checklistTasks),
}));

export const checklistTasksRelations = relations(checklistTasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistTasks.checklistId],
    references: [checklists.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [tasks.checklistId],
    references: [checklists.id],
  }),
  checklistTask: one(checklistTasks, {
    fields: [tasks.checklistTaskId],
    references: [checklistTasks.id],
  }),
  branch: one(branches, {
    fields: [tasks.branchId],
    references: [branches.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
}));

export const equipmentFaultsRelations = relations(equipmentFaults, ({ one }) => ({
  branch: one(branches, {
    fields: [equipmentFaults.branchId],
    references: [branches.id],
  }),
  reportedBy: one(users, {
    fields: [equipmentFaults.reportedById],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, {
    fields: [reminders.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  branch: one(branches, {
    fields: [performanceMetrics.branchId],
    references: [branches.id],
  }),
}));
