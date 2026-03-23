import { Router, Response } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { 
  users, leaveRequests, knowledgeBaseArticles, learningStreaks,
  branches, employeePerformanceScores, trainingModules, quizResults,
  trainingAssignments, isHQRole
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, count, avg } from "drizzle-orm";

const router = Router();

router.get("/api/knowledge-base/articles", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { category, search, published } = req.query;
    let query = db.select().from(knowledgeBaseArticles);
    
    const conditions: any[] = [];
    if (category) conditions.push(eq(knowledgeBaseArticles.category, category as string));
    if (published === 'true') conditions.push(eq(knowledgeBaseArticles.isPublished, true));
    if (search) {
      conditions.push(
        or(
          ilike(knowledgeBaseArticles.title, `%${search}%`),
          ilike(knowledgeBaseArticles.content, `%${search}%`)
        )
      );
    }
    
    const articles = await db.select().from(knowledgeBaseArticles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeBaseArticles.createdAt))
      .limit(100);
    
    res.json(articles);
  } catch (error: unknown) {
    console.error("[knowledge-base/articles] Error:", error instanceof Error ? error.message : error);
    res.json([]);
  }
});

router.get("/api/knowledge-base/categories", isAuthenticated, async (_req: any, res: Response) => {
  try {
    const categories = await db
      .select({ 
        category: knowledgeBaseArticles.category, 
        count: count() 
      })
      .from(knowledgeBaseArticles)
      .groupBy(knowledgeBaseArticles.category)
      .orderBy(desc(count()));
    res.json(categories);
  } catch (error: unknown) {
    console.error("[knowledge-base/categories] Error:", error instanceof Error ? error.message : error);
    res.json([]);
  }
});

router.get("/api/academy/streak-tracker", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ currentStreak: 0, longestStreak: 0, lastActivity: null, totalXp: 0, weeklyGoalTarget: 5, weeklyGoalProgress: 0 });
    
    const [streak] = await db.select().from(learningStreaks)
      .where(eq(learningStreaks.userId, userId));
    
    if (!streak) {
      return res.json({ 
        currentStreak: 0, 
        longestStreak: 0, 
        lastActivity: null, 
        totalXp: 0,
        monthlyXp: 0,
        weeklyGoalTarget: 5,
        weeklyGoalProgress: 0,
        totalActiveDays: 0
      });
    }
    
    res.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.bestStreak,
      lastActivity: streak.lastActivityDate,
      totalXp: streak.totalXp,
      monthlyXp: streak.monthlyXp,
      weeklyGoalTarget: streak.weeklyGoalTarget,
      weeklyGoalProgress: streak.weeklyGoalProgress,
      totalActiveDays: streak.totalActiveDays
    });
  } catch (error: unknown) {
    console.error("[academy/streak-tracker] Error:", error instanceof Error ? error.message : error);
    res.json({ currentStreak: 0, longestStreak: 0, lastActivity: null, totalXp: 0 });
  }
});

router.get("/api/academy/achievement-stats", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [quizStats] = await db.select({
      totalQuizzes: count(),
      avgScore: avg(quizResults.score)
    }).from(quizResults)
      .where(userId ? eq(quizResults.userId, userId) : undefined);

    const [assignmentStats] = await db.select({
      totalAssignments: count(),
      completed: sql<number>`count(case when ${trainingAssignments.status} = 'completed' then 1 end)`,
    }).from(trainingAssignments)
      .where(userId ? eq(trainingAssignments.userId, userId) : undefined);

    const [streakData] = userId ? await db.select().from(learningStreaks)
      .where(eq(learningStreaks.userId, userId)) : [null];

    const achievements = [];
    const completedCount = Number(assignmentStats?.completed || 0);
    const quizCount = Number(quizStats?.totalQuizzes || 0);
    const avgScoreVal = Number(quizStats?.avgScore || 0);

    if (completedCount >= 1) achievements.push({ id: 'first_module', title: 'İlk Adım', description: 'İlk eğitim modülünü tamamladın', earned: true, icon: 'award' });
    if (completedCount >= 5) achievements.push({ id: 'five_modules', title: 'Öğrenme Yolcusu', description: '5 eğitim modülünü tamamladın', earned: true, icon: 'book' });
    if (completedCount >= 10) achievements.push({ id: 'ten_modules', title: 'Bilgi Ustası', description: '10 eğitim modülünü tamamladın', earned: true, icon: 'star' });
    if (quizCount >= 1) achievements.push({ id: 'first_quiz', title: 'İlk Sınav', description: 'İlk quizi tamamladın', earned: true, icon: 'check' });
    if (avgScoreVal >= 90) achievements.push({ id: 'high_scorer', title: 'Yüksek Başarı', description: 'Quiz ortalaması %90+', earned: true, icon: 'trophy' });
    if (streakData && streakData.bestStreak >= 7) achievements.push({ id: 'week_streak', title: 'Haftalık Seri', description: '7 gün üst üste öğrendin', earned: true, icon: 'flame' });

    res.json({
      totalBadges: 6,
      earnedBadges: achievements.length,
      achievements,
      stats: {
        completedModules: completedCount,
        totalQuizzes: quizCount,
        averageScore: Math.round(avgScoreVal),
        totalXp: streakData?.totalXp || 0,
      }
    });
  } catch (error: unknown) {
    console.error("[academy/achievement-stats] Error:", error instanceof Error ? error.message : error);
    res.json({ totalBadges: 0, earnedBadges: 0, achievements: [] });
  }
});

router.get("/api/academy/progress-overview", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [moduleCount] = await db.select({ total: count() }).from(trainingModules);
    
    const [assignmentStats] = await db.select({
      total: count(),
      completed: sql<number>`count(case when ${trainingAssignments.status} = 'completed' then 1 end)`,
      inProgress: sql<number>`count(case when ${trainingAssignments.status} = 'in_progress' then 1 end)`,
    }).from(trainingAssignments)
      .where(userId ? eq(trainingAssignments.userId, userId) : undefined);

    const totalModules = Number(moduleCount?.total || 0);
    const completed = Number(assignmentStats?.completed || 0);
    const inProgress = Number(assignmentStats?.inProgress || 0);

    res.json({
      totalModules,
      completedModules: completed,
      inProgress,
      completionRate: totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0,
    });
  } catch (error: unknown) {
    console.error("[academy/progress-overview] Error:", error instanceof Error ? error.message : error);
    res.json({ totalModules: 0, completedModules: 0, inProgress: 0, completionRate: 0 });
  }
});

router.get("/api/academy/career-progress", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [assignmentStats] = await db.select({
      completed: sql<number>`count(case when ${trainingAssignments.status} = 'completed' then 1 end)`,
    }).from(trainingAssignments)
      .where(userId ? eq(trainingAssignments.userId, userId) : undefined);

    const [streakData] = userId ? await db.select().from(learningStreaks)
      .where(eq(learningStreaks.userId, userId)) : [null];

    const completedCount = Number(assignmentStats?.completed || 0);
    const xp = streakData?.totalXp || 0;
    const level = Math.floor(xp / 100) + 1;
    const progress = xp % 100;

    const milestones = [
      { level: 1, title: 'Başlangıç', xpRequired: 0, reached: level >= 1 },
      { level: 2, title: 'Öğrenci', xpRequired: 100, reached: level >= 2 },
      { level: 3, title: 'Deneyimli', xpRequired: 200, reached: level >= 3 },
      { level: 5, title: 'Uzman', xpRequired: 400, reached: level >= 5 },
      { level: 10, title: 'Usta', xpRequired: 900, reached: level >= 10 },
    ];

    res.json({ userId, currentLevel: level, progress, totalXp: xp, completedModules: completedCount, milestones });
  } catch (error: unknown) {
    console.error("[academy/career-progress] Error:", error instanceof Error ? error.message : error);
    res.json({ userId: req.user?.id, currentLevel: 1, progress: 0, milestones: [] });
  }
});

router.get("/api/franchise/performance", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'yatirimci_branch') {
      return res.json({ branches: [], overallScore: 0 });
    }

    const branchList = await db.select({
      id: branches.id,
      name: branches.name,
      city: branches.city,
    }).from(branches)
      .where(eq(branches.isActive, true));

    const perfScores = await db.select({
      branchId: employeePerformanceScores.branchId,
      avgScore: avg(employeePerformanceScores.dailyTotalScore),
      employeeCount: count(),
    }).from(employeePerformanceScores)
      .groupBy(employeePerformanceScores.branchId);

    const scoreMap = new Map(perfScores.map(p => [p.branchId, p]));

    const branchPerformance = branchList.map(b => {
      const perf = scoreMap.get(b.id);
      return {
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        averageScore: perf ? Math.round(Number(perf.avgScore)) : 0,
        employeeCount: perf ? Number(perf.employeeCount) : 0,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);

    const overallScore = branchPerformance.length > 0
      ? Math.round(branchPerformance.reduce((sum, b) => sum + b.averageScore, 0) / branchPerformance.length)
      : 0;

    res.json({ branches: branchPerformance, overallScore });
  } catch (error: unknown) {
    console.error("[franchise/performance] Error:", error instanceof Error ? error.message : error);
    res.json({ branches: [], overallScore: 0 });
  }
});

router.get("/api/coaching/sessions", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/salary/records", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/crm/customers", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/shift-rules", isAuthenticated, (_req, res) => res.json([]));

router.get("/api/academy/adaptive-recommendations", isAuthenticated, (_req, res) => res.json({ recommendations: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/academy/advanced-analytics", isAuthenticated, (_req, res) => res.json({ moduleStats: [], branchStats: [], trends: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/academy/ai-assistant", isAuthenticated, (_req, res) => res.json({ suggestions: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/academy/exam-requests-approved", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/exam-requests-pending", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/exam-requests-team", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/quiz-results", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/study-groups", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/academy/ai-generate-onboarding", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/academy/ai-generate-program", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.get("/api/academy/question", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/quiz", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/quiz-result", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/recipe", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/recipe-versions", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/academy/recipe-notifications/mark-all-read", isAuthenticated, (_req, res) => res.json({ success: true }));
router.post("/api/academy/recipes/generate-marketing-preview", isAuthenticated, (_req, res) => res.status(202).json({ preview: "", _stub: true, _message: "Bu özellik henüz aktif değil" }));

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
router.get("/api/admin/mega-modules/config", isAuthenticated, (_req, res) => res.json({ modules: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/admin/mega-modules/items", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/mega-modules/add-module", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.get("/api/admin/menu/items", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/menu/items/order", isAuthenticated, (_req, res) => res.json({ success: true }));
router.get("/api/admin/menu/sections", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/menu/sections/order", isAuthenticated, (_req, res) => res.json({ success: true }));
router.get("/api/admin/menu/visibility-rules", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/admin/dobody/avatars/upload", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/dobody/avatars/bulk-update", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/ai-settings/test", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/email-settings/test", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/service-email-settings/test", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/users/bulk-import", isAuthenticated, (_req, res) => res.status(202).json({ imported: 0, _stub: true, _message: "Bu özellik henüz aktif değil" }));
router.post("/api/admin/ai/re-embed", isAuthenticated, (_req, res) => res.status(202).json({ success: false, _stub: true, _message: "Bu özellik henüz aktif değil" }));

router.get("/api/admin/pending-approvals", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role)) return res.json([]);

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
  } catch (error: unknown) {
    console.error("[pending-approvals] Error:", error instanceof Error ? error.message : error);
    res.json([]);
  }
});

router.get("/api/backups", isAuthenticated, async (_req, res) => {
  try {
    const { backupRecords } = await import("@shared/schema");
    const records = await db.select().from(backupRecords).orderBy(desc(backupRecords.createdAt)).limit(20);
    res.json(records);
  } catch {
    res.json([]);
  }
});
router.post("/api/action-cards/generate", isAuthenticated, (_req, res) => res.status(202).json({ generated: 0, _stub: true, _message: "Bu özellik henüz aktif değil" }));

router.get("/api/factory/raw-materials", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/factory/recipes", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/factory/kavurma", isAuthenticated, (_req, res) => res.json({ batches: [], stats: { totalToday: 0, completed: 0 }, _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/factory/sayim", isAuthenticated, (_req, res) => res.json({ counts: [], lastCount: null, _stub: true, _message: "Bu özellik yakında aktif olacak" }));

export default router;
