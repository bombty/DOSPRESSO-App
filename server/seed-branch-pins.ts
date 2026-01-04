/**
 * Seed branch staff PINs
 * Sets all branch employees' PIN to "0000" for testing purposes
 */
import bcrypt from "bcrypt";
import { db } from "./db";
import { branchStaffPins, users } from "@shared/schema";
import { eq, isNotNull } from "drizzle-orm";

async function seedBranchPins() {
  console.log("🔐 Starting branch staff PIN seeding...");
  
  // Hash the PIN "0000"
  const hashedPin = await bcrypt.hash("0000", 10);
  
  // Get all active branch employees
  const branchUsers = await db.select({
    id: users.id,
    branchId: users.branchId,
    firstName: users.firstName,
    lastName: users.lastName
  })
  .from(users)
  .where(isNotNull(users.branchId));
  
  console.log(`Found ${branchUsers.length} branch users`);
  
  let inserted = 0;
  let updated = 0;
  
  for (const user of branchUsers) {
    if (!user.branchId) continue;
    
    try {
      // Check if PIN already exists
      const existing = await db.select()
        .from(branchStaffPins)
        .where(eq(branchStaffPins.userId, user.id));
      
      if (existing.length > 0) {
        // Update existing PIN
        await db.update(branchStaffPins)
          .set({ hashedPin, pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
          .where(eq(branchStaffPins.userId, user.id));
        updated++;
      } else {
        // Insert new PIN
        await db.insert(branchStaffPins).values({
          userId: user.id,
          branchId: user.branchId,
          hashedPin,
          pinFailedAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Failed to set PIN for ${user.firstName} ${user.lastName}:`, error);
    }
  }
  
  console.log(`✅ Branch PIN seeding complete:`);
  console.log(`   - Inserted: ${inserted} new PINs`);
  console.log(`   - Updated: ${updated} existing PINs`);
  console.log(`   - All PINs set to: 0000`);
}

seedBranchPins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding branch PINs:", error);
    process.exit(1);
  });
