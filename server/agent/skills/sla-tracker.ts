import { db } from "../../db";
import { equipmentFaults, users, branches } from "@shared/schema";
import { eq, and, lte, notInArray, gte } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const SLA_CRITICAL_HOURS = 4;
const SLA_HIGH_HOURS = 24;
const SLA_NORMAL_HOURS = 72;

const slaTrackerSkill: AgentSkill = {
  id: "sla_tracker",
  name: "SLA & Arıza Takipçisi",
  description: "Ekipman arıza SLA ihlallerini tespit eder, CGO ve teknik ekip için öncelik uyarısı üretir",
  targetRoles: ["cgo", "admin", "ceo", "mudur", "coach", "teknik"],
  schedule: "hourly",
  autonomyLevel: "suggest",
  dataSources: ["equipmentFaults", "branches"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      const now = new Date();

      const whereClause = context.branchId
        ? and(eq(equipmentFaults.branchId, context.branchId), notInArray(equipmentFaults.status, ["resolved", "closed", "cozuldu"]))
        : notInArray(equipmentFaults.status, ["resolved", "closed", "cozuldu"]);

      const openFaults = await db.select({
        id: equipmentFaults.id,
        branchId: equipmentFaults.branchId,
        title: equipmentFaults.title,
        priority: equipmentFaults.priority,
        createdAt: equipmentFaults.createdAt,
        status: equipmentFaults.status,
      }).from(equipmentFaults).where(whereClause).limit(100);

      const breached: any[] = [];
      const nearBreached: any[] = [];

      for (const fault of openFaults) {
        if (!fault.createdAt) continue;
        const ageHours = (now.getTime() - new Date(fault.createdAt).getTime()) / 3600000;
        const priority = fault.priority?.toLowerCase() || "normal";

        let slaLimit = SLA_NORMAL_HOURS;
        if (priority === "kritik" || priority === "critical") slaLimit = SLA_CRITICAL_HOURS;
        else if (priority === "yüksek" || priority === "high" || priority === "yuksek") slaLimit = SLA_HIGH_HOURS;

        const isBreached = ageHours > slaLimit;
        const isNear = !isBreached && ageHours > slaLimit * 0.8;

        if (isBreached) breached.push({ ...fault, ageHours: Math.round(ageHours), slaLimit });
        else if (isNear) nearBreached.push({ ...fault, ageHours: Math.round(ageHours), slaLimit });
      }

      if (breached.length > 0) {
        const criticalBreached = breached.filter(f => f.priority === "kritik" || f.priority === "critical");
        insights.push({
          type: "sla_breached",
          severity: criticalBreached.length > 0 ? "critical" : "warning",
          message: `${breached.length} arıza SLA süresini aştı${criticalBreached.length > 0 ? ` (${criticalBreached.length} kritik)` : ""}`,
          data: {
            faults: breached.slice(0, 10).map(f => ({
              id: f.id, title: f.title, branchId: f.branchId,
              priority: f.priority, ageHours: f.ageHours, slaLimit: f.slaLimit,
            })),
            deepLink: "/arizalar",
          },
          requiresAI: false,
        });
      }

      if (nearBreached.length > 0) {
        insights.push({
          type: "sla_near_breach",
          severity: "info",
          message: `${nearBreached.length} arıza SLA süresine yaklaşıyor`,
          data: { faults: nearBreached.slice(0, 5), deepLink: "/arizalar" },
          requiresAI: false,
        });
      }

    } catch (err) {
      console.error("[SLATracker] error:", err);
    }
    return insights;
  },
};

registerSkill(slaTrackerSkill);
export default slaTrackerSkill;
