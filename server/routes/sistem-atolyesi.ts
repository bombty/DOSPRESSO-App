import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { workshopNotes, insertWorkshopNoteSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
const ALLOWED_ROLES = ["admin", "ceo", "cgo", "coach", "trainer"];

function isWorkshopRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role);
}

// GET /api/workshop/notes
router.get("/api/workshop/notes", isAuthenticated, async (req, res) => {
  try {
    if (!isWorkshopRole(req.user.role)) return res.status(403).json({ message: "Erişim yok" });
    const notes = await db.select().from(workshopNotes)
      .where(eq(workshopNotes.userId, req.user.id))
      .orderBy(desc(workshopNotes.createdAt));
    res.json(notes);
  } catch (e) {
    res.status(500).json({ message: "Notlar alınamadı" });
  }
});

// POST /api/workshop/notes
router.post("/api/workshop/notes", isAuthenticated, async (req, res) => {
  try {
    if (!isWorkshopRole(req.user.role)) return res.status(403).json({ message: "Erişim yok" });
    const data = insertWorkshopNoteSchema.parse(req.body);
    const [note] = await db.insert(workshopNotes).values({ ...data, userId: req.user.id }).returning();
    res.json(note);
  } catch (e) {
    res.status(400).json({ message: "Not oluşturulamadı" });
  }
});

// PATCH /api/workshop/notes/:id
router.patch("/api/workshop/notes/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isWorkshopRole(req.user.role)) return res.status(403).json({ message: "Erişim yok" });
    const id = parseInt(req.params.id);
    const { title, content, section } = req.body;
    const [note] = await db.update(workshopNotes)
      .set({ title, content, section, updatedAt: new Date() })
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, req.user.id)))
      .returning();
    if (!note) return res.status(404).json({ message: "Not bulunamadı" });
    res.json(note);
  } catch (e) {
    res.status(500).json({ message: "Not güncellenemedi" });
  }
});

// DELETE /api/workshop/notes/:id
router.delete("/api/workshop/notes/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isWorkshopRole(req.user.role)) return res.status(403).json({ message: "Erişim yok" });
    const id = parseInt(req.params.id);
    await db.delete(workshopNotes)
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, req.user.id)));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Not silinemedi" });
  }
});

export default router;
