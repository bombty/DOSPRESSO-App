export const DEFAULT_PASSWORD_RESET_ROLES: ReadonlySet<string> = new Set([
  'admin', 'coach', 'muhasebe_ik', 'ceo', 'cgo', 'trainer',
]);

export let passwordResetRoles: Set<string> = new Set(DEFAULT_PASSWORD_RESET_ROLES);
