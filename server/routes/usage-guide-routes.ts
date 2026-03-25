import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { ne } from "drizzle-orm";
import { z } from "zod";
import {
  messages,
} from "@shared/schema";

const router = Router();

  // ========================================
  // USAGE GUIDE ENDPOINTS
  // ========================================

  router.get('/api/me/usage-guide', isAuthenticated, async (req, res) => {
    try {
      const { getRoleGuideContent } = await import('../usage-guide-content');
      const role = req.user?.role || 'stajyer';
      const content = getRoleGuideContent(role);
      res.json(content);
    } catch (error: unknown) {
      console.error("Usage guide error:", error);
      res.status(500).json({ message: "Kullanım kılavuzu yüklenemedi" });
    }
  });

  const usageGuideRateLimit = new Map<string, number>();

  router.post('/api/me/usage-guide/ask', isAuthenticated, async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ message: "Lütfen bir soru girin" });
      }
      if (question.length > 500) {
        return res.status(400).json({ message: "Soru çok uzun, lütfen kısaltın" });
      }

      const userId = req.user?.id;
      const now = Date.now();
      const lastRequest = usageGuideRateLimit.get(userId);
      if (lastRequest && now - lastRequest < 5000) {
        return res.status(429).json({ message: "Lütfen birkaç saniye bekleyin" });
      }
      usageGuideRateLimit.set(userId, now);

      const { getRoleGuideContent } = await import('../usage-guide-content');
      const role = req.user?.role || 'stajyer';
      const guideContent = getRoleGuideContent(role);

      const { chat } = await import('../services/ai-client');

      const moduleList = guideContent.availableModules.map(m => `- ${m.name}: ${m.description} (${m.path})`).join('\n');
      const restrictionList = guideContent.restrictions.length > 0 ? guideContent.restrictions.join(', ') : 'Yok';

      const systemPrompt = `Sen DOSPRESSO franchise yönetim sisteminin Türkçe yardım asistanısın.
Kullanıcının rolü: ${guideContent.roleTitle} (${guideContent.roleKey})
Rol açıklaması: ${guideContent.roleDescription}

Erişebildiği modüller:
${moduleList}

Kısıtlamalar: ${restrictionList}

Kurallar:
- Sadece Türkçe yanıt ver
- Kısa ve net yanıtlar ver
- Kullanıcının rolüne uygun bilgi ver
- Erişemediği modüller hakkında yönlendirme yapma
- Sistemi nasıl kullanacağını adım adım anlat`;

      const completion = await chat({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question.trim() },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const answer = (completion.choices[0]?.message?.content || "Üzgünüm, sorunuza yanıt veremedim. Lütfen tekrar deneyin.") + '\n\n-- Kullanım Kılavuzu sayfasında rolünüze özel tüm modül bilgilerini ve ipuçlarını bulabilirsiniz.';
      res.json({ answer });
    } catch (error: unknown) {
      console.error("Usage guide AI error:", error);
      res.status(500).json({ message: "AI yanıt üretemedi, lütfen tekrar deneyin" });
    }
  });


export default router;
