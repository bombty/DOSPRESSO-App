import { db } from "./db";
import { eventTriggeredTasks } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export type EventSourceType = 
  | 'task_assigned'
  | 'checklist_assigned'
  | 'feedback_received'
  | 'fault_reported'
  | 'fault_assigned'
  | 'leave_request'
  | 'training_assigned'
  | 'stock_alert'
  | 'sla_warning'
  | 'performance_review'
  | 'quality_audit'
  | 'task_completed'
  | 'checklist_completed'
  | 'announcement';

interface CreateEventTaskParams {
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  priority?: number;
  targetUrl?: string;
  sourceType: EventSourceType;
  sourceId?: number;
  sourceLabel?: string;
  expiresAt?: Date;
}

export async function createEventTask(params: CreateEventTaskParams): Promise<void> {
  try {
    const existing = await db.select({ id: eventTriggeredTasks.id })
      .from(eventTriggeredTasks)
      .where(and(
        eq(eventTriggeredTasks.userId, params.userId),
        eq(eventTriggeredTasks.sourceType, params.sourceType),
        params.sourceId ? eq(eventTriggeredTasks.sourceId, params.sourceId) : sql`true`,
        eq(eventTriggeredTasks.isCompleted, false)
      ))
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(eventTriggeredTasks).values({
      userId: params.userId,
      title: params.title,
      description: params.description || null,
      icon: params.icon || null,
      priority: params.priority || 2,
      targetUrl: params.targetUrl || null,
      sourceType: params.sourceType,
      sourceId: params.sourceId || null,
      sourceLabel: params.sourceLabel || null,
      expiresAt: params.expiresAt || null,
    });
  } catch (error) {
    console.error("Error creating event task:", error);
  }
}

export async function createEventTaskForMultipleUsers(
  userIds: string[],
  params: Omit<CreateEventTaskParams, 'userId'>
): Promise<void> {
  for (const userId of userIds) {
    await createEventTask({ ...params, userId });
  }
}

export async function resolveEventTask(sourceType: EventSourceType, sourceId: number): Promise<void> {
  try {
    await db.update(eventTriggeredTasks)
      .set({ 
        isCompleted: true, 
        isAutoResolved: true, 
        completedAt: new Date() 
      })
      .where(and(
        eq(eventTriggeredTasks.sourceType, sourceType),
        eq(eventTriggeredTasks.sourceId, sourceId),
        eq(eventTriggeredTasks.isCompleted, false)
      ));
  } catch (error) {
    console.error("Error resolving event task:", error);
  }
}

export async function resolveEventTaskForUser(
  userId: string, 
  sourceType: EventSourceType, 
  sourceId?: number
): Promise<void> {
  try {
    const conditions = [
      eq(eventTriggeredTasks.userId, userId),
      eq(eventTriggeredTasks.sourceType, sourceType),
      eq(eventTriggeredTasks.isCompleted, false),
    ];
    if (sourceId) {
      conditions.push(eq(eventTriggeredTasks.sourceId, sourceId));
    }

    await db.update(eventTriggeredTasks)
      .set({ 
        isCompleted: true, 
        isAutoResolved: true, 
        completedAt: new Date() 
      })
      .where(and(...conditions));
  } catch (error) {
    console.error("Error resolving user event task:", error);
  }
}

export function onTaskAssigned(taskId: number, taskDescription: string, assignedToUserId: string, assignerName: string): void {
  createEventTask({
    userId: assignedToUserId,
    title: `Yeni gorev: ${taskDescription.substring(0, 80)}`,
    description: `${assignerName} tarafindan atandi`,
    icon: "ClipboardCheck",
    priority: 1,
    targetUrl: `/operasyon?tab=gorevler`,
    sourceType: 'task_assigned',
    sourceId: taskId,
    sourceLabel: taskDescription.substring(0, 100),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

export function onTaskCompleted(taskId: number, taskDescription: string, assignerUserId: string, completedByName: string): void {
  createEventTask({
    userId: assignerUserId,
    title: `Gorev tamamlandi: ${taskDescription.substring(0, 60)}`,
    description: `${completedByName} gorevi tamamladi, kontrol edin`,
    icon: "CheckCircle",
    priority: 2,
    targetUrl: `/operasyon?tab=gorevler`,
    sourceType: 'task_completed',
    sourceId: taskId,
    sourceLabel: taskDescription.substring(0, 100),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
}

export function onChecklistAssigned(
  checklistName: string,
  assignedToUserIds: string[],
  branchName?: string
): void {
  const title = `Checklist tamamla: ${checklistName.substring(0, 60)}`;
  const desc = branchName ? `${branchName} subesi icin atandi` : "Size atandi";
  createEventTaskForMultipleUsers(assignedToUserIds, {
    title,
    description: desc,
    icon: "ClipboardList",
    priority: 1,
    targetUrl: `/operasyon?tab=checklistler`,
    sourceType: 'checklist_assigned',
    sourceLabel: checklistName.substring(0, 100),
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  });
}

export function onFeedbackReceived(
  feedbackId: number,
  feedbackText: string,
  targetUserIds: string[],
  branchName?: string
): void {
  createEventTaskForMultipleUsers(targetUserIds, {
    title: `Geri bildirim incele${branchName ? `: ${branchName}` : ''}`,
    description: feedbackText.substring(0, 100),
    icon: "MessageSquare",
    priority: 2,
    targetUrl: `/raporlar?tab=geri-bildirimler`,
    sourceType: 'feedback_received',
    sourceId: feedbackId,
    sourceLabel: feedbackText.substring(0, 100),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
}

export function onFaultReported(
  faultId: number,
  faultDescription: string,
  targetUserIds: string[],
  branchName?: string
): void {
  createEventTaskForMultipleUsers(targetUserIds, {
    title: `Ariza incele${branchName ? `: ${branchName}` : ''}`,
    description: faultDescription.substring(0, 100),
    icon: "AlertTriangle",
    priority: 1,
    targetUrl: `/ekipman?tab=ariza-yonetimi`,
    sourceType: 'fault_reported',
    sourceId: faultId,
    sourceLabel: faultDescription.substring(0, 100),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });
}

export function onFaultAssigned(
  faultId: number,
  faultDescription: string,
  assignedToUserId: string
): void {
  createEventTask({
    userId: assignedToUserId,
    title: `Ariza gorevi: ${faultDescription.substring(0, 60)}`,
    description: "Size atanan ariza kaydini inceleyin",
    icon: "Wrench",
    priority: 1,
    targetUrl: `/ekipman?tab=ariza-yonetimi`,
    sourceType: 'fault_assigned',
    sourceId: faultId,
    sourceLabel: faultDescription.substring(0, 100),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
}

export function onLeaveRequest(
  leaveId: number,
  employeeName: string,
  supervisorUserIds: string[]
): void {
  createEventTaskForMultipleUsers(supervisorUserIds, {
    title: `Izin talebi: ${employeeName}`,
    description: "Izin talebini onaylayin veya reddedin",
    icon: "Calendar",
    priority: 2,
    targetUrl: `/operasyon?tab=izin-yonetimi`,
    sourceType: 'leave_request',
    sourceId: leaveId,
    sourceLabel: employeeName,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });
}

export function onTrainingAssigned(
  trainingId: number,
  trainingName: string,
  assignedToUserId: string
): void {
  createEventTask({
    userId: assignedToUserId,
    title: `Egitimi tamamla: ${trainingName.substring(0, 60)}`,
    description: "Atanan egitimi tamamlayin",
    icon: "GraduationCap",
    priority: 2,
    targetUrl: `/akademi`,
    sourceType: 'training_assigned',
    sourceId: trainingId,
    sourceLabel: trainingName.substring(0, 100),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

export function onStockAlert(
  itemName: string,
  targetUserIds: string[]
): void {
  createEventTaskForMultipleUsers(targetUserIds, {
    title: `Dusuk stok: ${itemName}`,
    description: "Stok seviyesi kritik, siparis verin",
    icon: "Package",
    priority: 1,
    targetUrl: `/satinalma?tab=stok-yonetimi`,
    sourceType: 'stock_alert',
    sourceLabel: itemName,
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  });
}

export function onSLAWarning(
  faultId: number,
  faultDescription: string,
  targetUserIds: string[]
): void {
  createEventTaskForMultipleUsers(targetUserIds, {
    title: `SLA uyarisi: ${faultDescription.substring(0, 60)}`,
    description: "SLA suresi yaklasıyor, acil aksiyon alin",
    icon: "AlertCircle",
    priority: 1,
    targetUrl: `/ekipman?tab=ariza-yonetimi`,
    sourceType: 'sla_warning',
    sourceId: faultId,
    sourceLabel: faultDescription.substring(0, 100),
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  });
}

export function onPerformanceReview(
  employeeId: number,
  employeeName: string,
  supervisorUserIds: string[]
): void {
  createEventTaskForMultipleUsers(supervisorUserIds, {
    title: `Performans degerlendirmesi: ${employeeName}`,
    description: "Personel performans degerlendirmesi yapin",
    icon: "BarChart",
    priority: 2,
    targetUrl: `/raporlar?tab=performans`,
    sourceType: 'performance_review',
    sourceId: employeeId,
    sourceLabel: employeeName,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

export function onQualityAudit(
  auditId: number,
  branchName: string,
  supervisorUserIds: string[]
): void {
  createEventTaskForMultipleUsers(supervisorUserIds, {
    title: `Kalite denetimi: ${branchName}`,
    description: "Denetim sonuclarini inceleyin",
    icon: "Search",
    priority: 2,
    targetUrl: `/raporlar?tab=kalite-denetimi`,
    sourceType: 'quality_audit',
    sourceId: auditId,
    sourceLabel: branchName,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });
}
