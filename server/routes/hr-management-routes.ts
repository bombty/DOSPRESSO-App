import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { AuthorizationError, ensurePermission } from "./helpers";
import { and, or, sum, max } from "drizzle-orm";
import { z } from "zod";
import {
  insertEmployeeDocumentSchema,
  insertDisciplinaryReportSchema,
  branches,
  users,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================
  // HR MANAGEMENT ENDPOINTS
  // ========================

  // GET /api/hr/monthly-attendance-summary - Monthly overtime and lateness summary
  router.get('/api/hr/monthly-attendance-summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Check permission: HQ roles or supervisors only
      if (!isHQRole(role) && role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Bu raporu görüntüleme yetkiniz yok" });
      }
      
      const { month, year, branchId, userId, category } = req.query;
      
      // Default to current month
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Calculate date range for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      
      // Get employees based on filters
      let employees = await db.select().from(users);
      
      // Branch restriction for supervisors (they can only see their own branch)
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        employees = employees.filter(emp => emp.branchId === user.branchId);
      } else if (branchId && branchId !== 'all') {
        // HQ users can filter by branch
        employees = employees.filter(emp => emp.branchId === parseInt(branchId as string));
      }
      
      // Category filter (subeler, hq, fabrika)
      if (category && category !== 'all') {
        if (category === 'subeler') {
          employees = employees.filter(emp => !isHQRole(emp.role as UserRoleType) && emp.role !== 'fabrika');
        } else if (category === 'hq') {
          employees = employees.filter(emp => isHQRole(emp.role as UserRoleType));
        } else if (category === 'fabrika') {
          employees = employees.filter(emp => emp.role === 'fabrika');
        }
      }
      
      // Specific user filter
      if (userId && userId !== 'all') {
        employees = employees.filter(emp => emp.id === userId);
      }
      
      // Get all branches for reference
      const branches = await storage.getBranches();
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      
      // Calculate summary for each employee
      const summaries = await Promise.all(employees.map(async (emp) => {
        // Get all shift attendances for this employee in the target month
        const attendances = await storage.getShiftAttendancesByUserAndDateRange(
          emp.id, 
          startDate, 
          endDate
        );
        
        // Calculate total worked minutes
        const totalWorkedMinutes = attendances.reduce((sum, a) => sum + (a.totalWorkedMinutes || 0), 0);
        const totalWorkedHours = totalWorkedMinutes / 60;
        
        // Calculate overtime (hours over 45 per week × number of weeks in month)
        const weeksInMonth = Math.ceil(new Date(targetYear, targetMonth, 0).getDate() / 7);
        const expectedMaxHours = 45 * weeksInMonth;
        const overtimeHours = Math.max(0, totalWorkedHours - expectedMaxHours);
        
        // Calculate late arrivals
        const lateArrivals = attendances.filter(a => (a.latenessMinutes || 0) > 0);
        const lateCount = lateArrivals.length;
        const totalLatenessMinutes = lateArrivals.reduce((sum, a) => sum + (a.latenessMinutes || 0), 0);
        
        // Calculate early leaves
        const earlyLeaves = attendances.filter(a => (a.earlyLeaveMinutes || 0) > 0);
        const earlyLeaveCount = earlyLeaves.length;
        const totalEarlyLeaveMinutes = earlyLeaves.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);
        
        // Calculate absences
        const absences = attendances.filter(a => a.status === 'absent').length;
        
        // Get approved overtime requests
        const overtimeRequests = await storage.getOvertimeRequestsByUser(emp.id);
        const approvedOvertimeMinutes = overtimeRequests
          .filter(r => r.status === 'approved' && r.createdAt && 
            new Date(r.createdAt) >= startDate && new Date(r.createdAt) <= endDate)
          .reduce((sum, r) => sum + (r.approvedMinutes || 0), 0);
        
        return {
          userId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          branchId: emp.branchId,
          branchName: emp.branchId ? branchMap.get(emp.branchId) || 'Bilinmiyor' : 'HQ',
          totalShifts: attendances.length,
          totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          approvedOvertimeMinutes,
          lateCount,
          totalLatenessMinutes,
          earlyLeaveCount,
          totalEarlyLeaveMinutes,
          absences,
          avgComplianceScore: attendances.length > 0 
            ? Math.round(attendances.reduce((sum, a) => sum + (a.complianceScore || 100), 0) / attendances.length)
            : 100,
        };
      }));
      
      // Calculate totals
      const totals = {
        totalEmployees: summaries.length,
        totalWorkedHours: parseFloat(summaries.reduce((sum, s) => sum + s.totalWorkedHours, 0).toFixed(2)),
        totalOvertimeHours: parseFloat(summaries.reduce((sum, s) => sum + s.overtimeHours, 0).toFixed(2)),
        totalLateArrivals: summaries.reduce((sum, s) => sum + s.lateCount, 0),
        totalLatenessMinutes: summaries.reduce((sum, s) => sum + s.totalLatenessMinutes, 0),
        totalAbsences: summaries.reduce((sum, s) => sum + s.absences, 0),
        avgComplianceScore: summaries.length > 0
          ? Math.round(summaries.reduce((sum, s) => sum + s.avgComplianceScore, 0) / summaries.length)
          : 100,
      };
      
      res.json({
        month: targetMonth,
        year: targetYear,
        summaries,
        totals,
      });
    } catch (error: unknown) {
      console.error("Error fetching monthly attendance summary:", error);
      res.status(500).json({ message: "Aylık mesai özeti yüklenirken hata oluştu" });
    }
  });

  // Employee Documents (Özlük Dosyası)
  // Get all employee documents (latest 20, with branch restrictions for branch users)
  router.get('/api/employee-documents', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;
      
      ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
      
      // Get all employees
      const allEmployees = await db.select().from(users);
      let documentsToReturn: any[] = [];
      
      // Collect all documents from all employees
      for (const employee of allEmployees) {
        // Branch users can only see their own branch (ignore query param)
        if (!isHQRole(user.role ) && employee.branchId !== user.branchId) {
          continue;
        }
        
        // HQ users: respect branchId query param if provided
        if (isHQRole(user.role ) && branchId) {
          const targetBranchId = parseInt(branchId as string);
          if (employee.branchId !== targetBranchId) {
            continue;
          }
        }
        
        const docs = await storage.getEmployeeDocuments(employee.id);
        // Attach user info to each document
        const docsWithUser = docs.map(doc => ({
          ...doc,
          user: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        }));
        documentsToReturn.push(...docsWithUser);
      }
      
      // Sort by upload date (newest first) and take latest 20
      documentsToReturn.sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      const latest20 = documentsToReturn.slice(0, 20);
      
      res.json(latest20);
    } catch (error: unknown) {
      console.error("Error fetching all employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  router.get('/api/employee-documents/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;
      
      // Supervisors can view their branch employees, HQ can view all
      if (!isHQRole(user.role )) {
        ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
        
        // Verify target user is in same branch
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personelini görüntüleyebilirsiniz" });
        }
      }
      
      const documents = await storage.getEmployeeDocuments(targetUserId);
      res.json(documents);
    } catch (error: unknown) {
      console.error("Error fetching employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  router.post('/api/employee-documents', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Personel belgesi ekleme yetkiniz yok');
      
      const validatedData = insertEmployeeDocumentSchema.parse({
        ...req.body,
        uploadedById: user.id,
      });
      
      // Verify user can add documents for this employee
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(validatedData.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personeline belge ekleyebilirsiniz" });
        }
      }
      
      const document = await storage.createEmployeeDocument(validatedData);
      res.json(document);
    } catch (error: unknown) {
      console.error("Error creating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Belge eklenirken hata oluştu" });
    }
  });

  router.patch('/api/employee-documents/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Personel belgesi düzenleme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission for this document's user
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi düzenleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateEmployeeDocument(docId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/employee-documents/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'delete', 'Personel belgesi silme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi silme yetkiniz yok" });
        }
      }
      
      await storage.deleteEmployeeDocument(docId);
      res.json({ message: "Belge silindi" });
    } catch (error: unknown) {
      console.error("Error deleting employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge silinirken hata oluştu" });
    }
  });

  router.post('/api/employee-documents/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      // Only HQ can verify documents
      if (!isHQRole(user.role )) {
        return res.status(403).json({ message: "Sadece merkez personel belgeleri onaylayabilir" });
      }
      
      const verified = await storage.verifyEmployeeDocument(docId, user.id);
      res.json(verified);
    } catch (error: unknown) {
      console.error("Error verifying employee document:", error);
      res.status(500).json({ message: "Belge onaylanırken hata oluştu" });
    }
  });

  // Disciplinary Reports (Disiplin İşlemleri)
  router.get('/api/disciplinary-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'view', 'Disiplin kayıtlarını görüntüleme yetkiniz yok');
      
      const { userId, status } = req.query;
      let branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Branch users can only see their own branch
      if (!isHQRole(user.role )) {
        branchId = user.branchId!;
      }
      
      const reports = await storage.getDisciplinaryReports(
        userId as string | undefined,
        branchId,
        status as string | undefined
      );
      
      res.json(reports);
    } catch (error: unknown) {
      console.error("Error fetching disciplinary reports:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Disiplin kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/disciplinary-reports/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'view', 'Disiplin kaydını görüntüleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
      }
      
      res.json(report);
    } catch (error: unknown) {
      console.error("Error fetching disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt yüklenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Disiplin kaydı oluşturma yetkiniz yok');
      
      const validatedData = insertDisciplinaryReportSchema.parse({
        ...req.body,
        reportedById: user.id,
      });
      
      // Verify branch access
      if (!isHQRole(user.role )) {
        if (validatedData.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubeniz için kayıt oluşturabilirsiniz" });
        }
        
        // Verify target user is in same branch
        const targetUser = await storage.getUser(validatedData.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personeli için kayıt oluşturabilirsiniz" });
        }
      }
      
      const report = await storage.createDisciplinaryReport(validatedData);
      res.json(report);
    } catch (error: unknown) {
      console.error("Error creating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kayıt oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/disciplinary-reports/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Disiplin kaydı düzenleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı düzenleme yetkiniz yok" });
      }
      
      const updated = await storage.updateDisciplinaryReport(reportId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt güncellenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports/:id/employee-response', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      const { response, attachments } = req.body;
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Only the employee can add their response
      if (report.userId !== user.id) {
        return res.status(403).json({ message: "Sadece kendi savunmanızı ekleyebilirsiniz" });
      }
      
      const updated = await storage.addEmployeeResponse(reportId, response, attachments);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error adding employee response:", error);
      res.status(500).json({ message: "Savunma eklenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      const { resolution, actionTaken } = req.body;
      
      ensurePermission(user, 'hr', 'edit', 'Disiplin kaydını sonuçlandırma yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı sonuçlandırma yetkiniz yok" });
      }
      
      const updated = await storage.resolveDisciplinaryReport(reportId, resolution, actionTaken, user.id);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error resolving disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt sonuçlandırılırken hata oluştu" });
    }
  });


  // System health and backup endpoints

export default router;
