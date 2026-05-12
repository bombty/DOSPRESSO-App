/**
 * DOSPRESSO Manifest-Based Authorization Middleware
 * 
 * Bu middleware manifest'teki rol tanımlarını kullanarak API erişimini kontrol eder.
 * Mevcut ad-hoc rol kontrollerinin yerini kademeli olarak alacak.
 * 
 * Kullanım:
 *   router.get('/api/shifts', isAuthenticated, requireManifestAccess('vardiya', 'view'), handler)
 *   router.post('/api/shifts', isAuthenticated, requireManifestAccess('vardiya', 'create'), handler)
 * 
 * Sprint 21 (Aslan 12 May 2026): Hibrit Sufficiency Model
 *   - Önce manifest kontrol (baseline)
 *   - Manifest izin verirse → İZİN
 *   - Manifest reddederse → DB ek yetki var mı kontrol (role_module_permissions tablosu)
 *   - DB'de extension varsa → İZİN (admin UI'dan eklenmiş)
 *   - Aksi halde → REDDE
 *   - Tüm DB extension kullanımları audit log'a yazılır
 */

import type { RequestHandler } from 'express';
import { hasModuleAccess, getModuleScope, getModuleByFlagKey } from '@shared/module-manifest';
import { isModuleEnabled } from './module-flag-service';
import { db } from '../db';
import { roleModulePermissions } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Sprint 21: DB extension lookup — manifest reddettiğinde fallback
 * UI yetkilendirme sayfasından admin'in eklediği grant'leri okur
 */
async function checkDbExtension(role: string, module: string, action: string): Promise<boolean> {
  try {
    const record = await db
      .select({ actions: roleModulePermissions.actions })
      .from(roleModulePermissions)
      .where(
        and(
          eq(roleModulePermissions.role, role),
          eq(roleModulePermissions.module, module)
        )
      )
      .limit(1);

    if (record.length === 0) return false;
    const actions = record[0].actions || [];
    return actions.includes(action);
  } catch (error) {
    // DB hatası → fail-closed (manifest sonucuna güven)
    console.error(`[Sprint 21 Hybrid] DB extension lookup failed for ${role}/${module}/${action}:`, error);
    return false;
  }
}

/**
 * Manifest tabanlı yetki middleware (Sprint 21 hibrit)
 * 1. Modül aktif mi? (module_flags DB tablosu)
 * 2a. Kullanıcı rolü manifest'te erişebilir mi?
 * 2b. Manifest reddederse DB extension kontrol et
 * 3. Scope kontrolü (own_branch, managed_branches, all_branches)
 */
export function requireManifestAccess(
  flagKey: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve'
): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!user?.role) {
        return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
      }

      // 1. Modül aktif mi?
      const enabled = await isModuleEnabled(flagKey, user.branchId, 'api', user.role);
      if (!enabled) {
        return res.status(403).json({ 
          error: 'Bu modül şubeniz için aktif değildir',
          module: flagKey,
        });
      }

      // 2a. Rol yetkisi var mı? (manifest baseline)
      const manifestAllow = hasModuleAccess(user.role, flagKey, action);
      let permissionSource: 'manifest' | 'db_extension' = 'manifest';

      if (!manifestAllow) {
        // 2b. Sprint 21 Hibrit Fallback — DB extension kontrolü
        const dbExtensionAllow = await checkDbExtension(user.role, flagKey, action);

        if (!dbExtensionAllow) {
          return res.status(403).json({
            error: `Bu işlem için yetkiniz yok (${action})`,
            module: flagKey,
            role: user.role,
          });
        }

        // DB extension verdi → audit log
        permissionSource = 'db_extension';
        console.log(`[Sprint 21 Audit] DB extension granted: role=${user.role} module=${flagKey} action=${action} userId=${user.id}`);
      }

      // 3. Scope kontrolü — req.manifestScope olarak sakla (handler kullanabilir)
      const scope = getModuleScope(user.role, flagKey);
      (req as any).manifestScope = scope;
      (req as any).manifestModule = flagKey;
      (req as any).permissionSource = permissionSource;

      next();
    } catch (error) {
      // Sprint 10 P-5 (6 May 2026): FAIL-CLOSED — Audit Security 4.2
      // ÖNCEKİ DAVRANIŞ (BUG): Hata olursa next() çağrılıyordu (fail-open)
      //   → DB hatası, manifest yükleme hatası, vs. durumlarda yetkisiz erişim
      // YENİ DAVRANIŞ: Her hata = 403 yetki reddi
      //   → Mahmut Bey'in muhasebe ekranına saldırı denemesinde DB exception olsa bile geçemez
      //
      // Operasyonel: Bu fail-closed davranışı bir endpoint'i kullanılamaz hale getirebilir
      // (örn. module_flags tablosu ulaşılamazsa). Bu durumda log inceleyip altyapı sorunu çözülür.
      // Yetkisiz erişim riski > geçici endpoint downtime riski.
      const userId = (req.user as any)?.id ?? 'anonymous';
      const userRole = (req.user as any)?.role ?? 'unknown';
      console.error(
        `[ManifestAuth] Yetki kontrolü başarısız (fail-closed) — userId=${userId} role=${userRole} module=${flagKey} action=${action}:`,
        error
      );
      return res.status(403).json({
        error: 'Yetki kontrolü yapılamadı, erişim reddedildi',
        module: flagKey,
        action,
        // production'da error detail gösterilmez (information leak), sadece dev modda
        ...(process.env.NODE_ENV !== 'production' && { detail: String(error) }),
      });
    }
  };
}

/**
 * Scope-based branch filter helper
 * Handler'lar içinde kullanılır — manifest scope'a göre branchId filtresi uygular
 * 
 * Kullanım:
 *   const branchFilter = getScopeFilter(req);
 *   // branchFilter = null (tüm şubeler) veya { branchId: 5 } veya { branchIds: [5,23,24] }
 */
export function getScopeFilter(req: any): { type: 'all' | 'branch' | 'managed' | 'own'; branchId?: number; branchIds?: number[] } | null {
  const scope = (req as any).manifestScope;
  const user = req.user as any;

  if (!scope) return null; // Manifest kontrolü yapılmamış

  switch (scope) {
    case 'all_branches':
      return { type: 'all' };
    
    case 'own_branch':
      return { type: 'branch', branchId: user.branchId };
    
    case 'managed_branches':
      // Muhasebe: HQ(5) + Fabrika(23,24)
      // TODO: Bu listeyi admin panelden ayarlanabilir yap
      return { type: 'managed', branchIds: [5, 23, 24] };
    
    case 'own_data':
      return { type: 'own', branchId: user.branchId };
    
    default:
      return { type: 'branch', branchId: user.branchId };
  }
}

/**
 * Basit rol kontrolü — manifest'e sormadan, sadece modül erişimi kontrol eder
 * Mevcut ad-hoc kontrollerin yerine kullanılabilir
 */
export function canAccessModule(role: string, flagKey: string): boolean {
  return hasModuleAccess(role, flagKey, 'view');
}

/** Muhasebe_ik ve muhasebe'nin sorumlu olduğu şubeler: HQ(5) + Fabrika(23) + Işıklar(24) */
export const MANAGED_BRANCH_IDS = [5, 23, 24];

export interface ScopeResult {
  type: 'single' | 'multiple' | 'all';
  branchId?: number;
  branchIds?: number[];
}

/**
 * Scope-aware branch filter resolver
 * requireManifestAccess middleware'ından sonra kullanılır.
 * Manifest scope'a ve query parametrelerine göre branchId filtresi çözümler.
 * 
 * Kullanım:
 *   const scopeResult = resolveBranchScope(req);
 *   if ('error' in scopeResult) return res.status(403).json({ message: scopeResult.error });
 *   // scopeResult.type === 'single' | 'multiple' | 'all'
 * 
 * Sprint 6 (5 May 2026 - Mahmut feedback): viewOnly=true mode
 *   muhasebe_ik/muhasebe için: tüm şubeleri GÖRÜR, ama sadece 3'te (5/23/24) yazma yetkisi
 *   Read-only endpoint'lerde viewOnly=true kullanılır → managed_branches → all genişletilir
 */
export function resolveBranchScope(req: any, opts?: { viewOnly?: boolean }): ScopeResult | { error: string } {
  const scope = (req as any).manifestScope;
  const user = req.user as any;
  const requestedBranch = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;

  switch (scope) {
    case 'own_data':
    case 'own_branch':
      if (!user.branchId) return { error: 'Şube ataması yapılmamış' };
      return { type: 'single', branchId: user.branchId };

    case 'managed_branches': {
      // Sprint 6: View-only için tüm şubeleri göster (yazma yetkisi farklı endpoint'lerde managed_branches'te kalır)
      if (opts?.viewOnly) {
        if (requestedBranch) return { type: 'single', branchId: requestedBranch };
        return { type: 'all' };
      }
      
      // Yazma işlemleri için: sadece 3 managed branch
      if (requestedBranch) {
        if (!MANAGED_BRANCH_IDS.includes(requestedBranch)) {
          return { error: 'Bu şubeye erişim yetkiniz yok' };
        }
        return { type: 'single', branchId: requestedBranch };
      }
      return { type: 'multiple', branchIds: MANAGED_BRANCH_IDS };
    }

    case 'all_branches':
    default:
      if (requestedBranch) return { type: 'single', branchId: requestedBranch };
      return { type: 'all' };
  }
}
