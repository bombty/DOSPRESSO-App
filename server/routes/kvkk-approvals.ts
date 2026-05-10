/**
 * KVKK Per-User Onay API
 *
 * 4 ENDPOINT:
 * 1. GET    /api/kvkk/policy/active        → Aktif KVKK metin
 * 2. GET    /api/kvkk/my-status            → Mevcut user'ın onay durumu
 * 3. POST   /api/kvkk/approve              → Onayla (audit kayıt)
 * 4. GET    /api/kvkk/audit/all-approvals  → Admin: tüm onaylar (denetim için)
 *
 * Aslan 10 May 2026 talebi.
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  kvkkPolicyVersions,
  userKvkkApprovals,
  KVKK_APPROVAL_METHODS,
  users,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// 1. GET /api/kvkk/policy/active — Aktif KVKK metni
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/policy/active",
  async (_req: Request, res: Response) => {
    try {
      const [policy] = await db
        .select()
        .from(kvkkPolicyVersions)
        .where(eq(kvkkPolicyVersions.isActive, true))
        .limit(1);

      if (!policy) {
        return res.status(404).json({
          error: "Aktif KVKK politikası bulunamadı",
        });
      }

      res.json({
        id: policy.id,
        version: policy.version,
        title: policy.title,
        contentMarkdown: policy.contentMarkdown,
        legalBasis: policy.legalBasis,
        effectiveFrom: policy.effectiveFrom,
      });
    } catch (error: any) {
      console.error("[kvkk/policy/active]", error);
      res.status(500).json({
        error: "Politika alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. GET /api/kvkk/my-status — Mevcut user'ın onay durumu
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/my-status",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Giriş gerekli" });
      }

      // Aktif policy
      const [activePolicy] = await db
        .select()
        .from(kvkkPolicyVersions)
        .where(eq(kvkkPolicyVersions.isActive, true))
        .limit(1);

      if (!activePolicy) {
        return res.json({
          requiresApproval: false,
          activePolicy: null,
          lastApproval: null,
        });
      }

      // Kullanıcının bu versiyonu onayı var mı?
      const [latestApproval] = await db
        .select()
        .from(userKvkkApprovals)
        .where(
          and(
            eq(userKvkkApprovals.userId, userId),
            eq(userKvkkApprovals.policyVersion, activePolicy.version)
          )
        )
        .orderBy(desc(userKvkkApprovals.approvedAt))
        .limit(1);

      const requiresApproval = !latestApproval;

      res.json({
        requiresApproval,
        activePolicy: {
          id: activePolicy.id,
          version: activePolicy.version,
          title: activePolicy.title,
        },
        lastApproval: latestApproval || null,
      });
    } catch (error: any) {
      console.error("[kvkk/my-status]", error);
      res.status(500).json({
        error: "Durum alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 3. POST /api/kvkk/approve — Onayla
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/kvkk/approve",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Giriş gerekli" });
      }

      const { policyVersionId, approvalMethod, branchId, deviceFingerprint } =
        req.body;

      if (!policyVersionId || !approvalMethod) {
        return res.status(400).json({
          error: "policyVersionId ve approvalMethod gerekli",
        });
      }

      const validMethods = Object.values(KVKK_APPROVAL_METHODS);
      if (!validMethods.includes(approvalMethod)) {
        return res.status(400).json({
          error: `approvalMethod geçersiz. Olası: ${validMethods.join(", ")}`,
        });
      }

      // Policy var mı?
      const [policy] = await db
        .select()
        .from(kvkkPolicyVersions)
        .where(eq(kvkkPolicyVersions.id, policyVersionId))
        .limit(1);

      if (!policy) {
        return res
          .status(404)
          .json({ error: "Belirtilen policy versiyonu bulunamadı" });
      }

      // Audit bilgileri
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "";
      const userAgent = req.headers["user-agent"] || "";

      // Onay kaydı
      const [approval] = await db
        .insert(userKvkkApprovals)
        .values({
          userId,
          policyVersionId,
          policyVersion: policy.version,
          approvedAt: new Date(),
          ipAddress,
          userAgent,
          approvalMethod,
          branchId: branchId || null,
          deviceFingerprint: deviceFingerprint || null,
        } as any)
        .returning();

      res.json({
        success: true,
        approval: {
          id: approval.id,
          version: approval.policyVersion,
          approvedAt: approval.approvedAt,
          approvalMethod: approval.approvalMethod,
        },
      });
    } catch (error: any) {
      console.error("[kvkk/approve]", error);
      res.status(500).json({
        error: "Onay kaydedilemedi",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 4. GET /api/kvkk/audit/all-approvals (Admin/CGO/CEO)
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/audit/all-approvals",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const allowedRoles = ["admin", "ceo", "cgo", "muhasebe_ik", "owner"];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      // Filtreleme
      const limit = Math.min(parseInt(String(req.query.limit || "100")), 500);
      const version = req.query.version as string | undefined;

      const result = await db
        .select({
          id: userKvkkApprovals.id,
          userId: userKvkkApprovals.userId,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
          userRole: users.role,
          policyVersion: userKvkkApprovals.policyVersion,
          approvedAt: userKvkkApprovals.approvedAt,
          approvalMethod: userKvkkApprovals.approvalMethod,
          ipAddress: userKvkkApprovals.ipAddress,
          branchId: userKvkkApprovals.branchId,
        })
        .from(userKvkkApprovals)
        .leftJoin(users, eq(userKvkkApprovals.userId, users.id))
        .where(
          version
            ? eq(userKvkkApprovals.policyVersion, version)
            : sql`1=1`
        )
        .orderBy(desc(userKvkkApprovals.approvedAt))
        .limit(limit);

      // Özet
      const summary = await db
        .select({
          totalApprovals: sql<number>`COUNT(*)::int`,
          uniqueUsers: sql<number>`COUNT(DISTINCT ${userKvkkApprovals.userId})::int`,
          versions: sql<string[]>`array_agg(DISTINCT ${userKvkkApprovals.policyVersion})`,
        })
        .from(userKvkkApprovals);

      res.json({
        summary: summary[0],
        approvals: result,
      });
    } catch (error: any) {
      console.error("[kvkk/audit]", error);
      res.status(500).json({
        error: "Denetim verisi alınamadı",
        message: error.message,
      });
    }
  }
);

export default router;
