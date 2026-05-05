// ═══════════════════════════════════════════════════════════════════
// Sprint 8 (5 May 2026) - Score Parameters API
// 
// Endpoints:
//   GET    /api/score-parameters           — Tüm parametreler (aktif olanlar)
//   GET    /api/score-parameters/:id       — Tek parametre detay
//   POST   /api/score-parameters           — Yeni parametre (admin)
//   PUT    /api/score-parameters/:id       — Güncelle (yeni versiyon)
//   DELETE /api/score-parameters/:id       — Pasifleştir
//   GET    /api/score-parameters/:id/history — Değişiklik geçmişi
// 
// Yetki: sadece admin/ceo
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import { scoreParameters, scoreParameterHistory } from '@shared/schema';
import { and, eq, sql, desc } from 'drizzle-orm';

const router = Router();

const ADMIN_ROLES = ['admin', 'ceo'];

function isAdmin(role: string): boolean { 
  return ADMIN_ROLES.includes(role); 
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/score-parameters — Tüm aktif parametreler
// ═══════════════════════════════════════════════════════════════════
router.get('/api/score-parameters', isAuthenticated, async (req: any, res: Response) => {
  try {
    const all = await db.select()
      .from(scoreParameters)
      .where(eq(scoreParameters.isActive, true))
      .orderBy(scoreParameters.sortOrder, scoreParameters.id);
    
    // Toplam max puan
    const totalMaxPoints = all.reduce((sum, p) => sum + (p.maxPoints || 0), 0);
    
    res.json({
      parameters: all,
      totalMaxPoints,
      count: all.length,
    });
  } catch (error: unknown) {
    console.error('/api/score-parameters error:', error);
    res.status(500).json({ message: 'Skor parametreleri alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/score-parameters/:id — Tek parametre detay
// ═══════════════════════════════════════════════════════════════════
router.get('/api/score-parameters/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [param] = await db.select().from(scoreParameters).where(eq(scoreParameters.id, id)).limit(1);
    if (!param) return res.status(404).json({ message: 'Parametre bulunamadı' });
    res.json(param);
  } catch (error: unknown) {
    res.status(500).json({ message: 'Parametre alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/score-parameters — Yeni parametre (admin)
// ═══════════════════════════════════════════════════════════════════
router.post('/api/score-parameters', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isAdmin(user.role)) {
      return res.status(403).json({ message: 'Skor parametresi eklemek için admin yetkisi gerekli' });
    }

    const body = {
      ...req.body,
      createdById: user.id,
      version: 1,
    };

    const [created] = await db.insert(scoreParameters).values(body).returning();
    
    // History kaydı
    await db.insert(scoreParameterHistory).values({
      parameterId: created.id,
      changeType: 'create',
      newValues: JSON.stringify(created),
      changedById: user.id,
    });
    
    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('/api/score-parameters POST error:', error);
    res.status(500).json({ message: 'Parametre eklenemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /api/score-parameters/:id — Güncelle (yeni versiyon)
// ═══════════════════════════════════════════════════════════════════
router.put('/api/score-parameters/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isAdmin(user.role)) {
      return res.status(403).json({ message: 'Skor parametresi düzenlemek için admin yetkisi gerekli' });
    }

    const id = parseInt(req.params.id);
    const [old] = await db.select().from(scoreParameters).where(eq(scoreParameters.id, id)).limit(1);
    if (!old) return res.status(404).json({ message: 'Parametre bulunamadı' });

    // Eski versiyonu pasifleştir
    await db.update(scoreParameters)
      .set({ isActive: false, effectiveTo: new Date() })
      .where(eq(scoreParameters.id, id));

    // Yeni versiyon ekle
    const [created] = await db.insert(scoreParameters).values({
      ...req.body,
      createdById: user.id,
      version: (old.version || 1) + 1,
      isActive: true,
    }).returning();

    // History
    await db.insert(scoreParameterHistory).values({
      parameterId: created.id,
      changeType: 'update',
      oldValues: JSON.stringify(old),
      newValues: JSON.stringify(created),
      reason: req.body.reason || null,
      changedById: user.id,
    });

    res.json(created);
  } catch (error: unknown) {
    console.error('/api/score-parameters PUT error:', error);
    res.status(500).json({ message: 'Parametre güncellenemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/score-parameters/:id — Pasifleştir
// ═══════════════════════════════════════════════════════════════════
router.delete('/api/score-parameters/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isAdmin(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const id = parseInt(req.params.id);
    await db.update(scoreParameters)
      .set({ isActive: false, effectiveTo: new Date() })
      .where(eq(scoreParameters.id, id));

    // History
    await db.insert(scoreParameterHistory).values({
      parameterId: id,
      changeType: 'deactivate',
      changedById: user.id,
    });

    res.status(204).send();
  } catch (error: unknown) {
    res.status(500).json({ message: 'Parametre pasifleştirilemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/score-parameters/:id/history — Değişiklik geçmişi
// ═══════════════════════════════════════════════════════════════════
router.get('/api/score-parameters/:id/history', isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const history = await db.select()
      .from(scoreParameterHistory)
      .where(eq(scoreParameterHistory.parameterId, id))
      .orderBy(desc(scoreParameterHistory.changedAt));
    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ message: 'Geçmiş alınamadı' });
  }
});

export default router;
