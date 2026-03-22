import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { and, or } from "drizzle-orm";
import {
  branches,
  users,
  messages,
  isHQRole,
} from "@shared/schema";

const router = Router();

  // =============================================
  // HQ SUPPORT TICKET ROUTES
  // =============================================
  
  // GET /api/hq-support/tickets - Get all tickets (HQ sees assigned categories, branch sees own)
  router.get('/api/hq-support/tickets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { status, category } = req.query;
      
      let tickets: any[];
      
      if (isHQRole(user.role) || user.role === 'admin') {
        // Admin sees all, HQ users see their assigned categories or all if no assignments
        if (user.role === 'admin') {
          tickets = await storage.getHQSupportTickets(undefined, status, category);
        } else {
          tickets = await storage.getHQSupportTicketsByUser(user.id);
          // If user has no assigned categories, show all tickets (for triage)
          if (tickets.length === 0) {
            tickets = await storage.getHQSupportTickets(undefined, status, category);
          } else if (status) {
            tickets = tickets.filter((t) => t.status === status);
          }
        }
      } else {
        // Branch users see only their own tickets
        tickets = await storage.getHQSupportTicketsByCreator(user.id);
        if (status) {
          tickets = tickets.filter((t) => t.status === status);
        }
      }
      
      // Enrich with branch and user info
      const branches = await storage.getBranches();
      const allUsers = await db.select().from(users);
      
      const enrichedTickets = tickets.map((ticket) => {
        const branch = branches.find(b => b.id === ticket.branchId);
        const createdBy = allUsers.find(u => u.id === ticket.createdById);
        return {
          ...ticket,
          branch: branch || { name: 'Unknown' },
          createdBy: createdBy ? { firstName: createdBy.firstName, lastName: createdBy.lastName } : { firstName: 'Unknown', lastName: '' },
          messageCount: 0,
        };
      });
      
      res.json(enrichedTickets);
    } catch (error: unknown) {
      console.error("Get tickets error:", error);
      res.status(500).json({ message: "Talepler alınamadı" });
    }
  });
  
  // POST /api/hq-support/tickets - Create new ticket
  router.post('/api/hq-support/tickets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      const ticketData = {
        ...req.body,
        createdById: user.id,
        branchId: user.branchId || req.body.branchId,
        priority: req.body.priority || 'normal',
        status: 'aktif',
      };
      
      const ticket = await storage.createHQSupportTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error: unknown) {
      console.error("Create ticket error:", error);
      res.status(500).json({ message: "Talep oluşturulamadı" });
    }
  });
  
  // GET /api/hq-support/tickets/:id - Get single ticket with branch/user info
  router.get('/api/hq-support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
        return res.status(403).json({ message: "Bu talebe erişim yetkiniz yok" });
      }
      
      const allBranches = await storage.getBranches();
      const branch = allBranches.find(b => b.id === ticket.branchId);
      const allUsers = await db.select().from(users);
      const createdBy = allUsers.find(u => u.id === ticket.createdById);
      
      res.json({
        ...ticket,
        branch: branch || { name: 'Unknown' },
        createdBy: createdBy ? { firstName: createdBy.firstName, lastName: createdBy.lastName } : { firstName: 'Unknown', lastName: '' },
        messageCount: 0,
      });
    } catch (error: unknown) {
      console.error("Get ticket details error:", error);
      res.status(500).json({ message: "Talep detayları alınamadı" });
    }
  });

  // GET /api/hq-support/tickets/:id/messages - Get messages for a ticket
  router.get('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
        return res.status(403).json({ message: "Bu talebe erişim yetkiniz yok" });
      }
      
      const messagesList = await storage.getHQSupportMessages(ticketId);
      const allUsers = await db.select().from(users);
      
      const enrichedMessages = messagesList.map((msg) => {
        const sender = allUsers.find((u) => u.id === msg.senderId);
        return {
          ...msg,
          sender: sender ? { firstName: sender.firstName, lastName: sender.lastName, profileImageUrl: sender.profileImageUrl } : null,
        };
      });
      
      res.json(enrichedMessages);
    } catch (error: unknown) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Mesajlar alınamadı" });
    }
  });
  
  // PATCH /api/hq-support/tickets/:id - Update ticket (close with rating by creator)
  router.patch('/api/hq-support/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      const updates = req.body;
      
      if (updates.status === 'kapatildi') {
        if (ticket.createdById !== user.id && user.role !== 'admin') {
          return res.status(403).json({ message: "Sadece talebi olusturan kisi kapatabilir" });
        }
        updates.closedAt = new Date();
        updates.closedBy = user.id;
      } else {
        if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
          return res.status(403).json({ message: "Talep güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateHQSupportTicket(ticketId, updates);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update ticket error:", error);
      res.status(500).json({ message: "Talep güncellenemedi" });
    }
  });
  
  // POST /api/hq-support/tickets/:id/messages - Add message to ticket
  router.post('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      const message = await storage.createHQSupportMessage({
        ticketId,
        senderId: user.id,
        message: req.body.message,
        attachments: req.body.attachments || [],
        isInternal: req.body.isInternal || false,
      });
      
      res.status(201).json(message);
    } catch (error: unknown) {
      console.error("Add message error:", error);
      res.status(500).json({ message: "Mesaj eklenemedi" });
    }
  });
  

export default router;
