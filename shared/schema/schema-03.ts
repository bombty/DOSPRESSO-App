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

import {
  Equipment,
  User,
  branches,
  checklistTasks,
  checklists,
  equipment,
  equipmentFaults,
  tasks,
  users
} from './schema-02';

// Fault Stage Transitions table (audit log for stage changes)
export const faultStageTransitions = pgTable("fault_stage_transitions", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  fromStage: varchar("from_stage", { length: 50 }), // null for initial creation
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertFaultStageTransitionSchema = createInsertSchema(faultStageTransitions).omit({
  id: true,
  changedAt: true,
});

export type InsertFaultStageTransition = z.infer<typeof insertFaultStageTransitionSchema>;
export type FaultStageTransition = typeof faultStageTransitions.$inferSelect;

export const faultComments = pgTable("fault_comments", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fault_comments_fault_idx").on(table.faultId),
]);

export const insertFaultCommentSchema = createInsertSchema(faultComments).omit({
  id: true,
  createdAt: true,
});

export type InsertFaultComment = z.infer<typeof insertFaultCommentSchema>;
export type FaultComment = typeof faultComments.$inferSelect;

// Knowledge Base Articles table
export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // recipe, procedure, training (legacy: sop, maintenance)
  content: text("content").notNull(),
  tags: text("tags").array(),
  attachmentUrls: text("attachment_urls").array(),
  equipmentTypeId: varchar("equipment_type_id", { length: 100 }), // Links article to equipment type (e.g., 'espresso_machine', 'grinder')
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseArticle = z.infer<typeof insertKnowledgeBaseArticleSchema>;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;

// Knowledge Base Embeddings table (for RAG/semantic search)
export const knowledgeBaseEmbeddings = pgTable("knowledge_base_embeddings", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(), // For ordering chunks within an article
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kb_embeddings_article_idx").on(table.articleId),
]);

export const insertKnowledgeBaseEmbeddingSchema = createInsertSchema(knowledgeBaseEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseEmbedding = z.infer<typeof insertKnowledgeBaseEmbeddingSchema>;
export type KnowledgeBaseEmbedding = typeof knowledgeBaseEmbeddings.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Performance Metrics table
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksTotal: integer("tasks_total").default(0),
  completionRate: integer("completion_rate").default(0), // percentage
  averageAiScore: integer("average_ai_score").default(0),
  taskScore: integer("task_score").default(0), // 0-100 (task completion rate)
  photoScore: integer("photo_score").default(0), // 0-100 (AI photo analysis average)
  timeScore: integer("time_score").default(0), // 0-100 (on-time completion rate)
  supervisorScore: integer("supervisor_score").default(0), // 0-100 (manual supervisor rating)
  totalScore: integer("total_score").default(0), // Weighted: task 40% + photo 25% + time 25% + supervisor 10%
  faultsReported: integer("faults_reported").default(0),
  faultsResolved: integer("faults_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("performance_metrics_branch_date_idx").on(table.branchId, table.date),
  userDateIdx: index("performance_metrics_user_date_idx").on(table.userId, table.date),
  ownershipCheck: check("ownership_check", sql`branch_id IS NOT NULL OR user_id IS NOT NULL`),
}));

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
  totalScore: true, // Calculated field
}).refine(
  (data) => data.branchId !== undefined || data.userId !== undefined,
  { message: "Either branchId or userId must be provided" }
).refine(
  (data) => {
    const scores = [data.taskScore, data.photoScore, data.timeScore, data.supervisorScore];
    return scores.every(s => s === undefined || s === null || (s >= 0 && s <= 100));
  },
  { message: "All scores must be between 0 and 100" }
);

export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;

// ========================================
// TRAINING SYSTEM TABLES
// ========================================

// Training Modules (e.g., "Espresso Basics", "Latte Art", "Customer Service")
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }), // e.g., "S1", "BB2", for JSON mapping
  slug: varchar("slug", { length: 100 }), // URL-friendly slug
  category: varchar("category", { length: 100 }), // "barista", "supervisor", "hygiene", etc.
  moduleType: varchar("module_type", { length: 50 }).default("skill"), // skill, recipe, onboarding, general
  scope: varchar("scope", { length: 20 }).default("branch"), // branch, factory, both
  recipeCategoryId: integer("recipe_category_id"), // Link to recipe_categories for recipe modules
  level: varchar("level", { length: 50 }).default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").default(30), // minutes
  isPublished: boolean("is_published").default(false),
  /** @deprecated use isMandatory instead */
  isRequired: boolean("is_required").default(false),
  requiredForRole: varchar("required_for_role", { length: 100 }).array(), // ["barista", "supervisor"]
  prerequisiteModuleIds: integer("prerequisite_module_ids").array(), // Must complete these first
  heroImageUrl: text("hero_image_url"), // Module banner image
  galleryImages: jsonb("gallery_images").$type<Array<{url: string; alt?: string; uploadedAt: number}>>().default([]), // Module gallery images (optimized)
  learningObjectives: jsonb("learning_objectives").$type<string[]>().default([]), // ["Objective 1", "Objective 2"]
  steps: jsonb("steps").$type<Array<{stepNumber: number; title: string; content: string; mediaSuggestions?: string[]}>>().default([]),
  scenarioTasks: jsonb("scenario_tasks").$type<Array<{scenarioId: string; title: string; description: string; expectedActions: string[]}>>().default([]),
  supervisorChecklist: jsonb("supervisor_checklist").$type<string[]>().default([]), // Supervisor review items
  quiz: jsonb("quiz").$type<Array<{questionId: string; questionType: string; questionText: string; options: string[]; correctOptionIndex: number}>>().default([]), // Quiz questions
  tags: varchar("tags", { length: 100 }).array(), // ["kültür", "disiplin", "stajyer"]
  generatedByAi: boolean("generated_by_ai").default(false), // AI generation metadata
  xpReward: integer("xp_reward").default(50), // XP points for completing module
  mainVideoUrl: text("main_video_url"), // Primary video URL (YouTube/S3)
  mindmapData: jsonb("mindmap_data").$type<{nodes: {id: string; label: string; level: number}[]; edges: {source: string; target: string}[]}>(), // AI-generated knowledge map
  aiSummary: text("ai_summary"), // AI-generated module summary
  examPassingScore: integer("exam_passing_score").default(70), // Passing score for final exam
  maxRetries: integer("max_retries").default(3), // Max exam retry attempts
  isActive: boolean("is_active").default(true), // Active/inactive status
  
  // AI Satış Koçu & Pazarlama Desteği
  salesTips: jsonb("sales_tips").$type<Array<{phrase: string; context: string; emotion?: string}>>().default([]), // AI-generated sales phrases
  presentationGuide: jsonb("presentation_guide").$type<{
    servingInstructions: string; // Sunum talimatları
    thawingInstructions?: string; // Çözündürme talimatları (donuk ürünler için)
    heatingInstructions?: string; // Isıtma talimatları
    platingTips?: string; // Tabak düzenleme ipuçları
    storageNotes?: string; // Saklama notları
    allergenInfo?: string; // Alerjen bilgisi
  }>(), // Profesyonel sunum rehberi
  marketingContent: jsonb("marketing_content").$type<{
    socialMediaCaptions?: string[]; // Sosyal medya açıklamaları
    upsellingPhrases?: string[]; // Upselling önerileri
    customerQA?: Array<{question: string; answer: string}>; // Müşteri S&C
    productStory?: string; // Ürün hikayesi
    targetAudience?: string; // Hedef kitle
  }>(), // Pazarlama içerikleri
  aiRoleplayScenarios: jsonb("ai_roleplay_scenarios").$type<Array<{
    scenarioId: string;
    title: string;
    customerType: string; // "meraklı", "kararsız", "aceleci", "şikayetçi"
    initialMessage: string;
    expectedResponses: string[];
    tips: string[];
  }>>().default([]), // AI Rol Yapma Senaryoları
  
  targetRoles: text("target_roles").array().default(sql`'{}'::text[]`),
  isMandatory: boolean("is_mandatory").notNull().default(false),
  deadlineDays: integer("deadline_days"),
  status: varchar("status", { length: 20 }).default("approved"),
  rejectionReason: text("rejection_reason"),
  createdBy: varchar("created_by").references(() => users.id), // VARCHAR - users.id is UUID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Module Media (Images, videos, documents)
export const moduleMedia = pgTable("module_media", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  mediaType: varchar("media_type", { length: 50 }).notNull(), // "image", "video", "pdf", "document"
  objectKey: text("object_key").notNull(), // Cloud storage object key
  url: text("url").notNull(), // Public/signed URL
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Videos
export const moduleVideos = pgTable("module_videos", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(), // S3 URL or YouTube embed
  duration: integer("duration").default(0), // seconds
  orderIndex: integer("order_index").default(0),
  transcript: text("transcript"), // For AI assistant context
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Lessons (Step-by-step content)
export const moduleLessons = pgTable("module_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text content (Markdown or HTML)
  orderIndex: integer("order_index").default(0),
  estimatedDuration: integer("estimated_duration").default(5), // minutes
  lessonType: varchar("lesson_type", { length: 50 }).default("reading"), // reading, video, interactive, practice
  videoUrl: text("video_url"), // Optional embedded video
  imageUrl: text("image_url"), // Optional image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Module Quizzes
export const moduleQuizzes = pgTable("module_quizzes", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: integer("passing_score").default(70), // percentage
  timeLimit: integer("time_limit"), // minutes, null = unlimited
  isExam: boolean("is_exam").default(false), // Requires supervisor approval
  randomizeQuestions: boolean("randomize_questions").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz Questions
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  careerQuizId: integer("career_quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { length: 50 }).default("multiple_choice"), // multiple_choice, true_false, short_answer
  options: text("options").array(), // JSON array for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  correctAnswerIndex: integer("correct_answer_index").default(0),
  explanation: text("explanation"),
  points: integer("points").default(1),
  reviewStatus: varchar("review_status", { length: 20 }).default("manual"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards (AI-generated and cached for cost optimization)
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  front: text("front").notNull(), // Question/term
  back: text("back").notNull(), // Answer/definition
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 50 }).default("medium"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Training Progress
export const userTrainingProgress = pgTable("user_training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("not_started"), // not_started, in_progress, completed
  progressPercentage: integer("progress_percentage").default(0),
  videosWatched: integer("videos_watched").array().default([]), // Array of video IDs
  lastAccessedAt: timestamp("last_accessed_at"),
  completedAt: timestamp("completed_at"),
  certificateIssued: boolean("certificate_issued").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for upsert on (userId, moduleId)
  uniqueUserModule: uniqueIndex("user_training_progress_user_module_idx").on(table.userId, table.moduleId),
}));

// User Quiz Attempts
export const userQuizAttempts = pgTable("user_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  quizId: integer("quiz_id").notNull().references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  score: integer("score").default(0), // percentage
  answers: text("answers"), // JSON storing question_id -> user_answer
  isPassed: boolean("is_passed").default(false),
  timeSpent: integer("time_spent"), // seconds
  attemptNumber: integer("attempt_number").default(1),
  isExamAttempt: boolean("is_exam_attempt").default(false),
  approvedBy: varchar("approved_by").references(() => users.id), // VARCHAR - Supervisor/coach approval
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending, approved, rejected
  feedback: text("feedback"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertModuleMediaSchema = createInsertSchema(moduleMedia).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleVideoSchema = createInsertSchema(moduleVideos).omit({
  id: true,
  createdAt: true,
});

export const insertModuleLessonSchema = createInsertSchema(moduleLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleQuizSchema = createInsertSchema(moduleQuizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertUserTrainingProgressSchema = createInsertSchema(userTrainingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserQuizAttemptSchema = createInsertSchema(userQuizAttempts).omit({
  id: true,
  startedAt: true,
});

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertModuleMedia = z.infer<typeof insertModuleMediaSchema>;
export type ModuleMedia = typeof moduleMedia.$inferSelect;
export type InsertModuleVideo = z.infer<typeof insertModuleVideoSchema>;
export type ModuleVideo = typeof moduleVideos.$inferSelect;
export type InsertModuleLesson = z.infer<typeof insertModuleLessonSchema>;
export type ModuleLesson = typeof moduleLessons.$inferSelect;
export type InsertModuleQuiz = z.infer<typeof insertModuleQuizSchema>;
export type ModuleQuiz = typeof moduleQuizzes.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertUserTrainingProgress = z.infer<typeof insertUserTrainingProgressSchema>;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;
export type InsertUserQuizAttempt = z.infer<typeof insertUserQuizAttemptSchema>;
export type UserQuizAttempt = typeof userQuizAttempts.$inferSelect;

// Messages table - Inter-user and system messaging with thread support
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(), // Group messages into conversations
  parentMessageId: integer("parent_message_id").references((): any => messages.id), // For reply chains
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // null for role-based broadcast
  recipientRole: varchar("recipient_role", { length: 50 }), // null for specific user messages
  subject: text("subject"),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).default("direct"), // task_assignment, hq_message, branch_message, notification, direct
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for fast inbox queries
  recipientIdx: index("messages_recipient_idx").on(table.recipientId),
  recipientRoleIdx: index("messages_recipient_role_idx").on(table.recipientRole),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  threadIdx: index("messages_thread_idx").on(table.threadId),
  createdIdx: index("messages_created_idx").on(table.createdAt),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Thread Participants - Track users in each conversation thread
export const threadParticipants = pgTable("thread_participants", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  threadUserIdx: uniqueIndex("thread_participants_thread_user_idx").on(table.threadId, table.userId),
}));

export const insertThreadParticipantSchema = createInsertSchema(threadParticipants).omit({
  id: true,
  createdAt: true,
});

export type InsertThreadParticipant = z.infer<typeof insertThreadParticipantSchema>;
export type ThreadParticipant = typeof threadParticipants.$inferSelect;

// Message Reads - Junction table for tracking read status per user (supports broadcasts)
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMessage: uniqueIndex("message_reads_user_message_idx").on(table.messageId, table.userId),
}));

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  readAt: true,
});

export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type MessageRead = typeof messageReads.$inferSelect;

// Equipment Maintenance Logs table
export const equipmentMaintenanceLogs = pgTable("equipment_maintenance_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedBy: varchar("performed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  nextScheduledDate: date("next_scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentMaintenanceLogSchema = createInsertSchema(equipmentMaintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentMaintenanceLog = z.infer<typeof insertEquipmentMaintenanceLogSchema>;
export type EquipmentMaintenanceLog = typeof equipmentMaintenanceLogs.$inferSelect;

// Equipment Comments table
export const equipmentComments = pgTable("equipment_comments", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentCommentSchema = createInsertSchema(equipmentComments).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentComment = z.infer<typeof insertEquipmentCommentSchema>;
export type EquipmentComment = typeof equipmentComments.$inferSelect;

// Equipment Service Request Status enum
export const SERVICE_REQUEST_STATUS = {
  CREATED: 'created',
  SERVICE_CALLED: 'service_called',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  NOT_FIXED: 'not_fixed',
  WARRANTY_CLAIMED: 'warranty_claimed',
  DEVICE_SHIPPED: 'device_shipped',
  CLOSED: 'closed',
} as const;

export type ServiceRequestStatusType = typeof SERVICE_REQUEST_STATUS[keyof typeof SERVICE_REQUEST_STATUS];

// Service Decision enum
export const SERVICE_DECISION = {
  HQ: 'hq',
  BRANCH: 'branch',
} as const;

export type ServiceDecisionType = typeof SERVICE_DECISION[keyof typeof SERVICE_DECISION];

// Equipment Service Requests table
export const equipmentServiceRequests = pgTable("equipment_service_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  faultId: integer("fault_id").references(() => equipmentFaults.id, { onDelete: "set null" }),
  serviceDecision: varchar("service_decision", { length: 20 }).notNull(),
  serviceProvider: text("service_provider"),
  contactInfo: text("contact_info"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default(SERVICE_REQUEST_STATUS.CREATED),
  timeline: jsonb("timeline").$type<Array<{
    id: string;
    timestamp: string;
    status: ServiceRequestStatusType;
    actorId: string;
    notes?: string;
    meta?: Record<string, any>;
  }>>().default([]),
  photo1Url: text("photo1_url"),
  photo2Url: text("photo2_url"),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  equipmentIdx: index("equipment_service_requests_equipment_idx").on(table.equipmentId),
  statusIdx: index("equipment_service_requests_status_idx").on(table.status),
  faultIdx: index("equipment_service_requests_fault_idx").on(table.faultId),
}));

export const insertEquipmentServiceRequestSchema = createInsertSchema(equipmentServiceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  timeline: true,
});

export type InsertEquipmentServiceRequest = z.infer<typeof insertEquipmentServiceRequestSchema>;
export type EquipmentServiceRequest = typeof equipmentServiceRequests.$inferSelect;

// Relations (defined after all tables to avoid temporal dead zone)
// HQ Support Ticket Status
export const HQ_SUPPORT_STATUS = {
  AKTIF: 'aktif',
  KAPATILDI: 'kapatildi',
} as const;

export type HQSupportStatusType = typeof HQ_SUPPORT_STATUS[keyof typeof HQ_SUPPORT_STATUS];

// HQ Support Category (which HQ department)
export const HQ_SUPPORT_CATEGORY = {
  ARIZA: 'ariza',           // Equipment/machine issues
  TEKNIK: 'teknik',         // Technical support
  MUHASEBE: 'muhasebe',     // Accounting/finance
  LOJISTIK: 'lojistik',     // Logistics/supply chain
  FABRIKA: 'fabrika',       // Factory/production
  URUN_URETIM: 'urun_uretim', // Product/production
  SATINALMA: 'satinalma',   // Purchasing
  COACH: 'coach',           // Training/coaching
  DESTEK: 'destek',         // General support
  GENEL: 'genel',           // General inquiries
  IT_DESTEK: 'it_destek',   // IT support (software/program requests) - routes to admin
} as const;

export type HQSupportCategoryType = typeof HQ_SUPPORT_CATEGORY[keyof typeof HQ_SUPPORT_CATEGORY];

// Support ticket priority
export const TICKET_PRIORITY = {
  DUSUK: 'dusuk',
  NORMAL: 'normal',
  YUKSEK: 'yuksek',
  ACIL: 'acil',
} as const;

export type TicketPriorityType = typeof TICKET_PRIORITY[keyof typeof TICKET_PRIORITY];

// HQ Support Tickets table
export const hqSupportTickets = pgTable("hq_support_tickets", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default(TICKET_PRIORITY.NORMAL),
  status: varchar("status", { length: 20 }).notNull().default(HQ_SUPPORT_STATUS.AKTIF),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hq_support_tickets_branch_idx").on(table.branchId),
  index("hq_support_tickets_category_idx").on(table.category),
  index("hq_support_tickets_status_idx").on(table.status),
  index("hq_support_tickets_priority_idx").on(table.priority),
  index("hq_support_tickets_assigned_idx").on(table.assignedToId),
]);

export const insertHQSupportTicketSchema = createInsertSchema(hqSupportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHQSupportTicket = z.infer<typeof insertHQSupportTicketSchema>;
export type HQSupportTicket = typeof hqSupportTickets.$inferSelect;

// HQ Support Messages table (with attachments support)
export const hqSupportMessages = pgTable("hq_support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ticketCreatedIdx: index("hq_support_messages_ticket_created_idx").on(table.ticketId, table.createdAt),
}));

export const insertHQSupportMessageSchema = createInsertSchema(hqSupportMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportMessage = z.infer<typeof insertHQSupportMessageSchema>;
export type HQSupportMessage = typeof hqSupportMessages.$inferSelect;

// Ticket activity log for timeline tracking
export const ticketActivityLogs = pgTable("ticket_activity_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_activity_logs_ticket_idx").on(table.ticketId),
  index("ticket_activity_logs_created_idx").on(table.createdAt),
]);

export const insertTicketActivityLogSchema = createInsertSchema(ticketActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketActivityLog = z.infer<typeof insertTicketActivityLogSchema>;
export type TicketActivityLog = typeof ticketActivityLogs.$inferSelect;

// HQ Support Category Assignments - Which HQ users can view which ticket categories
export const hqSupportCategoryAssignments = pgTable("hq_support_category_assignments", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canAssign: boolean("can_assign").default(false),
  canClose: boolean("can_close").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("hq_support_cat_assign_category_idx").on(table.category),
  index("hq_support_cat_assign_user_idx").on(table.userId),
  unique("hq_support_cat_assign_unique").on(table.category, table.userId),
]);

export const insertHQSupportCategoryAssignmentSchema = createInsertSchema(hqSupportCategoryAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportCategoryAssignment = z.infer<typeof insertHQSupportCategoryAssignmentSchema>;
export type HQSupportCategoryAssignment = typeof hqSupportCategoryAssignments.$inferSelect;

// Notification types enum
export const NotificationType = {
  TASK_ASSIGNED: "task_assigned",
  TASK_COMPLETE: "task_complete",
  FAULT_REPORTED: "fault_reported",
  FAULT_RESOLVED: "fault_resolved",
  TRAINING_ASSIGNED: "training_assigned",
  ANNOUNCEMENT: "announcement",
  SYSTEM: "system",
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

// Notifications table - User-specific notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userReadCreatedIdx: index("notifications_user_read_created_idx").on(table.userId, table.isRead, table.createdAt),
  archivedCreatedIdx: index("notifications_archived_created_idx").on(table.isArchived, table.createdAt),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isArchived: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Announcement priority enum
export const AnnouncementPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type AnnouncementPriorityType = typeof AnnouncementPriority[keyof typeof AnnouncementPriority];

// Announcements table - HQ broadcasts to branches/roles
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  summary: text("summary"),
  category: varchar("category", { length: 30 }).notNull().default("general"), // new_product, general, policy, campaign, urgent, training, event
  targetRoles: text("target_roles").array(),
  targetBranches: integer("target_branches").array(),
  priority: text("priority").notNull().default("normal"),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  
  // Banner görseli ve ayarları
  bannerImageUrl: text("banner_image_url"),
  bannerTitle: varchar("banner_title", { length: 100 }),
  bannerSubtitle: varchar("banner_subtitle", { length: 200 }),
  showOnDashboard: boolean("show_on_dashboard").default(false),
  bannerPriority: integer("banner_priority").default(0),
  isPinned: boolean("is_pinned").default(false),
  
  // Zengin içerik alanları
  detailedContent: text("detailed_content"), // Uzun açıklama/makale içeriği
  ctaLink: text("cta_link"), // Call-to-action buton linki
  ctaText: varchar("cta_text", { length: 50 }), // Buton metni (örn: "Daha Fazla")
  mediaUrls: text("media_urls").array().default(sql`ARRAY[]::text[]`), // Ek görseller/videolar
  
  publishedAt: timestamp("published_at").defaultNow(),
  validFrom: timestamp("valid_from"), // Geçerlilik başlangıç tarihi
  expiresAt: timestamp("expires_at"), // Geçerlilik bitiş tarihi
  
  // Onay akışı (Draft → Review → Approved → Published)
  status: varchar("status", { length: 20 }).notNull().default("published"), // draft, review, approved, published, expired, archived
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  // Acknowledgment (reçete/kanuni duyurularda zorunlu onay)
  requiresAcknowledgment: boolean("requires_acknowledgment").default(false),
  // Mini Quiz (reçete/kanuni duyurularda bilgi kontrolü)
  quizQuestions: text("quiz_questions"), // JSON: [{question, options[], correctIndex, explanation}]
  quizPassScore: integer("quiz_pass_score").default(80), // Geçme notu (%)
  quizRequired: boolean("quiz_required").default(false), // Quiz zorunlu mu?
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  publishedIdx: index("announcements_published_idx").on(table.publishedAt),
  categoryIdx: index("announcements_category_idx").on(table.category),
  dashboardIdx: index("announcements_dashboard_idx").on(table.showOnDashboard),
  statusIdx: index("announcements_status_idx").on(table.status),
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
  createdById: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  attachments: z.array(z.string()).default([]),
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Announcement Read Status table - Track who has read each announcement
// Note: Column names match database schema (camelCase)
export const announcementReadStatus = pgTable("announcement_read_status", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("readAt").defaultNow(),
  acknowledgedAt: timestamp("acknowledgedAt"),
}, (table) => [
  index("announcement_read_user_idx").on(table.userId),
  index("announcement_read_announcement_idx").on(table.announcementId),
  unique("unique_announcement_read").on(table.announcementId, table.userId),
]);

export const insertAnnouncementReadStatusSchema = createInsertSchema(announcementReadStatus).omit({
  id: true,
  readAt: true,
});

export type InsertAnnouncementReadStatus = z.infer<typeof insertAnnouncementReadStatusSchema>;
export type AnnouncementReadStatus = typeof announcementReadStatus.$inferSelect;

// Announcement Quiz Results — Duyuru mini quiz sonuçları
export const announcementQuizResults = pgTable("announcement_quiz_results", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  passed: boolean("passed").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  answers: text("answers"), // JSON: [{questionIndex, selectedIndex, correct}]
  attemptNumber: integer("attempt_number").default(1),
  attemptedAt: timestamp("attempted_at").defaultNow(),
}, (table) => [
  index("aqr_announcement_idx").on(table.announcementId),
  index("aqr_user_idx").on(table.userId),
  index("aqr_user_ann_idx").on(table.userId, table.announcementId),
]);

// Announcement Dismissals — Header banner kapatma takibi
export const announcementDismissals = pgTable("announcement_dismissals", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dismissedAt: timestamp("dismissed_at").defaultNow(),
  showAgainAfter: timestamp("show_again_after"), // null = kalıcı kapatma, tarih = geçici kapatma
}, (table) => [
  unique("unique_announcement_dismissal").on(table.announcementId, table.userId),
  index("dismissal_user_idx").on(table.userId),
]);

// Daily Cash Reports table - Supervisor daily cash summary for accounting
export const dailyCashReports = pgTable("daily_cash_reports", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  openingCash: numeric("opening_cash", { precision: 10, scale: 2 }).notNull(),
  closingCash: numeric("closing_cash", { precision: 10, scale: 2 }).notNull(),
  totalSales: numeric("total_sales", { precision: 10, scale: 2 }).notNull(),
  cashSales: numeric("cash_sales", { precision: 10, scale: 2 }),
  cardSales: numeric("card_sales", { precision: 10, scale: 2 }),
  expenses: numeric("expenses", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("daily_cash_reports_branch_date_idx").on(table.branchId, table.reportDate),
  uniqueBranchDate: unique("unique_branch_date").on(table.branchId, table.reportDate),
}));

export const insertDailyCashReportSchema = createInsertSchema(dailyCashReports).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyCashReport = z.infer<typeof insertDailyCashReportSchema>;
export type DailyCashReport = typeof dailyCashReports.$inferSelect;

// Shifts table - Employee shift scheduling for supervisors and HR
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist2Id: integer("checklist2_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist3Id: integer("checklist3_id").references(() => checklists.id, { onDelete: "set null" }),
  shiftDate: date("shift_date").notNull(),
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(),
  breakStartTime: time("break_start_time", { precision: 0 }),
  breakEndTime: time("break_end_time", { precision: 0 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  workloadScore: numeric("workload_score", { precision: 5, scale: 2 }),
  aiPlanId: varchar("ai_plan_id", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchDateIdx: index("shifts_branch_date_idx").on(table.branchId, table.shiftDate),
  assignedToIdx: index("shifts_assigned_to_idx").on(table.assignedToId),
  createdByIdx: index("shifts_created_by_idx").on(table.createdById),
  checklistIdx: index("shifts_checklist_idx").on(table.checklistId),
}));

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night", "opening", "relay_1", "relay_2", "closing"]),
  status: z.enum(["draft", "pending_hq", "confirmed", "completed", "cancelled"]).default("draft"),
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type ShiftType = "morning" | "evening" | "night";
export type ShiftStatus = "draft" | "pending_hq" | "confirmed" | "completed" | "cancelled";

// Shift Checklists (many-to-many) - Assign checklists to shifts
export const shiftChecklists = pgTable("shift_checklists", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftChecklist: unique("unique_shift_checklist").on(table.shiftId, table.checklistId),
  shiftIdx: index("shift_checklists_shift_idx").on(table.shiftId),
  checklistIdx: index("shift_checklists_checklist_idx").on(table.checklistId),
}));

export const insertShiftChecklistSchema = createInsertSchema(shiftChecklists).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftChecklist = z.infer<typeof insertShiftChecklistSchema>;
export type ShiftChecklist = typeof shiftChecklists.$inferSelect;

// Shift Tasks (many-to-many) - Assign tasks to shifts
export const shiftTasks = pgTable("shift_tasks", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftTask: unique("unique_shift_task").on(table.shiftId, table.taskId),
  shiftIdx: index("shift_tasks_shift_idx").on(table.shiftId),
  taskIdx: index("shift_tasks_task_idx").on(table.taskId),
}));

export const insertShiftTaskSchema = createInsertSchema(shiftTasks).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftTask = z.infer<typeof insertShiftTaskSchema>;
export type ShiftTask = typeof shiftTasks.$inferSelect;

// Bulk shift creation schema for shift planning
export const bulkCreateShiftsSchema = z.object({
  branchId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  period: z.enum(['weekly', '2weekly', 'monthly']),
  checklistId: z.number().int().positive().optional().nullable(),
  openingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  closingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  shiftType: z.string().min(1).default('regular'),
});

export type BulkCreateShifts = z.infer<typeof bulkCreateShiftsSchema>;

// Leave Requests table - Employee leave/time-off management
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 20 }).notNull(), // annual, sick, personal, unpaid
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("leave_requests_user_idx").on(table.userId),
  statusIdx: index("leave_requests_status_idx").on(table.status),
  dateIdx: index("leave_requests_date_idx").on(table.startDate, table.endDate),
}));

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Shift Attendance table - Employee check-in/out and break tracking
export const shiftAttendance = pgTable("shift_attendance", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Scheduled times (planned shift hours)
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  // Actual check-in/out times
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  // Break tracking
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  breakPlannedMinutes: integer("break_planned_minutes").default(60), // Default 1 hour break
  breakTakenMinutes: integer("break_taken_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  // Work time calculations
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  effectiveWorkMinutes: integer("effective_work_minutes").default(0), // After penalties
  penaltyMinutes: integer("penalty_minutes").default(0),
  // Compliance & punctuality
  latenessMinutes: integer("lateness_minutes").default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  breakOverageMinutes: integer("break_overage_minutes").default(0), // Break time exceeded planned break
  complianceScore: integer("compliance_score").default(100), // 0-100
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, checked_in, on_break, checked_out, absent, late
  notes: text("notes"),
  // Check-in Method & Verification
  checkInMethod: varchar("check_in_method", { length: 20 }).default("manual"),
  locationConfidenceScore: integer("location_confidence_score"),
  // Check-in Photo & Location Verification fields
  checkInPhotoUrl: text("check_in_photo_url"),
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  // Check-out Photo & Location Verification fields
  checkOutPhotoUrl: text("check_out_photo_url"),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  // Break Photo & Location fields
  breakStartPhotoUrl: text("break_start_photo_url"),
  breakStartLatitude: numeric("break_start_latitude", { precision: 10, scale: 7 }),
  breakStartLongitude: numeric("break_start_longitude", { precision: 10, scale: 7 }),
  breakEndPhotoUrl: text("break_end_photo_url"),
  breakEndLatitude: numeric("break_end_latitude", { precision: 10, scale: 7 }),
  breakEndLongitude: numeric("break_end_longitude", { precision: 10, scale: 7 }),
  // AI Background Verification (Shift Corner matching)
  aiBackgroundCheckInStatus: varchar("ai_background_check_in_status", { length: 20 }).default("pending"), // pending, verified, rejected, error
  aiBackgroundCheckInScore: integer("ai_background_check_in_score"), // 0-100 similarity score
  aiBackgroundCheckInDetails: jsonb("ai_background_check_in_details"),
  aiBackgroundCheckOutStatus: varchar("ai_background_check_out_status", { length: 20 }).default("pending"),
  aiBackgroundCheckOutScore: integer("ai_background_check_out_score"),
  aiBackgroundCheckOutDetails: jsonb("ai_background_check_out_details"),
  aiBackgroundBreakStartStatus: varchar("ai_background_break_start_status", { length: 20 }).default("pending"),
  aiBackgroundBreakStartScore: integer("ai_background_break_start_score"),
  aiBackgroundBreakEndStatus: varchar("ai_background_break_end_status", { length: 20 }).default("pending"),
  aiBackgroundBreakEndScore: integer("ai_background_break_end_score"),
  // AI Dress Code Analysis fields (check-in)
  aiDressCodeScore: integer("ai_dress_code_score"), // 0-100
  aiDressCodeAnalysis: jsonb("ai_dress_code_analysis"), // Detailed analysis object
  aiDressCodeStatus: varchar("ai_dress_code_status", { length: 20 }).default("pending"), // pending, approved, rejected, error
  aiDressCodeWarnings: text("ai_dress_code_warnings").array(), // Turkish warnings
  aiDressCodeTimestamp: timestamp("ai_dress_code_timestamp"),
  // Legacy fields (keeping for backward compatibility)
  photoUrl: text("photo_url"),
  analysisStatus: varchar("analysis_status", { length: 20 }).default("pending"), // pending, completed, error
  analysisDetails: jsonb("analysis_details"), // Structured AI response
  analysisTimestamp: timestamp("analysis_timestamp"),
  aiWarnings: text("ai_warnings").array(), // Turkish warnings array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShiftUser: unique("unique_shift_user_attendance").on(table.shiftId, table.userId),
  shiftIdx: index("shift_attendance_shift_idx").on(table.shiftId),
  userIdx: index("shift_attendance_user_idx").on(table.userId),
  statusIdx: index("shift_attendance_status_idx").on(table.status),
}));

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// Shift Trade Requests table - Employee shift swapping with approval workflow
export const shiftTradeRequests = pgTable("shift_trade_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  responderShiftId: integer("responder_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("taslak"), // taslak, calisan_onayi, yonetici_onayi, reddedildi, iptal
  notes: text("notes"),
  responderConfirmedAt: timestamp("responder_confirmed_at"),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  requesterIdx: index("shift_trade_requests_requester_idx").on(table.requesterId),
  responderIdx: index("shift_trade_requests_responder_idx").on(table.responderId),
  statusIdx: index("shift_trade_requests_status_idx").on(table.status),
  uniqueOpenTrade: unique("unique_open_shift_trade").on(table.requesterShiftId, table.responderShiftId, table.status),
}));

export const insertShiftTradeRequestSchema = createInsertSchema(shiftTradeRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["taslak", "calisan_onayi", "yonetici_onayi", "reddedildi", "iptal"]).default("taslak"),
});

export type InsertShiftTradeRequest = z.infer<typeof insertShiftTradeRequestSchema>;
export type ShiftTradeRequest = typeof shiftTradeRequests.$inferSelect;
export type ShiftTradeStatus = "taslak" | "calisan_onayi" | "yonetici_onayi" | "reddedildi" | "iptal";

// ========================================
// DYNAMIC MENU CONFIGURATION TABLES
// ========================================

// ─── Cowork Sistemi ─────────────────────────────────────────────────────────
export const coworkChannels = pgTable("cowork_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: text("created_by_id").references(() => users.id),
  isPrivate: boolean("is_private").default(false),
  allowedBranchIds: text("allowed_branch_ids"), // JSON array of branch IDs
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const coworkChannelMembers = pgTable("cowork_channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => coworkChannels.id),
  userId: text("user_id").references(() => users.id),
  role: text("role").$type<'owner'|'admin'|'member'>().default('member'),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
});

export const coworkMessages = pgTable("cowork_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => coworkChannels.id),
  senderId: text("sender_id").references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").$type<'text'|'task_created'|'file'|'dobody'>().default('text'),
  metadata: text("metadata"), // JSON: task ref, file info etc.
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const coworkTasks = pgTable("cowork_tasks", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => coworkChannels.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdById: text("created_by_id").references(() => users.id),
  status: text("status").$type<'todo'|'in_progress'|'done'>().default('todo'),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
