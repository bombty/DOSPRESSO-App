import { db } from "../../db";
import { franchiseInvestors } from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const contractTrackerSkill: AgentSkill = {
  id: "contract_tracker",
  name: "Sözleşme Takipçisi",
  description: "Franchise sözleşme bitiş tarihlerini izler ve uyarı oluşturur",
  targetRoles: ["cgo", "ceo", "admin"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["franchiseInvestors"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    const today = new Date();
    if (today.getDate() !== 1) {
      return insights;
    }

    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    try {
      const expiringInvestors = await db
        .select()
        .from(franchiseInvestors)
        .where(
          and(
            eq(franchiseInvestors.status, "active"),
            eq(franchiseInvestors.contractRenewalReminder, true),
            eq(franchiseInvestors.isDeleted, false),
            lte(franchiseInvestors.contractEnd, ninetyDaysFromNow.toISOString().split("T")[0])
          )
        );

      for (const investor of expiringInvestors) {
        if (!investor.contractEnd) continue;

        const endDate = new Date(investor.contractEnd);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) continue;

        const severity = daysLeft <= 30 ? "critical" : "warning";

        insights.push({
          type: "contract_expiry",
          severity,
          message: `${investor.fullName} (${investor.companyName || "Şirket belirtilmemiş"}) — Sözleşme bitimine ${daysLeft} gün kaldı`,
          data: {
            investorId: investor.id,
            investorName: investor.fullName,
            companyName: investor.companyName,
            contractEnd: investor.contractEnd,
            daysLeft,
          },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("Contract tracker error:", error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    return insights.map((insight) => {
      const daysLeft = insight.data.daysLeft as number;
      const severity = daysLeft <= 30 ? "high" : "med";

      return {
        actionType: "alert",
        targetRoleScope: context.role,
        title: `Sözleşme Uyarısı: ${insight.data.investorName} — ${daysLeft} gün kaldı`,
        description: `${insight.data.companyName || ""} franchise sözleşmesi ${insight.data.contractEnd} tarihinde sona eriyor. ${daysLeft <= 30 ? "ACİL: 30 günden az kaldı!" : "Yenileme planlaması yapılmalı."}`,
        deepLink: `/franchise-yatirimcilar/${insight.data.investorId}`,
        severity,
        metadata: {
          investorId: insight.data.investorId,
          daysLeft,
          contractEnd: insight.data.contractEnd,
        },
        skillId: "contract_tracker",
        category: "strategic",
        subcategory: "contract_expiry",
      };
    });
  },
};

registerSkill(contractTrackerSkill);
