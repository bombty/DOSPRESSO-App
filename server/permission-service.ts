import { db } from './db';
import { permissionActions, rolePermissionGrants, PermissionScope, type PermissionScopeType } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface PermissionResult {
  hasPermission: boolean;
  scope: PermissionScopeType | null;
  actionId: number | null;
}

export interface UserContext {
  id: string;
  role: string;
  branchId?: number | null;
}

/**
 * Resolves the permission scope for a user on a specific module action
 * Returns: { hasPermission, scope, actionId }
 * 
 * Scope levels:
 * - 'self': Can only access own data (userId === currentUser.id)
 * - 'branch': Can access all data in their branch (branchId === currentUser.branchId)
 * - 'global': Can access all data across all branches
 */
export async function resolvePermissionScope(
  user: UserContext,
  moduleKey: string,
  actionKey: string
): Promise<PermissionResult> {
  try {
    // Find the action
    const [action] = await db
      .select()
      .from(permissionActions)
      .where(
        and(
          eq(permissionActions.moduleKey, moduleKey),
          eq(permissionActions.actionKey, actionKey),
          eq(permissionActions.isActive, true)
        )
      );
    
    if (!action) {
      return { hasPermission: false, scope: null, actionId: null };
    }
    
    // Find the grant for this role and action
    const [grant] = await db
      .select()
      .from(rolePermissionGrants)
      .where(
        and(
          eq(rolePermissionGrants.role, user.role),
          eq(rolePermissionGrants.actionId, action.id),
          eq(rolePermissionGrants.isActive, true)
        )
      );
    
    if (!grant) {
      return { hasPermission: false, scope: null, actionId: action.id };
    }
    
    return {
      hasPermission: true,
      scope: grant.scope as PermissionScopeType,
      actionId: action.id,
    };
  } catch (error) {
    console.error('Error resolving permission scope:', error);
    return { hasPermission: false, scope: null, actionId: null };
  }
}

/**
 * Checks if user has permission for a specific action (any scope)
 */
export async function hasPermission(
  user: UserContext,
  moduleKey: string,
  actionKey: string
): Promise<boolean> {
  const result = await resolvePermissionScope(user, moduleKey, actionKey);
  return result.hasPermission;
}

/**
 * Gets all permissions for a user (for caching or bulk checks)
 */
export async function getUserPermissions(role: string): Promise<Map<string, PermissionScopeType>> {
  const grants = await db
    .select({
      moduleKey: permissionActions.moduleKey,
      actionKey: permissionActions.actionKey,
      scope: rolePermissionGrants.scope,
    })
    .from(rolePermissionGrants)
    .innerJoin(permissionActions, eq(rolePermissionGrants.actionId, permissionActions.id))
    .where(
      and(
        eq(rolePermissionGrants.role, role),
        eq(rolePermissionGrants.isActive, true),
        eq(permissionActions.isActive, true)
      )
    );
  
  const permissionMap = new Map<string, PermissionScopeType>();
  for (const grant of grants) {
    permissionMap.set(`${grant.moduleKey}:${grant.actionKey}`, grant.scope as PermissionScopeType);
  }
  
  return permissionMap;
}

/**
 * Applies scope filter to a query based on user's permission scope
 * Returns filter conditions for the query
 */
export function applyScopeFilter(
  scope: PermissionScopeType | null,
  user: UserContext,
  options: {
    userIdColumn?: string;
    branchIdColumn?: string;
  } = {}
): { 
  canAccess: boolean; 
  userId?: string; 
  branchId?: number | null;
  isGlobal: boolean;
} {
  if (!scope) {
    return { canAccess: false, isGlobal: false };
  }
  
  switch (scope) {
    case PermissionScope.SELF:
      return { 
        canAccess: true, 
        userId: user.id, 
        isGlobal: false 
      };
    
    case PermissionScope.BRANCH:
      return { 
        canAccess: true, 
        branchId: user.branchId, 
        isGlobal: false 
      };
    
    case PermissionScope.GLOBAL:
      return { 
        canAccess: true, 
        isGlobal: true 
      };
    
    default:
      return { canAccess: false, isGlobal: false };
  }
}

/**
 * Gets all actions for a specific module with their grants for a role
 */
export async function getModuleActionsWithGrants(moduleKey: string, role: string) {
  const actions = await db
    .select()
    .from(permissionActions)
    .where(eq(permissionActions.moduleKey, moduleKey));
  
  const grants = await db
    .select()
    .from(rolePermissionGrants)
    .where(eq(rolePermissionGrants.role, role));
  
  const grantMap = new Map(grants.map(g => [g.actionId, g]));
  
  return actions.map(action => ({
    ...action,
    grant: grantMap.get(action.id) || null,
  }));
}

/**
 * Updates or creates a permission grant for a role
 */
export async function upsertPermissionGrant(
  role: string,
  actionId: number,
  scope: PermissionScopeType,
  isActive: boolean = true
) {
  const [existing] = await db
    .select()
    .from(rolePermissionGrants)
    .where(
      and(
        eq(rolePermissionGrants.role, role),
        eq(rolePermissionGrants.actionId, actionId)
      )
    );
  
  if (existing) {
    await db
      .update(rolePermissionGrants)
      .set({ scope, isActive, updatedAt: new Date() })
      .where(eq(rolePermissionGrants.id, existing.id));
    return existing.id;
  } else {
    const [inserted] = await db
      .insert(rolePermissionGrants)
      .values({ role, actionId, scope, isActive })
      .returning({ id: rolePermissionGrants.id });
    return inserted.id;
  }
}

/**
 * Deletes a permission grant
 */
export async function deletePermissionGrant(role: string, actionId: number) {
  await db
    .delete(rolePermissionGrants)
    .where(
      and(
        eq(rolePermissionGrants.role, role),
        eq(rolePermissionGrants.actionId, actionId)
      )
    );
}

/**
 * Gets all permission actions grouped by module
 */
export async function getAllActionsGroupedByModule() {
  const actions = await db
    .select()
    .from(permissionActions)
    .where(eq(permissionActions.isActive, true));
  
  const grouped: Record<string, typeof actions> = {};
  for (const action of actions) {
    if (!grouped[action.moduleKey]) {
      grouped[action.moduleKey] = [];
    }
    grouped[action.moduleKey].push(action);
  }
  
  return grouped;
}

/**
 * Gets all grants for a specific role
 */
export async function getRoleGrants(role: string) {
  return db
    .select({
      id: rolePermissionGrants.id,
      actionId: rolePermissionGrants.actionId,
      scope: rolePermissionGrants.scope,
      isActive: rolePermissionGrants.isActive,
      moduleKey: permissionActions.moduleKey,
      actionKey: permissionActions.actionKey,
      labelTr: permissionActions.labelTr,
    })
    .from(rolePermissionGrants)
    .innerJoin(permissionActions, eq(rolePermissionGrants.actionId, permissionActions.id))
    .where(eq(rolePermissionGrants.role, role));
}
