import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, or, sql } from "drizzle-orm";
import {
  dobodyScopes, dobodyProposals, dobodyEvents,
  dobodyLearning, dobodyWorkflowConfidence, branches,
} from "@shared/schema";

const router = Router();

// GET /api/dobody/proposals — Kullanıcının önerileri
router.get('/api/dobody/proposals', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const status = req.query.status as string || 'pending';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    let conditions: any[] = [
      or(eq(dobodyProposals.userId, user.id), eq(dobodyProposals.roleTarget, user.role)),
    ];
    if (status !== 'all') conditions.push(eq(dobodyProposals.status, status));

    const proposals = await db.select({ proposal: dobodyProposals, branchName: branches.name })
      .from(dobodyProposals)
      .leftJoin(branches, eq(branches.id, dobodyProposals.branchId))
      .where(and(...conditions))
      .orderBy(sql`CASE WHEN ${dobodyProposals.priority} = 'acil' THEN 0 WHEN ${dobodyProposals.priority} = 'onemli' THEN 1 ELSE 2 END`, desc(dobodyProposals.createdAt))
      .limit(limit);

    res.json(proposals.map(p => ({ ...p.proposal, branchName: p.branchName })));
  } catch (error) {
    console.error("Get proposals error:", error);
    res.status(500).json({ message: "Öneriler alınamadı" });
  }
});

// GET /api/dobody/proposals/count — Bekleyen sayı
router.get('/api/dobody/proposals/count', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(dobodyProposals)
      .where(and(
        eq(dobodyProposals.status, 'pending'),
        or(eq(dobodyProposals.userId, user.id), eq(dobodyProposals.roleTarget, user.role)),
      ));
    res.json({ count: result[0]?.count || 0 });
  } catch (error) {
    res.status(500).json({ count: 0 });
  }
});

// POST /api/dobody/proposals — Öneri oluştur
router.post('/api/dobody/proposals', isAuthenticated, async (req, res) => {
  try {
    const { workflowType, roleTarget, userId, branchId, proposalType, priority,
      title, description, sourceModule, relatedEntityType, relatedEntityId,
      suggestedActionType, suggestedActionData, expiresAt } = req.body;

    if (!title?.trim() || !workflowType || !roleTarget)
      return res.status(400).json({ message: "Başlık, workflow tipi ve hedef rol gerekli" });

    // Günde max 3 kontrol
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(dobodyProposals)
      .where(and(eq(dobodyProposals.roleTarget, roleTarget), sql`${dobodyProposals.createdAt} >= ${todayStart.toISOString()}`));

    if (Number(todayCount[0]?.count || 0) >= 3)
      return res.status(429).json({ message: "Günlük öneri limiti doldu (max 3)" });

    const [proposal] = await db.insert(dobodyProposals).values({
      workflowType, roleTarget, userId: userId || null, branchId: branchId || null,
      proposalType: proposalType || 'action', priority: priority || 'onemli',
      title: title.trim(), description: description || null,
      sourceModule: sourceModule || null, relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null,
      suggestedActionType: suggestedActionType || null,
      suggestedActionData: suggestedActionData || null,
      expiresAt: expiresAt || null, status: 'pending',
    }).returning();

    res.status(201).json(proposal);
  } catch (error) {
    console.error("Create proposal error:", error);
    res.status(500).json({ message: "Öneri oluşturulamadı" });
  }
});

// PATCH /api/dobody/proposals/:id/approve
router.patch('/api/dobody/proposals/:id/approve', isAuthenticated, async (req, res) => {
  try {
    const [updated] = await db.update(dobodyProposals)
      .set({ status: 'approved', approvedBy: req.user.id, approvedAt: new Date() })
      .where(eq(dobodyProposals.id, parseInt(req.params.id))).returning();
    if (!updated) return res.status(404).json({ message: "Öneri bulunamadı" });

    await db.insert(dobodyLearning).values({ workflowType: updated.workflowType, proposalId: updated.id, outcome: 'approved', confidenceDelta: '2.0' });
    await updateConfidence(updated.workflowType, updated.roleTarget, true);
    res.json(updated);
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ message: "Onay başarısız" });
  }
});

// PATCH /api/dobody/proposals/:id/reject
router.patch('/api/dobody/proposals/:id/reject', isAuthenticated, async (req, res) => {
  try {
    const { reason } = req.body;
    const [updated] = await db.update(dobodyProposals)
      .set({ status: 'rejected', rejectedReason: reason || null })
      .where(eq(dobodyProposals.id, parseInt(req.params.id))).returning();
    if (!updated) return res.status(404).json({ message: "Öneri bulunamadı" });

    await db.insert(dobodyLearning).values({ workflowType: updated.workflowType, proposalId: updated.id, outcome: 'rejected', rejectionReason: reason || null, confidenceDelta: '-3.0' });
    await updateConfidence(updated.workflowType, updated.roleTarget, false);
    res.json(updated);
  } catch (error) {
    console.error("Reject error:", error);
    res.status(500).json({ message: "Ret başarısız" });
  }
});

// GET /api/dobody/scopes
router.get('/api/dobody/scopes', isAuthenticated, async (_req, res) => {
  try { res.json(await db.select().from(dobodyScopes).orderBy(dobodyScopes.role)); }
  catch (error) { res.status(500).json({ message: "Scope alınamadı" }); }
});

// GET /api/dobody/my-scope
router.get('/api/dobody/my-scope', isAuthenticated, async (req, res) => {
  try {
    const [scope] = await db.select().from(dobodyScopes).where(eq(dobodyScopes.role, req.user.role));
    res.json(scope || { role: req.user.role, allowedModules: [], blockedKeywords: [], branchScope: 'own', maxDetailLevel: 'summary' });
  } catch (error) { res.status(500).json({ message: "Scope alınamadı" }); }
});

// POST /api/dobody/events
router.post('/api/dobody/events', isAuthenticated, async (req, res) => {
  try {
    const { eventType, sourceModule, entityType, entityId, eventData } = req.body;
    const [event] = await db.insert(dobodyEvents).values({
      eventType, sourceModule, entityType: entityType || null, entityId: entityId || null, eventData: eventData || null,
    }).returning();
    res.status(201).json(event);
  } catch (error) { res.status(500).json({ message: "Event kaydedilemedi" }); }
});

// GET /api/dobody/confidence
router.get('/api/dobody/confidence', isAuthenticated, async (_req, res) => {
  try { res.json(await db.select().from(dobodyWorkflowConfidence).orderBy(dobodyWorkflowConfidence.workflowType)); }
  catch (error) { res.status(500).json({ message: "Güven skorları alınamadı" }); }
});

// Helper: Güven skoru güncelle
async function updateConfidence(workflowType: string, role: string, approved: boolean) {
  try {
    const existing = await db.select().from(dobodyWorkflowConfidence)
      .where(and(eq(dobodyWorkflowConfidence.workflowType, workflowType), eq(dobodyWorkflowConfidence.role, role)));

    if (existing.length > 0) {
      const r = existing[0];
      const newTotal = Number(r.totalProposals) + 1;
      const newApproved = approved ? Number(r.approvedCount) + 1 : Number(r.approvedCount);
      const newRejected = !approved ? Number(r.rejectedCount) + 1 : Number(r.rejectedCount);
      const newConf = newTotal > 0 ? Math.round((newApproved / newTotal) * 100) : 50;
      await db.update(dobodyWorkflowConfidence).set({
        totalProposals: newTotal, approvedCount: newApproved, rejectedCount: newRejected,
        confidenceScore: newConf.toString(), autoApplyEnabled: newConf >= 90 && newTotal >= 10,
        updatedAt: new Date(),
      }).where(eq(dobodyWorkflowConfidence.id, r.id));
    } else {
      await db.insert(dobodyWorkflowConfidence).values({
        workflowType, role, totalProposals: 1,
        approvedCount: approved ? 1 : 0, rejectedCount: approved ? 0 : 1,
        confidenceScore: approved ? '100' : '0', autoApplyEnabled: false,
      });
    }
  } catch (error) { console.error("Update confidence error:", error); }
}

// POST /api/dobody/check-sla — SLA kontrol tetikle (periodik)
router.post('/api/dobody/check-sla', isAuthenticated, async (_req, res) => {
  try {
    const { checkPendingActions } = await import("../lib/dobody-workflow-engine");
    const result = await checkPendingActions();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Check SLA error:", error);
    res.status(500).json({ message: "SLA kontrol başarısız" });
  }
});

export default router;
