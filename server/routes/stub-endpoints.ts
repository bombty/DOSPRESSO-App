import { Router, Request, Response } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import {
  users, leaveRequests, knowledgeBaseArticles, learningStreaks,
  branches, employeePerformanceScores, trainingModules, quizResults,
  trainingAssignments, isHQRole,
  type User, type Branch,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, count, avg } from "drizzle-orm";
import { storage } from "../storage";
import { ObjectStorageService, objectStorageClient } from "../objectStorage";
import multer from "multer";
import { randomUUID } from "crypto";
import { setObjectAclPolicy } from "../objectAcl";

const SENSITIVE_USER_FIELDS: ReadonlyArray<keyof User> = [
  "hashedPassword",
  "tckn",
  "address",
  "homePhone",
  "emergencyContactName",
  "emergencyContactPhone",
  "netSalary",
  "mealAllowance",
  "transportAllowance",
  "bonusBase",
  "bonusType",
  "bonusPercentage",
  "leaveReason",
  "disabilityLevel",
];

const SENSITIVE_BRANCH_FIELDS: ReadonlyArray<keyof Branch> = [
  "kioskUsername",
  "kioskPassword",
  "qrCodeToken",
  "feedbackQrToken",
];

function sanitizeUser(u: User | undefined | null): Partial<User> | null {
  if (!u) return null;
  const out: Partial<User> = { ...u };
  for (const f of SENSITIVE_USER_FIELDS) delete out[f];
  return out;
}

function sanitizeBranch(b: Branch | undefined | null): Partial<Branch> | null {
  if (!b) return null;
  const out: Partial<Branch> = { ...b };
  for (const f of SENSITIVE_BRANCH_FIELDS) delete out[f];
  return out;
}

type SessionUser = { id?: string; claims?: { sub?: string } };
function getSessionUserId(req: Request): string | null {
  const u = (req as Request & { user?: SessionUser }).user;
  return u?.claims?.sub ?? u?.id ?? null;
}

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

const stubFeature = (msg = "Bu özellik henüz aktif değil") => ({
  _stub: true,
  _message: msg,
});

const stubMutation = (res: Response, msg = "Bu özellik henüz aktif değil") =>
  res.status(503).json({ success: false, error: msg, _stub: true, _message: msg });

// --- Agent / analytics ---
router.get("/api/agent/insights", isAuthenticated, (_req, res) => res.json({ insights: [], ...stubFeature() }));
router.get("/api/analytics/summary", isAuthenticated, (_req, res) => res.json({ totalUsers: 0, totalSessions: 0, ...stubFeature() }));

// --- Branches helpers (kiosk staff, users by branch, list) ---
router.get("/api/branches-list", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/branches/kiosk/staff", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/branches/:branchId/users", isAuthenticated, (_req, res) => res.json([]));

// --- Branch recipients (announcement targets) ---
router.get("/api/branch-recipients", isAuthenticated, (_req, res) => res.json([]));

// --- Cash reports (kasa raporları) ---
router.get("/api/cash-reports", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/cash-reports/:branchId/:date", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/cash-reports", isAuthenticated, (_req, res) => stubMutation(res, "Kasa raporu kaydı henüz aktif değil"));
router.patch("/api/cash-reports/:id", isAuthenticated, (_req, res) => stubMutation(res, "Kasa raporu güncelleme henüz aktif değil"));
router.delete("/api/cash-reports/:id", isAuthenticated, (_req, res) => stubMutation(res, "Kasa raporu silme henüz aktif değil"));

// --- Cowork (channels real, but FE also calls flat endpoints) ---
router.get("/api/cowork/members", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/cowork/messages", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/cowork/tasks", isAuthenticated, (_req, res) => res.json([]));

// --- CRM ek istatistik ---
router.get("/api/crm/my-stats", isAuthenticated, (_req, res) => res.json({ assigned: 0, resolved: 0, pending: 0 }));

// --- Factory genel istatistik ---
router.get("/api/factory/stats", isAuthenticated, (_req, res) => res.json({ totalProductions: 0, totalShifts: 0, ...stubFeature() }));

// --- Public feedback form settings (auth gerektirmez) ---
router.get("/api/feedback-form-settings/public", (_req, res) => res.json({ enabled: false, fields: [] }));
router.get("/api/feedback-form-settings/public/:branchId", (_req, res) => res.json({ enabled: false, fields: [] }));

// --- PDKS personal status ---
router.get("/api/pdks/my-status", isAuthenticated, (_req, res) => res.json({ status: "off", lastEvent: null }));

// --- Shift attendance (vardiya yoklama) ---
router.get("/api/shift-attendance", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/shift-attendance/active", isAuthenticated, (_req, res) => res.json({ active: false, session: null }));
router.post("/api/shift-attendance", isAuthenticated, (_req, res) => stubMutation(res, "Vardiya yoklama henüz aktif değil"));

// --- Shifts weekly summary ---
router.get("/api/shifts/weekly-summary", isAuthenticated, (_req, res) => res.json({ days: [] }));

// --- Training user progress ---
router.get("/api/training/user-progress", isAuthenticated, (_req, res) => res.json({ totalAssigned: 0, completed: 0, inProgress: 0 }));

// --- Users (HQ list & detail) ---
router.get("/api/users/hq", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/users/:userId", isAuthenticated, (_req, res) => res.json(null));

// --- Academy recipe versions ---
router.get("/api/academy/recipe/:recipeId/versions", isAuthenticated, (_req, res) => res.json([]));

// --- Alerts (acknowledge/dismiss) ---
router.patch("/api/alerts/:id/acknowledge", isAuthenticated, (_req, res) => stubMutation(res, "Alarm onaylama henüz aktif değil"));
router.patch("/api/alerts/:id/dismiss", isAuthenticated, (_req, res) => stubMutation(res, "Alarm kapatma henüz aktif değil"));

// --- Leave / service requests / generic tasks ---
router.patch("/api/leave-requests/:id/status", isAuthenticated, (_req, res) => stubMutation(res, "İzin talebi durumu güncelleme henüz aktif değil"));
router.patch("/api/service-requests/:id", isAuthenticated, (_req, res) => stubMutation(res, "Servis talebi güncelleme henüz aktif değil"));
router.patch("/api/tasks/:id", isAuthenticated, (_req, res) => stubMutation(res, "Görev güncelleme henüz aktif değil"));
router.post("/api/tasks/:id/claim", isAuthenticated, (_req, res) => stubMutation(res, "Görev sahiplenme henüz aktif değil"));

// --- Admin actions ---
router.post("/api/admin/seed-equipment-training", isAuthenticated, (_req, res) => stubMutation(res, "Ekipman eğitimi yükleme henüz aktif değil"));
router.post("/api/admin/users/:userId/reset-password", isAuthenticated, (_req, res) => stubMutation(res, "Şifre sıfırlama henüz aktif değil"));
router.post("/api/complete-setup", isAuthenticated, (_req, res) => stubMutation(res, "Kurulum tamamlama henüz aktif değil"));
router.post("/api/test-smtp", isAuthenticated, (_req, res) => stubMutation(res, "SMTP testi henüz aktif değil"));

// --- Disciplinary reports response ---
router.post("/api/disciplinary-reports/:id/response", isAuthenticated, (_req, res) => stubMutation(res, "Disiplin raporu yanıtı henüz aktif değil"));

// --- Factory keyblends ingredients ---
router.post("/api/factory/keyblends/:id/ingredients", isAuthenticated, (_req, res) => stubMutation(res, "Keyblend malzeme ekleme henüz aktif değil"));

// --- Projects external users ---
router.get("/api/projects/:projectId/external-users", isAuthenticated, (_req, res) => res.json([]));
router.post("/api/projects/:projectId/external-users", isAuthenticated, (_req, res) => stubMutation(res, "Dış kullanıcı ekleme henüz aktif değil"));
router.delete("/api/projects/:projectId", isAuthenticated, (_req, res) => stubMutation(res, "Proje silme henüz aktif değil"));

// --- Employee onboarding silme ---
router.delete("/api/employee-onboarding/:id", isAuthenticated, (_req, res) => stubMutation(res, "Onboarding silme henüz aktif değil"));

// --- Notifications create (FE banner çağırıyor) ---
router.post("/api/notifications", isAuthenticated, (_req, res) => stubMutation(res, "Bildirim oluşturma henüz aktif değil"));

// --- Object storage / upload helpers ---
// [W4 KONSOLİDASYON 3 May 2026] Tek kanonik upload endpoint:
//   POST /api/objects/upload  → certificate-routes.ts:229 (auth'lu, ObjectUploader.tsx default)
//   POST /api/objects/finalize → certificate-routes.ts:242 (ACL + normalize)
// Eski 4 farklı naming aşağıda KALDIRILDI (FE 5 call site /api/objects/upload'a migrate edildi):
//   - /api/objects/generate-upload-url (kiosk + guest-form ×2) → /api/objects/upload
//   - /api/object-storage/presigned-url (announcements ×2) → /api/objects/upload
//   - /api/upload-url (fault-report + aksiyon-takip ×2) → KORUNUR (Task #283 v4 real impl, FE migrate edilmedi)

// Object storage destekli pre-signed PUT URL üretir.
// FE (fault-report-dialog, aksiyon-takip) bu uca POST atar, dönen URL'e
// dosyayı PUT eder. PRIVATE_OBJECT_DIR ayarsızsa 503 döner.
// NOT: Yeni FE kullanımları /api/objects/upload kullanmalı; bu endpoint legacy contract için tutuluyor.
router.post("/api/upload-url", isAuthenticated, async (_req, res) => {
  try {
    const svc = new ObjectStorageService();
    const uploadURL = await svc.getObjectEntityUploadURL();
    return res.json({ method: "PUT", url: uploadURL, uploadURL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Object storage hazır değil (PRIVATE_OBJECT_DIR yok).";
    console.error("[upload-url] Error:", message);
    return res.status(503).json({ success: false, error: message, _stub: true });
  }
});

// Public upload (misafir geri bildirim foto) — branchToken doğrulamalı, multipart FormData.
// FE: misafir-geri-bildirim.tsx:655 — `file` + `branchToken` field bekleniyor.
// Server-side upload + ACL public set; sonuç `{url}` (`/objects/...` normalize).
const publicUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
router.post("/api/upload/public", publicUploadMulter.single("file"), async (req, res) => {
  try {
    const branchToken = (req.body?.branchToken as string | undefined) ?? "";
    if (!branchToken) {
      return res.status(400).json({ message: "branchToken gerekli" });
    }
    const branch = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.feedbackQrToken, branchToken))
      .limit(1);
    if (!branch.length) {
      return res.status(403).json({ message: "Geçersiz şube tokeni" });
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer) {
      return res.status(400).json({ message: "Dosya gerekli" });
    }
    if (!file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Sadece resim dosyaları kabul edilir" });
    }

    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) {
      return res.status(503).json({ message: "Object storage hazır değil (PRIVATE_OBJECT_DIR yok)" });
    }

    // /bucket/dir/uploads/<uuid>
    const objectId = randomUUID();
    const fullPath = `${privateDir.replace(/\/$/, "")}/uploads/${objectId}`;
    const parts = fullPath.replace(/^\//, "").split("/");
    const bucketName = parts[0];
    const objectName = parts.slice(1).join("/");

    const bucket = objectStorageClient.bucket(bucketName);
    const fileRef = bucket.file(objectName);
    await fileRef.save(file.buffer, {
      contentType: file.mimetype || "image/jpeg",
      resumable: false,
    });

    // Public ACL via setObjectAclPolicy (visibility:public, owner:guest:branch:<id>)
    await setObjectAclPolicy(fileRef, {
      owner: `guest:branch:${branch[0].id}`,
      visibility: "public",
    });

    // Normalize: /objects/<entityId> (entityId = path after privateDir)
    const entityId = `uploads/${objectId}`;
    return res.json({ url: `/objects/${entityId}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yükleme başarısız";
    console.error("[upload/public] Error:", message);
    return res.status(500).json({ message });
  }
});

router.put("/api/checklist-completions/:id/review", isAuthenticated, (_req, res) => stubMutation(res, "Checklist inceleme henüz aktif değil"));

const getCurrentUser = async (req: Request, res: Response): Promise<Response> => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ message: "Yetkisiz" });
  const user = await storage.getUser(userId);
  if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
  return res.json(sanitizeUser(user));
};
router.get("/api/me", isAuthenticated, getCurrentUser);
router.get("/api/user", isAuthenticated, getCurrentUser);

router.get("/api/branch", isAuthenticated, async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ message: "Yetkisiz" });
  const user = await storage.getUser(userId);
  if (!user?.branchId) return res.json(null);
  const branch = await storage.getBranch(user.branchId);
  return res.json(sanitizeBranch(branch));
});

// HR / takvim
router.get("/api/employee-leaves/:year", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/public-holidays/:year", isAuthenticated, (_req, res) => res.json([]));

// Eğitim ilerlemesi
router.get("/api/training/progress/:userId", isAuthenticated, (_req, res) =>
  res.json({ summary: [], totals: { assigned: 0, completed: 0, inProgress: 0 } })
);
router.get("/api/training/user-modules-stats/:userId", isAuthenticated, (_req, res) =>
  res.json({ totalModules: 0, completedModules: 0, averageScore: 0 })
);

// Ayın çalışanı
router.get("/api/employee-of-month/awards/:year", isAuthenticated, (_req, res) => res.json([]));
router.get("/api/employee-of-month/rankings/:month/:year/:scope", isAuthenticated, (_req, res) => res.json([]));
router.get(
  "/api/employee-of-month/rankings/:month/:year/:scope/branch/:branchId/all",
  isAuthenticated,
  (_req, res) => res.json([])
);

// Şube geri bildirimleri
router.get("/api/feedback/:branchId", isAuthenticated, (_req, res) => res.json([]));

// Misafir şikayet özeti
router.get("/api/guest-complaints/stats/:branchId", isAuthenticated, (_req, res) =>
  res.json({ total: 0, resolved: 0, pending: 0, critical: 0 })
);

// Fabrika kalite şartnameleri (istasyon bazlı)
router.get("/api/factory/quality-specs/station/:stationId", isAuthenticated, (_req, res) => res.json([]));

// Akademi onboarding — uygun kullanıcılar
router.get(
  "/api/academy/onboarding/available-users/:branchId/:role",
  isAuthenticated,
  (_req, res) => res.json([])
);

// V2 — şubedeki vardiyada olan personel
router.get("/api/v2/branch-on-shift/:branchId", isAuthenticated, (_req, res) => res.json([]));

// Yeni şube projeleri — alt görevler / atamalar / satın alma kalemleri
router.get(
  "/api/new-shop-projects/:projectId/phases/:phaseId/subtasks",
  isAuthenticated,
  (_req, res) => res.json([])
);
router.get(
  "/api/new-shop-projects/:projectId/phases/:phaseId/assignments",
  isAuthenticated,
  (_req, res) => res.json([])
);
router.get(
  "/api/new-shop-projects/:projectId/procurement/items",
  isAuthenticated,
  (_req, res) => res.json([])
);

// Üretim planlama — plan detayı
router.get("/api/production-planning/plans/:planId", isAuthenticated, (_req, res) =>
  res.json({ id: null, items: [], _stub: true })
);

export default router;
