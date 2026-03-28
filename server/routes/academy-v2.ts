import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
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
  aiAgentLogs,
  insertAiAgentLogSchema,
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
  onboardingTemplates,
  examRequests,
  insertCareerGateSchema,
  insertGateAttemptSchema,
  insertContentPackSchema,
  insertContentPackItemSchema,
  insertOnboardingTemplateSchema,
  insertOnboardingTemplateStepSchema,
  insertEmployeeOnboardingAssignmentSchema,
  branches,
  checklistCompletions,
  notifications,
} from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, not, ne, count } from "drizzle-orm";
import { z } from "zod";
import { handleApiError } from "./helpers";
import { redactPII } from "../services/pii-redactor";
import { ACADEMY_COACH_ROLES, ACADEMY_SUPERVISOR_ROLES, getAcademyViewMode } from "@shared/permissions";

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

router.get('/api/academy/gates', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Gate listesi alınamadı");
  }
});

router.get('/api/academy/gates/:id', isAuthenticated, async (req, res) => {
  try {
    const gateId = parseInt(req.params.id);
    const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, gateId));
    if (!gate) return res.status(404).json({ message: "Gate bulunamadı" });
    res.json(gate);
  } catch (error: unknown) {
    handleApiError(res, error, "Gate detayı alınamadı");
  }
});

router.post('/api/academy/gates', isAuthenticated, requireManifestAccess('akademi', 'create'), requireAcademyCoach, async (req, res) => {
  try {
    const parsed = insertCareerGateSchema.parse(req.body);
    const [gate] = await db.insert(careerGates).values(parsed).returning();
    res.status(201).json(gate);
  } catch (error: unknown) {
    handleApiError(res, error, "Gate oluşturulamadı");
  }
});

router.patch('/api/academy/gates/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const gateId = parseInt(req.params.id);
    const [updated] = await db.update(careerGates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(careerGates.id, gateId))
      .returning();
    if (!updated) return res.status(404).json({ message: "Gate bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Gate güncellenemedi");
  }
});

router.get('/api/academy/gates/:id/eligibility/:userId', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Yetkinlik kontrolü yapılamadı");
  }
});

router.post('/api/academy/gates/:id/attempt', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const gateId = parseInt(req.params.id);
    const PRIVILEGED_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'supervisor', 'mudur', 'trainer'];
    const targetUserId = (req.body.userId && PRIVILEGED_ROLES.includes(user.role)) ? req.body.userId : user.id;

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

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
    const targetName = targetUser ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() : targetUserId;

    const supervisors = await db.select().from(users)
      .where(and(
        or(
          eq(users.role, 'supervisor'),
          eq(users.role, 'mudur'),
          eq(users.role, 'coach'),
          eq(users.role, 'cgo'),
          eq(users.role, 'admin')
        ),
        eq(users.accountStatus, 'active')
      ));

    for (const sup of supervisors) {
      if (sup.branchId === targetUser?.branchId || ['coach', 'cgo', 'admin'].includes(sup.role)) {
        await storage.createNotification({
          userId: sup.id,
          type: 'gate_request',
          title: 'Yeni Statu Atlama Talebi',
          message: `${targetName} - ${gate.titleTr} icin statu atlama talebinde bulundu.`,
          link: '/akademi-supervisor',
          branchId: targetUser?.branchId || null,
        });
      }
    }

    res.status(201).json(attempt);
  } catch (error: unknown) {
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

router.patch('/api/academy/gate-attempts/:attemptId', isAuthenticated, async (req, res) => {
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

          try {
            const levelName = toLevel?.titleTr || gate.titleTr || 'Yeni Seviye';
            await storage.createNotification({
              userId: finalResult.userId,
              type: 'certificate_earned',
              title: 'Sertifika Kazanildi!',
              message: `'${levelName}' sertifikasini kazandiniz! Sertifikanizi profilinizden indirebilirsiniz.`,
              link: '/akademi/sertifikalarim',
            });
          } catch (e) {
            console.error("Certificate notification error:", e);
          }
        }
      }

      if (finalResult.userId) {
        const [gate] = await db.select().from(careerGates).where(eq(careerGates.id, existing.gateId));
        const gateName = gate?.titleTr || 'Gate';
        const [targetUser] = await db.select().from(users).where(eq(users.id, finalResult.userId));
        const targetName = targetUser ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() : '';

        if (finalResult.overallPassed) {
          await storage.createNotification({
            userId: finalResult.userId,
            type: 'gate_passed',
            title: 'Statu Atlama Basarili!',
            message: `${gateName} sinavini basariyla gectiniz. Yeni seviyenize terfi edildiniz!`,
            link: '/akademi/yolum',
          });

          const supervisors = await db.select().from(users)
            .where(and(
              or(
                eq(users.role, 'supervisor'),
                eq(users.role, 'mudur'),
                eq(users.role, 'coach'),
                eq(users.role, 'cgo'),
                eq(users.role, 'admin')
              ),
              eq(users.accountStatus, 'active')
            ));
          for (const sup of supervisors) {
            if (sup.branchId === targetUser?.branchId || ['coach', 'cgo', 'admin'].includes(sup.role)) {
              await storage.createNotification({
                userId: sup.id,
                type: 'gate_passed',
                title: 'Statu Atlama Basarili',
                message: `${targetName} ${gateName} sinavini basariyla gecti.`,
                link: '/akademi-supervisor',
                branchId: targetUser?.branchId || null,
              });
            }
          }
        } else {
          await storage.createNotification({
            userId: finalResult.userId,
            type: 'gate_failed',
            title: 'Statu Atlama Sonucu',
            message: `${gateName} sinavinda basarisiz oldunuz. ${finalResult.failureReason || ''}`,
            link: '/akademi/yolum',
          });

          if (targetUser?.branchId) {
            const branchSups = await db.select().from(users)
              .where(and(
                or(eq(users.role, 'supervisor'), eq(users.role, 'mudur')),
                eq(users.branchId, targetUser.branchId),
                eq(users.accountStatus, 'active')
              ));
            for (const sup of branchSups) {
              await storage.createNotification({
                userId: sup.id,
                type: 'gate_failed',
                title: 'Statu Atlama Basarisiz',
                message: `${targetName} ${gateName} sinavinda basarisiz oldu. ${finalResult.failureReason || ''}`,
                link: '/akademi-supervisor',
                branchId: targetUser.branchId,
              });
            }
          }
        }
      }

      return res.json(finalResult);
    }

    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Gate denemesi güncellenemedi");
  }
});

router.post('/api/academy/gates/:id/approve', isAuthenticated, requireManifestAccess('akademi', 'approve'), requireAcademyCoach, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Gate onayı verilemedi");
  }
});

router.get('/api/academy/gate-attempts/user/:userId', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Gate denemeleri alınamadı");
  }
});

router.get('/api/academy/gate-attempts/pending', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const user = req.user!;
    const attempts = await db.select({
      attempt: gateAttempts,
      gate: careerGates,
      userName: users.firstName,
      userLastName: users.lastName,
      userRole: users.role,
      userBranchId: users.branchId,
    })
    .from(gateAttempts)
    .leftJoin(careerGates, eq(gateAttempts.gateId, careerGates.id))
    .leftJoin(users, eq(gateAttempts.userId, users.id))
    .where(eq(gateAttempts.status, 'in_progress'))
    .orderBy(asc(gateAttempts.createdAt));

    let filtered = attempts;
    if (ACADEMY_SUPERVISOR_ROLES.has(user.role) && !ACADEMY_COACH_ROLES.has(user.role)) {
      filtered = attempts.filter(a => a.userBranchId === user.branchId);
    }

    res.json(filtered.map(a => ({
      ...a.attempt,
      gateTitleTr: a.gate?.titleTr,
      gateNumber: a.gate?.gateNumber,
      quizPassingScore: a.gate?.quizPassingScore,
      userName: `${a.userName || ''} ${a.userLastName || ''}`.trim(),
      userRole: a.userRole,
      userBranchId: a.userBranchId,
    })));
  } catch (error: unknown) {
    handleApiError(res, error, "Bekleyen gate talepleri alınamadı");
  }
});

// ========================================
// CONTENT PACK ENDPOINTS
// ========================================

router.get('/api/academy/packs', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Paket listesi alınamadı");
  }
});

router.get('/api/academy/packs/:id', isAuthenticated, async (req, res) => {
  try {
    const packId = parseInt(req.params.id);
    const [pack] = await db.select().from(contentPacks).where(eq(contentPacks.id, packId));
    if (!pack) return res.status(404).json({ message: "Paket bulunamadı" });

    const items = await db.select().from(contentPackItems)
      .where(eq(contentPackItems.packId, packId))
      .orderBy(asc(contentPackItems.dayNumber), asc(contentPackItems.sortOrder));

    res.json({ ...pack, items });
  } catch (error: unknown) {
    handleApiError(res, error, "Paket detayı alınamadı");
  }
});

router.post('/api/academy/packs', isAuthenticated, requireManifestAccess('akademi', 'create'), async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Paket oluşturulamadı");
  }
});

router.put('/api/academy/packs/:id', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Paket güncellenemedi");
  }
});

router.post('/api/academy/packs/:id/assign', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Paket atanamadı");
  }
});

router.get('/api/academy/packs/:id/progress/:userId', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Paket ilerlemesi alınamadı");
  }
});

router.post('/api/academy/pack-progress/:progressId/complete', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// MY PATH (NBA ENGINE) ENDPOINT
// ========================================

router.get('/api/academy/my-path', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const actions: any[] = [];

    let [progress] = await db.select().from(userCareerProgress)
      .where(eq(userCareerProgress.userId, userId));

    if (!progress) {
      const [stajyerLevel] = await db.select().from(careerLevels)
        .where(eq(careerLevels.levelNumber, 1))
        .limit(1);

      if (stajyerLevel) {
        const [newProgress] = await db.insert(userCareerProgress)
          .values({
            userId,
            currentCareerLevelId: stajyerLevel.id,
            completedModuleIds: [],
            averageQuizScore: 0,
            totalQuizzesAttempted: 0,
            trainingScore: 0,
            practicalScore: 0,
            attendanceScore: 0,
            managerScore: 0,
            compositeScore: 0,
            dangerZoneMonths: 0,
          })
          .onConflictDoNothing()
          .returning();
        if (newProgress) {
          progress = newProgress;
        } else {
          [progress] = await db.select().from(userCareerProgress)
            .where(eq(userCareerProgress.userId, userId));
        }
      }
    }

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
  } catch (error: unknown) {
    handleApiError(res, error, "My Path verisi alınamadı");
  }
});

router.get('/api/academy/my-path/progress', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "İlerleme bilgisi alınamadı");
  }
});

router.post('/api/academy/my-path/complete-item', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// TEAM PROGRESS (Coach/Trainer/Supervisor)
// ========================================

router.get('/api/academy/team-progress', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
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

    const userIds = filteredResults.map(r => r.user.id);

    const [latestGateAttempts, checklistStats, mentorOnboardings] = await Promise.all([
      userIds.length > 0
        ? db.select({
            userId: gateAttempts.userId,
            gateId: gateAttempts.gateId,
            gateNumber: careerGates.gateNumber,
            gateTitleTr: careerGates.titleTr,
            status: gateAttempts.status,
            overallPassed: gateAttempts.overallPassed,
          })
          .from(gateAttempts)
          .innerJoin(careerGates, eq(gateAttempts.gateId, careerGates.id))
          .where(inArray(gateAttempts.userId, userIds))
          .orderBy(desc(gateAttempts.createdAt))
        : [],

      userIds.length > 0
        ? db.select({
            userId: checklistCompletions.userId,
            total: sql<number>`count(*)`.as('total'),
            completed: sql<number>`count(*) filter (where ${checklistCompletions.status} = 'completed')`.as('completed'),
          })
          .from(checklistCompletions)
          .where(and(
            inArray(checklistCompletions.userId, userIds),
            gte(checklistCompletions.scheduledDate, sql`(current_date - interval '7 days')::date`),
          ))
          .groupBy(checklistCompletions.userId)
        : [],

      user.role === 'coach' || user.role === 'admin' || user.role === 'trainer'
        ? db.select({
            id: employeeOnboardingAssignments.id,
            userId: employeeOnboardingAssignments.userId,
            status: employeeOnboardingAssignments.status,
            overallProgress: employeeOnboardingAssignments.overallProgress,
            startDate: employeeOnboardingAssignments.startDate,
          })
          .from(employeeOnboardingAssignments)
          .where(and(
            eq(employeeOnboardingAssignments.mentorId, user.id),
            inArray(employeeOnboardingAssignments.status, ['active', 'in_progress']),
          ))
        : [],
    ]);

    const gateByUser = new Map<string, { gateNumber: number; gateTitleTr: string; status: string; passed: boolean }>();
    for (const ga of latestGateAttempts) {
      if (!gateByUser.has(ga.userId)) {
        gateByUser.set(ga.userId, {
          gateNumber: ga.gateNumber,
          gateTitleTr: ga.gateTitleTr,
          status: ga.status || 'in_progress',
          passed: ga.overallPassed,
        });
      }
    }

    const checklistByUser = new Map<string, { total: number; completed: number; rate: number }>();
    for (const cs of checklistStats) {
      const rate = cs.total > 0 ? Math.round((cs.completed / cs.total) * 100) : 0;
      checklistByUser.set(cs.userId, { total: cs.total, completed: cs.completed, rate });
    }

    const mentorOnboardingByUser = new Map<string, typeof mentorOnboardings[0]>();
    for (const mo of mentorOnboardings) {
      mentorOnboardingByUser.set(mo.userId, mo);
    }

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
      currentGate: gateByUser.get(r.user.id) || null,
      checklistRate: checklistByUser.get(r.user.id) || { total: 0, completed: 0, rate: 0 },
      mentorOnboarding: mentorOnboardingByUser.get(r.user.id) || null,
    }));

    res.json({ team, mentorOnboardings });
  } catch (error: unknown) {
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

router.post('/api/academy/my-path/complete-item', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// KPI SIGNAL RULES (Admin/Coach)
// ========================================

router.get('/api/academy/kpi-signals', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const signals = await db.select().from(kpiSignalRules)
      .where(eq(kpiSignalRules.isActive, true))
      .orderBy(asc(kpiSignalRules.signalKey));
    res.json(signals);
  } catch (error: unknown) {
    handleApiError(res, error, "KPI sinyalleri alınamadı");
  }
});

// ========================================
// CONTENT PACKS (Admin/Coach)
// ========================================

router.get('/api/academy/content-packs', isAuthenticated, requireAcademyCoach, async (req, res) => {
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
  } catch (error: unknown) {
    handleApiError(res, error, "İçerik paketleri alınamadı");
  }
});

// ========================================
// ONBOARDING STUDIO - Templates (Coach)
// ========================================

router.get('/api/academy/onboarding/templates', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const templates = await db.select({
      id: onboardingTemplates.id,
      name: onboardingTemplates.name,
      description: onboardingTemplates.description,
      targetRole: onboardingTemplates.targetRole,
      scope: onboardingTemplates.scope,
      durationDays: onboardingTemplates.durationDays,
      isActive: onboardingTemplates.isActive,
      createdById: onboardingTemplates.createdById,
      createdAt: onboardingTemplates.createdAt,
      updatedAt: onboardingTemplates.updatedAt,
      stepCount: sql<number>`(SELECT COUNT(*) FROM onboarding_template_steps WHERE template_id = ${onboardingTemplates.id})::int`,
      assignmentCount: sql<number>`(SELECT COUNT(*) FROM employee_onboarding_assignments WHERE template_id = ${onboardingTemplates.id})::int`,
    }).from(onboardingTemplates)
      .orderBy(desc(onboardingTemplates.updatedAt));
    res.json(templates);
  } catch (error: unknown) {
    handleApiError(res, error, "Onboarding şablonları alınamadı");
  }
});

router.get('/api/academy/onboarding/templates/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const [template] = await db.select().from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId));
    if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });

    const steps = await db.select().from(onboardingTemplateSteps)
      .where(and(eq(onboardingTemplateSteps.templateId, templateId), eq(onboardingTemplateSteps.isDeleted, false)))
      .orderBy(asc(onboardingTemplateSteps.startDay), asc(onboardingTemplateSteps.stepOrder));

    res.json({ ...template, steps });
  } catch (error: unknown) {
    handleApiError(res, error, "Şablon detayı alınamadı");
  }
});

router.post('/api/academy/onboarding/templates', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const parsed = insertOnboardingTemplateSchema.parse({
      ...req.body,
      createdById: req.user!.id,
    });
    const [template] = await db.insert(onboardingTemplates).values(parsed).returning();
    res.status(201).json(template);
  } catch (error: unknown) {
    handleApiError(res, error, "Şablon oluşturulamadı");
  }
});

router.patch('/api/academy/onboarding/templates/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const [updated] = await db.update(onboardingTemplates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(onboardingTemplates.id, templateId))
      .returning();
    if (!updated) return res.status(404).json({ message: "Şablon bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Şablon güncellenemedi");
  }
});

router.delete('/api/academy/onboarding/templates/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const activeAssignments = await db.select({ count: count() }).from(employeeOnboardingAssignments)
      .where(and(
        eq(employeeOnboardingAssignments.templateId, templateId),
        eq(employeeOnboardingAssignments.status, 'in_progress')
      ));
    if (activeAssignments[0]?.count > 0) {
      return res.status(400).json({ message: "Aktif atamaları olan şablon silinemez" });
    }
    await db.update(onboardingTemplates).set({ deletedAt: new Date() }).where(eq(onboardingTemplates.id, templateId));
    const { createAuditEntry, getAuditContext } = await import("../audit");
    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.soft_delete",
      action: "soft_delete",
      resource: "onboarding_templates",
      resourceId: String(templateId),
      details: { softDelete: true },
    });
    res.json({ success: true });
  } catch (error: unknown) {
    handleApiError(res, error, "Şablon silinemedi");
  }
});

// ========================================
// ONBOARDING STUDIO - Steps (Coach)
// ========================================

router.post('/api/academy/onboarding/templates/:id/steps', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const parsed = insertOnboardingTemplateStepSchema.parse({
      ...req.body,
      templateId,
    });
    const [step] = await db.insert(onboardingTemplateSteps).values(parsed).returning();
    await db.update(onboardingTemplates).set({ updatedAt: new Date() }).where(eq(onboardingTemplates.id, templateId));
    res.status(201).json(step);
  } catch (error: unknown) {
    handleApiError(res, error, "Adım oluşturulamadı");
  }
});

router.patch('/api/academy/onboarding/steps/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const stepId = parseInt(req.params.id);
    const [updated] = await db.update(onboardingTemplateSteps)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(onboardingTemplateSteps.id, stepId))
      .returning();
    if (!updated) return res.status(404).json({ message: "Adım bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Adım güncellenemedi");
  }
});

router.delete('/api/academy/onboarding/steps/:id', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const stepId = parseInt(req.params.id);
    await db.update(onboardingTemplateSteps).set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() }).where(eq(onboardingTemplateSteps.id, stepId));
    res.json({ success: true });
  } catch (error: unknown) {
    handleApiError(res, error, "Adım silinemedi");
  }
});

router.post('/api/academy/onboarding/templates/:id/steps/reorder', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const { stepOrders } = req.body;
    if (!Array.isArray(stepOrders)) return res.status(400).json({ message: "stepOrders dizisi gerekli" });
    for (const item of stepOrders) {
      await db.update(onboardingTemplateSteps)
        .set({ stepOrder: item.order, updatedAt: new Date() })
        .where(eq(onboardingTemplateSteps.id, item.id));
    }
    res.json({ success: true });
  } catch (error: unknown) {
    handleApiError(res, error, "Sıralama güncellenemedi");
  }
});

// ========================================
// ONBOARDING ASSIGNMENTS (Coach)
// ========================================

router.get('/api/academy/onboarding/assignments', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const user = req.user!;
    let query = db.select({
      assignment: employeeOnboardingAssignments,
      userName: users.firstName,
      userLastName: users.lastName,
      userRole: users.role,
      templateName: onboardingTemplates.name,
      templateDuration: onboardingTemplates.durationDays,
    })
    .from(employeeOnboardingAssignments)
    .leftJoin(users, eq(employeeOnboardingAssignments.userId, users.id))
    .leftJoin(onboardingTemplates, eq(employeeOnboardingAssignments.templateId, onboardingTemplates.id))
    .orderBy(desc(employeeOnboardingAssignments.createdAt));

    const results = await query;

    const mapped = results.map(r => ({
      ...r.assignment,
      userName: `${r.userName || ''} ${r.userLastName || ''}`.trim(),
      userRole: r.userRole,
      templateName: r.templateName,
      templateDuration: r.templateDuration,
    }));

    if (ACADEMY_SUPERVISOR_ROLES.has(user.role)) {
      const filtered = mapped.filter(a => a.branchId === user.branchId);
      return res.json(filtered);
    }
    res.json(mapped);
  } catch (error: unknown) {
    handleApiError(res, error, "Atamalar alınamadı");
  }
});

router.post('/api/academy/onboarding/assignments', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const { userId, branchId, templateId, mentorId, startDate } = req.body;
    if (!userId || !branchId || !templateId) {
      return res.status(400).json({ message: "userId, branchId ve templateId zorunludur" });
    }

    const [template] = await db.select().from(onboardingTemplates)
      .where(eq(onboardingTemplates.id, templateId));
    if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });

    const existingActive = await db.select().from(employeeOnboardingAssignments)
      .where(and(
        eq(employeeOnboardingAssignments.userId, userId),
        eq(employeeOnboardingAssignments.status, 'in_progress')
      ));
    if (existingActive.length > 0) {
      return res.status(400).json({ message: "Bu personelin zaten aktif bir onboarding ataması var" });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expectedEnd = new Date(start);
    expectedEnd.setDate(expectedEnd.getDate() + template.durationDays);

    const [assignment] = await db.insert(employeeOnboardingAssignments).values({
      userId,
      branchId,
      templateId,
      mentorId: mentorId || null,
      startDate: start,
      expectedEndDate: expectedEnd,
      status: 'in_progress',
      overallProgress: 0,
    }).returning();

    const steps = await db.select().from(onboardingTemplateSteps)
      .where(and(eq(onboardingTemplateSteps.templateId, templateId), eq(onboardingTemplateSteps.isDeleted, false)))
      .orderBy(asc(onboardingTemplateSteps.startDay), asc(onboardingTemplateSteps.stepOrder));

    if (steps.length > 0) {
      const progressRows = steps.map(step => ({
        assignmentId: assignment.id,
        stepId: step.id,
        mentorId: mentorId || null,
        status: 'pending' as const,
        approvalStatus: (step.approverType !== 'auto' ? 'pending' : 'not_required') as string,
      }));
      await db.insert(employeeOnboardingProgress).values(progressRows);
    }

    res.status(201).json(assignment);
  } catch (error: unknown) {
    handleApiError(res, error, "Atama oluşturulamadı");
  }
});

router.patch('/api/academy/onboarding/assignments/:id', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const [updated] = await db.update(employeeOnboardingAssignments)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(employeeOnboardingAssignments.id, assignmentId))
      .returning();
    if (!updated) return res.status(404).json({ message: "Atama bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Atama güncellenemedi");
  }
});

// ========================================
// EMPLOYEE ONBOARDING (Self)
// ========================================

router.get('/api/academy/onboarding/my-assignment', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [assignment] = await db.select({
      assignment: employeeOnboardingAssignments,
      templateName: onboardingTemplates.name,
      templateDuration: onboardingTemplates.durationDays,
    })
    .from(employeeOnboardingAssignments)
    .leftJoin(onboardingTemplates, eq(employeeOnboardingAssignments.templateId, onboardingTemplates.id))
    .where(and(
      eq(employeeOnboardingAssignments.userId, userId),
      eq(employeeOnboardingAssignments.status, 'in_progress')
    ))
    .orderBy(desc(employeeOnboardingAssignments.createdAt))
    .limit(1);

    if (!assignment) return res.json(null);

    const progress = await db.select({
      progress: employeeOnboardingProgress,
      step: onboardingTemplateSteps,
    })
    .from(employeeOnboardingProgress)
    .leftJoin(onboardingTemplateSteps, eq(employeeOnboardingProgress.stepId, onboardingTemplateSteps.id))
    .where(eq(employeeOnboardingProgress.assignmentId, assignment.assignment.id))
    .orderBy(asc(onboardingTemplateSteps.startDay), asc(onboardingTemplateSteps.stepOrder));

    const startDate = assignment.assignment.startDate ? new Date(assignment.assignment.startDate) : new Date();
    const dayNumber = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const totalSteps = progress.length;
    const completedSteps = progress.filter(p => p.progress.status === 'completed').length;
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const stepsByDay: Record<number, any[]> = {};
    for (const p of progress) {
      const day = p.step?.startDay || 1;
      if (!stepsByDay[day]) stepsByDay[day] = [];
      stepsByDay[day].push({
        progressId: p.progress.id,
        stepId: p.step?.id,
        title: p.step?.title,
        description: p.step?.description,
        contentType: p.step?.contentType || 'module',
        estimatedMinutes: p.step?.estimatedMinutes || 15,
        approverType: p.step?.approverType || 'auto',
        requiredCompletion: p.step?.requiredCompletion ?? true,
        status: p.progress.status,
        approvalStatus: p.progress.approvalStatus || 'not_required',
        completedAt: p.progress.completedAt,
        mentorNotes: p.progress.mentorNotes,
        rating: p.progress.rating,
        startDay: p.step?.startDay || 1,
        endDay: p.step?.endDay || 1,
      });
    }

    res.json({
      id: assignment.assignment.id,
      templateName: assignment.templateName,
      templateDuration: assignment.templateDuration || 14,
      startDate: assignment.assignment.startDate,
      expectedEndDate: assignment.assignment.expectedEndDate,
      dayNumber: Math.min(dayNumber, assignment.templateDuration || 14),
      totalDays: assignment.templateDuration || 14,
      overallProgress,
      totalSteps,
      completedSteps,
      mentorId: assignment.assignment.mentorId,
      stepsByDay,
    });
  } catch (error: unknown) {
    handleApiError(res, error, "Onboarding bilgisi alınamadı");
  }
});

router.post('/api/academy/onboarding/progress/:id/complete', isAuthenticated, async (req, res) => {
  try {
    const progressId = parseInt(req.params.id);
    const [prog] = await db.select({
      progress: employeeOnboardingProgress,
      step: onboardingTemplateSteps,
    })
    .from(employeeOnboardingProgress)
    .leftJoin(onboardingTemplateSteps, eq(employeeOnboardingProgress.stepId, onboardingTemplateSteps.id))
    .where(eq(employeeOnboardingProgress.id, progressId));

    if (!prog) return res.status(404).json({ message: "İlerleme kaydı bulunamadı" });

    const [assignment] = await db.select().from(employeeOnboardingAssignments)
      .where(eq(employeeOnboardingAssignments.id, prog.progress.assignmentId));
    if (!assignment || assignment.userId !== req.user!.id) {
      return res.status(403).json({ message: "Bu adım size ait değil" });
    }

    const approverType = prog.step?.approverType || 'auto';
    if (approverType !== 'auto') {
      const [updated] = await db.update(employeeOnboardingProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          approvalStatus: 'waiting_approval',
          updatedAt: new Date(),
        })
        .where(eq(employeeOnboardingProgress.id, progressId))
        .returning();
      return res.json(updated);
    }

    const [updated] = await db.update(employeeOnboardingProgress)
      .set({
        status: 'completed',
        completedAt: new Date(),
        approvalStatus: 'not_required',
        updatedAt: new Date(),
      })
      .where(eq(employeeOnboardingProgress.id, progressId))
      .returning();

    const allProgress = await db.select().from(employeeOnboardingProgress)
      .where(eq(employeeOnboardingProgress.assignmentId, assignment.id));
    const totalSteps = allProgress.length;
    const completedSteps = allProgress.filter(p => p.status === 'completed').length + (prog.progress.status !== 'completed' ? 1 : 0);
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    await db.update(employeeOnboardingAssignments)
      .set({ overallProgress, updatedAt: new Date() })
      .where(eq(employeeOnboardingAssignments.id, assignment.id));

    if (overallProgress >= 100) {
      await db.update(employeeOnboardingAssignments)
        .set({ status: 'completed', actualEndDate: new Date(), updatedAt: new Date() })
        .where(eq(employeeOnboardingAssignments.id, assignment.id));
    }

    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Adım tamamlanamadı");
  }
});

// ========================================
// SUPERVISOR ONBOARDING APPROVAL
// ========================================

router.get('/api/academy/onboarding/team-progress', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const user = req.user!;
    const branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : null;

    let assignmentsQuery = db.select({
      assignment: employeeOnboardingAssignments,
      userName: users.firstName,
      userLastName: users.lastName,
      userRole: users.role,
      templateName: onboardingTemplates.name,
      templateDuration: onboardingTemplates.durationDays,
    })
    .from(employeeOnboardingAssignments)
    .leftJoin(users, eq(employeeOnboardingAssignments.userId, users.id))
    .leftJoin(onboardingTemplates, eq(employeeOnboardingAssignments.templateId, onboardingTemplates.id))
    .orderBy(desc(employeeOnboardingAssignments.createdAt));

    let results = await assignmentsQuery;

    if (ACADEMY_SUPERVISOR_ROLES.has(user.role) && user.branchId) {
      results = results.filter(r => r.assignment.branchId === user.branchId);
    } else if (branchFilter) {
      results = results.filter(r => r.assignment.branchId === branchFilter);
    }

    const enrichedResults = await Promise.all(results.map(async (r) => {
      const progress = await db.select({
        id: employeeOnboardingProgress.id,
        status: employeeOnboardingProgress.status,
        approvalStatus: employeeOnboardingProgress.approvalStatus,
      })
      .from(employeeOnboardingProgress)
      .where(eq(employeeOnboardingProgress.assignmentId, r.assignment.id));

      const totalSteps = progress.length;
      const completedSteps = progress.filter(p => p.status === 'completed').length;
      const pendingApprovals = progress.filter(p => p.approvalStatus === 'waiting_approval').length;

      const startDate = r.assignment.startDate ? new Date(r.assignment.startDate) : new Date();
      const dayNumber = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: r.assignment.id,
        userId: r.assignment.userId,
        userName: `${r.userName || ''} ${r.userLastName || ''}`.trim(),
        userRole: r.userRole,
        templateName: r.templateName,
        branchId: r.assignment.branchId,
        status: r.assignment.status,
        startDate: r.assignment.startDate,
        expectedEndDate: r.assignment.expectedEndDate,
        dayNumber: Math.min(dayNumber, r.templateDuration || 14),
        totalDays: r.templateDuration || 14,
        overallProgress: r.assignment.overallProgress,
        totalSteps,
        completedSteps,
        pendingApprovals,
      };
    }));

    res.json(enrichedResults);
  } catch (error: unknown) {
    handleApiError(res, error, "Ekip onboarding ilerlemesi alınamadı");
  }
});

router.get('/api/academy/onboarding/pending-approvals', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const user = req.user!;

    const pendingItems = await db.select({
      progress: employeeOnboardingProgress,
      step: onboardingTemplateSteps,
      assignment: employeeOnboardingAssignments,
      userName: users.firstName,
      userLastName: users.lastName,
    })
    .from(employeeOnboardingProgress)
    .leftJoin(onboardingTemplateSteps, eq(employeeOnboardingProgress.stepId, onboardingTemplateSteps.id))
    .leftJoin(employeeOnboardingAssignments, eq(employeeOnboardingProgress.assignmentId, employeeOnboardingAssignments.id))
    .leftJoin(users, eq(employeeOnboardingAssignments.userId, users.id))
    .where(eq(employeeOnboardingProgress.approvalStatus, 'waiting_approval'))
    .orderBy(desc(employeeOnboardingProgress.completedAt));

    let filtered = pendingItems;
    if (ACADEMY_SUPERVISOR_ROLES.has(user.role) && user.branchId) {
      filtered = pendingItems.filter(p => p.assignment?.branchId === user.branchId);
    }

    const mapped = filtered.map(p => ({
      progressId: p.progress.id,
      assignmentId: p.progress.assignmentId,
      stepTitle: p.step?.title || '',
      contentType: p.step?.contentType || 'practical',
      userName: `${p.userName || ''} ${p.userLastName || ''}`.trim(),
      userId: p.assignment?.userId,
      branchId: p.assignment?.branchId,
      completedAt: p.progress.completedAt,
    }));

    res.json(mapped);
  } catch (error: unknown) {
    handleApiError(res, error, "Onay bekleyen adımlar alınamadı");
  }
});

router.post('/api/academy/onboarding/progress/:id/approve', isAuthenticated, requireAcademyCoachOrSupervisor, async (req, res) => {
  try {
    const progressId = parseInt(req.params.id);
    const { approved, notes, rating } = req.body;

    const updateData: any = {
      approvedById: req.user!.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (approved) {
      updateData.approvalStatus = 'approved';
      updateData.status = 'completed';
    } else {
      updateData.approvalStatus = 'rejected';
      updateData.status = 'pending';
      updateData.completedAt = null;
    }
    if (notes) updateData.mentorNotes = notes;
    if (rating) updateData.rating = rating;

    const [updated] = await db.update(employeeOnboardingProgress)
      .set(updateData)
      .where(eq(employeeOnboardingProgress.id, progressId))
      .returning();

    if (!updated) return res.status(404).json({ message: "İlerleme kaydı bulunamadı" });

    const allProgress = await db.select().from(employeeOnboardingProgress)
      .where(eq(employeeOnboardingProgress.assignmentId, updated.assignmentId));
    const totalSteps = allProgress.length;
    const completedSteps = allProgress.filter(p => p.status === 'completed').length;
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    await db.update(employeeOnboardingAssignments)
      .set({ overallProgress, updatedAt: new Date() })
      .where(eq(employeeOnboardingAssignments.id, updated.assignmentId));

    if (overallProgress >= 100) {
      await db.update(employeeOnboardingAssignments)
        .set({ status: 'completed', actualEndDate: new Date(), updatedAt: new Date() })
        .where(eq(employeeOnboardingAssignments.id, updated.assignmentId));
    }

    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Onay işlemi başarısız");
  }
});

// ========================================
// HELPER: Available branches + users for assignment
// ========================================

router.get('/api/academy/onboarding/available-users', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;
    const role = req.query.role as string | undefined;

    let conditions: any[] = [eq(users.isActive, true)];
    if (branchId) conditions.push(eq(users.branchId, branchId));
    if (role) conditions.push(eq(users.role, role));

    const availableUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchId: users.branchId,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.firstName));

    res.json(availableUsers);
  } catch (error: unknown) {
    handleApiError(res, error, "Kullanıcılar alınamadı");
  }
});

// ========================================
// AI AGENT PANEL ENDPOINTS
// ========================================

router.get('/api/academy/ai-panel', isAuthenticated, async (req, res) => {
  try {
    const startTime = Date.now();
    const userId = req.user.id;
    const role = req.user.role;
    const viewMode = getAcademyViewMode(role);

    if (viewMode === 'employee') {
      const progress = await db.select().from(userCareerProgress).where(eq(userCareerProgress.userId, userId)).limit(1);
      const cp = progress[0];

      const onboardingAssign = await db.select().from(employeeOnboardingAssignments)
        .where(and(eq(employeeOnboardingAssignments.userId, userId), eq(employeeOnboardingAssignments.status, 'active')))
        .limit(1);

      const activeAttempt = await db.select().from(gateAttempts)
        .where(and(eq(gateAttempts.userId, userId), eq(gateAttempts.status, 'in_progress')))
        .limit(1);

      const kpiRules = await db.select().from(kpiSignalRules)
        .where(and(eq(kpiSignalRules.isActive, true), sql`${role} = ANY(${kpiSignalRules.targetRoles})`))
        .limit(5);

      const actions: any[] = [];

      if (cp) {
        const scores = [
          { key: 'training', value: Number(cp.trainingScore) || 0, label: 'Eğitim Skoru' },
          { key: 'practical', value: Number(cp.practicalScore) || 0, label: 'Pratik Skoru' },
          { key: 'attendance', value: Number(cp.attendanceScore) || 0, label: 'Devam Skoru' },
          { key: 'manager', value: Number(cp.managerScore) || 0, label: 'Yönetici Skoru' },
        ];
        const lowest = scores.reduce((a, b) => a.value < b.value ? a : b);
        if (lowest.value < 60) {
          actions.push({
            type: 'score_improvement',
            title: `${lowest.label} Geliştirme`,
            reason: `${lowest.label} (${Math.round(lowest.value)}) ortalamanın altında. Bu alanı geliştirmeniz kompozit skorunuzu artıracaktır.`,
            signal: 'score_low',
            severity: lowest.value < 30 ? 'high' : 'medium',
            estimatedMinutes: 20,
          });
        }
      }

      if (onboardingAssign[0]) {
        const assign = onboardingAssign[0];
        const startDate = new Date(assign.startDate);
        const now = new Date();
        const currentDay = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const overdueSteps = await db.select().from(employeeOnboardingProgress)
          .where(and(
            eq(employeeOnboardingProgress.assignmentId, assign.id),
            eq(employeeOnboardingProgress.status, 'not_started'),
            lte(employeeOnboardingProgress.dayNumber, currentDay)
          ));

        if (overdueSteps.length > 0) {
          actions.push({
            type: 'onboarding_task',
            title: `${overdueSteps.length} Onboarding Adımı Bekliyor`,
            reason: `Bugün veya önceki günlere ait ${overdueSteps.length} tamamlanmamış onboarding adımınız var.`,
            signal: 'onboarding_due',
            severity: overdueSteps.length > 2 ? 'high' : 'medium',
            estimatedMinutes: overdueSteps.length * 10,
          });
        }
      }

      if (activeAttempt[0]) {
        actions.push({
          type: 'gate_exam',
          title: 'Gate Sınavı Aktif',
          reason: 'Aktif bir gate sınavınız bulunmakta. Quiz ve pratik bölümlerini tamamlayarak bir üst seviyeye geçebilirsiniz.',
          signal: 'gate_close',
          severity: 'medium',
          estimatedMinutes: 30,
        });
      } else if (cp) {
        const nextGate = await db.select().from(careerGates)
          .where(and(eq(careerGates.fromLevelId, cp.currentLevelId || 0), eq(careerGates.isActive, true)))
          .limit(1);
        if (nextGate[0] && (Number(cp.compositeScore) || 0) >= (nextGate[0].compositeScoreRequired || 0) * 0.8) {
          actions.push({
            type: 'gate_proximity',
            title: 'Gate Sınavına Yakınsınız',
            reason: `Kompozit skorunuz gate gereksiniminin %80'ine ulaştı. Eksik modüllerinizi tamamlayarak sınava girebilirsiniz.`,
            signal: 'gate_close',
            severity: 'low',
            estimatedMinutes: 15,
          });
        }
      }

      for (const rule of kpiRules) {
        if (actions.length >= 3) break;
        actions.push({
          type: 'kpi_signal',
          title: rule.titleTr || 'KPI Sinyali',
          reason: rule.descriptionTr || 'Bu KPI sinyali rolünüz için tanımlanmıştır.',
          signal: 'kpi_warning',
          severity: rule.severity === 'critical' ? 'high' : rule.severity === 'warning' ? 'medium' : 'low',
          estimatedMinutes: 10,
        });
      }

      const topActions = actions.slice(0, 3);
      const executionTimeMs = Date.now() - startTime;

      await db.insert(aiAgentLogs).values({
        runType: 'employee_nba',
        triggeredByUserId: userId,
        targetRoleScope: 'employee',
        targetUserId: userId,
        branchId: req.user.branchId || null,
        inputSummary: redactPII(JSON.stringify({ userId, role })),
        outputSummary: redactPII(JSON.stringify(topActions)),
        actionCount: topActions.length,
        status: 'success',
        executionTimeMs,
      });

      return res.json({
        viewMode: 'employee',
        actions: topActions,
        analyzedAt: new Date().toISOString(),
      });
    }

    if (viewMode === 'supervisor') {
      const branchId = req.user.branchId;
      let teamConditions: any[] = [eq(users.isActive, true)];
      if (branchId) teamConditions.push(eq(users.branchId, branchId));

      const teamMembers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }).from(users).where(and(...teamConditions));

      const riskSignals: any[] = [];
      let totalScore = 0;
      let scoreCount = 0;

      for (const member of teamMembers) {
        const cp = await db.select().from(userCareerProgress).where(eq(userCareerProgress.userId, member.id)).limit(1);
        const memberProgress = cp[0];

        if (!memberProgress) continue;

        const compositeScore = Number(memberProgress.compositeScore) || 0;
        const trainingScore = Number(memberProgress.trainingScore) || 0;
        totalScore += compositeScore;
        scoreCount++;

        if (compositeScore < 50) {
          riskSignals.push({
            userId: member.id,
            name: `${member.firstName} ${member.lastName}`,
            role: member.role,
            riskType: 'low_composite',
            currentScore: Math.round(compositeScore),
            threshold: 50,
            suggestedAction: 'Genel performansı düşük. Birebir görüşme ve eğitim planı önerilir.',
          });
        } else if (trainingScore < 40) {
          riskSignals.push({
            userId: member.id,
            name: `${member.firstName} ${member.lastName}`,
            role: member.role,
            riskType: 'low_training',
            currentScore: Math.round(trainingScore),
            threshold: 40,
            suggestedAction: 'Eğitim skoru kritik seviyede. Modül tamamlama takibi yapılmalı.',
          });
        }

        const onboarding = await db.select().from(employeeOnboardingAssignments)
          .where(and(eq(employeeOnboardingAssignments.userId, member.id), eq(employeeOnboardingAssignments.status, 'active')))
          .limit(1);
        if (onboarding[0]) {
          const startDate = new Date(onboarding[0].startDate);
          const now = new Date();
          const expectedEnd = onboarding[0].expectedEndDate ? new Date(onboarding[0].expectedEndDate) : null;
          if (expectedEnd && now > expectedEnd) {
            riskSignals.push({
              userId: member.id,
              name: `${member.firstName} ${member.lastName}`,
              role: member.role,
              riskType: 'onboarding_overdue',
              currentScore: 0,
              threshold: 0,
              suggestedAction: 'Onboarding süresi dolmuş. Durumu kontrol edin ve gerekirse süreyi uzatın.',
            });
          }
        }
      }

      const executionTimeMs = Date.now() - startTime;

      await db.insert(aiAgentLogs).values({
        runType: 'supervisor_risk',
        triggeredByUserId: userId,
        targetRoleScope: 'supervisor',
        branchId: branchId || null,
        inputSummary: redactPII(JSON.stringify({ branchId, teamSize: teamMembers.length })),
        outputSummary: redactPII(JSON.stringify({ riskCount: riskSignals.length })),
        actionCount: riskSignals.length,
        status: 'success',
        executionTimeMs,
      });

      return res.json({
        viewMode: 'supervisor',
        riskSignals,
        teamStats: {
          totalMembers: teamMembers.length,
          atRiskCount: riskSignals.length,
          avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        },
        analyzedAt: new Date().toISOString(),
      });
    }

    if (viewMode === 'coach') {
      const recentLogs = await db.select().from(aiAgentLogs)
        .orderBy(desc(aiAgentLogs.createdAt))
        .limit(20);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalResult] = await db.select({ count: count() }).from(aiAgentLogs);
      const [todayResult] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(gte(aiAgentLogs.createdAt, todayStart));

      const [avgResult] = await db.select({ avg: sql<number>`COALESCE(AVG(action_count), 0)` }).from(aiAgentLogs);

      const [employeeCount] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(eq(aiAgentLogs.targetRoleScope, 'employee'));
      const [supervisorCount] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(eq(aiAgentLogs.targetRoleScope, 'supervisor'));
      const [coachCount] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(eq(aiAgentLogs.targetRoleScope, 'coach'));
      const [errorCount] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(eq(aiAgentLogs.status, 'error'));

      const executionTimeMs = Date.now() - startTime;

      await db.insert(aiAgentLogs).values({
        runType: 'coach_summary',
        triggeredByUserId: userId,
        targetRoleScope: 'coach',
        inputSummary: redactPII(JSON.stringify({ requestedBy: userId })),
        outputSummary: redactPII(JSON.stringify({ totalRuns: totalResult.count })),
        actionCount: 0,
        status: 'success',
        executionTimeMs,
      });

      return res.json({
        viewMode: 'coach',
        recentLogs,
        systemStats: {
          totalRuns: totalResult.count,
          todayRuns: todayResult.count,
          avgActionsGenerated: Math.round(Number(avgResult.avg) || 0),
          lastRunAt: recentLogs[0]?.createdAt || null,
          errorCount: errorCount.count,
          executionTimeMs,
        },
        triggerSummary: {
          employeeRuns: employeeCount.count,
          supervisorRuns: supervisorCount.count,
          coachRuns: coachCount.count,
        },
      });
    }

    res.status(400).json({ message: 'Invalid view mode' });
  } catch (error: unknown) {
    handleApiError(res, error, "AI panel verisi alınamadı");
  }
});

router.get('/api/academy/ai-logs', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const runType = req.query.runType as string | undefined;
    const targetRoleScope = req.query.targetRoleScope as string | undefined;

    let conditions: any[] = [];
    if (runType) conditions.push(eq(aiAgentLogs.runType, runType));
    if (targetRoleScope) conditions.push(eq(aiAgentLogs.targetRoleScope, targetRoleScope));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db.select().from(aiAgentLogs)
      .where(whereClause)
      .orderBy(desc(aiAgentLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(aiAgentLogs).where(whereClause);

    res.json({
      data: logs,
      pagination: {
        total: totalResult.count,
        limit,
        offset,
        hasMore: offset + limit < Number(totalResult.count),
      },
    });
  } catch (error: unknown) {
    handleApiError(res, error, "AI logları alınamadı");
  }
});

router.post('/api/academy/ai-logs', isAuthenticated, requireAcademyCoach, async (req, res) => {
  try {
    const parsed = insertAiAgentLogSchema.parse(req.body);
    if (parsed.inputSummary) parsed.inputSummary = redactPII(parsed.inputSummary);
    if (parsed.outputSummary) parsed.outputSummary = redactPII(parsed.outputSummary);
    const [inserted] = await db.insert(aiAgentLogs).values(parsed).returning();
    res.status(201).json(inserted);
  } catch (error: unknown) {
    handleApiError(res, error, "AI log kaydı oluşturulamadı");
  }
});

const AI_LOG_RETENTION_DAYS = 30;

async function cleanupOldAiLogs(dryRun: boolean = false): Promise<{ deletedCount: number; cutoffDate: Date }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - AI_LOG_RETENTION_DAYS);
  
  if (dryRun) {
    const [result] = await db.select({ count: count() }).from(aiAgentLogs)
      .where(lte(aiAgentLogs.createdAt, cutoffDate));
    return { deletedCount: Number(result.count), cutoffDate };
  }
  
  const deleted = await db.delete(aiAgentLogs)
    .where(lte(aiAgentLogs.createdAt, cutoffDate))
    .returning({ id: aiAgentLogs.id });
  
  return { deletedCount: deleted.length, cutoffDate };
}

router.post('/api/admin/ai/logs/cleanup', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için admin yetkisi gereklidir" });
    }
    
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
    const result = await cleanupOldAiLogs(dryRun);
    
    if (!dryRun) {
    }
    
    res.json({
      dryRun,
      deletedCount: result.deletedCount,
      cutoffDate: result.cutoffDate.toISOString(),
      retentionDays: AI_LOG_RETENTION_DAYS,
    });
  } catch (error: unknown) {
    handleApiError(res, error, "AI log temizliği yapılamadı");
  }
});

function startAiLogCleanupJob() {
  const checkAndCleanup = async () => {
    const now = new Date();
    const istanbulHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).getHours();
    const istanbulMinute = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).getMinutes();
    
    if (istanbulHour === 3 && istanbulMinute >= 25 && istanbulMinute <= 35) {
      try {
        const result = await cleanupOldAiLogs(false);
      } catch (error) {
        console.error('[AI Log Cleanup] Scheduled cleanup error:', error);
      }
    }
  };
  
  setInterval(checkAndCleanup, 10 * 60 * 1000);
  console.log('🧹 AI log cleanup job started (daily at 03:30 Europe/Istanbul)');
}

startAiLogCleanupJob();

export default router;
