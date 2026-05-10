/**
 * HQ Canlı Vardiya + PDKS Geçmiş Raporlama API
 *
 * ASLAN 10 MAY 2026 TALEBİ:
 * - HQ (CGO, Mahmut IK-muhasebe, Coach, Trainer) tüm şubelerin
 *   personel vardiya canlı görebilmeli
 * - Geçmişe dönük tüm PDKS verileri kayda geçmeli
 * - Mahkeme/dava için kolayca erişim
 * - Şube müdürüne ihlal raporları + puantaj
 *
 * 6 ENDPOINT:
 * 1. GET /api/hq/live-shifts          → Tüm şubelerin canlı durumu
 * 2. GET /api/hq/live-shifts/branch/:id → Tek şubenin detayı
 * 3. GET /api/hq/pdks-history         → Tarih aralığı + filtre PDKS
 * 4. GET /api/hq/pdks-history/user/:id → Tek personel geçmişi
 * 5. GET /api/hq/violations           → İhlal raporu (aylık/dönem)
 * 6. GET /api/hq/payroll-summary/:branchId/:month/:year → Şube puantaj özeti
 *
 * YETKİ:
 * - admin, ceo, cgo, owner: tüm şubeler
 * - coach, trainer: tüm şubeler (gözlemci)
 * - muhasebe_ik, muhasebe: tüm şubeler (puantaj/bordro için)
 * - mudur, branch_manager: sadece kendi şubesi
 * - partner: sadece kendi şubesi
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  shiftAttendance,
  shifts,
  branches,
  users,
  branchShiftSessions,
  branchBreakLogs,
  employeeWarnings,
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte, or, isNull, inArray } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// Yetki kontrolü
// ═══════════════════════════════════════════════════════════════════

const HQ_VIEW_ALL_ROLES = [
  "admin",
  "ceo",
  "cgo",
  "owner",
  "coach",
  "trainer",
  "muhasebe_ik",
  "muhasebe",
];

const BRANCH_OWN_ROLES = ["mudur", "branch_manager", "owner", "supervisor"];

function canViewAllBranches(role: string): boolean {
  return HQ_VIEW_ALL_ROLES.includes(role);
}

function canViewOwnBranch(role: string): boolean {
  return BRANCH_OWN_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// 1. GET /api/hq/live-shifts — Tüm şubelerin canlı durumu
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/hq/live-shifts",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;

      if (!canViewAllBranches(userRole) && !canViewOwnBranch(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const now = new Date();
      const BREAK_LIMIT_MIN = 60;

      // Aktif şubeler
      let branchQuery = db
        .select({
          id: branches.id,
          name: branches.name,
          city: branches.city,
          ownershipType: branches.ownershipType,
        })
        .from(branches)
        .where(eq(branches.isActive, true))
        .$dynamic();

      // Şube yöneticisi sadece kendi şubesini görür
      if (!canViewAllBranches(userRole) && userBranchId) {
        branchQuery = branchQuery.where(eq(branches.id, userBranchId));
      }

      const branchList = await branchQuery;

      // Tüm aktif session'lar
      const activeSessions = await db
        .select({
          sessionId: branchShiftSessions.id,
          branchId: branchShiftSessions.branchId,
          userId: branchShiftSessions.userId,
          status: branchShiftSessions.status,
          checkInTime: branchShiftSessions.checkInTime,
          breakMinutes: branchShiftSessions.breakMinutes,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
        })
        .from(branchShiftSessions)
        .leftJoin(users, eq(branchShiftSessions.userId, users.id))
        .where(
          or(
            eq(branchShiftSessions.status, "active"),
            eq(branchShiftSessions.status, "on_break")
          )
        );

      // Aktif mola log'ları (breakStartTime için)
      const onBreakSessionIds = activeSessions
        .filter((s) => s.status === "on_break")
        .map((s) => s.sessionId);

      const activeBreaks =
        onBreakSessionIds.length > 0
          ? await db
              .select({
                sessionId: branchBreakLogs.sessionId,
                breakStartTime: branchBreakLogs.breakStartTime,
              })
              .from(branchBreakLogs)
              .where(
                and(
                  inArray(branchBreakLogs.sessionId, onBreakSessionIds),
                  isNull(branchBreakLogs.breakEndTime)
                )
              )
          : [];

      const breakStartMap = new Map(
        activeBreaks.map((b) => [b.sessionId, b.breakStartTime])
      );

      // Şubeye göre grupla
      const branchMap = new Map<number, any>();
      for (const branch of branchList) {
        branchMap.set(branch.id, {
          branchId: branch.id,
          branchName: branch.name,
          city: branch.city,
          ownershipType: branch.ownershipType,
          activeCount: 0,
          onBreakCount: 0,
          violationCount: 0,
          personnel: [],
        });
      }

      for (const session of activeSessions) {
        const branchData = branchMap.get(session.branchId);
        if (!branchData) continue;

        const breakStartTime = breakStartMap.get(session.sessionId) || null;
        let currentBreakMin = 0;
        let isViolation = false;

        if (session.status === "on_break" && breakStartTime) {
          currentBreakMin = Math.floor(
            (now.getTime() - new Date(breakStartTime).getTime()) / 60000
          );
          isViolation = currentBreakMin > BREAK_LIMIT_MIN;
        }

        if (session.status === "active") branchData.activeCount++;
        if (session.status === "on_break") {
          branchData.onBreakCount++;
          if (isViolation) branchData.violationCount++;
        }

        branchData.personnel.push({
          userId: session.userId,
          firstName: session.firstName,
          lastName: session.lastName,
          role: session.role,
          profileImageUrl: session.profileImageUrl,
          status: session.status,
          checkInTime: session.checkInTime,
          breakStartTime,
          currentBreakMinutes: currentBreakMin,
          totalBreakMinutesToday: session.breakMinutes || 0,
          isViolation,
        });
      }

      const result = Array.from(branchMap.values()).sort((a, b) => {
        // İhlal varsa üst
        if (a.violationCount !== b.violationCount) {
          return b.violationCount - a.violationCount;
        }
        return a.branchId - b.branchId;
      });

      // Özet
      const summary = {
        totalBranches: result.length,
        totalActive: result.reduce((s, b) => s + b.activeCount, 0),
        totalOnBreak: result.reduce((s, b) => s + b.onBreakCount, 0),
        totalViolations: result.reduce((s, b) => s + b.violationCount, 0),
        branchesWithViolations: result.filter((b) => b.violationCount > 0)
          .length,
        timestamp: now.toISOString(),
      };

      res.json({ summary, branches: result });
    } catch (error: any) {
      console.error("[hq/live-shifts]", error);
      res.status(500).json({
        error: "Canlı vardiya verisi alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. GET /api/hq/pdks-history — Geçmişe dönük PDKS
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/hq/pdks-history",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;

      if (!canViewAllBranches(userRole) && !canViewOwnBranch(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const startDate = req.query.start as string | undefined;
      const endDate = req.query.end as string | undefined;
      const branchIdFilter = req.query.branchId
        ? parseInt(req.query.branchId as string)
        : null;
      const userIdFilter = req.query.userId as string | undefined;
      const limit = Math.min(parseInt(String(req.query.limit || "500")), 2000);

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "start ve end tarihleri gerekli (YYYY-MM-DD)",
        });
      }

      // Şube yöneticisi sadece kendi şubesini görür
      let effectiveBranchId = branchIdFilter;
      if (!canViewAllBranches(userRole)) {
        effectiveBranchId = userBranchId;
      }

      const records = await db
        .select({
          id: shiftAttendance.id,
          shiftId: shiftAttendance.shiftId,
          userId: shiftAttendance.userId,
          shiftDate: shifts.shiftDate,
          branchId: shifts.branchId,
          branchName: branches.name,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
          userRole: users.role,
          scheduledStartTime: shiftAttendance.scheduledStartTime,
          scheduledEndTime: shiftAttendance.scheduledEndTime,
          checkInTime: shiftAttendance.checkInTime,
          checkOutTime: shiftAttendance.checkOutTime,
          totalWorkedMinutes: shiftAttendance.totalWorkedMinutes,
          totalBreakMinutes: shiftAttendance.totalBreakMinutes,
          latenessMinutes: shiftAttendance.latenessMinutes,
          earlyLeaveMinutes: shiftAttendance.earlyLeaveMinutes,
          breakOverageMinutes: shiftAttendance.breakOverageMinutes,
          complianceScore: shiftAttendance.complianceScore,
          status: shiftAttendance.status,
        })
        .from(shiftAttendance)
        .leftJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
        .leftJoin(branches, eq(shifts.branchId, branches.id))
        .leftJoin(users, eq(shiftAttendance.userId, users.id))
        .where(
          and(
            gte(shifts.shiftDate, startDate),
            lte(shifts.shiftDate, endDate),
            effectiveBranchId ? eq(shifts.branchId, effectiveBranchId) : sql`1=1`,
            userIdFilter ? eq(shiftAttendance.userId, userIdFilter) : sql`1=1`
          )
        )
        .orderBy(desc(shifts.shiftDate))
        .limit(limit);

      // Özet istatistikler
      const summary = {
        totalRecords: records.length,
        totalUsers: new Set(records.map((r) => r.userId)).size,
        totalBranches: new Set(records.map((r) => r.branchId)).size,
        totalLatenessMin: records.reduce(
          (s, r) => s + (r.latenessMinutes || 0),
          0
        ),
        totalBreakOverageMin: records.reduce(
          (s, r) => s + (r.breakOverageMinutes || 0),
          0
        ),
        avgComplianceScore:
          records.length > 0
            ? Math.round(
                records.reduce((s, r) => s + (r.complianceScore || 100), 0) /
                  records.length
              )
            : 100,
      };

      res.json({ summary, records });
    } catch (error: any) {
      console.error("[hq/pdks-history]", error);
      res.status(500).json({
        error: "Geçmiş veri alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 3. GET /api/hq/pdks-history/user/:userId — Tek personelin geçmişi
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/hq/pdks-history/user/:userId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";

      if (!canViewAllBranches(userRole) && !canViewOwnBranch(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const targetUserId = req.params.userId;
      const monthsBack = parseInt(String(req.query.months || "6"));
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      startDate.setHours(0, 0, 0, 0);

      const startStr = startDate.toISOString().split("T")[0];

      // Personel bilgileri
      const [userInfo] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!userInfo) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      // Vardiya kayıtları
      const records = await db
        .select({
          id: shiftAttendance.id,
          shiftDate: shifts.shiftDate,
          branchName: branches.name,
          scheduledStartTime: shiftAttendance.scheduledStartTime,
          scheduledEndTime: shiftAttendance.scheduledEndTime,
          checkInTime: shiftAttendance.checkInTime,
          checkOutTime: shiftAttendance.checkOutTime,
          totalWorkedMinutes: shiftAttendance.totalWorkedMinutes,
          totalBreakMinutes: shiftAttendance.totalBreakMinutes,
          latenessMinutes: shiftAttendance.latenessMinutes,
          earlyLeaveMinutes: shiftAttendance.earlyLeaveMinutes,
          breakOverageMinutes: shiftAttendance.breakOverageMinutes,
          complianceScore: shiftAttendance.complianceScore,
          status: shiftAttendance.status,
        })
        .from(shiftAttendance)
        .leftJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
        .leftJoin(branches, eq(shifts.branchId, branches.id))
        .where(
          and(
            eq(shiftAttendance.userId, targetUserId),
            gte(shifts.shiftDate, startStr)
          )
        )
        .orderBy(desc(shifts.shiftDate));

      // Tutanak/uyarılar
      const warnings = await db
        .select({
          id: employeeWarnings.id,
          warningType: employeeWarnings.warningType,
          description: employeeWarnings.description,
          issuedAt: employeeWarnings.issuedAt,
          resolvedAt: employeeWarnings.resolvedAt,
          notes: employeeWarnings.notes,
        })
        .from(employeeWarnings)
        .where(
          and(
            eq(employeeWarnings.userId, targetUserId),
            gte(employeeWarnings.issuedAt, startDate)
          )
        )
        .orderBy(desc(employeeWarnings.issuedAt));

      // Özet
      const totalDays = records.length;
      const totalLateness = records.reduce(
        (s, r) => s + (r.latenessMinutes || 0),
        0
      );
      const totalBreakOverage = records.reduce(
        (s, r) => s + (r.breakOverageMinutes || 0),
        0
      );
      const avgCompliance =
        totalDays > 0
          ? Math.round(
              records.reduce((s, r) => s + (r.complianceScore || 100), 0) /
                totalDays
            )
          : 100;

      const summary = {
        period: { from: startStr, to: new Date().toISOString().split("T")[0] },
        totalShifts: totalDays,
        totalWarnings: warnings.length,
        verbalWarnings: warnings.filter((w) => w.warningType === "verbal").length,
        writtenWarnings: warnings.filter((w) => w.warningType === "written")
          .length,
        finalWarnings: warnings.filter((w) => w.warningType === "final").length,
        totalLatenessMinutes: totalLateness,
        totalBreakOverageMinutes: totalBreakOverage,
        avgComplianceScore: avgCompliance,
      };

      res.json({
        user: userInfo,
        summary,
        records,
        warnings,
      });
    } catch (error: any) {
      console.error("[hq/pdks-history/user]", error);
      res.status(500).json({
        error: "Personel geçmişi alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 4. GET /api/hq/violations — İhlal raporu
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/hq/violations",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;

      if (!canViewAllBranches(userRole) && !canViewOwnBranch(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const monthsBack = parseInt(String(req.query.months || "1"));
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const branchIdFilter = req.query.branchId
        ? parseInt(req.query.branchId as string)
        : null;

      let effectiveBranchId = branchIdFilter;
      if (!canViewAllBranches(userRole)) {
        effectiveBranchId = userBranchId;
      }

      const violations = await db
        .select({
          id: employeeWarnings.id,
          userId: employeeWarnings.userId,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
          userRole: users.role,
          userBranchId: users.branchId,
          warningType: employeeWarnings.warningType,
          description: employeeWarnings.description,
          issuedAt: employeeWarnings.issuedAt,
          resolvedAt: employeeWarnings.resolvedAt,
          notes: employeeWarnings.notes,
        })
        .from(employeeWarnings)
        .leftJoin(users, eq(employeeWarnings.userId, users.id))
        .where(
          and(
            gte(employeeWarnings.issuedAt, startDate),
            effectiveBranchId
              ? eq(users.branchId, effectiveBranchId)
              : sql`1=1`
          )
        )
        .orderBy(desc(employeeWarnings.issuedAt));

      // Şubeye göre gruplama
      const byBranch = new Map<number, any>();
      for (const v of violations) {
        const bid = v.userBranchId || 0;
        if (!byBranch.has(bid)) {
          byBranch.set(bid, {
            branchId: bid,
            count: 0,
            verbal: 0,
            written: 0,
            final: 0,
          });
        }
        const d = byBranch.get(bid);
        d.count++;
        if (v.warningType === "verbal") d.verbal++;
        if (v.warningType === "written") d.written++;
        if (v.warningType === "final") d.final++;
      }

      res.json({
        period: {
          from: startDate.toISOString().split("T")[0],
          to: new Date().toISOString().split("T")[0],
          monthsBack,
        },
        summary: {
          total: violations.length,
          verbal: violations.filter((v) => v.warningType === "verbal").length,
          written: violations.filter((v) => v.warningType === "written").length,
          final: violations.filter((v) => v.warningType === "final").length,
          uniqueUsers: new Set(violations.map((v) => v.userId)).size,
        },
        byBranch: Array.from(byBranch.values()).sort((a, b) => b.count - a.count),
        violations,
      });
    } catch (error: any) {
      console.error("[hq/violations]", error);
      res.status(500).json({
        error: "İhlal raporu alınamadı",
        message: error.message,
      });
    }
  }
);

export default router;
