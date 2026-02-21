import { db } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  tasks,
  taskTriggers,
  users,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  type UserRoleType,
} from "@shared/schema";

function getScopeForRole(role: UserRoleType): string {
  if (isBranchRole(role)) return "branch";
  if (isFactoryFloorRole(role)) return "factory";
  if (isHQRole(role)) return "hq";
  return "branch";
}

function getOccurrenceKey(frequency: string, now: Date): string {
  const dateStr = now.toISOString().split("T")[0];
  switch (frequency) {
    case "daily":
      return `daily:${dateStr}`;
    case "weekly": {
      const yearNum = now.getFullYear();
      const jan1 = new Date(yearNum, 0, 1);
      const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
      const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `weekly:${yearNum}-W${String(weekNum).padStart(2, "0")}`;
    }
    case "monthly": {
      const month = String(now.getMonth() + 1).padStart(2, "0");
      return `monthly:${now.getFullYear()}-${month}`;
    }
    case "on_login": {
      const hour = String(now.getHours()).padStart(2, "0");
      return `on_login:${dateStr}T${hour}`;
    }
    case "on_event":
      return `event:${dateStr}-${Date.now()}`;
    default:
      return `daily:${dateStr}`;
  }
}

function getDueDate(now: Date, offsetMinutes: number): Date {
  return new Date(now.getTime() + offsetMinutes * 60 * 1000);
}

export async function generateTasksForUser(userId: string): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  try {
    const [user] = await db
      .select({ id: users.id, role: users.role, branchId: users.branchId, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive || !user.role) {
      return { created: 0, skipped: 0 };
    }

    const userRole = user.role as UserRoleType;
    const userScope = getScopeForRole(userRole);

    const activeTriggers = await db
      .select()
      .from(taskTriggers)
      .where(and(
        eq(taskTriggers.isActive, true),
        eq(taskTriggers.roleCode, user.role),
        eq(taskTriggers.scope, userScope)
      ));

    if (activeTriggers.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

    for (const trigger of activeTriggers) {
      const occurrenceKey = getOccurrenceKey(trigger.frequency, nowTR);
      const template = JSON.parse(trigger.template);
      const dueDate = getDueDate(nowTR, trigger.dueOffsetMinutes ?? 480);

      try {
        await db.execute(sql`
          INSERT INTO tasks (
            assigned_to_id, description, status, priority, 
            requires_photo, branch_id, due_date,
            trigger_id, occurrence_key, auto_generated, evidence_type,
            is_delivered, created_at, updated_at
          ) VALUES (
            ${user.id},
            ${template.description || trigger.name},
            'beklemede',
            'orta',
            ${trigger.requiredEvidenceType === 'photo'},
            ${user.branchId},
            ${dueDate},
            ${trigger.id},
            ${occurrenceKey},
            true,
            ${trigger.requiredEvidenceType},
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT (assigned_to_id, trigger_id, occurrence_key) 
          WHERE trigger_id IS NOT NULL AND occurrence_key IS NOT NULL
          DO NOTHING
        `);
        created++;
      } catch (err: any) {
        if (err.code === "23505") {
          skipped++;
        } else {
          console.error(`[TaskTrigger] Error creating task for user ${userId}, trigger ${trigger.id}:`, err.message);
          skipped++;
        }
      }
    }
  } catch (err) {
    console.error("[TaskTrigger] Error in generateTasksForUser:", err);
  }

  return { created, skipped };
}

export async function generateTasksForAllActiveUsers(): Promise<{ totalCreated: number; totalSkipped: number; usersProcessed: number }> {
  let totalCreated = 0;
  let totalSkipped = 0;
  let usersProcessed = 0;

  try {
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        isNull(users.deletedAt)
      ));

    console.log(`[TaskTrigger] Generating tasks for ${activeUsers.length} active users...`);

    for (const user of activeUsers) {
      const result = await generateTasksForUser(user.id);
      totalCreated += result.created;
      totalSkipped += result.skipped;
      usersProcessed++;
    }

    console.log(`[TaskTrigger] Done: ${usersProcessed} users, ${totalCreated} created, ${totalSkipped} skipped`);
  } catch (err) {
    console.error("[TaskTrigger] Error in generateTasksForAllActiveUsers:", err);
  }

  return { totalCreated, totalSkipped, usersProcessed };
}
