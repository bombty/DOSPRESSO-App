import { db } from './db';
import { roles } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SYSTEM_ROLES = [
  { name: "admin", displayName: "Sistem Yöneticisi", description: "Tam yetki, tüm modüllere erişim" },
  { name: "ceo", displayName: "CEO", description: "Üst düzey yönetici, AI Kontrol Merkezi erişimi" },
  { name: "cgo", displayName: "CGO", description: "Chief Growth Officer, operasyon sorumlusu" },
  { name: "muhasebe_ik", displayName: "Muhasebe & İK", description: "Muhasebe ve insan kaynakları yönetimi" },
  { name: "satinalma", displayName: "Satınalma", description: "Satın alma ve tedarik yönetimi" },
  { name: "coach", displayName: "Coach", description: "Şube performans ve personel gelişimi" },
  { name: "marketing", displayName: "Pazarlama", description: "Pazarlama ve grafik tasarım" },
  { name: "trainer", displayName: "Trainer", description: "Eğitim ve reçete sorumlusu" },
  { name: "kalite_kontrol", displayName: "Kalite Kontrol", description: "Fabrika kalite ve geri bildirim" },
  { name: "gida_muhendisi", displayName: "Gıda Mühendisi", description: "Gıda güvenliği ve kalite kontrol" },
  { name: "fabrika_mudur", displayName: "Fabrika Müdürü", description: "Fabrika üretim ve stok yönetimi" },
  { name: "mudur", displayName: "Şube Müdürü", description: "Şube genel yönetimi" },
  { name: "supervisor", displayName: "Supervisor", description: "Vardiya ve ekip yönetimi" },
  { name: "barista", displayName: "Barista", description: "İçecek hazırlama ve müşteri hizmeti" },
  { name: "stajyer", displayName: "Stajyer", description: "Eğitim aşamasında personel" },
  { name: "bar_buddy", displayName: "Bar Buddy", description: "Barista yardımcısı" },
  { name: "supervisor_buddy", displayName: "Supervisor Buddy", description: "Supervisor yardımcısı" },
  { name: "yatirimci_branch", displayName: "Şube Yatırımcısı", description: "Şube yatırımcısı, salt okuma erişimi" },
  { name: "uretim_sefi", displayName: "Üretim Şefi", description: "Fabrika üretim planlama ve takip sorumlusu" },
  { name: "fabrika_operator", displayName: "Fabrika Operatör", description: "Fabrika üretim operatörü" },
  { name: "fabrika_sorumlu", displayName: "Fabrika Sorumlu", description: "Fabrika vardiya sorumlusu" },
  { name: "fabrika_personel", displayName: "Fabrika Personel", description: "Fabrika genel personel" },
  { name: "sef", displayName: "Pasta Şefi", description: "Fabrika pasta şefi, sınırlı kategori reçete erişimi" },
  { name: "recete_gm", displayName: "Reçete Genel Müdürü", description: "Reçete GM, keyblend master, tam reçete kontrolü" },
];

export async function seedRoles() {
  console.log("🌱 Starting roles seed...");
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  try {
    for (const role of SYSTEM_ROLES) {
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role.name));
      
      if (existing) {
        skippedCount++;
        continue;
      }
      
      await db.insert(roles).values({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystemRole: true,
      });
      
      insertedCount++;
    }
    
    console.log(`✅ Roles seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new roles`);
    console.log(`   - Skipped: ${skippedCount} existing roles`);
    console.log(`   - Total: ${insertedCount + skippedCount} system roles`);
    
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    throw error;
  }
}
