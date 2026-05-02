import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { AuthorizationError, ensurePermission, handleApiError } from "./helpers";
import { aiChatCall } from "../ai";
import { z } from "zod";
import {
  messages,
  isHQRole,
} from "@shared/schema";

const router = Router();

  // ==========================================
  // SİSTEM SAĞLIK KONTROLÜ API'SI
  // ==========================================

  // GET /api/system-health-check - Tüm dashboard API'larını kontrol et
  // Detailed Reports API Endpoints
  router.get('/api/detailed-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      ensurePermission(user, 'performance', 'view', 'Raporlara erişim yetkiniz yok');
      
      const reports = await storage.getReports({ createdById: user.id });
      res.json(reports);
    } catch (error: unknown) {
      console.error("Get reports error:", error);
      if (error.name === 'AuthorizationError') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Raporlar alınamadı" });
    }
  });

  router.post('/api/detailed-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      ensurePermission(user, 'performance', 'create', 'Rapor oluşturma yetkiniz yok');
      
      const data = z.object({
        title: z.string(),
        reportType: z.string(),
        branchIds: z.array(z.number()),
        dateRange: z.object({ start: z.string(), end: z.string() }),
        metrics: z.array(z.string()),
        chartType: z.string().optional(),
        includeAISummary: z.boolean().optional(),
      }).parse(req.body);

      const report = await storage.createReport({
        ...data,
        createdById: user.id,
      });
      res.status(201).json(report);
    } catch (error: unknown) {
      console.error("Create report error:", error);
      if (error.name === 'AuthorizationError') {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Rapor oluşturulamadı" });
    }
  });

  router.get('/api/detailed-reports/:id', isAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      res.json(report);
    } catch (error: unknown) {
      console.error("Get report error:", error);
      res.status(500).json({ message: "Rapor alınamadı" });
    }
  });

  router.patch('/api/detailed-reports/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const reportId = parseInt(req.params.id);
      
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      if (report.createdById !== user.id && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkisiz işlem" });
      }

      const updated = await storage.updateReport(reportId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update report error:", error);
      res.status(500).json({ message: "Rapor güncellenemedi" });
    }
  });

  router.delete('/api/detailed-reports/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const reportId = parseInt(req.params.id);
      
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      if (report.createdById !== user.id && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkisiz işlem" });
      }

      await storage.deleteReport(reportId);
      res.json({ message: "Rapor silindi" });
    } catch (error: unknown) {
      console.error("Delete report error:", error);
      res.status(500).json({ message: "Rapor silinemedi" });
    }
  });

  // Branch Comparisons API
  router.get('/api/branch-comparisons/:reportId', isAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const comparisons = await storage.getBranchComparisons(reportId);
      res.json(comparisons);
    } catch (error: unknown) {
      console.error("Get branch comparisons error:", error);
      res.status(500).json({ message: "Karşılaştırmalar alınamadı" });
    }
  });

  // Trend Metrics API
  router.get('/api/trend-metrics', isAuthenticated, async (req, res) => {
    try {
      const { reportId, branchId } = req.query;
      const metrics = await storage.getTrendMetrics(
        reportId ? parseInt(reportId) : undefined,
        branchId ? parseInt(branchId) : undefined
      );
      res.json(metrics);
    } catch (error: unknown) {
      console.error("Get trend metrics error:", error);
      res.status(500).json({ message: "Trendler alınamadı" });
    }
  });

  // AI Summary for Reports
  router.post('/api/ai-summary-report', isAuthenticated, async (req, res) => {
    try {
      const { reportId } = req.body;
      const user = req.user;

      if (!reportId) {
        return res.status(400).json({ message: "Rapor ID'si gereklidir" });
      }

      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }

      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece HQ kullanıcıları AI özeti oluşturabilir" });
      }

      const summaryPrompt = `Şu rapor için kısa bir özet oluştur:
      Rapor Adı: ${report.title}
      Rapor Tipi: ${report.reportType}
      Dönem: ${report.dateRange?.start} - ${report.dateRange?.end}
      Metrikleri: ${report.metrics?.join(", ")}
      
      Önemli bulguları ve önerileri kısaca yaz.`;

      const data = await aiChatCall({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        max_tokens: 500,
        __aiContext: { feature: "system_health", operation: "reportSummary", userId: user.id },
      } as Parameters<typeof aiChatCall>[0]);
      const summary = data.choices?.[0]?.message?.content || "";

      const aiSummary = await storage.createAISummary({
        reportId,
        summary,
        keyFindings: "",
        recommendations: "",
        visualInsights: "",
      });

      res.json(aiSummary);
    } catch (error: unknown) {
      handleApiError(res, error, "SystemHealthAISummary");
    }
  });




export default router;
