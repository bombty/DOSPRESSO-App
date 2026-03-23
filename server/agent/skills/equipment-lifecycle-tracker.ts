import { db } from "../../db";
import { equipmentFaults, users, supportTickets, equipment } from "@shared/schema";
import { eq, and, gte, not, inArray, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const REPEAT_FAULT_THRESHOLD = 3;
const REPEAT_FAULT_WINDOW_DAYS = 30;
const ESCALATION_HOURS = 48;

const equipmentLifecycleTrackerSkill: AgentSkill = {
  id: "equipment_lifecycle_tracker",
  name: "Ekipman Yaşam Döngüsü Takipçisi",
  description: "Tekrar eden arıza tespiti ve 48 saat çözülemeyen arızaları CRM'e escalate eder",
  targetRoles: ["admin", "ceo", "cgo", "fabrika_mudur", "mudur"],
  schedule: "daily",
  autonomyLevel: "suggest_approve",
  dataSources: ["equipmentFaults", "supportTickets"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - REPEAT_FAULT_WINDOW_DAYS);

      const repeatFaults = await db
        .select({
          equipmentName: equipmentFaults.equipmentName,
          equipmentId: equipmentFaults.equipmentId,
          branchId: equipmentFaults.branchId,
          faultCount: count(),
        })
        .from(equipmentFaults)
        .where(gte(equipmentFaults.createdAt, thirtyDaysAgo))
        .groupBy(equipmentFaults.equipmentName, equipmentFaults.equipmentId, equipmentFaults.branchId)
        .having(sql`count(*) >= ${REPEAT_FAULT_THRESHOLD}`);

      for (const item of repeatFaults) {
        insights.push({
          type: "repeat_fault",
          severity: "critical",
          message: `${item.equipmentName || "Ekipman"} son 30 günde ${item.faultCount} kez arızalandı`,
          data: {
            equipmentName: item.equipmentName,
            equipmentId: item.equipmentId,
            branchId: item.branchId,
            faultCount: Number(item.faultCount),
          },
          requiresAI: true,
        });
      }

      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - ESCALATION_HOURS);

      const unresolvedFaults = await db
        .select({
          id: equipmentFaults.id,
          equipmentName: equipmentFaults.equipmentName,
          equipmentId: equipmentFaults.equipmentId,
          description: equipmentFaults.description,
          branchId: equipmentFaults.branchId,
          createdAt: equipmentFaults.createdAt,
          priority: equipmentFaults.priority,
        })
        .from(equipmentFaults)
        .where(
          and(
            not(inArray(equipmentFaults.currentStage, ["kapatildi", "cozuldu"])),
            sql`${equipmentFaults.createdAt} <= ${fortyEightHoursAgo.toISOString()}`
          )
        );

      for (const fault of unresolvedFaults) {
        const existingTicket = await db
          .select({ id: supportTickets.id })
          .from(supportTickets)
          .where(
            and(
              eq(supportTickets.ticketType, "ariza_escalation"),
              eq(supportTickets.source, "system"),
              sql`${supportTickets.description} LIKE ${"%" + `fault_id:${fault.id}` + "%"}`
            )
          )
          .limit(1);

        if (existingTicket.length === 0) {
          insights.push({
            type: "unresolved_fault_escalation",
            severity: "warning",
            message: `${fault.equipmentName || "Ekipman"} 48 saattir çözülemedi — CRM escalation gerekli`,
            data: {
              faultId: fault.id,
              equipmentName: fault.equipmentName,
              equipmentId: fault.equipmentId,
              description: fault.description,
              branchId: fault.branchId,
              createdAt: fault.createdAt,
              priority: fault.priority,
            },
            requiresAI: false,
          });
        }
      }
    } catch (error) {
      console.error("[equipment-lifecycle-tracker] Error:", error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "repeat_fault") {
        actions.push({
          actionType: "alert",
          targetRoleScope: "ceo,cgo,admin",
          branchId: insight.data.branchId,
          title: `Tekrar eden arıza: ${insight.data.equipmentName}`,
          description: `${insight.data.equipmentName} son 30 günde ${insight.data.faultCount}. kez arızalandı. Ekipman değişimi veya kapsamlı bakım öneriyorum.`,
          deepLink: insight.data.equipmentId ? `/ekipman/${insight.data.equipmentId}` : "/ariza-yonetim",
          severity: "high",
          metadata: insight.data,
          skillId: "equipment_lifecycle_tracker",
          category: "operations",
          subcategory: "repeat_fault",
        });
      }

      if (insight.type === "unresolved_fault_escalation") {
        actions.push({
          actionType: "escalation",
          targetRoleScope: "teknik,admin",
          branchId: insight.data.branchId,
          title: `Arıza escalation: ${insight.data.equipmentName}`,
          description: `${insight.data.equipmentName} 48 saattir çözülemedi. CRM franchise kanalına ticket oluşturulacak.`,
          deepLink: "/ariza-yonetim",
          severity: "high",
          metadata: insight.data,
          skillId: "equipment_lifecycle_tracker",
          category: "operations",
          subcategory: "fault_escalation",
        });
      }
    }

    return actions;
  },
};

export async function escalateUnresolvedFaults(): Promise<number> {
  let escalated = 0;

  try {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - ESCALATION_HOURS);

    const unresolvedFaults = await db
      .select({
        id: equipmentFaults.id,
        equipmentName: equipmentFaults.equipmentName,
        equipmentId: equipmentFaults.equipmentId,
        description: equipmentFaults.description,
        branchId: equipmentFaults.branchId,
        createdAt: equipmentFaults.createdAt,
      })
      .from(equipmentFaults)
      .where(
        and(
          not(inArray(equipmentFaults.currentStage, ["kapatildi", "cozuldu"])),
          sql`${equipmentFaults.createdAt} <= ${fortyEightHoursAgo.toISOString()}`
        )
      );

    for (const fault of unresolvedFaults) {
      const marker = `fault_id:${fault.id}`;
      const existingTicket = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.ticketType, "ariza_escalation"),
            eq(supportTickets.source, "system"),
            sql`${supportTickets.description} LIKE ${"%" + marker + "%"}`
          )
        )
        .limit(1);

      if (existingTicket.length > 0) continue;

      const branchName = fault.branchId
        ? await db.select({ name: sql<string>`name` }).from(sql`branches`).where(sql`id = ${fault.branchId}`).then(r => r[0]?.name || "Şube")
        : "Bilinmiyor";

      const ticketNumber = `TKT-ESC${String(fault.id).padStart(3, "0")}`;

      await db.insert(supportTickets).values({
        ticketNumber,
        title: `Arıza escalation: ${fault.equipmentName || "Ekipman"}`,
        description: `${branchName} şubesinde ${fault.equipmentName || "Ekipman"} 48 saattir çözülemedi.\n\nOrijinal arıza: ${fault.description || "Bilgi yok"}\n\n[${marker}]`,
        channel: "franchise",
        ticketType: "ariza_escalation",
        department: "teknik",
        source: "system",
        priority: "yuksek",
        status: "acik",
        branchId: fault.branchId,
        createdById: null,
      });

      escalated++;
    }
  } catch (error) {
    console.error("[equipment-lifecycle-tracker] Escalation error:", error);
  }

  return escalated;
}

export async function checkRepeatFaultForEquipment(equipmentName: string, equipmentId: number | null, branchId: number | null): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - REPEAT_FAULT_WINDOW_DAYS);

    const filter = equipmentId
      ? and(
          eq(equipmentFaults.equipmentId, equipmentId),
          gte(equipmentFaults.createdAt, thirtyDaysAgo)
        )
      : and(
          eq(equipmentFaults.equipmentName, equipmentName),
          gte(equipmentFaults.createdAt, thirtyDaysAgo)
        );

    const [result] = await db
      .select({ cnt: count() })
      .from(equipmentFaults)
      .where(filter);

    const faultCount = Number(result?.cnt ?? 0);

    if (faultCount >= REPEAT_FAULT_THRESHOLD) {
      const { storage } = await import("../../storage");

      const executives = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            sql`${users.role} IN ('ceo', 'cgo', 'admin')`
          )
        );

      for (const exec of executives) {
        await storage.createNotification({
          userId: exec.id,
          type: "repeat_fault_alert",
          title: `Tekrar eden arıza: ${equipmentName}`,
          message: `${equipmentName} son 30 günde ${faultCount}. kez arızalandı. Ekipman değişimi veya kapsamlı bakım değerlendirilmeli.`,
          link: equipmentId ? `/ekipman/${equipmentId}` : "/ariza-yonetim",
          branchId: branchId ?? undefined,
        });
      }
    }
  } catch (error) {
    console.error("[equipment-lifecycle-tracker] Repeat check error:", error);
  }
}

registerSkill(equipmentLifecycleTrackerSkill);
