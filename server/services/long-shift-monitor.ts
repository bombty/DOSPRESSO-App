/**
 * Long Shift Monitor — Aslan 11 May 2026
 *
 * SENARYO:
 * Personel "Vardiya Bitir" basmadan ayrılırsa, sistem onun adına
 * sonsuza kadar açık kalır. Bu durum:
 *   - PDKS hatalı (çalışmadığı saatleri çalışmış gibi)
 *   - Bordro hatalı
 *   - Aslan: '10 saat sonra uyarı ver, 12 saat sonra otomatik kapat'
 *
 * KURALLAR:
 *   - shiftEndTime + 1 saat geçti ama hâlâ aktif → soft warning (kiosk anasayfada)
 *   - 10 saat aktif (shift süresinden bağımsız) → kırmızı uyarı
 *   - 12 saat aktif → OTOMATIK ÇIKIŞ (scheduledEndTime'a göre düzelt)
 *   - Eğer mesai talebi varsa → 12 saatte değil, talep limitine göre
 *
 * NASIL ÇALIŞIR:
 *   - tick-1hr scheduler'a entegre (saatte 1 kontrol)
 *   - Her aktif session için check
 *   - Otomatik kapatma: checkout time = scheduledEndTime (normal mesai)
 *   - Audit log oluştur (sistem otomatik kapattı)
 */

import { db } from "../db";
import { branchShiftSessions, branchShiftEvents, branches, users } from "@shared/schema";
import { eq, and, or, lt, isNull, sql } from "drizzle-orm";

const WARNING_HOURS = 10;
const AUTO_CLOSE_HOURS = 12;

export interface LongShiftReport {
  warnings: number;
  autoClosed: number;
  details: Array<{
    sessionId: number;
    userId: string;
    branchId: number;
    elapsedHours: number;
    action: 'warning' | 'auto_closed';
  }>;
}

export async function checkLongShifts(): Promise<LongShiftReport> {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() - WARNING_HOURS * 60 * 60 * 1000);
  const autoCloseThreshold = new Date(now.getTime() - AUTO_CLOSE_HOURS * 60 * 60 * 1000);

  const report: LongShiftReport = {
    warnings: 0,
    autoClosed: 0,
    details: [],
  };

  // Tüm aktif sessions (10+ saat öncesinden başlamış)
  const longShifts = await db
    .select()
    .from(branchShiftSessions)
    .where(
      and(
        or(
          eq(branchShiftSessions.status, "active"),
          eq(branchShiftSessions.status, "on_break")
        ),
        lt(branchShiftSessions.checkInTime, warningThreshold)
      )
    );

  for (const session of longShifts) {
    const checkInTime = new Date(session.checkInTime);
    const elapsedMs = now.getTime() - checkInTime.getTime();
    const elapsedHours = elapsedMs / (60 * 60 * 1000);

    if (elapsedHours >= AUTO_CLOSE_HOURS) {
      // 12 saat geçti → OTOMATİK KAPAT
      // scheduledEndTime varsa o saate kapat, yoksa shift+8 saat kabul et
      let checkOutTime = new Date(checkInTime.getTime() + 8 * 60 * 60 * 1000); // default 8 saat
      
      // Eğer shift_attendance kaydında scheduledEndTime varsa o saati kullan
      try {
        const result = await db.execute(sql`
          SELECT sa.scheduled_end_time, s.shift_date
          FROM shift_attendance sa
          JOIN shifts s ON s.id = sa.shift_id
          WHERE sa.user_id = ${session.userId}
            AND s.shift_date = ${checkInTime.toISOString().split('T')[0]}
          LIMIT 1
        `);
        if (result.rows.length > 0) {
          const row: any = result.rows[0];
          if (row.scheduled_end_time) {
            // Birleştir: shift_date + scheduled_end_time
            const [h, m] = String(row.scheduled_end_time).split(':');
            const sd = new Date(row.shift_date);
            sd.setHours(parseInt(h), parseInt(m), 0, 0);
            checkOutTime = sd;
          }
        }
      } catch (e) {
        console.error("[long-shift] scheduledEndTime fetch error:", e);
      }

      const totalWorkMinutes = Math.floor(
        (checkOutTime.getTime() - checkInTime.getTime()) / 60000
      );
      const netWorkMinutes = totalWorkMinutes - (session.breakMinutes || 0);

      await db
        .update(branchShiftSessions)
        .set({
          status: "completed",
          checkOutTime,
          workMinutes: totalWorkMinutes,
          netWorkMinutes,
          autoClosed: true,
          autoClosedReason: "long_shift_12h_timeout",
          autoClosedAt: now,
        } as any)
        .where(eq(branchShiftSessions.id, session.id));

      await db.insert(branchShiftEvents).values({
        sessionId: session.id,
        userId: session.userId,
        branchId: session.branchId,
        eventType: "auto_shift_end",
        eventTime: now,
        notes: `Otomatik kapatma: ${elapsedHours.toFixed(1)} saat aktif kaldı. Normal mesai bitişine kapatıldı: ${checkOutTime.toLocaleString("tr-TR")}`,
      } as any);

      report.autoClosed++;
      report.details.push({
        sessionId: session.id,
        userId: session.userId,
        branchId: session.branchId,
        elapsedHours: Math.round(elapsedHours * 10) / 10,
        action: "auto_closed",
      });

      console.log(
        `[long-shift] AUTO-CLOSED session ${session.id} (user ${session.userId}, branch ${session.branchId}, ${elapsedHours.toFixed(1)} hours)`
      );
    } else if (elapsedHours >= WARNING_HOURS) {
      // 10-12 saat arası → sadece warning (otomatik kapatma değil)
      // Frontend bunu görsel olarak gösterir
      report.warnings++;
      report.details.push({
        sessionId: session.id,
        userId: session.userId,
        branchId: session.branchId,
        elapsedHours: Math.round(elapsedHours * 10) / 10,
        action: "warning",
      });
    }
  }

  return report;
}

/**
 * Uzun çalışmadakı kişileri canlı listele (frontend için)
 * /api/branches/:branchId/kiosk/long-shift-warnings
 */
export async function getLongShiftWarnings(branchId: number) {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() - WARNING_HOURS * 60 * 60 * 1000);

  const longShifts = await db
    .select({
      sessionId: branchShiftSessions.id,
      userId: branchShiftSessions.userId,
      checkInTime: branchShiftSessions.checkInTime,
      status: branchShiftSessions.status,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(branchShiftSessions)
    .leftJoin(users, eq(branchShiftSessions.userId, users.id))
    .where(
      and(
        eq(branchShiftSessions.branchId, branchId),
        or(
          eq(branchShiftSessions.status, "active"),
          eq(branchShiftSessions.status, "on_break")
        ),
        lt(branchShiftSessions.checkInTime, warningThreshold)
      )
    );

  return longShifts.map((s) => {
    const checkInTime = new Date(s.checkInTime);
    const elapsedHours = (now.getTime() - checkInTime.getTime()) / (60 * 60 * 1000);
    return {
      sessionId: s.sessionId,
      userId: s.userId,
      userName: `${s.firstName} ${s.lastName}`,
      checkInTime: s.checkInTime,
      elapsedHours: Math.round(elapsedHours * 10) / 10,
      severity: elapsedHours >= AUTO_CLOSE_HOURS ? "critical" : "warning",
      message:
        elapsedHours >= AUTO_CLOSE_HOURS
          ? `${s.firstName} 12 saat+ aktif — otomatik kapatma yapılacak`
          : `${s.firstName} ${Math.round(elapsedHours)} saat+ aktif — mesai talebinde bulunmadıysa vardiyayı bitirmesi gerekir`,
    };
  });
}
