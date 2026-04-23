/**
 * PIN Re-seed Script (Day-1 Blocker) — CANONICAL v2 (23 Nis 2026)
 *
 * AMAÇ:
 * - Pilot 4 lokasyon (5 Işıklar, 8 Lara, 23 HQ, 24 Fabrika) için tüm aktif
 *   kiosk PIN kayıtlarına benzersiz 4-haneli PIN + bcrypt hash ataması
 * - branch_staff_pins tablosundaki TÜM aktif user'lar (cross-branch dahil:
 *   HQ user'larının Lara'da PIN kaydı varsa o da güncellenir)
 * - factory_staff_pins tablosundaki TÜM aktif user'lar (global, branch_id'siz)
 *
 * v1 (deprecated) ile fark:
 *   v1: users.branchId IN (5,8,23,24) filtreliyordu → cross-branch HQ user
 *       PIN'lerini güncellemiyordu, E1 duplicate kontrolü ❌ veriyordu.
 *   v2: PIN tablolarını direkt iterate eder. E1 → 0 satır.
 *
 * ÇIKTI:
 *   - DB'de branch_staff_pins + factory_staff_pins UPDATE (UPSERT-safe)
 *   - stdout'a CSV: branch_id,branch_name,user_id,username,full_name,role,scope,new_pin
 *
 * ÇALIŞTIRMA:
 *   tsx scripts/pilot/17-pin-reseed.ts > /tmp/new-pins-23nis-full.csv
 *
 * GÜVENLİK:
 *   - CSV plaintext PIN içerir → kullanıcılara teslimden sonra:
 *     shred -u /tmp/new-pins-23nis-full.csv
 *   - DB'de sadece bcrypt hash (salt round = 10) saklanır
 */

import { db } from "../../server/db";
import { users, branches, branchStaffPins, factoryStaffPins } from "@shared/schema";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

const PILOT_BRANCH_IDS = [5, 8, 23, 24];
const SALT_ROUNDS = 10;
const BANNED_PINS = new Set([
  "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
  "1234","2345","3456","4567","5678","6789","0123","1029","2580","0852",
]);

function generateUniquePin(existingPins: Set<string>): string {
  for (let i = 0; i < 500; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!BANNED_PINS.has(pin) && !existingPins.has(pin)) {
      existingPins.add(pin);
      return pin;
    }
  }
  throw new Error("Benzersiz PIN üretilemedi (500 deneme)");
}

async function reseedPins() {
  console.log("# PIN RE-SEED CSV ÇIKTISI (canonical v2)");
  console.log("# Tarih: " + new Date().toISOString());
  console.log("# UYARI: Dağıtım sonrası shred -u ile SİLİN");
  console.log("#");
  console.log("branch_id,branch_name,user_id,username,full_name,role,scope,new_pin");

  // --- branch_staff_pins (her branch için ayrı PIN havuzu) ---
  for (const branchId of PILOT_BRANCH_IDS) {
    const [branch] = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      console.error(`# HATA: Branch ${branchId} bulunamadı`);
      continue;
    }

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
      .where(and(
        eq(branchStaffPins.branchId, branchId),
        eq(branchStaffPins.isActive, true),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ));

    if (rows.length === 0) {
      console.error(`# UYARI: Branch ${branchId} (${branch.name}) - 0 aktif branch_staff_pins`);
      continue;
    }

    const pool = new Set<string>();
    for (const r of rows) {
      const plainPin = generateUniquePin(pool);
      const hashedPin = await bcrypt.hash(plainPin, SALT_ROUNDS);

      await db
        .update(branchStaffPins)
        .set({
          hashedPin,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(branchStaffPins.userId, r.userId),
          eq(branchStaffPins.branchId, branchId),
        ));

      const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
      console.log(
        `${branchId},"${branch.name}",${r.userId},${r.username || ""},"${fullName}",${r.role},branch,${plainPin}`
      );
    }
    console.error(`# Branch ${branchId} (${branch.name}): ${rows.length} branch_staff_pins reseed`);
  }

  // --- factory_staff_pins (global tablo, kendi PIN havuzu) ---
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
    .where(and(
      eq(factoryStaffPins.isActive, true),
      eq(users.isActive, true),
      isNull(users.deletedAt),
    ));

  const factoryPool = new Set<string>();
  for (const r of factoryRows) {
    const plainPin = generateUniquePin(factoryPool);
    const hashedPin = await bcrypt.hash(plainPin, SALT_ROUNDS);

    await db
      .update(factoryStaffPins)
      .set({
        hashedPin,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(factoryStaffPins.userId, r.userId));

    const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    console.log(
      `24,"Fabrika",${r.userId},${r.username || ""},"${fullName}",${r.role},factory,${plainPin}`
    );
  }
  console.error(`# factory_staff_pins: ${factoryRows.length} reseed`);

  console.error("# BİTTİ. Çıktı CSV'sini kullanıcılara dağıttıktan sonra shred -u ile silin.");
  process.exit(0);
}

reseedPins().catch((err) => {
  console.error("PIN reseed hatası:", err);
  process.exit(1);
});
