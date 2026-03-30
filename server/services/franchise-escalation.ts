/**
 * Franchise Eskalasyon Servisi
 * 5 kademeli SLA sistemi: Supervisor → Müdür → Coach/Trainer → CGO → CEO
 *
 * Tetikleyiciler:
 *  - agent_pending_actions: status=pending, SLA süresi aşıldı
 *  - tasks: status=beklemede|devam_ediyor, due_date geçti
 *  - branch_task_instances: status=pending, is_overdue=true
 *
 * Her eskalasyon adımında:
 *  - In-app bildirim → hedef role
 *  - Önceki sorumluya "yükseltildi" bildirimi
 *  - agentEscalationHistory'e kayıt
 *  - SLA ihlali audit logu
 */

import { db } from "../db";
import { storage } from "../storage";
import {
  agentPendingActions, agentEscalationHistory, tasks, branchTaskInstances,
  users, branches, escalationConfig, UserRole,
} from "@shared/schema";
import { eq, and, lt, lte, isNull, notInArray, or, inArray, sql } from "drizzle-orm";

// ─── Tipler ────────────────────────────────────────────────────────────────
interface EscalationLevel {
  level: number;
  name: string;
  targetRoleKey: string;
  slaDays: number;
  isActive: boolean;
}

interface EscalationTarget {
  userId: string | null;
  role: string | null;
  displayName: string;
}

// ─── Varsayılan seviyeler (DB yoksa fallback) ─────────────────────────────
const DEFAULT_LEVELS: EscalationLevel[] = [
  { level: 1, name: "Supervisor",       targetRoleKey: "supervisor",    slaDays: 2,  isActive: true },
  { level: 2, name: "Müdür",            targetRoleKey: "mudur",         slaDays: 3,  isActive: true },
  { level: 3, name: "Coach / Trainer",  targetRoleKey: "coach_trainer", slaDays: 7,  isActive: true },
  { level: 4, name: "CGO",              targetRoleKey: "cgo",           slaDays: 14, isActive: true },
  { level: 5, name: "CEO",              targetRoleKey: "ceo",           slaDays: 21, isActive: true },
];

// ─── Config yükle ─────────────────────────────────────────────────────────
async function loadEscalationLevels(): Promise<EscalationLevel[]> {
  try {
    const rows = await db.select().from(escalationConfig).orderBy(escalationConfig.level);
    if (rows.length >= 5) {
      return rows.map(r => ({
        level: r.level,
        name: r.name,
        targetRoleKey: r.targetRoleKey,
        slaDays: r.slaDays,
        isActive: r.isActive,
      }));
    }
  } catch {}
  return DEFAULT_LEVELS;
}

// ─── Hedef kullanıcıyı bul ───────────────────────────────────────────────
async function findTarget(roleKey: string, branchId: number | null): Promise<EscalationTarget> {
  try {
    let roleFilter: string[] = [];
    switch (roleKey) {
      case "supervisor":    roleFilter = [UserRole.SUPERVISOR, UserRole.SUPERVISOR_BUDDY]; break;
      case "mudur":         roleFilter = [UserRole.MUDUR]; break;
      case "coach_trainer": roleFilter = [UserRole.COACH, UserRole.TRAINER]; break;
      case "cgo":           roleFilter = [UserRole.CGO]; break;
      case "ceo":           roleFilter = [UserRole.CEO, UserRole.ADMIN]; break;
      default:              roleFilter = [roleKey as UserRole];
    }

    const whereClause = branchId && ["supervisor", "mudur"].includes(roleKey)
      ? and(inArray(users.role, roleFilter as UserRole[]), eq(users.branchId, branchId), eq(users.isActive, true))
      : and(inArray(users.role, roleFilter as UserRole[]), eq(users.isActive, true));

    const candidates = await db.select({ id: users.id, role: users.role, firstName: users.firstName, lastName: users.lastName })
      .from(users).where(whereClause).limit(5);

    if (candidates.length === 0) return { userId: null, role: roleFilter[0], displayName: roleFilter[0] };

    // Öncelik: Mudur > Supervisor, Coach > Trainer, CEO > Admin
    const preferred = candidates.find(u => u.role === UserRole.MUDUR)
      || candidates.find(u => u.role === UserRole.COACH)
      || candidates.find(u => u.role === UserRole.CEO)
      || candidates[0];

    return {
      userId: preferred.id,
      role: preferred.role,
      displayName: `${preferred.firstName || ""} ${preferred.lastName || ""}`.trim() || preferred.role,
    };
  } catch {
    return { userId: null, role: roleKey, displayName: roleKey };
  }
}

// ─── Bildirim gönder ─────────────────────────────────────────────────────
async function sendEscalationNotif(
  targetUserId: string | null,
  previousUserId: string | null,
  level: number,
  levelName: string,
  title: string,
  description: string,
  deepLink: string,
  branchId: number | null,
  daysOverdue: number,
) {
  const body = `${title} — ${daysOverdue} gündür çözüm bekliyor. Seviye ${level}: ${levelName}'ye iletildi.`;

  if (targetUserId) {
    await storage.createNotification({
      userId: targetUserId,
      type: "franchise_escalation",
      title: `🔴 Eskalasyon Seviye ${level}: ${levelName}`,
      message: body,
      link: deepLink || "/gorevler",
      isRead: false,
      branchId: branchId ?? null,
    }).catch(() => {});
  }

  if (previousUserId && previousUserId !== targetUserId) {
    await storage.createNotification({
      userId: previousUserId,
      type: "escalation_info",
      title: `⬆️ Yükseltildi: ${title}`,
      message: `Bu aksiyon çözüm beklerken Seviye ${level} (${levelName})'ye iletildi.`,
      link: deepLink || "/gorevler",
      isRead: false,
      branchId: branchId ?? null,
    }).catch(() => {});
  }
}

// ─── Ana eskalasyon motoru ─────────────────────────────────────────────────
async function runFranchiseEscalation(): Promise<{ processed: number; escalated: number }> {
  const levels = await loadEscalationLevels();
  const now = new Date();
  let processed = 0;
  let escalated = 0;

  // ─ 1. agent_pending_actions ─────────────────────────────────────
  const pendingActions = await db.select().from(agentPendingActions)
    .where(and(
      notInArray(agentPendingActions.status, ["approved", "rejected", "expired"]),
      lte(agentPendingActions.createdAt, new Date(now.getTime() - 2 * 864e5)), // en az 2 günlük
    )).limit(100);

  for (const action of pendingActions) {
    processed++;
    const ageMs = now.getTime() - new Date(action.createdAt!).getTime();
    const ageDays = ageMs / 864e5;

    // Mevcut eskalasyon seviyesi
    const history = await db.select({ level: agentEscalationHistory.escalationLevel })
      .from(agentEscalationHistory)
      .where(and(
        eq(agentEscalationHistory.sourceActionId, action.id),
        isNull(agentEscalationHistory.resolvedAt),
      ))
      .orderBy(agentEscalationHistory.escalationLevel).limit(1);

    const currentLevel = history.length > 0 ? history[history.length - 1].level : 0;

    // Kümülatif SLA hesapla (level N = sum of sla_days for levels 1..N)
    let cumulativeDays = 0;
    for (const lvl of levels) {
      if (!lvl.isActive) continue;
      cumulativeDays += lvl.slaDays;
      if (ageDays >= cumulativeDays && currentLevel < lvl.level) {
        // Eskalasyon gerekiyor
        const target = await findTarget(lvl.targetRoleKey, action.branchId as number | null);
        const previousTarget = currentLevel > 0
          ? await findTarget(levels[currentLevel - 1].targetRoleKey, action.branchId as number | null)
          : { userId: action.targetUserId ?? null, displayName: "Önceki sorumlu" };

        // History kaydı
        await db.insert(agentEscalationHistory).values({
          sourceActionId: action.id,
          escalationLevel: lvl.level,
          escalatedToUserId: target.userId,
          escalatedToRole: target.role,
          resolvedAt: null,
          resolution: null,
        }).catch(() => {});

        // Action'ı güncelle
        await db.update(agentPendingActions).set({
          status: "escalated",
          escalationRole: target.role,
        }).where(eq(agentPendingActions.id, action.id)).catch(() => {});

        // Bildirim
        await sendEscalationNotif(
          target.userId, previousTarget.userId,
          lvl.level, lvl.name,
          action.title, action.description || "",
          action.deepLink || "/gorevler",
          action.branchId as number | null,
          Math.round(ageDays),
        );

        escalated++;
        break; // Bu action için bir kez eskalasyon
      }
    }
  }

  // ─ 2. Gecikmiş görevler (tasks tablosu) ─────────────────────────
  const overdueTasks = await db.select({
    id: tasks.id, title: tasks.description, branchId: tasks.branchId,
    assignedToId: tasks.assignedToId, dueDate: tasks.dueDate, createdAt: tasks.createdAt,
  }).from(tasks).where(and(
    inArray(tasks.status, ["beklemede", "devam_ediyor"]),
    lt(tasks.dueDate, now),
  )).limit(50);

  for (const task of overdueTasks) {
    processed++;
    const ageMs = now.getTime() - new Date(task.dueDate!).getTime();
    const ageDays = ageMs / 864e5;

    // Her 7 günde bir bir üst seviyeye eskalasyon (tasks için basit kural)
    const escalationLevel = Math.min(5, Math.floor(ageDays / 7) + 1);
    if (escalationLevel < 2) continue; // İlk 7 gün normal

    const lvl = levels.find(l => l.level === escalationLevel);
    if (!lvl || !lvl.isActive) continue;

    const target = await findTarget(lvl.targetRoleKey, task.branchId);
    if (!target.userId) continue;

    await sendEscalationNotif(
      target.userId, task.assignedToId ?? null,
      lvl.level, lvl.name,
      `Gecikmiş Görev: ${(task.title || "").slice(0, 60)}`,
      `${Math.round(ageDays)} gün gecikmiş`,
      "/gorevler",
      task.branchId,
      Math.round(ageDays),
    );
    escalated++;
  }

  console.log(`[FranchiseEscalation] processed=${processed} escalated=${escalated}`);
  return { processed, escalated };
}

// ─── Tablo oluşturma (startup) ─────────────────────────────────────────────
export async function migrateEscalationTables(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS escalation_config (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        target_role_key VARCHAR(50) NOT NULL,
        sla_days INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        notify_email BOOLEAN DEFAULT true,
        notify_in_app BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT idx_escalation_config_level UNIQUE (level)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS role_permission_overrides (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        module_key VARCHAR(100) NOT NULL,
        can_view BOOLEAN DEFAULT true,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        can_approve BOOLEAN DEFAULT false,
        is_enabled BOOLEAN DEFAULT true,
        updated_by_user_id VARCHAR,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT idx_role_perm_overrides_unique UNIQUE (role, module_key)
      )
    `);
    await db.execute(sql`
      INSERT INTO escalation_config (level, name, target_role_key, sla_days, description)
      VALUES
        (1,'Supervisor','supervisor',2,'Şube supervisor — sorun oluşunca ilk 2 gün'),
        (2,'Müdür','mudur',3,'Şube müdürü — supervisor 2 gün içinde yanıt vermezse'),
        (3,'Coach / Trainer','coach_trainer',7,'HQ Coach ve Trainer — müdür 3 gün içinde çözmezse'),
        (4,'CGO','cgo',14,'CGO — Coach/Trainer 7 gün içinde müdahale etmezse'),
        (5,'CEO','ceo',21,'CEO — CGO 14 gün içinde çözmezse')
      ON CONFLICT (level) DO NOTHING
    `);
    console.log("[FranchiseEscalation] Tables ready");
  } catch (e: any) {
    console.error("[FranchiseEscalation] Migration error:", e.message);
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────
export function startFranchiseEscalationScheduler(): void {
  // Startup'ta bir kez çalıştır
  setTimeout(() => {
    runFranchiseEscalation().catch(e => console.error("[FranchiseEscalation] Startup run error:", e));
  }, 15000); // 15sn sonra (DB bağlantısı hazır olsun)

  // Her 6 saatte bir kontrol
  setInterval(() => {
    runFranchiseEscalation().catch(e => console.error("[FranchiseEscalation] Scheduled run error:", e));
  }, 6 * 60 * 60 * 1000);

  console.log("[FranchiseEscalation] Scheduler started (every 6 hours)");
}

export { runFranchiseEscalation, loadEscalationLevels, findTarget };
