import { db } from "./db";
import { eq, desc, asc, and, or, sql, inArray, gte, lte, type SQL } from "drizzle-orm";
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
  EquipmentTroubleshootingCompletion,
  InsertEquipmentTroubleshootingCompletion,
  EmployeePerformanceScore,
  InsertEmployeePerformanceScore,
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
  EmployeeDocument,
  InsertEmployeeDocument,
  DisciplinaryReport,
  InsertDisciplinaryReport,
  EmployeeOnboarding,
  InsertEmployeeOnboarding,
  EmployeeOnboardingTask,
  InsertEmployeeOnboardingTask,
  AuditLog,
  InsertAuditLog,
  ShiftChecklist,
  ShiftTask,
  TaskStatusHistory,
  InsertTaskStatusHistory,
  TaskRating,
  InsertTaskRating,
  ChecklistRating,
  InsertChecklistRating,
  EmployeeSatisfactionScore,
  InsertEmployeeSatisfactionScore,
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
  auditLogs,
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
  shiftTasks,
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
  equipmentTroubleshootingCompletion,
  employeePerformanceScores,
  branchQualityAudits,
  auditTemplates,
  auditTemplateItems,
  auditInstances,
  auditInstanceItems,
  AuditTemplate,
  InsertAuditTemplate,
  AuditTemplateItem,
  InsertAuditTemplateItem,
  AuditInstance,
  InsertAuditInstance,
  AuditInstanceItem,
  InsertAuditInstanceItem,
  employeeDocuments,
  disciplinaryReports,
  employeeOnboarding,
  employeeOnboardingTasks,
  roleModulePermissions,
  RoleModulePermission,
  InsertRoleModulePermission,
  permissionModules,
  trainingMaterials,
  trainingAssignments,
  trainingCompletions,
  careerLevels,
  examRequests,
  userCareerProgress,
  badges,
  userBadges,
  quizzes,
  quizResults,
  CareerLevel,
  InsertCareerLevel,
  ExamRequest,
  InsertExamRequest,
  UserCareerProgress,
  InsertUserCareerProgress,
  BranchFeedback,
  InsertBranchFeedback,
  branchFeedbacks,
  LostFoundItem,
  InsertLostFoundItem,
  HandoverLostFoundItem,
  lostFoundItems,
  TicketActivityLog,
  InsertTicketActivityLog,
  ticketActivityLogs,
  AnnouncementReadStatus,
  InsertAnnouncementReadStatus,
  announcementReadStatus,
  HQ_SUPPORT_CATEGORY,
  TICKET_PRIORITY,
  taskStatusHistory,
  taskRatings,
  checklistRatings,
  employeeSatisfactionScores,
} from "@shared/schema";

export interface IStorage {
  // File operations
  uploadFile(objectKey: string, data: Buffer, contentType: string): Promise<string>;
  
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
  getHQAdmins(): Promise<User[]>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: { userId: string; token: string; expiresAt: Date; usedAt: Date | null }): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  getAllPasswordResetTokens(): Promise<Array<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null }>>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  
  // Employee Warnings operations
  getEmployeeWarnings(userId: string): Promise<EmployeeWarning[]>;
  createEmployeeWarning(warning: InsertEmployeeWarning): Promise<EmployeeWarning>;
  
  // Employee Documents operations (Özlük Dosyası)
  getEmployeeDocuments(userId: string): Promise<EmployeeDocument[]>;
  getEmployeeDocument(id: number): Promise<EmployeeDocument | undefined>;
  createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument>;
  updateEmployeeDocument(id: number, updates: Partial<InsertEmployeeDocument>): Promise<EmployeeDocument | undefined>;
  deleteEmployeeDocument(id: number): Promise<void>;
  verifyEmployeeDocument(id: number, verifiedById: string): Promise<EmployeeDocument | undefined>;
  
  // Disciplinary Reports operations (Tutanak, Disiplin, Savunma)
  getDisciplinaryReports(userId?: string, branchId?: number, status?: string): Promise<DisciplinaryReport[]>;
  getDisciplinaryReport(id: number): Promise<DisciplinaryReport | undefined>;
  createDisciplinaryReport(report: InsertDisciplinaryReport): Promise<DisciplinaryReport>;
  updateDisciplinaryReport(id: number, updates: Partial<InsertDisciplinaryReport>): Promise<DisciplinaryReport | undefined>;
  addEmployeeResponse(id: number, response: string, attachments?: string[]): Promise<DisciplinaryReport | undefined>;
  resolveDisciplinaryReport(id: number, resolution: string, actionTaken: string, resolvedById: string): Promise<DisciplinaryReport | undefined>;
  
  // Employee Onboarding operations
  getEmployeeOnboarding(userId: string): Promise<EmployeeOnboarding | undefined>;
  getOnboardingsByBranch(branchId: number, status?: string): Promise<EmployeeOnboarding[]>;
  getOrCreateEmployeeOnboarding(userId: string, branchId: number, assignedById: string): Promise<EmployeeOnboarding>;
  createEmployeeOnboarding(onboarding: InsertEmployeeOnboarding): Promise<EmployeeOnboarding>;
  updateEmployeeOnboarding(id: number, updates: Partial<InsertEmployeeOnboarding>): Promise<EmployeeOnboarding | undefined>;
  updateOnboardingProgress(id: number): Promise<EmployeeOnboarding | undefined>;
  
  // Employee Onboarding Tasks operations
  getOnboardingTasks(onboardingId: number): Promise<EmployeeOnboardingTask[]>;
  getOnboardingTask(id: number): Promise<EmployeeOnboardingTask | undefined>;
  createOnboardingTask(task: InsertEmployeeOnboardingTask): Promise<EmployeeOnboardingTask>;
  updateOnboardingTask(id: number, updates: Partial<InsertEmployeeOnboardingTask>): Promise<EmployeeOnboardingTask | undefined>;
  completeOnboardingTask(id: number, completedById: string, attachments?: string[]): Promise<EmployeeOnboardingTask | undefined>;
  verifyOnboardingTask(id: number, verifiedById: string): Promise<EmployeeOnboardingTask | undefined>;
  
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
  acknowledgeTask(id: number, userId: string): Promise<Task | undefined>;
  updateTaskStatus(id: number, newStatus: string, userId: string, note?: string): Promise<Task | undefined>;
  getTaskStatusHistory(taskId: number): Promise<TaskStatusHistory[]>;
  
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
  getHQSupportTickets(branchId?: number, status?: string, category?: string): Promise<HQSupportTicket[]>;
  getHQSupportTicket(id: number): Promise<HQSupportTicket | undefined>;
  createHQSupportTicket(ticket: InsertHQSupportTicket): Promise<HQSupportTicket>;
  updateHQSupportTicket(id: number, updates: Partial<InsertHQSupportTicket>): Promise<HQSupportTicket | undefined>;
  updateHQSupportTicketStatus(id: number, status: string, closedBy?: string): Promise<HQSupportTicket | undefined>;
  assignHQSupportTicket(id: number, assignedToId: string): Promise<HQSupportTicket | undefined>;
  getHQSupportMessages(ticketId: number): Promise<HQSupportMessage[]>;
  createHQSupportMessage(message: InsertHQSupportMessage): Promise<HQSupportMessage>;
  
  // Ticket Activity Log operations
  getTicketActivityLogs(ticketId: number): Promise<TicketActivityLog[]>;
  createTicketActivityLog(log: InsertTicketActivityLog): Promise<TicketActivityLog>;

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
  
  // Announcement Read Status operations
  markAnnouncementAsRead(announcementId: number, userId: string): Promise<void>;
  getAnnouncementReadStatus(announcementId: number): Promise<AnnouncementReadStatus[]>;
  getUserAnnouncementReadStatus(userId: string): Promise<AnnouncementReadStatus[]>;
  getUnreadAnnouncementCount(userId: string, branchId: number | null, role: string): Promise<number>;
  
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
  
  // AI helper methods
  getTasksByBranch(branchId: number): Promise<Task[]>;
  getShiftsByBranch(branchId: number): Promise<Shift[]>;
  getUsersByBranch(branchId: number): Promise<User[]>;
  getFaultsByBranch(branchId: number): Promise<EquipmentFault[]>;
  
  // Shift-Checklist junction operations
  setShiftChecklists(shiftId: number, checklistIds: number[]): Promise<void>;
  getShiftChecklists(shiftId: number): Promise<ShiftChecklist[]>;
  getShiftChecklistById(id: number): Promise<ShiftChecklist | undefined>;
  updateShiftChecklist(id: number, updates: { isCompleted?: boolean; completedAt?: Date | null }): Promise<ShiftChecklist | undefined>;
  
  // Shift-Task junction operations
  setShiftTasks(shiftId: number, taskIds: number[]): Promise<void>;
  getShiftTasks(shiftId: number): Promise<ShiftTask[]>;
  getShiftTaskById(id: number): Promise<ShiftTask | undefined>;
  updateShiftTask(id: number, updates: { isCompleted?: boolean; completedAt?: Date | null }): Promise<ShiftTask | undefined>;
  
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

  // Branch Details operations
  getBranchDetails(branchId: number): Promise<{
    branch: Branch;
    scores: {
      employeePerformanceScore: number;
      equipmentScore: number;
      qualityAuditScore: number;
      customerSatisfactionScore: number;
      compositeScore: number;
    };
    staff: User[];
    equipment: Equipment[];
    recentTasks: Task[];
    recentFaults: EquipmentFault[];
    recentFeedback: CustomerFeedback[];
    recentComplaints: GuestComplaint[];
  } | undefined>;

  // Personnel Profile operations
  getPersonnelProfile(userId: string): Promise<{
    id: string;
    username: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    branchId: number | null;
    branchName: string | null;
    hireDate: string | null;
    probationEndDate: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    isActive: boolean;
    accountStatus: string;
    performanceScore: number | null;
    attendanceRate: number | null;
    latenessCount: number | null;
    absenceCount: number | null;
    totalShifts: number | null;
    completedShifts: number | null;
  } | undefined>;

  // Audit Template operations
  getAuditTemplates(auditType?: string, category?: string, isActive?: boolean): Promise<Array<AuditTemplate & { itemCount: number }>>;
  getAuditTemplate(id: number): Promise<(AuditTemplate & { items: AuditTemplateItem[] }) | undefined>;
  createAuditTemplate(template: InsertAuditTemplate, items: Omit<InsertAuditTemplateItem, 'templateId'>[]): Promise<AuditTemplate>;
  updateAuditTemplate(id: number, updates: Partial<InsertAuditTemplate>, items?: Omit<InsertAuditTemplateItem, 'templateId'>[]): Promise<AuditTemplate | undefined>;
  deleteAuditTemplate(id: number): Promise<void>;
  
  // Audit Instance operations
  getAuditInstances(filters: { branchId?: number; userId?: string; auditorId?: string; status?: string; auditType?: string }): Promise<Array<AuditInstance & { templateTitle: string; targetName: string }>>;
  getAuditInstance(id: number): Promise<(AuditInstance & { template: AuditTemplate; items: Array<AuditInstanceItem & { templateItem: AuditTemplateItem }> }) | undefined>;
  createAuditInstance(instance: InsertAuditInstance): Promise<AuditInstance>;
  updateAuditInstanceItem(instanceId: number, templateItemId: number, updates: Partial<InsertAuditInstanceItem>): Promise<AuditInstanceItem | undefined>;
  completeAuditInstance(id: number, notes?: string, actionItems?: string, followUpRequired?: boolean, followUpDate?: string): Promise<AuditInstance | undefined>;
  cancelAuditInstance(id: number): Promise<AuditInstance | undefined>;
  
  // Equipment Troubleshooting Completion operations
  getTroubleshootingCompletions(faultId: number): Promise<EquipmentTroubleshootingCompletion[]>;
  createTroubleshootingCompletion(data: InsertEquipmentTroubleshootingCompletion): Promise<EquipmentTroubleshootingCompletion>;
  isTroubleshootingCompleteForEquipment(equipmentType: string, completedSteps: Array<{ stepId: number }>): Promise<{ complete: boolean; requiredSteps: EquipmentTroubleshootingStep[]; missingSteps: EquipmentTroubleshootingStep[] }>;
  
  // Role Permissions operations
  getRolePermissions(): Promise<Array<{ role: string; module: string; actions: string[] }>>;
  updateRolePermissions(role: string, module: string, actions: string[]): Promise<void>;
  bulkUpdateRolePermissions(updates: Array<{ role: string; module: string; actions: string[] }>): Promise<void>;
  
  // Permission Modules operations
  getPermissionModules(): Promise<Array<{ moduleKey: string; moduleName: string; description: string | null; category: string | null; isActive: boolean }>>;

  // Career operations
  getCareerLevels(): Promise<CareerLevel[]>;
  getCareerLevel(id: number): Promise<CareerLevel | undefined>;
  getUserCareerProgress(userId: string): Promise<UserCareerProgress | undefined>;
  createExamRequest(request: InsertExamRequest): Promise<ExamRequest>;
  getExamRequests(filters?: { userId?: string; status?: string; targetRoleId?: string }): Promise<ExamRequest[]>;
  updateExamRequest(id: number, updates: Partial<InsertExamRequest>): Promise<ExamRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user as User | undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user as User | undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)) as Promise<User[]>;
  }

  async getUsersByBranchAndRole(branchId: number, role: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.role, role))) as Promise<User[]>;
  }

  async getHQAdmins(): Promise<User[]> {
    // Get users with HQ admin roles (hq_admin, general_manager)
    return db.select().from(users).where(
      or(eq(users.role, 'hq_admin'), eq(users.role, 'general_manager'))
    ) as Promise<User[]>;
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
    return result ;
  }

  async getAllPasswordResetTokens(): Promise<Array<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null }>> {
    const { passwordResetTokens } = await import("@shared/schema");
    const results = await db.select().from(passwordResetTokens);
    return results;
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    const { passwordResetTokens } = await import("@shared/schema");
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
  }

  async uploadFile(objectKey: string, data: Buffer, contentType: string): Promise<string> {
    const { objectStorageClient } = await import('./objectStorage');
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) throw new Error("Object storage not configured");
    
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectKey);
    await file.save(data, { metadata: { contentType } });
    
    // Return public URL
    return `https://storage.googleapis.com/${bucketId}/${objectKey}`;
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
    return user as User | undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return result[0] as User;
  }

  async upsertUser(insertUser: UpsertUser): Promise<User> {
    const result = await db
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
    return result[0] as User;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user as User | undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllEmployees(branchId?: number): Promise<User[]> {
    if (branchId !== undefined) {
      return db.select().from(users).where(eq(users.branchId, branchId)) as Promise<User[]>;
    }
    return db.select().from(users) as Promise<User[]>;
  }

  async getAllUsersWithFilters(filters: { role?: string; branchId?: number; search?: string; accountStatus?: string }): Promise<User[]> {
    const conditions: SQL<any>[] = [];
    
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
      return db.select().from(users).where(and(...conditions)).orderBy(users.firstName, users.lastName) as Promise<User[]>;
    }
    return db.select().from(users).orderBy(users.firstName, users.lastName) as Promise<User[]>;
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
    
    return imported as User[];
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
    const crypto = require('crypto');
    const token = branch.qrCodeToken || crypto.randomBytes(32).toString('hex');
    const [newBranch] = await db.insert(branches).values({ ...branch, qrCodeToken: token }).returning();
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

  async acknowledgeTask(id: number, userId: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const previousStatus = task.status;
    const [updated] = await db
      .update(tasks)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    // Log the acknowledgment in history
    await db.insert(taskStatusHistory).values({
      taskId: id,
      previousStatus,
      newStatus: previousStatus, // Status doesn't change, just acknowledged
      changedById: userId,
      note: "Görev görüldü olarak işaretlendi",
    });
    
    return updated;
  }

  async updateTaskStatus(id: number, newStatus: string, userId: string, note?: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const previousStatus = task.status;
    const now = new Date();
    
    const updateData: any = {
      status: newStatus,
      statusUpdatedAt: now,
      statusUpdatedById: userId,
      updatedAt: now,
    };
    
    // If marking as failed, require and store the failure note
    if (newStatus === "basarisiz" && note) {
      updateData.failureNote = note;
    }
    
    // If marking as completed, set completedAt
    if (newStatus === "onaylandi") {
      updateData.completedAt = now;
    }
    
    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    
    // Log the status change in history
    await db.insert(taskStatusHistory).values({
      taskId: id,
      previousStatus,
      newStatus,
      changedById: userId,
      note: note || null,
    });
    
    return updated;
  }

  async getTaskStatusHistory(taskId: number): Promise<TaskStatusHistory[]> {
    return db.select()
      .from(taskStatusHistory)
      .where(eq(taskStatusHistory.taskId, taskId))
      .orderBy(desc(taskStatusHistory.createdAt));
  }

  async addNoteToTask(taskId: number, note: string, userId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Görev bulunamadı");
    
    // Add note to history without changing status (use current status for both fields)
    await db.insert(taskStatusHistory).values({
      taskId: taskId,
      previousStatus: task.status,
      newStatus: task.status,
      changedById: userId,
      note: note,
    });
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

  // Health Score Calculation (0-100)
  // Based on: recent faults, maintenance compliance, warranty status, age
  private async calculateHealthScore(item: Equipment): Promise<number> {
    const now = new Date();
    let score = 100;

    // Get recent faults (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentFaults = await db
      .select()
      .from(equipmentFaults)
      .where(
        and(
          eq(equipmentFaults.equipmentId, item.id),
          gte(equipmentFaults.createdAt, thirtyDaysAgo)
        )
      );

    // Fault penalty: -10 per critical/high fault, -5 per medium
    recentFaults.forEach(fault => {
      if (fault.priority === 'kritik' || fault.priority === 'yüksek') {
        score -= 10;
      } else if (fault.priority === 'orta') {
        score -= 5;
      }
    });

    // Warranty penalty: -20 if expired
    if (item.warrantyEndDate) {
      const warrantyEnd = new Date(item.warrantyEndDate);
      if (warrantyEnd < now) {
        score -= 20;
      } else {
        const daysUntilExpiry = Math.floor((warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysUntilExpiry < 30) score -= 10; // Warning
      }
    }

    // Maintenance compliance: -15 if overdue
    if (item.nextMaintenanceDate) {
      const nextMaint = new Date(item.nextMaintenanceDate);
      if (nextMaint < now) {
        score -= 15;
      }
    }

    // Equipment age penalty: -5 for each year over 5 years
    if (item.purchaseDate) {
      const purchaseDate = new Date(item.purchaseDate);
      const ageInYears = (now.getTime() - purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (ageInYears > 5) {
        score -= Math.floor((ageInYears - 5) * 5);
      }
    }

    // Inactive penalty: -50
    if (!item.isActive) {
      score -= 50;
    }

    return Math.max(0, Math.min(100, score)); // Clamp 0-100
  }

  // Equipment operations
  async getEquipment(branchId?: number): Promise<(Equipment & { healthScore: number })[]> {
    const equipmentList = branchId
      ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).orderBy(equipment.equipmentType)
      : await db.select().from(equipment).orderBy(equipment.equipmentType);

    return Promise.all(
      equipmentList.map(async (item) => ({
        ...item,
        healthScore: await this.calculateHealthScore(item),
      }))
    );
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
    const [newFault] = await db.insert(equipmentFaults).values(fault ).returning();
    return newFault;
  }

  async updateFault(id: number, updates: Partial<InsertEquipmentFault>): Promise<EquipmentFault | undefined> {
    const [updated] = await db
      .update(equipmentFaults)
      .set({ ...updates, updatedAt: new Date() } )
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
    
    const existingHistory = (fault.stageHistory as any) || [];
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
        )  + 1
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
    await db.insert(knowledgeBaseEmbeddings).values(embeddings );
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

  async createOrUpdateUserTrainingProgress(data: { userId: string; moduleId: number; status: string; completedAt?: Date; score?: number }): Promise<UserTrainingProgress | undefined> {
    return this.updateUserProgress(data.userId, data.moduleId, {
      status: data.status ,
      completedAt: data.completedAt,
      score: data.score,
    });
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

  // Employee Documents operations (Özlük Dosyası)
  async getEmployeeDocuments(userId: string): Promise<EmployeeDocument[]> {
    return db.select().from(employeeDocuments)
      .where(eq(employeeDocuments.userId, userId))
      .orderBy(desc(employeeDocuments.uploadedAt));
  }

  async getEmployeeDocument(id: number): Promise<EmployeeDocument | undefined> {
    const [document] = await db.select().from(employeeDocuments)
      .where(eq(employeeDocuments.id, id));
    return document;
  }

  async createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [newDocument] = await db.insert(employeeDocuments).values(document).returning();
    return newDocument;
  }

  async updateEmployeeDocument(id: number, updates: Partial<InsertEmployeeDocument>): Promise<EmployeeDocument | undefined> {
    const [updated] = await db.update(employeeDocuments)
      .set(updates)
      .where(eq(employeeDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteEmployeeDocument(id: number): Promise<void> {
    await db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
  }

  async verifyEmployeeDocument(id: number, verifiedById: string): Promise<EmployeeDocument | undefined> {
    const [updated] = await db.update(employeeDocuments)
      .set({
        isVerified: true,
        verifiedById,
        verifiedAt: new Date(),
      })
      .where(eq(employeeDocuments.id, id))
      .returning();
    return updated;
  }

  // Disciplinary Reports operations (Tutanak, Disiplin, Savunma)
  async getDisciplinaryReports(userId?: string, branchId?: number, status?: string): Promise<DisciplinaryReport[]> {
    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(disciplinaryReports.userId, userId));
    if (branchId) conditions.push(eq(disciplinaryReports.branchId, branchId));
    if (status) conditions.push(eq(disciplinaryReports.status, status));

    return db.select().from(disciplinaryReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(disciplinaryReports.incidentDate));
  }

  async getDisciplinaryReport(id: number): Promise<DisciplinaryReport | undefined> {
    const [report] = await db.select().from(disciplinaryReports)
      .where(eq(disciplinaryReports.id, id));
    return report;
  }

  async createDisciplinaryReport(report: InsertDisciplinaryReport): Promise<DisciplinaryReport> {
    const [newReport] = await db.insert(disciplinaryReports).values(report).returning();
    return newReport;
  }

  async updateDisciplinaryReport(id: number, updates: Partial<InsertDisciplinaryReport>): Promise<DisciplinaryReport | undefined> {
    const [updated] = await db.update(disciplinaryReports)
      .set(updates)
      .where(eq(disciplinaryReports.id, id))
      .returning();
    return updated;
  }

  async addEmployeeResponse(id: number, response: string, attachments?: string[]): Promise<DisciplinaryReport | undefined> {
    const [updated] = await db.update(disciplinaryReports)
      .set({
        employeeResponse: response,
        employeeResponseDate: new Date(),
        employeeResponseAttachments: attachments || [],
        status: 'under_review',
      })
      .where(eq(disciplinaryReports.id, id))
      .returning();
    return updated;
  }

  async resolveDisciplinaryReport(id: number, resolution: string, actionTaken: string, resolvedById: string): Promise<DisciplinaryReport | undefined> {
    const [updated] = await db.update(disciplinaryReports)
      .set({
        resolution,
        actionTaken,
        resolvedById,
        resolvedAt: new Date(),
        status: 'resolved',
      })
      .where(eq(disciplinaryReports.id, id))
      .returning();
    return updated;
  }

  // Employee Onboarding operations
  async getEmployeeOnboarding(userId: string): Promise<EmployeeOnboarding | undefined> {
    const [onboarding] = await db.select().from(employeeOnboarding)
      .where(eq(employeeOnboarding.userId, userId));
    return onboarding;
  }

  async getOnboardingsByBranch(branchId: number, status?: string): Promise<EmployeeOnboarding[]> {
    const conditions: SQL[] = [eq(employeeOnboarding.branchId, branchId)];
    if (status) conditions.push(eq(employeeOnboarding.status, status));

    return db.select().from(employeeOnboarding)
      .where(and(...conditions))
      .orderBy(desc(employeeOnboarding.startDate));
  }

  async getOrCreateEmployeeOnboarding(userId: string, branchId: number, assignedById: string): Promise<EmployeeOnboarding> {
    // Try to get existing onboarding record
    const existing = await this.getEmployeeOnboarding(userId);
    if (existing) {
      return existing;
    }

    // Create new onboarding record with all required defaults
    const today = new Date().toISOString().split('T')[0];
    const result = await db.insert(employeeOnboarding).values({
      userId,
      branchId,
      assignedMentorId: assignedById,
      startDate: today,
      status: 'in_progress',
      completionPercentage: 0,
    }).returning();
    return result[0];
  }

  async createEmployeeOnboarding(onboarding: InsertEmployeeOnboarding): Promise<EmployeeOnboarding> {
    const [newOnboarding] = await db.insert(employeeOnboarding).values(onboarding).returning();
    return newOnboarding;
  }

  async updateEmployeeOnboarding(id: number, updates: Partial<InsertEmployeeOnboarding>): Promise<EmployeeOnboarding | undefined> {
    const [updated] = await db.update(employeeOnboarding)
      .set(updates)
      .where(eq(employeeOnboarding.id, id))
      .returning();
    return updated;
  }

  async updateOnboardingProgress(id: number): Promise<EmployeeOnboarding | undefined> {
    // Get all tasks for this onboarding
    const tasks = await db.select().from(employeeOnboardingTasks)
      .where(eq(employeeOnboardingTasks.onboardingId, id));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update status based on completion
    let status = 'in_progress';
    let actualCompletionDate = null;
    if (completionPercentage === 100) {
      status = 'completed';
      actualCompletionDate = new Date();
    } else if (completionPercentage > 0) {
      status = 'in_progress';
    }

    const [updated] = await db.update(employeeOnboarding)
      .set({
        completionPercentage,
        status,
        ...(actualCompletionDate && { actualCompletionDate: actualCompletionDate.toISOString().split('T')[0] }),
      })
      .where(eq(employeeOnboarding.id, id))
      .returning();
    return updated;
  }

  // Employee Onboarding Tasks operations
  async getOnboardingTasks(onboardingId: number): Promise<EmployeeOnboardingTask[]> {
    return db.select().from(employeeOnboardingTasks)
      .where(eq(employeeOnboardingTasks.onboardingId, onboardingId))
      .orderBy(asc(employeeOnboardingTasks.dueDate));
  }

  async getOnboardingTask(id: number): Promise<EmployeeOnboardingTask | undefined> {
    const [task] = await db.select().from(employeeOnboardingTasks)
      .where(eq(employeeOnboardingTasks.id, id));
    return task;
  }

  async createOnboardingTask(task: InsertEmployeeOnboardingTask): Promise<EmployeeOnboardingTask> {
    const [newTask] = await db.insert(employeeOnboardingTasks).values(task).returning();
    return newTask;
  }

  async updateOnboardingTask(id: number, updates: Partial<InsertEmployeeOnboardingTask>): Promise<EmployeeOnboardingTask | undefined> {
    const [updated] = await db.update(employeeOnboardingTasks)
      .set(updates)
      .where(eq(employeeOnboardingTasks.id, id))
      .returning();
    return updated;
  }

  async completeOnboardingTask(id: number, completedById: string, attachments?: string[]): Promise<EmployeeOnboardingTask | undefined> {
    const [updated] = await db.update(employeeOnboardingTasks)
      .set({
        status: 'completed',
        completedById,
        completedAt: new Date(),
        attachmentUrls: attachments || [],
      })
      .where(eq(employeeOnboardingTasks.id, id))
      .returning();

    // Update onboarding progress
    if (updated) {
      await this.updateOnboardingProgress(updated.onboardingId);
    }

    return updated;
  }

  async verifyOnboardingTask(id: number, verifiedById: string): Promise<EmployeeOnboardingTask | undefined> {
    const [updated] = await db.update(employeeOnboardingTasks)
      .set({
        verifiedById,
        verifiedAt: new Date(),
      })
      .where(eq(employeeOnboardingTasks.id, id))
      .returning();
    return updated;
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
        threadId: messages.threadId,
        parentMessageId: messages.parentMessageId,
        attachments: messages.attachments,
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
      threadId: msg.threadId,
      parentMessageId: msg.parentMessageId,
      attachments: msg.attachments,
      createdAt: msg.createdAt,
      isRead: msg.isReadByUser || false,
    }));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
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
    const [newRequest] = await db
      .insert(equipmentServiceRequests)
      .values(data)
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

    // Update the status field and updatedById
    const [finalUpdated] = await db
      .update(equipmentServiceRequests)
      .set({ status: newStatus, updatedById: actorId, updatedAt: new Date() })
      .where(eq(equipmentServiceRequests.id, id))
      .returning();

    return finalUpdated;
  }

  // HQ Support Ticket operations
  async getHQSupportTickets(branchId?: number, status?: string, category?: string): Promise<HQSupportTicket[]> {
    const conditions = [];
    if (branchId !== undefined) {
      conditions.push(eq(hqSupportTickets.branchId, branchId));
    }
    if (status !== undefined) {
      conditions.push(eq(hqSupportTickets.status, status));
    }
    if (category !== undefined) {
      conditions.push(eq(hqSupportTickets.category, category));
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
  
  async updateHQSupportTicket(id: number, updates: Partial<InsertHQSupportTicket>): Promise<HQSupportTicket | undefined> {
    const [updated] = await db
      .update(hqSupportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hqSupportTickets.id, id))
      .returning();
    return updated;
  }

  async updateHQSupportTicketStatus(id: number, status: string, closedBy?: string): Promise<HQSupportTicket | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (status === 'kapatildi' && closedBy) {
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
  
  async assignHQSupportTicket(id: number, assignedToId: string): Promise<HQSupportTicket | undefined> {
    const [updated] = await db
      .update(hqSupportTickets)
      .set({ assignedToId, updatedAt: new Date() })
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
  
  // Ticket Activity Log operations
  async getTicketActivityLogs(ticketId: number): Promise<TicketActivityLog[]> {
    return db.select().from(ticketActivityLogs)
      .where(eq(ticketActivityLogs.ticketId, ticketId))
      .orderBy(desc(ticketActivityLogs.createdAt));
  }
  
  async createTicketActivityLog(log: InsertTicketActivityLog): Promise<TicketActivityLog> {
    const [newLog] = await db.insert(ticketActivityLogs).values(log).returning();
    return newLog;
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
  
  // Announcement Read Status operations
  async markAnnouncementAsRead(announcementId: number, userId: string): Promise<void> {
    await db.insert(announcementReadStatus)
      .values({ announcementId, userId })
      .onConflictDoNothing();
  }
  
  async getAnnouncementReadStatus(announcementId: number): Promise<AnnouncementReadStatus[]> {
    return db.select().from(announcementReadStatus)
      .where(eq(announcementReadStatus.announcementId, announcementId));
  }
  
  async getUserAnnouncementReadStatus(userId: string): Promise<AnnouncementReadStatus[]> {
    return db.select().from(announcementReadStatus)
      .where(eq(announcementReadStatus.userId, userId));
  }
  
  async getUnreadAnnouncementCount(userId: string, branchId: number | null, role: string): Promise<number> {
    const allAnnouncements = await this.getAnnouncements(userId, branchId, role);
    const readStatuses = await this.getUserAnnouncementReadStatus(userId);
    const readIds = new Set(readStatuses.map(rs => rs.announcementId));
    
    return allAnnouncements.filter(a => !readIds.has(a.id)).length;
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
      shiftType: (shiftType as "morning" | "evening" | "night") || 'morning',
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

  // AI helper methods implementation
  async getTasksByBranch(branchId: number): Promise<Task[]> {
    return this.getTasks(branchId);
  }

  async getShiftsByBranch(branchId: number): Promise<Shift[]> {
    return this.getShifts(branchId);
  }

  async getUsersByBranch(branchId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.branchId, branchId)) as Promise<User[]>;
  }

  async getFaultsByBranch(branchId: number): Promise<EquipmentFault[]> {
    return this.getFaults(branchId);
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

  async getShiftChecklists(shiftId: number): Promise<ShiftChecklist[]> {
    const shiftChecklistData = await db
      .select()
      .from(shiftChecklists)
      .where(eq(shiftChecklists.shiftId, shiftId));
    
    if (shiftChecklistData.length === 0) return [];
    
    const checklistIds = shiftChecklistData.map(sc => sc.checklistId);
    const checklistsData = await db
      .select()
      .from(checklists)
      .where(inArray(checklists.id, checklistIds));
    
    const checklistMap = new Map(checklistsData.map(c => [c.id, c]));
    
    return shiftChecklistData.map(sc => ({
      ...sc,
      checklist: checklistMap.get(sc.checklistId)
    })) as any;
  }

  async getShiftChecklistById(id: number): Promise<ShiftChecklist | undefined> {
    const [result] = await db
      .select()
      .from(shiftChecklists)
      .where(eq(shiftChecklists.id, id));
    return result;
  }

  async updateShiftChecklist(id: number, updates: { isCompleted?: boolean; completedAt?: Date | null }): Promise<ShiftChecklist | undefined> {
    const [updated] = await db
      .update(shiftChecklists)
      .set(updates)
      .where(eq(shiftChecklists.id, id))
      .returning();
    return updated;
  }

  async setShiftTasks(shiftId: number, taskIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(shiftTasks).where(eq(shiftTasks.shiftId, shiftId));
      
      if (taskIds.length > 0) {
        await tx.insert(shiftTasks).values(
          taskIds.map((taskId: number) => ({
            shiftId,
            taskId,
          }))
        );
      }
    });
  }

  async getShiftTasks(shiftId: number): Promise<ShiftTask[]> {
    const shiftTaskData = await db
      .select()
      .from(shiftTasks)
      .where(eq(shiftTasks.shiftId, shiftId));
    
    if (shiftTaskData.length === 0) return [];
    
    const taskIds = shiftTaskData.map(st => st.taskId);
    const tasksData = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));
    
    const taskMap = new Map(tasksData.map(t => [t.id, t]));
    
    return shiftTaskData.map(st => ({
      ...st,
      task: taskMap.get(st.taskId)
    })) as any;
  }

  async getShiftTaskById(id: number): Promise<ShiftTask | undefined> {
    const [result] = await db
      .select()
      .from(shiftTasks)
      .where(eq(shiftTasks.id, id));
    return result;
  }

  async updateShiftTask(id: number, updates: { isCompleted?: boolean; completedAt?: Date | null }): Promise<ShiftTask | undefined> {
    const [updated] = await db
      .update(shiftTasks)
      .set(updates)
      .where(eq(shiftTasks.id, id))
      .returning();
    return updated;
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
    const conditions: SQL<any>[] = [];
    
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
      
      // Send reminder notification
      await this.createNotification({
        userId: shift.assignedToId,
        type: 'shift_reminder',
        title: 'Vardiya Hatırlatması',
        message: `Vardiyanz ${shift.startTime} - ${shift.endTime} saatleri arasında başlayacak.`,
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
    
    // Get admin user for system notifications
    const adminUser = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    
    if (adminUser.length === 0) {
      console.log('[checkSLABreaches] No admin user found, skipping SLA check');
      return;
    }
    
    const adminId = adminUser[0].id;
    
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
          userId: adminId,
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
            eq(notifications.type, 'warning'),
            eq(notifications.link, `/sikayetler/${complaint.id}`),
            sql`${notifications.message} LIKE '%80% yaklaştı%'`
          ))
          .limit(1);
        
        if (existingEscalation.length === 0) {
          // Send 80% escalation warning
          await this.createNotification({
            userId: adminId,
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

  async getTroubleshootingCompletions(faultId: number): Promise<EquipmentTroubleshootingCompletion[]> {
    return await db.select()
      .from(equipmentTroubleshootingCompletion)
      .where(eq(equipmentTroubleshootingCompletion.faultId, faultId))
      .orderBy(asc(equipmentTroubleshootingCompletion.completedAt));
  }

  async createTroubleshootingCompletion(data: InsertEquipmentTroubleshootingCompletion): Promise<EquipmentTroubleshootingCompletion> {
    const [completion] = await db.insert(equipmentTroubleshootingCompletion)
      .values(data)
      .returning();
    return completion;
  }

  async isTroubleshootingCompleteForEquipment(
    equipmentType: string,
    completedSteps: Array<{ stepId: number }>
  ): Promise<{ complete: boolean; requiredSteps: EquipmentTroubleshootingStep[]; missingSteps: EquipmentTroubleshootingStep[] }> {
    // Get all required steps for this equipment type
    const allSteps = await db.select()
      .from(equipmentTroubleshootingSteps)
      .where(eq(equipmentTroubleshootingSteps.equipmentType, equipmentType))
      .orderBy(asc(equipmentTroubleshootingSteps.order));
    
    const requiredSteps = allSteps.filter(step => step.isRequired);
    const completedStepIds = new Set(completedSteps.map(s => s.stepId));
    const missingSteps = requiredSteps.filter(step => !completedStepIds.has(step.id));
    
    return {
      complete: missingSteps.length === 0,
      requiredSteps,
      missingSteps,
    };
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

  // ========================================
  // EMPLOYEE PERFORMANCE SCORES
  // ========================================

  async calculateAndSaveDailyPerformanceScore(userId: string, branchId: number, date: string): Promise<EmployeePerformanceScore> {
    // Get all shift attendances for this user on this date
    const attendances = await db.select()
      .from(shiftAttendance)
      .innerJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
      .where(and(
        eq(shiftAttendance.userId, userId),
        eq(shifts.shiftDate, date)
      ));

    if (attendances.length === 0) {
      // No attendance = absent, all scores 0
      const weekNumber = this.getWeekNumber(new Date(date));
      const [score] = await db.insert(employeePerformanceScores)
        .values({
          userId,
          branchId,
          date,
          week: weekNumber,
          attendanceScore: 0,
          latenessScore: 0,
          earlyLeaveScore: 0,
          breakComplianceScore: 0,
          shiftComplianceScore: 0,
          overtimeComplianceScore: 100,
          dailyTotalScore: 0,
          weeklyTotalScore: 0,
          totalPenaltyMinutes: 0,
          latenessMinutes: 0,
          earlyLeaveMinutes: 0,
          breakOverageMinutes: 0,
        })
        .onConflictDoUpdate({
          target: [employeePerformanceScores.userId, employeePerformanceScores.date],
          set: {
            attendanceScore: 0,
            dailyTotalScore: 0,
            updatedAt: new Date(),
          }
        })
        .returning();
      return score;
    }

    // Calculate scores from attendance data
    let totalLatenessMinutes = 0;
    let totalEarlyLeaveMinutes = 0;
    let totalBreakOverageMinutes = 0;
    let totalPenaltyMinutes = 0;
    let avgComplianceScore = 0;

    for (const row of attendances) {
      const attendance = row.shift_attendance;
      totalLatenessMinutes += attendance.latenessMinutes || 0;
      totalEarlyLeaveMinutes += attendance.earlyLeaveMinutes || 0;
      totalBreakOverageMinutes += attendance.breakOverageMinutes || 0;
      totalPenaltyMinutes += attendance.penaltyMinutes || 0;
      avgComplianceScore += attendance.complianceScore || 100;
    }

    avgComplianceScore = Math.round(avgComplianceScore / attendances.length);

    // Score calculations
    const attendanceScore = 100; // Present
    const latenessScore = Math.max(0, 100 - (totalLatenessMinutes * 2)); // -2 points per minute
    const earlyLeaveScore = Math.max(0, 100 - (totalEarlyLeaveMinutes * 2));
    const breakComplianceScore = Math.max(0, 100 - (totalBreakOverageMinutes * 1)); // -1 point per minute
    const shiftComplianceScore = avgComplianceScore;
    // Calculate overtime compliance score: weighted ratio of approved to requested minutes
    let overtimeComplianceScore = 100;
    try {
      const overtimeRecords = await db
        .select()
        .from(overtimeRequests)
        .where(and(
          eq(overtimeRequests.userId, userId),
          sql`${overtimeRequests.createdAt} >= ${date}::timestamp - interval '30 days'`,
          sql`${overtimeRequests.createdAt} <= ${date}::timestamp`
        ));

      if (overtimeRecords.length > 0) {
        const totalRequested = overtimeRecords.reduce((sum, r) => sum + (r.requestedMinutes || 0), 0);
        const totalApproved = overtimeRecords
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.approvedMinutes || r.requestedMinutes || 0), 0);
        const totalPending = overtimeRecords
          .filter(r => r.status === 'pending')
          .reduce((sum, r) => sum + (r.requestedMinutes || 0), 0);

        if (totalRequested > 0) {
          // Base score: approved/requested * 100
          // Pending penalty: -5 points per 10% pending (supervisor latency)
          const approvalRatio = totalApproved / totalRequested;
          const pendingRatio = totalPending / totalRequested;
          
          overtimeComplianceScore = Math.round(
            Math.max(0, Math.min(100, (approvalRatio * 100) - (pendingRatio * 50)))
          );
        } else {
          overtimeComplianceScore = 100; // No overtime requests
        }
      }
    } catch (error) {
      console.error('[Performance] Error calculating overtime compliance:', error);
      overtimeComplianceScore = 100; // Fallback to 100
    }

    // Weighted average (attendance 20%, lateness 25%, earlyLeave 15%, break 15%, shift 25%)
    const dailyTotalScore = Math.round(
      attendanceScore * 0.20 +
      latenessScore * 0.25 +
      earlyLeaveScore * 0.15 +
      breakComplianceScore * 0.15 +
      shiftComplianceScore * 0.25
    );

    const weekNumber = this.getWeekNumber(new Date(date));
    
    const [score] = await db.insert(employeePerformanceScores)
      .values({
        userId,
        branchId,
        date,
        week: weekNumber,
        attendanceScore,
        latenessScore,
        earlyLeaveScore,
        breakComplianceScore,
        shiftComplianceScore,
        overtimeComplianceScore,
        dailyTotalScore,
        weeklyTotalScore: dailyTotalScore, // Will be recalculated for week
        totalPenaltyMinutes,
        latenessMinutes: totalLatenessMinutes,
        earlyLeaveMinutes: totalEarlyLeaveMinutes,
        breakOverageMinutes: totalBreakOverageMinutes,
      })
      .onConflictDoUpdate({
        target: [employeePerformanceScores.userId, employeePerformanceScores.date],
        set: {
          attendanceScore,
          latenessScore,
          earlyLeaveScore,
          breakComplianceScore,
          shiftComplianceScore,
          overtimeComplianceScore,
          dailyTotalScore,
          totalPenaltyMinutes,
          latenessMinutes: totalLatenessMinutes,
          earlyLeaveMinutes: totalEarlyLeaveMinutes,
          breakOverageMinutes: totalBreakOverageMinutes,
          updatedAt: new Date(),
        }
      })
      .returning();

    return score;
  }

  async getPerformanceScores(userId: string, startDate?: string, endDate?: string): Promise<EmployeePerformanceScore[]> {
    const conditions: SQL[] = [eq(employeePerformanceScores.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(employeePerformanceScores.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(employeePerformanceScores.date, endDate));
    }

    console.log('[DEBUG] getPerformanceScores userId:', userId, 'startDate:', startDate, 'endDate:', endDate);

    const scores = await db.select()
      .from(employeePerformanceScores)
      .where(and(...conditions))
      .orderBy(desc(employeePerformanceScores.date));

    console.log('[DEBUG] getPerformanceScores found scores:', scores.length);
    return scores;
  }

  async getWeeklyPerformanceSummary(userId: string, week: string): Promise<{
    weeklyTotalScore: number;
    days: EmployeePerformanceScore[];
  }> {
    const scores = await db.select()
      .from(employeePerformanceScores)
      .where(and(
        eq(employeePerformanceScores.userId, userId),
        eq(employeePerformanceScores.week, week)
      ))
      .orderBy(employeePerformanceScores.date);

    if (scores.length === 0) {
      return { weeklyTotalScore: 0, days: [] };
    }

    const weeklyTotalScore = Math.round(
      scores.reduce((sum, s) => sum + s.dailyTotalScore, 0) / scores.length
    );

    return { weeklyTotalScore, days: scores };
  }

  private getWeekNumber(date: Date): string {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  async getTeamPerformanceAggregates(branchId: number): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    averageScore: number;
    totalDays: number;
  }>> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    console.log('[DEBUG] getTeamPerformanceAggregates branchId:', branchId, 'startDate:', startDate);

    const scores = await db.select({
      userId: employeePerformanceScores.userId,
      dailyTotalScore: employeePerformanceScores.dailyTotalScore,
      date: employeePerformanceScores.date,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
      .from(employeePerformanceScores)
      .innerJoin(users, eq(employeePerformanceScores.userId, users.id))
      .where(and(
        eq(users.branchId, branchId),
        gte(employeePerformanceScores.date, startDate)
      ))
      .orderBy(employeePerformanceScores.userId, desc(employeePerformanceScores.date));

    console.log('[DEBUG] getTeamPerformanceAggregates found scores:', scores.length);

    // Group by user and calculate averages
    const userScores = new Map<string, { totalScore: number; count: number; user: any }>();
    for (const score of scores) {
      if (!userScores.has(score.userId)) {
        userScores.set(score.userId, {
          totalScore: 0,
          count: 0,
          user: { firstName: score.firstName, lastName: score.lastName, username: score.username }
        });
      }
      const userScore = userScores.get(score.userId)!;
      userScore.totalScore += score.dailyTotalScore;
      userScore.count += 1;
    }

    return Array.from(userScores.entries()).map(([userId, data]) => ({
      userId,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      username: data.user.username,
      averageScore: Math.round(data.totalScore / data.count),
      totalDays: data.count,
    })).sort((a, b) => b.averageScore - a.averageScore);
  }

  async getAllBranchesPerformanceAggregates(): Promise<Array<{
    branchId: number;
    branchName: string;
    avgAttendanceScore: number;
    avgLatenessScore: number;
    avgEarlyLeaveScore: number;
    avgBreakComplianceScore: number;
    avgShiftComplianceScore: number;
    avgOvertimeComplianceScore: number;
    avgDailyTotalScore: number;
    totalPenaltyMinutes: number;
    totalEmployees: number;
    startDate: string;
    endDate: string;
  }>> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    console.log('[DEBUG] getAllBranchesPerformanceAggregates startDate:', startDate);

    const scores = await db.select({
      branchId: employeePerformanceScores.branchId,
      branchName: branches.name,
      userId: employeePerformanceScores.userId,
      attendanceScore: employeePerformanceScores.attendanceScore,
      latenessScore: employeePerformanceScores.latenessScore,
      earlyLeaveScore: employeePerformanceScores.earlyLeaveScore,
      breakComplianceScore: employeePerformanceScores.breakComplianceScore,
      shiftComplianceScore: employeePerformanceScores.shiftComplianceScore,
      overtimeComplianceScore: employeePerformanceScores.overtimeComplianceScore,
      dailyTotalScore: employeePerformanceScores.dailyTotalScore,
      totalPenaltyMinutes: employeePerformanceScores.totalPenaltyMinutes,
    })
      .from(employeePerformanceScores)
      .innerJoin(branches, eq(employeePerformanceScores.branchId, branches.id))
      .where(gte(employeePerformanceScores.date, startDate))
      .orderBy(employeePerformanceScores.branchId);

    console.log('[DEBUG] getAllBranchesPerformanceAggregates scores.length:', scores.length);

    // Group by branch and calculate averages for all metrics
    const branchScores = new Map<number, {
      name: string;
      attendanceSum: number;
      latenessSum: number;
      earlyLeaveSum: number;
      breakComplianceSum: number;
      shiftComplianceSum: number;
      overtimeComplianceSum: number;
      dailyTotalSum: number;
      penaltySum: number;
      count: number;
      uniqueUsers: Set<string>;
    }>();

    for (const score of scores) {
      if (!branchScores.has(score.branchId)) {
        branchScores.set(score.branchId, {
          name: score.branchName,
          attendanceSum: 0,
          latenessSum: 0,
          earlyLeaveSum: 0,
          breakComplianceSum: 0,
          shiftComplianceSum: 0,
          overtimeComplianceSum: 0,
          dailyTotalSum: 0,
          penaltySum: 0,
          count: 0,
          uniqueUsers: new Set()
        });
      }
      const branchScore = branchScores.get(score.branchId)!;
      branchScore.attendanceSum += score.attendanceScore;
      branchScore.latenessSum += score.latenessScore;
      branchScore.earlyLeaveSum += score.earlyLeaveScore;
      branchScore.breakComplianceSum += score.breakComplianceScore;
      branchScore.shiftComplianceSum += score.shiftComplianceScore;
      branchScore.overtimeComplianceSum += score.overtimeComplianceScore;
      branchScore.dailyTotalSum += score.dailyTotalScore;
      branchScore.penaltySum += score.totalPenaltyMinutes;
      branchScore.count += 1;
      branchScore.uniqueUsers.add(score.userId);
    }

    return Array.from(branchScores.entries()).map(([branchId, data]) => ({
      branchId,
      branchName: data.name,
      avgAttendanceScore: Math.round(data.attendanceSum / data.count),
      avgLatenessScore: Math.round(data.latenessSum / data.count),
      avgEarlyLeaveScore: Math.round(data.earlyLeaveSum / data.count),
      avgBreakComplianceScore: Math.round(data.breakComplianceSum / data.count),
      avgShiftComplianceScore: Math.round(data.shiftComplianceSum / data.count),
      avgOvertimeComplianceScore: Math.round(data.overtimeComplianceSum / data.count),
      avgDailyTotalScore: Math.round(data.dailyTotalSum / data.count),
      totalPenaltyMinutes: data.penaltySum,
      totalEmployees: data.uniqueUsers.size,
      startDate,
      endDate,
    })).sort((a, b) => b.avgDailyTotalScore - a.avgDailyTotalScore);
  }

  async getCompositeBranchScores(timeRange: '7d' | '30d' | '180d' | '365d' = '30d'): Promise<Array<{
    branchId: number;
    branchName: string;
    employeePerformanceScore: number; // 0-100
    equipmentScore: number; // 0-100 (lower fault count = higher score)
    qualityAuditScore: number; // 0-100 (from latest audits)
    customerSatisfactionScore: number; // 0-100 (positive feedback - complaints)
    compositeScore: number; // Weighted average
    lastUpdated: Date;
  }>> {
    const days = { '7d': 7, '30d': 30, '180d': 180, '365d': 365 }[timeRange];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const allBranches = await db.select().from(branches);
    const results = [];

    for (const branch of allBranches) {
      // 1. Employee Performance Score (40% weight)
      const employeeScores = await db.select({
        avgScore: sql<number>`CAST(AVG(${employeePerformanceScores.dailyTotalScore}) AS INTEGER)`,
      })
        .from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.branchId, branch.id),
          sql`${employeePerformanceScores.date} >= CAST(${sql.raw(`'${startDate.toISOString().split('T')[0]}'`)} AS date)`
        ));
      
      const employeePerformanceScore = employeeScores[0]?.avgScore ?? 85; // Default 85 if no data

      // 2. Equipment/Fault Score (25% weight)
      // Lower fault count = higher score. Max 10 faults in 30 days = 0 score, 0 faults = 100 score
      const faults = await db.select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
        .from(equipmentFaults)
        .where(and(
          eq(equipmentFaults.branchId, branch.id),
          sql`${equipmentFaults.createdAt} >= CAST(${sql.raw(`'${startDate.toISOString()}'`)} AS timestamp)`
        ));
      
      const faultCount = faults[0]?.count ?? 0;
      const equipmentScore = Math.max(0, Math.min(100, 100 - (faultCount * 10)));

      // 3. Quality Audit Score (20% weight)
      // Average of latest 3 audits
      const audits = await db.select({
        overallScore: branchQualityAudits.overallScore,
      })
        .from(branchQualityAudits)
        .where(eq(branchQualityAudits.branchId, branch.id))
        .orderBy(desc(branchQualityAudits.auditDate))
        .limit(3);
      
      const qualityAuditScore = audits.length > 0
        ? Math.round(audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length)
        : 90; // Default 90 if no audits yet

      // 4. Customer Satisfaction Score (15% weight)
      // Positive feedback (5-star = +5 points, 4-star = +3, 3-star = +1)
      // Complaints (each = -10 points)
      const positiveFeedback = await db.select({
        count5: sql<number>`CAST(COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 5) AS INTEGER)`,
        count4: sql<number>`CAST(COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 4) AS INTEGER)`,
        count3: sql<number>`CAST(COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 3) AS INTEGER)`,
      })
        .from(customerFeedback)
        .where(and(
          eq(customerFeedback.branchId, branch.id),
          sql`${customerFeedback.feedbackDate} >= CAST(${sql.raw(`'${startDate.toISOString().split('T')[0]}'`)} AS date)`
        ));
      
      const complaints = await db.select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
        .from(guestComplaints)
        .where(and(
          eq(guestComplaints.branchId, branch.id),
          sql`${guestComplaints.complaintDate} >= CAST(${sql.raw(`'${startDate.toISOString()}'`)} AS timestamp)`
        ));
      
      const feedbackPoints = 
        (positiveFeedback[0]?.count5 ?? 0) * 5 +
        (positiveFeedback[0]?.count4 ?? 0) * 3 +
        (positiveFeedback[0]?.count3 ?? 0) * 1;
      
      const complaintPoints = (complaints[0]?.count ?? 0) * 10;
      const netPoints = feedbackPoints - complaintPoints;
      
      // Convert to 0-100 scale (assuming max 50 points = 100 score)
      const customerSatisfactionScore = Math.max(0, Math.min(100, 50 + netPoints));

      // Calculate weighted composite score
      const compositeScore = Math.round(
        employeePerformanceScore * 0.40 +
        equipmentScore * 0.25 +
        qualityAuditScore * 0.20 +
        customerSatisfactionScore * 0.15
      );

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        employeePerformanceScore,
        equipmentScore,
        qualityAuditScore,
        customerSatisfactionScore,
        compositeScore,
        lastUpdated: new Date(),
      });
    }

    return results.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  async getBranchDetails(branchId: number): Promise<{
    branch: Branch;
    scores: {
      employeePerformanceScore: number;
      equipmentScore: number;
      qualityAuditScore: number;
      customerSatisfactionScore: number;
      compositeScore: number;
    };
    staff: User[];
    equipment: Equipment[];
    recentTasks: Task[];
    recentFaults: EquipmentFault[];
    recentFeedback: CustomerFeedback[];
    recentComplaints: GuestComplaint[];
  } | undefined> {
    // Get branch info
    const branch = await this.getBranch(branchId);
    if (!branch) {
      return undefined;
    }

    // Get composite scores for this specific branch
    const allScores = await this.getCompositeBranchScores();
    const branchScores = allScores.find(s => s.branchId === branchId);
    
    const scores = branchScores ? {
      employeePerformanceScore: branchScores.employeePerformanceScore,
      equipmentScore: branchScores.equipmentScore,
      qualityAuditScore: branchScores.qualityAuditScore,
      customerSatisfactionScore: branchScores.customerSatisfactionScore,
      compositeScore: branchScores.compositeScore,
    } : {
      employeePerformanceScore: 0,
      equipmentScore: 0,
      qualityAuditScore: 0,
      customerSatisfactionScore: 0,
      compositeScore: 0,
    };

    // Get staff list for this branch
    const staff = await db
      .select()
      .from(users)
      .where(eq(users.branchId, branchId))
      .orderBy(users.firstName) as User[];

    // Get equipment for this branch
    const equipmentList = await db
      .select()
      .from(equipment)
      .where(eq(equipment.branchId, branchId))
      .orderBy(equipment.equipmentType);

    // Get recent tasks (last 10)
    const recentTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.branchId, branchId))
      .orderBy(desc(tasks.createdAt))
      .limit(10);

    // Get recent faults (last 10)
    const recentFaults = await db
      .select()
      .from(equipmentFaults)
      .where(eq(equipmentFaults.branchId, branchId))
      .orderBy(desc(equipmentFaults.createdAt))
      .limit(10);

    // Get recent customer feedback (last 10)
    const recentFeedback = await db
      .select()
      .from(customerFeedback)
      .where(eq(customerFeedback.branchId, branchId))
      .orderBy(desc(customerFeedback.feedbackDate))
      .limit(10);

    // Get recent complaints (last 10)
    const recentComplaints = await db
      .select()
      .from(guestComplaints)
      .where(eq(guestComplaints.branchId, branchId))
      .orderBy(desc(guestComplaints.complaintDate))
      .limit(10);

    return {
      branch,
      scores,
      staff,
      equipment: equipmentList,
      recentTasks,
      recentFaults,
      recentFeedback,
      recentComplaints,
    };
  }

  async getPersonnelProfile(userId: string): Promise<{
    id: string;
    username: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    branchId: number | null;
    branchName: string | null;
    hireDate: string | null;
    probationEndDate: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    isActive: boolean;
    accountStatus: string;
    performanceScore: number | null;
    attendanceRate: number | null;
    latenessCount: number | null;
    absenceCount: number | null;
    totalShifts: number | null;
    completedShifts: number | null;
  } | undefined> {
    // Get user basic info
    const user = await this.getUserById(userId);
    if (!user) {
      return undefined;
    }

    // Get branch name if user has a branch
    let branchName: string | null = null;
    if (user.branchId) {
      const branch = await this.getBranch(user.branchId);
      branchName = branch?.name || null;
    }

    // Get performance metrics from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get latest performance score
    const latestPerformance = await db
      .select()
      .from(employeePerformanceScores)
      .where(eq(employeePerformanceScores.userId, userId))
      .orderBy(desc(employeePerformanceScores.createdAt))
      .limit(1);

    const performanceScore = latestPerformance[0]?.dailyTotalScore || null;

    // Get attendance metrics from shift_attendance
    const attendanceRecords = await db
      .select()
      .from(shiftAttendance)
      .where(and(
        eq(shiftAttendance.userId, userId),
        sql`${shiftAttendance.checkInTime} >= ${thirtyDaysAgo.toISOString()}`
      ));

    const totalShifts = attendanceRecords.length;
    const completedShifts = attendanceRecords.filter(a => a.status === 'checked_out').length;
    const latenessCount = attendanceRecords.filter(a => a.latenessMinutes && a.latenessMinutes > 0).length;
    
    // Calculate absence count: scheduled shifts with no check-in (excluding approved leaves)
    let absenceCount = 0;
    try {
      // Query: Find shifts with no attendance OR excused attendance, exclude approved leaves
      const shiftResults = await db
        .select({
          shiftId: shifts.id,
          shiftDate: shifts.shiftDate,
        })
        .from(shifts)
        .leftJoin(shiftAttendance, and(
          eq(shifts.id, shiftAttendance.shiftId),
          eq(shiftAttendance.userId, userId)
        ))
        .where(and(
          eq(shifts.assignedToId, userId),
          sql`${shifts.shiftDate} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`,
          sql`${shifts.shiftDate} <= ${new Date().toISOString().split('T')[0]}`,
          sql`${shiftAttendance.id} IS NULL` // No attendance record
        ));

      // Deduplicate by shiftId (in case of multiple attendance records)
      const uniqueShifts = Array.from(new Map(shiftResults.map(s => [s.shiftId, s])).values());

      // Get all approved leaves for user in the time range
      const approvedLeaves = await db
        .select()
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, userId),
          eq(leaveRequests.status, 'approved')
        ));

      // Count shifts NOT covered by approved leave
      for (const shift of uniqueShifts) {
        const isCovered = approvedLeaves.some(leave => 
          shift.shiftDate >= leave.startDate && shift.shiftDate <= leave.endDate
        );
        if (!isCovered) {
          absenceCount++;
        }
      }
    } catch (error) {
      console.error('[Employee Profile] Error calculating absence count:', error);
      absenceCount = 0; // Fallback
    }

    // Calculate attendance rate
    const attendanceRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : null;

    return {
      id: user.id,
      username: user.username || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || '',
      phoneNumber: user.phoneNumber,
      role: user.role,
      branchId: user.branchId,
      branchName,
      hireDate: user.hireDate,
      probationEndDate: user.probationEndDate,
      emergencyContact: user.emergencyContactName,
      emergencyPhone: user.emergencyContactPhone,
      isActive: user.isActive,
      accountStatus: user.accountStatus,
      performanceScore,
      attendanceRate,
      latenessCount,
      absenceCount,
      totalShifts,
      completedShifts,
    };
  }

  // ===============================================
  // AUDIT LOGS - Security & Compliance
  // ===============================================

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs)
      .values(data)
      .returning();
    return auditLog;
  }

  async getAuditLogs(filters?: {
    action?: string;
    resource?: string;
    resourceId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

    if (filters) {
      const conditions: any[] = [];
      
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.resource) {
        conditions.push(eq(auditLogs.resource, filters.resource));
      }
      if (filters.resourceId) {
        conditions.push(eq(auditLogs.resourceId, filters.resourceId));
      }
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.startDate) {
        conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) ;
      }

      if (filters.limit) {
        query = query.limit(filters.limit) ;
      }
    }

    return query;
  }

  // ===============================================
  // AUDIT TEMPLATE OPERATIONS
  // ===============================================

  async getAuditTemplates(auditType?: string, category?: string, isActive?: boolean): Promise<Array<AuditTemplate & { itemCount: number }>> {
    const conditions: SQL[] = [];
    
    if (auditType) {
      conditions.push(eq(auditTemplates.auditType, auditType));
    }
    if (category) {
      conditions.push(eq(auditTemplates.category, category));
    }
    if (isActive !== undefined) {
      conditions.push(eq(auditTemplates.isActive, isActive));
    }

    // Optimized single query with left join and count aggregation
    const result = await db
      .select({
        id: auditTemplates.id,
        title: auditTemplates.title,
        description: auditTemplates.description,
        auditType: auditTemplates.auditType,
        category: auditTemplates.category,
        isActive: auditTemplates.isActive,
        requiresPhoto: auditTemplates.requiresPhoto,
        aiAnalysisEnabled: auditTemplates.aiAnalysisEnabled,
        createdById: auditTemplates.createdById,
        createdAt: auditTemplates.createdAt,
        updatedAt: auditTemplates.updatedAt,
        itemCount: sql<number>`CAST(COUNT(${auditTemplateItems.id}) AS INTEGER)`,
      })
      .from(auditTemplates)
      .leftJoin(auditTemplateItems, eq(auditTemplateItems.templateId, auditTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(auditTemplates.id)
      .orderBy(desc(auditTemplates.createdAt));

    return result;
  }

  async getAuditTemplate(id: number): Promise<(AuditTemplate & { items: AuditTemplateItem[] }) | undefined> {
    const [template] = await db
      .select()
      .from(auditTemplates)
      .where(eq(auditTemplates.id, id));

    if (!template) {
      return undefined;
    }

    const items = await db
      .select()
      .from(auditTemplateItems)
      .where(eq(auditTemplateItems.templateId, id))
      .orderBy(asc(auditTemplateItems.sortOrder));

    return {
      ...template,
      items,
    };
  }

  async createAuditTemplate(template: InsertAuditTemplate, items: InsertAuditTemplateItem[]): Promise<AuditTemplate> {
    // Use transaction to ensure atomic create
    return await db.transaction(async (tx) => {
      // Create template
      const [newTemplate] = await tx
        .insert(auditTemplates)
        .values(template)
        .returning();

      // Create items if provided
      if (items.length > 0) {
        const itemsWithTemplateId = items.map((item, index) => ({
          ...item,
          templateId: newTemplate.id,
          sortOrder: item.sortOrder ?? index,
        }));

        await tx
          .insert(auditTemplateItems)
          .values(itemsWithTemplateId);
      }

      return newTemplate;
    });
  }

  async updateAuditTemplate(id: number, updates: Partial<InsertAuditTemplate>, items?: InsertAuditTemplateItem[]): Promise<AuditTemplate | undefined> {
    // Use transaction to ensure atomic update
    return await db.transaction(async (tx) => {
      // Update template
      const [updatedTemplate] = await tx
        .update(auditTemplates)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(auditTemplates.id, id))
        .returning();

      if (!updatedTemplate) {
        return undefined;
      }

      // If items are provided, replace all items
      if (items) {
        // Delete old items
        await tx
          .delete(auditTemplateItems)
          .where(eq(auditTemplateItems.templateId, id));

        // Create new items
        if (items.length > 0) {
          const itemsWithTemplateId = items.map((item, index) => ({
            ...item,
            templateId: id,
            sortOrder: item.sortOrder ?? index,
          }));

          await tx
            .insert(auditTemplateItems)
            .values(itemsWithTemplateId);
        }
      }

      return updatedTemplate;
    });
  }

  async deleteAuditTemplate(id: number): Promise<void> {
    // Cascade delete will handle audit_template_items
    await db
      .delete(auditTemplates)
      .where(eq(auditTemplates.id, id));
  }

  // ===============================================
  // AUDIT INSTANCE OPERATIONS
  // ===============================================

  async getAuditInstances(filters: { 
    branchId?: number; 
    userId?: string; 
    auditorId?: string; 
    status?: string; 
    auditType?: string 
  }): Promise<Array<AuditInstance & { templateTitle: string; targetName: string }>> {
    const conditions: SQL[] = [];
    
    if (filters.branchId) {
      conditions.push(eq(auditInstances.branchId, filters.branchId));
    }
    if (filters.userId) {
      conditions.push(eq(auditInstances.userId, filters.userId));
    }
    if (filters.auditorId) {
      conditions.push(eq(auditInstances.auditorId, filters.auditorId));
    }
    if (filters.status) {
      conditions.push(eq(auditInstances.status, filters.status));
    }
    if (filters.auditType) {
      conditions.push(eq(auditInstances.auditType, filters.auditType));
    }

    const instances = await db
      .select()
      .from(auditInstances)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditInstances.auditDate));

    // Enrich with template titles and target names
    const enrichedInstances = await Promise.all(
      instances.map(async (instance) => {
        // Get template title
        const [template] = await db
          .select()
          .from(auditTemplates)
          .where(eq(auditTemplates.id, instance.templateId));
        
        const templateTitle = template?.title || 'Unknown Template';

        // Get target name
        let targetName = '';
        if (instance.auditType === 'branch' && instance.branchId) {
          const [branch] = await db
            .select()
            .from(branches)
            .where(eq(branches.id, instance.branchId));
          targetName = branch?.name || 'Unknown Branch';
        } else if (instance.auditType === 'personnel' && instance.userId) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, instance.userId));
          targetName = user?.fullName || 'Unknown User';
        }

        return {
          ...instance,
          templateTitle,
          targetName,
        };
      })
    );

    return enrichedInstances;
  }

  async getAuditInstance(id: number): Promise<(AuditInstance & { 
    template: AuditTemplate; 
    items: Array<AuditInstanceItem & { templateItem: AuditTemplateItem }> 
  }) | undefined> {
    const [instance] = await db
      .select()
      .from(auditInstances)
      .where(eq(auditInstances.id, id));

    if (!instance) {
      return undefined;
    }

    // Get template
    const [template] = await db
      .select()
      .from(auditTemplates)
      .where(eq(auditTemplates.id, instance.templateId));

    if (!template) {
      return undefined;
    }

    // Get instance items with template items
    const instanceItems = await db
      .select()
      .from(auditInstanceItems)
      .where(eq(auditInstanceItems.instanceId, id));

    const itemsWithTemplateInfo = await Promise.all(
      instanceItems.map(async (item) => {
        const [templateItem] = await db
          .select()
          .from(auditTemplateItems)
          .where(eq(auditTemplateItems.id, item.templateItemId));

        return {
          ...item,
          templateItem: templateItem!,
        };
      })
    );

    return {
      ...instance,
      template,
      items: itemsWithTemplateInfo,
    };
  }

  async createAuditInstance(instance: InsertAuditInstance): Promise<AuditInstance> {
    // Use transaction to ensure atomic create
    return await db.transaction(async (tx) => {
      // Create audit instance
      const [newInstance] = await tx
        .insert(auditInstances)
        .values({
          ...instance,
          status: 'in_progress',
        })
        .returning();

      // Get template items
      const templateItems = await tx
        .select()
        .from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, instance.templateId))
        .orderBy(asc(auditTemplateItems.sortOrder));

      // Create instance items for each template item
      if (templateItems.length > 0) {
        const instanceItems = templateItems.map((item) => ({
          instanceId: newInstance.id,
          templateItemId: item.id,
          response: null,
          score: null,
          notes: null,
          photoUrl: null,
          aiAnalysisStatus: null,
          aiScore: null,
          aiInsights: null,
          aiConfidence: null,
        }));

        await tx
          .insert(auditInstanceItems)
          .values(instanceItems);
      }

      return newInstance;
    });
  }

  async updateAuditInstanceItem(
    instanceId: number, 
    templateItemId: number, 
    updates: Partial<InsertAuditInstanceItem>
  ): Promise<AuditInstanceItem | undefined> {
    // Guard: Check if audit is still in progress (reject mutations on completed audits)
    const [instance] = await db
      .select({ status: auditInstances.status })
      .from(auditInstances)
      .where(eq(auditInstances.id, instanceId));
    
    if (!instance) {
      console.warn(`updateAuditInstanceItem: Audit instance ${instanceId} not found`);
      return undefined;
    }
    
    if (instance.status !== 'in_progress') {
      console.warn(`updateAuditInstanceItem: Audit instance ${instanceId} is ${instance.status}, rejecting update`);
      return undefined;
    }

    const [updatedItem] = await db
      .update(auditInstanceItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(auditInstanceItems.instanceId, instanceId),
        eq(auditInstanceItems.templateItemId, templateItemId)
      ))
      .returning();

    return updatedItem;
  }

  async completeAuditInstance(
    id: number, 
    notes?: string, 
    actionItems?: string, 
    followUpRequired?: boolean, 
    followUpDate?: string
  ): Promise<AuditInstance | undefined> {
    // Calculate total score from items with weighted average
    const instanceItemsWithTemplate = await db
      .select({
        score: auditInstanceItems.score,
        weight: auditTemplateItems.weight,
      })
      .from(auditInstanceItems)
      .leftJoin(auditTemplateItems, eq(auditInstanceItems.templateItemId, auditTemplateItems.id))
      .where(eq(auditInstanceItems.instanceId, id));

    // Calculate weighted average score
    const itemsWithScores = instanceItemsWithTemplate.filter(item => item.score !== null);
    let totalScore: number | null = null;
    
    if (itemsWithScores.length > 0) {
      const weightedSum = itemsWithScores.reduce((sum, item) => {
        const weight = item.weight ?? 1; // Default weight to 1 if null or template deleted
        return sum + (item.score || 0) * weight;
      }, 0);
      
      const totalWeight = itemsWithScores.reduce((sum, item) => {
        return sum + (item.weight ?? 1);
      }, 0);
      
      // Guard against zero total weight (edge case)
      totalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
      
      // Log warning if any items are missing templates
      const missingTemplates = instanceItemsWithTemplate.filter(item => item.weight === null);
      if (missingTemplates.length > 0) {
        console.warn(`Audit instance ${id}: ${missingTemplates.length} items missing template data (using default weight=1)`);
      }
    }

    const maxScore = 100;

    // Update instance
    const [updatedInstance] = await db
      .update(auditInstances)
      .set({
        status: 'completed',
        totalScore,
        maxScore,
        notes,
        actionItems,
        followUpRequired: followUpRequired ?? false,
        followUpDate: followUpDate ? (typeof followUpDate === 'string' ? followUpDate : new Date(followUpDate).toISOString().split('T')[0]) : null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(auditInstances.id, id))
      .returning();

    return updatedInstance;
  }

  async cancelAuditInstance(id: number): Promise<AuditInstance | undefined> {
    const [updatedInstance] = await db
      .update(auditInstances)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(auditInstances.id, id))
      .returning();

    return updatedInstance;
  }

  // Role Permissions operations
  async getRolePermissions(): Promise<Array<{ role: string; module: string; actions: string[] }>> {
    const permissions = await db.select().from(roleModulePermissions).orderBy(asc(roleModulePermissions.role), asc(roleModulePermissions.module));
    return permissions;
  }

  async updateRolePermissions(role: string, module: string, actions: string[]): Promise<void> {
    // Check if record exists
    const [existing] = await db
      .select()
      .from(roleModulePermissions)
      .where(and(eq(roleModulePermissions.role, role), eq(roleModulePermissions.module, module)));

    if (existing) {
      // Update existing record
      await db
        .update(roleModulePermissions)
        .set({ actions, updatedAt: new Date() })
        .where(and(eq(roleModulePermissions.role, role), eq(roleModulePermissions.module, module)));
    } else {
      // Insert new record
      await db.insert(roleModulePermissions).values({ role, module, actions });
    }
  }

  async bulkUpdateRolePermissions(updates: Array<{ role: string; module: string; actions: string[] }>): Promise<void> {
    // Use a transaction for atomic bulk update
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const { role, module, actions } = update;
        
        // Check if record exists
        const [existing] = await tx
          .select()
          .from(roleModulePermissions)
          .where(and(eq(roleModulePermissions.role, role), eq(roleModulePermissions.module, module)));

        if (existing) {
          // Update existing record
          await tx
            .update(roleModulePermissions)
            .set({ actions, updatedAt: new Date() })
            .where(and(eq(roleModulePermissions.role, role), eq(roleModulePermissions.module, module)));
        } else {
          // Insert new record
          await tx.insert(roleModulePermissions).values({ role, module, actions });
        }
      }
    });
  }

  async getPermissionModules(): Promise<Array<{ moduleKey: string; moduleName: string; description: string | null; category: string | null; isActive: boolean }>> {
    const modules = await db
      .select({
        moduleKey: permissionModules.moduleKey,
        moduleName: permissionModules.moduleName,
        description: permissionModules.description,
        category: permissionModules.category,
        isActive: permissionModules.isActive,
      })
      .from(permissionModules)
      .where(eq(permissionModules.isActive, true))
      .orderBy(asc(permissionModules.category), asc(permissionModules.moduleName));
    
    return modules;
  }

  // ========================================
  // TRAINING MATERIALS OPERATIONS
  // ========================================
  
  async getTrainingMaterials(status?: string): Promise<typeof trainingMaterials.$inferSelect[]> {
    const where = status ? eq(trainingMaterials.status, status) : undefined;
    return db.select().from(trainingMaterials).where(where || sql`1=1`).orderBy(desc(trainingMaterials.createdAt));
  }

  async getTrainingMaterial(id: number): Promise<typeof trainingMaterials.$inferSelect | undefined> {
    const [result] = await db.select().from(trainingMaterials).where(eq(trainingMaterials.id, id));
    return result;
  }

  async createTrainingMaterial(material: typeof trainingMaterials.$inferInsert): Promise<typeof trainingMaterials.$inferSelect> {
    const [result] = await db.insert(trainingMaterials).values(material).returning();
    return result;
  }

  async updateTrainingMaterial(id: number, updates: Partial<typeof trainingMaterials.$inferInsert>): Promise<typeof trainingMaterials.$inferSelect | undefined> {
    const [result] = await db.update(trainingMaterials).set({...updates, updatedAt: new Date()}).where(eq(trainingMaterials.id, id)).returning();
    return result;
  }

  // Training Assignments
  async getTrainingAssignments(filters?: { materialId?: number; userId?: string; status?: string }): Promise<typeof trainingAssignments.$inferSelect[]> {
    let query = db.select().from(trainingAssignments);
    const conditions: SQL[] = [];
    if (filters?.materialId) conditions.push(eq(trainingAssignments.materialId, filters.materialId));
    if (filters?.userId) conditions.push(eq(trainingAssignments.userId, filters.userId));
    if (filters?.status) conditions.push(eq(trainingAssignments.status, filters.status));
    if (conditions.length) query = query.where(and(...conditions));
    return query.orderBy(desc(trainingAssignments.createdAt));
  }

  async createTrainingAssignment(assignment: typeof trainingAssignments.$inferInsert): Promise<typeof trainingAssignments.$inferSelect> {
    const [result] = await db.insert(trainingAssignments).values(assignment).returning();
    return result;
  }

  async updateTrainingAssignmentStatus(id: number, status: string): Promise<typeof trainingAssignments.$inferSelect | undefined> {
    const [result] = await db.update(trainingAssignments).set({status, updatedAt: new Date()}).where(eq(trainingAssignments.id, id)).returning();
    return result;
  }

  // Training Completions
  async createTrainingCompletion(completion: typeof trainingCompletions.$inferInsert): Promise<typeof trainingCompletions.$inferSelect> {
    const [result] = await db.insert(trainingCompletions).values(completion).returning();
    return result;
  }

  async getTrainingCompletions(filters?: { userId?: string; materialId?: number; status?: string }): Promise<typeof trainingCompletions.$inferSelect[]> {
    let query = db.select().from(trainingCompletions);
    const conditions: SQL[] = [];
    if (filters?.userId) conditions.push(eq(trainingCompletions.userId, filters.userId));
    if (filters?.materialId) conditions.push(eq(trainingCompletions.materialId, filters.materialId));
    if (filters?.status) conditions.push(eq(trainingCompletions.status, filters.status));
    if (conditions.length) query = query.where(and(...conditions));
    return query.orderBy(desc(trainingCompletions.completedAt));
  }

  async getUserTrainingProgress(userId: string): Promise<{ total: number; completed: number; inProgress: number; overdue: number }> {
    const assignments = await db.select().from(trainingAssignments).where(eq(trainingAssignments.userId, userId));
    const completions = await db.select().from(trainingCompletions).where(eq(trainingCompletions.userId, userId));
    const completed = completions.filter(c => c.status === 'passed').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    const overdue = assignments.filter(a => a.status === 'overdue').length;
    return { total: assignments.length, completed, inProgress, overdue };
  }

  // ========================================
  // CAREER PROGRESSION OPERATIONS
  // ========================================
  
  async getCareerLevels(): Promise<CareerLevel[]> {
    return db.select().from(careerLevels).orderBy(asc(careerLevels.levelNumber));
  }

  async getCareerLevel(id: number): Promise<CareerLevel | undefined> {
    const [result] = await db.select().from(careerLevels).where(eq(careerLevels.id, id));
    return result;
  }

  async getCareerLevelByRoleId(roleId: string): Promise<CareerLevel | undefined> {
    const [result] = await db.select().from(careerLevels).where(eq(careerLevels.roleId, roleId));
    return result;
  }

  async getUserCareerProgress(userId: string): Promise<UserCareerProgress | undefined> {
    const [result] = await db.select().from(userCareerProgress).where(eq(userCareerProgress.userId, userId));
    return result;
  }

  async updateUserCareerProgress(userId: string, updates: Partial<typeof userCareerProgress.$inferInsert>): Promise<UserCareerProgress | undefined> {
    const [result] = await db.update(userCareerProgress).set({...updates, lastUpdatedAt: new Date()}).where(eq(userCareerProgress.userId, userId)).returning();
    return result;
  }

  async createUserCareerProgress(userId: string, currentCareerLevelId: number): Promise<UserCareerProgress> {
    const [result] = await db.insert(userCareerProgress).values({ userId, currentCareerLevelId }).returning();
    return result;
  }

  async createExamRequest(request: InsertExamRequest): Promise<ExamRequest> {
    const [result] = await db.insert(examRequests).values(request).returning();
    return result;
  }

  async getExamRequests(filters?: { userId?: string; status?: string; targetRoleId?: string }): Promise<ExamRequest[]> {
    let query = db.select().from(examRequests);
    const conditions: SQL[] = [];
    if (filters?.userId) conditions.push(eq(examRequests.userId, filters.userId));
    if (filters?.status) conditions.push(eq(examRequests.status, filters.status));
    if (filters?.targetRoleId) conditions.push(eq(examRequests.targetRoleId, filters.targetRoleId));
    if (conditions.length) query = query.where(and(...conditions));
    return query.orderBy(desc(examRequests.createdAt));
  }

  async updateExamRequest(id: number, updates: Partial<InsertExamRequest>): Promise<ExamRequest | undefined> {
    const [result] = await db.update(examRequests).set({...updates, updatedAt: new Date()}).where(eq(examRequests.id, id)).returning();
    return result;
  }

  async addQuizResult(result: InsertQuizResult): Promise<QuizResult> {
    const [created] = await db.insert(quizResults).values(result).returning();
    return created;
  }

  async getLeaderboard(limit: number = 5): Promise<QuizResult[]> {
    return db.select().from(quizResults).orderBy(desc(quizResults.score)).limit(limit);
  }

  async getUserQuizStats(userId: string): Promise<{ totalScore: number; completedQuizzes: number; averageScore: number }> {
    const [stats] = await db
      .select({
        totalScore: sql<number>`COALESCE(SUM(${quizResults.score}), 0)`,
        completedQuizzes: sql<number>`COUNT(${quizResults.id})`,
        averageScore: sql<number>`COALESCE(AVG(${quizResults.score}), 0)`,
      })
      .from(quizResults)
      .where(eq(quizResults.userId, userId));

    return {
      totalScore: Number(stats?.totalScore || 0),
      completedQuizzes: Number(stats?.completedQuizzes || 0),
      averageScore: Number(stats?.averageScore || 0),
    };
  }

  // ========================================
  // BADGE OPERATIONS
  // ========================================

  async getBadges(): Promise<typeof badges.$inferSelect[]> {
    return db.select().from(badges).orderBy(asc(badges.points));
  }

  async getUserBadges(userId: string): Promise<(typeof userBadges.$inferSelect & { badge: typeof badges.$inferSelect })[]> {
    const results = await db
      .select({ badge: badges, userBadge: userBadges })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
    return results.map(r => ({ ...r.badge, ...r.userBadge })) ;
  }

  async unlockBadge(userId: string, badgeId: number): Promise<typeof userBadges.$inferSelect> {
    const [result] = await db
      .insert(userBadges)
      .values({ userId, badgeId })
      .onConflictDoNothing()
      .returning();
    return result;
  }

  // ========================================
  // QUIZ RECOMMENDATIONS
  // ========================================

  async getQuizzesByCareerLevel(careerLevelId: number): Promise<typeof quizzes.$inferSelect[]> {
    return db.select().from(quizzes).where(eq(quizzes.careerLevelId, careerLevelId)).orderBy(asc(quizzes.difficulty));
  }

  async getRecommendedQuizzes(userId: string): Promise<typeof quizzes.$inferSelect[]> {
    const userProgress = await this.getUserCareerProgress(userId);
    if (!userProgress) return [];
    
    const recommendedQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.careerLevelId, userProgress.currentCareerLevelId))
      .orderBy(asc(quizzes.difficulty))
      .limit(3);
    
    return recommendedQuizzes;
  }

  // ========================================
  // BRANCH FEEDBACK SYSTEM
  // ========================================

  async createBranchFeedback(feedback: InsertBranchFeedback): Promise<BranchFeedback> {
    const [result] = await db.insert(branchFeedbacks).values(feedback).returning();
    return result;
  }

  async getBranchFeedbacks(filters?: { branchId?: number; status?: string; type?: string }): Promise<BranchFeedback[]> {
    let query = db.select().from(branchFeedbacks);
    const conditions: SQL[] = [];
    if (filters?.branchId) conditions.push(eq(branchFeedbacks.branchId, filters.branchId));
    if (filters?.status) conditions.push(eq(branchFeedbacks.status, filters.status));
    if (filters?.type) conditions.push(eq(branchFeedbacks.type, filters.type));
    if (conditions.length) query = query.where(and(...conditions));
    return query.orderBy(desc(branchFeedbacks.createdAt));
  }

  async updateBranchFeedback(id: number, updates: any): Promise<BranchFeedback | undefined> {
    const [result] = await db.update(branchFeedbacks).set(updates).where(eq(branchFeedbacks.id, id)).returning();
    return result;
  }

  // ========================================
  // LOST & FOUND SYSTEM
  // ========================================

  async createLostFoundItem(item: InsertLostFoundItem): Promise<LostFoundItem> {
    const [result] = await db.insert(lostFoundItems).values(item).returning();
    return result;
  }

  async getLostFoundItems(filters?: { branchId?: number; status?: string }): Promise<LostFoundItem[]> {
    const conditions: SQL[] = [];
    if (filters?.branchId) conditions.push(eq(lostFoundItems.branchId, filters.branchId));
    if (filters?.status) conditions.push(eq(lostFoundItems.status, filters.status));
    
    let query = db.select().from(lostFoundItems);
    if (conditions.length) query = query.where(and(...conditions)) ;
    return query.orderBy(desc(lostFoundItems.createdAt));
  }

  async getLostFoundItem(id: number): Promise<LostFoundItem | undefined> {
    const [result] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, id)).limit(1);
    return result;
  }

  async handoverLostFoundItem(id: number, data: HandoverLostFoundItem & { handoveredById: string }): Promise<LostFoundItem | undefined> {
    const [result] = await db
      .update(lostFoundItems)
      .set({
        status: "teslim_edildi",
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        handoverNotes: data.handoverNotes,
        handoveredById: data.handoveredById,
        handoverDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lostFoundItems.id, id))
      .returning();
    return result;
  }

  async getNewLostFoundItemsCount(branchId?: number): Promise<number> {
    const conditions: SQL[] = [eq(lostFoundItems.status, "bulunan")];
    if (branchId) conditions.push(eq(lostFoundItems.branchId, branchId));
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lostFoundItems)
      .where(and(...conditions));
    return result[0]?.count || 0;
  }

  // ========================================
  // BRANCH TASK PERFORMANCE STATISTICS
  // ========================================

  async getBranchTaskStats(branchId: number): Promise<any> {
    const allTasks = await db.select().from(tasks).where(eq(tasks.branchId, branchId));
    
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'onaylandi').length;
    const failed = allTasks.filter(t => t.status === 'basarisiz').length;
    const inProgress = allTasks.filter(t => t.status === 'devam_ediyor').length;
    const pending = allTasks.filter(t => t.status === 'beklemede').length;

    const now = new Date();
    const overdue = allTasks.filter(t => {
      if (t.status === 'onaylandi' || t.status === 'basarisiz') return false;
      return t.dueDate && new Date(t.dueDate) < now;
    }).length;

    // Calculate on-time completion rate
    const completedOnTime = allTasks.filter(t => 
      t.status === 'onaylandi' && t.dueDate && new Date(t.statusUpdatedAt || now) <= new Date(t.dueDate)
    ).length;

    const onTimeRate = total > 0 ? Math.round((completedOnTime / completed) * 100) || 0 : 100;
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

    // Acknowledgment time (average time from creation to acknowledgment)
    const acknowledgedTasks = allTasks.filter(t => t.acknowledgedAt);
    let avgAckTime = 0;
    if (acknowledgedTasks.length > 0) {
      const ackTimes = acknowledgedTasks.map(t => {
        const createdTime = new Date(t.createdAt || now).getTime();
        const ackTime = new Date(t.acknowledgedAt!).getTime();
        return (ackTime - createdTime) / (1000 * 60); // in minutes
      });
      avgAckTime = Math.round(ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length);
    }

    // Completion speed (average time from start to completion)
    const completedTasksWithDates = allTasks.filter(t => t.status === 'onaylandi' && t.statusUpdatedAt);
    let avgCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const completionTimes = completedTasksWithDates.map(t => {
        const startTime = t.startedAt ? new Date(t.startedAt).getTime() : new Date(t.createdAt || now).getTime();
        const endTime = new Date(t.statusUpdatedAt!).getTime();
        return (endTime - startTime) / (1000 * 60 * 60); // in hours
      });
      avgCompletionTime = Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10;
    }

    // Performance score calculation (0-100)
    const score = Math.round(
      (onTimeRate * 0.40) +
      ((100 - overdueRate) * 0.20) +
      ((100 - failureRate) * 0.15) +
      (Math.min(avgAckTime === 0 ? 100 : Math.max(0, 100 - (avgAckTime / 60)), 100) * 0.15) +
      (Math.min(avgCompletionTime === 0 ? 100 : Math.max(0, 100 - (avgCompletionTime / 24)), 100) * 0.10)
    );

    return {
      totalTasks: total,
      completed,
      failed,
      inProgress,
      pending,
      overdue,
      onTimeRate,
      overdueRate,
      failureRate,
      avgAckTime,
      avgCompletionTime,
      performanceScore: Math.max(0, Math.min(100, score))
    };
  }

  // ========================================
  // TASK RATING METHODS (Manual rating by assigner)
  // ========================================

  async createTaskRating(rating: InsertTaskRating): Promise<TaskRating> {
    const [created] = await db.insert(taskRatings).values(rating).returning();
    return created;
  }

  async getTaskRating(taskId: number): Promise<TaskRating | undefined> {
    const [rating] = await db.select()
      .from(taskRatings)
      .where(eq(taskRatings.taskId, taskId))
      .limit(1);
    return rating;
  }

  async getUserTaskRatings(userId: string): Promise<TaskRating[]> {
    return db.select()
      .from(taskRatings)
      .where(eq(taskRatings.ratedUserId, userId))
      .orderBy(desc(taskRatings.createdAt));
  }

  async getReceivedRatings(userId: string): Promise<any[]> {
    return db.select()
      .from(taskRatings)
      .innerJoin(tasks, eq(taskRatings.taskId, tasks.id))
      .where(eq(tasks.completedById, userId))
      .orderBy(desc(taskRatings.createdAt));
  }

  computeMaxRating(task: Task): number {
    if (!task.dueDate || !task.completedAt) {
      return 5;
    }
    const dueTime = new Date(task.dueDate).getTime();
    const completedTime = new Date(task.completedAt).getTime();
    if (completedTime > dueTime) {
      return 4;
    }
    return 5;
  }

  // ========================================
  // CHECKLIST RATING METHODS (Automatic scoring)
  // ========================================

  async createChecklistRating(rating: InsertChecklistRating): Promise<ChecklistRating> {
    const [created] = await db.insert(checklistRatings).values(rating).returning();
    return created;
  }

  async getChecklistRating(checklistInstanceId: number): Promise<ChecklistRating | undefined> {
    const [rating] = await db.select()
      .from(checklistRatings)
      .where(eq(checklistRatings.checklistInstanceId, checklistInstanceId))
      .limit(1);
    return rating;
  }

  async getUserChecklistRatings(userId: string): Promise<ChecklistRating[]> {
    return db.select()
      .from(checklistRatings)
      .where(eq(checklistRatings.userId, userId))
      .orderBy(desc(checklistRatings.scoredAt));
  }

  computeChecklistScore(completionRate: number, isOnTime: boolean): { rawScore: number; finalScore: number; penaltyApplied: number } {
    let rawScore: number;
    if (completionRate >= 1.0) {
      rawScore = 5;
    } else if (completionRate >= 0.9) {
      rawScore = 4;
    } else if (completionRate >= 0.75) {
      rawScore = 3;
    } else if (completionRate >= 0.5) {
      rawScore = 2;
    } else {
      rawScore = 1;
    }

    let penaltyApplied = 0;
    let finalScore = rawScore;
    if (!isOnTime && finalScore > 4) {
      finalScore = 4;
      penaltyApplied = 1;
    }

    return { rawScore, finalScore, penaltyApplied };
  }

  // ========================================
  // EMPLOYEE SATISFACTION SCORES (Composite performance)
  // ========================================

  async getEmployeeSatisfactionScore(userId: string): Promise<EmployeeSatisfactionScore | undefined> {
    const [score] = await db.select()
      .from(employeeSatisfactionScores)
      .where(eq(employeeSatisfactionScores.userId, userId))
      .limit(1);
    return score;
  }

  async upsertEmployeeSatisfactionScore(userId: string, branchId: number | null): Promise<EmployeeSatisfactionScore> {
    const taskRatingResults = await db.select()
      .from(taskRatings)
      .where(eq(taskRatings.ratedUserId, userId));

    const checklistRatingResults = await db.select()
      .from(checklistRatings)
      .where(eq(checklistRatings.userId, userId));

    const taskRatingCount = taskRatingResults.length;
    const taskRatingSum = taskRatingResults.reduce((sum, r) => sum + r.finalRating, 0);
    const taskSatisfactionAvg = taskRatingCount > 0 ? taskRatingSum / taskRatingCount : 0;
    const taskOnTimeCount = taskRatingResults.filter(r => !r.isLate).length;
    const taskLateCount = taskRatingResults.filter(r => r.isLate).length;

    const checklistRatingCount = checklistRatingResults.length;
    const checklistRatingSum = checklistRatingResults.reduce((sum, r) => sum + r.finalScore, 0);
    const checklistScoreAvg = checklistRatingCount > 0 ? checklistRatingSum / checklistRatingCount : 0;
    const checklistOnTimeCount = checklistRatingResults.filter(r => r.isOnTime).length;
    const checklistLateCount = checklistRatingResults.filter(r => !r.isOnTime).length;

    const totalOnTime = taskOnTimeCount + checklistOnTimeCount;
    const totalItems = taskRatingCount + checklistRatingCount;
    const onTimeRate = totalItems > 0 ? totalOnTime / totalItems : 0;

    const compositeScore = this.calculateCompositeScore(taskSatisfactionAvg, checklistScoreAvg, onTimeRate);

    const existing = await this.getEmployeeSatisfactionScore(userId);
    if (existing) {
      const [updated] = await db.update(employeeSatisfactionScores)
        .set({
          branchId,
          taskRatingCount,
          taskRatingSum,
          taskSatisfactionAvg,
          taskOnTimeCount,
          taskLateCount,
          checklistRatingCount,
          checklistRatingSum,
          checklistScoreAvg,
          checklistOnTimeCount,
          checklistLateCount,
          onTimeRate,
          compositeScore,
          lastCalculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(employeeSatisfactionScores.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(employeeSatisfactionScores)
        .values({
          userId,
          branchId,
          taskRatingCount,
          taskRatingSum,
          taskSatisfactionAvg,
          taskOnTimeCount,
          taskLateCount,
          checklistRatingCount,
          checklistRatingSum,
          checklistScoreAvg,
          checklistOnTimeCount,
          checklistLateCount,
          onTimeRate,
          compositeScore,
        })
        .returning();
      return created;
    }
  }

  async getTaskRating(taskId: number): Promise<TaskRating | undefined> {
    const [rating] = await db.select()
      .from(taskRatings)
      .where(eq(taskRatings.taskId, taskId));
    return rating;
  }

  async rateTask(taskId: number, score: number, ratedBy: string): Promise<TaskRating> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Task not found");
    
    const existing = await db.select()
      .from(taskRatings)
      .where(eq(taskRatings.taskId, taskId));
    
    if (existing.length > 0) {
      const [rating] = await db.update(taskRatings)
        .set({ 
          rawRating: score, 
          finalRating: score, 
          ratedById: ratedBy 
        })
        .where(eq(taskRatings.taskId, taskId))
        .returning();
      return rating;
    }
    
    const [rating] = await db.insert(taskRatings)
      .values({
        taskId,
        ratedById: ratedBy,
        ratedUserId: task.assignedToId || '',
        rawRating: score,
        finalRating: score,
      })
      .returning();
    return rating;
  }

  calculateCompositeScore(taskSatisfactionAvg: number, checklistScoreAvg: number, onTimeRate: number): number {
    const taskComponent = (taskSatisfactionAvg / 5) * 100 * 0.50;
    const checklistComponent = (checklistScoreAvg / 5) * 100 * 0.40;
    const onTimeComponent = onTimeRate * 100 * 0.10;
    return Math.round(taskComponent + checklistComponent + onTimeComponent);
  }

  async getTopPerformingEmployees(branchId?: number, limit = 10): Promise<EmployeeSatisfactionScore[]> {
    let query = db.select()
      .from(employeeSatisfactionScores)
      .orderBy(desc(employeeSatisfactionScores.compositeScore))
      .limit(limit);

    if (branchId) {
      query = db.select()
        .from(employeeSatisfactionScores)
        .where(eq(employeeSatisfactionScores.branchId, branchId))
        .orderBy(desc(employeeSatisfactionScores.compositeScore))
        .limit(limit);
    }

    return query;
  }
}

export const storage = new DatabaseStorage();
