import { storage } from "./storage";
import { EQUIPMENT_TYPES, EQUIPMENT_METADATA, type EquipmentType } from "@shared/schema";

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
    const existing = await storage.getEquipmentByBranch(branch.id);
    const existingTypes = new Set(existing.map(e => e.equipmentType));
    
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
