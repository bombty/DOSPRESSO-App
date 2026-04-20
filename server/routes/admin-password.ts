/**
 * ═══════════════════════════════════════════════════════════════════
 * Admin Şifre Yönetimi — Şube/Kullanıcı Bazlı Sıfırlama
 *
 * Bağlam: Pilot için otomatik 0000 sıfırlamayı kapatıyoruz
 * (server/index.ts pilot_launched flag guard). Bunun yerine admin
 * panelinden kontrol edilebilir manuel sıfırlama.
 *
 * Endpointler:
 *   POST /api/admin/reset-branch-passwords  — Şube bazlı toplu sıfırlama
 *   POST /api/admin/reset-user-password     — Tek kullanıcı sıfırlama
 *
 * Yetki: admin, ceo, cgo, adminhq
 * Audit: Her sıfırlama audit_logs'a yazılır
 *
 * Hazırlayan: Claude (Pazartesi 20 Nis 2026)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Router, Response } from 'express';
import { db } from '../db';
import { sql, eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { users, branches, auditLogs } from '@shared/schema';
import { isAuthenticated } from '../localAuth';
import { critLog } from '../lib/crit-log';

const router = Router();

const ALLOWED_ROLES = ['admin', 'ceo', 'cgo', 'adminhq'];
const DEFAULT_PASSWORD = '0000';
const CONFIRM_TEXT = 'SIFIRLA';

function canAccess(role: string): boolean {
  return ALLOWED_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/admin/reset-branch-passwords
// Bir şubedeki tüm aktif kullanıcıların şifresini sıfırla
// Body: { branchId: number, confirmText: 'SIFIRLA' }
// ═══════════════════════════════════════════════════════════════════
router.post('/api/admin/reset-branch-passwords', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }

    const { branchId, confirmText } = req.body;

    if (!Number.isFinite(branchId) || branchId <= 0) {
      return res.status(400).json({ error: 'Geçersiz şube ID.' });
    }

    if (confirmText !== CONFIRM_TEXT) {
      return res.status(400).json({
        error: `Onay gerekli. Lütfen "${CONFIRM_TEXT}" yazın.`,
      });
    }

    // Şube var mı?
    const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
    if (!branch) {
      return res.status(404).json({ error: 'Şube bulunamadı.' });
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Şubedeki aktif kullanıcıların şifresini güncelle (admin hariç)
    const result = await db
      .update(users)
      .set({ hashedPassword })
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
        ne(users.username, 'admin'),
      ))
      .returning({ id: users.id, username: users.username });

    // Audit log
    await db.insert(auditLogs).values({
      eventType: 'admin.password_reset',
      userId: req.user.id,
      actorRole: req.user.role,
      scopeBranchId: branchId,
      action: 'admin.password_reset_branch',
      resource: 'users',
      resourceId: String(branchId),
      details: {
        branchName: branch.name,
        affectedCount: result.length,
        affectedUsernames: result.map(u => u.username),
      },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      reset_count: result.length,
      branch_id: branchId,
      branch_name: branch.name,
      message: `${branch.name} şubesindeki ${result.length} kullanıcının şifresi "${DEFAULT_PASSWORD}" olarak sıfırlandı.`,
    });
  } catch (error: any) {
    console.error('[admin-password] Branch reset error:', error);
    critLog('ADMIN-PASSWORD', 'Branch password reset failed', {
      branchId: req.body?.branchId,
      adminUserId: req.user?.id,
      error: error?.message || String(error),
    }, 'admin-password.ts:reset-branch').catch(() => {});
    return res.status(500).json({ error: error?.message || 'Sıfırlama başarısız.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/admin/reset-user-password
// Tek bir kullanıcının şifresini sıfırla
// Body: { userId: string, confirmText: 'SIFIRLA' }
// ═══════════════════════════════════════════════════════════════════
router.post('/api/admin/reset-user-password', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }

    const { userId, confirmText } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Geçersiz kullanıcı ID.' });
    }

    if (confirmText !== CONFIRM_TEXT) {
      return res.status(400).json({
        error: `Onay gerekli. Lütfen "${CONFIRM_TEXT}" yazın.`,
      });
    }

    // Kullanıcı var mı?
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Admin kullanıcısının şifresi bu yöntemle sıfırlanamaz.' });
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await db
      .update(users)
      .set({ hashedPassword })
      .where(eq(users.id, userId));

    // Audit log
    await db.insert(auditLogs).values({
      eventType: 'admin.password_reset',
      userId: req.user.id,
      actorRole: req.user.role,
      scopeBranchId: user.branchId || null,
      action: 'admin.password_reset_user',
      resource: 'users',
      resourceId: userId,
      details: {
        targetUsername: user.username,
        targetUserName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      user_id: userId,
      username: user.username,
      message: `${user.firstName || user.username} kullanıcısının şifresi "${DEFAULT_PASSWORD}" olarak sıfırlandı.`,
    });
  } catch (error: any) {
    console.error('[admin-password] User reset error:', error);
    critLog('ADMIN-PASSWORD', 'User password reset failed', {
      userId: req.body?.userId,
      adminUserId: req.user?.id,
      error: error?.message || String(error),
    }, 'admin-password.ts:reset-user').catch(() => {});
    return res.status(500).json({ error: error?.message || 'Sıfırlama başarısız.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/admin/branches-for-password-reset
// UI dropdown için şube listesi (yetki kontrolü için ayrı endpoint)
// ═══════════════════════════════════════════════════════════════════
router.get('/api/admin/branches-for-password-reset', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    }

    const branchList = await db.execute(sql`
      SELECT 
        b.id, 
        b.name,
        COUNT(u.id) FILTER (WHERE u.is_active = true AND u.username != 'admin')::int as user_count
      FROM branches b
      LEFT JOIN users u ON u.branch_id = b.id
      GROUP BY b.id, b.name
      ORDER BY b.name
    `);

    return res.json({ branches: branchList.rows });
  } catch (error: any) {
    console.error('[admin-password] Branch list error:', error);
    return res.status(500).json({ error: error?.message || 'Şube listesi alınamadı.' });
  }
});

export default router;
