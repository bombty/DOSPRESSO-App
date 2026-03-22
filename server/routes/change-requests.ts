import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import { dataChangeRequests, insertDataChangeRequestSchema } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { trackChange, createRevision } from '../services/data-lock';
import { getAuditContext, createAuditEntry } from '../audit';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';

const router = Router();

function isAdmin(req: Request): boolean {
  const user = req.user as any;
  return user && user.role === 'admin';
}

router.post('/api/change-requests', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const body = { ...req.body, requestedBy: user.id };
    const parsed = insertDataChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.errors });
    }

    const [created] = await db.insert(dataChangeRequests).values(parsed.data).returning();

    await createAuditEntry(getAuditContext(req), {
      eventType: 'change_request.created',
      action: 'create',
      resource: 'data_change_requests',
      resourceId: String(created.id),
      details: { tableName: parsed.data.tableName, recordId: parsed.data.recordId, fieldName: parsed.data.fieldName },
    });

    return res.status(201).json(created);
  } catch (error: unknown) {
    console.error('[change-requests] POST error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/api/change-requests', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const statusFilter = req.query.status as string | undefined;

    const conditions = [];
    if (!isAdmin(req)) {
      conditions.push(eq(dataChangeRequests.requestedBy, user.id));
    }
    if (statusFilter) {
      conditions.push(eq(dataChangeRequests.status, statusFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await db.select().from(dataChangeRequests)
      .where(whereClause)
      .orderBy(desc(dataChangeRequests.createdAt));

    return res.json(results);
  } catch (error: unknown) {
    console.error('[change-requests] GET list error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/api/change-requests/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const [record] = await db.select().from(dataChangeRequests).where(eq(dataChangeRequests.id, id));
    if (!record) return res.status(404).json({ error: 'Talep bulunamadı' });

    if (!isAdmin(req) && record.requestedBy !== user.id) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    return res.json(record);
  } catch (error: unknown) {
    console.error('[change-requests] GET detail error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.patch('/api/admin/change-requests/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const { status, reviewNote } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "status 'approved' veya 'rejected' olmalı" });
    }

    const [record] = await db.select().from(dataChangeRequests).where(eq(dataChangeRequests.id, id));
    if (!record) return res.status(404).json({ error: 'Talep bulunamadı' });

    if (record.status !== 'pending') {
      return res.status(400).json({ error: 'Bu talep zaten işlenmiş' });
    }

    const ALLOWED_TABLES: Record<string, string[]> = {
      purchase_orders: ['status', 'notes', 'expected_delivery_date'],
      purchase_order_items: ['quantity', 'unit_price', 'notes'],
      factory_production_outputs: ['quantity', 'waste_quantity', 'notes'],
      factory_session_events: ['notes'],
      branch_stock_movements: ['quantity', 'notes'],
      pdks_records: ['check_in_time', 'check_out_time', 'notes'],
      coffee_roasting_logs: ['notes', 'roast_level'],
      haccp_check_records: ['result', 'notes'],
      production_lots: ['notes', 'status'],
      payroll_records: ['notes'],
      monthly_payroll: ['notes'],
      customer_feedback: ['status', 'response_text'],
      factory_shipments: ['notes', 'status'],
    };

    if (!ALLOWED_TABLES[record.tableName] || !ALLOWED_TABLES[record.tableName].includes(record.fieldName)) {
      return res.status(400).json({ error: `${record.tableName}.${record.fieldName} alanı değişiklik talebiyle güncellenemez` });
    }

    const now = new Date();

    if (status === 'approved') {
      try {
        const verifyResult = await db.execute(
          sql`SELECT id FROM ${sql.identifier(record.tableName)} WHERE id = ${record.recordId}`
        );
        const verifyRows = verifyResult.rows || verifyResult;
        if (!Array.isArray(verifyRows) || verifyRows.length === 0) {
          return res.status(404).json({ error: 'Hedef kayıt bulunamadı' });
        }

        const updateResult = await db.execute(
          sql`UPDATE ${sql.identifier(record.tableName)} SET ${sql.identifier(record.fieldName)} = ${record.requestedValue} WHERE id = ${record.recordId}`
        );

        await trackChange(
          record.tableName,
          record.recordId,
          record.fieldName,
          record.currentValue,
          record.requestedValue,
          user.id,
          record.reason,
          record.id,
        );

        await createRevision(
          record.tableName,
          record.recordId,
          { [record.fieldName]: { old: record.currentValue, new: record.requestedValue } },
          user.id,
          'change_request',
          record.id,
        );
      } catch (updateErr) {
        console.error('[change-requests] Update error:', updateErr);
        return res.status(500).json({ error: 'Hedef kayıt güncellenemedi' });
      }
    }

    const [updated] = await db.update(dataChangeRequests)
      .set({
        status,
        reviewNote: reviewNote || null,
        reviewedBy: user.id,
        reviewedAt: now,
      })
      .where(eq(dataChangeRequests.id, id))
      .returning();

    if (record.requestedBy) {
      const statusText = status === 'approved' ? 'onaylandı' : 'reddedildi';
      await storage.createNotification({
        userId: record.requestedBy,
        type: 'change_request_review',
        title: 'Değişiklik Talebi Güncellendi',
        message: `${record.tableName} tablosundaki ${record.fieldName} alanı için değişiklik talebiniz ${statusText}.${reviewNote ? ` Not: ${reviewNote}` : ''}`,
        link: `/change-requests/${record.id}`,
      });
    }

    await createAuditEntry(getAuditContext(req), {
      eventType: `change_request.${status}`,
      action: status === 'approved' ? 'approve' : 'reject',
      resource: 'data_change_requests',
      resourceId: String(id),
      details: { status, reviewNote, tableName: record.tableName, recordId: record.recordId, fieldName: record.fieldName },
    });

    return res.json(updated);
  } catch (error: unknown) {
    console.error('[change-requests] PATCH error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
