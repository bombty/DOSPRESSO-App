import { db } from "./db";
import { eq, desc, asc, and, sql, inArray, type SQL } from "drizzle-orm";
import type {
  User,
  UpsertUser,
  Branch,
  Task,
  InsertTask,
  Checklist,
  InsertChecklist,
  UpdateChecklist,
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
  ModuleLesson,
  InsertModuleLesson,
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
  ThreadParticipant,
  InsertThreadParticipant,
  EquipmentMaintenanceLog,
  InsertEquipmentMaintenanceLog,
  EquipmentComment,
  InsertEquipmentComment,
  EquipmentServiceRequest,
  InsertEquipmentServiceRequest,
  ServiceRequestStatusType,
  HQSupportTicket,
  InsertHQSupportTicket,
  HQSupportMessage,
  InsertHQSupportMessage,
  Notification,
  InsertNotification,
  Announcement,
  InsertAnnouncement,
  DailyCashReport,
  InsertDailyCashReport,
  Shift,
  InsertShift,
  BulkCreateShifts,
  LeaveRequest,
  InsertLeaveRequest,
  ShiftAttendance,
  InsertShiftAttendance,
  OvertimeRequest,
  InsertOvertimeRequest,
  AttendancePenalty,
  InsertAttendancePenalty,
  MonthlyAttendanceSummary,
  InsertMonthlyAttendanceSummary,
  GuestComplaint,
  InsertGuestComplaint,
  EquipmentTroubleshootingStep,
  InsertEquipmentTroubleshootingStep,
  MenuSection,
  InsertMenuSection,
  MenuItem,
  InsertMenuItem,
  MenuVisibilityRule,
  InsertMenuVisibilityRule,
  PageContent,
  InsertPageContent,
  Branding,
  InsertBranding,
  AiUsageLog,
  InsertAiUsageLog,
  ShiftTradeRequest,
  InsertShiftTradeRequest,
  ShiftTemplate,
  InsertShiftTemplate,
  EmployeeAvailability,
  InsertEmployeeAvailability,
  SiteSetting,
  InsertSiteSetting,
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
  moduleLessons,
  moduleQuizzes,
  quizQuestions,
  flashcards,
  userTrainingProgress,
  userQuizAttempts,
  employeeWarnings,
  messages,
  messageReads,
  threadParticipants,
  UserRole,
  equipmentMaintenanceLogs,
  equipmentComments,
  equipmentServiceRequests,
  hqSupportTickets,
  hqSupportMessages,
  notifications,
  announcements,
  dailyCashReports,
  shifts,
  shiftChecklists,
  leaveRequests,
  shiftAttendance,
  shiftTradeRequests,
  shiftTemplates,
  employeeAvailability,
  menuSections,
  menuItems,
  menuVisibilityRules,
  pageContent,
  branding,
  aiUsageLogs,
  customerFeedback,
  InsertCustomerFeedback,
  CustomerFeedback,
  siteSettings,
  overtimeRequests,
  attendancePenalties,
  monthlyAttendanceSummaries,
  guestComplaints,
  equipmentTroubleshootingSteps,
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
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getAllEmployees(branchId?: number): Promise<User[]>;
  getAllUsersWithFilters(filters: { role?: string; branchId?: number; search?: string; accountStatus?: string }): Promise<User[]>;
  bulkImportUsers(users: UpsertUser[]): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByBranchAndRole(branchId: number, role: string): Promise<User[]>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: { userId: string; token: string; expiresAt: Date; usedAt: Date | null }): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  getAllPasswordResetTokens(): Promise<Array<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null }>>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  
  // Employee Warnings operations
  getEmployeeWarnings(userId: string): Promise<EmployeeWarning[]>;
  createEmployeeWarning(warning: InsertEmployeeWarning): Promise<EmployeeWarning>;
  
  // Branch operations
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: Omit<Branch, "id" | "createdAt" | "isActive">): Promise<Branch>;
  updateBranch(id: number, updates: Partial<Omit<Branch, "id" | "createdAt" | "isActive">>): Promise<Branch | undefined>;
  updateBranchSettings(id: number, settings: { openingHours: string; closingHours: string }): Promise<Branch | undefined>;
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
  createChecklistWithTasks(checklistData: InsertChecklist, tasks: InsertChecklistTask[]): Promise<Checklist>;
  updateChecklistSettings(id: number, updates: Partial<{
    isEditable: boolean;
    timeWindowStart: string;
    timeWindowEnd: string;
  }>): Promise<Checklist | undefined>;
  updateChecklistWithTasks(id: number, updates: UpdateChecklist): Promise<Checklist | undefined>;
  deleteChecklist(id: number): Promise<void>;
  
  // Checklist Task operations
  getChecklistTasks(checklistId?: number): Promise<ChecklistTask[]>;
  createChecklistTask(task: InsertChecklistTask): Promise<ChecklistTask>;
  updateChecklistTask(id: number, updates: Partial<InsertChecklistTask>): Promise<ChecklistTask | undefined>;
  deleteChecklistTask(id: number): Promise<void>;
  
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

  // Message operations (thread-based)
  listInboxThreads(userId: string, folder: 'inbox'|'sent'|'unread'): Promise<Array<{
    threadId: string;
    subject: string;
    lastMessageBody: string;
    lastMessageAt: Date;
    unreadCount: number;
    participants: Array<{userId: string; firstName: string; lastName: string}>;
  }>>;
  getThread(threadId: string, userId: string): Promise<{messages: Message[], participants: ThreadParticipant[]}>;
  createMessage(message: InsertMessage): Promise<Message>;
  markThreadRead(userId: string, threadId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Legacy message operations (keep for backwards compatibility)
  getMessages(userId: string, role: string, branchId: number | null): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  markMessageAsRead(id: number, userId: string): Promise<void>;

  // Equipment detail operations
  getEquipmentDetail(id: number): Promise<Equipment | undefined>;
  getEquipmentMaintenanceLogs(equipmentId: number): Promise<EquipmentMaintenanceLog[]>;
  createEquipmentMaintenanceLog(log: InsertEquipmentMaintenanceLog): Promise<EquipmentMaintenanceLog>;
  getEquipmentComments(equipmentId: number): Promise<EquipmentComment[]>;
  createEquipmentComment(comment: InsertEquipmentComment): Promise<EquipmentComment>;

  // Equipment Service Request operations
  createServiceRequest(data: InsertEquipmentServiceRequest): Promise<EquipmentServiceRequest>;
  getServiceRequest(id: number): Promise<EquipmentServiceRequest | undefined>;
  listServiceRequests(equipmentId?: number, status?: ServiceRequestStatusType): Promise<EquipmentServiceRequest[]>;
  updateServiceRequest(id: number, data: Partial<InsertEquipmentServiceRequest>): Promise<EquipmentServiceRequest | undefined>;
  deleteServiceRequest(id: number): Promise<void>;
  appendTimelineEntry(requestId: number, entry: {
    timestamp: string;
    status: ServiceRequestStatusType;
    actorId: string;
    notes?: string;
    meta?: Record<string, any>;
  }): Promise<EquipmentServiceRequest | undefined>;
  updateServiceRequestStatus(id: number, newStatus: ServiceRequestStatusType, actorId: string, notes?: string): Promise<EquipmentServiceRequest | undefined>;

  // HQ Support Ticket operations
  getHQSupportTickets(branchId?: number, status?: string): Promise<HQSupportTicket[]>;
  getHQSupportTicket(id: number): Promise<HQSupportTicket | undefined>;
  createHQSupportTicket(ticket: InsertHQSupportTicket): Promise<HQSupportTicket>;
  updateHQSupportTicketStatus(id: number, status: string, closedBy?: string): Promise<HQSupportTicket | undefined>;
  getHQSupportMessages(ticketId: number): Promise<HQSupportMessage[]>;
  createHQSupportMessage(message: InsertHQSupportMessage): Promise<HQSupportMessage>;

  // Notification operations
  getNotifications(userId: string, isRead?: boolean): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Announcement operations
  getAnnouncements(userId: string, branchId: number | null, role: string): Promise<Announcement[]>;
  getAnnouncementById(id: number): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  addAnnouncementAttachments(id: number, attachments: string[]): Promise<Announcement | undefined>;
  removeAnnouncementAttachment(id: number, attachmentUrl: string): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<void>;
  
  // Daily Cash Report operations
  getDailyCashReports(branchId?: number, dateFrom?: string, dateTo?: string): Promise<DailyCashReport[]>;
  getDailyCashReportById(id: number): Promise<DailyCashReport | undefined>;
  createDailyCashReport(report: InsertDailyCashReport): Promise<DailyCashReport>;
  updateDailyCashReport(id: number, updates: Partial<InsertDailyCashReport>): Promise<DailyCashReport | undefined>;
  deleteDailyCashReport(id: number): Promise<void>;

  // Shift operations
  getShifts(branchId?: number, assignedToId?: string, dateFrom?: string, dateTo?: string): Promise<Shift[]>;
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  createShiftsBulk(params: BulkCreateShifts, createdById: string, preview?: boolean): Promise<Shift[]>;
  updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<void>;
  
  // Shift-Checklist junction operations
  setShiftChecklists(shiftId: number, checklistIds: number[]): Promise<void>;
  getShiftChecklists(shiftId: number): Promise<Checklist[]>;
  
  // Leave Request operations
  getLeaveRequests(userId?: string, branchId?: number, status?: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, updates: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: number): Promise<void>;
  
  // Shift Attendance operations
  getShiftAttendances(shiftId?: number, userId?: string, dateFrom?: string, dateTo?: string): Promise<ShiftAttendance[]>;
  getShiftAttendance(id: number): Promise<ShiftAttendance | undefined>;
  createShiftAttendance(attendance: InsertShiftAttendance): Promise<ShiftAttendance>;
  updateShiftAttendance(id: number, updates: Partial<InsertShiftAttendance>): Promise<ShiftAttendance | undefined>;
  deleteShiftAttendance(id: number): Promise<void>;
  
  // Shift Trade Request operations
  createShiftTradeRequest(data: InsertShiftTradeRequest): Promise<ShiftTradeRequest>;
  getShiftTradeRequests(filters: { branchId?: number; userId?: string; status?: string }): Promise<ShiftTradeRequest[]>;
  respondToShiftTradeRequest(id: number, userId: string): Promise<void>;
  approveShiftTradeRequest(id: number, supervisorId: string, approved: boolean, notes?: string): Promise<void>;
  
  // Shift Template operations
  getShiftTemplates(branchId?: number): Promise<ShiftTemplate[]>;
  getShiftTemplate(id: number): Promise<ShiftTemplate | undefined>;
  createShiftTemplate(template: InsertShiftTemplate): Promise<ShiftTemplate>;
  updateShiftTemplate(id: number, updates: Partial<InsertShiftTemplate>): Promise<ShiftTemplate | undefined>;
  deleteShiftTemplate(id: number): Promise<void>;
  createShiftsFromTemplate(templateId: number, startDate: string, endDate: string, createdById: string): Promise<Shift[]>;
  
  // Employee Availability operations
  getEmployeeAvailability(userId?: string, startDate?: string, endDate?: string): Promise<EmployeeAvailability[]>;
  getAvailability(id: number): Promise<EmployeeAvailability | undefined>;
  createAvailability(availability: InsertEmployeeAvailability): Promise<EmployeeAvailability>;
  updateAvailability(id: number, updates: Partial<InsertEmployeeAvailability>): Promise<EmployeeAvailability | undefined>;
  deleteAvailability(id: number): Promise<void>;
  checkEmployeeAvailability(userId: string, shiftDate: string, startTime: string, endTime: string): Promise<{ available: boolean; conflicts: EmployeeAvailability[] }>;
  
  // Check-in/Check-out helpers
  verifyShiftQR(qrData: string): Promise<{ valid: boolean; shiftId?: number; message?: string }>;
  calculateAttendanceStats(userId: string, month?: number, year?: number): Promise<{ totalShifts: number; attended: number; late: number; absent: number }>;
  
  // Shift notification helpers
  sendShiftReminders(): Promise<void>;
  notifyShiftChange(shiftId: number, changeType: 'updated' | 'assigned' | 'cancelled', notes?: string): Promise<void>;
  
  // Performance Metrics scoring
  recordPerformanceScore(data: {
    branchId?: number;
    userId?: string;
    date: Date;
    taskScore: number;
    photoScore: number;
    timeScore: number;
    supervisorScore: number;
  }): Promise<PerformanceMetric>;

  // Menu Management operations
  listMenu(): Promise<{
    sections: MenuSection[];
    items: MenuItem[];
    rules: MenuVisibilityRule[];
  }>;
  createMenuSection(data: InsertMenuSection): Promise<MenuSection>;
  updateMenuSection(id: number, data: Partial<InsertMenuSection>): Promise<MenuSection>;
  deleteMenuSection(id: number): Promise<void>;
  reorderMenuSections(sectionIds: number[]): Promise<void>;
  
  createMenuItem(data: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  reorderMenuItems(sectionId: number, itemIds: number[]): Promise<void>;
  
  createVisibilityRule(data: InsertMenuVisibilityRule): Promise<MenuVisibilityRule>;
  deleteVisibilityRule(id: number): Promise<void>;

  // Page Content operations
  listPageContent(): Promise<PageContent[]>;
  getPageContent(slug: string): Promise<PageContent | undefined>;
  createPageContent(data: InsertPageContent): Promise<PageContent>;
  updatePageContent(slug: string, data: Partial<InsertPageContent> & { updatedById: string }): Promise<PageContent>;
  deletePageContent(slug: string): Promise<void>;

  // Branding operations
  getBranding(): Promise<Branding | undefined>;
  updateBrandingLogo(logoUrl: string, updatedById: string): Promise<Branding>;

  // AI Usage Logging operations
  logAiUsage(entry: InsertAiUsageLog): Promise<void>;
  getAiUsageAggregates(filters: {start?: Date; end?: Date}): Promise<{
    totalCost: number;
    monthToDateCost: number;
    dailyAverage: number;
    remainingBudget: number;
    costByFeature: Array<{feature: string; cost: number}>;
    costByModel: Array<{model: string; cost: number}>;
    last14Days: Array<{date: string; cost: number}>;
    cachedSavings: number;
  }>;

  // Customer Feedback operations
  getCustomerFeedback(branchId?: number, status?: string): Promise<CustomerFeedback[]>;
  createCustomerFeedback(data: InsertCustomerFeedback): Promise<CustomerFeedback>;
  updateCustomerFeedbackStatus(id: number, status: string, reviewedById: string, reviewNotes?: string): Promise<CustomerFeedback | undefined>;

  // Site Settings operations
  getSiteSettings(category?: string): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  updateSiteSetting(key: string, value: string, updatedBy: string): Promise<SiteSetting>;
  createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  deleteSiteSetting(key: string): Promise<void>;

  // Overtime Request operations
  getOvertimeRequests(userId: string, canApprove: boolean): Promise<OvertimeRequest[]>;
  createOvertimeRequest(data: InsertOvertimeRequest): Promise<OvertimeRequest>;
  approveOvertimeRequest(id: number, approverId: string, approvedMinutes: number): Promise<OvertimeRequest | undefined>;
  rejectOvertimeRequest(id: number, rejectionReason: string): Promise<OvertimeRequest | undefined>;
  getRecentShiftAttendances(userId: string, days: number): Promise<ShiftAttendance[]>;
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

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByBranchAndRole(branchId: number, role: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.role, role)));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ hashedPassword, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async createPasswordResetToken(token: { userId: string; token: string; expiresAt: Date; usedAt: Date | null }): Promise<void> {
    const { passwordResetTokens } = await import("@shared/schema");
    await db.insert(passwordResetTokens).values(token);
  }

  async getPasswordResetToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const { passwordResetTokens } = await import("@shared/schema");
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result as any;
  }

  async getAllPasswordResetTokens(): Promise<Array<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null }>> {
    const { passwordResetTokens } = await import("@shared/schema");
    const results = await db.select().from(passwordResetTokens);
    return results as any[];
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    const { passwordResetTokens } = await import("@shared/schema");
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
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

  async getAllUsersWithFilters(filters: { role?: string; branchId?: number; search?: string; accountStatus?: string }): Promise<User[]> {
    const conditions: SQL<unknown>[] = [];
    
    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.branchId !== undefined) {
      conditions.push(eq(users.branchId, filters.branchId));
    }
    if (filters.accountStatus) {
      conditions.push(eq(users.accountStatus, filters.accountStatus));
    }
    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`LOWER(${users.firstName}) LIKE ${searchTerm} OR LOWER(${users.lastName}) LIKE ${searchTerm} OR LOWER(${users.email}) LIKE ${searchTerm}`
      );
    }
    
    if (conditions.length > 0) {
      return db.select().from(users).where(and(...conditions)).orderBy(users.firstName, users.lastName);
    }
    return db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async bulkImportUsers(insertUsers: UpsertUser[]): Promise<User[]> {
    if (insertUsers.length === 0) return [];
    
    const imported = await db
      .insert(users)
      .values(insertUsers)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          firstName: sql`EXCLUDED.first_name`,
          lastName: sql`EXCLUDED.last_name`,
          email: sql`EXCLUDED.email`,
          role: sql`EXCLUDED.role`,
          branchId: sql`EXCLUDED.branch_id`,
          profileImageUrl: sql`EXCLUDED.profile_image_url`,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return imported;
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

  async updateBranchSettings(id: number, settings: { openingHours: string; closingHours: string }): Promise<Branch | undefined> {
    return this.updateBranch(id, settings);
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
      status: "foto_bekleniyor",
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

  async createChecklistWithTasks(checklistData: InsertChecklist, tasks: InsertChecklistTask[]): Promise<Checklist> {
    return db.transaction(async (tx) => {
      const [checklist] = await tx.insert(checklists).values(checklistData).returning();
      
      for (const task of tasks) {
        await tx.insert(checklistTasks).values({
          ...task,
          checklistId: checklist.id,
        });
      }
      
      return checklist;
    });
  }

  async updateChecklistSettings(id: number, updates: Partial<{
    isEditable: boolean;
    timeWindowStart: string;
    timeWindowEnd: string;
  }>): Promise<Checklist | undefined> {
    const [updated] = await db
      .update(checklists)
      .set(updates)
      .where(eq(checklists.id, id))
      .returning();
    return updated;
  }

  async updateChecklistWithTasks(id: number, updates: UpdateChecklist): Promise<Checklist | undefined> {
    return db.transaction(async (tx) => {
      const existingChecklist = await tx.query.checklists.findFirst({
        where: eq(checklists.id, id),
      });

      if (!existingChecklist) {
        throw new Error("Checklist not found");
      }

      const { tasks: tasksPayload, ...checklistUpdates } = updates;

      const updateData: any = {};
      if (checklistUpdates.title !== undefined) updateData.title = checklistUpdates.title;
      if (checklistUpdates.description !== undefined) updateData.description = checklistUpdates.description;
      if (checklistUpdates.frequency !== undefined) updateData.frequency = checklistUpdates.frequency;
      if (checklistUpdates.category !== undefined) updateData.category = checklistUpdates.category;
      if (checklistUpdates.isEditable !== undefined) updateData.isEditable = checklistUpdates.isEditable;
      if (checklistUpdates.timeWindowStart !== undefined) updateData.timeWindowStart = checklistUpdates.timeWindowStart;
      if (checklistUpdates.timeWindowEnd !== undefined) updateData.timeWindowEnd = checklistUpdates.timeWindowEnd;
      if (checklistUpdates.isActive !== undefined) updateData.isActive = checklistUpdates.isActive;

      let updatedChecklist = existingChecklist;
      if (Object.keys(updateData).length > 0) {
        const [updated] = await tx
          .update(checklists)
          .set(updateData)
          .where(eq(checklists.id, id))
          .returning();
        updatedChecklist = updated;
      }

      if (tasksPayload && Array.isArray(tasksPayload)) {
        const existingTasks = await tx
          .select()
          .from(checklistTasks)
          .where(eq(checklistTasks.checklistId, id));

        const existingTaskIds = existingTasks.map(t => t.id);
        const payloadTaskIds = tasksPayload
          .filter(t => t.id && t._action !== 'delete')
          .map(t => t.id as number);

        const tasksToInsert = tasksPayload.filter(t => !t.id && t._action !== 'delete');
        const tasksToUpdate = tasksPayload.filter(t => t.id && t._action !== 'delete');
        const tasksToDeleteIds = [
          ...tasksPayload.filter(t => t._action === 'delete' && t.id).map(t => t.id as number),
          ...existingTaskIds.filter(existingId => !payloadTaskIds.includes(existingId)),
        ];

        if (tasksToInsert.length > 0) {
          await tx.insert(checklistTasks).values(
            tasksToInsert.map(t => ({
              checklistId: id,
              taskDescription: t.taskDescription,
              requiresPhoto: t.requiresPhoto ?? false,
              order: t.order,
            }))
          );
        }

        if (tasksToUpdate.length > 0) {
          await Promise.all(
            tasksToUpdate.map(t =>
              tx
                .update(checklistTasks)
                .set({
                  taskDescription: t.taskDescription,
                  requiresPhoto: t.requiresPhoto ?? false,
                  order: t.order,
                })
                .where(eq(checklistTasks.id, t.id as number))
            )
          );
        }

        if (tasksToDeleteIds.length > 0) {
          await tx
            .delete(checklistTasks)
            .where(and(
              eq(checklistTasks.checklistId, id),
              inArray(checklistTasks.id, tasksToDeleteIds)
            ));
        }
      }

      return updatedChecklist;
    });
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

  async updateChecklistTask(id: number, updates: Partial<InsertChecklistTask>): Promise<ChecklistTask | undefined> {
    const [updated] = await db.update(checklistTasks)
      .set(updates)
      .where(eq(checklistTasks.id, id))
      .returning();
    return updated;
  }

  async deleteChecklistTask(id: number): Promise<void> {
    await db.delete(checklistTasks).where(eq(checklistTasks.id, id));
  }

  async deleteChecklist(id: number): Promise<void> {
    await db.delete(checklists).where(eq(checklists.id, id));
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
    const [newFault] = await db.insert(equipmentFaults).values(fault as any).returning();
    return newFault;
  }

  async updateFault(id: number, updates: Partial<InsertEquipmentFault>): Promise<EquipmentFault | undefined> {
    const [updated] = await db
      .update(equipmentFaults)
      .set({ ...updates, updatedAt: new Date() } as any)
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

  // Module Lesson operations
  async getModuleLessons(moduleId: number): Promise<ModuleLesson[]> {
    return db.select().from(moduleLessons).where(eq(moduleLessons.moduleId, moduleId)).orderBy(moduleLessons.orderIndex);
  }

  async getModuleLesson(id: number): Promise<ModuleLesson | undefined> {
    const [lesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, id));
    return lesson;
  }

  async createModuleLesson(lesson: InsertModuleLesson): Promise<ModuleLesson> {
    const [newLesson] = await db.insert(moduleLessons).values(lesson).returning();
    return newLesson;
  }

  async updateModuleLesson(id: number, updates: Partial<InsertModuleLesson>): Promise<ModuleLesson | undefined> {
    const [updated] = await db
      .update(moduleLessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(moduleLessons.id, id))
      .returning();
    return updated;
  }

  async deleteModuleLesson(id: number): Promise<void> {
    await db.delete(moduleLessons).where(eq(moduleLessons.id, id));
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
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        recipientRole: messages.recipientRole,
        subject: messages.subject,
        body: messages.body,
        type: messages.type,
        createdAt: messages.createdAt,
        isReadByUser: sql<boolean>`${messageReads.id} IS NOT NULL`,
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
      .orderBy(desc(messages.createdAt));

    // Map isReadByUser to isRead for compatibility
    return roleMessages.map((msg: any) => ({
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      recipientRole: msg.recipientRole,
      subject: msg.subject,
      body: msg.body,
      type: msg.type,
      createdAt: msg.createdAt,
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

  async getUnreadCount(userId: string, role?: string): Promise<number> {
    // Count unique threads where user is participant AND has unread messages
    const result = await db
      .selectDistinct({ threadId: messages.threadId })
      .from(messages)
      .innerJoin(
        threadParticipants,
        eq(threadParticipants.threadId, messages.threadId)
      )
      .where(
        and(
          eq(threadParticipants.userId, userId),
          sql`${messages.createdAt} > COALESCE(${threadParticipants.lastReadAt}, '1970-01-01'::timestamp)`
        )
      );
    return result.length;
  }

  // Thread-based message operations
  async listInboxThreads(userId: string, folder: 'inbox'|'sent'|'unread'): Promise<Array<{
    threadId: string;
    subject: string;
    lastMessageBody: string;
    lastMessageAt: Date;
    unreadCount: number;
    participants: Array<{userId: string; firstName: string; lastName: string}>;
  }>> {
    // Get all thread IDs for this user
    const userThreads = await db
      .select({ threadId: threadParticipants.threadId })
      .from(threadParticipants)
      .where(eq(threadParticipants.userId, userId));
    
    if (userThreads.length === 0) {
      return [];
    }
    
    const threadIds = userThreads.map(t => t.threadId);
    
    // Get latest message per thread with sender info
    const latestMessages = await db
      .select({
        threadId: messages.threadId,
        subject: messages.subject,
        body: messages.body,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          inArray(messages.threadId, threadIds),
          sql`${messages.id} IN (
            SELECT MAX(id) FROM ${messages} WHERE ${messages.threadId} IN (${sql.join(threadIds.map(id => sql`${id}`), sql`, `)})
            GROUP BY ${messages.threadId}
          )`
        )
      )
      .orderBy(desc(messages.createdAt));
    
    // Get unread count per thread
    const unreadCounts = await db
      .select({
        threadId: messages.threadId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .innerJoin(
        threadParticipants,
        eq(threadParticipants.threadId, messages.threadId)
      )
      .where(
        and(
          eq(threadParticipants.userId, userId),
          inArray(messages.threadId, threadIds),
          sql`${messages.createdAt} > COALESCE(${threadParticipants.lastReadAt}, '1970-01-01'::timestamp)`
        )
      )
      .groupBy(messages.threadId);
    
    const unreadMap = Object.fromEntries(
      unreadCounts.map(u => [u.threadId, Number(u.count)])
    );
    
    // Get all participants for these threads
    const allParticipants = await db
      .select({
        threadId: threadParticipants.threadId,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(threadParticipants)
      .innerJoin(users, eq(threadParticipants.userId, users.id))
      .where(inArray(threadParticipants.threadId, threadIds));
    
    const participantMap: Record<string, Array<{userId: string; firstName: string; lastName: string}>> = {};
    for (const p of allParticipants) {
      if (!participantMap[p.threadId]) {
        participantMap[p.threadId] = [];
      }
      participantMap[p.threadId].push({
        userId: p.userId!,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
      });
    }
    
    // Filter based on folder type
    let threads = latestMessages.map(m => ({
      threadId: m.threadId,
      subject: m.subject,
      lastMessageBody: m.body,
      lastMessageAt: m.createdAt,
      unreadCount: unreadMap[m.threadId] || 0,
      participants: participantMap[m.threadId] || [],
      senderId: m.senderId,
    }));
    
    if (folder === 'sent') {
      threads = threads.filter(t => t.senderId === userId);
    } else if (folder === 'unread') {
      threads = threads.filter(t => t.unreadCount > 0);
    } else if (folder === 'inbox') {
      threads = threads.filter(t => t.senderId !== userId || t.participants.length > 1);
    }
    
    return threads.map(({ senderId, ...t }) => t);
  }

  async getThread(threadId: string, userId: string): Promise<{messages: Message[], participants: ThreadParticipant[]}> {
    // SECURITY: First verify user is a participant in this thread
    const userParticipation = await db
      .select()
      .from(threadParticipants)
      .where(
        and(
          eq(threadParticipants.threadId, threadId),
          eq(threadParticipants.userId, userId)
        )
      )
      .limit(1);
    
    if (userParticipation.length === 0) {
      throw new Error("User is not a participant in this thread");
    }
    
    // Get all messages in thread
    const threadMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
    
    // Get all participants
    const participants = await db
      .select()
      .from(threadParticipants)
      .where(eq(threadParticipants.threadId, threadId));
    
    return {
      messages: threadMessages,
      participants,
    };
  }

  async markThreadRead(userId: string, threadId: string): Promise<void> {
    // Update lastReadAt for this user in thread participants
    await db
      .update(threadParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(threadParticipants.threadId, threadId),
          eq(threadParticipants.userId, userId)
        )
      );
  }

  // Equipment detail operations
  async getEquipmentDetail(id: number): Promise<Equipment | undefined> {
    return this.getEquipmentById(id);
  }

  async getEquipmentMaintenanceLogs(equipmentId: number): Promise<EquipmentMaintenanceLog[]> {
    return db.select().from(equipmentMaintenanceLogs)
      .where(eq(equipmentMaintenanceLogs.equipmentId, equipmentId))
      .orderBy(desc(equipmentMaintenanceLogs.performedAt));
  }

  async createEquipmentMaintenanceLog(log: InsertEquipmentMaintenanceLog): Promise<EquipmentMaintenanceLog> {
    const [newLog] = await db.insert(equipmentMaintenanceLogs).values(log).returning();
    return newLog;
  }

  async getEquipmentComments(equipmentId: number): Promise<EquipmentComment[]> {
    return db.select().from(equipmentComments)
      .where(eq(equipmentComments.equipmentId, equipmentId))
      .orderBy(desc(equipmentComments.createdAt));
  }

  async createEquipmentComment(comment: InsertEquipmentComment): Promise<EquipmentComment> {
    const [newComment] = await db.insert(equipmentComments).values(comment).returning();
    return newComment;
  }

  // Equipment Service Request operations
  async createServiceRequest(data: InsertEquipmentServiceRequest): Promise<EquipmentServiceRequest> {
    // Initialize timeline with creation entry
    const initialTimeline = [{
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: data.status || 'created',
      actorId: data.createdById,
      notes: 'Servis talebi oluşturuldu',
    }];

    const [newRequest] = await db
      .insert(equipmentServiceRequests)
      .values({
        ...data,
        timeline: initialTimeline,
      })
      .returning();
    return newRequest;
  }

  async getServiceRequest(id: number): Promise<EquipmentServiceRequest | undefined> {
    const [request] = await db
      .select()
      .from(equipmentServiceRequests)
      .where(eq(equipmentServiceRequests.id, id));
    return request;
  }

  async listServiceRequests(
    equipmentId?: number,
    status?: ServiceRequestStatusType
  ): Promise<EquipmentServiceRequest[]> {
    const conditions = [];
    if (equipmentId !== undefined) {
      conditions.push(eq(equipmentServiceRequests.equipmentId, equipmentId));
    }
    if (status !== undefined) {
      conditions.push(eq(equipmentServiceRequests.status, status));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(equipmentServiceRequests)
        .where(and(...conditions))
        .orderBy(desc(equipmentServiceRequests.createdAt));
    }
    return db
      .select()
      .from(equipmentServiceRequests)
      .orderBy(desc(equipmentServiceRequests.createdAt));
  }

  async updateServiceRequest(
    id: number,
    data: Partial<InsertEquipmentServiceRequest>
  ): Promise<EquipmentServiceRequest | undefined> {
    const [updated] = await db
      .update(equipmentServiceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(equipmentServiceRequests.id, id))
      .returning();
    return updated;
  }

  async deleteServiceRequest(id: number): Promise<void> {
    await db
      .delete(equipmentServiceRequests)
      .where(eq(equipmentServiceRequests.id, id));
  }

  async appendTimelineEntry(
    requestId: number,
    entry: {
      timestamp: string;
      status: ServiceRequestStatusType;
      actorId: string;
      notes?: string;
      meta?: Record<string, any>;
    }
  ): Promise<EquipmentServiceRequest | undefined> {
    const request = await this.getServiceRequest(requestId);
    if (!request) return undefined;

    const timelineEntry = {
      id: crypto.randomUUID(),
      ...entry,
    };

    const updatedTimeline = [...(request.timeline || []), timelineEntry];

    const [updated] = await db
      .update(equipmentServiceRequests)
      .set({
        timeline: updatedTimeline,
        updatedAt: new Date(),
      })
      .where(eq(equipmentServiceRequests.id, requestId))
      .returning();
    return updated;
  }

  async updateServiceRequestStatus(
    id: number,
    newStatus: ServiceRequestStatusType,
    actorId: string,
    notes?: string
  ): Promise<EquipmentServiceRequest | undefined> {
    const request = await this.getServiceRequest(id);
    if (!request) return undefined;

    const currentStatus = request.status as ServiceRequestStatusType;

    // State machine validation
    const validTransitions: Record<ServiceRequestStatusType, ServiceRequestStatusType[]> = {
      created: ['service_called', 'in_progress', 'closed'],
      service_called: ['in_progress', 'closed'],
      in_progress: ['fixed', 'not_fixed', 'warranty_claimed', 'device_shipped', 'closed'],
      fixed: ['in_progress', 'closed'],
      not_fixed: ['in_progress', 'closed'],
      warranty_claimed: ['in_progress', 'closed'],
      device_shipped: ['in_progress', 'closed'],
      closed: [], // Terminal state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Append timeline entry
    const updated = await this.appendTimelineEntry(id, {
      timestamp: new Date().toISOString(),
      status: newStatus,
      actorId,
      notes: notes || `Durum güncellendi: ${newStatus}`,
    });

    if (!updated) return undefined;

    // Update the status field
    const [finalUpdated] = await db
      .update(equipmentServiceRequests)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(equipmentServiceRequests.id, id))
      .returning();

    return finalUpdated;
  }

  // HQ Support Ticket operations
  async getHQSupportTickets(branchId?: number, status?: string): Promise<HQSupportTicket[]> {
    const conditions = [];
    if (branchId !== undefined) {
      conditions.push(eq(hqSupportTickets.branchId, branchId));
    }
    if (status !== undefined) {
      conditions.push(eq(hqSupportTickets.status, status));
    }
    
    if (conditions.length > 0) {
      return db.select().from(hqSupportTickets)
        .where(and(...conditions))
        .orderBy(desc(hqSupportTickets.createdAt));
    }
    return db.select().from(hqSupportTickets).orderBy(desc(hqSupportTickets.createdAt));
  }

  async getHQSupportTicket(id: number): Promise<HQSupportTicket | undefined> {
    const [ticket] = await db.select().from(hqSupportTickets).where(eq(hqSupportTickets.id, id));
    return ticket;
  }

  async createHQSupportTicket(ticket: InsertHQSupportTicket): Promise<HQSupportTicket> {
    const [newTicket] = await db.insert(hqSupportTickets).values(ticket).returning();
    return newTicket;
  }

  async updateHQSupportTicketStatus(id: number, status: string, closedBy?: string): Promise<HQSupportTicket | undefined> {
    const updates: any = { status };
    if (status === 'closed' && closedBy) {
      updates.closedAt = new Date();
      updates.closedBy = closedBy;
    }
    const [updated] = await db
      .update(hqSupportTickets)
      .set(updates)
      .where(eq(hqSupportTickets.id, id))
      .returning();
    return updated;
  }

  async getHQSupportMessages(ticketId: number): Promise<HQSupportMessage[]> {
    return db.select().from(hqSupportMessages)
      .where(eq(hqSupportMessages.ticketId, ticketId))
      .orderBy(hqSupportMessages.createdAt);
  }

  async createHQSupportMessage(message: InsertHQSupportMessage): Promise<HQSupportMessage> {
    const [newMessage] = await db.insert(hqSupportMessages).values(message).returning();
    return newMessage;
  }

  // Notification operations
  async getNotifications(userId: string, isRead?: boolean): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    return db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number, userId: string): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Announcement operations
  async getAnnouncements(userId: string, branchId: number | null, role: string): Promise<Announcement[]> {
    const allAnnouncements = await db.select().from(announcements)
      .where(sql`
        (${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > NOW())
      `)
      .orderBy(desc(announcements.publishedAt));

    return allAnnouncements.filter(announcement => {
      const targetRoles = announcement.targetRoles || [];
      const targetBranches = announcement.targetBranches || [];

      const roleMatches = targetRoles.length === 0 || targetRoles.includes(role);
      const branchMatches = targetBranches.length === 0 || (branchId !== null && targetBranches.includes(branchId));

      return roleMatches && branchMatches;
    });
  }

  async getAnnouncementById(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async addAnnouncementAttachments(id: number, attachments: string[]): Promise<Announcement | undefined> {
    const announcement = await this.getAnnouncementById(id);
    if (!announcement) return undefined;
    
    const existingAttachments = announcement.attachments || [];
    const updatedAttachments = Array.from(new Set([...existingAttachments, ...attachments]));
    
    const [updated] = await db
      .update(announcements)
      .set({ attachments: updatedAttachments })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async removeAnnouncementAttachment(id: number, attachmentUrl: string): Promise<Announcement | undefined> {
    const announcement = await this.getAnnouncementById(id);
    if (!announcement) return undefined;
    
    const existingAttachments = announcement.attachments || [];
    const updatedAttachments = existingAttachments.filter((url: string) => url !== attachmentUrl);
    
    const [updated] = await db
      .update(announcements)
      .set({ attachments: updatedAttachments })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // Daily Cash Report operations
  async getDailyCashReports(branchId?: number, dateFrom?: string, dateTo?: string): Promise<DailyCashReport[]> {
    const conditions = [];
    if (branchId !== undefined) {
      conditions.push(eq(dailyCashReports.branchId, branchId));
    }
    if (dateFrom) {
      conditions.push(sql`${dailyCashReports.reportDate} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${dailyCashReports.reportDate} <= ${dateTo}`);
    }

    return db.select()
      .from(dailyCashReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dailyCashReports.reportDate));
  }

  async getDailyCashReportById(id: number): Promise<DailyCashReport | undefined> {
    const [report] = await db.select().from(dailyCashReports).where(eq(dailyCashReports.id, id));
    return report;
  }

  async createDailyCashReport(report: InsertDailyCashReport): Promise<DailyCashReport> {
    const [newReport] = await db.insert(dailyCashReports).values(report).returning();
    return newReport;
  }

  async updateDailyCashReport(id: number, updates: Partial<InsertDailyCashReport>): Promise<DailyCashReport | undefined> {
    const [updated] = await db.update(dailyCashReports)
      .set(updates)
      .where(eq(dailyCashReports.id, id))
      .returning();
    return updated;
  }

  async deleteDailyCashReport(id: number): Promise<void> {
    await db.delete(dailyCashReports).where(eq(dailyCashReports.id, id));
  }

  // Shift operations
  async getShifts(branchId?: number, assignedToId?: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    const conditions = [];
    if (branchId !== undefined) {
      conditions.push(eq(shifts.branchId, branchId));
    }
    if (assignedToId) {
      conditions.push(eq(shifts.assignedToId, assignedToId));
    }
    if (dateFrom) {
      conditions.push(sql`${shifts.shiftDate} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${shifts.shiftDate} <= ${dateTo}`);
    }

    const results = await db.select({
      id: shifts.id,
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      shiftType: shifts.shiftType,
      status: shifts.status,
      notes: shifts.notes,
      branchId: shifts.branchId,
      assignedToId: shifts.assignedToId,
      createdById: shifts.createdById,
      createdAt: shifts.createdAt,
      updatedAt: shifts.updatedAt,
      branch: {
        id: branches.id,
        name: branches.name,
        city: branches.city,
        address: branches.address,
      },
      assignedTo: {
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      },
      createdBy: {
        id: sql<string>`created_by_user.id`,
        username: sql<string>`created_by_user.username`,
        email: sql<string>`created_by_user.email`,
        firstName: sql<string>`created_by_user.first_name`,
        lastName: sql<string>`created_by_user.last_name`,
        role: sql<string>`created_by_user.role`,
      },
    })
      .from(shifts)
      .leftJoin(branches, eq(shifts.branchId, branches.id))
      .leftJoin(users, eq(shifts.assignedToId, users.id))
      .leftJoin(sql`users AS created_by_user`, sql`${shifts.createdById} = created_by_user.id`)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shifts.shiftDate), shifts.startTime);

    return results;
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values({
      ...shift,
      updatedAt: new Date(),
    }).returning();
    return newShift;
  }

  async createShiftsBulk(params: BulkCreateShifts, createdById: string, preview?: boolean): Promise<Shift[]> {
    const { branchId, startDate, endDate, period, checklistId, openingHour, closingHour, shiftType } = params;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new Error("Start date must be before or equal to end date");
    }
    
    const days: Date[] = [];
    const current = new Date(start);
    const anchorDay = start.getDate(); // Persist original day-of-month across iterations
    
    // Period-based date advancement
    while (current <= end) {
      days.push(new Date(current));
      
      if (period === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (period === '2weekly') {
        current.setDate(current.getDate() + 14);
      } else if (period === 'monthly') {
        // Month-aware advancement: set to 1st, advance month, then clamp to anchorDay
        current.setDate(1); // Reset to 1st to prevent month overflow
        current.setMonth(current.getMonth() + 1); // Advance to next month
        // Clamp to last day of target month using persistent anchorDay
        const daysInTargetMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(anchorDay, daysInTargetMonth));
      } else {
        throw new Error(`Unsupported period: ${period}`);
      }
    }
    
    const shiftsToCreate: InsertShift[] = days.map(date => ({
      branchId,
      createdById,
      checklistId: checklistId ?? null,
      shiftDate: date.toISOString().split('T')[0],
      startTime: openingHour || '08:00',
      endTime: closingHour || '22:00',
      shiftType: shiftType || 'regular',
      status: 'draft',
      assignedToId: null,
      notes: null,
    }));
    
    if (preview) {
      return shiftsToCreate.map((shift, idx) => ({
        id: -(idx + 1),
        ...shift,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Shift));
    }
    
    const created = await db.insert(shifts).values(shiftsToCreate).returning();
    return created;
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updated] = await db.update(shifts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, id))
      .returning();
    return updated;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async setShiftChecklists(shiftId: number, checklistIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(shiftChecklists).where(eq(shiftChecklists.shiftId, shiftId));
      
      if (checklistIds.length > 0) {
        await tx.insert(shiftChecklists).values(
          checklistIds.map((checklistId: number) => ({
            shiftId,
            checklistId,
          }))
        );
      }
    });
  }

  async getShiftChecklists(shiftId: number): Promise<Checklist[]> {
    const checklistIds = await db
      .select({ checklistId: shiftChecklists.checklistId })
      .from(shiftChecklists)
      .where(eq(shiftChecklists.shiftId, shiftId));
    
    if (checklistIds.length === 0) return [];
    
    return db
      .select()
      .from(checklists)
      .where(sql`${checklists.id} IN ${sql.raw(`(${checklistIds.map((c: { checklistId: number }) => c.checklistId).join(',')})`)}`);
  }

  // Leave Request operations
  async getLeaveRequests(userId?: string, branchId?: number, status?: string): Promise<LeaveRequest[]> {
    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(leaveRequests.userId, userId));
    if (status) conditions.push(eq(leaveRequests.status, status));
    if (branchId) {
      const branchUsers = await db.select({ id: users.id }).from(users).where(eq(users.branchId, branchId));
      const userIds = branchUsers.map(u => u.id);
      if (userIds.length > 0) {
        conditions.push(inArray(leaveRequests.userId, userIds));
      } else {
        return []; // No users in branch
      }
    }
    return db.select().from(leaveRequests).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    // Calculate totalDays server-side (inclusive calendar days)
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    const [created] = await db.insert(leaveRequests).values({ ...request, totalDays }).returning();
    return created;
  }

  async updateLeaveRequest(id: number, updates: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    let finalUpdates = { ...updates };
    
    // Recalculate totalDays if dates are being updated
    if (updates.startDate || updates.endDate) {
      const [current] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
      if (current) {
        const start = new Date(updates.startDate || current.startDate);
        const end = new Date(updates.endDate || current.endDate);
        finalUpdates.totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      }
    }
    
    const [updated] = await db.update(leaveRequests).set({ ...finalUpdates, updatedAt: new Date() }).where(eq(leaveRequests.id, id)).returning();
    return updated;
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
  }

  // Shift Attendance operations
  async getShiftAttendances(shiftId?: number, userId?: string, dateFrom?: string, dateTo?: string): Promise<ShiftAttendance[]> {
    const conditions: SQL[] = [];
    if (shiftId) conditions.push(eq(shiftAttendance.shiftId, shiftId));
    if (userId) conditions.push(eq(shiftAttendance.userId, userId));
    if (dateFrom || dateTo) {
      const dateConditions: SQL[] = [];
      if (dateFrom) dateConditions.push(sql`${shifts.shiftDate} >= ${dateFrom}`);
      if (dateTo) dateConditions.push(sql`${shifts.shiftDate} <= ${dateTo}`);
      const attendanceIds = await db.select({ id: shiftAttendance.id }).from(shiftAttendance).innerJoin(shifts, eq(shiftAttendance.shiftId, shifts.id)).where(and(...dateConditions));
      const ids = attendanceIds.map(a => a.id);
      if (ids.length > 0) {
        conditions.push(inArray(shiftAttendance.id, ids));
      } else {
        return [];
      }
    }
    return db.select().from(shiftAttendance).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(shiftAttendance.createdAt));
  }

  async getShiftAttendance(id: number): Promise<ShiftAttendance | undefined> {
    const [attendance] = await db.select().from(shiftAttendance).where(eq(shiftAttendance.id, id));
    return attendance;
  }

  async createShiftAttendance(attendance: InsertShiftAttendance): Promise<ShiftAttendance> {
    const [created] = await db.insert(shiftAttendance).values(attendance).returning();
    return created;
  }

  async updateShiftAttendance(id: number, updates: Partial<InsertShiftAttendance>): Promise<ShiftAttendance | undefined> {
    // Calculate server-side minutes if timestamps provided
    let calculatedUpdates = { ...updates };
    
    // Get current record to merge timestamps
    const [current] = await db.select().from(shiftAttendance).where(eq(shiftAttendance.id, id));
    if (current) {
      const checkIn = updates.checkInTime || current.checkInTime;
      const checkOut = updates.checkOutTime || current.checkOutTime;
      const breakStart = updates.breakStartTime || current.breakStartTime;
      const breakEnd = updates.breakEndTime || current.breakEndTime;
      
      // Calculate break minutes if both timestamps exist
      if (breakStart && breakEnd) {
        calculatedUpdates.totalBreakMinutes = Math.floor((new Date(breakEnd).getTime() - new Date(breakStart).getTime()) / (60 * 1000));
      }
      
      // Calculate worked minutes if check-in/out exist
      if (checkIn && checkOut) {
        const totalMinutes = Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (60 * 1000));
        const breakMinutes = calculatedUpdates.totalBreakMinutes || current.totalBreakMinutes || 0;
        calculatedUpdates.totalWorkedMinutes = Math.max(0, totalMinutes - breakMinutes);
      }
    }
    
    const [updated] = await db.update(shiftAttendance).set({ ...calculatedUpdates, updatedAt: new Date() }).where(eq(shiftAttendance.id, id)).returning();
    return updated;
  }

  async deleteShiftAttendance(id: number): Promise<void> {
    await db.delete(shiftAttendance).where(eq(shiftAttendance.id, id));
  }

  // Shift Trade Request operations
  async createShiftTradeRequest(data: InsertShiftTradeRequest): Promise<ShiftTradeRequest> {
    const [created] = await db.insert(shiftTradeRequests).values(data).returning();
    return created;
  }

  async getShiftTradeRequests(filters: { branchId?: number; userId?: string; status?: string }): Promise<ShiftTradeRequest[]> {
    const conditions: SQL<unknown>[] = [];
    
    if (filters.status) {
      conditions.push(eq(shiftTradeRequests.status, filters.status));
    }
    
    if (filters.userId) {
      conditions.push(
        sql`${shiftTradeRequests.requesterId} = ${filters.userId} OR ${shiftTradeRequests.responderId} = ${filters.userId}`
      );
    }
    
    if (filters.branchId) {
      const shiftsInBranch = db
        .select({ id: shifts.id })
        .from(shifts)
        .where(eq(shifts.branchId, filters.branchId));
      
      conditions.push(
        sql`${shiftTradeRequests.requesterShiftId} IN ${shiftsInBranch} OR ${shiftTradeRequests.responderShiftId} IN ${shiftsInBranch}`
      );
    }
    
    if (conditions.length > 0) {
      return db.select().from(shiftTradeRequests).where(and(...conditions)).orderBy(desc(shiftTradeRequests.createdAt));
    }
    
    return db.select().from(shiftTradeRequests).orderBy(desc(shiftTradeRequests.createdAt));
  }

  async respondToShiftTradeRequest(id: number, userId: string): Promise<void> {
    await db
      .update(shiftTradeRequests)
      .set({
        status: 'calisan_onayi',
        responderConfirmedAt: new Date(),
      })
      .where(and(eq(shiftTradeRequests.id, id), eq(shiftTradeRequests.responderId, userId)));
  }

  async approveShiftTradeRequest(id: number, supervisorId: string, approved: boolean, notes?: string): Promise<void> {
    const [tradeRequest] = await db
      .select()
      .from(shiftTradeRequests)
      .where(eq(shiftTradeRequests.id, id));
    
    if (!tradeRequest) {
      throw new Error('Shift trade request not found');
    }
    
    if (approved) {
      const [requesterShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, tradeRequest.requesterShiftId));
      
      const [responderShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, tradeRequest.responderShiftId));
      
      if (!requesterShift || !responderShift) {
        throw new Error('One or both shifts not found');
      }
      
      await db.update(shifts)
        .set({ assignedToId: responderShift.assignedToId, updatedAt: new Date() })
        .where(eq(shifts.id, tradeRequest.requesterShiftId));
      
      await db.update(shifts)
        .set({ assignedToId: requesterShift.assignedToId, updatedAt: new Date() })
        .where(eq(shifts.id, tradeRequest.responderShiftId));
      
      await db
        .update(shiftTradeRequests)
        .set({
          status: 'yonetici_onayi',
          supervisorApprovedAt: new Date(),
          supervisorId,
          supervisorNotes: notes || null,
        })
        .where(eq(shiftTradeRequests.id, id));
    } else {
      await db
        .update(shiftTradeRequests)
        .set({
          status: 'reddedildi',
          supervisorApprovedAt: new Date(),
          supervisorId,
          supervisorNotes: notes || null,
        })
        .where(eq(shiftTradeRequests.id, id));
    }
  }

  async recordPerformanceScore(data: {
    branchId?: number;
    userId?: string;
    date: Date;
    taskScore: number;
    photoScore: number;
    timeScore: number;
    supervisorScore: number;
  }): Promise<PerformanceMetric> {
    const totalScore = Math.round(
      data.taskScore * 0.4 +
      data.photoScore * 0.25 +
      data.timeScore * 0.25 +
      data.supervisorScore * 0.1
    );

    const [metric] = await db.insert(performanceMetrics).values({
      branchId: data.branchId,
      userId: data.userId,
      date: data.date,
      taskScore: data.taskScore,
      photoScore: data.photoScore,
      timeScore: data.timeScore,
      supervisorScore: data.supervisorScore,
      totalScore,
    }).returning();
    
    return metric;
  }

  // Menu Management operations
  async listMenu(): Promise<{
    sections: MenuSection[];
    items: MenuItem[];
    rules: MenuVisibilityRule[];
  }> {
    const sections = await db.select().from(menuSections).orderBy(asc(menuSections.sortOrder));
    const items = await db.select().from(menuItems).orderBy(asc(menuItems.sectionId), asc(menuItems.sortOrder));
    const rules = await db.select().from(menuVisibilityRules);
    return { sections, items, rules };
  }

  async createMenuSection(data: InsertMenuSection): Promise<MenuSection> {
    // Auto-generate sortOrder (max + 1)
    const [maxSection] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${menuSections.sortOrder}), 0)` })
      .from(menuSections);
    const sortOrder = (maxSection?.maxOrder ?? 0) + 1;
    
    const [section] = await db.insert(menuSections).values({ ...data, sortOrder }).returning();
    return section;
  }

  async updateMenuSection(id: number, data: Partial<InsertMenuSection>): Promise<MenuSection> {
    const [updated] = await db.update(menuSections).set(data).where(eq(menuSections.id, id)).returning();
    if (!updated) {
      throw new Error(`Menu section ${id} not found`);
    }
    return updated;
  }

  async deleteMenuSection(id: number): Promise<void> {
    await db.delete(menuSections).where(eq(menuSections.id, id));
  }

  async reorderMenuSections(sectionIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < sectionIds.length; i++) {
        await tx.update(menuSections).set({ sortOrder: i + 1 }).where(eq(menuSections.id, sectionIds[i]));
      }
    });
  }

  async createMenuItem(data: InsertMenuItem): Promise<MenuItem> {
    // Auto-generate sortOrder within section (max + 1)
    const [maxItem] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${menuItems.sortOrder}), 0)` })
      .from(menuItems)
      .where(eq(menuItems.sectionId, data.sectionId));
    const sortOrder = (maxItem?.maxOrder ?? 0) + 1;
    
    const [item] = await db.insert(menuItems).values({ ...data, sortOrder }).returning();
    return item;
  }

  async updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    if (!updated) {
      throw new Error(`Menu item ${id} not found`);
    }
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async reorderMenuItems(sectionId: number, itemIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx.update(menuItems)
          .set({ sortOrder: i + 1 })
          .where(and(eq(menuItems.id, itemIds[i]), eq(menuItems.sectionId, sectionId)));
      }
    });
  }

  async createVisibilityRule(data: InsertMenuVisibilityRule): Promise<MenuVisibilityRule> {
    const [rule] = await db.insert(menuVisibilityRules).values(data).returning();
    return rule;
  }

  async deleteVisibilityRule(id: number): Promise<void> {
    await db.delete(menuVisibilityRules).where(eq(menuVisibilityRules.id, id));
  }

  // Page Content operations
  async listPageContent(): Promise<PageContent[]> {
    return await db.select().from(pageContent).orderBy(desc(pageContent.updatedAt));
  }

  async getPageContent(slug: string): Promise<PageContent | undefined> {
    const result = await db.select().from(pageContent).where(eq(pageContent.slug, slug)).limit(1);
    return result[0];
  }

  async createPageContent(data: InsertPageContent): Promise<PageContent> {
    const insertData: any = {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    };
    const [result] = await db.insert(pageContent).values(insertData).returning();
    return result!;
  }

  async updatePageContent(slug: string, data: Partial<InsertPageContent> & { updatedById: string }): Promise<PageContent> {
    // Increment version on update
    const existing = await this.getPageContent(slug);
    if (!existing) throw new Error("Content not found");
    
    const updateData: any = {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : data.publishedAt === null ? null : undefined,
      version: existing.version + 1,
      updatedAt: new Date(),
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const [result] = await db.update(pageContent)
      .set(updateData)
      .where(eq(pageContent.slug, slug))
      .returning();
    return result!;
  }

  async deletePageContent(slug: string): Promise<void> {
    await db.delete(pageContent).where(eq(pageContent.slug, slug));
  }

  // Branding operations
  async getBranding(): Promise<Branding | undefined> {
    const [brand] = await db.select().from(branding).limit(1);
    return brand;
  }

  async updateBrandingLogo(logoUrl: string, updatedById: string): Promise<Branding> {
    const existing = await this.getBranding();
    
    if (existing) {
      // Update existing branding row
      const [updated] = await db
        .update(branding)
        .set({ logoUrl, updatedById, updatedAt: new Date() })
        .where(eq(branding.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create first branding row (singleton pattern)
      const [created] = await db
        .insert(branding)
        .values({ logoUrl, updatedById })
        .returning();
      return created;
    }
  }

  // AI Usage Logging operations
  async logAiUsage(entry: InsertAiUsageLog): Promise<void> {
    await db.insert(aiUsageLogs).values(entry);
  }

  async getAiUsageAggregates(filters: {start?: Date; end?: Date}): Promise<{
    totalCost: number;
    monthToDateCost: number;
    dailyAverage: number;
    remainingBudget: number;
    costByFeature: Array<{feature: string; cost: number}>;
    costByModel: Array<{model: string; cost: number}>;
    last14Days: Array<{date: string; cost: number}>;
    cachedSavings: number;
  }> {
    const MONTHLY_BUDGET = 10.0; // $10 monthly budget
    
    // Calculate date ranges
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last14DaysStart = new Date(now);
    last14DaysStart.setDate(last14DaysStart.getDate() - 13); // Include today
    
    // Build WHERE conditions based on filters
    const conditions: SQL[] = [];
    if (filters.start) {
      conditions.push(sql`${aiUsageLogs.createdAt} >= ${filters.start}`);
    }
    if (filters.end) {
      conditions.push(sql`${aiUsageLogs.createdAt} <= ${filters.end}`);
    }
    
    // Total cost (with optional filters)
    const totalCostQuery = conditions.length > 0
      ? db.select({ total: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)` })
          .from(aiUsageLogs)
          .where(and(...conditions))
      : db.select({ total: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)` })
          .from(aiUsageLogs);
    
    // Month-to-date cost
    const monthToDateCostQuery = db.select({ total: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)` })
      .from(aiUsageLogs)
      .where(sql`${aiUsageLogs.createdAt} >= ${monthStart}`);
    
    // Cost by feature
    const costByFeatureQuery = db.select({
      feature: aiUsageLogs.feature,
      cost: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)`,
    })
      .from(aiUsageLogs)
      .groupBy(aiUsageLogs.feature)
      .orderBy(desc(sql<number>`SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL))`));
    
    // Cost by model
    const costByModelQuery = db.select({
      model: aiUsageLogs.model,
      cost: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)`,
    })
      .from(aiUsageLogs)
      .groupBy(aiUsageLogs.model)
      .orderBy(desc(sql<number>`SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL))`));
    
    // Last 14 days trend
    const last14DaysQuery = db.select({
      date: sql<string>`DATE(${aiUsageLogs.createdAt})`,
      cost: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)`,
    })
      .from(aiUsageLogs)
      .where(sql`${aiUsageLogs.createdAt} >= ${last14DaysStart}`)
      .groupBy(sql`DATE(${aiUsageLogs.createdAt})`)
      .orderBy(asc(sql`DATE(${aiUsageLogs.createdAt})`));
    
    // Cached savings (cost that would have been incurred if cache wasn't hit)
    const cachedSavingsQuery = db.select({ 
      savings: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)` 
    })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.cachedHit, true));
    
    // Execute all queries
    const totalCostResults = await totalCostQuery;
    const monthToDateResults = await monthToDateCostQuery;
    const costByFeature = await costByFeatureQuery;
    const costByModel = await costByModelQuery;
    const last14Days = await last14DaysQuery;
    const cachedSavingsResults = await cachedSavingsQuery;
    
    const totalCost = Number(totalCostResults[0]?.total || 0);
    const monthToDateCost = Number(monthToDateResults[0]?.total || 0);
    const cachedSavings = Number(cachedSavingsResults[0]?.savings || 0);
    
    // Calculate daily average (based on days elapsed in current month)
    const dayOfMonth = now.getDate();
    const dailyAverage = dayOfMonth > 0 ? monthToDateCost / dayOfMonth : 0;
    
    // Calculate remaining budget
    const remainingBudget = Math.max(0, MONTHLY_BUDGET - monthToDateCost);
    
    return {
      totalCost,
      monthToDateCost,
      dailyAverage,
      remainingBudget,
      costByFeature: costByFeature.map(row => ({
        feature: row.feature,
        cost: Number(row.cost),
      })),
      costByModel: costByModel.map(row => ({
        model: row.model,
        cost: Number(row.cost),
      })),
      last14Days: last14Days.map(row => ({
        date: row.date,
        cost: Number(row.cost),
      })),
      cachedSavings,
    };
  }

  // ==================== SHIFT TEMPLATES ====================
  
  async getShiftTemplates(branchId?: number): Promise<ShiftTemplate[]> {
    if (branchId) {
      return db.select().from(shiftTemplates).where(eq(shiftTemplates.branchId, branchId)).orderBy(desc(shiftTemplates.createdAt));
    }
    return db.select().from(shiftTemplates).orderBy(desc(shiftTemplates.createdAt));
  }

  async getShiftTemplate(id: number): Promise<ShiftTemplate | undefined> {
    const [template] = await db.select().from(shiftTemplates).where(eq(shiftTemplates.id, id));
    return template;
  }

  async createShiftTemplate(template: InsertShiftTemplate): Promise<ShiftTemplate> {
    const [created] = await db.insert(shiftTemplates).values(template).returning();
    return created;
  }

  async updateShiftTemplate(id: number, updates: Partial<InsertShiftTemplate>): Promise<ShiftTemplate | undefined> {
    const [updated] = await db.update(shiftTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shiftTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteShiftTemplate(id: number): Promise<void> {
    await db.delete(shiftTemplates).where(eq(shiftTemplates.id, id));
  }

  async createShiftsFromTemplate(templateId: number, startDate: string, endDate: string, createdById: string): Promise<Shift[]> {
    const template = await this.getShiftTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const shiftsToCreate: InsertShift[] = [];

    // Iterate through date range
    for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 6=Saturday
      
      // Check if this day is included in the template
      if (template.daysOfWeek && template.daysOfWeek.includes(dayOfWeek)) {
        shiftsToCreate.push({
          branchId: template.branchId,
          createdById,
          shiftDate: currentDate.toISOString().split('T')[0],
          startTime: template.startTime,
          endTime: template.endTime,
          shiftType: template.shiftType as "morning" | "evening" | "night",
          status: "draft",
          assignedToId: null,
          checklistId: null,
          notes: `Şablondan oluşturuldu: ${template.name}`,
        });
      }
    }

    if (shiftsToCreate.length === 0) {
      return [];
    }

    // Bulk insert shifts
    const created = await db.insert(shifts).values(shiftsToCreate).returning();
    return created;
  }

  // ==================== EMPLOYEE AVAILABILITY ====================
  
  async getEmployeeAvailability(userId?: string, startDate?: string, endDate?: string): Promise<EmployeeAvailability[]> {
    const conditions: SQL[] = [];
    
    if (userId) conditions.push(eq(employeeAvailability.userId, userId));
    if (startDate) conditions.push(sql`${employeeAvailability.endDate} >= ${startDate}`);
    if (endDate) conditions.push(sql`${employeeAvailability.startDate} <= ${endDate}`);
    
    return db.select()
      .from(employeeAvailability)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(employeeAvailability.startDate));
  }

  async getAvailability(id: number): Promise<EmployeeAvailability | undefined> {
    const [availability] = await db.select().from(employeeAvailability).where(eq(employeeAvailability.id, id));
    return availability;
  }

  async createAvailability(availability: InsertEmployeeAvailability): Promise<EmployeeAvailability> {
    const [created] = await db.insert(employeeAvailability).values(availability).returning();
    return created;
  }

  async updateAvailability(id: number, updates: Partial<InsertEmployeeAvailability>): Promise<EmployeeAvailability | undefined> {
    const [updated] = await db.update(employeeAvailability)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(employeeAvailability.id, id))
      .returning();
    return updated;
  }

  async deleteAvailability(id: number): Promise<void> {
    await db.delete(employeeAvailability).where(eq(employeeAvailability.id, id));
  }

  async checkEmployeeAvailability(userId: string, shiftDate: string, startTime: string, endTime: string): Promise<{ available: boolean; conflicts: EmployeeAvailability[] }> {
    // Find any availability records that conflict with the proposed shift
    const conflicts = await db.select()
      .from(employeeAvailability)
      .where(
        and(
          eq(employeeAvailability.userId, userId),
          eq(employeeAvailability.status, "active"),
          sql`${employeeAvailability.startDate} <= ${shiftDate}`,
          sql`${employeeAvailability.endDate} >= ${shiftDate}`
        )
      );

    // If no date conflicts, employee is available
    if (conflicts.length === 0) {
      return { available: true, conflicts: [] };
    }

    // Check time conflicts for partial-day unavailability
    const timeConflicts = conflicts.filter(conflict => {
      if (conflict.isAllDay) return true;
      if (!conflict.startTime || !conflict.endTime) return true;

      // Check if shift time overlaps with unavailable time
      const shiftStart = startTime;
      const shiftEnd = endTime;
      const unavailStart = conflict.startTime;
      const unavailEnd = conflict.endTime;

      return (
        (shiftStart >= unavailStart && shiftStart < unavailEnd) ||
        (shiftEnd > unavailStart && shiftEnd <= unavailEnd) ||
        (shiftStart <= unavailStart && shiftEnd >= unavailEnd)
      );
    });

    return {
      available: timeConflicts.length === 0,
      conflicts: timeConflicts,
    };
  }

  // ==================== CHECK-IN/CHECK-OUT HELPERS ====================
  
  async verifyShiftQR(qrData: string): Promise<{ valid: boolean; shiftId?: number; message?: string }> {
    try {
      // QR data format: "SHIFT:{shiftId}:{timestamp}"
      const parts = qrData.split(':');
      if (parts[0] !== 'SHIFT' || parts.length !== 3) {
        return { valid: false, message: "Geçersiz QR kod formatı" };
      }

      const shiftId = parseInt(parts[1]);
      const timestamp = parseInt(parts[2]);
      
      // Check if QR code is too old (>24 hours)
      const now = Date.now();
      const qrAge = now - timestamp;
      if (qrAge > 24 * 60 * 60 * 1000) {
        return { valid: false, message: "QR kod süresi dolmuş" };
      }

      // Verify shift exists
      const shift = await this.getShift(shiftId);
      if (!shift) {
        return { valid: false, message: "Vardiya bulunamadı" };
      }

      return { valid: true, shiftId };
    } catch (error) {
      return { valid: false, message: "QR kod okunamadı" };
    }
  }

  async calculateAttendanceStats(userId: string, month?: number, year?: number): Promise<{ totalShifts: number; attended: number; late: number; absent: number }> {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]; // Last day of month

    // Get all shifts for user in date range
    const userShifts = await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.assignedToId, userId),
          sql`${shifts.shiftDate} >= ${startDate}`,
          sql`${shifts.shiftDate} <= ${endDate}`
        )
      );

    const totalShifts = userShifts.length;

    // Get attendance records for these shifts
    const shiftIds = userShifts.map(s => s.id);
    if (shiftIds.length === 0) {
      return { totalShifts: 0, attended: 0, late: 0, absent: 0 };
    }

    const attendances = await db.select()
      .from(shiftAttendance)
      .where(
        and(
          inArray(shiftAttendance.shiftId, shiftIds),
          eq(shiftAttendance.userId, userId)
        )
      );

    let attended = 0;
    let late = 0;
    let absent = 0;

    for (const attendance of attendances) {
      if (attendance.status === 'absent') {
        absent++;
      } else if (attendance.status === 'checked_in' || attendance.status === 'checked_out') {
        attended++;
        if (attendance.status === 'late') {
          late++;
        }
      }
    }

    // Count shifts without attendance records as absent
    absent += (totalShifts - attendances.length);

    return { totalShifts, attended, late, absent };
  }

  // ==================== SHIFT NOTIFICATION HELPERS ====================
  
  async sendShiftReminders(): Promise<void> {
    // Find shifts starting in the next 1-2 hours that haven't been reminded yet
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    const oneHourTime = oneHourLater.toTimeString().split(' ')[0].substring(0, 5);
    const twoHoursTime = twoHoursLater.toTimeString().split(' ')[0].substring(0, 5);
    
    // Get upcoming shifts for today
    const upcomingShifts = await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.shiftDate, today),
          sql`${shifts.startTime} >= ${oneHourTime}`,
          sql`${shifts.startTime} <= ${twoHoursTime}`,
          eq(shifts.status, 'confirmed'),
          sql`${shifts.assignedToId} IS NOT NULL`
        )
      );
    
    for (const shift of upcomingShifts) {
      if (!shift.assignedToId) continue;
      
      // Check if we already sent a reminder for this shift
      const existingReminder = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, shift.assignedToId),
            eq(notifications.type, 'shift_reminder'),
            sql`${notifications.metadata}->>'shiftId' = ${shift.id.toString()}`
          )
        );
      
      if (existingReminder.length > 0) continue;
      
      // Send reminder notification
      await this.createNotification({
        userId: shift.assignedToId,
        type: 'shift_reminder',
        title: 'Vardiya Hatırlatması',
        message: `Vardiyanz ${shift.startTime} - ${shift.endTime} saatleri arasında başlayacak.`,
        metadata: { shiftId: shift.id },
      });
    }
  }

  async notifyShiftChange(shiftId: number, changeType: 'updated' | 'assigned' | 'cancelled', notes?: string): Promise<void> {
    const shift = await this.getShift(shiftId);
    if (!shift || !shift.assignedToId) return;
    
    let title = '';
    let message = '';
    
    switch (changeType) {
      case 'assigned':
        title = 'Yeni Vardiya Ataması';
        message = `Size ${shift.shiftDate} tarihinde ${shift.startTime} - ${shift.endTime} saatleri arasında bir vardiya atandı.`;
        break;
      case 'updated':
        title = 'Vardiya Güncellendi';
        message = `${shift.shiftDate} tarihli vardiyanz güncellendi. Detayları kontrol edin.`;
        break;
      case 'cancelled':
        title = 'Vardiya İptal Edildi';
        message = `${shift.shiftDate} tarihli vardiyanz iptal edildi.`;
        break;
    }
    
    if (notes) {
      message += ` Not: ${notes}`;
    }
    
    await this.createNotification({
      userId: shift.assignedToId,
      type: 'shift_change',
      title,
      message,
      metadata: { shiftId, changeType },
    });
  }

  // Customer Feedback operations
  async getCustomerFeedback(branchId?: number, status?: string): Promise<CustomerFeedback[]> {
    const conditions: SQL[] = [];
    if (branchId !== undefined) conditions.push(eq(customerFeedback.branchId, branchId));
    if (status) conditions.push(eq(customerFeedback.status, status));
    
    return await db.select()
      .from(customerFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customerFeedback.feedbackDate));
  }

  async createCustomerFeedback(data: InsertCustomerFeedback): Promise<CustomerFeedback> {
    const [feedback] = await db.insert(customerFeedback).values(data).returning();
    return feedback;
  }

  async updateCustomerFeedbackStatus(id: number, status: string, reviewedById: string, reviewNotes?: string): Promise<CustomerFeedback | undefined> {
    const [updated] = await db.update(customerFeedback)
      .set({
        status,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(customerFeedback.id, id))
      .returning();
    return updated;
  }

  // Site Settings operations
  async getSiteSettings(category?: string): Promise<SiteSetting[]> {
    if (category) {
      return await db.select()
        .from(siteSettings)
        .where(eq(siteSettings.category, category))
        .orderBy(asc(siteSettings.key));
    }
    return await db.select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.category), asc(siteSettings.key));
  }

  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key));
    return setting;
  }

  async updateSiteSetting(key: string, value: string, updatedBy: string): Promise<SiteSetting> {
    const [updated] = await db.update(siteSettings)
      .set({
        value,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.key, key))
      .returning();
    return updated;
  }

  async createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    const [created] = await db.insert(siteSettings)
      .values(setting)
      .returning();
    return created;
  }

  async deleteSiteSetting(key: string): Promise<void> {
    await db.delete(siteSettings)
      .where(eq(siteSettings.key, key));
  }

  async calculateAndApplyPenalties(shiftAttendanceId: number): Promise<ShiftAttendance | undefined> {
    const [attendance] = await db.select()
      .from(shiftAttendance)
      .where(eq(shiftAttendance.id, shiftAttendanceId));
    
    if (!attendance) return undefined;
    if (!attendance.checkOutTime) {
      throw new Error("Cannot calculate penalties: Check-out time is missing");
    }
    if (!attendance.scheduledStartTime || !attendance.scheduledEndTime) {
      throw new Error("Cannot calculate penalties: Scheduled times are missing");
    }

    const penalties: InsertAttendancePenalty[] = [];
    let totalPenaltyMinutes = 0;
    
    const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : null;
    const checkOutTime = new Date(attendance.checkOutTime);
    const scheduledStart = new Date(attendance.scheduledStartTime);
    const scheduledEnd = new Date(attendance.scheduledEndTime);
    
    let latenessMinutes = 0;
    if (checkInTime && checkInTime > scheduledStart) {
      latenessMinutes = Math.floor((checkInTime.getTime() - scheduledStart.getTime()) / (1000 * 60));
      let penaltyMinutes = 0;
      
      if (latenessMinutes >= 1 && latenessMinutes <= 10) {
        penaltyMinutes = 30;
      } else if (latenessMinutes > 10 && latenessMinutes <= 30) {
        penaltyMinutes = 60;
      } else if (latenessMinutes > 30) {
        penaltyMinutes = Math.floor(latenessMinutes * 2);
      }
      
      if (penaltyMinutes > 0) {
        totalPenaltyMinutes += penaltyMinutes;
        penalties.push({
          shiftAttendanceId,
          type: "lateness",
          minutes: penaltyMinutes,
          reason: `${latenessMinutes} dakika geç kalma`,
          autoGenerated: true,
        });
      }
    }
    
    let earlyLeaveMinutes = 0;
    if (checkOutTime < scheduledEnd) {
      earlyLeaveMinutes = Math.floor((scheduledEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
      if (earlyLeaveMinutes > 0) {
        totalPenaltyMinutes += earlyLeaveMinutes;
        penalties.push({
          shiftAttendanceId,
          type: "early_leave",
          minutes: earlyLeaveMinutes,
          reason: `${earlyLeaveMinutes} dakika erken çıkış`,
          autoGenerated: true,
        });
      }
    }
    
    const breakPlanned = attendance.breakPlannedMinutes || 60;
    const breakTaken = attendance.breakTakenMinutes || 0;
    let breakOverageMinutes = 0;
    
    if (breakTaken > breakPlanned) {
      breakOverageMinutes = breakTaken - breakPlanned;
      totalPenaltyMinutes += breakOverageMinutes;
      penalties.push({
        shiftAttendanceId,
        type: "break_overage",
        minutes: breakOverageMinutes,
        reason: `${breakOverageMinutes} dakika mola aşımı`,
        autoGenerated: true,
      });
    }
    
    // FIXED: Calculate totalWorkedMinutes from timestamps instead of using stored value
    // This prevents negative effectiveWorkMinutes and ensures accurate penalty application
    let totalWorkedMinutes = 0;
    if (checkInTime) {
      const rawWorkedMs = checkOutTime.getTime() - checkInTime.getTime();
      const rawWorkedMinutes = Math.floor(rawWorkedMs / (1000 * 60));
      totalWorkedMinutes = Math.max(0, rawWorkedMinutes - breakTaken);
    }
    
    const effectiveWorkMinutes = Math.max(0, totalWorkedMinutes - totalPenaltyMinutes);
    
    const currentComplianceScore = attendance.complianceScore || 100;
    let newComplianceScore = currentComplianceScore;
    
    if (totalPenaltyMinutes > 0) {
      newComplianceScore = Math.max(0, newComplianceScore - (penalties.length * 5));
    } else {
      newComplianceScore = Math.min(100, newComplianceScore + 2);
    }
    
    // FIXED: Wrap penalty insertion and attendance update in transaction
    // This ensures atomicity - either both succeed or both fail (no partial writes)
    return await db.transaction(async (tx) => {
      if (penalties.length > 0) {
        await tx.insert(attendancePenalties).values(penalties);
      }
      
      const [updated] = await tx.update(shiftAttendance)
        .set({
          latenessMinutes,
          earlyLeaveMinutes,
          penaltyMinutes: totalPenaltyMinutes,
          effectiveWorkMinutes,
          complianceScore: newComplianceScore,
          totalWorkedMinutes, // Update with recalculated value
        })
        .where(eq(shiftAttendance.id, shiftAttendanceId))
        .returning();
      
      return updated;
    });
  }

  async getAttendancePenalties(shiftAttendanceId: number): Promise<AttendancePenalty[]> {
    return await db.select()
      .from(attendancePenalties)
      .where(eq(attendancePenalties.shiftAttendanceId, shiftAttendanceId))
      .orderBy(desc(attendancePenalties.createdAt));
  }

  async createManualPenalty(data: InsertAttendancePenalty): Promise<AttendancePenalty> {
    // FIXED: Wrap penalty creation and attendance update in transaction
    return await db.transaction(async (tx) => {
      const [penalty] = await tx.insert(attendancePenalties)
        .values({ ...data, autoGenerated: false })
        .returning();
      
      const [attendance] = await tx.select()
        .from(shiftAttendance)
        .where(eq(shiftAttendance.id, data.shiftAttendanceId));
      
      if (attendance) {
        const currentPenalty = attendance.penaltyMinutes || 0;
        const currentCompliance = attendance.complianceScore || 100;
        
        // FIXED: Recalculate effectiveWorkMinutes from timestamps instead of stored value
        // This keeps manual penalties consistent with automatic penalty calculation
        let totalWorkedMinutes = 0;
        if (attendance.checkInTime && attendance.checkOutTime) {
          const checkIn = new Date(attendance.checkInTime);
          const checkOut = new Date(attendance.checkOutTime);
          const breakTaken = attendance.breakTakenMinutes || 0;
          const rawWorkedMs = checkOut.getTime() - checkIn.getTime();
          const rawWorkedMinutes = Math.floor(rawWorkedMs / (1000 * 60));
          totalWorkedMinutes = Math.max(0, rawWorkedMinutes - breakTaken);
        }
        
        const newPenaltyMinutes = currentPenalty + data.minutes;
        const newEffectiveWorkMinutes = Math.max(0, totalWorkedMinutes - newPenaltyMinutes);
        
        await tx.update(shiftAttendance)
          .set({
            penaltyMinutes: newPenaltyMinutes,
            effectiveWorkMinutes: newEffectiveWorkMinutes,
            complianceScore: Math.max(0, currentCompliance - 5),
            totalWorkedMinutes, // Update with recalculated value
          })
          .where(eq(shiftAttendance.id, data.shiftAttendanceId));
      }
      
      return penalty;
    });
  }

  async getOvertimeRequests(userId?: string, status?: string): Promise<OvertimeRequest[]> {
    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(overtimeRequests.userId, userId));
    if (status) conditions.push(eq(overtimeRequests.status, status));
    
    return await db.select()
      .from(overtimeRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(overtimeRequests.createdAt));
  }

  async createOvertimeRequest(data: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [request] = await db.insert(overtimeRequests)
      .values(data)
      .returning();
    return request;
  }

  async updateOvertimeRequest(
    id: number, 
    updates: { status: string; approverId?: string; approvedMinutes?: number; rejectionReason?: string }
  ): Promise<OvertimeRequest | undefined> {
    const [updated] = await db.update(overtimeRequests)
      .set({
        ...updates,
        approvedAt: updates.status === "approved" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, id))
      .returning();
    return updated;
  }

  async getMonthlyAttendanceSummary(userId: string, periodMonth: string): Promise<MonthlyAttendanceSummary | undefined> {
    const [summary] = await db.select()
      .from(monthlyAttendanceSummaries)
      .where(and(
        eq(monthlyAttendanceSummaries.userId, userId),
        eq(monthlyAttendanceSummaries.periodMonth, periodMonth)
      ));
    return summary;
  }

  async generateMonthlyAttendanceSummary(userId: string, periodMonth: string): Promise<MonthlyAttendanceSummary> {
    const startDate = new Date(periodMonth + "-01");
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
    
    const attendances = await db.select()
      .from(shiftAttendance)
      .innerJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
      .where(and(
        eq(shiftAttendance.userId, userId),
        sql`${shifts.shiftDate} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${shifts.shiftDate} <= ${endDate.toISOString().split('T')[0]}`
      ));
    
    let totalScheduledMinutes = 0;
    let totalWorkedMinutes = 0;
    let totalPenaltyMinutes = 0;
    let latenessCount = 0;
    let earlyLeaveCount = 0;
    let complianceScoreSum = 0;
    let attendanceCount = 0;
    
    for (const record of attendances) {
      const att = record.shift_attendance;
      if (att.scheduledStartTime && att.scheduledEndTime) {
        const scheduled = (new Date(att.scheduledEndTime).getTime() - new Date(att.scheduledStartTime).getTime()) / (1000 * 60);
        totalScheduledMinutes += scheduled;
      }
      totalWorkedMinutes += att.totalWorkedMinutes || 0;
      totalPenaltyMinutes += att.penaltyMinutes || 0;
      if ((att.latenessMinutes || 0) > 0) latenessCount++;
      if ((att.earlyLeaveMinutes || 0) > 0) earlyLeaveCount++;
      complianceScoreSum += att.complianceScore || 100;
      attendanceCount++;
    }
    
    const complianceScoreAvg = attendanceCount > 0 ? Math.round(complianceScoreSum / attendanceCount) : 100;
    
    const [existing] = await db.select()
      .from(monthlyAttendanceSummaries)
      .where(and(
        eq(monthlyAttendanceSummaries.userId, userId),
        eq(monthlyAttendanceSummaries.periodMonth, periodMonth)
      ));
    
    if (existing) {
      const [updated] = await db.update(monthlyAttendanceSummaries)
        .set({
          totalScheduledMinutes,
          totalWorkedMinutes,
          totalPenaltyMinutes,
          latenessCount,
          earlyLeaveCount,
          complianceScoreAvg,
          updatedAt: new Date(),
        })
        .where(eq(monthlyAttendanceSummaries.id, existing.id))
        .returning();
      return updated;
    }
    
    const [summary] = await db.insert(monthlyAttendanceSummaries)
      .values({
        userId,
        periodMonth,
        totalScheduledMinutes,
        totalWorkedMinutes,
        totalPenaltyMinutes,
        totalOvertimeMinutes: 0,
        latenessCount,
        earlyLeaveCount,
        complianceScoreAvg,
      })
      .returning();
    
    return summary;
  }

  async getGuestComplaints(branchId?: number, status?: string, priority?: string): Promise<GuestComplaint[]> {
    const conditions: SQL[] = [];
    if (branchId !== undefined) conditions.push(eq(guestComplaints.branchId, branchId));
    if (status) conditions.push(eq(guestComplaints.status, status));
    if (priority) conditions.push(eq(guestComplaints.priority, priority));
    
    return await db.select()
      .from(guestComplaints)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(guestComplaints.complaintDate));
  }

  async createGuestComplaint(data: InsertGuestComplaint): Promise<GuestComplaint> {
    let responseDeadline: Date | null = null;
    
    if (data.priority === "critical") {
      responseDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    } else if (data.priority === "high") {
      responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    } else if (data.priority === "medium") {
      responseDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    } else {
      responseDeadline = new Date(Date.now() + 96 * 60 * 60 * 1000); // 96 hours (low)
    }
    
    const [complaint] = await db.insert(guestComplaints)
      .values({
        ...data,
        responseDeadline,
      })
      .returning();
    
    return complaint;
  }

  async updateGuestComplaint(id: number, updates: Partial<InsertGuestComplaint>): Promise<GuestComplaint | undefined> {
    const [updated] = await db.update(guestComplaints)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(guestComplaints.id, id))
      .returning();
    return updated;
  }

  async resolveGuestComplaint(id: number, resolvedById: string, resolutionNotes: string, customerSatisfaction?: number): Promise<GuestComplaint | undefined> {
    const [updated] = await db.update(guestComplaints)
      .set({
        status: "resolved",
        resolvedById,
        resolvedAt: new Date(),
        resolutionNotes,
        customerSatisfaction,
        updatedAt: new Date(),
      })
      .where(eq(guestComplaints.id, id))
      .returning();
    return updated;
  }

  async checkSLABreaches(): Promise<void> {
    const now = new Date();
    
    // Get all active complaints with deadlines
    const activeComplaints = await db.select()
      .from(guestComplaints)
      .where(and(
        sql`${guestComplaints.status} NOT IN ('resolved', 'closed')`,
        sql`${guestComplaints.responseDeadline} IS NOT NULL`
      ));
    
    for (const complaint of activeComplaints) {
      const deadline = new Date(complaint.responseDeadline!);
      const timeToDeadline = deadline.getTime() - now.getTime();
      const totalTime = deadline.getTime() - new Date(complaint.complaintDate).getTime();
      const percentRemaining = (timeToDeadline / totalTime) * 100;
      
      // 100% breach - deadline passed
      if (timeToDeadline <= 0 && !complaint.slaBreached) {
        await db.update(guestComplaints)
          .set({
            slaBreached: true,
            updatedAt: new Date(),
          })
          .where(eq(guestComplaints.id, complaint.id));
        
        // Send breach notification to branch supervisor and HQ
        await this.createNotification({
          userId: 'system',
          title: "SLA İhlali: Şikayet Süresi Doldu",
          message: `Şikayet #${complaint.id} yanıt süresi aşıldı. Acil müdahale gerekiyor! Şube: ${complaint.branchId}, Öncelik: ${complaint.priority}`,
          type: "alert",
          link: `/sikayetler/${complaint.id}`,
        });
      }
      // 80% escalation - 20% time remaining
      else if (percentRemaining <= 20 && percentRemaining > 0 && !complaint.slaBreached) {
        // Check if escalation notification already sent (prevent spam)
        const existingEscalation = await db.select()
          .from(notifications)
          .where(and(
            sql`${notifications.type} = 'warning'`,
            sql`${notifications.link} = '/sikayetler/${complaint.id}'`,
            sql`${notifications.message} LIKE '%80% yaklaştı%'`
          ))
          .limit(1);
        
        if (existingEscalation.length === 0) {
          // Send 80% escalation warning
          await this.createNotification({
            userId: 'system',
            title: "SLA Uyarısı: Süre Azalıyor",
            message: `Şikayet #${complaint.id} yanıt süresinin %80'ine yaklaştı. Kalan süre: ${Math.ceil(timeToDeadline / (1000 * 60 * 60))} saat. Şube: ${complaint.branchId}, Öncelik: ${complaint.priority}`,
            type: "warning",
            link: `/sikayetler/${complaint.id}`,
          });
        }
      }
    }
  }

  async getGuestComplaintStats(branchId?: number, startDate?: Date, endDate?: Date): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const start = startDate || thirtyDaysAgo;
    const end = endDate || new Date();
    
    const whereConditions = [
      sql`${guestComplaints.complaintDate} >= ${start.toISOString()}`,
      sql`${guestComplaints.complaintDate} <= ${end.toISOString()}`
    ];
    
    if (branchId !== undefined) {
      whereConditions.push(eq(guestComplaints.branchId, branchId));
    }
    
    const complaints = await db.select()
      .from(guestComplaints)
      .where(and(...whereConditions));
    
    const total = complaints.length;
    const byStatus = complaints.reduce((acc: any, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    const byPriority = complaints.reduce((acc: any, c: any) => {
      acc[c.priority] = (acc[c.priority] || 0) + 1;
      return acc;
    }, {});
    const slaBreachCount = complaints.filter((c: any) => c.slaBreached).length;
    const resolved = complaints.filter((c: any) => c.resolvedAt);
    const avgResolutionTime = resolved.length > 0
      ? resolved.reduce((sum: number, c: any) => {
          const diff = new Date(c.resolvedAt).getTime() - new Date(c.complaintDate).getTime();
          return sum + diff;
        }, 0) / resolved.length / (1000 * 60 * 60)
      : 0;
    
    return {
      total,
      byStatus,
      byPriority,
      slaBreachCount,
      avgResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10,
    };
  }

  async getGuestComplaintHeatmap(branchId?: number, startDate?: Date, endDate?: Date): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const start = startDate || thirtyDaysAgo;
    const end = endDate || new Date();
    
    const whereConditions = [
      sql`${guestComplaints.complaintDate} >= ${start.toISOString()}`,
      sql`${guestComplaints.complaintDate} <= ${end.toISOString()}`
    ];
    
    if (branchId !== undefined) {
      whereConditions.push(eq(guestComplaints.branchId, branchId));
    }
    
    const complaints = await db.select()
      .from(guestComplaints)
      .where(and(...whereConditions));
    
    const heatmapData: any = {};
    
    complaints.forEach((complaint: any) => {
      const date = new Date(complaint.complaintDate);
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      const branchKey = complaint.branchId;
      
      if (!heatmapData[branchKey]) {
        heatmapData[branchKey] = {};
      }
      if (!heatmapData[branchKey][dayKey]) {
        heatmapData[branchKey][dayKey] = {};
      }
      heatmapData[branchKey][dayKey][hour] = (heatmapData[branchKey][dayKey][hour] || 0) + 1;
    });
    
    return heatmapData;
  }

  async getEquipmentTroubleshootingSteps(equipmentType: string): Promise<EquipmentTroubleshootingStep[]> {
    return await db.select()
      .from(equipmentTroubleshootingSteps)
      .where(eq(equipmentTroubleshootingSteps.equipmentType, equipmentType))
      .orderBy(asc(equipmentTroubleshootingSteps.order));
  }

  async createEquipmentTroubleshootingStep(data: InsertEquipmentTroubleshootingStep): Promise<EquipmentTroubleshootingStep> {
    const [step] = await db.insert(equipmentTroubleshootingSteps)
      .values(data)
      .returning();
    return step;
  }

  async updateEquipmentTroubleshootingStep(id: number, updates: Partial<InsertEquipmentTroubleshootingStep>): Promise<EquipmentTroubleshootingStep | undefined> {
    const [updated] = await db.update(equipmentTroubleshootingSteps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(equipmentTroubleshootingSteps.id, id))
      .returning();
    return updated;
  }

  async deleteEquipmentTroubleshootingStep(id: number): Promise<void> {
    await db.delete(equipmentTroubleshootingSteps)
      .where(eq(equipmentTroubleshootingSteps.id, id));
  }

  // ========================================
  // OVERTIME REQUESTS - Mesai Talepleri
  // ========================================

  async getOvertimeRequests(userId: string, canApprove: boolean): Promise<OvertimeRequest[]> {
    if (canApprove) {
      // Supervisors/HQ see all requests for their scope
      return await db.select().from(overtimeRequests).orderBy(desc(overtimeRequests.createdAt));
    } else {
      // Employees see only their own requests
      return await db.select()
        .from(overtimeRequests)
        .where(eq(overtimeRequests.userId, userId))
        .orderBy(desc(overtimeRequests.createdAt));
    }
  }

  async createOvertimeRequest(data: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [request] = await db.insert(overtimeRequests)
      .values(data)
      .returning();
    return request;
  }

  async approveOvertimeRequest(id: number, approverId: string, approvedMinutes: number): Promise<OvertimeRequest | undefined> {
    const [updated] = await db.update(overtimeRequests)
      .set({
        status: "approved",
        approverId,
        approvedMinutes,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, id))
      .returning();
    return updated;
  }

  async rejectOvertimeRequest(id: number, rejectionReason: string): Promise<OvertimeRequest | undefined> {
    const [updated] = await db.update(overtimeRequests)
      .set({
        status: "rejected",
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, id))
      .returning();
    return updated;
  }

  async getRecentShiftAttendances(userId: string, days: number): Promise<ShiftAttendance[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select()
      .from(shiftAttendance)
      .where(
        and(
          eq(shiftAttendance.userId, userId),
          sql`${shiftAttendance.checkInTime} >= ${cutoffDate.toISOString()}`
        )
      )
      .orderBy(desc(shiftAttendance.checkInTime))
      .limit(50);
  }
}

export const storage = new DatabaseStorage();
