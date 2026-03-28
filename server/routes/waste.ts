import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
import {
  wasteCategories,
  wasteReasons,
  wasteEvents,
  wasteLots,
  wasteActionLinks,
  branches,
  users,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  type UserRoleType,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "../audit";
import { handleApiError } from "./helpers";
import { validateWasteEvent } from "../services/waste-rules";
import { generateWasteSignals } from "../services/waste-lead-agent";

const router = Router();

const HQ_WASTE_ROLES: string[] = [
  "admin", "ceo", "cgo", "coach", "trainer",
  "kalite_kontrol", "gida_muhendisi", "marketing",
  "fabrika_mudur",
];

const FACTORY_WASTE_ROLES: string[] = [
  "fabrika_mudur", "gida_muhendisi", "kalite_kontrol",
  "fabrika_operator", "fabrika_sorumlu",
];

function canViewAllBranches(role: string): boolean {
  return HQ_WASTE_ROLES.includes(role) || role === "admin";
}

function canCreateWasteEvent(role: string): boolean {
  return [
    "supervisor", "mudur", "barista", "bar_buddy",
    "supervisor_buddy", "stajyer", "admin",
    "coach", "trainer",
  ].includes(role);
}

function canManageLots(role: string): boolean {
  return FACTORY_WASTE_ROLES.includes(role) || role === "admin";
}

function canCreateActions(role: string): boolean {
  return [
    "coach", "trainer", "kalite_kontrol", "gida_muhendisi",
    "marketing", "fabrika_mudur", "admin",
  ].includes(role);
}

router.get("/api/waste/categories", isAuthenticated, async (req, res) => {
  try {
    const cats = await db
      .select()
      .from(wasteCategories)
      .where(eq(wasteCategories.isActive, true))
      .orderBy(wasteCategories.sortOrder);
    res.json(cats);
  } catch (error) {
    handleApiError(res, error, "waste.categories.list");
  }
});

router.get("/api/waste/reasons", isAuthenticated, async (req, res) => {
  try {
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;

    const conditions = [eq(wasteReasons.isActive, true)];
    if (categoryId) {
      conditions.push(eq(wasteReasons.categoryId, categoryId));
    }

    const reasons = await db
      .select()
      .from(wasteReasons)
      .where(and(...conditions))
      .orderBy(wasteReasons.sortOrder);
    res.json(reasons);
  } catch (error) {
    handleApiError(res, error, "waste.reasons.list");
  }
});

const createWasteEventSchema = z.object({
  branchId: z.number().optional(),
  eventTs: z.string().optional(),
  productId: z.number().nullable().optional(),
  productGroup: z.string().nullable().optional(),
  recipeRef: z.string().nullable().optional(),
  quantity: z.string().or(z.number()),
  unit: z.string().default("adet"),
  estimatedCost: z.string().or(z.number()).nullable().optional(),
  categoryId: z.number(),
  reasonId: z.number(),
  responsibilityScope: z.string().default("unknown"),
  notes: z.string(),
  evidencePhotos: z.array(z.string()).default([]),
  lotId: z.string().nullable().optional(),
  supplierBatch: z.string().nullable().optional(),
});

router.post("/api/waste/events", isAuthenticated, requireManifestAccess("gorevler", "create"), async (req, res) => {
  try {
    const user = req.user!;
    if (!canCreateWasteEvent(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const parsed = createWasteEventSchema.parse(req.body);
    const branchId = parsed.branchId || user.branchId;
    if (!branchId) {
      return res.status(400).json({ message: "Şube bilgisi gerekli" });
    }

    const category = await db
      .select()
      .from(wasteCategories)
      .where(eq(wasteCategories.id, parsed.categoryId))
      .limit(1);

    const validation = validateWasteEvent({
      categoryCode: category[0]?.code,
      reasonId: parsed.reasonId,
      quantity: parsed.quantity,
      unit: parsed.unit,
      notes: parsed.notes,
      evidencePhotos: parsed.evidencePhotos,
      responsibilityScope: parsed.responsibilityScope,
      lotId: parsed.lotId,
    });

    if (!validation.valid) {
      return res.status(422).json({
        message: "Doğrulama hatası",
        issues: validation.issues,
      });
    }

    const qty = typeof parsed.quantity === "string" ? parsed.quantity : String(parsed.quantity);
    const cost = parsed.estimatedCost
      ? typeof parsed.estimatedCost === "string"
        ? parsed.estimatedCost
        : String(parsed.estimatedCost)
      : null;

    const [created] = await db
      .insert(wasteEvents)
      .values({
        branchId,
        createdByUserId: user.id,
        eventTs: parsed.eventTs ? new Date(parsed.eventTs) : new Date(),
        productId: parsed.productId || null,
        productGroup: parsed.productGroup || null,
        recipeRef: parsed.recipeRef || null,
        quantity: qty,
        unit: parsed.unit,
        estimatedCost: cost,
        categoryId: parsed.categoryId,
        reasonId: parsed.reasonId,
        responsibilityScope: parsed.responsibilityScope,
        notes: parsed.notes,
        evidencePhotos: parsed.evidencePhotos,
        lotId: parsed.lotId || null,
        supplierBatch: parsed.supplierBatch || null,
        status: "open",
      })
      .returning();

    await auditLog(req, {
      eventType: "waste.event_created",
      action: "create",
      resource: "waste_event",
      resourceId: String(created.id),
      after: { branchId, categoryId: parsed.categoryId, reasonId: parsed.reasonId, quantity: qty },
      details: { responsibilityScope: parsed.responsibilityScope, warnings: validation.issues.filter(i => i.severity === "warn") },
    });

    res.status(201).json({
      event: created,
      warnings: validation.issues.filter((i) => i.severity === "warn"),
    });
  } catch (error) {
    handleApiError(res, error, "waste.events.create");
  }
});

router.get("/api/waste/events", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as string;

    const conditions: any[] = [];

    if (canViewAllBranches(role)) {
      if (req.query.branchId) {
        conditions.push(eq(wasteEvents.branchId, Number(req.query.branchId)));
      }
    } else if (isBranchRole(role as UserRoleType)) {
      if (!user.branchId) {
        return res.json([]);
      }
      conditions.push(eq(wasteEvents.branchId, user.branchId));
    } else {
      return res.json([]);
    }

    if (req.query.status) {
      conditions.push(eq(wasteEvents.status, req.query.status));
    }
    if (req.query.categoryId) {
      conditions.push(eq(wasteEvents.categoryId, Number(req.query.categoryId)));
    }
    if (req.query.reasonId) {
      conditions.push(eq(wasteEvents.reasonId, Number(req.query.reasonId)));
    }
    if (req.query.from) {
      conditions.push(gte(wasteEvents.eventTs, new Date(req.query.from as string)));
    }
    if (req.query.to) {
      conditions.push(lte(wasteEvents.eventTs, new Date(req.query.to as string)));
    }
    if (req.query.responsibilityScope) {
      conditions.push(eq(wasteEvents.responsibilityScope, req.query.responsibilityScope as string));
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const events = await db
      .select({
        event: wasteEvents,
        branchName: branches.name,
        categoryName: wasteCategories.nameTr,
        categoryCode: wasteCategories.code,
        reasonName: wasteReasons.nameTr,
        reasonCode: wasteReasons.code,
        createdByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
      })
      .from(wasteEvents)
      .leftJoin(branches, eq(wasteEvents.branchId, branches.id))
      .leftJoin(wasteCategories, eq(wasteEvents.categoryId, wasteCategories.id))
      .leftJoin(wasteReasons, eq(wasteEvents.reasonId, wasteReasons.id))
      .leftJoin(users, eq(wasteEvents.createdByUserId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(wasteEvents.eventTs))
      .limit(limit)
      .offset(offset);

    res.json(events);
  } catch (error) {
    handleApiError(res, error, "waste.events.list");
  }
});

router.get("/api/waste/events/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const eventId = Number(req.params.id);

    const [result] = await db
      .select({
        event: wasteEvents,
        branchName: branches.name,
        categoryName: wasteCategories.nameTr,
        categoryCode: wasteCategories.code,
        reasonName: wasteReasons.nameTr,
        reasonCode: wasteReasons.code,
        createdByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
      })
      .from(wasteEvents)
      .leftJoin(branches, eq(wasteEvents.branchId, branches.id))
      .leftJoin(wasteCategories, eq(wasteEvents.categoryId, wasteCategories.id))
      .leftJoin(wasteReasons, eq(wasteEvents.reasonId, wasteReasons.id))
      .leftJoin(users, eq(wasteEvents.createdByUserId, users.id))
      .where(eq(wasteEvents.id, eventId))
      .limit(1);

    if (!result) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    if (
      isBranchRole(user.role as UserRoleType) &&
      result.event.branchId !== user.branchId
    ) {
      return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, "waste.events.get");
  }
});

router.patch("/api/waste/events/:id/status", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!canViewAllBranches(user.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { status } = z.object({ status: z.enum(["open", "confirmed", "resolved"]) }).parse(req.body);
    const eventId = Number(req.params.id);

    const [updated] = await db
      .update(wasteEvents)
      .set({ status, updatedAt: new Date() })
      .where(eq(wasteEvents.id, eventId))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    await auditLog(req, {
      eventType: "waste.event_status_updated",
      action: "update",
      resource: "waste_event",
      resourceId: String(eventId),
      after: { status },
    });

    res.json(updated);
  } catch (error) {
    handleApiError(res, error, "waste.events.updateStatus");
  }
});

router.post("/api/waste/lots", isAuthenticated, requireManifestAccess("gorevler", "create"), async (req, res) => {
  try {
    const user = req.user!;
    if (!canManageLots(user.role)) {
      return res.status(403).json({ message: "Lot yönetimi yetkiniz yok" });
    }

    const schema = z.object({
      lotId: z.string().min(1),
      productId: z.number().nullable().optional(),
      productName: z.string().nullable().optional(),
      productionDate: z.string().nullable().optional(),
      expiryDate: z.string().nullable().optional(),
      qcStatus: z.string().default("pending"),
      qcNotes: z.string().nullable().optional(),
      evidencePhotos: z.array(z.string()).default([]),
    });

    const parsed = schema.parse(req.body);

    const [created] = await db
      .insert(wasteLots)
      .values({
        lotId: parsed.lotId,
        productId: parsed.productId || null,
        productName: parsed.productName || null,
        productionDate: parsed.productionDate ? new Date(parsed.productionDate) : null,
        expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
        qcStatus: parsed.qcStatus,
        qcNotes: parsed.qcNotes || null,
        evidencePhotos: parsed.evidencePhotos,
        createdByUserId: user.id,
      })
      .returning();

    await auditLog(req, {
      eventType: "waste.lot_created",
      action: "create",
      resource: "waste_lot",
      resourceId: String(created.id),
      after: { lotId: parsed.lotId, qcStatus: parsed.qcStatus },
    });

    res.status(201).json(created);
  } catch (error) {
    handleApiError(res, error, "waste.lots.create");
  }
});

router.get("/api/waste/lots", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!canManageLots(user.role) && !canViewAllBranches(user.role)) {
      return res.status(403).json({ message: "Lot görüntüleme yetkiniz yok" });
    }

    const conditions: any[] = [];
    if (req.query.qcStatus) {
      conditions.push(eq(wasteLots.qcStatus, req.query.qcStatus as string));
    }

    const lots = await db
      .select()
      .from(wasteLots)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(wasteLots.createdAt))
      .limit(200);

    res.json(lots);
  } catch (error) {
    handleApiError(res, error, "waste.lots.list");
  }
});

router.patch("/api/waste/lots/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!canManageLots(user.role)) {
      return res.status(403).json({ message: "Lot güncelleme yetkiniz yok" });
    }

    const lotId = Number(req.params.id);
    const schema = z.object({
      qcStatus: z.string().optional(),
      qcNotes: z.string().nullable().optional(),
      evidencePhotos: z.array(z.string()).optional(),
    });

    const parsed = schema.parse(req.body);

    const updateData: any = { updatedAt: new Date() };
    if (parsed.qcStatus) updateData.qcStatus = parsed.qcStatus;
    if (parsed.qcNotes !== undefined) updateData.qcNotes = parsed.qcNotes;
    if (parsed.evidencePhotos) updateData.evidencePhotos = parsed.evidencePhotos;

    const [updated] = await db
      .update(wasteLots)
      .set(updateData)
      .where(eq(wasteLots.id, lotId))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Lot bulunamadı" });
    }

    await auditLog(req, {
      eventType: "waste.lot_updated",
      action: "update",
      resource: "waste_lot",
      resourceId: String(lotId),
      after: updateData,
    });

    res.json(updated);
  } catch (error) {
    handleApiError(res, error, "waste.lots.update");
  }
});

router.post("/api/waste/action-links", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!canCreateActions(user.role)) {
      return res.status(403).json({ message: "Aksiyon oluşturma yetkiniz yok" });
    }

    const schema = z.object({
      wasteEventId: z.number(),
      taskId: z.number().nullable().optional(),
      auditLogId: z.number().nullable().optional(),
      linkType: z.string().default("task"),
      notes: z.string().nullable().optional(),
    });

    const parsed = schema.parse(req.body);

    const [created] = await db
      .insert(wasteActionLinks)
      .values({
        wasteEventId: parsed.wasteEventId,
        taskId: parsed.taskId || null,
        auditLogId: parsed.auditLogId || null,
        linkType: parsed.linkType,
        notes: parsed.notes || null,
        createdByUserId: user.id,
      })
      .returning();

    await auditLog(req, {
      eventType: "waste.action_link_created",
      action: "create",
      resource: "waste_action_link",
      resourceId: String(created.id),
      after: { wasteEventId: parsed.wasteEventId, taskId: parsed.taskId, linkType: parsed.linkType },
    });

    res.status(201).json(created);
  } catch (error) {
    handleApiError(res, error, "waste.actionLinks.create");
  }
});

router.get("/api/waste/insights/weekly", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    if (!canViewAllBranches(user.role)) {
      return res.status(403).json({ message: "Haftalık rapor yetkiniz yok" });
    }

    const fromDate = req.query.from
      ? new Date(req.query.from as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = req.query.to
      ? new Date(req.query.to as string)
      : new Date();

    const dateFilter = and(
      gte(wasteEvents.eventTs, fromDate),
      lte(wasteEvents.eventTs, toDate),
    );

    const [totalResult] = await db
      .select({ total: count() })
      .from(wasteEvents)
      .where(dateFilter);

    const topReasons = await db
      .select({
        reasonId: wasteEvents.reasonId,
        reasonName: wasteReasons.nameTr,
        reasonCode: wasteReasons.code,
        cnt: count(),
      })
      .from(wasteEvents)
      .leftJoin(wasteReasons, eq(wasteEvents.reasonId, wasteReasons.id))
      .where(dateFilter)
      .groupBy(wasteEvents.reasonId, wasteReasons.nameTr, wasteReasons.code)
      .orderBy(desc(count()))
      .limit(10);

    const topCategories = await db
      .select({
        categoryId: wasteEvents.categoryId,
        categoryName: wasteCategories.nameTr,
        categoryCode: wasteCategories.code,
        cnt: count(),
      })
      .from(wasteEvents)
      .leftJoin(wasteCategories, eq(wasteEvents.categoryId, wasteCategories.id))
      .where(dateFilter)
      .groupBy(wasteEvents.categoryId, wasteCategories.nameTr, wasteCategories.code)
      .orderBy(desc(count()))
      .limit(10);

    const branchRanking = await db
      .select({
        branchId: wasteEvents.branchId,
        branchName: branches.name,
        cnt: count(),
        totalCost: sql<string>`COALESCE(SUM(CAST(${wasteEvents.estimatedCost} AS NUMERIC)), 0)`,
      })
      .from(wasteEvents)
      .leftJoin(branches, eq(wasteEvents.branchId, branches.id))
      .where(dateFilter)
      .groupBy(wasteEvents.branchId, branches.name)
      .orderBy(desc(count()))
      .limit(20);

    const scopeBreakdown = await db
      .select({
        scope: wasteEvents.responsibilityScope,
        cnt: count(),
      })
      .from(wasteEvents)
      .where(dateFilter)
      .groupBy(wasteEvents.responsibilityScope)
      .orderBy(desc(count()));

    const statusBreakdown = await db
      .select({
        status: wasteEvents.status,
        cnt: count(),
      })
      .from(wasteEvents)
      .where(dateFilter)
      .groupBy(wasteEvents.status);

    const lotClusters = await db
      .select({
        lotId: wasteEvents.lotId,
        cnt: count(),
        affectedBranches: sql<number>`COUNT(DISTINCT ${wasteEvents.branchId})`,
      })
      .from(wasteEvents)
      .where(and(dateFilter, sql`${wasteEvents.lotId} IS NOT NULL`))
      .groupBy(wasteEvents.lotId)
      .orderBy(desc(count()))
      .limit(10);

    const openCount = statusBreakdown.find(s => s.status === "open")?.cnt || 0;
    const redFlags: string[] = [];
    if (Number(openCount) > 20) {
      redFlags.push(`${openCount} açık kayıt çözüm bekliyor`);
    }
    const coldChainReasons = topReasons.filter(r => r.reasonCode === "cold_chain_break");
    if (coldChainReasons.length > 0 && Number(coldChainReasons[0].cnt) >= 3) {
      redFlags.push(`Soğuk zincir kırılması: ${coldChainReasons[0].cnt} olay`);
    }
    const lotIssues = lotClusters.filter(l => Number(l.affectedBranches) >= 2);
    if (lotIssues.length > 0) {
      redFlags.push(`${lotIssues.length} lot birden fazla şubede sorun oluşturdu`);
    }

    await auditLog(req, {
      eventType: "waste.insights_viewed",
      action: "read",
      resource: "waste_insights",
      details: { from: fromDate.toISOString(), to: toDate.toISOString() },
    });

    res.json({
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totalEvents: totalResult?.total || 0,
      topReasons,
      topCategories,
      branchRanking,
      scopeBreakdown,
      statusBreakdown,
      lotClusters,
      redFlags,
    });
  } catch (error) {
    handleApiError(res, error, "waste.insights.weekly");
  }
});

router.get("/api/waste/signals", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const role = user?.role as string;
    if (!role || (!HQ_WASTE_ROLES.includes(role) && !["supervisor", "mudur"].includes(role))) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const fromParam = req.query.from as string | undefined;
    const from = fromParam ? new Date(fromParam) : undefined;
    const branchId = ["supervisor", "mudur"].includes(role) && !HQ_WASTE_ROLES.includes(role) ? user.branchId : undefined;

    const signals = await generateWasteSignals(from, branchId);

    const filteredSignals = signals.filter(s =>
      s.targetRole.includes(role) || role === "admin"
    );

    res.json(filteredSignals);
  } catch (error) {
    handleApiError(res, error, "waste.signals");
  }
});

export const wasteRouter = router;
