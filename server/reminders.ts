import { storage } from "./storage";
import type { Task, Equipment, User } from "@shared/schema";
import { sendNotificationEmail } from "./email";
import { db } from "./db";
import { correctiveActions, users, auditInstances, branches, factoryProducts, employeeOnboardingAssignments, onboardingTemplates, notifications } from "@shared/schema";
import { eq, lt, and, ne, lte, or, inArray, gt } from "drizzle-orm";

const REMINDER_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAINTENANCE_WARNING_DAYS = 7; // Notify 7 days before maintenance due
const SLA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const OVERDUE_REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours - max 1 overdue reminder per task per day
const CAPA_REMINDER_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours for CAPA reminders

let reminderInterval: NodeJS.Timeout | null = null;
let slaInterval: NodeJS.Timeout | null = null;

const sentCapaNotifications = new Map<number, number>();

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
  } catch (error) {
    console.error("Hatırlatma kontrolü hatası:", error);
  }
}

async function checkChecklistReminders() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentChecklistNotifs = await db.select({
      link: notifications.link,
      userId: notifications.userId,
    }).from(notifications)
      .where(and(
        eq(notifications.type, 'checklist_overdue'),
        gt(notifications.createdAt, oneDayAgo)
      ));
    const recentChecklistKeys = new Set(
      recentChecklistNotifs.map(n => `${n.userId}:${n.link}`)
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
          if (recentChecklistKeys.has(dedupKey)) continue;

          try {
            await storage.createNotification({
              userId: shift.assignedToId,
              type: 'checklist_overdue',
              title: 'Checklist Hatirlatmasi',
              message: 'Vardiya checklist\'ini tamamlamayi unutmadiniz mi?',
              link: checklistLink,
              isRead: false,
              branchId: shift.branchId,
            });
            recentChecklistKeys.add(dedupKey);
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

// Check for overdue tasks and notify both assignee and assigner
// Uses DB-based deduplication to prevent duplicate notifications even after server restarts
async function checkOverdueTaskNotifications() {
  try {
    const tasks = await storage.getTasks();
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - OVERDUE_REMINDER_INTERVAL);
    
    const overdueTasks = tasks.filter((task: Task) => {
      if (!task.dueDate) return false;
      if (task.status === 'onaylandi' || task.status === 'tamamlandi') return false;
      return new Date(task.dueDate) < now;
    });

    if (overdueTasks.length === 0) return;

    const recentOverdueNotifs = await db.select({
      link: notifications.link,
      userId: notifications.userId,
      type: notifications.type,
    }).from(notifications)
      .where(and(
        or(
          eq(notifications.type, 'task_overdue'),
          eq(notifications.type, 'task_overdue_assigner')
        ),
        gt(notifications.createdAt, cutoffTime)
      ));

    const recentKeys = new Set(
      recentOverdueNotifs.map(n => `${n.type}:${n.userId}:${n.link}`)
    );

    for (const task of overdueTasks) {
      const taskLink = `/gorevler?taskId=${task.id}`;
      const daysOverdue = Math.ceil((now.getTime() - new Date(task.dueDate!).getTime()) / (24 * 60 * 60 * 1000));

      if (task.assignedToId) {
        const key = `task_overdue:${task.assignedToId}:${taskLink}`;
        if (!recentKeys.has(key)) {
          try {
            await storage.createNotification({
              userId: task.assignedToId,
              type: 'task_overdue',
              title: 'Geciken Görev Hatırlatması',
              message: `"${task.description?.substring(0, 40)}${(task.description?.length || 0) > 40 ? '...' : ''}" görevi ${daysOverdue} gün gecikti!`,
              link: taskLink,
              branchId: task.branchId,
            });
            recentKeys.add(key);
          } catch (err) {
            console.error(`Assignee notification error for task ${task.id}:`, err);
          }
        }
      }

      if (task.assignedById && task.assignedById !== task.assignedToId) {
        const key = `task_overdue_assigner:${task.assignedById}:${taskLink}`;
        if (!recentKeys.has(key)) {
          try {
            const assignee = task.assignedToId ? await storage.getUser(task.assignedToId) : null;
            const assigneeName = assignee?.firstName && assignee?.lastName 
              ? `${assignee.firstName} ${assignee.lastName}` 
              : 'Çalışan';

            await storage.createNotification({
              userId: task.assignedById,
              type: 'task_overdue_assigner',
              title: 'Atadığınız Görev Gecikti',
              message: `${assigneeName}'a atadığınız "${task.description?.substring(0, 40)}${(task.description?.length || 0) > 40 ? '...' : ''}" görevi ${daysOverdue} gün gecikti!`,
              link: taskLink,
              branchId: task.branchId,
            });
            recentKeys.add(key);
          } catch (err) {
            console.error(`Assigner notification error for task ${task.id}:`, err);
          }
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

export function startReminderSystem() {
  if (reminderInterval) {
    console.log("Hatırlatma sistemi zaten çalışıyor");
    return;
  }

  console.log("Hatırlatma sistemi başlatıldı - Her 5 dakikada bir kontrol edilecek");
  
  checkAndSendReminders();
  
  reminderInterval = setInterval(checkAndSendReminders, REMINDER_INTERVAL);
}

export function stopReminderSystem() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log("Hatırlatma sistemi durduruldu");
  }
}

export function startSLACheckSystem() {
  if (slaInterval) {
    console.log("SLA kontrol sistemi zaten çalışıyor");
    return;
  }

  console.log("SLA kontrol sistemi başlatıldı - Her 15 dakikada bir kontrol edilecek");
  
  storage.checkSLABreaches();
  
  slaInterval = setInterval(() => storage.checkSLABreaches(), SLA_CHECK_INTERVAL);
}

export function stopSLACheckSystem() {
  if (slaInterval) {
    clearInterval(slaInterval);
    slaInterval = null;
    console.log("SLA kontrol sistemi durduruldu");
  }
}

// ========================================
// EXPIRED PHOTO CLEANUP SYSTEM
// ========================================

// Check for expired photos every 6 hours
const PHOTO_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
let photoCleanupInterval: NodeJS.Timeout | null = null;

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

export function startPhotoCleanupSystem() {
  console.log("Fotoğraf temizleme sistemi başlatıldı - Her 6 saatte bir kontrol edilecek");
  
  // Run initial cleanup
  cleanupExpiredPhotos();
  
  photoCleanupInterval = setInterval(cleanupExpiredPhotos, PHOTO_CLEANUP_INTERVAL);
}

export function stopPhotoCleanupSystem() {
  if (photoCleanupInterval) {
    clearInterval(photoCleanupInterval);
    photoCleanupInterval = null;
    console.log("Fotoğraf temizleme sistemi durduruldu");
  }
}

// ========================================
// EMPLOYEE OF MONTH AUTO CALCULATION
// ========================================

const MONTHLY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Once per day
let monthlyCalculationInterval: NodeJS.Timeout | null = null;
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
  console.log("Aylık Ayın Elemanı hesaplama sistemi başlatıldı - Her gün kontrol edilecek");
  
  // Run initial check
  setTimeout(checkMonthlyEmployeeOfMonth, 10000); // Delay 10s to let DB initialize
  
  monthlyCalculationInterval = setInterval(checkMonthlyEmployeeOfMonth, MONTHLY_CHECK_INTERVAL);
}

export function stopMonthlyCalculationSystem() {
  if (monthlyCalculationInterval) {
    clearInterval(monthlyCalculationInterval);
    monthlyCalculationInterval = null;
    console.log("Aylık hesaplama sistemi durduruldu");
  }
}

// ═══════════════════════════════════════════════════════════════
// CROSS-MODULE NOTIFICATIONS
// Stok→Satınalma, Arıza→Teknik otomatik uyarılar
// ═══════════════════════════════════════════════════════════════

const STOCK_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const sentStockAlerts = new Map<number, number>(); // productId -> lastNotifiedAt
const STOCK_ALERT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours between alerts for same product

let stockAlertInterval: NodeJS.Timeout | null = null;

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
  console.log("📦 Stok uyarı sistemi başlatıldı - Her saat kontrol edilecek");
  
  // Run initial check after delay
  setTimeout(checkLowStockNotifications, 30000);
  
  stockAlertInterval = setInterval(checkLowStockNotifications, STOCK_CHECK_INTERVAL);
}

export function stopStockAlertSystem() {
  if (stockAlertInterval) {
    clearInterval(stockAlertInterval);
    stockAlertInterval = null;
    console.log("Stok uyarı sistemi durduruldu");
  }
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING COMPLETION NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

const ONBOARDING_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
let onboardingCheckInterval: NodeJS.Timeout | null = null;

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

export function startOnboardingCompletionSystem() {
  console.log("📋 Onboarding tamamlama bildirim sistemi başlatıldı - Her 10 dakikada bir kontrol edilecek");
  
  // Run initial check after delay
  setTimeout(checkOnboardingCompletions, 20000);
  
  onboardingCheckInterval = setInterval(checkOnboardingCompletions, ONBOARDING_CHECK_INTERVAL);
}

export function stopOnboardingCompletionSystem() {
  if (onboardingCheckInterval) {
    clearInterval(onboardingCheckInterval);
    onboardingCheckInterval = null;
    console.log("Onboarding bildirim sistemi durduruldu");
  }
}
