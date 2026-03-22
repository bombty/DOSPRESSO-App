import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, sum, max } from "drizzle-orm";
import {
  branches,
  messages,
  auditInstances,
  monthlyEmployeePerformance,
  managerMonthlyRatings,
  staffQrRatings,
} from "@shared/schema";

const router = Router();

  // ========================================
  // KISISEL PERFORMANS API
  // ========================================

  // GET /api/my-performance - Kullanicinin kendi performansi
  router.get("/api/my-performance", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      if (!userId) {
        return res.status(401).json({ message: "Yetkisiz" });
      }
      
      // Get current month performance
      const [performance] = await db.select().from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.employeeId, userId),
          eq(monthlyEmployeePerformance.month, currentMonth),
          eq(monthlyEmployeePerformance.year, currentYear)
        )).limit(1);
      
      if (!performance) {
        return res.json({
          attendanceScore: 0,
          checklistScore: 0,
          taskScore: 0,
          customerRatingScore: 0,
          managerRatingScore: 0,
          leaveDeduction: 0,
          totalScore: 0,
          rank: null
        });
      }
      
      // Get ranking
      const allPerformances = await db.select().from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.month, currentMonth),
          eq(monthlyEmployeePerformance.year, currentYear)
        ))
        .orderBy(desc(monthlyEmployeePerformance.totalScore));
      
      const rank = allPerformances.findIndex(p => p.employeeId === userId) + 1;
      
      // Get customer rating average
      const customerRatings = await db.select().from(staffQrRatings)
        .where(eq(staffQrRatings.staffId, userId));
      const customerRatingAvg = customerRatings.length > 0
        ? customerRatings.reduce((sum, r) => sum + r.overallRating, 0) / customerRatings.length
        : 0;
      
      res.json({
        ...performance,
        rank,
        totalEmployees: allPerformances.length,
        customerRatingAvg,
        checklistCompletion: (performance.checklistScore / 20) * 100
      });
    } catch (error: unknown) {
      console.error("Error fetching my performance:", error);
      res.status(500).json({ message: "Performans alinamadi" });
    }
  });

  // GET /api/my-performance/history - Gecmis performans
  router.get("/api/my-performance/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Yetkisiz" });
      }
      
      const history = await db.select().from(monthlyEmployeePerformance)
        .where(eq(monthlyEmployeePerformance.employeeId, userId))
        .orderBy(desc(monthlyEmployeePerformance.year), desc(monthlyEmployeePerformance.month))
        .limit(12);
      
      res.json(history.reverse());
    } catch (error: unknown) {
      console.error("Error fetching performance history:", error);
      res.status(500).json({ message: "Gecmis alinamadi" });
    }
  });


  // GET /api/my-performance/periods - Periyod bazli performans (aylik/3aylik/yillik/tum)
  router.get("/api/my-performance/periods", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Yetkisiz" });
      
      const period = (req.query.period as string) || "monthly";
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const allHistory = await db.select().from(monthlyEmployeePerformance)
        .where(eq(monthlyEmployeePerformance.employeeId, userId))
        .orderBy(desc(monthlyEmployeePerformance.year), desc(monthlyEmployeePerformance.month));
      
      if (allHistory.length === 0) {
        return res.json({
          period,
          current: null,
          previous: null,
          trend: null,
          chartData: [],
          summary: { avgScore: 0, bestMonth: null, worstMonth: null, totalMonths: 0 }
        });
      }
      
      const getScore = (p) => p.finalScore || p.totalScore || 0;
      const monthNames = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
      
      const normalizeChartItem = (h) => ({
        label: `${monthNames[h.month - 1]} ${h.year}`,
        score: getScore(h),
        attendance: h.attendanceScore || 0,
        checklist: h.checklistScore || 0,
        task: h.taskScore || 0,
        customer: h.customerRatingScore || 0,
        manager: h.managerRatingScore || 0
      });
      
      const avgSubScores = (data: any[]) => {
        const len = data.length || 1;
        return {
          attendance: data.reduce((s: number, h) => s + (h.attendanceScore || 0), 0) / len,
          checklist: data.reduce((s: number, h) => s + (h.checklistScore || 0), 0) / len,
          task: data.reduce((s: number, h) => s + (h.taskScore || 0), 0) / len,
          customer: data.reduce((s: number, h) => s + (h.customerRatingScore || 0), 0) / len,
          manager: data.reduce((s: number, h) => s + (h.managerRatingScore || 0), 0) / len,
        };
      };
      
      if (period === "monthly") {
        const current = allHistory.find(h => h.month === currentMonth && h.year === currentYear) || null;
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const previous = allHistory.find(h => h.month === prevMonth && h.year === prevYear) || null;
        
        const trend = (current && previous) ? getScore(current) - getScore(previous) : null;
        
        let rank = null;
        if (current) {
          const allCurrent = await db.select().from(monthlyEmployeePerformance)
            .where(and(eq(monthlyEmployeePerformance.month, currentMonth), eq(monthlyEmployeePerformance.year, currentYear)))
            .orderBy(desc(monthlyEmployeePerformance.finalScore));
          rank = allCurrent.findIndex(p => p.employeeId === userId) + 1;
        }
        
        const chartData = allHistory.slice(0, 12).reverse().map(normalizeChartItem);
        
        return res.json({
          period: "monthly",
          current: current ? { ...current, rank } : null,
          previous,
          trend,
          chartData,
          summary: {
            avgScore: allHistory.reduce((s: number, h) => s + getScore(h), 0) / allHistory.length,
            totalMonths: allHistory.length
          }
        });
      }
      
      if (period === "quarterly") {
        const currentQ = Math.ceil(currentMonth / 3);
        const qMonths = [(currentQ - 1) * 3 + 1, (currentQ - 1) * 3 + 2, (currentQ - 1) * 3 + 3];
        const currentQData = allHistory.filter(h => h.year === currentYear && qMonths.includes(h.month));
        
        const prevQ = currentQ === 1 ? 4 : currentQ - 1;
        const prevQYear = currentQ === 1 ? currentYear - 1 : currentYear;
        const prevQMonths = [(prevQ - 1) * 3 + 1, (prevQ - 1) * 3 + 2, (prevQ - 1) * 3 + 3];
        const prevQData = allHistory.filter(h => h.year === prevQYear && prevQMonths.includes(h.month));
        
        const avgCurrent = currentQData.length > 0 ? currentQData.reduce((s: number, h) => s + getScore(h), 0) / currentQData.length : 0;
        const avgPrev = prevQData.length > 0 ? prevQData.reduce((s: number, h) => s + getScore(h), 0) / prevQData.length : 0;
        
        const trend = (currentQData.length > 0 && prevQData.length > 0) ? avgCurrent - avgPrev : null;
        
        const chartData: any[] = [];
        for (let yr = currentYear - 1; yr <= currentYear; yr++) {
          for (let q = 1; q <= 4; q++) {
            const ms = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
            const qd = allHistory.filter(h => h.year === yr && ms.includes(h.month));
            if (qd.length > 0) {
              const avgScore = qd.reduce((s: number, h) => s + getScore(h), 0) / qd.length;
              chartData.push({
                label: `Q${q} ${yr}`,
                score: avgScore,
                ...avgSubScores(qd)
              });
            }
          }
        }
        
        return res.json({
          period: "quarterly",
          current: currentQData.length > 0 ? { totalScore: avgCurrent, ...avgSubScores(currentQData), quarter: currentQ, year: currentYear, monthCount: currentQData.length } : null,
          previous: prevQData.length > 0 ? { totalScore: avgPrev, ...avgSubScores(prevQData), quarter: prevQ, year: prevQYear, monthCount: prevQData.length } : null,
          trend,
          chartData,
          summary: { avgScore: allHistory.reduce((s: number, h) => s + getScore(h), 0) / allHistory.length, totalMonths: allHistory.length }
        });
      }
      
      if (period === "yearly") {
        const currentYearData = allHistory.filter(h => h.year === currentYear);
        const prevYearData = allHistory.filter(h => h.year === currentYear - 1);
        
        const avgCurrent = currentYearData.length > 0 ? currentYearData.reduce((s: number, h) => s + getScore(h), 0) / currentYearData.length : 0;
        const avgPrev = prevYearData.length > 0 ? prevYearData.reduce((s: number, h) => s + getScore(h), 0) / prevYearData.length : 0;
        
        const trend = (currentYearData.length > 0 && prevYearData.length > 0) ? avgCurrent - avgPrev : null;
        
        const chartData = allHistory.slice(0, 24).reverse().map(normalizeChartItem);
        
        return res.json({
          period: "yearly",
          current: currentYearData.length > 0 ? { totalScore: avgCurrent, year: currentYear, monthCount: currentYearData.length } : null,
          previous: prevYearData.length > 0 ? { totalScore: avgPrev, year: currentYear - 1, monthCount: prevYearData.length } : null,
          trend,
          chartData,
          summary: { avgScore: allHistory.reduce((s: number, h) => s + getScore(h), 0) / allHistory.length, totalMonths: allHistory.length }
        });
      }
      
      // all-time
      const allScores = allHistory.map(h => getScore(h));
      const chartData = allHistory.slice().reverse().map(normalizeChartItem);
      
      return res.json({
        period: "all",
        current: { totalScore: allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length, monthCount: allScores.length },
        previous: null,
        trend: null,
        chartData,
        summary: { avgScore: allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length, bestScore: Math.max(...allScores), worstScore: Math.min(...allScores), totalMonths: allScores.length }
      });
    } catch (error: unknown) {
      console.error("Error fetching period performance:", error);
      res.status(500).json({ message: "Performans periyod verisi alinamadi" });
    }
  });


  // POST /api/my-performance/ai-tips - AI motivasyon onerileri
  router.post("/api/my-performance/ai-tips", isAuthenticated, async (req, res) => {
    try {
      const { performance } = req.body;
      
      // Use OpenAI to generate personalized tips
      const prompt = `Sen bir performans kocusun. Asagidaki puanlara gore Turkce olarak 5 kisa motivasyon onerisi yaz (her biri 1-2 cumle).

Puanlar (100 uzerinden):
- Devam: ${performance?.attendanceScore || 0}/20
- Checklist: ${performance?.checklistScore || 0}/20
- Gorevler: ${performance?.taskScore || 0}/15
- Müşteri: ${performance?.customerRatingScore || 0}/15
- Yonetici: ${performance?.managerRatingScore || 0}/20

Dusuk puanli alanlara odaklan ve pozitif, motive edici ol. JSON dizisi olarak yanit ver: ["oneri1", "oneri2", ...]`;
      
      try {
        const OpenAI = require("openai");
        const openai = new OpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        });
        
        const content = completion.choices[0]?.message?.content || "[]";
        const tips = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        res.json({ tips });
      } catch (error: unknown) {
        console.error("OpenAI error:", error);
        res.json({
          tips: [
            "Devam puaninizi artirmak icin mesai saatlerine dikkat edin.",
            "Gunluk checklistleri zamaninda tamamlayin.",
            "Müşterilere güler yüzlü ve hızlı hizmet verin.",
            "Ekip arkadaslarinizla iyi iletisim kurun.",
            "Egitim programlarini takip edin ve tamamlayin."
          ]
        });
      }
    } catch (error: unknown) {
      console.error("Error generating AI tips:", error);
      res.status(500).json({ message: "Oneriler olusturulamadi" });
    }
  });

  router.post("/api/manager-ratings", isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const managerId = req.user?.id;

      if (!["admin", "supervisor", "coach"].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const {
        employeeId, branchId, month, year,
        workPerformanceRating, teamworkRating, initiativeRating,
        customerRelationsRating, punctualityRating,
        strengths, areasToImprove, generalComment
      } = req.body;

      const ratings = [workPerformanceRating, teamworkRating, initiativeRating, customerRelationsRating, punctualityRating];
      if (ratings.some(r => !r || r < 1 || r > 5)) {
        return res.status(400).json({ message: "Tum puanlar 1-5 arasi olmali" });
      }

      const averageRating = (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2);

      const [rating] = await db.insert(managerMonthlyRatings).values({
        managerId,
        employeeId,
        branchId,
        month,
        year,
        workPerformanceRating,
        teamworkRating,
        initiativeRating,
        customerRelationsRating,
        punctualityRating,
        averageRating,
        strengths,
        areasToImprove,
        generalComment,
        status: "submitted",
      }).returning();

      res.json({ success: true, rating });
    } catch (error: unknown) {
      console.error("Error creating manager rating:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Bu personeli bu ay zaten degerlendirdiniz" });
      }
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });
  // Branch audit comparison endpoint
  router.get("/api/branch-audit-comparison", isAuthenticated, async (req, res) => {
    try {
      // Get all completed audits with branch info
      const allAudits = await db.select({
        id: auditInstances.id,
        branchId: auditInstances.branchId,
        totalScore: auditInstances.totalScore,
        maxScore: auditInstances.maxScore,
        auditDate: auditInstances.auditDate,
        status: auditInstances.status,
      })
      .from(auditInstances)
      .where(eq(auditInstances.status, "completed"));

      const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));
      const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

      // Calculate average scores per branch
      const branchStats = new Map<number, { scores: number[], audits: number }>();
      
      for (const audit of allAudits) {
        if (audit.branchId && audit.totalScore && audit.maxScore) {
          const percentage = Math.round((Number(audit.totalScore) / Number(audit.maxScore)) * 100);
          const current = branchStats.get(audit.branchId) || { scores: [], audits: 0 };
          current.scores.push(percentage);
          current.audits++;
          branchStats.set(audit.branchId, current);
        }
      }

      // Build comparison data
      const comparisonData = [];
      for (const [branchId, stats] of branchStats) {
        const avgScore = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
        const maxScore = Math.max(...stats.scores);
        const minScore = Math.min(...stats.scores);
        comparisonData.push({
          branchId,
          branchName: branchMap.get(branchId) || `Şube ${branchId}`,
          averageScore: avgScore,
          maxScore,
          minScore,
          auditCount: stats.audits
        });
      }

      // Sort by average score descending
      comparisonData.sort((a, b) => b.averageScore - a.averageScore);

      res.json(comparisonData);
    } catch (error: unknown) {
      console.error("Error fetching branch comparison:", error);
      res.status(500).json({ message: "Veri alinamadi" });
    }
  });


export default router;
