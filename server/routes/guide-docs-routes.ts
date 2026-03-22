import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, asc, and } from "drizzle-orm";
import {
  guideDocs,
  insertGuideDocSchema,
} from "@shared/schema";

const router = Router();

  // ========================================
  // GUIDE DOCS (Kılavuz Dokümanları) CRUD
  // ========================================

  router.get('/api/guide-docs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { search, category } = req.query;
      let conditions: any[] = [eq(guideDocs.isPublished, true)];
      if (category) {
        conditions.push(eq(guideDocs.category, category as string));
      }
      const docs = await db.select().from(guideDocs).where(and(...conditions)).orderBy(asc(guideDocs.sortOrder), desc(guideDocs.createdAt));
      const filtered = docs.filter((d) => {
        if (!d.targetRoles || d.targetRoles.length === 0) return true;
        return d.targetRoles.includes(user.role);
      }).filter((d) => {
        if (!search) return true;
        const q = (search as string).toLocaleLowerCase('tr-TR');
        return d.title.toLocaleLowerCase('tr-TR').includes(q) || d.content.toLocaleLowerCase('tr-TR').includes(q);
      });
      res.json(filtered);
    } catch (error: unknown) {
      console.error("Guide docs list error:", error);
      res.status(500).json({ message: "Kılavuz dokümanları yüklenemedi" });
    }
  });

  router.get('/api/guide-docs/:id', isAuthenticated, async (req, res) => {
    try {
      const [doc] = await db.select().from(guideDocs).where(eq(guideDocs.id, parseInt(req.params.id)));
      if (!doc) return res.status(404).json({ message: "Doküman bulunamadı" });
      res.json(doc);
    } catch (error: unknown) {
      res.status(500).json({ message: "Doküman yüklenemedi" });
    }
  });

  router.post('/api/admin/guide-docs', isAuthenticated, async (req, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertGuideDocSchema.parse({ ...req.body, createdBy: req.user.id });
      const [doc] = await db.insert(guideDocs).values(body).returning();
      res.status(201).json(doc);
    } catch (error: unknown) {
      console.error("Guide doc create error:", error);
      res.status(400).json({ message: error.message || "Doküman oluşturulamadı" });
    }
  });

  router.put('/api/admin/guide-docs/:id', isAuthenticated, async (req, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [doc] = await db.update(guideDocs)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(guideDocs.id, parseInt(req.params.id)))
        .returning();
      if (!doc) return res.status(404).json({ message: "Doküman bulunamadı" });
      res.json(doc);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Güncelleme başarısız" });
    }
  });

  router.delete('/api/admin/guide-docs/:id', isAuthenticated, async (req, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      await db.update(guideDocs).set({ deletedAt: new Date() }).where(eq(guideDocs.id, parseInt(req.params.id)));
      const { createAuditEntry: createAudit, getAuditContext: getCtx } = await import("../audit");
      const ctx = getCtx(req);
      await createAudit(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "guide_docs",
        resourceId: String(req.params.id),
        details: { softDelete: true },
      });
      res.json({ message: "Doküman silindi" });
    } catch (error: unknown) {
      res.status(500).json({ message: "Silme başarısız" });
    }
  });


export default router;
