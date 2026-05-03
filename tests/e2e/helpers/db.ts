/**
 * Test DB helper — raw pg client, no Drizzle.
 * Connects to the same DATABASE_URL as the dev server.
 *
 * IMPORTANT: All test data uses TEST_E2E_ prefix in notes/firstName fields
 * for easy cleanup. Tests are responsible for their own cleanup via afterAll.
 */
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set — required for E2E tests');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
