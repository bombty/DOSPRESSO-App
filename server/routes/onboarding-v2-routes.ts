import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
import { eq, desc, asc, and } from "drizzle-orm";
import {
  users,
  onboardingPrograms,
  onboardingWeeks,
  onboardingInstances,
  onboardingCheckins,
  insertOnboardingProgramSchema,
  insertOnboardingWeekSchema,
  insertOnboardingInstanceSchema,
  insertOnboardingCheckinSchema,
} from "@shared/schema";

const router = Router();

  // ========================================
  // ONBOARDING V2: Programs + Instances + Checkins
  // ========================================

  router.get('/api/onboarding-programs', isAuthenticated, async (req, res) => {
    try {
      const programs = await db.select().from(onboardingPrograms).orderBy(desc(onboardingPrograms.createdAt));
      res.json(programs);
    } catch (error: unknown) {
      res.status(500).json({ message: "Programlar yüklenemedi" });
    }
  });

  router.get('/api/onboarding-programs/:id', isAuthenticated, async (req, res) => {
    try {
      const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, parseInt(req.params.id)));
      if (!program) return res.status(404).json({ message: "Program bulunamadı" });
      const weeks = await db.select().from(onboardingWeeks)
        .where(eq(onboardingWeeks.programId, program.id))
        .orderBy(asc(onboardingWeeks.weekNumber));
      res.json({ ...program, weeks });
    } catch (error: unknown) {
      res.status(500).json({ message: "Program detayı yüklenemedi" });
    }
  });

  router.post('/api/onboarding-programs', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingProgramSchema.parse({ ...req.body, createdBy: req.user.id });
      const [program] = await db.insert(onboardingPrograms).values(body).returning();
      res.status(201).json(program);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Program oluşturulamadı" });
    }
  });

  router.put('/api/onboarding-programs/:id', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [program] = await db.update(onboardingPrograms)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(onboardingPrograms.id, parseInt(req.params.id)))
        .returning();
      if (!program) return res.status(404).json({ message: "Program bulunamadı" });
      res.json(program);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Güncelleme başarısız" });
    }
  });

  router.post('/api/onboarding-programs/:id/weeks', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingWeekSchema.parse({
        ...req.body,
        programId: parseInt(req.params.id),
      });
      const [week] = await db.insert(onboardingWeeks).values(body).returning();
      res.status(201).json(week);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Hafta oluşturulamadı" });
    }
  });

  router.get('/api/onboarding-instances', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      let conditions: any[] = [];
      if (['stajyer', 'bar_buddy', 'barista', 'fabrika_personel', 'fabrika_operator'].includes(user.role)) {
        conditions.push(eq(onboardingInstances.traineeId, user.id));
      } else if (['supervisor', 'supervisor_buddy', 'mudur'].includes(user.role)) {
        conditions.push(eq(onboardingInstances.mentorId, user.id));
      }
      const instances = conditions.length > 0
        ? await db.select().from(onboardingInstances).where(and(...conditions)).orderBy(desc(onboardingInstances.createdAt))
        : await db.select().from(onboardingInstances).orderBy(desc(onboardingInstances.createdAt));
      
      const enriched = await Promise.all(instances.map(async (inst) => {
        const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, inst.programId));
        const [trainee] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, inst.traineeId));
        const checkins = await db.select().from(onboardingCheckins).where(eq(onboardingCheckins.instanceId, inst.id));
        return { ...inst, program, trainee, checkinsCount: checkins.length };
      }));
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Onboarding instances error:", error);
      res.status(500).json({ message: "Onboarding listesi yüklenemedi" });
    }
  });

  router.post('/api/onboarding-instances', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingInstanceSchema.parse(req.body);
      const [instance] = await db.insert(onboardingInstances).values(body).returning();
      res.status(201).json(instance);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Atama oluşturulamadı" });
    }
  });

  router.get('/api/onboarding-instances/:id', isAuthenticated, async (req, res) => {
    try {
      const [instance] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, parseInt(req.params.id)));
      if (!instance) return res.status(404).json({ message: "Onboarding bulunamadı" });
      const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, instance.programId));
      const weeks = await db.select().from(onboardingWeeks)
        .where(eq(onboardingWeeks.programId, instance.programId))
        .orderBy(asc(onboardingWeeks.weekNumber));
      const checkins = await db.select().from(onboardingCheckins)
        .where(eq(onboardingCheckins.instanceId, instance.id))
        .orderBy(asc(onboardingCheckins.weekNumber));
      const [trainee] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role }).from(users).where(eq(users.id, instance.traineeId));
      let mentor = null;
      if (instance.mentorId) {
        const [m] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, instance.mentorId));
        mentor = m || null;
      }
      res.json({ ...instance, program, weeks, checkins, trainee, mentor });
    } catch (error: unknown) {
      res.status(500).json({ message: "Onboarding detayı yüklenemedi" });
    }
  });

  router.post('/api/onboarding-instances/:id/checkins', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'supervisor', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingCheckinSchema.parse({
        ...req.body,
        instanceId: parseInt(req.params.id),
        mentorId: req.user.id,
      });
      const [checkin] = await db.insert(onboardingCheckins).values(body).returning();
      res.status(201).json(checkin);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Check-in oluşturulamadı" });
    }
  });

  router.patch('/api/onboarding-instances/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [instance] = await db.update(onboardingInstances)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(onboardingInstances.id, parseInt(req.params.id)))
        .returning();
      if (!instance) return res.status(404).json({ message: "Onboarding bulunamadı" });
      res.json(instance);
    } catch (error: unknown) {
      res.status(500).json({ message: "Tamamlama başarısız" });
    }
  });


export default router;
