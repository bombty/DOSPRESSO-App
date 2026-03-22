import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { eq, desc, asc, and, gte, lte } from "drizzle-orm";
import { sendNotificationEmail } from "../email";
import { z } from "zod";
import {
  jobPositions,
  jobApplications,
  interviews,
  banners,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // =============================================
  // ADMIN BANNERS
  // =============================================
  
  // GET active banners for dashboard
  router.get('/api/banners/active', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const now = new Date();
      
      const allBanners = await db.query.banners.findMany({
        where: (b, { and, eq, lte, gte }) => and(
          eq(b.isActive, true),
          lte(b.startDate, now),
          gte(b.endDate, now)
        ),
        orderBy: (b, { asc }) => [asc(b.orderIndex)],
      });
      
      const filtered = allBanners.filter((banner) => {
        if (!banner.targetRoles || banner.targetRoles.length === 0) return true;
        return banner.targetRoles.includes(user.role);
      });
      
      res.json(filtered);
    } catch (error: unknown) {
      console.error("Get active banners error:", error);
      res.status(500).json({ message: "Bannerlar alınamadı" });
    }
  });


  // GET /api/job-applications - List all applications
  router.get('/api/job-applications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { positionId, status } = req.query;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru bilgilerine erişim yetkiniz yok' });
      }

      let query = db.select()
        .from(jobApplications)
        .leftJoin(jobPositions, eq(jobApplications.positionId, jobPositions.id));
      
      if (positionId) {
        query = query.where(eq(jobApplications.positionId, parseInt(positionId as string)));
      }
      if (status && status !== 'all') {
        query = query.where(eq(jobApplications.status, status as string));
      }

      // Supervisor: only see their branch's positions
      if (user.role === 'supervisor' && user.branchId) {
        query = query.where(eq(jobPositions.branchId, user.branchId));
      }

      const results = await query.orderBy(desc(jobApplications.createdAt));
      // Extract just the jobApplications part and add interview result
      const applications = await Promise.all(results.map(async (r) => {
        const app = r.job_applications;
        // Get the latest interview for this application
        const latestInterview = await db.select()
          .from(interviews)
          .where(eq(interviews.applicationId, app.id))
          .orderBy(desc(interviews.createdAt))
          .limit(1);
        
        return {
          ...app,
          interviewResult: latestInterview[0]?.result || null,
        };
      }));
      res.json(applications);
    } catch (error: unknown) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Başvurular yüklenirken hata oluştu" });
    }
  });

  // POST /api/job-applications - Create a new application
  router.post('/api/job-applications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru ekleme yetkiniz yok' });
      }

      const data = {
        ...req.body,
        createdById: user.id,
      };

      const result = await db.insert(jobApplications).values(data).returning();
      const application = result[0];

      // Send thank you email to applicant
      if (application.email) {
        try {
          const [position] = await db.select().from(jobPositions).where(eq(jobPositions.id, application.positionId));
          
          const emailBody = `Sayın ${application.fullName},

DOSPRESSO ailesine başvurunuz için teşekkür ederiz.

Başvurunuz için ${position?.title || 'açık pozisyon'} pozisyonuna ait başvurunuz alındığını bilgilendirmek istiyoruz. 

Başvurunuz dikkatle değerlendirilecektir. Mülakata davet edilmeniz durumunda size email yoluyla bilgi verilecektir.

Başarılar dileriz,
DOSPRESSO İnsan Kaynakları Ekibi`;

          await sendNotificationEmail(
            application.email,
            'DOSPRESSO - Başvuru Alındı',
            emailBody
          );
        } catch (error: unknown) {
          console.error(`Failed to send thank you email to ${application.email}:`, error);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json(application);
    } catch (error: unknown) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Başvuru oluşturulurken hata oluştu" });
    }
  });

  // GET /api/job-applications/:id - Get single application
  router.get('/api/job-applications/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru bilgilerine erişim yetkiniz yok' });
      }

      const result = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
      if (result.length === 0) {
        return res.status(404).json({ message: 'Başvuru bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Başvuru yüklenirken hata oluştu" });
    }
  });

  // PATCH /api/job-applications/:id - Update application
  router.patch('/api/job-applications/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru güncelleme yetkiniz yok' });
      }

      const result = await db.update(jobApplications)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(jobApplications.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Başvuru bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Başvuru güncellenirken hata oluştu" });
    }
  });


export default router;
