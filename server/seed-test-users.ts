/**
 * DOSPRESSO Test User Seed Script
 * 
 * Creates 6 test users per branch (22 branches = 132 users):
 * - Stajyer, BarBuddy, Barista, SupervisorBuddy, Supervisor, Investor
 * 
 * Also creates test data: badges, training progress, messages
 * 
 * All passwords: 0000 (bcrypt hashed, salt rounds = 10)
 * Run: tsx server/seed-test-users.ts
 * 
 * SAFE: Checks for existing users before insertion (idempotent)
 */

import bcrypt from "bcrypt";
import { db, pool } from "./db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

const PASSWORD = "0000";

// Normalize Turkish characters
function normalizeTurkish(name: string): string {
  return name
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .substring(0, 20);
}

// Turkish names pool
const FIRST_NAMES = [
  "Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Zeynep", "Mustafa", "Elif",
  "Hüseyin", "Hatice", "Can", "Selin", "Emre", "Deniz", "Burak", "Esra",
  "Murat", "Özlem", "Onur", "Gamze", "Serkan", "Derya", "Kemal", "Sibel",
  "Oğuz", "Pınar", "Cem", "Gül", "Tolga", "Melek", "Umut", "Nil",
  "Berk", "Aslı", "Ege", "Çağla", "Kaan", "Defne", "Emir", "Ece"
];

const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Aydın", "Arslan",
  "Polat", "Koç", "Kurt", "Erdoğan", "Taş", "Yavuz", "Özdemir", "Aksoy",
  "Karaca", "Güler", "Yalçın", "Şen", "Tekin", "Özkan", "Kılıç", "Doğan",
  "Çetin", "Aslan", "Özer", "Sarı", "Turan", "Yıldız", "Kara", "Özgür"
];

// Role definitions
const TEST_ROLES = [
  { role: schema.UserRole.STAJYER, prefix: "stajyer" },
  { role: schema.UserRole.BAR_BUDDY, prefix: "barbuddy" },
  { role: schema.UserRole.BARISTA, prefix: "barista" },
  { role: schema.UserRole.SUPERVISOR_BUDDY, prefix: "supbuddy" },
  { role: schema.UserRole.SUPERVISOR, prefix: "supervisor" },
  { role: schema.UserRole.YATIRIMCI_BRANCH, prefix: "investor" },
];

function getRandomName(seed: number): { firstName: string; lastName: string } {
  const firstIdx = seed % FIRST_NAMES.length;
  const lastIdx = (seed + 13) % LAST_NAMES.length;
  return {
    firstName: FIRST_NAMES[firstIdx],
    lastName: LAST_NAMES[lastIdx],
  };
}

function getRandomHireDate(): Date {
  // 6 months to 2 years ago
  const daysAgo = Math.floor(Math.random() * 540) + 180; // 180-720 days
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function main() {
  console.log("🌱 DOSPRESSO Test User Seed Script\n");
  console.log("━".repeat(50));

  // Hash password once
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  console.log("🔒 Password hashed: 0000\n");

  // 1. Fetch all branches
  console.log("📍 Fetching branches...");
  const branches = await db.select().from(schema.branches).orderBy(schema.branches.name);
  console.log(`   Found ${branches.length} branches\n`);

  // 2. Fetch existing usernames to avoid duplicates
  console.log("👥 Checking existing users...");
  const existingUsers = await db.select({ username: schema.users.username }).from(schema.users);
  const existingUsernames = new Set(existingUsers.map(u => u.username).filter(Boolean));
  console.log(`   Found ${existingUsernames.size} existing usernames\n`);

  // 3. Fetch badges and modules for test data
  const badges = await db.select().from(schema.badges);
  const modules = await db.select().from(schema.trainingModules);
  console.log(`   Badges: ${badges.length}, Modules: ${modules.length}\n`);

  // 4. Create test users
  let created = 0;
  let skipped = 0;
  let seed = 0;

  console.log("📝 Creating test users...\n");

  for (const branch of branches) {
    const branchSlug = normalizeTurkish(branch.name);
    
    for (const { role, prefix } of TEST_ROLES) {
      const username = `test_${prefix}_${branchSlug}`;
      
      // Check if user exists
      if (existingUsernames.has(username)) {
        skipped++;
        continue;
      }

      const { firstName, lastName } = getRandomName(seed++);
      const hireDate = getRandomHireDate();

      try {
        // Create user
        const result = await db.insert(schema.users).values({
          username,
          password: hashedPassword,
          firstName,
          lastName,
          email: `${username}@dospresso.test`,
          role,
          branchId: branch.id,
          hireDate: hireDate.toISOString().split('T')[0],
          isActive: true,
          points: Math.floor(Math.random() * 500) + 50,
          dailyStreak: Math.floor(Math.random() * 15),
        }).returning();
        
        const newUser = Array.isArray(result) ? result[0] : null;
        if (!newUser) continue;

        // Add 1-3 random badges
        const numBadges = Math.floor(Math.random() * 3) + 1;
        const shuffledBadges = [...badges].sort(() => Math.random() - 0.5).slice(0, numBadges);
        
        for (const badge of shuffledBadges) {
          await db.insert(schema.userBadges).values({
            userId: newUser.id,
            badgeId: badge.id,
            progress: 100,
          }).onConflictDoNothing();
        }

        // Add 1-3 training progress entries
        if (modules.length > 0) {
          const numModules = Math.min(modules.length, Math.floor(Math.random() * 3) + 1);
          const shuffledModules = [...modules].sort(() => Math.random() - 0.5).slice(0, numModules);
          
          for (const mod of shuffledModules) {
            await db.insert(schema.userTrainingProgress).values({
              userId: newUser.id,
              moduleId: mod.id,
              progressPercentage: Math.floor(Math.random() * 100),
              status: Math.random() > 0.5 ? "completed" : "in_progress",
            }).onConflictDoNothing();
          }
        }

        created++;
        process.stdout.write(`\r   Created: ${created}, Skipped: ${skipped}`);
      } catch (error: unknown) {
        if (error.code === '23505') { // Unique violation
          skipped++;
        } else {
          console.error(`\n❌ Error creating ${username}:`, error.message);
        }
      }
    }
  }

  console.log(`\n\n━".repeat(50)}`);
  console.log("✅ COMPLETE!");
  console.log(`   Created: ${created} new test users`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  console.log(`   Total: ${existingUsernames.size + created} users\n`);

  // Summary by role
  console.log("📊 Summary by role:");
  for (const { role, prefix } of TEST_ROLES) {
    const count = await db.select().from(schema.users).where(eq(schema.users.role, role));
    console.log(`   ${prefix}: ${count.length} users`);
  }

  await pool.end();
  console.log("\n👋 Done!");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
