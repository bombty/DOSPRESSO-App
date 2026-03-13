// HQ Dashboard Routes - API endpoints for department dashboards
import { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { branches, users, equipmentFaults, checklistCompletions, customerFeedback, leaveRequests, overtimeRequests, monthlyPayrolls, inventory, purchaseOrders, suppliers, productComplaints, productionBatches, equipment, auditInstances, tasks, guestComplaints, franchiseProjects, factoryProducts, haccpControlPoints, haccpRecords, hygieneAudits, supplierCertifications, foodSafetyTrainings, foodSafetyDocuments, insertHaccpControlPointSchema, insertHaccpRecordSchema, insertHygieneAuditSchema, insertSupplierCertificationSchema, insertFoodSafetyTrainingSchema, insertFoodSafetyDocumentSchema } from "@shared/schema";
import { eq, and, inArray, sql, or, gte, count } from "drizzle-orm";
import { computeBranchHealthScores } from "./services/branch-health-scoring";
import { cache, generateCacheKey } from "./cache";

const DASHBOARD_CACHE_TTL = 60_000;

const HQ_ROLES_LIST = ['ceo', 'cgo', 'admin', 'satinalma', 'kalite_kontrol', 'gida_muhendisi', 'muhasebe', 'muhasebe_ik', 'coach', 'trainer', 'teknik', 'fabrika', 'fabrika_mudur', 'fabrika_sorumlu', 'destek', 'operasyon', 'marketing', 'ik'];

function buildFallbackCommandCenter(roleName: string) {
  return {
    urgentAlerts: [],
    departments: [{
      label: `${roleName} Genel Durum`,
      source: roleName,
      status: 'healthy' as const,
      mainMetric: 'Veriler yukleniyor',
      details: [],
      alert: null,
    }],
    bottomManagers: [],
    kpiSummary: undefined,
    lastUpdated: new Date().toISOString(),
  };
}

export function registerHQDashboardRoutes(app: Express, isAuthenticated: any) {

  // ======= GENERALIZED HQ COMMAND CENTER =======
  app.get("/api/hq/command-center", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!HQ_ROLES_LIST.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }

      const role = user.role;
      const cacheKey = generateCacheKey('cmd-center', role);
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        cache.set(cacheKey, data, DASHBOARD_CACHE_TTL);
        return originalJson(data);
      };

      if (['ceo', 'cgo', 'admin'].includes(role)) {
        return await buildCeoCommandCenter(res);
      }
      if (role === 'satinalma') {
        return await buildSatinalmaCommandCenter(res);
      }
      if (role === 'kalite_kontrol') {
        return await buildKaliteKontrolCommandCenter(res);
      }
      if (['muhasebe', 'muhasebe_ik'].includes(role)) {
        return await buildMuhasebeCommandCenter(res);
      }
      if (role === 'coach') {
        return await buildCoachCommandCenter(res);
      }
      if (role === 'trainer') {
        return await buildTrainerCommandCenter(res);
      }
      if (role === 'teknik') {
        return await buildTeknikCommandCenter(res);
      }
      if (['fabrika', 'fabrika_mudur'].includes(role)) {
        return await buildFabrikaCommandCenter(res);
      }
      if (role === 'destek') {
        return await buildDestekCommandCenter(res);
      }
      if (role === 'gida_muhendisi') {
        return await buildGidaMuhendisiCommandCenter(res);
      }

      return await buildGenericCommandCenter(res, role);
    } catch (error: any) {
      console.error("Error in HQ command center:", error);
      res.status(500).json({ message: "Veriler alinamadi", error: error.message });
    }
  });

  async function buildCeoCommandCenter(res: any) {
    try {
    const [
      allBranches, allUsers, allFaults, allAudits, allEquipment,
      allChecklistCompletions, allProductComplaints, allLeaveReqs, allProjects
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

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
    const criticalFaults = openFaults.filter((f: any) => f.priority === 'critical');
    if (criticalFaults.length > 0) {
      urgentAlerts.push({ type: 'fault', severity: 'critical', message: `${criticalFaults.length} kritik ariza cozum bekliyor`, count: criticalFaults.length });
    }
    const brokenEquipment = allEquipment.filter((e: any) => e.status === 'broken' || e.status === 'maintenance');
    if (brokenEquipment.length > 0) {
      urgentAlerts.push({ type: 'equipment', severity: brokenEquipment.filter((e: any) => e.status === 'broken').length > 0 ? 'critical' : 'warning', message: `${brokenEquipment.length} ekipman calismıyor veya bakimda`, count: brokenEquipment.length });
    }
    const pendingLeaves = allLeaveReqs.filter((l: any) => l.status === 'pending');
    if (pendingLeaves.length >= 3) {
      urgentAlerts.push({ type: 'leave', severity: 'warning', message: `${pendingLeaves.length} izin talebi onay bekliyor`, count: pendingLeaves.length });
    }
    const openComplaints = allProductComplaints.filter((c: any) => c.status === 'open' || c.status === 'investigating');
    if (openComplaints.length > 0) {
      urgentAlerts.push({ type: 'complaint', severity: openComplaints.some((c: any) => c.severity === 'critical') ? 'critical' : 'warning', message: `${openComplaints.length} ürün şikayeti açık`, count: openComplaints.length });
    }

    const branchScores = allBranches.map(b => {
      const branchFaults = allFaults.filter(f => f.branchId === b.id);
      const openBF = branchFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
      const completedAudits = allAudits.filter((a: any) => a.branchId === b.id && a.status === 'completed');
      const faultPenalty = Math.min(openBF.length * 8, 40);
      const auditBonus = completedAudits.length > 0 ? 10 : 0;
      return { id: b.id, name: b.name, score: Math.max(30, 100 - faultPenalty + auditBonus), openFaults: openBF.length };
    });
    const avgBranchScore = branchScores.length > 0 ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length) : 0;
    const healthyCount = branchScores.filter(b => b.score >= 80).length;
    const warningCount = branchScores.filter(b => b.score >= 60 && b.score < 80).length;
    const criticalCount = branchScores.filter(b => b.score < 60).length;
    const worstBranches = [...branchScores].sort((a, b) => a.score - b.score).slice(0, 2);

    const activeEmployees = allUsers.filter(u => u.isActive);

    const cgoSummary = {
      label: 'Sube Sagligi',
      source: 'CGO',
      status: avgBranchScore >= 80 ? 'healthy' as const : avgBranchScore >= 60 ? 'warning' as const : 'critical' as const,
      mainMetric: `Ort. Skor: ${avgBranchScore}/100 (${allBranches.length} sube)`,
      details: [
        { key: 'Saglıklı', value: `${healthyCount} sube` },
        { key: 'Uyarı', value: `${warningCount} sube` },
        { key: 'Kritik', value: `${criticalCount} sube` },
        { key: 'En Dusuk', value: worstBranches.map(b => `${b.name} (${b.score})`).join(', ') || 'N/A' }
      ],
      alert: criticalCount > 0 ? `${criticalCount} subede kritik durum!` : null
    };

    const muhasebeIkSummary = {
      label: 'IK & Izin',
      source: 'Muhasebe & IK',
      status: pendingLeaves.length > 5 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${activeEmployees.length} aktif personel`,
      details: [
        { key: 'Bekleyen Izin', value: `${pendingLeaves.length}` },
        { key: 'Aktif Personel', value: `${activeEmployees.length}` },
      ],
      alert: pendingLeaves.length > 5 ? `${pendingLeaves.length} izin talebi bekliyor` : null
    };

    const fabrikaSummary = {
      label: 'Fabrika',
      source: 'Fabrika Müdürü',
      status: 'healthy' as const,
      mainMetric: `Ekipman durumu normal`,
      details: [
        { key: 'Toplam Ekipman', value: `${allEquipment.length}` },
        { key: 'Arızalı', value: `${brokenEquipment.length}` },
      ],
      alert: brokenEquipment.length > 3 ? 'Birden fazla ekipman arızalı!' : null
    };

    const totalCompletions = allChecklistCompletions.length;
    const completedCompletions = allChecklistCompletions.filter((c: any) => c.status === 'completed');
    const checklistRate = totalCompletions > 0 ? Math.round((completedCompletions.length / totalCompletions) * 100) : 0;

    const coachSummary = {
      label: 'Sube Performans',
      source: 'Coach',
      status: checklistRate >= 80 ? 'healthy' as const : checklistRate >= 60 ? 'warning' as const : 'critical' as const,
      mainMetric: `Checklist tamamlama: %${checklistRate}`,
      details: [
        { key: 'Toplam', value: `${totalCompletions}` },
        { key: 'Tamamlanan', value: `${completedCompletions.length}` },
      ],
      alert: checklistRate < 60 ? 'Checklist tamamlama orani dusuk!' : null
    };

    const resolutionRate = openComplaints.length > 0 && allProductComplaints.length > 0
      ? Math.round(((allProductComplaints.length - openComplaints.length) / allProductComplaints.length) * 100)
      : 100;

    const kaliteSummary = {
      label: 'Kalite & Sikayet',
      source: 'Kalite Kontrol',
      status: openComplaints.length > 5 ? 'critical' as const : openComplaints.length > 0 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${openComplaints.length} acik sikayet`,
      details: [
        { key: 'Toplam Sikayet', value: `${allProductComplaints.length}` },
        { key: 'Acik', value: `${openComplaints.length}` },
        { key: 'Cozum Orani', value: `%${resolutionRate}` }
      ],
      alert: openComplaints.some((c: any) => c.severity === 'critical') ? 'Kritik oncelikli sikayet var!' : null
    };

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

    const runningEquipment = allEquipment.filter((e: any) => e.isActive);
    const uptimeRate = allEquipment.length > 0 ? Math.round((runningEquipment.length / allEquipment.length) * 100) : 100;

    const allTasks = await db.select().from(tasks);
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
    const managersWithScores = hqManagers.map(m => {
      const userFaults = allFaults.filter((f: any) => f.assignedToId === m.id);
      const resolvedFaults = userFaults.filter((f: any) => f.status === 'resolved' || f.status === 'closed');
      const faultRate = userFaults.length > 0 ? Math.round((resolvedFaults.length / userFaults.length) * 100) : 80;
      const userTasks = allTasks.filter((t: any) => t.assignedToId === m.id);
      const completedUserTasks = userTasks.filter((t: any) => t.status === 'onaylandi' || t.status === 'completed');
      const taskRate = userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 80;
      const score = Math.round((faultRate * 0.5 + taskRate * 0.5));
      return { id: m.id, name: ((m.firstName || '') + ' ' + (m.lastName || '')).trim(), department: roleDeptMap[m.role] || m.role, score };
    }).sort((a, b) => a.score - b.score);
    const bottomManagers = managersWithScores.slice(0, 3);

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
    } catch (error) {
      console.error("Error building CEO command center:", error);
      res.json(buildFallbackCommandCenter("CEO"));
    }
  }

  async function buildSatinalmaCommandCenter(res: any) {
    try {
    const [allInventory, allPurchaseOrders, allSuppliers] = await Promise.all([
      db.select().from(inventory).where(eq(inventory.isActive, true)),
      db.select().from(purchaseOrders),
      db.select().from(suppliers)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const criticalStock = allInventory.filter((i: any) => parseFloat(i.currentStock || '0') < parseFloat(i.minimumStock || '0'));
    if (criticalStock.length > 0) {
      urgentAlerts.push({ type: 'stock', severity: 'critical', message: `${criticalStock.length} ürün kritik stok seviyesinde`, count: criticalStock.length });
    }
    const pendingOrders = allPurchaseOrders.filter((o: any) => o.status === 'taslak' || o.status === 'beklemede' || o.status === 'pending');
    if (pendingOrders.length > 0) {
      urgentAlerts.push({ type: 'order', severity: 'warning', message: `${pendingOrders.length} siparis onay bekliyor`, count: pendingOrders.length });
    }

    const activeSuppliers = allSuppliers.filter((s: any) => s.isActive !== false);
    const supplierSummary = {
      label: 'Tedarikci Durumu',
      source: 'Satınalma',
      status: 'healthy' as const,
      mainMetric: `${activeSuppliers.length} aktif tedarikci`,
      details: [
        { key: 'Toplam Tedarikci', value: `${allSuppliers.length}` },
        { key: 'Aktif', value: `${activeSuppliers.length}` },
      ],
      alert: null
    };

    const stockSummary = {
      label: 'Stok Durumu',
      source: 'Satınalma',
      status: criticalStock.length > 5 ? 'critical' as const : criticalStock.length > 0 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${criticalStock.length} kritik ürün`,
      details: [
        { key: 'Toplam Ürün', value: `${allInventory.length}` },
        { key: 'Kritik Stok', value: `${criticalStock.length}` },
        { key: 'Bekleyen Siparis', value: `${pendingOrders.length}` },
      ],
      alert: criticalStock.length > 0 ? `${criticalStock.length} ürün minimum stok altında!` : null
    };

    res.json({
      urgentAlerts,
      departments: [supplierSummary, stockSummary],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: allSuppliers.length,
        totalEmployees: pendingOrders.length,
        activeFaults: criticalStock.length,
        equipmentUptime: 0,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building satinalma command center:", error);
      res.json(buildFallbackCommandCenter("Satınalma"));
    }
  }

  async function buildKaliteKontrolCommandCenter(res: any) {
    try {
    const [allComplaints, allBatches, allFeedback] = await Promise.all([
      db.select().from(productComplaints),
      db.select().from(productionBatches),
      db.select().from(customerFeedback)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const openComplaints = allComplaints.filter((c: any) => c.status === 'open' || c.status === 'investigating');
    const highSeverity = openComplaints.filter((c: any) => c.severity === 'critical' || c.severity === 'high');
    if (highSeverity.length > 0) {
      urgentAlerts.push({ type: 'complaint', severity: 'critical', message: `${highSeverity.length} yuksek oncelikli sikayet acik`, count: highSeverity.length });
    }
    const lowQualityBatches = allBatches.filter((b: any) => b.qualityScore !== null && b.qualityScore < 70);
    if (lowQualityBatches.length > 0) {
      urgentAlerts.push({ type: 'quality', severity: 'warning', message: `${lowQualityBatches.length} parti dusuk kalite skoru`, count: lowQualityBatches.length });
    }

    const resolved = allComplaints.filter((c: any) => c.status === 'resolved' || c.status === 'closed');
    const complaintSummary = {
      label: 'Sikayet Durumu',
      source: 'Kalite Kontrol',
      status: openComplaints.length > 5 ? 'critical' as const : openComplaints.length > 0 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${openComplaints.length} acik sikayet`,
      details: [
        { key: 'Toplam', value: `${allComplaints.length}` },
        { key: 'Cozulmus', value: `${resolved.length}` },
        { key: 'Acik', value: `${openComplaints.length}` },
      ],
      alert: highSeverity.length > 0 ? 'Kritik sikayet var!' : null
    };

    const avgRating = allFeedback.length > 0
      ? (allFeedback.reduce((sum: number, f: any) => sum + (f.overallRating || 0), 0) / allFeedback.length).toFixed(1)
      : '0';

    const qualityMetrics = {
      label: 'Kalite Metrikleri',
      source: 'Kalite Kontrol',
      status: 'healthy' as const,
      mainMetric: `Müşteri puanı: ${avgRating}/5`,
      details: [
        { key: 'Toplam Geri Bildirim', value: `${allFeedback.length}` },
        { key: 'Ort. Puan', value: `${avgRating}/5` },
        { key: 'Dusuk Kalite Parti', value: `${lowQualityBatches.length}` },
      ],
      alert: null
    };

    res.json({
      urgentAlerts,
      departments: [complaintSummary, qualityMetrics],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: allComplaints.length,
        totalEmployees: resolved.length,
        activeFaults: openComplaints.length,
        equipmentUptime: 0,
        branchAvgScore: parseFloat(avgRating),
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building kalite kontrol command center:", error);
      res.json(buildFallbackCommandCenter("Kalite Kontrol"));
    }
  }

  async function buildMuhasebeCommandCenter(res: any) {
    try {
    const [allUsers, allLeaveReqs, allOvertimeReqs] = await Promise.all([
      db.select().from(users),
      db.select().from(leaveRequests),
      db.select().from(overtimeRequests)
    ]);

    const activeEmployees = allUsers.filter(u => u.isActive);
    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const pendingLeaves = allLeaveReqs.filter((l: any) => l.status === 'pending' || l.status === 'beklemede');
    if (pendingLeaves.length > 0) {
      urgentAlerts.push({ type: 'leave', severity: pendingLeaves.length > 5 ? 'critical' : 'warning', message: `${pendingLeaves.length} izin talebi onay bekliyor`, count: pendingLeaves.length });
    }
    const pendingOvertimes = allOvertimeReqs.filter((o: any) => o.status === 'pending' || o.status === 'beklemede');
    if (pendingOvertimes.length > 0) {
      urgentAlerts.push({ type: 'overtime', severity: 'warning', message: `${pendingOvertimes.length} mesai talebi bekliyor`, count: pendingOvertimes.length });
    }

    const personnelSummary = {
      label: 'Personel Durumu',
      source: 'Muhasebe & IK',
      status: 'healthy' as const,
      mainMetric: `${activeEmployees.length} aktif personel`,
      details: [
        { key: 'Toplam Kayitli', value: `${allUsers.length}` },
        { key: 'Aktif', value: `${activeEmployees.length}` },
        { key: 'Pasif', value: `${allUsers.length - activeEmployees.length}` },
      ],
      alert: null
    };

    const leaveSummary = {
      label: 'Izin & Mesai',
      source: 'Muhasebe & IK',
      status: pendingLeaves.length > 5 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${pendingLeaves.length} bekleyen izin`,
      details: [
        { key: 'Bekleyen Izin', value: `${pendingLeaves.length}` },
        { key: 'Bekleyen Mesai', value: `${pendingOvertimes.length}` },
        { key: 'Toplam Izin Talebi', value: `${allLeaveReqs.length}` },
      ],
      alert: pendingLeaves.length > 10 ? 'Cok fazla izin talebi bekliyor!' : null
    };

    res.json({
      urgentAlerts,
      departments: [personnelSummary, leaveSummary],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: activeEmployees.length,
        totalEmployees: pendingLeaves.length,
        activeFaults: pendingOvertimes.length,
        equipmentUptime: 0,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building muhasebe command center:", error);
      res.json(buildFallbackCommandCenter("Muhasebe"));
    }
  }

  async function buildCoachCommandCenter(res: any) {
    try {
    const [allBranches, allAudits, allChecklistComp, allFaults] = await Promise.all([
      db.select().from(branches),
      db.select().from(auditInstances),
      db.select().from(checklistCompletions),
      db.select().from(equipmentFaults)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];

    const branchScores = allBranches.map(b => {
      const branchFaults = allFaults.filter(f => f.branchId === b.id);
      const openBF = branchFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
      const completedAudits = allAudits.filter((a: any) => a.branchId === b.id && a.status === 'completed');
      const faultPenalty = Math.min(openBF.length * 8, 40);
      const auditBonus = completedAudits.length > 0 ? 10 : 0;
      return { id: b.id, name: b.name, score: Math.max(30, 100 - faultPenalty + auditBonus), openFaults: openBF.length };
    });
    const lowScoreBranches = branchScores.filter(b => b.score < 60);
    if (lowScoreBranches.length > 0) {
      urgentAlerts.push({ type: 'branch', severity: 'critical', message: `${lowScoreBranches.length} sube dusuk performansta`, count: lowScoreBranches.length });
    }

    const avgScore = branchScores.length > 0 ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length) : 0;
    const totalCompletions = allChecklistComp.length;
    const completed = allChecklistComp.filter((c: any) => c.status === 'completed');
    const completionRate = totalCompletions > 0 ? Math.round((completed.length / totalCompletions) * 100) : 0;

    if (completionRate < 70) {
      urgentAlerts.push({ type: 'checklist', severity: 'warning', message: `Checklist tamamlama orani %${completionRate}`, count: completionRate });
    }

    const branchPerf = {
      label: 'Sube Performansi',
      source: 'Coach',
      status: avgScore >= 80 ? 'healthy' as const : avgScore >= 60 ? 'warning' as const : 'critical' as const,
      mainMetric: `Ort. Skor: ${avgScore}/100`,
      details: [
        { key: 'Toplam Sube', value: `${allBranches.length}` },
        { key: 'Saglıklı (80+)', value: `${branchScores.filter(b => b.score >= 80).length}` },
        { key: 'Kritik (<60)', value: `${lowScoreBranches.length}` },
      ],
      alert: lowScoreBranches.length > 0 ? `${lowScoreBranches.map(b => b.name).slice(0, 2).join(', ')} dikkat gerektiriyor` : null
    };

    const trainingGaps = {
      label: 'Egitim & Checklist',
      source: 'Coach',
      status: completionRate >= 80 ? 'healthy' as const : completionRate >= 60 ? 'warning' as const : 'critical' as const,
      mainMetric: `Tamamlama orani: %${completionRate}`,
      details: [
        { key: 'Toplam Checklist', value: `${totalCompletions}` },
        { key: 'Tamamlanan', value: `${completed.length}` },
      ],
      alert: completionRate < 60 ? 'Checklist tamamlama orani cok dusuk!' : null
    };

    res.json({
      urgentAlerts,
      departments: [branchPerf, trainingGaps],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: allBranches.length,
        totalEmployees: 0,
        activeFaults: lowScoreBranches.length,
        equipmentUptime: completionRate,
        branchAvgScore: avgScore,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building coach command center:", error);
      res.json(buildFallbackCommandCenter("Coach"));
    }
  }

  async function buildTrainerCommandCenter(res: any) {
    try {
    const [allUsers, allChecklistComp] = await Promise.all([
      db.select().from(users).where(eq(users.isActive, true)),
      db.select().from(checklistCompletions)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const totalCompletions = allChecklistComp.length;
    const completed = allChecklistComp.filter((c: any) => c.status === 'completed');
    const completionRate = totalCompletions > 0 ? Math.round((completed.length / totalCompletions) * 100) : 0;

    if (completionRate < 70) {
      urgentAlerts.push({ type: 'training', severity: 'warning', message: `Egitim tamamlama orani %${completionRate}`, count: completionRate });
    }

    const trainingOverview = {
      label: 'Egitim Durumu',
      source: 'Trainer',
      status: completionRate >= 80 ? 'healthy' as const : completionRate >= 60 ? 'warning' as const : 'critical' as const,
      mainMetric: `Tamamlama orani: %${completionRate}`,
      details: [
        { key: 'Toplam Gorev', value: `${totalCompletions}` },
        { key: 'Tamamlanan', value: `${completed.length}` },
        { key: 'Aktif Ogrenci', value: `${allUsers.length}` },
      ],
      alert: completionRate < 60 ? 'Egitim tamamlama orani cok dusuk!' : null
    };

    res.json({
      urgentAlerts,
      departments: [trainingOverview],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: totalCompletions,
        totalEmployees: completed.length,
        activeFaults: 0,
        equipmentUptime: completionRate,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building trainer command center:", error);
      res.json(buildFallbackCommandCenter("Trainer"));
    }
  }

  async function buildTeknikCommandCenter(res: any) {
    try {
    const [allEquip, allFaults] = await Promise.all([
      db.select().from(equipment),
      db.select().from(equipmentFaults)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
    const criticalFaults = openFaults.filter((f: any) => f.priority === 'critical');
    if (criticalFaults.length > 0) {
      urgentAlerts.push({ type: 'fault', severity: 'critical', message: `${criticalFaults.length} kritik ariza cozum bekliyor`, count: criticalFaults.length });
    }
    const brokenEquipment = allEquip.filter((e: any) => e.status === 'broken');
    if (brokenEquipment.length > 0) {
      urgentAlerts.push({ type: 'equipment', severity: 'critical', message: `${brokenEquipment.length} ekipman calismıyor`, count: brokenEquipment.length });
    }

    const faultOverview = {
      label: 'Arıza Durumu',
      source: 'Teknik',
      status: criticalFaults.length > 0 ? 'critical' as const : openFaults.length > 5 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${openFaults.length} acik ariza`,
      details: [
        { key: 'Toplam Ariza', value: `${allFaults.length}` },
        { key: 'Acik', value: `${openFaults.length}` },
        { key: 'Kritik', value: `${criticalFaults.length}` },
        { key: 'Cozulmus', value: `${allFaults.filter((f: any) => f.status === 'resolved' || f.status === 'closed').length}` },
      ],
      alert: criticalFaults.length > 0 ? `${criticalFaults.length} kritik ariza acil mudahale bekliyor!` : null
    };

    const activeEquip = allEquip.filter((e: any) => e.isActive);
    const uptimeRate = allEquip.length > 0 ? Math.round((activeEquip.length / allEquip.length) * 100) : 100;
    const equipmentHealth = {
      label: 'Ekipman Sagligi',
      source: 'Teknik',
      status: uptimeRate >= 90 ? 'healthy' as const : uptimeRate >= 70 ? 'warning' as const : 'critical' as const,
      mainMetric: `Uptime: %${uptimeRate}`,
      details: [
        { key: 'Toplam Ekipman', value: `${allEquip.length}` },
        { key: 'Aktif', value: `${activeEquip.length}` },
        { key: 'Arızalı', value: `${brokenEquipment.length}` },
      ],
      alert: brokenEquipment.length > 3 ? 'Birden fazla ekipman arızalı!' : null
    };

    res.json({
      urgentAlerts,
      departments: [faultOverview, equipmentHealth],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: allEquip.length,
        totalEmployees: openFaults.length,
        activeFaults: criticalFaults.length,
        equipmentUptime: uptimeRate,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building teknik command center:", error);
      res.json(buildFallbackCommandCenter("Teknik"));
    }
  }

  async function buildFabrikaCommandCenter(res: any) {
    try {
    const [allBatches, allEquip, allFaults] = await Promise.all([
      db.select().from(productionBatches),
      db.select().from(equipment),
      db.select().from(equipmentFaults)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const activeBatches = allBatches.filter((b: any) => b.status === 'in_progress' || b.status === 'planned');
    const rejectedBatches = allBatches.filter((b: any) => b.status === 'rejected');
    if (rejectedBatches.length > 0) {
      urgentAlerts.push({ type: 'production', severity: 'critical', message: `${rejectedBatches.length} parti reddedildi`, count: rejectedBatches.length });
    }
    const brokenEquipment = allEquip.filter((e: any) => e.status === 'broken' || e.status === 'maintenance');
    if (brokenEquipment.length > 0) {
      urgentAlerts.push({ type: 'equipment', severity: 'warning', message: `${brokenEquipment.length} ekipman bakimda/arızalı`, count: brokenEquipment.length });
    }

    const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
    const productionSummary = {
      label: 'Üretim Durumu',
      source: 'Fabrika',
      status: rejectedBatches.length > 0 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${activeBatches.length} aktif parti`,
      details: [
        { key: 'Toplam Parti', value: `${allBatches.length}` },
        { key: 'Aktif', value: `${activeBatches.length}` },
        { key: 'Tamamlanan', value: `${allBatches.filter((b: any) => b.status === 'completed' || b.status === 'approved').length}` },
        { key: 'Reddedilen', value: `${rejectedBatches.length}` },
      ],
      alert: rejectedBatches.length > 0 ? 'Reddedilen parti var!' : null
    };

    const qualityMetrics = {
      label: 'Kalite Metrikleri',
      source: 'Fabrika',
      status: 'healthy' as const,
      mainMetric: `Ariza: ${openFaults.length}`,
      details: [
        { key: 'Toplam Ekipman', value: `${allEquip.length}` },
        { key: 'Acik Ariza', value: `${openFaults.length}` },
        { key: 'Arızalı Ekipman', value: `${brokenEquipment.length}` },
      ],
      alert: null
    };

    res.json({
      urgentAlerts,
      departments: [productionSummary, qualityMetrics],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: activeBatches.length,
        totalEmployees: allBatches.length,
        activeFaults: openFaults.length,
        equipmentUptime: 0,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building fabrika command center:", error);
      res.json(buildFallbackCommandCenter("Fabrika"));
    }
  }

  async function buildDestekCommandCenter(res: any) {
    try {
    const [allFaults] = await Promise.all([
      db.select().from(equipmentFaults)
    ]);

    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
    const criticalFaults = openFaults.filter((f: any) => f.priority === 'critical');
    if (criticalFaults.length > 0) {
      urgentAlerts.push({ type: 'fault', severity: 'critical', message: `${criticalFaults.length} kritik destek talebi`, count: criticalFaults.length });
    }
    if (openFaults.length > 10) {
      urgentAlerts.push({ type: 'fault', severity: 'warning', message: `${openFaults.length} cozulmemis ariza/talep var`, count: openFaults.length });
    }

    const resolved = allFaults.filter((f: any) => f.status === 'resolved' || f.status === 'closed');
    const ticketStatus = {
      label: 'Destek Talepleri',
      source: 'Destek',
      status: criticalFaults.length > 0 ? 'critical' as const : openFaults.length > 5 ? 'warning' as const : 'healthy' as const,
      mainMetric: `${openFaults.length} acik talep`,
      details: [
        { key: 'Toplam', value: `${allFaults.length}` },
        { key: 'Acik', value: `${openFaults.length}` },
        { key: 'Cozulmus', value: `${resolved.length}` },
        { key: 'Kritik', value: `${criticalFaults.length}` },
      ],
      alert: criticalFaults.length > 0 ? 'Kritik destek talebi var!' : null
    };

    res.json({
      urgentAlerts,
      departments: [ticketStatus],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: openFaults.length,
        totalEmployees: resolved.length,
        activeFaults: criticalFaults.length,
        equipmentUptime: 0,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building destek command center:", error);
      res.json(buildFallbackCommandCenter("Destek"));
    }
  }

  async function buildGenericCommandCenter(res: any, role: string) {
    try {
    const [allBranches, allUsers, allFaults] = await Promise.all([
      db.select().from(branches),
      db.select().from(users).where(eq(users.isActive, true)),
      db.select().from(equipmentFaults)
    ]);

    const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
    const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];
    if (openFaults.length > 5) {
      urgentAlerts.push({ type: 'fault', severity: 'warning', message: `${openFaults.length} acik ariza var`, count: openFaults.length });
    }

    const overview = {
      label: 'Genel Durum',
      source: role,
      status: 'healthy' as const,
      mainMetric: `${allBranches.length} sube, ${allUsers.length} personel`,
      details: [
        { key: 'Toplam Sube', value: `${allBranches.length}` },
        { key: 'Aktif Personel', value: `${allUsers.length}` },
        { key: 'Acik Ariza', value: `${openFaults.length}` },
      ],
      alert: null
    };

    res.json({
      urgentAlerts,
      departments: [overview],
      bottomManagers: [],
      kpiSummary: {
        totalBranches: allBranches.length,
        totalEmployees: allUsers.length,
        activeFaults: openFaults.length,
        equipmentUptime: 0,
        branchAvgScore: 0,
      },
      lastUpdated: new Date().toISOString()
    });
    } catch (error) {
      console.error("Error building generic command center:", error);
      res.json(buildFallbackCommandCenter(role));
    }
  }
  
  // HQ Dashboard - CGO overview
  app.get("/api/hq-dashboard/cgo", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      const [branchesData, usersData, faultsData, checklistsData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(equipmentFaults),
        db.select().from(checklistCompletions)
      ]);
      
      const activeFaults = faultsData.filter((f: any) => f.status === 'open' || f.status === 'in_progress').length;
      const totalEmployees = usersData.length;
      const totalBranches = branchesData.length;
      
      res.json({
        metrics: [
          { title: "Toplam Şube", value: totalBranches, status: "healthy", trend: "stable" },
          { title: "Aktif Personel", value: totalEmployees, status: "healthy", trend: "up" },
          { title: "Açık Arızalar", value: activeFaults, status: activeFaults > 10 ? "warning" : "healthy", trend: "stable" },
          { title: "Checklist Tamamlanma", value: "92%", status: "healthy", trend: "up" }
        ],
        departmentHealth: [
          { name: "Satınalma", score: 88, status: "healthy" },
          { name: "Fabrika", score: 82, status: "healthy" },
          { name: "IK", score: 91, status: "healthy" },
          { name: "Coach", score: 79, status: "warning" },
          { name: "Marketing", score: 94, status: "healthy" },
          { name: "Trainer", score: 85, status: "healthy" },
          { name: "Kalite", score: 90, status: "healthy" }
        ],
        alerts: [
          { message: "3 subede SLA ihlali riski", severity: "warning" },
          { message: "Haftalik egitim hedefi %15 altinda", severity: "critical" }
        ]
      });
    } catch (error: any) {
      console.error("Error in CGO dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Satinalma
  app.get("/api/hq-dashboard/satinalma", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'satinalma'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      res.json({
        metrics: [
          { title: "Aktif Tedarikçi", value: 45, status: "healthy", trend: "stable" },
          { title: "Bekleyen Sipariş", value: 23, status: "warning", trend: "up" },
          { title: "Ortalama Teslimat", value: "2.3 gün", status: "healthy", trend: "down" },
          { title: "Fiyat Uyarısı", value: 5, status: "critical", trend: "up" }
        ],
        supplierScores: [
          { name: "Sut Tedarikcisi A", score: 92, onTimeDelivery: 98, priceStability: 85 },
          { name: "Kahve Tedarikcisi B", score: 88, onTimeDelivery: 90, priceStability: 95 },
          { name: "Ambalaj Tedarikcisi C", score: 78, onTimeDelivery: 82, priceStability: 75 }
        ],
        alerts: [
          { message: "Kahve fiyatlarinda %8 artis bekleniyor", severity: "warning" },
          { message: "Sut stoku kritik seviyede - 3 gun", severity: "critical" }
        ]
      });
    } catch (error: any) {
      console.error("Error in Satinalma dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Fabrika
  app.get("/api/hq-dashboard/fabrika", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'fabrika', 'fabrika_mudur'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      res.json({
        metrics: [
          { title: "Günlük Üretim", value: "2,450 kg", status: "healthy", trend: "up" },
          { title: "Verimlilik", value: "94.2%", status: "healthy", trend: "stable" },
          { title: "Fire Oranı", value: "1.8%", status: "healthy", trend: "down" },
          { title: "Makine Uptime", value: "98.5%", status: "healthy", trend: "stable" }
        ],
        productionTrend: [
          { day: "Pzt", actual: 2300, target: 2400 },
          { day: "Sal", actual: 2450, target: 2400 },
          { day: "Car", actual: 2380, target: 2400 },
          { day: "Per", actual: 2520, target: 2400 },
          { day: "Cum", actual: 2450, target: 2400 }
        ],
        alerts: [
          { message: "Kavurma makinesi bakim zamani yaklasiyort", severity: "warning" }
        ]
      });
    } catch (error: any) {
      console.error("Error in Fabrika dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Muhasebe İK (Mahmut) - Focus: Işıklar, Merkez Ofis, Fabrika
  app.get("/api/hq-dashboard/muhasebe-ik", isAuthenticated, async (req: any, res) => {
    try {
      const focusBranchIds = [5, 23, 24]; // Işıklar, Merkez Ofis (HQ), Fabrika

      const focusBranchesData = await db.select().from(branches).where(inArray(branches.id, focusBranchIds));

      const branchEmployees = await db.select().from(users).where(
        and(
          inArray(users.branchId, focusBranchIds),
          eq(users.isActive, true)
        )
      );

      const allEmployees = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true));

      const pendingLeaves = await db.select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, 'beklemede'));

      const focusLeaves = await db.select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .where(
          and(
            eq(leaveRequests.status, 'beklemede'),
            inArray(users.branchId, focusBranchIds)
          )
        );

      const pendingOvertimes = await db.select({ count: sql<number>`count(*)` })
        .from(overtimeRequests)
        .where(eq(overtimeRequests.status, 'beklemede'));

      let payrollData = { count: 0, totalAmount: 0 };
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const payrollResult = await db.select({ 
          count: sql<number>`count(*)`, 
          totalAmount: sql<number>`COALESCE(sum(${monthlyPayrolls.netSalary}), 0)` 
        })
          .from(monthlyPayrolls)
          .where(
            and(
              eq(monthlyPayrolls.month, currentMonth),
              eq(monthlyPayrolls.year, currentYear)
            )
          );
        payrollData = {
          count: Number(payrollResult[0]?.count || 0),
          totalAmount: Number(payrollResult[0]?.totalAmount || 0),
        };
      } catch (e) {
        // payroll table might not have data
      }

      const branchStats = focusBranchesData.map(branch => {
        const employees = branchEmployees.filter(e => e.branchId === branch.id);
        return {
          branchId: branch.id,
          branchName: branch.name,
          employeeCount: employees.length,
          roles: employees.reduce((acc: Record<string, number>, e) => {
            acc[e.role || 'unknown'] = (acc[e.role || 'unknown'] || 0) + 1;
            return acc;
          }, {})
        };
      });

      res.json({
        focusBranches: branchStats,
        totalFocusEmployees: branchEmployees.length,
        totalAllEmployees: Number(allEmployees[0]?.count || 0),
        pendingLeaves: Number(pendingLeaves[0]?.count || 0),
        focusPendingLeaves: Number(focusLeaves[0]?.count || 0),
        pendingOvertimes: Number(pendingOvertimes[0]?.count || 0),
        payrollCount: payrollData.count,
        payrollTotal: payrollData.totalAmount,
      });
    } catch (error: any) {
      console.error("Muhasebe İK dashboard error:", error);
      res.json({
        focusBranches: [],
        totalFocusEmployees: 0,
        totalAllEmployees: 0,
        pendingLeaves: 0,
        focusPendingLeaves: 0,
        pendingOvertimes: 0,
        payrollCount: 0,
        payrollTotal: 0,
      });
    }
  });

  // HQ Dashboard - IK
  app.get("/api/hq-dashboard/ik", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'muhasebe_ik', 'muhasebe'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      const usersData = await db.select().from(users);
      const activeUsers = usersData.filter(u => u.isActive).length;
      
      res.json({
        metrics: [
          { title: "Toplam Personel", value: activeUsers, status: "healthy", trend: "stable" },
          { title: "Yıllık Turnover", value: "12%", status: "warning", trend: "up" },
          { title: "Ortalama Deneyim", value: "2.3 yıl", status: "healthy", trend: "up" },
          { title: "Eğitim Tamamlama", value: "85%", status: "healthy", trend: "up" }
        ],
        departmentDistribution: [
          { department: "Sube", count: Math.floor(activeUsers * 0.7) },
          { department: "Fabrika", count: Math.floor(activeUsers * 0.15) },
          { department: "HQ", count: Math.floor(activeUsers * 0.15) }
        ],
        alerts: [
          { message: "5 personelin sozlesmesi bu ay bitiyor", severity: "warning" },
          { message: "3 subede personel eksikligi", severity: "critical" }
        ]
      });
    } catch (error: any) {
      console.error("Error in IK dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Coach
  app.get("/api/hq-dashboard/coach", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'coach'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }

      const coachCacheKey = generateCacheKey('coach-dashboard', user.role);
      const cachedCoach = cache.get<any>(coachCacheKey);
      if (cachedCoach) {
        return res.json(cachedCoach);
      }

      const healthReport = await computeBranchHealthScores({ rangeDays: 30 });
      const branchEntries = healthReport.branches;

      const totalBranches = branchEntries.length;
      const avgScore = totalBranches > 0
        ? Math.round(branchEntries.reduce((sum, b) => sum + b.totalScore, 0) / totalBranches)
        : 0;

      const needsVisit = branchEntries.filter(b => b.totalScore < 60).length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const [checklistStats] = await db
        .select({
          total: count(),
          completed: sql<number>`COUNT(*) FILTER (WHERE ${checklistCompletions.status} = 'completed')`,
        })
        .from(checklistCompletions)
        .where(gte(checklistCompletions.completedAt, thirtyDaysAgo));

      const complianceRate = checklistStats.total > 0
        ? Math.round((checklistStats.completed / checklistStats.total) * 100)
        : 0;

      const totalRiskFlags = branchEntries.reduce((sum, b) => sum + b.riskFlags.length, 0);

      const avgTrend = avgScore >= 75 ? "up" : avgScore >= 50 ? "stable" : "down";

      const sortedBranches = [...branchEntries].sort((a, b) => a.totalScore - b.totalScore);

      const branchScores = sortedBranches.map(b => ({
        id: b.branchId,
        name: b.branchName,
        score: Math.round(b.totalScore),
        level: b.level,
        trend: b.trend.direction === 'flat' ? 'stable' : b.trend.direction,
        delta: b.trend.delta,
        status: b.totalScore >= 80 ? 'healthy' : b.totalScore >= 60 ? 'warning' : 'critical',
        riskFlags: b.riskFlags,
      }));

      const alerts: { message: string; severity: string; branchId?: number }[] = [];

      for (const b of sortedBranches) {
        if (b.totalScore < 60) {
          alerts.push({
            message: `${b.branchName} — skor ${Math.round(b.totalScore)}/100, acil ziyaret gerekli`,
            severity: 'critical',
            branchId: b.branchId,
          });
        }
        if (b.trend.direction === 'down' && b.trend.delta <= -5) {
          alerts.push({
            message: `${b.branchName} — son dönemde ${Math.abs(b.trend.delta)} puan düşüş`,
            severity: 'warning',
            branchId: b.branchId,
          });
        }
        for (const flag of b.riskFlags.filter(f => f.severity === 'high')) {
          alerts.push({
            message: `${b.branchName} — ${flag.label}`,
            severity: 'warning',
            branchId: b.branchId,
          });
        }
      }

      if (alerts.length === 0) {
        alerts.push({ message: "Tüm şubeler normal aralıkta", severity: "healthy" });
      }

      const coachResult = {
        metrics: [
          { title: "Ortalama Şube Puanı", value: `${avgScore}/100`, status: avgScore >= 75 ? 'healthy' : avgScore >= 50 ? 'warning' : 'critical', trend: avgTrend },
          { title: "Ziyaret Bekleyen", value: needsVisit, status: needsVisit === 0 ? 'healthy' : needsVisit <= 3 ? 'warning' : 'critical', trend: "stable" },
          { title: "Uyumluluk Oranı", value: `${complianceRate}%`, status: complianceRate >= 80 ? 'healthy' : complianceRate >= 60 ? 'warning' : 'critical', trend: complianceRate >= 80 ? "up" : "stable" },
          { title: "İyileştirme Önerisi", value: totalRiskFlags, status: totalRiskFlags <= 5 ? 'healthy' : totalRiskFlags <= 15 ? 'warning' : 'critical', trend: "stable" },
        ],
        branchScores,
        alerts,
        summary: {
          totalBranches,
          green: branchEntries.filter(b => b.level === 'green').length,
          yellow: branchEntries.filter(b => b.level === 'yellow').length,
          red: branchEntries.filter(b => b.level === 'red').length,
          generatedAt: healthReport.generatedAt,
        },
      };
      cache.set(coachCacheKey, coachResult, DASHBOARD_CACHE_TTL);
      res.json(coachResult);
    } catch (error: any) {
      console.error("Error in Coach dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Marketing
  app.get("/api/hq-dashboard/marketing", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'marketing'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      res.json({
        metrics: [
          { title: "Aktif Kampanya", value: 4, status: "healthy", trend: "stable" },
          { title: "Sosyal Medya Erişimi", value: "125K", status: "healthy", trend: "up" },
          { title: "Kampanya ROI", value: "3.2x", status: "healthy", trend: "up" },
          { title: "Müşteri Memnuniyeti", value: "4.5/5", status: "healthy", trend: "stable" }
        ],
        campaignPerformance: [
          { name: "Yaz Kampanyasi", reach: 45000, conversion: 12.5, roi: 3.8 },
          { name: "Sadakat Programi", reach: 32000, conversion: 25.0, roi: 4.2 },
          { name: "Yeni Ürün Lansmanı", reach: 28000, conversion: 8.3, roi: 2.1 }
        ],
        alerts: [
          { message: "Instagram etkilesimi dusuyor", severity: "warning" }
        ]
      });
    } catch (error: any) {
      console.error("Error in Marketing dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Trainer
  app.get("/api/hq-dashboard/trainer", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'trainer'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      const usersData = await db.select().from(users).where(eq(users.isActive, true));
      
      res.json({
        metrics: [
          { title: "Eğitim Tamamlama", value: "78%", status: "warning", trend: "up" },
          { title: "Ortalama Quiz Puanı", value: "82%", status: "healthy", trend: "stable" },
          { title: "Sertifika Bekleyen", value: 12, status: "warning", trend: "stable" },
          { title: "Aktif Öğrenci", value: usersData.length, status: "healthy", trend: "up" }
        ],
        trainingProgress: [
          { category: "Barista Temelleri", completed: 85, inProgress: 10, notStarted: 5 },
          { category: "Hijyen & Guvenlik", completed: 92, inProgress: 5, notStarted: 3 },
          { category: "Müşteri İlişkileri", completed: 68, inProgress: 20, notStarted: 12 }
        ],
        alerts: [
          { message: "15 personelin zorunlu egitimi eksik", severity: "critical" },
          { message: "Yeni recete egitimi baslatilmali", severity: "warning" }
        ]
      });
    } catch (error: any) {
      console.error("Error in Trainer dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });
  
  // HQ Dashboard - Kalite Kontrol
  app.get("/api/hq-dashboard/kalite", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }
      
      const feedbackData = await db.select().from(customerFeedback);
      const avgRating = feedbackData.length > 0 
        ? (feedbackData.reduce((sum: number, f: any) => sum + (f.overallRating || 0), 0) / feedbackData.length).toFixed(1)
        : "N/A";
      
      res.json({
        metrics: [
          { title: "Kalite Skoru", value: "94%", status: "healthy", trend: "up" },
          { title: "Müşteri Puanı", value: avgRating + "/5", status: "healthy", trend: "stable" },
          { title: "Açık Şikayet", value: 3, status: "warning", trend: "down" },
          { title: "Denetim Puanı", value: "A+", status: "healthy", trend: "stable" }
        ],
        qualityTrend: [
          { month: "Oca", score: 91 },
          { month: "Sub", score: 89 },
          { month: "Mar", score: 92 },
          { month: "Nis", score: 94 }
        ],
        alerts: [
          { message: "2 subede hijyen denetimi planlanmali", severity: "warning" },
          { message: "Fabrika kalite raporunu bekliyor", severity: "warning" }
        ]
      });
    } catch (error: any) {
      console.error("Error in Kalite dashboard:", error);
      res.status(500).json({ message: "Veri alinamadi", error: error.message });
    }
  });

  async function buildGidaMuhendisiCommandCenter(res: any) {
    try {
      const [allBranches, allHaccpCPs, allHaccpRecords, allHygieneAudits, allSupplierCerts, allTrainings, allDocs] = await Promise.all([
        db.select().from(branches),
        db.select().from(haccpControlPoints),
        db.select().from(haccpRecords),
        db.select().from(hygieneAudits),
        db.select().from(supplierCertifications),
        db.select().from(foodSafetyTrainings),
        db.select().from(foodSafetyDocuments),
      ]);

      const now = new Date();
      const activeCPs = allHaccpCPs.filter((cp: any) => cp.isActive);
      const recentRecords = allHaccpRecords.filter((r: any) => {
        const d = new Date(r.recordedAt);
        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
      });
      const deviations = recentRecords.filter((r: any) => !r.isWithinLimits);
      const avgHygieneScore = allHygieneAudits.length > 0
        ? Math.round(allHygieneAudits.reduce((s: number, a: any) => s + (a.overallScore || 0), 0) / allHygieneAudits.length)
        : 0;
      const expiringSoon = allSupplierCerts.filter((c: any) => {
        const exp = new Date(c.expiryDate);
        return exp.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 && exp.getTime() > now.getTime();
      });
      const expiredCerts = allSupplierCerts.filter((c: any) => new Date(c.expiryDate).getTime() < now.getTime());
      const upcomingTrainings = allTrainings.filter((t: any) => t.status === 'scheduled');
      const activeDocs = allDocs.filter((d: any) => d.isActive);

      const urgentAlerts: any[] = [];
      if (deviations.length > 0) urgentAlerts.push({ message: `${deviations.length} HACCP sapma tespit edildi (son 7 gun)`, severity: 'critical' });
      if (expiredCerts.length > 0) urgentAlerts.push({ message: `${expiredCerts.length} tedarikci sertifikasi suresi dolmus`, severity: 'critical' });
      if (expiringSoon.length > 0) urgentAlerts.push({ message: `${expiringSoon.length} sertifika 30 gun icinde sona erecek`, severity: 'warning' });

      res.json({
        urgentAlerts,
        departments: [
          {
            label: 'HACCP Kontrol Noktalari',
            source: 'haccp',
            status: deviations.length > 2 ? 'critical' : deviations.length > 0 ? 'warning' : 'healthy',
            mainMetric: `${activeCPs.length} aktif kontrol noktasi`,
            details: [
              `Son 7 gun: ${recentRecords.length} kayit`,
              `Sapma: ${deviations.length} adet`,
              `Uygunluk: ${recentRecords.length > 0 ? Math.round(((recentRecords.length - deviations.length) / recentRecords.length) * 100) : 100}%`
            ],
            alert: deviations.length > 0 ? `${deviations.length} sapma tespit edildi` : null,
          },
          {
            label: 'Hijyen Denetimleri',
            source: 'hygiene',
            status: avgHygieneScore >= 80 ? 'healthy' : avgHygieneScore >= 60 ? 'warning' : 'critical',
            mainMetric: `Ortalama Skor: ${avgHygieneScore}/100`,
            details: [
              `Toplam denetim: ${allHygieneAudits.length}`,
              `Denetlenen sube: ${new Set(allHygieneAudits.map((a: any) => a.branchId)).size}/${allBranches.length}`
            ],
            alert: avgHygieneScore < 70 ? 'Hijyen skorlari dusuk!' : null,
          },
          {
            label: 'Tedarikci Sertifikalari',
            source: 'certifications',
            status: expiredCerts.length > 0 ? 'critical' : expiringSoon.length > 0 ? 'warning' : 'healthy',
            mainMetric: `${allSupplierCerts.length} sertifika`,
            details: [
              `Aktif: ${allSupplierCerts.filter((c: any) => c.status === 'active').length}`,
              `Suresi dolmus: ${expiredCerts.length}`,
              `Yakinda dolacak: ${expiringSoon.length}`
            ],
            alert: expiredCerts.length > 0 ? `${expiredCerts.length} sertifika suresi doldu!` : null,
          },
          {
            label: 'Egitim Durumu',
            source: 'training',
            status: 'healthy',
            mainMetric: `${upcomingTrainings.length} planli egitim`,
            details: [
              `Toplam: ${allTrainings.length}`,
              `Tamamlanan: ${allTrainings.filter((t: any) => t.status === 'completed').length}`,
              `Planli: ${upcomingTrainings.length}`
            ],
            alert: null,
          },
          {
            label: 'Dokuman Yonetimi',
            source: 'documents',
            status: 'healthy',
            mainMetric: `${activeDocs.length} aktif dokuman`,
            details: [
              `Toplam: ${allDocs.length}`,
              `Aktif: ${activeDocs.length}`
            ],
            alert: null,
          }
        ],
        bottomManagers: [],
        kpiSummary: {
          haccpCompliance: recentRecords.length > 0 ? Math.round(((recentRecords.length - deviations.length) / recentRecords.length) * 100) : 100,
          hygieneScore: avgHygieneScore,
          certificationStatus: expiredCerts.length === 0 ? 'Tamam' : `${expiredCerts.length} suresi dolmus`,
          trainingCompletion: allTrainings.length > 0 ? Math.round((allTrainings.filter((t: any) => t.status === 'completed').length / allTrainings.length) * 100) : 0,
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error in Gida Muhendisi command center:", error);
      res.json(buildFallbackCommandCenter('Gida Muhendisi'));
    }
  }

  // ======= FOOD SAFETY API ENDPOINTS =======

  // HACCP Control Points CRUD
  app.get("/api/food-safety/haccp-control-points", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(haccpControlPoints).orderBy(haccpControlPoints.category);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "HACCP kontrol noktalari alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/haccp-control-points", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertHaccpControlPointSchema.omit({ createdById: true }).parse(req.body);
      const [cp] = await db.insert(haccpControlPoints).values({ ...validated, createdById: req.user.id }).returning();
      res.json(cp);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "HACCP kontrol noktasi olusturulamadi", error: error.message });
    }
  });

  // HACCP Records
  app.get("/api/food-safety/haccp-records", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(haccpRecords).orderBy(sql`${haccpRecords.recordedAt} DESC`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "HACCP kayitlari alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/haccp-records", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertHaccpRecordSchema.omit({ recordedById: true }).parse(req.body);
      const [record] = await db.insert(haccpRecords).values({ ...validated, recordedById: req.user.id }).returning();
      res.json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "HACCP kaydi olusturulamadi", error: error.message });
    }
  });

  // Hygiene Audits
  app.get("/api/food-safety/hygiene-audits", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(hygieneAudits).orderBy(sql`${hygieneAudits.auditDate} DESC`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "Hijyen denetimleri alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/hygiene-audits", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertHygieneAuditSchema.omit({ auditorId: true }).parse(req.body);
      const [audit] = await db.insert(hygieneAudits).values({ ...validated, auditorId: req.user.id }).returning();
      res.json(audit);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "Hijyen denetimi olusturulamadi", error: error.message });
    }
  });

  // Supplier Certifications
  app.get("/api/food-safety/supplier-certifications", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(supplierCertifications).orderBy(supplierCertifications.expiryDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "Tedarikci sertifikalari alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/supplier-certifications", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertSupplierCertificationSchema.omit({ verifiedById: true }).parse(req.body);
      const [cert] = await db.insert(supplierCertifications).values({ ...validated, verifiedById: req.user.id }).returning();
      res.json(cert);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "Sertifika olusturulamadi", error: error.message });
    }
  });

  app.patch("/api/food-safety/supplier-certifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const validated = insertSupplierCertificationSchema.omit({ verifiedById: true }).partial().parse(req.body);
      const [cert] = await db.update(supplierCertifications).set(validated).where(eq(supplierCertifications.id, id)).returning();
      res.json(cert);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "Sertifika guncellenemedi", error: error.message });
    }
  });

  // Food Safety Trainings
  app.get("/api/food-safety/trainings", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(foodSafetyTrainings).orderBy(sql`${foodSafetyTrainings.scheduledDate} DESC`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "Egitimler alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/trainings", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertFoodSafetyTrainingSchema.omit({ trainerId: true }).parse(req.body);
      const [training] = await db.insert(foodSafetyTrainings).values({ ...validated, trainerId: req.user.id }).returning();
      res.json(training);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "Egitim olusturulamadi", error: error.message });
    }
  });

  // Food Safety Documents
  app.get("/api/food-safety/documents", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const data = await db.select().from(foodSafetyDocuments).orderBy(sql`${foodSafetyDocuments.createdAt} DESC`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "Dokumanlar alinamadi", error: error.message });
    }
  });

  app.post("/api/food-safety/documents", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const validated = insertFoodSafetyDocumentSchema.omit({ createdById: true }).parse(req.body);
      const [doc] = await db.insert(foodSafetyDocuments).values({ ...validated, createdById: req.user.id }).returning();
      res.json(doc);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      res.status(500).json({ message: "Dokuman olusturulamadi", error: error.message });
    }
  });

  // Food Safety Dashboard Summary
  app.get("/api/food-safety/dashboard-summary", isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['gida_muhendisi', 'ceo', 'admin', 'cgo', 'kalite_kontrol'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Bu isleme yetkiniz yok" });
      }
      const [allHaccpCPs, allHaccpRecs, allHygieneAuds, allCerts, allTrains, allDocuments, allBranch, allSupplier] = await Promise.all([
        db.select().from(haccpControlPoints),
        db.select().from(haccpRecords),
        db.select().from(hygieneAudits),
        db.select().from(supplierCertifications),
        db.select().from(foodSafetyTrainings),
        db.select().from(foodSafetyDocuments),
        db.select().from(branches),
        db.select().from(suppliers),
      ]);

      const now = new Date();
      const last7Days = allHaccpRecs.filter((r: any) => (now.getTime() - new Date(r.recordedAt).getTime()) < 7 * 24 * 60 * 60 * 1000);
      const deviations7d = last7Days.filter((r: any) => !r.isWithinLimits);
      const complianceRate = last7Days.length > 0 ? Math.round(((last7Days.length - deviations7d.length) / last7Days.length) * 100) : 100;

      const avgHygiene = allHygieneAuds.length > 0 ? Math.round(allHygieneAuds.reduce((s: number, a: any) => s + (a.overallScore || 0), 0) / allHygieneAuds.length) : 0;

      const expiredCerts = allCerts.filter((c: any) => new Date(c.expiryDate).getTime() < now.getTime());
      const expiringCerts = allCerts.filter((c: any) => {
        const exp = new Date(c.expiryDate);
        return exp.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 && exp.getTime() > now.getTime();
      });

      const completedTrainings = allTrains.filter((t: any) => t.status === 'completed').length;
      const scheduledTrainings = allTrains.filter((t: any) => t.status === 'scheduled').length;

      // Branch hygiene scores
      const branchScores = allBranch.map((b: any) => {
        const audits = allHygieneAuds.filter((a: any) => a.branchId === b.id);
        const avgScore = audits.length > 0 ? Math.round(audits.reduce((s: number, a: any) => s + (a.overallScore || 0), 0) / audits.length) : 0;
        return { branchId: b.id, branchName: b.name, score: avgScore, auditCount: audits.length };
      }).sort((a: any, b: any) => b.score - a.score);

      // HACCP by category
      const categoryStats: Record<string, { total: number, deviations: number }> = {};
      allHaccpCPs.forEach((cp: any) => {
        if (!categoryStats[cp.category]) categoryStats[cp.category] = { total: 0, deviations: 0 };
        categoryStats[cp.category].total++;
      });
      deviations7d.forEach((d: any) => {
        const cp = allHaccpCPs.find((cp: any) => cp.id === d.controlPointId);
        if (cp && categoryStats[cp.category]) categoryStats[cp.category].deviations++;
      });

      res.json({
        overview: {
          haccpControlPoints: allHaccpCPs.filter((cp: any) => cp.isActive).length,
          haccpComplianceRate: complianceRate,
          recentDeviations: deviations7d.length,
          avgHygieneScore: avgHygiene,
          totalAudits: allHygieneAuds.length,
          activeCertifications: allCerts.filter((c: any) => c.status === 'active').length,
          expiredCertifications: expiredCerts.length,
          expiringCertifications: expiringCerts.length,
          completedTrainings,
          scheduledTrainings,
          activeDocuments: allDocuments.filter((d: any) => d.isActive).length,
          totalBranches: allBranch.length,
          totalSuppliers: allSupplier.length,
        },
        branchScores,
        categoryStats,
        recentDeviations: deviations7d.map((d: any) => {
          const cp = allHaccpCPs.find((cp: any) => cp.id === d.controlPointId);
          const branch = allBranch.find((b: any) => b.id === d.branchId);
          return {
            ...d,
            controlPointName: cp?.controlPointName || 'Bilinmiyor',
            category: cp?.category || 'Bilinmiyor',
            branchName: branch?.name || 'Bilinmiyor',
          };
        }),
        expiringCertifications: expiringCerts.map((c: any) => {
          const supplier = allSupplier.find((s: any) => s.id === c.supplierId);
          return { ...c, supplierName: supplier?.name || 'Bilinmiyor' };
        }),
        upcomingTrainings: allTrains.filter((t: any) => t.status === 'scheduled').slice(0, 10),
      });
    } catch (error: any) {
      console.error("Error in food safety dashboard summary:", error);
      res.status(500).json({ message: "Gida guvenligi ozeti alinamadi", error: error.message });
    }
  });
}
