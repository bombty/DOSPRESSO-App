import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import {
  equipment,
} from "@shared/schema";

const router = Router();

  // =============================================
  // ADMIN SUPPORT CATEGORY ASSIGNMENTS
  // =============================================
  
  // GET /api/admin/support-assignments - Get all category assignments
  // POST /api/admin/support-assignments - Create category assignment
  // DELETE /api/admin/support-assignments/:id - Delete category assignment
  // =============================================
  // ADMIN EMAIL SETTINGS
  // =============================================
  
  // =============================================
  // ADMIN SERVICE EMAIL SETTINGS (Arıza/Bakım için)
  // =============================================
  
  // =============================================
  // SERVICE REQUEST EMAIL - Servise İlet
  // =============================================
  
  router.post('/api/service-request/send', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { faultId, equipmentId, serviceEmail, subject, body } = req.body;
      
      if (!serviceEmail) {
        return res.status(400).json({ message: "Servis e-posta adresi bulunamadı" });
      }
      
      const serviceSettings = await db.query.serviceEmailSettings.findFirst();
      
      if (!serviceSettings || !serviceSettings.isActive) {
        return res.status(400).json({ message: "Servis mail ayarları yapılandırılmamış veya pasif" });
      }
      
      if (!serviceSettings.smtpHost || !serviceSettings.smtpUser) {
        return res.status(400).json({ message: "SMTP ayarları eksik. Admin panelinden yapılandırın." });
      }
      
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: serviceSettings.smtpHost,
        port: serviceSettings.smtpPort || 587,
        secure: serviceSettings.smtpSecure || false,
        auth: {
          user: serviceSettings.smtpUser,
          pass: serviceSettings.smtpPassword,
        },
      });
      
      const mailOptions = {
        from: `"${serviceSettings.smtpFromName || 'DOSPRESSO Teknik'}" <${serviceSettings.smtpFromEmail || serviceSettings.smtpUser}>`,
        to: serviceEmail,
        subject: subject || "DOSPRESSO - Servis Talebi",
        html: body,
      };
      
      await transporter.sendMail(mailOptions);
      
      
      res.json({ message: "Servis talebi e-postası gönderildi" });
    } catch (error: unknown) {
      handleApiError(res, error, "SendServiceRequestEmail");
    }
  });


export default router;
