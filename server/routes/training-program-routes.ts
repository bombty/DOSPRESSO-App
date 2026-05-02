import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, asc, and } from "drizzle-orm";
import { z } from "zod";
import {
  messages,
} from "@shared/schema";

const router = Router();

  // ========================================
  // PROFESSIONAL TRAINING SYSTEM ROUTES
  // ========================================

  const TRAINING_TOPICS: Record<string, string> = {
    'franchise-yonetimi': 'Franchise Yönetimi',
    'performans-analizi': 'Performans Analizi',
    'kriz-yonetimi': 'Kriz Yönetimi',
    'tedarik-zinciri': 'Tedarik Zinciri',
    'maliyet-analizi': 'Maliyet Analizi',
    'tedarikci-iliskileri': 'Tedarikçi İlişkileri',
    'finansal-raporlama': 'Finansal Raporlama',
    'vergi-mevzuat': 'Vergi & Mevzuat',
    'butce-planlama': 'Bütçe Planlama',
    'ekipman-bakim': 'Ekipman Bakım',
    'yeni-teknolojiler': 'Yeni Teknolojiler',
    'problem-cozme': 'Problem Çözme',
    'uretim-planlama': 'Üretim Planlama',
    'kalite-kontrol': 'Kalite Kontrol',
  };

  router.get("/api/training-program/:topicId/lessons", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      if (!TRAINING_TOPICS[topicId]) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingLessons } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const lessons = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId))
        .orderBy(asc(professionalTrainingLessons.lessonIndex));
      res.json({ lessons, topicTitle: TRAINING_TOPICS[topicId] });
    } catch (error: unknown) {
      console.error("Error fetching training lessons:", error);
      res.status(500).json({ message: "Dersler alınırken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/generate-lessons", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const topicTitle = TRAINING_TOPICS[topicId];
      if (!topicTitle) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingLessons } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const existing = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId));
      if (existing.length > 0) {
        return res.json({ message: "Dersler zaten mevcut", lessons: existing });
      }
      const { chat } = await import('../services/ai-client');
      const completion = await chat({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen DOSPRESSO kahve franchise zinciri için profesyonel eğitim içeriği üreten bir eğitim uzmanısın. Türkçe olarak, profesyonel ama anlaşılır bir dilde yaz. Her ders 800-1200 kelime uzunluğunda olmalı. İçerik formatı: Markdown kullan - başlıklar (##), madde işaretleri (-), numaralı listeler (1.), kalın metin (**) kullan. DOSPRESSO franchise bağlamında pratik örnekler, teknikler ve en iyi uygulamalar ekle. Kahve sektörü ve franchise yönetimine özgü gerçekçi senaryolar kullan."
          },
          {
            role: "user",
            content: '"' + topicTitle + '" konusu için 4 ders oluştur. Her ders için JSON formatında döndür: [{ "title": "Ders Başlığı", "content": "Markdown formatında ders içeriği", "duration": dakika_cinsinden_süre }] Sadece JSON array döndür, başka bir şey ekleme.'
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });
      const responseText = completion.choices[0]?.message?.content || "[]";
      let lessonsData: Array<{ title: string; content: string; duration: number }>;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        lessonsData = JSON.parse(cleaned);
      } catch (error: unknown) {
        return res.status(500).json({ message: "AI yanıtı ayrıştırılamadı" });
      }
      const insertedLessons: any[] = [];
      for (let i = 0; i < lessonsData.length; i++) {
        const lesson = lessonsData[i];
        const [inserted] = await db.insert(professionalTrainingLessons).values({
          topicId,
          lessonIndex: i,
          title: lesson.title,
          content: lesson.content,
          duration: lesson.duration || 15,
        }).returning();
        insertedLessons.push(inserted);
      }
      res.json({ lessons: insertedLessons });
    } catch (error: unknown) {
      const { respondIfAiBudgetError } = await import('../ai-budget-guard');
      if (respondIfAiBudgetError(error, res)) return;
      console.error("Error generating training lessons:", error);
      res.status(500).json({ message: "Ders içerikleri oluşturulurken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/lesson/:lessonIndex/complete", isAuthenticated, async (req, res) => {
    try {
      const { topicId, lessonIndex } = req.params;
      const user = req.user!;
      const { professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const existing = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId),
          eq(professionalTrainingProgress.lessonIndex, parseInt(lessonIndex))
        ));
      if (existing.length > 0) {
        await db.update(professionalTrainingProgress)
          .set({ completed: true, completedAt: new Date() })
          .where(eq(professionalTrainingProgress.id, existing[0].id));
      } else {
        await db.insert(professionalTrainingProgress).values({
          userId: user.id,
          topicId,
          lessonIndex: parseInt(lessonIndex),
          completed: true,
          completedAt: new Date(),
        });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error completing lesson:", error);
      res.status(500).json({ message: "Ders tamamlanırken hata oluştu" });
    }
  });

  router.get("/api/training-program/:topicId/progress", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const user = req.user!;
      const { professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const progress = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId)
        ));
      const completedLessons = progress.filter(p => p.completed && p.quizScore === null);
      const quizResult = progress.find(p => p.quizScore !== null);
      res.json({
        completedLessons: completedLessons.map(p => p.lessonIndex),
        quizScore: quizResult?.quizScore ?? null,
        quizPassed: quizResult?.quizPassed ?? null,
      });
    } catch (error: unknown) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "İlerleme bilgisi alınırken hata oluştu" });
    }
  });

  router.get("/api/training-program/:topicId/quiz", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      if (!TRAINING_TOPICS[topicId]) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingQuizCache, professionalTrainingLessons } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const cached = await db.select().from(professionalTrainingQuizCache)
        .where(eq(professionalTrainingQuizCache.topicId, topicId));
      if (cached.length > 0) {
        return res.json({ questions: cached[0].questions });
      }
      const lessons = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId))
        .orderBy(asc(professionalTrainingLessons.lessonIndex));
      if (lessons.length === 0) {
        return res.status(400).json({ message: "Önce dersleri oluşturmalısınız" });
      }
      const lessonSummaries = lessons.map(l => l.title + ': ' + l.content.substring(0, 300)).join('\n');
      const { chat } = await import('../services/ai-client');
      const completion = await chat({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen DOSPRESSO kahve franchise zinciri eğitim sistemi için sınav soruları oluşturan bir uzmanısın. Türkçe olarak 5 çoktan seçmeli soru oluştur. Her sorunun 4 seçeneği olmalı (A, B, C, D). Doğru cevabı belirt. JSON formatında döndür."
          },
          {
            role: "user",
            content: 'Aşağıdaki ders içeriklerine dayalı 5 sınav soruları oluştur:\n\n' + lessonSummaries + '\n\nJSON formatı: [{ "question": "Soru metni", "options": ["A) Seçenek", "B) Seçenek", "C) Seçenek", "D) Seçenek"], "correctAnswer": 0 }] Sadece JSON array döndür.'
          }
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });
      const responseText = completion.choices[0]?.message?.content || "[]";
      let questions: any;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        questions = JSON.parse(cleaned);
      } catch (error: unknown) {
        return res.status(500).json({ message: "Sınav soruları ayrıştırılamadı" });
      }
      await db.insert(professionalTrainingQuizCache).values({
        topicId,
        questions,
      });
      res.json({ questions });
    } catch (error: unknown) {
      const { respondIfAiBudgetError } = await import('../ai-budget-guard');
      if (respondIfAiBudgetError(error, res)) return;
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Sınav soruları oluşturulurken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/quiz/submit", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const user = req.user!;
      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Cevaplar gerekli" });
      }
      const { professionalTrainingQuizCache, professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const cached = await db.select().from(professionalTrainingQuizCache)
        .where(eq(professionalTrainingQuizCache.topicId, topicId));
      if (cached.length === 0) {
        return res.status(400).json({ message: "Sınav bulunamadı" });
      }
      const questions = cached[0].questions as Array<{ question: string; options: string[]; correctAnswer: number }>;
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correctAnswer) {
          correct++;
        }
      }
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= 70;
      const existingQuizProgress = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId),
          eq(professionalTrainingProgress.lessonIndex, -1)
        ));
      if (existingQuizProgress.length > 0) {
        await db.update(professionalTrainingProgress)
          .set({ quizScore: score, quizPassed: passed, completedAt: new Date() })
          .where(eq(professionalTrainingProgress.id, existingQuizProgress[0].id));
      } else {
        await db.insert(professionalTrainingProgress).values({
          userId: user.id,
          topicId,
          lessonIndex: -1,
          completed: true,
          completedAt: new Date(),
          quizScore: score,
          quizPassed: passed,
        });
      }
      res.json({ score, passed, correct, total: questions.length });
    } catch (error: unknown) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Sınav gönderilirken hata oluştu" });
    }
  });



export default router;
