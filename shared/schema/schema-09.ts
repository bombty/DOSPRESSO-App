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

import { Checklist, Equipment, branches, equipment, users } from './schema-02';
import { branchShiftSessions } from './schema-08';

// Şube Mola Kayıtları (her mola ayrı kaydedilir)
export const branchBreakLogs = pgTable("branch_break_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => branchShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  breakStartTime: timestamp("break_start_time").notNull(),
  breakEndTime: timestamp("break_end_time"),
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  
  breakType: varchar("break_type", { length: 30 }).default("regular"), // regular, lunch, prayer
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_break_logs_session_idx").on(table.sessionId),
  index("branch_break_logs_user_idx").on(table.userId),
]);

export const insertBranchBreakLogSchema = createInsertSchema(branchBreakLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchBreakLog = z.infer<typeof insertBranchBreakLogSchema>;
export type BranchBreakLog = typeof branchBreakLogs.$inferSelect;

// Şube Günlük Çalışma Özeti (puantaj için)
export const branchShiftDailySummary = pgTable("branch_shift_daily_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),
  
  // Vardiya detayları
  sessionCount: integer("session_count").default(0), // Gün içi toplam oturum
  firstCheckIn: timestamp("first_check_in"),
  lastCheckOut: timestamp("last_check_out"),
  
  // Süre hesaplamaları (dakika)
  totalWorkMinutes: integer("total_work_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  netWorkMinutes: integer("net_work_minutes").default(0),
  
  // Planlanan vs gerçekleşen
  plannedWorkMinutes: integer("planned_work_minutes").default(540), // 9 saat = 540 dk
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0),
  
  // Durum
  isLate: boolean("is_late").default(false),
  lateMinutes: integer("late_minutes").default(0),
  isEarlyLeave: boolean("is_early_leave").default(false),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  
  // Onay durumu
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_daily_summary_user_idx").on(table.userId),
  index("branch_daily_summary_branch_idx").on(table.branchId),
  index("branch_daily_summary_date_idx").on(table.workDate),
  unique("branch_daily_summary_user_date_unique").on(table.userId, table.workDate),
]);

export const insertBranchShiftDailySummarySchema = createInsertSchema(branchShiftDailySummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchShiftDailySummary = z.infer<typeof insertBranchShiftDailySummarySchema>;
export type BranchShiftDailySummary = typeof branchShiftDailySummary.$inferSelect;

// Şube Haftalık Çalışma Özeti (45 saat takibi)
export const branchWeeklyAttendanceSummary = pgTable("branch_weekly_attendance_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Hafta bilgisi
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Çalışma saatleri
  plannedTotalMinutes: integer("planned_total_minutes").default(2700), // 45 saat = 2700 dk
  actualTotalMinutes: integer("actual_total_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0),
  
  // Günlük dağılım
  workDaysCount: integer("work_days_count").default(0),
  absentDaysCount: integer("absent_days_count").default(0),
  lateDaysCount: integer("late_days_count").default(0),
  
  // Uyumluluk
  weeklyComplianceScore: integer("weekly_compliance_score").default(100),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  accountingNotes: text("accounting_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_weekly_summary_user_idx").on(table.userId),
  index("branch_weekly_summary_branch_idx").on(table.branchId),
  index("branch_weekly_summary_week_idx").on(table.weekStartDate),
  unique("branch_weekly_summary_user_week_unique").on(table.userId, table.weekStartDate),
]);

export const insertBranchWeeklyAttendanceSummarySchema = createInsertSchema(branchWeeklyAttendanceSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchWeeklyAttendanceSummary = z.infer<typeof insertBranchWeeklyAttendanceSummarySchema>;
export type BranchWeeklyAttendanceSummary = typeof branchWeeklyAttendanceSummary.$inferSelect;

// HQ Vardiya Oturumlari (Merkez ofis personel takibi)
export const hqShiftSessions = pgTable("hq_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  workMinutes: integer("work_minutes").default(0),
  breakMinutes: integer("break_minutes").default(0),
  netWorkMinutes: integer("net_work_minutes").default(0),
  outsideMinutes: integer("outside_minutes").default(0), // dis gorev suresi
  
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, on_break, outside, completed
  
  // Lokasyon
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  isLocationVerified: boolean("is_location_verified").default(false),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hq_shift_sessions_user_idx").on(table.userId),
  index("hq_shift_sessions_date_idx").on(table.checkInTime),
  index("hq_shift_sessions_status_idx").on(table.status),
]);

export const insertHqShiftSessionSchema = createInsertSchema(hqShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertHqShiftSession = z.infer<typeof insertHqShiftSessionSchema>;
export type HqShiftSession = typeof hqShiftSessions.$inferSelect;

// HQ Cikis Olaylari (mola, dis gorev, kisisel izin)
export const hqShiftEvents = pgTable("hq_shift_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => hqShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  eventType: varchar("event_type", { length: 30 }).notNull(), // check_in, check_out, break_start, break_end, outside_start, outside_end
  exitReason: varchar("exit_reason", { length: 30 }), // break, external_task, personal, end_of_day
  exitDescription: text("exit_description"), // dis gorev aciklamasi
  estimatedReturnTime: timestamp("estimated_return_time"), // tahmini donus
  
  eventTime: timestamp("event_time").notNull().defaultNow(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hq_shift_events_session_idx").on(table.sessionId),
  index("hq_shift_events_user_idx").on(table.userId),
]);

export const insertHqShiftEventSchema = createInsertSchema(hqShiftEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertHqShiftEvent = z.infer<typeof insertHqShiftEventSchema>;
export type HqShiftEvent = typeof hqShiftEvents.$inferSelect;

// Şube Aylık Puantaj Özeti (İK raporlama için)
export const branchMonthlyPayrollSummary = pgTable("branch_monthly_payroll_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Ay bilgisi
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Toplam çalışma
  totalWorkDays: integer("total_work_days").default(0),
  totalWorkMinutes: integer("total_work_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  totalNetWorkMinutes: integer("total_net_work_minutes").default(0),
  
  // Fazla mesai / eksik saat
  totalOvertimeMinutes: integer("total_overtime_minutes").default(0),
  totalMissingMinutes: integer("total_missing_minutes").default(0),
  
  // Devamsızlık
  absentDays: integer("absent_days").default(0),
  lateDays: integer("late_days").default(0),
  earlyLeaveDays: integer("early_leave_days").default(0),
  
  // İzinler
  paidLeaveDays: integer("paid_leave_days").default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").default(0),
  sickLeaveDays: integer("sick_leave_days").default(0),
  
  // Resmi tatil
  publicHolidayDays: integer("public_holiday_days").default(0),
  
  // Onay ve export
  status: varchar("status", { length: 20 }).default("draft"), // draft, finalized, exported
  finalizedById: varchar("finalized_by_id").references(() => users.id, { onDelete: "set null" }),
  finalizedAt: timestamp("finalized_at"),
  exportedAt: timestamp("exported_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_monthly_payroll_user_idx").on(table.userId),
  index("branch_monthly_payroll_branch_idx").on(table.branchId),
  index("branch_monthly_payroll_month_idx").on(table.month, table.year),
  unique("branch_monthly_payroll_user_month_unique").on(table.userId, table.month, table.year),
]);

export const insertBranchMonthlyPayrollSummarySchema = createInsertSchema(branchMonthlyPayrollSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchMonthlyPayrollSummary = z.infer<typeof insertBranchMonthlyPayrollSummarySchema>;
export type BranchMonthlyPayrollSummary = typeof branchMonthlyPayrollSummary.$inferSelect;

// Şube Kiosk Ayarları (şube bazlı yapılandırma)
export const branchKioskSettings = pgTable("branch_kiosk_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }).unique(),
  
  // Kiosk erişim parolası
  kioskPassword: varchar("kiosk_password", { length: 255 }).notNull(),
  
  // Çalışma saatleri (varsayılan vardiya)
  defaultShiftStartTime: varchar("default_shift_start_time", { length: 5 }).default("08:00"), // HH:mm
  defaultShiftEndTime: varchar("default_shift_end_time", { length: 5 }).default("18:00"),
  
  // Mola ayarları
  defaultBreakMinutes: integer("default_break_minutes").default(60), // 1 saat mola
  maxBreakMinutes: integer("max_break_minutes").default(90), // Maksimum mola
  
  // Tolerans ayarları
  lateToleranceMinutes: integer("late_tolerance_minutes").default(15), // 15 dk tolerans
  earlyLeaveToleranceMinutes: integer("early_leave_tolerance_minutes").default(15),
  
  // Otomatik kapanış saati (HH:mm formatında, Türkiye saati — varsayılan: 22:00)
  autoCloseTime: varchar("auto_close_time", { length: 5 }).default("22:00"),

  // Aktiflik
  isKioskEnabled: boolean("is_kiosk_enabled").default(true).notNull(),
  
  kioskMode: varchar("kiosk_mode", { length: 10 }).default("pin").notNull(),
  
  // Giriş yöntemi — şube bazlı toggle (admin tarafından ayarlanır)
  allowPin: boolean("allow_pin").default(true).notNull(),
  allowQr: boolean("allow_qr").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBranchKioskSettingsSchema = createInsertSchema(branchKioskSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchKioskSettings = z.infer<typeof insertBranchKioskSettingsSchema>;
export type BranchKioskSettings = typeof branchKioskSettings.$inferSelect;

// Task #328 — Şube kiosk/puantaj ayarlarının değişiklik denetim kaydı (immutable log)
export const attendanceSettingsAudit = pgTable("attendance_settings_audit", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  changedById: varchar("changed_by_id").notNull().references(() => users.id),
  fieldName: varchar("field_name", { length: 64 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (t) => ({
  branchChangedAtIdx: index("idx_attendance_audit_branch_changed").on(t.branchId, t.changedAt),
}));

export const insertAttendanceSettingsAuditSchema = createInsertSchema(attendanceSettingsAudit).omit({
  id: true,
  changedAt: true,
});

export type InsertAttendanceSettingsAudit = z.infer<typeof insertAttendanceSettingsAuditSchema>;
export type AttendanceSettingsAudit = typeof attendanceSettingsAudit.$inferSelect;

export const qrCheckinNonces = pgTable("qr_checkin_nonces", {
  id: serial("id").primaryKey(),
  nonce: varchar("nonce", { length: 64 }).notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QrCheckinNonce = typeof qrCheckinNonces.$inferSelect;

// ========================================
// BİRLEŞİK UYARI SİSTEMİ (Dashboard Alerts)
// Hem Şube hem Fabrika için ortak uyarı altyapısı
// ========================================

// Uyarı konteksti - hangi dashboard için
export const ALERT_CONTEXT = {
  BRANCH: "branch",
  FACTORY: "factory",
} as const;

export type AlertContextType = typeof ALERT_CONTEXT[keyof typeof ALERT_CONTEXT];

// Uyarı türleri
export const ALERT_TRIGGER_TYPE = {
  // Şube uyarıları
  LATE_CLOCK_IN: "late_clock_in",           // Geç giriş
  EARLY_CLOCK_OUT: "early_clock_out",       // Erken çıkış
  MISSING_STAFF: "missing_staff",           // Eksik personel (vardiyaya gelmedi)
  CHECKLIST_OVERDUE: "checklist_overdue",   // Checklist gecikmesi
  NEGATIVE_FEEDBACK: "negative_feedback",   // Olumsuz müşteri geri bildirimi
  SHIFT_GAP: "shift_gap",                   // Vardiya boşluğu
  
  // Fabrika uyarıları
  QUALITY_ISSUE: "quality_issue",           // Kalite kontrol uyumsuzluğu
  PRODUCTION_DELAY: "production_delay",     // Üretim hedefi gecikmesi
  STATION_MALFUNCTION: "station_malfunction", // İstasyon arızası
  HIGH_WASTE_RATE: "high_waste_rate",       // Yüksek fire oranı
  EQUIPMENT_FAILURE: "equipment_failure",   // Ekipman arızası
  LOW_INVENTORY: "low_inventory",           // Düşük stok
} as const;

export type AlertTriggerType = typeof ALERT_TRIGGER_TYPE[keyof typeof ALERT_TRIGGER_TYPE];

// Uyarı seviyeleri
export const ALERT_SEVERITY = {
  CRITICAL: "critical",   // Kırmızı - acil müdahale gerekir
  WARNING: "warning",     // Turuncu - dikkat edilmeli
  INFO: "info",           // Sarı - bilgilendirme
} as const;

export type AlertSeverityType = typeof ALERT_SEVERITY[keyof typeof ALERT_SEVERITY];

// Uyarı durumları
export const ALERT_STATUS = {
  ACTIVE: "active",           // Aktif - henüz işlenmedi
  ACKNOWLEDGED: "acknowledged", // Görüldü/Onaylandı
  DISMISSED: "dismissed",     // Kapatıldı
  RESOLVED: "resolved",       // Çözüldü
  EXPIRED: "expired",         // Süresi doldu (auto-clear)
} as const;

export type AlertStatusType = typeof ALERT_STATUS[keyof typeof ALERT_STATUS];

// Birleşik Uyarılar Tablosu
export const dashboardAlerts = pgTable("dashboard_alerts", {
  id: serial("id").primaryKey(),
  
  // Kontekst - hangi dashboard için (branch/factory)
  context: varchar("context", { length: 20 }).notNull(), // AlertContextType
  contextId: integer("context_id").notNull(), // branchId veya factoryId (şimdilik hep 1)
  
  // Uyarı bilgileri
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // AlertTriggerType
  severity: varchar("severity", { length: 20 }).notNull().default("warning"), // AlertSeverityType
  status: varchar("status", { length: 20 }).notNull().default("active"), // AlertStatusType
  
  // Uyarı içeriği
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  
  // İlgili veri (JSON formatında)
  payload: text("payload"), // { userId, shiftId, checklistId, etc. }
  
  // İlişkili kayıtlar (opsiyonel)
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: "set null" }),
  relatedShiftId: integer("related_shift_id"),
  relatedChecklistId: integer("related_checklist_id"),
  
  // Zamanlama
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Otomatik expire için
  
  // Onay bilgileri
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedByUserId: varchar("acknowledged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Çözüm bilgileri
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolutionNote: text("resolution_note"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dashboard_alerts_context_idx").on(table.context, table.contextId),
  index("dashboard_alerts_status_idx").on(table.status),
  index("dashboard_alerts_severity_idx").on(table.severity),
  index("dashboard_alerts_occurred_at_idx").on(table.occurredAt),
]);

export const insertDashboardAlertSchema = createInsertSchema(dashboardAlerts).omit({
  id: true,
  createdAt: true,
});

export type InsertDashboardAlert = z.infer<typeof insertDashboardAlertSchema>;
export type DashboardAlert = typeof dashboardAlerts.$inferSelect;

// ============ MEGA-MODULE CONFIGURATION ============
// Allows admin to configure mega-module groupings

export const megaModuleConfig = pgTable("mega_module_config", {
  id: serial("id").primaryKey(),
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // e.g., "operations", "equipment", "hr"
  megaModuleName: varchar("mega_module_name", { length: 100 }).notNull(), // Display name
  megaModuleNameTr: varchar("mega_module_name_tr", { length: 100 }).notNull(), // Turkish name
  icon: varchar("icon", { length: 50 }).notNull(), // Lucide icon name
  color: varchar("color", { length: 50 }).notNull(), // Tailwind color class
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMegaModuleConfigSchema = createInsertSchema(megaModuleConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMegaModuleConfig = z.infer<typeof insertMegaModuleConfigSchema>;
export type MegaModuleConfig = typeof megaModuleConfig.$inferSelect;

// Sub-module assignments to mega-modules
export const megaModuleItems = pgTable("mega_module_items", {
  id: serial("id").primaryKey(),
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // FK to mega_module_config
  subModuleId: varchar("sub_module_id", { length: 100 }).notNull(), // Original module ID from menu blueprint
  subModulePath: varchar("sub_module_path", { length: 255 }).notNull(), // Route path
  subModuleName: varchar("sub_module_name", { length: 100 }).notNull(), // Display name
  subModuleNameTr: varchar("sub_module_name_tr", { length: 100 }).notNull(), // Turkish name
  icon: varchar("icon", { length: 50 }), // Optional override icon
  tabGroup: varchar("tab_group", { length: 50 }), // Group tabs for large modules (e.g., "users", "settings", "content")
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMegaModuleItemSchema = createInsertSchema(megaModuleItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMegaModuleItem = z.infer<typeof insertMegaModuleItemSchema>;
export type MegaModuleItem = typeof megaModuleItems.$inferSelect;

// Default mega-module definitions (8 main categories)
export const DEFAULT_MEGA_MODULES = [
  { id: "operations", name: "Operations", nameTr: "Operasyonlar", icon: "ClipboardList", color: "bg-green-500" },
  { id: "equipment", name: "Equipment & Maintenance", nameTr: "Ekipman & Bakım", icon: "Wrench", color: "bg-orange-500" },
  { id: "hr", name: "Personnel & HR", nameTr: "Personel & İK", icon: "Users", color: "bg-pink-500" },
  { id: "training", name: "Training & Academy", nameTr: "Eğitim & Akademi", icon: "GraduationCap", color: "bg-blue-500" },
  { id: "kitchen", name: "Kitchen & Recipes", nameTr: "Mutfak & Tarifler", icon: "Coffee", color: "bg-amber-600" },
  { id: "reports", name: "Reports & Analytics", nameTr: "Raporlar & Analiz", icon: "BarChart3", color: "bg-cyan-500" },
  { id: "newshop", name: "New Shop Opening", nameTr: "Yeni Şube Açılış", icon: "Building2", color: "bg-violet-600" },
  { id: "admin", name: "Management & Settings", nameTr: "Yönetim & Ayarlar", icon: "Settings", color: "bg-slate-600" },
] as const;

// ========================================
// AYIN ELEMANI (Employee of the Month) SİSTEMİ
// ========================================

// QR Kod ile Personel Değerlendirme (Müşteri geri bildirimi)
export const staffQrRatings = pgTable("staff_qr_ratings", {
  id: serial("id").primaryKey(),
  
  // Personel ve şube bilgisi
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Değerlendirme puanları (1-5)
  serviceRating: integer("service_rating").notNull(), // Hizmet kalitesi
  friendlinessRating: integer("friendliness_rating").notNull(), // Güler yüzlülük
  speedRating: integer("speed_rating").notNull(), // Hız
  overallRating: integer("overall_rating").notNull(), // Genel puan
  
  // Opsiyonel yorum
  comment: text("comment"),
  
  // Müşteri bilgisi (anonim veya kayıtlı)
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  
  // QR kod bilgisi
  qrToken: varchar("qr_token", { length: 64 }).notNull(), // Benzersiz QR token
  
  // Durum
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, flagged, removed
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("staff_qr_ratings_staff_idx").on(table.staffId),
  index("staff_qr_ratings_branch_idx").on(table.branchId),
  index("staff_qr_ratings_date_idx").on(table.createdAt),
  index("staff_qr_ratings_token_idx").on(table.qrToken),
]);

export const insertStaffQrRatingSchema = createInsertSchema(staffQrRatings).omit({
  id: true,
  createdAt: true,
}).extend({
  serviceRating: z.number().int().min(1).max(5),
  friendlinessRating: z.number().int().min(1).max(5),
  speedRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
});

export type InsertStaffQrRating = z.infer<typeof insertStaffQrRatingSchema>;
export type StaffQrRating = typeof staffQrRatings.$inferSelect;

// Personel QR Token Yönetimi
export const staffQrTokens = pgTable("staff_qr_tokens", {
  id: serial("id").primaryKey(),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // QR token (benzersiz, kısa URL için)
  token: varchar("token", { length: 32 }).notNull().unique(),
  
  // Aktiflik ve son kullanım
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("staff_qr_tokens_staff_branch_unique").on(table.staffId, table.branchId),
  index("staff_qr_tokens_token_idx").on(table.token),
]);

export const insertStaffQrTokenSchema = createInsertSchema(staffQrTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffQrToken = z.infer<typeof insertStaffQrTokenSchema>;
export type StaffQrToken = typeof staffQrTokens.$inferSelect;

// Ayın Elemanı Puanlama Ağırlıkları (Admin yapılandırması)
export const employeeOfMonthWeights = pgTable("employee_of_month_weights", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }), // null = global default
  
  // Puanlama ağırlıkları (toplam 100 olmalı)
  attendanceWeight: integer("attendance_weight").default(20).notNull(), // Vardiya uyumu, zamanında gelme
  checklistWeight: integer("checklist_weight").default(20).notNull(), // Checklist tamamlama oranı
  taskWeight: integer("task_weight").default(15).notNull(), // Görev performansı
  customerRatingWeight: integer("customer_rating_weight").default(15).notNull(), // QR müşteri değerlendirmesi
  managerRatingWeight: integer("manager_rating_weight").default(20).notNull(), // Yönetici değerlendirmesi
  leaveDeductionWeight: integer("leave_deduction_weight").default(10).notNull(), // İzin kesintisi (rapor, ücretsiz izin)
  
  // Bonus puanlar (opsiyonel)
  bonusMaxPoints: integer("bonus_max_points").default(10), // Maksimum bonus puan
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeOfMonthWeightsSchema = createInsertSchema(employeeOfMonthWeights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOfMonthWeights = z.infer<typeof insertEmployeeOfMonthWeightsSchema>;
export type EmployeeOfMonthWeights = typeof employeeOfMonthWeights.$inferSelect;

// Aylık Personel Performans Özeti (Ayın Elemanı hesaplama için)
export const monthlyEmployeePerformance = pgTable("monthly_employee_performance", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Alt skorlar (0-100 arası)
  attendanceScore: integer("attendance_score").default(0), // Vardiya uyumu skoru
  checklistScore: integer("checklist_score").default(0), // Checklist tamamlama skoru
  taskScore: integer("task_score").default(0), // Görev performans skoru
  customerRatingScore: integer("customer_rating_score").default(0), // QR değerlendirme skoru
  managerRatingScore: integer("manager_rating_score").default(0), // Yönetici değerlendirme skoru
  
  // Detaylı metrikler
  totalShifts: integer("total_shifts").default(0),
  onTimeShifts: integer("on_time_shifts").default(0),
  lateShifts: integer("late_shifts").default(0),
  absentShifts: integer("absent_shifts").default(0),
  
  totalChecklists: integer("total_checklists").default(0),
  completedChecklists: integer("completed_checklists").default(0),
  onTimeChecklists: integer("on_time_checklists").default(0),
  
  totalTasks: integer("total_tasks").default(0),
  completedTasks: integer("completed_tasks").default(0),
  avgTaskRating: numeric("avg_task_rating", { precision: 3, scale: 2 }).default("0"),
  
  totalCustomerRatings: integer("total_customer_ratings").default(0),
  avgCustomerRating: numeric("avg_customer_rating", { precision: 3, scale: 2 }).default("0"),
  
  // İzin bilgileri
  paidLeaveDays: integer("paid_leave_days").default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").default(0),
  sickLeaveDays: integer("sick_leave_days").default(0),
  
  // Hesaplanan toplam skor
  leaveDeduction: integer("leave_deduction").default(0), // İzin kesintisi puanı
  bonusPoints: integer("bonus_points").default(0), // Bonus puanlar
  finalScore: integer("final_score").default(0), // Ağırlıklı toplam (0-100)
  
  // Sıralama
  branchRank: integer("branch_rank"), // Şube içi sıralama
  
  // Durum
  status: varchar("status", { length: 20 }).default("calculating").notNull(), // calculating, finalized, awarded
  calculatedAt: timestamp("calculated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("monthly_perf_user_month_unique").on(table.userId, table.month, table.year),
  index("monthly_perf_branch_idx").on(table.branchId),
  index("monthly_perf_period_idx").on(table.month, table.year),
  index("monthly_perf_score_idx").on(table.finalScore),
]);

export const insertMonthlyEmployeePerformanceSchema = createInsertSchema(monthlyEmployeePerformance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyEmployeePerformance = z.infer<typeof insertMonthlyEmployeePerformanceSchema>;
export type MonthlyEmployeePerformance = typeof monthlyEmployeePerformance.$inferSelect;

// Ayın Elemanı Kayıtları (Kazananlar)
export const employeeOfMonthAwards = pgTable("employee_of_month_awards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  
  // Skor bilgileri
  finalScore: integer("final_score").notNull(),
  performanceId: integer("performance_id").references(() => monthlyEmployeePerformance.id, { onDelete: "set null" }),
  
  // Ödül detayları
  awardType: varchar("award_type", { length: 30 }).default("employee_of_month").notNull(), // employee_of_month, runner_up, rising_star
  awardTitle: varchar("award_title", { length: 100 }),
  awardDescription: text("award_description"),
  
  // Ödül badge/sertifika
  certificateUrl: text("certificate_url"),
  badgeId: varchar("badge_id", { length: 50 }),
  
  // Onay durumu
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, announced, celebrated
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  announcedAt: timestamp("announced_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("eom_award_branch_month_unique").on(table.branchId, table.month, table.year, table.awardType),
  index("eom_award_user_idx").on(table.userId),
  index("eom_award_period_idx").on(table.month, table.year),
]);

export const insertEmployeeOfMonthAwardSchema = createInsertSchema(employeeOfMonthAwards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOfMonthAward = z.infer<typeof insertEmployeeOfMonthAwardSchema>;
export type EmployeeOfMonthAward = typeof employeeOfMonthAwards.$inferSelect;

// ========================================
// YÖNETİCİ AYLIK PERSONEL DEĞERLENDİRME
// ========================================

// Yönetici Aylık Personel Değerlendirmesi
export const managerMonthlyRatings = pgTable("manager_monthly_ratings", {
  id: serial("id").primaryKey(),
  
  // Değerlendiren yönetici
  managerId: varchar("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Değerlendirilen personel
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Değerlendirme kriterleri (1-5 puan)
  workPerformanceRating: integer("work_performance_rating").notNull(), // Genel çalışma performansı
  teamworkRating: integer("teamwork_rating").notNull(), // Ekip uyumu ve iletişim
  initiativeRating: integer("initiative_rating").notNull(), // İnisiyatif ve problem çözme
  customerRelationsRating: integer("customer_relations_rating").notNull(), // Müşteri ilişkileri
  punctualityRating: integer("punctuality_rating").notNull(), // Dakiklik ve güvenilirlik
  
  // Ortalama puan (otomatik hesaplanır)
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull(),
  
  // Yorum ve öneriler
  strengths: text("strengths"), // Güçlü yönler
  areasToImprove: text("areas_to_improve"), // Geliştirilmesi gereken alanlar
  generalComment: text("general_comment"), // Genel yorum
  
  // Durum
  status: varchar("status", { length: 20 }).default("submitted").notNull(), // draft, submitted
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("manager_rating_unique").on(table.managerId, table.employeeId, table.month, table.year),
  index("manager_rating_employee_idx").on(table.employeeId),
  index("manager_rating_branch_idx").on(table.branchId),
  index("manager_rating_period_idx").on(table.month, table.year),
]);

export const insertManagerMonthlyRatingSchema = createInsertSchema(managerMonthlyRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  workPerformanceRating: z.number().int().min(1).max(5),
  teamworkRating: z.number().int().min(1).max(5),
  initiativeRating: z.number().int().min(1).max(5),
  customerRelationsRating: z.number().int().min(1).max(5),
  punctualityRating: z.number().int().min(1).max(5),
});

export type InsertManagerMonthlyRating = z.infer<typeof insertManagerMonthlyRatingSchema>;
export type ManagerMonthlyRating = typeof managerMonthlyRatings.$inferSelect;

// ========================================
// AI EKİPMAN BİLGİ BANKASI - Equipment Knowledge Base
// ========================================

export const equipmentKnowledge = pgTable("equipment_knowledge", {
  id: serial("id").primaryKey(),
  
  // Ekipman tipi (espresso_machine, grinder, refrigerator, blender, etc.)
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(),
  
  // Marka ve model (opsiyonel - genel bilgi için null)
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  
  // Bilgi kategorisi
  category: varchar("category", { length: 50 }).notNull(), // maintenance, troubleshooting, usage, safety, cleaning
  
  // Başlık ve içerik
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Detaylı bilgi (markdown destekli)
  
  // Anahtar kelimeler (arama için)
  keywords: text("keywords").array(),
  
  // Önem seviyesi
  priority: integer("priority").default(0), // 0=normal, 1=önemli, 2=kritik
  
  // Aktiflik durumu
  isActive: boolean("is_active").default(true).notNull(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("eq_knowledge_type_idx").on(table.equipmentType),
  index("eq_knowledge_brand_idx").on(table.brand),
  index("eq_knowledge_category_idx").on(table.category),
  index("eq_knowledge_active_idx").on(table.isActive),
]);

export const insertEquipmentKnowledgeSchema = createInsertSchema(equipmentKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentKnowledge = z.infer<typeof insertEquipmentKnowledgeSchema>;
export type EquipmentKnowledge = typeof equipmentKnowledge.$inferSelect;

// ========================================
// AI SİSTEM YAPILANDIRMASI - AI System Configuration
// ========================================

export const aiSystemConfig = pgTable("ai_system_config", {
  id: serial("id").primaryKey(),
  
  // Yapılandırma anahtarı
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  
  // Yapılandırma değeri (JSON formatında)
  configValue: text("config_value").notNull(),
  
  // Açıklama
  description: text("description"),
  
  // Aktiflik
  isActive: boolean("is_active").default(true).notNull(),
  
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiSystemConfigSchema = createInsertSchema(aiSystemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiSystemConfig = z.infer<typeof insertAiSystemConfigSchema>;
export type AiSystemConfig = typeof aiSystemConfig.$inferSelect;

// ========================================
// STOK YÖNETİMİ - Inventory Management
// ========================================

export const inventoryUnitEnum = ["kg", "gr", "lt", "ml", "adet", "paket", "kutu", "koli"] as const;
export type InventoryUnit = typeof inventoryUnitEnum[number];

export const inventoryCategoryEnum = [
  "hammadde", "ambalaj", "ekipman", "sube_ekipman",
  "sube_malzeme", "konsantre", "donut", "tatli", "tuzlu",
  "cay_grubu", "kahve", "toz_topping",
  "yari_mamul", "bitimis_urun", "ticari_mal",
  "sarf_malzeme", "temizlik", "diger", "arge"
] as const;
export type InventoryCategory = typeof inventoryCategoryEnum[number];

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 50 }),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).default("0").notNull(),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 3 }).default("0").notNull(),
  maximumStock: numeric("maximum_stock", { precision: 12, scale: 3 }),
  reorderPoint: numeric("reorder_point", { precision: 12, scale: 3 }),
  
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0"),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 10, scale: 2 }),
  
  // Piyasa fiyatı (güncel — ürün satış fiyatı hesabında kullanılır)
  marketPrice: numeric("market_price", { precision: 10, scale: 2 }),
  marketPriceUpdatedAt: timestamp("market_price_updated_at"),
  
  // Malzeme sınıfı (Excel: HM/YM/MM/TM/TK)
  materialType: varchar("material_type", { length: 10 }),
  
  // Birim dönüşümü (satınalma birimi ↔ reçete birimi)
  purchaseUnit: varchar("purchase_unit", { length: 20 }),  // Excel/satınalma birimi: KG, ADET, LT
  recipeUnit: varchar("recipe_unit", { length: 20 }),      // Reçete birimi: g, ml
  conversionFactor: numeric("conversion_factor", { precision: 12, scale: 4 }), // 1 purchaseUnit = X recipeUnit (örn: 1 KG = 1000 g)
  
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  storageConditions: text("storage_conditions"),
  shelfLife: integer("shelf_life"),
  
  barcode: varchar("barcode", { length: 100 }),
  qrCode: varchar("qr_code", { length: 255 }),
  batchTracking: boolean("batch_tracking").default(false),
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inventory_code_idx").on(table.code),
  index("inventory_category_idx").on(table.category),
  index("inventory_barcode_idx").on(table.barcode),
  index("inventory_active_idx").on(table.isActive),
  index("inventory_qr_code_idx").on(table.qrCode),
  index("inventory_material_type_idx").on(table.materialType),
]);

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// ── Fiyat Geçmişi (Piyasa + Alım fiyat takibi) ──

export const inventoryPriceHistory = pgTable("inventory_price_history", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
  
  priceType: varchar("price_type", { length: 20 }).notNull(), // "purchase" | "market"
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  previousPrice: numeric("previous_price", { precision: 12, scale: 2 }),
  changePercent: numeric("change_percent", { precision: 6, scale: 2 }),
  
  // Kaynak
  source: varchar("source", { length: 30 }).notNull(), // "excel_import" | "manual" | "purchase_order" | "market_update"
  sourceReferenceId: integer("source_reference_id"), // purchaseOrder ID veya import batch ID
  
  effectiveDate: date("effective_date").notNull(),
  notes: text("notes"),
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("iph_inventory_idx").on(table.inventoryId),
  index("iph_type_idx").on(table.priceType),
  index("iph_date_idx").on(table.effectiveDate),
  index("iph_inventory_type_date_idx").on(table.inventoryId, table.priceType, table.effectiveDate),
]);

export const insertInventoryPriceHistorySchema = createInsertSchema(inventoryPriceHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryPriceHistory = z.infer<typeof insertInventoryPriceHistorySchema>;
export type InventoryPriceHistory = typeof inventoryPriceHistory.$inferSelect;

// Stok Hareketleri
export const inventoryMovementTypeEnum = ["giris", "cikis", "transfer", "uretim_giris", "uretim_cikis", "sayim_duzeltme", "fire", "iade"] as const;
export type InventoryMovementType = typeof inventoryMovementTypeEnum[number];

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  movementType: varchar("movement_type", { length: 30 }).notNull(), // giris, cikis, transfer, uretim_giris, uretim_cikis, sayim_duzeltme
  
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 12, scale: 3 }).notNull(),
  newStock: numeric("new_stock", { precision: 12, scale: 3 }).notNull(),
  
  // Referans bilgileri
  referenceType: varchar("reference_type", { length: 50 }), // purchase_order, production, goods_receipt, sale, transfer
  referenceId: integer("reference_id"),
  
  // Lokasyon (transfer için)
  fromLocation: varchar("from_location", { length: 100 }),
  toLocation: varchar("to_location", { length: 100 }),
  
  // Lot/Batch bilgisi
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  notes: text("notes"),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_movement_inventory_idx").on(table.inventoryId),
  index("inv_movement_type_idx").on(table.movementType),
  index("inv_movement_date_idx").on(table.createdAt),
  index("inv_movement_ref_idx").on(table.referenceType, table.referenceId),
]);

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
});

export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;

// ========================================
// TEDARİKÇİ YÖNETİMİ - Supplier Management
// ========================================

export const supplierStatusEnum = ["aktif", "pasif", "askiya_alinmis", "kara_liste"] as const;
export type SupplierStatus = typeof supplierStatusEnum[number];

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  
  // Temel bilgiler
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  taxNumber: varchar("tax_number", { length: 20 }),
  taxOffice: varchar("tax_office", { length: 100 }),
  
  // İletişim bilgileri
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  alternativePhone: varchar("alternative_phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  
  // Banka bilgileri
  bankName: varchar("bank_name", { length: 100 }),
  iban: varchar("iban", { length: 50 }),
  
  // Ticari bilgiler
  paymentTermDays: integer("payment_term_days").default(30),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }),
  
  // Kategoriler ve ürünler
  categories: text("categories").array(), // Tedarik ettiği kategoriler
  
  // Performans metrikleri
  performanceScore: numeric("performance_score", { precision: 3, scale: 1 }).default("0"),
  onTimeDeliveryRate: numeric("on_time_delivery_rate", { precision: 5, scale: 2 }).default("0"),
  qualityScore: numeric("quality_score", { precision: 3, scale: 1 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  totalOrderValue: numeric("total_order_value", { precision: 14, scale: 2 }).default("0"),
  
  // Durum
  status: varchar("status", { length: 30 }).default("aktif").notNull(),
  notes: text("notes"),
  
  // ═══════════════════════════════════════════════════════════════════
  // Sprint 7 (5 May 2026) - Gıda Mevzuat Sertifikaları (TGK uyum)
  // ═══════════════════════════════════════════════════════════════════
  foodAuthorizationNumber: varchar("food_authorization_number", { length: 100 }),
  authorizationExpiryDate: date("authorization_expiry_date"),
  iso22000Certified: boolean("iso_22000_certified").default(false),
  haccpCertified: boolean("haccp_certified").default(false),
  halalCertified: boolean("halal_certified").default(false),
  lastAuditDate: date("last_audit_date"),
  auditScore: numeric("audit_score", { precision: 5, scale: 2 }),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("supplier_code_idx").on(table.code),
  index("supplier_name_idx").on(table.name),
  index("supplier_status_idx").on(table.status),
  index("supplier_auth_idx").on(table.foodAuthorizationNumber),
]);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ========================================
// ÜRÜN-TEDARİKÇİ İLİŞKİSİ - Product Supplier Mapping
// ========================================

export const productSuppliers = pgTable("product_suppliers", {
  id: serial("id").primaryKey(),
  
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  
  // Tedarikçiye özel bilgiler
  supplierProductCode: varchar("supplier_product_code", { length: 100 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  minimumOrderQuantity: numeric("minimum_order_quantity", { precision: 12, scale: 3 }).default("1"),
  leadTimeDays: integer("lead_time_days").default(3),
  
  // Tercih sırası
  preferenceOrder: integer("preference_order").default(1),
  isPrimary: boolean("is_primary").default(false),
  
  // Durum
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ps_inventory_idx").on(table.inventoryId),
  index("ps_supplier_idx").on(table.supplierId),
]);

export const insertProductSupplierSchema = createInsertSchema(productSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductSupplier = z.infer<typeof insertProductSupplierSchema>;
export type ProductSupplier = typeof productSuppliers.$inferSelect;

// ========================================
// SİPARİŞ YÖNETİMİ - Purchase Order Management
// ========================================

export const purchaseOrderStatusEnum = ["taslak", "onay_bekliyor", "onaylandi", "siparis_verildi", "kismen_teslim", "tamamlandi", "iptal"] as const;
export type PurchaseOrderStatus = typeof purchaseOrderStatusEnum[number];

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  
  // Sipariş bilgileri
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  
  // Tarihler
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  
  // Tutar bilgileri
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  
  // Durum ve onay
  status: varchar("status", { length: 30 }).default("taslak").notNull(),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  // Teslimat bilgileri
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),
  
  // Notlar
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("po_order_number_idx").on(table.orderNumber),
  index("po_supplier_idx").on(table.supplierId),
  index("po_status_idx").on(table.status),
  index("po_date_idx").on(table.orderDate),
]);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Sipariş Kalemleri
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("18"),
  discountRate: numeric("discount_rate", { precision: 5, scale: 2 }).default("0"),
  
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  
  // Teslimat durumu
  deliveredQuantity: numeric("delivered_quantity", { precision: 12, scale: 3 }).default("0"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("poi_order_idx").on(table.purchaseOrderId),
  index("poi_inventory_idx").on(table.inventoryId),
]);

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

// ========================================
// MAL KABUL - Goods Receipt
// ========================================

export const goodsReceiptStatusEnum = ["beklemede", "kontrol_ediliyor", "kabul_edildi", "kismen_kabul", "reddedildi"] as const;
export type GoodsReceiptStatus = typeof goodsReceiptStatusEnum[number];

export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  
  // Kabul bilgileri
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  
  // Tarih ve zaman
  receiptDate: timestamp("receipt_date").defaultNow().notNull(),
  
  // Belge bilgileri
  supplierInvoiceNumber: varchar("supplier_invoice_number", { length: 100 }),
  supplierInvoiceDate: timestamp("supplier_invoice_date"),
  deliveryNoteNumber: varchar("delivery_note_number", { length: 100 }),
  
  // Durum
  status: varchar("status", { length: 30 }).default("beklemede").notNull(),
  
  // Kalite kontrol
  qualityCheckRequired: boolean("quality_check_required").default(false),
  qualityCheckPassed: boolean("quality_check_passed"),
  qualityCheckNotes: text("quality_check_notes"),
  qualityCheckedById: varchar("quality_checked_by_id").references(() => users.id, { onDelete: "set null" }),
  qualityCheckedAt: timestamp("quality_checked_at"),
  
  // Teslimat durumu ve tedarikçi değerlendirmesi
  deliveryStatus: varchar("delivery_status", { length: 20 }), // early, on_time, late
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  deliveryDelayDays: integer("delivery_delay_days").default(0),
  supplierQualityScore: integer("supplier_quality_score"), // 1-5 puan
  supplierQualityNotes: text("supplier_quality_notes"),
  
  // Notlar
  notes: text("notes"),
  
  receivedById: varchar("received_by_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("gr_receipt_number_idx").on(table.receiptNumber),
  index("gr_po_idx").on(table.purchaseOrderId),
  index("gr_supplier_idx").on(table.supplierId),
  index("gr_status_idx").on(table.status),
  index("gr_date_idx").on(table.receiptDate),
]);

export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoodsReceipt = z.infer<typeof insertGoodsReceiptSchema>;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Sprint 7 (5 May 2026) - Suppliers TGK Compliance Fields
// suppliers tablosuna eklenecek alanlar (ALTER TABLE migration ile)
// ═══════════════════════════════════════════════════════════════════
// Not: suppliers pgTable definition yukarıda — yeni alanlar mevcut
// alana eklenecek. Bu yorum migration referansıdır.

// ═══════════════════════════════════════════════════════════════════
// Sprint 7 - Tedarikçi Kalite Kayıtları (Performans Takibi)
// Mahmut Bey + Tülay (Kalite) için: her giriş partisinde QC kontrol
// ═══════════════════════════════════════════════════════════════════
export const supplierInspectionStatusEnum = ["kabul", "şartlı_kabul", "red"] as const;
export type SupplierInspectionStatus = typeof supplierInspectionStatusEnum[number];

export const supplierQualityRecords = pgTable("supplier_quality_records", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  rawMaterialId: integer("raw_material_id"), // raw_materials reference (cross-schema, FK migration'da)
  
  // Giriş kaydı
  deliveryDate: date("delivery_date").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  lotNumber: varchar("lot_number", { length: 100 }),  // BUG-08 FIX (7 May 2026): TGK 2017/2284 m.9/k izlenebilirlik
  deliveredQuantity: numeric("delivered_quantity", { precision: 12, scale: 3 }),
  unit: varchar("unit", { length: 20 }),
  
  // Kalite kontrol
  inspectionStatus: varchar("inspection_status", { length: 30 }).notNull(), // 'kabul' | 'şartlı_kabul' | 'red'
  nonConformity: text("non_conformity"),
  rejectionReason: text("rejection_reason"),
  correctiveAction: text("corrective_action"),
  
  // İlişkiler
  inspectedById: varchar("inspected_by_id").references(() => users.id),
  approvedById: varchar("approved_by_id").references(() => users.id),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("sqr_supplier_idx").on(table.supplierId),
  index("sqr_material_idx").on(table.rawMaterialId),
  index("sqr_date_idx").on(table.deliveryDate),
  index("sqr_status_idx").on(table.inspectionStatus),
]);

export const insertSupplierQualityRecordSchema = createInsertSchema(supplierQualityRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplierQualityRecord = z.infer<typeof insertSupplierQualityRecordSchema>;
export type SupplierQualityRecord = typeof supplierQualityRecords.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Sprint 7 - TGK 2017/2284 Etiketler (Etiket Hesaplama ve Onay)
// ═══════════════════════════════════════════════════════════════════
export const tgkLabelStatusEnum = ["taslak", "onay_bekliyor", "onaylandi", "reddedildi"] as const;
export type TgkLabelStatus = typeof tgkLabelStatusEnum[number];

export const tgkLabels = pgTable("tgk_labels", {
  id: serial("id").primaryKey(),
  
  // Etiket sahibi
  productId: integer("product_id"),
  productType: varchar("product_type", { length: 20 }), // 'branch_product' | 'factory_product'
  productName: varchar("product_name", { length: 255 }).notNull(),
  
  // Etiket içeriği (TGK Madde 9 zorunlu alanlar)
  ingredientsText: text("ingredients_text"),
  allergenWarning: text("allergen_warning"),
  crossContaminationWarning: text("cross_contamination_warning"),
  
  // Net miktar
  netQuantityG: numeric("net_quantity_g", { precision: 10, scale: 2 }),
  servingSizeG: numeric("serving_size_g", { precision: 10, scale: 2 }),
  
  // Besin değerleri (100g başına) — TGK Ek-13
  energyKcal: numeric("energy_kcal", { precision: 10, scale: 2 }),
  energyKj: numeric("energy_kj", { precision: 10, scale: 2 }),
  fat: numeric("fat", { precision: 10, scale: 3 }),
  saturatedFat: numeric("saturated_fat", { precision: 10, scale: 3 }),
  carbohydrate: numeric("carbohydrate", { precision: 10, scale: 3 }),
  sugar: numeric("sugar", { precision: 10, scale: 3 }),
  protein: numeric("protein", { precision: 10, scale: 3 }),
  salt: numeric("salt", { precision: 10, scale: 3 }),
  fiber: numeric("fiber", { precision: 10, scale: 3 }),
  
  // Saklama ve son kullanma
  storageConditions: text("storage_conditions"),
  shelfLifeDays: integer("shelf_life_days"),
  bestBeforeDate: date("best_before_date"),
  
  // Üretici bilgisi
  manufacturerName: varchar("manufacturer_name", { length: 255 }).default("DOSPRESSO Coffee & Donut"),
  manufacturerAddress: text("manufacturer_address").default("Antalya, Türkiye"),
  
  // Onay zinciri (gıda mühendisi onayı zorunlu — TGK Madde 18)
  status: varchar("status", { length: 30 }).default("taslak"),
  createdById: varchar("created_by_id").references(() => users.id),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  
  // Versiyon
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tgk_labels_product_idx").on(table.productId, table.productType),
  index("tgk_labels_status_idx").on(table.status),
]);

export const insertTgkLabelSchema = createInsertSchema(tgkLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTgkLabel = z.infer<typeof insertTgkLabelSchema>;
export type TgkLabel = typeof tgkLabels.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Sprint 7 (5 May 2026) - TÜRKOMP Cache Tablosu
// Türkiye Tarım ve Orman Bakanlığı resmi gıda kompozisyon veri tabanı
// turkomp.tarimorman.gov.tr - 645 gıda, 100 bileşen
// 
// ⚠️ YASAL UYARI: TÜRKOMP verileri ticari kullanım için ücretli lisans gerektirir.
// Bu cache tablo SADECE kullanıcının manuel arama sonucunu önbellekler.
// Toplu scraping/veri satışı YASAKTIR.
// ═══════════════════════════════════════════════════════════════════

export const turkompFoods = pgTable("turkomp_foods", {
  id: serial("id").primaryKey(),
  
  // TÜRKOMP referansı
  turkompId: integer("turkomp_id").notNull().unique(), // turkomp.gov.tr food ID
  turkompCode: varchar("turkomp_code", { length: 20 }), // 09.01.0012 gibi
  slug: varchar("slug", { length: 200 }), // 'cilek-377' URL slug
  
  // Gıda bilgisi
  name: varchar("name", { length: 255 }).notNull(),
  scientificName: varchar("scientific_name", { length: 255 }),
  foodGroup: varchar("food_group", { length: 100 }),
  langualCode: text("langual_code"),
  
  // Çevirme faktörleri
  nitrogenFactor: numeric("nitrogen_factor", { precision: 6, scale: 4 }),
  fatConversionFactor: numeric("fat_conversion_factor", { precision: 6, scale: 4 }),
  
  // Besin değerleri (100g başına ortalama) - sadece TGK ile alakalı 8 kritik
  energyKcal: numeric("energy_kcal", { precision: 10, scale: 2 }),
  energyKj: numeric("energy_kj", { precision: 10, scale: 2 }),
  water: numeric("water", { precision: 10, scale: 3 }),
  protein: numeric("protein", { precision: 10, scale: 3 }),
  fat: numeric("fat", { precision: 10, scale: 3 }),
  saturatedFat: numeric("saturated_fat", { precision: 10, scale: 3 }),
  carbohydrate: numeric("carbohydrate", { precision: 10, scale: 3 }),
  sugar: numeric("sugar", { precision: 10, scale: 3 }),
  fiber: numeric("fiber", { precision: 10, scale: 3 }),
  salt: numeric("salt", { precision: 10, scale: 3 }),
  sodium: numeric("sodium", { precision: 10, scale: 3 }),
  
  // Tüm bileşenler (100+ değer JSON olarak)
  allComponents: jsonb("all_components"), // { "WATER": {min,max,avg,unit}, ... }
  
  // Cache yönetimi
  source: varchar("source", { length: 50 }).default("turkomp"), // 'turkomp' | 'manual' | 'estimate'
  fetchedAt: timestamp("fetched_at").defaultNow(),
  fetchedById: varchar("fetched_by_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("turkomp_id_idx").on(table.turkompId),
  index("turkomp_name_idx").on(table.name),
  index("turkomp_code_idx").on(table.turkompCode),
  index("turkomp_group_idx").on(table.foodGroup),
]);

export const insertTurkompFoodSchema = createInsertSchema(turkompFoods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTurkompFood = z.infer<typeof insertTurkompFoodSchema>;
export type TurkompFood = typeof turkompFoods.$inferSelect;

// rawMaterials.turkompFoodId ile cross-reference olabilir
