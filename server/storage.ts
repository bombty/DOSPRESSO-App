import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import type {
  User,
  UpsertUser,
  Branch,
  Task,
  InsertTask,
  Checklist,
  InsertChecklist,
  ChecklistTask,
  InsertChecklistTask,
  Equipment,
  InsertEquipment,
  EquipmentFault,
  InsertEquipmentFault,
  FaultStageTransition,
  InsertFaultStageTransition,
  FaultStageType,
  KnowledgeBaseArticle,
  InsertKnowledgeBaseArticle,
  KnowledgeBaseEmbedding,
  InsertKnowledgeBaseEmbedding,
  Reminder,
  InsertReminder,
  PerformanceMetric,
  InsertPerformanceMetric,
  TrainingModule,
  InsertTrainingModule,
  ModuleVideo,
  InsertModuleVideo,
  ModuleQuiz,
  InsertModuleQuiz,
  QuizQuestion,
  InsertQuizQuestion,
  Flashcard,
  InsertFlashcard,
  UserTrainingProgress,
  InsertUserTrainingProgress,
  UserQuizAttempt,
  InsertUserQuizAttempt,
  EmployeeWarning,
  InsertEmployeeWarning,
  Message,
  InsertMessage,
} from "@shared/schema";
import {
  users,
  branches,
  tasks,
  checklists,
  checklistTasks,
  equipment,
  equipmentFaults,
  faultStageTransitions,
  knowledgeBaseArticles,
  knowledgeBaseEmbeddings,
  reminders,
  performanceMetrics,
  trainingModules,
  moduleVideos,
  moduleQuizzes,
  quizQuestions,
  flashcards,
  userTrainingProgress,
  userQuizAttempts,
  employeeWarnings,
  messages,
  messageReads,
  UserRole,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getEmployeeForBranch(employeeId: string, allowedBranchId: number | null): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllEmployees(branchId?: number): Promise<User[]>;
  
  // Employee Warnings operations
  getEmployeeWarnings(userId: string): Promise<EmployeeWarning[]>;
  createEmployeeWarning(warning: InsertEmployeeWarning): Promise<EmployeeWarning>;
  
  // Branch operations
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: Omit<Branch, "id" | "createdAt" | "isActive">): Promise<Branch>;
  updateBranch(id: number, updates: Partial<Omit<Branch, "id" | "createdAt" | "isActive">>): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<void>;
  
  // Task operations
  getTasks(branchId?: number, assignedToId?: string, status?: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  completeTask(id: number, photoUrl?: string): Promise<Task | undefined>;
  
  // Checklist operations
  getChecklists(): Promise<Checklist[]>;
  getChecklist(id: number): Promise<Checklist | undefined>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  
  // Checklist Task operations
  getChecklistTasks(checklistId?: number): Promise<ChecklistTask[]>;
  createChecklistTask(task: InsertChecklistTask): Promise<ChecklistTask>;
  
  // Equipment operations
  getEquipment(branchId?: number): Promise<Equipment[]>;
  getEquipmentById(id: number): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: number, updates: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  logMaintenance(equipmentId: number, maintenanceIntervalDays: number): Promise<Equipment | undefined>;
  
  // Equipment Fault operations
  getFaults(branchId?: number): Promise<EquipmentFault[]>;
  getFault(id: number): Promise<EquipmentFault | undefined>;
  createFault(fault: InsertEquipmentFault): Promise<EquipmentFault>;
  updateFault(id: number, updates: Partial<InsertEquipmentFault>): Promise<EquipmentFault | undefined>;
  resolveFault(id: number): Promise<EquipmentFault | undefined>;
  changeFaultStage(faultId: number, newStage: FaultStageType, changedBy: string, notes?: string): Promise<EquipmentFault | undefined>;
  getFaultStageHistory(faultId: number): Promise<FaultStageTransition[]>;
  
  // Knowledge Base operations
  getArticles(category?: string): Promise<KnowledgeBaseArticle[]>;
  getArticle(id: number): Promise<KnowledgeBaseArticle | undefined>;
  createArticle(article: InsertKnowledgeBaseArticle): Promise<KnowledgeBaseArticle>;
  incrementArticleViews(id: number): Promise<void>;
  
  // Knowledge Base Embedding operations
  createEmbeddings(embeddings: InsertKnowledgeBaseEmbedding[]): Promise<void>;
  deleteEmbeddingsByArticle(articleId: number): Promise<void>;
  semanticSearch(queryEmbedding: number[], limit?: number): Promise<Array<{ 
    chunkText: string; 
    articleId: number; 
    articleTitle: string;
    similarity: number;
  }>>;
  
  // Reminder operations
  getReminders(userId?: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, updates: Partial<InsertReminder>): Promise<Reminder | undefined>;
  
  // Performance Metrics operations
  getPerformanceMetrics(branchId?: number): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  
  // Training Module operations
  getTrainingModules(isPublished?: boolean): Promise<TrainingModule[]>;
  getTrainingModule(id: number): Promise<TrainingModule | undefined>;
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  updateTrainingModule(id: number, updates: Partial<InsertTrainingModule>): Promise<TrainingModule | undefined>;
  deleteTrainingModule(id: number): Promise<void>;
  
  // Module Video operations
  getModuleVideos(moduleId: number): Promise<ModuleVideo[]>;
  createModuleVideo(video: InsertModuleVideo): Promise<ModuleVideo>;
  
  // Module Quiz operations
  getModuleQuizzes(moduleId: number): Promise<ModuleQuiz[]>;
  getModuleQuiz(id: number): Promise<ModuleQuiz | undefined>;
  createModuleQuiz(quiz: InsertModuleQuiz): Promise<ModuleQuiz>;
  
  // Quiz Question operations
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  
  // Flashcard operations
  getFlashcards(moduleId: number): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  
  // User Training Progress operations
  getUserTrainingProgress(userId: string, moduleId?: number): Promise<UserTrainingProgress[]>;
  updateUserProgress(userId: string, moduleId: number, updates: Partial<InsertUserTrainingProgress>): Promise<UserTrainingProgress | undefined>;
  getAllTrainingProgressSummary(): Promise<Array<{ userId: string; totalModules: number; completedModules: number }>>;
  
  // User Quiz Attempt operations
  getUserQuizAttempts(userId: string, quizId?: number): Promise<UserQuizAttempt[]>;
  createQuizAttempt(attempt: InsertUserQuizAttempt): Promise<UserQuizAttempt>;
  approveQuizAttempt(id: number, approverId: string, status: string, feedback?: string): Promise<UserQuizAttempt | undefined>;

  // Message operations
  getMessages(userId: string, role: string, branchId: number | null): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number, userId: string): Promise<void>;
  getUnreadCount(userId: string, role: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getEmployeeForBranch(employeeId: string, allowedBranchId: number | null): Promise<User | undefined> {
    // If allowedBranchId is null, allow access to any branch (admin/coach)
    if (allowedBranchId === null) {
      return this.getUserById(employeeId);
    }
    
    // For branch-scoped roles (supervisor), enforce branch match
    // Returns undefined if employee doesn't exist OR if branch doesn't match
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, employeeId), eq(users.branchId, allowedBranchId)));
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          profileImageUrl: insertUser.profileImageUrl,
          email: insertUser.email,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllEmployees(branchId?: number): Promise<User[]> {
    if (branchId !== undefined) {
      return db.select().from(users).where(eq(users.branchId, branchId));
    }
    return db.select().from(users);
  }

  // Branch operations
  async getBranches(): Promise<Branch[]> {
    return db.select().from(branches).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async createBranch(branch: Omit<Branch, "id" | "createdAt" | "isActive">): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: number, updates: Partial<Omit<Branch, "id" | "createdAt" | "isActive">>): Promise<Branch | undefined> {
    const [updated] = await db.update(branches).set(updates).where(eq(branches.id, id)).returning();
    return updated;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }

  // Task operations
  async getTasks(branchId?: number, assignedToId?: string, status?: string): Promise<Task[]> {
    const conditions = [];
    if (branchId !== undefined) {
      conditions.push(eq(tasks.branchId, branchId));
    }
    if (assignedToId !== undefined) {
      conditions.push(eq(tasks.assignedToId, assignedToId));
    }
    if (status !== undefined) {
      conditions.push(eq(tasks.status, status));
    }
    
    if (conditions.length > 0) {
      return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async completeTask(id: number, photoUrl?: string): Promise<Task | undefined> {
    const updates: Partial<InsertTask> & { completedAt?: Date } = {
      status: "tamamlandi",
      completedAt: new Date(),
    };
    if (photoUrl) {
      updates.photoUrl = photoUrl;
    }
    const [updated] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  // Checklist operations
  async getChecklists(): Promise<Checklist[]> {
    return db.select().from(checklists).orderBy(desc(checklists.createdAt));
  }

  async getChecklist(id: number): Promise<Checklist | undefined> {
    const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id));
    return checklist;
  }

  async createChecklist(checklist: InsertChecklist): Promise<Checklist> {
    const [newChecklist] = await db.insert(checklists).values(checklist).returning();
    return newChecklist;
  }

  // Checklist Task operations
  async getChecklistTasks(checklistId?: number): Promise<ChecklistTask[]> {
    if (checklistId) {
      return db.select().from(checklistTasks).where(eq(checklistTasks.checklistId, checklistId)).orderBy(checklistTasks.order);
    }
    return db.select().from(checklistTasks).orderBy(checklistTasks.order);
  }

  async createChecklistTask(task: InsertChecklistTask): Promise<ChecklistTask> {
    const [newTask] = await db.insert(checklistTasks).values(task).returning();
    return newTask;
  }

  // Equipment operations
  async getEquipment(branchId?: number): Promise<Equipment[]> {
    if (branchId) {
      return db.select().from(equipment).where(eq(equipment.branchId, branchId)).orderBy(equipment.equipmentType);
    }
    return db.select().from(equipment).orderBy(equipment.equipmentType);
  }

  async getEquipmentById(id: number): Promise<Equipment | undefined> {
    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    return item;
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [newEquipment] = await db.insert(equipment).values(equipmentData).returning();
    return newEquipment;
  }

  async updateEquipment(id: number, updates: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [updated] = await db
      .update(equipment)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();
    return updated;
  }

  async logMaintenance(equipmentId: number, maintenanceIntervalDays: number): Promise<Equipment | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const nextMaintenanceDate = new Date(Date.now() + maintenanceIntervalDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    const [updated] = await db
      .update(equipment)
      .set({
        lastMaintenanceDate: today,
        nextMaintenanceDate,
        updatedAt: new Date(),
      })
      .where(eq(equipment.id, equipmentId))
      .returning();
    return updated;
  }

  // Equipment Fault operations
  async getFaults(branchId?: number): Promise<EquipmentFault[]> {
    if (branchId) {
      return db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).orderBy(desc(equipmentFaults.createdAt));
    }
    return db.select().from(equipmentFaults).orderBy(desc(equipmentFaults.createdAt));
  }

  async getFault(id: number): Promise<EquipmentFault | undefined> {
    const [fault] = await db.select().from(equipmentFaults).where(eq(equipmentFaults.id, id));
    return fault;
  }

  async createFault(fault: InsertEquipmentFault): Promise<EquipmentFault> {
    const [newFault] = await db.insert(equipmentFaults).values(fault).returning();
    return newFault;
  }

  async updateFault(id: number, updates: Partial<InsertEquipmentFault>): Promise<EquipmentFault | undefined> {
    const [updated] = await db
      .update(equipmentFaults)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipmentFaults.id, id))
      .returning();
    return updated;
  }

  async resolveFault(id: number): Promise<EquipmentFault | undefined> {
    const [updated] = await db
      .update(equipmentFaults)
      .set({ 
        status: "cozuldu", 
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(equipmentFaults.id, id))
      .returning();
    return updated;
  }

  async changeFaultStage(faultId: number, newStage: FaultStageType, changedBy: string, notes?: string): Promise<EquipmentFault | undefined> {
    const fault = await this.getFault(faultId);
    if (!fault) return undefined;

    const fromStage = fault.currentStage as FaultStageType | null;
    
    // Record stage transition in audit table
    await db.insert(faultStageTransitions).values({
      faultId,
      fromStage: fromStage || null,
      toStage: newStage,
      changedBy,
      notes,
    });

    // Update stageHistory JSONB array and currentStage in one operation
    const historyEntry = {
      stage: newStage,
      changedBy,
      changedAt: new Date().toISOString(),
      notes,
    };
    
    const existingHistory = (fault.stageHistory as any[]) || [];
    const [updated] = await db
      .update(equipmentFaults)
      .set({
        currentStage: newStage,
        stageHistory: [...existingHistory, historyEntry],
        updatedAt: new Date(),
      })
      .where(eq(equipmentFaults.id, faultId))
      .returning();

    return updated;
  }

  async getFaultStageHistory(faultId: number): Promise<FaultStageTransition[]> {
    return db
      .select()
      .from(faultStageTransitions)
      .where(eq(faultStageTransitions.faultId, faultId))
      .orderBy(faultStageTransitions.changedAt);
  }

  // Knowledge Base operations
  async getArticles(category?: string): Promise<KnowledgeBaseArticle[]> {
    if (category) {
      return db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.category, category)).orderBy(desc(knowledgeBaseArticles.createdAt));
    }
    return db.select().from(knowledgeBaseArticles).orderBy(desc(knowledgeBaseArticles.createdAt));
  }

  async getArticle(id: number): Promise<KnowledgeBaseArticle | undefined> {
    const [article] = await db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
    return article;
  }

  async createArticle(article: InsertKnowledgeBaseArticle): Promise<KnowledgeBaseArticle> {
    const [newArticle] = await db.insert(knowledgeBaseArticles).values(article).returning();
    return newArticle;
  }

  async incrementArticleViews(id: number): Promise<void> {
    await db
      .update(knowledgeBaseArticles)
      .set({ 
        viewCount: db.$with("current").as(
          db.select({ viewCount: knowledgeBaseArticles.viewCount }).from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id))
        ) as any + 1
      })
      .where(eq(knowledgeBaseArticles.id, id));
  }

  // Reminder operations
  async getReminders(userId?: string): Promise<Reminder[]> {
    if (userId) {
      return db.select().from(reminders).where(and(eq(reminders.userId, userId), eq(reminders.isActive, true))).orderBy(desc(reminders.createdAt));
    }
    return db.select().from(reminders).where(eq(reminders.isActive, true)).orderBy(desc(reminders.createdAt));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values(reminder).returning();
    return newReminder;
  }

  async updateReminder(id: number, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  // Performance Metrics operations
  async getPerformanceMetrics(branchId?: number): Promise<PerformanceMetric[]> {
    if (branchId) {
      return db.select().from(performanceMetrics).where(eq(performanceMetrics.branchId, branchId)).orderBy(desc(performanceMetrics.date));
    }
    return db.select().from(performanceMetrics).orderBy(desc(performanceMetrics.date));
  }

  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [newMetric] = await db.insert(performanceMetrics).values(metric).returning();
    return newMetric;
  }

  // Knowledge Base Embedding operations
  async createEmbeddings(embeddings: InsertKnowledgeBaseEmbedding[]): Promise<void> {
    if (embeddings.length === 0) return;
    await db.insert(knowledgeBaseEmbeddings).values(embeddings as any);
  }

  async deleteEmbeddingsByArticle(articleId: number): Promise<void> {
    await db.delete(knowledgeBaseEmbeddings).where(eq(knowledgeBaseEmbeddings.articleId, articleId));
  }

  async semanticSearch(queryEmbedding: number[], limit: number = 5): Promise<Array<{ 
    chunkText: string; 
    articleId: number; 
    articleTitle: string;
    similarity: number;
  }>> {
    const embeddingString = `'[${queryEmbedding.join(',')}]'`;
    
    const results = await db.execute<{
      chunk_text: string;
      article_id: number;
      article_title: string;
      similarity: number;
    }>(sql`
      SELECT 
        e.chunk_text,
        e.article_id,
        a.title as article_title,
        1 - (e.embedding <=> ${sql.raw(embeddingString)}::vector) as similarity
      FROM knowledge_base_embeddings e
      JOIN knowledge_base_articles a ON e.article_id = a.id
      WHERE a.is_published = true
      ORDER BY e.embedding <=> ${sql.raw(embeddingString)}::vector
      LIMIT ${limit}
    `);

    return results.rows.map(row => ({
      chunkText: row.chunk_text,
      articleId: row.article_id,
      articleTitle: row.article_title,
      similarity: row.similarity,
    }));
  }

  // Training Module operations
  async getTrainingModules(isPublished?: boolean): Promise<TrainingModule[]> {
    if (isPublished !== undefined) {
      return db.select().from(trainingModules).where(eq(trainingModules.isPublished, isPublished)).orderBy(desc(trainingModules.createdAt));
    }
    return db.select().from(trainingModules).orderBy(desc(trainingModules.createdAt));
  }

  async getTrainingModule(id: number): Promise<TrainingModule | undefined> {
    const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, id));
    return module;
  }

  async createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule> {
    const [newModule] = await db.insert(trainingModules).values(module).returning();
    return newModule;
  }

  async updateTrainingModule(id: number, updates: Partial<InsertTrainingModule>): Promise<TrainingModule | undefined> {
    const [updated] = await db
      .update(trainingModules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingModules.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingModule(id: number): Promise<void> {
    await db.delete(trainingModules).where(eq(trainingModules.id, id));
  }

  // Module Video operations
  async getModuleVideos(moduleId: number): Promise<ModuleVideo[]> {
    return db.select().from(moduleVideos).where(eq(moduleVideos.moduleId, moduleId)).orderBy(moduleVideos.orderIndex);
  }

  async createModuleVideo(video: InsertModuleVideo): Promise<ModuleVideo> {
    const [newVideo] = await db.insert(moduleVideos).values(video).returning();
    return newVideo;
  }

  // Module Quiz operations
  async getModuleQuizzes(moduleId: number): Promise<ModuleQuiz[]> {
    return db.select().from(moduleQuizzes).where(eq(moduleQuizzes.moduleId, moduleId));
  }

  async getModuleQuiz(id: number): Promise<ModuleQuiz | undefined> {
    const [quiz] = await db.select().from(moduleQuizzes).where(eq(moduleQuizzes.id, id));
    return quiz;
  }

  async createModuleQuiz(quiz: InsertModuleQuiz): Promise<ModuleQuiz> {
    const [newQuiz] = await db.insert(moduleQuizzes).values(quiz).returning();
    return newQuiz;
  }

  // Quiz Question operations
  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  // Flashcard operations
  async getFlashcards(moduleId: number): Promise<Flashcard[]> {
    return db.select().from(flashcards).where(eq(flashcards.moduleId, moduleId));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [newFlashcard] = await db.insert(flashcards).values(flashcard).returning();
    return newFlashcard;
  }

  // User Training Progress operations
  async getUserTrainingProgress(userId: string, moduleId?: number): Promise<UserTrainingProgress[]> {
    if (moduleId !== undefined) {
      return db.select().from(userTrainingProgress).where(
        and(eq(userTrainingProgress.userId, userId), eq(userTrainingProgress.moduleId, moduleId))
      );
    }
    return db.select().from(userTrainingProgress).where(eq(userTrainingProgress.userId, userId));
  }

  async updateUserProgress(userId: string, moduleId: number, updates: Partial<InsertUserTrainingProgress>): Promise<UserTrainingProgress | undefined> {
    // True upsert using Postgres ON CONFLICT
    const [result] = await db
      .insert(userTrainingProgress)
      .values({
        userId,
        moduleId,
        status: 'not_started',
        progressPercentage: 0,
        videosWatched: [],
        ...updates,
      })
      .onConflictDoUpdate({
        target: [userTrainingProgress.userId, userTrainingProgress.moduleId],
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getAllTrainingProgressSummary(): Promise<Array<{ userId: string; totalModules: number; completedModules: number }>> {
    const results = await db.execute<{
      user_id: string;
      total_modules: number;
      completed_modules: number;
    }>(sql`
      SELECT 
        user_id,
        COUNT(*) as total_modules,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_modules
      FROM user_training_progress
      GROUP BY user_id
    `);

    return results.rows.map(row => ({
      userId: row.user_id,
      totalModules: Number(row.total_modules),
      completedModules: Number(row.completed_modules),
    }));
  }

  // User Quiz Attempt operations
  async getUserQuizAttempts(userId: string, quizId?: number): Promise<UserQuizAttempt[]> {
    if (quizId !== undefined) {
      return db.select().from(userQuizAttempts).where(
        and(eq(userQuizAttempts.userId, userId), eq(userQuizAttempts.quizId, quizId))
      ).orderBy(desc(userQuizAttempts.startedAt));
    }
    return db.select().from(userQuizAttempts).where(eq(userQuizAttempts.userId, userId)).orderBy(desc(userQuizAttempts.startedAt));
  }

  async createQuizAttempt(attempt: InsertUserQuizAttempt): Promise<UserQuizAttempt> {
    const [newAttempt] = await db.insert(userQuizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async approveQuizAttempt(id: number, approverId: string, status: string, feedback?: string): Promise<UserQuizAttempt | undefined> {
    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new Error(`Invalid approval status: ${status}. Must be 'approved', 'rejected', or 'pending'`);
    }

    const [updated] = await db
      .update(userQuizAttempts)
      .set({
        approvedBy: approverId,
        approvalStatus: status,
        feedback: feedback,
      })
      .where(eq(userQuizAttempts.id, id))
      .returning();
    return updated;
  }

  // Employee Warnings operations
  async getEmployeeWarnings(userId: string): Promise<EmployeeWarning[]> {
    return db.select().from(employeeWarnings).where(eq(employeeWarnings.userId, userId)).orderBy(desc(employeeWarnings.issuedAt));
  }

  async createEmployeeWarning(warning: InsertEmployeeWarning): Promise<EmployeeWarning> {
    const [newWarning] = await db.insert(employeeWarnings).values(warning).returning();
    return newWarning;
  }

  // Message operations
  async getMessages(userId: string, role: string, branchId: number | null): Promise<Message[]> {
    // Get messages where:
    // 1. User is direct recipient (recipientId matches)
    // 2. User's role matches recipientRole (role-based broadcast)
    // LEFT JOIN with messageReads to check if user has read the message
    const roleMessages = await db
      .select({
        ...messages,
        isReadByUser: sql<boolean>`${messageReads.id} IS NOT NULL`.as('is_read_by_user'),
      })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(
        sql`${messages.recipientId} = ${userId} OR ${messages.recipientRole} = ${role}`
      )
      .orderBy(desc(messages.createdAt)) as any;

    // Map isReadByUser to isRead for compatibility
    return roleMessages.map((msg: any) => ({
      ...msg,
      isRead: msg.isReadByUser || false,
    }));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: number, userId: string): Promise<void> {
    // Insert into messageReads junction table (supports broadcast messages)
    // Uses ON CONFLICT DO NOTHING to prevent duplicate reads
    await db
      .insert(messageReads)
      .values({ messageId: id, userId })
      .onConflictDoNothing();
  }

  async getUnreadCount(userId: string, role: string): Promise<number> {
    // Count messages where user is recipient AND hasn't read yet (no messageReads entry)
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(
        and(
          sql`${messages.recipientId} = ${userId} OR ${messages.recipientRole} = ${role}`,
          sql`${messageReads.id} IS NULL` // Not read yet
        )
      );
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DatabaseStorage();
