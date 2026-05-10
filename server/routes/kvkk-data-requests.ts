/**
 * KVKK m.11 Veri Sahibi Talep API
 *
 * 5 ENDPOINT:
 * 1. POST /api/kvkk/requests/submit    → Yeni talep gönder (public + auth)
 * 2. GET  /api/kvkk/requests/my        → Kendi taleplerim
 * 3. GET  /api/kvkk/requests/admin     → Admin: tüm talepler
 * 4. POST /api/kvkk/requests/:id/respond → Admin: yanıt
 * 5. GET  /api/kvkk/requests/deadline-alerts → Yaklaşan/geçmiş deadline
 *
 * Aslan 10 May 2026: KVKK yasal uyum
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  kvkkDataSubjectRequests,
  KVKK_REQUEST_TYPES,
  KVKK_REQUEST_STATUS,
  users,
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

const ADMIN_ROLES = ["admin", "ceo", "cgo", "muhasebe_ik", "owner"];

// ═══════════════════════════════════════════════════════════════════
// 1. POST /api/kvkk/requests/submit — Yeni talep
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/kvkk/requests/submit",
  async (req: Request, res: Response) => {
    try {
      // Auth optional — dışarıdan da talep gelebilir (eski çalışan, müşteri)
      const userId = (req.user as any)?.id || null;

      const {
        requesterName,
        requesterEmail,
        requesterPhone,
        requesterTcNo,
        requestType,
        requestDescription,
        dataCategory,
      } = req.body;

      // Validation
      if (!requesterName || !requestType || !requestDescription) {
        return res.status(400).json({
          error:
            "requesterName, requestType ve requestDescription zorunlu",
        });
      }

      const validTypes = Object.values(KVKK_REQUEST_TYPES);
      if (!validTypes.includes(requestType)) {
        return res.status(400).json({
          error: `Geçersiz talep türü. Olası: ${validTypes.join(", ")}`,
        });
      }

      if (requesterTcNo && !/^\d{11}$/.test(requesterTcNo)) {
        return res.status(400).json({
          error: "TC No 11 hane sayı olmalı",
        });
      }

      // 30 gün deadline (KVKK m.13)
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);

      // Audit
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "";
      const userAgent = req.headers["user-agent"] || "";

      const [request] = await db
        .insert(kvkkDataSubjectRequests)
        .values({
          requesterUserId: userId,
          requesterName,
          requesterEmail: requesterEmail || null,
          requesterPhone: requesterPhone || null,
          requesterTcNo: requesterTcNo || null,
          requestType,
          requestDescription,
          dataCategory: dataCategory || null,
          status: KVKK_REQUEST_STATUS.RECEIVED,
          receivedAt: new Date(),
          deadline,
          ipAddress,
          userAgent,
        } as any)
        .returning();

      // Admin'lere bildirim (gerçek e-mail/SMS sistemi olursa burada)
      // TODO: notification system

      res.json({
        success: true,
        request: {
          id: request.id,
          status: request.status,
          deadline: request.deadline,
          message:
            "Talebiniz alındı. 30 gün içinde yanıtlanacaktır (KVKK m.13).",
        },
      });
    } catch (error: any) {
      console.error("[kvkk/requests/submit]", error);
      res.status(500).json({
        error: "Talep gönderilemedi",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. GET /api/kvkk/requests/my — Kendi taleplerim
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/requests/my",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;

      const requests = await db
        .select()
        .from(kvkkDataSubjectRequests)
        .where(eq(kvkkDataSubjectRequests.requesterUserId, userId))
        .orderBy(desc(kvkkDataSubjectRequests.receivedAt));

      res.json({ requests });
    } catch (error: any) {
      console.error("[kvkk/requests/my]", error);
      res.status(500).json({
        error: "Talepler alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 3. GET /api/kvkk/requests/admin — Admin: tüm talepler
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/requests/admin",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      if (!ADMIN_ROLES.includes(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const statusFilter = req.query.status as string | undefined;

      const requests = await db
        .select({
          id: kvkkDataSubjectRequests.id,
          requesterUserId: kvkkDataSubjectRequests.requesterUserId,
          requesterName: kvkkDataSubjectRequests.requesterName,
          requesterEmail: kvkkDataSubjectRequests.requesterEmail,
          requesterTcNo: kvkkDataSubjectRequests.requesterTcNo,
          requestType: kvkkDataSubjectRequests.requestType,
          requestDescription: kvkkDataSubjectRequests.requestDescription,
          dataCategory: kvkkDataSubjectRequests.dataCategory,
          status: kvkkDataSubjectRequests.status,
          receivedAt: kvkkDataSubjectRequests.receivedAt,
          deadline: kvkkDataSubjectRequests.deadline,
          respondedAt: kvkkDataSubjectRequests.respondedAt,
          internalUserName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, '')`,
        })
        .from(kvkkDataSubjectRequests)
        .leftJoin(
          users,
          eq(kvkkDataSubjectRequests.requesterUserId, users.id)
        )
        .where(
          statusFilter
            ? eq(kvkkDataSubjectRequests.status, statusFilter)
            : sql`1=1`
        )
        .orderBy(
          // Pending olanlar üstte
          sql`CASE WHEN ${kvkkDataSubjectRequests.status} IN ('received', 'in_review', 'additional_info') THEN 0 ELSE 1 END`,
          kvkkDataSubjectRequests.deadline
        );

      // Özet
      const now = new Date();
      const summary = {
        total: requests.length,
        received: requests.filter((r) => r.status === "received").length,
        inReview: requests.filter((r) => r.status === "in_review").length,
        completed: requests.filter((r) => r.status === "completed").length,
        rejected: requests.filter((r) => r.status === "rejected").length,
        approachingDeadline: requests.filter((r) => {
          const days = Math.ceil(
            (new Date(r.deadline).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return days >= 0 && days <= 7 && r.status !== "completed";
        }).length,
        overdue: requests.filter((r) => {
          return new Date(r.deadline) < now && r.status !== "completed";
        }).length,
      };

      res.json({ summary, requests });
    } catch (error: any) {
      console.error("[kvkk/requests/admin]", error);
      res.status(500).json({
        error: "Talepler alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 4. POST /api/kvkk/requests/:id/respond — Yanıt
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/kvkk/requests/:id/respond",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userId = (req.user as any)?.id;

      if (!ADMIN_ROLES.includes(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const requestId = parseInt(req.params.id);
      const {
        status,
        responseText,
        responseMethod,
        decisionReason,
        actionsTaken,
        reviewNotes,
      } = req.body;

      const validStatuses = Object.values(KVKK_REQUEST_STATUS);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Geçersiz status. Olası: ${validStatuses.join(", ")}`,
        });
      }

      const [updated] = await db
        .update(kvkkDataSubjectRequests)
        .set({
          status,
          responseText: responseText || null,
          responseMethod: responseMethod || null,
          decisionReason: decisionReason || null,
          actionsTaken: actionsTaken || null,
          reviewNotes: reviewNotes || null,
          assignedToUserId: userId,
          reviewStartedAt:
            status === "in_review" ? new Date() : undefined,
          respondedAt:
            ["completed", "rejected", "partial"].includes(status)
              ? new Date()
              : undefined,
          updatedAt: new Date(),
        } as any)
        .where(eq(kvkkDataSubjectRequests.id, requestId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Talep bulunamadı" });
      }

      res.json({ success: true, request: updated });
    } catch (error: any) {
      console.error("[kvkk/requests/respond]", error);
      res.status(500).json({
        error: "Yanıt kaydedilemedi",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 5. GET /api/kvkk/requests/deadline-alerts — Yaklaşan/geçmiş deadlines
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/kvkk/requests/deadline-alerts",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      if (!ADMIN_ROLES.includes(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const requests = await db
        .select()
        .from(kvkkDataSubjectRequests)
        .where(
          and(
            sql`status NOT IN ('completed', 'rejected')`,
            lte(kvkkDataSubjectRequests.deadline, nextWeek)
          )
        )
        .orderBy(kvkkDataSubjectRequests.deadline);

      const overdue = requests.filter((r) => new Date(r.deadline) < now);
      const approaching = requests.filter((r) => new Date(r.deadline) >= now);

      res.json({
        overdue: overdue.length,
        approaching: approaching.length,
        critical: overdue.concat(approaching.slice(0, 5)),
      });
    } catch (error: any) {
      console.error("[kvkk/requests/deadline-alerts]", error);
      res.status(500).json({
        error: "Alarm bilgisi alınamadı",
        message: error.message,
      });
    }
  }
);

export default router;
