import { Express } from "express";
import { db } from "./db";
import { 
  financialRecords, branches, users, monthlyPayrolls,
  rawMaterials, factoryFixedCosts, productCostCalculations,
  factoryProductionBatches, profitMarginTemplates
} from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte, inArray } from "drizzle-orm";

export function registerFinancialRoutes(app: Express, isAuthenticated: any) {

  app.get("/api/financial/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const { year, month } = req.query;
      const targetYear = parseInt(year as string) || new Date().getFullYear();
      const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;

      const currentRecords = await db.select().from(financialRecords)
        .where(and(
          eq(financialRecords.year, targetYear),
          eq(financialRecords.month, targetMonth)
        ));

      const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
      const prevRecords = await db.select().from(financialRecords)
        .where(and(
          eq(financialRecords.year, prevYear),
          eq(financialRecords.month, prevMonth)
        ));

      const allBranches = await db.select().from(branches);
      const branchMap = Object.fromEntries(allBranches.map(b => [b.id, b.name]));

      const totalRevenue = currentRecords.filter(r => r.type === 'gelir').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const totalExpenses = currentRecords.filter(r => r.type === 'gider').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const netProfit = totalRevenue - totalExpenses;

      const prevRevenue = prevRecords.filter(r => r.type === 'gelir').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const prevExpenses = prevRecords.filter(r => r.type === 'gider').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const prevProfit = prevRevenue - prevExpenses;

      const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
      const expenseTrend = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100) : 0;
      const profitTrend = prevProfit !== 0 ? ((netProfit - prevProfit) / Math.abs(prevProfit) * 100) : 0;

      const branchPnL: Record<number, { revenue: number; expenses: number }> = {};
      currentRecords.forEach(r => {
        if (!branchPnL[r.branchId]) branchPnL[r.branchId] = { revenue: 0, expenses: 0 };
        const amt = parseFloat(r.amount || '0');
        if (r.type === 'gelir') branchPnL[r.branchId].revenue += amt;
        else branchPnL[r.branchId].expenses += amt;
      });

      const branchBreakdown = Object.entries(branchPnL).map(([id, data]) => ({
        branchId: parseInt(id),
        branchName: branchMap[parseInt(id)] || `Şube ${id}`,
        revenue: data.revenue,
        expenses: data.expenses,
        netProfit: data.revenue - data.expenses,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue * 100) : 0,
      })).sort((a, b) => b.netProfit - a.netProfit);

      const expenseByCategory: Record<string, number> = {};
      currentRecords.filter(r => r.type === 'gider').forEach(r => {
        expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + parseFloat(r.amount || '0');
      });
      const categoryBreakdown = Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0,
      })).sort((a, b) => b.amount - a.amount);

      const revenueByCategory: Record<string, number> = {};
      currentRecords.filter(r => r.type === 'gelir').forEach(r => {
        revenueByCategory[r.category] = (revenueByCategory[r.category] || 0) + parseFloat(r.amount || '0');
      });
      const revenueCategoryBreakdown = Object.entries(revenueByCategory).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue * 100) : 0,
      })).sort((a, b) => b.amount - a.amount);

      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        let m = targetMonth - i;
        let y = targetYear;
        if (m <= 0) { m += 12; y -= 1; }
        const records = i === 0 ? currentRecords :
          await db.select().from(financialRecords).where(and(eq(financialRecords.year, y), eq(financialRecords.month, m)));
        const rev = records.filter(r => r.type === 'gelir').reduce((s, r) => s + parseFloat(r.amount || '0'), 0);
        const exp = records.filter(r => r.type === 'gider').reduce((s, r) => s + parseFloat(r.amount || '0'), 0);
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        monthlyTrend.push({ month: months[m-1], year: y, revenue: rev, expenses: exp, profit: rev - exp });
      }

      res.json({
        period: { year: targetYear, month: targetMonth },
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0,
          revenueTrend: Math.round(revenueTrend * 10) / 10,
          expenseTrend: Math.round(expenseTrend * 10) / 10,
          profitTrend: Math.round(profitTrend * 10) / 10,
        },
        branchBreakdown,
        categoryBreakdown,
        revenueCategoryBreakdown,
        monthlyTrend,
      });
    } catch (error: any) {
      console.error("Financial dashboard error:", error);
      res.status(500).json({ message: "Mali dashboard verisi alınamadı" });
    }
  });

  app.get("/api/financial/records", isAuthenticated, async (req: any, res) => {
    try {
      const { year, month, type, branchId, category } = req.query;
      let conditions: any[] = [];
      if (year) conditions.push(eq(financialRecords.year, parseInt(year as string)));
      if (month) conditions.push(eq(financialRecords.month, parseInt(month as string)));
      if (type) conditions.push(eq(financialRecords.type, type as string));
      if (branchId) conditions.push(eq(financialRecords.branchId, parseInt(branchId as string)));
      if (category) conditions.push(eq(financialRecords.category, category as string));

      const records = conditions.length > 0
        ? await db.select().from(financialRecords).where(and(...conditions)).orderBy(desc(financialRecords.recordDate))
        : await db.select().from(financialRecords).orderBy(desc(financialRecords.recordDate)).limit(500);

      const allBranches = await db.select().from(branches);
      const branchMap = Object.fromEntries(allBranches.map(b => [b.id, b.name]));

      const enriched = records.map(r => ({
        ...r,
        branchName: branchMap[r.branchId] || `Şube ${r.branchId}`,
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error("Financial records error:", error);
      res.status(500).json({ message: "Kayıtlar alınamadı" });
    }
  });

  app.post("/api/financial/records", isAuthenticated, async (req: any, res) => {
    try {
      const { branchId, recordDate, type, category, subCategory, description, amount, invoiceNo } = req.body;
      const date = new Date(recordDate);
      const record = await db.insert(financialRecords).values({
        branchId: parseInt(branchId),
        recordDate: date,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        type,
        category,
        subCategory: subCategory || null,
        description: description || null,
        amount: amount.toString(),
        invoiceNo: invoiceNo || null,
        status: 'onaylandi',
        createdBy: req.user?.id || null,
      }).returning();
      res.json(record[0]);
    } catch (error: any) {
      console.error("Financial record create error:", error);
      res.status(500).json({ message: "Kayıt oluşturulamadı" });
    }
  });

  app.get("/api/financial/waste-report", isAuthenticated, async (req: any, res) => {
    try {
      const batches = await db.select().from(factoryProductionBatches).orderBy(desc(factoryProductionBatches.createdAt));

      let totalWasteCost = 0;
      let totalBatches = batches.length;
      const productWaste: Record<string, { productName: string; wasteKg: number; wasteCost: number; batchCount: number }> = {};

      batches.forEach((b: any) => {
        const wasteKg = parseFloat(b.wasteWeightKg || '0');
        const wasteCost = parseFloat(b.wasteCostTl || '0');
        totalWasteCost += wasteCost;

        const productKey = `Ürün ${b.productId}`;
        if (!productWaste[productKey]) {
          productWaste[productKey] = { productName: productKey, wasteKg: 0, wasteCost: 0, batchCount: 0 };
        }
        productWaste[productKey].wasteKg += wasteKg;
        productWaste[productKey].wasteCost += wasteCost;
        productWaste[productKey].batchCount += 1;
      });

      const wasteByProduct = Object.values(productWaste)
        .sort((a, b) => b.wasteCost - a.wasteCost)
        .slice(0, 20);

      const wasteByMonth: Record<string, { month: string; wasteKg: number; wasteCost: number; batchCount: number }> = {};
      batches.forEach((b: any) => {
        const date = new Date(b.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        if (!wasteByMonth[key]) {
          wasteByMonth[key] = { month: `${months[date.getMonth()]} ${date.getFullYear()}`, wasteKg: 0, wasteCost: 0, batchCount: 0 };
        }
        wasteByMonth[key].wasteKg += parseFloat(b.wasteWeightKg || '0');
        wasteByMonth[key].wasteCost += parseFloat(b.wasteCostTl || '0');
        wasteByMonth[key].batchCount += 1;
      });

      res.json({
        summary: {
          totalBatches,
          totalWasteCost,
          averageWastePerBatch: totalBatches > 0 ? totalWasteCost / totalBatches : 0,
        },
        wasteByProduct,
        monthlyTrend: Object.values(wasteByMonth).sort((a, b) => a.month.localeCompare(b.month)),
      });
    } catch (error: any) {
      console.error("Waste report error:", error);
      res.json({ summary: { totalBatches: 0, totalWasteCost: 0, averageWastePerBatch: 0 }, wasteByProduct: [], monthlyTrend: [] });
    }
  });

  app.get("/api/financial/product-profitability", isAuthenticated, async (req: any, res) => {
    try {
      const calculations = await db.select().from(productCostCalculations).orderBy(desc(productCostCalculations.calculationDate));

      const latestByProduct: Record<number, any> = {};
      calculations.forEach(c => {
        if (!latestByProduct[c.productId]) latestByProduct[c.productId] = c;
      });

      const products = Object.values(latestByProduct).map((c: any) => ({
        productId: c.productId,
        productName: `Ürün ${c.productId}`,
        unitCost: parseFloat(c.totalUnitCost || '0'),
        sellingPrice: parseFloat(c.suggestedSellingPrice || '0'),
        profitPerUnit: parseFloat(c.profitPerUnit || '0'),
        profitMargin: parseFloat(c.profitMarginPercentage || '0'),
        rawMaterialCost: parseFloat(c.rawMaterialCost || '0'),
        packagingCost: parseFloat(c.packagingCost || '0'),
        laborCost: parseFloat(c.directLaborCost || '0'),
        overheadCost: parseFloat(c.overheadCost || '0'),
      }));

      const mostProfitable = [...products].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10);
      const leastProfitable = [...products].sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 10);

      const marginRanges = [
        { label: '< %10', count: 0, products: [] as string[] },
        { label: '%10-%20', count: 0, products: [] as string[] },
        { label: '%20-%30', count: 0, products: [] as string[] },
        { label: '%30-%50', count: 0, products: [] as string[] },
        { label: '> %50', count: 0, products: [] as string[] },
      ];
      products.forEach(p => {
        if (p.profitMargin < 10) { marginRanges[0].count++; marginRanges[0].products.push(p.productName); }
        else if (p.profitMargin < 20) { marginRanges[1].count++; marginRanges[1].products.push(p.productName); }
        else if (p.profitMargin < 30) { marginRanges[2].count++; marginRanges[2].products.push(p.productName); }
        else if (p.profitMargin < 50) { marginRanges[3].count++; marginRanges[3].products.push(p.productName); }
        else { marginRanges[4].count++; marginRanges[4].products.push(p.productName); }
      });

      const avgMargin = products.length > 0 ? products.reduce((s, p) => s + p.profitMargin, 0) / products.length : 0;

      res.json({
        totalProducts: products.length,
        averageMargin: Math.round(avgMargin * 10) / 10,
        mostProfitable,
        leastProfitable,
        allProducts: products.sort((a, b) => b.profitMargin - a.profitMargin),
        marginDistribution: marginRanges,
      });
    } catch (error: any) {
      console.error("Product profitability error:", error);
      res.json({ totalProducts: 0, averageMargin: 0, mostProfitable: [], leastProfitable: [], allProducts: [], marginDistribution: [] });
    }
  });

  app.get("/api/financial/inventory-cost", isAuthenticated, async (req: any, res) => {
    try {
      const materials = await db.select().from(rawMaterials);

      let totalStockValue = 0;
      const categoryStock: Record<string, { category: string; totalValue: number; itemCount: number; items: any[] }> = {};
      const lowStockItems: any[] = [];
      const highValueItems: any[] = [];

      materials.forEach((m: any) => {
        const unitPrice = parseFloat(m.currentUnitPrice || m.lastPurchasePrice || m.averagePrice || '0');
        const stockValue = unitPrice;
        totalStockValue += stockValue;

        const cat = m.category || 'Diğer';
        if (!categoryStock[cat]) {
          categoryStock[cat] = { category: cat, totalValue: 0, itemCount: 0, items: [] };
        }
        categoryStock[cat].totalValue += stockValue;
        categoryStock[cat].itemCount += 1;

        const item = {
          id: m.id,
          name: m.name,
          category: cat,
          unit: m.unit || 'kg',
          unitPrice,
          stockValue,
        };

        categoryStock[cat].items.push(item);
        highValueItems.push(item);
      });

      const categoryBreakdown = Object.values(categoryStock).map(c => ({
        ...c,
        percentage: totalStockValue > 0 ? (c.totalValue / totalStockValue * 100) : 0,
        items: undefined,
      })).sort((a, b) => b.totalValue - a.totalValue);

      res.json({
        summary: {
          totalItems: materials.length,
          totalStockValue,
          categoryCount: Object.keys(categoryStock).length,
          lowStockCount: lowStockItems.length,
        },
        categoryBreakdown,
        lowStockItems: lowStockItems.sort((a: any, b: any) => b.deficit - a.deficit).slice(0, 20),
        highValueItems: highValueItems.sort((a, b) => b.stockValue - a.stockValue).slice(0, 20),
      });
    } catch (error: any) {
      console.error("Inventory cost error:", error);
      res.json({ summary: { totalItems: 0, totalStockValue: 0, categoryCount: 0, lowStockCount: 0 }, categoryBreakdown: [], lowStockItems: [], highValueItems: [] });
    }
  });

  app.get("/api/financial/personnel-cost", isAuthenticated, async (req: any, res) => {
    try {
      const { year, month } = req.query;
      const targetYear = parseInt(year as string) || new Date().getFullYear();
      const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;

      const employees = await db.select().from(users).where(eq(users.isActive, true));
      const allBranches = await db.select().from(branches);
      const branchMap = Object.fromEntries(allBranches.map(b => [b.id, b.name]));

      const payrolls = await db.select().from(monthlyPayrolls)
        .where(and(
          eq(monthlyPayrolls.year, targetYear),
          eq(monthlyPayrolls.month, targetMonth)
        ));

      const branchCost: Record<number, { branchName: string; employeeCount: number; totalGross: number; totalNet: number; totalSgk: number; totalTax: number }> = {};

      if (payrolls.length > 0) {
        payrolls.forEach((p: any) => {
          const bId = p.branchId || 0;
          if (!branchCost[bId]) {
            branchCost[bId] = { branchName: branchMap[bId] || 'Genel', employeeCount: 0, totalGross: 0, totalNet: 0, totalSgk: 0, totalTax: 0 };
          }
          branchCost[bId].employeeCount += 1;
          branchCost[bId].totalGross += (p.grossSalary || 0) / 100;
          branchCost[bId].totalNet += (p.netSalary || 0) / 100;
          branchCost[bId].totalSgk += ((p.insuranceEmployee || 0) + (p.insuranceEmployer || 0)) / 100;
          branchCost[bId].totalTax += (p.taxAmount || 0) / 100;
        });
      } else {
        employees.forEach((e: any) => {
          const bId = e.branchId || 0;
          if (!branchCost[bId]) {
            branchCost[bId] = { branchName: branchMap[bId] || 'Genel', employeeCount: 0, totalGross: 0, totalNet: 0, totalSgk: 0, totalTax: 0 };
          }
          branchCost[bId].employeeCount += 1;
          const netSalary = (e.netSalary || 0) / 100;
          branchCost[bId].totalNet += netSalary;
          branchCost[bId].totalGross += netSalary * 1.42;
          branchCost[bId].totalSgk += netSalary * 0.22;
          branchCost[bId].totalTax += netSalary * 0.15;
        });
      }

      const branchBreakdown = Object.entries(branchCost).map(([id, data]) => ({
        branchId: parseInt(id),
        ...data,
        totalCost: data.totalGross + data.totalSgk,
      })).sort((a, b) => b.totalCost - a.totalCost);

      const totalEmployees = employees.length;
      const totalNet = branchBreakdown.reduce((s, b) => s + b.totalNet, 0);
      const totalGross = branchBreakdown.reduce((s, b) => s + b.totalGross, 0);
      const totalSgk = branchBreakdown.reduce((s, b) => s + b.totalSgk, 0);
      const totalTax = branchBreakdown.reduce((s, b) => s + b.totalTax, 0);
      const totalCost = totalGross + totalSgk;
      const avgSalary = totalEmployees > 0 ? totalNet / totalEmployees : 0;

      const roleCount: Record<string, number> = {};
      employees.forEach((e: any) => {
        roleCount[e.role || 'unknown'] = (roleCount[e.role || 'unknown'] || 0) + 1;
      });

      res.json({
        period: { year: targetYear, month: targetMonth },
        summary: {
          totalEmployees,
          totalGross,
          totalNet,
          totalSgk,
          totalTax,
          totalCost,
          avgSalary,
        },
        branchBreakdown,
        roleDistribution: Object.entries(roleCount).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count),
      });
    } catch (error: any) {
      console.error("Personnel cost error:", error);
      res.json({ period: {}, summary: { totalEmployees: 0, totalGross: 0, totalNet: 0, totalSgk: 0, totalTax: 0, totalCost: 0, avgSalary: 0 }, branchBreakdown: [], roleDistribution: [] });
    }
  });

  app.get("/api/financial/fixed-costs", isAuthenticated, async (req: any, res) => {
    try {
      const costs = await db.select().from(factoryFixedCosts).orderBy(desc(factoryFixedCosts.createdAt));

      const totalMonthly = costs.filter((c: any) => c.isActive !== false).reduce((s, c: any) => s + parseFloat(c.monthlyAmount || '0'), 0);

      const byCategory: Record<string, number> = {};
      costs.filter((c: any) => c.isActive !== false).forEach((c: any) => {
        const cat = c.category || 'Diğer';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(c.monthlyAmount || '0');
      });

      res.json({
        totalMonthly,
        totalAnnual: totalMonthly * 12,
        costs: costs.map((c: any) => ({
          ...c,
          amount: parseFloat(c.monthlyAmount || '0'),
        })),
        byCategory: Object.entries(byCategory).map(([category, amount]) => ({
          category,
          amount,
          percentage: totalMonthly > 0 ? (amount / totalMonthly * 100) : 0,
        })).sort((a, b) => b.amount - a.amount),
      });
    } catch (error: any) {
      console.error("Fixed costs error:", error);
      res.json({ totalMonthly: 0, totalAnnual: 0, costs: [], byCategory: [] });
    }
  });

  app.get("/api/financial/expense-categories", isAuthenticated, async (req: any, res) => {
    res.json({
      gelir: [
        { value: 'satis', label: 'Satış Geliri' },
        { value: 'franchise_royalty', label: 'Franchise Royalty' },
        { value: 'kira_geliri', label: 'Kira Geliri' },
        { value: 'diger_gelir', label: 'Diğer Gelir' },
      ],
      gider: [
        { value: 'personel', label: 'Personel Gideri' },
        { value: 'hammadde', label: 'Hammadde' },
        { value: 'kira', label: 'Kira' },
        { value: 'enerji', label: 'Enerji (Elektrik/Su/Doğalgaz)' },
        { value: 'pazarlama', label: 'Pazarlama & Reklam' },
        { value: 'ulasim', label: 'Ulaşım & Lojistik' },
        { value: 'bakim_onarim', label: 'Bakım & Onarım' },
        { value: 'sigorta', label: 'Sigorta' },
        { value: 'vergi', label: 'Vergi & Harçlar' },
        { value: 'ambalaj', label: 'Ambalaj' },
        { value: 'temizlik', label: 'Temizlik & Hijyen' },
        { value: 'teknoloji', label: 'Teknoloji & Yazılım' },
        { value: 'diger_gider', label: 'Diğer Gider' },
      ],
    });
  });
}
