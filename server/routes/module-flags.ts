import { Router, Request, Response } from "express";
import { db } from "../db";
import { moduleFlags } from "@shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { isModuleEnabled, clearModuleFlagCache } from "../services/module-flag-service";

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

    const globalFlags = allFlags.filter(f => f.scope === "global");
    const branchFlags = allFlags.filter(f => f.scope === "branch" && f.branchId === branchId);

    const effectiveFlags = globalFlags.map(gf => {
      const branchOverride = branchFlags.find(bf => bf.moduleKey === gf.moduleKey);
      return {
        moduleKey: gf.moduleKey,
        globalEnabled: gf.isEnabled,
        branchOverride: branchOverride ? branchOverride.isEnabled : null,
        effectiveEnabled: branchOverride ? branchOverride.isEnabled : gf.isEnabled,
        globalFlagId: gf.id,
        branchFlagId: branchOverride?.id ?? null,
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

    const { moduleKey, branchId, isEnabled } = req.body;

    if (!moduleKey || typeof moduleKey !== "string") {
      return res.status(400).json({ error: "moduleKey alanı zorunludur." });
    }
    if (!branchId || typeof branchId !== "number") {
      return res.status(400).json({ error: "branchId alanı zorunludur (şube override için)." });
    }
    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ error: "isEnabled alanı boolean olmalıdır." });
    }

    const user = req.user as any;

    const [existing] = await db
      .select()
      .from(moduleFlags)
      .where(
        and(
          eq(moduleFlags.moduleKey, moduleKey),
          eq(moduleFlags.scope, "branch"),
          eq(moduleFlags.branchId, branchId),
          isNull(moduleFlags.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Bu şube için bu modülün override kaydı zaten mevcut." });
    }

    const [created] = await db
      .insert(moduleFlags)
      .values({
        moduleKey,
        scope: "branch",
        branchId,
        isEnabled,
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
    res.status(500).json({ error: "Şube override oluşturulurken hata oluştu." });
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

    if (existing.scope === "global") {
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
    res.status(500).json({ error: "Şube override silinirken hata oluştu." });
  }
});

router.get("/api/module-flags/check", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { moduleKey } = req.query;
    if (!moduleKey || typeof moduleKey !== "string") {
      return res.status(400).json({ error: "moduleKey parametresi zorunludur." });
    }

    const user = req.user as any;
    const branchId = user?.branchId ?? null;
    const enabled = await isModuleEnabled(moduleKey, branchId);

    res.json({ enabled });
  } catch (error) {
    console.error("[ModuleFlags] GET /check error:", error);
    res.status(500).json({ error: "Modül durumu kontrol edilirken hata oluştu." });
  }
});

export default router;
