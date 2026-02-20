import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, branches, tasks, equipment, checklists, recipes, trainingModules, shifts } from "@shared/schema";
import { eq, isNotNull, desc, sql, and, like, ilike } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { createAuditEntry, getAuditContext } from "../audit";

const router = Router();

const SOFT_DELETE_TABLES: Record<string, { table: any; label: string; nameField: string }> = {
  users: { table: users, label: "Kullanıcılar", nameField: "firstName" },
  branches: { table: branches, label: "Şubeler", nameField: "name" },
  tasks: { table: tasks, label: "Görevler", nameField: "title" },
  equipment: { table: equipment, label: "Ekipmanlar", nameField: "name" },
  checklists: { table: checklists, label: "Kontrol Listeleri", nameField: "title" },
  recipes: { table: recipes, label: "Tarifler", nameField: "name" },
  training_modules: { table: trainingModules, label: "Eğitim Modülleri", nameField: "title" },
  shifts: { table: shifts, label: "Vardiyalar", nameField: "shiftType" },
};

function isAdmin(req: Request): boolean {
  const user = req.user as any;
  return user?.role === "admin" || user?.role === "genel_mudur";
}

router.get("/api/trash/tables", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Yetki yok" });

  try {
    const counts: { key: string; label: string; count: number }[] = [];
    for (const [key, { table, label }] of Object.entries(SOFT_DELETE_TABLES)) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(table)
        .where(isNotNull(table.deletedAt));
      counts.push({ key, label, count: result[0]?.count || 0 });
    }
    res.json(counts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/trash/:tableName", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Yetki yok" });

  const { tableName } = req.params;
  const entry = SOFT_DELETE_TABLES[tableName];
  if (!entry) return res.status(400).json({ error: "Geçersiz tablo" });

  try {
    const rows = await db
      .select()
      .from(entry.table)
      .where(isNotNull(entry.table.deletedAt))
      .orderBy(desc(entry.table.deletedAt))
      .limit(100);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/trash/:tableName/:id/restore", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Yetki yok" });

  const { tableName, id } = req.params;
  const entry = SOFT_DELETE_TABLES[tableName];
  if (!entry) return res.status(400).json({ error: "Geçersiz tablo" });

  try {
    const idValue = tableName === "users" || tableName === "branches" ? id : parseInt(id);
    const existing = await db
      .select()
      .from(entry.table)
      .where(and(eq(entry.table.id, idValue as any), isNotNull(entry.table.deletedAt)));
    if (!existing.length) return res.status(404).json({ error: "Kayıt bulunamadı" });

    await db.update(entry.table).set({ deletedAt: null }).where(eq(entry.table.id, idValue as any));

    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.restore",
      action: "restore",
      resource: tableName,
      resourceId: String(id),
      details: { restoredFrom: "trash", tableName },
    });

    res.json({ success: true, message: "Kayıt geri yüklendi" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/trash/:tableName/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Yetki yok" });

  const { tableName, id } = req.params;
  const entry = SOFT_DELETE_TABLES[tableName];
  if (!entry) return res.status(400).json({ error: "Geçersiz tablo" });

  try {
    const idValue = tableName === "users" || tableName === "branches" ? id : parseInt(id);
    const existing = await db
      .select()
      .from(entry.table)
      .where(and(eq(entry.table.id, idValue as any), isNotNull(entry.table.deletedAt)));
    if (!existing.length) return res.status(404).json({ error: "Kayıt bulunamadı veya çöp kutusunda değil" });

    await db.delete(entry.table).where(eq(entry.table.id, idValue as any));

    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.hard_delete",
      action: "permanent_delete",
      resource: tableName,
      resourceId: String(id),
      before: existing[0],
      details: { permanentDelete: true, tableName },
    });

    res.json({ success: true, message: "Kayıt kalıcı olarak silindi" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
