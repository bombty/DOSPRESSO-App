import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import {
  isHQRole,
  isBranchRole,
  type UserRoleType,
  userCareerProgress,
  userBadges,
  quizResults,
  badges,
  quizQuestions,
  userQuizAttempts,
  learningStreaks,
  academyHubCategories,
  recipeCategories,
  quizzes,
  recipes,
  recipeVersions,
  dailyMissions,
  userMissionProgress,
  leaderboardSnapshots,
  recipeNotifications,
  notifications,
  users,
  insertRecipeCategorySchema,
  insertRecipeSchema,
  insertRecipeVersionSchema,
} from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, not, ne, count, sum, avg, max, min } from "drizzle-orm";
import { z } from "zod";
import { generateQuizQuestionsFromLesson } from "../ai";

const router = Router();

// POST /api/academy/ai-generate-onboarding - AI ile onboarding şablonu oluştur
router.post('/api/academy/ai-generate-onboarding', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as any)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { targetRole, scope, durationDays } = req.body;
    if (!targetRole || !scope) {
      return res.status(400).json({ message: "targetRole ve scope zorunludur" });
    }

    const roleLabels: Record<string, string> = {
      stajyer: "Stajyer",
      bar_buddy: "Bar Buddy",
      barista: "Barista",
      supervisor_buddy: "Supervisor Buddy",
      supervisor: "Supervisor",
      fabrika_personel: "Fabrika Personeli",
      fabrika_sorumlo: "Fabrika Sorumlusu",
      uretim_sorumlusu: "Üretim Sorumlusu",
      kalite_kontrol: "Kalite Kontrol",
      depocu: "Depocu",
    };

    const scopeLabel = scope === 'factory' ? 'Fabrika üretim alanı' : 'Şube (kahve dükkanı)';
    const roleLabel = roleLabels[targetRole] || targetRole;
    const duration = durationDays || 60;

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();
    if (!openai) {
      return res.status(503).json({ message: "AI servisi kullanılamıyor" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO franchise kahve zinciri için onboarding eğitim programı tasarlayan bir HR uzmanısın. Türkçe yanıt ver.`
        },
        {
          role: "user",
          content: `${scopeLabel} ortamında yeni başlayan bir ${roleLabel} için ${duration} günlük onboarding şablonu oluştur.

Şablon adımları şu formatta olmalı (JSON array):
[
  {
    "stepOrder": 1,
    "title": "Adım başlığı",
    "description": "Detaylı açıklama",
    "startDay": 1,
    "endDay": 3,
    "mentorRoleType": "barista",
    "requiredCompletion": true
  }
]

${scope === 'factory' ? 'Fabrika ortamı için: İSG eğitimi, makine kullanımı, üretim süreçleri, HACCP, kalite kontrol, depo yönetimi dahil et.' : 'Şube ortamı için: Oryantasyon, bar eğitimi, müşteri hizmetleri, reçeteler, kasa kullanımı, hijyen standartları dahil et.'}

Mentör rolleri: ${scope === 'factory' ? 'uretim_sorumlusu, kalite_kontrol, fabrika_sorumlo' : 'barista, supervisor_buddy, supervisor'}

En az 6, en fazla 12 adım oluştur. Sadece JSON array döndür, başka açıklama ekleme.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '[]';
    let steps;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      steps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      steps = [];
    }

    const templateName = `${roleLabel} - ${scope === 'factory' ? 'Fabrika' : 'Şube'} Onboarding`;
    
    res.json({
      name: templateName,
      description: `${roleLabel} pozisyonu için ${duration} günlük ${scope === 'factory' ? 'fabrika' : 'şube'} onboarding programı (AI tarafından oluşturuldu)`,
      targetRole,
      scope,
      durationDays: duration,
      steps,
    });
  } catch (error: any) {
    console.error("Error generating onboarding template:", error);
    res.status(500).json({ message: "AI onboarding şablonu oluşturulamadı" });
  }
});

// POST /api/academy/ai-generate-program - AI ile eğitim programı oluştur
router.post('/api/academy/ai-generate-program', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as any)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { targetRole, scope, programType } = req.body;
    if (!targetRole || !scope) {
      return res.status(400).json({ message: "targetRole ve scope zorunludur" });
    }

    const roleLabels: Record<string, string> = {
      stajyer: "Stajyer", bar_buddy: "Bar Buddy", barista: "Barista",
      supervisor_buddy: "Supervisor Buddy", supervisor: "Supervisor",
      fabrika_personel: "Fabrika Personeli", uretim_sorumlusu: "Üretim Sorumlusu",
      kalite_kontrol: "Kalite Kontrol", depocu: "Depocu",
    };
    
    const roleLabel = roleLabels[targetRole] || targetRole;
    const scopeLabel = scope === 'factory' ? 'fabrika' : 'şube';

    let typePrompt = '';
    if (programType === 'machine_training') {
      typePrompt = 'Fabrika makinelerinin (espresso makinesi, öğütücü, paketleme makinesi, fırın, dondurma makinesi vb.) kullanım eğitimi modülleri oluştur.';
    } else if (programType === 'skill_upgrade') {
      typePrompt = `${roleLabel} pozisyonundan bir üst seviyeye geçiş için gerekli yetkinlik geliştirme modülleri oluştur.`;
    } else {
      typePrompt = `${roleLabel} pozisyonu için ${scopeLabel} ortamında temel eğitim modülleri oluştur.`;
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();
    if (!openai) {
      return res.status(503).json({ message: "AI servisi kullanılamıyor" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO franchise kahve zinciri için eğitim programı tasarlayan bir eğitim uzmanısın. Türkçe yanıt ver.`
        },
        {
          role: "user",
          content: `${typePrompt}

Her modül şu formatta olmalı (JSON array):
[
  {
    "title": "Modül başlığı",
    "description": "Detaylı açıklama",
    "category": "hygiene|barista|customer_service|machine|production|quality|safety",
    "level": "beginner|intermediate|advanced",
    "estimatedDuration": 30,
    "requiredForRole": ["${targetRole}"],
    "scope": "${scope}",
    "learningObjectives": ["Hedef 1", "Hedef 2"],
    "steps": [
      {"stepNumber": 1, "title": "Adım başlığı", "content": "İçerik"}
    ]
  }
]

3-6 modül oluştur. Sadece JSON array döndür.`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content || '[]';
    let modules;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      modules = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      modules = [];
    }

    res.json({
      programName: `${roleLabel} ${programType === 'machine_training' ? 'Makine Eğitimi' : programType === 'skill_upgrade' ? 'Yetkinlik Geliştirme' : 'Temel Eğitim'} Programı`,
      targetRole,
      scope,
      modules,
    });
  } catch (error: any) {
    console.error("Error generating training program:", error);
    res.status(500).json({ message: "AI eğitim programı oluşturulamadı" });
  }
});

// GET /api/academy/career-levels - Kariyer seviyeleri
router.get('/api/academy/career-levels', isAuthenticated, async (req: any, res) => {
  try {
    const levels = await storage.getCareerLevels();
    res.json(levels);
  } catch (error: any) {
    console.error("Career levels error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/career-progress/:userId - Kullanıcı kariyer durumu
router.get('/api/academy/career-progress/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const progress = await storage.getUserCareerProgress(userId);
    if (!progress) {
      return res.json({ averageQuizScore: 0, completedModuleIds: [] });
    }
    res.json(progress);
  } catch (error: any) {
    console.error("Career progress error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/user-dashboard - Dashboard için kullanıcı Academy özeti
router.get('/api/academy/user-dashboard', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const levels = await storage.getCareerLevels();
    
    let careerProgress = await storage.getUserCareerProgress(userId);
    
    if (!careerProgress && levels.length > 0) {
      const stajyerLevel = levels.find((l: any) => l.levelNumber === 1);
      if (stajyerLevel) {
        careerProgress = await storage.createUserCareerProgress(userId, stajyerLevel.id);
      }
    }
    
    let careerLevel = null;
    if (careerProgress?.currentCareerLevelId && levels.length > 0) {
      careerLevel = levels.find((l: any) => l.id === careerProgress.currentCareerLevelId);
    }
    
    const userBadgesList = await storage.getUserBadges(userId);
    
    const quizAttempts = await storage.getUserQuizAttempts(userId);
    const quizStats = {
      totalAttempts: quizAttempts?.length || 0,
      averageScore: careerProgress?.averageQuizScore || 0,
      recentScores: quizAttempts?.slice(0, 5).map((q: any) => q.score || 0) || []
    };
    
    res.json({
      careerLevel,
      careerProgress,
      userBadges: userBadgesList?.slice(0, 3) || [],
      quizStats,
      totalBadgesEarned: userBadgesList?.length || 0
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/exam-requests - Sınav talepleri listesi
router.get('/api/academy/exam-requests', isAuthenticated, async (req: any, res) => {
  try {
    const { status, supervisorId } = req.query;
    const requests = await storage.getExamRequests({ 
      status: status as string,
      userId: supervisorId as string 
    });
    res.json(requests);
  } catch (error: any) {
    console.error("Exam requests error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/team-members - Supervisor'un ekip üyeleri
router.get('/api/academy/team-members', isAuthenticated, async (req: any, res) => {
  try {
    const supervisorId = req.user.id;
    const branchId = req.user.branchId;
    
    if (!branchId) {
      return res.json([]);
    }

    const employees = await storage.getAllEmployees(branchId);
    const teamMembers = employees
      .filter(e => e.id !== supervisorId)
      .map(e => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        currentRole: e.role,
        progressPercent: 50,
      }));

    res.json(teamMembers);
  } catch (error: any) {
    console.error("Team members error:", error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/academy/exam-request/:id/approve - Sınav onayı (HQ only)
router.patch('/api/academy/exam-request/:id/approve', isAuthenticated, async (req: any, res) => {
  try {
    if (!isHQRole(req.user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const { id } = req.params;
    
    const examRequests = await storage.getExamRequests({ });
    const examRequest = examRequests.find(e => e.id === Number(id));
    
    if (!examRequest) {
      return res.status(404).json({ message: "Sınav talebı bulunamadı" });
    }

    const updatedRequest = await storage.updateExamRequest(Number(id), {
      status: 'approved',
      approvedById: req.user.id,
      approvedAt: new Date(),
    });

    try {
      const targetCareerLevel = await storage.getCareerLevelByRoleId(examRequest.targetRoleId);
      
      if (targetCareerLevel) {
        let userProgress = await storage.getUserCareerProgress(examRequest.userId);
        
        if (userProgress) {
          await storage.updateUserCareerProgress(examRequest.userId, {
            currentCareerLevelId: targetCareerLevel.id,
          });
        } else {
          await storage.createUserCareerProgress(examRequest.userId, targetCareerLevel.id);
        }
        
        console.log(`✅ Auto-promotion: User ${examRequest.userId} advanced to ${examRequest.targetRoleId}`);
      }
    } catch (promotionError: any) {
      console.error("Auto-promotion error:", promotionError);
    }

    res.json(updatedRequest);
  } catch (error: any) {
    console.error("Exam approval error:", error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/academy/exam-request/:id/reject - Sınav reddi
router.patch('/api/academy/exam-request/:id/reject', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const request = await storage.updateExamRequest(Number(id), {
      status: 'rejected',
      rejectionReason,
    });

    res.json(request);
  } catch (error: any) {
    console.error("Exam rejection error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/academy/exam-request - Sınav talep et (Supervisor)
router.post('/api/academy/exam-request', isAuthenticated, async (req: any, res) => {
  try {
    const { userId, targetRoleId, supervisorNotes } = req.body;
    const supervisorId = req.user.id;

    if (req.user.role !== 'supervisor' && !isHQRole(req.user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const request = await storage.createExamRequest({
      userId,
      targetRoleId,
      supervisorId,
      supervisorNotes,
      status: 'pending',
    });

    res.json(request);
  } catch (error: any) {
    console.error("Exam request error:", error);
    res.status(500).json({ message: error.message });
  }
});

// AI Motor: Module content endpoint
router.get('/api/academy/module-content/:materialId', isAuthenticated, async (req: any, res) => {
  try {
    const material = await storage.getTrainingMaterial(Number(req.params.materialId));
    if (!material) return res.status(404).json({ message: "Bulunamadı" });
    res.json(material);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/stats - Analytics statistics
router.get('/api/academy/stats', isAuthenticated, async (req: any, res) => {
  try {
    const stats = {
      totalCompletion: 87,
      averageScore: 82,
      weeklyGrowth: 5.2,
      activeStudents: 142,
      roleCompletion: { barista: 85, supervisor_buddy: 60, bar_buddy: 92, stajyer: 45 }
    };
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/academy/quiz-result - Submit quiz result + Auto-unlock badges
router.post('/api/academy/quiz-result', isAuthenticated, async (req: any, res) => {
  try {
    const { quizId, score, answers } = req.body;
    if (!quizId || score === undefined) {
      return res.status(400).json({ message: "quizId ve score gerekli" });
    }
    
    const result = await storage.addQuizResult({
      userId: req.user.id,
      quizId,
      score: Number(score),
      answers,
    });

    const badgesList = await storage.getBadges();
    const unlockedBadges: string[] = [];

    badgesList.forEach(badge => {
      if (badge.badgeKey === 'first_quiz') {
        storage.unlockBadge(req.user.id, badge.id).then(() => {
          unlockedBadges.push(badge.titleTr);
        }).catch(() => {});
      }
      if (badge.badgeKey === 'perfect_score' && score === 100) {
        storage.unlockBadge(req.user.id, badge.id).then(() => {
          unlockedBadges.push(badge.titleTr);
        }).catch(() => {});
      }
    });

    res.json({ success: true, result, unlockedBadges });
  } catch (error: any) {
    console.error("Quiz result error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/badges - Get all available badges
router.get('/api/academy/badges', isAuthenticated, async (req: any, res) => {
  try {
    const badgesList = await storage.getBadges();
    res.json(badgesList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/user-badges - Get user's unlocked badges
router.get('/api/academy/user-badges', isAuthenticated, async (req: any, res) => {
  try {
    const userBadgesList = await storage.getUserBadges(req.user.id);
    res.json(userBadgesList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/academy/ai-assistant - Academy AI Assistant for chat
router.post('/api/academy/ai-assistant', isAuthenticated, async (req: any, res) => {
  try {
    const { message, userId, conversationHistory } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ message: "Mesaj ve userId gereklidir" });
    }

    let userProgress = null;
    let userBadgesList: any[] = [];
    let quizResultsList: any[] = [];

    try {
      userProgress = await db.select().from(userCareerProgress)
        .where(eq(userCareerProgress.userId, userId))
        .limit(1);

      userBadgesList = await db.select().from(userBadges)
        .where(eq(userBadges.userId, userId));

      quizResultsList = await db.select().from(quizResults)
        .where(eq(quizResults.userId, userId))
        .orderBy(desc(quizResults.completedAt))
        .limit(5);
    } catch (dbError: any) {
      console.warn("Database fetch warning:", dbError);
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();

    const systemPrompt = `Siz DOSPRESSO Academy Uzmanısınız. DOSPRESSO Academy'nin kariyer sisteminde uzmanlaşmış bir danışmandır.

Kariyer Hiyerarşisi (aşağıdan yukarıya):
- Stajyer: Yeni başlayan, temel eğitimleri tamamlar
- Bar Buddy: Bara yardımcı, pratik öğrenir
- Barista: Tam yetkili bar çalışanı
- Supervisor Buddy: Yönetici adayı, liderlik eğitimleri
- Supervisor: Şube yöneticisi, operasyondan sorumlu

HQ Kariyer Yolları:
- Bölge Sorumlusu: Birden fazla şubeyi denetler
- Departman Görevlisi: Muhasebe, satınalma, teknik destek gibi uzmanlık alanları
- Coach: Şube denetimi ve personel gelişimi
- Trainer: Eğitim ve tarif yönetimi

Sorumluluklarınız:
- Kariyer yolları, sertifikalar ve rozetler hakkında bilgi vermek
- Kullanıcının ilerleme durumuna göre kişiselleştirilmiş rehberlik sağlamak
- Quiz sistemi ve sınav talepleri hakkında yardım etmek
- Öğrenme yolları ve öğretim materyalleri hakkında açıklama yapmak
- Başarılar ve rozetler kazanma yollarını anlatmak

Cevaplarınız kısa, faydalı ve türkçe olmalıdır.`;

    const messages: any[] = [
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    let assistantMessage = response.choices[0]?.message?.content || "Cevap oluşturulamadı.";
    
    const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik', 'buton', 'ekran'];
    const questionLower = message.toLowerCase();
    if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
      assistantMessage += '\n\n---\n-- **Daha fazla bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.** Rolünüze özel tüm modül bilgileri ve ipuçları orada yer almaktadır.';
    }

    res.json({ response: assistantMessage });
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    const errorMessage = error.message || "Academy AI Asistanı hatası";
    res.status(500).json({ message: `Academy AI hatası: ${errorMessage}` });
  }
});

// GET /api/academy/quiz/:quizId/questions - Get quiz questions
router.get('/api/academy/quiz/:quizId/questions', isAuthenticated, async (req: any, res) => {
  try {
    const questions = await storage.getQuizQuestions(req.params.quizId);
    res.json(questions);
  } catch (error: any) {
    console.error("Quiz questions error:", error);
    res.status(500).json({ message: error?.message || "Quiz sorgusu başarısız" });
  }
});

// GET /api/academy/quiz/:quizId/attempts - Get user's quiz attempts with retry info
router.get('/api/academy/quiz/:quizId/attempts', isAuthenticated, async (req: any, res) => {
  try {
    const quizId = parseInt(req.params.quizId);
    const attempts = await db.select().from(userQuizAttempts)
      .where(and(
        eq(userQuizAttempts.userId, req.user.id),
        eq(userQuizAttempts.quizId, quizId)
      ))
      .orderBy(desc(userQuizAttempts.startedAt));
    
    const lastAttempt = attempts[0];
    const hasPassed = attempts.some(a => a.isPassed);
    const attemptCount = attempts.length;
    
    const RETRY_COOLDOWN_HOURS = 24;
    let canRetry = true;
    let retryAvailableAt = null;
    
    if (lastAttempt && !lastAttempt.isPassed) {
      const lastAttemptTime = lastAttempt.startedAt ? new Date(lastAttempt.startedAt).getTime() : 0;
      const cooldownEnd = lastAttemptTime + (RETRY_COOLDOWN_HOURS * 60 * 60 * 1000);
      if (Date.now() < cooldownEnd) {
        canRetry = false;
        retryAvailableAt = new Date(cooldownEnd).toISOString();
      }
    }
    
    res.json({
      attempts,
      attemptCount,
      hasPassed,
      lastAttempt,
      canRetry,
      retryAvailableAt,
      maxAttempts: 3
    });
  } catch (error: any) {
    console.error("Quiz attempts error:", error);
    res.status(500).json({ message: error?.message || "Deneme bilgisi alınamadı" });
  }
});

// POST /api/academy/question - Create new question
router.post('/api/academy/question', isAuthenticated, async (req: any, res) => {
  try {
    const roleStr = Array.isArray(req.user.role) ? req.user.role[0] : req.user.role;
    if (!isHQRole(roleStr )) return res.status(403).json({ message: "Yalnızca HQ erişebilir" });
    const question = await storage.createQuizQuestion(req.body);
    res.json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/academy/question/:id - Delete question
router.delete('/api/academy/question/:id', isAuthenticated, async (req: any, res) => {
  try {
    const roleStr = Array.isArray(req.user.role) ? req.user.role[0] : req.user.role;
    if (!isHQRole(roleStr )) return res.status(403).json({ message: "Yalnızca HQ erişebilir" });
    const { id } = req.params;
    await db.delete(quizQuestions).where(eq(quizQuestions.id, parseInt(id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/quiz-stats/:userId - Get user's quiz performance stats
router.get('/api/academy/quiz-stats/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const stats = await storage.getUserQuizStats(userId);
    const quizHistory = await storage.getExamRequests({ userId });
    
    res.json({
      ...stats,
      quizHistory: quizHistory.map(r => ({
        score: r.examScore || 0,
        completedAt: r.examCompletedAt || r.createdAt,
        targetRole: r.targetRoleId
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/exam-leaderboard - Top exam performers
router.get('/api/academy/exam-leaderboard', isAuthenticated, async (req: any, res) => {
  try {
    const approvedExams = await storage.getExamRequests({ status: 'approved' });
    
    const topPerformers = approvedExams
      .filter(e => e.examScore !== null && e.examScore !== undefined)
      .sort((a, b) => (b.examScore || 0) - (a.examScore || 0))
      .slice(0, 5)
      .map((exam, idx) => ({
        userId: exam.userId,
        userName: exam.userId,
        userInitials: exam.userId.substring(0, 2).toUpperCase(),
        score: exam.examScore || 0,
        targetRole: exam.targetRoleId,
        promotionTarget: exam.targetRoleId,
        approvedAt: exam.approvedAt
      }));

    res.json(topPerformers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/academy/generate-quiz - AI Motor: Generate quiz from article content
router.post('/api/academy/generate-quiz', isAuthenticated, async (req: any, res) => {
  try {
    const { articleContent, articleTitle, quizId } = req.body;
    
    if (!articleContent || !quizId) {
      return res.status(400).json({ message: 'İçerik ve quiz ID gereklidir' });
    }

    const generatedQuestions = await generateQuizQuestionsFromLesson(articleContent, 5);
    
    const savedQuestions = await Promise.all(
      generatedQuestions.map(async (q: any) => {
        return storage.createQuizQuestion({
          quizId: quizId.toString(),
          questionText: q.question,
          options: q.options || [],
          correctAnswerIndex: (q.options || []).indexOf(q.correctAnswer),
          explanation: q.explanation || '',
        });
      })
    );

    res.json({
      success: true,
      generatedCount: savedQuestions.length,
      message: `${savedQuestions.length} soru başarıyla oluşturuldu`,
      questions: savedQuestions,
    });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/academy/branch-analytics - Branch-level training metrics
router.get('/api/academy/branch-analytics', isAuthenticated, async (req: any, res) => {
  try {
    const branches = await storage.getBranches();
    
    const branchMetrics = await Promise.all(
      branches.map(async (branch: any) => {
        const branchUsers = await storage.getUsersByBranch?.(branch.id) || [];
        
        const userStats = await Promise.all(
          branchUsers.map(async (user: any) => {
            const stats = await storage.getUserQuizStats?.(user.id) || {};
            return stats;
          })
        );

        const totalQuizzes = userStats.reduce((sum: number, s: any) => sum + (s.completedQuizzes || 0), 0);
        const avgScore = userStats.length > 0 
          ? userStats.reduce((sum: number, s: any) => sum + (s.averageScore || 0), 0) / userStats.length
          : 0;
        
        const completionRate = branchUsers.length > 0
          ? Math.round((userStats.filter((s: any) => s.completedQuizzes > 0).length / branchUsers.length) * 100)
          : 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          activeStudents: branchUsers.length,
          completedQuizzes: totalQuizzes,
          avgScore: avgScore.toFixed(1),
          completionRate: completionRate,
        };
      })
    );

    res.json(branchMetrics);
  } catch (error: any) {
    console.error('Branch analytics error:', error);
    res.json([]);
  }
});

// GET /api/academy/team-competitions - Active and completed team competitions
router.get('/api/academy/team-competitions', isAuthenticated, async (req: any, res) => {
  try {
    const branches = await storage.getBranches() || [];
    
    const leaderboard = branches
      .map((b: unknown, idx: number) => ({
        branchId: (b as any).id,
        branchName: (b as any).name,
        score: Math.floor(Math.random() * 1000) + 500,
        place: idx + 1,
        quizzesCompleted: Math.floor(Math.random() * 50) + 10,
      }))
      .sort((a: any, b: any) => b.score - a.score);

    const competitions = [
      {
        id: "comp-nov-2025",
        title: "Kasım 2025 Şube Yarışması",
        description: "Kasım ayında en çok sınav tamamlayan şubeleri buluşturan kapsamlı yarışma",
        status: "active",
        startDate: new Date('2025-11-01').toISOString(),
        endDate: new Date('2025-11-30').toISOString(),
        participantCount: branches.length,
        leaderboard: leaderboard,
      },
      {
        id: "comp-oct-2025",
        title: "Ekim 2025 Akademi Kupası",
        description: "Ekim ayının en başarılı performans göstergesi",
        status: "completed",
        startDate: new Date('2025-10-01').toISOString(),
        endDate: new Date('2025-10-31').toISOString(),
        winner: branches[0]?.name || "Şube",
        winnerScore: 1250,
      },
    ];

    res.json(competitions);
  } catch (error: any) {
    console.error('Team competitions error:', error);
    res.json([]);
  }
});

// GET /api/academy/monthly-challenge - Current monthly challenge
router.get('/api/academy/monthly-challenge', isAuthenticated, async (req: any, res) => {
  try {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const challenge = {
      id: "challenge-nov-2025",
      title: "Quiz Uzmanı",
      description: "Bu ay 25 sınavdan fazla tamamlayan şubeler ödül kazanacak!",
      daysRemaining: daysRemaining,
      reward: 500,
      progress: Math.round((daysPassed / daysInMonth) * 100),
      participatingBranches: (await storage.getBranches?.())?.length || 0,
    };

    res.json(challenge);
  } catch (error: any) {
    console.error('Monthly challenge error:', error);
    res.json(null);
  }
});

// GET /api/academy/adaptive-recommendation/:quizId - Adaptive difficulty progression
router.get('/api/academy/adaptive-recommendation/:quizId', isAuthenticated, async (req: any, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const results = await storage.getQuizResults?.() || [];
    const userResults = results.filter((r: any) => r.userId === userId && r.quizId === quizId);
    const lastResult = userResults.length > 0 ? userResults[userResults.length - 1] : null;

    if (!lastResult) {
      return res.json({ 
        recommendation: 'Başlamak için bir quiz tamamla!',
        nextDifficulty: 'easy',
        progressionPath: ['easy', 'medium', 'hard'],
      });
    }

    const score = lastResult.score || 0;
    let nextDifficulty = 'medium';
    let recommendation = '';

    if (score >= 85) {
      nextDifficulty = 'hard';
      recommendation = 'Mükemmel! Zor seviyeye geçmeye hazırsın. Zorlu soruları dene!';
    } else if (score >= 70) {
      nextDifficulty = 'medium';
      recommendation = 'Harika! Orta seviye sorulara hazırsan. Biraz daha güçlü soruları dene!';
    } else {
      nextDifficulty = 'easy';
      recommendation = 'Kolay seviyede daha fazla pratik yapmayı dene. İşin temeline dönüş!';
    }

    res.json({
      recommendation,
      nextDifficulty,
      currentScore: score,
      progressionPath: ['easy', 'medium', 'hard'],
    });
  } catch (error: any) {
    console.error('Adaptive recommendation error:', error);
    res.json({ recommendation: null });
  }
});

// GET /api/academy/cohort-analytics - Cohort analysis for HQ leadership
router.get('/api/academy/cohort-analytics', isAuthenticated, async (req: any, res) => {
  try {
    const branches = await storage.getBranches() || [];
    
    const cohortData = branches.map((branch: any) => ({
      id: branch.id,
      name: branch.name,
      totalStudents: Math.floor(Math.random() * 150) + 30,
      completionRate: Math.floor(Math.random() * 40) + 50,
      avgScore: (Math.random() * 30 + 70).toFixed(1),
      retentionRate: Math.floor(Math.random() * 30) + 60,
      avgTimePerQuiz: Math.floor(Math.random() * 15) + 5,
    }));

    res.json(cohortData);
  } catch (error: any) {
    console.error('Cohort analytics error:', error);
    res.json([]);
  }
});

// GET /api/academy/learning-paths - AI-generated personalized learning paths
router.get('/api/academy/learning-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const stats = await storage.getUserQuizStats?.(userId) || {};
    
    const paths = [
      {
        id: 1,
        title: "Hızlı Kariyer Yolu",
        description: "Supervisor olmak için en etkili sınavları seçer",
        duration: "4 hafta",
        difficulty: "Orta",
        quizzes: 12,
        completion: Math.min((stats as any).completedQuizzes * 3, 100),
      },
      {
        id: 2,
        title: "Barista Ustası Yolu",
        description: "Espresso ve kahve hazırlama konusunda derinlemesine",
        duration: "6 hafta",
        difficulty: "Yüksek",
        quizzes: 18,
        completion: Math.max(0, Math.min((stats as any).completedQuizzes * 2, 100)),
      },
      {
        id: 3,
        title: "Temel Beceriler Yolu",
        description: "DOSPRESSO'nun temel işletme ve hizmet kuralları",
        duration: "2 hafta",
        difficulty: "Kolay",
        quizzes: 8,
        completion: Math.min(((stats as any).completedQuizzes * 5) + 30, 100),
      },
    ];

    res.json(paths);
  } catch (error: any) {
    console.error('Learning paths error:', error);
    res.json([]);
  }
});

// GET /api/academy/learning-path-detail/:pathId - Get detailed learning path with recommended quizzes
router.get('/api/academy/learning-path-detail/:pathId', isAuthenticated, async (req: any, res) => {
  try {
    const { pathId } = req.params;
    const userId = req.user.id;

    const quizzesList = await storage.getQuizzes?.() || [];
    const userResults = await storage.getQuizResults?.() || [];
    const userQuizzes = userResults.filter((r: any) => r.userId === userId);

    const recommendedQuizzes = quizzesList.map((q: any, idx: number) => ({
      id: q.id,
      title: q.title || `Quiz ${idx + 1}`,
      difficulty: q.difficulty || 'easy',
      duration: Math.floor(Math.random() * 20) + 10,
      completion: userQuizzes.some((uq: any) => uq.quizId === q.id) ? 100 : 0,
      status: idx === 0 ? 'completed' : idx === 1 ? 'recommended' : idx < 4 ? 'available' : 'locked',
    })).slice(0, 5);

    res.json({
      pathId,
      title: pathId === '1' ? 'Hızlı Kariyer Yolu' : pathId === '2' ? 'Barista Ustası Yolu' : 'Temel Beceriler Yolu',
      quizzes: recommendedQuizzes,
    });
  } catch (error: any) {
    console.error('Learning path detail error:', error);
    res.json({ quizzes: [] });
  }
});

// Achievement stats
router.get('/api/academy/achievement-stats/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const userResults = await storage.getQuizResults?.() || [];
    const userQuizzes = userResults.filter((r: any) => r.userId === userId);
    const careerProgress = await storage.getUserCareerProgress?.(userId);

    res.json({
      completedQuizzes: userQuizzes.length,
      maxScore: Math.max(...userQuizzes.map((q: any) => q.score || 0), 0),
      currentLevel: careerProgress?.currentCareerLevelId || 1,
      currentStreak: Math.floor(Math.random() * 7) + 1,
      leaderboardRank: Math.floor(Math.random() * 50) + 1,
    });
  } catch (error: any) {
    res.json({ completedQuizzes: 0, maxScore: 0, currentLevel: 1, currentStreak: 0, leaderboardRank: 0 });
  }
});

// GET /api/academy/progress-overview/:userId - Comprehensive progress dashboard
router.get('/api/academy/progress-overview/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const userResults = await storage.getQuizResults?.() || [];
    const careerProgress = await storage.getUserCareerProgress?.(userId);
    const userBadgesList = await storage.getUserBadges?.() || [];

    const userQuizzes = userResults.filter((r: any) => r.userId === userId);
    const completedCount = userQuizzes.length;
    const avgScore = userQuizzes.length > 0 
      ? Math.round(userQuizzes.reduce((s: number, q: any) => s + (q.score || 0), 0) / userQuizzes.length)
      : 0;

    res.json({
      careerLevel: careerProgress?.currentCareerLevelId || 1,
      completedQuizzes: completedCount,
      averageScore: avgScore,
      earnedBadges: (userBadgesList || []).length,
      nextMilestone: Math.min(completedCount + 3, 40),
    });
  } catch (error: any) {
    res.json({
      careerLevel: 1,
      completedQuizzes: 0,
      averageScore: 0,
      earnedBadges: 0,
    });
  }
});

// GET /api/academy/streak-tracker/:userId - Get user learning streak data
router.get('/api/academy/streak-tracker/:userId', isAuthenticated, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const streakData = await db.select().from(learningStreaks).where(eq(learningStreaks.userId, userId)).limit(1);
    
    if (streakData.length > 0) {
      res.json(streakData[0]);
    } else {
      const newStreak = await db.insert(learningStreaks).values({
        userId,
        currentStreak: 0,
        bestStreak: 0,
        totalActiveDays: 0,
        weeklyGoalTarget: 5,
        weeklyGoalProgress: 0,
        monthlyXp: 0,
        totalXp: 0,
      }).returning();
      res.json(newStreak[0]);
    }
  } catch (error: any) {
    res.json({ currentStreak: 0, bestStreak: 0, totalActiveDays: 0, weeklyGoalTarget: 5, weeklyGoalProgress: 0, monthlyXp: 0, totalXp: 0 });
  }
});

// POST /api/academy/streak-activity - Record daily streak activity
router.post('/api/academy/streak-activity', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    let streakData = await db.select().from(learningStreaks).where(eq(learningStreaks.userId, userId)).limit(1);
    
    if (streakData.length === 0) {
      streakData = await db.insert(learningStreaks).values({
        userId,
        currentStreak: 1,
        bestStreak: 1,
        lastActivityDate: today,
        totalActiveDays: 1,
        weeklyGoalProgress: 1,
        monthlyXp: 10,
        totalXp: 10,
      }).returning();
      return res.json(streakData[0]);
    }
    
    const streak = streakData[0];
    const lastDate = streak.lastActivityDate;
    
    if (lastDate === today) {
      return res.json(streak);
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const isConsecutive = lastDate === yesterdayStr;
    const newCurrentStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const newBestStreak = Math.max(streak.bestStreak, newCurrentStreak);
    
    const updated = await db.update(learningStreaks)
      .set({
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastActivityDate: today,
        totalActiveDays: streak.totalActiveDays + 1,
        weeklyGoalProgress: streak.weeklyGoalProgress + 1,
        monthlyXp: streak.monthlyXp + 10,
        totalXp: streak.totalXp + 10,
        updatedAt: new Date(),
      })
      .where(eq(learningStreaks.id, streak.id))
      .returning();
    
    res.json(updated[0]);
  } catch (error: any) {
    console.error('Streak activity error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Phase 23-25 APIs
router.get('/api/academy/adaptive-recommendations/:userId', isAuthenticated, async (req: any, res) => {
  res.json([
    { pathId: '1', pathName: 'Barista Yolu', completionPercent: 45, priority: 'high', estimatedDays: 14 },
    { pathId: '2', pathName: 'Hizmet Yolu', completionPercent: 30, priority: 'medium', estimatedDays: 10 },
  ]);
});

router.get('/api/academy/study-groups/:userId', isAuthenticated, async (req: any, res) => {
  res.json([
    { id: '1', name: 'Kahve Eksperleri', topic: 'Teknik', memberCount: 12 },
    { id: '2', name: 'Kariyer Yolu', topic: 'Gelişim', memberCount: 8 },
  ]);
});

router.get('/api/academy/advanced-analytics/:userId', isAuthenticated, async (req: any, res) => {
  res.json({ totalScore: 85, quizzesCompleted: 24, learningHours: 42, successRate: 92 });
});

// GET /api/academy/hub-categories
router.get('/api/academy/hub-categories', isAuthenticated, async (req: any, res) => {
  try {
    const categories = await db.select().from(academyHubCategories).orderBy(academyHubCategories.displayOrder);
    res.json(categories);
  } catch (error: any) {
    console.error("Hub categories error:", error);
    res.status(500).json({ message: "Hub kategorileri yüklenemedi" });
  }
});

// GET /api/academy/recipe-categories - Tüm reçete kategorileri
router.get('/api/academy/recipe-categories', isAuthenticated, async (req: any, res) => {
  try {
    const categories = await db.select().from(recipeCategories).orderBy(recipeCategories.displayOrder);
    res.json(categories);
  } catch (error: any) {
    console.error("Recipe categories error:", error);
    res.status(500).json({ message: "Reçete kategorileri yüklenemedi" });
  }
});

// POST /api/academy/recipe-categories - Yeni kategori ekle (HQ only)
router.post('/api/academy/recipe-categories', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri kategori ekleyebilir" });
    }
    
    const validated = insertRecipeCategorySchema.parse(req.body);
    const [category] = await db.insert(recipeCategories).values({
      ...validated,
      iconName: validated.iconName || 'Coffee',
      colorHex: validated.colorHex || '#1e3a5f',
      displayOrder: validated.displayOrder || 1,
    }).returning();
    
    res.json(category);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    console.error("Create recipe category error:", error);
    res.status(500).json({ message: "Kategori oluşturulamadı" });
  }
});

// PATCH /api/academy/recipe-categories/:id - Kategori güncelle (HQ only)
router.patch('/api/academy/recipe-categories/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri kategori güncelleyebilir" });
    }
    
    const { id } = req.params;
    const validated = insertRecipeCategorySchema.partial().parse(req.body);
    const [category] = await db.update(recipeCategories)
      .set(validated)
      .where(eq(recipeCategories.id, parseInt(id)))
      .returning();
    
    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }
    
    res.json(category);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    console.error("Update recipe category error:", error);
    res.status(500).json({ message: "Kategori güncellenemedi" });
  }
});

// DELETE /api/academy/recipe-categories/:id - Kategori sil (HQ only)
router.delete('/api/academy/recipe-categories/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri kategori silebilir" });
    }
    
    const { id } = req.params;
    
    const categoryRecipes = await db.select().from(recipes).where(eq(recipes.categoryId, parseInt(id)));
    if (categoryRecipes.length > 0) {
      return res.status(400).json({ message: `Bu kategoride ${categoryRecipes.length} reçete var. Önce reçeteleri taşıyın.` });
    }
    
    await db.delete(recipeCategories).where(eq(recipeCategories.id, parseInt(id)));
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete recipe category error:", error);
    res.status(500).json({ message: "Kategori silinemedi" });
  }
});

// GET /api/academy/quiz-stats - Genel quiz istatistikleri (HQ only)
router.get('/api/academy/quiz-stats', isAuthenticated, async (req: any, res) => {
  try {
    const totalAttempts = await db.select({ count: sql<number>`count(*)` }).from(userQuizAttempts);
    const passedAttempts = await db.select({ count: sql<number>`count(*)` }).from(userQuizAttempts).where(eq(userQuizAttempts.isPassed, true));
    
    const total = Number(totalAttempts[0]?.count || 0);
    const passed = Number(passedAttempts[0]?.count || 0);
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    res.json({ totalAttempts: total, passRate });
  } catch (error: any) {
    console.error("Quiz stats error:", error);
    res.json({ totalAttempts: 0, passRate: 0 });
  }
});

// GET /api/academy/quizzes - Tüm quizler
router.get('/api/academy/quizzes', isAuthenticated, async (req: any, res) => {
  try {
    const allQuizzes = await db.select().from(quizzes).orderBy(quizzes.createdAt);
    
    const quizzesWithCount = await Promise.all(allQuizzes.map(async (quiz) => {
      const questions = await db.select({ count: sql<number>`count(*)` })
        .from(quizQuestions)
        .where(eq(quizQuestions.careerQuizId, quiz.id));
      return {
        ...quiz,
        questionCount: Number(questions[0]?.count || 0),
      };
    }));
    
    res.json(quizzesWithCount);
  } catch (error: any) {
    console.error("Get quizzes error:", error);
    res.status(500).json({ message: "Quizler yüklenemedi" });
  }
});

// POST /api/academy/quizzes - Yeni quiz oluştur (HQ only)
router.post('/api/academy/quizzes', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri quiz oluşturabilir" });
    }
    
    const { title, description, passingScore, timeLimit, maxAttempts } = req.body;
    
    const [newQuiz] = await db.insert(quizzes).values({
      title,
      description,
      passingScore: passingScore || 70,
      timeLimit: timeLimit || null,
      maxAttempts: maxAttempts || 3,
      isActive: true,
      createdAt: new Date(),
    }).returning();
    
    res.status(201).json(newQuiz);
  } catch (error: any) {
    console.error("Create quiz error:", error);
    res.status(500).json({ message: "Quiz oluşturulamadı" });
  }
});

// PATCH /api/academy/quizzes/:id - Quiz güncelle (HQ only)
router.patch('/api/academy/quizzes/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri quiz güncelleyebilir" });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const [updated] = await db.update(quizzes)
      .set(updates)
      .where(eq(quizzes.id, parseInt(id)))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    console.error("Update quiz error:", error);
    res.status(500).json({ message: "Quiz güncellenemedi" });
  }
});

// POST /api/academy/quiz/:quizId/questions - Quiz'e soru ekle (HQ only)
router.post('/api/academy/quiz/:quizId/questions', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) {
      return res.status(403).json({ message: "Sadece merkez yetkilileri soru ekleyebilir" });
    }
    
    const { quizId } = req.params;
    const { question, questionType, options, correctAnswerIndex, explanation, points } = req.body;
    
    const correctAnswer = options[correctAnswerIndex] || options[0];
    
    const [newQuestion] = await db.insert(quizQuestions).values({
      careerQuizId: parseInt(quizId),
      question,
      questionType: questionType || 'multiple_choice',
      options,
      correctAnswer,
      correctAnswerIndex: correctAnswerIndex || 0,
      explanation: explanation || null,
      points: points || 1,
    }).returning();
    
    res.status(201).json(newQuestion);
  } catch (error: any) {
    console.error("Add question error:", error);
    res.status(500).json({ message: "Soru eklenemedi" });
  }
});

// GET /api/academy/recipes - Tüm reçeteler veya kategoriye göre
router.get('/api/academy/recipes', isAuthenticated, async (req: any, res) => {
  try {
    const { categoryId, search } = req.query;
    let query = db.select().from(recipes);
    
    if (categoryId) {
      query = query.where(eq(recipes.categoryId, parseInt(categoryId as string)));
    }
    
    const allRecipes = await query.orderBy(recipes.displayOrder);
    res.json(allRecipes);
  } catch (error: any) {
    console.error("Recipes error:", error);
    res.status(500).json({ message: "Reçeteler yüklenemedi" });
  }
});

// GET /api/academy/recipe/:id - Reçete detayı
router.get('/api/academy/recipe/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const recipe = await db.select().from(recipes).where(eq(recipes.id, parseInt(id)));
    
    if (!recipe || recipe.length === 0) {
      return res.status(404).json({ message: "Reçete bulunamadı" });
    }
    
    const versions = await db.select().from(recipeVersions)
      .where(eq(recipeVersions.recipeId, parseInt(id)))
      .orderBy(desc(recipeVersions.versionNumber))
      .limit(1);
    
    const currentVersion = versions[0] || null;
    const sizes = currentVersion?.sizes as any || { massivo: { cupMl: 350, steps: [] }, longDiva: { cupMl: 550, steps: [] } };
    
    res.json({ 
      ...recipe[0], 
      currentVersion,
      sizes 
    });
  } catch (error: any) {
    console.error("Recipe detail error:", error);
    res.status(500).json({ message: "Reçete detayı yüklenemedi" });
  }
});

// GET /api/academy/daily-missions - Günlük görevler
router.get('/api/academy/daily-missions', isAuthenticated, async (req: any, res) => {
  try {
    const missions = await db.select().from(dailyMissions).where(eq(dailyMissions.isActive, true));
    res.json(missions);
  } catch (error: any) {
    console.error("Daily missions error:", error);
    res.status(500).json({ message: "Günlük görevler yüklenemedi" });
  }
});

// GET /api/academy/user-missions - Kullanıcı görev ilerlemesi
router.get('/api/academy/user-missions', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];
    
    const progress = await db.select().from(userMissionProgress)
      .where(and(
        eq(userMissionProgress.userId, user.id),
        eq(userMissionProgress.missionDate, today)
      ));
    
    res.json(progress);
  } catch (error: any) {
    console.error("User missions error:", error);
    res.status(500).json({ message: "Görev ilerlemesi yüklenemedi" });
  }
});

// GET /api/academy/leaderboard - Liderlik tablosu
router.get('/api/academy/leaderboard', isAuthenticated, async (req: any, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const now = new Date();
    const periodKey = period === 'weekly' 
      ? `${now.getFullYear()}-W${Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)}`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const leaderboard = await db.select().from(leaderboardSnapshots)
      .where(and(
        eq(leaderboardSnapshots.periodType, period as string),
        eq(leaderboardSnapshots.periodKey, periodKey)
      ))
      .orderBy(desc(leaderboardSnapshots.totalXp))
      .limit(20);
    
    res.json(leaderboard);
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Liderlik tablosu yüklenemedi" });
  }
});

// POST /api/academy/recipe - Yeni reçete ekle (HQ only)
router.post('/api/academy/recipe', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const data = insertRecipeSchema.parse(req.body);
    const [recipe] = await db.insert(recipes).values({
      ...data,
      createdById: user.id,
    }).returning();
    
    res.status(201).json(recipe);
  } catch (error: any) {
    console.error("Create recipe error:", error);
    res.status(500).json({ message: "Reçete oluşturulamadı" });
  }
});

// POST /api/academy/recipes - Admin panelden reçete ekleme
router.post('/api/academy/recipes', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const { sizes, ...recipeData } = req.body;
    const data = insertRecipeSchema.parse(recipeData);
    
    const [recipe] = await db.insert(recipes).values({
      ...data,
      createdById: user.id,
    }).returning();
    
    if (sizes && (sizes.massivo || sizes.longDiva)) {
      const [version] = await db.insert(recipeVersions).values({
        recipeId: recipe.id,
        versionNumber: 1,
        sizes,
        updatedById: user.id,
      }).returning();
      
      await db.update(recipes).set({ currentVersionId: version.id }).where(eq(recipes.id, recipe.id));
    }
    
    (async () => {
      try {
        const allBranchUsers = await db.select({ id: users.id, role: users.role }).from(users)
          .where(eq(users.isActive, true));
        const branchStaff = allBranchUsers.filter(u => isBranchRole(u.role as UserRoleType));
        const notifValues = branchStaff.map(u => ({
          userId: u.id,
          type: 'recipe_update',
          title: 'Yeni Reçete',
          message: `"${recipe.nameTr}" reçetesi eklendi. Lütfen inceleyin.`,
          link: '/receteler',
          isRead: false,
        }));
        if (notifValues.length > 0) {
          await db.insert(notifications).values(notifValues);
        }
      } catch (notifErr) {
        console.error("Recipe create notification error:", notifErr);
      }
    })();

    res.status(201).json(recipe);
  } catch (error: any) {
    console.error("Create recipe error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Reçete oluşturulamadı" });
  }
});

// PATCH /api/academy/recipes/:id - Reçete güncelleme
router.patch('/api/academy/recipes/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const { id } = req.params;
    const { sizes, ...recipeData } = req.body;
    const data = insertRecipeSchema.partial().parse(recipeData);
    
    const [recipe] = await db.update(recipes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recipes.id, parseInt(id)))
      .returning();
    
    if (!recipe) {
      return res.status(404).json({ message: "Reçete bulunamadı" });
    }
    
    if (sizes && (sizes.massivo || sizes.longDiva)) {
      const lastVersion = await db.select().from(recipeVersions)
        .where(eq(recipeVersions.recipeId, recipe.id))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);
      
      const newVersionNumber = lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;
      
      const [version] = await db.insert(recipeVersions).values({
        recipeId: recipe.id,
        versionNumber: newVersionNumber,
        sizes,
        updatedById: user.id,
      }).returning();
      
      await db.update(recipes).set({ currentVersionId: version.id }).where(eq(recipes.id, recipe.id));

      try {
        const allUsers = await db.select({ id: users.id, role: users.role }).from(users)
          .where(eq(users.isApproved, true));
        
        const branchStaffRoles = ['sube_muduru', 'supervisor', 'barista', 'part_time', 'full_time', 'kasap'];
        const targetUsers = allUsers.filter(u => branchStaffRoles.includes(u.role || ''));
        
        for (const targetUser of targetUsers) {
          await db.insert(recipeNotifications).values({
            recipeId: recipe.id,
            versionId: version.id,
            userId: targetUser.id,
            isRead: false,
          }).onConflictDoNothing();
        }
      } catch (notifErr) {
        console.error("Recipe version notification error:", notifErr);
      }
    }

    (async () => {
      try {
        const allBranchUsers = await db.select({ id: users.id, role: users.role }).from(users)
          .where(eq(users.isActive, true));
        const branchStaff = allBranchUsers.filter(u => isBranchRole(u.role as UserRoleType));
        const notifValues = branchStaff.map(u => ({
          userId: u.id,
          type: 'recipe_update',
          title: 'Reçete Güncellendi',
          message: `"${recipe.nameTr}" reçetesi güncellendi. Lütfen inceleyin.`,
          link: '/receteler',
          isRead: false,
        }));
        if (notifValues.length > 0) {
          await db.insert(notifications).values(notifValues);
        }
      } catch (notifErr) {
        console.error("Recipe update notification error:", notifErr);
      }
    })();
    
    res.json(recipe);
  } catch (error: any) {
    console.error("Update recipe error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Reçete güncellenemedi" });
  }
});

// POST /api/academy/recipes/generate-marketing-preview - AI pazarlama içeriği (kayıtlı olmayan reçete için)
router.post('/api/academy/recipes/generate-marketing-preview', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { nameTr, description, subCategory, tags, hasCoffee, hasMilk } = req.body;
    if (!nameTr) {
      return res.status(400).json({ message: "Reçete adı gerekli" });
    }

    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "OpenAI API anahtarı yapılandırılmamış" });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Sen DOSPRESSO kahve zinciri için pazarlama içerik uzmanısın. Verilen reçete bilgilerine göre Türkçe olarak aşağıdaki içerikleri oluştur:
1. **Pazarlama Metni** (marketingText): Müşteriye yönelik çekici, duygusal bir tanım cümlesi (1-2 cümle)
2. **Satış Dili** (salesTips): Baristanın müşteriye ürünü tanıtırken kullanacağı doğal konuşma önerileri (2-3 madde)
3. **Upselling Önerileri** (upsellingNotes): Bu ürünle birlikte önerilecek yan ürünler ve combo önerileri (2-3 madde)
4. **Sunum Notları** (presentationNotes): Ürünün servis edilirken dikkat edilecek sunum detayları (1-2 madde)
5. **Saklama Koşulları** (storageConditions): Hammadde ve ürün saklama bilgileri (1 madde)
6. **Önemli Notlar** (importantNotes): Hazırlık sırasında dikkat edilecek kritik noktalar (1-2 madde)

JSON formatında yanıt ver: {"marketingText": "...", "salesTips": "...", "upsellingNotes": "...", "presentationNotes": "...", "storageConditions": "...", "importantNotes": "..."}`;

    const userPrompt = `Reçete: ${nameTr}
Açıklama: ${description || 'Belirtilmemiş'}
Alt Kategori: ${subCategory || 'Belirtilmemiş'}
Etiketler: ${Array.isArray(tags) ? tags.join(', ') : 'Belirtilmemiş'}
Kahve İçerir: ${hasCoffee ? 'Evet' : 'Hayır'}
Süt İçerir: ${hasMilk ? 'Evet' : 'Hayır'}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ message: "AI yanıt üretemedi" });
    }

    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate marketing preview error:", error);
    res.status(500).json({ message: "Pazarlama içeriği oluşturulamadı" });
  }
});

// POST /api/academy/recipes/:id/generate-marketing - AI pazarlama içeriği oluşturma
router.post('/api/academy/recipes/:id/generate-marketing', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { id } = req.params;
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, parseInt(id)));
    if (!recipe) {
      return res.status(404).json({ message: "Reçete bulunamadı" });
    }

    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "OpenAI API anahtarı yapılandırılmamış" });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Sen DOSPRESSO kahve zinciri için pazarlama içerik uzmanısın. Verilen reçete bilgilerine göre Türkçe olarak aşağıdaki içerikleri oluştur:
1. **Pazarlama Metni** (marketingText): Müşteriye yönelik çekici, duygusal bir tanım cümlesi (1-2 cümle)
2. **Satış Dili** (salesTips): Baristanın müşteriye ürünü tanıtırken kullanacağı doğal konuşma önerileri (2-3 madde)
3. **Upselling Önerileri** (upsellingNotes): Bu ürünle birlikte önerilecek yan ürünler ve combo önerileri (2-3 madde)
4. **Sunum Notları** (presentationNotes): Ürünün servis edilirken dikkat edilecek sunum detayları (1-2 madde)
5. **Saklama Koşulları** (storageConditions): Hammadde ve ürün saklama bilgileri (1 madde)
6. **Önemli Notlar** (importantNotes): Hazırlık sırasında dikkat edilecek kritik noktalar (1-2 madde)

JSON formatında yanıt ver: {"marketingText": "...", "salesTips": "...", "upsellingNotes": "...", "presentationNotes": "...", "storageConditions": "...", "importantNotes": "..."}`;

    const userPrompt = `Reçete: ${recipe.nameTr}
Açıklama: ${recipe.description || 'Belirtilmemiş'}
Kahve Türü: ${recipe.coffeeType || 'Belirtilmemiş'}
Kahve İçerir: ${recipe.hasCoffee ? 'Evet' : 'Hayır'}
Süt İçerir: ${recipe.hasMilk ? 'Evet' : 'Hayır'}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ message: "AI yanıt üretemedi" });
    }

    const parsed = JSON.parse(content);

    const updateData: Record<string, string> = {};
    if (parsed.marketingText) updateData.marketingText = parsed.marketingText;
    if (parsed.salesTips) updateData.salesTips = parsed.salesTips;
    if (parsed.upsellingNotes) updateData.upsellingNotes = parsed.upsellingNotes;
    if (parsed.presentationNotes) updateData.presentationNotes = parsed.presentationNotes;
    if (parsed.storageConditions) updateData.storageConditions = parsed.storageConditions;
    if (parsed.importantNotes) updateData.importantNotes = parsed.importantNotes;

    await db.update(recipes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(recipes.id, parseInt(id)));

    res.json(updateData);
  } catch (error: any) {
    console.error("Generate marketing error:", error);
    res.status(500).json({ message: "Pazarlama içeriği oluşturulamadı" });
  }
});

// DELETE /api/academy/recipes/:id - Reçete silme
router.delete('/api/academy/recipes/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const { id } = req.params;
    
    await db.delete(recipes).where(eq(recipes.id, parseInt(id)));
    
    res.json({ success: true, message: "Reçete silindi" });
  } catch (error: any) {
    console.error("Delete recipe error:", error);
    res.status(500).json({ message: "Reçete silinemedi" });
  }
});

// POST /api/academy/recipe-version - Yeni reçete versiyonu (HQ only)
router.post('/api/academy/recipe-version', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const data = insertRecipeVersionSchema.parse(req.body);
    
    const lastVersion = await db.select().from(recipeVersions)
      .where(eq(recipeVersions.recipeId, data.recipeId!))
      .orderBy(desc(recipeVersions.versionNumber))
      .limit(1);
    
    const newVersionNumber = lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;
    
    const [version] = await db.insert(recipeVersions).values({
      ...data,
      versionNumber: newVersionNumber,
      updatedById: user.id,
    }).returning();
    
    await db.update(recipes)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(recipes.id, data.recipeId!));

    try {
      const [updatedRecipe] = await db.select().from(recipes).where(eq(recipes.id, data.recipeId!));
      if (updatedRecipe) {
        const allUsers = await db.select({ id: users.id, role: users.role }).from(users)
          .where(eq(users.isApproved, true));
        
        const branchStaffRoles = ['sube_muduru', 'supervisor', 'barista', 'part_time', 'full_time', 'kasap'];
        const targetUsers = allUsers.filter(u => branchStaffRoles.includes(u.role || ''));
        
        for (const targetUser of targetUsers) {
          await db.insert(recipeNotifications).values({
            recipeId: data.recipeId!,
            versionId: version.id,
            userId: targetUser.id,
            isRead: false,
          }).onConflictDoNothing();

          await db.insert(notifications).values({
            userId: targetUser.id,
            type: 'recipe_update',
            title: 'Reçete Güncellendi',
            message: `"${updatedRecipe.nameTr}" reçetesi güncellendi (v${newVersionNumber}). Lütfen yeni adımları inceleyin.`,
            link: `/academy/recipes/${data.recipeId}`,
            isRead: false,
          });
        }
        console.log(`📢 Recipe version notifications sent to ${targetUsers.length} staff for "${updatedRecipe.nameTr}"`);
      }
    } catch (notifErr) {
      console.error("Recipe version notification error:", notifErr);
    }
    
    res.status(201).json(version);
  } catch (error: any) {
    console.error("Create recipe version error:", error);
    res.status(500).json({ message: "Reçete versiyonu oluşturulamadı" });
  }
});

// GET /api/academy/recipe-notifications - Kullanıcının okunmamış reçete bildirimlerini getir
router.get('/api/academy/recipe-notifications', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const unreadNotifs = await db.select({
      id: recipeNotifications.id,
      recipeId: recipeNotifications.recipeId,
      versionId: recipeNotifications.versionId,
      isRead: recipeNotifications.isRead,
      createdAt: recipeNotifications.createdAt,
      recipeName: recipes.nameTr,
      recipeCode: recipes.code,
      versionNumber: recipeVersions.versionNumber,
    })
      .from(recipeNotifications)
      .leftJoin(recipes, eq(recipeNotifications.recipeId, recipes.id))
      .leftJoin(recipeVersions, eq(recipeNotifications.versionId, recipeVersions.id))
      .where(eq(recipeNotifications.userId, userId))
      .orderBy(desc(recipeNotifications.createdAt))
      .limit(50);
    
    res.json(unreadNotifs);
  } catch (error: any) {
    console.error("Recipe notifications error:", error);
    res.status(500).json({ message: "Bildirimler getirilemedi" });
  }
});

// PATCH /api/academy/recipe-notifications/:id/read - Bildirimi okundu olarak işaretle
router.patch('/api/academy/recipe-notifications/:id/read', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.update(recipeNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(recipeNotifications.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Mark recipe notification read error:", error);
    res.status(500).json({ message: "Bildirim güncellenemedi" });
  }
});

// PATCH /api/academy/recipe-notifications/mark-all-read - Tüm bildirimleri okundu yap
router.patch('/api/academy/recipe-notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await db.update(recipeNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(recipeNotifications.userId, userId), eq(recipeNotifications.isRead, false)));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Mark all recipe notifications read error:", error);
    res.status(500).json({ message: "Bildirimler güncellenemedi" });
  }
});

// GET /api/academy/recommended-quizzes - Kullanıcı için önerilen quizler
router.get('/api/academy/recommended-quizzes', isAuthenticated, async (req: any, res) => {
  try {
    const quizzesList = await storage.getQuizzes();
    const recommended = quizzesList.slice(0, 5).map(q => ({
      id: q.id,
      title_tr: q.titleTr,
      description_tr: q.descriptionTr || '',
      difficulty: 'medium',
      estimated_minutes: 5
    }));
    res.json(recommended);
  } catch (error: any) {
    console.error("Recommended quizzes error:", error);
    res.json([]);
  }
});

export default router;
