import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, asc, and, sql, ne, count, sum } from "drizzle-orm";
import {
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  checklists,
  messages,
  guestComplaints,
  managementReports,
  dashboardWidgets,
  trainingModules,
  isHQRole,
} from "@shared/schema";

const router = Router();

  // ========================================
  // DASHBOARD WIDGET CONFIGURATION ROUTES
  // ========================================

  // GET /api/admin/widgets - List all widgets (admin only)
  // POST /api/admin/widgets - Create widget (admin only)
  // PATCH /api/admin/widgets/:id - Update widget (admin only)
  // DELETE /api/admin/widgets/:id - Delete widget (admin only)
  // GET /api/dashboard/widgets - Get widgets for current user's role
  router.get('/api/dashboard/widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const allWidgets = await db.select().from(dashboardWidgets)
        .where(eq(dashboardWidgets.isActive, true))
        .orderBy(asc(dashboardWidgets.sortOrder));
      const userWidgets = allWidgets.filter(w => {
        if (!w.roles || w.roles.length === 0) return true;
        return w.roles.includes(user.role);
      });
      res.json(userWidgets);
    } catch (error: unknown) {
      console.error('Error fetching user widgets:', error);
      res.status(500).json({ message: 'Widget listesi alınamadı' });
    }
  });

  // GET /api/admin/module-visibility - Get all module visibility settings
  // PATCH /api/admin/module-visibility/:moduleId - Update where a module appears
  // GET /api/dashboard/widget-data/:widgetId - Get data for a specific widget
  router.get('/api/dashboard/widget-data/:widgetId', isAuthenticated, async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      const [widget] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, widgetId));
      if (!widget) {
        return res.status(404).json({ message: 'Widget bulunamadı' });
      }
      let data: any = { value: 0, label: widget.title };
      switch (widget.dataSource) {
        case 'faults_count': {
          const [result] = await db.select({ count: count() }).from(equipmentFaults)
            .where(and(ne(equipmentFaults.status, 'cozuldu')));
          data = { value: result?.count || 0, label: 'Açık Arızalar' };
          break;
        }
        case 'tasks_pending': {
          const [result] = await db.select({ count: count() }).from(tasks)
            .where(eq(tasks.status, 'pending'));
          data = { value: result?.count || 0, label: 'Bekleyen Görevler' };
          break;
        }
        case 'checklists_today': {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const [total] = await db.select({ count: count() }).from(checklists);
          data = { value: total?.count || 0, label: 'Checklist Sayısı', subtitle: 'Toplam' };
          break;
        }
        case 'branch_health': {
          const [result] = await db.select({ count: count() }).from(branches);
          data = { value: result?.count || 0, label: 'Şube Sayısı' };
          break;
        }
        case 'training_progress': {
          const [result] = await db.select({ count: count() }).from(trainingModules)
            .where(eq(trainingModules.isActive, true));
          data = { value: result?.count || 0, label: 'Aktif Eğitim Modülü' };
          break;
        }
        case 'staff_count': {
          const [result] = await db.select({ count: count() }).from(users)
            .where(eq(users.isActive, true));
          data = { value: result?.count || 0, label: 'Aktif Personel' };
          break;
        }
        case 'equipment_alerts': {
          const [result] = await db.select({ count: count() }).from(equipment)
            .where(eq(equipment.status, 'needs_repair'));
          data = { value: result?.count || 0, label: 'Bakım Gerektiren Ekipman' };
          break;
        }
        case 'complaints_open': {
          const [result] = await db.select({ count: count() }).from(guestComplaints)
            .where(and(ne(guestComplaints.status, 'resolved'), ne(guestComplaints.status, 'closed')));
          data = { value: result?.count || 0, label: 'Açık Şikayetler' };
          break;
        }
        default:
          data = { value: 0, label: 'Bilinmeyen veri kaynağı' };
      }
      res.json(data);
    } catch (error: unknown) {
      console.error('Error fetching widget data:', error);
      res.status(500).json({ message: 'Widget verisi alınamadı' });
    }
  });

  // HQ Personnel Statistics API
  router.get('/api/hq-personnel-stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }

      const allBranches = await db.select().from(branches);
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));

      const hqRolesList = ['admin', 'ceo', 'cgo', 'marketing', 'muhasebe_ik', 'satinalma', 'coach', 'trainer', 'kalite_kontrol'];
      const factoryRoles = ['fabrika_mudur', 'fabrika_operator', 'fabrika_depocu', 'fabrika_kalite'];

      const branchStats = allBranches
        .filter(b => b.name !== 'Merkez Ofis (HQ)' && b.name !== 'Fabrika')
        .map(branch => {
          const branchUsers = allUsers.filter(u => u.branchId === branch.id);
          const roleBreakdown: Record<string, number> = {};
          branchUsers.forEach(u => {
            if (u.role) { roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1; }
          });
          return {
            branchId: branch.id,
            branchName: branch.name,
            totalEmployees: branchUsers.length,
            roleBreakdown,
            fullTime: branchUsers.filter(u => u.employmentType === 'full_time').length,
            partTime: branchUsers.filter(u => u.employmentType === 'part_time').length,
          };
        });

      const hqUsers = allUsers.filter(u => hqRolesList.includes(u.role || '')); 
      const factoryUsers = allUsers.filter(u => factoryRoles.includes(u.role || '')); 

      const totalRoleBreakdown: Record<string, number> = {};
      allUsers.forEach(u => { if (u.role) { totalRoleBreakdown[u.role] = (totalRoleBreakdown[u.role] || 0) + 1; } });

      res.json({
        totalEmployees: allUsers.length,
        hqEmployees: hqUsers.length,
        factoryEmployees: factoryUsers.length,
        branchEmployees: allUsers.length - hqUsers.length - factoryUsers.length,
        totalRoleBreakdown,
        employmentTypeBreakdown: {
          fullTime: allUsers.filter(u => u.employmentType === 'full_time').length,
          partTime: allUsers.filter(u => u.employmentType === 'part_time').length,
          other: allUsers.filter(u => !u.employmentType || (u.employmentType !== 'full_time' && u.employmentType !== 'part_time')).length,
        },
        branchStats,
      });
    } catch (error: unknown) {
      console.error('Error fetching HQ personnel stats:', error);
      res.status(500).json({ message: 'Personel istatistikleri alınamadı' });
    }
  });


  // Management Reports API
  router.get('/api/management-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const { reportType, year, branchId } = req.query;
      let query = db.select().from(managementReports);
      const conditions: any[] = [];
      if (reportType) conditions.push(eq(managementReports.reportType, reportType as string));
      if (year) conditions.push(sql`${managementReports.period} LIKE ${year + '%'}`);
      if (branchId && branchId !== 'all') conditions.push(eq(managementReports.branchId, parseInt(branchId as string)));
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      const reports = await (query as any).orderBy(desc(managementReports.createdAt));
      res.json(reports);
    } catch (error: unknown) {
      console.error('Error fetching management reports:', error);
      res.status(500).json({ message: 'Raporlar alınamadı' });
    }
  });

  router.post('/api/management-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const reportData = { ...req.body, createdBy: user.id };
      if (reportData.revenue && reportData.expenses) {
        reportData.netProfit = (parseFloat(reportData.revenue) - parseFloat(reportData.expenses)).toString();
      }
      const [report] = await db.insert(managementReports).values(reportData).returning();
      res.json(report);
    } catch (error: unknown) {
      console.error('Error creating management report:', error);
      res.status(500).json({ message: 'Rapor oluşturulamadı' });
    }
  });


  router.patch("/api/management-reports/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== "admin" && user.role !== "ceo" && user.role !== "muhasebe_ik")) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      const reportId = parseInt(req.params.id);
      const { status } = req.body;
      if (!["draft", "pending", "approved"].includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum" });
      }
      const updateData: any = { status, updatedAt: new Date() };
      if (status === "approved") {
        updateData.approvedBy = user.id;
        updateData.approvedAt = new Date();
      }
      const [updated] = await db.update(managementReports).set(updateData).where(eq(managementReports.id, reportId)).returning();
      if (!updated) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating report status:", error);
      res.status(500).json({ message: "Rapor durumu güncellenemedi" });
    }
  });
  router.get('/api/management-reports/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const { year } = req.query;
      const targetYear = year || new Date().getFullYear().toString();
      const reports = await db.select().from(managementReports).where(sql`${managementReports.period} LIKE ${targetYear + '%'}`);
      
      const totalRevenue = reports.reduce((sum, r) => sum + (parseFloat(r.revenue as string) || 0), 0);
      const totalExpenses = reports.reduce((sum, r) => sum + (parseFloat(r.expenses as string) || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const avgTicket = reports.filter(r => r.averageTicket).reduce((sum, r) => sum + (parseFloat(r.averageTicket as string) || 0), 0) / (reports.filter(r => r.averageTicket).length || 1);
      
      const branchRevenue: Record<string, number> = {};
      reports.forEach(r => {
        if (r.branchId) {
          branchRevenue[r.branchId.toString()] = (branchRevenue[r.branchId.toString()] || 0) + (parseFloat(r.revenue as string) || 0);
        }
      });
      
      const monthlyData = [];
      for (let m = 1; m <= 12; m++) {
        const monthStr = `${targetYear}-${String(m).padStart(2, '0')}`;
        const monthReports = reports.filter(r => r.period === monthStr);
        monthlyData.push({
          month: m,
          revenue: monthReports.reduce((s, r) => s + (parseFloat(r.revenue as string) || 0), 0),
          expenses: monthReports.reduce((s, r) => s + (parseFloat(r.expenses as string) || 0), 0),
          profit: monthReports.reduce((s, r) => s + (parseFloat(r.revenue as string) || 0) - (parseFloat(r.expenses as string) || 0), 0),
        });
      }
      
      res.json({ totalRevenue, totalExpenses, totalProfit, avgTicket, branchRevenue, monthlyData, reportCount: reports.length });
    } catch (error: unknown) {
      console.error('Error fetching report summary:', error);
      res.status(500).json({ message: 'Rapor özeti alınamadı' });
    }
  });

  // AI-Powered Management Report Analysis
  router.post('/api/management-reports/ai-analysis', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo' && !isHQRole(user.role))) {
        return res.status(403).json({ message: 'Yetkisiz erisim' });
      }
      const { year } = req.body;
      const targetYear = year || new Date().getFullYear().toString();
      const reports = await db.select().from(managementReports).where(sql`${managementReports.period} LIKE ${targetYear + '%'}`);
      
      if (reports.length === 0) {
        return res.json({ analysis: 'Henuz analiz edilecek veri yok.' });
      }

      const totalRevenue = reports.reduce((s: number, r) => s + (parseFloat(r.revenue) || 0), 0);
      const totalExpenses = reports.reduce((s: number, r) => s + (parseFloat(r.expenses) || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

      const allBranches = await db.select().from(branches);
      const branchNames: Record<string, string> = {};
      allBranches.forEach((b) => { branchNames[b.id.toString()] = b.name; });

      const branchData: Record<string, { revenue: number; expenses: number }> = {};
      reports.forEach((r) => {
        const bid = r.branchId?.toString() || 'genel';
        if (!branchData[bid]) branchData[bid] = { revenue: 0, expenses: 0 };
        branchData[bid].revenue += parseFloat(r.revenue) || 0;
        branchData[bid].expenses += parseFloat(r.expenses) || 0;
      });

      const branchSummary = Object.entries(branchData).map(([bid, data]) => ({
        name: branchNames[bid] || 'Genel',
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        margin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue * 100).toFixed(1) : '0',
      })).sort((a, b) => b.profit - a.profit);

      const dataLines = branchSummary.map(b => '- ' + b.name + ': Gelir ' + b.revenue.toLocaleString('tr-TR') + ' TL, Gider ' + b.expenses.toLocaleString('tr-TR') + ' TL, Kar ' + b.profit.toLocaleString('tr-TR') + ' TL (%' + b.margin + ')').join('\n');
      const dataContext = 'DOSPRESSO ' + targetYear + ' Mali Verileri:\n- Toplam Gelir: ' + totalRevenue.toLocaleString('tr-TR') + ' TL\n- Toplam Gider: ' + totalExpenses.toLocaleString('tr-TR') + ' TL\n- Net Kar: ' + totalProfit.toLocaleString('tr-TR') + ' TL\n- Kar Marji: %' + margin + '\n- Rapor Sayisi: ' + reports.length + '\n\nSube Bazli Performans:\n' + dataLines;

      try {
        const { chat } = await import('../services/ai-client');
        const completion = await chat({
          messages: [
            { role: 'system', content: 'Sen DOSPRESSO kahve zinciri icin mali analiz uzmanisin. Turkce yanit ver.' },
            { role: 'user', content: 'Asagidaki mali verileri analiz et:\n' + dataContext }
          ],
          max_tokens: 1000,
        });
        res.json({ analysis: completion.choices[0]?.message?.content || 'Analiz yapilamadi.' });
      } catch (error: unknown) {
        console.error('AI analysis error:', error);
        const fallback = 'Mali Özet (' + targetYear + '):\n\nToplam Gelir: ' + totalRevenue.toLocaleString('tr-TR') + ' TL\nToplam Gider: ' + totalExpenses.toLocaleString('tr-TR') + ' TL\nNet Kar: ' + totalProfit.toLocaleString('tr-TR') + ' TL\nKar Marjı: %' + margin + '\nRapor Sayısı: ' + reports.length + '\n\n(AI analizi şu an kullanılamıyor.)';
        res.json({ analysis: fallback });
      }
    } catch (error: unknown) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({ message: 'AI analizi yapilamadi' });
    }
  });



export default router;
