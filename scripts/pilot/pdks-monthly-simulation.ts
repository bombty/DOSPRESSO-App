/**
 * B4 — Ay Sonu Puantaj Simülasyonu (READ-ONLY)
 * Task #287 — Sprint 2 Pilot
 *
 * KULLANIM:
 *   tsx scripts/pilot/pdks-monthly-simulation.ts                  # default current month
 *   tsx scripts/pilot/pdks-monthly-simulation.ts --year=2026 --month=5
 *
 * READ-ONLY GARANTİSİ: Hem yerel `pg.Pool` hem de production Drizzle
 * `server/db.ts` pool'u monkey-patch edilir; SELECT/SHOW/EXPLAIN/WITH
 * dışında her query throw eder. `getMonthClassification()` Drizzle
 * `db` üzerinden gider — guard her iki yolu da kapsar.
 *
 * KAPSAM (142 payroll personeli):
 *   Aktif + approved + !deleted + role NOT IN (admin, sube_kiosk,
 *   yatirimci_*, ceo, cgo) + first_name NOT LIKE 'TEST%' + username
 *   NOT LIKE 'test%'. Filtreleme dışı kullanıcılar bordro hesabına
 *   girmez (kiosk-only / executive / yatırımcı / test hesapları).
 *
 * ÇIKTI: docs/audit/pdks-monthly-simulation-<YYYY>-<MM>.md
 */
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { getMonthClassification, type PdksMonthSummary } from '../../server/lib/pdks-engine';
import { pool as drizzlePool } from '../../server/db';

// ---------------- CLI args ----------------
const args: Record<string, string> = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  })
);
const today = new Date();
const YEAR = parseInt(args.year || String(today.getFullYear()), 10);
const MONTH = parseInt(args.month || String(today.getMonth() + 1), 10);
const MM = String(MONTH).padStart(2, '0');
const MONTH_START = `${YEAR}-${MM}-01`;
const MONTH_END_DAY = new Date(YEAR, MONTH, 0).getDate();
const MONTH_END = `${YEAR}-${MM}-${String(MONTH_END_DAY).padStart(2, '0')}`;

// ---------------- READ-ONLY guard ----------------
// Allow: SELECT, SHOW, EXPLAIN, WITH ... SELECT, SET (session local). Anything
// else throws synchronously before hitting the wire.
const READ_OK_RX = /^\s*(select|show|explain|with\b[\s\S]+select|set\s+(local|session)\s)/i;
const STRICT_BLOCK_RX = /\b(update|insert\s+into|delete\s+from|truncate|alter|drop|create|grant|revoke|comment\s+on|copy\s+\w+\s+from)\b/i;

function guardSql(sql: string): void {
  if (!READ_OK_RX.test(sql) || STRICT_BLOCK_RX.test(sql)) {
    throw new Error(`READ-ONLY VIOLATION: ${sql.slice(0, 160)}`);
  }
}

function patchPoolReadOnly(p: { query: PoolQuery }): void {
  const orig = p.query.bind(p) as PoolQuery;
  const wrapped: PoolQuery = ((textOrConfig: string | { text: string }, params?: unknown[]) => {
    const sql = typeof textOrConfig === 'string' ? textOrConfig : textOrConfig?.text;
    if (sql) guardSql(sql);
    return orig(textOrConfig as never, params as never);
  }) as PoolQuery;
  p.query = wrapped;
}

type PoolQuery = (text: string | { text: string }, params?: unknown[]) => Promise<QueryResult>;

const localPool = new Pool({ connectionString: process.env.DATABASE_URL });
patchPoolReadOnly(localPool as unknown as { query: PoolQuery });
patchPoolReadOnly(drizzlePool as unknown as { query: PoolQuery });

async function q<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const r = await localPool.query<T>(sql, params as unknown[]);
  return r.rows;
}

// ---------------- Türler ----------------
interface ActiveUser {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  branch_id: number | null;
  branch_name: string | null;
  base_salary_raw: number | null;
  weekly_hours: number | null;
}

interface PayrollRow {
  user: ActiveUser;
  summary: PdksMonthSummary;
  expectedWorkDays: number;
  baseSalaryTL: number | null;
  proratedGrossTL: number | null;
  overtimePayTL: number | null;
  unpaidLeaveDeductionTL: number | null;
  estimatedGrossTL: number | null;
  anomalies: string[];
}

interface OpenShiftRow {
  id: number;
  user_id: string;
  user_name: string;
  branch_name: string | null;
  check_in_time: string;
  status: string;
}

interface DailySummaryMismatch {
  user_id: string;
  user_name: string;
  date: string;
  ds_minutes: number;
  engine_minutes: number;
  diff: number;
}

interface LeaveDayMismatch {
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  declared_days: number | null;
  computed_days: number;
}

// ---------------- Helpers ----------------
/**
 * Schema (employee_salaries.base_salary) "kuruş cinsinden (100 = 1 TL)" diyor;
 * pilot DB'de değerler TL aralığında (29500-70000) görünüyor. Birim
 * tutarsızlığı global anomali (A6) olarak rapor edilir. Heuristik:
 * < 1_000_000 → TL, aksi halde kuruş.
 */
function tlFromKurus(k: number | null | undefined): number | null {
  if (k == null) return null;
  return k < 1_000_000 ? Math.round(k) : Math.round(k / 100);
}
function fmtTL(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}s ${m}d`;
}
function workdaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}
function userDisplayName(u: { first_name: string | null; last_name: string | null; username: string }): string {
  const n = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return n || u.username;
}

// ---------------- Veri toplama ----------------
const NON_PAYROLL_ROLES = ['admin', 'sube_kiosk', 'yatirimci_branch', 'yatirimci_hq', 'ceo', 'cgo'];

async function loadActiveUsers(): Promise<ActiveUser[]> {
  return q<ActiveUser>(
    `
    SELECT u.id, u.username, u.first_name, u.last_name, u.role,
           u.branch_id, b.name AS branch_name,
           es.base_salary AS base_salary_raw, es.weekly_hours
    FROM users u
    LEFT JOIN branches b ON b.id = u.branch_id
    LEFT JOIN LATERAL (
      SELECT base_salary, weekly_hours
      FROM employee_salaries
      WHERE user_id = u.id AND is_active = true
        AND effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC LIMIT 1
    ) es ON true
    WHERE u.is_active = true
      AND u.account_status = 'approved'
      AND u.deleted_at IS NULL
      AND NOT (u.role = ANY($2::text[]))
      AND (u.first_name IS NULL OR u.first_name NOT ILIKE 'TEST%')
      AND u.username NOT ILIKE 'test%'
    ORDER BY u.role, u.first_name, u.last_name
    `,
    [MONTH_START, NON_PAYROLL_ROLES]
  );
}

interface CountersRow {
  pdks_records: number;
  shift_att: number;
  shift_att_no_co: number;
  leave_req_approved: number;
  leave_req_pending: number;
  daily_summary: number;
  monthly_stats: number;
}

async function envCounters(): Promise<CountersRow> {
  const [r] = await q<CountersRow>(
    `
    SELECT
      (SELECT count(*)::int FROM pdks_records WHERE record_date BETWEEN $1 AND $2) AS pdks_records,
      (SELECT count(*)::int FROM shift_attendance WHERE check_in_time >= $1::timestamp AND check_in_time < ($2::date + INTERVAL '1 day')) AS shift_att,
      (SELECT count(*)::int FROM shift_attendance WHERE check_in_time >= $1::timestamp AND check_in_time < ($2::date + INTERVAL '1 day') AND check_out_time IS NULL AND status NOT IN ('scheduled','cancelled')) AS shift_att_no_co,
      (SELECT count(*)::int FROM leave_requests WHERE status='approved' AND start_date <= $2 AND end_date >= $1) AS leave_req_approved,
      (SELECT count(*)::int FROM leave_requests WHERE status IN ('pending','requested') AND start_date <= $2 AND end_date >= $1) AS leave_req_pending,
      (SELECT count(*)::int FROM pdks_daily_summary WHERE work_date >= $1::timestamp AND work_date < ($2::date + INTERVAL '1 day')) AS daily_summary,
      (SELECT count(*)::int FROM pdks_monthly_stats WHERE year=$3 AND month=$4) AS monthly_stats
    `,
    [MONTH_START, MONTH_END, YEAR, MONTH]
  );
  return r;
}

async function detectGlobalAnomalies(payrollUserIds: string[]): Promise<string[]> {
  const out: string[] = [];

  const sa = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM shift_attendance
     WHERE check_in_time >= $1::timestamp AND check_in_time < ($2::date + INTERVAL '1 day')
       AND check_out_time IS NULL AND status NOT IN ('scheduled','cancelled')`,
    [MONTH_START, MONTH_END]
  );
  if (sa[0].n > 0) out.push(`A1: shift_attendance.check_out_time NULL — ${sa[0].n} kayıt (vardiya açık kalmış, payroll için kritik). Detay §5.1.`);

  const ds = await q<{ n: number }>(
    `SELECT count(DISTINCT u.id)::int AS n FROM users u
     WHERE u.id = ANY($3::text[])
       AND EXISTS (SELECT 1 FROM pdks_records r WHERE r.user_id = u.id AND r.record_date BETWEEN $1 AND $2)
       AND NOT EXISTS (SELECT 1 FROM pdks_daily_summary d WHERE d.user_id = u.id AND d.work_date >= $1::timestamp AND d.work_date < ($2::date + INTERVAL '1 day'))`,
    [MONTH_START, MONTH_END, payrollUserIds]
  );
  if (ds[0].n > 0) out.push(`A2: pdks_records var ama pdks_daily_summary boş — ${ds[0].n} payroll kullanıcısı için import işlenmemiş.`);

  const lr = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM leave_requests
     WHERE start_date <= $2 AND end_date >= $1 AND status IN ('pending','requested')`,
    [MONTH_START, MONTH_END]
  );
  if (lr[0].n > 0) out.push(`A3: ${lr[0].n} bekleyen izin talebi ay içinde overlap; ay sonu öncesi onaylanmalı.`);

  const ms = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM pdks_monthly_stats WHERE year=$1 AND month=$2`,
    [YEAR, MONTH]
  );
  if (ms[0].n > 0) out.push(`A4: pdks_monthly_stats zaten ${ms[0].n} satır içeriyor — bu simülasyon canlı veriyle değil; gerçek hesap üzerine yazar.`);

  const es = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM users u
     WHERE u.id = ANY($2::text[])
       AND NOT EXISTS (
         SELECT 1 FROM employee_salaries es
         WHERE es.user_id = u.id AND es.is_active=true
           AND es.effective_from <= $1::date
           AND (es.effective_to IS NULL OR es.effective_to >= $1::date)
       )`,
    [MONTH_START, payrollUserIds]
  );
  if (es[0].n > 0) out.push(`A5: ${es[0].n} payroll personeli için employee_salaries kaydı yok — bordro hesaplanamaz.`);

  const sal = await q<{ n: number; mx: number; mn: number }>(
    `SELECT count(*)::int AS n, max(base_salary)::int AS mx, min(base_salary)::int AS mn
     FROM employee_salaries WHERE is_active=true AND base_salary > 0`
  );
  if (sal[0].n > 0 && sal[0].mx < 1_000_000) {
    out.push(`A6: employee_salaries.base_salary birim tutarsızlığı — schema "kuruş" (×100) diyor, data TL gibi (min=${sal[0].mn}, max=${sal[0].mx}). Script TL kabul ediyor; gerçek bordrodan önce şema yorumu netleşmeli.`);
  }

  return out;
}

async function fetchOpenShifts(payrollUserIds: string[]): Promise<OpenShiftRow[]> {
  return q<OpenShiftRow>(
    `SELECT sa.id, sa.user_id,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name,' ',u.last_name)), ''), u.username) AS user_name,
            b.name AS branch_name,
            sa.check_in_time::text AS check_in_time,
            sa.status
     FROM shift_attendance sa
     JOIN users u ON u.id = sa.user_id
     LEFT JOIN branches b ON b.id = u.branch_id
     WHERE sa.check_in_time >= $1::timestamp
       AND sa.check_in_time < ($2::date + INTERVAL '1 day')
       AND sa.check_out_time IS NULL
       AND sa.status NOT IN ('scheduled','cancelled')
       AND sa.user_id = ANY($3::text[])
     ORDER BY sa.check_in_time DESC
     LIMIT 200`,
    [MONTH_START, MONTH_END, payrollUserIds]
  );
}

/**
 * Engine'in classifyDay'inden gelen worked minutes ile pdks_daily_summary.net_minutes
 * arasındaki farkları tespit eder. Aynı gün için fark ≥ 30 dk → mismatch.
 */
async function fetchDailySummaryMismatches(
  rows: PayrollRow[]
): Promise<DailySummaryMismatch[]> {
  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.user.id);
  const dsRows = await q<{ user_id: string; work_date: string; net_minutes: number | null }>(
    `SELECT user_id, to_char(work_date, 'YYYY-MM-DD') AS work_date, net_minutes
     FROM pdks_daily_summary
     WHERE work_date >= $1::timestamp AND work_date < ($2::date + INTERVAL '1 day')
       AND user_id = ANY($3::text[])`,
    [MONTH_START, MONTH_END, userIds]
  );
  const byKey = new Map<string, number>();
  for (const d of dsRows) byKey.set(`${d.user_id}|${d.work_date}`, d.net_minutes ?? 0);

  const out: DailySummaryMismatch[] = [];
  for (const r of rows) {
    for (const day of r.summary.days) {
      const k = `${r.user.id}|${day.date}`;
      if (!byKey.has(k)) continue;
      const dsMin = byKey.get(k)!;
      const diff = Math.abs(dsMin - day.workedMinutes);
      if (diff >= 30) {
        out.push({
          user_id: r.user.id,
          user_name: userDisplayName(r.user),
          date: day.date,
          ds_minutes: dsMin,
          engine_minutes: day.workedMinutes,
          diff,
        });
      }
    }
  }
  return out;
}

/**
 * leave_requests.daysCount alanı (varsa) ile gerçek (endDate - startDate + 1)
 * günü arasında fark var mı? +/-1 normaldir; ≥2 fark → mismatch.
 */
async function fetchLeaveDayMismatches(payrollUserIds: string[]): Promise<LeaveDayMismatch[]> {
  const rows = await q<{
    user_id: string;
    user_name: string;
    start_date: string;
    end_date: string;
    declared_days: number | null;
    computed_days: number;
  }>(
    `SELECT lr.user_id,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name,' ',u.last_name)), ''), u.username) AS user_name,
            lr.start_date::text AS start_date,
            lr.end_date::text AS end_date,
            lr.total_days AS declared_days,
            (lr.end_date::date - lr.start_date::date + 1)::int AS computed_days
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     WHERE lr.status = 'approved'
       AND lr.start_date <= $2 AND lr.end_date >= $1
       AND lr.user_id = ANY($3::text[])
       AND lr.total_days IS NOT NULL
       AND ABS(lr.total_days - (lr.end_date::date - lr.start_date::date + 1)) >= 2`,
    [MONTH_START, MONTH_END, payrollUserIds]
  );
  return rows;
}

// ---------------- Per-personel hesap ----------------
function computePayroll(user: ActiveUser, summary: PdksMonthSummary, expectedWorkDays: number): PayrollRow {
  const baseTL = tlFromKurus(user.base_salary_raw);
  const anomalies: string[] = [];

  if (summary.totalOvertimeMinutes < 0) anomalies.push(`P1: Negatif fazla mesai (${summary.totalOvertimeMinutes} dk) — engine bug.`);

  const totalWorkedMin = summary.days.reduce((s, d) => s + d.workedMinutes, 0);
  if (totalWorkedMin > 270 * 60) anomalies.push(`P2: Toplam çalışma ${fmtMin(totalWorkedMin)} > yasal 270 saat (4857 sayılı İş Kanunu).`);

  if (summary.totalOvertimeMinutes > 90 * 60) anomalies.push(`P3: Aylık fazla mesai ${fmtMin(summary.totalOvertimeMinutes)} > 90 saat.`);

  if (baseTL == null) anomalies.push('P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.');

  const hasAnyRecord = summary.days.some((d) => d.records.length > 0);
  const hasAnyLeave = summary.unpaidLeaveDays + summary.sickLeaveDays + summary.annualLeaveDays > 0;
  if (!hasAnyRecord && !hasAnyLeave && summary.absentDays > 5) {
    anomalies.push(`P5: Tüm ay PDKS kaydı yok, izin de yok — ${summary.absentDays} gün absent (devamsızlık?).`);
  }

  // Açık (check_out NULL) gün sayısı engine perspektifinden — günlük records'ta giris var ama cikis yok
  const openDayCount = summary.days.filter((d) => {
    const hasGiris = d.records.some((r) => r.type === 'giris');
    const hasCikis = d.records.some((r) => r.type === 'cikis');
    return hasGiris && !hasCikis;
  }).length;
  if (openDayCount > 0) anomalies.push(`P6: ${openDayCount} günde giriş kaydı var ama çıkış yok — eksik kapanış.`);

  let proratedGrossTL: number | null = null;
  let overtimePayTL: number | null = null;
  let unpaidLeaveDeductionTL: number | null = null;
  let estimatedGrossTL: number | null = null;

  if (baseTL != null && expectedWorkDays > 0) {
    const paidDays = summary.workedDays + summary.sickLeaveDays + summary.annualLeaveDays;
    proratedGrossTL = +(baseTL * paidDays / expectedWorkDays).toFixed(2);
    const weeklyHours = user.weekly_hours || 45;
    const hourlyRate = baseTL / (weeklyHours * 4.33);
    overtimePayTL = +(hourlyRate * 1.5 * (summary.totalOvertimeMinutes / 60)).toFixed(2);
    const dailyRate = baseTL / expectedWorkDays;
    unpaidLeaveDeductionTL = +(dailyRate * summary.unpaidLeaveDays).toFixed(2);
    estimatedGrossTL = +(proratedGrossTL + overtimePayTL).toFixed(2);
  }

  return {
    user, summary, expectedWorkDays,
    baseSalaryTL: baseTL,
    proratedGrossTL, overtimePayTL, unpaidLeaveDeductionTL, estimatedGrossTL,
    anomalies,
  };
}

// ---------------- Rapor ----------------
function makeReport(
  rows: PayrollRow[],
  counters: CountersRow,
  globalAnoms: string[],
  openShifts: OpenShiftRow[],
  dsMismatches: DailySummaryMismatch[],
  leaveMismatches: LeaveDayMismatch[]
): string {
  const lines: string[] = [];
  lines.push(`# Ay Sonu Puantaj Simülasyonu — ${YEAR}-${MM} (READ-ONLY)`);
  lines.push('');
  lines.push(`**Çalıştırma tarihi:** ${new Date().toISOString()}`);
  lines.push(`**Task:** #287 (B4) — Pilot ay sonu öncesi kuru çalıştırma.`);
  lines.push(`**Hedef:** Veri eksiklerini, hesap anomalilerini ve hata pattern'lerini owner GO/NO-GO kararından önce görünür kılmak.`);
  lines.push(`**DB Yazma:** YOK (read-only guard hem yerel pg.Pool hem Drizzle pool üzerinde aktif).`);
  lines.push(`**Kapsam filtresi:** Aktif + approved + !deleted + role NOT IN (${NON_PAYROLL_ROLES.join(', ')}) + first_name NOT ILIKE 'TEST%' + username NOT ILIKE 'test%'.`);
  lines.push('');

  lines.push('## 1. Veri Sağlığı Özeti');
  lines.push('');
  lines.push('| Metrik | Değer |');
  lines.push('|---|---|');
  lines.push(`| Payroll kapsamındaki personel | ${rows.length} |`);
  lines.push(`| pdks_records (${YEAR}-${MM}) | ${counters.pdks_records} |`);
  lines.push(`| shift_attendance (${YEAR}-${MM}) | ${counters.shift_att} |`);
  lines.push(`| shift_attendance check_out NULL | ${counters.shift_att_no_co} |`);
  lines.push(`| leave_requests overlap (approved) | ${counters.leave_req_approved} |`);
  lines.push(`| leave_requests overlap (pending) | ${counters.leave_req_pending} |`);
  lines.push(`| pdks_daily_summary satırı | ${counters.daily_summary} |`);
  lines.push(`| pdks_monthly_stats önceden üretilmiş | ${counters.monthly_stats} |`);
  lines.push(`| Beklenen iş günü (Pzt-Cum) | ${workdaysInMonth(YEAR, MONTH)} |`);
  lines.push('');

  lines.push('## 2. Global Anomaliler');
  lines.push('');
  if (globalAnoms.length === 0) lines.push('_Tespit edilen global anomali yok._');
  else for (const a of globalAnoms) lines.push(`- ${a}`);
  lines.push('');

  const sumWorked = rows.reduce((s, r) => s + r.summary.workedDays, 0);
  const sumOvertimeMin = rows.reduce((s, r) => s + r.summary.totalOvertimeMinutes, 0);
  const sumUnpaid = rows.reduce((s, r) => s + r.summary.unpaidLeaveDays, 0);
  const sumSick = rows.reduce((s, r) => s + r.summary.sickLeaveDays, 0);
  const sumAnnual = rows.reduce((s, r) => s + r.summary.annualLeaveDays, 0);
  const sumAbsent = rows.reduce((s, r) => s + r.summary.absentDays, 0);
  const sumGross = rows.reduce((s, r) => s + (r.estimatedGrossTL ?? 0), 0);
  const usersWithSalary = rows.filter((r) => r.baseSalaryTL != null).length;
  const usersWithAnomalies = rows.filter((r) => r.anomalies.length > 0).length;

  lines.push('## 3. Toplam Tahmin');
  lines.push('');
  lines.push('| Metrik | Değer |');
  lines.push('|---|---|');
  lines.push(`| Toplam çalışılan gün | ${sumWorked} |`);
  lines.push(`| Toplam fazla mesai | ${fmtMin(sumOvertimeMin)} |`);
  lines.push(`| Ücretsiz izin (gün) | ${sumUnpaid} |`);
  lines.push(`| Raporlu izin (gün) | ${sumSick} |`);
  lines.push(`| Yıllık/personel izin (gün) | ${sumAnnual} |`);
  lines.push(`| Devamsız (gün) | ${sumAbsent} |`);
  lines.push(`| Maaş bilgisi olan personel | ${usersWithSalary} / ${rows.length} |`);
  lines.push(`| Anomali bayrağı olan personel | ${usersWithAnomalies} |`);
  lines.push(`| Tahmini toplam brüt (mesai dahil, kesintiler hariç) | ${fmtTL(+sumGross.toFixed(2))} |`);
  lines.push('');

  lines.push('## 4. Personel Bazlı Detay (günlük çalışma saati ortalaması dahil)');
  lines.push('');
  lines.push('| Ad Soyad | Şube | Rol | Çalışılan Gün | Ort. Saat/Gün | F.Mesai | Üc.İzin | Rap.İzin | Yıl.İzin | Devamsız | Brüt | Tahmini Brüt | Anomali |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const name = userDisplayName(r.user);
    const totalMin = r.summary.days.reduce((s, d) => s + d.workedMinutes, 0);
    const avgPerDay = r.summary.workedDays > 0 ? Math.round(totalMin / r.summary.workedDays) : 0;
    lines.push(
      `| ${name} | ${r.user.branch_name ?? '—'} | ${r.user.role} ` +
      `| ${r.summary.workedDays} | ${fmtMin(avgPerDay)} | ${fmtMin(r.summary.totalOvertimeMinutes)} ` +
      `| ${r.summary.unpaidLeaveDays} | ${r.summary.sickLeaveDays} | ${r.summary.annualLeaveDays} ` +
      `| ${r.summary.absentDays} | ${fmtTL(r.baseSalaryTL)} | ${fmtTL(r.estimatedGrossTL)} ` +
      `| ${r.anomalies.length === 0 ? '—' : r.anomalies.length + '×'} |`
    );
  }
  lines.push('');

  lines.push('## 5. Detay Anomali Listeleri');
  lines.push('');
  lines.push('### 5.1 Açık (check_out NULL) Vardiya Kayıtları');
  lines.push('');
  if (openShifts.length === 0) {
    lines.push('_Açık vardiya yok._');
  } else {
    lines.push('| SA ID | Personel | Şube | Giriş | Status |');
    lines.push('|---|---|---|---|---|');
    for (const o of openShifts) {
      lines.push(`| ${o.id} | ${o.user_name} | ${o.branch_name ?? '—'} | ${o.check_in_time} | ${o.status} |`);
    }
    if (openShifts.length === 200) lines.push('');
    if (openShifts.length === 200) lines.push('_(Liste 200 satırla sınırlı; daha fazlası için detay raporu alın.)_');
  }
  lines.push('');

  lines.push('### 5.2 pdks_daily_summary ↔ Engine Uyumsuzlukları (≥30 dk fark)');
  lines.push('');
  if (dsMismatches.length === 0) {
    lines.push('_Uyumsuzluk yok (veya pdks_daily_summary boş)._');
  } else {
    lines.push('| Personel | Tarih | DS dakika | Engine dakika | Fark |');
    lines.push('|---|---|---|---|---|');
    for (const m of dsMismatches.slice(0, 200)) {
      lines.push(`| ${m.user_name} | ${m.date} | ${m.ds_minutes} | ${m.engine_minutes} | ${m.diff} |`);
    }
    if (dsMismatches.length > 200) lines.push(`\n_(Toplam ${dsMismatches.length}; ilk 200 gösterildi.)_`);
  }
  lines.push('');

  lines.push('### 5.3 leave_requests Gün Sayısı Uyumsuzlukları (declared vs computed, fark ≥2)');
  lines.push('');
  if (leaveMismatches.length === 0) {
    lines.push('_Uyumsuzluk yok._');
  } else {
    lines.push('| Personel | Başlangıç | Bitiş | Beyan Gün | Hesap Gün |');
    lines.push('|---|---|---|---|---|');
    for (const l of leaveMismatches) {
      lines.push(`| ${l.user_name} | ${l.start_date} | ${l.end_date} | ${l.declared_days ?? '—'} | ${l.computed_days} |`);
    }
  }
  lines.push('');

  const anomList = rows.filter((r) => r.anomalies.length > 0);
  if (anomList.length > 0) {
    lines.push('### 5.4 Per-Personel Anomali Detayları');
    lines.push('');
    for (const r of anomList) {
      const name = userDisplayName(r.user);
      lines.push(`#### ${name} (${r.user.role}, ${r.user.branch_name ?? '—'})`);
      for (const a of r.anomalies) lines.push(`- ${a}`);
      lines.push('');
    }
  }

  lines.push('## 6. GO / NO-GO Karar Şablonu');
  lines.push('');
  const blockers: string[] = [];
  if (counters.shift_att_no_co > 5) blockers.push(`shift_attendance check_out NULL kayıt sayısı ${counters.shift_att_no_co} > 5 (eşik).`);
  if (counters.pdks_records === 0) blockers.push('Ay içinde PDKS kaydı yok — Excel import çalıştırılmalı.');
  if (rows.length > 0 && usersWithSalary / rows.length < 0.9) blockers.push(`Maaş bilgisi olan personel oranı ${(usersWithSalary / rows.length * 100).toFixed(1)}% < %90.`);
  if (counters.leave_req_pending > 0) blockers.push(`${counters.leave_req_pending} bekleyen izin talebi var — onay süreçleri tamamlanmalı.`);
  if (dsMismatches.length > 0) blockers.push(`pdks_daily_summary ile engine ${dsMismatches.length} satır uyumsuz — birini düzeltmeden bordro tutarsız çıkar.`);
  if (leaveMismatches.length > 0) blockers.push(`${leaveMismatches.length} izin kaydında gün sayısı uyumsuz — düzelt veya kabul et.`);
  for (const a of globalAnoms.filter((g) => g.startsWith('A1:') || g.startsWith('A2:') || g.startsWith('A5:'))) blockers.push(a);

  if (blockers.length === 0) {
    lines.push('**🟢 GO:** Tespit edilen blocker yok. Owner onayıyla gerçek ay sonu hesabı tetiklenebilir.');
  } else {
    lines.push('**🔴 NO-GO:** Aşağıdaki blocker(lar) çözülmeden gerçek ay sonu çalıştırılmamalı:');
    lines.push('');
    for (const b of blockers) lines.push(`- ${b}`);
  }
  lines.push('');

  lines.push('## 7. Kaynak & Yöntem');
  lines.push('');
  lines.push('- **Engine:** `server/lib/pdks-engine.ts` `getMonthClassification` fonksiyonu (production ile birebir mantık).');
  lines.push('- **Veri kaynakları:** `users`, `employee_salaries`, `pdks_records`, `scheduled_offs`, `leave_requests`, `shifts`, `public_holidays`, `shift_attendance`, `pdks_daily_summary`, `pdks_monthly_stats`.');
  lines.push('- **Brüt tahmin formülü:** `baseSalary × (workedDays + sickLeaveDays + annualLeaveDays) / expectedWorkDays + overtimeHours × hourlyRate × 1.5` (kuruş↔TL: A6 anomalisi).');
  lines.push('- **Hourly rate:** `baseSalary / (weeklyHours × 4.33)`.');
  lines.push('- **Read-only guard:** Hem `pg.Pool.query` (yerel) hem Drizzle `server/db.ts` `pool.query` monkey-patch — UPDATE/INSERT/DELETE/TRUNCATE/ALTER/DROP/CREATE/GRANT/REVOKE/COPY...FROM throw eder.');
  lines.push('- **Kapsam dışı:** Vergi/SGK/asgari ücret istisnası/diğer kesintiler — gerçek bordro hesaplayıcısının işi (`monthly_payrolls`).');
  lines.push('- **Yeniden çalıştır:** `npx tsx scripts/pilot/pdks-monthly-simulation.ts --year=2026 --month=5`');
  lines.push('');

  return lines.join('\n');
}

// ---------------- Main ----------------
async function main(): Promise<void> {
  console.log(`▶ PDKS aysonu simülasyonu — ${YEAR}-${MM} (READ-ONLY)`);
  console.log('  Payroll kapsamındaki kullanıcılar yükleniyor...');
  const users = await loadActiveUsers();
  console.log(`  → ${users.length} payroll personeli.`);
  const userIds = users.map((u) => u.id);

  console.log('  Veri sayaçları toplanıyor...');
  const counters = await envCounters();
  console.log(`  → pdks_records=${counters.pdks_records}, shift_att=${counters.shift_att} (NULL co=${counters.shift_att_no_co}), leave_appr=${counters.leave_req_approved}, leave_pend=${counters.leave_req_pending}, daily_summary=${counters.daily_summary}, monthly=${counters.monthly_stats}`);

  console.log('  Global anomaliler taranıyor...');
  const globalAnoms = await detectGlobalAnomalies(userIds);
  console.log(`  → ${globalAnoms.length} global anomali.`);

  console.log('  Açık vardiya kayıtları çekiliyor...');
  const openShifts = await fetchOpenShifts(userIds);
  console.log(`  → ${openShifts.length} açık vardiya.`);

  console.log('  Leave-day uyumsuzlukları taranıyor...');
  const leaveMismatches = await fetchLeaveDayMismatches(userIds);
  console.log(`  → ${leaveMismatches.length} izin uyumsuzluğu.`);

  const expectedWorkDays = workdaysInMonth(YEAR, MONTH);
  console.log(`  Per-personel sınıflandırma (${expectedWorkDays} iş günü)...`);

  const rows: PayrollRow[] = [];
  let processed = 0;
  for (const user of users) {
    try {
      const summary = await getMonthClassification(user.id, YEAR, MONTH);
      rows.push(computePayroll(user, summary, expectedWorkDays));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        user,
        summary: {
          userId: user.id, year: YEAR, month: MONTH, days: [],
          workedDays: 0, offDays: 0, absentDays: 0,
          unpaidLeaveDays: 0, sickLeaveDays: 0, annualLeaveDays: 0,
          totalOvertimeMinutes: 0, holidayWorkedDays: 0,
        },
        expectedWorkDays,
        baseSalaryTL: tlFromKurus(user.base_salary_raw),
        proratedGrossTL: null, overtimePayTL: null, unpaidLeaveDeductionTL: null, estimatedGrossTL: null,
        anomalies: [`P0: getMonthClassification HATA — ${msg}`],
      });
    }
    processed++;
    if (processed % 25 === 0) console.log(`    ${processed}/${users.length}...`);
  }

  console.log('  Daily summary uyumsuzlukları hesaplanıyor...');
  const dsMismatches = await fetchDailySummaryMismatches(rows);
  console.log(`  → ${dsMismatches.length} DS uyumsuzluğu.`);

  console.log('  Markdown rapor üretiliyor...');
  const md = makeReport(rows, counters, globalAnoms, openShifts, dsMismatches, leaveMismatches);
  const outDir = path.resolve('docs/audit');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `pdks-monthly-simulation-${YEAR}-${MM}.md`);
  writeFileSync(outPath, md, 'utf8');
  console.log(`  ✓ Rapor: ${outPath} (${md.length} byte)`);

  await localPool.end();
  process.exit(0);
}

main().catch(async (e: unknown) => {
  console.error('FATAL:', e);
  try { await localPool.end(); } catch { /* ignore */ }
  process.exit(1);
});
