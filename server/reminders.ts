import { storage } from "./storage";
import type { Task, Equipment, User } from "@shared/schema";
import { sendNotificationEmail } from "./email";
import { db } from "./db";
import { correctiveActions, users, auditInstances, branches, factoryProducts, employeeOnboardingAssignments, onboardingTemplates, notifications, staffEvaluations, employeeOnboarding, hqSupportTickets, hqSupportMessages, HQ_SUPPORT_STATUS, inventory, supplierQuotes, customerFeedback } from "@shared/schema";
import { eq, lt, and, ne, lte, or, inArray, gt, gte, count, max, sql } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import { schedulerManager } from "./scheduler-manager";

const REMINDER_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAINTENANCE_WARNING_DAYS = 7; // Notify 7 days before maintenance due
const SLA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const OVERDUE_REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours - max 1 overdue reminder per task per day
const CAPA_REMINDER_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours for CAPA reminders

const sentCapaNotifications = new Map<number, number>();
const sentOnboardingReminderKeys = new Set<string>();

export async function checkAndSendReminders() {
  try {
    // Check task reminders
    const tasks = await storage.getTasks();
    const incompleteTasks = tasks.filter(
      (task: Task) => task.status === "beklemede" || task.status === "gecikmiş"
    );

    for (const task of incompleteTasks) {
      if (!task.assignedToId) continue;

      const now = new Date();
      const reminders = await storage.getReminders(task.assignedToId);
      const existingReminder = reminders.find((r) => r.taskId === task.id);

      if (!existingReminder) {
        await storage.createReminder({
          taskId: task.id,
          userId: task.assignedToId,
          reminderCount: 0,
          nextReminderAt: new Date(Date.now() + REMINDER_INTERVAL),
          isActive: true,
        });
        continue;
      }

      // Maximum 10 reminders per task to prevent spam
      const MAX_REMINDERS = 10;
      
      if (
        existingReminder.isActive &&
        existingReminder.nextReminderAt &&
        now >= existingReminder.nextReminderAt
      ) {
        const currentCount = existingReminder.reminderCount || 0;
        
        // Stop sending if max reached
        if (currentCount >= MAX_REMINDERS) {
          // Deactivate reminder after max reached
          if (existingReminder.isActive) {
            await storage.updateReminder(existingReminder.id, {
              isActive: false,
            });
            console.log(`Hatırlatma limiti aşıldı, devre dışı bırakıldı: Görev ${task.id} (${currentCount} hatırlatma)`);
          }
          continue;
        }
        
        const newCount = currentCount + 1;
        await storage.updateReminder(existingReminder.id, {
          reminderCount: newCount,
          lastReminderAt: now,
          nextReminderAt: new Date(Date.now() + REMINDER_INTERVAL),
        });

        console.log(`Hatırlatma gönderildi: Görev ${task.id}, Kullanıcı ${task.assignedToId}, Sayı: ${newCount}/${MAX_REMINDERS}`);
      }
    }

    // Check checklist reminders - daily overdue checklists
    await checkChecklistReminders();

    // Check overdue tasks and send notifications to both assignee and assigner
    await checkOverdueTaskNotifications();

    // Check equipment maintenance reminders
    await checkMaintenanceReminders();

    // Check overdue CAPA (Corrective Actions) and send notifications
    await checkCapaNotifications();

    // Check employee onboarding deadline reminders
    await checkOnboardingDeadlineReminders();
  } catch (error) {
    console.error("Hatırlatma kontrolü hatası:", error);
  }
}

async function checkChecklistReminders() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const existingUnreadChecklist = await db.select({
      id: notifications.id,
      link: notifications.link,
      userId: notifications.userId,
    }).from(notifications)
      .where(and(
        eq(notifications.type, 'checklist_overdue'),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false),
        gt(notifications.createdAt, oneDayAgo)
      ));
    const existingChecklistMap = new Map<string, number>(
      existingUnreadChecklist.map(n => [`${n.userId}:${n.link}`, n.id])
    );

    try {
      const shifts = await storage.getShifts?.() || [];
      
      for (const shift of shifts) {
        if (!shift.assignedToId) continue;
        
        const shiftChecklists = await storage.getShiftChecklists(shift.id);
        const incompleteChecklists = shiftChecklists.filter((sc: any) => !sc.isCompleted);
        
        for (const checklist of incompleteChecklists) {
          const checklistLink = `/vardiya/${shift.id}/checklists`;
          const dedupKey = `${shift.assignedToId}:${checklistLink}`;
          const existingId = existingChecklistMap.get(dedupKey);

          try {
            if (existingId) {
              await db.update(notifications)
                .set({ createdAt: new Date() })
                .where(eq(notifications.id, existingId));
            } else {
              await storage.createNotification({
                userId: shift.assignedToId,
                type: 'checklist_overdue',
                title: 'Checklist Hatirlatmasi',
                message: 'Vardiya checklist\'ini tamamlamayi unutmadiniz mi?',
                link: checklistLink,
                isRead: false,
                branchId: shift.branchId,
              });
            }
          } catch (err) {
            // Skip this checklist if notification fails
          }
        }
      }
    } catch (err) {
      // Silently skip if method doesn't exist
    }
  } catch (error) {
    console.error("Checklist hatirlatma hatasi:", error);
  }
}

// Check for overdue CAPA (Corrective Actions) and notify assignees
async function checkCapaNotifications() {
  try {
    const now = new Date();
    
    // Find overdue CAPAs (dueDate < now AND status not CLOSED)
    const overdueCapas = await db.select({
      id: correctiveActions.id,
      priority: correctiveActions.priority,
      description: correctiveActions.description,
      dueDate: correctiveActions.dueDate,
      assignedToId: correctiveActions.assignedToId,
      auditInstanceId: correctiveActions.auditInstanceId,
      status: correctiveActions.status,
    })
      .from(correctiveActions)
      .where(
        and(
          lt(correctiveActions.dueDate, now),
          ne(correctiveActions.status, 'CLOSED')
        )
      );

    for (const capa of overdueCapas) {
      // Skip if no assignee
      if (!capa.assignedToId) continue;

      const capaKey = capa.id;
      const lastNotified = sentCapaNotifications.get(capaKey);
      
      // Only send every CAPA_REMINDER_INTERVAL (4 hours)
      if (lastNotified && (now.getTime() - lastNotified) < CAPA_REMINDER_INTERVAL) {
        continue;
      }

      // Calculate days overdue
      const daysOverdue = Math.ceil((now.getTime() - new Date(capa.dueDate!).getTime()) / (24 * 60 * 60 * 1000));
      const priorityEmoji = capa.priority === 'critical' ? '🔴' : capa.priority === 'high' ? '🟠' : '🟡';
      const priorityText = capa.priority === 'critical' ? 'Kritik' : capa.priority === 'high' ? 'Yüksek' : 'Orta';

      // Get assignee details for email
      const [assignee] = await db.select().from(users).where(eq(users.id, capa.assignedToId));
      
      // Get audit/branch info for context
      let branchName = '';
      let capaBranchId: number | undefined;
      if (capa.auditInstanceId) {
        const [audit] = await db.select({
          branchId: auditInstances.branchId,
        }).from(auditInstances).where(eq(auditInstances.id, capa.auditInstanceId));
        if (audit?.branchId) {
          capaBranchId = audit.branchId;
          const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, audit.branchId));
          branchName = branch?.name || '';
        }
      }

      // Create in-app notification
      try {
        await storage.createNotification({
          userId: capa.assignedToId,
          type: 'capa_overdue',
          title: `${priorityEmoji} Gecikmiş Düzeltici Aksiyon`,
          message: `${priorityText} öncelikli aksiyon ${daysOverdue} gün gecikti${branchName ? ` - ${branchName}` : ''}`,
          link: `/raporlar/aksiyon-takip?capaId=${capa.id}`,
          isRead: false,
          branchId: capaBranchId,
        });
      } catch (err) {
        console.error(`CAPA notification error for CAPA ${capa.id}:`, err);
      }

      // Send email notification
      if (assignee?.email) {
        try {
          await sendNotificationEmail(
            assignee.email,
            `[DOSPRESSO] Gecikmiş Düzeltici Aksiyon - ${priorityText} Öncelik`,
            `Merhaba ${assignee.firstName || assignee.username || 'Kullanıcı'},

${priorityText} öncelikli bir düzeltici aksiyon (CAPA) ${daysOverdue} gün gecikmiştir.

Aksiyon Detayları:
- Öncelik: ${priorityText}
- Açıklama: ${capa.description?.substring(0, 100)}${(capa.description?.length || 0) > 100 ? '...' : ''}
${branchName ? `- Şube: ${branchName}` : ''}
- Son Tarih: ${new Date(capa.dueDate!).toLocaleDateString('tr-TR')}
- Gecikme: ${daysOverdue} gün

Lütfen aksiyonu en kısa sürede tamamlayın.

DOSPRESSO Franchise Yönetim Sistemi`,
            `<h2 style="color: ${capa.priority === 'critical' ? '#dc2626' : capa.priority === 'high' ? '#ea580c' : '#ca8a04'};">
              ${priorityEmoji} Gecikmiş Düzeltici Aksiyon
            </h2>
            <p>Merhaba <strong>${assignee.firstName || assignee.username || 'Kullanıcı'}</strong>,</p>
            <p>${priorityText} öncelikli bir düzeltici aksiyon (CAPA) <strong>${daysOverdue} gün</strong> gecikmiştir.</p>
            <table style="border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Öncelik</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${priorityText}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Açıklama</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${capa.description?.substring(0, 100)}${(capa.description?.length || 0) > 100 ? '...' : ''}</td></tr>
              ${branchName ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Şube</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${branchName}</td></tr>` : ''}
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Son Tarih</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(capa.dueDate!).toLocaleDateString('tr-TR')}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Gecikme</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">${daysOverdue} gün</td></tr>
            </table>
            <p>Lütfen aksiyonu en kısa sürede tamamlayın.</p>
            <hr style="margin: 24px 0;" />
            <p style="color: #666; font-size: 12px;">DOSPRESSO Franchise Yönetim Sistemi</p>`
          );
        } catch (emailErr) {
          console.error(`CAPA email error for CAPA ${capa.id}:`, emailErr);
        }
      }

      // Update tracking map
      sentCapaNotifications.set(capaKey, now.getTime());
      console.log(`CAPA gecikme bildirimi gönderildi: CAPA #${capa.id}, Kullanıcı: ${capa.assignedToId}, Gecikme: ${daysOverdue} gün`);
    }

    // Update CAPA status to OVERDUE if not already
    for (const capa of overdueCapas) {
      if (capa.status === 'OPEN' || capa.status === 'IN_PROGRESS') {
        try {
          await db.update(correctiveActions)
            .set({ status: 'OVERDUE', updatedAt: now })
            .where(eq(correctiveActions.id, capa.id));
        } catch (updateErr) {
          console.error(`CAPA status update error for CAPA ${capa.id}:`, updateErr);
        }
      }
    }
  } catch (error) {
    console.error("CAPA bildirim hatası:", error);
  }
}

// Check employee onboarding deadline reminders
// Notifies mentor and branch supervisors when onboarding is approaching deadline or overdue
// Also notifies if onboarding stuck at not_started for more than 3 days
async function checkOnboardingDeadlineReminders() {
  try {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD format for deduplication

    // Get all in_progress onboarding records where deadline is within 14 days or overdue
    const inProgressOnboardings = await db.select({
      id: employeeOnboarding.id,
      userId: employeeOnboarding.userId,
      branchId: employeeOnboarding.branchId,
      expectedCompletionDate: employeeOnboarding.expectedCompletionDate,
      assignedMentorId: employeeOnboarding.assignedMentorId,
    })
      .from(employeeOnboarding)
      .where(eq(employeeOnboarding.status, 'in_progress'));

    // Get all not_started onboarding records created more than 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const stuckOnboardings = await db.select({
      id: employeeOnboarding.id,
      userId: employeeOnboarding.userId,
      branchId: employeeOnboarding.branchId,
      createdAt: employeeOnboarding.createdAt,
      assignedMentorId: employeeOnboarding.assignedMentorId,
    })
      .from(employeeOnboarding)
      .where(and(
        eq(employeeOnboarding.status, 'not_started'),
        lt(employeeOnboarding.createdAt, threeDaysAgo)
      ));

    // Process in_progress onboardings
    for (const onboarding of inProgressOnboardings) {
      if (!onboarding.expectedCompletionDate) continue;

      const expectedDate = new Date(onboarding.expectedCompletionDate);
      const daysUntil = Math.ceil((expectedDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Only notify if within 14 days or overdue
      if (daysUntil > 14) continue;

      // Get employee details
      const [employee] = await db.select({
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.id, onboarding.userId));

      if (!employee) continue;

      const employeeName = employee.firstName && employee.lastName
        ? `${employee.firstName} ${employee.lastName}`
        : 'Personel';

      // Determine message based on urgency
      let message = '';
      if (daysUntil < 0) {
        message = `UYARI: ${employeeName} personelin onboarding süresi doldu! Acil değerlendirme yapın.`;
      } else if (daysUntil <= 7) {
        message = `DİKKAT: ${employeeName} personelin onboarding süresinin bitmesine ${daysUntil} gün kaldı.`;
      } else {
        message = `${employeeName} personelin onboarding süresinin bitmesine ${daysUntil} gün kaldı.`;
      }

      // Notify assigned mentor
      if (onboarding.assignedMentorId) {
        const dedupKey = `onboarding_${onboarding.id}_mentor_${todayKey}`;
        if (!sentOnboardingReminderKeys.has(dedupKey)) {
          try {
            await storage.createNotification({
              userId: onboarding.assignedMentorId,
              type: 'onboarding_deadline',
              title: daysUntil < 0 ? 'Onboarding Süresi Doldu' : 'Onboarding Süresi Yaklaşıyor',
              message: message,
              link: `/personel?employeeId=${onboarding.userId}`,
              isRead: false,
              branchId: onboarding.branchId,
            });
            sentOnboardingReminderKeys.add(dedupKey);
          } catch (err) {
            console.error(`Mentor notification error for onboarding ${onboarding.id}:`, err);
          }
        }
      }

      // Notify branch supervisors (supervisor and mudur roles)
      const supervisors = await db.select({
        id: users.id,
      }).from(users).where(and(
        eq(users.branchId, onboarding.branchId),
        or(
          eq(users.role, 'supervisor'),
          eq(users.role, 'mudur')
        ),
        eq(users.isActive, true)
      ));

      for (const supervisor of supervisors) {
        const dedupKey = `onboarding_${onboarding.id}_supervisor_${todayKey}`;
        if (!sentOnboardingReminderKeys.has(dedupKey)) {
          try {
            await storage.createNotification({
              userId: supervisor.id,
              type: 'onboarding_deadline',
              title: daysUntil < 0 ? 'Onboarding Süresi Doldu' : 'Onboarding Süresi Yaklaşıyor',
              message: message,
              link: `/personel?employeeId=${onboarding.userId}`,
              isRead: false,
              branchId: onboarding.branchId,
            });
            sentOnboardingReminderKeys.add(dedupKey);
          } catch (err) {
            console.error(`Supervisor notification error for onboarding ${onboarding.id}:`, err);
          }
        }
      }
    }

    // Process stuck (not_started for 3+ days) onboardings
    for (const onboarding of stuckOnboardings) {
      // Get employee details
      const [employee] = await db.select({
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.id, onboarding.userId));

      if (!employee) continue;

      const employeeName = employee.firstName && employee.lastName
        ? `${employee.firstName} ${employee.lastName}`
        : 'Personel';

      const message = `Uyarı: ${employeeName} personelin onboarding süreci 3 günden uzun süredir başlatılmamış. Lütfen kontrol edin.`;

      // Notify assigned mentor
      if (onboarding.assignedMentorId) {
        const dedupKey = `onboarding_${onboarding.id}_stuck_mentor_${todayKey}`;
        if (!sentOnboardingReminderKeys.has(dedupKey)) {
          try {
            await storage.createNotification({
              userId: onboarding.assignedMentorId,
              type: 'onboarding_stuck',
              title: 'Onboarding Başlatılmamış',
              message: message,
              link: `/personel?employeeId=${onboarding.userId}`,
              isRead: false,
              branchId: onboarding.branchId,
            });
            sentOnboardingReminderKeys.add(dedupKey);
          } catch (err) {
            console.error(`Mentor stuck notification error for onboarding ${onboarding.id}:`, err);
          }
        }
      }

      // Notify branch supervisors
      const supervisors = await db.select({
        id: users.id,
      }).from(users).where(and(
        eq(users.branchId, onboarding.branchId),
        or(
          eq(users.role, 'supervisor'),
          eq(users.role, 'mudur')
        ),
        eq(users.isActive, true)
      ));

      for (const supervisor of supervisors) {
        const dedupKey = `onboarding_${onboarding.id}_stuck_supervisor_${todayKey}`;
        if (!sentOnboardingReminderKeys.has(dedupKey)) {
          try {
            await storage.createNotification({
              userId: supervisor.id,
              type: 'onboarding_stuck',
              title: 'Onboarding Başlatılmamış',
              message: message,
              link: `/personel?employeeId=${onboarding.userId}`,
              isRead: false,
              branchId: onboarding.branchId,
            });
            sentOnboardingReminderKeys.add(dedupKey);
          } catch (err) {
            console.error(`Supervisor stuck notification error for onboarding ${onboarding.id}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error("Onboarding hatırlatma kontrolü hatası:", error);
  }
}

// Check for overdue tasks and notify both assignee and assigner
async function upsertOverdueNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link: string,
  branchId: number | null,
  existingMap: Map<string, number>
) {
  const key = `${type}:${userId}:${link}`;
  const existingId = existingMap.get(key);
  if (existingId) {
    await db.update(notifications)
      .set({ message, createdAt: new Date() })
      .where(eq(notifications.id, existingId));
  } else {
    const newNotif = await storage.createNotification({ userId, type, title, message, link, branchId });
    if (newNotif.id > 0) {
      existingMap.set(key, newNotif.id);
    }
  }
}

// Uses DB-based deduplication — updates existing unread notifications instead of creating duplicates
async function checkOverdueTaskNotifications() {
  try {
    const tasks = await storage.getTasks();
    const now = new Date();
    
    const overdueTasks = tasks.filter((task: Task) => {
      if (!task.dueDate) return false;
      if (task.status === 'onaylandi' || task.status === 'tamamlandi') return false;
      return new Date(task.dueDate) < now;
    });

    if (overdueTasks.length === 0) return;

    const existingUnread = await db.select({
      id: notifications.id,
      link: notifications.link,
      userId: notifications.userId,
      type: notifications.type,
    }).from(notifications)
      .where(and(
        or(
          eq(notifications.type, 'task_overdue'),
          eq(notifications.type, 'task_overdue_assigner')
        ),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ));

    const existingMap = new Map<string, number>(
      existingUnread.map(n => [`${n.type}:${n.userId}:${n.link}`, n.id])
    );

    for (const task of overdueTasks) {
      const taskLink = `/gorevler?taskId=${task.id}`;
      const daysOverdue = Math.ceil((now.getTime() - new Date(task.dueDate!).getTime()) / (24 * 60 * 60 * 1000));

      if (task.assignedToId) {
        try {
          await upsertOverdueNotification(
            task.assignedToId,
            'task_overdue',
            'Geciken Görev Hatırlatması',
            `"${task.description?.substring(0, 40)}${(task.description?.length || 0) > 40 ? '...' : ''}" görevi ${daysOverdue} gün gecikti!`,
            taskLink,
            task.branchId,
            existingMap
          );
        } catch (err) {
          console.error(`Assignee notification error for task ${task.id}:`, err);
        }
      }

      if (task.assignedById && task.assignedById !== task.assignedToId) {
        try {
          const assignee = task.assignedToId ? await storage.getUser(task.assignedToId) : null;
          const assigneeName = assignee?.firstName && assignee?.lastName 
            ? `${assignee.firstName} ${assignee.lastName}` 
            : 'Çalışan';

          await upsertOverdueNotification(
            task.assignedById,
            'task_overdue_assigner',
            'Atadığınız Görev Gecikti',
            `${assigneeName}'a atadığınız "${task.description?.substring(0, 40)}${(task.description?.length || 0) > 40 ? '...' : ''}" görevi ${daysOverdue} gün gecikti!`,
            taskLink,
            task.branchId,
            existingMap
          );
        } catch (err) {
          console.error(`Assigner notification error for task ${task.id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("Gecikmiş görev bildirimi hatası:", error);
  }
}

async function checkMaintenanceReminders() {
  try {
    const allEquipment = await storage.getEquipment();
    const now = new Date();
    const warningDate = new Date(now.getTime() + MAINTENANCE_WARNING_DAYS * 24 * 60 * 60 * 1000);

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentMaintenanceNotifs = await db.select({
      link: notifications.link,
      userId: notifications.userId,
    }).from(notifications)
      .where(and(
        eq(notifications.type, 'maintenance_reminder'),
        gt(notifications.createdAt, oneDayAgo)
      ));
    const recentMaintenanceKeys = new Set(
      recentMaintenanceNotifs.map(n => `${n.userId}:${n.link}`)
    );

    for (const equipment of allEquipment) {
      if (!equipment.nextMaintenanceDate || !equipment.isActive) continue;

      const maintenanceDate = new Date(equipment.nextMaintenanceDate);
      if (maintenanceDate > warningDate) continue;

      let notifyUserId: string | null = null;
      
      if (equipment.maintenanceResponsible === 'hq') {
        const allUsers = await storage.getAllEmployees();
        const hqTeknikUser = allUsers.find((u: User) => u.role === 'teknik');
        notifyUserId = hqTeknikUser?.id || null;
      } else {
        const allUsers = await storage.getAllEmployees(equipment.branchId);
        const branchSupervisor = allUsers.find((u: User) => u.role === 'supervisor');
        notifyUserId = branchSupervisor?.id || null;
      }

      if (!notifyUserId) continue;

      const maintenanceLink = `/ekipman/${equipment.id}`;
      const dedupKey = `${notifyUserId}:${maintenanceLink}`;
      if (recentMaintenanceKeys.has(dedupKey)) continue;

      const isOverdue = maintenanceDate < now;
      const daysUntil = Math.ceil(Math.abs(maintenanceDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      await storage.createNotification({
        userId: notifyUserId,
        type: "maintenance_reminder",
        title: isOverdue ? "Bakım Gecikmiş!" : "Bakım Yaklaşıyor",
        message: isOverdue 
          ? `${equipment.equipmentType} ekipmanının bakımı ${daysUntil} gün gecikmiş. Lütfen en kısa sürede bakım yapın.`
          : `${equipment.equipmentType} ekipmanının bakımı ${daysUntil} gün içinde yapılmalı.`,
        link: maintenanceLink,
        isRead: false,
        branchId: equipment.branchId,
      });

      recentMaintenanceKeys.add(dedupKey);
    }
  } catch (error) {
    console.error("Bakım hatırlatma kontrolü hatası:", error);
  }
}

async function checkEvaluationReminders() {
  try {
    const now = new Date();
    const dayOfMonth = now.getDate();
    if (dayOfMonth < 20) return;

    const todayKey = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvalNotifs = await db.select({
      userId: notifications.userId,
    }).from(notifications)
      .where(and(
        eq(notifications.type, 'evaluation_reminder'),
        gt(notifications.createdAt, cutoffTime)
      ));
    const alreadyNotifiedToday = new Set(recentEvalNotifs.map(n => n.userId));

    const supervisors = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      branchId: users.branchId,
    }).from(users)
      .where(and(
        eq(users.role, 'supervisor'),
        eq(users.isActive, true)
      ));

    for (const sup of supervisors) {
      if (!sup.branchId) continue;
      if (alreadyNotifiedToday.has(sup.id)) continue;

      const branchEmps = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.branchId, sup.branchId),
          eq(users.isActive, true),
          ne(users.id, sup.id)
        ));

      if (branchEmps.length === 0) continue;

      const empIds = branchEmps.map(e => e.id);
      const evaluatedEmps = await db.selectDistinct({ employeeId: staffEvaluations.employeeId })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, sup.id),
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd),
          inArray(staffEvaluations.employeeId, empIds)
        ));

      const evaluatedIds = new Set(evaluatedEmps.map(e => e.employeeId));
      const notEvaluatedCount = branchEmps.filter(e => !evaluatedIds.has(e.id)).length;

      if (notEvaluatedCount > 0) {
        await storage.createNotification({
          userId: sup.id,
          type: "evaluation_reminder",
          title: "Değerlendirme Hatırlatması",
          message: `Bu ay ${notEvaluatedCount} personeli henüz değerlendirmediniz. Ay sonuna ${daysLeft} gün kaldı.`,
          link: "/personel",
          isRead: false,
          branchId: sup.branchId,
        });
      }
    }
  } catch (error) {
    console.error("Değerlendirme hatırlatma kontrolü hatası:", error);
  }
}

export function initReminderSystem() {
  console.log("Hatirlatma sistemi baslatildi (master 10-min tick'e eklendi)");
  checkAndSendReminders();
  checkEvaluationReminders();
}

export function runReminderTick() {
  checkAndSendReminders();
  checkEvaluationReminders();
}

export function startSLACheckSystem() {
  if (schedulerManager.hasJob('sla-check')) {
    console.log("SLA kontrol sistemi zaten calisiyor");
    return;
  }

  console.log("SLA kontrol sistemi baslatildi - Her 15 dakikada bir kontrol edilecek");
  
  storage.checkSLABreaches();
  
  schedulerManager.registerInterval('sla-check', () => storage.checkSLABreaches(), SLA_CHECK_INTERVAL);
}

export function stopSLACheckSystem() {
  schedulerManager.removeJob('sla-check');
}

// ========================================
// EXPIRED PHOTO CLEANUP SYSTEM
// ========================================

// Check for expired photos every 6 hours
const PHOTO_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

async function cleanupExpiredPhotos() {
  try {
    const deletedCount = await storage.deleteExpiredChecklistPhotos();
    if (deletedCount > 0) {
      console.log(`🗑️ Photo cleanup: ${deletedCount} expired checklist photos deleted`);
    }
  } catch (error) {
    console.error("Photo cleanup error:", error);
  }
}

async function cleanupExpiredTicketPhotos() {
  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Find all closed tickets where closedAt is more than 14 days ago
    const closedTickets = await db.select({
      id: hqSupportTickets.id,
    })
      .from(hqSupportTickets)
      .where(and(
        eq(hqSupportTickets.status, HQ_SUPPORT_STATUS.KAPATILDI),
        lte(hqSupportTickets.closedAt, fourteenDaysAgo)
      ));

    if (closedTickets.length === 0) {
      return;
    }

    // Find messages from these tickets that have attachments
    const messagesWithAttachments = await db.select({
      id: hqSupportMessages.id,
      attachments: hqSupportMessages.attachments,
    })
      .from(hqSupportMessages)
      .where(and(
        inArray(hqSupportMessages.ticketId, closedTickets.map(t => t.id)),
        ne(hqSupportMessages.attachments, sql`'[]'::jsonb`)
      ));

    if (messagesWithAttachments.length === 0) {
      return;
    }

    // Delete files from object storage and collect all URLs
    const objectStorageService = new ObjectStorageService();
    let deletedCount = 0;

    for (const message of messagesWithAttachments) {
      const attachments = Array.isArray(message.attachments) ? message.attachments : [];
      
      for (const attachment of attachments) {
        if (attachment.url && attachment.url.startsWith('/objects/')) {
          try {
            await objectStorageService.deleteObjectEntity(attachment.url);
            deletedCount++;
          } catch (err) {
            console.error(`Failed to delete object storage file ${attachment.url}:`, err);
            // Continue with other files even if one fails
          }
        }
      }
    }

    // Clear attachments for all these messages
    await db.update(hqSupportMessages)
      .set({ attachments: [] })
      .where(inArray(hqSupportMessages.id, messagesWithAttachments.map(m => m.id)));

    console.log(`🗑️ Ticket photo cleanup: ${messagesWithAttachments.length} message attachments cleared from closed tickets (${deletedCount} files deleted from storage)`);
  } catch (error) {
    console.error("Ticket photo cleanup error:", error);
  }
}

export function startPhotoCleanupSystem() {
  if (schedulerManager.hasJob('photo-cleanup')) return;
  console.log("Fotograf temizleme sistemi baslatildi - Her 6 saatte bir kontrol edilecek");
  
  cleanupExpiredPhotos();
  cleanupExpiredTicketPhotos();
  
  schedulerManager.registerInterval('photo-cleanup', () => {
    cleanupExpiredPhotos();
    cleanupExpiredTicketPhotos();
  }, PHOTO_CLEANUP_INTERVAL);
}

export function stopPhotoCleanupSystem() {
  schedulerManager.removeJob('photo-cleanup');
}

// ========================================
// EMPLOYEE OF MONTH AUTO CALCULATION
// ========================================

const MONTHLY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Once per day
let lastMonthlyCheck: Date | null = null;

async function checkMonthlyEmployeeOfMonth() {
  try {
    const now = new Date();
    const currentDay = now.getDate();
    
    // Only run on day 1-3 of each month (gives time for late data entry)
    if (currentDay > 3) return;
    
    // Check if we already ran this month
    if (lastMonthlyCheck) {
      const lastCheckMonth = lastMonthlyCheck.getMonth();
      const currentMonth = now.getMonth();
      if (lastCheckMonth === currentMonth) return;
    }
    
    // Calculate for previous month
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    console.log(`🏆 Automatic Employee of Month reminder for ${prevMonth}/${prevYear}`);
    console.log(`   Admins should run calculation manually from /ayin-elemani page`);
    
    // Log reminder for admins - they should check the Employee of Month page
    // Notification will be shown via the existing notification system
    console.log(`   Admin bilgilendirmesi: Ayin Elemani hesaplaması için /ayin-elemani sayfasını ziyaret edin`);
    
    lastMonthlyCheck = now;
    console.log(`🏆 Monthly Employee of Month reminder sent`);
  } catch (error) {
    console.error("Monthly EoM reminder error:", error);
  }
}

export function startMonthlyCalculationSystem() {
  if (schedulerManager.hasJob('monthly-calc')) return;
  console.log("Aylik Ayin Elemani hesaplama sistemi baslatildi - Her gun kontrol edilecek");
  
  schedulerManager.registerTimeout('monthly-calc-init', () => checkMonthlyEmployeeOfMonth(), 10000);
  schedulerManager.registerInterval('monthly-calc', checkMonthlyEmployeeOfMonth, MONTHLY_CHECK_INTERVAL);
}

export function stopMonthlyCalculationSystem() {
  schedulerManager.removeJob('monthly-calc-init');
  schedulerManager.removeJob('monthly-calc');
}

// ═══════════════════════════════════════════════════════════════
// CROSS-MODULE NOTIFICATIONS
// Stok→Satınalma, Arıza→Teknik otomatik uyarılar
// ═══════════════════════════════════════════════════════════════

const STOCK_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const sentStockAlerts = new Map<number, number>(); // productId -> lastNotifiedAt
const STOCK_ALERT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours between alerts for same product


export async function checkLowStockNotifications() {
  try {
    const now = Date.now();
    
    // Get products with current stock below minStock
    const lowStockProducts = await db
      .select()
      .from(factoryProducts)
      .where(and(
        eq(factoryProducts.isActive, true),
        gt(factoryProducts.minStock, 0)
      ));

    // Filter to products with actual low stock (would need stockQuantity field)
    // For now, we'll check products where minStock is set but warn satınalma team
    
    // Get satınalma team users
    const satinalmaUsers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.role, 'satinalma'),
        eq(users.role, 'admin')
      ));

    if (satinalmaUsers.length === 0) {
      console.log("No satınalma users found for stock alerts");
      return;
    }

    // Check each low stock product
    for (const product of lowStockProducts) {
      const lastNotified = sentStockAlerts.get(product.id);
      
      // Skip if we've already notified recently
      if (lastNotified && (now - lastNotified) < STOCK_ALERT_COOLDOWN) {
        continue;
      }

      // Note: In a full implementation, you would compare currentStock vs minStock
      // Since we don't have currentStock in the schema, this serves as a template
      // The system would be triggered by actual stock movements
      
      sentStockAlerts.set(product.id, now);
    }

    console.log(`📦 Stock check completed - ${lowStockProducts.length} products with min stock defined`);
  } catch (error) {
    console.error("Stock notification check error:", error);
  }
}

// Notify Satınalma team about low stock (called when stock drops below minimum)
export async function notifySatinalmaLowStock(productId: number, productName: string, currentStock: number, minStock: number) {
  try {
    // Get satınalma users
    const satinalmaUsers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.role, 'satinalma'),
        eq(users.role, 'admin')
      ));

    for (const user of satinalmaUsers) {
      await storage.createNotification({
        userId: user.id,
        type: 'stock_alert',
        title: '⚠️ Düşük Stok Uyarısı',
        message: `${productName} stok seviyesi kritik! Mevcut: ${currentStock}, Minimum: ${minStock}`,
        link: '/satinalma/stok-yonetimi',
      });
    }

    console.log(`📦 Low stock notification sent for ${productName} to ${satinalmaUsers.length} satınalma users`);
  } catch (error) {
    console.error("Error sending low stock notification:", error);
  }
}

// Notify Teknik team about new fault (called when critical fault is created)
export async function notifyTeknikNewFault(faultId: number, faultTitle: string, branchName: string, priority: string) {
  try {
    // Get teknik users
    const teknikUsers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.role, 'teknik'),
        eq(users.role, 'ekipman_teknik')
      ));

    const priorityEmoji = priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : '🟡';
    const priorityLabel = priority === 'critical' ? 'Kritik' : priority === 'high' ? 'Yüksek' : 'Orta';

    for (const user of teknikUsers) {
      await storage.createNotification({
        userId: user.id,
        type: 'fault_alert',
        title: `${priorityEmoji} Yeni Arıza Bildirimi`,
        message: `${branchName}: ${faultTitle} - Öncelik: ${priorityLabel}`,
        link: '/crm',
      });
    }

    console.log(`🔧 Fault notification sent for "${faultTitle}" to ${teknikUsers.length} teknik users`);
  } catch (error) {
    console.error("Error sending fault notification to teknik:", error);
  }
}

export function startStockAlertSystem() {
  console.log("📦 Stok uyari sistemi baslatildi - Saatlik tick'e eklendi");
  schedulerManager.registerTimeout('stock-alert-init', () => checkLowStockNotifications(), 30000);
}

export function stopStockAlertSystem() {
  schedulerManager.removeJob('stock-alert-init');
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING COMPLETION NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

const ONBOARDING_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

export async function checkOnboardingCompletions() {
  try {
    // Get all completed assignments that haven't notified the manager yet
    const completedAssignments = await db
      .select({
        id: employeeOnboardingAssignments.id,
        userId: employeeOnboardingAssignments.userId,
        branchId: employeeOnboardingAssignments.branchId,
        templateId: employeeOnboardingAssignments.templateId,
        overallProgress: employeeOnboardingAssignments.overallProgress,
        managerNotified: employeeOnboardingAssignments.managerNotified,
        employeeName: users.firstName,
        employeeLastName: users.lastName,
        employeeUsername: users.username,
        templateName: onboardingTemplates.name,
      })
      .from(employeeOnboardingAssignments)
      .leftJoin(users, eq(employeeOnboardingAssignments.userId, users.id))
      .leftJoin(onboardingTemplates, eq(employeeOnboardingAssignments.templateId, onboardingTemplates.id))
      .where(
        and(
          eq(employeeOnboardingAssignments.overallProgress, 100),
          eq(employeeOnboardingAssignments.status, 'completed'),
          eq(employeeOnboardingAssignments.managerNotified, false)
        )
      );

    console.log(`📋 Onboarding check: found ${completedAssignments.length} completed assignments awaiting manager notification`);

    for (const assignment of completedAssignments) {
      try {
        // Get branch supervisor(s)
        const supervisors = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.branchId, assignment.branchId!),
              or(
                eq(users.role, 'supervisor'),
                eq(users.role, 'supervisor_buddy')
              )
            )
          );

        const employeeName = assignment.employeeName && assignment.employeeLastName
          ? `${assignment.employeeName} ${assignment.employeeLastName}`
          : assignment.employeeUsername || 'Personel';

        // Notify each supervisor
        for (const supervisor of supervisors) {
          await storage.createNotification({
            userId: supervisor.id,
            type: 'onboarding_complete',
            title: 'Onboarding Tamamlandı - Değerlendirme Zamanı',
            message: `${employeeName} personelin deneme süreci tamamlandı. Değerlendirme yapın.`,
            link: '/sube/onboarding',
            branchId: assignment.branchId,
          });
          console.log(`📧 Onboarding completion notification sent to supervisor ${supervisor.firstName} for employee ${employeeName}`);
        }

        // Mark assignment as manager notified
        await db
          .update(employeeOnboardingAssignments)
          .set({ managerNotified: true })
          .where(eq(employeeOnboardingAssignments.id, assignment.id));

        console.log(`✅ Marked onboarding assignment ${assignment.id} as manager notified`);
      } catch (assignmentError) {
        console.error(`Error processing onboarding assignment ${assignment.id}:`, assignmentError);
      }
    }
  } catch (error) {
    console.error("Onboarding completion check error:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// STALE QUOTE REMINDERS - Güncel Olmayan Teklif Hatırlatmaları
// ═══════════════════════════════════════════════════════════════

const STALE_QUOTE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export async function checkStaleQuoteReminders() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentStaleNotifs = await db.select({
      userId: notifications.userId,
      link: notifications.link,
    }).from(notifications)
      .where(and(
        eq(notifications.type, 'stale_quote_reminder'),
        gt(notifications.createdAt, oneDayAgo)
      ));

    const alreadyNotifiedKeys = new Set(
      recentStaleNotifs.map(n => `${n.userId}:${n.link}`)
    );

    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM inventory i
      LEFT JOIN supplier_quotes sq ON sq.inventory_id = i.id
      WHERE i.is_active = true
      GROUP BY i.id
      HAVING MAX(sq.created_at) IS NULL 
         OR MAX(sq.created_at) < NOW() - INTERVAL '60 days'
    `);

    const rows = (result as any).rows || result;
    const staleCount = rows.length;

    if (staleCount === 0) {
      console.log("No stale quotes found, skipping notification");
      return;
    }

    const notificationLink = '/satinalma';

    const satinalmaUsers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.role, 'satinalma'),
        eq(users.role, 'admin')
      ));

    let sentCount = 0;
    for (const user of satinalmaUsers) {
      const dedupKey = `${user.id}:${notificationLink}`;
      if (alreadyNotifiedKeys.has(dedupKey)) {
        continue;
      }
      await storage.createNotification({
        userId: user.id,
        type: 'stale_quote_reminder',
        title: 'Guncel Teklif Hatirlatmasi',
        message: `${staleCount} urun 2 aydan fazla suredir guncel teklif almamis. Lutfen kontrol edin.`,
        link: notificationLink,
      });
      alreadyNotifiedKeys.add(dedupKey);
      sentCount++;
    }

    console.log(`Stale quote reminder sent to ${sentCount} users (${satinalmaUsers.length - sentCount} already notified) for ${staleCount} products`);
  } catch (error) {
    console.error("Stale quote reminder check error:", error);
  }
}

export function startStaleQuoteReminderSystem() {
  if (schedulerManager.hasJob('stale-quote')) return;
  console.log("Teklif hatirlatma sistemi baslatildi - Her 24 saatte bir kontrol edilecek");
  
  schedulerManager.registerTimeout('stale-quote-init', () => checkStaleQuoteReminders(), 60000);
  schedulerManager.registerInterval('stale-quote', checkStaleQuoteReminders, STALE_QUOTE_CHECK_INTERVAL);
}

export function stopStaleQuoteReminderSystem() {
  schedulerManager.removeJob('stale-quote-init');
  schedulerManager.removeJob('stale-quote');
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK SLA BREACH CHECK - Müşteri Geri Bildirim SLA İhlal Kontrolü
// ═══════════════════════════════════════════════════════════════

const FEEDBACK_SLA_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour


export async function checkFeedbackSlaBreaches() {
  try {
    const now = new Date();

    const breachedFeedbacks = await db
      .select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        rating: customerFeedback.rating,
        comment: customerFeedback.comment,
        customerName: customerFeedback.customerName,
        responseDeadline: customerFeedback.responseDeadline,
        slaBreached: customerFeedback.slaBreached,
        status: customerFeedback.status,
        feedbackType: customerFeedback.feedbackType,
        createdAt: customerFeedback.createdAt,
      })
      .from(customerFeedback)
      .where(
        and(
          lt(customerFeedback.responseDeadline, now),
          eq(customerFeedback.status, 'new'),
          eq(customerFeedback.slaBreached, false)
        )
      );

    for (const feedback of breachedFeedbacks) {
      try {
        await db.update(customerFeedback)
          .set({ slaBreached: true, updatedAt: now })
          .where(eq(customerFeedback.id, feedback.id));

        const branchResult = await db.select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, feedback.branchId));
        const branchName = branchResult[0]?.name || 'Bilinmeyen Şube';

        const supervisors = await db.select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.branchId, feedback.branchId),
              or(
                eq(users.role, 'supervisor'),
                eq(users.role, 'mudur')
              ),
              eq(users.isActive, true)
            )
          );

        const hqUsers = await db.select({ id: users.id })
          .from(users)
          .where(
            and(
              or(
                eq(users.role, 'cgo'),
                eq(users.role, 'admin')
              ),
              eq(users.isActive, true)
            )
          );

        const notifyUsers = [...supervisors, ...hqUsers];
        const customerLabel = feedback.customerName || 'Anonim';
        const message = `SLA ihlali: ${branchName} - ${customerLabel} geri bildirimi yanıt süresi aşıldı (Puan: ${feedback.rating}/5)`;

        for (const user of notifyUsers) {
          await storage.createNotification({
            userId: user.id,
            type: 'sla_breach',
            title: 'Müşteri Geri Bildirim SLA İhlali',
            message,
            link: `/musteri-memnuniyeti?feedbackId=${feedback.id}`,
            isRead: false,
            branchId: feedback.branchId,
          });
        }

        console.log(`SLA breach detected for feedback #${feedback.id} at ${branchName}, notified ${notifyUsers.length} users`);
      } catch (err) {
        console.error(`Error processing feedback SLA breach for #${feedback.id}:`, err);
      }
    }

    const alreadyBreached = await db
      .select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        rating: customerFeedback.rating,
        customerName: customerFeedback.customerName,
        status: customerFeedback.status,
      })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.slaBreached, true),
          eq(customerFeedback.status, 'new')
        )
      );

    for (const feedback of alreadyBreached) {
      try {
        const feedbackLink = `/musteri-memnuniyeti?feedbackId=${feedback.id}`;
        const branchResult = await db.select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, feedback.branchId));
        const branchName = branchResult[0]?.name || 'Bilinmeyen Şube';

        const supervisors = await db.select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.branchId, feedback.branchId),
              or(
                eq(users.role, 'supervisor'),
                eq(users.role, 'mudur')
              ),
              eq(users.isActive, true)
            )
          );

        const hqUsers = await db.select({ id: users.id })
          .from(users)
          .where(
            and(
              or(
                eq(users.role, 'cgo'),
                eq(users.role, 'admin')
              ),
              eq(users.isActive, true)
            )
          );

        const notifyUsers = [...supervisors, ...hqUsers];
        const customerLabel = feedback.customerName || 'Anonim';
        const message = `Tekrar hatırlatma: ${branchName} - ${customerLabel} geri bildirimi hala yanıtlanmadı (Puan: ${feedback.rating}/5)`;
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        for (const user of notifyUsers) {
          const alreadySent = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.type, 'sla_breach'),
                eq(notifications.link, feedbackLink),
                eq(notifications.userId, user.id),
                gte(notifications.createdAt, cutoff)
              )
            )
            .limit(1);
          if (alreadySent.length > 0) continue;

          await storage.createNotification({
            userId: user.id,
            type: 'sla_breach',
            title: 'SLA İhlali - Tekrar Hatırlatma',
            message,
            link: `/musteri-memnuniyeti?feedbackId=${feedback.id}`,
            isRead: false,
            branchId: feedback.branchId,
          });
        }

        console.log(`SLA breach re-notification for feedback #${feedback.id} at ${branchName}`);
      } catch (err) {
        console.error(`Error re-notifying feedback SLA breach for #${feedback.id}:`, err);
      }
    }

    if (breachedFeedbacks.length > 0 || alreadyBreached.length > 0) {
      console.log(`Feedback SLA check: ${breachedFeedbacks.length} new breaches, ${alreadyBreached.length} ongoing`);
    }
  } catch (error) {
    console.error("Feedback SLA breach check error:", error);
  }
}

export function startFeedbackSlaCheckSystem() {
  console.log("Musteri geri bildirim SLA kontrol sistemi baslatildi - Saatlik tick'e eklendi");
  schedulerManager.registerTimeout('feedback-sla-init', () => checkFeedbackSlaBreaches(), 45000);
}

export function stopFeedbackSlaCheckSystem() {
  schedulerManager.removeJob('feedback-sla-init');
}

export function startOnboardingCompletionSystem() {
  console.log("📋 Onboarding tamamlama bildirim sistemi baslatildi - 10 dakikalik tick'e eklendi");
  schedulerManager.registerTimeout('onboarding-check-init', () => checkOnboardingCompletions(), 20000);
}

export function stopOnboardingCompletionSystem() {
  schedulerManager.removeJob('onboarding-check-init');
}

export async function archiveOldNotifications() {
  try {
    const result = await db.update(notifications)
      .set({ isArchived: true })
      .where(and(
        eq(notifications.isArchived, false),
        lt(notifications.createdAt, sql`NOW() - INTERVAL '30 days'`)
      ))
      .returning({ id: notifications.id });
    const archivedCount = result.length;
    if (archivedCount > 0) {
      console.log(`📦 Archived ${archivedCount} notifications older than 30 days`);
    }
    return archivedCount;
  } catch (error) {
    console.error("Error archiving old notifications:", error);
    return 0;
  }
}

let archiveRanToday = false;

export function startNotificationArchiveSystem() {
  console.log("📦 Bildirim arsivleme sistemi baslatildi - 10 dakikalik tick'e eklendi (Gunluk 02:00)");
  schedulerManager.registerTimeout('notification-archive-init', () => archiveOldNotifications(), 5000);
}

export async function checkAndArchiveIfTime() {
  const now = new Date();
  const istanbulHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).getHours();
  const istanbulMinute = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).getMinutes();

  if (istanbulHour === 2 && istanbulMinute >= 0 && istanbulMinute <= 10) {
    if (!archiveRanToday) {
      archiveRanToday = true;
      await archiveOldNotifications();
    }
  } else {
    archiveRanToday = false;
  }
}

export function stopNotificationArchiveSystem() {
  schedulerManager.removeJob('notification-archive-init');
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY FEEDBACK PATTERN ANALYSIS - Tekrarlayan Sorun Pattern Analizi
// ═══════════════════════════════════════════════════════════════

let feedbackPatternRanThisWeek = false;

const FEEDBACK_CATEGORIES = [
  { column: 'cleanliness_rating', label: 'Temizlik' },
  { column: 'service_rating', label: 'Hizmet' },
  { column: 'product_rating', label: 'Ürün Kalitesi' },
  { column: 'staff_rating', label: 'Personel' },
] as const;

export async function checkFeedbackPatterns() {
  try {
    const now = new Date();

    const activeBranches = await db.select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));

    if (activeBranches.length === 0) return;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let totalNotifications = 0;

    for (const branch of activeBranches) {
      try {
        const feedbackRows = await db
          .select({
            cleanlinessRating: customerFeedback.cleanlinessRating,
            serviceRating: customerFeedback.serviceRating,
            productRating: customerFeedback.productRating,
            staffRating: customerFeedback.staffRating,
            createdAt: customerFeedback.createdAt,
          })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, branch.id),
              gte(customerFeedback.createdAt, thirtyDaysAgo)
            )
          );

        if (feedbackRows.length < 3) continue;

        const last7 = feedbackRows.filter(f => f.createdAt && new Date(f.createdAt) >= sevenDaysAgo);
        const last15 = feedbackRows.filter(f => f.createdAt && new Date(f.createdAt) >= fifteenDaysAgo);
        const all30 = feedbackRows;

        for (const cat of FEEDBACK_CATEGORIES) {
          const getRating = (row: typeof feedbackRows[0]) => {
            switch (cat.column) {
              case 'cleanliness_rating': return row.cleanlinessRating;
              case 'service_rating': return row.serviceRating;
              case 'product_rating': return row.productRating;
              case 'staff_rating': return row.staffRating;
            }
          };

          const avg30Vals = all30.map(getRating).filter((v): v is number => v != null);
          if (avg30Vals.length < 3) continue;
          const avg30 = avg30Vals.reduce((a, b) => a + b, 0) / avg30Vals.length;

          const avg15Vals = last15.map(getRating).filter((v): v is number => v != null);
          const avg7Vals = last7.map(getRating).filter((v): v is number => v != null);

          const has15DaysData = avg15Vals.length >= 3;
          const has7DaysData = avg7Vals.length >= 2;

          if (avg30 < 3.0 && has15DaysData) {
            const hqUsers = await db.select({ id: users.id })
              .from(users)
              .where(
                and(
                  or(eq(users.role, 'cgo'), eq(users.role, 'admin')),
                  eq(users.isActive, true)
                )
              );

            for (const user of hqUsers) {
              await storage.createNotification({
                userId: user.id,
                type: 'feedback_pattern_critical',
                title: 'Kritik: Tekrarlayan Sorun',
                message: `${branch.name} - ${cat.label} kategorisi 15+ gundur ortalama ${avg30.toFixed(1)}/5 (kritik esik: 3.0)`,
                link: `/musteri-memnuniyeti?branchId=${branch.id}`,
                isRead: false,
                branchId: branch.id,
              });
              totalNotifications++;
            }
          } else if (avg30 < 3.5 && has15DaysData) {
            const branchManagers = await db.select({ id: users.id })
              .from(users)
              .where(
                and(
                  eq(users.branchId, branch.id),
                  or(eq(users.role, 'supervisor'), eq(users.role, 'mudur')),
                  eq(users.isActive, true)
                )
              );

            for (const user of branchManagers) {
              await storage.createNotification({
                userId: user.id,
                type: 'feedback_pattern_warning',
                title: 'Uyari: Tekrarlayan Dusuk Puan',
                message: `${branch.name} - ${cat.label} kategorisi 15+ gundur ortalama ${avg30.toFixed(1)}/5 (esik: 3.5)`,
                link: `/musteri-memnuniyeti?branchId=${branch.id}`,
                isRead: false,
                branchId: branch.id,
              });
              totalNotifications++;
            }
          } else if (avg30 < 3.5 && has7DaysData) {
            const supervisors = await db.select({ id: users.id })
              .from(users)
              .where(
                and(
                  eq(users.branchId, branch.id),
                  eq(users.role, 'supervisor'),
                  eq(users.isActive, true)
                )
              );

            for (const user of supervisors) {
              await storage.createNotification({
                userId: user.id,
                type: 'feedback_pattern_attention',
                title: 'Dikkat: Dusuk Puan Trendi',
                message: `${branch.name} - ${cat.label} kategorisi 7+ gundur ortalama ${avg30.toFixed(1)}/5 altinda`,
                link: `/musteri-memnuniyeti?branchId=${branch.id}`,
                isRead: false,
                branchId: branch.id,
              });
              totalNotifications++;
            }
          }
        }

        const prevMonthFeedback = await db
          .select({
            cleanlinessRating: customerFeedback.cleanlinessRating,
            serviceRating: customerFeedback.serviceRating,
            productRating: customerFeedback.productRating,
            staffRating: customerFeedback.staffRating,
          })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, branch.id),
              gte(customerFeedback.createdAt, sixtyDaysAgo),
              lt(customerFeedback.createdAt, thirtyDaysAgo)
            )
          );

        if (prevMonthFeedback.length >= 3) {
          for (const cat of FEEDBACK_CATEGORIES) {
            const getRating = (row: any) => {
              switch (cat.column) {
                case 'cleanliness_rating': return row.cleanlinessRating;
                case 'service_rating': return row.serviceRating;
                case 'product_rating': return row.productRating;
                case 'staff_rating': return row.staffRating;
              }
            };

            const prevVals = prevMonthFeedback.map(getRating).filter((v): v is number => v != null);
            const currVals = all30.map(getRating).filter((v): v is number => v != null);

            if (prevVals.length < 3 || currVals.length < 3) continue;

            const prevAvg = prevVals.reduce((a, b) => a + b, 0) / prevVals.length;
            const currAvg = currVals.reduce((a, b) => a + b, 0) / currVals.length;

            if (prevAvg < 3.5 && currAvg > 4.0) {
              const branchManagers = await db.select({ id: users.id })
                .from(users)
                .where(
                  and(
                    eq(users.branchId, branch.id),
                    or(eq(users.role, 'supervisor'), eq(users.role, 'mudur')),
                    eq(users.isActive, true)
                  )
                );

              for (const user of branchManagers) {
                await storage.createNotification({
                  userId: user.id,
                  type: 'feedback_pattern_improvement',
                  title: 'Iyilesme: Musteri Memnuniyeti Artti',
                  message: `${branch.name} - ${cat.label} kategorisi ${prevAvg.toFixed(1)} -> ${currAvg.toFixed(1)} iyilesme gosterdi`,
                  link: `/musteri-memnuniyeti?branchId=${branch.id}`,
                  isRead: false,
                  branchId: branch.id,
                });
                totalNotifications++;
              }
            }
          }
        }
      } catch (branchErr) {
        console.error(`Feedback pattern analysis error for branch ${branch.id}:`, branchErr);
      }
    }

    console.log(`Feedback pattern analysis completed: ${activeBranches.length} branches analyzed, ${totalNotifications} notifications sent`);
  } catch (error) {
    console.error("Feedback pattern analysis error:", error);
  }
}

export function startFeedbackPatternAnalysisSystem() {
  if (schedulerManager.hasJob('feedback-pattern')) return;
  console.log("Feedback pattern analiz sistemi baslatildi - Pazartesi 08:00 Europe/Istanbul");

  const checkAndRun = async () => {
    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const isMonday = nowTR.getDay() === 1;
    const isTargetTime = nowTR.getHours() === 8 && nowTR.getMinutes() < 10;

    if (isMonday && isTargetTime) {
      if (!feedbackPatternRanThisWeek) {
        feedbackPatternRanThisWeek = true;
        await checkFeedbackPatterns();
      }
    } else {
      feedbackPatternRanThisWeek = false;
    }
  };

  schedulerManager.registerInterval('feedback-pattern', checkAndRun, 5 * 60 * 1000);
}

export function stopFeedbackPatternAnalysisSystem() {
  schedulerManager.removeJob('feedback-pattern');
}

export function stopAllReminderSystems() {
  stopSLACheckSystem();
  stopPhotoCleanupSystem();
  stopMonthlyCalculationSystem();
  stopStockAlertSystem();
  stopStaleQuoteReminderSystem();
  stopFeedbackSlaCheckSystem();
  stopOnboardingCompletionSystem();
  stopNotificationArchiveSystem();
  stopFeedbackPatternAnalysisSystem();
  console.log("[Reminders] All reminder systems stopped.");
}
