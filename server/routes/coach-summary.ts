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

const router = Router();

router.get("/api/coach-summary", isAuthenticated, async (req: any, res) => {
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
          currentCareerLevelId: userCareerProgress.currentCareerLevelId,
          dangerZoneMonths: userCareerProgress.dangerZoneMonths,
        })
        .from(userCareerProgress)
        .where(lt(userCareerProgress.compositeScore, 65))
        .limit(10);

      for (const ucp of lowScoreUsers) {
        const [user] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            branchId: users.branchId,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, ucp.userId));

        if (!user) continue;

        const branch = allBranches.find((b) => b.id === user.branchId);

        const [level] = await db
          .select({ titleTr: careerLevels.titleTr })
          .from(careerLevels)
          .where(eq(careerLevels.id, ucp.currentCareerLevelId));

        attentionNeeded.push({
          userId: ucp.userId,
          name: `${user.firstName} ${user.lastName}`,
          branchName: branch?.name || "Bilinmiyor",
          branchId: user.branchId,
          role: user.role,
          compositeScore: Math.round(ucp.compositeScore || 0),
          currentLevel: level?.titleTr || "Belirsiz",
          dangerZoneMonths: ucp.dangerZoneMonths || 0,
          reason: (ucp.compositeScore || 0) < 50 ? "Kritik dusuk skor" : "Dusuk skor",
        });
      }
    } catch {}

    attentionNeeded.sort((a, b) => a.compositeScore - b.compositeScore);

    const branchSummary = allBranches.slice(0, 10).map((b) => ({
      id: b.id,
      name: b.name,
    }));

    let suggestions: any[] = [];
    try {
      suggestions = await getCoachSuggestions(req.user.id);
    } catch {}

    res.json({
      branches: branchSummary,
      attentionNeeded: attentionNeeded.slice(0, 8),
      totalBranches: allBranches.length,
      suggestions,
    });
  } catch (error: any) {
    console.error("Coach summary error:", error);
    res.status(500).json({ message: "Kocluk paneli yuklenemedi" });
  }
});

export default router;
