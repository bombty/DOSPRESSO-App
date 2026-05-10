/**
 * Mola Dönüş + Otomatik Tutanak API
 *
 * 3 ENDPOINT:
 * 1. POST /api/kiosk/break/start  → Mola başlat
 * 2. POST /api/kiosk/break/end    → Mola bitir + analiz + tutanak
 * 3. GET  /api/kiosk/break/legal-minutes/:shiftId → Yasal mola süresi
 *
 * OTOMATİK TUTANAK KURALI:
 * - 0-3 dk geç → Sadece sayaç (compliance score düşer)
 * - 3-10 dk geç → Tutanak (employee_warning, level: 1)
 * - 10+ dk geç → Disiplin tutanağı (employee_warning, level: 2)
 *
 * Aslan 10 May 2026 talebi.
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  shiftAttendance,
  employeeWarnings,
  users,
  shifts,
} from "@shared/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// Mola süresi hesaplama (Türk İş Kanunu m.68)
function calculateLegalBreakMinutes(shiftDurationMinutes: number): number {
  const hours = shiftDurationMinutes / 60;
  if (hours < 4) return 0;
  if (hours < 7.5) return 30;
  return 60;
}

// ═══════════════════════════════════════════════════════════════════
// 1. POST /api/kiosk/break/start — Mola başlat
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/kiosk/break/start",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { shiftAttendanceId } = req.body;

      if (!shiftAttendanceId) {
        return res
          .status(400)
          .json({ error: "shiftAttendanceId gerekli" });
      }

      // Mevcut kayıt
      const [attendance] = await db
        .select()
        .from(shiftAttendance)
        .where(eq(shiftAttendance.id, shiftAttendanceId))
        .limit(1);

      if (!attendance) {
        return res
          .status(404)
          .json({ error: "Vardiya kaydı bulunamadı" });
      }

      if (attendance.userId !== userId) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      if (attendance.breakStartTime && !attendance.breakEndTime) {
        return res
          .status(400)
          .json({ error: "Zaten molada — önce molayı bitir" });
      }

      // Vardiya süresine göre yasal mola hesapla
      let plannedBreakMinutes = 60;
      if (attendance.scheduledStartTime && attendance.scheduledEndTime) {
        const start = new Date(attendance.scheduledStartTime).getTime();
        const end = new Date(attendance.scheduledEndTime).getTime();
        const shiftMin = (end - start) / 60000;
        plannedBreakMinutes = calculateLegalBreakMinutes(shiftMin);
      }

      // Bugünkü toplam mola (aynı vardiyada yapılmış toplam)
      const totalBreakMin = attendance.totalBreakMinutes || 0;
      const remainingBreakMin = Math.max(
        0,
        plannedBreakMinutes - totalBreakMin
      );

      if (remainingBreakMin === 0) {
        // Mola hakkı yok ama yine başlayacaksa tutanak
        // Yine de izin ver (UI uyarı verir)
      }

      const breakStartTime = new Date();

      await db
        .update(shiftAttendance)
        .set({
          breakStartTime,
          breakPlannedMinutes: remainingBreakMin > 0 ? remainingBreakMin : plannedBreakMinutes,
          status: "on_break",
          updatedAt: breakStartTime,
        } as any)
        .where(eq(shiftAttendance.id, shiftAttendanceId));

      res.json({
        success: true,
        breakStartTime,
        plannedMinutes: remainingBreakMin > 0 ? remainingBreakMin : plannedBreakMinutes,
        totalBreakMinutesToday: totalBreakMin,
        remainingBreakMinutes: remainingBreakMin,
        warning: remainingBreakMin === 0 ? "Mola hakkın doldu — tutanak gerektirebilir" : null,
      });
    } catch (error: any) {
      console.error("[break/start]", error);
      res.status(500).json({
        error: "Mola başlatılamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. POST /api/kiosk/break/end — Mola bitir + analiz + tutanak
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/kiosk/break/end",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { shiftAttendanceId } = req.body;

      const [attendance] = await db
        .select()
        .from(shiftAttendance)
        .where(eq(shiftAttendance.id, shiftAttendanceId))
        .limit(1);

      if (!attendance) {
        return res
          .status(404)
          .json({ error: "Vardiya kaydı bulunamadı" });
      }

      if (attendance.userId !== userId) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      if (!attendance.breakStartTime) {
        return res
          .status(400)
          .json({ error: "Mola başlatılmamış" });
      }

      const breakEndTime = new Date();
      const breakStartTime = new Date(attendance.breakStartTime);
      const actualMinutes = Math.floor(
        (breakEndTime.getTime() - breakStartTime.getTime()) / 60000
      );
      const plannedMinutes = attendance.breakPlannedMinutes || 60;
      const overtimeMinutes = Math.max(0, actualMinutes - plannedMinutes);
      const newTotalBreakMinutes =
        (attendance.totalBreakMinutes || 0) + actualMinutes;

      // Compliance score etkisi
      const complianceImpact = overtimeMinutes > 0
        ? Math.min(20, overtimeMinutes * 2) // her geç dk = -2 puan, max -20
        : 0;
      const newComplianceScore = Math.max(
        0,
        (attendance.complianceScore || 100) - complianceImpact
      );

      // Otomatik tutanak (3+ dk geç)
      let warningCreated = null;
      let newWarningsToday = 0;

      if (overtimeMinutes >= 3) {
        const warningTypeName =
          overtimeMinutes >= 10
            ? "written" // 10+ dk → yazılı uyarı
            : "verbal"; // 3-10 dk → sözlü uyarı

        try {
          // System user veya Aslan'ı issuedBy olarak kullan
          // (employee_warnings.issuedBy NOT NULL FK)
          const systemIssuer = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, "admin"))
            .limit(1);

          const issuedBy = systemIssuer[0]?.id || userId; // fallback: user kendi (audit görünür)

          const [warning] = await db
            .insert(employeeWarnings)
            .values({
              userId,
              warningType: warningTypeName,
              description: `[OTOMATIK SİSTEM] Mola süresi aşıldı. ${overtimeMinutes} dk geç dönüş. Mola: ${breakStartTime.toLocaleTimeString("tr-TR")} → ${breakEndTime.toLocaleTimeString("tr-TR")} (${actualMinutes}/${plannedMinutes} dk). Otomatik tutanak — şube müdürü onaylar.`,
              issuedBy,
              notes: `Tip: break_overtime; Geç: ${overtimeMinutes} dk; Compliance impact: -${complianceImpact}`,
            } as any)
            .returning();

          warningCreated = warning;

          // Bugünkü tutanak sayısı
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayWarnings = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(employeeWarnings)
            .where(
              and(
                eq(employeeWarnings.userId, userId),
                gte(employeeWarnings.createdAt, today)
              )
            );

          newWarningsToday = todayWarnings[0]?.count || 0;
        } catch (e: any) {
          console.warn(
            "[break/end] Otomatik tutanak oluşturulamadı:",
            e.message
          );
        }
      }

      // Attendance update
      await db
        .update(shiftAttendance)
        .set({
          breakEndTime,
          breakTakenMinutes: actualMinutes,
          totalBreakMinutes: newTotalBreakMinutes,
          breakOverageMinutes:
            (attendance.breakOverageMinutes || 0) + overtimeMinutes,
          complianceScore: newComplianceScore,
          status: "checked_in",
          updatedAt: breakEndTime,
        } as any)
        .where(eq(shiftAttendance.id, shiftAttendanceId));

      res.json({
        success: true,
        summary: {
          breakStartTime,
          breakEndTime,
          actualMinutes,
          plannedMinutes,
          overtimeMinutes,
          isOvertime: overtimeMinutes > 0,
          isCriticalOvertime: overtimeMinutes >= 3,
          totalBreakMinutesToday: newTotalBreakMinutes,
          remainingBreakMinutesToday: Math.max(0, plannedMinutes - newTotalBreakMinutes),
          complianceScore: newComplianceScore,
          complianceImpact: -complianceImpact,
        },
        warningCreated,
        newWarningsToday,
      });
    } catch (error: any) {
      console.error("[break/end]", error);
      res.status(500).json({
        error: "Mola bitirme başarısız",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 3. GET /api/kiosk/break/legal-minutes/:shiftId — Yasal mola süresi
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kiosk/break/legal-minutes/:shiftId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const shiftId = parseInt(req.params.shiftId);
      if (isNaN(shiftId)) {
        return res.status(400).json({ error: "Geçersiz shiftId" });
      }

      const [shift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, shiftId))
        .limit(1);

      if (!shift) {
        return res.status(404).json({ error: "Vardiya bulunamadı" });
      }

      let durationMinutes = 480; // default 8 saat
      if (shift.startTime && shift.endTime) {
        // shift.startTime/endTime time string olabilir veya timestamp
        const start = new Date(`2000-01-01T${shift.startTime}`).getTime();
        const end = new Date(`2000-01-01T${shift.endTime}`).getTime();
        if (end > start) {
          durationMinutes = (end - start) / 60000;
        } else {
          // Gece vardiyası
          durationMinutes = (end + 24 * 60 * 60 * 1000 - start) / 60000;
        }
      }

      const legalBreakMinutes = calculateLegalBreakMinutes(durationMinutes);

      res.json({
        shiftId,
        shiftDurationMinutes: durationMinutes,
        legalBreakMinutes,
        explanation:
          legalBreakMinutes === 0
            ? "4 saatten az vardiya — yasal mola yok (İş K. m.68)"
            : legalBreakMinutes === 30
            ? "4-7.5 saat vardiya — 30 dk yasal mola (İş K. m.68)"
            : "7.5+ saat vardiya — 60 dk yasal mola (İş K. m.68)",
      });
    } catch (error: any) {
      console.error("[break/legal-minutes]", error);
      res.status(500).json({
        error: "Hesaplanamadı",
        message: error.message,
      });
    }
  }
);

export default router;
