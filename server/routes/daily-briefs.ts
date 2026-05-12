// ═══════════════════════════════════════════════════════════════════
// Sprint 48 (Aslan 13 May 2026) — Daily AI Brief API Routes
// ═══════════════════════════════════════════════════════════════════
//   GET  /api/daily-briefs/today    — bugünkü brief
//   GET  /api/daily-briefs/history  — son 7 brief
//   POST /api/daily-briefs/:id/view — gördü
//   POST /api/daily-briefs/:id/reaction — beğeni (helpful/not_helpful)
//   POST /api/daily-briefs/generate-now — ADMIN: tetikle (test için)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { dailyBriefs } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { generateBriefForUser, generateBriefsForAllUsers } from "../services/daily-brief-generator";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GET /api/daily-briefs/today
// Kullanıcının bugünkü brief'i (yoksa otomatik üretmeye çalış)
// ═══════════════════════════════════════════════════════════════════
router.get("/api/daily-briefs/today", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split("T")[0];

    let brief = await db.select()
      .from(dailyBriefs)
      .where(and(
        eq(dailyBriefs.userId, userId),
        eq(dailyBriefs.briefDate, todayStr),
      ))
      .orderBy(desc(dailyBriefs.generatedAt))
      .limit(1);

    // Yoksa, on-demand üret (cost: ~$0.001 / call)
    if (brief.length === 0) {
      const result = await generateBriefForUser(userId);
      if (result.success && result.briefId) {
        brief = await db.select()
          .from(dailyBriefs)
          .where(eq(dailyBriefs.id, result.briefId))
          .limit(1);
      }
    }

    if (brief.length === 0) {
      return res.json({ brief: null, hasContent: false });
    }

    return res.json({ brief: brief[0], hasContent: true });
  } catch (err: any) {
    console.error("[DailyBrief/today]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/daily-briefs/history
// Son 7 günkü brief'leri döner
// ═══════════════════════════════════════════════════════════════════
router.get("/api/daily-briefs/history", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const history = await db.select()
      .from(dailyBriefs)
      .where(and(
        eq(dailyBriefs.userId, userId),
        gte(dailyBriefs.briefDate, sevenDaysAgoStr),
      ))
      .orderBy(desc(dailyBriefs.briefDate))
      .limit(7);

    res.json({ history });
  } catch (err: any) {
    console.error("[DailyBrief/history]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/daily-briefs/:id/view
// Brief gördü olarak işaretle
// ═══════════════════════════════════════════════════════════════════
router.post("/api/daily-briefs/:id/view", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const briefId = parseInt(req.params.id);

    await db.update(dailyBriefs)
      .set({
        viewed: true,
        viewedAt: new Date(),
      })
      .where(and(
        eq(dailyBriefs.id, briefId),
        eq(dailyBriefs.userId, userId),
      ));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[DailyBrief/view]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/daily-briefs/:id/reaction
// Beğeni: 'helpful' | 'not_helpful'
// ═══════════════════════════════════════════════════════════════════
router.post("/api/daily-briefs/:id/reaction", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const briefId = parseInt(req.params.id);
    const { reaction } = req.body;

    if (!["helpful", "not_helpful"].includes(reaction)) {
      return res.status(400).json({ message: "Geçersiz reaction" });
    }

    await db.update(dailyBriefs)
      .set({
        reaction,
        reactionAt: new Date(),
      })
      .where(and(
        eq(dailyBriefs.id, briefId),
        eq(dailyBriefs.userId, userId),
      ));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[DailyBrief/reaction]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/daily-briefs/:id/click
// Bir madde'ye tıklama (analytics)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/daily-briefs/:id/click", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const briefId = parseInt(req.params.id);
    const { itemIndex, actionUrl } = req.body;

    const existing = await db.select({ itemsClicked: dailyBriefs.itemsClicked })
      .from(dailyBriefs)
      .where(and(
        eq(dailyBriefs.id, briefId),
        eq(dailyBriefs.userId, userId),
      ))
      .limit(1);

    const clicked = (existing[0]?.itemsClicked as any[]) || [];
    clicked.push({ itemIndex, actionUrl, clickedAt: new Date().toISOString() });

    await db.update(dailyBriefs)
      .set({ itemsClicked: clicked })
      .where(and(
        eq(dailyBriefs.id, briefId),
        eq(dailyBriefs.userId, userId),
      ));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[DailyBrief/click]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/daily-briefs/generate-now
// ADMIN: brief'i şimdi üret (test için)
// Query: ?userId=X (yoksa kendisi için) ?all=true (herkes için)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/daily-briefs/generate-now", isAuthenticated, async (req: any, res) => {
  try {
    const adminRole = req.user.role;
    const { userId, all } = req.body;

    if (all) {
      // Sadece admin/ceo/cgo
      if (!["admin", "ceo", "cgo"].includes(adminRole)) {
        return res.status(403).json({ message: "Sadece admin/ceo/cgo herkese tetikleyebilir" });
      }

      // Async başlat, hemen response dön
      generateBriefsForAllUsers().then((result) => {
        console.log("[DailyBrief Manual All]", result);
      }).catch((err) => {
        console.error("[DailyBrief Manual All Error]", err);
      });

      return res.json({
        success: true,
        message: "Tüm kullanıcılar için brief üretimi başladı (arka planda çalışır)",
      });
    }

    // Tek kullanıcı için
    const targetId = userId || req.user.id;
    const result = await generateBriefForUser(targetId, { force: true });

    res.json(result);
  } catch (err: any) {
    console.error("[DailyBrief/generate-now]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
