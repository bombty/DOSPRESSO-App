import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { hasPermission, type UserRoleType } from "../permission-service";
import { handleApiError } from "./helpers";
import { eq, asc, and, sql, inArray, ne, count } from "drizzle-orm";
import {
  users,
  messages,
  threadParticipants,
  hasPermission as schemaHasPermission,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ===== MESSAGING SYSTEM =====

  // GET /api/messages/recipients - Get list of users available for messaging (no employees permission needed)
  router.get('/api/messages/recipients', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (!hasPermission(currentUser.role as UserRoleType, 'messages', 'view')) {
        return res.status(403).json({ message: "Mesaj erişim yetkiniz yok" });
      }
      const allUsersList = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(and(ne(users.id, currentUser.id), eq(users.isActive, true)));
      res.json(allUsersList);
    } catch (error: unknown) {
      console.error("Error fetching message recipients:", error);
      res.status(500).json({ message: "Alici listesi alinamadi" });
    }
  });

  router.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userThreads = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(eq(threadParticipants.userId, userId));
      if (userThreads.length === 0) { return res.json([]); }

      const threadIds = userThreads.map(ut => ut.threadId);

      const [allLastMessages, allFirstMessages, allParticipants, allUnread] = await Promise.all([
        db.select({
          threadId: messages.threadId,
          body: messages.body,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
          rn: sql<number>`(ROW_NUMBER() OVER (PARTITION BY ${messages.threadId} ORDER BY ${messages.createdAt} DESC))::int`,
        }).from(messages).where(inArray(messages.threadId, threadIds)),

        db.select({
          threadId: messages.threadId,
          subject: messages.subject,
          rn: sql<number>`(ROW_NUMBER() OVER (PARTITION BY ${messages.threadId} ORDER BY ${messages.createdAt} ASC))::int`,
        }).from(messages).where(inArray(messages.threadId, threadIds)),

        db.select({
          threadId: threadParticipants.threadId,
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }).from(threadParticipants).innerJoin(users, eq(users.id, threadParticipants.userId)).where(inArray(threadParticipants.threadId, threadIds)),

        db.select({
          threadId: messages.threadId,
          count: sql<number>`count(*)::int`,
        }).from(messages)
          .innerJoin(threadParticipants, and(
            eq(threadParticipants.threadId, messages.threadId),
            eq(threadParticipants.userId, sql`${userId}`)
          ))
          .where(and(
            inArray(messages.threadId, threadIds),
            sql`${messages.senderId} != ${userId}`,
            sql`(${threadParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${threadParticipants.lastReadAt})`
          ))
          .groupBy(messages.threadId),
      ]);

      const lastMsgMap = new Map<string, { body: string; createdAt: Date; senderId: string }>();
      for (const m of allLastMessages) {
        if (Number(m.rn) === 1) lastMsgMap.set(m.threadId, { body: m.body, createdAt: m.createdAt, senderId: m.senderId });
      }
      const firstSubjectMap = new Map<string, string>();
      for (const m of allFirstMessages) {
        if (Number(m.rn) === 1) firstSubjectMap.set(m.threadId, m.subject || 'Mesaj');
      }
      const participantMap = new Map<string, { id: string; firstName: string; lastName: string; profileImageUrl: string | null }[]>();
      for (const p of allParticipants) {
        if (!participantMap.has(p.threadId)) participantMap.set(p.threadId, []);
        participantMap.get(p.threadId)!.push({ id: p.id, firstName: p.firstName, lastName: p.lastName, profileImageUrl: p.profileImageUrl });
      }
      const unreadMap = new Map<string, number>();
      for (const u of allUnread) {
        unreadMap.set(u.threadId, u.count);
      }

      const sentByMeSet = new Set<string>();
      for (const m of allLastMessages) {
        if (m.senderId === userId) sentByMeSet.add(m.threadId);
      }

      const threadSummaries = [];
      for (const tid of threadIds) {
        const last = lastMsgMap.get(tid);
        if (!last) continue;
        threadSummaries.push({
          threadId: tid,
          subject: firstSubjectMap.get(tid) || 'Mesaj',
          participants: participantMap.get(tid) || [],
          lastMessageBody: last.body,
          lastMessageAt: last.createdAt,
          unreadCount: unreadMap.get(tid) || 0,
          sentByMe: sentByMeSet.has(tid),
        });
      }
      threadSummaries.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      res.json(threadSummaries);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchMessageThreads");
    }
  });
  router.get('/api/messages/unread-count', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userThreads = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(eq(threadParticipants.userId, userId));
      if (userThreads.length === 0) { return res.json({ unreadCount: 0 }); }

      const threadIds = userThreads.map(ut => ut.threadId);
      const [result] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(messages)
        .innerJoin(threadParticipants, and(
          eq(threadParticipants.threadId, messages.threadId),
          eq(threadParticipants.userId, sql`${userId}`)
        ))
        .where(and(
          inArray(messages.threadId, threadIds),
          sql`${messages.senderId} != ${userId}`,
          sql`(${threadParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${threadParticipants.lastReadAt})`
        ));
      res.json({ unreadCount: result?.count || 0 });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchUnreadCount");
    }
  });
  router.get('/api/messages/:threadId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      const [participant] = await db.select().from(threadParticipants).where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
      if (!participant) { return res.status(403).json({ message: "Bu mesaj dizisine erişim yetkiniz yok" }); }
      const threadMessages = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.createdAt);
      const participants = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl, role: users.role }).from(threadParticipants).innerJoin(users, eq(users.id, threadParticipants.userId)).where(eq(threadParticipants.threadId, threadId));
      res.json({ messages: threadMessages, participants });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchThreadMessages");
    }
  });
  router.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { threadId, recipientId, recipientRole, subject, body, type, attachments } = req.body;
      if (!body || body.trim() === '') { return res.status(400).json({ message: "Mesaj içeriği gerekli" }); }
      let targetThreadId = threadId;
      if (!targetThreadId) {
        targetThreadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: userId });
        if (recipientId) { await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: recipientId }).onConflictDoNothing(); }
        else if (recipientRole) {
          const roleUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, recipientRole));
          for (const u of roleUsers) { if (u.id !== userId) { await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: u.id }).onConflictDoNothing(); } }
        }
      }
      const [newMessage] = await db.insert(messages).values({ threadId: targetThreadId, senderId: userId, recipientId: recipientId || null, recipientRole: recipientRole || null, subject: subject || 'Mesaj', body: body.trim(), type: type || 'direct', attachments: attachments && attachments.length > 0 ? attachments : null }).returning();
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(and(eq(threadParticipants.threadId, targetThreadId), eq(threadParticipants.userId, userId)));
      res.json(newMessage);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateMessage");
    }
  });
  router.post('/api/messages/:threadId/read', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error marking thread as read:", error);
      res.status(500).json({ message: "Mesaj okundu olarak işaretlenemedi" });
    }
  });

  // POST /api/messages/:threadId/replies - Add a reply to an existing thread
  router.post('/api/messages/:threadId/replies', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      const { body, attachments } = req.body;

      if (!body || typeof body !== 'string' || body.trim() === '') {
        return res.status(400).json({ message: "Mesaj içeriği gerekli" });
      }

      // Verify user is a participant of the thread
      const [participant] = await db.select().from(threadParticipants).where(
        and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId))
      );

      if (!participant) {
        return res.status(403).json({ message: "Bu thread'e erişim yetkiniz yok" });
      }

      const [firstMsg] = await db.select({ subject: messages.subject }).from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt)).limit(1);
      const [newMessage] = await db.insert(messages).values({
        threadId,
        senderId: userId,
        recipientId: null,
        recipientRole: null,
        subject: firstMsg?.subject || 'Mesaj',
        body: body.trim(),
        type: 'direct',
        attachments: attachments && attachments.length > 0 ? attachments : null,
      }).returning();

      // Update sender's lastReadAt
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(
        and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId))
      );

      res.json(newMessage);
    } catch (error: unknown) {
      console.error("Error creating message reply:", error);
      res.status(500).json({ message: "Yanıt gönderilemedi" });
    }
  });


export default router;
