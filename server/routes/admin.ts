import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
import { db } from "../db";
import { eq, lt, desc, asc, sql, and, or, count, isNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import { clearAIConfigCache, getAIConfig, getActiveProvider, calculateCostByProvider } from "../ai";
import { getBudgetStatus, invalidateBudgetCache, assertBudgetAvailable, isAiBudgetError } from "../ai-budget-guard";
import {
  hasPermission,
  escalationConfig,
  rolePermissionOverrides,
  isHQRole,
  type UserRoleType,
  insertMenuSectionSchema,
  insertMenuItemSchema,
  insertMenuVisibilityRuleSchema,
  insertPageContentSchema,
  insertSiteSettingSchema,
  emailSettings,
  serviceEmailSettings,
  banners,
  aiSettings,
  megaModuleConfig,
  megaModuleItems,
  announcements,
  dashboardWidgets,
  insertDashboardWidgetSchema,
  dashboardModuleVisibility,
  dashboardWidgetItems,
  insertDashboardWidgetItemSchema,
  users,
  branches,
  equipment,
  tasks,
  shiftAttendance,
  employeeLeaves,
  publicHolidays,
  notifications,
  auditLogs,
  titles,
  insertTitleSchema,
  roleTemplates,
  insertRoleTemplateSchema,
  dataLockRules,
  recordRevisions,
  checklistCompletions,
  performanceMetrics,
  employeePerformanceScores,
  branchAuditScores,
  auditItemScores,
  siteSettings,
  customerFeedback,
} from "@shared/schema";
import { detectSystemGaps, detectModuleGaps } from "../services/system-completeness-service";
import { getAllActionsGroupedByModule, getRoleGrants, upsertPermissionGrant, deletePermissionGrant } from "../permission-service";
import { generateArticleEmbeddings } from "../ai";
import { sanitizeUser, sanitizeUsers } from "../security";
import { auditLog, createAuditEntry, getAuditContext } from "../audit";
import { handleApiError } from "./helpers";

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

function ensurePermission(user: any, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module as any, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

const updatePageContentSchema = (insertPageContentSchema as any).partial().omit({
  id: true,
  createdAt: true,
});
const router = Router();

function isAdminOrCeo(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (!["admin", "ceo", "cgo", "genel_mudur"].includes(role)) {
    return res.status(403).json({ error: "Bu işlem için yönetici yetkisi gerekli" });
  }
  next();
}

  router.get('/api/mega-module-mapping', isAuthenticated, async (req, res) => {
    try {
      // Get mega-module items from database
      const items = await db.select().from(megaModuleItems).orderBy(megaModuleItems.megaModuleId, megaModuleItems.sortOrder);
      const configs = await db.select().from(megaModuleConfig).orderBy(megaModuleConfig.sortOrder);
      
      // Transform to mapping format: { megaModuleId: [subModuleId, ...] }
      const pathMapping: Record<string, string[]> = {};
      for (const item of items) {
        if (!pathMapping[item.megaModuleId]) {
          pathMapping[item.megaModuleId] = [];
        }
        pathMapping[item.megaModuleId].push(item.subModuleId);
        const pathId = item.subModulePath.replace(/^\//, '').replace(/\//g, '-');
        if (pathId && !pathMapping[item.megaModuleId].includes(pathId)) {
          pathMapping[item.megaModuleId].push(pathId);
        }
      }
      
      res.json({ 
        mapping: pathMapping, 
        configs: configs.map(c => ({
          id: c.megaModuleId,
          title: c.megaModuleNameTr || c.megaModuleName,
          icon: c.icon,
          color: c.color,
          sortOrder: c.sortOrder
        })),
        items: items.map(i => ({
          megaModuleId: i.megaModuleId,
          subModuleId: i.subModuleId,
          path: i.subModulePath,
          name: i.subModuleName
        }))
      });
    } catch (error: unknown) {
      console.error("Error fetching mega-module mapping:", error);
      res.status(500).json({ message: "Mega modül mapping alınamadı" });
    }
  });

  router.get('/api/admin/menu', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const menu = await storage.listMenu();
      res.json(menu);
    } catch (error: unknown) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Menü alınırken hata oluştu" });
    }
  });

  router.post('/api/admin/menu/sections', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const data = insertMenuSectionSchema.parse(req.body);
      const section = await storage.createMenuSection(data);
      res.status(201).json(section);
    } catch (error: unknown) {
      console.error("Error creating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz menü bölümü verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Menü bölümü oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/admin/menu/sections/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuSectionSchema.partial().parse(req.body);
      const section = await storage.updateMenuSection(id, data);
      res.json(section);
    } catch (error: unknown) {
      console.error("Error updating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz menü bölümü verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Menü bölümü güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/admin/menu/sections/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuSection(id);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting menu section:", error);
      res.status(500).json({ message: "Menü bölümü silinirken hata oluştu" });
    }
  });

  router.patch('/api/admin/menu/sections/order', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const { sectionIds } = req.body;
      if (!Array.isArray(sectionIds) || !sectionIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Geçersiz bölüm ID dizisi" });
      }
      await storage.reorderMenuSections(sectionIds);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error reordering menu sections:", error);
      res.status(500).json({ message: "Menü bölümleri sıralanırken hata oluştu" });
    }
  });

  router.post('/api/admin/menu/items', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: unknown) {
      console.error("Error creating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz menü öğesi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Menü öğesi oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/admin/menu/items/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, data);
      res.json(item);
    } catch (error: unknown) {
      console.error("Error updating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz menü öğesi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Menü öğesi güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/admin/menu/items/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Menü öğesi silinirken hata oluştu" });
    }
  });

  router.patch('/api/admin/menu/items/order', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const { sectionId, itemIds } = req.body;
      if (typeof sectionId !== 'number' || !Array.isArray(itemIds) || !itemIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Geçersiz bölüm ID veya öğe ID dizisi" });
      }
      await storage.reorderMenuItems(sectionId, itemIds);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error reordering menu items:", error);
      res.status(500).json({ message: "Menü öğeleri sıralanırken hata oluştu" });
    }
  });

  router.post('/api/admin/menu/visibility-rules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const data = insertMenuVisibilityRuleSchema.parse(req.body);
      const rule = await storage.createVisibilityRule(data);
      res.status(201).json(rule);
    } catch (error: unknown) {
      console.error("Error creating visibility rule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz görünürlük kuralı verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Görünürlük kuralı oluşturulurken hata oluştu" });
    }
  });

  router.delete('/api/admin/menu/visibility-rules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Erişim reddedildi" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteVisibilityRule(id);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting visibility rule:", error);
      res.status(500).json({ message: "Görünürlük kuralı silinirken hata oluştu" });
    }
  });

  router.get('/api/admin/page-content', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const contents = await storage.listPageContent();
      res.json(contents);
    } catch (error: unknown) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Sayfa içeriği alınırken hata oluştu" });
    }
  });

  router.get('/api/admin/page-content/:slug', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Sayfa içeriği alınırken hata oluştu" });
    }
  });

  router.post('/api/admin/page-content', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error creating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sayfa içeriği oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/admin/page-content/:slug', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error updating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof Error && error.message === "İçerik bulunamadı") {
        return res.status(404).json({ message: "İçerik bulunamadı" });
      }
      res.status(500).json({ message: "Sayfa içeriği güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/admin/page-content/:slug', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      await storage.deletePageContent(req.params.slug);
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting page content:", error);
      res.status(500).json({ message: "Sayfa içeriği silinirken hata oluştu" });
    }
  });

  router.get('/api/admin/branding', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching branding:", error);
      res.status(500).json({ message: "Marka bilgileri alınırken hata oluştu" });
    }
  });

  router.post('/api/admin/branding/logo', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error updating logo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Logo güncellenirken hata oluştu" });
    }
  });

  // AI monthly budget cap live status (used, remaining, exceeded).
  router.get('/api/admin/ai-budget', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && (!user.role || !isHQRole(user.role as UserRoleType))) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const status = await getBudgetStatus(true);
      res.json(status);
    } catch (error: unknown) {
      console.error("Get AI budget status error:", error);
      res.status(500).json({ message: "AI bütçe durumu alınamadı" });
    }
  });

  router.get('/api/admin/ai-costs', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching AI cost aggregates:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz tarih formatı", errors: error.errors });
      }
      res.status(500).json({ message: "AI maliyet verileri alınamadı" });
    }
  });

  router.get('/api/admin/users', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      
      // Allow HQ roles full access, supervisor/supervisor_buddy only their branch
      const isSupervisorRole = ['supervisor', 'supervisor_buddy'].includes(userRole);
      if (!isHQRole(userRole) && !isSupervisorRole) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { role, branchId, search, accountStatus } = req.query;
      
      // Build filters
      let filters: any = {
        role: role as string | undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        search: search as string | undefined,
        accountStatus: accountStatus as string | undefined,
      };

      // Supervisor can ONLY see their own branch - force filter
      if (isSupervisorRole) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        filters.branchId = user.branchId;
        // Supervisor can only see branch-level roles
        const allowedRoles = ['barista', 'stajyer', 'supervisor', 'supervisor_buddy'];
        if (filters.role && !allowedRoles.includes(filters.role)) {
          filters.role = undefined;
        }
      }

      const allUsers = await storage.getAllUsersWithFilters(filters);
      
      // For supervisors, filter out HQ roles from results
      let filteredUsers = allUsers;
      if (isSupervisorRole) {
        filteredUsers = allUsers.filter(u => 
          !isHQRole(u.role as UserRoleType) && 
          ['barista', 'stajyer', 'supervisor', 'supervisor_buddy'].includes(u.role || '')
        );
      }
      
      res.json(filteredUsers);
    } catch (error: unknown) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Kullanıcılar alınırken hata oluştu" });
    }
  });

  router.patch('/api/admin/users/:id', isAuthenticated, requireManifestAccess('admin', 'edit'), async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      const updateSchema = z.object({
        role: z.string().optional(),
        branchId: z.number().nullable().optional(),
        employeeTypeId: z.number().nullable().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const existingUser = await storage.getUser(id);
      const updated = await storage.updateUser(id, validatedData);

      if (!updated) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      auditLog(req, { eventType: "user.updated", action: "updated", resource: "users", resourceId: id, before: existingUser ? { role: existingUser.role, branchId: existingUser.branchId } : undefined, after: validatedData });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcı güncellenirken hata oluştu" });
    }
  });

  router.patch('/api/admin/users/:id/status', isAuthenticated, requireManifestAccess('admin', 'edit'), async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!currentUser.role || !isHQRole(currentUser.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      
      const statusSchema = z.object({
        isActive: z.boolean(),
      });
      
      const validatedData = statusSchema.parse(req.body);

      // Kendi hesabını deaktif edemez
      if (id === currentUser.id && !validatedData.isActive) {
        return res.status(400).json({ message: "Kendi hesabınızı deaktif edemezsiniz" });
      }

      const updated = await storage.updateUser(id, { isActive: validatedData.isActive });

      if (!updated) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      auditLog(req, { eventType: validatedData.isActive ? "user.restored" : "user.deactivated", action: validatedData.isActive ? "restored" : "deactivated", resource: "users", resourceId: id, after: { isActive: validatedData.isActive } });

      res.json({ 
        message: validatedData.isActive ? "Kullanıcı aktif edildi" : "Kullanıcı deaktif edildi",
        user: updated 
      });
    } catch (error: unknown) {
      console.error("Error updating user status:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcı durumu güncellenemedi" });
    }
  });

  router.post('/api/admin/users/bulk-import', isAuthenticated, requireManifestAccess('admin', 'create'), async (req, res) => {
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

      auditLog(req, { eventType: "user.bulk_import", action: "bulk_import", resource: "users", details: { importedCount: imported.length, roles: [...new Set(validatedUsers.map((u) => u.role))] } });

      res.json({ imported: imported.length, users: imported });
    } catch (error: unknown) {
      console.error("Error bulk importing users:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz CSV verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcılar içe aktarılırken hata oluştu" });
    }
  });

  router.post('/api/admin/users/approve/:id', isAuthenticated, requireManifestAccess('admin', 'approve'), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { sendWelcomeEmail } = await import('../email');
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

      auditLog(req, { eventType: "user.updated", action: "approved", resource: "users", resourceId: id, before: { accountStatus: targetUser.accountStatus }, after: { accountStatus: "approved" }, details: { action: "approved" } });

      res.json({ message: "Kullanıcı onaylandı", user: updated });
    } catch (error: unknown) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Onay işlemi sırasında hata oluştu" });
    }
  });

  router.post('/api/admin/users/reject/:id', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { sendRejectionEmail } = await import('../email');

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

      auditLog(req, { eventType: "user.updated", action: "rejected", resource: "users", resourceId: id, before: { accountStatus: targetUser.accountStatus }, after: { accountStatus: "rejected" }, details: { action: "rejected", reason } });

      res.json({ message: "Kullanıcı reddedildi" });
    } catch (error: unknown) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Red işlemi sırasında hata oluştu" });
    }
  });

  router.get('/api/admin/users/pending', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Bekleyen kullanıcılar yüklenemedi" });
    }
  });

  router.get('/api/admin/users/export', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Export başarısız" });
    }
  });

  router.delete('/api/admin/users/:id', isAuthenticated, requireManifestAccess('admin', 'delete'), async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Kullanıcı silme yetkisi sadece admin rolüne aittir" });
      }

      const { id } = req.params;

      // Prevent self-deletion
      if (id === user.id) {
        return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz" });
      }

      const deletedUser = await storage.getUser(id);
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "users",
        resourceId: String(id),
        details: { softDelete: true },
      });
      res.json({ message: "Kullanıcı silindi" });
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Kullanıcı silinemedi" });
    }
  });

  router.post('/api/admin/users', isAuthenticated, async (req, res) => {
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
        password: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
          .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
          .regex(/[!@#$%^&*._-]/, "Şifre en az bir özel karakter içermelidir (!@#$%^&*._-)"),
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

      auditLog(req, { eventType: "user.created", action: "created", resource: "users", resourceId: newUser.id, after: { email: data.email, role: data.role, branchId: data.branchId } });

      res.json(newUser);
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcı oluşturulamadı" });
    }
  });

  router.get('/api/admin/settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { category } = req.query;
      const settings = await storage.getSiteSettings(category as string | undefined);
      
      res.json(settings);
    } catch (error: unknown) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Ayarlar yüklenirken hata oluştu" });
    }
  });

  router.get('/api/admin/settings/:key', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching site setting:", error);
      res.status(500).json({ message: "Ayar yüklenirken hata oluştu" });
    }
  });

  router.post('/api/admin/settings', isAuthenticated, requireManifestAccess('admin', 'create'), async (req, res) => {
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

      auditLog(req, { eventType: "settings.changed", action: "created", resource: "settings", resourceId: validatedData.key, after: validatedData });

      res.status(201).json(setting);
    } catch (error: unknown) {
      console.error("Error creating site setting:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Ayar oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/admin/settings/:key', isAuthenticated, requireManifestAccess('admin', 'edit'), async (req, res) => {
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
      
      const existingSetting = await storage.getSiteSetting(key);
      const setting = await storage.updateSiteSetting(key, value, user.id);

      auditLog(req, { eventType: "settings.changed", action: "updated", resource: "settings", resourceId: key, before: existingSetting ? { value: existingSetting.value } : undefined, after: { value } });

      res.json(setting);
    } catch (error: unknown) {
      console.error("Error updating site setting:", error);
      res.status(500).json({ message: "Ayar güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/admin/settings/:key', isAuthenticated, requireManifestAccess('admin', 'delete'), async (req, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      await storage.deleteSiteSetting(key);

      auditLog(req, { eventType: "settings.changed", action: "deleted", resource: "settings", resourceId: key });

      res.json({ message: "Ayar silindi" });
    } catch (error: unknown) {
      console.error("Error deleting site setting:", error);
      res.status(500).json({ message: "Ayar silinirken hata oluştu" });
    }
  });

  router.get('/api/admin/role-permissions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role: roleFilter } = req.query;
      
      // Admin/CEO/CGO erişimi
      if (!["admin", "ceo", "cgo", "genel_mudur"].includes(user.role)) {
        return res.status(403).json({ message: "Yönetici yetkisi gerekli" });
      }

      // Define default module permissions for each role
      // Academy sub-modules: academy.general, academy.hq, academy.analytics, academy.badges, 
      // academy.certificates, academy.leaderboard, academy.quizzes, academy.learning_paths, 
      // academy.ai, academy.social, academy.supervisor
      const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
        admin: {
          dashboard: ['view', 'edit'], tasks: ['view', 'edit'], checklists: ['view', 'edit'], branches: ['view', 'edit'],
          equipment: ['view', 'edit'], faults: ['view', 'edit'], equipment_analytics: ['view', 'edit'],
          quality_audit: ['view', 'edit'], audit_templates: ['view', 'edit'], capa: ['view', 'edit'],
          // Academy sub-modules - Admin has full access
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
          shifts: ['view', 'edit'], shift_planning: ['view', 'edit'], hr: ['view', 'edit'], attendance: ['view', 'edit'], leave_requests: ['view', 'edit'],
          accounting: ['view', 'edit'], reports: ['view', 'edit'], e2e_reports: ['view', 'edit'], cash_reports: ['view', 'edit'], hr_reports: ['view', 'edit'],
          lost_found: ['view', 'edit'], lost_found_hq: ['view', 'edit'],
          projects: ['view', 'edit'], new_branch_projects: ['view', 'edit'],
          support: ['view', 'edit'], notifications: ['view', 'edit'], announcements: ['view', 'edit'], messages: ['view', 'edit'],
          settings: ['view', 'edit'], users: ['view', 'edit'], menu_management: ['view', 'edit'], content_management: ['view', 'edit'], admin_panel: ['view', 'edit'], authorization: ['view', 'edit'],
        },
        muhasebe: {
          dashboard: ['view'], accounting: ['view', 'edit'], reports: ['view'], cash_reports: ['view', 'edit'], hr_reports: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        coach: {
          dashboard: ['view'], tasks: ['view', 'edit'], checklists: ['view'], hr: ['view'], 
          quality_audit: ['view', 'edit'], audit_templates: ['view', 'edit'], capa: ['view', 'edit'],
          // Coach has full Academy access including HQ management
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
        },
        teknik: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view', 'edit'], equipment_analytics: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        destek: {
          dashboard: ['view'], support: ['view', 'edit'], notifications: ['view', 'edit'], announcements: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        satinalma: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view'], projects: ['view', 'edit'], new_branch_projects: ['view', 'edit'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        supervisor: {
          dashboard: ['view'], tasks: ['view', 'edit'], checklists: ['view', 'edit'], shifts: ['view'], shift_planning: ['view'], attendance: ['view', 'edit'],
          hr: ['view'], leave_requests: ['view', 'edit'], equipment: ['view'], faults: ['view', 'edit'], lost_found: ['view', 'edit'],
          quality_audit: ['view', 'edit'],
          // Supervisor can access analytics and supervisor view
          'academy.general': ['view'], 'academy.analytics': ['view'], 'academy.badges': ['view'], 
          'academy.certificates': ['view'], 'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
          'academy.learning_paths': ['view'], 'academy.supervisor': ['view', 'edit'],
        },
        supervisor_buddy: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view', 'edit'], shifts: ['view'], attendance: ['view'], equipment: ['view'], faults: ['view', 'edit'],
          lost_found: ['view', 'edit'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        barista: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view'], shifts: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'], 'academy.learning_paths': ['view'],
        },
        bar_buddy: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view'], shifts: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        stajyer: {
          dashboard: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.quizzes': ['view'],
        },
        yatirimci_branch: {
          dashboard: ['view'], attendance: ['view'], shifts: ['view'], hr: ['view'],
          'academy.analytics': ['view'],
        },
        fabrika: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view'], quality_audit: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'],
        },
        yatirimci_hq: {
          dashboard: ['view'], reports: ['view'], branches: ['view'], accounting: ['view'],
          'academy.analytics': ['view'],
        },
      };

      // Get role's default permissions
      const roleDefaults = roleFilter && DEFAULT_ROLE_PERMISSIONS[roleFilter as string] 
        ? DEFAULT_ROLE_PERMISSIONS[roleFilter as string] 
        : {};

      // Fetch explicit permissions from database (overrides)
      const dbPermissions = await storage.getRolePermissions();
      const dbFiltered = roleFilter 
        ? dbPermissions.filter((p) => p.role === roleFilter)
        : dbPermissions;

      // Create map of DB permissions for easy lookup
      const dbPermMap = new Map<string, string[]>();
      dbFiltered.forEach((p) => {
        dbPermMap.set(p.module, p.actions || []);
      });

      // Merge: Start with defaults, override with DB permissions
      const mergedPerms: Array<{ module: string; actions: string[]; canView: boolean; canEdit: boolean }> = [];
      
      // Add all default permissions
      for (const [module, actions] of Object.entries(roleDefaults)) {
        const dbActions = dbPermMap.get(module);
        const finalActions = dbActions !== undefined ? dbActions : actions;
        mergedPerms.push({
          module,
          actions: finalActions,
          canView: finalActions.includes('view'),
          canEdit: finalActions.includes('edit'),
        });
        dbPermMap.delete(module); // Remove from map so we don't add it twice
      }

      // Add any DB-only permissions (not in defaults)
      for (const [module, actions] of Array.from(dbPermMap.entries())) {
        mergedPerms.push({
          module,
          actions,
          canView: actions.includes('view'),
          canEdit: actions.includes('edit'),
        });
      }
      
      res.json(mergedPerms);
    } catch (error: unknown) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Rol yetkileri yüklenirken hata oluştu" });
    }
  });

  router.put('/api/admin/role-permissions', isAuthenticated, async (req, res) => {
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

      auditLog(req, { eventType: "role.permission_changed", action: "updated", resource: "role_permissions", details: { updates } });

      res.json({ message: "Rol yetkileri güncellendi" });
    } catch (error: unknown) {
      console.error("Error updating role permissions:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Rol yetkileri güncellenirken hata oluştu" });
    }
  });

  router.post('/api/admin/roles', isAuthenticated, requireManifestAccess('admin', 'create'), async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const { roleName, scope, description } = req.body;
      if (!roleName) {
        return res.status(400).json({ message: "Rol adı gerekli" });
      }
      res.json({ id: roleName, name: roleName, scope: scope || 'hq', description: description || '', createdAt: new Date() });
    } catch (error: unknown) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Rol oluşturulamadı" });
    }
  });

  router.get('/api/system/health', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin and genel_mudur can view system health
      if (user.role !== 'admin' && user.role !== 'genel_mudur') {
        return res.status(403).json({ message: 'Sistem durumunu görüntüleme yetkiniz yok' });
      }
      
      const { performHealthCheck, getBackupStatus, getDataStats } = await import('../backup');
      
      const [health, backupStatus, dataStats] = await Promise.all([
        performHealthCheck(),
        getBackupStatus(),
        getDataStats(),
      ]);
      
      res.json({
        health,
        backupStatus,
        dataStats,
        serverTime: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Sistem durumu alınırken hata oluştu" });
    }
  });

  router.get('/api/system/backup-status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'genel_mudur') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      
      const { getBackupHistory } = await import('../backup');
      const history = await getBackupHistory(5);
      
      const lastBackup = history.length > 0 ? history[0] : null;
      const minutesAgo = lastBackup ? Math.round((Date.now() - new Date(lastBackup.timestamp).getTime()) / 60000) : null;
      
      const metadata = lastBackup?.recordCounts as any || {};
      
      res.json({
        lastBackup: lastBackup ? {
          id: lastBackup.id,
          backupId: lastBackup.backupId,
          timestamp: lastBackup.timestamp,
          success: lastBackup.success,
          backupType: lastBackup.backupType,
          durationMs: lastBackup.durationMs,
          errorMessage: lastBackup.errorMessage,
          skippedTables: metadata.skippedTables || [],
          failedTables: metadata.failedTables || [],
          errorSummary: metadata.errorSummary || null,
          tablesExported: lastBackup.tablesBackedUp?.length || 0,
        } : null,
        minutesAgo,
        schedule: 'hourly',
        retention: { hourly: 48, daily: 30, manual: 'unlimited' },
        recentHistory: history.map(h => {
          const hMeta = h.recordCounts as any || {};
          return {
            id: h.id,
            backupId: h.backupId,
            timestamp: h.timestamp,
            success: h.success,
            backupType: h.backupType,
            durationMs: h.durationMs,
            skippedCount: (hMeta.skippedTables || []).length,
            failedCount: (hMeta.failedTables || []).length,
          };
        }),
      });
    } catch (error: unknown) {
      console.error("Error fetching backup status:", error);
      res.status(500).json({ message: "Backup durumu alınırken hata oluştu" });
    }
  });

  router.post('/api/system/backup', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem yalnızca admin rolü tarafından yapılabilir' });
      }
      
      const { triggerManualBackup } = await import('../backup');
      const backupRecord = await triggerManualBackup();
      
      res.json({
        success: backupRecord.success,
        backupId: backupRecord.id,
        timestamp: backupRecord.timestamp,
        recordCounts: backupRecord.recordCounts,
        durationMs: backupRecord.durationMs,
        errorMessage: backupRecord.errorMessage,
      });
    } catch (error: unknown) {
      console.error("Error triggering manual backup:", error);
      res.status(500).json({ message: "Backup tetiklenirken hata oluştu" });
    }
  });


  router.post('/api/system/restore', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem yalnızca admin rolü tarafından yapılabilir' });
      }
      const { backupId } = req.body;
      if (!backupId) {
        return res.status(400).json({ message: 'backupId gereklidir' });
      }
      const { restoreFromBackup } = await import('../backup');
      const result = await restoreFromBackup(backupId);
      res.json(result);
    } catch (error: unknown) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ message: "Geri yükleme sırasında hata oluştu" });
    }
  });

  router.get('/api/system/restore-points', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem yalnızca admin rolü tarafından yapılabilir' });
      }
      const { getAvailableRestorePoints } = await import('../backup');
      const restorePoints = await getAvailableRestorePoints();
      res.json({ restorePoints });
    } catch (error: unknown) {
      console.error("Error fetching restore points:", error);
      res.status(500).json({ message: "Restore noktaları alınırken hata oluştu" });
    }
  });

  router.get('/api/admin/support-assignments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const assignments = await storage.getHQSupportCategoryAssignments();
      
      // Enrich with user info
      const allUsers = await db.select().from(users);
      const enriched = assignments.map((a) => {
        const assignedUser = allUsers.find(u => u.id === a.userId);
        return {
          ...a,
          user: assignedUser ? { 
            id: assignedUser.id, 
            firstName: assignedUser.firstName, 
            lastName: assignedUser.lastName,
            role: assignedUser.role 
          } : null,
        };
      });
      
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Get category assignments error:", error);
      res.status(500).json({ message: "Kategori atamaları alınamadı" });
    }
  });

  router.post('/api/admin/support-assignments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const assignment = await storage.createHQSupportCategoryAssignment({
        ...req.body,
        createdById: user.id,
      });
      
      res.status(201).json(assignment);
    } catch (error: unknown) {
      console.error("Create category assignment error:", error);
      res.status(500).json({ message: "Kategori ataması oluşturulamadı" });
    }
  });

  router.delete('/api/admin/support-assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      await storage.deleteHQSupportCategoryAssignment(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Delete category assignment error:", error);
      res.status(500).json({ message: "Kategori ataması silinemedi" });
    }
  });

  router.get('/api/admin/email-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.emailSettings.findFirst();
      if (!result) {
        return res.json({
          smtpHost: process.env.SMTP_HOST || "",
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpUser: process.env.SMTP_USER || "",
          smtpPassword: "",
          smtpFromEmail: process.env.SMTP_FROM_EMAIL || "",
          smtpFromName: "DOSPRESSO",
          smtpSecure: false,
          isActive: true,
        });
      }
      res.json({ ...result, smtpPassword: result.smtpPassword ? "********" : "" });
    } catch (error: unknown) {
      console.error("Get email settings error:", error);
      res.status(500).json({ message: "Ayarlar alınamadı" });
    }
  });

  router.post('/api/admin/email-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const existing = await db.query.emailSettings.findFirst();
      const data = {
        ...req.body,
        updatedById: user.id,
        updatedAt: new Date(),
      };
      
      if (data.smtpPassword === "********" || !data.smtpPassword) {
        delete data.smtpPassword;
      }
      
      if (existing) {
        await db.update(emailSettings).set(data).where(eq(emailSettings.id, existing.id));
      } else {
        await db.insert(emailSettings).values(data);
      }
      
      auditLog(req, { eventType: "settings.changed", action: "updated", resource: "email_settings" });

      res.json({ message: "Ayarlar kaydedildi" });
    } catch (error: unknown) {
      console.error("Save email settings error:", error);
      res.status(500).json({ message: "Ayarlar kaydedilemedi" });
    }
  });

  router.post('/api/admin/email-settings/test', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      res.json({ message: "Test e-postası gönderildi" });
    } catch (error: unknown) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Test e-postası gönderilemedi" });
    }
  });

  router.get('/api/admin/service-email-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.serviceEmailSettings.findFirst();
      if (!result) {
        return res.json({
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          smtpFromEmail: "cowork@dospresso.com",
          smtpFromName: "DOSPRESSO Teknik",
          smtpSecure: false,
          isActive: true,
        });
      }
      res.json({ ...result, smtpPassword: result.smtpPassword ? "********" : "" });
    } catch (error: unknown) {
      console.error("Get service email settings error:", error);
      res.status(500).json({ message: "Servis mail ayarları alınamadı" });
    }
  });

  router.post('/api/admin/service-email-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const existing = await db.query.serviceEmailSettings.findFirst();
      const data = {
        ...req.body,
        updatedById: user.id,
        updatedAt: new Date(),
      };
      
      if (data.smtpPassword === "********" || !data.smtpPassword) {
        delete data.smtpPassword;
      }
      
      if (existing) {
        await db.update(serviceEmailSettings).set(data).where(eq(serviceEmailSettings.id, existing.id));
      } else {
        await db.insert(serviceEmailSettings).values(data);
      }
      
      auditLog(req, { eventType: "settings.changed", action: "updated", resource: "service_email_settings" });

      res.json({ message: "Servis mail ayarları kaydedildi" });
    } catch (error: unknown) {
      console.error("Save service email settings error:", error);
      res.status(500).json({ message: "Servis mail ayarları kaydedilemedi" });
    }
  });

  router.post('/api/admin/service-email-settings/test', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      res.json({ message: "Test e-postası servis adresine gönderildi" });
    } catch (error: unknown) {
      console.error("Test service email error:", error);
      res.status(500).json({ message: "Test e-postası gönderilemedi" });
    }
  });

  router.get('/api/admin/banners', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.banners.findMany({
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
      res.json(result);
    } catch (error: unknown) {
      console.error("Get banners error:", error);
      res.status(500).json({ message: "Bannerlar alınamadı" });
    }
  });

  router.post('/api/admin/banners', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { title, description, imageUrl, linkUrl, targetRoles, startDate, endDate, isActive, orderIndex } = req.body;
      
      // For active banners, dates are required. For drafts (isActive=false), dates are optional
      if (!title) {
        return res.status(400).json({ message: "Başlık zorunludur" });
      }
      
      // Only require dates if banner is active
      const willBeActive = isActive !== false;
      if (willBeActive && (!startDate || !endDate)) {
        return res.status(400).json({ message: "Aktif bannerlar için başlangıç ve bitiş tarihi zorunludur" });
      }
      
      // Parse dates only if provided
      let start: Date | null = null;
      let end: Date | null = null;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ message: "Geçersiz tarih formatı" });
        }
      }
      
      const [banner] = await db.insert(banners).values({
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        targetRoles: targetRoles || null,
        startDate: start,
        endDate: end,
        isActive: willBeActive,
        orderIndex: orderIndex || 0,
        createdById: user.id,
      }).returning();
      
      res.status(201).json(banner);
    } catch (error: unknown) {
      console.error("Create banner error:", error);
      res.status(500).json({ message: "Banner oluşturulamadı" });
    }
  });

  router.patch('/api/admin/banners/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const updateData: any = { updatedAt: new Date() };
      const { title, description, imageUrl, linkUrl, targetRoles, startDate, endDate, isActive, orderIndex } = req.body;
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (linkUrl !== undefined) updateData.linkUrl = linkUrl || null;
      if (targetRoles !== undefined) updateData.targetRoles = targetRoles || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Geçersiz başlangıç tarihi" });
        }
        updateData.startDate = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Geçersiz bitiş tarihi" });
        }
        updateData.endDate = end;
      }
      
      const [banner] = await db.update(banners)
        .set(updateData)
        .where(eq(banners.id, parseInt(req.params.id)))
        .returning();
      
      res.json(banner);
    } catch (error: unknown) {
      console.error("Update banner error:", error);
      res.status(500).json({ message: "Banner güncellenemedi" });
    }
  });

  router.delete('/api/admin/banners/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      await db.delete(banners).where(eq(banners.id, parseInt(req.params.id)));
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Delete banner error:", error);
      res.status(500).json({ message: "Banner silinemedi" });
    }
  });

  router.get('/api/admin/ai-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const [settings] = await db.query.aiSettings.findMany({ limit: 1 });
      
      if (!settings) {
        // Return default settings
        return res.json({
          id: 0,
          provider: "openai",
          isActive: true,
          openaiApiKey: process.env.OPENAI_API_KEY ? "********" : null,
          openaiChatModel: "gpt-4o",
          openaiEmbeddingModel: "text-embedding-3-small",
          openaiVisionModel: "gpt-4o",
          geminiApiKey: null,
          geminiChatModel: "gemini-2.0-flash",
          geminiEmbeddingModel: "text-embedding-004",
          geminiVisionModel: "gemini-2.0-flash",
          anthropicApiKey: null,
          anthropicChatModel: "claude-sonnet-4-20250514",
          anthropicVisionModel: "claude-sonnet-4-20250514",
          temperature: 0.7,
          maxTokens: 2000,
          rateLimitPerMinute: 60,
        });
      }
      
      // Mask API keys for frontend
      const maskedSettings = {
        ...settings,
        openaiApiKey: settings.openaiApiKey ? "********" : null,
        geminiApiKey: settings.geminiApiKey ? "********" : null,
        anthropicApiKey: settings.anthropicApiKey ? "********" : null,
        monthlyBudgetUsd: settings.monthlyBudgetUsd != null ? Number(settings.monthlyBudgetUsd) : 50,
        budgetEnforcementEnabled: settings.budgetEnforcementEnabled !== false,
        budgetAlertThresholdPct: settings.budgetAlertThresholdPct ?? 80,
      };
      
      res.json(maskedSettings);
    } catch (error: unknown) {
      console.error("Get AI settings error:", error);
      res.status(500).json({ message: "AI ayarları alınamadı" });
    }
  });

  router.post('/api/admin/ai-settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const data = req.body;
      const [existing] = await db.query.aiSettings.findMany({ limit: 1 });
      
      const updateData: any = {
        provider: data.provider,
        isActive: data.isActive,
        openaiChatModel: data.openaiChatModel,
        openaiEmbeddingModel: data.openaiEmbeddingModel,
        openaiVisionModel: data.openaiVisionModel,
        geminiChatModel: data.geminiChatModel,
        geminiEmbeddingModel: data.geminiEmbeddingModel,
        geminiVisionModel: data.geminiVisionModel,
        anthropicChatModel: data.anthropicChatModel,
        anthropicVisionModel: data.anthropicVisionModel,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        rateLimitPerMinute: data.rateLimitPerMinute,
        updatedById: user.id,
        updatedAt: new Date(),
      };

      // Monthly USD budget cap + alert threshold + enforcement toggle.
      if (data.monthlyBudgetUsd !== undefined && data.monthlyBudgetUsd !== null && data.monthlyBudgetUsd !== "") {
        const n = Number(data.monthlyBudgetUsd);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ message: "Aylık bütçe geçersiz (>= 0 olmalı)" });
        }
        updateData.monthlyBudgetUsd = n.toFixed(2);
      }
      if (typeof data.budgetEnforcementEnabled === "boolean") {
        updateData.budgetEnforcementEnabled = data.budgetEnforcementEnabled;
      }
      if (data.budgetAlertThresholdPct !== undefined && data.budgetAlertThresholdPct !== null && data.budgetAlertThresholdPct !== "") {
        const p = Math.round(Number(data.budgetAlertThresholdPct));
        if (!Number.isFinite(p) || p < 1 || p > 100) {
          return res.status(400).json({ message: "Uyarı eşiği 1-100 arası olmalı" });
        }
        updateData.budgetAlertThresholdPct = p;
      }
      
      // Only update API keys if new value provided (not masked)
      if (data.openaiApiKey && data.openaiApiKey !== "********") {
        updateData.openaiApiKey = data.openaiApiKey;
      }
      if (data.geminiApiKey && data.geminiApiKey !== "********") {
        updateData.geminiApiKey = data.geminiApiKey;
      }
      if (data.anthropicApiKey && data.anthropicApiKey !== "********") {
        updateData.anthropicApiKey = data.anthropicApiKey;
      }
      
      // Detect provider change and flag re-embed needed
      if (existing && existing.provider !== data.provider) {
        updateData.needsReembed = true;
      }
      
      let result;
      if (existing) {
        [result] = await db.update(aiSettings)
          .set(updateData)
          .where(eq(aiSettings.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(aiSettings).values(updateData).returning();
      }
      
      auditLog(req, { eventType: "settings.changed", action: "updated", resource: "ai_settings", details: { provider: data.provider } });

      clearAIConfigCache();
      invalidateBudgetCache();

      res.json({ success: true, id: result.id });
    } catch (error: unknown) {
      console.error("Save AI settings error:", error);
      res.status(500).json({ message: "AI ayarları kaydedilemedi" });
    }
  });

  router.post('/api/admin/ai-settings/test', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      try {
        await assertBudgetAvailable();
      } catch (e: unknown) {
        if (isAiBudgetError(e)) {
          return res.status(503).json({
            ok: false,
            provider: req.body?.provider || 'unknown',
            error: (e as Error).message,
            code: 'AI_BUDGET_EXCEEDED',
            hint: 'AI aylık bütçe tavanı aşıldı. Tavanı yükseltin veya enforcement\'ı kapatın.',
          });
        }
        throw e;
      }

      const { provider } = req.body;
      if (!provider) {
        return res.json({ ok: false, provider: "unknown", error: "Sağlayıcı belirtilmedi" });
      }
      const settingsResult = await db.select().from(aiSettings).limit(1);
      const settings = settingsResult[0] || null;
      const OpenAI = (await import('openai')).default;

      const testPrompt = "Merhaba, bu bir bağlantı testidir. Sadece 'OK' yanıtı ver.";

      const logTestUsage = async (providerName: string, modelName: string, latencyMs: number, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined) => {
        try {
          const promptTokens = usage?.prompt_tokens ?? 0;
          const completionTokens = usage?.completion_tokens ?? 0;
          const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
          const cost = calculateCostByProvider(providerName, modelName, promptTokens, completionTokens);
          await storage.logAiUsage({
            feature: "admin_connection_test",
            model: modelName,
            operation: providerName + "_test",
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd: cost.toFixed(6),
            requestLatencyMs: latencyMs,
            userId: user.id,
            branchId: null,
            cachedHit: false,
            metadata: { testPrompt: true },
          });
          invalidateBudgetCache();
        } catch (logErr) {
          console.warn("[admin/test] usage log failed:", logErr);
        }
      };

      if (provider === 'openai') {
        const apiKey = settings?.openaiApiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.json({ ok: false, provider: "openai", error: "OpenAI API anahtarı bulunamadı", hint: "API anahtarı ayarlardan girilmeli" });
        }
        try {
          const client = new OpenAI({ 
            apiKey,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined
          });
          const model = settings?.openaiChatModel || "gpt-4o-mini";
          const start = Date.now();
          const resp = await client.chat.completions.create({
            model, messages: [{ role: "user", content: testPrompt }], max_tokens: 50,
          });
          const latencyMs = Date.now() - start;
          await logTestUsage("openai", resp.model || model, latencyMs, resp.usage);
          return res.json({
            ok: true, provider: "openai", requestedModel: model,
            actualModel: resp.model || model, latencyMs,
            message: `OpenAI bağlantısı başarılı (${latencyMs}ms)`
          });
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          const message = e instanceof Error ? e.message : String(e);
          const hint = status === 401 ? "API anahtarı geçersiz" : status === 429 ? "Rate limit / kota aşıldı" : "Bağlantı hatası";
          return res.json({ ok: false, provider: "openai", error: message, hint });
        }
      }
      
      if (provider === 'gemini') {
        const apiKey = settings?.geminiApiKey;
        if (!apiKey) {
          return res.json({ ok: false, provider: "gemini", error: "Gemini API anahtarı bulunamadı", hint: "Google AI Studio'dan API anahtarı alınmalı" });
        }
        try {
          const client = new OpenAI({
            apiKey,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
          });
          const model = settings?.geminiChatModel || "gemini-2.0-flash";
          const start = Date.now();
          const resp = await client.chat.completions.create({
            model, messages: [{ role: "user", content: testPrompt }], max_tokens: 50,
          });
          const latencyMs = Date.now() - start;
          await logTestUsage("gemini", resp.model || model, latencyMs, resp.usage);
          return res.json({
            ok: true, provider: "gemini", requestedModel: model,
            actualModel: resp.model || model, latencyMs,
            message: `Gemini bağlantısı başarılı (${latencyMs}ms)`
          });
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          const message = e instanceof Error ? e.message : String(e);
          const hint = status === 401 || status === 403 ? "API anahtarı geçersiz" : status === 429 ? "Kota aşıldı" : "Bağlantı hatası";
          return res.json({ ok: false, provider: "gemini", error: message, hint });
        }
      }
      
      if (provider === 'anthropic') {
        const apiKey = settings?.anthropicApiKey;
        if (!apiKey) {
          return res.json({ ok: false, provider: "anthropic", error: "Anthropic API anahtarı bulunamadı", hint: "Anthropic Console'dan API anahtarı alınmalı" });
        }
        try {
          const model = settings?.anthropicChatModel || "claude-sonnet-4-20250514";
          const start = Date.now();
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model, max_tokens: 50,
              messages: [{ role: "user", content: testPrompt }],
            }),
          });
          const latencyMs = Date.now() - start;
          const data = await resp.json() as any;
          if (!resp.ok) {
            const hint = resp.status === 401 ? "API anahtarı geçersiz" : resp.status === 429 ? "Rate limit aşıldı" : data?.error?.message || "Bağlantı hatası";
            return res.json({ ok: false, provider: "anthropic", error: data?.error?.message || "API hatası", hint });
          }
          await logTestUsage("anthropic", data?.model || model, latencyMs, {
            prompt_tokens: data?.usage?.input_tokens,
            completion_tokens: data?.usage?.output_tokens,
            total_tokens: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
          });
          return res.json({
            ok: true, provider: "anthropic", requestedModel: model,
            actualModel: data?.model || model, latencyMs,
            message: `Anthropic bağlantısı başarılı (${latencyMs}ms)`
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          return res.json({ ok: false, provider: "anthropic", error: message, hint: "Ağ bağlantısı hatası" });
        }
      }
      
      res.json({ ok: false, provider: "unknown", error: "Bilinmeyen sağlayıcı" });
    } catch (error: unknown) {
      console.error("Test AI connection error:", error);
      res.status(500).json({ success: false, message: "Bağlantı testi başarısız" });
    }
  });

  const MODEL_ALLOWLIST: Record<string, { chat: string[], vision: string[], embedding: string[] }> = {
    openai: {
      chat: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4-turbo", "gpt-3.5-turbo", "o3-mini"],
      vision: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4-turbo"],
      embedding: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    },
    gemini: {
      chat: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
      vision: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
      embedding: ["text-embedding-004"],
    },
    anthropic: {
      chat: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
      vision: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
      embedding: [],
    },
  };
  let _modelsCache: Record<string, any> = {};
  let _modelsCacheTime: Record<string, number> = {};
  const MODELS_CACHE_TTL = 6 * 60 * 60 * 1000;

  router.get('/api/admin/ai/models', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const provider = (req.query.provider as string) || "openai";
      const allowlist = MODEL_ALLOWLIST[provider];
      if (!allowlist) {
        return res.json({ provider, models: { chat: [], vision: [], embedding: [] }, source: "unknown_provider" });
      }

      const now = Date.now();
      if (_modelsCache[provider] && _modelsCacheTime[provider] && now - _modelsCacheTime[provider] < MODELS_CACHE_TTL) {
        return res.json(_modelsCache[provider]);
      }

      const [settings] = await db.query.aiSettings.findMany({ limit: 1 });
      let liveModels: string[] = [];
      let source = "allowlist";

      try {
        const OpenAI = (await import('openai')).default;

        if (provider === "openai") {
          const apiKey = settings?.openaiApiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
          if (apiKey) {
            const client = new OpenAI({ apiKey });
            const list = await client.models.list();
            liveModels = [];
            for await (const m of list) {
              liveModels.push(m.id);
            }
            source = "live_api";
          }
        } else if (provider === "gemini") {
          const apiKey = settings?.geminiApiKey;
          if (apiKey) {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (resp.ok) {
              const data = await resp.json() as any;
              liveModels = (data.models || []).map((m) => m.name?.replace("models/", "") || m.name);
              source = "live_api";
            }
          }
        } else if (provider === "anthropic") {
          source = "allowlist";
        }
      } catch (e) {
        console.warn(`Failed to fetch live models for ${provider}, using allowlist`);
        source = "allowlist";
      }

      let result: any;
      if (liveModels.length > 0) {
        const liveSet = new Set(liveModels);
        result = {
          provider,
          source,
          models: {
            chat: allowlist.chat.filter(m => liveSet.has(m) || source === "allowlist"),
            vision: allowlist.vision.filter(m => liveSet.has(m) || source === "allowlist"),
            embedding: allowlist.embedding.filter(m => liveSet.has(m) || source === "allowlist"),
          },
          availableCount: liveModels.length,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        result = {
          provider,
          source,
          models: allowlist,
          lastUpdated: new Date().toISOString(),
        };
      }

      _modelsCache[provider] = result;
      _modelsCacheTime[provider] = now;

      res.json(result);
    } catch (error: unknown) {
      console.error("Get AI models error:", error);
      res.status(500).json({ message: "Model listesi alınamadı" });
    }
  });

  router.post('/api/admin/ai/re-embed', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const articles = await storage.getArticles(undefined, undefined, undefined);
      if (articles.length === 0) {
        return res.json({ success: true, processed: 0, total: 0, message: "Bilgi bankasında makale bulunamadı" });
      }

      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const article of articles) {
        try {
          await storage.deleteEmbeddingsByArticle(article.id);
          const embeddings = await generateArticleEmbeddings(article.id, article.title, article.content);
          await storage.createEmbeddings(embeddings.map(e => ({
            articleId: article.id,
            chunkText: e.chunkText,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding,
          })));
          processed++;
        } catch (err) {
          failed++;
          errors.push(`Makale #${article.id} (${article.title}): ${err.message}`);
          console.error(`Re-embed failed for article ${article.id}:`, err.message);
        }
      }

      // Clear needsReembed flag and set lastEmbeddingProvider
      if (failed === 0) {
        const [currentSettings] = await db.query.aiSettings.findMany({ limit: 1 });
        if (currentSettings) {
          await db.update(aiSettings)
            .set({ needsReembed: false, lastEmbeddingProvider: currentSettings.provider })
            .where(eq(aiSettings.id, currentSettings.id));
        }
      }

      res.json({
        success: failed === 0,
        processed,
        failed,
        total: articles.length,
        errors: errors.slice(0, 5),
        message: failed === 0
          ? `${processed} makale başarıyla yeniden indexlendi`
          : `${processed}/${articles.length} makale işlendi, ${failed} başarısız`,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "ReEmbedArticles");
    }
  });

  router.patch('/api/admin/update-employee-terminations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { terminations } = req.body;
      if (!Array.isArray(terminations)) {
        return res.status(400).json({ message: "terminations array gerekli" });
      }

      const updated: any[] = [];
      for (const term of terminations) {
        // Find user by email or TCKN
        let foundUser = null;
        if (term.email) {
          const allUsers = await storage.getAllEmployees();
          foundUser = allUsers.find(u => u.email === term.email);
        }
        if (!foundUser && term.tckn) {
          const allUsers = await storage.getAllEmployees();
          foundUser = allUsers.find(u => u.tckn === term.tckn);
        }
        
        if (foundUser) {
          await db.update(users)
            .set({
              leaveStartDate: term.leaveStartDate || null,
              leaveReason: term.leaveReason || null,
              isActive: term.leaveStartDate ? false : true,
            })
            .where(eq(users.id, foundUser.id));
          updated.push({ id: foundUser.id, name: `${foundUser.firstName} ${foundUser.lastName}`, leaveStartDate: term.leaveStartDate });
        }
      }

      res.json({ success: true, updated: updated.length, details: updated });
    } catch (error: unknown) {
      console.error("Update terminations error:", error);
      res.status(500).json({ message: "İşten ayrılma güncelleme hatası" });
    }
  });

  router.post('/api/admin/import-employees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { employees, deleteExisting } = req.body;
      if (!Array.isArray(employees)) {
        return res.status(400).json({ message: "employees array gerekli" });
      }

      // Delete existing non-admin users if requested
      if (deleteExisting) {
        const allUsers = await storage.getAllEmployees();
        for (const emp of allUsers) {
          if (emp.role !== 'admin') {
            await storage.deleteUser(emp.id);
          }
        }
      }

      // Import employees
      const created: any[] = [];
      for (const emp of employees) {
        const userData = {
          username: emp.username,
          email: emp.email || undefined,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role || 'barista',
          branchId: emp.branchId || 1,
          hireDate: emp.hireDate || undefined,
          birthDate: emp.birthDate || undefined,
          phoneNumber: emp.phoneNumber || undefined,
          // Extended HR fields
          tckn: emp.tckn || undefined,
          gender: emp.gender || undefined,
          maritalStatus: emp.maritalStatus || undefined,
          department: emp.department || undefined,
          address: emp.address || undefined,
          city: emp.city || undefined,
          militaryStatus: emp.militaryStatus || undefined,
          educationLevel: emp.educationLevel || undefined,
          educationStatus: emp.educationStatus || undefined,
          educationInstitution: emp.educationInstitution || undefined,
          contractType: emp.contractType || undefined,
          homePhone: emp.homePhone || undefined,
          numChildren: emp.numChildren || 0,
          disabilityLevel: emp.disabilityLevel || 'Yok',
          leaveStartDate: emp.leaveStartDate || undefined,
          leaveReason: emp.leaveReason || undefined,
          accountStatus: 'approved',
        };
        
        try {
          const user = await storage.createUser(userData as any);
          created.push({ id: user.id, name: `${user.firstName} ${user.lastName}` });
        } catch (err) {
          console.error(`Personel ekleme hatası: ${emp.firstName} ${emp.lastName}`, err.message);
        }
      }

      res.json({ success: true, imported: created.length, details: created });
    } catch (error: unknown) {
      console.error("Import employees error:", error);
      res.status(500).json({ message: "Personel ekleme hatası" });
    }
  });

  router.get('/api/system-health-check', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      const checks: { name: string; status: 'ok' | 'error'; latency?: number; error?: string }[] = [];

      // 1. Veritabanı bağlantısı
      const dbStart = Date.now();
      try {
        await db.select({ count: sql`1` }).from(users);
        checks.push({ name: 'Veritabanı Bağlantısı', status: 'ok', latency: Date.now() - dbStart });
      } catch (e) {
        checks.push({ name: 'Veritabanı Bağlantısı', status: 'error', error: 'Bağlantı hatası' });
      }

      // 2. Personel verileri
      const empStart = Date.now();
      try {
        const empCount = await db.select({ count: sql`COUNT(*)` }).from(users);
        checks.push({ name: 'Personel Verileri', status: 'ok', latency: Date.now() - empStart });
      } catch (e) {
        checks.push({ name: 'Personel Verileri', status: 'error', error: 'Sorgu hatası' });
      }

      // 3. Şube verileri
      const branchStart = Date.now();
      try {
        const branchCount = await db.select({ count: sql`COUNT(*)` }).from(branches);
        checks.push({ name: 'Şube Verileri', status: 'ok', latency: Date.now() - branchStart });
      } catch (e) {
        checks.push({ name: 'Şube Verileri', status: 'error', error: 'Sorgu hatası' });
      }

      // 4. Ekipman verileri
      const eqStart = Date.now();
      try {
        const eqCount = await db.select({ count: sql`COUNT(*)` }).from(equipment);
        checks.push({ name: 'Ekipman Verileri', status: 'ok', latency: Date.now() - eqStart });
      } catch (e) {
        checks.push({ name: 'Ekipman Verileri', status: 'error', error: 'Sorgu hatası' });
      }

      // 5. Görev verileri
      const taskStart = Date.now();
      try {
        const taskCount = await db.select({ count: sql`COUNT(*)` }).from(tasks);
        checks.push({ name: 'Görev Verileri', status: 'ok', latency: Date.now() - taskStart });
      } catch (e) {
        checks.push({ name: 'Görev Verileri', status: 'error', error: 'Sorgu hatası' });
      }

      // 6. Mesai verileri
      const attendanceStart = Date.now();
      try {
        const attCount = await db.select({ count: sql`COUNT(*)` }).from(shiftAttendance);
        checks.push({ name: 'Mesai Verileri', status: 'ok', latency: Date.now() - attendanceStart });
      } catch (e) {
        checks.push({ name: 'Mesai Verileri', status: 'error', error: 'Sorgu hatası' });
      }

      // 7. İzin bakiyeleri
      const leaveStart = Date.now();
      try {
        const leaveCount = await db.select({ count: sql`COUNT(*)` }).from(employeeLeaves);
        checks.push({ name: 'İzin Bakiyeleri', status: 'ok', latency: Date.now() - leaveStart });
      } catch (e) {
        checks.push({ name: 'İzin Bakiyeleri', status: 'error', error: 'Sorgu hatası' });
      }

      // 8. Resmi tatiller
      const holidayStart = Date.now();
      try {
        const holidayCount = await db.select({ count: sql`COUNT(*)` }).from(publicHolidays);
        checks.push({ name: 'Resmi Tatiller', status: 'ok', latency: Date.now() - holidayStart });
      } catch (e) {
        checks.push({ name: 'Resmi Tatiller', status: 'error', error: 'Sorgu hatası' });
      }

      const allOk = checks.every(c => c.status === 'ok');
      const avgLatency = checks.filter(c => c.latency).reduce((sum, c) => sum + (c.latency || 0), 0) / checks.filter(c => c.latency).length;

      res.json({
        overall: allOk ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        avgLatency: Math.round(avgLatency),
        checks,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "SystemHealthCheck");
    }
  });

  router.get('/api/admin/permission-actions', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const groupedActions = await getAllActionsGroupedByModule();
      res.json(groupedActions);
    } catch (error: unknown) {
      console.error("Get permission actions error:", error);
      res.status(500).json({ message: "Aksiyon listesi alınamadı" });
    }
  });

  router.get('/api/admin/role-grants/:role', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role } = req.params;
      const grants = await getRoleGrants(role);
      res.json(grants);
    } catch (error: unknown) {
      console.error("Get role grants error:", error);
      res.status(500).json({ message: "Rol izinleri alınamadı" });
    }
  });

  router.post('/api/admin/role-grants', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role, actionId, scope, isActive } = req.body;
      
      if (!role || !actionId || !scope) {
        return res.status(400).json({ message: "role, actionId ve scope gerekli" });
      }
      
      const validScopes = ['self', 'branch', 'global'];
      if (!validScopes.includes(scope)) {
        return res.status(400).json({ message: "Geçersiz scope değeri" });
      }
      
      const grantId = await upsertPermissionGrant(role, actionId, scope, isActive ?? true);
      res.json({ success: true, grantId });
    } catch (error: unknown) {
      console.error("Upsert role grant error:", error);
      res.status(500).json({ message: "İzin güncellenemedi" });
    }
  });

  router.delete('/api/admin/role-grants/:role/:actionId', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role, actionId } = req.params;
      await deletePermissionGrant(role, parseInt(actionId));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete role grant error:", error);
      res.status(500).json({ message: "İzin silinemedi" });
    }
  });

  router.get('/api/admin/announcements', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'marketing', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const results = await db.select()
        .from(announcements)
        .where(isNull(announcements.deletedAt))
        .orderBy(desc(announcements.createdAt));
      
      res.json(results);
    } catch (error: unknown) {
      console.error("Admin get announcements error:", error);
      res.status(500).json({ message: "Duyurular alınamadı" });
    }
  });

  router.post('/api/admin/announcements', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'marketing', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { title, message, summary, category, targetRoles, targetBranches, priority, 
              bannerImageUrl, bannerTitle, bannerSubtitle, showOnDashboard, bannerPriority,
              isPinned, expiresAt, detailedContent, ctaLink, ctaText, 
              requiresAcknowledgment, status } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ message: "Başlık ve mesaj gerekli" });
      }
      
      const [newAnnouncement] = await db.insert(announcements)
        .values({
          createdById: req.user.id,
          title,
          message,
          summary,
          category: category || 'general',
          targetRoles,
          targetBranches,
          priority: priority || 'normal',
          bannerImageUrl,
          bannerTitle,
          bannerSubtitle,
          showOnDashboard: showOnDashboard || false,
          bannerPriority: bannerPriority || 0,
          isPinned: isPinned || false,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          detailedContent: detailedContent || null,
          ctaLink: ctaLink || null,
          ctaText: ctaText || null,
          requiresAcknowledgment: requiresAcknowledgment || false,
          status: status || 'published',
        })
        .returning();
      
      res.json(newAnnouncement);
    } catch (error: unknown) {
      console.error("Create announcement error:", error);
      res.status(500).json({ message: "Duyuru oluşturulamadı" });
    }
  });

  router.patch('/api/admin/announcements/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'marketing', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }
      
      updates.updatedAt = new Date();
      
      const [updated] = await db.update(announcements)
        .set(updates)
        .where(eq(announcements.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update announcement error:", error);
      res.status(500).json({ message: "Duyuru güncellenemedi" });
    }
  });

  router.delete('/api/admin/announcements/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'marketing', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { id } = req.params;
      
      await db.update(announcements)
        .set({ deletedAt: new Date() })
        .where(eq(announcements.id, parseInt(id)));
      
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "announcements",
        resourceId: String(id),
        details: { softDelete: true },
      });
      
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ message: "Duyuru silinemedi" });
    }
  });

  router.get('/api/role-templates', isAuthenticated, async (req, res) => {
    try {
      const domain = req.query.domain as string | undefined;
      const templates = await storage.getRoleTemplates(domain);
      res.json(templates);
    } catch (error: unknown) {
      console.error("Get role templates error:", error);
      res.status(500).json({ message: "Şablonlar getirilemedi" });
    }
  });

  router.get('/api/role-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getRoleTemplate(id);
      if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });
      res.json(template);
    } catch (error: unknown) {
      console.error("Get role template error:", error);
      res.status(500).json({ message: "Şablon getirilemedi" });
    }
  });

  router.post('/api/role-templates', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const template = await storage.createRoleTemplate(req.body);
      res.json(template);
    } catch (error: unknown) {
      console.error("Create role template error:", error);
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });

  router.patch('/api/role-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const template = await storage.updateRoleTemplate(id, req.body);
      res.json(template);
    } catch (error: unknown) {
      console.error("Update role template error:", error);
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });

  router.delete('/api/role-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteRoleTemplate(id);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete role template error:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });

  router.get('/api/admin/mega-modules', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const configs = await db.select().from(megaModuleConfig).orderBy(megaModuleConfig.sortOrder);
      const items = await db.select().from(megaModuleItems).orderBy(megaModuleItems.sortOrder);
      res.json({ configs, items });
    } catch (error: unknown) {
      console.error("Error fetching mega modules:", error);
      res.status(500).json({ message: "Mega modül verileri alınamadı" });
    }
  });

  router.post('/api/admin/mega-modules/config', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { configs } = req.body;
      if (!Array.isArray(configs)) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }
      for (const config of configs) {
        const existing = await db.select().from(megaModuleConfig).where(eq(megaModuleConfig.megaModuleId, config.megaModuleId)).limit(1);
        if (existing.length > 0) {
          await db.update(megaModuleConfig).set({
            megaModuleName: config.megaModuleName,
            megaModuleNameTr: config.megaModuleNameTr,
            icon: config.icon,
            color: config.color,
            sortOrder: config.sortOrder,
            isActive: config.isActive,
            updatedAt: new Date(),
          }).where(eq(megaModuleConfig.megaModuleId, config.megaModuleId));
        } else {
          await db.insert(megaModuleConfig).values({
            megaModuleId: config.megaModuleId,
            megaModuleName: config.megaModuleName,
            megaModuleNameTr: config.megaModuleNameTr,
            icon: config.icon,
            color: config.color,
            sortOrder: config.sortOrder,
            isActive: config.isActive ?? true,
          });
        }
      }
      res.json({ success: true, message: "Mega modül konfigürasyonu kaydedildi" });
    } catch (error: unknown) {
      console.error("Error saving mega module config:", error);
      res.status(500).json({ message: "Mega modül konfigürasyonu kaydedilemedi" });
    }
  });

  router.post('/api/admin/mega-modules/items', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }
      // Use transaction to ensure atomic update
      await db.transaction(async (tx) => {
        await tx.delete(megaModuleItems);
        if (items.length > 0) {
          await tx.insert(megaModuleItems).values(items.map((item: any, index: number) => ({
            megaModuleId: item.megaModuleId,
            subModuleId: item.subModuleId,
            subModulePath: item.subModulePath,
            subModuleName: item.subModuleName,
            subModuleNameTr: item.subModuleNameTr,
            icon: item.icon,
            sortOrder: item.sortOrder ?? index,
            isActive: item.isActive ?? true,
          })));
        }
      });
      res.json({ success: true, message: "Modül atamaları kaydedildi" });
    } catch (error: unknown) {
      console.error("Error saving mega module items:", error);
      res.status(500).json({ message: "Modül atamaları kaydedilemedi" });
    }
  });

  router.post("/api/admin/mega-modules/add-module", isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { moduleKey, label, megaModuleId } = req.body;
      if (!moduleKey || !label || !megaModuleId) {
        return res.status(400).json({ message: "Modül anahtarı, adı ve mega modül gerekli" });
      }
      // Aynı key var mı kontrol et
      const existing = await db.select().from(megaModuleItems).where(eq(megaModuleItems.subModuleId, moduleKey)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Bu modül anahtarı zaten mevcut" });
      }
      // Son sortOrder bul
      const lastItem = await db.select().from(megaModuleItems).where(eq(megaModuleItems.megaModuleId, megaModuleId)).orderBy(desc(megaModuleItems.sortOrder)).limit(1);
      const newSortOrder = (lastItem[0]?.sortOrder ?? 0) + 1;
      // Yeni modül ekle
      await db.insert(megaModuleItems).values({
        megaModuleId,
        subModuleId: moduleKey,
        subModulePath: "/" + moduleKey.replace(/_/g, "-"),
        subModuleName: moduleKey,
        subModuleNameTr: label,
        sortOrder: newSortOrder,
        isActive: true,
      });
      res.json({ success: true, message: "Modül eklendi" });
    } catch (error: unknown) {
      console.error("Error adding module:", error);
      res.status(500).json({ message: "Modül eklenemedi" });
    }
  });

  router.put('/api/admin/mega-modules/items/:subModuleId', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { subModuleId } = req.params;
      const { megaModuleId, sortOrder } = req.body;
      const existing = await db.select().from(megaModuleItems).where(eq(megaModuleItems.subModuleId, subModuleId)).limit(1);
      if (existing.length > 0) {
        await db.update(megaModuleItems).set({
          megaModuleId: megaModuleId ?? existing[0].megaModuleId,
          sortOrder: sortOrder ?? existing[0].sortOrder,
        }).where(eq(megaModuleItems.subModuleId, subModuleId));
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Modül ataması bulunamadı" });
      }
    } catch (error: unknown) {
      console.error("Error updating mega module item:", error);
      res.status(500).json({ message: "Modül ataması güncellenemedi" });
    }
  });

  router.get('/api/admin/widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const widgets = await db.select().from(dashboardWidgets).orderBy(asc(dashboardWidgets.sortOrder));
      res.json(widgets);
    } catch (error: unknown) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ message: 'Widget listesi alınamadı' });
    }
  });

  router.post('/api/admin/widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const parsed = insertDashboardWidgetSchema.parse({ ...req.body, createdBy: user.id });
      const [widget] = await db.insert(dashboardWidgets).values(parsed).returning();
      res.json(widget);
    } catch (error: unknown) {
      console.error('Error creating widget:', error);
      res.status(500).json({ message: 'Widget oluşturulamadı' });
    }
  });

  router.patch('/api/admin/widgets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const widgetId = parseInt(req.params.id);
      const [updated] = await db.update(dashboardWidgets)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(dashboardWidgets.id, widgetId))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: 'Widget bulunamadı' });
      }
      res.json(updated);
    } catch (error: unknown) {
      console.error('Error updating widget:', error);
      res.status(500).json({ message: 'Widget güncellenemedi' });
    }
  });

  router.delete('/api/admin/widgets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const widgetId = parseInt(req.params.id);
      const [deleted] = await db.delete(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId))
        .returning();
      if (!deleted) {
        return res.status(404).json({ message: 'Widget bulunamadı' });
      }
      res.json({ message: 'Widget silindi' });
    } catch (error: unknown) {
      console.error('Error deleting widget:', error);
      res.status(500).json({ message: 'Widget silinemedi' });
    }
  });

  router.get('/api/admin/module-visibility', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const visibility = await db.select().from(dashboardModuleVisibility);
      res.json(visibility);
    } catch (error: unknown) {
      console.error('Error fetching module visibility:', error);
      res.status(500).json({ message: 'Modül görünürlük ayarları alınamadı' });
    }
  });

  router.patch('/api/admin/module-visibility/:moduleId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }
      const { moduleId } = req.params;
      const { displayLocation, roles } = req.body;
      const existing = await db.select().from(dashboardModuleVisibility)
        .where(eq(dashboardModuleVisibility.moduleId, moduleId));
      let result;
      if (existing.length > 0) {
        [result] = await db.update(dashboardModuleVisibility)
          .set({ displayLocation, roles, updatedBy: user.id, updatedAt: new Date() })
          .where(eq(dashboardModuleVisibility.moduleId, moduleId))
          .returning();
      } else {
        [result] = await db.insert(dashboardModuleVisibility)
          .values({ moduleId, displayLocation, roles, updatedBy: user.id })
          .returning();
      }
      res.json(result);
    } catch (error: unknown) {
      console.error('Error updating module visibility:', error);
      res.status(500).json({ message: 'Modül görünürlük ayarları güncellenemedi' });
    }
  });

  router.get('/api/admin/dashboard-widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const allWidgets = await db.select().from(dashboardWidgetItems)
        .orderBy(asc(dashboardWidgetItems.displayOrder));

      res.json(allWidgets);
    } catch (error: unknown) {
      console.error("Error fetching admin dashboard widgets:", error);
      res.status(500).json({ message: "Dashboard widget'ları yüklenemedi" });
    }
  });

  router.post('/api/admin/dashboard-widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const parsed = insertDashboardWidgetItemSchema.parse(req.body);
      const [created] = await db.insert(dashboardWidgetItems).values(parsed).returning();
      res.json(created);
    } catch (error: unknown) {
      console.error("Error creating dashboard widget:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Widget oluşturulamadı" });
    }
  });

  router.patch('/api/admin/dashboard-widgets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      const { title, subtitle, type, icon, url, targetRoles, displayOrder, isActive } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (subtitle !== undefined) updateData.subtitle = subtitle;
      if (type !== undefined) updateData.type = type;
      if (icon !== undefined) updateData.icon = icon;
      if (url !== undefined) updateData.url = url;
      if (targetRoles !== undefined) updateData.targetRoles = targetRoles;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Güncellenecek alan bulunamadı" });
      }

      const [updated] = await db.update(dashboardWidgetItems)
        .set(updateData)
        .where(eq(dashboardWidgetItems.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Widget bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating dashboard widget:", error);
      res.status(500).json({ message: "Widget güncellenemedi" });
    }
  });

  router.delete('/api/admin/dashboard-widgets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      await db.delete(dashboardWidgetItems).where(eq(dashboardWidgetItems.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting dashboard widget:", error);
      res.status(500).json({ message: "Widget silinemedi" });
    }
  });

  router.post("/api/admin/test-notification", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const userId = String(user.id);

      const created = await storage.createNotification({
        userId,
        branchId: user.branchId || null,
        type: "system",
        title: "Test Bildirimi",
        message: "Bu bir test bildirimidir.",
        isRead: false,
      });

      const [row] = await db.select({ cnt: count() }).from(notifications).where(eq(notifications.userId, userId));
      const countForUser = row?.cnt ?? 0;

      if (countForUser === 0) {
        console.error("[TEST-NOTIF] COUNT is 0 after insert! userId:", userId, "insertedId:", created.id);
        return res.status(500).json({ ok: false, error: "Insert succeeded but count is 0", userId, insertedId: created.id, countForUser });
      }

      res.json({ ok: true, userId, insertedId: created.id, countForUser });
    } catch (err) {
      console.error("Test notification error:", err);
      res.status(500).json({ error: "Test bildirimi oluşturulurken hata oluştu" });
    }
  });

  // ===============================================
  // AUDIT LOGS - Denetim Günlüğü API
  // ===============================================

  // IMPORTANT: /export and /stats routes MUST come before /:id to avoid Express matching them as :id param
  router.get('/api/audit-logs/export', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ error: 'Yetkiniz yok' });
      }

      const conditions: any[] = [];
      if (req.query.eventType) {
        conditions.push(sql`${auditLogs.eventType} = ${req.query.eventType}`);
      }
      if (req.query.userId) {
        conditions.push(eq(auditLogs.userId, req.query.userId as string));
      }
      if (req.query.resource) {
        conditions.push(eq(auditLogs.resource, req.query.resource as string));
      }
      if (req.query.branchId) {
        conditions.push(eq(auditLogs.scopeBranchId, parseInt(req.query.branchId as string)));
      }
      if (req.query.startDate) {
        const sd = req.query.startDate as string;
        conditions.push(sql`${auditLogs.createdAt} >= ${sd}::timestamp`);
      }
      if (req.query.endDate) {
        const ed = req.query.endDate as string;
        conditions.push(sql`${auditLogs.createdAt} <= (${ed}::date + interval '1 day')`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db.select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        userId: auditLogs.userId,
        actorRole: auditLogs.actorRole,
        scopeBranchId: auditLogs.scopeBranchId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        requestId: auditLogs.requestId,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        actorName: sql<string>`(SELECT COALESCE(u.first_name || ' ' || u.last_name, u.username) FROM users u WHERE u.id = ${auditLogs.userId} LIMIT 1)`.as('actor_name'),
        branchName: sql<string>`(SELECT b.name FROM branches b WHERE b.id = ${auditLogs.scopeBranchId} LIMIT 1)`.as('branch_name'),
      })
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(5000);

      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvHeader = "ID,Tarih,Kullanici,Rol,Sube,Olay,Islem,Kaynak,KaynakID,IP,RequestID\n";
      const csvRows = logs.map(log => {
        const date = log.createdAt ? new Date(log.createdAt).toISOString() : '';
        return [
          String(log.id),
          date,
          escapeCsv(log.actorName || log.userId || ''),
          escapeCsv(log.actorRole || ''),
          escapeCsv((log.branchName || log.scopeBranchId || '').toString()),
          escapeCsv(log.eventType),
          escapeCsv(log.action),
          escapeCsv(log.resource),
          escapeCsv(log.resourceId || ''),
          escapeCsv(log.ipAddress || ''),
          escapeCsv(log.requestId || ''),
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=denetim-gunlugu-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csvHeader + csvRows);
    } catch (error: unknown) {
      console.error('[AuditLog] Export error:', error);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=denetim-gunlugu-hata.csv`);
      res.send('\ufeffID,Hata\n1,Export sirasinda hata olustu');
    }
  });

  router.get('/api/audit-logs/stats/event-types', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ error: 'Yetkiniz yok' });
      }

      const result = await db.select({
        eventType: auditLogs.eventType,
        cnt: count(),
      })
        .from(auditLogs)
        .groupBy(auditLogs.eventType)
        .orderBy(desc(count()));

      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ error: 'İstatistik yüklenemedi' });
    }
  });

  router.get('/api/audit-logs/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ error: 'Yetkiniz yok' });
      }

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Gecersiz ID' });
      }

      const [log] = await db.select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        userId: auditLogs.userId,
        actorRole: auditLogs.actorRole,
        scopeBranchId: auditLogs.scopeBranchId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        targetResource: auditLogs.targetResource,
        targetResourceId: auditLogs.targetResourceId,
        before: auditLogs.before,
        after: auditLogs.after,
        details: auditLogs.details,
        requestId: auditLogs.requestId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        actorName: sql<string>`(SELECT COALESCE(u.first_name || ' ' || u.last_name, u.username) FROM users u WHERE u.id = ${auditLogs.userId} LIMIT 1)`.as('actor_name'),
        branchName: sql<string>`(SELECT b.name FROM branches b WHERE b.id = ${auditLogs.scopeBranchId} LIMIT 1)`.as('branch_name'),
      })
        .from(auditLogs)
        .where(eq(auditLogs.id, logId));

      if (!log) {
        return res.status(404).json({ error: 'Kayıt bulunamadı' });
      }

      res.json(log);
    } catch (error: unknown) {
      console.error('[AuditLog] Detail error:', error);
      res.status(500).json({ error: 'Denetim kaydı yüklenemedi' });
    }
  });

  router.get('/api/admin/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ error: 'Yetkiniz yok' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (req.query.eventType) {
        conditions.push(sql`${auditLogs.eventType} = ${req.query.eventType}`);
      }
      if (req.query.action) {
        conditions.push(eq(auditLogs.action, req.query.action as string));
      }
      if (req.query.userId) {
        conditions.push(eq(auditLogs.userId, req.query.userId as string));
      }
      if (req.query.resource) {
        conditions.push(eq(auditLogs.resource, req.query.resource as string));
      }
      if (req.query.branchId) {
        conditions.push(eq(auditLogs.scopeBranchId, parseInt(req.query.branchId as string)));
      }
      if (req.query.startDate) {
        const sd = req.query.startDate as string;
        conditions.push(sql`${auditLogs.createdAt} >= ${sd}::timestamp`);
      }
      if (req.query.endDate) {
        const ed = req.query.endDate as string;
        conditions.push(sql`${auditLogs.createdAt} <= (${ed}::date + interval '1 day')`);
      }
      if (req.query.search) {
        const searchTerm = `%${req.query.search}%`;
        conditions.push(sql`(${auditLogs.eventType} ILIKE ${searchTerm} OR ${auditLogs.action} ILIKE ${searchTerm} OR ${auditLogs.resource} ILIKE ${searchTerm})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db.select({ cnt: count() })
        .from(auditLogs)
        .where(whereClause);

      const logs = await db.select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        userId: auditLogs.userId,
        actorRole: auditLogs.actorRole,
        scopeBranchId: auditLogs.scopeBranchId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        targetResource: auditLogs.targetResource,
        targetResourceId: auditLogs.targetResourceId,
        before: auditLogs.before,
        after: auditLogs.after,
        details: auditLogs.details,
        requestId: auditLogs.requestId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        actorName: sql<string>`(SELECT COALESCE(u.first_name || ' ' || u.last_name, u.username) FROM users u WHERE u.id = ${auditLogs.userId} LIMIT 1)`.as('actor_name'),
        branchName: sql<string>`(SELECT b.name FROM branches b WHERE b.id = ${auditLogs.scopeBranchId} LIMIT 1)`.as('branch_name'),
      })
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: countResult?.cnt ?? 0,
          totalPages: Math.ceil((countResult?.cnt ?? 0) / limit),
        },
      });
    } catch (error: unknown) {
      console.error('[AuditLog] List error:', error);
      res.status(500).json({ error: 'Denetim günlüğü yüklenemedi' });
    }
  });

  // ========================================
  // TITLES CRUD - Ünvan Yönetimi
  // ========================================

  router.get('/api/admin/titles', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const allTitles = await db.select().from(titles).orderBy(asc(titles.name));
      res.json(allTitles);
    } catch (error: unknown) {
      console.error("Get titles error:", error);
      res.status(500).json({ message: "Ünvanlar yüklenemedi" });
    }
  });

  router.post('/api/admin/titles', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const parsed = insertTitleSchema.parse(req.body);
      const [created] = await db.insert(titles).values(parsed).returning();
      res.json(created);
    } catch (error: unknown) {
      console.error("Create title error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ message: "Bu ünvan adı zaten mevcut" });
      }
      res.status(500).json({ message: "Ünvan oluşturulamadı" });
    }
  });

  router.patch('/api/admin/titles/:id', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const id = parseInt(req.params.id);
      const existing = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
      if (!existing.length) return res.status(404).json({ message: "Ünvan bulunamadı" });
      if (existing[0].isSystem) {
        const { name, scope, isSystem, isDeletable, ...safeUpdates } = req.body;
        const [updated] = await db.update(titles).set({ ...safeUpdates, updatedAt: new Date() }).where(eq(titles.id, id)).returning();
        return res.json(updated);
      }
      const [updated] = await db.update(titles).set({ ...req.body, updatedAt: new Date() }).where(eq(titles.id, id)).returning();
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update title error:", error);
      res.status(500).json({ message: "Ünvan güncellenemedi" });
    }
  });

  router.delete('/api/admin/titles/:id', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const id = parseInt(req.params.id);
      const existing = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
      if (!existing.length) return res.status(404).json({ message: "Ünvan bulunamadı" });
      if (!existing[0].isDeletable) {
        return res.status(400).json({ message: "Bu ünvan silinemez (sistem ünvanı)" });
      }
      await db.update(users).set({ titleId: null }).where(eq(users.titleId, id));
      await db.delete(titles).where(eq(titles.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete title error:", error);
      res.status(500).json({ message: "Ünvan silinemedi" });
    }
  });

  // ========================================
  // ROLE TEMPLATES EXTENDED - Admin koruma
  // ========================================

  router.patch('/api/admin/role-templates/:id/permissions', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const id = parseInt(req.params.id);
      const existing = await db.select().from(roleTemplates).where(eq(roleTemplates.id, id)).limit(1);
      if (!existing.length) return res.status(404).json({ message: "Rol şablonu bulunamadı" });
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: "Geçersiz izin formatı" });
      }
      const [updated] = await db.update(roleTemplates).set({ permissions, updatedAt: new Date() }).where(eq(roleTemplates.id, id)).returning();
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update role template permissions error:", error);
      res.status(500).json({ message: "Rol izinleri güncellenemedi" });
    }
  });

  router.delete('/api/admin/role-templates/:id', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const id = parseInt(req.params.id);
      const existing = await db.select().from(roleTemplates).where(eq(roleTemplates.id, id)).limit(1);
      if (!existing.length) return res.status(404).json({ message: "Rol şablonu bulunamadı" });
      if (!existing[0].isDeletable) {
        return res.status(400).json({ message: "Bu rol silinemez (sistem rolü)" });
      }
      await db.delete(roleTemplates).where(eq(roleTemplates.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete role template error:", error);
      res.status(500).json({ message: "Rol şablonu silinemedi" });
    }
  });

  // ========================================
  // USER TITLE & ROLE ASSIGNMENT
  // ========================================

  router.patch('/api/admin/users/:id/title', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const userId = req.params.id;
      const { titleId } = req.body;
      const [updated] = await db.update(users).set({ titleId: titleId || null, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
      if (!updated) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      res.json({ success: true, titleId: updated.titleId });
    } catch (error: unknown) {
      console.error("Assign user title error:", error);
      res.status(500).json({ message: "Ünvan atanamadı" });
    }
  });

  router.patch('/api/admin/users/:id/role', isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const userId = req.params.id;
      const { role } = req.body;
      if (!role) return res.status(400).json({ message: "Rol belirtilmedi" });

      const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

      if (targetUser.role === 'admin' && role !== 'admin') {
        const adminCount = await db.select({ cnt: count() }).from(users).where(and(eq(users.role, 'admin'), isNull(users.deletedAt)));
        if (adminCount[0]?.cnt <= 1) {
          return res.status(400).json({ message: "Son admin kullanıcısının rolü değiştirilemez" });
        }
      }

      const [updated] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
      res.json({ success: true, role: updated.role });
    } catch (error: unknown) {
      console.error("Assign user role error:", error);
      res.status(500).json({ message: "Rol atanamadı" });
    }
  });

  router.get('/api/revisions/:tableName/:recordId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }
      const { tableName, recordId } = req.params;
      const revisions = await db.select().from(recordRevisions)
        .where(and(
          eq(recordRevisions.tableName, tableName),
          eq(recordRevisions.recordId, parseInt(recordId))
        ))
        .orderBy(desc(recordRevisions.revisionNumber));
      res.json(revisions);
    } catch (error: unknown) {
      console.error("Get revisions error:", error);
      res.status(500).json({ message: "Revizyon geçmişi alınamadı" });
    }
  });

  router.get('/api/admin/data-lock-rules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const rules = await db.select().from(dataLockRules).orderBy(asc(dataLockRules.id));
      res.json(rules);
    } catch (error: unknown) {
      console.error("Get data lock rules error:", error);
      res.status(500).json({ message: "Kilit kuralları alınamadı" });
    }
  });

  router.patch('/api/admin/data-lock-rules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const { id } = req.params;
      const updateSchema = z.object({
        lockAfterDays: z.number().nullable().optional(),
        lockOnStatus: z.string().nullable().optional(),
        lockImmediately: z.boolean().optional(),
        canRequestChange: z.boolean().optional(),
        isActive: z.boolean().optional(),
        description: z.string().nullable().optional(),
      });
      const data = updateSchema.parse(req.body);
      const [updated] = await db.update(dataLockRules)
        .set(data)
        .where(eq(dataLockRules.id, parseInt(id)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Kural bulunamadı" });

      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "system.config_changed",
        action: "updated",
        resource: "data_lock_rules",
        resourceId: id,
        details: data,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update data lock rule error:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Geçersiz veri" });
      res.status(500).json({ message: "Kilit kuralı güncellenemedi" });
    }
  });

  router.get('/api/admin/notification-stats', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!userRole || !['admin', 'ceo'].includes(userRole)) {
        return res.status(403).json({ message: 'Yetkiniz yok' });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const [totalRow] = await db.select({ cnt: count() }).from(notifications);
      const [readRow] = await db.select({ cnt: count() }).from(notifications).where(eq(notifications.isRead, true));
      const [unreadRow] = await db.select({ cnt: count() }).from(notifications).where(eq(notifications.isRead, false));
      const [oldReadRow] = await db.select({ cnt: count() }).from(notifications).where(
        and(
          eq(notifications.isRead, true),
          lt(notifications.createdAt, cutoff)
        )
      );

      res.json({
        total: totalRow.cnt,
        read: readRow.cnt,
        unread: unreadRow.cnt,
        oldReadCount: oldReadRow.cnt,
      });
    } catch (error: unknown) {
      console.error("Notification stats error:", error);
      res.status(500).json({ message: "Bildirim istatistikleri alınamadı" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PILOT LAUNCH
  // ═══════════════════════════════════════════════════════════

  router.post('/api/admin/pilot-launch', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      if (reqUser.role !== 'admin') {
        return res.status(403).json({ error: "Sadece admin bu işlemi yapabilir" });
      }

      const {
        categories,
        defaultPassword,
        resetPasswords,
      } = req.body;

      if ((!categories || !Array.isArray(categories) || categories.length === 0) && !resetPasswords) {
        return res.status(400).json({ error: "En az bir veri kategorisi veya şifre sıfırlama seçilmelidir" });
      }

      if (resetPasswords && (!defaultPassword || defaultPassword.length < 6)) {
        return res.status(400).json({ error: "Şifre sıfırlama seçildi ama varsayılan şifre en az 6 karakter olmalı" });
      }

      let hashedPassword: string | undefined;
      if (resetPasswords) {
        hashedPassword = await bcrypt.hash(defaultPassword, 10);
      }

      const results: Record<string, { deleted: number }> = {};
      const cats = Array.isArray(categories) ? categories : [];
      let passwordResetCount = 0;

      await db.transaction(async (tx) => {
        if (cats.includes('notifications')) {
          const r = await tx.delete(notifications).returning({ id: notifications.id });
          results.notifications = { deleted: r.length };
        }

        if (cats.includes('audit_logs')) {
          const r = await tx.delete(auditLogs).returning({ id: auditLogs.id });
          results.audit_logs = { deleted: r.length };
        }

        if (cats.includes('performance_scores')) {
          const r = await tx.delete(employeePerformanceScores).returning({ id: employeePerformanceScores.id });
          results.performance_scores = { deleted: r.length };
        }

        if (cats.includes('performance_metrics')) {
          const r = await tx.delete(performanceMetrics).returning({ id: performanceMetrics.id });
          results.performance_metrics = { deleted: r.length };
        }

        if (cats.includes('checklist_history')) {
          const r = await tx.delete(checklistCompletions).returning({ id: checklistCompletions.id });
          results.checklist_history = { deleted: r.length };
        }

        if (cats.includes('crm_scores')) {
          const r1 = await tx.delete(branchAuditScores).returning({ id: branchAuditScores.id });
          const r2 = await tx.delete(auditItemScores).returning({ id: auditItemScores.id });
          results.crm_scores = { deleted: r1.length + r2.length };
        }

        if (cats.includes('sla_history')) {
          const r1 = await tx.update(customerFeedback)
            .set({ slaBreached: false })
            .where(eq(customerFeedback.slaBreached, true))
            .returning({ id: customerFeedback.id });
          results.sla_history = { deleted: r1.length };
        }

        if (resetPasswords && hashedPassword) {
          const r = await tx.update(users)
            .set({ hashedPassword, mustChangePassword: true, updatedAt: new Date() })
            .where(eq(users.isActive, true))
            .returning({ id: users.id });
          passwordResetCount = r.length;
        }

        await tx.update(users)
          .set({ onboardingComplete: false })
          .where(eq(users.isActive, true));

        await tx.update(branches)
          .set({ setupComplete: false })
          .where(eq(branches.isActive, true));

        await tx.insert(siteSettings).values({
          key: "pilot_launched",
          value: "true",
          type: "boolean",
          category: "system",
          description: "Pilot başlatma işlemi yapıldı - mustChangePassword flags preserved on restart",
        }).onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: "true", updatedAt: new Date() },
        });
      });

      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "system.pilot_launch",
        action: "pilot_launch",
        resource: "system",
        details: {
          categories,
          results,
          passwordResetCount,
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        message: "Pilot başlatma işlemi tamamlandı",
        results,
        passwordResetCount,
      });
    } catch (error: unknown) {
      console.error("[Pilot Launch] Error:", error);
      res.status(500).json({ error: "Pilot başlatma başarısız" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // BRANCH ONBOARDING
  // ═══════════════════════════════════════════════════════════

  router.get('/api/admin/branch-setup-status/:branchId', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const branchId = parseInt(req.params.branchId);
      if (isNaN(branchId)) {
        return res.status(400).json({ error: "Geçersiz şube ID" });
      }

      const isAdmin = ['admin', 'coach', 'ceo', 'cgo', 'trainer', 'muhasebe_ik'].includes(reqUser.role);
      if (!isAdmin && reqUser.branchId !== branchId) {
        return res.status(403).json({ error: "Bu şubenin bilgilerine erişim yetkiniz yok" });
      }

      const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
      if (!branch) {
        return res.status(404).json({ error: "Şube bulunamadı" });
      }

      const branchUsers = await db.select({
        id: users.id,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(and(eq(users.branchId, branchId), eq(users.isActive, true)));

      const gaps = await detectSystemGaps();
      const branchGaps = gaps.filter(g => g.targetBranchId === branchId);

      const staffCount = branchUsers.filter(u =>
        ['barista', 'bar_buddy', 'stajyer', 'supervisor', 'mudur', 'supervisor_buddy'].includes(u.role)
      ).length;

      const hasManager = branchUsers.some(u => ['mudur', 'supervisor'].includes(u.role));

      res.json({
        branch: {
          id: branch.id,
          name: branch.name,
          setupComplete: branch.setupComplete || false,
          isActive: branch.isActive,
        },
        staffCount,
        hasManager,
        totalUsers: branchUsers.length,
        gaps: branchGaps,
        completionPercentage: Math.max(0, Math.round(100 - (branchGaps.length * 10))),
      });
    } catch (error: unknown) {
      console.error("[Branch Setup Status] Error:", error);
      res.status(500).json({ error: "Şube kurulum durumu alınamadı" });
    }
  });

  router.post('/api/admin/branch-setup-complete/:branchId', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const branchId = parseInt(req.params.branchId);

      if (!['admin', 'coach', 'mudur', 'supervisor'].includes(reqUser.role)) {
        return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      }

      const isHQ = ['admin', 'coach'].includes(reqUser.role);
      if (!isHQ && reqUser.branchId !== branchId) {
        return res.status(403).json({ error: "Sadece kendi şubenizin kurulumunu tamamlayabilirsiniz" });
      }

      await db.update(branches)
        .set({ setupComplete: true })
        .where(eq(branches.id, branchId));

      res.json({ success: true, message: "Şube kurulumu tamamlandı olarak işaretlendi" });
    } catch (error: unknown) {
      console.error("[Branch Setup Complete] Error:", error);
      res.status(500).json({ error: "İşlem başarısız" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MODULE ACTIVATION CHECKLIST
  // ═══════════════════════════════════════════════════════════

  router.get('/api/admin/module-activation-checklist/:moduleKey', isAuthenticated, async (req, res) => {
    try {
      const { moduleKey } = req.params;
      const reqUser = req.user as any;

      const moduleChecklists: Record<string, { title: string; items: { id: string; title: string; description: string; deepLink: string; required: boolean }[] }> = {
        satinalma: {
          title: "Satınalma Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "supplier-list", title: "Tedarikçi listesi", description: "En az 3 tedarikçi tanımlayın (ad, iletişim, ürün kategorisi)", deepLink: "/satinalma/tedarikci", required: true },
            { id: "raw-materials", title: "Hammadde listesi", description: "Temel hammaddeleri sisteme girin (ad, birim, kategori)", deepLink: "/satinalma/hammaddeler", required: true },
            { id: "approval-flow", title: "Onay akışı", description: "Satınalma onay sürecini yapılandırın", deepLink: "/satinalma/ayarlar", required: false },
          ],
        },
        hr: {
          title: "İK Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "employee-list", title: "Personel listesi", description: "Tüm personeli Excel ile yükleyin (ad, soyad, TC, maaş, izin hakları)", deepLink: "/ik", required: true },
            { id: "leave-policies", title: "İzin politikaları", description: "Yıllık izin, mazeret izni gibi izin tiplerini yapılandırın", deepLink: "/izin-talepleri", required: true },
            { id: "payroll-params", title: "Bordro parametreleri", description: "SGK, vergi oranları ve asgari ücret bilgilerini girin", deepLink: "/bordrom", required: true },
          ],
        },
        checklist: {
          title: "Checklist Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "opening-checklist", title: "Açılış checklist'i", description: "Şube açılış kontrol listesini oluşturun ve atayın", deepLink: "/checklistler", required: true },
            { id: "closing-checklist", title: "Kapanış checklist'i", description: "Şube kapanış kontrol listesini oluşturun ve atayın", deepLink: "/checklistler", required: true },
            { id: "branch-assignments", title: "Şube atamaları", description: "Checklist'leri tüm aktif şubelere atayın", deepLink: "/admin/checklist-yonetimi", required: true },
          ],
        },
        akademi: {
          title: "Akademi Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "training-modules", title: "Eğitim modülleri", description: "En az 5 eğitim modülü oluşturun", deepLink: "/akademi-hq", required: true },
            { id: "training-assignments", title: "Eğitim atamaları", description: "Zorunlu eğitimleri roller bazında atayın", deepLink: "/akademi-hq", required: true },
            { id: "certificate-settings", title: "Sertifika ayarları", description: "Sertifika imzalayan bilgilerini yapılandırın", deepLink: "/akademi-hq?tab=certs", required: false },
          ],
        },
        kalite: {
          title: "Kalite Kontrol Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "haccp-points", title: "HACCP kontrol noktaları", description: "Kritik kontrol noktalarını tanımlayın", deepLink: "/kalite-denetimi", required: true },
            { id: "audit-templates", title: "Denetim şablonları", description: "Kalite denetim şablonlarını oluşturun", deepLink: "/denetim-sablonlari", required: true },
          ],
        },
        fabrika: {
          title: "Fabrika Modülü Kurulum Kontrol Listesi",
          items: [
            { id: "stations", title: "İstasyonlar", description: "Fabrika üretim istasyonlarını tanımlayın", deepLink: "/fabrika", required: true },
            { id: "daily-targets", title: "Üretim hedefleri", description: "Günlük üretim hedeflerini belirleyin", deepLink: "/fabrika/uretim-planlama", required: true },
            { id: "factory-staff", title: "Fabrika personeli", description: "Fabrika çalışanlarını sisteme ekleyin", deepLink: "/admin/kullanicilar", required: true },
          ],
        },
      };

      const checklist = moduleChecklists[moduleKey];
      if (!checklist) {
        return res.json({ title: `${moduleKey} Modülü`, items: [], message: "Bu modül için kontrol listesi henüz tanımlı değil" });
      }

      const moduleGaps = await detectModuleGaps(moduleKey);
      const enrichedItems = checklist.items.map(item => {
        const itemKeywords = item.id.split('-');
        const hasRelatedGap = moduleGaps.some(g =>
          itemKeywords.some(kw => g.id.includes(kw) || g.checkFn.includes(kw))
        );
        return {
          ...item,
          completed: !hasRelatedGap,
        };
      });

      res.json({
        ...checklist,
        items: enrichedItems,
        completionPercentage: Math.round((enrichedItems.filter(i => i.completed).length / enrichedItems.length) * 100),
      });
    } catch (error: unknown) {
      console.error("[Module Checklist] Error:", error);
      res.status(500).json({ error: "Modül kontrol listesi alınamadı" });
    }
  });

  router.get('/api/admin/onboarding-status', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      if (!reqUser.branchId) {
        return res.json({ needsOnboarding: false });
      }

      const [branch] = await db.select().from(branches).where(eq(branches.id, reqUser.branchId));
      if (!branch) {
        return res.json({ needsOnboarding: false });
      }

      const needsOnboarding = branch.isActive && !branch.setupComplete &&
        ['mudur', 'supervisor', 'admin', 'coach'].includes(reqUser.role);

      res.json({
        needsOnboarding,
        branchId: branch.id,
        branchName: branch.name,
      });
    } catch (error: unknown) {
      console.error("[Onboarding Status] Error:", error);
      res.json({ needsOnboarding: false });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ROLE-BASED ONBOARDING
  // ═══════════════════════════════════════════════════════════

  const ROLE_ONBOARDING_DEFINITIONS: Record<string, {
    label: string;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      tasks: Array<{ id: string; title: string; description: string; deepLink: string; required: boolean }>;
    }>;
  }> = {
    admin: {
      label: "Sistem Yöneticisi",
      steps: [
        {
          id: "system-config",
          title: "Sistem Yapılandırması",
          description: "Temel sistem ayarlarını yapılandırın",
          tasks: [
            { id: "site-settings", title: "Site ayarları", description: "Logo, şirket adı ve temel bilgileri girin", deepLink: "/admin/ayarlar", required: true },
            { id: "email-settings", title: "E-posta ayarları", description: "Bildirim e-posta sunucusunu yapılandırın", deepLink: "/admin/email-ayarlari", required: false },
            { id: "module-flags", title: "Modül bayrakları", description: "Aktif olacak modülleri belirleyin", deepLink: "/admin/modul-bayraklari", required: true },
          ],
        },
        {
          id: "user-setup",
          title: "Kullanıcı ve Rol Yönetimi",
          description: "Kullanıcıları ve yetkilendirmeleri düzenleyin",
          tasks: [
            { id: "user-management", title: "Kullanıcı listesi", description: "Tüm kullanıcıları oluşturun veya kontrol edin", deepLink: "/admin/kullanicilar", required: true },
            { id: "role-permissions", title: "Rol yetkileri", description: "Her rol için erişim izinlerini yapılandırın", deepLink: "/admin/yetkilendirme", required: true },
            { id: "branch-assignments", title: "Şube atamaları", description: "Personeli doğru şubelere atayın", deepLink: "/admin/kullanicilar", required: true },
          ],
        },
      ],
    },
    ceo: {
      label: "CEO",
      steps: [
        {
          id: "overview",
          title: "Sisteme Genel Bakış",
          description: "Temel bilgileri inceleyin",
          tasks: [
            { id: "dashboard-review", title: "Dashboard inceleme", description: "Ana dashboard'u inceleyin ve widget'ları özelleştirin", deepLink: "/", required: true },
            { id: "branch-overview", title: "Şube durumları", description: "Tüm şubelerin durumunu kontrol edin", deepLink: "/subeler", required: true },
            { id: "reports-setup", title: "Raporları keşfedin", description: "Mevcut raporlama araçlarını inceleyin", deepLink: "/raporlar", required: false },
          ],
        },
      ],
    },
    mudur: {
      label: "Şube Müdürü",
      steps: [
        {
          id: "branch-setup",
          title: "Şube Kurulumu",
          description: "Şubenizin temel bilgilerini kontrol edin",
          tasks: [
            { id: "staff-upload", title: "Personel listesi", description: "Şube personelini Excel ile yükleyin veya kontrol edin", deepLink: "/ik", required: true },
            { id: "branch-info", title: "Şube bilgileri", description: "Şube adres, telefon ve çalışma saatlerini kontrol edin", deepLink: "/subeler", required: true },
          ],
        },
        {
          id: "daily-ops",
          title: "Günlük Operasyonlar",
          description: "Günlük işlemleri tanıyın",
          tasks: [
            { id: "checklist-review", title: "Checklist'leri inceleyin", description: "Açılış/kapanış checklist'lerini kontrol edin", deepLink: "/checklistler", required: true },
            { id: "shift-planning", title: "Vardiya planlama", description: "Haftalık vardiya planını oluşturun", deepLink: "/vardiya-planlama", required: true },
            { id: "task-review", title: "Görevleri inceleyin", description: "Atanmış görevleri kontrol edin", deepLink: "/gorevler", required: false },
          ],
        },
      ],
    },
    supervisor: {
      label: "Supervisor",
      steps: [
        {
          id: "team-management",
          title: "Ekip Yönetimi",
          description: "Ekibinizi ve görevleri tanıyın",
          tasks: [
            { id: "team-review", title: "Ekip listesi", description: "Ekibinizdeki personeli inceleyin", deepLink: "/ik", required: true },
            { id: "shift-check", title: "Vardiya kontrolü", description: "Bu haftanın vardiya planını kontrol edin", deepLink: "/vardiya-planlama", required: true },
            { id: "daily-checklist", title: "Günlük checklist", description: "Bugünkü checklist'leri doldurun", deepLink: "/checklistler", required: true },
          ],
        },
        {
          id: "quality",
          title: "Kalite ve Performans",
          description: "Kalite kontrol süreçlerini öğrenin",
          tasks: [
            { id: "quality-review", title: "Kalite standartları", description: "Denetim ve kalite kontrol noktalarını inceleyin", deepLink: "/kalite-denetimi", required: false },
            { id: "performance-targets", title: "Performans hedefleri", description: "Ekip performans hedeflerini inceleyin", deepLink: "/performans", required: false },
          ],
        },
      ],
    },
    satinalma: {
      label: "Satınalma Sorumlusu",
      steps: [
        {
          id: "procurement-data",
          title: "Satınalma Verileri",
          description: "Temel satınalma verilerini sisteme girin",
          tasks: [
            { id: "supplier-entry", title: "Tedarikçi tanımlama", description: "En az 3 tedarikçi tanımlayın (ad, iletişim, ürün kategorisi)", deepLink: "/satinalma/tedarikci", required: true },
            { id: "material-entry", title: "Hammadde listesi", description: "Temel hammaddeleri sisteme girin (ad, birim, kategori)", deepLink: "/satinalma/hammaddeler", required: true },
            { id: "purchase-flow", title: "Satınalma akışı", description: "Sipariş oluşturma ve onay sürecini inceleyin", deepLink: "/satinalma", required: true },
          ],
        },
        {
          id: "stock-integration",
          title: "Stok Entegrasyonu",
          description: "Stok ve depo yönetimi bağlantısını kontrol edin",
          tasks: [
            { id: "stock-review", title: "Stok durumu", description: "Mevcut stok durumunu inceleyin", deepLink: "/stok", required: false },
            { id: "min-stock-levels", title: "Minimum stok seviyeleri", description: "Kritik ürünler için minimum stok seviyelerini ayarlayın", deepLink: "/stok", required: false },
          ],
        },
      ],
    },
    muhasebe_ik: {
      label: "Muhasebe / İK Sorumlusu",
      steps: [
        {
          id: "hr-data",
          title: "İK Verileri",
          description: "Personel ve bordro bilgilerini düzenleyin",
          tasks: [
            { id: "employee-data", title: "Personel bilgileri", description: "Tüm personelin TC, maaş, izin hakları bilgilerini kontrol edin", deepLink: "/ik", required: true },
            { id: "leave-policies", title: "İzin politikaları", description: "Yıllık izin, mazeret izni gibi izin tiplerini yapılandırın", deepLink: "/izin-talepleri", required: true },
            { id: "payroll-params", title: "Bordro parametreleri", description: "SGK oranları, vergi dilimleri ve asgari ücret bilgilerini girin", deepLink: "/bordrom", required: true },
          ],
        },
      ],
    },
    coach: {
      label: "Coach",
      steps: [
        {
          id: "coaching-setup",
          title: "Koçluk Alanı",
          description: "Koçluk süreçlerini ve şube durumlarını inceleyin",
          tasks: [
            { id: "branch-performance", title: "Şube performansları", description: "Sorumlu olduğunuz şubelerin performansını inceleyin", deepLink: "/performans", required: true },
            { id: "training-overview", title: "Eğitim durumu", description: "Şube personelinin eğitim tamamlanma oranlarını kontrol edin", deepLink: "/akademi-hq", required: true },
            { id: "audit-templates", title: "Denetim şablonları", description: "Kalite denetim şablonlarını inceleyin", deepLink: "/denetim-sablonlari", required: false },
          ],
        },
      ],
    },
    trainer: {
      label: "Eğitmen",
      steps: [
        {
          id: "training-setup",
          title: "Eğitim İçerikleri",
          description: "Eğitim modüllerini hazırlayın",
          tasks: [
            { id: "training-modules", title: "Eğitim modülleri", description: "Eğitim modüllerini oluşturun veya kontrol edin", deepLink: "/akademi-hq", required: true },
            { id: "training-materials", title: "Eğitim materyalleri", description: "Video, döküman ve quiz içeriklerini yükleyin", deepLink: "/akademi-hq", required: true },
            { id: "training-assignments", title: "Eğitim atamaları", description: "Zorunlu eğitimleri roller bazında atayın", deepLink: "/akademi-hq", required: false },
          ],
        },
      ],
    },
    kalite_kontrol: {
      label: "Kalite Kontrol Sorumlusu",
      steps: [
        {
          id: "quality-setup",
          title: "Kalite Kontrol Kurulumu",
          description: "Kalite ve denetim süreçlerini yapılandırın",
          tasks: [
            { id: "haccp-points", title: "HACCP kontrol noktaları", description: "Kritik kontrol noktalarını tanımlayın", deepLink: "/kalite-denetimi", required: true },
            { id: "audit-templates", title: "Denetim şablonları", description: "Kalite denetim şablonlarını oluşturun", deepLink: "/denetim-sablonlari", required: true },
            { id: "checklists-review", title: "Checklist standartları", description: "Hijyen ve kalite checklist'lerini kontrol edin", deepLink: "/checklistler", required: true },
          ],
        },
      ],
    },
    marketing: {
      label: "Pazarlama Sorumlusu",
      steps: [
        {
          id: "marketing-setup",
          title: "Pazarlama Araçları",
          description: "Duyuru ve içerik araçlarını keşfedin",
          tasks: [
            { id: "announcement-review", title: "Duyuru sistemi", description: "Duyuru oluşturma ve yayınlama sürecini inceleyin", deepLink: "/duyurular", required: true },
            { id: "banner-setup", title: "Banner yönetimi", description: "Uygulama banner'larını tasarlayın", deepLink: "/admin/bannerlar", required: false },
            { id: "content-studio", title: "İçerik stüdyosu", description: "İçerik oluşturma araçlarını keşfedin", deepLink: "/admin/icerik-studyosu", required: false },
          ],
        },
      ],
    },
    fabrika_mudur: {
      label: "Fabrika Müdürü",
      steps: [
        {
          id: "factory-setup",
          title: "Fabrika Kurulumu",
          description: "Fabrika üretim hatlarını yapılandırın",
          tasks: [
            { id: "stations", title: "İstasyonlar", description: "Üretim istasyonlarını tanımlayın ve konfigüre edin", deepLink: "/fabrika", required: true },
            { id: "production-targets", title: "Üretim hedefleri", description: "Günlük üretim hedeflerini belirleyin", deepLink: "/fabrika/uretim-planlama", required: true },
            { id: "factory-staff", title: "Fabrika personeli", description: "Fabrika çalışanlarını kontrol edin", deepLink: "/admin/kullanicilar", required: true },
            { id: "quality-criteria", title: "Kalite kriterleri", description: "Ürün kalite kriterlerini tanımlayın", deepLink: "/admin/kalite-kriterleri", required: false },
          ],
        },
      ],
    },
    barista: {
      label: "Barista",
      steps: [
        {
          id: "barista-intro",
          title: "Sisteme Giriş",
          description: "Günlük iş süreçlerini tanıyın",
          tasks: [
            { id: "recipe-review", title: "Tarifleri inceleyin", description: "Menüdeki ürün tariflerini ve standartlarını öğrenin", deepLink: "/tarifler", required: true },
            { id: "daily-tasks", title: "Günlük görevler", description: "Size atanan günlük görevleri kontrol edin", deepLink: "/gorevler", required: true },
            { id: "training-modules", title: "Eğitimler", description: "Zorunlu eğitim modüllerini tamamlayın", deepLink: "/akademi", required: true },
          ],
        },
      ],
    },
    teknik: {
      label: "Teknik Servis",
      steps: [
        {
          id: "technical-setup",
          title: "Teknik Servis Araçları",
          description: "Ekipman ve arıza yönetim süreçlerini öğrenin",
          tasks: [
            { id: "equipment-list", title: "Ekipman listesi", description: "Şubelerdeki ekipmanları inceleyin", deepLink: "/ekipman", required: true },
            { id: "service-requests", title: "Servis talepleri", description: "Açık servis taleplerini kontrol edin", deepLink: "/servis-talepleri", required: true },
            { id: "maintenance-schedule", title: "Bakım takvimi", description: "Periyodik bakım planını gözden geçirin", deepLink: "/ekipman", required: false },
          ],
        },
      ],
    },
  };

  const FALLBACK_ONBOARDING = {
    label: "Kullanıcı",
    steps: [
      {
        id: "general-intro",
        title: "Sisteme Giriş",
        description: "Temel sistem özelliklerini keşfedin",
        tasks: [
          { id: "dashboard-tour", title: "Dashboard", description: "Ana sayfadaki widget'ları ve bilgileri inceleyin", deepLink: "/", required: true },
          { id: "profile-check", title: "Profil bilgileri", description: "Profil bilgilerinizi kontrol edin ve güncelleyin", deepLink: "/profil", required: true },
          { id: "training-check", title: "Eğitimler", description: "Size atanmış eğitimleri kontrol edin", deepLink: "/akademi", required: false },
        ],
      },
    ],
  };

  router.get('/api/admin/role-onboarding-status', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;

      if (reqUser.onboardingComplete) {
        return res.json({ needsOnboarding: false });
      }

      const role = reqUser.role as string;
      const definition = ROLE_ONBOARDING_DEFINITIONS[role] || FALLBACK_ONBOARDING;

      const allTasks = definition.steps.flatMap(s => s.tasks);
      const totalTasks = allTasks.length;
      const completedTasks = 0;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      const steps = definition.steps.map(s => ({
        ...s,
        tasks: s.tasks.map(t => ({ ...t, completed: false })),
      }));

      res.json({
        needsOnboarding: true,
        role,
        roleLabel: definition.label,
        steps,
        completionPercentage,
        totalTasks,
        completedTasks,
      });
    } catch (error: unknown) {
      console.error("[Role Onboarding Status] Error:", error);
      res.json({ needsOnboarding: false });
    }
  });

  router.post('/api/admin/role-onboarding-complete', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;

      await db.update(users)
        .set({ onboardingComplete: true })
        .where(eq(users.id, reqUser.id));

      res.json({ success: true, message: "Onboarding tamamlandı" });
    } catch (error: unknown) {
      console.error("[Role Onboarding Complete] Error:", error);
      res.status(500).json({ error: "İşlem başarısız" });
    }
  });

// ─── Eskalasyon Konfigürasyon API ─────────────────────────────────────────

router.get("/api/admin/escalation-config", isAuthenticated, isAdminOrCeo, async (req, res) => {
  try {
    const rows = await db.select().from(escalationConfig).orderBy(escalationConfig.level);
    res.json(rows.length >= 3 ? rows : [
      { id: 1, level: 1, name: "Supervisor", targetRoleKey: "supervisor", slaDays: 2, isActive: true, description: "Şube supervisor" },
      { id: 2, level: 2, name: "Müdür", targetRoleKey: "mudur", slaDays: 3, isActive: true, description: "Şube müdürü" },
      { id: 3, level: 3, name: "Coach / Trainer", targetRoleKey: "coach_trainer", slaDays: 7, isActive: true, description: "HQ Coach/Trainer" },
      { id: 4, level: 4, name: "CGO", targetRoleKey: "cgo", slaDays: 14, isActive: true, description: "CGO" },
      { id: 5, level: 5, name: "CEO", targetRoleKey: "ceo", slaDays: 21, isActive: true, description: "CEO" },
    ]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/admin/escalation-config/:level", isAuthenticated, isAdminOrCeo, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const { slaDays, isActive, name, description } = req.body;
    await db.update(escalationConfig)
      .set({ ...(slaDays && { slaDays }), ...(isActive !== undefined && { isActive }), ...(name && { name }), ...(description && { description }), updatedAt: new Date() })
      .where(eq(escalationConfig.level, level));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Rol Yetki Override API ───────────────────────────────────────────────

router.get("/api/admin/role-permissions", isAuthenticated, isAdminOrCeo, async (req, res) => {
  try {
    const overrides = await db.select().from(rolePermissionOverrides);
    res.json(overrides);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/admin/role-permissions", isAuthenticated, isAdminOrCeo, async (req, res) => {
  try {
    const { role, moduleKey, canView, canCreate, canEdit, canDelete, canApprove, isEnabled } = req.body;
    await db.insert(rolePermissionOverrides).values({
      role, moduleKey,
      canView: canView ?? true,
      canCreate: canCreate ?? false,
      canEdit: canEdit ?? false,
      canDelete: canDelete ?? false,
      canApprove: canApprove ?? false,
      isEnabled: isEnabled ?? true,
      updatedByUserId: String(req.user?.id),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [rolePermissionOverrides.role, rolePermissionOverrides.moduleKey],
      set: { canView, canCreate, canEdit, canDelete, canApprove, isEnabled, updatedByUserId: String(req.user?.id), updatedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ═══ TEST VERİSİ SIFIRLAMA ═══
router.post("/api/admin/reset-test-data", isAuthenticated, isAdminOrCeo, async (req, res) => {
  try {
    const results: Record<string, number> = {};
    
    const tables = [
      { name: "customer_feedback", query: sql`DELETE FROM customer_feedback WHERE source = 'seed_test'` },
      { name: "tasks", query: sql`DELETE FROM tasks WHERE source_type = 'seed_test'` },
      { name: "equipment_faults", query: sql`DELETE FROM equipment_faults WHERE description LIKE '%[TEST]%'` },
      { name: "support_tickets", query: sql`DELETE FROM support_tickets WHERE title LIKE '%[TEST]%'` },
      { name: "announcements", query: sql`DELETE FROM announcements WHERE title LIKE '%[TEST]%'` },
      { name: "cowork_channels", query: sql`DELETE FROM cowork_channels WHERE name LIKE 'test-%'` },
      { name: "dobody_actions", query: sql`DELETE FROM agent_pending_actions WHERE title LIKE '%[TEST]%'` },
    ];
    
    for (const t of tables) {
      try {
        const r = await db.execute(t.query);
        results[t.name] = (r as any).rowCount || 0;
      } catch (e) {
        results[t.name] = -1;
      }
    }
    
    res.json({ success: true, message: "Test verileri silindi", results });
  } catch (error) {
    console.error("Reset test data error:", error);
    res.status(500).json({ message: "Sıfırlama sırasında hata oluştu" });
  }
});

export default router;
