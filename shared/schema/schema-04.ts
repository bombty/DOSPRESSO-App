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

import { UserRole } from './schema-01';
import { Branch, Equipment, branches, checklists, equipment, tasks, users } from './schema-02';
import { Shift } from './schema-03';

// Menu Sections table
export const menuSections = pgTable("menu_sections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMenuSectionSchema = createInsertSchema(menuSections).omit({
  id: true,
});

export type InsertMenuSection = z.infer<typeof insertMenuSectionSchema>;
export type MenuSection = typeof menuSections.$inferSelect;

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => menuSections.id, { onDelete: "cascade" }),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  path: varchar("path", { length: 200 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  moduleKey: varchar("module_key", { length: 100 }),
  scope: varchar("scope", { length: 20 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Menu Visibility Rules table
export const menuVisibilityRules = pgTable("menu_visibility_rules", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ruleType: varchar("rule_type", { length: 20 }).notNull(),
  role: varchar("role", { length: 50 }),
  userId: varchar("user_id").references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  allow: boolean("allow").notNull().default(true),
});

export const insertMenuVisibilityRuleSchema = createInsertSchema(menuVisibilityRules).omit({
  id: true,
});

export type InsertMenuVisibilityRule = z.infer<typeof insertMenuVisibilityRuleSchema>;
export type MenuVisibilityRule = typeof menuVisibilityRules.$inferSelect;

// Menu Relations
// Page Content (Markdown-based CMS)
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("page_content_slug_idx").on(table.slug),
]);

export const insertPageContentSchema = createInsertSchema(pageContent).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string()
    .min(1, "Slug gerekli")
    .max(255, "Slug çok uzun")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, sayı ve tire içermeli"),
  title: z.string().min(1, "Başlık gerekli").max(500, "Başlık çok uzun"),
  content: z.string().min(1, "İçerik gerekli"),
  publishedAt: z.string().datetime().optional().nullable(),
});

export type InsertPageContent = z.infer<typeof insertPageContentSchema>;
export type PageContent = typeof pageContent.$inferSelect;

// AI Summary types for HQ Dashboard
export const SummaryCategory = z.enum(["personel", "cihazlar", "gorevler"]);
export type SummaryCategoryType = z.infer<typeof SummaryCategory>;

export const aiSummaryRequestSchema = z.object({
  category: SummaryCategory,
});

export type AISummaryRequest = z.infer<typeof aiSummaryRequestSchema>;

export const aiSummaryResponseSchema = z.object({
  summary: z.string(),
  cached: z.boolean(),
  generatedAt: z.string(), // ISO timestamp
  category: SummaryCategory,
  scope: z.object({
    branchId: z.number().optional(),
    branchName: z.string().optional(),
  }).optional(),
});

export type AISummaryResponse = z.infer<typeof aiSummaryResponseSchema>;

// ========================================
// AI USAGE LOGS - Cost Monitoring
// ========================================

export const AIFeature = z.enum([
  "task_photo", 
  "fault_photo", 
  "cleanliness", 
  "dress_code", 
  "rag_chat", 
  "summary"
]);
export type AIFeatureType = z.infer<typeof AIFeature>;

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  feature: varchar("feature", { length: 50 }).notNull(), // task_photo, fault_photo, cleanliness, dress_code, rag_chat, summary
  model: varchar("model", { length: 100 }).notNull(), // gpt-4o, gpt-4o-mini, text-embedding-3-small
  operation: varchar("operation", { length: 100 }).notNull(), // e.g., "analyzeTaskPhoto", "generateEmbedding"
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  requestLatencyMs: integer("request_latency_ms").notNull().default(0),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cachedHit: boolean("cached_hit").default(false).notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("ai_usage_logs_created_at_idx").on(table.createdAt),
  index("ai_usage_logs_feature_idx").on(table.feature),
  index("ai_usage_logs_user_id_idx").on(table.userId),
  index("ai_usage_logs_branch_id_idx").on(table.branchId),
]);

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ========================================
// BRANDING CONFIGURATION
// ========================================

// Branding table - Company logo and branding assets (singleton pattern)
export const branding = pgTable("branding", {
  id: serial("id").primaryKey(),
  logoUrl: text("logo_url"), // Public S3 URL for company logo
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandingSchema = createInsertSchema(branding).omit({
  id: true,
  updatedAt: true,
});

export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;

// ========================================
// QUALITY AUDITS (Kalite Denetimi) - Enhanced unified system
// ========================================

// Audit Templates - Reusable audit checklists for both branch and personnel
export const auditTemplates = pgTable("audit_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Keeping old column name for compatibility
  description: text("description"),
  auditType: varchar("audit_type", { length: 20 }), // nullable for backward compat, 'branch' or 'personnel'
  category: varchar("category", { length: 50 }).notNull(), // cleanliness, service, knowledge, dress_code, etc.
  isActive: boolean("is_active").notNull().default(true),
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  aiAnalysisEnabled: boolean("ai_analysis_enabled").notNull().default(false),
  createdById: varchar("created_by_id").notNull().references(() => users.id), // Keeping old column name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("audit_templates_type_idx").on(table.auditType),
  index("audit_templates_category_idx").on(table.category),
]);

export const insertAuditTemplateSchema = createInsertSchema(auditTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditTemplate = z.infer<typeof insertAuditTemplateSchema>;
export type AuditTemplate = typeof auditTemplates.$inferSelect;

// Audit Template Items - Individual checklist items
export const auditTemplateItems = pgTable("audit_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id, { onDelete: "cascade" }),
  itemText: text("item_text").notNull(),
  maxPoints: integer("max_points").notNull().default(10), // Legacy field kept for backward compat
  sortOrder: integer("sort_order").notNull().default(0),
  // NEW fields for enhanced audit system
  itemType: varchar("item_type", { length: 20 }), // checkbox, rating, text, photo, multiple_choice - nullable for backwards compat
  weight: numeric("weight", { precision: 5, scale: 2 }), // Scoring weight as percentage (e.g., 6.25) - nullable
  section: varchar("section", { length: 30 }), // gida_guvenligi, urun_standardi, servis, operasyon, marka, ekipman
  requiresPhoto: boolean("requires_photo"), // nullable
  aiCheckEnabled: boolean("ai_check_enabled"), // nullable
  aiPrompt: text("ai_prompt"), // Custom AI analysis prompt for this item
  // For multiple choice questions (personnel audits)
  options: text("options").array(), // Multiple choice options - nullable
  correctAnswer: text("correct_answer"), // Correct answer for test questions - nullable
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_template_items_template_idx").on(table.templateId),
]);

export const insertAuditTemplateItemSchema = createInsertSchema(auditTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditTemplateItem = z.infer<typeof insertAuditTemplateItemSchema>;
export type AuditTemplateItem = typeof auditTemplateItems.$inferSelect;

// Quality Audits - Legacy table kept for backward compatibility, links to new audit instances
export const qualityAudits = pgTable("quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull(),
  totalScore: integer("total_score").notNull().default(0),
  maxPossibleScore: integer("max_possible_score").notNull().default(0),
  percentageScore: integer("percentage_score").notNull().default(0), // 0-100
  // Section scores (weighted percentages)
  gidaGuvenligiScore: integer("gida_guvenligi_score"), // Food Safety score 0-100
  urunStandardiScore: integer("urun_standardi_score"), // Product Standard score 0-100
  servisScore: integer("servis_score"), // Service score 0-100
  operasyonScore: integer("operasyon_score"), // Operations score 0-100
  markaScore: integer("marka_score"), // Brand score 0-100
  ekipmanScore: integer("ekipman_score"), // Equipment score 0-100
  weightedTotalScore: integer("weighted_total_score"), // Final weighted score 0-100
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  notes: text("notes"),
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quality_audits_branch_idx").on(table.branchId),
  index("quality_audits_auditor_idx").on(table.auditorId),
  index("quality_audits_date_idx").on(table.auditDate),
]);

export const insertQualityAuditSchema = createInsertSchema(qualityAudits, {
  auditDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({
  id: true,
  createdAt: true,
  auditorId: true,
});

export type InsertQualityAudit = z.infer<typeof insertQualityAuditSchema>;
export type QualityAudit = typeof qualityAudits.$inferSelect;

// Audit Item Scores - Legacy table
export const auditItemScores = pgTable("audit_item_scores", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => qualityAudits.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  scoreGiven: integer("score_given").notNull(),
  notes: text("notes"),
}, (table) => [
  index("audit_item_scores_audit_idx").on(table.auditId),
]);

export const insertAuditItemScoreSchema = createInsertSchema(auditItemScores).omit({
  id: true,
});

export type InsertAuditItemScore = z.infer<typeof insertAuditItemScoreSchema>;
export type AuditItemScore = typeof auditItemScores.$inferSelect;

// Audit Section Constants - 6 weighted sections for quality audits
export const AUDIT_SECTIONS = {
  gida_guvenligi: { label: "Gıda Güvenliği", weight: 25, color: "red" },
  urun_standardi: { label: "Ürün Standardı", weight: 25, color: "orange" },
  servis: { label: "Servis", weight: 15, color: "blue" },
  operasyon: { label: "Operasyon", weight: 15, color: "green" },
  marka: { label: "Marka", weight: 10, color: "purple" },
  ekipman: { label: "Ekipman", weight: 10, color: "gray" },
} as const;

export type AuditSection = keyof typeof AUDIT_SECTIONS;

// Branch Audit Scores - Aggregated audit scores per branch per period
export const branchAuditScores = pgTable("branch_audit_scores", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  auditCount: integer("audit_count").notNull().default(0),
  // Section averages (0-100)
  gidaGuvenligiAvg: integer("gida_guvenligi_avg"),
  urunStandardiAvg: integer("urun_standardi_avg"),
  servisAvg: integer("servis_avg"),
  operasyonAvg: integer("operasyon_avg"),
  markaAvg: integer("marka_avg"),
  ekipmanAvg: integer("ekipman_avg"),
  // Overall weighted average
  overallScore: integer("overall_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_audit_scores_branch_idx").on(table.branchId),
  index("branch_audit_scores_period_idx").on(table.periodType, table.periodStart),
]);

export const insertBranchAuditScoreSchema = createInsertSchema(branchAuditScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchAuditScore = z.infer<typeof insertBranchAuditScoreSchema>;
export type BranchAuditScore = typeof branchAuditScores.$inferSelect;

// NEW: Audit Instances - Unified audit execution for both branch and personnel
export const auditInstances = pgTable("audit_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditType: varchar("audit_type", { length: 20 }).notNull(), // 'branch' or 'personnel'
  
  // Target (either branch or personnel)
  branchId: integer("branch_id").references(() => branches.id),
  userId: varchar("user_id").references(() => users.id), // For personnel audits
  
  // Audit metadata
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  
  // Scoring
  totalScore: integer("total_score"), // Calculated from items (0-100)
  maxScore: integer("max_score"), // Maximum possible score
  
  // Overall notes
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instances_template_idx").on(table.templateId),
  index("audit_instances_branch_idx").on(table.branchId),
  index("audit_instances_user_idx").on(table.userId),
  index("audit_instances_auditor_idx").on(table.auditorId),
  index("audit_instances_date_idx").on(table.auditDate),
]);

export const insertAuditInstanceSchema = createInsertSchema(auditInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstance = z.infer<typeof insertAuditInstanceSchema>;
export type AuditInstance = typeof auditInstances.$inferSelect;

// NEW: Audit Instance Items - Individual responses in an audit
export const auditInstanceItems = pgTable("audit_instance_items", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => auditInstances.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  
  // Response data
  response: text("response"), // Checkbox: 'yes'/'no', Rating: '1-5', Text: actual text
  score: integer("score"), // 0-100 for this item
  
  // Notes and photos
  notes: text("notes"),
  photoUrl: text("photo_url"),
  
  // AI analysis results
  aiAnalysisStatus: varchar("ai_analysis_status", { length: 20 }), // pending, completed, failed
  aiScore: integer("ai_score"), // 0-100 from AI
  aiInsights: text("ai_insights"), // AI-generated feedback
  aiConfidence: integer("ai_confidence"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instance_items_instance_idx").on(table.instanceId),
  index("audit_instance_items_template_item_idx").on(table.templateItemId),
]);

export const insertAuditInstanceItemSchema = createInsertSchema(auditInstanceItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstanceItem = z.infer<typeof insertAuditInstanceItemSchema>;
export type AuditInstanceItem = typeof auditInstanceItems.$inferSelect;

// ========================================
// CORRECTIVE ACTIONS (CAPA - Müdahale Masası)
// ========================================

export const correctiveActions = pgTable("corrective_actions", {
  id: serial("id").primaryKey(),
  auditInstanceId: integer("audit_instance_id").notNull().references(() => auditInstances.id, { onDelete: "cascade" }),
  auditItemId: integer("audit_item_id").notNull().references(() => auditTemplateItems.id),
  priority: varchar("priority", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  actionSlaHours: integer("action_sla_hours").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  closedDate: timestamp("closed_date"),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("corrective_actions_audit_instance_idx").on(table.auditInstanceId),
  index("corrective_actions_priority_idx").on(table.priority),
  index("corrective_actions_status_idx").on(table.status),
  index("corrective_actions_due_date_idx").on(table.dueDate),
]);

export const insertCorrectiveActionSchema = createInsertSchema(correctiveActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCorrectiveAction = z.infer<typeof insertCorrectiveActionSchema>;
export type CorrectiveAction = typeof correctiveActions.$inferSelect;

export const correctiveActionUpdates = pgTable("corrective_action_updates", {
  id: serial("id").primaryKey(),
  correctiveActionId: integer("corrective_action_id").notNull().references(() => correctiveActions.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }).notNull(),
  notes: text("notes"),
  evidence: jsonb("evidence"),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("corrective_action_updates_action_idx").on(table.correctiveActionId),
]);

export const insertCorrectiveActionUpdateSchema = createInsertSchema(correctiveActionUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertCorrectiveActionUpdate = z.infer<typeof insertCorrectiveActionUpdateSchema>;
export type CorrectiveActionUpdate = typeof correctiveActionUpdates.$inferSelect;

// NEW: Personnel Files - Comprehensive employee records
export const personnelFiles = pgTable("personnel_files", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Performance metrics (aggregated)
  overallPerformanceScore: integer("overall_performance_score"), // 0-100
  attendanceScore: integer("attendance_score"), // 0-100
  knowledgeScore: integer("knowledge_score"), // 0-100 from audits
  behaviorScore: integer("behavior_score"), // 0-100 from audits
  
  // Audit history summary
  lastAuditDate: timestamp("last_audit_date"),
  totalAuditsCompleted: integer("total_audits_completed").notNull().default(0),
  averageAuditScore: integer("average_audit_score"), // 0-100
  
  // Notes
  strengthsNotes: text("strengths_notes"),
  improvementNotes: text("improvement_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("personnel_files_user_idx").on(table.userId),
]);

export const insertPersonnelFileSchema = createInsertSchema(personnelFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPersonnelFile = z.infer<typeof insertPersonnelFileSchema>;
export type PersonnelFile = typeof personnelFiles.$inferSelect;

// ========================================
// GUEST FEEDBACK (Misafir Geri Bildirimi) - Enhanced with SLA, Categories, Social Media
// ========================================

export const customerFeedback = pgTable("customer_feedback", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Source of feedback
  source: varchar("source", { length: 30 }).notNull().default("qr_code"), // qr_code, google, instagram, in_person, phone, email
  externalReviewId: varchar("external_review_id", { length: 255 }), // External review ID (Google/Instagram)
  externalReviewUrl: text("external_review_url"), // Link to external review
  
  // Overall rating and category ratings (1-5)
  rating: integer("rating").notNull(), // Overall rating 1-5
  serviceRating: integer("service_rating"), // Hizmet puanı 1-5
  cleanlinessRating: integer("cleanliness_rating"), // Temizlik puanı 1-5
  productRating: integer("product_rating"), // Ürün kalitesi puanı 1-5
  staffRating: integer("staff_rating"), // Personel puanı 1-5
  // P0: Misafir SLA sistemi
  slaDeadlineHours: integer("sla_deadline_hours").default(24), // Şube cevap SLA (saat)
  branchResponseAt: timestamp("branch_response_at", { withTimezone: true }),
  branchResponseText: text("branch_response_text"),   // Şubenin misafire cevabı
  branchResponderId: text("branch_responder_id"),
  // P0: HQ iç not (misafir GÖREMEZ)
  hqNote: text("hq_note"),
  hqNoteById: text("hq_note_by_id"),
  hqNoteAt: timestamp("hq_note_at", { withTimezone: true }),
  // P0: HQ müdahale eşiği
  hqInterventionRequired: boolean("hq_intervention_required").default(false),
  hqInterventionAt: timestamp("hq_intervention_at", { withTimezone: true }),
  feedbackStatus: text("feedback_status").$type<'open'|'branch_responded'|'hq_reviewing'|'closed'>().default('open'),
  
  // Staff attribution (optional)
  staffId: varchar("staff_id").references(() => users.id, { onDelete: "set null" }), // Which staff served the customer
  
  // Customer info
  comment: text("comment"),
  feedbackDate: timestamp("feedback_date").defaultNow(),
  customerName: varchar("customer_name", { length: 100 }), // Optional
  customerEmail: varchar("customer_email", { length: 200 }), // Optional
  customerPhone: varchar("customer_phone", { length: 20 }), // Optional
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  
  // Priority & SLA
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  responseDeadline: timestamp("response_deadline"), // Calculated from priority
  slaBreached: boolean("sla_breached").notNull().default(false),
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, in_progress, awaiting_response, resolved, closed
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  resolvedAt: timestamp("resolved_at"),
  
  // Customer satisfaction after resolution
  resolutionSatisfaction: integer("resolution_satisfaction"), // 1-5 rating after resolution
  
  // Photo attachments
  photoUrls: text("photo_urls").array(), // Array of uploaded photo URLs
  
  // Anti-fraud / Suspicious detection
  deviceFingerprint: varchar("device_fingerprint", { length: 50 }), // Browser fingerprint
  userIp: varchar("user_ip", { length: 50 }), // IP address
  userLatitude: real("user_latitude"), // GPS latitude
  userLongitude: real("user_longitude"), // GPS longitude
  distanceFromBranch: real("distance_from_branch"), // Calculated distance in meters
  isSuspicious: boolean("is_suspicious").notNull().default(false), // Flagged for review
  suspiciousReasons: text("suspicious_reasons").array(), // Why it's suspicious
  
  // Language used for feedback
  feedbackLanguage: varchar("feedback_language", { length: 5 }).default("tr"),
  
  // Feedback type: feedback or complaint
  feedbackType: varchar("feedback_type", { length: 20 }).notNull().default("feedback"), // feedback, complaint
  
  // Contact preference
  requiresContact: boolean("requires_contact").notNull().default(false), // Customer wants to be contacted back
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("customer_feedback_branch_idx").on(table.branchId),
  index("customer_feedback_date_idx").on(table.feedbackDate),
  index("customer_feedback_rating_idx").on(table.rating),
  index("customer_feedback_source_idx").on(table.source),
  index("customer_feedback_status_idx").on(table.status),
  index("customer_feedback_staff_idx").on(table.staffId),
  index("customer_feedback_sla_idx").on(table.responseDeadline),
]);

export const insertCustomerFeedbackSchema = createInsertSchema(customerFeedback).omit({
  id: true,
  feedbackDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  serviceRating: z.number().int().min(1).max(5).optional().nullable(),
  cleanlinessRating: z.number().int().min(1).max(5).optional().nullable(),
  productRating: z.number().int().min(1).max(5).optional().nullable(),
  staffRating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000, "Comment too long").optional().transform(val => val?.trim() || null),
  feedbackType: z.enum(["feedback", "complaint"]).optional().default("feedback"),
  requiresContact: z.boolean().optional().default(false),
  slaDeadline: timestamp("sla_deadline"), // Şubenin yanıt vermesi gereken son tarih
  responseDeadline: timestamp("response_deadline"), // 24h varsayılan
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id"),
  hqNote: text("hq_note"), // HQ'nun iç notu — misafire görünmez
  hqAlerted: boolean("hq_alerted").default(false), // HQ müdahale bayrağı
  branchResponseAt: timestamp("branch_response_at"),
  visibilityLevel: text("visibility_level").default("branch"), // branch | hq | internal
});

export type InsertCustomerFeedback = z.infer<typeof insertCustomerFeedbackSchema>;
export type CustomerFeedback = typeof customerFeedback.$inferSelect;

// ========================================
// FEEDBACK RESPONSES (Yanıt Geçmişi)
// ========================================

export const feedbackResponses = pgTable("feedback_responses", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").notNull().references(() => customerFeedback.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responseType: varchar("response_type", { length: 30 }).notNull(), // defense, reply, internal_note, customer_contact
  content: text("content").notNull(),
  isVisibleToCustomer: boolean("is_visible_to_customer").notNull().default(false), // Whether customer can see this
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("feedback_responses_feedback_idx").on(table.feedbackId),
  index("feedback_responses_responder_idx").on(table.responderId),
]);

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
  isInternal: boolean("is_internal").default(false), // true = iç not, misafire görünmez
  visibility: text("visibility").default("public"), // public | internal | hq_only
});

export type InsertFeedbackResponse = z.infer<typeof insertFeedbackResponseSchema>;
export type FeedbackResponse = typeof feedbackResponses.$inferSelect;

// ========================================
// FEEDBACK FORM SETTINGS (Form Özelleştirme)
// ========================================

export const feedbackFormSettings = pgTable("feedback_form_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  
  // Banner / Visual customization
  bannerUrl: text("banner_url"), // Custom banner image URL
  logoUrl: text("logo_url"), // Custom logo URL
  primaryColor: varchar("primary_color", { length: 20 }).default("#7c3aed"), // Primary theme color
  backgroundColor: varchar("background_color", { length: 20 }).default("#1e1b4b"), // Background color
  
  // Welcome message customization (per language)
  welcomeMessageTr: text("welcome_message_tr").default("Geri bildiriminiz bizim için çok değerli"),
  welcomeMessageEn: text("welcome_message_en").default("Your feedback is very valuable to us"),
  welcomeMessageZh: text("welcome_message_zh").default("您的意见对我们非常宝贵"),
  welcomeMessageAr: text("welcome_message_ar").default("رأيك مهم جداً بالنسبة لنا"),
  welcomeMessageDe: text("welcome_message_de").default("Ihre Meinung ist uns sehr wichtig"),
  welcomeMessageKo: text("welcome_message_ko").default("귀하의 의견은 저희에게 매우 소중합니다"),
  welcomeMessageFr: text("welcome_message_fr").default("Votre avis nous est très précieux"),
  
  // Question visibility toggles
  showServiceRating: boolean("show_service_rating").notNull().default(true),
  showCleanlinessRating: boolean("show_cleanliness_rating").notNull().default(true),
  showProductRating: boolean("show_product_rating").notNull().default(true),
  showStaffRating: boolean("show_staff_rating").notNull().default(true),
  showStaffSelection: boolean("show_staff_selection").notNull().default(true), // Allow selecting specific staff
  
  // Feature toggles
  showPhotoUpload: boolean("show_photo_upload").notNull().default(true),
  showFeedbackTypeSelection: boolean("show_feedback_type_selection").notNull().default(true), // Feedback vs Complaint
  showContactPreference: boolean("show_contact_preference").notNull().default(true), // Requires contact checkbox
  showCommentField: boolean("show_comment_field").notNull().default(true),
  requireComment: boolean("require_comment").notNull().default(false), // Make comment mandatory
  
  // Anonymous settings
  allowAnonymous: boolean("allow_anonymous").notNull().default(true),
  defaultAnonymous: boolean("default_anonymous").notNull().default(true), // Default state of anonymous checkbox
  
  // Location verification
  requireLocationVerification: boolean("require_location_verification").notNull().default(false),
  maxDistanceFromBranch: integer("max_distance_from_branch").default(500), // meters
  
  // Language settings
  availableLanguages: text("available_languages").array().default(["tr", "en"]),
  defaultLanguage: varchar("default_language", { length: 5 }).default("tr"),
  
  // Active status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedById: varchar("updated_by_id").references(() => users.id),
}, (table) => [
  index("feedback_form_settings_branch_idx").on(table.branchId),
]);

export const insertFeedbackFormSettingsSchema = createInsertSchema(feedbackFormSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedbackFormSettings = z.infer<typeof insertFeedbackFormSettingsSchema>;
export type FeedbackFormSettings = typeof feedbackFormSettings.$inferSelect;

export const feedbackCustomQuestions = pgTable("feedback_custom_questions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  questionTr: text("question_tr").notNull(),
  questionEn: text("question_en"),
  questionDe: text("question_de"),
  questionAr: text("question_ar"),
  questionZh: text("question_zh"),
  questionKo: text("question_ko"),
  questionFr: text("question_fr"),
  questionType: varchar("question_type", { length: 20 }).notNull().default("rating"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("feedback_custom_questions_branch_idx").on(table.branchId),
]);

export const insertFeedbackCustomQuestionSchema = createInsertSchema(feedbackCustomQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedbackCustomQuestion = z.infer<typeof insertFeedbackCustomQuestionSchema>;
export type FeedbackCustomQuestion = typeof feedbackCustomQuestions.$inferSelect;

export const feedbackIpBlocks = pgTable("feedback_ip_blocks", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  reason: text("reason"),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("feedback_ip_blocks_ip_idx").on(table.ipAddress),
  index("feedback_ip_blocks_branch_idx").on(table.branchId),
]);

export const insertFeedbackIpBlockSchema = createInsertSchema(feedbackIpBlocks).omit({
  id: true,
  createdAt: true,
});

export type FeedbackIpBlock = typeof feedbackIpBlocks.$inferSelect;

// ========================================
// MAINTENANCE SCHEDULES (Proaktif Bakım)
// ========================================

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(), // routine, deep_clean, calibration, part_replacement
  frequencyDays: integer("frequency_days").notNull(), // Kaç günde bir (örn: 180 = 6 ayda bir)
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_schedules_equipment_idx").on(table.equipmentId),
  index("maintenance_schedules_next_date_idx").on(table.nextMaintenanceDate),
]);

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

// Maintenance Logs - Bakım geçmişi
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => maintenanceSchedules.id, { onDelete: "set null" }),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  performedDate: timestamp("performed_date").notNull(),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  workDescription: text("work_description").notNull(),
  partsReplaced: text("parts_replaced").array(), // Değiştirilen parçalar
  cost: numeric("cost", { precision: 10, scale: 2 }),
  nextMaintenanceDue: date("next_maintenance_due"),
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("maintenance_logs_equipment_idx").on(table.equipmentId),
  index("maintenance_logs_schedule_idx").on(table.scheduleId),
  index("maintenance_logs_date_idx").on(table.performedDate),
]);

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;

// ========================================
// EQUIPMENT CALIBRATIONS (Kalibrasyon Takibi)
// ========================================

export const equipmentCalibrations = pgTable("equipment_calibrations", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  calibrationDate: timestamp("calibration_date").notNull(),
  calibrationType: varchar("calibration_type", { length: 50 }).notNull(), // internal, external, manufacturer
  result: varchar("result", { length: 20 }).notNull(), // pass, fail, conditional
  nextCalibrationDue: date("next_calibration_due").notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  calibratedById: varchar("calibrated_by_id").references(() => users.id), // Internal calibration
  externalProvider: varchar("external_provider", { length: 200 }), // External calibration company
  measurements: text("measurements"), // JSON: before/after measurements
  deviations: text("deviations"), // Any deviations noted
  correctiveActions: text("corrective_actions"), // Actions taken if failed
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  auditInstanceId: integer("audit_instance_id").references(() => auditInstances.id), // Link to quality audit
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("equipment_calibrations_equipment_idx").on(table.equipmentId),
  index("equipment_calibrations_date_idx").on(table.calibrationDate),
  index("equipment_calibrations_next_due_idx").on(table.nextCalibrationDue),
  index("equipment_calibrations_result_idx").on(table.result),
]);

export const insertEquipmentCalibrationSchema = createInsertSchema(equipmentCalibrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true, // Set by server
});

export type InsertEquipmentCalibration = z.infer<typeof insertEquipmentCalibrationSchema>;
export type EquipmentCalibration = typeof equipmentCalibrations.$inferSelect;

// ========================================
// CAMPAIGNS (Kampanya Yönetimi)
// ========================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  campaignType: varchar("campaign_type", { length: 50 }).notNull(), // promotion, seasonal, new_product, discount
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetRoles: text("target_roles").array(), // Hedef roller (opsiyonel)
  imageUrls: text("image_urls").array(), // Kampanya görselleri
  pdfUrl: text("pdf_url"), // PDF döküman
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, active, paused, completed
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("campaigns_status_idx").on(table.status),
  index("campaigns_start_date_idx").on(table.startDate),
  index("campaigns_end_date_idx").on(table.endDate),
]);

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Campaign Branches - Kampanyanın hedef şubeleri
export const campaignBranches = pgTable("campaign_branches", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
}, (table) => [
  index("campaign_branches_campaign_idx").on(table.campaignId),
  index("campaign_branches_branch_idx").on(table.branchId),
  unique("unique_campaign_branch").on(table.campaignId, table.branchId),
]);

export const insertCampaignBranchSchema = createInsertSchema(campaignBranches).omit({
  id: true,
});

export type InsertCampaignBranch = z.infer<typeof insertCampaignBranchSchema>;
export type CampaignBranch = typeof campaignBranches.$inferSelect;

// Campaign Metrics - Kampanya başarı ölçümü (manuel girilen metrikler)
export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  salesIncrease: numeric("sales_increase", { precision: 10, scale: 2 }), // Satış artışı %
  customerCount: integer("customer_count"), // Müşteri sayısı
  revenue: numeric("revenue", { precision: 12, scale: 2 }), // Gelir
  notes: text("notes"),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  reportDate: timestamp("report_date").defaultNow(),
}, (table) => [
  index("campaign_metrics_campaign_idx").on(table.campaignId),
  index("campaign_metrics_branch_idx").on(table.branchId),
]);

export const insertCampaignMetricSchema = createInsertSchema(campaignMetrics).omit({
  id: true,
  reportDate: true,
});

export type InsertCampaignMetric = z.infer<typeof insertCampaignMetricSchema>;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;

// ========================================
// FRANCHISE ONBOARDING (Franchise Açılış)
// ========================================

export const franchiseOnboarding = pgTable("franchise_onboarding", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("planning"), // planning, in_progress, completed
  expectedOpeningDate: date("expected_opening_date"),
  actualOpeningDate: date("actual_opening_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedCoachId: varchar("assigned_coach_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_onboarding_branch_idx").on(table.branchId),
  index("franchise_onboarding_status_idx").on(table.status),
]);

export const insertFranchiseOnboardingSchema = createInsertSchema(franchiseOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFranchiseOnboarding = z.infer<typeof insertFranchiseOnboardingSchema>;
export type FranchiseOnboarding = typeof franchiseOnboarding.$inferSelect;

// Onboarding Documents - Gerekli belgeler
export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => franchiseOnboarding.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // license, contract, insurance, permits
  documentName: varchar("document_name", { length: 200 }).notNull(),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, uploaded, approved, rejected
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_documents_onboarding_idx").on(table.onboardingId),
  index("onboarding_documents_status_idx").on(table.status),
]);

export const insertOnboardingDocumentSchema = createInsertSchema(onboardingDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingDocument = z.infer<typeof insertOnboardingDocumentSchema>;
export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;

// License Renewals - Lisans yenileme hatırlatıcıları
export const licenseRenewals = pgTable("license_renewals", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  licenseType: varchar("license_type", { length: 100 }).notNull(), // franchise, health, business
  licenseNumber: varchar("license_number", { length: 100 }),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  renewalStatus: varchar("renewal_status", { length: 20 }).notNull().default("active"), // active, expiring_soon, expired, renewed
  reminderDaysBefore: integer("reminder_days_before").notNull().default(30), // Kaç gün önce hatırlat
  notes: text("notes"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("license_renewals_branch_idx").on(table.branchId),
  index("license_renewals_expiry_idx").on(table.expiryDate),
  index("license_renewals_status_idx").on(table.renewalStatus),
]);

export const insertLicenseRenewalSchema = createInsertSchema(licenseRenewals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLicenseRenewal = z.infer<typeof insertLicenseRenewalSchema>;
export type LicenseRenewal = typeof licenseRenewals.$inferSelect;

// ========================================
// SHIFT TEMPLATES - Vardiya Şablonları
// ========================================

// Shift Templates table - Reusable shift patterns for easy scheduling
export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Hafta İçi Sabah", "Hafta Sonu Akşam"
  description: text("description"),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // morning, evening, night, opening, relay_1, relay_2, closing
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_templates_branch_idx").on(table.branchId),
  index("shift_templates_active_idx").on(table.isActive),
]);

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night", "opening", "relay_1", "relay_2", "closing"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// ========================================
// EMPLOYEE AVAILABILITY - Çalışan Müsaitlik
// ========================================

// Employee Availability table - Track when employees are unavailable
export const employeeAvailability = pgTable("employee_availability", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(), // unavailable, vacation, sick, personal, other
  notes: text("notes"),
  isAllDay: boolean("is_all_day").notNull().default(true),
  startTime: time("start_time", { precision: 0 }), // If not all day
  endTime: time("end_time", { precision: 0 }), // If not all day
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_availability_user_idx").on(table.userId),
  index("employee_availability_date_idx").on(table.startDate, table.endDate),
  index("employee_availability_status_idx").on(table.status),
]);

export const insertEmployeeAvailabilitySchema = createInsertSchema(employeeAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reason: z.enum(["unavailable", "vacation", "sick", "personal", "other"]),
  status: z.enum(["active", "cancelled"]).default("active"),
});

export type InsertEmployeeAvailability = z.infer<typeof insertEmployeeAvailabilitySchema>;
export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;
export type AvailabilityReason = "unavailable" | "vacation" | "sick" | "personal" | "other";

// ========================================
// RBAC SYSTEM - Role-Based Access Control
// ========================================

// Roles - Dynamic role management (separate from hard-coded UserRole enum)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").notNull().default(false), // Built-in roles cannot be deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("roles_name_idx").on(table.name),
]);

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions - Define what actions can be performed
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., "tasks.create", "equipment.delete"
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(), // tasks, equipment, users, etc.
  action: varchar("action", { length: 20 }).notNull(), // view, create, edit, delete, approve
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permissions_module_idx").on(table.module),
  index("permissions_name_idx").on(table.name),
]);

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role Permissions - Many-to-many relationship
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("role_permissions_role_idx").on(table.roleId),
  index("role_permissions_permission_idx").on(table.permissionId),
  unique("role_permission_unique").on(table.roleId, table.permissionId),
]);

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
