/**
 * useIKScope — İK modülü için scope-aware yetki hook'u
 *
 * Manifest'ten (M02_IK) gelen scope tanımlarını frontend tarafında uygular.
 * Tüm İK tab bileşenlerinde kullanılır.
 *
 * Scope tipleri:
 *   all_branches   → admin, ceo, cgo, coach, trainer, yatirimci_hq
 *   managed_branches → muhasebe_ik, muhasebe (branchId IN [5, 23, 24])
 *   own_branch     → mudur, supervisor, yatirimci_branch
 *   own_data       → barista (kendi verisini görür)
 */

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, hasPermission } from "@shared/schema";

/** Muhasebe_ik ve muhasebe'nin sorumlu olduğu şubeler: HQ(5) + Fabrika(23) + Işıklar(24) */
const MANAGED_BRANCH_IDS = [5, 23, 24];

export type IKScopeType = 'all_branches' | 'managed_branches' | 'own_branch' | 'own_data';

export interface IKScope {
  /** Kullanıcının İK scope tipi */
  scopeType: IKScopeType;
  /** Kullanıcı sadece kendi verisini görebilir mi? */
  isOwnDataOnly: boolean;
  /** Kullanıcı read-only mı? (coach, trainer, ceo, cgo, yatirimci_branch, barista) */
  isReadOnly: boolean;
  /** Kullanıcı yeni personel ekleyebilir mi? */
  canCreate: boolean;
  /** Kullanıcı personel düzenleyebilir mi? */
  canEdit: boolean;
  /** Kullanıcı personel silebilir mi (soft delete)? */
  canDelete: boolean;
  /** Kullanıcı onaylama yapabilir mi? */
  canApprove: boolean;
  /** Kullanıcının erişebildiği şube ID'leri (null = tümü, [] = sadece kendi) */
  allowedBranchIds: number[] | null;
  /** Kullanıcının kendi şube ID'si */
  userBranchId: number | null;
  /** Kullanıcının rolü */
  userRole: string;
  /** HQ rolü mü? */
  isHQ: boolean;
  /** Şube filtresi seçildiğinde API URL'i oluşturur */
  buildQueryUrl: (baseUrl: string, branchFilter?: string) => string;
  /** Şube dropdown'ında gösterilecek şubeleri filtreler */
  filterBranches: (branches: { id: number; name: string }[]) => { id: number; name: string }[];
  /** "Tümü" seçeneği gösterilebilir mi? */
  canSelectAllBranches: boolean;
  /** Şube filtresi gösterilmeli mi? */
  showBranchFilter: boolean;
  /** Read-only badge gösterilmeli mi? */
  showReadOnlyBadge: boolean;
  /** Scope açıklaması (UI'da gösterilebilir) */
  scopeLabel: string;
}

function getScopeType(role: string): IKScopeType {
  switch (role) {
    case 'admin':
    case 'ceo':
    case 'cgo':
    case 'coach':
    case 'trainer':
    case 'yatirimci_hq':
      return 'all_branches';

    case 'muhasebe_ik':
    case 'muhasebe':
      return 'managed_branches';

    case 'mudur':
    case 'supervisor':
    case 'supervisor_buddy':
    case 'yatirimci_branch':
      return 'own_branch';

    case 'barista':
    case 'bar_buddy':
    case 'stajyer':
      return 'own_data';

    default:
      return 'own_data';
  }
}

function getReadOnly(role: string): boolean {
  const readOnlyRoles = [
    'ceo', 'cgo', 'coach', 'trainer',
    'yatirimci_branch', 'yatirimci_hq',
    'barista', 'bar_buddy', 'stajyer',
    'muhasebe', // muhasebe sadece görüntüleyebilir, muhasebe_ik düzenleyebilir
    'supervisor_buddy',
  ];
  return readOnlyRoles.includes(role);
}

function getScopeLabel(scopeType: IKScopeType, role: string): string {
  switch (scopeType) {
    case 'all_branches':
      if (role === 'coach') return 'Tüm Şubeler (Denetim)';
      if (role === 'trainer') return 'Tüm Şubeler (Eğitim)';
      return 'Tüm Şubeler';
    case 'managed_branches':
      return 'Merkez + Fabrika + Işıklar';
    case 'own_branch':
      return 'Kendi Şubem';
    case 'own_data':
      return 'Kendi Bilgilerim';
  }
}

export function useIKScope(): IKScope {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role ?? 'barista';
    const branchId = user?.branchId ?? null;
    const scopeType = getScopeType(role);
    const readOnly = getReadOnly(role);
    const isHQ = isHQRole(role as any) || role === 'admin';

    const canCreate = hasPermission(role as any, 'employees', 'create') && !readOnly;
    const canEdit = hasPermission(role as any, 'employees', 'edit') && !readOnly;
    const canDelete = role === 'admin';
    const canApprove = hasPermission(role as any, 'employees', 'approve');

    // Erişilebilir şube ID'leri
    let allowedBranchIds: number[] | null = null;
    if (scopeType === 'managed_branches') {
      allowedBranchIds = MANAGED_BRANCH_IDS;
    } else if (scopeType === 'own_branch' || scopeType === 'own_data') {
      allowedBranchIds = branchId ? [branchId] : [];
    }
    // all_branches → null (tümü)

    const buildQueryUrl = (baseUrl: string, branchFilter?: string): string => {
      // Eğer scope managed ise ve filtre seçilmediyse, managed branch'leri gönder
      if (scopeType === 'managed_branches') {
        if (branchFilter && branchFilter !== 'all') {
          // Seçilen şubenin managed listesinde olup olmadığını kontrol et
          const selectedId = parseInt(branchFilter);
          if (MANAGED_BRANCH_IDS.includes(selectedId)) {
            return `${baseUrl}?branchId=${branchFilter}`;
          }
          // İzin dışı şube — tüm managed'ı gönder
          return `${baseUrl}?branchIds=${MANAGED_BRANCH_IDS.join(',')}`;
        }
        return `${baseUrl}?branchIds=${MANAGED_BRANCH_IDS.join(',')}`;
      }

      // all_branches — filtre seçilmişse gönder
      if (scopeType === 'all_branches') {
        if (branchFilter && branchFilter !== 'all') {
          return `${baseUrl}?branchId=${branchFilter}`;
        }
        return baseUrl;
      }

      // own_branch / own_data — backend kendi filtreler
      return baseUrl;
    };

    const filterBranches = (branches: { id: number; name: string }[]) => {
      if (scopeType === 'managed_branches') {
        return branches.filter(b => MANAGED_BRANCH_IDS.includes(b.id));
      }
      if (scopeType === 'own_branch') {
        return branches.filter(b => b.id === branchId);
      }
      // all_branches — tümünü göster
      return branches;
    };

    return {
      scopeType,
      isOwnDataOnly: scopeType === 'own_data',
      isReadOnly: readOnly,
      canCreate,
      canEdit,
      canDelete,
      canApprove,
      allowedBranchIds,
      userBranchId: branchId,
      userRole: role,
      isHQ,
      buildQueryUrl,
      filterBranches,
      canSelectAllBranches: scopeType === 'all_branches',
      showBranchFilter: scopeType === 'all_branches' || scopeType === 'managed_branches',
      showReadOnlyBadge: readOnly && scopeType !== 'own_data',
      scopeLabel: getScopeLabel(scopeType, role),
    };
  }, [user?.role, user?.branchId]);
}

/** Managed branch ID'lerini dışa aktar (backend entegrasyonu için) */
export { MANAGED_BRANCH_IDS };
