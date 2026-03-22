import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  branches,
  users,
  staffQrTokens,
} from "@shared/schema";

const router = Router();

  // ========================================
  // STAFF QR TOKEN YONETIM API
  // ========================================

  // GET /api/staff-qr-tokens - Token listesi
  router.get("/api/staff-qr-tokens", isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;
      
      let conditions = [];
      if (userRole === "supervisor" && userBranchId) {
        conditions.push(eq(staffQrTokens.branchId, userBranchId));
      }
      
      const tokens = await db.select().from(staffQrTokens)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(staffQrTokens.createdAt));
      
      const staffIds = [...new Set(tokens.map(t => t.staffId))];
      const branchIds = [...new Set(tokens.map(t => t.branchId))];
      const [staffList, branchList] = await Promise.all([
        staffIds.length > 0
          ? db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
              .from(users).where(inArray(users.id, staffIds))
          : Promise.resolve([]),
        branchIds.length > 0
          ? db.select({ id: branches.id, name: branches.name })
              .from(branches).where(inArray(branches.id, branchIds))
          : Promise.resolve([]),
      ]);
      const staffMap = new Map(staffList.map(s => [s.id, { firstName: s.firstName, lastName: s.lastName }]));
      const branchMap2 = new Map(branchList.map(b => [b.id, { name: b.name }]));
      const enriched = tokens.map(t => ({
        ...t,
        staff: staffMap.get(t.staffId) || null,
        branch: branchMap2.get(t.branchId) || null,
      }));
      
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching staff tokens:", error);
      res.status(500).json({ message: "Tokenlar alinamadi" });
    }
  });

  // POST /api/staff-qr-tokens - Yeni token olustur
  router.post("/api/staff-qr-tokens", isAuthenticated, async (req, res) => {
    try {
      const { branchId, staffId, expiresAt } = req.body;
      
      if (!branchId || !staffId) {
        return res.status(400).json({ message: "Sube ve personel zorunlu" });
      }
      
      // Generate unique token
      const token = require("crypto").randomBytes(16).toString("hex");
      
      const [newToken] = await db.insert(staffQrTokens).values({
        staffId,
        branchId,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        usageCount: 0,
      }).returning();
      
      res.json({ success: true, token: newToken });
    } catch (error: unknown) {
      console.error("Error creating staff token:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Bu personel icin zaten token var" });
      }
      res.status(500).json({ message: "Token olusturulamadi" });
    }
  });

  // DELETE /api/staff-qr-tokens/:id - Token sil
  router.delete("/api/staff-qr-tokens/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(staffQrTokens).where(eq(staffQrTokens.id, parseInt(id)));
      res.json({ success: true, message: "Token silindi" });
    } catch (error: unknown) {
      console.error("Error deleting staff token:", error);
      res.status(500).json({ message: "Token silinemedi" });
    }
  });


export default router;
