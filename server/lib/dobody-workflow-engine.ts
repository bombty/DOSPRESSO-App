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
      // Dobody-6: Yeni modül bağlantıları
      case 'shift_missing':
        generated += await wfShiftMissing(eventData || {});
        break;
      case 'stock_critical':
        generated += await wfStockCritical(eventData || {});
        break;
      case 'equipment_overdue':
        generated += await wfEquipmentOverdue(eventData || {});
        break;
      case 'checklist_incomplete':
        generated += await wfChecklistIncomplete(eventData || {});
        break;
      case 'training_expiring':
        generated += await wfTrainingExpiring(eventData || {});
        break;
      case 'system_health_issue':
        generated += await wfSystemHealth(eventData || {});
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

// ──────────────────────────────────────────
// DOBODY-6: YENİ MODÜL BAĞLANTILARI
// ──────────────────────────────────────────

// WF-5: Vardiya eksik
async function wfShiftMissing(data: Record<string, any>): Promise<number> {
  const { branchId, branchName, date, missingCount } = data;
  if (!branchId) return 0;
  const ok = await createProposal({
    workflowType: 'WF-5', roleTarget: 'supervisor', branchId,
    proposalType: 'warning', priority: 'onemli',
    title: `${branchName || 'Şube'} — ${date || 'yarın'} vardiya planı eksik`,
    description: `${missingCount || ''} personel için vardiya planlanmamış. Planlama yapılmalı.`,
    sourceModule: 'vardiya',
    suggestedActionType: 'send_message',
  });
  return ok ? 1 : 0;
}

// WF-3: Stok kritik
async function wfStockCritical(data: Record<string, any>): Promise<number> {
  const { branchId, branchName, productName, currentStock, minLevel, daysLeft } = data;
  if (!branchId) return 0;
  const ok = await createProposal({
    workflowType: 'WF-3', roleTarget: 'supervisor', branchId,
    proposalType: 'action', priority: daysLeft && daysLeft <= 1 ? 'acil' : 'onemli',
    title: `${branchName || 'Şube'} — ${productName || 'Ürün'} stoku kritik`,
    description: `Mevcut: ${currentStock || '?'}, minimum: ${minLevel || '?'}. Tahmini ${daysLeft || '?'} gün kaldı. Sipariş önerilir.`,
    sourceModule: 'stok',
    suggestedActionType: 'send_message',
    suggestedActionData: { productName, branchId, suggestedOrder: minLevel ? (Number(minLevel) * 3) : null },
  });
  return ok ? 1 : 0;
}

// WF — Ekipman bakım gecikmiş
async function wfEquipmentOverdue(data: Record<string, any>): Promise<number> {
  const { branchId, branchName, equipmentName, lastMaintenanceDate, overduedays } = data;
  if (!branchId && !equipmentName) return 0;
  const ok = await createProposal({
    workflowType: 'WF-3', roleTarget: 'supervisor', branchId,
    proposalType: 'warning', priority: 'onemli',
    title: `${equipmentName || 'Ekipman'} bakımı ${overduedays || ''} gün gecikmiş`,
    description: `${branchName || 'Şube'} — Son bakım: ${lastMaintenanceDate || 'bilinmiyor'}. Bakım planlanmalı.`,
    sourceModule: 'ekipman',
    suggestedActionType: 'send_message',
  });
  return ok ? 1 : 0;
}

// WF — Checklist tamamlanmamış
async function wfChecklistIncomplete(data: Record<string, any>): Promise<number> {
  const { branchId, branchName, checklistType, assignedTo } = data;
  if (!branchId) return 0;
  const ok = await createProposal({
    workflowType: 'WF-3', roleTarget: 'supervisor', branchId,
    proposalType: 'warning', priority: 'onemli',
    title: `${branchName || 'Şube'} — ${checklistType || 'Günlük'} checklist tamamlanmadı`,
    description: `${assignedTo || 'Sorumlu'} henüz checklistini tamamlamamış. Hatırlatma önerilir.`,
    sourceModule: 'checklist',
    suggestedActionType: 'send_message',
  });
  return ok ? 1 : 0;
}

// WF-4: Eğitim/sertifika bitiyor
async function wfTrainingExpiring(data: Record<string, any>): Promise<number> {
  const { userId, userName, trainingName, expiresIn, branchId, branchName } = data;
  if (!userName) return 0;
  const ok = await createProposal({
    workflowType: 'WF-4', roleTarget: 'coach',
    proposalType: 'action', priority: expiresIn && expiresIn <= 7 ? 'acil' : 'onemli',
    title: `${userName} — ${trainingName || 'Sertifika'} ${expiresIn || ''} gün sonra bitiyor`,
    description: `${branchName || ''} şubesinde ${userName} personelinin eğitim sertifikası sona ermek üzere. Yenileme eğitimi atanmalı.`,
    sourceModule: 'egitim',
    suggestedActionType: 'send_message',
  });
  return ok ? 1 : 0;
}

// ──────────────────────────────────────────
// SİSTEM SAĞLIK İZLEME (Admin'e bildirir)
// ──────────────────────────────────────────

async function wfSystemHealth(data: Record<string, any>): Promise<number> {
  const { issueType, description, severity, affectedModule, affectedEndpoint } = data;
  const ok = await createProposal({
    workflowType: 'WF-SYSTEM', roleTarget: 'admin',
    proposalType: 'warning', priority: severity === 'critical' ? 'acil' : 'onemli',
    title: `Sistem: ${issueType || 'Sorun tespit edildi'}`,
    description: `${description || ''}${affectedModule ? ` — Modül: ${affectedModule}` : ''}${affectedEndpoint ? ` — Endpoint: ${affectedEndpoint}` : ''}`,
    sourceModule: 'sistem',
    suggestedActionType: 'send_message',
  });
  return ok ? 1 : 0;
}

// ──────────────────────────────────────────
// PERİYODİK KONTROLLER (Tüm modüller)
// ──────────────────────────────────────────

export async function runPeriodicChecks() {
  const results = { shifts: 0, dataQuality: 0, system: 0, security: 0, business: 0, total: 0 };
  
  try {
    // ═══════════════════════════════════════
    // 1. VARDİYA PLANI KONTROLÜ
    // ═══════════════════════════════════════
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const branchesWithoutShifts = await db.execute(sql`
      SELECT b.id, b.name FROM branches b
      WHERE b.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM shifts s WHERE s.branch_id = b.id 
        AND s.shift_date = ${tomorrowStr}
        AND s.deleted_at IS NULL
      )
      LIMIT 20
    `);
    
    for (const branch of (branchesWithoutShifts as any).rows || []) {
      const r = await fireEvent('shift_missing', 'vardiya', 'branch', branch.id, {
        branchId: branch.id, branchName: branch.name, date: tomorrowStr,
      });
      results.shifts += r.proposalsGenerated;
    }

    // ═══════════════════════════════════════
    // 2. SLA KONTROL
    // ═══════════════════════════════════════
    await checkPendingActions();

    // ═══════════════════════════════════════
    // 3. VERİ KALİTESİ KONTROLLERİ
    // ═══════════════════════════════════════

    // 3a. branchId'si null olan aktif kullanıcılar
    try {
      const nullBranch = await db.execute(sql`
        SELECT count(*)::int as cnt FROM users 
        WHERE is_active = true AND branch_id IS NULL 
        AND role NOT IN ('admin','ceo','cgo','muhasebe_ik','muhasebe','satinalma','coach','marketing','trainer','kalite_kontrol','gida_muhendisi','fabrika_mudur','teknik','destek','yatirimci_hq','fabrika','fabrika_operator','fabrika_sorumlu','fabrika_personel','uretim_sefi','sube_kiosk')
      `);
      const cnt = Number((nullBranch as any).rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        await fireEvent('system_health_issue', 'sistem', 'users', 0, {
          issueType: 'Şubesiz kullanıcı', description: `${cnt} aktif şube çalışanının branchId'si boş — bu kullanıcılar şubeye atanmalı`,
          severity: 'high', affectedModule: 'kullanıcı',
        });
        results.dataQuality++;
      }
    } catch (e) { /* skip */ }

    // 3b. PDKS verisi gelmeyen şubeler (5+ gün)
    try {
      const noPdks = await db.execute(sql`
        SELECT b.id, b.name, 
          (SELECT max(date) FROM pdks_records WHERE branch_id = b.id) as last_record
        FROM branches b WHERE b.is_active = true
        HAVING (SELECT max(date) FROM pdks_records WHERE branch_id = b.id) < current_date - interval '5 days'
        OR (SELECT max(date) FROM pdks_records WHERE branch_id = b.id) IS NULL
        LIMIT 10
      `);
      for (const row of (noPdks as any).rows || []) {
        await fireEvent('system_health_issue', 'sistem', 'branch', row.id, {
          issueType: 'PDKS verisi yok', description: `${row.name} şubesinden 5+ gündür PDKS verisi gelmiyor. Kiosk bağlantısı kontrol edilmeli.`,
          severity: 'critical', affectedModule: 'pdks',
        });
        results.dataQuality++;
      }
    } catch (e) { /* skip */ }

    // 3c. Yetim aksiyon kayıtları (parent denetim silinmiş)
    try {
      const orphanActions = await db.execute(sql`
        SELECT count(*)::int as cnt FROM audit_actions_v2 a
        WHERE NOT EXISTS (SELECT 1 FROM audits_v2 au WHERE au.id = a.audit_id)
      `);
      const cnt = Number((orphanActions as any).rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        await fireEvent('system_health_issue', 'sistem', 'audit_actions_v2', 0, {
          issueType: 'Yetim aksiyon kayıtları', description: `${cnt} aksiyon kaydının parent denetimi bulunamıyor — veri tutarsızlığı`,
          severity: 'high', affectedModule: 'denetim',
        });
        results.dataQuality++;
      }
    } catch (e) { /* skip */ }

    // 3d. Tamamlanmış denetimde totalScore null
    try {
      const nullScore = await db.execute(sql`
        SELECT count(*)::int as cnt FROM audits_v2 
        WHERE status = 'completed' AND total_score IS NULL
      `);
      const cnt = Number((nullScore as any).rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        await fireEvent('system_health_issue', 'sistem', 'audits_v2', 0, {
          issueType: 'Skorsuz tamamlanmış denetim', description: `${cnt} denetim tamamlanmış ama skoru hesaplanmamış`,
          severity: 'high', affectedModule: 'denetim',
        });
        results.dataQuality++;
      }
    } catch (e) { /* skip */ }

    // 3e. Aktif olmayan kullanıcıya atanmış bekleyen görevler
    try {
      const inactiveAssigned = await db.execute(sql`
        SELECT count(*)::int as cnt FROM project_tasks pt
        JOIN users u ON u.id = pt.assigned_to
        WHERE pt.status != 'completed' AND u.is_active = false
      `);
      const cnt = Number((inactiveAssigned as any).rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        await fireEvent('system_health_issue', 'sistem', 'project_tasks', 0, {
          issueType: 'Pasif kullanıcıya atanmış görevler', description: `${cnt} görev artık aktif olmayan kullanıcılara atanmış — yeniden atanmalı`,
          severity: 'medium', affectedModule: 'proje',
        });
        results.business++;
      }
    } catch (e) { /* skip */ }

    // ═══════════════════════════════════════
    // 4. KRİTİK TABLO ERİŞİM KONTROLÜ
    // ═══════════════════════════════════════
    const criticalTables = ['users','branches','shifts','notifications','audits_v2',
      'dobody_proposals','equipment','checklists','inventory','pdks_records'];
    for (const table of criticalTables) {
      try {
        await db.execute(sql.raw(`SELECT 1 FROM ${table} LIMIT 1`));
      } catch {
        await fireEvent('system_health_issue', 'sistem', 'table', 0, {
          issueType: 'Tablo erişim hatası', description: `${table} tablosuna erişilemiyor — veritabanı sorunu`,
          severity: 'critical', affectedModule: 'veritabanı',
        });
        results.system++;
      }
    }

    // ═══════════════════════════════════════
    // 5. İŞ MANTIĞI TUTARSIZLIKLARI
    // ═══════════════════════════════════════

    // 5a. Deadline geçmiş ama hala "open" aksiyonlar
    try {
      const overdueOpen = await db.execute(sql`
        SELECT count(*)::int as cnt FROM audit_actions_v2
        WHERE status = 'open' AND deadline < current_timestamp
      `);
      const cnt = Number((overdueOpen as any).rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        await fireEvent('system_health_issue', 'sistem', 'audit_actions_v2', 0, {
          issueType: 'Gecikmiş açık aksiyonlar', description: `${cnt} denetim aksiyonunun deadline'ı geçmiş ama hala açık durumda`,
          severity: 'high', affectedModule: 'denetim',
        });
        results.business++;
      }
    } catch (e) { /* skip */ }

  } catch (error) {
    console.error("runPeriodicChecks error:", error);
  }
  
  results.total = results.shifts + results.dataQuality + results.system + results.security + results.business;
  return results;
}
