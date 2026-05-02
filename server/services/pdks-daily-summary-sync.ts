/**
 * Rebuilds pdks_daily_summary rows from shift_attendance so the Excel-mode
 * payroll view stays consistent with kiosk closures across branch/HQ/factory.
 *
 * Source of truth: shift_attendance JOIN shifts (authoritative branch_id).
 *
 * Sinks (per (branch, work_date) full rebuild):
 *   1. Synthetic kiosk_sync pdks_excel_imports row for the period — every
 *      summary row for that branch+date under kiosk_sync is wiped and
 *      re-inserted from shift_attendance.
 *   2. The real (operator-uploaded) Excel import for the same branch+month,
 *      if one exists — the (user, date) rows for users with shift_attendance
 *      data are replaced (other users' Excel-uploaded rows are kept). This
 *      ensures payroll sees fresh kiosk-derived data even when an Excel
 *      import exists for the period.
 *
 * Window: rebuilt covers current TR month + previous TR month, so the
 * full active payroll period is always synchronized; backfills/late
 * updates anywhere in that window are reflected on the next run.
 *
 * Pilot rows (notes='PILOT_PRE_DAY1_TEST_2026_04_29') excluded both at
 * source and via full date-level deletion of stale kiosk_sync rows.
 *
 * Scheduling: ≥03:00 TR, lastRunDate-guarded — guaranteed once per TR day,
 * survives missed intervals. Same window rebuilt on process start.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { log } from "../vite";
import { schedulerManager } from "../scheduler-manager";

const PILOT_NOTE = "PILOT_PRE_DAY1_TEST_2026_04_29";
const KIOSK_SYNC_FILENAME = "__kiosk_sync__";
const KIOSK_SYNC_IMPORT_TYPE = "kiosk_sync";
const TR_TZ = "Europe/Istanbul";

interface AttendanceAggregate {
  user_id: string;
  branch_id: number;
  first_swipe: string | null;
  last_swipe: string | null;
  total_swipes: number;
  gross_minutes: number;
  break_minutes: number;
  net_minutes: number;
}

function trDateString(d: Date): string {
  const tr = new Date(d.toLocaleString("en-US", { timeZone: TR_TZ }));
  return `${tr.getFullYear()}-${String(tr.getMonth() + 1).padStart(2, "0")}-${String(tr.getDate()).padStart(2, "0")}`;
}

function trNowParts(): { year: number; month: number; day: number } {
  const tr = new Date(new Date().toLocaleString("en-US", { timeZone: TR_TZ }));
  return { year: tr.getFullYear(), month: tr.getMonth() + 1, day: tr.getDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function syncPdksDailySummaryForDate(workDate: string): Promise<{
  rowsProcessed: number;
  branchesTouched: number;
}> {
  const aggResult = await db.execute(sql`
    SELECT
      sa.user_id,
      s.branch_id AS branch_id,
      MIN(sa.check_in_time) AS first_swipe,
      MAX(sa.check_out_time) AS last_swipe,
      (
        SUM(CASE WHEN sa.check_in_time IS NOT NULL THEN 1 ELSE 0 END)
        + SUM(CASE WHEN sa.check_out_time IS NOT NULL THEN 1 ELSE 0 END)
        + SUM(CASE WHEN sa.break_start_time IS NOT NULL THEN 1 ELSE 0 END)
        + SUM(CASE WHEN sa.break_end_time IS NOT NULL THEN 1 ELSE 0 END)
      )::int AS total_swipes,
      COALESCE(SUM(
        CASE
          WHEN sa.check_in_time IS NOT NULL AND sa.check_out_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (sa.check_out_time - sa.check_in_time)) / 60.0
          ELSE 0
        END
      ), 0)::int AS gross_minutes,
      COALESCE(SUM(COALESCE(sa.total_break_minutes, 0)), 0)::int AS break_minutes,
      COALESCE(SUM(COALESCE(sa.total_worked_minutes, 0)), 0)::int AS net_minutes
    FROM shift_attendance sa
    JOIN shifts s ON s.id = sa.shift_id
    WHERE (sa.notes IS NULL OR sa.notes <> ${PILOT_NOTE})
      AND (
        (sa.check_in_time IS NOT NULL
          AND (sa.check_in_time AT TIME ZONE ${TR_TZ})::date = ${workDate}::date)
        OR (sa.check_out_time IS NOT NULL
          AND (sa.check_out_time AT TIME ZONE ${TR_TZ})::date = ${workDate}::date)
        OR (sa.scheduled_start_time IS NOT NULL
          AND (sa.scheduled_start_time AT TIME ZONE ${TR_TZ})::date = ${workDate}::date)
      )
    GROUP BY sa.user_id, s.branch_id
  `);

  const rows = (aggResult.rows || []) as unknown as AttendanceAggregate[];
  const [year, month] = workDate.split("-").map(Number);

  await db.transaction(async (tx) => {
    // Wipe ALL kiosk_sync rows for this date across every branch's
    // kiosk_sync import for the period — purges stale users and any pilot
    // rows captured before the exclusion existed.
    await tx.execute(sql`
      DELETE FROM pdks_daily_summary pds
      USING pdks_excel_imports pei
      WHERE pds.import_id = pei.id
        AND pei.import_type = ${KIOSK_SYNC_IMPORT_TYPE}
        AND pei.year = ${year}
        AND pei.month = ${month}
        AND (pds.work_date AT TIME ZONE ${TR_TZ})::date = ${workDate}::date
    `);

    if (rows.length === 0) return;

    const branchIds = Array.from(new Set(rows.map(r => Number(r.branch_id))));

    // Resolve target imports: kiosk_sync (always) + real Excel (if exists)
    const kioskSyncImportByBranch = new Map<number, number>();
    const realImportByBranch = new Map<number, number>();

    for (const bId of branchIds) {
      const real = await tx.execute(sql`
        SELECT id FROM pdks_excel_imports
        WHERE branch_id = ${bId} AND year = ${year} AND month = ${month}
          AND import_type <> ${KIOSK_SYNC_IMPORT_TYPE}
        ORDER BY id DESC LIMIT 1
      `);
      if (real.rows.length > 0) {
        realImportByBranch.set(bId, Number((real.rows[0] as { id: number }).id));
      }

      const sync = await tx.execute(sql`
        SELECT id FROM pdks_excel_imports
        WHERE branch_id = ${bId} AND year = ${year} AND month = ${month}
          AND import_type = ${KIOSK_SYNC_IMPORT_TYPE}
        LIMIT 1
      `);
      let syncId: number;
      if (sync.rows.length > 0) {
        syncId = Number((sync.rows[0] as { id: number }).id);
      } else {
        const ins = await tx.execute(sql`
          INSERT INTO pdks_excel_imports
            (branch_id, month, year, file_name, import_type, status,
             total_records, matched_records, unmatched_records, is_finalized)
          VALUES
            (${bId}, ${month}, ${year}, ${KIOSK_SYNC_FILENAME}, ${KIOSK_SYNC_IMPORT_TYPE},
             'completed', 0, 0, 0, false)
          RETURNING id
        `);
        syncId = Number((ins.rows[0] as { id: number }).id);
      }
      kioskSyncImportByBranch.set(bId, syncId);
    }

    for (const row of rows) {
      const bId = Number(row.branch_id);
      const syncImportId = kioskSyncImportByBranch.get(bId)!;
      const realImportId = realImportByBranch.get(bId);

      // kiosk_sync: insert (date-level wipe already done above)
      await tx.execute(sql`
        INSERT INTO pdks_daily_summary
          (import_id, user_id, branch_id, work_date, first_swipe, last_swipe,
           total_swipes, gross_minutes, break_minutes, net_minutes,
           overtime_minutes, is_off_day, is_holiday, is_historical, warnings)
        VALUES
          (${syncImportId}, ${row.user_id}, ${row.branch_id}, ${workDate}::date,
           ${row.first_swipe}, ${row.last_swipe},
           ${row.total_swipes}, ${row.gross_minutes}, ${row.break_minutes}, ${row.net_minutes},
           0, false, false, false, '[]'::jsonb)
      `);

      // Real Excel: per (user, date) replace — keeps non-shift_attendance
      // users' Excel rows intact while exposing fresh kiosk data to payroll.
      if (realImportId !== undefined) {
        await tx.execute(sql`
          DELETE FROM pdks_daily_summary
          WHERE import_id = ${realImportId}
            AND user_id = ${row.user_id}
            AND (work_date AT TIME ZONE ${TR_TZ})::date = ${workDate}::date
        `);
        await tx.execute(sql`
          INSERT INTO pdks_daily_summary
            (import_id, user_id, branch_id, work_date, first_swipe, last_swipe,
             total_swipes, gross_minutes, break_minutes, net_minutes,
             overtime_minutes, is_off_day, is_holiday, is_historical, warnings)
          VALUES
            (${realImportId}, ${row.user_id}, ${row.branch_id}, ${workDate}::date,
             ${row.first_swipe}, ${row.last_swipe},
             ${row.total_swipes}, ${row.gross_minutes}, ${row.break_minutes}, ${row.net_minutes},
             0, false, false, false, '[]'::jsonb)
        `);
      }
    }
  });

  return { rowsProcessed: rows.length, branchesTouched: new Set(rows.map(r => r.branch_id)).size };
}

/**
 * Rebuilds the active payroll window: previous TR month (full) +
 * current TR month (up to today). Covers all dates that any open
 * payroll period could read from pdks_daily_summary.
 */
export async function syncPdksDailySummaryActiveWindow(): Promise<void> {
  const now = trNowParts();
  const prevMonth = now.month === 1 ? 12 : now.month - 1;
  const prevYear = now.month === 1 ? now.year - 1 : now.year;

  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth(prevYear, prevMonth); d++) {
    dates.push(ymd(prevYear, prevMonth, d));
  }
  for (let d = 1; d <= now.day; d++) {
    dates.push(ymd(now.year, now.month, d));
  }

  let totalRows = 0;
  for (const date of dates) {
    try {
      const { rowsProcessed } = await syncPdksDailySummaryForDate(date);
      totalRows += rowsProcessed;
    } catch (e) {
      console.error(`[PDKS-DAILY-SYNC] Window date ${date} error:`, e);
    }
  }
  log(`[PDKS-DAILY-SYNC] Active payroll window (${dates.length} days): ${totalRows} rows total`);
}

let lastRunTrDate: string | null = null;

export function startPdksDailySummarySyncScheduler(): void {
  schedulerManager.registerInterval("pdks-daily-summary-sync", async () => {
    const nowTr = new Date(new Date().toLocaleString("en-US", { timeZone: TR_TZ }));
    if (nowTr.getHours() < 3) return;

    const todayTr = trDateString(new Date());
    if (lastRunTrDate === todayTr) return;

    try {
      await syncPdksDailySummaryActiveWindow();
      lastRunTrDate = todayTr;
    } catch (e) {
      console.error("[PDKS-DAILY-SYNC] Daily window error:", e);
    }
  }, 10 * 60 * 1000);

  syncPdksDailySummaryActiveWindow().catch(e =>
    console.error("[PDKS-DAILY-SYNC] Startup catch-up error:", e)
  );

  log("[PDKS-DAILY-SYNC] Daily summary sync scheduler started (≥03:00 TR, once per day, active payroll window: prev+current TR month)");
}

export const catchUpPdksDailySummary = syncPdksDailySummaryActiveWindow;
