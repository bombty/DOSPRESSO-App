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
  // 1. CREATE BRANCHES (18 Real DOSPRESSO Branches)
  // ========================================
  console.log("📍 Creating 18 real DOSPRESSO branches...");
  
  const branches = await db.insert(schema.branches).values([
    // ANTALYA (5 branches)
    {
      name: "Antalya Işıklar",
      address: "Işıklar Caddesi, 07100 Muratpaşa",
      city: "Antalya",
      phoneNumber: "0242 xxx 10 01",
      managerName: "Ahmet Yılmaz",
      isActive: true,
    },
    {
      name: "Antalya Mallof",
      address: "Mall of Antalya AVM, Lara",
      city: "Antalya",
      phoneNumber: "0242 xxx 10 02",
      managerName: "Elif Kaya",
      isActive: true,
    },
    {
      name: "Antalya Markantalya",
      address: "MarkAntalya AVM, Kepez",
      city: "Antalya",
      phoneNumber: "0242 xxx 10 03",
      managerName: "Mehmet Demir",
      isActive: true,
    },
    {
      name: "Antalya Lara",
      address: "Lara Bulvarı, Muratpaşa",
      city: "Antalya",
      phoneNumber: "0242 xxx 10 04",
      managerName: "Zeynep Şahin",
      isActive: true,
    },
    {
      name: "Antalya Beachpark",
      address: "Beach Park AVM, Konyaaltı",
      city: "Antalya",
      phoneNumber: "0242 xxx 10 05",
      managerName: "Can Arslan",
      isActive: true,
    },
    // GAZIANTEP (3 branches)
    {
      name: "Gaziantep İbrahimli",
      address: "İbrahimli Mahallesi, Şehitkamil",
      city: "Gaziantep",
      phoneNumber: "0342 xxx 20 01",
      managerName: "Fatma Yıldız",
      isActive: true,
    },
    {
      name: "Gaziantep İbnisina",
      address: "İbnisina Hastanesi Yanı, Şahinbey",
      city: "Gaziantep",
      phoneNumber: "0342 xxx 20 02",
      managerName: "Burak Öztürk",
      isActive: true,
    },
    {
      name: "Gaziantep Üniversite",
      address: "Üniversite Caddesi, Şehitkamil",
      city: "Gaziantep",
      phoneNumber: "0342 xxx 20 03",
      managerName: "Selin Aydın",
      isActive: true,
    },
    // KONYA (2 branches)
    {
      name: "Konya Meram",
      address: "Meram Yeni Yol Caddesi",
      city: "Konya",
      phoneNumber: "0332 xxx 30 01",
      managerName: "Emre Çelik",
      isActive: true,
    },
    {
      name: "Konya Bosna",
      address: "Bosna Hersek Mahallesi, Selçuklu",
      city: "Konya",
      phoneNumber: "0332 xxx 30 02",
      managerName: "Ayşe Kurt",
      isActive: true,
    },
    // SAMSUN (2 branches)
    {
      name: "Samsun Marina",
      address: "Piazza AVM, İlkadım",
      city: "Samsun",
      phoneNumber: "0362 xxx 40 01",
      managerName: "Deniz Koç",
      isActive: true,
    },
    {
      name: "Samsun Atakum",
      address: "Atakum Bulvarı, Atakum",
      city: "Samsun",
      phoneNumber: "0362 xxx 40 02",
      managerName: "Ali Erdoğan",
      isActive: true,
    },
    // BATMAN
    {
      name: "Batman",
      address: "Cumhuriyet Caddesi, Merkez",
      city: "Batman",
      phoneNumber: "0488 xxx 50 01",
      managerName: "Mustafa Yaman",
      isActive: true,
    },
    // DÜZCE
    {
      name: "Düzce",
      address: "Kadir Has Caddesi, Merkez",
      city: "Düzce",
      phoneNumber: "0380 xxx 60 01",
      managerName: "Sevgi Polat",
      isActive: true,
    },
    // SIIRT
    {
      name: "Siirt",
      address: "Atatürk Caddesi, Merkez",
      city: "Siirt",
      phoneNumber: "0484 xxx 70 01",
      managerName: "Hakan Acar",
      isActive: true,
    },
    // KILIS
    {
      name: "Kilis",
      address: "Meydan Caddesi, Merkez",
      city: "Kilis",
      phoneNumber: "0348 xxx 80 01",
      managerName: "Gül Yavuz",
      isActive: true,
    },
    // ŞANLIURFA
    {
      name: "Şanlıurfa",
      address: "Balıklıgöl Yanı, Haliliye",
      city: "Şanlıurfa",
      phoneNumber: "0414 xxx 90 01",
      managerName: "Murat Kaplan",
      isActive: true,
    },
    // NIZIP
    {
      name: "Nizip",
      address: "Cumhuriyet Meydanı, Nizip",
      city: "Gaziantep",
      phoneNumber: "0342 xxx 91 01",
      managerName: "Esra Taş",
      isActive: true,
    },
  ]).returning();

  console.log(`✅ Created ${branches.length} real DOSPRESSO branches\n`);

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
  // 3. CREATE BRANCH USERS (18 branches × varied staff)
  // ========================================
  console.log("🏢 Creating branch users...");

  const branchUserData: any[] = [];

  // For each branch, create staff: 1 supervisor, 2-3 baristas, 1-2 stajyer
  branches.forEach((branch, branchIndex) => {
    const branchPrefix = branch.name.toLowerCase().replace(/\s+/g, '-');
    
    // 1 Supervisor
    branchUserData.push({
      username: `${branchPrefix}-supervisor`,
      hashedPassword,
      email: `${branchPrefix}.supervisor@dospresso.com`,
      firstName: getSupervisorName(branchIndex),
      lastName: getBranchLastName(branchIndex),
      role: schema.UserRole.SUPERVISOR,
      branchId: branch.id,
      hireDate: new Date(2024, 0, 1 + branchIndex).toISOString().split('T')[0],
      probationEndDate: null,
    });

    // 2-3 Baristas (alternating between 2 and 3)
    const baristaCount = branchIndex % 2 === 0 ? 3 : 2;
    for (let i = 0; i < baristaCount; i++) {
      branchUserData.push({
        username: `${branchPrefix}-barista${i + 1}`,
        hashedPassword,
        email: `${branchPrefix}.barista${i + 1}@dospresso.com`,
        firstName: getBaristaName(branchIndex + i),
        lastName: getBranchLastName(branchIndex),
        role: schema.UserRole.BARISTA,
        branchId: branch.id,
        hireDate: new Date(2024, 2, 1 + branchIndex + i * 5).toISOString().split('T')[0],
        probationEndDate: null,
      });
    }

    // 1-2 Stajyer (alternating between 1 and 2)
    const stajyerCount = branchIndex % 3 === 0 ? 2 : 1;
    for (let i = 0; i < stajyerCount; i++) {
      branchUserData.push({
        username: `${branchPrefix}-stajyer${i + 1}`,
        hashedPassword,
        email: `${branchPrefix}.stajyer${i + 1}@dospresso.com`,
        firstName: getStajyerName(branchIndex + i),
        lastName: getBranchLastName(branchIndex),
        role: schema.UserRole.STAJYER,
        branchId: branch.id,
        hireDate: new Date(2024, 10, 1 + branchIndex + i * 3).toISOString().split('T')[0],
        probationEndDate: new Date(2025, 4, 1).toISOString().split('T')[0], // Probation ends May 2025
      });
    }
  });

  const branchUsers = await db.insert(schema.users).values(branchUserData).returning();
  console.log(`✅ Created ${branchUsers.length} branch users across 18 branches\n`);

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
  for (const branch of branches) {
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
  // 8. CREATE EQUIPMENT (Core items per branch)
  // ========================================
  console.log("⚙️ Creating equipment...");

  const equipmentData: typeof schema.equipment.$inferInsert[] = [];

  // For each branch, create 2-3 core equipment items
  branches.forEach((branch, branchIndex) => {
    const purchaseDateOffset = branchIndex * 15; // Stagger purchase dates
    const purchaseDate = new Date(2023, 0, 1 + purchaseDateOffset);
    const warrantyEndDate = new Date(2026, 0, 1 + purchaseDateOffset);

    // 1. Espresso Machine (all branches)
    const espressoBrand = branchIndex % 3 === 0 ? "La Marzocco" : branchIndex % 3 === 1 ? "Nuova Simonelli" : "Rancilio";
    const espressoModel = branchIndex % 3 === 0 ? "Linea PB" : branchIndex % 3 === 1 ? "Aurelia II" : "Classe 9";
    const cityPrefix = branch.city ? branch.city.substring(0, 3).toUpperCase() : "XXX";
    
    equipmentData.push({
      branchId: branch.id,
      equipmentType: "Espresso Makinesi",
      serialNumber: `ESP-${cityPrefix}-${branchIndex + 1}`,
      purchaseDate: purchaseDate.toISOString().split('T')[0],
      warrantyEndDate: warrantyEndDate.toISOString().split('T')[0],
      maintenanceIntervalDays: 30, // Every 30 days
      nextMaintenanceDate: new Date(Date.now() + (branchIndex % 5 + 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5-10 days from now
      maintenanceResponsible: "hq",
      isActive: true,
      notes: `${espressoBrand} ${espressoModel} - Ana espresso makinesi - günlük temizlik gerektirir`,
    });

    // 2. Coffee Grinder (all branches)
    const grinderBrand = branchIndex % 2 === 0 ? "Mazzer" : "Eureka";
    const grinderModel = branchIndex % 2 === 0 ? "Super Jolly" : "Atom 75";
    
    equipmentData.push({
      branchId: branch.id,
      equipmentType: "Kahve Değirmeni",
      serialNumber: `GRN-${cityPrefix}-${branchIndex + 1}`,
      purchaseDate: purchaseDate.toISOString().split('T')[0],
      warrantyEndDate: new Date(2025, 0, 1 + purchaseDateOffset).toISOString().split('T')[0],
      maintenanceIntervalDays: 60, // Every 60 days
      nextMaintenanceDate: new Date(Date.now() + (branchIndex % 10 + 20) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20-30 days from now
      maintenanceResponsible: "branch",
      isActive: true,
      notes: `${grinderBrand} ${grinderModel} - Ana değirmen - ayda bir kez kalibre edilmeli`,
    });

    // 3. Refrigerator (larger branches only)
    if (branchIndex % 2 === 0) {
      equipmentData.push({
        branchId: branch.id,
        equipmentType: "Buzdolabı",
        serialNumber: `FRG-${cityPrefix}-${branchIndex + 1}`,
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        warrantyEndDate: new Date(2025, 0, 1 + purchaseDateOffset).toISOString().split('T')[0],
        maintenanceIntervalDays: 90, // Every 90 days
        nextMaintenanceDate: new Date(Date.now() + (branchIndex % 15 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30-45 days from now
        maintenanceResponsible: "branch",
        isActive: true,
        notes: "Vestel NFK540 E - Süt ve malzeme depolama",
      });
    }
  });

  const insertedEquipment = await db.insert(schema.equipment).values(equipmentData).returning();
  console.log(`✅ Created ${insertedEquipment.length} equipment items\n`);

  // ========================================
  // 9. CREATE SAMPLE EQUIPMENT FAULTS (for testing)
  // ========================================
  console.log("🔧 Creating sample equipment faults...");

  const sampleFaults: typeof schema.equipmentFaults.$inferInsert[] = [];

  // Create 2-3 sample faults
  if (insertedEquipment.length > 0) {
    const firstEspresso = insertedEquipment.find(e => e.equipmentType === "Espresso Makinesi");
    const firstGrinder = insertedEquipment.find(e => e.equipmentType === "Kahve Değirmeni");

    if (firstEspresso) {
      const supervisor = branchUsers.find(u => u.branchId === firstEspresso.branchId && u.role === schema.UserRole.SUPERVISOR);
      if (supervisor) {
        sampleFaults.push({
          branchId: firstEspresso.branchId,
          equipmentId: firstEspresso.id,
          reportedById: supervisor.id,
          equipmentName: `${firstEspresso.equipmentType} - ${firstEspresso.serialNumber}`,
          description: "Espresso makinesi basınç problemi yaşıyor. Kahve akışı normalden daha yavaş.",
          aiSeverity: "medium",
          status: "acik",
          priorityLevel: schema.PRIORITY_LEVELS.YELLOW,
          currentStage: schema.FAULT_STAGES.BEKLIYOR,
        });
      }
    }

    if (firstGrinder) {
      const barista = branchUsers.find(u => u.branchId === firstGrinder.branchId && u.role === schema.UserRole.BARISTA);
      if (barista) {
        sampleFaults.push({
          branchId: firstGrinder.branchId,
          equipmentId: firstGrinder.id,
          reportedById: barista.id,
          equipmentName: `${firstGrinder.equipmentType} - ${firstGrinder.serialNumber}`,
          description: "Değirmen sesli çalışıyor, taş sesi geliyor. Kalibrasyon gerekebilir.",
          aiSeverity: "low",
          status: "acik",
          priorityLevel: schema.PRIORITY_LEVELS.GREEN,
          currentStage: schema.FAULT_STAGES.BEKLIYOR,
        });
      }
    }
  }

  if (sampleFaults.length > 0) {
    await db.insert(schema.equipmentFaults).values(sampleFaults);
    console.log(`✅ Created ${sampleFaults.length} sample equipment faults\n`);
  }

  // ========================================
  // 10. SUMMARY
  // ========================================
  console.log("\n🎉 Demo data seed completed!\n");
  console.log("📊 Summary:");
  console.log(`   - Branches: ${branches.length} (Real DOSPRESSO locations)`);
  console.log(`   - HQ Users: ${hqUsers.length}`);
  console.log(`   - Branch Users: ${branchUsers.length}`);
  console.log(`   - Total Users: ${hqUsers.length + branchUsers.length}`);
  console.log(`   - Equipment: ${insertedEquipment.length} (espresso machines, grinders, fridges)`);
  console.log(`   - Equipment Faults: ${sampleFaults.length}`);
  console.log(`   - Checklists: 3`);
  console.log(`   - Tasks: ${sampleTasks.length}`);
  console.log(`   - Knowledge Base Articles: ${articles.length}\n`);
  
  console.log("🔑 Login credentials:");
  console.log("   Username: admin | Password: 0000");
  console.log("   Username: coach | Password: 0000");
  console.log("   Username: teknik | Password: 0000");
  console.log("   Username: antalya-işıklar-supervisor | Password: 0000");
  console.log("   Username: gaziantep-ibrahimli-supervisor | Password: 0000");
  console.log("   ...and all other users with password: 0000\n");

  await pool.end();
}

// Helper functions for name generation
function getSupervisorName(index: number): string {
  const names = [
    "Ahmet", "Mehmet", "Ali", "Mustafa", "Hasan",
    "Ayşe", "Fatma", "Elif", "Zeynep", "Selin",
    "Can", "Emre", "Burak", "Murat", "Deniz",
    "Esra", "Gül", "Sevgi", "Hakan"
  ];
  return names[index % names.length];
}

function getBaristaName(index: number): string {
  const names = [
    "Furkan", "Cem", "Ömer", "Yusuf", "İbrahim",
    "Merve", "Simge", "Dilara", "Beyza", "Ecrin",
    "Berkay", "Kaan", "Enes", "Oğuz", "Serkan",
    "Gizem", "Damla", "Ebru", "Tuba", "İrem",
    "Bora", "Barış", "Taner", "Koray"
  ];
  return names[index % names.length];
}

function getStajyerName(index: number): string {
  const names = [
    "Kerem", "Arda", "Doruk", "Emir", "Berat",
    "Defne", "Ela", "Mira", "Zehra", "Nehir",
    "Kuzey", "Atlas", "Çınar", "Alp", "Ege",
    "Azra", "Lara", "Derin", "Aslı", "Pelin"
  ];
  return names[index % names.length];
}

function getBranchLastName(branchIndex: number): string {
  const lastNames = [
    "Yılmaz", "Demir", "Şahin", "Kaya", "Arslan",
    "Yıldız", "Öztürk", "Aydın", "Çelik", "Kurt",
    "Koç", "Erdoğan", "Yaman", "Polat", "Acar",
    "Yavuz", "Kaplan", "Taş"
  ];
  return lastNames[branchIndex % lastNames.length];
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
