import { db } from "../../db";
import { users, trainingMaterials, trainingAssignments } from "@shared/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const OVERDUE_DAYS = 14;
const CRITICAL_DAYS = 30;

const trainingAssignerSkill: AgentSkill = {
  id: "training_assigner",
  name: "Eğitim Atama Danışmanı",
  description: "Tamamlanmamış eğitimleri tespit eder, trainer/coach için atama önerileri üretir",
  targetRoles: ["trainer", "coach", "admin", "ceo", "mudur", "supervisor"],
  schedule: "daily",
  autonomyLevel: "suggest",
  dataSources: ["trainingMaterials", "trainingAssignments", "users"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      const now = new Date();
      const branchId = context.branchId;

      const whereClause = branchId
        ? and(eq(users.branchId, branchId), eq(users.isActive, true))
        : eq(users.isActive, true);

      const branchUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }).from(users).where(whereClause).limit(200);

      if (branchUsers.length === 0) return insights;
      const userMap = Object.fromEntries(branchUsers.map(u => [u.id, u]));

      // Gecikmiş atamalar
      const overdueAssignments = await db.select({
        id: trainingAssignments.id,
        userId: trainingAssignments.userId,
        materialId: trainingAssignments.materialId,
        dueDate: trainingAssignments.dueDate,
        createdAt: trainingAssignments.createdAt,
      }).from(trainingAssignments)
        .where(notInArray(trainingAssignments.status, ["completed", "expired"]))
        .limit(150);

      // Materyal isimleri
      const matIds = [...new Set(overdueAssignments.map(a => a.materialId))];
      const materials = matIds.length > 0
        ? await db.select({ id: trainingMaterials.id, title: trainingMaterials.title })
          .from(trainingMaterials)
        : [];
      const matMap = Object.fromEntries(materials.map(m => [m.id, m]));

      // Sadece bu şubenin kullanıcılarına ait atamaları filtrele
      const userIds = new Set(branchUsers.map(u => u.id));
      const relevant = overdueAssignments.filter(a => a.userId && userIds.has(a.userId));

      const criticalDate = new Date(now.getTime() - CRITICAL_DAYS * 864e5);
      const overdueDate = new Date(now.getTime() - OVERDUE_DAYS * 864e5);

      const critical = relevant.filter(a => a.dueDate && new Date(a.dueDate) < criticalDate);
      const overdue = relevant.filter(a => a.dueDate && new Date(a.dueDate) >= criticalDate && new Date(a.dueDate) < overdueDate);

      if (critical.length > 0) {
        const names = critical.slice(0, 3).map(a => {
          const u = userMap[a.userId!];
          const m = matMap[a.materialId];
          return u && m ? `${u.firstName} → ${m.title}` : "?";
        });
        insights.push({
          type: "critical_training_overdue",
          severity: "critical",
          message: `${critical.length} kritik gecikmiş eğitim: ${names.join(", ")}${critical.length > 3 ? " ve diğerleri" : ""}`,
          data: {
            count: critical.length,
            assignments: critical.slice(0, 10).map(a => ({
              userId: a.userId,
              userName: userMap[a.userId!] ? `${userMap[a.userId!].firstName} ${userMap[a.userId!].lastName}` : "?",
              materialTitle: matMap[a.materialId]?.title || "?",
              dueDate: a.dueDate,
              daysPastDue: a.dueDate ? Math.floor((now.getTime() - new Date(a.dueDate).getTime()) / 864e5) : null,
            })),
            deepLink: "/akademi",
          },
          requiresAI: false,
        });
      }

      if (overdue.length > 0) {
        insights.push({
          type: "training_overdue",
          severity: "warning",
          message: `${overdue.length} eğitim ${OVERDUE_DAYS}+ gündür tamamlanmamış`,
          data: { count: overdue.length, deepLink: "/akademi" },
          requiresAI: false,
        });
      }

      // Hiç eğitim atanmamış çalışanlar
      const assignedIds = new Set(relevant.map(a => a.userId).filter(Boolean));
      const newStaff = branchUsers.filter(u =>
        !assignedIds.has(u.id) && ["barista", "bar_buddy", "stajyer"].includes(u.role || "")
      );
      if (newStaff.length > 0) {
        insights.push({
          type: "no_training_assigned",
          severity: "info",
          message: `${newStaff.length} personele henüz eğitim atanmamış: ${newStaff.slice(0, 3).map(u => u.firstName).join(", ")}`,
          data: { userIds: newStaff.map(u => u.id), deepLink: "/akademi" },
          requiresAI: false,
        });
      }

    } catch (err) {
      console.error("[TrainingAssigner] error:", err);
    }
    return insights;
  },
};

registerSkill(trainingAssignerSkill);
export default trainingAssignerSkill;
