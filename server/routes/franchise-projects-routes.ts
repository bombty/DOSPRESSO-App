import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { eq, desc, sum } from "drizzle-orm";
import {
  users,
  tasks,
  franchiseProjects,
  franchiseProjectPhases,
  franchiseProjectTasks,
  franchiseCollaborators,
  franchiseProjectComments,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // FRANCHISE PROJECTS - Franchise Proje Yonetimi API
  // ========================================

  router.get('/api/franchise-projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await db.select().from(franchiseProjects).orderBy(desc(franchiseProjects.createdAt));
      res.json(projects);
    } catch (error: unknown) {
      console.error("Error fetching franchise projects:", error);
      res.status(500).json({ message: "Projeler yuklenemedi" });
    }
  });

  router.get('/api/franchise-projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const [project] = await db.select().from(franchiseProjects).where(eq(franchiseProjects.id, projectId));
      if (!project) return res.status(404).json({ message: "Proje bulunamadi" });

      const phases = await db.select().from(franchiseProjectPhases).where(eq(franchiseProjectPhases.projectId, projectId)).orderBy(franchiseProjectPhases.phaseNumber);
      const tasks = await db.select().from(franchiseProjectTasks).where(eq(franchiseProjectTasks.projectId, projectId));
      const collaborators = await db.select().from(franchiseCollaborators).where(eq(franchiseCollaborators.projectId, projectId));
      const comments = await db.select().from(franchiseProjectComments).where(eq(franchiseProjectComments.projectId, projectId)).orderBy(desc(franchiseProjectComments.createdAt));

      const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, role: users.role, profileImageUrl: users.profileImageUrl }).from(users);

      res.json({ ...project, phases, tasks, collaborators, comments, users: allUsers });
    } catch (error: unknown) {
      console.error("Error fetching franchise project:", error);
      res.status(500).json({ message: "Proje detaylari yuklenemedi" });
    }
  });

  router.post('/api/franchise-projects', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { name, franchiseeName, contactPerson, contactPhone, contactEmail, location, city, estimatedBudget, startDate, expectedEndDate, notes, managerId } = req.body;

      const [project] = await db.insert(franchiseProjects).values({
        name,
        franchiseeName,
        contactPerson,
        contactPhone,
        contactEmail,
        location,
        city,
        estimatedBudget,
        startDate,
        expectedEndDate,
        notes,
        managerId,
        createdBy: user.id,
        status: 'sozlesme',
        currentPhase: 1,
        totalPhases: 7,
        completionPercentage: 0,
      }).returning();

      const defaultPhases = [
        { phaseNumber: 1, name: "Sozlesme ve Planlama", description: "Franchise sozlesmesi imzalanmasi, is plani hazirligi, fizibilite calismasi" },
        { phaseNumber: 2, name: "Mekan Secimi ve Kiralama", description: "Uygun lokasyon arastirmasi, kira sozlesmesi, imar durumu kontrolu" },
        { phaseNumber: 3, name: "Mimari Proje ve Tasarim", description: "Ic mekan tasarimi, dekorasyon projesi, DOSPRESSO marka standartlari uyumu" },
        { phaseNumber: 4, name: "Tadilat ve Insaat", description: "Mekan renovasyonu, altyapi islemleri, elektrik-tesisat, mobilya uretim" },
        { phaseNumber: 5, name: "Ekipman Kurulum", description: "Kahve makineleri, sogutma uniteleri, kasa sistemi, POS entegrasyonu" },
        { phaseNumber: 6, name: "Personel Alim ve Egitim", description: "Kadro olusturma, DOSPRESSO Akademi egitimi, staj donemi" },
        { phaseNumber: 7, name: "Acilis Oncesi ve Acilis", description: "Son kontroller, test servisleri, resmi acilis, marketing kampanyasi" },
      ];

      for (const phase of defaultPhases) {
        await db.insert(franchiseProjectPhases).values({
          projectId: project.id,
          ...phase,
          status: phase.phaseNumber === 1 ? 'in_progress' : 'pending',
          dependsOnPhaseId: phase.phaseNumber > 1 ? phase.phaseNumber - 1 : null,
        });
      }

      res.status(201).json(project);
    } catch (error: unknown) {
      console.error("Error creating franchise project:", error);
      res.status(500).json({ message: "Proje olusturulamadi" });
    }
  });

  router.patch('/api/franchise-projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updates = req.body;
      const [updated] = await db.update(franchiseProjects).set({ ...updates, updatedAt: new Date() }).where(eq(franchiseProjects.id, projectId)).returning();
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating franchise project:", error);
      res.status(500).json({ message: "Proje guncellenemedi" });
    }
  });

  router.patch('/api/franchise-project-phases/:id', isAuthenticated, async (req, res) => {
    try {
      const phaseId = parseInt(req.params.id);
      const updates = req.body;
      const [updated] = await db.update(franchiseProjectPhases).set(updates).where(eq(franchiseProjectPhases.id, phaseId)).returning();

      if (updated && updated.projectId) {
        const allPhases = await db.select().from(franchiseProjectPhases).where(eq(franchiseProjectPhases.projectId, updated.projectId));
        const totalCompletion = Math.round(allPhases.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / allPhases.length);
        const currentPhase = allPhases.find(p => p.status === 'in_progress')?.phaseNumber || 1;
        await db.update(franchiseProjects).set({ completionPercentage: totalCompletion, currentPhase, updatedAt: new Date() }).where(eq(franchiseProjects.id, updated.projectId));
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating phase:", error);
      res.status(500).json({ message: "Faz guncellenemedi" });
    }
  });

  router.post('/api/franchise-project-tasks', isAuthenticated, async (req, res) => {
    try {
      const { projectId, phaseId, title, description, priority, assignedToUserId, assignedToCollaboratorId, dueDate, raciResponsible, raciAccountable, raciConsulted, raciInformed, dependsOnTaskId, notes } = req.body;
      const [task] = await db.insert(franchiseProjectTasks).values({
        projectId, phaseId, title, description, status: 'pending', priority, assignedToUserId, assignedToCollaboratorId, dueDate, raciResponsible, raciAccountable, raciConsulted, raciInformed, dependsOnTaskId, notes,
      }).returning();
      res.status(201).json(task);
    } catch (error: unknown) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Gorev olusturulamadi" });
    }
  });

  router.patch('/api/franchise-project-tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      if (updates.status === 'completed') {
        updates.completedAt = new Date();
      }
      const [updated] = await db.update(franchiseProjectTasks).set({ ...updates, updatedAt: new Date() }).where(eq(franchiseProjectTasks.id, taskId)).returning();
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Gorev guncellenemedi" });
    }
  });

  router.post('/api/franchise-collaborators', isAuthenticated, async (req, res) => {
    try {
      const { projectId, name, role, company, email, phone, specialty, notes } = req.body;
      const crypto = await import('crypto');
      const accessToken = crypto.randomBytes(32).toString('hex');
      const [collaborator] = await db.insert(franchiseCollaborators).values({
        projectId, name, role, company, email, phone, specialty, accessToken, notes, isActive: true,
      }).returning();
      res.status(201).json(collaborator);
    } catch (error: unknown) {
      console.error("Error creating collaborator:", error);
      res.status(500).json({ message: "Paydas eklenemedi" });
    }
  });

  router.delete('/api/franchise-collaborators/:id', isAuthenticated, async (req, res) => {
    try {
      const collabId = parseInt(req.params.id);
      await db.update(franchiseCollaborators).set({ isActive: false }).where(eq(franchiseCollaborators.id, collabId));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deactivating collaborator:", error);
      res.status(500).json({ message: "Paydas devre disi birakilamadi" });
    }
  });

  router.post('/api/franchise-project-comments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { projectId, taskId, content, attachmentUrl } = req.body;
      const [comment] = await db.insert(franchiseProjectComments).values({
        projectId, taskId, authorUserId: user.id, content, attachmentUrl,
      }).returning();
      res.status(201).json(comment);
    } catch (error: unknown) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Yorum eklenemedi" });
    }
  });


export default router;
