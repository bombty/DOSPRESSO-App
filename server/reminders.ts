import { storage } from "./storage";
import type { Task, Equipment, User } from "@shared/schema";

const REMINDER_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAINTENANCE_WARNING_DAYS = 7; // Notify 7 days before maintenance due
const SLA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

let reminderInterval: NodeJS.Timeout | null = null;
let slaInterval: NodeJS.Timeout | null = null;

// Track sent maintenance notifications to avoid duplicates
// Map<equipmentId, nextMaintenanceDate> to handle maintenance date updates
const sentMaintenanceNotifications = new Map<number, string>();

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

    // Check equipment maintenance reminders
    await checkMaintenanceReminders();
  } catch (error) {
    console.error("Hatırlatma kontrolü hatası:", error);
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
