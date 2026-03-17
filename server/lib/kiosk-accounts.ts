import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const KIOSK_DEFAULT_PASSWORD = '0000';

export const BRANCH_KIOSK_ACCOUNTS = [
  { username: 'isiklar', firstName: 'Işıklar', branchId: 5 },
  { username: 'mallof', firstName: 'Antalya Mallof', branchId: 6 },
  { username: 'markantalya', firstName: 'Antalya Markantalya', branchId: 7 },
  { username: 'lara', firstName: 'Antalya Lara', branchId: 8 },
  { username: 'beachpark', firstName: 'Antalya Beachpark', branchId: 9 },
  { username: 'ibrahimli', firstName: 'Gaziantep İbrahimli', branchId: 10 },
  { username: 'ibnisina', firstName: 'Gaziantep İbnisina', branchId: 11 },
  { username: 'universite', firstName: 'Gaziantep Üniversite', branchId: 12 },
  { username: 'meram', firstName: 'Konya Meram', branchId: 13 },
  { username: 'bosna', firstName: 'Konya Bosna', branchId: 14 },
  { username: 'marina', firstName: 'Samsun Marina', branchId: 15 },
  { username: 'atakum', firstName: 'Samsun Atakum', branchId: 16 },
  { username: 'batman', firstName: 'Batman', branchId: 17 },
  { username: 'duzce', firstName: 'Düzce', branchId: 18 },
  { username: 'siirt', firstName: 'Siirt', branchId: 19 },
  { username: 'kilis', firstName: 'Kilis', branchId: 20 },
  { username: 'sanliurfa', firstName: 'Şanlıurfa', branchId: 21 },
  { username: 'nizip', firstName: 'Nizip', branchId: 22 },
] as const;

export const FABRIKA_KIOSK_ACCOUNT = {
  username: 'fabrika',
  firstName: 'Fabrika',
  branchId: 24,
  role: 'fabrika_operator' as const,
};

export interface KioskSeedResult {
  username: string;
  status: 'created' | 'updated';
}

export async function seedAllKioskAccounts(): Promise<KioskSeedResult[]> {
  const passwordHash = await bcrypt.hash(KIOSK_DEFAULT_PASSWORD, 10);
  const results: KioskSeedResult[] = [];

  const allAccounts = [
    { ...FABRIKA_KIOSK_ACCOUNT },
    ...BRANCH_KIOSK_ACCOUNTS.map(a => ({ ...a, role: 'sube_kiosk' as const })),
  ];

  for (const account of allAccounts) {
    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, account.username), isNull(users.deletedAt)))
      .limit(1);

    if (existing) {
      await db.update(users).set({
        role: account.role,
        isActive: true,
        branchId: account.branchId,
        firstName: account.firstName,
        lastName: 'Kiosk',
        hashedPassword: passwordHash,
        updatedAt: new Date(),
      }).where(eq(users.id, existing.id));
      results.push({ username: account.username, status: 'updated' });
    } else {
      await db.insert(users).values({
        id: crypto.randomUUID(),
        username: account.username,
        hashedPassword: passwordHash,
        role: account.role,
        firstName: account.firstName,
        lastName: 'Kiosk',
        branchId: account.branchId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      results.push({ username: account.username, status: 'created' });
    }
  }

  return results;
}
