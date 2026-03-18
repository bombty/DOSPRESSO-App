import { db } from "../db";
import { moduleFlags } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { RequestHandler } from "express";

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const flagCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

function getCacheKey(moduleKey: string, branchId?: number | null, context?: string, userRole?: string | null): string {
  const parts = [moduleKey];
  if (branchId) parts.push(`branch:${branchId}`);
  if (userRole) parts.push(`role:${userRole}`);
  if (context) parts.push(`ctx:${context}`);
  return parts.join(":");
}

export function clearModuleFlagCache(): void {
  flagCache.clear();
}

export async function isModuleEnabled(
  moduleKey: string,
  branchId?: number | null,
  context?: "ui" | "api" | "data",
  userRole?: string | null
): Promise<boolean> {
  const cacheKey = getCacheKey(moduleKey, branchId, context, userRole);
  const now = Date.now();
  const cached = flagCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const flagRecord = await getFlagRecord(moduleKey, branchId, userRole);

    if (!flagRecord) {
      flagCache.set(cacheKey, { value: true, expiresAt: now + CACHE_TTL_MS });
      return true;
    }

    if (flagRecord.parentKey) {
      const parentEnabled = await isModuleEnabled(flagRecord.parentKey, branchId, context, userRole);
      if (!parentEnabled) {
        flagCache.set(cacheKey, { value: false, expiresAt: now + CACHE_TTL_MS });
        return false;
      }
    }

    let result: boolean;
    const behavior = flagRecord.flagBehavior || "fully_hidden";

    if (behavior === "always_on") {
      result = true;
    } else if (behavior === "ui_hidden_data_continues") {
      if (context === "data") {
        result = true;
      } else {
        result = flagRecord.effectiveEnabled;
      }
    } else {
      result = flagRecord.effectiveEnabled;
    }

    flagCache.set(cacheKey, { value: result, expiresAt: now + CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.error("[ModuleFlags] isModuleEnabled error:", error);
    return true;
  }
}

interface FlagRecord {
  flagBehavior: string;
  parentKey: string | null;
  effectiveEnabled: boolean;
}

async function getFlagRecord(moduleKey: string, branchId?: number | null, userRole?: string | null): Promise<FlagRecord | null> {
  const allFlags = await db
    .select()
    .from(moduleFlags)
    .where(
      and(
        eq(moduleFlags.moduleKey, moduleKey),
        isNull(moduleFlags.deletedAt)
      )
    );

  if (allFlags.length === 0) return null;

  let matched: typeof allFlags[0] | null = null;

  if (branchId && userRole) {
    matched = allFlags.find(f =>
      f.scope === "branch" && f.branchId === branchId && f.targetRole === userRole
    ) ?? null;
  }

  if (!matched && branchId) {
    matched = allFlags.find(f =>
      f.scope === "branch" && f.branchId === branchId && !f.targetRole
    ) ?? null;
  }

  if (!matched && userRole) {
    matched = allFlags.find(f =>
      f.scope === "global" && !f.branchId && f.targetRole === userRole
    ) ?? null;
  }

  if (!matched) {
    matched = allFlags.find(f =>
      f.scope === "global" && !f.branchId && !f.targetRole
    ) ?? null;
  }

  if (!matched) return null;

  return {
    flagBehavior: matched.flagBehavior,
    parentKey: matched.parentKey,
    effectiveEnabled: matched.isEnabled,
  };
}

export function requireModuleEnabled(moduleKey: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = req.user as Express.User;
      const branchId = (user as any)?.branchId ?? null;
      const userRole = (user as any)?.role ?? null;
      const enabled = await isModuleEnabled(moduleKey, branchId, "api", userRole);
      if (!enabled) {
        return res.status(403).json({ error: "Bu modül şubeniz için aktif değildir." });
      }
      next();
    } catch (error) {
      console.error("[ModuleFlags] requireModuleEnabled error:", error);
      return res.status(503).json({ error: "Modül durumu kontrol edilemedi. Lütfen tekrar deneyin." });
    }
  };
}

export async function getModuleFlagBehavior(moduleKey: string): Promise<string> {
  try {
    const [globalFlag] = await db
      .select({ flagBehavior: moduleFlags.flagBehavior })
      .from(moduleFlags)
      .where(
        and(
          eq(moduleFlags.moduleKey, moduleKey),
          eq(moduleFlags.scope, "global"),
          isNull(moduleFlags.branchId),
          isNull(moduleFlags.deletedAt)
        )
      )
      .limit(1);

    return globalFlag?.flagBehavior || "fully_hidden";
  } catch (error) {
    console.error("[ModuleFlags] getModuleFlagBehavior error:", error);
    return "fully_hidden";
  }
}

export const PATH_TO_MODULE_KEY_MAP: Record<string, string> = {
  "/checklistler": "checklist",
  "/crm": "crm",
  "/akademi": "akademi",
  "/fabrika": "fabrika",
  "/devam-takibi": "pdks",
  "/vardiyalar": "vardiya",
  "/sube/siparis-stok": "stok",
  "/sube-stok": "stok",
  "/raporlar": "raporlar",
  "/ekipman": "ekipman",
  "/ariza": "ekipman",
  "/gorevler": "gorevler",
  "/finans": "finans",
  "/muhasebe": "finans",
  "/satinalma": "satinalma",
  "/denetim": "denetim",
  "/kalite-denetim": "denetim",
  "/iletisim-merkezi": "iletisim_merkezi",
  "/delegasyon": "delegasyon",
  "/franchise": "franchise",
  "/fabrika/sevkiyat": "fabrika.sevkiyat",
  "/fabrika/stok-sayim": "fabrika.sayim",
  "/fabrika/maliyet-yonetimi": "fabrika.hammadde",
  "/fabrika/siparis-hazirlama": "fabrika.siparis",
  "/fabrika/vardiya-planlama": "fabrika.vardiya",
  "/fabrika/kalite-kontrol": "fabrika.kalite",
  "/fabrika/kavurma": "fabrika.kavurma",
};

export function getModuleKeyForPath(path: string): string | null {
  const sortedEntries = Object.entries(PATH_TO_MODULE_KEY_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [prefix, moduleKey] of sortedEntries) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return moduleKey;
    }
  }
  return null;
}
