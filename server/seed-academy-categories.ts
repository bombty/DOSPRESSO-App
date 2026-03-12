import { db } from "./db";
import { academyHubCategories, trainingModules } from "@shared/schema";
import { eq } from "drizzle-orm";


const STANDARD_CATEGORIES = [
  { slug: "barista_temelleri", titleTr: "Barista Temelleri", titleEn: "Barista Basics", description: "Kahve hazırlama, espresso, süt işleme teknikleri", iconName: "Coffee", colorHex: "#8B5CF6", displayOrder: 1 },
  { slug: "hijyen_guvenlik", titleTr: "Hijyen & Güvenlik", titleEn: "Hygiene & Safety", description: "Gıda güvenliği, temizlik protokolleri, iş güvenliği", iconName: "ShieldCheck", colorHex: "#10B981", displayOrder: 2 },
  { slug: "receteler", titleTr: "Reçeteler", titleEn: "Recipes", description: "Ürün reçeteleri, yeni ürün tanıtımları", iconName: "ChefHat", colorHex: "#F59E0B", displayOrder: 3 },
  { slug: "musteri_iliskileri", titleTr: "Müşteri İlişkileri", titleEn: "Customer Service", description: "Müşteri memnuniyeti, iletişim becerileri", iconName: "Heart", colorHex: "#EC4899", displayOrder: 4 },
  { slug: "ekipman", titleTr: "Ekipman Kullanımı", titleEn: "Equipment", description: "Makine bakımı, ekipman kullanımı", iconName: "Wrench", colorHex: "#6366F1", displayOrder: 5 },
  { slug: "yonetim", titleTr: "Yönetim & Liderlik", titleEn: "Management", description: "Ekip yönetimi, vardiya planlaması, raporlama", iconName: "Users", colorHex: "#0EA5E9", displayOrder: 6 },
  { slug: "onboarding", titleTr: "Oryantasyon", titleEn: "Onboarding", description: "Yeni personel oryantasyon programı", iconName: "GraduationCap", colorHex: "#14B8A6", displayOrder: 7 },
  { slug: "genel_gelisim", titleTr: "Genel Gelişim", titleEn: "General Development", description: "Kişisel gelişim, soft skills, şirket kültürü", iconName: "BookOpen", colorHex: "#64748B", displayOrder: 8 },
];

const CATEGORY_MIGRATION_MAP: Record<string, string> = {
  barista: "barista_temelleri",
  barista_basics: "barista_temelleri",
  "Barista Basics": "barista_temelleri",
  "bar buddy": "barista_temelleri",
  bar_buddy: "barista_temelleri",
  hygiene: "hijyen_guvenlik",
  uretim_hijyen: "hijyen_guvenlik",
  gida_guvenligi: "hijyen_guvenlik",
  is_guvenligi: "hijyen_guvenlik",
  acil_durum: "hijyen_guvenlik",
  safety: "hijyen_guvenlik",
  recipe: "receteler",
  customer_service: "musteri_iliskileri",
  ekipman_kullanim: "ekipman",
  depo: "ekipman",
  equipment: "ekipman",
  management: "yonetim",
  supervisor: "yonetim",
  supervisor_buddy: "yonetim",
  "supervisor buddy": "yonetim",
  stajyer: "onboarding",
  "soft-skills": "genel_gelisim",
  mesleki_gelisim: "genel_gelisim",
  culture: "genel_gelisim",
  general: "genel_gelisim",
  quality: "genel_gelisim",
};

const STANDARD_SLUGS = new Set(STANDARD_CATEGORIES.map(c => c.slug));

export async function seedAcademyCategories() {
  console.log("🎓 Starting academy categories seed...");

  const existingCats = await db.select({ slug: academyHubCategories.slug, isActive: academyHubCategories.isActive }).from(academyHubCategories);
  const existingSlugs = new Set(existingCats.filter(c => c.isActive).map(c => c.slug));
  const standardSlugsArr = STANDARD_CATEGORIES.map(c => c.slug);
  const allMatch = standardSlugsArr.every(s => existingSlugs.has(s)) && existingSlugs.size === standardSlugsArr.length;

  if (allMatch) {
    const allModules = await db.select({ id: trainingModules.id, category: trainingModules.category }).from(trainingModules);
    const needsMigration = allModules.some(m => {
      const cat = m.category || "";
      return !STANDARD_SLUGS.has(cat);
    });
    if (!needsMigration) {
      console.log(`✅ Academy categories already up to date (${existingSlugs.size} categories, 0 modules need migration). Skipping.`);
      return;
    }
  }

  await db.update(academyHubCategories).set({ isActive: false });

  for (const cat of STANDARD_CATEGORIES) {
    await db
      .insert(academyHubCategories)
      .values({
        slug: cat.slug,
        titleTr: cat.titleTr,
        titleEn: cat.titleEn,
        description: cat.description,
        iconName: cat.iconName,
        colorHex: cat.colorHex,
        displayOrder: cat.displayOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: academyHubCategories.slug,
        set: {
          titleTr: cat.titleTr,
          titleEn: cat.titleEn,
          description: cat.description,
          iconName: cat.iconName,
          colorHex: cat.colorHex,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
      });
  }

  const allModules = await db.select({ id: trainingModules.id, category: trainingModules.category }).from(trainingModules);
  let migratedCount = 0;

  for (const mod of allModules) {
    const currentCat = mod.category || "";
    if (STANDARD_SLUGS.has(currentCat)) continue;

    const newCat = CATEGORY_MIGRATION_MAP[currentCat] || "genel_gelisim";
    await db.update(trainingModules).set({ category: newCat }).where(eq(trainingModules.id, mod.id));
    migratedCount++;
  }

  console.log(`✅ Academy categories seed completed:`);
  console.log(`   - ${STANDARD_CATEGORIES.length} standard categories upserted`);
  console.log(`   - ${migratedCount} training modules re-categorized`);
}
