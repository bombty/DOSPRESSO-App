import { db } from './db';
import { menuSections, menuItems } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds the complete admin menu structure with 15 main sections and all submenu items
 * IDEMPOTENT: Uses ON CONFLICT DO UPDATE for sections and checks for existing items
 */
export async function seedAdminMenu() {
  console.log("🌱 Starting admin menu seed...");
  
  let sectionsInserted = 0;
  let sectionsUpdated = 0;
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
      titleTr: 'Genel Gösterge Paneli',
      path: '/',
      icon: 'LayoutDashboard',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 2. AI ASISTAN
    // ========================================
    const [aiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'ai',
        titleTr: 'AI Asistan',
        scope: 'hq',
        icon: 'Sparkles',
        sortOrder: 20,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'AI Asistan',
          scope: 'hq',
          icon: 'Sparkles',
          sortOrder: 20,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(aiSection.id, {
      titleTr: 'AI Asistan',
      path: '/ai-asistan',
      icon: 'Sparkles',
      moduleKey: 'ai_assistant',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 3. ŞUBELER
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

    // ========================================
    // 4. FRANCHISE AÇILIŞ YÖNETİMİ
    // ========================================
    const [franchiseSection] = await db
      .insert(menuSections)
      .values({
        slug: 'franchise',
        titleTr: 'Franchise Açılış Yönetimi',
        scope: 'hq',
        icon: 'Store',
        sortOrder: 40,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Franchise Açılış Yönetimi',
          scope: 'hq',
          icon: 'Store',
          sortOrder: 40,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(franchiseSection.id, {
      titleTr: 'Franchise Açılış Yönetimi',
      path: '/franchise-acilis',
      icon: 'Store',
      moduleKey: 'branches',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 5. OPERASYON YÖNETİMİ
    // ========================================
    const [operasyonSection] = await db
      .insert(menuSections)
      .values({
        slug: 'operasyon',
        titleTr: 'Operasyon Yönetimi',
        scope: 'both',
        icon: 'ClipboardCheck',
        sortOrder: 50,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Operasyon Yönetimi',
          scope: 'both',
          icon: 'ClipboardCheck',
          sortOrder: 50,
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
      icon: 'ListChecks',
      moduleKey: 'checklists',
      scope: 'both',
      sortOrder: 20,
    });

    // ========================================
    // 6. EKİPMAN & ARIZA YÖNETİMİ
    // ========================================
    const [ekipmanSection] = await db
      .insert(menuSections)
      .values({
        slug: 'ekipman',
        titleTr: 'Ekipman & Arıza Yönetimi',
        scope: 'both',
        icon: 'Wrench',
        sortOrder: 60,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Ekipman & Arıza Yönetimi',
          scope: 'both',
          icon: 'Wrench',
          sortOrder: 60,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(ekipmanSection.id, {
      titleTr: 'Ekipman Listesi',
      path: '/ekipman',
      icon: 'Wrench',
      moduleKey: 'equipment',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(ekipmanSection.id, {
      titleTr: 'Arıza Bildirimleri',
      path: '/ekipman-arizalari',
      icon: 'AlertTriangle',
      moduleKey: 'equipment_faults',
      scope: 'both',
      sortOrder: 20,
    });

    await insertMenuItem(ekipmanSection.id, {
      titleTr: 'Troubleshooting',
      path: '/ekipman-troubleshooting',
      icon: 'Search',
      moduleKey: 'equipment',
      scope: 'both',
      sortOrder: 30,
    });

    // ========================================
    // 7. VARDİYA & DEVAM YÖNETİMİ
    // ========================================
    const [vardiyaSection] = await db
      .insert(menuSections)
      .values({
        slug: 'vardiya',
        titleTr: 'Vardiya & Devam Yönetimi',
        scope: 'both',
        icon: 'Calendar',
        sortOrder: 70,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Vardiya & Devam Yönetimi',
          scope: 'both',
          icon: 'Calendar',
          sortOrder: 70,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Vardiya Planı',
      path: '/vardiyalar',
      icon: 'Calendar',
      moduleKey: 'schedules',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Vardiya Check-in',
      path: '/vardiya-checkin',
      icon: 'CheckCircle',
      moduleKey: 'attendance',
      scope: 'both',
      sortOrder: 20,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Vardiya Şablonları',
      path: '/vardiya-sablonlari',
      icon: 'FileText',
      moduleKey: 'schedules',
      scope: 'both',
      sortOrder: 30,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Personel Müsaitlik',
      path: '/personel-musaitlik',
      icon: 'UserCheck',
      moduleKey: 'schedules',
      scope: 'both',
      sortOrder: 40,
    });

    await insertMenuItem(vardiyaSection.id, {
      titleTr: 'Devam Takibi',
      path: '/devam',
      icon: 'ClipboardList',
      moduleKey: 'attendance',
      scope: 'both',
      sortOrder: 50,
    });

    // ========================================
    // 8. İZİN & MESAİ YÖNETİMİ
    // ========================================
    const [izinMesaiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'izin-mesai',
        titleTr: 'İzin & Mesai Yönetimi',
        scope: 'both',
        icon: 'Clock',
        sortOrder: 80,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'İzin & Mesai Yönetimi',
          scope: 'both',
          icon: 'Clock',
          sortOrder: 80,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(izinMesaiSection.id, {
      titleTr: 'İzin Talepleri',
      path: '/izin-talepleri',
      icon: 'Calendar',
      moduleKey: 'leave_requests',
      scope: 'both',
      sortOrder: 10,
    });

    await insertMenuItem(izinMesaiSection.id, {
      titleTr: 'Mesai Talepleri',
      path: '/mesai-talepleri',
      icon: 'Clock',
      moduleKey: 'overtime_requests',
      scope: 'both',
      sortOrder: 20,
    });

    // ========================================
    // 9. FİNANS
    // ========================================
    const [finansSection] = await db
      .insert(menuSections)
      .values({
        slug: 'finans',
        titleTr: 'Finans',
        scope: 'hq',
        icon: 'DollarSign',
        sortOrder: 90,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Finans',
          scope: 'hq',
          icon: 'DollarSign',
          sortOrder: 90,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(finansSection.id, {
      titleTr: 'Kasa Raporları',
      path: '/kasa-raporlari',
      icon: 'FileText',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 10. İNSAN KAYNAKLARI
    // ========================================
    const [ikSection] = await db
      .insert(menuSections)
      .values({
        slug: 'ik',
        titleTr: 'İnsan Kaynakları',
        scope: 'hq',
        icon: 'Users',
        sortOrder: 100,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'İnsan Kaynakları',
          scope: 'hq',
          icon: 'Users',
          sortOrder: 100,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(ikSection.id, {
      titleTr: 'Personel Listesi',
      path: '/ik',
      icon: 'Users',
      moduleKey: 'employees',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'Personel Yönetimi',
      path: '/personel-yonetimi',
      icon: 'UserCog',
      moduleKey: 'hr',
      scope: 'hq',
      sortOrder: 20,
    });

    await insertMenuItem(ikSection.id, {
      titleTr: 'İK Raporları',
      path: '/ik-raporlari',
      icon: 'FileText',
      moduleKey: 'hr',
      scope: 'hq',
      sortOrder: 30,
    });

    // ========================================
    // 11. KALİTE & GELİŞİM
    // ========================================
    const [kaliteSection] = await db
      .insert(menuSections)
      .values({
        slug: 'kalite',
        titleTr: 'Kalite & Gelişim',
        scope: 'hq',
        icon: 'Award',
        sortOrder: 110,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Kalite & Gelişim',
          scope: 'hq',
          icon: 'Award',
          sortOrder: 110,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Kalite Denetimleri',
      path: '/kalite-denetimi',
      icon: 'ClipboardCheck',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 10,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Denetim Şablonları',
      path: '/denetim-sablonlari',
      icon: 'FileText',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 20,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Denetimler',
      path: '/denetimler',
      icon: 'Search',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 30,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Müşteri Geri Bildirimi',
      path: '/musteri-geribildirimi',
      icon: 'MessageSquare',
      moduleKey: 'complaints',
      scope: 'hq',
      sortOrder: 40,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Şikayetler',
      path: '/sikayetler',
      icon: 'AlertCircle',
      moduleKey: 'complaints',
      scope: 'hq',
      sortOrder: 50,
    });

    await insertMenuItem(kaliteSection.id, {
      titleTr: 'Kampanya Yönetimi',
      path: '/kampanya-yonetimi',
      icon: 'TrendingUp',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 60,
    });

    // ========================================
    // 12. AKADEMİ (EĞİTİM YÖNETİMİ)
    // ========================================
    const [akademiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'akademi',
        titleTr: 'Akademi (Eğitim Yönetimi)',
        scope: 'both',
        icon: 'GraduationCap',
        sortOrder: 120,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Akademi (Eğitim Yönetimi)',
          scope: 'both',
          icon: 'GraduationCap',
          sortOrder: 120,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(akademiSection.id, {
      titleTr: 'Eğitim Modülleri',
      path: '/training',
      icon: 'BookOpen',
      moduleKey: 'training',
      scope: 'both',
      sortOrder: 10,
    });

    // ========================================
    // 13. BİLGİ BANKASI
    // ========================================
    const [bilgiBankasiSection] = await db
      .insert(menuSections)
      .values({
        slug: 'bilgi-bankasi',
        titleTr: 'Bilgi Bankası',
        scope: 'hq',
        icon: 'BookOpen',
        sortOrder: 130,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Bilgi Bankası',
          scope: 'hq',
          icon: 'BookOpen',
          sortOrder: 130,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(bilgiBankasiSection.id, {
      titleTr: 'Bilgi Bankası',
      path: '/bilgi-bankasi',
      icon: 'BookOpen',
      moduleKey: 'knowledge_base',
      scope: 'hq',
      sortOrder: 10,
    });

    // ========================================
    // 14. DESTEK MERKEZİ
    // ========================================
    const [destekSection] = await db
      .insert(menuSections)
      .values({
        slug: 'destek',
        titleTr: 'Destek Merkezi',
        scope: 'both',
        icon: 'MessageSquare',
        sortOrder: 140,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Destek Merkezi',
          scope: 'both',
          icon: 'MessageSquare',
          sortOrder: 140,
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
    // 15. YÖNETİM / AYARLAR
    // ========================================
    const [yonetimSection] = await db
      .insert(menuSections)
      .values({
        slug: 'yonetim',
        titleTr: 'Yönetim / Ayarlar',
        scope: 'hq',
        icon: 'Settings',
        sortOrder: 150,
      })
      .onConflictDoUpdate({
        target: menuSections.slug,
        set: {
          titleTr: 'Yönetim / Ayarlar',
          scope: 'hq',
          icon: 'Settings',
          sortOrder: 150,
        },
      })
      .returning();
    sectionsInserted++;

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Rol & Yetki Yönetimi',
      path: '/yonetim/rol-yetkileri',
      icon: 'Shield',
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
      icon: 'Menu',
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

    await insertMenuItem(yonetimSection.id, {
      titleTr: 'Servis Talepleri',
      path: '/yonetim/servis-talepleri',
      icon: 'Inbox',
      moduleKey: 'dashboard',
      scope: 'hq',
      sortOrder: 80,
    });

    console.log(`✅ Admin menu seed completed:`);
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
