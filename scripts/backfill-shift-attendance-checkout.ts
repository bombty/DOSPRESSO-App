/**
 * Backfill: branch_shift_sessions.check_out_time IS NOT NULL ama bağlı
 * shift_attendance.check_out_time IS NULL olan kayıtları kapatır.
 *
 * DECISIONS madde 15 (`docs/DECISIONS.md`) ve task #273 kapsamında üretildi.
 *
 * Modlar:
 *   tsx scripts/backfill-shift-attendance-checkout.ts            # dry-run (default)
 *   tsx scripts/backfill-shift-attendance-checkout.ts --commit   # gerçek UPDATE
 *
 * DECISIONS madde 9 (DB write protokolü) gereği:
 *   1) Önce backup alın (pg_dump veya snapshot)
 *   2) Dry-run çıktısını owner ile paylaşın
 *   3) Owner GO sonrası --commit modunda çalıştırın
 *
 * Pilot test kayıtları (notes='PILOT_PRE_DAY1_TEST_2026_04_29')
 * KAPSAM DIŞIDIR — gerçek operasyon kayıtlarından ayrı tutulur.
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

const PILOT_NOTE = "PILOT_PRE_DAY1_TEST_2026_04_29";

interface CandidateRow {
  sa_id: number;
  sa_user_id: string;
  sa_check_in: string;
  session_id: number;
  session_check_out: string;
  session_notes: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");

  console.log(
    `\n=== shift_attendance check-out backfill ===\nMode: ${commit ? "COMMIT" : "DRY-RUN"}\nPilot notu '${PILOT_NOTE}' olan kayıtlar HARİÇ tutulur.\n`,
  );

  const candidatesResult = await db.execute(sql`
    SELECT
      sa.id           AS sa_id,
      sa.user_id      AS sa_user_id,
      sa.check_in_time AS sa_check_in,
      s.id            AS session_id,
      s.check_out_time AS session_check_out,
      s.notes         AS session_notes
    FROM shift_attendance sa
    JOIN branch_shift_sessions s ON s.shift_attendance_id = sa.id
    WHERE sa.check_out_time IS NULL
      AND s.check_out_time IS NOT NULL
      AND (s.notes IS NULL OR s.notes <> ${PILOT_NOTE})
      AND (sa.notes IS NULL OR sa.notes <> ${PILOT_NOTE})
    ORDER BY s.check_out_time ASC
  `);

  const rows = (candidatesResult.rows || []) as unknown as CandidateRow[];
  console.log(`Aday kayıt sayısı: ${rows.length}`);

  if (rows.length === 0) {
    console.log("Backfill gerekmiyor — tüm kayıtlar tutarlı.");
    return;
  }

  const sample = rows.slice(0, 10);
  console.log("\nİlk 10 örnek:");
  for (const r of sample) {
    console.log(
      `  sa.id=${r.sa_id} user=${r.sa_user_id} session=${r.session_id} session.check_out=${r.session_check_out}`,
    );
  }

  if (!commit) {
    console.log(
      `\nDRY-RUN: ${rows.length} kayıt güncellenecekti. Gerçekten yazmak için --commit ekleyin.`,
    );
    return;
  }

  console.log("\n--commit modu: UPDATE çalıştırılıyor...");
  const updateResult: { rowCount?: number | null } = await db.execute(sql`
    UPDATE shift_attendance sa
    SET check_out_time = s.check_out_time,
        status = 'completed'
    FROM branch_shift_sessions s
    WHERE s.shift_attendance_id = sa.id
      AND sa.check_out_time IS NULL
      AND s.check_out_time IS NOT NULL
      AND (s.notes IS NULL OR s.notes <> ${PILOT_NOTE})
      AND (sa.notes IS NULL OR sa.notes <> ${PILOT_NOTE})
  `);
  console.log(`Güncellenen kayıt: ${updateResult.rowCount ?? "?"}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill HATASI:", err);
    process.exit(1);
  });
