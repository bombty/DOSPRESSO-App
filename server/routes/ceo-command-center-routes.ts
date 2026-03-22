import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { handleApiError, parsePagination, wrapPaginatedResponse } from "./helpers";
import { eq, desc, and, count, sum, max } from "drizzle-orm";
import { gatherAIAssistantContext } from "../ai-assistant-context";
import { checkAndEnforcePolicy } from "../services/ai-policy-engine";
import { z } from "zod";
import {
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  checklistCompletions,
  notifications,
  messages,
  auditInstances,
  customerFeedback,
  leaveRequests,
  productComplaints,
  franchiseProjects,
} from "@shared/schema";

const router = Router();

  // ============================================
  // CEO COMMAND CENTER ENDPOINTS
  // ============================================
  
  // CEO Command Center - streamlined dashboard with real data
  router.get("/api/ceo/command-center", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'cgo', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }

      const [
        allBranches,
        allUsers,
        allFaults,
        allAudits,
        allEquipment,
        allChecklistCompletions,
        allProductComplaints,
        allLeaveRequests,
        allProjects
      ] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(auditInstances),
        db.select().from(equipment),
        db.select().from(checklistCompletions),
        db.select().from(productComplaints),
        db.select().from(leaveRequests),
        db.select().from(franchiseProjects)
      ]);

      // ======= ACIL UYARILAR =======
      const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];

      const openFaults = allFaults.filter((f) => f.status === 'open' || f.status === 'in_progress');
      const criticalFaults = openFaults.filter((f) => f.priority === 'critical');
      if (criticalFaults.length > 0) {
        urgentAlerts.push({ type: 'fault', severity: 'critical', message: `${criticalFaults.length} kritik ariza cozum bekliyor`, count: criticalFaults.length });
      }

      const brokenEquipment = allEquipment.filter((e) => e.status === 'broken' || e.status === 'maintenance');
      if (brokenEquipment.length > 0) {
        urgentAlerts.push({ type: 'equipment', severity: brokenEquipment.filter((e) => e.status === 'broken').length > 0 ? 'critical' : 'warning', message: `${brokenEquipment.length} ekipman calismıyor veya bakimda`, count: brokenEquipment.length });
      }

      const pendingLeaves = allLeaveRequests.filter((l) => l.status === 'pending');
      if (pendingLeaves.length >= 3) {
        urgentAlerts.push({ type: 'leave', severity: 'warning', message: `${pendingLeaves.length} izin talebi onay bekliyor`, count: pendingLeaves.length });
      }

      const openComplaints = allProductComplaints.filter((c) => c.status === 'open' || c.status === 'investigating');
      if (openComplaints.length > 0) {
        urgentAlerts.push({ type: 'complaint', severity: openComplaints.some((c) => c.severity === 'critical') ? 'critical' : 'warning', message: `${openComplaints.length} urun sikayeti acik`, count: openComplaints.length });
      }

      // ======= CGO / SUBE SAGLIK =======
      const branchScores = allBranches.map(b => {
        const branchFaults = allFaults.filter(f => f.branchId === b.id);
        const openBranchFaults = branchFaults.filter((f) => f.status === 'open' || f.status === 'in_progress');
        const completedAudits = allAudits.filter((a) => a.branchId === b.id && a.status === 'completed');
        const faultPenalty = Math.min(openBranchFaults.length * 8, 40);
        const auditBonus = completedAudits.length > 0 ? 10 : 0;
        return { id: b.id, name: b.name, score: Math.max(30, 100 - faultPenalty + auditBonus), openFaults: openBranchFaults.length };
      });
      const avgBranchScore = branchScores.length > 0 ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length) : 0;
      const healthyCount = branchScores.filter(b => b.score >= 80).length;
      const warningCount = branchScores.filter(b => b.score >= 60 && b.score < 80).length;
      const criticalCount = branchScores.filter(b => b.score < 60).length;
      const worstBranches = branchScores.sort((a, b) => a.score - b.score).slice(0, 2);

      const activeProjectsCount = allProjects.filter((p) => p.status === 'active' || p.status === 'in_progress').length;

      const cgoSummary = {
        label: 'Sube Sagligi',
        source: 'CGO',
        status: criticalCount > 0 ? 'critical' as const : warningCount > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: `${healthyCount}/${allBranches.length} saglikli`,
        details: [
          { key: 'Ortalama Skor', value: `${avgBranchScore}/100` },
          { key: 'Uyari', value: `${warningCount} sube` },
          { key: 'Kritik', value: `${criticalCount} sube` },
          { key: 'Acilis Projesi', value: `${activeProjectsCount} aktif` }
        ],
        alert: criticalCount > 0 ? `${worstBranches.map(b => b.name).join(', ')} acil dikkat gerektiriyor` : null
      };

      // ======= MUHASEBE/IK =======
      const activeEmployees = allUsers.filter(u => u.isActive);
      const branchStaff = activeEmployees.filter(u => ['staff', 'supervisor', 'branch_manager'].includes(u.role));
      const hqStaff = activeEmployees.filter(u => !['staff', 'supervisor', 'branch_manager', 'ceo'].includes(u.role));
      const approvedLeaves = allLeaveRequests.filter((l) => l.status === 'approved');

      const muhasebeIkSummary = {
        label: 'Personel Durumu',
        source: 'Muhasebe & IK',
        status: pendingLeaves.length >= 5 ? 'warning' as const : 'healthy' as const,
        mainMetric: `${activeEmployees.length} aktif personel`,
        details: [
          { key: 'HQ Kadro', value: `${hqStaff.length} kisi` },
          { key: 'Sube Personeli', value: `${branchStaff.length} kisi` },
          { key: 'Bekleyen Izin', value: `${pendingLeaves.length} talep` },
          { key: 'Onayli Izin', value: `${approvedLeaves.length} kisi` }
        ],
        alert: pendingLeaves.length >= 5 ? `${pendingLeaves.length} izin talebi onay bekliyor` : null
      };

      // ======= FABRIKA =======
      const activeEquipment = allEquipment.filter((e) => e.isActive === true);
      const uptimePercent = allEquipment.length > 0 ? Math.round((activeEquipment.length / allEquipment.length) * 100) : 100;

      const fabrikaSummary = {
        label: 'Fabrika & Ekipman',
        source: 'Fabrika Müdürü',
        status: brokenEquipment.filter((e) => e.status === 'broken').length > 0 ? 'critical' as const : brokenEquipment.length > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: `Ekipman uptime %${uptimePercent}`,
        details: [
          { key: 'Toplam Ekipman', value: `${allEquipment.length} adet` },
          { key: 'Aktif', value: `${activeEquipment.length} adet` },
          { key: 'Bakimda/Arızali', value: `${brokenEquipment.length} adet` },
          { key: 'Ürün Şikayeti', value: `${openComplaints.length} açık` }
        ],
        alert: brokenEquipment.filter((e) => e.status === 'broken').length > 0 ? `${brokenEquipment.filter((e) => e.status === 'broken').length} ekipman arizali` : null
      };

      // ======= COACH / DENETIM =======
      const completedAuditsAll = allAudits.filter((a) => a.status === 'completed');
      const recentAudits = completedAuditsAll.filter((a) => {
        const d = new Date(a.completedAt || a.createdAt);
        return d > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      });
      const avgAuditScore = recentAudits.length > 0 ? Math.round(recentAudits.reduce((s: number, a) => s + (a.totalScore || 0), 0) / recentAudits.length) : 0;

      const coachSummary = {
        label: 'Denetim Sonuclari',
        source: 'Coach',
        status: avgAuditScore >= 80 ? 'healthy' as const : avgAuditScore >= 60 ? 'warning' as const : recentAudits.length === 0 ? 'warning' as const : 'critical' as const,
        mainMetric: recentAudits.length > 0 ? `Ort. skor: ${avgAuditScore}/100` : 'Son 30 gun denetim yok',
        details: [
          { key: 'Toplam Denetim', value: `${completedAuditsAll.length}` },
          { key: 'Son 30 Gun', value: `${recentAudits.length} denetim` },
          { key: 'Ort. Puan', value: recentAudits.length > 0 ? `${avgAuditScore}/100` : '-' }
        ],
        alert: recentAudits.length === 0 ? 'Son 30 gunde hicbir sube denetlenmemis' : avgAuditScore < 70 ? 'Denetim skorlari dusuk, iyilestirme gerekli' : null
      };

      // ======= KALITE KONTROL =======
      const resolvedComplaints = allProductComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed');
      const resolutionRate = allProductComplaints.length > 0 ? Math.round((resolvedComplaints.length / allProductComplaints.length) * 100) : 100;

      const kaliteSummary = {
        label: 'Kalite & Sikayetler',
        source: 'Kalite Kontrol',
        status: openComplaints.some((c) => c.severity === 'critical') ? 'critical' as const : openComplaints.length > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: openComplaints.length === 0 ? 'Acik sikayet yok' : `${openComplaints.length} acik sikayet`,
        details: [
          { key: 'Toplam Sikayet', value: `${allProductComplaints.length}` },
          { key: 'Acik', value: `${openComplaints.length}` },
          { key: 'Cozum Orani', value: `%${resolutionRate}` }
        ],
        alert: openComplaints.some((c) => c.severity === 'critical') ? 'Kritik oncelikli sikayet var!' : null
      };

      // ======= EGITIM / TRAINER =======
      const totalCompletions = allChecklistCompletions.length;
      const completedCompletions = allChecklistCompletions.filter((c) => c.status === 'completed');
      const checklistRate = totalCompletions > 0 ? Math.round((completedCompletions.length / totalCompletions) * 100) : 0;

      const egitimSummary = {
        label: 'Egitim & Checklist',
        source: 'Trainer',
        status: checklistRate >= 80 ? 'healthy' as const : checklistRate >= 60 ? 'warning' as const : 'critical' as const,
        mainMetric: `Checklist tamamlama: %${checklistRate}`,
        details: [
          { key: 'Toplam Gorev', value: `${totalCompletions}` },
          { key: 'Tamamlanan', value: `${completedCompletions.length}` },
          { key: 'Tamamlama Orani', value: `%${checklistRate}` }
        ],
        alert: checklistRate < 60 ? 'Checklist tamamlama orani cok dusuk!' : null
      };

      // ======= EN DUSUK 3 YONETICI =======
      const hqRoleSet = new Set(['muhasebe_ik', 'muhasebe', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'fabrika_mudur', 'teknik', 'ik']);
      const roleDeptMap: Record<string, string> = {
        'muhasebe_ik': 'Muhasebe & IK', 'muhasebe': 'Muhasebe', 'satinalma': 'Satınalma',
        'coach': 'Coach', 'marketing': 'Pazarlama', 'trainer': 'Egitim',
        'kalite_kontrol': 'Kalite Kontrol', 'fabrika_mudur': 'Fabrika', 'teknik': 'Teknik', 'ik': 'IK'
      };

      const seenNames = new Set<string>();
      const hqManagers = allUsers.filter(u => {
        if (!hqRoleSet.has(u.role) || !u.isActive) return false;
        const name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
        if (!name || seenNames.has(name.toLocaleLowerCase('tr-TR'))) return false;
        seenNames.add(name.toLocaleLowerCase('tr-TR'));
        if (u.username && /^(test|e2e|api[-_])/i.test(u.username)) return false;
        if (/^(Test |E2E |API |Admin )/i.test(name)) return false;
        return true;
      });

      const allTasks = await db.select().from(tasks);
      const managersWithScores = hqManagers.map(m => {
        const userFaults = allFaults.filter((f) => f.assignedToId === m.id);
        const resolvedFaults = userFaults.filter((f) => f.status === 'resolved' || f.status === 'closed');
        const faultRate = userFaults.length > 0 ? Math.round((resolvedFaults.length / userFaults.length) * 100) : 80;
        const userTasks = allTasks.filter((t) => t.assignedToId === m.id);
        const completedUserTasks = userTasks.filter((t) => t.status === 'onaylandi' || t.status === 'completed');
        const taskRate = userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 80;
        const score = Math.round((faultRate * 0.5 + taskRate * 0.5));
        return {
          id: m.id,
          name: ((m.firstName || '') + ' ' + (m.lastName || '')).trim(),
          department: roleDeptMap[m.role] || m.role,
          score
        };
      }).sort((a, b) => a.score - b.score);

      const bottomManagers = managersWithScores.slice(0, 3);

      const runningEquipment = allEquipment.filter((e) => e.isActive);
      const uptimeRate = allEquipment.length > 0 ? Math.round((runningEquipment.length / allEquipment.length) * 100) : 100;

      res.json({
        urgentAlerts,
        departments: [cgoSummary, muhasebeIkSummary, fabrikaSummary, coachSummary, kaliteSummary, egitimSummary],
        bottomManagers,
        kpiSummary: {
          totalBranches: allBranches.length,
          totalEmployees: activeEmployees.length,
          activeFaults: openFaults.length,
          equipmentUptime: uptimeRate,
          branchAvgScore: avgBranchScore,
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error: unknown) {
      console.error("Error fetching command center data:", error);
      res.status(500).json({ message: "Veriler alinamadi" });
    }
  });


    // CEO AI Assistant
  router.post("/api/ceo/ai-assistant", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      // Only allow CEO and Admin roles
      if (!['ceo', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Bu ozellige erisim yetkiniz yok" });
      }

      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Soru gerekli" });
      }

      // Gather context data for AI
      const [branchesData, usersData, faultsData, feedbackData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(customerFeedback)
      ]);

      const contextSummary = 'DOSPRESSO Sirket Durumu:\n' +
        '- Toplam Sube: ' + branchesData.length + '\n' +
        '- Toplam Personel: ' + usersData.filter(u => u.isActive).length + '\n' +
        '- Aktif Arizalar: ' + faultsData.filter((f) => f.status === 'open' || f.status === 'in_progress').length + '\n' +
        '- Son 30 Gün Müşteri Geri Bildirimi: ' + feedbackData.length + '\n' +
        '- Ortalama Müşteri Puanı: ' + (feedbackData.length > 0 ? (feedbackData.reduce((sum, f) => sum + (f.overallRating || 0), 0) / feedbackData.length).toFixed(1) : 'Veri yok');

      const systemPrompt = 'Sen DOSPRESSO kahve zincirinin CEO\'su icin ozel bir AI danismanisin. CEO\'nun sorularina sirket verileri ve ic gorulere dayanarak cevap veriyorsun.\n\nGuncel Sirket Durumu:\n' + contextSummary + '\n\nYanitlarini su sekilde ver:\n1. Net ve ozlu ol\n2. Somut sayilar ve oneriler sun\n3. Riskleri ve firsatlari acikca belirt\n4. Aksiyon onerileri sun\n5. Turkce yaz';

      const ceoApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!ceoApiKey) {
        return res.status(500).json({ message: "OpenAI API key yapilandirilmamis" });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ceoApiKey
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const aiResponse = await response.json();
      let answer = aiResponse.choices[0]?.message?.content || 'Yanit alinamadi';
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
        answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }

      res.json({ answer });
    } catch (error: unknown) {
      handleApiError(res, error, "CEOAIAssistant");
    }
  });

  // Global AI Chat endpoint for all roles with role-based context + policy enforcement
  router.post("/api/ai/chat", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: "Soru gerekli" });
      }

      const policyResult = await checkAndEnforcePolicy(
        question,
        String(user.id),
        user.role || "barista",
        user.employeeType || null,
        user.branchId || null
      );

      if (policyResult.shouldBlock) {
        return res.json({ answer: policyResult.blockMessage });
      }

      const { systemPrompt } = await gatherAIAssistantContext(user);

      let policyAwarePrompt = systemPrompt;
      if (policyResult.deniedDomains.length > 0) {
        const deniedLabels = policyResult.deniedDomains.map(d => policyResult.policyResults.find(p => p.domainKey === d)?.domainLabel || d).join(", ");
        policyAwarePrompt += `\n\n=== VERI ERISIM KISITLAMALARI ===\nKESINLIKLE UYULMASI GEREKEN KURAL: Kullanicinin su veri alanlarina erisimi YOKTUR: ${deniedLabels}.\nBu konularda kesinlikle bilgi paylasma. Kibarca yetki olmadığını belirt ve erisebilecegi konulari oner.`;
      }
      if (policyResult.aggregationPrompt) {
        policyAwarePrompt += `\n\n=== AGREGASYON KURALLARI ===\nAsagidaki alanlarda YALNIZCA ozet/anonim/istatistiksel bilgi paylasabilirsin. KESINLIKLE bireysel isim, kimlik, mutlak tutar verme:\n${policyResult.aggregationPrompt}`;
      }
      if (policyResult.scopePrompt) {
        policyAwarePrompt += `\n\n=== KAPSAM KISITLAMALARI ===\n${policyResult.scopePrompt}`;
      }

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "OpenAI API key yapilandirilmamis" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: policyAwarePrompt },
            { role: "user", content: question }
          ],
          temperature: 0.7,
          max_tokens: 1200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error("OpenAI API error");
      }

      const aiResponse = await response.json();
      let answer = aiResponse.choices[0]?.message?.content || "Yanit alinamadi";
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
        answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }

      res.json({ answer });
    } catch (error: unknown) {
      handleApiError(res, error, "AIChat");
    }
  });
    // ============ NOTIFICATION ENDPOINTS ============
  
  // GET /api/notifications - Get user's notifications with optional filters
  // All users see their own notifications by default
  // Admin/owner can pass viewAll=true to see all system notifications
  router.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { type, branchId, viewAll } = req.query;
      const pag = parsePagination(req.query);
      
      const userRole = user.role as any;
      const isAdmin = userRole === 'admin' || userRole === 'ceo';
      const wantsAll = (viewAll === 'true' || viewAll === '1') && isAdmin;
      
      const conditions: any[] = [];
      
      if (wantsAll) {
        if (branchId && branchId !== 'all') {
          conditions.push(eq(notifications.branchId, parseInt(branchId as string)));
        }
      } else {
        conditions.push(eq(notifications.userId, user.id));
      }
      
      if (type) {
        conditions.push(eq(notifications.type, type as string));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const results = await db.select().from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(pag.limit)
        .offset(pag.offset);

      if (pag.wantsPagination) {
        const [totalResult] = await db.select({ count: count() }).from(notifications).where(whereClause);
        const total = totalResult?.count ?? 0;
        res.json(wrapPaginatedResponse(results, total, pag));
      } else {
        res.json(results);
      }
    } catch (error: unknown) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Bildirimler alınamadı" });
    }
  });

  // GET /api/notifications/unread-count - Get unread notification count
  router.get('/api/notifications/unread-count', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error: unknown) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Okunmamış bildirim sayısı alınamadı" });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  router.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id, user.id);
      if (!success) {
        return res.status(404).json({ message: "Bildirim bulunamadı" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Bildirim güncellenemedi" });
    }
  });

  // PATCH /api/notifications/mark-all-read - Mark all notifications as read
  router.patch('/api/notifications/mark-all-read', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Bildirimler güncellenemedi" });
    }
  });



export default router;
