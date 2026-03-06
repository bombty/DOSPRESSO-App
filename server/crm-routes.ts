import { Express } from "express";
import { db } from "./db";
import { 
  customerFeedback,
  feedbackResponses,
  guestComplaints,
  productComplaints,
  campaigns,
  campaignBranches,
  feedbackFormSettings,
  branches,
  users,
  HQ_ROLES,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, count, avg, inArray, isNull } from "drizzle-orm";

export function registerCRMRoutes(app: Express, isAuthenticated: any) {

  app.get('/api/crm/dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [feedbackStats] = await db.select({
        totalFeedback: count(),
        avgRating: avg(customerFeedback.rating),
        todayCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.createdAt} >= (NOW() AT TIME ZONE 'Europe/Istanbul')::date)`,
        negativeCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} <= 2)`,
        slaBreachCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.slaBreached} = true AND ${customerFeedback.status} NOT IN ('resolved', 'closed'))`,
        avgServiceRating: avg(customerFeedback.serviceRating),
        avgCleanlinessRating: avg(customerFeedback.cleanlinessRating),
        avgProductRating: avg(customerFeedback.productRating),
        avgStaffRating: avg(customerFeedback.staffRating),
      }).from(customerFeedback)
        .where(gte(customerFeedback.createdAt, thirtyDaysAgo));

      const [openGuestComplaints] = await db.select({
        count: count(),
      }).from(guestComplaints)
        .where(inArray(guestComplaints.status, ['new', 'assigned', 'in_progress']));

      const [openProductComplaints] = await db.select({
        count: count(),
      }).from(productComplaints)
        .where(inArray(productComplaints.status, ['new', 'investigating']));

      const branchStats = await db.select({
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        avgRating: avg(customerFeedback.rating),
        feedbackCount: count(),
      }).from(customerFeedback)
        .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
        .where(gte(customerFeedback.createdAt, thirtyDaysAgo))
        .groupBy(customerFeedback.branchId, branches.name)
        .orderBy(desc(avg(customerFeedback.rating)));

      const recentFeedback = await db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        rating: customerFeedback.rating,
        comment: customerFeedback.comment,
        status: customerFeedback.status,
        feedbackType: customerFeedback.feedbackType,
        source: customerFeedback.source,
        createdAt: customerFeedback.createdAt,
      }).from(customerFeedback)
        .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
        .orderBy(desc(customerFeedback.createdAt))
        .limit(10);

      const categoryDistribution = await db.select({
        category: sql<string>`CASE 
          WHEN ${customerFeedback.cleanlinessRating} IS NOT NULL AND ${customerFeedback.cleanlinessRating} <= 2 THEN 'cleanliness'
          WHEN ${customerFeedback.serviceRating} IS NOT NULL AND ${customerFeedback.serviceRating} <= 2 THEN 'service'
          WHEN ${customerFeedback.productRating} IS NOT NULL AND ${customerFeedback.productRating} <= 2 THEN 'product'
          WHEN ${customerFeedback.staffRating} IS NOT NULL AND ${customerFeedback.staffRating} <= 2 THEN 'staff'
          ELSE 'other'
        END`,
        count: count(),
      }).from(customerFeedback)
        .where(and(
          gte(customerFeedback.createdAt, thirtyDaysAgo),
          lte(customerFeedback.rating, 3)
        ))
        .groupBy(sql`CASE 
          WHEN ${customerFeedback.cleanlinessRating} IS NOT NULL AND ${customerFeedback.cleanlinessRating} <= 2 THEN 'cleanliness'
          WHEN ${customerFeedback.serviceRating} IS NOT NULL AND ${customerFeedback.serviceRating} <= 2 THEN 'service'
          WHEN ${customerFeedback.productRating} IS NOT NULL AND ${customerFeedback.productRating} <= 2 THEN 'product'
          WHEN ${customerFeedback.staffRating} IS NOT NULL AND ${customerFeedback.staffRating} <= 2 THEN 'staff'
          ELSE 'other'
        END`);

      const pendingResponses = await db.select({
        count: count(),
      }).from(customerFeedback)
        .where(and(
          inArray(customerFeedback.status, ['new', 'in_progress']),
          sql`${customerFeedback.responseDeadline} IS NOT NULL`,
          sql`${customerFeedback.responseDeadline} < NOW()`
        ));

      res.json({
        kpis: {
          todayFeedbackCount: Number(feedbackStats?.todayCount || 0),
          avgRating: feedbackStats?.avgRating ? Number(Number(feedbackStats.avgRating).toFixed(1)) : 0,
          openComplaintsCount: Number(openGuestComplaints?.count || 0) + Number(openProductComplaints?.count || 0),
          slaBreachCount: Number(feedbackStats?.slaBreachCount || 0) + Number(pendingResponses?.count || 0),
          totalFeedback30d: Number(feedbackStats?.totalFeedback || 0),
          negativeCount: Number(feedbackStats?.negativeCount || 0),
          avgServiceRating: feedbackStats?.avgServiceRating ? Number(Number(feedbackStats.avgServiceRating).toFixed(1)) : null,
          avgCleanlinessRating: feedbackStats?.avgCleanlinessRating ? Number(Number(feedbackStats.avgCleanlinessRating).toFixed(1)) : null,
          avgProductRating: feedbackStats?.avgProductRating ? Number(Number(feedbackStats.avgProductRating).toFixed(1)) : null,
          avgStaffRating: feedbackStats?.avgStaffRating ? Number(Number(feedbackStats.avgStaffRating).toFixed(1)) : null,
        },
        branchComparison: branchStats.map(b => ({
          branchId: b.branchId,
          branchName: b.branchName,
          avgRating: b.avgRating ? Number(Number(b.avgRating).toFixed(1)) : 0,
          feedbackCount: Number(b.feedbackCount),
        })),
        recentInteractions: recentFeedback,
        categoryDistribution: categoryDistribution.map(c => ({
          category: c.category,
          count: Number(c.count),
        })),
      });
    } catch (error: any) {
      console.error("CRM dashboard stats error:", error);
      res.status(500).json({ message: "Dashboard verileri yüklenemedi" });
    }
  });

  app.get('/api/crm/complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Erişim yok" });
      }

      const { type, branchId, status, priority, startDate, endDate } = req.query;

      let guestResults: any[] = [];
      let productResults: any[] = [];

      if (!type || type === 'misafir' || type === 'all') {
        const guestQuery = db.select({
          id: guestComplaints.id,
          type: sql<string>`'misafir'`,
          branchId: guestComplaints.branchId,
          branchName: branches.name,
          status: guestComplaints.status,
          priority: guestComplaints.priority,
          title: guestComplaints.subject,
          description: guestComplaints.description,
          category: guestComplaints.complaintCategory,
          customerName: guestComplaints.customerName,
          slaBreached: guestComplaints.slaBreached,
          responseDeadline: guestComplaints.responseDeadline,
          assignedToId: guestComplaints.assignedToId,
          createdAt: guestComplaints.createdAt,
          resolvedAt: guestComplaints.resolvedAt,
        }).from(guestComplaints)
          .innerJoin(branches, eq(guestComplaints.branchId, branches.id));

        const conditions: any[] = [];
        if (branchId) conditions.push(eq(guestComplaints.branchId, Number(branchId)));
        if (status) conditions.push(eq(guestComplaints.status, String(status)));
        if (priority) conditions.push(eq(guestComplaints.priority, String(priority)));
        if (startDate) conditions.push(gte(guestComplaints.createdAt, new Date(String(startDate))));
        if (endDate) conditions.push(lte(guestComplaints.createdAt, new Date(String(endDate))));

        guestResults = conditions.length > 0 
          ? await guestQuery.where(and(...conditions))
          : await guestQuery;
      }

      if (!type || type === 'urun' || type === 'all') {
        const productQuery = db.select({
          id: productComplaints.id,
          type: sql<string>`'urun'`,
          branchId: productComplaints.branchId,
          branchName: branches.name,
          status: productComplaints.status,
          priority: productComplaints.severity,
          title: productComplaints.productName,
          description: productComplaints.description,
          category: productComplaints.complaintType,
          customerName: sql<string>`NULL`,
          slaBreached: sql<boolean>`false`,
          responseDeadline: sql<string>`NULL`,
          assignedToId: productComplaints.assignedToId,
          createdAt: productComplaints.createdAt,
          resolvedAt: productComplaints.resolvedAt,
        }).from(productComplaints)
          .innerJoin(branches, eq(productComplaints.branchId, branches.id));

        const conditions: any[] = [];
        if (branchId) conditions.push(eq(productComplaints.branchId, Number(branchId)));
        if (status) conditions.push(eq(productComplaints.status, String(status)));
        if (priority) conditions.push(eq(productComplaints.severity, String(priority)));
        if (startDate) conditions.push(gte(productComplaints.createdAt, new Date(String(startDate))));
        if (endDate) conditions.push(lte(productComplaints.createdAt, new Date(String(endDate))));

        productResults = conditions.length > 0
          ? await productQuery.where(and(...conditions))
          : await productQuery;
      }

      const combined = [...guestResults, ...productResults]
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

      res.json(combined);
    } catch (error: any) {
      console.error("CRM complaints error:", error);
      res.status(500).json({ message: "Şikayetler yüklenemedi" });
    }
  });

  app.get('/api/crm/complaints/:type/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }
      const { type, id } = req.params;
      if (type === 'misafir') {
        const [complaint] = await db.select().from(guestComplaints).where(eq(guestComplaints.id, Number(id)));
        if (!complaint) return res.status(404).json({ message: "Bulunamadı" });
        const [branch] = await db.select().from(branches).where(eq(branches.id, complaint.branchId));
        let assignedUser = null;
        if (complaint.assignedToId) {
          const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, complaint.assignedToId));
          assignedUser = u;
        }
        res.json({ ...complaint, branchName: branch?.name, assignedUser, complaintType: 'misafir' });
      } else if (type === 'urun') {
        const [complaint] = await db.select().from(productComplaints).where(eq(productComplaints.id, Number(id)));
        if (!complaint) return res.status(404).json({ message: "Bulunamadı" });
        const [branch] = await db.select().from(branches).where(eq(branches.id, complaint.branchId));
        let assignedUser = null;
        if (complaint.assignedToId) {
          const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, complaint.assignedToId));
          assignedUser = u;
        }
        res.json({ ...complaint, branchName: branch?.name, assignedUser, complaintType: 'urun' });
      } else {
        res.status(400).json({ message: "Geçersiz şikayet türü" });
      }
    } catch (error: any) {
      console.error("CRM complaint detail error:", error);
      res.status(500).json({ message: "Şikayet detayı yüklenemedi" });
    }
  });

  app.patch('/api/crm/complaints/:type/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }
      const { type, id } = req.params;
      const { assignedToId } = req.body;
      if (!assignedToId) return res.status(400).json({ message: "Atanacak kişi gerekli" });

      if (type === 'misafir') {
        await db.update(guestComplaints)
          .set({ assignedToId, assignedAt: new Date(), status: 'assigned', updatedAt: new Date() })
          .where(eq(guestComplaints.id, Number(id)));
      } else if (type === 'urun') {
        await db.update(productComplaints)
          .set({ assignedToId, status: 'investigating', updatedAt: new Date() })
          .where(eq(productComplaints.id, Number(id)));
      }
      res.json({ message: "Atama yapıldı" });
    } catch (error: any) {
      res.status(500).json({ message: "Atama başarısız" });
    }
  });

  app.patch('/api/crm/complaints/:type/:id/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }
      const { type, id } = req.params;
      const { resolutionNotes } = req.body;
      if (!resolutionNotes) return res.status(400).json({ message: "Çözüm notu zorunlu" });

      const now = new Date();
      if (type === 'misafir') {
        await db.update(guestComplaints)
          .set({ status: 'resolved', resolutionNotes, resolvedById: req.user!.id, resolvedAt: now, updatedAt: now })
          .where(eq(guestComplaints.id, Number(id)));
      } else if (type === 'urun') {
        await db.update(productComplaints)
          .set({ status: 'resolved', resolution: resolutionNotes, resolvedById: req.user!.id, resolvedAt: now, updatedAt: now })
          .where(eq(productComplaints.id, Number(id)));
      }
      res.json({ message: "Şikayet çözümlendi" });
    } catch (error: any) {
      res.status(500).json({ message: "Çözümleme başarısız" });
    }
  });

  app.get('/api/crm/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Erişim yok" });
      }

      const days = Number(req.query.days) || 30;
      const branchId = req.query.branchId ? Number(req.query.branchId) : null;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const conditions: any[] = [gte(customerFeedback.createdAt, startDate)];
      if (branchId) conditions.push(eq(customerFeedback.branchId, branchId));

      const dailyTrend = await db.select({
        date: sql<string>`DATE(${customerFeedback.createdAt})`,
        avgRating: avg(customerFeedback.rating),
        count: count(),
        avgService: avg(customerFeedback.serviceRating),
        avgCleanliness: avg(customerFeedback.cleanlinessRating),
        avgProduct: avg(customerFeedback.productRating),
        avgStaff: avg(customerFeedback.staffRating),
      }).from(customerFeedback)
        .where(and(...conditions))
        .groupBy(sql`DATE(${customerFeedback.createdAt})`)
        .orderBy(sql`DATE(${customerFeedback.createdAt})`);

      const sentimentData = await db.select({
        positive: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} >= 4)`,
        neutral: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 3)`,
        negative: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} <= 2)`,
      }).from(customerFeedback)
        .where(and(...conditions));

      const branchComparison = await db.select({
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        avgRating: avg(customerFeedback.rating),
        avgService: avg(customerFeedback.serviceRating),
        avgCleanliness: avg(customerFeedback.cleanlinessRating),
        avgProduct: avg(customerFeedback.productRating),
        avgStaff: avg(customerFeedback.staffRating),
        feedbackCount: count(),
      }).from(customerFeedback)
        .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
        .where(gte(customerFeedback.createdAt, startDate))
        .groupBy(customerFeedback.branchId, branches.name)
        .orderBy(desc(avg(customerFeedback.rating)));

      res.json({
        dailyTrend: dailyTrend.map(d => ({
          date: d.date,
          avgRating: d.avgRating ? Number(Number(d.avgRating).toFixed(1)) : 0,
          count: Number(d.count),
          avgService: d.avgService ? Number(Number(d.avgService).toFixed(1)) : null,
          avgCleanliness: d.avgCleanliness ? Number(Number(d.avgCleanliness).toFixed(1)) : null,
          avgProduct: d.avgProduct ? Number(Number(d.avgProduct).toFixed(1)) : null,
          avgStaff: d.avgStaff ? Number(Number(d.avgStaff).toFixed(1)) : null,
        })),
        sentiment: sentimentData[0] ? {
          positive: Number(sentimentData[0].positive || 0),
          neutral: Number(sentimentData[0].neutral || 0),
          negative: Number(sentimentData[0].negative || 0),
        } : { positive: 0, neutral: 0, negative: 0 },
        branchComparison: branchComparison.map(b => ({
          branchId: b.branchId,
          branchName: b.branchName,
          avgRating: b.avgRating ? Number(Number(b.avgRating).toFixed(1)) : 0,
          avgService: b.avgService ? Number(Number(b.avgService).toFixed(1)) : null,
          avgCleanliness: b.avgCleanliness ? Number(Number(b.avgCleanliness).toFixed(1)) : null,
          avgProduct: b.avgProduct ? Number(Number(b.avgProduct).toFixed(1)) : null,
          avgStaff: b.avgStaff ? Number(Number(b.avgStaff).toFixed(1)) : null,
          feedbackCount: Number(b.feedbackCount),
        })),
      });
    } catch (error: any) {
      console.error("CRM analytics error:", error);
      res.status(500).json({ message: "Analiz verileri yüklenemedi" });
    }
  });

  app.get('/api/crm/sla-tracking', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Erişim yok" });
      }

      const now = new Date();

      const pendingFeedback = await db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        rating: customerFeedback.rating,
        comment: customerFeedback.comment,
        status: customerFeedback.status,
        responseDeadline: customerFeedback.responseDeadline,
        slaBreached: customerFeedback.slaBreached,
        createdAt: customerFeedback.createdAt,
      }).from(customerFeedback)
        .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
        .where(inArray(customerFeedback.status, ['new', 'in_progress', 'awaiting_response']))
        .orderBy(customerFeedback.responseDeadline);

      const items = pendingFeedback.map(f => {
        let slaStatus: 'green' | 'yellow' | 'red' = 'green';
        let hoursRemaining: number | null = null;
        if (f.responseDeadline) {
          const deadline = new Date(f.responseDeadline);
          hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursRemaining < 0 || f.slaBreached) slaStatus = 'red';
          else if (hoursRemaining < 12) slaStatus = 'yellow';
        }
        return { ...f, slaStatus, hoursRemaining: hoursRemaining !== null ? Number(hoursRemaining.toFixed(1)) : null };
      });

      const branchSla = await db.select({
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        totalFeedback: count(),
        breachedCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.slaBreached} = true)`,
        avgResponseHours: sql<number>`AVG(EXTRACT(EPOCH FROM (COALESCE(${customerFeedback.reviewedAt}, NOW()) - ${customerFeedback.createdAt})) / 3600) FILTER (WHERE ${customerFeedback.reviewedAt} IS NOT NULL)`,
      }).from(customerFeedback)
        .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
        .where(gte(customerFeedback.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(customerFeedback.branchId, branches.name)
        .orderBy(desc(sql`COUNT(*) FILTER (WHERE ${customerFeedback.slaBreached} = true)`));

      res.json({
        pendingItems: items,
        branchPerformance: branchSla.map(b => ({
          branchId: b.branchId,
          branchName: b.branchName,
          totalFeedback: Number(b.totalFeedback),
          breachedCount: Number(b.breachedCount || 0),
          complianceRate: Number(b.totalFeedback) > 0
            ? Number(((1 - Number(b.breachedCount || 0) / Number(b.totalFeedback)) * 100).toFixed(1))
            : 100,
          avgResponseHours: b.avgResponseHours ? Number(Number(b.avgResponseHours).toFixed(1)) : null,
        })),
        summary: {
          totalPending: items.length,
          breached: items.filter(i => i.slaStatus === 'red').length,
          warning: items.filter(i => i.slaStatus === 'yellow').length,
          onTrack: items.filter(i => i.slaStatus === 'green').length,
        },
      });
    } catch (error: any) {
      console.error("CRM SLA tracking error:", error);
      res.status(500).json({ message: "SLA verileri yüklenemedi" });
    }
  });

  app.get('/api/crm/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!HQ_ROLES.has(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }
      const settings = await db.select().from(feedbackFormSettings);
      res.json({
        formSettings: settings,
        slaThresholds: {
          defaultResponseHours: 24,
          escalationHours: 48,
          criticalResponseHours: 4,
        },
        notificationRules: {
          lowRatingThreshold: 2,
          autoAssignEnabled: true,
          escalationEnabled: true,
        },
        responsibilityMatrix: {
          temizlik: 'supervisor',
          hizmet: 'supervisor',
          urun: 'kalite_kontrol',
          personel: 'mudur',
          guler_yuzluluk: 'bireysel',
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: "Ayarlar yüklenemedi" });
    }
  });

  app.get('/api/crm/branches', isAuthenticated, async (req: any, res) => {
    try {
      const allBranches = await db.select({ id: branches.id, name: branches.name })
        .from(branches).orderBy(branches.name);
      res.json(allBranches);
    } catch (error: any) {
      res.status(500).json({ message: "Şubeler yüklenemedi" });
    }
  });
}
