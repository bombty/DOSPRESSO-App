import { Router } from "express";
import { db } from "../db";
import { aiDataDomains, aiDomainPolicies, aiAgentLogs, insertAiDataDomainSchema, insertAiDomainPolicySchema } from "@shared/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { invalidatePolicyCache, ROLE_GROUP_MAP, ROLE_GROUP_LABELS, ROLE_GROUP_MEMBERS, getRoleGroup } from "../services/ai-policy-engine";

const VALID_DECISIONS = ["ALLOW", "ALLOW_AGGREGATED", "DENY"];
const VALID_SENSITIVITIES = ["public", "internal", "confidential", "restricted"];
const VALID_SCOPES = ["self", "branch", "factory", "hq", "global", "org_wide"];
const VALID_REDACTION_MODES = ["none", "no_names", "initials_only", "numeric_only"];

const router = Router();

function ensureAdmin(user: any): void {
  const role = user?.role;
  if (role !== "admin" && role !== "ceo") {
    throw Object.assign(new Error("Admin yetkisi gerekli"), { statusCode: 403 });
  }
}

async function logAdminAction(userId: string, role: string, action: string, details: string) {
  try {
    await db.insert(aiAgentLogs).values({
      runType: "policy_admin",
      triggeredByUserId: userId,
      targetRoleScope: role,
      inputSummary: action,
      outputSummary: details,
      actionCount: 1,
      status: "success",
      executionTimeMs: 0,
    });
  } catch (e) {
    console.error("Admin audit log error:", e);
  }
}

router.get("/api/admin/ai-role-groups", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    res.json({
      groups: Object.entries(ROLE_GROUP_LABELS).map(([key, label]) => ({
        key,
        label,
        members: ROLE_GROUP_MEMBERS[key] || [],
      })),
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.get("/api/admin/ai-domains", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const domains = await db.select().from(aiDataDomains).orderBy(aiDataDomains.id);
    res.json(domains);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.post("/api/admin/ai-domains", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const parsed = insertAiDataDomainSchema.parse(req.body);
    const [domain] = await db.insert(aiDataDomains).values(parsed).returning();
    invalidatePolicyCache();
    res.json(domain);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.patch("/api/admin/ai-domains/:id", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const id = parseInt(req.params.id);
    const { key, labelTr, labelEn, description, sensitivity, isActive } = req.body;
    const updates: any = {};
    if (key !== undefined) updates.key = key;
    if (labelTr !== undefined) updates.labelTr = labelTr;
    if (labelEn !== undefined) updates.labelEn = labelEn;
    if (description !== undefined) updates.description = description;
    if (sensitivity !== undefined) updates.sensitivity = sensitivity;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(aiDataDomains).set(updates).where(eq(aiDataDomains.id, id)).returning();
    invalidatePolicyCache();
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.delete("/api/admin/ai-domains/:id", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const id = parseInt(req.params.id);
    await db.delete(aiDomainPolicies).where(eq(aiDomainPolicies.domainId, id));
    await db.delete(aiDataDomains).where(eq(aiDataDomains.id, id));
    invalidatePolicyCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.get("/api/admin/ai-policies", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const { domainId, role } = req.query;
    let conditions: any[] = [];
    if (domainId) conditions.push(eq(aiDomainPolicies.domainId, parseInt(domainId as string)));
    if (role) conditions.push(eq(aiDomainPolicies.role, role as string));

    const policies = await db
      .select({
        id: aiDomainPolicies.id,
        domainId: aiDomainPolicies.domainId,
        domainKey: aiDataDomains.key,
        domainLabel: aiDataDomains.labelTr,
        role: aiDomainPolicies.role,
        employeeType: aiDomainPolicies.employeeType,
        decision: aiDomainPolicies.decision,
        scope: aiDomainPolicies.scope,
        redactionMode: aiDomainPolicies.redactionMode,
        createdAt: aiDomainPolicies.createdAt,
        updatedAt: aiDomainPolicies.updatedAt,
      })
      .from(aiDomainPolicies)
      .innerJoin(aiDataDomains, eq(aiDomainPolicies.domainId, aiDataDomains.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(aiDomainPolicies.domainId, aiDomainPolicies.role);
    res.json(policies);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.post("/api/admin/ai-policies", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const { domainId, role, decision, scope, employeeType, redactionMode } = req.body;
    if (!domainId || !role || !decision) {
      return res.status(400).json({ message: "domainId, role ve decision zorunlu" });
    }
    if (!VALID_DECISIONS.includes(decision)) {
      return res.status(400).json({ message: "Geçersiz karar değeri. ALLOW, ALLOW_AGGREGATED veya DENY olmalı." });
    }
    if (scope && !VALID_SCOPES.includes(scope)) {
      return res.status(400).json({ message: "Geçersiz kapsam. self, branch, factory, hq veya global olmalı." });
    }
    if (redactionMode && !VALID_REDACTION_MODES.includes(redactionMode)) {
      return res.status(400).json({ message: "Geçersiz maskeleme modu." });
    }
    const existing = await db.select().from(aiDomainPolicies).where(
      and(
        eq(aiDomainPolicies.domainId, domainId),
        eq(aiDomainPolicies.role, role),
        employeeType ? eq(aiDomainPolicies.employeeType, employeeType) : sql`${aiDomainPolicies.employeeType} IS NULL`
      )
    );
    if (existing.length > 0) {
      const updates: any = { decision, updatedAt: new Date() };
      if (scope) updates.scope = scope;
      if (redactionMode !== undefined) updates.redactionMode = redactionMode || null;
      const [updated] = await db.update(aiDomainPolicies).set(updates).where(eq(aiDomainPolicies.id, existing[0].id)).returning();
      invalidatePolicyCache();
      await logAdminAction(String(req.user.id), req.user.role, "policy_update", `domain:${domainId} role:${role} decision:${decision} scope:${scope || 'global'} redaction:${redactionMode || 'none'}`);
      return res.json(updated);
    }
    const [policy] = await db.insert(aiDomainPolicies).values({
      domainId,
      role,
      decision,
      scope: scope || "global",
      employeeType: employeeType || null,
      redactionMode: redactionMode || null,
    }).returning();
    invalidatePolicyCache();
    await logAdminAction(String(req.user.id), req.user.role, "policy_create", `domain:${domainId} role:${role} decision:${decision} scope:${scope || 'global'} redaction:${redactionMode || 'none'}`);
    res.json(policy);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.patch("/api/admin/ai-policies/:id", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const id = parseInt(req.params.id);
    const { decision, scope, employeeType, redactionMode } = req.body;
    if (decision !== undefined && !VALID_DECISIONS.includes(decision)) {
      return res.status(400).json({ message: "Geçersiz karar değeri" });
    }
    if (scope !== undefined && !VALID_SCOPES.includes(scope)) {
      return res.status(400).json({ message: "Geçersiz kapsam değeri" });
    }
    if (redactionMode !== undefined && redactionMode !== null && !VALID_REDACTION_MODES.includes(redactionMode)) {
      return res.status(400).json({ message: "Geçersiz maskeleme modu" });
    }
    const updates: any = { updatedAt: new Date() };
    if (decision !== undefined) updates.decision = decision;
    if (scope !== undefined) updates.scope = scope;
    if (employeeType !== undefined) updates.employeeType = employeeType;
    if (redactionMode !== undefined) updates.redactionMode = redactionMode;

    const [updated] = await db.update(aiDomainPolicies).set(updates).where(eq(aiDomainPolicies.id, id)).returning();
    invalidatePolicyCache();
    await logAdminAction(String(req.user.id), req.user.role, "policy_patch", `id:${id} ${JSON.stringify(updates)}`);
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.delete("/api/admin/ai-policies/:id", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const id = parseInt(req.params.id);
    await db.delete(aiDomainPolicies).where(eq(aiDomainPolicies.id, id));
    invalidatePolicyCache();
    await logAdminAction(String(req.user.id), req.user.role, "policy_delete", `id:${id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

router.get("/api/admin/ai-logs", isAuthenticated, async (req: any, res) => {
  try {
    ensureAdmin(req.user);
    const { page = "1", limit = "50", status, role } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let conditions: any[] = [];
    if (status) conditions.push(eq(aiAgentLogs.status, status as string));
    if (role) conditions.push(eq(aiAgentLogs.targetRoleScope, role as string));

    const logs = await db
      .select()
      .from(aiAgentLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiAgentLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(aiAgentLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ logs, total: Number(total), page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

export default router;
