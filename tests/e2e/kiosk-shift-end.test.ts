/**
 * E2E regression tests for kiosk shift-end flows (task #277, guards task #273).
 *
 * Verifies that Branch / HQ / Factory kiosk close-out endpoints update both
 * the shift session AND the linked shift_attendance row's check_out_time.
 *
 * Run:
 *   RUN_KIOSK_E2E=1 npx vitest run tests/e2e/kiosk-shift-end.test.ts
 *
 * Required env:
 *   RUN_KIOSK_E2E=1     suite is skipped unless explicitly enabled
 *   DATABASE_URL        target DB (writes isolated test fixtures + cleans up)
 *   E2E_BASE_URL        optional; defaults to http://127.0.0.1:5000
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const RUN = process.env.RUN_KIOSK_E2E === '1';
const describeMaybe = RUN ? describe : describe.skip;

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const TEST_PIN = '0000';

const BRANCH_ID = 5;
const FACTORY_BRANCH_ID = 24;

const TAG = `e2e277_${Date.now().toString(36)}`;

const fixture = {
  branchUserId: '',
  factoryUserId: '',
  hqUserId: '',
  shiftIds: [] as number[],
};

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : null;

async function api(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-kiosk-token'] = token;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

async function createUser(opts: {
  username: string;
  role: string;
  branchId: number | null;
}): Promise<string> {
  const id = randomUUID();
  await pool!.query(
    `INSERT INTO users (id, username, first_name, last_name, role, branch_id, is_active, account_status)
     VALUES ($1, $2, $3, $4, $5, $6, true, 'approved')`,
    [id, opts.username, 'E2E', TAG, opts.role, opts.branchId],
  );
  return id;
}

async function setBranchPin(userId: string, branchId: number) {
  const hash = await bcrypt.hash(TEST_PIN, 10);
  await pool!.query(
    `INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active)
     VALUES ($1, $2, $3, true)`,
    [userId, branchId, hash],
  );
}

async function setFactoryPin(userId: string) {
  const hash = await bcrypt.hash(TEST_PIN, 10);
  await pool!.query(
    `INSERT INTO factory_staff_pins (user_id, hashed_pin, is_active)
     VALUES ($1, $2, true)`,
    [userId, hash],
  );
}

async function cleanupUser(userId: string) {
  if (!userId) return;
  // Order matters due to FKs.
  await pool!.query(`DELETE FROM shift_attendance WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM branch_shift_events WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM branch_shift_sessions WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM hq_shift_events WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM hq_shift_sessions WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM factory_shift_sessions WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM pdks_records WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM kiosk_sessions WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM branch_staff_pins WHERE user_id = $1`, [userId]);
  await pool!.query(`DELETE FROM factory_staff_pins WHERE user_id = $1`, [userId]);
  await pool!.query(
    `DELETE FROM shifts WHERE assigned_to_id = $1 OR created_by_id = $1`,
    [userId],
  );
  await pool!.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

beforeAll(async () => {
  if (!RUN) return;
  if (!pool) throw new Error('DATABASE_URL must be set for kiosk E2E tests');
  const reachable = await fetch(`${BASE_URL}/api/auth/user`).catch(() => null);
  if (!reachable) {
    throw new Error(`Cannot reach API at ${BASE_URL}. Start the dev server first.`);
  }

  fixture.branchUserId = await createUser({
    username: `e2e_branch_${TAG}`,
    role: 'barista',
    branchId: BRANCH_ID,
  });
  await setBranchPin(fixture.branchUserId, BRANCH_ID);

  fixture.factoryUserId = await createUser({
    username: `e2e_factory_${TAG}`,
    role: 'fabrika_operator',
    branchId: FACTORY_BRANCH_ID,
  });
  await setFactoryPin(fixture.factoryUserId);

  fixture.hqUserId = await createUser({
    username: `e2e_hq_${TAG}`,
    role: 'muhasebe_ik',
    branchId: null,
  });
  // HQ kiosk falls back to PIN '0000' when phone_number is null.
});

afterAll(async () => {
  if (!RUN || !pool) return;
  try {
    await cleanupUser(fixture.branchUserId);
    await cleanupUser(fixture.factoryUserId);
    await cleanupUser(fixture.hqUserId);
  } finally {
    await pool.end();
  }
});

describeMaybe('Kiosk shift-end E2E (task #273 regression)', () => {
  it('Branch kiosk: login → shift-start → shift-end closes both tables', async () => {
    const login = await api(`/api/branches/${BRANCH_ID}/kiosk/login`, {
      userId: fixture.branchUserId,
      pin: TEST_PIN,
    });
    expect(login.status, JSON.stringify(login.data)).toBe(200);
    const token: string = login.data.kioskToken;
    expect(token).toBeTruthy();

    const start = await api(
      `/api/branches/${BRANCH_ID}/kiosk/shift-start`,
      { userId: fixture.branchUserId, gpsFallback: false },
      token,
    );
    expect(start.status, JSON.stringify(start.data)).toBe(200);
    const sessionId: number = start.data.session?.id ?? start.data.id;
    expect(sessionId).toBeTruthy();

    const end = await api(
      `/api/branches/${BRANCH_ID}/kiosk/shift-end`,
      { sessionId },
      token,
    );
    expect(end.status, JSON.stringify(end.data)).toBe(200);

    const { rows } = await pool!.query(
      `SELECT bss.check_out_time AS session_co,
              bss.shift_attendance_id,
              sa.check_out_time AS sa_co
         FROM branch_shift_sessions bss
         LEFT JOIN shift_attendance sa ON sa.id = bss.shift_attendance_id
        WHERE bss.id = $1`,
      [sessionId],
    );
    expect(rows[0].session_co).not.toBeNull();
    expect(rows[0].shift_attendance_id).not.toBeNull();
    expect(rows[0].sa_co).not.toBeNull();
  }, 30_000);

  it('HQ kiosk: login → shift-start → exit(end_of_day) closes both tables', async () => {
    const login = await api('/api/hq/kiosk/login', {
      userId: fixture.hqUserId,
      pin: TEST_PIN,
    });
    expect(login.status, JSON.stringify(login.data)).toBe(200);
    const token: string = login.data.kioskToken;
    expect(token).toBeTruthy();

    const start = await api('/api/hq/kiosk/shift-start', { userId: fixture.hqUserId }, token);
    expect(start.status, JSON.stringify(start.data)).toBe(200);
    const sessionId: number = start.data.session?.id ?? start.data.id;
    expect(sessionId).toBeTruthy();

    const exit = await api(
      '/api/hq/kiosk/exit',
      { sessionId, exitReason: 'end_of_day' },
      token,
    );
    expect(exit.status, JSON.stringify(exit.data)).toBe(200);

    const sessRows = await pool!.query(
      `SELECT check_in_time, check_out_time FROM hq_shift_sessions WHERE id = $1`,
      [sessionId],
    );
    expect(sessRows.rows[0].check_out_time).not.toBeNull();

    const checkIn: Date = sessRows.rows[0].check_in_time;
    const winStart = new Date(checkIn.getTime() - 5 * 60_000);
    const winEnd = new Date(checkIn.getTime() + 5 * 60_000);
    const saRows = await pool!.query(
      `SELECT check_out_time, status FROM shift_attendance
        WHERE user_id = $1 AND check_in_time BETWEEN $2 AND $3
        ORDER BY check_in_time DESC LIMIT 1`,
      [fixture.hqUserId, winStart, winEnd],
    );
    expect(saRows.rows.length).toBeGreaterThan(0);
    expect(saRows.rows[0].check_out_time).not.toBeNull();
    expect(saRows.rows[0].status).toBe('completed');
  }, 30_000);

  it('Factory kiosk: login → start-shift → end-shift closes both tables', async () => {
    const login = await api('/api/factory/kiosk/login', {
      userId: fixture.factoryUserId,
      pin: TEST_PIN,
    });
    expect(login.status, JSON.stringify(login.data)).toBe(200);
    const token: string = login.data.kioskToken;
    expect(token).toBeTruthy();

    const start = await api(
      '/api/factory/kiosk/start-shift',
      { userId: fixture.factoryUserId },
      token,
    );
    expect(start.status, JSON.stringify(start.data)).toBe(200);
    const sessionId: number = start.data.session?.id ?? start.data.id;
    expect(sessionId).toBeTruthy();

    // factory start-shift only inserts shift_attendance on late arrivals.
    // Seed an open SA in the ±5min window so the close path is exercised.
    const sessRow = await pool!.query(
      `SELECT check_in_time FROM factory_shift_sessions WHERE id = $1`,
      [sessionId],
    );
    const checkIn: Date = sessRow.rows[0].check_in_time;

    const ins = await pool!.query(
      `INSERT INTO shifts (branch_id, assigned_to_id, created_by_id, shift_date, start_time, end_time, shift_type, status)
       VALUES ($1, $2, $2, CURRENT_DATE, '08:00', '17:00', 'adhoc', 'active')
       RETURNING id`,
      [FACTORY_BRANCH_ID, fixture.factoryUserId],
    );
    fixture.shiftIds.push(ins.rows[0].id);
    await pool!.query(
      `INSERT INTO shift_attendance (shift_id, user_id, check_in_time, status)
       VALUES ($1, $2, $3, 'present')`,
      [ins.rows[0].id, fixture.factoryUserId, checkIn],
    );

    const end = await api(
      '/api/factory/kiosk/end-shift',
      { sessionId, quantityProduced: 0, quantityWaste: 0 },
      token,
    );
    expect(end.status, JSON.stringify(end.data)).toBe(200);

    const fsRows = await pool!.query(
      `SELECT check_out_time FROM factory_shift_sessions WHERE id = $1`,
      [sessionId],
    );
    expect(fsRows.rows[0].check_out_time).not.toBeNull();

    const winStart = new Date(checkIn.getTime() - 5 * 60_000);
    const winEnd = new Date(checkIn.getTime() + 5 * 60_000);
    const saRows = await pool!.query(
      `SELECT check_out_time, status FROM shift_attendance
        WHERE user_id = $1 AND check_in_time BETWEEN $2 AND $3
        ORDER BY check_in_time DESC LIMIT 1`,
      [fixture.factoryUserId, winStart, winEnd],
    );
    expect(saRows.rows.length).toBeGreaterThan(0);
    expect(saRows.rows[0].check_out_time).not.toBeNull();
    expect(saRows.rows[0].status).toBe('completed');
  }, 30_000);
});
