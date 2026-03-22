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

import { branches, equipment, equipmentFaults, tasks, users } from './schema-02';
import { trainingModules } from './schema-03';
import { auditLogs, careerLevels } from './schema-05';
import { quizzes } from './schema-06';
import { inventory, purchaseOrders, suppliers } from './schema-09';

// ========================================
// EQUIPMENT CATALOG (Merkez Ekipman Kataloğu)
// ========================================

export const equipmentCatalog = pgTable("equipment_catalog", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 200 }),
  model: varchar("model", { length: 200 }),
  imageUrl: text("image_url"),
  usageGuide: text("usage_guide"),
  calibrationProcedure: text("calibration_procedure"),
  calibrationIntervalDays: integer("calibration_interval_days"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(30),
  maintenanceGuide: text("maintenance_guide"),
  troubleshootSteps: jsonb("troubleshoot_steps").$type<Array<{
    order: number;
    title: string;
    description: string;
    requiresPhoto: boolean;
  }>>().default([]),
  tips: text("tips"),
  defaultServiceProviderName: varchar("default_service_provider_name", { length: 255 }),
  defaultServiceProviderPhone: varchar("default_service_provider_phone", { length: 50 }),
  defaultServiceProviderEmail: varchar("default_service_provider_email", { length: 255 }),
  defaultServiceProviderAddress: text("default_service_provider_address"),
  createdById: varchar("created_by_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("equipment_catalog_type_idx").on(table.equipmentType),
]);

export const insertEquipmentCatalogSchema = createInsertSchema(equipmentCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentCatalog = z.infer<typeof insertEquipmentCatalogSchema>;
export type EquipmentCatalog = typeof equipmentCatalog.$inferSelect;

// ========================================
// FAULT SERVICE TRACKING (Arıza Servis Takip)
// ========================================

export const FAULT_SERVICE_STATUS = {
  SERVIS_BEKLENIYOR: 'servis_bekleniyor',
  SERVISE_GONDERILECEK: 'servise_gonderilecek',
  SERVISE_GONDERILDI: 'servise_gonderildi',
  YEDEK_PARCA_BEKLENIYOR: 'yedek_parca_bekleniyor',
  SERVIS_TAMAMLANDI: 'servis_tamamlandi',
  TESLIM_ALINDI: 'teslim_alindi',
  KAPANDI: 'kapandi',
} as const;

export type FaultServiceStatusType = typeof FAULT_SERVICE_STATUS[keyof typeof FAULT_SERVICE_STATUS];

export const faultServiceTracking = pgTable("fault_service_tracking", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  equipmentId: integer("equipment_id").references(() => equipment.id, { onDelete: "set null" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  currentStatus: varchar("current_status", { length: 50 }).notNull().default(FAULT_SERVICE_STATUS.SERVIS_BEKLENIYOR),
  serviceContactedAt: timestamp("service_contacted_at"),
  serviceProviderName: varchar("service_provider_name", { length: 255 }),
  serviceProviderPhone: varchar("service_provider_phone", { length: 50 }),
  serviceProviderEmail: varchar("service_provider_email", { length: 255 }),
  serviceHandledBy: varchar("service_handled_by", { length: 20 }).default("branch"),
  estimatedCompletionDate: date("estimated_completion_date"),
  deliveryForm: jsonb("delivery_form").$type<{
    deviceConditionOnReturn: string;
    additionalDamages: string;
    reportedFaultResolved: boolean;
    deviceTested: boolean;
    testedByName: string;
    testedDate: string;
    serviceCost: number;
    isWarrantyCovered: boolean;
    warrantyNotes: string;
    receivedByName: string;
    receivedDate: string;
    photos: string[];
    notes: string;
  }>(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fault_service_tracking_fault_idx").on(table.faultId),
  index("fault_service_tracking_equipment_idx").on(table.equipmentId),
  index("fault_service_tracking_branch_idx").on(table.branchId),
  index("fault_service_tracking_status_idx").on(table.currentStatus),
]);

export const insertFaultServiceTrackingSchema = createInsertSchema(faultServiceTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFaultServiceTracking = z.infer<typeof insertFaultServiceTrackingSchema>;
export type FaultServiceTracking = typeof faultServiceTracking.$inferSelect;

// Fault Service Status Updates (yorum geçmişi)
export const faultServiceStatusUpdates = pgTable("fault_service_status_updates", {
  id: serial("id").primaryKey(),
  trackingId: integer("tracking_id").notNull().references(() => faultServiceTracking.id, { onDelete: "cascade" }),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  comment: text("comment"),
  attachmentUrl: text("attachment_url"),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fault_service_status_updates_tracking_idx").on(table.trackingId),
]);

export const insertFaultServiceStatusUpdateSchema = createInsertSchema(faultServiceStatusUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertFaultServiceStatusUpdate = z.infer<typeof insertFaultServiceStatusUpdateSchema>;
export type FaultServiceStatusUpdate = typeof faultServiceStatusUpdates.$inferSelect;

export const DEFAULT_FRANCHISE_PHASES = [
  { phaseNumber: 1, name: "Sozlesme ve Planlama", description: "Franchise sozlesmesi imzalanmasi, is plani hazirligi, fizibilite calismasi" },
  { phaseNumber: 2, name: "Mekan Secimi ve Kiralama", description: "Uygun lokasyon arastirmasi, kira sozlesmesi, imar durumu kontrolu" },
  { phaseNumber: 3, name: "Mimari Proje ve Tasarim", description: "Ic mekan tasarimi, dekorasyon projesi, DOSPRESSO marka standartlari uyumu" },
  { phaseNumber: 4, name: "Tadilat ve Insaat", description: "Mekan renovasyonu, altyapi islemleri, elektrik-tesisat, mobilya uretim" },
  { phaseNumber: 5, name: "Ekipman Kurulum", description: "Kahve makineleri, sogutma uniteleri, kasa sistemi, POS entegrasyonu" },
  { phaseNumber: 6, name: "Personel Alim ve Egitim", description: "Kadro olusturma, DOSPRESSO Akademi egitimi, staj donemi" },
  { phaseNumber: 7, name: "Acilis Oncesi ve Acilis", description: "Son kontroller, test servisleri, resmi acilis, marketing kampanyasi" },
];

// ========================================
// INVENTORY COUNTING SCHEMA
// ========================================

export const inventoryCountStatusEnum = ["planned", "in_progress", "counting", "review", "completed", "overdue"] as const;
export type InventoryCountStatus = typeof inventoryCountStatusEnum[number];

export const inventoryCounts = pgTable("inventory_counts", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  countType: varchar("count_type", { length: 30 }).notNull().default("tam_sayim"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("planned"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inv_count_month_year_idx").on(table.month, table.year),
  index("inv_count_status_idx").on(table.status),
]);

export const insertInventoryCountSchema = createInsertSchema(inventoryCounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInventoryCount = z.infer<typeof insertInventoryCountSchema>;
export type InventoryCount = typeof inventoryCounts.$inferSelect;

export const inventoryCountAssignments = pgTable("inventory_count_assignments", {
  id: serial("id").primaryKey(),
  countId: integer("count_id").references(() => inventoryCounts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  counter1Id: varchar("counter_1_id").references(() => users.id, { onDelete: "set null" }),
  counter2Id: varchar("counter_2_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_count_assign_count_idx").on(table.countId),
  index("inv_count_assign_inv_idx").on(table.inventoryId),
]);

export const insertInventoryCountAssignmentSchema = createInsertSchema(inventoryCountAssignments).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryCountAssignment = z.infer<typeof insertInventoryCountAssignmentSchema>;
export type InventoryCountAssignment = typeof inventoryCountAssignments.$inferSelect;

export const inventoryCountEntries = pgTable("inventory_count_entries", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => inventoryCountAssignments.id, { onDelete: "cascade" }).notNull(),
  counterId: varchar("counter_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  countedQuantity: numeric("counted_quantity", { precision: 12, scale: 3 }).notNull(),
  systemQuantity: numeric("system_quantity", { precision: 12, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 12, scale: 3 }).notNull(),
  isRecount: boolean("is_recount").default(false),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  countedAt: timestamp("counted_at").defaultNow(),
}, (table) => [
  index("inv_count_entry_assign_idx").on(table.assignmentId),
  index("inv_count_entry_counter_idx").on(table.counterId),
]);

export const insertInventoryCountEntrySchema = createInsertSchema(inventoryCountEntries).omit({
  id: true,
  countedAt: true,
});
export type InsertInventoryCountEntry = z.infer<typeof insertInventoryCountEntrySchema>;
export type InventoryCountEntry = typeof inventoryCountEntries.$inferSelect;

// ========================================
// FACTORY MANAGEMENT SCORES SCHEMA
// ========================================

export const factoryManagementScores = pgTable("factory_management_scores", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  inventoryCountScore: integer("inventory_count_score").default(100),
  wasteScore: integer("waste_score").default(100),
  productionErrorScore: integer("production_error_score").default(100),
  wrongProductionScore: integer("wrong_production_score").default(100),
  branchComplaintScore: integer("branch_complaint_score").default(100),
  overallScore: integer("overall_score").default(100),
  wasteCount: integer("waste_count").default(0),
  productionErrorCount: integer("production_error_count").default(0),
  wrongProductionCount: integer("wrong_production_count").default(0),
  branchComplaintCount: integer("branch_complaint_count").default(0),
  inventoryCountCompleted: boolean("inventory_count_completed").default(false),
  inventoryCountOnTime: boolean("inventory_count_on_time").default(false),
  notes: text("notes"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_mgmt_score_month_idx").on(table.month, table.year),
]);

export const insertFactoryManagementScoreSchema = createInsertSchema(factoryManagementScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryManagementScore = z.infer<typeof insertFactoryManagementScoreSchema>;
export type FactoryManagementScore = typeof factoryManagementScores.$inferSelect;

// ========================================
// TEDARİKÇİ PERFORMANS PUANLAMA
// ========================================

export const supplierPerformanceScores = pgTable("supplier_performance_scores", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  deliveryScore: numeric("delivery_score", { precision: 5, scale: 2 }).default("0"),
  pricePerformanceScore: numeric("price_performance_score", { precision: 5, scale: 2 }).default("0"),
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }).default("0"),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  onTimeDeliveries: integer("on_time_deliveries").default(0),
  lateDeliveries: integer("late_deliveries").default(0),
  avgDeliveryDays: numeric("avg_delivery_days", { precision: 5, scale: 1 }).default("0"),
  returnCount: integer("return_count").default(0),
  complaintCount: integer("complaint_count").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sup_perf_supplier_idx").on(table.supplierId),
  index("sup_perf_month_year_idx").on(table.month, table.year),
]);

export const insertSupplierPerformanceScoreSchema = createInsertSchema(supplierPerformanceScores).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierPerformanceScore = z.infer<typeof insertSupplierPerformanceScoreSchema>;
export type SupplierPerformanceScore = typeof supplierPerformanceScores.$inferSelect;

// ========================================
// SAYIM TUTARSIZLIK RAPORLARI
// ========================================

export const inventoryCountReports = pgTable("inventory_count_reports", {
  id: serial("id").primaryKey(),
  countId: integer("count_id").references(() => inventoryCounts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  systemQuantity: numeric("system_quantity", { precision: 12, scale: 3 }).notNull(),
  countedQuantity: numeric("counted_quantity", { precision: 12, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 12, scale: 3 }).notNull(),
  differencePercent: numeric("difference_percent", { precision: 5, scale: 2 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("low"),
  notifiedRoles: text("notified_roles").array(),
  actionTaken: text("action_taken"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_report_count_idx").on(table.countId),
  index("inv_report_severity_idx").on(table.severity),
]);

export const insertInventoryCountReportSchema = createInsertSchema(inventoryCountReports).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryCountReport = z.infer<typeof insertInventoryCountReportSchema>;
export type InventoryCountReport = typeof inventoryCountReports.$inferSelect;

// ========================================
// DASHBOARD WIDGET ITEMS
// ========================================

export const dashboardWidgetItems = pgTable("dashboard_widget_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  type: varchar("type", { length: 50 }).notNull().default("link"),
  icon: varchar("icon", { length: 100 }),
  url: varchar("url", { length: 500 }),
  targetRoles: text("target_roles").array().notNull().default(sql`'{}'::text[]`),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDashboardWidgetItemSchema = createInsertSchema(dashboardWidgetItems).omit({ id: true, createdAt: true });
export type InsertDashboardWidgetItem = z.infer<typeof insertDashboardWidgetItemSchema>;
export type DashboardWidgetItem = typeof dashboardWidgetItems.$inferSelect;

// ========================================
// FINANCIAL RECORDS - Gelir/Gider Kayıtları
// ========================================

export const financialRecords = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  recordDate: timestamp("record_date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'gelir' or 'gider'
  category: varchar("category", { length: 100 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  invoiceNo: varchar("invoice_no", { length: 100 }),
  status: varchar("status", { length: 20 }).default("onaylandi"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fin_record_branch_idx").on(table.branchId),
  index("fin_record_date_idx").on(table.recordDate),
  index("fin_record_type_idx").on(table.type),
  index("fin_record_month_year_idx").on(table.month, table.year),
]);

export const insertFinancialRecordSchema = createInsertSchema(financialRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialRecord = z.infer<typeof insertFinancialRecordSchema>;
export type FinancialRecord = typeof financialRecords.$inferSelect;

// ========================================
// SALARY SCALES - Maaş & Prim Tablosu
// ========================================

export const salaryScales = pgTable("salary_scales", {
  id: serial("id").primaryKey(),
  locationType: varchar("location_type", { length: 20 }).notNull(), // 'sube' or 'fabrika'
  positionName: varchar("position_name", { length: 100 }).notNull(),
  level: integer("level").notNull(), // ordering/display level
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }).notNull(), // temel maaş
  cashRegisterBonus: numeric("cash_register_bonus", { precision: 12, scale: 2 }).default("0"), // kasa primi (only branches)
  performanceBonus: numeric("performance_bonus", { precision: 12, scale: 2 }).notNull(), // performans primi
  bonusCalculationType: varchar("bonus_calculation_type", { length: 20 }).notNull().default("per_day"), // 'per_day' or 'full'
  totalSalary: numeric("total_salary", { precision: 12, scale: 2 }).notNull(), // toplam
  isActive: boolean("is_active").default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("salary_scale_type_idx").on(table.locationType),
  index("salary_scale_level_idx").on(table.level),
]);

export const insertSalaryScaleSchema = createInsertSchema(salaryScales).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalaryScale = z.infer<typeof insertSalaryScaleSchema>;
export type SalaryScale = typeof salaryScales.$inferSelect;

// ========================================
// SUPPLIER QUOTES - Tedarikçi Fiyat Teklifleri
// ========================================

export const supplierQuotes = pgTable("supplier_quotes", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  minimumOrderQuantity: numeric("minimum_order_quantity", { precision: 12, scale: 3 }).default("1"),
  leadTimeDays: integer("lead_time_days").default(3),
  validUntil: timestamp("valid_until"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  shippingResponsibility: varchar("shipping_responsibility", { length: 50 }).default("tedarikci"),
  paymentTermDays: integer("payment_term_days").default(30),
  hasInstallments: boolean("has_installments").default(false),
  qualityScore: numeric("quality_score", { precision: 3, scale: 1 }),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("aktif").notNull(),
  requestedById: varchar("requested_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sq_inventory_idx").on(table.inventoryId),
  index("sq_supplier_idx").on(table.supplierId),
  index("sq_status_idx").on(table.status),
]);

export const insertSupplierQuoteSchema = createInsertSchema(supplierQuotes).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierQuote = z.infer<typeof insertSupplierQuoteSchema>;
export type SupplierQuote = typeof supplierQuotes.$inferSelect;

// ========================================
// SUPPLIER ISSUES - Tedarikçi Sorunları
// ========================================

export const supplierIssues = pgTable("supplier_issues", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "set null" }),
  issueType: varchar("issue_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("orta").notNull(),
  description: text("description").notNull(),
  resolution: text("resolution"),
  status: varchar("status", { length: 30 }).default("acik").notNull(),
  reportedById: varchar("reported_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("si_supplier_idx").on(table.supplierId),
  index("si_inventory_idx").on(table.inventoryId),
  index("si_status_idx").on(table.status),
]);

export const insertSupplierIssueSchema = createInsertSchema(supplierIssues).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierIssue = z.infer<typeof insertSupplierIssueSchema>;
export type SupplierIssue = typeof supplierIssues.$inferSelect;

// ========================================
// PURCHASE ORDER PAYMENTS - Sipariş Ödemeleri
// ========================================

export const purchaseOrderPayments = pgTable("purchase_order_payments", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceDate: timestamp("invoice_date"),
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("havale"),
  status: varchar("status", { length: 30 }).default("beklemede").notNull(),
  notes: text("notes"),
  processedById: varchar("processed_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pop_order_idx").on(table.purchaseOrderId),
  index("pop_status_idx").on(table.status),
]);

export const insertPurchaseOrderPaymentSchema = createInsertSchema(purchaseOrderPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseOrderPayment = z.infer<typeof insertPurchaseOrderPaymentSchema>;
export type PurchaseOrderPayment = typeof purchaseOrderPayments.$inferSelect;

// ==========================================
// FOOD SAFETY (GIDA GÜVENLİĞİ) TABLES
// ==========================================

export const haccpControlPoints = pgTable("haccp_control_points", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  controlPointName: varchar("control_point_name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  hazardType: varchar("hazard_type", { length: 50 }).notNull(),
  criticalLimit: varchar("critical_limit", { length: 200 }).notNull(),
  monitoringMethod: varchar("monitoring_method", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  correctiveAction: text("corrective_action").notNull(),
  responsibleRole: varchar("responsible_role", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("haccp_cp_branch_idx").on(table.branchId),
  index("haccp_cp_category_idx").on(table.category),
]);

export const insertHaccpControlPointSchema = createInsertSchema(haccpControlPoints).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHaccpControlPoint = z.infer<typeof insertHaccpControlPointSchema>;
export type HaccpControlPoint = typeof haccpControlPoints.$inferSelect;

export const haccpRecords = pgTable("haccp_records", {
  id: serial("id").primaryKey(),
  controlPointId: integer("control_point_id").references(() => haccpControlPoints.id, { onDelete: "cascade" }).notNull(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  recordedById: varchar("recorded_by_id").references(() => users.id).notNull(),
  measuredValue: varchar("measured_value", { length: 100 }).notNull(),
  isWithinLimits: boolean("is_within_limits").notNull(),
  deviationNote: text("deviation_note"),
  correctiveActionTaken: text("corrective_action_taken"),
  photoUrl: text("photo_url"),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("haccp_rec_cp_idx").on(table.controlPointId),
  index("haccp_rec_branch_idx").on(table.branchId),
  index("haccp_rec_date_idx").on(table.recordedAt),
]);

export const insertHaccpRecordSchema = createInsertSchema(haccpRecords).omit({ id: true, recordedAt: true });
export type InsertHaccpRecord = z.infer<typeof insertHaccpRecordSchema>;
export type HaccpRecord = typeof haccpRecords.$inferSelect;

export const hygieneAudits = pgTable("hygiene_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  auditorId: varchar("auditor_id").references(() => users.id).notNull(),
  auditDate: timestamp("audit_date").notNull(),
  overallScore: integer("overall_score").notNull().default(0),
  handHygieneScore: integer("hand_hygiene_score").default(0),
  surfaceCleanlinessScore: integer("surface_cleanliness_score").default(0),
  equipmentHygieneScore: integer("equipment_hygiene_score").default(0),
  personalHygieneScore: integer("personal_hygiene_score").default(0),
  wasteManagementScore: integer("waste_management_score").default(0),
  pestControlScore: integer("pest_control_score").default(0),
  storageConditionsScore: integer("storage_conditions_score").default(0),
  findings: text("findings"),
  recommendations: text("recommendations"),
  photoUrls: text("photo_urls").array(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hygiene_audit_branch_idx").on(table.branchId),
  index("hygiene_audit_date_idx").on(table.auditDate),
]);

export const insertHygieneAuditSchema = createInsertSchema(hygieneAudits, {
  auditDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({ id: true, createdAt: true, auditorId: true });
export type InsertHygieneAudit = z.infer<typeof insertHygieneAuditSchema>;
export type HygieneAudit = typeof hygieneAudits.$inferSelect;

export const supplierCertifications = pgTable("supplier_certifications", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  certificationType: varchar("certification_type", { length: 100 }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  issuedBy: varchar("issued_by", { length: 200 }),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date").notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  documentUrl: text("document_url"),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("supp_cert_supplier_idx").on(table.supplierId),
  index("supp_cert_expiry_idx").on(table.expiryDate),
  index("supp_cert_status_idx").on(table.status),
]);

export const insertSupplierCertificationSchema = createInsertSchema(supplierCertifications, {
  issuedDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  expiryDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({ id: true, createdAt: true });
export type InsertSupplierCertification = z.infer<typeof insertSupplierCertificationSchema>;
export type SupplierCertification = typeof supplierCertifications.$inferSelect;

export const foodSafetyTrainings = pgTable("food_safety_trainings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  trainerId: varchar("trainer_id").references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  targetRole: varchar("target_role", { length: 50 }),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  duration: integer("duration"),
  attendeeCount: integer("attendee_count").default(0),
  maxAttendees: integer("max_attendees"),
  status: varchar("status", { length: 30 }).default("scheduled").notNull(),
  materials: text("materials"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fst_branch_idx").on(table.branchId),
  index("fst_status_idx").on(table.status),
  index("fst_date_idx").on(table.scheduledDate),
]);

export const insertFoodSafetyTrainingSchema = createInsertSchema(foodSafetyTrainings, {
  scheduledDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  completedDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
}).omit({ id: true, createdAt: true });
export type InsertFoodSafetyTraining = z.infer<typeof insertFoodSafetyTrainingSchema>;
export type FoodSafetyTraining = typeof foodSafetyTrainings.$inferSelect;

export const foodSafetyDocuments = pgTable("food_safety_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  fileUrl: text("file_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fsd_category_idx").on(table.category),
  index("fsd_type_idx").on(table.documentType),
]);

export const insertFoodSafetyDocumentSchema = createInsertSchema(foodSafetyDocuments, {
  effectiveDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  reviewDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFoodSafetyDocument = z.infer<typeof insertFoodSafetyDocumentSchema>;
export type FoodSafetyDocument = typeof foodSafetyDocuments.$inferSelect;

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  mode: varchar("mode", { length: 30 }).notNull().default("append"),
  matchKey: varchar("match_key", { length: 30 }).default("username"),
  scope: varchar("scope", { length: 30 }),
  fileName: varchar("file_name", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalRows: integer("total_rows").default(0),
  createdCount: integer("created_count").default(0),
  updatedCount: integer("updated_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  errorCount: integer("error_count").default(0),
  deactivatedCount: integer("deactivated_count").default(0),
  summaryJson: text("summary_json"),
  rolledBackAt: timestamp("rolled_back_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("import_batch_user_idx").on(table.createdByUserId),
  index("import_batch_status_idx").on(table.status),
]);

export type ImportBatch = typeof importBatches.$inferSelect;

export const importResults = pgTable("import_results", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  employeeId: varchar("employee_id"),
  message: text("message"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
}, (table) => [
  index("import_result_batch_idx").on(table.batchId),
  index("import_result_employee_idx").on(table.employeeId),
]);

export type ImportResult = typeof importResults.$inferSelect;

export const taskTriggers = pgTable("task_triggers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  roleCode: varchar("role_code", { length: 50 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  branchType: varchar("branch_type", { length: 50 }),
  appliesToAllBranches: boolean("applies_to_all_branches").default(true),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  dueOffsetMinutes: integer("due_offset_minutes").default(480),
  requiredEvidenceType: varchar("required_evidence_type", { length: 20 }).notNull().default("none"),
  template: text("template").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("task_triggers_role_idx").on(table.roleCode),
  index("task_triggers_scope_idx").on(table.scope),
  index("task_triggers_active_idx").on(table.isActive),
]);

export const insertTaskTriggerSchema = createInsertSchema(taskTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskTrigger = z.infer<typeof insertTaskTriggerSchema>;
export type TaskTrigger = typeof taskTriggers.$inferSelect;

export const opsRules = pgTable("ops_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  severity: varchar("severity", { length: 10 }).notNull(),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  conditionJson: text("condition_json").notNull(),
  messageJson: text("message_json").notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ops_rules_scope_idx").on(table.scope),
  index("ops_rules_active_idx").on(table.isActive),
  index("ops_rules_entity_idx").on(table.entityType),
]);

export const insertOpsRuleSchema = createInsertSchema(opsRules).omit({
  id: true,
  createdAt: true,
});

export type InsertOpsRule = z.infer<typeof insertOpsRuleSchema>;
export type OpsRule = typeof opsRules.$inferSelect;

export const taskEvidence = pgTable("task_evidence", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  submittedByUserId: varchar("submitted_by_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  payloadJson: text("payload_json"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  reviewedByUserId: varchar("reviewed_by_user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_evidence_task_idx").on(table.taskId),
  index("task_evidence_status_idx").on(table.status),
  index("task_evidence_submitted_by_idx").on(table.submittedByUserId),
]);

export const insertTaskEvidenceSchema = createInsertSchema(taskEvidence).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskEvidence = z.infer<typeof insertTaskEvidenceSchema>;
export type TaskEvidence = typeof taskEvidence.$inferSelect;

// ========================================
// WASTE / ZAI-FIRE MANAGEMENT
// ========================================

export const wasteCategories = pgTable("waste_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameTr: varchar("name_tr", { length: 150 }).notNull(),
  nameEn: varchar("name_en", { length: 150 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWasteCategorySchema = createInsertSchema(wasteCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteCategory = z.infer<typeof insertWasteCategorySchema>;
export type WasteCategory = typeof wasteCategories.$inferSelect;

export const wasteReasons = pgTable("waste_reasons", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => wasteCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 80 }).notNull(),
  nameTr: varchar("name_tr", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("waste_reasons_category_idx").on(table.categoryId),
]);

export const insertWasteReasonSchema = createInsertSchema(wasteReasons).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteReason = z.infer<typeof insertWasteReasonSchema>;
export type WasteReason = typeof wasteReasons.$inferSelect;

export const WasteResponsibilityScope = {
  DEMAND: "demand",
  MERCHANDISING: "merchandising",
  MARKETING: "marketing",
  RECIPE_QUALITY: "recipe_quality",
  PRODUCTION_DEFECT: "production_defect",
  PREP_ERROR: "prep_error",
  LOGISTICS_COLD_CHAIN: "logistics_cold_chain",
  STORAGE: "storage",
  EXPIRY: "expiry",
  UNKNOWN: "unknown",
} as const;

export type WasteResponsibilityScopeType = typeof WasteResponsibilityScope[keyof typeof WasteResponsibilityScope];

export const WasteEventStatus = {
  OPEN: "open",
  CONFIRMED: "confirmed",
  RESOLVED: "resolved",
} as const;

export type WasteEventStatusType = typeof WasteEventStatus[keyof typeof WasteEventStatus];

export const wasteEvents = pgTable("waste_events", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  eventTs: timestamp("event_ts").notNull().defaultNow(),
  productId: integer("product_id"),
  productGroup: varchar("product_group", { length: 100 }),
  recipeRef: varchar("recipe_ref", { length: 100 }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("adet"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  categoryId: integer("category_id").notNull().references(() => wasteCategories.id),
  reasonId: integer("reason_id").notNull().references(() => wasteReasons.id),
  responsibilityScope: varchar("responsibility_scope", { length: 30 }).default("unknown"),
  notes: text("notes"),
  evidencePhotos: jsonb("evidence_photos").default([]),
  lotId: varchar("lot_id", { length: 100 }),
  supplierBatch: varchar("supplier_batch", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("waste_events_branch_idx").on(table.branchId),
  index("waste_events_category_idx").on(table.categoryId),
  index("waste_events_reason_idx").on(table.reasonId),
  index("waste_events_status_idx").on(table.status),
  index("waste_events_event_ts_idx").on(table.eventTs),
  index("waste_events_lot_idx").on(table.lotId),
  index("waste_events_created_by_idx").on(table.createdByUserId),
]);

export const insertWasteEventSchema = createInsertSchema(wasteEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWasteEvent = z.infer<typeof insertWasteEventSchema>;
export type WasteEvent = typeof wasteEvents.$inferSelect;

export const WasteLotQcStatus = {
  PENDING: "pending",
  PASSED: "passed",
  FAILED: "failed",
  UNDER_REVIEW: "under_review",
} as const;

export type WasteLotQcStatusType = typeof WasteLotQcStatus[keyof typeof WasteLotQcStatus];

export const wasteLots = pgTable("waste_lots", {
  id: serial("id").primaryKey(),
  lotId: varchar("lot_id", { length: 100 }).notNull(),
  productId: integer("product_id"),
  productName: varchar("product_name", { length: 200 }),
  productionDate: timestamp("production_date"),
  expiryDate: timestamp("expiry_date"),
  qcStatus: varchar("qc_status", { length: 20 }).notNull().default("pending"),
  qcNotes: text("qc_notes"),
  evidencePhotos: jsonb("evidence_photos").default([]),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("waste_lots_lot_id_idx").on(table.lotId),
  index("waste_lots_qc_status_idx").on(table.qcStatus),
  index("waste_lots_product_idx").on(table.productId),
]);

export const insertWasteLotSchema = createInsertSchema(wasteLots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWasteLot = z.infer<typeof insertWasteLotSchema>;
export type WasteLot = typeof wasteLots.$inferSelect;

export const wasteActionLinks = pgTable("waste_action_links", {
  id: serial("id").primaryKey(),
  wasteEventId: integer("waste_event_id").notNull().references(() => wasteEvents.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  auditLogId: integer("audit_log_id").references(() => auditLogs.id, { onDelete: "set null" }),
  linkType: varchar("link_type", { length: 30 }).notNull().default("task"),
  notes: text("notes"),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("waste_action_links_event_idx").on(table.wasteEventId),
  index("waste_action_links_task_idx").on(table.taskId),
])

export const insertWasteActionLinkSchema = createInsertSchema(wasteActionLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteActionLink = z.infer<typeof insertWasteActionLinkSchema>;
export type WasteActionLink = typeof wasteActionLinks.$inferSelect;

// =============================================
// GUIDE DOCS (Kılavuz Dokümanları)
// =============================================
export const guideDocs = pgTable("guide_docs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  targetRoles: text("target_roles").array().default([]),
  scope: varchar("scope", { length: 50 }).default("all"),
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("guide_docs_slug_idx").on(table.slug),
  index("guide_docs_category_idx").on(table.category),
]);

export const insertGuideDocSchema = createInsertSchema(guideDocs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuideDoc = z.infer<typeof insertGuideDocSchema>;
export type GuideDoc = typeof guideDocs.$inferSelect;

// =============================================
// ONBOARDING V2: Programs + Weeks + Instances + Checkins
// =============================================
export const onboardingPrograms = pgTable("onboarding_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetRole: varchar("target_role", { length: 50 }).notNull(),
  durationWeeks: integer("duration_weeks").notNull().default(4),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOnboardingProgramSchema = createInsertSchema(onboardingPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingProgram = z.infer<typeof insertOnboardingProgramSchema>;
export type OnboardingProgram = typeof onboardingPrograms.$inferSelect;

export const onboardingWeeks = pgTable("onboarding_weeks", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  goals: text("goals").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_weeks_program_idx").on(table.programId),
]);

export const insertOnboardingWeekSchema = createInsertSchema(onboardingWeeks).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingWeek = z.infer<typeof insertOnboardingWeekSchema>;
export type OnboardingWeek = typeof onboardingWeeks.$inferSelect;

export const onboardingInstances = pgTable("onboarding_instances", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  traineeId: integer("trainee_id").notNull(),
  mentorId: integer("mentor_id"),
  branchId: integer("branch_id"),
  status: varchar("status", { length: 30 }).default("active"),
  startDate: timestamp("start_date").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_instances_trainee_idx").on(table.traineeId),
  index("onboarding_instances_mentor_idx").on(table.mentorId),
  index("onboarding_instances_program_idx").on(table.programId),
]);

export const insertOnboardingInstanceSchema = createInsertSchema(onboardingInstances).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export type InsertOnboardingInstance = z.infer<typeof insertOnboardingInstanceSchema>;
export type OnboardingInstance = typeof onboardingInstances.$inferSelect;

export const onboardingCheckins = pgTable("onboarding_checkins", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  mentorId: integer("mentor_id").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  strengths: text("strengths"),
  areasToImprove: text("areas_to_improve"),
  checkinDate: timestamp("checkin_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_checkins_instance_idx").on(table.instanceId),
  index("onboarding_checkins_week_idx").on(table.weekNumber),
]);

export const insertOnboardingCheckinSchema = createInsertSchema(onboardingCheckins).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingCheckin = z.infer<typeof insertOnboardingCheckinSchema>;
export type OnboardingCheckin = typeof onboardingCheckins.$inferSelect;

// ========================================
// ACADEMY V2 - GATE SYSTEM & CONTENT PACKS
// ========================================

export const careerGates = pgTable("career_gates", {
  id: serial("id").primaryKey(),
  gateNumber: integer("gate_number").notNull(),
  fromLevelId: integer("from_level_id").references(() => careerLevels.id),
  toLevelId: integer("to_level_id").references(() => careerLevels.id),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  quizId: integer("quiz_id").references(() => quizzes.id),
  quizPassingScore: integer("quiz_passing_score").default(80),
  practicalChecklist: jsonb("practical_checklist").$type<Array<{item: string; weight: number}>>().default([]),
  practicalApprover: varchar("practical_approver", { length: 50 }).default("supervisor"),
  kpiRules: jsonb("kpi_rules").$type<Array<{metric: string; max: number; period_days: number}>>().default([]),
  minAttendanceRate: integer("min_attendance_rate").default(90),
  attendancePeriodDays: integer("attendance_period_days").default(30),
  minDaysInLevel: integer("min_days_in_level").default(30),
  retryCooldownDays: integer("retry_cooldown_days").default(7),
  maxRetries: integer("max_retries").default(3),
  requiresSupervisor: boolean("requires_supervisor").default(true),
  requiresCoach: boolean("requires_coach").default(true),
  requiresCgo: boolean("requires_cgo").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("career_gates_gate_number_idx").on(table.gateNumber),
  index("career_gates_active_idx").on(table.isActive),
]);

export const insertCareerGateSchema = createInsertSchema(careerGates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCareerGate = z.infer<typeof insertCareerGateSchema>;
export type CareerGate = typeof careerGates.$inferSelect;

export const gateAttempts = pgTable("gate_attempts", {
  id: serial("id").primaryKey(),
  gateId: integer("gate_id").notNull().references(() => careerGates.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed"),
  practicalScore: integer("practical_score"),
  practicalPassed: boolean("practical_passed"),
  practicalApprovedBy: varchar("practical_approved_by").references(() => users.id),
  kpiScore: integer("kpi_score"),
  kpiPassed: boolean("kpi_passed"),
  kpiDetails: jsonb("kpi_details").$type<Record<string, number>>(),
  attendanceRate: integer("attendance_rate"),
  attendancePassed: boolean("attendance_passed"),
  overallPassed: boolean("overall_passed").notNull().default(false),
  overallScore: integer("overall_score"),
  status: varchar("status", { length: 20 }).default("in_progress"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  nextRetryAt: timestamp("next_retry_at"),
  supervisorApproved: boolean("supervisor_approved").default(false),
  coachApproved: boolean("coach_approved").default(false),
  cgoApproved: boolean("cgo_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("gate_attempts_gate_idx").on(table.gateId),
  index("gate_attempts_user_idx").on(table.userId),
  index("gate_attempts_status_idx").on(table.status),
]);

export const insertGateAttemptSchema = createInsertSchema(gateAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertGateAttempt = z.infer<typeof insertGateAttemptSchema>;
export type GateAttempt = typeof gateAttempts.$inferSelect;

export const kpiSignalRules = pgTable("kpi_signal_rules", {
  id: serial("id").primaryKey(),
  signalKey: varchar("signal_key", { length: 50 }).notNull().unique(),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  metricSource: varchar("metric_source", { length: 50 }).notNull(),
  metricTable: varchar("metric_table", { length: 100 }),
  thresholdType: varchar("threshold_type", { length: 20 }).default("above"),
  thresholdValue: real("threshold_value").notNull(),
  evaluationPeriodDays: integer("evaluation_period_days").default(30),
  recommendedModuleId: integer("recommended_module_id").references(() => trainingModules.id),
  recommendedAction: varchar("recommended_action", { length: 100 }),
  targetRoles: text("target_roles").array().default(sql`ARRAY['barista', 'bar_buddy', 'stajyer']::text[]`),
  notifyRoles: text("notify_roles").array().default(sql`ARRAY['coach']::text[]`),
  severity: varchar("severity", { length: 20 }).default("warning"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kpi_signal_rules_key_idx").on(table.signalKey),
  index("kpi_signal_rules_active_idx").on(table.isActive),
]);

export const insertKpiSignalRuleSchema = createInsertSchema(kpiSignalRules).omit({
  id: true,
  createdAt: true,
});

export type InsertKpiSignalRule = z.infer<typeof insertKpiSignalRuleSchema>;
export type KpiSignalRule = typeof kpiSignalRules.$inferSelect;

export const contentPacks = pgTable("content_packs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  targetRole: varchar("target_role", { length: 50 }).notNull(),
  packType: varchar("pack_type", { length: 30 }).default("onboarding"),
  durationDays: integer("duration_days"),
  isMandatory: boolean("is_mandatory").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_packs_role_idx").on(table.targetRole),
  index("content_packs_type_idx").on(table.packType),
  index("content_packs_active_idx").on(table.isActive),
]);

export const insertContentPackSchema = createInsertSchema(contentPacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentPack = z.infer<typeof insertContentPackSchema>;
export type ContentPack = typeof contentPacks.$inferSelect;

export const contentPackItems = pgTable("content_pack_items", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => contentPacks.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number"),
  sortOrder: integer("sort_order").notNull().default(1),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  trainingModuleId: integer("training_module_id").references(() => trainingModules.id),
  quizId: integer("quiz_id").references(() => quizzes.id),
  recipeId: integer("recipe_id"),
  titleOverride: varchar("title_override", { length: 200 }),
  isRequired: boolean("is_required").default(true),
  estimatedMinutes: integer("estimated_minutes").default(15),
  passingScore: integer("passing_score").default(70),
  requiresApproval: boolean("requires_approval").default(false),
  approverRole: varchar("approver_role", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_pack_items_pack_idx").on(table.packId),
  index("content_pack_items_day_idx").on(table.dayNumber),
  index("content_pack_items_order_idx").on(table.sortOrder),
]);

export const insertContentPackItemSchema = createInsertSchema(contentPackItems).omit({
  id: true,
  createdAt: true,
});

export type InsertContentPackItem = z.infer<typeof insertContentPackItemSchema>;
export type ContentPackItem = typeof contentPackItems.$inferSelect;
