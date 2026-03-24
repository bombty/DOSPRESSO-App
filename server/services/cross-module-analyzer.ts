import { db } from "../db";
import { 
  branches, users, supportTickets, equipmentFaults, 
  trainingCompletions, checklistCompletions, checklists
} from "@shared/schema";
import { eq, and, gte, sql, count, avg, isNull } from "drizzle-orm";

export interface BranchInsightData {
  branchId: number;
  branchName: string;
  customerComplaints: number;
  avgCustomerRating: number;
  franchiseTickets: number;
  slaBreaches: number;
  equipmentFaults: number;
  repeatFaults: number;
  avgRepairTime: number;
  staffCount: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  avgAttendanceRate: number;
  lateArrivals: number;
  trainingCompletions: number;
  avgQuizScore: number;
  incompleteTraining: number;
  checklistCompletion: number;
  taskCompletion: number;
  wasteRate: number;
  productionTarget: number;
}

export interface BranchInsight {
  branchId: number;
  branchName: string;
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  recommendation: string;
  data: BranchInsightData;
  createdAt: Date;
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  condition: (data: BranchInsightData) => boolean;
  severity: "info" | "warning" | "critical";
  recommendation: (data: BranchInsightData) => string;
}

const CORRELATION_RULES: CorrelationRule[] = [
  {
    id: "complaint-turnover",
    name: "Şikayet + Personel Değişimi",
    description: "Müşteri şikayeti artışı ile personel değişimi korelasyonu",
    condition: (d) => d.customerComplaints > 3 && d.turnoverRate > 15,
    severity: "critical",
    recommendation: (d) =>
      `${d.branchName}'da müşteri şikayetleri (${d.customerComplaints}) yüksek ve ` +
      `personel devir oranı %${d.turnoverRate.toFixed(0)}. Deneyimli personel kaybı hizmet kalitesini etkiliyor olabilir. ` +
      `Öneri: Kalan personele ek eğitim + yeni personel hızlandırılmış onboarding.`,
  },
  {
    id: "fault-complaint",
    name: "Arıza + Şikayet",
    description: "Ekipman arızası ile müşteri şikayeti korelasyonu",
    condition: (d) => d.equipmentFaults > 3 && d.customerComplaints > 2,
    severity: "warning",
    recommendation: (d) =>
      `${d.branchName}'da ${d.equipmentFaults} arıza + ${d.customerComplaints} şikayet. ` +
      `Ekipman sorunları müşteri deneyimini etkiliyor olabilir. ` +
      `Öneri: Kritik ekipman bakım planı + geçici çözüm prosedürü.`,
  },
  {
    id: "training-quality",
    name: "Eğitim Eksikliği + Kalite",
    description: "Tamamlanmamış eğitim ile kalite sorunları korelasyonu",
    condition: (d) => d.incompleteTraining > 2 && (d.customerComplaints > 2 || d.checklistCompletion < 70),
    severity: "warning",
    recommendation: (d) =>
      `${d.branchName}'da ${d.incompleteTraining} tamamlanmamış zorunlu eğitim var ` +
      `ve kalite metrikleri düşük (checklist %${d.checklistCompletion.toFixed(0)}). ` +
      `Öneri: Zorunlu eğitimleri tamamlatın, quiz puanlarını takip edin.`,
  },
  {
    id: "late-complaint",
    name: "Gecikme + Şikayet",
    description: "Personel gecikmeleri ile müşteri memnuniyetsizliği",
    condition: (d) => d.lateArrivals > 10 && d.avgCustomerRating < 3.5 && d.avgCustomerRating > 0,
    severity: "warning",
    recommendation: (d) =>
      `${d.branchName}'da bu ay ${d.lateArrivals} gecikme. Müşteri puanı ${d.avgCustomerRating.toFixed(1)}/5. ` +
      `Yetersiz kadro ile hizmet kalitesi düşüyor olabilir. ` +
      `Öneri: Vardiya planlamasını gözden geçirin.`,
  },
  {
    id: "repeat-fault-cost",
    name: "Tekrar Arıza + Maliyet",
    description: "Aynı ekipmanın tekrar arızalanması — değişim önerisi",
    condition: (d) => d.repeatFaults > 2,
    severity: "critical",
    recommendation: (d) =>
      `${d.branchName}'da ${d.repeatFaults} tekrar eden arıza. ` +
      `Tamir maliyeti ekipman değişim maliyetini geçiyor olabilir. ` +
      `Öneri: Maliyet analizi yapıp değişim kararı verin.`,
  },
  {
    id: "high-performer",
    name: "Yüksek Performans",
    description: "Tüm metriklerde iyi olan şube — örnek göster",
    condition: (d) =>
      d.avgCustomerRating >= 4.5 &&
      d.checklistCompletion >= 90 &&
      d.lateArrivals <= 2 &&
      d.customerComplaints <= 1,
    severity: "info",
    recommendation: (d) =>
      `${d.branchName} bu ay örnek performans gösterdi! ` +
      `Müşteri puanı ${d.avgCustomerRating.toFixed(1)}/5, checklist %${d.checklistCompletion.toFixed(0)}, ` +
      `sadece ${d.lateArrivals} gecikme. Tebrik bildirimi gönderilebilir.`,
  },
  {
    id: "understaffed-overworked",
    name: "Yetersiz Kadro",
    description: "Düşük personel sayısı ile yüksek iş yükü",
    condition: (d) => d.staffCount < 5 && d.customerComplaints > 2,
    severity: "warning",
    recommendation: (d) =>
      `${d.branchName}'da sadece ${d.staffCount} aktif personel ve ${d.customerComplaints} müşteri şikayeti. ` +
      `Kadro yetersiz olabilir. Öneri: Acil işe alım veya diğer şubeden yedek destek.`,
  },
  {
    id: "new-hire-quality-dip",
    name: "Yeni İşe Alım + Kalite Düşüşü",
    description: "Çok yeni personel ile kalite sorunları",
    condition: (d) => d.newHires > 3 && d.checklistCompletion < 75,
    severity: "warning",
    recommendation: (d) =>
      `${d.branchName}'da ${d.newHires} yeni personel ve checklist tamamlama %${d.checklistCompletion.toFixed(0)}. ` +
      `Yeni personelin eğitim ve oryantasyonu hızlandırılmalı. ` +
      `Öneri: Buddy sistemi + ilk hafta yoğun takip.`,
  },
];

async function collectBranchData(branchId: number, branchName: string, days: number): Promise<BranchInsightData> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    crmMisafir,
    crmFranchise,
    slaBreach,
    faultCount,
    staffActive,
    newHireCount,
    trainingDone,
  ] = await Promise.all([
    db.select({
      cnt: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(rating), 0)`,
    })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.branchId, branchId),
        eq(supportTickets.channel, "misafir"),
        gte(supportTickets.createdAt, since),
        isNull(supportTickets.isDeleted),
      )),

    db.select({ cnt: sql<number>`count(*)` })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.branchId, branchId),
        eq(supportTickets.channel, "franchise"),
        gte(supportTickets.createdAt, since),
        isNull(supportTickets.isDeleted),
      )),

    db.select({ cnt: sql<number>`count(*)` })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.branchId, branchId),
        eq(supportTickets.slaBreached, true),
        gte(supportTickets.createdAt, since),
        isNull(supportTickets.isDeleted),
      )),

    db.select({
      cnt: sql<number>`count(*)`,
      repeatCnt: sql<number>`count(*) filter (where equipment_id in (select equipment_id from equipment_faults where branch_id = ${branchId} and created_at >= ${since} group by equipment_id having count(*) > 1))`,
    })
      .from(equipmentFaults)
      .where(and(
        eq(equipmentFaults.branchId, branchId),
        gte(equipmentFaults.createdAt, since),
      )),

    db.select({ cnt: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
      )),

    db.select({ cnt: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
        gte(users.createdAt, since),
      )),

    db.select({ cnt: sql<number>`count(*)`, avgScore: sql<number>`coalesce(avg(score), 0)` })
      .from(trainingCompletions)
      .where(and(
        sql`user_id in (select id from users where branch_id = ${branchId})`,
        gte(trainingCompletions.completedAt, since),
        eq(trainingCompletions.status, "completed"),
      )),
  ]);

  const complaints = Number(crmMisafir[0]?.cnt || 0);
  const avgRating = Number(crmMisafir[0]?.avgRating || 0);
  const franchise = Number(crmFranchise[0]?.cnt || 0);
  const sla = Number(slaBreach[0]?.cnt || 0);
  const faults = Number(faultCount[0]?.cnt || 0);
  const repeats = Number(faultCount[0]?.repeatCnt || 0);
  const staff = Number(staffActive[0]?.cnt || 0);
  const hires = Number(newHireCount[0]?.cnt || 0);
  const trainDone = Number(trainingDone[0]?.cnt || 0);
  const avgQuiz = Number(trainingDone[0]?.avgScore || 0);

  const checklistPct = await getChecklistCompletion(branchId, since);

  return {
    branchId,
    branchName,
    customerComplaints: complaints,
    avgCustomerRating: avgRating,
    franchiseTickets: franchise,
    slaBreaches: sla,
    equipmentFaults: faults,
    repeatFaults: repeats,
    avgRepairTime: 0,
    staffCount: staff,
    newHires: hires,
    terminations: 0,
    turnoverRate: staff > 0 ? ((0) / staff) * 100 : 0,
    avgAttendanceRate: 0,
    lateArrivals: 0,
    trainingCompletions: trainDone,
    avgQuizScore: avgQuiz,
    incompleteTraining: 0,
    checklistCompletion: checklistPct,
    taskCompletion: 0,
    wasteRate: 0,
    productionTarget: 0,
  };
}

async function getChecklistCompletion(branchId: number, since: Date): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT 
        count(*) filter (where cc.completed_at is not null) as done,
        count(*) as total
      FROM checklist_assignments ca
      LEFT JOIN checklist_completions cc ON cc.id = ca.id
      WHERE ca.branch_id = ${branchId}
        AND ca.created_at >= ${since}
    `);
    const row = (result as any).rows?.[0];
    if (!row || Number(row.total) === 0) return 100;
    return (Number(row.done) / Number(row.total)) * 100;
  } catch {
    return 0;
  }
}

export async function analyzeAllBranches(): Promise<BranchInsight[]> {
  const activeBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.isActive, true));

  const insights: BranchInsight[] = [];

  for (const branch of activeBranches) {
    try {
      const data = await collectBranchData(branch.id, branch.name, 30);

      for (const rule of CORRELATION_RULES) {
        if (rule.condition(data)) {
          insights.push({
            branchId: branch.id,
            branchName: branch.name,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            recommendation: rule.recommendation(data),
            data,
            createdAt: new Date(),
          });
        }
      }
    } catch (err: unknown) {
      console.error(`[CrossModule] Branch ${branch.id} analiz hatası:`, err instanceof Error ? err.message : err);
    }
  }

  return insights;
}

export async function analyzeBranch(branchId: number): Promise<BranchInsight[]> {
  const [branch] = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.id, branchId));

  if (!branch) return [];

  const data = await collectBranchData(branch.id, branch.name, 30);
  const insights: BranchInsight[] = [];

  for (const rule of CORRELATION_RULES) {
    if (rule.condition(data)) {
      insights.push({
        branchId: branch.id,
        branchName: branch.name,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        recommendation: rule.recommendation(data),
        data,
        createdAt: new Date(),
      });
    }
  }

  return insights;
}

export function getInsightSummary(insights: BranchInsight[]) {
  return {
    total: insights.length,
    critical: insights.filter((i) => i.severity === "critical").length,
    warning: insights.filter((i) => i.severity === "warning").length,
    info: insights.filter((i) => i.severity === "info").length,
    branchCount: new Set(insights.map((i) => i.branchId)).size,
  };
}
