/**
 * PIN Re-seed Script (Day-1 Blocker)
 * 23 Nis 2026 - Replit bulgusu: 8-9 user aynı bcrypt hash paylaşıyor
 *
 * AMAÇ:
 * - Pilot 4 lokasyon (5, 8, 23, 24) için her aktif user'a benzersiz 4-haneli PIN
 * - Bcrypt hash ile güvenli saklama (salt round = 10)
 * - Collision-free: PIN'ler user/branch scope'unda tekil
 *
 * ÇIKTI:
 * - DB'de branch_staff_pins UPDATE
 * - Terminal'e CSV: user_id, name, branch, plaintext_pin (Aslan'a teslim edilecek)
 * - Güvenli: plaintext PIN sadece terminal output, dosyaya YAZILMAZ
 *
 * ÇALIŞTIRMA:
 *   cd /home/runner/<repo>
 *   tsx scripts/pilot/17-pin-reseed.ts > /tmp/new-pins-23nis.csv
 *
 * ASLAN'A: /tmp/new-pins-23nis.csv içeriğini oku, kullanıcılara ilet (SMS/WhatsApp).
 *          Sonra dosyayı güvenle sil: shred -u /tmp/new-pins-23nis.csv
 */

import { db } from "../../server/db";
import { users, branches, branchStaffPins } from "@shared/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

const PILOT_BRANCH_IDS = [5, 8, 23, 24];
const SALT_ROUNDS = 10;

// 4-haneli benzersiz PIN üret (scope: branch bazında)
function generateUniquePin(existingPins: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    // Güvenlik: tekrar eden desenler yasak (1111, 1234, 0000, 2580)
    const banned = ["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "2345", "3456", "4567", "5678", "6789", "0123", "1029", "2580", "0852"];
    if (!banned.includes(pin) && !existingPins.has(pin)) {
      existingPins.add(pin);
      return pin;
    }
    attempts++;
  }
  throw new Error("Benzersiz PIN üretilemedi (100 deneme)");
}

async function reseedPins() {
  console.log("# PIN RE-SEED CSV ÇIKTISI");
  console.log("# Tarih: " + new Date().toISOString());
  console.log("# UYARI: Bu dosyayı KULLANICILARA DAĞITTIKTAN SONRA SİL (shred -u)");
  console.log("#");
  console.log("branch_id,branch_name,user_id,username,full_name,role,new_pin");

  // Her branch için ayrı PIN havuzu (branch_staff_pins.UNIQUE (user_id, branch_id))
  for (const branchId of PILOT_BRANCH_IDS) {
    const [branch] = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      console.error(`# HATA: Branch ${branchId} bulunamadı`);
      continue;
    }

    // Bu branchId'de aktif tüm user'ları al (HQ rollerinin branchId NULL olabilir,
    // bu yüzden sadece branchId eşleşenler)
    const branchUsers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          isNull(users.deletedAt)
        )
      );

    if (branchUsers.length === 0) {
      console.error(`# UYARI: Branch ${branchId} (${branch.name}) - 0 aktif user`);
      continue;
    }

    const branchPinPool = new Set<string>();

    for (const user of branchUsers) {
      const plainPin = generateUniquePin(branchPinPool);
      const hashedPin = await bcrypt.hash(plainPin, SALT_ROUNDS);

      // UPSERT: branch_staff_pins
      await db
        .insert(branchStaffPins)
        .values({
          userId: user.id,
          branchId: branchId,
          hashedPin,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [branchStaffPins.userId, branchStaffPins.branchId],
          set: {
            hashedPin,
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            isActive: true,
            updatedAt: new Date(),
          },
        });

      // CSV çıktı (plaintext + hash ayrı ayrı — sadece stdout'a)
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      console.log(
        `${branchId},"${branch.name}",${user.id},${user.username || ""},"${fullName}",${user.role},${plainPin}`
      );
    }

    console.error(`# Branch ${branchId} (${branch.name}): ${branchUsers.length} user işlendi`);
  }

  console.error("# BİTTİ. Çıktıyı /tmp/new-pins-23nis.csv gibi bir dosyaya yönlendirin.");
  console.error("# Sonra shred -u /tmp/new-pins-23nis.csv ile SİLİN.");
  process.exit(0);
}

reseedPins().catch((err) => {
  console.error("PIN reseed hatası:", err);
  process.exit(1);
});
