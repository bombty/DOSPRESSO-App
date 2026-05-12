// ═══════════════════════════════════════════════════════════════════
// Sprint 47-48 (Aslan 13 May 2026) - AI-Native Onboarding & Daily Brief
// ═══════════════════════════════════════════════════════════════════
// Conversational onboarding (Mr. Dobody chat), Daily AI Brief, Re-onboarding,
// AI uyarı sistemi (besin değeri eksik vb.) için temel tablolar.

import {
  pgTable,
  varchar,
  text,
  integer,
  serial,
  timestamp,
  boolean,
  jsonb,
  index,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";

// ═══════════════════════════════════════════════════════════════════
// 1. ONBOARDING CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════
// Mr. Dobody ile kullanıcı arasında geçen tüm mesajlar
// Re-onboarding tetiklendiğinde önceki konuşmalar arşivlenir (active=false)

export const onboardingConversations = pgTable("onboarding_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // satinalma, gida_muhendisi, supervisor, vb.

  // Konuşma durumu
  status: varchar("status", { length: 30 }).default("active").notNull(), // active, completed, skipped, archived
  currentStep: varchar("current_step", { length: 50 }).default("welcome"), // welcome, self-discovery, role-intro, ...
  totalSteps: integer("total_steps").default(7),

  // Versiyon — yeni rol değişimi gerektirir
  version: integer("version").default(1).notNull(),
  archivedReason: varchar("archived_reason", { length: 100 }), // "manuel reset", "user fired", "role change"
  archivedAt: timestamp("archived_at"),
  archivedById: varchar("archived_by_id").references(() => users.id),

  // Kullanıcı tercihleri (self-discovery aşamasında öğrenilir)
  userPreferences: jsonb("user_preferences").default({}),
  // { experience_level: '5+', focus_areas: ['tedarikci'], learning_style: 'gorsel' }

  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  skippedAt: timestamp("skipped_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
}, (table) => [
  index("onboarding_user_idx").on(table.userId),
  index("onboarding_status_idx").on(table.status),
  index("onboarding_role_idx").on(table.role),
]);

export const insertOnboardingConversationSchema = createInsertSchema(onboardingConversations).omit({
  id: true,
  startedAt: true,
  lastActivityAt: true,
});
export type InsertOnboardingConversation = z.infer<typeof insertOnboardingConversationSchema>;
export type OnboardingConversation = typeof onboardingConversations.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// 2. ONBOARDING MESSAGES
// ═══════════════════════════════════════════════════════════════════
// Her mesaj turn'ü (kullanıcı + AI cevabı)

export const onboardingMessages = pgTable("onboarding_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => onboardingConversations.id, { onDelete: "cascade" }).notNull(),

  // Mesaj tipi
  sender: varchar("sender", { length: 20 }).notNull(), // 'user' | 'ai' | 'system'
  step: varchar("step", { length: 50 }), // welcome, self-discovery, ...

  // İçerik
  content: text("content").notNull(),
  quickReplies: jsonb("quick_replies"), // [{ label: 'Başlayalım', value: 'start' }, ...]
  selectedReply: varchar("selected_reply", { length: 100 }), // user'ın seçtiği

  // Meta
  aiModel: varchar("ai_model", { length: 50 }), // gpt-4o, gpt-4o-mini
  tokenCount: integer("token_count"),
  responseTimeMs: integer("response_time_ms"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_msg_conv_idx").on(table.conversationId),
  index("onboarding_msg_created_idx").on(table.createdAt),
]);

export const insertOnboardingMessageSchema = createInsertSchema(onboardingMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertOnboardingMessage = z.infer<typeof insertOnboardingMessageSchema>;
export type OnboardingMessage = typeof onboardingMessages.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// 3. ONBOARDING TEMPLATES (Rol Bazlı)
// ═══════════════════════════════════════════════════════════════════
// Her rol için 7-adımlı senaryo + sistem prompt'lar
// Admin tarafından düzenlenebilir (post-pilot)

export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull().unique(),
  roleDisplayName: varchar("role_display_name", { length: 100 }).notNull(),

  // Sistem prompt (ChatGPT API'ya gönderilir)
  systemPrompt: text("system_prompt").notNull(),

  // Adımlar JSON
  steps: jsonb("steps").notNull(),
  // [
  //   { id: 'welcome', title: 'Karşılama', prompt: '...', quickReplies: [...] },
  //   { id: 'self-discovery', title: 'Tanışma', prompt: '...', quickReplies: [...] },
  //   ...
  // ]

  // Görev briefi (Daily AI Brief için)
  dailyBriefPrompt: text("daily_brief_prompt"), // "Sen [rol] sorumlususun, bugün için brief..."

  // Versiyon
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_template_role_idx").on(table.role),
]);

export const insertOnboardingTemplateSchema = createInsertSchema(onboardingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOnboardingTemplate = z.infer<typeof insertOnboardingTemplateSchema>;
export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// 4. DAILY AI BRIEFS
// ═══════════════════════════════════════════════════════════════════
// Her sabah 09:00 otomatik üretilir (cron), rol bazlı

export const dailyBriefs = pgTable("daily_briefs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  branchId: integer("branch_id"), // şube spesifik briefler için

  briefDate: date("brief_date").notNull(), // 2026-05-14
  generatedAt: timestamp("generated_at").defaultNow(),

  // İçerik (AI üretti)
  content: text("content").notNull(),
  summary: varchar("summary", { length: 500 }), // kart başlık özeti
  priorityItems: jsonb("priority_items"), // [{ type: 'warning', text: '...' }, ...]

  // Kaynak veriler (transparency için)
  dataSnapshot: jsonb("data_snapshot"),
  // { yesterdayMetrics: {...}, openTasks: [...], anomalies: [...] }

  // AI meta
  aiModel: varchar("ai_model", { length: 50 }),
  tokenCount: integer("token_count"),

  // Kullanıcı etkileşimi
  viewed: boolean("viewed").default(false),
  viewedAt: timestamp("viewed_at"),
  reaction: varchar("reaction", { length: 20 }), // 'helpful', 'not_helpful', null
  reactionAt: timestamp("reaction_at"),

  // Detaylı tıklama
  itemsClicked: jsonb("items_clicked").default([]), // hangi öğeye tıkladı
}, (table) => [
  index("daily_brief_user_idx").on(table.userId),
  index("daily_brief_date_idx").on(table.briefDate),
  index("daily_brief_role_idx").on(table.role),
]);

export const insertDailyBriefSchema = createInsertSchema(dailyBriefs).omit({
  id: true,
  generatedAt: true,
});
export type InsertDailyBrief = z.infer<typeof insertDailyBriefSchema>;
export type DailyBrief = typeof dailyBriefs.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// 5. AI ALERTS (Akıllı Uyarı Sistemi)
// ═══════════════════════════════════════════════════════════════════
// Sistem otomatik tespit: besin değeri eksik, fiyat anomali, vb.

export const aiAlerts = pgTable("ai_alerts", {
  id: serial("id").primaryKey(),

  // Hedef rol(ler)
  targetRole: varchar("target_role", { length: 50 }), // null = tüm rollere
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "set null" }),

  // Tip
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  // 'missing_nutrition', 'price_anomaly', 'supplier_late', 'inventory_low', vb.

  category: varchar("category", { length: 50 }).notNull(),
  // 'satinalma', 'gida_muhendisi', 'sube', 'genel'

  severity: varchar("severity", { length: 20 }).default("info"), // info, warning, critical

  // İçerik
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"), // tıklayınca nereye gider
  actionLabel: varchar("action_label", { length: 100 }), // "Hammadde sayfasına git"

  // Kaynak veri
  sourceTable: varchar("source_table", { length: 100 }), // 'raw_materials', 'suppliers'
  sourceId: integer("source_id"),
  metadata: jsonb("metadata"), // ek bilgiler

  // Durum
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, dismissed, resolved
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // bazı uyarılar 7 gün sonra otomatik kapanır
}, (table) => [
  index("ai_alerts_target_role_idx").on(table.targetRole),
  index("ai_alerts_target_user_idx").on(table.targetUserId),
  index("ai_alerts_status_idx").on(table.status),
  index("ai_alerts_type_idx").on(table.alertType),
  index("ai_alerts_severity_idx").on(table.severity),
]);

export const insertAiAlertSchema = createInsertSchema(aiAlerts).omit({
  id: true,
  createdAt: true,
});
export type InsertAiAlert = z.infer<typeof insertAiAlertSchema>;
export type AiAlert = typeof aiAlerts.$inferSelect;
