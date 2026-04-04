// ========================================
// DOSPRESSO Mr. Dobody — Workflow Engine
// 8 iş akışı: olay → analiz → öneri oluştur
// ========================================

import { db } from "../db";
import { eq, and, desc, sql, lt, gt, lte, isNull, or } from "drizzle-orm";
import {
  dobodyProposals, dobodyEvents, dobodyLearning, dobodyWorkflowConfidence,
  auditsV2, auditActionsV2, branches, users,
  shifts, projectTasks, projects,
} from "@shared/schema";

// ──────────────────────────────────────────
// EVENT → PROPOSAL GENERATOR
// ──────────────────────────────────────────

export async function fireEvent(eventType: string, sourceModule: string, entityType?: string, entityId?: number, eventData?: Record<string, any>) {
  try {
    // Event kaydet
    const [event] = await db.insert(dobodyEvents).values({
      eventType, sourceModule,
      entityType: entityType || null,
      entityId: entityId || null,
      eventData: eventData || null,
      proposalsGenerated: 0,
    }).returning();

    // Workflow'lara yönlendir
    let generated = 0;

    switch (eventType) {
      case 'audit_completed':
        generated += await wf1_auditCompleted(eventData || {});
        break;
      case 'action_sla_approaching':
        generated += await wf2_actionSlaApproaching(eventData || {});
        break;
      case 'action_sla_breached':
        generated += await wf2_actionSlaBreached(eventData || {});
        break;
      case 'score_dropped':
        generated += await wf6_performanceWarning(eventData || {});
        break;
      case 'task_overdue':
        generated += await wf7_projectDelay(eventData || {});
        break;
    }

    // Event'i güncelle
    if (generated > 0) {
      await db.update(dobodyEvents)
        .set({ proposalsGenerated: generated })
        .where(eq(dobodyEvents.id, event.id));
    }

    return { eventId: event.id, proposalsGenerated: generated };
  } catch (error) {
    console.error("fireEvent error:", error);
    return { eventId: 0, proposalsGenerated: 0 };
  }
}

// ──────────────────────────────────────────
// WF-1: DENETİM DÖNGÜSÜ
// Tetik: Denetim tamamlandığında
// Analiz: Skor düşüşü, kategorik zayıflık
// ──────────────────────────────────────────
async function wf1_auditCompleted(data: Record<string, any>): Promise<number> {
  let count = 0;
  const { auditId, branchId, totalScore, branchName } = data;
  if (!auditId || !branchId) return 0;

  const score = Number(totalScore || 0);

  // Düşük skor uyarısı (60 altı)
  if (score < 60) {
    const ok = await createProposal({
      workflowType: 'WF-1', roleTarget: 'coach', branchId,
      proposalType: 'warning', priority: 'acil',
      title: `${branchName || 'Şube'} denetim skoru kritik: ${score}/100`,
      description: `Son denetimde skor 60'ın altında. Acil takip denetimi önerilir.`,
      sourceModule: 'denetim', relatedEntityType: 'audit', relatedEntityId: auditId,
      suggestedActionType: 'schedule_audit',
      suggestedActionData: { branchId, reason: 'low_score', score },
    });
    if (ok) count++;
  }

  // Trend düşüşü kontrol (son 3 denetim)
  try {
    const history = await db.select({ totalScore: auditsV2.totalScore })
      .from(auditsV2)
      .where(and(eq(auditsV2.branchId, branchId), sql`${auditsV2.totalScore} IS NOT NULL`))
      .orderBy(desc(auditsV2.completedAt))
      .limit(3);

    if (history.length >= 3) {
      const scores = history.map(h => Number(h.totalScore || 0));
      // 3 ardışık düşüş
      if (scores[0] < scores[1] && scores[1] < scores[2]) {
        const ok = await createProposal({
          workflowType: 'WF-1', roleTarget: 'cgo', branchId,
          proposalType: 'warning', priority: 'onemli',
          title: `${branchName || 'Şube'} — 3 denetimdir skor düşüyor`,
          description: `Son 3 denetim skoru: ${scores[2]}→${scores[1]}→${scores[0]}. Trend olumsuz.`,
          sourceModule: 'denetim', relatedEntityType: 'audit', relatedEntityId: auditId,
          suggestedActionType: 'schedule_audit',
        });
        if (ok) count++;
      }
    }
  } catch (e) { /* trend analiz başarısız — devam */ }

  return count;
}

// ──────────────────────────────────────────
// WF-2: AKSİYON SLA TAKİBİ
// Tetik: Deadline yaklaşma / aşılma
// ──────────────────────────────────────────
async function wf2_actionSlaApproaching(data: Record<string, any>): Promise<number> {
  const { actionId, title, branchName, deadline, assignedName } = data;
  if (!actionId) return 0;

  await createProposal({
    workflowType: 'WF-2', roleTarget: 'supervisor', branchId: data.branchId,
    proposalType: 'warning', priority: 'onemli',
    title: `Aksiyon deadline yaklaşıyor: ${title || 'İsimsiz'}`,
    description: `${branchName || 'Şube'} — ${assignedName || 'Atanan'} sorumlu. Deadline: ${deadline}`,
    sourceModule: 'denetim', relatedEntityType: 'audit_action', relatedEntityId: actionId,
    suggestedActionType: 'send_notification',
  });
  return 1;
}

async function wf2_actionSlaBreached(data: Record<string, any>): Promise<number> {
  const { actionId, title, branchName } = data;
  if (!actionId) return 0;

  await createProposal({
    workflowType: 'WF-2', roleTarget: 'coach', branchId: data.branchId,
    proposalType: 'warning', priority: 'acil',
    title: `SLA İHLALİ: ${title || 'Aksiyon'} süresi doldu!`,
    description: `${branchName || 'Şube'} — Aksiyon çözülmeden deadline geçti. Escalation gerekli.`,
    sourceModule: 'denetim', relatedEntityType: 'audit_action', relatedEntityId: actionId,
    suggestedActionType: 'send_notification',
  });
  return 1;
}

// ──────────────────────────────────────────
// WF-6: PERFORMANS ERKEN UYARI
// Tetik: Şube skoru düştüğünde
// ──────────────────────────────────────────
async function wf6_performanceWarning(data: Record<string, any>): Promise<number> {
  const { branchId, branchName, currentScore, previousScore, category } = data;
  if (!branchId) return 0;

  const diff = Number(previousScore || 0) - Number(currentScore || 0);
  if (diff <= 5) return 0; // 5 puandan az düşüş önemsiz

  await createProposal({
    workflowType: 'WF-6', roleTarget: 'coach', branchId,
    proposalType: 'warning', priority: diff > 15 ? 'acil' : 'onemli',
    title: `${branchName || 'Şube'} performans düşüşü: ${diff.toFixed(0)} puan`,
    description: `${category ? category + ' kategorisinde ' : ''}skor ${previousScore}→${currentScore}. İnceleme önerilir.`,
    sourceModule: 'denetim', relatedEntityType: 'branch', relatedEntityId: branchId,
    suggestedActionType: 'schedule_audit',
  });
  return 1;
}

// ──────────────────────────────────────────
// WF-7: PROJE GECİKME
// Tetik: Görev deadline geçtiğinde
// ──────────────────────────────────────────
async function wf7_projectDelay(data: Record<string, any>): Promise<number> {
  const { taskId, taskTitle, projectName, assigneeName } = data;
  if (!taskId) return 0;

  await createProposal({
    workflowType: 'WF-7', roleTarget: 'ceo',
    proposalType: 'warning', priority: 'onemli',
    title: `Proje görevi gecikti: ${taskTitle || 'İsimsiz'}`,
    description: `${projectName || 'Proje'} — ${assigneeName || 'Atanan'} sorumlu. Deadline geçti.`,
    sourceModule: 'proje', relatedEntityType: 'project_task', relatedEntityId: taskId,
    suggestedActionType: 'send_notification',
  });
  return 1;
}

// ──────────────────────────────────────────
// HELPER: Öneri oluştur (günlük limit kontrollü)
// ──────────────────────────────────────────
async function createProposal(params: {
  workflowType: string; roleTarget: string; branchId?: number;
  proposalType: string; priority: string;
  title: string; description: string;
  sourceModule: string; relatedEntityType?: string; relatedEntityId?: number;
  suggestedActionType?: string; suggestedActionData?: Record<string, any>;
}): Promise<boolean> {
  try {
    // Günde max 3 kontrol
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(dobodyProposals)
      .where(and(
        eq(dobodyProposals.roleTarget, params.roleTarget),
        sql`${dobodyProposals.createdAt} >= ${todayStart.toISOString()}`,
      ));

    if (Number(todayCount[0]?.count || 0) >= 3) return false;

    // Aynı entity için bekleyen öneri var mı?
    if (params.relatedEntityId) {
      const existing = await db.select({ id: dobodyProposals.id })
        .from(dobodyProposals)
        .where(and(
          eq(dobodyProposals.status, 'pending'),
          eq(dobodyProposals.relatedEntityId, params.relatedEntityId),
          eq(dobodyProposals.workflowType, params.workflowType),
          eq(dobodyProposals.roleTarget, params.roleTarget),
        )).limit(1);
      if (existing.length > 0) return false; // duplikasyon engelle
    }

    await db.insert(dobodyProposals).values({
      ...params,
      branchId: params.branchId || null,
      relatedEntityType: params.relatedEntityType || null,
      relatedEntityId: params.relatedEntityId || null,
      suggestedActionType: params.suggestedActionType || null,
      suggestedActionData: params.suggestedActionData || null,
      status: 'pending',
    });

    return true;
  } catch (error) {
    console.error("createProposal error:", error);
    return false;
  }
}

// ──────────────────────────────────────────
// SCHEDULED: SLA yaklaşma kontrolü (periodik çağrılır)
// ──────────────────────────────────────────
export async function checkPendingActions() {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Deadline'ı 3 gün içinde olan açık aksiyonlar
    const approaching = await db.select({
      action: auditActionsV2,
      branchName: branches.name,
    })
      .from(auditActionsV2)
      .innerJoin(auditsV2, eq(auditsV2.id, auditActionsV2.auditId))
      .innerJoin(branches, eq(branches.id, auditsV2.branchId))
      .where(and(
        or(eq(auditActionsV2.status, 'open'), eq(auditActionsV2.status, 'in_progress')),
        lte(auditActionsV2.deadline, threeDaysLater.toISOString()),
        gt(auditActionsV2.deadline, now.toISOString()),
      ));

    for (const item of approaching) {
      await fireEvent('action_sla_approaching', 'denetim', 'audit_action', item.action.id, {
        actionId: item.action.id,
        title: item.action.title,
        branchName: item.branchName,
        deadline: item.action.deadline,
        branchId: item.action.auditId, // will be resolved
      });
    }

    // Deadline geçmiş aksiyonlar
    const breached = await db.select({
      action: auditActionsV2,
      branchName: branches.name,
    })
      .from(auditActionsV2)
      .innerJoin(auditsV2, eq(auditsV2.id, auditActionsV2.auditId))
      .innerJoin(branches, eq(branches.id, auditsV2.branchId))
      .where(and(
        or(eq(auditActionsV2.status, 'open'), eq(auditActionsV2.status, 'in_progress')),
        lt(auditActionsV2.deadline, now.toISOString()),
      ));

    for (const item of breached) {
      if (!item.action.slaBreached) {
        await db.update(auditActionsV2).set({ slaBreached: true }).where(eq(auditActionsV2.id, item.action.id));
      }
      await fireEvent('action_sla_breached', 'denetim', 'audit_action', item.action.id, {
        actionId: item.action.id,
        title: item.action.title,
        branchName: item.branchName,
      });
    }

    return { approaching: approaching.length, breached: breached.length };
  } catch (error) {
    console.error("checkPendingActions error:", error);
    return { approaching: 0, breached: 0 };
  }
}

// ──────────────────────────────────────────
// WF-8: HAFTALIK BRİEF
// Her Pazartesi: rol bazlı geçmiş hafta özeti
// ──────────────────────────────────────────
export async function generateWeeklyBrief() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let generated = 0;

    // Geçen hafta denetim sayısı ve ortalama skor
    const auditStats = await db.select({
      count: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(avg(${auditsV2.totalScore}::numeric), 0)::numeric(5,1)`,
      minScore: sql<number>`coalesce(min(${auditsV2.totalScore}::numeric), 0)::numeric(5,1)`,
    })
      .from(auditsV2)
      .where(and(
        sql`${auditsV2.completedAt} >= ${weekAgo.toISOString()}`,
        sql`${auditsV2.totalScore} IS NOT NULL`,
      ));

    const totalAudits = Number(auditStats[0]?.count || 0);
    const avgScore = Number(auditStats[0]?.avgScore || 0);
    const minScore = Number(auditStats[0]?.minScore || 0);

    // Açık aksiyon sayısı
    const openActions = await db.select({ count: sql<number>`count(*)::int` })
      .from(auditActionsV2)
      .where(or(eq(auditActionsV2.status, 'open'), eq(auditActionsV2.status, 'in_progress')));
    const actionCount = Number(openActions[0]?.count || 0);

    // Bekleyen öneri sayısı
    const pendingProps = await db.select({ count: sql<number>`count(*)::int` })
      .from(dobodyProposals)
      .where(eq(dobodyProposals.status, 'pending'));
    const pendingCount = Number(pendingProps[0]?.count || 0);

    // CEO Brief
    const ceoBrief = [
      `Bu hafta ${totalAudits} denetim yapıldı.`,
      totalAudits > 0 ? `Ortalama skor: ${avgScore}, en düşük: ${minScore}.` : '',
      actionCount > 0 ? `${actionCount} açık aksiyon maddesi var.` : 'Tüm aksiyonlar tamamlandı.',
      pendingCount > 0 ? `${pendingCount} bekleyen Dobody önerisi var.` : '',
    ].filter(Boolean).join(' ');

    const ok1 = await createProposal({
      workflowType: 'WF-8', roleTarget: 'ceo',
      proposalType: 'info', priority: 'bilgi',
      title: `Haftalık Özet — ${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`,
      description: ceoBrief,
      sourceModule: 'sistem',
    });
    if (ok1) generated++;

    // Coach Brief
    const coachBrief = [
      `Bu hafta ${totalAudits} denetim tamamlandı.`,
      totalAudits > 0 ? `Ortalama skor: ${avgScore}.` : 'Hiç denetim yapılmadı.',
      actionCount > 0 ? `${actionCount} açık aksiyon takip edilmeli.` : '',
    ].filter(Boolean).join(' ');

    const ok2 = await createProposal({
      workflowType: 'WF-8', roleTarget: 'coach',
      proposalType: 'info', priority: 'bilgi',
      title: `Haftalık Denetim Özeti — ${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`,
      description: coachBrief,
      sourceModule: 'denetim',
    });
    if (ok2) generated++;

    // Event kaydet
    await db.insert(dobodyEvents).values({
      eventType: 'weekly_brief', sourceModule: 'sistem',
      eventData: { totalAudits, avgScore, minScore, actionCount, pendingCount },
      proposalsGenerated: generated,
    });

    return { generated, totalAudits, avgScore, actionCount };
  } catch (error) {
    console.error("generateWeeklyBrief error:", error);
    return { generated: 0 };
  }
}

// ──────────────────────────────────────────
// EXPIRED PROPOSAL CLEANUP
// Süresi dolmuş pending önerileri expired yap
// ──────────────────────────────────────────
export async function cleanupExpiredProposals() {
  try {
    const now = new Date();
    const result = await db.update(dobodyProposals)
      .set({ status: 'expired' })
      .where(and(
        eq(dobodyProposals.status, 'pending'),
        sql`${dobodyProposals.expiresAt} IS NOT NULL`,
        lte(dobodyProposals.expiresAt, now),
      ))
      .returning({ id: dobodyProposals.id });

    // Expired önerilerin öğrenme kaydı
    for (const p of result) {
      const [prop] = await db.select().from(dobodyProposals).where(eq(dobodyProposals.id, p.id));
      if (prop) {
        await db.insert(dobodyLearning).values({
          workflowType: prop.workflowType,
          proposalId: prop.id,
          outcome: 'expired',
          confidenceDelta: '-1.0',
        });
      }
    }

    return { expired: result.length };
  } catch (error) {
    console.error("cleanupExpired error:", error);
    return { expired: 0 };
  }
}
