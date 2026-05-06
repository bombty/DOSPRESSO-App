/**
 * Sprint 14 Phase 7 — Fabrika Üretim Personel Performans Takibi
 *
 * Mevcut tablolardan (factory_production_runs, factory_shift_sessions)
 * agregasyon yaparak personel bazında performans metrikleri hesaplar.
 *
 * Endpointler:
 *   GET /api/fabrika/personel-performans
 *     ?startDate=2026-05-01&endDate=2026-05-31&userId=optional
 *
 *   GET /api/fabrika/personel-performans/:userId
 *     - Tek personel detaylı performans (son 30 gün)
 *
 * Roller: admin, ceo, cgo, fabrika_mudur, fabrika_sorumlu
 *
 * Metrikler:
 *   - Toplam üretim adedi (quantityProduced toplamı)
 *   - Toplam fire (quantityWaste toplamı)
 *   - Fire oranı (%)
 *   - Ortalama kalite skoru
 *   - Çalışılan toplam saat (start/end time farkı)
 *   - Verimlilik skoru (üretim/saat × kalite × (1 - fire oranı))
 *   - İstasyon dağılımı (hangi istasyonda kaç saat)
 */

import { Router } from 'express';
import { db } from '../db';
import { factoryProductionRuns, factoryStations } from '@shared/schema/schema-08';
import { users } from '@shared/schema/schema-02';
import { sql, and, eq, gte, lte, desc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { logger } from '../lib/logger';

const router = Router();

const ALLOWED_ROLES = [
  'admin', 'ceo', 'cgo',
  'fabrika_mudur', 'fabrika_sorumlu', 'kalite_yoneticisi',
  'recete_gm', 'sef',
];

// ═══════════════════════════════════════════════════════════════════
// 1) Tüm personelin agregre performansı
// ═══════════════════════════════════════════════════════════════════
router.get('/api/fabrika/personel-performans', isAuthenticated, async (req: any, res) => {
  try {
    if (!ALLOWED_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Son 30 gün
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Personel bazlı agregasyon
    const performanceData = await db
      .select({
        userId: factoryProductionRuns.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        role: users.role,
        totalProduced: sql<number>`COALESCE(SUM(${factoryProductionRuns.quantityProduced}), 0)`.mapWith(Number),
        totalWaste: sql<number>`COALESCE(SUM(${factoryProductionRuns.quantityWaste}), 0)`.mapWith(Number),
        avgQuality: sql<number>`COALESCE(AVG(${factoryProductionRuns.qualityScore}), 0)`.mapWith(Number),
        runCount: sql<number>`COUNT(*)`.mapWith(Number),
        completedCount: sql<number>`SUM(CASE WHEN ${factoryProductionRuns.status} = 'completed' THEN 1 ELSE 0 END)`.mapWith(Number),
        totalMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${factoryProductionRuns.endTime} - ${factoryProductionRuns.startTime})) / 60), 0)`.mapWith(Number),
      })
      .from(factoryProductionRuns)
      .leftJoin(users, eq(users.id, factoryProductionRuns.userId))
      .where(
        and(
          gte(factoryProductionRuns.startTime, startDate),
          lte(factoryProductionRuns.startTime, endDate)
        )
      )
      .groupBy(
        factoryProductionRuns.userId,
        users.firstName,
        users.lastName,
        users.username,
        users.role
      )
      .orderBy(desc(sql`SUM(${factoryProductionRuns.quantityProduced})`));

    // Verimlilik skoru hesapla (0-100)
    const enrichedData = performanceData.map(p => {
      const totalUnits = p.totalProduced + p.totalWaste;
      const wasteRate = totalUnits > 0 ? (p.totalWaste / totalUnits) * 100 : 0;
      const hoursWorked = p.totalMinutes / 60;
      const productionPerHour = hoursWorked > 0 ? p.totalProduced / hoursWorked : 0;

      // Verimlilik skoru: kalite (max 100) × fire çarpanı (1-fire oranı) × üretim_yoğunluk
      const qualityFactor = (p.avgQuality || 0) / 100;
      const wasteFactor = 1 - (wasteRate / 100);
      const productionFactor = Math.min(productionPerHour / 100, 1); // 100 adet/saat = max
      const efficiencyScore = Math.round(qualityFactor * wasteFactor * productionFactor * 100);

      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || 'Bilinmiyor';

      return {
        userId: p.userId,
        name: fullName,
        username: p.username,
        role: p.role,
        totalProduced: p.totalProduced,
        totalWaste: p.totalWaste,
        wasteRate: Math.round(wasteRate * 10) / 10,
        avgQuality: Math.round(p.avgQuality * 10) / 10,
        runCount: p.runCount,
        completedCount: p.completedCount,
        completionRate: p.runCount > 0 ? Math.round((p.completedCount / p.runCount) * 100) : 0,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        productionPerHour: Math.round(productionPerHour * 10) / 10,
        efficiencyScore,
      };
    });

    return res.json({
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      personnel: enrichedData,
      summary: {
        totalPersonnel: enrichedData.length,
        totalProduced: enrichedData.reduce((s, p) => s + p.totalProduced, 0),
        totalWaste: enrichedData.reduce((s, p) => s + p.totalWaste, 0),
        avgEfficiency: enrichedData.length > 0
          ? Math.round(enrichedData.reduce((s, p) => s + p.efficiencyScore, 0) / enrichedData.length)
          : 0,
      },
    });
  } catch (error) {
    logger.error('Personel performans fetch failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) Tek personel detaylı performans
// ═══════════════════════════════════════════════════════════════════
router.get('/api/fabrika/personel-performans/:userId', isAuthenticated, async (req: any, res) => {
  try {
    if (!ALLOWED_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { userId } = req.params;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Personel bilgisi
    const [userData] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      return res.status(404).json({ message: 'Personel bulunamadı' });
    }

    // İstasyon dağılımı
    const stationBreakdown = await db
      .select({
        stationId: factoryProductionRuns.stationId,
        stationName: factoryStations.name,
        runCount: sql<number>`COUNT(*)`.mapWith(Number),
        totalProduced: sql<number>`COALESCE(SUM(${factoryProductionRuns.quantityProduced}), 0)`.mapWith(Number),
        totalMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${factoryProductionRuns.endTime} - ${factoryProductionRuns.startTime})) / 60), 0)`.mapWith(Number),
        avgQuality: sql<number>`COALESCE(AVG(${factoryProductionRuns.qualityScore}), 0)`.mapWith(Number),
      })
      .from(factoryProductionRuns)
      .leftJoin(factoryStations, eq(factoryStations.id, factoryProductionRuns.stationId))
      .where(
        and(
          eq(factoryProductionRuns.userId, userId),
          gte(factoryProductionRuns.startTime, startDate),
          lte(factoryProductionRuns.startTime, endDate)
        )
      )
      .groupBy(factoryProductionRuns.stationId, factoryStations.name)
      .orderBy(desc(sql`SUM(${factoryProductionRuns.quantityProduced})`));

    // Son 10 üretim run
    const recentRuns = await db
      .select({
        id: factoryProductionRuns.id,
        startTime: factoryProductionRuns.startTime,
        endTime: factoryProductionRuns.endTime,
        stationName: factoryStations.name,
        quantityProduced: factoryProductionRuns.quantityProduced,
        quantityWaste: factoryProductionRuns.quantityWaste,
        qualityScore: factoryProductionRuns.qualityScore,
        status: factoryProductionRuns.status,
      })
      .from(factoryProductionRuns)
      .leftJoin(factoryStations, eq(factoryStations.id, factoryProductionRuns.stationId))
      .where(eq(factoryProductionRuns.userId, userId))
      .orderBy(desc(factoryProductionRuns.startTime))
      .limit(10);

    // Günlük trend (son 30 gün)
    const dailyTrend = await db
      .select({
        date: sql<string>`DATE(${factoryProductionRuns.startTime})`.as('date'),
        produced: sql<number>`COALESCE(SUM(${factoryProductionRuns.quantityProduced}), 0)`.mapWith(Number),
        waste: sql<number>`COALESCE(SUM(${factoryProductionRuns.quantityWaste}), 0)`.mapWith(Number),
        avgQuality: sql<number>`COALESCE(AVG(${factoryProductionRuns.qualityScore}), 0)`.mapWith(Number),
      })
      .from(factoryProductionRuns)
      .where(
        and(
          eq(factoryProductionRuns.userId, userId),
          gte(factoryProductionRuns.startTime, startDate),
          lte(factoryProductionRuns.startTime, endDate)
        )
      )
      .groupBy(sql`DATE(${factoryProductionRuns.startTime})`)
      .orderBy(sql`DATE(${factoryProductionRuns.startTime})`);

    const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.username || 'Bilinmiyor';

    return res.json({
      generatedAt: new Date().toISOString(),
      user: {
        id: userData.id,
        name: fullName,
        role: userData.role,
      },
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      stationBreakdown: stationBreakdown.map(s => ({
        ...s,
        hoursWorked: Math.round((s.totalMinutes / 60) * 10) / 10,
        avgQuality: Math.round(s.avgQuality * 10) / 10,
      })),
      recentRuns,
      dailyTrend,
    });
  } catch (error) {
    logger.error('Tek personel performans fetch failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
