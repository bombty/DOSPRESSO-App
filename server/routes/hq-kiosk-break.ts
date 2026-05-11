/**
 * HQ Kiosk Mola Yönetimi (Sprint 14a — 11 May 2026)
 *
 * 2 ENDPOINT:
 * 1. POST /api/hq/kiosk/break-start  → Mola başlat
 * 2. POST /api/hq/kiosk/break-end    → Mola bitir
 *
 * Aslan talebi: Mola sayaç tüm kiosk'larda olmalı (şube + fabrika + HQ).
 * Şube versiyonunun (branches.ts) HQ-eşdeğeri.
 *
 * Şube vs HQ Farklılıkları:
 * - branchShiftSessions    → hqShiftSessions
 * - branchBreakLogs        → hqBreakLogs (Sprint 14a YENİ tablo)
 * - branchShiftEvents      → hqShiftEvents (zaten vardı)
 * - branchId yok (HQ tek entity)
 * - kiosk_settings yok (default 60 dk + 90 dk uzun-mola eşiği)
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  hqShiftSessions,
  hqBreakLogs,
  hqShiftEvents,
  users,
  notifications,
} from "@shared/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// HQ defaults (kiosk_settings tablosu olmadığı için sabit)
const HQ_DAILY_BREAK_LIMIT_MIN = 60;   // Günlük toplam mola hakkı
const HQ_LONG_BREAK_THRESHOLD_MIN = 90; // Uyarı eşiği (supervisor bildirim)

// ═══════════════════════════════════════════════════════════════════
// 1. POST /api/hq/kiosk/break-start — Mola başlat
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/hq/kiosk/break-start",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { sessionId, breakType } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "Oturum gerekli" });
      }

      const [session] = await db
        .select()
        .from(hqShiftSessions)
        .where(eq(hqShiftSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return res.status(404).json({ message: "Oturum bulunamadı" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ message: "Vardiya aktif değil" });
      }

      // Bugünkü kümülatif mola hakkı (45+15 mantığı)
      const usedToday = session.breakMinutes || 0;
      const remainingToday = Math.max(0, HQ_DAILY_BREAK_LIMIT_MIN - usedToday);

      const now = new Date();

      // hq_shift_sessions.status = 'on_break'
      await db
        .update(hqShiftSessions)
        .set({ status: "on_break" })
        .where(eq(hqShiftSessions.id, sessionId));

      // Yeni mola log satırı
      const [breakLog] = await db
        .insert(hqBreakLogs)
        .values({
          sessionId,
          userId: session.userId,
          breakStartTime: now,
          breakType: breakType || "regular",
        })
        .returning();

      // Event log
      await db.insert(hqShiftEvents).values({
        sessionId,
        userId: session.userId,
        eventType: "break_start",
        eventTime: now,
        exitReason: "break",
      } as any);

      res.json({
        success: true,
        breakLog,
        breakStartTime: now,
        dailyPlannedMinutes: HQ_DAILY_BREAK_LIMIT_MIN,
        dailyUsedMinutes: usedToday,
        dailyRemainingMinutes: remainingToday,
        warning:
          remainingToday === 0
            ? "Mola hakkın bugün doldu — yine de mola alabilirsin ama supervisor bildirimi gider"
            : null,
      });
    } catch (error: any) {
      console.error("[hq/break-start]", error);
      res.status(500).json({
        message: "Mola başlatılamadı",
        error: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. POST /api/hq/kiosk/break-end — Mola bitir
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/hq/kiosk/break-end",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      let { sessionId, userId } = req.body;

      // sessionId yoksa userId ile aktif on_break session bul
      if (!sessionId && userId) {
        const [found] = await db
          .select()
          .from(hqShiftSessions)
          .where(
            and(
              eq(hqShiftSessions.userId, userId),
              eq(hqShiftSessions.status, "on_break")
            )
          )
          .limit(1);
        if (found) sessionId = found.id;
      }

      if (!sessionId) {
        return res.status(400).json({ message: "Oturum gerekli" });
      }

      const [session] = await db
        .select()
        .from(hqShiftSessions)
        .where(eq(hqShiftSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return res.status(404).json({ message: "Oturum bulunamadı" });
      }

      if (session.status !== "on_break") {
        return res.status(400).json({ message: "Şu anda molada değil" });
      }

      const now = new Date();

      // En son aktif mola log'unu bul
      const [activeBreak] = await db
        .select()
        .from(hqBreakLogs)
        .where(
          and(
            eq(hqBreakLogs.sessionId, sessionId),
            isNull(hqBreakLogs.breakEndTime)
          )
        )
        .orderBy(desc(hqBreakLogs.breakStartTime))
        .limit(1);

      let breakDuration = 0;
      let newTotalBreakMinutes = session.breakMinutes || 0;

      if (activeBreak) {
        breakDuration = Math.floor(
          (now.getTime() - new Date(activeBreak.breakStartTime).getTime()) /
            60000
        );

        // Mola log'u kapat
        await db
          .update(hqBreakLogs)
          .set({
            breakEndTime: now,
            breakDurationMinutes: breakDuration,
          })
          .where(eq(hqBreakLogs.id, activeBreak.id));

        // KÜMÜLATİF — 45+15 senaryosu için kritik
        newTotalBreakMinutes = (session.breakMinutes || 0) + breakDuration;

        await db
          .update(hqShiftSessions)
          .set({
            status: "active",
            breakMinutes: newTotalBreakMinutes,
          })
          .where(eq(hqShiftSessions.id, sessionId));
      } else {
        // activeBreak yoksa sadece status fix
        await db
          .update(hqShiftSessions)
          .set({ status: "active" })
          .where(eq(hqShiftSessions.id, sessionId));
      }

      // Event log
      await db.insert(hqShiftEvents).values({
        sessionId,
        userId: session.userId,
        eventType: "break_end",
        eventTime: now,
      } as any);

      // Uzun mola uyarısı (>90 dk) → supervisor bildirim
      let longBreakWarning = false;
      if (breakDuration > HQ_LONG_BREAK_THRESHOLD_MIN) {
        try {
          longBreakWarning = true;
          const [breakUser] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);
          const bName =
            [breakUser?.firstName, breakUser?.lastName]
              .filter(Boolean)
              .join(" ") || "Çalışan";

          // HQ supervisor'ları (ceo, cgo, mudur rolleri)
          const supervisors = await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.isActive, true),
                sql`${users.role} IN ('ceo', 'cgo', 'mudur', 'admin')`
              )
            );

          if (supervisors.length > 0) {
            await db.insert(notifications).values(
              supervisors.map((s) => ({
                userId: s.id,
                type: "long_break_warning",
                title: "HQ Uzun Mola Uyarısı",
                message: `${bName} HQ'da ${breakDuration} dk mola yaptı (limit: ${HQ_LONG_BREAK_THRESHOLD_MIN} dk)`,
              })) as any
            );
          }
        } catch (e: any) {
          console.warn("[hq/break-end] Long break notification failed:", e.message);
        }
      }

      const dailyRemaining = Math.max(
        0,
        HQ_DAILY_BREAK_LIMIT_MIN - newTotalBreakMinutes
      );

      res.json({
        success: true,
        breakDuration,
        breakStartTime: activeBreak?.breakStartTime || null,
        breakEndTime: now,
        dailyPlannedMinutes: HQ_DAILY_BREAK_LIMIT_MIN,
        dailyUsedMinutes: newTotalBreakMinutes,
        dailyRemainingMinutes: dailyRemaining,
        longBreakWarning,
      });
    } catch (error: any) {
      console.error("[hq/break-end]", error);
      res.status(500).json({
        message: "Mola bitirme başarısız",
        error: error.message,
      });
    }
  }
);

export default router;
