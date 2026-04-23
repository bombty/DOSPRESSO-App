/**
 * 17b PATCH: PIN re-seed by branch_staff_pins (not users.branchId)
 * 23 Nis 2026
 *
 * NEDEN: 17-pin-reseed.ts users.branchId IN (5,8,23,24) bazında çalıştı,
 * ama branch_staff_pins'ta farklı branchId'li user'ların (HQ + cross-branch)
 * PIN kayıtları kaldı → E1 hâlâ duplicate gösteriyor.
 *
 * BU SCRIPT: Pilot 4 lokasyonun branch_staff_pins tablosundaki TÜM aktif
 * user'larına benzersiz bcrypt hash atar. Eski hash'ler eziliyor.
 */

import { db } from "../../server/db";
import { users, branches, branchStaffPins, factoryStaffPins } from "@shared/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

const PILOT_BRANCH_IDS = [5, 8, 23, 24];
const SALT_ROUNDS = 10;

function generateUniquePin(existingPins: Set<string>): string {
  const banned = new Set(["0000","1111","2222","3333","4444","5555","6666","7777","8888","9999","1234","2345","3456","4567","5678","6789","0123","1029","2580","0852"]);
  for (let i = 0; i < 500; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!banned.has(pin) && !existingPins.has(pin)) {
      existingPins.add(pin);
      return pin;
    }
  }
  throw new Error("PIN üretilemedi");
}

async function main() {
  console.log("# 17b PATCH PIN RE-SEED CSV");
  console.log("# Tarih: " + new Date().toISOString());
  console.log("branch_id,branch_name,user_id,username,full_name,role,scope,new_pin");

  // --- branch_staff_pins (Şube kiosk) ---
  for (const branchId of PILOT_BRANCH_IDS) {
    const [branch] = await db.select({ id: branches.id, name: branches.name })
      .from(branches).where(eq(branches.id, branchId));
    if (!branch) continue;

    const rows = await db
      .select({
        userId: branchStaffPins.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(branchStaffPins)
      .innerJoin(users, eq(users.id, branchStaffPins.userId))
      .where(and(eq(branchStaffPins.branchId, branchId), eq(branchStaffPins.isActive, true)));

    const pool = new Set<string>();
    for (const r of rows) {
      const pin = generateUniquePin(pool);
      const hash = await bcrypt.hash(pin, SALT_ROUNDS);
      await db.update(branchStaffPins)
        .set({ hashedPin: hash, pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
        .where(and(eq(branchStaffPins.userId, r.userId), eq(branchStaffPins.branchId, branchId)));
      const fn = `${r.firstName || ""} ${r.lastName || ""}`.trim();
      console.log(`${branchId},"${branch.name}",${r.userId},${r.username || ""},"${fn}",${r.role},branch,${pin}`);
    }
    console.error(`# Branch ${branchId} (${branch.name}): ${rows.length} branch_staff_pins reseed`);
  }

  // --- factory_staff_pins (Fabrika kiosk - branch_id'si yok, user_id global) ---
  const factoryRows = await db
    .select({
      userId: factoryStaffPins.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(factoryStaffPins)
    .innerJoin(users, eq(users.id, factoryStaffPins.userId))
    .where(eq(factoryStaffPins.isActive, true));

  const factoryPool = new Set<string>();
  for (const r of factoryRows) {
    const pin = generateUniquePin(factoryPool);
    const hash = await bcrypt.hash(pin, SALT_ROUNDS);
    await db.update(factoryStaffPins)
      .set({ hashedPin: hash, pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
      .where(eq(factoryStaffPins.userId, r.userId));
    const fn = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    console.log(`24,"Fabrika",${r.userId},${r.username || ""},"${fn}",${r.role},factory,${pin}`);
  }
  console.error(`# factory_staff_pins: ${factoryRows.length} reseed`);

  process.exit(0);
}

main().catch((e) => { console.error("HATA:", e); process.exit(1); });
