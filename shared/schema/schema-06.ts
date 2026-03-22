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

import { Task, User, branches, equipment, users } from './schema-02';
import { careerLevels, examRequests } from './schema-05';

// User Career Progress - Her kullanıcının kariyer durumu
export const userCareerProgress = pgTable("user_career_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentCareerLevelId: integer("current_career_level_id").notNull().references(() => careerLevels.id),
  completedModuleIds: integer("completed_module_ids").array().default(sql`ARRAY[]::integer[]`),
  averageQuizScore: real("average_quiz_score").default(0),
  totalQuizzesAttempted: integer("total_quizzes_attempted").default(0),
  lastExamRequestId: integer("last_exam_request_id").references(() => examRequests.id),
  promotionEligibleAt: timestamp("promotion_eligible_at"),
  // Kompozit Kariyer Skoru Alanları
  trainingScore: real("training_score").default(0), // Eğitim skoru %25
  practicalScore: real("practical_score").default(0), // Pratik skor (checklist, task) %25
  attendanceScore: real("attendance_score").default(0), // Devam/dakiklik skoru %25
  managerScore: real("manager_score").default(0), // Yönetici değerlendirmesi %25
  compositeScore: real("composite_score").default(0), // Toplam kompozit skor
  // Tehlike bölgesi takibi
  dangerZoneMonths: integer("danger_zone_months").default(0), // Üst üste kaç ay %60 altında
  lastWarningDate: timestamp("last_warning_date"), // Son uyarı tarihi
  statusDemotedAt: timestamp("status_demoted_at"), // Düşürme tarihi
  statusDemotedFrom: integer("status_demoted_from"), // Hangi seviyeden düşürüldü
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_career_progress_user_idx").on(table.userId),
  index("user_career_progress_level_idx").on(table.currentCareerLevelId),
  index("user_career_progress_composite_score_idx").on(table.compositeScore),
]);

export const insertUserCareerProgressSchema = createInsertSchema(userCareerProgress).omit({
  id: true,
  lastUpdatedAt: true,
  createdAt: true,
});

export type InsertUserCareerProgress = z.infer<typeof insertUserCareerProgressSchema>;
export type UserCareerProgress = typeof userCareerProgress.$inferSelect;

// Manager Monthly Evaluations - Yönetici aylık personel değerlendirmesi
export const managerEvaluations = pgTable("manager_evaluations", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  evaluationMonth: varchar("evaluation_month", { length: 7 }).notNull(), // YYYY-MM format
  // Soft skill değerlendirmeleri (1-5 puan)
  customerServiceScore: integer("customer_service_score").default(3), // Müşteri hizmetleri
  teamworkScore: integer("teamwork_score").default(3), // Takım çalışması
  punctualityScore: integer("punctuality_score").default(3), // Dakiklik
  communicationScore: integer("communication_score").default(3), // İletişim
  initiativeScore: integer("initiative_score").default(3), // İnisiyatif alma
  cleanlinessScore: integer("cleanliness_score").default(3), // Temizlik/Düzen
  technicalSkillScore: integer("technical_skill_score").default(3), // Teknik beceri
  attitudeScore: integer("attitude_score").default(3), // Güler yüz/Tutum
  overallScore: real("overall_score").default(0), // Ortalama puan
  notes: text("notes"), // Ek notlar
  promotionRecommendation: varchar("promotion_recommendation", { length: 20 }).default("hold"), // promote, hold, demote
  warningIssued: boolean("warning_issued").default(false), // Uyarı verildi mi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("manager_evaluations_employee_idx").on(table.employeeId),
  index("manager_evaluations_month_idx").on(table.evaluationMonth),
  index("manager_evaluations_branch_idx").on(table.branchId),
]);

export const insertManagerEvaluationSchema = createInsertSchema(managerEvaluations).omit({
  id: true,
  overallScore: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManagerEvaluation = z.infer<typeof insertManagerEvaluationSchema>;
export type ManagerEvaluation = typeof managerEvaluations.$inferSelect;

// Career Score History - Kariyer skoru geçmişi (aylık)
export const careerScoreHistory = pgTable("career_score_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scoreMonth: varchar("score_month", { length: 7 }).notNull(), // YYYY-MM format
  trainingScore: real("training_score").default(0),
  practicalScore: real("practical_score").default(0),
  attendanceScore: real("attendance_score").default(0),
  managerScore: real("manager_score").default(0),
  compositeScore: real("composite_score").default(0),
  careerLevelId: integer("career_level_id").references(() => careerLevels.id),
  dangerZone: boolean("danger_zone").default(false), // O ay tehlike bölgesinde miydi
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("career_score_history_user_idx").on(table.userId),
  index("career_score_history_month_idx").on(table.scoreMonth),
]);

export const insertCareerScoreHistorySchema = createInsertSchema(careerScoreHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertCareerScoreHistory = z.infer<typeof insertCareerScoreHistorySchema>;
export type CareerScoreHistory = typeof careerScoreHistory.$inferSelect;

// Quiz Results - Sınav sonuçları ve leaderboard verileri
export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id", { length: 100 }).notNull(),
  score: integer("score").notNull(),
  answers: jsonb("answers"),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("quiz_results_user_idx").on(table.userId),
  index("quiz_results_score_idx").on(table.score),
]);

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

// ========================================
// QUIZ METADATA - Sınav Metaveri
// ========================================

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  quizId: varchar("quiz_id", { length: 100 }).notNull().unique(), // e.g., "espresso-101"
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  careerLevelId: integer("career_level_id").notNull().references(() => careerLevels.id),
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(30),
  passingScore: integer("passing_score").default(70),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quizzes_career_level_idx").on(table.careerLevelId),
  index("quizzes_difficulty_idx").on(table.difficulty),
]);

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

// ========================================
// BADGE SYSTEM - Başarı ve Rozetler
// ========================================

// Available Badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  badgeKey: varchar("badge_key", { length: 50 }).notNull().unique(), // first_quiz, top_10, expert_barista, etc
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  descriptionTr: text("description_tr"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  category: varchar("category", { length: 20 }).notNull(), // achievement, skill, milestone, leadership
  condition: jsonb("condition"), // {type: "quiz_score", minScore: 90, count: 3}
  points: integer("points").default(10), // Gamification points
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("badges_category_idx").on(table.category),
]);

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badge Progress
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0), // 0-100% toward badge
}, (table) => [
  index("user_badges_user_idx").on(table.userId),
  index("user_badges_badge_idx").on(table.badgeId),
  unique("user_badges_unique").on(table.userId, table.badgeId),
]);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ========================================
// BRANCH FEEDBACK SYSTEM - Şubelerden Geribildirim
// ========================================

export const branchFeedbacks = pgTable("branch_feedbacks", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "order", "invoice", "logistics", "other"
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("yeni"), // yeni, okundu, yanıtlandı
  response: text("response"),
  respondedById: varchar("responded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("branch_feedbacks_branch_idx").on(table.branchId),
  index("branch_feedbacks_status_idx").on(table.status),
  index("branch_feedbacks_created_idx").on(table.createdAt),
]);

export const insertBranchFeedbackSchema = createInsertSchema(branchFeedbacks).omit({
  id: true,
  createdAt: true,
  status: true,
  respondedAt: true,
});

export type InsertBranchFeedback = z.infer<typeof insertBranchFeedbackSchema>;
export type BranchFeedback = typeof branchFeedbacks.$inferSelect;

// ========================================
// LOST & FOUND SYSTEM - Kayıp Eşya Takibi
// ========================================

export const lostFoundStatusEnum = ["bulunan", "teslim_edildi"] as const;
export type LostFoundStatusType = typeof lostFoundStatusEnum[number];

export const lostFoundItems = pgTable("lost_found_items", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  foundById: varchar("found_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foundDate: date("found_date").notNull(),
  foundTime: time("found_time").notNull(),
  foundArea: varchar("found_area", { length: 100 }).notNull(),
  itemDescription: text("item_description").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("bulunan").notNull(),
  ownerName: varchar("owner_name", { length: 100 }),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  handoverDate: timestamp("handover_date"),
  handoveredById: varchar("handovered_by_id").references(() => users.id, { onDelete: "set null" }),
  handoverNotes: text("handover_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("lost_found_branch_idx").on(table.branchId),
  index("lost_found_status_idx").on(table.status),
  index("lost_found_found_date_idx").on(table.foundDate),
  index("lost_found_created_idx").on(table.createdAt),
]);

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  ownerName: true,
  ownerPhone: true,
  handoverDate: true,
  handoveredById: true,
  handoverNotes: true,
  branchId: true,
  foundById: true,
});

export const handoverLostFoundItemSchema = z.object({
  ownerName: z.string().min(2, "Sahip adı en az 2 karakter olmalı"),
  ownerPhone: z.string().min(10, "Telefon numarası geçersiz"),
  handoverNotes: z.string().optional(),
});

export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;
export type HandoverLostFoundItem = z.infer<typeof handoverLostFoundItemSchema>;
export type LostFoundItem = typeof lostFoundItems.$inferSelect;

// ========================================
// RECIPE MANAGEMENT SYSTEM - Reçete Yönetimi
// ========================================

// Recipe Categories (HOT, ICED, CREAMICE, FRESHESS, etc.)
export const recipeCategories = pgTable("recipe_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // hot, iced, creamice, freshess
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // Sıcak Kahve
  titleEn: varchar("title_en", { length: 100 }), // Hot Coffee
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  colorHex: varchar("color_hex", { length: 7 }), // #FF5733
  displayOrder: integer("display_order").default(0),
  bannerImageUrl: text("banner_image_url"), // Category banner
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recipe_categories_slug_idx").on(table.slug),
  index("recipe_categories_order_idx").on(table.displayOrder),
]);

export const insertRecipeCategorySchema = createInsertSchema(recipeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipeCategory = z.infer<typeof insertRecipeCategorySchema>;
export type RecipeCategory = typeof recipeCategories.$inferSelect;

// Recipes - Ana reçete tablosu
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => recipeCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(), // A, L, FW, BL, etc.
  nameTr: varchar("name_tr", { length: 150 }).notNull(), // Iced Americano
  nameEn: varchar("name_en", { length: 150 }), // Iced Americano
  description: text("description"),
  coffeeType: varchar("coffee_type", { length: 50 }), // espresso, filter, none
  hasCoffee: boolean("has_coffee").default(true),
  hasMilk: boolean("has_milk").default(false),
  difficulty: varchar("difficulty", { length: 20 }).default("easy"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(3),
  requiredRole: varchar("required_role", { length: 50 }), // Minimum rol gereksinimi
  photoUrl: text("photo_url"), // Reçete fotoğrafı
  infographicUrl: text("infographic_url"), // İnfografik / menü kart görseli
  marketingText: text("marketing_text"), // AI destekli pazarlama cümlesi
  salesTips: text("sales_tips"), // Satış dili ve stratejisi
  presentationNotes: text("presentation_notes"), // Sunum bilgileri
  storageConditions: text("storage_conditions"), // Saklama koşulları
  upsellingNotes: text("upselling_notes"), // Upselling önerileri (yan ürün)
  importantNotes: text("important_notes"), // Dikkat edilecek önemli bilgiler
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false), // Öne çıkan reçete
  displayOrder: integer("display_order").default(0),
  tags: varchar("tags", { length: 50 }).array(), // ["seasonal", "signature", "new"]
  subCategory: varchar("sub_category", { length: 20 }), // hot, iced, blend
  currentVersionId: integer("current_version_id"), // En güncel versiyon
  aiEmbedding: vector("ai_embedding"), // pgvector for AI search
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("recipes_category_idx").on(table.categoryId),
  index("recipes_code_idx").on(table.code),
  index("recipes_active_idx").on(table.isActive),
  unique("recipes_category_code_unique").on(table.categoryId, table.code),
]);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiEmbedding: true,
  currentVersionId: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// ========================================
// Size Recipe Type - Comprehensive recipe card structure
// ========================================
export type SizeRecipe = {
  cupMl: number;
  steps: string[];
  espresso?: string;
  concentrates?: Array<{ name: string; pumps: number; }>;
  milk?: { ml?: number; line?: string; type?: string; };
  water?: { ml?: number; line?: string; };
  syrups?: Record<string, number>;
  powders?: Record<string, number>;
  liquids?: Record<string, number>;
  garnish?: string[];
  toppings?: string[];
  ice?: string;
  lid?: string;
  equipment?: string[];
  blenderSetting?: string;
  servingNotes?: string;
};

// Recipe Versions - Versiyon takibi
export const recipeVersions = pgTable("recipe_versions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull().default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  updatedById: varchar("updated_by_id").references(() => users.id),
  changeLog: text("change_log"), // Değişiklik açıklaması
  changedFields: jsonb("changed_fields").$type<string[]>().default([]), // ["steps", "syrups"] - highlighted fields
  // Size variants
  sizes: jsonb("sizes").$type<{
    massivo?: SizeRecipe;
    longDiva?: SizeRecipe;
    camKupa?: SizeRecipe;
    porselenBardak?: SizeRecipe;
    [key: string]: SizeRecipe | undefined;
  }>(),
  // Common fields
  ingredients: jsonb("ingredients").$type<Array<{name: string; amount: string; unit?: string}>>().default([]),
  notes: text("notes"),
  cookingSteps: jsonb("cooking_steps").$type<string[]>().default([]),
  preparationNotes: text("preparation_notes"),
  servingInstructions: text("serving_instructions"),
  storageInfo: text("storage_info"),
  seasonInfo: varchar("season_info", { length: 100 }), // "Sonbahar-Kış sezon ürünü"
  isApproved: boolean("is_approved").default(false),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_versions_recipe_idx").on(table.recipeId),
  index("recipe_versions_version_idx").on(table.versionNumber),
  unique("recipe_versions_unique").on(table.recipeId, table.versionNumber),
]);

export const insertRecipeVersionSchema = createInsertSchema(recipeVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeVersion = z.infer<typeof insertRecipeVersionSchema>;
export type RecipeVersion = typeof recipeVersions.$inferSelect;

// Recipe Notifications - Güncelleme bildirimleri
export const recipeNotifications = pgTable("recipe_notifications", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionId: integer("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_notifications_user_idx").on(table.userId),
  index("recipe_notifications_recipe_idx").on(table.recipeId),
  unique("recipe_notifications_unique").on(table.recipeId, table.versionId, table.userId),
]);

export const insertRecipeNotificationSchema = createInsertSchema(recipeNotifications).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeNotification = z.infer<typeof insertRecipeNotificationSchema>;
export type RecipeNotification = typeof recipeNotifications.$inferSelect;

// ========================================
// GAMIFICATION EXTENSIONS - Oyunlaştırma
// ========================================

// Daily Missions - Günlük görevler
export const dailyMissions = pgTable("daily_missions", {
  id: serial("id").primaryKey(),
  missionKey: varchar("mission_key", { length: 50 }).notNull(), // learn_recipe, complete_quiz, etc.
  titleTr: varchar("title_tr", { length: 150 }).notNull(),
  descriptionTr: text("description_tr"),
  xpReward: integer("xp_reward").default(10),
  targetCount: integer("target_count").default(1), // Kaç kez yapılmalı
  missionType: varchar("mission_type", { length: 30 }).notNull(), // daily, weekly, special
  condition: jsonb("condition"), // {type: "quiz_complete", categoryId: 1}
  iconName: varchar("icon_name", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("daily_missions_type_idx").on(table.missionType),
  index("daily_missions_active_idx").on(table.isActive),
]);

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;

// User Mission Progress - Kullanıcı görev ilerlemesi
export const userMissionProgress = pgTable("user_mission_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull().references(() => dailyMissions.id, { onDelete: "cascade" }),
  currentCount: integer("current_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  xpEarned: integer("xp_earned").default(0),
  missionDate: date("mission_date").notNull(), // Hangi gün için
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_mission_progress_user_idx").on(table.userId),
  index("user_mission_progress_date_idx").on(table.missionDate),
  unique("user_mission_progress_unique").on(table.userId, table.missionId, table.missionDate),
]);

export const insertUserMissionProgressSchema = createInsertSchema(userMissionProgress).omit({
  id: true,
  createdAt: true,
});

export type InsertUserMissionProgress = z.infer<typeof insertUserMissionProgressSchema>;
export type UserMissionProgress = typeof userMissionProgress.$inferSelect;

// Leaderboard Snapshots - Liderlik tablosu anlık görüntüleri
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // weekly, monthly, all_time
  periodKey: varchar("period_key", { length: 20 }).notNull(), // 2025-W01, 2025-01
  totalXp: integer("total_xp").default(0),
  quizCount: integer("quiz_count").default(0),
  perfectQuizCount: integer("perfect_quiz_count").default(0),
  streakDays: integer("streak_days").default(0),
  rank: integer("rank"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leaderboard_snapshots_user_idx").on(table.userId),
  index("leaderboard_snapshots_period_idx").on(table.periodType, table.periodKey),
  index("leaderboard_snapshots_rank_idx").on(table.rank),
  unique("leaderboard_snapshots_unique").on(table.userId, table.periodType, table.periodKey),
]);

export const insertLeaderboardSnapshotSchema = createInsertSchema(leaderboardSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaderboardSnapshot = z.infer<typeof insertLeaderboardSnapshotSchema>;
export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;

// User Practice Sessions - Pratik oturum takibi
export const userPracticeSessions = pgTable("user_practice_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(),
  quizzesCompleted: integer("quizzes_completed").default(0),
  recipesViewed: integer("recipes_viewed").default(0),
  modulesCompleted: integer("modules_completed").default(0),
  xpEarned: integer("xp_earned").default(0),
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  streakDay: integer("streak_day").default(1), // Seri günü
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_practice_sessions_user_idx").on(table.userId),
  index("user_practice_sessions_date_idx").on(table.sessionDate),
  unique("user_practice_sessions_unique").on(table.userId, table.sessionDate),
]);

export const insertUserPracticeSessionSchema = createInsertSchema(userPracticeSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPracticeSession = z.infer<typeof insertUserPracticeSessionSchema>;
export type UserPracticeSession = typeof userPracticeSessions.$inferSelect;

export const learningStreaks = pgTable("learning_streaks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastActivityDate: date("last_activity_date"),
  totalActiveDays: integer("total_active_days").notNull().default(0),
  weeklyGoalTarget: integer("weekly_goal_target").notNull().default(5),
  weeklyGoalProgress: integer("weekly_goal_progress").notNull().default(0),
  monthlyXp: integer("monthly_xp").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("learning_streaks_user_idx").on(table.userId),
  unique("learning_streaks_user_unique").on(table.userId),
]);

export const insertLearningStreakSchema = createInsertSchema(learningStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningStreak = z.infer<typeof insertLearningStreakSchema>;
export type LearningStreak = typeof learningStreaks.$inferSelect;

// Academy Hub Categories - Akademi ana sayfa kategorileri
export const academyHubCategories = pgTable("academy_hub_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // career, recipes, general, practice
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  titleEn: varchar("title_en", { length: 100 }),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon
  colorHex: varchar("color_hex", { length: 7 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("academy_hub_categories_order_idx").on(table.displayOrder),
]);

export const insertAcademyHubCategorySchema = createInsertSchema(academyHubCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertAcademyHubCategory = z.infer<typeof insertAcademyHubCategorySchema>;
export type AcademyHubCategory = typeof academyHubCategories.$inferSelect;

// ========================================
// HQ PROJECT MANAGEMENT SYSTEM
// Proje yönetimi, görev atama, iş birliği
// ========================================

// Project Types
export const projectTypeEnum = ["standard", "new_shop"] as const;
export type ProjectTypeType = typeof projectTypeEnum[number];

// Projects - Ana proje tablosu
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  projectType: varchar("project_type", { length: 30 }).default("standard"), // standard, new_shop
  status: varchar("status", { length: 30 }).default("planning"), // planning, in_progress, completed, on_hold, cancelled
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }), // Yeni şube için oluşturulacak branch
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  // New Shop specific fields
  cityName: varchar("city_name", { length: 100 }), // Şube şehri
  locationAddress: text("location_address"), // Şube adresi
  estimatedBudget: integer("estimated_budget"), // Tahmini bütçe (TL)
  actualBudget: integer("actual_budget"), // Gerçekleşen bütçe (TL)
  franchiseeName: varchar("franchisee_name", { length: 200 }), // Bayi adı
  franchiseePhone: varchar("franchisee_phone", { length: 20 }),
  franchiseeEmail: varchar("franchisee_email", { length: 255 }),
  contractSignedAt: timestamp("contract_signed_at"), // Sözleşme imza tarihi
  targetOpeningDate: date("target_opening_date"), // Hedef açılış tarihi
  actualOpeningDate: date("actual_opening_date"), // Gerçek açılış tarihi
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("projects_owner_idx").on(table.ownerId),
  index("projects_status_idx").on(table.status),
  index("projects_active_idx").on(table.isActive),
  index("projects_type_idx").on(table.projectType),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project Members - Proje ekip üyeleri
// Roller: editor (düzenleme), contributor (görev ekleme), viewer (sadece görüntüleme), owner (tam yetki)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("contributor"), // owner, editor, contributor, viewer
  canManageTeam: boolean("can_manage_team").default(false), // Ekip yönetim yetkisi
  canDeleteTasks: boolean("can_delete_tasks").default(false), // Görev silme yetkisi
  joinedAt: timestamp("joined_at").defaultNow(),
  removedAt: timestamp("removed_at"),
}, (table) => [
  index("project_members_project_idx").on(table.projectId),
  index("project_members_user_idx").on(table.userId),
  unique("project_members_unique").on(table.projectId, table.userId),
]);

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  joinedAt: true,
  removedAt: true,
});

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Project Milestones - Kilometre taşları
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 30 }).default("pending"), // pending, in_progress, completed
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_milestones_project_idx").on(table.projectId),
  index("project_milestones_status_idx").on(table.status),
]);

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;

// Project Tasks - Proje görevleri (enhanced with subtask & milestone support)
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: integer("parent_task_id"), // Alt görev için üst görev ID'si
  milestoneId: integer("milestone_id").references(() => projectMilestones.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("todo"), // todo, in_progress, review, done
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_tasks_project_idx").on(table.projectId),
  index("project_tasks_assigned_idx").on(table.assignedToId),
  index("project_tasks_status_idx").on(table.status),
  index("project_tasks_parent_idx").on(table.parentTaskId),
  index("project_tasks_milestone_idx").on(table.milestoneId),
]);

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// Project Task Dependencies - Görev bağımlılıkları
export const projectTaskDependencies = pgTable("project_task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 30 }).default("finish_to_start"), // finish_to_start, start_to_start, finish_to_finish
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_dependencies_task_idx").on(table.taskId),
  index("task_dependencies_depends_on_idx").on(table.dependsOnTaskId),
  unique("task_dependencies_unique").on(table.taskId, table.dependsOnTaskId),
]);

export const insertProjectTaskDependencySchema = createInsertSchema(projectTaskDependencies).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectTaskDependency = z.infer<typeof insertProjectTaskDependencySchema>;
export type ProjectTaskDependency = typeof projectTaskDependencies.$inferSelect;

// Project Comments - Proje timeline/yorumları
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => projectTasks.id, { onDelete: "cascade" }), // null = project-level comment
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isSystemMessage: boolean("is_system_message").default(false), // For auto-generated activity logs
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_comments_project_idx").on(table.projectId),
  index("project_comments_task_idx").on(table.taskId),
  index("project_comments_user_idx").on(table.userId),
  index("project_comments_created_idx").on(table.createdAt),
]);

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;

// ========================================
// NEW SHOP OPENING - Yeni Şube Açılış Sistemi
// ========================================

// Project Phases - Proje Fazları (Yeni Şube için 7 ana faz)
export const projectPhaseTypeEnum = [
  "company_setup",      // Şirket Kurulum
  "contract_legal",     // Sözleşme & Hukuki
  "construction",       // İnşaat & Dekorasyon
  "equipment",          // Ekipman Yönetimi
  "payments",           // Ödemeler & Bütçe
  "staffing",           // Personel & İşe Alım
  "training_opening"    // Eğitim & Açılış
] as const;
export type ProjectPhaseType = typeof projectPhaseTypeEnum[number];

export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseType: varchar("phase_type", { length: 50 }).notNull(), // company_setup, contract_legal, construction, equipment, payments, staffing, training_opening
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("not_started"), // not_started, in_progress, completed, blocked
  progress: integer("progress").default(0), // 0-100 percentage
  orderIndex: integer("order_index").default(0),
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  isCustom: boolean("is_custom").default(false), // Özel eklenen faz mı?
  iconName: varchar("icon_name", { length: 50 }), // lucide icon name
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_phases_project_idx").on(table.projectId),
  index("project_phases_type_idx").on(table.phaseType),
  index("project_phases_status_idx").on(table.status),
]);

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

// Budget Categories for New Shop
export const budgetCategoryEnum = [
  "franchise_fee",      // Franchise Ücreti
  "rent_deposit",       // Kira & Depozito
  "construction",       // İnşaat
  "decoration",         // Dekorasyon
  "furniture",          // Mobilya
  "equipment",          // Ekipman
  "signage",            // Tabela & Reklam
  "permits",            // İzin & Ruhsat
  "staffing",           // Personel
  "training",           // Eğitim
  "marketing",          // Pazarlama
  "inventory",          // Stok
  "contingency",        // Beklenmedik Giderler
  "other"               // Diğer
] as const;
export type BudgetCategoryType = typeof budgetCategoryEnum[number];

// Project Budget Lines - Bütçe Kalemleri
export const projectBudgetLines = pgTable("project_budget_lines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  category: varchar("category", { length: 50 }).notNull(), // From budgetCategoryEnum
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  plannedAmount: integer("planned_amount").default(0), // TL
  actualAmount: integer("actual_amount").default(0), // TL
  paidAmount: integer("paid_amount").default(0), // Ödenen tutar
  paymentStatus: varchar("payment_status", { length: 30 }).default("pending"), // pending, partial, paid, overdue
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  vendorId: integer("vendor_id"), // Project vendor reference
  invoiceNo: varchar("invoice_no", { length: 100 }),
  notes: text("notes"),
  isContingency: boolean("is_contingency").default(false), // Acil durum tamponu mu?
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_budget_project_idx").on(table.projectId),
  index("project_budget_phase_idx").on(table.phaseId),
  index("project_budget_category_idx").on(table.category),
  index("project_budget_status_idx").on(table.paymentStatus),
]);

export const insertProjectBudgetLineSchema = createInsertSchema(projectBudgetLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectBudgetLine = z.infer<typeof insertProjectBudgetLineSchema>;
export type ProjectBudgetLine = typeof projectBudgetLines.$inferSelect;

// Vendor Types
export const vendorTypeEnum = [
  "contractor",         // Müteahhit
  "architect",          // Mimar
  "interior_designer",  // İç Mimar
  "furniture_supplier", // Mobilya Tedarikçisi
  "equipment_supplier", // Ekipman Tedarikçisi
  "signage_company",    // Tabela Firması
  "marketing_agency",   // Reklam Ajansı
  "legal_advisor",      // Hukuk Danışmanı
  "accountant",         // Mali Müşavir
  "consultant",         // Danışman
  "other"               // Diğer
] as const;
export type VendorType = typeof vendorTypeEnum[number];

// Project Vendors - Tedarikçi/Firma Yönetimi
export const projectVendors = pgTable("project_vendors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  vendorType: varchar("vendor_type", { length: 50 }).notNull(), // From vendorTypeEnum
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 50 }),
  contractStatus: varchar("contract_status", { length: 30 }).default("pending"), // pending, signed, completed, cancelled
  contractAmount: integer("contract_amount"), // TL
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  responsibilityArea: text("responsibility_area"), // Sorumluluk alanı açıklaması
  notes: text("notes"),
  rating: integer("rating"), // 1-5 performance rating
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_vendors_project_idx").on(table.projectId),
  index("project_vendors_type_idx").on(table.vendorType),
  index("project_vendors_status_idx").on(table.contractStatus),
]);

export const insertProjectVendorSchema = createInsertSchema(projectVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectVendor = z.infer<typeof insertProjectVendorSchema>;
export type ProjectVendor = typeof projectVendors.$inferSelect;

// Risk Severity Levels
export const riskSeverityEnum = ["low", "medium", "high", "critical"] as const;
export type RiskSeverityType = typeof riskSeverityEnum[number];

// Project Risks - Risk Yönetimi
export const projectRisks = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  probability: integer("probability").default(3), // 1-5 (1=düşük, 5=yüksek)
  impact: integer("impact").default(3), // 1-5 (1=düşük, 5=yüksek)
  severity: varchar("severity", { length: 20 }).default("medium"), // Calculated: low, medium, high, critical
  status: varchar("status", { length: 30 }).default("identified"), // identified, mitigating, resolved, occurred
  mitigationPlan: text("mitigation_plan"), // Risk azaltma planı
  contingencyPlan: text("contingency_plan"), // Alternatif plan
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  identifiedAt: timestamp("identified_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_risks_project_idx").on(table.projectId),
  index("project_risks_phase_idx").on(table.phaseId),
  index("project_risks_severity_idx").on(table.severity),
  index("project_risks_status_idx").on(table.status),
]);

export const insertProjectRiskSchema = createInsertSchema(projectRisks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectRisk = z.infer<typeof insertProjectRiskSchema>;
export type ProjectRisk = typeof projectRisks.$inferSelect;

// ========================================
// PHASE MANAGEMENT SYSTEM - Faz Yönetim Sistemi
// ========================================

// RACI Enum
export const raciRoleEnum = ["responsible", "accountable", "consulted", "informed"] as const;
export type RaciRoleType = typeof raciRoleEnum[number];

// Phase Assignments - Faz Ekip Atamaları (RACI)
export const phaseAssignments = pgTable("phase_assignments", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Internal user
  externalUserId: integer("external_user_id").references(() => externalUsers.id, { onDelete: "cascade" }), // External user
  raciRole: varchar("raci_role", { length: 20 }).notNull(), // responsible, accountable, consulted, informed
  canEditPhase: boolean("can_edit_phase").default(false),
  canManageTasks: boolean("can_manage_tasks").default(false),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("phase_assignments_phase_idx").on(table.phaseId),
  index("phase_assignments_user_idx").on(table.userId),
  index("phase_assignments_external_idx").on(table.externalUserId),
]);

export const insertPhaseAssignmentSchema = createInsertSchema(phaseAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertPhaseAssignment = z.infer<typeof insertPhaseAssignmentSchema>;
export type PhaseAssignment = typeof phaseAssignments.$inferSelect;

// Sub Task Status
export const subTaskStatusEnum = ["not_started", "in_progress", "blocked", "done"] as const;
export type SubTaskStatusType = typeof subTaskStatusEnum[number];

// Phase Sub Tasks - Faz Alt Görevleri
export const phaseSubTasks = pgTable("phase_sub_tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // Self-reference for nested categories - will add .references in table config
  isCategory: boolean("is_category").default(false), // True if this is a category, false if task
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("not_started"),
  sortOrder: integer("sort_order").default(0),
  dueDate: date("due_date"),
  assigneeUserId: varchar("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
  assigneeExternalId: integer("assignee_external_id").references(() => externalUsers.id, { onDelete: "set null" }),
  requiresBidding: boolean("requires_bidding").default(false), // Teklif gerektirir mi?
  completedAt: timestamp("completed_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("phase_sub_tasks_phase_idx").on(table.phaseId),
  index("phase_sub_tasks_parent_idx").on(table.parentId),
  index("phase_sub_tasks_status_idx").on(table.status),
]);

export const insertPhaseSubTaskSchema = createInsertSchema(phaseSubTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertPhaseSubTask = z.infer<typeof insertPhaseSubTaskSchema>;
export type PhaseSubTask = typeof phaseSubTasks.$inferSelect;

// Procurement Status
export const procurementStatusEnum = ["draft", "open", "under_review", "awarded", "closed", "cancelled"] as const;
export type ProcurementStatusType = typeof procurementStatusEnum[number];

// Procurement Items - Tedarik Kalemleri
export const procurementItems = pgTable("procurement_items", {
  id: serial("id").primaryKey(),
  subTaskId: integer("sub_task_id").notNull().references(() => phaseSubTasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  specifications: text("specifications"), // Teknik özellikler
  quantity: integer("quantity").default(1),
  unit: varchar("unit", { length: 50 }), // adet, kg, metre vb.
  estimatedBudget: integer("estimated_budget"), // TL
  status: varchar("status", { length: 30 }).default("draft"),
  biddingDeadline: timestamp("bidding_deadline"),
  selectedProposalId: integer("selected_proposal_id"), // Will reference proposals
  awardedAt: timestamp("awarded_at"),
  awardedById: varchar("awarded_by_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_items_subtask_idx").on(table.subTaskId),
  index("procurement_items_status_idx").on(table.status),
]);

export const insertProcurementItemSchema = createInsertSchema(procurementItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  awardedAt: true,
});

export type InsertProcurementItem = z.infer<typeof insertProcurementItemSchema>;
export type ProcurementItem = typeof procurementItems.$inferSelect;

// Proposal Status
export const proposalStatusEnum = ["submitted", "under_review", "selected", "rejected", "withdrawn"] as const;
export type ProposalStatusType = typeof proposalStatusEnum[number];

// Procurement Proposals - Teklifler
export const procurementProposals = pgTable("procurement_proposals", {
  id: serial("id").primaryKey(),
  procurementItemId: integer("procurement_item_id").notNull().references(() => procurementItems.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => externalUsers.id, { onDelete: "set null" }), // External vendor
  vendorName: varchar("vendor_name", { length: 200 }), // If no external user record
  vendorPhone: varchar("vendor_phone", { length: 30 }),
  vendorEmail: varchar("vendor_email", { length: 255 }),
  vendorCompany: varchar("vendor_company", { length: 200 }),
  proposedPrice: integer("proposed_price").notNull(), // TL
  currency: varchar("currency", { length: 10 }).default("TRY"),
  deliveryDays: integer("delivery_days"), // Teslimat süresi (gün)
  warrantyMonths: integer("warranty_months"), // Garanti süresi (ay)
  specifications: text("specifications"), // Teklif detayları
  notes: text("notes"),
  attachmentUrls: text("attachment_urls").array(), // Teklif dosyaları
  status: varchar("status", { length: 30 }).default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_proposals_item_idx").on(table.procurementItemId),
  index("procurement_proposals_vendor_idx").on(table.vendorId),
  index("procurement_proposals_status_idx").on(table.status),
]);

export const insertProcurementProposalSchema = createInsertSchema(procurementProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
});

export type InsertProcurementProposal = z.infer<typeof insertProcurementProposalSchema>;
export type ProcurementProposal = typeof procurementProposals.$inferSelect;

// ========================================
// EXTERNAL USERS - Dış Kullanıcı Erişim Sistemi
// ========================================

// External Users - Proje bazlı dış kullanıcılar (mimar, müteahhit vb.)
export const externalUsers = pgTable("external_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  companyName: varchar("company_name", { length: 200 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  specialty: varchar("specialty", { length: 100 }), // Mobilyacı, Mimar, Elektrikçi, Avukat vb.
  accessToken: varchar("access_token", { length: 255 }), // Magic link token
  tokenExpiresAt: timestamp("token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  invitedById: varchar("invited_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("external_users_email_idx").on(table.email),
  index("external_users_token_idx").on(table.accessToken),
]);

export const insertExternalUserSchema = createInsertSchema(externalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExternalUser = z.infer<typeof insertExternalUserSchema>;
export type ExternalUser = typeof externalUsers.$inferSelect;

// External User Project Access - Dış kullanıcıların proje erişimleri
export const externalUserProjects = pgTable("external_user_projects", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("viewer"), // viewer, contributor
  canViewBudget: boolean("can_view_budget").default(false),
  canViewTasks: boolean("can_view_tasks").default(true),
  canComment: boolean("can_comment").default(true),
  canUploadFiles: boolean("can_upload_files").default(false),
  grantedById: varchar("granted_by_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null = no expiration
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("external_user_projects_user_idx").on(table.externalUserId),
  index("external_user_projects_project_idx").on(table.projectId),
  unique("external_user_projects_unique").on(table.externalUserId, table.projectId),
]);

export const insertExternalUserProjectSchema = createInsertSchema(externalUserProjects).omit({
  id: true,
  grantedAt: true,
});

export type InsertExternalUserProject = z.infer<typeof insertExternalUserProjectSchema>;
export type ExternalUserProject = typeof externalUserProjects.$inferSelect;
