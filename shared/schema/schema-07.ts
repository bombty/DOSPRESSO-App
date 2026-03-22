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

import { UserRoleType } from './schema-01';
import { User, branches, equipment, tasks, users } from './schema-02';
import { shiftAttendance, shifts } from './schema-03';
import { roles } from './schema-04';
import { ProjectPhaseType, externalUsers, projects } from './schema-06';

// External User Audit Log - Dış kullanıcı aktivite logları
export const externalUserAuditLog = pgTable("external_user_audit_log", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // login, view_project, add_comment, upload_file, etc.
  details: text("details"), // JSON details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("external_audit_user_idx").on(table.externalUserId),
  index("external_audit_project_idx").on(table.projectId),
  index("external_audit_created_idx").on(table.createdAt),
]);

export const insertExternalUserAuditLogSchema = createInsertSchema(externalUserAuditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertExternalUserAuditLog = z.infer<typeof insertExternalUserAuditLogSchema>;
export type ExternalUserAuditLog = typeof externalUserAuditLog.$inferSelect;


// ============================================
// ADMIN PANEL - E-posta Ayarları
// ============================================
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }), // Encrypted
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO"),
  smtpSecure: boolean("smtp_secure").default(false), // TLS
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Servis Email Ayarları (Arıza/Bakım için ayrı SMTP)
// ============================================
export const serviceEmailSettings = pgTable("service_email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO Teknik"),
  smtpSecure: boolean("smtp_secure").default(false),
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceEmailSettingsSchema = createInsertSchema(serviceEmailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertServiceEmailSettings = z.infer<typeof insertServiceEmailSettingsSchema>;
export type ServiceEmailSettings = typeof serviceEmailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Banner Yönetimi
// ============================================
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  targetRoles: text("target_roles").array(), // null = all roles
  startDate: timestamp("start_date"), // Nullable for drafts
  endDate: timestamp("end_date"), // Nullable for drafts
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("banners_active_idx").on(table.isActive),
  index("banners_dates_idx").on(table.startDate, table.endDate),
]);

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// ============================================
// ADMIN PANEL - AI Sağlayıcı Ayarları
// ============================================
export const AI_PROVIDERS = {
  OPENAI: "openai",
  GEMINI: "gemini",
  ANTHROPIC: "anthropic",
} as const;

export type AIProviderType = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  // Aktif sağlayıcı
  provider: varchar("provider", { length: 30 }).notNull().default("openai"), // openai, gemini, anthropic
  isActive: boolean("is_active").default(true),
  // OpenAI ayarları
  openaiApiKey: text("openai_api_key"), // Şifreli
  openaiChatModel: varchar("openai_chat_model", { length: 100 }).default("gpt-4o"),
  openaiEmbeddingModel: varchar("openai_embedding_model", { length: 100 }).default("text-embedding-3-small"),
  openaiVisionModel: varchar("openai_vision_model", { length: 100 }).default("gpt-4o"),
  // Gemini ayarları
  geminiApiKey: text("gemini_api_key"), // Şifreli
  geminiChatModel: varchar("gemini_chat_model", { length: 100 }).default("gemini-2.0-flash"),
  geminiEmbeddingModel: varchar("gemini_embedding_model", { length: 100 }).default("text-embedding-004"),
  geminiVisionModel: varchar("gemini_vision_model", { length: 100 }).default("gemini-2.0-flash"),
  // Anthropic (Claude) ayarları
  anthropicApiKey: text("anthropic_api_key"), // Şifreli
  anthropicChatModel: varchar("anthropic_chat_model", { length: 100 }).default("claude-sonnet-4-20250514"),
  anthropicVisionModel: varchar("anthropic_vision_model", { length: 100 }).default("claude-sonnet-4-20250514"),
  // Genel ayarlar
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2000),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  // Embedding tracking
  lastEmbeddingProvider: varchar("last_embedding_provider", { length: 30 }),
  needsReembed: boolean("needs_reembed").default(false),
  // Metadata
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

// Phase Status Constants
export const PHASE_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
} as const;

export type PhaseStatusType = typeof PHASE_STATUS[keyof typeof PHASE_STATUS];
export const NEW_SHOP_PHASE_TEMPLATE: Array<{
  phaseType: ProjectPhaseType;
  title: string;
  description: string;
  iconName: string;
  colorHex: string;
  orderIndex: number;
  targetDays: number;
}> = [
  {
    phaseType: "company_setup",
    title: "Şirket Kurulumu",
    description: "Şirket tescili, vergi mükellefiyet kaydı, banka hesabı açılışı, imza sirküleri",
    iconName: "Building2",
    colorHex: "#8b5cf6",
    orderIndex: 0,
    targetDays: 30,
  },
  {
    phaseType: "contract_legal",
    title: "Sözleşmeler & Hukuki",
    description: "Franchise sözleşmesi, kira sözleşmesi, sigorta poliçeleri, yasal izinler",
    iconName: "FileSignature",
    colorHex: "#6366f1",
    orderIndex: 1,
    targetDays: 45,
  },
  {
    phaseType: "construction",
    title: "İnşaat & Dekorasyon",
    description: "Mekan tadilat, elektrik/tesisat, dekorasyon, dış cephe, tabela",
    iconName: "Hammer",
    colorHex: "#f59e0b",
    orderIndex: 2,
    targetDays: 120,
  },
  {
    phaseType: "equipment",
    title: "Ekipman Yönetimi",
    description: "Kahve makineleri, mutfak ekipmanları, mobilya, POS sistemi, güvenlik",
    iconName: "Coffee",
    colorHex: "#10b981",
    orderIndex: 3,
    targetDays: 150,
  },
  {
    phaseType: "payments",
    title: "Ödemeler & Bütçe",
    description: "Franchise ücreti, depozito, tedarikçi ödemeleri, bütçe takibi",
    iconName: "Wallet",
    colorHex: "#ef4444",
    orderIndex: 4,
    targetDays: 165,
  },
  {
    phaseType: "staffing",
    title: "Personel & İşe Alım",
    description: "İşe alım, mülakat, sözleşme, SGK kaydı, oryantasyon",
    iconName: "Users",
    colorHex: "#3b82f6",
    orderIndex: 5,
    targetDays: 175,
  },
  {
    phaseType: "training_opening",
    title: "Eğitim & Açılış",
    description: "Barista eğitimi, operasyon eğitimi, hijyen sertifikası, açılış öncesi pratik",
    iconName: "GraduationCap",
    colorHex: "#ec4899",
    orderIndex: 6,
    targetDays: 180,
  },
];

// ============================================
// İŞE ALIM MODÜLÜ - Job Positions, Applications, Interviews
// ============================================

// Pozisyon durumları
export const JOB_POSITION_STATUS = {
  OPEN: "open",
  PAUSED: "paused",
  FILLED: "filled",
  CANCELLED: "cancelled",
} as const;

export type JobPositionStatusType = typeof JOB_POSITION_STATUS[keyof typeof JOB_POSITION_STATUS];

// Başvuru durumları
export const APPLICATION_STATUS = {
  NEW: "new",
  SCREENING: "screening",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_COMPLETED: "interview_completed",
  OFFERED: "offered",
  HIRED: "hired",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatusType = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// Mülakat durumları
export const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type InterviewStatusType = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

// Mülakat sonuçları
export const INTERVIEW_RESULT = {
  PENDING: "pending",
  POSITIVE: "positive",
  FINALIST: "finalist",
  NEGATIVE: "negative",
} as const;

export type InterviewResultType = typeof INTERVIEW_RESULT[keyof typeof INTERVIEW_RESULT];

// Açık Pozisyonlar Tablosu
export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Pozisyon adı: Barista, Supervisor vb.
  targetRole: varchar("target_role", { length: 50 }).notNull(), // UserRoleType
  branchId: integer("branch_id").references(() => branches.id), // Null ise HQ pozisyonu
  department: varchar("department", { length: 100 }), // HQ için departman
  description: text("description"), // Pozisyon açıklaması
  requirements: text("requirements"), // Gereksinimler
  salaryMin: integer("salary_min"), // Minimum maaş
  salaryMax: integer("salary_max"), // Maximum maaş
  employmentType: varchar("employment_type", { length: 50 }).default("fulltime"), // fulltime, parttime, intern
  headcount: integer("headcount").default(1), // Kaç kişi alınacak
  hiredCount: integer("hired_count").default(0), // Kaç kişi alındı
  status: varchar("status", { length: 30 }).notNull().default("open"), // open, paused, filled, cancelled
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  deadline: date("deadline"), // Son başvuru tarihi
  selectedApplicationId: integer("selected_application_id").references(() => jobApplications.id), // Seçilen aday
  closedAt: timestamp("closed_at"), // Pozisyon kapatılma tarihi
  closedReason: varchar("closed_reason", { length: 100 }), // closed_reason: hired, no_candidates, cancelled
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id), // İşe alımdan sorumlu kişi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("job_positions_status_idx").on(table.status),
  index("job_positions_branch_idx").on(table.branchId),
]);

export const insertJobPositionSchema = createInsertSchema(jobPositions).omit({
  id: true,
  hiredCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobPosition = z.infer<typeof insertJobPositionSchema>;
export type JobPosition = typeof jobPositions.$inferSelect;

// Başvurular Tablosu
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull().references(() => jobPositions.id),
  // Aday bilgileri
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  tckn: varchar("tckn", { length: 11 }), // TC Kimlik No (opsiyonel başvuru aşamasında)
  birthDate: date("birth_date"),
  address: text("address"),
  // Başvuru bilgileri
  resumeUrl: text("resume_url"), // CV dosyası
  coverLetter: text("cover_letter"), // Ön yazı
  source: varchar("source", { length: 100 }), // Nereden geldi: kariyer.net, referans, yürüyen vb.
  referredBy: varchar("referred_by_id").references(() => users.id), // Referans veren personel
  experience: text("experience"), // Deneyim özeti
  education: varchar("education", { length: 200 }), // Eğitim durumu
  expectedSalary: integer("expected_salary"), // Beklenen maaş
  availableFrom: date("available_from"), // Ne zaman başlayabilir
  // Durum ve değerlendirme
  status: varchar("status", { length: 30 }).notNull().default("new"), // ApplicationStatusType
  rating: integer("rating"), // 1-5 arası puanlama
  notes: text("notes"), // Değerlendirme notları
  rejectionReason: text("rejection_reason"), // Red nedeni
  // Tracking
  createdById: varchar("created_by_id").references(() => users.id), // Kim ekledi (null = online başvuru)
  assignedToId: varchar("assigned_to_id").references(() => users.id), // Kim takip ediyor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("job_applications_position_idx").on(table.positionId),
  index("job_applications_status_idx").on(table.status),
]);

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

// Mülakatlar Tablosu
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  // Mülakat bilgileri
  interviewType: varchar("interview_type", { length: 50 }).notNull(), // phone, video, onsite, trial_day
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(30), // Dakika cinsinden
  location: text("location"), // Şube adresi veya online link
  // Mülakatçı bilgileri
  interviewerId: varchar("interviewer_id").notNull().references(() => users.id),
  additionalInterviewers: text("additional_interviewers"), // JSON: [userId1, userId2]
  // Sonuç
  status: varchar("status", { length: 30 }).notNull().default("scheduled"), // InterviewStatusType
  result: varchar("result", { length: 30 }), // InterviewResultType
  feedback: text("feedback"), // Mülakat geri bildirimi
  rating: integer("rating"), // 1-5 arası değerlendirme
  strengths: text("strengths"), // Güçlü yönler
  weaknesses: text("weaknesses"), // Gelişim alanları
  recommendation: text("recommendation"), // İşe al/alma önerisi
  // Metadata
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("interviews_application_idx").on(table.applicationId),
  index("interviews_date_idx").on(table.scheduledDate),
  index("interviews_interviewer_idx").on(table.interviewerId),
]);

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;

// Standart Mülakat Soruları (HQ yönetimli)
export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // behavioral, technical, situational, star, general
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

// Mülakat Soru-Cevap Kayıtları
export const interviewResponses = pgTable("interview_responses", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => interviewQuestions.id),
  answer: text("answer"), // Adayın cevabı
  score: integer("score"), // 1-5 arası puan
  notes: text("notes"), // Mülakatçı notu
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("interview_responses_interview_idx").on(table.interviewId),
  index("interview_responses_question_idx").on(table.questionId),
]);

export const insertInterviewResponseSchema = createInsertSchema(interviewResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertInterviewResponse = z.infer<typeof insertInterviewResponseSchema>;
export type InterviewResponse = typeof interviewResponses.$inferSelect;

// İşten Çıkarma ve Ayrılış Kayıtları
export const employeeTerminations = pgTable("employee_terminations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  terminationType: varchar("termination_type", { length: 50 }).notNull(), // resignation, termination, retirement, mutual_agreement, contract_end
  terminationDate: date("termination_date").notNull(),
  terminationReason: text("termination_reason"), // Ayrılış sebebi
  lastWorkDay: date("last_work_day"), // Son çalışma günü
  noticeGiven: integer("notice_given"), // Gün cinsinden uyarı süresi
  finalSalary: integer("final_salary"), // Son maaş tutarı
  severancePayment: integer("severance_payment"), // Kıdem tazminatı
  otherPayments: integer("other_payments"), // Diğer ödemeler
  totalPayment: integer("total_payment"), // Toplam ödeme
  returnedItems: text("returned_items"), // Teslim edilen işletme malları (JSON array)
  exitInterview: text("exit_interview"), // Çıkış görüşmesi notları
  performanceRating: integer("performance_rating"), // Son performans puanı (1-5)
  recommendation: text("recommendation"), // Yeniden işe alım önerisi
  processedById: varchar("processed_by_id").notNull().references(() => users.id), // İK tarafından işlem gören
  approvedById: varchar("approved_by_id").references(() => users.id), // Onay yapan (genellikle HQ)
  documents: text("documents").array(), // Sözleşme, tazminat formu vb. URL'ler
  notes: text("notes"), // Genel notlar
  noticeEndDate: date("notice_end_date"), // İhbar süresi bitiş tarihi
  severanceEligible: boolean("severance_eligible").default(false), // Kıdem tazminatı hak ediyor mu
  noticePeriodDays: integer("notice_period_days"), // İhbar süresi (gün)
  terminationSubReason: varchar("termination_sub_reason", { length: 100 }), // Alt ayrılış nedeni (resigned_voluntarily, resigned_forced, fired_performance, fired_misconduct, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_terminations_user_idx").on(table.userId),
  index("employee_terminations_date_idx").on(table.terminationDate),
  index("employee_terminations_type_idx").on(table.terminationType),
]);

export const insertEmployeeTerminationSchema = createInsertSchema(employeeTerminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeTermination = z.infer<typeof insertEmployeeTerminationSchema>;
export type EmployeeTermination = typeof employeeTerminations.$inferSelect;

export const shiftCorrections = pgTable("shift_corrections", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "cascade" }),
  sessionId: integer("session_id"),
  correctedById: varchar("corrected_by_id").notNull().references(() => users.id),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  correctionType: varchar("correction_type", { length: 50 }).notNull(),
  fieldChanged: varchar("field_changed", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("shift_corrections_shift_idx").on(table.shiftId),
  index("shift_corrections_employee_idx").on(table.employeeId),
  index("shift_corrections_corrected_by_idx").on(table.correctedById),
]);

export const insertShiftCorrectionSchema = createInsertSchema(shiftCorrections).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftCorrection = z.infer<typeof insertShiftCorrectionSchema>;
export type ShiftCorrection = typeof shiftCorrections.$inferSelect;

// Çalışan İzin Bakiyeleri
export const employeeLeaves = pgTable("employee_leaves", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(), // İzin yılı
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, maternity, paternity, marriage, bereavement
  totalDays: integer("total_days").notNull().default(14), // Toplam izin hakkı
  usedDays: integer("used_days").notNull().default(0), // Kullanılan gün
  remainingDays: integer("remaining_days").notNull().default(14), // Kalan izin
  carriedOver: integer("carried_over").default(0), // Geçen yıldan aktarılan
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_leaves_user_idx").on(table.userId),
  index("employee_leaves_year_idx").on(table.year),
  index("employee_leaves_type_idx").on(table.leaveType),
]);

export const insertEmployeeLeaveSchema = createInsertSchema(employeeLeaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeLeave = z.infer<typeof insertEmployeeLeaveSchema>;
export type EmployeeLeave = typeof employeeLeaves.$inferSelect;

// ========================================
// DETAYLI RAPORLAMA VE ANALİTİK SİSTEMİ
// ========================================

// Detaylı Raporlar
export const detailedReports = pgTable("detailed_reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  reportType: varchar("report_type", { length: 50 }).notNull(), // branch_comparison, trend_analysis, performance
  branchIds: integer("branch_ids").array(),
  dateRange: jsonb("date_range").notNull(), // { startDate, endDate }
  metrics: jsonb("metrics").notNull(),
  filters: jsonb("filters"),
  chartType: varchar("chart_type", { length: 50 }),
  includeAISummary: boolean("include_ai_summary").default(false),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("reports_type_idx").on(table.reportType),
  index("reports_created_idx").on(table.createdAt),
]);

export const insertDetailedReportSchema = createInsertSchema(detailedReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDetailedReport = z.infer<typeof insertDetailedReportSchema>;
export type DetailedReport = typeof detailedReports.$inferSelect;

// Şube Karşılaştırma
export const branchComparisons = pgTable("branch_comparisons", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => detailedReports.id, { onDelete: "cascade" }),
  branch1Id: integer("branch1_id").notNull().references(() => branches.id),
  branch2Id: integer("branch2_id").notNull().references(() => branches.id),
  metric: varchar("metric", { length: 100 }).notNull(),
  branch1Value: numeric("branch1_value"),
  branch2Value: numeric("branch2_value"),
  difference: numeric("difference"),
  percentDifference: numeric("percent_difference"),
  trend: varchar("trend", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("comparisons_report_idx").on(table.reportId),
  index("comparisons_metric_idx").on(table.metric),
]);

export const insertBranchComparisonSchema = createInsertSchema(branchComparisons).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchComparison = z.infer<typeof insertBranchComparisonSchema>;
export type BranchComparison = typeof branchComparisons.$inferSelect;

// Trend Metrikler
export const trendMetrics = pgTable("trend_metrics", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => detailedReports.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  date: date("date").notNull(),
  value: numeric("value").notNull(),
  previousValue: numeric("previous_value"),
  changePercent: numeric("change_percent"),
  target: numeric("target"),
  status: varchar("status", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("trends_report_idx").on(table.reportId),
  index("trends_branch_idx").on(table.branchId),
  index("trends_metric_idx").on(table.metricName),
  index("trends_date_idx").on(table.date),
]);

export const insertTrendMetricSchema = createInsertSchema(trendMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertTrendMetric = z.infer<typeof insertTrendMetricSchema>;
export type TrendMetric = typeof trendMetrics.$inferSelect;

// AI Rapor Özeti
export const aiReportSummaries = pgTable("ai_report_summaries", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => detailedReports.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyFindings: jsonb("key_findings"),
  recommendations: jsonb("recommendations"),
  visualInsights: jsonb("visual_insights"),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("summaries_report_idx").on(table.reportId),
]);

export const insertAIReportSummarySchema = createInsertSchema(aiReportSummaries).omit({
  id: true,
  generatedAt: true,
});

export type InsertAIReportSummary = z.infer<typeof insertAIReportSummarySchema>;
export type AIReportSummary = typeof aiReportSummaries.$inferSelect;

// Resmi Tatiller
export const publicHolidays = pgTable("public_holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // Tatil adı
  date: date("date").notNull(), // Tatil tarihi
  year: integer("year").notNull(), // Yıl
  isHalfDay: boolean("is_half_day").default(false), // Yarım gün mü
  isActive: boolean("is_active").default(true), // Aktif mi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("public_holidays_date_idx").on(table.date),
  index("public_holidays_year_idx").on(table.year),
]);

export const insertPublicHolidaySchema = createInsertSchema(publicHolidays).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicHoliday = z.infer<typeof insertPublicHolidaySchema>;
export type PublicHoliday = typeof publicHolidays.$inferSelect;

// İzin Kayıtları (kullanılan izinler)
export const leaveRecords = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(), // Toplam gün sayısı
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  reason: text("reason"), // İzin nedeni
  approvedById: varchar("approved_by_id").references(() => users.id), // Onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leave_records_user_idx").on(table.userId),
  index("leave_records_date_idx").on(table.startDate),
  index("leave_records_status_idx").on(table.status),
]);

export const insertLeaveRecordSchema = createInsertSchema(leaveRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaveRecord = z.infer<typeof insertLeaveRecordSchema>;
export type LeaveRecord = typeof leaveRecords.$inferSelect;

// ========== MAAŞ YÖNETİMİ SİSTEMİ ==========

// Personel Maaş Bilgileri
export const employeeSalaries = pgTable("employee_salaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseSalary: integer("base_salary").notNull(), // Brüt maaş (kuruş cinsinden - 100 = 1 TL)
  netSalary: integer("net_salary"), // Net maaş
  employmentType: varchar("employment_type", { length: 20 }).notNull().default("fulltime"), // fulltime, parttime
  weeklyHours: integer("weekly_hours").notNull().default(45), // Haftalık çalışma saati (fulltime: 45, parttime: özel)
  hourlyRate: integer("hourly_rate"), // Saatlik ücret (part-time için)
  paymentDay: integer("payment_day").default(1), // Maaş ödeme günü (1-31)
  bankName: varchar("bank_name", { length: 100 }),
  iban: varchar("iban", { length: 34 }),
  taxRate: numeric("tax_rate").default("0"), // Vergi oranı
  insuranceRate: numeric("insurance_rate").default("0"), // SGK oranı
  effectiveFrom: date("effective_from").notNull(), // Geçerlilik başlangıcı
  effectiveTo: date("effective_to"), // Geçerlilik bitişi (null = aktif)
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_salaries_user_idx").on(table.userId),
  index("employee_salaries_active_idx").on(table.isActive),
  index("employee_salaries_effective_idx").on(table.effectiveFrom, table.effectiveTo),
]);

export const insertEmployeeSalarySchema = createInsertSchema(employeeSalaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeSalary = z.infer<typeof insertEmployeeSalarySchema>;
export type EmployeeSalary = typeof employeeSalaries.$inferSelect;

// Maaş Kesintileri Tanımları
export const salaryDeductionTypes = pgTable("salary_deduction_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // late_arrival, unpaid_leave, sick_leave_no_report, etc.
  name: varchar("name", { length: 100 }).notNull(), // Geç Kalma, Ücretsiz İzin, vb.
  description: text("description"),
  calculationType: varchar("calculation_type", { length: 20 }).notNull(), // fixed, hourly, daily, percentage
  defaultAmount: integer("default_amount"), // Sabit kesinti miktarı (kuruş)
  defaultPercentage: numeric("default_percentage"), // Yüzde bazlı kesinti
  perMinuteDeduction: integer("per_minute_deduction"), // Dakika başına kesinti (geç kalma için)
  perHourDeduction: integer("per_hour_deduction"), // Saat başına kesinti
  perDayDeduction: integer("per_day_deduction"), // Gün başına kesinti
  isAutomatic: boolean("is_automatic").default(true), // Otomatik hesaplanır mı
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("deduction_types_code_idx").on(table.code),
  index("deduction_types_active_idx").on(table.isActive),
]);

export const insertSalaryDeductionTypeSchema = createInsertSchema(salaryDeductionTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertSalaryDeductionType = z.infer<typeof insertSalaryDeductionTypeSchema>;
export type SalaryDeductionType = typeof salaryDeductionTypes.$inferSelect;

// Aylık Bordro
export const monthlyPayrolls = pgTable("monthly_payrolls", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  // Brüt hesaplamalar
  baseSalary: integer("base_salary").notNull(), // Brüt maaş
  workedDays: integer("worked_days").notNull().default(0), // Çalışılan gün
  workedHours: integer("worked_hours").notNull().default(0), // Çalışılan saat
  overtimeHours: integer("overtime_hours").default(0), // Fazla mesai saati
  overtimePay: integer("overtime_pay").default(0), // Fazla mesai ücreti
  // Kesintiler
  totalDeductions: integer("total_deductions").default(0), // Toplam kesinti
  lateDeductions: integer("late_deductions").default(0), // Geç kalma kesintisi
  absenceDeductions: integer("absence_deductions").default(0), // Devamsızlık kesintisi
  unpaidLeaveDeductions: integer("unpaid_leave_deductions").default(0), // Ücretsiz izin kesintisi
  sickLeaveDeductions: integer("sick_leave_deductions").default(0), // Raporlu izin kesintisi
  otherDeductions: integer("other_deductions").default(0), // Diğer kesintiler
  // Vergiler
  taxAmount: integer("tax_amount").default(0), // Gelir vergisi
  insuranceEmployee: integer("insurance_employee").default(0), // SGK işçi payı
  insuranceEmployer: integer("insurance_employer").default(0), // SGK işveren payı
  unemploymentInsurance: integer("unemployment_insurance").default(0), // İşsizlik sigortası
  // Sonuç
  grossSalary: integer("gross_salary").notNull(), // Brüt toplam
  netSalary: integer("net_salary").notNull(), // Net maaş
  // Durum
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, calculated, approved, paid
  calculatedAt: timestamp("calculated_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payrolls_user_idx").on(table.userId),
  index("payrolls_branch_idx").on(table.branchId),
  index("payrolls_period_idx").on(table.month, table.year),
  index("payrolls_status_idx").on(table.status),
  unique("payrolls_user_period_unique").on(table.userId, table.month, table.year),
]);

export const insertMonthlyPayrollSchema = createInsertSchema(monthlyPayrolls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyPayroll = z.infer<typeof insertMonthlyPayrollSchema>;
export type MonthlyPayroll = typeof monthlyPayrolls.$inferSelect;

// Uygulanan Maaş Kesintileri
export const salaryDeductions = pgTable("salary_deductions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  payrollId: integer("payroll_id").references(() => monthlyPayrolls.id, { onDelete: "cascade" }),
  deductionTypeId: integer("deduction_type_id").notNull().references(() => salaryDeductionTypes.id),
  amount: integer("amount").notNull(), // Kesinti miktarı (kuruş)
  reason: text("reason"), // Kesinti sebebi detayı
  referenceDate: date("reference_date").notNull(), // İlgili tarih
  referenceType: varchar("reference_type", { length: 50 }), // attendance, leave_request, manual
  referenceId: integer("reference_id"), // İlgili kaydın ID'si (shiftAttendance.id, leaveRequest.id vb.)
  lateMinutes: integer("late_minutes"), // Geç kalma dakikası
  absentHours: integer("absent_hours"), // Devamsızlık saati
  absentDays: integer("absent_days"), // Devamsızlık günü
  isAutomatic: boolean("is_automatic").default(true), // Otomatik mi manuel mi
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("salary_deductions_user_idx").on(table.userId),
  index("salary_deductions_payroll_idx").on(table.payrollId),
  index("salary_deductions_type_idx").on(table.deductionTypeId),
  index("salary_deductions_date_idx").on(table.referenceDate),
  index("salary_deductions_status_idx").on(table.status),
]);

export const insertSalaryDeductionSchema = createInsertSchema(salaryDeductions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalaryDeduction = z.infer<typeof insertSalaryDeductionSchema>;
export type SalaryDeduction = typeof salaryDeductions.$inferSelect;

// =====================================================
// BORDRO PARAMETRELERİ - Türkiye Mevzuatı
// =====================================================

// Bordro Parametreleri (Yıllık vergi dilimleri, SGK oranları, muafiyetler)
export const payrollParameters = pgTable("payroll_parameters", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(), // 2025, 2026, vb.
  effectiveFrom: date("effective_from").notNull(), // Yürürlük başlangıcı
  effectiveTo: date("effective_to"), // Yürürlük bitişi (null = aktif)
  isActive: boolean("is_active").default(true),
  
  // Asgari Ücret
  minimumWageGross: integer("minimum_wage_gross").notNull(), // Brüt asgari ücret (kuruş)
  minimumWageNet: integer("minimum_wage_net").notNull(), // Net asgari ücret (kuruş)
  
  // SGK Oranları (binde cinsinden - 140 = %14)
  sgkEmployeeRate: integer("sgk_employee_rate").notNull().default(140), // %14 - SGK işçi payı
  sgkEmployerRate: integer("sgk_employer_rate").notNull().default(205), // %20.5 - SGK işveren payı
  unemploymentEmployeeRate: integer("unemployment_employee_rate").notNull().default(10), // %1 - İşsizlik işçi
  unemploymentEmployerRate: integer("unemployment_employer_rate").notNull().default(20), // %2 - İşsizlik işveren
  
  // Damga Vergisi — 759 = binde 7.59 = %0.759 (÷100000 ile orana çevrilir)
  stampTaxRate: integer("stamp_tax_rate").notNull().default(759),
  
  // Gelir Vergisi Dilimleri (kuruş cinsinden)
  taxBracket1Limit: integer("tax_bracket_1_limit").notNull(), // İlk dilim üst sınırı
  taxBracket1Rate: integer("tax_bracket_1_rate").notNull().default(150), // %15
  taxBracket2Limit: integer("tax_bracket_2_limit").notNull(), // 2. dilim üst sınırı
  taxBracket2Rate: integer("tax_bracket_2_rate").notNull().default(200), // %20
  taxBracket3Limit: integer("tax_bracket_3_limit").notNull(), // 3. dilim üst sınırı
  taxBracket3Rate: integer("tax_bracket_3_rate").notNull().default(270), // %27
  taxBracket4Limit: integer("tax_bracket_4_limit").notNull(), // 4. dilim üst sınırı
  taxBracket4Rate: integer("tax_bracket_4_rate").notNull().default(350), // %35
  taxBracket5Rate: integer("tax_bracket_5_rate").notNull().default(400), // %40 (son dilim)
  
  // Yemek Parası Muafiyetleri (kuruş/gün)
  mealAllowanceTaxExemptDaily: integer("meal_allowance_tax_exempt_daily").notNull(), // Vergi muafiyeti günlük limit
  mealAllowanceSgkExemptDaily: integer("meal_allowance_sgk_exempt_daily").notNull(), // SGK muafiyeti günlük limit (nakit için)
  
  // Ulaşım Yardımı Muafiyeti (kuruş/gün)
  transportAllowanceExemptDaily: integer("transport_allowance_exempt_daily").default(0),
  
  // Diğer Parametreler
  workingDaysPerMonth: integer("working_days_per_month").default(30), // Aylık çalışma günü
  workingHoursPerDay: integer("working_hours_per_day").default(8), // Günlük çalışma saati
  overtimeMultiplier: numeric("overtime_multiplier").default("1.5"), // Fazla mesai çarpanı
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payroll_parameters_year_idx").on(table.year),
  index("payroll_parameters_active_idx").on(table.isActive),
  unique("payroll_parameters_year_effective_unique").on(table.year, table.effectiveFrom),
]);

export const insertPayrollParametersSchema = createInsertSchema(payrollParameters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollParameters = z.infer<typeof insertPayrollParametersSchema>;
export type PayrollParameters = typeof payrollParameters.$inferSelect;

// Çalışan Kümülatif Vergi Defteri (Yıl içi matrah takibi)
export const employeeTaxLedger = pgTable("employee_tax_ledger", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Aylık Değerler
  grossSalary: integer("gross_salary").notNull(), // Aylık brüt maaş
  sgkBase: integer("sgk_base").notNull(), // SGK matrahı
  taxBase: integer("tax_base").notNull(), // Gelir vergisi matrahı
  
  // Kümülatif Değerler (Ocak'tan itibaren toplam)
  cumulativeTaxBase: integer("cumulative_tax_base").notNull(), // Kümülatif vergi matrahı
  cumulativeIncomeTax: integer("cumulative_income_tax").notNull(), // Kümülatif gelir vergisi
  
  // Uygulanan Vergi Dilimi
  appliedTaxBracket: integer("applied_tax_bracket").notNull().default(1), // 1-5 arası
  
  // Asgari ücret istisnası
  minimumWageExemption: integer("minimum_wage_exemption").default(0), // Uygulanan istisna tutarı
  stampTaxExemption: integer("stamp_tax_exemption").default(0), // Damga vergisi istisnası
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_tax_ledger_user_idx").on(table.userId),
  index("employee_tax_ledger_year_idx").on(table.year),
  unique("employee_tax_ledger_user_year_month_unique").on(table.userId, table.year, table.month),
]);

export const insertEmployeeTaxLedgerSchema = createInsertSchema(employeeTaxLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeTaxLedger = z.infer<typeof insertEmployeeTaxLedgerSchema>;
export type EmployeeTaxLedger = typeof employeeTaxLedger.$inferSelect;

// Çalışan Yan Haklar (Yemek parası, ulaşım, prim vb.)
export const employeeBenefits = pgTable("employee_benefits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Yemek Yardımı
  mealBenefitType: varchar("meal_benefit_type", { length: 20 }).default("none"), // none, card, cash, workplace
  mealBenefitAmount: integer("meal_benefit_amount").default(0), // Günlük yemek parası (kuruş)
  
  // Ulaşım Yardımı
  transportBenefitType: varchar("transport_benefit_type", { length: 20 }).default("none"), // none, card, cash
  transportBenefitAmount: integer("transport_benefit_amount").default(0), // Günlük ulaşım parası (kuruş)
  
  // Prim/Bonus
  bonusEligible: boolean("bonus_eligible").default(true), // Prim hakkı var mı
  bonusPercentage: numeric("bonus_percentage").default("0"), // Sabit prim yüzdesi
  
  // Özel İndirimler
  disabilityDiscount: boolean("disability_discount").default(false), // Engelli indirimi
  disabilityDegree: integer("disability_degree"), // Engellilik derecesi (1-3)
  
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_benefits_user_idx").on(table.userId),
  index("employee_benefits_active_idx").on(table.isActive),
]);

export const insertEmployeeBenefitsSchema = createInsertSchema(employeeBenefits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeBenefits = z.infer<typeof insertEmployeeBenefitsSchema>;
export type EmployeeBenefits = typeof employeeBenefits.$inferSelect;

// ========================================
// PAYROLL RECORDS - Aylık Bordro Kayıtları
// ========================================

export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  
  // Dönem bilgisi
  periodYear: integer("period_year").notNull(), // 2024, 2025, etc.
  periodMonth: integer("period_month").notNull(), // 1-12
  
  // Temel maaş (kuruş cinsinden)
  baseSalary: integer("base_salary").notNull(), // Net baz maaş (kuruş)
  
  // Mesai hesaplamaları (kuruş)
  overtimeMinutes: integer("overtime_minutes").default(0), // Onaylanan toplam mesai dakikası
  overtimeRate: numeric("overtime_rate").default("1.5"), // Mesai çarpanı (1.5x normal, 2x tatil)
  overtimeAmount: integer("overtime_amount").default(0), // Mesai ücreti (kuruş)
  
  // Prim hesaplamaları (kuruş)
  bonusType: varchar("bonus_type", { length: 20 }).default("normal"), // kasa_primi, normal
  bonusBase: integer("bonus_base").default(0), // Prim matrahı (kuruş)
  bonusPercentage: numeric("bonus_percentage").default("0"), // Prim yüzdesi
  bonusAmount: integer("bonus_amount").default(0), // Hesaplanan prim (kuruş)
  
  // Eksik çalışma kesintisi (kuruş)
  undertimeMinutes: integer("undertime_minutes").default(0), // 45 saat altı çalışma dakikası
  undertimeDeduction: integer("undertime_deduction").default(0), // Primden kesilen tutar (kuruş)
  
  // Yan haklar (kuruş)
  mealAllowance: integer("meal_allowance").default(0), // Yemek yardımı
  transportAllowance: integer("transport_allowance").default(0), // Ulaşım yardımı
  
  // Ödenecek net maaş (kuruş)
  totalNetPayable: integer("total_net_payable").notNull(), // baseSalary + overtime + bonus - undertime + allowances
  
  // Brüt maaş ve kesintiler (kayıt amaçlı, kuruş)
  grossSalary: integer("gross_salary").default(0), // Hesaplanan brüt
  sgkEmployee: integer("sgk_employee").default(0), // SGK işçi payı
  sgkEmployer: integer("sgk_employer").default(0), // SGK işveren payı
  unemploymentEmployee: integer("unemployment_employee").default(0), // İşsizlik işçi
  unemploymentEmployer: integer("unemployment_employer").default(0), // İşsizlik işveren
  incomeTax: integer("income_tax").default(0), // Gelir vergisi
  stampTax: integer("stamp_tax").default(0), // Damga vergisi
  
  // Kümülatif vergi matrahı
  cumulativeTaxBase: integer("cumulative_tax_base").default(0), // Yıl başından bu aya kadar
  
  // Durum yönetimi
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, pending_approval, approved, paid
  
  // Onay bilgileri
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payroll_records_user_idx").on(table.userId),
  index("payroll_records_period_idx").on(table.periodYear, table.periodMonth),
  index("payroll_records_status_idx").on(table.status),
  unique("payroll_records_user_period_unique").on(table.userId, table.periodYear, table.periodMonth),
]);

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// ========================================
// TASK STEPS - Görev Adım Takibi
// ========================================

export const taskSteps = pgTable("task_steps", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  
  order: integer("order").notNull().default(0),
  
  claimedAt: timestamp("claimed_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("task_steps_task_idx").on(table.taskId),
  index("task_steps_author_idx").on(table.authorId),
  index("task_steps_order_idx").on(table.taskId, table.order),
]);

export const insertTaskStepSchema = createInsertSchema(taskSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskStep = z.infer<typeof insertTaskStepSchema>;
export type TaskStep = typeof taskSteps.$inferSelect;

// ========================================
// JOB TITLES - Ünvan Yönetimi
// ========================================

export const TitleScope = {
  HQ: "hq",
  FACTORY: "factory",
  BRANCH: "branch",
  ALL: "all",
} as const;

export type TitleScopeType = typeof TitleScope[keyof typeof TitleScope];

export const titles = pgTable("titles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  scope: varchar("scope", { length: 20 }).notNull().default("all"),
  isSystem: boolean("is_system").notNull().default(false),
  isDeletable: boolean("is_deletable").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("titles_scope_idx").on(table.scope),
]);

export const insertTitleSchema = createInsertSchema(titles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTitle = z.infer<typeof insertTitleSchema>;
export type Title = typeof titles.$inferSelect;
