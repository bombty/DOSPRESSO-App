import { storage } from "./storage";
import { EQUIPMENT_TYPES, EQUIPMENT_METADATA, type EquipmentType } from "@shared/schema";
import type { InsertUser } from "@shared/schema";

/**
 * Seed equipment for all existing branches (idempotent)
 * Creates 8 equipment types per branch if they don't already exist
 */
export async function seedEquipmentForBranches() {
  const branches = await storage.getBranches();
  const equipmentTypes = Object.values(EQUIPMENT_TYPES) as EquipmentType[];
  
  let created = 0;
  let skipped = 0;
  
  // Purchase date: 1 year ago
  const purchaseDateMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const purchaseDate = new Date(purchaseDateMs).toISOString().split('T')[0];
  // Warranty: 2 years from purchase
  const warrantyEndDate = new Date(purchaseDateMs + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  for (const branch of branches) {
    // Check existing equipment for this branch
    const allEquipment = await storage.getEquipment();
    const existing = allEquipment.filter((e: any) => e.branchId === branch.id);
    const existingTypes = new Set(existing.map((e: any) => e.equipmentType));
    
    for (const type of equipmentTypes) {
      // Skip if this type already exists for this branch
      if (existingTypes.has(type)) {
        skipped++;
        continue;
      }
      
      const metadata = EQUIPMENT_METADATA[type];
      
      // Calculate next maintenance date based on purchase date + interval
      const nextMaintenanceDate = new Date(purchaseDateMs + metadata.maintenanceInterval * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      
      try {
        await storage.createEquipment({
          branchId: branch.id,
          equipmentType: type,
          serialNumber: `${type.toUpperCase()}-${branch.id.toString().padStart(3, '0')}-001`,
          purchaseDate,
          warrantyEndDate,
          maintenanceResponsible: metadata.maintenanceResponsible,
          faultProtocol: metadata.faultProtocol,
          maintenanceIntervalDays: metadata.maintenanceInterval,
          nextMaintenanceDate,
          notes: `${metadata.nameTr} - ${branch.name}`,
          isActive: true,
        });
        created++;
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          skipped++;
        } else {
          throw error;
        }
      }
    }
  }
  
  return { created, skipped, branches: branches.length };
}

/**
 * Seed baseline training modules (idempotent)
 * Creates essential training modules if they don't exist
 */
export async function seedTrainingModules(adminUserId: string) {
  const modules = await storage.getTrainingModules();
  const existingTitles = new Set(modules.map(m => m.title));
  
  const baselineModules = [
    // Stajyer (S1-S6)
    { moduleId: "S1", title: "DOSPRESSO Kültürü ve Disiplin Code", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "culture", level: "beginner", isPublished: true },
    { moduleId: "S2", title: "Dress Code ve Kişisel Bakım", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "hygiene", level: "beginner", isPublished: true },
    { moduleId: "S3", title: "Vardiya, Mola ve İzin Prosedürü", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "hr", level: "beginner", isPublished: true },
    { moduleId: "S4", title: "Misafir Karşılama Temelleri", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "customer", level: "beginner", isPublished: true },
    { moduleId: "S5", title: "Güvenlik ve Soygun Protokolü", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "security", level: "beginner", isPublished: true },
    { moduleId: "S6", title: "Şube Alanları ve Sorumluluk Zonları", roleId: "stajyer", roleLevel: 1, estimatedDuration: 10, category: "operations", level: "beginner", isPublished: true },
    // Bar Buddy (BB1-BB6)
    { moduleId: "BB1", title: "Coffee Station Temelleri", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 12, category: "coffee", level: "beginner", isPublished: true },
    { moduleId: "BB2", title: "POS ve Sipariş Yönetimi", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 10, category: "operations", level: "beginner", isPublished: true },
    { moduleId: "BB3", title: "Bar Temizliği ve HACCP Giriş", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 10, category: "hygiene", level: "beginner", isPublished: true },
    { moduleId: "BB4", title: "Donut Sunum ve Tazelik Kontrol", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 10, category: "food", level: "beginner", isPublished: true },
    { moduleId: "BB5", title: "Freshess Station Şurup ve Bardak Çizgisi Kalibrasyonu", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 10, category: "beverages", level: "beginner", isPublished: true },
    { moduleId: "BB6", title: "Müşteri Memnuniyeti Temelleri", roleId: "bar_buddy", roleLevel: 2, estimatedDuration: 10, category: "customer", level: "beginner", isPublished: true },
    // Barista (B1-B6)
    { moduleId: "B1", title: "Espresso Makinesi Kalibrasyon Master", roleId: "barista", roleLevel: 3, estimatedDuration: 15, category: "coffee", level: "intermediate", isPublished: true },
    { moduleId: "B2", title: "Süt Buhar Çubuğu ve Latte Milk Tekstürü", roleId: "barista", roleLevel: 3, estimatedDuration: 12, category: "coffee", level: "intermediate", isPublished: true },
    { moduleId: "B3", title: "Makine Gün Sonu Temizliği ve Kimyasal Kullanımı", roleId: "barista", roleLevel: 3, estimatedDuration: 12, category: "maintenance", level: "intermediate", isPublished: true },
    { moduleId: "B4", title: "Filter Coffee Pro – BUNN ICBA", roleId: "barista", roleLevel: 3, estimatedDuration: 10, category: "coffee", level: "intermediate", isPublished: true },
    { moduleId: "B5", title: "Donut Production Standard – Glaze & Dekor", roleId: "barista", roleLevel: 3, estimatedDuration: 12, category: "food", level: "intermediate", isPublished: true },
    { moduleId: "B6", title: "Speed & Workflow Optimization", roleId: "barista", roleLevel: 3, estimatedDuration: 12, category: "operations", level: "intermediate", isPublished: true },
    // Supervisor Buddy (SB1-SB5)
    { moduleId: "SB1", title: "Opening & Closing Yönetimi", roleId: "supervisor_buddy", roleLevel: 4, estimatedDuration: 12, category: "management", level: "advanced", isPublished: true },
    { moduleId: "SB2", title: "Envanter – Fire – COGS Temelleri", roleId: "supervisor_buddy", roleLevel: 4, estimatedDuration: 12, category: "finance", level: "advanced", isPublished: true },
    { moduleId: "SB3", title: "Eğitim Koçluğu – Stajyer & Bar Buddy Gelişimi", roleId: "supervisor_buddy", roleLevel: 4, estimatedDuration: 12, category: "coaching", level: "advanced", isPublished: true },
    { moduleId: "SB4", title: "Hijyen ve HACCP Uygulamaları", roleId: "supervisor_buddy", roleLevel: 4, estimatedDuration: 12, category: "hygiene", level: "advanced", isPublished: true },
    { moduleId: "SB5", title: "Performans Gözlemi ve Geri Bildirim", roleId: "supervisor_buddy", roleLevel: 4, estimatedDuration: 10, category: "management", level: "advanced", isPublished: true },
    // Supervisor (SP1-SP6)
    { moduleId: "SP1", title: "Operasyon Yönetimi ve KPI'lar", roleId: "supervisor", roleLevel: 5, estimatedDuration: 15, category: "management", level: "advanced", isPublished: true },
    { moduleId: "SP2", title: "İş Güvenliği ve Disiplin Uygulamaları", roleId: "supervisor", roleLevel: 5, estimatedDuration: 15, category: "security", level: "advanced", isPublished: true },
    { moduleId: "SP3", title: "Marka Bütünlüğü ve Audit Yönetimi", roleId: "supervisor", roleLevel: 5, estimatedDuration: 12, category: "compliance", level: "advanced", isPublished: true },
    { moduleId: "SP4", title: "Satış Artırma ve Kampanya Yönetimi", roleId: "supervisor", roleLevel: 5, estimatedDuration: 12, category: "sales", level: "advanced", isPublished: true },
    { moduleId: "SP5", title: "Kriz ve Teknik Arıza Yönetimi", roleId: "supervisor", roleLevel: 5, estimatedDuration: 12, category: "crisis", level: "advanced", isPublished: true },
    { moduleId: "SP6", title: "Bölge ve HQ ile Raporlama", roleId: "supervisor", roleLevel: 5, estimatedDuration: 10, category: "reporting", level: "advanced", isPublished: true },
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const moduleData of baselineModules) {
    if (existingTitles.has(moduleData.title)) {
      skipped++;
      continue;
    }
    
    const fullModule = {
      ...moduleData,
      description: moduleData.title,
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
      steps: [],
      scenarioTasks: [],
      supervisorChecklist: [],
      quiz: [],
      learningObjectives: [],
    };
    
    await storage.createTrainingModule(fullModule);
    created++;
  }
  
  return { created, skipped };
}

/**
 * Seed sample personnel for all existing branches (idempotent)
 * Creates supervisor(1) + barista(2) + stajyer(1) per branch = 4 employees per branch
 */
export async function seedBranchPersonnel(hashedPassword: string) {
  const branches = await storage.getBranches();
  
  let created = 0;
  let skipped = 0;
  
  // Turkish first names pool
  const firstNames = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Zeynep", "Mustafa", "Elif", "Hüseyin", "Hatice", "Can", "Selin", "Emre", "Deniz", "Burak", "Esra"];
  // Turkish last names pool
  const lastNames = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Aydın", "Arslan", "Polat", "Koç", "Kurt", "Erdoğan", "Taş", "Yavuz"];
  
  for (const branch of branches) {
    // Check existing users for this branch
    const allUsers = await storage.getAllEmployees();
    const existingUsers = allUsers.filter((u: any) => u.branchId === branch.id);
    const existingRoles = new Set(existingUsers.map((u: any) => u.role));
    
    // Generate branch-specific username suffix (city-based)
    const branchSuffix = (branch.city || 'unknown').toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/\s+/g, '');
    
    // 1. Supervisor (1 per branch)
    const supervisorUsername = `supervisor_${branchSuffix}`;
    const existingSupervisor = existingUsers.find((u: any) => u.username === supervisorUsername);
    
    if (!existingSupervisor) {
      try {
        const firstName = firstNames[branch.id % firstNames.length];
        const lastName = lastNames[(branch.id + 1) % lastNames.length];
        
        await storage.createUser({
          username: supervisorUsername,
          email: `supervisor@${branchSuffix}.dospresso.com`,
          hashedPassword: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          role: "supervisor",
          branchId: branch.id,
          phoneNumber: `05${(20 + branch.id).toString().padStart(2, '0')} ${(100 + branch.id).toString()} ${(1000 + branch.id).toString()}`,
          hireDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
          probationEndDate: new Date(Date.now() - 275 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Completed
          isActive: true,
        });
        created++;
      } catch (error: Error | unknown) {
        if (error.code === '23505') { // Unique constraint violation
          skipped++;
        } else {
          throw error;
        }
      }
    } else {
      skipped++;
    }
    
    // 2. Barista (2 per branch)
    for (let i = 1; i <= 2; i++) {
      const roleKey = `barista_${i}`;
      const firstName = firstNames[(branch.id * 2 + i) % firstNames.length];
      const lastName = lastNames[(branch.id * 2 + i + 2) % lastNames.length];
      
      // Check if this specific barista already exists (by username pattern)
      const baristaUsername = `barista${i}_${branchSuffix}`;
      const existingBarista = existingUsers.find((u: any) => u.username === baristaUsername);
      if (existingBarista) {
        skipped++;
        continue;
      }
      
      try {
        await storage.createUser({
          username: baristaUsername,
          email: `barista${i}@${branchSuffix}.dospresso.com`,
          hashedPassword: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          role: "barista",
          branchId: branch.id,
          phoneNumber: `05${(30 + branch.id).toString().padStart(2, '0')} ${(200 + branch.id * 2 + i).toString()} ${(2000 + branch.id * 2 + i).toString()}`,
          hireDate: new Date(Date.now() - (180 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          probationEndDate: new Date(Date.now() - (90 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isActive: true,
        });
        created++;
      } catch (error: Error | unknown) {
        if (error.code === '23505') { // Unique constraint violation
          skipped++;
        } else {
          throw error;
        }
      }
    }
    
    // 3. Stajyer (1 per branch - in probation)
    const stajyerUsername = `stajyer_${branchSuffix}`;
    const existingStajyer = existingUsers.find((u: any) => u.username === stajyerUsername);
    if (!existingStajyer) {
      try {
        const firstName = firstNames[(branch.id * 3) % firstNames.length];
        const lastName = lastNames[(branch.id * 3 + 1) % lastNames.length];
        
        await storage.createUser({
          username: stajyerUsername,
          email: `stajyer@${branchSuffix}.dospresso.com`,
          hashedPassword: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          role: "stajyer",
          branchId: branch.id,
          phoneNumber: `05${(40 + branch.id).toString().padStart(2, '0')} ${(300 + branch.id).toString()} ${(3000 + branch.id).toString()}`,
          hireDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days ago
          probationEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
          isActive: true,
        });
        created++;
      } catch (error: Error | unknown) {
        if (error.code === '23505') { // Unique constraint violation
          skipped++;
        } else {
          throw error;
        }
      }
    } else {
      skipped++;
    }
  }
  
  return { created, skipped, branches: branches.length };
}
