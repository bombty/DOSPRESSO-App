import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import { eq, and, or, gte, inArray, count, max } from "drizzle-orm";
import { updateEmployeeLocation, getActiveBranchEmployees, removeEmployeeLocation } from "../tracking";
import { z } from "zod";
import {
  insertManagerEvaluationSchema,
  users,
  managerEvaluations,
} from "@shared/schema";

const router = Router();

  // ========================================
  // LIVE TRACKING - Real-time Employee Tracking
  // ========================================
  
  router.post('/api/tracking/location', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { latitude, longitude, accuracy } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Konum bilgisi gereklidir" });
      }
      
      const branchId = user.branchId || 0;
      await updateEmployeeLocation(user.id, branchId, latitude, longitude, accuracy);
      
      res.json({ success: true, message: "Konum güncellendi" });
    } catch (error: unknown) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Konum güncellenirken hata oluştu" });
    }
  });

  router.get('/api/tracking/branch/:branchId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);
      
      // HQ roles can view any branch
      const hqRoles = ['admin', 'genel_mudur', 'coach'];
      const branchRoles = ['supervisor', 'manager'];
      
      // Check role-based access
      if (!hqRoles.includes(user.role) && !branchRoles.includes(user.role)) {
        return res.status(403).json({ message: "Erişim yetkisi yok" });
      }
      
      // Branch-scoped roles can only view their own branch
      if (branchRoles.includes(user.role)) {
        if (!user.branchId || user.branchId !== branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizi görüntüleyebilirsiniz" });
        }
      }
      
      const activeEmployees = getActiveBranchEmployees(branchId);
      
      // Get user details for each active employee
      const userIds = activeEmployees.map(emp => emp.userId);
      const userDetails = userIds.length > 0 
        ? await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            profileImageUrl: users.profileImageUrl,
          }).from(users).where(inArray(users.id, userIds))
        : [];
      
      const userMap = new Map(userDetails.map(u => [u.id, u]));
      
      // For branch-scoped roles, mask precise coordinates
      const shouldMaskCoords = branchRoles.includes(user.role);
      
      res.json(activeEmployees.map(emp => ({
        userId: emp.userId,
        branchId: emp.branchId,
        latitude: shouldMaskCoords ? undefined : emp.latitude,
        longitude: shouldMaskCoords ? undefined : emp.longitude,
        accuracy: shouldMaskCoords ? undefined : emp.accuracy,
        timestamp: emp.timestamp || new Date().toISOString(),
        lastUpdate: emp.lastUpdate,
        user: userMap.get(emp.userId) || null,
      })));
    } catch (error: unknown) {
      console.error("Error fetching branch tracking:", error);
      res.status(500).json({ message: "Takip bilgisi alınırken hata oluştu" });
    }
  });

  router.post('/api/tracking/checkout', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      removeEmployeeLocation(user.id);
      res.json({ success: true, message: "Çıkış yapıldı" });
    } catch (error: unknown) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Çıkış yapılırken hata oluştu" });
    }
  });

  // Background job: Daily overdue training reminders
  const startTrainingReminderJob = () => {
    // Check every 6 hours
    setInterval(async () => {
      try {
        const assignments = await storage.getTrainingAssignments();
        // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();

        for (const assignment of assignments) {
          if (assignment.status === 'assigned' || assignment.status === 'in_progress') {
            const dueDate = new Date(assignment.dueDate || '');
            
            // Check if overdue or due soon
            if (dueDate < today && assignment.status !== 'overdue') {
              await storage.updateTrainingAssignmentStatus(assignment.id, 'overdue');
              
              // Send notification
              if (assignment.userId) {
                try {
                  await storage.createNotification({
                    userId: assignment.userId,
                    type: 'training_overdue',
                    title: 'Geciken Eğitim',
                    message: `Bir eğitim atlaması son tarihini geçti`,
                    relatedId: assignment.id.toString(),
                  });
                } catch (error: unknown) {
                  console.error("Notification error:", e);
                }
              }
            } else if (dueDate.getTime() - today.getTime() < 86400000 && (assignment.remindersSent || 0) < 3) {
              // Due within 24 hours - send reminder
              if (assignment.userId) {
                try {
                  await storage.createNotification({
                    userId: assignment.userId,
                    type: 'training_reminder',
                    title: 'Yaklaşan Eğitim',
                    message: `Bir eğitim ataması 24 saat içinde bitecek`,
                    relatedId: assignment.id.toString(),
                  });
                  // Reminder sent via notification
                } catch (error: unknown) {
                  console.error("Reminder error:", e);
                }
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error("Training reminder job error:", error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  };

  // Start the reminder job
  startTrainingReminderJob();

  // ========================================
  // CAREER PROGRESSION - Kariyer İlerleme
  // ========================================
  
  // ========== COMPOSITE CAREER SCORE ENDPOINTS ==========
  
  // GET /api/career/composite-score/:userId - Kompozit kariyer skoru hesapla
  router.get("/api/career/composite-score/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const scores = await storage.calculateCompositeCareerScore(userId);
      res.json(scores);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchCompositeScore");
    }
  });

  // POST /api/career/update-scores/:userId - Kariyer skorlarını güncelle
  router.post("/api/career/update-scores/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const scores = await storage.calculateCompositeCareerScore(userId);
      const updated = await storage.updateUserCareerScores(userId, scores);
      res.json(updated);
    } catch (error: unknown) {
      handleApiError(res, error, "UpdateCareerScores");
    }
  });

  // POST /api/career/check-danger-zone/:userId - Tehlike bölgesi kontrolü
  router.post("/api/career/check-danger-zone/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.checkAndProcessDangerZone(userId);
      res.json(result);
    } catch (error: unknown) {
      handleApiError(res, error, "CheckDangerZone");
    }
  });

  // ========== MANAGER EVALUATION ENDPOINTS ==========

  // GET /api/manager-evaluations - Yönetici değerlendirmelerini listele
  router.get("/api/manager-evaluations", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, branchId, month } = req.query;
      const filters: any = {};
      if (employeeId) filters.employeeId = employeeId;
      if (branchId) filters.branchId = Number(branchId);
      if (month) filters.month = month;
      const user = req.user;
      if (user.role === "supervisor" && user.branchId) {
        filters.branchId = user.branchId;
      }
      const evaluations = await storage.getManagerEvaluations(filters);
      res.json(evaluations);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchManagerEvaluations");
    }
  });

  // POST /api/manager-evaluations - Yeni değerlendirme oluştur
  router.post("/api/manager-evaluations", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertManagerEvaluationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }
      // Suistimal korumasi: 24 saat kurali
      const twentyFourHoursAgo24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentMgrEval] = await db.select({ cnt: count() })
        .from(managerEvaluations)
        .where(and(
          eq(managerEvaluations.evaluatorId, req.user.id),
          eq(managerEvaluations.employeeId, parsed.data.employeeId),
          gte(managerEvaluations.createdAt, twentyFourHoursAgo24)
        ));
      if (recentMgrEval && recentMgrEval.cnt > 0) {
        return res.status(429).json({ message: "Bu personeli son 24 saat içinde zaten değerlendirdiniz. Lütfen yarın tekrar deneyin." });
      }

      // Suistimal korumasi: Ayda max 2 degerlendirme
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [monthlyMgrCount] = await db.select({ cnt: count() })
        .from(managerEvaluations)
        .where(and(
          eq(managerEvaluations.evaluatorId, req.user.id),
          eq(managerEvaluations.employeeId, parsed.data.employeeId),
          eq(managerEvaluations.evaluationMonth, currentMonth)
        ));
      if (monthlyMgrCount && monthlyMgrCount.cnt >= 2) {
        return res.status(429).json({ message: "Bu personel için bu ay maksimum 2 değerlendirme yapabilirsiniz." });
      }

      const data = {
        ...parsed.data,
        evaluatorId: req.user.id,
        branchId: req.body.branchId || req.user.branchId
      };
      const evaluation = await storage.createManagerEvaluation(data);
      const scores = await storage.calculateCompositeCareerScore(data.employeeId);
      await storage.updateUserCareerScores(data.employeeId, scores);
      res.json(evaluation);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateManagerEvaluation");
    }
  });

  // GET /api/career/score-history/:userId - Skor geçmişi
  router.get("/api/career/score-history/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit) || 12;
      const history = await storage.getCareerScoreHistory(userId, limit);
      res.json(history);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchScoreHistory");
    }
  });

export default router;
