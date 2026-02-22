import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  isHQRole,
  isBranchRole,
  type UserRoleType,
  careerGates,
  gateAttempts,
  kpiSignalRules,
  contentPacks,
  contentPackItems,
  userPackProgress,
  careerLevels,
  userCareerProgress,
  trainingModules,
  trainingCompletions,
  quizzes,
  quizResults,
  users,
  employeeOnboardingAssignments,
  employeeOnboardingProgress,
  onboardingTemplateSteps,
  examRequests,
  insertCareerGateSchema,
  insertGateAttemptSchema,
  insertContentPackSchema,
  insertContentPackItemSchema,
} from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, not, ne, count } from "drizzle-orm";
import { z } from "zod";
import { handleApiError } from "./helpers";
import { ACADEMY_COACH_ROLES, ACADEMY_SUPERVISOR_ROLES } from "@shared/permissions";

const router = Router();

function requireAcademyCoach(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: "Giriş yapılmamış" });
  if (role === 'admin' || ACADEMY_COACH_ROLES.has(role)) return next();
  return res.status(403).json({ message: "Bu işlem için yönetici yetkisi gereklidir" });
}

function requireAcademyCoachOrSupervisor(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: "Giriş yapılmamış" });
  if (role === 'admin' || ACADEMY_COACH_ROLES.has(role) || ACADEMY_SUPERVISOR_ROLES.has(role)) return next();
  return res.status(403).json({ message: "Bu işlem için yetkiniz yoktur" });
}

// ========================================
// GATE SYSTEM ENDPOINTS
// ========================================

router.get('/api/academy/gates', isAuthenticated, async (req: any, res) => {
  try {
    const gates = await db.select({
      gate: careerGates,
      fromLevel: careerLevels,
    })
    .from(careerGates)
    .leftJoin(careerLevels, eq(careerGates.fromLevelId, careerLevels.id))
    .where(eq(careerGates.isActive, true))
    .orderBy(asc(careerGates.gateNumber));

    const result = gates.map(g => ({
      ...g.gate,
      fromLevelTitle: g.fromLevel?.titleTr,
      fromLevelRole: g.fromLevel?.roleId,
    }));

    res.json(result);
  } catch (error: any) {
    handleApiError(res, error, "Gate listesi alınamadı");
  }
});

router.get('/api/academy/gates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const gateId = parseInt(req.params.id);
    const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, gateId));
    if (!gate) return res.status(404).json({ message: "Gate bulunamadı" });
    res.json(gate);
  } catch (error: any) {
    handleApiError(res, error, "Gate detayı alınamadı");
  }
});

router.post('/api/academy/gates', isAuthenticated, requireAcademyCoach, async (req: any, res) => {
  try {
    const parsed = insertCareerGateSchema.parse(req.body);
    const [gate] = await db.insert(careerGates).values(parsed).returning();
    res.status(201).json(gate);
  } catch (error: any) {
    handleApiError(res, error, "Gate oluşturulamadı");
  }
});

router.patch('/api/academy/gates/:id', isAuthenticated, requireAcademyCoach, async (req: any, res) => {
  try {
    const gateId = parseInt(req.params.id);
    const [updated] = await db.update(careerGates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(careerGates.id, gateId))
      .returning();
    if (!updated) return res.status(404).json({ message: "Gate bulunamadı" });
    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, "Gate güncellenemedi");
  }
});

router.get('/api/academy/gates/:id/eligibility/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const gateId = parseInt(req.params.id);
    const targetUserId = req.params.userId;

    const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, gateId));
    if (!gate) return res.status(404).json({ message: "Gate bulunamadı" });

    const [progress] = await db.select().from(userCareerProgress)
      .where(eq(userCareerProgress.userId, targetUserId));

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!targetUser) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const checks = {
      minDaysInLevel: false,
      requiredModules: false,
      compositeScore: false,
      noActiveCooldown: false,
      maxRetriesNotExceeded: false,
    };

    if (targetUser.createdAt) {
      const daysSinceCreated = Math.floor((Date.now() - new Date(targetUser.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      checks.minDaysInLevel = daysSinceCreated >= (gate.minDaysInLevel || 0);
    }

    if (progress) {
      const [currentLevel] = await db.select().from(careerLevels)
        .where(eq(careerLevels.id, progress.currentCareerLevelId));
      const completedModules = progress.completedModuleIds || [];
      const requiredModules = currentLevel?.requiredModuleIds || [];
      checks.requiredModules = requiredModules.every((mId: number) => completedModules.includes(mId));
      checks.compositeScore = (progress.compositeScore || 0) >= 70;
    }

    const existingAttempts = await db.select().from(gateAttempts)
      .where(and(
        eq(gateAttempts.gateId, gateId),
        eq(gateAttempts.userId, targetUserId)
      ))
      .orderBy(desc(gateAttempts.createdAt));

    checks.maxRetriesNotExceeded = existingAttempts.length < (gate.maxRetries || 3);

    if (existingAttempts.length > 0) {
      const lastAttempt = existingAttempts[0];
      if (lastAttempt.nextRetryAt) {
        checks.noActiveCooldown = new Date() >= new Date(lastAttempt.nextRetryAt);
      } else {
        checks.noActiveCooldown = true;
      }
    } else {
      checks.noActiveCooldown = true;
    }

    const eligible = Object.values(checks).every(Boolean);

    res.json({
      eligible,
      checks,
      gate: { id: gate.id, gateNumber: gate.gateNumber, titleTr: gate.titleTr },
      attemptCount: existingAttempts.length,
      maxRetries: gate.maxRetries,
    });
  } catch (error: any) {
    handleApiError(res, error, "Yetkinlik kontrolü yapılamadı");
  }
});

router.post('/api/academy/gates/:id/attempt', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const gateId = parseInt(req.params.id);
    const targetUserId = req.body.userId || user.id;

    const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, gateId));
    if (!gate) return res.status(404).json({ message: "Gate bulunamadı" });

    const existingAttempts = await db.select().from(gateAttempts)
      .where(and(
        eq(gateAttempts.gateId, gateId),
        eq(gateAttempts.userId, targetUserId),
      ));

    const inProgressAttempt = existingAttempts.find(a => a.status === 'in_progress');
    if (inProgressAttempt) {
      return res.json(inProgressAttempt);
    }

    const attemptNumber = existingAttempts.length + 1;

    const [attempt] = await db.insert(gateAttempts).values({
      gateId,
      userId: targetUserId,
      attemptNumber,
      status: 'in_progress',
    }).returning();

    res.status(201).json(attempt);
  } catch (error: any) {
    handleApiError(res, error, "Gate denemesi başlatılamadı");
  }
});

const gateAttemptUpdateSchema = z.object({
  quizScore: z.number().min(0).max(100).optional(),
  practicalScore: z.number().min(0).max(100).optional(),
  practicalPassed: z.boolean().optional(),
  attendanceRate: z.number().min(0).max(100).optional(),
  attendancePassed: z.boolean().optional(),
  evaluatorId: z.string().optional(),
  evaluatorNotes: z.string().optional(),
}).strict();

router.patch('/api/academy/gate-attempts/:attemptId', isAuthenticated, async (req: any, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const parsed = gateAttemptUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }
    const updates = parsed.data;

    const [existing] = await db.select().from(gateAttempts)
      .where(eq(gateAttempts.id, attemptId));
    if (!existing) return res.status(404).json({ message: "Deneme bulunamadı" });

    const mergedData: any = { ...updates };

    if (updates.quizScore !== undefined) {
      const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, existing.gateId));
      mergedData.quizPassed = updates.quizScore >= (gate?.quizPassingScore || 80);
    }

    const [updated] = await db.update(gateAttempts)
      .set(mergedData)
      .where(eq(gateAttempts.id, attemptId))
      .returning();

    const allComponentsEvaluated =
      updated.quizPassed !== null &&
      updated.practicalPassed !== null &&
      updated.attendancePassed !== null;

    if (allComponentsEvaluated) {
      const overallPassed = updated.quizPassed && updated.practicalPassed && updated.attendancePassed;
      const overallScore = Math.round(
        ((updated.quizScore || 0) + (updated.practicalScore || 0) + (updated.attendanceRate || 0)) / 3
      );

      const finalUpdate: any = {
        overallPassed,
        overallScore,
        status: overallPassed ? 'passed' : 'failed',
        completedAt: new Date(),
      };

      if (!overallPassed) {
        const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, existing.gateId));
        const failedComponents = [];
        if (!updated.quizPassed) failedComponents.push('Quiz');
        if (!updated.practicalPassed) failedComponents.push('Pratik');
        if (!updated.attendancePassed) failedComponents.push('Devam');
        finalUpdate.failureReason = `Başarısız bileşenler: ${failedComponents.join(', ')}`;

        if (gate?.retryCooldownDays) {
          const nextRetry = new Date();
          nextRetry.setDate(nextRetry.getDate() + gate.retryCooldownDays);
          finalUpdate.nextRetryAt = nextRetry;
        }
      }

      const [finalResult] = await db.update(gateAttempts)
        .set(finalUpdate)
        .where(eq(gateAttempts.id, attemptId))
        .returning();

      if (finalResult.overallPassed && finalResult.userId) {
        const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, existing.gateId));
        if (gate?.toLevelId) {
          await db.update(userCareerProgress)
            .set({ currentCareerLevelId: gate.toLevelId, lastUpdatedAt: new Date() })
            .where(eq(userCareerProgress.userId, finalResult.userId));

          const [toLevel] = await db.select().from(careerLevels)
            .where(eq(careerLevels.id, gate.toLevelId));
          if (toLevel) {
            await db.update(users)
              .set({ role: toLevel.roleId })
              .where(eq(users.id, finalResult.userId));
          }
        }
      }

      return res.json(finalResult);
    }

    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, "Gate denemesi güncellenemedi");
  }
});

router.post('/api/academy/gates/:id/approve', isAuthenticated, requireAcademyCoach, async (req: any, res) => {
  try {
    const user = req.user!;
    const gateId = parseInt(req.params.id);
    const { attemptId, approvalType } = req.body;

    if (!isHQRole(user.role as any) && user.role !== 'supervisor' && user.role !== 'mudur') {
      return res.status(403).json({ message: "Onay yetkiniz yok" });
    }

    const updateField: any = {};
    if (approvalType === 'supervisor') updateField.supervisorApproved = true;
    else if (approvalType === 'coach') updateField.coachApproved = true;
    else if (approvalType === 'cgo') updateField.cgoApproved = true;

    const [updated] = await db.update(gateAttempts)
      .set(updateField)
      .where(eq(gateAttempts.id, attemptId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, "Gate onayı verilemedi");
  }
});

router.get('/api/academy/gate-attempts/user/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const targetUserId = req.params.userId;
    const attempts = await db.select({
      attempt: gateAttempts,
      gate: careerGates,
    })
    .from(gateAttempts)
    .leftJoin(careerGates, eq(gateAttempts.gateId, careerGates.id))
    .where(eq(gateAttempts.userId, targetUserId))
    .orderBy(desc(gateAttempts.createdAt));

    res.json(attempts.map(a => ({
      ...a.attempt,
      gateTitleTr: a.gate?.titleTr,
      gateNumber: a.gate?.gateNumber,
    })));
  } catch (error: any) {
    handleApiError(res, error, "Gate denemeleri alınamadı");
  }
});

// ========================================
// CONTENT PACK ENDPOINTS
// ========================================

router.get('/api/academy/packs', isAuthenticated, async (req: any, res) => {
  try {
    const { targetRole, packType } = req.query;
    let query = db.select().from(contentPacks).where(eq(contentPacks.isActive, true));

    const packs = await query.orderBy(desc(contentPacks.createdAt));

    const filtered = packs.filter(p => {
      if (targetRole && p.targetRole !== targetRole) return false;
      if (packType && p.packType !== packType) return false;
      return true;
    });

    res.json(filtered);
  } catch (error: any) {
    handleApiError(res, error, "Paket listesi alınamadı");
  }
});

router.get('/api/academy/packs/:id', isAuthenticated, async (req: any, res) => {
  try {
    const packId = parseInt(req.params.id);
    const [pack] = await db.select().from(contentPacks).where(eq(contentPacks.id, packId));
    if (!pack) return res.status(404).json({ message: "Paket bulunamadı" });

    const items = await db.select().from(contentPackItems)
      .where(eq(contentPackItems.packId, packId))
      .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    res.json({ ...pack, items });
  } catch (error: any) {
    handleApiError(res, error, "Paket detayı alınamadı");
  }
});

router.post('/api/academy/packs', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as any) && user.role !== 'admin' && user.role !== 'trainer') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { items, ...packData } = req.body;
    const parsed = insertContentPackSchema.parse({ ...packData, createdBy: user.id });
    const [pack] = await db.insert(contentPacks).values(parsed).returning();

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(contentPackItems).values({
          ...item,
          packId: pack.id,
        });
      }
    }

    const createdItems = await db.select().from(contentPackItems)
      .where(eq(contentPackItems.packId, pack.id))
      .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    res.status(201).json({ ...pack, items: createdItems });
  } catch (error: any) {
    handleApiError(res, error, "Paket oluşturulamadı");
  }
});

router.put('/api/academy/packs/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as any) && user.role !== 'admin' && user.role !== 'trainer') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const packId = parseInt(req.params.id);
    const { items, ...packData } = req.body;

    const [updated] = await db.update(contentPacks)
      .set({ ...packData, updatedAt: new Date() })
      .where(eq(contentPacks.id, packId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Paket bulunamadı" });

    if (items && Array.isArray(items)) {
      await db.delete(contentPackItems).where(eq(contentPackItems.packId, packId));
      for (const item of items) {
        await db.insert(contentPackItems).values({
          ...item,
          packId,
        });
      }
    }

    const updatedItems = await db.select().from(contentPackItems)
      .where(eq(contentPackItems.packId, packId))
      .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    res.json({ ...updated, items: updatedItems });
  } catch (error: any) {
    handleApiError(res, error, "Paket güncellenemedi");
  }
});

router.post('/api/academy/packs/:id/assign', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const packId = parseInt(req.params.id);
    const { userId: targetUserId } = req.body;

    if (!targetUserId) return res.status(400).json({ message: "userId zorunlu" });

    const [pack] = await db.select().from(contentPacks).where(eq(contentPacks.id, packId));
    if (!pack) return res.status(404).json({ message: "Paket bulunamadı" });

    const items = await db.select().from(contentPackItems)
      .where(eq(contentPackItems.packId, packId))
      .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    const progressRecords = items.map(item => ({
      userId: targetUserId,
      packId,
      packItemId: item.id,
      status: 'pending' as const,
    }));

    if (progressRecords.length > 0) {
      await db.insert(userPackProgress).values(progressRecords);
    }

    res.status(201).json({ message: "Paket atandı", itemCount: progressRecords.length });
  } catch (error: any) {
    handleApiError(res, error, "Paket atanamadı");
  }
});

router.get('/api/academy/packs/:id/progress/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const packId = parseInt(req.params.id);
    const targetUserId = req.params.userId;

    const progress = await db.select({
      progress: userPackProgress,
      item: contentPackItems,
    })
    .from(userPackProgress)
    .leftJoin(contentPackItems, eq(userPackProgress.packItemId, contentPackItems.id))
    .where(and(
      eq(userPackProgress.packId, packId),
      eq(userPackProgress.userId, targetUserId),
    ))
    .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    res.json(progress.map(p => ({
      ...p.progress,
      contentType: p.item?.contentType,
      dayNumber: p.item?.dayNumber,
      titleOverride: p.item?.titleOverride,
      estimatedMinutes: p.item?.estimatedMinutes,
      isRequired: p.item?.isRequired,
      requiresApproval: p.item?.requiresApproval,
    })));
  } catch (error: any) {
    handleApiError(res, error, "Paket ilerlemesi alınamadı");
  }
});

router.post('/api/academy/pack-progress/:progressId/complete', isAuthenticated, async (req: any, res) => {
  try {
    const progressId = parseInt(req.params.progressId);
    const { score } = req.body;

    const [updated] = await db.update(userPackProgress)
      .set({
        status: 'completed',
        completedAt: new Date(),
        score: score || null,
      })
      .where(eq(userPackProgress.id, progressId))
      .returning();

    if (!updated) return res.status(404).json({ message: "İlerleme kaydı bulunamadı" });
    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// MY PATH (NBA ENGINE) ENDPOINT
// ========================================

router.get('/api/academy/my-path', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const actions: any[] = [];

    const [progress] = await db.select().from(userCareerProgress)
      .where(eq(userCareerProgress.userId, userId));

    let currentLevel: any = null;
    if (progress) {
      [currentLevel] = await db.select().from(careerLevels)
        .where(eq(careerLevels.id, progress.currentCareerLevelId));
    }

    const onboardingAssignments = await db.select().from(employeeOnboardingAssignments)
      .where(and(
        eq(employeeOnboardingAssignments.userId, userId),
        eq(employeeOnboardingAssignments.status, 'in_progress')
      ));

    let onboardingInfo: any = null;

    if (onboardingAssignments.length > 0) {
      const assignment = onboardingAssignments[0];
      const startDate = assignment.startDate ? new Date(assignment.startDate) : new Date();
      const dayNumber = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      onboardingInfo = {
        assignmentId: assignment.id,
        dayNumber: Math.min(dayNumber, 14),
        totalDays: 14,
        overallProgress: assignment.overallProgress || 0,
        startDate: assignment.startDate,
        expectedEndDate: assignment.expectedEndDate,
      };

      const allProgress = await db.select({
        progress: employeeOnboardingProgress,
        step: onboardingTemplateSteps,
      })
      .from(employeeOnboardingProgress)
      .leftJoin(onboardingTemplateSteps, eq(employeeOnboardingProgress.stepId, onboardingTemplateSteps.id))
      .where(eq(employeeOnboardingProgress.assignmentId, assignment.id));

      const todaySteps = allProgress.filter(p => {
        const stepStartDay = p.step?.startDay || 1;
        const stepEndDay = p.step?.endDay || stepStartDay;
        return stepStartDay <= dayNumber && stepEndDay >= dayNumber;
      });

      todaySteps
        .filter(p => p.progress.status !== 'completed')
        .forEach(p => {
          actions.push({
            priority: 1,
            type: 'onboarding',
            contentId: p.step?.trainingModuleId,
            title: p.step?.title || 'Onboarding adımı',
            reason: `Onboarding Gün ${dayNumber} — zorunlu adım`,
            estimatedMinutes: 15,
            status: p.progress.status,
            progressId: p.progress.id,
          });
        });

      const overdueSteps = allProgress.filter(p => {
        const stepEndDay = p.step?.endDay || p.step?.startDay || 1;
        return stepEndDay < dayNumber && p.progress.status !== 'completed';
      });

      overdueSteps.forEach(p => {
        actions.push({
          priority: 2,
          type: 'onboarding_overdue',
          contentId: p.step?.trainingModuleId,
          title: p.step?.title || 'Gecikmiş onboarding adımı',
          reason: 'Dünden kalan — tamamla',
          estimatedMinutes: 15,
          status: p.progress.status,
          progressId: p.progress.id,
        });
      });
    }

    const userPacks = await db.select({
      progress: userPackProgress,
      item: contentPackItems,
    })
    .from(userPackProgress)
    .leftJoin(contentPackItems, eq(userPackProgress.packItemId, contentPackItems.id))
    .where(and(
      eq(userPackProgress.userId, userId),
      eq(userPackProgress.status, 'pending'),
    ))
    .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder))
    .limit(5);

    userPacks.forEach(p => {
      actions.push({
        priority: 4,
        type: p.item?.contentType || 'module',
        contentId: p.item?.trainingModuleId || p.item?.quizId,
        title: p.item?.titleOverride || 'Eğitim adımı',
        reason: 'İçerik paketi — zorunlu modül',
        estimatedMinutes: p.item?.estimatedMinutes || 15,
        status: 'pending',
        progressId: p.progress.id,
        packItemId: p.item?.id,
      });
    });

    if (progress && currentLevel) {
      const requiredModules = currentLevel.requiredModuleIds || [];
      const completedModules = progress.completedModuleIds || [];
      const incompleteModuleIds = requiredModules.filter((id: number) => !completedModules.includes(id));

      if (incompleteModuleIds.length > 0) {
        const modules = await db.select().from(trainingModules)
          .where(inArray(trainingModules.id, incompleteModuleIds.slice(0, 5)));

        modules.forEach(m => {
          actions.push({
            priority: 4,
            type: 'module',
            contentId: m.id,
            title: m.title,
            reason: `${currentLevel.titleTr} seviyesi — zorunlu modül`,
            estimatedMinutes: m.estimatedDuration || 30,
            status: 'pending',
          });
        });
      }
    }

    const activeGateAttempt = await db.select({
      attempt: gateAttempts,
      gate: careerGates,
    })
    .from(gateAttempts)
    .leftJoin(careerGates, eq(gateAttempts.gateId, careerGates.id))
    .where(and(
      eq(gateAttempts.userId, userId),
      eq(gateAttempts.status, 'in_progress'),
    ))
    .limit(1);

    let gateInfo: any = null;
    if (activeGateAttempt.length > 0) {
      const ga = activeGateAttempt[0];
      gateInfo = {
        attemptId: ga.attempt.id,
        gateNumber: ga.gate?.gateNumber,
        gateTitleTr: ga.gate?.titleTr,
        status: ga.attempt.status,
        quizPassed: ga.attempt.quizPassed,
        practicalPassed: ga.attempt.practicalPassed,
        attendancePassed: ga.attempt.attendancePassed,
      };

      actions.push({
        priority: 1,
        type: 'gate_exam',
        contentId: ga.gate?.id,
        title: ga.gate?.titleTr || 'Gate Sınavı',
        reason: 'Gate sınavınız aktif — tamamlayın',
        estimatedMinutes: 60,
        status: 'in_progress',
        attemptId: ga.attempt.id,
      });
    }

    let nextGate: any = null;
    if (currentLevel && !gateInfo) {
      const gates = await db.select().from(careerGates)
        .where(and(
          eq(careerGates.fromLevelId, currentLevel.id),
          eq(careerGates.isActive, true),
        ))
        .limit(1);

      if (gates.length > 0) {
        const gate = gates[0];
        const requiredModules = currentLevel.requiredModuleIds || [];
        const completedModules = progress?.completedModuleIds || [];
        const modulesCompleted = requiredModules.every((id: number) => completedModules.includes(id));

        nextGate = {
          gateId: gate.id,
          gateNumber: gate.gateNumber,
          titleTr: gate.titleTr,
          minDaysInLevel: gate.minDaysInLevel,
          requiredModulesTotal: requiredModules.length,
          requiredModulesCompleted: requiredModules.filter((id: number) => completedModules.includes(id)).length,
          compositeScoreRequired: 70,
          currentCompositeScore: progress?.compositeScore || 0,
          allModulesCompleted: modulesCompleted,
        };
      }
    }

    actions.sort((a, b) => a.priority - b.priority);

    res.json({
      userId,
      role: userRole,
      currentLevel: currentLevel ? {
        id: currentLevel.id,
        roleId: currentLevel.roleId,
        levelNumber: currentLevel.levelNumber,
        titleTr: currentLevel.titleTr,
      } : null,
      compositeScore: progress?.compositeScore || 0,
      trainingScore: progress?.trainingScore || 0,
      practicalScore: progress?.practicalScore || 0,
      attendanceScore: progress?.attendanceScore || 0,
      managerScore: progress?.managerScore || 0,
      onboarding: onboardingInfo,
      activeGate: gateInfo,
      nextGate,
      actions,
      completedModuleCount: (progress?.completedModuleIds || []).length,
    });
  } catch (error: any) {
    handleApiError(res, error, "My Path verisi alınamadı");
  }
});

router.get('/api/academy/my-path/progress', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user!.id;

    const [progress] = await db.select().from(userCareerProgress)
      .where(eq(userCareerProgress.userId, userId));

    if (!progress) {
      return res.json({
        currentLevel: null,
        compositeScore: 0,
        completedModules: 0,
        totalRequiredModules: 0,
        progressPercent: 0,
      });
    }

    const [currentLevel] = await db.select().from(careerLevels)
      .where(eq(careerLevels.id, progress.currentCareerLevelId));

    const completedModules = progress.completedModuleIds || [];
    const requiredModules = currentLevel?.requiredModuleIds || [];
    const progressPercent = requiredModules.length > 0
      ? Math.round((completedModules.filter((id: number) => requiredModules.includes(id)).length / requiredModules.length) * 100)
      : 0;

    res.json({
      currentLevel: currentLevel ? {
        id: currentLevel.id,
        roleId: currentLevel.roleId,
        levelNumber: currentLevel.levelNumber,
        titleTr: currentLevel.titleTr,
      } : null,
      compositeScore: progress.compositeScore || 0,
      trainingScore: progress.trainingScore || 0,
      practicalScore: progress.practicalScore || 0,
      attendanceScore: progress.attendanceScore || 0,
      managerScore: progress.managerScore || 0,
      completedModules: completedModules.length,
      totalRequiredModules: requiredModules.length,
      progressPercent,
    });
  } catch (error: any) {
    handleApiError(res, error, "İlerleme bilgisi alınamadı");
  }
});

router.post('/api/academy/my-path/complete-item', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const { progressId, type, score } = req.body;

    if (progressId) {
      const [updated] = await db.update(userPackProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          score: score || null,
        })
        .where(and(
          eq(userPackProgress.id, progressId),
          eq(userPackProgress.userId, userId),
        ))
        .returning();

      return res.json(updated || { message: "Kayıt bulunamadı" });
    }

    res.json({ message: "Adım tamamlandı" });
  } catch (error: any) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// TEAM PROGRESS (Coach/Trainer/Supervisor)
// ========================================

router.get('/api/academy/team-progress', isAuthenticated, requireAcademyCoachOrSupervisor, async (req: any, res) => {
  try {
    const user = req.user!;
    const branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : null;

    let teamQuery = db.select({
      user: users,
      progress: userCareerProgress,
      level: careerLevels,
    })
    .from(users)
    .leftJoin(userCareerProgress, eq(users.id, userCareerProgress.userId))
    .leftJoin(careerLevels, eq(userCareerProgress.currentCareerLevelId, careerLevels.id))
    .where(and(
      eq(users.isActive, true),
      inArray(users.role, ['stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor']),
    ));

    const teamResults = await teamQuery.orderBy(asc(careerLevels.levelNumber));

    const filteredResults = branchFilter
      ? teamResults.filter(r => r.user.branchId === branchFilter)
      : teamResults;

    const team = filteredResults.map(r => ({
      userId: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      role: r.user.role,
      branchId: r.user.branchId,
      levelNumber: r.level?.levelNumber || 1,
      levelTitleTr: r.level?.titleTr || 'Stajyer',
      compositeScore: r.progress?.compositeScore || 0,
      completedModules: (r.progress?.completedModuleIds || []).length,
      lastUpdated: r.progress?.lastUpdatedAt,
    }));

    res.json(team);
  } catch (error: any) {
    handleApiError(res, error, "Ekip ilerleme verisi alınamadı");
  }
});

// ========================================
// MY PATH - COMPLETE ITEM
// ========================================

const completeItemSchema = z.object({
  progressId: z.number(),
  type: z.enum(['module', 'quiz', 'practical', 'recipe']),
});

router.post('/api/academy/my-path/complete-item', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const parsed = completeItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }
    const { progressId, type } = parsed.data;

    const [progress] = await db.select().from(userPackProgress)
      .where(and(
        eq(userPackProgress.id, progressId),
        eq(userPackProgress.userId, user.id),
      ));

    if (!progress) {
      return res.status(404).json({ message: "İlerleme kaydı bulunamadı" });
    }

    if (progress.status === 'completed') {
      return res.status(400).json({ message: "Bu adım zaten tamamlanmış" });
    }

    const [updated] = await db.update(userPackProgress)
      .set({
        status: 'completed',
        completedAt: new Date(),
        progressPercent: 100,
      })
      .where(eq(userPackProgress.id, progressId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// KPI SIGNAL RULES (Admin/Coach)
// ========================================

router.get('/api/academy/kpi-signals', isAuthenticated, requireAcademyCoach, async (req: any, res) => {
  try {
    const signals = await db.select().from(kpiSignalRules)
      .where(eq(kpiSignalRules.isActive, true))
      .orderBy(asc(kpiSignalRules.signalKey));
    res.json(signals);
  } catch (error: any) {
    handleApiError(res, error, "KPI sinyalleri alınamadı");
  }
});

// ========================================
// CONTENT PACKS (Admin/Coach)
// ========================================

router.get('/api/academy/content-packs', isAuthenticated, requireAcademyCoach, async (req: any, res) => {
  try {
    const packs = await db.select({
      id: contentPacks.id,
      titleTr: contentPacks.name,
      titleEn: contentPacks.name,
      description: contentPacks.descriptionTr,
      category: contentPacks.packType,
      targetRoles: sql<string[]>`ARRAY[${contentPacks.targetRole}]`,
      isActive: contentPacks.isActive,
      createdAt: contentPacks.createdAt,
      itemCount: sql<number>`(SELECT COUNT(*) FROM content_pack_items WHERE pack_id = ${contentPacks.id})::int`,
    }).from(contentPacks)
      .orderBy(asc(contentPacks.packType), asc(contentPacks.name));
    res.json(packs);
  } catch (error: any) {
    handleApiError(res, error, "İçerik paketleri alınamadı");
  }
});

export default router;
