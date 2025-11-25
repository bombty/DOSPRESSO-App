import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { sanitizeUser, sanitizeUsers, sanitizeUserForRole, sanitizeUsersForRole } from "./security";
import { 
  insertTaskSchema,
  updateTaskSchema,
  insertChecklistSchema,
  updateChecklistSchema,
  insertEquipmentFaultSchema, 
  insertKnowledgeBaseArticleSchema, 
  insertBranchSchema,
  insertTrainingModuleSchema,
  insertModuleVideoSchema,
  insertModuleLessonSchema,
  insertModuleQuizSchema,
  insertQuizQuestionSchema,
  insertUserQuizAttemptSchema,
  insertUserTrainingProgressSchema,
  updateUserSchema,
  insertUserSchema,
  insertEmployeeWarningSchema,
  insertLeaveRequestSchema,
  insertShiftAttendanceSchema,
  insertMenuSectionSchema,
  insertMenuItemSchema,
  insertMenuVisibilityRuleSchema,
  insertPageContentSchema,
  insertAuditTemplateSchema,
  insertAuditTemplateItemSchema,
  insertQualityAuditSchema,
  insertAuditItemScoreSchema,
  insertAuditInstanceSchema,
  insertAuditInstanceItemSchema,
  insertCustomerFeedbackSchema,
  insertMaintenanceScheduleSchema,
  insertMaintenanceLogSchema,
  insertCampaignSchema,
  insertCampaignBranchSchema,
  insertCampaignMetricSchema,
  insertFranchiseOnboardingSchema,
  insertOnboardingDocumentSchema,
  insertLicenseRenewalSchema,
  insertSiteSettingSchema,
  insertOvertimeRequestSchema,
  insertAttendancePenaltySchema,
  insertGuestComplaintSchema,
  insertEquipmentTroubleshootingStepSchema,
  insertMonthlyAttendanceSummarySchema,
  insertEmployeeDocumentSchema,
  insertDisciplinaryReportSchema,
  insertEmployeeOnboardingSchema,
  insertEmployeeOnboardingTaskSchema,
  insertMessageSchema,
  auditTemplates,
  auditTemplateItems,
  qualityAudits,
  auditItemScores,
  customerFeedback,
  branches,
  maintenanceSchedules,
  maintenanceLogs,
  campaigns,
  campaignBranches,
  campaignMetrics,
  franchiseOnboarding,
  onboardingDocuments,
  licenseRenewals,
  threadParticipants,
  hasPermission,
  isHQRole,
  isBranchRole,
  type UpdateUser,
  type UserRoleType,
  type InsertAuditTemplateItem,
  type ServiceRequestStatusType,
  equipmentServiceRequests
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { analyzeTaskPhoto, analyzeFaultPhoto, analyzeDressCodePhoto, generateArticleEmbeddings, generateEmbedding, answerQuestionWithRAG, answerTechnicalQuestion, generateAISummary, generateQuizQuestionsFromLesson, generateFlashcardsFromLesson, evaluateBranchPerformance, diagnoseFault } from "./ai";
import { startReminderSystem } from "./reminders";
import bcrypt from "bcrypt";
import { z } from "zod";

// Global type declarations for runtime state
declare global {
  var fileAccessTokens: Map<string, { path: string; userId: string; expiresAt: number }> | undefined;
}

// Update schema for page content - allows partial updates, immutable createdById
const updatePageContentSchema = insertPageContentSchema.partial().omit({
  createdById: true,
});

// Safe task update schema - only allows user-editable fields
const safeTaskUpdateSchema = updateTaskSchema.pick({
  description: true,
  priority: true,
  dueDate: true,
  assignedToId: true,
});

// Helper function to assert branch scope for branch users
function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

// Custom error for permission denial
class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

// Permission enforcement helper
function ensurePermission(user: any, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module as any, action as any)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // POST /api/auth/register - Public registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { sendApprovalRequestEmail, sendWelcomeEmail } = await import('./email');
      const crypto = await import('crypto');
      
      // Valid roles from UserRole enum
      const validRoles = [
        'admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq',
        'stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'yatirimci_branch'
      ] as const;
      
      const registerSchema = z.object({
        email: z.string().email("Geçerli bir email adresi girin"),
        firstName: z.string().min(1, "Ad gerekli"),
        lastName: z.string().min(1, "Soyad gerekli"),
        username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
        password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
        role: z.enum(validRoles, { errorMap: () => ({ message: "Geçersiz rol seçimi" }) }),
        branchId: z.number().nullable().optional(),
      });

      const data = registerSchema.parse(req.body);

      // Check if email already exists
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Bu email adresi zaten kayıtlı" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      // Determine if HQ role
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      const isHQ = hqRoles.includes(data.role);

      // Enforce: HQ roles MUST have null branchId
      if (isHQ && data.branchId !== null && data.branchId !== undefined) {
        return res.status(400).json({ message: "Merkez personeli şube ataması alamaz" });
      }

      // Enforce: Branch roles MUST have valid branchId
      if (!isHQ && (!data.branchId || typeof data.branchId !== 'number')) {
        return res.status(400).json({ message: "Şube personeli için şube seçimi zorunlu" });
      }

      // Validate branchId exists in database
      if (data.branchId) {
        const branchExists = await storage.getBranch(data.branchId);
        if (!branchExists) {
          return res.status(400).json({ message: "Geçersiz şube seçimi" });
        }
      }

      // Validate branch selection
      if (!isHQ && !data.branchId) {
        return res.status(400).json({ message: "Şube seçimi gerekli" });
      }
      if (isHQ && data.branchId) {
        return res.status(400).json({ message: "Merkez kullanıcılar şube seçemez" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user with pending status
      const newUser = await storage.createUser({
        email: data.email,
        username: data.username,
        hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        branchId: data.branchId || null,
        accountStatus: 'pending',
        isActive: false, // Inactive until approved
      });

      // Send approval email to appropriate admin
      if (isHQ) {
        // Send to system admin
        const admins = await storage.getUsersByRole('admin');
        for (const admin of admins) {
          if (admin.email && admin.accountStatus === 'approved') {
            await sendApprovalRequestEmail(
              admin.email,
              `${data.firstName} ${data.lastName}`,
              data.email
            );
          }
        }
      } else {
        // Send to branch supervisor
        const supervisors = await storage.getUsersByBranchAndRole(data.branchId!, 'supervisor');
        const branch = await storage.getBranch(data.branchId!);
        for (const supervisor of supervisors) {
          if (supervisor.email && supervisor.accountStatus === 'approved') {
            await sendApprovalRequestEmail(
              supervisor.email,
              `${data.firstName} ${data.lastName}`,
              data.email,
              branch?.name
            );
          }
        }
      }

      res.json({ 
        message: "Kayıt talebiniz alındı. Onay sonrası email ile bilgilendirileceksiniz.",
        userId: newUser.id 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Kayıt sırasında hata oluştu" });
    }
  });

  // POST /api/auth/forgot-password - Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { sendPasswordResetEmail } = await import('./email');
      const crypto = await import('crypto');
      
      const schema = z.object({
        email: z.string().email("Geçerli bir email adresi girin"),
      });

      const { email } = schema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists (security best practice)
        return res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi" });
      }

      // Generate reset token (plaintext for email)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Hash token using SHA-256 (deterministic, allows O(1) lookup)
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Store hashed token
      await storage.createPasswordResetToken({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        usedAt: null,
      });

      // Send email with plaintext token (user needs this for reset link)
      await sendPasswordResetEmail(email, token);

      res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "İşlem sırasında hata oluştu" });
    }
  });

  // POST /api/auth/reset-password/:token - Reset password with token
  app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
      const crypto = await import('crypto');
      const { token } = req.params;
      const schema = z.object({
        password: z.string().min(8, "Şifre en az 8 karakter olmalı")
          .regex(/[A-Z]/, "Şifre en az 1 büyük harf içermeli")
          .regex(/[0-9]/, "Şifre en az 1 rakam içermeli"),
      });

      const { password } = schema.parse(req.body);

      // Hash incoming token using SHA-256 (deterministic, O(1) lookup)
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Direct lookup by hashed token (O(1) instead of O(n))
      const resetToken = await storage.getPasswordResetToken(hashedToken);

      if (!resetToken || resetToken.usedAt) {
        return res.status(400).json({ message: "Geçersiz veya kullanılmış token" });
      }

      // Check expiration
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Token süresi dolmuş" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // CRITICAL: Mark token as used BEFORE updating password (prevents race condition)
      await storage.markPasswordResetTokenUsed(resetToken.id);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      res.json({ message: "Şifre başarıyla değiştirildi" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "İşlem sırasında hata oluştu" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/users - Get all users (sanitized, for dropdowns/selection)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId: filterBranchId } = req.query;

      // Permission check
      if (!hasPermission(user.role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Kullanıcı listesine erişim yetkiniz yok" });
      }

      // Branch filtering based on role
      let branchFilter: number | undefined;
      if (isBranchRole(user.role as UserRoleType)) {
        // Branch users only see their own branch users
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        branchFilter = user.branchId;
      } else if (isHQRole(user.role as UserRoleType)) {
        // HQ users can optionally filter by branch
        branchFilter = filterBranchId ? parseInt(filterBranchId as string) : undefined;
      }

      const users = await storage.getAllEmployees(branchFilter);
      res.json(sanitizeUsersForRole(users, user.role as UserRoleType));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // POST /api/upload/photo - Upload base64 photo to Object Storage
  app.post('/api/upload/photo', isAuthenticated, async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const { z } = await import('zod');
      const crypto = await import('crypto');
      
      const uploadSchema = z.object({
        dataUrl: z.string(),
        filename: z.string(),
      });
      
      const { dataUrl, filename } = uploadSchema.parse(req.body);
      
      // Parse base64 data URL
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Invalid data URL format" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate a secure access token for this file
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      // Upload to Object Storage
      const client = new Client();
      const path = `.private/shift-photos/${req.user.id}/${filename}`;
      const { ok, error } = await client.uploadFromBytes(path, buffer);
      
      if (!ok) {
        console.error("Object Storage upload failed:", error);
        return res.status(500).json({ message: "Upload failed", error });
      }
      
      // Store access token mapping (in-memory for now, use Redis/DB for production)
      if (!global.fileAccessTokens) {
        global.fileAccessTokens = new Map();
      }
      global.fileAccessTokens.set(accessToken, {
        path,
        userId: req.user.id,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });
      
      // Generate a fully qualified download URL with token
      const protocol = req.protocol || 'https';
      const host = req.get('host') || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const url = `${protocol}://${host}/api/files/public/${accessToken}`;
      
      res.json({ url, path, size: buffer.length });
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid upload data", errors: error.errors });
      }
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // GET /api/files/public/:token - Serve files via token (for AI services)
  app.get('/api/files/public/:token', async (req, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      const token = req.params.token;
      
      // Check token validity
      if (!global.fileAccessTokens || !global.fileAccessTokens.has(token)) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      const tokenData = global.fileAccessTokens.get(token);
      
      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        global.fileAccessTokens.delete(token);
        return res.status(404).json({ message: "Token expired" });
      }
      
      const { ok, value, error } = await client.downloadAsBytes(tokenData.path);
      
      if (!ok) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Detect mime type from path
      let mimeType = 'application/octet-stream';
      if (tokenData.path.endsWith('.jpg') || tokenData.path.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (tokenData.path.endsWith('.png')) {
        mimeType = 'image/png';
      }
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
      res.send(Buffer.from(value));
    } catch (error) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // GET /api/files/:path - Serve files from Object Storage (authenticated)
  app.get('/api/files/*', isAuthenticated, async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      const path = req.params[0];
      const user = req.user!;
      
      // Security: Only allow users to access their own files or public files
      if (path.startsWith('.private/shift-photos/')) {
        const pathParts = path.split('/');
        const fileUserId = pathParts[2]; // .private/shift-photos/{userId}/...
        
        // Only allow access to own files or HQ admin access
        if (fileUserId !== user.id && !isHQRole((user.role || 'employee') as UserRoleType)) {
          return res.status(403).json({ message: "Bu dosyaya erişim yetkiniz yok" });
        }
      }
      
      const { ok, value, error } = await client.downloadAsBytes(path);
      
      if (!ok) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Detect mime type from path
      let mimeType = 'application/octet-stream';
      if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (path.endsWith('.png')) {
        mimeType = 'image/png';
      }
      
      res.setHeader('Content-Type', mimeType);
      res.send(Buffer.from(value));
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Public endpoint for registration page (no auth required)
  app.get('/api/public/branches', async (req, res) => {
    try {
      const branches = await storage.getBranches();
      // Return only essential info for registration
      const publicBranches = branches.map(b => ({
        id: b.id,
        name: b.name,
        city: b.city,
      }));
      res.json(publicBranches);
    } catch (error) {
      console.error("Error fetching public branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.get('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Authorization: Branch users can only see their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        const branch = await storage.getBranch(user.branchId);
        return res.json(branch ? [branch] : []);
      }
      
      // HQ users can see all branches
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.get('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (user.branchId !== id) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }
      
      const branch = await storage.getBranch(id);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  app.get('/api/branches/:branchId/detail', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Geçersiz şube ID" });
      }

      // Authorization: Branch users can only access their own branch details
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (user.branchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }

      const branchDetails = await storage.getBranchDetails(branchId);
      if (!branchDetails) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      // Sanitize user data in staff list based on requester's role
      const sanitizedStaff = sanitizeUsersForRole(branchDetails.staff, user.role as UserRoleType);

      res.json({
        ...branchDetails,
        staff: sanitizedStaff,
      });
    } catch (error) {
      console.error("Error fetching branch details:", error);
      res.status(500).json({ message: "Şube detayları alınırken hata oluştu" });
    }
  });

  app.post('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Authorization: Only HQ users can create branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const validatedData = insertBranchSchema.parse(req.body);
      const branchData = {
        ...validatedData,
        address: validatedData.address ?? null,
        city: validatedData.city ?? null,
        phoneNumber: validatedData.phoneNumber ?? null,
        managerName: validatedData.managerName ?? null,
        openingHours: validatedData.openingHours ?? '08:00',
        closingHours: validatedData.closingHours ?? '22:00',
      };
      const branch = await storage.createBranch(branchData);
      res.json(branch);
    } catch (error: any) {
      console.error("Error creating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  // Personnel Profile
  app.get('/api/personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.params.id;

      // Authorization: Users can view their own profile, HQ can view all
      const isOwnProfile = user.id === userId;
      const isHQ = isHQRole(user.role as UserRoleType);

      if (!isOwnProfile && !isHQ) {
        // Branch supervisors can only view their branch members
        if (user.role === 'supervisor' && user.branchId) {
          const targetUser = await storage.getUserById(userId);
          // Require target user to exist and be in same branch
          if (!targetUser) {
            return res.status(404).json({ message: "Personel bulunamadı" });
          }
          if (targetUser.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu personel profiline erişim yetkiniz yok" });
          }
        } else {
          return res.status(403).json({ message: "Bu personel profiline erişim yetkiniz yok" });
        }
      }

      const profile = await storage.getPersonnelProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching personnel profile:", error);
      res.status(500).json({ message: "Personel profili alınırken hata oluştu" });
    }
  });

  app.patch('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Only HQ users can update branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const validatedData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(id, validatedData);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error: any) {
      console.error("Error updating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  // Update branch settings (HQ + supervisors for own branch)
  app.patch('/api/branches/:id/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Authorization: HQ users or supervisors (own branch only)
      if (!isHQRole(role) && role !== 'supervisor') {
        return res.status(403).json({ message: "Şube ayarlarını düzenleme yetkiniz yok" });
      }

      // Supervisors can only edit their own branch
      if (role === 'supervisor' && user.branchId !== id) {
        return res.status(403).json({ message: "Sadece kendi şubenizin ayarlarını değiştirebilirsiniz" });
      }

      const { openingHours, closingHours } = req.body;

      if (!openingHours && !closingHours) {
        return res.status(400).json({ message: "En az bir ayar değeri gerekli" });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (openingHours && !timeRegex.test(openingHours)) {
        return res.status(400).json({ message: "Açılış saati geçersiz format (HH:MM)" });
      }
      if (closingHours && !timeRegex.test(closingHours)) {
        return res.status(400).json({ message: "Kapanış saati geçersiz format (HH:MM)" });
      }

      // Fetch current branch to preserve unspecified fields
      const currentBranch = await storage.getBranch(id);
      if (!currentBranch) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      const branch = await storage.updateBranchSettings(id, {
        openingHours: openingHours || currentBranch.openingHours || '08:00',
        closingHours: closingHours || currentBranch.closingHours || '22:00',
      });

      res.json(branch);
    } catch (error) {
      console.error("Error updating branch settings:", error);
      res.status(500).json({ message: "Şube ayarları güncellenemedi" });
    }
  });

  app.delete('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Only HQ users can delete branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await storage.deleteBranch(id);
      res.json({ message: "Branch deleted successfully" });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedAssignedToId = req.query.assignedToId as string | undefined;
      
      // Permission check
      ensurePermission(user, 'tasks', 'view');
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // SECURITY: Branch users can ONLY see tasks assigned to themselves
        // Ignore any assignedToId query parameter to prevent unauthorized data access
        const tasks = await storage.getTasks(user.branchId, user.id); // Always user.id for branch users
        return res.json(tasks);
      }
      
      // HQ users can access all or filter by branch/assignedTo
      const tasks = await storage.getTasks(requestedBranchId, requestedAssignedToId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Permission check
      ensurePermission(user, 'tasks', 'create');
      
      // Authorization: Branch users can only create tasks for their own branch
      // FORCE branchId to user's branch for branch users (ignore payload)
      let taskBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        taskBranchId = branchId; // Override payload branchId
      }
      
      const task = await storage.createTask({
        ...validatedData,
        branchId: taskBranchId,
        assignedToId: validatedData.assignedToId || userId,
      });
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.post('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
      // Permission check
      ensurePermission(user, 'tasks', 'edit');
      
      // Authorization: Branch users can only complete tasks from their own branch
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTask.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu görevi tamamlama yetkiniz yok" });
        }
      }
      
      const task = await storage.completeTask(id, photoUrl);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (photoUrl) {
        try {
          const analysis = await analyzeTaskPhoto(photoUrl, task.description, userId);
          const updatedTask = await storage.updateTask(id, {
            aiAnalysis: analysis.analysis,
            aiScore: analysis.score,
          });
          res.json(updatedTask || task);
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          res.json(task);
        }
      } else {
        res.json(task);
      }
    } catch (error) {
      console.error("Error completing task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // PUT /api/tasks/:id - Update task (safe fields only)
  app.put('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const validatedData = safeTaskUpdateSchema.parse(req.body);
      
      // Permission check
      ensurePermission(user, 'tasks', 'edit');
      
      // Authorization: Get existing task to verify ownership
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Branch users can only edit their own branch tasks
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTask.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu görevi düzenleme yetkiniz yok" });
        }
      }
      
      const task = await storage.updateTask(id, validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error updating task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz görev verisi", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev güncellenemedi" });
    }
  });

  // POST /api/tasks/:id/start - Start working on task
  app.post('/api/tasks/:id/start', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Permission check
      ensurePermission(user, 'tasks', 'edit');
      
      // Authorization: Get existing task to verify ownership
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Branch users can only start their own branch tasks
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTask.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu görevi başlatma yetkiniz yok" });
        }
      }
      
      // Status transition validation: can only start from beklemede or reddedildi
      if (existingTask.status !== "beklemede" && existingTask.status !== "reddedildi") {
        return res.status(400).json({ 
          message: "Görev sadece 'beklemede' veya 'reddedildi' durumlarından başlatılabilir" 
        });
      }
      
      const task = await storage.updateTask(id, { status: "devam_ediyor" });
      res.json(task);
    } catch (error) {
      console.error("Error starting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev başlatılamadı" });
    }
  });

  // POST /api/tasks/:id/verify - Verify and approve task (HQ only)
  app.post('/api/tasks/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Permission check: Only HQ roles can verify tasks
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev onaylayabilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      // Get existing task
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Status transition validation: can only verify completed/reviewed tasks
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından onaylanabilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      // Update status to verified
      const task = await storage.updateTask(id, { status: "onaylandi" });
      res.json(task);
    } catch (error) {
      console.error("Error verifying task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  // POST /api/tasks/:id/reject - Reject task (HQ only)
  app.post('/api/tasks/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      // Permission check: Only HQ roles can reject tasks
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev reddedebilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      // Get existing task
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Status transition validation: can only reject completed/reviewed tasks
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından reddedilebilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      // Update status to rejected and add reason to AI analysis field
      const updates: any = { status: "reddedildi" };
      if (reason) {
        updates.aiAnalysis = `RED NEDENİ: ${reason}${existingTask.aiAnalysis ? '\n\nÖNCEKİ ANALİZ: ' + existingTask.aiAnalysis : ''}`;
      }
      
      const task = await storage.updateTask(id, updates);
      res.json(task);
    } catch (error) {
      console.error("Error rejecting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev reddedilemedi" });
    }
  });

  app.get('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const checklists = await storage.getChecklists();
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

  app.post('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      
      const { tasks: tasksArray, ...checklistData } = req.body;
      const validatedChecklistData = insertChecklistSchema.parse(checklistData);
      
      if (tasksArray && Array.isArray(tasksArray) && tasksArray.length > 0) {
        const { insertChecklistTaskSchema } = await import('@shared/schema');
        
        const orders = tasksArray.map((t: any) => t.order);
        const duplicateOrders = orders.filter((order: number, index: number) => orders.indexOf(order) !== index);
        if (duplicateOrders.length > 0) {
          return res.status(400).json({ message: `Duplicate order values: ${duplicateOrders.join(', ')}` });
        }
        
        const validatedTasks = tasksArray.map((task: any) => 
          insertChecklistTaskSchema.parse({
            taskDescription: task.taskDescription,
            requiresPhoto: task.requiresPhoto,
            order: task.order,
            checklistId: 0,
          })
        );
        
        const checklist = await storage.createChecklistWithTasks(validatedChecklistData, validatedTasks);
        res.json(checklist);
      } else {
        const checklist = await storage.createChecklist(validatedChecklistData);
        res.json(checklist);
      }
    } catch (error: any) {
      console.error("Error creating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create checklist" });
    }
  });

  // Update checklist with tasks (HQ coach always, supervisors only if isEditable=true)
  app.patch('/api/checklists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Fetch checklist first to check isEditable
      const existingChecklist = await storage.getChecklist(id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }

      // Authorization:
      // - HQ coach: Always allowed
      // - Supervisors: Only if isEditable=true
      // - Others: Denied
      if (role === 'coach') {
        // HQ coach can always edit
      } else if (role === 'supervisor' || role === 'supervisor_buddy') {
        // Supervisors can only edit if isEditable=true
        if (!existingChecklist.isEditable) {
          return res.status(403).json({ message: "Bu checklist düzenlenemez (isEditable=false)" });
        }
      } else {
        // All other roles denied
        return res.status(403).json({ message: "Checklist düzenleme yetkiniz yok" });
      }

      // Validate and update using new storage method
      const validatedData = updateChecklistSchema.parse(req.body);
      const checklist = await storage.updateChecklistWithTasks(id, validatedData);

      res.json(checklist!);
    } catch (error: any) {
      console.error("Error updating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: "Checklist güncellenemedi" });
    }
  });

  app.get('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const id = parseInt(req.params.id);
      const checklist = await storage.getChecklist(id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }
      const tasks = await storage.getChecklistTasks(id);
      res.json({ ...checklist, tasks });
    } catch (error) {
      console.error("Error fetching checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist getirilemedi" });
    }
  });

  app.delete('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const id = parseInt(req.params.id);
      await storage.deleteChecklist(id);
      res.json({ message: "Checklist silindi" });
    } catch (error) {
      console.error("Error deleting checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist silinemedi" });
    }
  });

  app.get('/api/checklist-tasks', isAuthenticated, async (req, res) => {
    try {
      const checklistId = req.query.checklistId ? parseInt(req.query.checklistId as string) : undefined;
      const tasks = await storage.getChecklistTasks(checklistId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching checklist tasks:", error);
      res.status(500).json({ message: "Failed to fetch checklist tasks" });
    }
  });

  app.post('/api/checklists/:id/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      const checklistId = parseInt(req.params.id);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.parse({ ...req.body, checklistId });
      
      const existingTasks = await storage.getChecklistTasks(checklistId);
      const duplicateOrder = existingTasks.find(t => t.order === validatedData.order);
      if (duplicateOrder) {
        return res.status(400).json({ message: `Order ${validatedData.order} already exists for this checklist` });
      }
      
      const task = await storage.createChecklistTask(validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error creating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task oluşturulamadı" });
    }
  });

  app.patch('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'update');
      const taskId = parseInt(req.params.taskId);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.partial().parse(req.body);
      const task = await storage.updateChecklistTask(taskId, validatedData);
      if (!task) {
        return res.status(404).json({ message: "Task bulunamadı" });
      }
      res.json(task);
    } catch (error: any) {
      console.error("Error updating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task güncellenemedi" });
    }
  });

  app.delete('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const taskId = parseInt(req.params.taskId);
      await storage.deleteChecklistTask(taskId);
      res.json({ message: "Task silindi" });
    } catch (error) {
      console.error("Error deleting checklist task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task silinemedi" });
    }
  });

  // Get troubleshooting steps for equipment type
  app.get('/api/troubleshooting/:equipmentType', isAuthenticated, async (req, res) => {
    try {
      const equipmentType = req.params.equipmentType;
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching troubleshooting steps:", error);
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/faults', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      ensurePermission(user, 'equipment_faults', 'view');
      
      // Authorization: Branch users can only access their own branch faults
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const faults = await storage.getFaults(branchId);
        return res.json(faults);
      }
      
      // HQ users can access all or filter by branch
      const faults = await storage.getFaults(requestedBranchId);
      res.json(faults);
    } catch (error) {
      console.error("Error fetching faults:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch faults" });
    }
  });

  app.post('/api/faults', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertEquipmentFaultSchema.parse(req.body);
      
      ensurePermission(user, 'equipment_faults', 'create');
      
      // Authorization: Branch users can only create faults for their own branch
      let faultBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Force branch users to create faults only for their branch
        faultBranchId = branchId;
      }
      
      // Mandatory Troubleshooting Enforcement
      // If troubleshooting steps exist for this equipment type and user hasn't completed them, reject the fault
      if (validatedData.equipmentId) {
        const equipment = await storage.getEquipmentById(validatedData.equipmentId);
        if (equipment) {
          const completedSteps = validatedData.completedTroubleshootingSteps || [];
          const troubleshootingCheck = await storage.isTroubleshootingCompleteForEquipment(
            equipment.equipmentType,
            completedSteps
          );
          
          if (!troubleshootingCheck.complete) {
            return res.status(400).json({
              message: "Arıza bildirimi için önce sorun giderme adımlarını tamamlamanız gerekiyor",
              requiresTroubleshooting: true,
              missingSteps: troubleshootingCheck.missingSteps,
              allRequiredSteps: troubleshootingCheck.requiredSteps,
            });
          }
        }
      }
      
      const fault = await storage.createFault({
        ...validatedData,
        branchId: faultBranchId,
        reportedById: userId,
      });
      
      // Save troubleshooting completion records
      if (validatedData.completedTroubleshootingSteps && validatedData.completedTroubleshootingSteps.length > 0) {
        for (const step of validatedData.completedTroubleshootingSteps) {
          await storage.createTroubleshootingCompletion({
            faultId: fault.id,
            stepId: step.stepId,
            completedById: userId,
            notes: step.notes || null,
          });
        }
      }
      
      res.json(fault);
    } catch (error: any) {
      console.error("Error creating fault:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid fault data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create fault" });
    }
  });

  app.post('/api/faults/ai-diagnose', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { equipmentType, faultDescription } = req.body;
      
      if (!equipmentType || !faultDescription) {
        return res.status(400).json({ message: "Ekipman tipi ve arıza açıklaması zorunludur" });
      }

      const diagnosis = await diagnoseFault(equipmentType, faultDescription, user.id);
      res.json(diagnosis);
    } catch (error: any) {
      console.error("Error diagnosing fault:", error);
      res.status(500).json({ message: error.message || "Arıza analiz edilemedi" });
    }
  });

  app.post('/api/faults/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
      // Authorization: Branch users can only update faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı düzenleme yetkiniz yok" });
        }
      }
      
      // Update photo URL after authorization check
      if (photoUrl) {
        const fault = await storage.updateFault(id, { photoUrl });
        if (!fault) {
          return res.status(404).json({ message: "Fault not found" });
        }

        try {
          const analysis = await analyzeFaultPhoto(
            photoUrl,
            fault.equipmentName,
            fault.description,
            userId
          );
          const updatedFault = await storage.updateFault(id, {
            aiAnalysis: analysis.analysis,
            aiSeverity: analysis.severity,
            aiRecommendations: analysis.recommendations,
          });
          res.json(updatedFault || fault);
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          res.json(fault);
        }
      } else {
        // If no photo URL provided, just return existing fault
        res.json(existingFault);
      }
    } catch (error) {
      console.error("Error updating fault photo:", error);
      res.status(500).json({ message: "Failed to update fault photo" });
    }
  });

  app.post('/api/faults/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Branch users can only resolve faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı çözme yetkiniz yok" });
        }
      }
      
      const fault = await storage.resolveFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      res.json(fault);
    } catch (error) {
      console.error("Error resolving fault:", error);
      res.status(500).json({ message: "Failed to resolve fault" });
    }
  });

  app.put('/api/faults/:id/stage', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stage, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!stage) {
        return res.status(400).json({ message: "Stage is required" });
      }
      
      // Validate stage value
      const { FAULT_STAGES } = await import('@shared/schema');
      const validStages = Object.values(FAULT_STAGES);
      if (!validStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid stage value" });
      }
      
      // Check permissions: branch vs hq_teknik
      const faultToUpdate = await storage.getFault(id);
      if (!faultToUpdate) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      // Permission logic:
      // - HQ teknik role can change any fault stage
      // - Branch roles (supervisor, barista, stajyer) can only change their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || faultToUpdate.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın aşamasını değiştirme yetkiniz yok" });
        }
      }
      
      const fault = await storage.changeFaultStage(id, stage, userId, notes);
      res.json(fault);
    } catch (error) {
      console.error("Error changing fault stage:", error);
      res.status(500).json({ message: "Failed to change fault stage" });
    }
  });

  app.patch('/api/faults/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentStage, assignedTo, notes, actualCost } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }

      // Permission logic: branch users can only manage their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;

      if (!isTeknik) {
        if (!isBranchUser || !userBranchId || existingFault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızayı düzenleme yetkiniz yok" });
        }
      }

      const updateData: any = {};
      if (currentStage) updateData.currentStage = currentStage;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
      if (actualCost !== undefined) updateData.actualCost = actualCost ? parseFloat(actualCost) : null;

      // If stage is being updated, record the transition
      if (currentStage && currentStage !== existingFault.currentStage) {
        // Record stage transition with notes
        await storage.changeFaultStage(id, currentStage, userId, notes || undefined);
      } else if (assignedTo !== undefined || actualCost !== undefined) {
        // Just update the fault without stage change
        const updated = await storage.updateFault(id, updateData);
        return res.json(updated);
      }

      const updated = await storage.getFault(id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating fault:", error);
      res.status(500).json({ message: "Failed to update fault" });
    }
  });

  app.get('/api/faults/:id/history', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user.role;
      
      // Check permissions for viewing history
      const fault = await storage.getFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      // Permission logic: same as stage change
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || fault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın geçmişini görüntüleme yetkiniz yok" });
        }
      }
      
      const history = await storage.getFaultStageHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching fault history:", error);
      res.status(500).json({ message: "Failed to fetch fault history" });
    }
  });

  // Equipment routes
  app.get('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      ensurePermission(user, 'equipment', 'view');
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const equipment = await storage.getEquipment(user.branchId);
        return res.json(equipment);
      }
      
      // HQ users can access all or filter by branch
      const equipment = await storage.getEquipment(requestedBranchId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.get('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      ensurePermission(user, 'equipment', 'view');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Authorization: Branch users can only access their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || equipmentItem.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmana erişim yetkiniz yok" });
        }
      }

      // Fetch related data
      const [maintenanceLogs, faults, comments] = await Promise.all([
        storage.getEquipmentMaintenanceLogs(id),
        storage.getFaults(equipmentItem.branchId),
        storage.getEquipmentComments(id)
      ]);

      // Filter faults to only those for this equipment
      const equipmentFaults = faults.filter(f => f.equipmentId === id);

      res.json({
        ...equipmentItem,
        maintenanceLogs,
        faults: equipmentFaults,
        comments
      });
    } catch (error) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.post('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      // Authorization: Branch users can only create equipment for their own branch
      // FORCE branchId to user's branch for branch users (ignore payload)
      let equipmentBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        equipmentBranchId = branchId; // Override payload branchId
      }
      
      // Create equipment first to get ID
      const equipment = await storage.createEquipment({
        ...validatedData,
        branchId: equipmentBranchId,
        qrCodeUrl: null, // Will be generated after creation
      });
      
      // Generate QR code as base64 data URL
      const { generateEquipmentQR } = await import('./ai');
      const qrCodeUrl = await generateEquipmentQR(equipment.id);
      await storage.updateEquipment(equipment.id, { qrCodeUrl });
      
      res.json({ ...equipment, qrCodeUrl });
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.put('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.partial().parse(req.body);
      
      // Authorization: Branch users can only update equipment from their own branch
      const existingEquipment = await storage.getEquipmentById(id);
      if (!existingEquipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingEquipment.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmanı düzenleme yetkiniz yok" });
        }
        // Prevent changing branchId
        if (validatedData.branchId && validatedData.branchId !== user.branchId) {
          return res.status(403).json({ message: "Ekipmanın şubesini değiştiremezsiniz" });
        }
      }
      
      // Auto-generate QR code if missing
      if (!existingEquipment.qrCodeUrl) {
        const { generateEquipmentQR } = await import('./ai');
        validatedData.qrCodeUrl = await generateEquipmentQR(id);
      }
      
      const equipment = await storage.updateEquipment(id, validatedData);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // Bulk QR Code Generation (HQ only)
  app.post('/api/equipment/generate-qr-bulk', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // HQ only
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece HQ yetkilileri toplu QR oluşturabilir" });
      }
      
      // Get all equipment (no branchId = all)
      const allEquipment = await storage.getEquipment();
      const missingQR = allEquipment.filter(e => !e.qrCodeUrl);
      
      if (missingQR.length === 0) {
        return res.json({ 
          message: "Tüm ekipmanların QR kodları mevcut", 
          generated: 0,
          total: allEquipment.length 
        });
      }
      
      // Generate QR codes
      const { generateEquipmentQR } = await import('./ai');
      let successCount = 0;
      
      for (const equipment of missingQR) {
        try {
          const qrCodeUrl = await generateEquipmentQR(equipment.id);
          await storage.updateEquipment(equipment.id, { qrCodeUrl });
          successCount++;
        } catch (error) {
          console.error(`QR generation failed for equipment ${equipment.id}:`, error);
        }
      }
      
      res.json({ 
        message: `${successCount} ekipman için QR kodu oluşturuldu`,
        generated: successCount,
        total: allEquipment.length,
        missing: missingQR.length
      });
    } catch (error) {
      console.error("Bulk QR generation error:", error);
      res.status(500).json({ message: "QR kod oluşturma başarısız" });
    }
  });

  app.post('/api/equipment/:id/maintenance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentMaintenanceLogSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only log maintenance for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için bakım kaydı oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentMaintenanceLogSchema.parse(req.body);
      const maintenanceLog = await storage.createEquipmentMaintenanceLog({
        ...validatedData,
        equipmentId: id,
        performedBy: userId,
      });

      // Update equipment maintenance dates
      const intervalDays = equipmentItem.maintenanceIntervalDays || 30;
      await storage.logMaintenance(id, intervalDays);
      
      res.json(maintenanceLog);
    } catch (error: any) {
      console.error("Error logging maintenance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log maintenance" });
    }
  });

  app.post('/api/equipment/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentCommentSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only comment on their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için yorum oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentCommentSchema.parse(req.body);
      const comment = await storage.createEquipmentComment({
        ...validatedData,
        equipmentId: id,
        userId,
      });
      res.json(comment);
    } catch (error: any) {
      console.error("Error creating equipment comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Equipment Service Request routes
  app.get('/api/equipment/:id/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only view requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis taleplerini görüntüleme yetkiniz yok" });
        }
      }
      
      const serviceRequests = await storage.listServiceRequests(id);
      res.json(serviceRequests);
    } catch (error: any) {
      console.error("Error fetching service requests:", error);
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  app.post('/api/equipment/:id/service-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentServiceRequestSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only create requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis talebi oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentServiceRequestSchema.parse(req.body);
      const serviceRequest = await storage.createServiceRequest({
        ...validatedData,
        equipmentId: id,
        createdById: userId,
      });
      res.json(serviceRequest);
    } catch (error: any) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  app.get('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only view requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini görüntüleme yetkiniz yok" });
        }
      }
      
      res.json(serviceRequest);
    } catch (error: any) {
      console.error("Error fetching service request:", error);
      res.status(500).json({ message: "Failed to fetch service request" });
    }
  });

  app.patch('/api/equipment/service-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only update requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequest(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  app.delete('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only delete requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini silme yetkiniz yok" });
        }
      }
      
      await storage.deleteServiceRequest(id);
      res.json({ message: "Service request deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting service request:", error);
      res.status(500).json({ message: "Failed to delete service request" });
    }
  });

  app.patch('/api/equipment/service-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { newStatus, notes } = req.body;
      
      if (!newStatus) {
        return res.status(400).json({ message: "newStatus is required" });
      }
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only update status for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebinin durumunu güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequestStatus(id, newStatus, userId, notes);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating service request status:", error);
      if (error.message?.includes("Invalid status transition")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update service request status" });
    }
  });

  app.post('/api/equipment/service-requests/:id/timeline', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { notes, meta } = req.body;
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only add timeline entries for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebine not ekleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.appendTimelineEntry(id, {
        timestamp: new Date().toISOString(),
        status: serviceRequest.status,
        actorId: userId,
        notes: notes || '',
        meta: meta || {},
      });
      res.json(updated);
    } catch (error: any) {
      console.error("Error adding timeline entry:", error);
      res.status(500).json({ message: "Failed to add timeline entry" });
    }
  });

  // Global service requests list endpoint (HQ management page)
  app.get('/api/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { ServiceRequestStatusType } = await import('@shared/schema');
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedStatus = req.query.status as typeof ServiceRequestStatusType | undefined;
      
      // HQ users can see all service requests or filter by branch
      // Branch users can only see their own branch's service requests
      let branchId = requestedBranchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }
      
      // Get all equipment for the branch (or all if HQ)
      const allEquipment = await storage.getEquipment(branchId);
      
      // Get service requests for each equipment with user info
      const allRequests = [];
      for (const equipment of allEquipment) {
        const requests = await storage.listServiceRequests(equipment.id, requestedStatus);
        
        for (const r of requests) {
          // Get creator and updater user names
          const createdByUser = await storage.getUserById(r.createdById);
          const updatedByUser = r.updatedById ? await storage.getUserById(r.updatedById) : null;
          
          allRequests.push({
            ...r,
            equipmentName: equipment.name,
            equipmentType: equipment.type,
            branchId: equipment.branchId,
            branchName: (await storage.getBranch(equipment.branchId))?.name,
            createdByUsername: createdByUser?.username,
            updatedByUsername: updatedByUser?.username,
          });
        }
      }
      
      // Sort by created date (newest first)
      allRequests.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(allRequests);
    } catch (error: any) {
      console.error("Error fetching service requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  // Photo upload endpoint for service requests
  app.post('/api/service-requests/:id/upload-photo', isAuthenticated, async (req, res) => {
    try {
      const { compressAndConvertImage } = await import('./photo-utils');
      const requestId = parseInt(req.params.id);
      const { photoData, photoNumber } = req.body;
      
      if (!photoData || !photoNumber || ![1, 2].includes(photoNumber)) {
        return res.status(400).json({ message: 'photoData ve photoNumber (1 veya 2) gerekli' });
      }

      const compressed = await compressAndConvertImage(photoData);
      const base64 = compressed.toString('base64');
      const photoUrl = `data:image/webp;base64,${base64}`;
      
      const photoField = photoNumber === 1 ? 'photo1Url' : 'photo2Url';
      const updatedRequest = await db
        .update(equipmentServiceRequests)
        .set({ [photoField]: photoUrl })
        .where(eq(equipmentServiceRequests.id, requestId))
        .returning();

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Servis talebi bulunamadı' });
      }

      res.json({ success: true, photoUrl, photoNumber });
    } catch (error: any) {
      console.error('Foto yükleme hatası:', error);
      res.status(500).json({ message: 'Foto yükleme başarısız' });
    }
  });

  // Create new service request endpoint (from form with machine templates)
  app.post('/api/service-requests/', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const { branchId, equipmentName, equipmentType, priority, serviceProvider, notes, status } = req.body;

      // Validation
      if (!branchId || !equipmentName || !equipmentType || !serviceProvider) {
        return res.status(400).json({ message: "Zorunlu alanlar eksik: branchId, equipmentName, equipmentType, serviceProvider" });
      }

      // Authorization: Branch users can only create requests for their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const userBranchId = assertBranchScope(user);
        if (branchId !== userBranchId) {
          return res.status(403).json({ message: "Bu şube için servis talebi oluşturma yetkiniz yok" });
        }
      }

      // Find or create placeholder equipment for this request
      const allEquipment = await storage.getEquipment(branchId);
      let equipment = allEquipment.find(e => e.name === equipmentName && e.type === equipmentType);
      
      if (!equipment) {
        // Create a new equipment entry as placeholder for this service request
        equipment = await storage.createEquipment({
          branchId,
          name: equipmentName,
          type: equipmentType,
          serialNumber: `SR-${Date.now()}`, // Temporary serial
          purchaseDate: new Date().toISOString(),
          warrantyExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'aktif',
          notes: 'Servis talebi formu üzerinden oluşturulan cihaz',
        });
      }

      // Create the service request
      const serviceRequest = await storage.createServiceRequest({
        equipmentId: equipment.id,
        status: status || 'talep_edildi',
        priority: priority || 'orta',
        serviceProvider,
        notes: notes || '',
        createdById: userId,
      });

      // Send critical notifications to HQ staff if priority is high/critical
      const finalPriority = priority || 'orta';
      if (finalPriority === 'yüksek' || finalPriority === 'kritik') {
        try {
          const hqUsers = await storage.getUsersByRole('hq_staff');
          const branch = await storage.getBranch(branchId);
          
          for (const hqUser of hqUsers) {
            await storage.createNotification({
              userId: hqUser.id,
              type: 'critical_service_request',
              title: finalPriority === 'kritik' ? '🚨 KRİTİK Servis Talebi!' : '⚠️ Yüksek Öncelikli Talep',
              message: `${branch?.name || 'Bilinmeyen Şube'} - ${equipmentType}: ${notes?.substring(0, 50) || 'Acil teknik destek gerekiyor'}`,
              relatedId: serviceRequest.id,
              read: false,
            });
          }
          console.log(`📢 Critical notification sent to HQ staff for service request ${serviceRequest.id}`);
        } catch (notificationError) {
          console.error('Failed to send critical notifications:', notificationError);
        }
      }

      res.json(serviceRequest);
    } catch (error: any) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Servis talebi oluşturulamadı" });
    }
  });

  app.get('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.post('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeBaseArticleSchema.parse(req.body);
      const article = await storage.createArticle(validatedData);
      
      if (article.isPublished) {
        try {
          await storage.deleteEmbeddingsByArticle(article.id);
          const embeddings = await generateArticleEmbeddings(article.id, article.title, article.content);
          await storage.createEmbeddings(embeddings.map(e => ({
            articleId: article.id,
            chunkText: e.chunkText,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding,
          })));
        } catch (embeddingError) {
          console.error("Error generating embeddings:", embeddingError);
        }
      }
      
      res.json(article);
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid article data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.post('/api/knowledge-base/:id/reindex', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);
      
      if (!article) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      await storage.deleteEmbeddingsByArticle(id);
      
      if (article.isPublished) {
        const embeddings = await generateArticleEmbeddings(id, article.title, article.content);
        await storage.createEmbeddings(embeddings.map(e => ({
          articleId: id,
          chunkText: e.chunkText,
          chunkIndex: e.chunkIndex,
          embedding: e.embedding,
        })));
      }

      res.json({ message: "Makale yeniden indekslendi", articleId: id });
    } catch (error) {
      console.error("Error reindexing article:", error);
      res.status(500).json({ message: "Makale yeniden indekslenemedi" });
    }
  });

  app.post('/api/knowledge-base/ask', isAuthenticated, async (req: any, res) => {
    try {
      const { question, equipmentId } = req.body;
      const userId = req.user.id;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Soru gereklidir" });
      }

      // Fetch equipment context if equipmentId provided (optional)
      let equipmentContext;
      if (equipmentId) {
        try {
          const equipment = await storage.getEquipment(equipmentId);
          if (equipment) {
            const branch = equipment.branchId ? await storage.getBranch(equipment.branchId) : null;
            const recentFaults = await storage.getFaults();
            const equipmentFaults = recentFaults
              .filter(f => f.equipmentId === equipmentId)
              .slice(0, 3)
              .map(f => ({
                description: f.description,
                date: new Date(f.createdAt).toLocaleDateString('tr-TR')
              }));

            equipmentContext = {
              type: equipment.equipmentType,
              serialNumber: equipment.serialNumber || undefined,
              branch: branch?.name,
              recentFaults: equipmentFaults.length > 0 ? equipmentFaults : undefined
            };
          }
        } catch (error) {
          console.warn("Failed to fetch equipment context:", error);
          // Continue without equipment context
        }
      }

      // Use enhanced technical assistant with fallback LLM
      const response = await answerTechnicalQuestion(question, equipmentContext, userId);
      res.json(response);
    } catch (error: any) {
      console.error("Error answering question:", error);
      res.status(500).json({ message: error.message || "Soru cevaplanamadı" });
    }
  });

  // AI Dashboard Summary (HQ + Branch Supervisors only)
  app.post('/api/ai-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { category } = req.body;

      // Validate category
      if (!category || !['personel', 'cihazlar', 'gorevler'].includes(category)) {
        return res.status(400).json({ message: "Geçersiz kategori. Geçerli değerler: personel, cihazlar, gorevler" });
      }

      // Authorization: Only HQ users and branch supervisors
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const isSupervisor = role === 'supervisor';

      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: "Bu özellik sadece HQ kullanıcıları ve şube supervisorları için kullanılabilir." });
      }

      // Call AI summary generation
      const summary = await generateAISummary(category, {
        id: user.id,
        role: user.role || 'unknown',
        branchId: user.branchId,
        username: user.username,
      });

      res.json(summary);
    } catch (error: any) {
      console.error("Error generating AI summary:", error);
      
      // Handle rate limit errors
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI özeti oluşturulamadı" });
    }
  });

  // AI Dashboard Insights (HQ + Supervisor only - operational oversight)
  app.post('/api/ai-dashboard-insights', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Authorization: Only HQ users and branch supervisors
      const isHQ = isHQRole(role);
      const isSupervisor = role === 'supervisor' || role === 'supervisor_buddy';

      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: "Bu özellik sadece HQ kullanıcıları ve şube supervisorları için kullanılabilir." });
      }

      // Import AI function
      const { generateDashboardInsights } = await import('./ai');
      
      const insights = await generateDashboardInsights(
        user.id,
        role,
        user.branchId
      );

      res.json(insights);
    } catch (error: any) {
      console.error("Error generating dashboard insights:", error);
      
      // Handle rate limit errors with localized message
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI içgörüleri oluşturulamadı" });
    }
  });

  app.get('/api/performance', isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId && req.query.branchId !== 'all' 
        ? parseInt(req.query.branchId as string) 
        : undefined;
      const metrics = await storage.getPerformanceMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.get('/api/performance/latest', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics();
      const latest = metrics.slice(0, 10);
      res.json(latest);
    } catch (error) {
      console.error("Error fetching latest performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch latest performance metrics" });
    }
  });

  // ========================================
  // EMPLOYEE/HR ROUTES
  // ========================================

  // Get employees list (with permissions and branch filtering)
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan listesine erişim yetkiniz yok" });
      }

      // Authorization: Supervisor must have a valid branchId
      if (role === 'supervisor' && !userBranchId) {
        return res.status(403).json({ message: "Şube ataması yapılmamış" });
      }

      // Branch filtering for supervisor/coach
      let branchFilter: number | undefined;
      if (role === 'supervisor') {
        // Supervisor can only see their own branch
        branchFilter = userBranchId!;
      } else if (role === 'coach' || role === 'admin') {
        // Coach/Admin can optionally filter by branchId query param
        branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      }

      const employees = await storage.getAllEmployees(branchFilter);
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUsersForRole(employees, role as UserRoleType));
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Çalışanlar yüklenirken hata oluştu" });
    }
  });

  // Get single employee (with permissions and branch filtering)
  app.get('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan bilgilerine erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUserForRole(employee, role as UserRoleType));
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Çalışan bilgileri yüklenirken hata oluştu" });
    }
  });

  // Update employee (with field-level restrictions)
  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'edit')) {
        return res.status(403).json({ message: "Çalışan düzenleme yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Validate base schema
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      // Field-level restrictions based on role
      let allowedFields: (keyof UpdateUser)[] = [];
      
      if (role === 'admin') {
        // Admin can update all fields
        allowedFields = Object.keys(parsed.data) as (keyof UpdateUser)[];
      } else if (role === 'coach') {
        // Coach can only update notes (training-related)
        allowedFields = ['notes'];
      } else if (role === 'supervisor') {
        // Supervisor can update contact info and notes
        allowedFields = ['phoneNumber', 'emergencyContactName', 'emergencyContactPhone', 'notes'];
      }

      // Filter updates to only allowed fields
      const filteredUpdates: Partial<UpdateUser> = {};
      for (const field of allowedFields) {
        if (parsed.data[field] !== undefined) {
          filteredUpdates[field] = parsed.data[field] as any;
        }
      }

      // Check if there are any valid updates
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ message: "Güncellenecek geçerli alan bulunamadı" });
      }

      // Update employee
      const updated = await storage.updateUser(employeeId, filteredUpdates);
      if (!updated) {
        return res.status(404).json({ message: "Çalışan güncellenemedi" });
      }
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUserForRole(updated, role as UserRoleType));
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Çalışan güncellenirken hata oluştu" });
    }
  });

  // Get employee warnings (with permissions and branch filtering)
  app.get('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Uyarı kayıtlarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      const warnings = await storage.getEmployeeWarnings(employeeId);
      res.json(warnings);
    } catch (error) {
      console.error("Error fetching employee warnings:", error);
      res.status(500).json({ message: "Uyarı kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee training progress (with permissions and branch filtering)
  app.get('/api/employees/:id/training', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'training', 'view')) {
        return res.status(403).json({ message: "Eğitim bilgilerine erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      const trainingProgress = await storage.getUserTrainingProgress(employeeId);
      res.json(trainingProgress);
    } catch (error) {
      console.error("Error fetching employee training:", error);
      res.status(500).json({ message: "Eğitim bilgileri yüklenirken hata oluştu" });
    }
  });

  // Get employee tasks (with permissions and branch filtering)
  app.get('/api/employees/:id/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'tasks', 'view')) {
        return res.status(403).json({ message: "Görev kayıtlarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Get tasks assigned to this employee (with branch scoping)
      const status = req.query.status as string | undefined;
      const tasks = await storage.getTasks(employee.branchId!, employeeId, status);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching employee tasks:", error);
      res.status(500).json({ message: "Görev kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee detail (orchestrated endpoint with all metrics)
  app.get('/api/employees/:id/detail', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan detaylarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization (prevents unauthorized data fetch)
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        // For supervisor, could be not found OR unauthorized - return generic 403
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        // For admin/coach, definitely not found
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Fetch all related data in parallel
      const [warnings, trainingProgress, allTasks] = await Promise.all([
        storage.getEmployeeWarnings(employeeId),
        storage.getUserTrainingProgress(employeeId),
        storage.getTasks(undefined, employeeId),
      ]);

      // Calculate KPIs from task data
      const now = new Date();
      const completedTasks = allTasks.filter(t => t.status === 'onaylandi');
      const overdueTasks = allTasks.filter(t => 
        t.status === 'beklemede' && t.dueDate && new Date(t.dueDate) < now
      );
      
      const tasksWithAiScore = completedTasks.filter(t => t.aiScore !== null && t.aiScore !== undefined);
      const averageAiScore = tasksWithAiScore.length > 0
        ? Math.round(tasksWithAiScore.reduce((sum, t) => sum + (t.aiScore || 0), 0) / tasksWithAiScore.length)
        : 0;
      
      const completionRate = allTasks.length > 0
        ? Math.round((completedTasks.length / allTasks.length) * 100)
        : 0;

      // Training progress summary
      const totalModules = trainingProgress.length;
      const completedModules = trainingProgress.filter(p => p.completedAt !== null).length;
      const trainingCompletionRate = totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

      // Sanitize employee data - HQ users get more details
      res.json({
        employee: sanitizeUserForRole(employee, role as UserRoleType),
        kpis: {
          tasksTotal: allTasks.length,
          tasksCompleted: completedTasks.length,
          tasksOverdue: overdueTasks.length,
          completionRate,
          averageAiScore,
          trainingModulesTotal: totalModules,
          trainingModulesCompleted: completedModules,
          trainingCompletionRate,
          warningsTotal: warnings.length,
          activeWarnings: warnings.filter(w => 
            w.warningType === 'written' || w.warningType === 'final'
          ).length,
        },
        warnings,
        trainingProgress,
        recentTasks: allTasks.slice(0, 10), // Last 10 tasks
      });
    } catch (error) {
      console.error("Error fetching employee detail:", error);
      res.status(500).json({ message: "Çalışan detayları yüklenirken hata oluştu" });
    }
  });

  // Create new employee (admin/coach/supervisor with branch scoping)
  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'create')) {
        return res.status(403).json({ message: "Çalışan ekleme yetkiniz yok" });
      }

      // Validate employee data
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz çalışan verisi", errors: parsed.error.errors });
      }

      // Authorization: Branch users can only create employees for their own branch
      // FORCE branchId to user's branch for ALL branch roles (ignore payload)
      let employeeData = parsed.data;
      if (role && isBranchRole(role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Override branchId to user's branch (prevent creating employee in other branches)
        employeeData = { ...parsed.data, branchId };
      }

      // Create employee (storage layer handles password hashing if provided)
      const newEmployee = await storage.createUser(employeeData);
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.status(201).json(sanitizeUserForRole(newEmployee, role as UserRoleType));
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Çalışan eklenirken hata oluştu" });
    }
  });

  // Delete employee (admin/coach only - no branch restriction for coach)
  app.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role } = user;
      const employeeId = req.params.id;

      // Permission check (admin/coach only)
      if (!hasPermission(role as UserRoleType, 'employees', 'delete')) {
        return res.status(403).json({ message: "Çalışan silme yetkiniz yok" });
      }

      // Check if employee exists
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Coach can delete employees from any branch (no branch restriction)
      // Admin can delete anyone

      // Delete employee (cascades to warnings via foreign key)
      await storage.deleteUser(employeeId);
      res.json({ message: "Çalışan silindi", deletedId: employeeId });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Çalışan silinirken hata oluştu" });
    }
  });

  // Reset employee password (admin/coach only)
  app.post('/api/employees/:id/reset-password', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role } = user;
      const employeeId = req.params.id;

      // Permission check (admin/coach only can reset passwords)
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: "Şifre sıfırlama yetkiniz yok" });
      }

      // Check if employee exists
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Validate new password - enforce strong password policy
      const resetPasswordSchema = z.object({
        newPassword: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[A-Za-z]/, "Şifre en az bir harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir"),
      });

      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Geçersiz şifre", 
          errors: parsed.error.errors 
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

      // Update employee password
      await storage.updateUser(employeeId, { hashedPassword });

      // Audit log: Record password reset event
      await storage.createAuditLog({
        userId: user.id, // Who performed the action
        action: 'password_reset',
        resource: 'users',
        resourceId: employeeId, // Target user
        details: {
          performedByRole: role,
          targetUserId: employeeId,
          timestamp: new Date().toISOString(),
        },
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ message: "Şifre başarıyla sıfırlandı" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Şifre sıfırlanırken hata oluştu" });
    }
  });

  // Create employee warning (with permissions and branch filtering)
  app.post('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId, id: issuerId } = user;
      const employeeId = req.params.id;

      // Permission check (approve = can issue warnings)
      if (!hasPermission(role as UserRoleType, 'employees', 'approve')) {
        return res.status(403).json({ message: "Uyarı verme yetkiniz yok" });
      }

      // Get employee
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Authorization: Branch users can only issue warnings to employees in their own branch
      if (role && isBranchRole(role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (employee.branchId !== branchId) {
          return res.status(403).json({ message: "Bu çalışana uyarı verme yetkiniz yok" });
        }
      }

      // Validate warning data
      const parsed = insertEmployeeWarningSchema.safeParse({
        ...req.body,
        userId: employeeId,
        issuedBy: issuerId, // Force issuer to authenticated user
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz uyarı verisi", errors: parsed.error.errors });
      }

      const warning = await storage.createEmployeeWarning(parsed.data);
      res.status(201).json(warning);
    } catch (error) {
      console.error("Error creating employee warning:", error);
      res.status(500).json({ message: "Uyarı kaydedilirken hata oluştu" });
    }
  });

  // ========================================
  // TRAINING SYSTEM ROUTES
  // ========================================

  // Get training progress summary for all users (for İK filters and dashboards)
  app.get('/api/training/progress/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role;

      // Permission check: employees view permission required
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Eğitim durumu görüntüleme yetkiniz yok" });
      }

      const summary = await storage.getAllTrainingProgressSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching training progress summary:", error);
      res.status(500).json({ message: "Eğitim durumu getirilemedi" });
    }
  });

  // Get training modules (published only for users, all for admin/coach)
  app.get('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      
      const modules = await storage.getTrainingModules(isAdminOrCoach ? undefined : true);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Failed to fetch training modules" });
    }
  });

  // Get single training module with all content
  app.get('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      const module = await storage.getTrainingModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Authorization: Only admin/coach can see unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module" });
      }

      const [videos, lessons, quizzes, flashcards] = await Promise.all([
        storage.getModuleVideos(moduleId),
        storage.getModuleLessons(moduleId),
        storage.getModuleQuizzes(moduleId),
        storage.getFlashcards(moduleId),
      ]);

      res.json({ ...module, videos, lessons, quizzes, flashcards });
    } catch (error) {
      console.error("Error fetching training module:", error);
      res.status(500).json({ message: "Failed to fetch training module" });
    }
  });

  // Create training module (admin/coach only)
  app.post('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can create modules" });
      }

      const validated = insertTrainingModuleSchema.parse(req.body);
      const module = await storage.createTrainingModule({
        ...validated,
        createdBy: user.id,
      });
      
      res.status(201).json(module);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating training module:", error);
      res.status(500).json({ message: "Failed to create training module" });
    }
  });

  // Update training module (admin/coach only)
  app.put('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can update modules" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertTrainingModuleSchema.partial().parse(req.body);
      const updated = await storage.updateTrainingModule(moduleId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating training module:", error);
      res.status(500).json({ message: "Failed to update training module" });
    }
  });

  // Delete training module (admin/coach only)
  app.delete('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can delete modules" });
      }

      const moduleId = parseInt(req.params.id);
      await storage.deleteTrainingModule(moduleId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ message: "Failed to delete training module" });
    }
  });

  // Add video to module (admin/coach only)
  app.post('/api/training/modules/:id/videos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can add videos" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleVideoSchema.parse(req.body);
      const video = await storage.createModuleVideo({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(video);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module video:", error);
      res.status(500).json({ message: "Failed to create module video" });
    }
  });

  // Get lessons for module
  app.get('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      
      // Check module exists and authorization (same as module detail endpoint)
      const module = await storage.getTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Authorization: Only admin/coach can see lessons from unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module lessons" });
      }

      const lessons = await storage.getModuleLessons(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching module lessons:", error);
      res.status(500).json({ message: "Ders listesi getirilemedi" });
    }
  });

  // Add lesson to module (admin/coach only)
  app.post('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders ekleyebilir" });
      }

      const moduleId = parseInt(req.params.id);
      // Validate without moduleId (injected from path param)
      const validated = insertModuleLessonSchema.omit({ moduleId: true }).parse(req.body);
      const lesson = await storage.createModuleLesson({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(lesson);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module lesson:", error);
      res.status(500).json({ message: "Ders oluşturulamadı" });
    }
  });

  // Update lesson (admin/coach only)
  app.put('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders düzenleyebilir" });
      }

      const lessonId = parseInt(req.params.id);
      const validated = insertModuleLessonSchema.partial().parse(req.body);
      const updated = await storage.updateModuleLesson(lessonId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating module lesson:", error);
      res.status(500).json({ message: "Ders güncellenemedi" });
    }
  });

  // Delete lesson (admin/coach only)
  app.delete('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders silebilir" });
      }

      const lessonId = parseInt(req.params.id);
      await storage.deleteModuleLesson(lessonId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting module lesson:", error);
      res.status(500).json({ message: "Ders silinemedi" });
    }
  });

  // Generate AI materials (quiz questions + flashcards) from lesson content (admin/coach only)
  app.post('/api/training/lessons/:id/generate-materials', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler AI materyal oluşturabilir" });
      }

      const lessonId = parseInt(req.params.id);
      const { quizCount = 5, flashcardCount = 10 } = req.body;

      // Get lesson content
      const lesson = await storage.getModuleLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }

      if (!lesson.content) {
        return res.status(400).json({ message: "Ders içeriği boş, AI materyal oluşturulamıyor" });
      }

      // Generate AI materials in parallel
      const [quizQuestions, flashcards] = await Promise.all([
        generateQuizQuestionsFromLesson(lesson.content, quizCount, lessonId),
        generateFlashcardsFromLesson(lesson.content, flashcardCount, lessonId),
      ]);

      // Create quiz in database with questions
      const quiz = await storage.createModuleQuiz({
        moduleId: lesson.moduleId,
        title: `${lesson.title} - Quiz`,
        description: `AI-generated quiz for ${lesson.title}`,
        passingScore: 70,
        timeLimit: 15,
      });

      // Save each quiz question
      for (const q of quizQuestions) {
        await storage.createQuizQuestion({
          quizId: quiz.id,
          question: q.question || q.questionText || '',
          questionType: q.questionType || 'multiple_choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation,
          points: q.points || 10,
        });
      }

      // Save each flashcard
      for (const card of flashcards) {
        await storage.createFlashcard({
          moduleId: lesson.moduleId,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty || 'medium',
        });
      }

      res.json({
        quizId: quiz.id,
        questionCount: quizQuestions.length,
        flashcardCount: flashcards.length,
        message: `${quizQuestions.length} quiz sorusu ve ${flashcards.length} flashcard oluşturuldu`,
      });
    } catch (error) {
      console.error("Error generating AI materials:", error);
      res.status(500).json({ message: "AI materyal oluşturulamadı" });
    }
  });

  // Add quiz to module (admin/coach only)
  app.post('/api/training/modules/:id/quizzes', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can add quizzes" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleQuizSchema.parse(req.body);
      const quiz = await storage.createModuleQuiz({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(quiz);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module quiz:", error);
      res.status(500).json({ message: "Failed to create module quiz" });
    }
  });

  // Get user's training progress
  app.get('/api/training/progress', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserTrainingProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ message: "Failed to fetch training progress" });
    }
  });

  // Update user's training progress
  app.put('/api/training/progress/:moduleId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const moduleId = parseInt(req.params.moduleId);
      
      const validated = insertUserTrainingProgressSchema.partial().parse(req.body);
      const updated = await storage.updateUserProgress(userId, moduleId, validated);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating training progress:", error);
      res.status(500).json({ message: "Failed to update training progress" });
    }
  });

  // Submit quiz attempt
  app.post('/api/training/quiz-attempts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertUserQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt({
        ...validated,
        userId,
      });
      
      res.status(201).json(attempt);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating quiz attempt:", error);
      res.status(500).json({ message: "Failed to create quiz attempt" });
    }
  });

  // Approve/reject quiz attempt (supervisor/coach only)
  app.put('/api/training/quiz-attempts/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'supervisor' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only supervisors and coaches can approve quizzes" });
      }

      const attemptId = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const updated = await storage.approveQuizAttempt(attemptId, user.id, status, feedback);
      
      if (!updated) {
        return res.status(404).json({ message: "Quiz attempt not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error approving quiz attempt:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to approve quiz attempt" });
    }
  });

  // Get presigned upload URL for object storage
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ method: "PUT", url: uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve private objects with ACL check (for uploaded files)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const userId = req.user?.claims?.sub || req.user?.id;
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error accessing object:", error);
      if (error.name === 'ObjectNotFoundError') {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ========================================
  // ADMIN: Seed Equipment & Training (admin-only, idempotent)
  // ========================================
  app.post('/api/admin/seed-equipment-training', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin can seed data
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Sadece admin veri ekleyebilir" });
      }

      console.log("🌱 Ekipman, eğitim modülleri ve personel ekleniyor...");

      const { seedEquipmentForBranches, seedTrainingModules, seedBranchPersonnel } = await import('./seed-utils');
      
      // Import bcrypt for password hashing
      const { default: bcrypt } = await import('bcrypt');
      const hashedPassword = await bcrypt.hash("0000", 10);
      
      // Seed equipment for all existing branches
      const equipmentResult = await seedEquipmentForBranches();
      console.log(`✅ Ekipman: ${equipmentResult.created} eklendi, ${equipmentResult.skipped} atlandı`);
      
      // Seed baseline training modules
      const trainingResult = await seedTrainingModules(user.id);
      console.log(`✅ Eğitim: ${trainingResult.created} eklendi, ${trainingResult.skipped} atlandı`);
      
      // Seed branch personnel
      const personnelResult = await seedBranchPersonnel(hashedPassword);
      console.log(`✅ Personel: ${personnelResult.created} eklendi, ${personnelResult.skipped} atlandı`);

      res.json({
        success: true,
        message: "Ekipman, eğitim ve personel başarıyla eklendi",
        data: {
          equipment: equipmentResult,
          training: trainingResult,
          personnel: personnelResult,
        }
      });

      console.log("✅ Ekipman ve eğitim ekleme tamamlandı!");
    } catch (error) {
      console.error("❌ Ekleme başarısız:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ekleme başarısız" });
    }
  });

  // ========================================
  // ADMIN: Seed Demo Data (admin-only)
  // ========================================
  app.post('/api/admin/seed-demo', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin can seed demo data
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can seed demo data" });
      }

      console.log("🌱 Starting demo data seed...");

      // Import bcrypt dynamically (CommonJS module requires .default)
      const { default: bcrypt } = await import('bcrypt');
      const hashedPassword = await bcrypt.hash("0000", 10);

      // Create 18 real DOSPRESSO branches
      const branchData = [
        // ANTALYA (5 branches)
        { name: "Antalya Işıklar", address: "Işıklar Caddesi, 07100 Muratpaşa", city: "Antalya", phoneNumber: "0242 xxx 10 01", managerName: "Ahmet Yılmaz" },
        { name: "Antalya Mallof", address: "Mall of Antalya AVM, Lara", city: "Antalya", phoneNumber: "0242 xxx 10 02", managerName: "Elif Kaya" },
        { name: "Antalya Markantalya", address: "MarkAntalya AVM, Kepez", city: "Antalya", phoneNumber: "0242 xxx 10 03", managerName: "Mehmet Demir" },
        { name: "Antalya Lara", address: "Lara Bulvarı, Muratpaşa", city: "Antalya", phoneNumber: "0242 xxx 10 04", managerName: "Zeynep Şahin" },
        { name: "Antalya Beachpark", address: "Beach Park AVM, Konyaaltı", city: "Antalya", phoneNumber: "0242 xxx 10 05", managerName: "Can Arslan" },
        // GAZIANTEP (3 branches)
        { name: "Gaziantep İbrahimli", address: "İbrahimli Mahallesi, Şehitkamil", city: "Gaziantep", phoneNumber: "0342 xxx 20 01", managerName: "Fatma Yıldız" },
        { name: "Gaziantep İbnisina", address: "İbnisina Hastanesi Yanı, Şahinbey", city: "Gaziantep", phoneNumber: "0342 xxx 20 02", managerName: "Burak Öztürk" },
        { name: "Gaziantep Üniversite", address: "Üniversite Caddesi, Şehitkamil", city: "Gaziantep", phoneNumber: "0342 xxx 20 03", managerName: "Selin Aydın" },
        // KONYA (2 branches)
        { name: "Konya Meram", address: "Meram Yeni Yol Caddesi", city: "Konya", phoneNumber: "0332 xxx 30 01", managerName: "Emre Çelik" },
        { name: "Konya Bosna", address: "Bosna Hersek Mahallesi, Selçuklu", city: "Konya", phoneNumber: "0332 xxx 30 02", managerName: "Ayşe Kurt" },
        // SAMSUN (2 branches)
        { name: "Samsun Marina", address: "Piazza AVM, İlkadım", city: "Samsun", phoneNumber: "0362 xxx 40 01", managerName: "Deniz Koç" },
        { name: "Samsun Atakum", address: "Atakum Bulvarı, Atakum", city: "Samsun", phoneNumber: "0362 xxx 40 02", managerName: "Ali Erdoğan" },
        // OTHER
        { name: "Batman", address: "Cumhuriyet Caddesi, Merkez", city: "Batman", phoneNumber: "0488 xxx 50 01", managerName: "Mustafa Yaman" },
        { name: "Düzce", address: "Kadir Has Caddesi, Merkez", city: "Düzce", phoneNumber: "0380 xxx 60 01", managerName: "Sevgi Polat" },
        { name: "Siirt", address: "Atatürk Caddesi, Merkez", city: "Siirt", phoneNumber: "0484 xxx 70 01", managerName: "Hakan Acar" },
        { name: "Kilis", address: "Meydan Caddesi, Merkez", city: "Kilis", phoneNumber: "0348 xxx 80 01", managerName: "Gül Yavuz" },
        { name: "Şanlıurfa", address: "Balıklıgöl Yanı, Haliliye", city: "Şanlıurfa", phoneNumber: "0414 xxx 90 01", managerName: "Murat Kaplan" },
        { name: "Nizip", address: "Cumhuriyet Meydanı, Nizip", city: "Gaziantep", phoneNumber: "0342 xxx 91 01", managerName: "Esra Taş" },
      ];

      const branches = await Promise.all(
        branchData.map((b: any) => storage.createBranch({
          ...b,
          openingHours: '08:00',
          closingHours: '22:00',
        }))
      );

      // Create HQ users
      const hqUserData = [
        { username: "muhasebe", email: "muhasebe@dospresso.com", firstName: "Zeynep", lastName: "Çelik", role: "muhasebe" },
        { username: "satinalma", email: "satinalma@dospresso.com", firstName: "Can", lastName: "Arslan", role: "satinalma" },
        { username: "coach", email: "coach@dospresso.com", firstName: "Elif", lastName: "Yıldız", role: "coach" },
        { username: "teknik", email: "teknik@dospresso.com", firstName: "Burak", lastName: "Şahin", role: "teknik" },
        { username: "destek", email: "destek@dospresso.com", firstName: "Selin", lastName: "Öztürk", role: "destek" },
        { username: "fabrika", email: "fabrika@dospresso.com", firstName: "Emre", lastName: "Aydın", role: "fabrika" },
        { username: "yatirimci-hq", email: "yatirimci@dospresso.com", firstName: "Deniz", lastName: "Koç", role: "yatirimci_hq" },
      ];

      const hqUsers = await Promise.all(
        hqUserData.map(u => storage.createUser({ ...u, hashedPassword, branchId: null }))
      );

      // Create branch users (1 supervisor, 2-3 baristas, 1-2 stajyer per branch)
      const supervisorNames = ["Ahmet", "Mehmet", "Ali", "Mustafa", "Hasan", "Ayşe", "Fatma", "Elif", "Zeynep", "Selin", "Can", "Emre", "Burak", "Murat", "Deniz", "Esra", "Gül", "Sevgi", "Hakan"];
      const baristaNames = ["Furkan", "Cem", "Ömer", "Yusuf", "İbrahim", "Merve", "Simge", "Dilara", "Beyza", "Ecrin", "Berkay", "Kaan", "Enes", "Oğuz", "Serkan", "Gizem", "Damla", "Ebru", "Tuba", "İrem", "Bora", "Barış", "Taner", "Koray"];
      const stajyerNames = ["Kerem", "Arda", "Doruk", "Emir", "Berat", "Defne", "Ela", "Mira", "Zehra", "Nehir", "Kuzey", "Atlas", "Çınar", "Alp", "Ege", "Azra", "Lara", "Derin", "Aslı", "Pelin"];
      const lastNames = ["Yılmaz", "Demir", "Şahin", "Kaya", "Arslan", "Yıldız", "Öztürk", "Aydın", "Çelik", "Kurt", "Koç", "Erdoğan", "Yaman", "Polat", "Acar", "Yavuz", "Kaplan", "Taş"];

      const branchUserPromises: Promise<any>[] = [];
      branches.forEach((branch, branchIndex) => {
        const branchPrefix = branch.name.toLowerCase().replace(/\s+/g, '-');
        
        // 1 Supervisor
        branchUserPromises.push(
          storage.createUser({
            username: `${branchPrefix}-supervisor`,
            hashedPassword,
            email: `${branchPrefix}.supervisor@dospresso.com`,
            firstName: supervisorNames[branchIndex % supervisorNames.length],
            lastName: lastNames[branchIndex % lastNames.length],
            role: "supervisor",
            branchId: branch.id,
            hireDate: new Date(2024, 0, 1 + branchIndex).toISOString().split('T')[0],
            probationEndDate: null,
          })
        );

        // 2-3 Baristas (alternating between 2 and 3)
        const baristaCount = branchIndex % 2 === 0 ? 3 : 2;
        for (let i = 0; i < baristaCount; i++) {
          branchUserPromises.push(
            storage.createUser({
              username: `${branchPrefix}-barista${i + 1}`,
              hashedPassword,
              email: `${branchPrefix}.barista${i + 1}@dospresso.com`,
              firstName: baristaNames[(branchIndex + i) % baristaNames.length],
              lastName: lastNames[branchIndex % lastNames.length],
              role: "barista",
              branchId: branch.id,
              hireDate: new Date(2024, 2, 1 + branchIndex + i * 5).toISOString().split('T')[0],
              probationEndDate: null,
            })
          );
        }

        // 1-2 Stajyer (alternating between 1 and 2)
        const stajyerCount = branchIndex % 3 === 0 ? 2 : 1;
        for (let i = 0; i < stajyerCount; i++) {
          branchUserPromises.push(
            storage.createUser({
              username: `${branchPrefix}-stajyer${i + 1}`,
              hashedPassword,
              email: `${branchPrefix}.stajyer${i + 1}@dospresso.com`,
              firstName: stajyerNames[(branchIndex + i) % stajyerNames.length],
              lastName: lastNames[branchIndex % lastNames.length],
              role: "stajyer",
              branchId: branch.id,
              hireDate: new Date(2024, 10, 1 + branchIndex + i * 3).toISOString().split('T')[0],
              probationEndDate: new Date(2025, 4, 1).toISOString().split('T')[0], // May 2025
            })
          );
        }
      });

      const branchUsers = await Promise.all(branchUserPromises);

      // Create checklists
      const checklists = await Promise.all([
        storage.createChecklist({
          title: "Açılış Prosedürü",
          description: "Sabah açılış rutini",
          frequency: "daily",
          category: "opening",
        }),
        storage.createChecklist({
          title: "Kapanış Prosedürü",
          description: "Gün sonu kapanış rutini",
          frequency: "daily",
          category: "closing",
        }),
        storage.createChecklist({
          title: "Haftalık Temizlik",
          description: "Ekipman derin temizliği",
          frequency: "weekly",
          category: "cleaning",
        }),
      ]);

      // Create knowledge base articles
      await storage.createArticle({
        title: "Espresso Makine Kalibrasyonu",
        category: "maintenance",
        content: "# Espresso Makine Kalibrasyonu\n\nDetaylı kalibrasyon rehberi...",
        tags: ["espresso", "kalibrasyon", "bakım"],
        isPublished: true,
      });

      await storage.createArticle({
        title: "Cappuccino Tarifi",
        category: "recipe",
        content: "# Cappuccino Tarifi\n\nDOSPRESSO standardı cappuccino hazırlama...",
        tags: ["cappuccino", "tarif"],
        isPublished: true,
      });

      // Create equipment for each branch (8 types × 3 branches = 24 equipment)
      const { EQUIPMENT_TYPES, EQUIPMENT_METADATA } = await import('@shared/schema');
      const equipmentTypes = Object.values(EQUIPMENT_TYPES);
      const equipmentPromises: Promise<any>[] = [];

      // Purchase date: 1 year ago
      const purchaseDateMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const purchaseDate = new Date(purchaseDateMs).toISOString().split('T')[0];
      // Warranty: 2 years from purchase
      const warrantyEndDate = new Date(purchaseDateMs + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      branches.forEach((branch, branchIndex) => {
        equipmentTypes.forEach((type, typeIndex) => {
          const metadata = EQUIPMENT_METADATA[type];
          
          // Calculate next maintenance date based on purchase date + interval
          const nextMaintenanceDate = new Date(purchaseDateMs + metadata.maintenanceInterval * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          equipmentPromises.push(
            storage.createEquipment({
              branchId: branch.id,
              equipmentType: type,
              serialNumber: `${type.toUpperCase()}-${branchIndex + 1}-${typeIndex + 1}-${Date.now()}`,
              purchaseDate,
              warrantyEndDate,
              maintenanceResponsible: metadata.maintenanceResponsible,
              faultProtocol: metadata.faultProtocol,
              maintenanceIntervalDays: metadata.maintenanceInterval,
              nextMaintenanceDate,
              notes: `${metadata.nameTr} - ${branch.name}`,
              isActive: true,
            })
          );
        });
      });

      const equipmentItems = await Promise.all(equipmentPromises);

      res.json({
        success: true,
        message: "Demo data seeded successfully",
        data: {
          branches: branches.length,
          hqUsers: hqUsers.length,
          branchUsers: branchUsers.length,
          checklists: checklists.length,
          equipment: equipmentItems.length,
        }
      });

      console.log("✅ Demo data seed completed!");
    } catch (error) {
      console.error("❌ Seed failed:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Seed failed" });
    }
  });

  // Message Routes
  // Get user's inbox messages
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: userId, role, branchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'messages', 'view')) {
        return res.status(403).json({ message: "Mesajlara erişim yetkiniz yok" });
      }

      const inbox = await storage.getMessages(userId, role, branchId);
      res.json(inbox);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Mesajlar yüklenirken hata oluştu" });
    }
  });

  // Get unread message count
  app.get('/api/messages/unread-count', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: userId, role } = user;

      const count = await storage.getUnreadCount(userId, role);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Okunmamış mesaj sayısı alınamadı" });
    }
  });

  // Send a message
  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: senderId, role, branchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'messages', 'create')) {
        return res.status(403).json({ message: "Mesaj gönderme yetkiniz yok" });
      }

      const { recipientId, recipientRole, subject, body, type } = req.body;

      // Validation
      if (!subject || !body || !type) {
        return res.status(400).json({ message: "Konu, içerik ve tip gerekli" });
      }

      if (!recipientId && !recipientRole) {
        return res.status(400).json({ message: "Alıcı ID veya rol belirtilmeli" });
      }

      // Enforce XOR: exactly one of recipientId or recipientRole must be set
      if (recipientId && recipientRole) {
        return res.status(400).json({ message: "recipientId ve recipientRole birlikte kullanılamaz" });
      }

      // Authorization check for Supervisor
      if (role === 'supervisor') {
        // Supervisor can only message their own branch staff + HQ roles
        if (recipientId) {
          const recipient = await storage.getUserById(recipientId);
          if (!recipient) {
            return res.status(404).json({ message: "Alıcı bulunamadı" });
          }

          // Check if recipient is in same branch OR is HQ role
          const isHQRole = !recipient.branchId;
          const isSameBranch = recipient.branchId === branchId;

          if (!isHQRole && !isSameBranch) {
            return res.status(403).json({ message: "Bu kullanıcıya mesaj gönderme yetkiniz yok" });
          }
        }

        if (recipientRole) {
          // Supervisor can only broadcast to HQ roles
          const hqRoles = ['admin', 'coach', 'muhasebe', 'satinalma', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
          if (!hqRoles.includes(recipientRole)) {
            return res.status(403).json({ message: "Bu role mesaj gönderme yetkiniz yok" });
          }
        }
      }

      const newMessage = await storage.createMessage({
        senderId,
        recipientId: recipientId || null,
        recipientRole: recipientRole || null,
        subject,
        body,
        type,
        isRead: false,
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Mesaj gönderilirken hata oluştu" });
    }
  });

  // Mark message as read
  app.patch('/api/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const messageId = parseInt(req.params.id);

      // Verify message exists and user is recipient
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Mesaj bulunamadı" });
      }

      if (message.recipientId !== user.id) {
        return res.status(403).json({ message: "Bu mesajı okuma yetkiniz yok" });
      }

      await storage.markMessageAsRead(messageId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Mesaj güncellenirken hata oluştu" });
    }
  });

  // ========================================
  // HQ SUPPORT TICKET ROUTES
  // ========================================

  // Get HQ support tickets (list with filtering)
  app.get('/api/hq-support/tickets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const status = req.query.status as string | undefined;

      // Authorization: Branch users can only see their own branch tickets
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const tickets = await storage.getHQSupportTickets(user.branchId, status);
        return res.json(tickets);
      }

      // HQ users can access all or filter by branch
      const tickets = await storage.getHQSupportTickets(requestedBranchId, status);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching HQ support tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get single HQ support ticket with messages
  app.get('/api/hq-support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const ticket = await storage.getHQSupportTicket(id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Authorization: Branch users can only access their own branch tickets
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || ticket.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu destek talebine erişim yetkiniz yok" });
        }
      }

      // Fetch ticket messages
      const messages = await storage.getHQSupportMessages(id);
      res.json({ ...ticket, messages });
    } catch (error) {
      console.error("Error fetching HQ support ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Create HQ support ticket
  app.post('/api/hq-support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const { insertHQSupportTicketSchema } = await import('@shared/schema');
      const validatedData = insertHQSupportTicketSchema.parse(req.body);

      // Authorization: Branch users can only create tickets for their own branch
      let ticketBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        ticketBranchId = branchId; // Override payload branchId
      }

      const ticket = await storage.createHQSupportTicket({
        ...validatedData,
        branchId: ticketBranchId,
        createdById: userId,
      });
      res.status(201).json(ticket);
    } catch (error: any) {
      console.error("Error creating HQ support ticket:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Update HQ support ticket status
  app.patch('/api/hq-support/tickets/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Get existing ticket for authorization
      const existingTicket = await storage.getHQSupportTicket(id);
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Authorization: Branch users can only update their own branch tickets
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTicket.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu destek talebini güncelleme yetkiniz yok" });
        }
      }

      const closedBy = status === 'closed' ? userId : undefined;
      const ticket = await storage.updateHQSupportTicketStatus(id, status, closedBy);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating HQ support ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // Send message to HQ support ticket
  app.post('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const ticketId = parseInt(req.params.id);
      const { insertHQSupportMessageSchema } = await import('@shared/schema');

      // Get existing ticket for authorization
      const existingTicket = await storage.getHQSupportTicket(ticketId);
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Authorization: Branch users can only message on their own branch tickets
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTicket.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu destek talebine mesaj gönderme yetkiniz yok" });
        }
      }

      const validatedData = insertHQSupportMessageSchema.parse(req.body);
      const message = await storage.createHQSupportMessage({
        ...validatedData,
        ticketId,
        senderId: userId,
      });
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating HQ support message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // =========================================
  // NOTIFICATIONS API
  // =========================================

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      
      const notifications = await storage.getNotifications(userId, isRead);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Create notification (HQ only)
  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ users can create notifications
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bildirim oluşturma yetkiniz yok" });
      }

      const { insertNotificationSchema } = await import('@shared/schema');
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Bildirim bulunamadı veya size ait değil" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // =========================================
  // MESSAGES API (Thread-based messaging system)
  // =========================================

  // Get thread list with filters (inbox/sent/unread)
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const folder = (req.query.folder as 'inbox'|'sent'|'unread') || 'inbox';
      
      if (!['inbox', 'sent', 'unread'].includes(folder)) {
        return res.status(400).json({ message: "Invalid folder type" });
      }
      
      const threads = await storage.listInboxThreads(userId, folder);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching message threads:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get unread message count
  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Get single thread with all messages
  app.get('/api/messages/:threadId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const threadId = req.params.threadId;
      
      const thread = await storage.getThread(threadId, userId);
      
      // getThread already verifies participant access in storage layer
      // If we reach here, user is authorized to view thread
      res.json(thread);
    } catch (error: any) {
      // Storage layer throws error if user is not participant
      if (error?.message?.includes("not a participant")) {
        return res.status(403).json({ message: "Bu konuşmaya erişim yetkiniz yok" });
      }
      console.error("Error fetching thread:", error);
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  // Create new thread/message
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'messages', 'create');
      
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Generate threadId if not provided
      const threadId = validatedData.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message
      const message = await storage.createMessage({
        ...validatedData,
        threadId,
        senderId: user.id,
      });
      
      // Get or create thread participants
      const { threadParticipants } = await import('@shared/schema');
      const participants = [user.id];
      if (validatedData.recipientId) {
        participants.push(validatedData.recipientId);
      }
      
      // Insert participants (ignore conflicts if already exist)
      for (const userId of participants) {
        await db.insert(threadParticipants).values({
          threadId,
          userId,
          lastReadAt: userId === user.id ? new Date() : null,
        }).onConflictDoNothing();
      }
      
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Reply to thread
  app.post('/api/messages/:threadId/replies', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const threadId = req.params.threadId;
      
      ensurePermission(user, 'messages', 'create');
      
      // Verify user is participant in thread
      const thread = await storage.getThread(threadId, user.id);
      const isParticipant = thread.participants.some(p => p.userId === user.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "Bu konuşmaya erişim yetkiniz yok" });
      }
      
      // Get first message to use same subject
      const firstMessage = thread.messages[0];
      
      const { body, attachments, parentMessageId } = req.body;
      
      if (!body || typeof body !== 'string') {
        return res.status(400).json({ message: "Mesaj metni gerekli" });
      }
      
      const message = await storage.createMessage({
        threadId,
        senderId: user.id,
        subject: firstMessage.subject,
        body,
        type: firstMessage.type,
        attachments: attachments || [],
        parentMessageId: parentMessageId || null,
        recipientId: null,
        recipientRole: null,
        isRead: false,
      });
      
      // Update sender's lastReadAt
      await storage.markThreadRead(user.id, threadId);
      
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error replying to thread:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  // Mark thread as read
  app.post('/api/messages/:threadId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const threadId = req.params.threadId;
      
      // Verify user is participant
      const thread = await storage.getThread(threadId, userId);
      const isParticipant = thread.participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Bu konuşmaya erişim yetkiniz yok" });
      }
      
      await storage.markThreadRead(userId, threadId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking thread as read:", error);
      res.status(500).json({ message: "Failed to mark thread as read" });
    }
  });

  // Upload message attachment (requires Object Storage)
  app.post('/api/messages/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'messages', 'create');
      
      // This endpoint expects the file to already be uploaded via ObjectUploader
      // and just returns the metadata for inclusion in message attachments array
      const { url, name, type, size } = req.body;
      
      if (!url || !name) {
        return res.status(400).json({ message: "URL and name are required" });
      }
      
      const attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url,
        name,
        type: type || 'application/octet-stream',
        size: size || 0,
      };
      
      res.json(attachment);
    } catch (error: any) {
      console.error("Error processing attachment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to process attachment" });
    }
  });

  // =========================================
  // ANNOUNCEMENTS API
  // =========================================

  // Get announcements for user
  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = user.id;
      const branchId = user.branchId;
      const role = user.role;

      const announcements = await storage.getAnnouncements(userId, branchId, role);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Get single announcement
  app.get('/api/announcements/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const announcement = await storage.getAnnouncementById(id);
      if (!announcement) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Failed to fetch announcement" });
    }
  });

  // Create announcement (HQ only)
  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;

      ensurePermission(user, 'announcements', 'create');

      const { insertAnnouncementSchema } = await import('@shared/schema');
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement({
        ...validatedData,
        createdById: userId,
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid announcement data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Delete announcement (HQ only)
  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'announcements', 'delete');
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Duyuru silme yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteAnnouncement(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Add attachments to announcement (HQ destek + supervisors)
  app.post('/api/announcements/:id/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Only HQ destek or supervisors can add attachments
      if (role !== 'destek' && role !== 'supervisor') {
        return res.status(403).json({ message: "Duyuru ekleri yükleme yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const { attachments } = req.body;

      if (!Array.isArray(attachments) || attachments.length === 0) {
        return res.status(400).json({ message: "Geçersiz ek listesi" });
      }

      const announcement = await storage.addAnnouncementAttachments(id, attachments);
      if (!announcement) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }

      res.json(announcement);
    } catch (error) {
      console.error("Error adding announcement attachments:", error);
      res.status(500).json({ message: "Ekler yüklenemedi" });
    }
  });

  // =========================================
  // DAILY CASH REPORTS API
  // =========================================

  // Get daily cash reports (supervisor: own branch, muhasebe: all branches)
  app.get('/api/cash-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      let branchId: number | undefined;
      
      // Supervisors can only see their own branch reports
      if (isBranchRole(role)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        }
        branchId = user.branchId;
      }
      // Muhasebe can see all branches (no branchId filter)
      else if (role !== 'muhasebe') {
        return res.status(403).json({ message: "Kasa raporlarını görüntüleme yetkiniz yok" });
      }

      const reports = await storage.getDailyCashReports(branchId, dateFrom, dateTo);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching cash reports:", error);
      res.status(500).json({ message: "Kasa raporları getirilemedi" });
    }
  });

  // Get single cash report by ID
  app.get('/api/cash-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      const report = await storage.getDailyCashReportById(id);
      if (!report) {
        return res.status(404).json({ message: "Kasa raporu bulunamadı" });
      }

      // Check access: supervisor can only view own branch, muhasebe can view all
      if (isBranchRole(role)) {
        if (!user.branchId || report.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu raporu görüntüleme yetkiniz yok" });
        }
      } else if (role !== 'muhasebe') {
        return res.status(403).json({ message: "Kasa raporlarını görüntüleme yetkiniz yok" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching cash report:", error);
      res.status(500).json({ message: "Kasa raporu getirilemedi" });
    }
  });

  // Create daily cash report (supervisor only)
  app.post('/api/cash-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Only supervisors can create cash reports
      if (!['supervisor', 'supervisor_buddy'].includes(role)) {
        return res.status(403).json({ message: "Kasa raporu oluşturma yetkiniz yok" });
      }

      // Validate request body
      const { insertDailyCashReportSchema } = await import('@shared/schema');
      const validatedData = insertDailyCashReportSchema.parse(req.body);

      // Ensure branchId matches user's branch
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }
      if (validatedData.branchId !== user.branchId) {
        return res.status(403).json({ message: "Başka şube için rapor oluşturamazsınız" });
      }

      // Create report with auto-set reportedById
      const report = await storage.createDailyCashReport({
        ...validatedData,
        reportedById: user.id,
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating cash report:", error);
      
      // Handle unique constraint violation (duplicate report)
      if (error.code === '23505') {
        return res.status(409).json({ 
          message: "Bu tarih için zaten bir kasa raporu mevcut" 
        });
      }
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Geçersiz kasa raporu verisi", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Kasa raporu oluşturulamadı" });
    }
  });

  // Update daily cash report (supervisor: own branch, muhasebe: all branches)
  app.patch('/api/cash-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Get existing report
      const existingReport = await storage.getDailyCashReportById(id);
      if (!existingReport) {
        return res.status(404).json({ message: "Kasa raporu bulunamadı" });
      }

      // Check access: supervisor can only update own branch, muhasebe can update all
      if (isBranchRole(role)) {
        if (!user.branchId || existingReport.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu raporu güncelleme yetkiniz yok" });
        }
      } else if (role !== 'muhasebe') {
        return res.status(403).json({ message: "Kasa raporlarını güncelleme yetkiniz yok" });
      }

      // Validate updates (partial schema)
      const { insertDailyCashReportSchema } = await import('@shared/schema');
      const validatedData = insertDailyCashReportSchema.partial().parse(req.body);

      // Prevent changing branchId or reportDate (immutable after creation)
      const { branchId, reportDate, reportedById, ...allowedUpdates } = validatedData;

      const updated = await storage.updateDailyCashReport(id, allowedUpdates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cash report:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Geçersiz kasa raporu verisi", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Kasa raporu güncellenemedi" });
    }
  });

  // Delete daily cash report (supervisor: own branch, muhasebe: all branches)
  app.delete('/api/cash-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Get existing report
      const existingReport = await storage.getDailyCashReportById(id);
      if (!existingReport) {
        return res.status(404).json({ message: "Kasa raporu bulunamadı" });
      }

      // Check access: supervisor can only delete own branch, muhasebe can delete all
      if (isBranchRole(role)) {
        if (!user.branchId || existingReport.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu raporu silme yetkiniz yok" });
        }
      } else if (role !== 'muhasebe') {
        return res.status(403).json({ message: "Kasa raporlarını silme yetkiniz yok" });
      }

      await storage.deleteDailyCashReport(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cash report:", error);
      res.status(500).json({ message: "Kasa raporu silinemedi" });
    }
  });

  // =========================================
  // SHIFTS API (Vardiya Yönetimi)
  // =========================================

  // Get shifts (supervisor: own branch, employees: own shifts, HQ IK: all branches read-only)
  app.get('/api/shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const assignedToId = req.query.assignedToId as string | undefined;

      let branchId: number | undefined;
      let userIdFilter: string | undefined;
      
      // Supervisor: can see their branch shifts
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        }
        branchId = user.branchId;
      }
      // Regular employees (barista, stajyer): can only see their own shifts
      else if (isBranchRole(role)) {
        userIdFilter = user.id;
      }
      // HQ IK can see all branches (no filter)
      else if (role !== 'destek') {
        return res.status(403).json({ message: "Vardiyaları görüntüleme yetkiniz yok" });
      }

      const shifts = await storage.getShifts(
        branchId, 
        userIdFilter || assignedToId, 
        dateFrom, 
        dateTo
      );
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Vardiyalar getirilemedi" });
    }
  });

  // Get single shift by ID
  app.get('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      const shift = await storage.getShift(id);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }

      // Check access: supervisor can view own branch, employees can view own shifts, HQ IK can view all
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId || shift.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu vardiyayı görüntüleme yetkiniz yok" });
        }
      } else if (isBranchRole(role)) {
        if (shift.assignedToId !== user.id) {
          return res.status(403).json({ message: "Bu vardiyayı görüntüleme yetkiniz yok" });
        }
      } else if (role !== 'destek') {
        return res.status(403).json({ message: "Vardiyaları görüntüleme yetkiniz yok" });
      }

      res.json(shift);
    } catch (error) {
      console.error("Error fetching shift:", error);
      res.status(500).json({ message: "Vardiya getirilemedi" });
    }
  });

  // Bulk create shifts (supervisor only)
  app.post('/api/shifts/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Toplu vardiya oluşturma yetkiniz yok" });
      }

      const { bulkCreateShiftsSchema } = await import('@shared/schema');
      const validatedData = bulkCreateShiftsSchema.parse(req.body);

      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }
      if (validatedData.branchId !== user.branchId) {
        return res.status(403).json({ message: "Başka şube için vardiya oluşturamazsınız" });
      }

      const preview = req.query.preview === 'true';
      const shifts = await storage.createShiftsBulk(validatedData, user.id, preview);

      res.status(preview ? 200 : 201).json({ shifts, preview });
    } catch (error: any) {
      console.error("Error bulk creating shifts:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Toplu vardiya oluşturulamadı" });
    }
  });

  // Create shift (supervisor only)
  app.post('/api/shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Only supervisors can create shifts
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
      }

      // Validate request body
      const { insertShiftSchema } = await import('@shared/schema');
      const validatedData = insertShiftSchema.parse(req.body);

      // Ensure branchId matches user's branch
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }
      if (validatedData.branchId !== user.branchId) {
        return res.status(403).json({ message: "Başka şube için vardiya oluşturamazsınız" });
      }

      // Validate business rules (45h/week, 1 day off, 1h break)
      const validation = await validateShiftRules(null, validatedData, null);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Create shift with auto-set createdById
      const shift = await storage.createShift({
        ...validatedData,
        createdById: user.id,
      });

      res.status(201).json(shift);
    } catch (error: any) {
      console.error("Error creating shift:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Geçersiz vardiya verisi", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Vardiya oluşturulamadı" });
    }
  });

  // Validation helper for shift updates and creation
  async function validateShiftRules(
    shiftId: number | null,
    updateData: Partial<any>,
    existingShift: any | null
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Determine final values (for updates, merge with existing; for creation, use updateData)
      const employeeId = updateData.assignedToId !== undefined 
        ? updateData.assignedToId 
        : existingShift?.assignedToId;
      if (!employeeId) return { valid: true }; // No employee assigned, no validation needed

      const shiftDate = updateData.shiftDate || existingShift?.shiftDate;
      const startTime = updateData.startTime || existingShift?.startTime;
      const endTime = updateData.endTime || existingShift?.endTime;

      // 1. Check 1-hour break validation (shift duration)
      const startDate = new Date(`${shiftDate}T${startTime}`);
      const endDate = new Date(`${shiftDate}T${endTime}`);
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      if (durationHours > 6 && durationHours < 7) {
        return { 
          valid: false, 
          error: "6 saatten uzun vardiyalar için 1 saat mola gereklidir. Toplam vardiya süresi en az 7 saat olmalıdır." 
        };
      }

      // Get week boundaries (Monday to Sunday)
      const shiftDateObj = new Date(shiftDate);
      const dayOfWeek = shiftDateObj.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(shiftDateObj);
      weekStart.setDate(shiftDateObj.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all shifts for this employee in this week
      const employeeWeekShifts = await storage.getShifts(
        undefined, // branchId - not filtering by branch
        employeeId, // assignedToId
        weekStart.toISOString().split('T')[0], // dateFrom
        weekEnd.toISOString().split('T')[0] // dateTo
      );

      // Calculate total weekly hours and days worked
      let totalWeeklyHours = 0;
      const daysWorked = new Set<string>();

      for (const shift of employeeWeekShifts) {
        // If this is the shift being updated, use new data; otherwise use existing data
        if (shiftId && shift.id === shiftId) {
          totalWeeklyHours += durationHours;
          daysWorked.add(shiftDate);
        } else {
          const sStart = new Date(`${shift.shiftDate}T${shift.startTime}`);
          const sEnd = new Date(`${shift.shiftDate}T${shift.endTime}`);
          const sDuration = (sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60);
          totalWeeklyHours += sDuration;
          daysWorked.add(shift.shiftDate);
        }
      }

      // For new shifts (shiftId is null), add the new shift hours
      if (!shiftId) {
        totalWeeklyHours += durationHours;
        daysWorked.add(shiftDate);
      }

      // 2. Check 45h/week limit
      if (totalWeeklyHours > 45) {
        return { 
          valid: false, 
          error: `Bu çalışan haftalık 45 saat sınırını aşacak (${totalWeeklyHours.toFixed(1)} saat). Lütfen vardiya süresini azaltın.` 
        };
      }

      // 3. Check minimum 1 day off per week (must work max 6 days)
      if (daysWorked.size > 6) {
        return { 
          valid: false, 
          error: "Çalışanlar haftada en az 1 gün izinli olmalıdır. Bu çalışan zaten 7 gün çalışıyor." 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error in shift validation:", error);
      return { valid: true }; // Don't block on validation errors
    }
  }

  // Update shift (supervisor: own branch only)
  app.patch('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Only supervisors can update shifts
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Vardiya güncelleme yetkiniz yok" });
      }

      // Get existing shift
      const existingShift = await storage.getShift(id);
      if (!existingShift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }

      // Check access: supervisor can only update own branch
      if (!user.branchId || existingShift.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu vardiyayı güncelleme yetkiniz yok" });
      }

      // Validate updates (partial schema)
      const { insertShiftSchema } = await import('@shared/schema');
      const validatedData = insertShiftSchema.partial().parse(req.body);

      // Prevent changing branchId or createdById (immutable after creation)
      const { branchId, createdById, ...allowedUpdates } = validatedData;

      // Validate business rules (45h/week, 1 day off, 1h break)
      const validation = await validateShiftRules(id, allowedUpdates, existingShift);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const updated = await storage.updateShift(id, allowedUpdates);
      
      // Send notification if assignment changed or shift was updated
      if (updated) {
        const assignmentChanged = allowedUpdates.assignedToId && allowedUpdates.assignedToId !== existingShift.assignedToId;
        if (assignmentChanged) {
          await storage.notifyShiftChange(id, 'assigned');
        } else if (Object.keys(allowedUpdates).length > 0) {
          await storage.notifyShiftChange(id, 'updated');
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating shift:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Geçersiz vardiya verisi", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Vardiya güncellenemedi" });
    }
  });

  // Delete shift (supervisor: own branch only)
  app.delete('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Only supervisors can delete shifts
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Vardiya silme yetkiniz yok" });
      }

      // Get existing shift
      const existingShift = await storage.getShift(id);
      if (!existingShift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }

      // Check access: supervisor can only delete own branch
      if (!user.branchId || existingShift.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu vardiyayı silme yetkiniz yok" });
      }

      // Send cancellation notification BEFORE deleting (so shift data is still available)
      if (existingShift.assignedToId) {
        await storage.notifyShiftChange(id, 'cancelled', 'Vardiya yönetici tarafından silindi');
      }
      
      await storage.deleteShift(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ message: "Vardiya silinemedi" });
    }
  });

  // AI-powered shift plan suggestions (supervisor + destek only)
  app.post('/api/shifts/ai-suggest', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Authorization: supervisors + destek only
      if (role !== 'supervisor' && role !== 'supervisor_buddy' && role !== 'destek') {
        return res.status(403).json({ message: "AI vardiya planı oluşturma yetkiniz yok" });
      }

      // Validate request payload
      const z = await import('zod');
      const aiSuggestSchema = z.z.object({
        branchId: z.z.number().int().positive(),
        weekStart: z.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih formatı (YYYY-MM-DD)"),
        weekEnd: z.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih formatı (YYYY-MM-DD)"),
      }).refine(data => data.weekStart <= data.weekEnd, {
        message: "Başlangıç tarihi bitiş tarihinden önce olmalı"
      });

      const validatedData = aiSuggestSchema.parse(req.body);
      const { branchId, weekStart, weekEnd } = validatedData;

      // Branch access check for supervisors
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId || user.branchId !== branchId) {
          return res.status(403).json({ message: "Sadece kendi şubeniz için AI öneri alabilirsiniz" });
        }
      }

      // Fetch historical shifts (last 6 weeks for analysis)
      const sixWeeksAgo = new Date();
      sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
      const historicalShifts = await storage.getShifts(
        branchId,
        undefined,
        sixWeeksAgo.toISOString().split('T')[0],
        weekEnd
      );

      // Fetch branch employees
      const branchUsers = await storage.getAllEmployees(branchId);
      const employees = branchUsers.map((u: any) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role || 'barista',
      }));

      // Optional: Fetch workload metrics (if available)
      // For now, we'll skip this and focus on historical shifts

      const { generateShiftPlan } = await import('./ai');
      const plan = await generateShiftPlan(
        branchId,
        weekStart,
        weekEnd,
        historicalShifts.map(s => ({
          shiftDate: s.shiftDate,
          shiftType: s.shiftType,
          assignedToId: s.assignedToId,
          status: s.status,
        })),
        employees,
        undefined, // workloadMetrics (optional)
        user.id
      );

      res.json(plan);
    } catch (error: any) {
      console.error("Error generating shift plan:", error);
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      res.status(500).json({ message: "AI vardiya planı oluşturulamadı" });
    }
  });

  // Bulk create shifts (supervisor: own branch only)
  app.post('/api/shifts/bulk-create', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Authorization: supervisors only
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Toplu vardiya oluşturma yetkiniz yok" });
      }

      if (!user.branchId) {
        return res.status(403).json({ message: "Şube ataması bulunamadı" });
      }

      const { shifts: shiftsData, checklistIds } = req.body;

      if (!Array.isArray(shiftsData) || shiftsData.length === 0) {
        return res.status(400).json({ message: "Geçersiz vardiya listesi" });
      }

      // Create all shifts
      const createdShifts = await Promise.all(
        shiftsData.map(async (shiftData: any) => {
          const { insertShiftSchema } = await import('@shared/schema');
          const validatedData = insertShiftSchema.parse({
            ...shiftData,
            branchId: user.branchId,
            createdById: user.id,
          });
          return storage.createShift(validatedData);
        })
      );

      // Assign checklists to all created shifts if provided
      if (checklistIds && Array.isArray(checklistIds) && checklistIds.length > 0) {
        await Promise.all(
          createdShifts.map((shift: any) =>
            storage.setShiftChecklists(shift.id, checklistIds)
          )
        );
      }

      res.status(201).json(createdShifts);
    } catch (error: any) {
      console.error("Error bulk creating shifts:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz vardiya verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiyalar oluşturulamadı" });
    }
  });

  // Get performance metrics by user (HQ + supervisor + self)
  app.get('/api/performance/user/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const targetUserId = req.params.id;

      // Authorization: HQ can see all, supervisors can see own branch, users can see self
      const targetUser = await storage.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Check access
      if (!isHQRole(role)) {
        // Supervisors can only see their own branch employees
        if (role === 'supervisor' || role === 'supervisor_buddy') {
          if (!user.branchId || targetUser.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu kullanıcının performansını görüntüleme yetkiniz yok" });
          }
        } else {
          // Regular employees can only see themselves
          if (user.id !== targetUserId) {
            return res.status(403).json({ message: "Sadece kendi performansınızı görüntüleyebilirsiniz" });
          }
        }
      }

      // Get performance metrics for the user
      const metrics = await storage.getPerformanceMetrics();
      const userMetrics = metrics.filter((m: any) => m.userId === targetUserId);

      res.json(userMetrics);
    } catch (error) {
      console.error("Error fetching user performance:", error);
      res.status(500).json({ message: "Performans verileri getirilemedi" });
    }
  });

  // ==================== HR: LEAVE REQUESTS ====================
  
  // Get leave requests (HQ: all, Supervisor: branch, Employee: self)
  app.get('/api/leave-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { status } = req.query;
      
      let requests;
      
      if (isHQRole(role)) {
        // HQ sees all requests
        requests = await storage.getLeaveRequests(undefined, undefined, status);
      } else if (role === 'supervisor' || role === 'supervisor_buddy') {
        // Supervisors see their branch
        const branchId = assertBranchScope(user);
        requests = await storage.getLeaveRequests(undefined, branchId, status);
      } else {
        // Employees see only their own
        requests = await storage.getLeaveRequests(user.id, undefined, status);
      }
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "İzin talepleri getirilemedi" });
    }
  });
  
  // Get single leave request
  app.get('/api/leave-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const request = await storage.getLeaveRequest(id);
      if (!request) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }
      
      // Authorization: HQ sees all, supervisor sees branch, employee sees self
      if (!isHQRole(role)) {
        if (role === 'supervisor' || role === 'supervisor_buddy') {
          const requestUser = await storage.getUserById(request.userId);
          if (requestUser?.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu izin talebini görüntüleme yetkiniz yok" });
          }
        } else {
          if (request.userId !== user.id) {
            return res.status(403).json({ message: "Bu izin talebini görüntüleme yetkiniz yok" });
          }
        }
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching leave request:", error);
      res.status(500).json({ message: "İzin talebi getirilemedi" });
    }
  });
  
  // Create leave request
  app.post('/api/leave-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Calculate totalDays server-side (inclusive calendar days)
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const validatedData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId: user.id, // Always use authenticated user
        status: 'pending', // Force pending status
        totalDays, // Server-side calculation
      });
      
      const request = await storage.createLeaveRequest(validatedData);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating leave request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz izin talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "İzin talebi oluşturulamadı" });
    }
  });
  
  // Update leave request
  app.patch('/api/leave-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getLeaveRequest(id);
      if (!existing) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }
      
      // Authorization: Only owner can update (and only if pending)
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu izin talebini güncelleme yetkiniz yok" });
      }
      
      if (existing.status !== 'pending') {
        return res.status(400).json({ message: "Sadece beklemedeki talepler güncellenebilir" });
      }
      
      // Validate partial update
      const validatedData = insertLeaveRequestSchema.partial().parse(req.body);
      
      // Prevent status change via this endpoint
      delete validatedData.status;
      
      const updated = await storage.updateLeaveRequest(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating leave request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz izin talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "İzin talebi güncellenemedi" });
    }
  });
  
  // Approve/reject leave request (Supervisor + HQ)
  app.patch('/api/leave-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum. 'approved' veya 'rejected' olmalı" });
      }
      
      const existing = await storage.getLeaveRequest(id);
      if (!existing) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }
      
      // Authorization: Supervisors can approve their branch, HQ can approve all
      if (!isHQRole(role)) {
        if (role !== 'supervisor' && role !== 'supervisor_buddy') {
          return res.status(403).json({ message: "İzin talebi onaylama/reddetme yetkiniz yok" });
        }
        
        // Check branch scope for supervisors
        const requestUser = await storage.getUserById(existing.userId);
        if (requestUser?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye ait olmayan izin taleplerini onaylayamazsınız" });
        }
      }
      
      const updated = await storage.updateLeaveRequest(id, { 
        status,
        approvedBy: status === 'approved' ? user.id : undefined,
        approvedAt: status === 'approved' ? new Date() : undefined,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating leave request status:", error);
      res.status(500).json({ message: "İzin talebi durumu güncellenemedi" });
    }
  });
  
  // Delete leave request (only owner, only pending)
  app.delete('/api/leave-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getLeaveRequest(id);
      if (!existing) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }
      
      // Authorization: Only owner can delete, only if pending
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu izin talebini silme yetkiniz yok" });
      }
      
      if (existing.status !== 'pending') {
        return res.status(400).json({ message: "Sadece beklemedeki talepler silinebilir" });
      }
      
      await storage.deleteLeaveRequest(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      res.status(500).json({ message: "İzin talebi silinemedi" });
    }
  });
  
  // ==================== HR: SHIFT ATTENDANCE ====================
  
  // Get shift attendance records (HQ: all, Supervisor: branch, Employee: self)
  app.get('/api/shift-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { shiftId, dateFrom, dateTo } = req.query;
      
      let records;
      
      if (isHQRole(role)) {
        // HQ sees all attendance
        records = await storage.getShiftAttendances(
          shiftId ? parseInt(shiftId) : undefined,
          undefined,
          dateFrom,
          dateTo
        );
      } else if (role === 'supervisor' || role === 'supervisor_buddy') {
        // Supervisors see their branch
        const branchId = assertBranchScope(user);
        records = await storage.getShiftAttendances(
          shiftId ? parseInt(shiftId) : undefined,
          undefined,
          dateFrom,
          dateTo
        );
        
        // Filter by branch (get shift details)
        const filteredRecords = [];
        for (const record of records) {
          const shift = await storage.getShift(record.shiftId);
          if (shift?.branchId === branchId) {
            filteredRecords.push(record);
          }
        }
        records = filteredRecords;
      } else {
        // Employees see only their own attendance
        records = await storage.getShiftAttendances(
          shiftId ? parseInt(shiftId) : undefined,
          user.id,
          dateFrom,
          dateTo
        );
      }
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching shift attendance:", error);
      res.status(500).json({ message: "Yoklama kayıtları getirilemedi" });
    }
  });
  
  // Get single attendance record
  app.get('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const record = await storage.getShiftAttendance(id);
      if (!record) {
        return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
      }
      
      // Authorization check
      if (!isHQRole(role)) {
        if (role === 'supervisor' || role === 'supervisor_buddy') {
          const shift = await storage.getShift(record.shiftId);
          if (shift?.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu yoklama kaydını görüntüleme yetkiniz yok" });
          }
        } else {
          if (record.userId !== user.id) {
            return res.status(403).json({ message: "Bu yoklama kaydını görüntüleme yetkiniz yok" });
          }
        }
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching attendance record:", error);
      res.status(500).json({ message: "Yoklama kaydı getirilemedi" });
    }
  });
  
  // Create attendance record (check-in with mandatory photo and dress code analysis)
  app.post('/api/shift-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { photoUrl, shiftId: providedShiftId, ...otherData } = req.body;

      // MANDATORY: Photo required for check-in
      if (!photoUrl) {
        return res.status(400).json({ 
          message: "Fotoğraf yüklemesi zorunludur. Lütfen vardiyaya giriş yapmadan önce fotoğraf yükleyin." 
        });
      }

      // Check daily photo quota (10/day)
      const today = new Date().toISOString().split('T')[0];
      const userRecord = await storage.getUser(user.id);
      
      if (!userRecord) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Reset counter if it's a new day
      const lastPhotoDate = userRecord.lastPhotoDate;
      const dailyPhotoCount = (lastPhotoDate === today) ? (userRecord.dailyPhotoCount || 0) : 0;
      
      if (dailyPhotoCount >= 10) {
        return res.status(429).json({ 
          message: "Günlük fotoğraf analiz limitiniz doldu (10/gün). Yarın tekrar deneyin veya supervisor ile iletişime geçin.",
          quotaExceeded: true,
          remaining: 0,
          total: 10
        });
      }

      // AUTO-DERIVE shiftId: Find user's shift for today
      let shiftId = providedShiftId;
      
      if (!shiftId) {
        // Query shifts table for user's shift today
        const todayShifts = await storage.getShifts(
          userRecord.branchId || undefined,
          user.id,
          today,
          today
        );
        
        if (todayShifts.length === 0) {
          return res.status(400).json({ 
            message: "Bugün için atanmış vardiya bulunamadı. Lütfen supervisor ile iletişime geçin." 
          });
        }
        
        // Use the first shift found for today
        shiftId = todayShifts[0].id;
      } else {
        // VALIDATION: If shiftId provided, ensure it belongs to this user
        const shift = await storage.getShift(shiftId);
        
        if (!shift) {
          return res.status(400).json({ 
            message: "Belirtilen vardiya bulunamadı." 
          });
        }
        
        if (shift.assignedToId !== user.id) {
          return res.status(403).json({ 
            message: "Bu vardiya size atanmamış. Lütfen supervisor ile iletişime geçin." 
          });
        }
        
        if (shift.shiftDate !== today) {
          return res.status(400).json({ 
            message: "Bu vardiya bugün için değil. Lütfen doğru tarih için giriş yapın." 
          });
        }
      }

      // Validate base attendance data
      const validatedData = insertShiftAttendanceSchema.parse({
        ...otherData,
        shiftId,
        userId: user.id,
        checkInTime: new Date(),
        photoUrl,
        analysisStatus: 'pending',
      });

      // Run AI dress code analysis (synchronous with 10s timeout)
      const employeeName = userRecord.firstName 
        ? `${userRecord.firstName} ${userRecord.lastName || ''}`.trim() 
        : userRecord.username;

      let analysisResult;
      try {
        analysisResult = await Promise.race([
          analyzeDressCodePhoto(photoUrl, employeeName, user.id),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('AI timeout')), 10000)
          )
        ]);
      } catch (error: any) {
        console.warn("AI analysis timeout or error:", error.message);
        analysisResult = null;
      }

      // Prepare final attendance data with analysis results
      const attendanceData = {
        ...validatedData,
        analysisStatus: analysisResult ? 'completed' : 'error',
        analysisDetails: analysisResult ? {
          isCompliant: analysisResult.isCompliant,
          score: analysisResult.score,
          summary: analysisResult.summary,
          details: analysisResult.details,
        } : null,
        analysisTimestamp: analysisResult ? new Date() : null,
        aiWarnings: analysisResult?.violations || [],
      };

      // Create attendance record
      const record = await storage.createShiftAttendance(attendanceData);

      // Update user's photo quota
      await storage.updateUser(user.id, {
        dailyPhotoCount: dailyPhotoCount + 1,
        lastPhotoDate: today,
      });

      // Return response with analysis verdict
      const remaining = 10 - (dailyPhotoCount + 1);
      res.status(201).json({
        ...record,
        quota: {
          remaining,
          total: 10,
          used: dailyPhotoCount + 1,
        },
      });
    } catch (error: any) {
      console.error("Error creating attendance record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yoklama verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yoklama kaydı oluşturulamadı" });
    }
  });
  
  // Update attendance record (check-out, break times)
  app.patch('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getShiftAttendance(id);
      if (!existing) {
        return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
      }
      
      // Authorization: Owner or supervisor can update
      if (!isHQRole(role)) {
        if (role !== 'supervisor' && role !== 'supervisor_buddy') {
          // Regular employees can only update their own
          if (existing.userId !== user.id) {
            return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
          }
        } else {
          // Supervisors can update their branch
          const shift = await storage.getShift(existing.shiftId);
          if (shift?.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
          }
        }
      }
      
      // Validate partial update
      const validatedData = insertShiftAttendanceSchema.partial().parse(req.body);
      
      const updated = await storage.updateShiftAttendance(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating attendance record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yoklama verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yoklama kaydı güncellenemedi" });
    }
  });
  
  // Delete attendance record (supervisor + HQ only)
  app.delete('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getShiftAttendance(id);
      if (!existing) {
        return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
      }
      
      // Authorization: Only supervisors and HQ can delete
      if (!isHQRole(role)) {
        if (role !== 'supervisor' && role !== 'supervisor_buddy') {
          return res.status(403).json({ message: "Yoklama kaydı silme yetkiniz yok" });
        }
        
        const shift = await storage.getShift(existing.shiftId);
        if (shift?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu yoklama kaydını silme yetkiniz yok" });
        }
      }
      
      await storage.deleteShiftAttendance(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      res.status(500).json({ message: "Yoklama kaydı silinemedi" });
    }
  });

  // ===== SHIFT TRADE REQUEST ENDPOINTS =====
  
  // POST /api/shift-trades - Create a shift trade request
  app.post('/api/shift-trades', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { insertShiftTradeRequestSchema } = await import('@shared/schema');
      
      const validatedData = insertShiftTradeRequestSchema.parse(req.body);
      
      const requesterShift = await storage.getShift(validatedData.requesterShiftId);
      if (!requesterShift) {
        return res.status(404).json({ message: "Talep eden vardiya bulunamadı" });
      }
      
      if (requesterShift.assignedToId !== validatedData.requesterId) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      if (validatedData.requesterId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi vardiyalarınız için takas talebi oluşturabilirsiniz" });
      }
      
      const responderShift = await storage.getShift(validatedData.responderShiftId);
      if (!responderShift) {
        return res.status(404).json({ message: "Hedef vardiya bulunamadı" });
      }
      
      if (responderShift.assignedToId !== validatedData.responderId) {
        return res.status(400).json({ message: "Hedef çalışan bu vardiyaya atanmamış" });
      }
      
      if (validatedData.requesterShiftId === validatedData.responderShiftId) {
        return res.status(400).json({ message: "Aynı vardiya ile takas yapılamaz" });
      }
      
      const existingTrades = await storage.getShiftTradeRequests({
        userId: user.id,
        status: 'taslak'
      });
      
      const duplicate = existingTrades.find(
        trade => 
          (trade.requesterShiftId === validatedData.requesterShiftId && 
           trade.responderShiftId === validatedData.responderShiftId) ||
          (trade.requesterShiftId === validatedData.responderShiftId && 
           trade.responderShiftId === validatedData.requesterShiftId)
      );
      
      if (duplicate) {
        return res.status(400).json({ message: "Bu vardiyalar için zaten açık bir takas talebi var" });
      }
      
      const created = await storage.createShiftTradeRequest(validatedData);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating shift trade request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz takas talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Takas talebi oluşturulamadı" });
    }
  });
  
  // GET /api/shift-trades - List shift trade requests with filters
  app.get('/api/shift-trades', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { branchId: queryBranchId, userId: queryUserId, status } = req.query;
      
      const filters: { branchId?: number; userId?: string; status?: string } = {};
      
      if (status) {
        filters.status = status as string;
      }
      
      if (isHQRole(role)) {
        if (queryBranchId) {
          filters.branchId = parseInt(queryBranchId as string);
        }
        if (queryUserId) {
          filters.userId = queryUserId as string;
        }
      } else if (role === 'supervisor' || role === 'supervisor_buddy' || role === 'coach' || role === 'admin') {
        filters.branchId = user.branchId!;
      } else {
        filters.userId = user.id;
      }
      
      const trades = await storage.getShiftTradeRequests(filters);
      res.json(trades);
    } catch (error) {
      console.error("Error fetching shift trade requests:", error);
      res.status(500).json({ message: "Takas talepleri alınamadı" });
    }
  });
  
  // PATCH /api/shift-trades/:id/respond - Responder confirms the trade
  app.patch('/api/shift-trades/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const trades = await storage.getShiftTradeRequests({ userId: user.id });
      const trade = trades.find(t => t.id === id);
      
      if (!trade) {
        return res.status(404).json({ message: "Takas talebi bulunamadı" });
      }
      
      if (trade.responderId !== user.id) {
        return res.status(403).json({ message: "Bu takas talebini yalnızca hedef çalışan onaylayabilir" });
      }
      
      if (trade.status !== 'taslak') {
        return res.status(400).json({ message: "Bu takas talebi zaten işleme alınmış" });
      }
      
      await storage.respondToShiftTradeRequest(id, user.id);
      
      const updated = await storage.getShiftTradeRequests({ userId: user.id });
      const updatedTrade = updated.find(t => t.id === id);
      
      res.json(updatedTrade);
    } catch (error) {
      console.error("Error responding to shift trade request:", error);
      res.status(500).json({ message: "Takas talebi yanıtlanamadı" });
    }
  });
  
  // PATCH /api/shift-trades/:id/approve - Supervisor approves or rejects the trade
  app.patch('/api/shift-trades/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Takas taleplerini onaylama yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const approveSchema = z.object({
        approved: z.boolean(),
        notes: z.string().optional(),
      });
      
      const { approved, notes } = approveSchema.parse(req.body);
      
      const allTrades = await storage.getShiftTradeRequests({});
      const trade = allTrades.find(t => t.id === id);
      
      if (!trade) {
        return res.status(404).json({ message: "Takas talebi bulunamadı" });
      }
      
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        const requesterShift = await storage.getShift(trade.requesterShiftId);
        const responderShift = await storage.getShift(trade.responderShiftId);
        
        if (requesterShift?.branchId !== user.branchId && responderShift?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubenin takas taleplerini onaylayabilirsiniz" });
        }
      }
      
      if (trade.status !== 'calisan_onayi') {
        return res.status(400).json({ message: "Bu takas talebi henüz çalışan tarafından onaylanmamış" });
      }
      
      await storage.approveShiftTradeRequest(id, user.id, approved, notes);
      
      const updated = await storage.getShiftTradeRequests({});
      const updatedTrade = updated.find(t => t.id === id);
      
      res.json(updatedTrade);
    } catch (error: any) {
      console.error("Error approving shift trade request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz onay verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Takas talebi onaylanamadı" });
    }
  });

  // ===== SHIFT TEMPLATE ENDPOINTS =====
  
  // GET /api/shift-templates - List shift templates
  app.get('/api/shift-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { branchId: queryBranchId } = req.query;
      
      if (isHQRole(role)) {
        const branchId = queryBranchId ? parseInt(queryBranchId as string) : undefined;
        const templates = await storage.getShiftTemplates(branchId);
        return res.json(templates);
      }
      
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }
      
      const templates = await storage.getShiftTemplates(user.branchId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      res.status(500).json({ message: "Şablonlar getirilemedi" });
    }
  });
  
  // GET /api/shift-templates/:id - Get single shift template
  app.get('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const template = await storage.getShiftTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && template.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu görüntüleme yetkiniz yok" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching shift template:", error);
      res.status(500).json({ message: "Şablon getirilemedi" });
    }
  });
  
  // POST /api/shift-templates - Create shift template
  app.post('/api/shift-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon oluşturma yetkiniz yok" });
      }
      
      const { insertShiftTemplateSchema } = await import('@shared/schema');
      const validatedData = insertShiftTemplateSchema.parse(req.body);
      
      if (!isHQRole(role) && validatedData.branchId !== user.branchId) {
        return res.status(403).json({ message: "Başka şubeler için şablon oluşturamazsınız" });
      }
      
      const created = await storage.createShiftTemplate({
        ...validatedData,
        createdById: user.id,
      });
      
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating shift template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });
  
  // PATCH /api/shift-templates/:id - Update shift template
  app.patch('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon güncelleme yetkiniz yok" });
      }
      
      const existing = await storage.getShiftTemplate(id);
      if (!existing) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && existing.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu güncelleme yetkiniz yok" });
      }
      
      const { insertShiftTemplateSchema } = await import('@shared/schema');
      const validatedData = insertShiftTemplateSchema.partial().parse(req.body);
      
      const updated = await storage.updateShiftTemplate(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating shift template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });
  
  // DELETE /api/shift-templates/:id - Delete shift template
  app.delete('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon silme yetkiniz yok" });
      }
      
      const existing = await storage.getShiftTemplate(id);
      if (!existing) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && existing.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu silme yetkiniz yok" });
      }
      
      await storage.deleteShiftTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });
  
  // POST /api/shift-templates/:id/create-shifts - Create shifts from template
  app.post('/api/shift-templates/:id/create-shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablondan vardiya oluşturma yetkiniz yok" });
      }
      
      const template = await storage.getShiftTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && template.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu kullanma yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const createShiftsSchema = z.object({
        startDate: z.string(),
        endDate: z.string(),
      });
      
      const { startDate, endDate } = createShiftsSchema.parse(req.body);
      
      const created = await storage.createShiftsFromTemplate(id, startDate, endDate, user.id);
      res.status(201).json({ 
        message: `${created.length} vardiya oluşturuldu`,
        shifts: created 
      });
    } catch (error: any) {
      console.error("Error creating shifts from template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz tarih aralığı", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiyalar oluşturulamadı" });
    }
  });

  // ===== EMPLOYEE AVAILABILITY ENDPOINTS =====
  
  // GET /api/employee-availability - List employee availability
  app.get('/api/employee-availability', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { userId: queryUserId, startDate, endDate } = req.query;
      
      if (isHQRole(role) || ['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        const userId = queryUserId as string | undefined;
        const availability = await storage.getEmployeeAvailability(
          userId,
          startDate as string | undefined,
          endDate as string | undefined
        );
        return res.json(availability);
      }
      
      const availability = await storage.getEmployeeAvailability(
        user.id,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(availability);
    } catch (error) {
      console.error("Error fetching employee availability:", error);
      res.status(500).json({ message: "Müsaitlik bilgileri getirilemedi" });
    }
  });
  
  // GET /api/employee-availability/:id - Get single availability record
  app.get('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const availability = await storage.getAvailability(id);
      if (!availability) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        if (availability.userId !== user.id) {
          return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
        }
      }
      
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı getirilemedi" });
    }
  });
  
  // POST /api/employee-availability - Create availability record
  app.post('/api/employee-availability', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.parse(req.body);
      
      if (validatedData.userId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi müsaitlik bilgilerinizi ekleyebilirsiniz" });
      }
      
      const created = await storage.createAvailability(validatedData);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı oluşturulamadı" });
    }
  });
  
  // PATCH /api/employee-availability/:id - Update availability record
  app.patch('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getAvailability(id);
      if (!existing) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu kaydı güncelleme yetkiniz yok" });
      }
      
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.partial().parse(req.body);
      
      const updated = await storage.updateAvailability(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı güncellenemedi" });
    }
  });
  
  // DELETE /api/employee-availability/:id - Delete availability record
  app.delete('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getAvailability(id);
      if (!existing) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu kaydı silme yetkiniz yok" });
      }
      
      await storage.deleteAvailability(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı silinemedi" });
    }
  });
  
  // POST /api/employee-availability/check - Check availability for a shift
  app.post('/api/employee-availability/check', isAuthenticated, async (req: any, res) => {
    try {
      const { z } = await import('zod');
      const checkSchema = z.object({
        userId: z.string(),
        shiftDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      });
      
      const { userId, shiftDate, startTime, endTime } = checkSchema.parse(req.body);
      
      const result = await storage.checkEmployeeAvailability(userId, shiftDate, startTime, endTime);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz kontrol verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kontrolü yapılamadı" });
    }
  });

  // ===== CHECK-IN/CHECK-OUT ENDPOINTS =====
  
  // POST /api/shift-attendance/check-in - Check in with QR code, photo & location
  app.post('/api/shift-attendance/check-in', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const checkInSchema = z.object({
        qrData: z.string(),
        photoUrl: z.string().min(1, "Fotoğraf gereklidir"), // Required S3 URL of check-in photo
        latitude: z.number().min(-90).max(90, "Geçersiz enlem"),
        longitude: z.number().min(-180).max(180, "Geçersiz boylam"),
      });
      
      const { qrData, photoUrl, latitude, longitude } = checkInSchema.parse(req.body);
      
      const verification = await storage.verifyShiftQR(qrData);
      if (!verification.valid) {
        return res.status(400).json({ message: verification.message });
      }
      
      const shift = await storage.getShift(verification.shiftId!);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      if (shift.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      const existingAttendances = await storage.getShiftAttendances(shift.id);
      const userAttendance = existingAttendances.find(a => a.userId === user.id);
      
      if (userAttendance) {
        if (userAttendance.checkInTime) {
          return res.status(400).json({ message: "Bu vardiyaya zaten giriş yaptınız" });
        }
      }
      
      const now = new Date();
      
      // Prepare attendance data (photo and location are required)
      const attendanceData: any = {
        checkInTime: now,
        status: 'checked_in',
        checkInPhotoUrl: photoUrl,
        checkInLatitude: latitude.toString(),
        checkInLongitude: longitude.toString(),
      };
      
      let attendance;
      if (userAttendance) {
        attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
      } else {
        attendance = await storage.createShiftAttendance({
          shiftId: shift.id,
          userId: user.id,
          ...attendanceData,
        });
      }
      
      // Trigger AI dress code analysis asynchronously (photo is required)
      if (attendance) {
        (async () => {
          try {
            const analysis = await analyzeDressCodePhoto(
              photoUrl,
              user.fullName || user.email || "Çalışan",
              user.id,
              false // use cache
            );
            
            await storage.updateShiftAttendance(attendance.id, {
              aiDressCodeScore: analysis.score,
              aiDressCodeAnalysis: analysis as any,
              aiDressCodeStatus: analysis.isCompliant ? 'approved' : 'rejected',
              aiDressCodeWarnings: analysis.violations,
              aiDressCodeTimestamp: new Date(),
            });
            
            console.log(`✅ Dress code analyzed for attendance ${attendance.id}: ${analysis.score}/100`);
          } catch (error) {
            console.error("Error analyzing dress code:", error);
            await storage.updateShiftAttendance(attendance.id, {
              aiDressCodeStatus: 'error',
              aiDressCodeWarnings: ["AI analizi yapılamadı"],
            });
          }
        })();
      }
      
      res.status(201).json(attendance);
    } catch (error: any) {
      console.error("Error checking in:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
      }
      res.status(500).json({ message: "Giriş yapılamadı" });
    }
  });
  
  // POST /api/shift-attendance/check-out - Check out with QR code + photo + location
  app.post('/api/shift-attendance/check-out', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const checkOutSchema = z.object({
        qrData: z.string(),
        photoUrl: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      });
      
      const { qrData, photoUrl, latitude, longitude } = checkOutSchema.parse(req.body);
      
      const verification = await storage.verifyShiftQR(qrData);
      if (!verification.valid) {
        return res.status(400).json({ message: verification.message });
      }
      
      const shift = await storage.getShift(verification.shiftId!);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      if (shift.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      const existingAttendances = await storage.getShiftAttendances(shift.id);
      const userAttendance = existingAttendances.find(a => a.userId === user.id);
      
      if (!userAttendance || !userAttendance.checkInTime) {
        return res.status(400).json({ message: "Önce giriş yapmalısınız" });
      }
      
      if (userAttendance.checkOutTime) {
        return res.status(400).json({ message: "Bu vardiyadan zaten çıkış yaptınız" });
      }
      
      const now = new Date();
      
      const updated = await storage.updateShiftAttendance(userAttendance.id, {
        checkOutTime: now,
        checkOutPhotoUrl: photoUrl,
        checkOutLatitude: latitude.toString(),
        checkOutLongitude: longitude.toString(),
        status: 'checked_out',
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error checking out:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
      }
      res.status(500).json({ message: "Çıkış yapılamadı" });
    }
  });

  // ===== SHIFT REPORTING ENDPOINTS =====
  
  // GET /api/reports/attendance-stats - Get attendance statistics
  app.get('/api/reports/attendance-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { userId: queryUserId, month, year } = req.query;
      
      let targetUserId = user.id;
      
      if (isHQRole(role) || ['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        targetUserId = queryUserId as string || user.id;
      }
      
      const monthNum = month ? parseInt(month as string) : undefined;
      const yearNum = year ? parseInt(year as string) : undefined;
      
      const stats = await storage.calculateAttendanceStats(targetUserId, monthNum, yearNum);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
      res.status(500).json({ message: "İstatistikler getirilemedi" });
    }
  });

  // ===== MENU MANAGEMENT ENDPOINTS (HQ Admin Only) =====
  
  // GET /api/admin/menu - List all menu data
  app.get('/api/admin/menu', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const menu = await storage.listMenu();
      res.json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // POST /api/admin/menu/sections - Create section
  app.post('/api/admin/menu/sections', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuSectionSchema.parse(req.body);
      const section = await storage.createMenuSection(data);
      res.status(201).json(section);
    } catch (error: any) {
      console.error("Error creating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu section data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu section" });
    }
  });

  // PATCH /api/admin/menu/sections/:id - Update section
  app.patch('/api/admin/menu/sections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuSectionSchema.partial().parse(req.body);
      const section = await storage.updateMenuSection(id, data);
      res.json(section);
    } catch (error: any) {
      console.error("Error updating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu section data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu section" });
    }
  });

  // DELETE /api/admin/menu/sections/:id - Delete section
  app.delete('/api/admin/menu/sections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuSection(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu section:", error);
      res.status(500).json({ message: "Failed to delete menu section" });
    }
  });

  // PATCH /api/admin/menu/sections/order - Reorder sections
  app.patch('/api/admin/menu/sections/order', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { sectionIds } = req.body;
      if (!Array.isArray(sectionIds) || !sectionIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid sectionIds array" });
      }
      await storage.reorderMenuSections(sectionIds);
      res.status(204).send();
    } catch (error) {
      console.error("Error reordering menu sections:", error);
      res.status(500).json({ message: "Failed to reorder menu sections" });
    }
  });

  // POST /api/admin/menu/items - Create item
  app.post('/api/admin/menu/items', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // PATCH /api/admin/menu/items/:id - Update item
  app.patch('/api/admin/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, data);
      res.json(item);
    } catch (error: any) {
      console.error("Error updating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // DELETE /api/admin/menu/items/:id - Delete item
  app.delete('/api/admin/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // PATCH /api/admin/menu/items/order - Reorder items within section
  app.patch('/api/admin/menu/items/order', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { sectionId, itemIds } = req.body;
      if (typeof sectionId !== 'number' || !Array.isArray(itemIds) || !itemIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid sectionId or itemIds array" });
      }
      await storage.reorderMenuItems(sectionId, itemIds);
      res.status(204).send();
    } catch (error) {
      console.error("Error reordering menu items:", error);
      res.status(500).json({ message: "Failed to reorder menu items" });
    }
  });

  // POST /api/admin/menu/visibility-rules - Create visibility rule
  app.post('/api/admin/menu/visibility-rules', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuVisibilityRuleSchema.parse(req.body);
      const rule = await storage.createVisibilityRule(data);
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating visibility rule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid visibility rule data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create visibility rule" });
    }
  });

  // DELETE /api/admin/menu/visibility-rules/:id - Delete visibility rule
  app.delete('/api/admin/menu/visibility-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteVisibilityRule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting visibility rule:", error);
      res.status(500).json({ message: "Failed to delete visibility rule" });
    }
  });

  // ===== PAGE CONTENT MANAGEMENT ENDPOINTS (HQ Only) =====

  // GET /api/admin/page-content - List all page content
  app.get('/api/admin/page-content', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const contents = await storage.listPageContent();
      res.json(contents);
    } catch (error) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  // GET /api/admin/page-content/:slug - Get single page content by slug
  app.get('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const content = await storage.getPageContent(req.params.slug);
      if (!content) {
        return res.status(404).json({ message: "İçerik bulunamadı" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  // POST /api/admin/page-content - Create new page content
  app.post('/api/admin/page-content', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertPageContentSchema.parse({
        ...req.body,
        createdById: user.id,
        updatedById: user.id,
      });
      
      const newContent = await storage.createPageContent(validatedData);
      res.status(201).json(newContent);
    } catch (error: any) {
      console.error("Error creating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create page content" });
    }
  });

  // PATCH /api/admin/page-content/:slug - Update page content
  app.patch('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate request body with partial schema
      const validatedData = updatePageContentSchema.parse(req.body);
      
      const updateData = {
        ...validatedData,
        updatedById: user.id,
      };
      
      const updated = await storage.updatePageContent(req.params.slug, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof Error && error.message === "Content not found") {
        return res.status(404).json({ message: "İçerik bulunamadı" });
      }
      res.status(500).json({ message: "Failed to update page content" });
    }
  });

  // DELETE /api/admin/page-content/:slug - Delete page content
  app.delete('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      await storage.deletePageContent(req.params.slug);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting page content:", error);
      res.status(500).json({ message: "Failed to delete page content" });
    }
  });

  // ===== BRANDING ENDPOINTS (HQ Only) =====

  // GET /api/admin/branding - Get current branding (logo)
  app.get('/api/admin/branding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const branding = await storage.getBranding();
      // Sanitize response: only expose logoUrl and updatedAt
      res.json({
        logoUrl: branding?.logoUrl || null,
        updatedAt: branding?.updatedAt || null,
      });
    } catch (error) {
      console.error("Error fetching branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  // POST /api/admin/branding/logo - Update logo URL
  app.post('/api/admin/branding/logo', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate logoUrl with Zod (URL format check)
      const brandingSchema = z.object({
        logoUrl: z.string().url("Geçerli bir URL gerekli"),
      });
      
      const validatedData = brandingSchema.parse(req.body);
      const updated = await storage.updateBrandingLogo(validatedData.logoUrl, user.id);
      
      // Sanitize response
      res.json({
        logoUrl: updated.logoUrl,
        updatedAt: updated.updatedAt,
      });
    } catch (error: any) {
      console.error("Error updating logo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // ===== AI COST MONITORING ENDPOINTS (HQ Only) =====

  // GET /api/admin/ai-costs - Get AI usage cost aggregates
  app.get('/api/admin/ai-costs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate query params with Zod
      const querySchema = z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      });

      const { start, end } = querySchema.parse(req.query);

      // Convert string dates to Date objects
      const filters = {
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
      };

      const aggregates = await storage.getAiUsageAggregates(filters);
      res.json(aggregates);
    } catch (error: any) {
      console.error("Error fetching AI cost aggregates:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz tarih formatı", errors: error.errors });
      }
      res.status(500).json({ message: "AI maliyet verileri alınamadı" });
    }
  });

  // ===== USER CRM ENDPOINTS (HQ Only) =====

  // GET /api/admin/users - Get all users with filters
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { role, branchId, search, accountStatus } = req.query;
      const filters = {
        role: role as string | undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        search: search as string | undefined,
        accountStatus: accountStatus as string | undefined,
      };

      const allUsers = await storage.getAllUsersWithFilters(filters);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // PATCH /api/admin/users/:id - Update user role/branch
  app.patch('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      const updateSchema = z.object({
        role: z.string().optional(),
        branchId: z.number().nullable().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updated = await storage.updateUser(id, validatedData);

      if (!updated) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // POST /api/admin/users/bulk-import - Bulk import users from CSV
  app.post('/api/admin/users/bulk-import', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { users: csvUsers } = req.body;
      if (!Array.isArray(csvUsers) || csvUsers.length === 0) {
        return res.status(400).json({ message: "Geçerli kullanıcı listesi gerekli" });
      }

      // Validate each user record
      const userSchema = z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        role: z.string(),
        branchId: z.number().nullable(),
        profileImageUrl: z.string().nullable().optional(),
      });

      const validatedUsers = csvUsers.map(u => userSchema.parse(u));
      const imported = await storage.bulkImportUsers(validatedUsers);

      res.json({ imported: imported.length, users: imported });
    } catch (error: any) {
      console.error("Error bulk importing users:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz CSV verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  // POST /api/admin/users/approve/:id - Approve pending user
  app.post('/api/admin/users/approve/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const { sendWelcomeEmail } = await import('./email');
      const crypto = await import('crypto');

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'approve');

      const { id } = req.params;
      const targetUser = await storage.getUser(id);
      
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Supervisor can only approve users in their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId || currentUser.branchId !== targetUser.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin kullanıcılarını onaylayabilirsiniz" });
        }
      }

      if (targetUser.accountStatus !== 'pending') {
        return res.status(400).json({ message: "Kullanıcı zaten onaylanmış veya reddedilmiş" });
      }

      // Generate strong temporary password (12 characters)
      const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user: approved, active, set password
      const updated = await storage.updateUser(id, {
        accountStatus: 'approved',
        isActive: true,
        hashedPassword,
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      });

      if (!updated) {
        return res.status(500).json({ message: "Onay işlemi başarısız" });
      }

      // Send welcome email with temporary password
      if (targetUser.email) {
        await sendWelcomeEmail(targetUser.email, targetUser.username!, tempPassword);
      }

      res.json({ message: "Kullanıcı onaylandı", user: updated });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Onay işlemi sırasında hata oluştu" });
    }
  });

  // POST /api/admin/users/reject/:id - Reject pending user
  app.post('/api/admin/users/reject/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const { sendRejectionEmail } = await import('./email');

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'approve');

      const { id } = req.params;
      const { reason } = req.body;

      const targetUser = await storage.getUser(id);
      
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Supervisor can only reject users in their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId || currentUser.branchId !== targetUser.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin kullanıcılarını reddedebilirsiniz" });
        }
      }

      if (targetUser.accountStatus !== 'pending') {
        return res.status(400).json({ message: "Kullanıcı zaten onaylanmış veya reddedilmiş" });
      }

      // Update user: rejected
      const updated = await storage.updateUser(id, {
        accountStatus: 'rejected',
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      });

      if (!updated) {
        return res.status(500).json({ message: "Red işlemi başarısız" });
      }

      // Send rejection email
      if (targetUser.email) {
        await sendRejectionEmail(targetUser.email, reason);
      }

      res.json({ message: "Kullanıcı reddedildi" });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Red işlemi sırasında hata oluştu" });
    }
  });

  // GET /api/admin/users/pending - Get pending approval users
  app.get('/api/admin/users/pending', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'view');

      let filters: any = { accountStatus: 'pending' };

      // Supervisor can only see their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        filters.branchId = currentUser.branchId;
      }

      const pendingUsers = await storage.getAllUsersWithFilters(filters);
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Bekleyen kullanıcılar yüklenemedi" });
    }
  });

  // GET /api/admin/users/export - Export users to CSV
  app.get('/api/admin/users/export', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { role, branchId, search, accountStatus } = req.query;
      const filters = {
        role: role as string | undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        search: search as string | undefined,
        accountStatus: accountStatus as string | undefined,
      };

      const allUsers = await storage.getAllUsersWithFilters(filters);

      // Convert to CSV
      const headers = ['ID', 'İsim', 'Soyisim', 'Email', 'Kullanıcı Adı', 'Rol', 'Şube ID', 'Durum', 'Aktif', 'Kayıt Tarihi'];
      const rows = allUsers.map(u => [
        u.id,
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.username || '',
        u.role,
        u.branchId || '',
        u.accountStatus || 'approved',
        u.isActive ? 'Evet' : 'Hayır',
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '',
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`);
      res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Export başarısız" });
    }
  });

  // DELETE /api/admin/users/:id - Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;

      // Prevent self-deletion
      if (id === user.id) {
        return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz" });
      }

      await storage.deleteUser(id);
      res.json({ message: "Kullanıcı silindi" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Kullanıcı silinemedi" });
    }
  });

  // POST /api/admin/users - Create new user
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const createSchema = z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6),
        role: z.string(),
        branchId: z.number().nullable().optional(),
      });

      const data = createSchema.parse(req.body);

      // Check if email or username exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Bu email zaten kayıtlı" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const newUser = await storage.createUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        hashedPassword,
        role: data.role,
        branchId: data.branchId || null,
        accountStatus: 'approved', // Admin-created users are auto-approved
        isActive: true,
      });

      res.json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcı oluşturulamadı" });
    }
  });

  // ========================================
  // QUALITY AUDITS API (Kalite Denetimi)
  // ========================================

  // GET /api/quality-audits - List quality audits
  app.get('/api/quality-audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(qualityAudits);
      
      // Branch users can only see their own branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(qualityAudits.branchId, user.branchId));
      } else if (branchId) {
        // HQ users can filter by branch
        query = query.where(eq(qualityAudits.branchId, parseInt(branchId as string)));
      }

      const audits = await query.orderBy(desc(qualityAudits.auditDate));
      res.json(audits);
    } catch (error) {
      console.error("Error fetching quality audits:", error);
      res.status(500).json({ message: "Denetimler yüklenirken hata oluştu" });
    }
  });

  // POST /api/quality-audits - Create quality audit
  app.post('/api/quality-audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ coach/admin can create audits
      if (!isHQRole(user.role as UserRoleType) || (user.role !== 'coach' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Sadece coach veya admin denetim oluşturabilir" });
      }

      const validatedData = insertQualityAuditSchema.parse(req.body);
      const [audit] = await db.insert(qualityAudits).values({
        ...validatedData,
        auditorId: user.id,
      }).returning();

      res.status(201).json(audit);
    } catch (error: any) {
      console.error("Error creating quality audit:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim oluşturulurken hata oluştu" });
    }
  });

  // ========================================
  // GUEST FEEDBACK API (Misafir Geri Bildirimi)
  // ========================================

  // GET /api/customer-feedback - List customer feedback
  app.get('/api/customer-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(customerFeedback);
      
      // Branch users can only see their own branch feedback
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(customerFeedback.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(customerFeedback.branchId, parseInt(branchId as string)));
      }

      const feedback = await query.orderBy(desc(customerFeedback.feedbackDate));
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching customer feedback:", error);
      res.status(500).json({ message: "Geri bildirimler yüklenirken hata oluştu" });
    }
  });

  // POST /api/customer-feedback/public - Public endpoint for customer feedback (no auth)
  app.post('/api/customer-feedback/public', async (req, res) => {
    try {
      const validatedData = insertCustomerFeedbackSchema.parse(req.body);
      
      // Validate branch exists
      const branch = await db.select().from(branches).where(eq(branches.id, validatedData.branchId)).limit(1);
      if (!branch || branch.length === 0) {
        return res.status(400).json({ message: "Geçersiz şube ID. Lütfen geçerli bir şube numarası girin." });
      }
      
      const [feedback] = await db.insert(customerFeedback).values(validatedData).returning();
      res.status(201).json({ message: "Geri bildiriminiz için teşekkürler!", id: feedback.id });
    } catch (error: any) {
      console.error("Error creating customer feedback:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Geri bildirim kaydedilirken hata oluştu" });
    }
  });

  // PATCH /api/customer-feedback/:id/review - Mark feedback as reviewed
  app.patch('/api/customer-feedback/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const [updated] = await db.update(customerFeedback)
        .set({
          status: 'reviewed',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes,
        })
        .where(eq(customerFeedback.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Geri bildirim bulunamadı" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error reviewing feedback:", error);
      res.status(500).json({ message: "Geri bildirim güncellenirken hata oluştu" });
    }
  });

  // GET /api/customer-feedback/stats/:branchId - Get branch feedback statistics
  app.get('/api/customer-feedback/stats/:branchId', isAuthenticated, async (req: any, res) => {
    try {
      const { branchId } = req.params;
      
      const stats = await db.select({
        avgRating: sql<number>`AVG(${customerFeedback.rating})`,
        totalCount: sql<number>`COUNT(*)`,
        rating5: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 5)`,
        rating4: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 4)`,
        rating3: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 3)`,
        rating2: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 2)`,
        rating1: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 1)`,
      })
      .from(customerFeedback)
      .where(eq(customerFeedback.branchId, parseInt(branchId)));

      res.json(stats[0] || { avgRating: 0, totalCount: 0, rating5: 0, rating4: 0, rating3: 0, rating2: 0, rating1: 0 });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // MAINTENANCE SCHEDULES API (Proaktif Bakım)
  // ========================================

  // GET /api/maintenance-schedules - List maintenance schedules
  app.get('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentId } = req.query;

      let query = db.select().from(maintenanceSchedules).where(eq(maintenanceSchedules.isActive, true));
      
      if (equipmentId) {
        query = query.where(eq(maintenanceSchedules.equipmentId, parseInt(equipmentId as string)));
      }

      const schedules = await query.orderBy(maintenanceSchedules.nextMaintenanceDate);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching maintenance schedules:", error);
      res.status(500).json({ message: "Bakım planları yüklenirken hata oluştu" });
    }
  });

  // POST /api/maintenance-schedules - Create maintenance schedule
  app.post('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ teknik/admin can create schedules
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const [schedule] = await db.insert(maintenanceSchedules).values(validatedData).returning();

      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("Error creating maintenance schedule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım planı oluşturulurken hata oluştu" });
    }
  });

  // GET /api/maintenance-logs - List maintenance logs
  app.get('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentId } = req.query;

      let query = db.select().from(maintenanceLogs);
      
      if (equipmentId) {
        query = query.where(eq(maintenanceLogs.equipmentId, parseInt(equipmentId as string)));
      }

      const logs = await query.orderBy(desc(maintenanceLogs.performedDate));
      res.json(logs);
    } catch (error) {
      console.error("Error fetching maintenance logs:", error);
      res.status(500).json({ message: "Bakım geçmişi yüklenirken hata oluştu" });
    }
  });

  // POST /api/maintenance-logs - Create maintenance log
  app.post('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertMaintenanceLogSchema.parse(req.body);
      const [log] = await db.insert(maintenanceLogs).values({
        ...validatedData,
        performedById: user.id,
      }).returning();

      res.status(201).json(log);
    } catch (error: any) {
      console.error("Error creating maintenance log:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım kaydı oluşturulurken hata oluştu" });
    }
  });

  // ========================================
  // CAMPAIGNS API (Kampanya Yönetimi)
  // ========================================

  // GET /api/campaigns - List campaigns
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status, branchId } = req.query;

      let query = db.select().from(campaigns);
      
      if (status) {
        query = query.where(eq(campaigns.status, status as string));
      }

      let allCampaigns = await query.orderBy(desc(campaigns.startDate));

      // If branch user or branchId filter, get only campaigns for that branch
      if (isBranchRole(user.role as UserRoleType) && user.branchId) {
        const branchCampaigns = await db.select({ campaignId: campaignBranches.campaignId })
          .from(campaignBranches)
          .where(eq(campaignBranches.branchId, user.branchId));
        
        const campaignIds = branchCampaigns.map(bc => bc.campaignId);
        allCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
      } else if (branchId) {
        const branchCampaigns = await db.select({ campaignId: campaignBranches.campaignId })
          .from(campaignBranches)
          .where(eq(campaignBranches.branchId, parseInt(branchId as string)));
        
        const campaignIds = branchCampaigns.map(bc => bc.campaignId);
        allCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
      }

      res.json(allCampaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Kampanyalar yüklenirken hata oluştu" });
    }
  });

  // POST /api/campaigns - Create campaign
  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ users can create campaigns
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertCampaignSchema.parse(req.body);
      const [campaign] = await db.insert(campaigns).values({
        ...validatedData,
        createdById: user.id,
      }).returning();

      res.status(201).json(campaign);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kampanya oluşturulurken hata oluştu" });
    }
  });

  // POST /api/campaigns/:id/branches - Add branches to campaign
  app.post('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      const { branchIds } = req.body;

      if (!Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({ message: "Şube listesi gerekli" });
      }

      const values = branchIds.map(branchId => ({
        campaignId: parseInt(id),
        branchId,
      }));

      await db.insert(campaignBranches).values(values).onConflictDoNothing();

      res.json({ message: "Şubeler kampanyaya eklendi" });
    } catch (error) {
      console.error("Error adding branches to campaign:", error);
      res.status(500).json({ message: "Şubeler eklenirken hata oluştu" });
    }
  });

  // GET /api/campaigns/:id/branches - Get campaign branches
  app.get('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const branches = await db.select()
        .from(campaignBranches)
        .where(eq(campaignBranches.campaignId, parseInt(id)));

      res.json(branches);
    } catch (error) {
      console.error("Error fetching campaign branches:", error);
      res.status(500).json({ message: "Şubeler yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // FRANCHISE ONBOARDING API (Franchise Açılış)
  // ========================================

  // GET /api/franchise-onboarding - List onboarding processes
  app.get('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ can see all, branch users see their own
      let query = db.select().from(franchiseOnboarding);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(franchiseOnboarding.branchId, user.branchId));
      }

      const processes = await query.orderBy(desc(franchiseOnboarding.expectedOpeningDate));
      res.json(processes);
    } catch (error) {
      console.error("Error fetching onboarding processes:", error);
      res.status(500).json({ message: "Açılış süreçleri yüklenirken hata oluştu" });
    }
  });

  // POST /api/franchise-onboarding - Create onboarding process
  app.post('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertFranchiseOnboardingSchema.parse(req.body);
      const [process] = await db.insert(franchiseOnboarding).values(validatedData).returning();

      res.status(201).json(process);
    } catch (error: any) {
      console.error("Error creating onboarding process:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Açılış süreci oluşturulurken hata oluştu" });
    }
  });

  // GET /api/franchise-onboarding/:id/documents - Get onboarding documents
  app.get('/api/franchise-onboarding/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const documents = await db.select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.onboardingId, parseInt(id)));

      res.json(documents);
    } catch (error) {
      console.error("Error fetching onboarding documents:", error);
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  // POST /api/onboarding-documents - Upload onboarding document
  app.post('/api/onboarding-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertOnboardingDocumentSchema.parse(req.body);
      const [document] = await db.insert(onboardingDocuments).values({
        ...validatedData,
        uploadedById: user.id,
        uploadedAt: new Date(),
      }).returning();

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading onboarding document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Belge yüklenirken hata oluştu" });
    }
  });

  // GET /api/license-renewals - List license renewals
  app.get('/api/license-renewals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(licenseRenewals);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(licenseRenewals.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(licenseRenewals.branchId, parseInt(branchId as string)));
      }

      const renewals = await query.orderBy(licenseRenewals.expiryDate);
      res.json(renewals);
    } catch (error) {
      console.error("Error fetching license renewals:", error);
      res.status(500).json({ message: "Lisanslar yüklenirken hata oluştu" });
    }
  });

  // POST /api/license-renewals - Create license renewal
  app.post('/api/license-renewals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertLicenseRenewalSchema.parse(req.body);
      const [renewal] = await db.insert(licenseRenewals).values(validatedData).returning();

      res.status(201).json(renewal);
    } catch (error: any) {
      console.error("Error creating license renewal:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Lisans oluşturulurken hata oluştu" });
    }
  });

  // ===== SITE SETTINGS ROUTES =====
  
  // GET /api/admin/settings - Get all settings (category filter optional)
  app.get('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { category } = req.query;
      const settings = await storage.getSiteSettings(category as string | undefined);
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Ayarlar yüklenirken hata oluştu" });
    }
  });

  // GET /api/admin/settings/:key - Get single setting
  app.get('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      const setting = await storage.getSiteSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Ayar bulunamadı" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching site setting:", error);
      res.status(500).json({ message: "Ayar yüklenirken hata oluştu" });
    }
  });

  // POST /api/admin/settings - Create new setting
  app.post('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const validatedData = insertSiteSettingSchema.parse({
        ...req.body,
        updatedBy: user.id,
      });
      
      const setting = await storage.createSiteSetting(validatedData);
      
      res.status(201).json(setting);
    } catch (error: any) {
      console.error("Error creating site setting:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Ayar oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/admin/settings/:key - Update setting
  app.patch('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Değer gerekli" });
      }
      
      const setting = await storage.updateSiteSetting(key, value, user.id);
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating site setting:", error);
      res.status(500).json({ message: "Ayar güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/admin/settings/:key - Delete setting
  app.delete('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      await storage.deleteSiteSetting(key);
      
      res.json({ message: "Ayar silindi" });
    } catch (error) {
      console.error("Error deleting site setting:", error);
      res.status(500).json({ message: "Ayar silinirken hata oluştu" });
    }
  });

  // ===== ROLE PERMISSIONS ROUTES =====
  
  // GET /api/admin/role-permissions - Get all role permissions and modules
  app.get('/api/admin/role-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      // Fetch both permissions and modules from database
      const [permissions, modules] = await Promise.all([
        storage.getRolePermissions(),
        storage.getPermissionModules(),
      ]);
      
      res.json({
        permissions,
        modules,
      });
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Rol yetkileri yüklenirken hata oluştu" });
    }
  });

  // PUT /api/admin/role-permissions - Bulk update role permissions
  app.put('/api/admin/role-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      // Validate request body is an array of role permission updates
      const updatesSchema = z.array(z.object({
        role: z.string(),
        module: z.string(),
        actions: z.array(z.string()),
      }));

      const updates = updatesSchema.parse(req.body);
      
      await storage.bulkUpdateRolePermissions(updates);
      
      res.json({ message: "Rol yetkileri güncellendi" });
    } catch (error: any) {
      console.error("Error updating role permissions:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Rol yetkileri güncellenirken hata oluştu" });
    }
  });

  app.get('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      ensurePermission(user, 'overtime', 'view', 'Mesai taleplerini görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const userId = isBranchStaff ? user.id : undefined;
      const requests = await storage.getOvertimeRequests(userId, status);
      
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching overtime requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  app.post('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'overtime', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validatedData = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
        status: "pending",
      });
      
      const request = await storage.createOvertimeRequest(validatedData);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'overtime', 'approve', 'Mesai talebi onaylamak için supervisor+ yetkisi gerekli');
      
      const updateSchema = z.object({
        status: z.enum(['approved', 'rejected']),
        approvedMinutes: z.number().min(0).optional(),
        rejectionReason: z.string().optional(),
      });
      
      const { status, approvedMinutes, rejectionReason } = updateSchema.parse(req.body);
      
      if (status === 'approved' && !approvedMinutes) {
        return res.status(400).json({ message: "Onaylanan mesai süresi gerekli" });
      }
      
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ message: "Red nedeni gerekli" });
      }
      
      const updates = {
        status,
        approverId: user.id,
        approvedMinutes,
        rejectionReason,
      };
      
      const updated = await storage.updateOvertimeRequest(parseInt(id), updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Mesai talebi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi güncellenirken hata oluştu" });
    }
  });

  // ========================================
  // PERFORMANCE SCORES - Performans Skorları
  // ========================================

  // POST /api/performance/calculate - Calculate daily performance score
  app.post('/api/performance/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId, branchId, date } = req.body;

      // Validate input
      if (!userId || !branchId || !date) {
        return res.status(400).json({ message: "userId, branchId ve date alanları gerekli" });
      }

      // Permission check: users can calculate their own scores, supervisors/HQ can calculate for others
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'edit', 'Başkasının performans skorunu hesaplamak için yetkiniz yok');
      }

      const score = await storage.calculateAndSaveDailyPerformanceScore(userId, branchId, date);
      res.json(score);
    } catch (error: any) {
      console.error("Error calculating performance score:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skoru hesaplanırken hata oluştu" });
    }
  });

  // GET /api/performance/team - Get team performance aggregates (supervisor only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  app.get('/api/performance/team', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only branch roles (supervisor, branch_manager) can view team performance
      if (!isBranchRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Takım performansını görüntülemek için branch yetkiniz yok' });
      }
      
      if (!user.branchId) {
        return res.status(400).json({ message: 'Branch ID bulunamadı' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Takım performansını görüntülemek için yetkiniz yok');
      
      res.setHeader('Cache-Control', 'no-store');
      const teamPerformance = await storage.getTeamPerformanceAggregates(user.branchId);
      res.json(teamPerformance);
    } catch (error: any) {
      console.error("Error fetching team performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Takım performansı yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches/composite - Get composite branch scores (HQ only)
  // NOTE: Must come BEFORE /api/performance/branches to avoid route matching issues
  app.get('/api/performance/branches/composite', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ roles can view all branches composite scores
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Tüm branch skorlarını görüntülemek için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch skorlarını görüntülemek için yetkiniz yok');
      
      const timeRange = (req.query.timeRange as '7d' | '30d' | '180d' | '365d') || '30d';
      
      res.setHeader('Cache-Control', 'no-store');
      const compositeScores = await storage.getCompositeBranchScores(timeRange);
      res.json(compositeScores);
    } catch (error: any) {
      console.error("Error fetching composite branch scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches - Get all branches performance aggregates (HQ only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  app.get('/api/performance/branches', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ roles can view all branches performance
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Tüm branch performanslarını görüntülemek için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch performanslarını görüntülemek için yetkiniz yok');
      
      res.setHeader('Cache-Control', 'no-store');
      const branchesPerformance = await storage.getAllBranchesPerformanceAggregates();
      res.json(branchesPerformance);
    } catch (error: any) {
      console.error("Error fetching branches performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch performansları yüklenirken hata oluştu" });
    }
  });

  // POST /api/performance/branches/:branchId/evaluation - Generate AI evaluation for branch performance (HQ only)
  app.post('/api/performance/branches/:branchId/evaluation', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.params;
      
      // Only HQ roles can generate evaluations
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Branch değerlendirmesi oluşturmak için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch performansını değerlendirmek için yetkiniz yok');
      
      // Get branch performance data
      const branchPerformance = await storage.getAllBranchesPerformanceAggregates();
      const targetBranch = branchPerformance.find(b => b.branchId === parseInt(branchId));
      
      if (!targetBranch) {
        return res.status(404).json({ message: 'Branch performans verisi bulunamadı' });
      }
      
      // Generate AI evaluation
      const evaluation = await evaluateBranchPerformance(
        targetBranch.branchName,
        {
          avgAttendanceScore: targetBranch.avgAttendanceScore,
          avgLatenessScore: targetBranch.avgLatenessScore,
          avgEarlyLeaveScore: targetBranch.avgEarlyLeaveScore,
          avgBreakComplianceScore: targetBranch.avgBreakComplianceScore,
          avgShiftComplianceScore: targetBranch.avgShiftComplianceScore,
          avgOvertimeComplianceScore: targetBranch.avgOvertimeComplianceScore,
          avgDailyTotalScore: targetBranch.avgDailyTotalScore,
          totalPenaltyMinutes: targetBranch.totalPenaltyMinutes,
          totalEmployees: targetBranch.totalEmployees,
          dateRange: `${targetBranch.startDate} - ${targetBranch.endDate}`,
        },
        user.id
      );
      
      res.json(evaluation);
    } catch (error: any) {
      console.error("Error generating branch evaluation:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "AI değerlendirmesi oluşturulurken hata oluştu" });
    }
  });

  // GET /api/performance/:userId - Get performance scores for a user
  app.get('/api/performance/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // Permission check: users can view their own scores, supervisors/HQ can view others'
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'view', 'Başkasının performans skorunu görüntülemek için yetkiniz yok');
      }

      res.setHeader('Cache-Control', 'no-store');
      const scores = await storage.getPerformanceScores(userId, startDate as string, endDate as string);
      res.json(scores);
    } catch (error: any) {
      console.error("Error fetching performance scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/:userId/week/:week - Get weekly performance summary
  app.get('/api/performance/:userId/week/:week', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId, week } = req.params;

      // Permission check
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'view', 'Başkasının haftalık performansını görüntülemek için yetkiniz yok');
      }

      const summary = await storage.getWeeklyPerformanceSummary(userId, week);
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching weekly performance summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Haftalık performans özeti yüklenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status, priority } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayetleri görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const branchId = isBranchStaff ? user.branchId : undefined;
      const complaints = await storage.getGuestComplaints(branchId, status, priority);
      
      res.json(complaints);
    } catch (error: any) {
      console.error("Error fetching guest complaints:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Şikayetler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const complaintData = {
        ...req.body,
        branchId: req.body.branchId || user.branchId,
      };
      
      if (!complaintData.branchId) {
        return res.status(400).json({ message: "Şube bilgisi gerekli" });
      }
      
      const validatedData = insertGuestComplaintSchema.parse(complaintData);
      
      const complaint = await storage.createGuestComplaint(validatedData);
      res.status(201).json(complaint);
    } catch (error: any) {
      console.error("Error creating guest complaint:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/guest-complaints/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'complaints', 'edit', 'Şikayet güncellemek için yetkiniz yok');
      
      const updateSchema = insertGuestComplaintSchema.partial().omit({
        branchId: true,
        complaintDate: true,
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateGuestComplaint(parseInt(id), validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Şikayet bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating guest complaint:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet güncellenirken hata oluştu" });
    }
  });

  app.post('/api/guest-complaints/:id/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'complaints', 'edit', 'Şikayet çözümlemek için yetkiniz yok');
      
      const resolveSchema = z.object({
        resolutionNotes: z.string().min(1, "Çözüm notu gerekli"),
        customerSatisfaction: z.number().min(1).max(5).optional(),
      });
      
      const { resolutionNotes, customerSatisfaction } = resolveSchema.parse(req.body);
      
      const resolved = await storage.resolveGuestComplaint(
        parseInt(id),
        user.id,
        resolutionNotes,
        customerSatisfaction
      );
      
      if (!resolved) {
        return res.status(404).json({ message: "Şikayet bulunamadı" });
      }
      
      res.json(resolved);
    } catch (error: any) {
      console.error("Error resolving guest complaint:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet çözümlenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { startDate, endDate, branchId } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayet istatistiklerini görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const filterBranchId = isBranchStaff 
        ? user.branchId 
        : (branchId ? parseInt(branchId as string) : undefined);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getGuestComplaintStats(filterBranchId, start, end);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching complaint stats:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints/heatmap', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { startDate, endDate, branchId } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayet heatmap görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const filterBranchId = isBranchStaff 
        ? user.branchId 
        : (branchId ? parseInt(branchId as string) : undefined);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const heatmap = await storage.getGuestComplaintHeatmap(filterBranchId, start, end);
      res.json(heatmap);
    } catch (error: any) {
      console.error("Error fetching complaint heatmap:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Heatmap yüklenirken hata oluştu" });
    }
  });

  app.get('/api/equipment-troubleshooting-steps', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { equipmentType } = req.query;
      
      ensurePermission(user, 'equipment', 'view', 'Sorun giderme adımlarını görüntülemek için yetkiniz yok');
      
      // DESIGN: Troubleshooting steps are INTENTIONALLY global (no branch filtering)
      // Rationale: These are standardized equipment repair playbooks shared across all branches
      // for consistency in repair procedures. Similar to Knowledge Base articles, they're
      // knowledge content, not sensitive operational data. Branch-scoping would fragment
      // knowledge sharing and prevent consistent equipment maintenance across franchises.
      
      if (!equipmentType) {
        return res.status(400).json({ message: "Cihaz tipi gerekli" });
      }
      
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType as string);
      res.json(steps);
    } catch (error: any) {
      console.error("Error fetching troubleshooting steps:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  app.post('/api/equipment-troubleshooting-steps', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // CRITICAL: Only HQ/admin roles can create troubleshooting steps
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ/admin kullanıcıları sorun giderme adımı oluşturabilir' });
      }
      
      ensurePermission(user, 'equipment', 'create', 'Sorun giderme adımı oluşturmak için HQ Tech yetkisi gerekli');
      
      const validatedData = insertEquipmentTroubleshootingStepSchema.parse(req.body);
      
      const step = await storage.createEquipmentTroubleshootingStep(validatedData);
      res.status(201).json(step);
    } catch (error: any) {
      console.error("Error creating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'edit', 'Sorun giderme adımı güncellemek için HQ Tech yetkisi gerekli');
      
      const updateSchema = insertEquipmentTroubleshootingStepSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateEquipmentTroubleshootingStep(parseInt(id), validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Adım bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'delete', 'Sorun giderme adımı silmek için HQ Tech yetkisi gerekli');
      
      await storage.deleteEquipmentTroubleshootingStep(parseInt(id));
      res.json({ message: "Adım silindi" });
    } catch (error: any) {
      console.error("Error deleting troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımı silinirken hata oluştu" });
    }
  });

  // ===============================================
  // AUDIT TEMPLATE ROUTES
  // ===============================================

  app.get('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { auditType, category, isActive } = req.query;
      
      // Only HQ and branch supervisors can view templates
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Denetim şablonlarını görüntülemek için supervisor veya HQ yetkisi gerekli' });
      }
      
      const templates = await storage.getAuditTemplates(
        auditType as string,
        category as string,
        isActive ? isActive === 'true' : undefined
      );
      
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching audit templates:", error);
      res.status(500).json({ message: "Denetim şablonları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ and branch supervisors can view template details
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Denetim şablonlarını görüntülemek için supervisor veya HQ yetkisi gerekli' });
      }
      
      const template = await storage.getAuditTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ message: "Denetim şablonu bulunamadı" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error("Error fetching audit template:", error);
      res.status(500).json({ message: "Denetim şablonu yüklenirken hata oluştu" });
    }
  });

  app.post('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ users can create templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonu oluşturabilir' });
      }
      
      const { template, items } = req.body;
      
      const validatedTemplate = insertAuditTemplateSchema.parse({
        ...template,
        createdById: user.id,
      });
      
      // Validate items - storage layer expects items without templateId
      const itemSchema = insertAuditTemplateItemSchema.omit({ templateId: true }).superRefine((data, ctx) => {
        // Conditional validation for multiple_choice type
        if (data.itemType === 'multiple_choice') {
          // Filter out empty/whitespace-only options
          const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
          
          if (validOptions.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
              path: ['options'],
            });
          }
          
          // Check each option is non-empty
          if (data.options) {
            data.options.forEach((opt, idx) => {
              if (!opt || opt.trim() === '') {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Şık ${idx + 1} boş olamaz`,
                  path: ['options', idx],
                });
              }
            });
          }
          
          if (!data.correctAnswer || data.correctAnswer.trim() === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Doğru cevap gerekli",
              path: ['correctAnswer'],
            });
          }
          
          if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Doğru cevap şıklardan biri olmalı",
              path: ['correctAnswer'],
            });
          }
        }
      });
      const validatedItems = items.map((item: any) =>
        itemSchema.parse(item)
      ) as Omit<InsertAuditTemplateItem, 'templateId'>[];
      
      const newTemplate = await storage.createAuditTemplate(validatedTemplate, validatedItems);
      res.status(201).json(newTemplate);
    } catch (error: any) {
      console.error("Error creating audit template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim şablonu oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ users can update templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonunu güncelleyebilir' });
      }
      
      const { template, items } = req.body;
      
      const updateSchema = insertAuditTemplateSchema.partial().omit({ createdById: true });
      const validatedTemplate = updateSchema.parse(template);
      
      let validatedItems:Omit<InsertAuditTemplateItem, 'templateId'>[] | undefined = undefined;
      if (items) {
        // Validate items - storage layer expects items without templateId
        const itemSchema = insertAuditTemplateItemSchema.omit({ templateId: true }).superRefine((data, ctx) => {
          // Conditional validation for multiple_choice type
          if (data.itemType === 'multiple_choice') {
            // Filter out empty/whitespace-only options
            const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
            
            if (validOptions.length < 2) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
                path: ['options'],
              });
            }
            
            // Check each option is non-empty
            if (data.options) {
              data.options.forEach((opt, idx) => {
                if (!opt || opt.trim() === '') {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Şık ${idx + 1} boş olamaz`,
                    path: ['options', idx],
                  });
                }
              });
            }
            
            if (!data.correctAnswer || data.correctAnswer.trim() === '') {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap gerekli",
                path: ['correctAnswer'],
              });
            }
            
            if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap şıklardan biri olmalı",
                path: ['correctAnswer'],
              });
            }
          }
        });
        validatedItems = items.map((item: any) =>
          itemSchema.parse(item)
        ) as Omit<InsertAuditTemplateItem, 'templateId'>[];
      }
      
      const updated = await storage.updateAuditTemplate(parseInt(id), validatedTemplate, validatedItems);
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim şablonu bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating audit template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim şablonu güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ users can delete templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonunu silebilir' });
      }
      
      await storage.deleteAuditTemplate(parseInt(id));
      res.json({ message: "Denetim şablonu silindi" });
    } catch (error: any) {
      console.error("Error deleting audit template:", error);
      res.status(500).json({ message: "Denetim şablonu silinirken hata oluştu" });
    }
  });

  // ===============================================
  // AUDIT INSTANCE ROUTES
  // ===============================================

  app.get('/api/audit-instances', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId, userId, auditorId, status, auditType } = req.query;
      
      const filters: any = {
        status: status as string,
        auditType: auditType as string,
      };
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (user.branchId) {
          filters.branchId = user.branchId;
        }
      } else if (isHQRole(user.role as UserRoleType)) {
        // HQ can filter by any branch
        if (branchId) {
          filters.branchId = parseInt(branchId as string);
        }
        if (userId) {
          filters.userId = userId as string;
        }
        if (auditorId) {
          filters.auditorId = auditorId as string;
        }
      } else {
        return res.status(403).json({ message: 'Denetim kayıtlarını görüntülemek için yetkiniz yok' });
      }
      
      const instances = await storage.getAuditInstances(filters);
      res.json(instances);
    } catch (error: any) {
      console.error("Error fetching audit instances:", error);
      res.status(500).json({ message: "Denetim kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/audit-instances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      const instance = await storage.getAuditInstance(parseInt(id));
      
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (instance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Bu denetim kaydına erişim yetkiniz yok' });
        }
      }
      
      res.json(instance);
    } catch (error: any) {
      console.error("Error fetching audit instance:", error);
      res.status(500).json({ message: "Denetim kaydı yüklenirken hata oluştu" });
    }
  });

  app.post('/api/audit-instances', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // HQ can create any audit, branch supervisor can create branch audits
      const validatedInstance = insertAuditInstanceSchema.parse({
        ...req.body,
        auditorId: user.id,
      });
      
      // If branch user, ensure they can only audit their branch
      if (isBranchRole(user.role as UserRoleType)) {
        if (validatedInstance.branchId && validatedInstance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Sadece kendi şubeniz için denetim başlatabilirsiniz' });
        }
      }
      
      const newInstance = await storage.createAuditInstance(validatedInstance);
      res.status(201).json(newInstance);
    } catch (error: any) {
      console.error("Error creating audit instance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim başlatılırken hata oluştu" });
    }
  });

  app.patch('/api/audit-instances/:instanceId/items/:templateItemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { instanceId, templateItemId } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(instanceId));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can update items
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ güncelleyebilir' });
      }
      
      // Block updates on completed audits (409 Conflict)
      if (instance.status !== 'in_progress') {
        return res.status(409).json({ 
          message: "Tamamlanmış denetimler güncellenemez",
          status: instance.status 
        });
      }
      
      const updateSchema = insertAuditInstanceItemSchema.partial().omit({ 
        instanceId: true,
        templateItemId: true 
      });
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateAuditInstanceItem(
        parseInt(instanceId),
        parseInt(templateItemId),
        validatedData
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim maddesi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating audit instance item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim maddesi güncellenirken hata oluştu" });
    }
  });

  app.post('/api/audit-instances/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { notes, actionItems, followUpRequired, followUpDate } = req.body;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can complete
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ tamamlayabilir' });
      }
      
      const completed = await storage.completeAuditInstance(
        parseInt(id),
        notes,
        actionItems,
        followUpRequired,
        followUpDate
      );
      
      if (!completed) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      res.json(completed);
    } catch (error: any) {
      console.error("Error completing audit instance:", error);
      res.status(500).json({ message: "Denetim tamamlanırken hata oluştu" });
    }
  });

  app.post('/api/audit-instances/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can cancel
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ iptal edebilir' });
      }
      
      const cancelled = await storage.cancelAuditInstance(parseInt(id));
      
      if (!cancelled) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      res.json(cancelled);
    } catch (error: any) {
      console.error("Error cancelling audit instance:", error);
      res.status(500).json({ message: "Denetim iptal edilirken hata oluştu" });
    }
  });

  app.get('/api/attendance-penalties/:shiftAttendanceId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { shiftAttendanceId } = req.params;
      
      ensurePermission(user, 'attendance', 'view', 'Penaltıları görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff) {
        const attendance = await storage.getShiftAttendanceById(parseInt(shiftAttendanceId));
        if (!attendance) {
          return res.status(404).json({ message: "Vardiya kaydı bulunamadı" });
        }
        const attendanceUser = await storage.getUserById(attendance.userId);
        if (attendanceUser?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin verilerini görüntüleyebilirsiniz" });
        }
      }
      
      const penalties = await storage.getAttendancePenalties(parseInt(shiftAttendanceId));
      res.json(penalties);
    } catch (error: any) {
      console.error("Error fetching attendance penalties:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Penaltılar yüklenirken hata oluştu" });
    }
  });

  app.post('/api/attendance-penalties', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'edit', 'Manuel penaltı oluşturmak için supervisor+ yetkisi gerekli');
      
      const validatedData = insertAttendancePenaltySchema.parse({
        ...req.body,
        createdById: user.id,
        autoGenerated: false,
      });
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff) {
        const attendance = await storage.getShiftAttendanceById(validatedData.shiftAttendanceId);
        if (!attendance) {
          return res.status(404).json({ message: "Vardiya kaydı bulunamadı" });
        }
        const attendanceUser = await storage.getUserById(attendance.userId);
        if (attendanceUser?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin çalışanlarına penaltı ekleyebilirsiniz" });
        }
      }
      
      const penalty = await storage.createManualPenalty(validatedData);
      res.status(201).json(penalty);
    } catch (error: any) {
      console.error("Error creating manual penalty:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Manuel penaltı oluşturulurken hata oluştu" });
    }
  });

  app.get('/api/monthly-attendance-summary/:userId/:periodMonth', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId, periodMonth } = req.params;
      
      ensurePermission(user, 'attendance', 'view', 'Aylık özeti görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff && userId !== user.id) {
        return res.status(403).json({ message: "Sadece kendi özetinizi görüntüleyebilirsiniz" });
      }
      
      const summary = await storage.getMonthlyAttendanceSummary(userId, periodMonth);
      res.json(summary || null);
    } catch (error: any) {
      console.error("Error fetching monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Aylık özet yüklenirken hata oluştu" });
    }
  });

  app.post('/api/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'view', 'Aylık özet oluşturmak için yetkiniz yok');
      
      const generateSchema = z.object({
        userId: z.string().min(1, "Kullanıcı ID gerekli"),
        periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Geçerli ay formatı: YYYY-MM"),
      });
      
      const { userId, periodMonth } = generateSchema.parse(req.body);
      
      const summary = await storage.generateMonthlyAttendanceSummary(userId, periodMonth);
      res.status(201).json(summary);
    } catch (error: any) {
      console.error("Error generating monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Aylık özet oluşturulurken hata oluştu" });
    }
  });

  // ========================================
  // OVERTIME REQUESTS - Mesai Talepleri
  // ========================================

  app.get('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      ensurePermission(user, 'attendance', 'view', 'Mesai taleplerini görüntülemek için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role as any);
      
      let requests = await storage.getOvertimeRequests(user.id, canApprove);
      
      if (status && status !== 'all') {
        requests = requests.filter((r: any) => r.status === status);
      }
      
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching overtime requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  app.post('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validated = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const request = await storage.createOvertimeRequest(validated);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);
      const { approvedMinutes } = req.body;
      
      ensurePermission(user, 'attendance', 'edit', 'Mesai taleplerini onaylamak için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role as any);
      if (!canApprove) {
        return res.status(403).json({ message: "Sadece yöneticiler mesai taleplerini onaylayabilir" });
      }
      
      const updated = await storage.approveOvertimeRequest(requestId, user.id, approvedMinutes);
      res.json(updated);
    } catch (error: any) {
      console.error("Error approving overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi onaylanırken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      ensurePermission(user, 'attendance', 'edit', 'Mesai taleplerini reddetmek için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role as any);
      if (!canApprove) {
        return res.status(403).json({ message: "Sadece yöneticiler mesai taleplerini reddedebilir" });
      }
      
      const updated = await storage.rejectOvertimeRequest(requestId, rejectionReason);
      res.json(updated);
    } catch (error: any) {
      console.error("Error rejecting overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi reddedilirken hata oluştu" });
    }
  });

  app.get('/api/shift-attendances/my-recent', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const attendances = await storage.getRecentShiftAttendances(user.id, 30);
      res.json(attendances);
    } catch (error) {
      console.error("Error fetching recent shift attendances:", error);
      res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
    }
  });

  app.post('/api/sla/check-breaches', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!['admin', 'hq_admin', 'hq_staff'].includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await storage.checkSLABreaches();
      res.json({ message: "SLA kontrolleri tamamlandı" });
    } catch (error) {
      console.error("Error checking SLA breaches:", error);
      res.status(500).json({ message: "SLA kontrolleri yapılırken hata oluştu" });
    }
  });

  // ========================
  // HR MANAGEMENT ENDPOINTS
  // ========================

  // Employee Documents (Özlük Dosyası)
  // Get all employee documents (latest 20, with branch restrictions for branch users)
  app.get('/api/employee-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;
      
      ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
      
      // Get all employees
      const allEmployees = await storage.getUsers();
      let documentsToReturn: any[] = [];
      
      // Collect all documents from all employees
      for (const employee of allEmployees) {
        // Branch users can only see their own branch (ignore query param)
        if (!isHQRole(user.role as any) && employee.branchId !== user.branchId) {
          continue;
        }
        
        // HQ users: respect branchId query param if provided
        if (isHQRole(user.role as any) && branchId) {
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
    } catch (error: any) {
      console.error("Error fetching all employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  app.get('/api/employee-documents/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;
      
      // Supervisors can view their branch employees, HQ can view all
      if (!isHQRole(user.role as any)) {
        ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
        
        // Verify target user is in same branch
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personelini görüntüleyebilirsiniz" });
        }
      }
      
      const documents = await storage.getEmployeeDocuments(targetUserId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/employee-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Personel belgesi ekleme yetkiniz yok');
      
      const validatedData = insertEmployeeDocumentSchema.parse({
        ...req.body,
        uploadedById: user.id,
      });
      
      // Verify user can add documents for this employee
      if (!isHQRole(user.role as any)) {
        const targetUser = await storage.getUser(validatedData.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personeline belge ekleyebilirsiniz" });
        }
      }
      
      const document = await storage.createEmployeeDocument(validatedData);
      res.json(document);
    } catch (error: any) {
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

  app.patch('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Personel belgesi düzenleme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission for this document's user
      if (!isHQRole(user.role as any)) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi düzenleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateEmployeeDocument(docId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'delete', 'Personel belgesi silme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role as any)) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi silme yetkiniz yok" });
        }
      }
      
      await storage.deleteEmployeeDocument(docId);
      res.json({ message: "Belge silindi" });
    } catch (error: any) {
      console.error("Error deleting employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge silinirken hata oluştu" });
    }
  });

  app.post('/api/employee-documents/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      // Only HQ can verify documents
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Sadece merkez personel belgeleri onaylayabilir" });
      }
      
      const verified = await storage.verifyEmployeeDocument(docId, user.id);
      res.json(verified);
    } catch (error: any) {
      console.error("Error verifying employee document:", error);
      res.status(500).json({ message: "Belge onaylanırken hata oluştu" });
    }
  });

  // Disciplinary Reports (Disiplin İşlemleri)
  app.get('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'view', 'Disiplin kayıtlarını görüntüleme yetkiniz yok');
      
      const { userId, status } = req.query;
      let branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Branch users can only see their own branch
      if (!isHQRole(user.role as any)) {
        branchId = user.branchId!;
      }
      
      const reports = await storage.getDisciplinaryReports(
        userId as string | undefined,
        branchId,
        status as string | undefined
      );
      
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching disciplinary reports:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Disiplin kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'view', 'Disiplin kaydını görüntüleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role as any) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
      }
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt yüklenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Disiplin kaydı oluşturma yetkiniz yok');
      
      const validatedData = insertDisciplinaryReportSchema.parse({
        ...req.body,
        reportedById: user.id,
      });
      
      // Verify branch access
      if (!isHQRole(user.role as any)) {
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
    } catch (error: any) {
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

  app.patch('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Disiplin kaydı düzenleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role as any) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı düzenleme yetkiniz yok" });
      }
      
      const updated = await storage.updateDisciplinaryReport(reportId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt güncellenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports/:id/employee-response', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error adding employee response:", error);
      res.status(500).json({ message: "Savunma eklenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports/:id/resolve', isAuthenticated, async (req: any, res) => {
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
      if (!isHQRole(user.role as any) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı sonuçlandırma yetkiniz yok" });
      }
      
      const updated = await storage.resolveDisciplinaryReport(reportId, resolution, actionTaken, user.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error resolving disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt sonuçlandırılırken hata oluştu" });
    }
  });

  // Employee Onboarding
  // Get all onboarding records (with optional branch filter via query param)
  app.get('/api/employee-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;
      
      ensurePermission(user, 'hr', 'view', 'Onboarding kayıtlarını görüntüleme yetkiniz yok');
      
      // Get all employees first
      const allEmployees = await storage.getUsers();
      let onboardingRecords: any[] = [];
      
      // Branch users can only see their own branch (ignore query param)
      if (!isHQRole(user.role as any) && user.branchId) {
        onboardingRecords = await storage.getOnboardingsByBranch(user.branchId);
      } else if (isHQRole(user.role as any)) {
        // HQ users: respect branchId query param or get all
        if (branchId) {
          const targetBranchId = parseInt(branchId as string);
          onboardingRecords = await storage.getOnboardingsByBranch(targetBranchId);
        } else {
          // Get all - fetch from all branches
          const branches = await storage.getBranches();
          for (const branch of branches) {
            const branchOnboardings = await storage.getOnboardingsByBranch(branch.id);
            onboardingRecords.push(...branchOnboardings);
          }
        }
      }
      
      // Attach user info to each record
      const recordsWithUsers = onboardingRecords.map(record => {
        const employee = allEmployees.find(e => e.id === record.userId);
        return {
          ...record,
          user: employee ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
          } : undefined,
        };
      });
      
      res.json(recordsWithUsers);
    } catch (error: any) {
      console.error("Error fetching all onboarding records:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/employee-onboarding/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;
      
      ensurePermission(user, 'hr', 'view', 'Onboarding kayıtlarını görüntüleme yetkiniz yok');
      
      // Verify access
      if (!isHQRole(user.role as any)) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
        }
      }
      
      const onboarding = await storage.getEmployeeOnboarding(targetUserId);
      res.json(onboarding);
    } catch (error: any) {
      console.error("Error fetching employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı yüklenirken hata oluştu" });
    }
  });

  app.post('/api/employee-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Onboarding kaydı oluşturma yetkiniz yok');
      
      // Validate required fields
      const validatedData = z.object({
        userId: z.string().min(1, "userId gereklidir"),
        branchId: z.number().int().positive("Geçerli bir branchId gereklidir"),
      }).parse(req.body);
      
      const { userId, branchId } = validatedData;
      
      // Verify branch access
      if (!isHQRole(user.role as any) && branchId !== user.branchId) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için kayıt oluşturabilirsiniz" });
      }
      
      // Use getOrCreate for idempotent operation - it handles all defaults internally
      const onboarding = await storage.getOrCreateEmployeeOnboarding(userId, branchId, user.id);
      res.json(onboarding);
    } catch (error: any) {
      console.error("Error creating employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Onboarding kaydı oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/employee-onboarding/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding kaydı düzenleme yetkiniz yok');
      
      const onboarding = await storage.getEmployeeOnboarding(req.body.userId);
      if (!onboarding || onboarding.id !== onboardingId) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role as any) && onboarding.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı düzenleme yetkiniz yok" });
      }
      
      const updated = await storage.updateEmployeeOnboarding(onboardingId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı güncellenirken hata oluştu" });
    }
  });

  // Onboarding Tasks
  app.get('/api/onboarding-tasks/:onboardingId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.onboardingId);
      
      ensurePermission(user, 'hr', 'view', 'Onboarding görevlerini görüntüleme yetkiniz yok');
      
      const tasks = await storage.getOnboardingTasks(onboardingId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching onboarding tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görevler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Onboarding görevi oluşturma yetkiniz yok');
      
      const validatedData = insertEmployeeOnboardingTaskSchema.parse(req.body);
      
      const task = await storage.createOnboardingTask(validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error creating onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Görev oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/onboarding-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi düzenleme yetkiniz yok');
      
      const updated = await storage.updateOnboardingTask(taskId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev güncellenirken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { attachments } = req.body;
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi tamamlama yetkiniz yok');
      
      const completed = await storage.completeOnboardingTask(taskId, user.id, attachments);
      res.json(completed);
    } catch (error: any) {
      console.error("Error completing onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev tamamlanırken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      // Only supervisors and HQ can verify
      if (!isHQRole(user.role as any) && user.role !== 'supervisor' && user.role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Sadece yöneticiler görevleri onaylayabilir" });
      }
      
      const verified = await storage.verifyOnboardingTask(taskId, user.id);
      res.json(verified);
    } catch (error: any) {
      console.error("Error verifying onboarding task:", error);
      res.status(500).json({ message: "Görev onaylanırken hata oluştu" });
    }
  });

  startReminderSystem();

  const httpServer = createServer(app);
  return httpServer;
}
