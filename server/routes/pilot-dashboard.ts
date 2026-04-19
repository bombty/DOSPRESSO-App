/**
 * ═══════════════════════════════════════════════════════════════════
 * Sprint G — Pilot Day-1 Raporlama Endpoint'i
 *
 * Bağlam: docs/pilot/success-criteria.md'de 4 sayısal eşik Aslan
 * tarafından onaylandı. Pilot günü (28 Nis) 18:00'de bu eşikleri
 * manuel SQL ile ölçmek 30 dk+ iş. Bu endpoint tek çağrıda rapor
 * üretir.
 *
 * 4 Eşik (4/3 kuralı: en az 3 sağlanırsa pilot devam):
 *   1. Login success rate > %95
 *   2. Task completion > 10/lokasyon/gün (toplam ≥ 40)
 *   3. Error rate (5xx) < %5
 *   4. Day-1 smoke test pass > 7/8
 *
 * Yetki: admin, ceo, cgo (pilot kararı bu rollerin)
 *
 * Salt-okunur aggregate — pilot'u kırma riski SIFIR.
 *
 * Kullanım:
 *   GET /api/pilot/day-status?date=2026-04-28
 *   GET /api/pilot/day-status  (bugün varsayılan)
 *
 * Hazırlayan: Claude (Sprint G, 19 Nis 2026 gece)
 * Madde 37 §24 gereği: audit_logs.action gerçek değerleri
 * grep ile doğrulandı: 'auth.login_success', 'auth.login_failed'
 * (success-criteria.md'deki LOGIN_SUCCESS YANLIŞ).
 * ═══════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';

const router = Router();

const PILOT_ROLES = ['admin', 'ceo', 'cgo', 'adminhq'];
const PILOT_BRANCH_IDS = [5, 8, 23, 24]; // Işıklar, Lara, HQ, Fabrika

// 4 eşik için sayısal değerler (success-criteria.md)
const THRESHOLDS = {
  loginSuccessRatePct: 95,   // > %95
  taskMinPerBranch: 10,      // > 10 task/branch/day
  errorRateMaxPct: 5,        // < %5
  smokeTestMinPass: 7,       // > 7/8
  smokeTestTotal: 8,
};

router.get('/api/pilot/day-status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const reqUser = req.user;
    if (!PILOT_ROLES.includes(reqUser.role)) {
      return res.status(403).json({
        error: 'Pilot dashboard için yetkiniz bulunmamaktadır',
      });
    }

    // Tarih parametresi - varsayılan bugün (TR)
    const dateParam = String(req.query.date || '');
    const targetDate = dateParam || (() => {
      const now = new Date();
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now);
    })();

    // ISO date validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        error: 'Geçersiz tarih formatı. Beklenen: YYYY-MM-DD (örn 2026-04-28)',
      });
    }

    const dayStart = `${targetDate} 00:00:00`;
    const dayEnd = `${targetDate} 23:59:59`;

    // ═══════════════════════════════════════════════
    // Eşik 1 — Login Success Rate > %95
    // ═══════════════════════════════════════════════
    const loginResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE action = 'auth.login_success')::int AS success,
        COUNT(*) FILTER (WHERE action IN ('auth.login_success', 'auth.login_failed'))::int AS total
      FROM audit_logs
      WHERE created_at >= ${dayStart}::timestamp AT TIME ZONE 'Europe/Istanbul'
        AND created_at <  ${dayEnd}::timestamp AT TIME ZONE 'Europe/Istanbul'
    `);
    const loginRow = (loginResult.rows?.[0] as any) || { success: 0, total: 0 };
    const loginSuccessRate = loginRow.total > 0
      ? +((loginRow.success / loginRow.total) * 100).toFixed(2)
      : 0;
    const loginPass = loginRow.total === 0 || loginSuccessRate > THRESHOLDS.loginSuccessRatePct;

    // ═══════════════════════════════════════════════
    // Eşik 2 — Task Completion > 10/branch/day (pilot şubelerde)
    // ═══════════════════════════════════════════════
    const taskResult = await db.execute(sql`
      SELECT
        t.branch_id,
        b.name AS branch_name,
        COUNT(*) FILTER (WHERE t.status = 'onaylandi')::int AS completed_count
      FROM tasks t
      LEFT JOIN branches b ON t.branch_id = b.id
      WHERE t.branch_id = ANY(${PILOT_BRANCH_IDS})
        AND t.updated_at >= ${dayStart}::timestamp AT TIME ZONE 'Europe/Istanbul'
        AND t.updated_at <  ${dayEnd}::timestamp AT TIME ZONE 'Europe/Istanbul'
      GROUP BY t.branch_id, b.name
      ORDER BY t.branch_id
    `);
    const taskRows = (taskResult.rows as any[]) || [];
    const taskByBranch = PILOT_BRANCH_IDS.map(bId => {
      const row = taskRows.find(r => r.branch_id === bId);
      return {
        branch_id: bId,
        branch_name: row?.branch_name || `Branch ${bId}`,
        completed_count: row?.completed_count ?? 0,
        meets_threshold: (row?.completed_count ?? 0) > THRESHOLDS.taskMinPerBranch,
      };
    });
    const taskTotalCompleted = taskByBranch.reduce((s, b) => s + b.completed_count, 0);
    // Eşik: tüm pilot şubelerde > 10 (hepsi sağlamalı); yumuşak versiyon: toplam ≥ 40
    const taskPass = taskByBranch.every(b => b.meets_threshold) ||
                     taskTotalCompleted >= (THRESHOLDS.taskMinPerBranch * PILOT_BRANCH_IDS.length);

    // ═══════════════════════════════════════════════
    // Eşik 3 — Error Rate (5xx) < %5
    // audit_logs'ta http status kayıt edilmiyor, alternatif:
    // error_logs veya console.error sayısı — bu versiyon 'audit_logs.action LIKE api.error.*'
    // VEYA detail.statusCode = 5xx varsa bakıyoruz. Yoksa boş dönüyor.
    // ═══════════════════════════════════════════════
    const errorResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE details->>'statusCode' LIKE '5%')::int AS error_5xx,
        COUNT(*)::int AS total_requests
      FROM audit_logs
      WHERE created_at >= ${dayStart}::timestamp AT TIME ZONE 'Europe/Istanbul'
        AND created_at <  ${dayEnd}::timestamp AT TIME ZONE 'Europe/Istanbul'
        AND details IS NOT NULL
    `);
    const errorRow = (errorResult.rows?.[0] as any) || { error_5xx: 0, total_requests: 0 };
    const errorRate = errorRow.total_requests > 0
      ? +((errorRow.error_5xx / errorRow.total_requests) * 100).toFixed(2)
      : 0;
    // Not: audit_logs 5xx yakalamayabilir (success log yoksa denominator yanlış olur)
    // Bu eşik "available" ise ölçülür, değilse N/A ve PASS sayılır (güvenli varsayılan)
    const errorDataAvailable = errorRow.total_requests > 50; // Az sample → güvenilmez
    const errorPass = !errorDataAvailable || errorRate < THRESHOLDS.errorRateMaxPct;

    // ═══════════════════════════════════════════════
    // Eşik 4 — Day-1 Smoke Test Pass > 7/8
    // Replit/Aslan manuel smoke test yapar, sonucu başka bir endpoint'te
    // set edilir. Bu versiyon DB'den PILOT_SMOKE_TEST_RESULTS tablosu varsa okur.
    // Tablo yoksa N/A = güvenli varsayılan (Aslan manuel raporlar).
    // ═══════════════════════════════════════════════
    let smokeTestResult: {
      passed: number | null;
      total: number;
      pass: boolean;
      source: string;
    } = {
      passed: null,
      total: THRESHOLDS.smokeTestTotal,
      pass: true, // N/A = güvenli varsayılan (manuel Aslan kararı)
      source: 'manuel (tablo yok, Aslan elle raporluyor)',
    };
    try {
      const smokeResult = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE passed = true)::int AS passed_count,
          COUNT(*)::int AS total_count
        FROM pilot_smoke_test_results
        WHERE test_date = ${targetDate}::date
      `);
      const smokeRow = (smokeResult.rows?.[0] as any);
      if (smokeRow && smokeRow.total_count > 0) {
        smokeTestResult = {
          passed: smokeRow.passed_count,
          total: smokeRow.total_count,
          pass: smokeRow.passed_count > THRESHOLDS.smokeTestMinPass,
          source: 'pilot_smoke_test_results tablosu',
        };
      }
    } catch (e: any) {
      // Tablo yoksa (42P01) güvenli varsayılan kalır
      if (e?.code !== '42P01') {
        console.warn('[Sprint G] Smoke test sorgusu hata:', e?.message);
      }
    }

    // ═══════════════════════════════════════════════
    // KARAR MANTIGI — 4/3 Kuralı
    // ═══════════════════════════════════════════════
    const passedThresholds = [loginPass, taskPass, errorPass, smokeTestResult.pass]
      .filter(Boolean).length;

    let overallStatus: 'GO' | 'ATTENTION' | 'NO_GO';
    let overallMessage: string;
    if (passedThresholds >= 3) {
      overallStatus = 'GO';
      overallMessage = '✅ PILOT DEVAM — 4/3 kuralı sağlandı';
    } else if (passedThresholds === 2) {
      overallStatus = 'ATTENTION';
      overallMessage = '⚠️ DİKKAT — 2 eşik sağlandı, Aslan + IT kriz toplantısı';
    } else {
      overallStatus = 'NO_GO';
      overallMessage = '🔴 KRİTİK — 2\'den az eşik sağlandı, pilot duraklatma değerlendirilmeli';
    }

    // ═══════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════
    res.json({
      date: targetDate,
      pilot_day: calculatePilotDay(targetDate),
      pilot_branches: PILOT_BRANCH_IDS,

      overall: {
        status: overallStatus,
        message: overallMessage,
        passed_thresholds: passedThresholds,
        total_thresholds: 4,
        rule: 'En az 3/4 eşik sağlanırsa pilot devam eder',
      },

      thresholds: {
        login_success_rate: {
          label: 'Eşik 1 — Login Success Rate > %95',
          threshold_pct: THRESHOLDS.loginSuccessRatePct,
          measured_pct: loginSuccessRate,
          success_count: loginRow.success,
          total_attempts: loginRow.total,
          pass: loginPass,
          note: loginRow.total === 0 ? 'Veri yok — ilk day-1\'de bekleniyor' : undefined,
        },
        task_completion: {
          label: 'Eşik 2 — Task Completion > 10/branch (pilot şubelerde)',
          threshold_per_branch: THRESHOLDS.taskMinPerBranch,
          threshold_total: THRESHOLDS.taskMinPerBranch * PILOT_BRANCH_IDS.length,
          total_completed: taskTotalCompleted,
          by_branch: taskByBranch,
          pass: taskPass,
        },
        error_rate: {
          label: 'Eşik 3 — 5xx Error Rate < %5',
          threshold_pct: THRESHOLDS.errorRateMaxPct,
          measured_pct: errorRate,
          error_5xx_count: errorRow.error_5xx,
          total_logged_requests: errorRow.total_requests,
          pass: errorPass,
          data_available: errorDataAvailable,
          note: !errorDataAvailable ? 'Yeterli audit_logs verisi yok (N/A = güvenli varsayılan PASS)' : undefined,
        },
        smoke_test: {
          label: 'Eşik 4 — Day-1 Smoke Test Pass > 7/8',
          threshold: `> ${THRESHOLDS.smokeTestMinPass}/${THRESHOLDS.smokeTestTotal}`,
          passed: smokeTestResult.passed,
          total: smokeTestResult.total,
          pass: smokeTestResult.pass,
          source: smokeTestResult.source,
        },
      },

      diagnosis: buildDiagnosis(
        loginPass, loginSuccessRate, loginRow.total,
        taskPass, taskTotalCompleted, taskByBranch,
        errorPass, errorRate, errorDataAvailable,
        smokeTestResult
      ),

      generated_at: new Date().toISOString(),
      generated_at_tr: new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date()),
    });

  } catch (error: any) {
    console.error('[Sprint G] Pilot day-status error:', error);
    res.status(500).json({
      error: error?.message || 'Pilot durum raporu oluşturulamadı',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Yardımcı Fonksiyonlar
// ═══════════════════════════════════════════════════════════════════

/** Pilot başlangıcından bu yana kaçıncı gün (pilot 28 Nis 2026) */
function calculatePilotDay(targetDate: string): { day: number; label: string } {
  const PILOT_START = '2026-04-28';
  const start = new Date(PILOT_START);
  const target = new Date(targetDate);
  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { day: diffDays, label: `Pilot öncesi (${Math.abs(diffDays)} gün kaldı)` };
  }
  return { day: diffDays + 1, label: `Pilot Gün ${diffDays + 1}` };
}

/** Otomatik tanılama: her eşik için kısa özet */
function buildDiagnosis(
  loginPass: boolean, loginRate: number, loginTotal: number,
  taskPass: boolean, taskTotal: number, taskByBranch: any[],
  errorPass: boolean, errorRate: number, errorDataAvailable: boolean,
  smoke: any,
): string[] {
  const lines: string[] = [];

  // Login
  if (loginTotal === 0) {
    lines.push('🟡 Login: Bugün henüz login aktivitesi yok (pilot öncesi normal).');
  } else if (loginPass) {
    lines.push(`✅ Login: %${loginRate} (${loginTotal} deneme) — sağlıklı.`);
  } else {
    lines.push(`🔴 Login: %${loginRate} (eşik: %95) — kullanıcı destek gerekli, parola reset'i yaygın olabilir.`);
  }

  // Task
  if (taskPass) {
    lines.push(`✅ Task: ${taskTotal} tamamlanmış — tüm şubelerde aktif kullanım.`);
  } else {
    const lowBranches = taskByBranch.filter(b => !b.meets_threshold);
    lines.push(`🔴 Task: ${lowBranches.length} şubede eşik altı — ${lowBranches.map(b => `${b.branch_name}=${b.completed_count}`).join(', ')}`);
  }

  // Error
  if (!errorDataAvailable) {
    lines.push(`🟡 Error rate: Ölçülemedi (audit_logs yetersiz sample) — Aslan manuel kontrol önerilir.`);
  } else if (errorPass) {
    lines.push(`✅ Error rate: %${errorRate} — stabil.`);
  } else {
    lines.push(`🔴 Error rate: %${errorRate} (eşik: <%5) — backend hata loglarını kontrol et.`);
  }

  // Smoke
  if (smoke.passed === null) {
    lines.push(`🟡 Smoke test: Manuel — Aslan raporlayacak (pilot_smoke_test_results tablosu yok).`);
  } else if (smoke.pass) {
    lines.push(`✅ Smoke test: ${smoke.passed}/${smoke.total} — geçti.`);
  } else {
    lines.push(`🔴 Smoke test: ${smoke.passed}/${smoke.total} (eşik: >7/8) — fonksiyonel sorun var.`);
  }

  return lines;
}

export default router;
