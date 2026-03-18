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

function getCacheKey(moduleKey: string, branchId?: number | null): string {
  return branchId ? `${moduleKey}:branch:${branchId}` : `${moduleKey}:global`;
}

export function clearModuleFlagCache(): void {
  flagCache.clear();
}

export async function isModuleEnabled(moduleKey: string, branchId?: number | null): Promise<boolean> {
  const cacheKey = getCacheKey(moduleKey, branchId);
  const now = Date.now();
  const cached = flagCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    if (branchId) {
      const [branchFlag] = await db
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

      if (branchFlag) {
        flagCache.set(cacheKey, { value: branchFlag.isEnabled, expiresAt: now + CACHE_TTL_MS });
        return branchFlag.isEnabled;
      }
    }

    const [globalFlag] = await db
      .select()
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

    const enabled = globalFlag ? globalFlag.isEnabled : true;
    flagCache.set(cacheKey, { value: enabled, expiresAt: now + CACHE_TTL_MS });
    return enabled;
  } catch (error) {
    console.error("[ModuleFlags] isModuleEnabled error:", error);
    return true;
  }
}

export function requireModuleEnabled(moduleKey: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = req.user as Express.User;
      const branchId = (user as any)?.branchId ?? null;
      const enabled = await isModuleEnabled(moduleKey, branchId);
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
};

export function getModuleKeyForPath(path: string): string | null {
  for (const [prefix, moduleKey] of Object.entries(PATH_TO_MODULE_KEY_MAP)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return moduleKey;
    }
  }
  return null;
}
