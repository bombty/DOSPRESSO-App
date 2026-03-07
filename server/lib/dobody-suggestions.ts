import { db } from "../db";
import { sql, eq, and, lt, lte, gte, desc, count, avg } from "drizzle-orm";
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
        message: `"${badge.titleTr}" rozetine %${badge.progress} ulastin! Biraz daha caba ile kazanabilirsin.`,
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
        message: "Tamamlanmamis egitim modulun var. Hemen baslayarak geride kalma!",
        actionType: "redirect",
        actionLabel: "Egitime Git",
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
        message: "Bugun tamamlanmamis checklist'in var. Unuttuysan hemen tamamla!",
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
    const pendingStaff = await db
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

    if (pendingStaff.length > 0) {
      const names = pendingStaff.map(s => s.firstName || "Personel").slice(0, 3).join(", ");
      suggestions.push({
        id: `checklist-pending-branch-${branchId}`,
        message: `${pendingStaff.length} personelin bugunki checklist'i tamamlanmadi: ${names}`,
        actionType: "send_notification",
        actionLabel: "Hatirlatma Gonder",
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
        message: `${lowStockItems.length} urun minimum stok seviyesinin altinda: ${itemNames}`,
        actionType: "redirect",
        actionLabel: "Stok Yonetimi",
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
        message: `Son 7 gundeki musteri puani ortalamasi ${avgRating.toFixed(1)}. Dikkat gerektiren bir durum var.`,
        actionType: "redirect",
        actionLabel: "Geri Bildirimleri Gor",
        payload: { route: "/crm/geri-bildirimler" },
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
        message: `${overdueTrainings.length} personelin egitimi 3+ gun gecikti.`,
        actionType: "send_notification",
        actionLabel: "Hatirlatma Gonder",
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

    for (const branch of activeBranches) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      if (!activeSet.has(branch.id)) {
        suggestions.push({
          id: `branch-inactive-${branch.id}`,
          message: `${branch.name} son 2 gundur checklist aktivitesi yok. Iletisime gecin.`,
          actionType: "send_notification",
          actionLabel: "Bildirim Gonder",
          targetUserId: undefined,
          payload: { branchId: branch.id, type: "branch_inactive_alert" },
          priority: "high",
          icon: "AlertTriangle",
        });
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
        message: `${br.branchName} musteri puani dusuk (${ratingStr}). Inceleme yapilmali.`,
        actionType: "redirect",
        actionLabel: "Subeler",
        payload: { route: "/subeler", branchId: br.branchId },
        priority: "critical",
        icon: "TrendingDown",
      });
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
        message: `${staff.firstName} ${staff.lastName} (${staff.branchName || "Sube"}) skoru dusuk: ${(staff.compositeScore || 0).toFixed(0)}. ${staff.dangerZoneMonths} aydir tehlike bolgesinde.`,
        actionType: "redirect",
        actionLabel: "Profili Gor",
        targetUserId: staff.usrId,
        payload: { route: `/personel/${staff.usrId}` },
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
        message: `${ready.firstName} ${ready.lastName} terfi icin hazir (${ready.levelTitle}). Sinav sureci baslatilabilir.`,
        actionType: "redirect",
        actionLabel: "Degerlendirmeye Git",
        targetUserId: ready.usrId,
        payload: { route: `/personel/${ready.usrId}`, action: "promote" },
        priority: "medium",
        icon: "ArrowUpCircle",
      });
    }
  } catch (error) {
    console.error("getCoachSuggestions error:", error);
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
        message: `${pendingOrders.length} sube siparisi onay bekliyor.`,
        actionType: "redirect",
        actionLabel: "Siparisleri Gor",
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
        message: `Son 30 gunde fire orani %${wasteRate.toFixed(1)}. Kalite kontrolu gozden gecirin.`,
        actionType: "redirect",
        actionLabel: "Kalite Raporlari",
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
