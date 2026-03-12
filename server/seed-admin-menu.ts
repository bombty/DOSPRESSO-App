import { db } from './db';
import { menuSections, menuItems } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

const EXPECTED_SECTIONS = 12;
const EXPECTED_ITEMS = 53;

export async function seedAdminMenu() {
  console.log("🌱 Starting admin menu seed (simplified structure)...");

  const [sectionCount] = await db.select({ cnt: sql`count(*)::int` }).from(menuSections);
  const [itemCount] = await db.select({ cnt: sql`count(*)::int` }).from(menuItems);
  const sections = (sectionCount as any)?.cnt ?? 0;
  const items = (itemCount as any)?.cnt ?? 0;

  if (sections >= EXPECTED_SECTIONS && items >= EXPECTED_ITEMS) {
    console.log(`✅ Admin menu already seeded (${sections} sections, ${items} items). Skipping.`);
    return;
  }
  
  let sectionsInserted = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  
  try {
    // ========================================
    // 1. KONTROL PANELİ (Dashboard)
    // ========================================
    const [dashboardSection] = await db
      .insert(menuSections)
      .values({
        slug: 'dashboard',
        titleTr: 'Kontrol Paneli',
        scope: 'hq',
        icon: 'LayoutDashboard',
        sortOrder: 10,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Kontrol Paneli',
          scope: 'hq',
          icon: 'LayoutDashboard',
          sortOrder: 10,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(dashboardSection.id, {
      titleTr: 'Kontrol Paneli',
      path: '/',
      icon: 'LayoutDashboard',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 2. ŞUBELER
    // ========================================
    const [subelerSection] = await db
      .insert(menuSections)
      .values({
        slug: 'subeler',
        titleTr: 'Şubeler',
        scope: 'hq',
        icon: 'Building2',
        sortOrder: 30,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Şubeler',
          scope: 'hq',
          icon: 'Building2',
          sortOrder: 30,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(subelerSection.id, {
      titleTr: 'Tüm Şubeler',
      path: '/subeler',
      icon: 'Building2',
      moduleKey: 'branches',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(subelerSection.id, {
      titleTr: 'Franchise Açılış',
      path: '/franchise-acilis',
      icon: 'Store',
      moduleKey: 'branches',
      scope: 'hq',
      sortOrder: 20,
    });

    // ========================================
    // 4. OPERASYON (Unified: Tasks + Checklists + Equipment)
    // ========================================
    const [operasyonSection] = await db
      .insert(menuSections)
      .values({
        slug: 'operasyon',
        titleTr: 'Operasyon',
        scope: 'both',
        icon: 'ClipboardCheck',
        sortOrder: 40,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Operasyon',
          scope: 'both',
          icon: 'ClipboardCheck',
          sortOrder: 40,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(operasyonSection.id, {
      titleTr: 'Görevler',
      path: '/gorevler',
      icon: 'CheckSquare',
      moduleKey: 'tasks',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(operasyonSection.id, {
      titleTr: 'Checklistler',
      path: '/checklistler',
      icon: 'ClipboardList',
      moduleKey: 'checklists',
      scope: 'both',
      sortOrder: 20,
    });

    await insertMenuItem(operasyonSection.id, {
      titleTr: 'Ekipman Yönetimi',
      path: '/ekipman',
      icon: 'Settings',
      moduleKey: 'equipment',
      scope: 'both',
      sortOrder: 30,
    });

    await insertMenuItem(operasyonSection.id, {
      titleTr: 'Arıza Bildirimleri',
      path: '/ekipman-arizalari',
      icon: 'Wrench',
      moduleKey: 'equipment_faults',
      scope: 'both',
      sortOrder: 40,
    });

    await insertMenuItem(operasyonSection.id, {
      titleTr: 'Troubleshooting',
      path: '/ekipman-troubleshooting',
      icon: 'Wrench',
      moduleKey: 'equipment',
      scope: 'both',
      sortOrder: 50,
    });

    // ========================================
    // 5. VARDIYA & DEVAM
    // ========================================
    const [vardiyaSection] = await db
      .insert(menuSections)
      .values({
        slug: 'vardiya',
        titleTr: 'Vardiya & Devam',
        scope: 'both',
        icon: 'Clock',
        sortOrder: 50,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Vardiya & Devam',
          scope: 'both',
          icon: 'Clock',
          sortOrder: 50,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Vardiya Planı',
      path: '/vardiyalar',
      icon: 'Clock',
      moduleKey: 'dashboard',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Giriş/Çıkış (QR)',
      path: '/vardiya-checkin',
      icon: 'QrCode',
      moduleKey: 'dashboard',
      scope: 'both',
      sortOrder: 20,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Vardiya Şablonları',
      path: '/vardiya-sablonlari',
      icon: 'Calendar',
      moduleKey: 'dashboard',
      scope: 'both',
      sortOrder: 30,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Müsaitlik Takvimi',
      path: '/personel-musaitlik',
      icon: 'CalendarDays',
      moduleKey: 'dashboard',
      scope: 'both',
      sortOrder: 40,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Devam Takibi',
      path: '/devam-takibi',
      icon: 'Clock',
      moduleKey: 'employees',
      scope: 'both',
      sortOrder: 50,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'İzin Talepleri',
      path: '/izin-talepleri',
      icon: 'Calendar',
      moduleKey: 'employees',
      scope: 'both',
      sortOrder: 60,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Mesai Talepleri',
      path: '/mesai-talepleri',
      icon: 'Clock',
      moduleKey: 'employees',
      scope: 'both',
      sortOrder: 70,
    });

    // ========================================
    // 6. FINANS
    // ========================================
    const [finansSection] = await db
      .insert(menuSections)
      .values({
        slug: 'finans',
        titleTr: 'Finans',
        scope: 'both',
        icon: 'Wallet',
        sortOrder: 60,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Finans',
          scope: 'both',
          icon: 'Wallet',
          sortOrder: 60,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(finansSection.id, {
      titleTr: 'Kasa Raporları',
      path: '/kasa-raporlari',
      icon: 'Wallet',
      moduleKey: 'dashboard',
      scope: 'both',
      sortOrder: 10,
    });

    // ========================================
    // 7. İNSAN KAYNAKLARI
    // ========================================
    const [ikSection] = await db
      .insert(menuSections)
      .values({
        slug: 'ik',
        titleTr: 'İnsan Kaynakları',
        scope: 'both',
        icon: 'Users',
        sortOrder: 70,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'İnsan Kaynakları',
          scope: 'both',
          icon: 'Users',
          sortOrder: 70,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(ikSection.id, {
      titleTr: 'Personel Listesi',
      path: '/ik',
      icon: 'Users',
      moduleKey: 'employees',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'Personel Yönetimi',
      path: '/personel-yonetimi',
      icon: 'Users',
      moduleKey: 'hr',
      scope: 'both',
      sortOrder: 20,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'Disiplin Yönetimi',
      path: '/disiplin-yonetimi',
      icon: 'ClipboardList',
      moduleKey: 'hr',
      scope: 'both',
      sortOrder: 30,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'Yeni Personel Onboarding',
      path: '/personel-onboarding',
      icon: 'GraduationCap',
      moduleKey: 'hr',
      scope: 'both',
      sortOrder: 40,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'İK Raporları',
      path: '/ik-raporlari',
      icon: 'BarChart3',
      moduleKey: 'employees',
      scope: 'hq',
      sortOrder: 50,
    });

    // ========================================
    // 8. KALİTE & GELİŞİM
    // ========================================
    const [kaliteSection] = await db
      .insert(menuSections)
      .values({
        slug: 'kalite',
        titleTr: 'Kalite & Gelişim',
        scope: 'hq',
        icon: 'Award',
        sortOrder: 80,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Kalite & Gelişim',
          scope: 'hq',
          icon: 'Award',
          sortOrder: 80,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Kalite Denetimleri',
      path: '/kalite-denetimi',
      icon: 'FileSearch',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Denetim Şablonları',
      path: '/denetim-sablonlari',
      icon: 'ClipboardList',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 20,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Denetimler',
      path: '/denetimler',
      icon: 'FileSearch',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 30,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Misafir Memnuniyeti',
      path: '/misafir-memnuniyeti',
      icon: 'Star',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 40,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Şikayetler',
      path: '/sikayetler',
      icon: 'MessageSquare',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 50,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Kampanya Yönetimi',
      path: '/kampanya-yonetimi',
      icon: 'Megaphone',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 60,
    });

    // ========================================
    // 9. AKADEMİ
    // ========================================
    const [akademiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'akademi',
        titleTr: 'Akademi',
        scope: 'both',
        icon: 'GraduationCap',
        sortOrder: 90,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Akademi',
          scope: 'both',
          icon: 'GraduationCap',
          sortOrder: 90,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(akademiSection.id, {
      titleTr: 'Eğitim Modülleri',
      path: '/training',
      icon: 'GraduationCap',
      moduleKey: 'training',
      scope: 'both',
      sortOrder: 10,
    });

    // ========================================
    // 10. BİLGİ BANKASI
    // ========================================
    const [bilgiBankasiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'bilgi-bankasi',
        titleTr: 'Bilgi Bankası',
        scope: 'both',
        icon: 'BookOpen',
        sortOrder: 100,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Bilgi Bankası',
          scope: 'both',
          icon: 'BookOpen',
          sortOrder: 100,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(bilgiBankasiSection.id, {
      titleTr: 'Bilgi Bankası',
      path: '/bilgi-bankasi',
      icon: 'BookOpen',
      moduleKey: 'knowledge_base',
      scope: 'both',
      sortOrder: 10,
    });

    // ========================================
    // 11. DESTEK
    // ========================================
    const [destekSection] = await db
      .insert(menuSections)
      .values({
        slug: 'destek',
        titleTr: 'Destek',
        scope: 'both',
        icon: 'MessageSquare',
        sortOrder: 110,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Destek',
          scope: 'both',
          icon: 'MessageSquare',
          sortOrder: 110,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(destekSection.id, {
      titleTr: 'Destek Talepleri',
      path: '/hq-destek',
      icon: 'MessageSquare',
      moduleKey: 'messages',
      scope: 'both',
      sortOrder: 10,
    });

    // ========================================
    // 12. PROJELER (HQ Project Collaboration)
    // ========================================
    const [projelerSection] = await db
      .insert(menuSections)
      .values({
        slug: 'projeler',
        titleTr: 'Projeler',
        scope: 'hq',
        icon: 'FolderKanban',
        sortOrder: 115,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Projeler',
          scope: 'hq',
          icon: 'FolderKanban',
          sortOrder: 115,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(projelerSection.id, {
      titleTr: 'Tüm Projeler',
      path: '/projeler',
      icon: 'FolderKanban',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(projelerSection.id, {
      titleTr: 'Yeni Şube Açılış',
      path: '/yeni-sube-projeler',
      icon: 'Store',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 20,
    });

    // ========================================
    // 13. YÖNETİM / AYARLAR
    // ========================================
    const [yonetimSection] = await db
      .insert(menuSections)
      .values({
        slug: 'yonetim',
        titleTr: 'Yönetim / Ayarlar',
        scope: 'hq',
        icon: 'Settings',
        sortOrder: 120,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Yönetim / Ayarlar',
          scope: 'hq',
          icon: 'Settings',
          sortOrder: 120,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Rol ve Yetki Yönetimi',
      path: '/yonetim/rol-yetkileri',
      icon: 'Users',
      moduleKey: 'users',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Kullanıcı Yönetimi',
      path: '/yonetim/kullanicilar',
      icon: 'Users',
      moduleKey: 'users',
      scope: 'hq',
      sortOrder: 20,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Sistem Ayarları',
      path: '/yonetim/ayarlar',
      icon: 'Settings',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 30,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Menü Yönetimi',
      path: '/yonetim/menu',
      icon: 'LayoutDashboard',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 40,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'İçerik Yönetimi',
      path: '/yonetim/icerik',
      icon: 'FileText',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 50,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'AI Maliyet Yönetimi',
      path: '/yonetim/ai-maliyetler',
      icon: 'DollarSign',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 60,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Checklist Yönetimi',
      path: '/yonetim/checklistler',
      icon: 'ListChecks',
      moduleKey: 'checklists',
      scope: 'hq',
      sortOrder: 70,
    });

    // Admin Panel sayfaları
    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Yetkilendirme',
      path: '/admin/yetkilendirme',
      icon: 'Shield',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 80,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Aktivite Logları',
      path: '/admin/aktivite-loglari',
      icon: 'FileText',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 90,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Yedekleme',
      path: '/admin/yedekleme',
      icon: 'Database',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 100,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Email Ayarları',
      path: '/admin/email-ayarlari',
      icon: 'Mail',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 110,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Servis Mail Ayarları',
      path: '/admin/servis-mail-ayarlari',
      icon: 'Mail',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 120,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Banner Yönetimi',
      path: '/admin/bannerlar',
      icon: 'Image',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 130,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Duyurular',
      path: '/admin/duyurular',
      icon: 'Megaphone',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 140,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Yapay Zeka Ayarları',
      path: '/admin/yapay-zeka-ayarlari',
      icon: 'Bot',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 150,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Kalite Denetim Şablonları',
      path: '/admin/kalite-denetim-sablonlari',
      icon: 'Star',
      moduleKey: 'quality',
      scope: 'hq',
      sortOrder: 160,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Toplu Veri Yönetimi',
      path: '/admin/toplu-veri-yonetimi',
      icon: 'Database',
      moduleKey: 'admin_settings',
      scope: 'hq',
      sortOrder: 170,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Fabrika İstasyonları',
      path: '/admin/fabrika-istasyonlar',
      icon: 'Factory',
      moduleKey: 'factory',
      scope: 'hq',
      sortOrder: 180,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Fabrika Fire Sebepleri',
      path: '/admin/fabrika-fire-sebepleri',
      icon: 'AlertTriangle',
      moduleKey: 'factory',
      scope: 'hq',
      sortOrder: 190,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Fabrika PIN Yönetimi',
      path: '/admin/fabrika-pin-yonetimi',
      icon: 'Key',
      moduleKey: 'factory',
      scope: 'hq',
      sortOrder: 200,
    });

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Fabrika Kalite Kriterleri',
      path: '/admin/fabrika-kalite-kriterleri',
      icon: 'Star',
      moduleKey: 'factory',
      scope: 'hq',
      sortOrder: 210,
    });

    console.log(`✅ Simplified admin menu seed completed:`);
    console.log(`   - Sections processed: ${sectionsInserted}`);
    console.log(`   - Menu items inserted: ${itemsInserted}`);
    console.log(`   - Menu items skipped (already exist): ${itemsSkipped}`);
    console.log(`   - Total menu items: ${itemsInserted + itemsSkipped}`);
    
  } catch (error) {
    console.error("❌ Error seeding admin menu:", error);
    throw error;
  }

  /**
   * Helper function to insert a menu item if it doesn't exist
   */
  async function insertMenuItem(sectionId: number, item: {
    titleTr: string;
    path: string;
    icon: string | null;
    moduleKey: string | null;
    scope: string;
    sortOrder: number;
  }) {
    // Check if item already exists for this section and path
    const [existing] = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.sectionId, sectionId),
          eq(menuItems.path, item.path)
        )
      );

    if (existing) {
      itemsSkipped++;
      return;
    }

    // Insert new item
    await db.insert(menuItems).values({
      sectionId,
      titleTr: item.titleTr,
      path: item.path,
      icon: item.icon,
      moduleKey: item.moduleKey,
      scope: item.scope,
      sortOrder: item.sortOrder,
      isActive: true,
    });

    itemsInserted++;
  }
}
