import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { analyzeAllBranches, analyzeBranch, getInsightSummary } from "../services/cross-module-analyzer";
import {
  calculateBranchFinancials,
  calculateAllBranchFinancials,
  getAllBranchFinancials,
  getBranchFinancialHistory,
} from "../services/branch-financial-service";
import { db } from "../db";
import { branchFinancialSummary } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { AuthUser } from "../types/auth";

const router = Router();

const HQ_REPORT_ROLES = ["admin", "ceo", "cgo", "coach", "muhasebe_ik"];

function requireHQRole(req: any, res: any, next: any) {
  const user = req.user as AuthUser;
  if (!user || !HQ_REPORT_ROLES.includes(user.role || "")) {
    return res.status(403).json({ message: "Bu rapora erişim yetkiniz yok" });
  }
  next();
}

router.get("/api/reports/insights", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { severity, branchId } = req.query;

    let insights = await analyzeAllBranches();

    if (severity && typeof severity === "string") {
      insights = insights.filter((i) => i.severity === severity);
    }
    if (branchId && typeof branchId === "string") {
      insights = insights.filter((i) => i.branchId === Number(branchId));
    }

    res.json(insights);
  } catch (err: unknown) {
    console.error("[InsightReports] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Insight analizi başarısız" });
  }
});

router.get("/api/reports/insights/summary", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const insights = await analyzeAllBranches();
    res.json(getInsightSummary(insights));
  } catch (err: unknown) {
    console.error("[InsightSummary] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Insight özeti başarısız" });
  }
});

router.get("/api/reports/insights/branch/:id", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });

    const insights = await analyzeBranch(branchId);
    res.json(insights);
  } catch (err: unknown) {
    console.error("[InsightBranch] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Şube analizi başarısız" });
  }
});

router.post("/api/reports/insights/refresh", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!["admin", "ceo", "cgo"].includes(user.role || "")) {
      return res.status(403).json({ message: "Yetki gerekli" });
    }

    const insights = await analyzeAllBranches();
    const summary = getInsightSummary(insights);
    res.json({ message: "Insight analizi tamamlandı", summary, insightCount: insights.length });
  } catch (err: unknown) {
    console.error("[InsightRefresh] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Yenileme başarısız" });
  }
});

router.get("/api/reports/financial/branches", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const data = await getAllBranchFinancials(month, year);
    res.json(data);
  } catch (err: unknown) {
    console.error("[FinancialBranches] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Finansal veri alınamadı" });
  }
});

router.get("/api/reports/financial/branch/:id", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });

    const months = parseInt(req.query.months as string) || 6;
    const history = await getBranchFinancialHistory(branchId, months);
    res.json(history);
  } catch (err: unknown) {
    console.error("[FinancialBranch] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Şube finansal verisi alınamadı" });
  }
});

router.get("/api/reports/financial/compare", isAuthenticated, requireHQRole, async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const data = await getAllBranchFinancials(month, year);
    const sorted = [...data].sort((a, b) => Number(b.totalCost || 0) - Number(a.totalCost || 0));
    res.json(sorted);
  } catch (err: unknown) {
    console.error("[FinancialCompare] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Karşılaştırma verisi alınamadı" });
  }
});

router.post("/api/reports/financial/calculate", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!["admin", "ceo", "cgo", "muhasebe_ik"].includes(user.role || "")) {
      return res.status(403).json({ message: "Yetki gerekli" });
    }

    const month = parseInt(req.body.month) || new Date().getMonth() + 1;
    const year = parseInt(req.body.year) || new Date().getFullYear();

    const results = await calculateAllBranchFinancials(month, year, user.id);
    res.json({ message: "Hesaplama tamamlandı", count: results.length });
  } catch (err: unknown) {
    console.error("[FinancialCalc] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Hesaplama başarısız" });
  }
});

router.patch("/api/reports/financial/branch/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!["admin", "ceo", "cgo", "muhasebe_ik"].includes(user.role || "")) {
      return res.status(403).json({ message: "Yetki gerekli" });
    }

    const branchId = parseInt(req.params.id);
    if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });

    const { month, year, revenueTotal, costRent, costUtilities, costOther, costMaintenance, notes } = req.body;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const [existing] = await db.select()
      .from(branchFinancialSummary)
      .where(and(
        eq(branchFinancialSummary.branchId, branchId),
        eq(branchFinancialSummary.periodMonth, m),
        eq(branchFinancialSummary.periodYear, y),
      ))
      .limit(1);

    const updateData: Record<string, any> = {};
    if (revenueTotal !== undefined) updateData.revenueTotal = String(revenueTotal);
    if (costRent !== undefined) updateData.costRent = String(costRent);
    if (costUtilities !== undefined) updateData.costUtilities = String(costUtilities);
    if (costOther !== undefined) updateData.costOther = String(costOther);
    if (costMaintenance !== undefined) updateData.costMaintenance = String(costMaintenance);
    if (notes !== undefined) updateData.notes = notes;

    if (existing) {
      await db.update(branchFinancialSummary).set(updateData).where(eq(branchFinancialSummary.id, existing.id));
    } else {
      await db.insert(branchFinancialSummary).values({
        branchId,
        periodMonth: m,
        periodYear: y,
        ...updateData,
      });
    }

    const result = await calculateBranchFinancials(branchId, m, y, user.id);
    res.json(result);
  } catch (err: unknown) {
    console.error("[FinancialPatch] Error:", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Güncelleme başarısız" });
  }
});

export default router;
