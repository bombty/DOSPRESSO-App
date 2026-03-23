import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { getEmployeeSummary, getBranchEmployeeSummaries } from "../services/employee-summary-service";
import { db } from "../db";
import { users, isHQRole } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
const BRANCH_MANAGER_ROLES = ['mudur', 'supervisor'];

router.get('/api/employee-summary/:userId', isAuthenticated, async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (!isHQRole(reqUser.role) && !BRANCH_MANAGER_ROLES.includes(reqUser.role)) {
      if (reqUser.id !== userId) {
        return res.status(403).json({ message: "Bu bilgilere erişim yetkiniz yok" });
      }
    }

    if (BRANCH_MANAGER_ROLES.includes(reqUser.role) && reqUser.id !== userId) {
      const [targetUser] = await db.select({ branchId: users.branchId })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser || targetUser.branchId !== reqUser.branchId) {
        return res.status(403).json({ message: "Sadece kendi şubenizin personelini görüntüleyebilirsiniz" });
      }
    }

    const summary = await getEmployeeSummary(userId, days);
    if (!summary) {
      return res.status(404).json({ message: "Personel bulunamadı" });
    }

    res.json(summary);
  } catch (error: unknown) {
    console.error("Error fetching employee summary:", error);
    res.status(500).json({ message: "Personel özeti alınırken hata oluştu" });
  }
});

router.get('/api/employee-summary/branch/:branchId', isAuthenticated, async (req, res) => {
  try {
    const reqUser = req.user as any;
    const branchId = parseInt(req.params.branchId);
    const days = parseInt(req.query.days as string) || 30;

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!isHQRole(reqUser.role)) {
      if (BRANCH_MANAGER_ROLES.includes(reqUser.role)) {
        if (reqUser.branchId !== branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin verilerini görüntüleyebilirsiniz" });
        }
      } else {
        return res.status(403).json({ message: "Bu bilgilere erişim yetkiniz yok" });
      }
    }

    const summaries = await getBranchEmployeeSummaries(branchId, days);
    res.json(summaries);
  } catch (error: unknown) {
    console.error("Error fetching branch employee summaries:", error);
    res.status(500).json({ message: "Şube personel özetleri alınırken hata oluştu" });
  }
});

router.get('/api/employee-summary/branch/:branchId/quick', isAuthenticated, async (req, res) => {
  try {
    const reqUser = req.user as any;
    const branchId = parseInt(req.params.branchId);
    const days = parseInt(req.query.days as string) || 30;

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!isHQRole(reqUser.role)) {
      if (BRANCH_MANAGER_ROLES.includes(reqUser.role)) {
        if (reqUser.branchId !== branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin verilerini görüntüleyebilirsiniz" });
        }
      } else {
        return res.status(403).json({ message: "Bu bilgilere erişim yetkiniz yok" });
      }
    }

    const summaries = await getBranchEmployeeSummaries(branchId, days);
    const quickSummaries = summaries.map(s => ({
      userId: s.userId,
      fullName: s.fullName,
      role: s.role,
      overallScore: s.overallScore,
      trainingRate: s.training.completionRate,
      taskRate: s.tasks.completionRate,
      attendanceRate: s.attendance.attendanceRate,
    }));

    res.json(quickSummaries);
  } catch (error: unknown) {
    console.error("Error fetching quick employee summaries:", error);
    res.status(500).json({ message: "Personel özetleri alınırken hata oluştu" });
  }
});

export default router;
