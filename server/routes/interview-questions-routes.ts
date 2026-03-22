import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { handleApiError } from "./helpers";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { sendNotificationEmail } from "../email";
import {
  insertPublicHolidaySchema,
  insertInterviewQuestionSchema,
  users,
  notifications,
  employeeLeaves,
  publicHolidays,
  employeeTerminations,
  jobPositions,
  jobApplications,
  interviews,
  interviewQuestions,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // Standart Mülakat Soruları (HQ yönetimli)
  // ========================================

  // GET /api/interview-questions - Get all interview questions
  router.get('/api/interview-questions', isAuthenticated, async (req, res) => {
    try {
      const result = await db.select()
        .from(interviewQuestions)
        .where(eq(interviewQuestions.isActive, true))
        .orderBy(interviewQuestions.category, interviewQuestions.orderIndex);
      res.json(result);
    } catch (error: unknown) {
      console.error("Error fetching interview questions:", error);
      res.status(500).json({ message: "Mülakat soruları yüklenirken hata oluştu" });
    }
  });

  // POST /api/interview-questions - Create interview question (HQ only)
  router.post('/api/interview-questions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const data = insertInterviewQuestionSchema.parse({
        ...req.body,
        createdById: user.id,
      });

      const result = await db.insert(interviewQuestions).values(data).returning();
      res.status(201).json(result[0]);
    } catch (error: unknown) {
      console.error("Error creating interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/interview-questions/:id - Update interview question (HQ only)
  router.patch('/api/interview-questions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const id = parseInt(req.params.id);
      const result = await db.update(interviewQuestions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(interviewQuestions.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Soru bulunamadı' });
      }
      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error updating interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/interview-questions/:id - Soft delete question (HQ only)
  router.delete('/api/interview-questions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const id = parseInt(req.params.id);
      await db.update(interviewQuestions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(interviewQuestions.id, id));

      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu silinirken hata oluştu" });
    }
  });

  // GET /api/employee-terminations - Get termination records
  router.get('/api/employee-terminations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      const result = await db.select({
        id: employeeTerminations.id,
        userId: employeeTerminations.userId,
        terminationType: employeeTerminations.terminationType,
        terminationDate: employeeTerminations.terminationDate,
        terminationReason: employeeTerminations.terminationReason,
        lastWorkDay: employeeTerminations.lastWorkDay,
        noticeGiven: employeeTerminations.noticeGiven,
        finalSalary: employeeTerminations.finalSalary,
        severancePayment: employeeTerminations.severancePayment,
        otherPayments: employeeTerminations.otherPayments,
        totalPayment: employeeTerminations.totalPayment,
        returnedItems: employeeTerminations.returnedItems,
        exitInterview: employeeTerminations.exitInterview,
        performanceRating: employeeTerminations.performanceRating,
        recommendation: employeeTerminations.recommendation,
        processedById: employeeTerminations.processedById,
        approvedById: employeeTerminations.approvedById,
        documents: employeeTerminations.documents,
        createdAt: employeeTerminations.createdAt,
        updatedAt: employeeTerminations.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
        .from(employeeTerminations)
        .leftJoin(users, eq(employeeTerminations.userId, users.id))
        .orderBy(desc(employeeTerminations.terminationDate));
      const enriched = result.map(r => ({
        ...r,
        userName: ((r.userFirstName || '') + ' ' + (r.userLastName || '')).trim() || null,
      }));
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching terminations:", error);
      res.status(500).json({ message: "Ayrılış kayıtları yüklenirken hata oluştu" });
    }
  });

  // POST /api/employee-terminations - Create termination record (enhanced with notifications)
  router.post('/api/employee-terminations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && !['supervisor'].includes(user.role)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      const { userId, terminationType, terminationDate, terminationReason, terminationSubReason,
              lastWorkDay, severancePayment, otherPayments, totalPayment, returnedItems,
              exitInterview, performanceRating, recommendation, documents, notes,
              noticeGiven, finalSalary } = req.body;

      if (!userId || !terminationType || !terminationDate) {
        return res.status(400).json({ message: "userId, terminationType ve terminationDate zorunludur" });
      }

      const employee = await storage.getUser(userId);
      if (!employee) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      const hireDate = employee.startDate ? new Date(employee.startDate) : new Date(employee.createdAt || new Date());
      const termDate = new Date(terminationDate);
      const yearsOfService = (termDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      let noticePeriodDays = 14;
      if (yearsOfService >= 3) noticePeriodDays = 56;
      else if (yearsOfService >= 1.5) noticePeriodDays = 42;
      else if (yearsOfService >= 0.5) noticePeriodDays = 28;

      const noticeEndDate = new Date(termDate);
      noticeEndDate.setDate(noticeEndDate.getDate() + noticePeriodDays);

      const severanceEligible = ['termination', 'retirement', 'mutual_agreement'].includes(terminationType) && yearsOfService >= 1;

      const result = await db.insert(employeeTerminations)
        .values({
          userId,
          terminationType,
          terminationDate,
          terminationReason,
          terminationSubReason: terminationSubReason || null,
          lastWorkDay: lastWorkDay || null,
          noticeGiven: noticeGiven || noticePeriodDays,
          finalSalary: finalSalary || null,
          severancePayment: severancePayment || null,
          otherPayments: otherPayments || null,
          totalPayment: totalPayment || null,
          returnedItems: returnedItems || null,
          exitInterview: exitInterview || null,
          performanceRating: performanceRating || null,
          recommendation: recommendation || null,
          documents: documents || null,
          notes: notes || null,
          processedById: user.id,
          noticePeriodDays,
          noticeEndDate: noticeEndDate.toISOString().split('T')[0],
          severanceEligible,
        })
        .returning();

      const empName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
      const typeLabels: Record<string, string> = {
        resignation: 'İstifa', termination: 'Fesih/İşten Çıkarma',
        retirement: 'Emeklilik', mutual_agreement: 'Karşılıklı Anlaşma', contract_end: 'Sözleşme Sonu'
      };
      const typeLabel = typeLabels[terminationType] || terminationType;

      const notifTitle = `Personel Ayrılışı: ${empName}`;
      let notifMessage = `${empName} - ${typeLabel} (${terminationDate})`;
      if (severanceEligible) {
        notifMessage += ` | Kıdem tazminatı hakkı var (${Math.floor(yearsOfService)} yıl)`;
      }
      notifMessage += ` | İhbar süresi: ${noticePeriodDays} gün (${noticeEndDate.toISOString().split('T')[0]})`;

      const hqUsers = await db.select({ id: users.id, role: users.role })
        .from(users)
        .where(sql`${users.role} IN ('admin', 'muhasebe', 'muhasebe_ik') AND ${users.isActive} = true`);
      
      for (const hqUser of hqUsers) {
        try {
          await storage.createNotification({
            userId: hqUser.id,
            type: 'employee_departure',
            title: notifTitle,
            message: notifMessage,
            link: `/personel-detay/${userId}`,
            branchId: employee.branchId,
          });
        } catch (error: unknown) { console.error("Termination notification error:", error); }
      }

      if (employee.branchId) {
        const branchSupervisors = await db.select({ id: users.id })
          .from(users)
          .where(sql`${users.branchId} = ${employee.branchId} AND ${users.role} IN ('supervisor', 'supervisor_buddy') AND ${users.isActive} = true`);
        
        for (const sup of branchSupervisors) {
          try {
            await storage.createNotification({
              userId: sup.id,
              type: 'employee_departure',
              title: notifTitle,
              message: notifMessage,
              link: `/personel-detay/${userId}`,
              branchId: employee.branchId,
            });
          } catch (error: unknown) { console.error("Supervisor termination notification error:", error); }
        }
      }

      try {
        const { sendNotificationEmail } = await import('./email');
        for (const hqUser of hqUsers) {
          const hqUserData = await storage.getUser(hqUser.id);
          if (hqUserData?.email) {
            sendNotificationEmail(
              hqUserData.email,
              `Personel Ayrılışı - ${empName}`,
              `${notifMessage}\n\nİşlem yapan: ${user.fullName || user.firstName}\n\nDetaylar için sisteme giriş yapın.`,
              'warning'
            ).catch(err => console.error("Termination email error:", err));
          }
        }
      } catch (error: unknown) { console.error("Email notification error:", error); }

      res.status(201).json(result[0]);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateTermination");
    }
  });

  // PATCH /api/employee-terminations/:id - Update termination record
  router.patch('/api/employee-terminations/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      const id = parseInt(req.params.id);
      const result = await db.update(employeeTerminations)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(employeeTerminations.id, id))
        .returning();
      if (result.length === 0) {
        return res.status(404).json({ message: 'Kayd bulunamadı' });
      }
      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error updating termination:", error);
      res.status(500).json({ message: "Ayrılış kaydı güncellenirken hata oluştu" });
    }
  });


  // GET /api/hr/recruitment-stats - Get recruitment statistics
  router.get('/api/hr/recruitment-stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'İstatistiklere erişim yetkiniz yok' });
      }

      // Get counts
      const openPositions = await db.select({ count: sql`COUNT(*)` })
        .from(jobPositions)
        .where(eq(jobPositions.status, 'open'));
      
      const newApplications = await db.select({ count: sql`COUNT(*)` })
        .from(jobApplications)
        .where(eq(jobApplications.status, 'new'));
      
      const scheduledInterviews = await db.select({ count: sql`COUNT(*)` })
        .from(interviews)
        .where(eq(interviews.status, 'scheduled'));
      
      const hiredThisMonth = await db.select({ count: sql`COUNT(*)` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.status, 'hired'),
            sql`${jobApplications.updatedAt} >= date_trunc('month', CURRENT_DATE)`
          )
        );

      res.json({
        openPositions: Number(openPositions[0]?.count || 0),
        newApplications: Number(newApplications[0]?.count || 0),
        scheduledInterviews: Number(scheduledInterviews[0]?.count || 0),
        hiredThisMonth: Number(hiredThisMonth[0]?.count || 0),
      });
    } catch (error: unknown) {
      console.error("Error fetching recruitment stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  // ==========================================
  // İZİN VE TATİL YÖNETİMİ API'LARI
  // ==========================================

  // GET /api/employee-leaves - Çalışan izin bakiyelerini getir (sadece admin)
  router.get('/api/employee-leaves', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // RBAC: HQ rolleri ve admin izin bakiyelerini görebilir
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      
      const { userId, year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Build query conditions
      const conditions = [eq(employeeLeaves.year, targetYear)];
      if (userId) {
        conditions.push(eq(employeeLeaves.userId, userId as string));
      }
      
      const result = await db.select()
        .from(employeeLeaves)
        .leftJoin(users, eq(employeeLeaves.userId, users.id))
        .where(and(...conditions));
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error fetching employee leaves:", error);
      res.status(500).json({ message: "İzin bakiyeleri yüklenirken hata oluştu" });
    }
  });

  // GET /api/public-holidays - Resmi tatilleri getir
  router.get('/api/public-holidays', isAuthenticated, async (req, res) => {
    try {
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const result = await db.select()
        .from(publicHolidays)
        .where(eq(publicHolidays.year, targetYear))
        .orderBy(publicHolidays.date);
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error fetching public holidays:", error);
      res.status(500).json({ message: "Resmi tatiller yüklenirken hata oluştu" });
    }
  });

  // POST /api/public-holidays - Resmi tatil ekle (sadece admin)
  router.post('/api/public-holidays', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      
      // Zod validasyonu
      const validated = insertPublicHolidaySchema.parse(req.body);
      
      const result = await db.insert(publicHolidays)
        .values(validated)
        .returning();
      
      res.status(201).json(result[0]);
    } catch (error: unknown) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Geçersiz veri', errors: error.errors });
      }
      console.error("Error creating public holiday:", error);
      res.status(500).json({ message: "Resmi tatil eklenirken hata oluştu" });
    }
  });


export default router;
