/**
 * ═══════════════════════════════════════════════════════════════════
 * Sprint E — Critical Logs Admin Routes
 *
 * 3 endpoint:
 *   GET  /api/admin/critical-logs           — Paginate list (filter tag/status)
 *   POST /api/admin/critical-logs/:id/ack   — "Gördüm" işaretle
 *   GET  /api/admin/critical-logs/summary   — 24h özet (dashboard widget için)
 *
 * Yetki: admin, ceo, cgo (pilot karar rolleri)
 *
 * Hazırlayan: Claude (Sprint E, 19 Nis 2026 gece)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Router, Response } from 'express';
import { db } from '../db';
import { sql, eq, and, gte, desc } from 'drizzle-orm';
import { systemCriticalLogs } from '@shared/schema';
import { isAuthenticated } from '../localAuth';

const router = Router();

const CRITICAL_LOG_ROLES = ['admin', 'ceo', 'cgo', 'adminhq'];

function canAccess(role: string): boolean {
  return CRITICAL_LOG_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/admin/critical-logs
// Query: ?tag=PDKS-SYNC&status=new&limit=50&offset=0&days=7
// ═══════════════════════════════════════════════════════════════════
router.get('/api/admin/critical-logs', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const tag = req.query.tag ? String(req.query.tag) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conditions = [gte(systemCriticalLogs.createdAt, since)];
    if (tag) conditions.push(eq(systemCriticalLogs.tag, tag));
    if (status) conditions.push(eq(systemCriticalLogs.status, status));

    const rows = await db
      .select()
      .from(systemCriticalLogs)
      .where(and(...conditions))
      .orderBy(desc(systemCriticalLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count (filter uygulanmış)
    const totalResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM system_critical_logs
      WHERE created_at >= ${since.toISOString()}::timestamptz
      ${tag ? sql`AND tag = ${tag}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
    `);
    const total = (totalResult.rows?.[0] as any)?.total || 0;

    res.json({
      logs: rows,
      total,
      limit,
      offset,
      filters: { tag, status, days },
    });
  } catch (error: any) {
    console.error('[Sprint E] critical-logs list error:', error);
    res.status(500).json({ error: error?.message || 'Listeleme hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/admin/critical-logs/:id/ack
// Admin "Gördüm" işaretler
// ═══════════════════════════════════════════════════════════════════
router.post('/api/admin/critical-logs/:id/ack', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Geçersiz id' });
    }

    const [updated] = await db
      .update(systemCriticalLogs)
      .set({
        status: 'acknowledged',
        acknowledgedById: req.user.id,
        acknowledgedAt: new Date(),
      })
      .where(eq(systemCriticalLogs.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Log bulunamadı' });
    }

    res.json({ success: true, log: updated });
  } catch (error: any) {
    console.error('[Sprint E] critical-logs ack error:', error);
    res.status(500).json({ error: error?.message || 'Ack hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/admin/critical-logs/summary
// Dashboard widget için 24h özet
// ═══════════════════════════════════════════════════════════════════
router.get('/api/admin/critical-logs/summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canAccess(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 24h: toplam, "new" durumunda
    const day24Result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_24h,
        COUNT(*) FILTER (WHERE status = 'new')::int AS unread_24h,
        COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged_24h
      FROM system_critical_logs
      WHERE created_at >= ${dayAgo.toISOString()}::timestamptz
    `);
    const day24 = (day24Result.rows?.[0] as any) || { total_24h: 0, unread_24h: 0, acknowledged_24h: 0 };

    // 7d tag dağılımı
    const tagResult = await db.execute(sql`
      SELECT tag, COUNT(*)::int AS count
      FROM system_critical_logs
      WHERE created_at >= ${weekAgo.toISOString()}::timestamptz
      GROUP BY tag
      ORDER BY count DESC
    `);

    // En son 5 unread (dashboard'da hızlı bakış)
    const recentUnread = await db
      .select({
        id: systemCriticalLogs.id,
        tag: systemCriticalLogs.tag,
        message: systemCriticalLogs.message,
        createdAt: systemCriticalLogs.createdAt,
      })
      .from(systemCriticalLogs)
      .where(eq(systemCriticalLogs.status, 'new'))
      .orderBy(desc(systemCriticalLogs.createdAt))
      .limit(5);

    res.json({
      last_24h: day24,
      last_7d_by_tag: tagResult.rows || [],
      recent_unread: recentUnread,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Sprint E] critical-logs summary error:', error);
    res.status(500).json({ error: error?.message || 'Özet hatası' });
  }
});

export default router;
