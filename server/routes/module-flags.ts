import { Router, Request, Response } from "express";
import { db } from "../db";
import { moduleFlags, UserRole } from "@shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { isModuleEnabled, clearModuleFlagCache, getModuleFlagBehavior } from "../services/module-flag-service";

const VALID_ROLES = new Set(Object.values(UserRole));

const router = Router();

function isAdminUser(req: Request): boolean {
  const user = req.user as any;
  return user?.role === "admin";
}

router.get("/api/module-flags", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    const flags = await db
      .select()
      .from(moduleFlags)
      .where(isNull(moduleFlags.deletedAt))
      .orderBy(moduleFlags.moduleKey, moduleFlags.scope);

    res.json(flags);
  } catch (error) {
    console.error("[ModuleFlags] GET / error:", error);
    res.status(500).json({ error: "Modül bayrakları yüklenirken hata oluştu." });
  }
});

router.get("/api/module-flags/branch/:branchId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ error: "Geçersiz şube ID." });
    }

    const allFlags = await db
      .select()
      .from(moduleFlags)
      .where(isNull(moduleFlags.deletedAt))
      .orderBy(moduleFlags.moduleKey);

    const globalFlags = allFlags.filter(f => f.scope === "global" && !f.targetRole);
    const branchFlags = allFlags.filter(f => f.scope === "branch" && f.branchId === branchId);
    const globalRoleFlags = allFlags.filter(f => f.scope === "global" && f.targetRole);

    const effectiveFlags = globalFlags.map(gf => {
      const branchOverride = branchFlags.find(bf => bf.moduleKey === gf.moduleKey && !bf.targetRole);
      const branchRoleOverrides = branchFlags.filter(bf => bf.moduleKey === gf.moduleKey && bf.targetRole);
      const globalRoleOverrides = globalRoleFlags.filter(grf => grf.moduleKey === gf.moduleKey);
      return {
        moduleKey: gf.moduleKey,
        flagLevel: gf.flagLevel,
        flagBehavior: gf.flagBehavior,
        parentKey: gf.parentKey,
        globalEnabled: gf.isEnabled,
        branchOverride: branchOverride ? branchOverride.isEnabled : null,
        effectiveEnabled: branchOverride ? branchOverride.isEnabled : gf.isEnabled,
        globalFlagId: gf.id,
        branchFlagId: branchOverride?.id ?? null,
        roleOverrides: [
          ...globalRoleOverrides.map(r => ({ scope: "global" as const, targetRole: r.targetRole, isEnabled: r.isEnabled, id: r.id })),
          ...branchRoleOverrides.map(r => ({ scope: "branch" as const, targetRole: r.targetRole, isEnabled: r.isEnabled, id: r.id })),
        ],
      };
    });

    res.json(effectiveFlags);
  } catch (error) {
    console.error("[ModuleFlags] GET /branch/:branchId error:", error);
    res.status(500).json({ error: "Şube modül bayrakları yüklenirken hata oluştu." });
  }
});

router.patch("/api/module-flags/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    const flagId = parseInt(req.params.id);
    if (isNaN(flagId)) {
      return res.status(400).json({ error: "Geçersiz flag ID." });
    }

    const { isEnabled } = req.body;
    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ error: "isEnabled alanı boolean olmalıdır." });
    }

    const user = req.user as any;
    const [existing] = await db
      .select()
      .from(moduleFlags)
      .where(and(eq(moduleFlags.id, flagId), isNull(moduleFlags.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Modül bayrağı bulunamadı." });
    }

    const updates: Record<string, any> = {
      isEnabled,
      updatedAt: new Date(),
    };

    if (isEnabled) {
      updates.enabledBy = user.id;
      updates.enabledAt = new Date();
      updates.disabledBy = null;
      updates.disabledAt = null;
    } else {
      updates.disabledBy = user.id;
      updates.disabledAt = new Date();
    }

    const [updated] = await db
      .update(moduleFlags)
      .set(updates)
      .where(eq(moduleFlags.id, flagId))
      .returning();

    clearModuleFlagCache();
    res.json(updated);
  } catch (error) {
    console.error("[ModuleFlags] PATCH /:id error:", error);
    res.status(500).json({ error: "Modül bayrağı güncellenirken hata oluştu." });
  }
});

router.post("/api/module-flags", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    const { moduleKey, branchId, isEnabled, targetRole } = req.body;

    if (!moduleKey || typeof moduleKey !== "string") {
      return res.status(400).json({ error: "moduleKey alanı zorunludur." });
    }
    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ error: "isEnabled alanı boolean olmalıdır." });
    }
    if (targetRole !== undefined && targetRole !== null && typeof targetRole !== "string") {
      return res.status(400).json({ error: "targetRole alanı string olmalıdır." });
    }
    if (targetRole && !VALID_ROLES.has(targetRole)) {
      return res.status(400).json({ error: `Geçersiz rol: ${targetRole}` });
    }

    const scope = branchId ? "branch" : "global";

    if (scope === "branch" && (typeof branchId !== "number" || isNaN(branchId))) {
      return res.status(400).json({ error: "branchId geçerli bir sayı olmalıdır." });
    }

    const user = req.user as any;

    const existingFlags = await db
      .select()
      .from(moduleFlags)
      .where(
        and(
          eq(moduleFlags.moduleKey, moduleKey),
          eq(moduleFlags.scope, scope),
          isNull(moduleFlags.deletedAt)
        )
      );

    const existing = existingFlags.find(f => {
      const matchBranch = scope === "global" ? !f.branchId : f.branchId === branchId;
      const matchRole = (targetRole ?? null) === (f.targetRole ?? null);
      return matchBranch && matchRole;
    });

    if (existing) {
      return res.status(409).json({ error: "Bu kombinasyon için override kaydı zaten mevcut." });
    }

    const [created] = await db
      .insert(moduleFlags)
      .values({
        moduleKey,
        scope,
        branchId: branchId ?? null,
        isEnabled,
        targetRole: targetRole ?? null,
        enabledBy: isEnabled ? user.id : null,
        enabledAt: isEnabled ? new Date() : null,
        disabledBy: !isEnabled ? user.id : null,
        disabledAt: !isEnabled ? new Date() : null,
      })
      .returning();

    clearModuleFlagCache();
    res.status(201).json(created);
  } catch (error) {
    console.error("[ModuleFlags] POST / error:", error);
    res.status(500).json({ error: "Override oluşturulurken hata oluştu." });
  }
});

router.delete("/api/module-flags/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz bulunmamaktadır." });
    }

    const flagId = parseInt(req.params.id);
    if (isNaN(flagId)) {
      return res.status(400).json({ error: "Geçersiz flag ID." });
    }

    const [existing] = await db
      .select()
      .from(moduleFlags)
      .where(and(eq(moduleFlags.id, flagId), isNull(moduleFlags.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Modül bayrağı bulunamadı." });
    }

    if (existing.scope === "global" && !existing.targetRole) {
      return res.status(400).json({ error: "Global bayraklar silinemez, sadece kapatılabilir." });
    }

    await db
      .update(moduleFlags)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(moduleFlags.id, flagId));

    clearModuleFlagCache();
    res.json({ success: true });
  } catch (error) {
    console.error("[ModuleFlags] DELETE /:id error:", error);
    res.status(500).json({ error: "Override silinirken hata oluştu." });
  }
});

router.get("/api/module-flags/my-flags", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const branchId = user?.branchId ?? null;
    const userRole = user?.role ?? null;

    const allFlags = await db
      .select()
      .from(moduleFlags)
      .where(isNull(moduleFlags.deletedAt));

    const uniqueKeys = [...new Set(allFlags.map(f => f.moduleKey))];
    const flags: Record<string, boolean> = {};
    for (const key of uniqueKeys) {
      flags[key] = await isModuleEnabled(key, branchId, "ui", userRole);
    }

    res.json({ flags });
  } catch (error) {
    console.error("[ModuleFlags] GET /my-flags error:", error);
    res.status(500).json({ error: "Modül bayrakları yüklenirken hata oluştu." });
  }
});

router.get("/api/module-flags/check", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { moduleKey, context } = req.query;
    if (!moduleKey || typeof moduleKey !== "string") {
      return res.status(400).json({ error: "moduleKey parametresi zorunludur." });
    }

    const validContexts = ["ui", "api", "data"];
    const flagContext = (typeof context === "string" && validContexts.includes(context))
      ? context as "ui" | "api" | "data"
      : "ui";

    const user = req.user as any;
    const branchId = user?.branchId ?? null;
    const userRole = user?.role ?? null;
    const enabled = await isModuleEnabled(moduleKey, branchId, flagContext, userRole);

    res.json({ enabled });
  } catch (error) {
    console.error("[ModuleFlags] GET /check error:", error);
    res.status(500).json({ error: "Modül durumu kontrol edilirken hata oluştu." });
  }
});

export default router;
