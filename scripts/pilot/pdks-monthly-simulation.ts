/**
 * B4 — Ay Sonu Puantaj Simülasyonu (READ-ONLY)
 * Task #287 — Sprint 2 Pilot
 *
 * KULLANIM:
 *   tsx scripts/pilot/pdks-monthly-simulation.ts                # default 2026-05
 *   tsx scripts/pilot/pdks-monthly-simulation.ts --year=2026 --month=5
 *
 * KESİN: READ-ONLY. Hiçbir UPDATE/INSERT/DELETE çalıştırılmaz. DB driver
 * her query'yi `read_only_guard` ile izler — yazma fiili tespit edilirse
 * process throw eder.
 *
 * ÇIKTI: docs/audit/pdks-monthly-simulation-<YYYY>-<MM>.md
 */
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { getMonthClassification, type PdksMonthSummary } from '../../server/lib/pdks-engine';

// ---------------- CLI args ----------------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  })
);
const today = new Date();
const YEAR = parseInt((args.year as string) || String(today.getFullYear()), 10);
const MONTH = parseInt((args.month as string) || String(today.getMonth() + 1), 10);
const MM = String(MONTH).padStart(2, '0');

// ---------------- READ-ONLY guard ----------------
const WRITE_RX = /\b(update|insert|delete|truncate|alter|drop|create|grant|revoke|comment\s+on)\b/i;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const origQuery = pool.query.bind(pool);
(pool as any).query = ((text: any, params?: any) => {
  const sql = typeof text === 'string' ? text : text?.text;
  if (sql && WRITE_RX.test(sql) && !/^\s*select/i.test(sql)) {
    throw new Error(`READ-ONLY VIOLATION: ${sql.slice(0, 120)}`);
  }
  return origQuery(text as any, params as any);
}) as any;
async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

// ---------------- Türler ----------------
type ActiveUser = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  branch_id: number | null;
  branch_name: string | null;
  base_salary_kurus: number | null;
  weekly_hours: number | null;
};

type PayrollRow = {
  user: ActiveUser;
  summary: PdksMonthSummary;
  expectedWorkDays: number;
  baseSalaryTL: number | null;
  proratedGrossTL: number | null;
  overtimePayTL: number | null;
  unpaidLeaveDeductionTL: number | null;
  estimatedGrossTL: number | null;
  anomalies: string[];
};

// ---------------- Helpers ----------------
/**
 * Schema (employee_salaries.base_salary) "kuruş cinsinden (100 = 1 TL)" diyor
 * fakat pilot DB'de değerler TL olarak görünüyor (29500-37000 aralığı, asgari
 * ücret civarı). Bu birim tutarsızlığı bir global anomali olarak rapor edilir.
 * Burada heuristik: değer < 1_000_000 ise TL kabul et, aksi halde kuruş.
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
  // Pzt-Cum (Türkiye standart: hafta sonu Cmt+Pzr off değil; pilot baz alır 22)
  // Daha doğru: gerçek Pzt-Cmt; basitleştiriyoruz.
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow >= 1 && dow <= 5) count++; // Mon-Fri
  }
  return count;
}

// ---------------- Veri toplama ----------------
async function loadActiveUsers(): Promise<ActiveUser[]> {
  return q<ActiveUser>(`
    SELECT u.id, u.username, u.first_name, u.last_name, u.role,
           u.branch_id, b.name AS branch_name,
           es.base_salary AS base_salary_kurus, es.weekly_hours
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
    ORDER BY u.role, u.first_name, u.last_name
  `, [`${YEAR}-${MM}-01`]);
}

async function envCounters() {
  const [{ pdks_records }] = await q<any>(`SELECT count(*)::int AS pdks_records FROM pdks_records WHERE record_date BETWEEN $1 AND $2`, [`${YEAR}-${MM}-01`, `${YEAR}-${MM}-${new Date(YEAR, MONTH, 0).getDate()}`]);
  const [{ shift_att, shift_att_no_co }] = await q<any>(`
    SELECT count(*)::int AS shift_att,
           count(*) FILTER (WHERE check_out_time IS NULL AND status NOT IN ('scheduled','cancelled'))::int AS shift_att_no_co
    FROM shift_attendance
    WHERE check_in_time >= $1::timestamp AND check_in_time < ($2::date + INTERVAL '1 day')
  `, [`${YEAR}-${MM}-01`, `${YEAR}-${MM}-${new Date(YEAR, MONTH, 0).getDate()}`]);
  const [{ leave_req }] = await q<any>(`SELECT count(*)::int AS leave_req FROM leave_requests WHERE status='approved' AND start_date <= $2 AND end_date >= $1`, [`${YEAR}-${MM}-01`, `${YEAR}-${MM}-${new Date(YEAR, MONTH, 0).getDate()}`]);
  const [{ daily_summary }] = await q<any>(`SELECT count(*)::int AS daily_summary FROM pdks_daily_summary WHERE work_date >= $1::timestamp AND work_date < ($2::date + INTERVAL '1 day')`, [`${YEAR}-${MM}-01`, `${YEAR}-${MM}-${new Date(YEAR, MONTH, 0).getDate()}`]);
  const [{ monthly_stats }] = await q<any>(`SELECT count(*)::int AS monthly_stats FROM pdks_monthly_stats WHERE year=$1 AND month=$2`, [YEAR, MONTH]);
  return { pdks_records, shift_att, shift_att_no_co, leave_req, daily_summary, monthly_stats };
}

async function detectGlobalAnomalies(): Promise<string[]> {
  const out: string[] = [];
  const start = `${YEAR}-${MM}-01`;
  const end = `${YEAR}-${MM}-${new Date(YEAR, MONTH, 0).getDate()}`;

  // 1. shift_attendance check_out NULL
  const sa = await q<any>(`
    SELECT count(*)::int AS n
    FROM shift_attendance
    WHERE check_in_time >= $1::timestamp
      AND check_in_time < ($2::date + INTERVAL '1 day')
      AND check_out_time IS NULL
      AND status NOT IN ('scheduled','cancelled')
  `, [start, end]);
  if (sa[0].n > 0) out.push(`A1: shift_attendance check_out_time NULL — ${sa[0].n} kayıt (vardiya açık kalmış, payroll için kritik).`);

  // 2. pdks_daily_summary boş ama pdks_records var → import eksik
  const ds = await q<any>(`
    SELECT count(DISTINCT u.id)::int AS n
    FROM users u
    WHERE u.is_active = true AND u.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM pdks_records r WHERE r.user_id = u.id AND r.record_date BETWEEN $1 AND $2)
      AND NOT EXISTS (SELECT 1 FROM pdks_daily_summary d WHERE d.user_id = u.id AND d.work_date >= $1::timestamp AND d.work_date < ($2::date + INTERVAL '1 day'))
  `, [start, end]);
  if (ds[0].n > 0) out.push(`A2: pdks_records var ama pdks_daily_summary boş — ${ds[0].n} kullanıcı için import işlenmemiş (Excel import scheduler tetiklenmemiş olabilir).`);

  // 3. leave_requests overlap eden ama status approved olmayan
  const lr = await q<any>(`
    SELECT count(*)::int AS n
    FROM leave_requests
    WHERE start_date <= $2 AND end_date >= $1
      AND status IN ('pending', 'requested')
  `, [start, end]);
  if (lr[0].n > 0) out.push(`A3: Bekleyen izin talepleri — ${lr[0].n} kayıt ay içinde overlap; ay sonu öncesi onaylanmalı.`);

  // 4. monthly_stats önceden üretilmiş mi?
  const ms = await q<any>(`SELECT count(*)::int AS n FROM pdks_monthly_stats WHERE year=$1 AND month=$2`, [YEAR, MONTH]);
  if (ms[0].n > 0) out.push(`A4: pdks_monthly_stats zaten ${ms[0].n} satır içeriyor — bu simülasyon canlı veriyle değil, yeniden hesapla.`);

  // 5. employee_salaries eksik personel
  const es = await q<any>(`
    SELECT count(*)::int AS n
    FROM users u
    WHERE u.is_active=true AND u.deleted_at IS NULL AND u.account_status='approved'
      AND NOT EXISTS (
        SELECT 1 FROM employee_salaries es
        WHERE es.user_id = u.id AND es.is_active=true
          AND es.effective_from <= $1::date
          AND (es.effective_to IS NULL OR es.effective_to >= $1::date)
      )
  `, [start]);
  if (es[0].n > 0) out.push(`A5: ${es[0].n} aktif personel için employee_salaries kaydı yok — bordro hesaplanamaz.`);

  // 6. base_salary birim tutarsızlığı (schema kuruş diyor, data TL gibi görünüyor)
  const sal = await q<any>(`
    SELECT count(*)::int AS n_low, max(base_salary)::int AS mx, min(base_salary)::int AS mn
    FROM employee_salaries
    WHERE is_active=true AND base_salary > 0
  `);
  if (sal[0].n_low > 0 && sal[0].mx < 1_000_000) {
    out.push(`A6: employee_salaries.base_salary birim tutarsızlığı — schema "kuruş" (×100) diyor ama data TL gibi (min=${sal[0].mn}, max=${sal[0].mx}). Script TL kabul ediyor; gerçek bordrodan önce şema yorumu netleşmeli.`);
  }

  return out;
}

// ---------------- Per-personel hesap ----------------
function computePayroll(user: ActiveUser, summary: PdksMonthSummary, expectedWorkDays: number): PayrollRow {
  const baseTL = tlFromKurus(user.base_salary_kurus);
  const anomalies: string[] = [];

  // Anomaly: negatif overtime (engine'de mümkün değil ama emniyet)
  if (summary.totalOvertimeMinutes < 0) anomalies.push(`P1: Negatif fazla mesai (${summary.totalOvertimeMinutes} dk) — engine bug.`);

  // Anomaly: ay içinde >270 saat çalışma (yasal limit ihlali)
  const totalWorkedMin = summary.days.reduce((s, d) => s + d.workedMinutes, 0);
  if (totalWorkedMin > 270 * 60) anomalies.push(`P2: Toplam çalışma ${fmtMin(totalWorkedMin)} > yasal 270 saat (4857 sayılı İş Kanunu).`);

  // Anomaly: fazla mesai > 90 saat/ay (yıllık 270 saat sınırı)
  if (summary.totalOvertimeMinutes > 90 * 60) anomalies.push(`P3: Aylık fazla mesai ${fmtMin(summary.totalOvertimeMinutes)} > 90 saat.`);

  // Anomaly: maaş bilgisi yok
  if (baseTL == null) anomalies.push('P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.');

  // Anomaly: hiç PDKS kaydı yok ama izin de yok
  const hasAnyRecord = summary.days.some(d => d.records.length > 0);
  const hasAnyLeave = summary.unpaidLeaveDays + summary.sickLeaveDays + summary.annualLeaveDays > 0;
  if (!hasAnyRecord && !hasAnyLeave && summary.absentDays > 5) {
    anomalies.push(`P5: Tüm ay PDKS kaydı yok, izin de yok — ${summary.absentDays} gün absent (devamsızlık?).`);
  }

  // Anomaly: izin çakışması absent ile (hatalı sınıflandırma)
  const conflicting = summary.days.filter(d =>
    d.status === 'absent' && d.records.length === 0 && expectedWorkDays > 22
  ).length;
  if (conflicting > 10) anomalies.push(`P6: ${conflicting} gün absent + kayıt yok — incele.`);

  let proratedGrossTL: number | null = null;
  let overtimePayTL: number | null = null;
  let unpaidLeaveDeductionTL: number | null = null;
  let estimatedGrossTL: number | null = null;

  if (baseTL != null && expectedWorkDays > 0) {
    // Prorate: brüt × (workedDays + paidLeaveDays) / expectedWorkDays
    const paidDays = summary.workedDays + summary.sickLeaveDays + summary.annualLeaveDays;
    proratedGrossTL = +(baseTL * paidDays / expectedWorkDays).toFixed(2);

    // Fazla mesai: hourlyRate ≈ baseTL / (weeklyHours × 4.33), zam %50
    const weeklyHours = user.weekly_hours || 45;
    const hourlyRate = baseTL / (weeklyHours * 4.33);
    overtimePayTL = +(hourlyRate * 1.5 * (summary.totalOvertimeMinutes / 60)).toFixed(2);

    // Ücretsiz izin kesintisi
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
function makeReport(rows: PayrollRow[], counters: any, globalAnoms: string[]): string {
  const lines: string[] = [];
  lines.push(`# Ay Sonu Puantaj Simülasyonu — ${YEAR}-${MM} (READ-ONLY)`);
  lines.push('');
  lines.push(`**Çalıştırma tarihi:** ${new Date().toISOString()}`);
  lines.push(`**Task:** #287 (B4) — Pilot ay sonu öncesi kuru çalıştırma.`);
  lines.push(`**Hedef:** Veri eksiklerini, hesap anomalilerini ve hata pattern'lerini owner GO/NO-GO kararından önce görünür kılmak.`);
  lines.push(`**DB Yazma:** YOK (read-only guard aktif).`);
  lines.push('');
  lines.push('## 1. Veri Sağlığı Özeti');
  lines.push('');
  lines.push('| Metrik | Değer |');
  lines.push('|---|---|');
  lines.push(`| Aktif personel (approved + !deleted) | ${rows.length} |`);
  lines.push(`| pdks_records (${YEAR}-${MM}) | ${counters.pdks_records} |`);
  lines.push(`| shift_attendance (${YEAR}-${MM}) | ${counters.shift_att} |`);
  lines.push(`| shift_attendance check_out NULL | ${counters.shift_att_no_co} |`);
  lines.push(`| leave_requests overlap (approved) | ${counters.leave_req} |`);
  lines.push(`| pdks_daily_summary satırı | ${counters.daily_summary} |`);
  lines.push(`| pdks_monthly_stats önceden üretilmiş | ${counters.monthly_stats} |`);
  lines.push(`| Beklenen iş günü (Pzt-Cum) | ${workdaysInMonth(YEAR, MONTH)} |`);
  lines.push('');

  lines.push('## 2. Global Anomaliler');
  lines.push('');
  if (globalAnoms.length === 0) lines.push('_Tespit edilen global anomali yok._');
  else for (const a of globalAnoms) lines.push(`- ${a}`);
  lines.push('');

  // Aggregate
  const sumWorked = rows.reduce((s, r) => s + r.summary.workedDays, 0);
  const sumOvertimeMin = rows.reduce((s, r) => s + r.summary.totalOvertimeMinutes, 0);
  const sumUnpaid = rows.reduce((s, r) => s + r.summary.unpaidLeaveDays, 0);
  const sumSick = rows.reduce((s, r) => s + r.summary.sickLeaveDays, 0);
  const sumAnnual = rows.reduce((s, r) => s + r.summary.annualLeaveDays, 0);
  const sumAbsent = rows.reduce((s, r) => s + r.summary.absentDays, 0);
  const sumGross = rows.reduce((s, r) => s + (r.estimatedGrossTL ?? 0), 0);
  const usersWithSalary = rows.filter(r => r.baseSalaryTL != null).length;
  const usersWithAnomalies = rows.filter(r => r.anomalies.length > 0).length;

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

  lines.push('## 4. Personel Bazlı Detay');
  lines.push('');
  lines.push('| Ad Soyad | Şube | Rol | Çalışılan | F.Mesai | Üc.İzin | Rap.İzin | Yıl.İzin | Devamsız | Brüt | Tahmini Brüt | Anomali |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const name = `${r.user.first_name ?? ''} ${r.user.last_name ?? ''}`.trim() || r.user.username;
    lines.push(
      `| ${name} | ${r.user.branch_name ?? '—'} | ${r.user.role} ` +
      `| ${r.summary.workedDays} | ${fmtMin(r.summary.totalOvertimeMinutes)} ` +
      `| ${r.summary.unpaidLeaveDays} | ${r.summary.sickLeaveDays} | ${r.summary.annualLeaveDays} ` +
      `| ${r.summary.absentDays} | ${fmtTL(r.baseSalaryTL)} | ${fmtTL(r.estimatedGrossTL)} ` +
      `| ${r.anomalies.length === 0 ? '—' : r.anomalies.length + '×'} |`
    );
  }
  lines.push('');

  // Anomali listesi
  const anomList = rows.filter(r => r.anomalies.length > 0);
  if (anomList.length > 0) {
    lines.push('## 5. Anomali Detayları');
    lines.push('');
    for (const r of anomList) {
      const name = `${r.user.first_name ?? ''} ${r.user.last_name ?? ''}`.trim() || r.user.username;
      lines.push(`### ${name} (${r.user.role}, ${r.user.branch_name ?? '—'})`);
      for (const a of r.anomalies) lines.push(`- ${a}`);
      lines.push('');
    }
  }

  // GO/NO-GO
  lines.push('## 6. GO / NO-GO Karar Şablonu');
  lines.push('');
  const blockers: string[] = [];
  if (counters.shift_att_no_co > 5) blockers.push(`shift_attendance check_out NULL kayıt sayısı ${counters.shift_att_no_co} > 5 (eşik).`);
  if (counters.pdks_records === 0) blockers.push('Ay içinde PDKS kaydı yok — Excel import çalıştırılmalı.');
  if (rows.length > 0 && usersWithSalary / rows.length < 0.9) blockers.push(`Maaş bilgisi olan personel oranı ${(usersWithSalary / rows.length * 100).toFixed(1)}% < %90.`);
  if (counters.leave_req > 0) blockers.push(`${counters.leave_req} bekleyen izin talebi var — onay süreçleri tamamlanmalı.`);
  for (const a of globalAnoms.filter(g => g.startsWith('A1:') || g.startsWith('A2:') || g.startsWith('A5:'))) blockers.push(a);

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
  lines.push('- **Brüt tahmin formülü:** `baseSalary × (workedDays + sickLeaveDays + annualLeaveDays) / expectedWorkDays + overtimeHours × hourlyRate × 1.5` (kuruş→TL).');
  lines.push('- **Hourly rate:** `baseSalary / (weeklyHours × 4.33)`.');
  lines.push('- **Kapsam dışı:** Vergi/SGK/asgari ücret istisnası/diğer kesintiler — gerçek bordro hesaplayıcısının işi (`monthly_payrolls`).');
  lines.push('- **Yeniden çalıştır:** `tsx scripts/pilot/pdks-monthly-simulation.ts --year=2026 --month=5`');
  lines.push('');

  return lines.join('\n');
}

// ---------------- Main ----------------
async function main() {
  console.log(`▶ PDKS aysonu simülasyonu — ${YEAR}-${MM} (READ-ONLY)`);
  console.log('  Aktif kullanıcılar yükleniyor...');
  const users = await loadActiveUsers();
  console.log(`  → ${users.length} aktif personel.`);

  console.log('  Veri sayaçları toplanıyor...');
  const counters = await envCounters();
  console.log(`  → pdks_records=${counters.pdks_records}, shift_att=${counters.shift_att} (NULL co=${counters.shift_att_no_co}), leave=${counters.leave_req}, daily_summary=${counters.daily_summary}, monthly=${counters.monthly_stats}`);

  console.log('  Global anomaliler taranıyor...');
  const globalAnoms = await detectGlobalAnomalies();
  console.log(`  → ${globalAnoms.length} global anomali.`);

  const expectedWorkDays = workdaysInMonth(YEAR, MONTH);
  console.log(`  Per-personel sınıflandırma (${expectedWorkDays} iş günü)...`);

  const rows: PayrollRow[] = [];
  let processed = 0;
  for (const user of users) {
    try {
      const summary = await getMonthClassification(user.id, YEAR, MONTH);
      rows.push(computePayroll(user, summary, expectedWorkDays));
    } catch (e: any) {
      rows.push({
        user,
        summary: {
          userId: user.id, year: YEAR, month: MONTH, days: [],
          workedDays: 0, offDays: 0, absentDays: 0,
          unpaidLeaveDays: 0, sickLeaveDays: 0, annualLeaveDays: 0,
          totalOvertimeMinutes: 0, holidayWorkedDays: 0,
        },
        expectedWorkDays,
        baseSalaryTL: tlFromKurus(user.base_salary_kurus),
        proratedGrossTL: null, overtimePayTL: null, unpaidLeaveDeductionTL: null, estimatedGrossTL: null,
        anomalies: [`P0: getMonthClassification HATA — ${e?.message ?? e}`],
      });
    }
    processed++;
    if (processed % 25 === 0) console.log(`    ${processed}/${users.length}...`);
  }

  console.log('  Markdown rapor üretiliyor...');
  const md = makeReport(rows, counters, globalAnoms);
  const outDir = path.resolve('docs/audit');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `pdks-monthly-simulation-${YEAR}-${MM}.md`);
  writeFileSync(outPath, md, 'utf8');
  console.log(`  ✓ Rapor: ${outPath} (${md.length} byte)`);

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
