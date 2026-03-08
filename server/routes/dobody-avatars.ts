import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { z } from "zod";
import {
  dobodyAvatars,
  insertDobodyAvatarSchema,
  isHQRole,
  type UserRoleType,
  type DobodyAvatar,
} from "@shared/schema";
import { ObjectStorageService } from "../objectStorage";
import { handleApiError } from "./helpers";

const router = Router();
const objectStorageService = new ObjectStorageService();

let avatarCache: { data: DobodyAvatar[]; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function invalidateAvatarCache() {
  avatarCache = null;
}

async function getActiveAvatars(): Promise<DobodyAvatar[]> {
  if (avatarCache && avatarCache.expiresAt > Date.now()) {
    return avatarCache.data;
  }
  const avatars = await db
    .select()
    .from(dobodyAvatars)
    .where(eq(dobodyAvatars.isActive, true))
    .orderBy(asc(dobodyAvatars.sortOrder), asc(dobodyAvatars.id));
  avatarCache = { data: avatars, expiresAt: Date.now() + CACHE_TTL };
  return avatars;
}

router.get("/api/dobody/avatars", isAuthenticated, async (req: any, res) => {
  try {
    const avatars = await getActiveAvatars();
    res.json(
      avatars.map((a) => ({
        id: a.id,
        imageUrl: a.imageUrl,
        category: a.category,
        label: a.label,
      }))
    );
  } catch (error) {
    handleApiError(res, error, "dobody-avatars:list");
  }
});

router.get("/api/dobody/avatars/random", isAuthenticated, async (req: any, res) => {
  try {
    const category = req.query.category as string | undefined;
    let avatars = await getActiveAvatars();
    if (category && category !== "all") {
      avatars = avatars.filter((a) => a.category === category);
    }
    if (avatars.length === 0) {
      return res.json({ imageUrl: null });
    }
    const random = avatars[Math.floor(Math.random() * avatars.length)];
    res.json({ id: random.id, imageUrl: random.imageUrl, category: random.category });
  } catch (error) {
    handleApiError(res, error, "dobody-avatars:random");
  }
});

router.get("/api/admin/dobody/avatars", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const avatars = await db
      .select()
      .from(dobodyAvatars)
      .orderBy(asc(dobodyAvatars.sortOrder), asc(dobodyAvatars.id));
    res.json(avatars);
  } catch (error) {
    handleApiError(res, error, "dobody-avatars:admin-list");
  }
});

router.post("/api/admin/dobody/avatars", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const data = insertDobodyAvatarSchema.parse(req.body);
    const [avatar] = await db.insert(dobodyAvatars).values(data).returning();
    invalidateAvatarCache();
    res.status(201).json(avatar);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:create");
  }
});

router.patch("/api/admin/dobody/avatars/:id", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz ID" });
    }

    const updateSchema = z.object({
      label: z.string().nullable().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
      imageUrl: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);
    const [updated] = await db
      .update(dobodyAvatars)
      .set(data)
      .where(eq(dobodyAvatars.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Avatar bulunamadı" });
    }
    invalidateAvatarCache();
    res.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:update");
  }
});

router.delete("/api/admin/dobody/avatars/:id", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz ID" });
    }

    const hard = req.query.hard === "true";

    if (hard) {
      const [existing] = await db.select().from(dobodyAvatars).where(eq(dobodyAvatars.id, id));
      if (!existing) {
        return res.status(404).json({ message: "Avatar bulunamadı" });
      }
      if (existing.imageUrl && existing.imageUrl.startsWith("/objects/")) {
        try {
          await objectStorageService.deleteObjectEntity(existing.imageUrl);
        } catch (e) {
          console.error("Failed to delete object storage file:", e);
        }
      }
      await db.delete(dobodyAvatars).where(eq(dobodyAvatars.id, id));
    } else {
      const [updated] = await db
        .update(dobodyAvatars)
        .set({ isActive: false })
        .where(eq(dobodyAvatars.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: "Avatar bulunamadı" });
      }
    }

    invalidateAvatarCache();
    res.status(204).send();
  } catch (error) {
    handleApiError(res, error, "dobody-avatars:delete");
  }
});

router.post("/api/admin/dobody/avatars/upload", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const bodySchema = z.object({
      imageUrl: z.string().min(1),
      label: z.string().optional(),
      category: z.string().default("general"),
    });

    const { imageUrl, label, category } = bodySchema.parse(req.body);

    const [avatar] = await db
      .insert(dobodyAvatars)
      .values({
        imageUrl,
        label: label || null,
        category,
        isActive: true,
        sortOrder: 0,
      })
      .returning();

    invalidateAvatarCache();
    res.status(201).json(avatar);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:upload");
  }
});

export default router;
