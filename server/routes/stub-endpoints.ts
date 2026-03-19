import { Router, Request, Response } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { payrollRecords, payrollParameters, users, branches, leaveRequests, changeRequests } from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

const router = Router();

const HQ_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'kalite_kontrol', 'gida_muhendisi', 'muhasebe_ik', 'satinalma', 'marketing', 'fabrika_mudur'];

router.get("/api/payroll/parameters", isAuthenticated, async (req: any, res: Response) => {
  try {
    const params = await db.select().from(payrollParameters).orderBy(desc(payrollParameters.year));
    res.json(params);
  } catch (error) {
    console.error("[payroll/parameters] Error:", error);
    res.json([]);
  }
});

router.get("/api/payroll/records", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { year, month } = req.query;

    const conditions: any[] = [];
    if (year) conditions.push(eq(payrollRecords.periodYear, Number(year)));
    if (month) conditions.push(eq(payrollRecords.periodMonth, Number(month)));

    if (!HQ_ROLES.includes(user.role) && user.branchId) {
      conditions.push(eq(payrollRecords.branchId, user.branchId));
    }

    const records = await db
      .select({
        id: payrollRecords.id,
        userId: payrollRecords.userId,
        branchId: payrollRecords.branchId,
        periodYear: payrollRecords.periodYear,
        periodMonth: payrollRecords.periodMonth,
        baseSalary: payrollRecords.baseSalary,
        grossSalary: payrollRecords.grossSalary,
        totalNetPayable: payrollRecords.totalNetPayable,
        status: payrollRecords.status,
        createdAt: payrollRecords.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(payrollRecords)
      .innerJoin(users, eq(payrollRecords.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payrollRecords.createdAt))
      .limit(200);

    res.json(records.map(r => ({
      ...r,
      userName: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Bilinmiyor",
    })));
  } catch (error) {
    console.error("[payroll/records] Error:", error);
    res.json([]);
  }
});

router.post("/api/payroll/calculate-employee", isAuthenticated, async (req: any, res: Response) => {
  try {
    res.json({ success: true, message: "Hesaplama henüz aktif değil" });
  } catch {
    res.json({ success: false });
  }
});

router.post("/api/payroll/records", isAuthenticated, async (req: any, res: Response) => {
  try {
    res.json({ success: true, message: "Kayıt henüz aktif değil" });
  } catch {
    res.json({ success: false });
  }
});

router.patch("/api/payroll/records/:recordId/approve", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.recordId);
    const [updated] = await db.update(payrollRecords)
      .set({ status: "approved", approvedById: req.user.id, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollRecords.id, id))
      .returning();
    res.json(updated || { success: false });
  } catch (error) {
    console.error("[payroll/approve] Error:", error);
    res.status(500).json({ error: "Onay işlemi başarısız" });
  }
});

router.patch("/api/payroll/records/:recordId/pay", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.recordId);
    const [updated] = await db.update(payrollRecords)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollRecords.id, id))
      .returning();
    res.json(updated || { success: false });
  } catch (error) {
    console.error("[payroll/pay] Error:", error);
    res.status(500).json({ error: "Ödeme işlemi başarısız" });
  }
});

router.patch("/api/payroll/parameters/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(payrollParameters)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(payrollParameters.id, id))
      .returning();
    res.json(updated || { success: false });
  } catch (error) {
    console.error("[payroll/params update] Error:", error);
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

router.get("/api/salary/employee/:userId", isAuthenticated, async (req: any, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const records = await db.select().from(payrollRecords)
      .where(eq(payrollRecords.userId, targetUserId))
      .orderBy(desc(payrollRecords.periodYear), desc(payrollRecords.periodMonth))
      .limit(12);
    res.json(records);
  } catch (error) {
    console.error("[salary/employee] Error:", error);
    res.json([]);
  }
});

router.post("/api/salary/employee", isAuthenticated, async (_req: any, res: Response) => {
  res.json({ success: true, message: "Henüz aktif değil" });
});

router.patch("/api/salary/employee/:id", isAuthenticated, async (_req: any, res: Response) => {
  res.json({ success: true, message: "Henüz aktif değil" });
});

router.get("/api/academy/achievement-stats", isAuthenticated, (_req, res) => res.json({ totalBadges: 0, earnedBadges: 0, achievements: [] }));
router.get("/api/academy/adaptive-recommendations", isAuthenticated, (_req, res) => res.json({ recommendations: [] }));
router.get("/api/academy/advanced-analytics", isAuthenticated, (_req, res) => res.json({ moduleStats: [], branchStats: [], trends: [] }));
router.get("/api/academy/ai-assistant", isAuthenticated, (_req, res) => res.json({ suggestions: [] }));
router.get("/api/academy/career-progress", isAuthenticated, (req: any, res) => res.json({ userId: req.user?.id, currentLevel: 1, progress: 0, milestones: [] }));
router.get("/api/academy/exam-requests-approved", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/exam-requests-pending", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/exam-requests-team", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/progress-overview", isAuthenticated, (_req, res) => res.json({ totalModules: 0, completedModules: 0, inProgress: 0, completionRate: 0 }));
router.get("/api/academy/quiz-results", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/streak-tracker", isAuthenticated, (_req, res) => res.json({ currentStreak: 0, longestStreak: 0, lastActivity: null }));
router.get("/api/academy/study-groups", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/academy/ai-generate-onboarding", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));
router.post("/api/academy/ai-generate-program", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));
router.get("/api/academy/question", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/quiz", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/quiz-result", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/recipe", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/recipe-versions", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/academy/recipe-notifications/mark-all-read", isAuthenticated, (_req, res) => res.json({ success: true }));
router.post("/api/academy/recipes/generate-marketing-preview", isAuthenticated, (_req, res) => res.json({ preview: "" }));

router.get("/api/admin/roles", isAuthenticated, (_req, res) => res.json([
  { id: "admin", name: "Admin" }, { id: "ceo", name: "CEO" }, { id: "cgo", name: "CGO" },
  { id: "coach", name: "Coach" }, { id: "trainer", name: "Trainer" },
  { id: "mudur", name: "Müdür" }, { id: "supervisor", name: "Supervisor" },
  { id: "barista", name: "Barista" }, { id: "stajyer", name: "Stajyer" },
  { id: "bar_buddy", name: "Bar Buddy" }, { id: "supervisor_buddy", name: "Supervisor Buddy" },
  { id: "fabrika_mudur", name: "Fabrika Müdürü" }, { id: "fabrika_operator", name: "Fabrika Operatörü" },
  { id: "kalite_kontrol", name: "Kalite Kontrol" }, { id: "gida_muhendisi", name: "Gıda Mühendisi" },
  { id: "muhasebe_ik", name: "Muhasebe/İK" }, { id: "satinalma", name: "Satın Alma" },
  { id: "marketing", name: "Pazarlama" }, { id: "sube_kiosk", name: "Şube Kiosk" },
  { id: "yatirimci_branch", name: "Yatırımcı (Şube)" },
]));
router.get("/api/admin/role-grants", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/admin/mega-modules/config", isAuthenticated, (_req, res) => res.json({ modules: [] }));
router.get("/api/admin/mega-modules/items", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/mega-modules/add-module", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));
router.get("/api/admin/menu/items", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/menu/items/order", isAuthenticated, (_req, res) => res.json({ success: true }));
router.get("/api/admin/menu/sections", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/menu/sections/order", isAuthenticated, (_req, res) => res.json({ success: true }));
router.get("/api/admin/menu/visibility-rules", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/dobody/avatars/upload", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));
router.post("/api/admin/dobody/avatars/bulk-update", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));
router.post("/api/admin/ai-settings/test", isAuthenticated, (_req, res) => res.json({ success: false, message: "Test henüz aktif değil" }));
router.post("/api/admin/email-settings/test", isAuthenticated, (_req, res) => res.json({ success: false, message: "Test henüz aktif değil" }));
router.post("/api/admin/service-email-settings/test", isAuthenticated, (_req, res) => res.json({ success: false, message: "Test henüz aktif değil" }));
router.post("/api/admin/users/bulk-import", isAuthenticated, (_req, res) => res.json({ imported: 0, message: "Henüz aktif değil" }));
router.post("/api/admin/ai/re-embed", isAuthenticated, (_req, res) => res.json({ success: false, message: "Henüz aktif değil" }));

router.get("/api/admin/pending-approvals", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!HQ_ROLES.includes(user.role)) return res.json([]);

    const pendingLeaves = await db.select({ id: leaveRequests.id, type: sql<string>`'leave'` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"))
      .limit(50);

    const items = pendingLeaves.map(l => ({
      id: l.id,
      type: "leave_request",
      title: "İzin talebi",
      status: "pending",
    }));

    res.json(items);
  } catch (error) {
    console.error("[pending-approvals] Error:", error);
    res.json([]);
  }
});

router.get("/api/knowledge-base/articles", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/knowledge-base/categories", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/coaching/sessions", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/salary/records", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/crm/customers", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/shift-rules", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/backups", isAuthenticated, async (_req, res) => {
  try {
    const { backupRecords } = await import("@shared/schema");
    const records = await db.select().from(backupRecords).orderBy(desc(backupRecords.createdAt)).limit(20);
    res.json(records);
  } catch {
    res.json([]);
  }
});
router.post("/api/action-cards/generate", isAuthenticated, (_req, res) => res.json({ generated: 0 }));

router.get("/api/factory/raw-materials", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/factory/recipes", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/factory/kavurma", isAuthenticated, (_req, res) => res.json({ batches: [], stats: { totalToday: 0, completed: 0 } }));
router.get("/api/factory/sayim", isAuthenticated, (_req, res) => res.json({ counts: [], lastCount: null }));

router.get("/api/franchise/performance", isAuthenticated, (_req, res) => res.json({ branches: [], overallScore: 0 }));

export default router;
