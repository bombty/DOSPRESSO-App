import { Router, Request, Response } from 'express';
import { db } from '../db';
import { moduleDepartments, moduleDepartmentTopics, insertModuleDepartmentSchema, insertModuleDepartmentTopicSchema } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { z } from 'zod';

type AuthRequest = Request & {
  user?: { id: string; role: string; };
};

const router = Router();

router.use(isAuthenticated);

const VALID_MODULE_KEYS = ['crm', 'akademi', 'fabrika', 'ik', 'raporlar'];

function isAdminRole(role: string): boolean {
  // F16 ✅ KAPANDI (3 May 2026, Wave B-2): Coach + Trainer module-content yazma yetkisi.
  // Daha önce sadece admin+ceo → içerik üretim darboğazı.
  // Coach/Trainer kendi domain'lerinde modül içeriği oluşturabilmeli.
  return ['admin', 'ceo', 'coach', 'trainer'].includes(role);
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get('/:moduleKey', async (req: any, res: Response) => {
  try {
    const { moduleKey } = req.params;
    if (!VALID_MODULE_KEYS.includes(moduleKey)) {
      return res.status(400).json({ error: 'Invalid moduleKey' });
    }
    const depts = await db
      .select()
      .from(moduleDepartments)
      .where(eq(moduleDepartments.moduleKey, moduleKey))
      .orderBy(asc(moduleDepartments.sortOrder));

    const result = await Promise.all(
      depts.map(async (dept) => {
        const topics = await db
          .select()
          .from(moduleDepartmentTopics)
          .where(eq(moduleDepartmentTopics.departmentId, dept.id))
          .orderBy(asc(moduleDepartmentTopics.sortOrder));
        return { ...dept, topics };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('[ModuleContent] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch module content' });
  }
});

router.post('/:moduleKey/departments', async (req: any, res: Response) => {
  try {
    if (!req.user?.role || !isAdminRole(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    const { moduleKey } = req.params;
    if (!VALID_MODULE_KEYS.includes(moduleKey)) {
      return res.status(400).json({ error: 'Invalid moduleKey' });
    }
    const body = z.object({
      name: z.string().min(1).max(200),
      icon: z.string().max(10).optional(),
    }).safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({ error: 'Geçersiz veri', details: body.error.flatten() });
    }

    const [created] = await db.insert(moduleDepartments)
      .values({ moduleKey, name: body.data.name, ...(body.data.icon ? { icon: body.data.icon } : {}) })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('[ModuleContent] POST dept error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.delete('/departments/:id', async (req: any, res: Response) => {
  try {
    if (!req.user?.role || !isAdminRole(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    await db.delete(moduleDepartments).where(eq(moduleDepartments.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('[ModuleContent] DELETE dept error:', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

router.post('/departments/:id/topics', async (req: any, res: Response) => {
  try {
    if (!req.user?.role || !isAdminRole(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    const departmentId = parseId(req.params.id);
    if (!departmentId) return res.status(400).json({ error: 'Invalid department id' });

    const body = z.object({
      label: z.string().min(1).max(200),
    }).safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({ error: 'Geçersiz veri', details: body.error.flatten() });
    }

    const [created] = await db.insert(moduleDepartmentTopics)
      .values({ departmentId, label: body.data.label })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('[ModuleContent] POST topic error:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

router.delete('/topics/:id', async (req: any, res: Response) => {
  try {
    if (!req.user?.role || !isAdminRole(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    await db.delete(moduleDepartmentTopics)
      .where(eq(moduleDepartmentTopics.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('[ModuleContent] DELETE topic error:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
