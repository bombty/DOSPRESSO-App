// ========================================
// DOSPRESSO Denetim Sistemi v2 API Routes
// Şablon Yönetimi + Denetim CRUD + Personel + Aksiyonlar
// ========================================

import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { isHQRole } from "@shared/schema";
import { fireEvent } from "../lib/dobody-workflow-engine";
import { eq, desc, asc, and, sql, inArray, isNull, count } from "drizzle-orm";
import {
  auditTemplatesV2,
  auditTemplateCategoriesV2,
  auditTemplateQuestionsV2,
  auditsV2,
  auditCategoryScores,
  auditResponsesV2,
  auditPersonnelV2,
  auditActionsV2,
  auditActionComments,
  auditInstances,
  auditTemplates,
  auditPersonnelFeedback,
  personnelAuditScores,
  branches,
  users,
} from "@shared/schema";

const router = Router();

// ─── Helper: HQ veya Admin kontrolü ────────────────────────
function requireHQ(req: any, res: any): boolean {
  if (!isHQRole(req.user.role) && req.user.role !== 'admin') {
    res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// ŞABLON YÖNETİMİ
// ═══════════════════════════════════════════════════════════

// GET /api/v2/audit-templates — Tüm şablonları listele
router.get('/api/v2/audit-templates', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;

    const templates = await db.select({
      template: auditTemplatesV2,
      categoryCount: sql<number>`(SELECT count(*) FROM audit_template_categories_v2 WHERE template_id = audit_templates_v2.id)::int`,
      questionCount: sql<number>`(SELECT count(*) FROM audit_template_questions_v2 q JOIN audit_template_categories_v2 c ON q.category_id = c.id WHERE c.template_id = audit_templates_v2.id)::int`,
    })
      .from(auditTemplatesV2)
      .orderBy(desc(auditTemplatesV2.updatedAt));

    res.json(templates.map(t => ({
      ...t.template,
      categoryCount: t.categoryCount,
      questionCount: t.questionCount,
    })));
  } catch (error) {
    console.error("Get audit templates v2 error:", error);
    res.status(500).json({ message: "Şablonlar alınamadı" });
  }
});

// GET /api/v2/audit-templates/:id — Şablon detayı (kategoriler + sorular dahil)
router.get('/api/v2/audit-templates/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;

    const [template] = await db.select().from(auditTemplatesV2).where(eq(auditTemplatesV2.id, parseInt(id)));
    if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });

    const categories = await db.select().from(auditTemplateCategoriesV2)
      .where(eq(auditTemplateCategoriesV2.templateId, template.id))
      .orderBy(asc(auditTemplateCategoriesV2.orderIndex));

    const categoryIds = categories.map(c => c.id);
    const questions = categoryIds.length > 0
      ? await db.select().from(auditTemplateQuestionsV2)
          .where(inArray(auditTemplateQuestionsV2.categoryId, categoryIds))
          .orderBy(asc(auditTemplateQuestionsV2.orderIndex))
      : [];

    // Kategorilere soruları ekle
    const categoriesWithQuestions = categories.map(cat => ({
      ...cat,
      questions: questions.filter(q => q.categoryId === cat.id),
    }));

    res.json({ ...template, categories: categoriesWithQuestions });
  } catch (error) {
    console.error("Get audit template detail error:", error);
    res.status(500).json({ message: "Şablon detayı alınamadı" });
  }
});

// POST /api/v2/audit-templates — Yeni şablon oluştur
router.post('/api/v2/audit-templates', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { name, description } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Şablon adı gerekli" });

    const [template] = await db.insert(auditTemplatesV2).values({
      name: name.trim(),
      description: description || null,
      createdBy: req.user.id,
    }).returning();

    res.status(201).json(template);
  } catch (error) {
    console.error("Create audit template error:", error);
    res.status(500).json({ message: "Şablon oluşturulamadı" });
  }
});

// PATCH /api/v2/audit-templates/:id — Şablon güncelle
router.patch('/api/v2/audit-templates/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;
    const { name, description, isActive, isDefault } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const [updated] = await db.update(auditTemplatesV2)
      .set(updateData)
      .where(eq(auditTemplatesV2.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Şablon bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Update audit template error:", error);
    res.status(500).json({ message: "Şablon güncellenemedi" });
  }
});

// DELETE /api/v2/audit-templates/:id — Şablon sil (soft: isActive=false)
router.delete('/api/v2/audit-templates/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;

    const [updated] = await db.update(auditTemplatesV2)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(auditTemplatesV2.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Şablon bulunamadı" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete audit template error:", error);
    res.status(500).json({ message: "Şablon silinemedi" });
  }
});

// ═══════════════════════════════════════════════════════════
// KATEGORİ YÖNETİMİ
// ═══════════════════════════════════════════════════════════

// POST /api/v2/audit-templates/:id/categories — Kategori ekle
router.post('/api/v2/audit-templates/:id/categories', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const templateId = parseInt(req.params.id);
    const { name, description, weight } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Kategori adı gerekli" });

    // Sıra indeksini bul
    const existing = await db.select({ maxOrder: sql<number>`COALESCE(MAX(order_index), -1)::int` })
      .from(auditTemplateCategoriesV2)
      .where(eq(auditTemplateCategoriesV2.templateId, templateId));

    const [category] = await db.insert(auditTemplateCategoriesV2).values({
      templateId,
      name: name.trim(),
      description: description || null,
      weight: weight || 10,
      orderIndex: (existing[0]?.maxOrder ?? -1) + 1,
    }).returning();

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Kategori eklenemedi" });
  }
});

// PATCH /api/v2/audit-categories/:id — Kategori güncelle
router.patch('/api/v2/audit-categories/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;
    const { name, description, weight, orderIndex, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (weight !== undefined) updateData.weight = weight;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(auditTemplateCategoriesV2)
      .set(updateData)
      .where(eq(auditTemplateCategoriesV2.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Kategori bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Kategori güncellenemedi" });
  }
});

// DELETE /api/v2/audit-categories/:id — Kategori sil
router.delete('/api/v2/audit-categories/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const [deleted] = await db.delete(auditTemplateCategoriesV2)
      .where(eq(auditTemplateCategoriesV2.id, parseInt(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ message: "Kategori bulunamadı" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Kategori silinemedi" });
  }
});

// ═══════════════════════════════════════════════════════════
// SORU YÖNETİMİ
// ═══════════════════════════════════════════════════════════

// POST /api/v2/audit-categories/:id/questions — Soru ekle
router.post('/api/v2/audit-categories/:id/questions', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const categoryId = parseInt(req.params.id);
    const { questionText, questionType, options, isRequired, weight, helpText } = req.body;

    if (!questionText?.trim()) return res.status(400).json({ message: "Soru metni gerekli" });

    const existing = await db.select({ maxOrder: sql<number>`COALESCE(MAX(order_index), -1)::int` })
      .from(auditTemplateQuestionsV2)
      .where(eq(auditTemplateQuestionsV2.categoryId, categoryId));

    const [question] = await db.insert(auditTemplateQuestionsV2).values({
      categoryId,
      questionText: questionText.trim(),
      questionType: questionType || 'checkbox',
      options: options || null,
      isRequired: isRequired !== false,
      weight: weight || 1,
      orderIndex: (existing[0]?.maxOrder ?? -1) + 1,
      helpText: helpText || null,
    }).returning();

    res.status(201).json(question);
  } catch (error) {
    console.error("Create question error:", error);
    res.status(500).json({ message: "Soru eklenemedi" });
  }
});

// PATCH /api/v2/audit-questions/:id — Soru güncelle
router.patch('/api/v2/audit-questions/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;
    const { questionText, questionType, options, isRequired, weight, orderIndex, helpText } = req.body;

    const updateData: any = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (questionType !== undefined) updateData.questionType = questionType;
    if (options !== undefined) updateData.options = options;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (weight !== undefined) updateData.weight = weight;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (helpText !== undefined) updateData.helpText = helpText;

    const [updated] = await db.update(auditTemplateQuestionsV2)
      .set(updateData)
      .where(eq(auditTemplateQuestionsV2.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Soru bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({ message: "Soru güncellenemedi" });
  }
});

// DELETE /api/v2/audit-questions/:id — Soru sil
router.delete('/api/v2/audit-questions/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const [deleted] = await db.delete(auditTemplateQuestionsV2)
      .where(eq(auditTemplateQuestionsV2.id, parseInt(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ message: "Soru bulunamadı" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({ message: "Soru silinemedi" });
  }
});

// ═══════════════════════════════════════════════════════════
// DENETİM KAYITLARI (Sprint B'de genişletilecek)
// ═══════════════════════════════════════════════════════════

// GET /api/v2/audits — Denetim listesi
router.get('/api/v2/audits', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;
    const status = req.query.status as string || null;

    let conditions = [];
    if (branchId) conditions.push(eq(auditsV2.branchId, branchId));
    if (status) conditions.push(eq(auditsV2.status, status));

    const audits = await db.select({
      audit: auditsV2,
      branchName: branches.name,
      auditorFirstName: users.firstName,
      auditorLastName: users.lastName,
    })
      .from(auditsV2)
      .innerJoin(branches, eq(branches.id, auditsV2.branchId))
      .innerJoin(users, eq(users.id, auditsV2.auditorId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditsV2.startedAt))
      .limit(100);

    res.json(audits.map(a => ({
      ...a.audit,
      branchName: a.branchName,
      auditorName: `${a.auditorFirstName} ${a.auditorLastName || ''}`.trim(),
    })));
  } catch (error) {
    console.error("Get audits v2 error:", error);
    res.status(500).json({ message: "Denetimler alınamadı" });
  }
});

// POST /api/v2/audits — Yeni denetim başlat
router.post('/api/v2/audits', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { templateId, branchId, scheduledDate } = req.body;

    if (!templateId || !branchId) {
      return res.status(400).json({ message: "Şablon ve şube seçimi gerekli" });
    }

    // Şablon versiyonunu al
    const [template] = await db.select().from(auditTemplatesV2).where(eq(auditTemplatesV2.id, templateId));
    if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });

    const [audit] = await db.insert(auditsV2).values({
      templateId,
      templateVersion: template.version,
      branchId,
      auditorId: req.user.id,
      scheduledDate: scheduledDate || null,
      status: 'in_progress',
    }).returning();

    res.status(201).json(audit);
  } catch (error) {
    console.error("Create audit v2 error:", error);
    res.status(500).json({ message: "Denetim başlatılamadı" });
  }
});

// GET /api/v2/audits/:id — Denetim detayı
router.get('/api/v2/audits/:id', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const { id } = req.params;

    const [audit] = await db.select({
      audit: auditsV2,
      branchName: branches.name,
      auditorFirstName: users.firstName,
      auditorLastName: users.lastName,
    })
      .from(auditsV2)
      .innerJoin(branches, eq(branches.id, auditsV2.branchId))
      .innerJoin(users, eq(users.id, auditsV2.auditorId))
      .where(eq(auditsV2.id, parseInt(id)));

    if (!audit) return res.status(404).json({ message: "Denetim bulunamadı" });

    // Kategori skorları
    const catScores = await db.select().from(auditCategoryScores)
      .where(eq(auditCategoryScores.auditId, parseInt(id)));

    // Cevaplar
    const responses = await db.select().from(auditResponsesV2)
      .where(eq(auditResponsesV2.auditId, parseInt(id)));

    // Personel denetimleri
    const personnel = await db.select({
      record: auditPersonnelV2,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
      .from(auditPersonnelV2)
      .innerJoin(users, eq(users.id, auditPersonnelV2.userId))
      .where(eq(auditPersonnelV2.auditId, parseInt(id)));

    // Aksiyonlar
    const actions = await db.select({
      action: auditActionsV2,
      assignedFirstName: users.firstName,
      assignedLastName: users.lastName,
    })
      .from(auditActionsV2)
      .leftJoin(users, eq(users.id, auditActionsV2.assignedToId))
      .where(eq(auditActionsV2.auditId, parseInt(id)))
      .orderBy(asc(auditActionsV2.deadline));

    res.json({
      ...audit.audit,
      branchName: audit.branchName,
      auditorName: `${audit.auditorFirstName} ${audit.auditorLastName || ''}`.trim(),
      categoryScores: catScores,
      responses,
      personnel: personnel.map(p => ({
        ...p.record,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
      })),
      actions: actions.map(a => ({
        ...a.action,
        assignedName: a.assignedFirstName ? `${a.assignedFirstName} ${a.assignedLastName || ''}`.trim() : null,
      })),
    });
  } catch (error) {
    console.error("Get audit detail v2 error:", error);
    res.status(500).json({ message: "Denetim detayı alınamadı" });
  }
});

// ═══════════════════════════════════════════════════════════
// ŞUBE DENETİM GEÇMİŞİ (tüm zamanlar)
// ═══════════════════════════════════════════════════════════

// GET /api/v2/branch-audit-history/:branchId — Şube denetim geçmişi
router.get('/api/v2/branch-audit-history/:branchId', isAuthenticated, async (req, res) => {
  try {
    const { branchId } = req.params;

    const audits = await db.select({
      id: auditsV2.id,
      status: auditsV2.status,
      totalScore: auditsV2.totalScore,
      personnelScore: auditsV2.personnelScore,
      startedAt: auditsV2.startedAt,
      completedAt: auditsV2.completedAt,
      closedAt: auditsV2.closedAt,
      auditorFirstName: users.firstName,
      auditorLastName: users.lastName,
    })
      .from(auditsV2)
      .innerJoin(users, eq(users.id, auditsV2.auditorId))
      .where(eq(auditsV2.branchId, parseInt(branchId)))
      .orderBy(desc(auditsV2.startedAt));

    // Açık aksiyon sayısı
    const openActions = await db.select({
      auditId: auditActionsV2.auditId,
      count: sql<number>`count(*)::int`,
      slaBreachedCount: sql<number>`count(*) filter (where sla_breached = true)::int`,
    })
      .from(auditActionsV2)
      .where(and(
        inArray(auditActionsV2.auditId, audits.map(a => a.id)),
        inArray(auditActionsV2.status, ['open', 'in_progress', 'overdue']),
      ))
      .groupBy(auditActionsV2.auditId);

    const actionMap = Object.fromEntries(openActions.map(a => [a.auditId, { count: a.count, slaBreached: a.slaBreachedCount }]));

    res.json({
      audits: audits.map(a => ({
        ...a,
        auditorName: `${a.auditorFirstName} ${a.auditorLastName || ''}`.trim(),
        openActions: actionMap[a.id]?.count || 0,
        slaBreached: actionMap[a.id]?.slaBreached || 0,
      })),
      total: audits.length,
    });
  } catch (error) {
    console.error("Get branch audit history error:", error);
    res.status(500).json({ message: "Denetim geçmişi alınamadı" });
  }
});

// ═══════════════════════════════════════════════════════════
// DENETİM CEVAPLARI & TAMAMLAMA (Sprint B)
// ═══════════════════════════════════════════════════════════

// POST /api/v2/audits/:id/responses — Toplu cevap kaydet
router.post('/api/v2/audits/:id/responses', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const auditId = parseInt(req.params.id);
    const { responses, categoryScores } = req.body;

    if (!Array.isArray(responses)) return res.status(400).json({ message: "Cevaplar gerekli" });

    // Cevapları kaydet
    if (responses.length > 0) {
      await db.insert(auditResponsesV2).values(
        responses.map((r: any) => ({
          auditId,
          questionId: r.questionId || null,
          categoryId: r.categoryId || null,
          questionText: r.questionText || '',
          questionType: r.questionType || 'checkbox',
          responseValue: r.responseValue?.toString() || null,
          score: r.score?.toString() || '0',
          photoUrl: r.photoUrl || null,
          note: r.note || null,
        }))
      );
    }

    // Kategori skorlarını kaydet
    if (Array.isArray(categoryScores) && categoryScores.length > 0) {
      await db.insert(auditCategoryScores).values(
        categoryScores.map((cs: any) => ({
          auditId,
          categoryId: cs.categoryId || null,
          categoryName: cs.categoryName || '',
          weight: cs.weight || 0,
          score: cs.score?.toString() || '0',
        }))
      );
    }

    res.json({ success: true, count: responses.length });
  } catch (error) {
    console.error("Save audit responses error:", error);
    res.status(500).json({ message: "Cevaplar kaydedilemedi" });
  }
});

// POST /api/v2/audits/:id/personnel — Personel denetimi kaydet
router.post('/api/v2/audits/:id/personnel', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const auditId = parseInt(req.params.id);
    const { personnel } = req.body;

    if (!Array.isArray(personnel)) return res.status(400).json({ message: "Personel listesi gerekli" });

    if (personnel.length > 0) {
      await db.insert(auditPersonnelV2).values(
        personnel.map((p: any) => {
          const scores = [p.dressCodeScore, p.hygieneScore, p.customerCareScore, p.friendlinessScore].filter(s => s != null);
          const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
          return {
            auditId,
            userId: p.userId,
            dressCodeScore: p.dressCodeScore || null,
            hygieneScore: p.hygieneScore || null,
            customerCareScore: p.customerCareScore || null,
            friendlinessScore: p.friendlinessScore || null,
            overallScore: (avg * 20).toFixed(2), // 1-5 → 0-100
            notes: p.notes || null,
            photoUrl: p.photoUrl || null,
          };
        })
      );
    }

    // Personel ortalamasını hesapla
    const allScores = personnel.map((p: any) => {
      const s = [p.dressCodeScore, p.hygieneScore, p.customerCareScore, p.friendlinessScore].filter(Boolean);
      return s.length > 0 ? (s.reduce((a: number, b: number) => a + b, 0) / s.length) * 20 : 0;
    });
    const personnelAvg = allScores.length > 0 ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : null;

    if (personnelAvg !== null) {
      await db.update(auditsV2).set({ personnelScore: personnelAvg.toFixed(2) }).where(eq(auditsV2.id, auditId));
    }

    res.json({ success: true, count: personnel.length, personnelScore: personnelAvg });
  } catch (error) {
    console.error("Save audit personnel error:", error);
    res.status(500).json({ message: "Personel denetimi kaydedilemedi" });
  }
});

// PATCH /api/v2/audits/:id/complete — Denetimi tamamla (skor hesapla)
router.patch('/api/v2/audits/:id/complete', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const auditId = parseInt(req.params.id);
    const { totalScore, notes } = req.body;

    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      notes: notes || null,
    };
    if (totalScore !== undefined) updateData.totalScore = totalScore.toString();

    const [updated] = await db.update(auditsV2)
      .set(updateData)
      .where(eq(auditsV2.id, auditId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Denetim bulunamadı" });

    // Dobody WF-1: Denetim tamamlandı → analiz + öneri
    try {
      const branchInfo = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, updated.branchId!)).limit(1);
      fireEvent('audit_completed', 'denetim', 'audit', auditId, {
        auditId, branchId: updated.branchId, totalScore: updated.totalScore,
        branchName: branchInfo[0]?.name || 'Bilinmiyor',
      });
    } catch (e) { /* event hatası denetimi engellemez */ }

    res.json(updated);
  } catch (error) {
    console.error("Complete audit error:", error);
    res.status(500).json({ message: "Denetim tamamlanamadı" });
  }
});

// POST /api/v2/audits/:id/actions — Aksiyon maddesi oluştur
router.post('/api/v2/audits/:id/actions', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const auditId = parseInt(req.params.id);
    const { title, description, categoryId, assignedToId, priority, deadline, slaHours } = req.body;

    if (!title?.trim() || !deadline) return res.status(400).json({ message: "Başlık ve son tarih gerekli" });

    const [action] = await db.insert(auditActionsV2).values({
      auditId,
      title: title.trim(),
      description: description || null,
      categoryId: categoryId || null,
      assignedToId: assignedToId || null,
      priority: priority || 'medium',
      deadline,
      slaHours: slaHours || null,
    }).returning();

    // Denetim durumunu "pending_actions" yap
    await db.update(auditsV2)
      .set({ status: 'pending_actions' })
      .where(eq(auditsV2.id, auditId));

    res.status(201).json(action);
  } catch (error) {
    console.error("Create audit action error:", error);
    res.status(500).json({ message: "Aksiyon oluşturulamadı" });
  }
});

// PATCH /api/v2/audit-actions/:id — Aksiyon güncelle (çözüm bildir / onayla)
router.patch('/api/v2/audit-actions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolvedNote, resolvedPhotoUrl } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
      updateData.resolvedNote = resolvedNote || null;
      updateData.resolvedPhotoUrl = resolvedPhotoUrl || null;
    }
    if (status === 'verified') {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = req.user.id;
    }

    const [updated] = await db.update(auditActionsV2)
      .set(updateData)
      .where(eq(auditActionsV2.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Aksiyon bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Update audit action error:", error);
    res.status(500).json({ message: "Aksiyon güncellenemedi" });
  }
});

// GET /api/v2/audit-actions/:id/comments — Aksiyon yorumları
router.get('/api/v2/audit-actions/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const actionId = parseInt(req.params.id);
    const comments = await db.select({
      comment: auditActionComments,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
      .from(auditActionComments)
      .innerJoin(users, eq(users.id, auditActionComments.userId))
      .where(eq(auditActionComments.actionId, actionId))
      .orderBy(asc(auditActionComments.createdAt));

    res.json(comments.map(c => ({
      ...c.comment,
      userName: `${c.firstName} ${c.lastName || ''}`.trim(),
      userRole: c.role,
    })));
  } catch (error) {
    console.error("Get action comments error:", error);
    res.status(500).json({ message: "Yorumlar alınamadı" });
  }
});

// POST /api/v2/audit-actions/:id/comments — Yorum ekle
router.post('/api/v2/audit-actions/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const actionId = parseInt(req.params.id);
    const { content, attachmentUrl } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Yorum içeriği gerekli" });

    const [comment] = await db.insert(auditActionComments).values({
      actionId,
      userId: req.user.id,
      content: content.trim(),
      attachmentUrl: attachmentUrl || null,
    }).returning();

    res.status(201).json(comment);
  } catch (error) {
    console.error("Create action comment error:", error);
    res.status(500).json({ message: "Yorum eklenemedi" });
  }
});

// PATCH /api/v2/audits/:id/close — Denetimi kapat (tüm aksiyonlar kapandıysa)
router.patch('/api/v2/audits/:id/close', isAuthenticated, async (req, res) => {
  try {
    if (!requireHQ(req, res)) return;
    const auditId = parseInt(req.params.id);

    // Açık aksiyon var mı kontrol et
    const openActions = await db.select({ count: sql<number>`count(*)::int` })
      .from(auditActionsV2)
      .where(and(
        eq(auditActionsV2.auditId, auditId),
        inArray(auditActionsV2.status, ['open', 'in_progress'])
      ));

    if (Number(openActions[0]?.count) > 0) {
      return res.status(400).json({ message: `${openActions[0].count} açık aksiyon var — önce kapatılmalı` });
    }

    // Aksiyon uyum skoru hesapla
    const actionStats = await db.select({
      total: sql<number>`count(*)::int`,
      slaBreached: sql<number>`count(*) filter (where sla_breached = true)::int`,
    }).from(auditActionsV2).where(eq(auditActionsV2.auditId, auditId));

    const total = Number(actionStats[0]?.total || 0);
    const breached = Number(actionStats[0]?.slaBreached || 0);
    const complianceScore = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;

    const [updated] = await db.update(auditsV2).set({
      status: 'closed',
      closedAt: new Date(),
      actionComplianceScore: complianceScore.toString(),
    }).where(eq(auditsV2.id, auditId)).returning();

    if (!updated) return res.status(404).json({ message: "Denetim bulunamadı" });
    res.json(updated);
  } catch (error) {
    console.error("Close audit error:", error);
    res.status(500).json({ message: "Denetim kapatılamadı" });
  }
});

// GET /api/v2/branch-on-shift/:branchId — Şubede vardiyada olan personel
router.get('/api/v2/branch-on-shift/:branchId', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);

    // Şubedeki aktif kullanıcıları getir (basit — ileride shift entegrasyonu eklenecek)
    const staff = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
    })
      .from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
      ))
      .orderBy(users.firstName);

    res.json(staff);
  } catch (error) {
    console.error("Get branch staff error:", error);
    res.status(500).json({ message: "Personel listesi alınamadı" });
  }
});

// ========================================
// PERSONEL DENETİM SONUÇLARI & GERİ BİLDİRİM
// ========================================

// GET /api/audit/my-results — Personel kendi denetim sonuçlarını görür
router.get('/api/audit/my-results', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Personele ait denetim instance'ları
    const results = await db.select({
      instance: auditInstances,
      templateTitle: auditTemplates.title,
    })
      .from(auditInstances)
      .innerJoin(auditTemplates, eq(auditInstances.templateId, auditTemplates.id))
      .where(and(
        eq(auditInstances.userId, userId),
        eq(auditInstances.status, "completed")
      ))
      .orderBy(desc(auditInstances.auditDate))
      .limit(20);

    // Okunmamış geri bildirim sayısı
    const [unreadCount] = await db.select({ count: sql<number>`count(*)` })
      .from(auditPersonnelFeedback)
      .where(and(
        eq(auditPersonnelFeedback.personnelId, userId),
        eq(auditPersonnelFeedback.isReadByPersonnel, false)
      ));

    res.json({
      audits: results.map(r => ({
        ...r.instance,
        templateTitle: r.templateTitle,
      })),
      unreadFeedbackCount: Number(unreadCount?.count ?? 0),
    });
  } catch (error) {
    console.error("Get my audit results error:", error);
    res.status(500).json({ message: "Denetim sonuçları alınamadı" });
  }
});

// GET /api/audit/my-feedback — Personel kendine gelen geri bildirimleri görür
router.get('/api/audit/my-feedback', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const feedback = await db.select({
      feedback: auditPersonnelFeedback,
      auditorName: users.firstName,
    })
      .from(auditPersonnelFeedback)
      .innerJoin(users, eq(auditPersonnelFeedback.auditorId, users.id))
      .where(eq(auditPersonnelFeedback.personnelId, userId))
      .orderBy(desc(auditPersonnelFeedback.createdAt))
      .limit(50);

    res.json(feedback.map(f => ({
      ...f.feedback,
      auditorName: f.auditorName,
    })));
  } catch (error) {
    console.error("Get my feedback error:", error);
    res.status(500).json({ message: "Geri bildirimler alınamadı" });
  }
});

// PATCH /api/audit/feedback/:id/read — Personel geri bildirimi okudu olarak işaretle
router.patch('/api/audit/feedback/:id/read', isAuthenticated, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const userId = req.user.id;

    await db.update(auditPersonnelFeedback)
      .set({ isReadByPersonnel: true, readAt: new Date() })
      .where(and(
        eq(auditPersonnelFeedback.id, feedbackId),
        eq(auditPersonnelFeedback.personnelId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error("Mark feedback read error:", error);
    res.status(500).json({ message: "İşaretlenemedi" });
  }
});

// POST /api/audit/feedback/:id/respond — Personel geri bildirime yanıt verir
router.post('/api/audit/feedback/:id/respond', isAuthenticated, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const userId = req.user.id;
    const { response } = req.body;

    if (!response?.trim()) {
      return res.status(400).json({ message: "Yanıt boş olamaz" });
    }

    await db.update(auditPersonnelFeedback)
      .set({
        personnelResponse: response,
        respondedAt: new Date(),
        isReadByPersonnel: true,
        readAt: new Date(),
      })
      .where(and(
        eq(auditPersonnelFeedback.id, feedbackId),
        eq(auditPersonnelFeedback.personnelId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error("Respond to feedback error:", error);
    res.status(500).json({ message: "Yanıt gönderilemedi" });
  }
});

// POST /api/audit/:instanceId/feedback — Denetçi personele geri bildirim yazar
router.post('/api/audit/:instanceId/feedback', isAuthenticated, async (req, res) => {
  try {
    const auditorRole = req.user.role;
    const allowedRoles = ['admin', 'coach', 'trainer', 'ceo', 'cgo'];
    if (!allowedRoles.includes(auditorRole)) {
      return res.status(403).json({ message: "Geri bildirim yazma yetkiniz yok" });
    }

    const instanceId = parseInt(req.params.instanceId);
    const { personnelId, feedback, category, severity } = req.body;

    if (!personnelId || !feedback?.trim()) {
      return res.status(400).json({ message: "Personel ve geri bildirim gerekli" });
    }

    const [created] = await db.insert(auditPersonnelFeedback)
      .values({
        auditInstanceId: instanceId,
        personnelId,
        auditorId: req.user.id,
        feedback,
        category: category || null,
        severity: severity || "info",
      })
      .returning();

    res.json(created);
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({ message: "Geri bildirim oluşturulamadı" });
  }
});

// GET /api/audit/branch/:branchId/personnel-scores — Yatırımcı/Supervisor personel skorlarını görür
router.get('/api/audit/branch/:branchId/personnel-scores', isAuthenticated, async (req, res) => {
  try {
    const userRole = req.user.role;
    const branchId = parseInt(req.params.branchId);

    // Yetki: admin, coach, trainer, yatirimci_branch (kendi şubesi), supervisor (kendi şubesi), ceo, cgo
    const hqRoles = ['admin', 'coach', 'trainer', 'ceo', 'cgo'];
    const branchRoles = ['yatirimci_branch', 'supervisor', 'mudur'];

    if (!hqRoles.includes(userRole)) {
      if (branchRoles.includes(userRole) && req.user.branchId !== branchId) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      if (!branchRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
    }

    const scores = await db.select()
      .from(personnelAuditScores)
      .where(eq(personnelAuditScores.branchId, branchId))
      .orderBy(desc(personnelAuditScores.overallScore));

    res.json(scores);
  } catch (error) {
    console.error("Get personnel scores error:", error);
    res.status(500).json({ message: "Personel skorları alınamadı" });
  }
});

export default router;
