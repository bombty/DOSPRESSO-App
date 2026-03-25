import { db } from "../db";
import {
  branches,
  checklistCompletions,
  productComplaints,
  guestComplaints,
  customerFeedback,
  equipmentFaults,
  trainingAssignments,
  tasks,
  userCareerProgress,
  users,
  supportTickets,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, avg, inArray, isNotNull } from "drizzle-orm";
import { isModuleEnabled } from "./module-flag-service";

const COMPONENT_MODULE_MAP: Record<string, string[]> = {
  inspections: ["checklist"],
  complaints: ["crm"],
  equipment: ["ekipman"],
  training: ["akademi"],
  opsHygiene: ["gorevler"],
  customerSatisfaction: ["crm"],
  branchTasks: ["sube_gorevleri"],
  compliance: ["crm"],
};

async function isComponentEnabled(componentKey: string, branchId: number): Promise<boolean> {
  const moduleKeys = COMPONENT_MODULE_MAP[componentKey];
  if (!moduleKeys) return true;
  for (const mk of moduleKeys) {
    if (!(await isModuleEnabled(mk, branchId, "data"))) return false;
  }
  return true;
}

interface ComponentScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  notes: string[];
  evidenceCount: number;
  insufficientData?: boolean;
}

interface BranchHealthEntry {
  branchId: number;
  branchName: string;
  totalScore: number;
  level: "green" | "yellow" | "red";
  components: ComponentScore[];
  trend: { direction: "up" | "down" | "flat"; delta: number };
  riskFlags: { key: string; label: string; severity: "low" | "med" | "high" }[];
  deepLinks: { details: string };
}

export interface BranchHealthReport {
  range: string;
  generatedAt: string;
  branches: BranchHealthEntry[];
}

const WEIGHTS: Record<string, number> = {
  inspections: 0.17,
  complaints: 0.17,
  equipment: 0.14,
  training: 0.11,
  opsHygiene: 0.10,
  customerSatisfaction: 0.10,
  branchTasks: 0.11,
  compliance: 0.10,
};

function neutralComponent(key: string, label: string, weight: number): ComponentScore {
  return { key, label, score: 70, weight, notes: ["Yeterli veri bulunamadı"], evidenceCount: 0, insufficientData: true };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function dateRange(rangeDays: number, offset: number = 0): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
  const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  return { from, to };
}

async function scoreInspections(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "inspections";
  const label = "Denetim & Checklist";
  const weight = WEIGHTS.inspections;

  try {
    const { from, to } = dateRange(rangeDays);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const rows = await db
      .select({
        totalCount: count(),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${checklistCompletions.status} = 'completed')`,
        lateCount: sql<number>`COUNT(*) FILTER (WHERE ${checklistCompletions.status} = 'late')`,
        incompleteCount: sql<number>`COUNT(*) FILTER (WHERE ${checklistCompletions.status} IN ('incomplete', 'pending'))`,
        avgScore: avg(checklistCompletions.score),
        avgCompletedTasks: avg(checklistCompletions.completedTasks),
        avgTotalTasks: avg(checklistCompletions.totalTasks),
      })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.branchId, branchId),
          gte(checklistCompletions.scheduledDate, fromStr),
          lte(checklistCompletions.scheduledDate, toStr)
        )
      );

    const r = rows[0];
    const total = Number(r?.totalCount ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(r?.completedCount ?? 0);
    const late = Number(r?.lateCount ?? 0);
    const incomplete = Number(r?.incompleteCount ?? 0);
    const avgScoreVal = Number(r?.avgScore ?? 0);

    const completionRate = total > 0 ? (completed + late) / total : 0;
    const qualityScore = avgScoreVal > 0 ? avgScoreVal : completionRate * 100;

    const score = clamp(completionRate * 50 + qualityScore * 0.5);

    const notes: string[] = [];
    notes.push(`${total} checklist kaydı, ${completed} tamamlandı`);
    if (late > 0) notes.push(`${late} geç tamamlanan`);
    if (incomplete > 0) notes.push(`${incomplete} eksik/bekleyen`);
    if (avgScoreVal > 0) notes.push(`Ortalama skor: ${Math.round(avgScoreVal)}/100`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreComplaints(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "complaints";
  const label = "Şikayet Oranı";
  const weight = WEIGHTS.complaints;

  try {
    const { from, to } = dateRange(rangeDays);

    const [prodRows] = await db
      .select({
        total: count(),
        unresolved: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.status} IN ('new', 'investigating'))`,
        highSeverity: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.severity} IN ('high', 'critical'))`,
      })
      .from(productComplaints)
      .where(
        and(
          eq(productComplaints.branchId, branchId),
          gte(productComplaints.createdAt, from),
          lte(productComplaints.createdAt, to)
        )
      );

    const [guestRows] = await db
      .select({
        total: count(),
        unresolved: sql<number>`COUNT(*) FILTER (WHERE ${guestComplaints.status} IN ('new', 'assigned', 'in_progress'))`,
        highPriority: sql<number>`COUNT(*) FILTER (WHERE ${guestComplaints.priority} IN ('high', 'critical'))`,
      })
      .from(guestComplaints)
      .where(
        and(
          eq(guestComplaints.branchId, branchId),
          gte(guestComplaints.complaintDate, from),
          lte(guestComplaints.complaintDate, to)
        )
      );

    const prodTotal = Number(prodRows?.total ?? 0);
    const guestTotal = Number(guestRows?.total ?? 0);
    const totalComplaints = prodTotal + guestTotal;

    if (totalComplaints === 0) {
      return neutralComponent(key, label, weight);
    }

    const unresolved = Number(prodRows?.unresolved ?? 0) + Number(guestRows?.unresolved ?? 0);
    const highSev = Number(prodRows?.highSeverity ?? 0) + Number(guestRows?.highPriority ?? 0);

    const unresolvedRatio = totalComplaints > 0 ? unresolved / totalComplaints : 0;
    const countPenalty = Math.min(totalComplaints * 5, 40);
    const unresolvedPenalty = unresolvedRatio * 30;
    const severityPenalty = Math.min(highSev * 8, 30);

    const score = clamp(100 - countPenalty - unresolvedPenalty - severityPenalty);

    const notes: string[] = [];
    notes.push(`Toplam ${totalComplaints} şikayet (${prodTotal} ürün, ${guestTotal} misafir)`);
    if (unresolved > 0) notes.push(`${unresolved} çözülmemiş şikayet`);
    if (highSev > 0) notes.push(`${highSev} yüksek öncelikli şikayet`);

    return { key, label, score, weight, notes, evidenceCount: totalComplaints };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreEquipment(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "equipment";
  const label = "Ekipman Güvenilirliği";
  const weight = WEIGHTS.equipment;

  try {
    const { from, to } = dateRange(rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        openCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.status} IN ('acik', 'devam_ediyor'))`,
        redCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.priorityLevel} = 'red')`,
        yellowCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.priorityLevel} = 'yellow')`,
      })
      .from(equipmentFaults)
      .where(
        and(
          eq(equipmentFaults.branchId, branchId),
          gte(equipmentFaults.createdAt, from),
          lte(equipmentFaults.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) {
      return neutralComponent(key, label, weight);
    }

    const openCount = Number(rows?.openCount ?? 0);
    const redCount = Number(rows?.redCount ?? 0);
    const yellowCount = Number(rows?.yellowCount ?? 0);

    const openPenalty = Math.min(openCount * 10, 40);
    const redPenalty = Math.min(redCount * 15, 30);
    const yellowPenalty = Math.min(yellowCount * 5, 15);

    const score = clamp(100 - openPenalty - redPenalty - yellowPenalty);

    const notes: string[] = [];
    notes.push(`${total} arıza kaydı, ${openCount} açık`);
    if (redCount > 0) notes.push(`${redCount} kırmızı öncelikli arıza`);
    if (yellowCount > 0) notes.push(`${yellowCount} sarı öncelikli arıza`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreTraining(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "training";
  const label = "Eğitim Performansı";
  const weight = WEIGHTS.training;

  try {
    const careerRows = await db
      .select({
        compositeScore: userCareerProgress.compositeScore,
        averageQuizScore: userCareerProgress.averageQuizScore,
        totalQuizzesAttempted: userCareerProgress.totalQuizzesAttempted,
      })
      .from(userCareerProgress)
      .innerJoin(users, eq(users.id, userCareerProgress.userId))
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.isActive, true)
        )
      );

    if (careerRows.length >= 1) {
      const avgComposite = careerRows.reduce((s, r) => s + Number(r.compositeScore ?? 0), 0) / careerRows.length;
      const avgQuiz = careerRows.reduce((s, r) => s + Number(r.averageQuizScore ?? 0), 0) / careerRows.length;
      const withQuizzes = careerRows.filter(r => Number(r.totalQuizzesAttempted ?? 0) > 0).length;
      const quizParticipationRate = withQuizzes / careerRows.length;
      const atRisk = careerRows.filter(r => Number(r.compositeScore ?? 0) < 40).length;
      const riskPenalty = Math.min(atRisk * 10, 30);

      let compliancePenalty = 0;
      try {
        const [compRows] = await db
          .select({ openCount: count() })
          .from(supportTickets)
          .where(
            and(
              eq(supportTickets.branchId, branchId),
              sql`${supportTickets.ticketType} = 'compliance'`,
              eq(supportTickets.isDeleted, false),
              sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`
            )
          );
        const openCompliance = Number(compRows?.openCount ?? 0);
        compliancePenalty = Math.min(openCompliance * 5, 15);
      } catch {}

      const score = clamp(avgComposite * 0.6 + quizParticipationRate * 25 + 15 - riskPenalty - compliancePenalty);

      const notes: string[] = [];
      notes.push(`${careerRows.length} personel kariyer verisi`);
      notes.push(`Ort. kompozit skor: ${Math.round(avgComposite)}`);
      notes.push(`Quiz katılım: %${Math.round(quizParticipationRate * 100)}`);
      if (avgQuiz > 0) notes.push(`Ort. quiz skoru: ${Math.round(avgQuiz)}`);
      if (atRisk > 0) notes.push(`${atRisk} personel risk altında (< 40 puan)`);
      if (compliancePenalty > 0) notes.push(`Açık uygunsuzluk cezası: -${compliancePenalty}`);

      return { key, label, score, weight, notes, evidenceCount: careerRows.length };
    }

    const { from, to } = dateRange(rangeDays);
    const [rows] = await db
      .select({
        total: count(),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} = 'completed')`,
        overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} IN ('overdue', 'expired'))`,
      })
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.branchId, branchId),
          gte(trainingAssignments.createdAt, from),
          lte(trainingAssignments.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(rows?.completedCount ?? 0);
    const overdue = Number(rows?.overdueCount ?? 0);
    const completionRate = total > 0 ? completed / total : 0;
    const overduePenalty = Math.min(overdue * 8, 30);
    const score = clamp(completionRate * 80 + 20 - overduePenalty);

    const notes: string[] = [];
    notes.push(`${total} eğitim ataması, ${completed} tamamlandı`);
    if (overdue > 0) notes.push(`${overdue} süresi geçmiş eğitim`);
    notes.push(`Tamamlama oranı: %${Math.round(completionRate * 100)}`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreOpsHygiene(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "opsHygiene";
  const label = "Operasyonel Hijyen";
  const weight = WEIGHTS.opsHygiene;

  try {
    const { from, to } = dateRange(rangeDays);

    const overdueStatuses = ["gecikmiş", "basarisiz", "reddedildi"];

    const [rows] = await db
      .select({
        total: count(),
        overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('gecikmiş', 'basarisiz', 'reddedildi'))`,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('tamamlandi', 'onaylandi'))`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('beklemede', 'goruldu', 'devam_ediyor'))`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.branchId, branchId),
          gte(tasks.createdAt, from),
          lte(tasks.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(rows?.completedCount ?? 0);
    const overdue = Number(rows?.overdueCount ?? 0);
    const pending = Number(rows?.pendingCount ?? 0);

    const completionRate = total > 0 ? completed / total : 0;
    const overduePenalty = Math.min(overdue * 6, 35);
    const pendingPenalty = Math.min(pending * 2, 15);

    let compliancePenalty = 0;
    try {
      const [compRows] = await db
        .select({ openCount: count() })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.branchId, branchId),
            sql`${supportTickets.ticketType} = 'compliance'`,
            eq(supportTickets.isDeleted, false),
            sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`
          )
        );
      const openCompliance = Number(compRows?.openCount ?? 0);
      compliancePenalty = Math.min(openCompliance * 4, 12);
    } catch {}

    const score = clamp(completionRate * 60 + 40 - overduePenalty - pendingPenalty - compliancePenalty);

    const notes: string[] = [];
    notes.push(`${total} görev, ${completed} tamamlandı`);
    if (overdue > 0) notes.push(`${overdue} gecikmiş/başarısız görev`);
    if (pending > 0) notes.push(`${pending} bekleyen görev`);
    if (compliancePenalty > 0) notes.push(`Uygunsuzluk cezası: -${compliancePenalty}`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreCustomerSatisfaction(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "customerSatisfaction";
  const label = "Müşteri Memnuniyeti";
  const weight = WEIGHTS.customerSatisfaction;

  try {
    const { from, to } = dateRange(rangeDays);

    const [result] = await db
      .select({
        overallAvg: sql<number>`AVG(${customerFeedback.rating})`,
        serviceAvg: sql<number>`AVG(${customerFeedback.serviceRating})`,
        cleanlinessAvg: sql<number>`AVG(${customerFeedback.cleanlinessRating})`,
        productAvg: sql<number>`AVG(${customerFeedback.productRating})`,
        totalCount: sql<number>`COUNT(*)`,
        nonSuspiciousCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.isSuspicious} = false OR ${customerFeedback.isSuspicious} IS NULL)`,
      })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.branchId, branchId),
          gte(customerFeedback.createdAt, from),
          lte(customerFeedback.createdAt, to)
        )
      );

    const totalCount = Number(result?.totalCount ?? 0);
    const nonSuspicious = Number(result?.nonSuspiciousCount ?? 0);

    if (totalCount < 5) {
      return neutralComponent(key, label, weight);
    }

    const overallAvg = Number(result?.overallAvg ?? 0);
    const score = clamp((overallAvg / 5) * 100);

    const notes: string[] = [];
    notes.push(`${totalCount} değerlendirme (${nonSuspicious} güvenilir)`);
    if (overallAvg > 0) notes.push(`Genel ortalama: ${overallAvg.toFixed(1)}/5`);

    const serviceAvg = Number(result?.serviceAvg ?? 0);
    const cleanlinessAvg = Number(result?.cleanlinessAvg ?? 0);
    const productAvg = Number(result?.productAvg ?? 0);

    if (cleanlinessAvg > 0 && cleanlinessAvg < 3.0) notes.push(`Temizlik dikkat gerektiriyor: ${cleanlinessAvg.toFixed(1)}/5`);
    if (serviceAvg > 0 && serviceAvg < 3.0) notes.push(`Hizmet dikkat gerektiriyor: ${serviceAvg.toFixed(1)}/5`);
    if (productAvg > 0 && productAvg < 3.0) notes.push(`Ürün kalitesi dikkat gerektiriyor: ${productAvg.toFixed(1)}/5`);

    return { key, label, score, weight, notes, evidenceCount: totalCount };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreCustomerSatisfactionPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "customerSatisfaction";
  const label = "Müşteri Memnuniyeti";
  const weight = WEIGHTS.customerSatisfaction;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [result] = await db
      .select({
        overallAvg: sql<number>`AVG(${customerFeedback.rating})`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.branchId, branchId),
          gte(customerFeedback.createdAt, from),
          lte(customerFeedback.createdAt, to)
        )
      );

    const totalCount = Number(result?.totalCount ?? 0);
    if (totalCount < 5) return neutralComponent(key, label, weight);

    const overallAvg = Number(result?.overallAvg ?? 0);
    const score = clamp((overallAvg / 5) * 100);

    return { key, label, score, weight, notes: [], evidenceCount: totalCount };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreBranchTasks(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "branchTasks";
  const label = "Şube Görevleri";
  const weight = WEIGHTS.branchTasks;

  try {
    const { from, to } = dateRange(rangeDays);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed') as overdue_count
      FROM branch_task_instances
      WHERE branch_id = ${branchId}
        AND due_date >= ${fromStr}
        AND due_date <= ${toStr}
    `);

    const row = result.rows?.[0] as any;
    const total = Number(row?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(row?.completed_count ?? 0);
    const overdue = Number(row?.overdue_count ?? 0);
    const completionRate = total > 0 ? completed / total : 0;
    const overduePenalty = Math.min(overdue * 5, 30);

    const score = clamp(completionRate * 100 - overduePenalty);

    const notes: string[] = [];
    notes.push(`${total} şube görevi, ${completed} tamamlandı`);
    if (overdue > 0) notes.push(`${overdue} gecikmiş görev`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreBranchTasksPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "branchTasks";
  const label = "Şube Görevleri";
  const weight = WEIGHTS.branchTasks;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed') as overdue_count
      FROM branch_task_instances
      WHERE branch_id = ${branchId}
        AND due_date >= ${fromStr}
        AND due_date <= ${toStr}
    `);

    const row = result.rows?.[0] as any;
    const total = Number(row?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(row?.completed_count ?? 0);
    const overdue = Number(row?.overdue_count ?? 0);
    const completionRate = total > 0 ? completed / total : 0;

    const score = clamp(completionRate * 100 - Math.min(overdue * 5, 30));
    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

export async function calculateBranchTaskScore(
  branchId: number,
  userId?: string,
  dateRangeParam?: { start: Date; end: Date }
): Promise<{ score: number; details: { total: number; completed: number; overdue: number; rate: number } }> {
  const start = dateRangeParam?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = dateRangeParam?.end || new Date();
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  let queryStr;
  if (userId) {
    queryStr = sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed') as overdue_count
      FROM branch_task_instances
      WHERE branch_id = ${branchId}
        AND due_date >= ${startStr}
        AND due_date <= ${endStr}
        AND (claimed_by_user_id = ${userId} OR completed_by_user_id = ${userId})
    `;
  } else {
    queryStr = sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed') as overdue_count
      FROM branch_task_instances
      WHERE branch_id = ${branchId}
        AND due_date >= ${startStr}
        AND due_date <= ${endStr}
    `;
  }

  const result = await db.execute(queryStr);
  const row = result.rows?.[0] as any;
  const total = Number(row?.total ?? 0);
  const completed = Number(row?.completed_count ?? 0);
  const overdue = Number(row?.overdue_count ?? 0);
  const completionRate = total > 0 ? (completed / total) * 100 : 100;
  const overduePenalty = Math.min(overdue * 5, 30);

  return {
    score: Math.max(0, Math.min(100, Math.round(completionRate - overduePenalty))),
    details: { total, completed, overdue, rate: Math.round(completionRate) },
  };
}

async function scoreCompliance(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "compliance";
  const label = "Uygunsuzluk Durumu";
  const weight = WEIGHTS.compliance;

  try {
    const { from, to } = dateRange(rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        openCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('acik', 'islemde', 'beklemede'))`,
        criticalCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.priority} IN ('kritik', 'yuksek') AND ${supportTickets.status} IN ('acik', 'islemde', 'beklemede'))`,
        resolvedCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('cozuldu', 'kapatildi'))`,
        oldOpenCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('acik', 'islemde', 'beklemede') AND ${supportTickets.createdAt} < NOW() - INTERVAL '7 days')`,
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.branchId, branchId),
          sql`${supportTickets.ticketType} = 'compliance'`,
          eq(supportTickets.isDeleted, false),
          gte(supportTickets.createdAt, from),
          lte(supportTickets.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) {
      return { key, label, score: 100, weight, notes: ["Uygunsuzluk kaydı yok"], evidenceCount: 0 };
    }

    const openCount = Number(rows?.openCount ?? 0);
    const criticalCount = Number(rows?.criticalCount ?? 0);
    const resolvedCount = Number(rows?.resolvedCount ?? 0);
    const oldOpenCount = Number(rows?.oldOpenCount ?? 0);

    const openPenalty = Math.min(openCount * 12, 40);
    const criticalPenalty = Math.min(criticalCount * 10, 25);
    const agingPenalty = Math.min(oldOpenCount * 8, 20);
    const resolutionBonus = total > 0 ? (resolvedCount / total) * 15 : 0;

    const score = clamp(100 - openPenalty - criticalPenalty - agingPenalty + resolutionBonus);

    const notes: string[] = [];
    notes.push(`${total} uygunsuzluk kaydı, ${openCount} açık`);
    if (criticalCount > 0) notes.push(`${criticalCount} yüksek/kritik öncelikli`);
    if (oldOpenCount > 0) notes.push(`${oldOpenCount} kayıt 7+ gündür açık`);
    if (resolvedCount > 0) notes.push(`${resolvedCount} çözüldü`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreCompliancePrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "compliance";
  const label = "Uygunsuzluk Durumu";
  const weight = WEIGHTS.compliance;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        openCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('acik', 'islemde', 'beklemede'))`,
        criticalCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.priority} IN ('kritik', 'yuksek') AND ${supportTickets.status} IN ('acik', 'islemde', 'beklemede'))`,
        resolvedCount: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('cozuldu', 'kapatildi'))`,
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.branchId, branchId),
          sql`${supportTickets.ticketType} = 'compliance'`,
          eq(supportTickets.isDeleted, false),
          gte(supportTickets.createdAt, from),
          lte(supportTickets.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) {
      return { key, label, score: 100, weight, notes: [], evidenceCount: 0 };
    }

    const openCount = Number(rows?.openCount ?? 0);
    const criticalCount = Number(rows?.criticalCount ?? 0);
    const resolvedCount = Number(rows?.resolvedCount ?? 0);

    const score = clamp(100 - Math.min(openCount * 12, 40) - Math.min(criticalCount * 10, 25) + (total > 0 ? (resolvedCount / total) * 15 : 0));
    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function computeTotalForBranch(branchId: number, rangeDays: number): Promise<number> {
  const scoreFns: { key: string; fn: () => Promise<ComponentScore> }[] = [
    { key: "inspections", fn: () => scoreInspections(branchId, rangeDays) },
    { key: "complaints", fn: () => scoreComplaints(branchId, rangeDays) },
    { key: "equipment", fn: () => scoreEquipment(branchId, rangeDays) },
    { key: "training", fn: () => scoreTraining(branchId, rangeDays) },
    { key: "opsHygiene", fn: () => scoreOpsHygiene(branchId, rangeDays) },
    { key: "customerSatisfaction", fn: () => scoreCustomerSatisfaction(branchId, rangeDays) },
    { key: "branchTasks", fn: () => scoreBranchTasks(branchId, rangeDays) },
    { key: "compliance", fn: () => scoreCompliance(branchId, rangeDays) },
  ];

  const enabledChecks = await Promise.all(
    scoreFns.map(async (s) => ({ ...s, enabled: await isComponentEnabled(s.key, branchId) }))
  );
  const enabledFns = enabledChecks.filter(s => s.enabled);
  if (enabledFns.length === 0) return 0;

  const components = await Promise.all(enabledFns.map(s => s.fn()));
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  return clamp(
    components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0)
  );
}

function buildRiskFlags(components: ComponentScore[]): { key: string; label: string; severity: "low" | "med" | "high" }[] {
  const flags: { key: string; label: string; severity: "low" | "med" | "high" }[] = [];

  for (const c of components) {
    if (c.insufficientData) continue;
    if (c.score < 30) {
      flags.push({ key: c.key, label: `${c.label} kritik düzeyde düşük`, severity: "high" });
    } else if (c.score < 50) {
      flags.push({ key: c.key, label: `${c.label} dikkat gerektiriyor`, severity: "med" });
    } else if (c.score < 65) {
      flags.push({ key: c.key, label: `${c.label} iyileştirilebilir`, severity: "low" });
    }
  }

  return flags;
}

export async function computeBranchHealthScores(options: {
  rangeDays: number;
  branchIds?: number[];
}): Promise<BranchHealthReport> {
  const { rangeDays } = options;

  let branchList: { id: number; name: string }[];

  if (options.branchIds && options.branchIds.length > 0) {
    branchList = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(
        and(
          inArray(branches.id, options.branchIds),
          eq(branches.isActive, true)
        )
      );
  } else {
    branchList = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));
  }

  const entries: BranchHealthEntry[] = await Promise.all(
    branchList.map(async (branch) => {
      const scoreFns: { key: string; fn: () => Promise<ComponentScore> }[] = [
        { key: "inspections", fn: () => scoreInspections(branch.id, rangeDays) },
        { key: "complaints", fn: () => scoreComplaints(branch.id, rangeDays) },
        { key: "equipment", fn: () => scoreEquipment(branch.id, rangeDays) },
        { key: "training", fn: () => scoreTraining(branch.id, rangeDays) },
        { key: "opsHygiene", fn: () => scoreOpsHygiene(branch.id, rangeDays) },
        { key: "customerSatisfaction", fn: () => scoreCustomerSatisfaction(branch.id, rangeDays) },
        { key: "branchTasks", fn: () => scoreBranchTasks(branch.id, rangeDays) },
        { key: "compliance", fn: () => scoreCompliance(branch.id, rangeDays) },
      ];

      const enabledChecks = await Promise.all(
        scoreFns.map(async (s) => ({ ...s, enabled: await isComponentEnabled(s.key, branch.id) }))
      );
      const enabledFns = enabledChecks.filter(s => s.enabled);
      const components = enabledFns.length > 0
        ? await Promise.all(enabledFns.map(s => s.fn()))
        : [];

      const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
      const totalScore = totalWeight > 0
        ? clamp(components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0))
        : 0;

      const level: "green" | "yellow" | "red" =
        totalScore >= 75 ? "green" : totalScore >= 50 ? "yellow" : "red";

      let trend: { direction: "up" | "down" | "flat"; delta: number } = { direction: "flat", delta: 0 };
      try {
        const prevComponents = await Promise.all([
          scoreInspectionsPrev(branch.id, rangeDays),
          scoreComplaintsPrev(branch.id, rangeDays),
          scoreEquipmentPrev(branch.id, rangeDays),
          scoreTrainingPrev(branch.id, rangeDays),
          scoreOpsHygienePrev(branch.id, rangeDays),
          scoreCustomerSatisfactionPrev(branch.id, rangeDays),
          scoreBranchTasksPrev(branch.id, rangeDays),
          scoreCompliancePrev(branch.id, rangeDays),
        ]);
        const prevTotal = clamp(
          prevComponents.reduce((sum, c) => sum + c.score * c.weight, 0)
        );
        const delta = totalScore - prevTotal;
        const direction: "up" | "down" | "flat" =
          delta > 2 ? "up" : delta < -2 ? "down" : "flat";
        trend = { direction, delta: Math.round(delta) };
      } catch {
        trend = { direction: "flat", delta: 0 };
      }

      const riskFlags = buildRiskFlags(components);

      return {
        branchId: branch.id,
        branchName: branch.name,
        totalScore,
        level,
        components,
        trend,
        riskFlags,
        deepLinks: { details: `/sube-saglik-skoru/${branch.id}` },
      };
    })
  );

  return {
    range: `${rangeDays}d`,
    generatedAt: new Date().toISOString(),
    branches: entries,
  };
}

async function scoreInspectionsPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "inspections";
  const label = "Denetim & Checklist";
  const weight = WEIGHTS.inspections;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const rows = await db
      .select({
        totalCount: count(),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${checklistCompletions.status} = 'completed')`,
        avgScore: avg(checklistCompletions.score),
      })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.branchId, branchId),
          gte(checklistCompletions.scheduledDate, fromStr),
          lte(checklistCompletions.scheduledDate, toStr)
        )
      );

    const r = rows[0];
    const total = Number(r?.totalCount ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(r?.completedCount ?? 0);
    const avgScoreVal = Number(r?.avgScore ?? 0);
    const completionRate = total > 0 ? completed / total : 0;
    const qualityScore = avgScoreVal > 0 ? avgScoreVal : completionRate * 100;
    const score = clamp(completionRate * 50 + qualityScore * 0.5);

    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreComplaintsPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "complaints";
  const label = "Şikayet Oranı";
  const weight = WEIGHTS.complaints;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [prodRows] = await db
      .select({
        total: count(),
        unresolved: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.status} IN ('new', 'investigating'))`,
        highSeverity: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.severity} IN ('high', 'critical'))`,
      })
      .from(productComplaints)
      .where(
        and(
          eq(productComplaints.branchId, branchId),
          gte(productComplaints.createdAt, from),
          lte(productComplaints.createdAt, to)
        )
      );

    const [guestRows] = await db
      .select({
        total: count(),
        unresolved: sql<number>`COUNT(*) FILTER (WHERE ${guestComplaints.status} IN ('new', 'assigned', 'in_progress'))`,
        highPriority: sql<number>`COUNT(*) FILTER (WHERE ${guestComplaints.priority} IN ('high', 'critical'))`,
      })
      .from(guestComplaints)
      .where(
        and(
          eq(guestComplaints.branchId, branchId),
          gte(guestComplaints.complaintDate, from),
          lte(guestComplaints.complaintDate, to)
        )
      );

    const totalComplaints = Number(prodRows?.total ?? 0) + Number(guestRows?.total ?? 0);
    if (totalComplaints === 0) return neutralComponent(key, label, weight);

    const unresolved = Number(prodRows?.unresolved ?? 0) + Number(guestRows?.unresolved ?? 0);
    const highSev = Number(prodRows?.highSeverity ?? 0) + Number(guestRows?.highPriority ?? 0);
    const unresolvedRatio = totalComplaints > 0 ? unresolved / totalComplaints : 0;

    const score = clamp(100 - Math.min(totalComplaints * 5, 40) - unresolvedRatio * 30 - Math.min(highSev * 8, 30));
    return { key, label, score, weight, notes: [], evidenceCount: totalComplaints };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreEquipmentPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "equipment";
  const label = "Ekipman Güvenilirliği";
  const weight = WEIGHTS.equipment;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        openCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.status} IN ('acik', 'devam_ediyor'))`,
        redCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.priorityLevel} = 'red')`,
        yellowCount: sql<number>`COUNT(*) FILTER (WHERE ${equipmentFaults.priorityLevel} = 'yellow')`,
      })
      .from(equipmentFaults)
      .where(
        and(
          eq(equipmentFaults.branchId, branchId),
          gte(equipmentFaults.createdAt, from),
          lte(equipmentFaults.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const openCount = Number(rows?.openCount ?? 0);
    const redCount = Number(rows?.redCount ?? 0);
    const yellowCount = Number(rows?.yellowCount ?? 0);

    const score = clamp(100 - Math.min(openCount * 10, 40) - Math.min(redCount * 15, 30) - Math.min(yellowCount * 5, 15));
    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreTrainingPrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "training";
  const label = "Eğitim Performansı";
  const weight = WEIGHTS.training;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} = 'completed')`,
        overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} IN ('overdue', 'expired'))`,
      })
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.branchId, branchId),
          gte(trainingAssignments.createdAt, from),
          lte(trainingAssignments.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(rows?.completedCount ?? 0);
    const overdue = Number(rows?.overdueCount ?? 0);
    const completionRate = total > 0 ? completed / total : 0;

    const score = clamp(completionRate * 80 + 20 - Math.min(overdue * 8, 30));
    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function scoreOpsHygienePrev(branchId: number, rangeDays: number): Promise<ComponentScore> {
  const key = "opsHygiene";
  const label = "Operasyonel Hijyen";
  const weight = WEIGHTS.opsHygiene;

  try {
    const { from, to } = dateRange(rangeDays, rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('gecikmiş', 'basarisiz', 'reddedildi'))`,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('tamamlandi', 'onaylandi'))`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('beklemede', 'goruldu', 'devam_ediyor'))`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.branchId, branchId),
          gte(tasks.createdAt, from),
          lte(tasks.createdAt, to)
        )
      );

    const total = Number(rows?.total ?? 0);
    if (total === 0) return neutralComponent(key, label, weight);

    const completed = Number(rows?.completedCount ?? 0);
    const overdue = Number(rows?.overdueCount ?? 0);
    const pending = Number(rows?.pendingCount ?? 0);
    const completionRate = total > 0 ? completed / total : 0;

    const score = clamp(completionRate * 60 + 40 - Math.min(overdue * 6, 35) - Math.min(pending * 2, 15));
    return { key, label, score, weight, notes: [], evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}
