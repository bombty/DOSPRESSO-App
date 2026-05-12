// ═══════════════════════════════════════════════════════════════════
// Sprint 47 (Aslan 13 May 2026) - Onboarding API Routes
// ═══════════════════════════════════════════════════════════════════
// Mr. Dobody Conversational Onboarding
//   POST /api/onboarding/start     — yeni conversation başlat
//   POST /api/onboarding/message   — kullanıcı mesaj gönderir, AI cevaplar
//   GET  /api/onboarding/status    — kullanıcının onboarding durumu
//   POST /api/onboarding/skip      — onboarding'i atla
//   POST /api/onboarding/complete  — manuel tamamla
//   POST /api/onboarding/reset/:userId — ADMIN: kullanıcı için sıfırla (re-onboarding)

import { Router } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  onboardingConversations,
  onboardingMessages,
  onboardingTemplates,
  users,
} from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { aiChatCall } from "../ai";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GET /api/onboarding/status
// Kullanıcının aktif onboarding durumunu döner
// ═══════════════════════════════════════════════════════════════════
router.get("/api/onboarding/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversation = await db.select()
      .from(onboardingConversations)
      .where(and(
        eq(onboardingConversations.userId, userId),
        eq(onboardingConversations.status, "active")
      ))
      .limit(1);

    if (conversation.length === 0) {
      // Aktif yok — kullanıcı zaten tamamlamış mı?
      const completed = await db.select()
        .from(onboardingConversations)
        .where(and(
          eq(onboardingConversations.userId, userId),
          eq(onboardingConversations.status, "completed")
        ))
        .orderBy(desc(onboardingConversations.completedAt))
        .limit(1);

      return res.json({
        hasActive: false,
        completed: completed.length > 0,
        completedAt: completed[0]?.completedAt || null,
        userRole,
      });
    }

    const conv = conversation[0];
    const messages = await db.select()
      .from(onboardingMessages)
      .where(eq(onboardingMessages.conversationId, conv.id))
      .orderBy(onboardingMessages.createdAt);

    return res.json({
      hasActive: true,
      conversation: conv,
      messages,
      userRole,
    });
  } catch (err: any) {
    console.error("[Onboarding/status]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/onboarding/start
// Yeni conversation başlat — Mr. Dobody karşılar
// ═══════════════════════════════════════════════════════════════════
router.post("/api/onboarding/start", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Mevcut active conversation var mı kontrol
    const existing = await db.select()
      .from(onboardingConversations)
      .where(and(
        eq(onboardingConversations.userId, userId),
        eq(onboardingConversations.status, "active")
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: "Mevcut conversation döndü",
        conversation: existing[0],
      });
    }

    // Rol için template al
    const template = await db.select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.role, userRole))
      .limit(1);

    if (template.length === 0) {
      return res.status(404).json({
        message: `${userRole} rolü için onboarding template bulunamadı`,
      });
    }

    const steps = template[0].steps as any[];
    const firstStep = steps[0];

    // Yeni conversation oluştur
    const [newConv] = await db.insert(onboardingConversations).values({
      userId,
      role: userRole,
      status: "active",
      currentStep: firstStep.id,
      totalSteps: steps.length,
      version: template[0].version,
    }).returning();

    // İlk AI mesajı (welcome)
    const welcomeMessage = await generateAIResponse({
      systemPrompt: template[0].systemPrompt,
      step: firstStep,
      userName: req.user.firstName || req.user.username,
      userMessage: null,
      history: [],
    });

    await db.insert(onboardingMessages).values({
      conversationId: newConv.id,
      sender: "ai",
      step: firstStep.id,
      content: welcomeMessage.content,
      quickReplies: welcomeMessage.quickReplies || null,
      aiModel: welcomeMessage.model,
      tokenCount: welcomeMessage.tokens,
    });

    res.json({
      success: true,
      conversation: newConv,
      firstMessage: welcomeMessage,
    });
  } catch (err: any) {
    console.error("[Onboarding/start]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/onboarding/message
// Kullanıcı mesaj gönderir, AI cevaplar
// ═══════════════════════════════════════════════════════════════════
router.post("/api/onboarding/message", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, content, selectedReply } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ message: "conversationId ve content gerekli" });
    }

    // Conversation kontrol
    const conv = await db.select()
      .from(onboardingConversations)
      .where(and(
        eq(onboardingConversations.id, conversationId),
        eq(onboardingConversations.userId, userId)
      ))
      .limit(1);

    if (conv.length === 0) {
      return res.status(404).json({ message: "Conversation bulunamadı" });
    }

    // Kullanıcı mesajını kaydet
    await db.insert(onboardingMessages).values({
      conversationId,
      sender: "user",
      step: conv[0].currentStep,
      content,
      selectedReply: selectedReply || null,
    });

    // Template + history yükle
    const template = await db.select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.role, conv[0].role))
      .limit(1);

    const messages = await db.select()
      .from(onboardingMessages)
      .where(eq(onboardingMessages.conversationId, conversationId))
      .orderBy(onboardingMessages.createdAt);

    // Sonraki step'i belirle
    const steps = template[0].steps as any[];
    const currentIdx = steps.findIndex((s: any) => s.id === conv[0].currentStep);
    const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

    // AI cevap üret
    const aiResponse = await generateAIResponse({
      systemPrompt: template[0].systemPrompt,
      step: nextStep || steps[currentIdx],
      userName: req.user.firstName || req.user.username,
      userMessage: content,
      history: messages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });

    // AI mesajını kaydet
    await db.insert(onboardingMessages).values({
      conversationId,
      sender: "ai",
      step: nextStep?.id || conv[0].currentStep,
      content: aiResponse.content,
      quickReplies: aiResponse.quickReplies || null,
      aiModel: aiResponse.model,
      tokenCount: aiResponse.tokens,
    });

    // Step ilerlet
    if (nextStep) {
      await db.update(onboardingConversations)
        .set({
          currentStep: nextStep.id,
          lastActivityAt: new Date(),
        })
        .where(eq(onboardingConversations.id, conversationId));
    }

    // Son step mi? → completed yap
    if (!nextStep || currentIdx === steps.length - 1) {
      await db.update(onboardingConversations)
        .set({
          status: "completed",
          completedAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(eq(onboardingConversations.id, conversationId));

      await db.update(users)
        .set({ onboardingComplete: true })
        .where(eq(users.id, userId));
    }

    res.json({
      success: true,
      aiResponse,
      nextStep: nextStep?.id || null,
      completed: !nextStep,
    });
  } catch (err: any) {
    console.error("[Onboarding/message]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/onboarding/skip
// Kullanıcı onboarding'i atlar
// ═══════════════════════════════════════════════════════════════════
router.post("/api/onboarding/skip", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.body;

    await db.update(onboardingConversations)
      .set({
        status: "skipped",
        skippedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(and(
        eq(onboardingConversations.id, conversationId),
        eq(onboardingConversations.userId, userId)
      ));

    await db.update(users)
      .set({ onboardingComplete: true })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[Onboarding/skip]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/onboarding/reset/:userId
// ADMIN: Kullanıcı için onboarding'i sıfırla (re-onboarding)
// Aslan: "Eski Samet ayrılıp yerine başka biri geldiğinde admin tetikler"
// ═══════════════════════════════════════════════════════════════════
router.post("/api/onboarding/reset/:userId", isAuthenticated, async (req: any, res) => {
  try {
    const adminId = req.user.id;
    const adminRole = req.user.role;
    const targetUserId = req.params.userId;
    const { reason } = req.body;

    // Sadece admin/ceo/cgo yapabilir
    if (!["admin", "ceo", "cgo"].includes(adminRole)) {
      return res.status(403).json({ message: "Sadece admin yetkili" });
    }

    // Target user var mı?
    const target = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (target.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Mevcut tüm aktif conversation'ları arşivle
    await db.update(onboardingConversations)
      .set({
        status: "archived",
        archivedAt: new Date(),
        archivedById: adminId,
        archivedReason: reason || "Admin reset",
      })
      .where(and(
        eq(onboardingConversations.userId, targetUserId),
        eq(onboardingConversations.status, "active")
      ));

    // Users tablosunda onboardingComplete'i false yap
    await db.update(users)
      .set({ onboardingComplete: false })
      .where(eq(users.id, targetUserId));

    // Audit log
    console.log(`[Onboarding Reset] admin=${adminId} target=${targetUserId} reason="${reason}"`);

    res.json({
      success: true,
      message: `${target[0].firstName || target[0].username} için onboarding sıfırlandı. Sonraki girişte Mr. Dobody karşılayacak.`,
    });
  } catch (err: any) {
    console.error("[Onboarding/reset]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: AI Response üretme (ChatGPT API)
// ═══════════════════════════════════════════════════════════════════
async function generateAIResponse(opts: {
  systemPrompt: string;
  step: any;
  userName: string;
  userMessage: string | null;
  history: { role: string; content: string }[];
}): Promise<{
  content: string;
  quickReplies?: any[];
  model: string;
  tokens: number;
}> {
  const messages: any[] = [
    {
      role: "system",
      content: `${opts.systemPrompt}

KULLANICI: ${opts.userName}
GÜNCEL ADIM: ${opts.step.id} (${opts.step.title})
ADIM HEDEFİ: ${opts.step.prompt}

KURALLAR:
- Maksimum 3 kısa paragraf
- Türkçe, samimi ve profesyonel
- Bir sonraki adıma geçiş için kullanıcıdan onay/cevap iste
- Eğer adımda quick reply'lar uygunsa öner: ["Evet", "Hayır"] vb.
- JSON formatında cevap ver: { "content": "...", "quickReplies": ["...", "..."] }
- quickReplies opsiyonel — open-ended sorularsa boş array veya undefined`,
    },
    ...opts.history.slice(-6), // son 6 mesaj history
  ];

  if (opts.userMessage) {
    messages.push({ role: "user", content: opts.userMessage });
  }

  try {
    const response = await aiChatCall({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      content: parsed.content || opts.step.prompt,
      quickReplies: parsed.quickReplies || [],
      model: "gpt-4o-mini",
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err: any) {
    console.error("[AI Response Error]", err);
    // Fallback: template'in step prompt'u
    return {
      content: opts.step.prompt,
      quickReplies: ["Devam"],
      model: "fallback",
      tokens: 0,
    };
  }
}

export default router;
