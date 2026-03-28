import { requireManifestAccess } from "../services/manifest-auth";
import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { handleApiError } from "./helpers";
import { desc, and, isNull, not, ne } from "drizzle-orm";
import { generateArticleEmbeddings, answerTechnicalQuestion, generateAISummary, generateArticleDraft } from "../ai";
import { z } from "zod";
import {
  insertKnowledgeBaseArticleSchema,
  users,
  tasks,
  equipment,
  equipmentFaults,
  checklists,
  recipes,
  recipeCategories,
  trainingModules,
  recipeVersions,
  checklistTasks,
  factoryQualitySpecs,
  isHQRole,
  isBranchRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // EMPLOYEE SATISFACTION SCORE ENDPOINTS
  // ========================================

  router.get('/api/users/:id/satisfaction-score', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own score, HQ can see all
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        // Check if user is a supervisor viewing their branch employee
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu skora erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu skora erişim yetkiniz yok" });
        }
      }
      
      const score = await storage.getEmployeeSatisfactionScore(targetUserId);
      
      if (!score) {
        // Return default scores if no data yet
        return res.json({
          userId: targetUserId,
          taskSatisfactionAvg: 0,
          checklistScoreAvg: 0,
          compositeScore: 0,
          taskRatingCount: 0,
          checklistRatingCount: 0,
          onTimeRate: 0,
        });
      }
      
      res.json(score);
    } catch (error: unknown) {
      console.error("Error fetching satisfaction score:", error);
      res.status(500).json({ message: "Performans skoru alınamadı" });
    }
  });

  router.get('/api/users/:id/task-ratings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own ratings, HQ/supervisors can see branch employees
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
      }
      
      const ratings = await storage.getUserTaskRatings(targetUserId);
      res.json(ratings);
    } catch (error: unknown) {
      console.error("Error fetching user task ratings:", error);
      res.status(500).json({ message: "Görev puanları alınamadı" });
    }
  });

  router.get('/api/users/:id/received-ratings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own ratings, HQ/supervisors can see branch employees
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
      }
      
      const ratings = await storage.getReceivedRatings(targetUserId);
      res.json(ratings);
    } catch (error: unknown) {
      console.error("Error fetching received ratings:", error);
      res.status(500).json({ message: "Alınan puanlar getirilemedi" });
    }
  });




  router.get('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const equipmentTypeId = req.query.equipmentTypeId as string | undefined;
      const isPublished = req.query.isPublished === 'true' ? true : undefined;
      const articles = await storage.getArticles(category, equipmentTypeId, isPublished);
      res.json(articles);
    } catch (error: unknown) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Makaleler alınırken hata oluştu" });
    }
  });

  router.post('/api/knowledge-base', isAuthenticated, async (req, res) => {
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
        } catch (error: unknown) {
          console.error("Error generating embeddings:", error);
        }
      }
      
      res.json(article);
    } catch (error: unknown) {
      console.error("Error creating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz makale verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Makale oluşturulurken hata oluştu" });
    }
  });

  const updateArticleSchema = insertKnowledgeBaseArticleSchema.partial();

  router.put('/api/knowledge-base/:id', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getArticle(id);
      if (!existing) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      const validatedData = updateArticleSchema.parse(req.body);
      const updated = await storage.updateArticle(id, validatedData);
      if (!updated) {
        return res.status(500).json({ message: "Güncelleme başarısız" });
      }

      let embeddingStatus = 'unchanged';
      await storage.deleteEmbeddingsByArticle(id);
      if (updated.isPublished) {
        try {
          const embeddings = await generateArticleEmbeddings(id, updated.title, updated.content);
          await storage.createEmbeddings(embeddings.map(e => ({
            articleId: id,
            chunkText: e.chunkText,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding,
          })));
          embeddingStatus = 'updated';
        } catch (embError) {
          console.error("Vektör güncelleme hatası:", embError.message);
          embeddingStatus = 'failed';
        }
      } else {
        embeddingStatus = 'removed';
      }

      res.json({ ...updated, embeddingStatus });
    } catch (error: unknown) {
      console.error("Error updating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Makale güncellenemedi" });
    }
  });

  router.delete('/api/knowledge-base/:id', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getArticle(id);
      if (!existing) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      await storage.deleteArticle(id);
      res.json({ message: "Makale silindi", articleId: id });
    } catch (error: unknown) {
      console.error("Error deleting article:", error);
      res.status(500).json({ message: "Makale silinemedi" });
    }
  });

  router.post('/api/knowledge-base/:id/reindex', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error reindexing article:", error);
      res.status(500).json({ message: "Makale yeniden indekslenemedi" });
    }
  });

  async function createArticleWithEmbedding(data: { title: string; content: string; category: string; tags?: string[]; isPublished?: boolean }) {
    const existing = await storage.getArticleByTitle(data.title);
    if (existing) return { skipped: true, article: existing };

    const article = await storage.createArticle({
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      isPublished: data.isPublished !== false,
      viewCount: 0,
    });

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
      } catch (err) {
        console.error(`Vektör oluşturma hatası (${article.title}):`, err.message);
      }
    }

    return { skipped: false, article };
  }

  router.post('/api/knowledge-base/seed-from-academy', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const modules = await db.select().from(trainingModules).where(isNull(trainingModules.deletedAt));

      const categoryMap: Record<string, string> = {
        'barista': 'training',
        'barista_basics': 'training',
        'Barista Basics': 'training',
        'stajyer': 'training',
        'bar buddy': 'training',
        'supervisor': 'training',
        'supervisor buddy': 'training',
        'onboarding': 'training',
        'hygiene': 'hygiene',
        'customer_service': 'training',
        'management': 'training',
        'depo': 'training',
      };

      let created = 0;
      let skipped = 0;

      for (const mod of modules) {
        const objectives = Array.isArray(mod.learningObjectives) ? mod.learningObjectives : [];
        const steps = Array.isArray(mod.steps) ? mod.steps : [];

        let content = `# ${mod.title}\n\n`;
        if (mod.description) content += `${mod.description}\n\n`;

        if (objectives.length > 0) {
          content += `## Öğrenme Hedefleri\n`;
          objectives.forEach((obj) => {
            const text = typeof obj === 'string' ? obj : obj?.text || obj?.title || JSON.stringify(obj);
            content += `- ${text}\n`;
          });
          content += '\n';
        }

        if (steps.length > 0) {
          content += `## Eğitim Adımları\n`;
          steps.forEach((step, i: number) => {
            const title = typeof step === 'string' ? step : step?.title || step?.name || `Adım ${i + 1}`;
            const desc = typeof step === 'object' ? (step?.description || step?.content || '') : '';
            content += `${i + 1}. **${title}**`;
            if (desc) content += `: ${desc}`;
            content += '\n';
          });
          content += '\n';
        }

        if (mod.aiSummary) {
          content += `## Özet\n${mod.aiSummary}\n\n`;
        }

        const category = categoryMap[mod.category || ''] || 'training';
        const tags = [
          ...(Array.isArray(mod.tags) ? mod.tags : []),
          mod.category || 'genel',
          'akademi',
          mod.level || 'beginner',
        ].filter(Boolean) as string[];

        const result = await createArticleWithEmbedding({
          title: mod.title,
          content,
          category,
          tags,
        });

        if (result.skipped) skipped++;
        else created++;
      }

      res.json({
        message: `Akademi aktarımı tamamlandı`,
        created,
        skipped,
        total: modules.length,
      });
    } catch (error: unknown) {
      console.error("Academy seed error:", error);
      res.status(500).json({ message: "Akademi aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-from-recipes', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const categories = await db.select().from(recipeCategories);
      const allRecipes = await db.select().from(recipes);
      const allVersions = await db.select().from(recipeVersions);

      let created = 0;
      let skipped = 0;

      for (const cat of categories) {
        const catRecipes = allRecipes.filter(r => r.categoryId === cat.id);
        if (catRecipes.length === 0) continue;

        let content = `# ${cat.titleTr} Reçeteleri\n\n`;
        content += `Bu kategoride ${catRecipes.length} ürün bulunmaktadır.\n\n`;

        for (const recipe of catRecipes) {
          content += `## ${recipe.nameTr}\n`;
          if (recipe.code) content += `Kod: ${recipe.code}\n`;
          if (recipe.coffeeType) content += `Kahve Tipi: ${recipe.coffeeType}\n`;
          if (recipe.difficulty) content += `Zorluk: ${recipe.difficulty}\n`;
          if (recipe.estimatedMinutes) content += `Tahmini Süre: ${recipe.estimatedMinutes} dakika\n`;

          const version = allVersions.find(v => v.recipeId === recipe.id && v.isActive);
          if (version) {
            if (version.ingredients && Array.isArray(version.ingredients)) {
              content += `\n### Malzemeler\n`;
              (version.ingredients as any[]).forEach((ing) => {
                if (typeof ing === 'string') {
                  content += `- ${ing}\n`;
                } else {
                  content += `- ${ing.name || ing.ingredient || ''}: ${ing.amount || ''} ${ing.unit || ''}\n`;
                }
              });
            }

            if (version.cookingSteps && Array.isArray(version.cookingSteps)) {
              content += `\n### Hazırlama Adımları\n`;
              (version.cookingSteps as any[]).forEach((step, i: number) => {
                const text = typeof step === 'string' ? step : step?.text || step?.description || '';
                content += `${i + 1}. ${text}\n`;
              });
            }

            if (version.sizes && typeof version.sizes === 'object') {
              content += `\n### Boyutlar\n`;
              const sizes = version.sizes as Record<string, any>;
              for (const [sizeName, sizeData] of Object.entries(sizes)) {
                content += `- **${sizeName}**`;
                if (sizeData && typeof sizeData === 'object') {
                  if (sizeData.cup_ml) content += ` (${sizeData.cup_ml}ml)`;
                  if (sizeData.espresso) content += `, Espresso: ${JSON.stringify(sizeData.espresso)}`;
                  if (sizeData.milk) content += `, Süt: ${JSON.stringify(sizeData.milk)}`;
                }
                content += '\n';
              }
            }
          }
          content += '\n---\n\n';
        }

        const result = await createArticleWithEmbedding({
          title: `${cat.titleTr} Reçeteleri`,
          content,
          category: 'recipe',
          tags: ['reçete', cat.titleTr.toLocaleLowerCase('tr-TR'), cat.slug || ''],
        });

        if (result.skipped) skipped++;
        else created++;
      }

      res.json({
        message: `Reçete aktarımı tamamlandı`,
        created,
        skipped,
        total: categories.length,
      });
    } catch (error: unknown) {
      console.error("Recipe seed error:", error);
      res.status(500).json({ message: "Reçete aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-procedures', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const allChecklists = await db.select().from(checklists);
      const allTasks = await db.select().from(checklistTasks);

      let created = 0;
      let skipped = 0;

      const openingChecklist = allChecklists.find(c => c.category === 'açılış');
      if (openingChecklist) {
        const tasks = allTasks.filter(t => t.checklistId === openingChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        let content = `# DOSPRESSO Şube Açılış Prosedürü\n\n`;
        content += `Şube açılışında aşağıdaki adımlar sırasıyla takip edilmelidir:\n\n`;
        tasks.forEach((t, i) => {
          content += `${i + 1}. ${t.taskDescription}`;
          if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
          if (t.taskTimeStart && t.taskTimeEnd) content += ` [${t.taskTimeStart} - ${t.taskTimeEnd}]`;
          content += '\n';
        });
        content += `\n## Önemli Notlar\n`;
        content += `- Açılış saati öncesinde tüm adımlar tamamlanmalıdır\n`;
        content += `- Espresso kalibrasyonu günlük olarak yapılmalıdır\n`;
        content += `- Stok eksiklikleri hemen raporlanmalıdır\n`;

        const result = await createArticleWithEmbedding({
          title: 'DOSPRESSO Şube Açılış Prosedürü',
          content,
          category: 'procedure',
          tags: ['açılış', 'prosedür', 'checklist', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      const closingChecklist = allChecklists.find(c => c.category === 'kapanış');
      if (closingChecklist) {
        const tasks = allTasks.filter(t => t.checklistId === closingChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        let content = `# DOSPRESSO Şube Kapanış Prosedürü\n\n`;
        content += `Şube kapanışında aşağıdaki adımlar sırasıyla takip edilmelidir:\n\n`;
        tasks.forEach((t, i) => {
          content += `${i + 1}. ${t.taskDescription}`;
          if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
          if (t.taskTimeStart && t.taskTimeEnd) content += ` [${t.taskTimeStart} - ${t.taskTimeEnd}]`;
          content += '\n';
        });
        content += `\n## Önemli Notlar\n`;
        content += `- Kasa kapanışı ve günlük rapor zorunludur\n`;
        content += `- Tüm ekipmanlar kapatılmalıdır\n`;
        content += `- Kapı kilitleme ve alarm kontrolü yapılmalıdır\n`;
        content += `- Buzdolabı sıcaklığı kontrol edilmelidir\n`;

        const result = await createArticleWithEmbedding({
          title: 'DOSPRESSO Şube Kapanış Prosedürü',
          content,
          category: 'procedure',
          tags: ['kapanış', 'prosedür', 'checklist', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const content = `# Müşteri Şikayet Yönetimi Prosedürü\n\n` +
          `## SLA Süreleri\n` +
          `DOSPRESSO müşteri şikayetleri öncelik seviyesine göre farklı SLA süreleri ile yönetilir:\n\n` +
          `| Öncelik | Yanıt Süresi | Çözüm Süresi |\n` +
          `|---------|-------------|-------------|\n` +
          `| Kritik | 30 dakika | 2 saat |\n` +
          `| Yüksek | 1 saat | 4 saat |\n` +
          `| Orta | 4 saat | 24 saat |\n` +
          `| Düşük | 8 saat | 72 saat |\n\n` +
          `## Şikayet Yönetim Adımları\n` +
          `1. **Kayıt**: Müşteri şikayeti sisteme kaydedilir (şube personeli veya müdür)\n` +
          `2. **Önceliklendirme**: Şikayet türüne göre öncelik belirlenir\n` +
          `3. **Atama**: İlgili birime veya kişiye atanır\n` +
          `4. **Bildirim**: İlgili yöneticilere otomatik bildirim gönderilir\n` +
          `5. **Takip**: SLA süresi içinde çözüm sağlanır\n` +
          `6. **Escalation**: SLA ihlalinde otomatik üst kademeye yükseltilir\n` +
          `7. **Kapanış**: Çözüm sonrası müşteriye bilgilendirme yapılır\n\n` +
          `## Escalation Kuralları\n` +
          `- SLA %75'e ulaştığında uyarı bildirimi\n` +
          `- SLA aşıldığında bölge müdürüne otomatik escalation\n` +
          `- 2x SLA aşımında genel müdürlüğe bildirim\n` +
          `- Kritik şikayetler anında müdür ve bölge müdürüne bildirilir\n\n` +
          `## İletişim Kuralları\n` +
          `- Müşteriyle saygılı ve profesyonel iletişim\n` +
          `- Çözüm süreci hakkında düzenli bilgilendirme\n` +
          `- Tazminat/iade kararları şube müdürü onayı ile\n`;

        const result = await createArticleWithEmbedding({
          title: 'Müşteri Şikayet Yönetimi Prosedürü',
          content,
          category: 'procedure',
          tags: ['şikayet', 'müşteri', 'SLA', 'escalation', 'prosedür'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const content = `# Kayıp Eşya Yönetimi Prosedürü\n\n` +
          `## Bulma Aşaması\n` +
          `1. Bulunan eşya derhal kayıt altına alınır\n` +
          `2. Eşyanın fotoğrafı çekilir\n` +
          `3. Bulunma yeri, tarih ve saati not edilir\n` +
          `4. Bulan personelin bilgileri kaydedilir\n\n` +
          `## Saklama Aşaması\n` +
          `1. Eşya güvenli bir yerde (kasa veya kilitli dolap) saklanır\n` +
          `2. Değerli eşyalar (cüzdan, telefon, mücevher) ayrı kaydedilir\n` +
          `3. Bozulabilir gıda/içecek ürünleri 24 saat sonra imha edilir\n\n` +
          `## Teslim Aşaması\n` +
          `1. Sahip kimliğini doğrular (eşya tanımı, kimlik belgesi)\n` +
          `2. Teslim tutanağı imzalatılır\n` +
          `3. Teslim tarih ve saati sisteme kaydedilir\n\n` +
          `## Bekleme Süreleri\n` +
          `- Değerli eşyalar: 90 gün\n` +
          `- Kıyafet ve aksesuar: 30 gün\n` +
          `- Diğer: 15 gün\n` +
          `- Süre sonunda eşya bağışlanır veya imha edilir\n\n` +
          `## Bildirimler\n` +
          `- Her kayıp eşya kaydında şube müdürüne bildirim\n` +
          `- Değerli eşyalarda bölge müdürüne bildirim\n` +
          `- Sahipsiz eşya süresi dolduğunda hatırlatma bildirimi\n`;

        const result = await createArticleWithEmbedding({
          title: 'Kayıp Eşya Yönetimi Prosedürü',
          content,
          category: 'procedure',
          tags: ['kayıp eşya', 'prosedür', 'güvenlik', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const dailyChecklist = allChecklists.find(c => c.category === 'günlük kontrol');
        const dailyTasks = dailyChecklist
          ? allTasks.filter(t => t.checklistId === dailyChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          : [];

        let content = `# Hijyen ve Temizlik Standartları\n\n`;
        content += `## HACCP Temel İlkeleri\n`;
        content += `DOSPRESSO tüm şubelerinde HACCP (Tehlike Analizi ve Kritik Kontrol Noktaları) standartlarına uyulmalıdır.\n\n`;
        content += `## Günlük Kontrol Listesi\n`;
        if (dailyTasks.length > 0) {
          dailyTasks.forEach((t, i) => {
            content += `${i + 1}. ${t.taskDescription}`;
            if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
            content += '\n';
          });
        }
        content += `\n## Temizlik Programı\n`;
        content += `### Her Vardiya\n`;
        content += `- Tezgah ve çalışma yüzeyleri silinir\n`;
        content += `- Kullanılan ekipmanlar temizlenir\n`;
        content += `- Çöp kutuları boşaltılır\n`;
        content += `- Müşteri alanı temizlenir\n\n`;
        content += `### Günlük\n`;
        content += `- Zemin yıkanır\n`;
        content += `- Buzdolabı sıcaklığı kontrol edilir (2-8°C)\n`;
        content += `- Espresso makinesi geri yıkama yapılır\n`;
        content += `- Tüm yüzeyler dezenfekte edilir\n\n`;
        content += `### Haftalık\n`;
        content += `- Derin temizlik yapılır\n`;
        content += `- Ekipman bakımları kontrol edilir\n`;
        content += `- Havalandırma filtreleri temizlenir\n`;
        content += `- Depo düzeni kontrol edilir (FIFO)\n\n`;
        content += `## Kişisel Hijyen\n`;
        content += `- Temiz üniforma giyilir\n`;
        content += `- Saçlar toplanır, bone takılır\n`;
        content += `- Tırnaklar kısa ve temiz tutulur\n`;
        content += `- El yıkama prosedürü uygulanır (en az 20 saniye)\n`;
        content += `- Eldiven kullanımı gerekli alanlarda eldiven giyilir\n`;

        const result = await createArticleWithEmbedding({
          title: 'Hijyen ve Temizlik Standartları',
          content,
          category: 'procedure',
          tags: ['hijyen', 'temizlik', 'HACCP', 'prosedür', 'standart'],
        });
        if (result.skipped) skipped++; else created++;
      }

      res.json({
        message: `Prosedür makaleleri oluşturuldu`,
        created,
        skipped,
        total: 5,
      });
    } catch (error: unknown) {
      console.error("Procedure seed error:", error);
      res.status(500).json({ message: "Prosedür oluşturma başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-quality-specs', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const specs = await db.select().from(factoryQualitySpecs);

      let content = `# DOSPRESSO Ürün Kalite Standartları\n\n`;
      content += `Bu belge, DOSPRESSO fabrikasında üretilen ürünlerin kalite kontrol standartlarını tanımlar.\n\n`;

      const numericSpecs = specs.filter(s => s.measurementType === 'numeric');
      const booleanSpecs = specs.filter(s => s.measurementType === 'boolean');

      if (numericSpecs.length > 0) {
        content += `## Sayısal Ölçüm Standartları\n\n`;
        content += `| Kriter | Minimum | Maksimum | Hedef | Birim |\n`;
        content += `|--------|---------|----------|-------|-------|\n`;
        numericSpecs.forEach(s => {
          content += `| ${s.name} | ${s.minValue || '-'} | ${s.maxValue || '-'} | ${s.targetValue || '-'} | ${s.unit || '-'} |\n`;
        });
        content += '\n';

        numericSpecs.forEach(s => {
          content += `### ${s.name}\n`;
          if (s.minValue && s.maxValue) {
            content += `- Kabul aralığı: ${s.minValue} - ${s.maxValue} ${s.unit || ''}\n`;
          }
          if (s.targetValue) {
            content += `- Hedef değer: ${s.targetValue} ${s.unit || ''}\n`;
          }
          content += '\n';
        });
      }

      if (booleanSpecs.length > 0) {
        content += `## Görsel / Duyusal Kontroller\n\n`;
        content += `Aşağıdaki kontroller evet/hayır (geçti/kaldı) olarak değerlendirilir:\n\n`;
        booleanSpecs.forEach(s => {
          content += `- **${s.name}**: Kontrol edilmeli${s.isRequired ? ' (Zorunlu)' : ''}\n`;
        });
        content += '\n';
      }

      content += `## Sıkça Sorulan Sorular\n\n`;
      content += `**Donut hamuru kaç gram olmalı?**\n`;
      const gramSpec = numericSpecs.find(s => s.name.toLocaleLowerCase('tr-TR').includes('gramaj'));
      if (gramSpec) {
        content += `Donut hamuru ${gramSpec.minValue}-${gramSpec.maxValue} ${gramSpec.unit} arasında olmalıdır. Hedef ağırlık ${gramSpec.targetValue} ${gramSpec.unit}'dır.\n\n`;
      }

      const heightSpec = numericSpecs.find(s => s.name.toLocaleLowerCase('tr-TR').includes('yükseklik'));
      if (heightSpec) {
        content += `**Donut yüksekliği ne olmalı?**\n`;
        content += `Donut yüksekliği ${heightSpec.minValue}-${heightSpec.maxValue} ${heightSpec.unit} arasında olmalıdır. Hedef yükseklik ${heightSpec.targetValue} ${heightSpec.unit}'dir.\n\n`;
      }

      let created = 0;
      let skipped = 0;

      const result = await createArticleWithEmbedding({
        title: 'DOSPRESSO Ürün Kalite Standartları',
        content,
        category: 'quality',
        tags: ['kalite', 'standart', 'gramaj', 'donut', 'üretim', 'fabrika'],
      });
      if (result.skipped) skipped++; else created++;

      res.json({
        message: `Kalite kriterleri aktarıldı`,
        created,
        skipped,
        total: 1,
      });
    } catch (error: unknown) {
      console.error("Quality specs seed error:", error);
      res.status(500).json({ message: "Kalite kriterleri aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/ask', isAuthenticated, async (req, res) => {
    try {
      const { question, equipmentId } = req.body;
      const userId = req.user.id;
      const userBranchId = req.user.branchId;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Soru gereklidir" });
      }

      // Build equipment context with branch equipment list
      let equipmentContext: {
        type: string;
        serialNumber?: string;
        branch?: string;
        recentFaults?: Array<{ description: string; date: string }>;
        branchEquipment?: Array<{ name: string; type: string; brand?: string; model?: string }>;
      } | undefined;

      try {
        // Always fetch branch equipment list for context if user has a branch
        if (userBranchId) {
          const branchEquipment = await storage.getEquipment(userBranchId);
          const branch = await storage.getBranch(userBranchId);
          
          const branchEquipmentList = branchEquipment.map((e) => ({
            name: e.name,
            type: e.equipmentType,
            brand: e.brand || undefined,
            model: e.model || undefined
          }));

          equipmentContext = {
            type: 'genel',
            branch: branch?.name,
            branchEquipment: branchEquipmentList.length > 0 ? branchEquipmentList : undefined
          };
        }

        // If specific equipment selected, add detailed context
        if (equipmentId) {
          const equipment = await storage.getEquipmentById(equipmentId);
          if (equipment) {
            const branch = equipment.branchId ? await storage.getBranch(equipment.branchId) : null;
            const recentFaults = await storage.getFaults();
            const equipmentFaults = recentFaults
              .filter((f) => f.equipmentId === equipmentId)
              .slice(0, 3)
              .map((f) => ({
                description: f.description,
                date: new Date(f.createdAt).toLocaleDateString('tr-TR')
              }));

            equipmentContext = {
              ...equipmentContext,
              type: equipment.equipmentType,
              serialNumber: equipment.serialNumber || undefined,
              branch: branch?.name || equipmentContext?.branch,
              recentFaults: equipmentFaults.length > 0 ? equipmentFaults : undefined
            };
          }
        }

        // Search equipment knowledge base for relevant info
        const knowledgeResults = await storage.searchEquipmentKnowledge(
          question, 
          equipmentContext?.type !== 'genel' ? equipmentContext?.type : undefined
        );
        
        if (knowledgeResults.length > 0) {
          // Add knowledge to context
          const knowledgeContext = knowledgeResults
            .slice(0, 3)
            .map(k => `[${k.title}]: ${k.content.substring(0, 800)}`)
            .join('\n\n');
          
          if (!equipmentContext) {
            equipmentContext = { type: 'genel' };
          }
          (equipmentContext as any).knowledgeContext = knowledgeContext;
        }

        // Search for matching recipes if question is about menu/drinks
        const recipeKeywords = ['reçete', 'tarif', 'nasıl yapılır', 'hazırla', 'latte', 'americano', 'cappuccino', 'flat white', 'espresso', 'frappe', 'iced', 'içecek', 'kahve', 'menü'];
        const isRecipeQuestion = recipeKeywords.some(kw => question.toLocaleLowerCase('tr-TR').includes(kw));
        
        if (isRecipeQuestion) {
          const recipeResults = await storage.searchRecipesForAI(question);
          if (recipeResults.length > 0) {
            const recipeContext = recipeResults.map(r => {
              const massivoInfo = r.size?.massivo ? 
                `Massivo (${r.size.massivo.cupMl}ml): ${r.size.massivo.espresso || ''} ${r.size.massivo.milk?.ml ? r.size.massivo.milk.ml + 'ml ' + r.size.massivo.milk.type : ''}` : '';
              const longDivaInfo = r.size?.longDiva ? 
                `Long Diva (${r.size.longDiva.cupMl}ml): ${r.size.longDiva.espresso || ''} ${r.size.longDiva.milk?.ml ? r.size.longDiva.milk.ml + 'ml ' + r.size.longDiva.milk.type : ''}` : '';
              const steps = r.steps?.length > 0 ? '\nAdımlar: ' + r.steps.join(' → ') : '';
              return `[[${r.name} - ${r.category}]]\n${massivoInfo}\n${longDivaInfo}${steps}`;
            }).join('\n\n');
            
            if (!equipmentContext) {
              equipmentContext = { type: 'genel' };
            }
            (equipmentContext as any).recipeContext = recipeContext;
          }
        }

      } catch (error: unknown) {
        console.warn("Failed to fetch equipment context:", error);
      }

      // Use enhanced technical assistant with fallback LLM
      const response = await answerTechnicalQuestion(question, equipmentContext, userId);
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw)) && response.answer) {
        response.answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }
      
      res.json(response);
    } catch (error: unknown) {
      handleApiError(res, error, "AnswerQuestion");
    }
  });


  // AI Article Draft Generator (HQ only)
  router.post('/api/knowledge-base/generate-draft', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { topic, category } = req.body;
      
      // HQ only
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu özellik sadece merkez kullanıcıları içindir" });
      }
      
      if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
        return res.status(400).json({ message: "Konu en az 3 karakter olmalıdır" });
      }
      
      if (!category || !['recipe', 'procedure', 'training'].includes(category)) {
        return res.status(400).json({ message: "Geçersiz kategori" });
      }
      
      const draft = await generateArticleDraft(topic.trim(), category, user.id);
      res.json(draft);
    } catch (error: unknown) {
      console.error("Error generating article draft:", error);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ message: (error as Error).message || "Taslak oluşturulamadı" });
    }
  });

  // AI Dashboard Summary (HQ + Branch Supervisors only)
  router.post('/api/ai-summary', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error generating AI summary:", error);
      
      // Handle rate limit errors
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI özeti oluşturulamadı" });
    }
  });

  // AI Dashboard Insights (HQ + Supervisor only - operational oversight)
  router.post('/api/ai-dashboard-insights', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error generating dashboard insights:", error);
      
      // Handle rate limit errors with localized message
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI içgörüleri oluşturulamadı" });
    }
  });


export default router;
