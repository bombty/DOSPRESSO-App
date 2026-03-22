import { db } from "./db";
import { roleTemplates } from "@shared/schema";

interface RoleTemplateData {
  name: string;
  displayName: string;
  description: string;
  domain: string;
  baseRole: string;
  permissions: Record<string, string[]>;
  isDefault: boolean;
}

const defaultRoleTemplates: RoleTemplateData[] = [
  // HQ Roles
  {
    name: "hq_admin",
    displayName: "HQ Yönetici",
    description: "Merkez genel yönetim - tüm modüllere tam erişim",
    domain: "hq",
    baseRole: "admin",
    permissions: {
      dashboard: ["view", "edit"],
      branches: ["view", "edit"],
      users: ["view", "edit"],
      reports: ["view", "edit"],
      finance: ["view", "edit"],
      settings: ["view", "edit"],
      factory: ["view", "edit"],
      academy: ["view", "edit"],
      quality: ["view", "edit"],
      support: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "hq_coach",
    displayName: "HQ Koç",
    description: "Şube denetimi ve eğitim sorumlusu",
    domain: "hq",
    baseRole: "coach",
    permissions: {
      dashboard: ["view"],
      branches: ["view", "edit"],
      users: ["view"],
      reports: ["view"],
      academy: ["view", "edit"],
      quality: ["view", "edit"],
      support: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "hq_finance",
    displayName: "HQ Muhasebe",
    description: "Finansal işlemler ve raporlama sorumlusu",
    domain: "hq",
    baseRole: "muhasebe",
    permissions: {
      dashboard: ["view"],
      finance: ["view", "edit"],
      reports: ["view"],
    },
    isDefault: true,
  },
  
  // Factory Roles
  {
    name: "factory_manager",
    displayName: "Fabrika Müdürü",
    description: "Fabrika genel yönetimi ve üretim planlama",
    domain: "factory",
    baseRole: "fabrika_mudur",
    permissions: {
      factory_dashboard: ["view", "edit"],
      factory_products: ["view", "edit"],
      factory_batches: ["view", "edit"],
      factory_orders: ["view", "edit"],
      factory_inventory: ["view", "edit"],
      factory_reports: ["view", "edit"],
      factory_staff: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "factory_production",
    displayName: "Üretim Sorumlusu",
    description: "Üretim partileri ve kalite kontrol",
    domain: "factory",
    baseRole: "fabrika_uretim",
    permissions: {
      factory_dashboard: ["view"],
      factory_products: ["view"],
      factory_batches: ["view", "edit"],
      factory_inventory: ["view"],
      factory_reports: ["view"],
    },
    isDefault: true,
  },
  {
    name: "factory_quality",
    displayName: "Kalite Kontrol",
    description: "Ürün kalite kontrolü ve onaylama",
    domain: "factory",
    baseRole: "fabrika_kalite",
    permissions: {
      factory_dashboard: ["view"],
      factory_products: ["view"],
      factory_batches: ["view", "edit"],
      factory_reports: ["view"],
    },
    isDefault: true,
  },
  {
    name: "factory_logistics",
    displayName: "Lojistik Sorumlusu",
    description: "Sipariş hazırlama ve sevkiyat",
    domain: "factory",
    baseRole: "fabrika_lojistik",
    permissions: {
      factory_dashboard: ["view"],
      factory_orders: ["view", "edit"],
      factory_inventory: ["view"],
    },
    isDefault: true,
  },
  {
    name: "factory_inventory",
    displayName: "Depo Sorumlusu",
    description: "Stok takibi ve envanter yönetimi",
    domain: "factory",
    baseRole: "fabrika_depo",
    permissions: {
      factory_dashboard: ["view"],
      factory_products: ["view"],
      factory_inventory: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "factory_worker",
    displayName: "Fabrika İşçisi",
    description: "Temel üretim operasyonları",
    domain: "factory",
    baseRole: "fabrika_isci",
    permissions: {
      factory_dashboard: ["view"],
      factory_batches: ["view"],
    },
    isDefault: true,
  },
  
  // Branch Roles
  {
    name: "branch_manager",
    displayName: "Şube Müdürü",
    description: "Şube genel yönetimi ve tüm operasyonlar",
    domain: "branch",
    baseRole: "supervisor",
    permissions: {
      branch_dashboard: ["view", "edit"],
      branch_staff: ["view", "edit"],
      branch_shifts: ["view", "edit"],
      branch_tasks: ["view", "edit"],
      branch_checklists: ["view", "edit"],
      branch_inventory: ["view", "edit"],
      branch_orders: ["view", "edit"],
      branch_reports: ["view", "edit"],
      branch_faults: ["view", "edit"],
      branch_equipment: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "branch_shift_leader",
    displayName: "Vardiya Lideri",
    description: "Vardiya yönetimi ve personel koordinasyonu",
    domain: "branch",
    baseRole: "vardiya_lideri",
    permissions: {
      branch_dashboard: ["view"],
      branch_staff: ["view"],
      branch_shifts: ["view", "edit"],
      branch_tasks: ["view", "edit"],
      branch_checklists: ["view", "edit"],
      branch_faults: ["view", "edit"],
    },
    isDefault: true,
  },
  {
    name: "branch_barista",
    displayName: "Barista",
    description: "Kahve hazırlama ve müşteri hizmeti",
    domain: "branch",
    baseRole: "barista",
    permissions: {
      branch_dashboard: ["view"],
      branch_tasks: ["view"],
      branch_checklists: ["view"],
      branch_faults: ["view"],
    },
    isDefault: true,
  },
  {
    name: "branch_trainee",
    displayName: "Stajyer",
    description: "Eğitim aşamasındaki yeni personel",
    domain: "branch",
    baseRole: "stajer",
    permissions: {
      branch_dashboard: ["view"],
      branch_tasks: ["view"],
      branch_checklists: ["view"],
    },
    isDefault: true,
  },
  {
    name: "branch_cashier",
    displayName: "Kasiyer",
    description: "Kasa işlemleri ve ödeme",
    domain: "branch",
    baseRole: "kasiyer",
    permissions: {
      branch_dashboard: ["view"],
      branch_tasks: ["view"],
      branch_checklists: ["view"],
    },
    isDefault: true,
  },
  {
    name: "branch_kitchen",
    displayName: "Mutfak",
    description: "Yemek hazırlama ve tatlı üretimi",
    domain: "branch",
    baseRole: "mutfak",
    permissions: {
      branch_dashboard: ["view"],
      branch_tasks: ["view"],
      branch_checklists: ["view"],
      branch_inventory: ["view"],
    },
    isDefault: true,
  },
  {
    name: "branch_cleaner",
    displayName: "Temizlik Personeli",
    description: "Temizlik ve hijyen görevleri",
    domain: "branch",
    baseRole: "temizlik",
    permissions: {
      branch_dashboard: ["view"],
      branch_tasks: ["view"],
      branch_checklists: ["view"],
    },
    isDefault: true,
  },
  {
    name: "branch_inventory",
    displayName: "Depo Sorumlusu",
    description: "Şube stok takibi ve sipariş",
    domain: "branch",
    baseRole: "depo",
    permissions: {
      branch_dashboard: ["view"],
      branch_inventory: ["view", "edit"],
      branch_orders: ["view", "edit"],
    },
    isDefault: true,
  },
];

export async function seedRoleTemplates(): Promise<void> {
  console.log("🌱 Starting role templates seed...");
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const template of defaultRoleTemplates) {
    try {
      await db.insert(roleTemplates).values({
        name: template.name,
        displayName: template.displayName,
        description: template.description,
        domain: template.domain,
        baseRole: template.baseRole,
        permissions: template.permissions,
        isDefault: template.isDefault,
        isActive: true,
      }).onConflictDoNothing();
      
      insertedCount++;
    } catch (error: unknown) {
      if (error.code === '23505') {
        skippedCount++;
      } else {
        console.error(`Error inserting role template ${template.name}:`, error);
      }
    }
  }
  
  console.log(`✅ Role templates seed completed:`);
  console.log(`   - Inserted: ${insertedCount} templates`);
  console.log(`   - Skipped: ${skippedCount} existing templates`);
  console.log(`   - Total: ${defaultRoleTemplates.length} default templates`);
}
