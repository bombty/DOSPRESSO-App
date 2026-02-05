// HQ Dashboard Routes - API endpoints for department dashboards
import { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { branches, users, equipmentFaults, checklistCompletions, customerFeedback } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerHQDashboardRoutes(app: Express, isAuthenticated: any) {
  
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
          { name: "Satinalma", score: 88, status: "healthy" },
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
      
      const [branchesData, checklistsData] = await Promise.all([
        db.select().from(branches),
        db.select().from(checklistCompletions)
      ]);
      
      res.json({
        metrics: [
          { title: "Ortalama Şube Puanı", value: "4.2/5", status: "healthy", trend: "up" },
          { title: "Ziyaret Bekleyen", value: 8, status: "warning", trend: "stable" },
          { title: "Uyumluluk Oranı", value: "91%", status: "healthy", trend: "up" },
          { title: "İyileştirme Önerisi", value: 15, status: "healthy", trend: "stable" }
        ],
        branchScores: branchesData.slice(0, 5).map((b: any, i: number) => ({
          name: b.name,
          score: 85 - (i * 3) + Math.floor(Math.random() * 10),
          trend: i % 2 === 0 ? "up" : "stable"
        })),
        alerts: [
          { message: "2 subede checklist tamamlama dusuk", severity: "warning" },
          { message: "Kadikoy subesinde acil ziyaret gerekli", severity: "critical" }
        ]
      });
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
          { name: "Yeni Urun Lansmani", reach: 28000, conversion: 8.3, roi: 2.1 }
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
          { category: "Musteri Iliskileri", completed: 68, inProgress: 20, notStarted: 12 }
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
}
