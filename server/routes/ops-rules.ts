import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq } from "drizzle-orm";
import {
  opsRules,
  isHQRole,
  isBranchRole,
  type UserRoleType,
} from "@shared/schema";
import { evaluateRules, type EvaluationContext } from "../services/rules-engine";
import { createAuditEntry, getAuditContext } from "../audit";

const router = Router();

router.get("/api/ops-rules/evaluate", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user?.id) return res.status(401).json({ error: "Yetkilendirme gerekli" });

    const role = user.role as UserRoleType;
    let branchId = user.branchId;

    if (isHQRole(role) && req.query.branchId) {
      branchId = parseInt(req.query.branchId as string);
    } else if (isBranchRole(role) && req.query.branchId && parseInt(req.query.branchId as string) !== user.branchId) {
      return res.status(403).json({ error: "Sadece kendi şubenizin uyarılarını görebilirsiniz" });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const ctx: EvaluationContext = {
      userId: user.id,
      userRole: role,
      branchId: branchId || null,
      dateRange: { start: todayStr, end: weekEndStr },
    };

    const issues = await evaluateRules(ctx);

    try {
      await createAuditEntry(getAuditContext(req), {
        eventType: "ops_rule.evaluated",
        action: "evaluate",
        resource: "ops_rules",
        resourceId: "batch",
        details: { issueCount: issues.length, branchId },
      });
    } catch {}

    return res.json(issues);
  } catch (error: unknown) {
    console.error("[OpsRules] Evaluation error:", error);
    return res.status(500).json({ error: "Kurallar değerlendirilemedi" });
  }
});

router.get("/api/ops-rules", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!user?.id) return res.status(401).json({ error: "Yetkilendirme gerekli" });

    const role = user.role as UserRoleType;
    if (!isHQRole(role) && role !== "admin") {
      return res.status(403).json({ error: "Kural listesini görüntüleme yetkiniz yok" });
    }

    const rules = await db.select().from(opsRules).orderBy(opsRules.id);
    return res.json(rules);
  } catch (error: unknown) {
    console.error("[OpsRules] List error:", error);
    return res.status(500).json({ error: "Kurallar yüklenemedi" });
  }
});

export default router;
