import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { 
  branches, users, tasks, notifications, equipmentFaults
} from "@shared/schema";
import { eq, and, count, isNull, lt, sql } from "drizzle-orm";

const router = Router();

router.get("/api/me/home-summary", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split("T")[0];

    // Branch count
    const [branchRow] = await db
      .select({ val: count() })
      .from(branches)
      .where(isNull(branches.deletedAt));
    const totalBranches = Number(branchRow?.val || 0);

    // Active staff
    const [staffRow] = await db
      .select({ val: count() })
      .from(users)
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)));
    const totalStaff = Number(staffRow?.val || 0);

    // Pending tasks for this user
    const [pendingRow] = await db
      .select({ val: count() })
      .from(tasks)
      .where(and(
        eq(tasks.status, "pending"),
        isNull(tasks.deletedAt)
      ));
    const pendingTasks = Number(pendingRow?.val || 0);

    // Overdue tasks
    let overdueTasks = 0;
    try {
      const [overdueRow] = await db
        .select({ val: count() })
        .from(tasks)
        .where(and(
          eq(tasks.status, "pending"),
          isNull(tasks.deletedAt),
          sql`${tasks.dueDate}::date < ${today}::date`
        ));
      overdueTasks = Number(overdueRow?.val || 0);
    } catch {
      // dueDate column might not exist or have different format
    }

    // Open equipment faults
    let openFaults = 0;
    try {
      const [faultRow] = await db
        .select({ val: count() })
        .from(equipmentFaults)
        .where(eq(equipmentFaults.status, "open"));
      openFaults = Number(faultRow?.val || 0);
    } catch {
      // equipmentFaults table might have different schema
    }

    // Unread notifications count (no priority column - just count unread)
    let unreadCount = 0;
    try {
      const [unreadRow] = await db
        .select({ val: count() })
        .from(notifications)
        .where(and(
          sql`${notifications.userId}::int = ${user.id}`,
          eq(notifications.isRead, false)
        ));
      unreadCount = Number(unreadRow?.val || 0);
    } catch {
      // fallback if query fails
    }

    // Build badge data per module card ID
    const badges: Record<string, any> = {
      control: {
        badges: [
          { label: `${totalBranches} şube`, color: "success" },
          ...(overdueTasks > 0 ? [{ label: `${overdueTasks} geciken`, color: "danger" }] : []),
        ],
        status: overdueTasks > 0 ? "Geciken görevler var" : "Tüm sistemler normal",
      },
      subeler: {
        badges: [{ label: `${totalBranches} aktif`, color: "success" }],
        status: "",
      },
      ik: {
        badges: [{ label: `${totalStaff} kişi`, color: "success" }],
        status: "",
      },
      operasyon: {
        badges: [
          ...(pendingTasks > 0 ? [{ label: `${pendingTasks} bekleyen`, color: "warning" }] : []),
          ...(overdueTasks > 0 ? [{ label: `${overdueTasks} geciken`, color: "danger" }] : []),
        ],
        status: overdueTasks > 0 ? `${overdueTasks} görev gecikmiş` : "Görevler yolunda",
      },
      fabrika: {
        badges: [],
        status: "",
      },
      "fabrika-modul": {
        badges: [],
        status: "",
      },
      musteri: {
        badges: [],
        status: "",
      },
      ekipman: {
        badges: openFaults > 0
          ? [{ label: `${openFaults} arıza`, color: "danger" }]
          : [{ label: "Sorun yok", color: "success" }],
        status: "",
      },
      egitim: {
        badges: [],
        status: "",
      },
      "benim-gunum": {
        badges: pendingTasks > 0
          ? [{ label: `${pendingTasks} görev`, color: "info" }]
          : [],
        status: "",
      },
    };

    res.json({
      badges,
      alerts: {
        criticalCount: overdueTasks, // use overdue tasks as "critical" indicator
        pendingTasks,
        pendingApprovals: 0,
      },
    });
  } catch (error) {
    console.error("[home-summary] Error:", error);
    res.json({
      badges: {},
      alerts: { criticalCount: 0, pendingTasks: 0, pendingApprovals: 0 },
    });
  }
});

export default router;
