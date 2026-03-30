/**
 * Tahminsel Uyarı Skill
 * Sorun oluşmadan 3-7 gün önceden trend analizi ile uyarır.
 * Reactive değil Proactive: "Bu şube bu hafta kritik olacak" der.
 */
import { db } from "../../db";
import { branches, branchShiftSessions, checklistCompletions,
         trainingAssignments, equipmentFaults, users } from "@shared/schema";
import { eq, and, gte, lte, sql, count, notInArray } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const predictiveAlertSkill: AgentSkill = {
  id: "predictive_alert",
  name: "Tahminsel Uyarı Sistemi",
  description: "Trend analizi ile sorun oluşmadan 3-7 gün önceden HQ rollerine proaktif uyarı verir",
  targetRoles: ["coach", "trainer", "cgo", "admin", "ceo"],
  schedule: "daily",
  autonomyLevel: "suggest",
  dataSources: ["branchShiftSessions", "checklistCompletions", "equipmentFaults", "trainingAssignments"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      const now = new Date();
      const allBranches = await db.select({ id: branches.id, name: branches.name })
        .from(branches).where(eq(branches.isActive, true));

      const targetBranches = context.branchId
        ? allBranches.filter(b => b.id === context.branchId)
        : allBranches;

      for (const branch of targetBranches.slice(0, 20)) {
        // ─── Checklist Trend: son 2 hafta karşılaştır ───────────────────
        const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);
        const oneWeekAgo  = new Date(now.getTime() -  7 * 864e5);

        const [prevWeek, thisWeek] = await Promise.all([
          db.select({ total: sql<number>`count(*)::int`, done: sql<number>`count(*) filter (where status='completed')::int` })
            .from(checklistCompletions)
            .where(and(eq(checklistCompletions.branchId, branch.id),
              gte(checklistCompletions.createdAt, twoWeeksAgo),
              lte(checklistCompletions.createdAt, oneWeekAgo))),
          db.select({ total: sql<number>`count(*)::int`, done: sql<number>`count(*) filter (where status='completed')::int` })
            .from(checklistCompletions)
            .where(and(eq(checklistCompletions.branchId, branch.id),
              gte(checklistCompletions.createdAt, oneWeekAgo))),
        ]);

        const prevRate = prevWeek[0]?.total > 0 ? prevWeek[0].done / prevWeek[0].total : null;
        const thisRate = thisWeek[0]?.total > 0 ? thisWeek[0].done / thisWeek[0].total : null;

        if (prevRate !== null && thisRate !== null) {
          const drop = prevRate - thisRate;
          if (drop > 0.15) { // %15+ düşüş
            insights.push({
              type: "predictive_checklist_drop",
              severity: drop > 0.30 ? "critical" : "warning",
              message: `${branch.name}: Checklist tamamlanma ${Math.round(prevRate*100)}%→${Math.round(thisRate*100)}% (${Math.round(drop*100)}% düşüş). Bu trend devam ederse kritik seviyeye düşecek.`,
              data: { branchId: branch.id, branchName: branch.name, prevRate, thisRate, drop, deepLink: `/sube-uyum-merkezi` },
              requiresAI: false,
            });
          }
        }

        // ─── Ekipman Arıza Artış Trendi ─────────────────────────────────
        const [faultsPrev, faultsCurr] = await Promise.all([
          db.select({ cnt: sql<number>`count(*)::int` }).from(equipmentFaults)
            .where(and(eq(equipmentFaults.branchId, branch.id),
              gte(equipmentFaults.createdAt, twoWeeksAgo),
              lte(equipmentFaults.createdAt, oneWeekAgo))),
          db.select({ cnt: sql<number>`count(*)::int` }).from(equipmentFaults)
            .where(and(eq(equipmentFaults.branchId, branch.id),
              gte(equipmentFaults.createdAt, oneWeekAgo))),
        ]);

        const fPrev = faultsPrev[0]?.cnt || 0;
        const fCurr = faultsCurr[0]?.cnt || 0;
        if (fPrev > 0 && fCurr > fPrev * 1.5) {
          insights.push({
            type: "predictive_fault_surge",
            severity: fCurr > fPrev * 2 ? "critical" : "warning",
            message: `${branch.name}: Arıza kayıtları geçen haftaya göre ${Math.round((fCurr/fPrev-1)*100)}% arttı (${fPrev}→${fCurr}). Ekipman kademeli bozulma riski.`,
            data: { branchId: branch.id, branchName: branch.name, fPrev, fCurr, deepLink: "/arizalar" },
            requiresAI: false,
          });
        }

        // ─── PDKS Devamsızlık Trendi ─────────────────────────────────────
        const [attendPrev, attendCurr] = await Promise.all([
          db.select({ cnt: sql<number>`count(distinct user_id)::int` }).from(branchShiftSessions)
            .where(and(eq(branchShiftSessions.branchId, branch.id),
              gte(branchShiftSessions.checkInTime, twoWeeksAgo),
              lte(branchShiftSessions.checkInTime, oneWeekAgo))),
          db.select({ cnt: sql<number>`count(distinct user_id)::int` }).from(branchShiftSessions)
            .where(and(eq(branchShiftSessions.branchId, branch.id),
              gte(branchShiftSessions.checkInTime, oneWeekAgo))),
        ]);

        const aPrev = attendPrev[0]?.cnt || 0;
        const aCurr = attendCurr[0]?.cnt || 0;
        if (aPrev > 3 && aCurr < aPrev * 0.75) {
          insights.push({
            type: "predictive_attendance_drop",
            severity: "warning",
            message: `${branch.name}: Aktif personel sayısı düştü (${aPrev}→${aCurr} kişi). Vardiya boşluğu riski.`,
            data: { branchId: branch.id, branchName: branch.name, aPrev, aCurr, deepLink: "/canli-takip" },
            requiresAI: false,
          });
        }
      }

      // ─── Genel franchise sağlık özeti (CEO/CGO için) ─────────────────
      if (!context.branchId && insights.length > 0) {
        const critCount = insights.filter(i => i.severity === "critical").length;
        const warnCount = insights.filter(i => i.severity === "warning").length;
        if (critCount > 0 || warnCount > 2) {
          insights.unshift({
            type: "predictive_franchise_summary",
            severity: critCount > 2 ? "critical" : "warning",
            message: `Franchise tahminsel özet: ${critCount} kritik trend, ${warnCount} uyarı tespit edildi. Önümüzdeki 7 günde müdahale gerekiyor.`,
            data: { critCount, warnCount, deepLink: "/sube-uyum-merkezi" },
            requiresAI: false,
          });
        }
      }
    } catch (err) {
      console.error("[PredictiveAlert] error:", err);
    }
    return insights;
  },
};

registerSkill(predictiveAlertSkill);
export default predictiveAlertSkill;
