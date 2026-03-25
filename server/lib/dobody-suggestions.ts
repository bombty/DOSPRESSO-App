import { db } from "../db";
import { sql, eq, and, lt, lte, gte, desc, count, avg, sum, isNull } from "drizzle-orm";
import {
  users,
  checklistAssignments,
  checklistCompletions,
  trainingAssignments,
  learningStreaks,
  userCareerProgress,
  careerLevels,
  userBadges,
  badges,
  customerFeedback,
  branchInventory,
  branchOrders,
  productionBatches,
  factoryInventory,
  factoryProducts,
  branches,
  trainingModules,
  quizResults,
  payrollRecords,
  productComplaints,
  haccpControlPoints,
  haccpRecords,
  factoryStations,
  factoryProductionOutputs,
  purchaseOrders,
  campaigns,
  foodSafetyDocuments,
} from "@shared/schema";

export interface DobodySuggestion {
  id: string;
  message: string;
  actionType: "send_notification" | "create_task" | "redirect" | "send_message" | "info";
  actionLabel: string;
  targetUserId?: string;
  payload?: Record<string, any>;
  priority: "low" | "medium" | "high" | "critical";
  icon: string;
}

const MAX_SUGGESTIONS = 4;

export async function getBaristaSuggestions(userId: string): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const [streak] = await db
      .select()
      .from(learningStreaks)
      .where(eq(learningStreaks.userId, userId))
      .limit(1);

    if (streak && streak.currentStreak >= 3) {
      suggestions.push({
        id: `streak-motivation-${userId}`,
        message: `${streak.currentStreak} gunluk seri! Harika gidiyorsun, devam et!`,
        actionType: "redirect",
        actionLabel: "Akademiye Git",
        payload: { route: "/akademi" },
        priority: "low",
        icon: "Flame",
      });
    }

    const nearBadges = await db
      .select({
        badgeId: userBadges.badgeId,
        progress: userBadges.progress,
        titleTr: badges.titleTr,
        iconName: badges.iconName,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(
        and(
          eq(userBadges.userId, userId),
          gte(userBadges.progress, 70),
          lt(userBadges.progress, 100)
        )
      )
      .limit(1);

    if (nearBadges.length > 0) {
      const badge = nearBadges[0];
      suggestions.push({
        id: `badge-near-${badge.badgeId}`,
        message: `"${badge.titleTr}" rozetine %${badge.progress} ulaştın! Biraz daha çaba ile kazanabilirsin.`,
        actionType: "redirect",
        actionLabel: "Rozetlerim",
        payload: { route: "/akademi-badges" },
        priority: "medium",
        icon: badge.iconName || "Award",
      });
    }

    const overdueTraining = await db
      .select({ id: trainingAssignments.id, dueDate: trainingAssignments.dueDate })
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.userId, userId),
          eq(trainingAssignments.status, "assigned"),
          lte(trainingAssignments.dueDate, today)
        )
      )
      .limit(1);

    if (overdueTraining.length > 0) {
      suggestions.push({
        id: `training-overdue-${overdueTraining[0].id}`,
        message: "Tamamlanmamış eğitim modülün var. Hemen başlayarak geride kalma!",
        actionType: "redirect",
        actionLabel: "Eğitime Git",
        payload: { route: "/akademi" },
        priority: "high",
        icon: "BookOpen",
      });
    }

    const pendingChecklists = await db
      .select({ id: checklistCompletions.id })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.userId, userId),
          eq(checklistCompletions.scheduledDate, today),
          eq(checklistCompletions.status, "pending")
        )
      )
      .limit(1);

    if (pendingChecklists.length > 0) {
      suggestions.push({
        id: `checklist-pending-${userId}`,
        message: "Bugün tamamlanmamış checklist'in var. Unuttuysan hemen tamamla!",
        actionType: "redirect",
        actionLabel: "Checklist'e Git",
        payload: { route: "/checklistler" },
        priority: "high",
        icon: "ClipboardCheck",
      });
    }
  } catch (error) {
    console.error("getBaristaSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

export async function getSupervisorSuggestions(branchId: number): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const pendingStaffRaw = await db
      .select({
        userId: checklistCompletions.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(checklistCompletions)
      .innerJoin(users, eq(checklistCompletions.userId, users.id))
      .where(
        and(
          eq(checklistCompletions.branchId, branchId),
          eq(checklistCompletions.scheduledDate, today),
          eq(checklistCompletions.status, "pending")
        )
      )
      .limit(5);

    const pendingStaff = pendingStaffRaw.filter((s, i, arr) => arr.findIndex(x => x.userId === s.userId) === i);

    if (pendingStaff.length > 0) {
      const names = pendingStaff.map(s => s.firstName || "Personel").slice(0, 3).join(", ");
      suggestions.push({
        id: `checklist-pending-branch-${branchId}`,
        message: `${pendingStaff.length} personelin bugünkü checklist'i tamamlanmadı: ${names}`,
        actionType: "send_notification",
        actionLabel: "Hatırlatma Gönder",
        payload: { userIds: pendingStaff.map(s => s.userId), type: "checklist_reminder" },
        priority: "high",
        icon: "ClipboardCheck",
      });
    }

    const lowStockItems = await db
      .select({
        id: branchInventory.id,
        productName: factoryProducts.name,
        currentStock: branchInventory.currentStock,
        minimumStock: branchInventory.minimumStock,
      })
      .from(branchInventory)
      .innerJoin(factoryProducts, eq(branchInventory.productId, factoryProducts.id))
      .where(
        and(
          eq(branchInventory.branchId, branchId),
          sql`CAST(${branchInventory.currentStock} AS numeric) < CAST(${branchInventory.minimumStock} AS numeric)`
        )
      )
      .limit(5);

    if (lowStockItems.length > 0) {
      const itemNames = lowStockItems.map(i => i.productName).slice(0, 3).join(", ");
      suggestions.push({
        id: `stock-low-branch-${branchId}`,
        message: `${lowStockItems.length} ürün minimum stok seviyesinin altında: ${itemNames}`,
        actionType: "redirect",
        actionLabel: "Stok Yönetimi",
        payload: { route: `/satinalma/stok-yonetimi` },
        priority: "high",
        icon: "PackageX",
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const feedbackResult = await db
      .select({ avgRating: avg(customerFeedback.rating) })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.branchId, branchId),
          gte(customerFeedback.feedbackDate, sevenDaysAgo)
        )
      );

    const avgRating = feedbackResult[0]?.avgRating ? parseFloat(String(feedbackResult[0].avgRating)) : null;
    if (avgRating !== null && avgRating < 3.5) {
      suggestions.push({
        id: `feedback-low-${branchId}`,
        message: `Son 7 gündeki müşteri puanı ortalaması ${avgRating.toFixed(1)}. Dikkat gerektiren bir durum var.`,
        actionType: "redirect",
        actionLabel: "Geri Bildirimleri Gör",
        payload: { route: "/misafir-memnuniyeti" },
        priority: "critical",
        icon: "MessageSquareWarning",
      });
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

    const overdueTrainings = await db
      .select({
        userId: trainingAssignments.userId,
        firstName: users.firstName,
      })
      .from(trainingAssignments)
      .innerJoin(users, eq(trainingAssignments.userId, users.id))
      .where(
        and(
          eq(users.branchId, branchId),
          eq(trainingAssignments.status, "assigned"),
          lte(trainingAssignments.dueDate, threeDaysAgoStr)
        )
      )
      .limit(5);

    if (overdueTrainings.length > 0) {
      suggestions.push({
        id: `training-overdue-branch-${branchId}`,
        message: `${overdueTrainings.length} personelin eğitimi 3+ gün gecikti.`,
        actionType: "send_notification",
        actionLabel: "Hatırlatma Gönder",
        payload: {
          userIds: overdueTrainings.map(t => t.userId),
          type: "training_reminder",
        },
        priority: "high",
        icon: "GraduationCap",
      });
    }
  } catch (error) {
    console.error("getSupervisorSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

export async function getHQSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

    const activeBranches = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));

    const activeBranchChecklist = await db
      .select({
        branchId: checklistCompletions.branchId,
        cnt: count(),
      })
      .from(checklistCompletions)
      .where(gte(checklistCompletions.scheduledDate, twoDaysAgoStr))
      .groupBy(checklistCompletions.branchId);

    const activeSet = new Set(activeBranchChecklist.map((r) => r.branchId));
    const inactiveBranches: string[] = [];

    for (const branch of activeBranches) {
      if (!activeSet.has(branch.id)) {
        inactiveBranches.push(branch.name);
      }
    }

    if (inactiveBranches.length >= 3 && suggestions.length < MAX_SUGGESTIONS) {
      suggestions.push({
        id: `consolidated-inactive-checklist`,
        message: `${inactiveBranches.length} şubede 2+ gündür checklist yapılmıyor: ${inactiveBranches.slice(0, 3).join(", ")}${inactiveBranches.length > 3 ? ` ve ${inactiveBranches.length - 3} şube daha` : ""}. Toplu aksiyon alın.`,
        actionType: "send_notification",
        actionLabel: "Toplu Bildirim Gönder",
        targetUserId: undefined,
        payload: { type: "consolidated_inactive_alert", branchNames: inactiveBranches },
        priority: "critical",
        icon: "AlertTriangle",
      });
    } else {
      for (const branch of activeBranches) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
        if (!activeSet.has(branch.id)) {
          suggestions.push({
            id: `branch-inactive-${branch.id}`,
            message: `${branch.name} son 2 gündür checklist aktivitesi yok. İletişime geçin.`,
            actionType: "send_notification",
            actionLabel: "Bildirim Gönder",
            targetUserId: undefined,
            payload: { branchId: branch.id, type: "branch_inactive_alert", route: `/subeler/${branch.id}` },
            priority: "high",
            icon: "AlertTriangle",
          });
        }
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const lowRatingBranches = await db
      .select({
        branchId: customerFeedback.branchId,
        avgRating: avg(customerFeedback.rating),
        branchName: branches.name,
      })
      .from(customerFeedback)
      .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
      .where(gte(customerFeedback.feedbackDate, sevenDaysAgo))
      .groupBy(customerFeedback.branchId, branches.name)
      .having(sql`AVG(${customerFeedback.rating}) < 3.5`)
      .limit(3);

    for (const br of lowRatingBranches) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      const ratingStr = br.avgRating ? parseFloat(String(br.avgRating)).toFixed(1) : "N/A";
      suggestions.push({
        id: `hq-low-rating-${br.branchId}`,
        message: `${br.branchName} müşteri puanı düşük (${ratingStr}). İnceleme yapılmalı.`,
        actionType: "redirect",
        actionLabel: br.branchName || "Şube Detay",
        payload: { route: `/subeler/${br.branchId}`, branchId: br.branchId },
        priority: "critical",
        icon: "TrendingDown",
      });
    }

    try {
      const { supportTickets } = await import("@shared/schema");
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const openComplianceByBranch = await db
        .select({
          branchId: supportTickets.branchId,
          branchName: branches.name,
          ticketCount: count(),
        })
        .from(supportTickets)
        .innerJoin(branches, eq(supportTickets.branchId, branches.id))
        .where(
          and(
            sql`${supportTickets.ticketType} = 'compliance'`,
            eq(supportTickets.isDeleted, false),
            sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`,
            lte(supportTickets.createdAt, fiveDaysAgo)
          )
        )
        .groupBy(supportTickets.branchId, branches.name);

      if (openComplianceByBranch.length >= 2 && suggestions.length < MAX_SUGGESTIONS) {
        const branchNames = openComplianceByBranch.map(b => b.branchName).slice(0, 3);
        const totalTickets = openComplianceByBranch.reduce((s, b) => s + Number(b.ticketCount), 0);
        suggestions.push({
          id: `consolidated-compliance-aging`,
          message: `${openComplianceByBranch.length} şubede 5+ gündür açık uygunsuzluk kaydı var (toplam ${totalTickets} kayıt): ${branchNames.join(", ")}${openComplianceByBranch.length > 3 ? " ve diğerleri" : ""}. Takip gerekli.`,
          actionType: "redirect",
          actionLabel: "CRM Uygunsuzlukları Gör",
          payload: { route: "/hq-destek?ticketType=compliance", type: "consolidated_compliance" },
          priority: "high",
          icon: "AlertTriangle",
        });
      }
    } catch (complianceError) {
      console.error("Compliance consolidation error:", complianceError);
    }
  } catch (error) {
    console.error("getHQSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

export async function getCoachSuggestions(userId: string): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const droppingScores = await db
      .select({
        usrId: userCareerProgress.userId,
        compositeScore: userCareerProgress.compositeScore,
        dangerZoneMonths: userCareerProgress.dangerZoneMonths,
        firstName: users.firstName,
        lastName: users.lastName,
        branchName: branches.name,
      })
      .from(userCareerProgress)
      .innerJoin(users, eq(userCareerProgress.userId, users.id))
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(
        and(
          sql`${userCareerProgress.compositeScore} < 60`,
          sql`${userCareerProgress.dangerZoneMonths} >= 1`
        )
      )
      .orderBy(userCareerProgress.compositeScore)
      .limit(3);

    for (const staff of droppingScores) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      suggestions.push({
        id: `score-dropping-${staff.usrId}`,
        message: `${staff.firstName} ${staff.lastName} (${staff.branchName || "Şube"}) skoru düşük: ${(staff.compositeScore || 0).toFixed(0)}. ${staff.dangerZoneMonths} aydır tehlike bölgesinde.`,
        actionType: "redirect",
        actionLabel: "Profili Gör",
        targetUserId: staff.usrId,
        payload: { route: `/personel-detay/${staff.usrId}` },
        priority: "critical",
        icon: "TrendingDown",
      });
    }

    const gateReadyUsers = await db
      .select({
        usrId: userCareerProgress.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        levelTitle: careerLevels.titleTr,
      })
      .from(userCareerProgress)
      .innerJoin(users, eq(userCareerProgress.userId, users.id))
      .innerJoin(careerLevels, eq(userCareerProgress.currentCareerLevelId, careerLevels.id))
      .where(
        and(
          sql`${userCareerProgress.compositeScore} >= 80`,
          sql`${userCareerProgress.promotionEligibleAt} IS NOT NULL`,
          sql`${userCareerProgress.promotionEligibleAt} <= NOW()`
        )
      )
      .limit(3);

    for (const ready of gateReadyUsers) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      suggestions.push({
        id: `gate-ready-${ready.usrId}`,
        message: `${ready.firstName} ${ready.lastName} terfi için hazır (${ready.levelTitle}). Sınav süreci başlatılabilir.`,
        actionType: "redirect",
        actionLabel: "Değerlendirmeye Git",
        targetUserId: ready.usrId,
        payload: { route: `/personel-detay/${ready.usrId}`, action: "promote" },
        priority: "medium",
        icon: "ArrowUpCircle",
      });
    }
  } catch (error) {
    console.error("getCoachSuggestions error:", error);
  }

  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

    const activeBranchesCoach = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));

    const activeBranchChecklistCoach = await db
      .select({
        branchId: checklistCompletions.branchId,
        cnt: count(),
      })
      .from(checklistCompletions)
      .where(gte(checklistCompletions.scheduledDate, twoDaysAgoStr))
      .groupBy(checklistCompletions.branchId);

    const activeSetCoach = new Set(activeBranchChecklistCoach.map((r) => r.branchId));
    const inactiveBranchesCoach: Array<{ id: number; name: string }> = [];

    for (const branch of activeBranchesCoach) {
      if (!activeSetCoach.has(branch.id)) {
        inactiveBranchesCoach.push({ id: branch.id, name: branch.name });
      }
    }

    if (inactiveBranchesCoach.length >= 3 && suggestions.length < MAX_SUGGESTIONS) {
      const branchNames = inactiveBranchesCoach.map(b => b.name);
      suggestions.push({
        id: `coach-consolidated-inactive-checklist`,
        message: `${inactiveBranchesCoach.length} şubede 2+ gündür checklist yapılmıyor: ${branchNames.slice(0, 3).join(", ")}${branchNames.length > 3 ? ` ve ${branchNames.length - 3} şube daha` : ""}. Toplu aksiyon alın.`,
        actionType: "send_notification",
        actionLabel: "Toplu Bildirim Gönder",
        payload: { type: "consolidated_inactive_alert", branchNames },
        priority: "critical",
        icon: "AlertTriangle",
      });
    } else {
      for (const branch of inactiveBranchesCoach) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
        suggestions.push({
          id: `coach-branch-inactive-${branch.id}`,
          message: `${branch.name} son 2 gündür checklist aktivitesi yok. İletişime geçin.`,
          actionType: "send_notification",
          actionLabel: "Bildirim Gönder",
          payload: { branchId: branch.id, branchName: branch.name, type: "branch_inactive_alert" },
          priority: "high",
          icon: "AlertTriangle",
        });
      }
    }
  } catch (checklistError) {
    console.error("Coach checklist consolidation error:", checklistError);
  }

  try {
    const { supportTickets } = await import("@shared/schema");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const openComplianceByBranch = await db
      .select({
        branchId: supportTickets.branchId,
        branchName: branches.name,
        ticketCount: count(),
      })
      .from(supportTickets)
      .innerJoin(branches, eq(supportTickets.branchId, branches.id))
      .where(
        and(
          sql`${supportTickets.ticketType} = 'compliance'`,
          eq(supportTickets.isDeleted, false),
          sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`,
          lte(supportTickets.createdAt, fiveDaysAgo)
        )
      )
      .groupBy(supportTickets.branchId, branches.name);

    if (openComplianceByBranch.length >= 2 && suggestions.length < MAX_SUGGESTIONS) {
      const branchNames = openComplianceByBranch.map(b => b.branchName).slice(0, 3);
      const totalTickets = openComplianceByBranch.reduce((s, b) => s + Number(b.ticketCount), 0);
      suggestions.push({
        id: `coach-compliance-aging`,
        message: `${openComplianceByBranch.length} şubede 5+ gündür açık uygunsuzluk kaydı var (toplam ${totalTickets} kayıt): ${branchNames.join(", ")}${openComplianceByBranch.length > 3 ? " ve diğerleri" : ""}. Koç olarak takip önerilir.`,
        actionType: "redirect",
        actionLabel: "Uygunsuzlukları İncele",
        payload: { route: "/hq-destek?ticketType=compliance", type: "consolidated_compliance" },
        priority: "high",
        icon: "AlertTriangle",
      });
    } else if (openComplianceByBranch.length === 1 && suggestions.length < MAX_SUGGESTIONS) {
      const item = openComplianceByBranch[0];
      suggestions.push({
        id: `coach-compliance-branch-${item.branchId}`,
        message: `${item.branchName} şubesinde ${item.ticketCount} açık uygunsuzluk kaydı 5+ gündür bekliyor.`,
        actionType: "send_notification",
        actionLabel: "Bildirim Gönder",
        payload: { branchId: item.branchId, branchName: item.branchName, route: `/subeler/${item.branchId}` },
        priority: "high",
        icon: "AlertTriangle",
      });
    }
  } catch (complianceError) {
    console.error("Coach compliance consolidation error:", complianceError);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

export async function getFactorySuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];

    const expiringBatches = await db
      .select({
        id: productionBatches.id,
        batchNumber: productionBatches.batchNumber,
        expiryDate: productionBatches.expiryDate,
        productName: factoryProducts.name,
        quantity: productionBatches.quantity,
      })
      .from(productionBatches)
      .innerJoin(factoryProducts, eq(productionBatches.productId, factoryProducts.id))
      .where(
        and(
          lte(productionBatches.expiryDate, sevenDaysStr),
          gte(productionBatches.expiryDate, todayStr),
          sql`${productionBatches.status} NOT IN ('rejected')`
        )
      )
      .orderBy(productionBatches.expiryDate)
      .limit(3);

    if (expiringBatches.length > 0) {
      const batchNames = expiringBatches.map(b => b.productName).join(", ");
      suggestions.push({
        id: "skt-yakin",
        message: `${expiringBatches.length} partinin SKT'si 7 gun icinde doluyor: ${batchNames}`,
        actionType: "redirect",
        actionLabel: "Stok Durumu",
        payload: { route: "/fabrika/dashboard" },
        priority: "high",
        icon: "Clock",
      });
    }

    const pendingOrders = await db
      .select({
        id: branchOrders.id,
        orderNumber: branchOrders.orderNumber,
        branchName: branches.name,
      })
      .from(branchOrders)
      .innerJoin(branches, eq(branchOrders.branchId, branches.id))
      .where(eq(branchOrders.status, "pending"))
      .orderBy(branchOrders.createdAt)
      .limit(5);

    if (pendingOrders.length > 0) {
      suggestions.push({
        id: "order-pending",
        message: `${pendingOrders.length} şube siparişi onay bekliyor.`,
        actionType: "redirect",
        actionLabel: "Siparişleri Gör",
        payload: { route: "/fabrika/dashboard", tab: "orders" },
        priority: "high",
        icon: "ShoppingCart",
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

    const rejectedBatches = await db
      .select({ cnt: count() })
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.status, "rejected"),
          gte(productionBatches.productionDate, thirtyDaysStr)
        )
      );

    const totalBatches = await db
      .select({ cnt: count() })
      .from(productionBatches)
      .where(gte(productionBatches.productionDate, thirtyDaysStr));

    const rejected = rejectedBatches[0]?.cnt || 0;
    const total = totalBatches[0]?.cnt || 1;
    const wasteRate = (rejected / total) * 100;

    if (wasteRate > 5 && total > 0) {
      suggestions.push({
        id: "waste-high",
        message: `Son 30 günde fire oranı %${wasteRate.toFixed(1)}. Kalite kontrolü gözden geçirin.`,
        actionType: "redirect",
        actionLabel: "Kalite Raporları",
        payload: { route: "/fabrika/dashboard", tab: "quality" },
        priority: "critical",
        icon: "AlertTriangle",
      });
    }
  } catch (error) {
    console.error("getFactorySuggestions error:", error);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

const MAX_ROLE_SUGGESTIONS = 5;

export async function getTrainerSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const unpublishedModules = await db
      .select({ id: trainingModules.id, title: trainingModules.title })
      .from(trainingModules)
      .where(eq(trainingModules.isPublished, false))
      .limit(5);

    if (unpublishedModules.length > 0) {
      suggestions.push({
        id: "trainer-pending-modules",
        message: `${unpublishedModules.length} eğitim modülü yayınlanmayı bekliyor.`,
        actionType: "redirect",
        actionLabel: "Modülleri Gör",
        payload: { route: "/egitim" },
        priority: "high",
        icon: "BookOpen",
      });
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

    const overdueTrainings = await db
      .select({ cnt: count() })
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.status, "assigned"),
          lte(trainingAssignments.dueDate, threeDaysAgoStr)
        )
      );

    const overdueCount = overdueTrainings[0]?.cnt || 0;
    if (overdueCount > 0) {
      suggestions.push({
        id: "trainer-overdue-training",
        message: `${overdueCount} personelin eğitimi 3+ gün gecikti. Takip gerekiyor.`,
        actionType: "redirect",
        actionLabel: "Geciken Eğitimler",
        payload: { route: "/egitim" },
        priority: "critical",
        icon: "AlertTriangle",
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizStats = await db
      .select({
        totalQuizzes: count(),
        passedQuizzes: sql<number>`COUNT(CASE WHEN ${quizResults.score} >= 70 THEN 1 END)`,
      })
      .from(quizResults)
      .where(gte(quizResults.completedAt, thirtyDaysAgo));

    const total = quizStats[0]?.totalQuizzes || 0;
    const passed = quizStats[0]?.passedQuizzes || 0;
    if (total > 5) {
      const passRate = (passed / total) * 100;
      if (passRate < 60) {
        suggestions.push({
          id: "trainer-low-quiz-pass",
          message: `Son 30 günde quiz başarı oranı %${passRate.toFixed(0)}. İçerik gözden geçirilmeli.`,
          actionType: "redirect",
          actionLabel: "Quiz Sonuçları",
          payload: { route: "/egitim" },
          priority: "high",
          icon: "TrendingDown",
        });
      }
    }
  } catch (error) {
    console.error("getTrainerSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getMuhasebeSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const payrollResult = await db
      .select({ cnt: count() })
      .from(payrollRecords)
      .where(
        and(
          eq(payrollRecords.periodYear, currentYear),
          eq(payrollRecords.periodMonth, currentMonth),
          eq(payrollRecords.status, "draft")
        )
      );

    const pendingPayroll = payrollResult[0]?.cnt || 0;
    if (pendingPayroll > 0) {
      suggestions.push({
        id: "muhasebe-pending-payroll",
        message: `${pendingPayroll} personelin bu ayki bordrosu taslak durumunda.`,
        actionType: "redirect",
        actionLabel: "Bordro Yönetimi",
        payload: { route: "/maas" },
        priority: "high",
        icon: "DollarSign",
      });
    }

    const dayOfMonth = now.getDate();
    if (dayOfMonth >= 25) {
      suggestions.push({
        id: "muhasebe-payroll-deadline",
        message: "Maas odeme donemi yaklasti. Bordrolari kontrol edin.",
        actionType: "redirect",
        actionLabel: "Bordrolara Git",
        payload: { route: "/maas" },
        priority: "critical",
        icon: "Clock",
      });
    }

    const activeEmployees = await db
      .select({ cnt: count() })
      .from(users)
      .where(eq(users.isActive, true));

    const employeesWithPayroll = await db
      .select({ cnt: count() })
      .from(payrollRecords)
      .where(
        and(
          eq(payrollRecords.periodYear, currentYear),
          eq(payrollRecords.periodMonth, currentMonth)
        )
      );

    const totalActive = activeEmployees[0]?.cnt || 0;
    const withPayroll = employeesWithPayroll[0]?.cnt || 0;
    const missingCount = totalActive - withPayroll;

    if (missingCount > 5) {
      suggestions.push({
        id: "muhasebe-missing-pdks",
        message: `${missingCount} personelin bu ay için bordro kaydı oluşturulmamış.`,
        actionType: "redirect",
        actionLabel: "Puantaj Kontrol",
        payload: { route: "/pdks" },
        priority: "medium",
        icon: "UserX",
      });
    }
  } catch (error) {
    console.error("getMuhasebeSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getKaliteKontrolSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const pendingComplaints = await db
      .select({
        cnt: count(),
      })
      .from(productComplaints)
      .where(eq(productComplaints.status, "new"));

    const pendingCount = pendingComplaints[0]?.cnt || 0;
    if (pendingCount > 0) {
      suggestions.push({
        id: "kalite-pending-complaints",
        message: `${pendingCount} yeni ürün şikayeti inceleme bekliyor.`,
        actionType: "redirect",
        actionLabel: "Şikayetleri Gör",
        payload: { route: "/urun-sikayet" },
        priority: "high",
        icon: "MessageSquareWarning",
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const outOfLimitRecords = await db
      .select({ cnt: count() })
      .from(haccpRecords)
      .where(
        and(
          eq(haccpRecords.isWithinLimits, false),
          gte(haccpRecords.recordedAt, sevenDaysAgo)
        )
      );

    const haccpWarnings = outOfLimitRecords[0]?.cnt || 0;
    if (haccpWarnings > 0) {
      suggestions.push({
        id: "kalite-haccp-warnings",
        message: `Son 7 gunde ${haccpWarnings} HACCP limit asimi tespit edildi.`,
        actionType: "redirect",
        actionLabel: "HACCP Kayitlari",
        payload: { route: "/gida-guvenligi-dashboard" },
        priority: "critical",
        icon: "ShieldAlert",
      });
    }

    const criticalComplaints = await db
      .select({ cnt: count() })
      .from(productComplaints)
      .where(
        and(
          eq(productComplaints.severity, "critical"),
          eq(productComplaints.status, "investigating")
        )
      );

    const criticalCount = criticalComplaints[0]?.cnt || 0;
    if (criticalCount > 0) {
      suggestions.push({
        id: "kalite-critical-complaints",
        message: `${criticalCount} kritik seviye ürün şikayeti araştırma aşamasında.`,
        actionType: "redirect",
        actionLabel: "Kritik Şikayetler",
        payload: { route: "/urun-sikayet" },
        priority: "critical",
        icon: "AlertTriangle",
      });
    }
  } catch (error) {
    console.error("getKaliteKontrolSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getGidaMuhendisiSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];

    const expiringBatches = await db
      .select({
        cnt: count(),
      })
      .from(productionBatches)
      .where(
        and(
          lte(productionBatches.expiryDate, sevenDaysStr),
          gte(productionBatches.expiryDate, todayStr),
          sql`${productionBatches.status} NOT IN ('rejected')`
        )
      );

    const expiringCount = expiringBatches[0]?.cnt || 0;
    if (expiringCount > 0) {
      suggestions.push({
        id: "gida-expiring-lots",
        message: `${expiringCount} partinin son kullanma tarihi 7 gun icinde doluyor.`,
        actionType: "redirect",
        actionLabel: "Lot Takibi",
        payload: { route: "/fabrika/dashboard" },
        priority: "high",
        icon: "Clock",
      });
    }

    const reviewDocs = await db
      .select({ id: foodSafetyDocuments.id, title: foodSafetyDocuments.title })
      .from(foodSafetyDocuments)
      .where(
        and(
          eq(foodSafetyDocuments.isActive, true),
          lte(foodSafetyDocuments.reviewDate, sevenDaysLater),
          gte(foodSafetyDocuments.reviewDate, new Date())
        )
      )
      .limit(5);

    if (reviewDocs.length > 0) {
      suggestions.push({
        id: "gida-review-due",
        message: `${reviewDocs.length} gida guvenligi dokumani gozden gecirme tarihine yaklasti.`,
        actionType: "redirect",
        actionLabel: "Dokumanlar",
        payload: { route: "/gida-guvenligi-dashboard" },
        priority: "medium",
        icon: "FileSearch",
      });
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const outOfLimitRecords = await db
      .select({ cnt: count() })
      .from(haccpRecords)
      .where(
        and(
          eq(haccpRecords.isWithinLimits, false),
          gte(haccpRecords.recordedAt, threeDaysAgo)
        )
      );

    const haccpIssues = outOfLimitRecords[0]?.cnt || 0;
    if (haccpIssues > 0) {
      suggestions.push({
        id: "gida-haccp-issues",
        message: `Son 3 gunde ${haccpIssues} HACCP kontrol noktasinda limit asimi.`,
        actionType: "redirect",
        actionLabel: "HACCP Kontrol",
        payload: { route: "/gida-guvenligi-dashboard" },
        priority: "critical",
        icon: "ShieldAlert",
      });
    }
  } catch (error) {
    console.error("getGidaMuhendisiSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getFabrikaMudurSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const prodStats = await db
      .select({
        totalProduced: sum(factoryProductionOutputs.producedQuantity),
        totalWaste: sum(factoryProductionOutputs.wasteQuantity),
      })
      .from(factoryProductionOutputs)
      .where(sql`${factoryProductionOutputs.createdAt} >= ${todayStart}`);

    const produced = parseFloat(String(prodStats[0]?.totalProduced || 0));
    const waste = parseFloat(String(prodStats[0]?.totalWaste || 0));

    if (produced > 0 && waste > 0) {
      const wasteRate = (waste / (produced + waste)) * 100;
      if (wasteRate > 5) {
        suggestions.push({
          id: "fabrika-mudur-high-waste",
          message: `Bugünkü fire oranı %${wasteRate.toFixed(1)}. Normal üstü fire üretiliyor.`,
          actionType: "redirect",
          actionLabel: "Üretim Raporu",
          payload: { route: "/fabrika/dashboard" },
          priority: "high",
          icon: "AlertTriangle",
        });
      }
    }

    const hour = new Date().getHours();
    if (hour >= 12 && produced === 0) {
      suggestions.push({
        id: "fabrika-mudur-no-production",
        message: "Bugün henüz üretim girişi yapılmamış. İstasyonları kontrol edin.",
        actionType: "redirect",
        actionLabel: "Üretim Girişi",
        payload: { route: "/fabrika/dashboard" },
        priority: "critical",
        icon: "Factory",
      });
    }

    const pendingOrders = await db
      .select({ cnt: count() })
      .from(branchOrders)
      .where(eq(branchOrders.status, "pending"));

    const pendingCount = pendingOrders[0]?.cnt || 0;
    if (pendingCount > 0) {
      suggestions.push({
        id: "fabrika-mudur-pending-orders",
        message: `${pendingCount} şube siparişi onay bekliyor.`,
        actionType: "redirect",
        actionLabel: "Siparişleri Gör",
        payload: { route: "/fabrika/dashboard", tab: "orders" },
        priority: "high",
        icon: "ShoppingCart",
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

    const rejectedBatches = await db
      .select({ cnt: count() })
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.status, "rejected"),
          gte(productionBatches.productionDate, thirtyDaysStr)
        )
      );

    const totalBatches = await db
      .select({ cnt: count() })
      .from(productionBatches)
      .where(gte(productionBatches.productionDate, thirtyDaysStr));

    const rejected = rejectedBatches[0]?.cnt || 0;
    const batchTotal = totalBatches[0]?.cnt || 1;
    const batchWasteRate = (rejected / batchTotal) * 100;

    if (batchWasteRate > 5 && batchTotal > 0) {
      suggestions.push({
        id: "fabrika-mudur-batch-reject",
        message: `Son 30 günde parti red oranı %${batchWasteRate.toFixed(1)}. Kalite süreçleri incelenmeli.`,
        actionType: "redirect",
        actionLabel: "Kalite Raporları",
        payload: { route: "/fabrika/dashboard", tab: "quality" },
        priority: "critical",
        icon: "XCircle",
      });
    }
  } catch (error) {
    console.error("getFabrikaMudurSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getSatinalmaSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const lowStockItems = await db
      .select({ cnt: count() })
      .from(branchInventory)
      .where(
        sql`CAST(${branchInventory.currentStock} AS numeric) < CAST(${branchInventory.minimumStock} AS numeric)`
      );

    const criticalStock = lowStockItems[0]?.cnt || 0;
    if (criticalStock > 0) {
      suggestions.push({
        id: "satinalma-critical-stock",
        message: `${criticalStock} ürün minimum stok seviyesinin altında.`,
        actionType: "redirect",
        actionLabel: "Stok Yönetimi",
        payload: { route: "/satinalma/stok-yonetimi" },
        priority: "critical",
        icon: "PackageX",
      });
    }

    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const approachingDeliveries = await db
      .select({ cnt: count() })
      .from(purchaseOrders)
      .where(
        and(
          sql`${purchaseOrders.status} IN ('onaylandi', 'siparis_verildi')`,
          lte(purchaseOrders.expectedDeliveryDate, threeDaysLater),
          gte(purchaseOrders.expectedDeliveryDate, new Date()),
          isNull(purchaseOrders.actualDeliveryDate)
        )
      );

    const deliveryCount = approachingDeliveries[0]?.cnt || 0;
    if (deliveryCount > 0) {
      suggestions.push({
        id: "satinalma-approaching-delivery",
        message: `${deliveryCount} sipariste teslimat 3 gun icinde bekleniyor.`,
        actionType: "redirect",
        actionLabel: "Siparis Takibi",
        payload: { route: "/satinalma/siparis-yonetimi" },
        priority: "medium",
        icon: "Truck",
      });
    }

    const pendingPOs = await db
      .select({ cnt: count() })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, "taslak"));

    const pendingCount = pendingPOs[0]?.cnt || 0;
    if (pendingCount > 0) {
      suggestions.push({
        id: "satinalma-pending-orders",
        message: `${pendingCount} satın alma siparişi taslak durumunda.`,
        actionType: "redirect",
        actionLabel: "Siparişleri Gör",
        payload: { route: "/satinalma/siparis-yonetimi" },
        priority: "high",
        icon: "FileEdit",
      });
    }
  } catch (error) {
    console.error("getSatinalmaSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

export async function getMarketingSuggestions(): Promise<DobodySuggestion[]> {
  const suggestions: DobodySuggestion[] = [];

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const activeCampaigns = await db
      .select({ cnt: count() })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, "active"),
          gte(campaigns.endDate, todayStr)
        )
      );

    const activeCount = activeCampaigns[0]?.cnt || 0;
    if (activeCount > 0) {
      suggestions.push({
        id: "marketing-active-campaigns",
        message: `${activeCount} aktif kampanya devam ediyor.`,
        actionType: "redirect",
        actionLabel: "Kampanyaları Gör",
        payload: { route: "/crm/kampanyalar" },
        priority: "low",
        icon: "Megaphone",
      });
    }

    const endingSoonCampaigns = await db
      .select({ id: campaigns.id, title: campaigns.title })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, "active"),
          lte(campaigns.endDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          gte(campaigns.endDate, todayStr)
        )
      )
      .limit(3);

    if (endingSoonCampaigns.length > 0) {
      const names = endingSoonCampaigns.map(c => c.title).slice(0, 2).join(", ");
      suggestions.push({
        id: "marketing-ending-campaigns",
        message: `${endingSoonCampaigns.length} kampanya 3 gun icinde sona eriyor: ${names}`,
        actionType: "redirect",
        actionLabel: "Kampanya Detayi",
        payload: { route: "/crm/kampanyalar" },
        priority: "medium",
        icon: "CalendarClock",
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const branchScores = await db
      .select({
        branchId: customerFeedback.branchId,
        avgRating: avg(customerFeedback.rating),
        branchName: branches.name,
      })
      .from(customerFeedback)
      .innerJoin(branches, eq(customerFeedback.branchId, branches.id))
      .where(gte(customerFeedback.feedbackDate, sevenDaysAgo))
      .groupBy(customerFeedback.branchId, branches.name)
      .having(sql`AVG(${customerFeedback.rating}) < 3.0`)
      .limit(5);

    if (branchScores.length > 0) {
      const branchNames = branchScores.map(b => b.branchName).slice(0, 3).join(", ");
      suggestions.push({
        id: "marketing-declining-scores",
        message: `${branchScores.length} şubede müşteri memnuniyeti düşük: ${branchNames}`,
        actionType: "redirect",
        actionLabel: "Analizleri Gör",
        payload: { route: "/crm/analizler" },
        priority: "high",
        icon: "TrendingDown",
      });
    }

    const overallRating = await db
      .select({ avgRating: avg(customerFeedback.rating) })
      .from(customerFeedback)
      .where(gte(customerFeedback.feedbackDate, sevenDaysAgo));

    const avgRating = overallRating[0]?.avgRating ? parseFloat(String(overallRating[0].avgRating)) : null;
    if (avgRating !== null) {
      if (avgRating < 3.5) {
        suggestions.push({
          id: "marketing-overall-satisfaction",
          message: `Genel müşteri memnuniyet puanı ${avgRating.toFixed(1)} - iyileştirme gerekiyor.`,
          actionType: "redirect",
          actionLabel: "Geri Bildirimler",
          payload: { route: "/misafir-memnuniyeti" },
          priority: "critical",
          icon: "Star",
        });
      }
    }
  } catch (error) {
    console.error("getMarketingSuggestions error:", error);
  }

  return suggestions.slice(0, MAX_ROLE_SUGGESTIONS);
}

const OPERATIONAL_DETAIL_PATTERNS = [
  /^branch-inactive-\d+$/,
  /^coach-branch-inactive-\d+$/,
  /^coach-compliance-branch-\d+$/,
  /^stock-low-branch-\d+$/,
  /^feedback-low-\d+$/,
  /^training-overdue-branch-\d+$/,
  /^score-dropping-/,
  /^gate-ready-/,
];

function isOperationalDetail(suggestion: DobodySuggestion): boolean {
  return OPERATIONAL_DETAIL_PATTERNS.some((p) => p.test(suggestion.id));
}

export function filterSuggestionsForRole(
  suggestions: DobodySuggestion[],
  role: string
): DobodySuggestion[] {
  if (role === "ceo") {
    return suggestions.filter(
      (s) => (s.priority === "critical" || s.priority === "high") && !isOperationalDetail(s)
    );
  }

  if (role === "cgo") {
    return suggestions.filter((s) => !isOperationalDetail(s));
  }

  return suggestions;
}
