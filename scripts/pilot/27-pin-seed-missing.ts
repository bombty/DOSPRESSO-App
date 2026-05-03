/**
 * Task #324 — Eksik PIN Seed Script (Pilot Day-1 blocker)
 *
 * AMAÇ:
 *   scripts/audit/pin-coverage-2026-05.sql denetiminde tespit edilen
 *   eksik PIN'leri (96 branch + 1 factory) güvenli şekilde tamamla.
 *   - Aktif şube personeli (BRANCH_ROLES, sube_kiosk/yatirimci_branch hariç)
 *     branch_staff_pins'e tek seferlik 4-haneli PIN + bcrypt hash ile yazılır.
 *   - Aktif fabrika personeli (FACTORY rolleri) factory_staff_pins'e yazılır.
 *   - Pasif/silinmiş kullanıcılar atlanır (zaten audit'te 0 çıktı).
 *
 * ÇALIŞTIRMA:
 *   # 1) Backup snapshot (zorunlu, owner Replit Shell'den):
 *   psql "$DATABASE_URL" -f migrations/2026-05-03-pin-seed-pilot.sql
 *
 *   # 2) Dry-run (DB WRITE YOK, sadece CSV stdout):
 *   tsx scripts/pilot/27-pin-seed-missing.ts --dry-run
 *
 *   # 3) Owner Aslan GO sonrası gerçek seed:
 *   tsx scripts/pilot/27-pin-seed-missing.ts --apply > /tmp/new-pins-2026-05-03.csv
 *
 *   # 4) CSV teslim sonrası:
 *   shred -u /tmp/new-pins-2026-05-03.csv
 *
 *   # 5) Doğrulama (0 eksik beklenir):
 *   psql "$DATABASE_URL" -f scripts/audit/pin-coverage-2026-05.sql
 *
 * GÜVENLİK:
 *   - PIN plaintext yalnızca stdout CSV'sinde, DB'de bcrypt hash (rounds=10).
 *   - Banned PIN listesi (0000, 1234, vb.) elenir.
 *   - Branch içinde PIN benzersizliği: aynı batch içinde tekrar üretilmez.
 *     Branch'ta önceden hash'li PIN varsa bcrypt.compare ile collision taranır
 *     (her aday PIN için, ilk eşleşmesizde durur).
 *   - Tüm yazımlar TEK transaction içinde (BEGIN/COMMIT). Hata = full
 *     ROLLBACK, partial write yok. ~100 satır hacmi için lock riski düşük;
 *     daha büyük seed'lerde chunked commit'e geçilebilir.
 *
 * EXIT CODE:
 *   0 → Başarılı (veya dry-run özet)
 *   1 → Hata (transaction rollback yapıldı)
 */

import { db, pool } from "../../server/db";
import {
  users,
  branches,
  branchStaffPins,
  factoryStaffPins,
} from "@shared/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";

const SALT_ROUNDS = 10;

const BRANCH_PIN_ROLES = [
  "stajyer",
  "bar_buddy",
  "barista",
  "supervisor_buddy",
  "supervisor",
  "mudur",
] as const;

const FACTORY_PIN_ROLES = [
  "uretim_sefi",
  "fabrika_operator",
  "fabrika_sorumlu",
  "fabrika_personel",
  "fabrika_depo",
  "sef",
  "recete_gm",
  "fabrika_mudur",
  "fabrika",
] as const;

const BANNED_PINS = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "2345", "3456", "4567", "5678", "6789", "0123", "1029", "2580", "0852",
]);

interface MissingBranchUser {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  branchId: number;
  branchName: string;
}

interface MissingFactoryUser {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

function generateCandidatePin(usedInBatch: Set<string>): string {
  // crypto.randomInt → kriptografik güvenli rastgelelik
  for (let i = 0; i < 1000; i++) {
    const pin = String(randomInt(1000, 10000));
    if (BANNED_PINS.has(pin)) continue;
    if (usedInBatch.has(pin)) continue;
    return pin;
  }
  throw new Error("Aday PIN üretilemedi (1000 deneme)");
}

async function pickUniquePinAgainstHashes(
  usedInBatch: Set<string>,
  existingHashes: string[],
): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = generateCandidatePin(usedInBatch);
    let collision = false;
    for (const h of existingHashes) {
      if (await bcrypt.compare(pin, h)) {
        collision = true;
        break;
      }
    }
    if (!collision) {
      usedInBatch.add(pin);
      return pin;
    }
  }
  throw new Error("Benzersiz PIN bulunamadı (50 deneme, hash collision)");
}

async function loadMissingBranchUsers(): Promise<MissingBranchUser[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchId: users.branchId,
      branchName: branches.name,
    })
    .from(users)
    .innerJoin(branches, eq(branches.id, users.branchId))
    .where(
      and(
        eq(users.isActive, true),
        isNull(users.deletedAt),
        inArray(users.role, BRANCH_PIN_ROLES as unknown as string[]),
        sql`${users.branchId} IS NOT NULL`,
        sql`NOT EXISTS (
          SELECT 1 FROM branch_staff_pins p
          WHERE p.user_id = ${users.id}
            AND p.branch_id = ${users.branchId}
            AND p.is_active = true
        )`,
      ),
    );
  return rows as MissingBranchUser[];
}

async function loadMissingFactoryUsers(): Promise<MissingFactoryUser[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        isNull(users.deletedAt),
        inArray(users.role, FACTORY_PIN_ROLES as unknown as string[]),
        sql`NOT EXISTS (
          SELECT 1 FROM factory_staff_pins p
          WHERE p.user_id = ${users.id} AND p.is_active = true
        )`,
      ),
    );
  return rows as MissingFactoryUser[];
}

async function loadExistingBranchHashes(branchId: number): Promise<string[]> {
  const rows = await db
    .select({ hash: branchStaffPins.hashedPin })
    .from(branchStaffPins)
    .where(
      and(
        eq(branchStaffPins.branchId, branchId),
        eq(branchStaffPins.isActive, true),
      ),
    );
  return rows.map((r) => r.hash);
}

async function loadExistingFactoryHashes(): Promise<string[]> {
  const rows = await db
    .select({ hash: factoryStaffPins.hashedPin })
    .from(factoryStaffPins)
    .where(eq(factoryStaffPins.isActive, true));
  return rows.map((r) => r.hash);
}

function csvEscape(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = !apply;

  if (apply && args.has("--dry-run")) {
    console.error("[seed-pin] HATA: --apply ile --dry-run birlikte kullanılamaz");
    process.exit(1);
  }

  console.error(
    `[seed-pin] Mod: ${apply ? "APPLY (DB WRITE)" : "DRY-RUN (DB READ-ONLY)"}`,
  );
  console.error(`[seed-pin] Tarih: ${new Date().toISOString()}`);

  // Backup snapshot var mı kontrol et (apply mode'da zorunlu)
  if (apply) {
    const snap = await pool.query(
      `SELECT to_regclass('public.branch_staff_pins_bk_20260503') AS b,
              to_regclass('public.factory_staff_pins_bk_20260503') AS f`,
    );
    if (!snap.rows[0].b || !snap.rows[0].f) {
      console.error(
        "[seed-pin] HATA: Snapshot tabloları yok. Önce şunu çalıştır:\n" +
          "  psql \"$DATABASE_URL\" -f migrations/2026-05-03-pin-seed-pilot.sql",
      );
      process.exit(1);
    }
    console.error("[seed-pin] Snapshot tabloları doğrulandı: OK");
  }

  const missingBranch = await loadMissingBranchUsers();
  const missingFactory = await loadMissingFactoryUsers();

  // Pasif/silinmiş kullanıcılar için aktif PIN'leri tespit et
  const passiveBranchPins = await pool.query(
    `SELECT p.id, p.user_id, p.branch_id
       FROM branch_staff_pins p
       JOIN users u ON u.id = p.user_id
      WHERE p.is_active = true
        AND (u.is_active = false OR u.deleted_at IS NOT NULL)`,
  );
  const passiveFactoryPins = await pool.query(
    `SELECT p.id, p.user_id
       FROM factory_staff_pins p
       JOIN users u ON u.id = p.user_id
      WHERE p.is_active = true
        AND (u.is_active = false OR u.deleted_at IS NOT NULL)`,
  );

  console.error(
    `[seed-pin] Eksik branch: ${missingBranch.length}, eksik factory: ${missingFactory.length}`,
  );
  console.error(
    `[seed-pin] Pasif/silinmiş kullanıcı aktif PIN: branch=${passiveBranchPins.rowCount}, factory=${passiveFactoryPins.rowCount}`,
  );

  if (
    missingBranch.length === 0 &&
    missingFactory.length === 0 &&
    (passiveBranchPins.rowCount ?? 0) === 0 &&
    (passiveFactoryPins.rowCount ?? 0) === 0
  ) {
    console.error("[seed-pin] Yapılacak iş yok. İşlem atlanıyor.");
    process.exit(0);
  }

  // CSV header (stdout)
  console.log("# PIN SEED CSV (Task #324)");
  console.log("# Tarih: " + new Date().toISOString());
  console.log("# Mod: " + (apply ? "APPLY" : "DRY-RUN"));
  console.log("# UYARI: Dağıtım sonrası shred -u ile SİLİN");
  console.log("branch_id,branch_name,user_id,username,full_name,role,scope,new_pin");

  const now = new Date();
  let inserted = 0;
  let deactivated = 0;
  const txClient = apply ? await pool.connect() : null;

  try {
    if (txClient) await txClient.query("BEGIN");

    // ---- DEACTIVATE: pasif/silinmiş kullanıcı PIN'leri ----
    if (apply && txClient) {
      const r1 = await txClient.query(
        `UPDATE branch_staff_pins p
            SET is_active = false, updated_at = $1
           FROM users u
          WHERE p.user_id = u.id
            AND p.is_active = true
            AND (u.is_active = false OR u.deleted_at IS NOT NULL)`,
        [now],
      );
      const r2 = await txClient.query(
        `UPDATE factory_staff_pins p
            SET is_active = false, updated_at = $1
           FROM users u
          WHERE p.user_id = u.id
            AND p.is_active = true
            AND (u.is_active = false OR u.deleted_at IS NOT NULL)`,
        [now],
      );
      deactivated = (r1.rowCount ?? 0) + (r2.rowCount ?? 0);
      console.error(
        `[seed-pin] Pasif PIN devre dışı: branch=${r1.rowCount}, factory=${r2.rowCount}`,
      );
    }

    // ---- BRANCH ----
    // Branch bazında grupla — her branch için ayrı PIN havuzu
    const byBranch = new Map<number, MissingBranchUser[]>();
    for (const u of missingBranch) {
      if (!byBranch.has(u.branchId)) byBranch.set(u.branchId, []);
      byBranch.get(u.branchId)!.push(u);
    }

    for (const [branchId, list] of Array.from(byBranch.entries()).sort(
      (a, b) => a[0] - b[0],
    )) {
      const existingHashes = await loadExistingBranchHashes(branchId);
      const usedInBatch = new Set<string>();
      console.error(
        `[seed-pin] Branch ${branchId} (${list[0].branchName}): ${list.length} eksik, ${existingHashes.length} mevcut hash`,
      );

      for (const u of list) {
        const plainPin = await pickUniquePinAgainstHashes(
          usedInBatch,
          existingHashes,
        );
        const hashedPin = await bcrypt.hash(plainPin, SALT_ROUNDS);

        if (apply && txClient) {
          await txClient.query(
            `INSERT INTO branch_staff_pins
               (user_id, branch_id, hashed_pin, pin_failed_attempts, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, 0, true, $4, $4)
             ON CONFLICT (user_id, branch_id)
             DO UPDATE SET hashed_pin = EXCLUDED.hashed_pin,
                           is_active = true,
                           pin_failed_attempts = 0,
                           pin_locked_until = NULL,
                           updated_at = EXCLUDED.updated_at`,
            [u.userId, branchId, hashedPin, now],
          );
        }
        existingHashes.push(hashedPin);
        inserted++;

        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        console.log(
          [
            branchId,
            csvEscape(u.branchName),
            u.userId,
            csvEscape(u.username),
            csvEscape(fullName),
            u.role,
            "branch",
            plainPin,
          ].join(","),
        );
      }
    }

    // ---- FACTORY ----
    if (missingFactory.length > 0) {
      const existingHashes = await loadExistingFactoryHashes();
      const usedInBatch = new Set<string>();
      console.error(
        `[seed-pin] Factory: ${missingFactory.length} eksik, ${existingHashes.length} mevcut hash`,
      );

      for (const u of missingFactory) {
        const plainPin = await pickUniquePinAgainstHashes(
          usedInBatch,
          existingHashes,
        );
        const hashedPin = await bcrypt.hash(plainPin, SALT_ROUNDS);

        if (apply && txClient) {
          await txClient.query(
            `INSERT INTO factory_staff_pins
               (user_id, hashed_pin, pin_failed_attempts, is_active, created_at, updated_at)
             VALUES ($1, $2, 0, true, $3, $3)
             ON CONFLICT (user_id)
             DO UPDATE SET hashed_pin = EXCLUDED.hashed_pin,
                           is_active = true,
                           pin_failed_attempts = 0,
                           pin_locked_until = NULL,
                           updated_at = EXCLUDED.updated_at`,
            [u.userId, hashedPin, now],
          );
        }
        existingHashes.push(hashedPin);
        inserted++;

        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        console.log(
          [
            24,
            "Fabrika",
            u.userId,
            csvEscape(u.username),
            csvEscape(fullName),
            u.role,
            "factory",
            plainPin,
          ].join(","),
        );
      }
    }

    if (txClient) {
      await txClient.query("COMMIT");
      console.error(
        `[seed-pin] APPLY tamamlandı: ${inserted} PIN yazıldı, ${deactivated} pasif PIN devre dışı.`,
      );
    } else {
      console.error(
        `[seed-pin] DRY-RUN tamamlandı: ${inserted} PIN üretildi (DB değişmedi).`,
      );
    }
  } catch (err) {
    if (txClient) {
      try {
        await txClient.query("ROLLBACK");
      } catch {
        /* noop */
      }
    }
    console.error("[seed-pin] HATA:", err);
    process.exit(1);
  } finally {
    if (txClient) txClient.release();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-pin] FATAL:", err);
  process.exit(1);
});
