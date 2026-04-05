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
      expiresAt: expiresAt ? new Date(expiresAt) : null, status: 'pending',
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
    const { message, recipient, deadline } = req.body || {};
    
    const [updated] = await db.update(dobodyProposals)
      .set({ status: 'approved', approvedBy: req.user.id, approvedAt: new Date() })
      .where(eq(dobodyProposals.id, parseInt(req.params.id))).returning();
    if (!updated) return res.status(404).json({ message: "Öneri bulunamadı" });

    // Öğrenme kaydı
    await db.insert(dobodyLearning).values({ workflowType: updated.workflowType, proposalId: updated.id, outcome: 'approved', confidenceDelta: '2.0' });
    await updateConfidence(updated.workflowType, updated.roleTarget, true);

    // Aksiyon yürüt (gerçek DB işlemi)
    let actionResult = null;
    try {
      const { executeProposalAction } = await import("../lib/dobody-action-executor");
      actionResult = await executeProposalAction(updated.id, req.user.id, message, recipient, deadline);
    } catch (e) { /* aksiyon hatası onayı engellemez */ }

    res.json({ ...updated, actionResult });
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

// POST /api/dobody/weekly-brief — Haftalık brief oluştur
router.post('/api/dobody/weekly-brief', isAuthenticated, async (_req, res) => {
  try {
    const { generateWeeklyBrief } = await import("../lib/dobody-workflow-engine");
    const result = await generateWeeklyBrief();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Weekly brief error:", error);
    res.status(500).json({ message: "Haftalık brief oluşturulamadı" });
  }
});

// POST /api/dobody/cleanup — Süresi dolmuş önerileri temizle
router.post('/api/dobody/cleanup', isAuthenticated, async (_req, res) => {
  try {
    const { cleanupExpiredProposals } = await import("../lib/dobody-workflow-engine");
    const result = await cleanupExpiredProposals();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ message: "Temizlik başarısız" });
  }
});

// POST /api/dobody/run-checks — Tüm periyodik kontrolleri çalıştır
router.post('/api/dobody/run-checks', isAuthenticated, async (_req, res) => {
  try {
    const { runPeriodicChecks } = await import("../lib/dobody-workflow-engine");
    const result = await runPeriodicChecks();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Periodic checks error:", error);
    res.status(500).json({ message: "Periyodik kontrol başarısız" });
  }
});

// POST /api/dobody/seed-scopes — Tüm roller için scope tanımla (ilk kurulum)
router.post('/api/dobody/seed-scopes', isAuthenticated, async (_req, res) => {
  try {
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(dobodyScopes);
    if (Number(existing[0]?.count || 0) > 0) {
      return res.json({ message: "Scope'lar zaten tanımlı", count: existing[0].count });
    }

    const scopes = [
      // HQ — tüm şubeleri görür
      { role: 'ceo', allowedModules: ['denetim','proje','vardiya','stok','ekipman','egitim','crm','muhasebe','fabrika','pdks'], blockedKeywords: [], branchScope: 'all', maxDetailLevel: 'full' },
      { role: 'cgo', allowedModules: ['denetim','proje','vardiya','stok','ekipman','egitim','crm','fabrika'], blockedKeywords: ['tckn','banka'], branchScope: 'all', maxDetailLevel: 'full' },
      { role: 'admin', allowedModules: ['denetim','proje','vardiya','stok','ekipman','egitim','crm','muhasebe','fabrika','pdks'], blockedKeywords: [], branchScope: 'all', maxDetailLevel: 'full' },
      { role: 'coach', allowedModules: ['denetim','egitim','vardiya','checklist','proje'], blockedKeywords: ['maliyet','fiyat','maas','tedarikci','tckn','banka'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'trainer', allowedModules: ['egitim','denetim','checklist'], blockedKeywords: ['maliyet','fiyat','maas','tedarikci','tckn','banka'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'muhasebe', allowedModules: ['muhasebe','pdks','vardiya','stok'], blockedKeywords: ['tckn'], branchScope: 'all', maxDetailLevel: 'full' },
      { role: 'muhasebe_ik', allowedModules: ['muhasebe','pdks','vardiya'], blockedKeywords: [], branchScope: 'all', maxDetailLevel: 'full' },
      { role: 'satinalma', allowedModules: ['stok','fabrika'], blockedKeywords: ['maas','tckn','banka'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'marketing', allowedModules: ['crm','proje'], blockedKeywords: ['maas','maliyet','tckn'], branchScope: 'all', maxDetailLevel: 'summary' },
      { role: 'kalite_kontrol', allowedModules: ['denetim','fabrika','checklist'], blockedKeywords: ['maas','tckn'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'destek', allowedModules: ['ekipman','crm'], blockedKeywords: ['maas','maliyet','tckn'], branchScope: 'all', maxDetailLevel: 'summary' },
      { role: 'yatirimci_hq', allowedModules: ['denetim','proje'], blockedKeywords: ['maas','tckn','banka','maliyet'], branchScope: 'all', maxDetailLevel: 'summary' },
      // Şube — sadece kendi şubesi
      { role: 'mudur', allowedModules: ['vardiya','checklist','stok','denetim','ekipman'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka'], branchScope: 'own', maxDetailLevel: 'detail' },
      { role: 'yatirimci_branch', allowedModules: ['denetim','vardiya'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka'], branchScope: 'own', maxDetailLevel: 'summary' },
      { role: 'supervisor', allowedModules: ['vardiya','checklist','stok','ekipman'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka','muhasebe'], branchScope: 'own', maxDetailLevel: 'detail' },
      { role: 'supervisor_buddy', allowedModules: ['vardiya','checklist'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka','muhasebe'], branchScope: 'own', maxDetailLevel: 'summary' },
      { role: 'barista', allowedModules: ['vardiya','checklist','egitim'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka','muhasebe','denetim'], branchScope: 'own', maxDetailLevel: 'summary' },
      { role: 'bar_buddy', allowedModules: ['vardiya','egitim'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka','muhasebe','denetim','stok'], branchScope: 'own', maxDetailLevel: 'summary' },
      { role: 'stajyer', allowedModules: ['egitim'], blockedKeywords: ['maas','maliyet','fiyat','tedarikci','tckn','banka','muhasebe','denetim','stok'], branchScope: 'own', maxDetailLevel: 'summary' },
      // Fabrika
      { role: 'fabrika_mudur', allowedModules: ['fabrika','stok','ekipman','vardiya'], blockedKeywords: ['maas','tckn','banka'], branchScope: 'none', maxDetailLevel: 'full' },
      { role: 'fabrika_personel', allowedModules: ['fabrika','vardiya'], blockedKeywords: ['maas','maliyet','fiyat','tckn','banka','muhasebe'], branchScope: 'none', maxDetailLevel: 'summary' },
      // Eksik roller eklendi (27 rol tam)
      { role: 'teknik', allowedModules: ['ekipman','crm'], blockedKeywords: ['maas','maliyet','tckn','banka'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'gida_muhendisi', allowedModules: ['fabrika','denetim','checklist'], blockedKeywords: ['maas','tckn','banka'], branchScope: 'all', maxDetailLevel: 'detail' },
      { role: 'fabrika', allowedModules: ['fabrika','stok'], blockedKeywords: ['maas','maliyet','tckn','banka'], branchScope: 'none', maxDetailLevel: 'summary' },
      { role: 'uretim_sefi', allowedModules: ['fabrika','stok','vardiya'], blockedKeywords: ['maas','tckn','banka','muhasebe'], branchScope: 'none', maxDetailLevel: 'detail' },
      { role: 'fabrika_operator', allowedModules: ['fabrika','vardiya'], blockedKeywords: ['maas','maliyet','fiyat','tckn','banka','muhasebe'], branchScope: 'none', maxDetailLevel: 'summary' },
      { role: 'fabrika_sorumlu', allowedModules: ['fabrika','vardiya','stok'], blockedKeywords: ['maas','maliyet','tckn','banka','muhasebe'], branchScope: 'none', maxDetailLevel: 'detail' },
    ];

    await db.insert(dobodyScopes).values(scopes as any);
    res.json({ success: true, count: scopes.length });
  } catch (error) {
    console.error("Seed scopes error:", error);
    res.status(500).json({ message: "Scope seed başarısız" });
  }
});

export default router;

// POST /api/dobody/proposals/bulk-approve — Toplu onay (aynı tipteki önerileri)
router.post('/api/dobody/proposals/bulk-approve', isAuthenticated, async (req, res) => {
  try {
    const { proposalIds, message, recipient, deadline } = req.body;
    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
      return res.status(400).json({ message: "Öneri ID listesi gerekli" });
    }

    const results = [];
    for (const id of proposalIds) {
      try {
        const [updated] = await db.update(dobodyProposals)
          .set({ status: 'approved', approvedBy: req.user.id, approvedAt: new Date() })
          .where(and(eq(dobodyProposals.id, id), eq(dobodyProposals.status, 'pending')))
          .returning();

        if (updated) {
          await db.insert(dobodyLearning).values({
            workflowType: updated.workflowType, proposalId: updated.id,
            outcome: 'approved', confidenceDelta: '2.0',
          });
          await updateConfidence(updated.workflowType, updated.roleTarget, true);

          // Aksiyon yürüt
          try {
            const { executeProposalAction } = await import("../lib/dobody-action-executor");
            const actionResult = await executeProposalAction(id, req.user.id, message, recipient, deadline);
            results.push({ id, success: true, actionResult });
          } catch { results.push({ id, success: true, actionResult: null }); }
        }
      } catch { results.push({ id, success: false }); }
    }

    res.json({ approved: results.filter(r => r.success).length, total: proposalIds.length, results });
  } catch (error) {
    console.error("Bulk approve error:", error);
    res.status(500).json({ message: "Toplu onay başarısız" });
  }
});

// GET /api/dobody/proposals/grouped — Gruplu önerileri getir
router.get('/api/dobody/proposals/grouped', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const proposals = await db.select({ proposal: dobodyProposals, branchName: branches.name })
      .from(dobodyProposals)
      .leftJoin(branches, eq(branches.id, dobodyProposals.branchId))
      .where(and(
        eq(dobodyProposals.status, 'pending'),
        or(eq(dobodyProposals.userId, user.id), eq(dobodyProposals.roleTarget, user.role)),
      ))
      .orderBy(desc(dobodyProposals.createdAt));

    // Workflow tipine göre grupla
    const groups: Record<string, { workflowType: string; title: string; count: number; priority: string; proposals: any[] }> = {};
    for (const p of proposals) {
      const key = p.proposal.workflowType;
      if (!groups[key]) {
        groups[key] = { workflowType: key, title: '', count: 0, priority: p.proposal.priority, proposals: [] };
      }
      groups[key].count++;
      groups[key].title = groups[key].count > 1
        ? `${groups[key].count} ${key === 'WF-5' ? 'şubede vardiya planı eksik' : key === 'WF-3' ? 'şubede stok kritik' : key === 'WF-1' ? 'denetim uyarısı' : 'öneri'}`
        : p.proposal.title;
      groups[key].proposals.push({ ...p.proposal, branchName: p.branchName });
    }

    res.json(Object.values(groups));
  } catch (error) {
    console.error("Grouped proposals error:", error);
    res.status(500).json({ message: "Gruplu öneriler alınamadı" });
  }
});

// GET /api/dobody/data-quality — Veri kalitesi raporu
router.get('/api/dobody/data-quality', isAuthenticated, async (_req, res) => {
  try {
    const { runDataQualityChecks } = await import("../lib/dobody-special-periods");
    const issues = await runDataQualityChecks();
    res.json({ timestamp: new Date().toISOString(), issueCount: issues.length, issues });
  } catch (error) {
    console.error("Data quality check error:", error);
    res.status(500).json({ message: "Veri kalitesi kontrolü başarısız" });
  }
});

// GET /api/dobody/special-periods — Aktif özel dönemler
router.get('/api/dobody/special-periods', isAuthenticated, async (_req, res) => {
  try {
    const { getActiveSpecialPeriods, getStockThresholdMultiplier, shouldSuppressShiftWarning } = await import("../lib/dobody-special-periods");
    const periods = getActiveSpecialPeriods();
    res.json({
      activePeriods: periods.map(p => ({ name: p.name, type: p.type })),
      suppressShiftWarnings: shouldSuppressShiftWarning(),
      stockMultiplier: getStockThresholdMultiplier(),
    });
  } catch (error) {
    res.status(500).json({ message: "Özel dönem kontrolü başarısız" });
  }
});

// POST /api/dobody/generate-message — AI ile mesaj üret
router.post('/api/dobody/generate-message', isAuthenticated, async (req, res) => {
  try {
    const { generateContextMessage } = await import("../lib/dobody-message-generator");
    const message = await generateContextMessage(req.body);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ message: "Mesaj üretilemedi" });
  }
});
