import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  branches,
  users,
  customerFeedback,
} from "@shared/schema";
import { eq, and, sql, count, avg } from "drizzle-orm";

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

    const branchData = [];
    for (const branch of targetBranches) {
      const [staffCount] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.branchId, branch.id), eq(users.isActive, true)));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let avgRating = 0;
      let feedbackCount = 0;
      try {
        const [fb] = await db
          .select({
            avgRating: avg(customerFeedback.rating),
            count: count(),
          })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, branch.id),
              sql`${customerFeedback.createdAt} >= ${sevenDaysAgo}`
            )
          );
        avgRating = fb?.avgRating ? parseFloat(String(fb.avgRating)) : 0;
        feedbackCount = fb?.count || 0;
      } catch {}

      branchData.push({
        id: branch.id,
        name: branch.name,
        staffCount: staffCount?.count || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        feedbackCount,
      });
    }

    res.json({
      branches: branchData,
      totalBranches: targetBranches.length,
    });
  } catch (error: any) {
    console.error("Franchise summary error:", error);
    res.status(500).json({ message: "Franchise ozeti yuklenemedi" });
  }
});

export default router;
