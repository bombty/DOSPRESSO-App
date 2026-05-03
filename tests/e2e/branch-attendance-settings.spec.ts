/**
 * Bundle 7 (#311 / Task #327) — Şube Puantaj + Fazla Mesai Onay E2E Regression
 *
 * 3 senaryo (HTTP-level, gerçek auth + endpoint'ler):
 *   S1. Müdür login → PATCH /api/pdks/kiosk-settings/:branchId tolerans=20
 *       → response 200 + branch_kiosk_settings.late_tolerance_minutes=20.
 *   S2. Çalışanın bugüne planlı vardiyası NOW-18dk → kiosk PIN login + shift-start
 *       → branch_shift_sessions.late_minutes ≈ 18 (16-20 timing toleransı)
 *       → attendance_penalties yeni kayıt 0 (lateMinutes ≤ tolerans=20).
 *   S3. Çalışan login → POST /api/overtime-requests pending →
 *       müdür login → PATCH /api/overtime-requests/:id/approve
 *       → status=approved + approved_minutes set + approver_id=müdür.
 *
 * Pattern: kiosk-shift-closure.spec.ts (API-level Playwright, raw pg via helpers).
 *
 * Run:
 *   npx playwright test --config=playwright.config.ts \
 *     tests/e2e/branch-attendance-settings.spec.ts
 *   (Veya tüm Bundle suite: npx playwright test --config=playwright.config.ts)
 *
 * Önkoşul: dev server çalışıyor (`npm run dev`), DATABASE_URL set.
 */
import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import {
  seedBranchKioskUser,
  findUsableBranch,
  TEST_PREFIX,
  TestKioskFixture,
} from './helpers/seed';
import { query, queryOne, closePool } from './helpers/db';

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const TEST_PASSWORD = 'TestPass123!'; // matches seed.ts insertTestUser

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

/** /api/login → returns Set-Cookie connect.sid value usable as Cookie header. */
async function loginAsUser(username: string, password: string): Promise<string> {
  const ctx = await pwRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });
  const res = await ctx.post('/api/login', { data: { username, password } });
  expect(res.status(), `login body=${await res.text()}`).toBe(200);
  // Capture cookie from this isolated context
  const state = await ctx.storageState();
  const cookie = state.cookies.find((c) => c.name === 'connect.sid');
  await ctx.dispose();
  expect(cookie, `connect.sid cookie missing for ${username}`).toBeTruthy();
  return `connect.sid=${cookie!.value}`;
}

async function loginBranchKiosk(branchId: number, fixture: TestKioskFixture) {
  const res = await api.post(`/api/branches/${branchId}/kiosk/login`, {
    data: { userId: fixture.userId, pin: fixture.pin },
  });
  expect(res.status(), `kiosk login body=${await res.text()}`).toBe(200);
  const body = await res.json();
  expect(body.kioskToken, 'kioskToken expected').toBeTruthy();
  return body as { kioskToken: string; activeSession: any | null };
}

async function snapshotTolerance(branchId: number): Promise<number | null> {
  const row = await queryOne<{ late_tolerance_minutes: number | null }>(
    `SELECT late_tolerance_minutes FROM branch_kiosk_settings WHERE branch_id = $1`,
    [branchId],
  );
  return row?.late_tolerance_minutes ?? null;
}

test.describe('Bundle 7 — Şube Puantaj + Fazla Mesai Onay (Task #327)', () => {
  let branchId: number;
  let workerFixture: TestKioskFixture;
  let managerFixture: TestKioskFixture; // role=mudur, same branch
  let originalTolerance: number | null;
  let createdShiftId: number | null = null;
  let createdOvertimeId: number | null = null;

  test.beforeAll(async () => {
    branchId = await findUsableBranch();
    originalTolerance = await snapshotTolerance(branchId);
    if (originalTolerance === null) {
      throw new Error(`branch_kiosk_settings missing for branchId=${branchId} — boot seed expected (server/routes/branches.ts L2586-2592)`);
    }
    workerFixture = await seedBranchKioskUser({ branchId, role: 'barista' });
    // role=supervisor: hem canManageKiosk (PATCH /api/pdks/kiosk-settings)
    // hem de overtime-requests/:id/approve için yetkilidir (misc.ts L1189).
    managerFixture = await seedBranchKioskUser({ branchId, role: 'supervisor', pin: '5318' });
  });

  test.afterAll(async () => {
    // Teardown order: child rows first, then fixtures, then settings restore.
    if (createdOvertimeId) {
      await query(`DELETE FROM overtime_requests WHERE id = $1`, [createdOvertimeId]).catch(() => {});
    }
    // Belt-and-suspenders: any overtime row created by either user
    await query(
      `DELETE FROM overtime_requests WHERE user_id = ANY($1::varchar[])`,
      [[workerFixture.userId, managerFixture.userId]],
    ).catch(() => {});

    if (createdShiftId) {
      await query(`DELETE FROM shifts WHERE id = $1`, [createdShiftId]).catch(() => {});
    }
    // Worker fixture cleanup deletes branch_shift_sessions/events, pdks_records,
    // attendance_penalties, kiosk_sessions, branch_staff_pins, user.
    await workerFixture.cleanup();
    await managerFixture.cleanup();

    // Restore branch tolerance to its original value to keep DB pristine.
    await query(
      `UPDATE branch_kiosk_settings
          SET late_tolerance_minutes = $2, updated_at = now()
        WHERE branch_id = $1`,
      [branchId, originalTolerance],
    );
  });

  // -------------------------------------------------------------------------
  // S1: Müdür HTTP PATCH ile tolerans=20 set eder
  // -------------------------------------------------------------------------
  test('S1: müdür PATCH /api/pdks/kiosk-settings → tolerans=20 DB güncellenir', async () => {
    const cookie = await loginAsUser(managerFixture.username, TEST_PASSWORD);
    const res = await api.patch(`/api/pdks/kiosk-settings/${branchId}`, {
      headers: { Cookie: cookie },
      data: { lateToleranceMinutes: 20 },
    });
    expect(res.status(), `patch body=${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.lateToleranceMinutes).toBe(20);

    const after = await snapshotTolerance(branchId);
    expect(after).toBe(20);
  });

  // -------------------------------------------------------------------------
  // S2: 18 dk geç giriş + tolerans=20 → late_minutes kayda girer, penalty yok
  // -------------------------------------------------------------------------
  test('S2: 18 dk geç giriş tolerans (20) içinde → penalty oluşmaz', async () => {
    // Precondition: tolerance=20 (S1 ya da burada garanti)
    await query(
      `UPDATE branch_kiosk_settings
          SET late_tolerance_minutes = 20, updated_at = now()
        WHERE branch_id = $1`,
      [branchId],
    );

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
      [branchId, workerFixture.userId, todayStr, startHHMM, endHHMM],
    );
    expect(shiftRow?.id).toBeTruthy();
    createdShiftId = shiftRow!.id;

    const login = await loginBranchKiosk(branchId, workerFixture);
    const start = await api.post(`/api/branches/${branchId}/kiosk/shift-start`, {
      headers: authHdr(login.kioskToken),
      data: { userId: workerFixture.userId, gpsFallback: true },
    });
    expect(start.status(), `shift-start body=${await start.text()}`).toBe(200);
    const startBody = await start.json();
    const sessionId: number = startBody.session?.id ?? startBody.id;
    expect(sessionId).toBeTruthy();

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

    // lateMinutes (≈18) ≤ tolerans (20) → isLateArrival=false
    // → bu kullanıcı için son 5dk içinde attendance_penalties kaydı oluşmamalı
    const penalty = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM attendance_penalties ap
         JOIN shift_attendance sa ON sa.id = ap.shift_attendance_id
        WHERE sa.user_id = $1 AND ap.created_at > now() - interval '5 minute'`,
      [workerFixture.userId],
    );
    expect(Number(penalty?.cnt ?? 0)).toBe(0);
  });

  // -------------------------------------------------------------------------
  // S3: Çalışan POST overtime → müdür PATCH approve → status=approved
  // -------------------------------------------------------------------------
  test('S3: overtime request POST(pending) → müdür PATCH approve → status=approved', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Çalışan kendi adına talep oluşturur (route user.id'yi server-side set eder)
    const workerCookie = await loginAsUser(workerFixture.username, TEST_PASSWORD);
    const create = await api.post('/api/overtime-requests', {
      headers: { Cookie: workerCookie },
      data: {
        branchId,
        requestedMinutes: 30,
        reason: `${TEST_PREFIX}overtime fixture`,
        overtimeDate: todayStr,
        startTime: '18:00',
        endTime: '18:30',
      },
    });
    expect(create.status(), `create body=${await create.text()}`).toBe(201);
    const created = await create.json();
    expect(created.id).toBeTruthy();
    expect(created.status).toBe('pending');
    createdOvertimeId = created.id;

    // Müdür HTTP onay (gerçek endpoint, gerçek session)
    const mgrCookie = await loginAsUser(managerFixture.username, TEST_PASSWORD);
    const approve = await api.patch(`/api/overtime-requests/${createdOvertimeId}/approve`, {
      headers: { Cookie: mgrCookie },
      data: { approvedMinutes: 30 },
    });
    expect(approve.status(), `approve body=${await approve.text()}`).toBe(200);

    const after = await queryOne<{
      status: string;
      approved_minutes: number | null;
      approved_at: Date | null;
      approver_id: string | null;
    }>(
      `SELECT status, approved_minutes, approved_at, approver_id
         FROM overtime_requests WHERE id = $1`,
      [createdOvertimeId],
    );
    expect(after?.status).toBe('approved');
    expect(after?.approved_minutes).toBe(30);
    expect(after?.approved_at).not.toBeNull();
    expect(after?.approver_id).toBe(managerFixture.userId);

    // Payroll sanity: approved overtime, aynı tarihte çalışanın approved
    // total_minutes summary'sinde görünmeli (bordro motorunun okuyacağı veri).
    const totals = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(approved_minutes), 0)::text AS total
         FROM overtime_requests
        WHERE user_id = $1 AND overtime_date = $2 AND status = 'approved'`,
      [workerFixture.userId, todayStr],
    );
    expect(Number(totals?.total ?? 0)).toBeGreaterThanOrEqual(30);
  });
});
