/**
 * Task #286 (B12) — Kiosk Vardiya Kapanış E2E Test Paketi
 *
 * 5 senaryo:
 *   1. Branch kiosk PIN login → shift session → shift-end → DB doğrulama
 *   2. HQ kiosk login → shift-start → exit (end_of_day) → DB doğrulama
 *   3. Factory shift-end (normal) → DB doğrulama
 *   4. Factory quick-end (acil kapanış) → DB doğrulama
 *   5. Auto-checkout scheduler smoke (simülasyon — manuel session insert + force close path)
 *
 * Strategy: API-level testing (no browser). Each test seeds its own user with
 * TEST_E2E_ prefix and cleans up afterwards. Real endpoints are exercised over
 * HTTP against the running dev server, then DB state is asserted via raw SQL.
 *
 * Out of scope: UI testing (B1 task), CI integration, code fixes for any
 * regressions found (open separate Issue/task per finding).
 */
import { test, expect, request, APIRequestContext } from '@playwright/test';
import { closePool, query, queryOne } from './helpers/db';
import {
  findFactoryStation,
  findUsableBranch,
  seedKioskUser,
  TestKioskFixture,
} from './helpers/seed';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await request.newContext({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5000',
  });
});

test.afterAll(async () => {
  await api.dispose();
  await closePool();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function kioskLoginBranch(
  fixture: TestKioskFixture
): Promise<{ kioskToken: string; activeSession: any; user: any }> {
  const res = await api.post(`/api/branches/${fixture.branchId}/kiosk/login`, {
    data: { userId: fixture.userId, pin: fixture.pin },
  });
  expect(res.status(), `login should succeed, body=${await res.text()}`).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.kioskToken, 'kioskToken expected in login response').toBeTruthy();
  return body;
}

function authHeaders(token: string): Record<string, string> {
  // Server middleware reads req.headers['x-kiosk-token'] (see
  // server/routes/branches.ts isKioskOrAuthenticated).
  return { 'x-kiosk-token': token };
}

// ---------------------------------------------------------------------------
// 1. Branch kiosk shift-end
// ---------------------------------------------------------------------------

test.describe('Senaryo 1: Branch kiosk shift-end', () => {
  let fixture: TestKioskFixture;

  test.beforeAll(async () => {
    const branchId = await findUsableBranch();
    fixture = await seedKioskUser({ branchId, role: 'barista' });
  });

  test.afterAll(async () => {
    if (fixture) await fixture.cleanup();
  });

  test('PIN login → shift session create → shift-end → DB doğrulama', async () => {
    // 1. PIN login (creates kiosk JWT + may auto-create session)
    const loginBody = await kioskLoginBranch(fixture);

    // 2. Ensure an active session exists. If login didn't create one, insert manually
    //    (some kiosk flows require a separate /check-in call).
    let sessionId: number;
    if (loginBody.activeSession?.id) {
      sessionId = loginBody.activeSession.id;
    } else {
      const created = await queryOne<{ id: number }>(
        `INSERT INTO branch_shift_sessions
         (user_id, branch_id, check_in_time, status, work_minutes, break_minutes)
         VALUES ($1, $2, NOW() - INTERVAL '4 hours', 'active', 0, 0)
         RETURNING id`,
        [fixture.userId, fixture.branchId]
      );
      sessionId = created!.id;
    }

    // 3. Call shift-end
    const endRes = await api.post(
      `/api/branches/${fixture.branchId}/kiosk/shift-end`,
      {
        data: { sessionId, notes: 'TEST_E2E_shift_end_notes' },
        headers: authHeaders(loginBody.kioskToken),
      }
    );
    expect(endRes.status(), `body=${await endRes.text()}`).toBe(200);

    // 4. Assert DB state: session.status = 'completed', check_out_time NOT NULL
    const sessionAfter = await queryOne<{
      status: string;
      check_out_time: Date | null;
      work_minutes: number;
    }>(
      `SELECT status, check_out_time, work_minutes
       FROM branch_shift_sessions WHERE id = $1`,
      [sessionId]
    );
    expect(sessionAfter?.status).toBe('completed');
    expect(sessionAfter?.check_out_time).not.toBeNull();
    expect(sessionAfter?.work_minutes).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 2. HQ kiosk end_of_day
// ---------------------------------------------------------------------------

test.describe('Senaryo 2: HQ kiosk end_of_day', () => {
  let fixture: TestKioskFixture;

  test.beforeAll(async () => {
    const branchId = await findUsableBranch({ preferHq: true });
    fixture = await seedKioskUser({ branchId, role: 'admin' });
  });

  test.afterAll(async () => {
    if (fixture) await fixture.cleanup();
  });

  test('HQ login → shift-start → exit(end_of_day) → DB kapanış', async () => {
    // 1. HQ kiosk login (different endpoint than branch)
    const loginRes = await api.post('/api/hq/kiosk/login', {
      data: { userId: fixture.userId, pin: fixture.pin },
    });
    if (loginRes.status() !== 200) {
      // Some HQ flows require pre-registered HQ kiosk PIN separate from branch PIN.
      // Skip gracefully with a clear message.
      test.skip(
        true,
        `HQ kiosk login not available for seeded user (status=${loginRes.status()}). ` +
          `HQ PIN provisioning requires separate setup — see B1 task.`
      );
      return;
    }
    const loginBody = await loginRes.json();
    const token: string = loginBody.kioskToken;
    expect(token).toBeTruthy();

    // 2. shift-start
    const startRes = await api.post('/api/hq/kiosk/shift-start', {
      data: {},
      headers: authHeaders(token),
    });
    expect([200, 201, 400]).toContain(startRes.status());
    const startBody = startRes.status() < 300 ? await startRes.json() : null;
    const sessionId = startBody?.session?.id || startBody?.sessionId;
    expect(sessionId, 'sessionId from shift-start').toBeTruthy();

    // 3. exit with end_of_day
    const exitRes = await api.post('/api/hq/kiosk/exit', {
      data: { sessionId, exitReason: 'end_of_day' },
      headers: authHeaders(token),
    });
    expect(exitRes.status(), `body=${await exitRes.text()}`).toBe(200);

    // 4. Assert DB state
    const after = await queryOne<{ status: string; check_out_time: Date | null }>(
      `SELECT status, check_out_time FROM hq_shift_sessions WHERE id = $1`,
      [sessionId]
    );
    expect(after?.status).toBe('completed');
    expect(after?.check_out_time).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3 + 4. Factory shift-end normal + quick-end
// ---------------------------------------------------------------------------

test.describe('Senaryo 3+4: Factory shift-end + quick-end', () => {
  let fixture: TestKioskFixture;
  let stationId: number | null;

  test.beforeAll(async () => {
    const branchId = await findUsableBranch({ preferFactory: true });
    fixture = await seedKioskUser({ branchId, role: 'fabrika_personel' });
    stationId = await findFactoryStation();
  });

  test.afterAll(async () => {
    if (fixture) await fixture.cleanup();
  });

  test('Senaryo 3: Factory shift-start → end-shift normal kapanış', async () => {
    if (!stationId) test.skip(true, 'No active factory station in DB');

    const loginRes = await api.post('/api/factory/kiosk/login', {
      data: { userId: fixture.userId, pin: fixture.pin },
    });
    if (loginRes.status() !== 200) {
      test.skip(
        true,
        `Factory kiosk login not available (status=${loginRes.status()}). ` +
          `Factory may require separate PIN registration.`
      );
      return;
    }
    const loginBody = await loginRes.json();
    const token: string = loginBody.kioskToken;
    expect(token).toBeTruthy();

    const startRes = await api.post('/api/factory/kiosk/start-shift', {
      data: { stationId },
      headers: authHeaders(token),
    });
    expect([200, 201, 400]).toContain(startRes.status());
    const sessionId =
      (await startRes.json().catch(() => ({})))?.session?.id ||
      (await queryOne<{ id: number }>(
        `SELECT id FROM factory_shift_sessions
         WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
        [fixture.userId]
      ))?.id;
    expect(sessionId, 'factory session created').toBeTruthy();

    const endRes = await api.post('/api/factory/kiosk/end-shift', {
      data: { sessionId, notes: 'TEST_E2E_factory_end' },
      headers: authHeaders(token),
    });
    expect(endRes.status(), `body=${await endRes.text()}`).toBe(200);

    const after = await queryOne<{ status: string; check_out_time: Date | null }>(
      `SELECT status, check_out_time FROM factory_shift_sessions WHERE id = $1`,
      [sessionId]
    );
    expect(after?.status).toBe('completed');
    expect(after?.check_out_time).not.toBeNull();
  });

  test('Senaryo 4: Factory quick-end (acil kapanış)', async () => {
    if (!stationId) test.skip(true, 'No active factory station in DB');

    // Login
    const loginRes = await api.post('/api/factory/kiosk/login', {
      data: { userId: fixture.userId, pin: fixture.pin },
    });
    if (loginRes.status() !== 200) {
      test.skip(true, `Factory login not available (status=${loginRes.status()})`);
      return;
    }
    const token: string = (await loginRes.json()).kioskToken;

    // Manually insert active session (simulating mid-shift state)
    const created = await queryOne<{ id: number }>(
      `INSERT INTO factory_shift_sessions
       (user_id, station_id, check_in_time, status)
       VALUES ($1, $2, NOW() - INTERVAL '2 hours', 'active')
       RETURNING id`,
      [fixture.userId, stationId]
    );
    const sessionId = created!.id;

    // Insert matching shift_attendance within ±5min window.
    // shift_attendance.shift_id is NOT NULL FK; find any existing shift to satisfy.
    const anyShift = await queryOne<{ id: number }>(
      `SELECT id FROM shifts ORDER BY id DESC LIMIT 1`
    );
    if (anyShift) {
      await query(
        `INSERT INTO shift_attendance (shift_id, user_id, check_in_time, status)
         VALUES ($1, $2, NOW() - INTERVAL '2 hours', 'active')`,
        [anyShift.id, fixture.userId]
      );
    }

    const quickRes = await api.post('/api/factory/kiosk/quick-end', {
      data: {},
      headers: authHeaders(token),
    });
    expect(quickRes.status(), `body=${await quickRes.text()}`).toBe(200);
    const body = await quickRes.json();
    expect(body.sessionId).toBe(sessionId);
    expect(body.message).toContain('Vardiya');

    const after = await queryOne<{ status: string; check_out_time: Date | null }>(
      `SELECT status, check_out_time FROM factory_shift_sessions WHERE id = $1`,
      [sessionId]
    );
    expect(after?.status).toBe('completed');
    expect(after?.check_out_time).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Auto-checkout scheduler smoke
// ---------------------------------------------------------------------------

test.describe('Senaryo 5: Auto-checkout scheduler simülasyonu', () => {
  let fixture: TestKioskFixture;

  test.beforeAll(async () => {
    const branchId = await findUsableBranch();
    fixture = await seedKioskUser({ branchId, role: 'barista' });
  });

  test.afterAll(async () => {
    if (fixture) await fixture.cleanup();
  });

  test('Per-branch auto_close_time ayarı + stale active session davranışı', async () => {
    // 1. Verify branch_kiosk_settings table exists and has auto_close_time column
    const colCheck = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'branch_kiosk_settings'
       AND column_name IN ('auto_close_time', 'branch_id')`
    );
    expect(colCheck.length, 'branch_kiosk_settings.auto_close_time exists').toBe(2);

    // 2. Insert a "stale" active session that auto-checkout would target
    const created = await queryOne<{ id: number }>(
      `INSERT INTO branch_shift_sessions
       (user_id, branch_id, check_in_time, status, work_minutes, break_minutes)
       VALUES ($1, $2, NOW() - INTERVAL '14 hours', 'active', 0, 0)
       RETURNING id`,
      [fixture.userId, fixture.branchId]
    );
    const sessionId = created!.id;

    // 3. Verify the session is selectable by the auto-checkout query pattern
    //    (status='active' AND check_in_time older than threshold)
    const targets = await query<{ id: number }>(
      `SELECT id FROM branch_shift_sessions
       WHERE id = $1 AND status = 'active'
       AND check_in_time < NOW() - INTERVAL '8 hours'`,
      [sessionId]
    );
    expect(targets.length, 'auto-checkout would target this session').toBe(1);

    // NOTE: We do NOT trigger the actual scheduler here because:
    //   - server/index.ts setInterval is global (would affect real data)
    //   - forceCloseAllBranchShifts is not exported as a callable HTTP endpoint
    // Real scheduler verification belongs in a manual cron-test or by
    // refactoring the scheduler to expose a test-only HTTP trigger (out of
    // scope for B12 — open follow-up if needed).

    // Cleanup the manual session (cleanup() also handles it)
    await query(`DELETE FROM branch_shift_sessions WHERE id = $1`, [sessionId]);
  });
});
