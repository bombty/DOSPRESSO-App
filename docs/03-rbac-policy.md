# RBAC Policy

## Source of Truth
All role and permission logic lives in these files — **docs must never contradict them**:

| File | Purpose |
|------|---------|
| `shared/schema.ts` | `UserRole` enum, `PermissionModule` type, `hasPermission()` function, role-permission matrix |
| `shared/permissions.ts` | Academy view modes, route permissions, role group sets (`ACADEMY_COACH_ROLES`, etc.) |

## Principle: Deny by Default
- If a role is not explicitly granted access, it is denied.
- Admin role (`UserRole.ADMIN`) bypasses all checks — this is the only implicit grant.
- New modules start with zero permissions; roles are granted access explicitly in the permission matrix.

## Role → View Mode Mapping

| View Mode | Roles | Can See |
|-----------|-------|---------|
| **Coach** | admin, coach, trainer, kalite_kontrol | Management, content, analytics, all supervisor tabs |
| **Supervisor** | supervisor, mudur | Employee tabs + team tracking, onboarding approvals |
| **Employee** | stajyer, bar_buddy, barista, supervisor_buddy, yatirimci_branch | Learning, career progression, badges, certificates |

Determined by: `getAcademyViewMode(role)` in `shared/permissions.ts`

## How to Add a New Permission-Guarded Route

1. **Add the permission module** (if new) to `PermissionModule` type in `shared/schema.ts`
2. **Add route config** to `ACADEMY_ROUTE_PERMISSIONS` array in `shared/permissions.ts`:
   ```ts
   { path: '/akademi/new-feature', requiredModule: 'module_name', requiredAction: 'view', visibility: 'coach', labelTr: 'Yeni Özellik' }
   ```
3. **Add tab config** to `AKADEMI_TABS` array in `akademi-mega.tsx` with matching `group` and `permissionModule`
4. **Add URL mapping** to `TAB_URL_MAP` in `akademi-mega.tsx`
5. **Add backend guard** using `requireAcademyCoach` / `requireAcademySupervisor` middleware or `hasPermission()` check
6. **Verify** all 3 view modes still work — coach, supervisor, employee

## Anti-Patterns
- Checking `role === 'coach'` directly instead of using `isAcademyCoach(role)` — breaks when new coach-tier roles are added.
- Adding permission checks in components without using the shared functions — creates drift.
- Granting permissions in one file but forgetting to update the route permission array — causes silent access denial.
