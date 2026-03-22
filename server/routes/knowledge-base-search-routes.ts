import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import { eq, sql } from "drizzle-orm";
import { generateEmbedding } from "../ai";
import { onFeedbackReceived } from "../event-task-generator";
import {
  badges,
} from "@shared/schema";

const router = Router();

  // ========================================
  // RAG KNOWLEDGE BASE - Vector Search
  // ========================================
  
  router.post('/api/knowledge-base/search', isAuthenticated, async (req, res) => {
    try {
      const { query, limit = 5 } = req.body;
      const userId = req.user.id;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Arama sorgusu gereklidir" });
      }

      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query);
      
      // Semantic search using vector similarity
      const results = await db.execute(
        sql`
          SELECT 
            ke.id,
            ke.title,
            ke.category,
            emb.chunk_text,
            emb.chunk_index,
            1 - (emb.embedding <=> ${sql`'[${queryEmbedding.join(', ')}]'`}) as similarity
          FROM knowledge_base_articles ke
          JOIN embeddings emb ON ke.id = emb.article_id
          WHERE ke.is_published = true
          AND 1 - (emb.embedding <=> ${sql`'[${queryEmbedding.join(', ')}]'`}) > 0.5
          ORDER BY similarity DESC
          LIMIT ${limit * 3}
        `
      );

      // Group by article
      const groupedResults = new Map();
      const resultRows = results.rows || [];
      
      resultRows.forEach(row => {
        const key = row.id;
        if (!groupedResults.has(key)) {
          groupedResults.set(key, {
            id: row.id,
            title: row.title,
            category: row.category,
            chunks: [],
            relevance: row.similarity,
          });
        }
        groupedResults.get(key).chunks.push({
          text: row.chunk_text,
          index: row.chunk_index,
          similarity: row.similarity,
        });
      });

      const finalResults = Array.from(groupedResults.values()).slice(0, limit);
      res.json(finalResults);
    } catch (error: unknown) {
      handleApiError(res, error, "SearchKnowledgeBase");
    }
  });

  // ========================================
  // BRANCH FEEDBACK SYSTEM
  // ========================================

  // POST /api/feedback - Şubeler geribildirimi gönder
  router.post("/api/feedback", isAuthenticated, async (req, res) => {
    try {
      const { branchId, type, subject, message } = req.body;
      const feedback = await storage.createBranchFeedback({
        branchId,
        submittedById: req.user.id,
        type,
        subject,
        message,
      });
      // Event task: notify muhasebe about new feedback
      try {
        const muhasebeUsers = await storage.getUsersByRole('muhasebe');
        const muhasebeIkUsers = await storage.getUsersByRole('muhasebe_ik');
        const targetIds = [...muhasebeUsers, ...muhasebeIkUsers].map(u => u.id);
        if (targetIds.length > 0) {
          const branchInfo = req.body.branchId ? await storage.getBranch(req.body.branchId) : null;
          onFeedbackReceived(
            feedback.id || 0,
            req.body.message || req.body.content || 'Yeni geri bildirim',
            targetIds,
            branchInfo?.name
          );
        }
      } catch (error: unknown) { console.error("Event task error:", error); }
      res.json(feedback);
    } catch (error: unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/feedback - Muhasebe tüm geribildirimleri görmesi
  router.get("/api/feedback", isAuthenticated, async (req, res) => {
    try {
      const { status, type, branchId } = req.query;
      const feedbacks = await storage.getBranchFeedbacks({ status, type, branchId: branchId ? parseInt(branchId) : undefined });
      res.json(feedbacks);
    } catch (error: unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/feedback/:id - Muhasebe geri cevap ver
  router.patch("/api/feedback/:id", isAuthenticated, async (req, res) => {
    try {
      const { response, status } = req.body;
      const feedback = await storage.updateBranchFeedback(parseInt(req.params.id), {
        response,
        status: status || "yanıtlandı",
        respondedById: req.user.id,
        respondedAt: new Date(),
      });
      res.json(feedback);
    } catch (error: unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // BADGE SEEDING - Initialize career level badges
  // ========================================
  const seedBadges = async () => {
    try {
      const badgesList = [
        { badgeKey: 'coffee_cherry', titleTr: 'Kahve Kirazı', descriptionTr: 'Stajyer seviyesi - Başlangıcın', category: 'career', points: 50 },
        { badgeKey: 'green_bean', titleTr: 'Yeşil Çekirdek', descriptionTr: 'Bar Buddy seviyesi - Temel beceriler', category: 'career', points: 75 },
        { badgeKey: 'bean_expert', titleTr: 'Çekirdek Uzmanı', descriptionTr: 'Barista seviyesi - Uzman bilgi', category: 'career', points: 100 },
        { badgeKey: 'roast_master', titleTr: 'Kavurma Ustası', descriptionTr: 'Supervisor Buddy seviyesi - Liderlik', category: 'career', points: 125 },
        { badgeKey: 'coffee_pro', titleTr: 'Kahve Profesyoneli', descriptionTr: 'Supervisor seviyesi - Profesyonel', category: 'career', points: 150 },
      ];
      
      for (const badge of badgesList) {
        try {
          const existing = await db.select().from(badges).where(eq(badges.badgeKey, badge.badgeKey));
          if (!existing || existing.length === 0) {
            await db.insert(badges).values(badge);
          }
        } catch (error: unknown) {
          // Badge already exists, skip
        }
      }
    } catch (error: unknown) {
      console.error('Badge seeding error:', error);
    }
  };
  
  await seedBadges();


export default router;
