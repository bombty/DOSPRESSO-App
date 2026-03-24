import { Router, type Express } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  notificationPolicies,
  notificationPreferences,
  NOTIFICATION_CATEGORY_KEYS,
  NOTIFICATION_FREQUENCY_OPTIONS,
  type NotificationFrequency,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const HQ_ADMIN_ROLES = new Set(["admin", "ceo", "cgo"]);

function isHQAdmin(req: any, res: any, next: any) {
  if (!HQ_ADMIN_ROLES.has(req.user?.role)) {
    return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
  }
  next();
}

router.get("/api/notification-policies", isAuthenticated, isHQAdmin, async (req, res) => {
  try {
    const policies = await db.select().from(notificationPolicies);
    res.json(policies);
  } catch (error) {
    console.error("Notification policies fetch error:", error);
    res.status(500).json({ message: "Bildirim politikaları alınamadı" });
  }
});

const validCategories = NOTIFICATION_CATEGORY_KEYS as readonly string[];

const policyUpdateSchema = z.object({
  role: z.string().min(1),
  category: z.string().refine((v) => validCategories.includes(v), { message: "Geçersiz kategori" }),
  defaultFrequency: z.enum(NOTIFICATION_FREQUENCY_OPTIONS),
});

router.put("/api/notification-policies", isAuthenticated, isHQAdmin, async (req, res) => {
  try {
    const parsed = policyUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const { role, category, defaultFrequency } = parsed.data;

    await db.execute(sql`
      INSERT INTO notification_policies (role, category, default_frequency, updated_at)
      VALUES (${role}, ${category}, ${defaultFrequency}, NOW())
      ON CONFLICT (role, category) DO UPDATE
      SET default_frequency = ${defaultFrequency}, updated_at = NOW()
    `);

    res.json({ success: true });
  } catch (error) {
    console.error("Notification policy update error:", error);
    res.status(500).json({ message: "Bildirim politikası güncellenemedi" });
  }
});

router.put("/api/notification-policies/bulk", isAuthenticated, isHQAdmin, async (req, res) => {
  try {
    const bulkSchema = z.array(policyUpdateSchema);
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri" });
    }

    for (const item of parsed.data) {
      await db.execute(sql`
        INSERT INTO notification_policies (role, category, default_frequency, updated_at)
        VALUES (${item.role}, ${item.category}, ${item.defaultFrequency}, NOW())
        ON CONFLICT (role, category) DO UPDATE
        SET default_frequency = ${item.defaultFrequency}, updated_at = NOW()
      `);
    }

    res.json({ success: true, count: parsed.data.length });
  } catch (error) {
    console.error("Bulk notification policy error:", error);
    res.status(500).json({ message: "Toplu politika güncellemesi başarısız" });
  }
});

router.get("/api/notification-preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const prefs = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    res.json(prefs);
  } catch (error) {
    console.error("Notification preferences fetch error:", error);
    res.status(500).json({ message: "Bildirim tercihleri alınamadı" });
  }
});

const NEVER_DISABLE_CATEGORIES: string[] = [];

const prefUpdateSchema = z.object({
  category: z.string().refine((v) => validCategories.includes(v), { message: "Geçersiz kategori" }),
  frequency: z.enum(NOTIFICATION_FREQUENCY_OPTIONS),
});

router.put("/api/notification-preferences", isAuthenticated, async (req, res) => {
  try {
    const parsed = prefUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri" });
    }

    const userId = req.user.id;
    const { category, frequency } = parsed.data;

    await db.execute(sql`
      INSERT INTO notification_preferences (user_id, category, frequency, updated_at)
      VALUES (${userId}, ${category}, ${frequency}, NOW())
      ON CONFLICT (user_id, category) DO UPDATE
      SET frequency = ${frequency}, updated_at = NOW()
    `);

    res.json({ success: true });
  } catch (error) {
    console.error("Notification preference update error:", error);
    res.status(500).json({ message: "Bildirim tercihi güncellenemedi" });
  }
});

router.put("/api/notification-preferences/bulk", isAuthenticated, async (req, res) => {
  try {
    const bulkSchema = z.array(prefUpdateSchema);
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri" });
    }

    const userId = req.user.id;

    for (const item of parsed.data) {
      await db.execute(sql`
        INSERT INTO notification_preferences (user_id, category, frequency, updated_at)
        VALUES (${userId}, ${item.category}, ${item.frequency}, NOW())
        ON CONFLICT (user_id, category) DO UPDATE
        SET frequency = ${item.frequency}, updated_at = NOW()
      `);
    }

    res.json({ success: true, count: parsed.data.length });
  } catch (error) {
    console.error("Bulk preference update error:", error);
    res.status(500).json({ message: "Toplu tercih güncellemesi başarısız" });
  }
});

router.get("/api/notification-preferences/effective", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const [userPrefs, rolePolicies] = await Promise.all([
      db.select().from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId)),
      db.select().from(notificationPolicies)
        .where(eq(notificationPolicies.role, userRole)),
    ]);

    const userPrefsMap = new Map(userPrefs.map(p => [p.category, p.frequency]));
    const policyMap = new Map(rolePolicies.map(p => [p.category, p.defaultFrequency]));

    const effective = NOTIFICATION_CATEGORY_KEYS.map(cat => ({
      category: cat,
      frequency: (userPrefsMap.get(cat) || policyMap.get(cat) || 'instant') as NotificationFrequency,
      source: userPrefsMap.has(cat) ? 'user' : policyMap.has(cat) ? 'policy' : 'default',
    }));

    res.json(effective);
  } catch (error) {
    console.error("Effective preferences error:", error);
    res.status(500).json({ message: "Etkin tercihler alınamadı" });
  }
});

router.get("/api/notification-templates", isAuthenticated, async (_req, res) => {
  try {
    const { getAvailableTemplates } = await import("../lib/dobody-action-templates");
    res.json(getAvailableTemplates());
  } catch (error) {
    console.error("Templates fetch error:", error);
    res.status(500).json({ message: "Şablonlar alınamadı" });
  }
});

export function registerNotificationPreferenceRoutes(app: Express) {
  app.use(router);
}
