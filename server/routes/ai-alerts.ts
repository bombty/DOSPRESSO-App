// ═══════════════════════════════════════════════════════════════════
// Sprint 49 (Aslan 13 May 2026) — AI Alerts API
// ═══════════════════════════════════════════════════════════════════
//   GET  /api/ai-alerts                — rol bazlı aktif alertler
//   GET  /api/ai-alerts/summary        — kategori bazlı sayım
//   POST /api/ai-alerts/:id/dismiss    — kapatma (ignore)
//   POST /api/ai-alerts/:id/resolve    — çözüldü işaretle
//   POST /api/ai-alerts/run-now        — manuel tetikle (admin)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, or, desc, sql, isNull } from "drizzle-orm";
import { aiAlerts } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { runAlertChecks } from "../services/ai-alert-generator";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GET /api/ai-alerts
// Kullanıcının rolüne göre aktif alertleri döner
// Query: ?severity=critical&category=satinalma
// ═══════════════════════════════════════════════════════════════════
router.get("/api/ai-alerts", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user.role;
    const { severity, category, limit = 50 } = req.query;

    const conditions: any[] = [eq(aiAlerts.status, "pending")];

    // Rol bazlı: targetRole NULL veya kullanıcının rolü ile eşleşen
    conditions.push(
      or(
        isNull(aiAlerts.targetRole),
        eq(aiAlerts.targetRole, userRole),
      )
    );

    if (severity && typeof severity === "string") {
      conditions.push(eq(aiAlerts.severity, severity));
    }
    if (category && typeof category === "string") {
      conditions.push(eq(aiAlerts.category, category));
    }

    const alerts = await db.select()
      .from(aiAlerts)
      .where(and(...conditions))
      .orderBy(
        desc(sql`CASE 
          WHEN ${aiAlerts.severity} = 'critical' THEN 3
          WHEN ${aiAlerts.severity} = 'warning' THEN 2
          ELSE 1
        END`),
        desc(aiAlerts.createdAt),
      )
      .limit(parseInt(limit as string) || 50);

    res.json({ alerts, count: alerts.length });
  } catch (err: any) {
    console.error("[AiAlerts/list]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/ai-alerts/summary
// Kullanıcı için sayım: { critical, warning, info, total }
// Notification badge için
// ═══════════════════════════════════════════════════════════════════
router.get("/api/ai-alerts/summary", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user.role;

    const summary = await db.select({
      severity: aiAlerts.severity,
      count: sql<number>`count(*)::int`,
    })
      .from(aiAlerts)
      .where(and(
        eq(aiAlerts.status, "pending"),
        or(
          isNull(aiAlerts.targetRole),
          eq(aiAlerts.targetRole, userRole),
        ),
      ))
      .groupBy(aiAlerts.severity);

    const result = {
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    };

    for (const row of summary) {
      if (row.severity === "critical") result.critical = row.count;
      else if (row.severity === "warning") result.warning = row.count;
      else if (row.severity === "info") result.info = row.count;
      result.total += row.count;
    }

    res.json(result);
  } catch (err: any) {
    console.error("[AiAlerts/summary]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai-alerts/:id/dismiss
// Kullanıcı alert'i kapatır (görmek istemiyor)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/ai-alerts/:id/dismiss", isAuthenticated, async (req: any, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user.id;

    await db.update(aiAlerts)
      .set({
        status: "dismissed",
        resolvedAt: new Date(),
        resolvedById: userId,
      })
      .where(eq(aiAlerts.id, alertId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[AiAlerts/dismiss]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai-alerts/:id/resolve
// Kullanıcı alert'i çözdü işaretler
// ═══════════════════════════════════════════════════════════════════
router.post("/api/ai-alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user.id;

    await db.update(aiAlerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedById: userId,
      })
      .where(eq(aiAlerts.id, alertId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[AiAlerts/resolve]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai-alerts/run-now
// ADMIN: kontrolleri hemen çalıştır (test için)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/ai-alerts/run-now", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user.role;

    if (!["admin", "ceo", "cgo"].includes(userRole)) {
      return res.status(403).json({ message: "Sadece admin yetkili" });
    }

    const result = await runAlertChecks();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[AiAlerts/run-now]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
