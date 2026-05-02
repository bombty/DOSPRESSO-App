import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import { eq, max } from "drizzle-orm";
import { computeBranchHealthScores } from "../services/branch-health-scoring";
import { z } from "zod";
import {
  branches,
  users,
  equipment,
  equipmentFaults,
  checklistCompletions,
  messages,
  auditInstances,
  customerFeedback,
} from "@shared/schema";

const router = Router();

  // =============================================
  // CGO COMMAND CENTER API
  // =============================================
  router.get('/api/cgo/command-center', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'admin', 'cgo'].includes(user.role)) {
        return res.status(403).json({ message: 'Bu sayfaya erisim yetkiniz yok' });
      }

      const [
        allBranches,
        allUsers,
        allFaults,
        allAudits,
        allFeedback,
        allEquipment,
        allChecklistCompletions
      ] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(auditInstances).where(eq(auditInstances.status, 'completed')),
        db.select().from(customerFeedback),
        db.select().from(equipment),
        db.select().from(checklistCompletions)
      ]);

      const activeUsers = allUsers.filter(u => u.isActive);
      const totalBranches = allBranches.length;

      let branchScores: Array<{ id: number; name: string; score: number; staffCount: number; openFaults: number; totalFaults: number; auditCount: number; status: string }>;
      try {
        const healthReport = await computeBranchHealthScores({ rangeDays: 30 });
        branchScores = healthReport.branches.map(hb => {
          const branchFaults = allFaults.filter(f => f.branchId === hb.branchId);
          const openFaults = branchFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
          const branchAudits = allAudits.filter((a) => a.branchId === hb.branchId);
          const branchStaff = activeUsers.filter(u => u.branchId === hb.branchId);
          return {
            id: hb.branchId,
            name: hb.branchName,
            score: hb.totalScore,
            staffCount: branchStaff.length,
            openFaults: openFaults.length,
            totalFaults: branchFaults.length,
            auditCount: branchAudits.length,
            status: hb.level === 'green' ? 'healthy' : hb.level === 'yellow' ? 'warning' : 'critical'
          };
        });
      } catch {
        branchScores = allBranches.map(b => {
          const branchFaults = allFaults.filter(f => f.branchId === b.id);
          const openFaults = branchFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
          const branchAudits = allAudits.filter((a) => a.branchId === b.id);
          const branchStaff = activeUsers.filter(u => u.branchId === b.id);
          const faultPenalty = Math.min(openFaults.length * 5, 30);
          const auditBonus = branchAudits.length > 0 ? 10 : 0;
          const score = Math.max(30, Math.min(100, 75 - faultPenalty + auditBonus));
          return {
            id: b.id,
            name: b.name || 'Sube ' + b.id,
            score,
            staffCount: branchStaff.length,
            openFaults: openFaults.length,
            totalFaults: branchFaults.length,
            auditCount: branchAudits.length,
            status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
          };
        });
      }

      const avgScore = branchScores.length > 0
        ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length)
        : 0;

      const hqUsers = activeUsers.filter(u => !u.branchId);
      const branchUsers = activeUsers.filter(u => u.branchId);
      const activeFaults = allFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
      const criticalFaults = activeFaults.filter(f => f.priority === 'critical');
      const highFaults = activeFaults.filter(f => f.priority === 'high');
      const equipmentActive = allEquipment.filter((e) => e.isActive === true).length;
      const equipmentTotal = allEquipment.length;
      const uptimeRate = equipmentTotal > 0 ? Math.round((equipmentActive / equipmentTotal) * 100) : 100;

      const roleDistribution: Record<string, number> = {};
      activeUsers.forEach(u => {
        const role = u.role || 'unknown';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });

      const satinalmaStaff = activeUsers.filter(u => u.role === 'satinalma').length;
      const fabrikaStaff = activeUsers.filter(u => ['fabrika', 'fabrika_mudur', 'fabrika_sorumlu', 'fabrika_personel'].includes(u.role || '')).length;
      const ikStaff = activeUsers.filter(u => ['muhasebe_ik', 'ik'].includes(u.role || '')).length;
      const coachStaff = activeUsers.filter(u => u.role === 'coach').length;
      const marketingStaff = activeUsers.filter(u => ['marketing', 'pazarlama'].includes(u.role || '')).length;
      const trainerStaff = activeUsers.filter(u => u.role === 'trainer').length;
      const kaliteStaff = activeUsers.filter(u => u.role === 'kalite_kontrol').length;
      const faultResRate = allFaults.length > 0 ? Math.round((allFaults.filter(f => f.status === 'resolved' || f.status === 'closed').length / allFaults.length) * 100) : 100;
      const calcDeptScore = (staffCount: number, baseFactor: number) => {
        const staffScore = Math.min(staffCount * 10, 30);
        return Math.max(40, Math.min(100, baseFactor + staffScore));
      };
      const departmentHealth = [
        { name: 'Satin Alma', icon: 'ShoppingCart', route: '/satinalma', score: calcDeptScore(satinalmaStaff, 65) },
        { name: 'Fabrika', icon: 'Factory', route: '/fabrika/dashboard', score: Math.min(100, 60 + Math.round(uptimeRate * 0.3) + fabrikaStaff * 2) },
        { name: 'IK & Bordro', icon: 'Users', route: '/hq-dashboard/ik', score: calcDeptScore(ikStaff, 70) },
        { name: 'Coach', icon: 'ClipboardCheck', route: '/hq-dashboard/coach', score: Math.min(100, 55 + coachStaff * 8 + Math.round(avgScore * 0.2)) },
        { name: 'Marketing', icon: 'Megaphone', route: '/admin/icerik-studyosu', score: calcDeptScore(marketingStaff, 75) },
        { name: 'Egitim', icon: 'GraduationCap', route: '/akademi', score: calcDeptScore(trainerStaff, 68) },
        { name: 'Kalite Kontrol', icon: 'Shield', route: '/kalite-kontrol-dashboard', score: Math.min(100, 60 + kaliteStaff * 10 + Math.round(faultResRate * 0.2)) }
      ].map(d => ({ ...d, status: d.score >= 80 ? 'healthy' : d.score >= 60 ? 'warning' : 'critical' }));

      const alerts: any[] = [];
      if (criticalFaults.length > 0) {
        alerts.push({ message: criticalFaults.length + ' kritik/yüksek öncelikli arıza açık', severity: 'critical', type: 'fault' });
      }
      const understaffedBranches = branchScores.filter(b => b.staffCount < 3);
      if (understaffedBranches.length > 0) {
        alerts.push({ message: understaffedBranches.length + ' şubede yetersiz personel', severity: 'warning', type: 'hr' });
      }
      const lowScoreBranches = branchScores.filter(b => b.score < 60);
      if (lowScoreBranches.length > 0) {
        alerts.push({ message: lowScoreBranches.length + ' şube kritik performans seviyesinde', severity: 'critical', type: 'performance' });
      }
      if (uptimeRate < 90) {
        alerts.push({ message: 'Ekipman uptime %' + uptimeRate + ' - hedefin altında', severity: 'warning', type: 'equipment' });
      }

      res.json({
        growth: {
          totalBranches,
          averageBranchScore: avgScore,
          totalEmployees: activeUsers.length,
          hqEmployees: hqUsers.length,
          branchEmployees: branchUsers.length,
          activeFaults: activeFaults.length,
          criticalFaults: criticalFaults.length,
          equipmentUptime: uptimeRate,
          checklistCompletions: allChecklistCompletions.length,
          customerFeedbackCount: allFeedback.length,
          auditCount: allAudits.length
        },
        branchPerformance: branchScores.sort((a, b) => b.score - a.score),
        departmentHealth,
        alerts,
        operational: {
          totalFaults: allFaults.length,
          activeFaults: activeFaults.length,
          criticalFaults: criticalFaults.length,
          highFaults: highFaults.length,
          resolvedFaults: allFaults.filter(f => f.status === 'resolved' || f.status === 'closed').length,
          equipmentTotal,
          equipmentActive,
          uptimeRate,
          totalChecklists: allChecklistCompletions.length
        },
        workforce: {
          total: activeUsers.length,
          hq: hqUsers.length,
          branch: branchUsers.length,
          roleDistribution
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error: unknown) {
      handleApiError(res, error, "CGOCommandCenter");
    }
  });

  router.post('/api/cgo/ai-assistant', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'admin', 'cgo'].includes(user.role)) {
        return res.status(403).json({ message: 'Erisim yetkiniz yok' });
      }

      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: 'Soru gerekli' });
      }

      const [allBranches, allUsers, allFaults, allEquipment] = await Promise.all([
        db.select().from(branches),
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(equipmentFaults),
        db.select().from(equipment)
      ]);

      const activeFaults = allFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
      const branchNames = allBranches.map(b => b.name).join(', ');
      const roleGroups: Record<string, number> = {};
      allUsers.forEach(u => { roleGroups[u.role || 'diger'] = (roleGroups[u.role || 'diger'] || 0) + 1; });

      const systemContext = `Sen DOSPRESSO franchise zincirinin CGO (Chief Growth Officer) AI danismanisin. Buyume stratejileri, departman koordinasyonu ve operasyonel verimlilik konularinda uzmansin.
Guncel veriler:
- Toplam sube: ${allBranches.length} (${branchNames})
- Aktif personel: ${allUsers.length}
- Rol dagilimi: ${Object.entries(roleGroups).map(([r, c]) => r + ": " + c).join(", ")}
- Acik ariza: ${activeFaults.length} (toplam ${allFaults.length})
- Ekipman: ${allEquipment.length} adet
Buyume odakli, stratejik ve aksiyona yonelik cevaplar ver. Turkce yanit ver.`;

      try {
        const { chat } = await import('../services/ai-client');
        const completion = await chat({
          messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: question }
          ],
          max_tokens: 800,
          temperature: 0.7
        });
        let cgoAnswer = completion.choices[0]?.message?.content || 'Yanit alinamadi.';
        
        const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
        const questionLower = question.toLocaleLowerCase('tr-TR');
        if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
          cgoAnswer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
        }
        
        res.json({ answer: cgoAnswer });
      } catch (error: unknown) {
        const { respondIfAiBudgetError } = await import('../ai-budget-guard');
        if (respondIfAiBudgetError(error, res)) return;
        console.error('CGO AI Error:', error);
        res.json({ answer: `DOSPRESSO Ozet:
- ${allBranches.length} sube aktif
- ${allUsers.length} personel
- ${activeFaults.length} acik ariza
AI analizi su an kullanilamiyor. Detayli bilgi icin ilgili modulleri kontrol edin.` });
      }
    } catch (error: unknown) {
      console.error('Error in CGO AI assistant:', error);
      res.status(500).json({ message: 'AI yanit veremedi' });
    }
  });





export default router;
