import { Router } from "express";
import { db, pool } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
import {
  checklists,
  checklistAssignments,
  checklistCompletions,
  equipmentFaults,
  equipment,
  faultComments,
  faultServiceTracking,
  insertFaultServiceTrackingSchema,
  faultServiceStatusUpdates,
  FAULT_SERVICE_STATUS,
  auditTemplates,
  auditTemplateItems,
  auditInstances,
  auditInstanceItems,
  correctiveActions,
  correctiveActionUpdates,
  insertCorrectiveActionSchema,
  insertCorrectiveActionUpdateSchema,
  customerFeedback,
  feedbackResponses,
  feedbackFormSettings,
  feedbackCustomQuestions,
  feedbackIpBlocks,
  supportTickets,
  branches,
  users,
  guestComplaints,
  equipmentServiceRequests,
  shiftChecklists,
  shifts,
  hasPermission,
  isHQRole,
  isBranchRole,
  type UserRoleType,
  insertChecklistSchema,
  updateChecklistSchema,
  insertEquipmentFaultSchema,
  insertAuditTemplateSchema,
  insertAuditTemplateItemSchema,
  insertAuditInstanceSchema,
  insertAuditInstanceItemSchema,
  insertCustomerFeedbackSchema,
  insertChecklistAssignmentSchema,
  type InsertAuditTemplateItem,
} from "@shared/schema";
import { eq, desc, sql, and, or, not, inArray, lte, gte, isNull, type SQL } from "drizzle-orm";
import { compressChecklistPhotoBase64 } from "../photo-utils";
import { verifyChecklistPhoto, analyzeFaultPhoto, diagnoseFault } from "../ai";
import { respondIfAiBudgetError } from "../ai-budget-guard";
import { onChecklistAssigned, onFaultReported } from "../event-task-generator";
import * as XLSX from "xlsx";
import { z } from "zod";
import { computeAuditScore, getCAPAPriority, shouldCreateCAPA, isValidCAPATransition, calculateSLADeadline, getSLAStatus } from "../audit-scoring";
import { createAuditEntry, getAuditContext } from "../audit";
import { handleApiError, invalidateCache } from "./helpers";
import { sendFeedbackThankYouEmail } from "../email";
import { checkDataLock } from "../services/data-lock";

const router = Router();

function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

function ensurePermission(user: Express.User, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

  router.get('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      let checklistsResult = await storage.getChecklists();

      const scope = req.query.scope as string | undefined;
      if (scope && (scope === 'branch' || scope === 'factory')) {
        checklistsResult = checklistsResult.filter((c) => c.scope === scope);
      }

      res.json(checklistsResult);
    } catch (error: unknown) {
      console.error("Error fetching checklists:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist'ler alınırken hata oluştu" });
    }
  });

  router.post('/api/checklists', isAuthenticated, requireManifestAccess('gorevler', 'create'), async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      
      const { tasks: tasksArray, ...checklistData } = req.body;
      const validatedChecklistData = insertChecklistSchema.parse(checklistData);
      
      if (tasksArray && Array.isArray(tasksArray) && tasksArray.length > 0) {
        const { insertChecklistTaskSchema } = await import('@shared/schema');
        
        const orders = tasksArray.map((t) => t.order);
        const duplicateOrders = orders.filter((order: number, index: number) => orders.indexOf(order) !== index);
        if (duplicateOrders.length > 0) {
          return res.status(400).json({ message: `Duplicate order values: ${duplicateOrders.join(', ')}` });
        }
        
        const validatedTasks = tasksArray.map((task) => 
          insertChecklistTaskSchema.parse({
            taskDescription: task.taskDescription,
            requiresPhoto: task.requiresPhoto,
            taskTimeStart: task.taskTimeStart || null,
            taskTimeEnd: task.taskTimeEnd || null,
            aiVerificationType: task.aiVerificationType || null,
            tolerancePercent: task.tolerancePercent || null,
            referencePhotoUrl: task.referencePhotoUrl || null,
            order: task.order,
            checklistId: 0,
          })
        );
        
        const checklist = await storage.createChecklistWithTasks(validatedChecklistData, validatedTasks);
        res.json(checklist);
      } else {
        const checklist = await storage.createChecklist(validatedChecklistData);
        res.json(checklist);
      }
    } catch (error: unknown) {
      console.error("Error creating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz checklist verisi", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist oluşturulurken hata oluştu" });
    }
  });

  // Update checklist with tasks (Admin/CEO/CGO/Coach/Trainer always, supervisors only if isEditable=true)
  router.patch('/api/checklists/:id', isAuthenticated, requireManifestAccess('gorevler', 'edit'), async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Fetch checklist first to check isEditable
      const existingChecklist = await storage.getChecklist(id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }

      // Authorization:
      // - Admin/CEO/CGO: Always allowed (executive override)
      // - HQ coach/trainer: Always allowed
      // - Supervisors/mudur: Only if isEditable=true
      // - Others: Denied
      const alwaysAllowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      const editableOnlyRoles = ['supervisor', 'supervisor_buddy', 'mudur'];
      
      if (alwaysAllowedRoles.includes(role)) {
        // Admin, executive and HQ roles can always edit
      } else if (editableOnlyRoles.includes(role)) {
        // Supervisors and branch managers can only edit if isEditable=true
        if (!existingChecklist.isEditable) {
          return res.status(403).json({ message: "Bu checklist düzenlenemez (isEditable=false)" });
        }
      } else {
        // All other roles denied
        return res.status(403).json({ message: "Checklist düzenleme yetkiniz yok" });
      }

      // Validate and update using new storage method
      const validatedData = updateChecklistSchema.parse(req.body);
      const checklist = await storage.updateChecklistWithTasks(id, validatedData);

      res.json(checklist!);
    } catch (error: unknown) {
      console.error("Error updating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz checklist verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Checklist güncellenemedi" });
    }
  });

  // GET /api/checklists/my-daily - Get user's daily checklists based on shift and leave status
  router.get('/api/checklists/my-daily', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const today = new Date().toISOString().split('T')[0];

      const activeLeaves = await db.select().from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, user.id),
          eq(leaveRequests.status, 'approved'),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today)
        ));

      if (activeLeaves.length > 0) {
        return res.json({ onLeave: true, leaveType: activeLeaves[0].leaveType, checklists: [], shift: null });
      }

      const todayShifts = await db.select().from(shifts)
        .where(and(
          eq(shifts.assignedToId, user.id),
          eq(shifts.shiftDate, today)
        ));

      const shift = todayShifts.length > 0 ? todayShifts[0] : null;

      const shiftChecklistIds: number[] = [];
      if (shift) {
        if (shift.checklistId) shiftChecklistIds.push(shift.checklistId);
        if (shift.checklist2Id) shiftChecklistIds.push(shift.checklist2Id);
        if (shift.checklist3Id) shiftChecklistIds.push(shift.checklist3Id);

        const junctionChecklists = await db.select().from(shiftChecklists)
          .where(eq(shiftChecklists.shiftId, shift.id));
        for (const jc of junctionChecklists) {
          if (!shiftChecklistIds.includes(jc.checklistId)) {
            shiftChecklistIds.push(jc.checklistId);
          }
        }
      }

      let checklistsData: any[] = [];
      if (shiftChecklistIds.length > 0) {
        checklistsData = await db.select().from(checklists)
          .where(and(
            inArray(checklists.id, shiftChecklistIds),
            eq(checklists.isActive, true)
          ));
      }

      const assignedChecklistIds = new Set(shiftChecklistIds);
      const userAssignments = await db.select().from(checklistAssignments)
        .where(and(
          eq(checklistAssignments.isActive, true),
          or(
            eq(checklistAssignments.assignedUserId, user.id),
            ...(user.branchId ? [
              and(
                eq(checklistAssignments.scope, 'branch'),
                eq(checklistAssignments.branchId, user.branchId)
              )
            ] : []),
            ...(user.role && user.branchId ? [
              and(
                eq(checklistAssignments.scope, 'role'),
                eq(checklistAssignments.role, user.role),
                eq(checklistAssignments.branchId, user.branchId)
              )
            ] : [])
          )
        ));

      const additionalChecklistIds = userAssignments
        .map(a => a.checklistId)
        .filter(id => !assignedChecklistIds.has(id));

      if (additionalChecklistIds.length > 0) {
        const additionalChecklists = await db.select().from(checklists)
          .where(and(
            inArray(checklists.id, additionalChecklistIds),
            eq(checklists.isActive, true)
          ));
        checklistsData = [...checklistsData, ...additionalChecklists];
      }

      const userScope = user.role && isBranchRole(user.role as UserRoleType) ? 'branch' : 'factory';
      checklistsData = checklistsData.filter((c) => !c.scope || c.scope === userScope);

      res.json({
        onLeave: false,
        shift: shift ? {
          id: shift.id,
          shiftDate: shift.shiftDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          shiftType: shift.shiftType,
          status: shift.status,
        } : null,
        checklists: checklistsData,
      });
    } catch (error: unknown) {
      console.error("Error fetching daily checklists:", error);
      res.status(500).json({ message: "Günlük checklist verisi alınamadı" });
    }
  });

  // GET /api/checklists/my-assignments - Get checklists assigned to current user
  router.get('/api/checklists/my-assignments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Use the new assignment-based method
      const myAssignments = await storage.getMyChecklistAssignments(
        user.id,
        user.branchId || undefined,
        user.role || undefined
      );
      
      // Format response with task counts
      const result = myAssignments.map(checklist => ({
        id: checklist.id,
        title: checklist.title,
        description: checklist.description,
        frequency: checklist.frequency,
        category: checklist.category,
        timeWindowStart: checklist.timeWindowStart,
        timeWindowEnd: checklist.timeWindowEnd,
        isActive: checklist.isActive,
        assignment: checklist.assignment,
        tasks: checklist.tasks,
        totalTasks: checklist.tasks.length,
        pendingTasks: checklist.tasks.length,
        completedTasks: 0
      }));
      
      res.json(result);
    } catch (error: unknown) {
      console.error('Error getting my checklist assignments:', error);
      res.status(500).json({ message: 'Checklist atamaları alınamadı' });
    }
  });

  // ========================================
  // CHECKLIST ASSIGNMENT ROUTES
  // ========================================

  // GET /api/checklist-assignments - Get all assignments (admin/supervisor)
  router.get('/api/checklist-assignments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const checklistId = req.query.checklistId ? parseInt(req.query.checklistId) : undefined;
      const assignments = await storage.getChecklistAssignments(checklistId);
      res.json(assignments);
    } catch (error: unknown) {
      console.error('Error getting checklist assignments:', error);
      res.status(500).json({ message: 'Atamalar alınamadı' });
    }
  });

  // POST /api/checklist-assignments - Create new assignment
  router.post('/api/checklist-assignments', isAuthenticated, requireManifestAccess('gorevler', 'create'), async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'edit');
      
      const assignmentInputSchema = z.object({
        checklistId: z.number({ required_error: 'checklistId zorunludur' }),
        scope: z.enum(['user', 'branch', 'role'], { required_error: 'scope zorunludur' }),
        assignedUserId: z.string().nullable().optional(),
        branchId: z.number().nullable().optional(),
        role: z.string().nullable().optional(),
        shiftId: z.number().nullable().optional(),
        effectiveFrom: z.string().nullable().optional(),
        effectiveTo: z.string().nullable().optional(),
        checklistName: z.string().optional(),
        assignedToId: z.string().optional(),
        userId: z.string().optional(),
      });
      const parsed = assignmentInputSchema.parse(req.body);
      const { checklistId, scope, assignedUserId, branchId, role, shiftId, effectiveFrom, effectiveTo } = parsed;
      
      if (scope === 'user' && !assignedUserId) {
        return res.status(400).json({ message: 'Kullanıcı ataması için assignedUserId zorunludur' });
      }
      
      if ((scope === 'branch' || scope === 'role') && !branchId) {
        return res.status(400).json({ message: 'Şube/rol ataması için branchId zorunludur' });
      }
      
      if (scope === 'role' && !role) {
        return res.status(400).json({ message: 'Rol ataması için role zorunludur' });
      }
      
      const assignment = await storage.createChecklistAssignment({
        checklistId,
        scope,
        assignedUserId: scope === 'user' ? assignedUserId : null,
        branchId: (scope === 'branch' || scope === 'role') ? branchId : null,
        role: scope === 'role' ? role : null,
        shiftId: shiftId || null,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        isActive: true,
        createdById: user.id
      });
      
      // Event task: notify assigned users about new checklist
      try {
        const notifyUserId = parsed.assignedToId || parsed.userId;
        if (notifyUserId) {
          const branchInfo = parsed.branchId ? await storage.getBranch(parsed.branchId) : null;
          onChecklistAssigned(
            parsed.checklistName || 'Checklist',
            [notifyUserId],
            branchInfo?.name
          );
        }
      } catch (e) { console.error("Event task error:", e); }
      res.status(201).json(assignment);
    } catch (error: unknown) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      console.error('Error creating checklist assignment:', error);
      res.status(500).json({ message: 'Atama oluşturulamadı' });
    }
  });

  // PATCH /api/checklist-assignments/:id - Update assignment
  router.patch('/api/checklist-assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'edit');
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const updates = insertChecklistAssignmentSchema.partial().parse(req.body);
      
      const updated = await storage.updateChecklistAssignment(id, updates);
      if (!updated) {
        return res.status(404).json({ message: 'Atama bulunamadı' });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      console.error('Error updating checklist assignment:', error);
      res.status(500).json({ message: 'Atama güncellenemedi' });
    }
  });

  // DELETE /api/checklist-assignments/:id - Delete assignment
  router.delete('/api/checklist-assignments/:id', isAuthenticated, requireManifestAccess('gorevler', 'delete'), async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      
      const id = parseInt(req.params.id);
      await storage.deleteChecklistAssignment(id);
      
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting checklist assignment:', error);
      res.status(500).json({ message: 'Atama silinemedi' });
    }
  });


  // ========================================
  // CHECKLIST COMPLETION ROUTES
  // ========================================

  // POST /api/checklist-completions/start - Start a checklist
  router.post('/api/checklist-completions/start', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const completionStartSchema = z.object({
        assignmentId: z.number({ required_error: 'assignmentId zorunludur' }),
        checklistId: z.number({ required_error: 'checklistId zorunludur' }),
        branchId: z.number().nullable().optional(),
        shiftId: z.number().nullable().optional(),
      });
      const { assignmentId, checklistId, branchId, shiftId } = completionStartSchema.parse(req.body);
      
      // Check if there's already an in-progress completion for today
      const today = new Date().toISOString().split('T')[0];
      const existingCompletions = await storage.getUserChecklistCompletions(user.id, today);
      const inProgress = existingCompletions.find(c => 
        c.checklistId === checklistId && c.status === 'in_progress'
      );
      
      if (inProgress) {
        // Return existing in-progress completion
        const completionWithTasks = await storage.getChecklistCompletionWithTasks(inProgress.id);
        return res.json(completionWithTasks);
      }
      
      const completion = await storage.startChecklistCompletion({
        assignmentId,
        checklistId,
        userId: user.id,
        branchId: branchId || user.branchId,
        shiftId,
      });
      
      const completionWithTasks = await storage.getChecklistCompletionWithTasks(completion.id);
      res.status(201).json(completionWithTasks);
    } catch (error: unknown) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      console.error('Error starting checklist completion:', error);
      res.status(500).json({ message: 'Checklist başlatılamadı' });
    }
  });

  // GET /api/checklist-completions/:id - Get completion with tasks
  router.get('/api/checklist-completions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const completion = await storage.getChecklistCompletionWithTasks(id);
      
      if (!completion) {
        return res.status(404).json({ message: 'Checklist tamamlama bulunamadı' });
      }
      
      res.json(completion);
    } catch (error: unknown) {
      console.error('Error fetching checklist completion:', error);
      res.status(500).json({ message: 'Veri getirilemedi' });
    }
  });

  // GET /api/checklist-completions/my/today - Get user's completions for today
  router.get('/api/checklist-completions/my/today', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const completions = await storage.getUserChecklistCompletions(user.id, date);
      res.json(completions);
    } catch (error: unknown) {
      console.error('Error fetching user completions:', error);
      res.status(500).json({ message: 'Veri getirilemedi' });
    }
  });

  // POST /api/checklist-completions/:completionId/tasks/:taskId/complete - Complete a task
  router.post('/api/checklist-completions/:completionId/tasks/:taskId/complete', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const completionId = parseInt(req.params.completionId);
      const taskId = parseInt(req.params.taskId);
      if (isNaN(completionId) || isNaN(taskId)) return res.status(400).json({ message: "Geçersiz ID" });
      const taskCompleteSchema = z.object({
        photoUrl: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      const { photoUrl, notes } = taskCompleteSchema.parse(req.body);
      
      const taskCompletion = await storage.completeChecklistTask({
        completionId,
        taskId,
        userId: user.id,
        photoUrl,
        notes,
      });
      
      res.json(taskCompletion);
    } catch (error: unknown) {
      console.error('Error completing task:', error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: 'Görev tamamlanamadı' });
    }
  });

  // POST /api/checklist-completions/:completionId/tasks/:taskId/verify-photo - AI verify photo for task
  router.post('/api/checklist-completions/:completionId/tasks/:taskId/verify-photo', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const completionId = parseInt(req.params.completionId);
      const taskId = parseInt(req.params.taskId);
      if (isNaN(completionId) || isNaN(taskId)) return res.status(400).json({ message: "Geçersiz ID" });
      const verifyPhotoSchema = z.object({ photoBase64: z.string() });
      const parseResult = verifyPhotoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: 'Fotoğraf gereklidir' });
      }
      
      // Get task details including AI verification settings
      const task = await storage.getChecklistTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Görev bulunamadı' });
      }
      
      // Compress uploaded photo
      const { photoBase64 } = parseResult.data;
      const compressedPhoto = await compressChecklistPhotoBase64(photoBase64);
      const compressedBase64 = `data:image/webp;base64,${compressedPhoto.toString('base64')}`;
      
      // Upload compressed photo to S3
      const photoUrl = await storage.uploadChecklistPhoto(compressedPhoto, completionId, taskId);
      
      // Calculate photo expiry (2 weeks from now)
      const photoExpiresAt = new Date();
      photoExpiresAt.setDate(photoExpiresAt.getDate() + 14);
      
      // Default verification result for tasks without AI verification
      let verificationResult = {
        passed: true,
        similarityScore: 100,
        verificationNote: 'Fotoğraf kaydedildi',
        details: { matchingAspects: [], differences: [], suggestions: [] }
      };
      
      // If task has AI verification enabled and reference photo exists
      if (task.aiVerificationType && task.aiVerificationType !== 'none' && task.referencePhotoUrl) {
        // Fetch reference photo from S3
        const referencePhotoData = await storage.getChecklistReferencePhoto(task.referencePhotoUrl);
        
        if (referencePhotoData) {
          const referenceBase64 = `data:image/webp;base64,${referencePhotoData.toString('base64')}`;
          
          // Run AI verification
          verificationResult = await verifyChecklistPhoto(
            referenceBase64,
            compressedBase64,
            task.aiVerificationType,
            task.tolerancePercent || 80,
            task.taskDescription,
            user.id,
            user.branchId
          );
        }
      }
      
      // Save task completion with AI verification results
      const taskCompletion = await storage.completeChecklistTaskWithVerification({
        completionId,
        taskId,
        userId: user.id,
        photoUrl,
        photoExpiresAt,
        aiVerificationResult: verificationResult.passed ? 'passed' : 'failed',
        aiSimilarityScore: verificationResult.similarityScore,
        aiVerificationNote: verificationResult.verificationNote,
      });
      
      // Create notification and update performance if verification failed
      if (!verificationResult.passed) {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Create notification for user
        await storage.createNotification({
          userId: user.id,
          title: 'AI Fotoğraf Doğrulama Başarısız',
          message: `"${task.taskDescription}" görevi için yüklenen fotoğraf %${verificationResult.similarityScore} benzerlik skoru aldı. Gereken: %${task.tolerancePercent || 80}`,
          type: 'warning',
          priority: 'normal',
          relatedType: 'checklist',
          relatedId: completionId,
          branchId: user.branchId,
        });
        
        // 2. Update employee performance score
        await storage.updateEmployeeAIVerificationScore(
          user.id,
          user.branchId,
          today,
          verificationResult.passed,
          verificationResult.similarityScore
        );
        
        // 3. Create dashboard alert for critical AI verification failures (below 50% similarity)
        if (verificationResult.similarityScore < 50) {
          await storage.createDashboardAlert({
            context: 'branch',
            contextId: user.branchId,
            triggerType: 'ai_verification_failed',
            severity: 'warning',
            status: 'active',
            title: 'AI Doğrulama Başarısız',
            message: `${user.firstName} ${user.lastName} - "${task.taskDescription}" görevi %${verificationResult.similarityScore} benzerlik skoru aldı`,
            payload: JSON.stringify({
              userId: user.id,
              taskId,
              completionId,
              similarityScore: verificationResult.similarityScore,
              requiredScore: task.tolerancePercent || 80,
            }),
            relatedUserId: user.id,
            relatedChecklistId: completionId,
            occurredAt: new Date(),
          });
        }
      }
      
      res.json({
        taskCompletion,
        verification: verificationResult,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "VerifyTaskPhoto");
    }
  });

  // POST /api/checklist-completions/:id/submit - Submit completed checklist
  router.post('/api/checklist-completions/:id/submit', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const completion = await storage.submitChecklistCompletion(id);
      
      if (!completion) {
        return res.status(404).json({ message: 'Checklist tamamlama bulunamadı' });
      }
      
      // Update employee performance score with checklist data
      if (completion.userId && completion.branchId) {
        const today = new Date().toISOString().split('T')[0];
        await storage.updateEmployeeChecklistPerformance(
          completion.userId, 
          completion.branchId, 
          today, 
          completion.score || 100
        );
      }
      
      res.json(completion);
    } catch (error: unknown) {
      if (respondIfAiBudgetError(error, res)) return;
      console.error('Error submitting checklist:', error);
      res.status(500).json({ message: 'Checklist gönderilemedi' });
    }
  });

  // GET /api/checklist-completions/manager/all - Manager view of all completions
  router.get('/api/checklist-completions/manager/all', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      
      const { branchId, date, status } = req.query;
      
      // If user has branch restriction, use their branch
      const effectiveBranchId = user.role === 'admin' || user.role === 'hq_manager' 
        ? (branchId ? parseInt(branchId as string) : undefined)
        : user.branchId;
      
      const completions = await storage.getManagerChecklistCompletions(
        effectiveBranchId,
        date as string,
        status as string
      );
      
      res.json(completions);
    } catch (error: unknown) {
      console.error('Error fetching manager completions:', error);
      res.status(500).json({ message: 'Veri getirilemedi' });
    }
  });

  // PATCH /api/checklist-completions/:id/review - Manager review and score update
  router.patch('/api/checklist-completions/:id/review', isAuthenticated, requireManifestAccess('gorevler', 'approve'), async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'edit');
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const reviewSchema = z.object({
        score: z.number().min(0).max(100),
        reviewNote: z.string().nullable().optional(),
      });
      const { score, reviewNote } = reviewSchema.parse(req.body);
      
      const updated = await storage.updateChecklistCompletionScore(id, score, user.id, reviewNote);
      
      if (!updated) {
        return res.status(404).json({ message: 'Checklist tamamlama bulunamadı' });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error('Error reviewing completion:', error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: 'Değerlendirme kaydedilemedi' });
    }
  });


  router.get('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const id = parseInt(req.params.id);
      const checklist = await storage.getChecklist(id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }
      const tasks = await storage.getChecklistTasks(id);
      res.json({ ...checklist, tasks });
    } catch (error: unknown) {
      console.error("Error fetching checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist getirilemedi" });
    }
  });

  router.delete('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const id = parseInt(req.params.id);
      await db.update(checklists).set({ deletedAt: new Date() }).where(eq(checklists.id, id));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "checklists",
        resourceId: String(id),
        details: { softDelete: true },
      });
      res.json({ message: "Checklist silindi" });
    } catch (error: unknown) {
      console.error("Error deleting checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist silinemedi" });
    }
  });

  router.get('/api/checklist-tasks', isAuthenticated, async (req, res) => {
    try {
      const checklistId = req.query.checklistId ? parseInt(req.query.checklistId as string) : undefined;
      const tasks = await storage.getChecklistTasks(checklistId);
      res.json(tasks);
    } catch (error: unknown) {
      console.error("Error fetching checklist tasks:", error);
      res.status(500).json({ message: "Checklist görevleri alınırken hata oluştu" });
    }
  });

  // PATCH /api/checklist-tasks/reorder - Reorder checklist tasks
  router.patch('/api/checklist-tasks/reorder', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'edit');
      
      const reorderSchema = z.object({
        checklistId: z.number(),
        taskIds: z.array(z.number()).min(1, "taskIds dizisi boş olamaz"),
      });
      const parseResult = reorderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "checklistId ve taskIds dizisi gerekli" });
      }
      const { checklistId, taskIds } = parseResult.data;
      
      // Update order for each task
      for (let i = 0; i < taskIds.length; i++) {
        await db.update(checklistTasks)
          .set({ order: i + 1 })
          .where(and(
            eq(checklistTasks.id, taskIds[i]),
            eq(checklistTasks.checklistId, checklistId)
          ));
      }
      
      res.json({ success: true, message: "Görev sırası güncellendi" });
    } catch (error: unknown) {
      handleApiError(res, error, "ReorderChecklistTasks");
    }
  });

  router.post('/api/checklists/:id/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      const checklistId = parseInt(req.params.id);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.parse({ ...req.body, checklistId });
      
      const existingTasks = await storage.getChecklistTasks(checklistId);
      const duplicateOrder = existingTasks.find(t => t.order === validatedData.order);
      if (duplicateOrder) {
        return res.status(400).json({ message: `Order ${validatedData.order} already exists for this checklist` });
      }
      
      const task = await storage.createChecklistTask(validatedData);
      res.json(task);
    } catch (error: unknown) {
      console.error("Error creating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task oluşturulamadı" });
    }
  });

  router.patch('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'update');
      const taskId = parseInt(req.params.taskId);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.pick({
        taskDescription: true,
        requiresPhoto: true,
        taskTimeStart: true,
        taskTimeEnd: true,
        order: true,
      }).partial().parse(req.body);
      
      // Get task to check photo requirement
      const existingTask = await storage.getChecklistTask?.(taskId);
      
      // Photo validation: if photo required, ensure provided
      if (existingTask?.requiresPhoto && !req.body.photoUrl) {
        return res.status(400).json({ 
          message: '📸 Bu görev fotoğraf gerektirir',
          code: 'PHOTO_REQUIRED'
        });
      }
      
      // Time window validation: warn if outside task time window
      if (validatedData.taskTimeStart && validatedData.taskTimeEnd) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        if (currentTime < validatedData.taskTimeStart || currentTime > validatedData.taskTimeEnd) {
          return res.status(400).json({ 
            message: `⚠️ Görev saat penceresinin dışında (${validatedData.taskTimeStart} - ${validatedData.taskTimeEnd})`,
            code: 'TIME_WINDOW_VIOLATION'
          });
        }
      }
      
      const task = await storage.updateChecklistTask(taskId, validatedData);
      if (!task) {
        return res.status(404).json({ message: "Task bulunamadı" });
      }
      res.json(task);
    } catch (error: unknown) {
      console.error("Error updating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task güncellenemedi" });
    }
  });

  router.delete('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const taskId = parseInt(req.params.taskId);
      await storage.deleteChecklistTask(taskId);
      res.json({ message: "Task silindi" });
    } catch (error: unknown) {
      console.error("Error deleting checklist task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task silinemedi" });
    }
  });
  // Get troubleshooting steps for equipment type
  router.get('/api/troubleshooting/:equipmentType', isAuthenticated, async (req, res) => {
    try {
      const equipmentType = req.params.equipmentType;
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType);
      res.json(steps);
    } catch (error: unknown) {
      console.error("Error fetching troubleshooting steps:", error);
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/faults', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;
      
      ensurePermission(user, 'equipment_faults', 'view');
      
      // Authorization: Branch users can only access their own branch faults
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch - include details
        const faults = await storage.getFaultsWithDetails(branchId);
        const paginated = faults.slice(offset, offset + limit);
        return res.json({ data: paginated, total: faults.length, limit, offset });
      }
      
      // HQ users can access all or filter by branch - include details
      const faults = await storage.getFaultsWithDetails(requestedBranchId);
      const paginated = faults.slice(offset, offset + limit);
      res.json({ data: paginated, total: faults.length, limit, offset });
    } catch (error: unknown) {
      console.error("Error fetching faults:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Arızalar alınırken hata oluştu" });
    }
  });

  router.post('/api/faults', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertEquipmentFaultSchema.passthrough().parse(req.body) as any;
      
      ensurePermission(user, 'equipment_faults', 'create');
      
      // Authorization: Branch users can only create faults for their own branch
      let faultBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Force branch users to create faults only for their branch
        faultBranchId = branchId;
      }
      
      // Duplicate open fault check - prevent creating new fault if equipment already has an open one
      if (validatedData.equipmentId) {
        const openFaults = await db.select({ id: equipmentFaults.id })
          .from(equipmentFaults)
          .where(and(
            eq(equipmentFaults.equipmentId, validatedData.equipmentId),
            not(inArray(equipmentFaults.currentStage, ['kapatildi', 'cozuldu']))
          ))
          .limit(1);
        if (openFaults.length > 0) {
          return res.status(400).json({
            message: `Bu cihaz için zaten açık bir arıza kaydı (#${openFaults[0].id}) bulunmaktadır. Lütfen önce mevcut arızayı kapatın.`,
            existingFaultId: openFaults[0].id,
            duplicateFault: true,
          });
        }
      }

      // Mandatory Troubleshooting Enforcement
      // If troubleshooting steps exist for this equipment type and user hasn't completed them, reject the fault
      if (validatedData.equipmentId) {
        const equipment = await storage.getEquipmentById(validatedData.equipmentId);
        if (equipment) {
          const completedSteps = validatedData.completedTroubleshootingSteps || [];
          const troubleshootingCheck = await storage.isTroubleshootingCompleteForEquipment(
            equipment.equipmentType,
            completedSteps
          );
          
          if (!troubleshootingCheck.complete) {
            return res.status(400).json({
              message: "Arıza bildirimi için önce sorun giderme adımlarını tamamlamanız gerekiyor",
              requiresTroubleshooting: true,
              missingSteps: troubleshootingCheck.missingSteps,
              allRequiredSteps: troubleshootingCheck.requiredSteps,
            });
          }
        }
      }
      
      const fault = await storage.createFault({
        ...validatedData,
        branchId: faultBranchId,
        reportedById: userId,
      });
      
      // Save troubleshooting completion records
      if (validatedData.completedTroubleshootingSteps && validatedData.completedTroubleshootingSteps.length > 0) {
        for (const step of validatedData.completedTroubleshootingSteps) {
          await storage.createTroubleshootingCompletion({
            faultId: fault.id,
            stepId: step.stepId,
            completedById: userId,
            notes: step.notes || null,
          });
        }
      }

      // FAULT NOTIFICATION: Notify relevant roles based on priority and location
      try {
        const branch = faultBranchId ? await storage.getBranch(faultBranchId) : null;
        const equipmentItem = fault.equipmentId ? await storage.getEquipmentById(fault.equipmentId) : null;
        const faultDesc = fault.description || 'Arıza bildirildi';
        const equipmentLabel = equipmentItem?.equipmentType || 'Ekipman';
        const branchLabel = branch?.name || 'Şube';
        const isCritical = fault.priority === "kritik";
        const notifType = isCritical ? "critical_fault" : "equipment_fault";
        const notifTitle = isCritical ? "KRİTİK ARIZA UYARISI" : "Yeni arıza bildirimi";

        const hqTechUsers = await storage.getUsersByRole("teknik");
        for (const techUser of hqTechUsers) {
          await storage.createNotification({
            userId: techUser.id,
            type: notifType,
            title: notifTitle,
            message: `${branchLabel} — ${equipmentLabel}: ${faultDesc.substring(0, 120)}`,
            link: `/ariza-yonetim`,
            isRead: false,
            branchId: faultBranchId,
          });
        }

        const destekUsers = await storage.getUsersByRole("destek");
        for (const destekUser of destekUsers) {
          await storage.createNotification({
            userId: destekUser.id,
            type: notifType,
            title: notifTitle,
            message: `${branchLabel} — ${equipmentLabel}: ${faultDesc.substring(0, 120)}`,
            link: `/ariza-yonetim`,
            isRead: false,
            branchId: faultBranchId,
          });
        }

        if (faultBranchId) {
          const subeMudurleri = await storage.getUsersByBranchAndRole(faultBranchId, 'mudur');
          for (const mudur of subeMudurleri) {
            await storage.createNotification({
              userId: mudur.id,
              type: notifType,
              title: 'Ekipman arızası',
              message: `${equipmentLabel}: ${faultDesc.substring(0, 120)}`,
              link: `/ariza-yonetim`,
              isRead: false,
              branchId: faultBranchId,
            });
          }
        }

        const isFabrika = faultBranchId ? (branch?.name || '').toLowerCase().includes('fabrika') : false;
        if (isFabrika) {
          const fabrikaMudurler = await storage.getUsersByRole('fabrika_mudur');
          for (const fm of fabrikaMudurler) {
            await storage.createNotification({
              userId: fm.id,
              type: notifType,
              title: 'Fabrika ekipman arızası',
              message: `${equipmentLabel}: ${faultDesc.substring(0, 120)}`,
              link: `/ariza-yonetim`,
              isRead: false,
              branchId: faultBranchId,
            });
          }
        }
      } catch (notificationError) {
        console.error("Error sending fault notifications:", notificationError);
      }
      
      try {
        const { checkRepeatFaultForEquipment } = await import('../agent/skills/equipment-lifecycle-tracker');
        await checkRepeatFaultForEquipment(
          fault.equipmentName || fault.description || "Ekipman",
          fault.equipmentId ?? null,
          faultBranchId ?? null
        );
      } catch (repeatErr) {
        console.error("Repeat fault check error:", repeatErr);
      }

      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      // Event task: notify teknik team about new fault
      try {
        const teknikUsers = await storage.getUsersByRole('teknik');
        const adminUsers = await storage.getUsersByRole('admin');
        const targetIds = [...teknikUsers, ...adminUsers].map(u => u.id);
        if (targetIds.length > 0) {
          const branchInfo = fault.branchId ? await storage.getBranch(fault.branchId) : null;
          onFaultReported(
            fault.id,
            fault.description || 'Yeni ariza',
            targetIds,
            branchInfo?.name
          );
        }
      } catch (e) { console.error("Event task error:", e); }
      res.json(fault);
    } catch (error: unknown) {
      console.error("Error creating fault:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz arıza verisi", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Arıza kaydı oluşturulurken hata oluştu" });
    }
  });

  router.post('/api/faults/ai-diagnose', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const diagnoseSchema = z.object({
        equipmentType: z.string().min(1, "Ekipman tipi zorunludur"),
        faultDescription: z.string().min(1, "Arıza açıklaması zorunludur"),
      });
      const parseResult = diagnoseSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Ekipman tipi ve arıza açıklaması zorunludur", errors: parseResult.error.errors });
      }
      const { equipmentType, faultDescription } = parseResult.data;

      const diagnosis = await diagnoseFault(equipmentType, faultDescription, user.id);
      res.json(diagnosis);
    } catch (error: unknown) {
      handleApiError(res, error, "DiagnoseFault");
    }
  });

  router.post('/api/faults/:id/photo', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const faultPhotoSchema = z.object({ photoUrl: z.string().optional() });
      const { photoUrl } = faultPhotoSchema.parse(req.body);
      const userId = req.user.id; // For rate limiting
      
      // Authorization: Branch users can only update faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı düzenleme yetkiniz yok" });
        }
      }
      
      // Update photo URL after authorization check
      if (photoUrl) {
        const fault = await storage.updateFault(id, { photoUrl });
        if (!fault) {
          return res.status(404).json({ message: "Arıza bulunamadı" });
        }

        try {
          const analysis = await analyzeFaultPhoto(
            photoUrl,
            fault.equipmentName,
            fault.description,
            userId
          );
          const updatedFault = await storage.updateFault(id, {
            aiAnalysis: analysis.analysis,
            aiSeverity: analysis.severity,
            aiRecommendations: analysis.recommendations,
          });
          res.json(updatedFault || fault);
        } catch (aiError) {
          if (respondIfAiBudgetError(aiError, res)) return;
          console.error("AI analysis error:", aiError);
          res.json(fault);
        }
      } else {
        // If no photo URL provided, just return existing fault
        res.json(existingFault);
      }
    } catch (error: unknown) {
      console.error("Error updating fault photo:", error);
      res.status(500).json({ message: "Arıza fotoğrafı güncellenirken hata oluştu" });
    }
  });

  router.post('/api/faults/:id/service-notification', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const serviceNotifSchema = z.object({
        serviceNotificationDate: z.string().min(1, "Bildirim tarihi gerekli"),
        serviceNotificationMethod: z.string().optional(),
      });
      const parseResult = serviceNotifSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Bildirim tarihi gerekli" });
      }
      const { serviceNotificationDate, serviceNotificationMethod } = parseResult.data;

      const existingFault = await db.select().from(equipmentFaults).where(eq(equipmentFaults.id, id)).limit(1);
      if (!existingFault.length) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      if (existingFault[0].responsibleParty !== 'branch') {
        return res.status(400).json({ message: "Bu arıza merkez sorumluluğundadır, servis bildirimi yapılamaz" });
      }

      await db.update(equipmentFaults)
        .set({
          serviceNotificationDate: new Date(serviceNotificationDate),
          serviceNotificationMethod: serviceNotificationMethod || 'email',
          currentStage: 'isleme_alindi',
          stageHistory: sql`COALESCE(stage_history, '[]'::jsonb) || ${JSON.stringify([{
            stage: 'isleme_alindi',
            changedBy: user.id,
            changedAt: new Date().toISOString(),
            notes: `Servis bildirimi yapıldı (${serviceNotificationMethod || 'email'})`,
          }])}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(equipmentFaults.id, id));

      res.json({ success: true, message: "Servis bildirim tarihi kaydedildi" });
    } catch (error: unknown) {
      console.error("Service notification save error:", error);
      res.status(500).json({ message: "Bildirim tarihi kaydedilemedi" });
    }
  });

  router.post('/api/faults/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Branch users can only resolve faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı çözme yetkiniz yok" });
        }
      }
      
      const fault = await storage.resolveFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      // Auto-resolve fault event tasks
      resolveEventTask('fault_reported', parseInt(req.params.id));
      resolveEventTask('fault_assigned', parseInt(req.params.id));
      res.json(fault);
    } catch (error: unknown) {
      console.error("Error resolving fault:", error);
      res.status(500).json({ message: "Arıza çözülürken hata oluştu" });
    }
  });

  router.put('/api/faults/:id/stage', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const stageSchema = z.object({
        stage: z.string().min(1, "Stage is required"),
        notes: z.string().nullable().optional(),
      });
      const parseResult = stageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Stage is required" });
      }
      const { stage, notes } = parseResult.data;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Validate stage value
      const { FAULT_STAGES } = await import('@shared/schema');
      const validStages = Object.values(FAULT_STAGES);
      if (!validStages.includes(stage)) {
        return res.status(400).json({ message: "Geçersiz aşama değeri" });
      }
      
      // Check permissions: branch vs hq_teknik
      const faultToUpdate = await storage.getFault(id);
      if (!faultToUpdate) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      
      // Permission logic:
      // - HQ teknik role can change any fault stage
      // - Branch roles (supervisor, barista, stajyer) can only change their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || faultToUpdate.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın aşamasını değiştirme yetkiniz yok" });
        }
      }
      
      const fault = await storage.changeFaultStage(id, stage, userId, notes);
      
      // Invalidate caches
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(fault);
    } catch (error: unknown) {
      console.error("Error changing fault stage:", error);
      res.status(500).json({ message: "Arıza aşaması değiştirilirken hata oluştu" });
    }
  });

  router.patch('/api/faults/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentStage, assignedTo, notes, actualCost } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }

      // Permission logic: branch users can only manage their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;

      if (!isTeknik) {
        if (!isBranchUser || !userBranchId || existingFault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızayı düzenleme yetkiniz yok" });
        }
      }

      const updateData: any = {};
      if (currentStage) updateData.currentStage = currentStage;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
      if (actualCost !== undefined) updateData.actualCost = actualCost ? parseFloat(actualCost) : null;

      // If stage is being updated, record the transition
      if (currentStage && currentStage !== existingFault.currentStage) {
        // Record stage transition with notes
        await storage.changeFaultStage(id, currentStage, userId, notes || undefined);
      } else if (assignedTo !== undefined || actualCost !== undefined) {
        // Just update the fault without stage change
        const updated = await storage.updateFault(id, updateData);
        // Invalidate caches
        invalidateCache('equipment');
        invalidateCache('critical-equipment');
        return res.json(updated);
      }

      const updated = await storage.getFault(id);
      
      // Invalidate caches
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating fault:", error);
      res.status(500).json({ message: "Arıza güncellenirken hata oluştu" });
    }
  });

  router.get('/api/faults/:id/history', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user.role;
      
      // Check permissions for viewing history
      const fault = await storage.getFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Arıza bulunamadı" });
      }
      
      // Permission logic: same as stage change
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || fault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın geçmişini görüntüleme yetkiniz yok" });
        }
      }
      
      const history = await storage.getFaultStageHistory(id);
      res.json(history);
    } catch (error: unknown) {
      console.error("Error fetching fault history:", error);
      res.status(500).json({ message: "Arıza geçmişi alınırken hata oluştu" });
    }
  });

  router.get('/api/faults/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const faultId = parseInt(req.params.id);
      const fault = await storage.getFault(faultId);
      if (!fault) return res.status(404).json({ message: "Arıza bulunamadı" });

      const comments = await db.select().from(faultComments).where(eq(faultComments.faultId, faultId)).orderBy(faultComments.createdAt);

      const userIds = [...new Set(comments.map(c => c.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
            .from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userList.map(u => [u.id, u]));
      const enriched = comments.map(c => {
        const u = userMap.get(c.userId);
        return { ...c, userName: u ? `${u.firstName} ${u.lastName}` : "Bilinmeyen", userRole: u?.role || "" };
      });
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching fault comments:", error);
      res.status(500).json({ message: "Arıza yorumları alınırken hata oluştu" });
    }
  });

  router.post('/api/faults/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const faultId = parseInt(req.params.id);
      const user = req.user!;
      const { message, isInternal, attachmentUrl } = req.body;

      if (!message || message.trim() === "") {
        return res.status(400).json({ message: "Mesaj boş olamaz" });
      }

      const fault = await storage.getFault(faultId);
      if (!fault) return res.status(404).json({ message: "Arıza bulunamadı" });

      const [comment] = await db.insert(faultComments).values({
        faultId,
        userId: user.id,
        message: message.trim(),
        isInternal: isInternal || false,
        attachmentUrl: attachmentUrl || null,
      }).returning();

      res.json(comment);
    } catch (error: unknown) {
      console.error("Error creating fault comment:", error);
      res.status(500).json({ message: "Yorum oluşturulurken hata oluştu" });
    }
  });

  router.get('/api/faults/:id/detail', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fault = await storage.getFault(id);
      if (!fault) return res.status(404).json({ message: "Arıza bulunamadı" });

      const history = await storage.getFaultStageHistory(id);
      const comments = await db.select().from(faultComments).where(eq(faultComments.faultId, id)).orderBy(faultComments.createdAt);
      const commentUserIds = [...new Set(comments.map(c => c.userId))];
      const commentUsers = commentUserIds.length > 0
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
            .from(users).where(inArray(users.id, commentUserIds))
        : [];
      const commentUserMap = new Map(commentUsers.map(u => [u.id, u]));
      const enrichedComments = comments.map(c => {
        const u = commentUserMap.get(c.userId);
        return { ...c, userName: u ? `${u.firstName} ${u.lastName}` : "Bilinmeyen", userRole: u?.role || "" };
      });

      let equipmentInfo = null;
      if (fault.equipmentId) {
        const allEquipment = await storage.getEquipment();
        equipmentInfo = allEquipment.find((e) => e.id === fault.equipmentId) || null;
      }

      const reporter = await storage.getUser(fault.reportedById);
      const assignee = fault.assignedTo ? await storage.getUser(fault.assignedTo) : null;

      res.json({
        fault: {
          ...fault,
          reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : "Bilinmeyen",
          reporterRole: reporter?.role || "",
          assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
          assigneeRole: assignee?.role || null,
        },
        equipment: equipmentInfo,
        history,
        comments: enrichedComments,
      });
    } catch (error: unknown) {
      console.error("Error fetching fault detail:", error);
      res.status(500).json({ message: "Arıza detayı alınırken hata oluştu" });
    }
  });

  // ========================================
  // FAULT SERVICE TRACKING APIs
  // ========================================

  router.get('/api/fault-service-tracking/:faultId', isAuthenticated, async (req, res) => {
    try {
      const faultId = parseInt(req.params.faultId);
      if (isNaN(faultId)) return res.status(400).json({ message: "Geçersiz arıza ID" });

      const results = await db.select().from(faultServiceTracking)
        .where(eq(faultServiceTracking.faultId, faultId))
        .orderBy(desc(faultServiceTracking.createdAt));

      res.json(results);
    } catch (error: unknown) {
      console.error("Error fetching fault service tracking:", error);
      res.status(500).json({ message: "Servis takibi yüklenirken hata oluştu" });
    }
  });

  router.post('/api/fault-service-tracking', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      const parsed = insertFaultServiceTrackingSchema.parse({
        ...req.body,
        createdById: user.id,
      });

      const [created] = await db.insert(faultServiceTracking).values(parsed).returning();

      await db.insert(faultServiceStatusUpdates).values({
        trackingId: created.id,
        fromStatus: null,
        toStatus: created.currentStatus,
        comment: "Servis takibi oluşturuldu",
        updatedById: user.id,
      });

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error creating fault service tracking:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Servis takibi oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/fault-service-tracking/:id/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const { status, comment, attachmentUrl } = req.body;
      if (!status) return res.status(400).json({ message: "Yeni durum zorunludur" });

      const [existing] = await db.select().from(faultServiceTracking)
        .where(eq(faultServiceTracking.id, id));
      if (!existing) return res.status(404).json({ message: "Servis takibi bulunamadı" });

      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existing.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis takibine erişim yetkiniz yok" });
        }
      }

      const [updated] = await db.update(faultServiceTracking)
        .set({ currentStatus: status, updatedAt: new Date() })
        .where(eq(faultServiceTracking.id, id))
        .returning();

      await db.insert(faultServiceStatusUpdates).values({
        trackingId: id,
        fromStatus: existing.currentStatus,
        toStatus: status,
        comment: comment || null,
        attachmentUrl: attachmentUrl || null,
        updatedById: user.id,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating fault service tracking status:", error);
      res.status(500).json({ message: "Servis durumu güncellenirken hata oluştu" });
    }
  });

  router.patch('/api/fault-service-tracking/:id/delivery-form', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const [existing] = await db.select().from(faultServiceTracking)
        .where(eq(faultServiceTracking.id, id));
      if (!existing) return res.status(404).json({ message: "Servis takibi bulunamadı" });

      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existing.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis takibine erişim yetkiniz yok" });
        }
      }

      const deliveryForm = req.body;

      const [updated] = await db.update(faultServiceTracking)
        .set({
          deliveryForm: deliveryForm,
          currentStatus: FAULT_SERVICE_STATUS.TESLIM_ALINDI,
          updatedAt: new Date(),
        })
        .where(eq(faultServiceTracking.id, id))
        .returning();

      await db.insert(faultServiceStatusUpdates).values({
        trackingId: id,
        fromStatus: existing.currentStatus,
        toStatus: FAULT_SERVICE_STATUS.TESLIM_ALINDI,
        comment: "Teslim-tespit formu dolduruldu",
        updatedById: user.id,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating delivery form:", error);
      res.status(500).json({ message: "Teslim formu güncellenirken hata oluştu" });
    }
  });

  router.get('/api/fault-service-tracking/:id/updates', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const updates = await db.select().from(faultServiceStatusUpdates)
        .where(eq(faultServiceStatusUpdates.trackingId, id))
        .orderBy(desc(faultServiceStatusUpdates.createdAt));

      const enrichedUpdates = [];
      for (const update of updates) {
        const [updater] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, update.updatedById));

        enrichedUpdates.push({
          ...update,
          updatedBy: updater || null,
        });
      }

      res.json(enrichedUpdates);
    } catch (error: unknown) {
      console.error("Error fetching service tracking updates:", error);
      res.status(500).json({ message: "Durum güncellemeleri yüklenirken hata oluştu" });
    }
  });

  // Global service requests list endpoint (HQ management page)
  router.get('/api/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedStatus = req.query.status as string | undefined;
      
      let branchId = requestedBranchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }

      const conditions: SQL[] = [];
      if (branchId) {
        conditions.push(eq(equipment.branchId, branchId));
      }
      if (requestedStatus) {
        conditions.push(eq(equipmentServiceRequests.status, requestedStatus));
      }

      const results = await db
        .select({
          id: equipmentServiceRequests.id,
          equipmentId: equipmentServiceRequests.equipmentId,
          faultId: equipmentServiceRequests.faultId,
          serviceDecision: equipmentServiceRequests.serviceDecision,
          serviceProvider: equipmentServiceRequests.serviceProvider,
          contactInfo: equipmentServiceRequests.contactInfo,
          estimatedCost: equipmentServiceRequests.estimatedCost,
          actualCost: equipmentServiceRequests.actualCost,
          notes: equipmentServiceRequests.notes,
          status: equipmentServiceRequests.status,
          timeline: equipmentServiceRequests.timeline,
          photo1Url: equipmentServiceRequests.photo1Url,
          photo2Url: equipmentServiceRequests.photo2Url,
          createdById: equipmentServiceRequests.createdById,
          updatedById: equipmentServiceRequests.updatedById,
          createdAt: equipmentServiceRequests.createdAt,
          updatedAt: equipmentServiceRequests.updatedAt,
          equipmentName: equipment.equipmentType,
          equipmentType: equipment.equipmentType,
          branchId: equipment.branchId,
          branchName: branches.name,
          createdByUsername: sql<string>`cb.username`,
          updatedByUsername: sql<string>`ub.username`,
        })
        .from(equipmentServiceRequests)
        .innerJoin(equipment, eq(equipmentServiceRequests.equipmentId, equipment.id))
        .innerJoin(branches, eq(equipment.branchId, branches.id))
        .innerJoin(sql`users cb`, sql`cb.id = ${equipmentServiceRequests.createdById}`)
        .leftJoin(sql`users ub`, sql`ub.id = ${equipmentServiceRequests.updatedById}`)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(equipmentServiceRequests.createdAt));
      
      res.json(results);
    } catch (error: unknown) {
      console.error("Error fetching service requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Servis talepleri alınırken hata oluştu" });
    }
  });

  // Photo upload endpoint for service requests
  router.post('/api/service-requests/:id/upload-photo', isAuthenticated, async (req, res) => {
    try {
      const { compressAndConvertImage } = await import('./photo-utils');
      const requestId = parseInt(req.params.id);
      const { photoData, photoNumber } = req.body;
      
      if (!photoData || !photoNumber || ![1, 2].includes(photoNumber)) {
        return res.status(400).json({ message: 'photoData ve photoNumber (1 veya 2) gerekli' });
      }

      const compressed = await compressAndConvertImage(photoData);
      const base64 = compressed.toString('base64');
      const photoUrl = `data:image/webp;base64,${base64}`;
      
      const photoField = photoNumber === 1 ? 'photo1Url' : 'photo2Url';
      const updatedRequest = await db
        .update(equipmentServiceRequests)
        .set({ [photoField]: photoUrl })
        .where(eq(equipmentServiceRequests.id, requestId))
        .returning();

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Servis talebi bulunamadı' });
      }

      res.json({ success: true, photoUrl, photoNumber });
    } catch (error: unknown) {
      console.error('Foto yükleme hatası:', error);
      res.status(500).json({ message: 'Foto yükleme başarısız' });
    }
  });

  // Create new service request endpoint (from form with machine templates)
  router.post('/api/service-requests/', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const { branchId, equipmentName, equipmentType, priority, serviceProvider, notes, status } = req.body;

      // Validation
      if (!branchId || !equipmentName || !equipmentType || !serviceProvider) {
        return res.status(400).json({ message: "Zorunlu alanlar eksik: branchId, equipmentName, equipmentType, serviceProvider" });
      }

      // Authorization: Branch users can only create requests for their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const userBranchId = assertBranchScope(user);
        if (branchId !== userBranchId) {
          return res.status(403).json({ message: "Bu şube için servis talebi oluşturma yetkiniz yok" });
        }
      }

      // Find or create placeholder equipment for this request
      const allEquipment = await storage.getEquipment(branchId);
      let equipment = allEquipment.find(e => e.name === equipmentName && e.type === equipmentType);
      
      if (!equipment) {
        // Create a new equipment entry as placeholder for this service request
        equipment = await storage.createEquipment({
          branchId,
          name: equipmentName,
          type: equipmentType,
          serialNumber: `SR-${Date.now()}`, // Temporary serial
          purchaseDate: new Date().toISOString(),
          warrantyExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'aktif',
          notes: 'Servis talebi formu üzerinden oluşturulan cihaz',
        });
      }

      // Create the service request
      const serviceRequest = await storage.createServiceRequest({
        equipmentId: equipment.id,
        status: status || 'talep_edildi',
        priority: priority || 'orta',
        serviceProvider,
        notes: notes || '',
        createdById: userId,
      });

      // Send critical notifications to HQ staff if priority is high/critical
      const finalPriority = priority || 'orta';
      if (finalPriority === 'yüksek' || finalPriority === 'kritik') {
        try {
          const hqUsers = await storage.getUsersByRole('hq_staff');
          const branch = await storage.getBranch(branchId);
          
          for (const hqUser of hqUsers) {
            await storage.createNotification({
              userId: hqUser.id,
              type: 'critical_service_request',
              title: finalPriority === 'kritik' ? '🚨 KRİTİK Servis Talebi!' : '⚠️ Yüksek Öncelikli Talep',
              message: `${branch?.name || 'Bilinmeyen Şube'} - ${equipmentType}: ${notes?.substring(0, 50) || 'Acil teknik destek gerekiyor'}`,
              relatedId: serviceRequest.id,
              read: false,
              branchId: branchId,
            });
          }
        } catch (notificationError) {
          console.error('Failed to send critical notifications:', notificationError);
        }
      }

      res.json(serviceRequest);
    } catch (error: unknown) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz servis talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Servis talebi oluşturulamadı" });
    }
  });
  // ============================================================
  // QUALITY AUDIT MODULE - Kalite Kontrol API

  // GET /api/audit-templates - List all templates
  router.get('/api/audit-templates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Şablon listesine erişim yetkiniz yok" });
      }

      const templates = await db.select().from(auditTemplates).orderBy(desc(auditTemplates.createdAt));
      res.json(templates);
    } catch (error: unknown) {
      console.error("Get audit templates error:", error);
      res.status(500).json({ message: "Şablonlar alınamadı" });
    }
  });

  // GET /api/audit-templates/:id - Get single template with items
  router.get('/api/audit-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const [template] = await db.select().from(auditTemplates).where(eq(auditTemplates.id, templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      const items = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, templateId))
        .orderBy(auditTemplateItems.sectionOrder, auditTemplateItems.itemOrder);

      res.json({ ...template, items });
    } catch (error: unknown) {
      console.error("Get audit template error:", error);
      res.status(500).json({ message: "Şablon alınamadı" });
    }
  });

  // POST /api/audit-templates - Create new template
  router.post('/api/audit-templates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon oluşturma yetkiniz yok" });
      }

      const data = insertAuditTemplateSchema.parse(req.body);
      const [template] = await db.insert(auditTemplates).values({
        ...data,
        createdById: user.id,
      }).returning();

      res.status(201).json(template);
    } catch (error: unknown) {
      console.error("Create audit template error:", error);
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });

  // POST /api/audit-templates/import - Import template from JSON
  router.post('/api/audit-templates/import', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon import yetkiniz yok" });
      }

      const { name, description, version, isActive, totalPoints, passingScore, sections } = req.body;

      // Create template
      const [template] = await db.insert(auditTemplates).values({
        name,
        description,
        version: version || "1.0.0",
        isActive: isActive !== false,
        totalPoints: totalPoints || 100,
        passingScore: passingScore || 70,
        createdById: user.id,
      }).returning();

      // Create template items from sections
      const items: InsertAuditTemplateItem[] = [];
      for (const section of sections || []) {
        for (const item of section.items || []) {
          items.push({
            templateId: template.id,
            sectionName: section.sectionName,
            sectionOrder: section.sectionOrder,
            sectionWeight: section.weight,
            itemCode: item.itemCode,
            questionTr: item.questionTr,
            questionEn: item.questionEn,
            category: item.category,
            maxPoints: item.maxPoints,
            isCritical: item.isCritical || false,
            requiresPhoto: item.requiresPhoto || false,
            itemOrder: item.itemOrder,
          });
        }
      }

      if (items.length > 0) {
        await db.insert(auditTemplateItems).values(items);
      }

      const createdItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, template.id));

      res.status(201).json({ ...template, items: createdItems });
    } catch (error: unknown) {
      console.error("Import audit template error:", error);
      res.status(500).json({ message: "Şablon import edilemedi" });
    }
  });

  // PUT /api/audit-templates/:id - Update template
  router.put('/api/audit-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon güncelleme yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      const data = insertAuditTemplateSchema.partial().parse(req.body);
      
      const [updated] = await db.update(auditTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(auditTemplates.id, templateId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update audit template error:", error);
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });

  // DELETE /api/audit-templates/:id - Delete template
  router.delete('/api/audit-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon silme yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      await db.update(auditTemplates).set({ deletedAt: new Date() }).where(eq(auditTemplates.id, templateId));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "audit_templates",
        resourceId: String(templateId),
        details: { softDelete: true },
      });
      res.json({ message: "Şablon silindi" });
    } catch (error: unknown) {
      console.error("Delete audit template error:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });

  // ============================================================
  // AUDIT TEMPLATE ITEMS - Şablon Maddeleri CRUD
  // ============================================================

  // Zod validation schema for template items
  const templateItemSchema = z.object({
    itemText: z.string().min(1, "Madde metni gerekli").max(500),
    itemType: z.enum(['checkbox', 'rating', 'text', 'photo']).optional().default('checkbox'),
    weight: z.preprocess(
      (val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? null : num;
      },
      z.number().min(0).max(100).nullable().optional()
    ),
    maxPoints: z.preprocess(
      (val) => typeof val === 'string' ? parseInt(val) : val,
      z.number().min(1).max(100).optional().default(10)
    ),
    requiresPhoto: z.boolean().optional().default(false),
    sortOrder: z.preprocess(
      (val) => typeof val === 'string' ? parseInt(val) : val,
      z.number().int().min(0).optional().default(0)
    ),
  });

  // Helper: verify template exists and user has access (HQ roles and admin only for central template management)
  async function verifyTemplateAccess(templateId: number, user: any): Promise<boolean> {
    // Audit templates are centrally managed by HQ/admin - this is intentional
    if (!isHQRole(user.role) && user.role !== 'admin') return false;
    const [template] = await db.select({ id: auditTemplates.id })
      .from(auditTemplates)
      .where(eq(auditTemplates.id, templateId))
      .limit(1);
    return !!template;
  }

  // Helper: verify item belongs to template
  async function verifyItemOwnership(itemId: number, templateId: number): Promise<boolean> {
    const [item] = await db.select({ templateId: auditTemplateItems.templateId })
      .from(auditTemplateItems)
      .where(eq(auditTemplateItems.id, itemId))
      .limit(1);
    return item?.templateId === templateId;
  }

  // POST /api/audit-templates/:id/items - Add new item to template
  router.post('/api/audit-templates/:id/items', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Validate request body
      const validation = templateItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const data = validation.data;
      const [newItem] = await db.insert(auditTemplateItems).values({
        templateId,
        itemText: data.itemText,
        itemType: data.itemType,
        weight: typeof data.weight === 'number' ? data.weight : null,
        maxPoints: data.maxPoints,
        requiresPhoto: data.requiresPhoto,
        sortOrder: data.sortOrder,
      }).returning();

      res.status(201).json(newItem);
    } catch (error: unknown) {
      console.error("Add audit template item error:", error);
      res.status(500).json({ message: "Madde eklenemedi" });
    }
  });

  // PUT /api/audit-templates/:id/items/:itemId - Update item
  router.put('/api/audit-templates/:id/items/:itemId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Verify item belongs to this template
      const isOwned = await verifyItemOwnership(itemId, templateId);
      if (!isOwned) {
        return res.status(403).json({ message: "Bu madde bu şablona ait değil" });
      }

      // Validate request body
      const validation = templateItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const data = validation.data;
      const [updated] = await db.update(auditTemplateItems)
        .set({
          itemText: data.itemText,
          itemType: data.itemType,
          weight: typeof data.weight === 'number' ? data.weight : null,
          maxPoints: data.maxPoints,
          requiresPhoto: data.requiresPhoto,
          sortOrder: data.sortOrder,
        })
        .where(eq(auditTemplateItems.id, itemId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Madde bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update audit template item error:", error);
      res.status(500).json({ message: "Madde güncellenemedi" });
    }
  });

  // DELETE /api/audit-templates/:id/items/:itemId - Delete item
  router.delete('/api/audit-templates/:id/items/:itemId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Verify item belongs to this template
      const isOwned = await verifyItemOwnership(itemId, templateId);
      if (!isOwned) {
        return res.status(403).json({ message: "Bu madde bu şablona ait değil" });
      }

      await db.delete(auditTemplateItems).where(eq(auditTemplateItems.id, itemId));
      res.json({ message: "Madde silindi" });
    } catch (error: unknown) {
      console.error("Delete audit template item error:", error);
      res.status(500).json({ message: "Madde silinemedi" });
    }
  });

  // ============================================================
  // AUDIT INSTANCES - Denetim Kayıtları
  // ============================================================

  // GET /api/audits - List audits with filters
  router.get('/api/audits', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { branchId, status, dateFrom, dateTo, auditorId } = req.query;

      const conditions: any[] = [];

      // Branch filtering
      if (isBranchRole(user.role)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        conditions.push(eq(auditInstances.branchId, user.branchId));
      } else if (branchId) {
        conditions.push(eq(auditInstances.branchId, parseInt(branchId)));
      }

      if (status) {
        conditions.push(eq(auditInstances.status, status));
      }
      if (auditorId) {
        conditions.push(eq(auditInstances.auditorId, auditorId));
      }
      if (dateFrom) {
        conditions.push(sql`${auditInstances.auditDate} >= ${new Date(dateFrom)}`);
      }
      if (dateTo) {
        conditions.push(sql`${auditInstances.auditDate} <= ${new Date(dateTo)}`);
      }

      const audits = await db.select({
        id: auditInstances.id,
        templateId: auditInstances.templateId,
        auditType: auditInstances.auditType,
        branchId: auditInstances.branchId,
        userId: auditInstances.userId,
        auditorId: auditInstances.auditorId,
        auditDate: auditInstances.auditDate,
        status: auditInstances.status,
        totalScore: auditInstances.totalScore,
        maxScore: auditInstances.maxScore,
        notes: auditInstances.notes,
        actionItems: auditInstances.actionItems,
        followUpRequired: auditInstances.followUpRequired,
        followUpDate: auditInstances.followUpDate,
        completedAt: auditInstances.completedAt,
        createdAt: auditInstances.createdAt,
        updatedAt: auditInstances.updatedAt,
        branch: {
          id: branches.id,
          name: branches.name,
        },
        auditor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
        .from(auditInstances)
        .leftJoin(branches, eq(auditInstances.branchId, branches.id))
        .leftJoin(users, eq(auditInstances.auditorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditInstances.auditDate));

      res.json(audits);
    } catch (error: unknown) {
      console.error("Get audits error:", error);
      res.status(500).json({ message: "Denetimler alınamadı" });
    }
  });

  // GET /api/audits/:id - Get single audit with responses
  router.get('/api/audits/:id', isAuthenticated, async (req, res) => {
    try {
      const auditId = parseInt(req.params.id);
      const [audit] = await db.select().from(auditInstances).where(eq(auditInstances.id, auditId));
      
      if (!audit) {
        return res.status(404).json({ message: "Denetim bulunamadı" });
      }

      // Get template and items
      const [template] = await db.select().from(auditTemplates).where(eq(auditTemplates.id, audit.templateId));
      const templateItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, audit.templateId))
        .orderBy(auditTemplateItems.sectionOrder, auditTemplateItems.itemOrder);

      // Get responses
      const responses = await db.select().from(auditInstanceItems)
        .where(eq(auditInstanceItems.instanceId, auditId));

      // Get corrective actions
      const capas = await db.select().from(correctiveActions)
        .where(eq(correctiveActions.auditInstanceId, auditId));

      res.json({ 
        ...audit, 
        template,
        templateItems,
        responses,
        correctiveActions: capas 
      });
    } catch (error: unknown) {
      console.error("Get audit error:", error);
      res.status(500).json({ message: "Denetim alınamadı" });
    }
  });

  // POST /api/audits - Start new audit
  router.post('/api/audits', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Denetim başlatma yetkiniz yok" });
      }

      const { templateId, branchId, userId, auditType, notes, scheduledFor } = req.body;
      
      // Validate required fields
      if (!templateId) {
        return res.status(400).json({ message: "Şablon seçilmedi" });
      }
      
      // Determine audit type from target
      let resolvedAuditType = auditType;
      if (!resolvedAuditType) {
        resolvedAuditType = userId ? 'personnel' : 'branch';
      }
      
      const [audit] = await db.insert(auditInstances).values({
        templateId: parseInt(templateId),
        branchId: branchId ? parseInt(branchId) : null,
        userId: userId || null,
        auditType: resolvedAuditType,
        auditorId: user.id,
        status: 'in_progress',
        auditDate: new Date(),
        notes: notes || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      }).returning();

      res.status(201).json(audit);
    } catch (error: unknown) {
      console.error("Create audit error:", error);
      res.status(500).json({ message: "Denetim oluşturulamadı" });
    }
  });

  // POST /api/audits/:id/responses - Submit audit responses and calculate score
  router.post('/api/audits/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const auditId = parseInt(req.params.id);
      const { responses } = req.body;

      // Get audit
      const [audit] = await db.select().from(auditInstances).where(eq(auditInstances.id, auditId));
      if (!audit) {
        return res.status(404).json({ message: "Denetim bulunamadı" });
      }

      // Get template items for scoring
      const templateItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, audit.templateId));

      // Group items by section for scoring
      const sectionMap = new Map<string, any>();
      for (const item of templateItems) {
        if (!sectionMap.has(item.sectionName)) {
          sectionMap.set(item.sectionName, {
            sectionId: item.sectionOrder,
            sectionName: item.sectionName,
            weight: item.sectionWeight || 20,
            items: []
          });
        }
        const response = responses.find((r) => r.templateItemId === item.id);
        sectionMap.get(item.sectionName).items.push({
          itemId: item.id,
          itemCode: item.itemCode,
          question: item.questionTr,
          score: response?.score || 0,
          maxPoints: item.maxPoints,
          isCritical: item.isCritical,
          notes: response?.notes,
        });
      }

      // Calculate score
      const scoreResult = computeAuditScore(Array.from(sectionMap.values()));

      // Save responses
      for (const response of responses) {
        await db.insert(auditInstanceItems).values({
          instanceId: auditId,
          templateItemId: response.templateItemId,
          score: response.score,
          notes: response.notes,
          photoUrls: response.photoUrls || [],
          scoredById: user.id,
        }).onConflictDoUpdate({
          target: [auditInstanceItems.instanceId, auditInstanceItems.templateItemId],
          set: {
            score: response.score,
            notes: response.notes,
            photoUrls: response.photoUrls || [],
            scoredById: user.id,
            updatedAt: new Date(),
          }
        });
      }

      // Update audit with score
      await db.update(auditInstances).set({
        totalScore: scoreResult.totalScore,
        grade: scoreResult.grade,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(auditInstances.id, auditId));

      // Create CAPA items automatically
      for (const capaItem of scoreResult.capaItems) {
        const slaDeadline = calculateSLADeadline(new Date(), capaItem.slaHours);
        await db.insert(correctiveActions).values({
          auditInstanceId: auditId,
          auditItemId: capaItem.itemId,
          title: `${capaItem.itemCode}: ${capaItem.question}`,
          description: `Denetimde düşük puan alındı (${capaItem.score} puan). Düzeltici aksiyon gerekli.`,
          priority: capaItem.priority,
          status: 'open',
          dueDate: slaDeadline,
          createdById: user.id,
        });
      }

      res.json({
        auditId,
        score: scoreResult,
        capaCount: scoreResult.capaItems.length,
      });
    } catch (error: unknown) {
      console.error("Submit audit responses error:", error);
      res.status(500).json({ message: "Yanıtlar kaydedilemedi" });
    }
  });

  // PUT /api/audits/:id - Update audit status
  router.put('/api/audits/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const auditId = parseInt(req.params.id);
      const { status, notes } = req.body;

      const [updated] = await db.update(auditInstances).set({
        status,
        notes,
        updatedAt: new Date(),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      }).where(eq(auditInstances.id, auditId)).returning();

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update audit error:", error);
      res.status(500).json({ message: "Denetim güncellenemedi" });
    }
  });

  // ============================================================
  // CORRECTIVE ACTIONS (CAPA) - Düzeltici Aksiyonlar
  // ============================================================

  // GET /api/corrective-actions - List CAPAs with filters
  router.get('/api/corrective-actions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { status, priority, branchId, assignedToId } = req.query;

      let conditions: any[] = [];

      // Branch filtering for branch users
      if (isBranchRole(user.role)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        // Get audits for this branch, then filter CAPAs
        const branchAudits = await db.select({ id: auditInstances.id })
          .from(auditInstances)
          .where(eq(auditInstances.branchId, user.branchId));
        const auditIds = branchAudits.map(a => a.id);
        if (auditIds.length > 0) {
          conditions.push(inArray(correctiveActions.auditInstanceId, auditIds));
        } else {
          return res.json([]);
        }
      }

      if (status) {
        conditions.push(eq(correctiveActions.status, status));
      }
      if (priority) {
        conditions.push(eq(correctiveActions.priority, priority));
      }
      if (assignedToId) {
        conditions.push(eq(correctiveActions.assignedToId, assignedToId));
      }

      const capas = conditions.length > 0
        ? await db.select().from(correctiveActions).where(and(...conditions)).orderBy(desc(correctiveActions.createdAt))
        : await db.select().from(correctiveActions).orderBy(desc(correctiveActions.createdAt));

      const auditInstanceIds = [...new Set(capas.map(c => c.auditInstanceId).filter(Boolean))];
      const auditInstanceMap = new Map<number, { branchId: number | null }>();
      const branchMap = new Map<number, { id: number; name: string }>();

      if (auditInstanceIds.length > 0) {
        const auditRows = await db.select({
          id: auditInstances.id,
          branchId: auditInstances.branchId,
        }).from(auditInstances).where(inArray(auditInstances.id, auditInstanceIds));

        for (const row of auditRows) {
          auditInstanceMap.set(row.id, { branchId: row.branchId });
        }

        const branchIds = [...new Set(auditRows.map(r => r.branchId).filter((id): id is number => id !== null))];
        if (branchIds.length > 0) {
          const branchRows = await db.select({
            id: branches.id,
            name: branches.name,
          }).from(branches).where(inArray(branches.id, branchIds));

          for (const row of branchRows) {
            branchMap.set(row.id, { id: row.id, name: row.name });
          }
        }
      }

      const capasWithSLA = capas.map(capa => {
        const auditInfo = auditInstanceMap.get(capa.auditInstanceId);
        const branchId = auditInfo?.branchId ?? null;
        const branch = branchId ? branchMap.get(branchId) ?? null : null;
        return {
          ...capa,
          branchId: branchId,
          branch: branch,
          slaStatus: capa.dueDate ? getSLAStatus(new Date(capa.dueDate), capa.completedAt ? new Date(capa.completedAt) : undefined) : 'on_track',
        };
      });

      res.json(capasWithSLA);
    } catch (error: unknown) {
      console.error("Get corrective actions error:", error);
      res.status(500).json({ message: "Aksiyonlar alınamadı" });
    }
  });

  // GET /api/corrective-actions/:id - Get single CAPA with updates and relations
  router.get('/api/corrective-actions/:id', isAuthenticated, async (req, res) => {
    try {
      const capaId = parseInt(req.params.id);
      const [capa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      
      if (!capa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // Fetch related entities
      const [assignedTo] = capa.assignedToId 
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, capa.assignedToId))
        : [null];
      
      const [createdBy] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, capa.createdById));

      // Fetch audit instance with branch and template
      const [auditInstance] = capa.auditInstanceId
        ? await db.select({
            id: auditInstances.id,
            auditDate: auditInstances.auditDate,
            branchId: auditInstances.branchId,
          }).from(auditInstances).where(eq(auditInstances.id, capa.auditInstanceId))
        : [null];

      let auditInstanceData = null;
      if (auditInstance) {
        const [template] = await db.select({ id: auditTemplates.id, title: auditTemplates.title })
          .from(auditTemplates).where(eq(auditTemplates.id, (await db.select({ templateId: auditInstances.templateId }).from(auditInstances).where(eq(auditInstances.id, capa.auditInstanceId)))[0]?.templateId || 0));
        const [branch] = auditInstance.branchId
          ? await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.id, auditInstance.branchId))
          : [null];
        auditInstanceData = { ...auditInstance, template, branch };
      }

      // Fetch audit item
      const [auditItem] = capa.auditItemId
        ? await db.select({ id: auditTemplateItems.id, itemText: auditTemplateItems.itemText })
            .from(auditTemplateItems).where(eq(auditTemplateItems.id, capa.auditItemId))
        : [null];

      // Fetch updates with user info
      const updates = await db.select().from(correctiveActionUpdates)
        .where(eq(correctiveActionUpdates.correctiveActionId, capaId))
        .orderBy(desc(correctiveActionUpdates.createdAt));

      const updateUserIds = [...new Set(updates.map(u => u.updatedById))];
      const updateUsers = updateUserIds.length > 0
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(inArray(users.id, updateUserIds))
        : [];
      const updateUserMap = new Map(updateUsers.map(u => [u.id, u]));
      const updatesWithUsers = updates.map(update => ({
        ...update,
        updatedBy: updateUserMap.get(update.updatedById) || undefined,
      }));

      res.json({
        ...capa,
        slaStatus: capa.dueDate ? getSLAStatus(new Date(capa.dueDate)) : 'on_track',
        assignedTo,
        createdBy,
        auditInstance: auditInstanceData,
        auditItem,
        updates: updatesWithUsers,
      });
    } catch (error: unknown) {
      console.error("Get corrective action error:", error);
      res.status(500).json({ message: "Aksiyon alınamadı" });
    }
  });

  // POST /api/corrective-actions - Create manual CAPA
  router.post('/api/corrective-actions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const data = insertCorrectiveActionSchema.parse(req.body);

      const { priority, slaHours } = getCAPAPriority(0, false);
      const dueDate = data.dueDate || calculateSLADeadline(new Date(), slaHours);

      const [capa] = await db.insert(correctiveActions).values({
        ...data,
        priority: data.priority || priority,
        dueDate,
        createdById: user.id,
      }).returning();

      res.status(201).json(capa);
    } catch (error: unknown) {
      console.error("Create corrective action error:", error);
      res.status(500).json({ message: "Aksiyon oluşturulamadı" });
    }
  });

  // PUT /api/corrective-actions/:id - Update CAPA status
  router.put('/api/corrective-actions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const capaId = parseInt(req.params.id);
      const { status, assignedToId, notes, resolution, photoUrls } = req.body;

      // Get current CAPA
      const [currentCapa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      if (!currentCapa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // Validate status transition
      if (status && !isValidCAPATransition(currentCapa.status, status)) {
        return res.status(400).json({ message: `${currentCapa.status} durumundan ${status} durumuna geçiş yapılamaz` });
      }

      // HQ approval required for closing (case-insensitive check)
      if (status && status.toUpperCase() === 'CLOSED' && !isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CAPA kapatma yetkisi sadece HQ kullanıcılarında" });
      }

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (assignedToId) updateData.assignedToId = assignedToId;
      if (notes) updateData.notes = notes;
      if (resolution) updateData.resolution = resolution;
      if (photoUrls) updateData.photoUrls = photoUrls;
      if (status === 'completed' || status === 'closed') {
        updateData.completedAt = new Date();
      }

      const [updated] = await db.update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, capaId))
        .returning();

      // Log status change
      if (status && status !== currentCapa.status) {
        await db.insert(correctiveActionUpdates).values({
          correctiveActionId: capaId,
          status,
          notes: notes || `Durum değişikliği: ${currentCapa.status} → ${status}`,
          updatedById: user.id,
        });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update corrective action error:", error);
      res.status(500).json({ message: "Aksiyon güncellenemedi" });
    }
  });

  // POST /api/corrective-actions/:id/updates - Add CAPA update with status change
  router.post('/api/corrective-actions/:id/updates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const capaId = parseInt(req.params.id);
      const { newStatus, notes, evidence } = req.body;

      // Get current CAPA to record old status
      const [currentCapa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      if (!currentCapa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // HQ approval required for closing (case-insensitive check)
      if (newStatus && newStatus.toUpperCase() === 'CLOSED' && !isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CAPA kapatma yetkisi sadece HQ kullanıcılarında" });
      }

      // Validate status transition if status is changing
      if (newStatus && newStatus !== 'update' && !isValidCAPATransition(currentCapa.status, newStatus)) {
        return res.status(400).json({ message: `${currentCapa.status} durumundan ${newStatus} durumuna geçiş yapılamaz` });
      }

      const [update] = await db.insert(correctiveActionUpdates).values({
        correctiveActionId: capaId,
        oldStatus: currentCapa.status,
        newStatus: newStatus || 'update',
        notes,
        evidence: evidence || null,
        updatedById: user.id,
      }).returning();

      // Update the main CAPA status atomically
      if (newStatus && newStatus !== 'update' && newStatus !== currentCapa.status) {
        const updateData: any = { 
          status: newStatus, 
          updatedAt: new Date() 
        };
        if (newStatus.toUpperCase() === 'CLOSED') {
          updateData.closedDate = new Date();
        }
        await db.update(correctiveActions)
          .set(updateData)
          .where(eq(correctiveActions.id, capaId));
      }

      res.status(201).json(update);
    } catch (error: unknown) {
      console.error("Add CAPA update error:", error);
      res.status(500).json({ message: "Güncelleme eklenemedi" });
    }
  });


  // GET /api/corrective-actions/reports/branch-performance - Branch CAPA performance report
  router.get('/api/corrective-actions/reports/branch-performance', isAuthenticated, async (req, res) => {
    try {
      // Get all CAPAs with audit/branch info
      const capas = await db.select({
        id: correctiveActions.id,
        priority: correctiveActions.priority,
        status: correctiveActions.status,
        dueDate: correctiveActions.dueDate,
        closedDate: correctiveActions.closedDate,
        createdAt: correctiveActions.createdAt,
        auditInstanceId: correctiveActions.auditInstanceId,
      }).from(correctiveActions);

      // Get audit instances with branch info
      const audits = await db.select({
        id: auditInstances.id,
        branchId: auditInstances.branchId,
      }).from(auditInstances);

      const auditBranchMap = new Map(audits.map(a => [a.id, a.branchId]));

      // Get all branches
      const allBranches = await db.select({
        id: branches.id,
        name: branches.name,
      }).from(branches);

      // Build branch performance map
      const branchStats: Record<number, {
        branchId: number;
        branchName: string;
        total: number;
        open: number;
        inProgress: number;
        overdue: number;
        closed: number;
        avgResolutionDays: number;
        onTimeRate: number;
        critical: number;
        high: number;
        medium: number;
      }> = {};

      // Initialize all branches
      for (const branch of allBranches) {
        branchStats[branch.id] = {
          branchId: branch.id,
          branchName: branch.name,
          total: 0,
          open: 0,
          inProgress: 0,
          overdue: 0,
          closed: 0,
          avgResolutionDays: 0,
          onTimeRate: 0,
          critical: 0,
          high: 0,
          medium: 0,
        };
      }

      // Process CAPAs
      const resolutionDays: Record<number, number[]> = {};
      const onTimeCount: Record<number, { onTime: number; total: number }> = {};

      for (const capa of capas) {
        const branchId = auditBranchMap.get(capa.auditInstanceId);
        if (!branchId || !branchStats[branchId]) continue;

        branchStats[branchId].total++;

        // Count by status
        if (capa.status === 'OPEN') branchStats[branchId].open++;
        else if (capa.status === 'IN_PROGRESS') branchStats[branchId].inProgress++;
        else if (capa.status === 'OVERDUE') branchStats[branchId].overdue++;
        else if (capa.status === 'CLOSED') branchStats[branchId].closed++;

        // Count by priority
        if (capa.priority === 'critical') branchStats[branchId].critical++;
        else if (capa.priority === 'high') branchStats[branchId].high++;
        else branchStats[branchId].medium++;

        // Calculate resolution days for closed CAPAs
        if (capa.status === 'CLOSED' && capa.closedDate && capa.createdAt) {
          const days = Math.ceil((new Date(capa.closedDate).getTime() - new Date(capa.createdAt).getTime()) / (24 * 60 * 60 * 1000));
          if (!resolutionDays[branchId]) resolutionDays[branchId] = [];
          resolutionDays[branchId].push(days);

          // Check if on time
          if (!onTimeCount[branchId]) onTimeCount[branchId] = { onTime: 0, total: 0 };
          onTimeCount[branchId].total++;
          if (capa.closedDate <= capa.dueDate) {
            onTimeCount[branchId].onTime++;
          }
        }
      }

      // Calculate averages
      for (const branchId of Object.keys(branchStats).map(Number)) {
        if (resolutionDays[branchId]?.length) {
          branchStats[branchId].avgResolutionDays = Math.round(
            resolutionDays[branchId].reduce((a, b) => a + b, 0) / resolutionDays[branchId].length
          );
        }
        if (onTimeCount[branchId]?.total) {
          branchStats[branchId].onTimeRate = Math.round(
            (onTimeCount[branchId].onTime / onTimeCount[branchId].total) * 100
          );
        }
      }

      // Filter out branches with no CAPAs and sort by total desc
      const report = Object.values(branchStats)
        .filter(b => b.total > 0)
        .sort((a, b) => b.total - a.total);

      // Calculate totals
      const totals = {
        total: capas.length,
        open: capas.filter(c => c.status === 'OPEN').length,
        inProgress: capas.filter(c => c.status === 'IN_PROGRESS').length,
        overdue: capas.filter(c => c.status === 'OVERDUE').length,
        closed: capas.filter(c => c.status === 'CLOSED').length,
        critical: capas.filter(c => c.priority === 'critical').length,
        high: capas.filter(c => c.priority === 'high').length,
        medium: capas.filter(c => c.priority === 'medium').length,
      };

      res.json({ branches: report, totals });
    } catch (error: unknown) {
      console.error("CAPA branch report error:", error);
      res.status(500).json({ message: "Rapor oluşturulamadı" });
    }
  });
  // ============================================================
  // AUDIT ANALYTICS - Denetim Analitikleri
  // ============================================================

  // GET /api/audits/analytics/dashboard - Dashboard statistics
  router.get('/api/audits/analytics/dashboard', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { branchId, dateFrom, dateTo } = req.query;

      let branchFilter = branchId ? parseInt(branchId) : undefined;
      if (isBranchRole(user.role)) {
        branchFilter = user.branchId;
      }

      // Get audit counts by status
      const statusCounts = await db.select({
        status: auditInstances.status,
        count: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`)
        .groupBy(auditInstances.status);

      // Get average scores
      const scoreStats = await db.select({
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        minScore: sql<number>`min(${auditInstances.totalScore})`,
        maxScore: sql<number>`max(${auditInstances.totalScore})`,
        totalAudits: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(and(
          branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`,
          eq(auditInstances.status, 'completed')
        ));

      // Get CAPA counts by status
      const capaCounts = await db.select({
        status: correctiveActions.status,
        count: sql<number>`count(*)::int`,
      }).from(correctiveActions).groupBy(correctiveActions.status);

      // Get CAPA counts by priority
      const capaPriorityCounts = await db.select({
        priority: correctiveActions.priority,
        count: sql<number>`count(*)::int`,
      }).from(correctiveActions)
        .where(sql`${correctiveActions.status} NOT IN ('closed', 'cancelled')`)
        .groupBy(correctiveActions.priority);

      // Get recent audits
      const recentAudits = await db.select().from(auditInstances)
        .where(branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`)
        .orderBy(desc(auditInstances.auditDate))
        .limit(5);

      // Get overdue CAPAs
      const overdueCAPAs = await db.select().from(correctiveActions)
        .where(and(
          sql`${correctiveActions.dueDate} < NOW()`,
          sql`${correctiveActions.status} NOT IN ('closed', 'completed', 'cancelled')`
        ))
        .orderBy(correctiveActions.dueDate)
        .limit(10);

      res.json({
        statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
        scoreStats: scoreStats[0] || { avgScore: 0, minScore: 0, maxScore: 0, totalAudits: 0 },
        capaCounts: Object.fromEntries(capaCounts.map(c => [c.status, c.count])),
        capaPriorityCounts: Object.fromEntries(capaPriorityCounts.map(c => [c.priority, c.count])),
        recentAudits,
        overdueCAPAs,
      });
    } catch (error: unknown) {
      console.error("Get audit analytics error:", error);
      res.status(500).json({ message: "Analitik verileri alınamadı" });
    }
  });

  // GET /api/audits/analytics/trends - Score trends over time
  router.get('/api/audits/analytics/trends', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { branchId, months } = req.query;
      const monthCount = parseInt(months as string) || 6;

      let branchFilter = branchId ? parseInt(branchId) : undefined;
      if (isBranchRole(user.role)) {
        branchFilter = user.branchId;
      }

      // Get monthly average scores
      const trends = await db.select({
        month: sql<string>`to_char(${auditInstances.auditDate}, 'YYYY-MM')`,
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        auditCount: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(and(
          branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`,
          eq(auditInstances.status, 'completed'),
          sql`${auditInstances.auditDate} >= NOW() - make_interval(months => ${monthCount})`
        ))
        .groupBy(sql`to_char(${auditInstances.auditDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${auditInstances.auditDate}, 'YYYY-MM')`);

      res.json(trends);
    } catch (error: unknown) {
      console.error("Get audit trends error:", error);
      res.status(500).json({ message: "Trend verileri alınamadı" });
    }
  });

  // GET /api/audits/analytics/branch-comparison - Compare branches
  router.get('/api/audits/analytics/branch-comparison', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şube karşılaştırma yetkiniz yok" });
      }

      const comparison = await db.select({
        branchId: auditInstances.branchId,
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        auditCount: sql<number>`count(*)::int`,
        passRate: sql<number>`(count(*) FILTER (WHERE ${auditInstances.totalScore} >= 70) * 100.0 / NULLIF(count(*), 0))::numeric(5,2)`,
      }).from(auditInstances)
        .where(eq(auditInstances.status, 'completed'))
        .groupBy(auditInstances.branchId)
        .orderBy(sql`avg(${auditInstances.totalScore}) DESC`);

      // Get branch names
      const branchIds = comparison.map(c => c.branchId).filter(Boolean) as number[];
      const branchList = branchIds.length > 0 
        ? await db.select({ id: branches.id, name: branches.name }).from(branches).where(inArray(branches.id, branchIds))
        : [];
      const branchMap = new Map(branchList.map(b => [b.id, b.name]));

      const result = comparison.map(c => ({
        ...c,
        branchName: branchMap.get(c.branchId!) || 'Bilinmeyen Şube',
      }));

      res.json(result);
    } catch (error: unknown) {
      console.error("Get branch comparison error:", error);
      res.status(500).json({ message: "Şube karşılaştırması alınamadı" });
    }
  });
  // ========================================
  // TOPLU VERİ YÖNETİMİ - Bulk Data Management API'leri
  // ========================================

  // Download Excel template for equipment
  router.get('/api/bulk/template/equipment', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Ekipman Adı*', 'Model', 'Seri No', 'Şube ID*', 'Kategori*', 
        'Durum', 'Garanti Bitiş Tarihi', 'Son Bakım Tarihi', 'Açıklama'
      ];
      
      const sampleData = [
        ['Espresso Makinesi', 'La Marzocco Linea', 'LM-2024-001', '1', 'espresso_machine', 'active', '2025-12-31', '2024-06-15', 'Ana bar espresso makinesi'],
        ['Kahve Değirmeni', 'Mahlkönig E65S', 'MK-2024-002', '1', 'grinder', 'active', '2025-06-30', '2024-06-01', 'Filtre kahve değirmeni']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ekipmanlar');
      
      // Add category reference sheet
      const categories = [
        ['Kategori Kodu', 'Açıklama'],
        ['espresso_machine', 'Espresso Makinesi'],
        ['grinder', 'Kahve Değirmeni'],
        ['refrigerator', 'Buzdolabı'],
        ['freezer', 'Dondurucu'],
        ['oven', 'Fırın'],
        ['dishwasher', 'Bulaşık Makinesi'],
        ['water_filter', 'Su Filtresi'],
        ['ice_machine', 'Buz Makinesi'],
        ['blender', 'Blender'],
        ['pos', 'POS Cihazı'],
        ['other', 'Diğer']
      ];
      const wsCategories = XLSX.utils.aoa_to_sheet(categories);
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Kategoriler');

      // Add branch reference
      const branchesData = await storage.getAllBranches();
      const branchSheet = [['Şube ID', 'Şube Adı'], ...branchesData.map(b => [b.id, b.name])];
      const wsBranches = XLSX.utils.aoa_to_sheet(branchSheet);
      XLSX.utils.book_append_sheet(wb, wsBranches, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=ekipman_sablonu.xlsx');
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Download equipment template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Download Excel template for personnel
  router.get('/api/bulk/template/personnel', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Ad*', 'Soyad*', 'Email*', 'Telefon', 'Rol*', 'Şube ID', 
        'İşe Başlama Tarihi', 'Tam Zamanlı mı (E/H)', 'Çalışma Saati/Hafta'
      ];
      
      const sampleData = [
        ['Ahmet', 'Yılmaz', 'ahmet@dospresso.com', '5321234567', 'barista', '1', '2024-01-15', 'E', '45'],
        ['Ayşe', 'Demir', 'ayse@dospresso.com', '5339876543', 'supervisor', '1', '2023-06-01', 'E', '45']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel');
      
      // Add role reference sheet
      const roles = [
        ['Rol Kodu', 'Açıklama'],
        ['admin', 'Admin'],
        ['muhasebe', 'Muhasebe'],
        ['satinalma', 'Satın Alma'],
        ['coach', 'Coach'],
        ['teknik', 'Teknik'],
        ['destek', 'Destek'],
        ['fabrika', 'Fabrika'],
        ['yatirimci_hq', 'Yatırımcı (HQ)'],
        ['stajyer', 'Stajyer'],
        ['bar_buddy', 'Bar Buddy'],
        ['barista', 'Barista'],
        ['supervisor_buddy', 'Supervisor Buddy'],
        ['supervisor', 'Supervisor'],
        ['yatirimci_branch', 'Yatırımcı (Şube)']
      ];
      const wsRoles = XLSX.utils.aoa_to_sheet(roles);
      XLSX.utils.book_append_sheet(wb, wsRoles, 'Roller');

      // Add branch reference
      const branchesData = await storage.getAllBranches();
      const branchSheet = [['Şube ID', 'Şube Adı'], ...branchesData.map(b => [b.id, b.name])];
      const wsBranches = XLSX.utils.aoa_to_sheet(branchSheet);
      XLSX.utils.book_append_sheet(wb, wsBranches, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=personel_sablonu.xlsx');
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Download personnel template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Download Excel template for branches
  router.get('/api/bulk/template/branches', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Şube Adı*', 'Adres*', 'Şehir*', 'Telefon', 'Email', 
        'Aktif mi (E/H)', 'Açılış Tarihi', 'Enlem', 'Boylam'
      ];
      
      const sampleData = [
        ['Kadıköy Şubesi', 'Bahariye Cad. No:45', 'İstanbul', '02161234567', 'kadikoy@dospresso.com', 'E', '2024-01-01', '40.9833', '29.0333'],
        ['Beşiktaş Şubesi', 'Barbaros Bulvarı No:78', 'İstanbul', '02127654321', 'besiktas@dospresso.com', 'E', '2024-03-15', '41.0422', '29.0083']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 22 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sube_sablonu.xlsx');
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Download branch template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Export equipment data
  router.get('/api/bulk/export/equipment', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const equipmentList = await storage.getAllEquipment();
      const branchesData = await storage.getAllBranches();
      const branchMap = new Map(branchesData.map(b => [b.id, b.name]));

      const headers = ['ID', 'Ekipman Adı', 'Model', 'Seri No', 'Şube ID', 'Şube Adı', 'Kategori', 'Durum', 'Garanti Bitiş', 'Son Bakım', 'Açıklama'];
      
      const data = equipmentList.map(eq => [
        eq.id,
        eq.name,
        eq.model || '',
        eq.serialNumber || '',
        eq.branchId,
        branchMap.get(eq.branchId) || '',
        eq.category,
        eq.status,
        eq.warrantyEndDate || '',
        eq.lastMaintenanceDate || '',
        eq.description || ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ekipmanlar');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ekipman_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Export equipment error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Export personnel data
  router.get('/api/bulk/export/personnel', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const usersData = await storage.getAllUsers();
      const branchesData = await storage.getAllBranches();
      const branchMap = new Map(branchesData.map(b => [b.id, b.name]));

      const headers = ['ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Rol', 'Şube ID', 'Şube Adı', 'İşe Başlama', 'Tam Zamanlı', 'Aktif'];
      
      const data = usersData.map(u => [
        u.id,
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.phone || '',
        u.role,
        u.branchId || '',
        u.branchId ? (branchMap.get(u.branchId) || '') : '',
        u.hireDate || '',
        u.isFullTime ? 'Evet' : 'Hayır',
        u.isActive ? 'Evet' : 'Hayır'
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=personel_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Export personnel error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Export branch data
  router.get('/api/bulk/export/branches', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const branchesData = await storage.getAllBranches();

      const headers = ['ID', 'Şube Adı', 'Adres', 'Şehir', 'Telefon', 'Email', 'Aktif', 'Açılış Tarihi', 'Enlem', 'Boylam'];
      
      const data = branchesData.map(b => [
        b.id,
        b.name,
        b.address || '',
        b.city || '',
        b.phone || '',
        b.email || '',
        b.isActive ? 'Evet' : 'Hayır',
        b.openingDate || '',
        b.latitude || '',
        b.longitude || ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sube_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: unknown) {
      console.error("Export branches error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Import equipment data
  router.post('/api/bulk/import/equipment', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = row['Ekipman Adı*'] || row['Ekipman Adı'];
          const branchIdRaw = row['Şube ID*'] || row['Şube ID'];
          const branchId = parseInt(branchIdRaw);

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim() === '') {
            results.errors.push(`Satır ${i + 2}: Ekipman adı zorunludur`);
            results.failed++;
            continue;
          }

          if (!branchIdRaw || isNaN(branchId)) {
            results.errors.push(`Satır ${i + 2}: Geçerli bir şube ID gerekli (sayı olmalı)`);
            results.failed++;
            continue;
          }

          const validCategories = ['espresso_machine', 'grinder', 'refrigerator', 'freezer', 'oven', 'dishwasher', 'water_filter', 'ice_machine', 'blender', 'pos', 'other'];
          const category = row['Kategori*'] || row['Kategori'] || 'other';
          if (!validCategories.includes(category)) {
            results.errors.push(`Satır ${i + 2}: Geçersiz kategori: ${category}`);
            results.failed++;
            continue;
          }

          const equipmentData = {
            name: name.trim(),
            model: row['Model'] || null,
            serialNumber: row['Seri No'] || null,
            branchId,
            category,
            status: row['Durum'] || 'active',
            warrantyEndDate: row['Garanti Bitiş Tarihi'] || null,
            lastMaintenanceDate: row['Son Bakım Tarihi'] || null,
            description: row['Açıklama'] || null
          };

          await storage.createEquipment(equipmentData);
          results.success++;
        } catch (err) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: unknown) {
      console.error("Import equipment error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Import personnel data
  router.post('/api/bulk/import/personnel', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      const validRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq', 'stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'yatirimci_branch'];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const firstName = (row['Ad*'] || row['Ad'] || '').toString().trim();
          const lastName = (row['Soyad*'] || row['Soyad'] || '').toString().trim();
          const email = (row['Email*'] || row['Email'] || '').toString().trim().toLocaleLowerCase('tr-TR');
          const role = (row['Rol*'] || row['Rol'] || '').toString().trim().toLocaleLowerCase('tr-TR');
          
          if (!firstName || !lastName) {
            results.errors.push(`Satır ${i + 2}: Ad ve soyad zorunludur`);
            results.failed++;
            continue;
          }

          if (!email || !email.includes('@')) {
            results.errors.push(`Satır ${i + 2}: Geçerli bir email adresi gerekli`);
            results.failed++;
            continue;
          }

          if (!role || !validRoles.includes(role)) {
            results.errors.push(`Satır ${i + 2}: Geçersiz rol: ${role}. Geçerli roller: ${validRoles.join(', ')}`);
            results.failed++;
            continue;
          }

          // Check if user already exists
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            results.errors.push(`Satır ${i + 2}: Bu email zaten kayıtlı: ${email}`);
            results.failed++;
            continue;
          }

          // Validate branchId if provided
          const branchIdRaw = row['Şube ID'];
          let branchId: number | null = null;
          if (branchIdRaw && branchIdRaw !== '') {
            branchId = parseInt(branchIdRaw);
            if (isNaN(branchId)) {
              results.errors.push(`Satır ${i + 2}: Geçersiz şube ID: ${branchIdRaw}`);
              results.failed++;
              continue;
            }
          }

          const isFullTime = (row['Tam Zamanlı mı (E/H)'] || 'E').toString().toUpperCase() === 'E';
          const weeklyHoursRaw = row['Çalışma Saati/Hafta'];
          let weeklyHours = isFullTime ? 45 : 25;
          if (weeklyHoursRaw && weeklyHoursRaw !== '') {
            const parsed = parseInt(weeklyHoursRaw);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 60) {
              weeklyHours = parsed;
            }
          }
          
          const userData = {
            firstName,
            lastName,
            email,
            phone: row['Telefon'] || null,
            role,
            branchId,
            hireDate: row['İşe Başlama Tarihi'] || null,
            isFullTime,
            weeklyHours,
            isActive: true,
            password: 'Dospresso2024!' // Default password
          };

          await storage.createUser(userData);
          results.success++;
        } catch (err) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: unknown) {
      console.error("Import personnel error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Import branch data
  router.post('/api/bulk/import/branches', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = (row['Şube Adı*'] || row['Şube Adı'] || '').toString().trim();
          const address = (row['Adres*'] || row['Adres'] || '').toString().trim();
          const city = (row['Şehir*'] || row['Şehir'] || '').toString().trim();
          
          if (!name) {
            results.errors.push(`Satır ${i + 2}: Şube adı zorunludur`);
            results.failed++;
            continue;
          }

          if (!address) {
            results.errors.push(`Satır ${i + 2}: Adres zorunludur`);
            results.failed++;
            continue;
          }

          if (!city) {
            results.errors.push(`Satır ${i + 2}: Şehir zorunludur`);
            results.failed++;
            continue;
          }

          const isActive = (row['Aktif mi (E/H)'] || 'E').toString().toUpperCase() === 'E';
          
          // Validate coordinates if provided
          const latRaw = row['Enlem'];
          const lonRaw = row['Boylam'];
          let latitude: string | null = null;
          let longitude: string | null = null;
          
          if (latRaw && latRaw !== '') {
            const lat = parseFloat(latRaw);
            if (isNaN(lat) || lat < -90 || lat > 90) {
              results.errors.push(`Satır ${i + 2}: Geçersiz enlem değeri: ${latRaw}`);
              results.failed++;
              continue;
            }
            latitude = lat.toString();
          }
          
          if (lonRaw && lonRaw !== '') {
            const lon = parseFloat(lonRaw);
            if (isNaN(lon) || lon < -180 || lon > 180) {
              results.errors.push(`Satır ${i + 2}: Geçersiz boylam değeri: ${lonRaw}`);
              results.failed++;
              continue;
            }
            longitude = lon.toString();
          }
          
          const branchData = {
            name,
            address,
            city,
            phone: row['Telefon'] || null,
            email: row['Email'] || null,
            isActive,
            openingDate: row['Açılış Tarihi'] || null,
            latitude,
            longitude
          };

          await storage.createBranch(branchData);
          results.success++;
        } catch (err) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: unknown) {
      console.error("Import branches error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Parse uploaded Excel file
  router.post('/api/bulk/parse', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { fileData, fileName } = req.body;
      if (!fileData) {
        return res.status(400).json({ message: "Dosya verisi bulunamadı" });
      }

      // Parse base64 data
      const base64Data = fileData.split(',')[1] || fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      res.json({ 
        data, 
        headers: data.length > 0 ? Object.keys(data[0] as object) : [],
        rowCount: data.length
      });
    } catch (error: unknown) {
      handleApiError(res, error, "ParseExcelFile");
    }
  });
  // ========================================
  // CUSTOMER SATISFACTION (Misafir Geri Bildirim) API
  // ========================================

  // Get branch by feedback QR token (public - no auth required)
  router.get('/api/feedback/branch/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const branch = await db.select({
        id: branches.id,
        name: branches.name,
        city: branches.city,
      }).from(branches).where(eq(branches.feedbackQrToken, token)).limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      const branchId = branch[0].id;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 8);

      let staff: { id: string; firstName: string; lastName: string }[] = [];
      let shiftFiltered = false;

      try {
        const activeShiftStaff = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(shifts)
          .innerJoin(users, eq(shifts.assignedToId, users.id))
          .where(and(
            eq(shifts.branchId, branchId),
            eq(shifts.shiftDate, today),
            sql`${shifts.status} IN ('confirmed', 'completed')`,
            lte(shifts.startTime, currentTime),
            gte(shifts.endTime, currentTime),
            eq(users.isActive, true),
            sql`${users.role} IN ('barista', 'bar_buddy', 'supervisor', 'supervisor_buddy')`
          ));

        if (activeShiftStaff.length > 0) {
          staff = activeShiftStaff;
          shiftFiltered = true;
        }
      } catch (shiftErr) {
        console.error("Shift query error, falling back to all staff:", shiftErr);
      }

      if (!shiftFiltered) {
        staff = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users)
          .where(and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            sql`${users.role} IN ('barista', 'bar_buddy', 'supervisor', 'supervisor_buddy')`
          ));
      }

      res.json({ branch: branch[0], staff });
    } catch (error: unknown) {
      console.error("Error fetching branch by token:", error);
      res.status(500).json({ message: "Sunucu hatası" });
    }
  });

  // Submit customer feedback (public - no auth required)
  router.post('/api/feedback/submit', async (req, res) => {
    try {
      const { 
        branchToken, 
        rating, 
        serviceRating, 
        cleanlinessRating, 
        productRating, 
        staffRating,
        staffId,
        comment,
        customerName,
        customerEmail,
        customerPhone,
        isAnonymous = true,
        photoUrls = [],
        deviceFingerprint,
        userLatitude,
        userLongitude,
        language = 'tr',
        feedbackType = 'feedback', // feedback or complaint
        requiresContact = false
      } = req.body;

      // Get user IP
      const userIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 'unknown';

      // Validate token and get branch
      const branch = await db.select().from(branches)
        .where(eq(branches.feedbackQrToken, branchToken)).limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Geçersiz QR kod" });
      }

      // Calculate distance from branch if coordinates available
      let distanceFromBranch: number | null = null;
      if (userLatitude && userLongitude && branch[0].latitude && branch[0].longitude) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (branch[0].latitude - userLatitude) * Math.PI / 180;
        const dLon = (branch[0].longitude - userLongitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLatitude * Math.PI / 180) * Math.cos(branch[0].latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromBranch = R * c;
      }

      // Fetch global form settings to check location requirement
      const branchFormSettings = await db.select()
        .from(feedbackFormSettings)
        .where(isNull(feedbackFormSettings.branchId))
        .limit(1);
      const locationRequired = branchFormSettings.length > 0 ? branchFormSettings[0].requireLocationVerification : false;
      const maxDistance = branchFormSettings.length > 0 ? (branchFormSettings[0].maxDistanceFromBranch || 500) : 500;

      // === HARD REJECT CHECKS ===

      // Hard Reject 0: Check IP block list
      if (userIp) {
        const ipBlock = await db.select().from(feedbackIpBlocks)
          .where(and(
            eq(feedbackIpBlocks.ipAddress, userIp),
            sql`(${feedbackIpBlocks.branchId} IS NULL OR ${feedbackIpBlocks.branchId} = ${branch[0].id})`,
            sql`(${feedbackIpBlocks.blockedUntil} IS NULL OR ${feedbackIpBlocks.blockedUntil} > NOW())`
          )).limit(1);
        if (ipBlock.length > 0) {
          return res.status(429).json({
            message: "Bu IP adresinden geri bildirim gönderimine izin verilmiyor. Lütfen daha sonra tekrar deneyiniz."
          });
        }

        // Auto-block: Same IP, 3+ submissions in last hour → temporary 24h block
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const recentIpCount = await db.select({ count: sql<number>`count(*)` })
          .from(customerFeedback)
          .where(and(
            sql`${customerFeedback.userIp} = ${userIp}`,
            sql`${customerFeedback.feedbackDate} >= ${oneHourAgo}`
          ));
        if (recentIpCount[0]?.count >= 3) {
          const blockedUntil = new Date();
          blockedUntil.setHours(blockedUntil.getHours() + 24);
          await db.insert(feedbackIpBlocks).values({
            ipAddress: userIp,
            branchId: branch[0].id,
            reason: `Otomatik engel: 1 saat içinde ${recentIpCount[0].count} gönderim`,
            blockedUntil,
          });
          return res.status(429).json({
            message: "Çok fazla geri bildirim gönderdiniz. Lütfen 24 saat sonra tekrar deneyiniz."
          });
        }
      }

      // Hard Reject 1: Same device_fingerprint + same branch in last 24 hours → 429
      if (deviceFingerprint) {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const sameFingerprintCount = await db.select({ count: sql<number>`count(*)` })
          .from(customerFeedback)
          .where(and(
            eq(customerFeedback.branchId, branch[0].id),
            sql`${customerFeedback.deviceFingerprint} = ${deviceFingerprint}`,
            sql`${customerFeedback.feedbackDate} >= ${twentyFourHoursAgo}`
          ));
        
        if (sameFingerprintCount[0]?.count > 0) {
          return res.status(429).json({ 
            message: "Bugün zaten değerlendirme yaptınız. Lütfen yarın tekrar deneyiniz. Geri bildiriminiz için teşekkür ederiz." 
          });
        }
      }

      // Hard Reject 2: GPS distance check — ONLY when form settings require location verification
      if (locationRequired) {
        const gpsProvided = userLatitude !== null && userLatitude !== undefined && userLongitude !== null && userLongitude !== undefined;
        if (distanceFromBranch !== null && distanceFromBranch > maxDistance) {
          return res.status(403).json({ 
            message: "Geri bildirim gönderebilmek için şubemizde bulunmanız gerekmektedir. Lütfen şubemizi ziyaret ettiğinizde tekrar deneyiniz." 
          });
        }
        if (!gpsProvided && branch[0].latitude && branch[0].longitude) {
          return res.status(403).json({ 
            message: "Geri bildirim gönderebilmek için konum izni vermeniz gerekmektedir. Lütfen konum erişimine izin verin ve tekrar deneyiniz." 
          });
        }
      }

      // === SOFT FLAG CHECKS (accept but mark) ===
      const suspiciousReasons: string[] = [];
      let isSuspicious = false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Soft check: Same IP submitted multiple feedbacks today
      const sameIpCount = await db.select({ count: sql<number>`count(*)` })
        .from(customerFeedback)
        .where(and(
          eq(customerFeedback.branchId, branch[0].id),
          sql`${customerFeedback.userIp} = ${userIp}`,
          sql`${customerFeedback.feedbackDate} >= ${today}`
        ));
      
      if (sameIpCount[0]?.count > 0) {
        suspiciousReasons.push('same_ip_multiple_submissions');
        isSuspicious = true;
      }

      // Soft Flag 1: All 1-star + no comment + no name → suspicious, score weight 50% reduced
      if (rating === 1 && (!comment || comment.trim() === '') && (!customerName || customerName.trim() === '') && isAnonymous) {
        suspiciousReasons.push('all_low_no_detail');
        isSuspicious = true;
      }

      // Soft Flag 2: Same device submitted to different branch same week
      if (deviceFingerprint) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const otherBranchFeedback = await db.select({ count: sql<number>`count(*)` })
          .from(customerFeedback)
          .where(and(
            sql`${customerFeedback.branchId} != ${branch[0].id}`,
            sql`${customerFeedback.deviceFingerprint} = ${deviceFingerprint}`,
            sql`${customerFeedback.feedbackDate} >= ${weekAgo}`
          ));
        
        if (otherBranchFeedback[0]?.count > 0) {
          suspiciousReasons.push('multi_branch_same_week');
          isSuspicious = true;
        }
      }

      // Soft Flag 3: Form completed in under 30 seconds → "too fast"
      const { formStartedAt } = req.body;
      if (formStartedAt) {
        const startTime = new Date(formStartedAt).getTime();
        const submissionDuration = (Date.now() - startTime) / 1000;
        if (submissionDuration < 30) {
          suspiciousReasons.push('too_fast_submission');
          isSuspicious = true;
        }
      }

      // Soft check: Perfect 5-star rating with no comment (potential fake)
      if (rating === 5 && serviceRating === 5 && cleanlinessRating === 5 && 
          productRating === 5 && staffRating === 5 && !comment) {
        suspiciousReasons.push('perfect_rating_no_comment');
      }

      // Soft check: Staff giving feedback to themselves
      if (staffId) {
        if (staffRating === 5) {
          suspiciousReasons.push('high_staff_rating_selected');
        }
      }

      // Calculate priority based on rating and feedback type
      let priority = 'medium';
      if (feedbackType === 'complaint') {
        // Complaints get higher priority
        if (rating <= 2) priority = 'critical';
        else if (rating <= 3) priority = 'critical';
        else priority = 'high';
      } else {
        // Regular feedback
        if (rating <= 2) priority = 'critical';
        else if (rating === 3) priority = 'high';
        else if (rating === 4) priority = 'medium';
        else priority = 'low';
      }

      // Calculate SLA deadline based on priority
      const now = new Date();
      let responseDeadline = new Date(now);
      switch (priority) {
        case 'critical': responseDeadline.setHours(now.getHours() + 4); break;
        case 'high': responseDeadline.setHours(now.getHours() + 12); break;
        case 'medium': responseDeadline.setHours(now.getHours() + 24); break;
        case 'low': responseDeadline.setHours(now.getHours() + 48); break;
      }

      const [feedback] = await db.insert(customerFeedback).values({
        branchId: branch[0].id,
        source: 'qr_code',
        rating,
        serviceRating: serviceRating || null,
        cleanlinessRating: cleanlinessRating || null,
        productRating: productRating || null,
        staffRating: staffRating || null,
        staffId: staffId || null,
        comment: comment || null,
        customerName: isAnonymous ? null : customerName,
        customerEmail: isAnonymous ? null : customerEmail,
        customerPhone: isAnonymous ? null : customerPhone,
        isAnonymous,
        priority,
        responseDeadline,
        status: 'new',
        photoUrls: photoUrls.length > 0 ? photoUrls : null,
        deviceFingerprint: deviceFingerprint || null,
        userIp,
        userLatitude: userLatitude || null,
        userLongitude: userLongitude || null,
        distanceFromBranch,
        isSuspicious,
        suspiciousReasons: suspiciousReasons.length > 0 ? suspiciousReasons : null,
        feedbackLanguage: language,
        feedbackType,
        requiresContact,
      }).returning();

      // ========================================
      // SUPPORT TICKET CREATION (QR → CRM)
      // ========================================
      try {
        const { generateTicketNumber } = await import("../services/ticket-routing-engine");
        const ticketNumber = await generateTicketNumber();
        const avgRating = rating || 3;
        const ticketPriority = avgRating <= 2 ? 'kritik' : avgRating <= 3 ? 'yuksek' : 'normal';

        const slaHours = avgRating <= 2 ? 4 : avgRating <= 3 ? 24 : 72;
        const slaDeadline = new Date();
        slaDeadline.setHours(slaDeadline.getHours() + slaHours);

        const ticketTitle = feedbackType === 'complaint'
          ? `Müşteri Şikayeti - ${branch[0].name} (QR)`
          : `Müşteri Geri Bildirimi - ${branch[0].name} (QR)`;

        await db.insert(supportTickets).values({
          ticketNumber,
          branchId: branch[0].id,
          department: 'musteri_hizmetleri',
          title: ticketTitle,
          description: comment || `QR geri bildirim: ${rating}/5 puan`,
          priority: ticketPriority,
          status: 'acik',
          channel: 'misafir',
          ticketType: feedbackType === 'complaint' ? 'musteri_sikayet' : 'musteri_geri_bildirim',
          source: 'qr',
          rating: rating || null,
          ratingHizmet: serviceRating || null,
          ratingTemizlik: cleanlinessRating || null,
          ratingUrun: productRating || null,
          ratingPersonel: staffRating || null,
          customerName: isAnonymous ? null : (customerName || null),
          customerEmail: isAnonymous ? null : (customerEmail || null),
          customerPhone: isAnonymous ? null : (customerPhone || null),
          isAnonymous,
          photoUrls: photoUrls.length > 0 ? photoUrls : null,
          slaDeadline,
        });
      } catch (ticketErr) {
        console.error("QR feedback → support_ticket creation error:", ticketErr);
      }

      // ========================================
      // NOTIFICATION INTEGRATION (T002)
      // ========================================
      try {
        const branchId = branch[0].id;
        const branchName = branch[0].name;

        const supervisors = await db.select({ id: users.id }).from(users)
          .where(and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            sql`${users.role} IN ('supervisor', 'supervisor_buddy')`
          ));

        const mudurlar = await db.select({ id: users.id }).from(users)
          .where(and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            eq(users.role, 'mudur')
          ));

        const cgoUsers = await db.select({ id: users.id }).from(users)
          .where(and(
            eq(users.isActive, true),
            eq(users.role, 'cgo')
          ));

        const supervisorIds = supervisors.map(s => s.id);
        const mudurIds = mudurlar.map(m => m.id);
        const cgoIds = cgoUsers.map(c => c.id);

        if (feedbackType === 'complaint') {
          const complaintTargets = [...new Set([...supervisorIds, ...mudurIds, ...cgoIds])];
          for (const userId of complaintTargets) {
            await storage.createNotification({
              userId,
              type: 'complaint',
              title: `Müşteri Şikayeti - ${branchName}`,
              message: `${branchName} şubesine yeni müşteri şikayeti geldi. Puan: ${rating}/5${comment ? ` - "${comment.substring(0, 100)}"` : ''}`,
              link: '/crm?channel=misafir',
              isRead: false,
              branchId,
            });
          }
        } else if (rating && rating <= 2) {
          const lowRatingTargets = [...new Set([...supervisorIds, ...mudurIds, ...cgoIds])];
          for (const userId of lowRatingTargets) {
            await storage.createNotification({
              userId,
              type: 'feedback_alert',
              title: `Düşük Puan Uyarısı - ${branchName}`,
              message: `${branchName} şubesine düşük puan (${rating}/5) verildi.${comment ? ` Yorum: "${comment.substring(0, 100)}"` : ''}`,
              link: '/crm?channel=misafir',
              isRead: false,
              branchId,
            });
          }
          // P0: 2★ altı → feedback'i HQ müdahale gerekiyor olarak işaretle
          try {
            await pool.query(`
              UPDATE customer_feedback 
              SET hq_intervention_required = true, feedback_status = 'hq_reviewing'
              WHERE id = $1
            `, [savedFeedback[0]?.id]);
            // Coach + Trainer'a da bildirim git
            const hqAlertUsers = await db.select({ id: users.id }).from(users)
              .where(and(eq(users.isActive, true), sql`${users.role} IN ('coach','trainer','ceo')`));
            for (const hqUser of hqAlertUsers) {
              await storage.createNotification({
                userId: hqUser.id,
                type: 'feedback_alert',
                title: `⚠️ Düşük Puan — ${branchName} HQ Müdahale`,
                message: `${branchName}: ${rating}/5 puan. Şubenin yanıt vermesini takip edin.`,
                link: '/crm?channel=misafir',
                isRead: false,
                branchId,
              });
            }
          } catch(e) { console.error("[FeedbackAlert] HQ intervention flag error:", e); }
        } else if (rating === 3) {
          for (const userId of supervisorIds) {
            await storage.createNotification({
              userId,
              type: 'feedback_info',
              title: `Orta Puan Bildirimi - ${branchName}`,
              message: `${branchName} şubesine orta puan (3/5) verildi.${comment ? ` Yorum: "${comment.substring(0, 100)}"` : ''}`,
              link: '/crm?channel=misafir',
              isRead: false,
              branchId,
            });
          }
        } else if (rating && rating >= 4) {
          for (const userId of supervisorIds) {
            await storage.createNotification({
              userId,
              type: 'feedback_positive',
              title: `Pozitif Geri Bildirim - ${branchName}`,
              message: `${branchName} şubesine yüksek puan (${rating}/5) verildi!${comment ? ` Yorum: "${comment.substring(0, 100)}"` : ''}`,
              link: '/crm?channel=misafir',
              isRead: false,
              branchId,
            });
          }

          if (staffId) {
            const staffUser = await db.select({ id: users.id }).from(users)
              .where(eq(users.id, staffId)).limit(1);
            if (staffUser.length > 0 && !supervisorIds.includes(staffUser[0].id)) {
              await storage.createNotification({
                userId: staffUser[0].id,
                type: 'feedback_positive',
                title: 'Müşteriden Teşekkür!',
                message: `Bir müşteri size ${staffRating || rating}/5 puan verdi!${comment ? ` Yorum: "${comment.substring(0, 100)}"` : ''}`,
                link: '/crm?channel=misafir',
                isRead: false,
                branchId,
              });
            }
          }
        }

        if (requiresContact) {
          const contactResponseDeadline = new Date();
          contactResponseDeadline.setHours(contactResponseDeadline.getHours() + 24);

          await db.update(customerFeedback)
            .set({ responseDeadline: contactResponseDeadline })
            .where(eq(customerFeedback.id, feedback.id));

          for (const userId of supervisorIds) {
            await storage.createNotification({
              userId,
              type: 'feedback_alert',
              title: `Cevap Bekleniyor - ${branchName}`,
              message: `Bir müşteri geri bildirim sonrası iletişim bekliyor. 24 saat içinde yanıt verilmelidir.`,
              link: '/crm?channel=misafir',
              isRead: false,
              branchId,
            });
          }
        }
      } catch (notifError) {
        console.error("Error sending feedback notifications:", notifError);
      }

      // ========================================
      // FEEDBACK ↔ COMPLAINT SYNC (T006)
      // ========================================
      try {
        if (feedbackType === 'complaint' || (rating && rating <= 2)) {
          const complaintPriority = rating === 1 ? 'critical' : rating === 2 ? 'high' : 'high';
          const complaintCategory = feedbackType === 'complaint' ? 'service_speed' : 
            (cleanlinessRating && cleanlinessRating <= 2) ? 'cleanliness' :
            (productRating && productRating <= 2) ? 'product' :
            (staffRating && staffRating <= 2) ? 'staff' :
            (serviceRating && serviceRating <= 2) ? 'service_speed' : 'other';

          const complaintSubject = feedbackType === 'complaint' 
            ? `Müşteri Şikayeti - ${branch[0].name}` 
            : `Düşük Puan Geri Bildirimi (${rating}/5) - ${branch[0].name}`;

          const complaintDescription = comment && comment.trim() 
            ? comment 
            : `Müşteri geri bildirim formu üzerinden ${rating}/5 puan verildi.${
              serviceRating ? ` Hizmet: ${serviceRating}/5.` : ''}${
              cleanlinessRating ? ` Temizlik: ${cleanlinessRating}/5.` : ''}${
              productRating ? ` Ürün: ${productRating}/5.` : ''}${
              staffRating ? ` Personel: ${staffRating}/5.` : ''}`;

          await db.insert(guestComplaints).values({
            branchId: branch[0].id,
            complaintSource: 'customer_feedback_form',
            complaintCategory,
            subject: complaintSubject,
            description: complaintDescription,
            customerName: isAnonymous ? null : (customerName || null),
            customerEmail: isAnonymous ? null : (customerEmail || null),
            customerPhone: isAnonymous ? null : (customerPhone || null),
            isAnonymous: isAnonymous ?? true,
            priority: complaintPriority,
            status: 'new',
            sourceFeedbackId: feedback.id,
          });
        }
      } catch (complaintSyncError) {
        console.error("Error syncing feedback to complaint:", complaintSyncError);
      }

      // ========================================
      // THANK YOU EMAIL (T007)
      // ========================================
      try {
        const feedbackEmail = customerEmail || (!isAnonymous && req.body.customerEmail);
        if (feedbackEmail && typeof feedbackEmail === 'string' && feedbackEmail.includes('@')) {
          await sendFeedbackThankYouEmail(feedbackEmail, {
            customerName: customerName || null,
            branchName: branch[0].name,
            feedbackType: feedbackType as 'feedback' | 'complaint',
            requiresContact: !!requiresContact,
            rating,
          });

          const adminUser = await db.select({ id: users.id }).from(users)
            .where(eq(users.role, 'admin')).limit(1);
          
          if (adminUser.length > 0) {
            await db.insert(feedbackResponses).values({
              feedbackId: feedback.id,
              responderId: adminUser[0].id,
              responseType: 'customer_contact',
              content: `Otomatik teşekkür emaili gönderildi: ${feedbackEmail}`,
              isVisibleToCustomer: false,
            });
          }
        }
      } catch (emailError) {
        console.error("Error sending feedback thank you email:", emailError);
      }

      res.json({ 
        success: true, 
        message: "Geri bildiriminiz alındı. Teşekkür ederiz!",
        feedbackId: feedback.id 
      });
    } catch (error: unknown) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Geri bildirim gönderilemedi" });
    }
  });

  // Get all feedback (HQ sees all, branch manager sees own branch)
  router.get('/api/customer-feedback', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { status, source, branchId, priority, slaBreached, startDate, endDate, suspicious, feedbackType, requiresContact } = req.query;

      let query = db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        source: customerFeedback.source,
        rating: customerFeedback.rating,
        serviceRating: customerFeedback.serviceRating,
        cleanlinessRating: customerFeedback.cleanlinessRating,
        productRating: customerFeedback.productRating,
        staffRating: customerFeedback.staffRating,
        staffId: customerFeedback.staffId,
        comment: customerFeedback.comment,
        customerName: customerFeedback.customerName,
        isAnonymous: customerFeedback.isAnonymous,
        priority: customerFeedback.priority,
        status: customerFeedback.status,
        slaBreached: customerFeedback.slaBreached,
        responseDeadline: customerFeedback.responseDeadline,
        feedbackDate: customerFeedback.feedbackDate,
        reviewedAt: customerFeedback.reviewedAt,
        resolvedAt: customerFeedback.resolvedAt,
        externalReviewUrl: customerFeedback.externalReviewUrl,
        photoUrls: customerFeedback.photoUrls,
        isSuspicious: customerFeedback.isSuspicious,
        suspiciousReasons: customerFeedback.suspiciousReasons,
        distanceFromBranch: customerFeedback.distanceFromBranch,
        feedbackLanguage: customerFeedback.feedbackLanguage,
        feedbackType: customerFeedback.feedbackType,
        requiresContact: customerFeedback.requiresContact,
      })
      .from(customerFeedback)
      .leftJoin(branches, eq(customerFeedback.branchId, branches.id))
      .orderBy(desc(customerFeedback.feedbackDate));

      // Apply filters
      const conditions: SQL<unknown>[] = [];

      // Branch-level users can only see their own branch
      if (isBranchRole(userRole) && userBranchId) {
        conditions.push(eq(customerFeedback.branchId, userBranchId));
      } else if (branchId) {
        conditions.push(eq(customerFeedback.branchId, parseInt(branchId as string)));
      }

      if (status) conditions.push(eq(customerFeedback.status, status as string));
      if (source) conditions.push(eq(customerFeedback.source, source as string));
      if (priority) conditions.push(eq(customerFeedback.priority, priority as string));
      if (slaBreached === 'true') conditions.push(eq(customerFeedback.slaBreached, true));
      if (startDate) conditions.push(gte(customerFeedback.feedbackDate, new Date(startDate as string)));
      if (endDate) conditions.push(lte(customerFeedback.feedbackDate, new Date(endDate as string)));
      if (suspicious === 'suspicious') conditions.push(eq(customerFeedback.isSuspicious, true));
      if (suspicious === 'normal') conditions.push(eq(customerFeedback.isSuspicious, false));
      if (feedbackType) conditions.push(eq(customerFeedback.feedbackType, feedbackType as string));
      if (requiresContact === 'true') conditions.push(eq(customerFeedback.requiresContact, true));
      if (requiresContact === 'false') conditions.push(eq(customerFeedback.requiresContact, false));

      const result = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      res.json(result);
    } catch (error: unknown) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Geri bildirimler yüklenemedi" });
    }
  });

  // Get feedback statistics - MUST be before /:id route
  router.get('/api/customer-feedback/stats/summary', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { branchId: queryBranchId } = req.query;
      const targetBranchId = isBranchRole(userRole) ? userBranchId : (queryBranchId ? parseInt(queryBranchId as string) : null);

      const whereClause = targetBranchId ? eq(customerFeedback.branchId, targetBranchId) : undefined;

      // Get counts by status
      const statusCounts = await db.select({
        status: customerFeedback.status,
        count: sql<number>`count(*)::int`,
      })
      .from(customerFeedback)
      .where(whereClause)
      .groupBy(customerFeedback.status);

      // Get counts by source
      const sourceCounts = await db.select({
        source: customerFeedback.source,
        count: sql<number>`count(*)::int`,
      })
      .from(customerFeedback)
      .where(whereClause)
      .groupBy(customerFeedback.source);

      // Get average ratings
      const avgRatings = await db.select({
        avgRating: sql<number>`ROUND(AVG(${customerFeedback.rating})::numeric, 2)`,
        avgService: sql<number>`ROUND(AVG(${customerFeedback.serviceRating})::numeric, 2)`,
        avgCleanliness: sql<number>`ROUND(AVG(${customerFeedback.cleanlinessRating})::numeric, 2)`,
        avgProduct: sql<number>`ROUND(AVG(${customerFeedback.productRating})::numeric, 2)`,
        avgStaff: sql<number>`ROUND(AVG(${customerFeedback.staffRating})::numeric, 2)`,
        totalCount: sql<number>`count(*)::int`,
        slaBreachedCount: sql<number>`SUM(CASE WHEN ${customerFeedback.slaBreached} THEN 1 ELSE 0 END)::int`,
      })
      .from(customerFeedback)
      .where(whereClause);

      res.json({
        statusCounts: statusCounts.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
        sourceCounts: sourceCounts.reduce((acc, item) => ({ ...acc, [item.source]: item.count }), {}),
        ...avgRatings[0],
      });
    } catch (error: unknown) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenemedi" });
    }
  });

  // Get single feedback with responses
  router.get('/api/customer-feedback/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const feedback = await db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        source: customerFeedback.source,
        externalReviewId: customerFeedback.externalReviewId,
        externalReviewUrl: customerFeedback.externalReviewUrl,
        rating: customerFeedback.rating,
        serviceRating: customerFeedback.serviceRating,
        cleanlinessRating: customerFeedback.cleanlinessRating,
        productRating: customerFeedback.productRating,
        staffRating: customerFeedback.staffRating,
        staffId: customerFeedback.staffId,
        comment: customerFeedback.comment,
        customerName: customerFeedback.customerName,
        customerEmail: customerFeedback.customerEmail,
        customerPhone: customerFeedback.customerPhone,
        isAnonymous: customerFeedback.isAnonymous,
        priority: customerFeedback.priority,
        status: customerFeedback.status,
        slaBreached: customerFeedback.slaBreached,
        responseDeadline: customerFeedback.responseDeadline,
        feedbackDate: customerFeedback.feedbackDate,
        reviewedById: customerFeedback.reviewedById,
        reviewedAt: customerFeedback.reviewedAt,
        reviewNotes: customerFeedback.reviewNotes,
        resolvedAt: customerFeedback.resolvedAt,
        resolutionSatisfaction: customerFeedback.resolutionSatisfaction,
      })
      .from(customerFeedback)
      .leftJoin(branches, eq(customerFeedback.branchId, branches.id))
      .where(eq(customerFeedback.id, feedbackId))
      .limit(1);

      if (feedback.length === 0) {
        return res.status(404).json({ message: "Geri bildirim bulunamadı" });
      }

      // Get responses
      const responses = await db.select({
        id: feedbackResponses.id,
        responseType: feedbackResponses.responseType,
        content: feedbackResponses.content,
        isVisibleToCustomer: feedbackResponses.isVisibleToCustomer,
        createdAt: feedbackResponses.createdAt,
        responderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('responderName'),
      })
      .from(feedbackResponses)
      .leftJoin(users, eq(feedbackResponses.responderId, users.id))
      .where(eq(feedbackResponses.feedbackId, parseInt(id)))
      .orderBy(feedbackResponses.createdAt);

      // Get staff name if assigned
      let staffName = null;
      if (feedback[0].staffId) {
        const staff = await db.select({
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, feedback[0].staffId)).limit(1);
        if (staff.length > 0) {
          staffName = `${staff[0].firstName} ${staff[0].lastName}`;
        }
      }

      res.json({ ...feedback[0], staffName, responses });
    } catch (error: unknown) {
      console.error("Error fetching feedback detail:", error);
      res.status(500).json({ message: "Detay yüklenemedi" });
    }
  });

  // Add response/defense to feedback
  router.post('/api/customer-feedback/:id/response', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { responseType, content, isVisibleToCustomer = false } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const [response] = await db.insert(feedbackResponses).values({
        feedbackId,
        responderId: userId,
        responseType,
        content,
        isVisibleToCustomer,
      }).returning();

      // Update feedback status
      const newStatus = responseType === 'defense' ? 'in_progress' : 
                        responseType === 'customer_contact' ? 'awaiting_response' : 
                        'in_progress';

      await db.update(customerFeedback)
        .set({ 
          status: newStatus, 
          reviewedById: userId,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(customerFeedback.id, parseInt(id)));

      res.json({ success: true, response });
    } catch (error: unknown) {
      console.error("Error adding response:", error);
      res.status(500).json({ message: "Yanıt eklenemedi" });
    }
  });

  // Update feedback status
  router.patch('/api/customer-feedback/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

  // P0: HQ iç not — misafir GÖREMEZ
  router.patch('/api/customer-feedback/:id/hq-note', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { note, interventionRequired } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      const hqRoles = ['hq', 'ceo', 'cgo', 'coach', 'trainer', 'admin', 'muhasebe', 'ik'];
      if (!hqRoles.includes(userRole || '')) {
        return res.status(403).json({ message: "Bu işlem için HQ yetkisi gerekli" });
      }
      
      await pool.query(`
        UPDATE customer_feedback SET
          hq_note = $1,
          hq_note_by_id = $2,
          hq_note_at = NOW(),
          hq_intervention_required = $3,
          feedback_status = CASE WHEN $3 = true THEN 'hq_reviewing' ELSE feedback_status END
        WHERE id = $4
      `, [note, userId, interventionRequired || false, parseInt(id)]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("HQ note error:", error);
      res.status(500).json({ message: "İç not kaydedilemedi" });
    }
  });

  // P0: Şube yanıtı (misafir SLA)
  router.patch('/api/customer-feedback/:id/branch-respond', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { responseText } = req.body;
      const userId = req.user?.id;
      
      await pool.query(`
        UPDATE customer_feedback SET
          branch_response_text = $1,
          branch_responder_id = $2,
          branch_response_at = NOW(),
          feedback_status = 'branch_responded'
        WHERE id = $3
      `, [responseText, userId, parseInt(id)]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Branch respond error:", error);
      res.status(500).json({ message: "Yanıt kaydedilemedi" });
    }
  });


      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const [existingFeedback] = await db.select({ createdAt: customerFeedback.createdAt, status: customerFeedback.status }).from(customerFeedback).where(eq(customerFeedback.id, feedbackId)).limit(1);
      if (existingFeedback) {
        const lockResult = await checkDataLock('customer_feedback', existingFeedback.createdAt || new Date(), existingFeedback.status || undefined);
        if (lockResult.locked) {
          return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
        }
      }

      const updateData: any = { 
        status, 
        reviewedById: userId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      };

      if (reviewNotes) updateData.reviewNotes = reviewNotes;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }

      await db.update(customerFeedback)
        .set(updateData)
        .where(eq(customerFeedback.id, parseInt(id)));

      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Durum güncellenemedi" });
    }
  });

  // Add manual external review (Google/Instagram)
  router.post('/api/customer-feedback/external', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;

      if (!hasPermission(userRole, 'customer_satisfaction', 'create')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { 
        branchId, 
        source, 
        externalReviewId,
        externalReviewUrl,
        rating, 
        comment,
        customerName
      } = req.body;

      // Calculate priority
      let priority = 'medium';
      if (rating <= 2) priority = 'critical';
      else if (rating === 3) priority = 'high';
      else if (rating === 4) priority = 'medium';
      else priority = 'low';

      // SLA deadline
      const now = new Date();
      let responseDeadline = new Date(now);
      switch (priority) {
        case 'critical': responseDeadline.setHours(now.getHours() + 4); break;
        case 'high': responseDeadline.setHours(now.getHours() + 12); break;
        case 'medium': responseDeadline.setHours(now.getHours() + 24); break;
        case 'low': responseDeadline.setHours(now.getHours() + 48); break;
      }

      const [feedback] = await db.insert(customerFeedback).values({
        branchId,
        source,
        externalReviewId: externalReviewId || null,
        externalReviewUrl: externalReviewUrl || null,
        rating,
        comment: comment || null,
        customerName: customerName || null,
        isAnonymous: !customerName,
        priority,
        responseDeadline,
        status: 'new',
      }).returning();

      res.json({ success: true, feedback });
    } catch (error: unknown) {
      console.error("Error adding external review:", error);
      res.status(500).json({ message: "Harici yorum eklenemedi" });
    }
  });


  // Check and update SLA breaches (can be called periodically)
  router.post('/api/customer-feedback/check-sla', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'destek'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const now = new Date();
      
      // Find feedbacks with passed deadline that aren't resolved/closed
      const result = await db.update(customerFeedback)
        .set({ slaBreached: true, updatedAt: new Date() })
        .where(and(
          eq(customerFeedback.slaBreached, false),
          lte(customerFeedback.responseDeadline, now),
          sql`${customerFeedback.status} NOT IN ('resolved', 'closed')`
        ))
        .returning({ id: customerFeedback.id });

      res.json({ updated: result.length });
    } catch (error: unknown) {
      console.error("Error checking SLA:", error);
      res.status(500).json({ message: "SLA kontrolü başarısız" });
    }
  });

  // ========================================
  // FEEDBACK FORM SETTINGS (Form Özelleştirme)
  // ========================================

  // Helper: Get global form settings (branch_id IS NULL)
  async function getGlobalFormSettings() {
    const settings = await db.select()
      .from(feedbackFormSettings)
      .where(isNull(feedbackFormSettings.branchId))
      .limit(1);

    if (settings.length > 0) return settings[0];

    // Return defaults if no global record exists
    return {
      id: null,
      branchId: null,
      bannerUrl: null,
      logoUrl: null,
      primaryColor: "#7c3aed",
      backgroundColor: "#1e1b4b",
      welcomeMessageTr: "Geri bildiriminiz bizim için çok değerli",
      welcomeMessageEn: "Your feedback is very valuable to us",
      welcomeMessageZh: "您的意见对我们非常宝贵",
      welcomeMessageAr: "رأيك مهم جداً بالنسبة لنا",
      welcomeMessageDe: "Ihre Meinung ist uns sehr wichtig",
      welcomeMessageKo: "귀하의 의견은 저희에게 매우 소중합니다",
      welcomeMessageFr: "Votre avis nous est très précieux",
      showServiceRating: true,
      showCleanlinessRating: true,
      showProductRating: true,
      showStaffRating: true,
      showStaffSelection: true,
      showPhotoUpload: true,
      showFeedbackTypeSelection: true,
      showContactPreference: true,
      showCommentField: true,
      requireComment: false,
      allowAnonymous: true,
      defaultAnonymous: true,
      requireLocationVerification: false,
      maxDistanceFromBranch: 500,
      availableLanguages: ["tr", "en"],
      defaultLanguage: "tr",
      isActive: true,
    };
  }

  // Get feedback form settings for a branch (public - for guest form)
  // Uses global settings (same for all branches)
  router.get('/api/feedback-form-settings/branch/:branchId', async (req, res) => {
    try {
      const branchIdNum = parseInt(req.params.branchId);
      if (isNaN(branchIdNum)) {
        return res.status(400).json({ message: "Geçersiz şube ID'si" });
      }
      const globalSettings = await getGlobalFormSettings();
      res.json({ ...globalSettings, branchId: branchIdNum });
    } catch (error: unknown) {
      console.error("Error fetching feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Get feedback form settings by token (for guest form using QR token)
  router.get('/api/feedback-form-settings/token/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const branch = await db.select()
        .from(branches)
        .where(eq(branches.feedbackQrToken, token))
        .limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Geçersiz QR kod" });
      }

      const globalSettings = await getGlobalFormSettings();
      res.json({ ...globalSettings, branchId: branch[0].id, branchName: branch[0].name });
    } catch (error: unknown) {
      console.error("Error fetching feedback form settings by token:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Get global feedback form settings (admin)
  router.get('/api/feedback-form-settings', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const globalSettings = await getGlobalFormSettings();
      res.json(globalSettings);
    } catch (error: unknown) {
      console.error("Error fetching feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Update global feedback form settings
  router.put('/api/feedback-form-settings/global', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const settingsData = {
        branchId: null as any,
        bannerUrl: req.body.bannerUrl || null,
        logoUrl: req.body.logoUrl || null,
        primaryColor: req.body.primaryColor || "#7c3aed",
        backgroundColor: req.body.backgroundColor || "#1e1b4b",
        welcomeMessageTr: req.body.welcomeMessageTr || "Geri bildiriminiz bizim için çok değerli",
        welcomeMessageEn: req.body.welcomeMessageEn || "Your feedback is very valuable to us",
        welcomeMessageZh: req.body.welcomeMessageZh || "您的意见对我们非常宝贵",
        welcomeMessageAr: req.body.welcomeMessageAr || "رأيك مهم جداً بالنسبة لنا",
        welcomeMessageDe: req.body.welcomeMessageDe || "Ihre Meinung ist uns sehr wichtig",
        welcomeMessageKo: req.body.welcomeMessageKo || "귀하의 의견은 저희에게 매우 소중합니다",
        welcomeMessageFr: req.body.welcomeMessageFr || "Votre avis nous est très précieux",
        showServiceRating: req.body.showServiceRating ?? true,
        showCleanlinessRating: req.body.showCleanlinessRating ?? true,
        showProductRating: req.body.showProductRating ?? true,
        showStaffRating: req.body.showStaffRating ?? true,
        showStaffSelection: req.body.showStaffSelection ?? true,
        showPhotoUpload: req.body.showPhotoUpload ?? true,
        showFeedbackTypeSelection: req.body.showFeedbackTypeSelection ?? true,
        showContactPreference: req.body.showContactPreference ?? true,
        showCommentField: req.body.showCommentField ?? true,
        requireComment: req.body.requireComment ?? false,
        allowAnonymous: req.body.allowAnonymous ?? true,
        defaultAnonymous: req.body.defaultAnonymous ?? true,
        requireLocationVerification: req.body.requireLocationVerification ?? false,
        maxDistanceFromBranch: req.body.maxDistanceFromBranch ?? 500,
        availableLanguages: req.body.availableLanguages || ["tr", "en"],
        defaultLanguage: req.body.defaultLanguage || "tr",
        isActive: req.body.isActive ?? true,
        updatedById: userId,
        updatedAt: new Date(),
      };

      // Check if global record exists (branch_id IS NULL)
      const existing = await db.select()
        .from(feedbackFormSettings)
        .where(isNull(feedbackFormSettings.branchId))
        .limit(1);

      let result;
      if (existing.length === 0) {
        [result] = await db.insert(feedbackFormSettings).values(settingsData).returning();
      } else {
        [result] = await db.update(feedbackFormSettings)
          .set(settingsData)
          .where(isNull(feedbackFormSettings.branchId))
          .returning();
      }

      res.json({ success: true, settings: result });
    } catch (error: unknown) {
      console.error("Error saving feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları kaydedilemedi" });
    }
  });

  // Legacy: Keep branch-specific PUT for backward compatibility (redirects to global)
  router.put('/api/feedback-form-settings/:branchId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const settingsData = {
        branchId: null as any,
        bannerUrl: req.body.bannerUrl || null,
        logoUrl: req.body.logoUrl || null,
        primaryColor: req.body.primaryColor || "#7c3aed",
        backgroundColor: req.body.backgroundColor || "#1e1b4b",
        welcomeMessageTr: req.body.welcomeMessageTr || "Geri bildiriminiz bizim için çok değerli",
        welcomeMessageEn: req.body.welcomeMessageEn || "Your feedback is very valuable to us",
        welcomeMessageZh: req.body.welcomeMessageZh || "您的意见对我们非常宝贵",
        welcomeMessageAr: req.body.welcomeMessageAr || "رأيك مهم جداً بالنسبة لنا",
        welcomeMessageDe: req.body.welcomeMessageDe || "Ihre Meinung ist uns sehr wichtig",
        welcomeMessageKo: req.body.welcomeMessageKo || "귀하의 의견은 저희에게 매우 소중합니다",
        welcomeMessageFr: req.body.welcomeMessageFr || "Votre avis nous est très précieux",
        showServiceRating: req.body.showServiceRating ?? true,
        showCleanlinessRating: req.body.showCleanlinessRating ?? true,
        showProductRating: req.body.showProductRating ?? true,
        showStaffRating: req.body.showStaffRating ?? true,
        showStaffSelection: req.body.showStaffSelection ?? true,
        showPhotoUpload: req.body.showPhotoUpload ?? true,
        showFeedbackTypeSelection: req.body.showFeedbackTypeSelection ?? true,
        showContactPreference: req.body.showContactPreference ?? true,
        showCommentField: req.body.showCommentField ?? true,
        requireComment: req.body.requireComment ?? false,
        allowAnonymous: req.body.allowAnonymous ?? true,
        defaultAnonymous: req.body.defaultAnonymous ?? true,
        requireLocationVerification: req.body.requireLocationVerification ?? false,
        maxDistanceFromBranch: req.body.maxDistanceFromBranch ?? 500,
        availableLanguages: req.body.availableLanguages || ["tr", "en"],
        defaultLanguage: req.body.defaultLanguage || "tr",
        isActive: req.body.isActive ?? true,
        updatedById: userId,
        updatedAt: new Date(),
      };

      const existing = await db.select()
        .from(feedbackFormSettings)
        .where(isNull(feedbackFormSettings.branchId))
        .limit(1);

      let result;
      if (existing.length === 0) {
        [result] = await db.insert(feedbackFormSettings).values(settingsData).returning();
      } else {
        [result] = await db.update(feedbackFormSettings)
          .set(settingsData)
          .where(isNull(feedbackFormSettings.branchId))
          .returning();
      }

      res.json({ success: true, settings: result });
    } catch (error: unknown) {
      console.error("Error saving feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları kaydedilemedi" });
    }
  });

  // ========================================
  // FEEDBACK CUSTOM QUESTIONS
  // ========================================

  router.get('/api/feedback-custom-questions/:branchId', isAuthenticated, async (req, res) => {
    try {
      const branchId = parseInt(req.params.branchId);
      if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      if (isBranchRole(req.user?.role) && req.user?.branchId !== branchId) {
        return res.status(403).json({ message: "Sadece kendi şubenizi görüntüleyebilirsiniz" });
      }
      const questions = await db.select().from(feedbackCustomQuestions)
        .where(eq(feedbackCustomQuestions.branchId, branchId))
        .orderBy(feedbackCustomQuestions.sortOrder);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching custom questions:", error);
      res.status(500).json({ message: "Sorular yüklenemedi" });
    }
  });

  router.get('/api/feedback-custom-questions/public/:branchId', async (req, res) => {
    try {
      const branchId = parseInt(req.params.branchId);
      if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });
      const questions = await db.select().from(feedbackCustomQuestions)
        .where(and(eq(feedbackCustomQuestions.branchId, branchId), eq(feedbackCustomQuestions.isActive, true)))
        .orderBy(feedbackCustomQuestions.sortOrder);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Sorular yüklenemedi" });
    }
  });

  router.post('/api/feedback-custom-questions', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { branchId, questionTr, questionType } = req.body;
      if (!branchId || !questionTr) return res.status(400).json({ message: "Şube ID ve Türkçe soru zorunludur" });
      if (isBranchRole(req.user?.role) && req.user?.branchId !== branchId) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için soru ekleyebilirsiniz" });
      }

      const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
        .from(feedbackCustomQuestions).where(eq(feedbackCustomQuestions.branchId, branchId));

      const [question] = await db.insert(feedbackCustomQuestions).values({
        branchId,
        questionTr,
        questionEn: req.body.questionEn || null,
        questionDe: req.body.questionDe || null,
        questionAr: req.body.questionAr || null,
        questionZh: req.body.questionZh || null,
        questionKo: req.body.questionKo || null,
        questionFr: req.body.questionFr || null,
        questionType: questionType || "rating",
        sortOrder: (maxOrder[0]?.max || 0) + 1,
      }).returning();

      res.json(question);
    } catch (error) {
      console.error("Error creating custom question:", error);
      res.status(500).json({ message: "Soru eklenemedi" });
    }
  });

  router.put('/api/feedback-custom-questions/:id', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      if (isBranchRole(req.user?.role)) {
        const [existing] = await db.select().from(feedbackCustomQuestions).where(eq(feedbackCustomQuestions.id, id)).limit(1);
        if (!existing || existing.branchId !== req.user?.branchId) {
          return res.status(403).json({ message: "Bu soru üzerinde yetkiniz yok" });
        }
      }

      const updates: any = { updatedAt: new Date() };
      if (req.body.questionTr !== undefined) updates.questionTr = req.body.questionTr;
      if (req.body.questionEn !== undefined) updates.questionEn = req.body.questionEn;
      if (req.body.questionDe !== undefined) updates.questionDe = req.body.questionDe;
      if (req.body.questionAr !== undefined) updates.questionAr = req.body.questionAr;
      if (req.body.questionZh !== undefined) updates.questionZh = req.body.questionZh;
      if (req.body.questionKo !== undefined) updates.questionKo = req.body.questionKo;
      if (req.body.questionFr !== undefined) updates.questionFr = req.body.questionFr;
      if (req.body.questionType !== undefined) updates.questionType = req.body.questionType;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;

      const [result] = await db.update(feedbackCustomQuestions).set(updates)
        .where(eq(feedbackCustomQuestions.id, id)).returning();
      if (!result) return res.status(404).json({ message: "Soru bulunamadı" });
      res.json(result);
    } catch (error) {
      console.error("Error updating custom question:", error);
      res.status(500).json({ message: "Soru güncellenemedi" });
    }
  });

  router.delete('/api/feedback-custom-questions/:id', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      if (isBranchRole(req.user?.role)) {
        const [existing] = await db.select().from(feedbackCustomQuestions).where(eq(feedbackCustomQuestions.id, id)).limit(1);
        if (!existing || existing.branchId !== req.user?.branchId) {
          return res.status(403).json({ message: "Bu soru üzerinde yetkiniz yok" });
        }
      }
      await db.delete(feedbackCustomQuestions).where(eq(feedbackCustomQuestions.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Soru silinemedi" });
    }
  });

  router.post('/api/feedback-custom-questions/:id/translate', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const [question] = await db.select().from(feedbackCustomQuestions)
        .where(eq(feedbackCustomQuestions.id, id)).limit(1);
      if (!question) return res.status(404).json({ message: "Soru bulunamadı" });

      const { chat } = await import("../services/ai-client");
      const prompt = `Translate the following Turkish survey question to these languages. Return ONLY a valid JSON object with keys: en, de, ar, zh, ko, fr. No markdown, no explanation.

Turkish question: "${question.questionTr}"`;

      const completion = await chat({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const translations = JSON.parse(cleaned);

      const [updated] = await db.update(feedbackCustomQuestions).set({
        questionEn: translations.en || question.questionEn,
        questionDe: translations.de || question.questionDe,
        questionAr: translations.ar || question.questionAr,
        questionZh: translations.zh || question.questionZh,
        questionKo: translations.ko || question.questionKo,
        questionFr: translations.fr || question.questionFr,
        updatedAt: new Date(),
      }).where(eq(feedbackCustomQuestions.id, id)).returning();

      res.json(updated);
    } catch (error: unknown) {
      const { respondIfAiBudgetError } = await import('../ai-budget-guard');
      if (respondIfAiBudgetError(error, res)) return;
      console.error("Error translating question:", error);
      res.status(500).json({ message: "Çeviri yapılamadı" });
    }
  });

  // ========================================
  // FEEDBACK IP BLOCKS
  // ========================================

  router.get('/api/feedback-ip-blocks', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const conditions = [];
      if (isBranchRole(req.user?.role) && req.user?.branchId) {
        conditions.push(
          or(
            eq(feedbackIpBlocks.branchId, req.user.branchId),
            isNull(feedbackIpBlocks.branchId)
          )
        );
      }
      const blocks = await db.select().from(feedbackIpBlocks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`created_at DESC`).limit(200);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "IP blokları yüklenemedi" });
    }
  });

  router.delete('/api/feedback-ip-blocks/:id', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user?.role, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      if (isBranchRole(req.user?.role)) {
        const [existing] = await db.select().from(feedbackIpBlocks).where(eq(feedbackIpBlocks.id, id)).limit(1);
        if (!existing || (existing.branchId !== null && existing.branchId !== req.user?.branchId)) {
          return res.status(403).json({ message: "Bu IP engeli üzerinde yetkiniz yok" });
        }
      }
      await db.delete(feedbackIpBlocks).where(eq(feedbackIpBlocks.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "IP blok silinemedi" });
    }
  });

  // ========================================
  // GUEST FEEDBACK API (Misafir Geri Bildirimi)
  // ========================================

  // GET /api/customer-feedback - List customer feedback

  // POST /api/customer-feedback/public - Public endpoint for customer feedback (no auth)
  router.post('/api/customer-feedback/public', async (req, res) => {
    try {
      const validatedData = insertCustomerFeedbackSchema.parse(req.body);
      
      // Validate branch exists
      const branch = await db.select().from(branches).where(eq(branches.id, validatedData.branchId)).limit(1);
      if (!branch || branch.length === 0) {
        return res.status(400).json({ message: "Geçersiz şube ID. Lütfen geçerli bir şube numarası girin." });
      }
      
      const [feedback] = await db.insert(customerFeedback).values(validatedData).returning();
      res.status(201).json({ message: "Geri bildiriminiz için teşekkürler!", id: feedback.id });
    } catch (error: unknown) {
      console.error("Error creating customer feedback:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Geri bildirim kaydedilirken hata oluştu" });
    }
  });

  // PATCH /api/customer-feedback/:id/review - Mark feedback as reviewed
  router.patch('/api/customer-feedback/:id/review', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const [existingFeedbackForLock] = await db.select({ createdAt: customerFeedback.createdAt, status: customerFeedback.status }).from(customerFeedback).where(eq(customerFeedback.id, parseInt(id))).limit(1);
      if (existingFeedbackForLock) {
        const lockResult = await checkDataLock('customer_feedback', existingFeedbackForLock.createdAt || new Date(), existingFeedbackForLock.status || undefined);
        if (lockResult.locked) {
          return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
        }
      }

      const [updated] = await db.update(customerFeedback)
        .set({
          status: 'reviewed',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes,
        })
        .where(eq(customerFeedback.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Geri bildirim bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error reviewing feedback:", error);
      res.status(500).json({ message: "Geri bildirim güncellenirken hata oluştu" });
    }
  });

  // GET /api/customer-feedback/stats/:branchId - Get branch feedback statistics
  router.get('/api/customer-feedback/stats/:branchId', isAuthenticated, async (req, res) => {
    try {
      const { branchId } = req.params;
      
      const stats = await db.select({
        avgRating: sql<number>`AVG(${customerFeedback.rating})`,
        totalCount: sql<number>`COUNT(*)`,
        rating5: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 5)`,
        rating4: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 4)`,
        rating3: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 3)`,
        rating2: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 2)`,
        rating1: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 1)`,
      })
      .from(customerFeedback)
      .where(eq(customerFeedback.branchId, parseInt(branchId)));

      res.json(stats[0] || { avgRating: 0, totalCount: 0, rating5: 0, rating4: 0, rating3: 0, rating2: 0, rating1: 0 });
    } catch (error: unknown) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });
  // ===============================================
  // AUDIT TEMPLATE ROUTES
  // ===============================================




  router.patch('/api/audit-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ users can update templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonunu güncelleyebilir' });
      }
      
      const { template, items } = req.body;
      
      const updateSchema = insertAuditTemplateSchema.partial().omit({ createdById: true });
      const validatedTemplate = updateSchema.parse(template);
      
      let validatedItems:Omit<InsertAuditTemplateItem, 'templateId'>[] | undefined = undefined;
      if (items) {
        // Validate items - storage layer expects items without templateId
        const itemSchema = insertAuditTemplateItemSchema.omit({ templateId: true }).superRefine((data, ctx) => {
          // Conditional validation for multiple_choice type
          if (data.itemType === 'multiple_choice') {
            // Filter out empty/whitespace-only options
            const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
            
            if (validOptions.length < 2) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
                path: ['options'],
              });
            }
            
            // Check each option is non-empty
            if (data.options) {
              data.options.forEach((opt, idx) => {
                if (!opt || opt.trim() === '') {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Şık ${idx + 1} boş olamaz`,
                    path: ['options', idx],
                  });
                }
              });
            }
            
            if (!data.correctAnswer || data.correctAnswer.trim() === '') {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap gerekli",
                path: ['correctAnswer'],
              });
            }
            
            if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap şıklardan biri olmalı",
                path: ['correctAnswer'],
              });
            }
          }
        });
        validatedItems = items.map((item) =>
          itemSchema.parse(item)
        ) as Omit<InsertAuditTemplateItem, 'templateId'>[];
      }
      
      const updated = await storage.updateAuditTemplate(parseInt(id), validatedTemplate, validatedItems);
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim şablonu bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating audit template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim şablonu güncellenirken hata oluştu" });
    }
  });


  // ===============================================
  // AUDIT INSTANCE ROUTES
  // ===============================================

  router.get('/api/audit-instances', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId, userId, auditorId, status, auditType } = req.query;
      
      const filters: any = {
        status: status as string,
        auditType: auditType as string,
      };
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (user.branchId) {
          filters.branchId = user.branchId;
        }
      } else if (isHQRole(user.role as UserRoleType)) {
        // HQ can filter by any branch
        if (branchId) {
          filters.branchId = parseInt(branchId as string);
        }
        if (userId) {
          filters.userId = userId as string;
        }
        if (auditorId) {
          filters.auditorId = auditorId as string;
        }
      } else {
        return res.status(403).json({ message: 'Denetim kayıtlarını görüntülemek için yetkiniz yok' });
      }
      
      const instances = await storage.getAuditInstances(filters);
      res.json(instances);
    } catch (error: unknown) {
      console.error("Error fetching audit instances:", error);
      res.status(500).json({ message: "Denetim kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/audit-instances/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      const instance = await storage.getAuditInstance(parseInt(id));
      
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (instance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Bu denetim kaydına erişim yetkiniz yok' });
        }
      }
      
      res.json(instance);
    } catch (error: unknown) {
      console.error("Error fetching audit instance:", error);
      res.status(500).json({ message: "Denetim kaydı yüklenirken hata oluştu" });
    }
  });

  router.post('/api/audit-instances', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // HQ can create any audit, branch supervisor can create branch audits
      const validatedInstance = insertAuditInstanceSchema.parse({
        ...req.body,
        auditorId: user.id,
      });
      
      // If branch user, ensure they can only audit their branch
      if (isBranchRole(user.role as UserRoleType)) {
        if (validatedInstance.branchId && validatedInstance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Sadece kendi şubeniz için denetim başlatabilirsiniz' });
        }
      }
      
      const newInstance = await storage.createAuditInstance(validatedInstance);
      res.status(201).json(newInstance);
    } catch (error: unknown) {
      console.error("Error creating audit instance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim başlatılırken hata oluştu" });
    }
  });

  router.patch('/api/audit-instances/:instanceId/items/:templateItemId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { instanceId, templateItemId } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(instanceId));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can update items
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ güncelleyebilir' });
      }
      
      // Block updates on completed audits (409 Conflict)
      if (instance.status !== 'in_progress') {
        return res.status(409).json({ 
          message: "Tamamlanmış denetimler güncellenemez",
          status: instance.status 
        });
      }
      
      const updateSchema = insertAuditInstanceItemSchema.partial().omit({ 
        instanceId: true,
        templateItemId: true 
      });
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateAuditInstanceItem(
        parseInt(instanceId),
        parseInt(templateItemId),
        validatedData
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim maddesi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating audit instance item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim maddesi güncellenirken hata oluştu" });
    }
  });

  router.post('/api/audit-instances/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { notes, actionItems, followUpRequired, followUpDate } = req.body;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can complete
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ tamamlayabilir' });
      }
      
      const completed = await storage.completeAuditInstance(
        parseInt(id),
        notes,
        actionItems,
        followUpRequired,
        followUpDate
      );
      
      if (!completed) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Auto-generate CAPA for low-scoring items (<70%)
      try {
        // Check if CAPAs already exist for this audit to avoid duplicates
        const existingCapas = await db.select({ auditItemId: correctiveActions.auditItemId })
          .from(correctiveActions)
          .where(eq(correctiveActions.auditInstanceId, parseInt(id)));
        const existingItemIds = new Set(existingCapas.map(c => c.auditItemId));
        // Fetch audit instance items with template details
        const instanceItems = await db
          .select({
            instanceId: auditInstanceItems.instanceId,
            templateItemId: auditInstanceItems.templateItemId,
            response: auditInstanceItems.response,
            score: auditInstanceItems.score,
            notes: auditInstanceItems.notes,
            itemText: auditTemplateItems.itemText,
            section: auditTemplateItems.section,
            weight: auditTemplateItems.weight,
          })
          .from(auditInstanceItems)
          .leftJoin(auditTemplateItems, eq(auditInstanceItems.templateItemId, auditTemplateItems.id))
          .where(eq(auditInstanceItems.instanceId, parseInt(id)));
        
        // Filter items with score < 70% (low performers)
        const lowScoreItems = instanceItems.filter(item => 
          item.score !== null && item.score < 70
        );
        
        // Create CAPA for each low-scoring item
        const createdCapas: any[] = [];
        for (const item of lowScoreItems) {
          // Skip if CAPA already exists for this item (idempotent)
          if (existingItemIds.has(item.templateItemId)) {
            continue;
          }
          // Determine priority based on score and weight
          let priority: string = 'medium';
          const itemWeight = item.weight ? parseFloat(item.weight.toString()) : 1;
          
          if (item.score !== null && item.score < 30) {
            priority = itemWeight >= 5 ? 'critical' : 'high';
          } else if (item.score !== null && item.score < 50) {
            priority = itemWeight >= 5 ? 'high' : 'medium';
          } else {
            priority = 'low';
          }
          
          // Calculate SLA hours based on priority
          const slaHours = priority === 'critical' ? 24 : priority === 'high' ? 48 : priority === 'medium' ? 72 : 168;
          
          // Calculate due date
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + slaHours);
          
          // Determine action type based on section
          let actionType = 'CORRECTIVE';
          if (item.section === 'gida_guvenligi' || item.section === 'operasyon') {
            actionType = 'IMMEDIATE';
          } else if (item.section === 'ekipman') {
            actionType = 'MAINTENANCE';
          }
          
          // Create CAPA record
          const [capa] = await db.insert(correctiveActions).values({
            auditInstanceId: parseInt(id),
            auditItemId: item.templateItemId,
            priority,
            status: 'OPEN',
            actionType,
            description: `Denetim maddesi düşük puan: "${item.itemText}" - Puan: ${item.score}%. ${item.notes ? `Not: ${item.notes}` : ''}`,
            actionSlaHours: slaHours,
            dueDate,
            createdById: user.id,
          }).returning();
          
          createdCapas.push(capa);
        }
        
      } catch (capaError) {
        // Log but don't fail the audit completion
        console.error("Error creating CAPA records:", capaError);
      }
      
      res.json(completed);
    } catch (error: unknown) {
      console.error("Error completing audit instance:", error);
      res.status(500).json({ message: "Denetim tamamlanırken hata oluştu" });
    }
  });

  router.get('/api/dashboard/feedback-summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = user.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Şube ataması yapılmamış" });
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const allFeedback = await db.select().from(customerFeedback)
        .where(and(
          eq(customerFeedback.branchId, branchId),
          gte(customerFeedback.feedbackDate, sevenDaysAgo)
        ))
        .orderBy(desc(customerFeedback.feedbackDate));

      const todayFeedback = allFeedback.filter(f => f.feedbackDate && new Date(f.feedbackDate) >= todayStart);
      const todayAvg = todayFeedback.length > 0
        ? (todayFeedback.reduce((s, f) => s + f.rating, 0) / todayFeedback.length).toFixed(1)
        : null;

      const weekAvg = allFeedback.length > 0
        ? (allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length).toFixed(1)
        : null;

      const trendData: { date: string; avg: number; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayFb = allFeedback.filter(f => f.feedbackDate && new Date(f.feedbackDate).toISOString().split('T')[0] === dStr);
        trendData.push({
          date: dStr,
          avg: dayFb.length > 0 ? parseFloat((dayFb.reduce((s, f) => s + f.rating, 0) / dayFb.length).toFixed(1)) : 0,
          count: dayFb.length,
        });
      }

      const pendingComplaints = await db.select({ count: sql<number>`count(*)` })
        .from(guestComplaints)
        .where(and(
          eq(guestComplaints.branchId, branchId),
          inArray(guestComplaints.status, ['new', 'in_progress'])
        ));

      const categoryScores = {
        service: allFeedback.filter(f => f.serviceRating).length > 0
          ? parseFloat((allFeedback.filter(f => f.serviceRating).reduce((s, f) => s + (f.serviceRating || 0), 0) / allFeedback.filter(f => f.serviceRating).length).toFixed(1))
          : null,
        cleanliness: allFeedback.filter(f => f.cleanlinessRating).length > 0
          ? parseFloat((allFeedback.filter(f => f.cleanlinessRating).reduce((s, f) => s + (f.cleanlinessRating || 0), 0) / allFeedback.filter(f => f.cleanlinessRating).length).toFixed(1))
          : null,
        product: allFeedback.filter(f => f.productRating).length > 0
          ? parseFloat((allFeedback.filter(f => f.productRating).reduce((s, f) => s + (f.productRating || 0), 0) / allFeedback.filter(f => f.productRating).length).toFixed(1))
          : null,
        staff: allFeedback.filter(f => f.staffRating).length > 0
          ? parseFloat((allFeedback.filter(f => f.staffRating).reduce((s, f) => s + (f.staffRating || 0), 0) / allFeedback.filter(f => f.staffRating).length).toFixed(1))
          : null,
      };

      res.json({
        todayAvg,
        todayCount: todayFeedback.length,
        weekAvg,
        weekCount: allFeedback.length,
        trend: trendData,
        pendingComplaints: Number(pendingComplaints[0]?.count || 0),
        categoryScores,
      });
    } catch (error: unknown) {
      console.error("Error fetching feedback summary:", error);
      res.status(500).json({ message: "Feedback özeti alınamadı" });
    }
  });

  router.get('/api/dashboard/feedback-hq-summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allFeedback = await db.select({
        branchId: customerFeedback.branchId,
        rating: customerFeedback.rating,
        slaBreached: customerFeedback.slaBreached,
      }).from(customerFeedback)
        .where(gte(customerFeedback.feedbackDate, thirtyDaysAgo));

      const allBranches = await db.select({
        id: branches.id,
        name: branches.name,
      }).from(branches)
        .where(eq(branches.isActive, true));

      const branchMap = new Map<number, { name: string; ratings: number[]; slaBreaches: number }>();
      for (const b of allBranches) {
        branchMap.set(b.id, { name: b.name, ratings: [], slaBreaches: 0 });
      }

      let totalSlaBreaches = 0;
      for (const fb of allFeedback) {
        const entry = branchMap.get(fb.branchId);
        if (entry) {
          entry.ratings.push(fb.rating);
          if (fb.slaBreached) {
            entry.slaBreaches++;
            totalSlaBreaches++;
          }
        }
      }

      const branchScores = Array.from(branchMap.entries())
        .map(([id, data]) => ({
          branchId: id,
          branchName: data.name,
          avg: data.ratings.length > 0 ? parseFloat((data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length).toFixed(1)) : null,
          count: data.ratings.length,
          slaBreaches: data.slaBreaches,
        }))
        .filter(b => b.count > 0)
        .sort((a, b) => (b.avg || 0) - (a.avg || 0));

      const overallAvg = allFeedback.length > 0
        ? parseFloat((allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length).toFixed(1))
        : null;

      const top3 = branchScores.slice(0, 3);
      const bottom3 = branchScores.length > 3 ? branchScores.slice(-3).reverse() : [];

      res.json({
        overallAvg,
        totalFeedbackCount: allFeedback.length,
        totalBranches: branchScores.length,
        totalSlaBreaches,
        top3,
        bottom3,
        allBranches: branchScores,
      });
    } catch (error: unknown) {
      console.error("Error fetching HQ feedback summary:", error);
      res.status(500).json({ message: "HQ feedback özeti alınamadı" });
    }
  });

  router.post('/api/audit-instances/:id/cancel', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can cancel
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ iptal edebilir' });
      }
      
      const cancelled = await storage.cancelAuditInstance(parseInt(id));
      
      if (!cancelled) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      res.json(cancelled);
    } catch (error: unknown) {
      console.error("Error cancelling audit instance:", error);
      res.status(500).json({ message: "Denetim iptal edilirken hata oluştu" });
    }
  });


export default router;
