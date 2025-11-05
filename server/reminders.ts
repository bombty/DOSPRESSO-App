import { storage } from "./storage";
import type { Task } from "@shared/schema";

const REMINDER_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

let reminderInterval: NodeJS.Timeout | null = null;

export async function checkAndSendReminders() {
  try {
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
  } catch (error) {
    console.error("Hatırlatma kontrolü hatası:", error);
  }
}

export function startReminderSystem() {
  if (reminderInterval) {
    console.log("Hatırlatma sistemi zaten çalışıyor");
    return;
  }

  console.log("Hatırlatma sistemi başlatıldı - Her 10 dakikada bir kontrol edilecek");
  
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
