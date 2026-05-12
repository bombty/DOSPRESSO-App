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

import { Checklist, PERMISSIONS, branches, checklists, equipment, tasks, users } from './schema-02';
import { Shift, flashcards, knowledgeBaseArticles, shiftAttendance, shifts } from './schema-03';
import { branding } from './schema-04';

// ========================================
// SITE SETTINGS - Global configuration
// ========================================

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  type: varchar("type", { length: 20 }).notNull().default("string"), // string, number, boolean, json, file
  category: varchar("category", { length: 50 }).notNull().default("general"), // general, branding, theme, email
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false), // Can be accessed by non-admin users
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("site_settings_key_idx").on(table.key),
  index("site_settings_category_idx").on(table.category),
]);

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// ========================================
// PASSWORD RESET TOKENS
// ========================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_tokens_token_idx").on(table.token),
  index("password_reset_tokens_user_idx").on(table.userId),
]);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ========================================
// AUDIT LOGS - Activity tracking
// ========================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  actorRole: varchar("actor_role", { length: 50 }),
  scopeBranchId: integer("scope_branch_id"),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  targetResource: varchar("target_resource", { length: 100 }),
  targetResourceId: varchar("target_resource_id", { length: 100 }),
  before: jsonb("before"),
  after: jsonb("after"),
  details: jsonb("details"),
  requestId: varchar("request_id", { length: 64 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_event_type_idx").on(table.eventType),
  index("audit_logs_resource_idx").on(table.resource),
  index("audit_logs_branch_idx").on(table.scopeBranchId),
  index("audit_logs_created_idx").on(table.createdAt),
  index("audit_logs_request_idx").on(table.requestId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========================================
// OVERTIME REQUESTS - Employee overtime management
// ========================================

export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  overtimeDate: date("overtime_date").notNull(), // Date of overtime
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format - overtime start
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format - overtime end
  requestedMinutes: integer("requested_minutes").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approverId: varchar("approver_id").references(() => users.id, { onDelete: "set null" }),
  approvedMinutes: integer("approved_minutes"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  appliedToPeriod: varchar("applied_to_period", { length: 7 }), // YYYY-MM format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("overtime_requests_user_idx").on(table.userId),
  index("overtime_requests_status_idx").on(table.status),
  index("overtime_requests_period_idx").on(table.appliedToPeriod),
  index("overtime_requests_date_idx").on(table.overtimeDate),
  index("overtime_requests_branch_idx").on(table.branchId),
]);

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;

// ========================================
// SHIFT SWAP REQUESTS - Employee shift swap with dual approval
// ========================================

export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  targetShiftId: integer("target_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  swapDate: date("swap_date").notNull(), // Date of the shift swap
  reason: text("reason"),
  // Dual approval system
  targetApproved: boolean("target_approved"), // null = pending, true = approved, false = rejected
  targetApprovedAt: timestamp("target_approved_at"),
  targetRejectionReason: text("target_rejection_reason"),
  supervisorApproved: boolean("supervisor_approved"), // null = pending, true = approved, false = rejected
  supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  supervisorRejectionReason: text("supervisor_rejection_reason"),
  // Overall status
  status: varchar("status", { length: 20 }).notNull().default("pending_target"), 
  // pending_target, pending_supervisor, approved, rejected_by_target, rejected_by_supervisor, cancelled
  executedAt: timestamp("executed_at"), // When the swap was actually performed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_swap_requester_idx").on(table.requesterId),
  index("shift_swap_target_idx").on(table.targetUserId),
  index("shift_swap_status_idx").on(table.status),
  index("shift_swap_branch_idx").on(table.branchId),
  index("shift_swap_date_idx").on(table.swapDate),
]);

export const insertShiftSwapRequestSchema = createInsertSchema(shiftSwapRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftSwapRequest = z.infer<typeof insertShiftSwapRequestSchema>;
export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;

// ========================================
// ATTENDANCE PENALTIES - Track all penalties and deductions
// ========================================

export const attendancePenalties = pgTable("attendance_penalties", {
  id: serial("id").primaryKey(),
  shiftAttendanceId: integer("shift_attendance_id").notNull().references(() => shiftAttendance.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // lateness, early_leave, break_overage, manual
  minutes: integer("minutes").notNull(),
  reason: text("reason").notNull(),
  autoGenerated: boolean("auto_generated").notNull().default(true),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("attendance_penalties_shift_idx").on(table.shiftAttendanceId),
  index("attendance_penalties_type_idx").on(table.type),
]);

export const insertAttendancePenaltySchema = createInsertSchema(attendancePenalties).omit({
  id: true,
  createdAt: true,
});

export type InsertAttendancePenalty = z.infer<typeof insertAttendancePenaltySchema>;
export type AttendancePenalty = typeof attendancePenalties.$inferSelect;

// ========================================
// MONTHLY ATTENDANCE SUMMARIES - Pre-aggregated monthly reports
// ========================================

export const monthlyAttendanceSummaries = pgTable("monthly_attendance_summaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodMonth: varchar("period_month", { length: 7 }).notNull(), // YYYY-MM format
  totalScheduledMinutes: integer("total_scheduled_minutes").default(0).notNull(),
  totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
  totalPenaltyMinutes: integer("total_penalty_minutes").default(0).notNull(),
  totalOvertimeMinutes: integer("total_overtime_minutes").default(0).notNull(),
  latenessCount: integer("lateness_count").default(0).notNull(),
  earlyLeaveCount: integer("early_leave_count").default(0).notNull(),
  complianceScoreAvg: integer("compliance_score_avg").default(100).notNull(), // 0-100
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_period").on(table.userId, table.periodMonth),
  index("monthly_summaries_user_idx").on(table.userId),
  index("monthly_summaries_period_idx").on(table.periodMonth),
]);

export const insertMonthlyAttendanceSummarySchema = createInsertSchema(monthlyAttendanceSummaries).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});

export type InsertMonthlyAttendanceSummary = z.infer<typeof insertMonthlyAttendanceSummarySchema>;
export type MonthlyAttendanceSummary = typeof monthlyAttendanceSummaries.$inferSelect;

// ========================================
// GUEST COMPLAINTS - Enhanced customer complaint tracking with SLA
// ========================================

export const guestComplaints = pgTable("guest_complaints", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  // Complaint details
  complaintSource: varchar("complaint_source", { length: 50 }).notNull(), // phone, email, google, instagram, facebook, in_person
  complaintCategory: varchar("complaint_category", { length: 100 }).notNull(), // product, staff, cleanliness, service_speed, temperature, noise, other
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  complaintDate: timestamp("complaint_date").defaultNow().notNull(),
  complaintTime: varchar("complaint_time", { length: 5 }), // HH:MM format
  // Customer info (optional)
  customerName: varchar("customer_name", { length: 100 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  // Assignment & SLA
  assignedToType: varchar("assigned_to_type", { length: 50 }), // branch, hq_tech, hq_admin, accounting
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  responseDeadline: timestamp("response_deadline"), // Calculated from priority
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  // Status & Resolution
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, assigned, in_progress, resolved, closed
  slaBreached: boolean("sla_breached").notNull().default(false),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating after resolution
  sourceFeedbackId: integer("source_feedback_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("guest_complaints_branch_idx").on(table.branchId),
  index("guest_complaints_status_idx").on(table.status),
  index("guest_complaints_priority_idx").on(table.priority),
  index("guest_complaints_date_idx").on(table.complaintDate),
  index("guest_complaints_deadline_idx").on(table.responseDeadline),
]);

export const insertGuestComplaintSchema = createInsertSchema(guestComplaints).omit({
  id: true,
  complaintDate: true,
  createdAt: true,
  updatedAt: true,
  hqNote: text("hq_note"),
  isInternal: boolean("is_internal").default(false),
});

export type InsertGuestComplaint = z.infer<typeof insertGuestComplaintSchema>;
export type GuestComplaint = typeof guestComplaints.$inferSelect;

// ========================================
// EQUIPMENT TROUBLESHOOTING STEPS - Guided self-service before fault reporting
// ========================================

export const equipmentTroubleshootingSteps = pgTable("equipment_troubleshooting_steps", {
  id: serial("id").primaryKey(),
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(), // espresso_machine, grinder, refrigerator
  order: integer("order").notNull(), // Display order
  description: text("description").notNull(), // "Cihazı kapatıp 30 saniye bekleyin"
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  isRequired: boolean("is_required").notNull().default(true), // Must complete before fault reporting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("troubleshooting_equipment_type_idx").on(table.equipmentType),
  index("troubleshooting_order_idx").on(table.order),
]);

export const insertEquipmentTroubleshootingStepSchema = createInsertSchema(equipmentTroubleshootingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentTroubleshootingStep = z.infer<typeof insertEquipmentTroubleshootingStepSchema>;
export type EquipmentTroubleshootingStep = typeof equipmentTroubleshootingSteps.$inferSelect;

// ========================================
// EMPLOYEE PERFORMANCE SCORES - Personel Performans Skorları  
// ========================================

export const employeePerformanceScores = pgTable("employee_performance_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  week: varchar("week", { length: 10 }).notNull(), // 2025-W47
  // Attendance & Punctuality scores
  attendanceScore: integer("attendance_score").notNull().default(100), // 0-100
  latenessScore: integer("lateness_score").notNull().default(100), // 0-100, decreased by lateness
  earlyLeaveScore: integer("early_leave_score").notNull().default(100), // 0-100
  breakComplianceScore: integer("break_compliance_score").notNull().default(100), // 0-100
  // Shift compliance
  shiftComplianceScore: integer("shift_compliance_score").notNull().default(100), // 0-100
  overtimeComplianceScore: integer("overtime_compliance_score").notNull().default(100), // 0-100
  // Checklist compliance (40% weight in daily total)
  checklistScore: integer("checklist_score").notNull().default(100), // 0-100
  checklistsCompleted: integer("checklists_completed").notNull().default(0), // Count of completed checklists
  // Totals
  dailyTotalScore: integer("daily_total_score").notNull().default(100), // Weighted average
  weeklyTotalScore: integer("weekly_total_score").notNull().default(100), // Week average
  // Penalties applied
  totalPenaltyMinutes: integer("total_penalty_minutes").notNull().default(0),
  // Metadata
  latenessMinutes: integer("lateness_minutes").notNull().default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").notNull().default(0),
  breakOverageMinutes: integer("break_overage_minutes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("performance_scores_user_idx").on(table.userId),
  index("performance_scores_branch_idx").on(table.branchId),
  index("performance_scores_date_idx").on(table.date),
  index("performance_scores_week_idx").on(table.week),
  unique("unique_user_date_performance").on(table.userId, table.date),
]);

export const insertEmployeePerformanceScoreSchema = createInsertSchema(employeePerformanceScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeePerformanceScore = z.infer<typeof insertEmployeePerformanceScoreSchema>;
export type EmployeePerformanceScore = typeof employeePerformanceScores.$inferSelect;

// ========================================
// STAFF EVALUATIONS - Personel Değerlendirme Sistemi
// ========================================

export const staffEvaluations = pgTable("staff_evaluations", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorRole: varchar("evaluator_role", { length: 50 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  inspectionId: integer("inspection_id"),
  customerBehavior: integer("customer_behavior").notNull().default(3),
  friendliness: integer("friendliness").notNull().default(3),
  knowledgeExperience: integer("knowledge_experience").notNull().default(3),
  dressCode: integer("dress_code").notNull().default(3),
  cleanliness: integer("cleanliness").notNull().default(3),
  teamwork: integer("teamwork").notNull().default(3),
  punctuality: integer("punctuality").notNull().default(3),
  initiative: integer("initiative").notNull().default(3),
  overallScore: real("overall_score").notNull().default(0),
  notes: text("notes"),
  evaluationType: varchar("evaluation_type", { length: 30 }).notNull().default("standard"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffEvaluationSchema = createInsertSchema(staffEvaluations).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffEvaluation = z.infer<typeof insertStaffEvaluationSchema>;
export type StaffEvaluation = typeof staffEvaluations.$inferSelect;

// ========================================
// BRANCH QUALITY AUDITS - Şube Kalite Denetim Puanlama
// ========================================

export const branchQualityAudits = pgTable("branch_quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  auditDate: date("audit_date").notNull(),
  auditorId: varchar("auditor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Audit Categories (0-100 each)
  cleanlinessScore: integer("cleanliness_score").notNull(), // Temizlik skoru
  serviceQualityScore: integer("service_quality_score").notNull(), // Hizmet kalitesi
  productQualityScore: integer("product_quality_score").notNull(), // Ürün kalitesi
  staffBehaviorScore: integer("staff_behavior_score").notNull(), // Personel davranışı
  safetyComplianceScore: integer("safety_compliance_score").notNull(), // Güvenlik uyumu
  equipmentMaintenanceScore: integer("equipment_maintenance_score").notNull(), // Ekipman bakım
  
  // Expanded Coach Inspection Categories (0-100 each)
  exteriorScore: integer("exterior_score").default(0), // Dış mekan
  buildingAppearanceScore: integer("building_appearance_score").default(0), // Bina görünüş
  barLayoutScore: integer("bar_layout_score").default(0), // Bar düzeni
  storageScore: integer("storage_score").default(0), // Depo tamamlığı
  productPresentationScore: integer("product_presentation_score").default(0), // Ürün sunumu
  dressCodeScore: integer("dress_code_score").default(0), // Personel dress code
  
  // Overall
  overallScore: integer("overall_score").notNull(), // Weighted average
  
  // Notes and actions
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array of required actions
  categoryNotes: text("category_notes"), // JSON: { "exterior": "note", ... }
  photoUrls: text("photo_urls"), // JSON array of photo URLs
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("completed"), // draft, completed, follow_up_pending
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_quality_audits_branch_idx").on(table.branchId),
  index("branch_quality_audits_date_idx").on(table.auditDate),
  index("branch_quality_audits_auditor_idx").on(table.auditorId),
]);

export const insertBranchQualityAuditSchema = createInsertSchema(branchQualityAudits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cleanlinessScore: z.number().int().min(0).max(100),
  serviceQualityScore: z.number().int().min(0).max(100),
  productQualityScore: z.number().int().min(0).max(100),
  staffBehaviorScore: z.number().int().min(0).max(100),
  safetyComplianceScore: z.number().int().min(0).max(100),
  equipmentMaintenanceScore: z.number().int().min(0).max(100),
  exteriorScore: z.number().int().min(0).max(100).optional(),
  buildingAppearanceScore: z.number().int().min(0).max(100).optional(),
  barLayoutScore: z.number().int().min(0).max(100).optional(),
  storageScore: z.number().int().min(0).max(100).optional(),
  productPresentationScore: z.number().int().min(0).max(100).optional(),
  dressCodeScore: z.number().int().min(0).max(100).optional(),
  overallScore: z.number().int().min(0).max(100),
});

export type InsertBranchQualityAudit = z.infer<typeof insertBranchQualityAuditSchema>;
export type BranchQualityAudit = typeof branchQualityAudits.$inferSelect;

// ========================================
// PRODUCT COMPLAINTS - Ürün Şikayetleri (Şube → Kalite Kontrol)
// ========================================

export const productComplaints = pgTable("product_complaints", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),

  productName: varchar("product_name", { length: 255 }).notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  complaintType: varchar("complaint_type", { length: 50 }).notNull(), // taste, appearance, packaging, freshness, foreign_object, other
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  description: text("description").notNull(),
  photoUrls: text("photo_urls"), // JSON array
  
  status: varchar("status", { length: 30 }).notNull().default("new"), // new, investigating, resolved, rejected
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("product_complaints_branch_idx").on(table.branchId),
  index("product_complaints_status_idx").on(table.status),
  index("product_complaints_assigned_idx").on(table.assignedToId),
  index("product_complaints_created_idx").on(table.createdAt),
]);

export const insertProductComplaintSchema = createInsertSchema(productComplaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  status: true,
});

export type InsertProductComplaint = z.infer<typeof insertProductComplaintSchema>;
export type ProductComplaint = typeof productComplaints.$inferSelect;

// ========================================
// EMPLOYEE DOCUMENTS - Özlük Dosyası Belgeleri
// ========================================

export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // id_card, diploma, health_report, contract, bank_info, insurance, certificate
  documentName: varchar("document_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  expiryDate: date("expiry_date"),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_documents_user_idx").on(table.userId),
  index("employee_documents_type_idx").on(table.documentType),
  index("employee_documents_expiry_idx").on(table.expiryDate),
]);

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;

// ========================================
// DISCIPLINARY REPORTS - Tutanaklar, Disiplin İşlemleri, Yazılı Savunmalar
// ========================================

export const disciplinaryReports = pgTable("disciplinary_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportType: varchar("report_type", { length: 50 }).notNull(), // warning, investigation, defense, meeting_minutes
  severity: varchar("severity", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  incidentDate: date("incident_date").notNull(),
  incidentTime: varchar("incident_time", { length: 5 }), // HH:MM format
  location: varchar("location", { length: 255 }),
  witnessIds: text("witness_ids").array(), // Array of user IDs
  attachmentUrls: text("attachment_urls").array(), // Fotoğraflar ve belgeler
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employeeResponse: text("employee_response"), // Yazılı savunma
  employeeResponseDate: timestamp("employee_response_date"),
  employeeResponseAttachments: text("employee_response_attachments").array(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, under_review, resolved, closed
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  actionTaken: varchar("action_taken", { length: 100 }), // verbal_warning, written_warning, suspension, termination, cleared
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("disciplinary_reports_user_idx").on(table.userId),
  index("disciplinary_reports_branch_idx").on(table.branchId),
  index("disciplinary_reports_type_idx").on(table.reportType),
  index("disciplinary_reports_status_idx").on(table.status),
  index("disciplinary_reports_date_idx").on(table.incidentDate),
]);

export const insertDisciplinaryReportSchema = createInsertSchema(disciplinaryReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDisciplinaryReport = z.infer<typeof insertDisciplinaryReportSchema>;
export type DisciplinaryReport = typeof disciplinaryReports.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING - Yeni Personel Onboarding Süreci
// ========================================

export const employeeOnboarding = pgTable("employee_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, completed
  startDate: date("start_date").notNull(),
  expectedCompletionDate: date("expected_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedMentorId: varchar("assigned_mentor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  employeeNotes: text("employee_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_user_idx").on(table.userId),
  index("employee_onboarding_branch_idx").on(table.branchId),
  index("employee_onboarding_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingSchema = createInsertSchema(employeeOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboarding = z.infer<typeof insertEmployeeOnboardingSchema>;
export type EmployeeOnboarding = typeof employeeOnboarding.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING TASKS - Onboarding Görevleri
// ========================================

export const employeeOnboardingTasks = pgTable("employee_onboarding_tasks", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => employeeOnboarding.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 100 }).notNull(), // document_upload, training, orientation, system_access, meet_team
  taskName: varchar("task_name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, skipped
  completedById: varchar("completed_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  attachmentUrls: text("attachment_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_tasks_onboarding_idx").on(table.onboardingId),
  index("onboarding_tasks_status_idx").on(table.status),
  index("onboarding_tasks_due_date_idx").on(table.dueDate),
]);

export const insertEmployeeOnboardingTaskSchema = createInsertSchema(employeeOnboardingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingTask = z.infer<typeof insertEmployeeOnboardingTaskSchema>;
export type EmployeeOnboardingTask = typeof employeeOnboardingTasks.$inferSelect;

// Onboarding şablon adımları - Her şablondaki eğitim aşamaları
// (onboardingTemplates tablosu schema-30-onboarding-ai.ts'e taşındı — Sprint 47.1)
export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  stepOrder: integer("step_order").notNull().default(1),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startDay: integer("start_day").notNull().default(1),
  endDay: integer("end_day").notNull().default(3),
  contentType: varchar("content_type", { length: 30 }).notNull().default("module"),
  contentId: integer("content_id"),
  estimatedMinutes: integer("estimated_minutes").default(15),
  approverType: varchar("approver_type", { length: 30 }).notNull().default("auto"),
  mentorRoleType: varchar("mentor_role_type", { length: 50 }).notNull().default("barista"),
  trainingModuleId: integer("training_module_id"),
  requiredCompletion: boolean("required_completion").notNull().default(true),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_template_steps_template_idx").on(table.templateId),
  index("onboarding_template_steps_order_idx").on(table.stepOrder),
]);

export const insertOnboardingTemplateStepSchema = createInsertSchema(onboardingTemplateSteps).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingTemplateStep = z.infer<typeof insertOnboardingTemplateStepSchema>;
export type OnboardingTemplateStep = typeof onboardingTemplateSteps.$inferSelect;

// Personel onboarding atama - Yeni personele şablon uygulandığında
export const employeeOnboardingAssignments = pgTable("employee_onboarding_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Yeni personel
  branchId: integer("branch_id").notNull(),
  templateId: integer("template_id").notNull(),
  mentorId: varchar("mentor_id"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  expectedEndDate: timestamp("expected_end_date"), // Beklenen bitiş (startDate + durationDays)
  actualEndDate: timestamp("actual_end_date"), // Gerçek bitiş
  status: varchar("status", { length: 30 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  overallProgress: integer("overall_progress").notNull().default(0), // 0-100 yüzde
  managerNotified: boolean("manager_notified").notNull().default(false), // Tamamlandığında bildirim gönderildi mi?
  evaluationStatus: varchar("evaluation_status", { length: 30 }), // pending, passed, failed (deneme süreci değerlendirmesi)
  evaluationNotes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_assignments_user_idx").on(table.userId),
  index("employee_onboarding_assignments_branch_idx").on(table.branchId),
  index("employee_onboarding_assignments_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingAssignmentSchema = createInsertSchema(employeeOnboardingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingAssignment = z.infer<typeof insertEmployeeOnboardingAssignmentSchema>;
export type EmployeeOnboardingAssignment = typeof employeeOnboardingAssignments.$inferSelect;

// Personel onboarding adım ilerlemesi - Her adım için ilerleme
export const employeeOnboardingProgress = pgTable("employee_onboarding_progress", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => employeeOnboardingAssignments.id, { onDelete: "cascade" }),
  stepId: integer("step_id").notNull().references(() => onboardingTemplateSteps.id),
  mentorId: varchar("mentor_id"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  approvalStatus: varchar("approval_status", { length: 30 }).default("not_required"),
  approvedById: varchar("approved_by_id"),
  approvedAt: timestamp("approved_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  mentorNotes: text("mentor_notes"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_progress_assignment_idx").on(table.assignmentId),
  index("employee_onboarding_progress_step_idx").on(table.stepId),
  index("employee_onboarding_progress_mentor_idx").on(table.mentorId),
  index("employee_onboarding_progress_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingProgressSchema = createInsertSchema(employeeOnboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingProgress = z.infer<typeof insertEmployeeOnboardingProgressSchema>;
export type EmployeeOnboardingProgress = typeof employeeOnboardingProgress.$inferSelect;

// ========================================
// CERTIFICATE DESIGN SETTINGS
// ========================================

export const certificateDesignSettings = pgTable("certificate_design_settings", {
  id: serial("id").primaryKey(),
  transitionFrom: varchar("transition_from", { length: 50 }).notNull(), // e.g., "stajyer"
  transitionTo: varchar("transition_to", { length: 50 }).notNull(), // e.g., "bar_buddy"
  certificateTitle: varchar("certificate_title", { length: 255 }).notNull().default("Başarı Sertifikası"),
  subtitle: varchar("subtitle", { length: 255 }),
  primaryColor: varchar("primary_color", { length: 20 }).default("#1e3a5f"),
  secondaryColor: varchar("secondary_color", { length: 20 }).default("#c9a96e"),
  logoUrl: text("logo_url"),
  signatureLabel: varchar("signature_label", { length: 200 }).default("DOSPRESSO Eğitim Müdürü"),
  signatureImageUrl: text("signature_image_url"),
  templateLayout: varchar("template_layout", { length: 50 }).default("classic"), // classic, modern, minimal
  footerText: text("footer_text"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("cert_design_transition_idx").on(table.transitionFrom, table.transitionTo),
]);

export const insertCertificateDesignSettingSchema = createInsertSchema(certificateDesignSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const certificateSettings = pgTable("certificate_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 50 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const issuedCertificates = pgTable("issued_certificates", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 30 }).notNull(),
  templateKey: varchar("template_key", { length: 50 }).notNull(),
  certificateNo: varchar("certificate_no", { length: 30 }).notNull().unique(),
  recipientUserId: varchar("recipient_user_id").references(() => users.id),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  branchName: varchar("branch_name", { length: 200 }),
  moduleName: varchar("module_name", { length: 200 }),
  quizScore: integer("quiz_score"),
  signer1Name: varchar("signer1_name", { length: 100 }).notNull(),
  signer1Title: varchar("signer1_title", { length: 100 }).notNull(),
  signer2Name: varchar("signer2_name", { length: 100 }).notNull(),
  signer2Title: varchar("signer2_title", { length: 100 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertCertificateDesignSetting = z.infer<typeof insertCertificateDesignSettingSchema>;
export type CertificateDesignSetting = typeof certificateDesignSettings.$inferSelect;

// ========================================
// PERMISSION MODULES - Yetki Modülleri Tanımları
// ========================================

export const permissionModules = pgTable("permission_modules", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 50 }).notNull().unique(), // dashboard, tasks, checklists, etc.
  moduleName: varchar("module_name", { length: 100 }).notNull(), // "Panel", "Görevler", etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // hq, branch, factory, shared
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("permission_modules_module_key_idx").on(table.moduleKey),
  index("permission_modules_category_idx").on(table.category),
]);

export const insertPermissionModuleSchema = createInsertSchema(permissionModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPermissionModule = z.infer<typeof insertPermissionModuleSchema>;
export type PermissionModule_DB = typeof permissionModules.$inferSelect;

// ========================================
// PERMISSION ACTIONS - Modül İçi Granüler Aksiyonlar
// ========================================

export const PermissionScope = {
  SELF: "self",       // Sadece kendi verilerini görebilir
  BRANCH: "branch",   // Şube genelini görebilir
  GLOBAL: "global",   // Tüm şubeleri görebilir
} as const;

export type PermissionScopeType = typeof PermissionScope[keyof typeof PermissionScope];

export const permissionActions = pgTable("permission_actions", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 50 }).notNull(), // accounting, hr, employees, etc.
  actionKey: varchar("action_key", { length: 50 }).notNull(), // view_salary, edit_salary, etc.
  labelTr: varchar("label_tr", { length: 100 }).notNull(), // "Maaş Görüntüle"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permission_actions_module_key_idx").on(table.moduleKey),
  unique("permission_actions_module_action_unique").on(table.moduleKey, table.actionKey),
]);

export const insertPermissionActionSchema = createInsertSchema(permissionActions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermissionAction = z.infer<typeof insertPermissionActionSchema>;
export type PermissionActionRow = typeof permissionActions.$inferSelect;

// ========================================
// ROLE PERMISSION GRANTS - Rol-Aksiyon-Scope İlişkileri
// ========================================

export const rolePermissionGrants = pgTable("role_permission_grants", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, muhasebe, supervisor, etc.
  actionId: integer("action_id").notNull().references(() => permissionActions.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull().default("self"), // self, branch, global
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_permission_grants_role_idx").on(table.role),
  index("role_permission_grants_action_idx").on(table.actionId),
  unique("role_permission_grants_role_action_unique").on(table.role, table.actionId),
]);

export const insertRolePermissionGrantSchema = createInsertSchema(rolePermissionGrants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRolePermissionGrantSchema = insertRolePermissionGrantSchema.partial();

export type InsertRolePermissionGrant = z.infer<typeof insertRolePermissionGrantSchema>;
export type UpdateRolePermissionGrant = z.infer<typeof updateRolePermissionGrantSchema>;
export type RolePermissionGrant = typeof rolePermissionGrants.$inferSelect;

// ========================================
// ROLE MODULE PERMISSIONS - Rol-Modül-Aksiyon İlişkileri  
// ========================================

export const roleModulePermissions = pgTable("role_module_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, muhasebe, barista, etc.
  module: varchar("module", { length: 50 }).notNull(), // dashboard, tasks, etc.
  actions: text("actions").array().notNull().default(sql`ARRAY[]::text[]`), // ['view', 'create', 'edit', 'delete', 'approve']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_module_permissions_role_idx").on(table.role),
  index("role_module_permissions_module_idx").on(table.module),
  unique("role_module_permissions_role_module_unique").on(table.role, table.module),
]);

export const insertRoleModulePermissionSchema = createInsertSchema(roleModulePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRoleModulePermissionSchema = insertRoleModulePermissionSchema.partial();

export type InsertRoleModulePermission = z.infer<typeof insertRoleModulePermissionSchema>;
export type UpdateRoleModulePermission = z.infer<typeof updateRoleModulePermissionSchema>;
export type RoleModulePermission = typeof roleModulePermissions.$inferSelect;

// ========================================
// MEGA MODULE MAPPINGS - Modül-Mega Modül Eşleştirmeleri
// Dashboard kartlarındaki modüllerin hangi mega-modüle ait olduğu
// ========================================

export const megaModuleMappings = pgTable("mega_module_mappings", {
  id: serial("id").primaryKey(),
  moduleId: varchar("module_id", { length: 100 }).notNull(), // menu-service'deki item.id (equipment, faults, etc.)
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // operations, equipment, hr, training, kitchen, reports, newshop, admin
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("mega_module_mappings_module_idx").on(table.moduleId),
  index("mega_module_mappings_mega_idx").on(table.megaModuleId),
  unique("mega_module_mappings_unique").on(table.moduleId),
]);

export const insertMegaModuleMappingSchema = createInsertSchema(megaModuleMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMegaModuleMappingSchema = insertMegaModuleMappingSchema.partial();

export type InsertMegaModuleMapping = z.infer<typeof insertMegaModuleMappingSchema>;
export type UpdateMegaModuleMapping = z.infer<typeof updateMegaModuleMappingSchema>;
export type MegaModuleMapping = typeof megaModuleMappings.$inferSelect;

// ========================================
// BACKUP RECORDS - Yedekleme Kayıtları
// ========================================

export const backupRecords = pgTable("backup_records", {
  id: serial("id").primaryKey(),
  backupId: varchar("backup_id", { length: 100 }).notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  success: boolean("success").notNull().default(false),
  tablesBackedUp: text("tables_backed_up").array().notNull().default(sql`ARRAY[]::text[]`),
  recordCounts: jsonb("record_counts").notNull().default('{}'),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").notNull().default(0),
  backupType: varchar("backup_type", { length: 20 }).notNull().default('daily'), // daily, manual
}, (table) => [
  index("backup_records_timestamp_idx").on(table.timestamp),
  index("backup_records_success_idx").on(table.success),
]);

export const insertBackupRecordSchema = createInsertSchema(backupRecords).omit({
  id: true,
  timestamp: true,
});

export type InsertBackupRecord = z.infer<typeof insertBackupRecordSchema>;
export type BackupRecord = typeof backupRecords.$inferSelect;

// ========================================
// TRAINING MATERIALS - AI Eğitim Materyalleri
// ========================================

// Training Materials - Knowledge Base makalesinden AI tarafından oluşturulan eğitim içeriği
export const trainingMaterials = pgTable("training_materials", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  materialType: varchar("material_type", { length: 50 }).notNull(), // flashcard_set, quiz, multi_step_guide, mindmap
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: jsonb("content").notNull(), // { flashcards: [], quizzes: [], steps: [], mindmap: {} }
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published, archived
  targetRoles: text("target_roles").array(), // Hedef roller
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_materials_article_idx").on(table.articleId),
  index("training_materials_status_idx").on(table.status),
  index("training_materials_type_idx").on(table.materialType),
]);

export const insertTrainingMaterialSchema = createInsertSchema(trainingMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingMaterial = z.infer<typeof insertTrainingMaterialSchema>;
export type TrainingMaterial = typeof trainingMaterials.$inferSelect;

// Training Assignments - Eğitim atamaları (kullanıcı/rol gruplarına)
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  targetRole: varchar("target_role", { length: 50 }), // Rol grubuna atama
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  assignedById: varchar("assigned_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  isRequired: boolean("is_required").default(true),
  status: varchar("status", { length: 20 }).notNull().default("assigned"), // assigned, in_progress, completed, overdue, expired
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_assignments_material_idx").on(table.materialId),
  index("training_assignments_user_idx").on(table.userId),
  index("training_assignments_status_idx").on(table.status),
  index("training_assignments_due_date_idx").on(table.dueDate),
]);

export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;

// Training Completions - Tamamlama kayıtları (skor, süre, durumlar)
export const trainingCompletions = pgTable("training_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => trainingAssignments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, passed, failed, abandoned
  score: integer("score"), // 0-100
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_completions_user_idx").on(table.userId),
  index("training_completions_material_idx").on(table.materialId),
  index("training_completions_status_idx").on(table.status),
  index("training_completions_completed_idx").on(table.completedAt),
]);

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;

// ========================================
// CAREER PROGRESSION - Kariyer İlerleme Sistemi
// ========================================

// Career Levels - 5 seviye
export const careerLevels = pgTable("career_levels", {
  id: serial("id").primaryKey(),
  roleId: varchar("role_id", { length: 50 }).notNull().unique(), // stajyer, bar_buddy, barista, supervisor_buddy, supervisor
  levelNumber: integer("level_number").notNull(), // 1-5
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // "Stajyer", "Bar Buddy", vb
  descriptionTr: text("description_tr"),
  requiredModuleIds: integer("required_module_ids").array().default(sql`ARRAY[]::integer[]`), // Zorunlu modül ID'leri
  prerequisiteRoles: text("prerequisite_roles").array(), // Önceki roller
  successRateThreshold: integer("success_rate_threshold").default(80), // Sınav geçiş notu (%)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("career_levels_role_idx").on(table.roleId),
  index("career_levels_level_idx").on(table.levelNumber),
]);

export const insertCareerLevelSchema = createInsertSchema(careerLevels).omit({
  id: true,
  createdAt: true,
});

export type InsertCareerLevel = z.infer<typeof insertCareerLevelSchema>;
export type CareerLevel = typeof careerLevels.$inferSelect;

// Exam Requests - Supervisor tarafından başlatılan sınav talepleri
export const examRequests = pgTable("exam_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetRoleId: varchar("target_role_id", { length: 50 }).notNull(), // Hangi role'e terfi (e.g., "barista")
  supervisorId: varchar("supervisor_id").notNull().references(() => users.id),
  supervisorNotes: text("supervisor_notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, exam_in_progress, passed, failed
  approvedById: varchar("approved_by_id").references(() => users.id), // HQ onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  examStartedAt: timestamp("exam_started_at"),
  examCompletedAt: timestamp("exam_completed_at"),
  examScore: integer("exam_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("exam_requests_user_idx").on(table.userId),
  index("exam_requests_status_idx").on(table.status),
  index("exam_requests_target_role_idx").on(table.targetRoleId),
]);

export const insertExamRequestSchema = createInsertSchema(examRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExamRequest = z.infer<typeof insertExamRequestSchema>;
export type ExamRequest = typeof examRequests.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Sprint E — System Critical Logs (19 Nis 2026)
//
// Bağlam: Sprint D'de 6 P0 yerine [CRITICAL][PDKS-SYNC] prefix'li
// console.error eklendi. Ama bu log'lar sadece stdout'a gidiyor;
// admin panelinde görünmüyor. Pilot sırasında PDKS sync fail
// olsa kimse fark etmez.
//
// Bu tablo `critLog()` helper tarafından yazılır:
//   - `console.error` yanında DB'ye de persist edilir
//   - Admin `/admin/critical-logs` sayfasında son 24 saat görünür
//   - 7 günden eski loglar nightly cleanup ile silinir (Sprint F)
//
// Pilot 28 Nis — Aslan sabah 09:00 dashboard'a bakarak pilot
// öncesi gece hiçbir CRITICAL log olmadığını görmeli.
// ═══════════════════════════════════════════════════════════════════

export const systemCriticalLogs = pgTable("system_critical_logs", {
  id: serial("id").primaryKey(),
  // Sprint D pattern: "PDKS-SYNC", "HQ-KIOSK", "FAB-KIOSK" vb.
  tag: varchar("tag", { length: 50 }).notNull(),
  // Kısa insanca mesaj (ilk 200 char)
  message: text("message").notNull(),
  // Structured context: userId, branchId, error stack, vs.
  context: jsonb("context"),
  // Kaynak dosya:satır (opsiyonel)
  sourceLocation: varchar("source_location", { length: 200 }),
  // "new" (görülmemiş), "acknowledged" (Aslan gördü), "resolved" (fix edildi)
  status: varchar("status", { length: 20 }).notNull().default("new"),
  acknowledgedById: varchar("acknowledged_by_id").references(() => users.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Son 24 saat sorgusu için (admin dashboard)
  index("system_critical_logs_created_idx").on(table.createdAt),
  index("system_critical_logs_status_idx").on(table.status),
  index("system_critical_logs_tag_idx").on(table.tag),
]);

export const insertSystemCriticalLogSchema = createInsertSchema(systemCriticalLogs).omit({
  id: true,
  createdAt: true,
  acknowledgedById: true,
  acknowledgedAt: true,
});

export type InsertSystemCriticalLog = z.infer<typeof insertSystemCriticalLogSchema>;
export type SystemCriticalLog = typeof systemCriticalLogs.$inferSelect;
