import { db } from "../db";
import { customerFeedback, users } from "@shared/schema";
import { eq, and, gte, isNotNull, sql } from "drizzle-orm";

export const FEEDBACK_RESPONSIBILITY_MATRIX = {
  temizlik: {
    dbColumn: 'cleanliness_rating' as const,
    affectsRoles: ['supervisor', 'supervisor_buddy'],
    scoreImpact: 'direct' as const,
    requiresName: false,
    escalationDays: 15,
  },
  hizmet_guler_yuzluluk: {
    dbColumn: 'staff_rating' as const,
    affectsRoles: ['named_staff'],
    scoreImpact: 'individual' as const,
    requiresName: true,
    minRatingsForImpact: 3,
  },
  urun_kalitesi: {
    dbColumn: 'product_rating' as const,
    affectsRoles: ['branch_general'],
    scoreImpact: 'light' as const,
    requiresName: false,
    notifyFabrika: true,
  },
  hiz_servis: {
    dbColumn: 'service_rating' as const,
    affectsRoles: ['shift_staff'],
    scoreImpact: 'shift_based' as const,
    requiresName: false,
  },
  mekan_ambiyans: {
    dbColumn: 'overall_rating' as const,
    affectsRoles: ['mudur', 'supervisor'],
    scoreImpact: 'direct' as const,
    requiresName: false,
  },
};

interface FeedbackScoreImpact {
  cleanlinessImpact: number;
  staffImpact: number;
  productImpact: number;
  overallImpact: number;
}

function ratingToImpact(avg: number | null, thresholds: { bonus: number; neutral: number; mild: number; harsh: number }): number {
  if (avg === null || avg === 0) return 0;
  if (avg >= 4.0) return thresholds.bonus;
  if (avg >= 3.5) return thresholds.neutral;
  if (avg >= 3.0) return thresholds.mild;
  return thresholds.harsh;
}

export async function calculateBranchFeedbackImpact(branchId: number, rangeDays: number = 30): Promise<{
  cleanlinessAvg: number | null;
  serviceAvg: number | null;
  productAvg: number | null;
  overallAvg: number | null;
  staffAvg: number | null;
  totalCount: number;
  insufficientData: boolean;
}> {
  const from = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({
      cleanlinessAvg: sql<number>`AVG(${customerFeedback.cleanlinessRating})`,
      serviceAvg: sql<number>`AVG(${customerFeedback.serviceRating})`,
      productAvg: sql<number>`AVG(${customerFeedback.productRating})`,
      overallAvg: sql<number>`AVG(${customerFeedback.rating})`,
      staffAvg: sql<number>`AVG(${customerFeedback.staffRating})`,
      totalCount: sql<number>`COUNT(*)`,
      nonSuspiciousCount: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.isSuspicious} = false OR ${customerFeedback.isSuspicious} IS NULL)`,
    })
    .from(customerFeedback)
    .where(
      and(
        eq(customerFeedback.branchId, branchId),
        gte(customerFeedback.createdAt, from)
      )
    );

  const totalCount = Number(result?.totalCount ?? 0);

  return {
    cleanlinessAvg: result?.cleanlinessAvg ? Number(result.cleanlinessAvg) : null,
    serviceAvg: result?.serviceAvg ? Number(result.serviceAvg) : null,
    productAvg: result?.productAvg ? Number(result.productAvg) : null,
    overallAvg: result?.overallAvg ? Number(result.overallAvg) : null,
    staffAvg: result?.staffAvg ? Number(result.staffAvg) : null,
    totalCount,
    insufficientData: totalCount < 5,
  };
}

export async function calculateStaffFeedbackImpact(staffId: string, rangeDays: number = 30): Promise<{
  staffAvg: number | null;
  ratingCount: number;
  impact: number;
}> {
  const from = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({
      staffAvg: sql<number>`AVG(${customerFeedback.staffRating})`,
      ratingCount: sql<number>`COUNT(*)`,
    })
    .from(customerFeedback)
    .where(
      and(
        eq(customerFeedback.staffId, staffId),
        gte(customerFeedback.createdAt, from),
        isNotNull(customerFeedback.staffRating)
      )
    );

  const ratingCount = Number(result?.ratingCount ?? 0);
  const staffAvg = result?.staffAvg ? Number(result.staffAvg) : null;

  let impact = 0;
  if (ratingCount >= 3 && staffAvg !== null) {
    impact = ratingToImpact(staffAvg, { bonus: 10, neutral: 0, mild: -5, harsh: -8 });
  }

  return { staffAvg, ratingCount, impact };
}

export async function calculateFeedbackScoreForUser(userId: string, branchId: number | null, role: string): Promise<number> {
  if (!branchId) return 0;

  const branchData = await calculateBranchFeedbackImpact(branchId);
  if (branchData.insufficientData) return 0;

  let impact = 0;

  if (role === 'supervisor' || role === 'supervisor_buddy') {
    impact += ratingToImpact(branchData.cleanlinessAvg, { bonus: 10, neutral: 0, mild: -5, harsh: -10 });
    impact += ratingToImpact(branchData.overallAvg, { bonus: 5, neutral: 0, mild: -3, harsh: -5 });
  }

  if (role === 'mudur') {
    impact += ratingToImpact(branchData.overallAvg, { bonus: 8, neutral: 0, mild: -3, harsh: -8 });
  }

  const staffData = await calculateStaffFeedbackImpact(userId);
  impact += staffData.impact;

  impact += ratingToImpact(branchData.productAvg, { bonus: 3, neutral: 0, mild: -1, harsh: -3 });

  return Math.max(-15, Math.min(15, impact));
}
