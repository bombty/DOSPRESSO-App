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

// [SILINDI 19 Nis 2026] /api/knowledge-base/articles — kullanılmıyor (stub)

// [SILINDI 19 Nis 2026] /api/knowledge-base/categories — kullanılmıyor (stub)

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

// [SILINDI 19 Nis 2026] /api/franchise/performance — kullanılmıyor (stub)

// [SILINDI 19 Nis 2026] /api/coaching/sessions — kullanılmıyor (stub)
// [SILINDI 19 Nis 2026] /api/salary/records — kullanılmıyor (stub)
// [SILINDI 19 Nis 2026] /api/crm/customers — kullanılmıyor (stub)
// [SILINDI 19 Nis 2026] /api/shift-rules — kullanılmıyor (stub)

router.get("/api/academy/adaptive-recommendations", isAuthenticated, (_req, res) => res.json({ recommendations: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
router.get("/api/academy/advanced-analytics", isAuthenticated, (_req, res) => res.json({ moduleStats: [], branchStats: [], trends: [], _stub: true, _message: "Bu özellik yakında aktif olacak" }));
// [SILINDI 19 Nis 2026] /api/academy/ai-assistant — kullanılmıyor (stub)
router.get("/api/academy/exam-requests-approved", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/academy/exam-requests-pending", isAuthenticated, (_req, res) => res.json([]));
// [SILINDI 19 Nis 2026] /api/academy/exam-requests-team — kullanılmıyor (stub)
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

// [SILINDI 19 Nis 2026] /api/admin/pending-approvals — kullanılmıyor (stub)

// [SILINDI 19 Nis 2026] /api/backups — kullanılmıyor (stub)
router.post("/api/action-cards/generate", isAuthenticated, (_req, res) => res.status(202).json({ generated: 0, _stub: true, _message: "Bu özellik henüz aktif değil" }));

// [SILINDI 19 Nis 2026] /api/factory/raw-materials — kullanılmıyor (stub)
router.get("/api/factory/recipes", isAuthenticated, (_req, res) => res.json([]));
// [SILINDI 19 Nis 2026] /api/factory/kavurma — kullanılmıyor (stub)
// [SILINDI 19 Nis 2026] /api/factory/sayim — kullanılmıyor (stub)

export default router;
