import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import { or, not, max } from "drizzle-orm";
import {
  announcements,
  banners,
} from "@shared/schema";

const router = Router();

  // ========================================
  // ADMIN DUYURU API
  // ========================================

  // GET /api/admin/announcements - Tüm duyuruları getir (admin)
  // POST /api/admin/announcements - Yeni duyuru oluştur
  // POST /api/announcements/from-banner - Banner editörden direkt duyuru oluştur
  router.post('/api/announcements/from-banner', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'supervisor', 'coach'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { imageData, title, message, category, priority, showOnDashboard, targetRoles, targetBranches, validFrom, expiresAt } = req.body;
      
      if (!title || !imageData) {
        return res.status(400).json({ message: "Başlık ve banner görseli gerekli" });
      }

      // Save banner image to object storage or use base64 as fallback
      let bannerImageUrl = null;
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (bucketId) {
        try {
          const { Client } = await import('@replit/object-storage');
          const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
          
          // Convert base64 to buffer
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const timestamp = Date.now();
          const filename = `public/banners/banner_${timestamp}.png`;
          
          // Upload to object storage
          const uploadResult = await client.uploadFromBytes(filename, buffer);
          if (!uploadResult.ok) {
            console.error("Banner upload failed:", uploadResult.error);
            bannerImageUrl = imageData;
          } else {
            bannerImageUrl = `https://objectstorage.us-west-2.replit.dev/${bucketId}/${filename}`;
          }
        } catch (error: unknown) {
          console.error("Banner upload error:", error);
          bannerImageUrl = imageData;
        }
      } else {
        bannerImageUrl = imageData;
      }
      
      const [newAnnouncement] = await db.insert(announcements)
        .values({
          createdById: req.user.id,
          title,
          message: message || title,
          category: category || 'general',
          targetRoles: targetRoles?.length ? targetRoles : null,
          targetBranches: targetBranches?.length ? targetBranches : null,
          priority: priority || 'normal',
          bannerImageUrl,
          bannerTitle: title,
          showOnDashboard: showOnDashboard || false,
          bannerPriority: priority === 'urgent' ? 10 : priority === 'high' ? 5 : 0,
          isPinned: priority === 'urgent',
          validFrom: validFrom ? new Date(validFrom) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();
      
      res.json(newAnnouncement);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateAnnouncement");
    }
  });

  // PATCH /api/admin/announcements/:id - Duyuru güncelle
  // POST /api/ai/generate-image - DALL-E ile görsel oluştur ve Object Storage'a kaydet
  router.post('/api/ai/generate-image', isAuthenticated, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ message: "Görsel açıklaması gerekli" });
      }

      // Rate limiting check - kullanıcı başına günde max 10 görsel
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "AI görsel oluşturma yetkiniz yok" });
      }


      // OpenAI DALL-E API'sini çağır (Replit AI Integrations üzerinden)
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "dall-e-3",
          size: "1792x1024",  // 3:1 banner aspect ratio'ya yakın
          quality: "standard",
          n: 1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("DALL-E error:", error);
        return res.status(500).json({ message: "Sunucu hatası oluştu" });
      }

      const data = await response.json();
      const tempImageUrl = data.data[0]?.url;
      
      if (!tempImageUrl) {
        return res.status(500).json({ message: "Görsel URL alınamadı" });
      }


      // Geçici URL'den görseli indir
      const imageResponse = await fetch(tempImageUrl);
      if (!imageResponse.ok) {
        return res.status(500).json({ message: "Görsel indirilemedi" });
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      // Object Storage'a yükle
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[AI] Object Storage bucket not configured");
        // Fallback: geçici URL döndür (expire olacak ama en azından gösterilir)
        return res.json({ imageUrl: tempImageUrl, warning: "Object Storage yapılandırılmamış, görsel geçici" });
      }

      const { objectStorageClient } = await import('../objectStorage');
      const bucket = objectStorageClient.bucket(bucketId);
      
      // Benzersiz dosya adı oluştur
      const timestamp = Date.now();
      const fileName = `banners/ai-generated-${timestamp}.png`;
      const file = bucket.file(fileName);
      
      // Görseli yükle
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: {
            generatedBy: 'dall-e-3',
            prompt: prompt.substring(0, 200),
            createdAt: new Date().toISOString(),
            userId: req.user?.id
          }
        },
        public: true
      });

      // Public URL oluştur
      const publicUrl = `https://storage.googleapis.com/${bucketId}/${fileName}`;
      

      res.json({ imageUrl: publicUrl });
    } catch (error: unknown) {
      handleApiError(res, error, "AIImageGeneration");
    }
  });

  // DELETE /api/admin/announcements/:id - Duyuru sil

  router.patch('/api/task-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const step = await storage.updateTaskStep(id, req.body);
      res.json(step);
    } catch (error: unknown) {
      console.error("Update task step error:", error);
      res.status(500).json({ message: "Adım güncellenemedi" });
    }
  });

  router.delete('/api/task-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskStep(id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete task step error:", error);
      res.status(500).json({ message: "Adım silinemedi" });
    }
  });


export default router;
