import { db } from "../../db";
import { users, branches, shifts, branchShiftSessions, checklistCompletions, checklists, trainingAssignments, equipmentFaults } from "@shared/schema";
import { eq, and, gte, lte, notInArray, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const complianceReporterSkill: AgentSkill = {
  id: "compliance_reporter",
  name: "Uyum Rapor Uzmanı",
  description: "Şubeden otomatik uyum raporu talep eder, eksiklikleri özetler, coach/trainer için eylem planı önerir",
  targetRoles: ["coach", "trainer", "cgo", "admin", "ceo"],
  schedule: "weekly",
  autonomyLevel: "suggest",
  dataSources: ["shifts", "branchShiftSessions", "checklistCompletions", "trainingAssignments", "equipmentFaults"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 864e5);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // Tüm aktif şubeler
      const allBranches = await db.select({ id: branches.id, name: branches.name })
        .from(branches).where(eq(branches.isActive, true));

      const branchesToCheck = context.branchId
        ? allBranches.filter(b => b.id === context.branchId)
        : allBranches;

      const complianceReport: Array<{
        branchId: number; branchName: string;
        vardiyaUyum: number; checklistUyum: number;
        egitimUyum: number; ariza: number;
        overallScore: number; issues: string[];
      }> = [];

      for (const branch of branchesToCheck.slice(0, 15)) {
        const issues: string[] = [];

        // 1. Vardiya uyumu: planlanan vs gerçekleşen
        const plannedCount = await db.select({ cnt: count() }).from(shifts)
          .where(and(eq(shifts.branchId, branch.id), gte(shifts.shiftDate, weekAgoStr), lte(shifts.shiftDate, todayStr), notInArray(shifts.status, ["cancelled"])));
        const actualCount = await db.select({ cnt: count() }).from(branchShiftSessions)
          .where(and(eq(branchShiftSessions.branchId, branch.id), gte(branchShiftSessions.checkInTime, weekAgo)));

        const planned = Number(plannedCount[0]?.cnt || 0);
        const actual = Number(actualCount[0]?.cnt || 0);
        const vardiyaUyum = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 50;
        if (vardiyaUyum < 80) issues.push(`Vardiya uyumu düşük (${vardiyaUyum}%)`);

        // 2. Checklist uyumu
        const totalChk = await db.select({ cnt: count() }).from(checklistCompletions)
          .where(and(eq(checklistCompletions.branchId, branch.id), gte(checklistCompletions.createdAt, weekAgo)));
        const completedChk = await db.select({ cnt: count() }).from(checklistCompletions)
          .where(and(eq(checklistCompletions.branchId, branch.id), gte(checklistCompletions.createdAt, weekAgo), eq(checklistCompletions.isCompleted, true)));
        const totalC = Number(totalChk[0]?.cnt || 0);
        const doneC = Number(completedChk[0]?.cnt || 0);
        const checklistUyum = totalC > 0 ? Math.round((doneC / totalC) * 100) : 50;
        if (checklistUyum < 75) issues.push(`Checklist tamamlanma düşük (${checklistUyum}%)`);

        // 3. Eğitim uyumu
        const branchUserCount = await db.select({ cnt: count() }).from(users)
          .where(and(eq(users.branchId, branch.id), eq(users.isActive, true)));
        const overdueTraining = await db.select({ cnt: count() }).from(trainingAssignments)
          .where(notInArray(trainingAssignments.status, ["completed", "expired"]));
        const staffCount = Number(branchUserCount[0]?.cnt || 1);
        const overdueT = Number(overdueTraining[0]?.cnt || 0);
        const egitimUyum = Math.max(0, 100 - Math.round((overdueT / staffCount) * 50));
        if (egitimUyum < 70) issues.push(`Gecikmiş eğitim yüksek (${overdueT} kişi)`);

        // 4. Açık arıza sayısı
        const openFaults = await db.select({ cnt: count() }).from(equipmentFaults)
          .where(and(eq(equipmentFaults.branchId, branch.id), notInArray(equipmentFaults.status, ["resolved", "closed", "cozuldu"])));
        const ariza = Number(openFaults[0]?.cnt || 0);
        if (ariza > 3) issues.push(`${ariza} açık arıza mevcut`);

        const overallScore = Math.round((vardiyaUyum + checklistUyum + egitimUyum + (ariza > 5 ? 50 : ariza > 2 ? 75 : 100)) / 4);

        if (issues.length > 0 || overallScore < 75) {
          complianceReport.push({ branchId: branch.id, branchName: branch.name, vardiyaUyum, checklistUyum, egitimUyum, ariza, overallScore, issues });
        }
      }

      // Kritik şubeler için aksiyon öner
      const critical = complianceReport.filter(r => r.overallScore < 60);
      const warning = complianceReport.filter(r => r.overallScore >= 60 && r.overallScore < 75);

      if (critical.length > 0) {
        insights.push({
          type: "compliance_critical",
          severity: "critical",
          message: `${critical.length} şube kritik uyum sorunuyla karşı karşıya: ${critical.slice(0, 3).map(r => r.branchName).join(", ")}`,
          data: { branches: critical, deepLink: "/sube-uyum-merkezi" },
          requiresAI: false,
        });
      }

      if (warning.length > 0) {
        insights.push({
          type: "compliance_warning",
          severity: "warning",
          message: `${warning.length} şubede uyum uyarıları: ${warning.slice(0, 3).map(r => r.branchName).join(", ")}`,
          data: { branches: warning, deepLink: "/sube-uyum-merkezi" },
          requiresAI: false,
        });
      }

      // Haftalık özet (coach/trainer için)
      if (complianceReport.length > 0) {
        const avgScore = Math.round(complianceReport.reduce((s, r) => s + r.overallScore, 0) / complianceReport.length);
        insights.push({
          type: "weekly_compliance_summary",
          severity: avgScore < 70 ? "warning" : "info",
          message: `Haftalık uyum özeti: ${complianceReport.length} şube raporlandı, ortalama skor ${avgScore}/100`,
          data: { report: complianceReport, avgScore, deepLink: "/sube-uyum-merkezi" },
          requiresAI: false,
        });
      }

    } catch (err) {
      console.error("[ComplianceReporter] error:", err);
    }
    return insights;
  },
};

registerSkill(complianceReporterSkill);
export default complianceReporterSkill;
