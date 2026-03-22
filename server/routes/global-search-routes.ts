import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { getRoleAccessibleModules } from "../permission-service";
import { eq, and, max } from "drizzle-orm";
import {
  branches,
  users,
  tasks,
  equipment,
  recipes,
  megaModuleConfig,
  megaModuleItems,
  isHQRole,
} from "@shared/schema";

const router = Router();

  // ==========================================
  // GLOBAL SEARCH API
  // ==========================================
  
  // GET /api/search - Global search across users, recipes, tasks, branches, equipment, modules
  router.get('/api/search', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const query = req.query.q as string;
      
      // Validate query
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Arama sorgusu en az 2 karakter olmalı" });
      }
      
      const isHQ = isHQRole(user.role);
      const userBranchId = user.branchId;
      const userRole = user.role;
      
      // Get user's accessible modules based on role permissions
      const accessibleModules = await getRoleAccessibleModules(userRole);
      const hasAllAccess = accessibleModules.has('all');
      
      // Search modules (mega-modules and sub-modules) with permission filtering
      const searchPattern = query.trim().toLocaleLowerCase('tr-TR');
      
      // Get mega-module configs
      const megaConfigs = await db.select().from(megaModuleConfig).where(eq(megaModuleConfig.isActive, true));
      
      // Get sub-module items
      const subModules = await db.select().from(megaModuleItems).where(eq(megaModuleItems.isActive, true));
      
      // Filter and search modules
      const moduleResults: Array<{
        id: string;
        type: 'mega' | 'sub';
        name: string;
        nameTr: string;
        icon: string;
        path: string;
        megaModuleId?: string;
        megaModuleName?: string;
      }> = [];
      
      // Search mega-modules
      for (const mega of megaConfigs) {
        if (mega.megaModuleName.toLocaleLowerCase('tr-TR').includes(searchPattern) ||
            mega.megaModuleNameTr.toLocaleLowerCase('tr-TR').includes(searchPattern)) {
          // Check if user has access to at least one sub-module in this mega-module
          const megaSubModules = subModules.filter(s => s.megaModuleId === mega.megaModuleId);
          const hasAccessToMega = hasAllAccess || megaSubModules.some(sub => accessibleModules.has(sub.subModuleId));
          
          if (hasAccessToMega) {
            moduleResults.push({
              id: mega.megaModuleId,
              type: 'mega',
              name: mega.megaModuleName,
              nameTr: mega.megaModuleNameTr,
              icon: mega.icon,
              path: `/modul/${mega.megaModuleId}`,
            });
          }
        }
      }
      
      // Search sub-modules with permission check
      for (const sub of subModules) {
        if (sub.subModuleName.toLocaleLowerCase('tr-TR').includes(searchPattern) ||
            sub.subModuleNameTr.toLocaleLowerCase('tr-TR').includes(searchPattern)) {
          // Check if user has access to this module
          if (hasAllAccess || accessibleModules.has(sub.subModuleId)) {
            const parentMega = megaConfigs.find(m => m.megaModuleId === sub.megaModuleId);
            moduleResults.push({
              id: sub.subModuleId,
              type: 'sub',
              name: sub.subModuleName,
              nameTr: sub.subModuleNameTr,
              icon: sub.icon || parentMega?.icon || 'FileText',
              path: sub.subModulePath,
              megaModuleId: sub.megaModuleId,
              megaModuleName: parentMega?.megaModuleNameTr || sub.megaModuleId,
            });
          }
        }
      }
      
      // Check if user can see each entity type
      const canSeeUsers = hasAllAccess || accessibleModules.has('ik') || accessibleModules.has('personel');
      const canSeeRecipes = hasAllAccess || accessibleModules.has('tarifler') || accessibleModules.has('akademi');
      const canSeeTasks = hasAllAccess || accessibleModules.has('gorevler');
      const canSeeBranches = hasAllAccess || accessibleModules.has('subeler');
      const canSeeEquipment = hasAllAccess || accessibleModules.has('ekipman');
      
      // Get permission-filtered search results
      const results = await storage.searchEntitiesWithPermissions(
        query.trim(),
        userBranchId,
        isHQ,
        {
          canSeeUsers,
          canSeeRecipes,
          canSeeTasks,
          canSeeBranches,
          canSeeEquipment,
        },
        5 // max per category
      );
      
      // Add modules to results
      res.json({
        ...results,
        modules: moduleResults.slice(0, 10), // limit to 10 modules
      });
    } catch (error: unknown) {
      console.error("Global search error:", error);
      res.status(500).json({ message: "Arama sırasında hata oluştu" });
    }
  });




export default router;
