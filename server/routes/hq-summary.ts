import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  branches,
  customerFeedback,
  factoryShipments,
  factoryProductionOutputs,
  branchOrders,
  supportTickets,
  users,
  isHQRole,
  type UserRoleType,
} from "@shared/schema";
import { eq, and, sql, count, avg, sum, desc, ne, isNull } from "drizzle-orm";
import {
  getHQSuggestions,
  filterSuggestionsForRole,
  getTrainerSuggestions,
  getMuhasebeSuggestions,
  getKaliteKontrolSuggestions,
  getGidaMuhendisiSuggestions,
  getFabrikaMudurSuggestions,
  getSatinalmaSuggestions,
  getMarketingSuggestions,
} from "../lib/dobody-suggestions";
import { getLatestSkillInsights, deduplicateSuggestions } from "../agent/skills/skill-registry";

const router = Router();

router.get("/api/hq-summary", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.user.role as UserRoleType;
    if (!isHQRole(userRole) && userRole !== "admin" && userRole !== "ceo" && userRole !== "cgo") {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const allBranches = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let branchRatings: any[] = [];
    try {
      branchRatings = await db
        .select({
          branchId: customerFeedback.branchId,
          avgRating: avg(customerFeedback.rating),
          count: count(),
        })
        .from(customerFeedback)
        .where(sql`${customerFeedback.createdAt} >= ${threeDaysAgo}`)
        .groupBy(customerFeedback.branchId);
    } catch (e) { console.error(e); }

    const ratingMap = new Map<number, { avg: number; count: number }>();
    for (const r of branchRatings) {
      ratingMap.set(r.branchId, {
        avg: parseFloat(String(r.avgRating || 0)),
        count: r.count || 0,
      });
    }

    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    const branchRanking = allBranches.map((b) => {
      const rating = ratingMap.get(b.id);
      const avgRating = rating ? Math.round(rating.avg * 10) / 10 : 0;
      let status: "normal" | "warning" | "critical" = "normal";
      if (avgRating > 0 && avgRating < 3.0) {
        status = "critical";
        criticalCount++;
      } else if (avgRating > 0 && avgRating < 3.5) {
        status = "warning";
        warningCount++;
      } else {
        normalCount++;
      }
      return {
        id: b.id,
        name: b.name,
        avgRating,
        feedbackCount: rating?.count || 0,
        status,
      };
    });

    branchRanking.sort((a, b) => b.avgRating - a.avgRating);

    let factorySummary: any = { todayProduction: 0, wasteCount: 0, wastePercentage: 0, pendingShipments: 0 };
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [prodStats] = await db
        .select({
          totalProduced: sum(factoryProductionOutputs.quantity),
          totalWaste: sum(factoryProductionOutputs.wasteQuantity),
        })
        .from(factoryProductionOutputs)
        .where(sql`${factoryProductionOutputs.createdAt} >= ${todayStart}`);

      const produced = parseFloat(String(prodStats?.totalProduced || 0));
      const waste = parseFloat(String(prodStats?.totalWaste || 0));

      const [shipmentCount] = await db
        .select({ count: count() })
        .from(factoryShipments)
        .where(eq(factoryShipments.status, "hazirlaniyor"));

      factorySummary = {
        todayProduction: Math.round(produced),
        wasteCount: Math.round(waste),
        wastePercentage: produced > 0 ? Math.round((waste / produced) * 1000) / 10 : 0,
        pendingShipments: shipmentCount?.count || 0,
      };
    } catch (e) { console.error(e); }

    let pendingOrderCount = 0;
    try {
      const [orderCount] = await db
        .select({ count: count() })
        .from(branchOrders)
        .where(eq(branchOrders.status, "pending"));
      pendingOrderCount = orderCount?.count || 0;
    } catch (e) { console.error(e); }

    let openTickets = 0;
    let slaBreaches = 0;
    let activeUsers = 0;
    try {
      const [ticketResult] = await db
        .select({ count: count() })
        .from(supportTickets)
        .where(and(
          ne(supportTickets.status, 'resolved'),
          ne(supportTickets.status, 'kapali'),
          eq(supportTickets.isDeleted, false)
        ));
      openTickets = Number(ticketResult?.count ?? 0);

      const [slaResult] = await db
        .select({ count: count() })
        .from(supportTickets)
        .where(and(
          eq(supportTickets.slaBreached, true),
          ne(supportTickets.status, 'resolved'),
          ne(supportTickets.status, 'kapali'),
          eq(supportTickets.isDeleted, false)
        ));
      slaBreaches = Number(slaResult?.count ?? 0);

      const [userResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(
          isNull(users.deletedAt),
          eq(users.isActive, true)
        ));
      activeUsers = Number(userResult?.count ?? 0);
    } catch (e) { console.error(e); }

    let suggestions: any[] = [];
    try {
      const roleSuggestionMap: Record<string, () => Promise<any[]>> = {
        trainer: getTrainerSuggestions,
        muhasebe: getMuhasebeSuggestions,
        muhasebe_ik: getMuhasebeSuggestions,
        kalite_kontrol: getKaliteKontrolSuggestions,
        gida_muhendisi: getGidaMuhendisiSuggestions,
        fabrika_mudur: getFabrikaMudurSuggestions,
        satinalma: getSatinalmaSuggestions,
        marketing: getMarketingSuggestions,
      };
      const roleFn = roleSuggestionMap[userRole];
      if (roleFn) {
        suggestions = await roleFn();
      } else {
        suggestions = await getHQSuggestions();
      }
    } catch (e) { console.error(e); }

    try {
      const userId = req.user.id;
      const skillInsights = await getLatestSkillInsights(userId, userRole);
      suggestions = deduplicateSuggestions([...suggestions, ...skillInsights]);
    } catch (e) { console.error(e); }

    suggestions = filterSuggestionsForRole(suggestions, userRole);

    res.json({
      branchStatus: {
        normal: normalCount,
        warning: warningCount,
        critical: criticalCount,
        total: allBranches.length,
      },
      branchRanking: branchRanking.slice(0, 20),
      factory: factorySummary,
      pendingOrders: pendingOrderCount,
      openTickets,
      slaBreaches,
      activeUsers,
      suggestions,
    });
  } catch (error: unknown) {
    console.error("HQ summary error:", error);
    res.status(500).json({ message: "HQ ozeti yuklenemedi" });
  }
});

export default router;
