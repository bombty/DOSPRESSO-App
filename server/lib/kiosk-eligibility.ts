import { and, eq, isNull, notInArray } from 'drizzle-orm';
import { users } from '@shared/schema';
import { BRANCH_KIOSK_ACCOUNTS, FABRIKA_KIOSK_ACCOUNT } from './kiosk-accounts';

export const KIOSK_BLOCKED_ROLES = [
  'sube_kiosk',
  'admin',
  'ceo',
  'cgo',
  'yatirimci_branch',
  'yatirimci_hq',
] as const;

export const KIOSK_BLOCKED_USERNAMES: readonly string[] = Array.from(
  new Set<string>([
    FABRIKA_KIOSK_ACCOUNT.username,
    ...BRANCH_KIOSK_ACCOUNTS.map(a => a.username),
    'hqkiosk',
  ])
);

export function kioskEligibleWhere() {
  return and(
    eq(users.isActive, true),
    isNull(users.deletedAt),
    notInArray(users.role, KIOSK_BLOCKED_ROLES as unknown as string[]),
    notInArray(users.username, KIOSK_BLOCKED_USERNAMES as string[]),
  );
}

export type KioskEligibilityFailReason =
  | 'not_found'
  | 'inactive'
  | 'soft_deleted'
  | 'blocked_role'
  | 'blocked_username';

export interface KioskEligibilityResult {
  ok: boolean;
  reason?: KioskEligibilityFailReason;
}

export function checkKioskLoginEligibility(
  user:
    | {
        isActive?: boolean | null;
        deletedAt?: Date | string | null;
        role?: string | null;
        username?: string | null;
      }
    | null
    | undefined,
): KioskEligibilityResult {
  if (!user) return { ok: false, reason: 'not_found' };
  if (user.isActive !== true) return { ok: false, reason: 'inactive' };
  if (user.deletedAt) return { ok: false, reason: 'soft_deleted' };
  if (user.role && (KIOSK_BLOCKED_ROLES as readonly string[]).includes(user.role)) {
    return { ok: false, reason: 'blocked_role' };
  }
  if (user.username && KIOSK_BLOCKED_USERNAMES.includes(user.username)) {
    return { ok: false, reason: 'blocked_username' };
  }
  return { ok: true };
}

export const KIOSK_GENERIC_LOGIN_ERROR = 'Hatalı PIN veya yetkisiz giriş';
