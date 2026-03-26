import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtTs(d: Date): string {
  return d.toISOString();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function deleteUsersWithDeps(client: any, userIds: string[]) {
  if (userIds.length === 0) return;

  const fkRes = await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users' AND ccu.column_name = 'id'
    AND tc.table_name != 'users'
  `);

  for (const row of fkRes.rows) {
    try {
      await client.query(`DELETE FROM "${row.table_name}" WHERE "${row.column_name}" = ANY($1)`, [userIds]);
    } catch (e: any) {
      // Ignore errors from tables that might have their own FK constraints
    }
  }

  await client.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
}

async function main() {
  const client = await pool.connect();

  try {
    console.log("=== DOSPRESSO Comprehensive Seed Script ===\n");

    const hashedPassword = await bcrypt.hash("0000", 10);
    const hashedPin = await bcrypt.hash("0000", 10);
    console.log("Password and PIN hashed.\n");

    const HQ_KEEP_IDS = [
      "ceo-ali-001",
      "hq-aslan-ceo",
      "hq-utku-cgo",
      "hq-yavuz-coach",
      "hq-mahmut-ik",
      "hq-diana-marketing",
      "hq-ece-trainer",
      "hq-samet-satinalma",
      "hq-umran-kalite",
      "hq-eren-fabrika",
    ];

    const HQ_ROLES = [
      "admin",
      "ceo",
      "cgo",
      "coach",
      "marketing",
      "trainer",
      "kalite_kontrol",
      "fabrika_mudur",
      "muhasebe_ik",
      "satinalma",
      "muhasebe",
      "teknik",
      "destek",
      "fabrika",
      "yatirimci_hq",
    ];

    const CLEANUP_BRANCH_IDS = [1, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const TEST_BRANCH_IDS = [1, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

    // ============================================================
    // STEP 1: Clean up existing branch users (not 5, 23, 24)
    // ============================================================
    console.log("STEP 1: Cleaning up branch users (branches 1,4,6-22)...");

    const branchUsersRes = await client.query(
      `SELECT id FROM users WHERE branch_id = ANY($1)`,
      [CLEANUP_BRANCH_IDS]
    );
    const branchUserIds = branchUsersRes.rows.map((r: any) => r.id);

    if (branchUserIds.length > 0) {
      await deleteUsersWithDeps(client, branchUserIds);
      console.log(`  Deleted ${branchUserIds.length} users from branches ${CLEANUP_BRANCH_IDS.join(",")}`);
    } else {
      console.log("  No users found in those branches.");
    }

    // Clean test users with no branch_id (keep HQ roles)
    const testNoBranchRes = await client.query(
      `SELECT id FROM users WHERE branch_id IS NULL AND role NOT IN (${HQ_ROLES.map((_, i) => `$${i + 1}`).join(",")}) AND id NOT IN (${HQ_KEEP_IDS.map((_, i) => `$${HQ_ROLES.length + i + 1}`).join(",")})`,
      [...HQ_ROLES, ...HQ_KEEP_IDS]
    );
    const testNoBranchIds = testNoBranchRes.rows.map((r: any) => r.id);
    if (testNoBranchIds.length > 0) {
      await deleteUsersWithDeps(client, testNoBranchIds);
      console.log(`  Deleted ${testNoBranchIds.length} test users with no branch.`);
    }

    // ============================================================
    // STEP 2 & 3: Clean up and recreate Isiklar (branch 5)
    // ============================================================
    console.log("\nSTEP 2-3: Cleaning and recreating Isiklar (branch 5) users...");

    const isikRes = await client.query(`SELECT id FROM users WHERE branch_id = 5`);
    const isikIds = isikRes.rows.map((r: any) => r.id);
    if (isikIds.length > 0) {
      await deleteUsersWithDeps(client, isikIds);
      console.log(`  Deleted ${isikIds.length} existing Isiklar users.`);
    }

    const isiklarUsers = [
      { firstName: "Kemal", lastName: "Kolakan", role: "supervisor", email: "kemal.kolakan@dospresso.com", hireDate: "2022-06-01", notes: "Branch manager", employmentType: "fulltime" },
      { firstName: "Efe", lastName: "Kolakan", role: "supervisor_buddy", email: "efe.kolakan@dospresso.com", hireDate: "2023-03-15", employmentType: "fulltime" },
      { firstName: "Basri", lastName: "Şen", role: "bar_buddy", email: "basrisen93@icloud.com", hireDate: "2022-09-01", birthDate: "1993-06-06", gender: "male", maritalStatus: "married", tckn: "41656519546", city: "Antalya", educationLevel: "Lise", employmentType: "fulltime" },
      { firstName: "Ahmet Hamit", lastName: "Doğan", role: "barista", email: "ahmethamitdogan0758@gmail.com", hireDate: "2025-10-08", birthDate: "2001-01-01", gender: "male", city: "Antalya", educationLevel: "Lisans", employmentType: "fulltime" },
      { firstName: "Cihan", lastName: "Kolakan", role: "barista", email: "ccihan.2121@icloud.com", hireDate: "2024-08-17", birthDate: "2003-03-31", gender: "male", weeklyHours: 25, tckn: "20008379380", city: "Antalya", employmentType: "parttime" },
      { firstName: "Ateş Güney", lastName: "Yılmaz", role: "barista", email: "atsgny@icloud.com", hireDate: "2023-12-27", birthDate: "1999-09-17", gender: "male", tckn: "11108027516", city: "Antalya", educationLevel: "Ön lisans", employmentType: "fulltime" },
      { firstName: "Süleyman", lastName: "Aydın", role: "barista", email: "suleyman.aydin@dospresso.com", hireDate: "2024-01-15", employmentType: "fulltime" },
      { firstName: "Abdullah", lastName: "Üzer", role: "barista", email: "uzerabdullah13@gmail.com", hireDate: "2024-09-07", birthDate: "2003-07-09", gender: "male", tckn: "44692419740", city: "Antalya", educationLevel: "Lise", employmentType: "fulltime" },
      { firstName: "Edanur", lastName: "Tarakcı", role: "barista", email: "tarakci_edanur07@hotmail.com", hireDate: "2024-11-01", gender: "female", city: "Antalya", employmentType: "fulltime" },
    ];

    const isiklarUserIds: Record<string, string> = {};

    for (const u of isiklarUsers) {
      const id = crypto.randomUUID();
      const username = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, role, branch_id, hashed_password, hire_date, is_active, account_status, employment_type, weekly_hours, birth_date, gender, marital_status, tckn, city, education_level, notes, username)
         VALUES ($1,$2,$3,$4,$5,5,$6,$7,true,'approved',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [id, u.email, u.firstName, u.lastName, u.role, hashedPassword, u.hireDate, u.employmentType || "fulltime", (u as any).weeklyHours || 45, (u as any).birthDate || null, (u as any).gender || null, (u as any).maritalStatus || null, (u as any).tckn || null, (u as any).city || null, (u as any).educationLevel || null, (u as any).notes || null, username]
      );
      isiklarUserIds[u.firstName] = id;

      await client.query(
        `INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, created_at, updated_at)
         VALUES ($1, 5, $2, true, now(), now()) ON CONFLICT DO NOTHING`,
        [id, hashedPin]
      );
    }
    console.log(`  Created ${isiklarUsers.length} Isiklar users with PINs.`);

    // ============================================================
    // STEP 4: Clean up and recreate Fabrika (branch 24)
    // ============================================================
    console.log("\nSTEP 4: Cleaning and recreating Fabrika (branch 24) users...");

    const fabRes = await client.query(`SELECT id FROM users WHERE branch_id = 24`);
    const fabIds = fabRes.rows.map((r: any) => r.id);
    if (fabIds.length > 0) {
      await deleteUsersWithDeps(client, fabIds);
      console.log(`  Deleted ${fabIds.length} existing Fabrika users.`);
    }

    const fabrikaUsers = [
      { firstName: "Atiye", lastName: "Kar", role: "supervisor", email: "atiyekar0706@gmail.com", hireDate: "2017-02-24", notes: "Vardiya yönetimi", birthDate: "1970-02-01", gender: "female", tckn: "24187239848", maritalStatus: "divorced", numChildren: 2, employmentType: "fulltime" },
      { firstName: "Ümit", lastName: "Kara", role: "supervisor_buddy", email: "umit.kara@dospresso.com", hireDate: "2023-05-01", notes: "Pasta şefi", employmentType: "fulltime" },
      { firstName: "Arife", lastName: "Yıldırım", role: "fabrika_operator", email: "arifeyildirim0@icloud.com", hireDate: "2025-05-23", gender: "female", tckn: "21265124058", employmentType: "fulltime" },
      { firstName: "Filiz", lastName: "Demir", role: "fabrika_operator", email: "filiz.demir@dospresso.com", hireDate: "2024-03-15", gender: "female", employmentType: "fulltime" },
      { firstName: "Büşra", lastName: "Doğmuş", role: "fabrika_operator", email: "busradogmus20@gmail.com", hireDate: "2023-08-08", birthDate: "1998-12-01", gender: "female", tckn: "35048322524", city: "Antalya", employmentType: "fulltime" },
      { firstName: "Mihrican", lastName: "Yılmaz", role: "fabrika_operator", email: "mihrican.yilmaz@dospresso.com", hireDate: "2024-06-01", gender: "female", employmentType: "fulltime" },
      { firstName: "Leyla", lastName: "Özdemir", role: "fabrika_operator", email: "leyla.ozdemir@dospresso.com", hireDate: "2024-01-10", gender: "female", employmentType: "fulltime" },
      { firstName: "Fatih", lastName: "Arslan", role: "stajyer", email: "fatih.arslan.stj@dospresso.com", hireDate: "2025-09-01", notes: "Ümit'in öğrencisi", employmentType: "fulltime" },
      { firstName: "Merve", lastName: "Çelik", role: "stajyer", email: "merve.celik.stj@dospresso.com", hireDate: "2025-09-01", notes: "Ümit'in öğrencisi", employmentType: "fulltime" },
      { firstName: "Emre", lastName: "Acar", role: "stajyer", email: "emre.acar.stj@dospresso.com", hireDate: "2025-10-01", notes: "Ümit'in öğrencisi", employmentType: "fulltime" },
      { firstName: "Selin", lastName: "Yıldız", role: "stajyer", email: "selin.yildiz.stj@dospresso.com", hireDate: "2025-10-15", notes: "Ümit'in öğrencisi", employmentType: "fulltime" },
    ];

    const fabrikaUserIds: Record<string, string> = {};

    for (const u of fabrikaUsers) {
      const id = crypto.randomUUID();
      const username = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, role, branch_id, hashed_password, hire_date, is_active, account_status, employment_type, birth_date, gender, tckn, city, marital_status, num_children, notes, username)
         VALUES ($1,$2,$3,$4,$5,24,$6,$7,true,'approved',$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [id, u.email, u.firstName, u.lastName, u.role, hashedPassword, u.hireDate, u.employmentType, (u as any).birthDate || null, (u as any).gender || null, (u as any).tckn || null, (u as any).city || null, (u as any).maritalStatus || null, (u as any).numChildren || 0, (u as any).notes || null, username]
      );
      fabrikaUserIds[u.firstName] = id;

      await client.query(
        `INSERT INTO factory_staff_pins (user_id, hashed_pin, is_active, created_at, updated_at)
         VALUES ($1, $2, true, now(), now()) ON CONFLICT DO NOTHING`,
        [id, hashedPin]
      );
    }
    console.log(`  Created ${fabrikaUsers.length} Fabrika users with PINs.`);

    // ============================================================
    // STEP 5: Departed employees
    // ============================================================
    console.log("\nSTEP 5: Creating departed employees...");

    const departedEmployees = [
      { firstName: "Berk Murat", lastName: "Aydın", email: "berkmaydin@gmail.com", leaveDate: "2025-09-09", leaveReason: "İstifa" },
      { firstName: "Döne", lastName: "Öz", email: "42doneoz@gmail.com", leaveDate: "2025-09-01", leaveReason: "Deneme süreli fesih" },
      { firstName: "Elif", lastName: "Balli", email: "ballielif31@gmail.com", leaveDate: "2025-07-04", leaveReason: "İstifa" },
      { firstName: "Nazlıcan", lastName: "Suyabakmaz", email: "n.suyabatmaz00@gmail.com", leaveDate: "2025-02-18", leaveReason: "Evlenme" },
      { firstName: "Rayif", lastName: "Karagüllü", email: "raydospres@gmail.com", leaveDate: "2025-01-17", leaveReason: "İşveren feshi" },
      { firstName: "Sıla", lastName: "Alp", email: "alpp.sila@gmail.com", leaveDate: "2025-03-14", leaveReason: "İstifa" },
      { firstName: "Tuncay", lastName: "Demirtaş", email: "tuncay.dts@icloud.com", leaveDate: "2025-09-26", leaveReason: "İstifa" },
      { firstName: "Yasemin", lastName: "Suyabakmaz", email: "yaseminsuyabakmaz@dospresso.com", leaveDate: "2025-02-17", leaveReason: "İstifa" },
      { firstName: "Zehra", lastName: "Kaptan", email: "zehrakaptan002@gmail.com", leaveDate: "2025-04-11", leaveReason: "İstifa" },
      { firstName: "Arda", lastName: "Gürbüz", email: "ardagrb07@gmail.com", leaveDate: "2025-04-04", leaveReason: "İstifa" },
    ];

    // Delete existing departed employees by email first
    const departedEmails = departedEmployees.map(d => d.email);
    const existingDeparted = await client.query(`SELECT id FROM users WHERE email = ANY($1)`, [departedEmails]);
    if (existingDeparted.rows.length > 0) {
      const depIds = existingDeparted.rows.map((r: any) => r.id);
      await deleteUsersWithDeps(client, depIds);
    }

    for (const d of departedEmployees) {
      const id = crypto.randomUUID();
      const username = d.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, role, branch_id, hashed_password, is_active, account_status, leave_start_date, leave_reason, username)
         VALUES ($1,$2,$3,$4,'barista',NULL,$5,false,'approved',$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [id, d.email, d.firstName, d.lastName, hashedPassword, d.leaveDate, d.leaveReason, username]
      );
    }
    console.log(`  Created ${departedEmployees.length} departed employees.`);

    // ============================================================
    // STEP 6: HQ cleanup - keep real HQ users, remove test roles
    // ============================================================
    console.log("\nSTEP 6: Cleaning HQ test users (branch 23)...");

    const hqNonRoleUsers = await client.query(
      `SELECT id FROM users WHERE branch_id = 23 AND role IN ('bar_buddy','barista','stajyer','supervisor','supervisor_buddy','yatirimci_branch','fabrika_operator') AND id NOT IN (${HQ_KEEP_IDS.map((_, i) => `$${i + 1}`).join(",")})`,
      HQ_KEEP_IDS
    );
    const hqTestIds = hqNonRoleUsers.rows.map((r: any) => r.id);
    if (hqTestIds.length > 0) {
      await deleteUsersWithDeps(client, hqTestIds);
      console.log(`  Removed ${hqTestIds.length} test users from HQ.`);
    } else {
      console.log("  No HQ test users to remove.");
    }

    // Verify HQ users exist
    const hqVerify = await client.query(
      `SELECT id, first_name, last_name, role FROM users WHERE id = ANY($1)`,
      [HQ_KEEP_IDS]
    );
    console.log(`  Verified ${hqVerify.rows.length}/${HQ_KEEP_IDS.length} HQ users exist.`);

    // STEP 6b: Reset all non-admin user passwords to "0000" (pilot mode)
    const nonAdminResetResult = await client.query(
      `UPDATE users SET hashed_password = $1 WHERE username != 'admin' AND is_active = true RETURNING username, first_name, last_name`,
      [hashedPassword]
    );
    console.log(`  Reset passwords for ${nonAdminResetResult.rowCount} non-admin active users to "0000" (pilot mode)`);

    // ============================================================
    // STEP 7: Create test users for branches 1,4,6-22
    // ============================================================
    console.log("\nSTEP 7: Creating test users for branches...");

    const testUserDefs = [
      { name: "teststajyer1", firstName: "TestStajyer1", lastName: "Test", role: "stajyer" },
      { name: "teststajyer2", firstName: "TestStajyer2", lastName: "Test", role: "stajyer" },
      { name: "tbarbuddy1", firstName: "TBarbuddy1", lastName: "Test", role: "bar_buddy" },
      { name: "tbarbuddy2", firstName: "TBarbuddy2", lastName: "Test", role: "bar_buddy" },
      { name: "tbarista1", firstName: "TBarista1", lastName: "Test", role: "barista" },
      { name: "tbarista2", firstName: "TBarista2", lastName: "Test", role: "barista" },
      { name: "tsupervisorbuddy1", firstName: "TSupervisorbuddy1", lastName: "Test", role: "supervisor_buddy" },
      { name: "tsupervisorbuddy2", firstName: "TSupervisorbuddy2", lastName: "Test", role: "supervisor_buddy" },
      { name: "testsupervisor", firstName: "TestSupervisor", lastName: "Test", role: "supervisor" },
    ];

    const branchTestUserIds: Record<number, string[]> = {};
    let testUserCount = 0;

    for (const branchId of TEST_BRANCH_IDS) {
      branchTestUserIds[branchId] = [];
      for (const def of testUserDefs) {
        const id = crypto.randomUUID();
        const username = `${def.name}_b${branchId}`;
        const email = `${def.name}_b${branchId}@dospresso.test`;
        await client.query(
          `INSERT INTO users (id, email, first_name, last_name, role, branch_id, hashed_password, is_active, account_status, username)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,'approved',$8)
           ON CONFLICT (id) DO NOTHING`,
          [id, email, def.firstName, def.lastName, def.role, branchId, hashedPassword, username]
        );
        branchTestUserIds[branchId].push(id);

        await client.query(
          `INSERT INTO branch_staff_pins (user_id, branch_id, hashed_pin, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, now(), now()) ON CONFLICT DO NOTHING`,
          [id, branchId, hashedPin]
        );
        testUserCount++;
      }
    }
    console.log(`  Created ${testUserCount} test users across ${TEST_BRANCH_IDS.length} branches.`);

    // ============================================================
    // STEP 8: Leave records for Isiklar and Fabrika employees
    // ============================================================
    console.log("\nSTEP 8: Creating leave records...");

    const leaveRecords = [
      { name: "Abdullah", leaves: [
        { start: "2025-02-12", end: "2025-02-12", type: "annual", days: 1 },
        { start: "2025-03-26", end: "2025-03-26", type: "annual", days: 1 },
        { start: "2025-05-14", end: "2025-05-14", type: "annual", days: 1 },
        { start: "2025-06-14", end: "2025-06-15", type: "annual", days: 2 },
      ]},
      { name: "Ateş Güney", leaves: [
        { start: "2025-04-27", end: "2025-04-27", type: "annual", days: 1 },
        { start: "2025-05-12", end: "2025-05-17", type: "annual", days: 6 },
        { start: "2025-06-18", end: "2025-06-18", type: "excuse", days: 1 },
        { start: "2025-09-19", end: "2025-09-21", type: "annual", days: 3 },
        { start: "2025-09-22", end: "2025-09-24", type: "unpaid", days: 3 },
      ]},
      { name: "Basri", leaves: [
        { start: "2025-01-10", end: "2025-01-10", type: "sick", days: 1 },
        { start: "2025-02-20", end: "2025-02-21", type: "annual", days: 2 },
        { start: "2025-03-15", end: "2025-03-15", type: "excuse", days: 1 },
        { start: "2025-04-05", end: "2025-04-06", type: "annual", days: 2 },
        { start: "2025-05-20", end: "2025-05-22", type: "annual", days: 3 },
        { start: "2025-06-10", end: "2025-06-10", type: "sick", days: 1 },
        { start: "2025-07-01", end: "2025-07-03", type: "annual", days: 3 },
      ]},
      { name: "Cihan", leaves: [
        { start: "2025-03-14", end: "2025-03-14", type: "annual", days: 1 },
        { start: "2025-04-28", end: "2025-04-28", type: "excuse", days: 1 },
        { start: "2025-06-14", end: "2025-06-15", type: "annual", days: 2 },
      ]},
      { name: "Kemal", leaves: [
        { start: "2025-02-03", end: "2025-02-05", type: "annual", days: 3 },
        { start: "2025-05-01", end: "2025-05-01", type: "excuse", days: 1 },
      ]},
      { name: "Edanur", leaves: [
        { start: "2025-03-08", end: "2025-03-08", type: "excuse", days: 1 },
        { start: "2025-06-20", end: "2025-06-22", type: "annual", days: 3 },
      ]},
    ];

    const fabrikaLeaveRecords = [
      { name: "Büşra", leaves: [
        { start: "2024-12-02", end: "2024-12-02", type: "sick", days: 1 },
        { start: "2025-03-07", end: "2025-03-07", type: "annual", days: 1 },
        { start: "2025-05-19", end: "2025-05-20", type: "annual", days: 2 },
      ]},
      { name: "Atiye", leaves: [
        { start: "2025-01-15", end: "2025-01-17", type: "annual", days: 3 },
        { start: "2025-03-10", end: "2025-03-10", type: "sick", days: 1 },
        { start: "2025-04-14", end: "2025-04-16", type: "annual", days: 3 },
        { start: "2025-06-02", end: "2025-06-04", type: "annual", days: 3 },
        { start: "2025-07-10", end: "2025-07-12", type: "annual", days: 3 },
        { start: "2025-08-18", end: "2025-08-20", type: "annual", days: 3 },
      ]},
      { name: "Arife", leaves: [
        { start: "2025-06-10", end: "2025-06-10", type: "excuse", days: 1 },
      ]},
      { name: "Ümit", leaves: [
        { start: "2025-04-01", end: "2025-04-03", type: "annual", days: 3 },
        { start: "2025-07-15", end: "2025-07-17", type: "annual", days: 3 },
      ]},
    ];

    let leaveCount = 0;
    for (const rec of leaveRecords) {
      const userId = isiklarUserIds[rec.name];
      if (!userId) continue;
      for (const l of rec.leaves) {
        await client.query(
          `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,'approved',now(),now()) ON CONFLICT DO NOTHING`,
          [userId, l.type, l.start, l.end, l.days]
        );
        leaveCount++;
      }
    }
    for (const rec of fabrikaLeaveRecords) {
      const userId = fabrikaUserIds[rec.name];
      if (!userId) continue;
      for (const l of rec.leaves) {
        await client.query(
          `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,'approved',now(),now()) ON CONFLICT DO NOTHING`,
          [userId, l.type, l.start, l.end, l.days]
        );
        leaveCount++;
      }
    }
    console.log(`  Created ${leaveCount} leave records.`);

    // ============================================================
    // STEP 9: Historical shift data (90 days back + 14 days forward)
    // ============================================================
    console.log("\nSTEP 9: Creating historical shift data...");

    const shiftPatterns = [
      { type: "morning", start: "08:00", end: "16:00" },
      { type: "regular", start: "12:00", end: "20:00" },
      { type: "evening", start: "16:00", end: "00:00" },
    ];

    const allBranchesForShifts = [5, ...TEST_BRANCH_IDS, 24];
    let totalShifts = 0;

    // Delete existing shifts for these branches to avoid duplicates
    await client.query(`DELETE FROM shifts WHERE branch_id = ANY($1)`, [allBranchesForShifts]);

    for (const branchId of allBranchesForShifts) {
      let employeeIds: string[];
      if (branchId === 5) {
        employeeIds = Object.values(isiklarUserIds);
      } else if (branchId === 24) {
        employeeIds = Object.values(fabrikaUserIds);
      } else {
        employeeIds = branchTestUserIds[branchId] || [];
      }

      if (employeeIds.length === 0) continue;

      const shiftValues: string[] = [];
      const shiftParams: any[] = [];
      let paramIdx = 1;

      for (let dayOffset = -90; dayOffset <= 14; dayOffset++) {
        const shiftDate = new Date();
        shiftDate.setDate(shiftDate.getDate() + dayOffset);
        const dateStr = fmt(shiftDate);
        const dayOfWeek = shiftDate.getDay();
        const isPast = dayOffset < 0;
        const status = isPast ? "completed" : "confirmed";

        const numShifts = randomInt(5, 7);
        const shuffled = [...employeeIds].sort(() => Math.random() - 0.5);
        const assigned = shuffled.slice(0, Math.min(numShifts, shuffled.length));

        for (let i = 0; i < assigned.length; i++) {
          const pattern = shiftPatterns[i % shiftPatterns.length];
          const createdById = assigned[0];
          shiftValues.push(`($${paramIdx},$${paramIdx + 1},$${paramIdx + 2},$${paramIdx + 3},$${paramIdx + 4},$${paramIdx + 5},$${paramIdx + 6},$${paramIdx + 7})`);
          shiftParams.push(branchId, assigned[i], createdById, dateStr, pattern.start, pattern.end, pattern.type, status);
          paramIdx += 8;
        }

        // Batch insert every 500 shifts
        if (shiftValues.length >= 500) {
          await client.query(
            `INSERT INTO shifts (branch_id, assigned_to_id, created_by_id, shift_date, start_time, end_time, shift_type, status)
             VALUES ${shiftValues.join(",")}`,
            shiftParams
          );
          totalShifts += shiftValues.length;
          shiftValues.length = 0;
          shiftParams.length = 0;
          paramIdx = 1;
        }
      }

      // Insert remaining
      if (shiftValues.length > 0) {
        await client.query(
          `INSERT INTO shifts (branch_id, assigned_to_id, created_by_id, shift_date, start_time, end_time, shift_type, status)
           VALUES ${shiftValues.join(",")}`,
          shiftParams
        );
        totalShifts += shiftValues.length;
      }
    }
    console.log(`  Created ${totalShifts} shifts across ${allBranchesForShifts.length} branches.`);

    // ============================================================
    // STEP 10: Historical tasks (3 months)
    // ============================================================
    console.log("\nSTEP 10: Creating historical tasks...");

    const taskDescriptions = [
      "Bar alanı temizliği yapılmalı",
      "Günlük envanter sayımı",
      "Müşteri geri bildirimleri raporu hazırla",
      "Ekipman bakım kontrolü",
      "Yeni ürün tanıtım materyalleri hazırla",
      "Haftalık satış raporu",
      "Personel toplantısı notları",
      "Stok siparişi oluştur",
      "Vitrin düzenlemesi",
      "Kampanya materyalleri güncelle",
    ];

    const taskStatuses = ["onaylandi", "onaylandi", "onaylandi", "onaylandi", "onaylandi", "onaylandi",
      "devam_ediyor", "devam_ediyor", "devam_ediyor",
      "beklemede", "beklemede",
      "reddedildi",
      "incelemede",
      "foto_bekleniyor"];

    const taskPriorities = ["low", "low", "low", "low", "medium", "medium", "medium", "high", "high", "yüksek"];

    const allBranchesForTasks = [5, ...TEST_BRANCH_IDS, 24];
    let totalTasks = 0;

    // Delete existing tasks for these branches
    await client.query(`DELETE FROM tasks WHERE branch_id = ANY($1)`, [allBranchesForTasks]);

    for (const branchId of allBranchesForTasks) {
      let employeeIds: string[];
      if (branchId === 5) {
        employeeIds = Object.values(isiklarUserIds);
      } else if (branchId === 24) {
        employeeIds = Object.values(fabrikaUserIds);
      } else {
        employeeIds = branchTestUserIds[branchId] || [];
      }

      if (employeeIds.length === 0) continue;

      const taskValues: string[] = [];
      const taskParams: any[] = [];
      let paramIdx = 1;

      for (let week = 0; week < 13; week++) {
        const tasksThisWeek = randomInt(3, 5);
        for (let t = 0; t < tasksThisWeek; t++) {
          const dayOffset = -(week * 7 + randomInt(0, 6));
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + dayOffset);
          const createdDate = new Date(dueDate);
          createdDate.setDate(createdDate.getDate() - randomInt(1, 3));

          const assignedTo = pick(employeeIds);
          const assignedBy = pick(employeeIds);
          const description = pick(taskDescriptions);
          const status = pick(taskStatuses);
          const priority = pick(taskPriorities);

          taskValues.push(`($${paramIdx},$${paramIdx + 1},$${paramIdx + 2},$${paramIdx + 3},$${paramIdx + 4},$${paramIdx + 5},$${paramIdx + 6},$${paramIdx + 7})`);
          taskParams.push(branchId, assignedTo, description, status, fmtTs(dueDate), assignedBy, priority, fmtTs(createdDate));
          paramIdx += 8;
        }
      }

      if (taskValues.length > 0) {
        await client.query(
          `INSERT INTO tasks (branch_id, assigned_to_id, description, status, due_date, assigned_by_id, priority, created_at)
           VALUES ${taskValues.join(",")}`,
          taskParams
        );
        totalTasks += taskValues.length;
      }
    }
    console.log(`  Created ${totalTasks} tasks.`);

    // ============================================================
    // STEP 11: Equipment fault records
    // ============================================================
    console.log("\nSTEP 11: Creating equipment fault records...");

    const equipRes = await client.query(`SELECT id, branch_id, equipment_type FROM equipment WHERE branch_id = ANY($1)`, [allBranchesForTasks]);
    const equipmentByBranch: Record<number, Array<{ id: number; type: string }>> = {};
    for (const eq of equipRes.rows) {
      if (!equipmentByBranch[eq.branch_id]) equipmentByBranch[eq.branch_id] = [];
      equipmentByBranch[eq.branch_id].push({ id: eq.id, type: eq.equipment_type });
    }

    const faultDescriptions: Record<string, string> = {
      espresso: "Espresso makinesi basınç problemi",
      ice: "Buz makinesi soğutma sorunu",
      cash: "Kasa ekranı yanıt vermiyor",
      blender: "Blender motor sesi geliyor",
      krema: "Krema makinesi sızıntı",
      tea: "Çay makinesi ısınma problemi",
      kiosk: "Kiosk dokunmatik ekran arızası",
      mixer: "Mixer bıçak seti aşınmış",
    };

    const faultStatuses = ["resolved", "resolved", "resolved", "resolved", "resolved",
      "in_progress", "in_progress", "in_progress",
      "open", "open"];
    const faultPriorities = ["low", "medium", "medium", "high", "critical"];

    let totalFaults = 0;

    // Delete existing faults for these branches
    await client.query(`DELETE FROM equipment_faults WHERE branch_id = ANY($1)`, [allBranchesForTasks]);

    for (const branchId of allBranchesForTasks) {
      const equipment = equipmentByBranch[branchId];
      if (!equipment || equipment.length === 0) continue;

      let employeeIds: string[];
      if (branchId === 5) employeeIds = Object.values(isiklarUserIds);
      else if (branchId === 24) employeeIds = Object.values(fabrikaUserIds);
      else employeeIds = branchTestUserIds[branchId] || [];
      if (employeeIds.length === 0) continue;

      const numFaults = randomInt(2, 4);
      for (let f = 0; f < numFaults; f++) {
        const eq = pick(equipment);
        const desc = faultDescriptions[eq.type] || "Ekipman arızası";
        const status = pick(faultStatuses);
        const priority = pick(faultPriorities);
        const reportedBy = pick(employeeIds);
        const dayOffset = -randomInt(1, 90);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() + dayOffset);

        await client.query(
          `INSERT INTO equipment_faults (branch_id, reported_by_id, equipment_name, description, status, priority, priority_level, equipment_id, current_stage, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$9)`,
          [branchId, reportedBy, eq.type, desc, status, priority, eq.id, status === "resolved" ? "resolved" : "diagnosis", fmtTs(createdAt)]
        );
        totalFaults++;
      }
    }
    console.log(`  Created ${totalFaults} equipment fault records.`);

    // ============================================================
    // STEP 12: Notifications
    // ============================================================
    console.log("\nSTEP 12: Creating notifications...");

    const notifTypes = ["task", "shift", "fault", "announcement", "system"];
    const notifTitles = [
      "Yeni görev atandı",
      "Vardiya planı güncellendi",
      "Arıza bildirimi",
      "Duyuru: Yeni kampanya başladı",
      "Görev tamamlandı",
      "İzin talebiniz onaylandı",
      "Bakım hatırlatması",
      "Performans değerlendirmesi",
    ];
    const notifMessages = [
      "Lütfen detayları kontrol ediniz.",
      "Yeni bir güncelleme yapıldı.",
      "Acil dikkat gerektirir.",
      "Bilgilendirme amaçlıdır.",
      "Tamamlama süresi yaklaşıyor.",
    ];

    // Collect all active user IDs with branch info
    const allActiveUsers = await client.query(
      `SELECT id, branch_id FROM users WHERE is_active = true AND branch_id IS NOT NULL`
    );

    let totalNotifs = 0;
    const notifBatchValues: string[] = [];
    const notifBatchParams: any[] = [];
    let notifParamIdx = 1;

    for (const user of allActiveUsers.rows) {
      const numNotifs = randomInt(5, 15);
      for (let n = 0; n < numNotifs; n++) {
        const dayOffset = -randomInt(0, 90);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() + dayOffset);
        const isRead = dayOffset < -7 ? Math.random() > 0.3 : Math.random() > 0.5;
        const type = pick(notifTypes);
        const title = pick(notifTitles);
        const message = pick(notifMessages);

        notifBatchValues.push(`($${notifParamIdx},$${notifParamIdx + 1},$${notifParamIdx + 2},$${notifParamIdx + 3},$${notifParamIdx + 4},$${notifParamIdx + 5},$${notifParamIdx + 6})`);
        notifBatchParams.push(user.id, type, title, message, isRead, fmtTs(createdAt), user.branch_id);
        notifParamIdx += 7;
        totalNotifs++;

        if (notifBatchValues.length >= 500) {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, branch_id)
             VALUES ${notifBatchValues.join(",")}`,
            notifBatchParams
          );
          notifBatchValues.length = 0;
          notifBatchParams.length = 0;
          notifParamIdx = 1;
        }
      }
    }

    if (notifBatchValues.length > 0) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, branch_id)
         VALUES ${notifBatchValues.join(",")}`,
        notifBatchParams
      );
    }
    console.log(`  Created ${totalNotifs} notifications.`);

    // ============================================================
    // STEP 13: Checklist completions (past 3 months, daily)
    // ============================================================
    console.log("\nSTEP 13: Creating checklist completions...");

    const checklistIds = [1, 2, 3];
    const allBranchesForChecklists = [5, ...TEST_BRANCH_IDS, 24];
    let totalCompletions = 0;

    await client.query(`DELETE FROM checklist_completions WHERE branch_id = ANY($1)`, [allBranchesForChecklists]);
    await client.query(`DELETE FROM checklist_assignments WHERE branch_id = ANY($1)`, [allBranchesForChecklists]);

    const assignmentMap: Record<string, number> = {};

    for (const branchId of allBranchesForChecklists) {
      for (const checklistId of checklistIds) {
        const aRes = await client.query(
          `INSERT INTO checklist_assignments (checklist_id, scope, branch_id, is_active, effective_from)
           VALUES ($1, 'branch', $2, true, '2024-01-01') RETURNING id`,
          [checklistId, branchId]
        );
        assignmentMap[`${branchId}-${checklistId}`] = aRes.rows[0].id;
      }
    }
    console.log(`  Created ${Object.keys(assignmentMap).length} checklist assignments.`);

    for (const branchId of allBranchesForChecklists) {
      let employeeIds: string[];
      if (branchId === 5) employeeIds = Object.values(isiklarUserIds);
      else if (branchId === 24) employeeIds = Object.values(fabrikaUserIds);
      else employeeIds = branchTestUserIds[branchId] || [];
      if (employeeIds.length === 0) continue;

      const compValues: string[] = [];
      const compParams: any[] = [];
      let compParamIdx = 1;

      for (let dayOffset = -90; dayOffset <= 0; dayOffset++) {
        const schedDate = new Date();
        schedDate.setDate(schedDate.getDate() + dayOffset);
        const dateStr = fmt(schedDate);
        if (schedDate.getDay() === 0) continue;

        for (const checklistId of checklistIds) {
          const userId = pick(employeeIds);
          const assignmentId = assignmentMap[`${branchId}-${checklistId}`];
          const totalTaskCount = checklistId === 1 ? 12 : checklistId === 2 ? 8 : 10;
          const completedCount = randomInt(Math.floor(totalTaskCount * 0.7), totalTaskCount);
          const isLate = Math.random() > 0.85;
          const startedAt = new Date(schedDate);
          startedAt.setHours(checklistId === 1 ? 7 : checklistId === 2 ? 20 : 14, randomInt(0, 30));
          const completedAt = new Date(startedAt);
          completedAt.setMinutes(completedAt.getMinutes() + randomInt(15, 60));

          compValues.push(`($${compParamIdx},$${compParamIdx + 1},$${compParamIdx + 2},$${compParamIdx + 3},$${compParamIdx + 4},$${compParamIdx + 5},$${compParamIdx + 6},$${compParamIdx + 7},$${compParamIdx + 8},$${compParamIdx + 9},$${compParamIdx + 10})`);
          compParams.push(assignmentId, checklistId, userId, branchId, "completed", dateStr, fmtTs(startedAt), fmtTs(completedAt), isLate, totalTaskCount, completedCount);
          compParamIdx += 11;
          totalCompletions++;

          if (compValues.length >= 200) {
            await client.query(
              `INSERT INTO checklist_completions (assignment_id, checklist_id, user_id, branch_id, status, scheduled_date, started_at, completed_at, is_late, total_tasks, completed_tasks)
               VALUES ${compValues.join(",")}`,
              compParams
            );
            compValues.length = 0;
            compParams.length = 0;
            compParamIdx = 1;
          }
        }
      }

      if (compValues.length > 0) {
        await client.query(
          `INSERT INTO checklist_completions (assignment_id, checklist_id, user_id, branch_id, status, scheduled_date, started_at, completed_at, is_late, total_tasks, completed_tasks)
           VALUES ${compValues.join(",")}`,
          compParams
        );
      }
    }
    console.log(`  Created ${totalCompletions} checklist completions.`);

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log("\n=== SEED COMPLETE ===");
    const userCount = await client.query(`SELECT COUNT(*) as cnt FROM users`);
    const activeCount = await client.query(`SELECT COUNT(*) as cnt FROM users WHERE is_active = true`);
    const shiftCount = await client.query(`SELECT COUNT(*) as cnt FROM shifts`);
    const taskCount = await client.query(`SELECT COUNT(*) as cnt FROM tasks`);
    const faultCount = await client.query(`SELECT COUNT(*) as cnt FROM equipment_faults`);
    const notifCount = await client.query(`SELECT COUNT(*) as cnt FROM notifications`);
    const leaveReqCount = await client.query(`SELECT COUNT(*) as cnt FROM leave_requests`);
    const compCount = await client.query(`SELECT COUNT(*) as cnt FROM checklist_completions`);

    console.log(`  Total users: ${userCount.rows[0].cnt} (active: ${activeCount.rows[0].cnt})`);
    console.log(`  Shifts: ${shiftCount.rows[0].cnt}`);
    console.log(`  Tasks: ${taskCount.rows[0].cnt}`);
    console.log(`  Equipment Faults: ${faultCount.rows[0].cnt}`);
    console.log(`  Notifications: ${notifCount.rows[0].cnt}`);
    console.log(`  Leave Requests: ${leaveReqCount.rows[0].cnt}`);
    console.log(`  Checklist Completions: ${compCount.rows[0].cnt}`);
    console.log("\nAll passwords: 0000");

  } catch (error) {
    console.error("SEED ERROR:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
