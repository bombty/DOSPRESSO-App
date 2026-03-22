import { db } from "../server/db";
import { users } from "../shared/schema";
import { inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

async function resetTestPasswords() {
  const targetUsers = ["samet", "diana", "sema"];
  const hash = await bcrypt.hash("0000", 10);

  const result = await db
    .update(users)
    .set({ hashedPassword: hash })
    .where(inArray(users.username, targetUsers))
    .returning({ username: users.username, role: users.role });

  if (result.length !== targetUsers.length) {
    console.warn(`WARNING: Expected ${targetUsers.length} users but updated ${result.length}`);
  }
  console.log(`Reset passwords for ${result.length} users:`);
  for (const u of result) {
    console.log(`  ${u.username} (${u.role})`);
  }

  process.exit(0);
}

resetTestPasswords().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
