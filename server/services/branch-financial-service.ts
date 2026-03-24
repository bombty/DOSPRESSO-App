import { db } from "../db";
import { branchFinancialSummary, branches, users, payrollRecords, branchOrders } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function calculateBranchFinancials(branchId: number, month: number, year: number, calculatedBy?: string) {
  const payrollResult = await db.select({
    total: sql<number>`coalesce(sum(total_net_payable), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payrollRecords)
    .where(and(
      eq(payrollRecords.branchId, branchId),
      eq(payrollRecords.periodMonth, month),
      eq(payrollRecords.periodYear, year),
    ));

  const costPayroll = Number(payrollResult[0]?.total || 0);
  const payrollStaff = Number(payrollResult[0]?.cnt || 0);

  const orderResult = await db.select({
    total: sql<number>`coalesce(sum(total_amount), 0)`,
  })
    .from(branchOrders)
    .where(and(
      eq(branchOrders.branchId, branchId),
      sql`extract(month from created_at) = ${month}`,
      sql`extract(year from created_at) = ${year}`,
    ));

  const costSupplies = Number(orderResult[0]?.total || 0);

  const staffResult = await db.select({ cnt: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.branchId, branchId), eq(users.isActive, true)));

  const staffCount = Number(staffResult[0]?.cnt || 0);

  const existing = await db.select()
    .from(branchFinancialSummary)
    .where(and(
      eq(branchFinancialSummary.branchId, branchId),
      eq(branchFinancialSummary.periodMonth, month),
      eq(branchFinancialSummary.periodYear, year),
    ))
    .limit(1);

  const costRent = Number(existing[0]?.costRent || 0);
  const costUtilities = Number(existing[0]?.costUtilities || 0);
  const costOther = Number(existing[0]?.costOther || 0);
  const costMaintenance = Number(existing[0]?.costMaintenance || 0);
  const revenueTotal = Number(existing[0]?.revenueTotal || 0);
  const revenueSource = existing[0]?.revenueSource || "manual";

  const totalCost = costPayroll + costSupplies + costRent + costUtilities + costOther + costMaintenance;
  const netProfit = revenueTotal - totalCost;
  const profitMargin = revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0;
  const costPerEmployee = staffCount > 0 ? costPayroll / staffCount : 0;

  const values = {
    branchId,
    periodMonth: month,
    periodYear: year,
    revenueTotal: revenueTotal.toFixed(2),
    revenueSource,
    costPayroll: costPayroll.toFixed(2),
    staffCount,
    costPerEmployee: costPerEmployee.toFixed(2),
    costSupplies: costSupplies.toFixed(2),
    costRent: costRent.toFixed(2),
    costUtilities: costUtilities.toFixed(2),
    costOther: costOther.toFixed(2),
    costMaintenance: costMaintenance.toFixed(2),
    totalCost: totalCost.toFixed(2),
    netProfit: netProfit.toFixed(2),
    profitMargin: profitMargin.toFixed(2),
    calculatedAt: new Date(),
    calculatedBy: calculatedBy || null,
  };

  if (existing.length > 0) {
    await db.update(branchFinancialSummary)
      .set(values)
      .where(eq(branchFinancialSummary.id, existing[0].id));
    return { ...existing[0], ...values };
  } else {
    const [created] = await db.insert(branchFinancialSummary).values(values).returning();
    return created;
  }
}

export async function calculateAllBranchFinancials(month: number, year: number, calculatedBy?: string) {
  const activeBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.isActive, true));

  const results = [];
  for (const branch of activeBranches) {
    try {
      const result = await calculateBranchFinancials(branch.id, month, year, calculatedBy);
      results.push({ branchId: branch.id, branchName: branch.name, ...result });
    } catch (err: unknown) {
      console.error(`[Financial] Branch ${branch.id} hesaplama hatası:`, err instanceof Error ? err.message : err);
    }
  }
  return results;
}

export async function getAllBranchFinancials(month: number, year: number) {
  return db.select({
    id: branchFinancialSummary.id,
    branchId: branchFinancialSummary.branchId,
    branchName: branches.name,
    periodMonth: branchFinancialSummary.periodMonth,
    periodYear: branchFinancialSummary.periodYear,
    revenueTotal: branchFinancialSummary.revenueTotal,
    revenueSource: branchFinancialSummary.revenueSource,
    costPayroll: branchFinancialSummary.costPayroll,
    staffCount: branchFinancialSummary.staffCount,
    costPerEmployee: branchFinancialSummary.costPerEmployee,
    costSupplies: branchFinancialSummary.costSupplies,
    costRent: branchFinancialSummary.costRent,
    costUtilities: branchFinancialSummary.costUtilities,
    costOther: branchFinancialSummary.costOther,
    costMaintenance: branchFinancialSummary.costMaintenance,
    totalCost: branchFinancialSummary.totalCost,
    netProfit: branchFinancialSummary.netProfit,
    profitMargin: branchFinancialSummary.profitMargin,
    calculatedAt: branchFinancialSummary.calculatedAt,
    notes: branchFinancialSummary.notes,
  })
    .from(branchFinancialSummary)
    .innerJoin(branches, eq(branchFinancialSummary.branchId, branches.id))
    .where(and(
      eq(branchFinancialSummary.periodMonth, month),
      eq(branchFinancialSummary.periodYear, year),
    ));
}

export async function getBranchFinancialHistory(branchId: number, months: number = 6) {
  const now = new Date();
  const results = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const [row] = await db.select()
      .from(branchFinancialSummary)
      .where(and(
        eq(branchFinancialSummary.branchId, branchId),
        eq(branchFinancialSummary.periodMonth, m),
        eq(branchFinancialSummary.periodYear, y),
      ))
      .limit(1);
    if (row) results.push(row);
  }
  return results;
}
