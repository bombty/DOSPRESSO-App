/**
 * Test data seed/cleanup helpers for kiosk shift-closure E2E tests.
 *
 * All seeded rows are tagged with TEST_E2E_ prefix in firstName so they can
 * be safely cleaned up without touching real pilot data.
 *
 * Schema notes (verified via \d):
 *   - users.id              → varchar (uuid)
 *   - users.hashed_password (NOT users.password)
 *   - branches: 23=HQ (Merkez Ofis), 24=Fabrika; no branch_type column
 *   - branch_staff_pins.user_id → varchar (also has branch_id FK)
 *   - factory_staff_pins.user_id → varchar (no branch_id; UNIQUE on user_id)
 *   - HQ kiosk login: PIN = users.phoneNumber.slice(-4) plaintext
 *     (see server/routes/branches.ts:4168 — TODO bcrypt migration tracked)
 */
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { query, queryOne } from './db';

export const TEST_PREFIX = 'TEST_E2E_';
export const HQ_BRANCH_ID = 23;
export const FACTORY_BRANCH_ID = 24;

export interface TestKioskFixture {
  branchId: number;        // logical branch (HQ_BRANCH_ID for HQ users)
  userId: string;
  username: string;
  pin: string;
  cleanup: () => Promise<void>;
}

function makeId(): string {
  return randomBytes(4).toString('hex');
}

export async function findUsableBranch(): Promise<number> {
  const any = await queryOne<{ id: number }>(
    `SELECT id FROM branches
     WHERE deleted_at IS NULL
     AND id NOT IN (${HQ_BRANCH_ID}, ${FACTORY_BRANCH_ID})
     ORDER BY id LIMIT 1`
  );
  if (!any) throw new Error('No regular branches in DB — pilot DB expected');
  return any.id;
}

async function insertTestUser(opts: {
  branchId: number | null;
  role: string;
  phoneNumber?: string | null;
}): Promise<{ userId: string; username: string }> {
  const id = makeId();
  const username = `${TEST_PREFIX}user_${id}`;
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);
  const userIdValue = randomUUID();
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (id, username, hashed_password, first_name, last_name,
                        role, branch_id, phone_number, is_active, account_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'approved')
     RETURNING id`,
    [
      userIdValue,
      username,
      hashedPassword,
      `${TEST_PREFIX}First`,
      `${TEST_PREFIX}Last`,
      opts.role,
      opts.branchId,
      opts.phoneNumber ?? null,
    ]
  );
  if (!row) throw new Error('Failed to insert test user');
  return { userId: row.id, username };
}

function buildCleanup(userId: string): () => Promise<void> {
  return async () => {
    await query(`DELETE FROM kiosk_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM attendance_penalties WHERE shift_attendance_id IN
                   (SELECT id FROM shift_attendance WHERE user_id = $1)`, [userId]).catch(() => {});
    await query(`DELETE FROM pdks_records WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM hq_shift_events WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM branch_shift_events WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM factory_production_runs WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM factory_production_outputs WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM shift_attendance WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM branch_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM hq_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM factory_shift_sessions WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM shifts WHERE assigned_to_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM branch_staff_pins WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM factory_staff_pins WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
  };
}

/** Branch kiosk: bcrypt PIN in branch_staff_pins (per-branch). */
export async function seedBranchKioskUser(opts: {
  branchId: number;
  role?: string;
  pin?: string;
}): Promise<TestKioskFixture> {
  const pin = opts.pin || '4271';
  const hashedPin = await bcrypt.hash(pin, 10);
  const { userId, username } = await insertTestUser({
    branchId: opts.branchId,
    role: opts.role || 'barista',
  });
  await query(
    `INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, pin_failed_attempts)
     VALUES ($1, $2, $3, true, 0)`,
    [userId, opts.branchId, hashedPin]
  );
  return { branchId: opts.branchId, userId, username, pin, cleanup: buildCleanup(userId) };
}

/** HQ kiosk: PIN derived from users.phoneNumber.slice(-4). branchId IS NULL. */
export async function seedHqKioskUser(opts: {
  role?: string;
  pin?: string;
}): Promise<TestKioskFixture> {
  const pin = opts.pin || '7531';
  // PIN must equal phoneNumber.slice(-4)
  const phoneNumber = `+90555${randomBytes(2).toString('hex')}${pin}`;
  const { userId, username } = await insertTestUser({
    branchId: null,
    role: opts.role || 'genel_mudur_yardimcisi',
    phoneNumber,
  });
  return { branchId: HQ_BRANCH_ID, userId, username, pin, cleanup: buildCleanup(userId) };
}

/** Factory kiosk: bcrypt PIN in factory_staff_pins (no branch_id). */
export async function seedFactoryKioskUser(opts: {
  role?: string;
  pin?: string;
}): Promise<TestKioskFixture> {
  const pin = opts.pin || '8642';
  const hashedPin = await bcrypt.hash(pin, 10);
  const { userId, username } = await insertTestUser({
    branchId: FACTORY_BRANCH_ID,
    role: opts.role || 'fabrika_isci',
  });
  await query(
    `INSERT INTO factory_staff_pins (user_id, hashed_pin, is_active, pin_failed_attempts)
     VALUES ($1, $2, true, 0)`,
    [userId, hashedPin]
  );
  return { branchId: FACTORY_BRANCH_ID, userId, username, pin, cleanup: buildCleanup(userId) };
}

export async function findFactoryStation(): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM factory_stations WHERE is_active = true ORDER BY id LIMIT 1`
  ).catch(() => null);
  return row?.id ?? null;
}
