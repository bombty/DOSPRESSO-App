/**
 * DOSPRESSO Demo Data Seed Script
 * 
 * Seeds database with sample data for testing:
 * - 3 branches
 * - 13 roles × users (HQ + branch roles)
 * - Sample equipment, tasks, checklists, knowledge base
 * 
 * All passwords: 0000
 * Run: npm run seed:demo
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import bcrypt from "bcrypt";
import * as schema from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Shared password for all demo users
const DEMO_PASSWORD = "0000";

async function main() {
  console.log("🌱 Starting demo data seed...\n");

  // Hash password once (all users share same password in demo)
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ========================================
  // 1. CREATE BRANCHES
  // ========================================
  console.log("📍 Creating branches...");
  
  const [kadikoy, besiktas, uskudar] = await db.insert(schema.branches).values([
    {
      name: "Kadıköy Şubesi",
      address: "Kadıköy Moda Caddesi No:45",
      city: "İstanbul",
      phoneNumber: "0216 xxx xx 01",
      managerName: "Ahmet Yılmaz",
      isActive: true,
    },
    {
      name: "Beşiktaş Şubesi",
      address: "Beşiktaş Barbaros Bulvarı No:102",
      city: "İstanbul",
      phoneNumber: "0212 xxx xx 02",
      managerName: "Mehmet Kaya",
      isActive: true,
    },
    {
      name: "Üsküdar Şubesi",
      address: "Üsküdar Çarşı Caddesi No:23",
      city: "İstanbul",
      phoneNumber: "0216 xxx xx 03",
      managerName: "Ayşe Demir",
      isActive: true,
    },
  ]).returning();

  console.log(`✅ Created ${[kadikoy, besiktas, uskudar].length} branches\n`);

  // ========================================
  // 2. CREATE HQ USERS (8 HQ roles)
  // ========================================
  console.log("👤 Creating HQ users...");

  const hqUsers = await db.insert(schema.users).values([
    {
      username: "admin",
      hashedPassword,
      email: "admin@dospresso.com",
      firstName: "Admin",
      lastName: "Kullanıcı",
      role: schema.UserRole.ADMIN,
      branchId: null,
    },
    {
      username: "muhasebe",
      hashedPassword,
      email: "muhasebe@dospresso.com",
      firstName: "Zeynep",
      lastName: "Çelik",
      role: schema.UserRole.MUHASEBE,
      branchId: null,
    },
    {
      username: "satinalma",
      hashedPassword,
      email: "satinalma@dospresso.com",
      firstName: "Can",
      lastName: "Arslan",
      role: schema.UserRole.SATINALMA,
      branchId: null,
    },
    {
      username: "coach",
      hashedPassword,
      email: "coach@dospresso.com",
      firstName: "Elif",
      lastName: "Yıldız",
      role: schema.UserRole.COACH,
      branchId: null,
    },
    {
      username: "teknik",
      hashedPassword,
      email: "teknik@dospresso.com",
      firstName: "Burak",
      lastName: "Şahin",
      role: schema.UserRole.TEKNIK,
      branchId: null,
    },
    {
      username: "destek",
      hashedPassword,
      email: "destek@dospresso.com",
      firstName: "Selin",
      lastName: "Öztürk",
      role: schema.UserRole.DESTEK,
      branchId: null,
    },
    {
      username: "fabrika",
      hashedPassword,
      email: "fabrika@dospresso.com",
      firstName: "Emre",
      lastName: "Aydın",
      role: schema.UserRole.FABRIKA,
      branchId: null,
    },
    {
      username: "yatirimci-hq",
      hashedPassword,
      email: "yatirimci@dospresso.com",
      firstName: "Deniz",
      lastName: "Koç",
      role: schema.UserRole.YATIRIMCI_HQ,
      branchId: null,
    },
  ]).returning();

  console.log(`✅ Created ${hqUsers.length} HQ users\n`);

  // ========================================
  // 3. CREATE BRANCH USERS (5 roles × 3 branches = 15 users)
  // ========================================
  console.log("🏢 Creating branch users...");

  const branchRoles = [
    schema.UserRole.SUPERVISOR,
    schema.UserRole.SUPERVISOR_BUDDY,
    schema.UserRole.BARISTA,
    schema.UserRole.BAR_BUDDY,
    schema.UserRole.STAJYER,
  ];

  const branchUserData: any[] = [];

  // For each branch, create 5 users (1 per role)
  [kadikoy, besiktas, uskudar].forEach((branch, branchIndex) => {
    branchRoles.forEach((role, roleIndex) => {
      const branchPrefix = branch.name.split(" ")[0].toLowerCase();
      branchUserData.push({
        username: `${branchPrefix}-${role}`,
        hashedPassword,
        email: `${branchPrefix}.${role}@dospresso.com`,
        firstName: getFirstName(roleIndex),
        lastName: getBranchLastName(branchIndex),
        role,
        branchId: branch.id,
        hireDate: new Date(2024, 0, 1 + branchIndex * 10 + roleIndex).toISOString().split('T')[0],
        probationEndDate: role === schema.UserRole.STAJYER || role === schema.UserRole.BAR_BUDDY
          ? new Date(2025, 2, 1).toISOString().split('T')[0] // Probation ends March 2025
          : null,
      });
    });
  });

  const branchUsers = await db.insert(schema.users).values(branchUserData).returning();
  console.log(`✅ Created ${branchUsers.length} branch users\n`);

  // ========================================
  // 4. CREATE CHECKLISTS
  // ========================================
  console.log("📋 Creating checklists...");

  const [openingChecklist, closingChecklist, cleaningChecklist] = await db.insert(schema.checklists).values([
    {
      title: "Açılış Prosedürü",
      description: "Sabah açılış rutini",
      frequency: "daily",
      category: "opening",
      isActive: true,
    },
    {
      title: "Kapanış Prosedürü",
      description: "Gün sonu kapanış rutini",
      frequency: "daily",
      category: "closing",
      isActive: true,
    },
    {
      title: "Haftalık Temizlik",
      description: "Ekipman derin temizliği",
      frequency: "weekly",
      category: "cleaning",
      isActive: true,
    },
  ]).returning();

  console.log(`✅ Created ${[openingChecklist, closingChecklist, cleaningChecklist].length} checklists\n`);

  // ========================================
  // 5. CREATE CHECKLIST TASKS
  // ========================================
  console.log("✅ Creating checklist tasks...");

  await db.insert(schema.checklistTasks).values([
    // Opening tasks
    { checklistId: openingChecklist.id, taskDescription: "Espresso makinesini aç ve ısıt", requiresPhoto: true, order: 1 },
    { checklistId: openingChecklist.id, taskDescription: "Vitrin ürünlerini yerleştir", requiresPhoto: true, order: 2 },
    { checklistId: openingChecklist.id, taskDescription: "Kasa açılış sayımı yap", requiresPhoto: false, order: 3 },
    // Closing tasks
    { checklistId: closingChecklist.id, taskDescription: "Makine temizliği yap", requiresPhoto: true, order: 1 },
    { checklistId: closingChecklist.id, taskDescription: "Kasa kapanış sayımı yap", requiresPhoto: false, order: 2 },
    { checklistId: closingChecklist.id, taskDescription: "Çöpleri at ve ortamı temizle", requiresPhoto: true, order: 3 },
    // Cleaning tasks
    { checklistId: cleaningChecklist.id, taskDescription: "Espresso makinesi derin temizlik", requiresPhoto: true, order: 1 },
    { checklistId: cleaningChecklist.id, taskDescription: "Buzdolabı temizliği", requiresPhoto: true, order: 2 },
  ]);

  console.log(`✅ Created checklist tasks\n`);

  // ========================================
  // 6. CREATE SAMPLE TASKS
  // ========================================
  console.log("📝 Creating sample tasks...");

  const sampleTasks: typeof schema.tasks.$inferInsert[] = [];
  
  // Create a few tasks for each branch
  for (const branch of [kadikoy, besiktas, uskudar]) {
    const supervisor = branchUsers.find(u => u.branchId === branch.id && u.role === schema.UserRole.SUPERVISOR);
    const barista = branchUsers.find(u => u.branchId === branch.id && u.role === schema.UserRole.BARISTA);

    if (supervisor && barista) {
      sampleTasks.push({
        branchId: branch.id,
        assignedToId: barista.id,
        assignedById: supervisor.id,
        description: "Kahve çekirdekleri stok kontrolü yap",
        status: "beklemede",
        priority: "orta",
        requiresPhoto: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });

      sampleTasks.push({
        branchId: branch.id,
        assignedToId: barista.id,
        assignedById: supervisor.id,
        description: "Espresso makinesi basınç kontrolü",
        status: "beklemede",
        priority: "yuksek",
        requiresPhoto: true,
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      });
    }
  }

  await db.insert(schema.tasks).values(sampleTasks);
  console.log(`✅ Created ${sampleTasks.length} sample tasks\n`);

  // ========================================
  // 7. CREATE KNOWLEDGE BASE ARTICLES
  // ========================================
  console.log("📚 Creating knowledge base articles...");

  const articles = await db.insert(schema.knowledgeBaseArticles).values([
    {
      title: "Espresso Makine Kalibrasyonu",
      category: "maintenance",
      content: `# Espresso Makine Kalibrasyonu

## Gerekli Malzemeler
- Basınç ölçer
- Temizlik fırçası
- Grup başı temizlik tozu
- Mikrofiber bez

## Adımlar
1. Makinenin sıcaklığının ideal seviyeye geldiğinden emin olun (90-96°C)
2. Basıncı kontrol edin (8-10 bar olmalı)
3. Grup başlarını temizleyin
4. Ekstraksiyon süresini test edin (25-30 saniye)
5. Gerekirse ayarları yapın

## Önemli Notlar
- Günlük kontrol şarttır
- Basınç çok yüksekse teknisyen çağırın
- Temizlik günlük yapılmalı`,
      tags: ["espresso", "kalibrasyon", "bakım"],
      isPublished: true,
      viewCount: 0,
    },
    {
      title: "Cappuccino Tarifi",
      category: "recipe",
      content: `# Cappuccino Tarifi

## Malzemeler
- 18g espresso kahve
- 150ml soğuk süt
- Kakao tozu (opsiyonel)

## Hazırlanış
1. Çift shot espresso çek (60ml)
2. Süt köpüğü hazırla (65°C)
3. Espresso üzerine süt ve köpük ekle
4. Üzerine kakao serp

## DOSPRESSO Standardı
- Köpük dokusu: Kadifemsi, parlak
- Sıcaklık: 60-65°C
- Sunum: 180ml bardak`,
      tags: ["cappuccino", "tarif", "süt köpüğü"],
      isPublished: true,
      viewCount: 0,
    },
    {
      title: "Müşteri Şikayeti Yönetimi",
      category: "sop",
      content: `# Müşteri Şikayeti Yönetimi

## İlk Temas
1. Müşteriyi sakin bir şekilde dinleyin
2. Empati kurun
3. Özür dileyin (gerekirse)

## Çözüm Adımları
1. Sorunun kaynağını tespit edin
2. Hemen çözülebiliyorsa çözün
3. Yeni ürün/içecek teklif edin
4. Supervisor'a bilgi verin

## Önemli Kurallar
- Asla tartışmayın
- Müşteriyi haklı çıkarın
- Hızlı çözüm sunun
- Kayıt tutun`,
      tags: ["müşteri", "şikayet", "sop"],
      isPublished: true,
      viewCount: 0,
    },
  ]).returning();

  console.log(`✅ Created ${articles.length} knowledge base articles\n`);

  // ========================================
  // 8. SUMMARY
  // ========================================
  console.log("\n🎉 Demo data seed completed!\n");
  console.log("📊 Summary:");
  console.log(`   - Branches: ${[kadikoy, besiktas, uskudar].length}`);
  console.log(`   - HQ Users: ${hqUsers.length}`);
  console.log(`   - Branch Users: ${branchUsers.length}`);
  console.log(`   - Total Users: ${hqUsers.length + branchUsers.length}`);
  console.log(`   - Checklists: 3`);
  console.log(`   - Tasks: ${sampleTasks.length}`);
  console.log(`   - Knowledge Base Articles: ${articles.length}\n`);
  
  console.log("🔑 Login credentials:");
  console.log("   Username: admin | Password: 0000");
  console.log("   Username: coach | Password: 0000");
  console.log("   Username: teknik | Password: 0000");
  console.log("   Username: kadıköy-supervisor | Password: 0000");
  console.log("   ...and all other users with password: 0000\n");

  await pool.end();
}

// Helper functions for name generation
function getFirstName(index: number): string {
  const names = ["Ali", "Fatma", "Mehmet", "Ayşe", "Mustafa"];
  return names[index % names.length];
}

function getBranchLastName(branchIndex: number): string {
  const lastNames = ["Yılmaz", "Demir", "Şahin"];
  return lastNames[branchIndex];
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
