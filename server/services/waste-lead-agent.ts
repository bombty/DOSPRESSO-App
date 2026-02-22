import { db } from "../db";
import { wasteEvents, wasteCategories, wasteReasons, wasteLots } from "@shared/schema";
import { sql, eq, gte, lte, and, count, sum, desc, asc } from "drizzle-orm";

export interface WasteSignal {
  id: string;
  severity: "critical" | "high" | "medium" | "info";
  type: string;
  title: string;
  description: string;
  data?: Record<string, any>;
  suggestedAction: string;
  targetRole: string[];
  createdAt: string;
}

export async function generateWasteSignals(
  fromDate?: Date,
  branchId?: number
): Promise<WasteSignal[]> {
  const signals: WasteSignal[] = [];
  const now = new Date();
  const from = fromDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseConditions = [gte(wasteEvents.eventTs, from)];
  if (branchId) {
    baseConditions.push(eq(wasteEvents.branchId, branchId));
  }

  const events = await db
    .select({
      id: wasteEvents.id,
      branchId: wasteEvents.branchId,
      categoryId: wasteEvents.categoryId,
      reasonId: wasteEvents.reasonId,
      quantity: wasteEvents.quantity,
      unit: wasteEvents.unit,
      estimatedCost: wasteEvents.estimatedCost,
      responsibilityScope: wasteEvents.responsibilityScope,
      status: wasteEvents.status,
      lotId: wasteEvents.lotId,
      productGroup: wasteEvents.productGroup,
      eventTs: wasteEvents.eventTs,
      categoryName: wasteCategories.nameTr,
      reasonName: wasteReasons.nameTr,
    })
    .from(wasteEvents)
    .leftJoin(wasteCategories, eq(wasteEvents.categoryId, wasteCategories.id))
    .leftJoin(wasteReasons, eq(wasteEvents.reasonId, wasteReasons.id))
    .where(and(...baseConditions))
    .orderBy(desc(wasteEvents.eventTs));

  const openEvents = events.filter(e => e.status === "open");
  if (openEvents.length > 20) {
    signals.push({
      id: `high-open-volume-${now.getTime()}`,
      severity: "critical",
      type: "volume_alert",
      title: "Yüksek Açık Olay Sayısı",
      description: `${openEvents.length} açık waste olayı bulunuyor. Hızlıca incelenmeli.`,
      data: { count: openEvents.length },
      suggestedAction: "Coach ekibini olayları incelemeleri için bilgilendirin.",
      targetRole: ["coach", "admin", "ceo", "cgo"],
      createdAt: now.toISOString(),
    });
  }

  const coldChainEvents = events.filter(e =>
    e.responsibilityScope === "logistics_cold_chain"
  );
  if (coldChainEvents.length >= 3) {
    const branchIds = Array.from(new Set(coldChainEvents.map(e => e.branchId)));
    signals.push({
      id: `cold-chain-breach-${now.getTime()}`,
      severity: "critical",
      type: "cold_chain_alert",
      title: "Soğuk Zincir Kırılması Tespiti",
      description: `${coldChainEvents.length} soğuk zincir kırılması, ${branchIds.length} şubede.`,
      data: { count: coldChainEvents.length, branches: branchIds.length },
      suggestedAction: "Lojistik ve QC birimlerini uyarın, soğuk zincir prosedürlerini gözden geçirin.",
      targetRole: ["kalite_kontrol", "gida_muhendisi", "coach", "admin", "ceo"],
      createdAt: now.toISOString(),
    });
  }

  const lotMap = new Map<string, { count: number; branches: Set<number> }>();
  events.forEach(e => {
    if (e.lotId) {
      const entry = lotMap.get(e.lotId) || { count: 0, branches: new Set() };
      entry.count++;
      if (e.branchId) entry.branches.add(e.branchId);
      lotMap.set(e.lotId, entry);
    }
  });
  const lotEntries = Array.from(lotMap.entries());
  for (const [lotId, data] of lotEntries) {
    if (data.branches.size >= 2) {
      signals.push({
        id: `lot-cluster-${lotId}-${now.getTime()}`,
        severity: "high",
        type: "lot_cluster",
        title: `Lot Kümesi: ${lotId}`,
        description: `Lot ${lotId}: ${data.count} olay, ${data.branches.size} farklı şubede tespit edildi. Ortak kaynak sorunu olabilir.`,
        data: { lotId, eventCount: data.count, branchCount: data.branches.size },
        suggestedAction: "QC ekibini bilgilendirin. Lot numarasını fabrika ile doğrulayın ve tedarikçi partisi kontrol edin.",
        targetRole: ["kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "admin"],
        createdAt: now.toISOString(),
      });
    }
  }

  const reasonCount = new Map<string, { name: string; count: number }>();
  events.forEach(e => {
    if (e.reasonId) {
      const key = String(e.reasonId);
      const entry = reasonCount.get(key) || { name: e.reasonName || "", count: 0 };
      entry.count++;
      reasonCount.set(key, entry);
    }
  });
  const sortedReasons = Array.from(reasonCount.entries()).sort((a, b) => b[1].count - a[1].count);
  if (sortedReasons.length > 0 && sortedReasons[0][1].count >= 5) {
    const top = sortedReasons[0][1];
    signals.push({
      id: `repeat-reason-${sortedReasons[0][0]}-${now.getTime()}`,
      severity: "high",
      type: "repeat_reason",
      title: `Tekrarlayan Neden: ${top.name}`,
      description: `"${top.name}" nedeni hafta içinde ${top.count} kez kaydedildi. Sistematik aksiyon gerekiyor.`,
      data: { reasonName: top.name, count: top.count },
      suggestedAction: "Bu neden için kök neden analizi yapın ve düzeltici aksiyon planı oluşturun.",
      targetRole: ["coach", "trainer", "admin"],
      createdAt: now.toISOString(),
    });
  }

  const prepErrors = events.filter(e => e.responsibilityScope === "prep_error");
  if (prepErrors.length >= 3) {
    const productGroups = new Map<string, number>();
    prepErrors.forEach(e => {
      const key = e.productGroup || e.reasonName || "Bilinmiyor";
      productGroups.set(key, (productGroups.get(key) || 0) + 1);
    });
    const topProduct = Array.from(productGroups.entries()).sort((a, b) => b[1] - a[1])[0];
    signals.push({
      id: `prep-error-spike-${now.getTime()}`,
      severity: "medium",
      type: "prep_error_spike",
      title: "Hazırlık Hatası Artışı",
      description: `${prepErrors.length} hazırlık hatası tespit edildi. En çok sorun: ${topProduct?.[0]} (${topProduct?.[1]} olay).`,
      data: { total: prepErrors.length, topProduct: topProduct?.[0], topCount: topProduct?.[1] },
      suggestedAction: "Trainer ekibine ilgili ürün için eğitim programı atayın.",
      targetRole: ["trainer", "coach", "admin"],
      createdAt: now.toISOString(),
    });
  }

  const branchCount = new Map<number, number>();
  events.forEach(e => {
    if (e.branchId) {
      branchCount.set(e.branchId, (branchCount.get(e.branchId) || 0) + 1);
    }
  });
  const sortedBranches = Array.from(branchCount.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedBranches.length > 0 && sortedBranches[0][1] >= 8) {
    signals.push({
      id: `branch-outlier-${sortedBranches[0][0]}-${now.getTime()}`,
      severity: "high",
      type: "branch_outlier",
      title: "Şube Aykırı Değer",
      description: `Şube #${sortedBranches[0][0]}: ${sortedBranches[0][1]} olay ile haftalık ortalamanın üzerinde.`,
      data: { branchId: sortedBranches[0][0], count: sortedBranches[0][1] },
      suggestedAction: "Coach ile birlikte şubeyi ziyaret edin ve operasyonel denetim planlayın.",
      targetRole: ["coach", "admin", "ceo", "cgo"],
      createdAt: now.toISOString(),
    });
  }

  const scopeCount = new Map<string, number>();
  events.forEach(e => {
    if (e.responsibilityScope) {
      scopeCount.set(e.responsibilityScope, (scopeCount.get(e.responsibilityScope) || 0) + 1);
    }
  });
  const demandIssues = (scopeCount.get("demand") || 0) + (scopeCount.get("merchandising") || 0);
  if (demandIssues >= 3) {
    signals.push({
      id: `demand-scope-${now.getTime()}`,
      severity: "medium",
      type: "demand_scope",
      title: "Talep/Görünürlük Kayıpları",
      description: `${demandIssues} talep/mağazacılık kaynaklı kayıp. Pazarlama aksiyonu gerekebilir.`,
      data: { count: demandIssues },
      suggestedAction: "Marketing ekibine bilgilendirme yapın, talep tahmin modelini gözden geçirin.",
      targetRole: ["marketing", "admin", "ceo", "cgo"],
      createdAt: now.toISOString(),
    });
  }

  const productionDefects = events.filter(e =>
    e.responsibilityScope === "production_defect"
  );
  if (productionDefects.length >= 2) {
    signals.push({
      id: `production-defect-${now.getTime()}`,
      severity: "high",
      type: "production_defect",
      title: "Üretim Hatası Tespiti",
      description: `${productionDefects.length} üretim hatası kaydedildi. Fabrika prosedürleri gözden geçirilmeli.`,
      data: { count: productionDefects.length },
      suggestedAction: "Fabrika müdürünü bilgilendirin, üretim hattı denetimi planlayın.",
      targetRole: ["fabrika_mudur", "kalite_kontrol", "gida_muhendisi", "admin"],
      createdAt: now.toISOString(),
    });
  }

  signals.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return signals;
}
