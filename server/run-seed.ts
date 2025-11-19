import { db } from "./db";
import { storage } from "./storage";
import { seedEquipmentForBranches, seedTrainingModules, seedBranchPersonnel } from "./seed-utils";
import bcrypt from "bcrypt";

async function runSeed() {
  try {
    console.log("🌱 Starting seed process...");
    
    // Hash password for all seed users
    const hashedPassword = await bcrypt.hash("0000", 10);
    
    // 0. Ensure admin user exists with correct password
    console.log("\n👤 Checking admin user...");
    let adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      console.log("Creating admin user...");
      adminUser = await storage.createUser({
        username: 'admin',
        hashedPassword,
        email: 'admin@dospresso.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        accountStatus: 'approved',
        isActive: true,
      });
      console.log(`✅ Admin user created with accountStatus=approved, isActive=true: ${adminUser.id}`);
    } else {
      console.log(`✅ Admin user found: ${adminUser.id}, updating credentials...`);
      // Update password, accountStatus, and isActive to ensure admin can always log in
      await storage.updateUser(adminUser.id, { 
        hashedPassword,
        accountStatus: 'approved',
        isActive: true
      });
      console.log(`✅ Admin credentials updated (password, accountStatus=approved, isActive=true)`);
    }
    
    // 1. Seed equipment
    console.log("\n📦 Seeding equipment...");
    const equipmentResult = await seedEquipmentForBranches();
    console.log(`✅ Equipment: ${equipmentResult.created} created, ${equipmentResult.skipped} skipped`);
    
    // 2. Seed training modules (need admin user ID)
    console.log("\n📚 Seeding training modules...");
    const trainingResult = await seedTrainingModules(adminUser.id);
    console.log(`✅ Training: ${trainingResult.created} created, ${trainingResult.skipped} skipped`);
    
    // 3. Seed personnel
    console.log("\n👥 Seeding personnel...");
    const personnelResult = await seedBranchPersonnel(hashedPassword);
    console.log(`✅ Personnel: ${personnelResult.created} created, ${personnelResult.skipped} skipped (${personnelResult.branches} branches)`);
    
    console.log("\n✅ Seed process completed successfully!");
    console.log(`\nSummary:`);
    console.log(`- Equipment: ${equipmentResult.created} items`);
    console.log(`- Training modules: ${trainingResult.created} modules`);
    console.log(`- Personnel: ${personnelResult.created} employees across ${personnelResult.branches} branches`);
    console.log(`\nAll seed users have password: 0000`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

runSeed();
