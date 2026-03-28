import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, not, ne, between, like, ilike, count, sum, avg, max, min } from "drizzle-orm";
import { parsePagination, wrapPaginatedResponse, sliceForPagination } from "./helpers";
import {
  hasPermission,
  isHQRole,
  isBranchRole,
  isFactoryRole,
  type UserRoleType,
  insertTaskSchema,
  tasks,
  users,
  leaveRequests,
  taskAssignees,
  taskComments,
  insertTaskCommentSchema,
} from "@shared/schema";
import { sendNotificationEmail } from "../email";
import { auditLog } from "../audit";
import { onTaskAssigned, onTaskCompleted, resolveEventTask } from "../event-task-generator";

class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

function ensurePermission(user: any, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

const router = Router();

  router.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedAssignedToId = req.query.assignedToId as string | undefined;
      const pag = parsePagination(req.query as Record<string, any>);
      
      ensurePermission(user, 'tasks', 'view');
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        
        const isSupervisorRole = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        let branchTasks = isSupervisorRole
          ? await storage.getTasks(user.branchId)
          : await storage.getTasks(user.branchId, user.id);

        if (!isSupervisorRole) {
          const myAssigneeRows = await db.select().from(taskAssignees).where(eq(taskAssignees.userId, user.id));
          if (myAssigneeRows.length > 0) {
            const existingIds = new Set(branchTasks.map((t) => t.id));
            const additionalTaskIds = myAssigneeRows.map(r => r.taskId).filter(tid => !existingIds.has(tid));
            if (additionalTaskIds.length > 0) {
              const allBranchTasks = await storage.getTasks(user.branchId);
              const extraTasks = allBranchTasks.filter((t) => additionalTaskIds.includes(t.id));
              branchTasks = [...branchTasks, ...extraTasks];
            }
          }
        }

        let deliveredTasks = branchTasks.filter((t) => t.isDelivered !== false);

        const today = new Date().toISOString().split('T')[0];
        const activeLeaves = await db.select().from(leaveRequests)
          .where(and(
            eq(leaveRequests.userId, user.id),
            eq(leaveRequests.status, 'approved'),
            lte(leaveRequests.startDate, today),
            gte(leaveRequests.endDate, today)
          ));
        if (activeLeaves.length > 0) {
          const hideStatuses = ['beklemede', 'goruldu', 'devam_ediyor', 'cevap_bekliyor', 'sure_uzatma_talebi'];
          deliveredTasks = deliveredTasks.filter((t) => !hideStatuses.includes(t.status));
        }

        if (pag.wantsPagination) {
          const { sliced, total } = sliceForPagination(deliveredTasks, pag);
          return res.json(wrapPaginatedResponse(sliced, total, pag));
        }
        return res.json(deliveredTasks);
      }
      
      let allTasks = await storage.getTasks(requestedBranchId, requestedAssignedToId);

      if (user.role && isFactoryRole(user.role as UserRoleType)) {
        const myAssigneeRows = await db.select().from(taskAssignees).where(eq(taskAssignees.userId, user.id));
        const myAssigneeTaskIds = new Set(myAssigneeRows.map(r => r.taskId));
        const userBranchId = user.branchId;

        allTasks = allTasks.filter((t) => {
          if (t.assignedToId === user.id) return true;
          if (t.createdById === user.id) return true;
          if (myAssigneeTaskIds.has(t.id)) return true;
          if (userBranchId && t.branchId === userBranchId) return true;
          return false;
        });
      }

      if (pag.wantsPagination) {
        const { sliced, total } = sliceForPagination(allTasks, pag);
        return res.json(wrapPaginatedResponse(sliced, total, pag));
      }
      res.json(allTasks);
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görevler alınırken hata oluştu" });
    }
  });

  router.get('/api/tasks/my', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'tasks', 'view');
      const allTasks = await storage.getTasks();
      const myDirectTasks = allTasks.filter((task) => task.assignedToId === user.id);

      const myAssigneeRows = await db.select().from(taskAssignees).where(eq(taskAssignees.userId, user.id));
      const additionalTaskIds = myAssigneeRows
        .map(r => r.taskId)
        .filter(tid => !myDirectTasks.some((t) => t.id === tid));

      let additionalTasks: any[] = [];
      if (additionalTaskIds.length > 0) {
        additionalTasks = allTasks.filter((task) => additionalTaskIds.includes(task.id));
      }

      res.json([...myDirectTasks, ...additionalTasks]);
    } catch (error: unknown) {
      console.error('Error getting my tasks:', error);
      res.status(500).json({ message: 'Görevler alınamadı' });
    }
  });

  router.get('/api/tasks/assigned-by-me', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'tasks', 'view');

      const activeStatuses = ['beklemede', 'goruldu', 'devam_ediyor', 'foto_bekleniyor',
        'incelemede', 'kontrol_bekliyor', 'onay_bekliyor', 'sure_uzatma_talebi',
        'cevap_bekliyor', 'ek_bilgi_bekleniyor'];

      const myAssigned = await db.select({
        id: tasks.id,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assignedToId: tasks.assignedToId,
        branchId: tasks.branchId,
        createdAt: tasks.createdAt,
      }).from(tasks)
        .where(and(
          eq(tasks.assignedById, user.id),
          isNull(tasks.deletedAt),
          inArray(tasks.status, activeStatuses)
        ))
        .orderBy(sql`CASE WHEN ${tasks.status} = 'onay_bekliyor' THEN 0 WHEN ${tasks.status} = 'sure_uzatma_talebi' THEN 1 WHEN ${tasks.status} = 'cevap_bekliyor' THEN 2 ELSE 3 END, ${tasks.dueDate} ASC NULLS LAST`)
        .limit(10);

      const userIds = [...new Set(myAssigned.map(t => t.assignedToId).filter(Boolean))] as string[];
      const usersMap = new Map<string, { firstName: string | null; lastName: string | null }>();
      if (userIds.length > 0) {
        const usersData = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(inArray(users.id, userIds));
        usersData.forEach(u => usersMap.set(u.id, u));
      }

      const enriched = myAssigned.map(t => {
        const assignee = t.assignedToId ? usersMap.get(t.assignedToId) : null;
        return {
          ...t,
          assigneeName: assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || 'Bilinmiyor' : 'Atanmamış',
        };
      });

      res.json(enriched);
    } catch (error: unknown) {
      console.error('Error getting assigned-by-me tasks:', error);
      res.status(500).json({ message: 'Atanan görevler alınamadı' });
    }
  });

  router.get('/api/tasks/pending-checks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      const pendingChecks = await storage.getTasksByChecker(user.id, 'kontrol_bekliyor');
      
      const enrichedTasks = await Promise.all(pendingChecks.map(async (task) => {
        let assigneeName = 'Bilinmiyor';
        if (task.assignedToId) {
          const assignee = await storage.getUser(task.assignedToId);
          assigneeName = assignee?.firstName && assignee?.lastName 
            ? `${assignee.firstName} ${assignee.lastName}` 
            : assignee?.email || 'Bilinmiyor';
        }
        return { ...task, assigneeName };
      }));
      
      res.json(enrichedTasks);
    } catch (error: unknown) {
      console.error("Error getting pending checks:", error);
      res.status(500).json({ message: "Kontrol bekleyen görevler alınamadı" });
    }
  });

  router.get('/api/tasks/fairness-report', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as string;
      const isHQ = isHQRole(userRole as UserRoleType);
      
      const days = parseInt(req.query.days as string) || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;
      
      const userBranchId = !isHQ ? user.branchId : branchId;
      
      const allTasks = await db.select({
        assignedToId: tasks.assignedToId,
        status: tasks.status,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        branchId: tasks.branchId,
      })
      .from(tasks)
      .where(
        and(
          gte(tasks.createdAt, sinceDate),
          userBranchId ? eq(tasks.branchId, userBranchId) : undefined,
        )
      );
      
      const allUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      })
      .from(users)
      .where(
        userBranchId ? eq(users.branchId, userBranchId) : undefined,
      );
      
      const userTaskCounts: Record<string, { 
        userId: string;
        name: string;
        role: string;
        branchId: number | null;
        totalTasks: number;
        completedTasks: number;
        overdueCount: number;
        avgPriority: number;
      }> = {};
      
      for (const u of allUsers) {
        if (!u.id) continue;
        const userTasks = allTasks.filter(t => t.assignedToId === u.id);
        const priorityMap: Record<string, number> = { 'düşük': 1, 'orta': 2, 'yüksek': 3 };
        const priorities = userTasks.map(t => priorityMap[t.priority || 'orta'] || 2);
        
        userTaskCounts[u.id] = {
          userId: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          role: u.role || '',
          branchId: u.branchId,
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter(t => t.status === 'onaylandi').length,
          overdueCount: userTasks.filter(t => t.status === 'gecikmiş').length,
          avgPriority: priorities.length > 0 ? Math.round((priorities.reduce((a, b) => a + b, 0) / priorities.length) * 10) / 10 : 0,
        };
      }
      
      const roleGroups: Record<string, typeof userTaskCounts[string][]> = {};
      for (const data of Object.values(userTaskCounts)) {
        if (data.totalTasks === 0 && !data.role) continue;
        const role = data.role || 'unknown';
        if (!roleGroups[role]) roleGroups[role] = [];
        roleGroups[role].push(data);
      }
      
      const report = Object.entries(roleGroups).map(([role, members]) => {
        const avgTasks = members.reduce((sum, m) => sum + m.totalTasks, 0) / Math.max(members.length, 1);
        const maxTasks = Math.max(...members.map(m => m.totalTasks));
        const minTasks = Math.min(...members.map(m => m.totalTasks));
        
        return {
          role,
          memberCount: members.length,
          avgTasks: Math.round(avgTasks * 10) / 10,
          maxTasks,
          minTasks,
          spread: maxTasks - minTasks,
          members: members.sort((a, b) => b.totalTasks - a.totalTasks),
        };
      }).filter(r => r.memberCount > 0);
      
      res.json({
        period: days,
        branchId: userBranchId,
        report,
      });
    } catch (error: unknown) {
      console.error("Error generating fairness report:", error);
      res.status(500).json({ message: "Adalet raporu oluşturulamadı" });
    }
  });

  router.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
        
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor && task.assignedToId !== user.id) {
          const isAdditionalAssignee = await db.select().from(taskAssignees)
            .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
            .then(rows => rows.length > 0);
          if (!isAdditionalAssignee) {
            return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
          }
        }
      }
      
      const enrichedTask: any = { ...task };
      const userIdsToFetch: string[] = [];
      if (task.assignedToId) userIdsToFetch.push(task.assignedToId);
      if (task.assignedById) userIdsToFetch.push(task.assignedById);
      if ((task as any).checkerId) userIdsToFetch.push((task as any).checkerId);

      const taskAssigneeRows = await db.select().from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      for (const ta of taskAssigneeRows) {
        if (!userIdsToFetch.includes(ta.userId)) userIdsToFetch.push(ta.userId);
      }

      if (userIdsToFetch.length > 0) {
        const usersMap = await storage.getUsersByIds(userIdsToFetch);
        if (task.assignedToId) {
          const u = usersMap.get(task.assignedToId);
          enrichedTask.assignedToName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null;
        }
        if (task.assignedById) {
          const u = usersMap.get(task.assignedById);
          enrichedTask.assignedByName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null;
        }
        if ((task as any).checkerId) {
          const u = usersMap.get((task as any).checkerId);
          enrichedTask.checkerName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null;
        }
        enrichedTask.assignees = taskAssigneeRows.map(ta => {
          const u = usersMap.get(ta.userId);
          return {
            ...ta,
            userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Bilinmiyor',
            userRole: u?.role || null,
            userProfileImage: u?.profileImageUrl || null,
          };
        });
      } else {
        enrichedTask.assignees = [];
      }

      const comments = await db.select().from(taskComments)
        .where(eq(taskComments.taskId, taskId))
        .orderBy(asc(taskComments.createdAt));
      
      if (comments.length > 0) {
        const commentUserIds = [...new Set(comments.map(c => c.userId))].filter(id => !userIdsToFetch.includes(id));
        let allUsersMap = userIdsToFetch.length > 0 ? await storage.getUsersByIds([...userIdsToFetch, ...commentUserIds]) : await storage.getUsersByIds(commentUserIds);
        enrichedTask.comments = comments.map(c => {
          const u = allUsersMap.get(c.userId);
          return {
            ...c,
            userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Bilinmiyor',
            userRole: u?.role || null,
            userProfileImage: u?.profileImageUrl || null,
          };
        });
      } else {
        enrichedTask.comments = [];
      }

      res.json(enrichedTask);
    } catch (error: unknown) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Görev alınamadı" });
    }
  });

  router.post('/api/tasks/bulk', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = user.id;

      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece HQ kullanıcıları toplu görev oluşturabilir" });
      }
      ensurePermission(user, 'tasks', 'create');

      const { description, priority, dueDate, requiresPhoto, branchId, assigneeIds, roleFilter, branchIds, scheduledDeliveryAt } = req.body;

      if (!description || !priority) {
        return res.status(400).json({ message: "Açıklama ve öncelik zorunludur" });
      }

      let targetUserIds: string[] = [];

      if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
        targetUserIds = assigneeIds;
      } else if (roleFilter) {
        const roleUsers = await storage.getUsersByRole(roleFilter);
        let filteredUsers = roleUsers;
        if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
          filteredUsers = roleUsers.filter(u => u.branchId && branchIds.includes(u.branchId));
        }
        targetUserIds = filteredUsers.map(u => u.id);
      }

      if (targetUserIds.length === 0) {
        return res.status(400).json({ message: "Görev atanacak kullanıcı bulunamadı" });
      }

      const isScheduled = !!scheduledDeliveryAt;
      const taskStatus = isScheduled ? 'zamanlanmis' : 'beklemede';
      const taskIsDelivered = !isScheduled;

      const createdTasks: any[] = [];

      for (const targetUserId of targetUserIds) {
        let taskBranchId = branchId;
        if (!taskBranchId) {
          const assignee = await storage.getUser(targetUserId);
          if (assignee?.branchId) {
            taskBranchId = assignee.branchId;
          }
        }
        if (!taskBranchId) {
          const allBranches = await storage.getBranches();
          if (allBranches.length > 0) {
            taskBranchId = allBranches[0].id;
          }
        }

        const task = await storage.createTask({
          description,
          priority,
          dueDate: dueDate || null,
          requiresPhoto: requiresPhoto || false,
          branchId: taskBranchId!,
          assignedToId: targetUserId,
          assignedById: userId,
          status: taskStatus,
          isDelivered: taskIsDelivered,
          scheduledDeliveryAt: isScheduled ? new Date(scheduledDeliveryAt) : null,
        });

        createdTasks.push(task);

        if (taskIsDelivered && targetUserId !== userId) {
          try {
            const assigner = await storage.getUser(userId);
            const assignerName = assigner?.firstName && assigner?.lastName
              ? `${assigner.firstName} ${assigner.lastName}`
              : 'Bir yönetici';

            await storage.createNotification({
              userId: targetUserId,
              type: 'task_assigned',
              title: 'Yeni Görev Atandı',
              message: `${assignerName} size yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
              branchId: taskBranchId,
            });

            const assignee = await storage.getUser(targetUserId);
            if (assignee?.email) {
              sendNotificationEmail(
                assignee.email,
                'Yeni Görev Atandı - DOSPRESSO',
                `Merhaba ${assignee.firstName || 'Değerli Çalışan'},\n\n${assignerName} size yeni bir görev atadı.\n\nGörev: ${task.description}\n\nGörevi tamamlamak için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
              ).catch(err => console.error("Background email error:", err));
            }
          } catch (notifError) {
            console.error("Error sending bulk task notification:", notifError);
          }
        }
      }

      res.json({ created: createdTasks.length, tasks: createdTasks });
    } catch (error: unknown) {
      console.error("Error creating bulk tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Toplu görev oluşturma hatası" });
    }
  });

  router.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertTaskSchema.parse(req.body);
      
      ensurePermission(user, 'tasks', 'create');
      
      let taskBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        taskBranchId = branchId;
      }
      
      if (!taskBranchId && !isBranchRole(user.role as UserRoleType)) {
        if (validatedData.assignedToId) {
          const assignee = await storage.getUser(validatedData.assignedToId);
          if (assignee?.branchId) {
            taskBranchId = assignee.branchId;
          }
        }
        if (!taskBranchId) {
          const branches = await storage.getBranches();
          if (branches.length > 0) {
            taskBranchId = branches[0].id;
          } else {
            return res.status(400).json({ message: "Görev oluşturmak için en az bir şube gerekli" });
          }
        }
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const userBranchId = assertBranchScope(user);
        if (validatedData.checkerId) {
          const checker = await storage.getUser(validatedData.checkerId);
          if (checker && checker.branchId !== userBranchId) {
            return res.status(403).json({ message: "Denetçi aynı şubeden seçilmelidir" });
          }
        }
        if (req.body.additionalAssignees && Array.isArray(req.body.additionalAssignees)) {
          for (const assigneeId of req.body.additionalAssignees) {
            const assignee = await storage.getUser(assigneeId);
            if (assignee && assignee.branchId !== userBranchId) {
              return res.status(403).json({ message: "Ek atanan kişiler aynı şubeden olmalıdır" });
            }
          }
        }
      }

      const task = await storage.createTask({
        ...validatedData,
        branchId: taskBranchId!,
        assignedToId: validatedData.assignedToId || userId,
        assignedById: userId,
      });
      
      const assigneeId = validatedData.assignedToId || userId;
      if (assigneeId && assigneeId !== userId) {
        try {
          const assigner = await storage.getUser(userId);
          const assignerName = assigner?.firstName && assigner?.lastName 
            ? `${assigner.firstName} ${assigner.lastName}` 
            : 'Bir yönetici';
          
          await storage.createNotification({
            userId: assigneeId,
            type: 'task_assigned',
            title: 'Yeni Görev Atandı',
            message: `${assignerName} size yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${task.id}`,
            branchId: taskBranchId,
          });
          
          const assignee = await storage.getUser(assigneeId);
          if (assignee?.email) {
            sendNotificationEmail(
              assignee.email,
              'Yeni Görev Atandı - DOSPRESSO',
              `Merhaba ${assignee.firstName || 'Değerli Çalışan'},\n\n${assignerName} size yeni bir görev atadı.\n\nGörev: ${task.description}\n\nGörevi tamamlamak için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task assignment notification:", notifError);
        }
      }
      
      try {
        const branchSupervisors = await storage.getUsersByBranchAndRole(taskBranchId!, 'supervisor');
        const branchSupervisorBuddies = await storage.getUsersByBranchAndRole(taskBranchId!, 'supervisor_buddy');
        const allBranchSupervisors = [...branchSupervisors, ...branchSupervisorBuddies];
        
        const assigner = await storage.getUser(userId);
        const assignerName = assigner?.firstName && assigner?.lastName 
          ? `${assigner.firstName} ${assigner.lastName}` 
          : 'Bir yönetici';
        
        for (const supervisor of allBranchSupervisors) {
          if (supervisor.id === assigneeId || supervisor.id === userId) continue;
          
          try {
            await storage.createNotification({
              userId: supervisor.id,
              type: 'task_assigned',
              title: 'Şubenize Yeni Görev',
              message: `${assignerName} şubenize yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
              branchId: taskBranchId,
            });
            
            if (supervisor.email) {
              sendNotificationEmail(
                supervisor.email,
                'Şubenize Yeni Görev Atandı - DOSPRESSO',
                `Merhaba ${supervisor.firstName || 'Değerli Supervisor'},\n\n${assignerName} şubenize yeni bir görev atadı.\n\nGörev: ${task.description}\n\nGörevi izlemek için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
              ).catch(err => console.error("Background email error:", err));
            }
          } catch (notifError) {
            console.error("Error sending supervisor notification:", notifError);
          }
        }
      } catch (supervisorNotifError) {
        console.error("Error in supervisor notification loop:", supervisorNotifError);
      }
      
      try {
        const hqAdmins = await storage.getHQAdmins();
        const completer = await storage.getUser(userId);
        const completerName = completer?.firstName && completer?.lastName
          ? `${completer.firstName} ${completer.lastName}`
          : 'Bir çalışan';
        const branch = task.branchId ? await storage.getBranch(task.branchId) : null;
        const branchName = branch?.name || 'Bilinmeyen Şube';
        
        for (const admin of hqAdmins) {
          if (admin.id === userId) continue;
          
          try {
            await storage.createNotification({
              userId: admin.id,
              type: 'task_completed',
              title: 'Görev İnceleme Bekliyor',
              message: `${completerName} (${branchName}) bir görevi tamamladı ve onayınızı bekliyor: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
              branchId: task.branchId || taskBranchId,
            });
            
            if (admin.email) {
              sendNotificationEmail(
                admin.email,
                'Görev İnceleme Bekliyor - DOSPRESSO',
                `Merhaba ${admin.firstName || 'Değerli Admin'},\n\n${completerName} (${branchName}) bir görevi tamamladı ve onayınızı bekliyor.\n\nGörev: ${task.description}\n\nGörevi incelemek için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
              ).catch(err => console.error("Background email error:", err));
            }
          } catch (notifError) {
            console.error("Error sending HQ admin notification:", notifError);
          }
        }
      } catch (hqAdminError) {
        console.error("Error in HQ admin notification:", hqAdminError);
      }
      
      const additionalAssigneeIds: string[] = req.body.additionalAssignees || [];
      if (additionalAssigneeIds.length > 0 || assigneeId) {
        const allAssigneeIds = [assigneeId, ...additionalAssigneeIds].filter((id, idx, arr) => id && arr.indexOf(id) === idx) as string[];
        for (const aId of allAssigneeIds) {
          try {
            await db.insert(taskAssignees).values({
              taskId: task.id,
              userId: aId,
              status: 'beklemede',
            }).onConflictDoNothing();
          } catch (e) {
            console.error("Error inserting task assignee:", e);
          }
        }

        for (const extraId of additionalAssigneeIds) {
          if (extraId === userId || extraId === assigneeId) continue;
          try {
            const assigner = await storage.getUser(userId);
            const assignerName3 = assigner?.firstName && assigner?.lastName
              ? `${assigner.firstName} ${assigner.lastName}` : 'Bir yönetici';
            await storage.createNotification({
              userId: extraId,
              type: 'task_assigned',
              title: 'Yeni Görev Atandı',
              message: `${assignerName3} size yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
              branchId: taskBranchId,
            });
          } catch (notifError) {
            console.error("Error sending additional assignee notification:", notifError);
          }
        }
      }

      auditLog(req, { eventType: "task.created", action: "created", resource: "tasks", resourceId: String(task.id), after: { description: validatedData.description, assignedToId: validatedData.assignedToId || userId, branchId: taskBranchId } });

      if (assigneeId && assigneeId !== userId) {
        const assigner = await storage.getUser(userId);
        const assignerName2 = assigner?.firstName && assigner?.lastName 
          ? `${assigner.firstName} ${assigner.lastName}` : 'Yonetici';
        onTaskAssigned(task.id, task.description || 'Gorev', assigneeId, assignerName2);
      }
      res.json({ ...task, additionalAssignees: additionalAssigneeIds });
    } catch (error: unknown) {
      console.error("Error starting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev başlatılamadı" });
    }
  });

  router.post('/api/tasks/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev onaylayabilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından onaylanabilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      const task = await storage.updateTask(id, { status: "onaylandi" });

      auditLog(req, { eventType: "task.status_changed", action: "verified", resource: "tasks", resourceId: String(id), before: { status: existingTask.status }, after: { status: "onaylandi" } });

      if (existingTask.assignedToId && existingTask.assignedToId !== user.id) {
        try {
          const verifier = await storage.getUser(user.id);
          const verifierName = verifier?.firstName && verifier?.lastName
            ? `${verifier.firstName} ${verifier.lastName}`
            : 'Merkez yetkilisi';
          
          await storage.createNotification({
            userId: existingTask.assignedToId,
            type: 'task_verified',
            title: 'Görev Onaylandı ✓',
            message: `${verifierName} görevinizi onayladı: "${existingTask.description?.substring(0, 50)}${(existingTask.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${existingTask.id}`,
            branchId: existingTask.branchId,
          });
          
          const verifiedAssignee = await storage.getUser(existingTask.assignedToId);
          if (verifiedAssignee?.email) {
            sendNotificationEmail(
              verifiedAssignee.email,
              'Görev Onaylandı - DOSPRESSO',
              `Merhaba ${verifiedAssignee.firstName || 'Değerli Çalışan'},\n\n${verifierName} görevinizi onayladı.\n\nGörev: ${existingTask.description}\n\nTebrikler!\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task verified notification:", notifError);
        }
      }
      
      res.json(task);
    } catch (error: unknown) {
      console.error("Error verifying task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  router.post('/api/tasks/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev reddedebilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından reddedilebilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      const updates: any = { status: "reddedildi" };
      if (reason) {
        updates.aiAnalysis = `RED NEDENİ: ${reason}${existingTask.aiAnalysis ? '\n\nÖNCEKİ ANALİZ: ' + existingTask.aiAnalysis : ''}`;
      }
      
      const task = await storage.updateTask(id, updates);

      auditLog(req, { eventType: "task.status_changed", action: "rejected", resource: "tasks", resourceId: String(id), before: { status: existingTask.status }, after: { status: "reddedildi" }, details: { reason } });

      if (existingTask.assignedToId && existingTask.assignedToId !== user.id) {
        try {
          const rejector = await storage.getUser(user.id);
          const rejectorName = rejector?.firstName && rejector?.lastName
            ? `${rejector.firstName} ${rejector.lastName}`
            : 'Merkez yetkilisi';
          
          await storage.createNotification({
            userId: existingTask.assignedToId,
            type: 'task_rejected',
            title: 'Görev Reddedildi',
            message: `${rejectorName} görevinizi reddetti: "${existingTask.description?.substring(0, 50)}${(existingTask.description?.length || 0) > 50 ? '...' : ''}"${reason ? ` - Neden: ${reason}` : ''}`,
            link: `/gorevler?taskId=${existingTask.id}`,
            branchId: existingTask.branchId,
          });
          
          const rejectedAssignee = await storage.getUser(existingTask.assignedToId);
          if (rejectedAssignee?.email) {
            sendNotificationEmail(
              rejectedAssignee.email,
              'Görev Reddedildi - DOSPRESSO',
              `Merhaba ${rejectedAssignee.firstName || 'Değerli Çalışan'},\n\n${rejectorName} görevinizi reddetti.\n\nGörev: ${existingTask.description}\n${reason ? `Neden: ${reason}\n` : ''}\nLütfen görevi düzeltip yeniden gönderin.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task rejected notification:", notifError);
        }
      }
      
      res.json(task);
    } catch (error: unknown) {
      console.error("Error rejecting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev reddedilemedi" });
    }
  });

  router.post('/api/tasks/:id/request-check', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (task.assignedToId !== user.id) {
        return res.status(403).json({ message: "Sadece göreve atanan kişi kontrol isteyebilir" });
      }
      
      if (task.status !== 'devam_ediyor' && task.status !== 'tamamlandi') {
        return res.status(400).json({ 
          message: `Bu görev kontrol istenemez. Mevcut durum: ${task.status}` 
        });
      }
      
      if (!task.checkerId) {
        return res.status(400).json({ message: "Bu göreve kontrol edecek kişi atanmamış" });
      }
      
      const updated = await storage.updateTask(taskId, { 
        status: 'kontrol_bekliyor',
        completedAt: new Date(),
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      if (notes) {
        try {
          await storage.addNoteToTask(taskId, notes, user.id);
        } catch (noteError) {
          console.error("Error adding task note:", noteError);
        }
      }
      
      try {
        const assignee = await storage.getUser(user.id);
        const assigneeName = assignee?.firstName && assignee?.lastName 
          ? `${assignee.firstName} ${assignee.lastName}` 
          : 'Çalışan';
        
        await storage.createNotification({
          userId: task.checkerId,
          type: 'task_check_requested',
          title: 'Onboarding Kontrolü Bekliyor',
          message: `${assigneeName} görevini tamamladı ve kontrolünüzü bekliyor: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
          link: `/gorev-detay/${task.id}`,
          branchId: task.branchId,
        });
      } catch (notifError) {
        console.error("Error sending checker notification:", notifError);
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error requesting check:", error);
      res.status(500).json({ message: "Kontrol isteği gönderilemedi" });
    }
  });

  router.post('/api/tasks/:id/checker-verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (task.checkerId !== user.id) {
        return res.status(403).json({ message: "Sadece atanan kontrol edici bu görevi onaylayabilir" });
      }
      
      if (task.status !== 'kontrol_bekliyor') {
        return res.status(400).json({ 
          message: `Bu görev kontrol bekliyor durumunda değil. Mevcut durum: ${task.status}` 
        });
      }
      
      const updated = await storage.updateTask(taskId, { 
        status: 'onaylandi',
        checkedAt: new Date(),
        checkerNote: notes || null,
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      if (task.assignedToId) {
        try {
          const checker = await storage.getUser(user.id);
          const checkerName = checker?.firstName && checker?.lastName 
            ? `${checker.firstName} ${checker.lastName}` 
            : 'Kontrol Edici';
          
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_check_approved',
            title: 'Görev Onaylandı ✓',
            message: `${checkerName} görevinizi onayladı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorev-detay/${task.id}`,
            branchId: task.branchId,
          });
        } catch (notifError) {
          console.error("Error sending check approved notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error verifying task by checker:", error);
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  router.post('/api/tasks/:id/checker-reject', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes, reason } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (task.checkerId !== user.id) {
        return res.status(403).json({ message: "Sadece atanan kontrol edici bu görevi reddedebilir" });
      }
      
      if (task.status !== 'kontrol_bekliyor') {
        return res.status(400).json({ 
          message: `Bu görev kontrol bekliyor durumunda değil. Mevcut durum: ${task.status}` 
        });
      }
      
      const updated = await storage.updateTask(taskId, { 
        status: 'reddedildi',
        checkedAt: new Date(),
        checkerNote: notes || reason || null,
        failureNote: reason || null,
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      if (task.assignedToId) {
        try {
          const checker = await storage.getUser(user.id);
          const checkerName = checker?.firstName && checker?.lastName 
            ? `${checker.firstName} ${checker.lastName}` 
            : 'Kontrol Edici';
          
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_check_rejected',
            title: 'Görev Reddedildi',
            message: `${checkerName} görevinizi reddetti: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"${reason ? ` - Neden: ${reason}` : ''}`,
            link: `/gorev-detay/${task.id}`,
            branchId: task.branchId,
          });
        } catch (notifError) {
          console.error("Error sending check rejected notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error rejecting task by checker:", error);
      res.status(500).json({ message: "Görev reddedilemedi" });
    }
  });

  router.post('/api/tasks/:id/rate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { score } = req.body;

      if (!score || score < 1 || score > 5) {
        return res.status(400).json({ message: "Puan 1-5 arasında olmalıdır" });
      }

      const rating = await storage.rateTask(id, score, user.id);
      res.json(rating);
    } catch (error: unknown) {
      console.error("Error rating task:", error);
      res.status(500).json({ message: "Görev değerlendirilemedi" });
    }
  });

  router.patch('/api/tasks/:id/acknowledge', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (task.assignedToId !== user.id) {
        return res.status(403).json({ message: "Yalnızca atanan kişi görevi onaylayabilir" });
      }
      
      if (task.acknowledgedAt) {
        return res.status(400).json({ message: "Bu görev zaten görüldü olarak işaretlenmiş" });
      }
      
      const updated = await storage.acknowledgeTask(taskId, user.id);
      
      if (task.assignedById && task.assignedById !== user.id) {
        try {
          const acknowledger = await storage.getUser(user.id);
          const acknowledgerName = acknowledger?.firstName && acknowledger?.lastName 
            ? `${acknowledger.firstName} ${acknowledger.lastName}` 
            : 'Atanan kişi';
          
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_acknowledged',
            title: 'Görev Görüldü',
            message: `${acknowledgerName} atadığınız görevi gördü: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${task.id}`,
            branchId: task.branchId,
          });
        } catch (notifError) {
          console.error("Error sending task status notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Görev durumu güncellenemedi" });
    }
  });

  router.post('/api/tasks/:id/start', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const isPrimaryAssignee = task.assignedToId === user.id;
      const isAdditionalAssignee = await db.select().from(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
        .then(rows => rows.length > 0);
      
      if (!isPrimaryAssignee && !isAdditionalAssignee) {
        return res.status(403).json({ message: "Bu görevi başlatma yetkiniz yok" });
      }
      
      const allowedStatuses = ['beklemede', 'goruldu', 'reddedildi', 'ek_bilgi_bekleniyor', 'devam_ediyor'];
      if (!allowedStatuses.includes(task.status || 'beklemede')) {
        return res.status(400).json({ 
          message: `Bu görev '${task.status}' durumunda, başlatılamaz` 
        });
      }
      
      await db.update(taskAssignees)
        .set({ 
          status: 'devam_ediyor', 
          startedAt: new Date(),
          acknowledgedAt: new Date(),
        })
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)));
      
      if (task.status === 'beklemede' || task.status === 'goruldu' || task.status === 'ek_bilgi_bekleniyor') {
        const updates: any = { 
          status: 'devam_ediyor',
          startedAt: task.startedAt || new Date()
        };
        
        if (!task.acknowledgedAt) {
          updates.acknowledgedAt = new Date();
        }
        
        await storage.updateTask(taskId, updates);
      }
      
      if (notes) {
        try {
          await storage.addNoteToTask(taskId, notes, user.id);
        } catch (noteError) {
          console.error("Error adding task note:", noteError);
        }
      }
      
      if (task.assignedById && task.assignedById !== user.id) {
        try {
          const starter = await storage.getUser(user.id);
          const starterName = starter?.firstName && starter?.lastName 
            ? `${starter.firstName} ${starter.lastName}` 
            : 'Atanan kişi';
          
          const isJoining = !isPrimaryAssignee;
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_started',
            title: isJoining ? 'Göreve Katılım' : 'Görev Başlatıldı',
            message: isJoining 
              ? `${starterName} göreve katıldı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"` 
              : `${starterName} göreve başladı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorev-detay/${task.id}`,
            branchId: task.branchId,
          });
        } catch (notifError) {
          console.error("Error sending task start notification:", notifError);
        }
      }
      
      if (!isPrimaryAssignee && task.assignedToId && task.assignedToId !== user.id) {
        try {
          const joiner = await storage.getUser(user.id);
          const joinerName = joiner?.firstName && joiner?.lastName 
            ? `${joiner.firstName} ${joiner.lastName}` 
            : 'Bir katılımcı';
          
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_started',
            title: 'Göreve Katılım',
            message: `${joinerName} göreve katıldı`,
            link: `/gorev-detay/${task.id}`,
            branchId: task.branchId,
          });
        } catch (notifError) {
          console.error("Error sending join notification to primary:", notifError);
        }
      }
      
      const updatedTask = await storage.getTask(taskId);
      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error starting task:", error);
      res.status(500).json({ message: "Görev başlatılamadı" });
    }
  });

  router.get('/api/tasks/:id/participant-statuses', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const user = req.user!;
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID'si" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

      const userIsHQ = isHQRole(user.role as UserRoleType);
      if (!userIsHQ && task.branchId && user.branchId && task.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
      }

      const statuses = await db
        .select({
          id: taskAssignees.id,
          userId: taskAssignees.userId,
          status: taskAssignees.status,
          acknowledgedAt: taskAssignees.acknowledgedAt,
          startedAt: taskAssignees.startedAt,
          completedAt: taskAssignees.completedAt,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
          userRole: users.role,
          userProfilePhoto: users.profilePhoto,
        })
        .from(taskAssignees)
        .leftJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, taskId));

      res.json(statuses);
    } catch (error: unknown) {
      console.error("Error fetching participant statuses:", error);
      res.status(500).json({ message: "Katılımcı durumları yüklenemedi" });
    }
  });

  router.post('/api/tasks/:id/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { status, note } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const isAssigner = task.assignedById === user.id;
      const isAssignee = task.assignedToId === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      
      const validStatuses = ['beklemede', 'devam_ediyor', 'tamamlandi', 'incelemede', 'basarisiz', 'onaylandi', 'reddedildi', 'ek_bilgi_bekleniyor', 'cevap_bekliyor', 'onay_bekliyor', 'sure_uzatma_talebi', 'iptal_edildi'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Geçersiz durum: ${status}` });
      }
      
      const currentStatus = task.status;
      let allowed = false;
      let transitionMessage = "";
      
      const terminalStates = ['onaylandi', 'basarisiz', 'iptal_edildi'];
      const isTerminal = terminalStates.includes(currentStatus);
      
      if (isTerminal && !(isHQ && status === 'beklemede')) {
        return res.status(400).json({ 
          message: `Bu görev terminal durumda (${currentStatus}). Değişiklik yapılamaz.` 
        });
      }
      
      if (isAssignee) {
        if (status === 'devam_ediyor' && (currentStatus === 'beklemede' || currentStatus === 'goruldu' || currentStatus === 'reddedildi' || currentStatus === 'ek_bilgi_bekleniyor' || currentStatus === 'cevap_bekliyor')) {
          allowed = true;
          transitionMessage = currentStatus === 'ek_bilgi_bekleniyor' ? "Ek bilgi sağlandı, görev devam ediyor" : "Görev başlatıldı";
        } else if (status === 'tamamlandi' && (currentStatus === 'devam_ediyor' || currentStatus === 'goruldu' || currentStatus === 'beklemede')) {
          allowed = true;
          transitionMessage = "Görev tamamlandı, onay bekleniyor";
        } else if (status === 'incelemede' && currentStatus === 'devam_ediyor') {
          allowed = true;
          transitionMessage = "Görev incelemeye gönderildi";
        } else if (status === 'basarisiz' && ['beklemede', 'goruldu', 'devam_ediyor', 'reddedildi'].includes(currentStatus)) {
          allowed = true;
          transitionMessage = "Görev başarısız olarak işaretlendi";
        }
      }
      
      if (isAssigner || isHQ) {
        if (status === 'onaylandi' && (currentStatus === 'tamamlandi' || currentStatus === 'incelemede')) {
          allowed = true;
          transitionMessage = "Görev onaylandı";
        } else if (status === 'reddedildi' && (currentStatus === 'tamamlandi' || currentStatus === 'incelemede')) {
          allowed = true;
          transitionMessage = "Görev reddedildi, düzeltme bekleniyor";
        } else if (status === 'ek_bilgi_bekleniyor' && ['devam_ediyor', 'tamamlandi', 'incelemede'].includes(currentStatus)) {
          allowed = true;
          transitionMessage = "Ek bilgi istendi";
        } else if (status === 'iptal_edildi' && !['onaylandi', 'iptal_edildi'].includes(currentStatus)) {
          allowed = true;
          transitionMessage = note || "Görev iptal edildi";
        }
      }
      
      if (isHQ && status === 'beklemede' && ['reddedildi', 'basarisiz', 'onaylandi', 'onay_bekliyor', 'iptal_edildi'].includes(currentStatus)) {
        allowed = true;
        transitionMessage = "Görev yeniden atandı (HQ tarafından)";
      }
      
      if (!allowed) {
        return res.status(403).json({ 
          message: `Bu durum geçişine izniniz yok: ${currentStatus} -> ${status}` 
        });
      }
      
      const updates: any = { status };
      if (status === 'tamamlandi' || status === 'incelemede') {
        updates.completedAt = new Date();
      }
      
      const updatedTask = await storage.updateTask(taskId, updates);

      auditLog(req, { eventType: "task.status_changed", action: "status_changed", resource: "tasks", resourceId: String(taskId), before: { status: currentStatus }, after: { status }, details: { note } });

      try {
        await storage.addNoteToTask(taskId, note || transitionMessage, user.id);
      } catch (historyError) {
        console.error("Error adding status history:", historyError);
      }
      
      try {
        const actor = await storage.getUser(user.id);
        const actorName = actor?.firstName && actor?.lastName
          ? `${actor.firstName} ${actor.lastName}`
          : 'Kullanıcı';
        
        if ((status === 'tamamlandi' || status === 'incelemede') && isAssignee && task.assignedById) {
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_completed',
            title: 'Görev Tamamlandı',
            message: `${actorName} görevi tamamladı: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
        
        if ((status === 'onaylandi' || status === 'reddedildi') && task.assignedToId) {
          await storage.createNotification({
            userId: task.assignedToId,
            type: status === 'onaylandi' ? 'task_verified' : 'task_rejected',
            title: status === 'onaylandi' ? 'Görev Onaylandı' : 'Görev Reddedildi',
            message: `${actorName} görevinizi ${status === 'onaylandi' ? 'onayladı' : 'reddetti'}: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
        
        if (status === 'ek_bilgi_bekleniyor' && task.assignedToId) {
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_info_requested',
            title: 'Ek Bilgi İstendi',
            message: `${actorName} göreviniz için ek bilgi istedi: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (notifError) {
        console.error("Error sending status notification:", notifError);
      }
      
      if (task.assignedById && task.assignedById !== user.id) {
        const completedByUser = await storage.getUser(user.id);
        const completedByName = completedByUser?.firstName || 'Çalışan';
        onTaskCompleted(task.id, task.description || 'Gorev', task.assignedById, completedByName);
      }
      resolveEventTask('task_assigned', task.id);
      res.json({ ...updatedTask, message: transitionMessage });
    } catch (error: unknown) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Görev durumu güncellenemedi" });
    }
  });

  router.post('/api/tasks/:id/note', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { note } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ message: "Not girilmelidir" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const isAssigner = task.assignedById === user.id;
      const isAssignee = task.assignedToId === user.id;
      const isHQ = !isBranchRole(user.role as UserRoleType);
      const isCheckerUser = (task as any).checkerId === user.id;
      
      if (!isAssigner && !isAssignee && !isHQ && !isCheckerUser) {
        const isAdditionalAssignee = await db.select().from(taskAssignees)
          .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
          .then(rows => rows.length > 0);
        if (!isAdditionalAssignee) {
          return res.status(403).json({ message: "Bu göreve not ekleyemezsiniz" });
        }
      }
      
      await storage.addNoteToTask(taskId, note.trim(), user.id);
      
      res.json({ success: true, message: "Not eklendi" });
    } catch (error: unknown) {
      console.error("Error adding note to task:", error);
      res.status(500).json({ message: "Not eklenemedi" });
    }
  });

  router.post('/api/tasks/:id/photo', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { photoUrl } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
        return res.status(400).json({ message: "Fotoğraf URL'si gereklidir" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssignee = task.assignedToId === user.id;
      const isAssigner = task.assignedById === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);

      if (!isAssignee && !isAssigner && !isHQ) {
        const isAdditionalAssignee = await db.select().from(taskAssignees)
          .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
          .then(rows => rows.length > 0);
        if (!isAdditionalAssignee) {
          return res.status(403).json({ message: "Bu göreve fotoğraf yükleyemezsiniz" });
        }
      }

      const updatedTask = await storage.updateTask(taskId, {
        photoUrl: photoUrl.trim(),
      });

      res.json({ success: true, message: "Fotoğraf kaydedildi", task: updatedTask });
    } catch (error: unknown) {
      console.error("Error saving task photo:", error);
      res.status(500).json({ message: "Fotoğraf kaydedilemedi" });
    }
  });

  router.post('/api/tasks/:id/ask-question', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { question } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ message: "Soru metni girilmelidir" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssignee = task.assignedToId === user.id;
      if (!isAssignee) {
        return res.status(403).json({ message: "Sadece görev atanan kişi soru sorabilir" });
      }

      if (!['devam_ediyor', 'beklemede', 'goruldu'].includes(task.status)) {
        return res.status(400).json({ message: `Bu durumda soru sorulamaz: ${task.status}` });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'cevap_bekliyor',
        questionText: question.trim(),
      });

      try {
        await storage.addNoteToTask(taskId, `Soru soruldu: ${question.trim()}`, user.id);
      } catch (e) {
        console.error("Error adding question history:", e);
      }

      try {
        if (task.assignedById) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_question',
            title: 'Görevde Soru Soruldu',
            message: `${actorName} görevde soru sordu: "${question.trim().substring(0, 50)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending question notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error asking question on task:", error);
      res.status(500).json({ message: "Soru gönderilemedi" });
    }
  });

  router.post('/api/tasks/:id/answer-question', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { answer } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        return res.status(400).json({ message: "Yanıt metni girilmelidir" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssigner = task.assignedById === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isAssigner && !isHQ) {
        return res.status(403).json({ message: "Sadece görevi atayan veya HQ yanıt verebilir" });
      }

      if (task.status !== 'cevap_bekliyor') {
        return res.status(400).json({ message: `Bu durumda yanıt verilemez: ${task.status}` });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'devam_ediyor',
        questionAnswerText: answer.trim(),
      });

      try {
        await storage.addNoteToTask(taskId, `Soru yanıtlandı: ${answer.trim()}`, user.id);
      } catch (e) {
        console.error("Error adding answer history:", e);
      }

      try {
        if (task.assignedToId) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_answer',
            title: 'Sorunuz Yanıtlandı',
            message: `${actorName} sorunuzu yanıtladı: "${answer.trim().substring(0, 50)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending answer notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error answering question on task:", error);
      res.status(500).json({ message: "Yanıt gönderilemedi" });
    }
  });

  router.post('/api/tasks/:id/request-extension', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { reason, requestedDueDate } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ message: "Uzatma sebebi girilmelidir" });
      }

      if (!requestedDueDate || typeof requestedDueDate !== 'string') {
        return res.status(400).json({ message: "Talep edilen tarih girilmelidir" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssignee = task.assignedToId === user.id;
      if (!isAssignee) {
        return res.status(403).json({ message: "Sadece görev atanan kişi süre uzatma talep edebilir" });
      }

      if (!['devam_ediyor', 'beklemede', 'goruldu'].includes(task.status)) {
        return res.status(400).json({ message: `Bu durumda süre uzatma talep edilemez: ${task.status}` });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'sure_uzatma_talebi',
        extensionReason: reason.trim(),
        requestedDueDate: requestedDueDate,
      });

      try {
        await storage.addNoteToTask(taskId, `Süre uzatma talebi: ${reason.trim()} - Talep edilen tarih: ${requestedDueDate}`, user.id);
      } catch (e) {
        console.error("Error adding extension request history:", e);
      }

      try {
        if (task.assignedById) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_extension_request',
            title: 'Süre Uzatma Talebi',
            message: `${actorName} görev için süre uzatma talep etti: "${reason.trim().substring(0, 50)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending extension request notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error requesting extension on task:", error);
      res.status(500).json({ message: "Süre uzatma talebi gönderilemedi" });
    }
  });

  router.post('/api/tasks/:id/approve-extension', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { approved, note, newDueDate } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      if (typeof approved !== 'boolean') {
        return res.status(400).json({ message: "Onay durumu belirtilmelidir" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssigner = task.assignedById === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isAssigner && !isHQ) {
        return res.status(403).json({ message: "Sadece görevi atayan veya HQ onaylayabilir" });
      }

      if (task.status !== 'sure_uzatma_talebi') {
        return res.status(400).json({ message: `Bu durumda uzatma onayı verilemez: ${task.status}` });
      }

      const updates: any = {
        status: 'devam_ediyor',
        extensionReason: null,
        requestedDueDate: null,
      };

      if (approved) {
        updates.dueDate = newDueDate || task.requestedDueDate;
      }

      const updatedTask = await storage.updateTask(taskId, updates);

      const historyNote = approved
        ? `Süre uzatma onaylandı${note ? ': ' + note : ''}. Yeni tarih: ${updates.dueDate}`
        : `Süre uzatma reddedildi${note ? ': ' + note : ''}`;

      try {
        await storage.addNoteToTask(taskId, historyNote, user.id);
      } catch (e) {
        console.error("Error adding extension approval history:", e);
      }

      try {
        if (task.assignedToId) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_extension_response',
            title: approved ? 'Süre Uzatma Onaylandı' : 'Süre Uzatma Reddedildi',
            message: `${actorName} süre uzatma talebinizi ${approved ? 'onayladı' : 'reddetti'}`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending extension response notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error approving extension on task:", error);
      res.status(500).json({ message: "Uzatma onayı işlenemedi" });
    }
  });

  router.post('/api/tasks/:id/submit-for-approval', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { note } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssignee = task.assignedToId === user.id;
      if (!isAssignee) {
        return res.status(403).json({ message: "Sadece görev atanan kişi onaya gönderebilir" });
      }

      if (!['devam_ediyor', 'goruldu', 'beklemede'].includes(task.status)) {
        return res.status(400).json({ message: `Bu durumda onaya gönderilemez: ${task.status}` });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'onay_bekliyor',
        completedAt: new Date(),
      });

      try {
        await storage.addNoteToTask(taskId, note ? `Onaya gönderildi: ${note}` : 'Görev onaya gönderildi', user.id);
      } catch (e) {
        console.error("Error adding submit-for-approval history:", e);
      }

      try {
        if (task.assignedById) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_approval_requested',
            title: 'Görev Onay Bekliyor',
            message: `${actorName} görevi tamamladı ve onayınızı bekliyor: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending submit-for-approval notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error submitting task for approval:", error);
      res.status(500).json({ message: "Görev onaya gönderilemedi" });
    }
  });

  router.post('/api/tasks/:id/approve-closure', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { note } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssigner = task.assignedById === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isAssigner && !isHQ) {
        return res.status(403).json({ message: "Sadece görevi atayan veya HQ onaylayabilir" });
      }

      if (task.status !== 'onay_bekliyor') {
        return res.status(400).json({ message: `Bu durumda kapatma onayı verilemez: ${task.status}` });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'onaylandi',
        approvedByAssignerId: user.id,
        approvedAt: new Date(),
        approverNote: note || null,
      });

      try {
        await storage.addNoteToTask(taskId, note ? `Görev onaylandı: ${note}` : 'Görev onaylandı ve kapatıldı', user.id);
      } catch (e) {
        console.error("Error adding approve-closure history:", e);
      }

      try {
        if (task.assignedToId) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_closure_approved',
            title: 'Görev Onaylandı',
            message: `${actorName} görevinizi onayladı: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending approve-closure notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error approving task closure:", error);
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  router.post('/api/tasks/:id/reactivate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }

      const isAssignee = task.assignedToId === user.id;
      if (!isAssignee) {
        return res.status(403).json({ message: "Sadece görev atanan kişi tekrar aktif edebilir" });
      }

      if (task.status !== 'onay_bekliyor') {
        return res.status(400).json({ message: `Bu durumda görev tekrar aktif edilemez: ${task.status}` });
      }

      if (task.approvedByAssignerId) {
        return res.status(400).json({ message: "Görev zaten onaylanmış, tekrar aktif edilemez" });
      }

      const updatedTask = await storage.updateTask(taskId, {
        status: 'devam_ediyor',
        completedAt: null,
      });

      try {
        await storage.addNoteToTask(taskId, reason ? `Görev tekrar aktif edildi: ${reason}` : 'Görev tekrar aktif edildi', user.id);
      } catch (e) {
        console.error("Error adding reactivation history:", e);
      }

      try {
        if (task.assignedById) {
          const actor = await storage.getUser(user.id);
          const actorName = actor?.firstName && actor?.lastName ? `${actor.firstName} ${actor.lastName}` : 'Kullanıcı';
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_reactivated',
            title: 'Görev Tekrar Aktif',
            message: `${actorName} görevi tekrar aktif etti: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
            branchId: task.branchId,
          });
        }
      } catch (e) {
        console.error("Error sending reactivation notification:", e);
      }

      res.json(updatedTask);
    } catch (error: unknown) {
      console.error("Error reactivating task:", error);
      res.status(500).json({ message: "Görev tekrar aktif edilemedi" });
    }
  });

  router.get('/api/tasks/:id/history', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
        
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor && task.assignedToId !== user.id && task.assignedById !== user.id) {
          const isAdditionalAssignee = await db.select().from(taskAssignees)
            .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
            .then(rows => rows.length > 0);
          if (!isAdditionalAssignee) {
            return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
          }
        }
      }
      
      const history = await storage.getTaskStatusHistory(taskId);
      
      const userIds = [...new Set(history.map(h => h.changedById).filter(Boolean))];
      const userMap: Record<string, { firstName: string; lastName: string }> = {};
      
      if (userIds.length > 0) {
        const usersData = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(inArray(users.id, userIds));
        
        for (const u of usersData) {
          userMap[u.id] = { firstName: u.firstName || '', lastName: u.lastName || '' };
        }
      }
      
      const enrichedHistory = history.map(h => ({
        ...h,
        changedByName: userMap[h.changedById] 
          ? `${userMap[h.changedById].firstName} ${userMap[h.changedById].lastName}`.trim() || 'Sistem'
          : 'Sistem',
      }));
      
      res.json(enrichedHistory);
    } catch (error: unknown) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Görev geçmişi alınamadı" });
    }
  });

  router.post('/api/tasks/:id/rating', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { rating, feedback } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Puan 1-5 arasında bir sayı olmalıdır" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (task.assignedById !== user.id) {
        return res.status(403).json({ message: "Sadece görevi atayan kişi puanlayabilir" });
      }
      
      if (task.status !== 'onaylandi') {
        return res.status(400).json({ message: "Sadece tamamlanan görevler puanlanabilir" });
      }
      
      const maxRating = storage.computeMaxRating(task);
      const isLate = task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate);
      
      const rawRating = rating;
      const finalRating = Math.min(rating, maxRating);
      const penaltyApplied = rawRating > maxRating ? 1 : 0;
      
      const existingRating = await storage.getTaskRating(taskId);
      let taskRating;
      
      if (existingRating) {
        taskRating = await storage.updateTaskRating(existingRating.id, {
          rawRating,
          finalRating,
          penaltyApplied,
          isLate: !!isLate,
          feedback: feedback || null,
        });
      } else {
        taskRating = await storage.createTaskRating({
          taskId,
          ratedById: user.id,
          ratedUserId: task.assignedToId!,
          rawRating,
          finalRating,
          penaltyApplied,
          isLate: !!isLate,
          feedback: feedback || null,
        });
      }
      
      if (task.assignedToId) {
        const assignee = await storage.getUser(task.assignedToId);
        await storage.upsertEmployeeSatisfactionScore(
          task.assignedToId,
          assignee?.branchId || null
        );
      }
      
      res.json({
        ...taskRating,
        maxRating,
        message: penaltyApplied ? 'Geç teslim nedeniyle puan sınırlandırıldı (max: ' + maxRating + ')' : undefined,
      });
    } catch (error: unknown) {
      console.error("Error rating task:", error);
      res.status(500).json({ message: "Görev puanlanamadı" });
    }
  });

  router.get('/api/tasks/:id/rating', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
      }
      
      const rating = await storage.getTaskRating(taskId);
      const maxRating = storage.computeMaxRating(task);
      
      res.json({
        rating: rating || null,
        maxRating,
        canRate: task.assignedById === user.id && task.status === 'onaylandi' && !rating,
        isLate: task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate),
      });
    } catch (error: unknown) {
      console.error("Error fetching task rating:", error);
      res.status(500).json({ message: "Görev puanı alınamadı" });
    }
  });

  router.get('/api/tasks/:taskId/steps', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const steps = await storage.getTaskSteps(taskId);
      
      const userIds = [...new Set(steps.map((s) => s.assignedToId).filter(Boolean))];
      let usersMap = new Map<string, any>();
      if (userIds.length > 0) {
        usersMap = await storage.getUsersByIds(userIds as string[]);
      }
      
      const enrichedSteps = steps.map((s) => {
        const assignee = s.assignedToId ? usersMap.get(s.assignedToId) : null;
        return {
          ...s,
          assignedToName: assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() : null,
          assignedToProfileImage: assignee?.profileImageUrl || null,
          assignedUser: assignee ? {
            id: assignee.id,
            username: assignee.username,
            firstName: assignee.firstName,
            lastName: assignee.lastName,
            profilePhoto: assignee.profileImageUrl || assignee.profilePhoto,
          } : null,
        };
      });
      
      res.json(enrichedSteps);
    } catch (error: unknown) {
      console.error("Get task steps error:", error);
      res.status(500).json({ message: "Adımlar getirilemedi" });
    }
  });

  router.post('/api/tasks/:taskId/steps', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const step = await storage.createTaskStep({ ...req.body, taskId, authorId: req.user.id });
      res.json(step);
    } catch (error: unknown) {
      console.error("Create task step error:", error);
      res.status(500).json({ message: "Adım oluşturulamadı" });
    }
  });

  router.post('/api/tasks/:taskId/steps/:stepId/claim', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.taskId);
      const stepId = parseInt(req.params.stepId);
      
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });
      
      const isAssignee = task.assignedToId === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      const isCheckerForTask = (task as any).checkerId === user.id;
      const isAdditionalAssignee = await db.select().from(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
        .then(rows => rows.length > 0);
      
      if (!isAssignee && !isAdditionalAssignee && !isHQ && !isCheckerForTask) {
        return res.status(403).json({ message: "Bu adımı alma yetkiniz yok" });
      }
      
      const step = await storage.updateTaskStep(stepId, { 
        assignedToId: user.id, 
        claimedAt: new Date(),
        status: 'in_progress',
        startedAt: new Date(),
      });
      
      res.json(step);
    } catch (error: unknown) {
      console.error("Claim step error:", error);
      res.status(500).json({ message: "Adım alınamadı" });
    }
  });

  router.post('/api/tasks/:taskId/steps/:stepId/unclaim', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const stepId = parseInt(req.params.stepId);
      
      const steps = await storage.getTaskSteps(parseInt(req.params.taskId));
      const step = steps.find((s) => s.id === stepId);
      if (!step) return res.status(404).json({ message: "Adım bulunamadı" });
      
      if (step.assignedToId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu adımı bırakma yetkiniz yok" });
      }
      
      const updated = await storage.updateTaskStep(stepId, { 
        assignedToId: null, 
        claimedAt: null,
        status: 'pending',
        startedAt: null,
      });
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Unclaim step error:", error);
      res.status(500).json({ message: "Adım bırakılamadı" });
    }
  });

  router.post("/api/tasks/bulk-archive", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { taskIds, reason } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Görev ID listesi gerekli" });
      }

      if (taskIds.length > 200) {
        return res.status(400).json({ message: "Tek seferde en fazla 200 görev arşivlenebilir" });
      }

      const isHQ = isHQRole(user.role);
      const isSupervisor = user.role === 'supervisor';
      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const targetTasks = await db.select({
        id: tasks.id,
        status: tasks.status,
        dueDate: tasks.dueDate,
        branchId: tasks.branchId,
      }).from(tasks)
        .where(inArray(tasks.id, taskIds));

      const terminalStates = ['onaylandi', 'basarisiz', 'iptal_edildi'];
      const eligible = targetTasks.filter(t => {
        if (terminalStates.includes(t.status)) return false;
        if (!t.dueDate || new Date(t.dueDate) > thirtyDaysAgo) return false;
        if (isSupervisor && !isHQ && t.branchId !== user.branchId) return false;
        return true;
      });

      if (eligible.length === 0) {
        return res.status(400).json({ message: "Arşivlenebilecek uygun görev bulunamadı" });
      }

      const eligibleIds = eligible.map(t => t.id);
      await db.update(tasks)
        .set({
          status: 'iptal_edildi',
          statusUpdatedAt: new Date(),
          statusUpdatedById: user.id,
        })
        .where(inArray(tasks.id, eligibleIds));

      await auditLog(req, {
        eventType: 'task.bulk_archived',
        action: 'bulk_archive',
        resource: 'tasks',
        resourceId: String(eligible.length),
        details: { count: eligible.length, reason: reason || 'Gecikmiş görev temizliği', taskIds: eligibleIds },
      });

      res.json({
        message: `${eligible.length} görev arşivlendi`,
        archivedCount: eligible.length,
        skippedCount: taskIds.length - eligible.length,
      });
    } catch (error: unknown) {
      console.error("Bulk archive error:", error);
      res.status(500).json({ message: "Toplu arşivleme başarısız" });
    }
  });

  // ========================================
  // TASK ACCEPT / REJECT / EXTENSION ENDPOINTS (Sprint 11)
  // ========================================

  router.post('/api/tasks/:id/accept', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

      const assigneeRow = await db.select().from(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
        .then(rows => rows[0]);

      const isDirectAssignee = task.assignedToId === user.id;
      
      if (!assigneeRow && !isDirectAssignee) {
        return res.status(403).json({ message: "Bu görev size atanmamış" });
      }

      if (assigneeRow) {
        await db.update(taskAssignees)
          .set({ acceptanceStatus: 'accepted', acceptedAt: new Date() })
          .where(eq(taskAssignees.id, assigneeRow.id));
      }

      if (isDirectAssignee && task.status === 'beklemede') {
        await db.update(tasks)
          .set({ status: 'devam_ediyor', startedAt: new Date(), updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
      }

      if (task.assignedById && task.assignedById !== user.id) {
        const accepter = await storage.getUser(user.id);
        const accepterName = accepter ? `${accepter.firstName || ''} ${accepter.lastName || ''}`.trim() : 'Bir çalışan';
        await storage.createNotification({
          userId: task.assignedById,
          type: 'task_accepted',
          title: 'Görev Kabul Edildi',
          message: `${accepterName} görevi kabul etti: "${task.description?.substring(0, 50)}..."`,
          link: `/gorevler?taskId=${taskId}`,
          branchId: task.branchId,
        });
      }

      res.json({ message: "Görev kabul edildi" });
    } catch (error) {
      console.error("Task accept error:", error);
      res.status(500).json({ message: "Kabul işlemi başarısız" });
    }
  });

  router.post('/api/tasks/:id/reject-assignment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { reason } = req.body;
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID" });
      if (!reason || reason.trim().length === 0) return res.status(400).json({ message: "Red sebebi zorunludur" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

      const assigneeRow = await db.select().from(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
        .then(rows => rows[0]);

      const isDirectAssignee = task.assignedToId === user.id;
      
      if (!assigneeRow && !isDirectAssignee) {
        return res.status(403).json({ message: "Bu görev size atanmamış" });
      }

      if (assigneeRow) {
        await db.update(taskAssignees)
          .set({ acceptanceStatus: 'rejected', rejectedAt: new Date(), rejectionReason: reason })
          .where(eq(taskAssignees.id, assigneeRow.id));
      }

      if (task.assignedById && task.assignedById !== user.id) {
        const rejecter = await storage.getUser(user.id);
        const rejecterName = rejecter ? `${rejecter.firstName || ''} ${rejecter.lastName || ''}`.trim() : 'Bir çalışan';
        await storage.createNotification({
          userId: task.assignedById,
          type: 'task_rejected',
          title: 'Görev Reddedildi',
          message: `${rejecterName} görevi reddetti: "${task.description?.substring(0, 50)}..." Sebep: ${reason}`,
          link: `/gorevler?taskId=${taskId}`,
          branchId: task.branchId,
        });
      }

      res.json({ message: "Görev atama reddedildi" });
    } catch (error) {
      console.error("Task reject-assignment error:", error);
      res.status(500).json({ message: "Red işlemi başarısız" });
    }
  });

  router.post('/api/tasks/:id/request-extension', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { reason, days } = req.body;
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID" });
      if (!reason || !days) return res.status(400).json({ message: "Sebep ve gün sayısı zorunludur" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

      const isAssignedTo = task.assignedToId === user.id;
      const assigneeRow = await db.select().from(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
        .then(rows => rows[0]);

      if (!isAssignedTo && !assigneeRow) {
        return res.status(403).json({ message: "Bu görev size atanmamış, uzatma talebi gönderemezsiniz" });
      }

      if (assigneeRow) {
        await db.update(taskAssignees)
          .set({ extensionRequestedAt: new Date(), extensionReason: reason, extensionDays: days })
          .where(eq(taskAssignees.id, assigneeRow.id));
      }

      await db.update(tasks)
        .set({ extensionReason: reason, requestedDueDate: task.dueDate ? new Date(new Date(task.dueDate).getTime() + days * 86400000) : null, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      if (task.assignedById && task.assignedById !== user.id) {
        const requester = await storage.getUser(user.id);
        const requesterName = requester ? `${requester.firstName || ''} ${requester.lastName || ''}`.trim() : 'Bir çalışan';
        await storage.createNotification({
          userId: task.assignedById,
          type: 'task_extension_requested',
          title: 'Süre Uzatma Talebi',
          message: `${requesterName} görev için ${days} gün uzatma talep etti: "${task.description?.substring(0, 50)}..."`,
          link: `/gorevler?taskId=${taskId}`,
          branchId: task.branchId,
        });
      }

      res.json({ message: "Süre uzatma talebi gönderildi" });
    } catch (error) {
      console.error("Task extension request error:", error);
      res.status(500).json({ message: "Uzatma talebi başarısız" });
    }
  });

  // ========================================
  // TASK COMMENTS CRUD (Sprint 11)
  // ========================================

  router.get('/api/tasks/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID" });

      const commentRows = await db.select().from(taskComments)
        .where(eq(taskComments.taskId, taskId))
        .orderBy(asc(taskComments.createdAt));

      if (commentRows.length === 0) return res.json([]);

      const userIds = [...new Set(commentRows.map(c => c.userId))];
      const usersMap = await storage.getUsersByIds(userIds);

      const enriched = commentRows.map(c => {
        const u = usersMap.get(c.userId);
        return {
          ...c,
          userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Bilinmiyor',
          userRole: u?.role || null,
          userProfileImage: u?.profileImageUrl || null,
        };
      });

      res.json(enriched);
    } catch (error) {
      console.error("Task comments fetch error:", error);
      res.status(500).json({ message: "Yorumlar alınamadı" });
    }
  });

  router.post('/api/tasks/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) return res.status(400).json({ message: "Geçersiz görev ID" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

      const isParticipant = task.assignedToId === user.id || task.assignedById === user.id || task.createdById === user.id;
      const isHQ = user.role && isHQRole(user.role as UserRoleType);
      if (!isParticipant && !isHQ) {
        const assigneeCheck = await db.select().from(taskAssignees)
          .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
          .then(rows => rows.length > 0);
        if (!assigneeCheck) {
          return res.status(403).json({ message: "Bu göreve yorum yapma yetkiniz yok" });
        }
      }

      const { message, commentType, attachmentUrl, isInternal } = req.body;
      if (!message || message.trim().length === 0) return res.status(400).json({ message: "Mesaj boş olamaz" });

      const [comment] = await db.insert(taskComments).values({
        taskId,
        userId: user.id,
        message: message.trim(),
        commentType: commentType || 'message',
        attachmentUrl: attachmentUrl || null,
        isInternal: isInternal || false,
      }).returning();

      const commenter = await storage.getUser(user.id);
      const commenterName = commenter ? `${commenter.firstName || ''} ${commenter.lastName || ''}`.trim() : 'Bir çalışan';

      const notifyIds = new Set<string>();
      if (task.assignedToId && task.assignedToId !== user.id) notifyIds.add(task.assignedToId);
      if (task.assignedById && task.assignedById !== user.id) notifyIds.add(task.assignedById);

      const assigneeRows = await db.select().from(taskAssignees)
        .where(eq(taskAssignees.taskId, taskId));
      for (const a of assigneeRows) {
        if (a.userId !== user.id) notifyIds.add(a.userId);
      }

      for (const nId of notifyIds) {
        try {
          await storage.createNotification({
            userId: nId,
            type: 'task_comment',
            title: 'Görevde Yeni Yorum',
            message: `${commenterName}: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
            link: `/gorevler?taskId=${taskId}`,
            branchId: task.branchId,
          });
        } catch (e) { console.error(e); }
      }

      res.json({
        ...comment,
        userName: commenterName,
        userRole: commenter?.role || null,
        userProfileImage: commenter?.profileImageUrl || null,
      });
    } catch (error) {
      console.error("Task comment create error:", error);
      res.status(500).json({ message: "Yorum eklenemedi" });
    }
  });

  router.delete('/api/tasks/:taskId/comments/:commentId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) return res.status(400).json({ message: "Geçersiz yorum ID" });

      const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, commentId));
      if (!comment) return res.status(404).json({ message: "Yorum bulunamadı" });

      if (comment.userId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu yorumu silme yetkiniz yok" });
      }

      await db.delete(taskComments).where(eq(taskComments.id, commentId));
      res.json({ message: "Yorum silindi" });
    } catch (error) {
      console.error("Task comment delete error:", error);
      res.status(500).json({ message: "Yorum silinemedi" });
    }
  });

export default router;
