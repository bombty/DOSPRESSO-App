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
      
      await storage.createEquipment({
        branchId: branch.id,
        equipmentType: type,
        serialNumber: `${type.toUpperCase()}-B${branch.id}-${Date.now()}`,
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
    {
      title: "DOSPRESSO'ya Hoş Geldiniz",
      description: "DOSPRESSO kültürü, değerler ve temel bilgiler",
      category: "onboarding",
      level: "beginner",
      estimatedDuration: 30,
      isPublished: true,
      requiredForRole: ["barista", "stajyer", "supervisor"],
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
    },
    {
      title: "Barista Temel Eğitimi",
      description: "Espresso hazırlama, süt köpürtme ve kahve sunumu",
      category: "barista",
      level: "beginner",
      estimatedDuration: 120,
      isPublished: true,
      requiredForRole: ["barista", "stajyer"],
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
    },
    {
      title: "Hijyen ve Gıda Güvenliği",
      description: "Temizlik standartları, gıda güvenliği ve kişisel hijyen",
      category: "hygiene",
      level: "beginner",
      estimatedDuration: 45,
      isPublished: true,
      requiredForRole: ["barista", "stajyer", "supervisor"],
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
    },
    {
      title: "Müşteri İlişkileri ve İletişim",
      description: "Müşteri memnuniyeti, iletişim becerileri ve sorun çözme",
      category: "customer_service",
      level: "beginner",
      estimatedDuration: 60,
      isPublished: true,
      requiredForRole: ["barista", "supervisor"],
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
    },
    {
      title: "Supervisor Liderlik Eğitimi",
      description: "Ekip yönetimi, performans takibi ve liderlik becerileri",
      category: "management",
      level: "intermediate",
      estimatedDuration: 90,
      isPublished: true,
      requiredForRole: ["supervisor"],
      prerequisiteModuleIds: [],
      createdBy: adminUserId,
    },
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const moduleData of baselineModules) {
    if (existingTitles.has(moduleData.title)) {
      skipped++;
      continue;
    }
    
    await storage.createTrainingModule(moduleData);
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
    const allUsers = await storage.getUsers();
    const existingUsers = allUsers.filter((u: any) => u.branchId === branch.id);
    const existingRoles = new Set(existingUsers.map((u: any) => u.role));
    
    // Generate branch-specific username suffix (city-based)
    const branchSuffix = (branch.city || 'unknown').toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/\s+/g, '');
    
    // 1. Supervisor (1 per branch)
    if (!existingRoles.has('supervisor')) {
      const firstName = firstNames[branch.id % firstNames.length];
      const lastName = lastNames[(branch.id + 1) % lastNames.length];
      
      await storage.createUser({
        username: `supervisor_${branchSuffix}`,
        email: `supervisor@${branchSuffix}.dospresso.com`,
        hashedPassword: hashedPassword,
        fullName: `${firstName} ${lastName}`,
        role: "supervisor",
        branchId: branch.id,
        phoneNumber: `05${(20 + branch.id).toString().padStart(2, '0')} ${(100 + branch.id).toString()} ${(1000 + branch.id).toString()}`,
        hireDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
        probationEndDate: new Date(Date.now() - 275 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Completed
        isActive: true,
      });
      created++;
    } else {
      skipped++;
    }
    
    // 2. Barista (2 per branch)
    for (let i = 1; i <= 2; i++) {
      const roleKey = `barista_${i}`;
      const firstName = firstNames[(branch.id * 2 + i) % firstNames.length];
      const lastName = lastNames[(branch.id * 2 + i + 2) % lastNames.length];
      
      // Check if this specific barista already exists (by username pattern)
      const existingBarista = existingUsers.find((u: any) => u.username === `barista${i}_${branchSuffix}`);
      if (existingBarista) {
        skipped++;
        continue;
      }
      
      await storage.createUser({
        username: `barista${i}_${branchSuffix}`,
        email: `barista${i}@${branchSuffix}.dospresso.com`,
        hashedPassword: hashedPassword,
        fullName: `${firstName} ${lastName}`,
        role: "barista",
        branchId: branch.id,
        phoneNumber: `05${(30 + branch.id).toString().padStart(2, '0')} ${(200 + branch.id * 2 + i).toString()} ${(2000 + branch.id * 2 + i).toString()}`,
        hireDate: new Date(Date.now() - (180 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        probationEndDate: new Date(Date.now() - (90 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
      created++;
    }
    
    // 3. Stajyer (1 per branch - in probation)
    const existingStajyer = existingUsers.find((u: any) => u.username === `stajyer_${branchSuffix}`);
    if (!existingStajyer) {
      const firstName = firstNames[(branch.id * 3) % firstNames.length];
      const lastName = lastNames[(branch.id * 3 + 1) % lastNames.length];
      
      await storage.createUser({
        username: `stajyer_${branchSuffix}`,
        email: `stajyer@${branchSuffix}.dospresso.com`,
        hashedPassword: hashedPassword,
        fullName: `${firstName} ${lastName}`,
        role: "stajyer",
        branchId: branch.id,
        phoneNumber: `05${(40 + branch.id).toString().padStart(2, '0')} ${(300 + branch.id).toString()} ${(3000 + branch.id).toString()}`,
        hireDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days ago
        probationEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
        isActive: true,
      });
      created++;
    } else {
      skipped++;
    }
  }
  
  return { created, skipped, branches: branches.length };
}
