import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { eq, desc, count, sum, avg } from "drizzle-orm";
import {
  insertQualityAuditSchema,
  users,
  qualityAudits,
  branchAuditScores,
  isHQRole,
  isBranchRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // QUALITY AUDITS API (Kalite Denetimi)
  // ========================================

  // GET /api/quality-audits - List quality audits
  router.get('/api/quality-audits', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(qualityAudits);
      
      // Branch users can only see their own branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(qualityAudits.branchId, user.branchId));
      } else if (branchId) {
        // HQ users can filter by branch
        query = query.where(eq(qualityAudits.branchId, parseInt(branchId as string)));
      }

      const audits = await query.orderBy(desc(qualityAudits.auditDate));
      res.json(audits);
    } catch (error: unknown) {
      console.error("Error fetching quality audits:", error);
      res.status(500).json({ message: "Denetimler yüklenirken hata oluştu" });
    }
  });

  // POST /api/quality-audits - Create quality audit
  router.post('/api/quality-audits', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only HQ coach/admin/trainer/cgo can create audits
      const auditRoles = ['coach', 'admin', 'trainer', 'cgo'];
      if (!isHQRole(user.role as UserRoleType) || !auditRoles.includes(user.role)) {
        return res.status(403).json({ message: "Sadece coach, trainer veya admin denetim oluşturabilir" });
      }

      const validatedData = insertQualityAuditSchema.parse(req.body);
      const [audit] = await db.insert(qualityAudits).values({
        ...validatedData,
        auditorId: user.id,
      }).returning();

      res.status(201).json(audit);
    } catch (error: unknown) {
      console.error("Error creating quality audit:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim oluşturulurken hata oluştu" });
    }
  });

  // GET /api/branch-audit-scores - Get branch audit score summaries
  router.get('/api/branch-audit-scores', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId, periodType } = req.query;

      let query = db.select().from(branchAuditScores);
      
      // Filter by branch for branch roles
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(branchAuditScores.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(branchAuditScores.branchId, parseInt(branchId as string)));
      }

      if (periodType) {
        query = query.where(eq(branchAuditScores.periodType, periodType as string));
      }

      const scores = await query.orderBy(desc(branchAuditScores.periodStart));
      res.json(scores);
    } catch (error: unknown) {
      console.error("Error fetching branch audit scores:", error);
      res.status(500).json({ message: "Şube denetim skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/branch-audit-scores/:branchId/latest - Get latest audit scores for a branch
  router.get('/api/branch-audit-scores/:branchId/latest', isAuthenticated, async (req, res) => {
    try {
      const { branchId } = req.params;
      
      // Get the most recent audits for this branch
      const recentAudits = await db.select()
        .from(qualityAudits)
        .where(eq(qualityAudits.branchId, parseInt(branchId)))
        .orderBy(desc(qualityAudits.auditDate))
        .limit(10);

      // Calculate averages from recent audits
      if (recentAudits.length === 0) {
        return res.json({
          branchId: parseInt(branchId),
          auditCount: 0,
          overallScore: null,
          sections: {
            gida_guvenligi: null,
            urun_standardi: null,
            servis: null,
            operasyon: null,
            marka: null,
            ekipman: null,
          }
        });
      }

      const avgScores = {
        gida_guvenligi: 0,
        urun_standardi: 0,
        servis: 0,
        operasyon: 0,
        marka: 0,
        ekipman: 0,
      };

      let count = 0;
      recentAudits.forEach(audit => {
        if (audit.gidaGuvenligiScore !== null) avgScores.gida_guvenligi += audit.gidaGuvenligiScore;
        if (audit.urunStandardiScore !== null) avgScores.urun_standardi += audit.urunStandardiScore;
        if (audit.servisScore !== null) avgScores.servis += audit.servisScore;
        if (audit.operasyonScore !== null) avgScores.operasyon += audit.operasyonScore;
        if (audit.markaScore !== null) avgScores.marka += audit.markaScore;
        if (audit.ekipmanScore !== null) avgScores.ekipman += audit.ekipmanScore;
        count++;
      });

      // Calculate weighted overall score
      const sectionWeights = {
        gida_guvenligi: 25,
        urun_standardi: 25,
        servis: 15,
        operasyon: 15,
        marka: 10,
        ekipman: 10,
      };

      let overallScore = 0;
      Object.keys(sectionWeights).forEach(key => {
        const sectionKey = key as keyof typeof avgScores;
        const avg = count > 0 ? avgScores[sectionKey] / count : 0;
        avgScores[sectionKey] = Math.round(avg);
        overallScore += (avg * sectionWeights[sectionKey]) / 100;
      });

      res.json({
        branchId: parseInt(branchId),
        auditCount: recentAudits.length,
        overallScore: Math.round(overallScore),
        sections: avgScores,
        lastAuditDate: recentAudits[0]?.auditDate,
      });
    } catch (error: unknown) {
      console.error("Error fetching latest branch audit scores:", error);
      res.status(500).json({ message: "Şube denetim skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/quality-audits/summary - Get quality audit summary for dashboard
  router.get('/api/quality-audits/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let auditsQuery = db.select().from(qualityAudits);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        auditsQuery = auditsQuery.where(eq(qualityAudits.branchId, user.branchId));
      } else if (branchId) {
        auditsQuery = auditsQuery.where(eq(qualityAudits.branchId, parseInt(branchId as string)));
      }

      const audits = await auditsQuery.orderBy(desc(qualityAudits.auditDate));
      
      // Calculate summary stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const thisMonthAudits = audits.filter(a => new Date(a.auditDate) >= thisMonth);
      const lastMonthAudits = audits.filter(a => {
        const date = new Date(a.auditDate);
        return date >= lastMonth && date < thisMonth;
      });

      // Calculate averages
      const thisMonthAvg = thisMonthAudits.length > 0
        ? thisMonthAudits.reduce((sum, a) => sum + (a.weightedTotalScore || a.percentageScore), 0) / thisMonthAudits.length
        : 0;
      const lastMonthAvg = lastMonthAudits.length > 0
        ? lastMonthAudits.reduce((sum, a) => sum + (a.weightedTotalScore || a.percentageScore), 0) / lastMonthAudits.length
        : 0;

      res.json({
        totalAudits: audits.length,
        thisMonthCount: thisMonthAudits.length,
        lastMonthCount: lastMonthAudits.length,
        thisMonthAverage: Math.round(thisMonthAvg),
        lastMonthAverage: Math.round(lastMonthAvg),
        trend: thisMonthAvg >= lastMonthAvg ? 'up' : 'down',
        trendPercent: lastMonthAvg > 0 ? Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100) : 0,
        recentAudits: audits.slice(0, 5).map(a => ({
          id: a.id,
          branchId: a.branchId,
          auditDate: a.auditDate,
          score: a.weightedTotalScore || a.percentageScore,
          status: a.status,
        })),
      });
    } catch (error: unknown) {
      console.error("Error fetching quality audit summary:", error);
      res.status(500).json({ message: "Denetim özeti yüklenirken hata oluştu" });
    }
  });



export default router;
