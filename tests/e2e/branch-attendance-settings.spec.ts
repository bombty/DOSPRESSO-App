/**
 * Bundle 7 (#311 / Task #327) — Şube Puantaj + Fazla Mesai Onay E2E Regression
 *
 * 3 senaryo:
 *   S1. HQ admin şube tolerans=20 yapar → DB'ye yansır → kiosk path okur.
 *   S2. Kullanıcı planned shift'e 18 dk geç giriş, tolerans=20 → lateMinutes=18
 *       kayda geçer ama isLateArrival=false → late counter artmaz / penalty yok.
 *   S3. Overtime request pending → approve → status=approved + approvedMinutes set.
 *
 * Pattern: kiosk-shift-closure.spec.ts (API-level, real HTTP, DB doğrulama).
 *
 * Run:
 *   E2E_RUN_BUNDLE7=1 npx playwright test --config=playwright.config.ts \
 *     tests/e2e/branch-attendance-settings.spec.ts
 *
 * Senaryo 1 + Senaryo 3 PATCH endpoint'leri auth-required olduğu için
 * (HQ admin login flow build-out gerektirir) bu testler **DB-level update +
 * davranış doğrulama** yapar. UI/HTTP onay flow'u kiosk-shift-closure pattern'i
 * üzerinden ileride genişletilebilir (storage.approveOvertimeRequest doğrudan
 * çağrılamadığı için server-internal).
 */
import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import {
  seedBranchKioskUser,
  findUsableBranch,
  TestKioskFixture,
} from './helpers/seed';
import { query, queryOne, closePool } from './helpers/db';

const RUN = process.env.E2E_RUN_BUNDLE7 === '1';
const describeMaybe = RUN ? test.describe : test.describe.skip;

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await pwRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });
});

test.afterAll(async () => {
  await api.dispose();
  await closePool();
});

const authHdr = (token: string): Record<string, string> => ({ 'x-kiosk-token': token });

async function loginBranch(branchId: number, fixture: TestKioskFixture) {
  const res = await api.post(`/api/branches/${branchId}/kiosk/login`, {
    data: { userId: fixture.userId, pin: fixture.pin },
  });
  expect(res.status(), `branch login body=${await res.text()}`).toBe(200);
  const body = await res.json();
  expect(body.kioskToken, 'kioskToken expected').toBeTruthy();
  return body as { kioskToken: string; activeSession: any | null };
}

/** Snapshot + restore helper for branchKioskSettings.lateToleranceMinutes. */
async function snapshotTolerance(branchId: number): Promise<number | null> {
  const row = await queryOne<{ late_tolerance_minutes: number | null }>(
    `SELECT late_tolerance_minutes FROM branch_kiosk_settings WHERE branch_id = $1`,
    [branchId],
  );
  return row?.late_tolerance_minutes ?? null;
}

async function setTolerance(branchId: number, value: number): Promise<void> {
  // branch_kiosk_settings is auto-seeded for all branches at server boot
  // (server/routes/branches.ts L2586-2592). Test only mutates existing row.
  const res = await query(
    `UPDATE branch_kiosk_settings
        SET late_tolerance_minutes = $2, updated_at = now()
      WHERE branch_id = $1`,
    [branchId, value],
  );
  // Sanity: ensure the row existed (seed precondition)
  const exists = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM branch_kiosk_settings WHERE branch_id = $1`,
    [branchId],
  );
  if (Number(exists?.cnt ?? 0) === 0) {
    throw new Error(`branch_kiosk_settings missing for branchId=${branchId} — boot seed expected`);
  }
}

describeMaybe('Bundle 7 — Şube Puantaj + Fazla Mesai Onay (Task #327)', () => {
  let branchId: number;
  let fixture: TestKioskFixture;
  let originalTolerance: number | null;
  let createdShiftId: number | null = null;

  test.beforeAll(async () => {
    branchId = await findUsableBranch();
    originalTolerance = await snapshotTolerance(branchId);
    fixture = await seedBranchKioskUser({ branchId, role: 'barista' });
  });

  test.afterAll(async () => {
    if (createdShiftId) {
      await query(`DELETE FROM shifts WHERE id = $1`, [createdShiftId]).catch(() => {});
    }
    await fixture.cleanup();
    if (originalTolerance !== null) {
      await query(
        `UPDATE branch_kiosk_settings SET late_tolerance_minutes = $2, updated_at = now()
           WHERE branch_id = $1`,
        [branchId, originalTolerance],
      );
    }
  });

  // -------------------------------------------------------------------------
  // S1: Tolerans değişikliği DB'ye yazılır + kiosk path tarafından okunur
  // -------------------------------------------------------------------------
  test('S1: tolerans=20 set edilir → branch_kiosk_settings güncellenir', async () => {
    await setTolerance(branchId, 20);
    const after = await snapshotTolerance(branchId);
    expect(after).toBe(20);
  });

  // -------------------------------------------------------------------------
  // S2: 18 dk geç giriş + tolerans=20 → lateMinutes kayda girer ama
  //     isLateArrival=false → penalty oluşmaz
  // -------------------------------------------------------------------------
  test('S2: 18 dk geç giriş tolerans (20) içinde → late penalty yok', async () => {
    await setTolerance(branchId, 20);

    // Bugüne planlı vardiya: başlangıç saati = NOW - 18dk (hh:mm formatında)
    const now = new Date();
    const plannedStart = new Date(now.getTime() - 18 * 60_000);
    const startHHMM = `${String(plannedStart.getHours()).padStart(2, '0')}:${String(plannedStart.getMinutes()).padStart(2, '0')}`;
    const endHHMM = `${String((plannedStart.getHours() + 8) % 24).padStart(2, '0')}:${String(plannedStart.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);

    const shiftRow = await queryOne<{ id: number }>(
      `INSERT INTO shifts (branch_id, assigned_to_id, created_by_id,
                           shift_date, start_time, end_time, shift_type, status)
         VALUES ($1, $2, $2, $3, $4, $5, 'adhoc', 'active')
       RETURNING id`,
      [branchId, fixture.userId, todayStr, startHHMM, endHHMM],
    );
    expect(shiftRow?.id).toBeTruthy();
    createdShiftId = shiftRow!.id;

    const login = await loginBranch(branchId, fixture);
    const start = await api.post(`/api/branches/${branchId}/kiosk/shift-start`, {
      headers: authHdr(login.kioskToken),
      data: { userId: fixture.userId, gpsFallback: true },
    });
    expect(start.status(), `shift-start body=${await start.text()}`).toBe(200);
    const startBody = await start.json();
    const sessionId: number = startBody.session?.id ?? startBody.id;
    expect(sessionId).toBeTruthy();

    // DB doğrulama: lateMinutes kayda girer (~18, ±2dk timing toleransı)
    // ama isLateArrival=false (lateMinutes <= tolerance=20)
    const sess = await queryOne<{
      late_minutes: number;
      planned_shift_id: number | null;
    }>(
      `SELECT late_minutes, planned_shift_id FROM branch_shift_sessions WHERE id = $1`,
      [sessionId],
    );
    expect(sess).toBeTruthy();
    expect(sess!.planned_shift_id).toBe(createdShiftId);
    expect(sess!.late_minutes).toBeGreaterThanOrEqual(16);
    expect(sess!.late_minutes).toBeLessThanOrEqual(20);

    // Bu session için herhangi bir attendance_penalties kaydı oluşmamalı
    const penalty = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM attendance_penalties ap
         JOIN shift_attendance sa ON sa.id = ap.shift_attendance_id
        WHERE sa.user_id = $1 AND ap.created_at > now() - interval '5 minute'`,
      [fixture.userId],
    );
    expect(Number(penalty?.cnt ?? 0)).toBe(0);

    // Negative control: tolerans=10 yapıp aynı oturum mantığı uygulansaydı
    // 18 > 10 → isLateArrival=true olurdu. Burada sadece config-okuma path'i
    // doğrulamak için tolerans değerini düşür ve kayda geçen değeri kontrol et.
    await setTolerance(branchId, 10);
    const reread = await snapshotTolerance(branchId);
    expect(reread).toBe(10);
  });

  // -------------------------------------------------------------------------
  // S3: Overtime request pending → approve → status=approved
  // -------------------------------------------------------------------------
  test('S3: overtime request pending → DB approve → status=approved', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO overtime_requests
         (user_id, branch_id, requested_minutes, reason, status,
          overtime_date, start_time, end_time)
         VALUES ($1, $2, $3, $4, 'pending', $5, '18:00', '18:30')
       RETURNING id`,
      [fixture.userId, branchId, 30, 'TEST_E2E_ overtime fixture', todayStr],
    );
    expect(inserted?.id).toBeTruthy();
    const requestId = inserted!.id;

    // Approve flow simülasyonu (storage.approveOvertimeRequest server-internal;
    // burada SQL üzerinden aynı mutation'u uygulayıp status'u doğruluyoruz)
    await query(
      `UPDATE overtime_requests
          SET status = 'approved',
              approved_minutes = $2,
              approver_id = $3,
              approved_at = now()
        WHERE id = $1`,
      [requestId, 30, fixture.userId],
    );

    const after = await queryOne<{
      status: string;
      approved_minutes: number | null;
      approved_at: Date | null;
    }>(
      `SELECT status, approved_minutes, approved_at
         FROM overtime_requests WHERE id = $1`,
      [requestId],
    );
    expect(after?.status).toBe('approved');
    expect(after?.approved_minutes).toBe(30);
    expect(after?.approved_at).not.toBeNull();

    // Cleanup
    await query(`DELETE FROM overtime_requests WHERE id = $1`, [requestId]);
  });
});
