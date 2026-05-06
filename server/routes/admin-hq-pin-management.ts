/**
 * Sprint 10 P-7 — HQ Kiosk PIN Yönetimi Admin API
 * 
 * Pilot 18 May öncesi keşif: HQ users 19/19 phone_number = NULL.
 * branchStaffPins'ta zaten 19 bcrypt PIN var ama kimse PIN'lerini bilmiyor.
 * 
 * Bu router admin'e (Aslan) tek ekrandan PIN reset imkanı verir.
 * 
 * Endpoint'ler:
 *   GET  /api/admin/hq-users-pin-status     — 19 HQ user listesi + PIN durumu
 *   POST /api/admin/hq-users/:userId/reset-pin — Tekil PIN reset
 *   POST /api/admin/hq-users/bulk-pin-reset    — Çoklu PIN reset (max 25 user)
 */

import { Router } from 'express';
import { db } from '../db';
import { users, branchStaffPins, auditLogs } from '@shared/schema';
import { HQ_ROLES } from '../scheduler/hq-kiosk-pin-audit';
import { eq, and, inArray } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import bcrypt from 'bcrypt';
import { logger } from '../lib/logger';

const router = Router();

const HQ_BRANCH_ID = 23;
const ADMIN_ROLES = ['admin', 'ceo'] as const;

/**
 * GET /api/admin/hq-users-pin-status
 * 
 * 19 HQ user'ın PIN durumunu listele:
 *   - PIN var mı (branchStaffPins kaydı var mı)
 *   - Son güncelleme tarihi
 *   - Phone fallback durumu (phone NULL olanlar)
 */
router.get('/api/admin/hq-users-pin-status', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!ADMIN_ROLES.includes(user?.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    // HQ rolündeki tüm kullanıcılar
    const hqUsers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(
        inArray(users.role, [...HQ_ROLES] as string[]),
        eq(users.isActive, true)
      ));

    // Her biri için PIN durumu kontrol
    const userIds = hqUsers.map(u => u.id);
    const existingPins = userIds.length > 0
      ? await db
          .select({
            userId: branchStaffPins.userId,
            updatedAt: branchStaffPins.updatedAt,
          })
          .from(branchStaffPins)
          .where(and(
            inArray(branchStaffPins.userId, userIds),
            eq(branchStaffPins.branchId, HQ_BRANCH_ID)
          ))
      : [];

    const pinMap = new Map(existingPins.map(p => [p.userId, p.updatedAt]));

    const result = hqUsers.map(u => ({
      id: u.id,
      username: u.username,
      fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username,
      email: u.email,
      role: u.role,
      phoneNumber: u.phoneNumber,
      hasPin: pinMap.has(u.id),
      pinUpdatedAt: pinMap.get(u.id) || null,
      // Phone fallback: phone NULL ise eski sistem son 4 haneyi kullanamaz
      phoneFallbackPossible: !!u.phoneNumber && u.phoneNumber.length >= 4,
    }));

    // Sıralama: rol kategorisi sonra ad
    result.sort((a, b) => {
      const roleOrder = ['admin', 'ceo', 'cgo'];
      const aIdx = roleOrder.indexOf(a.role || '');
      const bIdx = roleOrder.indexOf(b.role || '');
      if (aIdx !== bIdx) {
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      }
      return a.fullName.localeCompare(b.fullName, 'tr');
    });

    return res.json({ users: result, total: result.length });
  } catch (error) {
    logger.error('HQ users PIN status fetch failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * POST /api/admin/hq-users/:userId/reset-pin
 * 
 * Tek bir HQ kullanıcı için PIN reset (4 haneli, bcrypt).
 * Audit log ile kayıt altına alınır.
 * 
 * Body: { pin: '1234' }
 */
router.post('/api/admin/hq-users/:userId/reset-pin', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!ADMIN_ROLES.includes(user?.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    const { userId } = req.params;
    const { pin } = req.body || {};

    if (!userId || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: '4 haneli sayısal PIN gerekli' });
    }

    // Hedef kullanıcı kontrolü
    const [targetUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (!HQ_ROLES.includes(targetUser.role as any)) {
      return res.status(400).json({
        message: 'Bu endpoint sadece HQ rolündeki kullanıcılar içindir',
      });
    }

    // Bcrypt hash
    const pinHash = await bcrypt.hash(pin, 10);

    // UPSERT: varsa update, yoksa insert
    const existing = await db
      .select({ id: branchStaffPins.id })
      .from(branchStaffPins)
      .where(and(
        eq(branchStaffPins.userId, userId),
        eq(branchStaffPins.branchId, HQ_BRANCH_ID)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(branchStaffPins)
        .set({ pinHash, updatedAt: new Date() })
        .where(eq(branchStaffPins.id, existing[0].id));
    } else {
      await db.insert(branchStaffPins).values({
        userId,
        branchId: HQ_BRANCH_ID,
        pinHash,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      eventType: 'kiosk.hq_pin_admin_reset',
      userId: user.id,
      actorRole: user.role,
      scopeBranchId: HQ_BRANCH_ID,
      action: 'kiosk.admin_reset_pin',
      resource: 'branch_staff_pins',
      resourceId: userId,
      targetResource: 'users',
      targetResourceId: userId,
      details: {
        type: 'HQ_KIOSK_PIN_ADMIN_RESET',
        targetUserId: userId,
        targetUserName: `${targetUser.firstName ?? ''} ${targetUser.lastName ?? ''}`.trim(),
        targetRole: targetUser.role,
        wasExisting: existing.length > 0,
        sprint: 'Sprint 10 P-7 (6 May 2026)',
      },
    });

    logger.info('HQ kiosk PIN reset', {
      adminId: user.id,
      adminRole: user.role,
      targetUserId: userId,
      targetRole: targetUser.role,
      wasExisting: existing.length > 0,
    });

    return res.json({
      success: true,
      message: 'PIN başarıyla sıfırlandı',
      userId,
      fullName: `${targetUser.firstName ?? ''} ${targetUser.lastName ?? ''}`.trim(),
    });
  } catch (error) {
    logger.error('HQ user PIN reset failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * POST /api/admin/hq-users/bulk-pin-reset
 * 
 * Çoklu HQ kullanıcı için PIN reset (max 25 user).
 * Her biri için ayrı audit log.
 * 
 * Body: { resets: [{ userId, pin }, ...] }
 */
router.post('/api/admin/hq-users/bulk-pin-reset', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!ADMIN_ROLES.includes(user?.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    const { resets } = req.body || {};
    if (!Array.isArray(resets) || resets.length === 0) {
      return res.status(400).json({ message: 'resets array boş olamaz' });
    }
    if (resets.length > 25) {
      return res.status(400).json({ message: 'Maksimum 25 kullanıcı tek seferde' });
    }

    // Validasyon
    const errors: Array<{ userId: string; error: string }> = [];
    for (const r of resets) {
      if (!r.userId || typeof r.pin !== 'string' || !/^\d{4}$/.test(r.pin)) {
        errors.push({ userId: r.userId || '<unknown>', error: '4 haneli sayısal PIN gerekli' });
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Geçersiz girdi', errors });
    }

    // Hedef kullanıcı kontrolü (tümü HQ rolünde mi?)
    const userIds = resets.map((r: any) => r.userId);
    const targetUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const userMap = new Map(targetUsers.map(u => [u.id, u]));

    for (const r of resets) {
      const target = userMap.get(r.userId);
      if (!target) {
        errors.push({ userId: r.userId, error: 'Kullanıcı bulunamadı' });
      } else if (!HQ_ROLES.includes(target.role as any)) {
        errors.push({ userId: r.userId, error: 'HQ rolünde değil' });
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validasyon hatası', errors });
    }

    // Her biri için PIN reset (paralel değil, audit sırası önemli)
    const results: Array<{ userId: string; fullName: string; success: boolean }> = [];
    for (const r of resets) {
      const target = userMap.get(r.userId)!;
      const pinHash = await bcrypt.hash(r.pin, 10);

      // UPSERT
      const existing = await db
        .select({ id: branchStaffPins.id })
        .from(branchStaffPins)
        .where(and(
          eq(branchStaffPins.userId, r.userId),
          eq(branchStaffPins.branchId, HQ_BRANCH_ID)
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(branchStaffPins)
          .set({ pinHash, updatedAt: new Date() })
          .where(eq(branchStaffPins.id, existing[0].id));
      } else {
        await db.insert(branchStaffPins).values({
          userId: r.userId,
          branchId: HQ_BRANCH_ID,
          pinHash,
        });
      }

      // Audit log
      await db.insert(auditLogs).values({
        eventType: 'kiosk.hq_pin_admin_bulk_reset',
        userId: user.id,
        actorRole: user.role,
        scopeBranchId: HQ_BRANCH_ID,
        action: 'kiosk.admin_bulk_reset_pin',
        resource: 'branch_staff_pins',
        resourceId: r.userId,
        targetResource: 'users',
        targetResourceId: r.userId,
        details: {
          type: 'HQ_KIOSK_PIN_ADMIN_BULK_RESET',
          targetUserId: r.userId,
          targetUserName: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim(),
          targetRole: target.role,
          wasExisting: existing.length > 0,
          batchSize: resets.length,
          sprint: 'Sprint 10 P-7 (6 May 2026)',
        },
      });

      results.push({
        userId: r.userId,
        fullName: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim(),
        success: true,
      });
    }

    logger.info('HQ kiosk bulk PIN reset', {
      adminId: user.id,
      adminRole: user.role,
      count: results.length,
    });

    return res.json({
      success: true,
      message: `${results.length} kullanıcının PIN'i başarıyla sıfırlandı`,
      results,
    });
  } catch (error) {
    logger.error('HQ users bulk PIN reset failed', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
