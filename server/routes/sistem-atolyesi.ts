import { Router, Request, Response } from "express";
import { db } from "../db";
import { workshopNotes, insertWorkshopNoteSchema, updateWorkshopNoteSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const ALLOWED_ROLES = new Set(["admin", "ceo", "cgo", "coach", "trainer"]);

const router = Router();

function isAllowed(req: Request): boolean {
  const user = req.user as any;
  return ALLOWED_ROLES.has(user?.role);
}

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
