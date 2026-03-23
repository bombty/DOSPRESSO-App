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
import { announcements } from './schema-03';
import { Role, roles } from './schema-04';
import { factoryProductionOutputs, factoryProducts, factoryQualityChecks, factoryStations, productionBatches } from './schema-08';
import { contentPackItems, contentPacks } from './schema-11';

export const userPackProgress = pgTable("user_pack_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packId: integer("pack_id").notNull().references(() => contentPacks.id),
  packItemId: integer("pack_item_id").notNull().references(() => contentPackItems.id),
  status: varchar("status", { length: 20 }).default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_pack_progress_user_idx").on(table.userId),
  index("user_pack_progress_pack_idx").on(table.packId),
  index("user_pack_progress_item_idx").on(table.packItemId),
  index("user_pack_progress_status_idx").on(table.status),
]);

export const aiAgentLogs = pgTable("ai_agent_logs", {
  id: serial("id").primaryKey(),
  runType: varchar("run_type", { length: 50 }).notNull(),
  triggeredByUserId: varchar("triggered_by_user_id", { length: 255 }),
  targetRoleScope: varchar("target_role_scope", { length: 30 }).notNull(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  branchId: integer("branch_id"),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  actionCount: integer("action_count").default(0),
  status: varchar("status", { length: 20 }).default("success"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ai_agent_logs_type_idx").on(table.runType),
  index("ai_agent_logs_scope_idx").on(table.targetRoleScope),
  index("ai_agent_logs_created_idx").on(table.createdAt),
]);

export const insertAiAgentLogSchema = createInsertSchema(aiAgentLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiAgentLog = z.infer<typeof insertAiAgentLogSchema>;
export type AiAgentLog = typeof aiAgentLogs.$inferSelect;

// ==================== AI Data Domains & Policies ====================

export const aiDataDomains = pgTable("ai_data_domains", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(),
  labelTr: varchar("label_tr", { length: 100 }).notNull(),
  labelEn: varchar("label_en", { length: 100 }).notNull(),
  description: text("description"),
  sensitivity: varchar("sensitivity", { length: 20 }).notNull().default("internal"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiDomainPolicies = pgTable("ai_domain_policies", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => aiDataDomains.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  employeeType: varchar("employee_type", { length: 50 }),
  decision: varchar("decision", { length: 30 }).notNull().default("DENY"),
  scope: varchar("scope", { length: 20 }).notNull().default("org_wide"),
  redactionMode: varchar("redaction_mode", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ai_policy_domain_idx").on(table.domainId),
  index("ai_policy_role_idx").on(table.role),
]);

export const insertAiDataDomainSchema = createInsertSchema(aiDataDomains).omit({
  id: true,
  createdAt: true,
});

export const insertAiDomainPolicySchema = createInsertSchema(aiDomainPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiDataDomain = z.infer<typeof insertAiDataDomainSchema>;
export type AiDataDomain = typeof aiDataDomains.$inferSelect;
export type InsertAiDomainPolicy = z.infer<typeof insertAiDomainPolicySchema>;
export type AiDomainPolicy = typeof aiDomainPolicies.$inferSelect;

// ==================== Employee Types & Policies (P1 Role Registry) ====================

export const employeeTypes = pgTable("employee_types", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  allowedGroups: jsonb("allowed_groups").$type<string[]>().default([]),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeTypePolicies = pgTable("employee_type_policies", {
  id: serial("id").primaryKey(),
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id, { onDelete: "cascade" }).notNull(),
  policyKey: varchar("policy_key", { length: 100 }).notNull(),
  policyJson: jsonb("policy_json").$type<Record<string, any>>().default({}),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("emp_type_policy_type_idx").on(table.employeeTypeId),
]);

export const orgEmployeeTypeAssignments = pgTable("org_employee_type_assignments", {
  id: serial("id").primaryKey(),
  orgScope: varchar("org_scope", { length: 20 }).notNull(),
  orgId: integer("org_id").notNull(),
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id, { onDelete: "cascade" }).notNull(),
  taskPackKey: varchar("task_pack_key", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("org_emp_assign_scope_idx").on(table.orgScope, table.orgId),
  index("org_emp_assign_type_idx").on(table.employeeTypeId),
]);

export const insertEmployeeTypeSchema = createInsertSchema(employeeTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeTypePolicySchema = createInsertSchema(employeeTypePolicies).omit({
  id: true,
  createdAt: true,
});

export const insertOrgEmployeeTypeAssignmentSchema = createInsertSchema(orgEmployeeTypeAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeType = z.infer<typeof insertEmployeeTypeSchema>;
export type EmployeeType = typeof employeeTypes.$inferSelect;
export type InsertEmployeeTypePolicy = z.infer<typeof insertEmployeeTypePolicySchema>;
export type EmployeeTypePolicy = typeof employeeTypePolicies.$inferSelect;
export type InsertOrgEmployeeTypeAssignment = z.infer<typeof insertOrgEmployeeTypeAssignmentSchema>;
export type OrgEmployeeTypeAssignment = typeof orgEmployeeTypeAssignments.$inferSelect;

// ==================== Agent Engine — Pending Actions ====================

export const agentActionTypeEnum = ["remind", "escalate", "report", "suggest_task", "alert", "checklist_warning", "training_nudge", "stock_alert", "sla_warning", "performance_note"] as const;
export type AgentActionType = typeof agentActionTypeEnum[number];

export const agentActionSeverityEnum = ["low", "med", "high", "critical"] as const;
export type AgentActionSeverity = typeof agentActionSeverityEnum[number];

export const agentActionStatusEnum = ["pending", "approved", "rejected", "expired", "auto_resolved"] as const;
export type AgentActionStatus = typeof agentActionStatusEnum[number];

export const agentPendingActions = pgTable("agent_pending_actions", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  targetRoleScope: varchar("target_role_scope", { length: 30 }),
  branchId: integer("branch_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  deepLink: varchar("deep_link", { length: 500 }),
  severity: varchar("severity", { length: 10 }).notNull().default("med"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedByUserId: varchar("approved_by_user_id", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  expiresAt: timestamp("expires_at"),
  category: varchar("category", { length: 50 }),
  subcategory: varchar("subcategory", { length: 100 }),
  escalationDate: timestamp("escalation_date"),
  escalationRole: varchar("escalation_role", { length: 50 }),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_action_status_idx").on(table.status),
  index("agent_action_target_idx").on(table.targetUserId),
  index("agent_action_type_idx").on(table.actionType),
  index("agent_action_branch_idx").on(table.branchId),
  index("agent_action_created_idx").on(table.createdAt),
  index("agent_action_category_idx").on(table.category),
  index("agent_action_escalation_idx").on(table.escalationDate),
]);

export const insertAgentPendingActionSchema = createInsertSchema(agentPendingActions).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentPendingAction = z.infer<typeof insertAgentPendingActionSchema>;
export type AgentPendingAction = typeof agentPendingActions.$inferSelect;

// ==================== Agent Engine — Agent Runs ====================

export const agentRunTypeEnum = ["daily_analysis", "weekly_summary", "event_triggered", "escalation_check"] as const;
export type AgentRunType = typeof agentRunTypeEnum[number];

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  runType: varchar("run_type", { length: 30 }).notNull(),
  scopeType: varchar("scope_type", { length: 20 }).notNull(),
  scopeId: varchar("scope_id", { length: 255 }),
  triggeredBy: varchar("triggered_by", { length: 20 }).notNull().default("cron"),
  inputKpis: jsonb("input_kpis").$type<Record<string, any>>().default({}),
  llmUsed: boolean("llm_used").default(false),
  llmModel: varchar("llm_model", { length: 50 }),
  llmTokens: integer("llm_tokens").default(0),
  actionsGenerated: integer("actions_generated").default(0),
  status: varchar("status", { length: 20 }).default("success"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_run_type_idx").on(table.runType),
  index("agent_run_scope_idx").on(table.scopeType),
  index("agent_run_created_idx").on(table.createdAt),
]);

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// ==================== Agent Engine — Escalation History ====================

export const agentEscalationHistory = pgTable("agent_escalation_history", {
  id: serial("id").primaryKey(),
  sourceActionId: integer("source_action_id").references(() => agentPendingActions.id, { onDelete: "cascade" }).notNull(),
  escalationLevel: integer("escalation_level").notNull().default(1),
  escalatedToUserId: varchar("escalated_to_user_id", { length: 255 }),
  escalatedToRole: varchar("escalated_to_role", { length: 30 }),
  escalatedAt: timestamp("escalated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
}, (table) => [
  index("agent_esc_action_idx").on(table.sourceActionId),
  index("agent_esc_level_idx").on(table.escalationLevel),
  index("agent_esc_user_idx").on(table.escalatedToUserId),
]);

export const insertAgentEscalationHistorySchema = createInsertSchema(agentEscalationHistory).omit({
  id: true,
  escalatedAt: true,
});
export type InsertAgentEscalationHistory = z.infer<typeof insertAgentEscalationHistorySchema>;
export type AgentEscalationHistory = typeof agentEscalationHistory.$inferSelect;

// ==================== Agent Engine — Routing Rules ====================

export const agentRoutingRules = pgTable("agent_routing_rules", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  description: text("description"),
  primaryRole: varchar("primary_role", { length: 50 }).notNull(),
  secondaryRole: varchar("secondary_role", { length: 50 }),
  escalationRole: varchar("escalation_role", { length: 50 }),
  escalationDays: integer("escalation_days").default(3),
  notifyBranchSupervisor: boolean("notify_branch_supervisor").default(true),
  sendHqSummary: boolean("send_hq_summary").default(true),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_routing_category_idx").on(table.category, table.subcategory),
  index("agent_routing_active_idx").on(table.isActive),
]);

export const insertAgentRoutingRuleSchema = createInsertSchema(agentRoutingRules).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentRoutingRule = z.infer<typeof insertAgentRoutingRuleSchema>;
export type AgentRoutingRule = typeof agentRoutingRules.$inferSelect;

// ==================== Agent Engine — Action Outcomes ====================

export const agentActionOutcomes = pgTable("agent_action_outcomes", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull(),
  taskId: integer("task_id"),
  initialScore: real("initial_score"),
  followUpScore: real("follow_up_score"),
  outcome: varchar("outcome", { length: 20 }),
  followUpDate: timestamp("follow_up_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_outcome_action_idx").on(table.actionId),
  index("agent_outcome_followup_idx").on(table.followUpDate),
  index("agent_outcome_status_idx").on(table.outcome),
]);

export const insertAgentActionOutcomeSchema = createInsertSchema(agentActionOutcomes).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentActionOutcome = z.infer<typeof insertAgentActionOutcomeSchema>;
export type AgentActionOutcome = typeof agentActionOutcomes.$inferSelect;

// ==================== Agent Engine — Rejection Patterns ====================

export const agentRejectionPatterns = pgTable("agent_rejection_patterns", {
  id: serial("id").primaryKey(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  category: varchar("category", { length: 50 }),
  subcategory: varchar("subcategory", { length: 100 }),
  rejectionReason: text("rejection_reason"),
  rejectedBy: varchar("rejected_by", { length: 255 }),
  rejectedAt: timestamp("rejected_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("agent_rejection_target_idx").on(table.targetUserId, table.category),
  index("agent_rejection_expires_idx").on(table.expiresAt),
]);

export const insertAgentRejectionPatternSchema = createInsertSchema(agentRejectionPatterns).omit({
  id: true,
  rejectedAt: true,
});
export type InsertAgentRejectionPattern = z.infer<typeof insertAgentRejectionPatternSchema>;
export type AgentRejectionPattern = typeof agentRejectionPatterns.$inferSelect;

// ========================================
// FABRIKA SEVKİYAT SİSTEMİ
// ========================================

export const factoryShipments = pgTable("factory_shipments", {
  id: serial("id").primaryKey(),
  shipmentNumber: varchar("shipment_number", { length: 50 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("hazirlaniyor"),
  preparedById: varchar("prepared_by_id").references(() => users.id, { onDelete: "set null" }),
  orderRequestId: integer("order_request_id"),
  transferType: varchar("transfer_type", { length: 20 }).default("sale"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  totalSalePrice: numeric("total_sale_price", { precision: 12, scale: 2 }),
  dispatchedAt: timestamp("dispatched_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("factory_shipments_branch_idx").on(table.branchId),
  index("factory_shipments_status_idx").on(table.status),
  index("factory_shipments_date_idx").on(table.createdAt),
]);

export const insertFactoryShipmentSchema = createInsertSchema(factoryShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryShipment = z.infer<typeof insertFactoryShipmentSchema>;
export type FactoryShipment = typeof factoryShipments.$inferSelect;

export const factoryShipmentItems = pgTable("factory_shipment_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => factoryShipments.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  lotNumber: varchar("lot_number", { length: 50 }),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
}, (table) => [
  index("factory_shipment_items_shipment_idx").on(table.shipmentId),
  index("factory_shipment_items_product_idx").on(table.productId),
]);

export const insertFactoryShipmentItemSchema = createInsertSchema(factoryShipmentItems).omit({
  id: true,
});

export type InsertFactoryShipmentItem = z.infer<typeof insertFactoryShipmentItemSchema>;
export type FactoryShipmentItem = typeof factoryShipmentItems.$inferSelect;

// ==========================================
// HACCP CHECK RECORDS (FABRİKA)
// ==========================================

export const haccpCheckRecords = pgTable("haccp_check_records", {
  id: serial("id").primaryKey(),
  checkPoint: varchar("check_point", { length: 100 }).notNull(),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  checkedBy: varchar("checked_by", { length: 255 }).references(() => users.id).notNull(),
  checkDate: timestamp("check_date").defaultNow(),
  result: varchar("result", { length: 20 }).notNull(),
  temperatureValue: numeric("temperature_value", { precision: 5, scale: 2 }),
  correctiveAction: text("corrective_action"),
  notes: text("notes"),
  productionOutputId: integer("production_output_id").references(() => factoryProductionOutputs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("haccp_cr_station_idx").on(table.stationId),
  index("haccp_cr_checked_by_idx").on(table.checkedBy),
  index("haccp_cr_date_idx").on(table.checkDate),
  index("haccp_cr_result_idx").on(table.result),
]);

export const insertHaccpCheckRecordSchema = createInsertSchema(haccpCheckRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertHaccpCheckRecord = z.infer<typeof insertHaccpCheckRecordSchema>;
export type HaccpCheckRecord = typeof haccpCheckRecords.$inferSelect;

export const coffeeRoastingLogs = pgTable("coffee_roasting_logs", {
  id: serial("id").primaryKey(),
  chargeNumber: varchar("charge_number", { length: 50 }).notNull(),
  greenCoffeeProductId: integer("green_coffee_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  roastedProductId: integer("roasted_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  greenWeightKg: numeric("green_weight_kg", { precision: 10, scale: 3 }).notNull(),
  roastedWeightKg: numeric("roasted_weight_kg", { precision: 10, scale: 3 }).notNull(),
  weightLossPct: numeric("weight_loss_pct", { precision: 5, scale: 2 }),
  roastDegree: varchar("roast_degree", { length: 30 }).notNull(),
  startTemperature: numeric("start_temperature", { precision: 5, scale: 1 }),
  endTemperature: numeric("end_temperature", { precision: 5, scale: 1 }),
  firstCrackTime: integer("first_crack_time"),
  roastDurationMinutes: integer("roast_duration_minutes"),
  roastDate: timestamp("roast_date").defaultNow(),
  operatorId: text("operator_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("coffee_roasting_date_idx").on(table.roastDate),
  index("coffee_roasting_operator_idx").on(table.operatorId),
  index("coffee_roasting_degree_idx").on(table.roastDegree),
]);

export const insertCoffeeRoastingLogSchema = createInsertSchema(coffeeRoastingLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertCoffeeRoastingLog = z.infer<typeof insertCoffeeRoastingLogSchema>;
export type CoffeeRoastingLog = typeof coffeeRoastingLogs.$inferSelect;

export const productionLots = pgTable("production_lots", {
  id: serial("id").primaryKey(),
  lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  productionDate: timestamp("production_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  producedBy: text("produced_by").references(() => users.id, { onDelete: "set null" }),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("uretildi").notNull(),
  qualityCheckId: integer("quality_check_id").references(() => factoryQualityChecks.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("production_lots_product_idx").on(table.productId),
  index("production_lots_date_idx").on(table.productionDate),
  index("production_lots_status_idx").on(table.status),
  index("production_lots_expiry_idx").on(table.expiryDate),
]);

export const insertProductionLotSchema = createInsertSchema(productionLots).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionLot = z.infer<typeof insertProductionLotSchema>;
export type ProductionLot = typeof productionLots.$inferSelect;

// ========================================
// ŞUBE STOK SİSTEMİ
// ========================================

export const branchInventory = pgTable("branch_inventory", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  currentStock: numeric("current_stock", { precision: 10, scale: 2 }).default("0"),
  minimumStock: numeric("minimum_stock", { precision: 10, scale: 2 }).default("5"),
  unit: varchar("unit", { length: 20 }),
  lastReceivedAt: timestamp("last_received_at"),
  lastCountedAt: timestamp("last_counted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_inventory_branch_idx").on(table.branchId),
  index("branch_inventory_product_idx").on(table.productId),
]);

export const insertBranchInventorySchema = createInsertSchema(branchInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBranchInventory = z.infer<typeof insertBranchInventorySchema>;
export type BranchInventory = typeof branchInventory.$inferSelect;

export const branchStockMovements = pgTable("branch_stock_movements", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  movementType: varchar("movement_type", { length: 30 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 10, scale: 2 }),
  newStock: numeric("new_stock", { precision: 10, scale: 2 }),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: integer("reference_id"),
  lotNumber: varchar("lot_number", { length: 50 }),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_stock_movements_branch_idx").on(table.branchId),
  index("branch_stock_movements_product_idx").on(table.productId),
  index("branch_stock_movements_date_idx").on(table.createdAt),
]);

export const insertBranchStockMovementSchema = createInsertSchema(branchStockMovements).omit({
  id: true,
  createdAt: true,
});
export type InsertBranchStockMovement = z.infer<typeof insertBranchStockMovementSchema>;
export type BranchStockMovement = typeof branchStockMovements.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceInfo: text("device_info"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const pdksRecords = pgTable("pdks_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  recordDate: date("record_date").notNull(),
  recordTime: time("record_time").notNull(),
  recordType: varchar("record_type", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).default("kiosk"),
  deviceInfo: varchar("device_info", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("pdks_records_user_date_idx").on(table.userId, table.recordDate),
  index("pdks_records_branch_date_idx").on(table.branchId, table.recordDate),
]);

export const insertPdksRecordSchema = createInsertSchema(pdksRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertPdksRecord = z.infer<typeof insertPdksRecordSchema>;
export type PdksRecord = typeof pdksRecords.$inferSelect;

export const positionSalaries = pgTable("position_salaries", {
  id: serial("id").primaryKey(),
  positionCode: varchar("position_code", { length: 50 }).notNull(),
  positionName: varchar("position_name", { length: 100 }).notNull(),
  totalSalary: integer("total_salary").notNull(),
  baseSalary: integer("base_salary").notNull(),
  bonus: integer("bonus").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPositionSalarySchema = createInsertSchema(positionSalaries).omit({
  id: true,
  createdAt: true,
});
export type InsertPositionSalary = z.infer<typeof insertPositionSalarySchema>;
export type PositionSalary = typeof positionSalaries.$inferSelect;

export const monthlyPayroll = pgTable("monthly_payroll", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  positionCode: varchar("position_code", { length: 50 }).notNull(),
  totalCalendarDays: integer("total_calendar_days").notNull(),
  workedDays: integer("worked_days").notNull().default(0),
  offDays: integer("off_days").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").notNull().default(0),
  sickLeaveDays: integer("sick_leave_days").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  totalSalary: integer("total_salary").notNull(),
  baseSalary: integer("base_salary").notNull(),
  bonus: integer("bonus").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  absenceDeduction: integer("absence_deduction").notNull().default(0),
  bonusDeduction: integer("bonus_deduction").notNull().default(0),
  overtimePay: integer("overtime_pay").notNull().default(0),
  netPay: integer("net_pay").notNull().default(0),
  status: varchar("status", { length: 20 }).default("draft"),
  calculatedAt: timestamp("calculated_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("monthly_payroll_user_year_month_uniq").on(table.userId, table.year, table.month),
  index("monthly_payroll_branch_idx").on(table.branchId),
  index("monthly_payroll_period_idx").on(table.year, table.month),
]);

export const insertPdksPayrollSchema = createInsertSchema(monthlyPayroll).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPdksPayroll = z.infer<typeof insertPdksPayrollSchema>;
export type PdksPayroll = typeof monthlyPayroll.$inferSelect;

export const scheduledOffs = pgTable("scheduled_offs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  offDate: date("off_date").notNull(),
  offType: varchar("off_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("scheduled_offs_user_date_uniq").on(table.userId, table.offDate),
  index("scheduled_offs_user_idx").on(table.userId),
  index("scheduled_offs_date_idx").on(table.offDate),
]);

export const insertScheduledOffSchema = createInsertSchema(scheduledOffs).omit({
  id: true,
  createdAt: true,
});
export type InsertScheduledOff = z.infer<typeof insertScheduledOffSchema>;
export type ScheduledOff = typeof scheduledOffs.$inferSelect;

export const dobodyAvatars = pgTable("dobody_avatars", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  label: text("label"),
  category: text("category").default("general").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  timeStart: text("time_start"),
  timeEnd: text("time_end"),
  roles: text("roles").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertDobodyAvatarSchema = createInsertSchema(dobodyAvatars).omit({
  id: true,
  createdAt: true,
});
export type InsertDobodyAvatar = z.infer<typeof insertDobodyAvatarSchema>;
export type DobodyAvatar = typeof dobodyAvatars.$inferSelect;

export const dobodyFlowTasks = pgTable("dobody_flow_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  navigateTo: varchar("navigate_to", { length: 500 }),
  estimatedMinutes: integer("estimated_minutes").default(5),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  targetRoles: text("target_roles").array(),
  targetBranches: integer("target_branches").array(),
  targetUsers: text("target_users").array(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dobody_flow_tasks_active_idx").on(table.isActive),
  index("dobody_flow_tasks_created_by_idx").on(table.createdById),
]);

export const insertDobodyFlowTaskSchema = createInsertSchema(dobodyFlowTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDobodyFlowTask = z.infer<typeof insertDobodyFlowTaskSchema>;
export type DobodyFlowTask = typeof dobodyFlowTasks.$inferSelect;

export const dobodyFlowCompletions = pgTable("dobody_flow_completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: varchar("user_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("dobody_flow_comp_task_idx").on(table.taskId),
  index("dobody_flow_comp_user_idx").on(table.userId),
]);

export const insertDobodyFlowCompletionSchema = createInsertSchema(dobodyFlowCompletions).omit({
  id: true,
  completedAt: true,
});
export type InsertDobodyFlowCompletion = z.infer<typeof insertDobodyFlowCompletionSchema>;
export type DobodyFlowCompletion = typeof dobodyFlowCompletions.$inferSelect;

// ========================================
// DATA LOCK RULES — Sprint 27 Data Protection
// ========================================
export const dataLockRules = pgTable("data_lock_rules", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull().unique(),
  lockAfterDays: integer("lock_after_days"),
  lockOnStatus: varchar("lock_on_status", { length: 50 }),
  lockImmediately: boolean("lock_immediately").default(false),
  canRequestChange: boolean("can_request_change").default(true),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDataLockRuleSchema = createInsertSchema(dataLockRules).omit({
  id: true,
  createdAt: true,
});
export type InsertDataLockRule = z.infer<typeof insertDataLockRuleSchema>;
export type DataLockRule = typeof dataLockRules.$inferSelect;

// ========================================
// DATA CHANGE REQUESTS — Sprint 27
// ========================================
export const dataChangeRequests = pgTable("data_change_requests", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  currentValue: text("current_value"),
  requestedValue: text("requested_value"),
  reason: text("reason").notNull(),
  supportingDocumentUrl: text("supporting_document_url"),
  requestedBy: varchar("requested_by").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("dcr_table_record_idx").on(table.tableName, table.recordId),
  index("dcr_status_idx").on(table.status),
  index("dcr_requested_by_idx").on(table.requestedBy),
]);

export const insertDataChangeRequestSchema = createInsertSchema(dataChangeRequests).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
});
export type InsertDataChangeRequest = z.infer<typeof insertDataChangeRequestSchema>;
export type DataChangeRequest = typeof dataChangeRequests.$inferSelect;

// ========================================
// RECORD REVISIONS — Sprint 27
// ========================================
export const recordRevisions = pgTable("record_revisions", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  fieldChanges: jsonb("field_changes").notNull(),
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changeSource: varchar("change_source", { length: 30 }).default("direct"),
  changeRequestId: integer("change_request_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("rr_table_record_idx").on(table.tableName, table.recordId),
  index("rr_changed_by_idx").on(table.changedBy),
]);

export const insertRecordRevisionSchema = createInsertSchema(recordRevisions).omit({
  id: true,
  createdAt: true,
});
export type InsertRecordRevision = z.infer<typeof insertRecordRevisionSchema>;
export type RecordRevision = typeof recordRevisions.$inferSelect;

// ========================================
// DATA CHANGE LOG — Sprint 27
// ========================================
export const dataChangeLog = pgTable("data_change_log", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changeReason: text("change_reason"),
  changeRequestId: integer("change_request_id"),
}, (table) => [
  index("dcl_table_record_idx").on(table.tableName, table.recordId),
  index("dcl_changed_by_idx").on(table.changedBy),
  index("dcl_changed_at_idx").on(table.changedAt),
]);

// ==================== Franchise Investors ====================

export const franchiseInvestors = pgTable("franchise_investors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 200 }),
  companyName: varchar("company_name", { length: 200 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  contractStart: date("contract_start"),
  contractEnd: date("contract_end"),
  contractRenewalReminder: boolean("contract_renewal_reminder").default(true),
  investmentAmount: numeric("investment_amount", { precision: 12, scale: 2 }),
  monthlyRoyaltyRate: numeric("monthly_royalty_rate", { precision: 5, scale: 2 }).default("5.0"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("active"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fi_user_id_idx").on(table.userId),
  index("fi_status_idx").on(table.status),
]);

export const insertFranchiseInvestorSchema = createInsertSchema(franchiseInvestors).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export type InsertFranchiseInvestor = z.infer<typeof insertFranchiseInvestorSchema>;
export type FranchiseInvestor = typeof franchiseInvestors.$inferSelect;

export const franchiseInvestorBranches = pgTable("franchise_investor_branches", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => franchiseInvestors.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fib_investor_idx").on(table.investorId),
  index("fib_branch_idx").on(table.branchId),
]);

export const insertFranchiseInvestorBranchSchema = createInsertSchema(franchiseInvestorBranches).omit({ id: true, createdAt: true });
export type InsertFranchiseInvestorBranch = z.infer<typeof insertFranchiseInvestorBranchSchema>;
export type FranchiseInvestorBranch = typeof franchiseInvestorBranches.$inferSelect;

export const franchiseInvestorNotes = pgTable("franchise_investor_notes", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => franchiseInvestors.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }),
  content: text("content"),
  noteType: varchar("note_type", { length: 30 }).default("meeting"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fin_investor_idx").on(table.investorId),
]);

export const insertFranchiseInvestorNoteSchema = createInsertSchema(franchiseInvestorNotes).omit({ id: true, createdAt: true });
export type InsertFranchiseInvestorNote = z.infer<typeof insertFranchiseInvestorNoteSchema>;
export type FranchiseInvestorNote = typeof franchiseInvestorNotes.$inferSelect;

// =============================================
// Academy V3 — Webinars
// =============================================

export const webinars = pgTable("webinars", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  hostName: text("host_name"),
  hostUserId: varchar("host_user_id").references(() => users.id, { onDelete: "set null" }),
  webinarDate: timestamp("webinar_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  meetingLink: text("meeting_link"),
  recordingUrl: text("recording_url"),
  targetRoles: text("target_roles").array().default(sql`'{}'::text[]`),
  isLive: boolean("is_live").default(false),
  status: text("status").default("scheduled"),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  maxParticipants: integer("max_participants"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("webinars_date_idx").on(table.webinarDate),
  index("webinars_status_idx").on(table.status),
]);

export const insertWebinarSchema = createInsertSchema(webinars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinars.$inferSelect;

export const webinarRegistrations = pgTable("webinar_registrations", {
  id: serial("id").primaryKey(),
  webinarId: integer("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  registeredAt: timestamp("registered_at").defaultNow(),
  attended: boolean("attended").default(false),
  attendedAt: timestamp("attended_at"),
  status: text("status").default("registered"),
}, (table) => [
  index("wr_webinar_idx").on(table.webinarId),
  index("wr_user_idx").on(table.userId),
  unique("wr_webinar_user_uniq").on(table.webinarId, table.userId),
]);

export const insertWebinarRegistrationSchema = createInsertSchema(webinarRegistrations).omit({ id: true, registeredAt: true });
export type InsertWebinarRegistration = z.infer<typeof insertWebinarRegistrationSchema>;
export type WebinarRegistration = typeof webinarRegistrations.$inferSelect;

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  branchId: integer("branch_id").references(() => branches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  department: varchar("department", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("acik"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  slaDeadline: timestamp("sla_deadline"),
  slaBreached: boolean("sla_breached").notNull().default(false),
  slaBreachedAt: timestamp("sla_breached_at"),
  relatedEquipmentId: integer("related_equipment_id"),
  recurrenceCount: integer("recurrence_count").notNull().default(1),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id),
  resolutionNote: text("resolution_note"),
  satisfactionScore: integer("satisfaction_score"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ticketType: varchar("ticket_type", { length: 50 }).default("franchise_talep"),
  source: varchar("source", { length: 30 }).default("manual"),
  channel: varchar("channel", { length: 20 }).default("franchise"),
  rating: integer("rating"),
  ratingHizmet: integer("rating_hizmet"),
  ratingTemizlik: integer("rating_temizlik"),
  ratingUrun: integer("rating_urun"),
  ratingPersonel: integer("rating_personel"),
  customerName: varchar("customer_name", { length: 200 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  isAnonymous: boolean("is_anonymous").default(false),
  photoUrls: text("photo_urls").array(),
}, (table) => [
  index("st_branch_idx").on(table.branchId),
  index("st_dept_idx").on(table.department),
  index("st_status_idx").on(table.status),
  index("st_assigned_idx").on(table.assignedToUserId),
  index("st_channel_idx").on(table.channel),
]);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export const supportTicketComments = pgTable("support_ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  commentType: varchar("comment_type", { length: 20 }).notNull().default("reply"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketCommentSchema = createInsertSchema(supportTicketComments).omit({ id: true, createdAt: true });
export type InsertSupportTicketComment = z.infer<typeof insertSupportTicketCommentSchema>;
export type SupportTicketComment = typeof supportTicketComments.$inferSelect;

export const ticketCoworkMembers = pgTable("ticket_cowork_members", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
}, (table) => [
  index("tcm_ticket_idx").on(table.ticketId),
  index("tcm_user_idx").on(table.userId),
  uniqueIndex("tcm_ticket_user_unique").on(table.ticketId, table.userId),
]);

export type TicketCoworkMember = typeof ticketCoworkMembers.$inferSelect;
export type InsertTicketCoworkMember = typeof ticketCoworkMembers.$inferInsert;

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => supportTicketComments.id, { onDelete: "set null" }),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull().references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ta_ticket_idx").on(table.ticketId),
]);

export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = typeof ticketAttachments.$inferInsert;

export const hqTasks = pgTable("hq_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  assignedByUserId: varchar("assigned_by_user_id").notNull().references(() => users.id),
  assignedToUserId: varchar("assigned_to_user_id").notNull().references(() => users.id),
  department: varchar("department", { length: 50 }),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("beklemede"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
  progressPercent: integer("progress_percent").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hqt_assigned_to_idx").on(table.assignedToUserId),
  index("hqt_assigned_by_idx").on(table.assignedByUserId),
  index("hqt_status_idx").on(table.status),
]);

export const insertHqTaskSchema = createInsertSchema(hqTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHqTask = z.infer<typeof insertHqTaskSchema>;
export type HqTask = typeof hqTasks.$inferSelect;

export const broadcastReceipts = pgTable("broadcast_receipts", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  seenAt: timestamp("seen_at"),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  unique("br_announcement_user_uniq").on(table.announcementId, table.userId),
  index("br_ann_idx").on(table.announcementId),
]);

export const insertBroadcastReceiptSchema = createInsertSchema(broadcastReceipts).omit({ id: true });
export type InsertBroadcastReceipt = z.infer<typeof insertBroadcastReceiptSchema>;
export type BroadcastReceipt = typeof broadcastReceipts.$inferSelect;

export const moduleDelegations = pgTable('module_delegations', {
  id: serial('id').primaryKey(),
  moduleKey: varchar('module_key', { length: 100 }).notNull(),
  moduleName: varchar('module_name', { length: 200 }).notNull(),
  fromRole: varchar('from_role', { length: 100 }).notNull(),
  toRole: varchar('to_role', { length: 100 }).notNull(),
  delegationType: varchar('delegation_type', { length: 20 }).notNull().default('gecici'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  note: varchar('note', { length: 500 }),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index("md_module_key_idx").on(table.moduleKey),
  index("md_to_role_idx").on(table.toRole),
  index("md_is_active_idx").on(table.isActive),
]);

export type ModuleDelegation = typeof moduleDelegations.$inferSelect;
export type InsertModuleDelegation = typeof moduleDelegations.$inferInsert;

// Module departments (content map for delegation)
export const moduleDepartments = pgTable('module_departments', {
  id: serial('id').primaryKey(),
  moduleKey: varchar('module_key', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  icon: varchar('icon', { length: 10 }).default('📌'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moduleDepartmentTopics = pgTable('module_department_topics', {
  id: serial('id').primaryKey(),
  departmentId: integer('department_id')
    .notNull()
    .references(() => moduleDepartments.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 200 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertModuleDepartmentSchema = createInsertSchema(moduleDepartments).omit({ id: true, createdAt: true });
export const insertModuleDepartmentTopicSchema = createInsertSchema(moduleDepartmentTopics).omit({ id: true, createdAt: true });

export type ModuleDepartment = typeof moduleDepartments.$inferSelect;
export type InsertModuleDepartment = z.infer<typeof insertModuleDepartmentSchema>;
export type ModuleDepartmentTopic = typeof moduleDepartmentTopics.$inferSelect;
export type InsertModuleDepartmentTopic = z.infer<typeof insertModuleDepartmentTopicSchema>;

export const slaRules = pgTable('sla_rules', {
  id: serial('id').primaryKey(),
  department: varchar('department', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  hoursLimit: integer('hours_limit').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedBy: varchar('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SlaRule = typeof slaRules.$inferSelect;
export type InsertSlaRule = typeof slaRules.$inferInsert;

export const slaBusinessHours = pgTable('sla_business_hours', {
  id: serial('id').primaryKey(),
  startHour: integer('start_hour').notNull().default(8),
  endHour: integer('end_hour').notNull().default(18),
  workDays: integer('work_days').array().notNull().default(sql`'{1,2,3,4,5}'`),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Istanbul'),
  updatedBy: varchar('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SlaBusinessHours = typeof slaBusinessHours.$inferSelect;
export type InsertSlaBusinessHours = typeof slaBusinessHours.$inferInsert;

export const factoryKioskConfig = pgTable("factory_kiosk_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: varchar("config_value", { length: 500 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FactoryKioskConfig = typeof factoryKioskConfig.$inferSelect;
export type InsertFactoryKioskConfig = typeof factoryKioskConfig.$inferInsert;

export const moduleFlags = pgTable("module_flags", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 100 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull().default("global"),
  branchId: integer("branch_id").references(() => branches.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
  flagLevel: varchar("flag_level", { length: 20 }).notNull().default("module"),
  flagBehavior: varchar("flag_behavior", { length: 30 }).notNull().default("fully_hidden"),
  parentKey: varchar("parent_key", { length: 100 }),
  targetRole: varchar("target_role", { length: 50 }),
  enabledBy: varchar("enabled_by").references(() => users.id),
  enabledAt: timestamp("enabled_at", { withTimezone: true }).defaultNow(),
  disabledBy: varchar("disabled_by").references(() => users.id),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_module_flags_key_scope_branch_role").on(table.moduleKey, table.scope, table.branchId, table.targetRole),
]);

export const insertModuleFlagSchema = createInsertSchema(moduleFlags).omit({ id: true, createdAt: true, updatedAt: true });
export type ModuleFlag = typeof moduleFlags.$inferSelect;
export type InsertModuleFlag = z.infer<typeof insertModuleFlagSchema>;

export const branchTaskCategories = pgTable("branch_task_categories", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBranchTaskCategorySchema = createInsertSchema(branchTaskCategories).omit({ id: true, createdAt: true });
export type BranchTaskCategory = typeof branchTaskCategories.$inferSelect;
export type InsertBranchTaskCategory = z.infer<typeof insertBranchTaskCategorySchema>;
