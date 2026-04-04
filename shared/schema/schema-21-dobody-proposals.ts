// ========================================
// DOSPRESSO Mr. Dobody — Proposal Sistemi
// 5 tablo: scopes, proposals, events, learning, workflow_confidence
// ========================================

import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";
import { branches } from "./schema-02";

// 1. Scope — Rol bazlı veri erişim
export const dobodyScopes = pgTable("dobody_scopes", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull().unique(),
  allowedModules: text("allowed_modules").array(),
  blockedKeywords: text("blocked_keywords").array(),
  branchScope: varchar("branch_scope", { length: 20 }).default("own").notNull(),
  maxDetailLevel: varchar("max_detail_level", { length: 20 }).default("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dobody_scopes_role_idx").on(table.role),
]);
export const insertDobodyScopeSchema = createInsertSchema(dobodyScopes).omit({ id: true, createdAt: true });
export type DobodyScope = typeof dobodyScopes.$inferSelect;

// 2. Proposals — Öneri sistemi
export const dobodyProposals = pgTable("dobody_proposals", {
  id: serial("id").primaryKey(),
  workflowType: varchar("workflow_type", { length: 30 }).notNull(),
  roleTarget: varchar("role_target", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  proposalType: varchar("proposal_type", { length: 20 }).notNull().default("action"),
  priority: varchar("priority", { length: 20 }).notNull().default("onemli"),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  sourceModule: varchar("source_module", { length: 50 }),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: integer("related_entity_id"),
  suggestedActionType: varchar("suggested_action_type", { length: 50 }),
  suggestedActionData: jsonb("suggested_action_data").$type<Record<string, any>>(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  expiresAt: timestamp("expires_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dobody_prop_status_idx").on(table.status),
  index("dobody_prop_role_idx").on(table.roleTarget),
  index("dobody_prop_user_idx").on(table.userId),
  index("dobody_prop_created_idx").on(table.createdAt),
]);
export const insertDobodyProposalSchema = createInsertSchema(dobodyProposals).omit({ id: true, createdAt: true, approvedAt: true });
export type DobodyProposal = typeof dobodyProposals.$inferSelect;

// 3. Events — Olay kaydı
export const dobodyEvents = pgTable("dobody_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  sourceModule: varchar("source_module", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  eventData: jsonb("event_data").$type<Record<string, any>>(),
  proposalsGenerated: integer("proposals_generated").default(0),
  processedAt: timestamp("processed_at").defaultNow(),
}, (table) => [
  index("dobody_evt_type_idx").on(table.eventType),
  index("dobody_evt_date_idx").on(table.processedAt),
]);
export const insertDobodyEventSchema = createInsertSchema(dobodyEvents).omit({ id: true, processedAt: true });
export type DobodyEvent = typeof dobodyEvents.$inferSelect;

// 4. Learning — Öğrenme kaydı
export const dobodyLearning = pgTable("dobody_learning", {
  id: serial("id").primaryKey(),
  workflowType: varchar("workflow_type", { length: 30 }).notNull(),
  proposalId: integer("proposal_id").notNull().references(() => dobodyProposals.id, { onDelete: "cascade" }),
  outcome: varchar("outcome", { length: 20 }).notNull(),
  rejectionReason: text("rejection_reason"),
  resultPositive: boolean("result_positive"),
  confidenceDelta: numeric("confidence_delta", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dobody_learn_workflow_idx").on(table.workflowType),
]);
export const insertDobodyLearningSchema = createInsertSchema(dobodyLearning).omit({ id: true, createdAt: true });
export type DobodyLearning = typeof dobodyLearning.$inferSelect;

// 5. Workflow Confidence — Güven skoru
export const dobodyWorkflowConfidence = pgTable("dobody_workflow_confidence", {
  id: serial("id").primaryKey(),
  workflowType: varchar("workflow_type", { length: 30 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).default("50").notNull(),
  totalProposals: integer("total_proposals").default(0).notNull(),
  approvedCount: integer("approved_count").default(0).notNull(),
  rejectedCount: integer("rejected_count").default(0).notNull(),
  autoApplyEnabled: boolean("auto_apply_enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("dobody_wf_conf_idx").on(table.workflowType, table.role),
]);
export const insertDobodyWorkflowConfidenceSchema = createInsertSchema(dobodyWorkflowConfidence).omit({ id: true, updatedAt: true });
export type DobodyWorkflowConfidence = typeof dobodyWorkflowConfidence.$inferSelect;
