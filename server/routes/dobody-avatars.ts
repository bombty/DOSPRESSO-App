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

function getTurkeyHour(): number {
  const now = new Date();
  const turkeyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  return turkeyTime.getHours() + turkeyTime.getMinutes() / 60;
}

function isInTimeWindow(
  timeStart: string | null,
  timeEnd: string | null,
  currentHour: number
): boolean {
  if (!timeStart || !timeEnd) return true;

  const [startH, startM] = timeStart.split(":").map(Number);
  const [endH, endM] = timeEnd.split(":").map(Number);
  const start = startH + (startM || 0) / 60;
  const end = endH + (endM || 0) / 60;

  if (start <= end) {
    return currentHour >= start && currentHour < end;
  }
  return currentHour >= start || currentHour < end;
}

function isForRole(
  roles: string[] | null,
  userRole: string | undefined
): boolean {
  if (!roles || roles.length === 0) return true;
  if (!userRole) return true;
  return roles.includes(userRole);
}

router.get("/api/dobody/avatars", isAuthenticated, async (req, res) => {
  try {
    const avatars = await getActiveAvatars();
    const userRole = req.user?.role as string | undefined;
    const currentHour = getTurkeyHour();

    const filtered = avatars.filter(
      (a) =>
        isInTimeWindow(a.timeStart, a.timeEnd, currentHour) &&
        isForRole(a.roles, userRole)
    );

    res.json(
      filtered.map((a) => ({
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

router.get("/api/dobody/avatars/random", isAuthenticated, async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const userRole = req.user?.role as string | undefined;
    const currentHour = getTurkeyHour();

    let avatars = await getActiveAvatars();
    avatars = avatars.filter(
      (a) =>
        isInTimeWindow(a.timeStart, a.timeEnd, currentHour) &&
        isForRole(a.roles, userRole)
    );

    if (category && category !== "all") {
      const catFiltered = avatars.filter((a) => a.category === category);
      if (catFiltered.length > 0) avatars = catFiltered;
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

router.get("/api/admin/dobody/avatars", isAuthenticated, async (req, res) => {
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

router.post("/api/admin/dobody/avatars", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const data = insertDobodyAvatarSchema.parse(req.body);
    const [avatar] = await db.insert(dobodyAvatars).values(data).returning();
    invalidateAvatarCache();
    res.status(201).json(avatar);
  } catch (error: unknown) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:create");
  }
});

router.patch("/api/admin/dobody/avatars/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz ID" });
    }

    const hhmmPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const updateSchema = z.object({
      label: z.string().nullable().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
      imageUrl: z.string().optional(),
      timeStart: z.string().regex(hhmmPattern, "HH:MM formatında olmalı").nullable().optional(),
      timeEnd: z.string().regex(hhmmPattern, "HH:MM formatında olmalı").nullable().optional(),
      roles: z.array(z.string()).nullable().optional(),
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
  } catch (error: unknown) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:update");
  }
});

router.delete("/api/admin/dobody/avatars/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/admin/dobody/avatars/upload", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const hhmmUploadPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const bodySchema = z.object({
      imageUrl: z.string().min(1),
      label: z.string().optional(),
      category: z.string().default("general"),
      timeStart: z.string().regex(hhmmUploadPattern, "HH:MM formatında olmalı").nullable().optional(),
      timeEnd: z.string().regex(hhmmUploadPattern, "HH:MM formatında olmalı").nullable().optional(),
      roles: z.array(z.string()).nullable().optional(),
    });

    const { imageUrl, label, category, timeStart, timeEnd, roles } = bodySchema.parse(req.body);

    const [avatar] = await db
      .insert(dobodyAvatars)
      .values({
        imageUrl,
        label: label || null,
        category,
        isActive: true,
        sortOrder: 0,
        timeStart: timeStart || null,
        timeEnd: timeEnd || null,
        roles: roles || null,
      })
      .returning();

    invalidateAvatarCache();
    res.status(201).json(avatar);
  } catch (error: unknown) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:upload");
  }
});

router.patch("/api/admin/dobody/avatars/bulk-update", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const bulkSchema = z.object({
      ids: z.array(z.number()).min(1),
      update: z.object({
        category: z.string().optional(),
        timeStart: z.string().nullable().optional(),
        timeEnd: z.string().nullable().optional(),
        roles: z.array(z.string()).nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    });

    const { ids, update } = bulkSchema.parse(req.body);

    for (const id of ids) {
      await db
        .update(dobodyAvatars)
        .set(update)
        .where(eq(dobodyAvatars.id, id));
    }

    invalidateAvatarCache();
    res.json({ updated: ids.length });
  } catch (error: unknown) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    handleApiError(res, error, "dobody-avatars:bulk-update");
  }
});

export default router;
