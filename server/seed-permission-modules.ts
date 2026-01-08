import { db } from './db';
import { permissionModules } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Seeds the permission_modules table with module definitions
 * Maps to the PermissionModule type from schema
 */
export async function seedPermissionModules() {
  console.log("🌱 Starting permission modules seed...");
  
  const modules = [
    { moduleKey: 'dashboard', moduleName: 'Panel', category: 'shared', description: 'Ana kontrol paneli' },
    { moduleKey: 'tasks', moduleName: 'Görevler', category: 'shared', description: 'Görev yönetimi' },
    { moduleKey: 'checklists', moduleName: 'Kontrol Listeleri', category: 'shared', description: 'Checklist yönetimi' },
    { moduleKey: 'equipment', moduleName: 'Ekipmanlar', category: 'shared', description: 'Ekipman yönetimi' },
    { moduleKey: 'equipment_faults', moduleName: 'Ekipman Arızaları', category: 'shared', description: 'Arıza takibi' },
    { moduleKey: 'knowledge_base', moduleName: 'Bilgi Bankası', category: 'shared', description: 'Bilgi ve dokümantasyon' },
    { moduleKey: 'ai_assistant', moduleName: 'AI Asistan', category: 'shared', description: 'Yapay zeka asistanı' },
    { moduleKey: 'performance', moduleName: 'Performans', category: 'shared', description: 'Performans takibi' },
    { moduleKey: 'attendance', moduleName: 'Devam/Yoklama', category: 'shared', description: 'Çalışan devam takibi' },
    { moduleKey: 'branches', moduleName: 'Şubeler', category: 'hq', description: 'Şube yönetimi' },
    { moduleKey: 'users', moduleName: 'Kullanıcılar', category: 'hq', description: 'Kullanıcı yönetimi' },
    { moduleKey: 'employees', moduleName: 'Personel', category: 'shared', description: 'Personel yönetimi' },
    { moduleKey: 'hr', moduleName: 'İnsan Kaynakları', category: 'hq', description: 'İK süreçleri' },
    { moduleKey: 'training', moduleName: 'Eğitimler', category: 'shared', description: 'Eğitim modülleri' },
    { moduleKey: 'schedules', moduleName: 'Vardiyalar', category: 'shared', description: 'Vardiya planlama' },
    { moduleKey: 'messages', moduleName: 'Mesajlar', category: 'shared', description: 'Mesajlaşma sistemi' },
    { moduleKey: 'announcements', moduleName: 'Duyurular', category: 'shared', description: 'Duyuru yönetimi' },
    { moduleKey: 'complaints', moduleName: 'Şikayetler', category: 'shared', description: 'Şikayet yönetimi' },
    { moduleKey: 'leave_requests', moduleName: 'İzin Talepleri', category: 'shared', description: 'İzin talep yönetimi' },
    { moduleKey: 'overtime_requests', moduleName: 'Mesai Talepleri', category: 'shared', description: 'Mesai talep yönetimi' },
    // Ekipman & Arıza Modülleri
    { moduleKey: 'faults', moduleName: 'Arıza Yönetimi', category: 'shared', description: 'Arıza takibi ve yönetimi' },
    { moduleKey: 'equipment_analytics', moduleName: 'Ekipman Analitik', category: 'hq', description: 'Ekipman analitik raporları' },
    // Kalite & Denetim Modülleri
    { moduleKey: 'quality_audit', moduleName: 'Kalite Denetimi', category: 'hq', description: 'Kalite denetim yönetimi' },
    { moduleKey: 'audit_templates', moduleName: 'Denetim Şablonları', category: 'hq', description: 'Denetim şablon yönetimi' },
    { moduleKey: 'capa', moduleName: 'CAPA Yönetimi', category: 'hq', description: 'Düzeltici ve önleyici faaliyetler' },
    // Vardiya & İK Modülleri
    { moduleKey: 'shifts', moduleName: 'Vardiyalar', category: 'shared', description: 'Vardiya yönetimi' },
    { moduleKey: 'shift_planning', moduleName: 'Vardiya Planlama', category: 'hq', description: 'Vardiya planlama' },
    // Finans Modülleri
    { moduleKey: 'accounting', moduleName: 'Muhasebe', category: 'hq', description: 'Muhasebe işlemleri' },
    // Raporlama Modülleri
    { moduleKey: 'reports', moduleName: 'Performans Raporları', category: 'hq', description: 'Performans raporları' },
    { moduleKey: 'e2e_reports', moduleName: 'E2E Raporlar', category: 'hq', description: 'Uçtan uca raporlar' },
    { moduleKey: 'cash_reports', moduleName: 'Kasa Raporları', category: 'hq', description: 'Kasa raporları' },
    { moduleKey: 'hr_reports', moduleName: 'İK Raporları', category: 'hq', description: 'İK raporları' },
    // Kayıp Eşya Modülleri
    { moduleKey: 'lost_found', moduleName: 'Kayıp Eşya', category: 'shared', description: 'Kayıp eşya takibi' },
    { moduleKey: 'lost_found_hq', moduleName: 'Kayıp Eşya (HQ)', category: 'hq', description: 'Merkez kayıp eşya yönetimi' },
    // Proje Modülleri
    { moduleKey: 'projects', moduleName: 'Projeler', category: 'hq', description: 'Proje yönetimi' },
    { moduleKey: 'new_branch_projects', moduleName: 'Yeni Şube Açılış', category: 'hq', description: 'Yeni şube açılış projeleri' },
    // İletişim & Destek Modülleri
    { moduleKey: 'support', moduleName: 'Destek Talepleri', category: 'shared', description: 'Destek talepleri' },
    { moduleKey: 'notifications', moduleName: 'Bildirimler', category: 'shared', description: 'Bildirim sistemi' },
    // Admin Modülleri
    { moduleKey: 'settings', moduleName: 'Ayarlar', category: 'admin', description: 'Sistem ayarları' },
    { moduleKey: 'menu_management', moduleName: 'Menü Yönetimi', category: 'admin', description: 'Menü yönetimi' },
    { moduleKey: 'content_management', moduleName: 'İçerik Yönetimi', category: 'admin', description: 'İçerik yönetimi' },
    { moduleKey: 'admin_panel', moduleName: 'Admin Panel', category: 'admin', description: 'Admin paneli erişimi' },
    { moduleKey: 'authorization', moduleName: 'Yetkilendirme', category: 'admin', description: 'Rol ve yetki yönetimi' },
    { moduleKey: 'admin_settings', moduleName: 'Admin Ayarları', category: 'admin', description: 'Admin sistem ayarları' },
    { moduleKey: 'bulk_data', moduleName: 'Toplu Veri', category: 'admin', description: 'Toplu veri yönetimi' },
    // Akademi Paketi - Alt Modüller
    { moduleKey: 'academy.general', moduleName: 'Genel Akademi', category: 'academy', description: 'Temel akademi erişimi ve modüller' },
    { moduleKey: 'academy.hq', moduleName: 'HQ Akademi', category: 'academy', description: 'Merkez eğitim yönetimi' },
    { moduleKey: 'academy.analytics', moduleName: 'Akademi Analitik', category: 'academy', description: 'Eğitim istatistikleri ve raporlar' },
    { moduleKey: 'academy.badges', moduleName: 'Rozetler', category: 'academy', description: 'Rozet ve başarı sistemi' },
    { moduleKey: 'academy.certificates', moduleName: 'Sertifikalar', category: 'academy', description: 'Sertifika yönetimi' },
    { moduleKey: 'academy.leaderboard', moduleName: 'Liderlik Tablosu', category: 'academy', description: 'Sıralama ve yarışmalar' },
    { moduleKey: 'academy.quizzes', moduleName: 'Quizler', category: 'academy', description: 'Quiz ve sınav sistemi' },
    { moduleKey: 'academy.learning_paths', moduleName: 'Öğrenme Yolları', category: 'academy', description: 'Kariyer ve öğrenme yolları' },
    { moduleKey: 'academy.ai', moduleName: 'AI Asistan', category: 'academy', description: 'Yapay zeka destekli eğitim' },
    { moduleKey: 'academy.social', moduleName: 'Sosyal', category: 'academy', description: 'Takım yarışmaları ve gruplar' },
    { moduleKey: 'academy.supervisor', moduleName: 'Supervisor Görünümü', category: 'academy', description: 'Supervisor eğitim takibi' },
    // Yeni Eklenen Modüller - Ocak 2026
    { moduleKey: 'employee_of_month', moduleName: 'Ayın Elemanı', category: 'hq', description: 'Ayın elemanı seçimi ve ödüllendirme' },
    { moduleKey: 'advanced_reports', moduleName: 'Gelişmiş Raporlar', category: 'hq', description: 'PDF ve detaylı analiz raporları' },
    { moduleKey: 'my_performance', moduleName: 'Performansım', category: 'shared', description: 'Kişisel performans takibi' },
    { moduleKey: 'live_tracking', moduleName: 'Canlı Takip', category: 'hq', description: 'Personel konum takibi' },
    { moduleKey: 'customer_satisfaction', moduleName: 'Misafir Memnuniyeti', category: 'shared', description: 'Müşteri geri bildirimleri ve memnuniyet' },
    { moduleKey: 'campaigns', moduleName: 'Kampanya Yönetimi', category: 'hq', description: 'Kampanya oluşturma ve takibi' },
    { moduleKey: 'franchise_opening', moduleName: 'Franchise Açılış', category: 'hq', description: 'Franchise açılış süreç yönetimi' },
    { moduleKey: 'content_studio', moduleName: 'İçerik Stüdyosu', category: 'hq', description: 'Banner ve duyuru oluşturma' },
    { moduleKey: 'banner_management', moduleName: 'Banner Yönetimi', category: 'hq', description: 'Banner tasarımı ve yayınlama' },
    { moduleKey: 'staff_qr_tokens', moduleName: 'Personel QR Token', category: 'hq', description: 'Personel değerlendirme QR kodları' },
    // Fabrika Modülleri
    { moduleKey: 'factory', moduleName: 'Fabrika Genel', category: 'factory', description: 'Fabrika ana modülü' },
    { moduleKey: 'factory.dashboard', moduleName: 'Fabrika Dashboard', category: 'factory', description: 'Fabrika kontrol paneli' },
    { moduleKey: 'factory.production', moduleName: 'Üretim Planlama', category: 'factory', description: 'Üretim planlama ve takibi' },
    { moduleKey: 'factory.quality', moduleName: 'Fabrika Kalite', category: 'factory', description: 'Fabrika kalite kontrol' },
    { moduleKey: 'factory.performance', moduleName: 'Fabrika Performans', category: 'factory', description: 'Fabrika performans analizi' },
    { moduleKey: 'factory.kiosk', moduleName: 'Fabrika Kiosk', category: 'factory', description: 'Fabrika kiosk modu' },
    { moduleKey: 'factory.analytics', moduleName: 'Fabrika Analitik', category: 'factory', description: 'Fabrika analiz raporları' },
  ];
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  try {
    for (const module of modules) {
      // Check if module already exists
      const [existing] = await db
        .select()
        .from(permissionModules)
        .where(eq(permissionModules.moduleKey, module.moduleKey));
      
      if (existing) {
        skippedCount++;
        continue;
      }
      
      // Insert new module
      await db.insert(permissionModules).values({
        ...module,
        isActive: true,
      });
      
      insertedCount++;
    }
    
    console.log(`✅ Permission modules seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new modules`);
    console.log(`   - Skipped: ${skippedCount} existing modules`);
    console.log(`   - Total: ${insertedCount + skippedCount} modules`);
    
  } catch (error) {
    console.error("❌ Error seeding permission modules:", error);
    throw error;
  }
}
