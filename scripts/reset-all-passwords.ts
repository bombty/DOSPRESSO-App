import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function resetAllPasswords() {
  const hashedPassword = await bcrypt.hash("0000", 10);
  const result = await db
    .update(users)
    .set({ hashedPassword, updatedAt: new Date() });
  console.log(`Updated ${result.rowCount} users' passwords to "0000"`);
  process.exit(0);
}

resetAllPasswords().catch((err) => {
  console.error("Failed to reset passwords:", err);
  process.exit(1);
});
