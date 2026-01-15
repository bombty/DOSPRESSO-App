import { storage } from "./storage";
import type { Task, Equipment, User } from "@shared/schema";
import { sendNotificationEmail } from "./email";

const REMINDER_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAINTENANCE_WARNING_DAYS = 7; // Notify 7 days before maintenance due
const SLA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const OVERDUE_REMINDER_INTERVAL = 60 * 60 * 1000; // 1 hour for overdue reminders

let reminderInterval: NodeJS.Timeout | null = null;
let slaInterval: NodeJS.Timeout | null = null;

// Track sent maintenance notifications to avoid duplicates
// Map<equipmentId, nextMaintenanceDate> to handle maintenance date updates
const sentMaintenanceNotifications = new Map<number, string>();

// Track overdue task notifications to avoid spamming (taskId -> lastNotifiedAt timestamp)
const sentOverdueNotifications = new Map<number, number>();

const sentChecklistReminders = new Map<number, number>();

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

      if (
        existingReminder.isActive &&
        existingReminder.nextReminderAt &&
        now >= existingReminder.nextReminderAt
      ) {
        const newCount = (existingReminder.reminderCount || 0) + 1;
        await storage.updateReminder(existingReminder.id, {
          reminderCount: newCount,
          lastReminderAt: now,
          nextReminderAt: new Date(Date.now() + REMINDER_INTERVAL),
        });

        console.log(`Hatırlatma gönderildi: Görev ${task.id}, Kullanıcı ${task.assignedToId}, Sayı: ${newCount}`);
      }
    }

    // Check checklist reminders - daily overdue checklists
    await checkChecklistReminders();

    // Check overdue tasks and send notifications to both assignee and assigner
    await checkOverdueTaskNotifications();

    // Check equipment maintenance reminders
    await checkMaintenanceReminders();
  } catch (error) {
    console.error("Hatırlatma kontrolü hatası:", error);
  }
}

async function checkChecklistReminders() {
  try {
    const now = new Date();
    // Get incomplete shifts with their checklists
    try {
      // Simple approach: check a small sample of recent shifts
      const shifts = await storage.getShifts?.() || [];
      
      for (const shift of shifts) {
        // Skip if already assigned or completed
        if (!shift.assignedToId) continue;
        
        const shiftChecklists = await storage.getShiftChecklists(shift.id);
        const incompleteChecklists = shiftChecklists.filter((sc: any) => !sc.isCompleted);
        
        for (const checklist of incompleteChecklists) {
          const checklistKey = checklist.id;
          const lastNotified = sentChecklistReminders.get(checklistKey);
          
          // Only send once per day
          if (lastNotified && (now.getTime() - lastNotified) < 24 * 60 * 60 * 1000) {
            continue;
          }

          try {
            await storage.createNotification({
              userId: shift.assignedToId,
              type: 'checklist_overdue',
              title: '📋 Checklist Hatırlatması',
              message: 'Vardiya checklist\'ini tamamlamayı unutmadınız mı?',
              link: `/vardiya/${shift.id}/checklists`,
              isRead: false,
            });
            sentChecklistReminders.set(checklistKey, now.getTime());
          } catch (err) {
            // Skip this checklist if notification fails
          }
        }
      }
    } catch (err) {
      // Silently skip if method doesn't exist
    }
  } catch (error) {
    console.error("Checklist hatırlatma hatası:", error);
  }
}

// Check for overdue tasks and notify both assignee and assigner
async function checkOverdueTaskNotifications() {
  try {
    const tasks = await storage.getTasks();
    const now = new Date();
    
    // Find overdue tasks
    const overdueTasks = tasks.filter((task: Task) => {
      if (!task.dueDate) return false;
      if (task.status === 'onaylandi' || task.status === 'tamamlandi') return false;
      return new Date(task.dueDate) < now;
    });

    for (const task of overdueTasks) {
      const taskKey = task.id;
      const lastNotified = sentOverdueNotifications.get(taskKey);
      
      // First check in-memory cache
      if (lastNotified && (now.getTime() - lastNotified) < OVERDUE_REMINDER_INTERVAL) {
        continue;
      }
      
      // Database-backed deduplication: check if notification was already sent recently
      // This handles server restarts where in-memory cache is cleared
      if (task.assignedToId) {
        try {
          const recentNotifications = await storage.getNotifications(task.assignedToId);
          const recentOverdue = recentNotifications.find((n: any) => 
            n.type === 'task_overdue' && 
            n.link?.includes(`taskId=${task.id}`) &&
            n.createdAt && (now.getTime() - new Date(n.createdAt).getTime()) < OVERDUE_REMINDER_INTERVAL
          );
          if (recentOverdue) {
            // Update in-memory cache from DB to prevent future DB queries
            sentOverdueNotifications.set(taskKey, new Date(recentOverdue.createdAt).getTime());
            continue;
          }
        } catch (dbError) {
          // If DB check fails, rely on in-memory cache only
        }
      }

      const daysOverdue = Math.ceil((now.getTime() - new Date(task.dueDate!).getTime()) / (24 * 60 * 60 * 1000));

      // Notify assignee
      if (task.assignedToId) {
        try {
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_overdue',
            title: 'Geciken Görev Hatırlatması',
            message: `"${task.description?.substring(0, 40)}${(task.description?.length || 0) > 40 ? '...' : ''}" görevi ${daysOverdue} gün gecikti!`,
            link: `/gorevler?taskId=${task.id}`,
          });
        } catch (err) {
          console.error(`Assignee notification error for task ${task.id}:`, err);
        }
      }

      // Notify assigner (if different from assignee)
      if (task.assignedById && task.assignedById !== task.assignedToId) {
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
            link: `/gorevler?taskId=${task.id}`,
          });
        } catch (err) {
          console.error(`Assigner notification error for task ${task.id}:`, err);
        }
      }

      // Mark as notified
      sentOverdueNotifications.set(taskKey, now.getTime());
      console.log(`Gecikmiş görev bildirimi gönderildi: Görev ${task.id}, ${daysOverdue} gün gecikmiş`);
    }

    // Cleanup old tracking (tasks older than 30 days)
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    for (const [taskId, timestamp] of sentOverdueNotifications.entries()) {
      if (timestamp < thirtyDaysAgo) {
        sentOverdueNotifications.delete(taskId);
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

    for (const eq of allEquipment) {
      if (!eq.nextMaintenanceDate || !eq.isActive) continue;

      const maintenanceDate = new Date(eq.nextMaintenanceDate);
      
      // Check if maintenance date changed (new cycle) or not yet notified
      const lastNotifiedDate = sentMaintenanceNotifications.get(eq.id);
      const maintenanceDateStr = eq.nextMaintenanceDate;
      const shouldNotify = maintenanceDate <= warningDate && lastNotifiedDate !== maintenanceDateStr;
      
      if (shouldNotify) {
        // Determine who to notify based on maintenanceResponsible
        let notifyUserId: string | null = null;
        
        if (eq.maintenanceResponsible === 'hq') {
          // Notify HQ TEKNIK role users
          const allUsers = await storage.getAllEmployees();
          const hqTeknikUser = allUsers.find((u: User) => u.role === 'teknik');
          notifyUserId = hqTeknikUser?.id || null;
        } else {
          // Notify branch supervisor
          const allUsers = await storage.getAllEmployees(eq.branchId);
          const branchSupervisor = allUsers.find((u: User) => u.role === 'supervisor');
          notifyUserId = branchSupervisor?.id || null;
        }

        if (!notifyUserId) continue; // Skip if no responsible user found

        // Database-backed deduplication: check if notification was already sent recently
        // This handles server restarts where in-memory cache is cleared
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        try {
          const recentNotifications = await storage.getNotifications(notifyUserId);
          const recentMaintenance = recentNotifications.find((n: any) => 
            n.type === 'maintenance_reminder' && 
            n.link === `/ekipman/${eq.id}` &&
            n.createdAt && (now.getTime() - new Date(n.createdAt).getTime()) < ONE_DAY_MS
          );
          if (recentMaintenance) {
            // Update in-memory cache from DB to prevent future DB queries
            sentMaintenanceNotifications.set(eq.id, maintenanceDateStr);
            continue;
          }
        } catch (dbError) {
          // If DB check fails, rely on in-memory cache only
        }

        // Calculate days until maintenance
        const isOverdue = maintenanceDate < now;
        const daysUntil = Math.ceil(Math.abs(maintenanceDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await storage.createNotification({
          userId: notifyUserId,
          type: "maintenance_reminder",
          title: isOverdue ? "Bakım Gecikmiş!" : "Bakım Yaklaşıyor",
          message: isOverdue 
            ? `${eq.equipmentType} ekipmanının bakımı ${daysUntil} gün gecikmiş. Lütfen en kısa sürede bakım yapın.`
            : `${eq.equipmentType} ekipmanının bakımı ${daysUntil} gün içinde yapılmalı.`,
          link: `/ekipman/${eq.id}`,
          isRead: false,
        });

        // Store this maintenance date to prevent duplicate notifications
        sentMaintenanceNotifications.set(eq.id, maintenanceDateStr);
        console.log(`Bakım hatırlatması gönderildi: Ekipman ${eq.id}, ${eq.maintenanceResponsible} sorumlu, ${daysUntil} gün`);
      }

      // Cleanup old tracking for past maintenance dates (30+ days old)
      if (maintenanceDate.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000 && lastNotifiedDate) {
        sentMaintenanceNotifications.delete(eq.id);
      }
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
