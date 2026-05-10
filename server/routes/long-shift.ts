/**
 * Long Shift Warnings API — Aslan 11 May 2026
 * Kiosk anasayfa 10+ saat çalışan personel uyarısı için
 */

import { Router, type Request, type Response } from "express";
import { getLongShiftWarnings, checkLongShifts } from "../services/long-shift-monitor";

const router = Router();

// Şube kiosk için: o şubenin uzun çalışan personellerini listele
router.get(
  "/api/branches/:branchId/kiosk/long-shift-warnings",
  async (req: Request, res: Response) => {
    try {
      const branchId = parseInt(req.params.branchId);
      const warnings = await getLongShiftWarnings(branchId);
      res.json({ warnings, count: warnings.length });
    } catch (error: any) {
      console.error("[long-shift-warnings]", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Manuel tetikleme (admin için, normalde scheduler çalıştırır)
router.post(
  "/api/admin/long-shift/check-now",
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      if (!["admin", "ceo", "owner", "cgo"].includes(userRole)) {
        return res.status(403).json({ error: "Yetkisiz" });
      }
      const report = await checkLongShifts();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
