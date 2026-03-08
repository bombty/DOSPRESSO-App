import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  branches,
  users,
  customerFeedback,
} from "@shared/schema";
import { eq, and, sql, count, avg, inArray } from "drizzle-orm";
import { getHQSuggestions } from "../lib/dobody-suggestions";
import { getLatestSkillInsights, deduplicateSuggestions } from "../agent/skills/skill-registry";

const router = Router();

router.get("/api/franchise-summary", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user.role;
    const userBranchId = req.user.branchId ? Number(req.user.branchId) : null;

    const allowedRoles = ["yatirimci_hq", "yatirimci_branch", "admin", "ceo", "cgo"];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    let targetBranches: any[] = [];
    if (userBranchId && !["admin", "ceo", "cgo"].includes(userRole)) {
      const [branch] = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.id, userBranchId));
      if (branch) targetBranches = [branch];
    } else {
      targetBranches = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.isActive, true));
    }

    const branchIds = targetBranches.map((b) => b.id);

    const staffCounts = branchIds.length > 0
      ? await db
          .select({ branchId: users.branchId, count: count() })
          .from(users)
          .where(and(inArray(users.branchId, branchIds), eq(users.isActive, true)))
          .groupBy(users.branchId)
      : [];

    const staffMap = new Map<number, number>();
    for (const s of staffCounts) {
      if (s.branchId) staffMap.set(s.branchId, s.count);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const feedbackStats = branchIds.length > 0
      ? await db
          .select({
            branchId: customerFeedback.branchId,
            avgRating: avg(customerFeedback.rating),
            count: count(),
          })
          .from(customerFeedback)
          .where(
            and(
              inArray(customerFeedback.branchId, branchIds),
              sql`${customerFeedback.createdAt} >= ${sevenDaysAgo}`
            )
          )
          .groupBy(customerFeedback.branchId)
      : [];

    const feedbackMap = new Map<number, { avg: number; count: number }>();
    for (const f of feedbackStats) {
      feedbackMap.set(f.branchId, {
        avg: f.avgRating ? parseFloat(String(f.avgRating)) : 0,
        count: f.count || 0,
      });
    }

    const branchData = targetBranches.map((branch) => {
      const fb = feedbackMap.get(branch.id);
      return {
        id: branch.id,
        name: branch.name,
        staffCount: staffMap.get(branch.id) || 0,
        avgRating: fb ? Math.round(fb.avg * 10) / 10 : 0,
        feedbackCount: fb?.count || 0,
      };
    });

    let suggestions: any[] = [];
    try {
      suggestions = await getHQSuggestions();
      const userId = req.user.id;
      const skillInsights = await getLatestSkillInsights(userId, userRole);
      suggestions = deduplicateSuggestions([...suggestions, ...skillInsights]);
    } catch (e) {
      console.error("Franchise suggestions error:", e);
    }

    res.json({
      branches: branchData,
      totalBranches: targetBranches.length,
      suggestions,
    });
  } catch (error: any) {
    console.error("Franchise summary error:", error);
    res.status(500).json({ message: "Franchise ozeti yuklenemedi" });
  }
});

export default router;
