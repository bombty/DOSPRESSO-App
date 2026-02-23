import { db } from "../db";
import {
  branches,
  checklistCompletions,
  productComplaints,
  guestComplaints,
  equipmentFaults,
  trainingAssignments,
  tasks,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, avg, inArray } from "drizzle-orm";

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

const WEIGHTS = {
  inspections: 0.25,
  complaints: 0.25,
  equipment: 0.20,
  training: 0.15,
  opsHygiene: 0.15,
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
    const { from, to } = dateRange(rangeDays);

    const [rows] = await db
      .select({
        total: count(),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} = 'completed')`,
        overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} IN ('overdue', 'expired'))`,
        inProgressCount: sql<number>`COUNT(*) FILTER (WHERE ${trainingAssignments.status} = 'in_progress')`,
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

    const score = clamp(completionRate * 60 + 40 - overduePenalty - pendingPenalty);

    const notes: string[] = [];
    notes.push(`${total} görev, ${completed} tamamlandı`);
    if (overdue > 0) notes.push(`${overdue} gecikmiş/başarısız görev`);
    if (pending > 0) notes.push(`${pending} bekleyen görev`);

    return { key, label, score, weight, notes, evidenceCount: total };
  } catch {
    return neutralComponent(key, label, weight);
  }
}

async function computeTotalForBranch(branchId: number, rangeDays: number): Promise<number> {
  const components = await Promise.all([
    scoreInspections(branchId, rangeDays),
    scoreComplaints(branchId, rangeDays),
    scoreEquipment(branchId, rangeDays),
    scoreTraining(branchId, rangeDays),
    scoreOpsHygiene(branchId, rangeDays),
  ]);

  return clamp(
    components.reduce((sum, c) => sum + c.score * c.weight, 0)
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
      const components = await Promise.all([
        scoreInspections(branch.id, rangeDays),
        scoreComplaints(branch.id, rangeDays),
        scoreEquipment(branch.id, rangeDays),
        scoreTraining(branch.id, rangeDays),
        scoreOpsHygiene(branch.id, rangeDays),
      ]);

      const totalScore = clamp(
        components.reduce((sum, c) => sum + c.score * c.weight, 0)
      );

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
