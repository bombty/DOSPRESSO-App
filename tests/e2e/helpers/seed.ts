/**
 * Test data seed/cleanup helpers for kiosk shift-closure E2E tests.
 *
 * All seeded rows are tagged with TEST_E2E_ prefix in firstName so they can
 * be safely cleaned up without touching real pilot data.
 *
 * Schema notes (verified via \d):
 *   - users.id          → varchar (uuid, gen_random_uuid default)
 *   - users.hashed_password (NOT users.password)
 *   - branches.id       → integer; branch 23=HQ, branch 24=Fabrika (pilot)
 *   - branch_staff_pins.user_id → varchar
 *   - branches has no branch_type column
 */
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { query, queryOne } from './db';

export const TEST_PREFIX = 'TEST_E2E_';

export interface TestKioskFixture {
  branchId: number;
  userId: string; // varchar uuid
  username: string;
  pin: string;
  cleanup: () => Promise<void>;
}

function makeId(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Find a usable branch. Pilot DB convention:
 *   - id 23 = HQ (Merkez Ofis)
 *   - id 24 = Factory (Fabrika)
 *   - id 1, 5, ... = regular branches
 */
export async function findUsableBranch(opts: {
  preferHq?: boolean;
  preferFactory?: boolean;
} = {}): Promise<number> {
  if (opts.preferHq) {
    const hq = await queryOne<{ id: number }>(
      `SELECT id FROM branches
       WHERE (name ILIKE '%HQ%' OR name ILIKE '%merkez%' OR id = 23)
       AND deleted_at IS NULL
       ORDER BY id LIMIT 1`
    );
    if (hq) return hq.id;
  }
  if (opts.preferFactory) {
    const f = await queryOne<{ id: number }>(
      `SELECT id FROM branches
       WHERE (name ILIKE '%fabrika%' OR id = 24)
       AND deleted_at IS NULL
       ORDER BY id LIMIT 1`
    );
    if (f) return f.id;
  }
  const any = await queryOne<{ id: number }>(
    `SELECT id FROM branches
     WHERE deleted_at IS NULL
     AND id NOT IN (23, 24)
     ORDER BY id LIMIT 1`
  );
  if (!any) throw new Error('No regular branches in DB — pilot DB expected');
  return any.id;
}

/**
 * Create a test user with PIN attached to the given branch.
 * Returns fixture + cleanup function.
 */
export async function seedKioskUser(opts: {
  branchId: number;
  role?: string;
  pin?: string;
}): Promise<TestKioskFixture> {
  const id = makeId();
  const username = `${TEST_PREFIX}user_${id}`;
  const pin = opts.pin || '4271';
  const role = opts.role || 'barista';
  const hashedPin = await bcrypt.hash(pin, 10);
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);
  const userIdValue = randomUUID();

  // 1. Insert user
  const userRow = await queryOne<{ id: string }>(
    `INSERT INTO users (id, username, hashed_password, first_name, last_name, role, branch_id, is_active, account_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved')
     RETURNING id`,
    [userIdValue, username, hashedPassword, `${TEST_PREFIX}First`, `${TEST_PREFIX}Last`, role, opts.branchId]
  );
  if (!userRow) throw new Error('Failed to insert test user');
  const userId = userRow.id;

  // 2. Insert PIN
  await query(
    `INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, pin_failed_attempts)
     VALUES ($1, $2, $3, true, 0)`,
    [userId, opts.branchId, hashedPin]
  );

  const cleanup = async () => {
    // Order matters: delete dependents first
    await query(`DELETE FROM kiosk_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM pdks_records WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM shift_attendance WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM branch_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM hq_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM factory_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM branch_staff_pins WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
  };

  return { branchId: opts.branchId, userId, username, pin, cleanup };
}

/**
 * Find an active factory station for factory tests.
 */
export async function findFactoryStation(): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM factory_stations WHERE is_active = true ORDER BY id LIMIT 1`
  ).catch(() => null);
  return row?.id ?? null;
}
