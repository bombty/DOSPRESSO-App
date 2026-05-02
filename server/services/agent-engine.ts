import { db } from "../db";
import { z } from "zod";
import {
  users, branches, tasks, equipmentFaults, equipment, customerFeedback,
  checklistCompletions, trainingCompletions, inventory, supplierQuotes,
  purchaseOrders, productComplaints, leaveRequests, productionBatches,
  employeePerformanceScores, agentPendingActions, agentRuns, aiAgentLogs, shifts,
  supportTickets,
  pdksMonthlyStats,
  type InsertAgentPendingAction, type InsertAgentRun, type AgentPendingAction,
  type UserRoleType,
} from "@shared/schema";
import { eq, and, or, lt, gt, gte, lte, sql, desc, count, notInArray } from "drizzle-orm";
import { ROLE_GROUP_MAP, getRoleGroup } from "./ai-policy-engine";
import { aiChatCall } from "../ai";
import { isAiBudgetError } from "../ai-budget-guard";
import { checkBatchActions, getSystemPromptPolicy } from "./agent-safety";

const ACTION_TYPES = ["remind", "escalate", "report", "suggest_task", "alert"] as const;
type ActionType = typeof ACTION_TYPES[number];

const SEVERITY_LEVELS = ["low", "med", "high", "critical"] as const;
type Severity = typeof SEVERITY_LEVELS[number];

const MAX_ACTIONS_PER_RUN = 5;
const MAX_DAILY_ACTIONS_PER_USER = 50; // increased from 20 — active franchise platform needs higher limit

const LlmActionSchema = z.object({
  actions: z.array(z.object({
    actionType: z.enum(ACTION_TYPES),
    title: z.string().max(255),
    description: z.string().max(2000),
    severity: z.enum(SEVERITY_LEVELS),
    deepLink: z.string().max(500).optional(),
  })).max(MAX_ACTIONS_PER_RUN),
});

interface AnalysisResult {
  actions: Omit<InsertAgentPendingAction, "runId">[];
  kpis: Record<string, any>;
  anomaliesDetected: boolean;
}

async function getDailyActionCount(targetUserId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const result = await db.select({ cnt: count() })
    .from(agentPendingActions)
    .where(and(
      eq(agentPendingActions.targetUserId, targetUserId),
      gte(agentPendingActions.createdAt, todayStart)
    ));
  return result[0]?.cnt ?? 0;
}

function makeAction(
  actionType: ActionType,
  title: string,
  description: string,
  severity: Severity,
  opts: {
    targetUserId?: string;
    targetRoleScope?: string;
    branchId?: number;
    deepLink?: string;
    metadata?: Record<string, any>;
  } = {}
): Omit<InsertAgentPendingAction, "runId"> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);
  return {
    actionType,
    title,
    description,
    severity,
    status: "pending",
    targetUserId: opts.targetUserId ?? null,
    targetRoleScope: opts.targetRoleScope ?? null,
    branchId: opts.branchId ?? null,
    deepLink: opts.deepLink ?? null,
    metadata: opts.metadata ?? {},
    expiresAt,
    approvedByUserId: null,
    approvedAt: null,
    rejectedReason: null,
  };
}

export async function analyzeForBranchFloor(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.branchId) return { actions, kpis, anomaliesDetected: false };

    const branchId = user.branchId;

    const [userTasks, userTraining, userPerf] = await Promise.all([
      db.select().from(tasks).where(and(eq(tasks.assignedToId, userId), or(eq(tasks.status, "beklemede"), eq(tasks.status, "gecikmiş")))),
      db.select().from(trainingCompletions).where(eq(trainingCompletions.userId, userId)),
      db.select().from(employeePerformanceScores).where(eq(employeePerformanceScores.userId, userId)),
    ]);

    const now = new Date();
    const overdueTasks = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
    kpis.totalPendingTasks = userTasks.length;
    kpis.overdueTasks = overdueTasks.length;
    kpis.trainingCompletions = userTraining.length;

    if (overdueTasks.length > 0) {
      actions.push(makeAction("remind", `${overdueTasks.length} gecikmiş göreviniz var`, `Lütfen gecikmiş görevlerinizi tamamlayın. En eski görev: "${overdueTasks[0].description?.substring(0, 60) || 'Görev'}"`, overdueTasks.length >= 3 ? "high" : "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/gorevler",
        metadata: { taskIds: overdueTasks.map(t => t.id).slice(0, 5) },
      }));
    }

    const latestPerf = userPerf.sort((a, b) => {
      const da = a.weekStart ? new Date(a.weekStart).getTime() : 0;
      const db2 = b.weekStart ? new Date(b.weekStart).getTime() : 0;
      return db2 - da;
    })[0];
    if (latestPerf && latestPerf.weeklyTotalScore !== null && Number(latestPerf.weeklyTotalScore) < 40) {
      kpis.performanceScore = Number(latestPerf.weeklyTotalScore);
      actions.push(makeAction("alert", "Performans skorunuz düşük", `Haftalık performans skorunuz ${Number(latestPerf.weeklyTotalScore).toFixed(0)}/100. İyileştirme için görevlerinizi tamamlamaya ve eğitimlere katılmaya öncelik verin.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/performansim",
      }));
    }

    if (userTraining.length === 0) {
      actions.push(makeAction("remind", "Henüz eğitim tamamlamadınız", "Akademi modülünden eğitimlerinize başlayın. Eğitim tamamlama performans skorunuzu doğrudan etkiler.", "low", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/akademi",
      }));
    }
  } catch (err) {
    console.error("analyzeForBranchFloor error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

export async function analyzeForBranchMgmt(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.branchId) return { actions, kpis, anomaliesDetected: false };

    const branchId = user.branchId;

    const [branchTasks, branchFaults, branchUsers, branchFeedback] = await Promise.all([
      db.select().from(tasks).where(eq(tasks.branchId, branchId)),
      db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)),
      db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.isActive, true))),
      db.select().from(customerFeedback).where(eq(customerFeedback.branchId, branchId)),
    ]);

    const now = new Date();

    const overdueTasks = branchTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "onaylandi" && t.status !== "tamamlandi");
    const openFaults = branchFaults.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
    const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");

    kpis.overdueTasks = overdueTasks.length;
    kpis.openFaults = openFaults.length;
    kpis.criticalFaults = criticalFaults.length;
    kpis.branchPersonnel = branchUsers.length;

    if (overdueTasks.length >= 5) {
      actions.push(makeAction("alert", `Şubede ${overdueTasks.length} gecikmiş görev`, `Şubenizde ${overdueTasks.length} görev gecikmiş durumda. Personel atamalarını ve öncelikleri gözden geçirin.`, overdueTasks.length >= 10 ? "high" : "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/gorevler",
        metadata: { overdueCount: overdueTasks.length },
      }));
    }

    if (criticalFaults.length > 0) {
      actions.push(makeAction("escalate", `${criticalFaults.length} kritik/yüksek öncelikli arıza`, `Şubenizde ${criticalFaults.length} kritik veya yüksek öncelikli açık arıza bulunuyor. Teknik ekiple koordinasyon sağlayın.`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/arizalar",
        metadata: { faultIds: criticalFaults.map((f: any) => f.id).slice(0, 5) },
      }));
    }

    const recentFeedback = branchFeedback.filter(f => {
      const d = f.createdAt ? new Date(f.createdAt) : null;
      return d && d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    });
    const unansweredFeedback = recentFeedback.filter((f: any) => !f.responseText && !f.respondedAt);
    if (unansweredFeedback.length >= 3) {
      kpis.unansweredFeedback = unansweredFeedback.length;
      actions.push(makeAction("remind", `${unansweredFeedback.length} yanıtlanmamış müşteri geri bildirimi`, `Son 7 günde ${unansweredFeedback.length} müşteri geri bildirimi yanıtlanmamış. Müşteri memnuniyeti için hızlı yanıt önemlidir.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/crm?channel=misafir",
        metadata: { feedbackCount: unansweredFeedback.length },
      }));
    }

    // Adil dağılım analizi — hafta sonu yük dengesi
    try {
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      const recentShifts = await db.select({
        userId: shifts.assignedToId,
        shiftDate: shifts.shiftDate,
      }).from(shifts)
        .where(and(
          eq(shifts.branchId, branchId),
          gte(shifts.shiftDate, fourWeeksAgo.toISOString().split('T')[0]),
          notInArray(shifts.status, ['cancelled'])
        ));

      // Hafta sonu (Cmt=6, Paz=0) sayısı per kişi
      const weekendCounts: Record<string, number> = {};
      const totalCounts: Record<string, number> = {};
      for (const s of recentShifts) {
        if (!s.userId || !s.shiftDate) continue;
        const day = new Date(s.shiftDate).getDay();
        totalCounts[s.userId] = (totalCounts[s.userId] || 0) + 1;
        if (day === 0 || day === 6) {
          weekendCounts[s.userId] = (weekendCounts[s.userId] || 0) + 1;
        }
      }

      const weekendRatios = Object.entries(weekendCounts)
        .filter(([uid]) => totalCounts[uid] >= 4) // En az 4 vardiya olan
        .map(([uid, wknd]) => ({ uid, ratio: wknd / (totalCounts[uid] || 1), wknd, total: totalCounts[uid] }))
        .sort((a, b) => b.ratio - a.ratio);

      if (weekendRatios.length >= 2) {
        const highest = weekendRatios[0];
        const lowest = weekendRatios[weekendRatios.length - 1];
        const imbalance = highest.ratio - lowest.ratio;

        if (imbalance > 0.4) { // %40'tan fazla fark
          const highUser = branchUsers.find(u => u.id === highest.uid);
          const lowUser = branchUsers.find(u => u.id === lowest.uid);
          if (highUser && lowUser) {
            kpis.weekendImbalance = imbalance;
            actions.push(makeAction("suggest_task", "Hafta sonu vardiya dağılımı dengesiz", `Son 4 haftada ${highUser.firstName} ${highUser.lastName} hafta sonlarının %${Math.round(highest.ratio * 100)}'inde çalışırken, ${lowUser.firstName} ${lowUser.lastName} yalnızca %${Math.round(lowest.ratio * 100)}'inde çalıştı. Dağılımı dengelemeyi düşünün.`, "med", {
              targetUserId: user.id as any,
              targetRoleScope: user.role,
              branchId,
              deepLink: "/vardiya-planlama",
              metadata: { highUserId: highest.uid, lowUserId: lowest.uid, imbalance },
            }));
          }
        }
      }
    } catch {}


    let branchPerf: any[] = [];
    try {
      branchPerf = await db.select().from(employeePerformanceScores)
        .where(sql`${employeePerformanceScores.userId} IN (${sql.join(branchUsers.map(u => sql`${u.id}`), sql`, `)})`);
    } catch {}
    const lowPerfUsers = branchPerf.filter(p => p.weeklyTotalScore !== null && Number(p.weeklyTotalScore) < 30);
    if (lowPerfUsers.length >= 2) {
      kpis.lowPerformanceCount = lowPerfUsers.length;
      actions.push(makeAction("report", `${lowPerfUsers.length} personel çok düşük performansta`, `Şubenizde ${lowPerfUsers.length} personelin haftalık performans skoru 30'un altında. Koçluk görüşmesi veya eğitim atanması önerilir.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        branchId,
        deepLink: "/performans",
        metadata: { lowPerfCount: lowPerfUsers.length },
      }));
    }
  } catch (err) {
    console.error("analyzeForBranchMgmt error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

export async function analyzeForHQOps(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { actions, kpis, anomaliesDetected: false };

    const [allBranches, allFaults, allComplaints, allFeedback, allTraining, allTickets] = await Promise.all([
      db.select().from(branches),
      db.select().from(equipmentFaults),
      db.select().from(productComplaints),
      db.select().from(customerFeedback),
      db.select().from(trainingCompletions),
      db.select().from(supportTickets),
    ]);

    const openFaults = allFaults.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
    const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");
    const openComplaints = allComplaints.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu" && c.status !== "closed");

    kpis.totalBranches = allBranches.length;
    kpis.openFaults = openFaults.length;
    kpis.criticalFaults = criticalFaults.length;
    kpis.openComplaints = openComplaints.length;

    // ── CRM Ticket Monitoring ──
    const ticketNow = new Date();
    const openTickets = allTickets.filter((t: any) => 
      t.status !== "resolved" && t.status !== "cozuldu" && t.status !== "closed" && t.status !== "kapatildi"
    );
    const sla24h = new Date(ticketNow.getTime() - 24 * 60 * 60 * 1000);
    const slaBreachedTickets = openTickets.filter((t: any) => {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      return created && created < sla24h && (t.slaBreach || t.slaBreached);
    });
    const highPriorityOpen = openTickets.filter((t: any) => 
      t.priority === "high" || t.priority === "yuksek" || t.priority === "urgent" || t.priority === "acil"
    );

    kpis.openTickets = openTickets.length;
    kpis.slaBreachedTickets = slaBreachedTickets.length;

    if (openTickets.length >= 10) {
      actions.push(makeAction("alert", `${openTickets.length} açık destek talebi birikmiş`,
        `CRM sisteminde ${openTickets.length} çözülmemiş ticket var. ${slaBreachedTickets.length} tanesi SLA süresini aşmış. Backlog büyüyor — operasyonel akış aksayabilir.`,
        openTickets.length >= 20 ? "high" : "med", {
        deepLink: "/crm?channel=franchise",
        metadata: { openCount: openTickets.length, slaBreached: slaBreachedTickets.length },
      }));
    }

    if (highPriorityOpen.length >= 3) {
      actions.push(makeAction("escalate", `${highPriorityOpen.length} yüksek öncelikli ticket bekliyor`,
        `Acil/yüksek öncelikli ${highPriorityOpen.length} destek talebi hâlâ açık. Bu talepler öncelikle ele alınmalı.`,
        "high", {
        deepLink: "/crm?channel=franchise",
        metadata: { ticketIds: highPriorityOpen.map((t: any) => t.id).slice(0, 10) },
      }));
    }

    // ── PDKS Uyumluluk Takibi ──
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const lowCompliance = await db.select().from(pdksMonthlyStats)
        .where(and(
          eq(pdksMonthlyStats.month, currentMonth),
          eq(pdksMonthlyStats.year, currentYear),
          sql`${pdksMonthlyStats.complianceScore} < 60`
        ));
      if (lowCompliance.length >= 3) {
        actions.push(makeAction("alert",
          `${lowCompliance.length} personel düşük PDKS uyumluluğu`,
          `Bu ay ${lowCompliance.length} personelin uyumluluk skoru %60'ın altında. Geç kalma, devamsızlık veya erken çıkma sorunları tespit edildi.`,
          lowCompliance.length >= 5 ? "high" : "med", {
          deepLink: "/pdks-excel-import",
          metadata: { lowComplianceCount: lowCompliance.length },
        }));
      }
    } catch { /* PDKS tablosu boş olabilir */ }

    if (criticalFaults.length >= 3) {
      const faultsByBranch: Record<number, number> = {};
      for (const f of criticalFaults) {
        const bid = (f as any).branchId;
        if (bid) faultsByBranch[bid] = (faultsByBranch[bid] || 0) + 1;
      }
      const worstBranch = Object.entries(faultsByBranch).sort(([, a], [, b]) => b - a)[0];
      const branchName = worstBranch ? allBranches.find(b => b.id === Number(worstBranch[0]))?.name || `Şube #${worstBranch[0]}` : "";

      actions.push(makeAction("alert", `${criticalFaults.length} kritik arıza tüm şubelerde`, `Sistemde toplam ${criticalFaults.length} kritik/yüksek öncelikli açık arıza var. En çok arıza: ${branchName} (${worstBranch?.[1] || 0}).`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/arizalar",
        metadata: { faultsByBranch },
      }));
    }

    const now = new Date();
    const slaThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const slaBreachedComplaints = openComplaints.filter((c: any) => {
      const created = c.createdAt ? new Date(c.createdAt) : null;
      return created && created < slaThreshold;
    });
    if (slaBreachedComplaints.length > 0) {
      kpis.slaBreachedComplaints = slaBreachedComplaints.length;
      actions.push(makeAction("escalate", `${slaBreachedComplaints.length} şikayet SLA süresini aştı`, `${slaBreachedComplaints.length} ürün şikayeti 48 saatten fazla süredir çözümsüz. Müşteri memnuniyeti risk altında.`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/urun-sikayet",
        metadata: { complaintIds: slaBreachedComplaints.map((c: any) => c.id).slice(0, 10) },
      }));
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = allFeedback.filter(f => f.createdAt && new Date(f.createdAt) >= sevenDaysAgo);
    const lowRatingFeedback = recentFeedback.filter(f => f.rating !== null && f.rating <= 2);
    if (lowRatingFeedback.length >= 5) {
      kpis.lowRatingFeedback = lowRatingFeedback.length;
      actions.push(makeAction("report", `Son 7 günde ${lowRatingFeedback.length} düşük puanlı geri bildirim`, `Son 7 günde ${lowRatingFeedback.length} müşteri 1-2 puan vermiş. Trend analizi ve kök neden incelemesi gerekli.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/crm?channel=misafir",
        metadata: { lowRatingCount: lowRatingFeedback.length },
      }));
    }
  } catch (err) {
    console.error("analyzeForHQOps error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

export async function analyzeForHQFinance(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { actions, kpis, anomaliesDetected: false };

    const [inventoryData, quotesData, ordersData] = await Promise.all([
      db.select().from(inventory).where(eq(inventory.isActive, true)),
      db.select().from(supplierQuotes),
      db.select().from(purchaseOrders),
    ]);

    const now = new Date();

    const criticalStock = inventoryData.filter((item: any) => {
      const current = Number(item.currentStock || 0);
      const minimum = Number(item.minimumStock || 0);
      return minimum > 0 && current < minimum;
    });
    const zeroStock = inventoryData.filter((item: any) => Number(item.currentStock || 0) === 0 && Number(item.minimumStock || 0) > 0);

    kpis.criticalStockItems = criticalStock.length;
    kpis.zeroStockItems = zeroStock.length;

    if (zeroStock.length > 0) {
      actions.push(makeAction("alert", `${zeroStock.length} ürün stokta kalmadı`, `${zeroStock.length} ürünün stok seviyesi sıfır. Acil sipariş gerekli: ${zeroStock.slice(0, 3).map((i: any) => i.name || i.code).join(", ")}`, "critical", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/satinalma/stok-yonetimi",
        metadata: { items: zeroStock.map((i: any) => ({ id: i.id, name: i.name, code: i.code })).slice(0, 10) },
      }));
    } else if (criticalStock.length >= 5) {
      actions.push(makeAction("alert", `${criticalStock.length} ürün minimum stok altında`, `${criticalStock.length} ürünün stok seviyesi minimum seviyenin altında. Sipariş planlaması yapılmalı.`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/satinalma/stok-yonetimi",
        metadata: { criticalCount: criticalStock.length },
      }));
    }

    const staleQuotes = quotesData.filter((q: any) => q.validUntil && new Date(q.validUntil) < now);
    if (staleQuotes.length >= 3) {
      kpis.staleQuotes = staleQuotes.length;
      actions.push(makeAction("remind", `${staleQuotes.length} tedarikçi teklifi süresi dolmuş`, `${staleQuotes.length} tedarikçi teklifinin geçerlilik süresi dolmuş. Fiyat güncellemesi veya yeni teklif alınması gerekiyor.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/satinalma/tedarikci-yonetimi",
        metadata: { staleCount: staleQuotes.length },
      }));
    }

    const pendingOrders = ordersData.filter((o: any) => o.status === "taslak" || o.status === "onay_bekliyor" || o.status === "pending" || o.status === "beklemede" || o.status === "draft");
    if (pendingOrders.length >= 5) {
      const totalAmount = pendingOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
      kpis.pendingOrders = pendingOrders.length;
      kpis.pendingOrdersTotal = totalAmount;
      actions.push(makeAction("remind", `${pendingOrders.length} onay bekleyen sipariş`, `${pendingOrders.length} sipariş onay bekliyor. Toplam tutar: ${totalAmount.toLocaleString("tr-TR")} TL`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/satinalma/siparis-yonetimi",
        metadata: { pendingCount: pendingOrders.length, totalAmount },
      }));
    }
  } catch (err) {
    console.error("analyzeForHQFinance error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

export async function analyzeForExecutive(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { actions, kpis, anomaliesDetected: false };

    const [allBranches, allUsers, allFaults, allComplaints, allFeedback, allTasks, allPerf, allInventory] = await Promise.all([
      db.select().from(branches),
      db.select().from(users).where(eq(users.isActive, true)),
      db.select().from(equipmentFaults),
      db.select().from(productComplaints),
      db.select().from(customerFeedback),
      db.select().from(tasks),
      db.select().from(employeePerformanceScores),
      db.select().from(inventory).where(eq(inventory.isActive, true)),
    ]);

    const now = new Date();
    const openFaults = allFaults.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
    const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");
    const openComplaints = allComplaints.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu" && c.status !== "closed");
    const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "onaylandi" && t.status !== "tamamlandi");

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = allFeedback.filter(f => f.createdAt && new Date(f.createdAt) >= sevenDaysAgo);
    const avgRating = recentFeedback.length > 0
      ? recentFeedback.reduce((s, f) => s + (f.rating || 0), 0) / recentFeedback.length
      : 0;

    const zeroStock = allInventory.filter((item: any) => Number(item.currentStock || 0) === 0 && Number(item.minimumStock || 0) > 0);

    kpis.totalBranches = allBranches.length;
    kpis.activePersonnel = allUsers.length;
    kpis.criticalFaults = criticalFaults.length;
    kpis.openComplaints = openComplaints.length;
    kpis.overdueTasks = overdueTasks.length;
    kpis.avgCustomerRating = avgRating.toFixed(1);
    kpis.zeroStockItems = zeroStock.length;

    const risks: string[] = [];
    if (criticalFaults.length >= 5) risks.push(`${criticalFaults.length} kritik arıza`);
    if (openComplaints.length >= 10) risks.push(`${openComplaints.length} açık şikayet`);
    if (overdueTasks.length >= 20) risks.push(`${overdueTasks.length} gecikmiş görev`);
    if (zeroStock.length >= 3) risks.push(`${zeroStock.length} ürün stoksuz`);
    if (avgRating > 0 && avgRating < 3) risks.push(`Müşteri puanı düşük: ${avgRating.toFixed(1)}/5`);

    if (risks.length > 0) {
      actions.push(makeAction("report", "Günlük Risk Özeti", `Bugün dikkat edilmesi gereken ${risks.length} konu: ${risks.join("; ")}`, risks.length >= 3 ? "high" : "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/",
        metadata: { risks, kpis },
      }));
    }

    const faultsByBranch: Record<number, number> = {};
    for (const f of criticalFaults) {
      const bid = (f as any).branchId;
      if (bid) faultsByBranch[bid] = (faultsByBranch[bid] || 0) + 1;
    }
    const worstBranches = Object.entries(faultsByBranch)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([bid, cnt]) => {
        const br = allBranches.find(b => b.id === Number(bid));
        return { name: br?.name || `Şube #${bid}`, count: cnt };
      });

    if (worstBranches.length > 0 && worstBranches[0].count >= 3) {
      actions.push(makeAction("alert", `${worstBranches[0].name} şubesinde yoğun arıza`, `${worstBranches[0].name} şubesinde ${worstBranches[0].count} kritik arıza. Operasyonel risk yüksek.`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/arizalar",
        metadata: { worstBranches },
      }));
    }
  } catch (err) {
    console.error("analyzeForExecutive error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

export async function analyzeForFactory(userId: string): Promise<AnalysisResult> {
  const actions: Omit<InsertAgentPendingAction, "runId">[] = [];
  const kpis: Record<string, any> = {};

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { actions, kpis, anomaliesDetected: false };

    let batchesData: any[] = [];
    let faultsData: any[] = [];
    try {
      [batchesData, faultsData] = await Promise.all([
        db.select().from(productionBatches),
        db.select().from(equipmentFaults),
      ]);
    } catch {}

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentBatches = batchesData.filter((b: any) => {
      const d = b.productionDate ? new Date(b.productionDate) : null;
      return d && d >= thirtyDaysAgo;
    });
    const qualityIssueBatches = recentBatches.filter((b: any) => b.status === "rejected" || (b.qualityScore !== null && Number(b.qualityScore) < 70));
    const pendingQCBatches = recentBatches.filter((b: any) => b.status === "quality_check");

    const factoryFaults = faultsData.filter((f: any) => {
      const isOpen = f.status === "acik" || f.status === "open" || f.status === "in_progress";
      return isOpen;
    });

    kpis.recentBatches = recentBatches.length;
    kpis.qualityIssues = qualityIssueBatches.length;
    kpis.pendingQC = pendingQCBatches.length;
    kpis.openFactoryFaults = factoryFaults.length;

    if (qualityIssueBatches.length >= 3) {
      actions.push(makeAction("alert", `${qualityIssueBatches.length} üretim partisinde kalite sorunu`, `Son 30 günde ${qualityIssueBatches.length} parti reddedilmiş veya düşük kalite skoru almış. Üretim hattı incelemesi gerekli.`, "high", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/fabrika",
        metadata: { qualityIssueCount: qualityIssueBatches.length },
      }));
    }

    if (pendingQCBatches.length >= 5) {
      actions.push(makeAction("remind", `${pendingQCBatches.length} parti kalite kontrol bekliyor`, `Kalite kontrol bekleyen ${pendingQCBatches.length} parti var. Gecikme üretim akışını yavaşlatabilir.`, "med", {
        targetUserId: user.id as any,
        targetRoleScope: user.role,
        deepLink: "/fabrika",
        metadata: { pendingQCCount: pendingQCBatches.length },
      }));
    }
  } catch (err) {
    console.error("analyzeForFactory error:", err);
  }

  return { actions: actions.slice(0, MAX_ACTIONS_PER_RUN), kpis, anomaliesDetected: actions.length > 0 };
}

function getAnalyzerForRole(role: string): (userId: string) => Promise<AnalysisResult> {
  const group = getRoleGroup(role);
  switch (group) {
    case "branch_floor": return analyzeForBranchFloor;
    case "branch_mgmt": return analyzeForBranchMgmt;
    case "hq_ops": return analyzeForHQOps;
    case "hq_finance": return analyzeForHQFinance;
    case "executive": return analyzeForExecutive;
    case "factory": return analyzeForFactory;
    default: return analyzeForBranchFloor;
  }
}

async function callLlmForInsights(
  kpis: Record<string, any>,
  roleGroup: string,
  existingActions: Omit<InsertAgentPendingAction, "runId">[]
): Promise<{ actions: Omit<InsertAgentPendingAction, "runId">[]; tokensUsed: number; model: string } | null> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `Sen DOSPRESSO franchise operasyon asistanısın (Mr. Dobody Agent). Verilen KPI verilerine dayanarak ek aksiyon önerileri üret.

KURALLAR:
- Yalnızca verilen veriyi kullan, uydurma yapma
- Sadece şu aksiyon tipleri kabul edilir: remind, escalate, report, suggest_task, alert
- Severity: low, med, high, critical
- DOSPRESSO'nun lehine çalış, zararlı öneri yapma
- Kişisel bilgi (TC, email, telefon, maaş) paylaşma
- Finansal talimat verme
- Türkçe yaz
- En fazla 3 ek aksiyon öner
- Zaten var olan aksiyonları tekrarlama

Yanıt formatı:
{"actions": [{"actionType": "remind|escalate|report|suggest_task|alert", "title": "string", "description": "string", "severity": "low|med|high|critical", "deepLink": "/path"}]}`;

  const existingTitles = existingActions.map(a => a.title).join(", ");
  const userContent = `Rol grubu: ${roleGroup}
KPI verileri: ${JSON.stringify(kpis)}
Mevcut aksiyonlar (tekrarlama): ${existingTitles || "yok"}`;

  try {
    const data = await aiChatCall({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      __aiContext: { feature: "agent_engine", operation: "llmGateway" },
    } as Parameters<typeof aiChatCall>[0]);

    const rawContent = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens ?? 0;
    const model = data.model || "gpt-4o-mini";

    const parsed = LlmActionSchema.safeParse(JSON.parse(rawContent));
    if (!parsed.success) return null;

    const candidateActions = parsed.data.actions
      .filter(a => ACTION_TYPES.includes(a.actionType))
      .map(a => makeAction(a.actionType, a.title, a.description, a.severity, { deepLink: a.deepLink }));

    const safetyResult = checkBatchActions(
      candidateActions.map(a => ({
        actionType: a.actionType as string,
        title: a.title,
        description: a.description || "",
        severity: a.severity as string,
        deepLink: a.deepLink || undefined,
      }))
    );

    const validActions = safetyResult.approvedActions.map(a =>
      makeAction(a.actionType as ActionType, a.title, a.description, a.severity as Severity, { deepLink: a.deepLink })
    );

    if (safetyResult.rejectedActions.length > 0) {
    }

    return { actions: validActions, tokensUsed, model };
  } catch (err) {
    if (isAiBudgetError(err)) throw err;
    console.error("LLM gateway error:", err);
    return null;
  }
}

export async function runAgentAnalysis(
  userId: string,
  runType: "daily_analysis" | "weekly_summary" | "event_triggered" = "daily_analysis",
  triggeredBy: "cron" | "event" | "manual" = "cron"
): Promise<{ run: InsertAgentRun | null; actionsCreated: number }> {
  const startTime = Date.now();

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { run: null, actionsCreated: 0 };

    const roleGroup = getRoleGroup(user.role);
    const dailyCount = await getDailyActionCount(userId);
    if (dailyCount >= MAX_DAILY_ACTIONS_PER_USER) {
      return { run: null, actionsCreated: 0 };
    }

    const analyzer = getAnalyzerForRole(user.role);
    const result = await analyzer(userId);

    let llmResult: { actions: Omit<InsertAgentPendingAction, "runId">[]; tokensUsed: number; model: string } | null = null;

    if (result.anomaliesDetected) {
      llmResult = await callLlmForInsights(result.kpis, roleGroup, result.actions);
    }

    const allActions = [...result.actions];
    if (llmResult) {
      allActions.push(...llmResult.actions);
    }

    const remainingQuota = MAX_DAILY_ACTIONS_PER_USER - dailyCount;
    const actionsToCreate = allActions.slice(0, Math.min(MAX_ACTIONS_PER_RUN, remainingQuota));

    const scopeType = user.branchId ? "branch" : (roleGroup === "executive" ? "global" : "role");
    const scopeId = user.branchId ? String(user.branchId) : roleGroup;

    const [agentRun] = await db.insert(agentRuns).values({
      runType,
      scopeType,
      scopeId,
      triggeredBy,
      inputKpis: result.kpis,
      llmUsed: !!llmResult,
      llmModel: llmResult?.model ?? null,
      llmTokens: llmResult?.tokensUsed ?? 0,
      actionsGenerated: actionsToCreate.length,
      status: "success",
      executionTimeMs: Date.now() - startTime,
    }).returning();

    const runId = agentRun.id;

    for (const action of actionsToCreate) {
      await db.insert(agentPendingActions).values({
        ...action,
        runId,
      });
    }

    await db.insert(aiAgentLogs).values({
      runType: `agent_${runType}`,
      triggeredByUserId: userId,
      targetRoleScope: roleGroup,
      targetUserId: userId,
      branchId: user.branchId ?? null,
      inputSummary: `kpis:${Object.keys(result.kpis).length} anomalies:${result.anomaliesDetected}`,
      outputSummary: `actions:${actionsToCreate.length} llm:${!!llmResult} tokens:${llmResult?.tokensUsed ?? 0}`,
      actionCount: actionsToCreate.length,
      status: "success",
      executionTimeMs: Date.now() - startTime,
    });

    return {
      run: {
        runType,
        scopeType,
        scopeId,
        triggeredBy,
        inputKpis: result.kpis,
        llmUsed: !!llmResult,
        llmModel: llmResult?.model ?? null,
        llmTokens: llmResult?.tokensUsed ?? 0,
        actionsGenerated: actionsToCreate.length,
        status: "success",
        executionTimeMs: Date.now() - startTime,
      },
      actionsCreated: actionsToCreate.length,
    };
  } catch (err) {
    console.error("runAgentAnalysis error:", err);

    try {
      await db.insert(aiAgentLogs).values({
        runType: `agent_${runType}`,
        triggeredByUserId: userId,
        targetRoleScope: "unknown",
        inputSummary: `error`,
        outputSummary: `error: ${(err as Error).message?.substring(0, 200)}`,
        actionCount: 0,
        status: "error",
        executionTimeMs: Date.now() - startTime,
      });
    } catch {}

    return { run: null, actionsCreated: 0 };
  }
}

export async function runBatchAnalysis(
  userIds: string[],
  runType: "daily_analysis" | "weekly_summary" = "daily_analysis",
  triggeredBy: "cron" | "event" | "manual" = "cron"
): Promise<{ totalActions: number; usersProcessed: number; errors: number }> {
  let totalActions = 0;
  let usersProcessed = 0;
  let errors = 0;

  for (const uid of userIds) {
    try {
      const result = await runAgentAnalysis(uid, runType, triggeredBy);
      totalActions += result.actionsCreated;
      usersProcessed++;
    } catch {
      errors++;
    }
  }

  return { totalActions, usersProcessed, errors };
}
