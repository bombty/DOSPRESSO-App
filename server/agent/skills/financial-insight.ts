import { registerSkill } from "./skill-registry";
import { calculateAllBranchFinancials, getAllBranchFinancials } from "../../services/branch-financial-service";

registerSkill({
  id: "financial_insight",
  name: "Finansal Insight",
  description: "Aylık şube finansal özetlerini hesaplar ve maliyet analizini raporlar",
  category: "finance",
  schedule: "weekly",
  targetRoles: ["admin", "ceo", "cgo"],
  autonomyLevel: "info_only",
  dataSources: ["branch_financial_summary", "branches", "users", "financial_records"],

  analyze: async (context) => {
    const insights: any[] = [];
    try {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      await calculateAllBranchFinancials(prevMonth, prevYear, context.userId);

      const summaries = await getAllBranchFinancials(prevMonth, prevYear);

      if (summaries.length === 0) return insights;

      const totalCost = summaries.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);
      const totalRevenue = summaries.reduce((sum, s) => sum + Number(s.revenueTotal || 0), 0);
      const unprofitable = summaries.filter((s) => Number(s.netProfit || 0) < 0);
      const highCostBranches = summaries
        .filter((s) => Number(s.costPerEmployee || 0) > 0)
        .sort((a, b) => Number(b.costPerEmployee || 0) - Number(a.costPerEmployee || 0))
        .slice(0, 3);

      const parts: string[] = [];
      parts.push(`Toplam gider: ${(totalCost / 1000).toFixed(0)}K TL`);
      if (totalRevenue > 0) parts.push(`Toplam gelir: ${(totalRevenue / 1000).toFixed(0)}K TL`);
      if (unprofitable.length > 0) parts.push(`${unprofitable.length} zararlı şube`);

      insights.push({
        type: "monthly_financial",
        severity: unprofitable.length > 2 ? "critical" : unprofitable.length > 0 ? "warning" : "info",
        message: `Aylık finansal özet (${prevMonth}/${prevYear}): ${parts.join(" | ")}`,
        data: {
          totalCost,
          totalRevenue,
          unprofitableCount: unprofitable.length,
          branchCount: summaries.length,
          topCostBranches: highCostBranches.map((s) => ({
            branch: s.branchName,
            costPerEmployee: Number(s.costPerEmployee || 0),
            totalCost: Number(s.totalCost || 0),
          })),
        },
        requiresAI: false,
      });
    } catch (err) {
      console.error("[financial-insight] Error:", err);
    }
    return insights;
  },

  generateActions: (insights, context) => {
    const actions: any[] = [];
    for (const insight of insights) {
      if (insight.type === "monthly_financial") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: "Aylık Finansal Rapor",
          description: insight.message,
          deepLink: "/raporlar?tab=finansal",
          severity: insight.severity === "critical" ? "high" : "med",
          skillId: "financial_insight",
          category: "finance",
          subcategory: "monthly_summary",
        });
      }
    }
    return actions;
  },
});
