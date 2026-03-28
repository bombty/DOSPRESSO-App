import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  users,
  branches,
  userCareerProgress,
  careerLevels,
} from "@shared/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { getCoachSuggestions } from "../lib/dobody-suggestions";
import { getLatestSkillInsights, deduplicateSuggestions } from "../agent/skills/skill-registry";

const router = Router();

router.get("/api/coach-summary", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (!["coach", "admin", "ceo", "cgo", "trainer"].includes(userRole)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const allBranches = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));

    let attentionNeeded: any[] = [];
    try {
      const lowScoreUsers = await db
        .select({
          userId: userCareerProgress.userId,
          compositeScore: userCareerProgress.compositeScore,
          dangerZoneMonths: userCareerProgress.dangerZoneMonths,
          firstName: users.firstName,
          lastName: users.lastName,
          branchId: users.branchId,
          role: users.role,
          levelTitle: careerLevels.titleTr,
        })
        .from(userCareerProgress)
        .innerJoin(users, eq(userCareerProgress.userId, users.id))
        .leftJoin(careerLevels, eq(userCareerProgress.currentCareerLevelId, careerLevels.id))
        .where(lt(userCareerProgress.compositeScore, 65))
        .limit(10);

      for (const row of lowScoreUsers) {
        const branch = allBranches.find((b) => b.id === row.branchId);
        attentionNeeded.push({
          userId: row.userId,
          name: `${row.firstName} ${row.lastName}`,
          branchName: branch?.name || "Bilinmiyor",
          branchId: row.branchId,
          role: row.role,
          compositeScore: Math.round(row.compositeScore || 0),
          currentLevel: row.levelTitle || "Belirsiz",
          dangerZoneMonths: row.dangerZoneMonths || 0,
          reason: (row.compositeScore || 0) < 50 ? "Kritik dusuk skor" : "Dusuk skor",
        });
      }
    } catch (e) { console.error(e); }

    attentionNeeded.sort((a, b) => a.compositeScore - b.compositeScore);

    const branchSummary = allBranches.slice(0, 10).map((b) => ({
      id: b.id,
      name: b.name,
    }));

    let suggestions: any[] = [];
    try {
      suggestions = await getCoachSuggestions(req.user.id);
    } catch (e) { console.error(e); }

    try {
      const skillInsights = await getLatestSkillInsights(req.user.id, userRole);
      suggestions = deduplicateSuggestions([...suggestions, ...skillInsights]);
    } catch (e) { console.error(e); }

    res.json({
      branches: branchSummary,
      attentionNeeded: attentionNeeded.slice(0, 8),
      totalBranches: allBranches.length,
      suggestions,
    });
  } catch (error: unknown) {
    console.error("Coach summary error:", error);
    res.status(500).json({ message: "Kocluk paneli yuklenemedi" });
  }
});

export default router;
