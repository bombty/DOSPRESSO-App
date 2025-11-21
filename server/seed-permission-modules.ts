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
