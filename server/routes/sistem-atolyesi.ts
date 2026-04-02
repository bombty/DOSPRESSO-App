import { Router, Request, Response } from "express";
import { db } from "../db";
import { workshopNotes, insertWorkshopNoteSchema, updateWorkshopNoteSchema } from "@shared/schema";
import { ALL_MODULES } from "@shared/module-manifest";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const ALLOWED_ROLES = new Set(["admin", "ceo", "cgo", "coach", "trainer"]);

const router = Router();

function isAllowed(req: Request): boolean {
  const user = req.user as any;
  return ALLOWED_ROLES.has(user?.role);
}

// GET /api/sistem-atolyesi/metadata — Canlı sistem verisi
router.get("/api/sistem-atolyesi/metadata", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Erişim yok" });
  try {
    // 1. Kullanıcı rol dağılımı
    const roleCountsRaw = await db.execute(sql`
      SELECT role, count(*)::int as count FROM users 
      WHERE is_active = true GROUP BY role ORDER BY count DESC
    `);
    const roleCounts = ((roleCountsRaw as any).rows || []).reduce((acc: any, r: any) => {
      acc[r.role] = r.count;
      return acc;
    }, {});

    // 2. Şube sayısı
    const branchCountRaw = await db.execute(sql`SELECT count(*)::int as count FROM branches WHERE is_active = true`);
    const branchCount = ((branchCountRaw as any).rows || [])[0]?.count || 0;

    // 3. Tablo sayısı
    const tableCountRaw = await db.execute(sql`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = ((tableCountRaw as any).rows || [])[0]?.count || 0;

    // 4. Modül manifest (canlı)
    const modules = ALL_MODULES.map(m => ({
      id: m.id,
      name: m.name,
      flagKey: m.flagKey,
      subModuleCount: m.subModules.length,
      subModules: m.subModules.map(sm => ({
        id: sm.id,
        name: sm.name,
        path: sm.path,
        canDisable: sm.canDisable,
      })),
      roles: Object.entries(m.roles).map(([role, access]) => ({
        role,
        view: (access as any).view,
        create: (access as any).create,
        edit: (access as any).edit,
        delete: (access as any).delete,
        approve: (access as any).approve,
        scope: (access as any).scope,
      })),
    }));

    res.json({
      modules,
      roleCounts,
      branchCount,
      tableCount,
      totalModules: ALL_MODULES.length,
      totalSubModules: ALL_MODULES.reduce((s, m) => s + m.subModules.length, 0),
      totalRoles: Object.keys(roleCounts).length,
    });
  } catch (err) {
    console.error("[SistemAtolyesi] metadata error:", err);
    res.status(500).json({ error: "Sistem verisi alınamadı" });
  }
});

router.get("/api/sistem-atolyesi/notlar", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  try {
    const notes = await db
      .select()
      .from(workshopNotes)
      .where(eq(workshopNotes.userId, user.id))
      .orderBy(desc(workshopNotes.createdAt));
    res.json(notes);
  } catch (err) {
    console.error("[SistemAtolyesi] GET notlar error:", err);
    res.status(500).json({ error: "Notlar yüklenirken hata oluştu." });
  }
});

router.post("/api/sistem-atolyesi/notlar", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const parsed = insertWorkshopNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [note] = await db
      .insert(workshopNotes)
      .values({ ...parsed.data, userId: user.id })
      .returning();
    res.status(201).json(note);
  } catch (err) {
    console.error("[SistemAtolyesi] POST notlar error:", err);
    res.status(500).json({ error: "Not oluşturulurken hata oluştu." });
  }
});

router.patch("/api/sistem-atolyesi/notlar/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID." });
  const parsed = updateWorkshopNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [note] = await db
      .update(workshopNotes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, user.id)))
      .returning();
    if (!note) return res.status(404).json({ error: "Not bulunamadı." });
    res.json(note);
  } catch (err) {
    console.error("[SistemAtolyesi] PATCH notlar error:", err);
    res.status(500).json({ error: "Not güncellenirken hata oluştu." });
  }
});

router.delete("/api/sistem-atolyesi/notlar/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID." });
  try {
    const [deleted] = await db
      .delete(workshopNotes)
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, user.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not bulunamadı." });
    res.json({ success: true });
  } catch (err) {
    console.error("[SistemAtolyesi] DELETE notlar error:", err);
    res.status(500).json({ error: "Not silinirken hata oluştu." });
  }
});

export default router;
