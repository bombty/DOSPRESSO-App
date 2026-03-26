import { db } from './db';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function seedPdksSprintA() {
  try {
    // 1. Fix employment_type inconsistencies — idempotent (UPDATE WHERE old_value, no-op after first run)
    const etFixResult = await db.execute(sql`
      UPDATE users SET employment_type = 'fulltime' WHERE employment_type = 'tam_zamanli'
    `);
    const etFixResult2 = await db.execute(sql`
      UPDATE users SET employment_type = 'parttime' WHERE employment_type = 'yari_zamanli'
    `);
    const etFixed = (etFixResult.rowCount ?? 0) + (etFixResult2.rowCount ?? 0);
    if (etFixed > 0) {
      console.log(`[PDKS-SPRINT-A] employment_type normalization: ${etFixed} users updated.`);
    }

    // 2. Ensure branch_kiosk_settings rows exist for HQ (23) and Fabrika (24) — idempotent upsert
    // ON CONFLICT uses COALESCE so existing values (including real kiosk_password) are never overwritten
    // Fallback password is a random hex string (used only on fresh insert, never in production)
    const hqFallbackPw = randomBytes(16).toString('hex');
    const fabFallbackPw = randomBytes(16).toString('hex');

    await db.execute(sql`
      INSERT INTO branch_kiosk_settings (branch_id, kiosk_password, default_shift_start_time, default_shift_end_time, late_tolerance_minutes, early_leave_tolerance_minutes, default_break_minutes, auto_close_time, is_kiosk_enabled, kiosk_mode, created_at, updated_at)
      VALUES (23, ${hqFallbackPw}, '09:00', '18:00', 15, 15, 60, '21:00', true, 'pin', NOW(), NOW())
      ON CONFLICT (branch_id) DO UPDATE
        SET default_shift_start_time = COALESCE(branch_kiosk_settings.default_shift_start_time, EXCLUDED.default_shift_start_time),
            default_shift_end_time   = COALESCE(branch_kiosk_settings.default_shift_end_time, EXCLUDED.default_shift_end_time),
            late_tolerance_minutes   = COALESCE(branch_kiosk_settings.late_tolerance_minutes, EXCLUDED.late_tolerance_minutes),
            early_leave_tolerance_minutes = COALESCE(branch_kiosk_settings.early_leave_tolerance_minutes, EXCLUDED.early_leave_tolerance_minutes),
            default_break_minutes    = COALESCE(branch_kiosk_settings.default_break_minutes, EXCLUDED.default_break_minutes),
            auto_close_time          = COALESCE(branch_kiosk_settings.auto_close_time, EXCLUDED.auto_close_time),
            updated_at = NOW()
    `);
    await db.execute(sql`
      INSERT INTO branch_kiosk_settings (branch_id, kiosk_password, default_shift_start_time, default_shift_end_time, late_tolerance_minutes, early_leave_tolerance_minutes, default_break_minutes, auto_close_time, is_kiosk_enabled, kiosk_mode, created_at, updated_at)
      VALUES (24, ${fabFallbackPw}, '08:00', '18:00', 15, 15, 60, '22:00', true, 'pin', NOW(), NOW())
      ON CONFLICT (branch_id) DO UPDATE
        SET default_shift_start_time = COALESCE(branch_kiosk_settings.default_shift_start_time, EXCLUDED.default_shift_start_time),
            default_shift_end_time   = COALESCE(branch_kiosk_settings.default_shift_end_time, EXCLUDED.default_shift_end_time),
            late_tolerance_minutes   = COALESCE(branch_kiosk_settings.late_tolerance_minutes, EXCLUDED.late_tolerance_minutes),
            early_leave_tolerance_minutes = COALESCE(branch_kiosk_settings.early_leave_tolerance_minutes, EXCLUDED.early_leave_tolerance_minutes),
            default_break_minutes    = COALESCE(branch_kiosk_settings.default_break_minutes, EXCLUDED.default_break_minutes),
            auto_close_time          = COALESCE(branch_kiosk_settings.auto_close_time, EXCLUDED.auto_close_time),
            updated_at = NOW()
    `);

    // 3. Close stale branch shift sessions older than 24 hours with no checkout + write PDKS cikis
    // First find stale sessions so we can write PDKS cikis for each
    const staleSessions = await db.execute(sql`
      SELECT id, user_id, branch_id, check_in_time
      FROM branch_shift_sessions
      WHERE status IN ('active', 'on_break')
        AND check_in_time < NOW() - INTERVAL '24 hours'
        AND check_out_time IS NULL
    `);
    if (staleSessions.rows.length > 0) {
      console.log(`[PDKS-SPRINT-A] Stale session close: ${staleSessions.rows.length} branch sessions auto-closing.`);
      for (const row of staleSessions.rows as Array<{ id: number; user_id: string; branch_id: number; check_in_time: string }>) {
        const closeTime = new Date(new Date(row.check_in_time).getTime() + 9 * 60 * 60 * 1000);
        await db.execute(sql`
          UPDATE branch_shift_sessions
          SET status = 'completed',
              check_out_time = ${closeTime.toISOString()}
          WHERE id = ${row.id}
        `);
        // Write PDKS cikis for the forced close (only if not already present)
        await db.execute(sql`
          INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at)
          SELECT ${row.user_id}, ${row.branch_id}, ${closeTime.toISOString().split('T')[0]}::date,
                 ${closeTime.toTimeString().split(' ')[0]}::time, 'cikis', 'auto_close', 'stale-session-cleanup', NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM pdks_records pr
            WHERE pr.user_id = ${row.user_id}
              AND pr.record_date = ${closeTime.toISOString().split('T')[0]}::date
              AND pr.record_type = 'cikis'
              AND pr.branch_id = ${row.branch_id}
          )
        `);
      }
    }

    // 4–7: PDKS backfill — NOT EXISTS guards check any existing record for same user/date/record_type/branch_id
    // Pre-check: count missing records before INSERT to log verification
    const missingFabGiris = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM factory_shift_sessions fss
      JOIN users u ON u.id = fss.user_id
      WHERE fss.check_in_time IS NOT NULL
        AND fss.check_in_time >= '2026-01-01'
        AND NOT EXISTS (
          SELECT 1 FROM pdks_records pr
          WHERE pr.user_id = fss.user_id
            AND pr.record_date = fss.check_in_time::date
            AND pr.record_type = 'giris'
            AND pr.branch_id = COALESCE(u.branch_id, 24)
        )
    `);
    const missingFabGirisCount = Number((missingFabGiris.rows[0] as { cnt: string }).cnt);

    if (missingFabGirisCount > 0) {
      console.log(`[PDKS-SPRINT-A] Backfill: ${missingFabGirisCount} missing factory giris records found. Inserting...`);
      await db.execute(sql`
        INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at)
        SELECT
          fss.user_id,
          COALESCE(u.branch_id, 24) AS branch_id,
          fss.check_in_time::date AS record_date,
          fss.check_in_time::time AS record_time,
          'giris' AS record_type,
          'migration_fix' AS source,
          'factory-kiosk' AS device_info,
          NOW()
        FROM factory_shift_sessions fss
        JOIN users u ON u.id = fss.user_id
        WHERE fss.check_in_time IS NOT NULL
          AND fss.check_in_time >= '2026-01-01'
          AND NOT EXISTS (
            SELECT 1 FROM pdks_records pr
            WHERE pr.user_id = fss.user_id
              AND pr.record_date = fss.check_in_time::date
              AND pr.record_type = 'giris'
              AND pr.branch_id = COALESCE(u.branch_id, 24)
          )
      `);
    }

    const missingFabCikis = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM factory_shift_sessions fss
      JOIN users u ON u.id = fss.user_id
      WHERE fss.check_out_time IS NOT NULL
        AND fss.check_out_time >= '2026-01-01'
        AND NOT EXISTS (
          SELECT 1 FROM pdks_records pr
          WHERE pr.user_id = fss.user_id
            AND pr.record_date = fss.check_out_time::date
            AND pr.record_type = 'cikis'
            AND pr.branch_id = COALESCE(u.branch_id, 24)
        )
    `);
    const missingFabCikisCount = Number((missingFabCikis.rows[0] as { cnt: string }).cnt);

    if (missingFabCikisCount > 0) {
      console.log(`[PDKS-SPRINT-A] Backfill: ${missingFabCikisCount} missing factory cikis records found. Inserting...`);
      await db.execute(sql`
        INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at)
        SELECT
          fss.user_id,
          COALESCE(u.branch_id, 24) AS branch_id,
          fss.check_out_time::date AS record_date,
          fss.check_out_time::time AS record_time,
          'cikis' AS record_type,
          'migration_fix' AS source,
          'factory-kiosk' AS device_info,
          NOW()
        FROM factory_shift_sessions fss
        JOIN users u ON u.id = fss.user_id
        WHERE fss.check_out_time IS NOT NULL
          AND fss.check_out_time >= '2026-01-01'
          AND NOT EXISTS (
            SELECT 1 FROM pdks_records pr
            WHERE pr.user_id = fss.user_id
              AND pr.record_date = fss.check_out_time::date
              AND pr.record_type = 'cikis'
              AND pr.branch_id = COALESCE(u.branch_id, 24)
          )
      `);
    }

    const missingHqGiris = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM hq_shift_sessions hss
      WHERE hss.check_in_time IS NOT NULL
        AND hss.check_in_time >= '2026-01-01'
        AND NOT EXISTS (
          SELECT 1 FROM pdks_records pr
          WHERE pr.user_id = hss.user_id
            AND pr.record_date = hss.check_in_time::date
            AND pr.record_type = 'giris'
            AND pr.branch_id = 23
        )
    `);
    const missingHqGirisCount = Number((missingHqGiris.rows[0] as { cnt: string }).cnt);

    if (missingHqGirisCount > 0) {
      console.log(`[PDKS-SPRINT-A] Backfill: ${missingHqGirisCount} missing HQ giris records found. Inserting...`);
      await db.execute(sql`
        INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at)
        SELECT
          hss.user_id,
          23 AS branch_id,
          hss.check_in_time::date AS record_date,
          hss.check_in_time::time AS record_time,
          'giris' AS record_type,
          'migration_fix' AS source,
          'hq-kiosk' AS device_info,
          NOW()
        FROM hq_shift_sessions hss
        WHERE hss.check_in_time IS NOT NULL
          AND hss.check_in_time >= '2026-01-01'
          AND NOT EXISTS (
            SELECT 1 FROM pdks_records pr
            WHERE pr.user_id = hss.user_id
              AND pr.record_date = hss.check_in_time::date
              AND pr.record_type = 'giris'
              AND pr.branch_id = 23
          )
      `);
    }

    const missingHqCikis = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM hq_shift_sessions hss
      WHERE hss.check_out_time IS NOT NULL
        AND hss.check_out_time >= '2026-01-01'
        AND NOT EXISTS (
          SELECT 1 FROM pdks_records pr
          WHERE pr.user_id = hss.user_id
            AND pr.record_date = hss.check_out_time::date
            AND pr.record_type = 'cikis'
            AND pr.branch_id = 23
        )
    `);
    const missingHqCikisCount = Number((missingHqCikis.rows[0] as { cnt: string }).cnt);

    if (missingHqCikisCount > 0) {
      console.log(`[PDKS-SPRINT-A] Backfill: ${missingHqCikisCount} missing HQ cikis records found. Inserting...`);
      await db.execute(sql`
        INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info, created_at)
        SELECT
          hss.user_id,
          23 AS branch_id,
          hss.check_out_time::date AS record_date,
          hss.check_out_time::time AS record_time,
          'cikis' AS record_type,
          'migration_fix' AS source,
          'hq-kiosk' AS device_info,
          NOW()
        FROM hq_shift_sessions hss
        WHERE hss.check_out_time IS NOT NULL
          AND hss.check_out_time >= '2026-01-01'
          AND NOT EXISTS (
            SELECT 1 FROM pdks_records pr
            WHERE pr.user_id = hss.user_id
              AND pr.record_date = hss.check_out_time::date
              AND pr.record_type = 'cikis'
              AND pr.branch_id = 23
          )
      `);
    }

    if (missingFabGirisCount + missingFabCikisCount + missingHqGirisCount + missingHqCikisCount === 0) {
      console.log('[PDKS-SPRINT-A] Backfill: all PDKS records already present, no inserts needed.');
    }

    console.log('[PDKS-SPRINT-A] Migration seed completed: employment_type fix, kiosk settings bootstrap, stale session close, PDKS backfill.');
  } catch (error: unknown) {
    console.error('[PDKS-SPRINT-A] Migration seed error (non-fatal):', error instanceof Error ? error.message : String(error));
  }
}
