import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, and, count, sum, sql } from "drizzle-orm";
import {
  branches,
  users,
  checklists,
  checklistCompletions,
  supportTickets,
} from "@shared/schema";

const router = Router();

  // ========================================
  // MANAGER PERFORMANCE - Yonetici Performans API
  // ========================================

  router.get('/api/manager-performance', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const allUsers = await db.select().from(users).where(eq(users.isActive, true));
      const allBranches = await db.select().from(branches);
      const allFaults = await db.select().from(faults);
      const allChecklists = await db.select().from(checklistCompletions);

      const hqRoles = ['muhasebe_ik', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'fabrika_mudur', 'teknik', 'destek', 'muhasebe', 'fabrika'];
      const hqStaff = allUsers.filter(u => hqRoles.includes(u.role || '') && !u.branchId);
      const branchSupervisors = allUsers.filter(u => u.role === 'supervisor');

      const branchComplianceCounts = new Map<number, number>();
      try {
        const complianceRows = await db
          .select({ branchId: supportTickets.branchId, openCount: count() })
          .from(supportTickets)
          .where(
            and(
              sql`${supportTickets.ticketType} = 'compliance'`,
              eq(supportTickets.isDeleted, false),
              sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`
            )
          )
          .groupBy(supportTickets.branchId);
        for (const row of complianceRows) {
          if (row.branchId) branchComplianceCounts.set(row.branchId, Number(row.openCount));
        }
      } catch (e) { console.error(e); }

      const getPerformanceMetrics = (userId: string, userBranchId?: number | null) => {
        const assignedFaults = allFaults.filter(f => f.assignedToId === userId);
        const resolvedFaults = assignedFaults.filter(f => f.status === 'resolved' || f.status === 'closed');
        const userChecklists = allChecklists.filter((c) => c.completedBy === userId);
        const faultResolutionRate = assignedFaults.length > 0 ? Math.round((resolvedFaults.length / assignedFaults.length) * 100) : 100;

        const slaCompliant = resolvedFaults.filter((f) => {
          if (!f.slaDeadline || !f.resolvedAt) return true;
          return new Date(f.resolvedAt) <= new Date(f.slaDeadline);
        });
        const slaComplianceRate = resolvedFaults.length > 0 ? Math.round((slaCompliant.length / resolvedFaults.length) * 100) : 100;

        const responseTimes = assignedFaults
          .filter((f) => f.firstResponseAt && f.createdAt)
          .map((f) => (new Date(f.firstResponseAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60));
        const avgResponseHours = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        const avgResponseTime = avgResponseHours < 1 ? `${Math.round(avgResponseHours * 60)}dk` : `${avgResponseHours.toFixed(1)}sa`;

        const openComplianceTickets = userBranchId ? (branchComplianceCounts.get(userBranchId) || 0) : 0;
        const compliancePenalty = Math.min(openComplianceTickets * 5, 20);

        return {
          assignedFaults: assignedFaults.length,
          resolvedFaults: resolvedFaults.length,
          faultResolutionRate,
          checklistsCompleted: userChecklists.length,
          overallScore: Math.min(100, Math.max(0, Math.round(faultResolutionRate * 0.6 + Math.min(userChecklists.length * 2, 40) - compliancePenalty))),
          slaComplianceRate,
          avgResponseTime: responseTimes.length > 0 ? avgResponseTime : undefined,
          openComplianceTickets,
        };
      };

      const departmentMap: Record<string, string> = {
        'muhasebe_ik': 'Muhasebe & IK',
        'satinalma': 'Satin Alma',
        'coach': 'Coach & Performans',
        'marketing': 'Pazarlama',
        'trainer': 'Egitim',
        'kalite_kontrol': 'Kalite Kontrol',
        'fabrika_mudur': 'Fabrika Yonetim',
        'teknik': 'Teknik Destek',
        'destek': 'Destek',
        'muhasebe': 'Muhasebe',
        'fabrika': 'Fabrika',
      };

      const hqManagers = hqStaff.map(u => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Bilinmiyor',
        role: u.role,
        department: departmentMap[u.role || ''] || u.department || u.role || 'Bilinmiyor',
        email: u.email,
        phone: u.phoneNumber,
        profileImage: u.profileImageUrl,
        hireDate: u.hireDate,
        type: 'hq' as const,
        branchName: null as string | null,
        metrics: getPerformanceMetrics(u.id, u.branchId),
      }));

      const supervisorManagers = branchSupervisors.map(u => {
        const branch = allBranches.find(b => b.id === u.branchId);
        return {
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Bilinmiyor',
          role: u.role,
          department: 'Sube Yonetimi',
          email: u.email,
          phone: u.phoneNumber,
          profileImage: u.profileImageUrl,
          hireDate: u.hireDate,
          type: 'branch' as const,
          branchName: branch?.name || 'Bilinmiyor',
          branchId: u.branchId,
          metrics: getPerformanceMetrics(u.id, u.branchId),
        };
      });

      const hqAvgScore = hqManagers.length > 0 ? Math.round(hqManagers.reduce((sum, m) => sum + m.metrics.overallScore, 0) / hqManagers.length) : 0;
      const branchAvgScore = supervisorManagers.length > 0 ? Math.round(supervisorManagers.reduce((sum, m) => sum + m.metrics.overallScore, 0) / supervisorManagers.length) : 0;

      res.json({
        hqManagers,
        branchManagers: supervisorManagers,
        summary: {
          totalHQ: hqManagers.length,
          totalBranch: supervisorManagers.length,
          hqAverageScore: hqAvgScore,
          branchAverageScore: branchAvgScore,
          overallAverageScore: Math.round((hqAvgScore + branchAvgScore) / 2),
        }
      });
    } catch (error: unknown) {
      console.error("Manager performance error:", error);
      res.status(500).json({ message: "Yonetici performans verileri yuklenemedi" });
    }
  });


export default router;
