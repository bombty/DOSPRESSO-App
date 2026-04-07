/**
 * Bordro Kesinti Konfigürasyon API
 * HQ Operasyon tarafından şube/fabrika/merkez bazında düzenlenir
 * 
 * Yetki: admin, ceo, cgo, muhasebe, muhasebe_ik
 * Scope: admin/ceo/cgo = tüm şubeler, muhasebe = HQ+Fabrika+Işıklar
 */

import { Router, Response } from "express";
import { db } from "../db";
import { payrollDeductionConfig, branches } from "@shared/schema";
import { eq, and, isNull, or, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

const CONFIG_ADMIN_ROLES = ["admin", "ceo", "cgo", "muhasebe", "muhasebe_ik"];
const HQ_BRANCH_ID = 23;
const FACTORY_BRANCH_ID = 24;
const ISIKLAR_BRANCH_ID = 5; // Işıklar şubesi

function canManageConfig(role: string): boolean {
  return CONFIG_ADMIN_ROLES.includes(role);
}

/** Muhasebe sadece HQ + Fabrika + Işıklar yönetebilir */
function canManageBranch(role: string, branchId: number | null): boolean {
  if (["admin", "ceo", "cgo"].includes(role)) return true;
  if (["muhasebe", "muhasebe_ik"].includes(role)) {
    if (branchId === null) return false; // Genel kural muhasebe koyamaz
    return [HQ_BRANCH_ID, FACTORY_BRANCH_ID, ISIKLAR_BRANCH_ID].includes(branchId);
  }
  return false;
}

// ── GET /api/payroll/deduction-config — Tüm konfigürasyonları listele ──

router.get("/api/payroll/deduction-config", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canManageConfig(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const { branchId, year, month } = req.query;
    
    const conditions = [eq(payrollDeductionConfig.isActive, true)];
    if (branchId) conditions.push(eq(payrollDeductionConfig.branchId, Number(branchId)));
    if (year) conditions.push(eq(payrollDeductionConfig.year, Number(year)));
    if (month) conditions.push(eq(payrollDeductionConfig.month, Number(month)));

    const configs = await db.select({
      config: payrollDeductionConfig,
      branchName: branches.name,
    })
    .from(payrollDeductionConfig)
    .leftJoin(branches, eq(payrollDeductionConfig.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(payrollDeductionConfig.updatedAt));

    res.json(configs.map(c => ({
      ...c.config,
      branchName: c.branchName || "Tüm Şubeler (Varsayılan)",
    })));
  } catch (error) {
    console.error("Deduction config list error:", error);
    res.status(500).json({ error: "Konfigürasyonlar yüklenemedi" });
  }
});

// ── GET /api/payroll/deduction-config/effective — Belirli şube+dönem için geçerli config ──

router.get("/api/payroll/deduction-config/effective", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canManageConfig(req.user.role) && !["mudur", "supervisor"].includes(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const { branchId, year, month } = req.query;
    if (!branchId || !year || !month) {
      return res.status(400).json({ error: "branchId, year, month gerekli" });
    }

    const config = await getEffectiveConfig(Number(branchId), Number(year), Number(month));
    res.json(config);
  } catch (error) {
    console.error("Effective config error:", error);
    res.status(500).json({ error: "Konfigürasyon alınamadı" });
  }
});

// ── POST /api/payroll/deduction-config — Yeni konfigürasyon oluştur ──

router.post("/api/payroll/deduction-config", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canManageConfig(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const data = req.body;
    const branchId = data.branchId ? Number(data.branchId) : null;

    if (!canManageBranch(req.user.role, branchId)) {
      return res.status(403).json({ error: "Bu şubenin konfigürasyonunu değiştirme yetkiniz yok" });
    }

    const [created] = await db.insert(payrollDeductionConfig).values({
      branchId,
      year: data.year ? Number(data.year) : null,
      month: data.month ? Number(data.month) : null,
      trackingDays: data.trackingDays ? Number(data.trackingDays) : null,
      dailyRateDivisor: data.dailyRateDivisor ?? 30,
      maxOffDays: data.maxOffDays ?? 4,
      absencePenaltyPlusOne: data.absencePenaltyPlusOne ?? false,
      lateToleranceMinutes: data.lateToleranceMinutes ?? 15,
      lateHalfDeductionMinutes: data.lateHalfDeductionMinutes ?? 30,
      latePerMinuteRate: data.latePerMinuteRate ?? 0,
      deficitToleranceMinutes: data.deficitToleranceMinutes ?? 15,
      deficitHalfHourThreshold: data.deficitHalfHourThreshold ?? 30,
      overtimeThresholdMinutes: data.overtimeThresholdMinutes ?? 30,
      overtimeMultiplier: data.overtimeMultiplier ?? 150,
      holidayMultiplier: data.holidayMultiplier ?? 100,
      mealAllowancePerDay: data.mealAllowancePerDay ?? 33000,
      mealAllowanceRoles: data.mealAllowanceRoles ?? ["stajyer"],
      unpaidLeaveBonusDeduction: data.unpaidLeaveBonusDeduction ?? true,
      notes: data.notes || null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }).returning();

    res.json(created);
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Bu şube ve dönem için zaten bir konfigürasyon var" });
    }
    console.error("Create deduction config error:", error);
    res.status(500).json({ error: "Konfigürasyon oluşturulamadı" });
  }
});

// ── PATCH /api/payroll/deduction-config/:id — Konfigürasyon güncelle ──

router.patch("/api/payroll/deduction-config/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canManageConfig(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const id = Number(req.params.id);
    const existing = await db.select().from(payrollDeductionConfig).where(eq(payrollDeductionConfig.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Konfigürasyon bulunamadı" });

    if (!canManageBranch(req.user.role, existing[0].branchId)) {
      return res.status(403).json({ error: "Bu şubenin konfigürasyonunu değiştirme yetkiniz yok" });
    }

    const data = req.body;
    const [updated] = await db.update(payrollDeductionConfig)
      .set({
        ...data,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      })
      .where(eq(payrollDeductionConfig.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update deduction config error:", error);
    res.status(500).json({ error: "Konfigürasyon güncellenemedi" });
  }
});

// ── DELETE /api/payroll/deduction-config/:id — Konfigürasyon sil (soft) ──

router.delete("/api/payroll/deduction-config/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canManageConfig(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const id = Number(req.params.id);
    const existing = await db.select().from(payrollDeductionConfig).where(eq(payrollDeductionConfig.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Konfigürasyon bulunamadı" });

    if (!canManageBranch(req.user.role, existing[0].branchId)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    await db.update(payrollDeductionConfig)
      .set({ isActive: false, updatedBy: req.user.id, updatedAt: new Date() })
      .where(eq(payrollDeductionConfig.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Delete deduction config error:", error);
    res.status(500).json({ error: "Konfigürasyon silinemedi" });
  }
});

// ═══════════════════════════════════════════════════════════
// Geçerli Konfigürasyon Çözümleme (Cascade Mantığı)
// ═══════════════════════════════════════════════════════════
//
// Öncelik sırası:
//   1. Şube + Yıl + Ay (en spesifik)
//   2. Şube + Yıl (yıllık şube kuralı)
//   3. Şube kalıcı (yıl/ay null)
//   4. Genel + Yıl + Ay (şube null)
//   5. Genel + Yıl
//   6. Genel kalıcı (en genel varsayılan)
//   7. Kod içi varsayılan (hiçbir config yoksa)

export async function getEffectiveConfig(branchId: number, year: number, month: number) {
  const configs = await db.select()
    .from(payrollDeductionConfig)
    .where(and(
      eq(payrollDeductionConfig.isActive, true),
      or(
        eq(payrollDeductionConfig.branchId, branchId),
        isNull(payrollDeductionConfig.branchId)
      ),
      or(
        and(eq(payrollDeductionConfig.year, year), eq(payrollDeductionConfig.month, month)),
        and(eq(payrollDeductionConfig.year, year), isNull(payrollDeductionConfig.month)),
        and(isNull(payrollDeductionConfig.year), isNull(payrollDeductionConfig.month))
      )
    ))
    .orderBy(desc(payrollDeductionConfig.branchId), desc(payrollDeductionConfig.year), desc(payrollDeductionConfig.month));

  // Cascade: en spesifik config'i seç
  // Önce şube+ay, sonra şube+yıl, sonra şube, sonra genel+ay, sonra genel+yıl, sonra genel
  const ranked = configs.sort((a, b) => {
    const scoreA = (a.branchId ? 100 : 0) + (a.year ? 10 : 0) + (a.month ? 1 : 0);
    const scoreB = (b.branchId ? 100 : 0) + (b.year ? 10 : 0) + (b.month ? 1 : 0);
    return scoreB - scoreA;
  });

  if (ranked.length > 0) {
    return { ...ranked[0], source: "db" };
  }

  // Varsayılan (DB'de config yoksa)
  return {
    id: null,
    branchId: null,
    year: null,
    month: null,
    trackingDays: null,
    dailyRateDivisor: 30,
    maxOffDays: 4,
    absencePenaltyPlusOne: false,
    lateToleranceMinutes: 15,
    lateHalfDeductionMinutes: 30,
    latePerMinuteRate: 0,
    deficitToleranceMinutes: 15,
    deficitHalfHourThreshold: 30,
    overtimeThresholdMinutes: 30,
    overtimeMultiplier: 150,
    holidayMultiplier: 100,
    mealAllowancePerDay: 33000,
    mealAllowanceRoles: ["stajyer"],
    unpaidLeaveBonusDeduction: true,
    isActive: true,
    source: "default",
  };
}

export default router;
