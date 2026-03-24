import { registerSkill } from "./skill-registry";
import { analyzeAllBranches, getInsightSummary } from "../../services/cross-module-analyzer";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

registerSkill({
  id: "cross_module_insight",
  name: "Cross-Modül Insight",
  description: "Farklı modüllerdeki verileri çapraz analiz ederek korelasyon ve trendleri tespit eder",
  category: "analytics",
  schedule: "weekly",
  targetRoles: ["admin", "ceo", "cgo", "coach"],
  autonomyLevel: "info_only",
  dataSources: ["branches", "users", "support_tickets", "faults", "checklist_submissions", "attendance_records", "training_progress"],

  analyze: async (context) => {
    const insights: any[] = [];
    try {
      const allInsights = await analyzeAllBranches();
      const summary = getInsightSummary(allInsights);

      if (allInsights.length > 0) {
        const criticals = allInsights.filter((i) => i.severity === "critical");
        const warnings = allInsights.filter((i) => i.severity === "warning");
        const positives = allInsights.filter((i) => i.severity === "info");

        const parts: string[] = [];
        if (criticals.length > 0) parts.push(`${criticals.length} kritik bulgu`);
        if (warnings.length > 0) parts.push(`${warnings.length} uyarı`);
        if (positives.length > 0) parts.push(`${positives.length} olumlu gelişme`);

        insights.push({
          type: "cross_module_weekly",
          severity: criticals.length > 0 ? "critical" : warnings.length > 0 ? "warning" : "info",
          message: `Haftalık şube insight raporu: ${parts.join(" | ")}`,
          data: {
            summary,
            topInsights: allInsights.slice(0, 5).map((i) => ({
              branch: i.branchName,
              rule: i.ruleName,
              severity: i.severity,
              recommendation: i.recommendation,
            })),
          },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[cross-module-insight] Error:", err);
    }
    return insights;
  },

  generateActions: (insights, context) => {
    const actions: any[] = [];
    for (const insight of insights) {
      if (insight.type === "cross_module_weekly") {
        const topItems = insight.data.topInsights || [];
        const detailText = topItems
          .map((t: any) => `[${t.severity === "critical" ? "KRİTİK" : t.severity === "warning" ? "UYARI" : "OLUMLU"}] ${t.branch}: ${t.recommendation}`)
          .join("\n");

        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: "Haftalık Şube Insight Raporu",
          description: `${insight.message}\n\n${detailText}`,
          deepLink: "/raporlar?tab=insight",
          severity: insight.severity === "critical" ? "high" : "med",
          skillId: "cross_module_insight",
          category: "analytics",
          subcategory: "cross_module",
        });
      }
    }
    return actions;
  },
});
