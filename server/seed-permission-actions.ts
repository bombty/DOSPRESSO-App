import { db } from './db';
import { permissionActions, rolePermissionGrants, UserRole } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Seeds granular permission actions for modules
 * Each action can have a scope: self, branch, global
 */
export async function seedPermissionActions() {
  console.log("🌱 Starting permission actions seed...");
  
  const actions = [
    // ========================================
    // MUHASEBE (Accounting) - Hassas Finansal Veriler
    // ========================================
    { moduleKey: 'accounting', actionKey: 'view_salary', labelTr: 'Maaş Görüntüle', description: 'Personel maaş bilgilerini görüntüleme' },
    { moduleKey: 'accounting', actionKey: 'view_payroll', labelTr: 'Bordro Görüntüle', description: 'Bordro kayıtlarını görüntüleme' },
    { moduleKey: 'accounting', actionKey: 'edit_salary', labelTr: 'Maaş Düzenle', description: 'Personel maaş bilgilerini düzenleme' },
    { moduleKey: 'accounting', actionKey: 'approve_payroll', labelTr: 'Bordro Onayla', description: 'Bordro onaylama yetkisi' },
    { moduleKey: 'accounting', actionKey: 'export_payroll', labelTr: 'Bordro Dışa Aktar', description: 'Bordro verilerini dışa aktarma' },
    
    // ========================================
    // İK (HR) - İnsan Kaynakları
    // ========================================
    { moduleKey: 'hr', actionKey: 'view_employee_details', labelTr: 'Personel Detayları Görüntüle', description: 'Personel kişisel bilgilerini görüntüleme' },
    { moduleKey: 'hr', actionKey: 'edit_employee', labelTr: 'Personel Düzenle', description: 'Personel bilgilerini düzenleme' },
    { moduleKey: 'hr', actionKey: 'view_contracts', labelTr: 'Sözleşmeleri Görüntüle', description: 'İş sözleşmelerini görüntüleme' },
    { moduleKey: 'hr', actionKey: 'manage_documents', labelTr: 'Belgeleri Yönet', description: 'Personel belgelerini yönetme' },
    { moduleKey: 'hr', actionKey: 'terminate_employee', labelTr: 'İşten Çıkış', description: 'Personel işten çıkış işlemi' },
    
    // ========================================
    // PERSONEL (Employees)
    // ========================================
    { moduleKey: 'employees', actionKey: 'view_personal_info', labelTr: 'Kişisel Bilgi Görüntüle', description: 'Kişisel bilgileri görüntüleme' },
    { moduleKey: 'employees', actionKey: 'edit_personal_info', labelTr: 'Kişisel Bilgi Düzenle', description: 'Kişisel bilgileri düzenleme' },
    { moduleKey: 'employees', actionKey: 'view_salary_info', labelTr: 'Maaş Bilgisi Görüntüle', description: 'Maaş bilgilerini görüntüleme' },
    
    // ========================================
    // KULLANICILAR (Users)
    // ========================================
    { moduleKey: 'users', actionKey: 'view_users', labelTr: 'Kullanıcıları Görüntüle', description: 'Kullanıcı listesini görüntüleme' },
    { moduleKey: 'users', actionKey: 'create_user', labelTr: 'Kullanıcı Oluştur', description: 'Yeni kullanıcı oluşturma' },
    { moduleKey: 'users', actionKey: 'edit_user', labelTr: 'Kullanıcı Düzenle', description: 'Kullanıcı bilgilerini düzenleme' },
    { moduleKey: 'users', actionKey: 'delete_user', labelTr: 'Kullanıcı Sil', description: 'Kullanıcı silme' },
    { moduleKey: 'users', actionKey: 'reset_password', labelTr: 'Şifre Sıfırla', description: 'Kullanıcı şifresi sıfırlama' },
    
    // ========================================
    // ARIZA (Equipment Faults)
    // ========================================
    { moduleKey: 'equipment_faults', actionKey: 'create_fault', labelTr: 'Arıza Oluştur', description: 'Yeni arıza kaydı oluşturma' },
    { moduleKey: 'equipment_faults', actionKey: 'assign_fault', labelTr: 'Arıza Ata', description: 'Arızayı teknisyene atama' },
    { moduleKey: 'equipment_faults', actionKey: 'close_fault', labelTr: 'Arıza Kapat', description: 'Arıza kaydını kapatma' },
    { moduleKey: 'equipment_faults', actionKey: 'view_costs', labelTr: 'Maliyet Görüntüle', description: 'Arıza maliyetlerini görüntüleme' },
    { moduleKey: 'equipment_faults', actionKey: 'approve_cost', labelTr: 'Maliyet Onayla', description: 'Arıza maliyetini onaylama' },
    
    // ========================================
    // İZİN TALEPLERİ (Leave Requests)
    // ========================================
    { moduleKey: 'leave_requests', actionKey: 'create_request', labelTr: 'Talep Oluştur', description: 'İzin talebi oluşturma' },
    { moduleKey: 'leave_requests', actionKey: 'approve_request', labelTr: 'Talep Onayla', description: 'İzin talebini onaylama' },
    { moduleKey: 'leave_requests', actionKey: 'reject_request', labelTr: 'Talep Reddet', description: 'İzin talebini reddetme' },
    { moduleKey: 'leave_requests', actionKey: 'view_all_requests', labelTr: 'Tüm Talepleri Görüntüle', description: 'Tüm izin taleplerini görüntüleme' },
    
    // ========================================
    // MESAİ TALEPLERİ (Overtime Requests)
    // ========================================
    { moduleKey: 'overtime_requests', actionKey: 'create_request', labelTr: 'Mesai Talebi Oluştur', description: 'Mesai talebi oluşturma' },
    { moduleKey: 'overtime_requests', actionKey: 'approve_request', labelTr: 'Mesai Onayla', description: 'Mesai talebini onaylama' },
    { moduleKey: 'overtime_requests', actionKey: 'view_all_requests', labelTr: 'Tüm Mesaileri Görüntüle', description: 'Tüm mesai taleplerini görüntüleme' },
    
    // ========================================
    // VARDİYA (Shifts)
    // ========================================
    { moduleKey: 'shifts', actionKey: 'view_shifts', labelTr: 'Vardiyaları Görüntüle', description: 'Vardiya planını görüntüleme' },
    { moduleKey: 'shifts', actionKey: 'create_shift', labelTr: 'Vardiya Oluştur', description: 'Yeni vardiya oluşturma' },
    { moduleKey: 'shifts', actionKey: 'edit_shift', labelTr: 'Vardiya Düzenle', description: 'Vardiya düzenleme' },
    { moduleKey: 'shifts', actionKey: 'publish_schedule', labelTr: 'Program Yayınla', description: 'Vardiya programını yayınlama' },
    
    // ========================================
    // KALİTE DENETİM (Quality Audit)
    // ========================================
    { moduleKey: 'quality_audit', actionKey: 'create_audit', labelTr: 'Denetim Oluştur', description: 'Yeni denetim oluşturma' },
    { moduleKey: 'quality_audit', actionKey: 'perform_audit', labelTr: 'Denetim Yap', description: 'Denetim gerçekleştirme' },
    { moduleKey: 'quality_audit', actionKey: 'approve_audit', labelTr: 'Denetim Onayla', description: 'Denetim sonuçlarını onaylama' },
    { moduleKey: 'quality_audit', actionKey: 'view_reports', labelTr: 'Raporları Görüntüle', description: 'Denetim raporlarını görüntüleme' },
    
    // ========================================
    // RAPORLAR (Reports)
    // ========================================
    { moduleKey: 'reports', actionKey: 'view_branch_reports', labelTr: 'Şube Raporları', description: 'Şube raporlarını görüntüleme' },
    { moduleKey: 'reports', actionKey: 'view_all_reports', labelTr: 'Tüm Raporlar', description: 'Tüm raporları görüntüleme' },
    { moduleKey: 'reports', actionKey: 'export_reports', labelTr: 'Rapor Dışa Aktar', description: 'Raporları dışa aktarma' },
    
    // ========================================
    // PROJELER (Projects)
    // ========================================
    { moduleKey: 'projects', actionKey: 'view_project', labelTr: 'Proje Görüntüle', description: 'Proje detaylarını görüntüleme' },
    { moduleKey: 'projects', actionKey: 'edit_project', labelTr: 'Proje Düzenle', description: 'Proje düzenleme' },
    { moduleKey: 'projects', actionKey: 'manage_tasks', labelTr: 'Görev Yönet', description: 'Proje görevlerini yönetme' },
    { moduleKey: 'projects', actionKey: 'approve_milestone', labelTr: 'Kilometre Taşı Onayla', description: 'Proje kilometre taşlarını onaylama' },
    
    // ========================================
    // DESTEK (Support)
    // ========================================
    { moduleKey: 'support', actionKey: 'create_ticket', labelTr: 'Destek Talebi Oluştur', description: 'Yeni destek talebi oluşturma' },
    { moduleKey: 'support', actionKey: 'assign_ticket', labelTr: 'Talep Ata', description: 'Destek talebini atama' },
    { moduleKey: 'support', actionKey: 'close_ticket', labelTr: 'Talep Kapat', description: 'Destek talebini kapatma' },
    { moduleKey: 'support', actionKey: 'view_all_tickets', labelTr: 'Tüm Talepleri Görüntüle', description: 'Tüm destek taleplerini görüntüleme' },
    
    // ========================================
    // AKADEMİ QUİZLER (Academy Quizzes)
    // ========================================
    { moduleKey: 'academy.quizzes', actionKey: 'create_quiz', labelTr: 'Quiz Oluştur', description: 'Yeni quiz oluşturma' },
    { moduleKey: 'academy.quizzes', actionKey: 'edit_quiz', labelTr: 'Quiz Düzenle', description: 'Quiz düzenleme' },
    { moduleKey: 'academy.quizzes', actionKey: 'view_results', labelTr: 'Sonuçları Görüntüle', description: 'Quiz sonuçlarını görüntüleme' },
    { moduleKey: 'academy.quizzes', actionKey: 'grade_quiz', labelTr: 'Quiz Puanla', description: 'Quiz puanlama' },
  ];
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  try {
    for (const action of actions) {
      const [existing] = await db
        .select()
        .from(permissionActions)
        .where(eq(permissionActions.actionKey, action.actionKey));
      
      if (existing && existing.moduleKey === action.moduleKey) {
        skippedCount++;
        continue;
      }
      
      await db.insert(permissionActions).values({
        ...action,
        isActive: true,
      });
      
      insertedCount++;
    }
    
    console.log(`✅ Permission actions seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new actions`);
    console.log(`   - Skipped: ${skippedCount} existing actions`);
    console.log(`   - Total: ${insertedCount + skippedCount} actions`);
    
  } catch (error) {
    console.error("❌ Error seeding permission actions:", error);
    throw error;
  }
}

/**
 * Seeds default permission grants for each role
 * Maps roles to their appropriate action scopes
 */
export async function seedDefaultRolePermissions() {
  console.log("🌱 Starting default role permission grants...");
  
  // Get all actions from database
  const allActions = await db.select().from(permissionActions);
  
  const actionMap = new Map<string, number>();
  for (const action of allActions) {
    actionMap.set(`${action.moduleKey}:${action.actionKey}`, action.id);
  }
  
  // Define role-based default permissions
  // Format: { role, moduleKey, actionKey, scope }
  const rolePermissions = [
    // ========================================
    // ADMIN - Full Global Access
    // ========================================
    ...['accounting', 'hr', 'employees', 'users', 'equipment_faults', 'leave_requests', 
        'overtime_requests', 'shifts', 'quality_audit', 'reports', 'projects', 'support', 'academy.quizzes']
      .flatMap(moduleKey => {
        const moduleActions = allActions.filter(a => a.moduleKey === moduleKey);
        return moduleActions.map(action => ({
          role: UserRole.ADMIN,
          actionId: action.id,
          scope: 'global' as const,
        }));
      }),
    
    // ========================================
    // MUHASEBE - Full Global Access for Accounting/HR
    // ========================================
    { role: UserRole.MUHASEBE, actionId: actionMap.get('accounting:view_salary'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('accounting:view_payroll'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('accounting:edit_salary'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('accounting:approve_payroll'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('accounting:export_payroll'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('hr:view_employee_details'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('hr:view_contracts'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('employees:view_personal_info'), scope: 'global' as const },
    { role: UserRole.MUHASEBE, actionId: actionMap.get('employees:view_salary_info'), scope: 'global' as const },
    
    // ========================================
    // SUPERVISOR - Branch Level Access
    // ========================================
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('accounting:view_salary'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('accounting:view_payroll'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('employees:view_personal_info'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('leave_requests:create_request'), scope: 'self' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('leave_requests:approve_request'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('leave_requests:view_all_requests'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('overtime_requests:approve_request'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('overtime_requests:view_all_requests'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('shifts:view_shifts'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('shifts:create_shift'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('shifts:edit_shift'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('equipment_faults:create_fault'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR, actionId: actionMap.get('equipment_faults:view_costs'), scope: 'branch' as const },
    
    // ========================================
    // BARISTA - Self Level Access Only
    // ========================================
    { role: UserRole.BARISTA, actionId: actionMap.get('employees:view_personal_info'), scope: 'self' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('employees:view_salary_info'), scope: 'self' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('leave_requests:create_request'), scope: 'self' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('overtime_requests:create_request'), scope: 'self' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('shifts:view_shifts'), scope: 'self' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('equipment_faults:create_fault'), scope: 'branch' as const },
    { role: UserRole.BARISTA, actionId: actionMap.get('support:create_ticket'), scope: 'self' as const },
    
    // ========================================
    // STAJYER - Minimal Self Access
    // ========================================
    { role: UserRole.STAJYER, actionId: actionMap.get('employees:view_personal_info'), scope: 'self' as const },
    { role: UserRole.STAJYER, actionId: actionMap.get('shifts:view_shifts'), scope: 'self' as const },
    { role: UserRole.STAJYER, actionId: actionMap.get('support:create_ticket'), scope: 'self' as const },
    
    // ========================================
    // BAR_BUDDY - Self Access
    // ========================================
    { role: UserRole.BAR_BUDDY, actionId: actionMap.get('employees:view_personal_info'), scope: 'self' as const },
    { role: UserRole.BAR_BUDDY, actionId: actionMap.get('employees:view_salary_info'), scope: 'self' as const },
    { role: UserRole.BAR_BUDDY, actionId: actionMap.get('leave_requests:create_request'), scope: 'self' as const },
    { role: UserRole.BAR_BUDDY, actionId: actionMap.get('shifts:view_shifts'), scope: 'self' as const },
    { role: UserRole.BAR_BUDDY, actionId: actionMap.get('support:create_ticket'), scope: 'self' as const },
    
    // ========================================
    // SUPERVISOR_BUDDY - Branch View, Self Edit
    // ========================================
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('employees:view_personal_info'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('employees:view_salary_info'), scope: 'self' as const },
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('leave_requests:create_request'), scope: 'self' as const },
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('leave_requests:view_all_requests'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('shifts:view_shifts'), scope: 'branch' as const },
    { role: UserRole.SUPERVISOR_BUDDY, actionId: actionMap.get('equipment_faults:create_fault'), scope: 'branch' as const },
    
    // ========================================
    // COACH - Global View, Training Focus
    // ========================================
    { role: UserRole.COACH, actionId: actionMap.get('employees:view_personal_info'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('academy.quizzes:create_quiz'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('academy.quizzes:edit_quiz'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('academy.quizzes:view_results'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('academy.quizzes:grade_quiz'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('quality_audit:perform_audit'), scope: 'global' as const },
    { role: UserRole.COACH, actionId: actionMap.get('quality_audit:view_reports'), scope: 'global' as const },
    
    // ========================================
    // TEKNIK - Equipment/Fault Focus
    // ========================================
    { role: UserRole.TEKNIK, actionId: actionMap.get('equipment_faults:assign_fault'), scope: 'global' as const },
    { role: UserRole.TEKNIK, actionId: actionMap.get('equipment_faults:close_fault'), scope: 'global' as const },
    { role: UserRole.TEKNIK, actionId: actionMap.get('equipment_faults:view_costs'), scope: 'global' as const },
    { role: UserRole.TEKNIK, actionId: actionMap.get('equipment_faults:approve_cost'), scope: 'global' as const },
    
    // ========================================
    // DESTEK - Support Tickets
    // ========================================
    { role: UserRole.DESTEK, actionId: actionMap.get('support:assign_ticket'), scope: 'global' as const },
    { role: UserRole.DESTEK, actionId: actionMap.get('support:close_ticket'), scope: 'global' as const },
    { role: UserRole.DESTEK, actionId: actionMap.get('support:view_all_tickets'), scope: 'global' as const },
  ];
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  try {
    for (const grant of rolePermissions) {
      if (!grant.actionId) {
        console.warn(`⚠️ Action not found, skipping grant`);
        skippedCount++;
        continue;
      }
      
      const [existing] = await db
        .select()
        .from(rolePermissionGrants)
        .where(eq(rolePermissionGrants.role, grant.role));
      
      // Check if this exact role+action combo exists
      const exactMatch = await db
        .select()
        .from(rolePermissionGrants)
        .where(eq(rolePermissionGrants.actionId, grant.actionId));
      
      const hasExact = exactMatch.some(e => e.role === grant.role);
      
      if (hasExact) {
        skippedCount++;
        continue;
      }
      
      await db.insert(rolePermissionGrants).values({
        role: grant.role,
        actionId: grant.actionId,
        scope: grant.scope,
        isActive: true,
      });
      
      insertedCount++;
    }
    
    console.log(`✅ Role permission grants seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new grants`);
    console.log(`   - Skipped: ${skippedCount} existing/invalid grants`);
    
  } catch (error) {
    console.error("❌ Error seeding role permission grants:", error);
    throw error;
  }
}
