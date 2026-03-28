/**
 * DOSPRESSO Manifest-Based Authorization Middleware
 * 
 * Bu middleware manifest'teki rol tanımlarını kullanarak API erişimini kontrol eder.
 * Mevcut ad-hoc rol kontrollerinin yerini kademeli olarak alacak.
 * 
 * Kullanım:
 *   router.get('/api/shifts', isAuthenticated, requireManifestAccess('vardiya', 'view'), handler)
 *   router.post('/api/shifts', isAuthenticated, requireManifestAccess('vardiya', 'create'), handler)
 */

import type { RequestHandler } from 'express';
import { hasModuleAccess, getModuleScope, getModuleByFlagKey } from '@shared/module-manifest';
import { isModuleEnabled } from './module-flag-service';

/**
 * Manifest tabanlı yetki middleware
 * 1. Modül aktif mi? (module_flags DB tablosu)
 * 2. Kullanıcı rolü bu modüle erişebilir mi? (manifest)
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

      // 2. Rol yetkisi var mı?
      if (!hasModuleAccess(user.role, flagKey, action)) {
        return res.status(403).json({ 
          error: `Bu işlem için yetkiniz yok (${action})`,
          module: flagKey,
          role: user.role,
        });
      }

      // 3. Scope kontrolü — req.manifestScope olarak sakla (handler kullanabilir)
      const scope = getModuleScope(user.role, flagKey);
      (req as any).manifestScope = scope;
      (req as any).manifestModule = flagKey;

      next();
    } catch (error) {
      console.error(`[ManifestAuth] Error checking ${flagKey}/${action}:`, error);
      // Hata durumunda erişime izin ver (fail-open) — mevcut sistemi bozma
      next();
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
