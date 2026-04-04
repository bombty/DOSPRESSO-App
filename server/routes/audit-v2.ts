// ========================================
// DOSPRESSO Denetim Sistemi v2 API Routes
// Şablon Yönetimi + Denetim CRUD + Personel + Aksiyonlar
// ========================================

import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { isHQRole } from "@shared/schema";
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
      categoryCount: sql<number>`(SELECT count(*) FROM audit_template_categories_v2 WHERE template_id = ${auditTemplatesV2.id})::int`,
      questionCount: sql<number>`(SELECT count(*) FROM audit_template_questions_v2 q JOIN audit_template_categories_v2 c ON q.category_id = c.id WHERE c.template_id = ${auditTemplatesV2.id})::int`,
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

export default router;
