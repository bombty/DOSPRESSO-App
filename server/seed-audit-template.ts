/**
 * DOSPRESSO Default Audit Template Seed
 * Creates 6-section quality audit template with machinery calibration categories
 */

import { db } from "./db";
import { auditTemplates, auditTemplateItems, users } from "../shared/schema";
import { eq } from "drizzle-orm";

export async function seedDefaultAuditTemplate() {
  try {
    // Get admin user
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    if (!adminUser || adminUser.length === 0) {
      console.log("❌ Admin user not found for template seeding");
      return { created: 0, skipped: 1 };
    }
    const adminId = adminUser[0].id;

    // Check if template already exists
    const existingTemplate = await db
      .select()
      .from(auditTemplates)
      .where(eq(auditTemplates.title, "DOSPRESSO Kalite Denetimi"))
      .limit(1);

    if (existingTemplate.length > 0) {
      console.log("✅ Default audit template already exists");
      return { created: 0, skipped: 1 };
    }

    // Create main template
    const [template] = await db
      .insert(auditTemplates)
      .values({
        title: "DOSPRESSO Kalite Denetimi",
        description: "6-bölümlü kapsamlı kalite denetimi şablonu",
        auditType: "branch",
        category: "quality_audit",
        isActive: true,
        requiresPhoto: true,
        aiAnalysisEnabled: true,
        createdById: adminId,
      })
      .returning();

    // Define 6 sections with weighted items
    const sections = [
      {
        name: "Gıda Güvenliği",
        sectionWeight: 25,
        items: [
          { text: "Gıda depolama sıcaklığı uygunluğu", requiresPhoto: true },
          { text: "Çapraz kontaminasyon riski", requiresPhoto: true },
          { text: "El hijyeni ve temizlik prosedürleri", requiresPhoto: false },
          { text: "Tarih kontrolü ve ürün rotasyonu", requiresPhoto: true },
        ],
      },
      {
        name: "Ürün Standardı",
        sectionWeight: 25,
        items: [
          { text: "Ürün ağırlığı/porsiyon standardı", requiresPhoto: true },
          { text: "Ürün sunum ve tasarım", requiresPhoto: true },
          { text: "Tat ve kalite kontrol", requiresPhoto: false },
          { text: "Ambalaj ve etiketleme", requiresPhoto: true },
        ],
      },
      {
        name: "Servis",
        sectionWeight: 15,
        items: [
          { text: "Müşteri hizmet standardı", requiresPhoto: false },
          { text: "Servis hızı ve sıra yönetimi", requiresPhoto: false },
          { text: "Ödeme işlemleri ve kasa yönetimi", requiresPhoto: false },
        ],
      },
      {
        name: "Operasyon",
        sectionWeight: 15,
        items: [
          { text: "İş akışı verimliliği", requiresPhoto: false },
          { text: "Vardiya yönetimi ve disiplin", requiresPhoto: false },
          { text: "Envanter yönetimi", requiresPhoto: true },
          { text: "Sıvı ve tüketim kontrol", requiresPhoto: false },
        ],
      },
      {
        name: "Marka",
        sectionWeight: 10,
        items: [
          { text: "Mağaza görünüş ve dekorasyon", requiresPhoto: true },
          { text: "Personel kıyafet ve hijyen", requiresPhoto: true },
          { text: "Marka mesajlaşması doğruluğu", requiresPhoto: true },
        ],
      },
      {
        name: "Ekipman & Kalibrasyonu (4 Kritik Kategori)",
        sectionWeight: 10,
        items: [
          { text: "Kahve Makinesi - Kalibrasyonu Kontrol", requiresPhoto: true },
          { text: "Gıda Hazırlık - Kalibrasyonu Kontrol", requiresPhoto: true },
          { text: "Cramice - Kalibrasyonu Kontrol", requiresPhoto: true },
          { text: "Çay Istasyonu - Kalibrasyonu Kontrol", requiresPhoto: true },
          { text: "Genel ekipman bakım ve temizlik", requiresPhoto: true },
        ],
      },
    ];

    // Insert section items
    let itemOrder = 0;
    let totalItemsCreated = 0;

    for (const section of sections) {
      // Calculate weight per item in this section
      const itemsInSection = section.items.length;
      const weightPerItem = section.sectionWeight / itemsInSection;

      for (const item of section.items) {
        await db.insert(auditTemplateItems).values({
          templateId: template.id,
          itemText: item.text,
          itemType: "rating",
          weight: Math.round(weightPerItem * 100) / 100, // Distribute section weight evenly
          requiresPhoto: item.requiresPhoto,
          sortOrder: itemOrder,
          maxPoints: 5,
          aiCheckEnabled: item.requiresPhoto,
          aiPrompt: item.requiresPhoto
            ? "Bu denetim maddesinin kalitesini değerlendir ve fotoya bakarak uyum düzeyini belirle."
            : null,
        });
        itemOrder++;
        totalItemsCreated++;
      }
    }

    console.log(`✅ Default audit template created with ${totalItemsCreated} items`);
    return { created: 1, skipped: 0 };
  } catch (error) {
    console.error("❌ Audit template seed error:", error);
    return { created: 0, skipped: 0 };
  }
}
