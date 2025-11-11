/**
 * DOSPRESSO User Seed Script
 * 
 * Creates 86 users total:
 * - 76 branch users (19 branches × 4 roles each)
 * - 10 HQ users
 * 
 * All passwords: 0000 (bcrypt hashed, salt rounds = 10)
 * Run: tsx server/seed-users.ts
 */

import bcrypt from "bcrypt";
import { db, pool } from "./db";
import * as schema from "../shared/schema";

// Password for all users
const PASSWORD = "0000";

/**
 * Normalize Turkish characters to ASCII and format for username
 * - Remove city prefixes (Antalya, Gaziantep, Konya, Samsun, Ankara, Şanlıurfa)
 * - ı → i, İ → i, ş → s, Ş → s, ğ → g, Ğ → g, ü → u, Ü → u, ö → o, Ö → o, ç → c, Ç → c
 * - Remove spaces
 * - Convert to lowercase
 */
function normalizeBranchName(name: string): string {
  // Remove city prefixes for multi-word branch names
  const cityPrefixes = ['Antalya', 'Gaziantep', 'Konya', 'Samsun', 'Ankara', 'Şanlıurfa'];
  let cleanedName = name;
  
  for (const city of cityPrefixes) {
    if (name.startsWith(city + ' ')) {
      cleanedName = name.substring(city.length + 1); // +1 for the space
      break;
    }
  }
  
  // Normalize Turkish characters (do this BEFORE toLowerCase to handle İ correctly)
  return cleanedName
    .replace(/İ/g, 'I')  // Capital İ → capital I (then toLowerCase will make it 'i')
    .replace(/ı/g, 'i')  // Lowercase ı → i
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
    .replace(/\s+/g, ''); // Remove all spaces
}

// Turkish first names pool
const FIRST_NAMES = [
  "Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Zeynep", "Mustafa", "Elif",
  "Hüseyin", "Hatice", "Can", "Selin", "Emre", "Deniz", "Burak", "Esra",
  "Murat", "Özlem", "Onur", "Gamze", "Serkan", "Derya", "Kemal", "Sibel",
  "Oğuz", "Pınar", "Cem", "Gül", "Tolga", "Melek", "Umut", "Nil",
  "Berk", "Aslı", "Ege", "Çağla", "Kaan", "Defne", "Emir", "Ece"
];

// Turkish last names pool
const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Aydın", "Arslan",
  "Polat", "Koç", "Kurt", "Erdoğan", "Taş", "Yavuz", "Özdemir", "Aksoy",
  "Karaca", "Güler", "Yalçın", "Şen", "Tekin", "Özkan", "Kılıç", "Doğan",
  "Çetin", "Aslan", "Özer", "Sarı", "Turan", "Yıldız", "Kara", "Özgür"
];

function getRandomName(index: number): { firstName: string; lastName: string } {
  return {
    firstName: FIRST_NAMES[index % FIRST_NAMES.length],
    lastName: LAST_NAMES[(index + 7) % LAST_NAMES.length], // +7 for variation
  };
}

async function main() {
  console.log("🌱 Starting user seed script...\n");
  console.log("📋 Target: 86 users (76 branch + 10 HQ)\n");

  // Check existing users
  console.log("🔍 Checking existing users...");
  const existingUsers = await db.select().from(schema.users);
  console.log(`   Found ${existingUsers.length} existing users\n`);

  // Hash password once (all users share same password)
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  console.log("🔒 Password hashed with bcrypt (salt rounds: 10)\n");

  // ========================================
  // 1. FETCH BRANCHES FROM DATABASE
  // ========================================
  console.log("📍 Fetching branches from database...");
  const branches = await db.select().from(schema.branches).orderBy(schema.branches.name);
  console.log(`✅ Found ${branches.length} branches\n`);

  if (branches.length !== 19) {
    console.warn(`⚠️  Warning: Expected 19 branches, found ${branches.length}`);
  }

  // ========================================
  // 2. CREATE BRANCH USERS (76 total)
  // ========================================
  console.log("👥 Creating branch users (4 per branch)...\n");

  const branchUserData: typeof schema.users.$inferInsert[] = [];
  let userIndex = 0;

  // Branch roles to create (4 per branch)
  const branchRoles = [
    { role: schema.UserRole.SUPERVISOR, rolePrefix: "supervisor" },
    { role: schema.UserRole.BARISTA, rolePrefix: "barista" },
    { role: schema.UserRole.STAJYER, rolePrefix: "cirak" }, // trainee (çırak)
    { role: schema.UserRole.SUPERVISOR_BUDDY, rolePrefix: "vardiyasorumlusu" }, // shift leader
  ];

  for (const branch of branches) {
    const normalizedBranch = normalizeBranchName(branch.name);
    console.log(`  - ${branch.name} → ${normalizedBranch}`);

    for (const { role, rolePrefix } of branchRoles) {
      const username = `${rolePrefix}${normalizedBranch}`;
      const { firstName, lastName } = getRandomName(userIndex);

      branchUserData.push({
        username,
        hashedPassword,
        email: `${username}@dospresso.com`,
        firstName,
        lastName,
        role,
        branchId: branch.id,
        phoneNumber: `05${(20 + userIndex).toString().padStart(2, '0')} ${(100 + userIndex).toString()} ${(1000 + userIndex).toString()}`,
        hireDate: new Date(2024, 0, 1 + Math.floor(userIndex / 4)).toISOString().split('T')[0],
        probationEndDate: role === schema.UserRole.STAJYER 
          ? new Date(2025, 5, 1).toISOString().split('T')[0] // Trainees still in probation
          : null,
        isActive: true,
      });

      userIndex++;
    }
  }

  console.log(`\n📊 Generated ${branchUserData.length} branch users\n`);

  // Filter out users that already exist
  const existingUsernames = new Set(existingUsers.map(u => u.username));
  const newBranchUsers = branchUserData.filter(u => !existingUsernames.has(u.username));
  
  console.log(`   - ${branchUserData.length} total branch users generated`);
  console.log(`   - ${branchUserData.length - newBranchUsers.length} already exist`);
  console.log(`   - ${newBranchUsers.length} new users to create\n`);

  // Insert branch users
  let insertedBranchUsers: any[] = [];
  if (newBranchUsers.length > 0) {
    console.log("💾 Inserting new branch users into database...");
    insertedBranchUsers = await db.insert(schema.users)
      .values(newBranchUsers)
      .returning();
    console.log(`✅ Created ${insertedBranchUsers.length} new branch users\n`);
  } else {
    console.log("⏭️  All branch users already exist, skipping insertion\n");
  }

  // ========================================
  // 3. CREATE HQ USERS (10 total)
  // ========================================
  console.log("🏢 Creating HQ users...\n");

  // HQ user configurations (10 users)
  const hqUserConfigs = [
    { username: "admin", role: schema.UserRole.ADMIN, firstName: "Admin", lastName: "Yönetici" },
    { username: "coach", role: schema.UserRole.COACH, firstName: "Elif", lastName: "Yıldız" },
    { username: "teknik", role: schema.UserRole.TEKNIK, firstName: "Burak", lastName: "Şahin" },
    { username: "hr", role: schema.UserRole.MUHASEBE, firstName: "Zeynep", lastName: "Çelik" }, // HR/Accounting
    { username: "finans", role: schema.UserRole.SATINALMA, firstName: "Can", lastName: "Arslan" }, // Finance/Purchasing
    { username: "marketing", role: schema.UserRole.FABRIKA, firstName: "Selin", lastName: "Öztürk" }, // Using fabrika role
    { username: "icerik", role: schema.UserRole.YATIRIMCI_HQ, firstName: "Emre", lastName: "Aydın" }, // Content/Investor HQ
    { username: "egitim", role: schema.UserRole.COACH, firstName: "Deniz", lastName: "Koç" }, // Academy/Coach
    { username: "destek", role: schema.UserRole.DESTEK, firstName: "Ali", lastName: "Erdoğan" }, // Support
    { username: "kalite", role: schema.UserRole.TEKNIK, firstName: "Ayşe", lastName: "Kurt" }, // Quality/Technical
  ];

  const hqUserData: typeof schema.users.$inferInsert[] = hqUserConfigs.map((config, index) => ({
    username: config.username,
    hashedPassword,
    email: `${config.username}@dospresso.com`,
    firstName: config.firstName,
    lastName: config.lastName,
    role: config.role,
    branchId: null, // HQ users have no branch
    phoneNumber: `0312 ${(500 + index).toString()} ${(5000 + index).toString()}`, // Ankara HQ numbers
    hireDate: new Date(2023, 0, 1 + index * 10).toISOString().split('T')[0], // Stagger hire dates
    probationEndDate: null,
    isActive: true,
  }));

  // Filter out HQ users that already exist
  const newHQUsers = hqUserData.filter(u => !existingUsernames.has(u.username));
  
  console.log(`   - ${hqUserData.length} total HQ users generated`);
  console.log(`   - ${hqUserData.length - newHQUsers.length} already exist`);
  console.log(`   - ${newHQUsers.length} new HQ users to create\n`);

  let insertedHQUsers: any[] = [];
  if (newHQUsers.length > 0) {
    console.log("💾 Inserting new HQ users into database...");
    insertedHQUsers = await db.insert(schema.users)
      .values(newHQUsers)
      .returning();
    console.log(`✅ Created ${insertedHQUsers.length} new HQ users\n`);
  } else {
    console.log("⏭️  All HQ users already exist, skipping insertion\n");
  }

  // ========================================
  // 4. SUMMARY
  // ========================================
  console.log("\n🎉 User seed completed successfully!\n");
  
  // Get final count from database
  const finalUsers = await db.select().from(schema.users);
  const branchUsers = finalUsers.filter(u => u.branchId !== null);
  const hqUsers = finalUsers.filter(u => u.branchId === null);
  
  console.log("📊 Summary:");
  console.log(`   - New Branch Users Created: ${insertedBranchUsers.length}`);
  console.log(`   - New HQ Users Created: ${insertedHQUsers.length}`);
  console.log(`   - Total New Users: ${insertedBranchUsers.length + insertedHQUsers.length}`);
  console.log(`\n   - Total Branch Users in DB: ${branchUsers.length} (target: 76)`);
  console.log(`   - Total HQ Users in DB: ${hqUsers.length} (target: 10)`);
  console.log(`   - Total Users in DB: ${finalUsers.length} (target: 86)\n`);

  console.log("🔐 Login Credentials:");
  console.log("   All users: password = 0000\n");

  console.log("📝 Sample Branch Users:");
  console.log(`   - Username: supervisorankarakizilaysube | Password: 0000`);
  console.log(`   - Username: baristaisiklar | Password: 0000`);
  console.log(`   - Username: cirakantalyalara | Password: 0000`);
  console.log(`   - Username: vardiyasorumlususamsunmarina | Password: 0000\n`);

  console.log("📝 HQ Users:");
  hqUserConfigs.forEach((config) => {
    console.log(`   - Username: ${config.username} | Password: 0000 | Role: ${config.role}`);
  });

  console.log("\n✅ Verify with SQL:");
  console.log('   SELECT username, role, "branchId" FROM users ORDER BY "branchId", role;');
  console.log("\n");

  await pool.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
