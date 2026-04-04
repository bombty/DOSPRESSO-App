// ========================================
// DOSPRESSO Şube Denetim Sistemi v2
// QMS - Kalite Yönetim Sistemi
// 9 tablo: şablonlar, kategoriler, sorular, denetimler,
// kategori skorları, cevaplar, personel, aksiyonlar, yorumlar
// ========================================

import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, numeric, index, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";
import { branches } from "./schema-02";

// ──────────────────────────────────────────
// 1. Denetim Şablonları
// ──────────────────────────────────────────
export const auditTemplatesV2 = pgTable("audit_templates_v2", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  parentTemplateId: integer("parent_template_id"), // önceki versiyon referansı
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_tmpl_v2_active_idx").on(table.isActive),
]);

export const insertAuditTemplateV2Schema = createInsertSchema(auditTemplatesV2).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertAuditTemplateV2 = z.infer<typeof insertAuditTemplateV2Schema>;
export type AuditTemplateV2 = typeof auditTemplatesV2.$inferSelect;

// ──────────────────────────────────────────
// 2. Şablon Kategorileri (Dış Mekan, Bar Düzeni, vs.)
// ──────────────────────────────────────────
export const auditTemplateCategoriesV2 = pgTable("audit_template_categories_v2", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplatesV2.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  weight: integer("weight").default(10).notNull(), // yüzde ağırlık (toplam = 100)
  orderIndex: integer("order_index").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
  index("audit_cat_v2_template_idx").on(table.templateId),
]);

export const insertAuditTemplateCategoryV2Schema = createInsertSchema(auditTemplateCategoriesV2).omit({
  id: true,
});
export type InsertAuditTemplateCategoryV2 = z.infer<typeof insertAuditTemplateCategoryV2Schema>;
export type AuditTemplateCategoryV2 = typeof auditTemplateCategoriesV2.$inferSelect;

// ──────────────────────────────────────────
// 3. Şablon Soruları
// questionType: checkbox | yesno | rating | stars | select | photo | text
// ──────────────────────────────────────────
export const auditTemplateQuestionsV2 = pgTable("audit_template_questions_v2", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => auditTemplateCategoriesV2.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull().default("checkbox"),
  // checkbox=tik, yesno=evet/hayır, rating=0-100, stars=1-5, select=çoktan seçmeli, photo=fotoğraf, text=metin
  options: jsonb("options").$type<{ label: string; score: number }[]>(), // select tipi için seçenekler
  isRequired: boolean("is_required").default(true).notNull(),
  weight: integer("weight").default(1).notNull(), // kategori içi ağırlık
  orderIndex: integer("order_index").default(0).notNull(),
  helpText: text("help_text"), // açıklama/ipucu
}, (table) => [
  index("audit_q_v2_category_idx").on(table.categoryId),
]);

export const insertAuditTemplateQuestionV2Schema = createInsertSchema(auditTemplateQuestionsV2).omit({
  id: true,
});
export type InsertAuditTemplateQuestionV2 = z.infer<typeof insertAuditTemplateQuestionV2Schema>;
export type AuditTemplateQuestionV2 = typeof auditTemplateQuestionsV2.$inferSelect;

// ──────────────────────────────────────────
// 4. Denetim Kayıtları
// ──────────────────────────────────────────
export const auditsV2 = pgTable("audits_v2", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplatesV2.id),
  templateVersion: integer("template_version").default(1).notNull(), // denetim anındaki şablon versiyonu
  branchId: integer("branch_id").notNull().references(() => branches.id),
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  // Durum: in_progress → completed → pending_actions → closed | cancelled
  status: varchar("status", { length: 30 }).default("in_progress").notNull(),
  scheduledDate: date("scheduled_date"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"), // form tamamlandı
  closedAt: timestamp("closed_at"), // tüm aksiyonlar kapandı
  totalScore: numeric("total_score", { precision: 5, scale: 2 }), // 0-100
  personnelScore: numeric("personnel_score", { precision: 5, scale: 2 }),
  actionComplianceScore: numeric("action_compliance_score", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audits_v2_branch_idx").on(table.branchId),
  index("audits_v2_auditor_idx").on(table.auditorId),
  index("audits_v2_status_idx").on(table.status),
  index("audits_v2_date_idx").on(table.startedAt),
]);

export const insertAuditV2Schema = createInsertSchema(auditsV2).omit({
  id: true, createdAt: true, completedAt: true, closedAt: true,
  totalScore: true, personnelScore: true, actionComplianceScore: true,
});
export type InsertAuditV2 = z.infer<typeof insertAuditV2Schema>;
export type AuditV2 = typeof auditsV2.$inferSelect;

// ──────────────────────────────────────────
// 5. Kategori Skorları (denetim başına)
// ──────────────────────────────────────────
export const auditCategoryScores = pgTable("audit_category_scores", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => auditsV2.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => auditTemplateCategoriesV2.id),
  categoryName: varchar("category_name", { length: 200 }).notNull(), // snapshot
  weight: integer("weight").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  maxScore: numeric("max_score", { precision: 5, scale: 2 }).default("100"),
}, (table) => [
  index("audit_cat_score_audit_idx").on(table.auditId),
]);

export const insertAuditCategoryScoreSchema = createInsertSchema(auditCategoryScores).omit({ id: true });
export type InsertAuditCategoryScore = z.infer<typeof insertAuditCategoryScoreSchema>;
export type AuditCategoryScore = typeof auditCategoryScores.$inferSelect;

// ──────────────────────────────────────────
// 6. Soru Cevapları
// ──────────────────────────────────────────
export const auditResponsesV2 = pgTable("audit_responses_v2", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => auditsV2.id, { onDelete: "cascade" }),
  questionId: integer("question_id").references(() => auditTemplateQuestionsV2.id),
  categoryId: integer("category_id"),
  questionText: text("question_text").notNull(), // snapshot — şablon değişse bile kalır
  questionType: varchar("question_type", { length: 20 }).notNull(),
  responseValue: text("response_value"), // cevap (tip'e göre: "true", "4", "İyi", vb.)
  score: numeric("score", { precision: 5, scale: 2 }), // hesaplanan puan 0-100
  photoUrl: text("photo_url"),
  note: text("note"),
  answeredAt: timestamp("answered_at").defaultNow(),
}, (table) => [
  index("audit_resp_v2_audit_idx").on(table.auditId),
  index("audit_resp_v2_question_idx").on(table.questionId),
]);

export const insertAuditResponseV2Schema = createInsertSchema(auditResponsesV2).omit({ id: true, answeredAt: true });
export type InsertAuditResponseV2 = z.infer<typeof insertAuditResponseV2Schema>;
export type AuditResponseV2 = typeof auditResponsesV2.$inferSelect;

// ──────────────────────────────────────────
// 7. Personel Denetimi
// Her personel: dress code, hijyen, müşteri ilgisi, güler yüz (1-5 yıldız)
// ──────────────────────────────────────────
export const auditPersonnelV2 = pgTable("audit_personnel_v2", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => auditsV2.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  dressCodeScore: integer("dress_code_score"), // 1-5 yıldız
  hygieneScore: integer("hygiene_score"), // 1-5
  customerCareScore: integer("customer_care_score"), // 1-5 müşteri ilgisi
  friendlinessScore: integer("friendliness_score"), // 1-5 güler yüz
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }), // otomatik: ortalama × 20
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_pers_v2_audit_idx").on(table.auditId),
  index("audit_pers_v2_user_idx").on(table.userId),
]);

export const insertAuditPersonnelV2Schema = createInsertSchema(auditPersonnelV2).omit({ id: true, createdAt: true, overallScore: true });
export type InsertAuditPersonnelV2 = z.infer<typeof insertAuditPersonnelV2Schema>;
export type AuditPersonnelV2 = typeof auditPersonnelV2.$inferSelect;

// ──────────────────────────────────────────
// 8. Aksiyon Maddeleri (SLA takipli)
// ──────────────────────────────────────────
export const auditActionsV2 = pgTable("audit_actions_v2", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => auditsV2.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id"), // hangi denetim kategorisiyle ilgili
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(), // low, medium, high, urgent
  deadline: date("deadline").notNull(),
  slaHours: integer("sla_hours"), // SLA süresi (saat)
  // open → in_progress → resolved → verified | overdue
  status: varchar("status", { length: 30 }).default("open").notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedNote: text("resolved_note"),
  resolvedPhotoUrl: text("resolved_photo_url"),
  verifiedAt: timestamp("verified_at"), // denetçi onayı
  verifiedBy: varchar("verified_by").references(() => users.id),
  slaBreached: boolean("sla_breached").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_act_v2_audit_idx").on(table.auditId),
  index("audit_act_v2_assigned_idx").on(table.assignedToId),
  index("audit_act_v2_status_idx").on(table.status),
  index("audit_act_v2_deadline_idx").on(table.deadline),
]);

export const insertAuditActionV2Schema = createInsertSchema(auditActionsV2).omit({
  id: true, createdAt: true, resolvedAt: true, verifiedAt: true, slaBreached: true,
});
export type InsertAuditActionV2 = z.infer<typeof insertAuditActionV2Schema>;
export type AuditActionV2 = typeof auditActionsV2.$inferSelect;

// ──────────────────────────────────────────
// 9. Aksiyon Yorumları (takip thread'i)
// ──────────────────────────────────────────
export const auditActionComments = pgTable("audit_action_comments", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull().references(() => auditActionsV2.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_act_comment_action_idx").on(table.actionId),
  index("audit_act_comment_user_idx").on(table.userId),
]);

export const insertAuditActionCommentSchema = createInsertSchema(auditActionComments).omit({ id: true, createdAt: true });
export type InsertAuditActionComment = z.infer<typeof insertAuditActionCommentSchema>;
export type AuditActionComment = typeof auditActionComments.$inferSelect;
