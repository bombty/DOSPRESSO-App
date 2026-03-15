import { Router, Request, Response } from 'express';
import { db } from '../db';
import { moduleDelegations } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';

interface AuthenticatedUser {
  id: string;
  role: string;
  branchId: number | null;
  name: string | null;
}

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const router = Router();

router.use(isAuthenticated);

function isAdminRole(role: string): boolean {
  return ['admin', 'ceo'].includes(role);
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole || !isAdminRole(userRole)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    const delegations = await db
      .select()
      .from(moduleDelegations)
      .orderBy(desc(moduleDelegations.createdAt));
    res.json(delegations);
  } catch (err) {
    console.error('[Delegation] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch delegations' });
  }
});

router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole) return res.json([]);

    const now = new Date();
    const active = await db
      .select()
      .from(moduleDelegations)
      .where(
        and(
          eq(moduleDelegations.toRole, userRole),
          eq(moduleDelegations.isActive, true)
        )
      );

    const valid = active.filter(d => {
      if (d.delegationType === 'kalici') return true;
      if (!d.expiresAt) return true;
      return d.expiresAt > now;
    });

    res.json(valid);
  } catch (err) {
    console.error('[Delegation] GET /active error:', err);
    res.status(500).json({ error: 'Failed to fetch active delegations' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole || !isAdminRole(userRole)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const { moduleKey, moduleName, fromRole, toRole, delegationType, expiresAt, note } = req.body;
    const userId = req.user?.id;

    if (!moduleKey || !fromRole || !toRole || !delegationType) {
      return res.status(400).json({ error: 'moduleKey, fromRole, toRole, delegationType required' });
    }

    const existing = await db
      .select()
      .from(moduleDelegations)
      .where(
        and(
          eq(moduleDelegations.moduleKey, moduleKey),
          eq(moduleDelegations.isActive, true)
        )
      );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Bu modül zaten başka bir role devredilmiş. Önce mevcut delegasyonu kaldırın.'
      });
    }

    const [created] = await db.insert(moduleDelegations).values({
      moduleKey,
      moduleName: moduleName || moduleKey,
      fromRole,
      toRole,
      delegationType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note: note || null,
      createdBy: userId!,
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('[Delegation] POST / error:', err);
    res.status(500).json({ error: 'Failed to create delegation' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole || !isAdminRole(userRole)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const id = parseInt(req.params.id);
    const { isActive, expiresAt, note, toRole } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (note !== undefined) updateData.note = note;
    if (toRole) updateData.toRole = toRole;

    const [updated] = await db
      .update(moduleDelegations)
      .set(updateData)
      .where(eq(moduleDelegations.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Delegation not found' });
    res.json(updated);
  } catch (err) {
    console.error('[Delegation] PATCH /:id error:', err);
    res.status(500).json({ error: 'Failed to update delegation' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole || !isAdminRole(userRole)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    const id = parseInt(req.params.id);
    await db.delete(moduleDelegations).where(eq(moduleDelegations.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('[Delegation] DELETE /:id error:', err);
    res.status(500).json({ error: 'Failed to delete delegation' });
  }
});

export default router;
