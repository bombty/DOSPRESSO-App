// ═══════════════════════════════════════════════════════════════════
// Sprint 49 (Aslan 13 May 2026) — AI Alert Generator
// ═══════════════════════════════════════════════════════════════════
// Periyodik kontrol: günde 2 kez (08:00 ve 16:00 TR time)
// Tespit ettiği anomalileri ai_alerts tablosuna otomatik yazar.
//
// KONTROL EDİLEN DURUMLAR:
//   1. Eksik besin değeri (TGK uyumsuz hammadde) → gida_muhendisi, satinalma
//   2. Fiyat artışı %20+ → satinalma, ceo
//   3. Tedarikçi sertifika süresi 30 gün içinde → satinalma
//   4. Stok azalan hammadde → satinalma, fabrika_mudur
//   5. Pasif tedarikçi sayısı yüksek → satinalma, ceo
// ═══════════════════════════════════════════════════════════════════

import { db } from "../db";
import { eq, and, sql, isNull, lte, gte } from "drizzle-orm";
import { aiAlerts, rawMaterials, suppliers } from "@shared/schema";

interface AlertDefinition {
  alertType: string;
  category: string;
  severity: "info" | "warning" | "critical";
  targetRole: string | null; // null = tüm rollere
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  sourceTable?: string;
  sourceId?: number;
  metadata?: any;
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════
// 1. EKSİK BESİN DEĞERİ KONTROLÜ
// ═══════════════════════════════════════════════════════════════════
async function checkMissingNutrition(): Promise<AlertDefinition[]> {
  const alerts: AlertDefinition[] = [];

  try {
    // Aktif hammaddelerden besin değeri eksik olanları say
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(rawMaterials)
      .where(and(
        eq(rawMaterials.isActive, true),
        isNull(rawMaterials.energyKcal),
      ));

    const missingCount = result[0]?.count || 0;

    if (missingCount > 0) {
      // Toplam kalan kaç gün — TGK uyum süresi (varsayım: 60 gün)
      const severity = missingCount > 100 ? "critical" : missingCount > 50 ? "warning" : "info";

      // Gıda mühendisine
      alerts.push({
        alertType: "missing_nutrition",
        category: "tgk_uyum",
        severity,
        targetRole: "gida_muhendisi",
        title: `🔬 ${missingCount} hammadde için besin değeri eksik`,
        message: `Sistemde ${missingCount} aktif hammaddenin besin değerleri (kalori, protein, yağ vb.) eksik. TGK Ek-13 uyumu için bu kritik. AI besin hesap aracı ile hızlıca tamamlayabilirsin.`,
        actionUrl: "/hammaddeler",
        actionLabel: "Hammadde sayfasına git",
        sourceTable: "raw_materials",
        metadata: { missingCount, threshold: 100 },
      });

      // Satınalmaya bilgi (tedarikçilerden besin değer formu istemesi için)
      if (severity === "critical") {
        alerts.push({
          alertType: "missing_nutrition_supplier_action",
          category: "tedarikci",
          severity: "warning",
          targetRole: "satinalma",
          title: `📋 Tedarikçilerden besin değer formu istenmeli`,
          message: `${missingCount} hammaddenin besin değeri eksik. Tedarikçilerden TGK Ek-13 uyumlu form talep et. Mr. Dobody otomatik mesaj hazırlayabilir.`,
          actionUrl: "/satinalma/tedarikciler",
          actionLabel: "Tedarikçiler",
          sourceTable: "raw_materials",
          metadata: { missingCount },
        });
      }
    }
  } catch (err: any) {
    console.error("[AiAlert] checkMissingNutrition error:", err);
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// 2. FİYAT ARTIŞI ANOMALİSİ
// ═══════════════════════════════════════════════════════════════════
async function checkPriceAnomalies(): Promise<AlertDefinition[]> {
  const alerts: AlertDefinition[] = [];

  try {
    const anomalies = await db.select({
      id: rawMaterials.id,
      code: rawMaterials.code,
      name: rawMaterials.name,
      currentPrice: rawMaterials.currentUnitPrice,
      lastPrice: rawMaterials.lastPurchasePrice,
    })
      .from(rawMaterials)
      .where(and(
        eq(rawMaterials.isActive, true),
        sql`CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL) > 0`,
        sql`(CAST(${rawMaterials.currentUnitPrice} AS DECIMAL) - CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL)) / CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL) > 0.20`,
      ))
      .limit(10);

    for (const item of anomalies) {
      const current = parseFloat(item.currentPrice?.toString() || "0");
      const last = parseFloat(item.lastPrice?.toString() || "0");
      const increasePercent = last > 0 ? Math.round(((current - last) / last) * 100) : 0;

      const severity: "warning" | "critical" = increasePercent > 50 ? "critical" : "warning";

      alerts.push({
        alertType: "price_anomaly",
        category: "satinalma",
        severity,
        targetRole: "satinalma",
        title: `💰 ${item.name} fiyatı %${increasePercent} arttı`,
        message: `${item.code} - ${item.name}: ${last.toFixed(2)} TL → ${current.toFixed(2)} TL. Bu artış ortalamanın çok üstünde. Alternatif tedarikçi ile karşılaştır.`,
        actionUrl: `/hammaddeler/${item.id}`,
        actionLabel: "Hammaddeyi gör",
        sourceTable: "raw_materials",
        sourceId: item.id,
        metadata: { increasePercent, currentPrice: current, lastPrice: last },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün
      });
    }
  } catch (err: any) {
    console.error("[AiAlert] checkPriceAnomalies error:", err);
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// 3. TEDARİKÇİ SERTİFİKA SÜRESİ
// ═══════════════════════════════════════════════════════════════════
async function checkSupplierCertifications(): Promise<AlertDefinition[]> {
  const alerts: AlertDefinition[] = [];

  try {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const expiringSoon = await db.select({
      id: suppliers.id,
      code: suppliers.code,
      name: suppliers.name,
      expiry: suppliers.authorizationExpiryDate,
    })
      .from(suppliers)
      .where(and(
        eq(suppliers.status, "aktif"),
        gte(suppliers.authorizationExpiryDate, todayStr),
        lte(suppliers.authorizationExpiryDate, thirtyDaysLaterStr),
      ))
      .limit(10);

    for (const sup of expiringSoon) {
      if (!sup.expiry) continue;
      const expiryDate = new Date(sup.expiry);
      const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      alerts.push({
        alertType: "supplier_certification_expiring",
        category: "tedarikci",
        severity: daysLeft <= 7 ? "critical" : "warning",
        targetRole: "satinalma",
        title: `⚠️ ${sup.name} gıda yetki belgesi ${daysLeft} gün sonra bitiyor`,
        message: `${sup.code} - ${sup.name} için yetki belgesi son geçerlilik: ${expiryDate.toLocaleDateString("tr-TR")}. Yenileme talebini şimdi başlat.`,
        actionUrl: `/satinalma/tedarikciler/${sup.id}`,
        actionLabel: "Tedarikçiye git",
        sourceTable: "suppliers",
        sourceId: sup.id,
        metadata: { daysLeft, expiryDate: sup.expiry },
      });
    }
  } catch (err: any) {
    console.error("[AiAlert] checkSupplierCertifications error:", err);
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// 4. STOK AZALAN HAMMADDE (rezerv altında)
// ═══════════════════════════════════════════════════════════════════
async function checkLowInventory(): Promise<AlertDefinition[]> {
  const alerts: AlertDefinition[] = [];

  try {
    // Inventory tablosuyla join — kritik stok kontrolü
    const lowStock = await db.execute(sql`
      SELECT 
        rm.id,
        rm.code,
        rm.name,
        rm.unit,
        i.current_stock,
        i.minimum_stock
      FROM raw_materials rm
      LEFT JOIN inventory i ON rm.inventory_id = i.id
      WHERE rm.is_active = true
        AND i.current_stock IS NOT NULL
        AND i.minimum_stock IS NOT NULL
        AND CAST(i.current_stock AS DECIMAL) < CAST(i.minimum_stock AS DECIMAL)
      LIMIT 10
    `);

    const rows = (lowStock as any).rows || (lowStock as any) || [];

    for (const item of rows) {
      const currentStock = parseFloat(item.current_stock || "0");
      const minStock = parseFloat(item.minimum_stock || "0");
      const ratio = minStock > 0 ? Math.round((currentStock / minStock) * 100) : 0;

      const severity: "warning" | "critical" = ratio < 30 ? "critical" : "warning";

      alerts.push({
        alertType: "inventory_low",
        category: "stok",
        severity,
        targetRole: "satinalma",
        title: `📦 ${item.name} stok kritik seviyede`,
        message: `${item.code} - ${item.name}: ${currentStock} ${item.unit} kaldı (min: ${minStock} ${item.unit}). Sipariş ver.`,
        actionUrl: `/hammaddeler/${item.id}`,
        actionLabel: "Hammaddeyi gör",
        sourceTable: "raw_materials",
        sourceId: item.id,
        metadata: { currentStock, minStock, ratio },
      });
    }
  } catch (err: any) {
    console.error("[AiAlert] checkLowInventory error:", err);
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// 5. PASİF TEDARİKÇİ ÖZETİ
// ═══════════════════════════════════════════════════════════════════
async function checkSupplierHealth(): Promise<AlertDefinition[]> {
  const alerts: AlertDefinition[] = [];

  try {
    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(suppliers);
    const activeCount = await db.select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(eq(suppliers.status, "aktif"));

    const total = totalCount[0]?.count || 0;
    const active = activeCount[0]?.count || 0;
    const inactive = total - active;

    if (total > 0 && inactive > active * 0.3) {
      // %30+ pasif → uyarı
      alerts.push({
        alertType: "supplier_health_low",
        category: "tedarikci",
        severity: "warning",
        targetRole: "satinalma",
        title: `🏢 ${inactive}/${total} tedarikçi pasif durumda`,
        message: `Tedarikçi havuzunda ${active} aktif, ${inactive} pasif. Pasif olanları gözden geçir — yenilenebilir veya silinebilir.`,
        actionUrl: "/satinalma/tedarikciler",
        actionLabel: "Tedarikçiler",
        sourceTable: "suppliers",
        metadata: { total, active, inactive },
      });
    }
  } catch (err: any) {
    console.error("[AiAlert] checkSupplierHealth error:", err);
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: tüm kontrolleri çalıştır ve DB'ye yaz
// ═══════════════════════════════════════════════════════════════════
export async function runAlertChecks(): Promise<{
  totalChecked: number;
  newAlerts: number;
  duplicatesSkipped: number;
}> {
  console.log("[AiAlert] Periyodik kontroller başlıyor...");
  const startTime = Date.now();

  // Tüm check'leri paralel çalıştır
  const results = await Promise.all([
    checkMissingNutrition(),
    checkPriceAnomalies(),
    checkSupplierCertifications(),
    checkLowInventory(),
    checkSupplierHealth(),
  ]);

  const allAlerts: AlertDefinition[] = results.flat();
  let newAlertCount = 0;
  let duplicateCount = 0;

  // Her alert için: aynı tip + aynı sourceId zaten pending mı?
  for (const alert of allAlerts) {
    try {
      const existing = await db.select({ id: aiAlerts.id })
        .from(aiAlerts)
        .where(and(
          eq(aiAlerts.alertType, alert.alertType),
          eq(aiAlerts.status, "pending"),
          alert.sourceId
            ? eq(aiAlerts.sourceId, alert.sourceId)
            : sql`source_id IS NULL`,
        ))
        .limit(1);

      if (existing.length > 0) {
        duplicateCount++;
        continue;
      }

      // Yeni alert oluştur
      await db.insert(aiAlerts).values({
        targetRole: alert.targetRole,
        alertType: alert.alertType,
        category: alert.category,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        actionUrl: alert.actionUrl,
        actionLabel: alert.actionLabel,
        sourceTable: alert.sourceTable,
        sourceId: alert.sourceId,
        metadata: alert.metadata,
        expiresAt: alert.expiresAt,
      });
      newAlertCount++;
    } catch (err: any) {
      console.error("[AiAlert] Insert error:", err);
    }
  }

  // Süresi geçmiş alert'leri otomatik resolve et
  try {
    await db.execute(sql`
      UPDATE ai_alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE status = 'pending' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW()
    `);
  } catch (err: any) {
    console.error("[AiAlert] Expire cleanup error:", err);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[AiAlert] Tamamlandı: ${allAlerts.length} kontrol, ${newAlertCount} yeni, ${duplicateCount} duplicate (${elapsed}ms)`);

  return {
    totalChecked: allAlerts.length,
    newAlerts: newAlertCount,
    duplicatesSkipped: duplicateCount,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULER: günde 2 kez (08:00 ve 16:00 TR)
// ═══════════════════════════════════════════════════════════════════
export function startAiAlertScheduler(): void {
  const RUN_HOURS = [8, 16]; // 08:00 ve 16:00

  const calculateNextRun = (): Date => {
    const now = new Date();
    const next = new Date(now);

    // Bugünkü 08:00 veya 16:00 saatlerinden bir sonraki
    for (const hour of RUN_HOURS) {
      const candidate = new Date(now);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now) {
        return candidate;
      }
    }

    // İkisi de geçtiyse yarın 08:00
    next.setDate(next.getDate() + 1);
    next.setHours(RUN_HOURS[0], 0, 0, 0);
    return next;
  };

  const scheduleNextRun = () => {
    const next = calculateNextRun();
    const delayMs = next.getTime() - Date.now();
    console.log(
      `[AiAlert Scheduler] Sonraki çalışma: ${next.toLocaleString("tr-TR")} (${Math.round(delayMs / 1000 / 60)} dk sonra)`
    );

    setTimeout(async () => {
      try {
        await runAlertChecks();
      } catch (err) {
        console.error("[AiAlert Scheduler] Error:", err);
      }
      scheduleNextRun();
    }, delayMs);
  };

  scheduleNextRun();

  // Server start'ta ilk kez hemen çalıştır (background)
  setTimeout(() => {
    runAlertChecks().catch((err) =>
      console.error("[AiAlert Initial Run] Error:", err)
    );
  }, 60 * 1000); // 1 dk sonra (server full ready için)
}
