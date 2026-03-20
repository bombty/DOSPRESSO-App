import { db } from "../db";
import {
  factoryWorkerScores,
  factoryShiftSessions,
  factoryProductionOutputs,
  factoryBreakLogs,
  factoryQualityChecks,
  factoryStationBenchmarks,
  users,
} from "@shared/schema";
import { eq, and, gte, lte, sql, inArray, isNull, isNotNull } from "drizzle-orm";

const SCORING_WEIGHTS = {
  production: 0.35,
  waste: 0.10,
  quality: 0.15,
  attendance: 0.25,
  break: 0.15,
};

const DEFAULT_SCORES = {
  production: 70,
  waste: 85,
  quality: 75,
  attendance: 80,
  break: 90,
};

const FACTORY_ROLES = [
  "fabrika_operator",
  "fabrika_personel",
  "fabrika_sorumlu",
  "stajyer",
  "supervisor",
  "supervisor_buddy",
];

const STANDARD_SHIFT_MINUTES = 480;
const ALLOWED_BREAK_MINUTES_PER_SHIFT = 30;

interface ScoreDetails {
  totalProduced: number;
  totalWaste: number;
  totalBreakMinutes: number;
  specialBreakCount: number;
  shiftCount: number;
  totalWorkMinutes: number;
  qualityChecks: number;
  qualityPassRate: number;
}

interface WorkerScoreResult {
  userId: string;
  periodDate: string;
  periodType: string;
  productionScore: number;
  wasteScore: number;
  qualityScore: number;
  attendanceScore: number;
  breakScore: number;
  totalScore: number;
  details: ScoreDetails;
}

async function getStationTargetMap(): Promise<Map<number, number>> {
  const result = await db.execute(
    sql`SELECT id, target_hourly_output FROM factory_stations WHERE is_active = true`
  );
  const map = new Map<number, number>();
  if (result.rows) {
    for (const row of result.rows) {
      const target = Number(row.target_hourly_output || 0);
      if (target > 0) {
        map.set(Number(row.id), target);
      }
    }
  }
  return map;
}

async function getProductionScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number; totalProduced: number; hasData: boolean }> {
  try {
    const stationTargets = await getStationTargetMap();

    const sessions = await db
      .select({
        totalProduced: factoryShiftSessions.totalProduced,
        stationId: factoryShiftSessions.stationId,
        workMinutes: factoryShiftSessions.workMinutes,
        checkInTime: factoryShiftSessions.checkInTime,
        checkOutTime: factoryShiftSessions.checkOutTime,
        status: factoryShiftSessions.status,
      })
      .from(factoryShiftSessions)
      .where(
        and(
          eq(factoryShiftSessions.userId, userId),
          gte(factoryShiftSessions.checkInTime, startDate),
          lte(factoryShiftSessions.checkInTime, endDate)
        )
      );

    const validSessions = sessions.filter(s => {
      const produced = s.totalProduced || 0;
      const minutes = s.workMinutes || 0;
      return produced > 0 && minutes > 0;
    });

    if (validSessions.length === 0) {
      const totalProduced = sessions.reduce((sum, s) => sum + (s.totalProduced || 0), 0);
      return { score: DEFAULT_SCORES.production, totalProduced, hasData: false };
    }

    const totalProduced = validSessions.reduce((sum, s) => sum + (s.totalProduced || 0), 0);

    let weightedScore = 0;
    let weightTotal = 0;

    for (const session of validSessions) {
      const produced = session.totalProduced || 0;
      const minutes = session.workMinutes || 0;
      if (minutes <= 0) continue;

      const hourlyRate = (produced / minutes) * 60;
      const targetRate = stationTargets.get(session.stationId) || 80;
      const efficiency = Math.min(130, (hourlyRate / targetRate) * 100);
      weightedScore += efficiency * minutes;
      weightTotal += minutes;
    }

    const score = weightTotal > 0
      ? Math.min(100, Math.round(weightedScore / weightTotal))
      : DEFAULT_SCORES.production;

    return { score, totalProduced, hasData: true };
  } catch (error) {
    console.error("[Factory Scoring] Production score error:", error);
    return { score: DEFAULT_SCORES.production, totalProduced: 0, hasData: false };
  }
}

async function getWasteScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number; totalWaste: number; hasData: boolean }> {
  try {
    const outputs = await db
      .select({
        producedQuantity: factoryProductionOutputs.producedQuantity,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        wasteDoughKg: factoryProductionOutputs.wasteDoughKg,
        wasteProductCount: factoryProductionOutputs.wasteProductCount,
      })
      .from(factoryProductionOutputs)
      .where(
        and(
          eq(factoryProductionOutputs.userId, userId),
          gte(factoryProductionOutputs.createdAt, startDate),
          lte(factoryProductionOutputs.createdAt, endDate)
        )
      );

    if (outputs.length === 0) {
      const sessions = await db
        .select({
          totalProduced: factoryShiftSessions.totalProduced,
          totalWaste: factoryShiftSessions.totalWaste,
        })
        .from(factoryShiftSessions)
        .where(
          and(
            eq(factoryShiftSessions.userId, userId),
            gte(factoryShiftSessions.checkInTime, startDate),
            lte(factoryShiftSessions.checkInTime, endDate),
            eq(factoryShiftSessions.status, "completed")
          )
        );

      if (sessions.length === 0) {
        return { score: DEFAULT_SCORES.waste, totalWaste: 0, hasData: false };
      }

      const totalProduced = sessions.reduce((s, x) => s + (x.totalProduced || 0), 0);
      const totalWaste = sessions.reduce((s, x) => s + (x.totalWaste || 0), 0);

      if (totalProduced === 0) {
        return { score: DEFAULT_SCORES.waste, totalWaste, hasData: totalWaste > 0 };
      }

      const wasteRate = totalWaste / (totalProduced + totalWaste);
      const score = Math.max(0, Math.round(100 - wasteRate * 500));
      return { score: Math.min(100, score), totalWaste, hasData: true };
    }

    const totalProduced = outputs.reduce((s, o) => s + Number(o.producedQuantity || 0), 0);
    const totalWaste = outputs.reduce((s, o) => {
      const waste = Number(o.wasteQuantity || 0);
      const doughKg = Number(o.wasteDoughKg || 0);
      const productCount = o.wasteProductCount || 0;
      return s + waste + doughKg + productCount;
    }, 0);

    if (totalProduced === 0) {
      return { score: DEFAULT_SCORES.waste, totalWaste, hasData: totalWaste > 0 };
    }

    const wasteRate = totalWaste / (totalProduced + totalWaste);
    const score = Math.max(0, Math.round(100 - wasteRate * 500));
    return { score: Math.min(100, score), totalWaste, hasData: true };
  } catch (error) {
    console.error("[Factory Scoring] Waste score error:", error);
    return { score: DEFAULT_SCORES.waste, totalWaste: 0, hasData: false };
  }
}

async function getQualityScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number; totalChecks: number; passRate: number; hasData: boolean }> {
  try {
    const checks = await db
      .select({
        decision: factoryQualityChecks.decision,
      })
      .from(factoryQualityChecks)
      .where(
        and(
          eq(factoryQualityChecks.producerId, userId),
          gte(factoryQualityChecks.checkedAt, startDate),
          lte(factoryQualityChecks.checkedAt, endDate)
        )
      );

    if (checks.length === 0) {
      return { score: DEFAULT_SCORES.quality, totalChecks: 0, passRate: 0, hasData: false };
    }

    const passed = checks.filter(
      (c) => c.decision === "approved" || c.decision === "pass" || c.decision === "kabul"
    ).length;
    const passRate = Math.round((passed / checks.length) * 100);
    const score = Math.min(100, passRate);

    return { score, totalChecks: checks.length, passRate, hasData: true };
  } catch (error) {
    console.error("[Factory Scoring] Quality score error:", error);
    return { score: DEFAULT_SCORES.quality, totalChecks: 0, passRate: 0, hasData: false };
  }
}

async function getAttendanceScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number; shiftCount: number; totalWorkMinutes: number; hasData: boolean }> {
  try {
    const sessions = await db
      .select({
        checkInTime: factoryShiftSessions.checkInTime,
        checkOutTime: factoryShiftSessions.checkOutTime,
        workMinutes: factoryShiftSessions.workMinutes,
        status: factoryShiftSessions.status,
        notes: factoryShiftSessions.notes,
      })
      .from(factoryShiftSessions)
      .where(
        and(
          eq(factoryShiftSessions.userId, userId),
          gte(factoryShiftSessions.checkInTime, startDate),
          lte(factoryShiftSessions.checkInTime, endDate)
        )
      );

    if (sessions.length < 1) {
      return { score: DEFAULT_SCORES.attendance, shiftCount: 0, totalWorkMinutes: 0, hasData: false };
    }

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const totalSessions = sessions.length;
    const completionRate = totalSessions > 0 ? completedSessions.length / totalSessions : 0;

    let attendancePenalty = 0;
    const totalWorkMinutes = sessions.reduce((sum, s) => {
      const isAutoClosed = s.notes?.includes('[Otomatik kapatıldı');
      if (isAutoClosed) {
        attendancePenalty += 5;
        return sum + 510;
      }
      if (s.workMinutes && s.workMinutes > 0) return sum + s.workMinutes;
      if (s.checkOutTime && s.checkInTime) {
        const diff = (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000;
        return sum + Math.max(0, diff);
      }
      return sum;
    }, 0);

    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const workDays = Math.ceil(daysDiff * 6 / 7);
    const expectedMinutes = workDays * STANDARD_SHIFT_MINUTES;

    let score: number;
    if (expectedMinutes > 0) {
      const ratio = totalWorkMinutes / expectedMinutes;
      score = Math.min(100, Math.round(ratio * 100));
    } else {
      score = completedSessions.length > 0 ? 85 : DEFAULT_SCORES.attendance;
    }

    score = Math.max(0, score - attendancePenalty);

    const abandonedCount = sessions.filter((s) => s.status === "abandoned").length;
    score = Math.max(0, score - abandonedCount * 10);

    return {
      score: Math.min(100, Math.max(0, score)),
      shiftCount: totalSessions,
      totalWorkMinutes: Math.round(totalWorkMinutes),
      hasData: true,
    };
  } catch (error) {
    console.error("[Factory Scoring] Attendance score error:", error);
    return { score: DEFAULT_SCORES.attendance, shiftCount: 0, totalWorkMinutes: 0, hasData: false };
  }
}

async function getBreakScore(
  userId: string,
  startDate: Date,
  endDate: Date,
  shiftCount: number
): Promise<{ score: number; totalBreakMinutes: number; specialBreakCount: number; hasData: boolean }> {
  try {
    const breaks = await db
      .select({
        breakReason: factoryBreakLogs.breakReason,
        startedAt: factoryBreakLogs.startedAt,
        endedAt: factoryBreakLogs.endedAt,
        durationMinutes: factoryBreakLogs.durationMinutes,
      })
      .from(factoryBreakLogs)
      .where(
        and(
          eq(factoryBreakLogs.userId, userId),
          gte(factoryBreakLogs.startedAt, startDate),
          lte(factoryBreakLogs.startedAt, endDate)
        )
      );

    if (breaks.length === 0) {
      return { score: DEFAULT_SCORES.break, totalBreakMinutes: 0, specialBreakCount: 0, hasData: false };
    }

    let totalBreakMinutes = 0;
    let specialBreakCount = 0;

    for (const brk of breaks) {
      if (brk.breakReason === "ozel_ihtiyac") {
        specialBreakCount++;
      }
      if (brk.durationMinutes && brk.durationMinutes > 0) {
        totalBreakMinutes += brk.durationMinutes;
      } else if (brk.endedAt && brk.startedAt) {
        const diff = (new Date(brk.endedAt).getTime() - new Date(brk.startedAt).getTime()) / 60000;
        totalBreakMinutes += Math.max(0, Math.round(diff));
      }
    }

    const allowedBreak = Math.max(1, shiftCount) * ALLOWED_BREAK_MINUTES_PER_SHIFT;
    const excessRatio = totalBreakMinutes > allowedBreak
      ? (totalBreakMinutes - allowedBreak) / allowedBreak
      : 0;

    const score = Math.max(0, Math.round(100 - excessRatio * 50 - specialBreakCount * 2));

    return {
      score: Math.min(100, score),
      totalBreakMinutes: Math.round(totalBreakMinutes),
      specialBreakCount,
      hasData: true,
    };
  } catch (error) {
    console.error("[Factory Scoring] Break score error:", error);
    return { score: DEFAULT_SCORES.break, totalBreakMinutes: 0, specialBreakCount: 0, hasData: false };
  }
}

export async function calculateWorkerScore(
  userId: string,
  startDate: Date,
  endDate: Date,
  periodType: string = "daily"
): Promise<WorkerScoreResult> {
  const [production, waste, quality, attendance, breakData] = await Promise.all([
    getProductionScore(userId, startDate, endDate),
    getWasteScore(userId, startDate, endDate),
    getQualityScore(userId, startDate, endDate),
    getAttendanceScore(userId, startDate, endDate),
    getBreakScore(userId, startDate, endDate, 0).then(async (initial) => {
      return initial;
    }),
  ]);

  const breakResult = await getBreakScore(userId, startDate, endDate, attendance.shiftCount);

  const totalScore = Math.round(
    production.score * SCORING_WEIGHTS.production +
    waste.score * SCORING_WEIGHTS.waste +
    quality.score * SCORING_WEIGHTS.quality +
    attendance.score * SCORING_WEIGHTS.attendance +
    breakResult.score * SCORING_WEIGHTS.break
  );

  const dateStr = startDate.toISOString().split("T")[0];

  return {
    userId,
    periodDate: dateStr,
    periodType,
    productionScore: production.score,
    wasteScore: waste.score,
    qualityScore: quality.score,
    attendanceScore: attendance.score,
    breakScore: breakResult.score,
    totalScore: Math.min(100, totalScore),
    details: {
      totalProduced: production.totalProduced,
      totalWaste: waste.totalWaste,
      totalBreakMinutes: breakResult.totalBreakMinutes,
      specialBreakCount: breakResult.specialBreakCount,
      shiftCount: attendance.shiftCount,
      totalWorkMinutes: attendance.totalWorkMinutes,
      qualityChecks: quality.totalChecks,
      qualityPassRate: quality.passRate,
    },
  };
}

export async function getFactoryWorkers(): Promise<{ id: string; firstName: string; lastName: string; role: string }[]> {
  const factoryBranch = await db.execute(
    sql`SELECT id FROM branches WHERE name ILIKE '%Fabrika%' LIMIT 1`
  );
  if (!factoryBranch.rows || factoryBranch.rows.length === 0) return [];
  const branchId = Number(factoryBranch.rows[0].id);

  const workers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        inArray(users.role, FACTORY_ROLES)
      )
    );

  return workers.map((w) => ({
    id: w.id,
    firstName: w.firstName || "",
    lastName: w.lastName || "",
    role: w.role || "",
  }));
}

export async function calculateAllWorkerScores(
  startDate: Date,
  endDate: Date,
  periodType: string = "daily"
): Promise<WorkerScoreResult[]> {
  const workers = await getFactoryWorkers();
  const scores: WorkerScoreResult[] = [];

  for (const worker of workers) {
    try {
      const score = await calculateWorkerScore(worker.id, startDate, endDate, periodType);
      scores.push(score);
    } catch (err) {
      console.error(`[Factory Scoring] Error for ${worker.firstName} ${worker.lastName}:`, err);
    }
  }

  return scores;
}

export async function saveWorkerScores(scores: WorkerScoreResult[]): Promise<number> {
  let saved = 0;

  for (const score of scores) {
    try {
      const existing = await db
        .select({ id: factoryWorkerScores.id })
        .from(factoryWorkerScores)
        .where(
          and(
            eq(factoryWorkerScores.userId, score.userId),
            eq(factoryWorkerScores.periodDate, score.periodDate),
            eq(factoryWorkerScores.periodType, score.periodType || "daily")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(factoryWorkerScores)
          .set({
            productionScore: String(score.productionScore),
            wasteScore: String(score.wasteScore),
            qualityScore: String(score.qualityScore),
            attendanceScore: String(score.attendanceScore),
            breakScore: String(score.breakScore),
            totalScore: String(score.totalScore),
            totalProduced: String(score.details.totalProduced),
            totalWaste: String(score.details.totalWaste),
            totalBreakMinutes: score.details.totalBreakMinutes,
            specialBreakCount: score.details.specialBreakCount,
            generatedAt: new Date(),
          })
          .where(eq(factoryWorkerScores.id, existing[0].id));
      } else {
        await db.insert(factoryWorkerScores).values({
          userId: score.userId,
          periodDate: score.periodDate,
          periodType: score.periodType || "daily",
          productionScore: String(score.productionScore),
          wasteScore: String(score.wasteScore),
          qualityScore: String(score.qualityScore),
          attendanceScore: String(score.attendanceScore),
          breakScore: String(score.breakScore),
          totalScore: String(score.totalScore),
          totalProduced: String(score.details.totalProduced),
          totalWaste: String(score.details.totalWaste),
          totalBreakMinutes: score.details.totalBreakMinutes,
          specialBreakCount: score.details.specialBreakCount,
        });
      }
      saved++;
    } catch (err) {
      console.error(`[Factory Scoring] Save error for ${score.userId}:`, err);
    }
  }

  return saved;
}

export async function calculateAndSaveDailyScores(): Promise<{ calculated: number; saved: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scores = await calculateAllWorkerScores(yesterday, today, "daily");
  const saved = await saveWorkerScores(scores);

  console.log(
    `[Factory Scoring] Daily: ${scores.length} calculated, ${saved} saved for ${yesterday.toISOString().split("T")[0]}`
  );

  return { calculated: scores.length, saved };
}

export async function calculateAndSaveWeeklyScores(): Promise<{ calculated: number; saved: number }> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scores = await calculateAllWorkerScores(weekAgo, today, "weekly");
  const saved = await saveWorkerScores(scores);

  console.log(
    `[Factory Scoring] Weekly: ${scores.length} calculated, ${saved} saved for week ending ${today.toISOString().split("T")[0]}`
  );

  return { calculated: scores.length, saved };
}

export async function backfillNullScores(): Promise<number> {
  try {
    const nullScores = await db
      .select()
      .from(factoryWorkerScores)
      .where(isNull(factoryWorkerScores.totalScore))
      .limit(100);

    if (nullScores.length === 0) return 0;

    let filled = 0;
    for (const record of nullScores) {
      try {
        const periodDate = new Date(record.periodDate);
        const periodEnd = new Date(periodDate);
        if (record.periodType === "weekly") {
          periodEnd.setDate(periodEnd.getDate() + 7);
        } else if (record.periodType === "monthly") {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setDate(periodEnd.getDate() + 1);
        }

        const score = await calculateWorkerScore(
          record.userId,
          periodDate,
          periodEnd,
          record.periodType || "daily"
        );

        await db
          .update(factoryWorkerScores)
          .set({
            productionScore: String(score.productionScore),
            wasteScore: String(score.wasteScore),
            qualityScore: String(score.qualityScore),
            attendanceScore: String(score.attendanceScore),
            breakScore: String(score.breakScore),
            totalScore: String(score.totalScore),
            totalProduced: String(score.details.totalProduced),
            totalWaste: String(score.details.totalWaste),
            totalBreakMinutes: score.details.totalBreakMinutes,
            specialBreakCount: score.details.specialBreakCount,
            generatedAt: new Date(),
          })
          .where(eq(factoryWorkerScores.id, record.id));
        filled++;
      } catch (err) {
        console.error(`[Factory Scoring] Backfill error for record ${record.id}:`, err);
      }
    }

    console.log(`[Factory Scoring] Backfilled ${filled}/${nullScores.length} NULL scores`);
    return filled;
  } catch (error) {
    console.error("[Factory Scoring] Backfill failed:", error);
    return 0;
  }
}

export async function closeOrphanedBreakLogs(): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 8);

    const result = await db.execute(sql`
      UPDATE factory_break_logs 
      SET ended_at = started_at + INTERVAL '15 minutes',
          duration_minutes = 15,
          auto_flagged = true,
          notes = COALESCE(notes, '') || ' [Otomatik kapatıldı - sistem]'
      WHERE ended_at IS NULL 
        AND started_at < ${cutoff}
    `);

    const count = Number(result.rowCount || 0);
    if (count > 0) {
      console.log(`[Factory Scoring] Closed ${count} orphaned break logs older than 8h`);
    }
    return count;
  } catch (error) {
    console.error("[Factory Scoring] Close orphaned breaks failed:", error);
    return 0;
  }
}

export async function cleanupStaleShiftSessions(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      UPDATE factory_shift_sessions 
      SET status = 'completed',
          check_out_time = NOW(),
          notes = COALESCE(notes, '') || ' [Otomatik kapatıldı — 12 saatten eski]'
      WHERE status = 'active'
        AND check_in_time < ${cutoff}
    `);
    const count = Number(result.rowCount || 0);
    if (count > 0) {
      console.log(`[Factory Kiosk] Cleaned ${count} stale shift sessions (>12h)`);
    }
    return count;
  } catch (error) {
    console.error("[Factory Kiosk] Stale shift cleanup failed:", error);
    return 0;
  }
}

export async function getWorkerScoreSummary(
  userId: string,
  days: number = 30
): Promise<{
  latestScore: number;
  avgScore: number;
  trend: "up" | "down" | "stable";
  scoreCount: number;
  breakdown: { production: number; waste: number; quality: number; attendance: number; break: number };
} | null> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const scores = await db
      .select()
      .from(factoryWorkerScores)
      .where(
        and(
          eq(factoryWorkerScores.userId, userId),
          gte(factoryWorkerScores.periodDate, since.toISOString().split("T")[0])
        )
      )
      .orderBy(sql`${factoryWorkerScores.periodDate} DESC`)
      .limit(30);

    if (scores.length === 0) return null;

    const latest = scores[0];
    const avgScore = Math.round(
      scores.reduce((s, x) => s + Number(x.totalScore || 0), 0) / scores.length
    );

    let trend: "up" | "down" | "stable" = "stable";
    if (scores.length >= 3) {
      const recentAvg = scores.slice(0, Math.ceil(scores.length / 2))
        .reduce((s, x) => s + Number(x.totalScore || 0), 0) / Math.ceil(scores.length / 2);
      const olderAvg = scores.slice(Math.ceil(scores.length / 2))
        .reduce((s, x) => s + Number(x.totalScore || 0), 0) / (scores.length - Math.ceil(scores.length / 2));

      if (recentAvg > olderAvg + 3) trend = "up";
      else if (recentAvg < olderAvg - 3) trend = "down";
    }

    return {
      latestScore: Number(latest.totalScore || 0),
      avgScore,
      trend,
      scoreCount: scores.length,
      breakdown: {
        production: Number(latest.productionScore || 0),
        waste: Number(latest.wasteScore || 0),
        quality: Number(latest.qualityScore || 0),
        attendance: Number(latest.attendanceScore || 0),
        break: Number(latest.breakScore || 0),
      },
    };
  } catch (error) {
    console.error("[Factory Scoring] Summary error:", error);
    return null;
  }
}
