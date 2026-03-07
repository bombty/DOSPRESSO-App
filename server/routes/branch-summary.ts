import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  users,
  branches,
  checklistCompletions,
  branchInventory,
  factoryProducts,
  customerFeedback,
  notifications,
  isHQRole,
  type UserRoleType,
} from "@shared/schema";
import { eq, and, sql, count, avg, lt } from "drizzle-orm";
import { getSupervisorSuggestions } from "../lib/dobody-suggestions";

const router = Router();

const BRANCH_SUMMARY_ROLES = ["supervisor", "supervisor_buddy", "mudur", "admin", "ceo", "cgo", "coach", "trainer", "yatirimci_hq", "yatirimci_branch"];

function canAccessBranch(user: any, branchId: number): boolean {
  const role = user.role as UserRoleType;
  if (!BRANCH_SUMMARY_ROLES.includes(role) && !isHQRole(role)) return false;
  if (role === "admin" || role === "ceo" || role === "cgo") return true;
  if (isHQRole(role)) return true;
  if (user.branchId === branchId || Number(user.branchId) === branchId) return true;
  return false;
}

router.get("/api/branch-summary/:branchId", isAuthenticated, async (req: any, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Gecersiz sube ID" });
    }

    if (!canAccessBranch(req.user, branchId)) {
      return res.status(403).json({ message: "Bu subeye erisim yetkiniz yok" });
    }

    const today = new Date().toISOString().slice(0, 10);

    const [branchInfo] = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId));

    const branchUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.branchId, branchId), eq(users.isActive, true)));

    const activeStaff = branchUsers.length;

    let checklistCompletion = 0;
    let teamStatus: any[] = [];
    try {
      const todayCompletions = await db
        .select({
          userId: checklistCompletions.userId,
          status: checklistCompletions.status,
          completedTasks: checklistCompletions.completedTasks,
          totalTasks: checklistCompletions.totalTasks,
        })
        .from(checklistCompletions)
        .where(
          and(
            eq(checklistCompletions.branchId, branchId),
            eq(checklistCompletions.scheduledDate, today)
          )
        );

      const totalChecklists = todayCompletions.length;
      const completedChecklists = todayCompletions.filter((c) => c.status === "completed").length;
      checklistCompletion = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;

      const completionByUser = new Map<string, string>();
      for (const c of todayCompletions) {
        if (c.status === "completed") {
          completionByUser.set(c.userId, "completed");
        } else if (!completionByUser.has(c.userId)) {
          completionByUser.set(c.userId, c.status);
        }
      }

      teamStatus = branchUsers
        .filter((u) => ["barista", "stajyer", "bar_buddy"].includes(u.role || ""))
        .map((u) => {
          const checkStatus = completionByUser.get(u.id) || "none";
          return {
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            checklistStatus: checkStatus,
          };
        });
    } catch {}

    let customerAvg = 0;
    let feedbackCount = 0;
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const [fb] = await db
        .select({
          avgRating: avg(customerFeedback.rating),
          count: count(),
        })
        .from(customerFeedback)
        .where(
          and(
            eq(customerFeedback.branchId, branchId),
            sql`${customerFeedback.createdAt} >= ${threeDaysAgo}`
          )
        );
      customerAvg = fb?.avgRating ? parseFloat(String(fb.avgRating)) : 0;
      feedbackCount = fb?.count || 0;
    } catch {}

    let lowStockItems: any[] = [];
    try {
      const inventory = await db
        .select({
          id: branchInventory.id,
          productId: branchInventory.productId,
          currentStock: branchInventory.currentStock,
          minimumStock: branchInventory.minimumStock,
          unit: branchInventory.unit,
          productName: factoryProducts.name,
        })
        .from(branchInventory)
        .leftJoin(factoryProducts, eq(branchInventory.productId, factoryProducts.id))
        .where(
          and(
            eq(branchInventory.branchId, branchId),
            sql`CAST(${branchInventory.currentStock} AS numeric) < CAST(${branchInventory.minimumStock} AS numeric)`
          )
        );
      lowStockItems = inventory.map((i) => ({
        productName: i.productName || "Urun",
        currentStock: parseFloat(i.currentStock || "0"),
        minimumStock: parseFloat(i.minimumStock || "0"),
        unit: i.unit || "adet",
      }));
    } catch {}

    let warnings = 0;
    if (lowStockItems.length > 0) warnings += lowStockItems.length;
    if (checklistCompletion < 50) warnings++;
    if (customerAvg > 0 && customerAvg < 3.5) warnings++;

    let suggestions: any[] = [];
    try {
      suggestions = await getSupervisorSuggestions(branchId);
    } catch {}

    res.json({
      branch: branchInfo || { id: branchId, name: "Bilinmiyor" },
      kpis: {
        activeStaff,
        totalStaff: branchUsers.length,
        checklistCompletion,
        customerAvg: Math.round(customerAvg * 10) / 10,
        feedbackCount,
        warnings,
      },
      teamStatus,
      lowStockItems,
      suggestions,
    });
  } catch (error: any) {
    console.error("Branch summary error:", error);
    res.status(500).json({ message: "Sube ozeti yuklenemedi" });
  }
});

export default router;
