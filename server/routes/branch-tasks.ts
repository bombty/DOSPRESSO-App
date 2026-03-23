import { Router } from "express";
import { db } from "../db";
import { sql, eq, and, desc, asc, inArray } from "drizzle-orm";
import { isAuthenticated, isKioskAuthenticated } from "../localAuth";
import { requireModuleEnabled } from "../services/module-flag-service";
import { calculateBranchTaskScore } from "../services/branch-health-scoring";
import { branchRecurringTasks, branchTaskInstances, branchTaskCategories, branchRecurringTaskOverrides, isHQRole, users, notifications, branches } from "@shared/schema";

const router = Router();

const TEMPLATE_ROLES = ["admin", "ceo", "cgo", "coach", "trainer", "mudur", "supervisor"];

function isBranchRole(role: string): boolean {
  return !isHQRole(role as any);
}

function canAccessBranch(user: any, branchId: number): boolean {
  if (!isBranchRole(user.role)) return true;
  return user.branchId === branchId;
}

const moduleGuard = requireModuleEnabled("sube_gorevleri");

router.get("/api/branch-tasks/categories", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const cats = await db
      .select()
      .from(branchTaskCategories)
      .where(eq(branchTaskCategories.isActive, true))
      .orderBy(asc(branchTaskCategories.sortOrder));
    res.json(cats);
  } catch (error: unknown) {
    res.status(500).json({ message: "Kategoriler yüklenemedi" });
  }
});

router.get("/api/branch-tasks/templates", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const branchId = req.query.branchId ? Number(req.query.branchId) : null;

    let result;
    if (isBranchRole(user.role)) {
      if (!user.branchId) return res.status(403).json({ message: "Şube ataması yapılmamış" });
      result = await db.execute(sql`
        SELECT * FROM branch_recurring_tasks
        WHERE (branch_id = ${user.branchId} OR branch_id IS NULL)
          AND is_active = true AND deleted_at IS NULL
        ORDER BY created_at DESC
      `);
    } else {
      if (branchId) {
        result = await db.execute(sql`
          SELECT * FROM branch_recurring_tasks
          WHERE (branch_id = ${branchId} OR branch_id IS NULL)
            AND is_active = true AND deleted_at IS NULL
          ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT * FROM branch_recurring_tasks
          WHERE is_active = true AND deleted_at IS NULL
          ORDER BY created_at DESC
        `);
      }
    }

    res.json(result.rows || []);
  } catch (error: unknown) {
    res.status(500).json({ message: "Şablonlar yüklenemedi" });
  }
});

router.get("/api/branch-tasks/templates/:id", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const result = await db.execute(sql`
      SELECT * FROM branch_recurring_tasks WHERE id = ${id} AND deleted_at IS NULL
    `);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }

    const template = result.rows[0] as any;
    if (template.branch_id && isBranchRole(user.role) && !canAccessBranch(user, template.branch_id)) {
      return res.status(403).json({ message: "Bu şablona erişim yetkiniz yok" });
    }

    res.json(template);
  } catch (error: unknown) {
    res.status(500).json({ message: "Şablon yüklenemedi" });
  }
});

router.post("/api/branch-tasks/templates", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    if (!TEMPLATE_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { title, description, category, branchId, recurrenceType, dayOfWeek, dayOfMonth, specificDate, assignedToUserId, photoRequired } = req.body;

    if (!title || !recurrenceType) {
      return res.status(400).json({ message: "Başlık ve tekrar tipi zorunludur" });
    }

    const validRecurrenceTypes = ["daily", "weekly", "monthly", "once"];
    if (!validRecurrenceTypes.includes(recurrenceType)) {
      return res.status(400).json({ message: "Geçersiz tekrar tipi" });
    }

    let targetBranchId = branchId ?? null;
    if (isBranchRole(user.role)) {
      if (!user.branchId) return res.status(403).json({ message: "Şube ataması yapılmamış" });
      targetBranchId = user.branchId;
    }

    const result = await db.execute(sql`
      INSERT INTO branch_recurring_tasks (title, description, category, branch_id, recurrence_type, day_of_week, day_of_month, specific_date, assigned_to_user_id, created_by_user_id, created_by_role, photo_required)
      VALUES (${title}, ${description || null}, ${category || "genel"}, ${targetBranchId}, ${recurrenceType}, ${dayOfWeek ?? null}, ${dayOfMonth ?? null}, ${specificDate || null}, ${assignedToUserId || null}, ${user.id}, ${user.role}, ${photoRequired || false})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Şablon oluşturulamadı" });
  }
});

router.patch("/api/branch-tasks/templates/:id", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    if (!TEMPLATE_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const id = Number(req.params.id);
    const existing = await db.execute(sql`
      SELECT * FROM branch_recurring_tasks WHERE id = ${id} AND deleted_at IS NULL
    `);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }

    const template = existing.rows[0] as any;
    if (!template.branch_id && isBranchRole(user.role)) {
      return res.status(403).json({ message: "HQ şablonlarını düzenleme yetkiniz yok" });
    }
    if (template.branch_id && isBranchRole(user.role) && !canAccessBranch(user, template.branch_id)) {
      return res.status(403).json({ message: "Bu şablonu düzenleme yetkiniz yok" });
    }

    const { title, description, category, recurrenceType, dayOfWeek, dayOfMonth, specificDate, assignedToUserId, photoRequired, isActive } = req.body;

    if (recurrenceType) {
      const validRecurrenceTypes = ["daily", "weekly", "monthly", "once"];
      if (!validRecurrenceTypes.includes(recurrenceType)) {
        return res.status(400).json({ message: "Geçersiz tekrar tipi" });
      }
    }

    const result = await db.execute(sql`
      UPDATE branch_recurring_tasks SET
        title = COALESCE(${title ?? null}, title),
        description = COALESCE(${description ?? null}, description),
        category = COALESCE(${category ?? null}, category),
        recurrence_type = COALESCE(${recurrenceType ?? null}, recurrence_type),
        day_of_week = ${dayOfWeek !== undefined ? dayOfWeek : template.day_of_week},
        day_of_month = ${dayOfMonth !== undefined ? dayOfMonth : template.day_of_month},
        specific_date = ${specificDate !== undefined ? specificDate : template.specific_date},
        assigned_to_user_id = ${assignedToUserId !== undefined ? assignedToUserId : template.assigned_to_user_id},
        photo_required = ${photoRequired !== undefined ? photoRequired : template.photo_required},
        is_active = ${isActive !== undefined ? isActive : template.is_active},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Şablon güncellenemedi" });
  }
});

router.delete("/api/branch-tasks/templates/:id", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    if (!TEMPLATE_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const id = Number(req.params.id);
    const existing = await db.execute(sql`
      SELECT * FROM branch_recurring_tasks WHERE id = ${id} AND deleted_at IS NULL
    `);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }

    const template = existing.rows[0] as any;
    if (!template.branch_id && isBranchRole(user.role)) {
      return res.status(403).json({ message: "HQ şablonlarını silme yetkiniz yok" });
    }
    if (template.branch_id && isBranchRole(user.role) && !canAccessBranch(user, template.branch_id)) {
      return res.status(403).json({ message: "Bu şablonu silme yetkiniz yok" });
    }

    await db.execute(sql`
      UPDATE branch_recurring_tasks SET is_active = false, deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ message: "Şablon silinemedi" });
  }
});

router.get("/api/branch-tasks/instances", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const dateParam = (req.query.date as string) || null;
    const statusParam = req.query.status as string || null;
    const categoryParam = req.query.category as string || null;

    let branchScope: number | null = null;
    if (isBranchRole(user.role)) {
      if (!user.branchId) return res.status(403).json({ message: "Şube ataması yapılmamış" });
      branchScope = user.branchId;
    } else {
      branchScope = req.query.branchId ? Number(req.query.branchId) : null;
    }

    let query = sql`
      SELECT i.*, r.title, r.description, r.category, r.photo_required, r.recurrence_type,
             b.name as branch_name,
             cu.first_name as claimed_first, cu.last_name as claimed_last,
             au.first_name as assigned_first, au.last_name as assigned_last,
             cou.first_name as completed_first, cou.last_name as completed_last
      FROM branch_task_instances i
      JOIN branch_recurring_tasks r ON i.recurring_task_id = r.id
      LEFT JOIN branches b ON i.branch_id = b.id
      LEFT JOIN users cu ON i.claimed_by_user_id = cu.id
      LEFT JOIN users au ON i.assigned_to_user_id = au.id
      LEFT JOIN users cou ON i.completed_by_user_id = cou.id
      WHERE r.deleted_at IS NULL
    `;

    if (branchScope) {
      query = sql`${query} AND i.branch_id = ${branchScope}`;
    }

    if (dateParam) {
      query = sql`${query} AND i.due_date = ${dateParam}`;
    }

    if (statusParam) {
      query = sql`${query} AND i.status = ${statusParam}`;
    }

    if (categoryParam) {
      query = sql`${query} AND r.category = ${categoryParam}`;
    }

    query = sql`${query} ORDER BY i.is_overdue DESC, i.due_date ASC, r.title ASC`;

    const result = await db.execute(query);
    res.json(result.rows || []);
  } catch (error: unknown) {
    res.status(500).json({ message: "Görevler yüklenemedi" });
  }
});

router.get("/api/branch-tasks/instances/:id", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const result = await db.execute(sql`
      SELECT i.*, r.title, r.description, r.category, r.photo_required, r.recurrence_type
      FROM branch_task_instances i
      JOIN branch_recurring_tasks r ON i.recurring_task_id = r.id
      WHERE i.id = ${id}
    `);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const instance = result.rows[0] as any;
    if (!canAccessBranch(user, instance.branch_id)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    res.json(instance);
  } catch (error: unknown) {
    res.status(500).json({ message: "Görev yüklenemedi" });
  }
});

router.post("/api/branch-tasks/instances/:id/claim", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const instance = await db.execute(sql`
      SELECT bti.*, brt.title as task_title
      FROM branch_task_instances bti
      LEFT JOIN branch_recurring_tasks brt ON bti.recurring_task_id = brt.id
      WHERE bti.id = ${id}
    `);

    if (!instance.rows || instance.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const task = instance.rows[0] as any;

    if (!canAccessBranch(user, task.branch_id)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    if (task.status !== "pending" && task.status !== "claimed") {
      return res.status(400).json({ message: "Bu görev sahiplenilemez" });
    }

    if (task.assigned_to_user_id && task.assigned_to_user_id !== user.id) {
      return res.status(403).json({ message: "Bu görev başka birine atanmış" });
    }

    if (task.claimed_by_user_id && task.claimed_by_user_id !== user.id) {
      return res.status(400).json({ message: "Bu görev zaten başka biri tarafından sahiplenildi" });
    }

    const result = await db.execute(sql`
      UPDATE branch_task_instances SET
        claimed_by_user_id = ${user.id},
        claimed_at = NOW(),
        status = 'claimed',
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    try {
      const claimerName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username;
      const taskTitle = task.task_title || 'Görev';
      const branchId = task.branch_id;

      const subeYoneticileri = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          inArray(users.role, ['supervisor', 'mudur'])
        ));

      const [branchInfo] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
      const branchName = branchInfo?.name || 'Şube';

      for (const y of subeYoneticileri) {
        if (y.id !== user.id) {
          await db.insert(notifications).values({
            userId: y.id,
            type: 'branch_task_claimed',
            title: 'Görev sahiplenildi',
            message: `${claimerName} "${taskTitle}" görevini üstlendi`,
            link: `/sube-gorevler/${id}`,
            isRead: false,
          });
        }
      }

      const coaches = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'coach'), eq(users.isActive, true)));
      for (const c of coaches) {
        await db.insert(notifications).values({
          userId: c.id,
          type: 'branch_task_claimed',
          title: `${branchName}: Görev sahiplenildi`,
          message: `${claimerName} "${taskTitle}" görevini üstlendi`,
          link: `/sube-gorevler/${id}`,
          isRead: false,
        });
      }
    } catch (notifErr) {
      console.error("Branch task claim notification error:", notifErr);
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Görev sahiplenilemedi" });
  }
});

router.post("/api/branch-tasks/instances/:id/complete", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const instance = await db.execute(sql`
      SELECT bti.*, brt.title as task_title
      FROM branch_task_instances bti
      LEFT JOIN branch_recurring_tasks brt ON bti.recurring_task_id = brt.id
      WHERE bti.id = ${id}
    `);

    if (!instance.rows || instance.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const task = instance.rows[0] as any;

    if (!canAccessBranch(user, task.branch_id)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    if (task.status === "completed") {
      return res.status(400).json({ message: "Bu görev zaten tamamlanmış" });
    }

    const canComplete = task.claimed_by_user_id === user.id ||
      task.assigned_to_user_id === user.id ||
      (!task.claimed_by_user_id && !task.assigned_to_user_id) ||
      !isBranchRole(user.role);

    if (!canComplete) {
      return res.status(403).json({ message: "Bu görevi tamamlama yetkiniz yok" });
    }

    const { completionNote, photoUrl } = req.body || {};

    const result = await db.execute(sql`
      UPDATE branch_task_instances SET
        completed_by_user_id = ${user.id},
        completed_at = NOW(),
        completion_note = ${completionNote || null},
        photo_url = ${photoUrl || null},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    try {
      const completerName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username;
      const taskTitle = task.task_title || 'Görev';
      const branchId = task.branch_id;

      const [branchInfo] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
      const branchName = branchInfo?.name || 'Şube';

      const subeYoneticileri = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          inArray(users.role, ['supervisor', 'mudur'])
        ));

      for (const y of subeYoneticileri) {
        if (y.id !== user.id) {
          await db.insert(notifications).values({
            userId: y.id,
            type: 'branch_task_completed',
            title: 'Görev tamamlandı',
            message: `${completerName} "${taskTitle}" görevini tamamladı`,
            link: `/sube-gorevler/${id}`,
            isRead: false,
          });
        }
      }

      const coaches = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'coach'), eq(users.isActive, true)));
      for (const c of coaches) {
        await db.insert(notifications).values({
          userId: c.id,
          type: 'branch_task_completed',
          title: `${branchName}: Görev tamamlandı`,
          message: `${completerName} "${taskTitle}" görevini tamamladı`,
          link: `/sube-gorevler/${id}`,
          isRead: false,
        });
      }
    } catch (notifErr) {
      console.error("Branch task complete notification error:", notifErr);
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Görev tamamlanamadı" });
  }
});

router.post("/api/branch-tasks/instances/:id/unclaim", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const instance = await db.execute(sql`
      SELECT * FROM branch_task_instances WHERE id = ${id}
    `);

    if (!instance.rows || instance.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const task = instance.rows[0] as any;

    if (!canAccessBranch(user, task.branch_id)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    if (task.claimed_by_user_id !== user.id && isBranchRole(user.role)) {
      return res.status(403).json({ message: "Sadece sahiplenen kişi bırakabilir" });
    }

    if (task.status === "completed") {
      return res.status(400).json({ message: "Tamamlanmış görev bırakılamaz" });
    }

    const result = await db.execute(sql`
      UPDATE branch_task_instances SET
        claimed_by_user_id = NULL,
        claimed_at = NULL,
        status = 'pending',
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Görev bırakılamadı" });
  }
});

router.get("/api/branch-tasks/stats", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    let branchScope: number | null = null;
    if (isBranchRole(user.role)) {
      if (!user.branchId) return res.status(403).json({ message: "Şube ataması yapılmamış" });
      branchScope = user.branchId;
    } else {
      branchScope = req.query.branchId ? Number(req.query.branchId) : null;
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    let query;
    if (branchScope) {
      query = sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE status = 'claimed')::int as claimed,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed')::int as overdue,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100, 1)
            ELSE 0 END as completion_rate
        FROM branch_task_instances
        WHERE branch_id = ${branchScope} AND due_date = ${dateParam}
      `;
    } else {
      query = sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE status = 'claimed')::int as claimed,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed')::int as overdue,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100, 1)
            ELSE 0 END as completion_rate
        FROM branch_task_instances
        WHERE due_date = ${dateParam}
      `;
    }

    const result = await db.execute(query);
    const stats = result.rows?.[0] || { total: 0, pending: 0, claimed: 0, completed: 0, overdue: 0, completion_rate: 0 };

    if (branchScope) {
      try {
        const scoreResult = await calculateBranchTaskScore(branchScope);
        (stats as any).score = scoreResult.score;
        (stats as any).scoreDetails = scoreResult.details;
      } catch {}
    }

    res.json(stats);
  } catch (error: unknown) {
    res.status(500).json({ message: "İstatistikler yüklenemedi" });
  }
});

router.get("/api/branch-tasks/templates/:id/overrides", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    if (!TEMPLATE_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const templateId = Number(req.params.id);
    let query;
    if (isBranchRole(user.role)) {
      const branchId = user.branchId;
      if (!branchId) return res.json([]);
      query = db.execute(sql`
        SELECT o.*, b.name as branch_name, u.first_name, u.last_name
        FROM branch_recurring_task_overrides o
        LEFT JOIN branches b ON o.branch_id = b.id
        LEFT JOIN users u ON o.disabled_by_user_id = u.id
        WHERE o.recurring_task_id = ${templateId} AND o.deleted_at IS NULL AND o.branch_id = ${branchId}
        ORDER BY b.name ASC
      `);
    } else {
      query = db.execute(sql`
        SELECT o.*, b.name as branch_name, u.first_name, u.last_name
        FROM branch_recurring_task_overrides o
        LEFT JOIN branches b ON o.branch_id = b.id
        LEFT JOIN users u ON o.disabled_by_user_id = u.id
        WHERE o.recurring_task_id = ${templateId} AND o.deleted_at IS NULL
        ORDER BY b.name ASC
      `);
    }
    const result = await query;
    res.json(result.rows || []);
  } catch (error: unknown) {
    res.status(500).json({ message: "Override listesi yüklenemedi" });
  }
});

router.post("/api/branch-tasks/templates/:id/overrides", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const templateId = Number(req.params.id);
    const { branchId, reason } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "Şube ID gerekli" });
    }

    const canOverride = !isBranchRole(user.role) ||
      (["mudur", "supervisor"].includes(user.role) && user.branchId === branchId);
    if (!canOverride) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const existing = await db.execute(sql`
      SELECT * FROM branch_recurring_task_overrides
      WHERE recurring_task_id = ${templateId} AND branch_id = ${branchId} AND deleted_at IS NULL
    `);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ message: "Bu şube için override zaten mevcut" });
    }

    const result = await db.execute(sql`
      INSERT INTO branch_recurring_task_overrides (recurring_task_id, branch_id, is_disabled, disabled_by_user_id, disabled_by_role, reason)
      VALUES (${templateId}, ${branchId}, true, ${user.id}, ${user.role}, ${reason || null})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Override oluşturulamadı" });
  }
});

router.delete("/api/branch-tasks/overrides/:id", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const overrideId = Number(req.params.id);

    const existing = await db.execute(sql`
      SELECT * FROM branch_recurring_task_overrides WHERE id = ${overrideId} AND deleted_at IS NULL
    `);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Override bulunamadı" });
    }

    const override = existing.rows[0] as any;
    const canDelete = !isBranchRole(user.role) ||
      (["mudur", "supervisor"].includes(user.role) && user.branchId === override.branch_id);
    if (!canDelete) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    await db.execute(sql`
      UPDATE branch_recurring_task_overrides SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${overrideId}
    `);

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ message: "Override silinemedi" });
  }
});

router.get("/api/branch-tasks/stats/user/:userId", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const userId = req.params.userId;

    if (isBranchRole(user.role) && user.id !== userId) {
      return res.status(403).json({ message: "Sadece kendi istatistiklerinizi görebilirsiniz" });
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'claimed')::int as claimed,
        COUNT(*) FILTER (WHERE is_overdue = true AND status != 'completed')::int as overdue,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0 END as completion_rate
      FROM branch_task_instances
      WHERE (assigned_to_user_id = ${userId} OR claimed_by_user_id = ${userId} OR completed_by_user_id = ${userId})
        AND due_date = ${dateParam}
    `);

    res.json(result.rows?.[0] || { total: 0, completed: 0, pending: 0, claimed: 0, overdue: 0, completion_rate: 0 });
  } catch (error: unknown) {
    res.status(500).json({ message: "Kullanıcı istatistikleri yüklenemedi" });
  }
});

router.get("/api/branch-tasks/kiosk/instances", isKioskAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.branchId) return res.status(403).json({ message: "Kiosk şube bilgisi bulunamadı" });

    const today = new Date().toISOString().slice(0, 10);
    const result = await db.execute(sql`
      SELECT i.*, r.title, r.description, r.category, r.photo_required, r.recurrence_type,
             cu.first_name as claimed_first, cu.last_name as claimed_last,
             cou.first_name as completed_first, cou.last_name as completed_last
      FROM branch_task_instances i
      JOIN branch_recurring_tasks r ON i.recurring_task_id = r.id
      LEFT JOIN users cu ON i.claimed_by_user_id = cu.id
      LEFT JOIN users cou ON i.completed_by_user_id = cou.id
      WHERE i.branch_id = ${user.branchId} AND i.due_date = ${today} AND r.deleted_at IS NULL
      ORDER BY i.is_overdue DESC, CASE i.status WHEN 'pending' THEN 1 WHEN 'claimed' THEN 2 WHEN 'completed' THEN 3 END, r.title ASC
    `);
    res.json(result.rows || []);
  } catch (error: unknown) {
    res.status(500).json({ message: "Kiosk görevleri yüklenemedi" });
  }
});

router.post("/api/branch-tasks/kiosk/:id/claim", isKioskAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const instance = await db.execute(sql`SELECT * FROM branch_task_instances WHERE id = ${id}`);
    if (!instance.rows || instance.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const task = instance.rows[0] as any;
    if (task.branch_id !== user.branchId) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }
    if (task.status !== "pending") {
      return res.status(400).json({ message: "Bu görev sahiplenilemez" });
    }

    const result = await db.execute(sql`
      UPDATE branch_task_instances SET
        claimed_by_user_id = ${user.id}, claimed_at = NOW(), status = 'claimed', updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Kiosk görev sahiplenilemedi" });
  }
});

router.post("/api/branch-tasks/kiosk/:id/complete", isKioskAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const id = Number(req.params.id);
    const instance = await db.execute(sql`SELECT * FROM branch_task_instances WHERE id = ${id}`);
    if (!instance.rows || instance.rows.length === 0) {
      return res.status(404).json({ message: "Görev bulunamadı" });
    }

    const task = instance.rows[0] as any;
    if (task.branch_id !== user.branchId) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }
    if (task.status === "completed") {
      return res.status(400).json({ message: "Bu görev zaten tamamlanmış" });
    }

    const { completionNote, photoUrl } = req.body || {};
    const result = await db.execute(sql`
      UPDATE branch_task_instances SET
        completed_by_user_id = ${user.id}, completed_at = NOW(),
        completion_note = ${completionNote || null}, photo_url = ${photoUrl || null},
        status = 'completed', updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Kiosk görev tamamlanamadı" });
  }
});

router.get("/api/branch-tasks/score", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    let branchId = Number(req.query.branchId);
    if (!branchId && isBranchRole(user.role)) {
      branchId = user.branchId;
    }
    if (!branchId) return res.status(400).json({ message: "branchId gerekli" });

    if (isBranchRole(user.role) && !canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const days = Number(req.query.days) || 30;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = new Date();

    const result = await calculateBranchTaskScore(branchId, undefined, { start, end });
    res.json(result);
  } catch (error: unknown) {
    console.error("Branch task score error:", error);
    res.status(500).json({ message: "Puan hesaplanamadı" });
  }
});

router.get("/api/branch-tasks/score/user/:userId", isAuthenticated, moduleGuard, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Yetkilendirme gerekli" });

    const targetUserId = req.params.userId;
    let branchId = Number(req.query.branchId);
    if (!branchId && isBranchRole(user.role)) {
      branchId = user.branchId;
    }
    if (!branchId) return res.status(400).json({ message: "branchId gerekli" });

    if (isBranchRole(user.role) && !canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const days = Number(req.query.days) || 30;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = new Date();

    const result = await calculateBranchTaskScore(branchId, targetUserId, { start, end });
    res.json(result);
  } catch (error: unknown) {
    console.error("User task score error:", error);
    res.status(500).json({ message: "Kullanıcı puanı hesaplanamadı" });
  }
});

export default router;
