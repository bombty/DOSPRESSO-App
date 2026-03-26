import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { sql, eq, and, asc, ne, isNull, count, avg, sum, desc } from "drizzle-orm";
import {
  dashboardWidgets,
  dashboardRoleWidgets,
  users,
  branches,
  supportTickets,
  equipmentFaults,
  equipment,
  customerFeedback,
  guestComplaints,
  tasks,
  factoryProductionOutputs,
  factoryShipments,
  branchOrders,
} from "@shared/schema";
import type { AuthUser } from "../types/auth";
import { getUserPermissions } from "../permission-service";

const router = Router();

async function safeCount(query: string): Promise<number> {
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.count || 0);
  } catch { return 0; }
}

async function safeCountParam(query: ReturnType<typeof sql>): Promise<number> {
  try {
    const r = await db.execute(query);
    return Number(r.rows?.[0]?.count || 0);
  } catch { return 0; }
}

async function safeAvg(query: string): Promise<number> {
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.avg || 0);
  } catch { return 0; }
}

async function safeRows(query: string): Promise<any[]> {
  try {
    const r = await db.execute(sql.raw(query));
    return r.rows || [];
  } catch { return []; }
}

type WidgetDataCollector = (user: AuthUser) => Promise<any>;

const widgetDataCollectors: Record<string, WidgetDataCollector> = {
  branch_health: async () => {
    const allBranches = await safeRows(`
      SELECT b.id, b.name FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const ratings = await safeRows(`
      SELECT branch_id, avg(rating) as avg_rating, count(*) as cnt
      FROM customer_feedback
      WHERE created_at >= '${threeDaysAgo.toISOString()}'
      GROUP BY branch_id
    `);
    const ratingMap = new Map<number, { avg: number; count: number }>();
    for (const r of ratings) {
      ratingMap.set(Number(r.branch_id), { avg: parseFloat(String(r.avg_rating || 0)), count: Number(r.cnt || 0) });
    }
    let normal = 0, warning = 0, critical = 0;
    const branchList = allBranches.map((b: any) => {
      const rating = ratingMap.get(Number(b.id));
      const avgRating = rating ? Math.round(rating.avg * 10) / 10 : 0;
      let status: string = "normal";
      if (avgRating > 0 && avgRating < 3.0) { status = "critical"; critical++; }
      else if (avgRating > 0 && avgRating < 3.5) { status = "warning"; warning++; }
      else { normal++; }
      return { id: b.id, name: b.name, avgRating, feedbackCount: rating?.count || 0, status };
    });
    branchList.sort((a: any, b: any) => b.avgRating - a.avgRating);
    return { normal, warning, critical, total: allBranches.length, branches: branchList.slice(0, 10) };
  },

  sla_stats: async () => {
    const slaBreaches = await safeCount(`SELECT count(*) FROM support_tickets WHERE sla_breached = true AND status NOT IN ('resolved','kapali') AND is_deleted = false`);
    const openTickets = await safeCount(`SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','kapali') AND is_deleted = false`);
    return { slaBreaches, openTickets };
  },

  tickets_open: async () => {
    const total = await safeCount(`SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','kapali') AND is_deleted = false`);
    const critical = await safeCount(`SELECT count(*) FROM support_tickets WHERE priority = 'critical' AND status NOT IN ('resolved','kapali') AND is_deleted = false`);
    return { total, critical };
  },

  my_tasks: async (user: AuthUser) => {
    const userId = user.id;
    const todayDate = new Date().toISOString().split('T')[0];
    const pending = await safeCountParam(sql`SELECT count(*) FROM tasks WHERE (assigned_to = ${userId} OR created_by = ${userId}) AND status IN ('pending','in_progress') AND deleted_at IS NULL`);
    const completedToday = await safeCountParam(sql`SELECT count(*) FROM tasks WHERE (assigned_to = ${userId} OR created_by = ${userId}) AND status = 'completed' AND completed_at >= ${todayDate} AND deleted_at IS NULL`);
    const overdue = await safeCountParam(sql`SELECT count(*) FROM tasks WHERE (assigned_to = ${userId} OR created_by = ${userId}) AND status IN ('pending','in_progress') AND due_date < NOW() AND deleted_at IS NULL`);
    return { pending, completedToday, overdue };
  },

  staff_count: async () => {
    const active = await safeCount(`SELECT count(*) FROM users WHERE is_active = true AND deleted_at IS NULL`);
    const approved = await safeCount(`SELECT count(*) FROM users WHERE is_active = true AND account_status = 'approved' AND deleted_at IS NULL`);
    return { active, approved };
  },

  pending_leaves: async () => {
    const pending = await safeCount(`SELECT count(*) FROM leave_requests WHERE status = 'pending'`);
    const pendingOvertimes = await safeCount(`SELECT count(*) FROM overtime_requests WHERE status = 'pending'`);
    return { pendingLeaves: pending, pendingOvertimes };
  },

  ik_dashboard: async () => {
    const totalDocs = await safeCount(`SELECT count(*) FROM hr_documents`);
    const verifiedDocs = await safeCount(`SELECT count(*) FROM hr_documents WHERE status = 'verified'`);
    const openDisciplinary = await safeCount(`SELECT count(*) FROM disciplinary_actions WHERE status IN ('pending','active')`);
    const totalDisciplinary = await safeCount(`SELECT count(*) FROM disciplinary_actions`);
    return {
      documents: { total: totalDocs, verified: verifiedDocs, completionRate: totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0 },
      disciplinary: { total: totalDisciplinary, open: openDisciplinary },
    };
  },

  factory_summary: async () => {
    const todayStart = new Date().toISOString().split('T')[0];
    const produced = await safeCount(`SELECT COALESCE(SUM(quantity),0) as count FROM factory_production_outputs WHERE created_at >= '${todayStart}'`);
    const waste = await safeCount(`SELECT COALESCE(SUM(waste_quantity),0) as count FROM factory_production_outputs WHERE created_at >= '${todayStart}'`);
    const pendingShipments = await safeCount(`SELECT count(*) FROM factory_shipments WHERE status = 'hazirlaniyor'`);
    return {
      todayProduction: produced,
      wasteCount: waste,
      wastePercentage: produced > 0 ? Math.round((waste / produced) * 1000) / 10 : 0,
      pendingShipments,
    };
  },

  qc_stats: async () => {
    const todayStart = new Date().toISOString().split('T')[0];
    const todayTotal = await safeCount(`SELECT count(*) FROM factory_qc_inspections WHERE created_at >= '${todayStart}'`);
    const todayPending = await safeCount(`SELECT count(*) FROM factory_qc_inspections WHERE status = 'pending' AND created_at >= '${todayStart}'`);
    const todayApproved = await safeCount(`SELECT count(*) FROM factory_qc_inspections WHERE status = 'approved' AND created_at >= '${todayStart}'`);
    const todayRejected = await safeCount(`SELECT count(*) FROM factory_qc_inspections WHERE status = 'rejected' AND created_at >= '${todayStart}'`);
    return {
      today: {
        total: todayTotal,
        pending: todayPending,
        approved: todayApproved,
        rejected: todayRejected,
        passRate: todayTotal > 0 ? Math.round((todayApproved / todayTotal) * 100) : 0,
      },
    };
  },

  pending_shipments: async () => {
    const pending = await safeCount(`SELECT count(*) FROM factory_shipments WHERE status = 'hazirlaniyor'`);
    return { pending };
  },

  financial_summary: async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const revenue = await safeRows(`SELECT COALESCE(SUM(amount),0) as total FROM financial_records WHERE type = 'gelir' AND month = ${currentMonth} AND year = ${currentYear}`);
    const expenses = await safeRows(`SELECT COALESCE(SUM(amount),0) as total FROM financial_records WHERE type = 'gider' AND month = ${currentMonth} AND year = ${currentYear}`);
    const totalRevenue = Number(revenue[0]?.total || 0);
    const totalExpenses = Number(expenses[0]?.total || 0);
    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
    };
  },

  pending_orders: async () => {
    const pending = await safeCount(`SELECT count(*) FROM branch_orders WHERE status = 'pending'`);
    return { pending };
  },

  training_stats: async () => {
    const totalCompletions = await safeCount(`SELECT count(*) FROM training_progress WHERE status = 'completed'`);
    const avgQuiz = await safeAvg(`SELECT avg(score) as avg FROM quiz_attempts WHERE score IS NOT NULL`);
    return { totalCompletions, avgQuizScore: avgQuiz ? Number(avgQuiz.toFixed(1)) : null };
  },

  customer_feedback: async () => {
    const avgRating = await safeAvg(`SELECT avg(rating) as avg FROM customer_feedback WHERE rating IS NOT NULL`);
    const totalFeedback = await safeCount(`SELECT count(*) FROM customer_feedback`);
    const recentFeedback = await safeRows(`SELECT id, branch_id, rating, comment, created_at FROM customer_feedback ORDER BY created_at DESC LIMIT 5`);
    return {
      avgRating: avgRating ? Number(avgRating.toFixed(1)) : null,
      totalFeedback,
      recent: recentFeedback,
    };
  },

  crm_stats: async () => {
    const openComplaints = await safeCount(`SELECT count(*) FROM guest_complaints WHERE status NOT IN ('resolved','closed')`);
    const totalComplaints = await safeCount(`SELECT count(*) FROM guest_complaints`);
    return { openComplaints, totalComplaints };
  },

  faults_count: async () => {
    const open = await safeCount(`SELECT count(*) FROM equipment_faults WHERE status != 'cozuldu'`);
    const critical = await safeCount(`SELECT count(*) FROM equipment_faults WHERE status != 'cozuldu' AND priority = 'critical'`);
    return { open, critical };
  },

  equipment_alerts: async () => {
    const needsRepair = await safeCount(`SELECT count(*) FROM equipment WHERE status = 'needs_repair'`);
    const total = await safeCount(`SELECT count(*) FROM equipment WHERE is_active = true`);
    return { needsRepair, total };
  },

  ai_briefing: async () => {
    return { source: "api", endpoint: "/api/me/dashboard-briefing" };
  },

  quick_actions: async (user: AuthUser) => {
    return getQuickActionsForRole(user.role || "");
  },
};

const ROLE_QUICK_ACTIONS: Record<string, Array<{ label: string; path: string; iconName: string; color: string }>> = {
  ceo: [
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  ],
  cgo: [
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Akademi", path: "/akademi", iconName: "GraduationCap", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ],
  admin: [
    { label: "İletişim", path: "/hq-destek", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  ],
  satinalma: [
    { label: "Stok", path: "/stok", iconName: "Package", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Tedarik", path: "/tedarikciler", iconName: "Truck", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Siparişler", path: "/siparisler", iconName: "ShoppingCart", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  marketing: [
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Müşteri", path: "/musteri-memnuniyeti", iconName: "Star", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  kalite_kontrol: [
    { label: "Denetim", path: "/denetim", iconName: "ClipboardCheck", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
    { label: "Kalite", path: "/kalite", iconName: "Shield", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  gida_muhendisi: [
    { label: "Reçeteler", path: "/receteler", iconName: "ChefHat", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Kalite", path: "/kalite", iconName: "Shield", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
};

const DEFAULT_QUICK_ACTIONS = [
  { label: "İletişim", path: "/hq-destek", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
];

function getQuickActionsForRole(role: string) {
  return ROLE_QUICK_ACTIONS[role] || DEFAULT_QUICK_ACTIONS;
}

router.get("/api/me/dashboard-data", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const role = user.role || "";

    const roleWidgets = await db
      .select()
      .from(dashboardRoleWidgets)
      .where(and(eq(dashboardRoleWidgets.role, role), eq(dashboardRoleWidgets.isEnabled, true)))
      .orderBy(asc(dashboardRoleWidgets.displayOrder));

    let widgetConfigs: any[] = [];

    if (roleWidgets.length > 0) {
      const widgetKeys = roleWidgets.map(rw => rw.widgetKey);
      const allWidgets = await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.isActive, true));

      const widgetMap = new Map(allWidgets.map(w => [w.widgetKey, w]));

      widgetConfigs = roleWidgets
        .filter(rw => widgetMap.has(rw.widgetKey))
        .map(rw => ({
          roleWidget: rw,
          widget: widgetMap.get(rw.widgetKey)!,
        }));
    } else {
      const allWidgets = await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.isActive, true))
        .orderBy(asc(dashboardWidgets.sortOrder));

      widgetConfigs = allWidgets
        .filter(w => {
          if (!w.defaultRoles || w.defaultRoles.length === 0) return true;
          return w.defaultRoles.includes(role);
        })
        .map(w => ({
          roleWidget: { widgetKey: w.widgetKey, displayOrder: w.sortOrder, defaultOpen: true },
          widget: w,
        }));
    }

    let userPermissionKeys: Set<string> = new Set();
    let permissionsLoaded = false;
    try {
      const perms = await getUserPermissions(role);
      perms.forEach((_, key) => userPermissionKeys.add(key));
      permissionsLoaded = true;
    } catch (err) {
      console.error("[Dashboard] Permission lookup failed for role:", role, err);
    }

    const authorizedWidgets = widgetConfigs.filter(({ widget }) => {
      if (!widget.requiredPermissions || widget.requiredPermissions.length === 0) return true;
      if (!permissionsLoaded) return false;
      return widget.requiredPermissions.every(perm => userPermissionKeys.has(perm));
    });

    const widgetResults = await Promise.allSettled(
      authorizedWidgets.map(async ({ roleWidget, widget }) => {
        const collector = widgetDataCollectors[widget.dataSource];
        let data: any = null;
        if (collector) {
          try {
            data = await collector(user);
          } catch (err) {
            console.error(`[Widget Data] ${widget.widgetKey} error:`, err);
            data = { error: true };
          }
        }
        return {
          key: widget.widgetKey,
          title: widget.title,
          description: widget.description,
          type: widget.widgetType,
          size: widget.size,
          category: widget.category,
          componentKey: widget.componentKey,
          order: roleWidget.displayOrder,
          defaultOpen: roleWidget.defaultOpen,
          data,
        };
      })
    );

    const widgets = widgetResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value)
      .sort((a, b) => a.order - b.order);

    const kpis = extractKPIs(widgets, role);

    res.json({
      role,
      widgets,
      kpis,
      quickActions: getQuickActionsForRole(role),
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Unified]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Dashboard verisi alınamadı" });
  }
});

function extractKPIs(widgets: any[], role: string): any[] {
  const kpis: any[] = [];

  const branchWidget = widgets.find(w => w.key === "branch_status");
  if (branchWidget?.data) {
    kpis.push({
      key: "branches",
      label: "Şube",
      value: branchWidget.data.total || 0,
      subtext: branchWidget.data.critical > 0 ? `${branchWidget.data.critical} kritik` : undefined,
    });
  }

  const slaWidget = widgets.find(w => w.key === "sla_tracker");
  if (slaWidget?.data) {
    kpis.push({
      key: "sla",
      label: "SLA İhlali",
      value: slaWidget.data.slaBreaches || 0,
      color: slaWidget.data.slaBreaches > 0 ? "destructive" : "success",
    });
  }

  const ticketWidget = widgets.find(w => w.key === "open_tickets");
  if (ticketWidget?.data) {
    kpis.push({
      key: "tickets",
      label: "Açık Ticket",
      value: ticketWidget.data.total || 0,
      color: ticketWidget.data.total > 0 ? "warning" : undefined,
    });
  }

  const staffWidget = widgets.find(w => w.key === "staff_count");
  if (staffWidget?.data) {
    kpis.push({
      key: "staff",
      label: "Personel",
      value: staffWidget.data.active || 0,
      color: "success",
    });
  }

  const taskWidget = widgets.find(w => w.key === "todays_tasks");
  if (taskWidget?.data) {
    kpis.push({
      key: "tasks",
      label: "Görev",
      value: taskWidget.data.pending || 0,
      subtext: taskWidget.data.overdue > 0 ? `${taskWidget.data.overdue} gecikmiş` : undefined,
      color: taskWidget.data.overdue > 0 ? "destructive" : undefined,
    });
  }

  return kpis;
}

router.get("/api/admin/mc-widgets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const allWidgets = await db
      .select()
      .from(dashboardWidgets)
      .orderBy(asc(dashboardWidgets.sortOrder));
    res.json(allWidgets);
  } catch (err: unknown) {
    console.error("[Admin/Widgets]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Widget listesi alınamadı" });
  }
});

router.post("/api/admin/mc-widgets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const { widgetKey, title, description, widgetType, size, dataSource, category, componentKey, defaultRoles, sortOrder } = req.body;
    if (!widgetKey || !title || !widgetType || !dataSource) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik: widgetKey, title, widgetType, dataSource" });
    }
    const [created] = await db.insert(dashboardWidgets).values({
      widgetKey,
      title,
      description,
      widgetType,
      size: size || "medium",
      dataSource,
      category: category || "genel",
      componentKey,
      defaultRoles: defaultRoles || [],
      sortOrder: sortOrder || 0,
      isActive: true,
      createdBy: user.id,
    }).returning();
    res.json(created);
  } catch (err: unknown) {
    console.error("[Admin/Widgets/Create]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Widget oluşturulamadı" });
  }
});

router.patch("/api/admin/mc-widgets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const widgetId = parseInt(req.params.id);
    if (isNaN(widgetId)) return res.status(400).json({ message: "Geçersiz widget ID" });

    const updateData: any = { updatedAt: new Date() };
    const allowedFields = ["title", "description", "widgetType", "size", "dataSource", "category", "componentKey", "defaultRoles", "sortOrder", "isActive"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const [updated] = await db.update(dashboardWidgets).set(updateData).where(eq(dashboardWidgets.id, widgetId)).returning();
    if (!updated) return res.status(404).json({ message: "Widget bulunamadı" });
    res.json(updated);
  } catch (err: unknown) {
    console.error("[Admin/Widgets/Update]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Widget güncellenemedi" });
  }
});

router.delete("/api/admin/mc-widgets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const widgetId = parseInt(req.params.id);
    if (isNaN(widgetId)) return res.status(400).json({ message: "Geçersiz widget ID" });

    const [deleted] = await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, widgetId)).returning();
    if (!deleted) return res.status(404).json({ message: "Widget bulunamadı" });
    res.json({ message: "Widget silindi", id: widgetId });
  } catch (err: unknown) {
    console.error("[Admin/Widgets/Delete]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Widget silinemedi" });
  }
});

router.get("/api/admin/dashboard-role-widgets/:role", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const targetRole = req.params.role;
    const results = await db.select().from(dashboardRoleWidgets)
      .where(eq(dashboardRoleWidgets.role, targetRole))
      .orderBy(asc(dashboardRoleWidgets.displayOrder));
    res.json(results);
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol-widget listesi alınamadı" });
  }
});

router.get("/api/admin/dashboard-role-widgets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const { role } = req.query;
    let query = db.select().from(dashboardRoleWidgets);
    if (role && typeof role === "string") {
      const results = await query.where(eq(dashboardRoleWidgets.role, role)).orderBy(asc(dashboardRoleWidgets.displayOrder));
      return res.json(results);
    }
    const results = await query.orderBy(asc(dashboardRoleWidgets.role), asc(dashboardRoleWidgets.displayOrder));
    res.json(results);
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol-widget listesi alınamadı" });
  }
});

router.post("/api/admin/dashboard-role-widgets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const { role: targetRole, widgetKey, isEnabled, displayOrder, defaultOpen } = req.body;
    if (!targetRole || !widgetKey) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik: role, widgetKey" });
    }
    const [widget] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.widgetKey, widgetKey));
    if (!widget) {
      return res.status(404).json({ message: "Widget bulunamadı" });
    }
    if (widget.requiredPermissions && widget.requiredPermissions.length > 0) {
      let rolePerms: Map<string, any>;
      try {
        rolePerms = await getUserPermissions(targetRole);
      } catch (err) {
        console.error("[Admin/RoleWidgets] Permission check failed:", err);
        return res.status(500).json({ message: "İzin kontrolü başarısız oldu" });
      }
      const missingPerms = widget.requiredPermissions.filter(p => !rolePerms.has(p));
      if (missingPerms.length > 0) {
        return res.status(400).json({ message: `Bu rol gerekli izinlere sahip değil: ${missingPerms.join(', ')}` });
      }
    }
    const [created] = await db.insert(dashboardRoleWidgets).values({
      role: targetRole,
      widgetKey,
      isEnabled: isEnabled !== false,
      displayOrder: displayOrder || 0,
      defaultOpen: defaultOpen !== false,
    }).returning();
    res.json(created);
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets/Create]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol-widget ataması oluşturulamadı" });
  }
});

router.patch("/api/admin/dashboard-role-widgets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const updateData: any = { updatedAt: new Date() };
    if (req.body.isEnabled !== undefined) updateData.isEnabled = req.body.isEnabled;
    if (req.body.displayOrder !== undefined) updateData.displayOrder = req.body.displayOrder;
    if (req.body.defaultOpen !== undefined) updateData.defaultOpen = req.body.defaultOpen;

    const [updated] = await db.update(dashboardRoleWidgets).set(updateData).where(eq(dashboardRoleWidgets.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Kayıt bulunamadı" });
    res.json(updated);
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets/Update]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol-widget ataması güncellenemedi" });
  }
});

router.delete("/api/admin/dashboard-role-widgets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [deleted] = await db.delete(dashboardRoleWidgets).where(eq(dashboardRoleWidgets.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Kayıt bulunamadı" });
    res.json({ message: "Silindi", id });
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets/Delete]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol-widget ataması silinemedi" });
  }
});

router.put("/api/admin/dashboard-role-widgets/:role", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user.role || !["admin", "ceo", "cgo"].includes(user.role)) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    const targetRole = req.params.role;
    const { widgets } = req.body;
    if (!Array.isArray(widgets)) {
      return res.status(400).json({ message: "widgets dizisi gerekli" });
    }

    const allWidgetDefs = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.isActive, true));
    const widgetDefMap = new Map(allWidgetDefs.map(w => [w.widgetKey, w]));

    let rolePerms: Map<string, any> | null = null;
    let permsLoaded = false;
    try {
      rolePerms = await getUserPermissions(targetRole);
      permsLoaded = true;
    } catch (err) {
      console.error("[Admin/RoleWidgets/BulkUpdate] Permission check failed:", err);
    }

    const authorizedWidgetKeys = new Set<string>();
    for (const w of widgets) {
      if (!w.widgetKey) continue;
      const widgetDef = widgetDefMap.get(w.widgetKey);
      if (!widgetDef) continue;
      if (widgetDef.requiredPermissions && widgetDef.requiredPermissions.length > 0) {
        if (!permsLoaded) continue;
        const missing = widgetDef.requiredPermissions.filter(p => !rolePerms!.has(p));
        if (missing.length > 0) continue;
      }
      authorizedWidgetKeys.add(w.widgetKey);
    }

    await db.delete(dashboardRoleWidgets).where(eq(dashboardRoleWidgets.role, targetRole));

    const insertRows = widgets
      .filter((w: any) => w.widgetKey && authorizedWidgetKeys.has(w.widgetKey))
      .map((w: any, i: number) => ({
        role: targetRole,
        widgetKey: w.widgetKey,
        isEnabled: w.isEnabled !== false,
        displayOrder: w.displayOrder ?? i + 1,
        defaultOpen: w.defaultOpen !== false,
      }));

    if (insertRows.length > 0) {
      await db.insert(dashboardRoleWidgets).values(insertRows);
    }

    const result = await db.select().from(dashboardRoleWidgets)
      .where(eq(dashboardRoleWidgets.role, targetRole))
      .orderBy(asc(dashboardRoleWidgets.displayOrder));
    res.json(result);
  } catch (err: unknown) {
    console.error("[Admin/RoleWidgets/BulkUpdate]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rol widget yapılandırması güncellenemedi" });
  }
});

export default router;
