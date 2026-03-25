import { Express, Response } from "express";
import { db } from "./db";
import { branchQualityAudits, productComplaints, branches, users, PERMISSIONS, type PermissionModule, type PermissionAction, type UserRoleType, isHQRole } from "@shared/schema";
import { eq, and, desc, sql, gte, count, avg } from "drizzle-orm";
import { insertBranchQualityAuditSchema, insertProductComplaintSchema } from "@shared/schema";

const isAuthenticated = (req: any, res: Response, next: Function) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

function hasPermission(role: string, module: PermissionModule, action: PermissionAction): boolean {
  const perms = PERMISSIONS[role as UserRoleType];
  if (!perms) return false;
  const modulePerms = perms[module];
  if (!modulePerms) return false;
  return (modulePerms as readonly string[]).includes(action);
}

function isHqRole(role: string): boolean {
  return isHQRole(role as any);
}

const INSPECTION_CATEGORIES = [
  { key: "exteriorScore", label: "Dış Mekan", weight: 10, items: [
    "Tabelalar temiz ve aydınlatması çalışıyor",
    "Dış oturma alanı düzenli",
    "Giriş kapısı temiz ve davetkar",
    "Vitrin görünümü marka standartlarına uygun",
    "Çöp kutuları temiz ve düzenli"
  ]},
  { key: "buildingAppearanceScore", label: "Bina Görünüş", weight: 10, items: [
    "Duvarlar temiz, boyası bakımlı",
    "Zemin temiz ve lekesiz",
    "Aydınlatma yeterli ve çalışır durumda",
    "Klima/havalandırma çalışıyor",
    "Tuvalet temiz ve malzemeleri tam"
  ]},
  { key: "barLayoutScore", label: "Bar Düzeni", weight: 15, items: [
    "Bar alanı düzenli ve temiz",
    "Ekipmanlar yerinde ve çalışır durumda",
    "Malzemeler organize edilmiş",
    "Bardak/fincan düzeni uygun",
    "Çalışma alanı ergonomik ve verimli"
  ]},
  { key: "storageScore", label: "Depo Tamamlığı", weight: 10, items: [
    "Ürünler FIFO kuralına göre dizili",
    "Soğuk zincir uygun sıcaklıkta",
    "Depo temiz ve düzenli",
    "Stok seviyesi yeterli",
    "Son kullanma tarihleri kontrol edilmiş"
  ]},
  { key: "productPresentationScore", label: "Ürün Sunumu", weight: 15, items: [
    "İçecekler standart reçeteye uygun",
    "Sunum kalitesi yüksek",
    "Ürün sıcaklıkları uygun",
    "Porsiyon miktarları standart",
    "Vitrin ürünleri taze ve çekici"
  ]},
  { key: "staffBehaviorScore", label: "Personel Davranış", weight: 15, items: [
    "Personel güler yüzlü ve ilgili",
    "Müşteri karşılama uygun",
    "Sipariş alma süreci profesyonel",
    "Müşteri şikayetlerine yaklaşım doğru",
    "Ekip içi iletişim olumlu"
  ]},
  { key: "dressCodeScore", label: "Personel Kıyafet", weight: 10, items: [
    "Üniforma temiz ve ütülü",
    "İsimlik/rozet takılı",
    "Saç/sakal düzeni uygun",
    "Tırnak bakımı hijyenik",
    "Ayakkabılar uygun ve temiz"
  ]},
  { key: "cleanlinessScore", label: "Temizlik", weight: 15, items: [
    "Masalar ve sandalyeler temiz",
    "Zemin pırıl pırıl",
    "Cam ve aynalar temiz",
    "Çöp kutuları boşaltılmış",
    "Tezgah ve yüzeyler dezenfekte"
  ]},
];

export function registerInspectionRoutes(app: Express) {

  app.get('/api/inspection-categories', isAuthenticated, async (_req: any, res) => {
    res.json(INSPECTION_CATEGORIES);
  });

  app.get('/api/branch-inspections', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }

      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      if (branchId !== undefined && isNaN(branchId)) {
        return res.status(400).json({ message: "Geçersiz branchId" });
      }

      let conditions: any[] = [];
      if (branchId) {
        conditions.push(eq(branchQualityAudits.branchId, branchId));
      }
      if (!isHqRole(user.role)) {
        if (user.branchId) {
          conditions.push(eq(branchQualityAudits.branchId, user.branchId));
        }
      }

      const audits = await db.select({
        audit: branchQualityAudits,
        branchName: branches.name,
        auditorFirstName: users.firstName,
        auditorLastName: users.lastName,
      })
        .from(branchQualityAudits)
        .leftJoin(branches, eq(branchQualityAudits.branchId, branches.id))
        .leftJoin(users, eq(branchQualityAudits.auditorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(branchQualityAudits.auditDate))
        .limit(50);

      const result = audits.map(a => ({
        ...a.audit,
        branchName: a.branchName,
        auditorName: `${a.auditorFirstName || ''} ${a.auditorLastName || ''}`.trim(),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      res.status(500).json({ message: "Denetimler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/branch-inspections', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'create')) {
        return res.status(403).json({ message: "Sadece Coach veya Admin denetim oluşturabilir" });
      }

      const scores = req.body;
      const allScoreKeys = [
        'exteriorScore', 'buildingAppearanceScore', 'barLayoutScore', 'storageScore',
        'productPresentationScore', 'staffBehaviorScore', 'dressCodeScore', 'cleanlinessScore',
        'serviceQualityScore', 'productQualityScore', 'safetyComplianceScore', 'equipmentMaintenanceScore'
      ];

      let totalWeighted = 0;
      let totalWeight = 0;
      for (const cat of INSPECTION_CATEGORIES) {
        const score = scores[cat.key] ?? 0;
        totalWeighted += score * cat.weight;
        totalWeight += cat.weight;
      }
      const overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;

      const insertData = {
        branchId: scores.branchId,
        auditDate: scores.auditDate || new Date().toISOString().split('T')[0],
        auditorId: user.id,
        cleanlinessScore: scores.cleanlinessScore ?? 0,
        serviceQualityScore: scores.serviceQualityScore ?? 0,
        productQualityScore: scores.productQualityScore ?? 0,
        staffBehaviorScore: scores.staffBehaviorScore ?? 0,
        safetyComplianceScore: scores.safetyComplianceScore ?? 0,
        equipmentMaintenanceScore: scores.equipmentMaintenanceScore ?? 0,
        exteriorScore: scores.exteriorScore ?? 0,
        buildingAppearanceScore: scores.buildingAppearanceScore ?? 0,
        barLayoutScore: scores.barLayoutScore ?? 0,
        storageScore: scores.storageScore ?? 0,
        productPresentationScore: scores.productPresentationScore ?? 0,
        dressCodeScore: scores.dressCodeScore ?? 0,
        overallScore,
        notes: scores.notes || null,
        categoryNotes: scores.categoryNotes ? JSON.stringify(scores.categoryNotes) : null,
        photoUrls: scores.photoUrls ? JSON.stringify(scores.photoUrls) : null,
        actionItems: scores.actionItems ? JSON.stringify(scores.actionItems) : null,
        followUpRequired: scores.followUpRequired || false,
        followUpDate: scores.followUpDate || null,
        status: 'completed',
      };

      const [audit] = await db.insert(branchQualityAudits).values(insertData).returning();
      res.status(201).json(audit);
    } catch (error) {
      console.error("Error creating inspection:", error);
      res.status(500).json({ message: "Denetim oluşturulurken hata oluştu" });
    }
  });

  app.get('/api/branch-inspections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const [audit] = await db.select({
        audit: branchQualityAudits,
        branchName: branches.name,
        auditorFirstName: users.firstName,
        auditorLastName: users.lastName,
      })
        .from(branchQualityAudits)
        .leftJoin(branches, eq(branchQualityAudits.branchId, branches.id))
        .leftJoin(users, eq(branchQualityAudits.auditorId, users.id))
        .where(eq(branchQualityAudits.id, id));

      if (!audit) return res.status(404).json({ message: "Denetim bulunamadı" });

      if (!isHqRole(user.role) && user.branchId && audit.audit.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu denetimi görüntüleme yetkiniz yok" });
      }

      res.json({
        ...audit.audit,
        branchName: audit.branchName,
        auditorName: `${audit.auditorFirstName || ''} ${audit.auditorLastName || ''}`.trim(),
      });
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ message: "Denetim yüklenirken hata oluştu" });
    }
  });

  // === PRODUCT COMPLAINTS ===

  app.get('/api/product-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'product_complaints', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }

      let conditions: any[] = [];

      if (user.role === 'kalite_kontrol') {
        // kalite_kontrol sees all complaints (assigned or unassigned)
      } else if (user.branchId) {
        conditions.push(eq(productComplaints.branchId, user.branchId));
      } else if (!isHqRole(user.role)) {
        conditions.push(eq(productComplaints.reportedById, user.id));
      }

      const statusFilter = req.query.status as string;
      if (statusFilter && statusFilter !== 'all') {
        conditions.push(eq(productComplaints.status, statusFilter));
      }

      const complaints = await db.select({
        complaint: productComplaints,
        branchName: branches.name,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
      })
        .from(productComplaints)
        .leftJoin(branches, eq(productComplaints.branchId, branches.id))
        .leftJoin(users, eq(productComplaints.reportedById, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(productComplaints.createdAt))
        .limit(100);

      const result = complaints.map(c => ({
        ...c.complaint,
        branchName: c.branchName,
        reporterName: `${c.reporterFirstName || ''} ${c.reporterLastName || ''}`.trim(),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ message: "Şikayetler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/product-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'product_complaints', 'create')) {
        return res.status(403).json({ message: "Şikayet oluşturma yetkiniz yok" });
      }
      const body = req.body;

      const qcUsers = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'kalite_kontrol'))
        .limit(1);

      const [complaint] = await db.insert(productComplaints).values({
        branchId: body.branchId || user.branchId,
        reportedById: user.id,
        assignedToId: qcUsers.length > 0 ? qcUsers[0].id : null,
        productName: body.productName,
        batchNumber: body.batchNumber || null,
        complaintType: body.complaintType,
        severity: body.severity || 'medium',
        description: body.description,
        photoUrls: body.photoUrls ? JSON.stringify(body.photoUrls) : null,
      }).returning();

      res.status(201).json(complaint);
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(500).json({ message: "Şikayet oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/product-complaints/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'product_complaints', 'edit')) {
        return res.status(403).json({ message: "Şikayet güncelleme yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });
      const body = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (body.status) updateData.status = body.status;
      if (body.resolution) updateData.resolution = body.resolution;
      if (body.status === 'resolved') {
        updateData.resolvedById = user.id;
        updateData.resolvedAt = new Date();
      }

      const [updated] = await db.update(productComplaints)
        .set(updateData)
        .where(eq(productComplaints.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(500).json({ message: "Şikayet güncellenirken hata oluştu" });
    }
  });

  // === BRANCH HEALTH SCORE ===

  app.get('/api/branch-health-scores', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }

      let branchConditions: any[] = [];
      if (!isHqRole(user.role) && user.branchId) {
        branchConditions.push(eq(branches.id, user.branchId));
      }

      const branchList = await db.select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(branchConditions.length > 0 ? and(...branchConditions) : undefined);

      const scores = await Promise.all(branchList.map(async (branch) => {
        const recentAudits = await db.select({
          overallScore: branchQualityAudits.overallScore,
        })
          .from(branchQualityAudits)
          .where(eq(branchQualityAudits.branchId, branch.id))
          .orderBy(desc(branchQualityAudits.auditDate))
          .limit(5);

        const avgInspection = recentAudits.length > 0
          ? Math.round(recentAudits.reduce((sum, a) => sum + a.overallScore, 0) / recentAudits.length)
          : null;

        const [complaintStats] = await db.select({
          total: count(),
          open: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.status} IN ('new', 'investigating'))`,
        })
          .from(productComplaints)
          .where(eq(productComplaints.branchId, branch.id));

        return {
          branchId: branch.id,
          branchName: branch.name,
          inspectionScore: avgInspection,
          totalInspections: recentAudits.length,
          openComplaints: Number(complaintStats?.open ?? 0),
          totalComplaints: Number(complaintStats?.total ?? 0),
        };
      }));

      res.json(scores);
    } catch (error) {
      console.error("Error fetching health scores:", error);
      res.status(500).json({ message: "Sağlık skorları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/branch-health-scores/:branchId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }
      const branchId = parseInt(req.params.branchId);

      if (!isHqRole(user.role) && user.branchId && user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu şubenin verilerine erişim yetkiniz yok" });
      }

      const [branch] = await db.select({ id: branches.id, name: branches.name })
        .from(branches).where(eq(branches.id, branchId));

      if (!branch) return res.status(404).json({ message: "Şube bulunamadı" });

      const audits = await db.select()
        .from(branchQualityAudits)
        .where(eq(branchQualityAudits.branchId, branchId))
        .orderBy(desc(branchQualityAudits.auditDate))
        .limit(10);

      const complaints = await db.select({
        complaint: productComplaints,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
      })
        .from(productComplaints)
        .leftJoin(users, eq(productComplaints.reportedById, users.id))
        .where(eq(productComplaints.branchId, branchId))
        .orderBy(desc(productComplaints.createdAt))
        .limit(20);

      const categoryAverages: Record<string, number> = {};
      if (audits.length > 0) {
        for (const cat of INSPECTION_CATEGORIES) {
          const key = cat.key as keyof typeof audits[0];
          const vals = audits.map(a => (a as any)[key] ?? 0).filter((v: number) => v > 0);
          categoryAverages[cat.key] = vals.length > 0 ? Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length) : 0;
        }
      }

      res.json({
        branch,
        audits,
        complaints: complaints.map(c => ({
          ...c.complaint,
          reporterName: `${c.reporterFirstName || ''} ${c.reporterLastName || ''}`.trim(),
        })),
        categoryAverages,
      });
    } catch (error) {
      console.error("Error fetching branch health:", error);
      res.status(500).json({ message: "Şube sağlık verisi yüklenirken hata oluştu" });
    }
  });

  // === AI SUMMARY ===

  app.post('/api/branch-health-ai-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!hasPermission(user.role, 'branch_inspection', 'view')) {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }
      const { branchId } = req.body;
      if (!branchId) return res.status(400).json({ message: "branchId gerekli" });

      if (!isHqRole(user.role) && user.branchId && user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu şubenin verilerine erişim yetkiniz yok" });
      }

      const [branch] = await db.select({ name: branches.name })
        .from(branches).where(eq(branches.id, branchId));

      const audits = await db.select()
        .from(branchQualityAudits)
        .where(eq(branchQualityAudits.branchId, branchId))
        .orderBy(desc(branchQualityAudits.auditDate))
        .limit(5);

      const [complaintStats] = await db.select({
        total: count(),
        open: sql<number>`COUNT(*) FILTER (WHERE ${productComplaints.status} IN ('new', 'investigating'))`,
      })
        .from(productComplaints)
        .where(eq(productComplaints.branchId, branchId));

      const categoryAverages: Record<string, number> = {};
      if (audits.length > 0) {
        for (const cat of INSPECTION_CATEGORIES) {
          const key = cat.key as keyof typeof audits[0];
          const vals = audits.map(a => (a as any)[key] ?? 0).filter((v: number) => v > 0);
          categoryAverages[cat.label] = vals.length > 0 ? Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length) : 0;
        }
      }

      const overallAvg = audits.length > 0
        ? Math.round(audits.reduce((s, a) => s + a.overallScore, 0) / audits.length)
        : 0;

      const { chat } = await import("./services/ai-client");

      const prompt = `Sen bir kahve zinciri franchise danışmanısın. Aşağıdaki verilere göre "${branch?.name}" şubesi hakkında kısa bir Türkçe analiz yaz (max 200 kelime):

Genel Denetim Skoru: ${overallAvg}/100 (Son ${audits.length} denetim)
Kategori Ortalamaları: ${JSON.stringify(categoryAverages)}
Açık Ürün Şikayetleri: ${complaintStats?.open ?? 0}
Toplam Şikayet: ${complaintStats?.total ?? 0}

Güçlü yönleri, zayıf yönleri ve iyileştirme önerilerini belirt. Kısa ve net ol.`;

      const response = await chat({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      res.json({ summary: response.choices[0]?.message?.content || "Özet oluşturulamadı." });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.json({ summary: "AI özeti oluşturulurken hata oluştu. Lütfen daha sonra tekrar deneyin." });
    }
  });
}
